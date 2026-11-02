"use client";

// Seguimientos: la IA lee la nota y propone fecha/hora; y agendar desde la nota de una llamada.
import { useState, useEffect, useRef } from "react";
import { supabase } from "../../supabase";
import { agentApi } from "../agentApi";
import { toLocalInput, toE164, fmtPhone } from "./constants";

// Pide a la IA la fecha del seguimiento que menciona la nota → { found, type, local_datetime, summary }
export function detectFollowUp(text) {
  return agentApi("/api/agent/followup", {
    method: "POST",
    body: { text, now: toLocalInput(new Date()), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
  });
}

// Mientras el agente escribe, espera a que pare un momento y le pregunta a la IA.
// Devuelve { suggestion, loading } (suggestion = null si no encontró nada).
export function useFollowUpSuggestion(text, { enabled = true, delay = 1200 } = {}) {
  const [suggestion, setSuggestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    const clean = (text || "").trim();
    if (!enabled || clean.length < 8) { setSuggestion(null); setLoading(false); return; }
    const id = ++seq.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await detectFollowUp(clean);
        if (id === seq.current) setSuggestion(r.found ? r : null);
      } catch {
        if (id === seq.current) setSuggestion(null);
      }
      if (id === seq.current) setLoading(false);
    }, delay);
    return () => clearTimeout(timer);
  }, [text, enabled, delay]);

  return { suggestion, loading };
}

export function fmtSuggestion(localDatetime) {
  return new Date(localDatetime).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// Desde la nota de una llamada: busca (o crea) el prospecto por teléfono, registra la llamada
// y pone el seguimiento en el calendario. line = número de la empresa que recibió la llamada.
export async function scheduleFromCall({ phone, name, reason, note, line, type, at }) {
  const e164 = toE164(phone);
  if (!e164) throw new Error("Falta un teléfono válido para agendar el seguimiento");
  const { data: auth } = await supabase.auth.getUser();
  const myId = auth?.user?.id;
  if (!myId) throw new Error("Tu sesión expiró. Vuelve a entrar.");

  // ¿A qué empresa pertenece? (la del número que recibió la llamada; si no, ventas internas)
  let clientId = null;
  if (line) {
    const { companies } = await agentApi("/api/agent/companies").catch(() => ({ companies: [] }));
    clientId = companies.find(c => c.lines.includes(line))?.id || null;
  }

  // Prospecto existente con ese teléfono (RLS: el agente solo ve los suyos)
  const { data: found, error: e0 } = await supabase.from("prospects").select("id, assigned_agent").eq("phone", e164).limit(1);
  if (e0) throw e0;
  let prospect = found?.[0];
  if (!prospect) {
    const { data, error } = await supabase.from("prospects").insert({
      business_name: name?.trim() || fmtPhone(e164), contact_name: name?.trim() || null, phone: e164,
      client_id: clientId, stage: "contacted", assigned_agent: myId,
    }).select("id, assigned_agent").single();
    if (error) throw error;
    prospect = data;
  }

  const body = [reason?.trim(), note?.trim()].filter(Boolean).join("\n");
  const { error: e1 } = await supabase.from("prospect_activities").insert({
    prospect_id: prospect.id, kind: "contact", contact_type: "call", result: "Reached", body: body || null, visibility: "internal",
  });
  if (e1) throw e1;
  const { error: e2 } = await supabase.from("calendar_events").insert({
    prospect_id: prospect.id, type, starts_at: new Date(at).toISOString(), agent_id: prospect.assigned_agent || myId, note: reason?.trim() || null,
  });
  if (e2) throw e2;
  return prospect;
}
