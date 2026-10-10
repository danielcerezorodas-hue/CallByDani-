// Twilio avisa aquí cuando una grabación (llamada o buzón) está lista.
import { readTwilioRequest, forbidden, db } from "../helpers";

export async function POST(req) {
  const p = await readTwilioRequest(req);
  if (!p) return forbidden();

  const type = new URL(req.url).searchParams.get("type");
  const url = p.RecordingUrl ? `${p.RecordingUrl}.mp3` : null;
  const field = type === "voicemail" ? "voicemail_url" : "recording_url";
  const update = { [field]: url };
  if (type === "voicemail") update.status = "voicemail";

  await db().from("calls").update(update).eq("call_sid", p.CallSid);
  return new Response(null, { status: 204 });
}
