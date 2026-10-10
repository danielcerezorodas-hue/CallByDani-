"use client";

import { useState } from "react";
import { supabase } from "../supabase";
import { post } from "./agentApi";

export default function AgentLogin({ onLogin, notice }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) return;
    setLoading(true);
    setError("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Email o contraseña incorrectos");
    } else {
      onLogin(data.user);
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight:"100vh", background:"#0a1409", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"sans-serif" }}>
      <div style={{ background:"#162318", border:"1px solid #1e3320", borderRadius:20, padding:"48px 40px", width:"100%", maxWidth:400 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🎧</div>
          <div style={{ fontSize:24, fontWeight:900, color:"#f2ead8", marginBottom:6 }}>Agent Portal</div>
          <div style={{ color:"#5a7a5d", fontSize:14 }}>CallByDani.com</div>
        </div>
        <div style={{ marginBottom:14 }}>
          <div style={{ color:"#8aaa8d", fontSize:11, fontWeight:700, marginBottom:6 }}>EMAIL</div>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="agent@callbydani.com"
            style={{ width:"100%", background:"#0f1d0e", border:"1px solid #1e3320", borderRadius:10, color:"#f2ead8", padding:"12px 16px", fontSize:14, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }} />
        </div>
        <div style={{ marginBottom:24 }}>
          <div style={{ color:"#8aaa8d", fontSize:11, fontWeight:700, marginBottom:6 }}>PASSWORD</div>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="••••••••"
            style={{ width:"100%", background:"#0f1d0e", border:"1px solid #1e3320", borderRadius:10, color:"#f2ead8", padding:"12px 16px", fontSize:14, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }} />
        </div>
        {!error && notice && <div style={{ color:"#c8a84b", fontSize:13, marginBottom:16, textAlign:"center" }}>{notice}</div>}
        {error && <div style={{ color:"#c05050", fontSize:13, marginBottom:16, textAlign:"center" }}>⚠ {error}</div>}
        <button onClick={handleLogin} disabled={loading}
          style={{ width:"100%", padding:"13px 0", background:"linear-gradient(135deg, #3d9e5f, #c8a84b)", color:"#0a1409", border:"none", borderRadius:12, fontWeight:900, fontSize:15, cursor:"pointer" }}>
          {loading ? "Signing in..." : "Sign In →"}
        </button>
      </div>
    </div>
  );
}
// Primera vez que entra con la contraseña temporal: tiene que elegir una nueva
export function ChangePassword({ email, onDone, onLogout }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setError("");
    if (password.length < 8) return setError("Mínimo 8 caracteres");
    if (password !== confirm) return setError("Las contraseñas no coinciden");
    setLoading(true);
    try {
      await post("/api/agent/password", { password });
      // Supabase cierra todas las sesiones al cambiar la contraseña: entramos de nuevo con la nueva
      const { error: e2 } = await supabase.auth.signInWithPassword({ email, password });
      if (e2) throw new Error("Contraseña guardada. Entra de nuevo con tu nueva contraseña.");
      onDone();
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  const input = { width:"100%", background:"#0f1d0e", border:"1px solid #1e3320", borderRadius:10, color:"#f2ead8", padding:"12px 16px", fontSize:14, outline:"none", fontFamily:"inherit", boxSizing:"border-box" };
  return (
    <div style={{ minHeight:"100vh", background:"#0a1409", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"sans-serif" }}>
      <div style={{ background:"#162318", border:"1px solid #1e3320", borderRadius:20, padding:"48px 40px", width:"100%", maxWidth:400 }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🔒</div>
          <div style={{ fontSize:22, fontWeight:900, color:"#f2ead8", marginBottom:6 }}>Elige tu contraseña</div>
          <div style={{ color:"#5a7a5d", fontSize:13 }}>{email} · es tu primera vez, cambia la contraseña temporal</div>
        </div>
        <div style={{ marginBottom:14 }}>
          <div style={{ color:"#8aaa8d", fontSize:11, fontWeight:700, marginBottom:6 }}>NUEVA CONTRASEÑA</div>
          <input type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} style={input} />
        </div>
        <div style={{ marginBottom:24 }}>
          <div style={{ color:"#8aaa8d", fontSize:11, fontWeight:700, marginBottom:6 }}>REPITE LA CONTRASEÑA</div>
          <input type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSave()} style={input} />
        </div>
        {error && <div style={{ color:"#c05050", fontSize:13, marginBottom:16, textAlign:"center" }}>⚠ {error}</div>}
        <button onClick={handleSave} disabled={loading}
          style={{ width:"100%", padding:"13px 0", background:"linear-gradient(135deg, #3d9e5f, #c8a84b)", color:"#0a1409", border:"none", borderRadius:12, fontWeight:900, fontSize:15, cursor:"pointer" }}>
          {loading ? "Guardando..." : "Guardar y entrar →"}
        </button>
        <button onClick={onLogout} style={{ width:"100%", background:"none", border:"none", color:"#5a7a5d", fontSize:12, marginTop:14, cursor:"pointer", fontFamily:"inherit" }}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
