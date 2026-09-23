const CACHE = 'marlenne-shell-v24';
const PRECACHE = [
  '/manifest.json',
  '/logo.png',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
  '/voice/dime.mp3',
  '/voice/te-escucho.mp3',
  '/voice/bien-aqui.mp3',
  '/voice/de-nada.mp3',
  '/voice/hasta-luego.mp3',
  '/voice/cuando-quieras.mp3',
  '/voice/algo-mas.mp3',
  '/voice/no-lo-he-pillado.mp3',
  '/voice/vale.mp3',
  '/voice/claro.mp3',
  '/voice/perfecto.mp3',
  '/voice/listo.mp3',
  '/voice/hecho.mp3',
  '/voice/la-guardo.mp3',
  '/voice/lo-apuntamos.mp3',
  '/voice/de-acuerdo.mp3',
  '/voice/que-servicio.mp3',
  '/voice/a-que-hora.mp3',
  '/voice/para-quien.mp3',
  '/voice/el-nombre.mp3',
  '/voice/nueva-cita.mp3',
  '/voice/abro-la-agenda.mp3',
  '/voice/no-pasa-nada.mp3',
  '/voice/un-segundo.mp3',
  '/voice/ahora-miro.mp3',
  '/voice/citas-huecos.mp3',
  '/voice/soy-marlenne.mp3',
  '/voice/gracias-algo-mas.mp3',
  '/voice/buenos-dias.mp3',
  '/voice/buenas-tardes.mp3',
  '/voice/la-guardo-para.mp3',
  '/voice/guardo-cita-para.mp3',
  '/voice/a-las.mp3',
  '/voice/a-la.mp3',
  '/voice/dia-hoy.mp3',
  '/voice/dia-manana.mp3',
  '/voice/tengo.mp3',
  '/voice/huecos.mp3',
  '/voice/o.mp3',
  '/voice/de-media-hora.mp3',
  '/voice/de-una-hora.mp3',
  '/voice/de-dos-horas.mp3',
  '/voice/con-cavitacion.mp3',
  '/voice/cual.mp3',
  '/voice/cual-de-estas.mp3',
  '/voice/toca-una.mp3',
  '/voice/hay-varias.mp3',
  '/voice/no-la-tengo.mp3',
  '/voice/doy-de-alta.mp3',
  '/voice/apunto-igual.mp3',
  '/voice/que-telefono.mp3',
  '/voice/el-telefono.mp3',
  '/voice/sin-red.mp3',
  '/voice/sin-nube.mp3',
];

async function reloadOpenWindows() {
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  await Promise.all(windows.map(client => {
    if (typeof client.navigate !== 'function') return undefined;
    try {
      const url = new URL(client.url);
      if (url.searchParams.has('_upd')) return undefined;
      url.searchParams.set('_upd', String(Date.now()));
      return client.navigate(url.href).catch(() => undefined);
    } catch {
      return undefined;
    }
  }));
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    await self.skipWaiting();
    await reloadOpenWindows();
    const cache = await caches.open(CACHE);
    await Promise.all(PRECACHE.map(u => cache.add(u).catch(() => undefined)));
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
    await reloadOpenWindows();
    try {
      const res = await fetch('/voice/manifest.json');
      if (!res.ok) return;
      const { clips } = await res.json();
      const cache = await caches.open(CACHE);
      const have = new Set((await cache.keys()).map(r => new URL(r.url).pathname));
      const rest = (clips ?? []).filter(u => !have.has(u));
      for (let i = 0; i < rest.length; i += 20) {
        const batch = rest.slice(i, i + 20);
        await Promise.all(batch.map(u => cache.add(u).catch(() => undefined)));
      }
    } catch { /* sin manifest, el fetch cachea bajo demanda */ }
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
    icon: '/icon-192.png',
    badge: '/icon-192.png',
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
    // Un solo camino. Navegar y avisar a la vez recarga la agenda y la ficha se cierra en blanco.
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
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.searchParams.has('_rsc')) return;
  if (url.pathname === '/sw.js' || url.pathname === '/app-build.txt') return;

  if (req.mode === 'navigate') {
    event.respondWith(fetch(req, { cache: 'reload' }).catch(() => caches.match(req)));
    return;
  }

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
