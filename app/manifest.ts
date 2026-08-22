import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'RBN Brasil',
    short_name: 'RBN',
    description: 'Portal de notícias com credibilidade, contexto e cobertura completa do Brasil e do mundo.',
    start_url: '/',
    display: 'standalone',
    background_color: '#111827',
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
  };
}
