const CACHE_NAME = 'talentnest-v5';

// Install: skip waiting so the new SW activates immediately.
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

// Activate: delete ALL old caches, claim all clients, then force-reload every
// open tab so they pick up the new deployment immediately instead of continuing
// to run with whatever the old SW had served them.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
      .then((clientList) => {
        for (const client of clientList) {
          client.navigate(client.url);
        }
      })
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
