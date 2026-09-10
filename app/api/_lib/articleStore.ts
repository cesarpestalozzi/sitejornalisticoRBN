import { NextResponse } from 'next/server';

export type ArticleRow = {
  id: string;
  payload: Record<string, unknown>;
  deleted: boolean;
  updated_at?: string;
};

export type ArticleImageRow = {
  image?: unknown;
  images?: unknown;
};

function readEnvironmentValue(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim().replace(/^["']|["']$/g, '');
    if (value && value !== '[SENSITIVE]') return value;
  }
  return '';
}

const supabaseUrl = readEnvironmentValue('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL').replace(/\/$/, '');
const supabaseKey = readEnvironmentValue('SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY');
const tableUrl = supabaseUrl ? `${supabaseUrl}/rest/v1/pz_news_articles` : null;

export function hasArticleStoreConfig() {
  if (!tableUrl || !supabaseKey) return false;
  try {
    const parsed = new URL(tableUrl);
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:') && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

function headers() {
  return {
    apikey: supabaseKey,
    Authorization: 'Bearer ' + supabaseKey,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

async function fetchArticleRows(params: URLSearchParams): Promise<ArticleRow[]> {
  const response = await fetch(`${tableUrl}?${params.toString()}`, { headers: headers(), cache: 'no-store' });
  if (!response.ok) throw new Error(`Supabase retornou ${response.status} ao consultar notícias.`);
  const rows = (await response.json()) as ArticleRow[];
  return rows.filter((row) =>
    !row.id.startsWith('__analytics__:') &&
    !row.id.startsWith('__comment__:') &&
    !row.id.startsWith('__videoconference:')
  );
}

export async function listStoredArticles(id?: string, options?: {
  publishedOnly?: boolean;
  status?: string;
  category?: string;
  limit?: number;
}): Promise<ArticleRow[]> {
  if (!tableUrl || !supabaseKey) throw new Error('Supabase não configurado para armazenar notícias.');
  const buildParams = () => {
    const params = new URLSearchParams({
      select: 'id,payload,deleted,updated_at',
      order: 'updated_at.desc',
      limit: String(Math.min(Math.max(options?.limit ?? 10000, 1), 10000)),
    });
    if (options?.publishedOnly) {
      params.set('payload->>status', 'in.(publicado,published,online)');
      params.set('deleted', 'eq.false');
    } else if (options?.status) {
      params.set('payload->>status', options.status.startsWith('in.') ? options.status : `eq.${options.status}`);
    }
    if (options?.category) params.set('payload->>category', `eq.${options.category}`);
    return params;
  };

  const params = buildParams();
  if (id) params.set('id', `eq.${id}`);
  const rows = await fetchArticleRows(params);

  // A URL pública das matérias pode usar o slug amigável em vez do ID
  // numérico. Se a busca direta pelo ID não encontrar nada, tentamos
  // localizar a matéria pelo slug salvo dentro do payload.
  if (id && rows.length === 0) {
    const slugParams = buildParams();
    slugParams.set('payload->>slug', `eq.${id}`);
    slugParams.set('limit', '1');
    return fetchArticleRows(slugParams);
  }

  return rows;
}

export async function getStoredArticleImages(id: string): Promise<ArticleImageRow | null> {
  if (!tableUrl || !supabaseKey) throw new Error('Supabase não configurado para armazenar notícias.');
  const params = new URLSearchParams({
    select: 'image:payload->>image,images:payload->images',
    id: `eq.${id}`,
    limit: '1',
  });
  const response = await fetch(`${tableUrl}?${params.toString()}`, {
    headers: headers(),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Supabase retornou ${response.status} ao consultar imagem da notícia.`);
  const rows = (await response.json()) as ArticleImageRow[];
  return rows[0] ?? null;
}

export async function saveStoredArticle(article: Record<string, unknown>, deleted: boolean) {
  if (!tableUrl || !supabaseKey) throw new Error('Supabase não configurado para armazenar notícias.');
  const id = String(article.id || article.slug || article.articleId || '').trim();
  if (!id) return NextResponse.json({ error: 'ID da notícia é obrigatório.' }, { status: 400 });
  const response = await fetch(tableUrl, {
    method: 'POST',
    headers: { ...headers(), Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ id, payload: article, deleted, updated_at: new Date().toISOString() }),
    cache: 'no-store',
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase recusou o salvamento (${response.status}): ${detail.slice(0, 300)}`);
  }
  return NextResponse.json({ ok: true, id });
}

export async function permanentlyDeleteStoredArticle(id: string) {
  if (!tableUrl || !supabaseKey) throw new Error('Supabase não configurado para armazenar notícias.');
  const response = await fetch(`${tableUrl}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { ...headers(), Prefer: 'return=minimal' }, cache: 'no-store' });
  if (!response.ok) throw new Error(`Supabase recusou a exclusão permanente (${response.status}).`);
  return NextResponse.json({ ok: true, id });
}

export async function permanentlyDeleteStoredTrash() {
  if (!tableUrl || !supabaseKey) throw new Error('Supabase não configurado para armazenar notícias.');
  const response = await fetch(`${tableUrl}?deleted=eq.true`, { method: 'DELETE', headers: { ...headers(), Prefer: 'return=minimal' }, cache: 'no-store' });
  if (!response.ok) throw new Error(`Supabase recusou a limpeza permanente (${response.status}).`);
  return NextResponse.json({ ok: true });
}
