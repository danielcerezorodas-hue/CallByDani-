"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase";

const C = {
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

// Minutos incluidos por plan (solo el plan de IA tiene límite)
const INCLUDED_MINUTES = { ai_receptionist: 600 };
const REFRESH_MS = 30 * 1000;

const STATUS = {
  ringing: { label: "Ringing", color: C.sky, icon: "📲" },
  answered: { label: "In progress", color: C.sky, icon: "🎧" },
  completed: { label: "Answered", color: C.green, icon: "✓" },
  voicemail: { label: "Voicemail", color: C.yellow, icon: "✉" },
  missed: { label: "Missed", color: C.red, icon: "✕" },
  outbound: { label: "Outbound", color: C.sky, icon: "↗" },
  outbound_done: { label: "Outbound", color: C.green, icon: "↗" },
  outbound_missed: { label: "No answer", color: C.muted, icon: "↗" },
};
const ANSWERED = ["completed", "outbound_done"];

const PERIODS = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
];

function periodStart(id) {
  const now = new Date();
  if (id === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return new Date(now.getTime() - (id === "7d" ? 7 : 30) * 24 * 3600 * 1000);
}

function formatPhone(p) {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(p || "");
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : p || "Unknown number";
}

function formatDuration(s) {
  if (!s) return "—";
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function formatWhen(iso) {
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  return today
    ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function Badge({ status }) {
  const s = STATUS[status] || { label: status || "—", color: C.muted };
  return (
    <span style={{ background: `${s.color}1f`, color: s.color, border: `1px solid ${s.color}55`, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

// Reproduce la grabación de una llamada (se descarga solo al pulsar)
function Recording({ callId, type, label }) {
  const [src, setSrc] = useState(null);
  const [state, setState] = useState("idle"); // idle | loading | error
  useEffect(() => () => { if (src) URL.revokeObjectURL(src); }, [src]);

  async function play() {
    setState("loading");
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch(`/api/client/recording?call=${callId}&type=${type}`, {
        headers: { Authorization: `Bearer ${data?.session?.access_token}` },
      });
      if (!res.ok) throw new Error();
      setSrc(URL.createObjectURL(await res.blob()));
      setState("idle");
    } catch {
      setState("error");
    }
  }

  if (src) return <audio src={src} controls autoPlay style={{ width: "100%", marginTop: 10 }} />;
  return (
    <div style={{ marginTop: 10 }}>
      <button onClick={play} disabled={state === "loading"} style={{
        background: `${C.blue}1f`, border: `1px solid ${C.blue}55`, color: C.sky, borderRadius: 10,
        padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
      }}>
        {state === "loading" ? "Loading..." : `▶ ${label}`}
      </button>
      {state === "error" && <span style={{ color: C.red, fontSize: 12, marginLeft: 10 }}>Couldn't load the audio</span>}
    </div>
  );
}

function Shell({ children }) {
  return (
    <div style={{ background: C.bg, minHeight: "100vh", padding: "24px 16px", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
      {children}
    </div>
  );
}

const primaryBtn = {
  display: "block", padding: "13px 0", background: `linear-gradient(135deg, ${C.blue}, ${C.sky})`, color: C.text,
  borderRadius: 12, fontWeight: 900, fontSize: 15, textDecoration: "none", textAlign: "center",
};

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [data, setData] = useState(null); // { email, isAdmin, plan, lines, calls }
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("30d");
  const [expanded, setExpanded] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      setChecking(false);
    });
  }, []);

  const load = useCallback(async () => {
    const { data: s } = await supabase.auth.getSession();
    const token = s?.session?.access_token;
    if (!token) { setUser(null); return; }
    try {
      const res = await fetch("/api/client/dashboard", { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json().catch(() => ({}));
      if (res.status === 401) { setUser(null); return; }
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      setData(json);
      setError("");
      setUpdatedAt(new Date());
    } catch (e) {
      setError(e.message);
    }
  }, []);

  // Carga y se actualiza sola cada 30 segundos
  useEffect(() => {
    if (!user) return;
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [user, load]);

  if (checking) return <Shell><div style={{ color: C.muted }}>Loading...</div></Shell>;

  if (!user) return (
    <Shell>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "44px 32px", textAlign: "center", maxWidth: 400, width: "100%", boxSizing: "border-box" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: C.text, marginBottom: 10 }}>Sign in to your dashboard</div>
        <div style={{ color: C.muted, fontSize: 14, marginBottom: 24 }}>See every call we answer for your business.</div>
        <a href="/login" style={primaryBtn}>Sign in →</a>
        <a href="/pricing" style={{ display: "block", color: C.muted, fontSize: 13, marginTop: 16, textDecoration: "underline" }}>Not a customer yet? See plans</a>
      </div>
    </Shell>
  );

  const lines = data?.lines || [];
  const calls = data?.calls || [];
  const start = periodStart(period);
  const inPeriod = calls.filter(c => new Date(c.created_at) >= start);
  const count = list => inPeriod.filter(c => list.includes(c.status)).length;
  const answered = count(ANSWERED);
  const minutesIn = list => Math.ceil(list.filter(c => ANSWERED.includes(c.status)).reduce((s, c) => s + (c.duration_seconds || 0), 0) / 60);

  // Minutos usados este mes (para planes con minutos incluidos)
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const included = INCLUDED_MINUTES[data?.plan];
  const monthMinutes = minutesIn(calls.filter(c => new Date(c.created_at) >= monthStart));
  const multiLine = lines.length > 1;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", color: C.text }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800;900&display=swap" rel="stylesheet" />

      {/* HEADER */}
      <div style={{ background: C.cardDark, borderBottom: `1px solid ${C.border}`, padding: "12px 20px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: C.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>☎</div>
            <span style={{ fontWeight: 900, fontSize: 18, color: C.text }}>CallByDani</span>
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ color: C.muted, fontSize: 13, wordBreak: "break-all" }}>{user.email}</span>
            <button onClick={() => supabase.auth.signOut().then(() => (window.location.href = "/"))} style={{
              background: "transparent", border: `1px solid ${C.border}`, color: C.soft, borderRadius: 10,
              padding: "7px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}>Sign out</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 16px 60px" }}>
        {data?.isAdmin && (
          <div style={{ background: `${C.blue}1a`, border: `1px solid ${C.blue}55`, color: C.sky, borderRadius: 12, padding: "10px 14px", fontSize: 13, marginBottom: 20 }}>
            Admin view: showing every business.
          </div>
        )}
        {error && <div style={{ color: C.red, fontSize: 13, marginBottom: 16 }}>⚠ {error}</div>}

        {!data && !error && <div style={{ color: C.muted }}>Loading your calls...</div>}

        {/* Todavía no tiene número asignado */}
        {data && lines.length === 0 && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: "36px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🛠️</div>
            <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>We're setting up your line</div>
            <div style={{ color: C.soft, fontSize: 14, lineHeight: 1.7, maxWidth: 460, margin: "0 auto 22px" }}>
              Once your phone number is connected, every call we handle for you will show up here in real time.
            </div>
            <a href="/contact" style={{ ...primaryBtn, display: "inline-block", padding: "12px 24px" }}>Contact us →</a>
          </div>
        )}

        {data && lines.length > 0 && (
          <>
            {/* Título + periodo */}
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 900 }}>Your calls</div>
                <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>
                  {lines.map(l => `${l.business_name} · ${formatPhone(l.phone_number)}`).join("  |  ")}
                </div>
              </div>
              <div style={{ display: "flex", background: C.cardDark, border: `1px solid ${C.border}`, borderRadius: 10, padding: 3 }}>
                {PERIODS.map(p => (
                  <button key={p.id} onClick={() => setPeriod(p.id)} style={{
                    background: period === p.id ? C.blue : "transparent", color: period === p.id ? C.text : C.muted,
                    border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  }}>{p.label}</button>
                ))}
              </div>
            </div>

            {/* Estadísticas */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
              {[
                { label: "CALLS", value: inPeriod.length, color: C.text },
                { label: "ANSWERED", value: answered, color: C.green },
                { label: "VOICEMAIL", value: count(["voicemail"]), color: C.yellow },
                { label: "MISSED", value: count(["missed"]), color: C.red },
                { label: "MINUTES", value: minutesIn(inPeriod), color: C.text },
              ].map(s => (
                <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px" }}>
                  <div style={{ color: C.muted, fontSize: 10, fontWeight: 800, letterSpacing: 1.2, marginBottom: 6 }}>{s.label}</div>
                  <div style={{ color: s.color, fontSize: 26, fontWeight: 900 }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Minutos incluidos del plan */}
            {included && (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px", marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", fontSize: 13, marginBottom: 10 }}>
                  <span style={{ fontWeight: 800 }}>Minutes used this month</span>
                  <span style={{ color: monthMinutes > included ? C.yellow : C.soft }}>
                    {monthMinutes} / {included} min{monthMinutes > included && ` · ${monthMinutes - included} extra`}
                  </span>
                </div>
                <div style={{ height: 8, background: C.cardDark, borderRadius: 8, overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(100, (monthMinutes / included) * 100)}%`, height: "100%", background: monthMinutes > included ? C.yellow : C.blue }} />
                </div>
              </div>
            )}

            {/* Lista de llamadas */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div style={{ fontWeight: 800, fontSize: 15 }}>Call log</div>
                <div style={{ display: "flex", alignItems: "center", gap: 7, color: C.muted, fontSize: 11 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.green, display: "inline-block" }} />
                  LIVE{updatedAt && ` · updated ${updatedAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`}
                </div>
              </div>

              {inPeriod.length === 0 && (
                <div style={{ padding: "28px 18px", color: C.muted, fontSize: 14, textAlign: "center" }}>No calls in this period yet.</div>
              )}

              {inPeriod.map(call => {
                const st = STATUS[call.status] || { color: C.muted, icon: "•" };
                const open = expanded === call.id;
                const name = call.caller_name || formatPhone(call.caller_phone || call.from_number);
                const sub = [call.reason, multiLine && call.business_name, formatWhen(call.created_at)].filter(Boolean).join(" · ");
                return (
                  <div key={call.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <div onClick={() => setExpanded(open ? null : call.id)} style={{ padding: "13px 18px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: `${st.color}1f`, color: st.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 900, flexShrink: 0 }}>
                        {st.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          {name}
                          {call.urgent && <span style={{ background: `${C.red}26`, color: C.red, borderRadius: 6, padding: "1px 7px", fontSize: 10, fontWeight: 900 }}>URGENT</span>}
                        </div>
                        <div style={{ color: C.muted, fontSize: 12, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
                        <Badge status={call.status} />
                        <span style={{ color: C.muted, fontSize: 11, fontFamily: "monospace" }}>{formatDuration(call.duration_seconds)}</span>
                      </div>
                    </div>
                    {open && (
                      <div style={{ padding: "4px 18px 16px 64px", fontSize: 13, color: C.soft, lineHeight: 1.7 }}>
                        <div><span style={{ color: C.muted }}>Phone:</span> {formatPhone(call.caller_phone || call.from_number)}</div>
                        {call.language && <div><span style={{ color: C.muted }}>Language:</span> {call.language === "es" ? "Spanish" : "English"}</div>}
                        {call.reason && <div><span style={{ color: C.muted }}>Reason:</span> {call.reason}</div>}
                        {call.note
                          ? <div style={{ marginTop: 8, background: C.cardDark, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", whiteSpace: "pre-wrap" }}>{call.note}</div>
                          : <div style={{ color: C.muted, marginTop: 4 }}>No notes for this call.</div>}
                        {call.has_voicemail && <Recording callId={call.id} type="voicemail" label="Play voicemail" />}
                        {call.has_recording && <Recording callId={call.id} type="call" label="Play recording" />}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
