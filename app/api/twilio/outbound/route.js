// Twilio llama aquí (por la TwiML App) cuando un agente marca un número desde el panel.
// Configura en Twilio: TwiML App → Voice Request URL = https://<tu-dominio>/api/twilio/outbound (POST)
import twilio from "twilio";
import { readTwilioRequest, twiml, forbidden, db, origin, fromIdentity, normalizePhone, isAdmin, VOICE } from "../helpers";

// Países del Caribe que también usan +1 pero se cobran como internacional (fraude típico)
const FOREIGN_NANP = new Set([
  "242", "246", "264", "268", "284", "345", "441", "473", "649", "658", "664",
  "721", "758", "767", "784", "809", "829", "849", "868", "869", "876",
]);

// Solo números de EE. UU./Canadá (+1), sin líneas de pago (900/976) ni servicios N11.
// Evita que alguien use el panel para llamar a destinos caros.
function allowedDestination(phone) {
  const m = /^\+1([2-9]\d{2})([2-9]\d{2})(\d{4})$/.exec(phone);
  if (!m) return false;
  const [, area, exchange] = m;
  if (FOREIGN_NANP.has(area)) return false;
  if (["900", "976"].includes(area) || exchange === "976") return false;
  if (/^[2-9]11$/.test(area) || /^[2-9]11$/.test(exchange)) return false;
  return true;
}

export async function POST(req) {
  const p = await readTwilioRequest(req);
  if (!p) return forbidden();

  const response = new twilio.twiml.VoiceResponse();
  const refuse = msg => { response.say(VOICE.es, msg); response.hangup(); return twiml(response); };

  // Quién marca: el teléfono del navegador se identifica como "client:agent_<id>"
  if (!String(p.From || "").startsWith("client:")) return refuse("Llamada no permitida.");
  const agentId = fromIdentity(p.From.slice("client:".length));

  const supa = db();
  // Sigue siendo agente autorizado (pudieron quitarle el acceso después de darle el token)
  const { data: status } = await supa.from("agent_status").select("email").eq("agent_id", agentId).maybeSingle();
  const email = status?.email?.toLowerCase();
  if (!email) return refuse("No encontré tu cuenta de agente.");
  if (!isAdmin({ email })) {
    const { data: allowed } = await supa.from("agents").select("email").eq("email", email).maybeSingle();
    if (!allowed) return refuse("Tu cuenta ya no tiene acceso.");
  }

  const to = normalizePhone(p.To);
  if (!allowedDestination(to)) return refuse("Solo se puede llamar a números de Estados Unidos y Canadá.");

  // Se llama desde el número de una de las empresas (tiene que ser una línea registrada)
  const { data: line } = await supa
    .from("phone_lines")
    .select("phone_number, business_name")
    .eq("phone_number", normalizePhone(p.Line))
    .maybeSingle();
  if (!line) return refuse("Elige desde qué empresa quieres llamar.");

  // Igual que las entrantes: from_number = cliente, to_number = línea de la empresa
  await supa.from("calls").upsert({
    call_sid: p.CallSid,
    from_number: to,
    to_number: line.phone_number,
    business_name: line.business_name,
    agent_id: agentId,
    agent_email: email,
    status: "outbound",
  }, { onConflict: "call_sid" });

  const base = origin(req);
  const dial = response.dial({
    callerId: line.phone_number,
    answerOnBridge: true,
    timeout: 30,
    record: "record-from-answer-dual",
    recordingStatusCallback: `${base}/api/twilio/recording?type=call`,
    recordingStatusCallbackEvent: "completed",
    action: `${base}/api/twilio/outbound-done`,
  });
  dial.number(to);
  return twiml(response);
}
