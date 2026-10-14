// Acuerdo de servicios (Platform Services Agreement) del cliente.
// GET  → { version, text, required, isUpdate, signed: [copias firmadas] }
// POST { version, full_name, title, company_name, agree: true } → guarda la aceptación
import { requireClient, fail } from "../helpers";
import { currentAgreement } from "../agreement-file";

const MAX_LEN = 200;

export async function GET(req) {
  const { supa, user, admin, error } = await requireClient(req, { requireAgreement: false });
  if (error) return error;

  let agreement;
  try { agreement = await currentAgreement(); } catch (e) { return fail(e.message, 500); }

  const { data: signed, error: e } = await supa
    .from("client_agreements")
    .select("id, full_name, title, company_name, email, agreement_version, agreement_text, accepted_at")
    .eq("user_id", user.id)
    .order("accepted_at", { ascending: false });
  if (e) return fail(e.message, 500);

  const accepted = signed?.[0]?.agreement_version === agreement.version;
  return Response.json({
    version: agreement.version,
    text: agreement.text,
    required: !admin && !accepted,
    isUpdate: !accepted && (signed?.length || 0) > 0, // ya había firmado una versión anterior
    signed: signed || [],
  });
}

export async function POST(req) {
  const { supa, user, email, error } = await requireClient(req, { requireAgreement: false });
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const clean = v => String(v || "").trim().slice(0, MAX_LEN);
  const full_name = clean(body.full_name);
  const title = clean(body.title);
  const company_name = clean(body.company_name);
  if (body.agree !== true) return fail("Please check the box to accept the agreement");
  if (!full_name || !title || !company_name) return fail("Please fill in your full legal name, title and company name");

  let agreement;
  try { agreement = await currentAgreement(); } catch (e) { return fail(e.message, 500); }
  // Si el acuerdo cambió mientras lo leía, que lea la versión nueva
  if (String(body.version || "") !== agreement.version) {
    return fail("The agreement was just updated. Please review the new version.", 409);
  }

  const { data, error: e } = await supa
    .from("client_agreements")
    .insert({
      user_id: user.id,
      email,
      full_name,
      title,
      company_name,
      agreement_version: agreement.version,
      agreement_text: agreement.text,
      ip_address: (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("x-real-ip") || null,
      user_agent: (req.headers.get("user-agent") || "").slice(0, 500) || null,
    })
    .select("id, full_name, title, company_name, email, agreement_version, agreement_text, accepted_at")
    .single();
  if (e) return fail(e.message, 500);
  return Response.json({ ok: true, signed: data });
}
