const CACHE_NAME = 'n6-store-v4';
const FILES = [
    'index.html',
    'style.css',
    'app.js',
    'manifest.json',
    'method-reminders.txt',
    'n6-icon-32.png',
    'n6-icon-192.png',
    'n6-icon-512.png'
];

self.addEventListener('install', (e) => {
    // cache: 'reload' bypasses the browser HTTP cache so a new version never caches stale files
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(FILES.map((file) => new Request(file, { cache: 'reload' }))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

// Network first so updates show up immediately; the cache is the offline fallback.
// 'no-cache' revalidates instead of trusting the HTTP cache (GitHub Pages sends max-age=600)
self.addEventListener('fetch', (e) => {
    if (e.request.method !== 'GET') return;
    e.respondWith(
        fetch(e.request.url, { cache: 'no-cache' })
            .then((response) => {
                if (response.ok && new URL(e.request.url).origin === location.origin) {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(e.request, copy));
                }
                return response;
            })
            .catch(() => caches.match(e.request))
    );
});
