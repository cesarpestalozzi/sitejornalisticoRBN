-- Auditoria de performance (set/2026): índices para os filtros realmente
-- usados pela aplicação (status, slug, category, comentários por artigo) e
-- GRANTs explícitos para a Data API (PostgREST).
--
-- Contexto dos índices: até aqui, consultas como "artigo pelo slug",
-- "artigos publicados" e "artigos por categoria" filtravam por expressões
-- jsonb (payload->>'coluna') sem nenhum índice correspondente, obrigando o
-- Postgres a varrer a tabela inteira (maior causa de I/O de disco
-- reportada pelo Supabase). Os índices abaixo cobrem exatamente esses
-- filtros, sem criar índices especulativos.
create index if not exists idx_pz_news_articles_status
  on public.pz_news_articles ((payload->>'status'));

create index if not exists idx_pz_news_articles_slug
  on public.pz_news_articles ((payload->>'slug'));

create index if not exists idx_pz_news_articles_category
  on public.pz_news_articles ((payload->>'category'));

-- Comentários podem estar usando o fallback legado em pz_news_articles.
-- Cria o índice somente se a tabela dedicada já existir; esta migration não
-- cria tabelas nem muda a estratégia de persistência em produção.
do $$
begin
  if to_regclass('public.pz_news_comments') is not null then
    create index if not exists idx_pz_news_comments_article
      on public.pz_news_comments ((payload->>'articleId'));
  end if;
end
$$;

-- Contexto dos GRANTs: o Supabase deixará de conceder automaticamente os
-- privilégios às roles usadas pela Data API em tabelas novas a partir de
-- 30/10. As tabelas abaixo já existem e hoje funcionam graças ao
-- privilégio padrão antigo; este bloco grava explicitamente o que cada
-- role realmente usa, para que o projeto continue funcionando após a
-- mudança e para servir de modelo a novas tabelas.
grant usage on schema public to anon, service_role;

-- pz_news_articles: leitura pública. Toda escrita passa pela API server-side
-- autenticada com service_role; não concedemos escrita pública a anon.
grant select on public.pz_news_articles to anon;
grant select, insert, update, delete on public.pz_news_articles to service_role;

-- Tabelas internas do painel: conceder acesso somente onde o schema já
-- existe. Algumas instalações ainda usam as linhas de fallback em
-- pz_news_articles para comments/analytics/integrations; esta migration não
-- cria tabelas nem altera esse fallback.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'pz_news_users',
    'pz_news_settings',
    'pz_news_comments',
    'pz_news_analytics_events',
    'pz_news_user_integrations',
    'rbn_message_conversations',
    'rbn_messages',
    'rbn_message_notifications',
    'pz_news_team_documents',
    'pz_news_team_document_audit'
  ] loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format(
        'grant select, insert, update, delete on table public.%I to service_role',
        table_name
      );
    end if;
  end loop;
end
$$;
