import { NextRequest, NextResponse } from 'next/server';
import { hasUserStoreConfig, listStoredUsers, saveStoredUser } from '@/app/api/_lib/userStore';
import { listStoredArticles, saveStoredArticle } from '@/app/api/_lib/articleStore';

export const dynamic = 'force-dynamic';

const pythonApiBase = (process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const ADMIN_ROLES = new Set(['admin', 'administrador', 'administrador principal', 'editor-chefe', 'editor chefe', 'editor', 'jornalista', 'colaborador', 'estagiario']);

function normalizeRole(value: unknown) {
  return typeof value === 'string'
    ? value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ')
    : '';
}

function normalizePersonName(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/^por\s+/i, '') : '';
}

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
    try {
      const rows = (await listStoredUsers()).filter((row) => {
        const role = normalizeRole(row.payload.role);
        const status = String(row.payload.status ?? 'ativo').toLowerCase().trim();
        return ADMIN_ROLES.has(role) && !['removido', 'removed', 'deleted'].includes(status);
      }).map((row) => ({
        ...row,
        payload: { ...row.payload, name: normalizePersonName(row.payload.name) || row.payload.name },
      }));
      return NextResponse.json({ ok: true, rows, source: 'supabase' });
    }
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
      const previous = (await listStoredUsers()).find((row) => row.id === id);
      const previousName = normalizePersonName(previous?.payload.name);
      const nextName = normalizePersonName(body.payload.name) || previousName;
      await saveStoredUser(id, { ...body.payload, name: nextName });
      if (previousName && nextName && previousName !== nextName) {
        const articles = await listStoredArticles();
        await Promise.all(articles.map(async (row) => {
          const payload = row.payload;
          const ids = Array.isArray(payload.authorUserIds) ? payload.authorUserIds.map(String) : [];
          const matchesStableId = ids.includes(id);
          const matchesLegacyName = typeof payload.author === 'string' && payload.author.split(/\s+e\s+/i).map((value) => value.trim()).includes(previousName);
          if (!matchesStableId && !matchesLegacyName) return;
          const nextAuthors = matchesStableId
            ? String(payload.author ?? '').replace(previousName, nextName)
            : String(payload.author ?? '').replace(previousName, nextName);
          await saveStoredArticle({ ...payload, author: nextAuthors, authorUserIds: ids.includes(id) ? ids : [...ids, id] }, row.deleted);
        }));
      }
      return NextResponse.json({ ok: true, id });
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
      return await saveStoredUser(id, {
        ...row.payload,
        status: 'removido',
        removedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (error) { return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Falha ao desativar usuário.' }, { status: 502 }); }
  }
  if (process.env.VERCEL === '1') return NextResponse.json({ ok: false, error: 'Armazenamento de usuários não configurado.' }, { status: 503 });
  return proxyToPython(request, '/api/admin/users');
}
