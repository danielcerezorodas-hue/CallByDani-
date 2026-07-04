"use client";

import { useState, useEffect } from "react";
import { supabase } from "../supabase";

const CALLS = [
  { id: 1, time: "10:42 AM", caller: "+1 (832) 441-2910", agent: "Maria G.", duration: "3:21", topic: "Appointment scheduling", status: "resolved", summary: "Client called to schedule a consultation for Thursday at 2pm. Confirmed and added to calendar." },
  { id: 2, time: "9:58 AM", caller: "+1 (713) 882-0034", agent: "Carlos R.", duration: "1:48", topic: "Price inquiry", status: "resolved", summary: "Asked about pricing for the premium package. Sent pricing sheet via email." },
  { id: 3, time: "9:30 AM", caller: "+1 (281) 774-5512", agent: "Maria G.", duration: "5:10", topic: "Complaint", status: "escalated", summary: "Customer upset about delay. Escalated to manager. Follow up required." },
];

function StatusBadge({ status }) {
  const map = {
    resolved: { color: "#3d9e5f", bg: "#3d9e5f18", label: "Resolved" },
    escalated: { color: "#c8a84b", bg: "#c8a84b18", label: "Escalated" },
    blocked: { color: "#c05050", bg: "#c0505018", label: "Blocked" },
  };
  const s = map[status] || map.resolved;
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: 800, border: `1px solid ${s.color}40` }}>
      {s.label}
    </span>
  );
}

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div style={{ background: "#0a1409", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#3d9e5f", fontSize: 16 }}>Loading...</div>
    </div>
  );

  if (!user) return (
    <div style={{ background: "#0a1409", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
      <div style={{ background: "#162318", border: "1px solid #1e3320", borderRadius: 20, padding: "48px 40px", textAlign: "center", maxWidth: 400 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: "#f2ead8", marginBottom: 12 }}>Access Restricted</div>
        <div style={{ color: "#5a7a5d", fontSize: 14, marginBottom: 24 }}>Please sign in to access your dashboard.</div>
        <a href="/pricing" style={{ display: "block", padding: "13px 0", background: "linear-gradient(135deg, #3d9e5f, #c8a84b)", color: "#0a1409", borderRadius: 12, fontWeight: 900, fontSize: 15, textDecoration: "none" }}>
          Get Started →
        </a>
      </div>
    </div>
  );

  return (
    <div style={{ background: "#0a1409", minHeight: "100vh", fontFamily: "sans-serif", color: "#f2ead8" }}>
      {/* Header */}
      <div style={{ background: "#0f1d0e", borderBottom: "1px solid #1e3320", padding: "0 32px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #3d9e5f, #c8a84b)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>☎</div>
          <span style={{ fontWeight: 900, fontSize: 17, color: "#f2ead8" }}>CallByDani</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ color: "#5a7a5d", fontSize: 13 }}>{user.email}</span>
          <button onClick={() => supabase.auth.signOut().then(() => window.location.href = "/")}
            style={{ background: "#162318", border: "1px solid #1e3320", color: "#8aaa8d", borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 28 }}>
          {[
            { label: "CALLS TODAY", value: "24", color: "#f2ead8" },
            { label: "RESOLVED", value: "91%", color: "#3d9e5f" },
            { label: "ESCALATED", value: "2", color: "#c8a84b" },
            { label: "AVG TIME", value: "2:47", color: "#f2ead8" },
          ].map((s, i) => (
            <div key={i} style={{ background: "#162318", border: "1px solid #1e3320", borderRadius: 16, padding: "20px 22px" }}>
              <div style={{ color: "#5a7a5d", fontSize: 10, fontWeight: 800, letterSpacing: 1.2, marginBottom: 8 }}>{s.label}</div>
              <div style={{ color: s.color, fontSize: 28, fontWeight: 900 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Call Log */}
        <div style={{ background: "#162318", border: "1px solid #1e3320", borderRadius: 18, overflow: "hidden" }}>
          <div style={{ padding: "18px 24px", borderBottom: "1px solid #1e3320", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#f2ead8" }}>Today's Calls</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#3d9e5f" }} />
              <span style={{ color: "#3d9e5f", fontSize: 11, fontWeight: 700 }}>LIVE</span>
            </div>
          </div>
          {CALLS.map(call => (
            <div key={call.id}>
              <div onClick={() => setExpanded(expanded === call.id ? null : call.id)}
                style={{ padding: "15px 24px", borderBottom: "1px solid #1e3320", display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: call.status === "escalated" ? "#c8a84b18" : "#3d9e5f18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                  {call.status === "escalated" ? "⚠" : "↗"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#f2ead8" }}>{call.caller}</div>
                  <div style={{ color: "#5a7a5d", fontSize: 12, marginTop: 2 }}>{call.topic} · {call.agent} · {call.time}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "#5a7a5d", fontSize: 11, fontFamily: "monospace" }}>{call.duration}</span>
                  <StatusBadge status={call.status} />
                </div>
              </div>
              {expanded === call.id && (
                <div style={{ padding: "14px 24px 18px 74px", background: "#1c2e1e", borderBottom: "1px solid #1e3320" }}>
                  <div style={{ color: "#5a7a5d", fontSize: 10, fontWeight: 800, letterSpacing: 1, marginBottom: 6 }}>AI SUMMARY</div>
                  <div style={{ color: "#8aaa8d", fontSize: 13, lineHeight: 1.7, fontStyle: "italic" }}>"{call.summary}"</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}