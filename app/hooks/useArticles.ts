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

export interface ArticleImage {
  id: string;
  url: string;
  alt: string;
  caption: string;
  isPrimary: boolean;
  name?: string;
}

export interface ArticleVideo {
  id: string;
  url: string;
  title: string;
  caption: string;
  name?: string;
  type?: 'upload' | 'external' | 'microsoft-stream';
  embedUrl?: string;
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
  // Chaves legadas anon são JWT (eyJ...) e exigem Authorization Bearer.
  // Chaves novas sb_publishable_* funcionam apenas com apikey.
  if (key.startsWith('eyJ')) {
    headers.Authorization = `Bearer ${key}`;
  }

  return headers;
}

async function readRemoteArticles() {
  if (!hasSupabaseConfig()) {
    return null;
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

async function upsertRemoteArticle(article: Article, deleted: boolean) {
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
        id: article.id,
        payload: article,
        deleted,
        updated_at: new Date().toISOString(),
      },
    ]),
  });

  if (!response.ok) {
    throw new Error(`Erro ao salvar artigo remoto: ${response.status}`);
  }
}

async function deleteRemoteArticleById(id: string) {
  if (!hasSupabaseConfig()) {
    return;
  }

  const response = await fetch(getSupabaseEndpoint(`?id=eq.${encodeURIComponent(id)}`), {
    method: 'DELETE',
    headers: {
      ...getSupabaseHeaders(),
      Prefer: 'return=minimal',
    },
  });

  if (!response.ok) {
    throw new Error(`Erro ao apagar artigo remoto: ${response.status}`);
  }
}

async function deleteRemoteTrash() {
  if (!hasSupabaseConfig()) {
    return;
  }

  const response = await fetch(getSupabaseEndpoint('?deleted=is.true'), {
    method: 'DELETE',
    headers: {
      ...getSupabaseHeaders(),
      Prefer: 'return=minimal',
    },
  });

  if (!response.ok) {
    throw new Error(`Erro ao limpar lixeira remota: ${response.status}`);
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
      };
    }

    return {
      id: `${index}-${Date.now()}`,
      url: '',
      alt: 'Imagem da matéria',
      caption: '',
      isPrimary: index === 0,
      name: 'Imagem',
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
          if (remoteData.active.length === 0) {
            const local = readLocalData();
            const localHasArticles = Boolean(local.active && local.active.length > 0);

            if (localHasArticles && local.active) {
              setArticles(local.active);
              setDeletedArticles(local.deleted);

              // Semeia o banco remoto com o conteúdo local para sincronizar outros dispositivos.
              local.active.forEach((article) => {
                void upsertRemoteArticle(article, false).catch((syncError) => {
                  console.error('Erro ao semear artigo local no remoto:', syncError);
                });
              });
              local.deleted.forEach((article) => {
                void upsertRemoteArticle(article, true).catch((syncError) => {
                  console.error('Erro ao semear lixeira local no remoto:', syncError);
                });
              });
            } else {
              setArticles([]);
              setDeletedArticles(remoteData.deleted);
            }
          } else {
            setArticles(remoteData.active);
            setDeletedArticles(remoteData.deleted);
          }
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

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(ARTICLES_KEY, JSON.stringify(articles));
    }
  }, [articles, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(DELETED_ARTICLES_KEY, JSON.stringify(deletedArticles));
    }
  }, [deletedArticles, isLoaded]);

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
            console.error('Erro ao publicar artigo agendado automaticamente:', error);
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

    setArticles((current) => [newArticle, ...current]);
    void upsertRemoteArticle(newArticle, false).catch((error) => {
      console.error('Erro ao sincronizar novo artigo:', error);
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
        void upsertRemoteArticle(nextArticle, false).catch((error) => {
          console.error('Erro ao sincronizar atualização do artigo:', error);
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

    setArticles((current) => current.filter((article) => article.id !== id));
    const deletedVersion = { ...articleToDelete, updatedAt: new Date().toISOString() };
    setDeletedArticles((current) => [...current, deletedVersion]);
    void upsertRemoteArticle(deletedVersion, true).catch((error) => {
      console.error('Erro ao sincronizar envio para lixeira:', error);
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

    setDeletedArticles((current) => current.filter((article) => article.id !== id));
    setArticles((current) => [...current, articleToRestore]);
    void upsertRemoteArticle(articleToRestore, false).catch((error) => {
      console.error('Erro ao sincronizar restauração de artigo:', error);
    });
  };

  const permanentlyDeleteArticle = (id: string) => {
    const currentUser = getCurrentAdminUser();
    if (!currentUser || !canManageTrash(currentUser)) {
      throw new Error('Sem permissão para excluir matérias permanentemente.');
    }

    setDeletedArticles((current) => current.filter((article) => article.id !== id));
    void deleteRemoteArticleById(id).catch((error) => {
      console.error('Erro ao remover artigo remoto permanentemente:', error);
    });
  };

  const emptyTrash = () => {
    const currentUser = getCurrentAdminUser();
    if (!currentUser || !canManageTrash(currentUser)) {
      throw new Error('Sem permissão para esvaziar a lixeira.');
    }

    setDeletedArticles([]);
    void deleteRemoteTrash().catch((error) => {
      console.error('Erro ao limpar lixeira remota:', error);
    });
  };

  const incrementArticleViews = (id: string) => {
    setArticles((current) =>
      current.map((article) => {
        if (article.id !== id) {
          return article;
        }

        const nextArticle = {
          ...article,
          views: (article.views ?? 0) + 1,
        };

        void upsertRemoteArticle(nextArticle, false).catch((error) => {
          console.error('Erro ao sincronizar visualização da matéria:', error);
        });
        return nextArticle;
      })
    );
  };

  const incrementArticleShares = (id: string) => {
    setArticles((current) =>
      current.map((article) => {
        if (article.id !== id) {
          return article;
        }

        const nextArticle = {
          ...article,
          shares: (article.shares ?? 0) + 1,
        };

        void upsertRemoteArticle(nextArticle, false).catch((error) => {
          console.error('Erro ao sincronizar compartilhamento da matéria:', error);
        });
        return nextArticle;
      })
    );
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

function getMockArticles(): Article[] {
  const now = new Date();

  const iso = (daysAgo: number, hoursAgo = 0) => {
    const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000 - hoursAgo * 60 * 60 * 1000);
    return date.toISOString();
  };

  return [
    {
      id: 'article-1',
      title: 'Parlamentares aprovam novo pacote de medidas para reduzir a inflação no país',
      subtitle: 'Medida terá impacto direto na cesta básica e no crédito ao consumidor.',
      category: 'Política',
      author: 'Ana Paula Ribeiro',
      content:
        '<p>Os deputados e senadores aprovaram um conjunto de medidas focado em reduzir a inflação e ampliar a previsibilidade econômica para famílias e pequenas empresas.</p><p>Especialistas apontam que a combinação de corte de tributos em itens essenciais e aumento do acompanhamento fiscal pode aliviar o custo de vida em alguns segmentos.</p>',
      excerpt:
        'Aprovado em votação acelerada, o pacote busca reduzir custos e tentar estabilizar o consumo em meio à pressão sobre a cesta básica.',
      image: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=1200&q=80',
      featured: true,
      status: 'publicado',
      publishedAt: iso(0, 2),
      createdAt: iso(2, 8),
      updatedAt: iso(0, 2),
      lastUpdatedAt: iso(0, 2),
      views: 4853,
      shares: 0,
    },
    {
      id: 'article-2',
      title: 'Setor de tecnologia registra crescimento em vagas e investimentos em IA',
      subtitle: 'Empresas ampliam contratação de perfil técnico para inteligência artificial.',
      category: 'Tecnologia',
      author: 'Mateus Costa',
      content:
        '<p>O mercado de tecnologia continua aquecido, com empresas investindo em ferramentas de automação e inteligência artificial para aumentar a produtividade.</p><p>Analistas observam que a demanda por talentos de machine learning e dados supera a oferta atual no mercado nacional.</p>',
      excerpt:
        'A expansão de empresas de software e startups tem impulsionado oportunidades em IA, dados e automação em todo o país.',
      image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
      featured: false,
      status: 'publicado',
      publishedAt: iso(1, 3),
      createdAt: iso(4, 10),
      updatedAt: iso(1, 3),
      lastUpdatedAt: iso(1, 3),
      views: 3621,
      shares: 0,
    },
    {
      id: 'article-3',
      title: 'Eventos esportivos movimentam capitais e impulsionam turismo regional',
      subtitle: 'Cidades brasileiras observam aumento de visitantes durante as competições.',
      category: 'Esportes',
      author: 'Rafael Nunes',
      content:
        '<p>As cidades-sede de torneios regional e nacional têm visto um aumento expressivo de turistas durante partidas decisivas e eventos esportivos.</p><p>Hotéis e restaurantes costumam registrar ocupação acima da média em períodos de grande movimentação esportiva.</p>',
      excerpt:
        'Com o calendário cheio de competições, cidades do interior e grandes capitais ganham movimento econômico e turístico.',
      image: 'https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=1200&q=80',
      featured: false,
      status: 'publicado',
      publishedAt: iso(2, 7),
      createdAt: iso(5, 12),
      updatedAt: iso(2, 7),
      lastUpdatedAt: iso(2, 7),
      views: 2879,
      shares: 0,
    },
    {
      id: 'article-4',
      title: 'Empresas de varejo investem em logística para atender pedidos por delivery',
      subtitle: 'Aumento da demanda leva redes a ampliar operações e entregas velozes.',
      category: 'Economia',
      author: 'Camila Souza',
      content:
        '<p>Empresas de varejo e supermercados estão ampliando investimentos em logística e tecnologia para manter a velocidade das entregas.</p><p>O crescimento do consumo digital empurra redes a melhorar a eficiência do estoque e da última milha.</p>',
      excerpt:
        'Pequenas e médias empresas intensificam a automação logística para conquistar maior eficiência e fidelização.',
      image: 'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=1200&q=80',
      featured: false,
      status: 'publicado',
      publishedAt: iso(3, 5),
      createdAt: iso(6, 9),
      updatedAt: iso(3, 5),
      lastUpdatedAt: iso(3, 5),
      views: 2146,
      shares: 0,
    },
    {
      id: 'article-5',
      title: 'Cultura local ganha espaço em festivais e novas produções independentes',
      subtitle: 'Artistas locais despertam interesse com narrativas regionais e formatos inovadores.',
      category: 'Cultura',
      author: 'Lívia Martins',
      content:
        '<p>Festivais de música, curta-metragem e arte urbana têm fortalecido o protagonismo de artistas locais e de narrativas diversas.</p><p>O aumento do interesse por produções independentes também gera novas oportunidades para a cena cultural regional.</p>',
      excerpt:
        'A cena cultural brasileira valoriza cada vez mais artistas independentes e experiências criativas regionais.',
      image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
      featured: false,
      status: 'publicado',
      publishedAt: iso(5, 1),
      createdAt: iso(7, 14),
      updatedAt: iso(5, 1),
      lastUpdatedAt: iso(5, 1),
      views: 1925,
      shares: 0,
    },
    {
      id: 'article-6',
      title: 'Gestão pública busca ampliar acesso à saúde por meio de telemedicina',
      subtitle: 'A estratégia promove atendimento mais rápido para regiões afastadas.',
      category: 'Saúde',
      author: 'Paula Mendes',
      content:
        '<p>O uso de telemedicina tem ganhado força como alternativa para ampliar o acesso da população a consultas e acompanhamento clínico.</p><p>Especialistas apontam que o modelo pode reduzir filas e melhorar o atendimento em localidades com poucos profissionais de saúde.</p>',
      excerpt:
        'A expansão da telemedicina é vista como caminho para ampliar atendimento em áreas remotas e reduzir filas.',
      image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=80',
      featured: false,
      status: 'rascunho',
      publishedAt: iso(7, 4),
      createdAt: iso(9, 11),
      updatedAt: iso(7, 4),
      lastUpdatedAt: iso(7, 4),
      views: 832,
      shares: 0,
    },
  ];
}
