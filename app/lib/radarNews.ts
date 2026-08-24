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

export type RadarGroupSource = {
  sourceName: string;
  sourceUrl: string;
  country: string;
  reliability: number;
  articleUrl: string;
  publishedAt: string;
  title: string;
};

export type RadarNewsGroup = {
  id: string;
  headline: string;
  summary: string;
  imageUrl: string;
  category: RadarCategory;
  country: string;
  firstPublishedAt: string;
  lastPublishedAt: string;
  fetchedAt: string;
  relevanceScore: number;
  relevanceLevel: RadarRelevanceLevel;
  isNew: boolean;
  growthScore: number;
  relatedSourcesCount: number;
  matchedKeywords: string[];
  sources: RadarGroupSource[];
  sampleItemIds: string[];
};

export type RadarTopic = {
  id: string;
  label: string;
  relevanceLevel: RadarRelevanceLevel;
  mentions: number;
  growthScore: number;
};

export type RadarPautaStatus =
  | 'nova-pauta'
  | 'em-apuracao'
  | 'em-producao'
  | 'revisao'
  | 'publicada'
  | 'descartada';

export type RadarPauta = {
  id: string;
  sourceGroupId: string;
  provisionalTitle: string;
  category: RadarCategory;
  summary: string;
  sources: Array<{ name: string; url: string; country: string; reliability: number }>;
  links: string[];
  confirmedInfo: string[];
  pendingInfo: string[];
  approachSuggestions: string[];
  seoKeywords: string[];
  discoveredAt: string;
  updatedAt: string;
  status: RadarPautaStatus;
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

export const RADAR_PAUTA_STATUS_OPTIONS: Array<{ id: RadarPautaStatus; label: string }> = [
  { id: 'nova-pauta', label: 'Nova pauta' },
  { id: 'em-apuracao', label: 'Em apuração' },
  { id: 'em-producao', label: 'Em produção' },
  { id: 'revisao', label: 'Revisão' },
  { id: 'publicada', label: 'Publicada' },
  { id: 'descartada', label: 'Descartada' },
];

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
    id: 'agencia-brasil-politica',
    name: 'Agência Brasil Política',
    url: 'https://agenciabrasil.ebc.com.br/rss/politica/feed.xml',
    type: 'rss',
    country: 'Brasil',
    categories: ['politica', 'brasil'],
    reliability: 5,
    enabled: true,
  },
  {
    id: 'agencia-brasil-economia',
    name: 'Agência Brasil Economia',
    url: 'https://agenciabrasil.ebc.com.br/rss/economia/feed.xml',
    type: 'rss',
    country: 'Brasil',
    categories: ['economia', 'brasil'],
    reliability: 5,
    enabled: true,
  },
  {
    id: 'agencia-brasil-cultura',
    name: 'Agência Brasil Cultura',
    url: 'https://agenciabrasil.ebc.com.br/rss/cultura/feed.xml',
    type: 'rss',
    country: 'Brasil',
    categories: ['cultura', 'entretenimento'],
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
    id: 'g1-politica',
    name: 'G1 Política',
    url: 'https://g1.globo.com/rss/g1/politica/',
    type: 'rss',
    country: 'Brasil',
    categories: ['politica', 'brasil'],
    reliability: 4,
    enabled: true,
  },
  {
    id: 'g1-economia',
    name: 'G1 Economia',
    url: 'https://g1.globo.com/rss/g1/economia/',
    type: 'rss',
    country: 'Brasil',
    categories: ['economia', 'brasil'],
    reliability: 4,
    enabled: true,
  },
  {
    id: 'g1-pop-arte',
    name: 'G1 Pop & Arte',
    url: 'https://g1.globo.com/rss/g1/pop-arte/',
    type: 'rss',
    country: 'Brasil',
    categories: ['cultura', 'entretenimento'],
    reliability: 4,
    enabled: true,
  },
  {
    id: 'ge-globo',
    name: 'GE',
    url: 'https://ge.globo.com/rss/ge/',
    type: 'rss',
    country: 'Brasil',
    categories: ['esportes'],
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
    id: 'dw-brasil',
    name: 'Deutsche Welle Brasil',
    url: 'https://rss.dw.com/rdf/rss-pt-br',
    type: 'rss',
    country: 'Alemanha',
    categories: ['mundo', 'politica', 'economia'],
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
  {
    id: 'reuters-business',
    name: 'Reuters Business',
    url: 'https://feeds.reuters.com/reuters/businessNews',
    type: 'rss',
    country: 'Global',
    categories: ['economia', 'mundo'],
    reliability: 5,
    enabled: true,
  },
  {
    id: 'cnn-brasil',
    name: 'CNN Brasil',
    url: 'https://www.cnnbrasil.com.br/feed/',
    type: 'rss',
    country: 'Brasil',
    categories: ['brasil', 'mundo', 'politica', 'economia', 'geral'],
    reliability: 4,
    enabled: true,
  },
  {
    id: 'uol-noticias',
    name: 'UOL Notícias',
    url: 'https://rss.uol.com.br/feed/noticias.xml',
    type: 'rss',
    country: 'Brasil',
    categories: ['brasil', 'politica', 'economia', 'geral'],
    reliability: 4,
    enabled: true,
  },
  {
    id: 'folha-mercado',
    name: 'Folha Mercado',
    url: 'https://feeds.folha.uol.com.br/mercado/rss091.xml',
    type: 'rss',
    country: 'Brasil',
    categories: ['economia', 'brasil'],
    reliability: 5,
    enabled: true,
  },
  {
    id: 'folha-em-cima-da-hora',
    name: 'Folha Em Cima da Hora',
    url: 'https://feeds.folha.uol.com.br/emcimadahora/rss091.xml',
    type: 'rss',
    country: 'Brasil',
    categories: ['brasil', 'politica', 'geral'],
    reliability: 5,
    enabled: true,
  },
  {
    id: 'estadao-ultimas',
    name: 'Estadão Últimas',
    url: 'https://www.estadao.com.br/rss/ultimas.xml',
    type: 'rss',
    country: 'Brasil',
    categories: ['brasil', 'politica', 'economia', 'geral'],
    reliability: 5,
    enabled: true,
  },
  {
    id: 'oglobo-ultimas',
    name: 'O Globo Últimas',
    url: 'https://oglobo.globo.com/rss/ultimas.xml',
    type: 'rss',
    country: 'Brasil',
    categories: ['brasil', 'politica', 'economia', 'geral'],
    reliability: 5,
    enabled: true,
  },
  {
    id: 'metropoles',
    name: 'Metrópoles',
    url: 'https://www.metropoles.com/feed',
    type: 'rss',
    country: 'Brasil',
    categories: ['brasil', 'politica', 'geral'],
    reliability: 4,
    enabled: true,
  },
  {
    id: 'poder360',
    name: 'Poder360',
    url: 'https://www.poder360.com.br/feed/',
    type: 'rss',
    country: 'Brasil',
    categories: ['politica', 'economia', 'brasil'],
    reliability: 4,
    enabled: true,
  },
  {
    id: 'congresso-em-foco',
    name: 'Congresso em Foco',
    url: 'https://congressoemfoco.uol.com.br/feed/',
    type: 'rss',
    country: 'Brasil',
    categories: ['politica', 'brasil'],
    reliability: 4,
    enabled: true,
  },
  {
    id: 'agencia-senado',
    name: 'Agência Senado',
    url: 'https://www12.senado.leg.br/noticias/rss',
    type: 'rss',
    country: 'Brasil',
    categories: ['politica', 'brasil'],
    reliability: 5,
    enabled: true,
  },
  {
    id: 'agencia-camara',
    name: 'Agência Câmara',
    url: 'https://www.camara.leg.br/noticias/feed/',
    type: 'rss',
    country: 'Brasil',
    categories: ['politica', 'brasil'],
    reliability: 5,
    enabled: true,
  },
  {
    id: 'valor-economico',
    name: 'Valor Econômico',
    url: 'https://valor.globo.com/rss/',
    type: 'rss',
    country: 'Brasil',
    categories: ['economia'],
    reliability: 5,
    enabled: true,
  },
  {
    id: 'infomoney',
    name: 'InfoMoney',
    url: 'https://www.infomoney.com.br/feed/',
    type: 'rss',
    country: 'Brasil',
    categories: ['economia', 'tecnologia'],
    reliability: 4,
    enabled: true,
  },
  {
    id: 'exame',
    name: 'Exame',
    url: 'https://exame.com/feed/',
    type: 'rss',
    country: 'Brasil',
    categories: ['economia', 'tecnologia', 'geral'],
    reliability: 4,
    enabled: true,
  },
  {
    id: 'bloomberg',
    name: 'Bloomberg',
    url: 'https://feeds.bloomberg.com/markets/news.rss',
    type: 'rss',
    country: 'Global',
    categories: ['economia', 'mundo'],
    reliability: 5,
    enabled: true,
  },
  {
    id: 'financial-times',
    name: 'Financial Times',
    url: 'https://www.ft.com/rss/home',
    type: 'rss',
    country: 'Reino Unido',
    categories: ['economia', 'mundo', 'politica'],
    reliability: 5,
    enabled: true,
  },
  {
    id: 'nasa-breaking-news',
    name: 'NASA',
    url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss',
    type: 'rss',
    country: 'Estados Unidos',
    categories: ['ciencia', 'tecnologia'],
    reliability: 5,
    enabled: true,
  },
  {
    id: 'nature',
    name: 'Nature',
    url: 'https://www.nature.com/nature.rss',
    type: 'rss',
    country: 'Global',
    categories: ['ciencia', 'saude', 'tecnologia'],
    reliability: 5,
    enabled: true,
  },
  {
    id: 'tecmundo',
    name: 'TecMundo',
    url: 'https://rss.tecmundo.com.br/feed',
    type: 'rss',
    country: 'Brasil',
    categories: ['tecnologia', 'ciencia'],
    reliability: 4,
    enabled: true,
  },
  {
    id: 'canaltech',
    name: 'Canaltech',
    url: 'https://canaltech.com.br/rss/',
    type: 'rss',
    country: 'Brasil',
    categories: ['tecnologia', 'ciencia'],
    reliability: 4,
    enabled: true,
  },
  {
    id: 'olhar-digital',
    name: 'Olhar Digital',
    url: 'https://olhardigital.com.br/feed/',
    type: 'rss',
    country: 'Brasil',
    categories: ['tecnologia', 'ciencia'],
    reliability: 4,
    enabled: true,
  },
  {
    id: 'who-news',
    name: 'Organização Mundial da Saúde',
    url: 'https://www.who.int/rss-feeds/news-english.xml',
    type: 'rss',
    country: 'Global',
    categories: ['saude'],
    reliability: 5,
    enabled: true,
  },
  {
    id: 'guardian-world',
    name: 'The Guardian World',
    url: 'https://www.theguardian.com/world/rss',
    type: 'rss',
    country: 'Reino Unido',
    categories: ['mundo', 'politica'],
    reliability: 5,
    enabled: true,
  },
  {
    id: 'nytimes-home',
    name: 'The New York Times',
    url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml',
    type: 'rss',
    country: 'Estados Unidos',
    categories: ['mundo', 'politica', 'economia'],
    reliability: 5,
    enabled: true,
  },
  {
    id: 'washington-post-world',
    name: 'The Washington Post World',
    url: 'https://feeds.washingtonpost.com/rss/world',
    type: 'rss',
    country: 'Estados Unidos',
    categories: ['mundo', 'politica'],
    reliability: 5,
    enabled: true,
  },
  {
    id: 'al-jazeera',
    name: 'Al Jazeera',
    url: 'https://www.aljazeera.com/xml/rss/all.xml',
    type: 'rss',
    country: 'Catar',
    categories: ['mundo', 'politica'],
    reliability: 4,
    enabled: true,
  },
  {
    id: 'france24',
    name: 'France 24',
    url: 'https://www.france24.com/en/rss',
    type: 'rss',
    country: 'França',
    categories: ['mundo', 'politica'],
    reliability: 4,
    enabled: true,
  },
  {
    id: 'euronews',
    name: 'Euronews',
    url: 'https://www.euronews.com/rss',
    type: 'rss',
    country: 'Europa',
    categories: ['mundo', 'politica', 'economia'],
    reliability: 4,
    enabled: true,
  },
  {
    id: 'el-pais',
    name: 'El País',
    url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada',
    type: 'rss',
    country: 'Espanha',
    categories: ['mundo', 'politica', 'economia'],
    reliability: 4,
    enabled: true,
  },
  {
    id: 'le-monde',
    name: 'Le Monde',
    url: 'https://www.lemonde.fr/en/rss/une.xml',
    type: 'rss',
    country: 'França',
    categories: ['mundo', 'politica'],
    reliability: 4,
    enabled: true,
  },
  {
    id: 'cnn-international',
    name: 'CNN International',
    url: 'http://rss.cnn.com/rss/edition.rss',
    type: 'rss',
    country: 'Estados Unidos',
    categories: ['mundo', 'politica', 'economia', 'geral'],
    reliability: 4,
    enabled: true,
  },
  {
    id: 'national-geographic',
    name: 'National Geographic',
    url: 'https://www.nationalgeographic.com/content/natgeo/en_us/index.rss',
    type: 'rss',
    country: 'Global',
    categories: ['ciencia', 'meio-ambiente'],
    reliability: 4,
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

export function getRadarCategoryLabel(category: RadarCategory) {
  return RADAR_CATEGORIES.find((item) => item.id === category)?.label ?? 'Geral';
}
