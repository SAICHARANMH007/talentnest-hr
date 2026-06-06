const CACHE_NAME = 'talentnest-v6';

// Install: skip waiting so the new SW activates immediately.
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

// Activate: clear all caches and claim clients.
// client.navigate() removed — forcing open tabs to reload triggers App.jsx's
// ErrorBoundary reload loop during Vercel CDN propagation, causing persistent
// white screen on every deployment.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// No fetch handler intentionally.
// Removing SW caching prevents stale index.html from being served after
// a new Vercel deployment, which was causing white screens on every push.
// Vite's content-hashed asset filenames + Vercel's immutable cache headers
// give equivalent (and correct) caching without SW interference.

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'TalentNest HR', body: event.data.text() };
  }
  const options = {
    body: data.body || '',
    icon: '/logo.svg',
    badge: '/logo.svg',
    data: { url: data.url || '/' },
    vibrate: [100, 50, 100],
    actions: data.actions || [],
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'TalentNest HR', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
      return undefined;
    })
  );
});
