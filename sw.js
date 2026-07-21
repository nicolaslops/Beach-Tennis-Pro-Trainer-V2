const CACHE_NAME = "beach-tennis-pro-trainer-v115";

// Arquivos principais para funcionamento offline.
const APP_SHELL = [
  "./",
  "./index.html",
  "./assets/css/style.css?v=115",
  "./assets/css/visual-v61.css?v=115",
  "./assets/js/app.js?v=115",
  "./assets/js/pwa.js?v=115",
  "./assets/js/auth.js?v=115",
  "./assets/js/env.js?v=115",
  "./manifest.json",
  "./assets/icons/favicon.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/images/logo-beach-tennis-192.png",
  "./assets/images/logo-beach-tennis.png",
  "./assets/images/dashboard-beach-athlete.png",
  "./images/evolucao/PE-V3-004.png",
  "./images/evolucao/PE-V3-008.png",
  "./images/evolucao/PE-V3-012.png",
  "./assets/data/banco_completo_beach_tennis_app_v57.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
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

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      }).catch(() => caches.match(event.request))
  );
});



