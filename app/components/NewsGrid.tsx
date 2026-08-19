'use client';

import NewsCardComponent from './NewsCard';
import { NewsCard } from '@/app/types';

interface NewsGridProps {
  title: string;
  category: string;
  articles: NewsCard[];
}

export default function NewsGrid({ title, category, articles }: NewsGridProps) {
  return (
    <section className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-3 py-6 sm:px-4 sm:py-8 md:py-10">
        <div className="mb-5 sm:mb-8">
          <h2 className="font-editorial text-2xl font-bold text-gray-900 sm:text-3xl">{title}</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
          {articles.slice(0, 6).map((article) => (
            <NewsCardComponent key={article.id} article={article} />
          ))}
        </div>
      </div>
    </section>
  );
}
