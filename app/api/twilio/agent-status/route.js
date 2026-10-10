// El panel del agente avisa si está conectado, desconectado o en llamada.
import { getAgent, db } from "../helpers";

export async function POST(req) {
  const agent = await getAgent(req);
  if (!agent) return Response.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const row = { agent_id: agent.id, email: agent.email, last_seen: new Date().toISOString() };
  if (typeof body.online === "boolean") row.online = body.online;
  if (typeof body.inCall === "boolean") row.in_call = body.inCall;
  if (body.online === false) row.in_call = false;

  const { error } = await db().from("agent_status").upsert(row, { onConflict: "agent_id" });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
