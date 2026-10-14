// Documentos del cliente (FAQ, precios, políticas, guiones) en Supabase Storage, bucket privado "client-documents".
// El archivo sube directo del navegador a Storage (sin pasar por Vercel, que limita el tamaño):
//   1) POST { file_name, content_type, size } → { path, token } (URL firmada para subir)
//   2) el navegador sube el archivo con supabase.storage.uploadToSignedUrl(path, token, file)
//   3) PUT { path, file_name } → confirma y lo registra
// GET ?id=123 → { url } para verlo · DELETE ?id=123 → lo borra
import { randomUUID } from "node:crypto";
import { requireClient, fail } from "../helpers";

const BUCKET = "client-documents";
const MAX_BYTES = 10 * 1024 * 1024;
const TYPES = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
};

function extOf(name) {
  return String(name || "").toLowerCase().split(".").pop();
}

// Nombre seguro para Storage (sin espacios ni caracteres raros)
function safeName(name) {
  return String(name).normalize("NFKD").replace(/[^\w.\-]+/g, "_").replace(/_+/g, "_").slice(-100);
}

export async function POST(req) {
  const { supa, user, error } = await requireClient(req);
  if (error) return error;

  const { file_name, size } = await req.json().catch(() => ({}));
  const ext = extOf(file_name);
  if (!TYPES[ext]) return fail("Only PDF, DOCX and TXT files are allowed");
  if (!(Number(size) > 0)) return fail("The file is empty");
  if (Number(size) > MAX_BYTES) return fail("Files can be up to 10 MB");

  const path = `${user.id}/${randomUUID()}-${safeName(file_name)}`;
  const { data, error: e } = await supa.storage.from(BUCKET).createSignedUploadUrl(path);
  if (e) return fail(e.message, 500);
  return Response.json({ path: data.path, token: data.token, content_type: TYPES[ext] });
}

export async function PUT(req) {
  const { supa, user, error } = await requireClient(req);
  if (error) return error;

  const { path, file_name } = await req.json().catch(() => ({}));
  if (typeof path !== "string" || !path.startsWith(`${user.id}/`)) return fail("Invalid file", 403);

  // Confirmamos que el archivo de verdad está en Storage
  const { data: info, error: e1 } = await supa.storage.from(BUCKET).info(path);
  if (e1 || !info) return fail("The upload didn't finish. Please try again.");

  const { data, error: e2 } = await supa
    .from("client_documents")
    .insert({
      user_id: user.id,
      file_path: path,
      file_name: String(file_name || path.split("/").pop()).slice(0, 200),
      content_type: info.contentType || info.metadata?.mimetype || null,
      size_bytes: info.size ?? info.metadata?.size ?? null,
    })
    .select("id, file_name, content_type, size_bytes, created_at")
    .single();
  if (e2) return fail(e2.message, 500);
  return Response.json({ document: data });
}

async function ownDocument(supa, userId, id) {
  const { data, error } = await supa
    .from("client_documents")
    .select("id, file_path")
    .eq("id", Number(id) || 0)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function GET(req) {
  const { supa, user, error } = await requireClient(req);
  if (error) return error;
  const doc = await ownDocument(supa, user.id, new URL(req.url).searchParams.get("id")).catch(() => null);
  if (!doc) return fail("Document not found", 404);
  const { data, error: e } = await supa.storage.from(BUCKET).createSignedUrl(doc.file_path, 60);
  if (e) return fail(e.message, 500);
  return Response.json({ url: data.signedUrl });
}

export async function DELETE(req) {
  const { supa, user, error } = await requireClient(req);
  if (error) return error;
  const doc = await ownDocument(supa, user.id, new URL(req.url).searchParams.get("id")).catch(() => null);
  if (!doc) return fail("Document not found", 404);
  await supa.storage.from(BUCKET).remove([doc.file_path]);
  const { error: e } = await supa.from("client_documents").delete().eq("id", doc.id);
  if (e) return fail(e.message, 500);
  return Response.json({ ok: true });
}
