// Datos del dashboard del cliente: sus empresas (números) y las llamadas de esos números.
// El admin ve todas las empresas (útil para revisar cómo lo ve un cliente).
import { requireClient, fail } from "../helpers";

export async function GET(req) {
  const { supa, user, email, admin, lines, accountStatus, active, error } = await requireClient(req);
  if (error) return error;

  // Mientras la línea no está activa, el dashboard se ve bloqueado y sin llamadas
  let calls = [];
  if (active && lines.length) {
    const since = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString(); // últimos 90 días
    const { data, error: e } = await supa
      .from("calls")
      .select("id, created_at, to_number, business_name, from_number, caller_name, caller_phone, language, status, duration_seconds, reason, note, urgent, recording_url, voicemail_url")
      .in("to_number", lines.map(l => l.phone_number))
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500);
    if (e) return fail(e.message, 500);
    // Las URLs de Twilio no salen del servidor: solo decimos si hay grabación
    calls = (data || []).map(({ recording_url, voicemail_url, ...c }) => ({
      ...c,
      has_recording: !!recording_url,
      has_voicemail: !!voicemail_url,
    }));
  }

  return Response.json({ email, isAdmin: admin, plan: user.app_metadata?.plan || null, accountStatus, lines, calls });
}
