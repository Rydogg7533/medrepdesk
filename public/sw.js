// MedRepDesk Push Notification + Caching Service Worker
// Handles: push events, notification clicks, offline caching

const CACHE_NAME = 'medrepdesk-v1';
const STATIC_ASSETS = [
  '/',
  '/icon-192.png',
  '/icon-512.png',
];

// ─── Install: precache static assets ───────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ─── Activate: clean old caches ────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ─── Fetch: cache-first for static, network-first for API ───
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Supabase API calls: network-first
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static assets (JS, CSS, images, fonts): cache-first
  if (
    url.origin === self.location.origin &&
    (request.destination === 'script' ||
     request.destination === 'style' ||
     request.destination === 'image' ||
     request.destination === 'font' ||
     url.pathname.endsWith('.js') ||
     url.pathname.endsWith('.css') ||
     url.pathname.endsWith('.png') ||
     url.pathname.endsWith('.svg') ||
     url.pathname.endsWith('.woff2'))
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // HTML navigation: network-first, fall back to cached index
  if (request.destination === 'document' || request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match('/') || caches.match(request))
    );
    return;
  }
});

// ─── Push Notifications ────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = {
      title: 'MedRepDesk',
      body: event.data.text(),
    };
  }

  const { title, body, type, related_id, related_type, icon, badge } = payload;

  const options = {
    body: body || '',
    icon: icon || '/icon-192.png',
    badge: badge || '/icon-192.png',
    tag: type || 'general',
    renotify: true,
    data: { type, related_id, related_type },
    actions: [{ action: 'open', title: 'View' }],
  };

  event.waitUntil(self.registration.showNotification(title || 'MedRepDesk', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const { related_type, related_id } = event.notification.data || {};
  let url = '/notifications';

  if (related_id) {
    switch (related_type) {
      case 'case':
        url = `/cases/${related_id}`;
        break;
      case 'purchase_order':
        url = `/po/${related_id}`;
        break;
      case 'commission':
        url = `/commissions/${related_id}`;
        break;
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
