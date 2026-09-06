-- Documentação privada da equipe. Execute após o schema base.
create table if not exists public.pz_news_team_documents (
  id text primary key,
  user_id text not null,
  document_type text not null,
  file_name text,
  mime_type text,
  size_bytes bigint,
  status text not null default 'pending' check (status in ('pending', 'review', 'approved', 'rejected', 'expired')),
  expires_at date,
  notes text,
  request_reason text,
  content_base64 text,
  requested_by text,
  uploaded_by text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_pz_news_team_documents_user on public.pz_news_team_documents (user_id, updated_at desc);
create index if not exists idx_pz_news_team_documents_status on public.pz_news_team_documents (status, updated_at desc);
alter table public.pz_news_team_documents add column if not exists deleted_at timestamptz;
alter table public.pz_news_team_documents enable row level security;
drop policy if exists "service_role_team_documents_access" on public.pz_news_team_documents;
create policy "service_role_team_documents_access" on public.pz_news_team_documents for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create table if not exists public.pz_news_team_document_audit (
  id text primary key,
  document_id text not null references public.pz_news_team_documents(id) on delete cascade,
  user_id text not null,
  actor_id text not null,
  action text not null,
  from_status text,
  to_status text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_pz_news_team_document_audit_document on public.pz_news_team_document_audit (document_id, created_at desc);
alter table public.pz_news_team_document_audit enable row level security;
drop policy if exists "service_role_team_document_audit_access" on public.pz_news_team_document_audit;
create policy "service_role_team_document_audit_access" on public.pz_news_team_document_audit for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
