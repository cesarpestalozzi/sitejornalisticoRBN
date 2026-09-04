import { NextRequest, NextResponse } from 'next/server';
import { hasArticleStoreConfig, listStoredArticles, permanentlyDeleteStoredArticle, permanentlyDeleteStoredTrash, saveStoredArticle } from '../_lib/articleStore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const pythonApiBase = (process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

function normalizeCategory(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
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

  const response = await fetch(targetUrl, { method, headers, body });
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
  if (hasArticleStoreConfig()) {
    try {
      const searchParams = new URL(request.url).searchParams;
      const id = searchParams.get('id') || undefined;
      const category = searchParams.get('category')?.trim().toLowerCase();
      const includeDeleted = searchParams.get('includeDeleted') === 'true';
      const rows = await listStoredArticles(id);
      const visibleRows = rows.filter((row) => {
        if (!includeDeleted && row.deleted) {
          return false;
        }
        if (!category) {
          return true;
        }
        return normalizeCategory(String(row.payload.category ?? '')) === normalizeCategory(category);
      });
      return NextResponse.json(visibleRows, {
        headers: { 'Cache-Control': 'no-store' },
      });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao consultar notícias.' }, { status: 502 });
    }
  }
  if (process.env.VERCEL === '1') {
    return NextResponse.json(
      { error: 'Armazenamento de notícias não configurado na Vercel.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
  try {
    return await proxyToPython(request, '/api/articles');
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Serviço de artigos indisponível.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

export async function POST(request: NextRequest) {
  if (hasArticleStoreConfig()) {
    try {
      const body = (await request.json()) as { article?: Record<string, unknown>; deleted?: boolean };
      return await saveStoredArticle(body.article || {}, Boolean(body.deleted));
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao salvar notícia.' }, { status: 502 });
    }
  }
  if (process.env.VERCEL === '1') {
    return NextResponse.json(
      { error: 'Armazenamento de notícias não configurado na Vercel.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
  try {
    return await proxyToPython(request, '/api/articles');
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Serviço de artigos indisponível.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

export async function PATCH(request: NextRequest) {
  if (hasArticleStoreConfig()) {
    try {
      const body = (await request.json()) as { article?: Record<string, unknown>; deleted?: boolean };
      return await saveStoredArticle(body.article || {}, Boolean(body.deleted));
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao atualizar notícia.' }, { status: 502 });
    }
  }
  if (process.env.VERCEL === '1') {
    return NextResponse.json(
      { error: 'Armazenamento de notícias não configurado na Vercel.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
  try {
    return await proxyToPython(request, '/api/articles');
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Serviço de artigos indisponível.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (hasArticleStoreConfig()) {
    try {
      const searchParams = new URL(request.url).searchParams;
      const id = new URL(request.url).searchParams.get('id');
      if (searchParams.get('trash') === 'true') {
        return await permanentlyDeleteStoredTrash();
      }
      if (!id) {
        return NextResponse.json({ error: 'ID da notícia é obrigatório.' }, { status: 400 });
      }
      return await permanentlyDeleteStoredArticle(id);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao excluir notícia.' }, { status: 502 });
    }
  }
  if (process.env.VERCEL === '1') {
    return NextResponse.json(
      { error: 'Armazenamento de notícias não configurado na Vercel.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
  try {
    return await proxyToPython(request, '/api/articles');
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Serviço de artigos indisponível.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
