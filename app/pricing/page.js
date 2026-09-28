"use client";

import { useState } from "react";
import { saveLead, isValidEmail } from "../leads";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "$497",
    desc: "Perfect for small local businesses",
    features: ["100 calls/month", "1 dedicated agent", "AI call summaries", "Email notifications"],
  },
  {
    id: "business",
    name: "Business",
    price: "$897",
    desc: "Most popular for growing companies",
    features: ["300 calls/month", "2 dedicated agents", "AI Copilot", "WhatsApp summaries", "Priority support"],
    popular: true,
  },
  {
    id: "executive",
    name: "Executive",
    price: "$1,497",
    desc: "VIP assistant for executives & realtors",
    features: ["Unlimited calls", "Personal VIP agent", "Calendar management", "CRM sync", "Account manager"],
  },
];

export default function PricingPage() {
  const [loading, setLoading] = useState(null);
  const [emailSaved, setEmailSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");

  // Botón "Notify me": solo guarda el correo en Supabase
  async function handleNotify() {
    if (!isValidEmail(email)) {
      setEmailError("Please enter a valid email.");
      return;
    }
    setSaving(true);
    setEmailError("");
    const error = await saveLead({ email: email.trim().toLowerCase(), source: "pricing" });
    setSaving(false);
    if (error) {
      setEmailError("Something went wrong. Please try again.");
    } else {
      setEmailSaved(true);
    }
  }

  // Botones "Get Started" de cada plan: guarda el correo y manda a Stripe
  async function handleCheckout(planId) {
    if (!isValidEmail(email)) {
      setEmailError("Enter your email above first, then choose a plan.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setEmailError("");
    setLoading(planId);

    // Guardamos el prospecto, pero si falla no bloqueamos el pago
    await saveLead({ email: email.trim().toLowerCase(), plan: planId, source: "pricing-checkout" });

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId, email: email.trim() }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setEmailError("Checkout error: " + (data.error || "unknown"));
    } catch (err) {
      setEmailError("Something went wrong. Please try again.");
    }
    setLoading(null);
  }

  return (
    <div style={{ background: "#0f1e30", minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", padding: "60px 24px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontSize: 32, fontWeight: 900, color: "#ffffff", marginBottom: 12 }}>
            Simple, honest pricing
          </div>
          <p style={{ color: "#94a3b8", fontSize: 16, marginBottom: 28 }}>
            7-day free trial. No credit card required to start.
          </p>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleNotify()}
            placeholder="Enter your email to get started"
            style={{
              width: "100%", maxWidth: 360, background: "#1a2e4a",
              border: "1px solid #2c4868", borderRadius: 10,
              color: "#ffffff", padding: "12px 16px", fontSize: 14,
              outline: "none", fontFamily: "inherit", boxSizing: "border-box"
            }}
          />
          <button onClick={handleNotify} disabled={saving} style={{
            marginTop: 10, background: "transparent", color: "#0ea5e9",
            border: "1px solid #0ea5e940", borderRadius: 10, padding: "9px 20px",
            fontWeight: 700, fontSize: 13, cursor: saving ? "not-allowed" : "pointer",
            fontFamily: "inherit", width: "100%", maxWidth: 360
          }}>
            {saving ? "Saving..." : "Notify me →"}
          </button>
          {emailError && (
            <div style={{ color: "#e07070", fontSize: 13, marginTop: 8, fontWeight: 700 }}>
              ⚠ {emailError}
            </div>
          )}
          {emailSaved && (
            <div style={{ color: "#38bdf8", fontSize: 13, marginTop: 8, fontWeight: 700 }}>
              ✓ Got it! Select a plan below to get started.
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          {PLANS.map(plan => (
            <div key={plan.id} style={{
              background: plan.popular ? "#243d5c" : "#1a2e4a",
              border: `2px solid ${plan.popular ? "#0ea5e9" : "#2c4868"}`,
              borderRadius: 20, padding: "32px 24px", position: "relative",
              transform: plan.popular ? "scale(1.03)" : "none"
            }}>
              {plan.popular && (
                <div style={{ position: "absolute", top: 16, right: 16, background: "#0ea5e9", color: "#ffffff", borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: 900 }}>
                  POPULAR
                </div>
              )}
              <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 800, letterSpacing: 1.5, marginBottom: 8 }}>
                {plan.name.toUpperCase()}
              </div>
              <div style={{ fontSize: 42, fontWeight: 900, color: "#ffffff", marginBottom: 4 }}>
                {plan.price}
              </div>
              <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 16 }}>/month</div>
              <div style={{ color: "#cbd5e1", fontSize: 13, marginBottom: 24 }}>{plan.desc}</div>
              <div style={{ marginBottom: 28 }}>
                {plan.features.map((f, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    <span style={{ color: "#38bdf8" }}>✓</span>
                    <span style={{ color: "#cbd5e1", fontSize: 13 }}>{f}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => handleCheckout(plan.id)}
                disabled={loading === plan.id}
                style={{
                  width: "100%", padding: "13px 0", borderRadius: 12,
                  background: plan.popular ? "linear-gradient(135deg, #0ea5e9, #38bdf8)" : "transparent",
                  color: plan.popular ? "#0f1e30" : "#ffffff",
                  border: plan.popular ? "none" : "1px solid #0ea5e9",
                  fontWeight: 900, fontSize: 14, cursor: "pointer", fontFamily: "inherit"
                }}
              >
                {loading === plan.id ? "Loading..." : "Get Started →"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 
