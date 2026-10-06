// 多業主（tenant）核心：同一套後台程式，依目前業主載入各自的商品、訂單、人員、供應商與費用
// 目前業主：網址 ?tenant= > localStorage > 'amei'；切換業主會重新載入頁面
import { MERCHANTS } from './merchants.js';
import { BIZ, CATS } from './biz/index.js';

// 全部示範業主：原本 6 家＋50 種業態登錄表（biz/）
const ALL = [...MERCHANTS, ...BIZ.map(b => b.merchant).filter(m => !MERCHANTS.some(x => x.id === m.id))];
const MERCHANT_MAP = Object.fromEntries(ALL.map(m => [m.id, m]));
export { CATS };

const LS_TENANT = 'greenup-solo:tenant';

function resolve() {
  try {
    const q = new URLSearchParams(location.search).get('tenant');
    if (q && MERCHANT_MAP[q]) { localStorage.setItem(LS_TENANT, q); return q; }
    const s = localStorage.getItem(LS_TENANT);
    if (s && MERCHANT_MAP[s]) return s;
  } catch { /* ignore */ }
  return 'amei';
}

// 各業主的後台資料設定（全部為虛構示範）
// staff：與 ledger PAYROLL 相同格式；suppliers：進貨對象；fixed：每月固定費用；volume：每日平均訂單數；
// channels：通路權重；langs：客人語言比例；avatar：頂欄頭像字
const PROFILES = {
  amei: {
    cat: 'dessert', avatar: '美', volume: 17, aiName: '小美', region: '台北市中山區',
    staff: [
      { name: '阿美', title: '負責人（董事酬勞）', kind: 'owner', pay: 60000 },
      { name: '小芸', title: '烘焙助理・全職', kind: 'full', pay: 33000, level: 33300 },
      { name: '小傑', title: '包裝出貨・兼職', kind: 'part', pay: 17600, level: 17880, hours: 88, hourly: 200 },
    ],
    // 阿美沿用 data.js 與 ledger.js 原本的供應商、固定費用與研發資料
    suppliers: null, fixed: null, rd: null, channels: null, langs: null,
  },
  coffee: {
    cat: 'drink', avatar: '嵐', volume: 13, aiName: '小嵐', region: '台中市西區',
    staff: [
      { name: '阿嵐', title: '負責人・烘豆師（董事酬勞）', kind: 'owner', pay: 55000 },
      { name: '小安', title: '包裝出貨・兼職', kind: 'part', pay: 14400, level: 14700, hours: 72, hourly: 200 },
    ],
    suppliers: [
      { item: '衣索比亞、哥倫比亞生豆', vendor: '綠豆咖啡生豆貿易（虛構）', base: 26000 },
      { item: '單向閥咖啡袋、掛耳濾袋', vendor: '好包裝材料行（虛構）', base: 7200 },
      { item: '冷萃瓶與標籤', vendor: '晶亮玻璃（虛構）', base: 4800 },
      { item: '常溫宅配運費', vendor: '綠野物流（虛構）', base: 6800 },
    ],
    fixed: { rent: 18000, utility: 6400, ads: 9000, depreciation: 4500, equip: '烘豆機' },
    rd: [['新豆杯測', '肯亞與巴拿馬生豆杯測', '自家採購', 3800, '電子發票', 9], ['訓練費', '咖啡品質鑑定課程', '咖啡學院（虛構）', 6000, '收據', 20]],
    channels: { web: 0.34, line: 0.24, pos: 0.18, phone: 0.04, whatsapp: 0.08, zalo: 0.02, messenger: 0.10 },
    langs: { zh: 0.72, en: 0.16, ja: 0.12 },
  },
  leather: {
    cat: 'craft', avatar: '木', volume: 4, aiName: '小木', region: '台南市中西區',
    staff: [{ name: '木白', title: '負責人・皮件職人（董事酬勞）', kind: 'owner', pay: 50000 }],
    suppliers: [
      { item: '義大利植鞣牛皮', vendor: '皮革世家皮料行（虛構）', base: 22000 },
      { item: '五金配件、蠟線', vendor: '巧手五金（虛構）', base: 4200 },
      { item: '禮盒與防塵袋', vendor: '好包裝材料行（虛構）', base: 3600 },
      { item: '宅配運費', vendor: '綠野物流（虛構）', base: 2400 },
    ],
    fixed: { rent: 15000, utility: 3200, ads: 6000, depreciation: 2000, equip: '皮革工具與壓邊機' },
    rd: [['新品打樣', '托特包新版型打樣', '自家採購', 4200, '電子發票', 12]],
    channels: { web: 0.40, line: 0.22, pos: 0.12, phone: 0.02, whatsapp: 0.08, zalo: 0.02, messenger: 0.14 },
    langs: { zh: 0.70, en: 0.12, ja: 0.18 },
  },
  flower: {
    cat: 'flower', avatar: '日', volume: 9, aiName: '小日', region: '新北市板橋區',
    staff: [
      { name: '小日', title: '負責人・花藝師（董事酬勞）', kind: 'owner', pay: 52000 },
      { name: '阿葵', title: '花藝助理・兼職', kind: 'part', pay: 16000, level: 16500, hours: 80, hourly: 200 },
    ],
    suppliers: [
      { item: '當季鮮花批發', vendor: '花市批發商（虛構）', base: 24000 },
      { item: '包裝紙、緞帶、花器', vendor: '花藝資材行（虛構）', base: 6200 },
      { item: '冷藏配送', vendor: '綠野冷鏈物流（虛構）', base: 5200 },
    ],
    fixed: { rent: 26000, utility: 5200, ads: 8000, depreciation: 1800, equip: '鮮花冷藏櫃' },
    rd: [['設計開發', '母親節花禮新款試作', '自家採購', 3200, '電子發票', 15]],
    channels: { web: 0.30, line: 0.34, pos: 0.16, phone: 0.10, whatsapp: 0.03, zalo: 0.01, messenger: 0.06 },
    langs: { zh: 0.92, en: 0.05, ja: 0.03 },
  },
  nail: {
    cat: 'service', avatar: '指', volume: 6, aiName: '小甲', region: '台北市大安區',
    staff: [{ name: '小指', title: '負責人・美甲師（董事酬勞）', kind: 'owner', pay: 48000 }],
    suppliers: [
      { item: '凝膠與甲油', vendor: '美甲材料批發（虛構）', base: 7800 },
      { item: '消毒與一次性耗材', vendor: '潔淨醫材（虛構）', base: 2600 },
    ],
    fixed: { rent: 20000, utility: 3600, ads: 7000, depreciation: 1200, equip: '光療機與工作桌' },
    rd: [['新款設計', '秋冬色系款式開發', '自家採購', 1800, '電子發票', 8]],
    channels: { web: 0.18, line: 0.46, pos: 0.18, phone: 0.10, whatsapp: 0.02, zalo: 0.01, messenger: 0.05 },
    langs: { zh: 0.90, en: 0.06, ja: 0.04 },
  },
  pho: {
    cat: 'food', avatar: '玲', volume: 46, aiName: '小玲', region: '桃園市中壢區',
    staff: [
      { name: '阿玲', title: '負責人・主廚（董事酬勞）', kind: 'owner', pay: 50000 },
      { name: '阿芳', title: '內場助手・全職', kind: 'full', pay: 31000, level: 31800 },
      { name: '小武', title: '外場外送・兼職', kind: 'part', pay: 19200, level: 19200, hours: 96, hourly: 200 },
    ],
    suppliers: [
      { item: '牛骨、牛肉、雞肉', vendor: '中壢肉品批發（虛構）', base: 21000 },
      { item: '河粉、米紙、法國麵包', vendor: '南洋食品行（虛構）', base: 9800 },
      { item: '九層塔、薄荷、豆芽', vendor: '新鮮蔬果行（虛構）', base: 5200 },
      { item: '外帶餐盒、提袋', vendor: '好包裝材料行（虛構）', base: 4200 },
    ],
    fixed: { rent: 30000, utility: 11000, ads: 5000, depreciation: 3000, equip: '湯鍋與廚房設備' },
    rd: [['新菜試作', '越式燉牛肉麵試作', '自家採購', 2400, '電子發票', 6]],
    channels: { web: 0.10, line: 0.18, pos: 0.46, phone: 0.14, whatsapp: 0.01, zalo: 0.09, messenger: 0.02 },
    langs: { zh: 0.82, vi: 0.15, en: 0.03 },
  },
};

export const TENANT_ID = resolve();

// ── 資料隔離層 ──────────────────────────────────────────────
// 原型用瀏覽器儲存模擬「每個業主一個資料庫」：所有 greenup-solo: 開頭的 localStorage key
// 與 greenup 開頭的 BroadcastChannel 都自動加上業主前綴，各模組不必自己處理。
// 阿美沿用原本的 key（相容既有資料）。正式版改為每個業主獨立的資料庫與 n8n。
const NS = 'greenup-solo:';
const PFX = TENANT_ID === 'amei' ? null : `${NS}t:${TENANT_ID}:`;
const isGlobal = (k) => k === LS_TENANT;
const wrapKey = (k) => (PFX && typeof k === 'string' && k.startsWith(NS) && !k.startsWith(`${NS}t:`) && !isGlobal(k) ? PFX + k.slice(NS.length) : k);
if (PFX && !Storage.prototype.__guTenant) {
  const sp = Storage.prototype, g = sp.getItem, s = sp.setItem, r = sp.removeItem;
  sp.getItem = function (k) { return g.call(this, wrapKey(k)); };
  sp.setItem = function (k, v) { return s.call(this, wrapKey(k), v); };
  sp.removeItem = function (k) { return r.call(this, wrapKey(k)); };
  sp.__guTenant = TENANT_ID;
  // storage 事件：本業主的 key 還原成模組認得的名稱；其他業主的 key 保持原樣（不會被誤用）
  const d = Object.getOwnPropertyDescriptor(StorageEvent.prototype, 'key');
  if (d && d.get) Object.defineProperty(StorageEvent.prototype, 'key', { configurable: true, get() { const k = d.get.call(this); return k && k.startsWith(PFX) ? NS + k.slice(PFX.length) : (k && k.startsWith(`${NS}t:`) ? `__other_tenant__${k}` : k); } });
}
if (typeof BroadcastChannel !== 'undefined' && !BroadcastChannel.__guTenant) {
  const BC = BroadcastChannel;
  const Wrapped = class extends BC { constructor(name) { super(String(name).startsWith('greenup') ? `${name}@${TENANT_ID}` : name); } };
  Wrapped.__guTenant = TENANT_ID;
  window.BroadcastChannel = Wrapped;
}
for (const b of BIZ) if (!PROFILES[b.merchant.id]) PROFILES[b.merchant.id] = b.profile;
export const TENANTS = ALL.map(m => ({ ...m, ...(PROFILES[m.id] || {}), cat: m.cat || (PROFILES[m.id] || {}).cat || 'retail' }));
export const TENANT = TENANTS.find(t => t.id === TENANT_ID);

export function setTenant(id) {
  if (!MERCHANT_MAP[id]) return;
  try { localStorage.setItem(LS_TENANT, id); } catch { /* ignore */ }
  const u = new URL(location.href); u.searchParams.set('tenant', id);
  location.href = u.toString();
}
// 正式版每個業主的獨立資源（示範命名）：資料庫、n8n 實例、workflow 版本
export const tenantInfra = (id = TENANT_ID) => ({
  db: `greenup_${id}`, n8n: `n8n-${id}.greenup.local`, workflows: 'v1.4.0', storagePrefix: id === 'amei' ? NS : `${NS}t:${id}:`,
});
