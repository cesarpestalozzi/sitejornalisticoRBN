export type StoredCommentRow = { id: string; payload: Record<string, unknown>; updated_at?: string };

function env(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim().replace(/^["']|["']$/g, '');
    if (value && value !== '[SENSITIVE]') return value;
  }
  return '';
}

const url = env('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL').replace(/\/$/, '');
const key = env('SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY');
const table = url ? `${url}/rest/v1/pz_news_comments` : '';
const headers = () => ({ apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json', 'Content-Type': 'application/json' });

export function hasCommentStoreConfig() { return Boolean(table && key); }

export async function listStoredComments(articleId?: string) {
  const params = new URLSearchParams({ select: 'id,payload,updated_at', order: 'updated_at.desc' });
  if (articleId) params.set('payload->>articleId', `eq.${articleId}`);
  const response = await fetch(`${table}?${params.toString()}`, { headers: headers(), cache: 'no-store' });
  if (!response.ok) throw new Error(`Supabase recusou a consulta de comentários (${response.status}).`);
  return await response.json() as StoredCommentRow[];
}

export async function saveStoredComment(id: string, payload: Record<string, unknown>) {
  const response = await fetch(table, { method: 'POST', headers: { ...headers(), Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ id, payload, updated_at: new Date().toISOString() }), cache: 'no-store' });
  if (!response.ok) throw new Error(`Supabase recusou o comentário (${response.status}).`);
}

export async function deleteStoredComment(id: string) {
  const response = await fetch(`${table}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { ...headers(), Prefer: 'return=minimal' }, cache: 'no-store' });
  if (!response.ok) throw new Error(`Supabase recusou a exclusão do comentário (${response.status}).`);
}
