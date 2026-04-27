// Service Worker for AIVO PWA
// This provides offline functionality and caching strategies

const CACHE_NAME = "aivo-v1";
const STATIC_CACHE = "aivo-static-v1";
const DYNAMIC_CACHE = "aivo-dynamic-v1";

// Assets to cache immediately on install
const STATIC_ASSETS = [
  "/",
  "/dashboard",
  "/login",
  "/manifest.json",
  "/_next/static/css/",
  "/_next/static/chunks/",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

// Cache strategies
const CACHE_STRATEGIES = {
  // Cache first, falling back to network
  CACHE_FIRST: "cache-first",
  // Network first, falling back to cache
  NETWORK_FIRST: "network-first",
  // Stale while revalidate
  STALE_WHILE_REVALIDATE: "stale-while-revalidate",
  // Network only
  NETWORK_ONLY: "network-only",
  // Cache only
  CACHE_ONLY: "cache-only",
};

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Installing...");

  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log("[Service Worker] Caching static assets");
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      // Activate immediately without waiting
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activating...");

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log("[Service Worker] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
          return null;
        })
      );
    }).then(() => {
      // Claim all clients immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - handle requests
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith("http")) {
    return;
  }

  // Skip API requests (let them go to network)
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Determine cache strategy based on request type
  const strategy = getCacheStrategy(url, request);

  event.respondWith(
    handleRequest(request, strategy)
  );
});

function getCacheStrategy(url: URL, request: Request): string {
  // Static assets - cache first
  if (url.pathname.match(/\.(js|css|woff2|ttf|eot|svg|png|jpg|jpeg|gif|ico|webp|avif)$/)) {
    return CACHE_STRATEGIES.CACHE_FIRST;
  }

  // Next.js static files - cache first
  if (url.pathname.includes("/_next/")) {
    return CACHE_STRATEGIES.CACHE_FIRST;
  }

  // HTML pages - network first for fresh content
  if (url.pathname.endsWith(".html") || url.pathname === "/" || !url.pathname.includes(".")) {
    return CACHE_STRATEGIES.NETWORK_FIRST;
  }

  // Images - stale while revalidate
  if (url.pathname.match(/\.(png|jpg|jpeg|gif|webp|avif|svg)$/)) {
    return CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
  }

  // Default - network first
  return CACHE_STRATEGIES.NETWORK_FIRST;
}

async function handleRequest(request: Request, strategy: string): Promise<Response> {
  const cache = await caches.open(DYNAMIC_CACHE);

  switch (strategy) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      return handleCacheFirst(request, cache);

    case CACHE_STRATEGIES.NETWORK_FIRST:
      return handleNetworkFirst(request, cache);

    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      return handleStaleWhileRevalidate(request, cache);

    case CACHE_STRATEGIES.CACHE_ONLY:
      return caches.match(request).then((response) => response || fallbackResponse());

    case CACHE_STRATEGIES.NETWORK_ONLY:
      return fetch(request).catch(() => fallbackResponse());

    default:
      return handleNetworkFirst(request, cache);
  }
}

async function handleCacheFirst(request: Request, cache: Cache): Promise<Response> {
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return fallbackResponse();
  }
}

async function handleNetworkFirst(request: Request, cache: Cache): Promise<Response> {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return fallbackResponse();
  }
}

async function handleStaleWhileRevalidate(request: Request, cache: Cache): Promise<Response> {
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => null);

  // Return cached response immediately if available, otherwise wait for network
  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await fetchPromise;
  return networkResponse || fallbackResponse();
}

function fallbackResponse(): Response {
  // Return a simple offline page for navigation requests
  return new Response(
    `<!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>AIVO - Offline</title>
          <style>
            body {
              font-family: system-ui, sans-serif;
              background: #0f172a;
              color: #e2e8f0;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
            }
            .container {
              text-align: center;
              max-width: 400px;
            }
            h1 { color: #06b6d4; }
            a { color: #06b6d4; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>You're Offline</h1>
            <p>AIVO requires an internet connection to function.</p>
            <p>Please check your connection and try again.</p>
            <p><a href="/">Retry</a></p>
          </div>
        </body>
      </html>`,
    {
      status: 503,
      statusText: "Service Unavailable",
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    }
  );
}

// Handle push notifications (if implemented in future)
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();

  const options = {
    body: data.body || "New notification from AIVO",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    vibrate: [100, 50, 100],
    data: {
      url: data.url || "/",
    },
    actions: [
      {
        action: "view",
        title: "View",
      },
      {
        action: "close",
        title: "Close",
      },
    ],
  };

  event.waitUntil(
    self.registration?.showNotification(data.title || "AIVO", options)
  );
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "view" || event.action === "close") {
    const url = event.notification.data?.url || "/";
    event.waitUntil(
      clients.openWindow(url)
    );
  }
});
