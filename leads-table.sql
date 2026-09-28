-- Tabla para guardar los prospectos (leads) de la landing, pricing y contacto
create table if not exists public.leads (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  email text not null,
  first_name text,
  last_name text,
  phone text,
  company text,
  sector text,
  monthly_calls text,
  plan text,
  message text,
  source text
);

-- Seguridad: los visitantes de la página SOLO pueden agregar leads,
-- no pueden ver, cambiar ni borrar los de otros.
alter table public.leads enable row level security;

drop policy if exists "Visitors can submit leads" on public.leads;
create policy "Visitors can submit leads"
  on public.leads
  for insert
  to anon, authenticated
  with check (true);

grant insert on public.leads to anon, authenticated;
