// Correos por Resend (solo servidor).
// Si falta RESEND_API_KEY no se manda nada (devuelve "skipped") y no rompe el flujo.
// Con el remitente de prueba (onboarding@resend.dev) Resend solo entrega al correo dueño de la cuenta
// (el del admin): los correos a clientes necesitan el dominio verificado y SUMMARY_EMAIL_FROM.
const DEFAULT_ADMIN = "daniel.cerezo@callbydani.com";

export async function sendEmail({ to, subject, text, html }) {
  const key = (process.env.RESEND_API_KEY || "").trim();
  if (!key) {
    console.warn("sendEmail: falta RESEND_API_KEY, no se mandó:", subject);
    return { status: "skipped", error: "RESEND_API_KEY is not set" };
  }
  const from = (process.env.SUMMARY_EMAIL_FROM || "CallByDani <onboarding@resend.dev>").trim();
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, text, html }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `Resend respondió ${res.status}`);
    }
    return { status: "sent" };
  } catch (err) {
    console.error("sendEmail:", err.message);
    return { status: "failed", error: err.message };
  }
}

export function notifyAdmin(message) {
  return sendEmail({ to: (process.env.ADMIN_EMAIL || DEFAULT_ADMIN).trim(), ...message });
}

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
