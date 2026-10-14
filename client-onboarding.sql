-- ============================================================
-- CallByDani · Acuerdo de servicios + formulario de onboarding del cliente
-- Corre esto UNA vez en Supabase → SQL Editor → New query → Run
-- ============================================================

-- 1) Aceptaciones del acuerdo (una fila por cada versión que acepta cada cliente).
--    Se guarda también el texto exacto que firmó, para poder mostrárselo aunque el acuerdo cambie.
create table if not exists public.client_agreements (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  title text not null,
  company_name text not null,
  agreement_version text not null,
  agreement_text text not null,
  accepted_at timestamptz not null default now(),
  ip_address text,
  user_agent text
);
create index if not exists client_agreements_user_idx on public.client_agreements (user_id, accepted_at desc);

-- 2) Formulario de onboarding (se puede guardar a medias y terminar después)
create table if not exists public.client_onboarding (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  data jsonb not null default '{}'::jsonb,
  status text not null default 'in_progress',   -- in_progress | ready_for_setup
  submitted_at timestamptz,
  updated_at timestamptz not null default now()
);

-- 3) Documentos que sube el cliente (los archivos van en Storage, bucket "client-documents")
create table if not exists public.client_documents (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  file_path text not null unique,               -- <user_id>/<archivo> dentro del bucket
  file_name text not null,
  content_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);
create index if not exists client_documents_user_idx on public.client_documents (user_id);

-- 4) Estado de configuración del cliente (ready_for_setup cuando envía el formulario)
alter table public.clients add column if not exists setup_status text;

-- 5) Seguridad (RLS): cada cliente solo puede leer lo suyo.
--    Todo lo que se escribe pasa por el servidor (service_role), que valida al usuario.
alter table public.client_agreements enable row level security;
alter table public.client_onboarding enable row level security;
alter table public.client_documents enable row level security;

drop policy if exists "own agreements" on public.client_agreements;
create policy "own agreements" on public.client_agreements for select to authenticated using (user_id = auth.uid());

drop policy if exists "own onboarding" on public.client_onboarding;
create policy "own onboarding" on public.client_onboarding for select to authenticated using (user_id = auth.uid());

drop policy if exists "own documents" on public.client_documents;
create policy "own documents" on public.client_documents for select to authenticated using (user_id = auth.uid());

-- 6) Bucket privado para los documentos (máx. 10 MB; PDF, DOCX y TXT)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('client-documents', 'client-documents', false, 10485760,
        array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Cada cliente solo puede leer los archivos de su propia carpeta (<user_id>/...)
drop policy if exists "client documents: read own folder" on storage.objects;
create policy "client documents: read own folder" on storage.objects for select to authenticated
  using (bucket_id = 'client-documents' and (storage.foldername(name))[1] = auth.uid()::text);
