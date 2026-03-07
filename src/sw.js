import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// ─── Activate immediately on update ───────────────────
self.skipWaiting();
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ─── Clean up old caches from previous versions ──────
cleanupOutdatedCaches();

// ─── Workbox precaching (injected by VitePWA) ─────────
precacheAndRoute(self.__WB_MANIFEST);

// ─── Supabase API: network-first with cache fallback ──
registerRoute(
  ({ url }) => url.hostname.includes('supabase.co'),
  new NetworkFirst({
    cacheName: 'supabase-api-v2',
    plugins: [
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 }),
    ],
  })
);

// ─── SPA navigation fallback ──────────────────────────
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'navigations',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 }),
    ],
  })
);

// ─── Push Notifications ───────────────────────────────
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
