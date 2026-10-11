// Twilio avisa aquí cuando termina una llamada entrante (statusCallback del número).
// Si nadie contestó y el cliente colgó, la llamada seguía como "ringing": la marcamos perdida.
// Configura en Twilio: número → Voice → "Call status changes" =
//   https://www.callbydani.com/api/twilio/call-status (POST)
import { readTwilioRequest, forbidden, db, finishAiCall } from "../helpers";

const FINISHED = ["completed", "busy", "no-answer", "failed", "canceled"];

export async function POST(req) {
  const p = await readTwilioRequest(req);
  if (!p) return forbidden();

  if (FINISHED.includes(p.CallStatus)) {
    const supa = db();
    // Solo tocamos las que se quedaron sonando; contestadas y buzón ya tienen su estado
    await supa.from("calls").update({ status: "missed" }).eq("call_sid", p.CallSid).eq("status", "ringing");
    // Si colgaron en plena conversación antes de que llegara /dial-done
    await supa.from("calls").update({ status: "completed" }).eq("call_sid", p.CallSid).eq("status", "answered");
    // Llamada que atendió la IA: si colgaron sin despedirse, la cerramos (nota + WhatsApp una vez)
    await finishAiCall(supa, p.CallSid);
    // Duración de las llamadas de la IA (cuentan para los minutos del plan)
    await supa.from("calls").update({ duration_seconds: Number(p.CallDuration || 0) }).eq("call_sid", p.CallSid).eq("status", "ai_handled");
  }
  return new Response(null, { status: 204 });
}
