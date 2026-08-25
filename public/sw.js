const CACHE = 'marlenne-shell-v2';
const PRECACHE = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/voice/dime.wav',
  '/voice/que-hacemos.wav',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isHashedAsset(url) {
  return url.pathname.startsWith('/_next/static/')
    || /\.(png|js|css|woff2|wav)$/.test(url.pathname)
    || url.pathname === '/manifest.json';
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.searchParams.has('_rsc')) return;

  if (isHashedAsset(url)) {
    event.respondWith(
      caches.match(req).then(cached => {
        const fetched = fetch(req).then(res => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy));
          }
          return res;
        }).catch(() => cached);
        return cached || fetched;
      }),
    );
    return;
  }

  event.respondWith(fetch(req).catch(() => caches.match(req)));
});
