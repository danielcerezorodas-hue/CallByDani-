"use client";

import { useState, useEffect } from "react";
import { supabase } from "../supabase";

// Mensaje según el plan que se contrató (viene en ?plan=... desde Stripe)
const MESSAGES = {
  ai_receptionist: {
    icon: "🤖",
    title: "Your AI Receptionist is on its way!",
    text: "Your subscription is active. We're setting up your AI receptionist to answer your calls 24/7 in English and Spanish, capture every lead and send you a summary of each call.",
    note: "600 minutes included every month",
    steps: [
      "Upload your company documents (prices, hours, FAQ)",
      "Tell us how you'd like your calls greeted",
      "Forward your phone number to us",
    ],
  },
  agents: {
    icon: "🎉",
    title: "Welcome to CallByDani!",
    text: "Your subscription is active. Your dedicated bilingual agents are being briefed on your business right now.",
    steps: ["Upload your company documents", "Set your business hours", "Forward your phone number to us"],
  },
};

const input = {
  width: "100%", background: "#0f1e30", border: "1px solid #2c4868", borderRadius: 10, color: "#ffffff",
  padding: "12px 14px", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box",
};

const signInBtn = {
  display: "block", padding: "13px 0", background: "linear-gradient(135deg, #0ea5e9, #38bdf8)",
  color: "#ffffff", borderRadius: 12, fontWeight: 900, fontSize: 15, textDecoration: "none",
};

export default function SuccessPage() {
  const [plan, setPlan] = useState("agents");
  const [sessionId, setSessionId] = useState("");
  // Cuenta: checking | create | exists | missing | error
  const [account, setAccount] = useState("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const p = q.get("plan");
    if (p && MESSAGES[p]) setPlan(p);
    const sid = q.get("session_id") || "";
    setSessionId(sid);
    if (!sid) { setAccount("missing"); return; }
    fetch(`/api/account?session_id=${encodeURIComponent(sid)}`)
      .then(async r => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) { setError(d.error || "Could not verify your payment"); setAccount("error"); return; }
        setEmail(d.email);
        setAccount(d.hasAccount ? "exists" : "create");
      })
      .catch(() => { setError("Could not verify your payment"); setAccount("error"); });
  }, []);

  async function createAccount() {
    setError("");
    if (password.length < 8) return setError("Password must be at least 8 characters");
    if (password !== confirm) return setError("Passwords don't match");
    setSaving(true);
    try {
      const r = await fetch("/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, password }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 409) setAccount("exists");
        throw new Error(d.error || "Could not create your account");
      }
      const { error: e } = await supabase.auth.signInWithPassword({ email, password });
      if (e) throw new Error("Account created. Please sign in.");
      window.location.href = "/dashboard";
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }

  const m = MESSAGES[plan];

  return (
    <div style={{
      background: "#0f1e30", minHeight: "100vh", padding: "24px 16px", boxSizing: "border-box",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans', sans-serif"
    }}>
      <div style={{
        background: "#1a2e4a", border: "1px solid #0ea5e9", boxSizing: "border-box",
        borderRadius: 20, padding: "clamp(32px, 6vw, 48px) clamp(22px, 5vw, 40px)", textAlign: "center", maxWidth: 480, width: "100%"
      }}>
        <div style={{ fontSize: 60, marginBottom: 20 }}>{m.icon}</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: "#ffffff", marginBottom: 12, lineHeight: 1.2 }}>
          {m.title}
        </div>
        <div style={{ color: "#cbd5e1", fontSize: 15, lineHeight: 1.7, marginBottom: m.note ? 16 : 32 }}>
          {m.text}
        </div>
        {m.note && (
          <div style={{ display: "inline-block", background: "#0ea5e922", color: "#38bdf8", borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 800, marginBottom: 28 }}>
            {m.note}
          </div>
        )}
        <div style={{ background: "#0f1e30", border: "1px solid #2c4868", borderRadius: 12, padding: 20, marginBottom: 28 }}>
          <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 800, letterSpacing: 1, marginBottom: 8 }}>NEXT STEPS</div>
          {m.steps.map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 12, marginBottom: 10, textAlign: "left" }}>
              <span style={{ color: "#0ea5e9", fontWeight: 900 }}>{i + 1}.</span>
              <span style={{ color: "#cbd5e1", fontSize: 13 }}>{step}</span>
            </div>
          ))}
        </div>
        {account === "checking" && <div style={{ color: "#94a3b8", fontSize: 14 }}>Verifying your payment...</div>}

        {account === "create" && (
          <div style={{ textAlign: "left" }}>
            <div style={{ color: "#ffffff", fontSize: 17, fontWeight: 800, marginBottom: 4, textAlign: "center" }}>Create your account</div>
            <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 16, textAlign: "center" }}>to access your dashboard</div>
            <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 800, letterSpacing: 1, marginBottom: 6 }}>EMAIL</div>
            <input value={email} readOnly style={{ ...input, color: "#94a3b8", marginBottom: 12 }} />
            <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 800, letterSpacing: 1, marginBottom: 6 }}>PASSWORD</div>
            <input type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="At least 8 characters" style={{ ...input, marginBottom: 12 }} />
            <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 800, letterSpacing: 1, marginBottom: 6 }}>CONFIRM PASSWORD</div>
            <input type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)}
              onKeyDown={e => e.key === "Enter" && createAccount()} style={{ ...input, marginBottom: 16 }} />
            <button onClick={createAccount} disabled={saving} style={{
              width: "100%", padding: "13px 0", border: "none", cursor: saving ? "not-allowed" : "pointer",
              background: "linear-gradient(135deg, #0ea5e9, #38bdf8)", color: "#ffffff", borderRadius: 12,
              fontWeight: 900, fontSize: 15, fontFamily: "inherit",
            }}>
              {saving ? "Creating account..." : "Create account & go to dashboard →"}
            </button>
          </div>
        )}

        {account === "exists" && (
          <div>
            <div style={{ color: "#cbd5e1", fontSize: 14, marginBottom: 14 }}>
              You already have an account{email ? <> with <strong>{email}</strong></> : ""}. Sign in to see your dashboard.
            </div>
            <a href="/login" style={signInBtn}>Sign in →</a>
          </div>
        )}

        {(account === "missing" || account === "error") && (
          <div>
            <div style={{ color: "#cbd5e1", fontSize: 14, marginBottom: 14 }}>
              If you already created your account, sign in. Otherwise, contact us and we'll set it up for you.
            </div>
            <a href="/login" style={signInBtn}>Sign in →</a>
          </div>
        )}

        {error && <div style={{ color: "#f87171", fontSize: 13, marginTop: 12 }}>⚠ {error}</div>}
      </div>
    </div>
  );
}
