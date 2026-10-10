// Twilio llama aquí cuando entra una llamada a uno de tus números.
import twilio from "twilio";
import { readTwilioRequest, twiml, forbidden, db, origin, VOICE } from "../helpers";

export async function POST(req) {
  const p = await readTwilioRequest(req);
  if (!p) return forbidden();

  const supa = db();
  const { data: line } = await supa
    .from("phone_lines")
    .select("business_name")
    .eq("phone_number", p.To)
    .maybeSingle();
  const business = line?.business_name || "our office";

  await supa.from("calls").upsert(
    { call_sid: p.CallSid, from_number: p.From, to_number: p.To, business_name: business, status: "ringing" },
    { onConflict: "call_sid" }
  );

  const response = new twilio.twiml.VoiceResponse();
  const gather = response.gather({
    numDigits: 1,
    timeout: 5,
    action: `${origin(req)}/api/twilio/language`,
    method: "POST",
  });
  gather.say(VOICE.en, `Thank you for calling ${business}. For English, press 1.`);
  gather.say(VOICE.es, "Para español, oprima 2.");
  // Si no marca nada, seguimos en inglés
  response.redirect({ method: "POST" }, `${origin(req)}/api/twilio/language?default=en`);
  return twiml(response);
}

// Por si el número está configurado en Twilio con "HTTP GET"
export const GET = POST;
