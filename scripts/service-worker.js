/* Generated per build. Only app files are cached; IndexedDB is never touched. */
const CACHE = "__CACHE_NAME__";
const ASSETS = __ASSETS__;
self.addEventListener("install", (event) =>
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(ASSETS);
    })(),
  ),
);
self.addEventListener("message", (event) => {
  if (event.data?.type === "ACTIVATE") self.skipWaiting();
});
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (key.startsWith("espresso-lab-") && key !== CACHE)
          await caches.delete(key);
      await self.clients.claim();
    })(),
  ),
);
self.addEventListener("fetch", (event) => {
  const req = event.request,
    url = new URL(req.url);
  if (
    req.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/")
  )
    return;
  // This build's navigation and chunks stay together until the user accepts an update.
  if (req.mode === "navigate") {
    event.respondWith(
      caches
        .open(CACHE)
        .then(async (cache) => (await cache.match("/")) || fetch(req)),
    );
    return;
  }
  if (ASSETS.includes(url.pathname))
    event.respondWith(
      caches
        .open(CACHE)
        .then(async (cache) => (await cache.match(url.pathname)) || fetch(req)),
    );
});
