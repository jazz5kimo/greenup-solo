// 銷售網頁購物車（localStorage 保存，跨重新整理）
import { PRODUCT_MAP, SHIPPING_FEE, FREE_SHIP } from '../data.js';

const KEY = 'greenup-solo:cart:v1';
const listeners = new Set();
let items = load();

function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* ignore */ } listeners.forEach(fn => fn()); }

export const cart = {
  onChange(fn) { listeners.add(fn); },
  add(pid, qty = 1) { items[pid] = (items[pid] || 0) + qty; save(); },
  set(pid, qty) { if (qty <= 0) delete items[pid]; else items[pid] = qty; save(); },
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
