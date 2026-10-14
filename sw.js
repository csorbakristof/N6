const CACHE_NAME = 'n6-store-v3';

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                'index.html',
                'style.css',
                'app.js',
                'manifest.json',
                'method-reminders.txt',
                'n6-icon-32.png',
                'n6-icon-192.png',
                'n6-icon-512.png'
            ]);
        })
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        ))
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => {
            return response || fetch(e.request);
        })
    );
});
