'use client';

import Link from 'next/link';
import Image from 'next/image';
import { NewsCard } from '@/app/types';
import { getCategoryDisplayName } from '@/app/lib/categoryLabels';
import { formatDate, timeAgo } from '@/app/utils/dateUtils';

interface NewsCardProps {
  article: NewsCard;
}

export default function NewsCardComponent({ article }: NewsCardProps) {
  return (
    <Link href={`/artigo/${article.id}`}>
      <article className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition duration-300 hover:shadow-md">
        <div className="relative h-40 overflow-hidden bg-gray-200 sm:h-44 md:h-48">
          <Image
            src={article.image}
            alt={article.title}
            width={400}
            height={192}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
          />
          <span className="absolute left-3 top-3 rounded bg-[#991B1B] px-2.5 py-1 text-[10px] font-bold text-white sm:text-xs">
            {getCategoryDisplayName(article.category)}
          </span>
        </div>

        <div className="flex flex-1 flex-col p-3 sm:p-4">
          <h3 className="mb-2 line-clamp-2 text-base font-bold text-gray-900 transition group-hover:text-[#991B1B] sm:text-lg">
            {article.title}
          </h3>

          <p className="mb-4 flex-1 text-sm leading-relaxed text-gray-600 line-clamp-2">
            {article.excerpt}
          </p>

          <div className="space-y-2 border-t border-gray-200 pt-3">
            <div className="flex items-center justify-between gap-2 text-[11px] text-gray-500 sm:text-xs">
              <span className="font-medium">{article.author}</span>
              <span>{article.readingTime} min</span>
            </div>

            <p className="text-[11px] text-gray-400 sm:text-xs">
              {timeAgo(article.date)}
            </p>
          </div>
        </div>
      </article>
    </Link>
  );
}
