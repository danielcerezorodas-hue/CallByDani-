// Funciones compartidas por las rutas del dashboard del cliente (solo servidor).
import { db, isAdmin } from "../twilio/helpers";
import { currentAgreement, latestAcceptance } from "./agreement-file";

export function fail(message, status = 400) {
  return Response.json({ error: message }, { status });
}

// Cliente con sesión → { supa, user, email, admin, lines, accountStatus, active } o { error: Response }.
// lines = empresas (números) que puede ver: las suyas, o todas si es el admin.
// accountStatus = clients.account_status ("pending_setup" | "active"); active = línea activa (el admin siempre).
// Si no ha aceptado la versión vigente del acuerdo, responde 403 { code: "agreement_required" }
// (salvo requireAgreement: false, que usa la propia ruta del acuerdo). El admin no lo necesita.
export async function requireClient(req, { requireAgreement = true } = {}) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return { error: fail("Not signed in", 401) };

  let supa;
  try { supa = db(); } catch (e) { return { error: fail(e.message, 500) }; }

  const { data: auth, error: authError } = await supa.auth.getUser(token);
  if (authError || !auth?.user?.email) return { error: fail("Not signed in", 401) };
  const user = auth.user;
  const email = user.email.toLowerCase();
  const admin = isAdmin(user);

  if (requireAgreement && !admin) {
    try {
      const [{ version }, accepted] = await Promise.all([currentAgreement(), latestAcceptance(supa, user.id)]);
      if (accepted?.agreement_version !== version) {
        return { error: Response.json({ error: "Please accept the Platform Services Agreement first", code: "agreement_required" }, { status: 403 }) };
      }
    } catch (e) {
      return { error: fail(e.message, 500) };
    }
  }

  let query = supa.from("phone_lines").select("phone_number, business_name").order("business_name");
  if (!admin) query = query.eq("client_email", email); // se guarda siempre en minúsculas
  const [{ data: lines, error }, { data: client, error: e2 }] = await Promise.all([
    query,
    supa.from("clients").select("account_status").eq("email", email).limit(1).maybeSingle(),
  ]);
  if (error || e2) return { error: fail((error || e2).message, 500) };

  const accountStatus = admin ? "active" : client?.account_status || "pending_setup";
  return { supa, user, email, admin, lines: lines || [], accountStatus, active: accountStatus === "active" };
}
