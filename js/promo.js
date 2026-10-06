// 節日特價：老闆事先排好日期與折扣，時間到自動生效、結束自動恢復原價
// 每個業主各自一份（localStorage key 由 tenant.js 自動加業主前綴），跨分頁即時同步
// data.js 的商品 price 會自動回傳「目前特價」，原價在 listPrice；銷售網頁、購物車、POS、訂單、發票、帳務都一致
import { TENANT_ID } from './tenant.js';

const LS = 'greenup-solo:promos';
const CH = 'greenup-promo';

// 台灣常見檔期（示範日期，2026–2027）；老闆可自行新增或修改
export const FESTIVALS = [
  { id: 'midautumn', name: '中秋節', badge: '中秋特價', from: '2026-09-18', to: '2026-10-09' },
  { id: 'double11', name: '雙 11', badge: '雙11 限定', from: '2026-11-01', to: '2026-11-11' },
  { id: 'xmas', name: '聖誕節', badge: '聖誕特價', from: '2026-12-15', to: '2026-12-25' },
  { id: 'newyear', name: '跨年', badge: '跨年特價', from: '2026-12-28', to: '2027-01-02' },
  { id: 'cny', name: '春節', badge: '新春特價', from: '2027-01-22', to: '2027-02-10' },
  { id: 'valentine', name: '情人節', badge: '情人節特價', from: '2027-02-07', to: '2027-02-14' },
  { id: 'mother', name: '母親節', badge: '母親節特價', from: '2027-04-28', to: '2027-05-09' },
  { id: 'dragon', name: '端午節', badge: '端午特價', from: '2027-06-01', to: '2027-06-09' },
  { id: 'father', name: '父親節', badge: '父親節特價', from: '2027-07-30', to: '2027-08-08' },
  { id: 'anniv', name: '週年慶', badge: '週年慶', from: '2027-03-01', to: '2027-03-15' },
];
export const FESTIVAL_MAP = Object.fromEntries(FESTIVALS.map(f => [f.id, f]));

// 特價格式：{ id, festival, name, badge, from, to（含當日）, on, scope:'all'|'items', pct（全店幾折，例如 0.9）, items:{ pid: 特價 } }
const dayStart = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
const dayEnd = (s) => dayStart(s) + 86400000 - 1;
export const roundPrice = (n) => (n >= 100 ? Math.round(n / 10) * 10 : Math.round(n));

let cache = null;
function load() {
  if (cache) return cache;
  try { const raw = localStorage.getItem(LS); cache = raw ? JSON.parse(raw) : null; } catch { cache = null; }
  return cache;
}

let bc = null;
try { bc = new BroadcastChannel(CH); } catch { bc = null; }
const listeners = new Set();
const emit = () => listeners.forEach(fn => { try { fn(); } catch { /* ignore */ } });
if (bc) bc.onmessage = () => { cache = null; emit(); };
window.addEventListener('storage', (e) => { if (e.key === LS) { cache = null; emit(); } });
export const onPromos = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

// 第一次使用時依業主商品建立示範檔期（全部為示範）
export function seedPromos(products) {
  if (load()) return cache;
  const byPop = [...products].sort((a, b) => (b.pop || 0) - (a.pop || 0));
  const pick = (n, off = 0) => byPop.slice(off, off + n);
  const off = (list, pct) => Object.fromEntries(list.map(p => [p.id, roundPrice(Math.max(p.cost + 1, p.listPrice * pct))]));
  cache = [
    { id: 'p-midautumn', festival: 'midautumn', on: true, scope: 'items', items: off(pick(2), 0.88) },
    { id: 'p-double11', festival: 'double11', on: true, scope: 'all', pct: 0.89 },
    { id: 'p-xmas', festival: 'xmas', on: true, scope: 'items', items: off(pick(3, 1), 0.9) },
    { id: 'p-cny', festival: 'cny', on: false, scope: 'items', items: off(pick(2, 2), 0.92) },
  ].map(p => ({ ...p, name: FESTIVAL_MAP[p.festival].name, badge: FESTIVAL_MAP[p.festival].badge, from: FESTIVAL_MAP[p.festival].from, to: FESTIVAL_MAP[p.festival].to }));
  return cache;
}

export function getPromos() { return (load() || []).map(p => ({ ...p })); }
export function savePromos(list) {
  cache = list.map(p => ({ ...p }));
  try { localStorage.setItem(LS, JSON.stringify(cache)); } catch { /* ignore */ }
  try { bc && bc.postMessage({ t: Date.now(), tenant: TENANT_ID }); } catch { /* ignore */ }
  emit();
}
export function upsertPromo(p) { const l = getPromos(); const i = l.findIndex(x => x.id === p.id); if (i >= 0) l[i] = p; else l.push(p); savePromos(l); return p; }
export function removePromo(id) { savePromos(getPromos().filter(x => x.id !== id)); }

export function promoStatus(p, at = Date.now()) {
  if (!p.on) return 'off';
  if (at < dayStart(p.from)) return 'scheduled';
  if (at > dayEnd(p.to)) return 'ended';
  return 'live';
}
export const activePromos = (at = Date.now()) => (load() || []).filter(p => promoStatus(p, at) === 'live');

// 單一商品在某時間點的特價（多個檔期重疊時取最低價；不低於 1 元）
export function promoFor(pid, base, at = Date.now()) {
  let best = null;
  for (const p of activePromos(at)) {
    let v = null;
    if (p.scope === 'all' && p.pct) v = roundPrice(base * p.pct);
    else if (p.items && p.items[pid] != null) v = +p.items[pid];
    if (v != null && v < base && (!best || v < best.price)) best = { price: Math.max(1, v), promo: p };
  }
  return best;
}
// 給畫面用：{ price, list, badge, to, pct }；沒有特價回傳 null
export function promoInfo(product, at = Date.now()) {
  if (!product) return null;
  const base = product.listPrice ?? product.price;
  const b = promoFor(product.id, base, at);
  return b ? { price: b.price, list: base, badge: b.promo.badge, name: b.promo.name, to: b.promo.to, endsAt: dayEnd(b.promo.to), pct: Math.round(b.price / base * 100) } : null;
}
