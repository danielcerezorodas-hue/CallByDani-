"use client";

// Ventas del panel de agentes: prospectos, historial, registro de contactos y calendario.
// Todo se lee y escribe directo en Supabase con la sesión del agente: la base de datos (RLS) decide
// qué puede ver cada quien (el agente solo lo suyo, el admin todo). Ver sales-pipeline.sql.
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../../supabase";
import { agentApi } from "../agentApi";
import Calendar from "./Calendar";
import {
  STAGES, STAGE, EVENT_TYPES, EVENT_TYPE, CONTACT_TYPES, CONTACT_TYPE, INTERNAL_COMPANY,
  isOverdue, addDays, toLocalInput, fmtDateTime, fmtDate, fmtPhone, toE164,
} from "./constants";

const C = {
  bg: "#f8f7f4", surface: "#ffffff", border: "#e8e4df", blue: "#1a56db", blueDim: "#eff4ff", green: "#057a55", greenDim: "#f0fdf4",
  red: "#e02424", redDim: "#fff5f5", yellow: "#c27803", yellowDim: "#fffbeb", text: "#1a1a2e", muted: "#6b7280", light: "#9ca3af", navy: "#0f172a",
};

const RESULTS = ["Reached", "No answer", "Left voicemail", "Interested", "Not interested", "Asked to call back", "Wrong number"];

const input = {
  width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 11px", fontSize: 13, outline: "none",
  fontFamily: "inherit", boxSizing: "border-box", color: C.text, background: C.surface,
};

function Btn({ children, variant = "primary", small, style, ...props }) {
  const v = {
    primary: { background: C.blue, color: "#fff", border: "none" },
    secondary: { background: C.surface, color: C.text, border: `1px solid ${C.border}` },
    success: { background: C.green, color: "#fff", border: "none" },
    danger: { background: "transparent", color: C.red, border: `1px solid ${C.border}` },
  }[variant];
  return (
    <button {...props} style={{
      ...v, borderRadius: 9, padding: small ? "6px 11px" : "9px 16px", fontSize: small ? 12 : 13, fontWeight: 700, fontFamily: "inherit",
      cursor: props.disabled ? "not-allowed" : "pointer", opacity: props.disabled ? 0.5 : 1, display: "inline-flex", alignItems: "center", gap: 6, ...style,
    }}>{children}</button>
  );
}

function StageBadge({ stage }) {
  const s = STAGE[stage] || { label: stage, color: C.muted };
  return <span style={{ background: `${s.color}18`, color: s.color, border: `1px solid ${s.color}44`, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" }}>{s.label}</span>;
}

function Label({ children }) {
  return <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, marginBottom: 5 }}>{children}</div>;
}

function VisibilityToggle({ value, onChange, disabled }) {
  return (
    <div style={{ display: "inline-flex", border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
      {[["internal", "🔒 Internal"], ["client", "👁 Visible to client"]].map(([id, label]) => (
        <button key={id} type="button" disabled={disabled} onClick={() => onChange(id)} style={{
          background: value === id ? (id === "client" ? C.greenDim : C.bg) : C.surface, color: value === id ? (id === "client" ? C.green : C.text) : C.light,
          border: "none", padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit",
        }}>{label}</button>
      ))}
    </div>
  );
}

function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const onKey = e => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 60, display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "4vh 12px", overflowY: "auto" }}>
      <div role="dialog" aria-label={title} onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: 16, width: "100%", maxWidth: wide ? 860 : 560, boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div style={{ fontWeight: 900, fontSize: 16, color: C.navy }}>{title}</div>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.muted }}>✕</button>
        </div>
        <div style={{ padding: 18 }}>{children}</div>
      </div>
    </div>
  );
}

// ─── Nuevo prospecto / editar datos ───────────────────────────────────────────
function ProspectForm({ initial, companies, agents, isAdmin, myId, onSaved, onCancel }) {
  const [f, setF] = useState(() => ({
    business_name: "", contact_name: "", phone: "", email: "", industry: "", client_id: "", stage: "prospect", assigned_agent: myId,
    ...initial, client_id: initial?.client_id || "",
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = k => e => setF(x => ({ ...x, [k]: e.target.value }));

  async function save() {
    if (!f.business_name.trim()) { setError("Business name is required"); return; }
    setSaving(true); setError("");
    const row = {
      business_name: f.business_name.trim(), contact_name: f.contact_name.trim() || null, phone: toE164(f.phone) || f.phone.trim() || null,
      email: f.email.trim().toLowerCase() || null, industry: f.industry.trim() || null, client_id: f.client_id || null,
      ...(initial?.id ? {} : { stage: f.stage }),
      ...(isAdmin ? { assigned_agent: f.assigned_agent || myId } : initial?.id ? {} : { assigned_agent: myId }),
    };
    const q = initial?.id
      ? supabase.from("prospects").update(row).eq("id", initial.id).select().single()
      : supabase.from("prospects").insert(row).select().single();
    const { data, error: e } = await q;
    setSaving(false);
    if (e) { setError(e.message); return; }
    onSaved(data);
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <div><Label>BUSINESS NAME *</Label><input value={f.business_name} onChange={set("business_name")} style={input} /></div>
        <div><Label>CONTACT NAME</Label><input value={f.contact_name || ""} onChange={set("contact_name")} style={input} /></div>
        <div><Label>PHONE</Label><input value={f.phone || ""} onChange={set("phone")} inputMode="tel" placeholder="(910) 555-1234" style={input} /></div>
        <div><Label>EMAIL</Label><input value={f.email || ""} onChange={set("email")} type="email" style={input} /></div>
        <div><Label>INDUSTRY</Label><input value={f.industry || ""} onChange={set("industry")} placeholder="e.g. HVAC, dental" style={input} /></div>
        <div>
          <Label>COMPANY / CAMPAIGN</Label>
          <select value={f.client_id} onChange={set("client_id")} style={input}>
            <option value="">{INTERNAL_COMPANY}</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {!initial?.id && (
          <div>
            <Label>STAGE</Label>
            <select value={f.stage} onChange={set("stage")} style={input}>
              {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
        )}
        {isAdmin && (
          <div>
            <Label>ASSIGNED AGENT</Label>
            <select value={f.assigned_agent || ""} onChange={set("assigned_agent")} style={input}>
              {agents.map(a => <option key={a.agent_id} value={a.agent_id}>{a.email}{a.agent_id === myId ? " (me)" : ""}</option>)}
            </select>
          </div>
        )}
      </div>
      {error && <div style={{ color: C.red, fontSize: 12, marginTop: 10 }}>⚠ {error}</div>}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
        {onCancel && <Btn variant="secondary" onClick={onCancel}>Cancel</Btn>}
        <Btn onClick={save} disabled={saving}>{saving ? "Saving..." : initial?.id ? "Save changes" : "Add prospect"}</Btn>
      </div>
    </div>
  );
}

// ─── Registrar contacto (y el siguiente paso en el calendario) ────────────────
function LogContact({ prospect, myId, onDone }) {
  const [f, setF] = useState({
    contact_type: "call", result: "Reached", body: "", visibility: "internal", stage: prospect.stage,
    next: true, next_type: "follow_up_call", next_at: toLocalInput(addDays(new Date(), 2).setHours(10, 0, 0, 0)), next_note: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));

  async function save() {
    if (f.next && !f.next_at) { setError("Choose a date for the next step, or uncheck it"); return; }
    setSaving(true); setError("");
    const { error: e1 } = await supabase.from("prospect_activities").insert({
      prospect_id: prospect.id, kind: "contact", contact_type: f.contact_type, result: f.result, body: f.body.trim() || null, visibility: f.visibility,
    });
    if (e1) { setSaving(false); setError(e1.message); return; }
    if (f.stage !== prospect.stage) {
      const { error: e2 } = await supabase.from("prospects").update({ stage: f.stage }).eq("id", prospect.id);
      if (e2) { setSaving(false); setError(e2.message); return; }
    }
    if (f.next) {
      const { error: e3 } = await supabase.from("calendar_events").insert({
        prospect_id: prospect.id, type: f.next_type, starts_at: new Date(f.next_at).toISOString(),
        agent_id: prospect.assigned_agent || myId, note: f.next_note.trim() || null,
      });
      if (e3) { setSaving(false); setError(`Contact saved, but the next step failed: ${e3.message}`); return; }
    }
    setSaving(false);
    onDone();
  }

  return (
    <div style={{ background: C.bg, borderRadius: 12, padding: 14 }}>
      <div style={{ fontWeight: 800, fontSize: 13, color: C.navy, marginBottom: 10 }}>Log a contact</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        <div>
          <Label>TYPE</Label>
          <select value={f.contact_type} onChange={e => set("contact_type", e.target.value)} style={input}>
            {CONTACT_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
          </select>
        </div>
        <div>
          <Label>RESULT</Label>
          <select value={f.result} onChange={e => set("result", e.target.value)} style={input}>
            {RESULTS.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <Label>STAGE</Label>
          <select value={f.stage} onChange={e => set("stage", e.target.value)} style={input}>
            {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        <Label>NOTE</Label>
        <textarea value={f.body} onChange={e => set("body", e.target.value)} rows={3} style={{ ...input, resize: "vertical" }} />
        <div style={{ marginTop: 6 }}><VisibilityToggle value={f.visibility} onChange={v => set("visibility", v)} /></div>
      </div>

      <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, fontWeight: 700, color: C.navy, cursor: "pointer" }}>
          <input type="checkbox" checked={f.next} onChange={e => set("next", e.target.checked)} /> Schedule the next step
        </label>
        {f.next && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, marginTop: 8 }}>
            <div>
              <Label>NEXT STEP</Label>
              <select value={f.next_type} onChange={e => set("next_type", e.target.value)} style={input}>
                {EVENT_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
              </select>
            </div>
            <div><Label>DATE & TIME</Label><input type="datetime-local" value={f.next_at} onChange={e => set("next_at", e.target.value)} style={input} /></div>
            <div style={{ gridColumn: "1 / -1" }}><Label>DETAILS (OPTIONAL)</Label><input value={f.next_note} onChange={e => set("next_note", e.target.value)} style={input} /></div>
          </div>
        )}
      </div>
      {error && <div style={{ color: C.red, fontSize: 12, marginTop: 10 }}>⚠ {error}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
        <Btn onClick={save} disabled={saving}>{saving ? "Saving..." : "Save contact"}</Btn>
      </div>
    </div>
  );
}

// ─── Ficha del prospecto ──────────────────────────────────────────────────────
function ProspectDetail({ prospect, companies, agents, isAdmin, myId, events, onChanged, onClose }) {
  const [history, setHistory] = useState(null);
  const [mode, setMode] = useState("log"); // log | note | edit | event
  const [note, setNote] = useState({ body: "", visibility: "internal" });
  const [ev, setEv] = useState({ type: "follow_up_call", at: toLocalInput(addDays(new Date(), 1).setHours(10, 0, 0, 0)), note: "" });
  const [error, setError] = useState("");
  const company = companies.find(c => c.id === prospect.client_id);
  const myEvents = events.filter(e => e.prospect_id === prospect.id).sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));

  const loadHistory = useCallback(async () => {
    const { data, error: e } = await supabase.from("prospect_activities").select("*").eq("prospect_id", prospect.id).order("created_at", { ascending: false });
    if (e) setError(e.message); else setHistory(data);
  }, [prospect.id]);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  const refresh = () => { loadHistory(); onChanged(); };

  async function changeStage(stage) {
    setError("");
    const { error: e } = await supabase.from("prospects").update({ stage }).eq("id", prospect.id);
    if (e) setError(e.message); else refresh();
  }

  async function reassign(agentId) {
    setError("");
    const { error: e } = await supabase.from("prospects").update({ assigned_agent: agentId }).eq("id", prospect.id);
    if (e) setError(e.message); else refresh();
  }

  async function addNote() {
    if (!note.body.trim()) return;
    const { error: e } = await supabase.from("prospect_activities").insert({ prospect_id: prospect.id, kind: "note", body: note.body.trim(), visibility: note.visibility });
    if (e) { setError(e.message); return; }
    setNote({ body: "", visibility: "internal" });
    refresh();
  }

  async function addEvent() {
    if (!ev.at) return;
    const { error: e } = await supabase.from("calendar_events").insert({
      prospect_id: prospect.id, type: ev.type, starts_at: new Date(ev.at).toISOString(), agent_id: prospect.assigned_agent || myId, note: ev.note.trim() || null,
    });
    if (e) { setError(e.message); return; }
    setEv(x => ({ ...x, note: "" }));
    setMode("log");
    refresh();
  }

  async function setEventStatus(id, status) {
    const { error: e } = await supabase.from("calendar_events").update({ status }).eq("id", id);
    if (e) setError(e.message); else onChanged();
  }

  async function deleteEvent(id) {
    if (!window.confirm("Delete this event?")) return;
    const { error: e } = await supabase.from("calendar_events").delete().eq("id", id);
    if (e) setError(e.message); else onChanged();
  }

  async function deleteProspect() {
    if (!window.confirm(`Delete ${prospect.business_name} and all its history? This can't be undone.`)) return;
    const { error: e } = await supabase.from("prospects").delete().eq("id", prospect.id);
    if (e) setError(e.message); else { onChanged(); onClose(); }
  }

  function call() {
    const to = toE164(prospect.phone);
    if (!to) { setError("This prospect doesn't have a valid US phone number"); return; }
    window.dispatchEvent(new CustomEvent("cbd:dial", { detail: { to, line: company?.lines?.[0] } }));
  }

  function describe(a) {
    if (a.kind === "stage_change") return a.old_value ? <>Stage: {STAGE[a.old_value]?.label || a.old_value} → <b>{STAGE[a.new_value]?.label || a.new_value}</b></> : <>Created as <b>{STAGE[a.new_value]?.label || a.new_value}</b></>;
    if (a.kind === "assignment") return <>Reassigned: {a.old_value || "nobody"} → <b>{a.new_value || "nobody"}</b></>;
    if (a.kind === "contact") return <><b>{CONTACT_TYPE[a.contact_type]?.icon} {CONTACT_TYPE[a.contact_type]?.label}</b> · {a.result}</>;
    if (a.kind === "comment") return <b>💬 Comment{a.author_role === "client" ? " from client" : ""}</b>;
    return <b>📝 Note</b>;
  }

  return (
    <Modal title={prospect.business_name} onClose={onClose} wide>
      {/* Encabezado */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: C.text, lineHeight: 1.8 }}>
          {prospect.contact_name && <div>👤 {prospect.contact_name}</div>}
          {prospect.phone && <div>📞 {fmtPhone(prospect.phone)}</div>}
          {prospect.email && <div>✉️ <a href={`mailto:${prospect.email}`} style={{ color: C.blue }}>{prospect.email}</a></div>}
          <div style={{ color: C.muted }}>
            {prospect.industry ? `${prospect.industry} · ` : ""}{company?.name || INTERNAL_COMPANY} · Added {fmtDate(prospect.created_at)}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Btn variant="success" onClick={call} disabled={!prospect.phone}>📞 Call</Btn>
            <Btn variant="secondary" onClick={() => setMode(mode === "edit" ? "log" : "edit")}>✏️ Edit</Btn>
            {isAdmin && <Btn variant="danger" onClick={deleteProspect}>Delete</Btn>}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <select aria-label="Stage" value={prospect.stage} onChange={e => changeStage(e.target.value)} style={{ ...input, width: "auto" }}>
              {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            {isAdmin && (
              <select aria-label="Assigned agent" value={prospect.assigned_agent || ""} onChange={e => reassign(e.target.value || null)} style={{ ...input, width: "auto" }}>
                <option value="">Unassigned</option>
                {agents.map(a => <option key={a.agent_id} value={a.agent_id}>{a.email}</option>)}
              </select>
            )}
          </div>
        </div>
      </div>
      {error && <div style={{ color: C.red, fontSize: 12, marginBottom: 10 }}>⚠ {error}</div>}

      {mode === "edit" ? (
        <ProspectForm initial={prospect} companies={companies} agents={agents} isAdmin={isAdmin} myId={myId}
          onSaved={() => { setMode("log"); refresh(); }} onCancel={() => setMode("log")} />
      ) : (
        <>
          <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
            {[["log", "Log contact"], ["note", "Add note"], ["event", "Schedule event"]].map(([id, label]) => (
              <Btn key={id} small variant={mode === id ? "primary" : "secondary"} onClick={() => setMode(id)}>{label}</Btn>
            ))}
          </div>
          {mode === "log" && <LogContact key={prospect.stage} prospect={prospect} myId={myId} onDone={refresh} />}
          {mode === "note" && (
            <div style={{ background: C.bg, borderRadius: 12, padding: 14 }}>
              <textarea value={note.body} onChange={e => setNote(n => ({ ...n, body: e.target.value }))} rows={3} placeholder="Write a note..." style={{ ...input, resize: "vertical" }} />
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                <VisibilityToggle value={note.visibility} onChange={v => setNote(n => ({ ...n, visibility: v }))} />
                <Btn onClick={addNote} disabled={!note.body.trim()}>Save note</Btn>
              </div>
            </div>
          )}
          {mode === "event" && (
            <div style={{ background: C.bg, borderRadius: 12, padding: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
              <div><Label>TYPE</Label><select value={ev.type} onChange={e => setEv(x => ({ ...x, type: e.target.value }))} style={input}>{EVENT_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}</select></div>
              <div><Label>DATE & TIME</Label><input type="datetime-local" value={ev.at} onChange={e => setEv(x => ({ ...x, at: e.target.value }))} style={input} /></div>
              <div style={{ gridColumn: "1 / -1" }}><Label>DETAILS</Label><input value={ev.note} onChange={e => setEv(x => ({ ...x, note: e.target.value }))} style={input} /></div>
              <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}><Btn onClick={addEvent}>Add to calendar</Btn></div>
            </div>
          )}
        </>
      )}

      {/* Eventos */}
      <div style={{ marginTop: 18 }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: C.navy, marginBottom: 8 }}>Calendar</div>
        {myEvents.length === 0 && <div style={{ color: C.light, fontSize: 13 }}>No events yet.</div>}
        {myEvents.map(e => {
          const late = isOverdue(e);
          return (
            <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, marginBottom: 6, background: late ? C.redDim : C.bg, border: `1px solid ${late ? C.red : "transparent"}` }}>
              <span>{EVENT_TYPE[e.type]?.icon}</span>
              <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: e.status === "done" ? C.light : late ? C.red : C.text, textDecoration: e.status === "done" ? "line-through" : "none" }}>
                <b>{EVENT_TYPE[e.type]?.label}</b> · {fmtDateTime(e.starts_at)}{late && " · OVERDUE"}
                {e.note && <div style={{ color: C.muted, fontSize: 12 }}>{e.note}</div>}
                {isAdmin && e.agent_email && <div style={{ color: C.light, fontSize: 11 }}>{e.agent_email}</div>}
              </div>
              {e.status === "done"
                ? <Btn small variant="secondary" onClick={() => setEventStatus(e.id, "open")}>Reopen</Btn>
                : <Btn small variant="success" onClick={() => setEventStatus(e.id, "done")}>✓ Done</Btn>}
              <Btn small variant="danger" onClick={() => deleteEvent(e.id)} aria-label="Delete event">✕</Btn>
            </div>
          );
        })}
      </div>

      {/* Historial */}
      <div style={{ marginTop: 18 }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: C.navy, marginBottom: 8 }}>History</div>
        {!history && <div style={{ color: C.light, fontSize: 13 }}>Loading...</div>}
        {history?.map(a => (
          <div key={a.id} style={{ borderLeft: `3px solid ${a.author_role === "client" ? C.green : a.visibility === "client" ? "#86efac" : C.border}`, padding: "6px 12px", marginBottom: 8 }}>
            <div style={{ fontSize: 13, color: C.text }}>{describe(a)}</div>
            {a.body && <div style={{ fontSize: 13, color: C.text, whiteSpace: "pre-wrap", marginTop: 2 }}>{a.body}</div>}
            <div style={{ fontSize: 11, color: C.light, marginTop: 2 }}>
              {fmtDateTime(a.created_at)} · {a.author_role === "client" ? `client (${a.author_email})` : a.author_email || "system"}
              {" · "}{a.visibility === "client" ? <span style={{ color: C.green }}>visible to client</span> : "internal"}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ─── Pestaña principal ────────────────────────────────────────────────────────
export default function SalesTab({ me }) {
  const isAdmin = !!me?.isAdmin;
  const [myId, setMyId] = useState(null);
  const [prospects, setProspects] = useState(null);
  const [events, setEvents] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [agents, setAgents] = useState([]);
  const [conversions, setConversions] = useState(0);
  const [error, setError] = useState("");
  const [view, setView] = useState("pipeline"); // pipeline | calendar
  const [filters, setFilters] = useState({ stage: "", agent: "", company: "", q: "" });
  const [openId, setOpenId] = useState(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const [{ data: p, error: e1 }, { data: ev, error: e2 }] = await Promise.all([
      supabase.from("prospects").select("*").order("updated_at", { ascending: false }),
      supabase.from("calendar_events").select("*").gte("starts_at", addDays(new Date(), -120).toISOString()).order("starts_at"),
    ]);
    if (e1 || e2) { setError((e1 || e2).message); return; }
    setProspects(p); setEvents(ev); setError("");
    if (isAdmin) {
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { count } = await supabase.from("prospect_activities").select("id", { count: "exact", head: true })
        .eq("kind", "stage_change").eq("new_value", "client").not("old_value", "is", null).gte("created_at", monthStart);
      setConversions(count || 0);
    }
  }, [isAdmin]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyId(data?.user?.id || null));
    agentApi("/api/agent/companies").then(d => setCompanies(d.companies)).catch(e => setError(e.message));
    if (isAdmin) agentApi("/api/agent/agents").then(d => setAgents(d.agents.filter(a => a.agent_id))).catch(() => {});
    load();
  }, [isAdmin, load]);

  // Para el agente, su propio usuario es el único "agente" posible
  // (el admin también puede quedarse prospectos, aunque todavía no aparezca como agente)
  const meAgent = myId ? [{ agent_id: myId, email: me.email }] : [];
  const agentList = isAdmin ? [...meAgent.filter(m => !agents.some(a => a.agent_id === m.agent_id)), ...agents] : meAgent;
  const byId = useMemo(() => Object.fromEntries((prospects || []).map(p => [p.id, p])), [prospects]);
  const companyName = id => companies.find(c => c.id === id)?.name || INTERNAL_COMPANY;

  const nextEvent = id => events.filter(e => e.prospect_id === id && e.status !== "done").sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))[0];

  const q = filters.q.trim().toLowerCase();
  const qDigits = q.replace(/\D/g, "");
  const matchProspect = p =>
    (!filters.stage || p.stage === filters.stage) &&
    (!filters.agent || p.assigned_agent === filters.agent) &&
    (!filters.company || (filters.company === "internal" ? !p.client_id : p.client_id === filters.company)) &&
    (!q || p.business_name.toLowerCase().includes(q) || (p.contact_name || "").toLowerCase().includes(q) || (qDigits.length >= 3 && (p.phone || "").replace(/\D/g, "").includes(qDigits)));
  const list = (prospects || []).filter(matchProspect);
  const visibleEvents = events.filter(e => byId[e.prospect_id] && matchProspect(byId[e.prospect_id]) && (!filters.agent || e.agent_id === filters.agent));
  const open = openId && byId[openId];
  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 18, color: C.navy }}>Sales</div>
          <div style={{ color: C.muted, fontSize: 13 }}>{isAdmin ? "All agents' prospects and calendars" : "Your prospects and calendar"}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
            {[["pipeline", "📋 Prospects"], ["calendar", "📅 Calendar"]].map(([id, label]) => (
              <button key={id} onClick={() => setView(id)} style={{ background: view === id ? C.blue : C.surface, color: view === id ? "#fff" : C.muted, border: "none", padding: "9px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{label}</button>
            ))}
          </div>
          <Btn onClick={() => setAdding(true)} disabled={!myId}>+ New prospect</Btn>
        </div>
      </div>

      {/* Resumen (admin) */}
      {isAdmin && prospects && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8, marginBottom: 14 }}>
          {STAGES.map(s => (
            <button key={s.id} onClick={() => setFilter("stage", filters.stage === s.id ? "" : s.id)} style={{
              background: filters.stage === s.id ? `${s.color}18` : C.surface, border: `1px solid ${filters.stage === s.id ? s.color : C.border}`, borderRadius: 12,
              padding: "10px 12px", textAlign: "left", cursor: "pointer", fontFamily: "inherit",
            }}>
              <div style={{ color: s.color, fontSize: 11, fontWeight: 800 }}>{s.label.toUpperCase()}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: C.navy }}>{prospects.filter(p => p.stage === s.id).length}</div>
            </button>
          ))}
          <div style={{ background: C.greenDim, border: `1px solid #bbf7d0`, borderRadius: 12, padding: "10px 12px" }}>
            <div style={{ color: C.green, fontSize: 11, fontWeight: 800 }}>CONVERSIONS THIS MONTH</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: C.green }}>{conversions}</div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8, marginBottom: 14 }}>
        <input value={filters.q} onChange={e => setFilter("q", e.target.value)} placeholder="Search name or phone" aria-label="Search" style={input} />
        <select aria-label="Stage" value={filters.stage} onChange={e => setFilter("stage", e.target.value)} style={input}>
          <option value="">All stages</option>
          {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        {isAdmin && (
          <select aria-label="Agent" value={filters.agent} onChange={e => setFilter("agent", e.target.value)} style={input}>
            <option value="">All agents</option>
            {agentList.map(a => <option key={a.agent_id} value={a.agent_id}>{a.email}</option>)}
          </select>
        )}
        <select aria-label="Company" value={filters.company} onChange={e => setFilter("company", e.target.value)} style={input}>
          <option value="">All companies</option>
          <option value="internal">{INTERNAL_COMPANY}</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {error && <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>⚠ {error}</div>}
      {!prospects && !error && <div style={{ color: C.muted, fontSize: 13 }}>Loading...</div>}

      {view === "pipeline" && prospects && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
          {list.length === 0 && <div style={{ padding: 24, color: C.light, fontSize: 13, textAlign: "center" }}>{prospects.length ? "No prospects match these filters." : "No prospects yet. Add your first one."}</div>}
          {list.map(p => {
            const ne = nextEvent(p.id);
            const late = ne && isOverdue(ne);
            return (
              <button key={p.id} onClick={() => setOpenId(p.id)} style={{
                width: "100%", textAlign: "left", background: "none", border: "none", borderBottom: `1px solid ${C.border}`, padding: "12px 16px",
                display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", cursor: "pointer", fontFamily: "inherit",
              }}>
                <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: C.navy }}>{p.business_name}</div>
                  <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
                    {[p.contact_name, fmtPhone(p.phone), companyName(p.client_id), isAdmin && p.assigned_agent_email].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: late ? C.red : C.muted, fontWeight: late ? 800 : 500, flex: "0 0 auto" }}>
                  {ne ? `${EVENT_TYPE[ne.type]?.icon} ${fmtDateTime(ne.starts_at)}${late ? " · overdue" : ""}` : "No next step"}
                </div>
                <StageBadge stage={p.stage} />
              </button>
            );
          })}
        </div>
      )}

      {view === "calendar" && prospects && (
        <Calendar events={visibleEvents} prospects={byId} theme="light" showAgent={isAdmin} onOpen={e => setOpenId(e.prospect_id)} />
      )}

      {adding && (
        <Modal title="New prospect" onClose={() => setAdding(false)}>
          <ProspectForm companies={companies} agents={agentList} isAdmin={isAdmin} myId={myId}
            onSaved={p => { setAdding(false); load(); setOpenId(p.id); }} onCancel={() => setAdding(false)} />
        </Modal>
      )}

      {open && (
        <ProspectDetail prospect={open} companies={companies} agents={agentList} isAdmin={isAdmin} myId={myId} events={events}
          onChanged={load} onClose={() => setOpenId(null)} />
      )}
    </div>
  );
}
