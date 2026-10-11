// Empresas (cada número de Twilio es una empresa).
import { requireAgent, db, fail, normalizePhone } from "../helpers";

export async function GET(req) {
  const { error } = await requireAgent(req);
  if (error) return error;

  const supa = db();
  const [{ data: lines, error: e1 }, { data: docs, error: e2 }] = await Promise.all([
    supa.from("phone_lines").select("phone_number, business_name, owner_whatsapp, notes, client_email").order("business_name"),
    supa.from("company_docs").select("phone_number"),
  ]);
  if (e1 || e2) return fail((e1 || e2).message, 500);

  const counts = {};
  for (const d of docs || []) counts[d.phone_number] = (counts[d.phone_number] || 0) + 1;
  return Response.json({ lines: (lines || []).map(l => ({ ...l, doc_count: counts[l.phone_number] || 0 })) });
}

// Crear o editar una empresa (solo admin)
export async function POST(req) {
  const { error } = await requireAgent(req, { admin: true });
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const phone = normalizePhone(body.phone_number);
  const name = String(body.business_name || "").trim();
  if (!phone || phone.length < 11) return fail("Número de Twilio inválido");
  if (!name) return fail("Falta el nombre de la empresa");

  const row = {
    phone_number: phone,
    business_name: name,
    owner_whatsapp: body.owner_whatsapp ? normalizePhone(body.owner_whatsapp) : null,
    notes: String(body.notes || "").trim() || null,
    // Cliente que ve esta empresa en su dashboard (siempre en minúsculas)
    client_email: String(body.client_email || "").trim().toLowerCase() || null,
  };
  if (row.client_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.client_email)) return fail("Email del cliente inválido");
  const { error: e } = await db().from("phone_lines").upsert(row, { onConflict: "phone_number" });
  if (e) return fail(e.message, 500);
  return Response.json({ line: row });
}

// Borrar una empresa (solo admin) · /api/agent/lines?phone=+1...
export async function DELETE(req) {
  const { error } = await requireAgent(req, { admin: true });
  if (error) return error;

  const phone = normalizePhone(new URL(req.url).searchParams.get("phone"));
  if (!phone) return fail("Falta el número");
  const { error: e } = await db().from("phone_lines").delete().eq("phone_number", phone);
  if (e) return fail(e.message, 500);
  return Response.json({ ok: true });
}
