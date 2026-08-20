import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Marcar como dinâmica para evitar pré-renderização
export const dynamic = 'force-dynamic';
export const revalidate = 300;

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
}

function getAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
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
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
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

    // Extrai apenas campos necessários e filtra artigos publicados
    const articles = (data ?? [])
      .filter((row: any) => row.payload?.status === 'publicado')
      .map((row: any) => {
        const payload: ArticlePayload = row.payload;
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

    return NextResponse.json(articles, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
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
