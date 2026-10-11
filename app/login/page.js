"use client";

import { useState } from "react";
import { supabase } from "../supabase";

const C = {
  bg: "#0f1e30",
  card: "#1a2e4a",
  input: "#0f1e30",
  border: "#2c4868",
  text: "#ffffff",
  muted: "#94a3b8",
  blue: "#0ea5e9",
  sky: "#38bdf8",
  red: "#f87171",
};

const label = { color: C.muted, fontSize: 11, fontWeight: 800, letterSpacing: 1, marginBottom: 6 };
const input = {
  width: "100%", background: C.input, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text,
  padding: "12px 16px", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box",
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) return;
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Invalid email or password");
    } else {
      window.location.href = "/dashboard";
    }
    setLoading(false);
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", padding: "24px 16px", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "clamp(32px, 6vw, 48px) clamp(22px, 5vw, 40px)", width: "100%", maxWidth: 400, boxSizing: "border-box" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <a href="/" style={{ width: 44, height: 44, borderRadius: 11, background: C.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, margin: "0 auto 16px", textDecoration: "none" }}>☎</a>
          <div style={{ fontSize: 24, fontWeight: 900, color: C.text, marginBottom: 6 }}>Welcome back</div>
          <div style={{ color: C.muted, fontSize: 14 }}>Sign in to your CallByDani dashboard</div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={label}>EMAIL</div>
          <input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@company.com" style={input} />
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={label}>PASSWORD</div>
          <input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="••••••••" style={input} />
        </div>

        {error && <div style={{ color: C.red, fontSize: 13, marginBottom: 16, textAlign: "center" }}>⚠ {error}</div>}

        <button onClick={handleLogin} disabled={loading} style={{
          width: "100%", padding: "13px 0", background: `linear-gradient(135deg, ${C.blue}, ${C.sky})`,
          color: C.text, border: "none", borderRadius: 12, fontWeight: 900, fontSize: 15,
          cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit"
        }}>
          {loading ? "Signing in..." : "Sign In →"}
        </button>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <span style={{ color: C.muted, fontSize: 13 }}>Don't have an account? </span>
          <a href="/pricing" style={{ color: C.sky, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>Get started →</a>
        </div>
      </div>
    </div>
  );
}
