import { NextRequest, NextResponse } from 'next/server';
import { listAnalyticsEvents } from '@/app/api/_lib/analyticsStore';
import { listStoredArticles } from '@/app/api/_lib/articleStore';
import { listStoredUsers } from '@/app/api/_lib/userStore';
import { resolveAdminUser } from '@/app/api/_lib/adminServerAuth';

export const dynamic = 'force-dynamic';

function isDate(value: string | null) {
  return !value || !Number.isNaN(Date.parse(value));
}

export async function GET(request: NextRequest) {
  const user = await resolveAdminUser(request);
  if (!user || user.role !== 'admin') return NextResponse.json({ ok: false, error: 'Apenas o administrador principal pode acessar Analytics.' }, { status: 403 });
  const params = new URL(request.url).searchParams;
  const from = params.get('from');
  const to = params.get('to');
  if (!isDate(from) || !isDate(to)) return NextResponse.json({ ok: false, error: 'Período inválido.' }, { status: 400 });
  try {
    const [events, articles, users] = await Promise.all([
      listAnalyticsEvents(from || undefined, to || undefined),
      listStoredArticles(undefined, { lite: true }),
      listStoredUsers(),
    ]);
    const commentsResponse = await fetch(new URL('/api/comments', request.url), { headers: { Accept: 'application/json' }, cache: 'no-store' });
    const comments = commentsResponse.ok ? await commentsResponse.json() as Array<{ payload?: { createdAt?: string } }> : [];
    return NextResponse.json({
      ok: true,
      events,
      comments,
      articles: articles.filter((row) => !row.deleted).map((row) => ({ id: row.id, payload: row.payload })),
      users: users.map((row) => ({ id: row.id, payload: row.payload })),
      generatedAt: new Date().toISOString(),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Falha ao consultar analytics.' }, { status: 502 });
  }
}
