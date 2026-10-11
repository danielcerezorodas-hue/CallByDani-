"use client";

import { useState, useEffect } from "react";

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

export default function SuccessPage() {
  const [plan, setPlan] = useState("agents");

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("plan");
    if (p && MESSAGES[p]) setPlan(p);
  }, []);

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
        <a href="/dashboard" style={{
          display: "block", padding: "13px 0",
          background: "linear-gradient(135deg, #0ea5e9, #38bdf8)",
          color: "#ffffff", borderRadius: 12, fontWeight: 900,
          fontSize: 15, textDecoration: "none"
        }}>
          Go to My Dashboard →
        </a>
      </div>
    </div>
  );
}
