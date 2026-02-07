/**
 * บันทึกของหมูบิว - Service Worker
 * Version: 1.0.0
 */

const CACHE_NAME = 'mubew-cache-v2';

const FILES_TO_CACHE = [
    './',
    './index.html',
    './css/main.css',
    './js/utils.js',
    './js/storage.js',
    './js/sync.js',
    './js/app.js',
    './manifest.json',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css',
    'https://cdn.jsdelivr.net/npm/flatpickr',
    'https://cdn.jsdelivr.net/npm/flatpickr/dist/l10n/th.js',
    'https://fonts.googleapis.com/css2?family=Mali:wght@300;400;500;600;700&display=swap'
];

// Install Event - Cache Files
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Install');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching all: app shell and content');
            return cache.addAll(FILES_TO_CACHE);
        })
    );
});

// Activate Event - Cleanup Old Caches
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activate');
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('[Service Worker] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    self.clients.claim();
});

// Fetch Event - Network First, falling back to cache
self.addEventListener('fetch', (event) => {
    // Skip cross-origin requests like Google API unless specifically cached
    if (!event.request.url.startsWith(self.location.origin) &&
        !FILES_TO_CACHE.some(url => event.request.url.includes(url))) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Check if we received a valid response
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }

                // Clone the response
                const responseToCache = response.clone();

                caches.open(CACHE_NAME)
                    .then((cache) => {
                        cache.put(event.request, responseToCache);
                    });

                return response;
            })
            .catch(() => {
                // Return cached response if network fails
                return caches.match(event.request);
            })
    );
});
