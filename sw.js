// Basit "app shell" servis çalışanı: statik dosyaları önbelleğe alır,
// böylece oyun bir kez yüklendikten sonra çevrimdışı da açılabilir.
const CACHE_VERSION = 'mahalle-kacamagi-v9';
const PRECACHE_URLS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './js/config.js',
  './js/services/firebase.js',
  './js/services/authService.js',
  './js/services/friendsService.js',
  './js/services/roomService.js',
  './js/uiFriends.js',
  './js/constants.js',
  './js/effects.js',
  './js/sceneSetup.js',
  './js/characters.js',
  './js/world.js',
  './js/input.js',
  './js/audio.js',
  './js/game.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (!url.protocol.startsWith('http')) return;

  if (url.origin === self.location.origin) {
    // JS/HTML/CSS: Network-first (Güncel koda anında erişim, çevrimdışıyken cache)
    event.respondWith(
      fetch(request).then((response) => {
        if (response && response.ok && (request.url.startsWith('http://') || request.url.startsWith('https://'))) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone)).catch(() => {});
        }
        return response;
      }).catch(() => caches.match(request))
    );
    return;
  }

  // Üçüncü taraf (CDN three.js modülleri): stale-while-revalidate ile çevrimdışı desteği.
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request).then((response) => {
        if (response && response.ok && (request.url.startsWith('http://') || request.url.startsWith('https://'))) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone)).catch(() => {});
        }
        return response;
      }).catch(() => cached);
      return cached || networkFetch;
    })
  );
});
