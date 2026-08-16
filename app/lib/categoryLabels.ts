export function normalizeCategorySlug(category?: string | null): string {
  const rawValue = (category ?? '').trim().toLowerCase();
  if (!rawValue) {
    return 'geral';
  }

  const normalizedValue = rawValue
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim();

  const aliases: Record<string, string> = {
    politica: 'politica',
    'política': 'politica',
    brasil: 'brasil',
    mundo: 'mundo',
    economia: 'economia',
    negocios: 'negocios',
    tecnologia: 'tecnologia',
    ciencia: 'ciencia',
    educacao: 'educacao',
    saude: 'saude',
    cultura: 'cultura',
    cinema: 'cinema',
    series: 'series',
    musica: 'musica',
    esportes: 'esportes',
    futebol: 'futebol',
    opiniao: 'opiniao',
    podcasts: 'podcasts',
    colunistas: 'colunistas',
    videos: 'videos',
  };

  return aliases[normalizedValue] ?? normalizedValue.replace(/\s+/g, '-');
}

export function getCategoryDisplayName(category?: string | null): string {
  const slug = normalizeCategorySlug(category);
  const labels: Record<string, string> = {
    geral: 'Geral',
    politica: 'Política',
    brasil: 'Brasil',
    mundo: 'Mundo',
    economia: 'Economia',
    negocios: 'Negócios',
    tecnologia: 'Tecnologia',
    ciencia: 'Ciência',
    educacao: 'Educação',
    saude: 'Saúde',
    cultura: 'Cultura',
    cinema: 'Cinema',
    series: 'Séries',
    musica: 'Música',
    esportes: 'Esportes',
    futebol: 'Futebol',
    opiniao: 'Opinião',
    podcasts: 'Podcasts',
    colunistas: 'Colunistas',
    videos: 'Vídeos',
  };

  if (labels[slug]) {
    return labels[slug];
  }

  return (category ?? 'Geral').trim() || 'Geral';
}
