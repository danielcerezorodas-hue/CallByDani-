// Bloc de notas personal del agente: cada uno solo ve, edita y borra las suyas.
import { requireAgent, db, fail } from "../helpers";

const MAX_LENGTH = 5000;

function cleanContent(value) {
  const content = String(value || "").trim();
  if (!content) return { error: fail("La nota está vacía") };
  if (content.length > MAX_LENGTH) return { error: fail(`Máximo ${MAX_LENGTH} caracteres`) };
  return { content };
}

export async function GET(req) {
  const { user, error } = await requireAgent(req);
  if (error) return error;
  const { data, error: e } = await db()
    .from("agent_notes")
    .select("id, content, created_at, updated_at")
    .eq("agent_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(500);
  if (e) return fail(e.message, 500);
  return Response.json({ notes: data || [] });
}

// Crear · { content }
export async function POST(req) {
  const { user, error } = await requireAgent(req);
  if (error) return error;
  const body = await req.json().catch(() => ({}));
  const { content, error: invalid } = cleanContent(body.content);
  if (invalid) return invalid;
  const { data, error: e } = await db()
    .from("agent_notes")
    .insert({ agent_id: user.id, content })
    .select("id, content, created_at, updated_at")
    .single();
  if (e) return fail(e.message, 500);
  return Response.json({ note: data });
}

// Editar · { id, content }
export async function PATCH(req) {
  const { user, error } = await requireAgent(req);
  if (error) return error;
  const body = await req.json().catch(() => ({}));
  const { content, error: invalid } = cleanContent(body.content);
  if (invalid) return invalid;
  const { data, error: e } = await db()
    .from("agent_notes")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", body.id)
    .eq("agent_id", user.id) // solo las suyas
    .select("id, content, created_at, updated_at")
    .maybeSingle();
  if (e) return fail(e.message, 500);
  if (!data) return fail("No encontré esa nota", 404);
  return Response.json({ note: data });
}

// Borrar · ?id=
export async function DELETE(req) {
  const { user, error } = await requireAgent(req);
  if (error) return error;
  const id = new URL(req.url).searchParams.get("id");
  const { data, error: e } = await db()
    .from("agent_notes")
    .delete()
    .eq("id", id)
    .eq("agent_id", user.id) // solo las suyas
    .select("id");
  if (e) return fail(e.message, 500);
  if (!data?.length) return fail("No encontré esa nota", 404);
  return Response.json({ ok: true });
}
