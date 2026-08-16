create table if not exists public.pz_news_articles (
  id text primary key,
  payload jsonb not null,
  deleted boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.pz_news_articles enable row level security;

drop policy if exists "allow_read_articles" on public.pz_news_articles;
create policy "allow_read_articles"
on public.pz_news_articles
for select
to anon, authenticated
using (true);

drop policy if exists "allow_write_articles" on public.pz_news_articles;
create policy "allow_write_articles"
on public.pz_news_articles
for all
to anon, authenticated
using (true)
with check (true);

create table if not exists public.pz_news_ads (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.pz_news_ads enable row level security;

drop policy if exists "allow_read_ads" on public.pz_news_ads;
create policy "allow_read_ads"
on public.pz_news_ads
for select
to anon, authenticated
using (true);

drop policy if exists "allow_write_ads" on public.pz_news_ads;
create policy "allow_write_ads"
on public.pz_news_ads
for all
to anon, authenticated
using (true)
with check (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.pz_news_articles to anon, authenticated;
grant select, insert, update, delete on table public.pz_news_ads to anon, authenticated;
