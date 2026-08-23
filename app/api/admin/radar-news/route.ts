import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  getRelevanceLevel,
  getTimeFilterMs,
  inferCategoryFromText,
  normalizeText,
  RADAR_DEFAULT_SOURCES,
  type RadarCategory,
  type RadarNewsItem,
  type RadarSource,
  type RadarTimeFilter,
  type RadarTopic,
} from '@/app/lib/radarNews';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type ParsedFeedItem = {
  title: string;
  summary: string;
  url: string;
  imageUrl: string;
  publishedAt: string;
};

type RadarScanBody = {
  query?: string;
  categories?: RadarCategory[];
  timeFilter?: RadarTimeFilter;
  sources?: RadarSource[];
  maxItems?: number;
};

type CacheEntry = {
  expiresAt: number;
  payload: {
    items: RadarNewsItem[];
    topics: RadarTopic[];
    lastUpdatedAt: string;
    totalSources: number;
    totalFetched: number;
    warnings: string[];
  };
};

const RSS_CACHE_TTL_MS = 90_000;
const globalCache = globalThis as typeof globalThis & { __rbnRadarCache?: Map<string, CacheEntry> };
const radarCache = globalCache.__rbnRadarCache ?? new Map<string, CacheEntry>();
globalCache.__rbnRadarCache = radarCache;

function decodeHtml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

function stripHtml(value: string) {
  return decodeHtml(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toIsoDate(value: string | undefined) {
  if (!value) {
    return new Date().toISOString();
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  return date.toISOString();
}

function pickTagValue(block: string, tags: string[]) {
  for (const tag of tags) {
    const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
    const match = block.match(pattern);
    if (match?.[1]) {
      return stripHtml(match[1]);
    }
  }
  return '';
}

function parseRss(xml: string) {
  const itemBlocks = [...xml.matchAll(/<item[\s\S]*?<\/item>/gi)].map((match) => match[0]);
  return itemBlocks
    .map((block): ParsedFeedItem | null => {
      const title = pickTagValue(block, ['title']);
      const summary = pickTagValue(block, ['description', 'content:encoded', 'summary']);
      const link = pickTagValue(block, ['link', 'guid']);
      const pubDate = pickTagValue(block, ['pubDate', 'published', 'updated', 'dc:date']);
      const mediaMatch =
        block.match(/<media:content[^>]*url=["']([^"']+)["']/i) ??
        block.match(/<media:thumbnail[^>]*url=["']([^"']+)["']/i) ??
        block.match(/<enclosure[^>]*url=["']([^"']+)["']/i) ??
        block.match(/<img[^>]*src=["']([^"']+)["']/i);

      const imageUrl = mediaMatch?.[1] ? decodeHtml(mediaMatch[1].trim()) : '';
      const url = link.trim();
      if (!title || !url) {
        return null;
      }

      return {
        title,
        summary,
        url,
        imageUrl,
        publishedAt: toIsoDate(pubDate),
      };
    })
    .filter((item): item is ParsedFeedItem => Boolean(item));
}

function makeFingerprint(value: string) {
  const normalized = normalizeText(value).split(' ').slice(0, 14).join(' ');
  return normalized || value.trim().toLowerCase();
}

function hashText(value: string) {
  return createHash('sha1').update(value).digest('hex');
}

function matchesCategories(itemCategory: RadarCategory, selected: RadarCategory[]) {
  if (selected.length === 0) {
    return true;
  }

  return selected.includes(itemCategory);
}

function calculateRelevanceScore(params: {
  publishedAt: string;
  sourceReliability: number;
  relatedSourcesCount: number;
  growthScore: number;
  matchedKeywordsCount: number;
}) {
  const now = Date.now();
  const published = new Date(params.publishedAt).getTime();
  const ageHours = Math.max(0, (now - published) / (1000 * 60 * 60));
  const recency = Math.max(0, 35 - ageHours * 3.2);
  const sourceWeight = params.sourceReliability * 7;
  const sourcesWeight = Math.min(params.relatedSourcesCount, 12) * 2.5;
  const growthWeight = Math.min(params.growthScore, 25);
  const keywordWeight = Math.min(params.matchedKeywordsCount * 5, 20);
  return Math.max(0, Math.min(100, Math.round(recency + sourceWeight + sourcesWeight + growthWeight + keywordWeight)));
}

function withinTimeFilter(publishedAt: string, filter: RadarTimeFilter) {
  const threshold = Date.now() - getTimeFilterMs(filter);
  const published = new Date(publishedAt).getTime();
  if (Number.isNaN(published)) {
    return false;
  }
  return published >= threshold;
}

function computeTrendingTopics(items: RadarNewsItem[]) {
  const tokenMap = new Map<string, { mentions: number; growth: number }>();

  items.forEach((item) => {
    const tokens = normalizeText(item.title)
      .split(' ')
      .filter((token) => token.length >= 4)
      .slice(0, 8);

    tokens.forEach((token) => {
      const current = tokenMap.get(token) ?? { mentions: 0, growth: 0 };
      current.mentions += 1;
      current.growth += item.growthScore;
      tokenMap.set(token, current);
    });
  });

  return [...tokenMap.entries()]
    .filter(([, value]) => value.mentions > 1)
    .sort((left, right) => {
      if (right[1].mentions !== left[1].mentions) {
        return right[1].mentions - left[1].mentions;
      }
      return right[1].growth - left[1].growth;
    })
    .slice(0, 8)
    .map(([token, value]) => ({
      id: token,
      label: token,
      mentions: value.mentions,
      growthScore: value.growth,
      relevanceLevel: getRelevanceLevel(Math.min(100, value.mentions * 15 + value.growth)),
    }));
}

async function fetchSource(source: RadarSource) {
  const response = await fetch(source.url, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Accept: 'application/rss+xml, application/xml, text/xml;q=0.9,*/*;q=0.8',
      'User-Agent': 'RBN-Radar/1.0 (+https://www.rbnbrasil.com.br)',
    },
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const xml = await response.text();
  return parseRss(xml);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as RadarScanBody;
    const query = typeof body.query === 'string' ? body.query.trim() : '';
    const selectedCategories = Array.isArray(body.categories) ? body.categories : [];
    const timeFilter: RadarTimeFilter = body.timeFilter ?? '24h';
    const maxItems = typeof body.maxItems === 'number' ? Math.min(Math.max(body.maxItems, 10), 200) : 80;
    const sources = (Array.isArray(body.sources) && body.sources.length > 0 ? body.sources : RADAR_DEFAULT_SOURCES).filter((source) => source.enabled);

    const cacheKey = hashText(
      JSON.stringify({
        query: normalizeText(query),
        selectedCategories,
        timeFilter,
        maxItems,
        sources: sources.map((source) => ({
          id: source.id,
          url: source.url,
          reliability: source.reliability,
          categories: source.categories,
        })),
      })
    );

    const cached = radarCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.payload, {
        status: 200,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' },
      });
    }

    const warnings: string[] = [];
    const sourceResults = await Promise.all(
      sources.map(async (source) => {
        try {
          const items = await fetchSource(source);
          return { source, items };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'erro desconhecido';
          warnings.push(`Fonte "${source.name}" indisponível (${message}).`);
          return { source, items: [] as ParsedFeedItem[] };
        }
      })
    );

    const nowIso = new Date().toISOString();
    const groupedByFingerprint = new Map<string, Array<{ source: RadarSource; item: ParsedFeedItem }>>();

    sourceResults.forEach(({ source, items }) => {
      items.forEach((item) => {
        const groupId = hashText(makeFingerprint(item.title));
        const list = groupedByFingerprint.get(groupId) ?? [];
        list.push({ source, item });
        groupedByFingerprint.set(groupId, list);
      });
    });

    const rawItems: RadarNewsItem[] = [];
    const normalizedQuery = normalizeText(query);
    const queryTokens = normalizedQuery ? normalizedQuery.split(' ').filter((token) => token.length > 1) : [];

    groupedByFingerprint.forEach((group, groupId) => {
      const relatedSources = new Set(group.map((entry) => entry.source.name));
      const relatedSourcesCount = relatedSources.size;
      const latestPublishedAt = group
        .map((entry) => new Date(entry.item.publishedAt).getTime())
        .filter((value) => !Number.isNaN(value))
        .sort((left, right) => right - left)[0];
      const oldestPublishedAt = group
        .map((entry) => new Date(entry.item.publishedAt).getTime())
        .filter((value) => !Number.isNaN(value))
        .sort((left, right) => left - right)[0];
      const growthScore =
        latestPublishedAt && oldestPublishedAt ? Math.max(0, Math.round((latestPublishedAt - oldestPublishedAt) / (1000 * 60 * 20))) : 0;

      group.forEach(({ source, item }) => {
        const category = inferCategoryFromText(item.title, item.summary, source.categories[0] ?? 'geral');
        if (!matchesCategories(category, selectedCategories)) {
          return;
        }
        if (!withinTimeFilter(item.publishedAt, timeFilter)) {
          return;
        }

        const searchable = normalizeText(`${item.title} ${item.summary}`);
        const matchedKeywords = queryTokens.filter((token) => searchable.includes(token));
        if (queryTokens.length > 0 && matchedKeywords.length === 0) {
          return;
        }

        const relevanceScore = calculateRelevanceScore({
          publishedAt: item.publishedAt,
          sourceReliability: source.reliability,
          relatedSourcesCount,
          growthScore,
          matchedKeywordsCount: matchedKeywords.length,
        });

        rawItems.push({
          id: hashText(item.url || `${groupId}-${item.title}`),
          title: item.title,
          summary: item.summary || 'Resumo indisponível na fonte.',
          url: item.url,
          imageUrl: item.imageUrl,
          sourceName: source.name,
          sourceUrl: source.url,
          sourceReliability: source.reliability,
          category,
          country: source.country,
          publishedAt: item.publishedAt,
          fetchedAt: nowIso,
          relevanceScore,
          relevanceLevel: getRelevanceLevel(relevanceScore),
          isNew: Date.now() - new Date(item.publishedAt).getTime() <= 2 * 60 * 60 * 1000,
          growthScore,
          relatedSourcesCount,
          groupId,
          matchedKeywords,
        });
      });
    });

    rawItems.sort((left, right) => {
      if (right.relevanceScore !== left.relevanceScore) {
        return right.relevanceScore - left.relevanceScore;
      }
      return new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime();
    });

    const deduped = new Map<string, RadarNewsItem>();
    rawItems.forEach((item) => {
      const key = item.url || item.id;
      const current = deduped.get(key);
      if (!current || current.relevanceScore < item.relevanceScore) {
        deduped.set(key, item);
      }
    });

    const items = [...deduped.values()].slice(0, maxItems);
    const topics = computeTrendingTopics(items);
    const payload = {
      items,
      topics,
      lastUpdatedAt: nowIso,
      totalSources: sources.length,
      totalFetched: items.length,
      warnings,
    };

    radarCache.set(cacheKey, {
      expiresAt: Date.now() + RSS_CACHE_TTL_MS,
      payload,
    });

    return NextResponse.json(payload, {
      status: 200,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao consultar radar.';
    return NextResponse.json(
      { error: message },
      { status: 500, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
    );
  }
}

