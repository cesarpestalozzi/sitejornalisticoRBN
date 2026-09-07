import { NextRequest, NextResponse } from 'next/server';
import { createDocumentationPinToken, hasDocumentationPinConfigured, resolveAdminUser } from '@/app/api/_lib/adminServerAuth';
import { listStoredUsers } from '@/app/api/_lib/userStore';

function encoded(value: string) {
  return Buffer.from(value, 'utf8').toString('base64');
}

export async function POST(request: NextRequest) {
  const user = await resolveAdminUser(request);
  if (!user) return NextResponse.json({ ok: false, error: 'Sessão inválida.' }, { status: 401 });
  if (!hasDocumentationPinConfigured()) return NextResponse.json({ ok: false, error: 'PIN de Recursos Humanos não configurado no ambiente da Vercel.' }, { status: 503 });
  const body = await request.json().catch(() => ({})) as { password?: unknown; pin?: unknown };
  const password = String(body.password ?? body.pin ?? '');
  const row = (await listStoredUsers()).find((item) => item.id === user.id);
  const configuredPin = process.env.HR_DOCUMENTATION_PIN?.trim() || process.env.DOCUMENTATION_PIN?.trim() || '';
  const valid = configuredPin
    ? password === configuredPin
    : Boolean(row && (String(row.payload.passwordHash ?? '') === password || String(row.payload.passwordHash ?? '') === encoded(password)));
  if (!valid) return NextResponse.json({ ok: false, error: 'Senha inválida.' }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set('rbn_hr_documentation_access', createDocumentationPinToken(user.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 60,
  });
  return response;
}
