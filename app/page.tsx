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

async function getHomepageArticles(): Promise<HomeArticle[]> {
  const pythonBase = (process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

  try {
    if (hasArticleStoreConfig()) {
      const rows = await listStoredArticles();
      return rows
        .filter((row) => !row.deleted && String(row.payload.status || '').toLowerCase() === 'publicado')
        .map((row) => ({
          id: row.id,
          title: String(row.payload.title ?? 'Sem título'),
          subtitle: String(row.payload.subtitle ?? ''),
          category: String(row.payload.category ?? 'Geral'),
          author: String(row.payload.author ?? 'RBN'),
          excerpt: String(row.payload.excerpt ?? row.payload.content ?? ''),
          image: String(row.payload.image ?? ''),
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
          image: String(article.image ?? ''),
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
