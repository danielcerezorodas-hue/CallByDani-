// Después de elegir idioma: suena a los agentes asignados a esa línea.
import twilio from "twilio";
import { readTwilioRequest, twiml, forbidden, db, ringAgents } from "../helpers";

export async function POST(req) {
  const p = await readTwilioRequest(req);
  if (!p) return forbidden();

  const lang = p.Digits === "2" ? "es" : "en";
  const supa = db();
  await supa.from("calls").update({ language: lang }).eq("call_sid", p.CallSid);
  const { data: call } = await supa.from("calls").select("business_name").eq("call_sid", p.CallSid).maybeSingle();

  const response = new twilio.twiml.VoiceResponse();
  await ringAgents(req, response, {
    to: p.To, from: p.From, lang, business: call?.business_name, callSid: p.CallSid, stage: 1,
  });
  return twiml(response);
}
