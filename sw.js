// 監査論 一問一答 オフライン対応 Service Worker
// HTML（ナビゲーション）はネットワーク優先：サイトの更新が端末に届くようにする。取得に失敗したとき（オフライン・通信制限）はキャッシュを返す
// それ以外のファイルは cache-first：一度読み込んだファイルを端末に保存し、次回からは通信なしで開けるようにする
const CACHE_NAME = 'kansaron-quiz-v2';
const PRECACHE_URLS = ['./', './index.html'];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(PRECACHE_URLS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(
          keys.filter(function (k) { return k !== CACHE_NAME; })
              .map(function (k) { return caches.delete(k); })
        );
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  var accept = event.request.headers.get('accept') || '';
  var isHtml = event.request.mode === 'navigate' || accept.indexOf('text/html') !== -1;
  if (isHtml) {
    // ネットワーク優先：最新を取得できたらそれを返し、キャッシュも更新する。失敗時はキャッシュにフォールバック
    event.respondWith(
      fetch(event.request).then(function (response) {
        if (response && response.status === 200 && response.type === 'basic') {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copy); });
        }
        return response;
      }).catch(function () {
        return caches.match(event.request, { ignoreSearch: true }).then(function (cached) {
          if (cached) return cached;
          return caches.match('./index.html', { ignoreSearch: true });
        });
      })
    );
    return;
  }
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (response) {
        if (response && response.status === 200 && response.type === 'basic') {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copy); });
        }
        return response;
      });
    })
  );
});
