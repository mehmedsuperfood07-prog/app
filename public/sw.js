// Minimal app-shell cache — NOT the offline data layer (that's Dexie,
// see lib/offline/). This only exists so that reopening or reloading a
// tab while offline shows the last page the salesman actually visited
// instead of the browser's own "no internet" error. Client components
// on that page then hydrate their content from IndexedDB, independent of
// this cache.
//
// Deliberately conservative: only GET navigations are touched, and each
// URL is cached under its own key (never a blanket fallback to "/",
// which would just bounce a deep link like /salesman/orders/new back to
// the wrong page). Everything else — static assets, RSC data fetches —
// goes straight to the network; this worker does not intercept them.
const CACHE_NAME = "mehmed-shell-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || request.mode !== "navigate") return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached ?? Response.error())),
  );
});
