-- ============================================================
-- CallByDani · Panel de agentes (empresas, documentos, notas, WhatsApp)
-- Corre esto UNA vez en Supabase → SQL Editor → New query → Run
-- (después de twilio-setup.sql)
-- ============================================================

-- 1) Agentes autorizados: solo estos correos pueden entrar a /agente.
--    El admin (ADMIN_EMAIL) siempre puede entrar aunque no esté aquí.
create table if not exists public.agents (
  email text primary key,
  created_at timestamptz not null default now()
);

-- 2) Datos extra de cada empresa (línea)
alter table public.phone_lines add column if not exists owner_whatsapp text;  -- a dónde se manda el resumen, formato +19105551234
alter table public.phone_lines add column if not exists notes text;           -- instrucciones rápidas para los agentes

-- 3) Documentos de cada empresa (los lee la IA para ayudar al agente)
create table if not exists public.company_docs (
  id bigint generated always as identity primary key,
  phone_number text not null references public.phone_lines(phone_number) on delete cascade,
  title text not null,
  content text not null,
  created_at timestamptz not null default now()
);

-- 4) La nota que llena el agente durante la llamada
alter table public.calls add column if not exists caller_name text;
alter table public.calls add column if not exists caller_phone text;
alter table public.calls add column if not exists reason text;
alter table public.calls add column if not exists note text;
alter table public.calls add column if not exists urgent boolean not null default false;
alter table public.calls add column if not exists note_saved_at timestamptz;
alter table public.calls add column if not exists whatsapp_status text;   -- sent, failed, skipped
alter table public.calls add column if not exists whatsapp_error text;

-- Seguridad: solo el servidor (service_role) usa estas tablas.
alter table public.agents enable row level security;
alter table public.company_docs enable row level security;
