import { NextRequest, NextResponse } from 'next/server';
import { deleteStoredComment, hasCommentStoreConfig, listStoredComments, saveStoredComment } from '@/app/api/_lib/commentStore';

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
  if (hasCommentStoreConfig()) {
    try {
      return NextResponse.json(await listStoredComments(new URL(request.url).searchParams.get('articleId') || undefined), { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao consultar comentários.' }, { status: 502 });
    }
  }
  if (process.env.VERCEL === '1') return NextResponse.json({ error: 'Armazenamento de comentários não configurado.' }, { status: 503 });
  return proxyToPython(request, '/api/comments');
}

export async function POST(request: NextRequest) {
  if (hasCommentStoreConfig()) {
    try {
      const body = await request.json() as { comment?: { id?: string } & Record<string, unknown> };
      const comment = body.comment;
      if (!comment?.id) return NextResponse.json({ error: 'ID do comentário é obrigatório.' }, { status: 400 });
      await saveStoredComment(String(comment.id), comment);
      return NextResponse.json({ ok: true });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao salvar comentário.' }, { status: 502 });
    }
  }
  if (process.env.VERCEL === '1') return NextResponse.json({ error: 'Armazenamento de comentários não configurado.' }, { status: 503 });
  return proxyToPython(request, '/api/comments');
}

export async function DELETE(request: NextRequest) {
  if (hasCommentStoreConfig()) {
    try {
      const body = await request.json() as { id?: string };
      if (!body.id) return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 });
      await deleteStoredComment(body.id);
      return NextResponse.json({ ok: true });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao excluir comentário.' }, { status: 502 });
    }
  }
  if (process.env.VERCEL === '1') return NextResponse.json({ error: 'Armazenamento de comentários não configurado.' }, { status: 503 });
  return proxyToPython(request, '/api/comments');
}
