const CACHE_NAME = 'grimoire-cache-v1';
const ASSETS = [
  './',
  './index.html',
  './script.js',
  './manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (e) => {
  // Laisse filer les requêtes de l'API Gemini et Firebase directement sur internet sans intercepter
  if (e.request.url.includes('googleapis.com') || e.request.url.includes('firebase')) {
    return e.respondWith(fetch(e.request));
  }

  // Stratégie pour les assets locaux de l'application
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
