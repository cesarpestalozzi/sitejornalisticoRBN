'use client';

import Link from 'next/link';
import { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Newspaper } from 'lucide-react';
import { useArticles } from '@/app/hooks/useArticles';
import { getCategoryDisplayName } from '@/app/lib/categoryLabels';
import { formatDate } from '@/app/utils/dateUtils';

function stripHtml(content: string) {
  return content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeText(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q')?.trim() ?? '';
  const { articles, isLoaded } = useArticles();

  const results = useMemo(() => {
    const normalizedQuery = normalizeText(query);

    if (!normalizedQuery) {
      return [];
    }

    return articles
      .filter((article) => article.status === 'publicado')
      .filter((article) => {
        const haystack = [
          article.title,
          article.subtitle,
          article.excerpt,
          article.category,
          article.author,
          stripHtml(article.content),
        ]
          .join(' ')
          .toLowerCase();

        return normalizeText(haystack).includes(normalizedQuery);
      })
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
      .slice(0, 12);
  }, [articles, query]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#991B1B]">Busca</p>
              <h1 className="mt-2 text-3xl font-bold text-gray-900">Resultados para “{query || 'todas as notícias'}”</h1>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#991B1B]/20 bg-[#991B1B]/5 px-4 py-2 text-sm font-semibold text-[#991B1B]">
              <Search className="h-4 w-4" />
              {isLoaded ? `${results.length} resultados` : 'Carregando...'}
            </div>
          </div>

          {!query ? (
            <div className="mt-8 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-600">
              Digite um termo para localizar matérias, categorias, autores ou palavras-chave.
            </div>
          ) : results.length === 0 ? (
            <div className="mt-8 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-600">
              Nenhuma matéria encontrada para esta busca. Tente outro termo.
            </div>
          ) : (
            <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {results.map((article) => (
                <Link key={article.id} href={`/artigo/${article.id}`} className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                  <div className="h-40 bg-gray-200">
                    <img src={article.image || '/'} alt={article.title} className="h-full w-full object-cover" />
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full bg-[#991B1B]/10 px-3 py-1 text-xs font-semibold uppercase text-[#991B1B]">{getCategoryDisplayName(article.category)}</span>
                      <span className="text-xs text-gray-500">{formatDate(new Date(article.updatedAt || article.createdAt))}</span>
                    </div>
                    <h2 className="mt-3 text-lg font-bold text-gray-900 transition group-hover:text-[#991B1B]">{article.title}</h2>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-600">{article.excerpt || stripHtml(article.content)}</p>
                    <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                      <Newspaper className="h-4 w-4" />
                      {article.author}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}> 
      <SearchPageContent />
    </Suspense>
  );
}
