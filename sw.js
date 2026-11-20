const CACHE = 'teacher-quiz-v33';

const CORE = ['./', './index.html', './install.html', './bank.html', './unit.html', './video.html', './vdetail.html', './quiz-data.js', './app.js', './updater.js', './bank-data.js', './bank-data.json', './points-data.js', './hist-points-data.js', './video-data.js', './icon-192.png', './icon-512.png', './manifest.json'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(CORE).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const req = event.request;

  // 页面/导航请求：网络优先，保证每次打开都拿到最新版本（新增题目后可见）
  if (req.mode === 'navigate' || req.destination === 'document' ||
      (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(req).then(resp => {
        if (resp && resp.status === 200) {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(req, copy).catch(() => {}));
          // 同时更新根路径缓存
          caches.open(CACHE).then(c => c.put('./', copy.clone()).catch(() => {}));
        }
        return resp;
      }).catch(() => caches.match(req).then(r => r || caches.match('./') || caches.match('./index.html')))
    );
    return;
  }

  // 其它静态资源：缓存优先
  event.respondWith(
    caches.match(req).then(cached => {
      return cached || fetch(req).then(resp => {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(req, copy).catch(() => {}));
        }
        return resp;
      }).catch(() => cached);
    })
  );
});


self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
