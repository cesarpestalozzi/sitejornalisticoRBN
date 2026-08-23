import type { Metadata } from 'next';
import { isValidSupabaseUrl, supabase } from '@/app/lib/supabase';
import ArticlePageClient from './ArticlePageClient';

const OFFICIAL_SITE_URL = 'https://www.rbnbrasil.com.br';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_TABLE = 'pz_news_articles';

function resolveAbsoluteImageUrl(value?: string | null, articleId?: string): string {
  const fallbackImage = `${OFFICIAL_SITE_URL}/logo-oficial.png`;

  if (!value) {
    return fallbackImage;
  }

  if (value.startsWith('data:')) {
    if (!articleId) {
      return fallbackImage;
    }
    return `${OFFICIAL_SITE_URL}/api/article-image?id=${encodeURIComponent(articleId)}`;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  try {
    return new URL(value, OFFICIAL_SITE_URL).toString();
  } catch {
    return value.startsWith('/') ? `${OFFICIAL_SITE_URL}${value}` : `${OFFICIAL_SITE_URL}/${value}`;
  }
}

type ArticlePayload = {
  id: string;
  title: string;
  subtitle?: string;
  excerpt?: string;
  image?: string;
  images?: Array<{ url?: string; isPrimary?: boolean }>;
  status?: string;
};

async function fetchArticleById(id: string): Promise<ArticlePayload | null> {
  if (!id) {
    return null;
  }

  try {
    const apiUrl = `${OFFICIAL_SITE_URL}/api/articles`;
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      next: { revalidate: 60 },
    });

    if (response.ok) {
      const rows = (await response.json()) as Array<{ id?: string; payload?: ArticlePayload }>;
      const match = rows.find((row) => row.id === id && row.payload);
      const article = match?.payload;
      if (article && (!article.status || article.status === 'publicado')) {
        return article;
      }
    }
  } catch (error) {
    console.warn('API local indisponível para metadata do artigo; tentando Supabase direto.', error);
  }

  const hasValidUrl = Boolean(
    isValidSupabaseUrl(SUPABASE_URL)
  );

  if (!hasValidUrl || !SUPABASE_ANON_KEY) {
    return null;
  }

  try {
    if (supabase) {
      const { data, error } = await supabase
        .from(SUPABASE_TABLE)
        .select('payload, deleted')
        .eq('id', id)
        .eq('deleted', false)
        .limit(1)
        .maybeSingle();

      if (error || !data?.payload) {
        return null;
      }

      const article = data.payload as ArticlePayload;
      if (article.status && article.status !== 'publicado') {
        return null;
      }

      return article;
    }

    const endpoint =
      `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}` +
      `?select=payload,deleted&id=eq.${encodeURIComponent(id)}&deleted=eq.false&limit=1`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_ANON_KEY,
      },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return null;
    }

    const rows = (await response.json()) as Array<{ payload?: ArticlePayload }>;
    if (!Array.isArray(rows) || rows.length === 0 || !rows[0]?.payload) {
      return null;
    }

    const article = rows[0].payload;
    if (article.status && article.status !== 'publicado') {
      return null;
    }

    return article;
  } catch (error) {
    console.error('Erro ao carregar artigo do Supabase:', error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const resolved = await params;
  const article = await fetchArticleById(resolved.id);
  const url = `${OFFICIAL_SITE_URL}/artigo/${resolved.id}`;

  if (!article) {
   return {
     title: 'RBN | Notícias em Tempo Real',
     description: 'Portal de notícias profissional com credibilidade, tecnologia e cobertura completa.',
     openGraph: {
       title: 'RBN | Notícias em Tempo Real',
       description: 'Portal de notícias profissional com credibilidade, tecnologia e cobertura completa.',
       type: 'article',
       url,
       images: [{ url: `${OFFICIAL_SITE_URL}/logo-oficial.png` }],
     },
     twitter: {
       card: 'summary_large_image',
       title: 'RBN | Notícias em Tempo Real',
       description: 'Portal de notícias profissional com credibilidade, tecnologia e cobertura completa.',
       images: [`${OFFICIAL_SITE_URL}/logo-oficial.png`],
     },
   };
  }

  const title = article.title;
  const description = article.subtitle || article.excerpt || 'Leia a matéria completa no RBN.';
  const primaryImage = resolveAbsoluteImageUrl(
   article.image ||
     article.images?.find((image) => image.isPrimary)?.url ||
     article.images?.[0]?.url ||
     `${OFFICIAL_SITE_URL}/logo-oficial.png`,
   resolved.id
  );

  return {
   title,
   description,
   alternates: { canonical: url },
   openGraph: {
     title,
     description,
     type: 'article',
     url,
     images: [{ url: primaryImage, alt: title, width: 1200, height: 630 }],
     siteName: 'RBN Brasil',
     locale: 'pt_BR',
   },
   twitter: {
     card: 'summary_large_image',
     title,
     description,
     images: [primaryImage],
     site: '@rbn',
   },
  };
}

export default function ArticlePage() {
  return <ArticlePageClient />;
}
