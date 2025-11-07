const CACHE_NAME = 'minicofre-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/index.tsx',
  '/App.tsx',
  '/types.ts',
  '/hooks/useVault.ts',
  '/services/cryptoService.ts',
  '/services/storageService.ts',
  '/services/googleService.ts',
  '/components/LockScreen.tsx',
  '/components/Vault.tsx',
  '/components/ItemList.tsx',
  '/components/ItemForm.tsx',
  '/components/ViewItem.tsx',
  '/components/VirtualKeyboard.tsx',
  '/components/common/Icons.tsx',
  '/assets/icon.svg',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    // Network falling back to cache
    fetch(event.request).then(response => {
      // If the request is successful, update the cache
      if (response.status === 200) {
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
      }
      return response;
    }).catch(() => {
      // If the network fails, serve from cache
      return caches.match(event.request).then(response => {
        if (response) {
          return response;
        }
      });
    })
  );
});
