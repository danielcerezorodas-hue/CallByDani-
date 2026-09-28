import { supabase } from "./supabase";

// Guarda un prospecto en la tabla "leads" de Supabase.
// Devuelve null si todo salió bien, o el error si algo falló.
export async function saveLead(data) {
  const { error } = await supabase.from("leads").insert([data]);
  if (error) console.error("Supabase lead error:", error);
  return error;
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
