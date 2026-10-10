// El panel avisa qué agente contestó la llamada.
import { getAgent, db } from "../helpers";

export async function POST(req) {
  const agent = await getAgent(req);
  if (!agent) return Response.json({ error: "Not signed in" }, { status: 401 });

  const { parentCallSid } = await req.json().catch(() => ({}));
  const supa = db();
  if (parentCallSid) {
    await supa.from("calls")
      .update({ agent_id: agent.id, agent_email: agent.email, status: "answered" })
      .eq("call_sid", parentCallSid);
  }
  await supa.from("agent_status")
    .upsert({ agent_id: agent.id, email: agent.email, in_call: true, last_seen: new Date().toISOString() }, { onConflict: "agent_id" });
  return Response.json({ ok: true });
}
