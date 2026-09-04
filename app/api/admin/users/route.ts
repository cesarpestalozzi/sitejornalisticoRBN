import { NextRequest, NextResponse } from 'next/server';
import { hasUserStoreConfig, listStoredUsers, saveStoredUser } from '@/app/api/_lib/userStore';

export const dynamic = 'force-dynamic';

const pythonApiBase = (process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

async function proxyToPython(request: NextRequest, path: string) {
  const incomingUrl = new URL(request.url);
  const targetUrl = new URL(path, `${pythonApiBase}/`);
  for (const [key, value] of incomingUrl.searchParams.entries()) {
    targetUrl.searchParams.set(key, value);
  }

  const headers = new Headers({ Accept: 'application/json' });
  const method = request.method;
  let body: BodyInit | undefined;

  if (method !== 'GET' && method !== 'HEAD') {
    body = await request.text();
    if (body && body.length > 0) {
      headers.set('Content-Type', 'application/json');
    }
  }

  const response = await fetch(targetUrl, { method, headers, body, cache: 'no-store' });
  const text = await response.text();

  return new NextResponse(text, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('content-type') || 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    },
  });
}

export async function GET(request: NextRequest) {
  if (hasUserStoreConfig()) {
    try { return NextResponse.json({ ok: true, rows: await listStoredUsers(), source: 'supabase' }); }
    catch (error) { return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Falha ao consultar usuários.' }, { status: 502 }); }
  }
  if (process.env.VERCEL === '1') return NextResponse.json({ ok: false, error: 'Armazenamento de usuários não configurado.' }, { status: 503 });
  return proxyToPython(request, '/api/admin/users');
}

export async function POST(request: NextRequest) {
  if (hasUserStoreConfig()) {
    try {
      const body = await request.json();
      const id = String(body?.id || '').trim();
      if (!id || !body?.payload || typeof body.payload !== 'object') return NextResponse.json({ ok: false, error: 'id e payload são obrigatórios.' }, { status: 400 });
      return await saveStoredUser(id, body.payload);
    } catch (error) { return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Falha ao salvar usuário.' }, { status: 502 }); }
  }
  if (process.env.VERCEL === '1') return NextResponse.json({ ok: false, error: 'Armazenamento de usuários não configurado.' }, { status: 503 });
  return proxyToPython(request, '/api/admin/users');
}

export async function DELETE(request: NextRequest) {
  if (hasUserStoreConfig()) {
    try {
      const id = new URL(request.url).searchParams.get('id')?.trim();
      if (!id) return NextResponse.json({ ok: false, error: 'id é obrigatório.' }, { status: 400 });
      const row = (await listStoredUsers()).find((item) => item.id === id);
      if (!row) return NextResponse.json({ ok: true });
      return await saveStoredUser(id, { ...row.payload, status: 'inativo', updatedAt: new Date().toISOString() });
    } catch (error) { return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Falha ao desativar usuário.' }, { status: 502 }); }
  }
  if (process.env.VERCEL === '1') return NextResponse.json({ ok: false, error: 'Armazenamento de usuários não configurado.' }, { status: 503 });
  return proxyToPython(request, '/api/admin/users');
}
