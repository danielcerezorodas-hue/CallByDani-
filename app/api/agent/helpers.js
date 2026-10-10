// Funciones compartidas por las rutas del panel de agentes (solo servidor).
import { getAgent, isAdmin } from "../twilio/helpers";

export { db, isAdmin, normalizePhone } from "../twilio/helpers";

export function fail(message, status = 400) {
  return Response.json({ error: message }, { status });
}

// Devuelve { user } si es agente autorizado (y admin si se pide), o { error: Response }
export async function requireAgent(req, { admin = false } = {}) {
  const user = await getAgent(req);
  if (!user) return { error: fail("No autorizado", 401) };
  if (admin && !isAdmin(user)) return { error: fail("Solo el admin puede hacer esto", 403) };
  return { user };
}
