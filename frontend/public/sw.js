/* Minimal service worker — PWA-ready skeleton (network-first, offline fallback). */
const CACHE = "edu-mvp-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // Never intercept API calls or uploaded PDFs.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/uploads/")) return;
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
