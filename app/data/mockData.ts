// RBN - Mock Data for Development

import { Article, NewsCard, Category, Podcast, VideoContent } from '@/app/types';

export const categories: Category[] = [
  { id: '1', name: 'Últimas Notícias', slug: 'ultimas-noticias' },
  { id: '2', name: 'Política', slug: 'politica' },
  { id: '3', name: 'Brasil', slug: 'brasil' },
  { id: '4', name: 'Mundo', slug: 'mundo' },
  { id: '5', name: 'Economia', slug: 'economia' },
  { id: '6', name: 'Negócios', slug: 'negocios' },
  { id: '7', name: 'Tecnologia', slug: 'tecnologia' },
  { id: '8', name: 'Ciência', slug: 'ciencia' },
  { id: '9', name: 'Educação', slug: 'educacao' },
  { id: '10', name: 'Saúde', slug: 'saude' },
  { id: '11', name: 'Cultura', slug: 'cultura' },
  { id: '12', name: 'Cinema', slug: 'cinema' },
  { id: '13', name: 'Séries', slug: 'series' },
  { id: '14', name: 'Música', slug: 'musica' },
  { id: '15', name: 'Esportes', slug: 'esportes' },
  { id: '16', name: 'Futebol', slug: 'futebol' },
  { id: '17', name: 'Opinião', slug: 'opiniao' },
  { id: '18', name: 'Podcasts', slug: 'podcasts' },
  { id: '19', name: 'Colunistas', slug: 'colunistas' },
];

const baseDate = (daysAgo: number, hoursAgo = 0) => new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 - hoursAgo * 60 * 60 * 1000);

export const featuredArticle: Article = {
  id: 'article-1',
  title: 'Parlamentares aprovam novo pacote de medidas para reduzir a inflação no país',
  subtitle: 'Medida terá impacto direto na cesta básica e no crédito ao consumidor.',
  excerpt:
    'Aprovado em votação acelerada, o pacote busca reduzir custos e tentar estabilizar o consumo em meio à pressão sobre a cesta básica.',
  content:
    'Os deputados e senadores aprovaram um conjunto de medidas focado em reduzir a inflação e ampliar a previsibilidade econômica para famílias e pequenas empresas.',
  category: 'Política',
  author: 'Ana Paula Ribeiro',
  authorImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
  image: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=1200&q=80',
  date: baseDate(0, 2),
  readingTime: 5,
  tags: ['Política', 'Economia'],
  featured: true,
  views: 4853,
  comments: 184,
  shares: 96,
};

export const secondaryArticles: NewsCard[] = [
  {
    id: 'article-2',
    title: 'Setor de tecnologia registra crescimento em vagas e investimentos em IA',
    excerpt: 'A expansão de empresas de software e startups tem impulsionado oportunidades em IA, dados e automação em todo o país.',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
    category: 'Tecnologia',
    date: baseDate(1, 3),
    author: 'Mateus Costa',
    readingTime: 4,
  },
  {
    id: 'article-3',
    title: 'Eventos esportivos movimentam capitais e impulsionam turismo regional',
    excerpt: 'Com o calendário cheio de competições, cidades do interior e grandes capitais ganham movimento econômico e turístico.',
    image: 'https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=1200&q=80',
    category: 'Esportes',
    date: baseDate(2, 7),
    author: 'Rafael Nunes',
    readingTime: 3,
  },
  {
    id: 'article-4',
    title: 'Empresas de varejo investem em logística para atender pedidos por delivery',
    excerpt: 'Pequenas e médias empresas intensificam a automação logística para conquistar maior eficiência e fidelização.',
    image: 'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=1200&q=80',
    category: 'Economia',
    date: baseDate(3, 5),
    author: 'Camila Souza',
    readingTime: 5,
  },
  {
    id: 'article-5',
    title: 'Cultura local ganha espaço em festivais e novas produções independentes',
    excerpt: 'A cena cultural brasileira valoriza cada vez mais artistas independentes e experiências criativas regionais.',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
    category: 'Cultura',
    date: baseDate(5, 1),
    author: 'Lívia Martins',
    readingTime: 4,
  },
];

export const newsGrid = {
  politica: secondaryArticles.slice(0, 2),
  economia: [secondaryArticles[2]],
  mundo: [secondaryArticles[1]],
  tecnologia: [secondaryArticles[0]],
  esportes: [secondaryArticles[1]],
  entretenimento: [secondaryArticles[3]],
};

export const podcasts: Podcast[] = [
  {
    id: 'podcast-1',
    title: 'RBN em Foco: EUA e o novo cenário global',
    episode: 118,
    season: 1,
    description: 'Análise do impacto das decisões internacionais sobre a economia e o mercado brasileiro.',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
    date: baseDate(1, 3),
    duration: 1850,
  },
  {
    id: 'podcast-2',
    title: 'Tecnologia em Debate: IA, automação e carreira',
    episode: 117,
    season: 1,
    description: 'Um panorama sobre as tendências digitais e o futuro do trabalho em tecnologia.',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
    date: baseDate(2, 6),
    duration: 1640,
  },
];

export const videos: VideoContent[] = [
  {
    id: 'video-1',
    title: 'Resumo da semana em política e economia',
    thumbnail: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1200&q=80',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: 420,
    date: baseDate(0, 4),
    category: 'Política',
  },
  {
    id: 'video-2',
    title: 'Como a IA está mudando os negócios locais',
    thumbnail: 'https://images.unsplash.com/photo-1516321165247-4aa89a48be28?auto=format&fit=crop&w=1200&q=80',
    url: 'https://www.youtube.com/watch?v=ysz5S6PUM-U',
    duration: 510,
    date: baseDate(3, 5),
    category: 'Tecnologia',
  },
];
