// 銷售網頁設定（商家、風格、產品）：後台「網站設計工作室」寫入，銷售網頁與競標模組讀取
// 存在 localStorage，並用 BroadcastChannel 即時同步到已開啟的銷售網頁分頁
export const LS_SHOP_CFG = 'greenup-solo:shop-config';
const CH = 'greenup-shop-config';
const DEFAULT = { merchant: 'amei', theme: 'auto', products: null, featured: null, updated: 0 };

export function getShopConfig() {
  try { return Object.assign({}, DEFAULT, JSON.parse(localStorage.getItem(LS_SHOP_CFG) || '{}')); } catch { return { ...DEFAULT }; }
}

let bc = null;
try { bc = new BroadcastChannel(CH); } catch { bc = null; }

export function setShopConfig(patch) {
  const cfg = Object.assign(getShopConfig(), patch, { updated: Date.now() });
  try { localStorage.setItem(LS_SHOP_CFG, JSON.stringify(cfg)); } catch { /* ignore */ }
  try { bc && bc.postMessage(cfg); } catch { /* ignore */ }
  listeners.forEach(fn => fn(cfg));
  return cfg;
}

const listeners = new Set();
export function onShopConfig(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
if (bc) bc.onmessage = (e) => listeners.forEach(fn => fn(Object.assign({}, DEFAULT, e.data)));
window.addEventListener('storage', (e) => { if (e.key === LS_SHOP_CFG) listeners.forEach(fn => fn(getShopConfig())); });

// 非阿美的示範商家：訂單存在自己的示範清單，不寫入阿美手作甜點的後台資料
export const LS_DEMO_ORDERS = (merchant) => `greenup-solo:demo-orders:${merchant}`;
export function addDemoOrder(merchant, order) {
  try {
    const k = LS_DEMO_ORDERS(merchant); const list = JSON.parse(localStorage.getItem(k) || '[]');
    list.push(order); localStorage.setItem(k, JSON.stringify(list.slice(-50)));
  } catch { /* ignore */ }
  return order;
}
export function getDemoOrders(merchant) {
  try { return JSON.parse(localStorage.getItem(LS_DEMO_ORDERS(merchant)) || '[]'); } catch { return []; }
}
