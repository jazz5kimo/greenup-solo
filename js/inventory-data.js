// 庫存與生產：原料、批號效期、配方 BOM、生產排程、損耗紀錄（全部為示範用模擬資料）
// 阿美沿用原本手寫的示範資料；其他業主依 TENANT.cat（8 大類）＋供應商＋商品主檔自動產生（見檔案後半）
import { PRODUCTS, PRODUCT_MAP, mulberry32, startOfDay, addDays } from './data.js';
import { TENANT, TENANT_ID } from './tenant.js';

// 供應商（名稱與 data.js 進貨資料一致）
const A_SUPPLIERS = {
  '穀豐食品原料行': { lead: 1, line: '@gufeng-food', short: '穀豐', color: '#F0A531' },
  '北海乳品貿易': { lead: 1, line: '@hokkai-dairy', short: '北海', color: '#2E97D4' },
  '大湖果園合作社': { lead: 1, line: '@dahu-farm', short: '大湖', color: '#EC6A55' },
  '綠紙包裝設計': { lead: 3, line: '@greenpaper', short: '綠紙', color: '#5EE0C4' },
  '山城農產': { lead: 2, line: '@shancheng-agri', short: '山城', color: '#7C62E6' },
};

// 原料／包材主檔：cost 單位成本（未稅）、safety 安全存量、pack 進貨包裝量
const A_MATERIALS = [
  { id: 'flour', name: '日本麵粉', unit: 'kg', cost: 85, vendor: '穀豐食品原料行', safety: 15, pack: 25, store: '常溫', cat: 'raw', dp: 1 },
  { id: 'sugar', name: '砂糖', unit: 'kg', cost: 42, vendor: '穀豐食品原料行', safety: 10, pack: 25, store: '常溫', cat: 'raw', dp: 1 },
  { id: 'pinefill', name: '土鳳梨餡', unit: 'kg', cost: 220, vendor: '穀豐食品原料行', safety: 8, pack: 5, store: '冷藏', cat: 'raw', dp: 1 },
  { id: 'butter', name: '發酵奶油', unit: 'kg', cost: 480, vendor: '北海乳品貿易', safety: 10, pack: 5, store: '冷藏', cat: 'raw', dp: 1 },
  { id: 'cream', name: '鮮奶油', unit: 'L', cost: 260, vendor: '北海乳品貿易', safety: 8, pack: 6, store: '冷藏', cat: 'raw', dp: 1 },
  { id: 'cheese', name: '奶油乳酪', unit: 'kg', cost: 420, vendor: '北海乳品貿易', safety: 5, pack: 2, store: '冷藏', cat: 'raw', dp: 1 },
  { id: 'milk', name: '鮮乳', unit: 'L', cost: 95, vendor: '北海乳品貿易', safety: 6, pack: 6, store: '冷藏', cat: 'raw', dp: 1 },
  { id: 'strawberry', name: '草莓', unit: 'kg', cost: 380, vendor: '大湖果園合作社', safety: 3, pack: 2, store: '冷藏', cat: 'raw', dp: 1 },
  { id: 'lemon', name: '檸檬', unit: 'kg', cost: 90, vendor: '大湖果園合作社', safety: 4, pack: 5, store: '冷藏', cat: 'raw', dp: 1 },
  { id: 'taro', name: '芋頭', unit: 'kg', cost: 110, vendor: '山城農產', safety: 6, pack: 5, store: '常溫', cat: 'raw', dp: 1 },
  { id: 'oolong', name: '烏龍茶葉', unit: 'kg', cost: 1800, vendor: '山城農產', safety: 0.3, pack: 0.6, store: '常溫', cat: 'raw', dp: 2 },
  { id: 'earlgrey', name: '伯爵茶葉', unit: 'kg', cost: 1600, vendor: '山城農產', safety: 0.2, pack: 0.5, store: '常溫', cat: 'raw', dp: 2 },
  { id: 'nuts', name: '綜合堅果', unit: 'kg', cost: 650, vendor: '山城農產', safety: 3, pack: 3, store: '常溫', cat: 'raw', dp: 1 },
  { id: 'egg', name: '雞蛋', unit: '顆', cost: 7, vendor: '山城農產', safety: 120, pack: 180, store: '冷藏', cat: 'raw', dp: 0 },
  { id: 'giftbox', name: '禮盒包材', unit: '個', cost: 38, vendor: '綠紙包裝設計', safety: 60, pack: 100, store: '常溫', cat: 'pack', dp: 0 },
  { id: 'cakebox', name: '蛋糕紙盒・底盤', unit: '個', cost: 22, vendor: '綠紙包裝設計', safety: 50, pack: 100, store: '常溫', cat: 'pack', dp: 0 },
  { id: 'bag', name: '提袋・夾鏈袋', unit: '個', cost: 12, vendor: '綠紙包裝設計', safety: 80, pack: 200, store: '常溫', cat: 'pack', dp: 0 },
];

// 每項原料的批號：[天數(入庫，負數＝幾天前), 效期(距今天數), 數量]
const A_LOT_DEF = {
  flour: [[-24, 150, 16], [-6, 176, 25]],
  sugar: [[-30, 330, 18]],
  pinefill: [[-9, 21, 6.5], [-2, 28, 5]],
  butter: [[-18, 40, 6.5], [-4, 54, 15]],
  cream: [[-8, 2, 3.5], [-2, 9, 5]],
  cheese: [[-5, 16, 3.2]],
  milk: [[-4, 3, 2.4], [-1, 6, 4.2]],
  strawberry: [[-2, 1, 1.8]],
  lemon: [[-3, 11, 5.5]],
  taro: [[-4, 10, 3.6]],
  oolong: [[-40, 320, 0.8]],
  earlgrey: [[-35, 300, 0.42]],
  nuts: [[-12, 75, 2.6]],
  egg: [[-6, 6, 96], [-2, 12, 240]],
  giftbox: [[-20, 900, 140], [-6, 900, 300]],
  cakebox: [[-14, 900, 64]],
  bag: [[-25, 900, 420]],
};

const A_PFX = { flour: 'FL', sugar: 'SG', pinefill: 'PF', butter: 'BT', cream: 'CR', cheese: 'CC', milk: 'MK', strawberry: 'SB', lemon: 'LM', taro: 'TR', oolong: 'OL', earlgrey: 'EG', nuts: 'NT', egg: 'EC', giftbox: 'GB', cakebox: 'CB', bag: 'BG' };

export function buildLots(now = new Date()) {
  const today = startOfDay(now);
  const lots = [];
  for (const m of MATERIALS) {
    (LOT_DEF[m.id] || []).forEach(([inD, expD, qty], i) => {
      const inDate = addDays(today, inD);
      const exp = addDays(today, expD); exp.setHours(23, 59, 59, 0);
      const ymd = `${String(inDate.getMonth() + 1).padStart(2, '0')}${String(inDate.getDate()).padStart(2, '0')}`;
      lots.push({ mid: m.id, batch: `${PFX[m.id]}-${ymd}-${String.fromCharCode(65 + i)}`, inDate, exp, qty, vendor: m.vendor });
    });
  }
  return lots;
}

// 配方 BOM（每 1 個銷售單位）＋人工分鐘、製造費用（烤箱電力瓦斯、冷藏、設備折舊）
const A_LABOR_RATE = 3.2; // 每分鐘人工成本（小芸月薪＋勞健保勞退攤提）
const A_RECIPES = {
  lemon: { lines: [['flour', 0.12], ['butter', 0.07], ['sugar', 0.08], ['egg', 3], ['lemon', 0.15], ['cream', 0.05], ['cakebox', 1]], labor: 9, mfg: 5, oven: 25, note: '塔殼盲烤 170°C 25 分 → 檸檬凝乳填餡 → 冷藏 2 小時' },
  roll: { lines: [['flour', 0.06], ['egg', 5], ['sugar', 0.07], ['cream', 0.25], ['milk', 0.05], ['strawberry', 0.12], ['cakebox', 1]], labor: 12, mfg: 11, oven: 15, note: '戚風蛋糕體 180°C 15 分 → 冷卻 → 生乳餡捲製 → 冷藏定型 3 小時' },
  basque: { lines: [['cheese', 0.25], ['taro', 0.2], ['egg', 4], ['cream', 0.1], ['sugar', 0.08], ['cakebox', 1]], labor: 10, mfg: 22, oven: 35, note: '芋泥＋乳酪糊 → 230°C 高溫烘烤 35 分 → 冷藏一夜定型' },
  pound: { lines: [['flour', 0.1], ['butter', 0.09], ['sugar', 0.08], ['egg', 2], ['oolong', 0.006], ['bag', 1]], labor: 6, mfg: 9, oven: 50, note: '烏龍茶粉打入奶油 → 170°C 50 分 → 刷茶酒糖液' },
  cookie: { lines: [['flour', 0.2], ['butter', 0.1], ['sugar', 0.07], ['egg', 1], ['nuts', 0.06], ['giftbox', 1]], labor: 5, mfg: 12, oven: 20, note: '冰箱餅乾麵團切片 → 165°C 20 分 → 冷卻裝盒' },
  pineapple: { lines: [['flour', 0.15], ['butter', 0.08], ['pinefill', 0.25], ['egg', 1], ['sugar', 0.02], ['giftbox', 1]], labor: 4, mfg: 5, oven: 25, note: '土鳳梨餡包入酥皮 → 模壓 → 180°C 正反面各烤' },
  canele: { lines: [['milk', 0.25], ['flour', 0.06], ['sugar', 0.12], ['egg', 3], ['butter', 0.03], ['earlgrey', 0.004], ['cakebox', 1]], labor: 8, mfg: 17, oven: 60, note: '伯爵茶麵糊冷藏熟成 24 小時 → 銅模 220°C→180°C 60 分' },
};

export function bom(pid) {
  const r = RECIPES[pid] || { lines: [], labor: 0, mfg: 0, oven: 0, note: '' };
  const rows = r.lines.filter(([mid]) => MAT[mid]).map(([mid, qty]) => { const m = MAT[mid]; return { mid, name: m.name, unit: m.unit, qty, price: m.cost, sub: +(qty * m.cost).toFixed(1), cat: m.cat, dp: m.dp }; });
  const raw = rows.filter(x => x.cat === 'raw').reduce((s, x) => s + x.sub, 0);
  const pack = rows.filter(x => x.cat === 'pack').reduce((s, x) => s + x.sub, 0);
  const labor = r.labor * LABOR_RATE;
  const total = raw + pack + labor + r.mfg;
  return { rows, raw, pack, labor, mfg: r.mfg, total, note: r.note, laborMin: r.labor, oven: r.oven, ref: PRODUCT_MAP[pid].cost };
}

// 成品：生產前置天數（含冷藏定型、熟成）
const A_LEAD = { lemon: 1, roll: 1, basque: 1, pound: 1, cookie: 2, pineapple: 2, canele: 2 };

// 今日生產排程：資源與各商品的製程範本（d＝分鐘；oven 步驟依整爐數拆成多爐）
const A_RESOURCES = [
  { id: 'ovenA', name: '旋風烤箱 A', kind: 'oven' },
  { id: 'ovenB', name: '層爐 B', kind: 'oven' },
  { id: 'bench', name: '工作台・小芸', kind: 'bench' },
  { id: 'fridge', name: '冷藏櫃', kind: 'fridge' },
  { id: 'pack', name: '包裝・小傑', kind: 'pack' },
];
const A_BATCH = { lemon: 6, roll: 5, basque: 6, pound: 6, cookie: 8, pineapple: 8, canele: 3 }; // 每爐可烤數量
const A_STEPS = {
  canele: [['bench', '麵糊入銅模', 20], ['oven', '烘烤 220→180°C', 60], ['pack', '脫模裝盒', 20]],
  roll: [['bench', '蛋糕體打發', 35], ['oven', '蛋糕體烘烤', 15], ['fridge', '蛋糕體冷卻', 40], ['bench', '生乳餡捲製組裝', 45], ['fridge', '冷藏定型', 180], ['pack', '裝盒貼標', 25]],
  basque: [['bench', '芋泥・乳酪糊', 40], ['oven', '230°C 高溫烘烤', 35], ['fridge', '冷藏定型', 300]],
  lemon: [['bench', '塔皮入模', 35], ['oven', '塔殼盲烤', 25], ['bench', '檸檬凝乳填餡', 40], ['fridge', '冷藏', 120], ['pack', '裝盒', 20]],
  pineapple: [['bench', '包餡・模壓', 50], ['oven', '正反面烘烤', 30], ['pack', '禮盒包裝', 40]],
  cookie: [['bench', '麵團切片', 30], ['oven', '烘烤', 20], ['pack', '冷卻裝盒', 40]],
  pound: [['bench', '烏龍茶麵糊', 30], ['oven', '烘烤', 50], ['bench', '刷茶酒糖液', 15], ['pack', '封袋貼標', 30]],
};
const A_PRIORITY = ['canele', 'roll', 'basque', 'lemon', 'pineapple', 'cookie', 'pound'];
export const H = (h, m = 0) => h * 60 + m;
const A_TIMES = { day: H(7), pack: H(12), win: [H(7), H(16)] };

// 損耗紀錄（近 8 週，固定種子）
const A_WASTE_REASONS = [
  ['strawberry', '草莓過熟', 0.3, 0.7], ['cream', '鮮奶油開封超過 48 小時', 0.3, 0.8], ['milk', '鮮乳到期', 0.5, 1.2],
  ['egg', '運送破損', 4, 12], ['basque', '巴斯克表面裂開（瑕疵品）', 1, 1], ['roll', '生乳捲切邊・試吃', 1, 1],
  ['lemon', '檸檬塔塔殼破損', 1, 2], ['canele', '可麗露外殼焦黑', 1, 2], ['cakebox', '紙盒受潮', 3, 8],
];
export function wasteLog(now = new Date()) {
  const rng = mulberry32(5150);
  const today = startOfDay(now);
  const list = [];
  for (let d = 55; d >= 0; d--) {
    const day = addDays(today, -d);
    const n = rng() < 0.55 ? 1 : rng() < 0.3 ? 2 : 0;
    for (let i = 0; i < n; i++) {
      const [id, reason, lo, hi] = WASTE_REASONS[Math.floor(rng() * WASTE_REASONS.length)];
      const isP = !!PRODUCT_MAP[id];
      if (!isP && !MAT[id]) continue;
      const unit = isP ? PRODUCT_MAP[id].unit.replace(/^[\d ]+/, '') || '個' : MAT[id].unit;
      const qty = isP || MAT[id].dp === 0 ? Math.round(lo + rng() * (hi - lo)) : +(lo + rng() * (hi - lo)).toFixed(1);
      const cost = isP ? PRODUCT_MAP[id].cost : MAT[id].cost;
      const ts = new Date(day); ts.setHours(9 + Math.floor(rng() * 9), Math.floor(rng() * 60));
      list.push({ ts: +ts, id, name: isP ? PRODUCT_MAP[id].name : MAT[id].name, unit: isP ? '個' : unit, qty, amt: Math.round(qty * cost), reason, kind: isP ? '成品' : '原料' });
    }
  }
  return list.filter(x => x.ts <= +now).sort((a, b) => b.ts - a.ts);
}



// ───────────────────────────────────────────────────────────────
// 其他業主：依業態大類（TENANT.cat）＋ TENANT.suppliers ＋ 商品主檔自動產生原料、BOM、排程與損耗
// 全部為示範用模擬資料；不依業主 id 寫死，任何新業主都能產生合理內容。
// ───────────────────────────────────────────────────────────────
export const IS_AMEI = TENANT_ID === 'amei';
const CAT8 = ['food', 'drink', 'dessert', 'retail', 'craft', 'flower', 'service', 'farm'];
export const CAT = CAT8.includes(TENANT.cat) ? TENANT.cat : 'retail';
export const FOODISH = ['food', 'drink', 'dessert', 'farm'].includes(CAT);
const STAFF_LIST = (TENANT.staff && TENANT.staff.length) ? TENANT.staff : [{ name: TENANT.owner || '負責人', kind: 'owner', pay: 45000 }];
const words = String(TENANT.en || TENANT.id || 'shop').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
const SLUG = words.length > 1 ? `${words[0]}-${words[words.length - 1]}` : (words[0] || 'shop');

// 商品短名：去掉尾端的數量規格、過長時取最後一段
function shortName(p) {
  let n = String(p?.name || '').replace(/\s*[\d０-９]+\s*[^\s\d]{0,3}$/, '').trim();
  const parts = n.split(/\s+/);
  if (parts.length > 1) n = parts[parts.length - 1].length >= 2 ? parts[parts.length - 1] : parts.join('');
  return n.length > 7 ? n.slice(0, 7) : (n || p?.name || '');
}
// 商品保存天數（null＝不需效期）：先讀商品描述，再依業態推估
function shelfOf(p) {
  if (!p) return null;
  const t = `${p.name || ''}${p.desc || ''}`;
  let m = t.match(/冷凍\s*([\d]+)\s*個?月/); if (m) return +m[1] * 30;
  m = t.match(/(?:冷藏|保存|賞味|常溫)[^\d]{0,4}(\d+)\s*天/); if (m) return +m[1];
  if (/一年|1 年|保存一年/.test(t)) return 365;
  switch (CAT) {
    case 'food': return /湯底|醬|冷凍|罐|包$/.test(p.name) ? 90 : 1;
    case 'drink': return /冷|鮮|瓶|果汁|茶飲|奶/.test(p.name) ? 5 : /組|壺|杯|器/.test(p.name) ? null : 60;
    case 'dessert': return /禮盒|餅|酥|乾/.test(p.name) ? 30 : 4;
    case 'flower': return /乾燥|不凋|永生/.test(t) ? 365 : /盆|植|多肉|苗/.test(t) ? 30 : /訂閱/.test(t) ? 7 : 5;
    case 'farm': return /醬|乾|罐|粉|米/.test(p.name) ? 180 : 7;
    default: return null;
  }
}
const nice = (v, dp = 0) => { const k = Math.pow(10, dp); return Math.max(dp ? 1 / k : 1, Math.round(v * k) / k); };
const vendorShort = (v) => String(v || '').replace(/（虛構）|\(虛構\)/g, '').replace(/有限公司|股份|批發商?|行$/g, '').slice(0, 2) || '廠商';

export const KIT = {
  cat: CAT, foodish: FOODISH, shop: TENANT.name || '本店', owner: TENANT.owner || STAFF_LIST[0].name, typeName: TENANT.typeName || '',
  ai: TENANT.aiName || 'AI 助理', staff: STAFF_LIST, helper: STAFF_LIST[1]?.name || null, helper2: STAFF_LIST[2]?.name || STAFF_LIST[1]?.name || null,
  solo: STAFF_LIST.length === 1, region: TENANT.region || '', slug: SLUG, domain: `${SLUG}.tw`, handle: SLUG.replace('-', '.'),
  avatar: TENANT.avatar || String(TENANT.name || '店').slice(0, 1), suppliers: (TENANT.suppliers || []).filter(x => x && x.vendor),
  short: shortName, shelfOf, pi: (i) => PRODUCTS[((i % PRODUCTS.length) + PRODUCTS.length) % PRODUCTS.length],
  byPrice: () => PRODUCTS.slice().sort((a, b) => a.price - b.price),
  byPop: () => PRODUCTS.slice().sort((a, b) => (b.pop || 0) - (a.pop || 0)),
  unitWord: (p) => { const u = String(p?.unit || '').replace(/^[\d\s.]+/, '').trim() || '份'; return /^(入|片|條|顆|枚)$/.test(u) ? '盒' : /^(ml|mL|cc|L|公升|毫升)$/.test(u) ? '瓶' : /^(g|kg|公克|公斤|磅|半磅|斤|台斤)$/.test(u) ? '包' : u; },
  vendorShort,
};

// 供應商品項 → 原料／包材（關鍵字推估單位、成本、溫層）
const MAT_RULES = [
  [/運費|物流|宅配|配送|運送|快遞|貨運/, null],
  [/鮮花|花材|花卉|切花|玫瑰|葉材/, ['把', 120, '冷藏', 'raw', true, 0]],
  [/皮料|牛皮|羊皮|植鞣|皮革|布料|棉布|木料|木材|毛線|陶土|銀料|蠟材|原木/, ['才', 150, '常溫', 'raw', false, 1]],
  [/凝膠|甲油|染膏|精油|乳霜|保養品|洗劑|藥水/, ['瓶', 300, '常溫', 'raw', true, 1]],
  [/肉|骨|蝦|魚|海鮮|雞|豬|鴨|貝/, ['kg', 280, '冷藏', 'raw', true, 1]],
  [/蔬|菜|果(?!醬)|九層塔|薄荷|豆芽|香草|菇|蔥|筍|莓/, ['kg', 90, '冷藏', 'raw', true, 1]],
  [/乳|奶|蛋|豆腐/, ['L', 110, '冷藏', 'raw', true, 1]],
  [/袋|盒|瓶|罐|杯|(?<!米)紙|標籤|緞帶|資材|包材|包裝|花器|膠帶|紙箱|餐盒|吸管|卡片/, ['個', 8, '常溫', 'pack', false, 0]],
  [/豆|茶|粉|米|麵|糖|穀|麥|香料|醬|油|咖啡/, ['kg', 220, '常溫', 'raw', false, 1]],
  [/五金|配件|零件|扣|拉鍊|蠟線|線/, ['組', 30, '常溫', 'raw', false, 0]],
  [/耗材|消毒|手套|毛巾|棉片|酒精/, ['份', 15, '常溫', 'raw', false, 0]],
  [/苗|種子|肥|土|飼料/, ['kg', 40, '常溫', 'raw', false, 1]],
];
// 各業態的基本原料／包材（供應商資料不足時補齊）：[名稱, 單位, 成本, 溫層, 類別, 易腐, 小數位, 關鍵字]
const CAT_MATS = {
  food: [['新鮮蔬菜・香草', 'kg', 90, '冷藏', 'raw', true, 1, /蔬|菜|香草/], ['主食材（肉品／海鮮）', 'kg', 300, '冷藏', 'raw', true, 1, /肉|骨|海鮮|魚|蝦/], ['米麵主食', 'kg', 60, '常溫', 'raw', false, 1, /米|麵|粉/], ['調味醬料', 'kg', 150, '常溫', 'raw', false, 1, /醬|調味/], ['外帶餐盒', '個', 5, '常溫', 'pack', false, 0, /餐盒|碗/], ['提袋・餐具組', '個', 2, '常溫', 'pack', false, 0, /提袋|餐具/]],
  drink: [['開封原料（熟豆・茶葉批次）', 'kg', 520, '常溫', 'raw', true, 2, /熟豆|開封/], ['主原料（茶葉／豆材）', 'kg', 600, '常溫', 'raw', false, 2, /茶|豆|咖啡/], ['糖漿・果醬', 'L', 180, '常溫', 'raw', false, 1, /糖|果醬/], ['杯材・杯蓋', '個', 4, '常溫', 'pack', false, 0, /杯/], ['包裝袋・標籤', '個', 5, '常溫', 'pack', false, 0, /袋|標籤/]],
  dessert: [['麵粉', 'kg', 60, '常溫', 'raw', false, 1, /麵粉|粉/], ['無鹽奶油', 'kg', 420, '冷藏', 'raw', false, 1, /奶油/], ['鮮奶油', 'L', 260, '冷藏', 'raw', true, 1, /鮮奶油|乳/], ['雞蛋', '顆', 7, '冷藏', 'raw', true, 0, /蛋/], ['砂糖', 'kg', 42, '常溫', 'raw', false, 1, /糖/], ['紙盒・底盤', '個', 20, '常溫', 'pack', false, 0, /盒/], ['提袋・夾鏈袋', '個', 8, '常溫', 'pack', false, 0, /袋/]],
  retail: [['試用品・樣品', '份', 25, '常溫', 'raw', true, 0, /試用|樣品/], ['禮盒包材', '個', 30, '常溫', 'pack', false, 0, /禮盒|盒/], ['緩衝材・紙箱', '個', 12, '常溫', 'pack', false, 0, /紙箱|緩衝/], ['感謝卡・貼紙', '張', 3, '常溫', 'pack', false, 0, /卡|貼紙/]],
  craft: [['主材料', '才', 150, '常溫', 'raw', false, 1, /皮|布|木|料/], ['五金配件', '組', 30, '常溫', 'raw', false, 0, /五金|配件/], ['開封膠水・封邊液', 'ml', 0.5, '常溫', 'raw', true, 0, /膠|封邊/], ['蠟線・線材', 'm', 1.2, '常溫', 'raw', false, 0, /線/], ['禮盒', '個', 40, '常溫', 'pack', false, 0, /禮盒|盒/], ['防塵袋', '個', 20, '常溫', 'pack', false, 0, /防塵袋|袋/]],
  flower: [['當季鮮花', '枝', 22, '冷藏', 'raw', true, 0, /鮮花|花材/], ['葉材（尤加利等）', '把', 60, '冷藏', 'raw', true, 0, /葉/], ['配花（滿天星等）', '把', 80, '冷藏', 'raw', true, 0, /配花|滿天星/], ['包裝紙', '張', 8, '常溫', 'pack', false, 0, /包裝紙|紙/], ['緞帶', 'm', 6, '常溫', 'pack', false, 0, /緞帶/], ['賀卡', '張', 5, '常溫', 'pack', false, 0, /卡/]],
  service: [['專業耗材（開封）', '瓶', 300, '常溫', 'raw', true, 1, /凝膠|甲油|染膏|精油|耗材/], ['一次性耗材（手套・毛巾・棉片）', '份', 12, '常溫', 'raw', false, 0, /一次性|手套|毛巾/], ['器具消毒液', 'L', 380, '常溫', 'raw', false, 1, /消毒/], ['保養品', '罐', 520, '常溫', 'raw', false, 1, /保養|乳霜/], ['耗材分裝袋', '個', 3, '常溫', 'pack', false, 0, /袋/], ['禮券卡・信封', '份', 18, '常溫', 'pack', false, 0, /禮券|卡/]],
  farm: [['當季採收作物', 'kg', 60, '冷藏', 'raw', true, 1, /採收|作物|蔬|果/], ['有機肥料', 'kg', 25, '常溫', 'raw', false, 1, /肥/], ['分級紙箱', '個', 18, '常溫', 'pack', false, 0, /紙箱|箱/], ['保鮮袋・標籤', '個', 3, '常溫', 'pack', false, 0, /保鮮|標籤|袋/], ['保冷劑', '個', 6, '冷藏', 'pack', false, 0, /保冷/]],
};
// 各業態的生產／備料語彙
const CAT_IV = {
  food: { A: '爐台 A', B: '爐台 B', bench: '備料台', fridge: '冷藏・冷卻', pack: '出餐包裝', sOven: '烹煮・熬煮', sBench: '備料切配', sFridge: '冷藏靜置', sPack: '分裝包裝', oven: 90, fr: 60, equip: '爐台', util: '爐台使用率', mfgShort: '瓦斯・冷藏・折舊', start: 7 },
  drink: { A: '主設備 A', B: '萃取・調製台', bench: '秤重調配', fridge: '靜置・冷藏', pack: '封裝貼標', sOven: '烘製・萃取', sBench: '秤重配方', sFridge: '靜置熟成', sPack: '封裝貼標', oven: 20, fr: 120, equip: '設備', util: '設備使用率', mfgShort: '設備電力・瓦斯・折舊', start: 8 },
  dessert: { A: '烤箱 A', B: '烤箱 B', bench: '工作台', fridge: '冷藏櫃', pack: '包裝', sOven: '烘烤', sBench: '麵糊・整形', sFridge: '冷藏定型', sPack: '裝盒貼標', oven: 35, fr: 120, equip: '烤箱', util: '烤箱使用率', mfgShort: '烤箱・冷藏・折舊', start: 7 },
  retail: { A: '包裝檯 A', B: '包裝檯 B', bench: '驗收上架', fridge: '待出貨暫存區', pack: '包裝出貨', sOven: '品檢・組裝', sBench: '驗收分裝', sFridge: '待出貨暫存', sPack: '包裝貼標', oven: 15, fr: 30, equip: '包裝檯', util: '包裝檯使用率', mfgShort: '倉儲・耗材・折舊', start: 9 },
  craft: { A: '機台加工區', B: '刻字・燙印機', bench: '手工組裝台', fridge: '上膠・乾燥區', pack: '包裝', sOven: '裁切・機台加工', sBench: '手工組裝', sFridge: '上膠乾燥', sPack: '保養包裝', oven: 20, fr: 60, equip: '機台', util: '機台使用率', mfgShort: '機台・工具・折舊', start: 9 },
  flower: { A: '花藝工作檯 A', B: '花藝工作檯 B', bench: '整理醒花', fridge: '鮮花冷藏櫃', pack: '包裝配送', sOven: '設計插作', sBench: '去葉醒花', sFridge: '冷藏吸水', sPack: '包裝・賀卡', oven: 30, fr: 60, equip: '工作檯', util: '工作檯使用率', mfgShort: '冷藏・損耗・折舊', start: 8 },
  service: { A: '器具消毒設備', B: 'UV 消毒箱', bench: '耗材分裝', fridge: '乾燥・密封保存', pack: '開店前整理', sOven: '器具消毒', sBench: '分裝耗材包', sFridge: '乾燥密封', sPack: '整理上架', oven: 40, fr: 45, equip: '消毒設備', util: '消毒設備使用率', mfgShort: '設備・場地分攤', start: 9 },
  farm: { A: '清洗分級線', B: '預冷設備', bench: '採收整理', fridge: '預冷保鮮庫', pack: '包裝出貨', sOven: '清洗分級', sBench: '採收整理', sFridge: '預冷保鮮', sPack: '裝箱出貨', oven: 30, fr: 90, equip: '分級設備', util: '分級設備使用率', mfgShort: '冷鏈・設備・折舊', start: 6 },
};
export const IVL = { ...CAT_IV[CAT] };
{
  const eq = String(TENANT.fixed?.equip || '').split(/與|、|和|及/)[0].trim();
  if (eq && (CAT === 'drink' || CAT === 'food') && eq.length <= 6) { IVL.A = eq; IVL.equip = eq; IVL.util = `${eq}使用率`; }
  IVL.sched = CAT === 'service' ? '今日備料排程' : CAT === 'retail' ? '今日包裝排程' : '今日生產排程';
  IVL.suggest = CAT === 'service' ? 'AI 建議備料' : CAT === 'retail' ? 'AI 建議備貨' : 'AI 建議生產';
}

const PALETTE = ['#F0A531', '#2E97D4', '#EC6A55', '#5EE0C4', '#7C62E6', '#DD5597', '#2DB674', '#C9935A'];
function genInventory() {
  const sup = KIT.suppliers;
  const mats = [];
  const vendors = {};
  const addVendor = (v, lead) => { if (!vendors[v]) { const i = Object.keys(vendors).length; vendors[v] = { lead, line: `@${KIT.slug}-v${i + 1}`, short: vendorShort(v), color: PALETTE[i % PALETTE.length] }; } };
  for (const s of sup) {
    const rule = MAT_RULES.find(([re]) => re.test(s.item || ''));
    if (rule && rule[1] === null) continue;
    const [unit, cost, store, cat, perish, dp] = rule ? rule[1] : ['份', 60, '常溫', 'raw', false, 0];
    const name = String(s.item || '原料').replace(/批發$/, '').replace(/、|與|及/g, '・').slice(0, 14);
    addVendor(s.vendor, cat === 'pack' ? 3 : perish ? 1 : 2);
    mats.push({ id: 'm' + (mats.length + 1), name, unit, cost, vendor: s.vendor, store, cat, dp, perish });
  }
  const rawVendor = mats.find(m => m.cat === 'raw')?.vendor || '在地原料行（虛構）';
  const packVendor = mats.find(m => m.cat === 'pack')?.vendor || '好包裝材料行（虛構）';
  const def = CAT_MATS[CAT];
  const has = (kw) => mats.some(m => kw.test(m.name));
  const push = (d) => { const [name, unit, cost, store, cat, perish, dp] = d; const v = cat === 'pack' ? packVendor : rawVendor; addVendor(v, cat === 'pack' ? 3 : perish ? 1 : 2); mats.push({ id: 'm' + (mats.length + 1), name, unit, cost, vendor: v, store, cat, dp, perish }); };
  if (!mats.some(m => m.perish)) { const d = def.find(x => x[5]); if (d) push(d); }
  for (const d of def) { if (mats.filter(m => m.cat === 'raw').length >= 3) break; if (d[4] === 'raw' && !has(d[7]) && !mats.some(m => m.name === d[0])) push(d); }
  for (const d of def) { if (mats.filter(m => m.cat === 'pack').length >= 2) break; if (d[4] === 'pack' && !has(d[7]) && !mats.some(m => m.name === d[0])) push(d); }
  // 零售：每項商品的進貨成本列成一個原料
  if (CAT === 'retail') PRODUCTS.forEach((p) => { addVendor(rawVendor, 2); mats.push({ id: 'm' + (mats.length + 1), name: `${shortName(p)}（進貨）`, unit: '件', cost: Math.max(1, Math.round(p.cost * 0.72)), vendor: rawVendor, store: '常溫', cat: 'raw', dp: 0, perish: false, forPid: p.id }); });
  const raws = mats.filter(m => m.cat === 'raw' && !m.forPid), packs = mats.filter(m => m.cat === 'pack');
  const perish = mats.find(m => m.perish) || null;
  const perishNatural = !!perish && sup.some(s => perish.vendor === s.vendor && perish.name.startsWith(String(s.item || '').replace(/、|與|及/g, '・').slice(0, 4)));
  const TGT = { food: /湯底|醬|冷凍|湯包/, drink: /冷|萃|瓶|飲|奶|拿鐵/, craft: /油|保養|鑰匙|小物/, farm: /醬|乾|汁|果乾/ }[CAT];
  const aiP = (TGT && PRODUCTS.find(p => TGT.test(p.name) && p.cost > 0)) || PRODUCTS.find(p => p.cost > 0) || PRODUCTS[0];

  const rate = Math.max(1.6, Math.min(4, Math.round(((KIT.staff.find(x => x.kind !== 'owner') || KIT.staff[0]).pay || 40000) / (22 * 8 * 60) * 10) / 10));
  const recipes = {}, steps = {}, batch = {}, lead = {};
  const C = CAT_IV[CAT];
  // 商品與原料的關聯：名稱／描述的字詞重疊
  const KEYC = '豆茶花葉皮肉骨蝦雞牛豬魚粉麵米膠油蛋奶乳果菜線布木蠟醬酒';
  const bi = (t) => { const o = new Set(); const x = String(t).replace(/[\s・、，。（）()]/g, ''); for (let k = 0; k < x.length - 1; k++) o.add(x.slice(k, k + 2)); return o; };
  const score = (p, m) => { const pt = `${p.name}${p.desc || ''}`; let sc = 0; for (const b of bi(m.name)) if (pt.includes(b)) sc += 2; for (const ch of new Set(m.name)) if (KEYC.includes(ch) && pt.includes(ch)) sc += 1; return sc; };
  const supRaw = raws.filter(m => sup.some(x => x.vendor === m.vendor) && !m.perish || (perishNatural && m === perish));
  const primary = supRaw[0] || raws.find(m => m !== perish) || raws[0];
  const fbVendor = '綜合原料行（虛構）';
  PRODUCTS.forEach((p, i) => {
    const cost = Math.max(0, p.cost || 0);
    const lines = [];
    let raw = 0, pack = 0;
    const addLine = (m, budget, minOne) => {
      if (!m || budget <= 0) return;
      let q = budget / m.cost;
      q = m.dp ? +q.toFixed(m.dp >= 2 ? 3 : (q < 1 ? 3 : 2)) : Math.round(q);
      if (!m.dp && q < 1) { if (!minOne || m.cost > budget * 1.6) return; q = 1; }
      if (q <= 0) return;
      lines.push([m.id, q]);
      if (m.cat === 'pack') pack += q * m.cost; else raw += q * m.cost;
    };
    if (cost > 0) {
      const isAi = p === aiP;
      const own = mats.find(m => m.forPid === p.id);
      const cand = raws.filter(m => m !== perish || perishNatural).map(m => ({ m, sc: score(p, m) })).filter(x => x.sc > 0).sort((a, b) => b.sc - a.sc);
      let main = own || cand[0]?.m || null;
      if (!main) {
        if (CAT === 'food' || CAT === 'service' || /油|蠟|膏|劑|液|盆|植栽|多肉|苗|壺/.test(p.name)) {
          addVendor(fbVendor, 2);
          main = { id: 'm' + (mats.length + 1), name: `${shortName(p)}材料`, unit: '份', cost: Math.max(1, Math.round(cost * 0.4)), vendor: fbVendor, store: '常溫', cat: 'raw', dp: 0, perish: false };
          mats.push(main);
        } else main = primary;
      }
      let second = cand.find(x => x.m !== main)?.m || null;
      if (!second && CAT === 'craft') second = raws.find(m => /五金|線|配件/.test(m.name) && m !== main) || null;
      if (!second && cand.length && CAT === 'food' && perishNatural && perish !== main) second = raws.find(m => m.perish && m !== main && /菜|香草|蔬|葉|塔|薄荷/.test(m.name)) || null;
      if (isAi && perish && main !== perish) second = perish;
      const rb = cost * (CAT === 'service' ? 0.3 : 0.56);
      addLine(main, second ? rb * (own ? 0.86 : 0.7) : rb, true);
      if (second) addLine(second, rb * (own ? 0.14 : 0.3), true);
      const okPk = packs.filter(m => /券|禮/.test(p.name) || !/禮券/.test(m.name)).map(m => ({ m, sc: score(p, m) })).sort((a, b) => b.sc - a.sc);
      const pk = okPk[0]?.m;
      if (pk && pk.cost <= cost * 0.2) { lines.push([pk.id, 1]); pack += pk.cost; }
    } else if (packs.length) {
      const pk = packs.slice().sort((a, b) => a.cost - b.cost)[0]; lines.push([pk.id, 1]); pack += pk.cost;
    }
    let laborMin = cost > 0 ? Math.max(1, Math.min(240, Math.round(cost * (CAT === 'service' ? 0.42 : 0.2) / rate))) : 0;
    while (laborMin > 1 && cost - raw - pack - laborMin * rate < Math.max(0.5, cost * 0.03)) laborMin--;
    const mfg = cost > 0 ? Math.max(0.5, +(cost - raw - pack - laborMin * rate).toFixed(1)) : 0;
    // 製程
    const k = i % 3;
    const bench = Math.max(10, Math.min(90, Math.round(laborMin * 0.6 / 5) * 5 || 10));
    const ovenD = Math.round(C.oven * (1 + k * 0.3) / 5) * 5;
    const st = cost <= 0 ? [['pack', `${C.sPack}`, 15]]
      : [['bench', C.sBench, bench], ...(i === PRODUCTS.length - 1 && PRODUCTS.length > 2 ? [] : [['oven', C.sOven, ovenD]]), ...(k === 2 ? [] : [['fridge', C.sFridge, C.fr]]), ['pack', C.sPack, 15 + k * 5]];
    steps[p.id] = st;
    batch[p.id] = Math.max(1, Math.round((p.stock || 10) / 5));
    lead[p.id] = 1 + (k === 1 ? 1 : 0);
    const ovenMin = st.filter(x => x[0] === 'oven').reduce((s, x) => s + x[2], 0);
    recipes[p.id] = { lines, labor: laborMin, mfg, oven: ovenMin, note: cost <= 0 ? '本項不含原料成本，兌換或交付時才認列相關成本' : st.map(x => x[1]).join(' → ') };
  });

  // 每日用量 → 安全存量、進貨包裝量、批號
  const daily = Math.max(0.4, (TENANT.volume || 8) * 1.4 / Math.max(1, PRODUCTS.length));
  const lotDef = {}, pfx = {};
  mats.forEach((m, mi) => {
    let use = 0;
    for (const p of PRODUCTS) { const l = (recipes[p.id]?.lines || []).find(x => x[0] === m.id); if (l) use += l[1] * daily; }
    if (!use) use = m.dp ? 0.5 : 2;
    const dp = m.dp;
    m.safety = nice(use * 3, dp); m.pack = nice(use * 8, dp);
    pfx[m.id] = `M${String(mi + 1).padStart(2, '0')}`;
    if (m.perish) {
      const l0 = (recipes[aiP?.id]?.lines || []).find(x => x[0] === m.id);
      const q1 = l0 ? nice(l0[1] * Math.max(4, Math.round((aiP.stock || 10) * 0.3)), Math.max(dp, 2)) : nice(use * 1.2, dp);
      lotDef[m.id] = [[-3, 1, q1], [-1, 6, nice(use * 3.4, dp)]];
    } else if (m.cat === 'pack') lotDef[m.id] = [[-20, 900, nice(use * (mi % 3 === 1 ? 2.4 : 6), dp)]];
    else if (m.forPid) lotDef[m.id] = [[-14, 900, nice(use * 5, dp)]];
    else lotDef[m.id] = mi % 2 ? [[-26, 200, nice(use * 1.1, dp)]] : [[-30, 240, nice(use * 2.2, dp)], [-6, 330, nice(use * 3.6, dp)]];
  });
  const priority = PRODUCTS.map((p, i) => ({ id: p.id, w: (steps[p.id].some(x => x[0] === 'fridge') ? 1000 : 0) + p.price })).sort((a, b) => b.w - a.w).map(x => x.id);
  const day = H(C.start), part = KIT.staff.some(x => x.kind === 'part');
  const resources = [
    { id: 'ovenA', name: IVL.A, kind: 'oven' }, { id: 'ovenB', name: IVL.B, kind: 'oven' },
    { id: 'bench', name: `${C.bench}・${KIT.staff.find(x => x.kind === 'full')?.name || KIT.owner}`, kind: 'bench' },
    { id: 'fridge', name: C.fridge, kind: 'fridge' },
    { id: 'pack', name: `${C.pack}・${KIT.staff.find(x => x.kind === 'part')?.name || KIT.owner}`, kind: 'pack' },
  ];
  // 損耗原因
  const P = (i) => PRODUCTS[i % PRODUCTS.length]?.id;
  const rawA = raws[0], pk = packs[0];
  const W = {
    food: [[perish, '食材超過效期', 0.3, 1.2], [rawA, '冷藏溫度異常報廢', 0.2, 0.8], [P(0), '當日賣剩', 2, 5], [P(1), '出餐失誤重做', 1, 2], [pk, '餐盒破損', 3, 8]],
    drink: [[perish, '開封超過時限', 0.3, 1], [rawA, '品質不符（杯測未過）', 0.2, 0.6], [P(0), '試飲・品管抽樣', 1, 2], [pk, '封口不良', 3, 8], [P(1), '過期下架', 1, 2]],
    dessert: [[perish, '超過效期', 0.3, 1], [rawA, '受潮報廢', 0.2, 0.8], [P(0), '外觀瑕疵', 1, 2], [P(1), '試吃・切邊', 1, 1], [pk, '紙盒受潮', 3, 8]],
    retail: [[P(0), '運送破損', 1, 1], [P(1), '展示品折損', 1, 1], [perish, '試用品過期', 2, 5], [pk, '包材受潮', 2, 6]],
    craft: [[rawA, '裁切失誤', 0.4, 1.2], [perish, '開封過期', 20, 80], [P(0), '瑕疵重做', 1, 1], [pk, '運送壓損', 1, 3], [raws[1], '五金不良退換', 1, 3]],
    flower: [[perish, '花材垂頭枯萎', 3, 10], [raws[1] || perish, '葉材乾枯', 0.5, 1], [P(0), '未售出・拆解回收', 1, 2], [pk, '包材受潮', 3, 8]],
    service: [[perish, '開封耗材過期', 0.2, 0.5], [raws[1] || rawA, '一次性耗材汰換', 3, 8], [P(0), '重做（客人不滿意）', 1, 1], [pk, '分裝袋破損', 3, 8]],
    farm: [[perish, '採收後過熟', 0.8, 2.5], [P(0), '外觀不良（格外品）', 1, 3], [pk, '紙箱受潮', 2, 5], [P(1), '運送碰傷', 1, 2]],
  }[CAT].filter(x => x[0]).map(([o, r, lo, hi]) => [typeof o === 'string' ? o : o.id, r, lo, hi]);
  const p0 = aiP;
  const pl = perish && p0 ? (recipes[p0.id].lines.find(x => x[0] === perish.id)) : null;
  const ai = perish && pl ? { mats: [perish.id], pid: p0.id } : null;
  const take = [...raws.slice(0, 4), ...(perish && !raws.slice(0, 4).includes(perish) ? [perish] : []), ...packs.slice(0, 1)].slice(0, 6).map(m => m.id);
  const demoTake = {};
  PRODUCTS.forEach((p, i) => { demoTake[p.id] = [-1, 0, -1, 0, -2, 0][i % 6]; });
  take.forEach((id, i) => { const m = mats.find(x => x.id === id); demoTake[id] = i % 3 === 1 ? 0 : -(m.dp ? +(m.safety * 0.06).toFixed(m.dp) || 0.1 : Math.max(1, Math.round(m.safety * 0.05))); });
  const prep = p0 ? { pid: p0.id, name: `明日${shortName(p0)}備料`, rest: `${C.sFridge} → 明日` } : null;
  return { mats, vendors, recipes, steps, batch, lead, lotDef, pfx, priority, resources, rate, waste: W, ai, take, demoTake, prep,
    times: { day, pack: part ? day + H(4) : day, win: [day, day + H(9)] } };
}
const G = IS_AMEI ? null : genInventory();

export const SUPPLIERS = IS_AMEI ? A_SUPPLIERS : G.vendors;
export const MATERIALS = IS_AMEI ? A_MATERIALS : G.mats;
export const MAT = Object.fromEntries(MATERIALS.map(m => [m.id, m]));
const LOT_DEF = IS_AMEI ? A_LOT_DEF : G.lotDef;
const PFX = IS_AMEI ? A_PFX : G.pfx;
export const LABOR_RATE = IS_AMEI ? A_LABOR_RATE : G.rate;
export const RECIPES = IS_AMEI ? A_RECIPES : G.recipes;
export const LEAD = IS_AMEI ? A_LEAD : G.lead;
export const RESOURCES = IS_AMEI ? A_RESOURCES : G.resources;
export const BATCH = IS_AMEI ? A_BATCH : G.batch;
export const STEPS = IS_AMEI ? A_STEPS : G.steps;
export const PRIORITY = IS_AMEI ? A_PRIORITY : G.priority;
const TIMES = IS_AMEI ? A_TIMES : G.times;
export const DAY_START = TIMES.day, PACK_START = TIMES.pack, OVEN_WINDOW = TIMES.win;
const WASTE_REASONS = IS_AMEI ? A_WASTE_REASONS : G.waste;
// 給頁面使用的其他業主設定（阿美為 null，頁面沿用原本寫法）
export const IVX = IS_AMEI ? null : { ai: G.ai, take: G.take, demoTake: G.demoTake, prep: G.prep };
export { PRODUCTS, PRODUCT_MAP };
