'use client';

import { useEffect, useMemo, Suspense, lazy, useRef } from 'react';
import Hero from './Hero';
import NewsGrid from './NewsGrid';
import { defaultSettings } from '@/app/lib/settings';
import { getCategoryDisplayName, normalizeCategorySlug } from '@/app/lib/categoryLabels';
import type { Article, NewsCard } from '@/app/types';
import { useSettingsContext } from '@/app/contexts/SettingsContext';
import { useState } from 'react';

// Lazy load sidebar para não bloquear o render principal
const Sidebar = lazy(() => import('./Sidebar'));

interface HomeArticle {
  id: string;
  slug?: string;
  title: string;
  subtitle: string;
  category: string;
  author: string;
  excerpt: string;
  image: string;
  featured: boolean;
  status?: string;
  updatedAt: string;
  views: number;
}

interface HomeColumnist {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  columnistSlug: string;
}

function stripHtml(content: string) {
  return content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function toDisplayArticle(article: HomeArticle): Article {
  const readingTime = Math.max(1, Math.ceil((article.excerpt ? article.excerpt.split(' ').length : 0) / 200));

  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    subtitle: article.subtitle,
    excerpt: article.excerpt,
    content: '',
    category: getCategoryDisplayName(article.category),
    author: article.author,
    authorImage: undefined,
    image: article.image,
    date: new Date(article.updatedAt),
    readingTime,
    tags: [article.category],
    featured: article.featured,
    views: article.views,
    comments: 0,
    shares: 0,
  };
}

function toNewsCard(article: HomeArticle): NewsCard {
  const displayArticle = toDisplayArticle(article);

  return {
    id: displayArticle.id,
    slug: displayArticle.slug,
    title: displayArticle.title,
    excerpt: displayArticle.excerpt,
    image: displayArticle.image,
    category: displayArticle.category,
    date: displayArticle.date,
    author: displayArticle.author,
    readingTime: displayArticle.readingTime,
  };
}

export default function HomeClient({ initialArticles, initialColumnists }: { initialArticles: HomeArticle[]; initialColumnists?: HomeColumnist[] }) {
  const [articles, setArticles] = useState<HomeArticle[]>(initialArticles);
  const latestArticlesRef = useRef<HomeArticle[]>(initialArticles);
  const [isLoaded, setIsLoaded] = useState(true);
  const [columnists, setColumnists] = useState<HomeColumnist[]>(initialColumnists ?? []);
  const lastHomepageSyncRef = useRef(Date.now());
  const { settings: contextSettings } = useSettingsContext();
  const settings = contextSettings ?? defaultSettings;
  const showAdsOnHomepage = settings.content.showAdsOnHomepage;
  const showWeatherOnHomepage = settings.content.showWeatherOnHomepage;
  // Desabilita podcasts na homepage inicial para melhorar performance
  const showPodcastsOnHomepage = false;
  const showSidebar = showAdsOnHomepage || showWeatherOnHomepage;
  const contentGridClass = showSidebar ? 'lg:grid-cols-3' : 'lg:grid-cols-1';
  const contentColumnClass = showSidebar ? 'lg:col-span-2' : 'lg:col-span-1';

  // Se já temos dados iniciais, não precisa de loading skeleton
  const publishedArticles = useMemo(
    () =>
      [...articles]
        .filter((article) => String(article.status || 'publicado').toLowerCase() === 'publicado')
        .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()),
    [articles]
  );

  useEffect(() => {
    latestArticlesRef.current = articles;
  }, [articles]);

  const heroArticle = useMemo(() => {
    const featuredStored = publishedArticles.find((article) => article.featured);
    const selected = featuredStored ?? publishedArticles[0];
    return selected ? toDisplayArticle(selected) : null;
  }, [publishedArticles]);

  const heroSecondaryArticles = useMemo(() => {
    if (!heroArticle) {
      return [];
    }

    return publishedArticles
      .filter((article) => article.id !== heroArticle.id)
      .slice(0, 4)
      .map(toNewsCard);
  }, [heroArticle, publishedArticles]);

  const sectionArticles = useMemo(() => {
    const categoryMap = new Map<string, string>();

    publishedArticles.forEach((article) => {
      const key = normalizeCategorySlug(article.category);
      if (!categoryMap.has(key)) {
        categoryMap.set(key, getCategoryDisplayName(article.category));
      }
    });

    return Array.from(categoryMap.entries())
      .map(([key, title]) => {
        const localArticles = publishedArticles
          .filter((article) => normalizeCategorySlug(article.category) === key)
          .slice(0, 6)
          .map(toNewsCard);

        return {
          key,
          title,
          articles: localArticles,
        };
      })
      .filter((section) => section.articles.length > 0);
  }, [publishedArticles]);

  const homePodcasts = useMemo(
    () => [],
    []
  );

  useEffect(() => {
    let isActive = true;
    const inFlightRef = { current: false };

    const isWindowActive = () => {
      if (typeof document === 'undefined') {
        return false;
      }
      return document.visibilityState === 'visible' && document.hasFocus();
    };

    const syncHomepageArticles = async () => {
      if (!isWindowActive() || inFlightRef.current) {
        return;
      }

      inFlightRef.current = true;

      try {
        const response = await fetch('/api/homepage/articles', {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });

        if (!response.ok) {
          return;
        }

        const nextArticles = (await response.json()) as HomeArticle[];
        if (!isActive || !Array.isArray(nextArticles)) {
          return;
        }

        const sameArticles = nextArticles.length === latestArticlesRef.current.length
          && nextArticles.every((article, index) => article.id === latestArticlesRef.current[index]?.id && article.updatedAt === latestArticlesRef.current[index]?.updatedAt);

        if (!sameArticles) {
          setArticles(nextArticles);
        }
        lastHomepageSyncRef.current = Date.now();
      } catch {
        // mantém o último estado válido para evitar flicker
      } finally {
        if (isActive) {
          inFlightRef.current = false;
        }
      }
    };

    const intervalId = window.setInterval(() => {
      if (isWindowActive()) {
        void syncHomepageArticles();
      }
    }, 5 * 60 * 1000);
    const onFocus = () => {
      if (isWindowActive() && Date.now() - lastHomepageSyncRef.current >= 60_000) {
        void syncHomepageArticles();
      }
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      isActive = false;
      inFlightRef.current = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, []);

  return (
    <>
      {isLoaded ? <Hero article={heroArticle} secondaryArticles={heroSecondaryArticles} /> : (
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-24 rounded bg-gray-200" />
            <div className="h-10 w-3/4 rounded bg-gray-200" />
            <div className="grid gap-4 md:grid-cols-3">
              <div className="h-64 rounded-xl bg-gray-200 md:col-span-2" />
              <div className="space-y-4">
                <div className="h-20 rounded-xl bg-gray-200" />
                <div className="h-20 rounded-xl bg-gray-200" />
                <div className="h-20 rounded-xl bg-gray-200" />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className={`grid grid-cols-1 gap-8 ${contentGridClass}`}>
          <div className={`order-2 space-y-8 lg:order-1 ${contentColumnClass}`}>
            {!isLoaded ? (
              <div className="grid gap-4 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="animate-pulse rounded-xl border border-gray-200 bg-white p-3">
                    <div className="h-40 rounded-lg bg-gray-200" />
                    <div className="mt-3 h-4 w-2/3 rounded bg-gray-200" />
                    <div className="mt-2 h-4 w-full rounded bg-gray-200" />
                    <div className="mt-2 h-4 w-5/6 rounded bg-gray-200" />
                  </div>
                ))}
              </div>
            ) : publishedArticles.length === 0 ? (
              <section className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-600">
                Ainda não há notícias publicadas no navegador. Publique artigos no painel administrativo para vê-los aqui.
              </section>
            ) : (
              sectionArticles.map((section) => (
                <NewsGrid key={section.key} title={section.title} category={section.key} articles={section.articles} />
              ))
            )}
          </div>

          {showSidebar && (
            <div className="order-1 hidden lg:order-2 lg:col-span-1 lg:block">
              <Suspense fallback={<div className="space-y-4"><div className="h-48 bg-gray-200 rounded-lg animate-pulse" /></div>}>
                <Sidebar />
              </Suspense>
            </div>
          )}
        </div>
      </div>

      {columnists.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-10">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 sm:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#991B1B]">Opinião e análise</p>
                <h2 className="mt-1 text-2xl font-bold text-gray-900">Colunistas</h2>
              </div>
              <span className="text-sm text-gray-500">Conheça nossos autores</span>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {columnists.map((columnist) => (
                <a key={columnist.id} href={`/colunistas/${columnist.columnistSlug || columnist.id}`} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <img loading="lazy" src={columnist.avatar || '/logo-oficial.png'} alt={columnist.name} className="h-16 w-16 shrink-0 rounded-full object-cover" />
                  <span className="min-w-0">
                    <strong className="block truncate text-base text-[#1264B0]">{columnist.name}</strong>
                    <span className="mt-1 line-clamp-2 text-sm text-gray-600">{columnist.bio || 'Veja o perfil e as matérias deste colunista.'}</span>
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {showPodcastsOnHomepage && null}
    </>
  );
}
