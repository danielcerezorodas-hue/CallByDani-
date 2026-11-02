// Ventas y calendario: etapas, tipos de evento y utilidades de fechas (compartido por /agente y el dashboard).

export const STAGES = [
  { id: "prospect", label: "Prospect", color: "#64748b" },
  { id: "contacted", label: "Contacted", color: "#0ea5e9" },
  { id: "conversation", label: "Conversation", color: "#6366f1" },
  { id: "demo", label: "Demo", color: "#a855f7" },
  { id: "free_week", label: "Free Week", color: "#f59e0b" },
  { id: "client", label: "Client", color: "#16a34a" },
  { id: "lost", label: "Lost", color: "#dc2626" },
];
export const STAGE = Object.fromEntries(STAGES.map(s => [s.id, s]));

export const EVENT_TYPES = [
  { id: "follow_up_call", label: "Follow-up call", icon: "📞" },
  { id: "email", label: "Email", icon: "✉️" },
  { id: "demo", label: "Demo", icon: "🎬" },
  { id: "appointment", label: "Appointment", icon: "📅" },
  { id: "free_week_end", label: "End of free week", icon: "⏳" },
];
export const EVENT_TYPE = Object.fromEntries(EVENT_TYPES.map(t => [t.id, t]));

export const CONTACT_TYPES = [
  { id: "call", label: "Call", icon: "📞" },
  { id: "email", label: "Email", icon: "✉️" },
  { id: "visit", label: "Visit", icon: "🤝" },
];
export const CONTACT_TYPE = Object.fromEntries(CONTACT_TYPES.map(t => [t.id, t]));

export const INTERNAL_COMPANY = "CallByDani (internal sales)";

// ¿Evento vencido? (pendiente y ya pasó su hora)
export function isOverdue(ev, now = Date.now()) {
  return ev.status !== "done" && new Date(ev.starts_at).getTime() < now;
}

export function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
export function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
export function sameDay(a, b) { return startOfDay(a).getTime() === startOfDay(b).getTime(); }
// Semana de domingo a sábado
export function startOfWeek(d) { const x = startOfDay(d); return addDays(x, -x.getDay()); }

export function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
export function fmtDateTime(iso) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
export function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Valor para <input type="datetime-local"> en hora local
export function toLocalInput(date) {
  const d = new Date(date);
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Teléfono a +1XXXXXXXXXX (o "" si no es de EE. UU./Canadá)
export function toE164(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return "";
}
export function fmtPhone(p) {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(toE164(p) || "");
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : p || "";
}
