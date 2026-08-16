'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Edit2, Trash2, Plus, FolderOpen, Eraser } from 'lucide-react';
import AdminSidebar from '@/app/components/AdminSidebar';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([
    { id: 1, name: 'Política', slug: 'politica', color: '#3B82F6', articles: 24 },
    { id: 2, name: 'Economia', slug: 'economia', color: '#10B981', articles: 31 },
    { id: 3, name: 'Tecnologia', slug: 'tecnologia', color: '#F59E0B', articles: 28 },
    { id: 4, name: 'Saúde', slug: 'saude', color: '#EF4444', articles: 19 },
    { id: 5, name: 'Esportes', slug: 'esportes', color: '#8B5CF6', articles: 35 },
    { id: 6, name: 'Cultura', slug: 'cultura', color: '#EC4899', articles: 22 },
  ]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', slug: '', color: '#3B82F6' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setCategories((prev) =>
        prev.map((cat) =>
          cat.id === editingId ? { ...cat, ...formData } : cat
        )
      );
      setEditingId(null);
    } else {
      setCategories((prev) => [
        ...prev,
        { ...formData, id: Math.max(...prev.map((c) => c.id), 0) + 1, articles: 0 },
      ]);
    }
    setFormData({ name: '', slug: '', color: '#3B82F6' });
    setShowForm(false);
  };

  const handleEdit = (category: typeof categories[0]) => {
    setEditingId(category.id);
    setFormData({ name: category.name, slug: category.slug, color: category.color });
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Deletar esta categoria?')) {
      setCategories((prev) => prev.filter((cat) => cat.id !== id));
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', slug: '', color: '#3B82F6' });
  };

  const handleClearCategories = () => {
    if (!window.confirm('Deseja limpar todas as categorias? Esta ação removerá todos os registros da lista.')) {
      return;
    }

    setCategories([]);
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', slug: '', color: '#3B82F6' });
  };

  const handleResetCategoryMetrics = () => {
    if (!window.confirm('Deseja zerar as contagens de artigos de todas as categorias?')) {
      return;
    }

    setCategories((prev) => prev.map((category) => ({ ...category, articles: 0 })));
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 md:h-screen md:flex-row">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
          <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Categorias</h1>
              <p className="text-gray-600 text-sm mt-1">Gerencie as categorias de notícias.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleResetCategoryMetrics}
                className="border border-yellow-300 bg-yellow-50 text-yellow-700 px-4 py-2 rounded-lg hover:bg-yellow-100 transition flex items-center gap-2 font-semibold"
              >
                <Eraser className="w-4 h-4" />
                Zerar métricas
              </button>
              <button
                type="button"
                onClick={handleClearCategories}
                className="border border-red-300 bg-red-50 text-red-700 px-4 py-2 rounded-lg hover:bg-red-100 transition flex items-center gap-2 font-semibold"
              >
                <Trash2 className="w-4 h-4" />
                Limpar categorias
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="bg-[#111111] text-white px-6 py-2 rounded-lg hover:bg-[#2a2a2a] transition flex items-center gap-2 font-semibold"
              >
                <Plus className="w-5 h-5" />
                Nova Categoria
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Form */}
          {showForm && (
            <div className="bg-white rounded-lg shadow mb-8 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                {editingId ? 'Editar Categoria' : 'Nova Categoria'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Nome</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="ex: Política"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#991B1B]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Slug</label>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      placeholder="ex: politica"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#991B1B]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Cor</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="w-12 h-10 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#991B1B] font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
                  >
                    {editingId ? 'Atualizar' : 'Criar'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition font-semibold"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Categories Grid */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {categories.map((category) => (
              <div
                key={category.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden"
              >
                <div
                  className="h-2"
                  style={{ backgroundColor: category.color }}
                />

                <div className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: category.color + '20' }}
                    >
                      <FolderOpen
                        className="w-5 h-5"
                        style={{ color: category.color }}
                      />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{category.name}</h3>
                      <p className="text-xs text-gray-600">{category.slug}</p>
                    </div>
                  </div>

                  <div className="py-3 border-t border-b border-gray-200 my-3">
                    <p className="text-sm text-gray-600">
                      <span className="font-bold text-gray-900">{category.articles}</span> artigos
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(category)}
                      className="flex-1 px-3 py-2 bg-[#111111] text-white rounded-lg hover:bg-[#2a2a2a] transition text-sm font-semibold flex items-center justify-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="flex-1 px-3 py-2 bg-[#111111] text-white rounded-lg hover:bg-[#2a2a2a] transition text-sm font-semibold flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Deletar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
