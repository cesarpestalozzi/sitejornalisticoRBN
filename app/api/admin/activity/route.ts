import { NextRequest, NextResponse } from 'next/server';
import { resolveAdminUser, updateStoredUserActivity } from '@/app/api/_lib/adminServerAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const user = await resolveAdminUser(request);
  if (!user) return NextResponse.json({ ok: false, error: 'Sessão inválida.' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const now = new Date().toISOString();
  const fields = body.event === 'login'
    ? { lastLoginAt: now, lastSeenAt: now, isOnline: true }
    : { lastSeenAt: now, isOnline: true };
  try {
    const ok = await updateStoredUserActivity(user.id, fields);
    const response = NextResponse.json({ ok });
    if (ok) {
      response.cookies.set('rbn_admin_user', user.id, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 12,
        path: '/',
      });
    }
    return response;
  } catch {
    return NextResponse.json({ ok: false, error: 'Não foi possível atualizar a atividade.' }, { status: 502 });
  }
}
