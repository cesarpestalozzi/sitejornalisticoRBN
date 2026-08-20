'use client';

import { useEffect, useState } from 'react';
import { Save, Search } from 'lucide-react';
import AdminSidebar from '@/app/components/AdminSidebar';
import { useArticles } from '@/app/hooks/useArticles';
import { useToast, ToastContainer } from '@/app/components/Toast';
import { normalizeCategorySlug } from '@/app/lib/categoryLabels';
import { readManagedCategories } from '@/app/lib/managedCategories';

const FEATURED_KEY = 'pz_news_featured_per_category';

interface FeaturedMap {
  [key: string]: string | null;
}

export default function ManichetasPage() {
  const { articles } = useArticles();
  const { toasts, addToast, removeToast } = useToast();
  const [featured, setFeatured] = useState<FeaturedMap>(() => {
    if (typeof window === 'undefined') {
      return {};
    }

    try {
      const stored = window.localStorage.getItem(FEATURED_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Erro ao carregar manchetes:', error);
      return {};
    }
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [managedCategories, setManagedCategories] = useState(() => readManagedCategories());

  const publishedArticles = articles.filter((a) => a.status === 'publicado');

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

  useEffect(() => {
    localStorage.setItem(FEATURED_KEY, JSON.stringify(featured));
  }, [featured]);

  const handleSave = () => {
    localStorage.setItem(FEATURED_KEY, JSON.stringify(featured));
    addToast('Manchetes salvas com sucesso!', 'success', 3000);
  };

  const categoryList = managedCategories.map((category) => normalizeCategorySlug(category.name));

  const filteredArticles = publishedArticles.filter((article) => {
    const normalizedCategory = normalizeCategorySlug(article.category);

    return (
      (searchTerm === '' || article.title.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (selectedCategory === '' || normalizedCategory === selectedCategory)
    );
  });

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />

      <main className="flex-1 overflow-auto">
        <div className="sticky top-0 z-20 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between px-8 py-5">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Manchetes Principais</h1>
              <p className="text-sm text-gray-600">Selecione o artigo destaque para cada categoria.</p>
            </div>
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-2 rounded-lg bg-[#111111] px-6 py-3 font-semibold text-white transition hover:bg-[#2a2a2a]"
            >
              <Save className="h-5 w-5" />
              Salvar
            </button>
          </div>
        </div>

        <div className="p-8">
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Categorias */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900">Categorias</h2>
              <div className="space-y-2">
                {categoryList.map((cat) => {
                  const featuredId = featured[cat];
                  const featuredArticle = publishedArticles.find((a) => a.id === featuredId);

                  return (
                    <div key={cat} className="rounded-lg bg-white p-4 shadow-sm">
                      <p className="text-sm font-semibold text-gray-900 mb-2 capitalize">{cat.replace('-', ' ')}</p>
                      {featuredArticle ? (
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900 line-clamp-2">{featuredArticle.title}</p>
                            <p className="text-xs text-gray-500 mt-1">{featuredArticle.author}</p>
                          </div>
                          <button
                            onClick={() => setFeatured((prev) => ({ ...prev, [cat]: null }))}
                            className="text-xs text-red-600 hover:text-red-700 font-semibold"
                          >
                            Remover
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 italic">Nenhum artigo selecionado</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Seletor de Artigos */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Filtrar por categoria</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-[#991B1B] focus:outline-none"
                >
                  <option value="">Todas as categorias</option>
                  {categoryList.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1).replace('-', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Buscar artigos</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Digite o título..."
                    className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-[#991B1B] focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredArticles.length > 0 ? (
                  filteredArticles.map((article) => {
                    const isFeatured = Object.values(featured).includes(article.id);

                    return (
                      <button
                        key={article.id}
                        onClick={() => {
                          const category = normalizeCategorySlug(article.category);
                          setFeatured((prev) => ({ ...prev, [category]: article.id }));
                        }}
                        className={`w-full rounded-lg border-2 p-3 text-left transition ${
                          isFeatured
                            ? 'border-[#991B1B] bg-[#991B1B]/5'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <p className="font-semibold text-gray-900 line-clamp-2">{article.title}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex gap-2">
                            <span className="inline-flex rounded-full bg-[#991B1B]/10 px-2 py-1 text-xs font-semibold text-[#991B1B] capitalize">
                              {article.category}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">{article.author}</p>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-600">
                    Nenhum artigo encontrado
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </main>
    </div>
  );
}
