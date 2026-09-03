import { NextRequest, NextResponse } from 'next/server';

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
  return proxyToPython(request, '/api/comments');
}

export async function POST(request: NextRequest) {
  return proxyToPython(request, '/api/comments');
}

export async function DELETE(request: NextRequest) {
  return proxyToPython(request, '/api/comments');
}
