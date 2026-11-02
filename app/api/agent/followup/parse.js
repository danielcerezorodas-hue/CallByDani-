// Núcleo de la detección de seguimientos (lo usa /api/agent/followup).
import Anthropic from "@anthropic-ai/sdk";

export const TYPES = ["follow_up_call", "email", "demo", "appointment", "free_week_end"];
export const LOCAL_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

const SCHEMA = {
  type: "object",
  properties: {
    found: { type: "boolean" },
    type: { type: "string", enum: TYPES },
    local_datetime: { type: "string" },
    summary: { type: "string" },
  },
  required: ["found", "type", "local_datetime", "summary"],
  additionalProperties: false,
};

const SYSTEM = `You read short notes that call-center agents write after talking with someone (in Spanish or English) and decide whether the note asks for a follow-up at a specific time.

Return found=true only when the note says when to contact the person again or when something is scheduled (a call back, an email, a demo, an appointment, the end of a free week). Vague wishes without any day or date ("call again sometime") are found=false.

When found=true:
- local_datetime is the agent's local date and time in the format YYYY-MM-DDTHH:mm (24-hour clock), resolved against the current local date and time you are given.
- A weekday name means its next occurrence in the future ("el martes" said on a Tuesday means next week's Tuesday).
- Relative days ("mañana", "pasado mañana", "in 3 days", "next week") are counted from today; "next week" without a day means next Monday.
- Exact dates without a year mean the next time that date comes.
- If no time is given, use 10:00. "Por la mañana"/"in the morning" is 10:00, "en la tarde"/"afternoon" is 15:00, "en la noche"/"evening" is 18:00. A bare hour like "a las 3" or "at 3" between 1 and 7 means PM.
- type: follow_up_call for calls (default), email for emails, demo for demos or presentations, appointment for meetings, visits or appointments, free_week_end for the end of a free trial week.
- summary: a few words in the note's language describing the step, e.g. "Llamar para confirmar precio".

When found=false, set type to follow_up_call, local_datetime to "" and summary to "".`;

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const EMPTY = { found: false, type: "follow_up_call", local_datetime: "", summary: "" };

// { text, now: "YYYY-MM-DDTHH:mm", timeZone } → { found, type, local_datetime, summary }
// Lanza los errores de la API de Anthropic para que la ruta responda el código correcto.
export async function parseFollowUp({ text, now, timeZone }) {
  if (text.length < 4) return EMPTY;
  const weekday = WEEKDAYS[new Date(`${now}:00Z`).getUTCDay()];
  const client = new Anthropic();
  const response = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 2000,
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    messages: [{
      role: "user",
      content: `Current local date and time: ${weekday} ${now} (time zone ${timeZone}).

<note>
${text}
</note>`,
    }],
  });
  if (response.stop_reason === "refusal") return EMPTY;
  let out;
  try {
    out = JSON.parse(response.content.filter(b => b.type === "text").map(b => b.text).join(""));
  } catch {
    return EMPTY;
  }
  const found = out.found === true && LOCAL_RE.test(out.local_datetime || "") && TYPES.includes(out.type);
  return found ? { found, type: out.type, local_datetime: out.local_datetime, summary: String(out.summary || "").slice(0, 200) } : EMPTY;
}
