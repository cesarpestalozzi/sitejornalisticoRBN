import { NextRequest } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
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
const DEFAULT_DOCUMENTATION_PERMISSIONS = ['documentation:view', 'documentation:upload', 'documentation:request'];
const DEFAULT_NEWSROOM_PERMISSIONS = [
  'articles:view:own',
  'articles:create',
  'articles:edit:own',
  'articles:publish:own',
];
const ADMIN_DOCUMENTATION_PERMISSIONS = [
  'documentation:view',
  'documentation:upload',
  'documentation:review',
  'documentation:delete',
  'documentation:request',
  'documentation:manage',
];
const ROLE_ALIASES: Record<string, string> = {
  administrador: 'admin',
  'administrador principal': 'admin',
  administrator: 'admin',
  'editor chefe': 'editor-chefe',
};

function sessionSecret() {
  return process.env.ADMIN_SESSION_SECRET?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';
}

export function createAdminSessionToken(userId: string) {
  const secret = sessionSecret();
  if (!secret) return '';
  const expiresAt = Date.now() + 12 * 60 * 60 * 1000;
  const value = `${userId}.${expiresAt}`;
  const signature = createHmac('sha256', secret).update(value).digest('hex');
  return `${value}.${signature}`;
}

function verifyAdminSessionToken(token: string) {
  const secret = sessionSecret();
  const [userId, expiresAt, signature] = token.split('.');
  if (!secret || !userId || !expiresAt || !signature || Number(expiresAt) < Date.now()) return '';
  const expected = createHmac('sha256', secret).update(`${userId}.${expiresAt}`).digest('hex');
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return '';
  return userId;
}

function normalizeRole(value: unknown) {
  const role = String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
  return ROLE_ALIASES[role] ?? role;
}

export function isTestUser(payload: Record<string, unknown> | null | undefined): boolean {
  if (!payload) return true;
  const name = String(payload.name ?? '').toLowerCase().trim();
  const email = String(payload.email ?? '').toLowerCase().trim();
  const login = String(payload.login ?? '').toUpperCase().trim();
  const status = String(payload.status ?? '').toLowerCase().trim();
  const role = String(payload.role ?? '').toLowerCase().trim();

  if (['removido', 'removed', 'deleted', 'inativo', 'inactive', 'disabled', 'desativado'].includes(status)) return true;
  if (role === 'leitor' || role === 'reader') return true;

  if (
    name === 'teste' ||
    name.startsWith('teste ') ||
    name.startsWith('por redação') ||
    name.startsWith('usuario teste') ||
    email.includes('persist-test') ||
    login.includes('999999999') ||
    login.startsWith('RBN99999') ||
    login === '-'
  ) {
    return true;
  }

  return false;
}

function isActive(payload: Record<string, unknown>) {
  return !isTestUser(payload);
}

function permissionsFor(payload: Record<string, unknown>, role: string) {
  const storedPermissions = Array.isArray(payload.permissions) ? payload.permissions : null;
  const permissions = storedPermissions
    ? storedPermissions.filter((item): item is string => typeof item === 'string')
      .filter((permission) => role === 'admin' || !['users:manage', 'settings:manage', 'analytics:view', 'diagnostics:view', 'monitoring:view'].includes(permission))
    : [];
  // Creating a news article is a base newsroom capability for every active
  // employee. It must not disappear when an older user record has a custom
  // permissions array that predates this capability.
  // The author of a news article may also publish their own work. Publishing
  // someone else's article remains controlled by articles:publish:any.
  const newsroomPermissions = [...permissions, ...DEFAULT_NEWSROOM_PERMISSIONS];
  if (role === 'admin') return [...new Set([...newsroomPermissions, ...DEFAULT_MESSAGING_PERMISSIONS, ...ADMIN_DOCUMENTATION_PERMISSIONS])];
  const roleDocumentation = DEFAULT_DOCUMENTATION_PERMISSIONS;
  return [...new Set([
    ...newsroomPermissions,
    ...DEFAULT_MESSAGING_PERMISSIONS,
    ...roleDocumentation,
  ])];
}

export async function getAdminDirectory(): Promise<DirectoryRow[]> {
  if (hasUserStoreConfig()) {
    return (await listStoredUsers())
      .filter((row) => !isTestUser(row.payload))
      .map((row) => ({ id: row.id, payload: row.payload }));
  }

  const base = (process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
  const response = await fetch(`${base}/api/admin/users`, { cache: 'no-store', headers: { Accept: 'application/json' } });
  if (!response.ok) return [];
  const data = await response.json();
  const rows = Array.isArray(data.rows) ? (data.rows as DirectoryRow[]) : [];
  return rows.filter((row) => !isTestUser(row.payload));
}

export async function resolveAdminUser(request: NextRequest): Promise<ServerAdminUser | null> {
  const userId = verifyAdminSessionToken(request.cookies.get('rbn_admin_user')?.value?.trim() || '');
  if (!userId) return null;
  try {
    const row = (await getAdminDirectory()).find((item) => String(item.id) === userId);
    if (!row || !isActive(row.payload ?? {})) return null;
    const role = normalizeRole(row.payload.role);
    const name = [row.payload.name, row.payload.publicName]
      .map((value) => typeof value === 'string' ? value.trim() : '')
      .find(Boolean);
    if (!name) return null;
    return {
      id: String(row.id),
      name,
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

function documentationPinSecret() {
  return process.env.HR_DOCUMENTATION_PIN?.trim() || process.env.DOCUMENTATION_PIN?.trim() || sessionSecret();
}

export function createDocumentationPinToken(userId: string) {
  const secret = documentationPinSecret();
  if (!secret) return '';
  const expiresAt = Date.now() + 30 * 60 * 1000;
  const value = `${userId}.${expiresAt}`;
  const signature = createHmac('sha256', secret).update(value).digest('hex');
  return `${value}.${signature}`;
}

export function hasDocumentationPinAccess(request: NextRequest, userId: string) {
  const secret = documentationPinSecret();
  if (!secret) return true;
  const token = request.cookies.get('rbn_hr_documentation_access')?.value || '';
  const [tokenUserId, expiresAt, signature] = token.split('.');
  if (!tokenUserId || tokenUserId !== userId || !expiresAt || !signature || Number(expiresAt) < Date.now()) return false;
  const expected = createHmac('sha256', secret).update(`${tokenUserId}.${expiresAt}`).digest('hex');
  return signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export function hasDocumentationPinConfigured() {
  return Boolean(documentationPinSecret());
}
