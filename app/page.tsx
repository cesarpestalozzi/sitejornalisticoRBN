// ISR (Incremental Static Regeneration) - regenera a cada 5 minutos
export const revalidate = 300;

import HomeClientOptimized from './components/HomeClientOptimized';
import { createClient } from '@supabase/supabase-js';

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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return [];
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const { data, error } = await supabase
      .from('pz_news_articles')
      .select('id, payload, deleted, updated_at')
      .eq('deleted', false)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (error || !data) {
      return [];
    }

    // Extrai apenas campos necessários e filtra artigos publicados
    const articles = data
      .filter((row: any) => row.payload?.status === 'publicado')
      .map((row: any) => {
        const payload = row.payload;
        return {
          id: payload.id,
          title: payload.title,
          subtitle: payload.subtitle,
          category: payload.category,
          author: payload.author,
          excerpt: payload.excerpt,
          image: payload.image || 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=1200&h=630&fit=crop',
          featured: payload.featured,
          updatedAt: payload.updatedAt || payload.createdAt,
          views: payload.views || 0,
        };
      });

    return articles;
  } catch (error) {
    console.warn('Erro ao buscar artigos da homepage:', error);
    return [];
  }
}

export default async function Home() {
  const articles = await getHomepageArticles();

  return <HomeClientOptimized initialArticles={articles} />;
}
