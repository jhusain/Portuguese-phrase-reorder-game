const CACHE_VERSION = 'v1'
const APP_SHELL_CACHE = `pprg-app-shell-${CACHE_VERSION}`
const ASSET_CACHE = `pprg-static-assets-${CACHE_VERSION}`
const DATA_CACHE = `pprg-problem-data-${CACHE_VERSION}`

const scopeUrl = new URL(self.registration.scope)
const INDEX_URL = new URL('index.html', scopeUrl).toString()
const MANIFEST_URL = new URL('manifest.webmanifest', scopeUrl).toString()
const ICON_192_URL = new URL('icons/icon-192.svg', scopeUrl).toString()
const ICON_512_URL = new URL('icons/icon-512.svg', scopeUrl).toString()
const PROBLEMS_PATH = new URL('problems.json', scopeUrl).pathname
const SERVICE_WORKER_PATH = new URL('service-worker.js', scopeUrl).pathname

const APP_SHELL_ASSETS = [INDEX_URL, MANIFEST_URL, ICON_192_URL, ICON_512_URL]

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(APP_SHELL_CACHE)
        await cache.addAll(APP_SHELL_ASSETS)
      } catch (error) {
        console.warn('Service worker installation failed to cache app shell.', error)
      } finally {
        self.skipWaiting()
      }
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames
          .filter((name) => ![APP_SHELL_CACHE, ASSET_CACHE, DATA_CACHE].includes(name))
          .map((name) => caches.delete(name)),
      )

      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') {
    return
  }

  const url = new URL(request.url)

  if (url.origin !== scopeUrl.origin) {
    return
  }

  if (!url.pathname.startsWith(scopeUrl.pathname)) {
    return
  }

  if (url.pathname === SERVICE_WORKER_PATH) {
    return
  }

  if (url.pathname === PROBLEMS_PATH) {
    event.respondWith(networkFirst(request))
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request))
    return
  }

  const assetDestinations = ['style', 'script', 'worker', 'font', 'image']
  if (assetDestinations.includes(request.destination)) {
    event.respondWith(cacheFirst(request))
    return
  }

  event.respondWith(cacheFirst(request))
})

async function handleNavigationRequest(request) {
  try {
    const response = await fetch(request)
    const cache = await caches.open(APP_SHELL_CACHE)
    cache.put(INDEX_URL, response.clone())
    return response
  } catch (error) {
    const cached = await caches.match(INDEX_URL)
    if (cached) {
      return cached
    }

    return new Response('Offline', {
      status: 503,
      statusText: 'Offline',
      headers: { 'Content-Type': 'text/plain' },
    })
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) {
    return cached
  }

  try {
    const response = await fetch(request)
    const cache = await caches.open(ASSET_CACHE)
    cache.put(request, response.clone())
    return response
  } catch (error) {
    const fallback = await caches.match(INDEX_URL)
    if (request.mode === 'navigate' && fallback) {
      return fallback
    }

    throw error
  }
}

async function networkFirst(request) {
  const cache = await caches.open(DATA_CACHE)

  try {
    const response = await fetch(request)
    cache.put(request, response.clone())
    return response
  } catch (error) {
    const cached = await cache.match(request)
    if (cached) {
      return cached
    }

    return new Response('Offline', {
      status: 503,
      statusText: 'Offline',
      headers: { 'Content-Type': 'text/plain' },
    })
  }
}
