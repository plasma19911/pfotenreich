// Pfotenreich – Service Worker: alle Dateien offline verfügbar (Cache-first, Update im Hintergrund)
const CACHE = 'pfotenreich-v1.1.0-natural';
const FILES = ['./', 'index.html', 'style.css', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png',
  'js/util.js', 'js/data.js', 'js/cats.js', 'js/world.js', 'js/events.js', 'js/events_content.js', 'js/sim.js', 'js/save.js',
  'js/art.js', 'js/render.js', 'js/audio.js', 'js/ui.js', 'js/main.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => {
    const net = fetch(e.request).then((res) => { if (res.ok && new URL(e.request.url).origin === location.origin) { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)); } return res; }).catch(() => hit);
    return hit || net;
  }));
});
