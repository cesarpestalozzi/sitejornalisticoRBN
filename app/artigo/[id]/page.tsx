import type { Metadata } from 'next';
import ArticlePageClient from './ArticlePageClient';

const OFFICIAL_SITE_URL = 'https://pz-news-xi.vercel.app';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_TABLE = 'pz_news_articles';

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
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !id) {
    return null;
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

  return {
   title,
   description,
   alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: 'article',
      url,
      images: [{ url: `${OFFICIAL_SITE_URL}/logo-oficial.png`, alt: 'RBN' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${OFFICIAL_SITE_URL}/logo-oficial.png`],
    },
  };
}

export default function ArticlePage() {
  return <ArticlePageClient />;
}
