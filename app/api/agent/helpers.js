// Funciones compartidas por las rutas del panel de agentes (solo servidor).
import { authAgent, isAdmin } from "../twilio/helpers";

export { db, isAdmin, normalizePhone } from "../twilio/helpers";

export function fail(message, status = 400) {
  return Response.json({ error: message }, { status });
}

// Devuelve { user } si es agente autorizado (y admin si se pide), o { error: Response }
// Mientras tenga la contraseña temporal solo puede usar /me y /password (allowPendingReset).
export async function requireAgent(req, { admin = false, allowPendingReset = false } = {}) {
  const { user, error } = await authAgent(req);
  if (error) return { error };
  if (!allowPendingReset && user.app_metadata?.must_reset_password) {
    return { error: fail("Primero cambia tu contraseña temporal", 403) };
  }
  if (admin && !isAdmin(user)) return { error: fail("Solo el admin puede hacer esto", 403) };
  return { user };
}
