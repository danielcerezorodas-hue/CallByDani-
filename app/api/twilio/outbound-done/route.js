// Twilio avisa aquí cuando termina una llamada saliente (contestó o no).
import twilio from "twilio";
import { readTwilioRequest, twiml, forbidden, db, VOICE } from "../helpers";

const NOT_CONNECTED = {
  busy: "El número está ocupado.",
  "no-answer": "No contestaron.",
  failed: "No se pudo completar la llamada.",
  canceled: null,
};

export async function POST(req) {
  const p = await readTwilioRequest(req);
  if (!p) return forbidden();

  const connected = p.DialCallStatus === "completed" || p.DialCallStatus === "answered";
  await db().from("calls")
    .update({
      status: connected ? "outbound_done" : "outbound_missed",
      duration_seconds: Number(p.DialCallDuration || 0),
    })
    .eq("call_sid", p.CallSid);

  // Si no conectó, se lo decimos al agente antes de colgar
  const response = new twilio.twiml.VoiceResponse();
  const msg = NOT_CONNECTED[p.DialCallStatus];
  if (!connected && msg) response.say(VOICE.es, msg);
  response.hangup();
  return twiml(response);
}
