import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const pythonApiBase = (process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

export async function POST(request: NextRequest) {
  const targetUrl = new URL('/api/password-reset/request', `${pythonApiBase}/`);
  const body = await request.text();

  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body,
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
}
