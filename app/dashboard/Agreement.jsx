"use client";

import { useState } from "react";
import { C, card, button, inputStyle, api, formatDate } from "./ui";

// Paso 1: el cliente lee y acepta el Platform Services Agreement.
// agreement = { version, text, isUpdate } · onAccepted() recarga el dashboard
export function AgreementStep({ agreement, onAccepted }) {
  const [agree, setAgree] = useState(false);
  const [form, setForm] = useState({ full_name: "", title: "", company_name: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const ready = agree && form.full_name.trim() && form.title.trim() && form.company_name.trim();
  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));

  async function accept() {
    if (!ready) return;
    setSaving(true);
    setError("");
    const { ok, json } = await api("/api/client/agreement", { method: "POST", body: { ...form, agree: true, version: agreement.version } });
    setSaving(false);
    if (ok) onAccepted();
    else setError(json.error || "Something went wrong. Please try again.");
  }

  return (
    <div style={{ ...card, padding: "28px 22px", maxWidth: 760, margin: "0 auto" }}>
      <StepLabel n={1} of={2} />
      <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 6 }}>Platform Services Agreement</div>
      <div style={{ color: C.soft, fontSize: 14, lineHeight: 1.6, marginBottom: 18 }}>
        {agreement.isUpdate
          ? `We've updated our agreement (version ${agreement.version}). Please review and accept it to keep using your dashboard.`
          : "Before we set up your service, please read and accept our agreement."}
      </div>

      <div tabIndex={0} aria-label="Agreement text" style={{
        background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 18px", height: 340, overflowY: "auto",
        fontSize: 13, lineHeight: 1.7, color: C.soft, whiteSpace: "pre-wrap", marginBottom: 20,
      }}>
        {agreement.text}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
        <Field label="Full legal name"><input value={form.full_name} onChange={set("full_name")} style={inputStyle()} autoComplete="name" /></Field>
        <Field label="Title"><input value={form.title} onChange={set("title")} style={inputStyle()} placeholder="e.g. Owner, CEO" autoComplete="organization-title" /></Field>
        <Field label="Company name"><input value={form.company_name} onChange={set("company_name")} style={inputStyle()} autoComplete="organization" /></Field>
      </div>

      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, color: C.text, cursor: "pointer", marginBottom: 20, lineHeight: 1.5 }}>
        <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} style={{ width: 18, height: 18, marginTop: 2, flexShrink: 0 }} />
        I have read and agree to the CallByDani Platform Services Agreement
      </label>

      {error && <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>⚠ {error}</div>}
      <button onClick={accept} disabled={!ready || saving} style={{ ...button("primary", !ready || saving), width: "100%" }}>
        {saving ? "Saving..." : "Accept & Continue →"}
      </button>
    </div>
  );
}

export function StepLabel({ n, of }) {
  return <div style={{ color: C.sky, fontSize: 11, fontWeight: 800, letterSpacing: 1.5, marginBottom: 8 }}>STEP {n} OF {of}</div>;
}

export function Field({ label, error, hint, children }) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ color: C.soft, fontSize: 12, fontWeight: 700, marginBottom: 6 }}>{label}</div>
      {children}
      {hint && !error && <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>{hint}</div>}
      {error && <div style={{ color: C.red, fontSize: 11, marginTop: 4 }}>{error}</div>}
    </label>
  );
}

// Texto completo de una copia firmada (para descargar o imprimir)
function signedCopyText(s) {
  return [
    s.agreement_text,
    "",
    "────────────────────────────────────────",
    "ELECTRONIC SIGNATURE",
    `Signed by: ${s.full_name}`,
    `Title: ${s.title}`,
    `Company: ${s.company_name}`,
    `Account email: ${s.email}`,
    `Agreement version: ${s.agreement_version}`,
    `Accepted on: ${formatDate(s.accepted_at)}`,
  ].join("\n");
}

function download(s) {
  const blob = new Blob([signedCopyText(s)], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `CallByDani-Agreement-v${s.agreement_version}-${s.accepted_at.slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function print(s) {
  const w = window.open("", "_blank");
  if (!w) return;
  const esc = t => t.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
  w.document.write(`<!doctype html><title>CallByDani Agreement v${esc(s.agreement_version)}</title>
<pre style="font-family:Georgia,serif;font-size:13px;line-height:1.6;white-space:pre-wrap;max-width:720px;margin:32px auto">${esc(signedCopyText(s))}</pre>`);
  w.document.close();
  w.focus();
  w.print();
}

// Ventana con las copias firmadas: ver, descargar o imprimir / guardar como PDF
export function SignedAgreements({ signed, onClose }) {
  const [open, setOpen] = useState(signed[0]?.id);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ ...card, background: C.cardDark, width: "100%", maxWidth: 760, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Your signed agreement</div>
          <button onClick={onClose} aria-label="Close" style={{ ...button("ghost"), padding: "6px 12px" }}>✕</button>
        </div>
        <div style={{ overflowY: "auto", padding: "16px 20px" }}>
          {signed.length === 0 && <div style={{ color: C.muted, fontSize: 14 }}>No signed agreements yet.</div>}
          {signed.map(s => (
            <div key={s.id} style={{ border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 12 }}>
              <div onClick={() => setOpen(open === s.id ? null : s.id)} style={{ padding: "12px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>Version {s.agreement_version}</div>
                  <div style={{ color: C.muted, fontSize: 12 }}>Signed by {s.full_name}, {s.title} · {formatDate(s.accepted_at)}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => download(s)} style={{ ...button("ghost"), padding: "7px 12px", fontSize: 12 }}>⬇ Download</button>
                  <button onClick={() => print(s)} style={{ ...button("ghost"), padding: "7px 12px", fontSize: 12 }}>🖨 Print / PDF</button>
                </div>
              </div>
              {open === s.id && (
                <div style={{ borderTop: `1px solid ${C.border}`, padding: "14px", fontSize: 12, lineHeight: 1.7, color: C.soft, whiteSpace: "pre-wrap", maxHeight: 360, overflowY: "auto" }}>
                  {signedCopyText(s)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
