// 銷售網頁購物車（localStorage 保存，跨重新整理）
import { PRODUCT_MAP, SHIPPING_FEE, FREE_SHIP } from '../data.js';
import { store } from '../state.js';
import { TENANT } from '../tenant.js';

// 只有宅配賣商品的店（ship）以庫存限制購買；預約服務的 stock 是名額、外帶是每日份數，另有各自的規則
const LIMIT = ((TENANT.ship && TENANT.ship.mode) || 'ship') === 'ship';

// 目前可賣的數量（庫存＝期初＋補貨入庫－已售出）
export const stockLeft = (pid) => { if (!LIMIT) return Infinity; const r = store.inventory().find(p => p.id === pid); return r ? r.current : (PRODUCT_MAP[pid]?.stock ?? 0); };

const KEY = 'greenup-solo:cart:v1';
const listeners = new Set();
let items = load();

function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* ignore */ } listeners.forEach(fn => fn()); }

export const cart = {
  onChange(fn) { listeners.add(fn); },
  // 加入購物車：不超過庫存；回傳實際加入的數量（0＝已售完或購物車已達上限）
  add(pid, qty = 1) { const have = items[pid] || 0, n = Math.max(0, Math.min(qty, stockLeft(pid) - have)); if (n > 0) { items[pid] = have + n; save(); } return n; },
  set(pid, qty) { qty = Math.min(qty, stockLeft(pid)); if (qty <= 0) delete items[pid]; else items[pid] = qty; save(); },
  clear() { items = {}; save(); },
  list() { return Object.entries(items).filter(([, q]) => q > 0).map(([pid, qty]) => ({ pid, qty, price: PRODUCT_MAP[pid].price })); },
  count() { return Object.values(items).reduce((s, q) => s + q, 0); },
  totals(region = '') {
    const subtotal = this.list().reduce((s, i) => s + i.price * i.qty, 0);
    const intl = /日本|Japan|Jepun|Nhật|国際/.test(region);
    const shipping = !subtotal ? 0 : intl ? 450 : subtotal >= FREE_SHIP ? 0 : SHIPPING_FEE;
    return { subtotal, shipping, total: subtotal + shipping };
  },
};
