"use client"; 

import { useState, useEffect, useRef } from "react";

import { supabase } from '../supabase'

const T = {
  bg: "#0a1409",
  surface: "#0f1d0e",
  card: "#162318",
  border: "#1e3320",
  borderLight: "#2d5232",
  cream: "#f2ead8",
  creamDim: "#f2ead810",
  creamSoft: "#d8cdb5",
  gold: "#c8a84b",
  goldLight: "#e8c870",
  goldDim: "#c8a84b18",
  green: "#3d9e5f",
  greenLight: "#5dbe7f",
  greenDim: "#3d9e5f18",
  text: "#f2ead8",
  muted: "#5a7a5d",
  light: "#8aaa8d",
};

const PLANS = [
  {
    name: "Starter",
    price: "$299",
    desc: "Perfect for small local businesses",
    features: ["100 calls/month", "1 dedicated agent", "AI call summaries", "Email notifications", "Business hours setup"],
    cta: "Start Free Trial",
    highlight: false,
  },
  {
    name: "Business",
    price: "$599",
    desc: "Most popular for growing companies",
    features: ["300 calls/month", "2 dedicated agents", "AI Copilot included", "WhatsApp notifications", "API integrations", "Priority support"],
    cta: "Get Started",
    highlight: true,
  },
  {
    name: "Executive",
    price: "$1,100",
    desc: "VIP assistant for executives & realtors",
    features: ["Unlimited calls", "Personal VIP agent", "Calendar management", "WhatsApp AI summaries", "CRM sync", "Dedicated account manager"],
    cta: "Contact Sales",
    highlight: false,
  },
];

const SECTORS = [
  { icon: "🔧", name: "Plumbers & HVAC", desc: "Never miss an emergency call again" },
  { icon: "⚖️", name: "Law Firms", desc: "Screen leads, schedule consultations" },
  { icon: "🏠", name: "Real Estate", desc: "Confirm showings while you're in the field" },
  { icon: "🏥", name: "Medical Clinics", desc: "Reschedule patients after hours" },
  { icon: "💼", name: "Executives & CEOs", desc: "VIP gatekeeper for your time" },
  { icon: "🍽️", name: "Restaurants", desc: "Reservations, orders, and FAQs handled" },
];

const STATS = [
  { value: "98%", label: "Call resolution rate" },
  { value: "< 2s", label: "Average answer time" },
  { value: "5–7x", label: "Agents per client" },
  { value: "24/7", label: "Coverage available" },
];

function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, inView];
}

function FadeIn({ children, delay = 0, style = {} }) {
  const [ref, inView] = useInView();
  return (
    <div ref={ref} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? "translateY(0)" : "translateY(28px)",
      transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
      ...style
    }}>
      {children}
    </div>
  );
}

export default function LandingPage() {
  const [activeNav, setActiveNav] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [hoveredPlan, setHoveredPlan] = useState(null);

  useEffect(() => {
    const onScroll = () => setActiveNav(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

 async function handleSubmit() {
    if (!email) return;
    const { data, error } = await supabase
      .from('clients')
      .insert([{ email: email, status: 'lead' }])
    console.log('error:', error)
    console.log('data:', data)
    if (!error) setSubmitted(true);
  }

  return (
    <div style={{ background: T.bg, color: T.text, fontFamily: "'DM Sans', sans-serif", minHeight: "100vh", overflowX: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::selection { background: ${T.gold}40; color: ${T.cream}; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 4px; }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes shimmer { 0%{background-position:0% 50%} 100%{background-position:200% 50%} }
        @keyframes spin-slow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: "0 48px",
        background: activeNav ? `${T.surface}ee` : "transparent",
        borderBottom: activeNav ? `1px solid ${T.border}` : "1px solid transparent",
        backdropFilter: activeNav ? "blur(20px)" : "none",
        transition: "all 0.4s ease",
        display: "flex", alignItems: "center", justifyContent: "space-between", height: 68,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: `linear-gradient(135deg, ${T.green}, ${T.gold})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>☎</div>
          <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: 18, color: T.cream }}>CallByDani</span>
          <span style={{ color: T.muted, fontSize: 9, fontWeight: 700, letterSpacing: 2, marginTop: 2 }}>AI</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          {["Features", "Pricing", "Who it's for"].map(item => (
            <a key={item} href="#" style={{ color: T.light, fontSize: 13, fontWeight: 500, textDecoration: "none", transition: "color 0.2s" }}
              onMouseEnter={e => e.target.style.color = T.cream}
              onMouseLeave={e => e.target.style.color = T.light}>{item}</a>
          ))}
          <button style={{ background: `linear-gradient(135deg, ${T.green}, ${T.gold})`, color: T.bg, border: "none", borderRadius: 10, padding: "9px 22px", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            Get Started
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", padding: "120px 48px 80px" }}>
        {/* Background orbs */}
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
          <div style={{ position: "absolute", top: "15%", left: "8%", width: 400, height: 400, borderRadius: "50%", background: `radial-gradient(circle, ${T.green}20, transparent 70%)`, filter: "blur(60px)", animation: "float 8s ease-in-out infinite" }} />
          <div style={{ position: "absolute", bottom: "20%", right: "10%", width: 300, height: 300, borderRadius: "50%", background: `radial-gradient(circle, ${T.gold}15, transparent 70%)`, filter: "blur(50px)", animation: "float 10s ease-in-out infinite reverse" }} />
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 600, borderRadius: "50%", background: `radial-gradient(circle, ${T.green}08, transparent 70%)`, filter: "blur(80px)" }} />
          {/* Decorative ring */}
          <div style={{ position: "absolute", top: "10%", right: "5%", width: 220, height: 220, borderRadius: "50%", border: `1px solid ${T.border}`, opacity: 0.5, animation: "spin-slow 30s linear infinite" }}>
            <div style={{ position: "absolute", top: -4, left: "50%", width: 8, height: 8, borderRadius: "50%", background: T.gold, transform: "translateX(-50%)" }} />
          </div>
          <div style={{ position: "absolute", top: "12%", right: "6.5%", width: 190, height: 190, borderRadius: "50%", border: `1px solid ${T.borderLight}`, opacity: 0.3 }} />
        </div>

        <div style={{ maxWidth: 860, textAlign: "center", position: "relative" }}>
          {/* Eyebrow */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: T.greenDim, border: `1px solid ${T.green}40`, borderRadius: 20, padding: "6px 18px", marginBottom: 32 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.green }} />
            <span style={{ color: T.green, fontSize: 12, fontWeight: 700, letterSpacing: 1.2 }}>BILINGUAL CALL CENTER · POWERED BY AI</span>
          </div>

          {/* Headline */}
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(44px, 6vw, 76px)", fontWeight: 900, lineHeight: 1.08, color: T.cream, marginBottom: 12 }}>
            Your calls answered.<br />
            <span style={{ fontStyle: "italic", background: `linear-gradient(135deg, ${T.green}, ${T.gold})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Every single one.</span>
          </h1>

          <p style={{ color: T.light, fontSize: 18, lineHeight: 1.7, maxWidth: 560, margin: "0 auto 48px", fontWeight: 400 }}>
            Real bilingual agents in Guatemala, trained by AI on your business policies. Ready in minutes. No hiring, no training, no overhead.
          </p>

          {/* CTA */}
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 64 }}>
            <button style={{ background: `linear-gradient(135deg, ${T.green}, ${T.gold})`, color: T.bg, border: "none", borderRadius: 14, padding: "16px 36px", fontWeight: 900, fontSize: 16, cursor: "pointer", fontFamily: "'Playfair Display', serif", letterSpacing: 0.3, boxShadow: `0 0 40px ${T.green}30` }}>
              Start Free — 7 Days
            </button>
            <button style={{ background: T.creamDim, color: T.cream, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit", backdropFilter: "blur(10px)" }}>
              ▶ Watch Demo
            </button>
          </div>

          {/* Social proof */}
          <div style={{ display: "flex", gap: 40, justifyContent: "center", flexWrap: "wrap" }}>
            {STATS.map((s, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 900, color: T.cream }}>{s.value}</div>
                <div style={{ color: T.muted, fontSize: 12, marginTop: 3, letterSpacing: 0.5 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: "100px 48px", borderTop: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 72 }}>
              <div style={{ color: T.gold, fontSize: 11, fontWeight: 800, letterSpacing: 2, marginBottom: 14 }}>HOW IT WORKS</div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 42, fontWeight: 900, color: T.cream, lineHeight: 1.15 }}>
                Up and running<br /><span style={{ fontStyle: "italic", color: T.gold }}>in under 10 minutes</span>
              </h2>
            </div>
          </FadeIn>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
            {[
              { step: "01", title: "Register your company", desc: "Fill in your business name, type, and hours. Takes 3 minutes." },
              { step: "02", title: "Upload your documents", desc: "Policies, FAQs, price lists — our AI reads and trains agents instantly." },
              { step: "03", title: "Forward your number", desc: "One click and your calls route to your dedicated bilingual agents." },
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 0.15}>
                <div style={{ padding: "36px 32px", background: T.card, border: `1px solid ${T.border}`, borderRadius: i === 0 ? "18px 0 0 18px" : i === 2 ? "0 18px 18px 0" : 0, position: "relative", overflow: "hidden" }}>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 72, fontWeight: 900, color: T.green, opacity: 0.08, position: "absolute", top: -8, right: 16, lineHeight: 1 }}>{item.step}</div>
                  <div style={{ color: T.gold, fontSize: 11, fontWeight: 800, letterSpacing: 1.5, marginBottom: 16 }}>STEP {item.step}</div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: T.cream, marginBottom: 12, lineHeight: 1.3 }}>{item.title}</div>
                  <div style={{ color: T.light, fontSize: 14, lineHeight: 1.7 }}>{item.desc}</div>
                  {i < 2 && <div style={{ position: "absolute", right: -1, top: "50%", transform: "translateY(-50%)", width: 2, height: 40, background: `linear-gradient(${T.green}, ${T.gold})`, zIndex: 2 }} />}
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHO IT'S FOR ── */}
      <section style={{ padding: "100px 48px", borderTop: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 60 }}>
              <div style={{ color: T.gold, fontSize: 11, fontWeight: 800, letterSpacing: 2, marginBottom: 14 }}>WHO IT'S FOR</div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 42, fontWeight: 900, color: T.cream }}>
                Built for businesses that<br /><span style={{ fontStyle: "italic", color: T.greenLight }}>can't afford to miss a call</span>
              </h2>
            </div>
          </FadeIn>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {SECTORS.map((s, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <div style={{
                  background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "26px 24px",
                  transition: "all 0.25s", cursor: "default"
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = T.borderLight; e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.background = T.cardHover; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.background = T.card; }}
                >
                  <div style={{ fontSize: 32, marginBottom: 14 }}>{s.icon}</div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 16, color: T.cream, marginBottom: 8 }}>{s.name}</div>
                  <div style={{ color: T.muted, fontSize: 13, lineHeight: 1.6 }}>{s.desc}</div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section style={{ padding: "100px 48px", borderTop: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <div style={{ color: T.gold, fontSize: 11, fontWeight: 800, letterSpacing: 2, marginBottom: 14 }}>PRICING</div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 42, fontWeight: 900, color: T.cream }}>
                Simple, transparent<br /><span style={{ fontStyle: "italic", color: T.gold }}>monthly plans</span>
              </h2>
              <p style={{ color: T.muted, fontSize: 15, marginTop: 14 }}>No setup fees. Cancel anytime. 7-day free trial on all plans.</p>
            </div>
          </FadeIn>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {PLANS.map((plan, i) => (
              <FadeIn key={i} delay={i * 0.12}>
                <div
                  onMouseEnter={() => setHoveredPlan(i)}
                  onMouseLeave={() => setHoveredPlan(null)}
                  style={{
                    background: plan.highlight ? `linear-gradient(160deg, #1f3a22, #162a19)` : T.card,
                    border: `1px solid ${plan.highlight ? T.borderLight : hoveredPlan === i ? T.borderLight : T.border}`,
                    borderRadius: 20, padding: "36px 28px", position: "relative", overflow: "hidden",
                    transform: plan.highlight ? "scale(1.03)" : hoveredPlan === i ? "translateY(-4px)" : "none",
                    transition: "all 0.25s", boxShadow: plan.highlight ? `0 0 60px ${T.green}20` : "none"
                  }}
                >
                  {plan.highlight && (
                    <div style={{ position: "absolute", top: 16, right: 16, background: `linear-gradient(135deg, ${T.green}, ${T.gold})`, color: T.bg, borderRadius: 20, padding: "3px 14px", fontSize: 11, fontWeight: 900, letterSpacing: 0.5 }}>
                      POPULAR
                    </div>
                  )}
                  <div style={{ color: T.muted, fontSize: 11, fontWeight: 800, letterSpacing: 1.5, marginBottom: 10 }}>{plan.name.toUpperCase()}</div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 48, fontWeight: 900, color: plan.highlight ? T.cream : T.creamSoft, lineHeight: 1, marginBottom: 4 }}>{plan.price}</div>
                  <div style={{ color: T.muted, fontSize: 12, marginBottom: 24 }}>/month · billed monthly</div>
                  <div style={{ color: T.light, fontSize: 13, marginBottom: 28 }}>{plan.desc}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
                    {plan.features.map((f, j) => (
                      <div key={j} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ color: plan.highlight ? T.green : T.gold, fontSize: 14, flexShrink: 0 }}>✓</span>
                        <span style={{ color: T.light, fontSize: 13 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <button style={{
                    width: "100%", padding: "13px 0", borderRadius: 12, fontWeight: 800, fontSize: 14,
                    cursor: "pointer", fontFamily: "'Playfair Display', serif", letterSpacing: 0.3,
                    background: plan.highlight ? `linear-gradient(135deg, ${T.green}, ${T.gold})` : "transparent",
                    color: plan.highlight ? T.bg : T.cream,
                    border: plan.highlight ? "none" : `1px solid ${T.borderLight}`,
                    transition: "all 0.2s"
                  }}>
                    {plan.cta}
                  </button>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA STRIP ── */}
      <section style={{ padding: "100px 48px", borderTop: `1px solid ${T.border}` }}>
        <FadeIn>
          <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 48, fontWeight: 900, color: T.cream, lineHeight: 1.1, marginBottom: 16 }}>
              Ready to never miss<br /><span style={{ fontStyle: "italic", color: T.gold }}>another call?</span>
            </h2>
            <p style={{ color: T.muted, fontSize: 16, marginBottom: 40 }}>Join businesses across the US that trust CallByDani to handle their customer calls professionally.</p>

            {!submitted ? (
              <div style={{ display: "flex", gap: 10, maxWidth: 460, margin: "0 auto" }}>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com"
                  style={{ flex: 1, background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, color: T.cream, padding: "14px 18px", fontSize: 14, outline: "none", fontFamily: "inherit" }} />
                <button onClick={handleSubmit} style={{ background: `linear-gradient(135deg, ${T.green}, ${T.gold})`, color: T.bg, border: "none", borderRadius: 12, padding: "14px 24px", fontWeight: 900, fontSize: 14, cursor: "pointer", fontFamily: "'Playfair Display', serif", whiteSpace: "nowrap" }}>
                  Start Free →
                </button>
              </div>
            ) : (
              <div style={{ background: T.greenDim, border: `1px solid ${T.green}40`, borderRadius: 14, padding: "18px 32px", display: "inline-block" }}>
                <span style={{ color: T.green, fontWeight: 800, fontSize: 16 }}>✓ We'll be in touch within 24 hours!</span>
              </div>
            )}
            <div style={{ color: T.muted, fontSize: 12, marginTop: 16 }}>No credit card required · 7-day free trial · Cancel anytime</div>
          </div>
        </FadeIn>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: `1px solid ${T.border}`, padding: "36px 48px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: `linear-gradient(135deg, ${T.green}, ${T.gold})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>☎</div>
          <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 15, color: T.cream }}>CallByDani</span>
        </div>
        <div style={{ color: T.muted, fontSize: 12 }}>© 2026 CallByDani · All rights reserved</div>
        <div style={{ display: "flex", gap: 24 }}>
          {["Privacy", "Terms", "Contact"].map(l => (
            <a key={l} href="#" style={{ color: T.muted, fontSize: 12, textDecoration: "none" }}>{l}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}
