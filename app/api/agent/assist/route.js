// Asistente de IA en vivo: responde al agente usando los documentos de la empresa.
import Anthropic from "@anthropic-ai/sdk";
import { requireAgent, db, fail, normalizePhone } from "../helpers";

export async function POST(req) {
  const { error } = await requireAgent(req);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const phone = normalizePhone(body.phone_number);
  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter(m => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-20)
    .map(m => ({ role: m.role, content: m.content }));
  // La conversación debe empezar con el agente
  while (messages.length && messages[0].role !== "user") messages.shift();
  if (!phone) return fail("Falta la empresa");
  if (messages[messages.length - 1]?.role !== "user") return fail("Falta la pregunta");

  const supa = db();
  const [{ data: line }, { data: docs }] = await Promise.all([
    supa.from("phone_lines").select("business_name, notes").eq("phone_number", phone).maybeSingle(),
    supa.from("company_docs").select("title, content").eq("phone_number", phone).order("created_at"),
  ]);
  if (!line) return fail("No encontré esa empresa", 404);
  if (!docs?.length && !line.notes) return fail("Esta empresa todavía no tiene documentos. Pídele al admin que los suba.");

  const knowledge = [
    line.notes ? `<instrucciones_internas>\n${line.notes}\n</instrucciones_internas>` : "",
    ...(docs || []).map(d => `<documento titulo="${d.title.replace(/"/g, "'")}">\n${d.content}\n</documento>`),
  ].filter(Boolean).join("\n\n");

  const system = `Eres el asistente en tiempo real de un agente de call center que contesta llamadas en nombre de ${line.business_name}. El agente te escribe mientras habla con el cliente, así que responde rápido y corto.

- Empieza con lo que el agente puede decirle al cliente, palabra por palabra, en el idioma de la llamada (inglés si la pregunta viene en inglés). Pon antes "Di:" o "Say:".
- Si hace falta, agrega después una nota breve para el agente.
- Usa solo la información de la empresa que está abajo. Si algo no está ahí, dilo claramente y sugiere tomar el recado para que el negocio devuelva la llamada. Nunca inventes precios, horarios ni políticas.

Información de la empresa:
${knowledge}`;

  try {
    const client = new Anthropic();
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      output_config: { effort: "low" }, // respuestas rápidas durante la llamada
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      cache_control: { type: "ephemeral" },
      system,
      messages,
    });
    if (response.stop_reason === "refusal") {
      return Response.json({ reply: "No puedo ayudar con eso. Toma el recado y el negocio devolverá la llamada." });
    }
    const reply = response.content.filter(b => b.type === "text").map(b => b.text).join("").trim();
    return Response.json({ reply: reply || "No obtuve respuesta, intenta de nuevo." });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) return fail("Falta configurar ANTHROPIC_API_KEY en el servidor", 500);
    if (err instanceof Anthropic.RateLimitError) return fail("La IA está saturada, intenta en unos segundos", 429);
    if (err instanceof Anthropic.APIError) return fail(`Error de la IA (${err.status})`, 502);
    return fail(`No se pudo conectar con la IA: ${err?.message || err}`, 502);
  }
}
