-- ============================================================
-- CallByDani · Bloc de notas personal de cada agente (pestaña "Mis notas")
-- Corre esto UNA vez en Supabase → SQL Editor → New query → Run
-- ============================================================

create table if not exists public.agent_notes (
  id bigint generated always as identity primary key,
  agent_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists agent_notes_agent_idx on public.agent_notes (agent_id, updated_at desc);

-- Solo el servidor (service_role) lee y escribe; cada agente ve las suyas a través de /api/agent/notes
alter table public.agent_notes enable row level security;
