'use client';

import Link from 'next/link';
import { Edit2, Eye, FileText, Filter, Plus, Search, Trash2, AlertCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import AdminSidebar from '@/app/components/AdminSidebar';
import { useArticles } from '@/app/hooks/useArticles';
import {
  canCreateArticle,
  canDeleteArticle,
  canViewAllArticles,
  useCurrentAdminUser,
} from '@/app/lib/adminPermissions';
import { normalizeArticleStatus } from '@/app/lib/articleStatus';

export default function AdminArticles() {
  const { articles, deletedArticles, deleteArticle, isLoaded } = useArticles();
  const currentUser = useCurrentAdminUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useState('');

  const filteredArticles = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const visibleArticles = currentUser && canViewAllArticles(currentUser)
      ? articles
      : currentUser
        ? articles.filter((article) => {
          const articleStatus = normalizeArticleStatus(article.status, article.publishedAt ? 'publicado' : undefined);
          const articleAuthor = typeof article.author === 'string' ? article.author.toLowerCase() : '';
          return articleStatus === 'publicado' || articleAuthor === currentUser.name.toLowerCase();
        })
        : [];

    return visibleArticles.filter((article) => {
      const articleStatus = normalizeArticleStatus(article.status, article.publishedAt ? 'publicado' : undefined);
      const title = typeof article.title === 'string' ? article.title : '';
      const author = typeof article.author === 'string' ? article.author : '';
      const category = typeof article.category === 'string' ? article.category : '';

      const matchesSearch =
        normalizedSearch.length === 0 ||
        [title, author, category].some((field) => field.toLowerCase().includes(normalizedSearch));
      const matchesStatus = filterStatus === 'todos' || articleStatus === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [articles, currentUser, filterStatus, searchTerm]);

  const selectedArticle = articles.find((article) => article.id === selectedArticleId);

  const handleDeleteClick = (id: string) => {
    setSelectedArticleId(id);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (!selectedArticleId) {
      return;
    }

    try {
      deleteArticle(selectedArticleId);
      setShowDeleteModal(false);
      setSelectedArticleId(null);
      setDeleteMessage('Artigo movido para o lixo com sucesso.');
      window.setTimeout(() => setDeleteMessage(''), 3000);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Sem permissão para mover este artigo para o lixo.');
    }
  };

  const statusStyles: Record<string, string> = {
    publicado: 'bg-green-100 text-green-700',
    rascunho: 'bg-yellow-100 text-yellow-700',
    agendado: 'bg-[#D8F0FA] text-[#236A88]',
  };

  if (!isLoaded || !currentUser) {
    return <div className="p-6 text-sm text-gray-600">Carregando artigos...</div>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 md:flex-row">
      <AdminSidebar />

      <main className="flex-1 overflow-auto">
        <div className="sticky top-0 z-20 border-b border-gray-200 bg-white">
          <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Artigos do RBN</h1>
              <p className="mt-1 text-sm text-gray-600">Gerencie, pesquise e publique notícias do portal.</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/admin/lixo" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-50">
                Lixo ({deletedArticles.length})
              </Link>
              {canCreateArticle(currentUser) && (
                <Link href="/admin/artigos/novo" className="inline-flex items-center gap-2 rounded-lg bg-[#111111] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#2a2a2a]">
                  <Plus className="h-5 w-5" />
                  Novo artigo
                </Link>
              )}
            </div>
          </div>
          {deleteMessage && <div className="bg-green-100 px-8 py-3 text-sm font-semibold text-green-700">{deleteMessage}</div>}
        </div>

        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-500">Total de artigos</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{articles.length}</p>
            </div>
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-500">Publicados</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{articles.filter((article) => normalizeArticleStatus(article.status, article.publishedAt ? 'publicado' : undefined) === 'publicado').length}</p>
            </div>
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-500">Em destaque</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{articles.filter((article) => article.featured).length}</p>
            </div>
          </section>

          <section className="rounded-xl bg-white p-6 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-900">Buscar por título, autor ou categoria</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Digite para filtrar em tempo real"
                    className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-[#991B1B] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-900">Filtrar por status</label>
                <div className="relative">
                  <Filter className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <select
                    value={filterStatus}
                    onChange={(event) => setFilterStatus(event.target.value)}
                    className="w-full appearance-none rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-[#991B1B] focus:outline-none"
                  >
                    <option value="todos">Todos</option>
                    <option value="publicado">Publicado</option>
                    <option value="rascunho">Rascunho</option>
                    <option value="agendado">Agendado</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          {filteredArticles.length === 0 ? (
            <section className="rounded-xl bg-white p-12 text-center shadow-sm">
              <FileText className="mx-auto mb-4 h-14 w-14 text-gray-300" />
              <h2 className="text-xl font-bold text-gray-900">Nenhum artigo encontrado</h2>
              <p className="mt-2 text-gray-600">Ajuste os filtros ou crie uma nova notícia.</p>
            </section>
          ) : (
            <section className="overflow-hidden rounded-xl bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Título</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Categoria</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Autor</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Visualizações</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Atualizado</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {filteredArticles.map((article) => (
                      <tr key={article.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <p className="font-semibold text-gray-900">{article.title}</p>
                            {article.subtitle && <p className="line-clamp-1 text-xs text-gray-500">{article.subtitle}</p>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600 capitalize">{article.category}</td>
                        <td className="px-6 py-4 text-gray-600">{article.author}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[article.status] ?? 'bg-gray-100 text-gray-700'}`}>
                            {article.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          <span className="inline-flex items-center gap-1">
                            <Eye className="h-4 w-4 text-[#2F7EA1]" />
                            {article.views}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{new Date(article.updatedAt).toLocaleDateString('pt-BR')}</td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <Link href={`/admin/artigos/${article.id}`} className="inline-flex items-center rounded-lg bg-[#2F7EA1] px-3 py-2 text-white transition hover:bg-[#236A88]" title="Editar artigo">
                              <Edit2 className="h-4 w-4" />
                            </Link>
                            {canDeleteArticle(currentUser, article.author) && (
                              <button type="button" onClick={() => handleDeleteClick(article.id)} className="inline-flex items-center rounded-lg bg-red-600 px-3 py-2 text-white transition hover:bg-red-700" title="Mover para o lixo">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </main>

      {showDeleteModal && selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-orange-600" />
              <h2 className="text-xl font-bold text-gray-900">Mover artigo para o lixo</h2>
            </div>
            <p className="text-gray-600">
              Confirma a remoção do artigo <strong>{selectedArticle.title}</strong>? Ele poderá ser restaurado depois.
            </p>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setShowDeleteModal(false)} className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-900 transition hover:bg-gray-50">
                Cancelar
              </button>
              <button type="button" onClick={handleConfirmDelete} className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-700">
                Confirmar exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
