// Llama a las rutas del servidor con la sesión del agente.
import { supabase } from "../supabase";

export async function agentApi(path, { method = "GET", body } = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json.error || `Error ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return json;
}

export const post = (path, body) => agentApi(path, { method: "POST", body: body || {} });
