-- ============================================================
-- CallByDani · Arreglo: la tabla "calls" ya existía con otra estructura
-- (client_id, caller, topic, duration, summary), así que twilio-setup.sql
-- no la creó y falta call_sid. También completa agents-setup.sql, que no se había aplicado.
--
-- Corre esto UNA vez en Supabase → SQL Editor → New query → Run
-- Solo borra "calls" si está VACÍA; si tiene filas, se detiene sin tocar nada.
-- ============================================================

begin;

-- 1) Seguridad: no borrar llamadas reales
do $$
begin
  if exists (select 1 from public.calls) then
    raise exception 'La tabla calls tiene filas; no se borra. Avísale a Claude.';
  end if;
end $$;

-- 2) Recrear "calls" con la estructura que usa la app
--    (sin CASCADE: si otra tabla dependiera de calls, esto da error y no cambia nada)
drop table public.calls;

create table public.calls (
  id bigint generated always as identity primary key,
  call_sid text unique not null,
  from_number text,
  to_number text,
  business_name text,
  language text,
  agent_id uuid,               -- id del usuario en Supabase Auth
  agent_email text,
  status text,                 -- ringing, answered, completed, voicemail, missed
  duration_seconds int,
  recording_url text,
  voicemail_url text,
  -- nota que llena el agente
  caller_name text,
  caller_phone text,
  reason text,
  note text,
  urgent boolean not null default false,
  note_saved_at timestamptz,
  whatsapp_status text,        -- sent, failed, skipped
  whatsapp_error text,
  created_at timestamptz not null default now()
);

alter table public.calls enable row level security;

-- 3) Volver a activar el tiempo real (se pierde al borrar la tabla)
create policy "agents read recent calls" on public.calls
  for select to authenticated
  using (public.is_agent() and created_at > now() - interval '15 minutes');
alter publication supabase_realtime add table public.calls;

-- 4) Lo que faltaba de agents-setup.sql (empresas y documentos)
alter table public.phone_lines add column if not exists owner_whatsapp text;
alter table public.phone_lines add column if not exists notes text;

create table if not exists public.company_docs (
  id bigint generated always as identity primary key,
  phone_number text not null references public.phone_lines(phone_number) on delete cascade,
  title text not null,
  content text not null,
  created_at timestamptz not null default now()
);
alter table public.company_docs enable row level security;

commit;
