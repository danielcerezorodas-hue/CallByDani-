"use client";

import { useState } from "react";
import { saveLead, isValidEmail } from "../leads";

const C = {
  navy: "#1a2e4a",
  navyDark: "#0f1e30",
  navyLight: "#243d5c",
  blue: "#0ea5e9",
  sky: "#38bdf8",
  white: "#ffffff",
  offWhite: "#f8fafc",
  border: "#e2e8f0",
  text: "#1e293b",
  muted: "#64748b",
  light: "#94a3b8",
  green: "#22c55e",
};

// Precio por agente según cuántos agentes contrata el cliente.
// Si cambias estos precios, cámbialos también en Stripe.
const TIERS = [
    { min: 1, max: 1, price: 1997, label: "1 agent", note: "Perfect to get started" },
  { min: 2, max: 3, price: 1697, label: "2–3 agents", note: "Save $300 per agent", popular: true },
  { min: 4, max: Infinity, price: 1550, label: "4+ agents", note: "Save $447 per agent · Extended coverage" },
];

const HOURS_PER_AGENT = 40; // 8 horas x 5 días
const MAX_AGENTS = 20;
const HOURS_PER_MONTH = (HOURS_PER_AGENT * 52) / 12; // ~173 horas al mes

function priceFor(agents) {
  return TIERS.find(t => agents >= t.min && agents <= t.max).price;
}

function money(n) {
  return "$" + n.toLocaleString("en-US");
}

// Precio por hora de un agente (precio mensual ÷ ~173 horas)
function hourly(price) {
  return "$" + (price / HOURS_PER_MONTH).toFixed(2);
}

const INCLUDED = [
  { icon: "📞", title: "Unlimited calls", desc: "Every call during your agent's shift. No per-minute charges, no surprises." },
  { icon: "💰", title: "Sales", desc: "Your agent sells your products and services, not just takes messages." },
  { icon: "📅", title: "Appointments & calendar", desc: "Books, confirms and reschedules directly on your calendar." },
  { icon: "🎯", title: "Lead generation", desc: "Captures and qualifies every caller so no opportunity slips away." },
  { icon: "🌎", title: "Bilingual EN/ES", desc: "Your customers are served in the language they're most comfortable with." },
  { icon: "🤖", title: "AI copilot", desc: "Trained on your prices, policies and services to give the right answer every time." },
  { icon: "🎙️", title: "Call recordings", desc: "Every call recorded so you can review quality anytime." },
  { icon: "📋", title: "Instant summaries", desc: "A summary of every call sent to your email or WhatsApp." },
];

const FAQ = [
  {
    q: "What does \"unlimited calls\" mean?",
    a: "Your agent answers every call that comes in during their shift (8 hours a day, Monday to Friday). You pay a flat monthly price per agent — never per call or per minute.",
  },
  {
    q: "Why is it cheaper with more agents?",
    a: "The more agents you have, the more efficiently we can train and supervise your team, so we pass the savings on to you. With 5 or more agents you can have coverage 24 hours a day, 7 days a week.",
  },
  {
    q: "Is my agent a real person?",
    a: "Yes. Your agent is a real, bilingual person dedicated to your business, supported by an AI copilot that knows your business inside and out.",
  },
  {
    q: "How does the free week work?",
    a: "Your first 7 days are free with no obligation to continue. We use that week to train your agent on your business. If you decide to stay, you pay a one-time setup fee plus your first month.",
  },
  {
    q: "Can I add more agents later?",
    a: "Yes. Start with one agent and add more whenever your call volume grows. Your price per agent drops automatically when you reach the next tier.",
  },
];

export default function PricingPage() {
  const [agents, setAgents] = useState(1);
  const [loading, setLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [openFaq, setOpenFaq] = useState(null);

  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [emailSaved, setEmailSaved] = useState(false);
  const [emailError, setEmailError] = useState("");

  const perAgent = priceFor(agents);
  const total = perAgent * agents;
  const savings = (TIERS[0].price - perAgent) * agents;
  const weeklyHours = agents * HOURS_PER_AGENT;

  function changeAgents(delta) {
    setAgents(a => Math.min(MAX_AGENTS, Math.max(1, a + delta)));
  }

  // "Start my free week": manda al formulario de contacto con el número de agentes
  function startTrial() {
    window.location.href = `/contact?agents=${agents}`;
  }

  // "Subscribe now": manda a Stripe con la cantidad de agentes
  async function subscribeNow() {
    setLoading(true);
    setCheckoutError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agents }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setCheckoutError("Checkout error: " + (data.error || "unknown"));
    } catch (err) {
      setCheckoutError("Something went wrong. Please try again.");
    }
    setLoading(false);
  }

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

  const eyebrow = { color: C.blue, fontSize: 11, fontWeight: 800, letterSpacing: 2, marginBottom: 12 };
  const h2 = { fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 900, lineHeight: 1.15 };
  const stepBtn = {
    width: 44, height: 44, borderRadius: 12, border: `1px solid ${C.border}`, background: C.white,
    color: C.navy, fontSize: 22, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
  };

  return (
    <div style={{ background: C.white, fontFamily: "'DM Sans', sans-serif", color: C.text, overflowX: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; }`}</style>

      {/* TOP BAR */}
      <nav style={{ background: C.navyDark, padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: C.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>☎</div>
          <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: 20, color: C.white }}>CallByDani</span>
        </a>
        <a href="/contact" style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>Talk to Sales</a>
      </nav>

      {/* HEADER */}
      <section style={{ background: `linear-gradient(160deg, ${C.navyDark} 0%, ${C.navyLight} 100%)`, padding: "72px 24px 96px", textAlign: "center" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ ...eyebrow, color: C.sky }}>PRICING</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(34px, 5.5vw, 56px)", fontWeight: 900, color: C.white, lineHeight: 1.1, marginBottom: 20 }}>
            One price per agent.<br /><span style={{ fontStyle: "italic", color: C.sky }}>Unlimited calls.</span>
          </h1>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "clamp(15px, 2vw, 18px)", lineHeight: 1.7 }}>
            A dedicated bilingual agent working for your business 8 hours a day, Monday to Friday.
            No per-minute fees. The more agents you add, the less you pay per agent.
          </p>
        </div>
      </section>

      {/* TIERS */}
      <section style={{ padding: "0 24px", marginTop: -56 }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
          {TIERS.map((t, i) => {
            const active = agents >= t.min && agents <= t.max;
            return (
              <div key={i} onClick={() => setAgents(t.min)} style={{
                background: C.white, borderRadius: 20, padding: "30px 26px", cursor: "pointer", position: "relative",
                border: `2px solid ${active ? C.blue : C.border}`,
                boxShadow: active ? `0 12px 40px ${C.blue}30` : "0 8px 30px rgba(15,30,48,0.08)",
                transition: "all 0.2s",
              }}>
                {t.popular && (
                  <div style={{ position: "absolute", top: 18, right: 18, background: C.blue, color: C.white, borderRadius: 20, padding: "3px 12px", fontSize: 10, fontWeight: 800, letterSpacing: 1 }}>POPULAR</div>
                )}
                <div style={{ color: C.muted, fontSize: 11, fontWeight: 800, letterSpacing: 1.5, marginBottom: 10 }}>{t.label.toUpperCase()}</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 44, fontWeight: 900, color: C.navy }}>{money(t.price)}</div>
                <div style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>per agent / month</div>
                <div style={{ display: "inline-block", background: `${C.blue}12`, color: C.navy, borderRadius: 8, padding: "5px 10px", fontSize: 13, fontWeight: 700, marginBottom: 14 }}>
                  Only {hourly(t.price)} per hour
                </div>
                <div style={{ color: C.blue, fontSize: 13, fontWeight: 700 }}>{t.note}</div>
              </div>
            );
          })}
        </div>
      </section>

      <p style={{ textAlign: "center", color: C.muted, fontSize: 13, marginTop: 20, padding: "0 24px" }}>
        Each agent works 40 hours a week (about {Math.round(HOURS_PER_MONTH)} hours a month) dedicated only to your business.
      </p>

      {/* CALCULATOR */}
      <section style={{ padding: "44px 24px 0" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", background: C.navyDark, borderRadius: 24, padding: "40px 24px", color: C.white, textAlign: "center" }}>
          <div style={{ ...eyebrow, color: C.sky }}>BUILD YOUR TEAM</div>
          <h2 style={{ ...h2, color: C.white, marginBottom: 28 }}>How many agents do you need?</h2>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginBottom: 28 }}>
            <button onClick={() => changeAgents(-1)} aria-label="Remove agent" style={stepBtn}>−</button>
            <div style={{ minWidth: 110 }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 56, fontWeight: 900, lineHeight: 1 }}>{agents}</div>
              <div style={{ color: C.light, fontSize: 13, marginTop: 6 }}>{agents === 1 ? "agent" : "agents"}</div>
            </div>
            <button onClick={() => changeAgents(1)} aria-label="Add agent" style={stepBtn}>+</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 28 }}>
            {[
              { label: "Per agent", value: money(perAgent) },
              { label: "Per hour", value: hourly(perAgent) },
              { label: "Monthly total", value: money(total) },
              { label: "Coverage", value: `${weeklyHours} hrs/week` },
            ].map((b, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "16px 12px" }}>
                <div style={{ color: C.light, fontSize: 12, marginBottom: 6 }}>{b.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{b.value}</div>
              </div>
            ))}
          </div>

          <div style={{ minHeight: 22, marginBottom: 24, fontSize: 14, fontWeight: 700, color: C.sky }}>
            {savings > 0 && <>You save {money(savings)} every month. </>}
            {agents >= 5 && <>Enough agents for 24/7 coverage.</>}
          </div>

          <button onClick={startTrial} style={{
            width: "100%", maxWidth: 420, background: C.blue, color: C.white, border: "none", borderRadius: 12,
            padding: "16px 0", fontWeight: 900, fontSize: 16, cursor: "pointer", fontFamily: "'Playfair Display', serif",
            boxShadow: `0 0 40px ${C.blue}40`,
          }}>
            Start My Free Week →
          </button>
          <div style={{ marginTop: 14 }}>
            <button onClick={subscribeNow} disabled={loading} style={{
              background: "none", border: "none", color: "rgba(255,255,255,0.65)", fontSize: 13, fontWeight: 600,
              textDecoration: "underline", cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit",
            }}>
              {loading ? "Loading..." : "Ready to go? Subscribe now"}
            </button>
          </div>
          {checkoutError && <div style={{ color: "#f87171", fontSize: 13, marginTop: 10 }}>⚠ {checkoutError}</div>}
          <div style={{ color: C.light, fontSize: 12, marginTop: 18 }}>7 days free · No obligation to continue · Add agents anytime</div>
        </div>
      </section>

      {/* WHAT'S INCLUDED */}
      <section style={{ padding: "90px 24px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={eyebrow}>WHAT'S INCLUDED</div>
            <h2 style={{ ...h2, color: C.navy }}>
              Everything you get with <span style={{ fontStyle: "italic", color: C.blue }}>every agent</span>
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16 }}>
            {INCLUDED.map((f, i) => (
              <div key={i} style={{ background: C.offWhite, border: `1px solid ${C.border}`, borderRadius: 16, padding: "24px 22px" }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
                <div style={{ fontWeight: 800, fontSize: 15, color: C.navy, marginBottom: 6 }}>{f.title}</div>
                <div style={{ color: C.muted, fontSize: 13, lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: "90px 24px", background: C.offWhite }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={eyebrow}>HOW IT WORKS</div>
            <h2 style={{ ...h2, color: C.navy }}>
              Try it free, <span style={{ fontStyle: "italic", color: C.blue }}>then decide</span>
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 16 }}>
            {[
              { n: "01", title: "Free week", desc: "Your agent starts answering your calls for 7 days, free. We use this week to train them on your business." },
              { n: "02", title: "Setup & first month", desc: "Happy with the results? Pay a one-time setup fee and your first month to keep your agent." },
              { n: "03", title: "Grow your team", desc: "Add agents as your business grows. Your price per agent drops automatically." },
            ].map((s, i) => (
              <div key={i} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 18, padding: "30px 26px" }}>
                <div style={{ color: C.blue, fontSize: 10, fontWeight: 800, letterSpacing: 1.5, marginBottom: 12 }}>STEP {s.n}</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: C.navy, marginBottom: 10 }}>{s.title}</div>
                <div style={{ color: C.muted, fontSize: 14, lineHeight: 1.7 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: "90px 24px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={eyebrow}>FAQ</div>
            <h2 style={{ ...h2, color: C.navy }}>Questions? <span style={{ fontStyle: "italic", color: C.blue }}>Answers.</span></h2>
          </div>
          {FAQ.map((f, i) => {
            const open = openFaq === i;
            return (
              <div key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                <button onClick={() => setOpenFaq(open ? null : i)} style={{
                  width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16,
                  background: "none", border: "none", padding: "20px 0", cursor: "pointer", textAlign: "left",
                  fontFamily: "inherit", fontSize: 16, fontWeight: 700, color: C.navy,
                }}>
                  {f.q}
                  <span style={{ color: C.blue, fontSize: 22, transition: "transform 0.2s", transform: open ? "rotate(45deg)" : "none" }}>+</span>
                </button>
                {open && <div style={{ color: C.muted, fontSize: 14, lineHeight: 1.7, paddingBottom: 20 }}>{f.a}</div>}
              </div>
            );
          })}
        </div>
      </section>

      {/* NOT READY YET */}
      <section style={{ padding: "72px 24px", background: C.offWhite }}>
        <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ ...h2, fontSize: "clamp(24px, 3.5vw, 32px)", color: C.navy, marginBottom: 10 }}>Not ready yet?</h2>
          <p style={{ color: C.muted, fontSize: 15, marginBottom: 24 }}>Leave your email and we'll send you more information.</p>
          {!emailSaved ? (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleNotify()} placeholder="your@email.com"
                style={{ flex: 1, minWidth: 200, background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, padding: "13px 16px", fontSize: 14, outline: "none", fontFamily: "inherit" }} />
              <button onClick={handleNotify} disabled={saving} style={{
                background: C.navy, color: C.white, border: "none", borderRadius: 10, padding: "13px 22px",
                fontWeight: 800, fontSize: 14, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
              }}>
                {saving ? "Sending..." : "Send me info →"}
              </button>
              {emailError && <div style={{ width: "100%", color: "#dc2626", fontSize: 13, textAlign: "left" }}>⚠ {emailError}</div>}
            </div>
          ) : (
            <div style={{ color: C.green, fontWeight: 800 }}>✓ Got it! We'll be in touch soon.</div>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: C.navyDark, padding: "28px 24px", textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: 12 }}>
        © 2026 CallByDani · All rights reserved
      </footer>
    </div>
  );
}
