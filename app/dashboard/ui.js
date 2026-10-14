// Colores, estilos y utilidades compartidas por las pantallas del dashboard del cliente.
import { supabase } from "../supabase";

export const C = {
  bg: "#0f1e30",
  card: "#1a2e4a",
  cardDark: "#14263d",
  border: "#2c4868",
  text: "#ffffff",
  soft: "#cbd5e1",
  muted: "#94a3b8",
  blue: "#0ea5e9",
  sky: "#38bdf8",
  green: "#22c55e",
  yellow: "#fbbf24",
  red: "#f87171",
};

export const primaryBtn = {
  display: "block", padding: "13px 0", background: `linear-gradient(135deg, ${C.blue}, ${C.sky})`, color: C.text,
  borderRadius: 12, fontWeight: 900, fontSize: 15, textDecoration: "none", textAlign: "center",
};

export const button = (variant = "primary", disabled = false) => ({
  background: variant === "primary" ? `linear-gradient(135deg, ${C.blue}, ${C.sky})` : "transparent",
  color: variant === "primary" ? C.text : C.soft,
  border: variant === "primary" ? "none" : `1px solid ${C.border}`,
  borderRadius: 12, padding: "12px 20px", fontWeight: 800, fontSize: 14, fontFamily: "inherit",
  cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
});

export const inputStyle = (hasError = false) => ({
  width: "100%", background: C.bg, border: `1px solid ${hasError ? C.red : C.border}`, borderRadius: 10, color: C.text,
  padding: "11px 13px", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box",
});

export const card = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 18 };

// fetch a /api/client/... con la sesión del usuario. Devuelve { ok, status, json }.
export async function api(url, { method = "GET", body } = {}) {
  const { data } = await supabase.auth.getSession();
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${data?.session?.access_token || ""}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

export function formatDate(iso) {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" });
}
