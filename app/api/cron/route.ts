import { NextRequest, NextResponse } from 'next/server';
import { hasArticleStoreConfig, listStoredArticles, saveStoredArticle } from '../_lib/articleStore';
import { isScheduledArticleDue, promoteScheduledArticle } from '@/app/lib/articlePublishing';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  if (hasArticleStoreConfig()) {
    try {
      const now = Date.now();
      const rows = await listStoredArticles();
      const dueRows = rows.filter((row) => !row.deleted && isScheduledArticleDue(row.payload, now));

      await Promise.all(
        dueRows.map((row) => saveStoredArticle(promoteScheduledArticle({ ...row.payload, id: row.id }), false))
      );

      return NextResponse.json({ ok: true, publishedCount: dueRows.length });
    } catch (error) {
      return NextResponse.json(
        { ok: false, error: error instanceof Error ? error.message : 'Falha ao publicar matérias agendadas.' },
        { status: 502 }
      );
    }
  }

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
        error: payload?.error || `Falha ao processar publicacoes agendadas (${response.status}).`,
      },
      { status: response.status }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
