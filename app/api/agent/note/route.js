// El agente guarda la nota de la llamada y se manda el resumen por WhatsApp al dueño del negocio.
import { requireAgent, db, fail, isAdmin, normalizePhone } from "../helpers";
import { sendWhatsapp } from "../../twilio/helpers";

function buildSummary({ business, callerName, callerPhone, reason, note, urgent, when }) {
  const lines = [
    `${urgent ? "🚨 URGENTE · " : ""}📞 Nueva llamada para ${business}`,
    `🕒 ${when}`,
    `👤 ${callerName || "Sin nombre"}`,
    `📱 ${callerPhone || "Sin número"}`,
    `📝 Motivo: ${reason || "-"}`,
  ];
  if (note) lines.push("", note);
  lines.push("", "— CallByDani");
  return lines.join("\n");
}

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
  if (body.sendWhatsapp !== false) {
    const { data: line } = await supa
      .from("phone_lines")
      .select("owner_whatsapp, business_name")
      .eq("phone_number", call.to_number)
      .maybeSingle();
    if (!line?.owner_whatsapp) {
      whatsapp = { whatsapp_status: "skipped", whatsapp_error: "La empresa no tiene WhatsApp configurado" };
    } else {
      const business = line.business_name || call.business_name || "tu negocio";
      const when = new Date(call.created_at).toLocaleString("es-US", {
        timeZone: process.env.BUSINESS_TIMEZONE || "America/New_York",
        dateStyle: "medium",
        timeStyle: "short",
      });
      const fields = { business, when, callerName: note.caller_name, callerPhone: note.caller_phone, reason: note.reason, note: note.note, urgent: note.urgent };
      try {
        await sendWhatsapp(line.owner_whatsapp, {
          body: buildSummary(fields),
          // Variables de la plantilla: {{1}} negocio, {{2}} fecha, {{3}} nombre, {{4}} teléfono, {{5}} motivo, {{6}} nota
          variables: {
            1: (note.urgent ? "URGENTE · " : "") + business,
            2: when,
            3: note.caller_name || "Sin nombre",
            4: note.caller_phone || "Sin número",
            5: note.reason || "-",
            6: note.note || "-",
          },
        });
        whatsapp = { whatsapp_status: "sent", whatsapp_error: null };
      } catch (err) {
        whatsapp = { whatsapp_status: "failed", whatsapp_error: err?.message || "Error al mandar WhatsApp" };
      }
    }
  }

  const { error: e } = await supa.from("calls").update({ ...note, ...whatsapp }).eq("call_sid", callSid);
  if (e) return fail(e.message, 500);
  return Response.json({ ok: true, ...whatsapp });
}
