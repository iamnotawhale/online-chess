/// <reference lib="webworker" />

const CACHE_VERSION = '3';
const STATIC_CACHE = `onchess-static-${CACHE_VERSION}`;

const PRECACHE_ASSETS = [
  '/manifest.json',
  '/logo.svg',
];

const isNavigationRequest = (request: Request) =>
  request.mode === 'navigate' ||
  request.headers.get('accept')?.includes('text/html');

const isHashedAsset = (url: URL) =>
  url.pathname.startsWith('/assets/') || url.pathname.endsWith('.css') || url.pathname.endsWith('.js');

// Install event - cache only stable static files (not HTML shell)
self.addEventListener('install', ((event: ExtendableEvent) => {
  console.log('[ServiceWorker] Installing v' + CACHE_VERSION);
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(STATIC_CACHE);
        await cache.addAll(PRECACHE_ASSETS);
        console.log('[ServiceWorker] Precached static assets');
        (self as unknown as ServiceWorkerGlobalScope).skipWaiting();
      } catch (error) {
        console.error('[ServiceWorker] Install failed:', error);
      }
    })()
  );
}) as EventListener);

// Activate event - clean up old caches
self.addEventListener('activate', ((event: ExtendableEvent) => {
  console.log('[ServiceWorker] Activating v' + CACHE_VERSION);
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE)
          .map((name) => {
            console.log('[ServiceWorker] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
      await (self as unknown as ServiceWorkerGlobalScope).clients.claim();
    })()
  );
}) as EventListener);

// Fetch event
self.addEventListener('fetch', ((event: FetchEvent) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // API: network only
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(
          JSON.stringify({
            error: 'Offline - API unavailable',
            message: 'You are currently offline. Some features may not be available.',
          }),
          {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' },
          }
        )
      )
    );
    return;
  }

  // HTML navigations: always network (never serve stale app shell)
  if (isNavigationRequest(request) || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(request).catch(async () => {
        const offline = await caches.match('/offline.html');
        return offline || new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      })
    );
    return;
  }

  // Service worker itself: network only
  if (url.pathname.endsWith('/service-worker.js')) {
    event.respondWith(fetch(request));
    return;
  }

  // Hashed build assets: cache-first
  if (isHashedAsset(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;

        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
          const cache = await caches.open(STATIC_CACHE);
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      })()
    );
    return;
  }

  // Everything else: network first, optional cache fallback
  event.respondWith(
    (async () => {
      try {
        const networkResponse = await fetch(request);
        return networkResponse;
      } catch {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      }
    })()
  );
}) as EventListener);

self.addEventListener('message', ((event: ExtendableMessageEvent) => {
  if (event.data?.type === 'SKIP_WAITING') {
    (self as unknown as ServiceWorkerGlobalScope).skipWaiting();
  }
}) as EventListener);

self.addEventListener('push', ((event: PushEvent) => {
  if (!event.data) return;

  const data = event.data.json();
  const options: NotificationOptions = {
    body: data.body || 'New message from OnChess',
    icon: '/icons/favicon-192x192.png',
    badge: '/icons/favicon-192x192.png',
    tag: data.tag || 'onchess',
    requireInteraction: data.requireInteraction || false,
    data: {
      url: data.url || '/',
    },
  };

  event.waitUntil(
    (self as unknown as ServiceWorkerGlobalScope).registration.showNotification(
      data.title || 'OnChess',
      options
    )
  );
}) as EventListener);

self.addEventListener('notificationclick', ((event: NotificationEvent) => {
  event.notification.close();

  const urlToOpen = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    (async () => {
      const clients = await (self as unknown as ServiceWorkerGlobalScope).clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const client of clients) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return (client as WindowClient).focus();
        }
      }

      return (self as unknown as ServiceWorkerGlobalScope).clients.openWindow(urlToOpen);
    })()
  );
}) as EventListener);
