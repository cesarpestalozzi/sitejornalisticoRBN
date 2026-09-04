import type { Metadata } from 'next';
import ArticlePageClient from './ArticlePageClient';

const OFFICIAL_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.rbnbrasil.com.br';

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
    const apiUrl = `${OFFICIAL_SITE_URL}/api/articles?id=${encodeURIComponent(id)}`;
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const rows = (await response.json()) as Array<{ id?: string; payload?: ArticlePayload }>;
    const match = rows.find((row) => row.id === id && row.payload);
    const article = match?.payload;
    if (article && (!article.status || article.status === 'publicado')) {
      return article;
    }

    return null;
  } catch (error) {
    console.warn('API interna indisponível para metadata do artigo.', error);
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
