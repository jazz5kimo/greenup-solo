// 庫存與生產：原料、批號效期、配方 BOM、生產排程、損耗紀錄（全部為示範用模擬資料）
import { PRODUCTS, PRODUCT_MAP, mulberry32, startOfDay, addDays } from './data.js';

// 供應商（名稱與 data.js 進貨資料一致）
export const SUPPLIERS = {
  '穀豐食品原料行': { lead: 1, line: '@gufeng-food', short: '穀豐', color: '#F0A531' },
  '北海乳品貿易': { lead: 1, line: '@hokkai-dairy', short: '北海', color: '#2E97D4' },
  '大湖果園合作社': { lead: 1, line: '@dahu-farm', short: '大湖', color: '#EC6A55' },
  '綠紙包裝設計': { lead: 3, line: '@greenpaper', short: '綠紙', color: '#5EE0C4' },
  '山城農產': { lead: 2, line: '@shancheng-agri', short: '山城', color: '#7C62E6' },
};

// 原料／包材主檔：cost 單位成本（未稅）、safety 安全存量、pack 進貨包裝量
export const MATERIALS = [
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
export const MAT = Object.fromEntries(MATERIALS.map(m => [m.id, m]));

// 每項原料的批號：[天數(入庫，負數＝幾天前), 效期(距今天數), 數量]
const LOT_DEF = {
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

const PFX = { flour: 'FL', sugar: 'SG', pinefill: 'PF', butter: 'BT', cream: 'CR', cheese: 'CC', milk: 'MK', strawberry: 'SB', lemon: 'LM', taro: 'TR', oolong: 'OL', earlgrey: 'EG', nuts: 'NT', egg: 'EC', giftbox: 'GB', cakebox: 'CB', bag: 'BG' };

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
export const LABOR_RATE = 3.2; // 每分鐘人工成本（小芸月薪＋勞健保勞退攤提）
export const RECIPES = {
  lemon: { lines: [['flour', 0.12], ['butter', 0.07], ['sugar', 0.08], ['egg', 3], ['lemon', 0.15], ['cream', 0.05], ['cakebox', 1]], labor: 9, mfg: 5, oven: 25, note: '塔殼盲烤 170°C 25 分 → 檸檬凝乳填餡 → 冷藏 2 小時' },
  roll: { lines: [['flour', 0.06], ['egg', 5], ['sugar', 0.07], ['cream', 0.25], ['milk', 0.05], ['strawberry', 0.12], ['cakebox', 1]], labor: 12, mfg: 11, oven: 15, note: '戚風蛋糕體 180°C 15 分 → 冷卻 → 生乳餡捲製 → 冷藏定型 3 小時' },
  basque: { lines: [['cheese', 0.25], ['taro', 0.2], ['egg', 4], ['cream', 0.1], ['sugar', 0.08], ['cakebox', 1]], labor: 10, mfg: 22, oven: 35, note: '芋泥＋乳酪糊 → 230°C 高溫烘烤 35 分 → 冷藏一夜定型' },
  pound: { lines: [['flour', 0.1], ['butter', 0.09], ['sugar', 0.08], ['egg', 2], ['oolong', 0.006], ['bag', 1]], labor: 6, mfg: 9, oven: 50, note: '烏龍茶粉打入奶油 → 170°C 50 分 → 刷茶酒糖液' },
  cookie: { lines: [['flour', 0.2], ['butter', 0.1], ['sugar', 0.07], ['egg', 1], ['nuts', 0.06], ['giftbox', 1]], labor: 5, mfg: 12, oven: 20, note: '冰箱餅乾麵團切片 → 165°C 20 分 → 冷卻裝盒' },
  pineapple: { lines: [['flour', 0.15], ['butter', 0.08], ['pinefill', 0.25], ['egg', 1], ['sugar', 0.02], ['giftbox', 1]], labor: 4, mfg: 5, oven: 25, note: '土鳳梨餡包入酥皮 → 模壓 → 180°C 正反面各烤' },
  canele: { lines: [['milk', 0.25], ['flour', 0.06], ['sugar', 0.12], ['egg', 3], ['butter', 0.03], ['earlgrey', 0.004], ['cakebox', 1]], labor: 8, mfg: 17, oven: 60, note: '伯爵茶麵糊冷藏熟成 24 小時 → 銅模 220°C→180°C 60 分' },
};

export function bom(pid) {
  const r = RECIPES[pid];
  const rows = r.lines.map(([mid, qty]) => { const m = MAT[mid]; return { mid, name: m.name, unit: m.unit, qty, price: m.cost, sub: +(qty * m.cost).toFixed(1), cat: m.cat, dp: m.dp }; });
  const raw = rows.filter(x => x.cat === 'raw').reduce((s, x) => s + x.sub, 0);
  const pack = rows.filter(x => x.cat === 'pack').reduce((s, x) => s + x.sub, 0);
  const labor = r.labor * LABOR_RATE;
  const total = raw + pack + labor + r.mfg;
  return { rows, raw, pack, labor, mfg: r.mfg, total, note: r.note, laborMin: r.labor, oven: r.oven, ref: PRODUCT_MAP[pid].cost };
}

// 成品：生產前置天數（含冷藏定型、熟成）
export const LEAD = { lemon: 1, roll: 1, basque: 1, pound: 1, cookie: 2, pineapple: 2, canele: 2 };

// 今日生產排程：資源與各商品的製程範本（d＝分鐘；oven 步驟依整爐數拆成多爐）
export const RESOURCES = [
  { id: 'ovenA', name: '旋風烤箱 A', kind: 'oven' },
  { id: 'ovenB', name: '層爐 B', kind: 'oven' },
  { id: 'bench', name: '工作台・小芸', kind: 'bench' },
  { id: 'fridge', name: '冷藏櫃', kind: 'fridge' },
  { id: 'pack', name: '包裝・小傑', kind: 'pack' },
];
export const BATCH = { lemon: 6, roll: 5, basque: 6, pound: 6, cookie: 8, pineapple: 8, canele: 3 }; // 每爐可烤數量
export const STEPS = {
  canele: [['bench', '麵糊入銅模', 20], ['oven', '烘烤 220→180°C', 60], ['pack', '脫模裝盒', 20]],
  roll: [['bench', '蛋糕體打發', 35], ['oven', '蛋糕體烘烤', 15], ['fridge', '蛋糕體冷卻', 40], ['bench', '生乳餡捲製組裝', 45], ['fridge', '冷藏定型', 180], ['pack', '裝盒貼標', 25]],
  basque: [['bench', '芋泥・乳酪糊', 40], ['oven', '230°C 高溫烘烤', 35], ['fridge', '冷藏定型', 300]],
  lemon: [['bench', '塔皮入模', 35], ['oven', '塔殼盲烤', 25], ['bench', '檸檬凝乳填餡', 40], ['fridge', '冷藏', 120], ['pack', '裝盒', 20]],
  pineapple: [['bench', '包餡・模壓', 50], ['oven', '正反面烘烤', 30], ['pack', '禮盒包裝', 40]],
  cookie: [['bench', '麵團切片', 30], ['oven', '烘烤', 20], ['pack', '冷卻裝盒', 40]],
  pound: [['bench', '烏龍茶麵糊', 30], ['oven', '烘烤', 50], ['bench', '刷茶酒糖液', 15], ['pack', '封袋貼標', 30]],
};
export const PRIORITY = ['canele', 'roll', 'basque', 'lemon', 'pineapple', 'cookie', 'pound'];
export const H = (h, m = 0) => h * 60 + m;
export const DAY_START = H(7), PACK_START = H(12), OVEN_WINDOW = [H(7), H(16)];

// 損耗紀錄（近 8 週，固定種子）
const WASTE_REASONS = [
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
      const unit = isP ? PRODUCT_MAP[id].unit.replace(/^[\d ]+/, '') || '個' : MAT[id].unit;
      const qty = isP || MAT[id].dp === 0 ? Math.round(lo + rng() * (hi - lo)) : +(lo + rng() * (hi - lo)).toFixed(1);
      const cost = isP ? PRODUCT_MAP[id].cost : MAT[id].cost;
      const ts = new Date(day); ts.setHours(9 + Math.floor(rng() * 9), Math.floor(rng() * 60));
      list.push({ ts: +ts, id, name: isP ? PRODUCT_MAP[id].name : MAT[id].name, unit: isP ? '個' : unit, qty, amt: Math.round(qty * cost), reason, kind: isP ? '成品' : '原料' });
    }
  }
  return list.filter(x => x.ts <= +now).sort((a, b) => b.ts - a.ts);
}

export { PRODUCTS, PRODUCT_MAP };
