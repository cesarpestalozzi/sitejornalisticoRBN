'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, RotateCcw, Trash, Trash2 } from 'lucide-react';
import AdminSidebar from '@/app/components/AdminSidebar';
import { useArticles, type Article } from '@/app/hooks/useArticles';
import { usePodcasts, type PodcastEpisode } from '@/app/hooks/usePodcasts';

type TrashItem =
  | {
      kind: 'article';
      id: string;
      title: string;
      category: string;
      status: Article['status'];
      author: string;
      updatedAt: string;
    }
  | {
      kind: 'podcast';
      id: string;
      title: string;
      category: 'Podcast';
      status: PodcastEpisode['status'];
      author: string;
      updatedAt: string;
    };

export default function TrashPage() {
  const { deletedArticles, restoreArticle, permanentlyDeleteArticle, emptyTrash, isLoaded: articlesLoaded } = useArticles();
  const {
    deletedEpisodes,
    restoreEpisode,
    permanentlyDeleteEpisode,
    emptyPodcastTrash,
    isLoaded: podcastsLoaded,
  } = usePodcasts();
  const [showEmptyModal, setShowEmptyModal] = useState(false);
  const isLoaded = articlesLoaded && podcastsLoaded;

  const deletedItems = useMemo<TrashItem[]>(() => {
    const articleItems: TrashItem[] = deletedArticles.map((article) => ({
      kind: 'article',
      id: article.id,
      title: article.title,
      category: article.category,
      status: article.status,
      author: article.author,
      updatedAt: article.updatedAt,
    }));

    const podcastItems: TrashItem[] = deletedEpisodes.map((episode) => ({
      kind: 'podcast',
      id: episode.id,
      title: episode.title,
      category: 'Podcast',
      status: episode.status,
      author: 'Podcast',
      updatedAt: episode.updatedAt,
    }));

    return [...articleItems, ...podcastItems].sort(
      (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    );
  }, [deletedArticles, deletedEpisodes]);

  const handleRestore = (item: TrashItem) => {
    if (item.kind === 'article') {
      restoreArticle(item.id);
      return;
    }
    restoreEpisode(item.id);
  };

  const handlePermanentDelete = (item: TrashItem) => {
    if (item.kind === 'article') {
      permanentlyDeleteArticle(item.id);
      return;
    }
    permanentlyDeleteEpisode(item.id);
  };

  const handleEmptyTrash = () => {
    emptyTrash();
    emptyPodcastTrash();
    setShowEmptyModal(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'publicado':
        return 'bg-green-100 text-green-700';
      case 'rascunho':
        return 'bg-yellow-100 text-yellow-700';
      case 'agendado':
        return 'bg-[#D8F0FA] text-[#236A88]';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (!isLoaded) {
    return <div className="p-6 text-sm text-gray-600">Carregando lixo...</div>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 md:flex-row">
      <AdminSidebar />

      <main className="flex-1 overflow-auto">
        <div className="sticky top-0 z-20 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between px-8 py-4">
            <div className="flex items-center gap-4">
              <Link href="/admin/artigos" className="rounded-lg p-2 transition hover:bg-gray-100">
                <ArrowLeft className="h-6 w-6 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Lixo</h1>
                <p className="text-sm text-gray-600">Itens deletados ({deletedItems.length})</p>
              </div>
            </div>
            {deletedItems.length > 0 && (
              <button type="button" onClick={() => setShowEmptyModal(true)} className="inline-flex items-center gap-2 rounded-lg bg-[#111111] px-4 py-2 font-semibold text-white transition hover:bg-[#2a2a2a]">
                <Trash className="h-4 w-4" />
                Esvaziar lixo
              </button>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          {deletedItems.length === 0 ? (
            <div className="rounded-lg bg-white p-12 text-center shadow-sm">
              <Trash2 className="mx-auto mb-4 h-16 w-16 text-gray-300" />
              <h2 className="mb-2 text-xl font-bold text-gray-900">Lixo vazio</h2>
              <p className="mb-6 text-gray-600">Nenhum item deletado no momento.</p>
              <Link href="/admin/artigos" className="inline-block rounded-lg bg-[#111111] px-6 py-2 font-semibold text-white transition hover:bg-[#2a2a2a]">
                Voltar para administração
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-600">Tipo</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-600">Título</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-600">Categoria</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-600">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-600">Removido em</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-600">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {deletedItems.map((item) => (
                      <tr key={`${item.kind}-${item.id}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-600">{item.kind === 'article' ? 'Artigo' : 'Podcast'}</td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                          <p className="mt-1 text-xs text-gray-500">Por {item.author}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 capitalize">{item.category}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(item.status)}`}>{item.status}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{new Date(item.updatedAt).toLocaleDateString('pt-BR')}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-3">
                            <button type="button" onClick={() => handleRestore(item)} className="inline-flex items-center gap-1 text-sm font-medium text-green-600 transition hover:text-green-700">
                              <RotateCcw className="h-4 w-4" />
                              Restaurar
                            </button>
                            <button type="button" onClick={() => handlePermanentDelete(item)} className="inline-flex items-center gap-1 text-sm font-medium text-[#991B1B] transition hover:text-[#7F1D1D]">
                              <Trash className="h-4 w-4" />
                              Deletar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {showEmptyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-md rounded-lg bg-white p-8 shadow-lg">
            <div className="mb-4 flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-[#991B1B]" />
              <h2 className="text-xl font-bold text-gray-900">Esvaziar lixo</h2>
            </div>
            <p className="mb-2 text-gray-600">Confirma a exclusão permanente de todos os {deletedItems.length} itens?</p>
            <p className="mb-6 text-sm font-semibold text-[#991B1B]">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowEmptyModal(false)} className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-900 transition hover:bg-gray-50">Cancelar</button>
              <button type="button" onClick={handleEmptyTrash} className="flex-1 rounded-lg bg-[#111111] px-4 py-2 font-semibold text-white transition hover:bg-[#2a2a2a]">Deletar tudo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
