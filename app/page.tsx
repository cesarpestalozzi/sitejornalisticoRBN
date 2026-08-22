// ISR (Incremental Static Regeneration) - atualiza com mais frequência para refletir publicações.
export const revalidate = 60;

import HomeClientOptimized from './components/HomeClientOptimized';
import { createClient } from '@supabase/supabase-js';
import { isScheduledArticleDue, promoteScheduledArticle } from '@/app/lib/articlePublishing';

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

    const now = Date.now();
    const nowIso = new Date().toISOString();
    const scheduledRows = data.filter((row: any) => isScheduledArticleDue(row?.payload, now));

    if (scheduledRows.length > 0) {
      const updates = scheduledRows.map((row: any) => ({
        id: row.id,
        payload: promoteScheduledArticle(row.payload, nowIso),
        deleted: false,
        updated_at: nowIso,
      }));

      const { error: publishError } = await supabase.from('pz_news_articles').upsert(updates, { onConflict: 'id' });
      if (publishError) {
        console.error('Erro ao publicar artigos agendados da homepage:', publishError);
      }
    }

    // Extrai apenas campos necessários e filtra artigos publicados
    const articles = data
      .map((row: any) => (isScheduledArticleDue(row?.payload, now) ? { ...row, payload: promoteScheduledArticle(row.payload, nowIso) } : row))
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
