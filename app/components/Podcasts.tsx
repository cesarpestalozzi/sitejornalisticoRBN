'use client';

import Link from 'next/link';
import { Podcast } from '@/app/types';
import { Play, Volume2 } from 'lucide-react';

interface PodcastsProps {
  podcasts: Podcast[];
}

export default function Podcasts({ podcasts }: PodcastsProps) {
  const formatDuration = (minutes: number): string => {
    return `${minutes} min`;
  };

  return (
    <section className="bg-gray-50 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#991B1B] rounded-lg flex items-center justify-center">
              <Volume2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Podcasts</h2>
              <p className="text-gray-600 text-sm">Ouça nossas histórias</p>
            </div>
          </div>
          <Link
            href="/podcasts"
            className="px-6 py-2 border border-[#991B1B] text-[#991B1B] rounded-full font-semibold hover:bg-[#991B1B]/5 transition"
          >
            Ver todos
          </Link>
        </div>

        {/* Podcasts List */}
        <div className="space-y-4">
          {podcasts.map((podcast) => (
            <Link
              key={podcast.id}
              href={`/podcast/${podcast.id}`}
              className="group bg-white rounded-lg overflow-hidden shadow hover:shadow-lg transition flex"
            >
              {/* Thumbnail */}
              <div className="w-32 h-32 flex-shrink-0 relative overflow-hidden bg-gray-200">
                <img
                  src={podcast.thumbnail}
                  alt={podcast.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition flex items-center justify-center">
                  <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-[#991B1B]/10 text-[#991B1B] text-xs font-bold rounded">
                      PODCAST
                    </span>
                    <span className="text-xs text-gray-500">Ep. {podcast.episode}</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#991B1B] transition">
                    {podcast.title}
                  </h3>
                  <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                    {podcast.description}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                  <span className="text-xs text-gray-500">
                    {new Date(podcast.date).toLocaleDateString('pt-BR')}
                  </span>
                  <span className="text-xs font-semibold text-gray-600">
                    {formatDuration(podcast.duration)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
