const SHELL = 'marlenne-shell-v30';
const PAGES = 'marlenne-pages-v2';
const NET_WAIT_MS = 3000;

const PRECACHE = [
  '/manifest.json',
  '/logo.png',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-1024.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    await self.skipWaiting();
    const cache = await caches.open(SHELL);
    await Promise.all(PRECACHE.map(u => cache.add(u).catch(() => undefined)));
  })());
});

self.addEventListener('message', event => {
  const type = event.data && event.data.type;
  if (type === 'SKIP_WAITING') self.skipWaiting();
  if (type === 'CLEAR_PAGES') event.waitUntil(caches.delete(PAGES));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL, PAGES]);
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => !keep.has(k)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

function isHashedAsset(url) {
  if (url.pathname === '/sw.js') return false;
  return url.pathname.startsWith('/_next/static/')
    || /\.(png|js|css|woff2|wav|mp3)$/.test(url.pathname)
    || url.pathname === '/manifest.json';
}

function isLocalDev() {
  return self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';
}

/** Auth y ops: sin interceptar (redirects, cookies, iframe soporte). */
function bypassServiceWorker(url) {
  if (url.pathname === '/ops-embed.html') return true;
  if (url.pathname.startsWith('/ops/')) return true;
  if (/^\/(login|auth\/|recuperar|registro)(\/|$)/.test(url.pathname)) return true;
  return false;
}

function offlineResponse() {
  return new Response('Sin conexión', {
    status: 503,
    statusText: 'Offline',
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

function pageCacheUrl(req) {
  const url = new URL(req.url);
  url.searchParams.delete('_rsc');
  url.searchParams.set('__cache', req.headers.get('RSC') === '1' ? 'rsc' : 'doc');
  url.hash = '';
  return url.href;
}

/** El prefetch automático de un enlace es parcial: no vale como pantalla completa. */
function isPartialPrefetch(req) {
  return req.headers.get('Next-Router-Prefetch') === '1';
}

async function rememberPage(req, res) {
  if (isPartialPrefetch(req)) return;
  if (!res || !res.ok || res.redirected || res.type !== 'basic') return;
  const cache = await caches.open(PAGES);
  await cache.put(pageCacheUrl(req), res.clone());
}

async function matchPage(req) {
  const cache = await caches.open(PAGES);
  return cache.match(pageCacheUrl(req));
}

/** Red con tope. Si tarda o cae, la última copia de esa URL (Hoy, clientas, servicios, reserva). */
async function pageWithTimeout(req) {
  const cached = await matchPage(req);
  let timer;
  const timeout = new Promise(resolve => {
    timer = setTimeout(() => resolve('slow'), NET_WAIT_MS);
  });
  const arrived = fetch(req).then(
    res => ({ res }),
    () => ({ res: null }),
  );
  const winner = await Promise.race([
    arrived.then(r => (r.res ? 'net' : 'fail')),
    timeout,
  ]);
  clearTimeout(timer);

  if (winner === 'net') {
    const { res } = await arrived;
    if (res.ok) {
      void rememberPage(req, res);
      return res;
    }
    if (cached) return cached;
    return res;
  }

  if (winner === 'slow') {
    void arrived.then(r => { if (r.res) void rememberPage(req, r.res); });
    if (cached) return cached;
  }

  const { res } = await arrived;
  if (res && res.ok) {
    void rememberPage(req, res);
    return res;
  }
  if (cached) return cached;
  return res || offlineResponse();
}

async function cacheFirstAsset(req) {
  const cache = await caches.open(SHELL);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok && res.type === 'basic') {
      void cache.put(req, res.clone());
    }
    return res;
  } catch {
    return new Response('', { status: 504, statusText: 'Gateway Timeout' });
  }
}

self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: event.data ? event.data.text() : 'Marlén' };
  }
  const title = data.title || 'Marlén';
  const path = data.url || '/hoy';
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    tag: data.tag || 'staff-appt',
    data: { url: path },
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const path = (event.notification.data && event.notification.data.url) || '/hoy';
  const target = new URL(path, self.location.origin).href;
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const client = all.find(c => {
      try { return new URL(c.url).origin === self.location.origin; } catch { return false; }
    });
    if (!client) {
      await self.clients.openWindow(target);
      return;
    }
    if (typeof client.postMessage === 'function') {
      client.postMessage({ type: 'OPEN_APPT', url: path });
    }
    try { await client.focus(); } catch { /* */ }
  })());
});

self.addEventListener('fetch', event => {
  if (isLocalDev()) return;
  const req = event.request;
  if (req.method !== 'GET') return;
  if (req.headers.get('range')) return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname === '/sw.js' || url.pathname === '/app-build.txt') return;
  if (bypassServiceWorker(url)) return;

  if (isHashedAsset(url)) {
    event.respondWith(cacheFirstAsset(req));
    return;
  }

  event.respondWith(pageWithTimeout(req));
});
