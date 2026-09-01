const CACHE_NAME = 'poysha-pos-ui-v4';
const DYNAMIC_CACHE = 'poysha-pos-dynamic-v4';

// অ্যাপের মূল পেজগুলো (যাতে ইন্টারনেট ছাড়াও অফলাইনে ডিজাইন লোড হয়)
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './dashboard.html',
    './home.html',
    './monthly_report.html',
    './settings.html',
    './reports.html',
    './product_list.html',
    './purchase.html',
    './sell.html',
    './cashbox.html',
    './due_book.html',
    './expenses_book.html',
    './contacts.html',
    './business_report.html',
    './app_access.html',
    './barcode_gen.html',
    './sales_return.html',
    './purchase_return.html',
    './printer.html',
    './header.html',
    './bottom_nav.html',
    './firebase_config.js',
    './invoice_kit.js',
    './manifest.json',
    './icon-192x192.png',
    './icon-512x512.png',
    './estimate.html',
    './sales_book.html',
    './purchase_book.html',
    './stock_book.html',
    './order_book.html',
    './unit_admin.html',
    './notes.html',
    './expire_product.html'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log("Caching App Shell...");
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(keys.map(key => {
                if (key !== CACHE_NAME && key !== DYNAMIC_CACHE) {
                    console.log("Removing old cache:", key);
                    return caches.delete(key);
                }
            }));
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    const req = event.request;

    if (req.url.includes('firestore.googleapis.com') || 
        req.url.includes('firebaseio.com') || 
        req.url.includes('google.com') ||
        req.url.includes('imgbb.com')) {
        return;
    }

    if (req.headers.get('accept') && req.headers.get('accept').includes('text/html')) {
        event.respondWith(
            fetch(req)
                .then(networkRes => {
                    const resClone = networkRes.clone();
                    caches.open(DYNAMIC_CACHE).then(cache => cache.put(req, resClone));
                    return networkRes;
                })
                .catch(() => caches.match(req))
        );
        return;
    }

    event.respondWith(
        caches.match(req).then(cachedRes => {
            return cachedRes || fetch(req).then(networkRes => {
                caches.open(DYNAMIC_CACHE).then(cache => cache.put(req, networkRes.clone()));
                return networkRes;
            });
        })
    );
});
