import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const pythonApiBase = (process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

export async function GET(request: NextRequest) {
  const response = await fetch(`${pythonApiBase}/api/homepage/events`, {
    headers: { Accept: 'text/event-stream' },
    signal: request.signal,
    cache: 'no-store',
  });

  if (!response.ok || !response.body) {
    return new Response('Realtime backend unavailable', { status: response.status || 503 });
  }

  return new Response(response.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
