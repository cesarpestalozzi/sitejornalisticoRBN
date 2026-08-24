'use client';

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
import { canAccessAdminRoute, useCurrentAdminUser } from '@/app/lib/adminPermissions';
import { createRadarEditorDraft, RADAR_EDITOR_DRAFT_STORAGE_KEY } from '@/app/lib/radarEditorDraft';
import {
  getRadarCategoryLabel,
  RADAR_CATEGORIES,
  RADAR_DEFAULT_SOURCES,
  RADAR_PAUTA_STATUS_OPTIONS,
  RADAR_REFRESH_OPTIONS,
  RADAR_TIME_FILTERS,
  type RadarCategory,
  type RadarNewsGroup,
  type RadarPauta,
  type RadarPautaStatus,
  type RadarSort,
  type RadarSource,
  type RadarTimeFilter,
  type RadarTopic,
} from '@/app/lib/radarNews';

type RadarResponse = {
  items: unknown[];
  groups: RadarNewsGroup[];
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
const PAUTAS_STORAGE_KEY = 'pz_news_radar_pautas';

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

function getRelevanceBadge(level: RadarNewsGroup['relevanceLevel']) {
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

function buildPautaFromGroup(group: RadarNewsGroup): RadarPauta {
  const now = new Date().toISOString();
  const primaryKeyword = group.matchedKeywords[0] ?? getRadarCategoryLabel(group.category);
  return {
    id: `${Date.now()}-${group.id}`,
    sourceGroupId: group.id,
    provisionalTitle: group.headline,
    category: group.category,
    summary: group.summary,
    sources: group.sources.map((source) => ({
      name: source.sourceName,
      url: source.sourceUrl,
      country: source.country,
      reliability: source.reliability,
    })),
    links: group.sources.map((source) => source.articleUrl),
    confirmedInfo: [
      `O tema está sendo coberto por ${group.relatedSourcesCount} fontes.`,
      `Última atualização encontrada em ${formatDateTime(group.lastPublishedAt)}.`,
      `Fontes iniciais: ${group.sources.slice(0, 3).map((source) => source.sourceName).join(', ')}.`,
    ],
    pendingInfo: [
      'Confirmar informações oficiais com fontes primárias.',
      'Apurar impactos locais e desdobramentos para a audiência do RBN.',
      'Buscar contrapontos e posicionamento das partes envolvidas.',
    ],
    approachSuggestions: [
      'Abrir com o fato principal e contexto imediato.',
      'Comparar versões entre fontes para identificar divergências.',
      'Adicionar bloco de serviço explicando impacto para o leitor.',
    ],
    seoKeywords: [...new Set([primaryKeyword, ...group.matchedKeywords, getRadarCategoryLabel(group.category)])].slice(0, 8),
    discoveredAt: group.firstPublishedAt,
    updatedAt: now,
    status: 'nova-pauta',
  };
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
  const [groups, setGroups] = useState<RadarNewsGroup[]>([]);
  const [topics, setTopics] = useState<RadarTopic[]>([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState('');
  const [savedIds, setSavedIds] = useState<string[]>(() => loadJson<string[]>(SAVED_STORAGE_KEY, []));
  const [ignoredIds, setIgnoredIds] = useState<string[]>(() => loadJson<string[]>(IGNORED_STORAGE_KEY, []));
  const [sources, setSources] = useState<RadarSource[]>(() => loadJson<RadarSource[]>(SOURCES_STORAGE_KEY, RADAR_DEFAULT_SOURCES));
  const [keywordAlerts, setKeywordAlerts] = useState<string[]>(() =>
    loadJson<string[]>(KEYWORDS_STORAGE_KEY, ['lula', 'congresso', 'stf', 'são paulo', 'eleições'])
  );
  const [pautas, setPautas] = useState<RadarPauta[]>(() => loadJson<RadarPauta[]>(PAUTAS_STORAGE_KEY, []));
  const [pautaMessage, setPautaMessage] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [selectedGroupForAnalysis, setSelectedGroupForAnalysis] = useState<RadarNewsGroup | null>(null);
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

  useEffect(() => {
    saveJson(PAUTAS_STORAGE_KEY, pautas);
  }, [pautas]);

  const fetchRadar = useCallback(async () => {
    setIsFetching(true);
    setErrorMessage('');
    setPautaMessage('');
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

      setGroups(Array.isArray(payload.groups) ? payload.groups : []);
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

  const visibleGroups = useMemo(() => {
    const filtered = groups.filter((group) => !ignoredIds.includes(group.id));
    const sorted = [...filtered];
    sorted.sort((left, right) => {
      if (sortBy === 'recentes') {
        return new Date(right.lastPublishedAt).getTime() - new Date(left.lastPublishedAt).getTime();
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
  }, [groups, ignoredIds, sortBy]);

  const highRelevanceCount = visibleGroups.filter((group) => group.relevanceLevel === 'muito-relevante').length;

  const alerts = useMemo(() => {
    if (keywordAlerts.length === 0) {
      return [];
    }
    const normalized = keywordAlerts.map((keyword) => keyword.trim().toLowerCase()).filter(Boolean);
    return visibleGroups.filter((group) => {
      const text = `${group.headline} ${group.summary}`.toLowerCase();
      return normalized.some((keyword) => text.includes(keyword)) && group.relevanceLevel !== 'baixa';
    });
  }, [keywordAlerts, visibleGroups]);

  const toggleCategory = (category: RadarCategory) => {
    setSelectedCategories((current) => (current.includes(category) ? current.filter((item) => item !== category) : [...current, category]));
  };

  const addKeyword = () => {
    const keyword = newKeyword.trim().toLowerCase();
    if (!keyword) {
      return;
    }
    setKeywordAlerts((current) => (current.includes(keyword) ? current : [...current, keyword]));
    setNewKeyword('');
  };

  const createStructuredPauta = (group: RadarNewsGroup) => {
    setPautas((current) => {
      const existing = current.find((pauta) => pauta.sourceGroupId === group.id);
      if (existing) {
        setPautaMessage(`Pauta já existente: "${existing.provisionalTitle}".`);
        return current;
      }

      const pauta = buildPautaFromGroup(group);
      setPautaMessage(`Pauta "${pauta.provisionalTitle}" criada com sucesso.`);
      return [pauta, ...current];
    });
  };

  const updatePautaStatus = (pautaId: string, status: RadarPautaStatus) => {
    setPautas((current) =>
      current.map((pauta) =>
        pauta.id === pautaId
          ? {
              ...pauta,
              status,
              updatedAt: new Date().toISOString(),
            }
          : pauta
      )
    );
  };

  const removePauta = (pautaId: string) => {
    setPautas((current) => current.filter((pauta) => pauta.id !== pautaId));
  };

  const openGroupInEditor = (group: RadarNewsGroup) => {
    const draft = createRadarEditorDraft(group);
    saveJson(RADAR_EDITOR_DRAFT_STORAGE_KEY, draft);
    router.push('/admin/artigos/novo?source=radar');
  };

  const openPautaInEditor = (pauta: RadarPauta) => {
    const syntheticGroup: RadarNewsGroup = {
      id: pauta.sourceGroupId,
      headline: pauta.provisionalTitle,
      summary: pauta.summary,
      imageUrl: '',
      category: pauta.category,
      country: pauta.sources[0]?.country || 'Brasil',
      firstPublishedAt: pauta.discoveredAt,
      lastPublishedAt: pauta.updatedAt,
      fetchedAt: pauta.updatedAt,
      relevanceScore: 70,
      relevanceLevel: 'relevante',
      isNew: false,
      growthScore: 50,
      relatedSourcesCount: pauta.sources.length,
      matchedKeywords: pauta.seoKeywords,
      sources: pauta.sources.map((source, index) => ({
        sourceName: source.name,
        sourceUrl: source.url,
        country: source.country,
        reliability: source.reliability,
        articleUrl: pauta.links[index] ?? source.url,
        publishedAt: pauta.updatedAt,
        title: pauta.provisionalTitle,
      })),
      sampleItemIds: [],
    };
    openGroupInEditor(syntheticGroup);
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
                <p className="mt-2 text-sm text-gray-600">Acompanhe acontecimentos em tempo real para transformar em pauta com decisão editorial.</p>
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
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-600">Acontecimentos agrupados</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{visibleGroups.length}</p>
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
                      active ? 'border-[#991B1B] bg-[#fff1f1] text-[#991B1B]' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
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
                      refreshMinutes === option ? 'bg-[#111111] text-white' : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {option} min
                  </button>
                ))}
              </div>
            </div>

            {errorMessage && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{errorMessage}</p>}
            {pautaMessage && <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{pautaMessage}</p>}

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
                            setSources((current) => current.map((item) => (item.id === source.id ? { ...item, enabled: event.target.checked } : item)))
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
                      <span className="text-xs font-medium text-gray-600">
                        {topic.mentions} menções • crescimento {topic.growthScore}
                      </span>
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
                    <button type="button" onClick={() => setKeywordAlerts((current) => current.filter((item) => item !== keyword))} className="text-gray-500 transition hover:text-red-700">
                      <XCircle className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
              {alerts.length > 0 && (
                <div className="mt-4 space-y-2">
                  {alerts.slice(0, 4).map((alert) => (
                    <p key={alert.id} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                      🔴 Novo acontecimento relevante: {alert.headline}
                    </p>
                  ))}
                </div>
              )}
            </article>
          </section>

          <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-gray-900">Pautas estruturadas do Radar</h2>
              <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
                {pautas.length} pautas
              </span>
            </div>
            {pautas.length === 0 ? (
              <p className="mt-3 text-sm text-gray-600">Nenhuma pauta criada ainda. Use “Analisar pauta” e depois “Transformar em pauta estruturada”.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {pautas.map((pauta) => (
                  <article key={pauta.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{pauta.provisionalTitle}</p>
                        <p className="mt-1 text-xs text-gray-600">
                          {getRadarCategoryLabel(pauta.category)} • descoberta em {formatDateTime(pauta.discoveredAt)} • {pauta.sources.length} fontes
                        </p>
                        <p className="mt-2 text-sm text-gray-700">{pauta.summary}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {pauta.seoKeywords.slice(0, 6).map((keyword) => (
                            <span key={`${pauta.id}-${keyword}`} className="rounded-full border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold text-gray-700">
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <select
                          value={pauta.status}
                          onChange={(event) => updatePautaStatus(pauta.id, event.target.value as RadarPautaStatus)}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-900"
                        >
                          {RADAR_PAUTA_STATUS_OPTIONS.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => removePauta(pauta.id)}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                        >
                          Remover pauta
                        </button>
                        <button
                          type="button"
                          onClick={() => openPautaInEditor(pauta)}
                          className="rounded-lg bg-[#111111] px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-[#2a2a2a]"
                        >
                          Abrir no editor
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            {visibleGroups.length === 0 ? (
              <article className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-8 text-center text-sm text-gray-600 shadow-sm">
                Nenhum acontecimento encontrado com os filtros atuais.
              </article>
            ) : (
              visibleGroups.map((group) => {
                const relevance = getRelevanceBadge(group.relevanceLevel);
                const saved = savedIds.includes(group.id);
                return (
                  <article key={group.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="grid gap-0 md:grid-cols-[240px_minmax(0,1fr)]">
                      <div className="h-full min-h-[180px] bg-gray-100">
                        {group.imageUrl ? (
                          <img src={group.imageUrl} alt={group.headline} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center p-4 text-center text-xs text-gray-500">Imagem indisponível</div>
                        )}
                      </div>
                      <div className="p-4">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${relevance.className}`}>{relevance.label}</span>
                          {group.isNew && <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">novidade</span>}
                          <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-semibold text-gray-700">{group.relatedSourcesCount} fontes</span>
                          <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-semibold text-gray-700">crescimento {group.growthScore}</span>
                        </div>

                        <h3 className="text-lg font-bold text-gray-900">{group.headline}</h3>
                        <p className="mt-2 text-sm text-gray-700">{group.summary}</p>

                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-600">
                          <span>Categoria: {getRadarCategoryLabel(group.category)}</span>
                          <span>Local: {group.country}</span>
                          <span>Última cobertura: {formatRelative(group.lastPublishedAt)}</span>
                        </div>

                        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-600">Fontes relacionadas</p>
                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            {group.sources.slice(0, 6).map((source) => (
                              <a
                                key={`${group.id}-${source.sourceName}-${source.articleUrl}`}
                                href={source.articleUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-md border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-700 transition hover:bg-gray-100"
                              >
                                <span className="block font-semibold text-gray-900">{source.sourceName}</span>
                                <span className="block text-gray-600">{formatRelative(source.publishedAt)}</span>
                              </a>
                            ))}
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <a
                            href={group.sources[0]?.articleUrl ?? '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-800 transition hover:bg-gray-50"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Ver fonte
                          </a>
                          <button
                            type="button"
                            onClick={() => setSelectedGroupForAnalysis(group)}
                            className="inline-flex items-center gap-2 rounded-lg border border-[#991B1B]/20 bg-[#fff7f7] px-3 py-2 text-xs font-semibold text-[#991B1B] transition hover:bg-[#ffeaea]"
                          >
                            <Bot className="h-4 w-4" />
                            Analisar pauta
                          </button>
                          <button
                            type="button"
                            onClick={() => openGroupInEditor(group)}
                            className="inline-flex items-center gap-2 rounded-lg bg-[#111111] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#2a2a2a]"
                          >
                            Abrir no editor
                          </button>
                          <button
                            type="button"
                            onClick={() => setSavedIds((current) => (current.includes(group.id) ? current.filter((id) => id !== group.id) : [...current, group.id]))}
                            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                              saved ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                            {saved ? 'Salvo' : 'Salvar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setIgnoredIds((current) => (current.includes(group.id) ? current : [...current, group.id]))}
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

          {selectedGroupForAnalysis && (
            <section className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
              <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-5 shadow-xl">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#991B1B]">Análise de pauta</p>
                    <h2 className="mt-1 text-xl font-bold text-gray-900">{selectedGroupForAnalysis.headline}</h2>
                  </div>
                  <button type="button" onClick={() => setSelectedGroupForAnalysis(null)} className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 transition hover:bg-gray-50">
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4 text-sm text-gray-800">
                  <article className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="font-semibold text-gray-900">O que aconteceu?</p>
                    <p className="mt-2">{selectedGroupForAnalysis.summary}</p>
                  </article>
                  <article className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="font-semibold text-gray-900">Por que isso é relevante?</p>
                    <p className="mt-2">
                      O tema aparece em {selectedGroupForAnalysis.relatedSourcesCount} fontes, com score de relevância {selectedGroupForAnalysis.relevanceScore}/100 e crescimento {selectedGroupForAnalysis.growthScore}.
                    </p>
                  </article>
                  <article className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="font-semibold text-gray-900">O que já está confirmado?</p>
                    <ul className="mt-2 list-inside list-disc space-y-1">
                      <li>A cobertura existe em múltiplas fontes independentes.</li>
                      <li>Última publicação registrada em {formatDateTime(selectedGroupForAnalysis.lastPublishedAt)}.</li>
                      <li>Links originais disponíveis para checagem editorial.</li>
                    </ul>
                  </article>
                  <article className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="font-semibold text-amber-900">O que ainda precisa ser confirmado?</p>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-amber-900">
                      <li>Dados oficiais atualizados com fontes primárias.</li>
                      <li>Impacto local e consequências práticas para o leitor.</li>
                      <li>Posicionamento e contraponto dos envolvidos.</li>
                    </ul>
                  </article>
                  <article className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="font-semibold text-gray-900">Fontes encontradas</p>
                    <ul className="mt-2 list-inside list-disc space-y-1">
                      {selectedGroupForAnalysis.sources.slice(0, 8).map((source) => (
                        <li key={`${selectedGroupForAnalysis.id}-${source.sourceName}-${source.articleUrl}`}>
                          {source.sourceName} ({source.country}) • confiabilidade {source.reliability}/5
                        </li>
                      ))}
                    </ul>
                  </article>
                  <article className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="font-semibold text-gray-900">Sugestão inicial de título</p>
                    <p className="mt-2">{`"${selectedGroupForAnalysis.headline}"`}</p>
                    <p className="mt-2 text-xs text-gray-600">
                      Palavra-chave principal: {selectedGroupForAnalysis.matchedKeywords[0] ?? getRadarCategoryLabel(selectedGroupForAnalysis.category)}.
                    </p>
                  </article>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <a
                    href={selectedGroupForAnalysis.sources[0]?.articleUrl ?? '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Abrir fonte original
                  </a>
                  <button
                    type="button"
                    onClick={() => createStructuredPauta(selectedGroupForAnalysis)}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#111111] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#2a2a2a]"
                  >
                    Transformar em pauta estruturada
                  </button>
                  <button
                    type="button"
                    onClick={() => openGroupInEditor(selectedGroupForAnalysis)}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
                  >
                    Abrir no editor
                  </button>
                </div>
              </div>
            </section>
          )}

          <footer className="mt-8 rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs text-gray-600 shadow-sm">
            <p className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-[#991B1B]" />
              O Radar é apoio editorial. Nenhuma notícia é publicada automaticamente sem revisão da redação.
            </p>
            <p className="mt-2">Fontes ativas: {sources.filter((source) => source.enabled).length} • Alta relevância: {highRelevanceCount} acontecimentos</p>
          </footer>
        </div>
      </main>
    </div>
  );
}
