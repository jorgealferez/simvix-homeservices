// Service worker mínimo para Simvix Obras (P24).
// - Cachea respuestas GET de /obras y /_next/static (cache-first con expiración).
// - Las llamadas a /api se dejan pasar siempre (no cache).
// - En offline, devuelve la última versión cacheada.
const CACHE = 'simvix-obras-v1';
const STATIC = [
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // No cachear APIs ni autenticación
  if (url.pathname.startsWith('/api/')) return;
  // Cache-first para estáticos y /obras navegable
  if (url.pathname.startsWith('/_next/static') || url.pathname.startsWith('/obras')) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const resp = await fetch(req);
          if (resp.ok) cache.put(req, resp.clone());
          return resp;
        } catch {
          return cached ?? new Response('Offline', { status: 503 });
        }
      }),
    );
  }
});
