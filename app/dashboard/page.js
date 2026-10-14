"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase";
import { C, primaryBtn, button, api } from "./ui";
import { AgreementStep, SignedAgreements } from "./Agreement";
import { OnboardingForm, OnboardingChecklist, Documents } from "./Onboarding";

// Minutos incluidos por plan (solo el plan de IA tiene límite)
const INCLUDED_MINUTES = { ai_receptionist: 600 };
const REFRESH_MS = 30 * 1000;

const STATUS = {
  ringing: { label: "Ringing", color: C.sky, icon: "📲" },
  answered: { label: "In progress", color: C.sky, icon: "🎧" },
  completed: { label: "Answered", color: C.green, icon: "✓" },
  voicemail: { label: "Voicemail", color: C.yellow, icon: "✉" },
  missed: { label: "Missed", color: C.red, icon: "✕" },
  ai: { label: "AI in progress", color: C.sky, icon: "🤖" },
  ai_handled: { label: "AI answered", color: C.green, icon: "🤖" },
  outbound: { label: "Outbound", color: C.sky, icon: "↗" },
  outbound_done: { label: "Outbound", color: C.green, icon: "↗" },
  outbound_missed: { label: "No answer", color: C.muted, icon: "↗" },
};
const ANSWERED = ["completed", "outbound_done", "ai_handled"];

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

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [data, setData] = useState(null); // { email, isAdmin, plan, lines, calls }
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("30d");
  const [expanded, setExpanded] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  // Paso 1: acuerdo · Paso 2: onboarding
  const [agreement, setAgreement] = useState(null); // { version, text, required, isUpdate, signed }
  const [setup, setSetup] = useState(null); // { onboarding: { status, data }, documents }
  const [view, setView] = useState("auto"); // auto (formulario si falta enviarlo) | main | onboarding
  const [tab, setTab] = useState("calls"); // calls | documents | settings
  const [startSection, setStartSection] = useState(null);
  const [showSigned, setShowSigned] = useState(false);

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
      if (res.status === 403 && json.code === "agreement_required") { loadAgreement(); return; }
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      setData(json);
      setError("");
      setUpdatedAt(new Date());
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const loadAgreement = useCallback(async () => {
    const { ok, status, json } = await api("/api/client/agreement");
    if (status === 401) { setUser(null); return; }
    if (!ok) { setError(json.error || `Error ${status}`); return; }
    setAgreement(json);
  }, []);

  const loadSetup = useCallback(async () => {
    const { ok, json } = await api("/api/client/onboarding");
    if (ok) setSetup(json);
  }, []);

  useEffect(() => {
    if (user) loadAgreement();
  }, [user, loadAgreement]);

  const accepted = agreement && !agreement.required;

  // Con el acuerdo aceptado: onboarding + llamadas (se actualizan solas cada 30 segundos)
  useEffect(() => {
    if (!user || !accepted) return;
    loadSetup();
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [user, accepted, load, loadSetup]);

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

  const header = (
    <div style={{ background: C.cardDark, borderBottom: `1px solid ${C.border}`, padding: "12px 20px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: C.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>☎</div>
          <span style={{ fontWeight: 900, fontSize: 18, color: C.text }}>CallByDani</span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ color: C.muted, fontSize: 13, wordBreak: "break-all" }}>{user.email}</span>
          {agreement?.signed?.length > 0 && (
            <button onClick={() => setShowSigned(true)} style={{ ...button("ghost"), padding: "7px 14px", fontSize: 13 }}>Agreement</button>
          )}
          <button onClick={() => supabase.auth.signOut().then(() => (window.location.href = "/"))} style={{ ...button("ghost"), padding: "7px 14px", fontSize: 13 }}>Sign out</button>
        </div>
      </div>
    </div>
  );

  const page = content => (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", color: C.text }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
      {header}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 16px 60px" }}>
        {error && <div style={{ color: C.red, fontSize: 13, marginBottom: 16 }}>⚠ {error}</div>}
        {content}
      </div>
      {showSigned && <SignedAgreements signed={agreement?.signed || []} onClose={() => setShowSigned(false)} />}
    </div>
  );

  // Paso 1: sin acuerdo aceptado no se ve nada más
  if (!agreement) return page(<div style={{ color: C.muted }}>Loading...</div>);
  if (agreement.required) return page(<AgreementStep agreement={agreement} onAccepted={loadAgreement} />);

  const isAdminView = !!data?.isAdmin;
  const setupDone = setup?.onboarding?.status === "ready_for_setup";
  // Mientras la línea no esté activa, el dashboard se ve completo pero bloqueado
  const locked = !!data && !isAdminView && data.accountStatus !== "active";

  const updateSetup = changes => setSetup(s => (s ? { ...s, ...changes(s) } : s));
  const onSaved = ({ data: saved }) => updateSetup(s => ({ onboarding: { ...s.onboarding, data: { ...s.onboarding.data, ...saved } } }));
  const onDocumentsChange = documents => updateSetup(() => ({ documents }));
  const openSetup = section => { setStartSection(section || null); setView("onboarding"); };
  const backToDashboard = () => { setView("main"); window.scrollTo(0, 0); };

  // Paso 2: el formulario de onboarding sale primero hasta que lo envíe (o elija terminarlo después)
  if (!isAdminView && setup && (view === "onboarding" || (view === "auto" && !setupDone))) {
    return page(
      <OnboardingForm
        key={startSection || "form"}
        initial={setup}
        startSection={startSection}
        onSaved={onSaved}
        onDocumentsChange={onDocumentsChange}
        onSubmitted={() => { loadSetup(); setTab("calls"); backToDashboard(); }}
        onFinishLater={backToDashboard}
        onClose={backToDashboard}
      />
    );
  }
  if (!data || (!isAdminView && !setup)) return page(!error && <div style={{ color: C.muted }}>Loading your dashboard...</div>);

  const lines = data.lines || [];
  const calls = data.calls || [];
  const start = periodStart(period);
  const inPeriod = calls.filter(c => new Date(c.created_at) >= start);
  const count = list => inPeriod.filter(c => list.includes(c.status)).length;
  const answered = count(ANSWERED);
  const minutesIn = list => Math.ceil(list.filter(c => ANSWERED.includes(c.status)).reduce((s, c) => s + (c.duration_seconds || 0), 0) / 60);

  // Minutos usados este mes (para planes con minutos incluidos)
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const included = INCLUDED_MINUTES[data.plan];
  const monthMinutes = minutesIn(calls.filter(c => new Date(c.created_at) >= monthStart));
  const multiLine = lines.length > 1;
  const lock = locked && <span title="Available once your line is active" aria-label="Locked" style={{ marginLeft: 8, fontSize: "0.8em" }}>🔒</span>;

  const tabs = [
    { id: "calls", label: "Calls", locked },
    ...(isAdminView ? [] : [{ id: "documents", label: "Documents" }, { id: "settings", label: "Settings" }]),
  ];

  return page(
    <>
      {isAdminView && (
        <div style={{ background: `${C.blue}1a`, border: `1px solid ${C.blue}55`, color: C.sky, borderRadius: 12, padding: "10px 14px", fontSize: 13, marginBottom: 20 }}>
          Admin view: showing every business.
        </div>
      )}

      {locked && (
        <div role="status" style={{ background: `${C.yellow}14`, border: `1px solid ${C.yellow}55`, color: C.yellow, borderRadius: 12, padding: "11px 14px", fontSize: 13, fontWeight: 700, marginBottom: 18, display: "flex", gap: 10, alignItems: "center" }}>
          <span aria-hidden>🔒</span> Your line is being set up. We'll notify you when it's active.
        </div>
      )}

      {/* Onboarding sin terminar: lista de pasos */}
      {!isAdminView && !setupDone && (
        <div style={{ background: C.card, border: `1px solid ${C.blue}55`, borderRadius: 18, padding: "20px 20px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 16 }}>Finish setting up your account</div>
              <div style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>We need these details to set up your line.</div>
            </div>
            <button onClick={() => openSetup()} style={{ ...button("primary"), padding: "10px 18px", fontSize: 13 }}>Continue setup →</button>
          </div>
          <OnboardingChecklist data={setup.onboarding.data} docCount={setup.documents.length} onPick={openSetup} />
        </div>
      )}

      {/* Pestañas */}
      {tabs.length > 1 && (
        <div role="tablist" style={{ display: "flex", gap: 4, borderBottom: `1px solid ${C.border}`, marginBottom: 22, overflowX: "auto" }}>
          {tabs.map(t => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} style={{
              background: "none", border: "none", borderBottom: `2px solid ${tab === t.id ? C.blue : "transparent"}`, color: tab === t.id ? C.text : C.muted,
              padding: "10px 16px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
            }}>{t.label}{t.locked && " 🔒"}</button>
          ))}
        </div>
      )}

      {tab === "documents" && !isAdminView && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: "22px 20px", maxWidth: 760, margin: "0 auto" }}>
          <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 6 }}>Documents</div>
          <Documents documents={setup.documents} setDocuments={fn => updateSetup(s => ({ documents: typeof fn === "function" ? fn(s.documents) : fn }))} />
        </div>
      )}

      {tab === "settings" && !isAdminView && (
        <>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: "18px 20px", maxWidth: 760, margin: "0 auto 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>Account</div>
                <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>
                  Line status: <span style={{ color: locked ? C.yellow : C.green, fontWeight: 800 }}>{locked ? "Being set up 🔒" : "Active ✓"}</span>
                  {setup.onboarding.data?.plan && <> · {setup.onboarding.data.plan}</>}
                </div>
              </div>
              <button onClick={() => setShowSigned(true)} style={{ ...button("ghost"), padding: "9px 14px", fontSize: 13 }}>View signed agreement</button>
            </div>
          </div>
          {setupDone
            ? <OnboardingForm key="settings" initial={setup} onSaved={onSaved} onDocumentsChange={onDocumentsChange} />
            : <div style={{ color: C.muted, fontSize: 14, textAlign: "center" }}>Finish your setup above to edit it here.</div>}
        </>
      )}

      {tab === "calls" && (
        <>
          {/* Título + periodo */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 900 }}>Your calls{lock}</div>
              <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>
                {lines.length ? lines.map(l => `${l.business_name} · ${formatPhone(l.phone_number)}`).join("  |  ") : "Your phone line will show up here once it's connected."}
              </div>
            </div>
            <div style={{ display: "flex", background: C.cardDark, border: `1px solid ${C.border}`, borderRadius: 10, padding: 3, opacity: locked ? 0.5 : 1 }}>
              {PERIODS.map(p => (
                <button key={p.id} onClick={() => setPeriod(p.id)} disabled={locked} style={{
                  background: period === p.id ? C.blue : "transparent", color: period === p.id ? C.text : C.muted,
                  border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 700, cursor: locked ? "not-allowed" : "pointer", fontFamily: "inherit",
                }}>{p.label}</button>
              ))}
            </div>
          </div>

          {/* Estadísticas */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20, opacity: locked ? 0.55 : 1 }}>
            {[
              { label: "CALLS", value: inPeriod.length, color: C.text },
              { label: "ANSWERED", value: answered, color: C.green },
              { label: "VOICEMAIL", value: count(["voicemail"]), color: C.yellow },
              { label: "MISSED", value: count(["missed"]), color: C.red },
              { label: "MINUTES", value: minutesIn(inPeriod), color: C.text },
            ].map(s => (
              <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px" }}>
                <div style={{ color: C.muted, fontSize: 10, fontWeight: 800, letterSpacing: 1.2, marginBottom: 6 }}>{s.label}{locked && " 🔒"}</div>
                <div style={{ color: locked ? C.muted : s.color, fontSize: 26, fontWeight: 900 }}>{locked ? "—" : s.value}</div>
              </div>
            ))}
          </div>

          {/* Minutos incluidos del plan */}
          {included && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px", marginBottom: 20, opacity: locked ? 0.55 : 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", fontSize: 13, marginBottom: 10 }}>
                <span style={{ fontWeight: 800 }}>Minutes used this month{lock}</span>
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
              <div style={{ fontWeight: 800, fontSize: 15 }}>Call log{lock}</div>
              {!locked && (
                <div style={{ display: "flex", alignItems: "center", gap: 7, color: C.muted, fontSize: 11 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.green, display: "inline-block" }} />
                  LIVE{updatedAt && ` · updated ${updatedAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`}
                </div>
              )}
            </div>

            {locked ? (
              <div style={{ padding: "36px 18px", color: C.muted, fontSize: 14, textAlign: "center", lineHeight: 1.7 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
                Every call we handle for you will show up here once your line is active.
              </div>
            ) : inPeriod.length === 0 && (
              <div style={{ padding: "28px 18px", color: C.muted, fontSize: 14, textAlign: "center" }}>No calls in this period yet.</div>
            )}

            {!locked && inPeriod.map(call => {
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
    </>
  );
}
