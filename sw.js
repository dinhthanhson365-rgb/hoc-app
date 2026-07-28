// Service Worker — cho phép cài app & học OFFLINE
// Chiến lược: file app (HTML/icon/ngữ pháp) cache trước; từ điển lớn cache khi dùng lần đầu.
var VERSION = 'hsk-pwa-v2';   // nâng phiên bản → người dùng nhận bản mới (tra Việt→Trung + tab Dịch)
var CORE = [
  './',
  './index.html',
  './tu-vung-tieng-trung.html',
  './hoc-tieng-anh.html',
  './nguphap.json',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(VERSION).then(function (c) {
      // addAll từng cái để 1 file lỗi không làm hỏng cả bộ
      return Promise.all(CORE.map(function (u) { return c.add(u).catch(function () {}); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // Không đụng vào API bên ngoài (Ollama, ảnh, HanziWriter CDN để trình duyệt tự lo)
  if (url.origin !== location.origin) return;
  // App & dữ liệu cùng nguồn: ưu tiên MẠNG, rớt mạng thì lấy CACHE (luôn mới khi online, vẫn chạy khi offline)
  e.respondWith(
    fetch(e.request).then(function (res) {
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(VERSION).then(function (c) { c.put(e.request, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
        return hit || new Response('Offline', { status: 503 });
      });
    })
  );
});
