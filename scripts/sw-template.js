// Service worker of a way1ong game: keeps the files of this version so the game opens without internet.
// scripts/pwa.ts fills in the version and the list of files at build time; do not edit the built sw.js.
const VERSION = '__VERSION__';
const FILES = __FILES__; // relative to this file
const PREFIX = '__CACHE_PREFIX__';
const CACHE = PREFIX + VERSION;
// The game's page is kept under its own address (the folder, e.g. /blocks/): hosts redirect
// /blocks/index.html there, and a redirected answer cannot open a page.
const HOME = new URL('./', self.location.href).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.all(
        FILES.map(async (file) => {
          const url = new URL(file, HOME).href;
          // Straight from the server, not from the browser's own cache, so one version is kept whole.
          const response = await fetch(url, { cache: 'reload' });
          if (!response.ok) throw new Error(`${url}: ${response.status}`);
          const plain = response.redirected
            ? new Response(await response.blob(), { status: response.status, statusText: response.statusText, headers: response.headers })
            : response;
          await cache.put(url, plain);
        }),
      );
    })(),
  );
  // A new version waits: the old one keeps serving the page in play, with all its files, until the player asks
  // for the new one (shared/ui/update.ts). The first version of a fresh visit has nothing to wait for.
});

// The player's "Update" (TAKE_OVER in shared/ui/update.ts).
self.addEventListener('message', (event) => {
  if (event.data === 'way1ong:take-over') self.skipWaiting();
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
  const key = request.mode === 'navigate' && request.url.startsWith(HOME) ? HOME : request;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      // By address only: a page's module script asks with an Origin header, the kept copy was fetched without
      // one, and servers that answer "Vary: Origin" would otherwise make them never match.
      return (await cache.match(key, { ignoreVary: true })) ?? fetch(request);
    })(),
  );
});
