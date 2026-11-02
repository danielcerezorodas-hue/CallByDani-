// Diseño compartido de las páginas legales (/privacy y /terms).
const C = {
  navyDark: "#0f1e30",
  navy: "#1a2e4a",
  blue: "#0ea5e9",
  text: "#1e293b",
  muted: "#64748b",
  border: "#e2e8f0",
  bg: "#f8fafc",
};

export const CONTACT_EMAIL = "daniel.cerezo@callbydani.com";
export const CONTACT_PHONE = "1 (855) 684-6989";

export default function LegalPage({ title, updated, children }) {
  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'DM Sans', system-ui, sans-serif", color: C.text }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        .legal h2 { font-size: 18px; font-weight: 800; color: ${C.navy}; margin: 30px 0 10px; }
        .legal p, .legal li { font-size: 15px; line-height: 1.75; color: ${C.text}; }
        .legal p { margin: 0 0 12px; }
        .legal ul { margin: 0 0 12px; padding-left: 22px; }
        .legal li { margin-bottom: 6px; }
        .legal a { color: ${C.blue}; }
      `}</style>
      <nav style={{ background: C.navyDark, padding: "0 16px", height: 60, display: "flex", alignItems: "center" }}>
        <div style={{ maxWidth: 820, width: "100%", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <span style={{ width: 32, height: 32, borderRadius: 9, background: C.blue, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>☎</span>
            <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: 18, color: "#fff" }}>CallByDani</span>
          </a>
          <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
            <a href="/privacy" style={{ color: "rgba(255,255,255,0.75)", textDecoration: "none" }}>Privacy</a>
            <a href="/terms" style={{ color: "rgba(255,255,255,0.75)", textDecoration: "none" }}>Terms</a>
          </div>
        </div>
      </nav>
      <main className="legal" style={{ maxWidth: 820, margin: "0 auto", padding: "40px 16px 80px" }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(30px, 5vw, 40px)", fontWeight: 900, color: C.navy, margin: "0 0 6px" }}>{title}</h1>
        <div style={{ color: C.muted, fontSize: 13, marginBottom: 28 }}>Last updated: {updated}</div>
        {children}
        <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 40, paddingTop: 20, color: C.muted, fontSize: 13 }}>
          Questions? Contact us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> or {CONTACT_PHONE}.
        </div>
      </main>
    </div>
  );
}
