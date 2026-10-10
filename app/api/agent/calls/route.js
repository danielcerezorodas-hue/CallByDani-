// Registro de llamadas. El admin ve todas; cada agente ve las suyas.
import { requireAgent, db, fail, isAdmin } from "../helpers";

export async function GET(req) {
  const { user, error } = await requireAgent(req);
  if (error) return error;

  let query = db()
    .from("calls")
    .select("id, call_sid, from_number, to_number, business_name, language, agent_email, status, duration_seconds, caller_name, caller_phone, reason, note, urgent, note_saved_at, whatsapp_status, whatsapp_error, voicemail_url, recording_url, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (!isAdmin(user)) query = query.eq("agent_id", user.id);

  const { data, error: e } = await query;
  if (e) return fail(e.message, 500);
  return Response.json({ calls: data || [] });
}
