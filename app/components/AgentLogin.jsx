"use client";

import { useState } from "react";
import { supabase } from "../supabase";

export default function AgentLogin({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) return;
    setLoading(true);
    setError("");
    const { data, err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
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
        {error && <div style={{ color:"#c05050", fontSize:13, marginBottom:16, textAlign:"center" }}>⚠ {error}</div>}
        <button onClick={handleLogin} disabled={loading}
          style={{ width:"100%", padding:"13px 0", background:"linear-gradient(135deg, #3d9e5f, #c8a84b)", color:"#0a1409", border:"none", borderRadius:12, fontWeight:900, fontSize:15, cursor:"pointer" }}>
          {loading ? "Signing in..." : "Sign In →"}
        </button>
      </div>
    </div>
  );
}