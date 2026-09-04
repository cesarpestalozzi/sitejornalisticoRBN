export const dynamic = 'force-dynamic';
export const revalidate = 0;

import HomeClientOptimized from './components/HomeClientOptimized';
import { hasArticleStoreConfig, listStoredArticles } from './api/_lib/articleStore';

interface HomeArticle {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  author: string;
  excerpt: string;
  image: string;
  featured: boolean;
  status?: string;
  updatedAt: string;
  views: number;
}

function isPublished(status: unknown) {
  const normalized = String(status || '').trim().toLowerCase();
  return normalized === 'publicado' || normalized === 'published' || normalized === 'publish' || normalized === 'online';
}

function resolveArticleImage(articleId: string, payload: Record<string, unknown>) {
  const images = Array.isArray(payload.images) ? payload.images : [];
  const primaryImage = images.find(
    (item): item is { url: string; isPrimary?: boolean } =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as { url?: unknown }).url === 'string' &&
      Boolean((item as { url: string }).url.trim()) &&
      Boolean((item as { isPrimary?: boolean }).isPrimary)
  ) as { url: string } | undefined;
  const firstImage = images.find(
    (item): item is { url: string } =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as { url?: unknown }).url === 'string' &&
      Boolean((item as { url: string }).url.trim())
  ) as { url: string } | undefined;
  const value = String(payload.image ?? primaryImage?.url ?? firstImage?.url ?? '').trim();

  if (!value) {
    return '/logo-oficial.png';
  }
  if (value.startsWith('data:')) {
    return `/api/article-image?id=${encodeURIComponent(articleId)}`;
  }
  return value;
}

async function getHomepageArticles(): Promise<HomeArticle[]> {
  const pythonBase = (process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

  try {
    if (hasArticleStoreConfig()) {
      const rows = await listStoredArticles();
      return rows
        .filter((row) => !row.deleted && isPublished(row.payload.status))
        .map((row) => ({
          id: row.id,
          title: String(row.payload.title ?? 'Sem título'),
          subtitle: String(row.payload.subtitle ?? ''),
          category: String(row.payload.category ?? 'Geral'),
          author: String(row.payload.author ?? 'RBN'),
          excerpt: String(row.payload.excerpt ?? row.payload.content ?? ''),
          image: resolveArticleImage(row.id, row.payload),
          featured: Boolean(row.payload.featured),
          status: String(row.payload.status ?? 'publicado'),
          updatedAt: String(row.payload.updatedAt ?? row.updated_at ?? new Date().toISOString()),
          views: Number(row.payload.views ?? 0),
        }));
    }

    const response = await fetch(`${pythonBase}/api/homepage/articles`, { cache: 'no-store' });
    if (!response.ok) {
      return [];
    }

    const payload = await response.json();
    return Array.isArray(payload)
      ? payload.map((article: Record<string, unknown>) => ({
          id: String(article.id ?? ''),
          title: String(article.title ?? 'Sem título'),
          subtitle: String(article.subtitle ?? ''),
          category: String(article.category ?? 'Geral'),
          author: String(article.author ?? 'RBN'),
          excerpt: String(article.excerpt ?? ''),
          image: String(article.image ?? '/logo-oficial.png'),
          featured: Boolean(article.featured),
          updatedAt: String(article.updatedAt ?? new Date().toISOString()),
          views: Number(article.views ?? 0),
        }))
      : [];
  } catch (error) {
    console.warn('Erro ao buscar artigos da homepage via backend Python:', error);
    return [];
  }
}

export default async function Home() {
  const articles = await getHomepageArticles();

  return <HomeClientOptimized initialArticles={articles} />;
}
