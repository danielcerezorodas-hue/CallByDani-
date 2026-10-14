// Lee el acuerdo vigente de content/platform-services-agreement.md (solo servidor).
// Para cambiar el acuerdo: edita ese archivo y sube la versión de la primera línea ("VERSION: 1.1").
// Los clientes que aceptaron una versión anterior tendrán que aceptar la nueva al entrar.
import { readFile } from "node:fs/promises";
import path from "node:path";

const FILE = path.join(process.cwd(), "content", "platform-services-agreement.md");

export async function currentAgreement() {
  const raw = (await readFile(FILE, "utf8")).replace(/\r\n/g, "\n");
  const m = /^VERSION:\s*(.+)\n/.exec(raw);
  if (!m) throw new Error("The agreement file must start with a line like \"VERSION: 1.0\"");
  return { version: m[1].trim(), text: raw.slice(m[0].length).trim() };
}

// Última aceptación del usuario (o null)
export async function latestAcceptance(supa, userId) {
  const { data, error } = await supa
    .from("client_agreements")
    .select("id, agreement_version, accepted_at")
    .eq("user_id", userId)
    .order("accepted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}
