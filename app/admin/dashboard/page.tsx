'use client';

import Link from 'next/link';
import { Activity, BarChart3, Eye, FileText, Megaphone, Share2, TrendingUp, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import AdminSidebar from '@/app/components/AdminSidebar';
import { useAdvertisements } from '@/app/hooks/useAdvertisements';
import { useArticles } from '@/app/hooks/useArticles';
import { useUsers } from '@/app/hooks/useUsers';
import { canManageSettings, useCurrentAdminUser } from '@/app/lib/adminPermissions';

export default function AdminDashboard() {
  const [period, setPeriod] = useState('month');
  const currentUser = useCurrentAdminUser();
  const { articles, isLoaded: articlesLoaded } = useArticles();
  const { users, isLoaded: usersLoaded } = useUsers();
  const { ads, isLoaded: adsLoaded } = useAdvertisements();

  const recentArticles = useMemo(
    () =>
      [...articles]
        .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
        .slice(0, 5),
    [articles]
  );

  const categoryStats = useMemo(() => {
    const map = new Map<string, { name: string; articles: number; views: number }>();

    articles.forEach((article) => {
      const key = article.category;
      const current = map.get(key) ?? { name: key.charAt(0).toUpperCase() + key.slice(1), articles: 0, views: 0 };
      current.articles += 1;
      current.views += article.views;
      map.set(key, current);
    });

    return [...map.values()].sort((left, right) => right.views - left.views).slice(0, 5);
  }, [articles]);

  const dashboardCards = [
    { label: 'Artigos publicados', value: articles.filter((article) => article.status === 'publicado').length, trend: '+12%', icon: FileText, accent: 'from-[#ADD8E6] to-[#87CEEB]', text: 'text-[#2F7EA1]' },
    { label: 'Visualizações', value: articles.reduce((sum, article) => sum + article.views, 0).toLocaleString(), trend: '+18%', icon: Eye, accent: 'from-purple-600 to-purple-700', text: 'text-purple-600' },
    { label: 'Usuários ativos', value: users.filter((user) => user.status === 'ativo').length, trend: '+8%', icon: Users, accent: 'from-green-600 to-green-700', text: 'text-green-600' },
    { label: 'Campanhas ativas', value: ads.filter((ad) => ad.active).length, trend: '+6%', icon: Megaphone, accent: 'from-[#991B1B] to-[#7F1D1D]', text: 'text-[#991B1B]' },
    { label: 'Cliques em anúncios', value: ads.reduce((sum, ad) => sum + ad.clicks, 0).toLocaleString(), trend: '+15%', icon: Share2, accent: 'from-[#87CEEB] to-[#60BFE5]', text: 'text-[#60BFE5]' },
    { label: 'Impressões', value: ads.reduce((sum, ad) => sum + ad.impressions, 0).toLocaleString(), trend: '+9%', icon: BarChart3, accent: 'from-pink-600 to-pink-700', text: 'text-pink-600' },
  ];

  const activityLog = [
    ...recentArticles.slice(0, 3).map((article) => ({ id: `article-${article.id}`, action: `Artigo atualizado: ${article.title}`, user: article.author, time: new Date(article.updatedAt).toLocaleDateString('pt-BR') })),
    ...users.slice(0, 2).map((user) => ({ id: `user-${user.id}`, action: `Perfil salvo: ${user.name}`, user: user.email, time: new Date(user.joinDate).toLocaleDateString('pt-BR') })),
  ].slice(0, 5);

  if (!articlesLoaded || !usersLoaded || !adsLoaded) {
    return <div className="p-6 text-sm text-gray-600">Carregando dashboard...</div>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 md:flex-row">
      <AdminSidebar />

      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Visão geral de artigos, usuários e publicidades da RBN.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {['day', 'week', 'month', 'year'].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPeriod(item)}
                  className={`rounded-lg px-4 py-2 font-semibold transition ${period === item ? 'bg-[#991B1B] text-white' : 'border border-gray-200 bg-white text-gray-900 hover:bg-gray-50'}`}
                >
                  {item === 'day' ? 'Hoje' : item === 'week' ? 'Esta semana' : item === 'month' ? 'Este mês' : 'Este ano'}
                </button>
              ))}
            </div>
          </div>

          <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#991B1B]">Ações rápidas</p>
                <h2 className="mt-1 text-xl font-bold text-gray-900">Navegação do painel</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/admin/artigos" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-50">Artigos</Link>
                <Link href="/admin/manchetes" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-50">Manchetes</Link>
                {canManageSettings(currentUser) && (
                  <Link href="/admin/configuracoes#configuracoes" className="rounded-lg bg-[#111111] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2a2a2a]">Ir para configurações</Link>
                )}
              </div>
            </div>
          </section>

          <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {dashboardCards.map((card) => {
              const Icon = card.icon;
              return (
                <article key={card.label} className="h-full overflow-hidden rounded-2xl bg-white shadow-sm">
                  <div className={`h-1 bg-gradient-to-r ${card.accent}`} />
                  <div className="flex h-full flex-col justify-between p-4 sm:p-6">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div className={`${card.text} opacity-25`}>
                        <Icon className="h-8 w-8" />
                      </div>
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-green-600">
                        <TrendingUp className="h-4 w-4" />
                        {card.trend}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">{card.label}</p>
                      <p className="mt-2 text-3xl font-bold text-gray-900">{card.value}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>

          <div className="mb-8 grid gap-6 lg:grid-cols-3">
            <section className="rounded-2xl bg-white shadow-sm lg:col-span-2">
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4 sm:px-6">
                <h2 className="text-lg font-bold text-gray-900">Artigos recentes</h2>
                <Link href="/admin/artigos" className="text-sm font-semibold text-[#991B1B] transition hover:text-[#7F1D1D]">Ver todos</Link>
              </div>
              <div className="divide-y divide-gray-200">
                {recentArticles.map((article) => (
                  <div key={article.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-6">
                    <div>
                      <p className="font-semibold text-gray-900">{article.title}</p>
                      <p className="mt-1 text-sm text-gray-600">Por {article.author} em <span className="font-medium capitalize text-[#991B1B]">{article.category}</span></p>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <p className="font-bold text-gray-900">{article.views.toLocaleString()}</p>
                      <p>visualizações</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl bg-white shadow-sm">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-bold text-gray-900">Categorias em destaque</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {categoryStats.map((category) => (
                  <div key={category.name} className="px-4 py-4 sm:px-6">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="font-semibold text-gray-900">{category.name}</p>
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">{category.articles}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                      <div className="h-full rounded-full bg-[#991B1B]" style={{ width: `${Math.min(100, category.views / 50)}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-gray-500">{category.views.toLocaleString()} visualizações</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="rounded-2xl bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-4 sm:px-6">
              <Activity className="h-5 w-5 text-[#991B1B]" />
              <h2 className="text-lg font-bold text-gray-900">Atividades recentes</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {activityLog.map((item) => (
                <div key={item.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
                  <div className="rounded-lg bg-[#991B1B]/10 p-3 text-[#991B1B]">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{item.action}</p>
                    <p className="text-sm text-gray-600">{item.user}</p>
                  </div>
                  <p className="text-sm text-gray-500">{item.time}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
