import { getRadarCategoryLabel, normalizeText, type RadarNewsGroup } from '@/app/lib/radarNews';

export type RadarDraftFactStatus = 'confirmada' | 'requer-confirmacao' | 'nao-confirmada';

export type RadarDraftFact = {
  id: string;
  status: RadarDraftFactStatus;
  text: string;
  sourceName?: string;
  sourceUrl?: string;
};

export type RadarDraftImageSuggestion = {
  id: string;
  url: string;
  previewUrl: string;
  origin: string;
  author: string;
  license: string;
  rights: string;
  caption: string;
  credit: string;
  usageAllowed: boolean;
};

export type RadarEditorDraft = {
  id: string;
  sourceGroupId: string;
  generatedAt: string;
  category: string;
  location: string;
  suggestedTitle: string;
  titleOptions: string[];
  subtitle: string;
  excerpt: string;
  contentHtml: string;
  seoDescription: string;
  slugSuggestion: string;
  keywords: string[];
  sources: Array<{
    name: string;
    url: string;
    country: string;
    reliability: number;
    articleTitle: string;
    publishedAt: string;
  }>;
  facts: RadarDraftFact[];
  imageSuggestions: RadarDraftImageSuggestion[];
};

export const RADAR_EDITOR_DRAFT_STORAGE_KEY = 'pz_news_radar_editor_draft';

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 1).trim()}…`;
}

function toSlug(value: string) {
  const normalized = normalizeText(value)
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return normalized.slice(0, 90);
}

function uniqueNonEmpty(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  values.forEach((value) => {
    const trimmed = value.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) {
      return;
    }
    seen.add(key);
    result.push(trimmed);
  });
  return result;
}

function buildTitleOptions(group: RadarNewsGroup, primaryKeyword: string) {
  const headline = group.headline.trim();
  const categoryLabel = getRadarCategoryLabel(group.category);
  return uniqueNonEmpty([
    headline,
    `${headline}: veja o que já está confirmado`,
    `${categoryLabel}: ${headline}`,
    `${primaryKeyword} em foco: contexto e desdobramentos`,
    `Entenda ${headline.charAt(0).toLowerCase()}${headline.slice(1)}`,
  ]).slice(0, 5);
}

function buildFacts(group: RadarNewsGroup): RadarDraftFact[] {
  const facts: RadarDraftFact[] = [
    {
      id: `${group.id}-f1`,
      status: 'confirmada',
      text: `O tema está em cobertura de ${group.relatedSourcesCount} fonte(s) no Radar.`,
    },
    {
      id: `${group.id}-f2`,
      status: 'confirmada',
      text: `Última publicação monitorada em ${new Date(group.lastPublishedAt).toLocaleString('pt-BR')}.`,
    },
    {
      id: `${group.id}-f3`,
      status: 'requer-confirmacao',
      text: 'Confirmar dados oficiais, números e posicionamentos das partes envolvidas.',
    },
  ];

  if (group.sources.length > 1) {
    facts.push({
      id: `${group.id}-f4`,
      status: 'requer-confirmacao',
      text: 'Há divergência potencial entre fontes sobre detalhes do caso. Validar versão final antes da publicação.',
    });
  }

  return facts;
}

function buildImageSuggestions(group: RadarNewsGroup): RadarDraftImageSuggestion[] {
  if (!group.imageUrl) {
    return [];
  }

  return [
    {
      id: `${group.id}-img-1`,
      url: group.imageUrl,
      previewUrl: group.imageUrl,
      origin: group.sources[0]?.sourceName ?? 'Fonte externa',
      author: 'Não informado',
      license: 'Licença não informada',
      rights: 'Verificar direitos de uso antes de publicar',
      caption: `Imagem relacionada a: ${group.headline}`,
      credit: `Crédito: ${group.sources[0]?.sourceName ?? 'Fonte externa'}`,
      usageAllowed: false,
    },
  ];
}

export function createRadarEditorDraft(group: RadarNewsGroup): RadarEditorDraft {
  const primaryKeyword = group.matchedKeywords[0] ?? getRadarCategoryLabel(group.category);
  const titleOptions = buildTitleOptions(group, primaryKeyword);
  const suggestedTitle = titleOptions[0] ?? group.headline;
  const subtitle = truncate(group.summary || `Cobertura em ${group.relatedSourcesCount} fontes com atualização contínua do Radar RBN.`, 180);
  const excerpt = truncate(group.summary || group.headline, 220);
  const facts = buildFacts(group);
  const imageSuggestions = buildImageSuggestions(group);
  const keywords = uniqueNonEmpty([
    primaryKeyword,
    ...group.matchedKeywords,
    getRadarCategoryLabel(group.category),
    group.country,
  ]).slice(0, 10);

  const sources = group.sources.slice(0, 8).map((source) => ({
    name: source.sourceName,
    url: source.articleUrl,
    country: source.country,
    reliability: source.reliability,
    articleTitle: source.title,
    publishedAt: source.publishedAt,
  }));

  const sourceItemsHtml = sources
    .map(
      (source) =>
        `<li><a href="${source.url}" target="_blank" rel="noreferrer">${source.name}</a> (${source.country}) — confiabilidade ${source.reliability}/5</li>`
    )
    .join('');

  const contentHtml = [
    `<p><strong>Lead:</strong> ${group.summary}</p>`,
    `<p>O acontecimento "${group.headline}" foi identificado pelo Radar de Notícias com score de relevância ${group.relevanceScore}/100 e crescimento ${group.growthScore}.</p>`,
    '<h2>Contexto</h2>',
    `<p>Até o momento, a cobertura aparece em ${group.relatedSourcesCount} fonte(s), com diferentes recortes editoriais. A recomendação é validar os pontos críticos em fontes primárias antes da publicação final.</p>`,
    '<h2>Dados e apuração</h2>',
    '<p>Inclua aqui números, datas e declarações somente após confirmação documental ou oficial.</p>',
    '<h2>Fontes utilizadas</h2>',
    `<ul>${sourceItemsHtml}</ul>`,
    '<h2>Informações que exigem confirmação</h2>',
    '<ul><li>Dados oficiais mais recentes.</li><li>Contraponto dos envolvidos.</li><li>Impacto local para o leitor do RBN.</li></ul>',
  ].join('');

  return {
    id: `${Date.now()}-${group.id}`,
    sourceGroupId: group.id,
    generatedAt: new Date().toISOString(),
    category: group.category,
    location: group.country || 'Brasil',
    suggestedTitle,
    titleOptions,
    subtitle,
    excerpt,
    contentHtml,
    seoDescription: truncate(`${suggestedTitle}. ${excerpt}`, 160),
    slugSuggestion: toSlug(suggestedTitle),
    keywords,
    sources,
    facts,
    imageSuggestions,
  };
}
