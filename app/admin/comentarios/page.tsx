'use client';

import { MessageCircle, Trash2 } from 'lucide-react';
import AdminSidebar from '@/app/components/AdminSidebar';
import { useArticles } from '@/app/hooks/useArticles';
import { useComments } from '@/app/hooks/useComments';

export default function AdminCommentsPage() {
  const { articles, isLoaded: articlesLoaded } = useArticles();
  const { allComments, deleteComment, isLoaded: commentsLoaded } = useComments();

  const isLoaded = articlesLoaded && commentsLoaded;
  const titleByArticleId = new Map(articles.map((article) => [article.id, article.title]));

  if (!isLoaded) {
    return <div className="p-6 text-sm text-gray-600">Carregando comentários...</div>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 md:flex-row">
      <AdminSidebar />

      <main className="flex-1 overflow-auto">
        <div className="sticky top-0 z-20 border-b border-gray-200 bg-white">
          <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Comentários</h1>
              <p className="mt-1 text-sm text-gray-600">Todos os comentários recebidos no portal.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#991B1B]/10 px-4 py-2 text-sm font-semibold text-[#991B1B]">
              <MessageCircle className="h-4 w-4" />
              {allComments.length} comentário(s)
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          {allComments.length === 0 ? (
            <div className="rounded-lg bg-white p-10 text-center shadow-sm">
              <MessageCircle className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p className="text-sm text-gray-600">Nenhum comentário recebido até agora.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {allComments.map((comment) => (
                <div key={comment.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{comment.author}</p>
                      <p className="text-xs text-gray-500">{comment.date}</p>
                      {comment.location && <p className="mt-1 text-xs text-gray-500">{comment.location}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteComment(comment.articleId, comment.id)}
                      className="inline-flex items-center gap-1 rounded border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-700 transition hover:bg-red-100"
                    >
                      <Trash2 className="h-3 w-3" />
                      Excluir
                    </button>
                  </div>

                  <p className="mt-2 text-sm leading-relaxed text-gray-700">{comment.text}</p>

                  {comment.replies.length > 0 && (
                    <div className="mt-3 space-y-2 border-l-2 border-gray-200 pl-3">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="rounded-md bg-gray-50 p-2">
                          <p className="text-xs font-semibold text-gray-900">{reply.author}</p>
                          <p className="text-[11px] text-gray-500">{reply.date}</p>
                          <p className="mt-1 text-sm text-gray-700">{reply.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-500">
                    Matéria: <span className="font-medium text-gray-700">{titleByArticleId.get(comment.articleId) ?? 'Matéria indisponível'}</span> • Curtidas: {comment.likes}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
