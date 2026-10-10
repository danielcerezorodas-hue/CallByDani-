// Quién soy y cuántos agentes hay conectados.
import { requireAgent, db, isAdmin } from "../helpers";
import { ONLINE_WINDOW_MS } from "../../twilio/helpers";

export async function GET(req) {
  const { user, error } = await requireAgent(req);
  if (error) return error;

  const since = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();
  const { count } = await db()
    .from("agent_status")
    .select("agent_id", { count: "exact", head: true })
    .eq("online", true)
    .gte("last_seen", since);

  return Response.json({ id: user.id, email: user.email, isAdmin: isAdmin(user), onlineCount: count || 0 });
}
