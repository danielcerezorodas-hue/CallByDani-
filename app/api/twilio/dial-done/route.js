// Twilio llama aquí cuando termina el intento de conectar con un agente.
import twilio from "twilio";
import { readTwilioRequest, twiml, forbidden, db, ringAgents, leaveVoicemail } from "../helpers";

export async function POST(req) {
  const p = await readTwilioRequest(req);
  if (!p) return forbidden();

  const url = new URL(req.url);
  const lang = url.searchParams.get("lang") === "es" ? "es" : "en";
  const stage = Number(url.searchParams.get("stage") || 1);
  const supa = db();
  const response = new twilio.twiml.VoiceResponse();

  // Un agente contestó y la llamada ya terminó
  if (p.DialCallStatus === "completed" || p.DialCallStatus === "answered") {
    await supa.from("calls")
      .update({ status: "completed", duration_seconds: Number(p.DialCallDuration || 0) })
      .eq("call_sid", p.CallSid);
    response.hangup();
    return twiml(response);
  }

  // Nadie de los asignados contestó: probamos con los agentes de varias líneas
  if (stage === 1) {
    const { data: call } = await supa.from("calls").select("business_name").eq("call_sid", p.CallSid).maybeSingle();
    await ringAgents(req, response, {
      to: p.To, from: p.From, lang, business: call?.business_name, callSid: p.CallSid, stage: 2,
    });
    return twiml(response);
  }

  // Nadie contestó: buzón de voz
  await supa.from("calls").update({ status: "voicemail" }).eq("call_sid", p.CallSid);
  leaveVoicemail(req, response, lang);
  return twiml(response);
}
