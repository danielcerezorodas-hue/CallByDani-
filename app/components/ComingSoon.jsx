"use client";

import { useState, useEffect } from "react";
import { LAUNCH_AT } from "../launch";
import { saveLead, isValidEmail } from "../leads";

const C = {
  navyDark: "#0f1e30",
  navy: "#1a2e4a",
  border: "#2c4868",
  blue: "#0ea5e9",
  sky: "#38bdf8",
  white: "#ffffff",
  soft: "#cbd5e1",
  muted: "#94a3b8",
  green: "#22c55e",
  red: "#f87171",
};

const LAUNCH_MS = new Date(LAUNCH_AT).getTime();

function remaining(now) {
  const s = Math.max(0, Math.floor((LAUNCH_MS - now) / 1000));
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60, done: s === 0 };
}

// Pantalla de "Coming soon" con la cuenta regresiva hasta la apertura.
// Cuando llega a cero, recarga la página y ya se ve la landing normal.
export default function ComingSoon() {
  const [now, setNow] = useState(null); // null hasta montar, para no desajustar el HTML del servidor
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle"); // idle | saving | saved | error
  const [error, setError] = useState("");

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const t = now === null ? null : remaining(now);
  useEffect(() => {
    if (t?.done) setTimeout(() => window.location.reload(), 1500);
  }, [t?.done]);

  async function notifyMe(e) {
    e.preventDefault();
    if (!isValidEmail(email)) { setError("Please enter a valid email."); return; }
    setState("saving"); setError("");
    const err = await saveLead({ email: email.trim().toLowerCase(), source: "coming_soon" });
    if (err) { setState("error"); setError("Something went wrong. Please try again."); }
    else setState("saved");
  }

  const units = [["days", "Days"], ["hours", "Hours"], ["minutes", "Minutes"], ["seconds", "Seconds"]];

  return (
    <main style={{ minHeight: "100vh", background: `radial-gradient(circle at 50% 0%, ${C.navy} 0%, ${C.navyDark} 60%)`, color: C.white, fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 16px", boxSizing: "border-box", textAlign: "center" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@400;600;700;800;900&display=swap" rel="stylesheet" />

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 36 }}>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: C.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>☎</div>
        <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: 24 }}>CallByDani</span>
      </div>

      <div style={{ color: C.sky, fontSize: 12, fontWeight: 800, letterSpacing: 2.5, marginBottom: 14 }}>OPENING SOON</div>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(32px, 6vw, 56px)", fontWeight: 900, lineHeight: 1.1, margin: "0 0 16px", maxWidth: 760 }}>
        Never miss a call <span style={{ fontStyle: "italic", color: C.sky }}>again</span>
      </h1>
      <p style={{ color: C.soft, fontSize: 17, lineHeight: 1.6, maxWidth: 560, margin: "0 0 36px" }}>
        Real bilingual agents answering your business calls in English and Spanish. We officially open on October 24.
      </p>

      {/* Cuenta regresiva */}
      <div role="timer" aria-live="off" aria-label="Time until launch" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10, width: "100%", maxWidth: 520, marginBottom: 40 }}>
        {units.map(([key, label]) => (
          <div key={key} style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`, borderRadius: 16, padding: "18px 4px" }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(30px, 8vw, 48px)", fontWeight: 900, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
              {t ? String(t[key]).padStart(2, "0") : "--"}
            </div>
            <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, marginTop: 8, textTransform: "uppercase" }}>{label}</div>
          </div>
        ))}
      </div>

      {t?.done ? (
        <div style={{ color: C.green, fontWeight: 800 }}>We're open! Loading...</div>
      ) : state === "saved" ? (
        <div style={{ background: "rgba(34,197,94,0.12)", border: `1px solid ${C.green}66`, color: C.green, borderRadius: 12, padding: "14px 22px", fontWeight: 800 }}>
          ✓ You're on the list. We'll email you when we open.
        </div>
      ) : (
        <form onSubmit={notifyMe} style={{ width: "100%", maxWidth: 460 }}>
          <div style={{ color: C.soft, fontSize: 14, marginBottom: 12 }}>Get notified when we open, plus your first week free with training included.</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@business.com" aria-label="Email" autoComplete="email" style={{
              flex: "1 1 220px", minWidth: 0, background: C.navyDark, border: `1px solid ${C.border}`, borderRadius: 12, color: C.white,
              padding: "14px 16px", fontSize: 15, outline: "none", fontFamily: "inherit",
            }} />
            <button type="submit" disabled={state === "saving"} style={{
              flex: "0 0 auto", background: C.blue, color: C.white, border: "none", borderRadius: 12, padding: "14px 22px",
              fontWeight: 900, fontSize: 15, cursor: state === "saving" ? "not-allowed" : "pointer", fontFamily: "inherit",
            }}>{state === "saving" ? "Saving..." : "Notify me"}</button>
          </div>
          {error && <div style={{ color: C.red, fontSize: 13, marginTop: 10 }}>⚠ {error}</div>}
        </form>
      )}

      <div style={{ marginTop: 48, color: C.muted, fontSize: 13 }}>
        Already a client? <a href="/login" style={{ color: C.sky, fontWeight: 700 }}>Sign in to your dashboard</a>
      </div>
    </main>
  );
}
