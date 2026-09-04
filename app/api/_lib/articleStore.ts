import { NextResponse } from 'next/server';

export type ArticleRow = {
  id: string;
  payload: Record<string, unknown>;
  deleted: boolean;
  updated_at?: string;
};

function readEnvironmentValue(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim().replace(/^["']|["']$/g, '');
    if (value && value !== '[SENSITIVE]') {
      return value;
    }
  }
  return '';
}

const supabaseUrl = readEnvironmentValue('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL').replace(/\/$/, '');
const supabaseKey = readEnvironmentValue('SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY');
const tableUrl = supabaseUrl ? `${supabaseUrl}/rest/v1/pz_news_articles` : null;

export function hasArticleStoreConfig() {
  if (!tableUrl || !supabaseKey) {
    return false;
  }

  try {
    const parsed = new URL(tableUrl);
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:') && Boolean(parsed.hostname);
  } catch {
    return false;
  }
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

export async function permanentlyDeleteStoredArticle(id: string) {
  if (!tableUrl || !supabaseKey) {
    throw new Error('Supabase não configurado para armazenar notícias.');
  }

  const response = await fetch(`${tableUrl}?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {
      ...headers(),
      Prefer: 'return=minimal',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase recusou a exclusão permanente (${response.status}): ${detail.slice(0, 300)}`);
  }

  return NextResponse.json({ ok: true, id });
}

export async function permanentlyDeleteStoredTrash() {
  if (!tableUrl || !supabaseKey) {
    throw new Error('Supabase não configurado para armazenar notícias.');
  }

  const response = await fetch(`${tableUrl}?deleted=eq.true`, {
    method: 'DELETE',
    headers: {
      ...headers(),
      Prefer: 'return=minimal',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase recusou a limpeza permanente (${response.status}): ${detail.slice(0, 300)}`);
  }

  return NextResponse.json({ ok: true });
}
