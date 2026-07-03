"use client";

export const dynamic = 'force-dynamic';

import { useState } from "react";
import AgentLogin from "../components/AgentLogin";
import AgentPanel from "../components/AgentPanel";
import { supabase } from "../supabase";

export default function AgentePage() {
  const [user, setUser] = useState(null);

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  if (!user) return <AgentLogin onLogin={setUser} />;
  return (
    <div>
      <div style={{ position:"fixed", top:16, right:24, zIndex:9999 }}>
        <button onClick={handleLogout} style={{
          background:"#1e3320", border:"1px solid #3d6b41",
          color:"#8aaa8d", borderRadius:10, padding:"8px 16px",
          fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit"
        }}>
          Cerrar sesión
        </button>
      </div>
      <AgentPanel />
    </div>
  );
}
