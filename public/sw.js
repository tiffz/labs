// Kill-switch service worker: immediately unregisters any previously installed SW.
// Deployed to replace a stale vite-plugin-pwa service worker that was removed
// from the build but still active in returning visitors' browsers.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.map((name) => caches.delete(name)))
    ).then(() => self.registration.unregister())
     .then(() => self.clients.matchAll())
     .then((clients) => clients.forEach((c) => c.navigate(c.url)))
  );
});
