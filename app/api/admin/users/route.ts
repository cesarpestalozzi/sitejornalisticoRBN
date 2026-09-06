import { NextRequest, NextResponse } from 'next/server';
import { isTestUser } from '@/app/api/_lib/adminServerAuth';
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

function normalizeCpf(value: unknown) {
  return typeof value === 'string' ? value.replace(/\D/g, '') : '';
}

function isValidCpf(value: string) {
  if (value.length !== 11 || /^(\d)\1{10}$/.test(value)) return false;
  let sum = 0;
  for (let index = 0; index < 9; index += 1) sum += Number(value[index]) * (10 - index);
  let digit = (sum * 10) % 11;
  if (digit === 10) digit = 0;
  if (digit !== Number(value[9])) return false;
  sum = 0;
  for (let index = 0; index < 10; index += 1) sum += Number(value[index]) * (11 - index);
  digit = (sum * 10) % 11;
  if (digit === 10) digit = 0;
  return digit === Number(value[10]);
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
        return ADMIN_ROLES.has(role) && !isTestUser(row.payload);
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
      const nextCpf = normalizeCpf(body.payload.cpf);
      if (!isValidCpf(nextCpf)) {
        return NextResponse.json({ ok: false, error: 'Informe um CPF válido com 11 dígitos.' }, { status: 400 });
      }
      const nextLogin = String(body.payload.login || '').trim().toUpperCase();
      if (!/^RBN\d{11}$/.test(nextLogin)) {
        return NextResponse.json({ ok: false, error: 'O login deve seguir o padrão RBN + CPF.' }, { status: 400 });
      }
      const conflict = (await listStoredUsers()).find((row) => {
        if (row.id === id) return false;
        const status = String(row.payload.status ?? 'ativo').toLowerCase();
        if (['removido', 'removed', 'deleted'].includes(status)) return false;
        return normalizeCpf(row.payload.cpf) === nextCpf || String(row.payload.login || '').trim().toUpperCase() === nextLogin;
      });
      if (conflict) {
        const sameCpf = normalizeCpf(conflict.payload.cpf) === nextCpf;
        return NextResponse.json({ ok: false, error: sameCpf ? 'CPF já cadastrado.' : 'Login já está em uso.' }, { status: 409 });
      }
      await saveStoredUser(id, { ...body.payload, name: nextName, cpf: nextCpf, login: nextLogin });
      if (nextName && (previousName !== nextName || body.payload.isColumnist === true)) {
        const articles = await listStoredArticles();
        await Promise.all(articles.map(async (row) => {
          const payload = row.payload;
          const ids = Array.isArray(payload.authorUserIds) ? payload.authorUserIds.map(String) : [];
          const matchesStableId = ids.includes(id);
          const authorNames = typeof payload.author === 'string'
            ? payload.author.split(/\s+e\s+/i).map((value) => normalizePersonName(value))
            : [];
          const matchesLegacyName = authorNames.includes(previousName) || (body.payload.isColumnist === true && authorNames.includes(nextName));
          if (!matchesStableId && !matchesLegacyName) return;
          const nextAuthors = matchesStableId || authorNames.includes(nextName)
            ? String(payload.author ?? '')
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
