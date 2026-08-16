'use client';

import { useMemo } from 'react';
import Hero from './components/Hero';
import NewsGrid from './components/NewsGrid';
import Podcasts from './components/Podcasts';
import Sidebar from './components/Sidebar';
import { useArticles, type Article as StoredArticle } from './hooks/useArticles';
import { usePodcasts } from './hooks/usePodcasts';
import { defaultSettings } from './lib/settings';
import { getCategoryDisplayName, normalizeCategorySlug } from './lib/categoryLabels';
import type { Article, NewsCard } from './types';
import { useSettingsContext } from './contexts/SettingsContext';

function stripHtml(content: string) {
  return content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function toDisplayArticle(article: StoredArticle): Article {
  const plainContent = stripHtml(article.content);
  const readingTime = Math.max(1, Math.ceil((plainContent ? plainContent.split(' ').length : 0) / 200));

  return {
    id: article.id,
    title: article.title,
    subtitle: article.subtitle,
    excerpt: article.excerpt || plainContent.slice(0, 180),
    content: article.content,
    category: getCategoryDisplayName(article.category),
    author: article.author,
    authorImage: undefined,
    image: article.image || 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=1200&h=630&fit=crop',
    date: new Date(article.updatedAt || article.createdAt),
    readingTime,
    tags: [article.category],
    featured: article.featured,
    views: article.views,
    comments: 0,
    shares: 0,
  };
}

function toNewsCard(article: StoredArticle): NewsCard {
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

export default function Home() {
  const { articles, isLoaded } = useArticles();
  const { publishedEpisodes, isLoaded: podcastsLoaded } = usePodcasts();
  const { settings: contextSettings } = useSettingsContext();
  const settings = contextSettings ?? defaultSettings;
  const showAdsOnHomepage = settings.content.showAdsOnHomepage;
  const showPodcastsOnHomepage = podcastsLoaded && settings.content.showPodcastsOnHomepage && publishedEpisodes.length > 0;
  const contentGridClass = showAdsOnHomepage ? 'lg:grid-cols-3' : 'lg:grid-cols-1';
  const contentColumnClass = showAdsOnHomepage ? 'lg:col-span-2' : 'lg:col-span-1';

  const publishedArticles = useMemo(
    () =>
      [...articles]
        .filter((article) => article.status === 'publicado')
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
      <Hero article={heroArticle} secondaryArticles={heroSecondaryArticles} />

      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className={`grid grid-cols-1 gap-8 ${contentGridClass}`}>
          <div className={`order-2 space-y-8 lg:order-1 ${contentColumnClass}`}>
            {isLoaded && publishedArticles.length === 0 ? (
              <section className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-600">
                Ainda não há notícias publicadas no navegador. Publique artigos no painel administrativo para vê-los aqui.
              </section>
            ) : (
              sectionArticles.map((section) => (
                <NewsGrid key={section.key} title={section.title} category={section.key} articles={section.articles} />
              ))
            )}
          </div>

          {showAdsOnHomepage && (
            <div className="order-1 lg:order-2 lg:col-span-1">
              <Sidebar />
            </div>
          )}
        </div>
      </div>

      {showPodcastsOnHomepage && <Podcasts podcasts={homePodcasts} />}
    </>
  );
}
