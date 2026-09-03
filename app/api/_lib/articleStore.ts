import { NextResponse } from 'next/server';

export type ArticleRow = {
  id: string;
  payload: Record<string, unknown>;
  deleted: boolean;
  updated_at?: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const tableUrl = supabaseUrl ? `${supabaseUrl}/rest/v1/pz_news_articles` : null;

export function hasArticleStoreConfig() {
  return Boolean(tableUrl && supabaseKey);
}

function headers() {
  return {
    apikey: supabaseKey || '',
    Authorization: `Bearer ${supabaseKey || ''}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

export async function listStoredArticles(id?: string): Promise<ArticleRow[]> {
  if (!tableUrl || !supabaseKey) {
    throw new Error('Supabase não configurado para armazenar notícias.');
  }

  const params = new URLSearchParams({
    select: 'id,payload,deleted,updated_at',
    order: 'updated_at.desc',
  });
  if (id) {
    params.set('id', `eq.${id}`);
  }

  const response = await fetch(`${tableUrl}?${params.toString()}`, {
    headers: headers(),
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Supabase retornou ${response.status} ao consultar notícias.`);
  }
  return (await response.json()) as ArticleRow[];
}

export async function saveStoredArticle(article: Record<string, unknown>, deleted: boolean) {
  if (!tableUrl || !supabaseKey) {
    throw new Error('Supabase não configurado para armazenar notícias.');
  }

  const id = String(article.id || article.slug || article.articleId || '').trim();
  if (!id) {
    return NextResponse.json({ error: 'ID da notícia é obrigatório.' }, { status: 400 });
  }

  const response = await fetch(tableUrl, {
    method: 'POST',
    headers: {
      ...headers(),
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({
      id,
      payload: article,
      deleted,
      updated_at: new Date().toISOString(),
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase recusou o salvamento (${response.status}): ${detail.slice(0, 300)}`);
  }
  return NextResponse.json({ ok: true, id });
}
