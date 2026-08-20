'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Facebook, MessageCircle, Share2, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import ArticleBodyContent from '@/app/components/ArticleBodyContent';
import Sidebar from '@/app/components/Sidebar';
import { featuredArticle as fallbackFeaturedArticle } from '@/app/data/mockData';
import { useArticles } from '@/app/hooks/useArticles';
import { useComments } from '@/app/hooks/useComments';
import { getCategoryDisplayName, normalizeCategorySlug } from '@/app/lib/categoryLabels';
import { readCurrentRbnUser, type RbnAccount } from '@/app/lib/rbnAuth';
import { formatDate } from '@/app/utils/dateUtils';

function stripHtml(content: string) {
  return content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatArticleMeta(date: Date) {
  const day = new Intl.DateTimeFormat('pt-BR', { day: 'numeric' }).format(date);
  const month = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(date);
  const year = new Intl.DateTimeFormat('pt-BR', { year: 'numeric' }).format(date);
  const time = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);

  return `${day} de ${month} de ${year} às ${time}`;
}

function formatUpdatedRelative(date: Date) {
  const diffMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));

  if (diffMinutes < 60) {
    return `há ${diffMinutes === 1 ? '1 minuto' : `${diffMinutes} minutos`}`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `há ${diffHours === 1 ? 'uma hora' : `${diffHours} horas`}`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `há ${diffDays === 1 ? 'um dia' : `${diffDays} dias`}`;
}

const OFFICIAL_SITE_URL = 'https://www.rbnbrasil.com.br';

export default function ArticlePageClient() {
  const params = useParams<{ id: string }>();
  const { articles, isLoaded, incrementArticleViews, incrementArticleShares } = useArticles();
  const { commentsByArticle, addComment, likeComment, replyToComment, deleteComment } = useComments();
  const [newComment, setNewComment] = useState('');
  const [commentError, setCommentError] = useState('');
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [currentRbnUser, setCurrentRbnUser] = useState<RbnAccount | null>(null);
  const [activeReplyCommentId, setActiveReplyCommentId] = useState<string | null>(null);
  const [replyAuthor, setReplyAuthor] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState('');
  const [shareFeedback, setShareFeedback] = useState('');

  const storedArticle = articles.find((article) => article.id === params?.id && article.status === 'publicado');
  const relatedArticles = articles
    .filter(
      (article) =>
        article.status === 'publicado' &&
        normalizeCategorySlug(article.category) === normalizeCategorySlug(storedArticle?.category) &&
        article.id !== storedArticle?.id
    )
    .slice(0, 2);

  const article = storedArticle
    ? {
        ...storedArticle,
        plainContent: stripHtml(storedArticle.content),
        image: storedArticle.image || fallbackFeaturedArticle.image,
      }
    : null;

  const isLoadingArticle = !isLoaded || (!article && params?.id);

  const mediaImages = article?.images && article.images.length > 0
    ? article.images
    : article?.image
      ? [{ id: 'cover', url: article.image, alt: article?.title || 'Imagem da matéria', caption: '', isPrimary: true }]
      : [];

  const comments = article?.id ? commentsByArticle[article.id] ?? [] : [];

  const publicationDate = article?.publishedAt ? new Date(article.publishedAt) : new Date(article?.createdAt ?? Date.now());
  const updatedDate = article?.lastUpdatedAt ? new Date(article.lastUpdatedAt) : new Date(article?.updatedAt ?? article?.createdAt ?? Date.now());
  const readingTime = article ? Math.max(1, Math.ceil((article.plainContent.split(' ').filter(Boolean).length || 0) / 200)) : fallbackFeaturedArticle.readingTime;

  const shareTitle = article?.title || fallbackFeaturedArticle.title;
  const shareText = article?.subtitle || 'Leia esta notícia no PORTAL IWP';
  const shareUrl = typeof window !== 'undefined'
    ? `${OFFICIAL_SITE_URL}/artigo/${params?.id ?? ''}`
    : '';
  const sharePreviewText = `${shareTitle} — ${shareUrl}`;

  const openShareLink = (target: 'whatsapp' | 'telegram' | 'twitter' | 'facebook' | 'linkedin' | 'email') => {
    const url = shareUrl || window.location.href;
    const shareMessage = `${shareTitle} — ${shareText}`;
    const encodedUrl = encodeURIComponent(url);
    const encodedMessage = encodeURIComponent(shareMessage);
    const encodedPreviewText = encodeURIComponent(sharePreviewText);

    const shareLinks: Record<typeof target, string> = {
      whatsapp: `https://wa.me/?text=${encodedPreviewText}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedPreviewText}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodedPreviewText}&url=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      email: `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(`${shareTitle}\n\n${shareText}\n\n${url}`)}`,
    };

    if (article?.id) {
      incrementArticleShares(article.id);
    }
    window.open(shareLinks[target], '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = async () => {
    const url = shareUrl || window.location.href;

    try {
      await navigator.clipboard.writeText(url);
      setShareFeedback('Link copiado para a área de transferência.');
    } catch {
      window.prompt('Copie o link da notícia:', url);
      setShareFeedback('Use o campo acima para copiar o link manualmente.');
    }

    if (article?.id) {
      incrementArticleShares(article.id);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl || window.location.href,
        });
        if (article?.id) {
          incrementArticleShares(article.id);
        }
        setShareFeedback('Matéria compartilhada com sucesso.');
        return;
      } catch {
        setShareFeedback('Compartilhamento cancelado.');
      }
    }

    await handleCopyLink();
  };

  const handleAddComment = () => {
    const trimmedComment = newComment.trim();

    if (!currentRbnUser) {
      setCommentError('Entre com a sua Conta RBN para comentar.');
      return;
    }

    if (!trimmedComment) {
      setCommentError('Escreva uma mensagem antes de publicar.');
      return;
    }

    if (!article?.id) {
      setCommentError('Não foi possível associar o comentário a esta matéria.');
      return;
    }

    addComment(article.id, {
      author: currentRbnUser.name,
      text: trimmedComment,
      location: '',
    });
    setNewComment('');
    setCommentError('');
    setShowCommentForm(false);
  };

  const handleDeleteComment = (commentId: string) => {
    if (!article?.id) {
      return;
    }
    deleteComment(article.id, commentId);
  };

  const handleLikeComment = (commentId: string) => {
    if (!article?.id) {
      return;
    }
    likeComment(article.id, commentId);
  };

  const handleAddReply = (commentId: string) => {
    const trimmedAuthor = replyAuthor.trim();
    const trimmedReply = replyText.trim();

    if (!trimmedAuthor) {
      setReplyError('Informe seu nome para responder.');
      return;
    }

    if (!trimmedReply) {
      setReplyError('Escreva uma resposta antes de publicar.');
      return;
    }

    if (!article?.id) {
      setReplyError('Não foi possível associar a resposta a esta matéria.');
      return;
    }

    replyToComment(article.id, commentId, { author: trimmedAuthor, text: trimmedReply });
    setReplyAuthor('');
    setReplyText('');
    setReplyError('');
    setActiveReplyCommentId(null);
  };

  useEffect(() => {
    const syncRbnUser = () => setCurrentRbnUser(readCurrentRbnUser());
    syncRbnUser();
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', syncRbnUser);
      return () => window.removeEventListener('storage', syncRbnUser);
    }
  }, []);

  useEffect(() => {
    if (!article?.id || typeof window === 'undefined') {
      return;
    }

    const viewKey = `pznews-article-view-${article.id}`;
    if (sessionStorage.getItem(viewKey)) {
      return;
    }

    sessionStorage.setItem(viewKey, '1');
    incrementArticleViews(article.id);
  }, [article?.id, incrementArticleViews]);

  if (isLoadingArticle) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-4 w-24 rounded bg-gray-200" />
          <div className="h-10 w-3/4 rounded bg-gray-200" />
          <div className="h-6 w-1/2 rounded bg-gray-200" />
          <div className="h-80 rounded-xl bg-gray-200" />
          <div className="h-4 w-full rounded bg-gray-200" />
          <div className="h-4 w-full rounded bg-gray-200" />
          <div className="h-4 w-3/4 rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#991B1B]">Notícia não encontrada</p>
        <h1 className="mb-4 text-3xl font-bold text-gray-900">Essa matéria não está disponível no momento.</h1>
        <p className="mb-8 text-gray-600">A notícia pode ter sido removida, estar em revisão ou ainda não foi publicada para o público.</p>
        <Link href="/" className="inline-flex items-center gap-2 rounded-lg bg-[#991B1B] px-5 py-3 font-semibold text-white transition hover:bg-[#7F1D1D]">
          <ArrowLeft className="h-4 w-4" />
          Voltar para a home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Link href="/" className="mb-6 inline-flex items-center gap-2 font-semibold text-[#991B1B] transition hover:text-[#7F1D1D]">
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Link>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <article>
            <div className="mb-6">
              <span className="inline-block rounded-full bg-[#991B1B]/10 px-3 py-1 text-xs font-semibold text-[#991B1B]">
                {getCategoryDisplayName(article.category)}
              </span>
            </div>

            <h1 className="mb-4 text-4xl font-bold leading-tight text-gray-900 md:text-5xl">
              {article.title}
            </h1>

            {article.subtitle && (
              <p className="mb-6 text-xl leading-relaxed text-gray-600">{article.subtitle}</p>
            )}

            <div className="flex flex-col gap-4 border-y border-gray-200 py-6 md:flex-row md:items-center md:justify-between md:gap-6">
              <div>
                <p className="font-semibold text-gray-900">{article ? article.author : fallbackFeaturedArticle.author}</p>
                <div className="text-sm text-gray-500">
                  <p>
                    Publicado em {formatArticleMeta(publicationDate)}
                    {article?.lastUpdatedAt && article.lastUpdatedAt !== article.publishedAt &&(
                      <span> - Atualizado {formatUpdatedRelative(updatedDate)}</span>
                    )}
                  </p>
                  {article?.location && <p className="mt-1">{article.location}</p>}
                </div>
              </div>
            <div className="py-2">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-gray-500">Compartilhar</p>
                {shareFeedback && <span className="text-[8px] text-emerald-700">{shareFeedback}</span>}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  aria-label="Compartilhar no Facebook"
                  onClick={() => openShareLink('facebook')}
                  className="flex h-9 items-center justify-center rounded-lg bg-[#1877F2] text-white shadow-sm transition hover:brightness-110"
                >
                  <Facebook className="h-4 w-4 fill-current" />
                </button>
                <button
                  type="button"
                  aria-label="Compartilhar no WhatsApp"
                  onClick={() => openShareLink('whatsapp')}
                  className="flex h-9 items-center justify-center rounded-lg bg-[#17BD5A] text-white shadow-sm transition hover:brightness-110"
                >
                  <MessageCircle className="h-4 w-4 fill-current" />
                </button>
                <button
                  type="button"
                  aria-label="Compartilhar por link"
                  onClick={handleShare}
                  className="flex h-9 items-center justify-center rounded-lg border border-gray-300 bg-[#F3F4F6] text-gray-800 shadow-sm transition hover:bg-gray-200"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

            {mediaImages.filter((image) => image.placement !== 'inline').length > 0 && (
              <div className="my-8 grid gap-4">
                {mediaImages.filter((image) => image.placement !== 'inline').map((image) => (
                  <figure key={image.id} className="my-8">
                    <img src={image.url} alt={image.alt || article?.title || 'Imagem da matéria'} className="block h-[420px] w-full rounded-2xl object-cover shadow-sm" />
                    {image.caption && (
                      <figcaption className="mt-2 px-1 text-sm leading-relaxed text-gray-600">
                        {image.caption}
                      </figcaption>
                    )}
                  </figure>
                ))}
              </div>
            )}

            {article?.videos && article.videos.filter((video) => video.placement !== 'inline').length > 0 && (
              <div className="my-8 space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                {article.videos.filter((video) => video.placement !== 'inline').map((video) => (
                  <div key={video.id} className="overflow-hidden rounded-xl bg-black">
                    <video controls className="w-full">
                      <source src={video.url} />
                    </video>
                  </div>
                ))}
              </div>
            )}

            <div className="mb-12 max-w-none">
              {article ? (
                <ArticleBodyContent content={article.content} images={article.images ?? []} videos={article.videos ?? []} />
              ) : (
                <p className="leading-relaxed text-gray-700">{fallbackFeaturedArticle.content}</p>
              )}
            </div>

            <div className="mt-12 border-t border-gray-200 pt-8">
              <h3 className="mb-6 text-2xl font-bold text-gray-900">Notícias relacionadas</h3>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {relatedArticles.map((relatedArticle) => (
                  <Link key={relatedArticle.id} href={`/artigo/${relatedArticle.id}`} className="group overflow-hidden rounded-lg border border-gray-200 transition hover:shadow-lg">
                    <div className="h-40 overflow-hidden bg-gray-200">
                      <img src={relatedArticle.image || fallbackFeaturedArticle.image} alt={relatedArticle.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                    </div>
                    <div className="p-4">
                      <h4 className="line-clamp-2 font-bold text-gray-900 transition group-hover:text-[#991B1B]">{relatedArticle.title}</h4>
                      <p className="mt-2 text-xs text-gray-500">{formatDate(new Date(relatedArticle.updatedAt))}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-12 border-t border-gray-200 pt-8">
              <div className="mb-6 flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-[#FF796C]" />
                <h3 className="text-lg font-bold text-gray-900 md:text-xl">Comentários ({comments.length})</h3>
              </div>

              {!showCommentForm ? (
                <button
                  onClick={() => setShowCommentForm(true)}
                  className="inline-flex items-center gap-2 rounded-md bg-[#991B1B] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#7F1D1D] focus:outline-none focus:ring-2 focus:ring-[#991B1B]/40"
                >
                  <Send className="h-3.5 w-3.5" />
                  Adicionar comentário
                </button>
              ) : (
                <div className="mb-8 rounded-xl border border-gray-200 bg-[#f9f9f9] p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-900">Adicionar comentário</p>
                    <button
                      onClick={() => {
                        setShowCommentForm(false);
                        setCommentError('');
                      }}
                      className="text-sm font-semibold text-gray-600 transition hover:text-gray-900"
                    >
                      Fechar
                    </button>
                  </div>

                  {!currentRbnUser ? (
                    <div className="rounded-xl border border-[#991B1B]/15 bg-[#fff9f8] p-4">
                      <p className="text-sm font-semibold text-gray-900">Entre com a sua Conta RBN para comentar.</p>
                      <p className="mt-2 text-sm text-gray-600">Faça login ou crie sua conta antes de participar da conversa.</p>
                      <Link
                        href="/conta-rbn"
                        className="mt-4 inline-flex items-center justify-center rounded-full bg-[#991B1B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#7F1D1D]"
                      >
                        Entrar com Conta RBN
                      </Link>
                    </div>
                  ) : (
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                      <p className="text-sm font-medium text-green-800">Conectado como <span className="font-bold">{currentRbnUser.name}</span></p>
                    </div>
                  )}

                  {currentRbnUser && (
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          handleAddComment();
                        }
                      }}
                      placeholder="Escreva seu comentário aqui..."
                      rows={4}
                      className="mt-4 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-500 focus:border-[#111111] focus:outline-none"
                    />
                  )}

                  {commentError && <p className="mt-3 text-sm text-[#991B1B]">{commentError}</p>}

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={handleAddComment}
                      className="inline-flex items-center gap-2 rounded-md bg-[#991B1B] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#7F1D1D] focus:outline-none focus:ring-2 focus:ring-[#991B1B]/40"
                    >
                      <Send className="h-4 w-4" />
                      Publicar
                    </button>
                    <button
                      onClick={() => {
                        setShowCommentForm(false);
                        setCommentError('');
                      }}
                      className="rounded-lg border border-gray-300 bg-white px-6 py-2 text-gray-700 font-semibold transition hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-8 space-y-4">
                {comments.length > 0 ? (
                  comments.map((comment) => (
                    <div key={comment.id} className="rounded-lg border border-gray-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900">{comment.author}</p>
                          <p className="text-xs text-gray-500">{comment.date}</p>
                          {comment.location && <p className="mt-1 text-[11px] text-gray-500">{comment.location}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(comment.id)}
                          className="rounded border border-[#991B1B]/20 px-2 py-1 text-[10px] font-semibold text-[#991B1B] transition hover:bg-[#991B1B]/5"
                        >
                          Excluir
                        </button>
                      </div>
                      <p className="mt-2 text-gray-700">{comment.text}</p>
                      <div className="mt-3 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleLikeComment(comment.id)}
                          className="text-xs font-semibold text-gray-600 transition hover:text-[#991B1B]"
                        >
                          Curtir ({comment.likes ?? 0})
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveReplyCommentId((current) => (current === comment.id ? null : comment.id));
                            setReplyError('');
                          }}
                          className="text-xs font-semibold text-gray-600 transition hover:text-[#991B1B]"
                        >
                          Responder
                        </button>
                      </div>

                      {activeReplyCommentId === comment.id && (
                        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                          <input
                            type="text"
                            value={replyAuthor}
                            onChange={(event) => setReplyAuthor(event.target.value)}
                            placeholder="Seu nome"
                            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#111111] focus:outline-none"
                          />
                          <textarea
                            value={replyText}
                            onChange={(event) => setReplyText(event.target.value)}
                            rows={2}
                            placeholder="Escreva sua resposta..."
                            className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#111111] focus:outline-none"
                          />
                          {replyError && <p className="mt-2 text-xs text-[#991B1B]">{replyError}</p>}
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleAddReply(comment.id)}
                              className="rounded-md bg-[#111111] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-black"
                            >
                              Publicar resposta
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveReplyCommentId(null);
                                setReplyError('');
                              }}
                              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-100"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}

                      {comment.replies && comment.replies.length > 0 && (
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
                    </div>
                  ))
                ) : (
                  <p className="text-gray-600">Nenhum comentário ainda. Seja o primeiro a comentar!</p>
                )}
              </div>
            </div>
          </article>
        </div>

        <div className="lg:col-span-1">
          <Sidebar />
        </div>
      </div>
    </div>
  );
}
