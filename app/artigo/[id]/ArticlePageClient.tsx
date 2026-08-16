'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, MessageCircle, Share2, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import ArticleBodyContent from '@/app/components/ArticleBodyContent';
import Sidebar from '@/app/components/Sidebar';
import { featuredArticle as fallbackFeaturedArticle } from '@/app/data/mockData';
import { useArticles } from '@/app/hooks/useArticles';
import { getCategoryDisplayName, normalizeCategorySlug } from '@/app/lib/categoryLabels';
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

const OFFICIAL_SITE_URL = 'https://pz-news-xi.vercel.app';
const COMMENTS_KEY_PREFIX = 'pznews-comments-';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_TABLE = 'pz_news_comments';

type ArticleComment = {
  id: string;
  articleId: string;
  author: string;
  text: string;
  date: string;
  location?: string;
};

type SupabaseCommentRow = {
  id: string;
  payload: ArticleComment;
  updated_at?: string;
};

function hasSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function getSupabaseEndpoint(query = '') {
  return `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}${query}`;
}

function getSupabaseHeaders() {
  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY as string,
    'Content-Type': 'application/json',
  };

  const key = SUPABASE_ANON_KEY as string;
  if (key.startsWith('eyJ')) {
    headers.Authorization = `Bearer ${key}`;
  }

  return headers;
}

function readLocalComments(articleId: string): ArticleComment[] {
  const storedComments = localStorage.getItem(`${COMMENTS_KEY_PREFIX}${articleId}`);
  if (!storedComments) {
    return [];
  }

  try {
    const parsed = JSON.parse(storedComments) as ArticleComment[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function readRemoteComments(articleId: string) {
  if (!hasSupabaseConfig()) {
    return null;
  }

  const response = await fetch(
    getSupabaseEndpoint(`?select=id,payload,updated_at&payload->>articleId=eq.${encodeURIComponent(articleId)}&order=updated_at.desc`),
    {
      method: 'GET',
      headers: getSupabaseHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error(`Erro ao ler comentários remotos: ${response.status}`);
  }

  const rows = (await response.json()) as SupabaseCommentRow[];
  return rows
    .filter((row) => row && row.payload && row.payload.articleId === articleId)
    .map((row) => row.payload);
}

async function upsertRemoteComment(comment: ArticleComment) {
  if (!hasSupabaseConfig()) {
    return;
  }

  const response = await fetch(getSupabaseEndpoint('?on_conflict=id'), {
    method: 'POST',
    headers: {
      ...getSupabaseHeaders(),
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify([
      {
        id: comment.id,
        payload: comment,
        updated_at: new Date().toISOString(),
      },
    ]),
  });

  if (!response.ok) {
    throw new Error(`Erro ao salvar comentário remoto: ${response.status}`);
  }
}

async function deleteRemoteComment(commentId: string) {
  if (!hasSupabaseConfig()) {
    return;
  }

  const response = await fetch(getSupabaseEndpoint(`?id=eq.${encodeURIComponent(commentId)}`), {
    method: 'DELETE',
    headers: {
      ...getSupabaseHeaders(),
      Prefer: 'return=minimal',
    },
  });

  if (!response.ok) {
    throw new Error(`Erro ao excluir comentário remoto: ${response.status}`);
  }
}

export default function ArticlePageClient() {
  const params = useParams<{ id: string }>();
  const { articles, incrementArticleViews, incrementArticleShares } = useArticles();
  const [comments, setComments] = useState<ArticleComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('');
  const [commentLocation, setCommentLocation] = useState('');
  const [commentLocationEnabled, setCommentLocationEnabled] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
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

  const mediaImages = article?.images && article.images.length > 0
    ? article.images
    : article?.image
      ? [{ id: 'cover', url: article.image, alt: article?.title || 'Imagem da matéria', caption: '', isPrimary: true }]
      : [];

  const publicationDate = article?.publishedAt ? new Date(article.publishedAt) : new Date(article?.createdAt ?? Date.now());
  const updatedDate = article?.lastUpdatedAt ? new Date(article.lastUpdatedAt) : new Date(article?.updatedAt ?? article?.createdAt ?? Date.now());
  const readingTime = article ? Math.max(1, Math.ceil((article.plainContent.split(' ').filter(Boolean).length || 0) / 200)) : fallbackFeaturedArticle.readingTime;

  const shareTitle = article?.title || fallbackFeaturedArticle.title;
  const shareText = article?.subtitle || 'Leia esta notícia no PORTAL IWP';
  const shareUrl = typeof window !== 'undefined'
    ? `${OFFICIAL_SITE_URL}/artigo/${params?.id ?? ''}`
    : '';

  const openShareLink = (target: 'whatsapp' | 'telegram' | 'twitter' | 'facebook' | 'linkedin' | 'email') => {
    const url = shareUrl || window.location.href;
    const shareMessage = `${shareTitle} — ${shareText}`;
    const encodedUrl = encodeURIComponent(url);
    const encodedMessage = encodeURIComponent(shareMessage);

    const shareLinks: Record<typeof target, string> = {
      whatsapp: `https://wa.me/?text=${encodedMessage}%20${encodedUrl}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedMessage}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodedMessage}&url=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      email: `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(`${shareMessage}\n\n${url}`)}`,
    };

    if (article?.id) {
      incrementArticleShares(article.id);
    }
    window.open(shareLinks[target], '_blank', 'noopener,noreferrer');
    setShowShareOptions(false);
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
    setShowShareOptions(false);
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

    setShowShareOptions((current) => !current);
  };

  const handleAddComment = () => {
    const trimmedComment = newComment.trim();
    const trimmedAuthor = commentAuthor.trim();

    if (!trimmedAuthor) {
      setCommentError('Informe seu nome para publicar o comentário.');
      return;
    }

    if (!trimmedComment) {
      setCommentError('Escreva uma mensagem antes de publicar.');
      return;
    }

    const comment = {
      id: Date.now().toString(),
      articleId: article?.id ?? '',
      author: trimmedAuthor,
      text: trimmedComment,
      date: new Date().toLocaleDateString('pt-BR'),
      location: commentLocationEnabled ? (commentLocation || 'Localização ativada') : '',
    };

    setComments((prev) => [comment, ...prev]);
    void upsertRemoteComment(comment).catch((error) => {
      console.error('Erro ao sincronizar comentário remoto:', error);
    });
    setNewComment('');
    setCommentAuthor('');
    setCommentLocation('');
    setCommentLocationEnabled(false);
    setCommentError('');
    setShowCommentForm(false);
  };

  const handleDeleteComment = (commentId: string) => {
    setComments((prev) => prev.filter((comment) => comment.id !== commentId));
    void deleteRemoteComment(commentId).catch((error) => {
      console.error('Erro ao remover comentário remoto:', error);
    });
  };

  const handleToggleLocation = () => {
    if (commentLocationEnabled) {
      setCommentLocationEnabled(false);
      setCommentLocation('');
      return;
    }

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCommentLocation(`Localização ativada • ${position.coords.latitude.toFixed(2)}, ${position.coords.longitude.toFixed(2)}`);
          setCommentLocationEnabled(true);
        },
        () => {
          setCommentLocation('Localização ativada');
          setCommentLocationEnabled(true);
        },
        { enableHighAccuracy: false, timeout: 8000 }
      );
      return;
    }

    setCommentLocation('Localização ativada');
    setCommentLocationEnabled(true);
  };

  useEffect(() => {
    if (!article?.id || typeof window === 'undefined') {
      return;
    }

    let isActive = true;
    const articleId = article.id;

    const loadComments = async () => {
      const localComments = readLocalComments(articleId);

      try {
        const remoteComments = await readRemoteComments(articleId);
        if (!isActive) {
          return;
        }

        if (remoteComments) {
          if (remoteComments.length === 0 && localComments.length > 0) {
            setComments(localComments);
            localComments.forEach((comment) => {
              void upsertRemoteComment(comment).catch((error) => {
                console.error('Erro ao semear comentário local no remoto:', error);
              });
            });
          } else {
            setComments(remoteComments);
          }
          return;
        }
      } catch (error) {
        console.error('Erro ao carregar comentários remotos:', error);
      }

      if (!isActive) {
        return;
      }

      setComments(localComments);
    };

    loadComments();

    return () => {
      isActive = false;
    };
  }, [article?.id]);

  useEffect(() => {
    if (!article?.id || typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(`${COMMENTS_KEY_PREFIX}${article.id}`, JSON.stringify(comments));
  }, [article?.id, comments]);

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
                {getCategoryDisplayName(article?.category ?? fallbackFeaturedArticle.category)}
              </span>
            </div>

            <h1 className="mb-4 text-4xl font-bold leading-tight text-gray-900 md:text-5xl">
              {article ? article.title : fallbackFeaturedArticle.title}
            </h1>

            {(article?.subtitle || fallbackFeaturedArticle.subtitle) && (
              <p className="mb-6 text-xl leading-relaxed text-gray-600">{article?.subtitle || fallbackFeaturedArticle.subtitle}</p>
            )}

            <div className="flex flex-col gap-4 border-y border-gray-200 py-6 md:flex-row md:items-center md:gap-6">
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
              <div className="flex gap-6 text-sm text-gray-600">
                <span>{readingTime} min de leitura</span>
              </div>
            </div>
            {mediaImages.length > 0 && (
              <div className="my-8 grid gap-4">
                {mediaImages.map((image) => (
                  <div key={image.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-[#f8f8f8] shadow-sm">
                    <img src={image.url} alt={image.alt || article?.title || 'Imagem da matéria'} className="h-[420px] w-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            {article?.videos && article.videos.length > 0 && (
              <div className="my-8 space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                {article.videos.map((video) => (
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
                <ArticleBodyContent content={article.content} />
              ) : (
                <p className="leading-relaxed text-gray-700">{fallbackFeaturedArticle.content}</p>
              )}
            </div>

            <div className="border-t border-gray-200 py-6">
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={handleShare} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-100 px-4 py-2.5 font-semibold text-gray-700 shadow-sm transition hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300/60">
                  <Share2 className="h-5 w-5" />
                  Compartilhar
                </button>
              </div>

              {showShareOptions && (
                <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-900">Compartilhar esta matéria</p>
                    <button type="button" onClick={() => setShowShareOptions(false)} className="text-sm font-semibold text-[#991B1B] transition hover:text-[#7F1D1D]">
                      Fechar
                    </button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <button type="button" onClick={() => openShareLink('whatsapp')} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm font-semibold text-gray-700 transition hover:border-[#991B1B] hover:text-[#991B1B]">
                      WhatsApp
                    </button>
                    <button type="button" onClick={() => openShareLink('telegram')} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm font-semibold text-gray-700 transition hover:border-[#991B1B] hover:text-[#991B1B]">
                      Telegram
                    </button>
                    <button type="button" onClick={() => openShareLink('twitter')} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm font-semibold text-gray-700 transition hover:border-[#991B1B] hover:text-[#991B1B]">
                      X / Twitter
                    </button>
                    <button type="button" onClick={() => openShareLink('facebook')} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm font-semibold text-gray-700 transition hover:border-[#991B1B] hover:text-[#991B1B]">
                      Facebook
                    </button>
                    <button type="button" onClick={() => openShareLink('linkedin')} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm font-semibold text-gray-700 transition hover:border-[#991B1B] hover:text-[#991B1B]">
                      LinkedIn
                    </button>
                    <button type="button" onClick={() => openShareLink('email')} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm font-semibold text-gray-700 transition hover:border-[#991B1B] hover:text-[#991B1B]">
                      E-mail
                    </button>
                    <button type="button" onClick={handleCopyLink} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm font-semibold text-gray-700 transition hover:border-[#991B1B] hover:text-[#991B1B]">
                      Copiar link
                    </button>
                  </div>
                  {shareFeedback && <p className="mt-3 text-sm text-green-700">{shareFeedback}</p>}
                </div>
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
                <MessageCircle className="h-6 w-6 text-[#FF796C]" />
                <h3 className="text-2xl font-bold text-gray-900">Comentários ({comments.length})</h3>
              </div>

              {!showCommentForm ? (
                <button
                  onClick={() => setShowCommentForm(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-100 px-6 py-3 font-semibold text-gray-700 shadow-sm transition hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300/60"
                >
                  <Send className="h-5 w-5" />
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

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-gray-700">Seu nome *</label>
                      <input
                        type="text"
                        value={commentAuthor}
                        onChange={(e) => setCommentAuthor(e.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            handleAddComment();
                          }
                        }}
                        placeholder="Digite seu nome"
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-500 focus:border-[#111111] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        checked={commentLocationEnabled}
                        onChange={handleToggleLocation}
                        className="h-4 w-4 rounded border-gray-300 text-[#111111] focus:ring-[#111111]"
                      />
                      Ativar localização
                    </label>
                    {commentLocation && <p className="mt-2 text-xs text-gray-600">{commentLocation}</p>}
                  </div>

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

                  {commentError && <p className="mt-3 text-sm text-[#991B1B]">{commentError}</p>}

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={handleAddComment}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-100 px-6 py-2 font-semibold text-gray-700 shadow-sm transition hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300/60"
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
                          className="text-xs font-semibold text-[#991B1B] transition hover:text-[#7F1D1D]"
                        >
                          Excluir
                        </button>
                      </div>
                      <p className="mt-2 text-gray-700">{comment.text}</p>
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
