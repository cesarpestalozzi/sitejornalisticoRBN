import { NextRequest, NextResponse } from 'next/server';
import { hasArticleStoreConfig, listStoredArticleSummaries, listStoredArticles, permanentlyDeleteStoredArticle, permanentlyDeleteStoredTrash, saveStoredArticle } from '../_lib/articleStore';
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

function adminArticleSummary(id: string, payload: Record<string, unknown>) {
  const fields = [
    'slug',
    'metaDescription',
    'title',
    'subtitle',
    'category',
    'author',
    'authorUserIds',
    'columnistUserId',
    'showColumnist',
    'excerpt',
    'image',
    'featured',
    'status',
    'scheduledDate',
    'scheduledTime',
    'location',
    'publishedAt',
    'lastUpdatedAt',
    'createdAt',
    'updatedAt',
    'views',
    'shares',
    'podcastId',
  ] as const;
  const summary: Record<string, unknown> = {};
  for (const field of fields) {
    if (Object.hasOwn(payload, field)) summary[field] = payload[field];
  }
  return liteArticlePayload(id, summary);
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
      const hasSession = Boolean(request.cookies.get('rbn_admin_user')?.value?.trim());
      const user = hasSession ? await resolveAdminUser(request) : null;
      const canViewAll = Boolean(
        user && (user.role === 'admin' || user.permissions.includes('articles:view:all'))
      );
      if (!id && !user) {
        return NextResponse.json({ error: 'É necessário estar autenticado para consultar o acervo.' }, { status: 403 });
      }
      if (includeDeleted && !canViewAll) {
        return NextResponse.json({ error: 'Sem permissão para consultar a lixeira de notícias.' }, { status: 403 });
      }
      // Listagem resumida: payload_lite impede que imagens em base64 saiam do
      // Postgres, e a projeção abaixo remove conteúdo/vídeos e campos que as
      // tabelas administrativas não exibem. A edição individual segue usando
      // ?id=... e recebe o payload integral.
      const requestedLimit = Number(searchParams.get('limit') ?? 10000);
      const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 10000) : 10000;
      const rows = id
        ? await listStoredArticles(id)
        : await listStoredArticleSummaries({ includeDeleted: Boolean(includeDeleted && canViewAll), limit });
      const visibleRows = rows.filter((row) => {
        if (row.deleted && !(includeDeleted && canViewAll)) {
          return false;
        }
        if (id && !canViewAll) {
          const status = String(row.payload.status ?? '').trim().toLowerCase();
          const isPublished = ['publicado', 'published', 'publish', 'online'].includes(status);
          const isOwn = Boolean(user) && String(row.payload.author ?? '').trim().toLowerCase() === user?.name.trim().toLowerCase();
          if (!isPublished && !isOwn) return false;
        }
        if (!id && user && !canViewAll) {
          const status = String(row.payload.status ?? '').trim().toLowerCase();
          const isPublished = ['publicado', 'published', 'publish', 'online'].includes(status);
          const isOwn = String(row.payload.author ?? '').trim().toLowerCase() === user.name.trim().toLowerCase();
          if (!isPublished && !isOwn) return false;
        }
        if (!category) {
          return true;
        }
        return normalizeCategory(String(row.payload.category ?? '')) === normalizeCategory(category);
      });
      // As listas retornam somente campos resumidos; imagens embutidas são
      // substituídas por URLs leves. A edição individual (?id=...) continua
      // recebendo o payload completo da matéria.
      const responseRows = id
        ? visibleRows
        : visibleRows.map((row) => ({ ...row, payload: adminArticleSummary(row.id, row.payload) }));
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
  if (!user || (
    !user.permissions.includes('articles:edit:any') &&
    !user.permissions.includes('articles:edit:own') &&
    !user.permissions.includes('articles:trash:manage') &&
    user.role !== 'admin'
  )) return NextResponse.json({ error: 'Sem permissão para editar notícias.' }, { status: 403 });
  if (hasArticleStoreConfig()) {
    try {
      const body = (await request.json()) as {
        id?: string;
        updates?: Record<string, unknown>;
        deleted?: boolean;
        article?: Record<string, unknown>;
      };
      const article = body.article || {};
      const id = String(body.id || article.id || '').trim();
      if (!id) return NextResponse.json({ error: 'ID da notícia é obrigatório.' }, { status: 400 });
      const existingRows = await listStoredArticles(id);
      const existing = existingRows.find((row) => row.id === id) ?? existingRows[0];
      if (!existing) return NextResponse.json({ error: 'Notícia não encontrada.' }, { status: 404 });
      if (
        existing.deleted &&
        user.role !== 'admin' &&
        !user.permissions.includes('articles:trash:manage')
      ) {
        return NextResponse.json({ error: 'Sem permissão para restaurar notícias da lixeira.' }, { status: 403 });
      }
      const updates = body.updates ?? article;
      const mergedArticle: Record<string, unknown> = { ...existing.payload, ...updates, id: existing.id };
      if (!existing.deleted && !canEditArticle(user, existing.payload.author)) {
        return NextResponse.json({ error: 'Você só pode editar suas próprias matérias.' }, { status: 403 });
      }
      if (
        ['publicado', 'agendado'].includes(String(mergedArticle.status ?? '')) &&
        !canPublishArticle(user, mergedArticle.author)
      ) {
        return NextResponse.json({ error: 'Você só pode publicar suas próprias matérias.' }, { status: 403 });
      }
      return await saveStoredArticle(mergedArticle, body.deleted ?? existing.deleted);
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
