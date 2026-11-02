// Detecta en la nota del agente si hay que hacer un seguimiento y cuándo
// ("llámalo el martes a las 3", "demo el 15 de noviembre 10am", "call back tomorrow").
// POST { text, now: "YYYY-MM-DDTHH:mm" (hora local del agente), timeZone }
//   → { found, type, local_datetime: "YYYY-MM-DDTHH:mm" | "", summary }
import Anthropic from "@anthropic-ai/sdk";
import { requireAgent, fail } from "../helpers";
import { parseFollowUp, LOCAL_RE } from "./parse";

export async function POST(req) {
  const { error } = await requireAgent(req);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const text = String(body.text || "").trim().slice(0, 2000);
  const now = String(body.now || "");
  const timeZone = String(body.timeZone || "America/New_York").slice(0, 60);
  if (!LOCAL_RE.test(now)) return fail("Invalid current time");

  try {
    return Response.json(await parseFollowUp({ text, now, timeZone }));
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) return fail("Falta configurar ANTHROPIC_API_KEY en el servidor", 500);
    if (err instanceof Anthropic.RateLimitError) return fail("La IA está ocupada, intenta en un momento", 429);
    if (err instanceof Anthropic.APIError) return fail(`Error de la IA (${err.status})`, 502);
    return fail(err.message || "Error", 500);
  }
}
