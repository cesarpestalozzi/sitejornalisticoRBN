// ISR (Incremental Static Regeneration) - regenera a cada 5 minutos
export const revalidate = 300;

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
  try {
    const response = await fetch('https://www.rbnbrasil.com.br/api/homepage/articles', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 }, // Cache por 5 minutos
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.warn('Erro ao buscar artigos da homepage:', error);
  }

  return [];
}

export default async function Home() {
  const articles = await getHomepageArticles();

  return <HomeClientOptimized initialArticles={articles} />;
}
