/* SQUAWK service worker: app shell offline, stale-while-revalidate for same-origin files, network for live data */
const CACHE = 'squawk-v1';
const SHELL = ['./', 'index.html', 'css/app.css', 'vendor/maplibre-gl.js', 'vendor/maplibre-gl.css', 'manifest.webmanifest', 'icons/icon.svg',
  'fonts/b612-latin-400-normal.woff2', 'fonts/b612-latin-700-normal.woff2', 'fonts/b612-mono-latin-400-normal.woff2', 'fonts/b612-mono-latin-700-normal.woff2',
  'data/land.js', 'data/borders.js', 'data/ranges.js', 'data/airports.js', 'data/types.js', 'data/operators.js',
  'js/core.js', 'js/intro.js', 'js/icons.js', 'js/feed.js', 'js/sim.js', 'js/tracker.js', 'js/enrich.js', 'js/map.js', 'js/render.js', 'js/charts.js', 'js/ui.js', 'js/detail.js', 'js/panels.js', 'js/sky.js', 'js/app.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
