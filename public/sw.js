const CACHE = 'marlenne-shell-v14';
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
  '/voice/sin-red.mp3',
  '/voice/sin-nube.mp3',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(async c => {
      await Promise.all(PRECACHE.map(u => c.add(u).catch(() => undefined)));
      await self.skipWaiting();
    }),
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isHashedAsset(url) {
  if (url.pathname === '/sw.js') return false;
  return url.pathname.startsWith('/_next/static/')
    || /\.(png|js|css|woff2|wav|mp3)$/.test(url.pathname)
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
