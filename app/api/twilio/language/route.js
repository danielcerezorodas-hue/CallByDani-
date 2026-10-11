// Después de elegir idioma: según la empresa, contesta la IA o suenan los agentes asignados.
import twilio from "twilio";
import { readTwilioRequest, twiml, forbidden, db, origin, ringAgents } from "../helpers";

export async function POST(req) {
  const p = await readTwilioRequest(req);
  if (!p) return forbidden();

  const lang = p.Digits === "2" ? "es" : "en";
  const supa = db();
  await supa.from("calls").update({ language: lang }).eq("call_sid", p.CallSid);
  const [{ data: call }, { data: line }] = await Promise.all([
    supa.from("calls").select("business_name").eq("call_sid", p.CallSid).maybeSingle(),
    supa.from("phone_lines").select("answer_mode").eq("phone_number", p.To).maybeSingle(),
  ]);

  const response = new twilio.twiml.VoiceResponse();

  // Empresa con recepcionista de IA: ya no suena en los agentes ("ai" = la está atendiendo la IA)
  if (line?.answer_mode === "ai" || line?.answer_mode === "ai_then_agents") {
    await supa.from("calls").update({ status: "ai" }).eq("call_sid", p.CallSid);
    response.redirect({ method: "POST" }, `${origin(req)}/api/twilio/ai?lang=${lang}`);
    return twiml(response);
  }

  await ringAgents(req, response, {
    to: p.To, from: p.From, lang, business: call?.business_name, callSid: p.CallSid, stage: 1,
  });
  return twiml(response);
}
