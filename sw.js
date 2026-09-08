self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open('n6-store').then((cache) => {
            return cache.addAll([
                'index.html',
                'style.css',
                'app.js',
                'manifest.json',
                'n6-icon-32.png',
                'n6-icon-192.png',
                'n6-icon-512.png'
            ]);
        })
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => {
            return response || fetch(e.request);
        })
    );
});
