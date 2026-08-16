'use client';

import Link from 'next/link';
import { Article, NewsCard } from '@/app/types';
import { getCategoryDisplayName } from '@/app/lib/categoryLabels';
import { formatDate } from '@/app/utils/dateUtils';

interface HeroProps {
  article: Article | null;
  secondaryArticles?: NewsCard[];
}

export default function Hero({ article, secondaryArticles = [] }: HeroProps) {
  if (!article) {
    return (
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-gray-600">
            <h2 className="text-2xl font-semibold text-gray-900">Acompanhe o portal em tempo real</h2>
            <p className="mt-3">Publique sua primeira matéria no painel administrativo para que ela apareça aqui automaticamente.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Link href={`/artigo/${article.id}`}>
              <div className="group cursor-pointer overflow-hidden rounded-lg">
                <img src={article.image} alt={article.title} className="h-96 w-full object-cover object-top transition duration-300 group-hover:scale-105" />
              </div>
            </Link>

            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className="inline-block rounded-full bg-[#991B1B]/10 px-3 py-1 text-xs font-semibold text-[#991B1B]">
                  {getCategoryDisplayName(article.category)}
                </span>
                <span className="text-xs text-gray-500">{formatDate(article.date)}</span>
              </div>

              <Link href={`/artigo/${article.id}`}>
                <h1 className="cursor-pointer text-4xl font-bold leading-tight text-gray-900 transition group-hover:text-[#991B1B] md:text-5xl">
                  {article.title}
                </h1>
              </Link>

              {article.subtitle && <p className="text-xl leading-relaxed text-gray-600">{article.subtitle}</p>}

              <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                <div className="flex items-center gap-3">
                  {article.authorImage && <img src={article.authorImage} alt={article.author} className="h-10 w-10 rounded-full object-cover" />}
                  <div>
                    <p className="font-semibold text-gray-900">{article.author}</p>
                    <p className="text-xs text-gray-500">{article.readingTime} min de leitura</p>
                  </div>
                </div>

                <Link href={`/artigo/${article.id}`} className="inline-flex items-center justify-center rounded-full bg-[#991B1B] px-6 py-2 font-semibold text-white transition hover:bg-[#7F1D1D] hover:text-white focus:text-white">
                  Leia mais
                </Link>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-900">Destaques</h3>
            <div className="space-y-6">
              {secondaryArticles.map((secondaryArticle) => (
                <Link key={secondaryArticle.id} href={`/artigo/${secondaryArticle.id}`} className="group block border-b border-gray-200 pb-6 last:border-0">
                  <div className="flex gap-3">
                    <div className="h-16 w-24 flex-shrink-0 overflow-hidden rounded bg-gray-200">
                      <img src={secondaryArticle.image} alt={secondaryArticle.title} className="h-full w-full object-cover object-top" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-semibold uppercase text-[#991B1B]">{getCategoryDisplayName(secondaryArticle.category)}</span>
                      <h4 className="mt-1 line-clamp-2 text-sm font-bold leading-tight text-gray-900 transition group-hover:text-[#991B1B]">
                        {secondaryArticle.title}
                      </h4>
                      <p className="mt-2 text-xs text-gray-500">{formatDate(secondaryArticle.date)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
