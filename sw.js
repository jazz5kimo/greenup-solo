// GreenUP 原型：離線快取（網路優先，失敗時用快取），部署新版時會自動取得最新檔案
// 向伺服器確認檔案有沒有更新（no-cache），避免瀏覽器快取讓新舊版本的程式混在一起
const CACHE = 'greenup-solo-v4';
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  // 金流／AI 代理等 n8n webhook 與 API 回應不可快取（避免離線時拿到舊的付款狀態）
  if (/\/webhook\/|\/api\//.test(url.pathname)) return;
  e.respondWith(
    // 頁面導覽的 Request 不能帶 RequestInit，改用網址重新發出；被轉址時交給瀏覽器重新導向
    fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then(res => {
      if (res.redirected && req.mode === 'navigate') return Response.redirect(res.url, 302);
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match('./index.html')))
  );
});
