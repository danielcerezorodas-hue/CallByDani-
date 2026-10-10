"use client";

// Teléfono del agente: recibe llamadas de Twilio directo en el navegador.
import { useState, useRef, useEffect } from "react";
import { post } from "./agentApi";

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

function param(call, name) {
  return call?.customParameters?.get?.(name) || "";
}

// onCallStart({ callSid, from, to, business, lang }) se llama al contestar.
// onCallEnd() se llama al colgar. Mientras wrapUp sea true (el agente llena la nota)
// no se aceptan llamadas nuevas.
export default function PhoneWidget({ onCallStart, onCallEnd, wrapUp = false }) {
  const [status, setStatus] = useState("offline"); // offline | connecting | online
  const [error, setError] = useState("");
  const [incoming, setIncoming] = useState(null);
  const [active, setActive] = useState(null);
  const [muted, setMuted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const deviceRef = useRef(null);
  const activeRef = useRef(null);
  const heartbeatRef = useRef(null);
  const timerRef = useRef(null);
  const wrapUpRef = useRef(wrapUp);
  useEffect(() => { wrapUpRef.current = wrapUp; }, [wrapUp]);

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
      const { token } = await api("/api/twilio/token");
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
    setMuted(false);
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
    activeRef.current = null;
    setActive(null);
    setMuted(false);
    // Sigue "en llamada" hasta que guarde la nota; la página lo libera después
    if (onCallEnd) onCallEnd();
    else api("/api/twilio/agent-status", { inCall: false, online: true }).catch(() => {});
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

      {active && (
        <div>
          <div style={{ color: C.green, fontSize: 11, fontWeight: 800, letterSpacing: 1.5, marginBottom: 6 }}>EN LLAMADA · {formatTime(seconds)}</div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{param(active, "business") || "Cliente"}</div>
          <div style={{ color: C.muted, fontSize: 13, marginBottom: 14 }}>
            {param(active, "from")} · {param(active, "lang") === "es" ? "Español" : "English"}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={toggleMute} style={btn(muted ? "#f59e0b" : C.navy)}>{muted ? "Activar mic" : "Silenciar"}</button>
            <button onClick={hangUp} style={btn(C.red)}>Colgar</button>
          </div>
        </div>
      )}

      {!incoming && !active && status === "online" && wrapUp && (
        <div style={{ color: "#fbbf24", fontSize: 13 }}>Guarda la nota de la llamada para recibir la siguiente.</div>
      )}
      {!incoming && !active && status === "online" && !wrapUp && (
        <div style={{ color: C.muted, fontSize: 13 }}>Esperando llamadas... Mantén esta pestaña abierta.</div>
      )}
      {!incoming && !active && status === "offline" && (
        <div style={{ color: C.muted, fontSize: 13 }}>Presiona "Conectar" para empezar a recibir llamadas.</div>
      )}
      {error && <div style={{ color: "#f87171", fontSize: 12, marginTop: 10 }}>⚠ {error}</div>}
    </div>
  );
}
