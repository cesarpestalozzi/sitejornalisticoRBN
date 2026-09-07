export type AnalyticsEvent = {
  id: string;
  event_type: 'article_view' | 'article_share' | 'page_view';
  article_id?: string | null;
  category?: string | null;
  author_user_ids?: string[] | null;
  occurred_at: string;
  metadata?: Record<string, unknown>;
};

function env(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim().replace(/^["']|["']$/g, '');
    if (value && value !== '[SENSITIVE]') return value;
  }
  return '';
}

const url = env('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL').replace(/\/$/, '');
const key = env('SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY');
const table = url ? `${url}/rest/v1/pz_news_analytics_events` : '';
const fallbackTable = url ? `${url}/rest/v1/pz_news_articles` : '';

function headers(extra: Record<string, string> = {}) {
  return { apikey: key, Authorization: 'Bearer ' + key, Accept: 'application/json', 'Content-Type': 'application/json', ...extra };
}

export function hasAnalyticsStoreConfig() {
  return Boolean(table && key);
}

export async function saveAnalyticsEvent(event: AnalyticsEvent) {
  if (!hasAnalyticsStoreConfig()) throw new Error('Armazenamento de métricas não configurado.');
  const response = await fetch(table, {
    method: 'POST',
    headers: headers({ Prefer: 'resolution=ignore-duplicates,return=minimal' }),
    body: JSON.stringify(event),
    cache: 'no-store',
  });
  if (response.ok) return;

  // Older production schemas may not have optional analytics columns yet.
  // Retry with the stable core columns before using the article-store fallback.
  if (response.status === 400) {
    const compatibilityResponse = await fetch(table, {
      method: 'POST',
      headers: headers({ Prefer: 'resolution=ignore-duplicates,return=minimal' }),
      body: JSON.stringify({
        id: event.id,
        event_type: event.event_type,
        article_id: event.article_id ?? null,
        category: event.category ?? null,
        occurred_at: event.occurred_at,
      }),
      cache: 'no-store',
    });
    if (compatibilityResponse.ok) return;
  }
  if (response.status !== 404 && response.status !== 400) {
    throw new Error(`Supabase recusou o evento de métrica (${response.status}).`);
  }
  const fallback = await fetch(fallbackTable, {
    method: 'POST',
    headers: headers({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
    body: JSON.stringify({ id: `__analytics__:${event.id}`, payload: { ...event, _type: 'analytics_event' }, deleted: false, updated_at: event.occurred_at }),
    cache: 'no-store',
  });
  if (!fallback.ok) {
    const detail = await fallback.text();
    throw new Error(`Supabase recusou o fallback de métrica (${fallback.status}): ${detail.slice(0, 300)}`);
  }
}

export async function listAnalyticsEvents(from?: string, to?: string) {
  if (!hasAnalyticsStoreConfig()) throw new Error('Armazenamento de métricas não configurado.');
  const all: AnalyticsEvent[] = [];
  let offset = 0;
  const pageSize = 1000;
  while (true) {
    const params = new URLSearchParams({
      select: 'id,event_type,article_id,category,author_user_ids,occurred_at,metadata',
      order: 'occurred_at.asc',
      limit: String(pageSize),
      offset: String(offset),
    });
    if (from) params.set('occurred_at', `gte.${from}`);
    if (to) params.append('occurred_at', `lte.${to}`);
    let response = await fetch(`${table}?${params.toString()}`, { headers: headers(), cache: 'no-store' });
    if (response.status === 400) {
      const compatibleParams = new URLSearchParams(params);
      compatibleParams.set('select', 'id,event_type,article_id,category,occurred_at');
      response = await fetch(`${table}?${compatibleParams.toString()}`, { headers: headers(), cache: 'no-store' });
    }
    if (response.status === 404) {
      const fallbackResponse = await fetch(`${fallbackTable}?id=like.__analytics__:*&select=payload&order=updated_at.asc&limit=10000`, { headers: headers(), cache: 'no-store' });
      if (!fallbackResponse.ok) throw new Error(`Supabase recusou a consulta de métricas (${fallbackResponse.status}).`);
      const fallbackRows = await fallbackResponse.json() as Array<{ payload?: AnalyticsEvent & { _type?: string } }>;
      return fallbackRows.map((row) => row.payload).filter((event): event is AnalyticsEvent => event?._type === 'analytics_event' && (!from || event.occurred_at >= from) && (!to || event.occurred_at <= to));
    }
    if (!response.ok) throw new Error(`Supabase recusou a consulta de métricas (${response.status}).`);
    const rows = (await response.json()) as AnalyticsEvent[];
    all.push(...rows);
    if (rows.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}
