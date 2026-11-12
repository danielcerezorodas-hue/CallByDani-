// Guarda un prospecto en la tabla "leads" (por /api/leads, que también le avisa al admin por correo).
// Devuelve null si todo salió bien, o el error si algo falló.
export async function saveLead(data) {
  try {
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) return null;
    const body = await res.json().catch(() => ({}));
    const error = new Error(body.error || `Error ${res.status}`);
    console.error("Lead error:", error.message);
    return error;
  } catch (error) {
    console.error("Lead error:", error);
    return error;
  }
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
