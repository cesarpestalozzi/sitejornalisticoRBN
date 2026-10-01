import { useEffect, useState } from 'react';
import {
  canCreateArticle,
  canDeleteArticle,
  canEditArticle,
  canManageTrash,
  canPublishArticle,
  canViewAllArticles,
  getCurrentAdminUser,
} from '@/app/lib/adminPermissions';
import { normalizeArticleStatus } from '@/app/lib/articleStatus';
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
  slug?: string;
  metaDescription?: string;
  title: string;
  subtitle: string;
  category: string;
  author: string;
  authorUserIds?: string[];
  columnistUserId?: string;
  showColumnist?: boolean;
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
const SUPABASE_TABLE = 'pz_news_articles';

type SupabaseArticleRow = {
  id: string;
  payload: Article;
  deleted: boolean;
  updated_at?: string;
};

function isSupabaseRlsViolation(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const message = 'message' in error ? String((error as { message?: string }).message ?? '') : '';
  const code = 'code' in error ? String((error as { code?: string }).code ?? '') : '';
  return code === '42501' || message.toLowerCase().includes('row-level security');
}

function warnSupabaseWriteIssue(context: string, error: unknown) {
  console.error(`[API de artigos] ${context}:`, error);
}

async function normalizeRemoteRows(rows: SupabaseArticleRow[]) {
  const active: Article[] = [];
  const deleted: Article[] = [];

  rows.forEach((row) => {
    if (!row || typeof row !== 'object' || !row.payload) {
      return;
    }
    // Videoconference fallback records share the legacy Supabase table but
    // are not newsroom articles.
    if (row.id.startsWith('__videoconference:') || (row.payload as unknown as Record<string, unknown>)._type === 'videoconference_meeting') {
      return;
    }

    const normalized = normalizeArticle({
      ...row.payload,
      id: String(row.payload.id || row.id),
      createdAt: row.payload.createdAt || row.updated_at || new Date().toISOString(),
      updatedAt: row.payload.updatedAt || row.updated_at || new Date().toISOString(),
    });
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

type RemoteArticlesSnapshot = Awaited<ReturnType<typeof normalizeRemoteRows>>;
const REMOTE_ARTICLES_CACHE_TTL_MS = 6_000;
let remoteArticlesCache: { at: number; key: string; data: RemoteArticlesSnapshot } | null = null;
let remoteArticlesInFlight: { key: string; promise: Promise<RemoteArticlesSnapshot | null> } | null = null;

function invalidateRemoteArticlesCache() {
  remoteArticlesCache = null;
  remoteArticlesInFlight = null;
}

async function readRemoteArticles() {
  if (!hasSupabaseConfig && typeof window === 'undefined') {
    return null;
  }

  const currentUser = getCurrentAdminUser();
  const canViewDeletedArticles = Boolean(
    currentUser && (currentUser.role === 'admin' || (currentUser.permissions ?? []).includes('articles:view:all'))
  );
  const cacheKey = `${currentUser?.id ?? 'anonymous'}:${canViewDeletedArticles}`;
  if (
    remoteArticlesCache?.key === cacheKey &&
    Date.now() - remoteArticlesCache.at < REMOTE_ARTICLES_CACHE_TTL_MS
  ) {
    return remoteArticlesCache.data;
  }
  if (remoteArticlesInFlight?.key === cacheKey) {
    return remoteArticlesInFlight.promise;
  }

  const loadPromise = (async (): Promise<RemoteArticlesSnapshot | null> => {
    const query = canViewDeletedArticles ? '?includeDeleted=true' : '';
    const response = await fetch(`/api/articles${query}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      const error = new Error(payload.error ?? `Falha ao carregar artigos (HTTP ${response.status}).`);
      Object.assign(error, { status: response.status });
      throw error;
    }
    const rows = (await response.json()) as SupabaseArticleRow[];
    const normalized = await normalizeRemoteRows(rows);
    remoteArticlesCache = { at: Date.now(), key: cacheKey, data: normalized };
    return normalized;
  })();

  const request = { key: cacheKey, promise: loadPromise };
  remoteArticlesInFlight = request;
  try {
    return await loadPromise;
  } finally {
    if (remoteArticlesInFlight === request) {
      remoteArticlesInFlight = null;
    }
  }
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
      invalidateRemoteArticlesCache();
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

      invalidateRemoteArticlesCache();
      return;
    }

    if (error instanceof Error && isSupabaseRlsViolation(error)) {
      warnSupabaseWriteIssue('salvar artigo remoto', error);
      return;
    }

    throw error;
  }
}

async function patchRemoteArticle(id: string, updates: Partial<Article>, deleted?: boolean) {
  if (!hasSupabaseConfig && typeof window === 'undefined') {
    return;
  }

  try {
    const response = await fetch('/api/articles', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      body: JSON.stringify({ id, updates, deleted }),
    });

    if (response.ok) {
      invalidateRemoteArticlesCache();
      return;
    }

    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    const message = payload.error ?? `HTTP ${response.status}`;
    throw new Error(message);
  } catch (error) {
    if (hasSupabaseConfig && supabase) {
      const { data: existing, error: readError } = await supabase
        .from(SUPABASE_TABLE)
        .select('payload, deleted')
        .eq('id', id)
        .maybeSingle();
      if (readError) {
        throw new Error(`Erro ao ler artigo para atualização: ${readError.message}`);
      }
      if (!existing || !existing.payload || typeof existing.payload !== 'object') {
        throw new Error('Artigo não encontrado para atualização remota.');
      }
      const { data, error: supabaseError } = await supabase
        .from(SUPABASE_TABLE)
        .update({
          payload: { ...(existing.payload as Record<string, unknown>), ...updates, id },
          deleted: deleted ?? existing.deleted,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('id')
        .limit(1);

      if (supabaseError) {
        if (isSupabaseRlsViolation(supabaseError)) {
          warnSupabaseWriteIssue('atualizar artigo remoto', supabaseError);
          return;
        }

        throw new Error(`Erro ao atualizar artigo remoto: ${supabaseError.message}`);
      }

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Artigo não encontrado para atualização remota.');
      }

      invalidateRemoteArticlesCache();
      return;
    }

    if (error instanceof Error && isSupabaseRlsViolation(error)) {
      warnSupabaseWriteIssue('atualizar artigo remoto', error);
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
      invalidateRemoteArticlesCache();
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
      invalidateRemoteArticlesCache();
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
      invalidateRemoteArticlesCache();
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
      invalidateRemoteArticlesCache();
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
  const normalizedStatus = normalizeArticleStatus(
    article.status,
    article.publishedAt ? 'publicado' : article.scheduledDate ? 'agendado' : 'rascunho'
  );

  return {
    ...article,
    title: typeof article.title === 'string' ? article.title : 'Sem título',
    slug: typeof article.slug === 'string' && article.slug.trim() ? article.slug.trim() : undefined,
    metaDescription: typeof article.metaDescription === 'string' && article.metaDescription.trim() ? article.metaDescription.trim() : undefined,
    subtitle: typeof article.subtitle === 'string' ? article.subtitle : '',
    category: typeof article.category === 'string' ? article.category : 'Geral',
    author: typeof article.author === 'string' ? article.author : 'RBN',
    content: typeof article.content === 'string' ? article.content : '',
    excerpt: typeof article.excerpt === 'string' ? article.excerpt : '',
    status: normalizedStatus,
    image: primaryImage,
    images: normalizedImages,
    videos: normalizedVideos,
    views,
    shares,
  };
}

function syncLocalStorageSnapshot(nextArticles: Article[], nextDeletedArticles: Article[]) {
  if (typeof window === 'undefined') {
    return;
  }

  // Articles belong to the database. Remove only old browser snapshots and
  // never mirror full article payloads (especially base64 media) to storage.
  void nextArticles;
  void nextDeletedArticles;
  localStorage.removeItem(ARTICLES_KEY);
  localStorage.removeItem(DELETED_ARTICLES_KEY);
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

/**
 * Busca uma única matéria com os dados completos (incluindo a imagem em
 * base64 original), sem depender da listagem geral. A listagem usada por
 * useArticles() traz as imagens já "leves" (referência via /api/article-image)
 * para não sobrecarregar o painel; ao abrir uma matéria específica para
 * edição, buscamos o registro completo diretamente para preservar a imagem
 * original ao salvar.
 */
export async function fetchFullArticleById(id: string): Promise<Article | null> {
  try {
    const response = await fetch(`/api/articles?id=${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) {
      return null;
    }
    const rows = (await response.json()) as SupabaseArticleRow[];
    const row = rows.find((item) => item.id === id) ?? rows[0];
    if (!row || !row.payload) {
      return null;
    }
    return normalizeArticle({
      ...row.payload,
      id: String(row.payload.id || row.id),
      createdAt: row.payload.createdAt || row.updated_at || new Date().toISOString(),
      updatedAt: row.payload.updatedAt || row.updated_at || new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erro ao carregar matéria completa:', error);
    return null;
  }
}

export function useArticles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [deletedArticles, setDeletedArticles] = useState<Article[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      setLoadError(null);
      // A rota de artigos pode responder intermitentemente com erro (ex.: 502
      // por instabilidade momentânea da Vercel/Supabase). Tentamos algumas
      // vezes antes de desistir, em vez de já mostrar "nenhum artigo".
      const attempts = 3;
      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
          const remoteData = await readRemoteArticles();

          if (!isActive) {
            return;
          }

          if (remoteData) {
            // Fonte de verdade: remoto. Isso evita divergência entre dispositivos
            // e elimina sobrescrita por snapshots locais antigos.
            setArticles(remoteData.active);
            setDeletedArticles(remoteData.deleted);
            syncLocalStorageSnapshot(remoteData.active, remoteData.deleted);
            setIsLoaded(true);
            return;
          }
        } catch (error) {
          console.error(`Erro ao carregar artigos remotos (tentativa ${attempt}/${attempts}):`, error);
          const status = error && typeof error === 'object' && 'status' in error
            ? Number(error.status)
            : undefined;
          if (status !== undefined && status >= 400 && status < 500) {
            if (!isActive) return;
            setLoadError(error instanceof Error ? error.message : 'Não foi possível carregar as matérias.');
            setIsLoaded(true);
            return;
          }
          if (attempt === attempts) {
            if (!isActive) {
              return;
            }
            setLoadError(error instanceof Error ? error.message : 'Não foi possível carregar as matérias.');
          }
        }

        if (attempt < attempts) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 800));
        }
      }

      if (!isActive) {
        return;
      }

      // Do not fall back to localStorage: it is not an article database and
      // can contain stale or oversized browser snapshots.
      setArticles([]);
      setDeletedArticles([]);
      setIsLoaded(true);
    };

    load();

    return () => {
      isActive = false;
    };
  }, [reloadToken]);

  const reloadArticles = () => setReloadToken((current) => current + 1);

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
    syncLocalStorageSnapshot([newArticle, ...articles], deletedArticles);
    void upsertRemoteArticle(newArticle, false).catch((error) => {
      warnSupabaseWriteIssue('salvar novo artigo no Supabase', error);
    });
    return newArticle;
  };

  const persistArticle = async (article: Article) => {
    await upsertRemoteArticle(article, false);
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

        const persistedUpdates: Partial<Article> = {
          ...updates,
          author: nextAuthor,
          scheduledDate: nextStatus === 'agendado' ? nextScheduledDate : undefined,
          scheduledTime: nextStatus === 'agendado' ? nextScheduledTime : undefined,
          publishedAt: nextPublishedAt,
          lastUpdatedAt: nextArticle.lastUpdatedAt,
          updatedAt: nextArticle.updatedAt,
        };
        if (Object.hasOwn(updates, 'images') || Object.hasOwn(updates, 'image')) {
          persistedUpdates.images = nextImages;
          persistedUpdates.image = nextImage;
        }

        if (nextStatus === 'publicado' && article.status !== 'publicado') {
          maybeSendBrowserNotification(nextArticle);
        }

        void patchRemoteArticle(id, persistedUpdates, false).catch((error) => {
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

    void patchRemoteArticle(id, { updatedAt: deletedVersion.updatedAt }, true).catch((error) => {
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

    void patchRemoteArticle(id, { updatedAt: new Date().toISOString() }, false).catch((error) => {
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
      if (!localMatch) {
        return current;
      }

      const baseArticle = localMatch;

      const nextArticle = {
        ...baseArticle,
        views: (baseArticle.views ?? 0) + 1,
      };

      void patchRemoteArticle(id, { views: nextArticle.views }).catch((error) => {
        warnSupabaseWriteIssue('sincronizar visualização da matéria', error);
      });

      return current.map((article) => (article.id === id ? nextArticle : article));
    };

    setArticles((current) => syncLocalStats(current));
  };

  const incrementArticleShares = (id: string) => {
    const syncLocalStats = (current: Article[]) => {
      const localMatch = current.find((article) => article.id === id);
      if (!localMatch) {
        return current;
      }

      const baseArticle = localMatch;

      const nextArticle = {
        ...baseArticle,
        shares: (baseArticle.shares ?? 0) + 1,
      };

      void patchRemoteArticle(id, { shares: nextArticle.shares }).catch((error) => {
        warnSupabaseWriteIssue('sincronizar compartilhamento da matéria', error);
      });

      return current.map((article) => (article.id === id ? nextArticle : article));
    };

    setArticles((current) => syncLocalStats(current));
  };

  return {
    articles,
    deletedArticles,
    isLoaded,
    loadError,
    reloadArticles,
    addArticle,
    persistArticle,
    updateArticle,
    deleteArticle,
    restoreArticle,
    permanentlyDeleteArticle,
    emptyTrash,
    incrementArticleViews,
    incrementArticleShares,
  };
}
