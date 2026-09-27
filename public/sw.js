// Versioned static assets and previously visited pages for offline use.
const CACHE_NAME = "daymark-offline-v5";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) return caches.delete(k);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const target = new URL(event.request.url);
  if (target.origin === location.origin && target.pathname === "/api/auth" && event.request.method === "DELETE") {
    event.respondWith(caches.delete(CACHE_NAME).then(() => fetch(event.request)));
    return;
  }
  // Only cache immutable static assets (_next/static and web fonts)
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin === location.origin && event.request.mode === "navigate" && ["/", "/study", "/fitness", "/sky", "/term"].includes(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const network = fetch(event.request).then(async response => {
        if (response.redirected && new URL(response.url).pathname === "/login") await caches.delete(CACHE_NAME);
        else if (response.ok && !response.redirected) await cache.put(event.request, response.clone());
        return response;
      });
      // Keep a successful late response available on the next offline visit.
      event.waitUntil(network.catch(() => undefined));
      try {
        return await Promise.race([network, new Promise((_, reject) => setTimeout(() => reject(new Error("offline timeout")), 3500))]);
      } catch {
        const saved = await cache.match(event.request);
        if (saved) return saved;
        try { return await network; } catch { return new Response("Daymark is offline. Reconnect once to save this page for offline use.", { status: 503, headers: { "Content-Type": "text/plain" } }); }
      }
    })());
    return;
  }

  if (
    (url.origin === location.origin && url.pathname.startsWith("/_next/static/") && !url.search && !url.pathname.includes("/development/")) ||
    url.hostname.includes("fonts.gstatic.com") ||
    url.hostname.includes("fonts.googleapis.com")
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((res) => {
          if (!res || res.status !== 200 || res.type !== "basic" && res.type !== "cors") {
            return res;
          }
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          return res;
        });
      })
    );
  }
});
