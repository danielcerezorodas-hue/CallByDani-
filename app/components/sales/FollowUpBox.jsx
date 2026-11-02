"use client";

// "Agendar seguimiento" dentro de la nota de una llamada (pestañas Llamada y Registro).
// La IA lee el motivo y la nota; si encuentra una fecha ("llamar el martes a las 3"),
// marca la casilla y llena tipo y fecha. Al guardar la nota, el panel llama a scheduleFromCall().
import { useState, useEffect } from "react";
import { useFollowUpSuggestion, fmtSuggestion } from "./followup";
import { EVENT_TYPES, EVENT_TYPE, addDays, toLocalInput } from "./constants";

const C = { border: "#e8e4df", blue: "#1a56db", blueDim: "#eff4ff", text: "#1a1a2e", muted: "#6b7280", light: "#9ca3af", surface: "#ffffff" };
const input = { width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box", color: C.text, background: C.surface };

const LABELS = { follow_up_call: "Llamada de seguimiento", email: "Email", demo: "Demo", appointment: "Cita", free_week_end: "Fin de semana gratis" };

// text = motivo + nota de la llamada. Devuelve { enabled, type, at, ui }.
export function useCallFollowUp(text, resetKey) {
  const [enabled, setEnabled] = useState(false);
  const [type, setType] = useState("follow_up_call");
  const [at, setAt] = useState(() => toLocalInput(addDays(new Date(), 1).setHours(10, 0, 0, 0)));
  const [touched, setTouched] = useState(false);
  const [applied, setApplied] = useState(null);
  const { suggestion, loading } = useFollowUpSuggestion(text);

  // Llamada nueva → empieza de cero
  useEffect(() => {
    setEnabled(false); setType("follow_up_call"); setTouched(false); setApplied(null);
    setAt(toLocalInput(addDays(new Date(), 1).setHours(10, 0, 0, 0)));
  }, [resetKey]);

  useEffect(() => {
    if (!suggestion || touched) return;
    setEnabled(true); setType(suggestion.type); setAt(suggestion.local_datetime); setApplied(suggestion);
  }, [suggestion, touched]);

  const touch = fn => v => { setTouched(true); fn(v); };

  const ui = (
    <div style={{ border: `1px solid ${enabled ? C.blue : C.border}`, background: enabled ? C.blueDim : "transparent", borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: C.text, cursor: "pointer" }}>
        <input type="checkbox" checked={enabled} onChange={e => touch(setEnabled)(e.target.checked)} />
        📅 Agendar seguimiento en mi calendario
        {loading && <span style={{ color: C.light, fontWeight: 500, fontSize: 12 }}>✨ leyendo la nota...</span>}
      </label>
      {enabled && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8, marginTop: 8 }}>
            <select aria-label="Tipo de seguimiento" value={type} onChange={e => touch(setType)(e.target.value)} style={input}>
              {EVENT_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {LABELS[t.id]}</option>)}
            </select>
            <input aria-label="Fecha y hora" type="datetime-local" value={at} onChange={e => touch(setAt)(e.target.value)} style={input} />
          </div>
          {applied && !touched && (
            <div style={{ color: C.blue, fontSize: 12, marginTop: 6, fontWeight: 600 }}>
              ✨ La IA lo sacó de la nota: {LABELS[applied.type] || EVENT_TYPE[applied.type]?.label} · {fmtSuggestion(applied.local_datetime)}. Cámbialo si no es correcto.
            </div>
          )}
          <div style={{ color: C.muted, fontSize: 11, marginTop: 6 }}>Se guarda en Sales con este teléfono (si no existe, se crea el prospecto).</div>
        </>
      )}
    </div>
  );

  return { enabled, type, at, ui };
}
