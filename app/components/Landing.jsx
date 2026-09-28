"use client";

import { useState, useEffect } from "react";
import { supabase } from "../supabase";

const C = {
  navy: "#1a2e4a",
  navyDark: "#0f1e30",
  navyLight: "#243d5c",
  blue: "#0ea5e9",
  blueDim: "#0ea5e915",
  blueMid: "#0ea5e930",
  sky: "#38bdf8",
  white: "#ffffff",
  offWhite: "#f8fafc",
  gray: "#f1f5f9",
  border: "#e2e8f0",
  text: "#1e293b",
  muted: "#64748b",
  light: "#94a3b8",
  green: "#22c55e",
  greenDim: "#22c55e15",
  gold: "#f59e0b",
};

const STATS = [
  { value: "98%", label: "Resolution rate" },
  { value: "< 2s", label: "Answer time" },
  { value: "24/7", label: "Coverage" },
  { value: "EN/ES", label: "Bilingual" },
];

const SECTORS = [
  { icon: "🔧", name: "Plumbers & HVAC", desc: "Never miss an emergency call" },
  { icon: "⚖️", name: "Law Firms", desc: "Screen leads, schedule consults" },
  { icon: "🏠", name: "Real Estate", desc: "Confirm showings on the go" },
  { icon: "🏥", name: "Medical Clinics", desc: "Reschedule patients after hours" },
  { icon: "💼", name: "Executives", desc: "VIP gatekeeper for your time" },
  { icon: "🍽️", name: "Restaurants", desc: "Reservations & orders handled" },
];

const STEPS = [
  { n: "01", title: "Register online", desc: "Create your account and choose your plan in under 3 minutes." },
  { n: "02", title: "Upload your documents", desc: "Policies, FAQs, price lists — AI trains your agents instantly." },
  { n: "03", title: "Forward your number", desc: "One redirect and your calls go straight to your bilingual team." },
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function handleSubmit() {
    if (!email) return;
    await supabase.from("clients").upsert([{ email, status: "lead" }]);
    setSubmitted(true);
  }

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "How it works", href: "#how" },
    { label: "Who it's for", href: "#who" },
    { label: "Pricing", href: "/pricing" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <div style={{ background: C.white, fontFamily: "'DM Sans', sans-serif", color: C.text, overflowX: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <style>{`
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
  .desktop-nav { display: flex !important; }
  .mobile-only { display: none !important; }
  @media (max-width: 768px) {
    .desktop-nav { display: none !important; }
    .mobile-only { display: flex !important; }
  }
`}</style>

      {/* NAVBAR */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
        background: scrolled ? "rgba(255,255,255,0.95)" : "rgba(15,30,48,0.8)",
        borderBottom: scrolled ? `1px solid ${C.border}` : "none",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        transition: "all 0.3s ease",
        padding: "0 24px", height: 64,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: C.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18}}>☎</div>
          <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: 20, color: scrolled ? C.navy : C.white, transition: "color 0.3s ease" }}>CallByDani</span>
        </a>
        <div className="desktop-nav" style={{ alignItems: "center", gap: 24 }}>
          {navLinks.map (l => (
            <a key={l.label} href={l.href} style={{ color: C.muted, fontSize: 14, fontWeight: 500, textDecoration: "none" }}
              onMouseEnter={e => e.target.style.color = C.navy}
              onMouseLeave={e => e.target.style.color = C.muted}>{l.label}</a>
          ))}
        </div>
        <div className="desktop-nav" style={{ gap: 8, alignItems: "center" }}>
          <button onClick={() => window.location.href = "/agente"} style={{ background: "transparent", color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 14px", fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Agent Login</button>
          <button onClick={() => window.location.href = "/login"} style={{ background: C.navy, color: C.white, border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Sign In</button>
          <button onClick={() => window.location.href = "/pricing"} style={{ background: C.navy, color: C.white, border: "none", borderRadius: 8, padding: "9px 20px", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Get Started</button>
          </div>
          <button className="mobile-only" onClick={() => setMenuOpen(!menuOpen)} style={{ background: "none", border: "none", cursor: "pointer", padding: 8, flexDirection: "column", gap: 5 }}>
            <span style={{ display: "block", width: 22, height: 2, background: scrolled ? C.navy : C.white, transition: "all 0.3s", transform: menuOpen ? "rotate(45deg) translate(5px, 5px)" : "none" }} />
            <span style={{ display: "block", width: 22, height: 2, background: scrolled ? C.navy : C.white, transition: "all 0.3s", opacity: menuOpen ? 0 : 1 }} />
            <span style={{ display: "block", width: 22, height: 2, background: scrolled ? C.navy : C.white, transition: "all 0.3s", transform: menuOpen ? "rotate(-45deg) translate(5px, -5px)" : "none" }} />
          </button>
      </nav>

      {/* DROPDOWN */}
      {menuOpen && (
        <div style={{ position: "fixed", top: 64, left: 0, right: 0, zIndex: 999, background: C.white, borderBottom: `1px solid ${C.border}`, boxShadow: "0 8px 32px rgba(0,0,0,0.1)", padding: "20px 24px 28px", animation: "fadeUp 0.2s ease" }}>
          {navLinks.map(l => (
            <a key={l.label} href={l.href} onClick={() => setMenuOpen(false)} style={{ display: "block", padding: "13px 0", color: C.text, fontSize: 16, fontWeight: 600, textDecoration: "none", borderBottom: `1px solid ${C.border}` }}>{l.label}</a>
          ))}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
            <button onClick={() => { window.location.href = "/login"; setMenuOpen(false); }} style={{ background: "transparent", color: C.navy, border: `1px solid ${C.navy}`, borderRadius: 10, padding: "12px 0", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit", width: "100%" }}>Client Sign In</button>
            <button onClick={() => { window.location.href = "/agente"; setMenuOpen(false); }} style={{ background: "transparent", color: C.muted, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 0", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "inherit", width: "100%" }}>Agent Login</button>
            <button onClick={() => { window.location.href = "/pricing"; setMenuOpen(false); }} style={{ background: C.navy, color: C.white, border: "none", borderRadius: 10, padding: "13px 0", fontWeight: 900, fontSize: 15, cursor: "pointer", fontFamily: "inherit", width: "100%" }}>Get Started →</button>
          </div>
        </div>
      )}

      {/* HERO */}
      <section style={{ background: `linear-gradient(160deg, ${C.navyDark} 0%, ${C.navyLight} 100%)`, minHeight: "100vh", display: "flex", alignItems: "center", padding: "100px 24px 80px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "10%", right: "-5%", width: 400, height: 400, borderRadius: "50%", background: `radial-gradient(circle, ${C.blue}20, transparent 70%)`, filter: "blur(60px)" }} />
        <div style={{ maxWidth: 780, margin: "0 auto", textAlign: "center", position: "relative" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(14,165,233,0.15)", border: "1px solid rgba(14,165,233,0.3)", borderRadius: 20, padding: "6px 18px", marginBottom: 28 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.blue }} />
            <span style={{ color: C.sky, fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>BILINGUAL CALL CENTER · AI POWERED</span>
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(38px, 6vw, 68px)", fontWeight: 900, color: C.white, lineHeight: 1.1, marginBottom: 20 }}>
            Your calls answered.<br />
            <span style={{ fontStyle: "italic", color: C.sky }}>Every single one.</span>
          </h1>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "clamp(15px, 2vw, 18px)", lineHeight: 1.7, maxWidth: 520, margin: "0 auto 44px" }}>
            Real bilingual agents trained by AI on your business. Ready in minutes. No hiring, no training, no overhead.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 60 }}>
            <button onClick={() => window.location.href = "/pricing"} style={{ background: C.blue, color: C.white, border: "none", borderRadius: 12, padding: "15px 36px", fontWeight: 900, fontSize: 16, cursor: "pointer", fontFamily: "'Playfair Display', serif", boxShadow: `0 0 40px ${C.blue}40` }}>Start Free — 7 Days</button>
            <button onClick={() => window.location.href = "/contact"} style={{ background: "rgba(255,255,255,0.1)", color: C.white, border: "1px solid rgba(255,255,255,0.2)", borderRadius: 12, padding: "15px 28px", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>Talk to Sales</button>
          </div>
          <div style={{ display: "flex", gap: 32, justifyContent: "center", flexWrap: "wrap" }}>
            {STATS.map((s, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 900, color: C.white }}>{s.value}</div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 3 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={{ padding: "90px 24px", background: C.offWhite }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ color: C.blue, fontSize: 11, fontWeight: 800, letterSpacing: 2, marginBottom: 12 }}>HOW IT WORKS</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 900, color: C.navy }}>
              Up and running in <span style={{ fontStyle: "italic", color: C.blue }}>under 10 minutes</span>
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 18, padding: "32px 28px", position: "relative", overflow: "hidden" }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 64, fontWeight: 900, color: C.navy, opacity: 0.06, position: "absolute", top: -8, right: 16, lineHeight: 1 }}>{s.n}</div>
                <div style={{ color: C.blue, fontSize: 10, fontWeight: 800, letterSpacing: 1.5, marginBottom: 14 }}>STEP {s.n}</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: C.navy, marginBottom: 10 }}>{s.title}</div>
                <div style={{ color: C.muted, fontSize: 14, lineHeight: 1.7 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section id="who" style={{ padding: "90px 24px", background: C.white }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ color: C.blue, fontSize: 11, fontWeight: 800, letterSpacing: 2, marginBottom: 12 }}>WHO IT'S FOR</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 900, color: C.navy }}>
              Built for businesses that<br /><span style={{ fontStyle: "italic", color: C.blue }}>can't afford to miss a call</span>
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            {SECTORS.map((s, i) => (
              <div key={i} style={{ background: C.offWhite, border: `1px solid ${C.border}`, borderRadius: 16, padding: "24px 22px", transition: "all 0.2s", cursor: "default" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.blue; e.currentTarget.style.transform = "translateY(-3px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "none"; }}
              >
                <div style={{ fontSize: 32, marginBottom: 12 }}>{s.icon}</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 16, color: C.navy, marginBottom: 6 }}>{s.name}</div>
                <div style={{ color: C.muted, fontSize: 13, lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ padding: "90px 24px", background: C.navyDark }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ color: C.sky, fontSize: 11, fontWeight: 800, letterSpacing: 2, marginBottom: 12 }}>FEATURES</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 900, color: C.white }}>
              Everything your agents need<br /><span style={{ fontStyle: "italic", color: C.sky }}>to never drop the ball</span>
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
            {[
              { icon: "🤖", title: "AI Copilot", desc: "Agents get real-time suggestions based on your company policies during every call." },
              { icon: "📋", title: "Instant summaries", desc: "Every call ends with an AI-generated summary sent to your WhatsApp or email." },
              { icon: "🌎", title: "Bilingual EN/ES", desc: "Agents switch languages seamlessly. Your customers always feel at home." },
              { icon: "⚡", title: "Ready in minutes", desc: "Upload your docs and your agents are trained instantly. No onboarding delays." },
              { icon: "📊", title: "Live dashboard", desc: "See every call, every summary, and every agent in real time from your portal." },
              { icon: "🔒", title: "Secure & compliant", desc: "Your data and your customers' data stay safe and private at all times." },
            ].map((f, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "24px 22px" }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: C.white, marginBottom: 8 }}>{f.title}</div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, lineHeight: 1.7 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "90px 24px", background: C.offWhite }}>
        <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 900, color: C.navy, lineHeight: 1.1, marginBottom: 14 }}>
            Ready to never miss<br /><span style={{ fontStyle: "italic", color: C.blue }}>another call?</span>
          </h2>
          <p style={{ color: C.muted, fontSize: 15, marginBottom: 36 }}>Join businesses across the US that trust CallByDani to handle their customer calls professionally.</p>
          {!submitted ? (
            <div style={{ display: "flex", gap: 10, maxWidth: 440, margin: "0 auto", flexWrap: "wrap" }}>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com"
                style={{ flex: 1, minWidth: 200, background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, padding: "13px 16px", fontSize: 14, outline: "none", fontFamily: "inherit" }} />
              <button onClick={handleSubmit} style={{ background: C.navy, color: C.white, border: "none", borderRadius: 10, padding: "13px 22px", fontWeight: 900, fontSize: 14, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>Start Free →</button>
            </div>
          ) : (
            <div style={{ background: C.greenDim, border: `1px solid ${C.green}40`, borderRadius: 12, padding: "16px 28px", display: "inline-block" }}>
              <span style={{ color: C.green, fontWeight: 800 }}>✓ We'll be in touch within 24 hours!</span>
            </div>
          )}
          <div style={{ color: C.light, fontSize: 12, marginTop: 14 }}>No credit card required · 7-day free trial · Cancel anytime</div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: C.navyDark, padding: "32px 24px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: C.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>☎</div>
            <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 15, color: C.white }}>CallByDani.com</span>
          </div>
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>© 2026 CallByDani · All rights reserved</div>
          <div style={{ display: "flex", gap: 20 }}>
            {["Privacy", "Terms", "Contact"].map(l => (
              <a key={l} href={l === "Contact" ? "/contact" : "#"} style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, textDecoration: "none" }}>{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}