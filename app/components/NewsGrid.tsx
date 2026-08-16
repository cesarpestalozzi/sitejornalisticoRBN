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
    <section className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.slice(0, 6).map((article) => (
            <NewsCardComponent key={article.id} article={article} />
          ))}
        </div>
      </div>
    </section>
  );
}
