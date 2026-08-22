import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const target = new URL('/api/articles', request.url);
  const response = await fetch(target.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    return NextResponse.json(
      {
        ok: false,
        error: payload?.error || `Falha ao processar publicações agendadas (${response.status}).`,
      },
      { status: response.status }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
