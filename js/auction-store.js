// 競標共用狀態（銷售網頁 shop.html 與後台 index.html 共用）
// 簡單版：只有「一般加價競標」一種方式；範本只差在起標價與標籤（1 元起標集客／一般競標）。
// 固定規則：結標前 2 分鐘內有人出價，自動延長 2 分鐘；得標後 48 小時內付款；其他出價者自動收到 9 折安慰券。
// 資料存在 localStorage 'greenup-solo:auctions:<業主>'，以 BroadcastChannel 'greenup-auction:<業主>' 即時同步各分頁。
// 拍品一律取自目前業主的商品（data.js PRODUCTS），得標訂單一律以 store.createOrder 寫入該業主的後台。
// 全部為示範資料：沒有真實金流、沒有真實會員驗證。
import { mulberry32, PRODUCTS, PRODUCT_MAP } from './data.js';
import { store } from './state.js';
import { TENANT_ID } from './tenant.js';

// 依業主（tenant）分開存放；買家身分（示範手機驗證）跨業主共用
const LS_KEY = `greenup-solo:auctions:${TENANT_ID}`;
const LS_ME = 'greenup-solo:auction-me';
const LS_LOCK = `greenup-solo:auction-lock:${TENANT_ID}:`;
const CH = `greenup-auction:${TENANT_ID}`;
const VERSION = 2;
const MIN = 60e3, HOUR = 3600e3, DAY = 86400e3;

export const RULES = { snipeWindow: 2 * MIN, snipeExtend: 2 * MIN, payHours: 48, couponPct: 90, couponOff: 10 };
export const TEMPLATES = {
  one: { kind: 'one', label: '1 元起標集客', start: 1, inc: 10, hours: 24, note: '從 1 元開始喊價，吸引人潮、拉新會員；適合成本低、討論度高的商品。' },
  normal: { kind: 'normal', label: '一般競標', start: null, inc: 20, hours: 48, note: '從接近成本的價格起標，讓喜歡的人公平出價；可另設直購價，直接買走。' },
};

// ---------- 小工具 ----------
function lsGet(k, fb) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } }
const TAB = Math.random().toString(36).slice(2, 10);

/** 匿名化：中日文取第一個字＋＊＊；拼音文字取前 3 個字母＋＊＊ */
export function maskName(name) {
  const s = String(name || '').trim();
  if (!s) return '訪客＊＊';
  if (/^[぀-ヿ㐀-鿿]/.test(s)) return s[0] + '＊＊';
  const w = s.replace(/\s+/g, '');
  return w.slice(0, Math.min(3, w.length)) + '＊＊';
}

// 模擬買家（虛構）
export const BIDDERS = [
  { uid: 'b01', name: '林怡君', lang: 'zh' }, { uid: 'b02', name: '陳志明', lang: 'zh' }, { uid: 'b03', name: '王小美', lang: 'zh' },
  { uid: 'b04', name: '張雅婷', lang: 'zh' }, { uid: 'b05', name: '黃建宏', lang: 'zh' }, { uid: 'b06', name: '吳佩珊', lang: 'zh' },
  { uid: 'b07', name: '劉家豪', lang: 'zh' }, { uid: 'b08', name: '蔡宜蓁', lang: 'zh' }, { uid: 'b09', name: 'Kevin Lim', lang: 'en' },
  { uid: 'b10', name: 'Aisyah Rahman', lang: 'ms' }, { uid: 'b11', name: '佐藤ゆき', lang: 'ja' }, { uid: 'b12', name: 'Nguyễn Thị Lan', lang: 'vi' },
  { uid: 'b13', name: 'Farah Nadia', lang: 'ms' }, { uid: 'b14', name: '鄭文傑', lang: 'zh' }, { uid: 'b15', name: '許雅雯', lang: 'zh' },
  { uid: 'b16', name: 'Daniel Tan', lang: 'en' }, { uid: 'b17', name: '田中さくら', lang: 'ja' }, { uid: 'b18', name: 'Trần Minh Anh', lang: 'vi' },
];
const BIDDER_MAP = Object.fromEntries(BIDDERS.map(b => [b.uid, b]));

// ---------- 商品 ----------
export function productOf(pid) {
  const p = PRODUCT_MAP[pid];
  if (!p) return null;
  return { id: p.id, name: p.name, en: p.en || p.name, unit: p.unit, price: p.price, cost: p.cost || 0, color: p.color || p.art?.color || '#2DB674', accent: p.accent || p.art?.accent || '#1f8f5a' };
}
export function productsOf() { return PRODUCTS.map(p => productOf(p.id)); }

// ---------- 種子資料 ----------
const roundTo = (n, s) => Math.max(s, Math.round(n / s) * s);
function seedBids(rng, a, n, untilTs, fromTs) {
  const bids = [];
  let price = a.start, last = null;
  const span = Math.max(MIN, untilTs - fromTs);
  const times = Array.from({ length: n }, () => fromTs + rng() * span).sort((x, y) => x - y);
  for (let i = 0; i < n; i++) {
    let b;
    do { b = BIDDERS[Math.floor(rng() * BIDDERS.length)]; } while (b.uid === last);
    const amt = i === 0 ? a.start : price + a.inc * (1 + (rng() < 0.3 ? 1 : 0) + (rng() < 0.1 ? 2 : 0));
    if (a.buyNow && amt >= a.buyNow) break;
    price = amt; last = b.uid;
    bids.push({ id: `${a.id}-s${i}`, uid: b.uid, name: b.name, lang: b.lang, amt, ts: Math.round(times[i]) });
  }
  return bids;
}
function couponCode(rng) { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 4; i++) s += c[Math.floor(rng() * c.length)]; return 'AU9-' + s; }

function makeAuction(idx, p, kind, { startAt, endAt, start, inc, buyNow = null }) {
  const id = `AU-${String(101 + idx)}`;
  return {
    id, pid: p.id, kind, start, inc, buyNow, startAt, endAt, createdAt: startAt - DAY,
    bids: [], views: 0, shares: 0, newMembers: 0, extended: 0,
    closed: false, closedAt: null, endedBy: null, winner: null, final: null, payBy: null, paidAt: null,
    orderId: null, orderTotal: null, coupons: [], seeded: true,
  };
}

function seedAll(now) {
  const rng = mulberry32(20261006 + TENANT_ID.split('').reduce((s, c) => s + c.charCodeAt(0), 0) * 7);
  const list = [];
  const byPrice = productsOf().sort((x, y) => x.price - y.price);
  if (!byPrice.length) return list;
  const n = byPrice.length;
  const P = (i) => byPrice[Math.max(0, Math.min(n - 1, i))];
  // 便宜、討論度高的商品做 1 元起標集客；較貴的商品做一般競標（可直購）
  const plan = [
    { p: P(Math.floor(n / 2)), kind: 'one', startAt: now - 22 * HOUR, endAt: now + 7 * MIN + 30e3, n: 16 },
    { p: P(1), kind: 'one', startAt: now - 5 * HOUR, endAt: now + 42 * MIN, n: 9 },
    { p: P(n - 1), kind: 'normal', startAt: now - 20 * HOUR, endAt: now + 2 * HOUR + 40 * MIN, n: 5, buyNowMul: 1.2 },
    { p: P(n - 2), kind: 'normal', startAt: now + 3 * HOUR, endAt: now + 27 * HOUR, n: 0, buyNowMul: 1.3 },
    { p: P(0), kind: 'one', startAt: now - 3 * DAY, endAt: now - 26 * HOUR, n: 21, done: 'paid' },
    { p: P(n - 3), kind: 'normal', startAt: now - 5 * DAY, endAt: now - 3 * DAY, n: 7, done: 'paid' },
    { p: P(2), kind: 'one', startAt: now - 30 * HOUR, endAt: now - 5 * HOUR, n: 13, done: 'pending' },
  ];
  let i = 0;
  for (const it of plan) {
    if (!it.p) continue;
    const p = it.p;
    const inc = it.kind === 'one' ? (p.price >= 800 ? 20 : 10) : roundTo(p.price * 0.04, 10);
    const start = it.kind === 'one' ? 1 : roundTo(p.price * 0.6, 10);
    const buyNow = it.buyNowMul ? roundTo(p.price * it.buyNowMul, 10) : null;
    const a = makeAuction(i++, p, it.kind, { startAt: it.startAt, endAt: it.endAt, start, inc, buyNow });
    const until = Math.min(now - 40e3, it.endAt - 3 * MIN);
    if (it.n) a.bids = seedBids(rng, a, it.n, until, it.startAt + 10 * MIN);
    const bidders = new Set(a.bids.map(b => b.uid)).size;
    const live = it.startAt <= now;
    const mult = it.kind === 'one' ? 1 : 0.35;
    a.views = live ? Math.round((it.kind === 'one' ? 600 : 180) + rng() * 900 * mult + bidders * 40) : Math.round(40 + rng() * 60);
    a.shares = live ? Math.round(a.views * (0.03 + rng() * 0.04)) : Math.round(rng() * 6);
    a.newMembers = live ? Math.round(bidders * (it.kind === 'one' ? 0.55 : 0.2) + rng() * 4) : Math.round(rng() * 3);
    if (it.done && a.bids.length) {
      const top = a.bids[a.bids.length - 1];
      a.closed = true; a.closedAt = it.endAt; a.endedBy = 'time';
      a.winner = { uid: top.uid, name: top.name, lang: top.lang }; a.final = top.amt;
      a.payBy = it.endAt + RULES.payHours * HOUR;
      a.paidAt = it.done === 'paid' ? it.endAt + (3 + rng() * 20) * HOUR : null;
      a.orderId = `示範-${a.id}`; a.orderTotal = top.amt;
      const losers = [...new Map(a.bids.filter(b => b.uid !== top.uid).map(b => [b.uid, b])).values()];
      a.coupons = losers.map(b => {
        const used = rng() < (it.kind === 'one' ? 0.42 : 0.3) && it.done === 'paid';
        return { uid: b.uid, name: b.name, lang: b.lang, code: couponCode(rng), used, orderTotal: used ? roundTo(p.price * (1 + rng() * 1.6) * 0.9, 10) : 0 };
      });
    }
    list.push(a);
  }
  return list;
}

// ---------- 狀態 ----------
function statusOf(a, now = Date.now()) {
  if (a.closed) return a.winner ? (a.paidAt ? 'sold' : 'ended') : 'nobid';
  if (now < a.startAt) return 'upcoming';
  if (now < a.endAt) return 'live';
  return 'closing';
}
export const STATUS_LABEL = { upcoming: '預告', live: '進行中', closing: '結標中', ended: '已結標・待付款', nobid: '已結標・無人出價', sold: '已成交' };

class AuctionStore {
  constructor() {
    this.bus = new EventTarget();
    this.data = null;
    this._load(true);
    try { this.ch = new BroadcastChannel(CH); this.ch.onmessage = (e) => this._onRemote(e.data); } catch { this.ch = null; }
    window.addEventListener('storage', (e) => {
      if (e.key === LS_KEY && !this.ch) { this._load(false); this.emit('change', { remote: true }); }
      if (e.key === LS_ME) this.emit('me', this.me());
    });
    this._timer = setInterval(() => this.tick(), 1000);
    setTimeout(() => this.tick(), 50);
  }

  _load(init) {
    const now = Date.now();
    let d = lsGet(LS_KEY, null);
    const stale = d && d.seededAt && now - d.seededAt > 6 * HOUR;
    if (!d || d.v !== VERSION || !Array.isArray(d.list) || stale) {
      const keep = d && d.v === VERSION && Array.isArray(d.list) ? d.list.filter(a => !a.seeded) : [];
      d = { v: VERSION, seededAt: now, rev: (d?.rev || 0) + 1, seq: d?.seq || 0, list: [...seedAll(now), ...keep] };
      // 長時間沒人開啟時已過期的拍品：視為歷史資料，靜默結標（不補建訂單）
      this.data = d; this._silentClose(now); lsSet(LS_KEY, d);
    } else {
      this.data = d;
      if (init) { if (this._silentClose(now)) this._save(); }
    }
  }
  _silentClose(now) {
    let changed = false;
    for (const a of this.data.list) {
      if (!a.closed && now - a.endAt > 10 * MIN) {
        const top = a.bids[a.bids.length - 1];
        a.closed = true; a.closedAt = a.endAt; a.endedBy = 'time'; a.historic = true;
        if (top) { a.winner = { uid: top.uid, name: top.name, lang: top.lang }; a.final = top.amt; a.payBy = a.endAt + RULES.payHours * HOUR; a.orderId = `示範-${a.id}`; a.orderTotal = top.amt; }
        changed = true;
      }
    }
    return changed;
  }
  _fresh() { const d = lsGet(LS_KEY, null); if (d && d.v === VERSION && Array.isArray(d.list) && (d.rev || 0) >= (this.data.rev || 0)) this.data = d; }
  _save(events = []) {
    this.data.rev = (this.data.rev || 0) + 1;
    lsSet(LS_KEY, this.data);
    // 附上完整資料：跨分頁的 localStorage 寫入是非同步傳播，訊息可能比儲存先到
    try { this.ch && this.ch.postMessage({ rev: this.data.rev, data: this.data, events }); } catch { /* ignore */ }
  }
  _onRemote(msg) {
    const d = msg && msg.data;
    if (d && d.v === VERSION && Array.isArray(d.list) && (d.rev || 0) >= (this.data.rev || 0)) this.data = d;
    else this._fresh();
    for (const ev of (msg?.events || [])) this.emit(ev.type, { ...ev, a: this.get(ev.id), remote: true });
    this.emit('change', { remote: true });
  }
  on(type, fn) { const h = (e) => fn(e.detail); this.bus.addEventListener(type, h); return () => this.bus.removeEventListener(type, h); }
  emit(type, detail) { this.bus.dispatchEvent(new CustomEvent(type, { detail })); }
  _commit(events) {
    this._save(events);
    for (const ev of events) this.emit(ev.type, { ...ev, a: this.get(ev.id), remote: false });
    this.emit('change', { remote: false });
  }

  // ---- 查詢 ----
  list() { return this.data.list; }
  get(id) { return this.data.list.find(a => a.id === id) || null; }
  status(a, now) { return statusOf(a, now); }
  top(a) { return a.bids[a.bids.length - 1] || null; }
  price(a) { const t = this.top(a); return t ? t.amt : a.start; }
  minNext(a) { const t = this.top(a); return t ? t.amt + a.inc : a.start; }
  bidderCount(a) { return new Set(a.bids.map(b => b.uid)).size; }
  product(a) { return productOf(a.pid); }
  watching(a) {
    if (statusOf(a) !== 'live') return 0;
    const h = a.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
    const base = a.kind === 'one' ? 18 : 6;
    return base + ((h + Math.floor(Date.now() / 20000)) % 9) + Math.min(20, a.bids.length);
  }

  // ---- 我（這個瀏覽器的示範買家） ----
  me() { return lsGet(LS_ME, null); }
  setMe(m) { lsSet(LS_ME, m); this.emit('me', m); return m; }
  verify({ phone, name, lang, auctionId }) {
    if (!/^09\d{8}$/.test(phone)) return { ok: false, err: 'phone' };
    const first = !this.me();
    const me = this.setMe({ uid: 'me-' + phone.slice(-4) + TAB.slice(0, 3), phone: phone.slice(0, 4) + '***' + phone.slice(-3), name: (name || '').trim() || (lang === 'zh' ? '官網會員' : 'Guest'), lang: lang || 'zh', verified: true, at: Date.now() });
    if (first && auctionId) { this._fresh(); const a = this.get(auctionId); if (a) { a.newMembers += 1; this._commit([{ type: 'member', id: a.id }]); } }
    return { ok: true, me };
  }

  // ---- 動作 ----
  addView(id) { this._fresh(); const a = this.get(id); if (!a) return; a.views += 1; this._commit([{ type: 'view', id }]); }
  addShare(id) { this._fresh(); const a = this.get(id); if (!a) return; a.shares += 1; this._commit([{ type: 'share', id }]); }

  /** 出價：user = {uid, name, lang}；回傳 {ok, err, extended, buyNow} */
  placeBid(id, user, amt, { sim = false } = {}) {
    this._fresh();
    const a = this.get(id);
    if (!a) return { ok: false, err: 'missing' };
    const now = Date.now();
    if (statusOf(a, now) !== 'live') return { ok: false, err: 'closed' };
    amt = Math.round(+amt);
    if (!Number.isFinite(amt) || amt < this.minNext(a)) return { ok: false, err: 'low', min: this.minNext(a) };
    const prev = this.top(a);
    if (prev && prev.uid === user.uid) return { ok: false, err: 'self' };
    if (a.buyNow && amt >= a.buyNow) return this.buyNow(id, user);
    this.data.seq = (this.data.seq || 0) + 1;
    const bid = { id: `${a.id}-${this.data.seq}-${TAB}`, uid: user.uid, name: user.name, lang: user.lang || 'zh', amt, ts: now, sim: !!sim };
    a.bids.push(bid);
    let extended = false;
    if (a.endAt - now <= RULES.snipeWindow) { a.endAt += RULES.snipeExtend; a.extended += 1; extended = true; }
    this._commit([{ type: 'bid', id, bid, prevUid: prev ? prev.uid : null, extended }]);
    return { ok: true, bid, extended };
  }
  buyNow(id, user) {
    this._fresh();
    const a = this.get(id);
    if (!a || statusOf(a) !== 'live' || !a.buyNow) return { ok: false, err: 'closed' };
    const prev = this.top(a);
    this.data.seq = (this.data.seq || 0) + 1;
    const bid = { id: `${a.id}-${this.data.seq}-${TAB}`, uid: user.uid, name: user.name, lang: user.lang || 'zh', amt: a.buyNow, ts: Date.now(), buyNow: true };
    a.bids.push(bid);
    this._settle(a, 'buynow', [{ type: 'bid', id, bid, prevUid: prev ? prev.uid : null, extended: false }]);
    return { ok: true, bid, buyNow: true };
  }
  /** 模擬其他買家出價（示範用） */
  simulateBid(id) {
    this._fresh();
    const a = this.get(id);
    if (!a || statusOf(a) !== 'live') return { ok: false, err: 'closed' };
    const top = this.top(a);
    const pool = BIDDERS.filter(b => !top || b.uid !== top.uid);
    const b = pool[Math.floor(Math.random() * pool.length)];
    let amt = this.minNext(a) + (Math.random() < 0.35 ? a.inc : 0);
    if (a.buyNow && amt >= a.buyNow) amt = this.minNext(a);
    if (a.buyNow && amt >= a.buyNow) return { ok: false, err: 'cap' };
    return this.placeBid(id, b, amt, { sim: true });
  }
  startNow(id) {
    this._fresh();
    const a = this.get(id);
    if (!a || statusOf(a) !== 'upcoming') return null;
    const dur = a.endAt - a.startAt;
    a.startAt = Date.now() - 1000; a.endAt = a.startAt + dur;
    this._commit([{ type: 'created', id }]);
    return a;
  }
  closeNow(id) {
    this._fresh();
    const a = this.get(id);
    if (!a || a.closed) return null;
    if (statusOf(a) === 'upcoming') a.startAt = Date.now() - 1000;
    a.endAt = Math.min(a.endAt, Date.now());
    this._settle(a, 'early');
    return a;
  }
  markPaid(id) {
    this._fresh();
    const a = this.get(id);
    if (!a || !a.winner || a.paidAt) return a;
    a.paidAt = Date.now();
    if (a.orderId && store.live.find(o => o.id === a.orderId)) store.markPaid(a.orderId);
    this._commit([{ type: 'paid', id }]);
    return a;
  }
  create({ pid, kind = 'one', start, inc, buyNow = null, startAt, endAt }) {
    this._fresh();
    const p = productOf(pid);
    if (!p) return null;
    this.data.seq = (this.data.seq || 0) + 1;
    let k = 201 + this.data.list.length; while (this.get(`AU-${k}`)) k++;
    const a = {
      id: `AU-${k}`, pid, kind,
      start: Math.max(1, Math.round(start)), inc: Math.max(1, Math.round(inc)), buyNow: buyNow ? Math.round(buyNow) : null,
      startAt: startAt || Date.now(), endAt, createdAt: Date.now(), bids: [], views: 0, shares: 0, newMembers: 0, extended: 0,
      closed: false, closedAt: null, endedBy: null, winner: null, final: null, payBy: null, paidAt: null, orderId: null, orderTotal: null, coupons: [], seeded: false,
    };
    this.data.list.push(a);
    this._commit([{ type: 'created', id: a.id }]);
    return a;
  }

  // ---- 結標 ----
  tick() {
    const now = Date.now();
    for (const a of this.data.list) {
      if (!a.closed && now >= a.endAt && !a._locking) this._tryLockSettle(a.id);
    }
    this.emit('tick', now);
  }
  _tryLockSettle(id) {
    const key = LS_LOCK + id;
    const cur = lsGet(key, null);
    if (cur && cur.tab !== TAB && Date.now() - cur.ts < 6000) return;
    lsSet(key, { tab: TAB, ts: Date.now() });
    const a = this.get(id); if (a) a._locking = true;
    setTimeout(() => {
      const c = lsGet(key, null);
      this._fresh();
      const b = this.get(id);
      if (b) delete b._locking;
      if (!c || c.tab !== TAB) return;
      if (b && !b.closed && Date.now() >= b.endAt) this._settle(b, 'time');
    }, 150 + Math.random() * 100);
  }
  _settle(a, endedBy, pre = []) {
    const now = Date.now();
    a.closed = true; a.closedAt = now; a.endedBy = endedBy;
    const top = this.top(a);
    const events = [...pre];
    if (top) {
      a.winner = { uid: top.uid, name: top.name, lang: top.lang };
      a.final = top.amt;
      a.payBy = now + RULES.payHours * HOUR;
      const p = this.product(a);
      const customer = `${top.name}（競標得標）`;
      try {
        const disc = p && p.price > a.final ? p.price - a.final : 0;
        const order = store.createOrder({
          channel: 'web', customer, lang: top.lang || 'zh', items: [{ pid: a.pid, qty: 1 }], payment: '信用卡', status: 'pending',
          ...(disc ? { discount: disc } : {}), note: `競標 ${a.id} 成交價 NT$ ${a.final.toLocaleString()}（示範）`,
        });
        a.orderId = order.id; a.orderTotal = order.total;
      } catch { a.orderId = null; }
      const rng = mulberry32(now % 100000);
      const losers = [...new Map(a.bids.filter(b => b.uid !== top.uid).map(b => [b.uid, b])).values()];
      a.coupons = losers.map(b => ({ uid: b.uid, name: b.name, lang: b.lang, code: couponCode(rng), used: false, orderTotal: 0 }));
    }
    events.push({ type: 'closed', id: a.id });
    this._commit(events);
  }

  // ---- 統計 ----
  stats() {
    const list = this.list();
    const uniq = new Set();
    let bids = 0, views = 0, members = 0, shares = 0, cIssued = 0, cUsed = 0, cRev = 0, live = 0, todayBids = 0;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (const a of list) {
      bids += a.bids.length; views += a.views; members += a.newMembers; shares += a.shares;
      a.bids.forEach(b => { uniq.add(b.uid); if (b.ts >= +today) todayBids++; });
      cIssued += a.coupons.length; a.coupons.forEach(c => { if (c.used) { cUsed++; cRev += c.orderTotal; } });
      if (statusOf(a) === 'live') live++;
    }
    return { count: list.length, live, bids, todayBids, bidders: uniq.size, views, members, shares, cIssued, cUsed, cRev };
  }
}

export const auctions = new AuctionStore();
window.__auctions = auctions; // 方便現場除錯與自動測試
