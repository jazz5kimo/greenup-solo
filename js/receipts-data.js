// 拍照記帳：示範單據、會計科目、扣抵規則（所有資料皆為虛構，僅供示範）
import { mulberry32 } from './data.js';
import { FIVE_MAP } from './ledger.js';
import { TENANT } from './tenant.js';
import { IS_AMEI, CAT, FOODISH, KIT, MATERIALS } from './inventory-data.js';

export const BUYER_ID = '60512387'; // 阿美手作甜點（虛構統編）
export const MIN_PER_DOC = 6;        // 手動輸入一張單據平均 6 分鐘（估算）
export const USD_RATE = 32.0;

// 會計科目（對應產銷人發財）
export const ACCOUNTS = [
  { id: 'mat', name: '進貨－原料', five: 'prod' },
  { id: 'pack', name: '進貨－包裝材料', five: 'prod' },
  { id: 'util', name: '水電瓦斯費', five: 'prod' },
  { id: 'ship', name: '運費', five: 'sales' },
  { id: 'ad', name: '廣告費', five: 'sales' },
  { id: 'comm', name: '佣金支出（平台抽成）', five: 'sales' },
  { id: 'fuel', name: '交通費（送貨油資）', five: 'sales' },
  { id: 'park', name: '交通費（停車）', five: 'sales' },
  { id: 'rdmat', name: '研究發展費－試作材料', five: 'rd' },
  { id: 'rent', name: '租金支出', five: 'fin' },
  { id: 'tel', name: '通訊費', five: 'fin' },
  { id: 'soft', name: '軟體訂閱費', five: 'fin' },
  { id: 'misc', name: '雜項費用（文具耗材）', five: 'fin' },
  { id: 'ent', name: '交際費', five: 'fin' },
  { id: 'mgmt', name: '管理費（大樓管理費）', five: 'fin' },
  { id: 'repair', name: '修繕費（設備維修保養）', five: 'prod' },
  { id: 'post', name: '郵電費（郵資、寄件）', five: 'sales' },
  { id: 'acct', name: '記帳及申報費（記帳士）', five: 'fin' },
  { id: 'ins', name: '保險費（產險、公共意外險）', five: 'fin' },
  { id: 'tax', name: '稅捐（牌照稅、燃料費）', five: 'fin' },
  { id: 'meal', name: '伙食費（員工）', five: 'hr' },
  { id: 'clean', name: '清潔費（清潔、垃圾清運）', five: 'prod' },
  { id: 'owner', name: '業主往來（私人支出）', five: 'fin', personal: true },
];
export const ACC = Object.fromEntries(ACCOUNTS.map(a => [a.id, a]));
export const fiveOf = (acctId) => FIVE_MAP[ACC[acctId]?.five || 'fin'];

export const PAY = [
  { id: 'cash', name: '現金' },
  { id: 'bank', name: '銀行存款' },
  { id: 'card', name: '應付費用－信用卡' },
  { id: 'ap', name: '應付帳款' },
  { id: 'ar', name: '應收帳款－平台（撥款扣抵）' },
];
export const PAY_MAP = Object.fromEntries(PAY.map(p => [p.id, p]));

export const DOC = {
  einv: '電子發票證明聯',
  bill: '繳費憑證（載明統編）',
  receipt: '手寫收據',
  stmt: '平台月結單＋電子發票',
  foreign: '國外收據（英文）',
  carrier: '載具電子發票',
  photo: '照片辨識',
};

export const SRC = {
  photo: { name: '拍照', color: '#5EE0C4' },
  line: { name: 'LINE', color: '#06C755' },
  email: { name: 'Email', color: '#2E97D4' },
  carrier: { name: '載具', color: '#F0A531' },
};

// 日期：本月第 d 天（不超過今天）
const now = new Date();
const Y = now.getFullYear(), M = now.getMonth();
export const TODAY = now.getDate();
export function dayTs(d, h = 10, mi = 0) { return new Date(Y, M, Math.max(1, Math.min(d, TODAY)), h, mi).getTime(); }
// 最近一個週六（若早於本月 1 號則用週日或 1 號）
function lastWeekend() {
  const x = new Date(Y, M, TODAY, 16, 42);
  while (x.getDay() !== 6 && x.getDay() !== 0 && x.getDate() > 1) x.setDate(x.getDate() - 1);
  return x.getTime();
}
export const isWeekend = (ts) => { const g = new Date(ts).getDay(); return g === 0 || g === 6; };
export const roc = (ts) => new Date(ts).getFullYear() - 1911;

const split = (total) => { const net = Math.round(total / 1.05); return { net, tax: total - net }; };

// ---------- 六張示範收據 ----------
const A_SAMPLES = [
  {
    key: 'einv', label: '電子發票', sub: '有統編・原料', doc: 'einv', src: 'photo',
    seller: '穀豐食品原料行', taxId: '24536817', buyerId: BUYER_ID, invNo: 'QK-38472915', date: dayTs(TODAY - 2, 14, 22),
    items: '日本麵粉 25kg ×1、細砂糖 10kg ×2、杏仁粉 1kg ×1', lines: [['日本麵粉 25kg', 1, 1680], ['細砂糖 10kg', 2, 420], ['杏仁粉 1kg', 1, 630]],
    total: 3150, net: 3000, tax: 150, acct: 'mat', pay: 'bank',
    conf: { seller: 99, taxId: 99, date: 98, invNo: 99, items: 96, net: 99, tax: 99, total: 99 },
  },
  {
    key: 'hand', label: '手寫收據', sub: '無統編・水果', doc: 'receipt', src: 'photo',
    seller: '陳記水果行', taxId: '', buyerId: '', invNo: '', date: dayTs(TODAY - 3, 9, 10),
    items: '草莓 6 盒、檸檬 3 斤', total: 1800, net: 1800, tax: 0, acct: 'mat', pay: 'cash',
    conf: { seller: 91, taxId: 99, date: 86, invNo: 99, items: 82, net: 94, tax: 99, total: 95 },
  },
  {
    key: 'bill', label: '超商繳費單', sub: '電費・可扣抵', doc: 'bill', src: 'photo',
    seller: '台灣電力公司', taxId: '86517823', buyerId: BUYER_ID, invNo: 'AB-20481937', date: dayTs(TODAY - 1, 19, 8),
    items: `營業用電費（${((M + 10) % 12) + 1}/5–${M + 1}/4，兩個月）`, total: 4286, net: 4082, tax: 204, acct: 'util', pay: 'cash',
    conf: { seller: 99, taxId: 97, date: 98, invNo: 97, items: 93, net: 96, tax: 97, total: 99 },
  },
  {
    key: 'fuel', label: '加油發票', sub: '假日加油・待確認', doc: 'einv', src: 'photo',
    seller: '台灣中油 民生加油站', taxId: '31857640', buyerId: BUYER_ID, invNo: 'MZ-55028173', date: lastWeekend(),
    items: '95 無鉛汽油 30.12 公升', lines: [['95 無鉛汽油 30.12L', 1, 1000]], total: 1000, net: 952, tax: 48, acct: 'fuel', pay: 'card',
    conf: { seller: 98, taxId: 98, date: 99, invNo: 99, items: 95, net: 98, tax: 98, total: 99 }, hint: 'fuel',
  },
  {
    key: 'uber', label: 'Uber Eats 月結', sub: '平台抽成・可扣抵', doc: 'stmt', src: 'photo',
    seller: 'Uber Eats 外送平台', taxId: '54891236', buyerId: BUYER_ID, invNo: 'VB-20931846', date: dayTs(1, 9, 0),
    items: `${M === 0 ? 12 : M} 月平台服務費 30%（86 筆訂單）`, total: 12159, net: 11580, tax: 579, acct: 'comm', pay: 'ar',
    gross: 38600, orders: 86,
    conf: { seller: 99, taxId: 96, date: 99, invNo: 98, items: 94, net: 99, tax: 99, total: 99 },
  },
  {
    key: 'gads', label: 'Google Ads', sub: '國外・英文收據', doc: 'foreign', src: 'email',
    seller: 'Google Asia Pacific Pte. Ltd.', taxId: '', buyerId: '', invNo: '5148203391', date: dayTs(1, 8, 0),
    items: `Google Ads 廣告費（${M === 0 ? 12 : M} 月，USD 178.44）`, usd: 178.44, total: 5710, net: 5710, tax: 0, acct: 'ad', pay: 'card',
    conf: { seller: 99, taxId: 99, date: 99, invNo: 99, items: 92, net: 97, tax: 99, total: 97 },
  },
];

// 上傳真實照片時的模擬辨識結果（每次發票號碼不同，避免誤判重複）
let upSeq = 0;
function A_uploadResult() {
  upSeq += 1;
  return {
    key: 'upload', label: '你的照片', doc: 'photo', src: 'photo',
    seller: '日日鮮量販店', taxId: '53812046', buyerId: BUYER_ID, invNo: `XY-${String(62018845 + upSeq * 7919).padStart(8, '0')}`, date: dayTs(TODAY, 11, 5),
    items: '動物性鮮奶油 1L ×6、雞蛋 30 入 ×3', total: 1680, net: 1600, tax: 80, acct: 'mat', pay: 'cash',
    conf: { seller: 93, taxId: 90, date: 95, invNo: 88, items: 84, net: 92, tax: 92, total: 96 },
    // 照片上的欄位框（百分比，模擬）
    boxes: { seller: [18, 6, 64, 7], invNo: [22, 20, 56, 6], date: [14, 28, 48, 4.5], total: [55, 33, 34, 4.5], taxId: [14, 38, 40, 4.5], items: [10, 52, 80, 14], net: [50, 70, 40, 4.5], tax: [50, 76, 40, 4.5] },
  };
}

// ---------- 本月已收到的單據（種子） ----------
const A_SEED = [
  { d: 1, h: 9, src: 'email', doc: 'einv', seller: '綠奧智慧有限公司', taxId: '90418265', b: 1, invNo: 'RT-10293847', items: 'GreenUP 一人公司版月費', total: 1090, acct: 'soft', pay: 'card', st: 'posted' },
  { d: 1, h: 11, src: 'email', doc: 'einv', seller: 'LINE 台灣', taxId: '24410958', b: 1, invNo: 'QK-55120934', items: 'LINE 官方帳號訊息方案', total: 1197, acct: 'tel', pay: 'card', st: 'posted' },
  { d: 2, h: 10, src: 'photo', doc: 'einv', seller: '綠紙包裝設計', taxId: '42876135', b: 1, invNo: 'MZ-73319265', items: '中秋後補貨：禮盒、提袋', total: 6720, acct: 'pack', pay: 'ap', st: 'posted' },
  { d: 2, h: 16, src: 'line', doc: 'einv', seller: '北海乳品貿易', taxId: '83020471', b: 1, invNo: 'VB-48291037', items: '發酵奶油 5kg、鮮奶油 1L ×12', total: 5880, acct: 'mat', pay: 'ap', st: 'posted' },
  { d: 3, h: 8, src: 'carrier', doc: 'carrier', seller: '北海乳品貿易', taxId: '83020471', b: 1, invNo: 'VB-48291037', items: '發酵奶油 5kg、鮮奶油 1L ×12', total: 5880, acct: 'mat', pay: 'ap', st: 'dup' },
  { d: 3, h: 13, src: 'photo', doc: 'receipt', seller: '大湖果園（產地直送）', taxId: '', b: 0, invNo: '', items: '草莓 4 箱（無統編收據）', total: 3200, acct: 'mat', pay: 'cash', st: 'posted' },
  { d: 3, h: 18, src: 'email', doc: 'einv', seller: '中華電信', taxId: '96979933', b: 1, invNo: 'RT-66104821', items: '光纖網路與門號', total: 1399, acct: 'tel', pay: 'bank', st: 'posted' },
  { d: 4, h: 10, src: 'line', doc: 'einv', seller: '綠野冷鏈物流', taxId: '28715032', b: 1, invNo: 'QK-90217364', items: '冷藏宅配運費（週結）', total: 3360, acct: 'ship', pay: 'ap', st: 'posted' },
  { d: 4, h: 15, src: 'photo', doc: 'einv', seller: '好食烘焙材料行', taxId: '52637190', b: 1, invNo: 'MZ-21098456', items: '聖誕口味試作：開心果醬、可可粉', total: 1860, acct: 'rdmat', pay: 'cash', st: 'posted' },
  { d: 5, h: 12, src: 'line', doc: 'receipt', seller: '城中停車場', taxId: '', b: 0, invNo: '', items: '送貨停車費（照片模糊）', total: 120, acct: 'park', pay: 'cash', st: 'pending', note: 'AI 信心 78%，金額請確認' },
  { d: 5, h: 13, src: 'photo', doc: 'einv', seller: '文具小舖', taxId: '61209843', b: 1, invNo: 'RT-30918274', items: '標籤貼紙、收據本', total: 648, acct: 'misc', pay: 'cash', st: 'posted' },
];

export function seedList() {
  return (IS_AMEI ? A_SEED : G_SEED).map((s, i) => {
    const sp = s.doc === 'receipt' ? { net: s.total, tax: 0 } : split(s.total);
    return {
      id: 'S' + (i + 1), src: s.src, doc: s.doc, seller: s.seller, taxId: s.taxId, buyerId: s.b ? BUYER_ID : '', invNo: s.invNo,
      items: s.items, total: s.total, ...sp, acct: s.acct, pay: s.pay, status: s.st, date: dayTs(s.d, s.h, (i * 13) % 60), note: s.note || '',
    };
  });
}

// ---------- 財政部手機條碼載具：待匯入（8 張） ----------
const A_CARRIER = [
  { d: 1, h: 7, seller: '家家福超市', taxId: '27503681', b: 1, items: '雞蛋 30 入、鮮奶 2L', total: 486, acct: 'mat' },
  { d: 2, h: 20, seller: '巷口便利商店', taxId: '22555003', b: 0, items: '膠帶、影印 12 張', total: 85, acct: 'misc' },
  { d: 3, h: 12, seller: '好食光餐廳', taxId: '45109276', b: 0, items: '餐飲 6 人份', total: 3860, acct: 'ent', hint: 'meal' },
  { d: 3, h: 22, seller: '大好網購', taxId: '53094128', b: 1, items: '烘焙紙、擠花袋', total: 640, acct: 'pack' },
  { d: 4, h: 15, seller: '居家生活館', taxId: '80316495', b: 0, items: '收納盒、雙人床單', total: 1290, acct: 'misc', hint: 'home' },
  { d: 4, h: 17, seller: '綠野冷鏈物流', taxId: '28715032', b: 1, items: '冷藏宅配（臨時加寄）', total: 420, acct: 'ship' },
  { d: 5, h: 9, seller: '市府路口停車場', taxId: '38221756', b: 0, items: '停車 2 小時', total: 60, acct: 'park' },
  { d: 5, h: 10, seller: '山城農產', taxId: '70942815', b: 1, items: '大甲芋頭 10 斤、烏龍茶葉', total: 1950, acct: 'mat' },
];
export function carrierList() {
  const rng = mulberry32(5150);
  const pre = ['QK', 'RT', 'MZ', 'VB', 'XY'];
  return (IS_AMEI ? A_CARRIER : G_CARRIER).map((c, i) => {
    const sp = split(c.total);
    return {
      id: 'C' + (i + 1), src: 'carrier', doc: 'carrier', seller: c.seller, taxId: c.taxId, buyerId: c.b ? BUYER_ID : '',
      invNo: `${pre[Math.floor(rng() * 5)]}-${String(Math.floor(rng() * 1e8)).padStart(8, '0')}`,
      items: c.items, total: c.total, ...sp, acct: c.acct, pay: 'cash', date: dayTs(c.d, c.h, (i * 17) % 60), hint: c.hint || '',
      conf: 90 + Math.floor(rng() * 10),
    };
  });
}

// ---------- 月底還缺的單據 ----------
const A_MISSING = [
  { id: 'rent', who: '房東 王先生', what: `${M + 1} 月店面租金收據`, amt: 25000, why: '租金要扣繳 10%，沒有收據就沒辦法申報扣繳憑單', due: 10, contact: 'LINE' },
  { id: 'milk', who: '北海乳品貿易', what: `${M === 0 ? 12 : M} 月月結統一發票`, amt: 31500, why: '上月共進貨 6 次，月結發票還沒寄來，少了就不能扣抵進項 1,500 元', due: 10, contact: 'LINE' },
];

// ---------- 規則 ----------
export function deduct(r) {
  const a = ACC[r.acct];
  if (a?.personal) return { ok: false, amt: 0, why: '私人支出不列公司費用，也不能扣抵進項稅額。' };
  if (r.doc === 'receipt') return { ok: false, amt: 0, why: '收據不是統一發票，只能列為費用，不能扣抵進項稅額。' };
  if (r.doc === 'foreign') return { ok: false, amt: 0, why: '國外收據不是統一發票，不能扣抵進項。境外電商賣給台灣的電子勞務，營業稅由境外業者依跨境電商規定處理；公司買來專供應稅業務使用時，通常不必另外報繳（示範說明）。' };
  if (r.acct === 'ent') return { ok: false, amt: 0, why: '交際應酬用的支出，依營業稅法第 19 條不得扣抵進項稅額，只能列費用。' };
  if (!r.buyerId) return { ok: false, amt: 0, why: `結帳時沒有報公司統編，只能列費用、不能扣抵。下次結帳記得報統編 ${BUYER_ID}。` };
  if (!(r.tax > 0)) return { ok: false, amt: 0, why: '單據上沒有營業稅額。' };
  const extra = r.acct === 'fuel' ? '若是 9 人座以下自用小客車的油資則不可扣抵（第 19 條），送貨小貨車可以。' : '';
  return { ok: true, amt: r.tax, why: `${r.doc === 'bill' ? '繳費憑證' : '統一發票'}載有公司統編 ${BUYER_ID}，稅額 ${r.tax.toLocaleString()} 元可扣抵進項。${extra}` };
}

// 可能是個人支出？
export function personalCheck(r) {
  const wk = isWeekend(r.date);
  const dn = ['日', '一', '二', '三', '四', '五', '六'][new Date(r.date).getDay()];
  if (r.hint === 'fuel' || r.acct === 'fuel') {
    if (wk) return { level: 'warn', msg: `這張是星期${dn}加油。假日的油資常被國稅局追問，請確認是送貨用車，還是私人出遊。` };
  }
  if (r.hint === 'meal' || (r.acct === 'ent' && r.total > 1500)) {
    return { level: 'warn', msg: `餐飲 ${r.total.toLocaleString()} 元${wk ? `、星期${dn}` : ''}，金額偏高。若是招待客戶請保留交際費；若是家人聚餐請標記為私人支出。` };
  }
  if (r.hint === 'home') return { level: 'warn', msg: '品項有「雙人床單」，看起來像家用品。若是私人購買，請標記為私人支出，不列公司帳。' };
  return null;
}

// 入帳金額（費用科目借方）
export const bookAmt = (r) => (deduct(r).ok ? r.net : r.total);

// ───────── 其他業主：依業態大類、供應商與原料主檔產生示範單據（全部虛構） ─────────
const raws = MATERIALS.filter(m => m.cat === 'raw' && !m.forPid);
const packs = MATERIALS.filter(m => m.cat === 'pack');
const sup = KIT.suppliers;
const rawSup = sup.find(x => MATERIALS.some(m => m.vendor === x.vendor && m.cat === 'raw'))?.vendor || raws[0]?.vendor || '在地原料行（虛構）';
const rawSup2 = sup.filter(x => MATERIALS.some(m => m.vendor === x.vendor && m.cat === 'raw')).map(x => x.vendor)[1] || rawSup;
const packSup = packs[0]?.vendor || '好包裝材料行（虛構）';
const shipSup = sup.find(x => /運費|物流|宅配|配送/.test(x.item || ''))?.vendor || '綠野物流（虛構）';
const perish = MATERIALS.find(m => m.perish) || raws[0];
const mn = (m, fb) => (m ? m.name.replace(/（[^）]*）/g, '') : fb);
const r0 = (n) => Math.round(n);
const HAND = { food: ['傳統市場攤商（虛構）', '市場'], drink: ['在地小農（虛構）', '小農'], dessert: ['陳記水果行', '水果'], retail: ['手作市集攤主（虛構）', '市集'], craft: ['五金老店（虛構）', '五金'], flower: ['花農直送（虛構）', '花農'], service: ['美容材料小舖（虛構）', '材料'], farm: ['農會資材部（虛構）', '農會'] }[CAT];
const PLAT = FOODISH ? null : { seller: CAT === 'service' ? '好預約線上平台（虛構）' : '好市集電商平台（虛構）', label: CAT === 'service' ? '預約平台月結' : '電商平台月結', gross: CAT === 'service' ? '服務預約總額' : '商品銷售總額' };
export const RC = IS_AMEI ? null : { shop: TENANT.name, owner: KIT.owner, slug: KIT.slug, hand: HAND, handItems: `${mn(perish, '原料')} 6 份、${mn(raws[1] || raws[0], '耗材')} 3 份`, plat: PLAT, rawSup, rent: (TENANT.fixed && TENANT.fixed.rent) || 20000, landlord: '房東 林先生' };
function line(m, k = 1) { const q = Math.max(1, Math.round((m.pack || 1) * (m.dp ? 1 : 1))); return [`${mn(m)} ${m.dp ? `${q}${m.unit}` : `${q} ${m.unit}`}`, k, Math.max(10, Math.round(m.cost * q / 10) * 10)]; }
const G_SAMPLES = IS_AMEI ? null : (() => {
  const lm = [raws[0], raws[1] || packs[0], packs[0] || raws[0]].filter(Boolean).map((m, i) => line(m, i === 1 ? 2 : 1));
  const net = lm.reduce((a, [, q, p]) => a + q * p, 0), tax = r0(net * 0.05);
  const list = A_SAMPLES.map(x => ({ ...x, conf: { ...x.conf } }));
  const e = list.find(x => x.key === 'einv');
  Object.assign(e, { sub: '有統編・原料', seller: rawSup, items: lm.map(([n, q]) => `${n} ×${q}`).join('、'), lines: lm, net, tax, total: net + tax });
  const h = list.find(x => x.key === 'hand');
  Object.assign(h, { sub: `無統編・${HAND[1]}`, seller: HAND[0], items: RC_ITEMS() });
  const u = list.find(x => x.key === 'uber');
  if (PLAT) Object.assign(u, { label: PLAT.label, seller: PLAT.seller, items: `${new Date().getMonth() === 0 ? 12 : new Date().getMonth()} 月平台服務費 30%（86 筆訂單）` });
  return list;
})();
function RC_ITEMS() { return `${mn(perish, '原料')} 6 份、${mn(raws[1] || raws[0], '耗材')} 3 份`; }
let upSeqG = 0;
function G_uploadResult() {
  const a = A_uploadResult(); upSeqG++;
  const m1 = raws[0], m2 = packs[0] || raws[1];
  return { ...a, seller: FOODISH ? a.seller : '大好生活百貨（虛構）', items: `${mn(m1, '原料')} ×6、${mn(m2, '包材')} ×3` };
}
export const SAMPLES = IS_AMEI ? A_SAMPLES : G_SAMPLES;
export function uploadResult() { return IS_AMEI ? A_uploadResult() : G_uploadResult(); }
const rdItem = (TENANT.rd && TENANT.rd[0] && TENANT.rd[0][1]) || '新品試作材料';
const G_SEED = IS_AMEI ? null : A_SEED.map((x, i) => {
  if (i === 2) return { ...x, seller: packSup, items: `${packs.slice(0, 2).map(m => mn(m)).join('、') || '包裝材料'}補貨` };
  if (i === 3 || i === 4) return { ...x, seller: rawSup2, items: `${mn(raws[1] || raws[0])}、${mn(raws[0])}` };
  if (i === 5) return { ...x, seller: `${HAND[0].replace('（虛構）', '')}（產地直送・虛構）`, items: `${mn(perish)}（無統編收據）` };
  if (i === 7) return { ...x, seller: shipSup, items: '宅配運費（週結）' };
  if (i === 8) return { ...x, seller: '好材料行（虛構）', items: `${rdItem}：試作材料` };
  if (i === 9) return { ...x, items: '送貨停車費（照片模糊）' };
  return x;
});
const G_CARRIER = IS_AMEI ? null : A_CARRIER.map((x, i) => {
  if (i === 0) return { ...x, items: `${mn(perish)}、${mn(raws[0])}` };
  if (i === 3) return { ...x, items: `${packs.map(m => mn(m)).slice(0, 2).join('、') || '包裝耗材'}` };
  if (i === 5) return { ...x, seller: shipSup, items: '宅配（臨時加寄）' };
  if (i === 7) return { ...x, seller: rawSup, items: `${mn(raws[0])}、${mn(raws[1] || raws[0])}` };
  return x;
});
export const MISSING = IS_AMEI ? A_MISSING : [
  { ...A_MISSING[0], who: RC.landlord, amt: RC.rent },
  { ...A_MISSING[1], who: rawSup2, why: `上月共進貨 6 次，月結發票還沒寄來，少了就不能扣抵進項 ${Math.round(31500 / 21).toLocaleString()} 元` },
];
