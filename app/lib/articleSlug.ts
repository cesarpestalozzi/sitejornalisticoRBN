/**
 * Gera um slug amigável (URL) a partir de um título de matéria, removendo
 * acentos, pontuação e espaços extras.
 */
export function slugifyTitle(title: string, maxLength = 90): string {
  const normalized = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return normalized.slice(0, maxLength).replace(/-+$/g, '');
}

/**
 * Retorna a URL pública de uma matéria, preferindo o slug (mais amigável
 * para SEO e leitura) e recaindo para o ID quando não houver slug definido
 * (matérias antigas).
 */
export function getArticleHref(article: { id: string; slug?: string | null }): string {
  const slug = typeof article.slug === 'string' ? article.slug.trim() : '';
  return `/artigo/${encodeURIComponent(slug || article.id)}`;
}
