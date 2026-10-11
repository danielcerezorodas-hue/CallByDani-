-- ============================================================
-- CallByDani · Dashboard del cliente
-- Cada empresa (número de Twilio) se asigna al email del cliente que la paga.
-- Corre esto UNA vez en Supabase → SQL Editor → New query → Run
-- ============================================================

alter table public.phone_lines add column if not exists client_email text;
create index if not exists phone_lines_client_email_idx on public.phone_lines (client_email);
