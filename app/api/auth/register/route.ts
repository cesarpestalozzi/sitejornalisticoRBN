import { NextResponse } from 'next/server';
import { hasUserStoreConfig, saveStoredUser } from '@/app/api/_lib/userStore';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email || '').trim().toLowerCase();
    const name = String(body?.name || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name) {
      return NextResponse.json({ ok: false, error: 'Nome e e-mail válidos são obrigatórios.' }, { status: 400 });
    }
    if (!hasUserStoreConfig()) {
      if (process.env.VERCEL === '1') return NextResponse.json({ ok: false, error: 'Armazenamento de usuários não configurado.' }, { status: 503 });
      return NextResponse.json({ ok: true, persisted: false });
    }
    const id = String(body?.id || `reader-${email.replace(/[^a-z0-9]/g, '-')}`);
    return await saveStoredUser(id, {
      id, name, email, role: 'leitor', status: 'ativo',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Falha ao criar conta.' }, { status: 500 });
  }
}
