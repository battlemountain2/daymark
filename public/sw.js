/**
 * Offline support for a dashboard that gets used on campus wifi.
 *
 * Three strategies, chosen per request type:
 *
 *  - Build assets (`/_next/static/…`) are content-hashed and therefore
 *    immutable. Cache-first, no revalidation, no expiry.
 *  - Icons and other images: cache-first, capped so a year of use doesn't
 *    fill the phone.
 *  - The page itself is network-first with a short timeout, falling back to the
 *    last good copy. A three-day-old dashboard with an honest "offline" banner
 *    beats a Safari error page.
 *
 * `/api/*` is never cached. Those are reads and writes of live state, and
 * serving a stale tick list would be worse than failing.
 */

const VERSION = "v3";
const SHELL = `shell-${VERSION}`;
const PAGES = `pages-${VERSION}`;
const MEDIA = `media-${VERSION}`;
const MEDIA_MAX = 220;

const PRECACHE = ["/icon-192.png", "/apple-touch-icon.png", "/manifest.webmanifest"];

self.addEventListener("install", (e) => {
  // Precache only things certain to exist. One 404 rejects addAll entirely.
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/** Signing out must not leave the previous session's page on disk. */
self.addEventListener("message", (e) => {
  if (e.data === "clear-pages") {
    e.waitUntil(caches.delete(PAGES));
  }
});

async function trimCache(name, max) {
  const c = await caches.open(name);
  const keys = await c.keys();
  if (keys.length <= max) return;
  await Promise.all(keys.slice(0, keys.length - max).map((k) => c.delete(k)));
}

async function cacheFirst(req, cacheName, trimTo) {
  const c = await caches.open(cacheName);
  const hit = await c.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) {
    c.put(req, res.clone());
    if (trimTo) trimCache(cacheName, trimTo);
  }
  return res;
}

/**
 * Network-first, but only waits so long. On flaky campus wifi a request can
 * hang far longer than it takes to read the cached copy, so the timeout is what
 * actually makes this feel instant rather than the caching.
 */
async function networkFirst(req, cacheName, timeoutMs = 3500) {
  const c = await caches.open(cacheName);
  try {
    const res = await Promise.race([
      fetch(req),
      new Promise((_, rej) => setTimeout(() => rej(new Error("slow")), timeoutMs)),
    ]);
    if (res && res.ok) c.put(req, res.clone());
    return res;
  } catch {
    const hit = await c.match(req);
    if (hit) return hit;
    throw new Error("offline and nothing cached");
  }
}

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Live state and mutations: always the network, never a stale answer.
  if (url.pathname.startsWith("/api/")) return;

  // Never cache the login page as a fallback for the dashboard.
  if (url.pathname === "/login") return;

  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(cacheFirst(request, SHELL));
    return;
  }

  // Cover art now comes from Last.fm / the Cover Art Archive, which are
  // cross-origin and skipped above; this covers our own icons.
  if (/\.(png|jpe?g|webp|avif|ico)$/.test(url.pathname)) {
    e.respondWith(cacheFirst(request, MEDIA, MEDIA_MAX));
    return;
  }

  // Page navigations, including the App Router's RSC fetches.
  if (request.mode === "navigate" || request.headers.get("RSC") === "1") {
    e.respondWith(networkFirst(request, PAGES));
  }
});


/* ------------------------------------------------------------ notifications */

/**
 * A push arrives even when no tab is open — this worker is what receives it.
 *
 * The payload is JSON we sent ourselves, but it is still parsed defensively:
 * a push that throws here shows the browser's generic "This site has been
 * updated in the background" notification, which is worse than nothing.
 */
self.addEventListener("push", (e) => {
  let data = { title: "Daymark", body: "", url: "/" };
  try {
    if (e.data) data = { ...data, ...e.data.json() };
  } catch {
    try { data.body = e.data ? e.data.text() : ""; } catch {}
  }

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      // One tag per kind would let a morning brief silently replace a class
      // nudge. A shared tag is deliberate only for repeats of the same kind.
      tag: data.tag || undefined,
      data: { url: data.url || "/" },
    })
  );
});

/** Focus an existing tab if there is one; only open a new one if there isn't. */
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((tabs) => {
      for (const t of tabs) {
        if (t.url.includes(self.location.origin)) return t.focus();
      }
      return self.clients.openWindow(target);
    })
  );
});
