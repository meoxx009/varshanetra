/**
 * VarshaNetra - Progressive Web App Service Worker
 * Version: 1.0.0 (ROAD-005)
 *
 * Implements complete offline functionality:
 * - Cache API: Static, Dynamic, and Telemetry Data caches
 * - Network-first with offline fallback for navigation
 * - Cache-first for OpenStreetMap map tiles
 * - 15-minute caching for Open-Meteo & disaster telemetry
 * - Background Sync support for offline field reports
 */

const STATIC_CACHE = 'VarshaNetra-static-v2';
const DYNAMIC_CACHE = 'VarshaNetra-dynamic-v2';
const DATA_CACHE = 'VarshaNetra-data-v2';

const STATIC_FILES = [
  '/offline',
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-512.png',
  '/icons/icon-maskable-512x512.png',
];

// Helper: 15-minute expiration timestamp in milliseconds
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

// ==========================================
// 1. INSTALL EVENT
// ==========================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('VarshaNetra SW installed');
        return self.skipWaiting();
      })
      .catch((err) => {
        console.warn('[VarshaNetra:SW] Pre-cache warning:', err);
        return self.skipWaiting();
      })
  );
});

// ==========================================
// 2. ACTIVATE EVENT
// ==========================================
self.addEventListener('activate', (event) => {
  const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE, DATA_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (!currentCaches.includes(name)) {
              console.log('[VarshaNetra:SW] Deleting obsolete cache:', name);
              return caches.delete(name);
            }
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// ==========================================
// 3. FETCH EVENT STRATEGY
// ==========================================
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only intercept GET requests
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Strategy A: Map Tiles (openstreetmap.org / cartocdn) -> Cache-First
  if (
    url.hostname.includes('tile.openstreetmap.org') ||
    url.hostname.includes('tile.osm.org') ||
    url.hostname.includes('basemaps.cartocdn.com')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(DATA_CACHE).then((cache) => cache.put(request, clone));
            }
            return networkResponse;
          })
          .catch(() => {
            // Return empty fallback transparent tile if unavailable
            return new Response('', { status: 408, statusText: 'Tile Offline' });
          });
      })
    );
    return;
  }

  // Strategy B: Open-Meteo Weather API -> Network First, Cache with 15m metadata
  if (url.hostname.includes('open-meteo.com')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(DATA_CACHE).then(async (cache) => {
              // Store response alongside custom freshness header
              const headers = new Headers(clone.headers);
              headers.set('X-Cached-At', Date.now().toString());
              const modifiedResponse = new Response(await clone.blob(), {
                status: clone.status,
                statusText: clone.statusText,
                headers,
              });
              await cache.put(request, modifiedResponse);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) {
            const headers = new Headers(cached.headers);
            headers.set('X-Data-Stale', 'true');
            const cachedAt = parseInt(headers.get('X-Cached-At') || '0', 10);
            const isStale = Date.now() - cachedAt > FIFTEEN_MINUTES_MS;
            if (isStale) {
              headers.set('X-Stale-Warning', 'Data is older than 15 minutes');
            }
            return new Response(await cached.blob(), {
              status: cached.status,
              statusText: cached.statusText,
              headers,
            });
          }
          return new Response(
            JSON.stringify({
              error: 'Weather service offline. No cached telemetry available.',
              offline: true,
            }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        })
    );
    return;
  }

  // Strategy C: Supabase API & App APIs (/api/...) -> Network First, Cache GET
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(DATA_CACHE).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) {
            const headers = new Headers(cached.headers);
            headers.set('X-Data-Stale', 'true');
            return new Response(await cached.blob(), {
              status: cached.status,
              statusText: cached.statusText,
              headers,
            });
          }
          return new Response(
            JSON.stringify({
              success: false,
              offline: true,
              error: 'You are currently offline. Live disaster telemetry is cached where available.',
            }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        })
    );
    return;
  }

  // Strategy D: Page Navigations (HTML) -> Network First, Fallback to /offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Try matched cached page first
          const cached = await caches.match(request);
          if (cached) {
            return cached;
          }
          // Fallback to designated /offline shell
          const offlineFallback = await caches.match('/offline');
          if (offlineFallback) {
            return offlineFallback;
          }
          // Direct fallback if /offline isn't matched
          return new Response(
            '<html><head><title>Offline</title></head><body style="font-family:sans-serif;text-align:center;padding:50px;"><h1>You are Offline</h1><p>Internet connection unavailable. Please check your network.</p><a href="/offline">View Emergency Offline Hub</a></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // Strategy E: Static Next.js Bundles, CSS, Images, Fonts -> Cache-First with Network Fallback
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
            }
            return networkResponse;
          })
          .catch(() => {
            return new Response('', { status: 408, statusText: 'Resource Unavailable' });
          });
      })
    );
    return;
  }

  // General assets (icons, fonts, images)
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});

// ==========================================
// 4. CLIENT MESSAGING & ACTIONS
// ==========================================
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }

  if (event.data.action === 'clearCache') {
    event.waitUntil(
      Promise.all([caches.delete(DYNAMIC_CACHE), caches.delete(DATA_CACHE)]).then(() => {
        console.log('[VarshaNetra:SW] Dynamic and Data caches purged.');
      })
    );
  }
});

// ==========================================
// 5. BACKGROUND SYNC (Offline Field Reports)
// ==========================================
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-field-reports') {
    console.log('[VarshaNetra:SW] Background sync triggered for field reports.');
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'TRIGGER_OFFLINE_SYNC' });
        });
      })
    );
  }
});
