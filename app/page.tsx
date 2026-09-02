export const dynamic = 'force-dynamic';
export const revalidate = 0;

import HomeClientOptimized from './components/HomeClientOptimized';

interface HomeArticle {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  author: string;
  excerpt: string;
  image: string;
  featured: boolean;
  updatedAt: string;
  views: number;
}

async function getHomepageArticles(): Promise<HomeArticle[]> {
  const pythonBase = (process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

  try {
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
