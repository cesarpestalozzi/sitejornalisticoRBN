-- Reduz o egress do Supabase: cria uma coluna gerada (payload_lite) que
-- troca a imagem embutida em base64 por uma referência leve a
-- /api/article-image e remove a galeria "images", sem alterar o payload
-- original. As listagens somente-leitura (home, categorias, colunistas,
-- busca, painel, analytics, diagnóstico) passam a consultar essa coluna,
-- então as imagens em base64 deixam de sair do Postgres nessas consultas.
-- Execute uma única vez no SQL Editor do Supabase do projeto de produção.
alter table public.pz_news_articles
  add column if not exists payload_lite jsonb generated always as (
    (payload - 'image' - 'images') || jsonb_build_object(
      'image',
      case
        when (payload->>'image') like 'data:%' then to_jsonb('/api/article-image?id=' || id)
        when coalesce(payload->>'image', '') <> '' then payload->'image'
        when jsonb_array_length(coalesce(payload->'images', '[]'::jsonb)) > 0 then
          case
            when (payload->'images'->0->>'url') like 'data:%' then to_jsonb('/api/article-image?id=' || id)
            else payload->'images'->0->'url'
          end
        else 'null'::jsonb
      end
    )
  ) stored;
