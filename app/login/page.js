"use client";

import { useState } from "react";
import { supabase } from "../supabase";

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
    <div style={{ background: "#0a1409", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
      <div style={{ background: "#162318", border: "1px solid #1e3320", borderRadius: 20, padding: "48px 40px", width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 44, height: 44, borderRadius: 11, background: "linear-gradient(135deg, #3d9e5f, #c8a84b)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, margin: "0 auto 16px" }}>☎</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#f2ead8", marginBottom: 6 }}>Welcome back</div>
          <div style={{ color: "#5a7a5d", fontSize: 14 }}>Sign in to your CallByDani dashboard</div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ color: "#8aaa8d", fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>EMAIL</div>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@company.com"
            style={{ width: "100%", background: "#0f1d0e", border: "1px solid #1e3320", borderRadius: 10, color: "#f2ead8", padding: "12px 16px", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ color: "#8aaa8d", fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>PASSWORD</div>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="••••••••"
            style={{ width: "100%", background: "#0f1d0e", border: "1px solid #1e3320", borderRadius: 10, color: "#f2ead8", padding: "12px 16px", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
        </div>

        {error && <div style={{ color: "#c05050", fontSize: 13, marginBottom: 16, textAlign: "center" }}>⚠ {error}</div>}

        <button onClick={handleLogin} disabled={loading} style={{
          width: "100%", padding: "13px 0", background: "linear-gradient(135deg, #3d9e5f, #c8a84b)",
          color: "#0a1409", border: "none", borderRadius: 12, fontWeight: 900, fontSize: 15,
          cursor: "pointer", fontFamily: "inherit"
        }}>
          {loading ? "Signing in..." : "Sign In →"}
        </button>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <span style={{ color: "#5a7a5d", fontSize: 13 }}>Don't have an account? </span>
          <a href="/pricing" style={{ color: "#c8a84b", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>Get started →</a>
        </div>
      </div>
    </div>
  );
}