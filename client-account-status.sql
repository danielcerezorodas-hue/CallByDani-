-- ============================================================
-- CallByDani · Estado de la cuenta del cliente (línea activa o en configuración)
-- Corre esto UNA vez en Supabase → SQL Editor → New query → Run
-- (después de client-onboarding.sql)
-- ============================================================

-- pending_setup: el cliente ve su dashboard bloqueado ("Your line is being set up")
-- active: todo desbloqueado. Se cambia desde /agente → Clientes → "Activar línea".
alter table public.clients add column if not exists account_status text not null default 'pending_setup';

alter table public.clients drop constraint if exists clients_account_status_check;
alter table public.clients add constraint clients_account_status_check check (account_status in ('pending_setup', 'active'));

-- Los clientes que ya tienen un número asignado quedan activos desde ya
update public.clients
set account_status = 'active'
where lower(email) in (select lower(client_email) from public.phone_lines where client_email is not null);
