"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { agentApi, post } from "./agentApi";
import { supabase } from "../supabase";

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
function Badge({ label, color = "blue" }) {
  const map = {
    blue: { bg: C.blueDim, text: C.blue },
    green: { bg: C.greenDim, text: C.green },
    red: { bg: C.redDim, text: C.red },
    yellow: { bg: C.yellowDim, text: C.yellow },
    gray: { bg: C.bg, text: C.muted },
  };
  const s = map[color] || map.blue;
  return (
    <span style={{ background: s.bg, color: s.text, borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700, letterSpacing: 0.3, whiteSpace: "nowrap" }}>
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

const inputStyle = {
  width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px",
  fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box", color: C.text, background: C.surface,
};

function Field({ label, children, hint }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ color: C.muted, fontSize: 12, fontWeight: 700, marginBottom: 6, letterSpacing: 0.5 }}>{label}</div>
      {children}
      {hint && <div style={{ color: C.light, fontSize: 11, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

function Card({ children, style }) {
  return <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, ...style }}>{children}</div>;
}

function ErrorText({ children }) {
  if (!children) return null;
  return <div style={{ color: C.red, fontSize: 13, marginTop: 10 }}>⚠ {children}</div>;
}

function formatDuration(s) {
  if (s == null) return "—";
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function formatPhone(p) {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(p || "");
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : p || "";
}

// Carga las empresas (líneas) que todos los tabs necesitan
function useLines() {
  const [lines, setLines] = useState([]);
  const [error, setError] = useState("");
  const reload = useCallback(() => {
    return agentApi("/api/agent/lines")
      .then(d => { setLines(d.lines); setError(""); })
      .catch(e => setError(e.message));
  }, []);
  useEffect(() => { reload(); }, [reload]);
  return { lines, error, reload };
}

// ─── LLAMADAS ENTRANTES (TIEMPO REAL) ────────────────────────────────────────
// Si quien llama cuelga mientras suena, la fila se queda en "ringing";
// después de este tiempo ya no la mostramos.
const RING_WINDOW_MS = 3 * 60 * 1000;

// Escucha la tabla calls con Supabase Realtime y devuelve las que están sonando
function useRingingCalls() {
  const [calls, setCalls] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const { data, error: e } = await supabase
        .from("calls")
        .select("call_sid, from_number, to_number, business_name, language, status, created_at")
        .eq("status", "ringing")
        .gt("created_at", new Date(Date.now() - RING_WINDOW_MS).toISOString());
      if (e) setError(e.message);
      else setCalls(data || []);
    }

    const channel = supabase
      .channel("ringing-calls")
      .on("postgres_changes", { event: "*", schema: "public", table: "calls" }, ({ eventType, new: row }) => {
        if (eventType === "DELETE" || !row?.call_sid) return;
        setCalls(list => {
          const rest = list.filter(c => c.call_sid !== row.call_sid);
          return row.status === "ringing" ? [...rest, row] : rest;
        });
      })
      .subscribe(status => {
        // Al conectar (o reconectar) cargamos las que ya estaban sonando
        if (status === "SUBSCRIBED") { setError(""); load(); }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setError("Sin conexión en tiempo real. Reintentando...");
      });

    return () => { supabase.removeChannel(channel); };
  }, []);

  return { calls, error };
}

function IncomingCalls({ ringingHere }) {
  const { calls, error } = useRingingCalls();
  const [ignored, setIgnored] = useState([]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const visible = calls
    .filter(c => !ignored.includes(c.call_sid) && now - Date.parse(c.created_at) < RING_WINDOW_MS)
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));

  if (!visible.length && !error) return null;

  function ignore(call) {
    // Si suena en este teléfono, la rechazamos para que pase a otro agente
    if (ringingHere?.callSid === call.call_sid) ringingHere.reject();
    setIgnored(list => [...list, call.call_sid]);
  }

  return (
    <Card style={{ marginBottom: 24, overflow: "hidden", borderColor: visible.length ? C.blue : C.border }}>
      <div style={{ padding: "14px 20px", borderBottom: visible.length ? `1px solid ${C.border}` : "none", display: "flex", alignItems: "center", gap: 10 }}>
        {visible.length > 0 && <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.blue, animation: "ringPulse 1s infinite" }} />}
        <div style={{ fontWeight: 800, fontSize: 14, color: C.navy }}>
          📲 Llamadas entrantes {visible.length > 0 && `(${visible.length})`}
        </div>
        {error && <div style={{ color: C.red, fontSize: 12, marginLeft: "auto" }}>⚠ {error}</div>}
      </div>
      {visible.map(call => {
        const here = ringingHere?.callSid === call.call_sid;
        const ringSeconds = Math.max(0, Math.floor((now - Date.parse(call.created_at)) / 1000));
        return (
          <div key={call.call_sid} style={{ padding: "14px 20px", borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", background: here ? C.blueDim : C.surface }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: C.navy, fontFamily: "monospace" }}>{formatPhone(call.from_number) || "Número oculto"}</div>
              <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
                {call.business_name} · {!call.language ? "eligiendo idioma" : call.language === "es" ? "Español" : "English"}
              </div>
            </div>
            <div style={{ textAlign: "right", minWidth: 90 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 0.5 }}>SONANDO</div>
              <div style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 15, color: ringSeconds >= 30 ? C.red : C.text }}>{formatDuration(ringSeconds)}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="success" size="sm" onClick={() => ringingHere.accept()} disabled={!here}
                title={here ? "" : "Esta llamada no está sonando en tu teléfono"}>Contestar</Btn>
              <Btn variant="ghost" size="sm" onClick={() => ignore(call)}>Ignorar</Btn>
            </div>
          </div>
        );
      })}
      <style>{`@keyframes ringPulse { 0%,100%{opacity:1} 50%{opacity:0.25} }`}</style>
    </Card>
  );
}

// ─── EMPRESAS (ADMIN) ────────────────────────────────────────────────────────
const emptyLine = { phone_number: "", business_name: "", owner_whatsapp: "", notes: "", client_email: "" };

function CompaniesTab({ lines, reloadLines, linesError }) {
  const [selected, setSelected] = useState(null); // phone_number, o "new"
  const [form, setForm] = useState(emptyLine);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [docs, setDocs] = useState([]);
  const [docTitle, setDocTitle] = useState("");
  const [docText, setDocText] = useState("");
  const [docError, setDocError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    if (!selected && lines.length) setSelected(lines[0].phone_number);
  }, [lines, selected]);

  useEffect(() => {
    setError(""); setDocError("");
    if (selected === "new" || !selected) { setForm(emptyLine); setDocs([]); return; }
    const line = lines.find(l => l.phone_number === selected);
    if (line) setForm({ ...emptyLine, ...line, owner_whatsapp: line.owner_whatsapp || "", notes: line.notes || "", client_email: line.client_email || "" });
    agentApi(`/api/agent/docs?phone=${encodeURIComponent(selected)}`)
      .then(d => setDocs(d.docs))
      .catch(e => setDocError(e.message));
  }, [selected, lines]);

  async function saveLine() {
    setSaving(true); setError("");
    try {
      const { line } = await post("/api/agent/lines", form);
      await reloadLines();
      setSelected(line.phone_number);
    } catch (e) { setError(e.message); }
    setSaving(false);
  }

  async function deleteLine() {
    if (!window.confirm(`¿Borrar ${form.business_name} y todos sus documentos?`)) return;
    try {
      await agentApi(`/api/agent/lines?phone=${encodeURIComponent(selected)}`, { method: "DELETE" });
      setSelected(null);
      await reloadLines();
    } catch (e) { setError(e.message); }
  }

  async function addDoc() {
    setUploading(true); setDocError("");
    try {
      const { doc } = await post("/api/agent/docs", { phone_number: selected, title: docTitle, content: docText });
      setDocs(d => [...d, doc]);
      setDocTitle(""); setDocText("");
      reloadLines();
    } catch (e) { setDocError(e.message); }
    setUploading(false);
  }

  async function deleteDoc(id) {
    if (!window.confirm("¿Borrar este documento?")) return;
    try {
      await agentApi(`/api/agent/docs?id=${id}`, { method: "DELETE" });
      setDocs(d => d.filter(x => x.id !== id));
      reloadLines();
    } catch (e) { setDocError(e.message); }
  }

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setDocTitle(file.name.replace(/\.[^.]+$/, ""));
    const reader = new FileReader();
    reader.onload = ev => setDocText(ev.target.result);
    reader.readAsText(file);
    e.target.value = "";
  }

  const isNew = selected === "new";
  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 24, alignItems: "start" }}>
      {/* Lista de empresas */}
      <Card style={{ overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, fontWeight: 800, fontSize: 14, color: C.navy, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          🏢 Empresas
          <Btn size="sm" onClick={() => setSelected("new")}>+ Nueva</Btn>
        </div>
        {linesError && <div style={{ padding: 16 }}><ErrorText>{linesError}</ErrorText></div>}
        {lines.length === 0 && !linesError && (
          <div style={{ padding: 20, color: C.light, fontSize: 13 }}>Todavía no hay empresas. Crea la primera.</div>
        )}
        {lines.map(l => (
          <div key={l.phone_number} onClick={() => setSelected(l.phone_number)} style={{
            padding: "14px 20px", cursor: "pointer", borderBottom: `1px solid ${C.border}`,
            background: selected === l.phone_number ? C.blueDim : "transparent",
            borderLeft: selected === l.phone_number ? `3px solid ${C.blue}` : "3px solid transparent",
          }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: selected === l.phone_number ? C.blue : C.text }}>{l.business_name}</div>
            <div style={{ color: C.light, fontSize: 12, marginTop: 2 }}>{formatPhone(l.phone_number)} · {l.doc_count} docs {l.owner_whatsapp ? "· 💬" : ""}</div>
          </div>
        ))}
      </Card>

      {/* Detalle */}
      <div>
        {!selected ? (
          <Card style={{ border: `2px dashed ${C.border}`, padding: 60, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏢</div>
            <div style={{ color: C.muted, fontSize: 15 }}>Crea una empresa para empezar</div>
          </Card>
        ) : (
          <>
            <Card style={{ padding: 28, marginBottom: 20 }}>
              <div style={{ fontWeight: 900, fontSize: 20, color: C.navy, marginBottom: 20 }}>
                {isNew ? "Nueva empresa" : form.business_name}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="NOMBRE DE LA EMPRESA" hint="Es lo que escucha quien llama">
                  <input value={form.business_name} onChange={set("business_name")} placeholder="ABC Plumbing" style={inputStyle} />
                </Field>
                <Field label="NÚMERO DE TWILIO" hint={isNew ? "El número al que llaman los clientes" : "No se puede cambiar"}>
                  <input value={form.phone_number} onChange={set("phone_number")} disabled={!isNew} placeholder="+1 910 555 1234" style={{ ...inputStyle, background: isNew ? C.surface : C.bg }} />
                </Field>
              </div>
              <Field label="WHATSAPP DEL DUEÑO" hint="Aquí llega el resumen de cada llamada. Déjalo vacío para no mandar nada.">
                <input value={form.owner_whatsapp} onChange={set("owner_whatsapp")} placeholder="+1 910 555 9876" style={inputStyle} />
              </Field>
              <Field label="EMAIL DEL CLIENTE" hint="Con este email entra el cliente para ver las llamadas de esta empresa en su dashboard.">
                <input type="email" value={form.client_email} onChange={set("client_email")} placeholder="dueno@empresa.com" style={inputStyle} />
              </Field>
              <Field label="INSTRUCCIONES PARA LOS AGENTES" hint="Ej: 'Si es emergencia de agua, marca urgente.' La IA también las lee.">
                <textarea value={form.notes} onChange={set("notes")} rows={3} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
              </Field>
              <div style={{ display: "flex", gap: 10 }}>
                <Btn onClick={saveLine} disabled={saving || !form.business_name.trim() || !form.phone_number.trim()}>
                  {saving ? "Guardando..." : isNew ? "Crear empresa" : "Guardar cambios"}
                </Btn>
                {!isNew && <Btn variant="ghost" onClick={deleteLine}>Borrar</Btn>}
              </div>
              <ErrorText>{error}</ErrorText>
            </Card>

            {!isNew && (
              <Card style={{ padding: 28 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: C.navy, marginBottom: 4 }}>📚 Documentos para la IA</div>
                <div style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>Políticas, precios, horarios, FAQ... El asistente responde solo con esto.</div>

                {docs.map(doc => (
                  <div key={doc.id} style={{ padding: "10px 0", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span>📄</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{doc.title}</div>
                        <div style={{ color: C.light, fontSize: 11 }}>{doc.content.length.toLocaleString()} caracteres</div>
                      </div>
                    </div>
                    <Btn size="sm" variant="ghost" onClick={() => deleteDoc(doc.id)}>Borrar</Btn>
                  </div>
                ))}

                <div style={{ marginTop: 20 }}>
                  <Field label="TÍTULO">
                    <input value={docTitle} onChange={e => setDocTitle(e.target.value)} placeholder="Política de reembolsos, Lista de precios..." style={inputStyle} />
                  </Field>
                  <Field label="CONTENIDO">
                    <textarea value={docText} onChange={e => setDocText(e.target.value)}
                      placeholder="Pega aquí el documento..."
                      style={{ ...inputStyle, minHeight: 160, resize: "vertical", lineHeight: 1.6 }} />
                  </Field>
                  <input ref={fileRef} type="file" accept=".txt,.md,.csv" onChange={handleFile} style={{ display: "none" }} />
                  <div style={{ display: "flex", gap: 10 }}>
                    <Btn variant="secondary" size="sm" onClick={() => fileRef.current.click()}>📎 Subir .txt</Btn>
                    <Btn onClick={addDoc} disabled={!docText.trim() || uploading} style={{ flex: 1, justifyContent: "center" }}>
                      {uploading ? "Guardando..." : "Agregar documento"}
                    </Btn>
                  </div>
                  <ErrorText>{docError}</ErrorText>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── AGENTES (ADMIN) ─────────────────────────────────────────────────────────
function AgentsTab({ lines }) {
  const [agents, setAgents] = useState([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const reload = useCallback(() => {
    agentApi("/api/agent/agents").then(d => setAgents(d.agents)).catch(e => setError(e.message));
  }, []);
  useEffect(() => { reload(); }, [reload]);

  async function addAgent() {
    setError("");
    try { await post("/api/agent/agents", { email }); setEmail(""); reload(); }
    catch (e) { setError(e.message); }
  }

  async function removeAgent(a) {
    if (!window.confirm(`¿Quitarle el acceso a ${a.email}?`)) return;
    try { await agentApi(`/api/agent/agents?email=${encodeURIComponent(a.email)}`, { method: "DELETE" }); reload(); }
    catch (e) { setError(e.message); }
  }

  async function update(a, changes) {
    setAgents(list => list.map(x => (x.email === a.email ? { ...x, ...changes } : x)));
    try { await post("/api/agent/agents", { agent_id: a.agent_id, ...changes }); }
    catch (e) { setError(e.message); reload(); }
  }

  function toggleLine(a, phone) {
    const next = a.lines.includes(phone) ? a.lines.filter(p => p !== phone) : [...a.lines, phone];
    update(a, { lines: next });
  }

  return (
    <div>
      <Card style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: C.navy, marginBottom: 4 }}>+ Dar acceso a un agente</div>
        <div style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>
          El agente también necesita una cuenta en Supabase con ese correo (Authentication → Users → Add user).
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <input value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && addAgent()}
            placeholder="agente@correo.com" style={{ ...inputStyle, flex: 1 }} />
          <Btn onClick={addAgent} disabled={!email.trim()}>Agregar</Btn>
        </div>
        <ErrorText>{error}</ErrorText>
      </Card>

      <Card style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: C.bg }}>
              {["Agente", "Estado", "Atiende todas las líneas", "Líneas asignadas (suenan primero)", ""].map(h => (
                <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 0.8 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {agents.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 20, color: C.light, fontSize: 13 }}>Todavía no hay agentes.</td></tr>
            )}
            {agents.map(a => (
              <tr key={a.email} style={{ borderTop: `1px solid ${C.border}`, verticalAlign: "top" }}>
                <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 700, color: C.navy }}>{a.email}</td>
                <td style={{ padding: "14px 16px" }}>
                  {!a.agent_id ? <Badge label="No ha entrado" color="gray" />
                    : a.in_call ? <Badge label="En llamada" color="yellow" />
                    : a.online ? <Badge label="Disponible" color="green" />
                    : <Badge label="Desconectado" color="gray" />}
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <input type="checkbox" checked={a.is_pool} disabled={!a.agent_id} onChange={e => update(a, { is_pool: e.target.checked })} />
                </td>
                <td style={{ padding: "14px 16px", fontSize: 13 }}>
                  {!a.agent_id ? <span style={{ color: C.light }}>Podrás asignarle líneas cuando entre por primera vez</span>
                    : lines.length === 0 ? <span style={{ color: C.light }}>No hay empresas</span>
                    : lines.map(l => (
                      <label key={l.phone_number} style={{ display: "block", marginBottom: 4, cursor: "pointer" }}>
                        <input type="checkbox" checked={a.lines.includes(l.phone_number)} onChange={() => toggleLine(a, l.phone_number)} /> {l.business_name}
                      </label>
                    ))}
                </td>
                <td style={{ padding: "14px 16px" }}><Btn size="sm" variant="ghost" onClick={() => removeAgent(a)}>Quitar</Btn></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ─── NOTA DE LA LLAMADA ──────────────────────────────────────────────────────
const emptyNote = { callerName: "", callerPhone: "", reason: "", note: "", urgent: false, sendWhatsapp: true };

function CallNote({ liveCall, line, onFinishCall }) {
  const [form, setForm] = useState(emptyNote);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // respuesta de /api/agent/note

  // Nueva llamada → nota limpia con el teléfono de quien llama
  useEffect(() => {
    setForm({ ...emptyNote, callerPhone: liveCall.from || "", sendWhatsapp: true });
    setResult(null);
    setError("");
  }, [liveCall.callSid]);

  // Si guardó la nota antes de colgar, al colgar queda libre
  useEffect(() => {
    if (liveCall.ended && result) onFinishCall();
  }, [liveCall.ended, result]);

  async function save() {
    setSaving(true); setError("");
    try {
      const res = await post("/api/agent/note", { callSid: liveCall.callSid, ...form, sendWhatsapp: form.sendWhatsapp && !!line?.owner_whatsapp });
      setResult(res);
    } catch (e) { setError(e.message); }
    setSaving(false);
  }

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const canWhatsapp = !!line?.owner_whatsapp;

  if (result) {
    return (
      <Card style={{ padding: 20, background: C.greenDim, borderColor: C.greenBorder }}>
        <div style={{ fontWeight: 800, color: C.green, marginBottom: 6 }}>✅ Nota guardada</div>
        <div style={{ fontSize: 13, color: C.text }}>
          {result.whatsapp_status === "sent" && "Resumen enviado por WhatsApp."}
          {result.whatsapp_status === "failed" && <span style={{ color: C.red }}>No se pudo mandar el WhatsApp: {result.whatsapp_error}</span>}
          {result.whatsapp_status === "skipped" && "No se mandó WhatsApp."}
        </div>
        {!liveCall.ended && <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>Quedarás libre en cuanto termine la llamada.</div>}
      </Card>
    );
  }

  return (
    <Card style={{ padding: 20 }}>
      <div style={{ fontWeight: 800, fontSize: 14, color: C.navy, marginBottom: 14 }}>📝 Nota de la llamada</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="NOMBRE">
          <input value={form.callerName} onChange={set("callerName")} placeholder="John Smith" style={inputStyle} />
        </Field>
        <Field label="TELÉFONO">
          <input value={form.callerPhone} onChange={set("callerPhone")} style={inputStyle} />
        </Field>
      </div>
      <Field label="MOTIVO">
        <input value={form.reason} onChange={set("reason")} placeholder="Quiere agendar una cita" style={inputStyle} />
      </Field>
      <Field label="NOTA">
        <textarea value={form.note} onChange={set("note")} rows={4}
          placeholder="Detalles: dirección, horario preferido, qué se le prometió..."
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
      </Field>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.red, fontWeight: 700, marginBottom: 8, cursor: "pointer" }}>
        <input type="checkbox" checked={form.urgent} onChange={set("urgent")} /> Urgente
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: canWhatsapp ? C.text : C.light, marginBottom: 14, cursor: canWhatsapp ? "pointer" : "default" }}>
        <input type="checkbox" checked={form.sendWhatsapp && canWhatsapp} disabled={!canWhatsapp} onChange={set("sendWhatsapp")} />
        {canWhatsapp ? `Mandar resumen por WhatsApp a ${formatPhone(line.owner_whatsapp)}` : "Esta empresa no tiene WhatsApp configurado"}
      </label>
      <Btn variant="success" onClick={save} disabled={saving} style={{ width: "100%", justifyContent: "center" }}>
        {saving ? "Guardando..." : form.sendWhatsapp && canWhatsapp ? "Guardar y mandar resumen" : "Guardar nota"}
      </Btn>
      {liveCall.ended && (
        <button onClick={() => window.confirm("¿Terminar sin guardar nota?") && onFinishCall()} style={{
          background: "none", border: "none", color: C.light, fontSize: 12, marginTop: 10, cursor: "pointer", width: "100%", fontFamily: "inherit",
        }}>Terminar sin nota</button>
      )}
      <ErrorText>{error}</ErrorText>
    </Card>
  );
}

// ─── LLAMADA (ASISTENTE + NOTA) ──────────────────────────────────────────────
function AgentTab({ lines, liveCall, onFinishCall }) {
  const [practicePhone, setPracticePhone] = useState("");
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [callTime, setCallTime] = useState(0);
  const bottomRef = useRef(null);

  const phone = liveCall ? liveCall.to : practicePhone;
  const line = lines.find(l => l.phone_number === phone);

  // Cambia la empresa → conversación nueva
  useEffect(() => { setMessages([]); setQuestion(""); }, [phone, liveCall?.callSid]);

  useEffect(() => {
    setCallTime(0);
    if (!liveCall || liveCall.ended) return;
    const id = setInterval(() => setCallTime(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [liveCall?.callSid, liveCall?.ended]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function askAI(text) {
    const q = (text ?? question).trim();
    if (!q || !phone || loading) return;
    const history = [...messages.filter(m => !m.error), { role: "user", content: q }];
    setMessages(prev => [...prev, { role: "user", content: q }]);
    setQuestion("");
    setLoading(true);
    try {
      const { reply } = await post("/api/agent/assist", { phone_number: phone, messages: history });
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: `⚠️ ${e.message}`, error: true }]);
    }
    setLoading(false);
  }

  const ready = !!phone;
  const quick = liveCall?.lang === "es"
    ? ["¿Cuál es el horario?", "¿Cuánto cuesta el servicio?", "El cliente quiere cancelar", "¿Cuál es la política de reembolso?", "¿Qué hago si es una emergencia?"]
    : ["What are your business hours?", "How much does the service cost?", "Customer wants to cancel", "What's the refund policy?", "What if it's an emergency?"];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 24, alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Estado de la llamada */}
        <Card style={{
          padding: 20,
          background: liveCall && !liveCall.ended ? C.greenDim : liveCall ? C.yellowDim : C.surface,
          borderColor: liveCall && !liveCall.ended ? C.greenBorder : liveCall ? C.yellowBorder : C.border,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: liveCall ? 12 : 0 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: liveCall && !liveCall.ended ? C.green : liveCall ? C.yellow : C.light }} />
            <div style={{ fontWeight: 700, fontSize: 14, color: liveCall && !liveCall.ended ? C.green : liveCall ? C.yellow : C.muted }}>
              {!liveCall ? "Sin llamada activa" : liveCall.ended ? "Llamada terminada · llena la nota" : `En llamada · ${formatDuration(callTime)}`}
            </div>
          </div>
          {liveCall && (
            <div style={{ fontSize: 13, color: C.text, lineHeight: 1.7 }}>
              <div><strong>Empresa:</strong> {line?.business_name || liveCall.business}</div>
              <div><strong>Llama:</strong> {formatPhone(liveCall.from)}</div>
              <div><strong>Idioma:</strong> {liveCall.lang === "es" ? "Español" : "English"}</div>
              {line?.notes && (
                <div style={{ marginTop: 10, padding: 10, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, whiteSpace: "pre-wrap" }}>
                  📌 {line.notes}
                </div>
              )}
            </div>
          )}
          {!liveCall && (
            <div style={{ marginTop: 14 }}>
              <Field label="CONSULTAR UNA EMPRESA (SIN LLAMADA)">
                <select value={practicePhone} onChange={e => setPracticePhone(e.target.value)} style={inputStyle}>
                  <option value="">Elige empresa...</option>
                  {lines.map(l => <option key={l.phone_number} value={l.phone_number}>{l.business_name}</option>)}
                </select>
              </Field>
              <div style={{ color: C.light, fontSize: 12 }}>Cuando contestes una llamada, la empresa se carga sola.</div>
            </div>
          )}
        </Card>

        {liveCall && <CallNote liveCall={liveCall} line={line} onFinishCall={onFinishCall} />}

        {ready && (
          <Card style={{ padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: C.muted, marginBottom: 10, letterSpacing: 0.5 }}>PREGUNTAS RÁPIDAS</div>
            {quick.map(q => (
              <button key={q} onClick={() => askAI(q)} disabled={loading} style={{
                display: "block", width: "100%", textAlign: "left", background: C.bg,
                border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px",
                fontSize: 12, color: C.text, cursor: "pointer", fontFamily: "inherit", marginBottom: 6
              }}>{q}</button>
            ))}
          </Card>
        )}
      </div>

      {/* Chat con la IA */}
      <Card style={{ overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 540 }}>
        <div style={{ padding: "18px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: C.navy }}>🤖 Asistente IA</div>
            <div style={{ color: C.muted, fontSize: 12 }}>
              {line ? `Responde con los documentos de ${line.business_name} (${line.doc_count} docs)` : "Pregunta y te da las palabras exactas"}
            </div>
          </div>
          {liveCall && !liveCall.ended && <Badge label="En vivo" color="green" />}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 14, minHeight: 360 }}>
          {!ready && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎧</div>
              <div style={{ color: C.muted, fontSize: 15, fontWeight: 600 }}>Conéctate en el teléfono (abajo a la derecha) para recibir llamadas</div>
              <div style={{ color: C.light, fontSize: 13, marginTop: 6 }}>o elige una empresa para consultar sus políticas</div>
            </div>
          )}
          {ready && messages.length === 0 && (
            <div style={{ color: C.light, fontSize: 13, textAlign: "center", padding: 30 }}>
              Escribe lo que pregunta el cliente y te digo qué responder.
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "85%",
                background: m.role === "user" ? C.blue : m.error ? C.redDim : C.bg,
                color: m.role === "user" ? C.white : C.text,
                border: m.role !== "user" ? `1px solid ${C.border}` : "none",
                borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                padding: "12px 16px", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap"
              }}>
                {m.role === "assistant" && !m.error && (
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, marginBottom: 6, letterSpacing: 0.5 }}>🤖 ASISTENTE</div>
                )}
                {m.content}
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
            disabled={!ready}
            placeholder={ready ? "¿Qué pregunta el cliente?" : "Elige una empresa primero..."}
            style={{ ...inputStyle, flex: 1, padding: "11px 14px", fontSize: 14, background: ready ? C.surface : C.bg }} />
          <Btn onClick={() => askAI()} disabled={!ready || !question.trim() || loading} style={{ padding: "11px 18px" }}>→</Btn>
        </div>
      </Card>
      <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-8px)} }`}</style>
    </div>
  );
}

// ─── REGISTRO DE LLAMADAS ────────────────────────────────────────────────────
const STATUS = {
  ringing: { label: "Sonando", color: "blue" },
  answered: { label: "En curso", color: "blue" },
  completed: { label: "Atendida", color: "green" },
  voicemail: { label: "Buzón", color: "yellow" },
  missed: { label: "Perdida", color: "red" },
  outbound: { label: "↗ Saliente", color: "blue" },
  outbound_done: { label: "↗ Saliente", color: "green" },
  outbound_missed: { label: "↗ Sin respuesta", color: "gray" },
};
const WHATSAPP = {
  sent: { label: "💬 Enviado", color: "green" },
  failed: { label: "💬 Falló", color: "red" },
  skipped: { label: "💬 No enviado", color: "gray" },
};

function CallLogTab({ isAdmin }) {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(() => {
    setLoading(true);
    agentApi("/api/agent/calls")
      .then(d => { setCalls(d.calls); setError(""); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const today = new Date().toDateString();
  const todays = calls.filter(c => new Date(c.created_at).toDateString() === today);
  const count = s => todays.filter(c => c.status === s).length;

  return (
    <Card style={{ overflow: "hidden" }}>
      <div style={{ padding: "18px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: C.navy }}>📋 {isAdmin ? "Todas las llamadas" : "Mis llamadas"}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Badge label={`${todays.length} hoy`} color="blue" />
          <Badge label={`${count("completed")} atendidas`} color="green" />
          <Badge label={`${count("voicemail")} buzón`} color="yellow" />
          <Badge label={`${count("missed")} perdidas`} color="red" />
          <Btn size="sm" variant="secondary" onClick={reload} disabled={loading}>{loading ? "..." : "↻ Actualizar"}</Btn>
        </div>
      </div>
      {error && <div style={{ padding: 20 }}><ErrorText>{error}</ErrorText></div>}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: C.bg }}>
              {["Fecha", "Empresa", "Cliente", "Nota", "Agente", "Duración", "Estado"].map(h => (
                <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 0.8 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!loading && calls.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 20, color: C.light, fontSize: 13 }}>Todavía no hay llamadas.</td></tr>
            )}
            {calls.map(call => {
              const st = STATUS[call.status] || { label: call.status || "—", color: "gray" };
              const wa = WHATSAPP[call.whatsapp_status];
              return (
                <tr key={call.id} style={{ borderTop: `1px solid ${C.border}`, verticalAlign: "top" }}>
                  <td style={{ padding: "14px 16px", fontSize: 12, color: C.muted, whiteSpace: "nowrap" }}>
                    {new Date(call.created_at).toLocaleString("es-US", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 700, color: C.navy }}>{call.business_name}</td>
                  <td style={{ padding: "14px 16px", fontSize: 13, color: C.text }}>
                    {call.caller_name && <div style={{ fontWeight: 600 }}>{call.caller_name}</div>}
                    <div style={{ color: C.muted, fontFamily: "monospace", fontSize: 12 }}>{formatPhone(call.caller_phone || call.from_number)}</div>
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 13, color: C.text, maxWidth: 320 }}>
                    {call.urgent && <Badge label="Urgente" color="red" />}
                    {call.reason && <div style={{ fontWeight: 600, marginTop: call.urgent ? 6 : 0 }}>{call.reason}</div>}
                    {call.note && <div style={{ color: C.muted, fontSize: 12, whiteSpace: "pre-wrap" }}>{call.note}</div>}
                    {!call.reason && !call.note && !call.urgent && <span style={{ color: C.light }}>—</span>}
                    {wa && <div style={{ marginTop: 6 }} title={call.whatsapp_error || ""}><Badge label={wa.label} color={wa.color} /></div>}
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 13, color: C.text }}>{call.agent_email || "—"}</td>
                  <td style={{ padding: "14px 16px", fontSize: 13, color: C.muted, fontFamily: "monospace" }}>{formatDuration(call.duration_seconds)}</td>
                  <td style={{ padding: "14px 16px" }}><Badge label={st.label} color={st.color} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function AgentPanel({ me, liveCall, ringingHere, onFinishCall, onLogout }) {
  const tabs = [
    { id: "agent", label: "🎧 Llamada", sub: "Asistente y nota" },
    { id: "calls", label: "📋 Registro", sub: "Historial" },
    ...(me.isAdmin ? [
      { id: "companies", label: "🏢 Empresas", sub: "Números y documentos" },
      { id: "agents", label: "👥 Agentes", sub: "Acceso y líneas" },
    ] : []),
  ];
  const [tab, setTab] = useState("agent");
  const { lines, error: linesError, reload: reloadLines } = useLines();

  // Al contestar una llamada, mostramos el tab de la llamada
  useEffect(() => { if (liveCall) setTab("agent"); }, [liveCall?.callSid]);

  const inCall = liveCall && !liveCall.ended;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", color: C.text, paddingBottom: 200 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800;900&display=swap" rel="stylesheet" />

      {/* HEADER */}
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: "0 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ background: C.blue, borderRadius: 12, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📞</div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 18, color: C.navy, letterSpacing: -0.5 }}>CallByDani · Agentes</div>
              <div style={{ color: C.muted, fontSize: 11 }}>{me.email}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: me.onlineCount ? C.green : C.light }} />
              <span style={{ color: C.muted, fontSize: 13 }}>{me.onlineCount} {me.onlineCount === 1 ? "agente conectado" : "agentes conectados"}</span>
            </div>
            {me.isAdmin && <Badge label="Admin" color="blue" />}
            <Btn size="sm" variant="ghost" onClick={onLogout} disabled={inCall} title={inCall ? "Termina la llamada primero" : ""}>Cerrar sesión</Btn>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", overflowX: "auto" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
              padding: "16px 28px", borderBottom: tab === t.id ? `2px solid ${C.blue}` : "2px solid transparent",
            }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: tab === t.id ? C.blue : C.muted, whiteSpace: "nowrap" }}>{t.label}</div>
              <div style={{ fontSize: 11, color: C.light, marginTop: 1, whiteSpace: "nowrap" }}>{t.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px" }}>
        <IncomingCalls ringingHere={ringingHere} />
        {tab === "agent" && <AgentTab lines={lines} liveCall={liveCall} onFinishCall={onFinishCall} />}
        {tab === "calls" && <CallLogTab isAdmin={me.isAdmin} />}
        {tab === "companies" && me.isAdmin && <CompaniesTab lines={lines} reloadLines={reloadLines} linesError={linesError} />}
        {tab === "agents" && me.isAdmin && <AgentsTab lines={lines} />}
      </div>
    </div>
  );
}
