"use client";

export default function SuccessPage() {
  return (
    <div style={{
      background: "#0f1e30", minHeight: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans', sans-serif"
    }}>
      <div style={{
        background: "#1a2e4a", border: "1px solid #0ea5e9",
        borderRadius: 20, padding: "48px 40px", textAlign: "center", maxWidth: 480
      }}>
        <div style={{ fontSize: 60, marginBottom: 20 }}>🎉</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: "#ffffff", marginBottom: 12 }}>
          Welcome to CallByDani!
        </div>
        <div style={{ color: "#cbd5e1", fontSize: 15, lineHeight: 1.7, marginBottom: 32 }}>
          Your subscription is active. Your dedicated bilingual agents are being briefed on your business right now.
        </div>
        <div style={{ background: "#0f1e30", border: "1px solid #2c4868", borderRadius: 12, padding: 20, marginBottom: 28 }}>
          <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 800, letterSpacing: 1, marginBottom: 8 }}>NEXT STEPS</div>
          {["Upload your company documents", "Set your business hours", "Forward your phone number to us"].map((step, i) => (
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