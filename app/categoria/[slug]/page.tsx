'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import Sidebar from '@/app/components/Sidebar';
import { getCategoryDisplayName, normalizeCategorySlug } from '@/app/lib/categoryLabels';
import { readManagedCategories } from '@/app/lib/managedCategories';
import { formatDate } from '@/app/utils/dateUtils';

interface CategoryArticle {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  author: string;
  content: string;
  excerpt: string;
  image?: string;
  status: 'rascunho' | 'agendado' | 'publicado';
  createdAt: string;
  updatedAt: string;
}

function stripHtml(content: string) {
  return content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function estimateReadingTimeMinutes(content: string) {
  const words = stripHtml(content).split(' ').filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export default function CategoryPage() {
  const params = useParams();
  const rawSlug = typeof params?.slug === 'string' ? params.slug : '';
  const currentSlug = normalizeCategorySlug(rawSlug);
  const [articles, setArticles] = useState<CategoryArticle[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [managedCategories, setManagedCategories] = useState(() => readManagedCategories());

  useEffect(() => {
    let isActive = true;

    const loadArticles = async () => {
      try {
        setIsLoaded(false);
        const response = await fetch(`/api/articles?category=${encodeURIComponent(currentSlug)}`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const rows = (await response.json()) as Array<{ payload?: CategoryArticle }>; 
        const nextArticles = rows
          .map((row) => row.payload)
          .filter((article): article is CategoryArticle => Boolean(article && article.id));

        if (isActive) {
          setArticles(nextArticles.filter((article) => article.status === 'publicado').sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()));
        }
      } catch (error) {
        console.warn('Erro ao carregar categoria:', error);
        if (isActive) {
          setArticles([]);
        }
      } finally {
        if (isActive) {
          setIsLoaded(true);
        }
      }
    };

    void loadArticles();

    return () => {
      isActive = false;
    };
  }, [currentSlug]);

  useEffect(() => {
    const syncCategories = () => setManagedCategories(readManagedCategories());

    syncCategories();
    window.addEventListener('categoriesChanged', syncCategories);
    window.addEventListener('storage', syncCategories);

    return () => {
      window.removeEventListener('categoriesChanged', syncCategories);
      window.removeEventListener('storage', syncCategories);
    };
  }, []);

  const categoryName = useMemo(() => {
    const managed = managedCategories.find((item) => normalizeCategorySlug(item.slug || item.name) === currentSlug);
    return managed?.name || getCategoryDisplayName(currentSlug);
  }, [currentSlug, managedCategories]);

  const publishedArticles = useMemo(
    () =>
      [...articles].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()),
    [articles]
  );

  const featuredArticle = publishedArticles[0];
  const moreArticles = publishedArticles.slice(1);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
      <div className="mb-8 sm:mb-10">
        <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">{categoryName}</h1>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {!isLoaded ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-gray-500">Carregando matérias...</div>
          ) : publishedArticles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-gray-600">
              Ainda não há matérias publicadas nesta categoria.
            </div>
          ) : (
            <div className="space-y-8">
              {featuredArticle && (
                <Link href={`/artigo/${featuredArticle.id}`} className="group block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <div className="h-56 bg-gray-200 sm:h-72">
                    <img
                      src={featuredArticle.image || '/logo-oficial.png'}
                      alt={featuredArticle.title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-5">
                    <span className="inline-block rounded-full bg-[#991B1B]/10 px-3 py-1 text-xs font-semibold text-[#991B1B]">
                      {getCategoryDisplayName(featuredArticle.category)}
                    </span>
                    <h2 className="mt-3 text-2xl font-bold text-gray-900 transition group-hover:text-[#991B1B]">{featuredArticle.title}</h2>
                    <p className="mt-2 text-gray-600">{featuredArticle.excerpt || stripHtml(featuredArticle.content).slice(0, 180)}</p>
                    <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                      <span>{featuredArticle.author}</span>
                      <span>{formatDate(new Date(featuredArticle.updatedAt || featuredArticle.createdAt))}</span>
                    </div>
                  </div>
                </Link>
              )}

              {moreArticles.length > 0 && (
                <div>
                  <h3 className="mb-4 text-xl font-bold text-gray-900">Mais notícias</h3>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    {moreArticles.map((article) => (
                      <Link key={article.id} href={`/artigo/${article.id}`} className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                        <div className="h-40 bg-gray-200">
                          <img src={article.image || '/logo-oficial.png'} alt={article.title} className="h-full w-full object-cover" />
                        </div>
                        <div className="p-4">
                          <h4 className="line-clamp-2 text-lg font-bold text-gray-900 transition group-hover:text-[#991B1B]">{article.title}</h4>
                          <p className="mt-2 line-clamp-2 text-sm text-gray-600">{article.excerpt || stripHtml(article.content).slice(0, 140)}</p>
                          <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                            <span>{article.author}</span>
                            <span>{estimateReadingTimeMinutes(article.content)} min</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <Sidebar />
        </div>
      </div>
    </div>
  );
}
