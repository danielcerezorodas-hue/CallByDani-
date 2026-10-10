// Administración de agentes (solo admin): quién puede entrar y qué líneas atiende.
import { requireAgent, db, fail } from "../helpers";
import { ONLINE_WINDOW_MS } from "../../twilio/helpers";

export async function GET(req) {
  const { error } = await requireAgent(req, { admin: true });
  if (error) return error;

  const supa = db();
  const [{ data: allowed, error: e1 }, { data: status, error: e2 }, { data: assignments, error: e3 }] = await Promise.all([
    supa.from("agents").select("email, created_at").order("email"),
    supa.from("agent_status").select("agent_id, email, online, in_call, is_pool, last_seen"),
    supa.from("agent_assignments").select("agent_id, phone_number"),
  ]);
  if (e1 || e2 || e3) return fail((e1 || e2 || e3).message, 500);

  const since = Date.now() - ONLINE_WINDOW_MS;
  const byEmail = {};
  for (const s of status || []) if (s.email) byEmail[s.email.toLowerCase()] = s;

  const agents = (allowed || []).map(a => {
    const s = byEmail[a.email];
    return {
      email: a.email,
      agent_id: s?.agent_id || null, // null = todavía no ha entrado al panel
      online: !!s && s.online && new Date(s.last_seen).getTime() >= since,
      in_call: !!s?.in_call,
      is_pool: s ? s.is_pool : true,
      lines: s ? (assignments || []).filter(x => x.agent_id === s.agent_id).map(x => x.phone_number) : [],
    };
  });
  return Response.json({ agents });
}

// Autorizar un correo · { email }
// o actualizar un agente que ya entró · { agent_id, is_pool, lines: ["+1..."] }
export async function POST(req) {
  const { error } = await requireAgent(req, { admin: true });
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const supa = db();

  if (body.agent_id) {
    if (typeof body.is_pool === "boolean") {
      const { error: e } = await supa.from("agent_status").update({ is_pool: body.is_pool }).eq("agent_id", body.agent_id);
      if (e) return fail(e.message, 500);
    }
    if (Array.isArray(body.lines)) {
      const { error: e1 } = await supa.from("agent_assignments").delete().eq("agent_id", body.agent_id);
      if (e1) return fail(e1.message, 500);
      if (body.lines.length) {
        const rows = body.lines.map(phone_number => ({ agent_id: body.agent_id, phone_number }));
        const { error: e2 } = await supa.from("agent_assignments").insert(rows);
        if (e2) return fail(e2.message, 500);
      }
    }
    return Response.json({ ok: true });
  }

  const email = String(body.email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Correo inválido");
  const { error: e } = await supa.from("agents").upsert({ email }, { onConflict: "email" });
  if (e) return fail(e.message, 500);
  return Response.json({ ok: true });
}

// Quitar acceso · /api/agent/agents?email=...
export async function DELETE(req) {
  const { error } = await requireAgent(req, { admin: true });
  if (error) return error;

  const email = String(new URL(req.url).searchParams.get("email") || "").trim().toLowerCase();
  if (!email) return fail("Falta el correo");
  const supa = db();
  const { error: e } = await supa.from("agents").delete().eq("email", email);
  if (e) return fail(e.message, 500);
  // Lo desconectamos para que no le vuelvan a sonar llamadas
  await supa.from("agent_status").update({ online: false, in_call: false }).ilike("email", email);
  return Response.json({ ok: true });
}
