'use client';

import Link from 'next/link';
import { NewsCard } from '@/app/types';
import { getCategoryDisplayName } from '@/app/lib/categoryLabels';
import { formatDate, timeAgo } from '@/app/utils/dateUtils';

interface NewsCardProps {
  article: NewsCard;
}

export default function NewsCardComponent({ article }: NewsCardProps) {
  return (
    <Link href={`/artigo/${article.id}`}>
      <article className="group bg-white rounded-lg overflow-hidden shadow hover:shadow-lg transition duration-300 cursor-pointer h-full flex flex-col">
        {/* Image */}
        <div className="relative h-48 overflow-hidden bg-gray-200">
          <img
            src={article.image}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
          />
          <span className="absolute top-3 left-3 px-3 py-1 bg-[#991B1B] text-white text-xs font-bold rounded">
            {getCategoryDisplayName(article.category)}
          </span>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col flex-1">
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#991B1B] transition line-clamp-2 mb-2">
            {article.title}
          </h3>
          
          <p className="text-gray-600 text-sm line-clamp-2 mb-4 flex-1">
            {article.excerpt}
          </p>

          <div className="space-y-3 pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="font-medium">{article.author}</span>
              <span>{article.readingTime} min</span>
            </div>
            
            <p className="text-xs text-gray-400">
              {timeAgo(article.date)}
            </p>
          </div>
        </div>
      </article>
    </Link>
  );
}
