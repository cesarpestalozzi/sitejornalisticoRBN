'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Bell,
  Bookmark,
  BookmarkCheck,
  Bot,
  ExternalLink,
  Flame,
  RefreshCw,
  Search,
  Settings2,
  Timer,
  XCircle,
} from 'lucide-react';
import AdminSidebar from '@/app/components/AdminSidebar';
import {
  canAccessAdminRoute,
  useCurrentAdminUser,
} from '@/app/lib/adminPermissions';
import {
  RADAR_CATEGORIES,
  RADAR_DEFAULT_SOURCES,
  RADAR_REFRESH_OPTIONS,
  RADAR_TIME_FILTERS,
  type RadarCategory,
  type RadarNewsItem,
  type RadarSort,
  type RadarSource,
  type RadarTimeFilter,
  type RadarTopic,
} from '@/app/lib/radarNews';

type RadarResponse = {
  items: RadarNewsItem[];
  topics: RadarTopic[];
  lastUpdatedAt: string;
  totalSources: number;
  totalFetched: number;
  warnings: string[];
};

const SOURCES_STORAGE_KEY = 'pz_news_radar_sources';
const SAVED_STORAGE_KEY = 'pz_news_radar_saved_ids';
const IGNORED_STORAGE_KEY = 'pz_news_radar_ignored_ids';
const REFRESH_STORAGE_KEY = 'pz_news_radar_refresh_minutes';
const KEYWORDS_STORAGE_KEY = 'pz_news_radar_keywords';

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJson<T>(key: string, value: T) {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(value));
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Sem data';
  }
  return date.toLocaleString('pt-BR');
}

function formatRelative(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / (1000 * 60));
  if (minutes < 1) {
    return 'agora';
  }
  if (minutes < 60) {
    return `${minutes} min atrás`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h atrás`;
  }
  const days = Math.round(hours / 24);
  return `${days}d atrás`;
}

function getRelevanceBadge(level: RadarNewsItem['relevanceLevel']) {
  if (level === 'muito-relevante') {
    return { label: '🔥 MUITO RELEVANTE', className: 'bg-red-100 text-red-800 border-red-200' };
  }
  if (level === 'relevante') {
    return { label: '🟠 RELEVANTE', className: 'bg-orange-100 text-orange-800 border-orange-200' };
  }
  if (level === 'atencao') {
    return { label: '🟡 ATENÇÃO', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
  }
  return { label: '⚪ BAIXA RELEVÂNCIA', className: 'bg-gray-100 text-gray-700 border-gray-200' };
}

export default function RadarNoticiasPage() {
  const currentUser = useCurrentAdminUser();
  const router = useRouter();
  const [isFetching, setIsFetching] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<RadarTimeFilter>('24h');
  const [sortBy, setSortBy] = useState<RadarSort>('relevantes');
  const [selectedCategories, setSelectedCategories] = useState<RadarCategory[]>([]);
  const [refreshMinutes, setRefreshMinutes] = useState(() => loadJson<number>(REFRESH_STORAGE_KEY, 10));
  const [items, setItems] = useState<RadarNewsItem[]>([]);
  const [topics, setTopics] = useState<RadarTopic[]>([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState('');
  const [savedIds, setSavedIds] = useState<string[]>(() => loadJson<string[]>(SAVED_STORAGE_KEY, []));
  const [ignoredIds, setIgnoredIds] = useState<string[]>(() => loadJson<string[]>(IGNORED_STORAGE_KEY, []));
  const [sources, setSources] = useState<RadarSource[]>(() => loadJson<RadarSource[]>(SOURCES_STORAGE_KEY, RADAR_DEFAULT_SOURCES));
  const [keywordAlerts, setKeywordAlerts] = useState<string[]>(() =>
    loadJson<string[]>(KEYWORDS_STORAGE_KEY, ['lula', 'congresso', 'stf', 'são paulo', 'eleições'])
  );
  const [newKeyword, setNewKeyword] = useState('');
  const [selectedItemForAnalysis, setSelectedItemForAnalysis] = useState<RadarNewsItem | null>(null);
  const [isSourcePanelOpen, setIsSourcePanelOpen] = useState(false);

  useEffect(() => {
    if (currentUser && !canAccessAdminRoute(currentUser, '/admin/radar-noticias')) {
      router.push('/admin/dashboard');
    }
  }, [currentUser, router]);

  useEffect(() => {
    saveJson(SOURCES_STORAGE_KEY, sources);
  }, [sources]);

  useEffect(() => {
    saveJson(SAVED_STORAGE_KEY, savedIds);
  }, [savedIds]);

  useEffect(() => {
    saveJson(IGNORED_STORAGE_KEY, ignoredIds);
  }, [ignoredIds]);

  useEffect(() => {
    saveJson(REFRESH_STORAGE_KEY, refreshMinutes);
  }, [refreshMinutes]);

  useEffect(() => {
    saveJson(KEYWORDS_STORAGE_KEY, keywordAlerts);
  }, [keywordAlerts]);

  const fetchRadar = useCallback(async () => {
    setIsFetching(true);
    setErrorMessage('');
    try {
      const response = await fetch('/api/admin/radar-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          query,
          categories: selectedCategories,
          timeFilter,
          maxItems: 120,
          sources,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as Partial<RadarResponse> & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? 'Falha ao atualizar radar.');
      }

      setItems(Array.isArray(payload.items) ? payload.items : []);
      setTopics(Array.isArray(payload.topics) ? payload.topics : []);
      setWarnings(Array.isArray(payload.warnings) ? payload.warnings : []);
      setLastUpdatedAt(typeof payload.lastUpdatedAt === 'string' ? payload.lastUpdatedAt : new Date().toISOString());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao atualizar radar.';
      setErrorMessage(message);
    } finally {
      setIsFetching(false);
    }
  }, [query, selectedCategories, timeFilter, sources]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void fetchRadar();
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [fetchRadar]);

  useEffect(() => {
    if (refreshMinutes <= 0) {
      return;
    }

    const timerId = window.setInterval(() => {
      void fetchRadar();
    }, refreshMinutes * 60 * 1000);

    return () => window.clearInterval(timerId);
  }, [fetchRadar, refreshMinutes]);

  const visibleItems = useMemo(() => {
    const filtered = items.filter((item) => !ignoredIds.includes(item.id));
    const sorted = [...filtered];
    sorted.sort((left, right) => {
      if (sortBy === 'recentes') {
        return new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime();
      }
      if (sortBy === 'crescimento') {
        return right.growthScore - left.growthScore;
      }
      if (sortBy === 'fontes') {
        return right.relatedSourcesCount - left.relatedSourcesCount;
      }
      return right.relevanceScore - left.relevanceScore;
    });
    return sorted;
  }, [ignoredIds, items, sortBy]);

  const highRelevanceCount = visibleItems.filter((item) => item.relevanceLevel === 'muito-relevante').length;

  const alerts = useMemo(() => {
    if (keywordAlerts.length === 0) {
      return [];
    }
    const normalized = keywordAlerts.map((keyword) => keyword.trim().toLowerCase()).filter(Boolean);
    return visibleItems.filter((item) => {
      const text = `${item.title} ${item.summary}`.toLowerCase();
      return normalized.some((keyword) => text.includes(keyword)) && item.relevanceLevel !== 'baixa';
    });
  }, [keywordAlerts, visibleItems]);

  const toggleCategory = (category: RadarCategory) => {
    setSelectedCategories((current) =>
      current.includes(category) ? current.filter((item) => item !== category) : [...current, category]
    );
  };

  const addKeyword = () => {
    const keyword = newKeyword.trim().toLowerCase();
    if (!keyword) {
      return;
    }
    setKeywordAlerts((current) => (current.includes(keyword) ? current : [...current, keyword]));
    setNewKeyword('');
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 md:flex-row">
      <AdminSidebar />

      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          <header className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#991B1B]">Monitoramento editorial</p>
                <h1 className="mt-1 text-3xl font-bold text-gray-900">Radar de Notícias</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Acompanhe acontecimentos em tempo real para transformar em pauta com decisão editorial.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void fetchRadar()}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#111111] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2a2a2a]"
                >
                  <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                  Atualizar
                </button>
                <button
                  type="button"
                  onClick={() => setIsSourcePanelOpen((current) => !current)}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
                >
                  <Settings2 className="h-4 w-4" />
                  Fontes do radar
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-700">🔴 Radar ativo</p>
                <p className="mt-1 text-sm text-red-900">Atualização contínua a cada {refreshMinutes} minutos.</p>
              </article>
              <article className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-600">Última atualização</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{lastUpdatedAt ? formatDateTime(lastUpdatedAt) : 'Aguardando'}</p>
              </article>
              <article className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-600">Notícias encontradas</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{visibleItems.length}</p>
              </article>
              <article className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-600">Assuntos em alta</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{topics.length}</p>
              </article>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_200px]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Pesquisar acontecimentos, pessoas, lugares ou assuntos..."
                  className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-[#991B1B] focus:ring-2 focus:ring-[#991B1B]/10"
                />
              </label>

              <select
                value={timeFilter}
                onChange={(event) => setTimeFilter(event.target.value as RadarTimeFilter)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-[#991B1B] focus:ring-2 focus:ring-[#991B1B]/10"
              >
                {RADAR_TIME_FILTERS.map((filter) => (
                  <option key={filter.id} value={filter.id}>
                    {filter.label}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as RadarSort)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-[#991B1B] focus:ring-2 focus:ring-[#991B1B]/10"
              >
                <option value="relevantes">Mais relevantes</option>
                <option value="recentes">Mais recentes</option>
                <option value="crescimento">Maior crescimento</option>
                <option value="fontes">Mais fontes</option>
              </select>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {RADAR_CATEGORIES.map((category) => {
                const active = selectedCategories.includes(category.id);
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => toggleCategory(category.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? 'border-[#991B1B] bg-[#fff1f1] text-[#991B1B]'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {category.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
                <Timer className="h-3.5 w-3.5" />
                Atualizar a cada
              </span>
              <div className="flex flex-wrap gap-2">
                {RADAR_REFRESH_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setRefreshMinutes(option)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      refreshMinutes === option
                        ? 'bg-[#111111] text-white'
                        : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {option} min
                  </button>
                ))}
              </div>
            </div>

            {errorMessage && (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{errorMessage}</p>
            )}

            {warnings.length > 0 && (
              <div className="mt-4 space-y-2">
                {warnings.map((warning) => (
                  <p key={warning} className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2 text-sm text-yellow-800">
                    {warning}
                  </p>
                ))}
              </div>
            )}
          </header>

          {isSourcePanelOpen && (
            <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">Fontes do Radar</h2>
              <p className="mt-1 text-sm text-gray-600">Ative ou desative as fontes monitoradas. Links originais sempre são preservados.</p>
              <div className="mt-4 space-y-3">
                {sources.map((source) => (
                  <article key={source.id} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{source.name}</p>
                        <p className="text-xs text-gray-600">{source.url}</p>
                        <p className="mt-1 text-xs text-gray-600">
                          {source.country} • confiabilidade {source.reliability}/5 • {source.categories.length} categorias
                        </p>
                      </div>
                      <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <input
                          type="checkbox"
                          checked={source.enabled}
                          onChange={(event) =>
                            setSources((current) =>
                              current.map((item) => (item.id === source.id ? { ...item, enabled: event.target.checked } : item))
                            )
                          }
                          className="h-4 w-4 rounded border-gray-300 text-[#991B1B]"
                        />
                        Ativa
                      </label>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          <section className="mb-6 grid gap-6 lg:grid-cols-[1.6fr_minmax(0,1fr)]">
            <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <Flame className="h-5 w-5 text-[#991B1B]" />
                Assuntos em alta
              </h2>
              <div className="mt-4 grid gap-2">
                {topics.length === 0 ? (
                  <p className="text-sm text-gray-600">Sem assuntos em alta no filtro atual.</p>
                ) : (
                  topics.map((topic, index) => (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => setQuery(topic.label)}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left transition hover:bg-gray-100"
                    >
                      <span className="text-sm font-semibold text-gray-900">
                        {index + 1}. {topic.label}
                      </span>
                      <span className="text-xs font-medium text-gray-600">{topic.mentions} fontes</span>
                    </button>
                  ))
                )}
              </div>
            </article>

            <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <Bell className="h-5 w-5 text-[#991B1B]" />
                Alertas por palavras-chave
              </h2>
              <p className="mt-1 text-sm text-gray-600">Quando surgir algo relevante, o alerta aparece aqui no painel.</p>
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(event) => setNewKeyword(event.target.value)}
                  placeholder="Ex.: Congresso"
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-[#991B1B] focus:ring-2 focus:ring-[#991B1B]/10"
                />
                <button
                  type="button"
                  onClick={addKeyword}
                  className="rounded-lg bg-[#111111] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#2a2a2a]"
                >
                  Adicionar
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {keywordAlerts.map((keyword) => (
                  <span key={keyword} className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
                    {keyword}
                    <button
                      type="button"
                      onClick={() => setKeywordAlerts((current) => current.filter((item) => item !== keyword))}
                      className="text-gray-500 transition hover:text-red-700"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
              {alerts.length > 0 && (
                <div className="mt-4 space-y-2">
                  {alerts.slice(0, 4).map((alert) => (
                    <p key={alert.id} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                      🔴 Novo acontecimento relevante: {alert.title}
                    </p>
                  ))}
                </div>
              )}
            </article>
          </section>

          <section className="space-y-4">
            {visibleItems.length === 0 ? (
              <article className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-8 text-center text-sm text-gray-600 shadow-sm">
                Nenhuma notícia encontrada com os filtros atuais.
              </article>
            ) : (
              visibleItems.map((item) => {
                const relevance = getRelevanceBadge(item.relevanceLevel);
                const saved = savedIds.includes(item.id);
                return (
                  <article key={item.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="grid gap-0 md:grid-cols-[240px_minmax(0,1fr)]">
                      <div className="h-full min-h-[180px] bg-gray-100">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center p-4 text-center text-xs text-gray-500">Imagem indisponível</div>
                        )}
                      </div>
                      <div className="p-4">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${relevance.className}`}>{relevance.label}</span>
                          {item.isNew && (
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                              novidade
                            </span>
                          )}
                          <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-semibold text-gray-700">
                            {item.relatedSourcesCount} fontes
                          </span>
                        </div>

                        <h3 className="text-lg font-bold text-gray-900">{item.title}</h3>
                        <p className="mt-2 text-sm text-gray-700">{item.summary}</p>

                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-600">
                          <span>Fonte: {item.sourceName}</span>
                          <span>Categoria: {RADAR_CATEGORIES.find((category) => category.id === item.category)?.label ?? 'Geral'}</span>
                          <span>Local: {item.country}</span>
                          <span>Publicado: {formatRelative(item.publishedAt)}</span>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-800 transition hover:bg-gray-50"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Ver fonte
                          </a>
                          <button
                            type="button"
                            onClick={() => setSelectedItemForAnalysis(item)}
                            className="inline-flex items-center gap-2 rounded-lg border border-[#991B1B]/20 bg-[#fff7f7] px-3 py-2 text-xs font-semibold text-[#991B1B] transition hover:bg-[#ffeaea]"
                          >
                            <Bot className="h-4 w-4" />
                            Analisar pauta
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setSavedIds((current) =>
                                current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id]
                              )
                            }
                            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                              saved
                                ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                            {saved ? 'Salvo' : 'Salvar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setIgnoredIds((current) => (current.includes(item.id) ? current : [...current, item.id]))}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                          >
                            <XCircle className="h-4 w-4" />
                            Ignorar
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </section>

          {selectedItemForAnalysis && (
            <section className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
              <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-5 shadow-xl">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#991B1B]">Análise de pauta</p>
                    <h2 className="mt-1 text-xl font-bold text-gray-900">{selectedItemForAnalysis.title}</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedItemForAnalysis(null)}
                    className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 transition hover:bg-gray-50"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4 text-sm text-gray-800">
                  <article className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="font-semibold text-gray-900">O que aconteceu?</p>
                    <p className="mt-2">{selectedItemForAnalysis.summary}</p>
                  </article>
                  <article className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="font-semibold text-gray-900">Por que isso é relevante?</p>
                    <p className="mt-2">
                      O tema aparece em {selectedItemForAnalysis.relatedSourcesCount} fontes, com score de relevância {selectedItemForAnalysis.relevanceScore}/100 e tendência de crescimento {selectedItemForAnalysis.growthScore}.
                    </p>
                  </article>
                  <article className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="font-semibold text-gray-900">O que já está confirmado?</p>
                    <ul className="mt-2 list-inside list-disc space-y-1">
                      <li>Título e resumo publicados por {selectedItemForAnalysis.sourceName}.</li>
                      <li>Publicação registrada em {formatDateTime(selectedItemForAnalysis.publishedAt)}.</li>
                      <li>Link original disponível para checagem editorial.</li>
                    </ul>
                  </article>
                  <article className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="font-semibold text-amber-900">O que ainda precisa ser confirmado?</p>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-amber-900">
                      <li>Contexto completo dos fatos e impactos locais.</li>
                      <li>Declarações oficiais e contrapontos das partes envolvidas.</li>
                      <li>Dados quantitativos adicionais para aprofundar a apuração.</li>
                    </ul>
                  </article>
                  <article className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="font-semibold text-gray-900">Sugestão inicial de título</p>
                    <p className="mt-2">{`"${selectedItemForAnalysis.title}"`}</p>
                    <p className="mt-2 text-xs text-gray-600">
                      Palavra-chave principal: {selectedItemForAnalysis.matchedKeywords[0] ?? RADAR_CATEGORIES.find((item) => item.id === selectedItemForAnalysis.category)?.label ?? 'Geral'}.
                    </p>
                  </article>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <a
                    href={selectedItemForAnalysis.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Abrir fonte original
                  </a>
                  <Link
                    href="/admin/artigos/novo"
                    className="inline-flex items-center gap-2 rounded-lg bg-[#111111] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#2a2a2a]"
                  >
                    Transformar em pauta (novo artigo)
                  </Link>
                </div>
              </div>
            </section>
          )}

          <footer className="mt-8 rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs text-gray-600 shadow-sm">
            <p className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-[#991B1B]" />
              O Radar é apoio editorial. Nenhuma notícia é publicada automaticamente sem revisão da redação.
            </p>
            <p className="mt-2">Fontes ativas: {sources.filter((source) => source.enabled).length} • Alta relevância: {highRelevanceCount} itens</p>
          </footer>
        </div>
      </main>
    </div>
  );
}
