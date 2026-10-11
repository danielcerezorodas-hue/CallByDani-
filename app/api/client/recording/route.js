// Audio de una llamada (grabación o buzón de voz) para el dashboard del cliente.
// Twilio exige credenciales para descargarlo, así que lo pedimos desde el servidor
// y solo se lo damos al cliente dueño de esa línea (o al admin).
// GET /api/client/recording?call=<id>&type=call|voicemail
import { requireClient, fail } from "../helpers";

export async function GET(req) {
  const { supa, lines, error } = await requireClient(req);
  if (error) return error;

  const params = new URL(req.url).searchParams;
  const id = Number(params.get("call"));
  const field = params.get("type") === "voicemail" ? "voicemail_url" : "recording_url";
  if (!Number.isInteger(id) || id <= 0) return fail("Invalid call");

  const { data: call } = await supa.from("calls").select(`to_number, ${field}`).eq("id", id).maybeSingle();
  // Mismo "no encontrado" si no existe o no es suya, para no revelar qué llamadas hay
  if (!call || !lines.some(l => l.phone_number === call.to_number)) return fail("Recording not found", 404);
  const url = call[field];
  if (!url || !url.startsWith("https://api.twilio.com/")) return fail("Recording not found", 404);

  const sid = (process.env.TWILIO_ACCOUNT_SID || "").trim();
  const token = (process.env.TWILIO_AUTH_TOKEN || "").trim();
  const audio = await fetch(url, { headers: { Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64") } });
  if (!audio.ok) return fail(`Twilio returned ${audio.status}`, 502);

  return new Response(audio.body, {
    headers: {
      "Content-Type": audio.headers.get("content-type") || "audio/mpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
