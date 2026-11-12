// Página que ve el prospecto después de enviar el formulario de contacto.
// Google Ads cuenta una conversión ("Submit lead form") cada vez que alguien llega aquí.
export const metadata = {
  title: "Thank you | CallByDani",
  robots: { index: false, follow: false },
};

export default function ThankYouPage() {
  return (
    <div style={{ background: "#0f1e30", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", padding: 24 }}>
      <div style={{ background: "#1a2e4a", border: "1px solid #0ea5e9", borderRadius: 20, padding: "48px 40px", textAlign: "center", maxWidth: 480 }}>
        <div style={{ fontSize: 60, marginBottom: 20 }}>🎉</div>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: "#ffffff", margin: "0 0 12px" }}>Thank you! We received your request.</h1>
        <p style={{ color: "#cbd5e1", fontSize: 15, lineHeight: 1.7, margin: "0 0 12px" }}>
          A member of our team will contact you within 24 hours to learn about your business and set up your free trial week.
        </p>
        <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.6, fontStyle: "italic", margin: "0 0 28px" }}>
          ¿Prefiere español? Con gusto lo atendemos en español.
        </p>
        <a href="/" style={{ display: "block", padding: "13px 0", background: "linear-gradient(135deg, #0ea5e9, #38bdf8)", color: "#ffffff", borderRadius: 12, fontWeight: 900, fontSize: 15, textDecoration: "none" }}>
          Back to Home →
        </a>
      </div>
    </div>
  );
}
