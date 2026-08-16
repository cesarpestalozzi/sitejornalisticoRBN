'use client';

import { useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Eye, Share2, MessageCircle, RotateCcw, type LucideIcon } from 'lucide-react';
import AdminSidebar from '@/app/components/AdminSidebar';
import { useAdvertisements } from '@/app/hooks/useAdvertisements';
import { useArticles } from '@/app/hooks/useArticles';

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

function renderPieLabel({ name, percent }: { name?: string; percent?: number }) {
  return `${name ?? 'Categoria'} ${((percent || 0) * 100).toFixed(0)}%`;
}

function formatDay(date: Date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

export default function AnalyticsPage() {
  const { articles, updateArticle, isLoaded: isArticlesLoaded } = useArticles();
  const { ads, updateAdvertisement, isLoaded: isAdsLoaded } = useAdvertisements();

  const publishedArticles = useMemo(() => articles.filter((article) => article.status === 'publicado'), [articles]);

  const totalViews = useMemo(() => publishedArticles.reduce((sum, article) => sum + (article.views ?? 0), 0), [publishedArticles]);
  const totalShares = useMemo(() => publishedArticles.reduce((sum, article) => sum + (article.shares ?? 0), 0), [publishedArticles]);

  const topArticles = useMemo(
    () =>
      [...publishedArticles]
        .sort((left, right) => (right.views ?? 0) - (left.views ?? 0))
        .slice(0, 5)
        .map((article) => ({ title: article.title, views: article.views ?? 0 })),
    [publishedArticles]
  );

  const categoryData = useMemo(() => {
    const map = new Map<string, number>();

    publishedArticles.forEach((article) => {
      const key = article.category || 'Outros';
      map.set(key, (map.get(key) ?? 0) + (article.views ?? 0));
    });

    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 5);
  }, [publishedArticles]);

  const viewsData = useMemo(() => {
    const today = new Date();
    const buckets = new Map<string, ViewsDataPoint>();

    for (let index = 6; index >= 0; index -= 1) {
      const date = new Date(today);
      date.setDate(today.getDate() - index);
      const key = formatDay(date);
      buckets.set(key, { dia: key, visualizações: 0, compartilhamentos: 0 });
    }

    publishedArticles.forEach((article) => {
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
  }, [publishedArticles]);

  const growth = useMemo(() => {
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const currentStart = now - sevenDays;
    const previousStart = now - sevenDays * 2;

    let currentTotal = 0;
    let previousTotal = 0;

    publishedArticles.forEach((article) => {
      const date = article.publishedAt ? new Date(article.publishedAt).getTime() : new Date(article.createdAt).getTime();
      const views = article.views ?? 0;
      if (date >= currentStart) {
        currentTotal += views;
        return;
      }
      if (date >= previousStart && date < currentStart) {
        previousTotal += views;
      }
    });

    if (previousTotal <= 0) {
      return currentTotal > 0 ? '+100%' : '0%';
    }

    const percent = ((currentTotal - previousTotal) / previousTotal) * 100;
    const rounded = Math.round(percent);
    return `${rounded > 0 ? '+' : ''}${rounded}%`;
  }, [publishedArticles]);

  const stats: AnalyticsStat[] = [
    { label: 'Total de Visualizações', value: totalViews.toLocaleString('pt-BR'), icon: Eye, color: 'text-[#2F7EA1]' },
    { label: 'Total de Compartilhamentos', value: totalShares.toLocaleString('pt-BR'), icon: Share2, color: 'text-green-600' },
    { label: 'Total de Comentários', value: '0', icon: MessageCircle, color: 'text-purple-600' },
    { label: 'Taxa de Crescimento', value: growth, icon: TrendingUp, color: 'text-[#991B1B]' },
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

  if (!isArticlesLoaded || !isAdsLoaded) {
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
              <p className="text-gray-600 text-sm mt-1">Acompanhe o desempenho real de matérias e publicidades</p>
            </div>
            <button type="button" onClick={resetAnalytics} className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100">
              <RotateCcw className="h-4 w-4" />
              Zerar Analytics
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
              <h2 className="text-lg font-bold text-gray-900 mb-4">Visualizações vs Compartilhamentos</h2>
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
              <h2 className="text-lg font-bold text-gray-900 mb-4">Visualizações por Categoria</h2>
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Top 5 Artigos</h2>
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
