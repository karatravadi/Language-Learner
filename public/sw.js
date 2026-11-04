/*
  Stilus offline: a service worker that keeps a copy of the app and every course, so lessons work without a
  connection (on a train, on a plane). Online, it always asks the network first, so a deploy shows up straight away;
  the copy is only used when the network fails. /api/* (sign-in, sync, AI) is never cached: progress is saved on the
  device and synced when the connection comes back, by app.js.
*/
const CACHE = 'stilus-v1';
const SHELL = ['./', 'index.html', 'app.js', 'logic.js', 'style.css', 'manifest.webmanifest',
  'fonts/instrument-sans.woff2', 'fonts/newsreader.woff2', 'icons/icon-192.png', 'icons/apple-touch-icon.png', 'courses/index.json'];

// Every file of every course, read from the course list, so the first visit makes the whole app work offline.
async function courseFiles() {
  const out = [];
  try {
    const idx = await (await fetch('courses/index.json', { cache: 'no-cache' })).json();
    for (const c of idx.courses) {
      const base = 'courses/' + c.file.replace(/[^/]+$/, '');
      const course = await (await fetch('courses/' + c.file, { cache: 'no-cache' })).json();
      out.push('courses/' + c.file, ...course.chapters.map(f => base + f), base + course.words);
      if (course.glossary) out.push(base + course.glossary);
    }
  } catch (e) { /* offline or signed out: the files are cached as they are used instead */ }
  return out;
}
async function fill() {
  const cache = await caches.open(CACHE);
  const files = SHELL.concat(await courseFiles());
  // One at a time, and a file that fails (a sign-in redirect, say) is skipped rather than failing the lot.
  for (const f of files) {
    try { const r = await fetch(f, { cache: 'no-cache' }); if (r.ok && r.type === 'basic') await cache.put(f, r); } catch (e) { /* skip */ }
  }
}

self.addEventListener('install', e => { e.waitUntil(fill()); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});
// The page asks for a refresh of the copy now and then (after it loads), so new chapters are kept too.
self.addEventListener('message', e => { if (e.data === 'refresh') e.waitUntil(fill()); });

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  e.respondWith((async () => {
    try {
      const res = await fetch(req);
      // Keep good same-origin copies only. A sign-in redirect (Cloudflare Access) goes straight to the page.
      if (res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req.mode === 'navigate' ? './' : req, copy)).catch(() => {});
      }
      return res;
    } catch (err) {
      const cache = await caches.open(CACHE);
      const hit = req.mode === 'navigate'
        ? (await cache.match('./')) || (await cache.match('index.html'))
        : (await cache.match(req, { ignoreSearch: true }));
      if (hit) return hit;
      throw err;
    }
  })());
});
