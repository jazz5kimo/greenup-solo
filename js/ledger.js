// 會計引擎：把訂單、進貨與固定費用整理成「產銷人發財」帳務、損益表、資產負債表與稅務試算
// 所有金額皆為模擬資料，費率依 115 年（2026）公告值簡化，僅供示範。
import { store } from './state.js';
import { PRODUCT_MAP, CHANNELS, PRODUCTS } from './data.js';
import { TENANT } from './tenant.js';

export const FIVE = [
  { id: 'prod', k: '產', name: '生產管理', desc: '原料進貨、包材、製造費用、存貨', color: '#2DB674', icon: 'factory' },
  { id: 'sales', k: '銷', name: '行銷管理', desc: '銷貨收入、通路、廣告、運費、金流', color: '#F0A531', icon: 'trend' },
  { id: 'hr', k: '人', name: '人力資源', desc: '薪資、勞健保、勞退、扣繳', color: '#2E97D4', icon: 'users' },
  { id: 'rd', k: '發', name: '研究發展', desc: '新品試作、設計、檢驗、進修', color: '#7C62E6', icon: 'flask' },
  { id: 'fin', k: '財', name: '財務管理', desc: '損益、資產負債、現金流、稅務', color: '#EC6A55', icon: 'bank' },
];
export const FIVE_MAP = Object.fromEntries(FIVE.map(f => [f.id, f]));

// 115 年費率（簡化）
export const RATES = {
  vat: 0.05, cit: 0.20, citExempt: 120000, undistributed: 0.05,
  laborIns: 0.125, laborEmployer: 0.7, occ: 0.0021, healthIns: 0.0517, healthEmployer: 0.6, healthDep: 1.56,
  pension: 0.06, nhiSupp: 0.0211, rentWithhold: 0.10, minWage: 29500, minHourly: 196,
};

// 人員：依目前業主（tenant.js PROFILES）
export const STAFF = TENANT.staff;
export function payrollRow(s) {
  if (s.kind === 'owner') return { ...s, labor: 0, health: 0, pension: 0, employer: 0, withhold: 0, cost: s.pay, emp: { labor: 0, health: 0 }, note: '負責人以雇主身分自行投保；未達起扣標準免扣繳' };
  const labor = Math.round(s.level * RATES.laborIns * RATES.laborEmployer + s.level * RATES.occ);
  const health = Math.round(s.level * RATES.healthIns * RATES.healthEmployer * RATES.healthDep);
  const pension = Math.round(s.level * RATES.pension);
  const emp = { labor: Math.round(s.level * RATES.laborIns * 0.2), health: Math.round(s.level * RATES.healthIns * 0.3) };
  return { ...s, labor, health, pension, employer: labor + health + pension, withhold: 0, cost: s.pay + labor + health + pension, emp, note: s.kind === 'part' ? `時薪 ${s.hourly} × ${s.hours} 小時（基本時薪 ${RATES.minHourly}）` : `月薪（基本工資 ${RATES.minWage.toLocaleString()}）` };
}
export const PAYROLL = () => STAFF.map(payrollRow);

// 每月固定費用範本：[五管, 會計科目, 摘要, 對象, 未稅金額, 憑證, 日, 損益分類]
// 損益分類：mfg 製造費用（併入營業成本）、sell 推銷費用、admin 管理費用、rd 研究發展費用
const AMEI_FIXED = [
  ['prod', '水電瓦斯費', '烤箱、冷藏設備水電瓦斯', '台電／自來水／欣欣瓦斯', 7430, '電子發票', 6, 'mfg'],
  ['prod', '折舊', '烘焙設備折舊（成本 18 萬，耐用 5 年）', '系統自動提列', 3000, '內部憑證', 28, 'mfg'],
  ['prod', '清潔消毒費', '廚房清潔與病媒防治', '淨美環境衛生', 1140, '電子發票', 12, 'mfg'],
  ['sales', '廣告費', 'Instagram／Facebook 廣告', 'Meta Platforms', 11430, '電子發票', 3, 'sell'],
  ['sales', '廣告費', '關鍵字廣告', 'Google Asia Pacific', 5710, '電子發票', 3, 'sell'],
  ['sales', '通訊費', 'LINE 官方帳號訊息方案', 'LINE 台灣', 1140, '電子發票', 1, 'sell'],
  ['sales', '租金支出', '假日市集攤位費', '華山文創市集', 3000, '收據', 14, 'sell'],
  ['fin', '租金支出', '店面租金（個人房東，扣繳 10%）', '房東 王＊＊', 25000, '租賃契約＋扣繳', 1, 'admin'],
  ['fin', '通訊費', '光纖網路與門號', '中華電信', 1332, '電子發票', 5, 'admin'],
  ['fin', '軟體訂閱費', 'GreenUP 一人公司版月費', '綠奧智慧有限公司', 1038, '電子發票', 1, 'admin'],
  ['fin', '保險費', '公共意外責任險與火險（月攤）', '富邦產險', 1250, '電子發票', 1, 'admin'],
  ['fin', '交際費', '客戶伴手禮', '自家商品領用', 1800, '內部憑證', 18, 'admin'],
  ['fin', '雜項費用', '文具與辦公耗材', '誠品文具', 648, '電子發票', 21, 'admin'],
  ['fin', '手續費', '跨行匯款手續費', '玉山銀行', 210, '銀行單據', 25, 'admin'],
  // 以下為一人公司常見的其他固定費用
  ['prod', '清潔費', '商業垃圾清運', '清運公司（示範）', 800, '電子發票', 10, 'mfg'],
  ['prod', '修繕費', '烤箱、冷藏設備保養維修', '設備維修行（示範）', 1500, '電子發票', 15, 'mfg'],
  ['sales', '佣金支出', '線上賣場成交手續費（示範）', '電商平台', 2600, '電子發票', 27, 'sell'],
  ['sales', '交通費', '送貨油資（機車、小貨車）', '加油站', 2400, '電子發票', 20, 'sell'],
  ['sales', '交通費', '送貨停車費', '停車場', 600, '收據', 20, 'sell'],
  ['sales', '郵電費', '郵資與包裹寄件', '中華郵政', 480, '收據', 8, 'sell'],
  ['fin', '租金支出', 'POS 刷卡機月租', '綠界科技（示範）', 500, '電子發票', 1, 'admin'],
  ['fin', '租金支出', '倉儲租金（迷你倉）', '迷你倉（示範）', 3500, '電子發票', 1, 'admin'],
  ['fin', '管理費', '大樓管理費', '管理委員會', 1800, '收據', 5, 'admin'],
  ['fin', '記帳及申報費', '記帳士月費（記帳、營業稅申報）', '林雅婷記帳士事務所（示範）', 2500, '電子發票', 10, 'admin'],
  ['fin', '軟體訂閱費', '網域與雲端主機', '網域主機商（示範）', 400, '電子發票', 1, 'admin'],
  ['fin', '稅捐', '小貨車牌照稅與燃料費（月攤）', '監理所', 1100, '繳款單', 28, 'admin'],
  ['hr', '伙食費', '員工伙食費（小芸、小傑；免稅額度內，以主管機關公告為準）', '自家供餐', 4500, '內部憑證', 28, 'admin'],
  ['hr', '保險費－勞健保', '負責人勞健保（雇主身分投保；示範，以勞保局、健保署公告為準）', '勞保局／健保署', 6090, '繳款單', 28, 'admin'],
];
// 其他業主：依業主設定產生同一套固定費用科目（金額與對象不同）
function tenantFixed(f) {
  const emps = STAFF.filter(x => x.kind !== 'owner'), owner = STAFF.find(x => x.kind === 'owner');
  const isFood = ['food', 'drink', 'dessert'].includes(TENANT.cat), isService = TENANT.cat === 'service';
  return [
    ['prod', '水電瓦斯費', '營業場所水電瓦斯', '台電／自來水公司', f.utility, '電子發票', 6, 'mfg'],
    ['prod', '折舊', `${f.equip}折舊`, '系統自動提列', f.depreciation, '內部憑證', 28, 'mfg'],
    ['sales', '廣告費', 'Instagram／Facebook 廣告', 'Meta Platforms', Math.round(f.ads * 0.65), '電子發票', 3, 'sell'],
    ['sales', '廣告費', '關鍵字廣告', 'Google Asia Pacific', Math.round(f.ads * 0.35), '電子發票', 3, 'sell'],
    ['sales', '通訊費', 'LINE 官方帳號訊息方案', 'LINE 台灣', 1140, '電子發票', 1, 'sell'],
    ['fin', '租金支出', '營業場所租金（個人房東，扣繳 10%）', '房東（示範）', f.rent, '租賃契約＋扣繳', 1, 'admin'],
    ['fin', '通訊費', '光纖網路與門號', '電信公司（示範）', 1332, '電子發票', 5, 'admin'],
    ['fin', '軟體訂閱費', 'GreenUP 一人公司版月費', '綠奧智慧有限公司', 1038, '電子發票', 1, 'admin'],
    ['fin', '保險費', '公共意外責任險與火險（月攤）', '產險公司（示範）', 1100, '電子發票', 1, 'admin'],
    ['fin', '雜項費用', '文具與辦公耗材', '文具店（示範）', 560, '電子發票', 21, 'admin'],
    ['fin', '手續費', '跨行匯款手續費', '往來銀行', 180, '銀行單據', 25, 'admin'],
    // 以下為一人公司常見的其他固定費用（金額依業主規模推估，示範）
    ['prod', '修繕費', `${f.equip}保養維修`, '設備維修行（示範）', Math.max(400, Math.round(f.depreciation * 0.4 / 100) * 100), '電子發票', 15, 'mfg'],
    ...(isFood ? [['prod', '清潔費', '商業垃圾清運', '清運公司（示範）', 800, '電子發票', 10, 'mfg']] : []),
    ...(isService
      ? [['sales', '佣金支出', '預約平台手續費（示範）', '預約平台', Math.max(600, Math.round(f.ads * 0.2 / 100) * 100), '電子發票', 27, 'sell']]
      : [['sales', '佣金支出', '線上賣場成交手續費（示範）', '電商平台', Math.max(600, Math.round(f.ads * 0.25 / 100) * 100), '電子發票', 27, 'sell'],
        ['sales', '交通費', '送貨油資', '加油站', Math.max(800, Math.round(f.ads * 0.2 / 100) * 100), '電子發票', 20, 'sell'],
        ['sales', '郵電費', '郵資與包裹寄件', '中華郵政', 400, '收據', 8, 'sell']]),
    ['fin', '租金支出', 'POS 刷卡機月租', '金流公司（示範）', 500, '電子發票', 1, 'admin'],
    ['fin', '管理費', '大樓管理費', '管理委員會', Math.max(500, Math.round(f.rent * 0.07 / 100) * 100), '收據', 5, 'admin'],
    ['fin', '記帳及申報費', '記帳士月費（記帳、營業稅申報）', '記帳士事務所（示範）', 2000, '電子發票', 10, 'admin'],
    ['fin', '軟體訂閱費', '網域與雲端主機', '網域主機商（示範）', 400, '電子發票', 1, 'admin'],
    ['fin', '稅捐', '營業用車牌照稅與燃料費（月攤）', '監理所', 900, '繳款單', 28, 'admin'],
    ...(emps.length ? [['hr', '伙食費', `員工伙食費（${emps.map(e => e.name).join('、')}；免稅額度內，以主管機關公告為準）`, '自家供餐', emps.reduce((a, e) => a + (e.kind === 'full' ? 3000 : 1500), 0), '內部憑證', 28, 'admin']] : []),
    ...(owner ? [['hr', '保險費－勞健保', `負責人勞健保（雇主身分投保；示範，以勞保局、健保署公告為準）`, '勞保局／健保署', Math.round(owner.pay * 0.1 / 10) * 10, '繳款單', 28, 'admin']] : []),
  ];
}
const FIXED = TENANT.fixed ? tenantFixed(TENANT.fixed) : AMEI_FIXED;
// 研發費用（依月份不同）
const AMEI_RD = {
  7: [['新品試作材料', '柚子乳酪塔配方試作 2 回', '自家採購', 2860, '電子發票', 16], ['訓練費', '法式甜點進修課程', '好食烘焙教室', 4570, '電子發票', 22]],
  8: [['新品試作材料', '減糖烏龍磅蛋糕配方 3 回', '自家採購', 3620, '電子發票', 9], ['訓練費', '食品標示法規線上課', '食品工業發展研究所', 2400, '收據', 19], ['設計費', '中秋禮盒包裝打樣', '綠紙包裝設計', 6190, '電子發票', 26]],
  9: [['新品試作材料', '柚子乳酪塔量產前試作', '自家採購', 5240, '電子發票', 4], ['檢驗費', '營養標示與保存期限檢驗', 'SGS 台灣檢驗科技', 6500, '電子發票', 11], ['設計費', '新品包裝與品牌插畫', '自由接案設計師（扣繳 10%）', 12000, '勞務報酬單', 23]],
  10: [['新品試作材料', '聖誕限定口味試作', '自家採購', 1860, '電子發票', 3]],
};
const RD = TENANT.rd ? new Proxy({}, { get: () => TENANT.rd }) : AMEI_RD;
const AMEI_RD_PROJECTS = [
  { name: '柚子乳酪塔', stage: '量產前試作', pct: 82, color: '#F4D35E', note: '已完成營養標示檢驗，預計 11 月上架' },
  { name: '減糖烏龍磅蛋糕', stage: '口味測試', pct: 55, color: '#C9935A', note: '糖量降 30%，AI 彙整 42 則顧客回饋' },
  { name: '聖誕限定禮盒', stage: '配方開發', pct: 24, color: '#EC6A55', note: '包裝設計已委外，預計 12 月預購' },
];

export const RD_PROJECTS = TENANT.rd ? TENANT.rd.map(([, item], k) => ({ name: item, stage: ['進行中', '測試中', '規劃中'][k % 3], pct: [68, 40, 20][k % 3], color: ['#2DB674', '#F0A531', '#7C62E6'][k % 3], note: '示範研發專案' })) : AMEI_RD_PROJECTS;

const MATERIAL_ACCT = { '日本麵粉、砂糖': '原料', '發酵奶油、鮮奶油': '原料', '當季水果（草莓、檸檬）': '原料', '芋頭、茶葉、堅果': '原料', '禮盒包材、提袋': '包裝材料', '冷藏宅配運費': '運費' };

const r0 = (n) => Math.round(n);
export function monthList(now = new Date()) {
  const out = [];
  for (let k = 2; k >= 0; k--) { const d = new Date(now.getFullYear(), now.getMonth() - k, 1); out.push({ y: d.getFullYear(), m: d.getMonth() + 1, label: `${d.getMonth() + 1} 月${k === 0 ? '（至今）' : ''}`, current: k === 0 }); }
  return out;
}

const cache = new Map();
store.on && store.on('order', () => cache.clear());
store.on && store.on('order-updated', () => cache.clear());
store.on && store.on('reset', () => cache.clear());

export function month(y, m) {
  const key = `${y}-${m}`;
  if (cache.has(key)) return cache.get(key);
  const now = new Date();
  const start = new Date(y, m - 1, 1), end = new Date(y, m, 1);
  const dim = new Date(y, m, 0).getDate();
  const current = now >= start && now < end;
  const elapsed = current ? Math.max(1, now.getDate()) : dim;
  const factor = elapsed / dim;
  const at = (day) => new Date(y, m - 1, Math.min(day, elapsed), 10).getTime();

  // 銷
  const orders = store.ordersBetween(start, end);
  const net = store.sum(orders, 'net'), tax = store.sum(orders, 'tax'), total = store.sum(orders, 'total');
  const card = orders.filter(o => o.payment !== '現金').reduce((s, o) => s + o.total, 0);
  const ar = orders.filter(o => o.status === 'pending');
  const byCh = CHANNELS.map(c => ({ ...c, value: orders.filter(o => o.channel === c.id).reduce((s, o) => s + o.net, 0) })).filter(c => c.value);
  const prodQty = {}, prodRev = {}, prodCost = {};
  for (const o of orders) for (const it of o.items) {
    prodQty[it.pid] = (prodQty[it.pid] || 0) + it.qty;
    prodRev[it.pid] = (prodRev[it.pid] || 0) + it.price * it.qty / 1.05;
    prodCost[it.pid] = (prodCost[it.pid] || 0) + (PRODUCT_MAP[it.pid]?.cost || 0) * it.qty;
  }
  const byProd = PRODUCTS.map(p => ({ id: p.id, name: p.name, color: p.color, qty: prodQty[p.id] || 0, rev: r0(prodRev[p.id] || 0), cost: prodCost[p.id] || 0 }));
  const cogs = byProd.reduce((s, p) => s + p.cost, 0);

  const entries = [];
  // 收入（每日彙總）
  const days = {};
  for (const o of orders) { const d = new Date(o.ts).getDate(); (days[d] ||= { n: 0, net: 0, tax: 0, ts: o.ts }); days[d].n++; days[d].net += o.net; days[d].tax += o.tax; days[d].ts = Math.max(days[d].ts, o.ts); }
  for (const [d, v] of Object.entries(days)) entries.push({ ts: v.ts, type: 'in', five: 'sales', acct: '銷貨收入', item: `全通路銷貨（電子發票 ${v.n} 張）`, vendor: '門市＋LINE＋官網＋電話等', net: v.net, tax: v.tax, doc: '電子發票', pl: 'rev', conf: 100 });
  // 產：進貨
  for (const p of store.purchases.filter(x => x.ts >= +start && x.ts < +end)) {
    const acct = MATERIAL_ACCT[p.item] || (/運費|物流|配送/.test(p.item) ? '運費' : /包|袋|盒|瓶|標籤|材料行/.test(p.item + p.vendor) ? '包裝材料' : '原料');
    const five = acct === '運費' ? 'sales' : 'prod';
    entries.push({ ts: p.ts, type: 'out', five, acct: acct === '運費' ? '運費' : `進貨－${acct}`, item: p.item, vendor: p.vendor, net: p.net, tax: p.tax, doc: `電子發票 ${p.invoice}`, pl: acct === '運費' ? 'sell' : 'inv', conf: 97 + (p.net % 3) });
  }
  // 固定費用
  for (const [five, acct, item, vendor, amt, doc, day, pl] of FIXED) {
    const n = r0(amt * factor);
    const taxed = /發票/.test(doc);
    entries.push({ ts: at(day), type: 'out', five, acct, item: item + (current && factor < 1 ? '（估列至今）' : ''), vendor, net: n, tax: taxed ? r0(n * 0.05) : 0, doc, pl, conf: 95 + (amt % 5) });
  }
  // 金流手續費
  const fee = r0(card * 0.024 / 1.05);
  entries.push({ ts: at(dim), type: 'out', five: 'sales', acct: '手續費', item: '信用卡、行動支付金流手續費（2.4%）', vendor: '綠界科技／LINE Pay', net: fee, tax: r0(fee * 0.05), doc: '電子發票', pl: 'sell', conf: 99 });
  // 研發
  for (const [acct, item, vendor, amt, doc, day] of RD[m] || []) {
    if (current && day > elapsed) continue;
    entries.push({ ts: at(day), type: 'out', five: 'rd', acct: `研究發展費－${acct}`, item, vendor, net: amt, tax: /發票/.test(doc) ? r0(amt * 0.05) : 0, doc, pl: 'rd', conf: 92 + (amt % 7) });
  }
  // 人：薪資
  const payroll = PAYROLL();
  for (const s of payroll) {
    entries.push({ ts: at(dim), type: 'out', five: 'hr', acct: s.kind === 'owner' ? '薪資支出－董事酬勞' : '薪資支出', item: `${s.name}｜${s.title}${current && factor < 1 ? '（估列至今）' : ''}`, vendor: '薪資轉帳', net: r0(s.pay * factor), tax: 0, doc: '薪資單', pl: 'admin', conf: 100 });
    if (s.employer) {
      entries.push({ ts: at(dim), type: 'out', five: 'hr', acct: '保險費－勞健保', item: `${s.name} 勞保、健保雇主負擔`, vendor: '勞保局／健保署', net: r0((s.labor + s.health) * factor), tax: 0, doc: '繳款單', pl: 'admin', conf: 100 });
      entries.push({ ts: at(dim), type: 'out', five: 'hr', acct: '退休金', item: `${s.name} 勞退提繳 6%`, vendor: '勞保局', net: r0(s.pension * factor), tax: 0, doc: '繳款單', pl: 'admin', conf: 100 });
    }
  }
  // 營業外收入
  entries.push({ ts: at(dim), type: 'in', five: 'fin', acct: '利息收入', item: '活期存款利息', vendor: '玉山銀行', net: current ? 0 : 86, tax: 0, doc: '存摺', pl: 'other', conf: 100 });

  const visible = entries.filter(e => e.net > 0 && e.ts <= now.getTime() + 864e5).sort((a, b) => b.ts - a.ts);
  const sumPl = (k) => visible.filter(e => e.pl === k).reduce((s, e) => s + e.net, 0);
  const mfg = sumPl('mfg'), sell = sumPl('sell'), admin = sumPl('admin'), rd = sumPl('rd'), other = sumPl('other');
  const purchases = sumPl('inv');
  const opex = sell + admin + rd;
  const cost = cogs + mfg;
  const gross = net - cost, opInc = gross - opex, pretax = opInc + other;
  const byFive = FIVE.map(f => ({ ...f, value: f.id === 'prod' ? cost : visible.filter(e => e.type === 'out' && e.five === f.id && e.pl !== 'inv').reduce((s, e) => s + e.net, 0) }));
  const inTax = visible.filter(e => e.type === 'out').reduce((s, e) => s + e.tax, 0);
  const res = {
    y, m, start, end, dim, elapsed, current, factor, label: `${m} 月`,
    orders, net, tax, total, card, ar: store.sum(ar), arN: ar.length, byCh, byProd, cogs, mfg, sell, admin, rd, other, purchases,
    cost, gross, opex, opInc, pretax, margin: net ? gross / net : 0, netMargin: net ? pretax / net : 0,
    entries: visible, byFive, payroll, inTax, fee,
    wage: payroll.reduce((s, p) => s + p.pay, 0) * factor, employer: payroll.reduce((s, p) => s + p.employer, 0) * factor,
  };
  cache.set(key, res);
  return res;
}

// 資產負債表與現金流（月底，或今日）
export function position(y, m) {
  const list = monthList();
  const idx = list.findIndex(x => x.y === y && x.m === m);
  let cash = 420000;
  const flows = [];
  for (let i = 0; i <= idx; i++) {
    const d = month(list[i].y, list[i].m);
    const open = cash;
    const receipts = d.orders.filter(o => o.status === 'paid').reduce((s, o) => s + o.total, 0) + d.other;
    const buy = d.entries.filter(e => e.pl === 'inv').reduce((s, e) => s + e.net + e.tax, 0);
    const exp = d.entries.filter(e => e.type === 'out' && e.pl !== 'inv' && e.five !== 'hr' && e.acct !== '折舊').reduce((s, e) => s + e.net + e.tax, 0);
    const hr = d.entries.filter(e => e.five === 'hr').reduce((s, e) => s + e.net, 0);
    // 單月繳納前一期（兩個月）營業稅
    let vat = 0;
    if (d.m % 2 === 1) { const a = month(d.y, d.m - 2), b = month(d.y, d.m - 1); vat = Math.max(0, a.tax + b.tax - a.inTax - b.inTax); }
    cash = open + receipts - buy - exp - hr - vat;
    flows.push({ m: d.m, open, receipts, buy, exp, hr, vat, close: cash });
  }
  const d = month(y, m);
  const inv = store.inventory().reduce((s, p) => s + p.current * p.cost, 0) + 52000;
  const equipCost = 180000, accDep = 3000 * (d.current ? m - 1 : m);
  const assets = [
    ['現金及約當現金', r0(cash)], ['應收帳款', d.ar], ['存貨（成品＋原料）', inv], ['生財設備（淨額）', equipCost - accDep],
  ];
  const vatAcc = r0((m % 2 === 0 ? month(y, m - 1).tax + d.tax - month(y, m - 1).inTax - d.inTax : d.tax - d.inTax));
  const liab = [
    ['應付薪資', r0(d.payroll.reduce((s, p) => s + p.pay - p.emp.labor - p.emp.health, 0) * d.factor)],
    ['應付營業稅', Math.max(0, vatAcc)],
    ['代扣款項（扣繳稅款、補充保費）', r0((2500 + 528) * d.factor) + (m === 9 ? 1200 : 0)],
    ['應付帳款', r0(d.purchases * 0.18)],
  ];
  const A = assets.reduce((s, x) => s + x[1], 0), L = liab.reduce((s, x) => s + x[1], 0);
  const capital = 500000;
  const equity = [['股本（實收資本）', capital], ['保留盈餘及本期損益', A - L - capital]];
  return { assets, liab, equity, A, L, E: A - L, flows, flow: flows[flows.length - 1] };
}

// 年度營利事業所得稅試算（依近兩個完整月推估全年）
export function annualEstimate() {
  const list = monthList();
  const full = list.filter(x => !x.current).slice(-2).map(x => month(x.y, x.m));
  const avg = (k) => full.reduce((s, d) => s + d[k], 0) / full.length;
  const rev = r0(avg('net') * 12), cost = r0(avg('cost') * 12), opex = r0(avg('opex') * 12), other = r0(avg('other') * 12);
  const entertain = 1800 * 12;
  const entertainLimit = r0(Math.min(rev, 30e6) * 0.0045 + 0);
  const income = rev - cost - opex + other;
  let tax = 0;
  if (income > RATES.citExempt) tax = Math.min(r0(income * RATES.cit), r0((income - RATES.citExempt) / 2));
  return { rev, cost, opex, other, income, tax, entertain, entertainLimit, prepay: 0, undistributed: r0(Math.max(0, income - tax) * RATES.undistributed) };
}

// 扣繳與二代健保（月）
export function withholdings(d) {
  const rent = TENANT.fixed?.rent || 25000;
  const owner = STAFF.find(x => x.kind === 'owner');
  const emps = STAFF.filter(x => x.kind !== 'owner');
  const rows = [
    { item: '店面租金', who: TENANT.fixed ? '房東（個人・示範）' : '房東 王＊＊（個人）', base: rent, rate: '扣繳 10%', tax: r0(rent * RATES.rentWithhold), nhi: r0(rent * RATES.nhiSupp), due: '次月 10 日前', form: '租賃所得扣繳憑單（51）' },
  ];
  if (owner) rows.push({ item: '董事酬勞', who: `${owner.name}（負責人）`, base: owner.pay, rate: '未達起扣標準', tax: 0, nhi: 0, due: '—', form: '薪資扣繳憑單（50）免扣繳' });
  if (emps.length) rows.push({ item: '員工薪資', who: emps.map(x => x.name).join('、'), base: emps.reduce((a, x) => a + x.pay, 0), rate: '未達起扣標準', tax: 0, nhi: 0, due: '—', form: '薪資扣繳憑單（50）免扣繳' });
  if (d.m === 9) rows.push({ item: '設計勞務報酬', who: '自由接案設計師（個人）', base: 12000, rate: '扣繳 10%', tax: 1200, nhi: r0(12000 * RATES.nhiSupp), due: '10/10 前', form: '執行業務所得扣繳憑單（9A）' });
  if (d.m === 9) rows[rows.length - 1].nhi = 0; // 單次未達 2 萬免扣補充保費
  return rows;
}

// 稅務行事曆（115 年）
export function taxCalendar(year = new Date().getFullYear()) {
  const D = (m, d) => new Date(year, m - 1, d, 23, 59);
  return [
    { d: D(1, 15), t: '營業稅 11–12 月申報（401）', k: 'vat' },
    { d: D(1, 31), t: '扣繳憑單、股利憑單申報', k: 'wh' },
    { d: D(3, 15), t: '營業稅 1–2 月申報', k: 'vat' },
    { d: D(5, 15), t: '營業稅 3–4 月申報', k: 'vat' },
    { d: D(5, 31), t: '營利事業所得稅結算申報', k: 'cit' },
    { d: D(7, 15), t: '營業稅 5–6 月申報', k: 'vat' },
    { d: D(9, 15), t: '營業稅 7–8 月申報', k: 'vat' },
    { d: D(9, 30), t: '營利事業所得稅暫繳申報', k: 'cit' },
    { d: D(10, 10), t: '9 月扣繳稅款與補充保費繳納', k: 'wh' },
    { d: D(11, 10), t: '10 月扣繳稅款與補充保費繳納', k: 'wh' },
    { d: D(11, 15), t: '營業稅 9–10 月申報', k: 'vat' },
    { d: D(12, 10), t: '11 月扣繳稅款與補充保費繳納', k: 'wh' },
  ];
}

// 本期營業稅（雙月）：401、總覽、老闆的錢共用同一套計算
// 銷項＝本期訂單稅額；進項＝本期所有附發票的進貨與費用（可扣抵）
export function vatPeriod(now = new Date()) {
  const y = now.getFullYear(), m = now.getMonth() + 1;
  const sm = m % 2 === 1 ? m : m - 1;
  const start = new Date(y, sm - 1, 1), end = new Date(y, sm + 1, 1);
  const deadline = new Date(y, sm + 1, 15, 23, 59, 59);
  const months = [month(y, sm)].concat(m > sm ? [month(y, sm + 1)] : []);
  const sales = store.ordersBetween(start, end);
  const ins = months.flatMap(d => d.entries.filter(e => e.type === 'out' && e.tax > 0)).sort((a, b) => a.ts - b.ts);
  const outTax = store.sum(sales, 'tax'), salesNet = store.sum(sales, 'net');
  const inTax = ins.reduce((s, e) => s + e.tax, 0), buyNet = ins.reduce((s, e) => s + e.net, 0);
  return { start, end, deadline, idx: (sm + 1) / 2, label: `${sm}–${sm + 1} 月`, roc: y - 1911, sales, ins, outTax, salesNet, inTax, buyNet, payable: Math.max(0, outTax - inTax) };
}
