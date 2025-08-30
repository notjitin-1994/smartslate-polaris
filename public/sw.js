// Service Worker for offline support
const CACHE_NAME = 'smartslate-polaris-v1';
const STATIC_ASSETS = [
  '/',
  '/discover',
  '/settings',
  '/pricing',
  '/manifest.json',
  '/images/logos/logo.png',
  '/images/logos/logo-swirl.png',
  '/favicon.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service worker installed');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Cache installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - handle requests with cache-first strategy for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Handle different types of requests
  if (isStaticAsset(request.url)) {
    // Cache-first strategy for static assets
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request).then((networkResponse) => {
            if (networkResponse.ok) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          });
        })
        .catch(() => {
          // Return offline fallback for HTML pages
          if (request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/') || new Response('Offline', { status: 503 });
          }
          return new Response('Offline', { status: 503 });
        })
    );
  } else if (isAPIRequest(request.url)) {
    // Network-first strategy for API requests (not applicable in client-only mode)
    event.respondWith(
      fetch(request)
        .catch(() => {
          return new Response(
            JSON.stringify({ error: 'Offline - operation will be queued' }),
            { 
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
  } else {
    // Network-first for everything else
    event.respondWith(
      fetch(request)
        .catch(() => {
          return caches.match(request) || new Response('Offline', { status: 503 });
        })
    );
  }
});

// Background sync for queued operations
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      self.registration.showNotification('Smartslate', {
        body: 'Syncing your data...',
        icon: '/favicon.png',
        badge: '/favicon.png',
        silent: true
      })
    );
  }
});

// Push notifications for updates
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New update available',
    icon: '/favicon.png',
    badge: '/favicon.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Open App',
        icon: '/favicon.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/favicon.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Smartslate', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      self.clients.openWindow('/')
    );
  }
});

// Utility functions
function isStaticAsset(url) {
  return STATIC_ASSETS.some(asset => url.endsWith(asset)) ||
         url.includes('/images/') ||
         url.includes('/fonts/') ||
         url.includes('/css/') ||
         url.includes('/js/') ||
         url.endsWith('.png') ||
         url.endsWith('.jpg') ||
         url.endsWith('.svg') ||
         url.endsWith('.ico');
}

function isAPIRequest(url) {
  return url.includes('/api/') || url.includes('/auth/');
}

// Send message to main thread
function sendMessage(message) {
  return self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage(message);
    });
  });
}

console.log('Service Worker loaded');
