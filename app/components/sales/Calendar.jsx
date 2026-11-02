"use client";

import { useState, useEffect } from "react";
import { EVENT_TYPE, STAGE, isOverdue, startOfDay, addDays, sameDay, startOfWeek, fmtTime, fmtDate } from "./constants";

// Paleta: clara (panel de agentes) u oscura (dashboard del cliente)
export const THEMES = {
  light: { bg: "#f8f7f4", surface: "#ffffff", border: "#e8e4df", text: "#1a1a2e", muted: "#6b7280", light: "#9ca3af", accent: "#1a56db", accentDim: "#eff4ff", red: "#e02424", redDim: "#fff5f5", today: "#eff4ff" },
  dark: { bg: "#0f1e30", surface: "#1a2e4a", border: "#2c4868", text: "#ffffff", muted: "#94a3b8", light: "#64748b", accent: "#38bdf8", accentDim: "#0ea5e926", red: "#f87171", redDim: "#f8717122", today: "#0ea5e914" },
};

const VIEWS = [{ id: "today", label: "Today" }, { id: "week", label: "Week" }, { id: "month", label: "Month" }];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Calendario con vistas Mes / Semana / Hoy.
// events: [{ id, starts_at, type, status, prospect_id, agent_email }]
// prospects: { [id]: { business_name, stage } } · onOpen(event) al hacer clic · showAgent: muestra el agente
export default function Calendar({ events, prospects = {}, theme = "light", onOpen, showAgent = false, initialView = "week" }) {
  const T = THEMES[theme];
  const [view, setView] = useState(initialView);
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(id); }, []);

  const sorted = [...events].sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
  const onDay = day => sorted.filter(e => sameDay(e.starts_at, day));

  function move(dir) {
    if (view === "today") setCursor(c => addDays(c, dir));
    else if (view === "week") setCursor(c => addDays(c, dir * 7));
    else setCursor(c => new Date(c.getFullYear(), c.getMonth() + dir, 1));
  }

  const title = view === "month"
    ? cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : view === "week"
      ? `${fmtDate(startOfWeek(cursor))} – ${fmtDate(addDays(startOfWeek(cursor), 6))}`
      : cursor.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const overdue = sorted.filter(e => isOverdue(e, now));

  const chip = (ev, compact = false) => {
    const t = EVENT_TYPE[ev.type] || { icon: "•", label: ev.type };
    const late = isOverdue(ev, now);
    const done = ev.status === "done";
    const p = prospects[ev.prospect_id];
    return (
      <button onClick={() => onOpen?.(ev)} title={`${t.label} · ${p?.business_name || ""}`} style={{
        display: "block", width: "100%", textAlign: "left", cursor: onOpen ? "pointer" : "default", fontFamily: "inherit",
        background: late ? T.redDim : done ? "transparent" : T.accentDim, color: late ? T.red : done ? T.light : T.text,
        border: `1px solid ${late ? T.red : done ? T.border : "transparent"}`, borderRadius: 8,
        padding: compact ? "2px 5px" : "8px 10px", marginBottom: 4, fontSize: compact ? 11 : 13,
        textDecoration: done ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        <span style={{ fontWeight: 700 }}>{fmtTime(ev.starts_at)}</span> {t.icon} {compact ? (p?.business_name || t.label) : (
          <>
            <b>{t.label}</b> · {p?.business_name || "Prospect"}
            {p?.stage && STAGE[p.stage] && <span style={{ color: T.muted }}> · {STAGE[p.stage].label}</span>}
            {showAgent && ev.agent_email && <span style={{ color: T.muted }}> · {ev.agent_email}</span>}
            {late && <span style={{ fontWeight: 800 }}> · OVERDUE</span>}
          </>
        )}
      </button>
    );
  };

  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden", color: T.text }}>
      {/* Barra superior */}
      <div style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4 }}>
          <button aria-label="Previous" onClick={() => move(-1)} style={navBtn(T)}>‹</button>
          <button onClick={() => setCursor(startOfDay(new Date()))} style={{ ...navBtn(T), width: "auto", padding: "0 10px", fontSize: 12 }}>Today</button>
          <button aria-label="Next" onClick={() => move(1)} style={navBtn(T)}>›</button>
        </div>
        <div style={{ fontWeight: 800, fontSize: 15, flex: 1, minWidth: 140 }}>{title}</div>
        <div role="tablist" style={{ display: "flex", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: 3 }}>
          {VIEWS.map(v => (
            <button key={v.id} role="tab" aria-selected={view === v.id} onClick={() => setView(v.id)} style={{
              background: view === v.id ? T.accent : "transparent", color: view === v.id ? "#fff" : T.muted, border: "none", borderRadius: 7,
              padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}>{v.label}</button>
          ))}
        </div>
      </div>

      {overdue.length > 0 && (
        <div style={{ background: T.redDim, color: T.red, fontSize: 12, fontWeight: 700, padding: "8px 14px", borderBottom: `1px solid ${T.border}` }}>
          ⚠ {overdue.length} overdue {overdue.length === 1 ? "event" : "events"}
        </div>
      )}

      {view === "today" && (
        <div style={{ padding: 14 }}>
          {onDay(cursor).length === 0 && <div style={{ color: T.muted, fontSize: 13, padding: "20px 0", textAlign: "center" }}>Nothing scheduled.</div>}
          {onDay(cursor).map(ev => <div key={ev.id}>{chip(ev)}</div>)}
          {sameDay(cursor, new Date()) && overdue.filter(e => !sameDay(e.starts_at, cursor)).length > 0 && (
            <>
              <div style={{ color: T.red, fontSize: 11, fontWeight: 800, letterSpacing: 1, margin: "16px 0 8px" }}>OVERDUE FROM EARLIER</div>
              {overdue.filter(e => !sameDay(e.starts_at, cursor)).map(ev => <div key={ev.id}>{chip(ev)}</div>)}
            </>
          )}
        </div>
      )}

      {view === "week" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
          {Array.from({ length: 7 }).map((_, i) => {
            const day = addDays(startOfWeek(cursor), i);
            const isToday = sameDay(day, new Date());
            return (
              <div key={i} style={{ borderRight: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`, padding: 8, minHeight: 120, background: isToday ? T.today : "transparent" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: isToday ? T.accent : T.muted, marginBottom: 6 }}>
                  {WEEKDAYS[day.getDay()]} {day.getDate()}
                </div>
                {onDay(day).map(ev => <div key={ev.id}>{chip(ev, true)}</div>)}
              </div>
            );
          })}
        </div>
      )}

      {view === "month" && (() => {
        const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
        const start = startOfWeek(first);
        return (
          <div style={{ overflowX: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(44px, 1fr))", minWidth: 320 }}>
              {WEEKDAYS.map(d => <div key={d} style={{ fontSize: 10, fontWeight: 800, color: T.muted, padding: "6px 4px", textAlign: "center", borderBottom: `1px solid ${T.border}` }}>{d}</div>)}
              {Array.from({ length: 42 }).map((_, i) => {
                const day = addDays(start, i);
                const inMonth = day.getMonth() === cursor.getMonth();
                const list = onDay(day);
                const isToday = sameDay(day, new Date());
                const late = list.some(e => isOverdue(e, now));
                return (
                  <button key={i} onClick={() => { setCursor(startOfDay(day)); setView("today"); }} style={{
                    textAlign: "left", fontFamily: "inherit", cursor: "pointer", minHeight: 64, padding: 4, border: "none",
                    borderRight: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`, color: T.text,
                    background: isToday ? T.today : "transparent", opacity: inMonth ? 1 : 0.4,
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: isToday ? T.accent : T.muted }}>{day.getDate()}</div>
                    {list.slice(0, 2).map(ev => (
                      <div key={ev.id} style={{ fontSize: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: isOverdue(ev, now) ? T.red : T.text }}>
                        {(EVENT_TYPE[ev.type] || {}).icon} {fmtTime(ev.starts_at)}
                      </div>
                    ))}
                    {list.length > 2 && <div style={{ fontSize: 10, color: late ? T.red : T.muted, fontWeight: 700 }}>+{list.length - 2} more</div>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function navBtn(T) {
  return { width: 30, height: 30, borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, color: T.text, cursor: "pointer", fontFamily: "inherit", fontSize: 16 };
}
