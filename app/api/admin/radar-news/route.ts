import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  getRelevanceLevel,
  getTimeFilterMs,
  inferCategoryFromText,
  normalizeText,
  RADAR_DEFAULT_SOURCES,
  type RadarCategory,
  type RadarNewsGroup,
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

type RadarPayload = {
  items: RadarNewsItem[];
  groups: RadarNewsGroup[];
  topics: RadarTopic[];
  lastUpdatedAt: string;
  totalSources: number;
  totalFetched: number;
  warnings: string[];
};

type CacheEntry = {
  expiresAt: number;
  payload: RadarPayload;
};

const RSS_CACHE_TTL_MS = 90_000;
const STOP_WORDS = new Set([
  'para',
  'com',
  'sobre',
  'entre',
  'apos',
  'depois',
  'contra',
  'diz',
  'sao',
  'ser',
  'tem',
  'mais',
  'quando',
  'onde',
  'como',
  'pela',
  'pelas',
  'pelo',
  'pelos',
  'uma',
  'umas',
  'uns',
  'das',
  'dos',
  'nos',
  'nas',
  'por',
  'que',
  'sua',
  'seu',
  'seus',
  'suas',
]);

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

function normalizeImageUrl(rawUrl: string) {
  const value = decodeHtml(rawUrl).trim();
  if (!value) {
    return '';
  }
  if (value.startsWith('//')) {
    return `https:${value}`;
  }
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value.replace(/^http:\/\//i, 'https://');
  }
  return '';
}

function extractImageUrlFromBlock(block: string) {
  const patterns = [
    /<media:content[^>]*url=["']([^"']+)["']/i,
    /<media:thumbnail[^>]*url=["']([^"']+)["']/i,
    /<enclosure[^>]*type=["'][^"']*image[^"']*["'][^>]*url=["']([^"']+)["']/i,
    /<enclosure[^>]*url=["']([^"']+)["'][^>]*type=["'][^"']*image[^"']*["']/i,
    /<img[^>]*src=["']([^"']+)["']/i,
    /<img[^>]*data-src=["']([^"']+)["']/i,
    /<img[^>]*srcset=["']([^"'\s,]+)["']/i,
  ];

  for (const pattern of patterns) {
    const match = block.match(pattern);
    const candidate = match?.[1] ? normalizeImageUrl(match[1]) : '';
    if (candidate) {
      return candidate;
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
      const imageUrl = extractImageUrlFromBlock(block);
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
  const recency = Math.max(0, 38 - ageHours * 3.3);
  const sourceWeight = params.sourceReliability * 7;
  const sourcesWeight = Math.min(params.relatedSourcesCount, 12) * 2.7;
  const growthWeight = Math.min(params.growthScore, 28);
  const keywordWeight = Math.min(params.matchedKeywordsCount * 6, 24);
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

function getCoverageGrowthScore(timestamps: number[], uniqueSources: number) {
  if (timestamps.length === 0) {
    return 0;
  }
  const ordered = [...timestamps].sort((left, right) => left - right);
  const oldest = ordered[0];
  const latest = ordered[ordered.length - 1];
  const spreadMinutes = Math.max(0, (latest - oldest) / (1000 * 60));
  const recentWindow = Date.now() - 90 * 60 * 1000;
  const recentHits = ordered.filter((timestamp) => timestamp >= recentWindow).length;
  const spreadBoost = spreadMinutes <= 180 ? Math.max(0, 12 - spreadMinutes / 18) : 0;
  const sourceBoost = Math.min(uniqueSources, 10) * 2.8;
  const recencyBoost = recentHits * 5;
  return Math.max(0, Math.min(40, Math.round(spreadBoost + sourceBoost + recencyBoost)));
}

function tokenizeHeadline(title: string) {
  return normalizeText(title)
    .split(' ')
    .filter((token) => token.length >= 4 && !STOP_WORDS.has(token))
    .slice(0, 10);
}

function computeTrendingTopics(groups: RadarNewsGroup[]) {
  const tokenMap = new Map<string, { mentions: number; momentum: number; relevance: number }>();

  groups.forEach((group) => {
    const tokens = tokenizeHeadline(group.headline);
    const groupWeight = Math.max(1, group.relatedSourcesCount) + Math.round(group.relevanceScore / 25);
    tokens.forEach((token, index) => {
      const current = tokenMap.get(token) ?? { mentions: 0, momentum: 0, relevance: 0 };
      current.mentions += 1;
      current.momentum += group.growthScore + Math.max(0, 6 - index);
      current.relevance += groupWeight;
      tokenMap.set(token, current);
    });
  });

  return [...tokenMap.entries()]
    .filter(([, metrics]) => metrics.mentions >= 2)
    .sort((left, right) => {
      const leftScore = left[1].mentions * 12 + left[1].momentum + left[1].relevance * 2;
      const rightScore = right[1].mentions * 12 + right[1].momentum + right[1].relevance * 2;
      return rightScore - leftScore;
    })
    .slice(0, 10)
    .map(([token, metrics]) => {
      const score = Math.min(100, metrics.mentions * 14 + metrics.momentum + metrics.relevance * 2);
      return {
        id: token,
        label: token,
        mentions: metrics.mentions,
        growthScore: metrics.momentum,
        relevanceLevel: getRelevanceLevel(score),
      } satisfies RadarTopic;
    });
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

    const normalizedQuery = normalizeText(query);
    const queryTokens = normalizedQuery ? normalizedQuery.split(' ').filter((token) => token.length > 1) : [];
    const allItems: RadarNewsItem[] = [];
    const groups: RadarNewsGroup[] = [];

    groupedByFingerprint.forEach((groupEntries, groupId) => {
      const filteredEntries = groupEntries
        .map(({ source, item }) => {
          const category = inferCategoryFromText(item.title, item.summary, source.categories[0] ?? 'geral');
          if (!matchesCategories(category, selectedCategories)) {
            return null;
          }
          if (!withinTimeFilter(item.publishedAt, timeFilter)) {
            return null;
          }

          const searchable = normalizeText(`${item.title} ${item.summary}`);
          const matchedKeywords = queryTokens.filter((token) => searchable.includes(token));
          if (queryTokens.length > 0 && matchedKeywords.length === 0) {
            return null;
          }

          return { source, item, category, matchedKeywords };
        })
        .filter(
          (entry): entry is { source: RadarSource; item: ParsedFeedItem; category: RadarCategory; matchedKeywords: string[] } =>
            Boolean(entry)
        );

      if (filteredEntries.length === 0) {
        return;
      }

      const timestamps = filteredEntries
        .map((entry) => new Date(entry.item.publishedAt).getTime())
        .filter((value) => !Number.isNaN(value));
      const latestPublished = Math.max(...timestamps);
      const oldestPublished = Math.min(...timestamps);
      const uniqueSourceMap = new Map<string, { source: RadarSource; item: ParsedFeedItem }>();
      filteredEntries.forEach((entry) => {
        const existing = uniqueSourceMap.get(entry.source.name);
        const currentTimestamp = new Date(entry.item.publishedAt).getTime();
        if (!existing) {
          uniqueSourceMap.set(entry.source.name, { source: entry.source, item: entry.item });
          return;
        }
        const existingTimestamp = new Date(existing.item.publishedAt).getTime();
        if (currentTimestamp > existingTimestamp) {
          uniqueSourceMap.set(entry.source.name, { source: entry.source, item: entry.item });
        }
      });
      const uniqueSourceCount = uniqueSourceMap.size;
      const growthScore = getCoverageGrowthScore(timestamps, uniqueSourceCount);

      const categoryCount = new Map<RadarCategory, number>();
      filteredEntries.forEach((entry) => {
        categoryCount.set(entry.category, (categoryCount.get(entry.category) ?? 0) + 1);
      });
      const groupCategory =
        [...categoryCount.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? filteredEntries[0].category;

      const representative = [...filteredEntries].sort(
        (left, right) => new Date(right.item.publishedAt).getTime() - new Date(left.item.publishedAt).getTime()
      )[0];
      const groupImage =
        representative.item.imageUrl ||
        filteredEntries.find((entry) => entry.item.imageUrl.trim().length > 0)?.item.imageUrl ||
        '';
      const averageReliability = filteredEntries.reduce((sum, entry) => sum + entry.source.reliability, 0) / filteredEntries.length;
      const keywordSet = new Set(filteredEntries.flatMap((entry) => entry.matchedKeywords));

      const groupRelevanceScore = calculateRelevanceScore({
        publishedAt: new Date(latestPublished).toISOString(),
        sourceReliability: averageReliability,
        relatedSourcesCount: uniqueSourceCount,
        growthScore,
        matchedKeywordsCount: keywordSet.size,
      });

      const groupSources = [...uniqueSourceMap.values()]
        .sort((left, right) => right.source.reliability - left.source.reliability)
        .map(({ source, item }) => ({
          sourceName: source.name,
          sourceUrl: source.url,
          country: source.country,
          reliability: source.reliability,
          articleUrl: item.url,
          publishedAt: item.publishedAt,
          title: item.title,
        }));

      const groupSummary =
        representative.item.summary ||
        `Cobertura em ${uniqueSourceCount} fontes sobre o mesmo acontecimento.`;

      groups.push({
        id: groupId,
        headline: representative.item.title,
        summary: groupSummary,
        imageUrl: groupImage,
        category: groupCategory,
        country: representative.source.country,
        firstPublishedAt: new Date(oldestPublished).toISOString(),
        lastPublishedAt: new Date(latestPublished).toISOString(),
        fetchedAt: nowIso,
        relevanceScore: groupRelevanceScore,
        relevanceLevel: getRelevanceLevel(groupRelevanceScore),
        isNew: Date.now() - latestPublished <= 2 * 60 * 60 * 1000,
        growthScore,
        relatedSourcesCount: uniqueSourceCount,
        matchedKeywords: [...keywordSet],
        sources: groupSources,
        sampleItemIds: [],
      });

      filteredEntries.forEach(({ source, item, category, matchedKeywords }) => {
        const score = calculateRelevanceScore({
          publishedAt: item.publishedAt,
          sourceReliability: source.reliability,
          relatedSourcesCount: uniqueSourceCount,
          growthScore,
          matchedKeywordsCount: matchedKeywords.length,
        });

        allItems.push({
          id: hashText(item.url || `${groupId}-${item.title}`),
          title: item.title,
          summary: item.summary || 'Resumo indisponível na fonte.',
          url: item.url,
          imageUrl: item.imageUrl || groupImage,
          sourceName: source.name,
          sourceUrl: source.url,
          sourceReliability: source.reliability,
          category,
          country: source.country,
          publishedAt: item.publishedAt,
          fetchedAt: nowIso,
          relevanceScore: score,
          relevanceLevel: getRelevanceLevel(score),
          isNew: Date.now() - new Date(item.publishedAt).getTime() <= 2 * 60 * 60 * 1000,
          growthScore,
          relatedSourcesCount: uniqueSourceCount,
          groupId,
          matchedKeywords,
        });
      });
    });

    groups.sort((left, right) => {
      if (right.relevanceScore !== left.relevanceScore) {
        return right.relevanceScore - left.relevanceScore;
      }
      return new Date(right.lastPublishedAt).getTime() - new Date(left.lastPublishedAt).getTime();
    });

    const dedupedItems = new Map<string, RadarNewsItem>();
    allItems.forEach((item) => {
      const key = item.url || item.id;
      const current = dedupedItems.get(key);
      if (!current || current.relevanceScore < item.relevanceScore) {
        dedupedItems.set(key, item);
      }
    });

    const items = [...dedupedItems.values()]
      .sort((left, right) => right.relevanceScore - left.relevanceScore)
      .slice(0, maxItems);

    const groupsWithSample = groups.slice(0, maxItems).map((group) => {
      const sampleIds = items.filter((item) => item.groupId === group.id).slice(0, 6).map((item) => item.id);
      return { ...group, sampleItemIds: sampleIds };
    });

    const topics = computeTrendingTopics(groupsWithSample);
    const payload: RadarPayload = {
      items,
      groups: groupsWithSample,
      topics,
      lastUpdatedAt: nowIso,
      totalSources: sources.length,
      totalFetched: groupsWithSample.length,
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
