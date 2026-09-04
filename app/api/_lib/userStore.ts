import { NextResponse } from 'next/server';

export type StoredUserRow = { id: string; payload: Record<string, unknown>; updated_at?: string };

function env(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim().replace(/^["']|["']$/g, '');
    if (value && value !== '[SENSITIVE]') return value;
  }
  return '';
}

const url = env('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL').replace(/\/$/, '');
const key = env('SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY');
const table = url ? `${url}/rest/v1/pz_news_users` : '';

export function hasUserStoreConfig() {
  if (!table || !key) return false;
  try { const parsed = new URL(table); return ['http:', 'https:'].includes(parsed.protocol) && !!parsed.hostname; } catch { return false; }
}

function headers() {
  return { apikey: key, Authorization: 'Bearer ' + key, Accept: 'application/json', 'Content-Type': 'application/json' };
}

export async function listStoredUsers(): Promise<StoredUserRow[]> {
  const response = await fetch(`${table}?select=id,payload,updated_at&order=updated_at.desc`, { headers: headers(), cache: 'no-store' });
  if (!response.ok) throw new Error(`Supabase recusou a consulta de usuários (${response.status}).`);
  return (await response.json()) as StoredUserRow[];
}

export async function saveStoredUser(id: string, payload: Record<string, unknown>) {
  const response = await fetch(table, {
    method: 'POST',
    headers: { ...headers(), Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ id, payload, updated_at: new Date().toISOString() }),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Supabase recusou o usuário (${response.status}).`);
  return NextResponse.json({ ok: true, id });
}
