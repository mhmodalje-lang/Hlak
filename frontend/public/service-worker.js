/* BARBER HUB - Service Worker
 * Offline-first caching, background sync, push notifications.
 * Trusted, Google-compliant PWA worker.
 */

const CACHE_VERSION = 'barber-hub-v1.0.2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Core assets to precache (keep minimal — CRA hashes other assets)
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/offline.html',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('[SW] Precache partial failure:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Helper — cache with size limit
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    await trimCache(cacheName, maxItems);
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET
  if (req.method !== 'GET') return;

  // Skip chrome-extension, websocket etc.
  if (!url.protocol.startsWith('http')) return;

  // Skip hot-reload / websocket endpoints
  if (url.pathname.startsWith('/ws') || url.pathname.includes('hot-update')) return;

  // API requests — network-first with fallback to cache (short-lived)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Cache only successful GET API responses for resilience
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(API_CACHE).then((c) => {
              c.put(req, clone);
              trimCache(API_CACHE, 50);
            });
          }
          return res;
        })
        .catch(() => caches.match(req).then((m) => m || new Response(JSON.stringify({ offline: true, message: 'Offline — cached data unavailable' }), { headers: { 'Content-Type': 'application/json' }, status: 503 })))
    );
    return;
  }

  // Images — cache-first
  if (req.destination === 'image' || /\.(png|jpg|jpeg|webp|gif|svg|ico)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(IMAGE_CACHE).then((c) => {
              c.put(req, clone);
              trimCache(IMAGE_CACHE, 80);
            });
          }
          return res;
        }).catch(() => cached);
      })
    );
    return;
  }

  // Navigation requests — network-first, fallback to cached index/offline
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, clone));
          return res;
        })
        .catch(() =>
          caches.match(req).then((m) => m || caches.match('/index.html') || caches.match('/offline.html'))
        )
    );
    return;
  }

  // Static assets (JS/CSS) — stale-while-revalidate
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(RUNTIME_CACHE).then((c) => {
              c.put(req, clone);
              trimCache(RUNTIME_CACHE, 60);
            });
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// Push Notifications
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'BARBER HUB', body: event.data ? event.data.text() : 'You have a new notification' };
  }

  const title = data.title || 'BARBER HUB';
  const options = {
    body: data.body || data.message || '',
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/icon-96.png',
    image: data.image,
    dir: 'auto',
    lang: data.lang || 'ar',
    vibrate: [200, 100, 200],
    tag: data.tag || 'barberhub-default',
    renotify: !!data.renotify,
    requireInteraction: !!data.requireInteraction,
    data: {
      url: data.url || '/',
      ...data.data,
    },
    actions: data.actions || [
      { action: 'open', title: 'Open' },
      { action: 'close', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = (event.notification.data && event.notification.data.url) || '/';
  if (event.action === 'close') return;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if ('focus' in client) {
          client.navigate(urlToOpen).catch(() => {});
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(urlToOpen);
    })
  );
});

// Background sync — queue failed bookings etc.
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-bookings') {
    event.waitUntil(
      (async () => {
        const clients = await self.clients.matchAll();
        clients.forEach((c) => c.postMessage({ type: 'SYNC_BOOKINGS' }));
      })()
    );
  }
});

// Message channel — allow client to trigger SW update
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
  }
});
