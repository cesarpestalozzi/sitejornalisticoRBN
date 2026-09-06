import { NextRequest, NextResponse } from 'next/server';
import { createDocumentationPinToken, hasDocumentationPinConfigured, resolveAdminUser } from '@/app/api/_lib/adminServerAuth';

export async function POST(request: NextRequest) {
  const user = await resolveAdminUser(request);
  if (!user) return NextResponse.json({ ok: false, error: 'Sessão inválida.' }, { status: 401 });
  if (!hasDocumentationPinConfigured()) return NextResponse.json({ ok: false, error: 'PIN de Recursos Humanos não configurado no ambiente da Vercel.' }, { status: 503 });
  const body = await request.json().catch(() => ({})) as { pin?: unknown };
  const configuredPin = process.env.HR_DOCUMENTATION_PIN?.trim() || process.env.DOCUMENTATION_PIN?.trim() || '';
  if (String(body.pin ?? '').trim() !== configuredPin) return NextResponse.json({ ok: false, error: 'PIN inválido.' }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set('rbn_hr_documentation_access', createDocumentationPinToken(user.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/admin',
    maxAge: 30 * 60,
  });
  return response;
}
