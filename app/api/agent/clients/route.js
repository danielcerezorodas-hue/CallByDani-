// Clientes (solo admin): onboarding, documentos, acuerdo firmado y estado de la línea.
// GET            → { clients: [...] }
// GET ?doc=123   → { url } para ver un documento (enlace firmado de 5 minutos)
// POST { email, account_status: "active" | "pending_setup" } → activa o vuelve a bloquear la línea
import { requireAgent, db, fail } from "../helpers";
import { sendEmail, escapeHtml } from "../../notify";

const BUCKET = "client-documents";
const STATUSES = ["pending_setup", "active"];

export async function GET(req) {
  const { error } = await requireAgent(req, { admin: true });
  if (error) return error;
  const supa = db();

  const docId = Number(new URL(req.url).searchParams.get("doc"));
  if (docId) {
    const { data: doc } = await supa.from("client_documents").select("file_path").eq("id", docId).maybeSingle();
    if (!doc) return fail("Documento no encontrado", 404);
    const { data, error: e } = await supa.storage.from(BUCKET).createSignedUrl(doc.file_path, 300);
    if (e) return fail(e.message, 500);
    return Response.json({ url: data.signedUrl });
  }

  const [clients, onboarding, agreements, documents, lines] = await Promise.all([
    // Solo clientes que pagaron (los leads no tienen plan)
    supa.from("clients").select("email, plan, status, account_status, setup_status, created_at").not("plan", "is", null).order("created_at", { ascending: false }),
    supa.from("client_onboarding").select("user_id, email, status, data, submitted_at, updated_at"),
    supa.from("client_agreements").select("id, user_id, email, full_name, title, company_name, agreement_version, agreement_text, accepted_at, ip_address, user_agent").order("accepted_at", { ascending: false }),
    supa.from("client_documents").select("id, user_id, file_name, content_type, size_bytes, created_at").order("created_at"),
    supa.from("phone_lines").select("phone_number, business_name, client_email"),
  ]);
  const failed = [clients, onboarding, agreements, documents, lines].find(r => r.error);
  if (failed) return fail(failed.error.message, 500);

  // Los documentos se guardan por usuario: lo traducimos a correo
  const emailByUser = {};
  for (const r of [...onboarding.data, ...agreements.data]) emailByUser[r.user_id] = r.email.toLowerCase();

  const list = clients.data.map(c => {
    const email = c.email.toLowerCase();
    return {
      ...c,
      email,
      account_status: c.account_status || "pending_setup",
      onboarding: onboarding.data.find(o => o.email.toLowerCase() === email) || null,
      agreements: agreements.data.filter(a => a.email.toLowerCase() === email),
      documents: documents.data.filter(d => emailByUser[d.user_id] === email),
      lines: lines.data.filter(l => (l.client_email || "").toLowerCase() === email),
    };
  });
  return Response.json({ clients: list });
}

export async function POST(req) {
  const { error } = await requireAgent(req, { admin: true });
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const status = body.account_status;
  if (!email) return fail("Falta el correo del cliente");
  if (!STATUSES.includes(status)) return fail("Estado inválido");

  const { data, error: e } = await db().from("clients").update({ account_status: status }).eq("email", email).select("email");
  if (e) return fail(e.message, 500);
  if (!data?.length) return fail("Cliente no encontrado", 404);

  // Avisamos al cliente que su línea ya está activa
  let notified = null;
  if (status === "active") {
    const url = `${(process.env.NEXT_PUBLIC_URL || "https://www.callbydani.com").replace(/\/$/, "")}/dashboard`;
    notified = (await sendEmail({
      to: email,
      subject: "Your CallByDani line is active 🎉",
      text: `Good news! Your CallByDani line is now active. From now on, every call we handle for you will show up in your dashboard: ${url}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;color:#1e293b">
  <h2>Your line is active 🎉</h2>
  <p>Good news! Your CallByDani line is now active. From now on, every call we handle for you will show up in your dashboard.</p>
  <p><a href="${escapeHtml(url)}" style="display:inline-block;background:#0ea5e9;color:#fff;text-decoration:none;font-weight:bold;padding:10px 18px;border-radius:8px">Open my dashboard</a></p>
</div>`,
    })).status;
  }
  return Response.json({ ok: true, account_status: status, notified });
}
