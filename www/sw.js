const CACHE_NAME = 'poysha-pos-ui-v3'; // ক্যাশের নাম আপডেট করা হয়েছে (নতুন ব্র্যান্ডিং + নতুন ফাইল যোগ)
const DYNAMIC_CACHE = 'poysha-pos-dynamic-v3';

// অ্যাপের মূল পেজগুলো (যাতে ইন্টারনেট ছাড়াও অ্যাপের ডিজাইন লোড হয়)
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './dashboard.html',
    './home.html',
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

// ১. ইন্সটল ইভেন্ট - অ্যাপের ডিজাইন ফাইলগুলো ক্যাশ করবে
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log("Caching App Shell...");
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// ২. অ্যাক্টিভেট ইভেন্ট - পুরোনো কোনো ক্যাশ থাকলে তা মুছে ফেলবে
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

// ৩. ফেচ ইভেন্ট - ডাটা রিকোয়েস্ট ম্যানেজমেন্ট
self.addEventListener('fetch', event => {
    const req = event.request;

    // 🔥 রুল ১: ফায়ারবেস বা যেকোনো এপিআই ডাটা কখনোই ক্যাশ করবে না (Always Network)
    if (req.url.includes('firestore.googleapis.com') || 
        req.url.includes('firebaseio.com') || 
        req.url.includes('google.com') ||
        req.url.includes('imgbb.com')) {
        return; // ব্রাউজারকে সরাসরি ইন্টারনেট থেকে আনতে বলবে
    }

    // 🔥 রুল ২: HTML ফাইলগুলোর জন্য "Network First, Fallback to Cache"
    // (মানে আগে ইন্টারনেট থেকে নতুন ডিজাইন খুঁজবে, না পেলে তখন অফলাইনেরটা দেখাবে)
    if (req.headers.get('accept').includes('text/html')) {
        event.respondWith(
            fetch(req)
                .then(networkRes => {
                    const resClone = networkRes.clone();
                    caches.open(DYNAMIC_CACHE).then(cache => cache.put(req, resClone));
                    return networkRes;
                })
                .catch(() => caches.match(req)) // ইন্টারনেট না থাকলে ক্যাশ থেকে
        );
        return;
    }

    // 🔥 রুল ৩: ছবি, CSS, ফন্ট ইত্যাদির জন্য "Cache First"
    event.respondWith(
        caches.match(req).then(cachedRes => {
            return cachedRes || fetch(req).then(networkRes => {
                caches.open(DYNAMIC_CACHE).then(cache => cache.put(req, networkRes.clone()));
                return networkRes;
            });
        })
    );
});
