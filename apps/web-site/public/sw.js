// Unit 29 — minimal installable-PWA service worker (no build-time SW
// generator library). Network-first: a public school page/admission form
// should always show fresh content when online, falling back to whatever
// was last cached only when genuinely offline.
const CACHE_NAME = "vidyut-web-site-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
