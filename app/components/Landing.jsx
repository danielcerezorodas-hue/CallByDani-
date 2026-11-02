"use client";

import { useState, useEffect } from "react";
import { saveLead, isValidEmail } from "../leads";

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
  xmasRed: "#dc2626",
  xmasGreen: "#16a34a",
};

const STATS = [
  { value: "98%", label: "Resolution rate" },
  { value: "< 2s", label: "Answer time" },
  { value: "24/7", label: "Coverage" },
  { value: "EN/ES", label: "Bilingual" },
];

const SECTORS = [
  {
    icon: "🚗", name: "Auto Dealers", desc: "Turn every call into a showroom visit",
    points: [
      "Book test drives and service appointments",
      "Answer inventory and financing questions in EN/ES",
      "Capture and qualify leads for your sales team",
      "Never lose a buyer after hours",
    ],
  },
  {
    icon: "⚖️", name: "Law Firms", desc: "Screen leads, schedule consults",
    points: [
      "Screen new cases with your intake questions",
      "Schedule consultations on your calendar",
      "Spanish-speaking clients feel heard from the first call",
      "Urgent matters sent straight to you",
    ],
  },
  {
    icon: "🏠", name: "Real Estate", desc: "Confirm showings on the go",
    points: [
      "Answer listing questions 24/7",
      "Schedule and confirm showings",
      "Qualify buyers and sellers",
      "Capture every lead from your signs and ads",
    ],
  },
  {
    icon: "🏥", name: "Medical Clinics", desc: "Reschedule patients after hours",
    points: [
      "Book, confirm and reschedule appointments",
      "Answer hours, location and insurance questions",
      "After-hours coverage so no patient waits",
      "Bilingual care for Spanish-speaking patients",
    ],
  },
  {
    icon: "💼", name: "Executives", desc: "VIP gatekeeper for your time",
    points: [
      "Screen calls and take detailed messages",
      "Manage your calendar and meetings",
      "Dedicated bilingual virtual assistant",
      "Emails, follow-ups and daily admin handled",
    ],
  },
  {
    icon: "✨", name: "Other Businesses", desc: "Don't see your industry?",
    points: [
      "If your phone rings, we can help",
      "Our AI learns your business from your documents",
      "Sales, appointments, leads and virtual assistants",
    ],
    cta: true,
  },
];

// Contacto que se muestra en la landing
const CONTACT = {
  phone: "+18556846989",
  phoneLabel: "1 (855) 684-6989",
  emails: [
    { name: "Daniel Cerezo", email: "daniel.cerezo@callbydani.com" },
    { name: "Juan Hernandez", email: "juan.hernandezcso@callbydani.com" },
  ],
};

const STEPS = [
  { n: "01", title: "Register online", desc: "Create your account and choose your plan in under 3 minutes." },
  { n: "02", title: "Upload your documents", desc: "Policies, FAQs, price lists. We use them to train your agent during your free first week." },
  { n: "03", title: "Forward your number", desc: "One redirect and your calls go straight to your bilingual team." },
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [flipped, setFlipped] = useState(null);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  // Decoración de Navidad: noviembre y diciembre (o con ?christmas=1 para verla en cualquier fecha)
  const [christmas, setChristmas] = useState(false);
  useEffect(() => {
    const forced = new URLSearchParams(window.location.search).get("christmas") === "1";
    setChristmas(forced || [10, 11].includes(new Date().getMonth()));
  }, []);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function handleSubmit() {
    if (!isValidEmail(email)) {
      setFormError("Please enter a valid email.");
      return;
    }
    setSending(true);
    setFormError("");
    const error = await saveLead({ email: email.trim().toLowerCase(), source: "landing" });
    setSending(false);
    if (error) {
      setFormError("Something went wrong. Please try again.");
    } else {
      setSubmitted(true);
    }
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
  .desktop-nav a, .desktop-nav button { white-space: nowrap; }
  .mobile-only { display: none !important; }
  /* Menú completo solo si cabe; en tablets, portátiles pequeños y móvil en horizontal sale la hamburguesa */
  @media (max-width: 1100px) {
    .desktop-nav { display: none !important; }
    .mobile-only { display: flex !important; }
  }
  @keyframes snowFall { 0% { transform: translate(0, -10vh) rotate(0deg); } 100% { transform: translate(6vw, 110vh) rotate(360deg); } }
  @keyframes sleighFly { 0% { transform: translate(0, 0) rotate(4deg); } 30% { transform: translate(40vw, -5vh) rotate(2deg); } 60% { transform: translate(80vw, 2vh) rotate(6deg); } 100% { transform: translate(135vw, -6vh) rotate(3deg); } }
  @keyframes lightBlink { 0%, 100% { opacity: 1; filter: brightness(1.2); } 50% { opacity: 0.35; filter: brightness(0.7); } }
  @keyframes treeGlow { 0%, 100% { filter: drop-shadow(0 0 8px #facc1560); } 50% { filter: drop-shadow(0 0 20px #facc15aa); } }
  @keyframes giftHop { 0%, 85%, 100% { transform: translateY(0) rotate(0deg); } 90% { transform: translateY(-14px) rotate(-8deg); } 95% { transform: translateY(0) rotate(6deg); } }
  .xmas-deco { position: absolute; pointer-events: none; user-select: none; line-height: 1; }
  @media (prefers-reduced-motion: reduce) { .xmas-deco, .xmas-light { animation: none !important; } }
  @media (max-width: 480px) { .xmas-hide-sm { display: none; } }
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

        {/* NAVIDAD: decoración (no tapa ni bloquea nada) */}
        {christmas && (
          <div aria-hidden="true">
            {/* Luces de colores arriba del hero */}
            <div style={{ position: "absolute", top: 68, left: 0, right: 0, display: "flex", justifyContent: "space-around", pointerEvents: "none", padding: "0 8px" }}>
              {Array.from({ length: 18 }).map((_, i) => (
                <span key={i} className={i % 3 === 2 ? "xmas-light xmas-hide-sm" : "xmas-light"} style={{
                  width: 10, height: 14, borderRadius: "50% 50% 45% 45%", marginTop: i % 2 ? 10 : 2,
                  background: ["#ef4444", "#22c55e", "#facc15", "#38bdf8"][i % 4],
                  boxShadow: `0 0 12px ${["#ef4444", "#22c55e", "#facc15", "#38bdf8"][i % 4]}`,
                  animation: `lightBlink 1.6s ease-in-out ${(i % 4) * 0.4}s infinite`,
                }} />
              ))}
            </div>
            {/* Nieve */}
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className={i > 9 ? "xmas-deco xmas-hide-sm" : "xmas-deco"} style={{
                top: 0, left: `${(i * 6.3 + 2) % 100}%`, fontSize: 10 + (i % 4) * 5, color: "#fff", opacity: 0.55 + (i % 3) * 0.15,
                animation: `snowFall ${9 + (i % 5) * 2}s linear ${-(i * 1.3)}s infinite`,
              }}>❄</div>
            ))}
            {/* Santa en su trineo cruzando el cielo */}
            <div className="xmas-deco" style={{ top: "15%", left: "-25vw", fontSize: "clamp(26px, 4vw, 40px)", whiteSpace: "nowrap", animation: "sleighFly 16s linear 2s infinite" }}>🎅🛷🦌🦌</div>
            <div className="xmas-deco" style={{ top: "6%", right: "8%", fontSize: "clamp(34px, 5vw, 56px)", opacity: 0.9 }}>⭐</div>
            <div className="xmas-deco" style={{ bottom: "5%", left: "4%", fontSize: "clamp(52px, 8vw, 92px)", animation: "treeGlow 3s ease-in-out infinite" }}>🎄</div>
            <div className="xmas-deco" style={{ bottom: "6%", left: "calc(4% + clamp(50px, 7vw, 84px))", fontSize: "clamp(24px, 3.5vw, 38px)", animation: "giftHop 4s ease-in-out infinite" }}>🎁</div>
            <div className="xmas-deco xmas-hide-sm" style={{ bottom: "7%", right: "6%", fontSize: "clamp(40px, 6vw, 64px)" }}>⛄</div>
            <div className="xmas-deco" style={{ bottom: "6%", right: "calc(6% + clamp(42px, 6vw, 66px))", fontSize: "clamp(22px, 3vw, 34px)", animation: "giftHop 4s ease-in-out 1.5s infinite" }}>🎁</div>
          </div>
        )}

        <div style={{ maxWidth: 780, margin: "0 auto", textAlign: "center", position: "relative" }}>
          {christmas ? (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `${C.xmasRed}26`, border: `1px solid ${C.xmasRed}66`, borderRadius: 20, padding: "6px 18px", marginBottom: 28 }}>
              <span style={{ fontSize: 14 }}>🎄</span>
              <span style={{ color: "#fca5a5", fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>MERRY CHRISTMAS · FELIZ NAVIDAD</span>
            </div>
          ) : (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(14,165,233,0.15)", border: "1px solid rgba(14,165,233,0.3)", borderRadius: 20, padding: "6px 18px", marginBottom: 28 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.blue }} />
              <span style={{ color: C.sky, fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>BILINGUAL CALL CENTER · AI POWERED</span>
            </div>
          )}
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(38px, 6vw, 68px)", fontWeight: 900, color: C.white, lineHeight: 1.1, marginBottom: 20 }}>
            Your calls answered.<br />
            <span style={{ fontStyle: "italic", color: C.sky }}>Every single one.</span>
          </h1>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "clamp(15px, 2vw, 18px)", lineHeight: 1.7, maxWidth: 520, margin: "0 auto 44px" }}>
            Real bilingual agents trained on your business. Your first week, training included, is on us. No hiring, no overhead.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 60 }}>
            <button onClick={() => window.location.href = "/pricing"} style={{ background: C.blue, color: C.white, border: "none", borderRadius: 12, padding: "15px 36px", fontWeight: 900, fontSize: 16, cursor: "pointer", fontFamily: "'Playfair Display', serif", boxShadow: `0 0 40px ${C.blue}40` }}>Your First Week Is On Us →</button>
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

      {/* NAVIDAD: franja */}
      {christmas && (
        <section id="christmas" style={{ background: `repeating-linear-gradient(135deg, ${C.xmasRed} 0 22px, #b91c1c 22px 44px)`, padding: "22px 24px", borderTop: `4px solid ${C.xmasGreen}`, borderBottom: `4px solid ${C.xmasGreen}` }}>
          <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px 20px", flexWrap: "wrap", textAlign: "center" }}>
            <span aria-hidden="true" style={{ fontSize: 28 }}>🎅</span>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(18px, 2.6vw, 24px)", fontWeight: 900, color: C.white }}>
                Give your business the gift of never missing a call.
              </div>
              <div style={{ color: "rgba(255,255,255,0.9)", fontSize: 14, marginTop: 2 }}>
                We answer in English & Spanish while you're busy wrapping presents. 🎁
              </div>
            </div>
            <button onClick={() => window.location.href = "/pricing"} style={{
              background: C.xmasGreen, color: C.white, border: "2px solid #fff", borderRadius: 10, padding: "11px 22px",
              fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
            }}>Unwrap Your Free Week →</button>
          </div>
        </section>
      )}

      {/* DEMO VIDEO */}
<section id="demo" style={{ padding: "90px 24px", background: C.navyDark }}>
  <div style={{ maxWidth: 860, margin: "0 auto", textAlign: "center" }}>
    <div style={{ color: C.sky, fontSize: 11, fontWeight: 800, letterSpacing: 2, marginBottom: 12 }}>SEE IT IN ACTION</div>
    <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 900, color: C.white, marginBottom: 40 }}>
      Meet <span style={{ fontStyle: "italic", color: C.sky }}>CallByDani</span>
    </h2>
    <div style={{ borderRadius: 20, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", boxShadow: `0 0 60px ${C.blue}30` }}>
      <video
        src="/demo-en.mp4"
        controls
        playsInline
        preload="metadata"
        style={{ width: "100%", display: "block", background: "#000" }}
      />
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
      <p style={{ color: C.muted, fontSize: 14, marginTop: 14 }}>Tap a card to see what we do for you</p>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
      {SECTORS.map((s, i) => {
        const isFlipped = flipped === i;
        return (
          <div key={i} onClick={() => setFlipped(isFlipped ? null : i)} style={{ perspective: 1000, cursor: "pointer" }}>
            <div style={{
              display: "grid", position: "relative",
              transformStyle: "preserve-3d", WebkitTransformStyle: "preserve-3d",
              transition: "transform 0.6s ease",
              transform: isFlipped ? "rotateY(180deg)" : "none",
            }}>
              {/* FRENTE */}
              <div style={{
                gridArea: "1 / 1", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
                background: C.offWhite, border: `1px solid ${C.border}`, borderRadius: 16, padding: "24px 22px",
                display: "flex", flexDirection: "column",
              }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>{s.icon}</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 17, color: C.navy, marginBottom: 6 }}>{s.name}</div>
                <div style={{ color: C.muted, fontSize: 13, lineHeight: 1.6, flex: 1 }}>{s.desc}</div>
                <div style={{ color: C.blue, fontSize: 12, fontWeight: 700, marginTop: 16 }}>Learn more ↻</div>
              </div>

              {/* REVERSO */}
              <div style={{
                gridArea: "1 / 1", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                background: `linear-gradient(160deg, ${C.navyDark}, ${C.navyLight})`, borderRadius: 16, padding: "22px 22px",
                display: "flex", flexDirection: "column",
              }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 16, color: C.white, marginBottom: 12 }}>
                  {s.icon} {s.name}
                </div>
                <ul style={{ listStyle: "none", flex: 1 }}>
                  {s.points.map((p, j) => (
                    <li key={j} style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, lineHeight: 1.5, marginBottom: 8, display: "flex", gap: 8 }}>
                      <span style={{ color: C.sky, fontWeight: 900 }}>✓</span>{p}
                    </li>
                  ))}
                </ul>
                {s.cta && (
                  <button
                    onClick={e => { e.stopPropagation(); window.location.href = "/contact"; }}
                    style={{ background: C.blue, color: C.white, border: "none", borderRadius: 8, padding: "9px 0", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", marginTop: 8 }}>
                    Talk to us →
                  </button>
                )}
                <div style={{ color: C.sky, fontSize: 12, fontWeight: 700, marginTop: 12 }}>↻ Back</div>
              </div>
            </div>
          </div>
        );
      })}
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
              { icon: "🎓", title: "Training included", desc: "We train your agent on your business during your first week, at no cost to you." },
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
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} placeholder="your@email.com"
                style={{ flex: 1, minWidth: 200, background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, padding: "13px 16px", fontSize: 14, outline: "none", fontFamily: "inherit" }} />
              <button onClick={handleSubmit} disabled={sending} style={{ background: C.navy, color: C.white, border: "none", borderRadius: 10, padding: "13px 22px", fontWeight: 900, fontSize: 14, cursor: sending ? "not-allowed" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{sending ? "Sending..." : "Get Started →"}</button>
              {formError && <div style={{ width: "100%", color: "#dc2626", fontSize: 13, textAlign: "left" }}>⚠ {formError}</div>}
            </div>
          ) : (
            <div style={{ background: C.greenDim, border: `1px solid ${C.green}40`, borderRadius: 12, padding: "16px 28px", display: "inline-block" }}>
              <span style={{ color: C.green, fontWeight: 800 }}>✓ We'll be in touch within 24 hours!</span>
            </div>
          )}
          <div style={{ color: C.light, fontSize: 12, marginTop: 14 }}>First week free · Training included</div>

          {/* CONTACTO */}
          <div style={{ marginTop: 44, paddingTop: 32, borderTop: `1px solid ${C.border}` }}>
            <div style={{ color: C.muted, fontSize: 11, fontWeight: 800, letterSpacing: 2, marginBottom: 16 }}>PREFER TO TALK TO A PERSON?</div>
            <a href={`tel:${CONTACT.phone}`} style={{ display: "inline-flex", alignItems: "center", gap: 10, background: C.navy, color: C.white, borderRadius: 12, padding: "13px 24px", fontWeight: 800, fontSize: 18, textDecoration: "none", marginBottom: 20 }}>
              📞 {CONTACT.phoneLabel}
            </a>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, textAlign: "left" }}>
              {CONTACT.emails.map(c => (
                <a key={c.email} href={`mailto:${c.email}`} style={{ display: "block", background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", textDecoration: "none" }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: C.navy }}>{c.name}</div>
                  <div style={{ color: C.blue, fontSize: 13, marginTop: 3, wordBreak: "break-all" }}>✉️ {c.email}</div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: C.navyDark, padding: "32px 24px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: C.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>☎</div>
            <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 15, color: C.white }}>CallByDani.com</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
            <a href={`tel:${CONTACT.phone}`} style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none" }}>📞 {CONTACT.phoneLabel}</a>
            {CONTACT.emails.map(c => (
              <a key={c.email} href={`mailto:${c.email}`} style={{ color: "rgba(255,255,255,0.5)", textDecoration: "none", wordBreak: "break-all" }}>{c.email}</a>
            ))}
          </div>
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>© 2026 CallByDani · All rights reserved</div>
          <div style={{ display: "flex", gap: 20 }}>
            {["Privacy", "Terms", "Contact"].map(l => (
              <a key={l} href={`/${l.toLowerCase()}`} style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, textDecoration: "none" }}>{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}