var CACHE = 'jade-stock-v5';
var ASSETS = [
  '/',
  '/index.html',
  '/app.html',
  '/404.html',
  '/style.css',
  '/manifest.json',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/api.js',
  '/app.js',
  '/scanner.js',
  '/pdv.js',
  '/produtos-ui.js',
  '/estoque-ui.js',
  '/nfemapper-ui.js',
  '/custos-ui.js',
  '/fornecedores-ui.js',
  '/dashboard-ui.js',
  '/relatorios-ui.js',
  '/manifest.js'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) { return c.addAll(ASSETS); })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  // Nunca intercepta POST ou URLs externas
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request).then(function(resp) {
        var clone = resp.clone();
        caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
        return resp;
      });
    })
  );
});
