// Bookcraft Service Worker — App Shell Caching
// Cache Strategy:
// - App Shell (HTML, JS, CSS, Fonts, Icons) → Cache First
// - API Calls → Network First with Fallback
// - Images → Cache First with Fallback

const CACHE_VERSION = 'v1';
const APP_SHELL_CACHE = `bookcraft-app-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `bookcraft-runtime-${CACHE_VERSION}`;
const IMAGE_CACHE = `bookcraft-images-${CACHE_VERSION}`;

// Core App Shell URLs to pre-cache
const APP_SHELL_URLS = [
  '/',
  '/dashboard',
  '/dashboard/library',
  '/dashboard/settings',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico',
];

// App Shell URL patterns (Cache First)
const APP_SHELL_PATTERNS = [
  /^\/_next\/static\//,
  /^\/icons\//,
  /^\/fonts\//,
  /\.(?:js|css|woff2?|ttf|otf|eot)$/,
];

// API patterns (Network First) — only same-origin API routes
const API_PATTERNS = [
  /^\/api\//,
];

// Image patterns (Cache First with Fallback)
const IMAGE_PATTERNS = [
  /\.(?:png|jpg|jpeg|gif|webp|svg|ico)$/,
  /^\/images\//,
  /^\/covers\//,
];

// ─── Install ────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(APP_SHELL_CACHE)
      .then((cache) => {
        // Pre-cache app shell — best effort (don't fail install if some URLs 404)
        return Promise.allSettled(
          APP_SHELL_URLS.map((url) =>
            cache.add(url).catch((err) => {
              console.warn(`[SW] Could not pre-cache ${url}:`, err);
            })
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// ─── Activate ────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  const validCaches = [APP_SHELL_CACHE, RUNTIME_CACHE, IMAGE_CACHE];

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name.startsWith('bookcraft-') && !validCaches.includes(name))
            .map((name) => {
              console.log(`[SW] Deleting old cache: ${name}`);
              return caches.delete(name);
            })
        )
      )
      .then(() => self.clients.claim())
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests and same-origin / known CDN
  if (request.method !== 'GET') return;

  // Skip chrome-extension and non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  // ── API → Network First ────────────────────────────────────────────────
  if (API_PATTERNS.some((p) => p.test(url.pathname) || p.test(url.hostname))) {
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
    return;
  }

  // ── Images → Cache First with Fallback ────────────────────────────────
  if (IMAGE_PATTERNS.some((p) => p.test(url.pathname))) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // ── App Shell (static assets) → Cache First ───────────────────────────
  if (APP_SHELL_PATTERNS.some((p) => p.test(url.pathname))) {
    event.respondWith(cacheFirst(request, APP_SHELL_CACHE));
    return;
  }

  // ── Navigation (HTML pages) → Network First with offline fallback ──────
  if (request.mode === 'navigate') {
    event.respondWith(navigationHandler(request));
    return;
  }

  // ── Everything else → Network First ───────────────────────────────────
  event.respondWith(networkFirst(request, RUNTIME_CACHE));
});

// ─── Strategies ───────────────────────────────────────────────────────────────

/**
 * Cache First — serve from cache, update in background, fallback to network.
 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    // Update cache in background (stale-while-revalidate)
    fetchAndCache(request, cache).catch(() => {});
    return cached;
  }
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Return cached offline page for images as empty response
    return new Response('', { status: 408, statusText: 'Offline' });
  }
}

/**
 * Network First — try network, fall back to cache.
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'Offline', offline: true }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Navigation handler — network first, serve cached shell, final offline.html.
 */
async function navigationHandler(request) {
  const cache = await caches.open(APP_SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Try exact URL from cache
    const cached = await cache.match(request);
    if (cached) return cached;

    // Try root page from cache (App Shell)
    const rootCached = await cache.match('/');
    if (rootCached) return rootCached;

    // Last resort — serve offline fallback page
    const offlineCached = await cache.match('/offline.html');
    if (offlineCached) return offlineCached;

    // Hard fallback
    return new Response(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:2rem">
        <h1>Du bist offline</h1><p>Bitte prüfe deine Internetverbindung.</p>
        <button onclick="location.reload()">Erneut versuchen</button>
      </body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}

/**
 * Fetch and update cache in background.
 */
async function fetchAndCache(request, cache) {
  const response = await fetch(request);
  if (response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

// ─── Message Handler (for SW update triggers) ─────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CACHE_URLS') {
    const { urls } = event.data;
    caches.open(APP_SHELL_CACHE).then((cache) => {
      urls.forEach((url) => cache.add(url).catch(() => {}));
    });
  }
});
