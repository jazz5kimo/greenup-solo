// 金流（綠界 ECPay／藍新 NewebPay）前端共用模組
// 瀏覽器永遠不碰 HashKey／HashIV／商店金鑰：只呼叫該業主 n8n 的 webhook（契約見 PAY-BRIEF）。
//   建立付款  POST <base>/pay/create   → 回 { action, httpMethod, fields } 由瀏覽器做隱藏表單自動送出
//   查詢狀態  GET  <base>/pay/status?orderId=…  → { status: pending|paid|failed|expired|none, atm, cvs, … }
// 每個業主一份設定（localStorage key 以 greenup-solo: 開頭，tenant.js 會自動依業主分開），跨分頁即時同步。
//   { mode: 'demo'|'live', base: '<n8n webhook base>', methods: ['credit','atm','cvs','linepay'] }
//   demo（預設）：維持原本的模擬付款，不連線；live：正式模式需安裝包 n8n 金流設定。
// 實作時以綠界／藍新最新技術文件為準（簽章與欄位都在 n8n 端處理，瀏覽器只轉送表單）。
import { TENANT_ID } from './tenant.js';
import { store } from './state.js';
import { PRODUCT_MAP } from './data.js';
import { auctions } from './auction-store.js';

const LS = 'greenup-solo:pay-config';
const LS_ORDERS = 'greenup-solo:pay-orders'; // { orderId: { method, provider, env, paymentId, merchantTradeNo, tradeNo, status, createdAt, paidAt } }
const CH = 'greenup-pay';

export const PAY_NOTE = '正式模式需安裝包 n8n 金流設定；示範模式不連線';
export const POLL_INTERVAL = 3000;
export const POLL_MAX = 10 * 60 * 1000;
export const REQUEST_TIMEOUT = 10000;

export const METHODS = [
  { id: 'credit', zh: '信用卡', en: 'Credit card', ja: 'クレジットカード', vi: 'Thẻ tín dụng', ms: 'Kad kredit', pay: '信用卡' },
  { id: 'atm', zh: 'ATM 轉帳', en: 'ATM transfer', ja: 'ATM 振込', vi: 'Chuyển khoản ATM', ms: 'Pindahan ATM', pay: 'ATM 轉帳' },
  { id: 'cvs', zh: '超商代碼', en: 'Convenience store code', ja: 'コンビニ支払い', vi: 'Mã thanh toán cửa hàng tiện lợi', ms: 'Kod kedai serbaneka', pay: '超商代碼' },
  { id: 'linepay', zh: 'LINE Pay', en: 'LINE Pay', ja: 'LINE Pay', vi: 'LINE Pay', ms: 'LINE Pay', pay: 'LINE Pay' },
];
export const METHOD_MAP = Object.fromEntries(METHODS.map(m => [m.id, m]));
export const methodLabel = (id, lang = 'zh') => { const m = METHOD_MAP[id]; return m ? (m[lang] || m.en || m.zh) : id; };
export const methodPayment = (id) => (METHOD_MAP[id] ? METHOD_MAP[id].pay : '信用卡'); // 寫進訂單 payment 欄位（後台以中文顯示）
export const PROVIDER_NAME = { ecpay: '綠界 ECPay', newebpay: '藍新 NewebPay' };
export const STATUS_LABEL = { pending: '待付款', paid: '已付款', failed: '付款失敗', expired: '已逾期', none: '尚未建立付款', error: '查詢失敗' };

const DEFAULT = { mode: 'demo', base: '', methods: ['credit', 'atm', 'cvs', 'linepay'] };

// ---- 設定 ----
let cache = null;
function load() {
  if (cache) return cache;
  try { const raw = localStorage.getItem(LS); cache = Object.assign({}, DEFAULT, raw ? JSON.parse(raw) : {}); } catch { cache = { ...DEFAULT }; }
  if (!Array.isArray(cache.methods) || !cache.methods.length) cache.methods = DEFAULT.methods.slice();
  cache.methods = cache.methods.filter(m => METHOD_MAP[m]);
  if (!cache.methods.length) cache.methods = ['credit'];
  cache.mode = cache.mode === 'live' ? 'live' : 'demo';
  cache.base = normalizeBase(cache.base);
  return cache;
}
export const normalizeBase = (s) => String(s || '').trim().replace(/\/+$/, '');

let bc = null;
try { bc = new BroadcastChannel(CH); } catch { bc = null; }
const listeners = new Set();
const emit = () => listeners.forEach(fn => { try { fn(getPayConfig()); } catch { /* ignore */ } });
if (bc) bc.onmessage = (e) => { cache = null; recCache = null; if (!e.data || e.data.kind !== 'order') emit(); else orderListeners.forEach(fn => { try { fn(e.data.orderId, getPayRecord(e.data.orderId)); } catch { /* ignore */ } }); };
window.addEventListener('storage', (e) => {
  if (e.key === LS) { cache = null; emit(); }
  if (e.key === LS_ORDERS) { recCache = null; orderListeners.forEach(fn => { try { fn(null, null); } catch { /* ignore */ } }); }
});
export const onPayConfig = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

export function getPayConfig() { return { ...load(), methods: load().methods.slice() }; }
export function setPayConfig(patch) {
  const next = Object.assign({}, load(), patch);
  next.base = normalizeBase(next.base);
  if (!Array.isArray(next.methods) || !next.methods.length) next.methods = ['credit'];
  cache = next;
  try { localStorage.setItem(LS, JSON.stringify(next)); } catch { /* ignore */ }
  try { bc && bc.postMessage({ t: Date.now(), tenant: TENANT_ID, kind: 'config' }); } catch { /* ignore */ }
  emit();
  return getPayConfig();
}
export const isLive = () => load().mode === 'live' && !!load().base;
export const payBase = () => load().base;
export const enabledMethods = () => load().methods.slice();

// ---- 每筆訂單的線上付款紀錄（provider／tradeNo／method） ----
let recCache = null;
const orderListeners = new Set();
function loadRecs() {
  if (recCache) return recCache;
  try { recCache = JSON.parse(localStorage.getItem(LS_ORDERS) || '{}') || {}; } catch { recCache = {}; }
  return recCache;
}
export const onPayRecord = (fn) => { orderListeners.add(fn); return () => orderListeners.delete(fn); };
export function getPayRecord(orderId) { const r = loadRecs()[orderId]; return r ? { ...r } : null; }
export function getPayRecords() { return { ...loadRecs() }; }
export function setPayRecord(orderId, patch) {
  const recs = loadRecs();
  recs[orderId] = Object.assign({}, recs[orderId] || { createdAt: Date.now() }, patch, { updatedAt: Date.now() });
  // 只留最近 200 筆
  const keys = Object.keys(recs); if (keys.length > 200) for (const k of keys.sort((a, b) => (recs[a].createdAt || 0) - (recs[b].createdAt || 0)).slice(0, keys.length - 200)) delete recs[k];
  recCache = recs;
  try { localStorage.setItem(LS_ORDERS, JSON.stringify(recs)); } catch { /* ignore */ }
  try { bc && bc.postMessage({ t: Date.now(), tenant: TENANT_ID, kind: 'order', orderId }); } catch { /* ignore */ }
  orderListeners.forEach(fn => { try { fn(orderId, getPayRecord(orderId)); } catch { /* ignore */ } });
  return getPayRecord(orderId);
}

// ---- 錯誤 ----
export class PayError extends Error {
  constructor(kind, message, extra = {}) { super(message); this.name = 'PayError'; this.kind = kind; Object.assign(this, extra); }
}
// kind：network（連不上 n8n）、http（HTTP 錯）、timeout（逾時）、api（n8n 回 ok:false）、bad（回應格式不對）、config（未設定）
export function errorText(err) {
  if (!err) return '未知錯誤';
  if (err instanceof PayError || err.kind) {
    switch (err.kind) {
      case 'network': return `連不上 n8n（${err.base || payBase() || '未設定網址'}）：請確認網址、網路與 Caddy／n8n 是否啟動`;
      case 'timeout': return `n8n 逾時（${Math.round((err.ms || REQUEST_TIMEOUT) / 1000)} 秒沒有回應）`;
      case 'http': return `n8n 回應 HTTP ${err.status}${err.message && err.message !== String(err.status) ? `：${err.message}` : ''}`;
      case 'api': return `金流錯誤${err.code ? `（${err.code}）` : ''}：${err.message || '請稍後再試'}`;
      case 'bad': return `n8n 回應格式不符契約：${err.message || ''}`;
      case 'config': return err.message || '尚未設定 n8n 網址';
      default: return err.message || String(err);
    }
  }
  return err.message || String(err);
}

// ---- HTTP（統一逾時與錯誤分類） ----
async function request(url, { method = 'GET', body = null, timeout = REQUEST_TIMEOUT, base = payBase() } = {}) {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = setTimeout(() => { try { ctrl && ctrl.abort(); } catch { /* ignore */ } }, timeout);
  let res;
  try {
    res = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, signal: ctrl ? ctrl.signal : undefined, cache: 'no-store' });
  } catch (e) {
    clearTimeout(timer);
    if (e && e.name === 'AbortError') throw new PayError('timeout', '逾時', { ms: timeout, base });
    throw new PayError('network', e && e.message ? e.message : 'fetch failed', { base });
  }
  clearTimeout(timer);
  let data = null, text = '';
  try { text = await res.text(); data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!res.ok) {
    const msg = data && data.error && data.error.message ? data.error.message : (text || '').slice(0, 120);
    throw new PayError('http', msg || String(res.status), { status: res.status, code: data && data.error && data.error.code, base });
  }
  if (!data || typeof data !== 'object') {
    // 後台的 service worker（sw.js）網路失敗時會回快取、甚至 index.html：這種情況視為連不上 n8n
    const ct = (res.headers && res.headers.get('content-type')) || '';
    if (/html/i.test(ct) || /^\s*</.test(text)) throw new PayError('network', '收到 HTML 而非 JSON（可能是離線快取或網址錯誤）', { base });
    throw new PayError('bad', '不是 JSON', { base });
  }
  return data;
}

// ---- 建立付款 ----
// order：store 的訂單物件；method：credit|atm|cvs|linepay|all
export async function createPayment(order, method, { lang = 'zh', returnUrl = defaultReturnUrl(), customer = null, base = payBase() } = {}) {
  if (!base) throw new PayError('config', '尚未設定 n8n 網址（後台「金流對帳」→ 金流設定）');
  if (!order || !order.id) throw new PayError('bad', '沒有訂單');
  const items = (order.items || []).map(it => ({ name: it.name || (PRODUCT_MAP[it.pid] && PRODUCT_MAP[it.pid].name) || it.pid, qty: it.qty, price: it.price }));
  if (order.shipping) items.push({ name: '運費', qty: 1, price: order.shipping });
  if (order.discount) items.push({ name: '折扣', qty: 1, price: -order.discount });
  const body = {
    tenant: TENANT_ID, orderId: order.id, amount: Math.round(order.total), currency: 'TWD', items,
    method: (METHOD_MAP[method] || method === 'all') ? method : 'all',
    customer: Object.assign({ name: order.customer || '', email: '', phone: '' }, customer || {}),
    returnUrl, lang,
  };
  const data = await request(`${base}/pay/create`, { method: 'POST', body, base });
  if (data.ok === false) throw new PayError('api', (data.error && data.error.message) || '建立付款失敗', { code: data.error && data.error.code, base });
  if (!data.action || !data.fields || typeof data.fields !== 'object') throw new PayError('bad', '缺少 action 或 fields', { base });
  setPayRecord(order.id, { method: body.method, provider: data.provider || '', env: data.env || '', paymentId: data.paymentId || '', merchantTradeNo: data.merchantTradeNo || '', status: 'pending', amount: body.amount, action: data.action });
  return data;
}

// 把 fields 做成隱藏表單 POST（或 GET）到金流商頁面；回傳 form 元素（測試可攔截）
export function submitToGateway(res, { target = '_self' } = {}) {
  const form = document.createElement('form');
  form.method = (res.httpMethod || 'POST').toUpperCase() === 'GET' ? 'GET' : 'POST';
  form.action = res.action;
  form.target = target;
  form.acceptCharset = 'UTF-8';
  form.style.display = 'none';
  form.dataset.payForm = res.provider || '';
  for (const [k, v] of Object.entries(res.fields || {})) {
    const inp = document.createElement('input');
    inp.type = 'hidden'; inp.name = k; inp.value = v == null ? '' : String(v);
    form.appendChild(inp);
  }
  document.body.appendChild(form);
  try { form.submit(); } catch (e) { form.remove(); throw new PayError('bad', `無法送出表單：${e.message}`); }
  return form;
}

export function defaultReturnUrl({ lang = '' } = {}) {
  const u = new URL('pay-return.html', location.href);
  u.search = '';
  u.searchParams.set('tenant', TENANT_ID);
  if (lang) u.searchParams.set('lang', lang);
  return u.toString();
}

// ---- 查詢狀態 ----
export async function fetchStatus(orderId, { base = payBase(), timeout = REQUEST_TIMEOUT } = {}) {
  if (!base) throw new PayError('config', '尚未設定 n8n 網址');
  const data = await request(`${base}/pay/status?orderId=${encodeURIComponent(orderId)}&_=${Date.now()}`, { base, timeout });
  if (data.ok === false) throw new PayError('api', (data.error && data.error.message) || '查詢失敗', { code: data.error && data.error.code, base });
  if (!data.status) throw new PayError('bad', '缺少 status', { base });
  // sw.js 離線時會用「忽略查詢字串」的快取回應：訂單編號對不上就當作連不上 n8n，絕不拿別筆訂單的狀態入帳
  if (data.orderId && String(data.orderId) !== String(orderId)) throw new PayError('network', `回應的訂單編號不符（${data.orderId}），可能是離線快取`, { base });
  return data;
}

// 狀態變 paid：入帳（store.markPaid）並記下 provider／tradeNo／method
export function applyStatus(orderId, st) {
  if (!st) return null;
  const patch = { status: st.status };
  for (const k of ['provider', 'env', 'method', 'merchantTradeNo', 'tradeNo', 'paidAt', 'atm', 'cvs', 'amount']) if (st[k] !== undefined && st[k] !== null) patch[k] = st[k];
  const rec = setPayRecord(orderId, patch);
  if (st.status === 'paid') {
    const o = store.live.find(x => x.id === orderId) || store.history.find(x => x.id === orderId);
    if (o) {
      o.pay = { provider: st.provider || rec.provider || '', tradeNo: st.tradeNo || '', method: st.method || rec.method || '', merchantTradeNo: st.merchantTradeNo || rec.merchantTradeNo || '', env: st.env || rec.env || '' };
      if (st.method && METHOD_MAP[st.method]) o.payment = methodPayment(st.method);
      store.markPaid(orderId);
    }
    // 競標得標訂單：得標紀錄跟著標記已付款
    try { const a = auctions.list().find(x => x.orderId === orderId && x.winner && !x.paidAt); if (a) auctions.markPaid(a.id); } catch { /* ignore */ }
  }
  return rec;
}

// 每 interval 查一次，最多 max；onUpdate({ status, data, error, elapsed, tries })；回傳 { stop, promise }
export function pollStatus(orderId, { interval = POLL_INTERVAL, max = POLL_MAX, onUpdate = () => {}, base = payBase(), stopOn = ['paid', 'failed', 'expired'] } = {}) {
  let stopped = false, timer = null, tries = 0;
  const start = Date.now();
  let resolveP; const promise = new Promise(r => { resolveP = r; });
  const finish = (result) => { if (stopped) return; stopped = true; clearTimeout(timer); resolveP(result); };
  const tick = async () => {
    if (stopped) return;
    tries += 1;
    try {
      const data = await fetchStatus(orderId, { base });
      if (stopped) return;
      applyStatus(orderId, data);
      onUpdate({ status: data.status, data, error: null, elapsed: Date.now() - start, tries });
      if (stopOn.includes(data.status)) { finish({ status: data.status, data, timeout: false }); return; }
    } catch (e) {
      if (stopped) return;
      onUpdate({ status: 'error', data: null, error: e, elapsed: Date.now() - start, tries });
    }
    if (Date.now() - start >= max) { finish({ status: 'timeout', data: null, timeout: true }); return; }
    timer = setTimeout(tick, interval);
  };
  tick();
  return { stop: () => finish({ status: 'stopped', data: null, timeout: false }), promise };
}

// ---- 連線測試：pay/status?orderId=TEST 期望 status: none ----
export async function testConnection(base = payBase(), { timeout = 8000 } = {}) {
  base = normalizeBase(base);
  if (!base) throw new PayError('config', '請先填 n8n webhook 網址（例如 https://你的網域/t/' + TENANT_ID + '/webhook）');
  if (!/^https?:\/\//i.test(base)) throw new PayError('config', '網址要以 http:// 或 https:// 開頭');
  const t0 = Date.now();
  const data = await request(`${base}/pay/status?orderId=TEST&_=${Date.now()}`, { base, timeout });
  const ms = Date.now() - t0;
  if (data.ok === false) throw new PayError('api', (data.error && data.error.message) || '查詢失敗', { code: data.error && data.error.code, base });
  if (data.orderId && data.orderId !== 'TEST') throw new PayError('network', `回應的訂單編號不符（${data.orderId}），可能是離線快取`, { base });
  if (data.status !== 'none') throw new PayError('bad', `orderId=TEST 應回 status: none，實際為 ${JSON.stringify(data.status)}`, { base });
  return { ok: true, ms, data };
}

// 畫面用：ATM／超商資訊格式化
export const fmtExpire = (s) => {
  if (!s) return '';
  const d = new Date(s); if (isNaN(d)) return String(s);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
