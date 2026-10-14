"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "../supabase";
import { C, card, button, inputStyle, api } from "./ui";
import { SECTIONS, sectionComplete, formErrors } from "./onboardingFields";
import { Field, StepLabel } from "./Agreement";

const BUCKET = "client-documents";

function formatSize(bytes) {
  if (!bytes) return "";
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;
}

// Lista de pasos del onboarding (✓ completo / ○ pendiente). onPick(sectionId) abre esa sección.
export function OnboardingChecklist({ data, docCount, onPick }) {
  const done = SECTIONS.filter(s => sectionComplete(s, data, docCount)).length;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8, gap: 10 }}>
        <span style={{ fontWeight: 800 }}>Setup progress</span>
        <span style={{ color: C.muted }}>{done} of {SECTIONS.length} sections</span>
      </div>
      <div style={{ height: 6, background: C.bg, borderRadius: 6, overflow: "hidden", marginBottom: 14 }}>
        <div style={{ width: `${(done / SECTIONS.length) * 100}%`, height: "100%", background: C.green }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
        {SECTIONS.map((s, i) => {
          const ok = sectionComplete(s, data, docCount);
          return (
            <button key={s.id} onClick={() => onPick?.(s.id)} style={{
              display: "flex", alignItems: "center", gap: 8, background: C.bg, border: `1px solid ${ok ? `${C.green}66` : C.border}`,
              borderRadius: 10, padding: "9px 11px", color: ok ? C.text : C.soft, fontSize: 13, fontWeight: 700,
              cursor: onPick ? "pointer" : "default", fontFamily: "inherit", textAlign: "left",
            }}>
              <span style={{ color: ok ? C.green : C.muted, fontWeight: 900 }}>{ok ? "✓" : i + 1}</span>
              {s.title}{s.optional && <span style={{ color: C.muted, fontWeight: 500, fontSize: 11 }}>(optional)</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Input({ field, value, onChange, error, disabled }) {
  const common = { disabled, style: inputStyle(!!error), "aria-invalid": !!error };
  switch (field.type) {
    case "readonly":
      return <div style={{ ...inputStyle(), color: C.soft, background: C.cardDark }}>{value || "—"}</div>;
    case "textarea":
      return <textarea {...common} rows={3} value={value || ""} placeholder={field.placeholder} onChange={e => onChange(e.target.value)} style={{ ...common.style, resize: "vertical" }} />;
    case "select":
      return (
        <select {...common} value={value || ""} onChange={e => onChange(e.target.value)}>
          <option value="">Select...</option>
          {field.options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    case "multi": {
      const list = Array.isArray(value) ? value : [];
      return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {field.options.map(o => {
            const on = list.includes(o);
            return (
              <button key={o} type="button" disabled={disabled} onClick={() => onChange(on ? list.filter(x => x !== o) : [...list, o])} style={{
                background: on ? `${C.blue}26` : C.bg, border: `1px solid ${on ? C.blue : error ? C.red : C.border}`, color: on ? C.sky : C.soft,
                borderRadius: 20, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: disabled ? "default" : "pointer", fontFamily: "inherit",
              }}>{on ? "✓ " : ""}{o}</button>
            );
          })}
        </div>
      );
    }
    default:
      return <input {...common} type={field.type || "text"} value={value || ""} placeholder={field.placeholder} onChange={e => onChange(e.target.value)} />;
  }
}

export function Documents({ documents, setDocuments, disabled }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function upload(files) {
    setError("");
    for (const file of files) {
      setBusy(`Uploading ${file.name}...`);
      const start = await api("/api/client/documents", { method: "POST", body: { file_name: file.name, size: file.size } });
      if (!start.ok) { setError(`${file.name}: ${start.json.error || "upload failed"}`); continue; }
      const { error: upErr } = await supabase.storage.from(BUCKET).uploadToSignedUrl(start.json.path, start.json.token, file, { contentType: start.json.content_type });
      if (upErr) { setError(`${file.name}: ${upErr.message}`); continue; }
      const done = await api("/api/client/documents", { method: "PUT", body: { path: start.json.path, file_name: file.name } });
      if (!done.ok) { setError(`${file.name}: ${done.json.error || "upload failed"}`); continue; }
      setDocuments(d => [...d, done.json.document]);
    }
    setBusy("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function view(id) {
    const { ok, json } = await api(`/api/client/documents?id=${id}`);
    if (ok) window.open(json.url, "_blank", "noopener");
  }

  async function remove(id) {
    if (!confirm("Delete this document?")) return;
    const { ok, json } = await api(`/api/client/documents?id=${id}`, { method: "DELETE" });
    if (ok) setDocuments(d => d.filter(x => x.id !== id));
    else setError(json.error || "Couldn't delete the document");
  }

  return (
    <div>
      <div style={{ color: C.soft, fontSize: 13, lineHeight: 1.6, marginBottom: 14 }}>
        Upload anything that helps us answer like you would: FAQs, price lists, policies, scripts. PDF, DOCX or TXT, up to 10 MB each.
      </div>
      {documents.map(d => (
        <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 12px", marginBottom: 8 }}>
          <span>📄</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.file_name}</div>
            <div style={{ color: C.muted, fontSize: 11 }}>{formatSize(d.size_bytes)}</div>
          </div>
          <button onClick={() => view(d.id)} style={{ ...button("ghost"), padding: "5px 10px", fontSize: 12 }}>View</button>
          {!disabled && <button onClick={() => remove(d.id)} aria-label={`Delete ${d.file_name}`} style={{ ...button("ghost"), padding: "5px 10px", fontSize: 12, color: C.red }}>✕</button>}
        </div>
      ))}
      <input ref={fileRef} type="file" multiple accept=".pdf,.docx,.txt" style={{ display: "none" }} onChange={e => upload([...e.target.files])} />
      {!disabled && (
        <button onClick={() => fileRef.current?.click()} disabled={!!busy} style={{ ...button("ghost", !!busy), width: "100%", borderStyle: "dashed", marginTop: 4 }}>
          {busy || "＋ Upload documents"}
        </button>
      )}
      {error && <div style={{ color: C.red, fontSize: 12, marginTop: 8 }}>⚠ {error}</div>}
    </div>
  );
}

// Paso 2: formulario de onboarding. Se puede guardar a medias y terminar después.
// Ya enviado, sirve para ver y editar la información (pestaña Settings del dashboard).
// initial = { onboarding: { status, data }, documents }
// onSubmitted() primer envío · onFinishLater() "Save & finish later" · onClose() botón "← Dashboard"
// onSaved({ data }) y onDocumentsChange(documents) mantienen al día el dashboard
export function OnboardingForm({ initial, startSection, onSubmitted, onFinishLater, onClose, onSaved, onDocumentsChange }) {
  const submitted = initial.onboarding.status === "ready_for_setup";
  const [data, setData] = useState(initial.onboarding.data || {});
  const [documents, setDocuments] = useState(initial.documents || []);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    onDocumentsChange?.(documents);
  }, [documents]); // eslint-disable-line react-hooks/exhaustive-deps
  const [openId, setOpenId] = useState(startSection || SECTIONS.find(s => !sectionComplete(s, initial.onboarding.data, initial.documents?.length))?.id || SECTIONS[0].id);
  const [errors, setErrors] = useState({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState("");
  const [message, setMessage] = useState(null); // { type: "ok" | "error", text }

  const set = key => value => {
    setData(d => ({ ...d, [key]: value }));
    setDirty(true);
    if (errors[key]) setErrors(e => { const { [key]: _, ...rest } = e; return rest; });
  };

  async function save(submit = false) {
    setSaving(submit ? "submit" : "save");
    setMessage(null);
    if (submit) {
      const errs = formErrors(data);
      if (Object.keys(errs).length) {
        setErrors(errs);
        setOpenId(SECTIONS.find(s => s.fields.some(f => errs[f.key]))?.id);
        setMessage({ type: "error", text: "Please complete the required fields." });
        setSaving("");
        return false;
      }
    }
    const { ok, json } = await api("/api/client/onboarding", { method: "PUT", body: { data, submit } });
    setSaving("");
    if (!ok) {
      if (json.errors) {
        setErrors(json.errors);
        setOpenId(SECTIONS.find(s => s.fields.some(f => json.errors[f.key]))?.id || openId);
      }
      setMessage({ type: "error", text: json.error || "Something went wrong. Please try again." });
      return false;
    }
    setDirty(false);
    onSaved?.({ data });
    if (submit) onSubmitted?.();
    else setMessage({ type: "ok", text: submitted ? "Changes saved." : "Progress saved. You can finish later." });
    return true;
  }

  async function saveAndNext(index) {
    if (dirty && !(await save(false))) return;
    setMessage(null);
    setOpenId(SECTIONS[index + 1]?.id || null);
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <div style={{ ...card, padding: "24px 22px", marginBottom: 14 }}>
        {!submitted && <StepLabel n={2} of={2} />}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 6 }}>{submitted ? "Setup info" : "Let's set up your service"}</div>
            <div style={{ color: C.soft, fontSize: 14, lineHeight: 1.6, marginBottom: 18 }}>
              {submitted
                ? "This is the information we use to set up and answer your line. Keep it up to date."
                : "Tell us about your business so we can start answering your calls. You can save your progress and finish later."}
            </div>
          </div>
          {onClose && <button onClick={onClose} style={{ ...button("ghost"), padding: "8px 14px", fontSize: 13 }}>← Dashboard</button>}
        </div>
        <OnboardingChecklist data={data} docCount={documents.length} onPick={setOpenId} />
      </div>

      {SECTIONS.map((s, i) => {
        const open = openId === s.id;
        const ok = sectionComplete(s, data, documents.length);
        return (
          <div key={s.id} style={{ ...card, marginBottom: 10, overflow: "hidden" }}>
            <button onClick={() => setOpenId(open ? null : s.id)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", background: "transparent", border: "none",
              color: C.text, fontFamily: "inherit", cursor: "pointer", textAlign: "left",
            }}>
              <span style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900,
                background: ok ? `${C.green}26` : C.bg, color: ok ? C.green : C.muted, border: `1px solid ${ok ? C.green : C.border}`,
              }}>{ok ? "✓" : i + 1}</span>
              <span style={{ flex: 1, fontWeight: 800, fontSize: 15 }}>{s.title}{s.optional && <span style={{ color: C.muted, fontWeight: 500, fontSize: 12 }}> · optional</span>}</span>
              <span style={{ color: C.muted }}>{open ? "▲" : "▼"}</span>
            </button>
            {open && (
              <div style={{ padding: "4px 20px 20px" }}>
                {s.id === "documents" ? (
                  <Documents documents={documents} setDocuments={setDocuments} />
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
                    {s.fields.map(f => (
                      <div key={f.key} style={{ gridColumn: ["textarea", "multi"].includes(f.type) ? "1 / -1" : undefined }}>
                        <Field label={`${f.label}${f.required ? " *" : ""}`} error={errors[f.key]} hint={f.type === "readonly" ? "From your subscription" : undefined}>
                          <Input field={f} value={data[f.key]} onChange={set(f.key)} error={errors[f.key]} />
                        </Field>
                      </div>
                    ))}
                  </div>
                )}
                {i < SECTIONS.length - 1 && (
                  <button onClick={() => saveAndNext(i)} disabled={!!saving} style={{ ...button("ghost", !!saving), marginTop: 16 }}>
                    {dirty ? "Save & continue →" : "Next →"}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      <div style={{ ...card, padding: "18px 20px", marginTop: 14, position: "sticky", bottom: 12, background: C.cardDark, boxShadow: "0 8px 30px rgba(0,0,0,0.35)" }}>
        {message && <div style={{ color: message.type === "ok" ? C.green : C.red, fontSize: 13, marginBottom: 12 }}>{message.type === "ok" ? "✓" : "⚠"} {message.text}</div>}
        {submitted ? (
          <button onClick={() => save(false)} disabled={!!saving || !dirty} style={{ ...button("primary", !!saving || !dirty), width: "100%" }}>
            {saving === "save" ? "Saving..." : dirty ? "Save changes" : "All changes saved"}
          </button>
        ) : (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={async () => { if (await save(false)) onFinishLater?.(); }} disabled={!!saving} style={{ ...button("ghost", !!saving), flex: "1 1 160px" }}>
              {saving === "save" ? "Saving..." : "Save & finish later"}
            </button>
            <button onClick={() => save(true)} disabled={!!saving} style={{ ...button("primary", !!saving), flex: "2 1 220px" }}>
              {saving === "submit" ? "Submitting..." : "Submit for setup →"}
            </button>
          </div>
        )}
        <div style={{ color: C.muted, fontSize: 11, marginTop: 10 }}>We'll never ask for card numbers here. Billing is handled securely by Stripe.</div>
      </div>
    </div>
  );
}

