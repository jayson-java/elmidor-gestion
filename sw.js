/* ════════════════════════════════════════════════════════
   ELMIDOR GESTIÓN · Service Worker
   ────────────────────────────────────────────────────────
   Cachea el cascarón de la app (HTML/CSS/JS) para que abra
   como app instalada aunque no haya red en ese momento.
   Los datos siguen viajando al Apps Script vía fetch normal.
   ════════════════════════════════════════════════════════ */

const CACHE = "elmidor-shell-v2";
const ARCHIVOS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/config.js",
  "./js/api.js",
  "./js/storage.js",
  "./js/sync.js",
  "./js/ui.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(cache){ return cache.addAll(ARCHIVOS); })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  var url = new URL(e.request.url);
  // Las llamadas al Apps Script siempre van a la red, nunca a la caché
  if(url.hostname.indexOf("script.google") !== -1) return;
  if(e.request.method !== "GET") return;

  e.respondWith(
    caches.match(e.request).then(function(cacheado){
      return cacheado || fetch(e.request).then(function(resp){
        var copia = resp.clone();
        caches.open(CACHE).then(function(cache){ cache.put(e.request, copia); });
        return resp;
      });
    }).catch(function(){ return caches.match("./index.html"); })
  );
});
