import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'RBN',
    short_name: 'RBN',
    description: 'Portal de notícias com credibilidade, contexto e cobertura completa do Brasil e do mundo.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FFFFFF',
    theme_color: '#991B1B',
    orientation: 'portrait-primary',
    id: '/',
    scope: '/',
    categories: ['news', 'business', 'politics'],
    lang: 'pt-BR',
    icons: [
      {
        src: '/rbn-icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/rbn-icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      { name: 'Últimas notícias', short_name: 'Notícias', url: '/', icons: [{ src: '/rbn-icon-192.png', sizes: '192x192' }] },
      { name: 'Pesquisar', short_name: 'Pesquisar', url: '/pesquisa', icons: [{ src: '/rbn-icon-192.png', sizes: '192x192' }] },
    ],
  };
}
