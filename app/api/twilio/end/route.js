// Despedida después del buzón de voz.
import twilio from "twilio";
import { readTwilioRequest, twiml, forbidden, VOICE, TEXT } from "../helpers";

export async function POST(req) {
  const p = await readTwilioRequest(req);
  if (!p) return forbidden();
  const lang = new URL(req.url).searchParams.get("lang") === "es" ? "es" : "en";
  const response = new twilio.twiml.VoiceResponse();
  response.say(VOICE[lang], TEXT[lang].thanks);
  response.hangup();
  return twiml(response);
}
