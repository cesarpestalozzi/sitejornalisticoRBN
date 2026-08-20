import { useEffect, useMemo, useState } from 'react';

const COMMENTS_KEY_PREFIX = 'pznews-comments-';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_TABLE = 'pz_news_comments';

export type CommentReply = {
  id: string;
  author: string;
  text: string;
  date: string;
  createdAt: string;
};

export type ArticleComment = {
  id: string;
  articleId: string;
  author: string;
  text: string;
  date: string;
  createdAt: string;
  location?: string;
  likes: number;
  replies: CommentReply[];
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

function normalizeReply(reply: unknown): CommentReply | null {
  if (!reply || typeof reply !== 'object') {
    return null;
  }

  const candidate = reply as Partial<CommentReply>;
  const author = typeof candidate.author === 'string' ? candidate.author.trim() : '';
  const text = typeof candidate.text === 'string' ? candidate.text.trim() : '';
  const createdAt = typeof candidate.createdAt === 'string' && candidate.createdAt.trim() ? candidate.createdAt : new Date().toISOString();

  if (!author || !text) {
    return null;
  }

  return {
    id: typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id : `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    author,
    text,
    date: typeof candidate.date === 'string' && candidate.date.trim() ? candidate.date : new Date(createdAt).toLocaleDateString('pt-BR'),
    createdAt,
  };
}

function normalizeComment(raw: unknown): ArticleComment | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const candidate = raw as Partial<ArticleComment>;
  const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
  const articleId = typeof candidate.articleId === 'string' ? candidate.articleId.trim() : '';
  const author = typeof candidate.author === 'string' ? candidate.author.trim() : '';
  const text = typeof candidate.text === 'string' ? candidate.text.trim() : '';
  const createdAt = typeof candidate.createdAt === 'string' && candidate.createdAt.trim() ? candidate.createdAt : new Date().toISOString();

  if (!id || !articleId || !author || !text) {
    return null;
  }

  const replies = Array.isArray(candidate.replies)
    ? candidate.replies.map(normalizeReply).filter((reply): reply is CommentReply => reply !== null)
    : [];

  return {
    id,
    articleId,
    author,
    text,
    date: typeof candidate.date === 'string' && candidate.date.trim() ? candidate.date : new Date(createdAt).toLocaleDateString('pt-BR'),
    createdAt,
    location: typeof candidate.location === 'string' ? candidate.location : '',
    likes: typeof candidate.likes === 'number' && Number.isFinite(candidate.likes) ? candidate.likes : 0,
    replies,
  };
}

function groupByArticle(comments: ArticleComment[]) {
  return comments.reduce<Record<string, ArticleComment[]>>((acc, comment) => {
    const list = acc[comment.articleId] ?? [];
    list.push(comment);
    acc[comment.articleId] = list;
    return acc;
  }, {});
}

function readLocalCommentsMap() {
  if (typeof window === 'undefined') {
    return {};
  }

  const comments: ArticleComment[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key || !key.startsWith(COMMENTS_KEY_PREFIX)) {
      continue;
    }

    const raw = window.localStorage.getItem(key);
    if (!raw) {
      continue;
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        continue;
      }

      parsed.forEach((item) => {
        const normalized = normalizeComment(item);
        if (normalized) {
          comments.push(normalized);
        }
      });
    } catch (error) {
      console.error('Erro ao carregar comentários locais:', error);
    }
  }

  return groupByArticle(comments);
}

function persistLocalCommentsMap(commentsByArticle: Record<string, ArticleComment[]>) {
  if (typeof window === 'undefined') {
    return;
  }

  const keysToRemove: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key && key.startsWith(COMMENTS_KEY_PREFIX)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => window.localStorage.removeItem(key));

  Object.entries(commentsByArticle).forEach(([articleId, comments]) => {
    if (!comments || comments.length === 0) {
      return;
    }
    window.localStorage.setItem(`${COMMENTS_KEY_PREFIX}${articleId}`, JSON.stringify(comments));
  });
}

async function readRemoteComments() {
  if (!hasSupabaseConfig()) {
    return null;
  }

  try {
    const response = await fetch('/api/comments', { method: 'GET', headers: { Accept: 'application/json' } });
    if (response.ok) {
      const rows = (await response.json()) as SupabaseCommentRow[];
      const comments = rows
        .map((row) => normalizeComment(row?.payload))
        .filter((comment): comment is ArticleComment => comment !== null);
      return groupByArticle(comments);
    }
  } catch (error) {
    console.warn('API interna de comentários indisponível; tentando Supabase direto.', error);
  }

  const response = await fetch(getSupabaseEndpoint('?select=id,payload,updated_at&order=updated_at.desc'), {
    method: 'GET',
    headers: getSupabaseHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Erro ao ler comentários remotos: ${response.status}`);
  }

  const rows = (await response.json()) as SupabaseCommentRow[];
  const comments = rows
    .map((row) => normalizeComment(row?.payload))
    .filter((comment): comment is ArticleComment => comment !== null);
  return groupByArticle(comments);
}

async function upsertRemoteComment(comment: ArticleComment) {
  if (!hasSupabaseConfig()) {
    return;
  }

  try {
    const response = await fetch('/api/comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ comment }),
    });

    if (response.ok) {
      return;
    }
  } catch (error) {
    console.warn('API interna de comentários indisponível; tentando Supabase direto.', error);
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

  try {
    const response = await fetch('/api/comments', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: commentId }),
    });

    if (response.ok) {
      return;
    }
  } catch (error) {
    console.warn('API interna de comentários indisponível; tentando Supabase direto.', error);
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

export function useComments() {
  const [commentsByArticle, setCommentsByArticle] = useState<Record<string, ArticleComment[]>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let isActive = true;

    const loadComments = async () => {
      const localMap = readLocalCommentsMap();

      try {
        const remoteMap = await readRemoteComments();
        if (!isActive) {
          return;
        }

        if (remoteMap) {
          const remoteList = Object.values(remoteMap).flat();
          const localList = Object.values(localMap).flat();

          if (remoteList.length === 0 && localList.length > 0) {
            setCommentsByArticle(localMap);
            localList.forEach((comment) => {
              void upsertRemoteComment(comment).catch((error) => {
                console.error('Erro ao semear comentário local no remoto:', error);
              });
            });
          } else {
            setCommentsByArticle(remoteMap);
            persistLocalCommentsMap(remoteMap);
          }

          setIsLoaded(true);
          return;
        }
      } catch (error) {
        console.error('Erro ao carregar comentários remotos:', error);
      }

      if (!isActive) {
        return;
      }

      setCommentsByArticle(localMap);
      setIsLoaded(true);
    };

    loadComments();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    persistLocalCommentsMap(commentsByArticle);
  }, [commentsByArticle, isLoaded]);

  const allComments = useMemo(
    () =>
      Object.values(commentsByArticle)
        .flat()
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
    [commentsByArticle]
  );

  const addComment = (articleId: string, payload: { author: string; text: string; location?: string }) => {
    const author = payload.author.trim();
    const text = payload.text.trim();
    if (!articleId || !author || !text) {
      throw new Error('Comentário inválido.');
    }

    const now = new Date();
    const comment: ArticleComment = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      articleId,
      author,
      text,
      date: now.toLocaleDateString('pt-BR'),
      createdAt: now.toISOString(),
      location: payload.location?.trim() || '',
      likes: 0,
      replies: [],
    };

    setCommentsByArticle((current) => ({
      ...current,
      [articleId]: [comment, ...(current[articleId] ?? [])],
    }));

    void upsertRemoteComment(comment).catch((error) => {
      console.error('Erro ao sincronizar comentário remoto:', error);
    });
  };

  const updateComment = (articleId: string, commentId: string, updater: (comment: ArticleComment) => ArticleComment) => {
    setCommentsByArticle((current) => {
      const list = current[articleId] ?? [];
      const nextList = list.map((comment) => (comment.id === commentId ? updater(comment) : comment));
      return {
        ...current,
        [articleId]: nextList,
      };
    });
  };

  const likeComment = (articleId: string, commentId: string) => {
    let nextComment: ArticleComment | null = null;
    updateComment(articleId, commentId, (comment) => {
      const updated = { ...comment, likes: (comment.likes ?? 0) + 1 };
      nextComment = updated;
      return updated;
    });

    if (nextComment) {
      void upsertRemoteComment(nextComment).catch((error) => {
        console.error('Erro ao sincronizar curtida do comentário:', error);
      });
    }
  };

  const replyToComment = (articleId: string, commentId: string, payload: { author: string; text: string }) => {
    const author = payload.author.trim();
    const text = payload.text.trim();
    if (!author || !text) {
      throw new Error('Resposta inválida.');
    }

    let nextComment: ArticleComment | null = null;
    updateComment(articleId, commentId, (comment) => {
      const now = new Date();
      const reply: CommentReply = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        author,
        text,
        date: now.toLocaleDateString('pt-BR'),
        createdAt: now.toISOString(),
      };
      const updated = {
        ...comment,
        replies: [reply, ...(comment.replies ?? [])],
      };
      nextComment = updated;
      return updated;
    });

    if (nextComment) {
      void upsertRemoteComment(nextComment).catch((error) => {
        console.error('Erro ao sincronizar resposta do comentário:', error);
      });
    }
  };

  const deleteComment = (articleId: string, commentId: string) => {
    setCommentsByArticle((current) => {
      const list = current[articleId] ?? [];
      const nextList = list.filter((comment) => comment.id !== commentId);
      if (nextList.length === 0) {
        const { [articleId]: _removed, ...rest } = current;
        return rest;
      }
      return {
        ...current,
        [articleId]: nextList,
      };
    });

    void deleteRemoteComment(commentId).catch((error) => {
      console.error('Erro ao remover comentário remoto:', error);
    });
  };

  return {
    commentsByArticle,
    allComments,
    isLoaded,
    addComment,
    likeComment,
    replyToComment,
    deleteComment,
  };
}
