const APP_SHELL_CACHE = 'app-shell-v2'
const APP_SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './problems.json',
  './vite.svg',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_ASSETS)),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== APP_SHELL_CACHE).map((key) => caches.delete(key))),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') {
    return
  }

  if (request.url.includes('/problems.json')) {
    event.respondWith(networkFirst(request))
    return
  }

  event.respondWith(cacheFirst(request))
})

async function cacheFirst(request) {
  const cache = await caches.open(APP_SHELL_CACHE)
  const cachedResponse = await cache.match(request)
  if (cachedResponse) {
    return cachedResponse
  }

  const networkResponse = await fetch(request)
  if (networkResponse && networkResponse.ok) {
    cache.put(request, networkResponse.clone())
  }
  return networkResponse
}

async function networkFirst(request) {
  const cache = await caches.open(APP_SHELL_CACHE)
  try {
    const networkResponse = await fetch(request)
    if (networkResponse && networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    const cachedResponse = await cache.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    throw error
  }
}
