import { NextRequest, NextResponse } from 'next/server';
import { saveAnalyticsEvent } from '@/app/api/_lib/analyticsStore';

export const dynamic = 'force-dynamic';

const eventTypes = new Set(['article_view', 'article_share', 'page_view']);

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as Partial<{
    id: string;
    eventType: string;
    articleId: string;
    category: string;
    authorUserIds: string[];
    occurredAt: string;
    metadata: Record<string, unknown>;
  }> | null;
  const eventType = String(body?.eventType ?? '');
  if (!body?.id || !eventTypes.has(eventType)) return NextResponse.json({ ok: false, error: 'Evento de métrica inválido.' }, { status: 400 });
  const occurredAt = body.occurredAt && !Number.isNaN(Date.parse(body.occurredAt)) ? new Date(body.occurredAt).toISOString() : new Date().toISOString();
  try {
    await saveAnalyticsEvent({
      id: body.id,
      event_type: eventType as 'article_view' | 'article_share' | 'page_view',
      article_id: body.articleId || null,
      category: body.category || null,
      author_user_ids: Array.isArray(body.authorUserIds) ? body.authorUserIds : [],
      occurred_at: occurredAt,
      metadata: body.metadata ?? {},
    });
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Falha ao registrar métrica.' }, { status: 502 });
  }
}
