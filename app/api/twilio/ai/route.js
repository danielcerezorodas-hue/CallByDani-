// Recepcionista de IA (por turnos): Twilio convierte la voz del cliente en texto, Claude decide
// qué contestar y qué hacer, y Twilio lo dice en voz alta. Se repite en cada turno.
// Se activa por empresa con phone_lines.answer_mode = 'ai' o 'ai_then_agents'.
import twilio from "twilio";
import Anthropic from "@anthropic-ai/sdk";
import { readTwilioRequest, twiml, forbidden, db, origin, normalizePhone, ringAgents, leaveVoicemail, finishAiCall, findAgents, VOICE } from "../helpers";

const MODEL = "claude-sonnet-5-5";
// Twilio espera la respuesta como mucho 15 s: dejamos margen y no reintentamos
const CLAUDE_TIMEOUT_MS = 9000;
const MAX_TURNS = 30; // tope de seguridad por llamada
const MAX_SILENCES = 2;

const SPEECH_LANG = { en: "en-US", es: "es-US" };
const TEXT = {
  en: {
    greeting: business => `Hi, I'm the virtual assistant for ${business}. How can I help you today?`,
    stillThere: "Are you still there? How can I help you?",
    bye: "Thank you for calling. Goodbye.",
    error: "Sorry, I'm having trouble right now.",
    connecting: "Let me connect you with someone from our team.",
  },
  es: {
    greeting: business => `Hola, soy el asistente virtual de ${business}. ¿En qué le puedo ayudar?`,
    stillThere: "¿Sigue ahí? ¿En qué le puedo ayudar?",
    bye: "Gracias por llamar. Hasta luego.",
    error: "Disculpe, estoy teniendo problemas en este momento.",
    connecting: "Permítame comunicarle con alguien de nuestro equipo.",
  },
};

// Lo que Claude devuelve en cada turno (salida estructurada)
const TURN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "action", "lead"],
  properties: {
    reply: { type: "string", description: "Exactly what to say to the caller next. It is read aloud by a text-to-speech voice." },
    action: { type: "string", enum: ["continue", "transfer", "end"] },
    lead: {
      type: "object",
      additionalProperties: false,
      required: ["name", "phone", "reason", "summary", "urgent"],
      properties: {
        name: { type: "string", description: "Caller's name, or empty string if unknown." },
        phone: { type: "string", description: "Best callback number, or empty string if unknown." },
        reason: { type: "string", description: "Short reason for the call (a few words), or empty string." },
        summary: { type: "string", description: "Everything the business needs to know to follow up, written for the business owner. Empty string if nothing yet." },
        urgent: { type: "boolean" },
      },
    },
  },
};

function buildSystem({ business, lang, mode, callerNumber, notes, docs }) {
  const language = lang === "es" ? "Spanish" : "English";
  const knowledge = [
    notes ? `<business_instructions>\n${notes}\n</business_instructions>` : "",
    ...docs.map(d => `<document title="${d.title.replace(/"/g, "'")}">\n${d.content}\n</document>`),
  ].filter(Boolean).join("\n\n") || "(The business has not uploaded any information yet.)";

  const transferRule = mode === "ai_then_agents"
    ? `- If the caller asks for a person, or needs something you can't handle from the information below, set action to "transfer" and tell them in your reply that you're connecting them with the team.`
    : `- Never use action "transfer". Don't mention transferring the call, and never say that nobody is available or that you can't connect them. If they ask for a person, gladly say you'll take their details so the team can reach out to them soon, and take them.`;

  return `You are the virtual receptionist of ${business}, answering a live phone call. You are an AI assistant; if asked, say so honestly.

The call is in ${language}. Always reply in ${language}. You already greeted the caller with: "${TEXT[lang].greeting(business)}"

How to speak:
- Your reply is converted to speech. Use one to three short, natural sentences, like a friendly receptionist on the phone.
- Never use lists, markdown, emojis, URLs, or symbols that don't read well aloud.
- Ask one question at a time.

What to do:
- Answer questions using only the business information below. Never invent prices, hours, availability, or policies. If the answer isn't there, say you don't have that information and offer to take a message.
- You can't book appointments, take payments, or promise anything on behalf of the business. You can take the request so the team confirms it.
- Get the caller's name, the reason for the call, and the best phone number to reach them. Always ask for the phone number, then read it back digit by digit to confirm it. If they say to use the number they're calling from, that's ${callerNumber || "unknown"}.
- Keep "lead" updated on every turn with everything known so far, including earlier turns.
- Set "urgent" to true if the caller describes an emergency or something time-sensitive, or if the business instructions say a situation is urgent.
- If someone describes a life-threatening emergency, tell them to hang up and call 911.
${transferRule}
- Before ending, make sure you have their name and a confirmed phone number. When the caller is done, set action to "end" and make your reply a short goodbye that says the team will get in touch with them soon.
- Otherwise use action "continue".

Business information:
${knowledge}`;
}

// Pregunta a Claude qué decir. Devuelve { reply, action, lead, content } o null si falla.
async function askClaude({ system, messages }) {
  const client = new Anthropic({ timeout: CLAUDE_TIMEOUT_MS, maxRetries: 0 });
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      // Esfuerzo bajo: en una charla casi nunca piensa, y responde rápido
      output_config: { effort: "low", format: { type: "json_schema", schema: TURN_SCHEMA } },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      cache_control: { type: "ephemeral" },
      system,
      messages,
    });
    if (response.stop_reason === "refusal") {
      console.error("AI receptionist refusal:", response.stop_details?.category);
      return null;
    }
    const text = response.content.filter(b => b.type === "text").map(b => b.text).join("");
    let parsed;
    try { parsed = JSON.parse(text); } catch { console.error("AI receptionist: invalid JSON", text.slice(0, 200)); return null; }
    if (!parsed?.reply || !["continue", "transfer", "end"].includes(parsed.action)) return null;
    return { ...parsed, content: response.content };
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) console.error("AI receptionist: falta ANTHROPIC_API_KEY o es inválida");
    else if (err instanceof Anthropic.APIError) console.error("AI receptionist API error", err.status, err.message);
    else console.error("AI receptionist error", err?.message || err);
    return null;
  }
}

export async function POST(req) {
  const p = await readTwilioRequest(req);
  if (!p) return forbidden();

  const url = new URL(req.url);
  const lang = url.searchParams.get("lang") === "es" ? "es" : "en";
  const silences = Number(url.searchParams.get("silence") || 0);
  const t = TEXT[lang];
  const base = origin(req);
  const supa = db();
  const response = new twilio.twiml.VoiceResponse();

  const { data: call } = await supa
    .from("calls")
    .select("call_sid, to_number, from_number, business_name, ai_transcript")
    .eq("call_sid", p.CallSid)
    .maybeSingle();
  const lineNumber = call?.to_number || p.To;
  const { data: line } = await supa
    .from("phone_lines")
    .select("business_name, notes, answer_mode")
    .eq("phone_number", lineNumber)
    .maybeSingle();
  const business = line?.business_name || call?.business_name || (lang === "es" ? "nuestra oficina" : "our office");
  const mode = line?.answer_mode === "ai_then_agents" ? "ai_then_agents" : "ai";
  const transcript = Array.isArray(call?.ai_transcript) ? call.ai_transcript : [];
  const speech = String(p.SpeechResult || "").trim();

  // Escucha al cliente y vuelve aquí con lo que dijo (o vacío si no dijo nada)
  const listen = (sayText, nextSilences = 0) => {
    const gather = response.gather({
      input: "speech",
      language: SPEECH_LANG[lang],
      speechTimeout: "auto",
      actionOnEmptyResult: true,
      action: `${base}/api/twilio/ai?lang=${lang}&silence=${nextSilences}`,
      method: "POST",
    });
    gather.say(VOICE[lang], sayText);
    return twiml(response);
  };

  // Si la IA no puede seguir: pasa con un agente (si la empresa lo permite) o deja buzón
  const handOff = async sayText => {
    if (sayText) response.say(VOICE[lang], sayText);
    if (mode === "ai_then_agents") {
      const { data: c } = await supa.from("calls").select("caller_name, reason").eq("call_sid", p.CallSid).maybeSingle();
      await supa.from("calls").update({ status: "ringing" }).eq("call_sid", p.CallSid);
      await ringAgents(req, response, {
        to: lineNumber, from: call?.from_number || p.From, lang, business, callSid: p.CallSid, stage: 1,
        extra: { aiName: c?.caller_name, aiReason: c?.reason },
      });
    } else {
      await finishAiCall(supa, p.CallSid);
      leaveVoicemail(req, response, lang);
    }
    return twiml(response);
  };

  // Primer turno: saludo fijo (sin esperar a Claude)
  if (!transcript.length && !speech) return listen(t.greeting(business));

  // No dijo nada
  if (!speech) {
    if (silences + 1 >= MAX_SILENCES) {
      response.say(VOICE[lang], t.bye);
      response.hangup();
      await finishAiCall(supa, p.CallSid);
      return twiml(response);
    }
    return listen(t.stillThere, silences + 1);
  }

  if (transcript.length >= MAX_TURNS * 2) return handOff(t.connecting);

  const { data: docs } = await supa
    .from("company_docs")
    .select("title, content")
    .eq("phone_number", lineNumber)
    .order("created_at");
  // "IA y luego agentes" solo transfiere si hay algún agente conectado; si no, la IA toma el recado
  let promptMode = mode;
  if (mode === "ai_then_agents") {
    const available = (await findAgents(lineNumber, 1)).length > 0 || (await findAgents(lineNumber, 2)).length > 0;
    if (!available) promptMode = "ai_no_agents";
  }
  const system = buildSystem({ business, lang, mode: promptMode, callerNumber: call?.from_number || p.From, notes: line?.notes, docs: docs || [] });
  const messages = [...transcript, { role: "user", content: speech }];

  const turn = await askClaude({ system, messages });
  if (!turn) return handOff(mode === "ai_then_agents" ? `${t.error} ${t.connecting}` : t.error);

  // Guardamos la conversación (con el contenido de Claude tal cual) y lo que lleva tomado
  const lead = turn.lead || {};
  const update = { ai_transcript: [...messages, { role: "assistant", content: turn.content }] };
  if (lead.name) update.caller_name = lead.name.slice(0, 200);
  if (lead.phone) update.caller_phone = normalizePhone(lead.phone) || lead.phone.slice(0, 40);
  if (lead.reason) update.reason = lead.reason.slice(0, 300);
  if (lead.summary) update.note = lead.summary.slice(0, 4000);
  if (lead.urgent) update.urgent = true;
  await supa.from("calls").update(update).eq("call_sid", p.CallSid);

  if (turn.action === "transfer" && promptMode === "ai_then_agents") return handOff(turn.reply);

  if (turn.action === "end") {
    response.say(VOICE[lang], turn.reply);
    response.hangup();
    await finishAiCall(supa, p.CallSid);
    return twiml(response);
  }

  return listen(turn.reply);
}
