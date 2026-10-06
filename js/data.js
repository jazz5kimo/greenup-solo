// 模擬資料：依目前業主（tenant）產生（所有資料皆為虛構，僅供示範）
import { TENANT } from './tenant.js';
import { promoFor, seedPromos } from './promo.js';
// 以固定種子的 PRNG 產生約 90 天訂單，讓圖表每次載入都一致。

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const AMEI_PRODUCTS = [
  { id: 'lemon', name: '檸檬塔', unit: '4 入', price: 420, cost: 150, stock: 42, safety: 15, sweet: 3, pop: 1.25,
    allergens: ['egg', 'milk', 'gluten'], storage: 'fridge', days: 3, gift: false, color: '#F4D35E', accent: '#2DB674', tags: ['fruit', 'bestseller'] },
  { id: 'roll', name: '草莓生乳捲', unit: '1 條', price: 580, cost: 230, stock: 12, safety: 10, sweet: 3, pop: 1.15,
    allergens: ['egg', 'milk', 'gluten'], storage: 'fridge', days: 2, gift: false, color: '#F7B2C4', accent: '#EC6A55', tags: ['fruit', 'bestseller'] },
  { id: 'basque', name: '芋泥巴斯克', unit: '6 吋', price: 680, cost: 260, stock: 7, safety: 10, sweet: 4, pop: 1.0,
    allergens: ['egg', 'milk'], storage: 'fridge', days: 4, gift: true, color: '#B79AD9', accent: '#7C62E6', tags: ['signature'] },
  { id: 'pound', name: '烏龍茶磅蛋糕', unit: '1 條', price: 360, cost: 120, stock: 35, safety: 12, sweet: 2, pop: 0.85,
    allergens: ['egg', 'milk', 'gluten'], storage: 'room', days: 7, gift: true, color: '#C9935A', accent: '#F0A531', tags: ['lesssweet', 'tea'] },
  { id: 'cookie', name: '手工餅乾禮盒', unit: '24 片', price: 520, cost: 180, stock: 58, safety: 20, sweet: 2, pop: 1.05,
    allergens: ['egg', 'milk', 'gluten', 'nuts'], storage: 'room', days: 30, gift: true, color: '#E2B56F', accent: '#F0A531', tags: ['gift', 'elder', 'lesssweet'] },
  { id: 'pineapple', name: '鳳梨酥禮盒', unit: '10 入', price: 480, cost: 170, stock: 64, safety: 20, sweet: 3, pop: 0.95,
    allergens: ['egg', 'milk', 'gluten'], storage: 'room', days: 14, gift: true, color: '#F2C14E', accent: '#2E97D4', tags: ['gift', 'elder', 'souvenir'] },
  { id: 'canele', name: '伯爵可麗露', unit: '6 入', price: 390, cost: 140, stock: 24, safety: 12, sweet: 3, pop: 0.7,
    allergens: ['egg', 'milk', 'gluten'], storage: 'room', days: 3, gift: false, color: '#8B5A3C', accent: '#DD5597', tags: ['tea'] },
];
// 其他業主的商品補齊後台需要的欄位
function normalize(list) {
  return list.map((p, i) => ({
    ...p, safety: p.safety ?? Math.max(3, Math.round(p.stock * 0.35)), sweet: p.sweet ?? 0, pop: p.pop ?? (1.25 - i * 0.09),
    allergens: p.allergens || [], storage: p.storage || 'room', days: p.days ?? 365, gift: !!p.gift,
    color: p.art?.color || '#cfc6b8', accent: p.art?.accent || '#6b5a4a', tags: p.tags || [],
  }));
}
export const PRODUCTS = TENANT.products ? normalize(TENANT.products) : AMEI_PRODUCTS;
// 節日特價：price 自動回傳目前檔期的特價（沒有特價就是原價），原價放在 listPrice（promo.js）
for (const p of PRODUCTS) {
  let list = p.price;
  Object.defineProperty(p, 'listPrice', { get: () => list, set: (v) => { list = v; }, enumerable: true, configurable: true });
  Object.defineProperty(p, 'price', { get: () => { const b = promoFor(p.id, list); return b ? b.price : list; }, set: (v) => { list = v; }, enumerable: true, configurable: true });
}
seedPromos(PRODUCTS);
export const PRODUCT_MAP = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));

export const CHANNELS = [
  { id: 'line', name: 'LINE', color: '#2DB674', w: 0.30 },
  { id: 'web', name: '官網', color: '#5EE0C4', w: 0.17 },
  { id: 'pos', name: '現場 POS', color: '#EC6A55', w: 0.17 },
  { id: 'phone', name: '電話', color: '#F0A531', w: 0.11 },
  { id: 'whatsapp', name: 'WhatsApp', color: '#2E97D4', w: 0.11 },
  { id: 'zalo', name: 'Zalo', color: '#7C62E6', w: 0.07 },
  { id: 'messenger', name: 'Messenger', color: '#DD5597', w: 0.07 },
];
if (TENANT.channels) for (const c of CHANNELS) c.w = TENANT.channels[c.id] ?? c.w;
export const CHANNEL_MAP = Object.fromEntries(CHANNELS.map(c => [c.id, c]));

const NAMES = {
  zh: ['林小姐', '陳先生', '王太太', '張小姐', '李先生', '黃小姐', '吳媽媽', '劉先生', '蔡小姐', '許先生', '鄭小姐', '謝先生'],
  ja: ['佐藤 ゆき', '田中 さくら', '鈴木 健', '高橋 美咲', '伊藤 葵', '山本 陽菜'],
  en: ['Aisyah R.', 'Daniel Tan', 'Mei Ling W.', 'Farah N.', 'Kevin Lim', 'Hannah K.'],
  vi: ['Nguyễn Thị Lan', 'Trần Minh Anh', 'Lê Hoàng', 'Phạm Thu Hà'],
  ms: ['Nur Aisyah', 'Ahmad Faiz', 'Siti Hajar', 'Lim Wei Jie'],
};
const CHANNEL_LANG = {
  line: [['zh', 0.7], ['ja', 0.3]],
  web: [['zh', 0.6], ['ja', 0.25], ['en', 0.15]],
  pos: [['zh', 0.9], ['ja', 0.1]],
  phone: [['zh', 1]],
  whatsapp: [['en', 1]],
  zalo: [['vi', 1]],
  messenger: [['zh', 0.6], ['en', 0.4]],
};
if (TENANT.langs) {
  const mix = Object.entries(TENANT.langs);
  for (const ch of ['line', 'web', 'pos', 'phone', 'messenger']) CHANNEL_LANG[ch] = ch === 'phone' || ch === 'pos' ? mix.filter(([l]) => l === 'zh' || l === 'vi') : mix;
}
export const LANG_LABEL = { zh: '中文', ja: '日本語', en: 'English', vi: 'Tiếng Việt', ms: 'Bahasa Melayu' };
export const PAYMENTS = ['信用卡', 'LINE Pay', '銀行轉帳', 'Apple Pay', '街口支付'];

export const SHIPPING_FEE = 150;
export const FREE_SHIP = 1500;

function pickWeighted(rng, list, key = 'w') {
  const total = list.reduce((s, x) => s + (Array.isArray(x) ? x[1] : x[key]), 0);
  let r = rng() * total;
  for (const x of list) { r -= Array.isArray(x) ? x[1] : x[key]; if (r <= 0) return x; }
  return list[list.length - 1];
}

export function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
export function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

let invoiceSeq = 0;
export function nextInvoice(prefix = 'AB') {
  invoiceSeq += 1;
  return `${prefix}-${String(30418200 + invoiceSeq).padStart(8, '0')}`;
}
export function setInvoiceSeq(n) { invoiceSeq = Math.max(invoiceSeq, n); }

export function priceOrder(items, channel) {
  const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
  const shipping = channel === 'pos' || subtotal >= FREE_SHIP ? 0 : SHIPPING_FEE;
  const total = subtotal + shipping;
  const net = Math.round(total / 1.05);
  const tax = total - net;
  const cost = items.reduce((s, it) => s + (PRODUCT_MAP[it.pid]?.cost || 0) * it.qty, 0) + (shipping ? 110 : 0);
  return { subtotal, shipping, total, net, tax, cost };
}

// 依小時的下單權重（線上 vs 門市）
const HOUR_W_ONLINE = [0.2, 0.1, 0.05, 0.02, 0.02, 0.05, 0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.6, 1.4, 1.0, 0.9, 0.9, 1.0, 1.1, 1.3, 1.7, 1.9, 1.6, 0.8];
const HOUR_W_POS = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.8, 1.2, 1.4, 1.3, 1.5, 1.7, 1.6, 1.3, 1.0, 0.6, 0, 0, 0];

const seedOf = (str) => [...str].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const VOLUME = TENANT.volume || 17;
export function generateHistory(now = new Date()) {
  const rng = mulberry32(TENANT.id === 'amei' ? 20261004 : seedOf('orders:' + TENANT.id));
  const orders = [];
  const today = startOfDay(now);
  invoiceSeq = 0;
  let seq = 0;
  for (let d = 89; d >= 0; d--) {
    const day = addDays(today, -d);
    const dow = day.getDay();
    const weekend = dow === 0 || dow === 6 ? 1.45 : dow === 5 ? 1.2 : 1;
    const growth = 0.78 + (89 - d) / 89 * 0.35;
    const noise = 0.8 + rng() * 0.4;
    const n = Math.max(VOLUME < 8 ? 1 : 6, Math.round(VOLUME * weekend * growth * noise));
    const dayOrders = [];
    for (let i = 0; i < n; i++) {
      const ch = pickWeighted(rng, CHANNELS);
      const hw = ch.id === 'pos' ? HOUR_W_POS : HOUR_W_ONLINE;
      const hour = pickWeighted(rng, hw.map((w, h) => [h, w]).filter(x => x[1] > 0))[0];
      const ts = new Date(day); ts.setHours(hour, Math.floor(rng() * 60), Math.floor(rng() * 60));
      const lang = pickWeighted(rng, CHANNEL_LANG[ch.id])[0];
      const names = NAMES[lang] || NAMES.zh;
      const customer = ch.id === 'pos' ? '門市顧客' : names[Math.floor(rng() * names.length)];
      const lines = 1 + (rng() < 0.38 ? 1 : 0) + (rng() < 0.12 ? 1 : 0);
      const items = [];
      for (let l = 0; l < lines; l++) {
        const p = pickWeighted(rng, PRODUCTS, 'pop');
        if (items.find(x => x.pid === p.id)) continue;
        const qty = 1 + (rng() < 0.3 ? 1 : 0) + (rng() < 0.08 ? 2 : 0);
        items.push({ pid: p.id, qty, price: p.listPrice });
      }
      const money = priceOrder(items, ch.id);
      dayOrders.push({ ts: ts.getTime(), ch, lang, customer, items, money, rnd: rng() });
    }
    dayOrders.sort((a, b) => a.ts - b.ts);
    for (const o of dayOrders) {
      if (o.ts > now.getTime()) continue; // 今天尚未發生的時段不計
      seq++;
      const recent = d <= 3;
      const pending = o.ch.id !== 'pos' && recent && o.rnd < 0.22;
      orders.push({
        id: `SO-${fmtYMD(new Date(o.ts))}-${String(seq).padStart(4, '0')}`,
        ts: o.ts,
        channel: o.ch.id,
        lang: o.lang,
        customer: o.customer,
        items: o.items,
        ...o.money,
        payment: o.ch.id === 'pos' ? (o.rnd < 0.5 ? '現金' : '信用卡') : PAYMENTS[Math.floor(o.rnd * 997) % PAYMENTS.length],
        status: pending ? 'pending' : 'paid',
        invoice: nextInvoice(),
        source: 'history',
      });
    }
  }
  return orders;
}

export function fmtYMD(d) {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

// 進貨／費用（含 5% 進項稅額）
const AMEI_SUPPLIERS = [
  { item: '日本麵粉、砂糖', vendor: '穀豐食品原料行', base: 17640 },
  { item: '發酵奶油、鮮奶油', vendor: '北海乳品貿易', base: 30240 },
  { item: '當季水果（草莓、檸檬）', vendor: '大湖果園合作社', base: 15480 },
  { item: '禮盒包材、提袋', vendor: '綠紙包裝設計', base: 11520 },
  { item: '冷藏宅配運費', vendor: '綠野冷鏈物流', base: 12960 },
  { item: '芋頭、茶葉、堅果', vendor: '山城農產', base: 9360 },
];
const SUPPLIERS = TENANT.suppliers || AMEI_SUPPLIERS;
export function generatePurchases(now = new Date()) {
  const rng = mulberry32(TENANT.id === 'amei' ? 777 : seedOf('buy:' + TENANT.id));
  const list = [];
  const today = startOfDay(now);
  for (let w = 13; w >= 0; w--) {
    for (const s of SUPPLIERS) {
      if (rng() < 0.25) continue;
      const day = addDays(today, -w * 7 - Math.floor(rng() * 6));
      if (day > now) continue;
      const total = Math.round(s.base * (0.55 + rng() * 0.6) / 10) * 10;
      const net = Math.round(total / 1.05);
      list.push({ ts: day.getTime() + 10 * 3600e3, item: s.item, vendor: s.vendor, total, net, tax: total - net, invoice: `${['QK', 'RT', 'MZ', 'VB'][Math.floor(rng() * 4)]}-${String(Math.floor(rng() * 1e8)).padStart(8, '0')}` });
    }
  }
  return list.sort((a, b) => a.ts - b.ts);
}
