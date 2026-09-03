import { NextRequest, NextResponse } from 'next/server';
import { hasArticleStoreConfig, listStoredArticles } from '../../_lib/articleStore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const pythonApiBase = (process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

export async function GET(request: NextRequest) {
  if (hasArticleStoreConfig()) {
    try {
      const rows = await listStoredArticles();
      const articles = rows
        .filter((row) => !row.deleted && String(row.payload.status || '').toLowerCase() === 'publicado')
        .map((row) => ({ ...row.payload, id: row.id, updatedAt: row.payload.updatedAt || row.updated_at }))
        .sort((left, right) => String(right.updatedAt || '').localeCompare(String(left.updatedAt || '')));
      return NextResponse.json(articles, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao consultar homepage.' }, { status: 502 });
    }
  }

  if (process.env.VERCEL === '1') {
    return NextResponse.json(
      { error: 'Armazenamento de notícias não configurado na Vercel.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const incomingUrl = new URL(request.url);
  const targetUrl = new URL('/api/homepage/articles', `${pythonApiBase}/`);
  for (const [key, value] of incomingUrl.searchParams.entries()) {
    targetUrl.searchParams.set(key, value);
  }

  try {
    const response = await fetch(targetUrl, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Serviço da homepage indisponível.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
