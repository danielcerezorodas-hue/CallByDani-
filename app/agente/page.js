"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import AgentLogin, { ChangePassword } from "../components/AgentLogin";
import AgentPanel from "../components/AgentPanel";
import PhoneWidget from "../components/PhoneWidget";
import { agentApi, post } from "../components/agentApi";
import { supabase } from "../supabase";

export default function AgentePage() {
  const [user, setUser] = useState(null);
  const [me, setMe] = useState(null);           // { email, isAdmin, onlineCount }
  const [checking, setChecking] = useState(true);
  const [denied, setDenied] = useState("");
  // Llamada en vivo: { callSid, from, to, business, lang, ended }
  const [liveCall, setLiveCall] = useState(null);
  // Llamada que está sonando en el teléfono de este agente: { callSid, accept, reject }
  const [ringingHere, setRingingHere] = useState(null);

  // Recupera la sesión al recargar la página
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data?.session?.user || null);
      if (!data?.session) setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Confirma que este usuario es agente autorizado
  useEffect(() => {
    if (!user) { setMe(null); return; }
    setChecking(true);
    agentApi("/api/agent/me")
      .then(data => { setMe(data); setDenied(""); })
      .catch(async err => {
        setMe(null);
        if (err.status === 401) {
          setDenied(`${user.email} no tiene acceso al portal de agentes. Pídele al admin que te agregue.`);
          await supabase.auth.signOut();
        } else {
          setDenied(err.message);
        }
      })
      .finally(() => setChecking(false));
  }, [user]);

  // Actualiza cuántos agentes hay conectados
  useEffect(() => {
    if (!me) return;
    const id = setInterval(() => {
      agentApi("/api/agent/me").then(setMe).catch(() => {});
    }, 30 * 1000);
    return () => clearInterval(id);
  }, [me?.email]);

  async function handleLogout() {
    if (liveCall && !liveCall.ended) return;
    await supabase.auth.signOut();
    setUser(null);
    setMe(null);
    setLiveCall(null);
  }

  // Después de guardar (o saltar) la nota, el agente queda libre para otra llamada
  function finishCall() {
    setLiveCall(null);
    post("/api/twilio/agent-status", { inCall: false }).catch(() => {});
  }

  if (!user || !me) {
    if (checking && user) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", color: "#6b7280" }}>Cargando...</div>;
    return <AgentLogin onLogin={u => { setDenied(""); setUser(u); }} notice={denied} />;
  }

  // Cuenta nueva con contraseña temporal: primero tiene que cambiarla
  if (me.mustResetPassword) {
    return (
      <ChangePassword
        email={me.email}
        onDone={() => agentApi("/api/agent/me").then(setMe).catch(async e => {
          // Si algo falla, volvemos al login en vez de quedarnos atascados en esta pantalla
          await supabase.auth.signOut();
          setUser(null);
          setMe(null);
          setDenied(e.message);
        })}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div>
      <AgentPanel
        me={me}
        liveCall={liveCall}
        ringingHere={ringingHere}
        onFinishCall={finishCall}
        onLogout={handleLogout}
      />
      <PhoneWidget
        onIncoming={setRingingHere}
        onCallStart={info => setLiveCall({ ...info, ended: false })}
        onCallEnd={() => setLiveCall(c => (c ? { ...c, ended: true } : c))}
        wrapUp={!!liveCall?.ended}
      />
    </div>
  );
}
