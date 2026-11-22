// Service worker of a way1ong game: keeps the files of this version so the game opens without internet.
// scripts/pwa.ts fills in the version and the list of files at build time; do not edit the built sw.js.
const VERSION = '__VERSION__';
const FILES = __FILES__; // relative to this file
const PREFIX = '__CACHE_PREFIX__';
const CACHE = PREFIX + VERSION;
const HOME = new URL('./', self.location.href).href;
const PAGE = new URL('index.html', HOME).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // Straight from the server, not from the browser's own cache, so one version is kept whole.
      await cache.addAll(FILES.map((file) => new Request(new URL(file, HOME).href, { cache: 'reload' })));
      // The running page already has its code; the new files serve from the next opening on.
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  const key = request.mode === 'navigate' && request.url.startsWith(HOME) ? PAGE : request;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      // By address only: a page's module script asks with an Origin header, the kept copy was fetched without
      // one, and servers that answer "Vary: Origin" would otherwise make them never match.
      return (await cache.match(key, { ignoreVary: true })) ?? fetch(request);
    })(),
  );
});
