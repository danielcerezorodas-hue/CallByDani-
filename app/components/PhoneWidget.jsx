"use client";

// Teléfono del agente: recibe y hace llamadas de Twilio directo en el navegador.
import { useState, useRef, useEffect } from "react";
import { agentApi, post } from "./agentApi";

const C = {
  navy: "#1a2e4a",
  navyDark: "#0f1e30",
  blue: "#0ea5e9",
  sky: "#38bdf8",
  white: "#ffffff",
  muted: "#94a3b8",
  green: "#22c55e",
  red: "#ef4444",
};

const HEARTBEAT_MS = 60 * 1000;

const api = post;

function formatTime(s) {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

// "(910) 555-1234", "9105551234" o "+1 910..." → "+19105551234" (null si no es un número de EE. UU./Canadá)
function toE164(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 10) return "+1" + digits;
  if (digits.length === 11 && digits.startsWith("1")) return "+" + digits;
  return null;
}

function formatPhone(p) {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(p || "");
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : p || "";
}

const dark = {
  width: "100%", background: "#1a2e4a", border: "1px solid #2a4060", borderRadius: 8, color: "#ffffff",
  padding: "9px 10px", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box",
};

function Keypad({ onPress }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 10 }}>
      {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map(k => (
        <button key={k} onClick={() => onPress(k)} style={{
          background: "#1a2e4a", border: "1px solid #2a4060", borderRadius: 8, color: "#ffffff",
          padding: "9px 0", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
        }}>{k}</button>
      ))}
    </div>
  );
}

function param(call, name) {
  return call?.customParameters?.get?.(name) || "";
}

// onCallStart({ callSid, from, to, business, lang }) se llama al contestar.
// onCallEnd() se llama al colgar. Mientras wrapUp sea true (el agente llena la nota)
// no se aceptan llamadas nuevas.
// onIncoming({ callSid, accept, reject }) avisa qué llamada suena en este teléfono (o null),
// para que el panel también pueda contestarla.
export default function PhoneWidget({ onCallStart, onCallEnd, onIncoming, wrapUp = false }) {
  const [status, setStatus] = useState("offline"); // offline | connecting | online
  const [error, setError] = useState("");
  const [incoming, setIncoming] = useState(null);
  const [active, setActive] = useState(null);
  const [muted, setMuted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  // Llamada en curso: { business, from, lang, outbound, connected }
  const [activeInfo, setActiveInfo] = useState(null);
  // Marcador para llamar
  const [canCallOut, setCanCallOut] = useState(false);
  const [lines, setLines] = useState([]);
  const [dialTo, setDialTo] = useState("");
  const [dialLine, setDialLine] = useState("");
  const [showPad, setShowPad] = useState(false);
  const deviceRef = useRef(null);
  const activeRef = useRef(null);
  const heartbeatRef = useRef(null);
  const timerRef = useRef(null);
  const connectedRef = useRef(false); // la llamada actual llegó a conectar (para la nota)
  const wrapUpRef = useRef(wrapUp);
  useEffect(() => { wrapUpRef.current = wrapUp; }, [wrapUp]);

  useEffect(() => {
    onIncoming?.(incoming ? { callSid: param(incoming, "parentCallSid"), accept, reject } : null);
  }, [incoming]);

  // Al salir del panel (o cerrar sesión) se desconecta el teléfono
  useEffect(() => () => {
    if (deviceRef.current) api("/api/twilio/agent-status", { online: false }).catch(() => {});
    shutdown();
  }, []);

  function shutdown() {
    clearInterval(heartbeatRef.current);
    clearInterval(timerRef.current);
    try { deviceRef.current?.destroy(); } catch {}
    deviceRef.current = null;
  }

  async function goOnline() {
    setError("");
    setStatus("connecting");
    try {
      const { Device } = await import("@twilio/voice-sdk");
      const { token, canCallOut } = await api("/api/twilio/token");
      setCanCallOut(!!canCallOut);
      if (canCallOut) {
        agentApi("/api/agent/lines").then(({ lines }) => {
          setLines(lines);
          setDialLine(l => l || lines[0]?.phone_number || "");
        }).catch(() => {});
      }
      const device = new Device(token, { codecPreferences: ["opus", "pcmu"], closeProtection: true });

      device.on("error", err => setError(err?.message || "Phone error"));
      device.on("tokenWillExpire", async () => {
        try { const { token } = await api("/api/twilio/token"); device.updateToken(token); } catch {}
      });
      device.on("incoming", call => {
        // Si ya está en una llamada o llenando la nota, rechaza la nueva para que suene a otro agente
        if (activeRef.current || wrapUpRef.current) { call.reject(); return; }
        setIncoming(call);
        const clear = () => setIncoming(c => (c === call ? null : c));
        call.on("cancel", clear);
        call.on("reject", clear);
        call.on("disconnect", clear);
      });

      await device.register();
      deviceRef.current = device;
      await api("/api/twilio/agent-status", { online: true });
      heartbeatRef.current = setInterval(() => {
        api("/api/twilio/agent-status", { online: true }).catch(() => {});
      }, HEARTBEAT_MS);
      setStatus("online");
    } catch (err) {
      shutdown();
      setStatus("offline");
      setError(err.message || "Could not connect the phone");
    }
  }

  async function goOffline() {
    if (activeRef.current) return;
    shutdown();
    setStatus("offline");
    await api("/api/twilio/agent-status", { online: false }).catch(() => {});
  }

  function accept() {
    const call = incoming;
    if (!call) return;
    call.accept();
    setIncoming(null);
    activeRef.current = call;
    setActive(call);
    connectedRef.current = true;
    setActiveInfo({ business: param(call, "business"), from: param(call, "from"), lang: param(call, "lang"), connected: true });
    setMuted(false);
    setShowPad(false);
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    api("/api/twilio/answered", { parentCallSid: param(call, "parentCallSid") }).catch(() => {});
    onCallStart?.({
      callSid: param(call, "parentCallSid"),
      from: param(call, "from"),
      to: param(call, "to"),
      business: param(call, "business"),
      lang: param(call, "lang"),
    });
    call.on("disconnect", endCall);
    call.on("error", endCall);
  }

  function endCall() {
    if (!activeRef.current) return; // "disconnect" y "error" pueden llegar los dos
    clearInterval(timerRef.current);
    const wasConnected = connectedRef.current;
    connectedRef.current = false;
    activeRef.current = null;
    setActive(null);
    setActiveInfo(null);
    setMuted(false);
    setShowPad(false);
    // Saliente que nadie contestó: no hay nota que llenar
    if (!wasConnected) return;
    // Sigue "en llamada" hasta que guarde la nota; la página lo libera después
    if (onCallEnd) onCallEnd();
    else api("/api/twilio/agent-status", { inCall: false, online: true }).catch(() => {});
  }

  // Llamada saliente desde el marcador
  async function callOut() {
    const to = toE164(dialTo);
    if (!to) { setError("Escribe un número de 10 dígitos (EE. UU./Canadá)"); return; }
    if (!dialLine) { setError("Elige desde qué empresa llamar"); return; }
    if (!deviceRef.current || activeRef.current || incoming || wrapUp) return;
    setError("");
    const business = lines.find(l => l.phone_number === dialLine)?.business_name || "";
    try {
      const call = await deviceRef.current.connect({ params: { To: to, Line: dialLine } });
      activeRef.current = call;
      setActive(call);
      connectedRef.current = false;
      setActiveInfo({ business, from: to, lang: "", outbound: true, connected: false });
      setMuted(false);
      setSeconds(0);
      // Con answerOnBridge, "accept" llega cuando el cliente contesta
      call.on("accept", () => {
        connectedRef.current = true;
        setActiveInfo(i => (i ? { ...i, connected: true } : i));
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
        api("/api/twilio/agent-status", { inCall: true }).catch(() => {});
        onCallStart?.({ callSid: call.parameters?.CallSid, from: to, to: dialLine, business, lang: "" });
      });
      call.on("disconnect", endCall);
      call.on("cancel", endCall);
      call.on("reject", endCall);
      call.on("error", err => { setError(err?.message || "Error en la llamada"); endCall(); });
      setDialTo("");
    } catch (err) {
      setError(err?.message || "No se pudo llamar");
    }
  }

  // Teclado: sin llamada escribe el número; en llamada manda tonos (para menús "marque 1")
  function pressKey(k) {
    if (active) active.sendDigits(k);
    else setDialTo(d => d + k);
  }

  function reject() {
    incoming?.reject();
    setIncoming(null);
  }

  function hangUp() {
    active?.disconnect();
  }

  function toggleMute() {
    if (!active) return;
    active.mute(!muted);
    setMuted(!muted);
  }

  const dot = status === "online" ? C.green : status === "connecting" ? "#f59e0b" : C.muted;
  const btn = (bg) => ({
    flex: 1, background: bg, color: C.white, border: "none", borderRadius: 10, padding: "11px 0",
    fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
  });

  return (
    <div style={{
      position: "fixed", bottom: 20, right: 20, zIndex: 9998, width: 290,
      background: C.navyDark, color: C.white, borderRadius: 18, padding: 18,
      boxShadow: "0 16px 50px rgba(0,0,0,0.35)", fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800 }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: dot, display: "inline-block" }} />
          {status === "online" ? "Disponible" : status === "connecting" ? "Conectando..." : "Desconectado"}
        </div>
        {!active && (
          status === "online"
            ? <button onClick={goOffline} style={{ background: "none", border: `1px solid ${C.muted}`, color: C.muted, borderRadius: 8, padding: "5px 10px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Desconectar</button>
            : <button onClick={goOnline} disabled={status === "connecting"} style={{ background: C.blue, border: "none", color: C.white, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Conectar</button>
        )}
      </div>

      {incoming && (
        <div>
          <div style={{ color: C.sky, fontSize: 11, fontWeight: 800, letterSpacing: 1.5, marginBottom: 6 }}>LLAMADA ENTRANTE</div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{param(incoming, "business") || "Cliente"}</div>
          <div style={{ color: C.muted, fontSize: 13, marginBottom: 14 }}>
            {param(incoming, "from")} · {param(incoming, "lang") === "es" ? "Español" : "English"}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={accept} style={btn(C.green)}>Contestar</button>
            <button onClick={reject} style={btn(C.red)}>Rechazar</button>
          </div>
        </div>
      )}

      {active && activeInfo && (
        <div>
          <div style={{ color: activeInfo.connected ? C.green : C.sky, fontSize: 11, fontWeight: 800, letterSpacing: 1.5, marginBottom: 6 }}>
            {activeInfo.connected
              ? `${activeInfo.outbound ? "SALIENTE" : "EN LLAMADA"} · ${formatTime(seconds)}`
              : "LLAMANDO..."}
          </div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{activeInfo.business || "Cliente"}</div>
          <div style={{ color: C.muted, fontSize: 13, marginBottom: 14 }}>
            {formatPhone(activeInfo.from)}
            {!activeInfo.outbound && ` · ${activeInfo.lang === "es" ? "Español" : "English"}`}
          </div>
          {showPad && <Keypad onPress={pressKey} />}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={toggleMute} style={btn(muted ? "#f59e0b" : C.navy)}>{muted ? "Activar mic" : "Silenciar"}</button>
            <button onClick={() => setShowPad(s => !s)} style={{ ...btn(C.navy), flex: "0 0 48px" }} title="Teclado">⌨</button>
            <button onClick={hangUp} style={btn(C.red)}>Colgar</button>
          </div>
        </div>
      )}

      {!incoming && !active && status === "online" && wrapUp && (
        <div style={{ color: "#fbbf24", fontSize: 13 }}>Guarda la nota de la llamada para recibir la siguiente.</div>
      )}
      {!incoming && !active && status === "online" && !wrapUp && (
        <div>
          <div style={{ color: C.muted, fontSize: 13 }}>Esperando llamadas... Mantén esta pestaña abierta.</div>
          {canCallOut ? (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.navy}` }}>
              <div style={{ color: C.sky, fontSize: 11, fontWeight: 800, letterSpacing: 1.5, marginBottom: 8 }}>LLAMAR</div>
              <select value={dialLine} onChange={e => setDialLine(e.target.value)} style={{ ...dark, marginBottom: 8 }}>
                {lines.length === 0 && <option value="">No hay empresas</option>}
                {lines.map(l => <option key={l.phone_number} value={l.phone_number}>Desde {l.business_name}</option>)}
              </select>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input value={dialTo} onChange={e => setDialTo(e.target.value)} onKeyDown={e => e.key === "Enter" && callOut()}
                  placeholder="(910) 555-1234" inputMode="tel" style={{ ...dark, flex: 1, fontSize: 15, letterSpacing: 0.5 }} />
                <button onClick={() => setShowPad(s => !s)} style={{ ...dark, width: 42, flex: "0 0 42px", cursor: "pointer" }} title="Teclado">⌨</button>
              </div>
              {showPad && <Keypad onPress={pressKey} />}
              <button onClick={callOut} disabled={!dialTo.trim() || !dialLine} style={{ ...btn(C.green), width: "100%", opacity: !dialTo.trim() || !dialLine ? 0.5 : 1 }}>
                📞 Llamar
              </button>
            </div>
          ) : (
            <div style={{ color: C.muted, fontSize: 11, marginTop: 10 }}>Llamadas salientes desactivadas (falta TWILIO_TWIML_APP_SID).</div>
          )}
        </div>
      )}
      {!incoming && !active && status === "offline" && (
        <div style={{ color: C.muted, fontSize: 13 }}>Presiona "Conectar" para empezar a recibir llamadas.</div>
      )}
      {error && <div style={{ color: "#f87171", fontSize: 12, marginTop: 10 }}>⚠ {error}</div>}
    </div>
  );
}
