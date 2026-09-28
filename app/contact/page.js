"use client";

import { useState, useEffect } from "react";
import { saveLead, isValidEmail } from "../leads";

const BUSINESS_TYPES = [
  "Auto Dealer",
  "Plumbing / HVAC",
  "Law Firm",
  "Real Estate",
  "Medical / Dental",
  "Restaurant",
  "Executive / CEO",
  "E-commerce",
  "Construction",
  "Insurance",
  "Other"
];

export default function ContactPage() {
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    company: "", businessType: "", calls: "", plan: "", message: ""
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Si viene de la página de pricing (/contact?agents=3), guardamos cuántos agentes eligió
  useEffect(() => {
    const agents = Number.parseInt(new URLSearchParams(window.location.search).get("agents"), 10);
    if (agents >= 1 && agents <= 20) {
      setForm(p => ({ ...p, plan: `${agents} agent${agents === 1 ? "" : "s"}` }));
    }
  }, []);

  function update(key, value) {
    setForm(p => ({ ...p, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.firstName || !form.email || !form.businessType) {
      setError("Please fill in the required fields.");
      return;
    }
    if (!isValidEmail(form.email)) {
      setError("Please enter a valid email.");
      return;
    }
    setLoading(true);
    setError("");
    const error = await saveLead({
      email: form.email.trim().toLowerCase(),
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim(),
      phone: form.phone.trim(),
      company: form.company.trim(),
      sector: form.businessType,
      monthly_calls: form.calls.trim(),
      plan: form.plan,
      message: form.message.trim(),
      source: "contact",
    });
    if (error) {
      setError("Something went wrong. Please try again.");
    } else {
      setSubmitted(true);
    }
    setLoading(false);
  }

  if (submitted) return (
    <div style={{ background: "#0f1e30", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ background: "#1a2e4a", border: "1px solid #0ea5e9", borderRadius: 20, padding: "48px 40px", textAlign: "center", maxWidth: 480 }}>
        <div style={{ fontSize: 60, marginBottom: 20 }}>🎉</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: "#ffffff", marginBottom: 12 }}>We'll be in touch!</div>
        <div style={{ color: "#cbd5e1", fontSize: 15, lineHeight: 1.7, marginBottom: 28 }}>
          Thank you {form.firstName}. One of our team members will contact you within 24 hours to get you started.
        </div>
        <a href="/" style={{ display: "block", padding: "13px 0", background: "linear-gradient(135deg, #0ea5e9, #38bdf8)", color: "#ffffff", borderRadius: 12, fontWeight: 900, fontSize: 15, textDecoration: "none" }}>
          Back to Home →
        </a>
      </div>
    </div>
  );

  return (
    <div style={{ background: "#0f1e30", minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", color: "#ffffff", padding: "60px 24px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", marginBottom: 32 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #0ea5e9, #38bdf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>☎</div>
            <span style={{ fontWeight: 900, fontSize: 17, color: "#ffffff" }}>CallByDani</span>
          </a>
          <h1 style={{ fontSize: 36, fontWeight: 900, color: "#ffffff", marginBottom: 12, lineHeight: 1.2 }}>
            Let's get you started
          </h1>
          <p style={{ color: "#94a3b8", fontSize: 15 }}>Fill out the form and we'll contact you within 24 hours.</p>
        </div>

        <div style={{ background: "#1a2e4a", border: "1px solid #2c4868", borderRadius: 20, padding: "40px 36px" }}>
          {/* Name */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 18 }}>
            {[["First Name *", "firstName", "John"], ["Last Name", "lastName", "Smith"]].map(([label, key, ph]) => (
              <div key={key}>
                <div style={{ color: "#cbd5e1", fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>{label.toUpperCase()}</div>
                <input value={form[key]} onChange={e => update(key, e.target.value)} placeholder={ph}
                  style={{ width: "100%", background: "#0f1e30", border: "1px solid #2c4868", borderRadius: 10, color: "#ffffff", padding: "12px 14px", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
              </div>
            ))}
          </div>

          {/* Email & Phone */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 18 }}>
            {[["Email *", "email", "john@company.com", "email"], ["Phone", "phone", "+1 (832) 000-0000", "tel"]].map(([label, key, ph, type]) => (
              <div key={key}>
                <div style={{ color: "#cbd5e1", fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>{label.toUpperCase()}</div>
                <input type={type} value={form[key]} onChange={e => update(key, e.target.value)} placeholder={ph}
                  style={{ width: "100%", background: "#0f1e30", border: "1px solid #2c4868", borderRadius: 10, color: "#ffffff", padding: "12px 14px", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
              </div>
            ))}
          </div>

          {/* Company */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ color: "#cbd5e1", fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>COMPANY NAME</div>
            <input value={form.company} onChange={e => update("company", e.target.value)} placeholder="ABC Plumbing Co."
              style={{ width: "100%", background: "#0f1e30", border: "1px solid #2c4868", borderRadius: 10, color: "#ffffff", padding: "12px 14px", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
          </div>

          {/* Business Type */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ color: "#cbd5e1", fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>BUSINESS TYPE *</div>
            <select value={form.businessType} onChange={e => update("businessType", e.target.value)}
              style={{ width: "100%", background: "#0f1e30", border: "1px solid #2c4868", borderRadius: 10, color: form.businessType ? "#ffffff" : "#94a3b8", padding: "12px 14px", fontSize: 14, outline: "none", fontFamily: "inherit", appearance: "none" }}>
              <option value="">Select your industry...</option>
              {BUSINESS_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

         <div style={{ marginBottom: 18 }}>
  <div style={{ color: "#cbd5e1", fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>MONTHLY CALLS (APPROX.)</div>
  <input value={form.calls} onChange={e => update("calls", e.target.value)} placeholder="e.g. 150"
    style={{ width: "100%", background: "#0f1e30", border: "1px solid #2c4868", borderRadius: 10, color: "#ffffff", padding: "12px 14px", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
</div>

          {/* Message */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ color: "#cbd5e1", fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>MESSAGE (OPTIONAL)</div>
            <textarea value={form.message} onChange={e => update("message", e.target.value)}
              placeholder="Tell us anything else about your business needs..."
              style={{ width: "100%", background: "#0f1e30", border: "1px solid #2c4868", borderRadius: 10, color: "#ffffff", padding: "12px 14px", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box", minHeight: 80, resize: "vertical", lineHeight: 1.6 }} />
          </div>

          {form.plan && (
            <div style={{ background: "#0ea5e915", border: "1px solid #0ea5e940", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#ffffff", fontSize: 13 }}>
              Selected: <strong>{form.plan}</strong> · <a href="/pricing" style={{ color: "#38bdf8" }}>change</a>
            </div>
          )}

          {error && <div style={{ color: "#c05050", fontSize: 13, marginBottom: 16 }}>⚠ {error}</div>}

          <button onClick={handleSubmit} disabled={loading} style={{
            width: "100%", padding: "14px 0", background: "linear-gradient(135deg, #0ea5e9, #38bdf8)",
            color: "#ffffff", border: "none", borderRadius: 12, fontWeight: 900, fontSize: 15,
            cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit"
          }}>
            {loading ? "Sending..." : "Get Started — We'll Contact You →"}
          </button>

          <div style={{ textAlign: "center", marginTop: 16, color: "#94a3b8", fontSize: 12 }}>
            No commitment required · We'll reach out within 24 hours
          </div>
        </div>
      </div>
    </div>
  );
}