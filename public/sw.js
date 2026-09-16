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

// Web Push: shows a system notification even when no tab is open. The
// actual sound/vibration is the device's own default notification
// behavior (Android plays it automatically for any Notification shown
// this way) — the Notification API itself has no reliable cross-browser
// way to specify a custom audio file, so this is the "ring tone" in
// practice rather than a custom sound.
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Mehmed Order Manager", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? "Mehmed Order Manager", {
      body: payload.body,
      icon: "/icons/icon.svg",
      badge: "/icons/icon.svg",
      tag: payload.tag,
      data: { url: payload.url ?? "/" },
      vibrate: [200, 100, 200],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
