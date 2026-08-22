export type ArticlePayloadLike = {
  id: string;
  status?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  publishedAt?: string;
  lastUpdatedAt?: string;
  updatedAt?: string;
  createdAt?: string;
  title?: string;
  subtitle?: string;
  category?: string;
  author?: string;
  excerpt?: string;
  image?: string;
  featured?: boolean;
  views?: number;
  shares?: number;
  [key: string]: unknown;
};

export type ArticleRowLike = {
  id: string;
  payload: ArticlePayloadLike;
  deleted?: boolean;
  updated_at?: string;
};

export function getScheduledPublishTimeMs(article: Pick<ArticlePayloadLike, 'scheduledDate' | 'scheduledTime'>) {
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

export function isScheduledArticleDue(article: Pick<ArticlePayloadLike, 'scheduledDate' | 'scheduledTime' | 'status'>, now = Date.now()) {
  if (article.status !== 'agendado') {
    return false;
  }

  const scheduledAt = getScheduledPublishTimeMs(article);
  return scheduledAt !== null && scheduledAt <= now;
}

export function promoteScheduledArticle(article: ArticlePayloadLike, nowIso = new Date().toISOString()): ArticlePayloadLike {
  return {
    ...article,
    status: 'publicado',
    publishedAt: article.publishedAt ?? nowIso,
    scheduledDate: undefined,
    scheduledTime: undefined,
    updatedAt: nowIso,
    lastUpdatedAt: nowIso,
  };
}
