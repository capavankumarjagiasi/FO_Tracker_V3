const CACHE = 'fo-tracker-v3';
const STATIC = [
  './',
  './index.html',
  './css/app.css',
  './js/app.js',
  './js/futures.js',
  './js/oi.js',
  './js/rollover.js',
  './js/pulse.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

// Install — pre-cache all static assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

// Activate — remove old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy:
//   JSON snapshot → network-first, cache fallback
//   Static assets → cache-first
self.addEventListener('fetch', e => {
  const url = e.request.url;
  const isJSON = url.endsWith('.json') || url.includes('raw.githubusercontent.com');

  if (isJSON) {
    e.respondWith(
      fetch(e.request)
        .then(r => {
          if (r.ok) {
            const clone = r.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return r;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request))
    );
  }
});

// Background sync — re-fetch JSON every 5 min when app is backgrounded
self.addEventListener('periodicsync', e => {
  if (e.tag === 'refresh-snapshot') {
    e.waitUntil(
      self.clients.matchAll().then(clients => {
        clients.forEach(c => c.postMessage({ type: 'BG_REFRESH' }));
      })
    );
  }
});
