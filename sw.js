const CACHE = 'blepper-ledger-v3';
const ASSETS = ['./', './index.html', './styles.css', './custom.css', './app.js?v=3', './manifest.webmanifest', './assets/cat-launcher-icon.png'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))));
self.addEventListener('fetch', event => event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request))));
