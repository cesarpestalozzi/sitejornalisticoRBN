'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Eye, Share2, MessageCircle, RotateCcw, Users, Download, type LucideIcon } from 'lucide-react';
import AdminSidebar from '@/app/components/AdminSidebar';
import { useAdvertisements } from '@/app/hooks/useAdvertisements';
import { useArticles } from '@/app/hooks/useArticles';
import { useComments } from '@/app/hooks/useComments';

const COLORS = ['#991B1B', '#FF6B6B', '#FFA07A', '#FFB6C1', '#DEB887'];

type AnalyticsStat = {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
};

type ViewsDataPoint = {
  dia: string;
  visualizações: number;
  compartilhamentos: number;
};

type SignupUser = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};

type AnalyticsRangeKey = 'today' | 'yesterday' | 'last3' | 'last7' | 'previousWeek' | 'last30' | 'last60' | 'last90' | 'all';

const analyticsRangeOptions: Array<{ value: AnalyticsRangeKey; label: string }> = [
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: 'last3', label: 'Últimos 3 dias' },
  { value: 'last7', label: 'Últimos 7 dias' },
  { value: 'previousWeek', label: 'Semana passada' },
  { value: 'last30', label: 'Últimos 30 dias' },
  { value: 'last60', label: 'Últimos 60 dias' },
  { value: 'last90', label: 'Últimos 90 dias' },
  { value: 'all', label: 'Total geral' },
];

function renderPieLabel({ name, percent }: { name?: string; percent?: number }) {
  return `${name ?? 'Categoria'} ${((percent || 0) * 100).toFixed(0)}%`;
}

function formatDay(date: Date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

export default function AnalyticsPage() {
  const { articles, updateArticle, isLoaded: isArticlesLoaded } = useArticles();
  const { ads, updateAdvertisement, isLoaded: isAdsLoaded } = useAdvertisements();
  const { allComments, isLoaded: isCommentsLoaded } = useComments();
  const [analyticsRange, setAnalyticsRange] = useState<AnalyticsRangeKey>('last7');
  const [signupUsers, setSignupUsers] = useState<SignupUser[]>([]);

  const getRangeDates = useCallback((range: AnalyticsRangeKey) => {
    const today = startOfDay(new Date());

    switch (range) {
      case 'today':
        return { start: startOfDay(today), end: endOfDay(today) };
      case 'yesterday': {
        const start = startOfDay(today);
        start.setDate(start.getDate() - 1);
        return { start, end: endOfDay(start) };
      }
      case 'last3': {
        const start = startOfDay(today);
        start.setDate(start.getDate() - 2);
        return { start, end: endOfDay(today) };
      }
      case 'last7': {
        const start = startOfDay(today);
        start.setDate(start.getDate() - 6);
        return { start, end: endOfDay(today) };
      }
      case 'previousWeek': {
        const end = startOfDay(today);
        end.setDate(end.getDate() - 1);
        const start = startOfDay(end);
        start.setDate(start.getDate() - 6);
        return { start, end: endOfDay(end) };
      }
      case 'last30': {
        const start = startOfDay(today);
        start.setDate(start.getDate() - 29);
        return { start, end: endOfDay(today) };
      }
      case 'last60': {
        const start = startOfDay(today);
        start.setDate(start.getDate() - 59);
        return { start, end: endOfDay(today) };
      }
      case 'last90': {
        const start = startOfDay(today);
        start.setDate(start.getDate() - 89);
        return { start, end: endOfDay(today) };
      }
      case 'all':
      default:
        return null;
    }
  }, []);

  const getPreviousRangeDates = useCallback((range: AnalyticsRangeKey) => {
    const currentRange = getRangeDates(range);
    if (!currentRange) {
      return null;
    }

    const currentStart = startOfDay(currentRange.start);
    const currentEnd = endOfDay(currentRange.end);
    const spanInDays = Math.max(1, Math.round((currentEnd.getTime() - currentStart.getTime()) / (24 * 60 * 60 * 1000)) + 1);
    const previousEnd = endOfDay(new Date(currentStart.getTime() - 24 * 60 * 60 * 1000));
    const previousStart = startOfDay(new Date(previousEnd));
    previousStart.setDate(previousStart.getDate() - (spanInDays - 1));

    return { start: previousStart, end: previousEnd };
  }, [getRangeDates]);

  const isWithinRange = (value: string | Date | undefined, range: { start: Date; end: Date } | null) => {
    const date = value instanceof Date ? value : value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) {
      return false;
    }
    if (!range) {
      return true;
    }
    return date >= range.start && date <= range.end;
  };

  const readLocalSignupUsers = () => {
    if (typeof window === 'undefined') {
      return [] as SignupUser[];
    }

    try {
      const raw = window.localStorage.getItem('pz_news_users');
      if (!raw) {
        return [] as SignupUser[];
      }

      const parsed = JSON.parse(raw) as Array<{ id?: string; email?: string; name?: string; createdAt?: string }>;
      if (!Array.isArray(parsed)) {
        return [] as SignupUser[];
      }

      return parsed
        .filter((user) => typeof user?.email === 'string' && typeof user?.createdAt === 'string')
        .map((user) => {
          const email = String(user.email);
          return {
            id: String(user.id ?? `${email}-${user.createdAt}`),
            email,
            name: String(user.name ?? email.split('@')[0] ?? 'Usuário RBN'),
            createdAt: String(user.createdAt),
          };
        })
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
    } catch {
      return [] as SignupUser[];
    }
  };

  useEffect(() => {
    let isActive = true;

    const loadSignups = async () => {
      try {
        const response = await fetch('/api/admin/audience', { method: 'GET', headers: { Accept: 'application/json' } });
        const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; users?: SignupUser[]; error?: string; warning?: string };

        if (!isActive) {
          return;
        }

        const remoteUsers = Array.isArray(payload.users) ? payload.users : [];
        const localUsers = readLocalSignupUsers();
        const mergedUsers = remoteUsers.length > 0 ? remoteUsers : localUsers;
        setSignupUsers(mergedUsers);
      } catch (error) {
        if (!isActive) {
          return;
        }
        console.error('Erro ao carregar cadastros:', error);
        setSignupUsers(readLocalSignupUsers());
      }
    };

    void loadSignups();

    return () => {
      isActive = false;
    };
  }, []);

  const publishedArticles = useMemo(() => articles.filter((article) => article.status === 'publicado'), [articles]);
  const activeRangeDates = useMemo(() => getRangeDates(analyticsRange), [analyticsRange, getRangeDates]);

  const filteredPublishedArticles = useMemo(
    () =>
      publishedArticles.filter((article) =>
        isWithinRange(article.publishedAt ?? article.createdAt, activeRangeDates)
      ),
    [publishedArticles, activeRangeDates]
  );

  const filteredComments = useMemo(
    () => allComments.filter((comment) => isWithinRange(comment.createdAt, activeRangeDates)),
    [allComments, activeRangeDates]
  );

  const totalViews = useMemo(
    () => filteredPublishedArticles.reduce((sum, article) => sum + (article.views ?? 0), 0),
    [filteredPublishedArticles]
  );
  const totalShares = useMemo(
    () => filteredPublishedArticles.reduce((sum, article) => sum + (article.shares ?? 0), 0),
    [filteredPublishedArticles]
  );
  const totalComments = filteredComments.length;

  const topArticles = useMemo(
    () =>
      [...filteredPublishedArticles]
        .sort((left, right) => (right.views ?? 0) - (left.views ?? 0))
        .slice(0, 5)
        .map((article) => ({ title: article.title, views: article.views ?? 0 })),
    [filteredPublishedArticles]
  );

  const categoryData = useMemo(() => {
    const map = new Map<string, number>();

    filteredPublishedArticles.forEach((article) => {
      const key = article.category || 'Outros';
      map.set(key, (map.get(key) ?? 0) + (article.views ?? 0));
    });

    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 5);
  }, [filteredPublishedArticles]);

  const viewsData = useMemo(() => {
    const sourceDates = filteredPublishedArticles
      .map((article) => new Date(article.publishedAt ?? article.createdAt))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((left, right) => left.getTime() - right.getTime());
    const today = startOfDay(new Date());
    const seriesStart = activeRangeDates ? startOfDay(activeRangeDates.start) : (sourceDates[0] ? startOfDay(sourceDates[0]) : today);
    const seriesEnd = activeRangeDates ? endOfDay(activeRangeDates.end) : endOfDay(today);
    const buckets = new Map<string, ViewsDataPoint>();

    for (let cursor = new Date(seriesStart); cursor <= seriesEnd; cursor.setDate(cursor.getDate() + 1)) {
      const date = new Date(cursor);
      const key = formatDay(date);
      buckets.set(key, { dia: key, visualizações: 0, compartilhamentos: 0 });
    }

    filteredPublishedArticles.forEach((article) => {
      const baseDate = article.publishedAt ? new Date(article.publishedAt) : new Date(article.createdAt);
      const key = formatDay(baseDate);
      const bucket = buckets.get(key);
      if (!bucket) {
        return;
      }

      bucket.visualizações += article.views ?? 0;
      bucket.compartilhamentos += article.shares ?? 0;
    });

    return [...buckets.values()];
  }, [filteredPublishedArticles, activeRangeDates]);

  const growth = useMemo(() => {
    if (analyticsRange === 'all') {
      return '0%';
    }

    const previousRangeDates = getPreviousRangeDates(analyticsRange);
    if (!previousRangeDates) {
      return '0%';
    }

    const currentTotal = filteredPublishedArticles.reduce((sum, article) => sum + (article.views ?? 0), 0);
    const previousTotal = publishedArticles
      .filter((article) => isWithinRange(article.publishedAt ?? article.createdAt, previousRangeDates))
      .reduce((sum, article) => sum + (article.views ?? 0), 0);

    if (previousTotal <= 0) {
      return currentTotal > 0 ? '+100%' : '0%';
    }

    const percent = ((currentTotal - previousTotal) / previousTotal) * 100;
    const rounded = Math.round(percent);
    return `${rounded > 0 ? '+' : ''}${rounded}%`;
  }, [analyticsRange, filteredPublishedArticles, getPreviousRangeDates, publishedArticles]);

  const signupSeries = useMemo(() => {
    const rangeDates = activeRangeDates;
    const signupDates = signupUsers
      .map((user) => new Date(user.createdAt))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((left, right) => left.getTime() - right.getTime());
    const today = startOfDay(new Date());
    const seriesStart = rangeDates ? startOfDay(rangeDates.start) : (signupDates[0] ? startOfDay(signupDates[0]) : today);
    const seriesEnd = rangeDates ? endOfDay(rangeDates.end) : endOfDay(today);
    const buckets = new Map<string, { dia: string; cadastros: number }>();

    for (let cursor = new Date(seriesStart); cursor <= seriesEnd; cursor.setDate(cursor.getDate() + 1)) {
      const key = formatDay(cursor);
      buckets.set(key, { dia: key, cadastros: 0 });
    }

    signupUsers.forEach((user) => {
      const createdAt = user.createdAt ? new Date(user.createdAt) : null;
      if (!createdAt || Number.isNaN(createdAt.getTime())) {
        return;
      }

      if (!isWithinRange(createdAt, rangeDates)) {
        return;
      }

      const key = formatDay(createdAt);
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.cadastros += 1;
      }
    });

    return [...buckets.values()];
  }, [signupUsers, activeRangeDates]);

  const filteredSignupUsers = useMemo(() => {
    return [...signupUsers]
      .filter((user) => isWithinRange(user.createdAt, activeRangeDates))
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  }, [signupUsers, activeRangeDates]);

  const signupTotal = filteredSignupUsers.length;

  const analyticsFilterLabel = analyticsRangeOptions.find((item) => item.value === analyticsRange)?.label ?? 'Últimos 7 dias';

  const stats: AnalyticsStat[] = [
    { label: `Total de Visualizações (${analyticsFilterLabel})`, value: totalViews.toLocaleString('pt-BR'), icon: Eye, color: 'text-[#2F7EA1]' },
    { label: `Total de Compartilhamentos (${analyticsFilterLabel})`, value: totalShares.toLocaleString('pt-BR'), icon: Share2, color: 'text-green-600' },
    { label: `Total de Comentários (${analyticsFilterLabel})`, value: totalComments.toLocaleString('pt-BR'), icon: MessageCircle, color: 'text-purple-600' },
    { label: `Cadastros (${analyticsFilterLabel})`, value: signupTotal.toLocaleString('pt-BR'), icon: Users, color: 'text-[#991B1B]' },
    { label: `Taxa de Crescimento (${analyticsFilterLabel})`, value: growth, icon: TrendingUp, color: 'text-[#991B1B]' },
  ];

  const resetAnalytics = () => {
    if (!window.confirm('Deseja zerar todas as informações do Analytics?')) {
      return;
    }

    publishedArticles.forEach((article) => {
      updateArticle(article.id, { views: 0, shares: 0 });
    });
    ads.forEach((ad) => {
      updateAdvertisement(ad.id, { clicks: 0, impressions: 0, ctr: 0 });
    });
  };

  const handleExportAnalyticsCsv = () => {
    const hasAnalyticsData = filteredPublishedArticles.length > 0 || filteredSignupUsers.length > 0 || filteredComments.length > 0;
    if (!hasAnalyticsData) {
      return;
    }

    const summaryRows = [
      ['Métrica', 'Valor'],
      ['Total de visualizações', totalViews],
      ['Total de compartilhamentos', totalShares],
      ['Total de comentários', totalComments],
      ['Artigos publicados no período', filteredPublishedArticles.length],
      ['Cadastros no período', signupTotal],
      ['Cadastros totais', signupUsers.length],
      ['Taxa de crescimento', growth],
      ['Filtro aplicado', analyticsFilterLabel],
    ];

    const articleRows = [
      [],
      ['Matérias mais acessadas'],
      ['Título', 'Categoria', 'Autor', 'Status', 'Visualizações', 'Compartilhamentos', 'Data de publicação'],
      ...[...filteredPublishedArticles]
        .sort((left, right) => (right.views ?? 0) - (left.views ?? 0))
        .map((article) => [
          article.title,
          article.category || 'Sem categoria',
          article.author || 'Sem autor',
          article.status,
          article.views ?? 0,
          article.shares ?? 0,
          new Date(article.publishedAt ?? article.createdAt).toLocaleString('pt-BR'),
        ]),
    ];

    const categoryRows = [
      [],
      ['Desempenho por categoria'],
      ['Categoria', 'Visualizações'],
      ...categoryData.map((item) => [item.name, item.value]),
    ];

    const signupRows = [
      [],
      ['Cadastros'],
      ['Nome', 'Email', 'Data do cadastro'],
      ...filteredSignupUsers.map((user) => [user.name, user.email, new Date(user.createdAt).toLocaleString('pt-BR')]),
    ];

    const commentRows = [
      [],
      ['Comentários'],
      ['Autor', 'Matéria', 'Comentário', 'Data'],
      ...filteredComments.map((comment) => {
        const article = articles.find((item) => item.id === comment.articleId);
        return [
          comment.author,
          article?.title ?? 'Matéria não encontrada',
          comment.text,
          new Date(comment.createdAt).toLocaleString('pt-BR'),
        ];
      }),
    ];

    const csvRows = [...summaryRows, ...articleRows, ...categoryRows, ...signupRows, ...commentRows].map((row) =>
      row
        .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
        .join(',')
    );

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `analytics-rbn-${analyticsRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isArticlesLoaded || !isAdsLoaded || !isCommentsLoaded) {
    return <div className="p-6 text-sm text-gray-600">Carregando métricas...</div>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 md:h-screen md:flex-row">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
          <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
              <p className="text-gray-600 text-sm mt-1">Acompanhe o desempenho real de matérias, cadastros e publicidades</p>
            </div>
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="text-sm font-medium text-gray-700" htmlFor="analytics-range">
                  Filtrar
                </label>
                <select
                  id="analytics-range"
                  value={analyticsRange}
                  onChange={(event) => setAnalyticsRange(event.target.value as AnalyticsRangeKey)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-[#991B1B] focus:ring-2 focus:ring-[#991B1B]/10"
                >
                  {analyticsRangeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2 py-2">
                {analyticsRangeOptions.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => setAnalyticsRange(option.value)}
                    className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${analyticsRange === option.value ? 'bg-[#991B1B] text-white shadow-sm' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <button type="button" onClick={resetAnalytics} className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100">
                <RotateCcw className="h-4 w-4" />
                Zerar Analytics
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                    </div>
                    <Icon className={`w-8 h-8 ${stat.color} opacity-20`} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Visualizações vs Compartilhamentos ({analyticsFilterLabel})</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={viewsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dia" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="visualizações" stroke="#991B1B" strokeWidth={2} />
                  <Line type="monotone" dataKey="compartilhamentos" stroke="#2563EB" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Visualizações por Categoria ({analyticsFilterLabel})</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" labelLine={false} label={renderPieLabel} outerRadius={80} fill="#8884d8" dataKey="value">
                    {categoryData.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mb-8 bg-white rounded-lg shadow p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-gray-900">Cadastros por dia ({analyticsFilterLabel})</h2>
              <span className="rounded-full bg-[#991B1B]/10 px-3 py-1 text-xs font-semibold text-[#991B1B]">
                {signupTotal.toLocaleString('pt-BR')} no período
              </span>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={signupSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dia" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="cadastros" fill="#991B1B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mb-8 bg-white rounded-lg shadow p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Cadastros recentes</h2>
                <p className="text-sm text-gray-500">{filteredSignupUsers.length} nomes no período</p>
              </div>
              {(filteredSignupUsers.length > 0 || filteredPublishedArticles.length > 0 || filteredComments.length > 0) && (
                <button type="button" onClick={handleExportAnalyticsCsv} className="inline-flex items-center gap-2 rounded-lg bg-[#111111] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2a2a2a]">
                  <Download className="h-4 w-4" />
                  Exportar dados completos
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredSignupUsers.length > 0 ? (
                filteredSignupUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                    <span className="truncate font-medium text-gray-900">{user.name}</span>
                    <span className="ml-3 text-xs text-gray-500">{new Date(user.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                ))
              ) : (
                <p className="col-span-full rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                  Nenhum cadastro neste período.
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Top 5 Artigos ({analyticsFilterLabel})</h2>
              <div className="space-y-3">
                {topArticles.map((article, index) => (
                  <div key={`${article.title}-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {index + 1}. {article.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-[#2F7EA1]" />
                      <span className="text-sm font-bold text-gray-900">{article.views.toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Desempenho por Categoria</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#991B1B" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
