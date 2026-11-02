-- ============================================================
-- CallByDani · Ventas: prospectos, historial y calendario compartido
-- Corre esto UNA vez en Supabase → SQL Editor → New query → Run
-- (después de client-account-status.sql)
--
-- Quién ve qué (lo hace cumplir la base de datos con RLS):
--   · Admin (daniel.cerezo@callbydani.com): todo.
--   · Agentes (tabla agents): solo sus prospectos y sus eventos.
--   · Clientes con la línea activa: solo los prospectos y eventos de su empresa y las notas
--     "Visible to client"; pueden comentar. Nunca ven las ventas internas de CallByDani.
-- ============================================================

-- 1) Funciones de identidad (leen tablas privadas, por eso son security definer)
create or replace function public.cbd_email() returns text
language sql stable as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) $$;

create or replace function public.cbd_is_admin() returns boolean
language sql stable as $$ select public.cbd_email() = 'daniel.cerezo@callbydani.com' $$;

create or replace function public.cbd_is_agent() returns boolean
language sql stable security definer set search_path = public as $$
  select public.cbd_is_admin() or exists (select 1 from public.agents where lower(email) = public.cbd_email())
$$;

-- Empresa (clients.id) del usuario, solo si su línea está activa
create or replace function public.cbd_client_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.clients
  where lower(email) = public.cbd_email() and account_status = 'active'
  limit 1
$$;

-- 2) Prospectos
create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  contact_name text,
  phone text,
  email text,
  industry text,
  client_id uuid references public.clients(id) on delete set null,   -- null = ventas internas de CallByDani
  stage text not null default 'prospect'
    check (stage in ('prospect', 'contacted', 'conversation', 'demo', 'free_week', 'client', 'lost')),
  assigned_agent uuid references auth.users(id) on delete set null,
  assigned_agent_email text,
  -- (las notas van en prospect_activities, cada una "internal" o "client": así el cliente nunca ve una interna)
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists prospects_agent_idx on public.prospects (assigned_agent);
create index if not exists prospects_client_idx on public.prospects (client_id);

-- 3) Historial: notas, contactos, cambios de etapa/agente y comentarios del cliente
create table if not exists public.prospect_activities (
  id bigint generated always as identity primary key,
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  event_id uuid,                                   -- si es un comentario sobre un evento
  kind text not null check (kind in ('note', 'contact', 'stage_change', 'assignment', 'comment')),
  contact_type text check (contact_type in ('call', 'email', 'visit')),
  result text,
  body text,
  visibility text not null default 'internal' check (visibility in ('internal', 'client')),
  old_value text,
  new_value text,
  author_id uuid,
  author_email text,
  author_role text check (author_role in ('admin', 'agent', 'client', 'system')),
  created_at timestamptz not null default now()
);
create index if not exists prospect_activities_prospect_idx on public.prospect_activities (prospect_id, created_at desc);

-- 4) Calendario
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  type text not null check (type in ('follow_up_call', 'email', 'demo', 'appointment', 'free_week_end')),
  starts_at timestamptz not null,
  agent_id uuid references auth.users(id) on delete set null,
  agent_email text,
  note text,
  status text not null default 'open' check (status in ('open', 'done')),
  visible_to_client boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists calendar_events_agent_idx on public.calendar_events (agent_id, starts_at);
create index if not exists calendar_events_prospect_idx on public.calendar_events (prospect_id);

alter table public.prospect_activities drop constraint if exists prospect_activities_event_fk;
alter table public.prospect_activities add constraint prospect_activities_event_fk
  foreign key (event_id) references public.calendar_events(id) on delete cascade;

-- 5) Triggers
-- El autor de cada nota lo pone la base de datos (nadie puede hacerse pasar por otro)
create or replace function public.cbd_activity_author() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.kind in ('stage_change', 'assignment') and current_setting('cbd.system', true) is distinct from 'on' then
    raise exception 'History entries are created automatically';
  end if;
  if current_setting('cbd.system', true) = 'on' then
    new.author_role := coalesce(new.author_role, 'system');
  else
    new.author_role := case when public.cbd_is_admin() then 'admin' when public.cbd_is_agent() then 'agent' else 'client' end;
  end if;
  new.author_id := auth.uid();
  new.author_email := public.cbd_email();
  new.created_at := now();
  return new;
end $$;
drop trigger if exists cbd_activity_author on public.prospect_activities;
create trigger cbd_activity_author before insert on public.prospect_activities
  for each row execute function public.cbd_activity_author();

-- Al crear o cambiar un prospecto: fechas, correo del agente, y el historial de etapa/agente
create or replace function public.cbd_prospect_changes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.created_at := now();
  end if;
  new.updated_at := now();
  if new.assigned_agent is not null and (tg_op = 'INSERT' or new.assigned_agent is distinct from old.assigned_agent) then
    new.assigned_agent_email := (select lower(email) from auth.users where id = new.assigned_agent);
  elsif new.assigned_agent is null then
    new.assigned_agent_email := null;
  end if;
  return new;
end $$;
drop trigger if exists cbd_prospect_changes on public.prospects;
create trigger cbd_prospect_changes before insert or update on public.prospects
  for each row execute function public.cbd_prospect_changes();

create or replace function public.cbd_prospect_history() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('cbd.system', 'on', true);
  if tg_op = 'INSERT' then
    insert into public.prospect_activities (prospect_id, kind, new_value, visibility, author_role)
    values (new.id, 'stage_change', new.stage, 'internal', case when public.cbd_is_admin() then 'admin' else 'agent' end);
  else
    if new.stage is distinct from old.stage then
      insert into public.prospect_activities (prospect_id, kind, old_value, new_value, visibility, author_role)
      values (new.id, 'stage_change', old.stage, new.stage, 'client', case when public.cbd_is_admin() then 'admin' else 'agent' end);
    end if;
    if new.assigned_agent is distinct from old.assigned_agent then
      insert into public.prospect_activities (prospect_id, kind, old_value, new_value, visibility, author_role)
      values (new.id, 'assignment', old.assigned_agent_email, new.assigned_agent_email, 'internal', 'admin');
      -- Los eventos pendientes pasan al nuevo agente
      update public.calendar_events set agent_id = new.assigned_agent, agent_email = new.assigned_agent_email
      where prospect_id = new.id and status = 'open';
    end if;
  end if;
  perform set_config('cbd.system', 'off', true);
  return null;
end $$;
drop trigger if exists cbd_prospect_history on public.prospects;
create trigger cbd_prospect_history after insert or update on public.prospects
  for each row execute function public.cbd_prospect_history();

-- Eventos: correo del agente
create or replace function public.cbd_event_agent() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.agent_id is not null and (tg_op = 'INSERT' or new.agent_id is distinct from old.agent_id) then
    new.agent_email := (select lower(email) from auth.users where id = new.agent_id);
  end if;
  return new;
end $$;
drop trigger if exists cbd_event_agent on public.calendar_events;
create trigger cbd_event_agent before insert or update on public.calendar_events
  for each row execute function public.cbd_event_agent();

-- 6) Seguridad (RLS)
alter table public.prospects enable row level security;
alter table public.prospect_activities enable row level security;
alter table public.calendar_events enable row level security;

-- ¿El usuario actual es el agente de este prospecto? (o admin)
create or replace function public.cbd_owns_prospect(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.cbd_is_admin()
      or (public.cbd_is_agent() and exists (select 1 from public.prospects where id = p and assigned_agent = auth.uid()))
$$;

-- ¿El prospecto es de la empresa del cliente actual? (nunca las ventas internas)
create or replace function public.cbd_client_prospect(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.prospects
    where id = p and client_id is not null and client_id = public.cbd_client_id()
  )
$$;

-- Prospectos
drop policy if exists "prospects: read" on public.prospects;
create policy "prospects: read" on public.prospects for select to authenticated using (
  public.cbd_is_admin()
  or (public.cbd_is_agent() and assigned_agent = auth.uid())
  or (client_id is not null and client_id = public.cbd_client_id())
);
drop policy if exists "prospects: create" on public.prospects;
create policy "prospects: create" on public.prospects for insert to authenticated with check (
  public.cbd_is_admin() or (public.cbd_is_agent() and assigned_agent = auth.uid())
);
drop policy if exists "prospects: update" on public.prospects;
create policy "prospects: update" on public.prospects for update to authenticated
  using (public.cbd_is_admin() or (public.cbd_is_agent() and assigned_agent = auth.uid()))
  with check (public.cbd_is_admin() or (public.cbd_is_agent() and assigned_agent = auth.uid())); -- solo el admin reasigna
drop policy if exists "prospects: delete" on public.prospects;
create policy "prospects: delete" on public.prospects for delete to authenticated using (public.cbd_is_admin());

-- Historial y comentarios
drop policy if exists "activities: read" on public.prospect_activities;
create policy "activities: read" on public.prospect_activities for select to authenticated using (
  public.cbd_owns_prospect(prospect_id)
  or (visibility = 'client' and public.cbd_client_prospect(prospect_id))
);
drop policy if exists "activities: create" on public.prospect_activities;
create policy "activities: create" on public.prospect_activities for insert to authenticated with check (
  (public.cbd_owns_prospect(prospect_id) and kind in ('note', 'contact', 'comment'))
  or (not public.cbd_is_agent() and kind = 'comment' and visibility = 'client' and contact_type is null
      and public.cbd_client_prospect(prospect_id))
);
-- (sin update/delete: el historial no se edita)

-- Calendario
drop policy if exists "events: read" on public.calendar_events;
create policy "events: read" on public.calendar_events for select to authenticated using (
  public.cbd_is_admin()
  or (public.cbd_is_agent() and agent_id = auth.uid())
  or (visible_to_client and public.cbd_client_prospect(prospect_id))
);
drop policy if exists "events: create" on public.calendar_events;
create policy "events: create" on public.calendar_events for insert to authenticated with check (
  public.cbd_is_admin() or (agent_id = auth.uid() and public.cbd_owns_prospect(prospect_id))
);
drop policy if exists "events: update" on public.calendar_events;
create policy "events: update" on public.calendar_events for update to authenticated
  using (public.cbd_is_admin() or (public.cbd_is_agent() and agent_id = auth.uid()))
  with check (public.cbd_is_admin() or (agent_id = auth.uid() and public.cbd_owns_prospect(prospect_id)));
drop policy if exists "events: delete" on public.calendar_events;
create policy "events: delete" on public.calendar_events for delete to authenticated using (
  public.cbd_is_admin() or (public.cbd_is_agent() and agent_id = auth.uid())
);

grant select, insert, update, delete on public.prospects, public.calendar_events to authenticated;
grant select, insert on public.prospect_activities to authenticated;
