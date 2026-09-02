'use client';

import Link from 'next/link';
import { VideoContent } from '@/app/types';
import { Play, Clock } from 'lucide-react';

interface VideosProps {
  videos: VideoContent[];
}

export default function Videos({ videos }: VideosProps) {
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <section className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Vídeos</h2>
            <p className="text-gray-600 text-sm mt-2">Conteúdo multimídia de qualidade premium</p>
          </div>
          <Link
            href="/videos"
            className="px-6 py-2 border border-[#991B1B] text-[#991B1B] rounded-full font-semibold hover:bg-[#991B1B]/5 transition"
          >
            Ver todos
          </Link>
        </div>

        {/* Videos Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {videos.map((video) => (
            <Link
              key={video.id}
              href={`/video/${video.id}`}
              className="group relative overflow-hidden rounded-lg"
            >
              <div className="aspect-video bg-gray-200 overflow-hidden relative">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition flex items-center justify-center">
                  <Play className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition" />
                </div>
                <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  {formatDuration(video.duration)}
                </span>
              </div>
              
              <div className="p-3 bg-white group-hover:bg-gray-50 transition">
                <span className="inline-block px-2 py-1 bg-[#991B1B]/10 text-[#991B1B] text-xs font-bold rounded mb-2">
                  {video.category}
                </span>
                <h3 className="font-bold text-gray-900 group-hover:text-[#991B1B] line-clamp-2 text-sm">
                  {video.title}
                </h3>
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(video.date).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
