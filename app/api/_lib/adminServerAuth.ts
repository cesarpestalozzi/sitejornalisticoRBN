import { NextRequest } from 'next/server';
import { hasUserStoreConfig, listStoredUsers } from '@/app/api/_lib/userStore';

export type ServerAdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  avatar?: string;
};
type DirectoryRow = { id: string; payload: Record<string, unknown> };

const DEFAULT_MESSAGING_PERMISSIONS = ['messages:view', 'messages:send'];
const ROLE_ALIASES: Record<string, string> = {
  administrador: 'admin',
  'administrador principal': 'admin',
  administrator: 'admin',
  'editor chefe': 'editor-chefe',
};

function normalizeRole(value: unknown) {
  const role = String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
  return ROLE_ALIASES[role] ?? role;
}

function isActive(payload: Record<string, unknown>) {
  return !['inativo', 'inactive', 'disabled', 'desativado', 'removido', 'removed', 'deleted'].includes(
    String(payload.status ?? 'ativo').trim().toLowerCase(),
  );
}

function permissionsFor(payload: Record<string, unknown>, role: string) {
  const storedPermissions = Array.isArray(payload.permissions) ? payload.permissions : null;
  const hasStoredPermissions = storedPermissions !== null;
  const permissions = storedPermissions ? storedPermissions.filter((item): item is string => typeof item === 'string') : [];
  if (role === 'admin') return [...new Set([...permissions, 'messages:view', 'messages:send'])];
  return hasStoredPermissions ? [...new Set(permissions)] : [...new Set([...permissions, ...DEFAULT_MESSAGING_PERMISSIONS])];
}

export async function getAdminDirectory(): Promise<DirectoryRow[]> {
  if (hasUserStoreConfig()) {
    return (await listStoredUsers()).map((row) => ({ id: row.id, payload: row.payload }));
  }

  const base = (process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
  const response = await fetch(`${base}/api/admin/users`, { cache: 'no-store', headers: { Accept: 'application/json' } });
  if (!response.ok) return [];
  const data = await response.json();
  return Array.isArray(data.rows) ? data.rows as DirectoryRow[] : [];
}

export async function resolveAdminUser(request: NextRequest): Promise<ServerAdminUser | null> {
  const userId = request.headers.get('x-admin-user-id')?.trim() || request.cookies.get('rbn_admin_user')?.value?.trim();
  if (!userId) return null;
  try {
    const row = (await getAdminDirectory()).find((item) => String(item.id) === userId);
    if (!row || !isActive(row.payload ?? {})) return null;
    const role = normalizeRole(row.payload.role);
    return {
      id: String(row.id),
      name: String(row.payload.name ?? 'Usuário'),
      email: String(row.payload.email ?? ''),
      role,
      permissions: permissionsFor(row.payload, role),
      avatar: typeof row.payload.avatar === 'string' ? row.payload.avatar : undefined,
    };
  } catch {
    return null;
  }
}

export function canUseMessaging(user: ServerAdminUser | null, permission: 'view' | 'send' = 'view') {
  return Boolean(user?.permissions.includes(permission === 'send' ? 'messages:send' : 'messages:view'));
}

export async function proxyAdminRequest(request: NextRequest, path: string) {
  const base = (process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
  const target = new URL(path, `${base}/`);
  const incoming = new URL(request.url);
  incoming.searchParams.forEach((value, key) => target.searchParams.set(key, value));
  const headers = new Headers({ Accept: 'application/json' });
  const adminId = request.headers.get('x-admin-user-id');
  if (adminId) headers.set('x-admin-user-id', adminId);
  let body: BodyInit | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    body = await request.text();
    if (body) headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(target, { method: request.method, headers, body, cache: 'no-store' });
  return new Response(await response.text(), {
    status: response.status,
    headers: { 'Content-Type': response.headers.get('content-type') ?? 'application/json', 'Cache-Control': 'no-store' },
  });
}

export async function updateStoredUserActivity(userId: string, fields: Record<string, unknown>) {
  const users = await getAdminDirectory();
  const row = users.find((item) => String(item.id) === userId);
  if (!row) return false;
  const payload = { ...row.payload, ...fields, updatedAt: new Date().toISOString() };
  if (hasUserStoreConfig()) {
    const { saveStoredUser } = await import('@/app/api/_lib/userStore');
    await saveStoredUser(userId, payload);
  } else {
    const base = (process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
    const response = await fetch(`${base}/api/admin/users`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: userId, payload }),
      cache: 'no-store',
    });
    if (!response.ok) return false;
  }
  return true;
}
