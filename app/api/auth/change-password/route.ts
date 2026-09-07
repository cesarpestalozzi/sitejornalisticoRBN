import { NextRequest, NextResponse } from 'next/server';
import { resolveAdminUser } from '@/app/api/_lib/adminServerAuth';
import { listStoredUsers, saveStoredUser } from '@/app/api/_lib/userStore';

function encodePassword(value: string) {
  return Buffer.from(value, 'utf8').toString('base64');
}

export async function POST(request: NextRequest) {
  const user = await resolveAdminUser(request);
  if (!user) return NextResponse.json({ ok: false, error: 'Sessão inválida.' }, { status: 401 });
  const body = await request.json().catch(() => null) as { password?: unknown } | null;
  const password = String(body?.password ?? '');
  if (password.length < 8 || password.length > 128) return NextResponse.json({ ok: false, error: 'A nova senha deve ter entre 8 e 128 caracteres.' }, { status: 400 });
  const row = (await listStoredUsers()).find((item) => item.id === user.id);
  if (!row) return NextResponse.json({ ok: false, error: 'Usuário não encontrado.' }, { status: 404 });
  await saveStoredUser(user.id, { ...row.payload, passwordHash: encodePassword(password), passwordChangeRequired: false, onboardingStatus: 'active', updatedAt: new Date().toISOString() });
  return NextResponse.json({ ok: true });
}
