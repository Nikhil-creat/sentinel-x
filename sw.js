/* Sentinel-X service worker: offline-capable app shell. */
const CACHE = 'sentinel-x-v2';
const SHELL = ['./', 'index.html', '404.html', 'css/styles.css', 'favicon.svg', 'manifest.webmanifest',
  'js/kb.js', 'js/core.js', 'js/api.js', 'js/hero.js', 'js/stack.js', 'js/globe.js', 'js/soc.js', 'js/vision.js',
  'js/rag.js', 'js/agents.js', 'js/tools.js', 'js/copilot.js', 'js/docker.js'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.pathname.startsWith('/api/')) return;
  const sameOrigin = url.origin === location.origin;
  const cdn = /cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com/.test(url.hostname);
  if (!sameOrigin && !cdn) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return r; }).catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok || r.type === 'opaque') { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return r;
  })));
});
