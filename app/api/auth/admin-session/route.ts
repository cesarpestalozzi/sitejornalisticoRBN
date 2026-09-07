import { NextRequest, NextResponse } from 'next/server';
import { createAdminSessionToken, isTestUser } from '@/app/api/_lib/adminServerAuth';
import { listStoredUsers } from '@/app/api/_lib/userStore';

function hashPassword(value: string) {
  return Buffer.from(value, 'utf8').toString('base64');
}

function validPassword(stored: unknown, input: string) {
  const value = String(stored ?? '');
  return Boolean(input) && (value === input || value === hashPassword(input));
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { userId?: unknown; password?: unknown } | null;
  const userId = String(body?.userId ?? '').trim();
  const password = String(body?.password ?? '');
  if (!userId || !password) return NextResponse.json({ ok: false, error: 'Credenciais obrigatórias.' }, { status: 400 });

  const row = (await listStoredUsers()).find((item) => item.id === userId);
  if (!row || isTestUser(row.payload) || !validPassword(row.payload.passwordHash, password)) {
    return NextResponse.json({ ok: false, error: 'Credenciais inválidas.' }, { status: 401 });
  }

  const token = createAdminSessionToken(userId);
  if (!token) return NextResponse.json({ ok: false, error: 'Sessão segura não configurada.' }, { status: 503 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set('rbn_admin_user', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
  return response;
}
