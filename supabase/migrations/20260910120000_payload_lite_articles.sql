-- Reduz o egress do Supabase: cria uma coluna gerada (payload_lite) que
-- troca a imagem embutida em base64 por uma referência leve a
-- /api/article-image e remove a galeria "images", sem alterar o payload
-- original. As listagens somente-leitura (home, categorias, colunistas,
-- busca, painel, analytics, diagnóstico) passam a consultar essa coluna,
-- então as imagens em base64 deixam de sair do Postgres nessas consultas.
-- Execute uma única vez no SQL Editor do Supabase do projeto de produção.
--
-- Observação: jsonb_build_object() e to_jsonb() são apenas STABLE (não
-- IMMUTABLE) no Postgres, então não podem ser usadas em colunas geradas.
-- Por isso a expressão abaixo usa apenas jsonb_set(), operadores de
-- jsonb (->, ->>, -) e um cast de texto para jsonb (::jsonb), que são
-- todos IMMUTABLE.
alter table public.pz_news_articles
  add column if not exists payload_lite jsonb generated always as (
    jsonb_set(
      payload - 'image' - 'images',
      '{image}',
      case
        when (payload->>'image') like 'data:%' then
          ('"' || replace(replace('/api/article-image?id=' || id, '\', '\\'), '"', '\"') || '"')::jsonb
        when coalesce(payload->>'image', '') <> '' then payload->'image'
        when jsonb_array_length(coalesce(payload->'images', '[]'::jsonb)) > 0 then
          case
            when (payload->'images'->0->>'url') like 'data:%' then
              ('"' || replace(replace('/api/article-image?id=' || id, '\', '\\'), '"', '\"') || '"')::jsonb
            else coalesce(payload->'images'->0->'url', 'null'::jsonb)
          end
        else 'null'::jsonb
      end,
      true
    )
  ) stored;
