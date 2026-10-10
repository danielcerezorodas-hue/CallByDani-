-- ============================================================
-- CallByDani · Llamadas entrantes en tiempo real en /agente
-- Corre esto UNA vez en Supabase → SQL Editor → New query → Run
-- (después de twilio-setup.sql y agents-setup.sql)
-- ============================================================

-- 1) ¿El usuario que pregunta es agente autorizado?
--    "security definer" para poder leer la tabla agents, que está cerrada al navegador.
create or replace function public.is_agent()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.agents
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- 2) Los agentes pueden LEER (no escribir) las llamadas de los últimos 15 minutos.
--    Así el panel ve las que están sonando sin abrir todo el historial.
drop policy if exists "agents read recent calls" on public.calls;
create policy "agents read recent calls" on public.calls
  for select to authenticated
  using (public.is_agent() and created_at > now() - interval '15 minutes');

-- 3) Activa Supabase Realtime para la tabla calls
alter publication supabase_realtime add table public.calls;

-- IMPORTANTE: el admin también tiene que estar en la tabla agents para ver
-- las llamadas en tiempo real. Cambia el correo y corre esta línea:
-- insert into public.agents (email) values ('tu-correo@ejemplo.com') on conflict do nothing;
