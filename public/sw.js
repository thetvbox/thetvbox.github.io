// Hand-rolled offline service worker for TV Box.
//
// Strategy:
//  - App shell (/, /index.html, /manifest.json, icons): precached on
//    install; HTML navigations are network-first so a fresh deploy is
//    always picked up while online, falling back to the cached shell when
//    offline.
//  - Hashed build assets (/assets/*): cache-first, since a given filename's
//    content never changes -- once cached, always safe to reuse.
//  - TMDB poster/backdrop images: stale-while-revalidate, so posters show
//    instantly from cache while a fresh copy is fetched in the background.
//  - Everything else (Supabase, TMDB/TVmaze/OMDb API calls, and any other
//    cross-origin request) is left untouched -- this service worker makes
//    the app shell and static assets resilient to being offline, not live
//    data.
//  - Web Push: shows a notification for whatever {title, body, url} the
//    send-push Edge Function sent, and focuses (or opens) that url on click.
//    See src/lib/pushNotifications.ts for how a device subscribes.

const CACHE_VERSION = 'v1'
const SHELL_CACHE = `tv-box-shell-${CACHE_VERSION}`
const ASSET_CACHE = `tv-box-assets-${CACHE_VERSION}`
const IMAGE_CACHE = `tv-box-images-${CACHE_VERSION}`
const CURRENT_CACHES = [SHELL_CACHE, ASSET_CACHE, IMAGE_CACHE]

const SHELL_URLS = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png', '/favicon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
      .catch(() => {
        // A precache failure (e.g. offline on first install) shouldn't
        // block activation -- the fetch handler still degrades gracefully.
      }),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((name) => !CURRENT_CACHES.includes(name)).map((name) => caches.delete(name))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('push', (event) => {
  let payload = { title: 'TV Box', body: 'You have a new notification.', url: '/' }
  try {
    if (event.data) payload = { ...payload, ...event.data.json() }
  } catch {
    // A malformed or missing payload still shows a generic notification
    // rather than silently doing nothing.
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: payload.url },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data && event.notification.data.url ? event.notification.data.url : '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      return self.clients.openWindow(targetUrl)
    }),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithShellFallback(request))
    return
  }

  if (url.origin === self.location.origin && url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request, ASSET_CACHE))
    return
  }

  if (url.hostname === 'image.tmdb.org') {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE))
  }
})

/** Network-first navigation, refreshing the shell cache on success and falling back to it (or index.html) when offline. */
async function networkFirstWithShellFallback(request) {
  const cache = await caches.open(SHELL_CACHE)
  try {
    const response = await fetch(request)
    cache.put(request, response.clone())
    return response
  } catch {
    return (await cache.match(request)) || (await cache.match('/index.html'))
  }
}

/** Serves a cached response when present; otherwise fetches and caches it for next time. */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) cache.put(request, response.clone())
  return response
}

/** Serves the cached response immediately (when present) while refreshing the cache in the background. */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  const networkFetch = fetch(request)
    .then((response) => {
      if (response.ok || response.type === 'opaque') cache.put(request, response.clone())
      return response
    })
    .catch(() => null)

  if (cached) {
    networkFetch.catch(() => {})
    return cached
  }
  return (await networkFetch) || fetch(request)
}
