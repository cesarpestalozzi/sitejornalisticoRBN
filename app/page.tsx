export const dynamic = 'force-dynamic';
export const revalidate = 0;

import HomeClientOptimized from './components/HomeClientOptimized';
import { createClient } from '@supabase/supabase-js';
import { isScheduledArticleDue, promoteScheduledArticle } from '@/app/lib/articlePublishing';
import { normalizeArticleStatus } from '@/app/lib/articleStatus';
import { isValidSupabaseUrl } from '@/app/lib/supabase';

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

type HomeArticleRow = {
  id: string;
  payload?: {
    id?: string;
    title?: string;
    subtitle?: string;
    category?: string;
    author?: string;
    excerpt?: string;
    image?: string;
    featured?: boolean;
    status?: string;
    createdAt?: string;
    updatedAt?: string;
    views?: number;
    [key: string]: unknown;
  };
  deleted?: boolean;
  updated_at?: string;
};

async function getHomepageArticles(): Promise<HomeArticle[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !isValidSupabaseUrl(supabaseUrl) || !serviceRoleKey) {
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
      .limit(12);

    if (error || !data) {
      return [];
    }

    const now = Date.now();
    const nowIso = new Date().toISOString();
    const scheduledRows = data.filter((row: HomeArticleRow) => Boolean(row.payload) && isScheduledArticleDue(row.payload as Parameters<typeof isScheduledArticleDue>[0], now));

    if (scheduledRows.length > 0) {
      const updates = scheduledRows.map((row: HomeArticleRow) => ({
        id: row.id,
        payload: row.payload ? promoteScheduledArticle(row.payload as Parameters<typeof promoteScheduledArticle>[0], nowIso) : null,
        deleted: false,
        updated_at: nowIso,
      })).filter((update) => update.payload !== null);

      const { error: publishError } = await supabase.from('pz_news_articles').upsert(updates, { onConflict: 'id' });
      if (publishError) {
        console.error('Erro ao publicar artigos agendados da homepage:', publishError);
      }
    }

    // Extrai apenas campos necessários e filtra artigos publicados
    const mappedRows = data.flatMap((row: HomeArticleRow) => {
      if (!row.payload) {
        return [] as HomeArticleRow[];
      }

      return isScheduledArticleDue(row.payload as Parameters<typeof isScheduledArticleDue>[0], now)
        ? [{ ...row, payload: promoteScheduledArticle(row.payload as Parameters<typeof promoteScheduledArticle>[0], nowIso) }] as HomeArticleRow[]
        : [row];
    });

    const articles = mappedRows
      .filter((row: HomeArticleRow): row is HomeArticleRow => normalizeArticleStatus(row.payload?.status, row.payload?.publishedAt ? 'publicado' : undefined) === 'publicado')
      .map((row: HomeArticleRow) => {
        const payload = row.payload ?? {};
        return {
          id: payload.id ?? row.id,
          title: payload.title ?? 'Sem título',
          subtitle: payload.subtitle ?? '',
          category: payload.category ?? 'Geral',
          author: payload.author ?? 'RBN',
          excerpt: payload.excerpt ?? '',
          image: payload.image || 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=1200&h=630&fit=crop',
          featured: Boolean(payload.featured),
          updatedAt: payload.updatedAt || payload.createdAt || row.updated_at || new Date().toISOString(),
          views: payload.views ?? 0,
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
