// Campos del formulario de onboarding del cliente.
// Lo usan el dashboard (para dibujar el formulario y la lista de pasos) y el servidor (para validar).

export const SERVICES = ["Inbound calls", "Outbound / cold calling", "Customer service", "Appointment booking", "Lead generation"];
export const LANGUAGES = ["English", "Spanish"];
export const ENTITY_TYPES = ["LLC", "Corporation", "Sole proprietorship", "Partnership", "Other"];
export const TIME_ZONES = [
  "Eastern (ET)", "Central (CT)", "Mountain (MT)", "Arizona (MST)", "Pacific (PT)", "Alaska (AKT)", "Hawaii (HST)", "Atlantic / Puerto Rico (AST)",
];

// type: text | email | tel | url | textarea | select | multi | date | readonly
export const SECTIONS = [
  {
    id: "company",
    title: "Company",
    fields: [
      { key: "legal_name", label: "Legal business name", required: true },
      { key: "dba", label: "DBA (if any)" },
      { key: "entity_type", label: "Entity type", type: "select", options: ENTITY_TYPES, required: true },
      { key: "state_of_registration", label: "State of registration", required: true, placeholder: "e.g. North Carolina" },
      { key: "ein", label: "EIN (optional)", placeholder: "12-3456789" },
      { key: "industry", label: "Industry", required: true, placeholder: "e.g. HVAC, dental, real estate" },
      { key: "website", label: "Website", type: "url", placeholder: "https://" },
    ],
  },
  {
    id: "billing",
    title: "Address & billing",
    fields: [
      { key: "business_address", label: "Business address", type: "textarea", required: true, placeholder: "Street, city, state, ZIP" },
      { key: "billing_contact_name", label: "Billing contact name", required: true },
      { key: "billing_email", label: "Billing email", type: "email", required: true },
      { key: "billing_phone", label: "Billing phone", type: "tel", required: true },
    ],
  },
  {
    id: "signer",
    title: "Contract signer",
    fields: [
      { key: "signer_name", label: "Full name", required: true },
      { key: "signer_title", label: "Title", required: true },
      { key: "signer_email", label: "Email", type: "email", required: true },
    ],
  },
  {
    id: "phone",
    title: "Phone line",
    fields: [
      { key: "forward_numbers", label: "Business phone number(s) to forward", type: "textarea", required: true, placeholder: "One number per line" },
      { key: "carrier", label: "Current phone carrier", required: true, placeholder: "e.g. AT&T, Verizon, RingCentral" },
      { key: "business_hours", label: "Business hours", type: "textarea", required: true, placeholder: "e.g. Mon–Fri 8am–6pm, Sat 9am–1pm" },
      { key: "time_zone", label: "Time zone", type: "select", options: TIME_ZONES, required: true },
    ],
  },
  {
    id: "service",
    title: "Service setup",
    fields: [
      { key: "plan", label: "Plan selected", type: "readonly" },
      { key: "services", label: "Services needed", type: "multi", options: SERVICES, required: true },
      { key: "languages", label: "Languages", type: "multi", options: LANGUAGES, required: true },
      { key: "greeting_script", label: "Greeting script", type: "textarea", placeholder: "e.g. \"Thank you for calling Smith Plumbing, this is Ana, how can I help you?\"" },
      { key: "call_instructions", label: "Call handling instructions", type: "textarea", required: true, placeholder: "What should we do with each type of call? What should we never say?" },
      { key: "escalation_contact", label: "Escalation contact", type: "textarea", required: true, placeholder: "Name, phone, and when we should contact them" },
      { key: "whatsapp", label: "WhatsApp number for call summaries", type: "tel", placeholder: "+1 910 555 1234" },
      { key: "start_date", label: "Preferred start date", type: "date", required: true },
    ],
  },
  { id: "documents", title: "Documents", optional: true, fields: [] },
];

const ALL_FIELDS = SECTIONS.flatMap(s => s.fields);
export const FIELD_KEYS = ALL_FIELDS.map(f => f.key);

function filled(field, value) {
  if (field.type === "multi") return Array.isArray(value) && value.length > 0;
  return typeof value === "string" && value.trim() !== "";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Errores de un campo ("" si está bien)
export function fieldError(field, value) {
  if (field.required && !filled(field, value)) return "Required";
  if (field.type === "email" && filled(field, value) && !EMAIL_RE.test(value.trim())) return "Enter a valid email";
  return "";
}

// ¿La sección está completa? (documentos: al menos un archivo subido)
export function sectionComplete(section, data, docCount = 0) {
  if (section.id === "documents") return docCount > 0;
  return section.fields.every(f => !fieldError(f, data?.[f.key]));
}

// Errores de todo el formulario: { key: mensaje }
export function formErrors(data) {
  const errors = {};
  for (const f of ALL_FIELDS) {
    const e = fieldError(f, data?.[f.key]);
    if (e) errors[f.key] = e;
  }
  return errors;
}

// Nunca guardamos números de tarjeta: detecta secuencias de 13–19 dígitos que pasan el algoritmo de Luhn
export function looksLikeCardNumber(text) {
  for (const run of String(text || "").match(/\d(?:[ -]?\d)+/g) || []) {
    const digits = run.replace(/\D/g, "");
    if (digits.length < 13 || digits.length > 19) continue;
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      let d = Number(digits[digits.length - 1 - i]);
      if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
      sum += d;
    }
    if (sum % 10 === 0) return true;
  }
  return false;
}

// Texto del plan para mostrar ("ai_receptionist" / "agents:2")
export function planLabel(plan) {
  if (!plan) return "";
  if (plan === "ai_receptionist") return "AI Receptionist";
  const n = Number(String(plan).split(":")[1]) || 1;
  return `Dedicated agents · ${n} ${n === 1 ? "agent" : "agents"}`;
}
