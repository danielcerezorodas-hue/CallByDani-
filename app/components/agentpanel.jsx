"use client";

import { useState, useRef, useEffect } from "react";

// ─── THEME ───────────────────────────────────────────────────────────────────
const C = {
  bg: "#f8f7f4",
  surface: "#ffffff",
  card: "#ffffff",
  border: "#e8e4df",
  borderDark: "#d0cbc4",
  blue: "#1a56db",
  blueDark: "#1342a8",
  blueDim: "#eff4ff",
  green: "#057a55",
  greenDim: "#f0fdf4",
  greenBorder: "#bbf7d0",
  red: "#e02424",
  redDim: "#fff5f5",
  yellow: "#c27803",
  yellowDim: "#fffbeb",
  yellowBorder: "#fde68a",
  text: "#1a1a2e",
  muted: "#6b7280",
  light: "#9ca3af",
  white: "#ffffff",
  navy: "#0f172a",
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const companies = {
  default: {
    name: "No company selected",
    docs: [],
    knowledge: "",
  }
};

function Badge({ label, color = "blue" }) {
  const map = {
    blue: { bg: C.blueDim, text: C.blue },
    green: { bg: C.greenDim, text: C.green },
    red: { bg: C.redDim, text: C.red },
    yellow: { bg: C.yellowDim, text: C.yellow },
  };
  const s = map[color] || map.blue;
  return (
    <span style={{ background: s.bg, color: s.text, borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700, letterSpacing: 0.3 }}>
      {label}
    </span>
  );
}

function Btn({ children, variant = "primary", size = "md", ...props }) {
  const sizes = { sm: "8px 14px", md: "11px 22px", lg: "14px 28px" };
  const variants = {
    primary: { background: C.blue, color: C.white, border: "none" },
    secondary: { background: C.surface, color: C.text, border: `1px solid ${C.border}` },
    ghost: { background: "transparent", color: C.muted, border: `1px solid ${C.border}` },
    success: { background: C.green, color: C.white, border: "none" },
    danger: { background: C.red, color: C.white, border: "none" },
  };
  return (
    <button {...props} style={{
      borderRadius: 10, padding: sizes[size], fontWeight: 700, fontSize: size === "sm" ? 12 : 14,
      cursor: props.disabled ? "not-allowed" : "pointer", fontFamily: "inherit",
      opacity: props.disabled ? 0.5 : 1, transition: "all 0.15s",
      display: "inline-flex", alignItems: "center", gap: 6,
      ...variants[variant], ...props.style
    }}>{children}</button>
  );
}

// ─── TABS ────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "setup", label: "🏢 Company Setup", sub: "Upload & train" },
  { id: "agent", label: "🎧 Agent Panel", sub: "Live assistant" },
  { id: "calls", label: "📋 Call Log", sub: "History" },
];

// ─── SAMPLE CALL LOG ─────────────────────────────────────────────────────────
const sampleCalls = [
  { id: 1, company: "ABC Plumbing", caller: "+1 (832) 441-2910", duration: "4:32", topic: "Delivery timeline inquiry", agent: "Maria G.", status: "resolved", time: "10:14 AM" },
  { id: 2, company: "Sunset HVAC", caller: "+1 (713) 882-0034", duration: "2:10", topic: "Schedule maintenance", agent: "Carlos R.", status: "scheduled", time: "9:58 AM" },
  { id: 3, company: "ABC Plumbing", caller: "+1 (281) 774-5512", duration: "6:45", topic: "Refund request", agent: "Maria G.", status: "escalated", time: "9:30 AM" },
  { id: 4, company: "QuickLoan Co.", caller: "+1 (512) 330-9921", duration: "3:20", topic: "Loan application status", agent: "Ana P.", status: "resolved", time: "9:12 AM" },
  { id: 5, company: "Sunset HVAC", caller: "+1 (346) 210-8843", duration: "1:55", topic: "Emergency AC repair", agent: "Carlos R.", status: "resolved", time: "8:47 AM" },
];

// ─── COMPANY SETUP TAB ───────────────────────────────────────────────────────
function SetupTab({ companies, setCompanies, activeCompany, setActiveCompany }) {
  const [newName, setNewName] = useState("");
  const [docText, setDocText] = useState("");
  const [docTitle, setDocTitle] = useState("");
  const [processing, setProcessing] = useState(false);
  const [processed, setProcessed] = useState(false);
  const [summary, setSummary] = useState("");
  const fileRef = useRef();

  function addCompany() {
    if (!newName.trim()) return;
    const id = newName.toLowerCase().replace(/\s+/g, "-");
    setCompanies(prev => ({
      ...prev,
      [id]: { name: newName, docs: [], knowledge: "", summary: "" }
    }));
    setActiveCompany(id);
    setNewName("");
  }

  async function processDoc() {
    if (!docText.trim() || !activeCompany) return;
    setProcessing(true);
    setProcessed(false);
    setSummary("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `You are a call center training system. Read the following company document and extract a structured knowledge base that agents can use to answer customer calls. Format it as clear bullet points organized by topic. Keep it practical and conversational. End with a one-sentence summary of what this company does.

Document title: ${docTitle || "Company Policy"}
Document content:
${docText}

Return a clean, organized knowledge base.`
          }]
        })
      });
      const data = await res.json();
      const result = data.content?.map(i => i.text || "").join("") || "";
      setSummary(result);
      setCompanies(prev => ({
        ...prev,
        [activeCompany]: {
          ...prev[activeCompany],
          docs: [...(prev[activeCompany]?.docs || []), { title: docTitle || "Document", content: docText }],
          knowledge: (prev[activeCompany]?.knowledge || "") + "\n\n" + docText,
          summary: result,
        }
      }));
      setProcessed(true);
      setDocText("");
      setDocTitle("");
    } catch (e) {
      setSummary("Error processing document. Please try again.");
    }
    setProcessing(false);
  }

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setDocTitle(file.name.replace(/\.[^.]+$/, ""));
    const reader = new FileReader();
    reader.onload = ev => setDocText(ev.target.result);
    reader.readAsText(file);
  }

  const company = companies[activeCompany];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 24, alignItems: "start" }}>
      {/* Left — company list */}
      <div>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", marginBottom: 16 }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, fontWeight: 800, fontSize: 14, color: C.navy }}>
            🏢 Companies
          </div>
          {Object.entries(companies).map(([id, co]) => (
            <div key={id} onClick={() => setActiveCompany(id)} style={{
              padding: "14px 20px", cursor: "pointer", borderBottom: `1px solid ${C.border}`,
              background: activeCompany === id ? C.blueDim : "transparent",
              borderLeft: activeCompany === id ? `3px solid ${C.blue}` : "3px solid transparent",
              transition: "all 0.15s"
            }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: activeCompany === id ? C.blue : C.text }}>{co.name}</div>
              <div style={{ color: C.light, fontSize: 12, marginTop: 2 }}>{co.docs?.length || 0} documents</div>
            </div>
          ))}
        </div>
        {/* Add company */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: C.navy, marginBottom: 10 }}>+ Add Company</div>
          <input value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addCompany()}
            placeholder="Company name..." style={{
              width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px",
              fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box",
              marginBottom: 10, color: C.text
            }} />
          <Btn onClick={addCompany} size="sm" style={{ width: "100%", justifyContent: "center" }}>Create</Btn>
        </div>
      </div>

      {/* Right — document upload */}
      <div>
        {!activeCompany ? (
          <div style={{ background: C.surface, border: `2px dashed ${C.border}`, borderRadius: 16, padding: 60, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏢</div>
            <div style={{ color: C.muted, fontSize: 15 }}>Select or create a company to start uploading documents</div>
          </div>
        ) : (
          <>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 20, color: C.navy }}>{company?.name}</div>
                  <div style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>{company?.docs?.length || 0} documents uploaded · AI knowledge base {company?.knowledge ? "✅ active" : "⏳ pending"}</div>
                </div>
                {company?.docs?.length > 0 && <Badge label="Trained" color="green" />}
              </div>

              {/* Doc title */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: C.muted, fontSize: 12, fontWeight: 700, marginBottom: 6, letterSpacing: 0.5 }}>DOCUMENT TITLE</div>
                <input value={docTitle} onChange={e => setDocTitle(e.target.value)} placeholder="e.g. Refund Policy, FAQ, Price List..." style={{
                  width: "100%", border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 14px",
                  fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box", color: C.text
                }} />
              </div>

              {/* Doc content */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: C.muted, fontSize: 12, fontWeight: 700, marginBottom: 6, letterSpacing: 0.5 }}>PASTE DOCUMENT CONTENT</div>
                <textarea value={docText} onChange={e => setDocText(e.target.value)}
                  placeholder="Paste your company policies, FAQs, price lists, procedures, scripts... The AI will read and memorize everything."
                  style={{
                    width: "100%", minHeight: 160, border: `1px solid ${C.border}`, borderRadius: 10,
                    padding: "14px", fontSize: 14, outline: "none", fontFamily: "inherit",
                    boxSizing: "border-box", resize: "vertical", color: C.text, lineHeight: 1.6
                  }} />
              </div>

              {/* Or upload file */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ flex: 1, height: 1, background: C.border }} />
                <span style={{ color: C.light, fontSize: 12 }}>or upload .txt file</span>
                <div style={{ flex: 1, height: 1, background: C.border }} />
              </div>
              <input ref={fileRef} type="file" accept=".txt,.md" onChange={handleFile} style={{ display: "none" }} />
              <div style={{ display: "flex", gap: 10 }}>
                <Btn variant="secondary" onClick={() => fileRef.current.click()} size="sm">📎 Upload file</Btn>
                <Btn onClick={processDoc} disabled={!docText.trim() || processing} size="md"
                  style={{ flex: 1, justifyContent: "center" }}>
                  {processing ? "⚙️ Processing..." : "🧠 Train AI on this document"}
                </Btn>
              </div>
            </div>

            {/* Result */}
            {(processing || summary) && (
              <div style={{
                background: processed ? C.greenDim : C.yellowDim,
                border: `1px solid ${processed ? C.greenBorder : C.yellowBorder}`,
                borderRadius: 16, padding: 24
              }}>
                {processing && !summary && (
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 24 }}>⚙️</div>
                    <div>
                      <div style={{ fontWeight: 700, color: C.yellow }}>AI is reading the document...</div>
                      <div style={{ color: C.muted, fontSize: 13 }}>Building knowledge base for agents</div>
                    </div>
                  </div>
                )}
                {summary && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                      <span style={{ fontSize: 20 }}>✅</span>
                      <div style={{ fontWeight: 800, color: C.green, fontSize: 15 }}>Knowledge base updated</div>
                    </div>
                    <div style={{ color: C.text, fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{summary}</div>
                  </>
                )}
              </div>
            )}

            {/* Uploaded docs list */}
            {company?.docs?.length > 0 && (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", marginTop: 20 }}>
                <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, fontSize: 13, color: C.navy }}>
                  📚 Uploaded Documents
                </div>
                {company.docs.map((doc, i) => (
                  <div key={i} style={{ padding: "12px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span>📄</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{doc.title}</div>
                        <div style={{ color: C.light, fontSize: 11 }}>{doc.content.length} characters</div>
                      </div>
                    </div>
                    <Badge label="Active" color="green" />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── AGENT PANEL TAB ─────────────────────────────────────────────────────────
function AgentTab({ companies }) {
  const [selectedCompany, setSelectedCompany] = useState("");
  const [callActive, setCallActive] = useState(false);
  const [callerName, setCallerName] = useState("");
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [callTime, setCallTime] = useState(0);
  const timerRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (callActive) {
      timerRef.current = setInterval(() => setCallTime(t => t + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      setCallTime(0);
    }
    return () => clearInterval(timerRef.current);
  }, [callActive]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function formatTime(s) {
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }

  function startCall() {
    if (!selectedCompany) return;
    setCallActive(true);
    setMessages([{
      role: "assistant",
      text: `✅ Call started. I'm ready to help you assist customers of **${companies[selectedCompany]?.name}**. Ask me anything about their policies, prices, procedures, or how to handle any customer situation.`,
      suggested: true
    }]);
  }

  function endCall() {
    setCallActive(false);
    setMessages([]);
    setCallerName("");
  }

  async function askAI() {
    if (!question.trim() || !selectedCompany) return;
    const company = companies[selectedCompany];
    if (!company?.knowledge) {
      setMessages(prev => [...prev, { role: "agent", text: question }, {
        role: "assistant", text: "⚠️ This company has no documents uploaded yet. Ask the admin to upload company policies first.", suggested: false
      }]);
      setQuestion("");
      return;
    }

    const userMsg = { role: "agent", text: question };
    setMessages(prev => [...prev, userMsg]);
    setQuestion("");
    setLoading(true);

    const history = messages.filter(m => !m.suggested).map(m => ({
      role: m.role === "agent" ? "user" : "assistant",
      content: m.text
    }));

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `You are a real-time AI assistant helping a call center agent handle customer calls for ${company.name}. 

COMPANY KNOWLEDGE BASE:
${company.knowledge}

${company.summary ? `SUMMARY: ${company.summary}` : ""}

Your job:
- Give the agent exact words they can say to the customer (start with "Say:")
- Answer policy questions precisely based on the knowledge base
- If something isn't in the knowledge base, say so clearly
- Keep responses short and practical
- Format: first give the agent the exact script, then a brief note if needed
- Always be confident and professional`,
          messages: [...history, { role: "user", content: question }]
        })
      });
      const data = await res.json();
      const reply = data.content?.map(i => i.text || "").join("") || "Error getting response.";
      setMessages(prev => [...prev, { role: "assistant", text: reply, suggested: false }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text: "Connection error. Try again.", suggested: false }]);
    }
    setLoading(false);
  }

  const trainedCompanies = Object.entries(companies).filter(([, co]) => co.docs?.length > 0);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 24, alignItems: "start" }}>
      {/* Left — call setup */}
      <div>
        {/* Call status */}
        <div style={{
          background: callActive ? C.greenDim : C.surface,
          border: `1px solid ${callActive ? C.greenBorder : C.border}`,
          borderRadius: 16, padding: 20, marginBottom: 16
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: callActive ? 16 : 0 }}>
            <div style={{
              width: 10, height: 10, borderRadius: "50%",
              background: callActive ? C.green : C.light,
              boxShadow: callActive ? `0 0 0 3px ${C.greenBorder}` : "none"
            }} />
            <div style={{ fontWeight: 700, color: callActive ? C.green : C.muted, fontSize: 14 }}>
              {callActive ? `On call — ${formatTime(callTime)}` : "No active call"}
            </div>
          </div>
          {callActive && (
            <div>
              <div style={{ color: C.text, fontSize: 13, marginBottom: 4 }}>
                <strong>Company:</strong> {companies[selectedCompany]?.name}
              </div>
              {callerName && <div style={{ color: C.text, fontSize: 13 }}><strong>Caller:</strong> {callerName}</div>}
              <Btn variant="danger" size="sm" onClick={endCall} style={{ marginTop: 12, width: "100%", justifyContent: "center" }}>
                📵 End Call
              </Btn>
            </div>
          )}
        </div>

        {!callActive && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: C.navy, marginBottom: 14 }}>🎧 Start New Call</div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: C.muted, fontSize: 12, fontWeight: 700, marginBottom: 6 }}>SELECT COMPANY</div>
              <select value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)} style={{
                width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px",
                fontSize: 13, outline: "none", fontFamily: "inherit", color: C.text, background: C.surface
              }}>
                <option value="">Choose company...</option>
                {trainedCompanies.map(([id, co]) => (
                  <option key={id} value={id}>{co.name}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ color: C.muted, fontSize: 12, fontWeight: 700, marginBottom: 6 }}>CALLER NAME (optional)</div>
              <input value={callerName} onChange={e => setCallerName(e.target.value)}
                placeholder="John Smith..." style={{
                  width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px",
                  fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box", color: C.text
                }} />
            </div>
            <Btn onClick={startCall} disabled={!selectedCompany} style={{ width: "100%", justifyContent: "center" }}>
              📞 Start Call
            </Btn>
            {trainedCompanies.length === 0 && (
              <div style={{ color: C.yellow, fontSize: 12, marginTop: 12, textAlign: "center" }}>
                ⚠️ No trained companies yet. Go to Company Setup first.
              </div>
            )}
          </div>
        )}

        {/* Quick questions */}
        {callActive && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: C.muted, marginBottom: 10, letterSpacing: 0.5 }}>QUICK QUESTIONS</div>
            {[
              "What's the refund policy?",
              "How long does delivery take?",
              "Customer wants to cancel",
              "What are your business hours?",
              "How to escalate a complaint?",
            ].map(q => (
              <button key={q} onClick={() => setQuestion(q)} style={{
                display: "block", width: "100%", textAlign: "left", background: C.bg,
                border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px",
                fontSize: 12, color: C.text, cursor: "pointer", fontFamily: "inherit", marginBottom: 6
              }}>{q}</button>
            ))}
          </div>
        )}
      </div>

      {/* Right — AI chat */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 500 }}>
        <div style={{ padding: "18px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: C.navy }}>🤖 AI Agent Assistant</div>
            <div style={{ color: C.muted, fontSize: 12 }}>Ask anything — get exact words to say</div>
          </div>
          {callActive && <Badge label="Live" color="green" />}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 14, minHeight: 340 }}>
          {!callActive && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎧</div>
              <div style={{ color: C.muted, fontSize: 15, fontWeight: 600 }}>Start a call to activate the AI assistant</div>
              <div style={{ color: C.light, fontSize: 13, marginTop: 6 }}>Select a company and click "Start Call"</div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "agent" ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "85%",
                background: m.role === "agent" ? C.blue : m.suggested ? C.greenDim : C.bg,
                color: m.role === "agent" ? C.white : C.text,
                border: m.role !== "agent" ? `1px solid ${m.suggested ? C.greenBorder : C.border}` : "none",
                borderRadius: m.role === "agent" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                padding: "12px 16px", fontSize: 13, lineHeight: 1.7,
                whiteSpace: "pre-wrap"
              }}>
                {m.role === "assistant" && (
                  <div style={{ fontSize: 11, fontWeight: 700, color: m.suggested ? C.green : C.blue, marginBottom: 6, letterSpacing: 0.5 }}>
                    {m.suggested ? "✅ AI READY" : "🤖 AI ASSISTANT"}
                  </div>
                )}
                {m.role === "agent" && (
                  <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>YOU ASKED</div>
                )}
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", gap: 6, padding: 8 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: C.blue, animation: `bounce 1s ${i * 0.15}s infinite` }} />
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div style={{ padding: "14px 20px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 10 }}>
          <input value={question} onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === "Enter" && askAI()}
            disabled={!callActive}
            placeholder={callActive ? "Ask about policy, what to say, how to handle..." : "Start a call first..."}
            style={{
              flex: 1, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 14px",
              fontSize: 14, outline: "none", fontFamily: "inherit", color: C.text,
              background: callActive ? C.surface : C.bg
            }} />
          <Btn onClick={askAI} disabled={!callActive || !question.trim()} style={{ padding: "11px 18px" }}>→</Btn>
        </div>
      </div>
      <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-8px)} }`}</style>
    </div>
  );
}

// ─── CALL LOG TAB ─────────────────────────────────────────────────────────────
function CallLogTab() {
  const statusColors = { resolved: "green", escalated: "red", scheduled: "blue" };
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
      <div style={{ padding: "18px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: C.navy }}>📋 Today's Call Log</div>
        <div style={{ display: "flex", gap: 8 }}>
          <Badge label={`${sampleCalls.length} calls`} color="blue" />
          <Badge label="4 resolved" color="green" />
          <Badge label="1 escalated" color="red" />
        </div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: C.bg }}>
            {["Time", "Company", "Caller", "Topic", "Agent", "Duration", "Status"].map(h => (
              <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 0.8 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sampleCalls.map(call => (
            <tr key={call.id} style={{ borderTop: `1px solid ${C.border}` }}>
              <td style={{ padding: "14px 16px", fontSize: 13, color: C.muted, fontFamily: "monospace" }}>{call.time}</td>
              <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 700, color: C.navy }}>{call.company}</td>
              <td style={{ padding: "14px 16px", fontSize: 13, color: C.muted, fontFamily: "monospace" }}>{call.caller}</td>
              <td style={{ padding: "14px 16px", fontSize: 13, color: C.text }}>{call.topic}</td>
              <td style={{ padding: "14px 16px", fontSize: 13, color: C.text }}>{call.agent}</td>
              <td style={{ padding: "14px 16px", fontSize: 13, color: C.muted, fontFamily: "monospace" }}>{call.duration}</td>
              <td style={{ padding: "14px 16px" }}><Badge label={call.status} color={statusColors[call.status]} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("setup");
  const [companies, setCompanies] = useState({
    "abc-plumbing": { name: "ABC Plumbing", docs: [], knowledge: "", summary: "" },
    "sunset-hvac": { name: "Sunset HVAC", docs: [], knowledge: "", summary: "" },
  });
  const [activeCompany, setActiveCompany] = useState("abc-plumbing");

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", color: C.text }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800;900&display=swap" rel="stylesheet" />

      {/* HEADER */}
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: "0 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ background: C.blue, borderRadius: 12, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📞</div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 18, color: C.navy, letterSpacing: -0.5 }}>CallCenter AI</div>
              <div style={{ color: C.muted, fontSize: 11 }}>Intelligent agent training platform</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.green }} />
              <span style={{ color: C.muted, fontSize: 13 }}>27 agents online</span>
            </div>
            <Badge label="Pro Plan" color="blue" />
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
              padding: "16px 28px", borderBottom: tab === t.id ? `2px solid ${C.blue}` : "2px solid transparent",
              transition: "all 0.15s"
            }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: tab === t.id ? C.blue : C.muted }}>{t.label}</div>
              <div style={{ fontSize: 11, color: C.light, marginTop: 1 }}>{t.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px" }}>
        {tab === "setup" && <SetupTab companies={companies} setCompanies={setCompanies} activeCompany={activeCompany} setActiveCompany={setActiveCompany} />}
        {tab === "agent" && <AgentTab companies={companies} />}
        {tab === "calls" && <CallLogTab />}
      </div>
    </div>
  );
}
