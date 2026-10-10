-- ============================================================
-- CallByDani · Tablas para llamadas con Twilio
-- Corre esto UNA vez en Supabase → SQL Editor → New query → Run
-- ============================================================

-- 1) Líneas: cada número de Twilio y a qué negocio (cliente) pertenece
create table if not exists public.phone_lines (
  phone_number text primary key,          -- formato +19105551234
  business_name text not null,            -- nombre que escucha el que llama
  created_at timestamptz not null default now()
);

-- 2) Estado de cada agente (conectado, en llamada, si atiende varias líneas)
create table if not exists public.agent_status (
  agent_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  online boolean not null default false,
  in_call boolean not null default false,
  is_pool boolean not null default true,  -- true = puede contestar cualquier línea
  last_seen timestamptz not null default now()
);

-- 3) Asignaciones: qué agentes atienden qué línea (los "dedicados")
create table if not exists public.agent_assignments (
  agent_id uuid not null references auth.users(id) on delete cascade,
  phone_number text not null references public.phone_lines(phone_number) on delete cascade,
  primary key (agent_id, phone_number)
);

-- 4) Registro de llamadas
create table if not exists public.calls (
  id bigint generated always as identity primary key,
  call_sid text unique not null,
  from_number text,
  to_number text,
  business_name text,
  language text,
  agent_id uuid,
  agent_email text,
  status text,                -- ringing, answered, completed, voicemail, missed
  duration_seconds int,
  recording_url text,
  voicemail_url text,
  created_at timestamptz not null default now()
);

-- Seguridad: nadie desde el navegador puede leer ni escribir estas tablas.
-- Solo el servidor (con la llave service_role) las usa.
alter table public.phone_lines enable row level security;
alter table public.agent_status enable row level security;
alter table public.agent_assignments enable row level security;
alter table public.calls enable row level security;
