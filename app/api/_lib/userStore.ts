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

// Cache curto em memória para a listagem completa de usuários. Essa lista é
// consultada a cada chamada a resolveAdminUser()/getAdminDirectory() em quase
// todas as rotas administrativas; sem cache, cada clique no painel repetia
// uma varredura completa da tabela pz_news_users no Supabase, aumentando o
// I/O de disco. O TTL é curto o bastante para não atrasar a propagação de
// mudanças (criação de usuário, permissão, etc.) além de alguns segundos, e
// é invalidado imediatamente após qualquer gravação.
const USERS_CACHE_TTL_MS = 8_000;
let usersCache: { at: number; rows: StoredUserRow[] } | null = null;
const userByIdCache = new Map<string, { at: number; row: StoredUserRow | null }>();
const userByIdInFlight = new Map<string, Promise<StoredUserRow | null>>();

export function invalidateStoredUsersCache() {
  usersCache = null;
  userByIdCache.clear();
}

export async function listStoredUsers(): Promise<StoredUserRow[]> {
  if (usersCache && Date.now() - usersCache.at < USERS_CACHE_TTL_MS) {
    return usersCache.rows;
  }
  const response = await fetch(`${table}?select=id,payload,updated_at&order=updated_at.desc`, { headers: headers(), cache: 'no-store' });
  if (!response.ok) throw new Error(`Supabase recusou a consulta de usuários (${response.status}).`);
  const rows = (await response.json()) as StoredUserRow[];
  usersCache = { at: Date.now(), rows };
  for (const row of rows) {
    userByIdCache.set(String(row.id), { at: usersCache.at, row });
  }
  return rows;
}

// Consulta indexada por chave primária (id), usada pela autenticação do
// painel. Evita baixar a tabela inteira de usuários só para validar a sessão
// de um único administrador a cada requisição.
export async function getStoredUserById(id: string): Promise<StoredUserRow | null> {
  if (!id) return null;
  const cachedById = userByIdCache.get(id);
  if (cachedById && Date.now() - cachedById.at < USERS_CACHE_TTL_MS) return cachedById.row;
  const inFlight = userByIdInFlight.get(id);
  if (inFlight) return inFlight;
  if (usersCache && Date.now() - usersCache.at < USERS_CACHE_TTL_MS) {
    const row = usersCache.rows.find((item) => String(item.id) === id) ?? null;
    userByIdCache.set(id, { at: usersCache.at, row });
    return row;
  }
  const request = (async () => {
    const response = await fetch(`${table}?select=id,payload,updated_at&id=eq.${encodeURIComponent(id)}&limit=1`, { headers: headers(), cache: 'no-store' });
    if (!response.ok) throw new Error(`Supabase recusou a consulta de usuário (${response.status}).`);
    const rows = (await response.json()) as StoredUserRow[];
    const row = rows[0] ?? null;
    userByIdCache.set(id, { at: Date.now(), row });
    return row;
  })();
  userByIdInFlight.set(id, request);
  try {
    return await request;
  } finally {
    if (userByIdInFlight.get(id) === request) userByIdInFlight.delete(id);
  }
}

export async function saveStoredUser(id: string, payload: Record<string, unknown>) {
  const response = await fetch(table, {
    method: 'POST',
    headers: { ...headers(), Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ id, payload, updated_at: new Date().toISOString() }),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Supabase recusou o usuário (${response.status}).`);
  invalidateStoredUsersCache();
  return NextResponse.json({ ok: true, id });
}
