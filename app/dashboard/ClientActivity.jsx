"use client";

// Pestaña "Calendar & Activity" del dashboard del cliente: los prospectos y eventos de SU empresa
// y las notas marcadas "Visible to client". Solo lectura, salvo comentarios.
// Se lee directo de Supabase con la sesión del cliente: la base de datos (RLS) solo le devuelve lo suyo,
// y nada mientras su línea no esté activa. Ver sales-pipeline.sql.
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../supabase";
import { C, button, inputStyle, card } from "./ui";
import Calendar from "../components/sales/Calendar";
import { STAGE, EVENT_TYPE, CONTACT_TYPE, isOverdue, addDays, fmtDateTime, fmtDate, fmtPhone } from "../components/sales/constants";

function StageBadge({ stage }) {
  const s = STAGE[stage] || { label: stage, color: C.muted };
  return <span style={{ background: `${s.color}26`, color: s.color === "#64748b" ? C.soft : s.color, border: `1px solid ${s.color}66`, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" }}>{s.label}</span>;
}

function ProspectModal({ prospect, events, onClose }) {
  const [history, setHistory] = useState(null);
  const [comment, setComment] = useState("");
  const [eventId, setEventId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const myEvents = events.filter(e => e.prospect_id === prospect.id).sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));

  const load = useCallback(async () => {
    const { data, error: e } = await supabase.from("prospect_activities").select("*").eq("prospect_id", prospect.id).order("created_at", { ascending: false });
    if (e) setError(e.message); else setHistory(data);
  }, [prospect.id]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const onKey = e => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function send() {
    if (!comment.trim()) return;
    setSaving(true); setError("");
    const { error: e } = await supabase.from("prospect_activities").insert({
      prospect_id: prospect.id, event_id: eventId || null, kind: "comment", visibility: "client", body: comment.trim(),
    });
    setSaving(false);
    if (e) { setError(e.message); return; }
    setComment(""); setEventId("");
    load();
  }

  function describe(a) {
    if (a.kind === "stage_change") return <>Stage changed to <b>{STAGE[a.new_value]?.label || a.new_value}</b></>;
    if (a.kind === "contact") return <><b>{CONTACT_TYPE[a.contact_type]?.icon} {CONTACT_TYPE[a.contact_type]?.label}</b> · {a.result}</>;
    if (a.kind === "comment") return <b>💬 {a.author_role === "client" ? "Your comment" : "Comment from CallByDani"}</b>;
    return <b>📝 Note from CallByDani</b>;
  }
  const eventLabel = id => { const e = myEvents.find(x => x.id === id); return e ? `${EVENT_TYPE[e.type]?.label} · ${fmtDateTime(e.starts_at)}` : ""; };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "4vh 12px", overflowY: "auto" }}>
      <div role="dialog" aria-label={prospect.business_name} onClick={e => e.stopPropagation()} style={{ ...card, background: C.cardDark, width: "100%", maxWidth: 680 }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 17 }}>{prospect.business_name}</div>
            <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>
              {[prospect.contact_name, fmtPhone(prospect.phone), prospect.industry, `Added ${fmtDate(prospect.created_at)}`].filter(Boolean).join(" · ")}
            </div>
            <div style={{ marginTop: 8 }}><StageBadge stage={prospect.stage} /></div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ ...button("ghost"), padding: "6px 12px" }}>✕</button>
        </div>

        <div style={{ padding: "16px 20px" }}>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>Scheduled</div>
          {myEvents.length === 0 && <div style={{ color: C.muted, fontSize: 13 }}>Nothing scheduled.</div>}
          {myEvents.map(e => {
            const late = isOverdue(e);
            return (
              <div key={e.id} style={{ fontSize: 13, padding: "8px 10px", borderRadius: 10, marginBottom: 6, background: C.bg, border: `1px solid ${late ? C.red : C.border}`, color: e.status === "done" ? C.muted : late ? C.red : C.text, textDecoration: e.status === "done" ? "line-through" : "none" }}>
                {EVENT_TYPE[e.type]?.icon} <b>{EVENT_TYPE[e.type]?.label}</b> · {fmtDateTime(e.starts_at)}{e.status === "done" && " · done"}
                {e.note && <div style={{ color: C.muted, fontSize: 12 }}>{e.note}</div>}
              </div>
            );
          })}

          <div style={{ fontWeight: 800, fontSize: 14, margin: "18px 0 8px" }}>Activity</div>
          {!history && <div style={{ color: C.muted, fontSize: 13 }}>Loading...</div>}
          {history?.length === 0 && <div style={{ color: C.muted, fontSize: 13 }}>No activity shared yet.</div>}
          {history?.map(a => (
            <div key={a.id} style={{ borderLeft: `3px solid ${a.author_role === "client" ? C.sky : C.border}`, padding: "6px 12px", marginBottom: 8 }}>
              <div style={{ fontSize: 13 }}>{describe(a)}{a.event_id && <span style={{ color: C.muted }}> · on {eventLabel(a.event_id) || "an event"}</span>}</div>
              {a.body && <div style={{ fontSize: 13, color: C.soft, whiteSpace: "pre-wrap", marginTop: 2 }}>{a.body}</div>}
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{fmtDateTime(a.created_at)}</div>
            </div>
          ))}

          <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>Add a comment</div>
            <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} placeholder="Questions or details for our team..." style={{ ...inputStyle(), resize: "vertical" }} />
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              {myEvents.length > 0 && (
                <select value={eventId} onChange={e => setEventId(e.target.value)} aria-label="About" style={{ ...inputStyle(), flex: "1 1 200px", width: "auto" }}>
                  <option value="">About this prospect</option>
                  {myEvents.map(e => <option key={e.id} value={e.id}>About: {EVENT_TYPE[e.type]?.label} · {fmtDateTime(e.starts_at)}</option>)}
                </select>
              )}
              <button onClick={send} disabled={saving || !comment.trim()} style={{ ...button("primary", saving || !comment.trim()), flex: "0 0 auto" }}>
                {saving ? "Sending..." : "Send comment"}
              </button>
            </div>
            {error && <div style={{ color: C.red, fontSize: 12, marginTop: 8 }}>⚠ {error}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClientActivity({ locked }) {
  const [prospects, setProspects] = useState(null);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    const [{ data: p, error: e1 }, { data: ev, error: e2 }] = await Promise.all([
      supabase.from("prospects").select("id, business_name, contact_name, phone, industry, stage, created_at, updated_at").order("updated_at", { ascending: false }),
      supabase.from("calendar_events").select("id, prospect_id, type, starts_at, status, note").gte("starts_at", addDays(new Date(), -120).toISOString()).order("starts_at"),
    ]);
    if (e1 || e2) { setError((e1 || e2).message); return; }
    setProspects(p); setEvents(ev); setError("");
  }, []);
  useEffect(() => { if (!locked) load(); }, [locked, load]);

  const byId = useMemo(() => Object.fromEntries((prospects || []).map(p => [p.id, p])), [prospects]);

  if (locked) {
    return (
      <div style={{ ...card, padding: "36px 20px", textAlign: "center", color: C.muted, fontSize: 14, lineHeight: 1.7 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
        Your calendar and prospect activity will show up here once your line is active.
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 4 }}>Calendar & Activity</div>
      <div style={{ color: C.muted, fontSize: 13, marginBottom: 18 }}>Follow-ups, demos and appointments our team scheduled for your business.</div>
      {error && <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>⚠ {error}</div>}
      {!prospects && !error && <div style={{ color: C.muted }}>Loading...</div>}

      {prospects && (
        <>
          <Calendar events={events} prospects={byId} theme="dark" initialView="week" onOpen={e => setOpenId(e.prospect_id)} />

          <div style={{ ...card, marginTop: 18, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, fontWeight: 800, fontSize: 15 }}>Prospects ({prospects.length})</div>
            {prospects.length === 0 && <div style={{ padding: "24px 18px", color: C.muted, fontSize: 14, textAlign: "center" }}>No prospects yet.</div>}
            {prospects.map(p => {
              const next = events.filter(e => e.prospect_id === p.id && e.status !== "done").sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))[0];
              const late = next && isOverdue(next);
              return (
                <button key={p.id} onClick={() => setOpenId(p.id)} style={{
                  width: "100%", textAlign: "left", background: "none", border: "none", borderBottom: `1px solid ${C.border}`, color: C.text,
                  padding: "12px 18px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", cursor: "pointer", fontFamily: "inherit",
                }}>
                  <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{p.business_name}</div>
                    <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{[p.contact_name, fmtPhone(p.phone)].filter(Boolean).join(" · ")}</div>
                  </div>
                  <div style={{ fontSize: 12, color: late ? C.red : C.muted }}>
                    {next ? `${EVENT_TYPE[next.type]?.icon} ${fmtDateTime(next.starts_at)}${late ? " · overdue" : ""}` : ""}
                  </div>
                  <StageBadge stage={p.stage} />
                </button>
              );
            })}
          </div>
        </>
      )}

      {openId && byId[openId] && <ProspectModal prospect={byId[openId]} events={events} onClose={() => setOpenId(null)} />}
    </div>
  );
}
