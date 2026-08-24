import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { isScheduledArticleDue, promoteScheduledArticle } from '@/app/lib/articlePublishing';
import { notifyArticleRecipients } from '@/app/lib/articleNotifications';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type ArticlePayload = {
  id?: string;
  title?: string;
  subtitle?: string;
  category?: string;
  author?: string;
  content?: string;
  excerpt?: string;
  status?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  [key: string]: unknown;
};

type ArticleRow = {
  id: string;
  payload?: ArticlePayload;
  deleted?: boolean;
  updated_at?: string;
};

function isPlaceholderArticlePayload(article: {
  title?: unknown;
  subtitle?: unknown;
  category?: unknown;
  author?: unknown;
  content?: unknown;
  excerpt?: unknown;
}) {
  const title = typeof article.title === 'string' ? article.title.trim().toLowerCase() : '';
  const subtitle = typeof article.subtitle === 'string' ? article.subtitle.trim() : '';
  const category = typeof article.category === 'string' ? article.category.trim() : '';
  const author = typeof article.author === 'string' ? article.author.trim() : '';
  const content = typeof article.content === 'string' ? article.content.trim() : '';
  const excerpt = typeof article.excerpt === 'string' ? article.excerpt.trim() : '';

  return title === 'matéria' && !subtitle && !category && !author && !content && !excerpt;
}

function getAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export async function GET(request: NextRequest) {
  const adminClient = getAdminClient();
  const { searchParams } = new URL(request.url);
  const requestedId = searchParams.get('id');
  const requestedCategory = searchParams.get('category');

  if (!adminClient) {
    return NextResponse.json(
      { error: 'Supabase service role not configured.' },
      { status: 500, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
    );
  }

  const query = adminClient
    .from('pz_news_articles')
    .select('id, payload, deleted, updated_at')
    .order('updated_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
    );
  }

  const now = Date.now();
  const nowIso = new Date().toISOString();
  const scheduledRows = (data ?? []).filter(
    (row: ArticleRow) => row.payload && isScheduledArticleDue(row.payload as Parameters<typeof isScheduledArticleDue>[0], now)
  );

  if (scheduledRows.length > 0) {
    const updates = scheduledRows.map((row: ArticleRow) => ({
      id: row.id,
      payload: promoteScheduledArticle(row.payload as Parameters<typeof promoteScheduledArticle>[0], nowIso),
      deleted: false,
      updated_at: nowIso,
    }));

    const { error: publishError } = await adminClient.from('pz_news_articles').upsert(updates, { onConflict: 'id' });
    if (publishError) {
      console.error('Erro ao publicar artigos agendados automaticamente:', publishError);
    } else {
      for (const row of scheduledRows) {
        await notifyArticleRecipients(request.url, promoteScheduledArticle(row.payload, nowIso), nowIso);
      }
    }
  }

  const normalizedRows = (data ?? []).map((row: ArticleRow) => {
    if (row.payload && isScheduledArticleDue(row.payload as Parameters<typeof isScheduledArticleDue>[0], now)) {
      return {
        ...row,
        payload: promoteScheduledArticle(row.payload as Parameters<typeof promoteScheduledArticle>[0], nowIso),
        deleted: false,
        updated_at: nowIso,
      };
    }
    return row;
  });

  if (requestedCategory) {
    const normalizedCategory = requestedCategory.trim().toLowerCase();
    const filteredRows = normalizedRows.filter((row: ArticleRow) => {
      const payload = row?.payload;
      if (!payload || typeof payload !== 'object') {
        return false;
      }

      const categoryValue = typeof payload.category === 'string' ? payload.category.toLowerCase() : '';
      const categorySlug = categoryValue
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim();

      return categorySlug === normalizedCategory
        || categorySlug.replace(/\s+/g, '-') === normalizedCategory
        || categorySlug === normalizedCategory.replace(/-/g, ' ');
    });

    return NextResponse.json(filteredRows, {
      status: 200,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' },
    });
  }

  const normalizedIdRows = normalizedRows.filter((row: ArticleRow) => {
    if (!requestedId) {
      return true;
    }

    return row?.id === requestedId || row?.payload?.id === requestedId;
  });

  return NextResponse.json(normalizedIdRows, {
    status: 200,
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' },
  });
}

export async function POST(request: NextRequest) {
  const adminClient = getAdminClient();

  if (!adminClient) {
    return NextResponse.json(
      { error: 'Supabase service role not configured.' },
      { status: 500, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
    );
  }

  try {
    const body = await request.json();
    const article = body?.article;
    const deleted = Boolean(body?.deleted);

    if (!article || !article.id) {
      return NextResponse.json(
        { error: 'Payload inválido.' },
        { status: 400, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
      );
    }

    let payloadToPersist = article;

    if (isPlaceholderArticlePayload(article)) {
      const { data: existingRow } = await adminClient
        .from('pz_news_articles')
        .select('payload')
        .eq('id', article.id)
        .limit(1)
        .maybeSingle();

      const existingPayload =
        existingRow && typeof existingRow === 'object' && 'payload' in existingRow
          ? (existingRow as { payload?: Record<string, unknown> }).payload
          : null;

      if (!existingPayload || typeof existingPayload !== 'object') {
        return NextResponse.json(
          { error: 'Payload incompleto para este artigo.' },
          { status: 400, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
        );
      }

      const nextViews = typeof article.views === 'number' ? article.views : Number(existingPayload.views ?? 0);
      const nextShares = typeof article.shares === 'number' ? article.shares : Number(existingPayload.shares ?? 0);

      payloadToPersist = {
        ...existingPayload,
        views: Number.isFinite(nextViews) ? nextViews : Number(existingPayload.views ?? 0),
        shares: Number.isFinite(nextShares) ? nextShares : Number(existingPayload.shares ?? 0),
        updatedAt: new Date().toISOString(),
      };
    }

    const { error } = await adminClient.from('pz_news_articles').upsert(
      [
        {
          id: article.id,
          payload: payloadToPersist,
          deleted,
          updated_at: new Date().toISOString(),
        },
      ],
      { onConflict: 'id' }
    );

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao salvar artigo.';
    return NextResponse.json(
      { error: message },
      { status: 500, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const adminClient = getAdminClient();

  if (!adminClient) {
    return NextResponse.json(
      { error: 'Supabase service role not configured.' },
      { status: 500, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
    );
  }

  try {
    const body = await request.json();
    const article = body?.article;
    const deleted = Boolean(body?.deleted);

    if (!article || !article.id) {
      return NextResponse.json(
        { error: 'Payload inválido.' },
        { status: 400, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
      );
    }

    let payloadToPersist = article;

    if (isPlaceholderArticlePayload(article)) {
      const { data: existingRow } = await adminClient
        .from('pz_news_articles')
        .select('payload')
        .eq('id', article.id)
        .limit(1)
        .maybeSingle();

      const existingPayload =
        existingRow && typeof existingRow === 'object' && 'payload' in existingRow
          ? (existingRow as { payload?: Record<string, unknown> }).payload
          : null;

      if (!existingPayload || typeof existingPayload !== 'object') {
        return NextResponse.json(
          { error: 'Artigo não encontrado para atualização.' },
          { status: 404, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
        );
      }

      const nextViews = typeof article.views === 'number' ? article.views : Number(existingPayload.views ?? 0);
      const nextShares = typeof article.shares === 'number' ? article.shares : Number(existingPayload.shares ?? 0);

      payloadToPersist = {
        ...existingPayload,
        views: Number.isFinite(nextViews) ? nextViews : Number(existingPayload.views ?? 0),
        shares: Number.isFinite(nextShares) ? nextShares : Number(existingPayload.shares ?? 0),
        updatedAt: new Date().toISOString(),
      };
    }

    const { data, error } = await adminClient
      .from('pz_news_articles')
      .update({
        payload: payloadToPersist,
        deleted,
        updated_at: new Date().toISOString(),
      })
      .eq('id', article.id)
      .select('id')
      .limit(1);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
      );
    }

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: 'Artigo não encontrado para atualização.' },
        { status: 404, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar artigo.';
    return NextResponse.json(
      { error: message },
      { status: 500, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const adminClient = getAdminClient();

  if (!adminClient) {
    return NextResponse.json(
      { error: 'Supabase service role not configured.' },
      { status: 500, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
    );
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const trash = searchParams.get('trash') === 'true';

  try {
    if (trash) {
      const { error } = await adminClient.from('pz_news_articles').delete().eq('deleted', true);
      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
        );
      }
      return NextResponse.json({ ok: true }, { status: 200, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } });
    }

    if (!id) {
      return NextResponse.json(
        { error: 'ID obrigatório.' },
        { status: 400, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
      );
    }

    const { error } = await adminClient.from('pz_news_articles').delete().eq('id', id);
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao remover artigo.';
    return NextResponse.json(
      { error: message },
      { status: 500, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
    );
  }
}
