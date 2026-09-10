import { NextRequest, NextResponse } from 'next/server';
import { hasArticleStoreConfig, listStoredArticles, permanentlyDeleteStoredArticle, permanentlyDeleteStoredTrash, saveStoredArticle } from '../_lib/articleStore';
import { resolveAdminUser } from '../_lib/adminServerAuth';

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

function isEmbeddedImageValue(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('data:');
}

function liteArticlePayload(id: string, payload: Record<string, unknown>) {
  const hasEmbeddedImage = isEmbeddedImageValue(payload.image);
  const images = Array.isArray(payload.images) ? payload.images : [];
  const hasEmbeddedGallery = images.some(
    (item) => item && typeof item === 'object' && isEmbeddedImageValue((item as { url?: unknown }).url)
  );

  if (!hasEmbeddedImage && !hasEmbeddedGallery) {
    return payload;
  }

  return {
    ...payload,
    image: hasEmbeddedImage ? `/api/article-image?id=${encodeURIComponent(id)}` : payload.image,
    images: hasEmbeddedGallery
      ? images.map((item, index) => {
          if (item && typeof item === 'object' && isEmbeddedImageValue((item as { url?: unknown }).url)) {
            return { ...(item as object), url: `/api/article-image?id=${encodeURIComponent(id)}&index=${index}` };
          }
          return item;
        })
      : payload.images,
  };
}

function samePerson(left: unknown, right: unknown) {
  return String(left ?? '').trim().toLocaleLowerCase() === String(right ?? '').trim().toLocaleLowerCase();
}

function canEditArticle(user: Awaited<ReturnType<typeof resolveAdminUser>>, author: unknown) {
  return Boolean(
    user &&
    (user.role === 'admin' ||
      user.permissions.includes('articles:edit:any') ||
      (user.permissions.includes('articles:edit:own') && samePerson(user.name, author)))
  );
}

function canPublishArticle(user: Awaited<ReturnType<typeof resolveAdminUser>>, author: unknown) {
  return Boolean(
    user &&
    (user.role === 'admin' ||
      user.permissions.includes('articles:publish:any') ||
      (user.permissions.includes('articles:publish:own') && samePerson(user.name, author)))
  );
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
      if (includeDeleted) {
        const user = await resolveAdminUser(request);
        if (!user || (user.role !== 'admin' && !user.permissions.includes('articles:view:all'))) {
          return NextResponse.json({ error: 'Sem permissão para consultar o acervo administrativo.' }, { status: 403 });
        }
      }
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
      // A listagem completa (sem id) é usada para montar a visão geral do
      // painel. Enviar as imagens em base64 de todas as matérias de uma vez
      // gera respostas de dezenas de megabytes e derruba a rota com 502 na
      // Vercel. Trocamos por uma referência leve; a edição de uma matéria
      // específica (com "id") continua recebendo os dados originais.
      const responseRows = id
        ? visibleRows
        : visibleRows.map((row) => ({ ...row, payload: liteArticlePayload(row.id, row.payload) }));
      return NextResponse.json(responseRows, {
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
  const user = await resolveAdminUser(request);
  // Any authenticated active employee may create a draft. Publication,
  // approval, deletion, and administration remain separately permissioned.
  if (!user) return NextResponse.json({ error: 'É necessário estar autenticado para criar notícias.' }, { status: 403 });
  if (hasArticleStoreConfig()) {
    try {
      const body = (await request.json()) as { article?: Record<string, unknown>; deleted?: boolean };
      const article = body.article || {};
      if (['publicado', 'agendado'].includes(String(article.status ?? '')) && !canPublishArticle(user, article.author)) {
        return NextResponse.json({ error: 'Você só pode publicar suas próprias matérias.' }, { status: 403 });
      }
      return await saveStoredArticle(article, Boolean(body.deleted));
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
  const user = await resolveAdminUser(request);
  if (!user || (!user.permissions.includes('articles:edit:any') && !user.permissions.includes('articles:edit:own') && user.role !== 'admin')) return NextResponse.json({ error: 'Sem permissão para editar notícias.' }, { status: 403 });
  if (hasArticleStoreConfig()) {
    try {
      const body = (await request.json()) as { article?: Record<string, unknown>; deleted?: boolean };
      const article = body.article || {};
      if (!canEditArticle(user, article.author)) {
        return NextResponse.json({ error: 'Você só pode editar suas próprias matérias.' }, { status: 403 });
      }
      if (['publicado', 'agendado'].includes(String(article.status ?? '')) && !canPublishArticle(user, article.author)) {
        return NextResponse.json({ error: 'Você só pode publicar suas próprias matérias.' }, { status: 403 });
      }
      return await saveStoredArticle(article, Boolean(body.deleted));
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
  const user = await resolveAdminUser(request);
  if (!user || (user.role !== 'admin' && !user.permissions.includes('articles:delete:any') && !user.permissions.includes('articles:trash:manage'))) return NextResponse.json({ error: 'Sem permissão para excluir notícias.' }, { status: 403 });
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
