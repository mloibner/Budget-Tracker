const STATIC_CACHE = "static-cache-v1";
const RUNTIME_CACHE = "runtime";
const FILES_TO_CACHE = [
  "/",
  "index.html",
  "/index.js",
  "indexedDb.js",
  "manifest.json",
  "/icons/icon_96x96.png",
  "/icons/icon_128x128.png",
  "/icons/icon_144x144.png",
  "/icons/icon_72x72.png",
  "/icons/icon_152x152.png",
  "/icons/icon_192x192.png",
  "/icons/icon_384x384.png",
  "/icons/icon_512x512.png",
  "/styles.css",
];

//* Calls install event
self.addEventListener("install", (event) => {
  console.log(`Service Worker: Installed.`);
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(FILES_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

//* Calls the activate event. The activate handler takes care of cleaning up old caches.
self.addEventListener("activate", (event) => {
  console.log(`Service Worker: Activated.`);
  const currentCaches = [STATIC_CACHE, RUNTIME_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return cacheNames.filter(
          (cacheName) => !currentCaches.includes(cacheName)
        );
      })
      .then((cachesToDelete) => {
        return Promise.all(
          cachesToDelete.map((cacheToDelete) => {
            return caches.delete(cacheToDelete);
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// //* Calls fetch event
self.addEventListener("fetch", event => {
  // non GET requests are not cached and requests to other origins are not cached
  if (
    event.request.method !== "GET" ||
    !event.request.url.startsWith(self.location.origin)
  ) {
    event.respondWith(fetch(event.request));
    return;
  };

  // handle runtime GET requests for data from /api routes
  if (event.request.url.includes("/api")) {
    // make network request and fallback to cache if network request fails (offline)
    event.respondWith(
      caches.open(RUNTIME_CACHE).then((cache) => {
        return fetch(event.request)
          .then((response) => {
            cache.put(event.request, response.clone());
            return response;
          })
          .catch(() => caches.match(event.request));
      })
    );
    return;
  };

  // use cache first for all other requests for performance
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      };

      // request is not in cache. make network request and cache the response
      return caches.open(RUNTIME_CACHE).then((cache) => {
        return fetch(event.request).then((response) => {
          return cache.put(event.request, response.clone()).then(() => {
            return response;
          });
        });
      });
    })
  );
});