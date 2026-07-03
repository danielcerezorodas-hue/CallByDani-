"use client";

import { useState } from "react";

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
  const [email, setEmail] = useState("");

  async function handleCheckout(planId) {
    if (!email) {
      alert("Please enter your email first");
      return;
    }
    setLoading(planId);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId, email }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Error: " + data.error);
      }
    } catch (err) {
      alert("Something went wrong");
    }
    setLoading(null);
  }

  return (
    <div style={{ background: "#0a1409", minHeight: "100vh", fontFamily: "sans-serif", padding: "60px 24px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontSize: 32, fontWeight: 900, color: "#f2ead8", marginBottom: 12 }}>
            Simple, honest pricing
          </div>
          <p style={{ color: "#5a7a5d", fontSize: 16, marginBottom: 28 }}>
            7-day free trial. No credit card required to start.
          </p>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Enter your email to get started"
            style={{
              width: "100%", maxWidth: 360, background: "#162318",
              border: "1px solid #1e3320", borderRadius: 10,
              color: "#f2ead8", padding: "12px 16px", fontSize: 14,
              outline: "none", fontFamily: "inherit", boxSizing: "border-box"
            }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
          {PLANS.map(plan => (
            <div key={plan.id} style={{
              background: plan.popular ? "#1f3a22" : "#162318",
              border: `2px solid ${plan.popular ? "#3d6b41" : "#1e3320"}`,
              borderRadius: 20, padding: "32px 24px", position: "relative",
              transform: plan.popular ? "scale(1.03)" : "none"
            }}>
              {plan.popular && (
                <div style={{ position: "absolute", top: 16, right: 16, background: "#c8a84b", color: "#0a1409", borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: 900 }}>
                  POPULAR
                </div>
              )}
              <div style={{ color: "#5a7a5d", fontSize: 11, fontWeight: 800, letterSpacing: 1.5, marginBottom: 8 }}>
                {plan.name.toUpperCase()}
              </div>
              <div style={{ fontSize: 42, fontWeight: 900, color: "#f2ead8", marginBottom: 4 }}>
                {plan.price}
              </div>
              <div style={{ color: "#5a7a5d", fontSize: 12, marginBottom: 16 }}>/month</div>
              <div style={{ color: "#8aaa8d", fontSize: 13, marginBottom: 24 }}>{plan.desc}</div>
              <div style={{ marginBottom: 28 }}>
                {plan.features.map((f, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    <span style={{ color: "#3d9e5f" }}>✓</span>
                    <span style={{ color: "#8aaa8d", fontSize: 13 }}>{f}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => handleCheckout(plan.id)}
                disabled={loading === plan.id}
                style={{
                  width: "100%", padding: "13px 0", borderRadius: 12,
                  background: plan.popular ? "linear-gradient(135deg, #3d9e5f, #c8a84b)" : "transparent",
                  color: plan.popular ? "#0a1409" : "#f2ead8",
                  border: plan.popular ? "none" : "1px solid #3d6b41",
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