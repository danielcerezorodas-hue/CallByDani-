// Guarda un prospecto (lead) de la landing, pricing o contacto y le avisa al admin por correo.
// POST { email, first_name?, last_name?, phone?, company?, sector?, monthly_calls?, plan?, message?, source? }
// → { ok: true, notified } o { error }
import { db } from "../twilio/helpers";
import { notifyAdmin, escapeHtml } from "../notify";

const FIELDS = ["email", "first_name", "last_name", "phone", "company", "sector", "monthly_calls", "plan", "message", "source"];
const LABELS = {
  first_name: "First name", last_name: "Last name", email: "Email", phone: "Phone", company: "Company",
  sector: "Business type", monthly_calls: "Monthly calls", plan: "Plan", message: "Message", source: "Form",
};
const MAX_FIELD = 2000;

function fail(message, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return fail("Invalid request"); }

  const lead = {};
  for (const key of FIELDS) {
    const value = String(body?.[key] ?? "").trim().slice(0, MAX_FIELD);
    if (value) lead[key] = value;
  }
  lead.email = (lead.email || "").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) return fail("Please enter a valid email.");

  let supa;
  try { supa = db(); } catch (e) { return fail(e.message, 500); }
  const { error } = await supa.from("leads").insert([lead]);
  if (error) {
    console.error("Supabase lead error:", error);
    return fail("Could not save lead", 500);
  }

  // Si el correo falla, el lead ya quedó guardado: no rompemos el formulario
  const notified = (await notifyAdmin(buildEmail(lead))).status;
  return Response.json({ ok: true, notified });
}

function buildEmail(lead) {
  const name = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || lead.email;
  const rows = Object.keys(LABELS).filter(k => lead[k]).map(k => [LABELS[k], lead[k]]);
  const text = [`New lead: ${name}`, "", ...rows.map(([k, v]) => `${k}: ${v}`)].join("\n");
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;color:#1e293b">
  <h2 style="margin:0 0 4px">📞 New lead</h2>
  <div style="color:#64748b;margin-bottom:18px">${escapeHtml(name)}${lead.company ? " · " + escapeHtml(lead.company) : ""}</div>
  <table style="border-collapse:collapse;width:100%">${rows.map(([k, v]) =>
    `<tr><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;color:#64748b;white-space:nowrap;vertical-align:top">${escapeHtml(k)}</td><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0">${escapeHtml(v).replace(/\n/g, "<br>")}</td></tr>`
  ).join("")}</table>
  <p style="color:#64748b;font-size:13px;margin-top:18px">Call them within 24 hours.</p>
</div>`;
  return { subject: `New lead: ${name}${lead.sector ? " (" + lead.sector + ")" : ""}`, text, html };
}
