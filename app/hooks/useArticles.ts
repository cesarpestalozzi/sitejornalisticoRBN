import { useEffect, useRef, useState } from 'react';
import {
  canCreateArticle,
  canDeleteArticle,
  canEditArticle,
  canManageTrash,
  canPublishArticle,
  canViewAllArticles,
  getCurrentAdminUser,
} from '@/app/lib/adminPermissions';
import { hasSupabaseConfig, supabase } from '@/app/lib/supabase';

export interface ArticleImage {
  id: string;
  url: string;
  alt: string;
  caption: string;
  isPrimary: boolean;
  name?: string;
  placement?: 'gallery' | 'inline';
}

export interface ArticleVideo {
  id: string;
  url: string;
  title: string;
  caption: string;
  name?: string;
  type?: 'upload' | 'external' | 'microsoft-stream';
  embedUrl?: string;
  placement?: 'gallery' | 'inline';
}

export interface Article {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  author: string;
  content: string;
  excerpt: string;
  image?: string;
  images?: ArticleImage[];
  videos?: ArticleVideo[];
  featured: boolean;
  status: 'rascunho' | 'agendado' | 'publicado';
  scheduledDate?: string;
  scheduledTime?: string;
  location?: string;
  notificationEnabled?: boolean;
  notificationRecipients?: Array<{ id: string; name: string; email: string; createdAt?: string }>;
  notificationSentAt?: string;
  publishedAt?: string;
  lastUpdatedAt?: string;
  podcastId?: string;
  createdAt: string;
  updatedAt: string;
  views: number;
  shares: number;
}

const ARTICLES_KEY = 'pz_news_articles';
const DELETED_ARTICLES_KEY = 'pz_news_deleted_articles';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_TABLE = 'pz_news_articles';

type SupabaseArticleRow = {
  id: string;
  payload: Article;
  deleted: boolean;
  updated_at?: string;
};

function getSupabaseEndpoint(query = '') {
  return `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}${query}`;
}

function getSupabaseHeaders() {
  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY as string,
    'Content-Type': 'application/json',
  };

  const key = SUPABASE_ANON_KEY as string;
  // Chaves legadas anon são JWT (eyJ...) e exigem Authorization Bearer.
  // Chaves novas sb_publishable_* funcionam apenas com apikey.
  if (key.startsWith('eyJ')) {
    headers.Authorization = `Bearer ${key}`;
  }

  return headers;
}

function isSupabaseRlsViolation(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const message = 'message' in error ? String((error as { message?: string }).message ?? '') : '';
  const code = 'code' in error ? String((error as { code?: string }).code ?? '') : '';
  return code === '42501' || message.toLowerCase().includes('row-level security') || message.toLowerCase().includes('violates row-level security');
}

function warnSupabaseWriteIssue(context: string, error: unknown) {
  if (isSupabaseRlsViolation(error)) {
    console.warn(`[Supabase sync] ${context}: escrita bloqueada por RLS; mantendo estado local apenas.`);
    return;
  }

  console.error(`[Supabase sync] ${context}:`, error);
}

async function normalizeRemoteRows(rows: SupabaseArticleRow[]) {
  const active: Article[] = [];
  const deleted: Article[] = [];

  rows.forEach((row) => {
    if (!row || typeof row !== 'object' || !row.payload) {
      return;
    }

    const normalized = normalizeArticle(row.payload);
    if (isLegacyMockArticle(normalized)) {
      return;
    }
    if (row.deleted) {
      deleted.push(normalized);
    } else {
      active.push(normalized);
    }
  });

  return { active, deleted };
}

async function readRemoteArticles() {
  if (!hasSupabaseConfig && typeof window === 'undefined') {
    return null;
  }

  try {
    const response = await fetch('/api/articles', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (response.ok) {
      const rows = (await response.json()) as SupabaseArticleRow[];
      return normalizeRemoteRows(rows);
    }
  } catch (error) {
    console.warn('API interna de artigos indisponível; tentando Supabase direto.', error);
  }

  if (!hasSupabaseConfig) {
    return null;
  }

  if (supabase) {
    const { data, error } = await supabase
      .from('pz_news_articles')
      .select('id, payload, deleted, updated_at')
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Erro ao ler artigos remotos: ${error.message}`);
    }

    return normalizeRemoteRows((data ?? []) as SupabaseArticleRow[]);
  }

  const response = await fetch(
    getSupabaseEndpoint('?select=id,payload,deleted,updated_at&order=updated_at.desc'),
    {
      method: 'GET',
      headers: getSupabaseHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error(`Erro ao ler artigos remotos: ${response.status}`);
  }

  const rows = (await response.json()) as SupabaseArticleRow[];
  return normalizeRemoteRows(rows);
}

async function upsertRemoteArticle(article: Article, deleted: boolean) {
  if (!hasSupabaseConfig && typeof window === 'undefined') {
    return;
  }

  try {
    const response = await fetch('/api/articles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      body: JSON.stringify({ article, deleted }),
    });

    if (response.ok) {
      return;
    }

    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    const message = payload.error ?? `HTTP ${response.status}`;
    throw new Error(message);
  } catch (error) {
    if (hasSupabaseConfig && supabase) {
      const { error: supabaseError } = await supabase.from(SUPABASE_TABLE).upsert(
        [
          {
            id: article.id,
            payload: article,
            deleted,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: 'id' }
      );

      if (supabaseError) {
        if (isSupabaseRlsViolation(supabaseError)) {
          warnSupabaseWriteIssue('salvar artigo remoto', supabaseError);
          return;
        }

        throw new Error(`Erro ao salvar artigo remoto: ${supabaseError.message}`);
      }

      return;
    }

    if (error instanceof Error && isSupabaseRlsViolation(error)) {
      warnSupabaseWriteIssue('salvar artigo remoto', error);
      return;
    }

    throw error;
  }
}

async function deleteRemoteArticleById(id: string) {
  if (!hasSupabaseConfig && typeof window === 'undefined') {
    return;
  }

  try {
    const response = await fetch(`/api/articles?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      cache: 'no-store',
    });
    if (response.ok) {
      return;
    }

    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    const message = payload.error ?? `HTTP ${response.status}`;
    throw new Error(message);
  } catch (error) {
    if (hasSupabaseConfig && supabase) {
      const { error: supabaseError } = await supabase.from(SUPABASE_TABLE).delete().eq('id', id);
      if (supabaseError) {
        if (isSupabaseRlsViolation(supabaseError)) {
          warnSupabaseWriteIssue('apagar artigo remoto', supabaseError);
          return;
        }

        throw new Error(`Erro ao apagar artigo remoto: ${supabaseError.message}`);
      }
      return;
    }

    throw error;
  }
}

async function deleteRemoteTrash() {
  if (!hasSupabaseConfig && typeof window === 'undefined') {
    return;
  }

  try {
    const response = await fetch('/api/articles?trash=true', {
      method: 'DELETE',
      cache: 'no-store',
    });
    if (response.ok) {
      return;
    }

    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    const message = payload.error ?? `HTTP ${response.status}`;
    throw new Error(message);
  } catch (error) {
    if (hasSupabaseConfig && supabase) {
      const { error: supabaseError } = await supabase.from(SUPABASE_TABLE).delete().eq('deleted', true);
      if (supabaseError) {
        if (isSupabaseRlsViolation(supabaseError)) {
          warnSupabaseWriteIssue('limpar lixeira remota', supabaseError);
          return;
        }

        throw new Error(`Erro ao limpar lixeira remota: ${supabaseError.message}`);
      }
      return;
    }

    throw error;
  }
}

function normalizeImages(images?: unknown): ArticleImage[] {
  if (!Array.isArray(images)) {
    return [];
  }

  return images.map((item, index) => {
    if (typeof item === 'string') {
      return {
        id: `${index}-${Date.now()}`,
        url: item,
        alt: 'Imagem da matéria',
        caption: '',
        isPrimary: index === 0,
        name: 'Imagem',
        placement: 'gallery',
      };
    }

    if (typeof item === 'object' && item !== null) {
      const candidate = item as Partial<ArticleImage>;
      return {
        id: candidate.id ?? `${index}-${Date.now()}`,
        url: candidate.url ?? '',
        alt: candidate.alt ?? 'Imagem da matéria',
        caption: candidate.caption ?? '',
        isPrimary: Boolean(candidate.isPrimary) || index === 0,
        name: candidate.name ?? 'Imagem',
        placement: candidate.placement ?? 'gallery',
      };
    }

    return {
      id: `${index}-${Date.now()}`,
      url: '',
      alt: 'Imagem da matéria',
      caption: '',
      isPrimary: index === 0,
      name: 'Imagem',
      placement: 'gallery',
    };
  });
}

function normalizeVideos(videos?: unknown): ArticleVideo[] {
  if (!Array.isArray(videos)) {
    return [];
  }

  return videos.map((item, index) => {
    if (typeof item === 'string') {
      return {
        id: `${index}-${Date.now()}`,
        url: item,
        title: 'Vídeo',
        caption: '',
        name: 'Vídeo',
        placement: 'gallery',
      };
    }

    if (typeof item === 'object' && item !== null) {
      const candidate = item as Partial<ArticleVideo>;
      return {
        id: candidate.id ?? `${index}-${Date.now()}`,
        url: candidate.url ?? '',
        title: candidate.title ?? 'Vídeo',
        caption: candidate.caption ?? '',
        name: candidate.name ?? 'Vídeo',
        type: candidate.type ?? 'external',
        embedUrl: candidate.embedUrl ?? '',
        placement: candidate.placement ?? 'gallery',
      };
    }

    return {
      id: `${index}-${Date.now()}`,
      url: '',
      title: 'Vídeo',
      caption: '',
      name: 'Vídeo',
    };
  });
}

function normalizeArticle(article: Article): Article {
  const normalizedImages = normalizeImages(article.images as unknown);
  const normalizedVideos = normalizeVideos(article.videos as unknown);
  const primaryImage = article.image || normalizedImages.find((image) => image.isPrimary)?.url || normalizedImages[0]?.url || '';
  const views = typeof article.views === 'number' && Number.isFinite(article.views) ? article.views : 0;
  const shares = typeof article.shares === 'number' && Number.isFinite(article.shares) ? article.shares : 0;

  return {
    ...article,
    image: primaryImage,
    images: normalizedImages,
    videos: normalizedVideos,
    views,
    shares,
  };
}

function getScheduledPublishTimeMs(article: Pick<Article, 'scheduledDate' | 'scheduledTime'>) {
  if (!article.scheduledDate || !article.scheduledTime) {
    return null;
  }

  const normalizedTime = article.scheduledTime.length === 5 ? `${article.scheduledTime}:00` : article.scheduledTime;
  const scheduledDate = new Date(`${article.scheduledDate}T${normalizedTime}`);

  if (Number.isNaN(scheduledDate.getTime())) {
    return null;
  }

  return scheduledDate.getTime();
}

function syncLocalStorageSnapshot(nextArticles: Article[], nextDeletedArticles: Article[]) {
  if (typeof window === 'undefined') {
    return;
  }

  const active = nextArticles.filter((article) => !isLegacyMockArticle(article));
  const deleted = nextDeletedArticles.filter((article) => !isLegacyMockArticle(article));

  localStorage.setItem(ARTICLES_KEY, JSON.stringify(active));
  localStorage.setItem(DELETED_ARTICLES_KEY, JSON.stringify(deleted));

  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('pznews-article-view-')) {
      localStorage.removeItem(key);
    }
  }
}

function maybeSendBrowserNotification(article: Pick<Article, 'id' | 'title' | 'status'>) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  const notificationsEnabled = localStorage.getItem('pz_news_notifications_enabled') === 'true';
  if (!notificationsEnabled || Notification.permission !== 'granted') {
    return;
  }

  if (article.status !== 'publicado') {
    return;
  }

  const lastNotificationKey = `pz_news_last_notified_${article.id}`;
  if (sessionStorage.getItem(lastNotificationKey) === '1') {
    return;
  }

  const notification = new Notification('Nova matéria publicada', {
    body: article.title,
    icon: '/logo-oficial.png',
    tag: article.id,
    requireInteraction: false,
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
  };

  sessionStorage.setItem(lastNotificationKey, '1');
}

function isLegacyMockArticle(article: Pick<Article, 'id'>) {
  return /^article-\d+$/.test(article.id);
}

export function useArticles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [deletedArticles, setDeletedArticles] = useState<Article[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const readLocalData = () => {
      const stored = localStorage.getItem(ARTICLES_KEY);
      const deletedStored = localStorage.getItem(DELETED_ARTICLES_KEY);
      let localActive: Article[] | null = null;
      let localDeleted: Article[] = [];

      if (stored) {
        try {
          const parsed = JSON.parse(stored) as Article[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            localActive = parsed
              .map(normalizeArticle)
              .filter((article) => !isLegacyMockArticle(article));
          }
        } catch (error) {
          console.error('Erro ao carregar artigos locais:', error);
          localActive = null;
        }
      }

      if (deletedStored) {
        try {
          const parsedDeleted = JSON.parse(deletedStored) as Article[];
          localDeleted = Array.isArray(parsedDeleted) ? parsedDeleted.map(normalizeArticle) : [];
        } catch (error) {
          console.error('Erro ao carregar artigos deletados locais:', error);
          localDeleted = [];
        }
      }

      return {
        active: localActive,
        deleted: localDeleted,
      };
    };

    const loadFromLocal = () => {
      const local = readLocalData();
      setArticles(local.active && local.active.length > 0 ? local.active : []);
      setDeletedArticles(local.deleted);
    };

    let isActive = true;

    const load = async () => {
      try {
        const remoteData = await readRemoteArticles();

        if (!isActive) {
          return;
        }

        if (remoteData) {
          const local = readLocalData();
          const localArticles = local.active ?? [];
          const localDeletedArticles = local.deleted ?? [];
          const localDeletedIds = new Set(localDeletedArticles.map((article) => article.id));
          const remoteActiveWithoutLocallyDeleted = remoteData.active.filter((article) => !localDeletedIds.has(article.id));
          const mergedActive = [...remoteActiveWithoutLocallyDeleted];

          localArticles.forEach((localArticle) => {
            if (localDeletedIds.has(localArticle.id)) {
              return;
            }

            const remoteMatch = remoteData.active.find((article) => article.id === localArticle.id);
            const remoteUpdatedAt = remoteMatch ? new Date(remoteMatch.updatedAt).getTime() : 0;
            const localUpdatedAt = new Date(localArticle.updatedAt).getTime();

            if (!remoteMatch || localUpdatedAt >= remoteUpdatedAt) {
              if (!mergedActive.some((article) => article.id === localArticle.id)) {
                mergedActive.push(localArticle);
              }
            }
          });

          const mergedDeleted = [...new Map([...remoteData.deleted, ...localDeletedArticles].map((article) => [article.id, article])).values()];
          setArticles(mergedActive);
          setDeletedArticles(mergedDeleted);
          syncLocalStorageSnapshot(mergedActive, mergedDeleted);
          setIsLoaded(true);
          return;
        }
      } catch (error) {
        console.error('Erro ao carregar artigos remotos:', error);
      }

      if (!isActive) {
        return;
      }

      loadFromLocal();
      setIsLoaded(true);
    };

    load();

    return () => {
      isActive = false;
    };
  }, []);

  const persistTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (persistTimerRef.current) {
      window.clearTimeout(persistTimerRef.current);
    }

    persistTimerRef.current = window.setTimeout(() => {
      localStorage.setItem(ARTICLES_KEY, JSON.stringify(articles));
      localStorage.setItem(DELETED_ARTICLES_KEY, JSON.stringify(deletedArticles));
    }, 120);

    return () => {
      if (persistTimerRef.current) {
        window.clearTimeout(persistTimerRef.current);
      }
    };
  }, [articles, deletedArticles, isLoaded]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    const publishScheduledArticles = () => {
      setArticles((current) => {
        const now = Date.now();
        const nowIso = new Date().toISOString();
        const articlesToPublish: Article[] = [];

        const nextArticles = current.map((article) => {
          if (article.status !== 'agendado') {
            return article;
          }

          const scheduledAt = getScheduledPublishTimeMs(article);
          if (scheduledAt === null || scheduledAt > now) {
            return article;
          }

          const nextArticle: Article = {
            ...article,
            status: 'publicado',
            publishedAt: article.publishedAt ?? nowIso,
            scheduledDate: undefined,
            scheduledTime: undefined,
            updatedAt: nowIso,
            lastUpdatedAt: nowIso,
          };

          articlesToPublish.push(nextArticle);
          return nextArticle;
        });

        if (articlesToPublish.length === 0) {
          return current;
        }

        articlesToPublish.forEach((article) => {
          void upsertRemoteArticle(article, false).catch((error) => {
            warnSupabaseWriteIssue('publicar artigo agendado automaticamente', error);
          });
        });

        return nextArticles;
      });
    };

    publishScheduledArticles();
    const timerId = window.setInterval(publishScheduledArticles, 30_000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [isLoaded]);

  const addArticle = (article: Omit<Article, 'id' | 'createdAt' | 'updatedAt' | 'views' | 'shares'>) => {
    const currentUser = getCurrentAdminUser();
    if (!currentUser || !canCreateArticle(currentUser)) {
      throw new Error('Sem permissão para criar matérias.');
    }

    const now = new Date().toISOString();
    const nextStatus = article.status;
    const nextAuthor = canViewAllArticles(currentUser) ? article.author : currentUser.name;
    const scheduledDate = article.scheduledDate?.trim();
    const scheduledTime = article.scheduledTime?.trim();

    if ((nextStatus === 'publicado' || nextStatus === 'agendado') && !canPublishArticle(currentUser, nextAuthor)) {
      throw new Error('Sem permissão para publicar esta matéria.');
    }
    if (nextStatus === 'agendado' && (!scheduledDate || !scheduledTime)) {
      throw new Error('Defina data e horário para agendar a matéria.');
    }

    const normalizedArticle = normalizeArticle({
      ...(article as Article),
      author: nextAuthor,
      scheduledDate: nextStatus === 'agendado' ? scheduledDate : undefined,
      scheduledTime: nextStatus === 'agendado' ? scheduledTime : undefined,
    });
    const newArticle: Article = {
      ...normalizedArticle,
      id: Date.now().toString(),
      createdAt: now,
      updatedAt: now,
      publishedAt: nextStatus === 'publicado' ? now : article.publishedAt,
      lastUpdatedAt: now,
      views: 0,
      shares: 0,
    };

    if (newArticle.status === 'publicado') {
      maybeSendBrowserNotification(newArticle);
    }

    setArticles((current) => [newArticle, ...current]);
    void upsertRemoteArticle(newArticle, false).catch((error) => {
      warnSupabaseWriteIssue('sincronizar novo artigo', error);
    });
    return newArticle;
  };

  const updateArticle = (id: string, updates: Partial<Article>) => {
    const currentUser = getCurrentAdminUser();
    if (!currentUser) {
      throw new Error('Sem permissão para atualizar matérias.');
    }

    setArticles((current) =>
      current.map((article) => {
        if (article.id !== id) {
          return article;
        }

        if (!canEditArticle(currentUser, article.author)) {
          throw new Error('Sem permissão para editar esta matéria.');
        }

        const nextStatus = updates.status ?? article.status;
        const requestedScheduledDate = updates.scheduledDate ?? article.scheduledDate;
        const requestedScheduledTime = updates.scheduledTime ?? article.scheduledTime;
        const nextScheduledDate = typeof requestedScheduledDate === 'string' ? requestedScheduledDate.trim() : '';
        const nextScheduledTime = typeof requestedScheduledTime === 'string' ? requestedScheduledTime.trim() : '';
        const isPublishingTransition =
          (article.status !== 'publicado' && nextStatus === 'publicado') ||
          (article.status !== 'agendado' && nextStatus === 'agendado');

        if (isPublishingTransition && !canPublishArticle(currentUser, article.author)) {
          throw new Error('Sem permissão para publicar esta matéria.');
        }
        if (nextStatus === 'agendado' && (!nextScheduledDate || !nextScheduledTime)) {
          throw new Error('Defina data e horário para agendar a matéria.');
        }

        const nextPublishedAt = nextStatus === 'publicado' && article.status !== 'publicado' ? new Date().toISOString() : article.publishedAt;
        const nextImages = updates.images ?? article.images ?? [];
        const nextImage = updates.image ?? nextImages.find((image) => image.isPrimary)?.url ?? nextImages[0]?.url ?? article.image ?? '';
        const nextAuthor = canViewAllArticles(currentUser) ? updates.author ?? article.author : article.author;

        const nextArticle = normalizeArticle({
          ...article,
          ...updates,
          author: nextAuthor,
          image: nextImage,
          images: nextImages,
          scheduledDate: nextStatus === 'agendado' ? nextScheduledDate : undefined,
          scheduledTime: nextStatus === 'agendado' ? nextScheduledTime : undefined,
          publishedAt: nextPublishedAt,
          lastUpdatedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Article);

        if (nextStatus === 'publicado' && article.status !== 'publicado') {
          maybeSendBrowserNotification(nextArticle);
        }

        void upsertRemoteArticle(nextArticle, false).catch((error) => {
          warnSupabaseWriteIssue('sincronizar atualização do artigo', error);
        });
        return nextArticle;
      })
    );
  };

  const deleteArticle = (id: string) => {
    const currentUser = getCurrentAdminUser();
    const articleToDelete = articles.find((article) => article.id === id);

    if (!articleToDelete) {
      return;
    }

    if (!currentUser || !canDeleteArticle(currentUser, articleToDelete.author)) {
      throw new Error('Sem permissão para excluir matérias.');
    }

    const nextArticles = articles.filter((article) => article.id !== id);
    const deletedVersion = { ...articleToDelete, updatedAt: new Date().toISOString() };
    const nextDeletedArticles = [...deletedArticles.filter((article) => article.id !== id), deletedVersion];

    setArticles(nextArticles);
    setDeletedArticles(nextDeletedArticles);
    syncLocalStorageSnapshot(nextArticles, nextDeletedArticles);

    void upsertRemoteArticle(deletedVersion, true).catch((error) => {
      warnSupabaseWriteIssue('sincronizar envio para lixeira', error);
    });
  };

  const restoreArticle = (id: string) => {
    const currentUser = getCurrentAdminUser();
    if (!currentUser || !canManageTrash(currentUser)) {
      throw new Error('Sem permissão para restaurar matérias da lixeira.');
    }

    const articleToRestore = deletedArticles.find((article) => article.id === id);

    if (!articleToRestore) {
      return;
    }

    const nextDeletedArticles = deletedArticles.filter((article) => article.id !== id);
    const nextArticles = [...articles, articleToRestore];

    setDeletedArticles(nextDeletedArticles);
    setArticles(nextArticles);
    syncLocalStorageSnapshot(nextArticles, nextDeletedArticles);

    void upsertRemoteArticle(articleToRestore, false).catch((error) => {
      warnSupabaseWriteIssue('sincronizar restauração de artigo', error);
    });
  };

  const permanentlyDeleteArticle = (id: string) => {
    const currentUser = getCurrentAdminUser();
    if (!currentUser || !canManageTrash(currentUser)) {
      throw new Error('Sem permissão para excluir matérias permanentemente.');
    }

    const nextDeletedArticles = deletedArticles.filter((article) => article.id !== id);
    setDeletedArticles(nextDeletedArticles);
    syncLocalStorageSnapshot(articles, nextDeletedArticles);
    void deleteRemoteArticleById(id).catch((error) => {
      warnSupabaseWriteIssue('remover artigo remoto permanentemente', error);
    });
  };

  const emptyTrash = () => {
    const currentUser = getCurrentAdminUser();
    if (!currentUser || !canManageTrash(currentUser)) {
      throw new Error('Sem permissão para esvaziar a lixeira.');
    }

    setDeletedArticles([]);
    syncLocalStorageSnapshot(articles, []);
    void deleteRemoteTrash().catch((error) => {
      warnSupabaseWriteIssue('limpar lixeira remota', error);
    });
  };

  const incrementArticleViews = (id: string) => {
    const syncLocalStats = (current: Article[]) => {
      const localMatch = current.find((article) => article.id === id);
      const baseArticle = localMatch ?? {
        id,
        title: 'Matéria',
        subtitle: '',
        category: '',
        author: '',
        content: '',
        excerpt: '',
        featured: false,
        status: 'publicado' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        views: 0,
        shares: 0,
      };

      const nextArticle = {
        ...baseArticle,
        views: (baseArticle.views ?? 0) + 1,
      };

      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(ARTICLES_KEY);
        try {
          const parsed = stored ? (JSON.parse(stored) as Article[]) : [];
          const rawArticles = Array.isArray(parsed) ? parsed : [];
          const nextStored = rawArticles.some((article) => article.id === id)
            ? rawArticles.map((article) => (article.id === id ? nextArticle : article))
            : [...rawArticles, nextArticle];
          localStorage.setItem(ARTICLES_KEY, JSON.stringify(nextStored));
        } catch (error) {
          console.warn('Erro ao persistir contagem de visualização local:', error);
        }
      }

      void upsertRemoteArticle(nextArticle, false).catch((error) => {
        warnSupabaseWriteIssue('sincronizar visualização da matéria', error);
      });

      if (localMatch) {
        return current.map((article) => (article.id === id ? nextArticle : article));
      }

      return [...current, nextArticle];
    };

    setArticles((current) => syncLocalStats(current));
  };

  const incrementArticleShares = (id: string) => {
    const syncLocalStats = (current: Article[]) => {
      const localMatch = current.find((article) => article.id === id);
      const baseArticle = localMatch ?? {
        id,
        title: 'Matéria',
        subtitle: '',
        category: '',
        author: '',
        content: '',
        excerpt: '',
        featured: false,
        status: 'publicado' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        views: 0,
        shares: 0,
      };

      const nextArticle = {
        ...baseArticle,
        shares: (baseArticle.shares ?? 0) + 1,
      };

      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(ARTICLES_KEY);
        try {
          const parsed = stored ? (JSON.parse(stored) as Article[]) : [];
          const rawArticles = Array.isArray(parsed) ? parsed : [];
          const nextStored = rawArticles.some((article) => article.id === id)
            ? rawArticles.map((article) => (article.id === id ? nextArticle : article))
            : [...rawArticles, nextArticle];
          localStorage.setItem(ARTICLES_KEY, JSON.stringify(nextStored));
        } catch (error) {
          console.warn('Erro ao persistir contagem de compartilhamento local:', error);
        }
      }

      void upsertRemoteArticle(nextArticle, false).catch((error) => {
        warnSupabaseWriteIssue('sincronizar compartilhamento da matéria', error);
      });

      if (localMatch) {
        return current.map((article) => (article.id === id ? nextArticle : article));
      }

      return [...current, nextArticle];
    };

    setArticles((current) => syncLocalStats(current));
  };

  return {
    articles,
    deletedArticles,
    isLoaded,
    addArticle,
    updateArticle,
    deleteArticle,
    restoreArticle,
    permanentlyDeleteArticle,
    emptyTrash,
    incrementArticleViews,
    incrementArticleShares,
  };
}
