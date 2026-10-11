// El agente guarda la nota de la llamada y se manda el resumen por WhatsApp al dueño del negocio.
import { requireAgent, db, fail, isAdmin, normalizePhone } from "../helpers";
import { sendCallSummary } from "../../twilio/helpers";

export async function POST(req) {
  const { user, error } = await requireAgent(req);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const callSid = String(body.callSid || "");
  if (!callSid) return fail("Falta la llamada");

  const supa = db();
  const { data: call } = await supa
    .from("calls")
    .select("call_sid, to_number, from_number, business_name, agent_id, created_at")
    .eq("call_sid", callSid)
    .maybeSingle();
  if (!call) return fail("No encontré esa llamada", 404);
  if (call.agent_id && call.agent_id !== user.id && !isAdmin(user)) return fail("Esta llamada la atendió otro agente", 403);

  const note = {
    caller_name: String(body.callerName || "").trim() || null,
    caller_phone: normalizePhone(body.callerPhone) || call.from_number || null,
    reason: String(body.reason || "").trim() || null,
    note: String(body.note || "").trim() || null,
    urgent: !!body.urgent,
    note_saved_at: new Date().toISOString(),
  };
  // Si /answered no alcanzó a registrar al agente, lo registramos aquí
  if (!call.agent_id) Object.assign(note, { agent_id: user.id, agent_email: user.email });

  // Resumen por WhatsApp
  let whatsapp = { whatsapp_status: "skipped", whatsapp_error: null };
  if (body.sendWhatsapp !== false) whatsapp = await sendCallSummary(supa, call, note);

  // Si no se pidió WhatsApp, no tocamos su estado (al editar una nota no se pierde que ya se envió)
  const update = body.sendWhatsapp !== false ? { ...note, ...whatsapp } : note;
  const { error: e } = await supa.from("calls").update(update).eq("call_sid", callSid);
  if (e) return fail(e.message, 500);
  return Response.json({ ok: true, ...whatsapp });
}
