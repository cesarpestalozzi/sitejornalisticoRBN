import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { isScheduledArticleDue, promoteScheduledArticle } from '@/app/lib/articlePublishing';
import { notifyArticleRecipients } from '@/app/lib/articleNotifications';
import { isValidSupabaseUrl } from '@/app/lib/supabase';

// Marcar como dinâmica para evitar pré-renderização
export const dynamic = 'force-dynamic';
export const revalidate = 60;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

interface ArticlePayload {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  author: string;
  excerpt: string;
  image?: string;
  featured: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
  views: number;
  [key: string]: unknown;
}

type ArticleRow = {
  id: string;
  payload?: ArticlePayload;
  deleted?: boolean;
  updated_at?: string;
};

function getAdminClient() {
  if (!supabaseUrl || !isValidSupabaseUrl(supabaseUrl) || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export async function GET(request: NextRequest) {
  const adminClient = getAdminClient();

  if (!adminClient) {
    return NextResponse.json(
      [],
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  }

  try {
    const { data, error } = await adminClient
      .from('pz_news_articles')
      .select('id, payload, deleted, updated_at')
      .eq('deleted', false)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Erro ao buscar artigos para homepage:', error);
      return NextResponse.json([], {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      });
    }

    const now = Date.now();
    const nowIso = new Date().toISOString();
    const scheduledRows = (data ?? []).filter((row: ArticleRow) => Boolean(row.payload) && isScheduledArticleDue(row.payload as Parameters<typeof isScheduledArticleDue>[0], now));

    if (scheduledRows.length > 0) {
      const updates = scheduledRows
        .map((row: ArticleRow) => ({
          id: row.id,
          payload: row.payload ? promoteScheduledArticle(row.payload as Parameters<typeof promoteScheduledArticle>[0], nowIso) : null,
          deleted: false,
          updated_at: nowIso,
        }))
        .filter((update) => update.payload !== null);

      const { error: publishError } = await adminClient.from('pz_news_articles').upsert(updates, { onConflict: 'id' });
      if (publishError) {
        console.error('Erro ao publicar artigos agendados da homepage:', publishError);
      } else {
        for (const row of scheduledRows) {
          await notifyArticleRecipients(request.url, promoteScheduledArticle(row.payload, nowIso), nowIso);
        }
      }
    }

    // Extrai apenas campos necessários e filtra artigos publicados
    const mappedRows = (data ?? []).flatMap((row: ArticleRow) => {
      if (!row.payload) {
        return [] as ArticleRow[];
      }

      return isScheduledArticleDue(row.payload as Parameters<typeof isScheduledArticleDue>[0], now)
        ? [{ ...row, payload: promoteScheduledArticle(row.payload as Parameters<typeof promoteScheduledArticle>[0], nowIso) }] as ArticleRow[]
        : [row];
    });

    const articles = mappedRows
      .filter((row: ArticleRow): row is ArticleRow => row.payload?.status === 'publicado')
      .map((row: ArticleRow) => {
        const payload = row.payload ?? ({} as ArticlePayload);
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
          views: payload.views || 0,
        };
      });

    return NextResponse.json(articles, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (err) {
    console.error('Erro na API de homepage:', err);
    return NextResponse.json([], {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  }
}
