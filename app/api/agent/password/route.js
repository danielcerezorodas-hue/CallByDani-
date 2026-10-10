// El agente cambia su contraseña (obligatorio la primera vez que entra).
import { requireAgent, db, fail } from "../helpers";

export async function POST(req) {
  const { user, error } = await requireAgent(req, { allowPendingReset: true });
  if (error) return error;

  const { password } = await req.json().catch(() => ({}));
  if (typeof password !== "string" || password.length < 8) {
    return fail("La contraseña debe tener al menos 8 caracteres");
  }

  // El aviso de "cambiar contraseña" vive en app_metadata, que solo el servidor puede tocar
  const { error: e } = await db().auth.admin.updateUserById(user.id, {
    password,
    app_metadata: { must_reset_password: false },
  });
  if (e) return fail(e.message, e.status === 422 ? 400 : 500);
  return Response.json({ ok: true });
}
