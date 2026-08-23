export type RadarCategory =
  | 'brasil'
  | 'mundo'
  | 'politica'
  | 'economia'
  | 'esportes'
  | 'cultura'
  | 'entretenimento'
  | 'tecnologia'
  | 'ciencia'
  | 'saude'
  | 'educacao'
  | 'meio-ambiente'
  | 'seguranca'
  | 'geral';

export type RadarRelevanceLevel = 'muito-relevante' | 'relevante' | 'atencao' | 'baixa';

export type RadarSort =
  | 'recentes'
  | 'relevantes'
  | 'crescimento'
  | 'fontes';

export type RadarTimeFilter =
  | 'agora'
  | '15m'
  | '1h'
  | '6h'
  | '24h'
  | '7d';

export type RadarSourceType = 'rss' | 'api' | 'feed';

export type RadarSource = {
  id: string;
  name: string;
  url: string;
  type: RadarSourceType;
  country: string;
  categories: RadarCategory[];
  reliability: 1 | 2 | 3 | 4 | 5;
  enabled: boolean;
};

export type RadarNewsItem = {
  id: string;
  title: string;
  summary: string;
  url: string;
  imageUrl: string;
  sourceName: string;
  sourceUrl: string;
  sourceReliability: number;
  category: RadarCategory;
  country: string;
  publishedAt: string;
  fetchedAt: string;
  relevanceScore: number;
  relevanceLevel: RadarRelevanceLevel;
  isNew: boolean;
  growthScore: number;
  relatedSourcesCount: number;
  groupId: string;
  matchedKeywords: string[];
};

export type RadarTopic = {
  id: string;
  label: string;
  relevanceLevel: RadarRelevanceLevel;
  mentions: number;
  growthScore: number;
};

export const RADAR_CATEGORIES: Array<{ id: RadarCategory; label: string }> = [
  { id: 'brasil', label: 'Brasil' },
  { id: 'mundo', label: 'Mundo' },
  { id: 'politica', label: 'Política' },
  { id: 'economia', label: 'Economia' },
  { id: 'esportes', label: 'Esportes' },
  { id: 'cultura', label: 'Cultura' },
  { id: 'entretenimento', label: 'Entretenimento' },
  { id: 'tecnologia', label: 'Tecnologia' },
  { id: 'ciencia', label: 'Ciência' },
  { id: 'saude', label: 'Saúde' },
  { id: 'educacao', label: 'Educação' },
  { id: 'meio-ambiente', label: 'Meio Ambiente' },
  { id: 'seguranca', label: 'Segurança' },
  { id: 'geral', label: 'Geral' },
];

export const RADAR_TIME_FILTERS: Array<{ id: RadarTimeFilter; label: string }> = [
  { id: 'agora', label: 'Agora' },
  { id: '15m', label: 'Últimos 15 minutos' },
  { id: '1h', label: 'Última hora' },
  { id: '6h', label: 'Últimas 6 horas' },
  { id: '24h', label: 'Últimas 24 horas' },
  { id: '7d', label: 'Últimos 7 dias' },
];

export const RADAR_REFRESH_OPTIONS = [5, 10, 15, 30, 60];

export const RADAR_DEFAULT_SOURCES: RadarSource[] = [
  {
    id: 'agencia-brasil',
    name: 'Agência Brasil',
    url: 'https://agenciabrasil.ebc.com.br/rss/geral/feed.xml',
    type: 'rss',
    country: 'Brasil',
    categories: ['brasil', 'politica', 'economia', 'geral'],
    reliability: 5,
    enabled: true,
  },
  {
    id: 'g1',
    name: 'G1',
    url: 'https://g1.globo.com/rss/g1/',
    type: 'rss',
    country: 'Brasil',
    categories: ['brasil', 'geral'],
    reliability: 4,
    enabled: true,
  },
  {
    id: 'bbc-brasil',
    name: 'BBC News Brasil',
    url: 'https://feeds.bbci.co.uk/portuguese/rss.xml',
    type: 'rss',
    country: 'Reino Unido',
    categories: ['mundo', 'politica', 'economia', 'tecnologia', 'geral'],
    reliability: 5,
    enabled: true,
  },
  {
    id: 'reuters-world',
    name: 'Reuters World',
    url: 'https://feeds.reuters.com/Reuters/worldNews',
    type: 'rss',
    country: 'Global',
    categories: ['mundo', 'politica', 'economia', 'geral'],
    reliability: 5,
    enabled: true,
  },
];

const CATEGORY_KEYWORDS: Record<RadarCategory, string[]> = {
  brasil: ['brasil', 'brasileiro', 'brasileira', 'são paulo', 'rio de janeiro', 'brasilia'],
  mundo: ['mundo', 'internacional', 'eua', 'europa', 'ásia', 'africa', 'onu'],
  politica: ['política', 'governo', 'congresso', 'stf', 'presidente', 'senado', 'câmara', 'eleição'],
  economia: ['economia', 'mercado', 'dólar', 'inflação', 'banco central', 'ibovespa', 'fiscal', 'juros'],
  esportes: ['esporte', 'futebol', 'copa', 'flamengo', 'corinthians', 'real madrid', 'nba', 'fifa'],
  cultura: ['cultura', 'museu', 'teatro', 'livro', 'arte'],
  entretenimento: ['entretenimento', 'cinema', 'série', 'novela', 'show', 'celebridade', 'famoso'],
  tecnologia: ['tecnologia', 'ia', 'inteligência artificial', 'startup', 'software', 'apple', 'google'],
  ciencia: ['ciência', 'pesquisa', 'estudo', 'laboratório', 'espacial'],
  saude: ['saúde', 'hospital', 'vacina', 'sus', 'doença', 'epidemia'],
  educacao: ['educação', 'escola', 'universidade', 'enem', 'professor'],
  'meio-ambiente': ['meio ambiente', 'clima', 'amazônia', 'desmatamento', 'sustentabilidade'],
  seguranca: ['segurança', 'polícia', 'crime', 'operação', 'violência'],
  geral: [],
};

export function getTimeFilterMs(filter: RadarTimeFilter) {
  switch (filter) {
    case 'agora':
      return 5 * 60 * 1000;
    case '15m':
      return 15 * 60 * 1000;
    case '1h':
      return 60 * 60 * 1000;
    case '6h':
      return 6 * 60 * 60 * 1000;
    case '24h':
      return 24 * 60 * 60 * 1000;
    case '7d':
    default:
      return 7 * 24 * 60 * 60 * 1000;
  }
}

export function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function inferCategoryFromText(title: string, summary: string, fallback: RadarCategory = 'geral'): RadarCategory {
  const haystack = normalizeText(`${title} ${summary}`);
  for (const category of RADAR_CATEGORIES) {
    const keywords = CATEGORY_KEYWORDS[category.id];
    if (keywords.some((keyword) => haystack.includes(normalizeText(keyword)))) {
      return category.id;
    }
  }

  return fallback;
}

export function getRelevanceLevel(score: number): RadarRelevanceLevel {
  if (score >= 75) {
    return 'muito-relevante';
  }
  if (score >= 55) {
    return 'relevante';
  }
  if (score >= 35) {
    return 'atencao';
  }
  return 'baixa';
}

