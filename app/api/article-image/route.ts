import { NextRequest, NextResponse } from 'next/server';
import { hasArticleStoreConfig, listStoredArticles } from '../_lib/articleStore';

const PYTHON_BACKEND_URL = (process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

function getPrimaryArticleImage(payload?: Record<string, unknown>) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const directImage = typeof payload.image === 'string' ? payload.image : null;
  if (directImage) {
    return directImage;
  }

  const images = Array.isArray(payload.images) ? payload.images : [];
  const primary = images.find(
    (item): item is { url: string } =>
      typeof item === 'object' && item !== null && 'url' in item && typeof item.url === 'string' && item.url.trim().length > 0
  );
  return primary?.url ?? null;
}

async function proxyRemoteImage(imageUrl: string, request: NextRequest) {
  const resolvedUrl = imageUrl.startsWith('http') ? imageUrl : new URL(imageUrl, request.url).toString();
  const response = await fetch(resolvedUrl, {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Falha ao buscar imagem remota: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const arrayBuffer = await response.arrayBuffer();

  return new NextResponse(arrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'Content-Length': String(arrayBuffer.byteLength),
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID da matéria obrigatório.' }, { status: 400 });
  }

  try {
    const rows = hasArticleStoreConfig()
      ? await listStoredArticles(id)
      : await (async () => {
          const response = await fetch(`${PYTHON_BACKEND_URL}/api/articles?id=${encodeURIComponent(id)}`, {
            headers: { Accept: 'application/json' },
            cache: 'no-store',
          });
          if (!response.ok) return [];
          return (await response.json()) as Array<{ payload?: Record<string, unknown> }>;
        })();
    const articlePayload = rows.find((row) => row.payload)?.payload;
    const imageValue = getPrimaryArticleImage(articlePayload);

    if (!imageValue) {
      return NextResponse.redirect(new URL('/logo-oficial.png', request.url));
    }

    if (!imageValue.startsWith('data:')) {
      return await proxyRemoteImage(imageValue, request);
    }

    const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/i.exec(imageValue);
    if (!match) {
      return NextResponse.redirect(new URL('/logo-oficial.png', request.url));
    }

    const mimeType = match[1] || 'image/png';
    const base64Payload = match[2] ?? '';
    const buffer = Buffer.from(base64Payload, 'base64');

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        'Content-Length': String(buffer.length),
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.redirect(new URL('/logo-oficial.png', request.url));
  }
}
