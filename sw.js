// Decifra Service Worker — v1
// Strategy: network-first for app shell, cache-first for static assets.
// The app works fully offline once installed (uses cached React/Babel from CDN too).

const CACHE = "decifra-v6";
const PRECACHE = [
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  // CDN assets — cached on first load, served offline thereafter
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500&family=JetBrains+Mono:wght@400;500&display=swap",
  "https://unpkg.com/react@18.3.1/umd/react.development.js",
  "https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js",
  "https://unpkg.com/@babel/standalone@7.29.0/babel.min.js",
];

// Install — precache static assets only (not app shell).
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => {
      // Cache local assets strictly; CDN assets best-effort
      const local = PRECACHE.filter((u) => u.startsWith("/"));
      const cdn   = PRECACHE.filter((u) => !u.startsWith("/"));
      return cache.addAll(local).then(() =>
        Promise.allSettled(cdn.map((u) => cache.add(new Request(u, { mode: "no-cors" }))))
      );
    })
  );
  self.skipWaiting();
});

// Activate — delete stale caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network-first for same-origin pages/app assets, cache-first otherwise
self.addEventListener("fetch", (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Skip non-GET and chrome-extension requests
  if (request.method !== "GET" || url.protocol === "chrome-extension:") return;

  // For Claude API calls — always go to network (no sensitive data cached)
  if (url.hostname.includes("anthropic") || url.hostname.includes("claude")) return;

  const isSameOrigin = url.origin === self.location.origin;
  const isNavigation = request.mode === "navigate";
  const isHtml = url.pathname.endsWith(".html");
  const isCoreAppAsset =
    ["/", "/index.html", "/app.jsx", "/styles.css", "/ios-frame.jsx", "/android-frame.jsx", "/design-canvas.jsx"]
      .includes(url.pathname);
  const shouldUseNetworkFirst = isSameOrigin && (isNavigation || isHtml || isCoreAppAsset);

  // Core app shell should prefer fresh network to avoid stale UI after deploys.
  if (shouldUseNetworkFirst) {
    e.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((cache) => cache.put(request, clone));
          }
          return res;
        })
        .catch(() =>
          caches.match(request).then((cached) => {
            if (cached) return cached;
            if (isNavigation) return caches.match("/index.html");
          })
        )
    );
    return;
  }

  e.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((res) => {
          // Cache successful same-origin + CDN font/script responses
          if (
            res.ok &&
            (url.origin === self.location.origin ||
              url.hostname === "fonts.googleapis.com" ||
              url.hostname === "fonts.gstatic.com" ||
              url.hostname === "unpkg.com")
          ) {
            const clone = res.clone();
            caches.open(CACHE).then((cache) => cache.put(request, clone));
          }
          return res;
        })
        .catch(() => {
          // Offline fallback — serve index.html for navigation requests
          if (request.mode === "navigate") return caches.match("/index.html");
        });
    })
  );
});
