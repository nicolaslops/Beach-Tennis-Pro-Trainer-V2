const CACHE_NAME = "beach-tennis-pro-trainer-v120";
const SAFE_LIBRARY_HOSTS = new Set(["cdn.jsdelivr.net"]);

// Arquivos públicos necessários para o funcionamento offline do plano permitido.
const APP_SHELL = [
  "./",
  "./index.html",
  "./assets/css/style.css?v=119",
  "./assets/css/visual-v61.css?v=119",
  "./assets/js/config/plans.js?v=119",
  "./assets/js/config/free-exercises.js?v=119",
  "./assets/js/services/subscription-service.js?v=119",
  "./assets/js/services/access-control.js?v=119",
  "./assets/js/services/user-data-sync.js?v=119",
  "./assets/js/services/content-service.js?v=119",
  "./assets/js/ui/paywall.js?v=119",
  "./assets/js/app.js?v=119",
  "./assets/js/pwa.js?v=119",
  "./assets/js/auth.js?v=119",
  "./assets/js/env.js?v=119",
  "./manifest.json",
  "./assets/icons/favicon.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/images/logo-beach-tennis-192.png",
  "./assets/images/logo-beach-tennis.png",
  "./assets/images/dashboard-beach-athlete.png",
  "./images/evolucao/PE-V3-004.png",
  "./images/evolucao/PE-V3-008.png",
  "./images/evolucao/PE-V3-012.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);

  // Somente bibliotecas públicas imutáveis entram no cache externo.
  if (requestUrl.origin !== self.location.origin) {
    if (event.request.destination === "script" && SAFE_LIBRARY_HOSTS.has(requestUrl.hostname)) {
      event.respondWith(
        caches.match(event.request).then((cachedResponse) => cachedResponse || fetch(event.request).then((networkResponse) => {
          if (networkResponse.ok || networkResponse.type === "opaque") {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse.clone()));
          }
          return networkResponse;
        }))
      );
      return;
    }
    // Supabase, Hotmart e outras APIs nunca entram no cache da PWA.
    event.respondWith(fetch(event.request));
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", networkResponse.clone()));
          }
          return networkResponse;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const networkRequest = fetch(event.request).then((networkResponse) => {
        if (networkResponse.ok) {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse.clone()));
        }
        return networkResponse;
      });
      return cachedResponse || networkRequest;
    })
  );
});
