'use client';

import { useParams } from 'next/navigation';
import NewsCardComponent from '@/app/components/NewsCard';
import Sidebar from '@/app/components/Sidebar';
import { secondaryArticles } from '@/app/data/mockData';

export default function CategoryPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const categoryName = slug
    ?.split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          {categoryName}
        </h1>
        <p className="text-gray-600 text-lg">
          Acompanhe todas as notícias e análises sobre {categoryName?.toLowerCase()}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <div className="space-y-8">
            {/* Featured in Category */}
            <div className="group border border-gray-200 rounded-lg overflow-hidden shadow hover:shadow-lg transition">
              <div className="h-96 bg-gray-200 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=800&h=500&fit=crop"
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-110 transition"
                />
              </div>
              <div className="p-6">
                <span className="inline-block px-3 py-1 bg-[#991B1B]/10 text-[#991B1B] text-xs font-semibold rounded-full mb-3">
                  {categoryName}
                </span>
                <h3 className="text-2xl font-bold text-gray-900 group-hover:text-[#991B1B] transition mb-3">
                  Manchete principal desta categoria
                </h3>
                <p className="text-gray-600 mb-4">
                  Resumo importante da notícia destacada nesta categoria, com informações relevantes.
                </p>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>por Autor Nome</span>
                  <span>há 2 horas</span>
                </div>
              </div>
            </div>

            {/* News Grid */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Mais notícias</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {secondaryArticles.map((article) => (
                  <NewsCardComponent key={article.id} article={article} />
                ))}
              </div>
            </div>

            {/* Pagination */}
            <div className="flex justify-center gap-2 mt-8">
              <button className="px-4 py-2 border border-gray-300 rounded hover:border-[#991B1B] hover:text-[#991B1B] transition">
                Anterior
              </button>
              <button className="px-4 py-2 border border-[#991B1B] bg-[#991B1B] text-white rounded">
                1
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded hover:border-[#991B1B] hover:text-[#991B1B] transition">
                2
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded hover:border-[#991B1B] hover:text-[#991B1B] transition">
                3
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded hover:border-[#991B1B] hover:text-[#991B1B] transition">
                Próximo
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Sidebar />
        </div>
      </div>
    </div>
  );
}
