// Formulario de onboarding del cliente (se puede guardar a medias y enviar después).
// GET → { onboarding: { status, data, submitted_at }, documents, plan }
// PUT { data, submit } → guarda; con submit: true valida todo, lo marca "ready_for_setup" y avisa al admin.
// Después de enviarlo puede seguir editándolo (sigue validándose completo y no se vuelve a avisar).
import { requireClient, fail } from "../helpers";
import { SECTIONS, FIELD_KEYS, formErrors, looksLikeCardNumber, planLabel } from "../../../dashboard/onboardingFields";
import { notifyAdmin, escapeHtml } from "../../notify";

const MAX_FIELD = 5000;
const FIELDS = Object.fromEntries(SECTIONS.flatMap(s => s.fields).map(f => [f.key, f]));

// Plan contratado en Stripe (guardado en "clients" al crear la cuenta)
async function stripePlan(supa, user, email) {
  const { data } = await supa.from("clients").select("plan").eq("email", email).limit(1).maybeSingle();
  return planLabel(data?.plan || user.app_metadata?.plan || "");
}

async function loadDocuments(supa, userId) {
  const { data, error } = await supa
    .from("client_documents")
    .select("id, file_name, content_type, size_bytes, created_at")
    .eq("user_id", userId)
    .order("created_at");
  if (error) throw error;
  return data || [];
}

export async function GET(req) {
  const { supa, user, email, error } = await requireClient(req);
  if (error) return error;

  const [{ data: row, error: e1 }, { data: signed }] = await Promise.all([
    supa.from("client_onboarding").select("status, data, submitted_at, updated_at").eq("user_id", user.id).maybeSingle(),
    supa.from("client_agreements").select("full_name, title, company_name").eq("user_id", user.id).order("accepted_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (e1) return fail(e1.message, 500);

  let documents;
  try { documents = await loadDocuments(supa, user.id); } catch (e) { return fail(e.message, 500); }
  const plan = await stripePlan(supa, user, email);

  // La primera vez, rellenamos lo que ya sabemos (del acuerdo firmado y de Stripe)
  const prefill = {
    legal_name: signed?.company_name || "",
    signer_name: signed?.full_name || "",
    signer_title: signed?.title || "",
    signer_email: email,
    billing_email: email,
  };
  const data = { ...(row ? {} : prefill), ...(row?.data || {}), plan };

  return Response.json({
    onboarding: { status: row?.status || "in_progress", submitted_at: row?.submitted_at || null, data },
    documents,
    plan,
  });
}

// Solo guardamos los campos conocidos, recortados y con las opciones válidas
function sanitize(input) {
  const out = {};
  for (const key of FIELD_KEYS) {
    const field = FIELDS[key];
    const v = input?.[key];
    if (field.type === "readonly") continue;
    if (field.type === "multi") {
      out[key] = Array.isArray(v) ? field.options.filter(o => v.includes(o)) : [];
    } else if (field.type === "select") {
      out[key] = field.options.includes(v) ? v : "";
    } else {
      out[key] = typeof v === "string" ? v.slice(0, MAX_FIELD) : "";
    }
  }
  return out;
}

export async function PUT(req) {
  const { supa, user, email, error } = await requireClient(req);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const data = sanitize(body.data);

  // Nunca guardamos tarjetas
  const cardField = Object.entries(data).find(([, v]) => typeof v === "string" && looksLikeCardNumber(v));
  if (cardField) {
    return Response.json({ error: "Please don't enter card numbers here. Billing is handled securely by Stripe.", errors: { [cardField[0]]: "Remove the card number" } }, { status: 400 });
  }

  const { data: existing, error: e0 } = await supa.from("client_onboarding").select("status, submitted_at").eq("user_id", user.id).maybeSingle();
  if (e0) return fail(e0.message, 500);
  const wasSubmitted = existing?.status === "ready_for_setup";

  const plan = await stripePlan(supa, user, email);
  const submit = body.submit === true && !wasSubmitted; // primer envío
  if (submit || wasSubmitted) {
    const errors = formErrors({ ...data, plan });
    if (Object.keys(errors).length) return Response.json({ error: "Please complete the required fields", errors }, { status: 400 });
  }

  const now = new Date().toISOString();
  const row = {
    user_id: user.id,
    email,
    data: { ...data, plan },
    status: submit || wasSubmitted ? "ready_for_setup" : "in_progress",
    submitted_at: wasSubmitted ? existing.submitted_at : submit ? now : null,
    updated_at: now,
  };
  const { error: e1 } = await supa.from("client_onboarding").upsert(row, { onConflict: "user_id" });
  if (e1) return fail(e1.message, 500);

  let notified = null;
  if (submit) {
    const { error: e2 } = await supa.from("clients").update({ setup_status: "ready_for_setup" }).eq("email", email);
    if (e2) console.error("clients setup_status:", e2.message);
    const documents = await loadDocuments(supa, user.id).catch(() => []);
    notified = (await notifyAdmin(buildAdminEmail(email, row.data, documents))).status;
  }

  return Response.json({ ok: true, status: row.status, submitted_at: row.submitted_at, notified });
}

function buildAdminEmail(email, data, documents) {
  const sections = SECTIONS.filter(s => s.fields.length).map(s => ({
    title: s.title,
    rows: s.fields.map(f => [f.label, Array.isArray(data[f.key]) ? data[f.key].join(", ") : data[f.key] || "—"]),
  }));
  const docs = documents.length ? documents.map(d => d.file_name) : ["(none)"];
  const company = data.legal_name || email;

  const text = [
    `New client ready for setup: ${company} (${email})`,
    ...sections.flatMap(s => ["", s.title.toUpperCase(), ...s.rows.map(([k, v]) => `${k}: ${v}`)]),
    "", "DOCUMENTS", ...docs,
  ].join("\n");

  const html = `<div style="font-family:Arial,sans-serif;max-width:640px;color:#1e293b">
  <h2 style="margin:0 0 4px">🚀 New client ready for setup</h2>
  <div style="color:#64748b;margin-bottom:18px">${escapeHtml(company)} · ${escapeHtml(email)}</div>
  ${sections.map(s => `<h3 style="margin:18px 0 6px;font-size:15px">${escapeHtml(s.title)}</h3>
  <table style="width:100%;border-collapse:collapse;font-size:13px">${s.rows.map(([k, v]) => `<tr><td style="padding:4px 8px 4px 0;color:#64748b;width:200px;vertical-align:top">${escapeHtml(k)}</td><td style="padding:4px 0;white-space:pre-wrap">${escapeHtml(v)}</td></tr>`).join("")}</table>`).join("")}
  <h3 style="margin:18px 0 6px;font-size:15px">Documents</h3>
  <div style="font-size:13px">${docs.map(escapeHtml).join("<br>")}</div>
</div>`;

  return { subject: `🚀 Ready for setup: ${company}`, text, html };
}
