/// <reference lib="webworker" />

const CACHE_NAME = 'onchess-v1';

// Files to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.svg',
];

// Install event - cache essential files
self.addEventListener('install', ((event: ExtendableEvent) => {
  console.log('[ServiceWorker] Installing...');
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(STATIC_ASSETS);
        console.log('[ServiceWorker] Cached essential files');
        // Skip waiting to activate immediately
        (self as unknown as ServiceWorkerGlobalScope).skipWaiting();
      } catch (error) {
        console.error('[ServiceWorker] Install failed:', error);
      }
    })()
  );
}) as EventListener);

// Activate event - clean up old caches
self.addEventListener('activate', ((event: ExtendableEvent) => {
  console.log('[ServiceWorker] Activating...');
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[ServiceWorker] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
      // Claim clients immediately
      await (self as unknown as ServiceWorkerGlobalScope).clients.claim();
    })()
  );
}) as EventListener);

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', ((event: FetchEvent) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip API calls (let them fail gracefully)
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .catch(() => {
          // Return a 503 response for offline API calls
          return new Response(
            JSON.stringify({
              error: 'Offline - API unavailable',
              message: 'You are currently offline. Some features may not be available.',
            }),
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'application/json' },
            }
          );
        })
    );
    return;
  }

  // For everything else: network first, fall back to cache
  event.respondWith(
    (async () => {
      try {
        const networkResponse = await fetch(request);

        // Cache successful responses
        if (networkResponse.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());
        }

        return networkResponse;
      } catch (error) {
        // Network failed - try cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          console.log('[ServiceWorker] Serving from cache:', request.url);
          return cachedResponse;
        }

        // Not in cache - return offline page or error
        console.log('[ServiceWorker] No cache for:', request.url);
        return new Response('Offline - Page not available', {
          status: 503,
          statusText: 'Service Unavailable',
        });
      }
    })()
  );
}) as EventListener);

// Handle messages from clients
self.addEventListener('message', ((event: ExtendableMessageEvent) => {
  console.log('[ServiceWorker] Message:', event.data);
}) as EventListener);

// Handle push notifications
self.addEventListener('push', ((event: PushEvent) => {
  if (!event.data) {
    console.log('[ServiceWorker] Push received but no data');
    return;
  }

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

// Handle notification clicks
self.addEventListener('notificationclick', ((event: NotificationEvent) => {
  event.notification.close();

  const urlToOpen = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    (async () => {
      const clients = await (self as unknown as ServiceWorkerGlobalScope).clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      // Check if window is already open
      for (const client of clients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return (client as WindowClient).focus();
        }
      }

      // Open new window
      return (self as unknown as ServiceWorkerGlobalScope).clients.openWindow(urlToOpen);
    })()
  );
}) as EventListener);
