export type ArticleStatus = 'rascunho' | 'agendado' | 'publicado';

export function normalizeArticleStatus(value: unknown, fallback?: ArticleStatus): ArticleStatus {
  const rawValue = typeof value === 'string' ? value.trim().toLowerCase() : '';

  switch (rawValue) {
    case 'publicado':
    case 'published':
    case 'publish':
    case 'online':
      return 'publicado';
    case 'agendado':
    case 'scheduled':
    case 'schedule':
    case 'future':
      return 'agendado';
    case 'rascunho':
    case 'draft':
    case 'borrador':
    case 'pending':
      return 'rascunho';
    default:
      return fallback ?? 'rascunho';
  }
}

export function isPublishedArticle(value: unknown): boolean {
  return normalizeArticleStatus(value, 'rascunho') === 'publicado';
}
