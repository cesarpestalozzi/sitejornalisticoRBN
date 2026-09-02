const CACHE_NAME = 'rbn-brasil-cache-v2';
const CORE_ASSETS = ['/', '/favicon.ico', '/logo-oficial.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const requestUrl = new URL(request.url);
  const isSameOrigin = requestUrl.origin === self.location.origin;
  const isApiRequest = isSameOrigin && requestUrl.pathname.startsWith('/api/');
  const isRscRequest = requestUrl.searchParams.has('_rsc');
  const isHtmlDocument = request.headers.get('accept')?.includes('text/html');

  if (request.method !== 'GET') {
    return;
  }

  // Conteúdo dinâmico precisa vir da rede para não "congelar" manchetes antigas.
  // Se estiver offline, usa fallback de cache.
  if (request.mode === 'navigate' || isApiRequest || isRscRequest || isHtmlDocument) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok && isSameOrigin && request.mode === 'navigate') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((response) => {
          if (response && response.ok && request.url.startsWith(self.location.origin)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match('/'));
    })
  );
});
