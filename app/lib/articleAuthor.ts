export function formatArticleAuthor(value: unknown) {
  const name = typeof value === 'string' ? value.trim().replace(/^por\s+/i, '') : '';
  return name ? `Por ${name}` : 'Por Redação RBN';
}
