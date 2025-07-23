const CACHE_NAME = 'disparador-pro-v2.0.0'; // Altere a versão aqui para forçar update
const urlsToCache = [
  './index.html',
  './main.js',
  './layout.css',
  './manifest.json',
  './img/logo.png',
  './img/icon-192.png',
  './img/icon-512.png',
  // CDNs importantes
  'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.10.0/font/bootstrap-icons.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

// Install - instala nova versão
self.addEventListener('install', event => {
  console.log('SW: Installing new version...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('SW: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('SW: Installation complete');
        // Força ativação imediata da nova versão
        return self.skipWaiting();
      })
  );
  self.skipWaiting();
});

// Activate - limpa cache antigo
self.addEventListener('activate', event => {
  console.log('SW: Activating new version...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('SW: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('SW: Activation complete');
      // Toma controle de todas as abas imediatamente
      return self.clients.claim();
    })
  );
  // ✅ Controlar clientes imediatamente
  return self.clients.claim();
});

// Fetch - serve arquivos do cache
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Se está no cache, retorna. Senão, busca da rede
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
      )
  );
});

// Mensagem para o cliente quando há nova versão
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});