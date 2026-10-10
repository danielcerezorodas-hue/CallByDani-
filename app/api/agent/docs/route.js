// Documentos de una empresa (políticas, precios, FAQ...) que usa la IA.
import { requireAgent, db, fail, normalizePhone } from "../helpers";

const MAX_DOC_CHARS = 200_000;

// /api/agent/docs?phone=+1...
export async function GET(req) {
  const { error } = await requireAgent(req);
  if (error) return error;

  const phone = normalizePhone(new URL(req.url).searchParams.get("phone"));
  if (!phone) return fail("Falta el número");
  const { data, error: e } = await db()
    .from("company_docs")
    .select("id, title, content, created_at")
    .eq("phone_number", phone)
    .order("created_at");
  if (e) return fail(e.message, 500);
  return Response.json({ docs: data || [] });
}

// Agregar documento (solo admin)
export async function POST(req) {
  const { error } = await requireAgent(req, { admin: true });
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const phone = normalizePhone(body.phone_number);
  const title = String(body.title || "").trim() || "Documento";
  const content = String(body.content || "").trim();
  if (!phone) return fail("Falta la empresa");
  if (!content) return fail("El documento está vacío");
  if (content.length > MAX_DOC_CHARS) return fail(`El documento es muy largo (máximo ${MAX_DOC_CHARS.toLocaleString()} caracteres). Divídelo en partes.`);

  const { data, error: e } = await db()
    .from("company_docs")
    .insert({ phone_number: phone, title, content })
    .select("id, title, content, created_at")
    .single();
  if (e) return fail(e.message, 500);
  return Response.json({ doc: data });
}

// Borrar documento (solo admin) · /api/agent/docs?id=123
export async function DELETE(req) {
  const { error } = await requireAgent(req, { admin: true });
  if (error) return error;

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return fail("Falta el id");
  const { error: e } = await db().from("company_docs").delete().eq("id", id);
  if (e) return fail(e.message, 500);
  return Response.json({ ok: true });
}
