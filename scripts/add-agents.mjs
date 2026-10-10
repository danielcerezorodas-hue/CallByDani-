// Crea agentes en Supabase Auth, los autoriza en la tabla agents y les obliga
// a cambiar la contraseña la primera vez que entran a /agente.
//
// Uso (necesita la service_role key real en .env.local):
//   node --env-file=.env.local scripts/add-agents.mjs "<contraseña temporal>" "correo|Nombre" "correo|Nombre" ...
//
// Si el correo ya existe, le pone la contraseña temporal y vuelve a pedir el cambio.
import { createClient } from "@supabase/supabase-js";

const [password, ...people] = process.argv.slice(2);
if (!password || !people.length) {
  console.error('Uso: node --env-file=.env.local scripts/add-agents.mjs "<contraseña temporal>" "correo|Nombre" ...');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || key.startsWith("tu-")) {
  console.error("Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (la real) en .env.local");
  process.exit(1);
}
const supa = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function findUserByEmail(email) {
  for (let page = 1; ; page++) {
    const { data, error } = await supa.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const user = data.users.find(u => u.email?.toLowerCase() === email);
    if (user || data.users.length < 1000) return user || null;
  }
}

let failed = false;
for (const entry of people) {
  const [rawEmail, fullName = ""] = entry.split("|");
  const email = rawEmail.trim().toLowerCase();
  try {
    const attrs = {
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName.trim() },
      app_metadata: { must_reset_password: true },
    };
    const { data, error } = await supa.auth.admin.createUser({ email, ...attrs });
    let action = "creado";
    if (error) {
      const existing = await findUserByEmail(email);
      if (!existing) throw error;
      const { error: e2 } = await supa.auth.admin.updateUserById(existing.id, attrs);
      if (e2) throw e2;
      action = "ya existía: contraseña temporal puesta de nuevo";
    }

    const { error: e3 } = await supa.from("agents").upsert({ email }, { onConflict: "email" });
    if (e3) throw e3;
    console.log(`✓ ${email} (${fullName.trim() || "sin nombre"}) · ${action} · autorizado en agents`);
  } catch (e) {
    failed = true;
    console.error(`✗ ${email}: ${e.message}`);
  }
}
process.exit(failed ? 1 : 0);
