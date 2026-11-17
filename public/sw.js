// Service worker: keeps the app shell (CSS, scripts, images) fast and shows a friendly page when offline.
// It deliberately does NOT cache pages or API answers: they can contain personal data (account, location,
// admin screens) and must always be fresh. Bump VERSION when this file's behaviour changes.
const VERSION = 'wib-v1';
const STATIC = `${VERSION}-static`;
const PRECACHE = ['/offline.html', '/css/main.css', '/images/logo-icon.png', '/icons/icon-192.png'];
const STATIC_PATHS = ['/css/', '/js/', '/images/', '/icons/', '/vendor/leaflet/'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC)
      // One missing file must not stop the whole install.
      .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('wib-') && k !== STATIC).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function staleWhileRevalidate(req) {
  const cache = await caches.open(STATIC);
  const cached = await cache.match(req);
  const fresh = fetch(req)
    .then((res) => { if (res.ok) cache.put(req, res.clone()); return res; })
    .catch(() => cached);
  return cached || fresh;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // never touch form posts
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // map tiles, fonts: the browser handles them
  if (url.pathname.startsWith('/api/')) return; // always live

  if (req.mode === 'navigate') {
    // Pages: always from the network; only when offline show the offline page.
    event.respondWith(fetch(req).catch(() => caches.match('/offline.html')));
    return;
  }
  if (STATIC_PATHS.some((p) => url.pathname.startsWith(p))) {
    event.respondWith(staleWhileRevalidate(req));
  }
});