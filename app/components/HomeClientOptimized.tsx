'use client';

import { useMemo } from 'react';
import Hero from './Hero';
import NewsGrid from './NewsGrid';
import Podcasts from './Podcasts';
import Sidebar from './Sidebar';
import { usePodcasts } from '@/app/hooks/usePodcasts';
import { defaultSettings } from '@/app/lib/settings';
import { getCategoryDisplayName, normalizeCategorySlug } from '@/app/lib/categoryLabels';
import type { Article, NewsCard } from '@/app/types';
import { useSettingsContext } from '@/app/contexts/SettingsContext';
import { useEffect, useState } from 'react';

interface HomeArticle {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  author: string;
  excerpt: string;
  image: string;
  featured: boolean;
  updatedAt: string;
  views: number;
}

function stripHtml(content: string) {
  return content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function toDisplayArticle(article: HomeArticle): Article {
  const readingTime = Math.max(1, Math.ceil((article.excerpt ? article.excerpt.split(' ').length : 0) / 200));

  return {
    id: article.id,
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
    title: displayArticle.title,
    excerpt: displayArticle.excerpt,
    image: displayArticle.image,
    category: displayArticle.category,
    date: displayArticle.date,
    author: displayArticle.author,
    readingTime: displayArticle.readingTime,
  };
}

export default function HomeClient({ initialArticles }: { initialArticles: HomeArticle[] }) {
  const [articles, setArticles] = useState<HomeArticle[]>(initialArticles);
  const [isLoaded, setIsLoaded] = useState(true);
  const { publishedEpisodes, isLoaded: podcastsLoaded } = usePodcasts();
  const { settings: contextSettings } = useSettingsContext();
  const settings = contextSettings ?? defaultSettings;
  const showAdsOnHomepage = settings.content.showAdsOnHomepage;
  const showWeatherOnHomepage = settings.content.showWeatherOnHomepage;
  const showPodcastsOnHomepage = podcastsLoaded && settings.content.showPodcastsOnHomepage && publishedEpisodes.length > 0;
  const showSidebar = showAdsOnHomepage || showWeatherOnHomepage;
  const contentGridClass = showSidebar ? 'lg:grid-cols-3' : 'lg:grid-cols-1';
  const contentColumnClass = showSidebar ? 'lg:col-span-2' : 'lg:col-span-1';

  // Se já temos dados iniciais, não precisa de loading skeleton
  const publishedArticles = useMemo(
    () =>
      [...articles]
        .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()),
    [articles]
  );

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
    () =>
      publishedEpisodes.map((episode) => ({
        id: episode.id,
        title: episode.title,
        episode: episode.episode,
        season: 1,
        description: episode.description,
        audioUrl: episode.audioUrl,
        thumbnail: episode.image || 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=1200&h=630&fit=crop',
        date: new Date(episode.updatedAt || episode.createdAt),
        duration: episode.duration || 25,
      })),
    [publishedEpisodes]
  );

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
              <Sidebar />
            </div>
          )}
        </div>
      </div>

      {showPodcastsOnHomepage && <Podcasts podcasts={homePodcasts} />}
    </>
  );
}
