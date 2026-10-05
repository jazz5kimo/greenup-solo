// 報價與請款：模擬資料（企業客戶、案件、定期供貨、對帳單、催款語氣）
// 所有客戶名稱、統編、地址皆為虛構，僅供示範。
import { mulberry32, startOfDay, addDays } from './data.js';

export const TAX_RATE = 0.05;

export const SELLER = {
  name: '阿美手作甜點', legal: '阿美手作甜點工作室', taxId: '90418826', owner: '阿美',
  addr: '台北市大安區溫州街 ○○ 號 1 樓', phone: '02-2365-○○20', email: 'hello@amei-sweets.example',
  bank: '示範銀行 大安分行', acct: '0123-○○○-456789',
};

export const TERMS = {
  monthly: '月結 30 天：每月 5 日寄送對帳單與電子發票，30 日內匯款',
  deposit: '簽回後支付 30% 訂金，餘款於出貨後 7 日內付清（信用卡／ATM 虛擬帳號）',
  net7: '出貨後 7 日內付清（信用卡／ATM 虛擬帳號）',
};

export const CUSTOMERS = [
  { id: 'chenguang', name: '晨光設計有限公司', short: '晨光設計', alias: ['晨光設計', '晨光'], taxId: '54318826', contact: '林佳蓉', title: '行政經理', phone: '02-2797-○○18', email: 'admin@chenguang.example', addr: '台北市內湖區瑞光路 ○○ 號 8 樓', terms: 'monthly', color: '#2E97D4', since: 2023 },
  { id: 'forest', name: '森林小屋咖啡', short: '森林小屋', alias: ['森林小屋咖啡', '森林小屋', '森林'], taxId: '83620417', contact: '王子豪', title: '店長', phone: '02-2368-○○61', email: 'forest.cafe@example.com', addr: '台北市大安區師大路 ○○ 巷 6 號', terms: 'monthly', color: '#2DB674', since: 2024 },
  { id: 'goodday', name: '好日子選物', short: '好日子', alias: ['好日子選物', '好日子'], taxId: '42587731', contact: '陳怡君', title: '採購', phone: '04-2301-○○75', email: 'buy@goodday.example', addr: '台中市西區忠信街 ○○ 號', terms: 'monthly', color: '#F0A531', since: 2024 },
  { id: 'qingtian', name: '青田企業社', short: '青田企業社', alias: ['青田企業社', '青田'], taxId: '29734105', contact: '張文彬', title: '總務', phone: '02-2391-○○02', email: 'admin@qingtian.example', addr: '台北市中正區金華街 ○○ 號 3 樓', terms: 'net7', color: '#7C62E6', since: 2025 },
  { id: 'hefeng', name: '禾豐科技股份有限公司', short: '禾豐科技', alias: ['禾豐科技', '禾豐'], taxId: '68152093', contact: '黃柏翰', title: '福委會主委', phone: '03-578-○○36', email: 'welfare@hefeng.example', addr: '新竹市東區科學園路 ○○ 號', terms: 'deposit', color: '#EC6A55', since: 2026 },
  { id: 'daydream', name: '白日夢婚禮工作室', short: '白日夢婚禮', alias: ['白日夢婚禮', '白日夢'], taxId: '50279614', contact: '吳若晴', title: '婚禮統籌', phone: '02-2581-○○90', email: 'hello@daydream.example', addr: '台北市中山區林森北路 ○○ 號 5 樓', terms: 'deposit', color: '#DD5597', since: 2025 },
  { id: 'shiguang', name: '拾光旅宿', short: '拾光旅宿', alias: ['拾光旅宿', '拾光'], taxId: '37106528', contact: '許雅雯', title: '房務主任', phone: '02-2556-○○43', email: 'stay@shiguang.example', addr: '台北市大同區迪化街一段 ○○ 號', terms: 'net7', color: '#5EE0C4', since: 2025 },
  { id: 'mile', name: '米樂親子餐廳', short: '米樂親子', alias: ['米樂親子餐廳', '米樂'], taxId: '81934620', contact: '鄭凱文', title: '店經理', phone: '02-8792-○○57', email: 'mile.kids@example.com', addr: '台北市內湖區成功路四段 ○○ 號', terms: 'net7', color: '#F2C14E', since: 2026 },
  { id: 'everyday', name: '日常咖啡研究室', short: '日常咖啡', alias: ['日常咖啡研究室', '日常咖啡', '日常'], taxId: '73045182', contact: '劉品妤', title: '負責人', phone: '02-2766-○○84', email: 'daily.lab@example.com', addr: '台北市信義區永吉路 ○○ 巷 12 號', terms: 'monthly', color: '#8BD3A8', since: 2025 },
  { id: 'shanlan', name: '山嵐戶外有限公司', short: '山嵐戶外', alias: ['山嵐戶外', '山嵐'], taxId: '64410937', contact: '周家豪', title: '活動企劃', phone: '02-2709-○○66', email: 'event@shanlan.example', addr: '台北市大安區復興南路二段 ○○ 號', terms: 'net7', color: '#2E97D4', since: 2026 },
];
export const CUST = Object.fromEntries(CUSTOMERS.map(c => [c.id, c]));

// 企業報價品項（未稅單價；成本供 AI 毛利試算）
export const CATALOG = {
  giftbox: { name: '綜合禮盒（鳳梨酥 6 入＋手工餅乾 12 片）', unit: '盒', price: 560, cost: 205, cap: 60 },
  pineapple: { name: '鳳梨酥禮盒 10 入', unit: '盒', price: 420, cost: 170, cap: 80 },
  cookie: { name: '手工餅乾禮盒 24 片', unit: '盒', price: 460, cost: 180, cap: 70 },
  pound: { name: '烏龍茶磅蛋糕（批發）', unit: '條', price: 290, cost: 120, cap: 40 },
  canele: { name: '伯爵可麗露 6 入', unit: '盒', price: 330, cost: 140, cap: 40 },
  lemon: { name: '檸檬塔 4 入', unit: '盒', price: 360, cost: 150, cap: 40 },
  basque: { name: '芋泥巴斯克 6 吋', unit: '個', price: 580, cost: 260, cap: 20 },
  wedding: { name: '婚禮小物・糖霜餅乾 2 片袋裝', unit: '份', price: 48, cost: 17, cap: 300 },
  tea: { name: '下午茶點心盒（6 款小點）', unit: '盒', price: 220, cost: 88, cap: 80 },
  sleeve: { name: '企業 LOGO 燙金腰封', unit: '張', price: 15, cost: 6 },
  card: { name: '客製感謝卡（含印刷）', unit: '張', price: 12, cost: 4 },
  ship: { name: '冷藏專車配送', unit: '趟', price: 1200, cost: 900 },
};

export const STAGES = [
  { id: 'inquiry', name: '詢價', color: '#9B86F0', icon: 'chat', act: 'AI 報價', actIc: 'wand' },
  { id: 'quoted', name: '報價已送出', color: '#2E97D4', icon: 'send', act: '簽回頁', actIc: 'external' },
  { id: 'signed', name: '客戶已簽回', color: '#5EE0C4', icon: 'check', act: '安排出貨', actIc: 'truck' },
  { id: 'shipped', name: '已出貨', color: '#F0A531', icon: 'truck', act: '一鍵請款', actIc: 'receipt' },
  { id: 'billed', name: '已請款', color: '#DD5597', icon: 'receipt', act: '收款', actIc: 'coins' },
  { id: 'paid', name: '已收款', color: '#2DB674', icon: 'coins' },
];
export const STAGE_IDX = Object.fromEntries(STAGES.map((s, i) => [s.id, i]));
export const CH_NAME = { line: 'LINE', email: 'Email', phone: '電話', web: '官網', sub: '定期供貨' };

const r0 = Math.round;
export function lineName(it) { return it.name || (CATALOG[it.pid] ? CATALOG[it.pid].name : it.pid); }
export function calc(items, discount = 1) {
  const sub = items.reduce((s, i) => s + i.qty * i.price, 0);
  const disc = r0(sub * (1 - discount));
  const net = sub - disc;
  const tax = r0(net * TAX_RATE);
  return { sub, disc, net, tax, total: net + tax };
}
export function costOf(items) { return items.reduce((s, i) => s + i.qty * ((CATALOG[i.pid] && CATALOG[i.pid].cost) || 0), 0); }
const L = (pid, qty, extra = {}) => ({ pid, qty, price: CATALOG[pid].price, ...extra });
const md = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
const ymd = (d) => `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

// 看板上的案件（日期皆相對於今天）
export function seedDeals(now = new Date()) {
  const T = startOfDay(now);
  const D = (n, h = 10) => +addDays(T, n) + h * 3600e3;
  const monthStart = +new Date(T.getFullYear(), T.getMonth(), 1);
  const inMonth = (t) => Math.max(t, monthStart + 9 * 3600e3);
  const hoursAgo = (h) => Math.min(+now - h * 3600e3, +now);
  const list = [
    // 詢價
    { cid: 'chenguang', stage: 'inquiry', ch: 'phone', title: '週年慶禮盒 120 盒', items: [L('giftbox', 120, { name: '週年慶綜合禮盒（鳳梨酥 6 入＋手工餅乾 12 片）' })], discount: 0.9, created: hoursAgo(1.5), estimate: true,
      prompt: `晨光設計 週年慶禮盒 120 盒 ${md(addDays(T, 21))} 送到內湖，打 9 折` },
    { cid: 'hefeng', stage: 'inquiry', ch: 'line', title: '尾牙伴手禮 200 盒', items: [L('pineapple', 200)], discount: 0.95, created: hoursAgo(5), estimate: true,
      prompt: `禾豐科技 尾牙伴手禮 鳳梨酥禮盒 200 盒 ${md(addDays(T, 45))} 送到新竹，打 95 折` },
    { cid: 'daydream', stage: 'inquiry', ch: 'email', title: '婚禮小物 180 份', items: [L('wedding', 180), L('card', 180)], discount: 1, created: D(-1, 16), estimate: true,
      prompt: `白日夢婚禮 婚禮小物 180 份 ${md(addDays(T, 26))} 送到中山區，附感謝卡` },
    // 報價已送出
    { cid: 'shiguang', stage: 'quoted', ch: 'email', title: '客房迎賓甜點（下月）', items: [L('canele', 60), L('lemon', 30)], discount: 0.95, created: D(-4), quoted: inMonth(D(-2, 11)), views: 2, delivery: D(9) },
    { cid: 'qingtian', stage: 'quoted', ch: 'line', title: '員工下午茶 4 場', items: [L('tea', 140)], discount: 0.92, created: D(-6), quoted: inMonth(D(-4, 15)), views: 3, delivery: D(4) },
    { cid: 'mile', stage: 'quoted', ch: 'line', title: '甜點櫃試賣組', items: [L('pound', 10), L('basque', 6), L('ship', 1)], discount: 1, created: D(-8), quoted: D(-6, 14), views: 0, delivery: D(6) },
    // 客戶已簽回
    { cid: 'goodday', stage: 'signed', ch: 'line', title: '寄賣補貨：鳳梨酥＋餅乾', items: [L('pineapple', 40), L('cookie', 24)], discount: 0.88, created: D(-5), quoted: inMonth(D(-3, 10)), signed: D(-1, 18), delivery: D(2) },
    { cid: 'chenguang', stage: 'signed', ch: 'email', title: '新進員工迎新點心', items: [L('tea', 45)], discount: 1, created: D(-6), quoted: D(-5, 10), signed: D(-2, 14), delivery: D(3) },
    // 已出貨
    { cid: 'forest', stage: 'shipped', ch: 'sub', title: `${md(T)} 週一定期供貨`, items: [L('pound', 6, { price: 270 }), L('canele', 4, { price: 310 })], discount: 1, created: D(-7), quoted: D(-60), signed: D(-58), shipped: D(0, 7.5) },
    { cid: 'shanlan', stage: 'shipped', ch: 'phone', title: '登山活動點心 60 盒', items: [L('tea', 60), L('ship', 1)], discount: 1, created: D(-9), quoted: D(-8), signed: D(-7), shipped: D(-1, 9) },
    // 已請款
    { cid: 'chenguang', stage: 'billed', ch: 'line', title: '中秋禮盒團購 30 盒', items: [L('giftbox', 30, { name: '中秋綜合禮盒（鳳梨酥 6 入＋手工餅乾 12 片）' })], discount: 1, created: D(-24), quoted: D(-23), signed: D(-21), shipped: D(-16), billed: D(-15, 9), due: D(15), inv: 'AB-30416127' },
    { cid: 'goodday', stage: 'billed', ch: 'line', title: '9 月寄賣結算', items: [L('pineapple', 18), L('cookie', 10)], discount: 0.88, created: D(-32), quoted: D(-31), signed: D(-30), shipped: D(-28), billed: D(-27, 9), due: D(3), inv: 'AB-30415580' },
    { cid: 'qingtian', stage: 'billed', ch: 'phone', title: '9 月員工下午茶', items: [L('canele', 5), L('lemon', 3)], discount: 1, created: D(-16), quoted: D(-15), signed: D(-14), shipped: D(-13), billed: D(-12, 14), due: D(-5), inv: 'AB-30416893' },
    { cid: 'mile', stage: 'billed', ch: 'line', title: '中秋限定試吃組', items: [L('giftbox', 12, { name: '中秋綜合禮盒（鳳梨酥 6 入＋手工餅乾 12 片）' }), L('canele', 8)], discount: 1, created: D(-30), quoted: D(-29), signed: D(-27), shipped: D(-26), billed: D(-25, 11), due: D(-18), inv: 'AB-30415204' },
    // 已收款
    { cid: 'forest', stage: 'paid', ch: 'sub', title: '9 月月結（自動扣款）', items: [L('pound', 24, { price: 270 }), L('canele', 16, { price: 310 })], discount: 1, created: D(-36), quoted: D(-90), signed: D(-88), shipped: D(-8), billed: D(-35, 9), due: D(-5), paid: D(-31, 9), inv: 'AB-30414502' },
    { cid: 'shiguang', stage: 'paid', ch: 'email', title: '9 月迎賓甜點', items: [L('canele', 40), L('lemon', 20)], discount: 0.95, created: D(-20), quoted: D(-19), signed: D(-18), shipped: D(-12), billed: D(-11), due: D(-4), paid: D(-6, 15), inv: 'AB-30416540' },
    { cid: 'daydream', stage: 'paid', ch: 'email', title: '婚禮小物 150 份', items: [L('wedding', 150), L('card', 150)], discount: 1, created: D(-34), quoted: D(-33), signed: D(-31), shipped: D(-16), billed: D(-16), due: D(-9), paid: D(-10, 11), inv: 'AB-30416011' },
  ];
  const seq = {};
  return list.map((d, i) => {
    const base = new Date(d.quoted || d.created);
    const k = ymd(base); const sk = (d.quoted ? 'QT' : 'IQ') + k; seq[sk] = (seq[sk] || 0) + 1;
    const c = CUST[d.cid];
    return {
      id: `${d.quoted ? 'QT' : 'IQ'}-${k}-${String(seq[sk]).padStart(2, '0')}`, ...d,
      terms: c.terms, location: c.addr, valid: d.quoted ? +addDays(new Date(d.quoted), 14) : null,
    };
  });
}

// 過去 120 天已結案的案件（成交率、平均成交天數、漏斗）
export function historyDeals(now = new Date()) {
  const rng = mulberry32(8820);
  const T = startOfDay(now);
  const out = [];
  for (let i = 0; i < 46; i++) {
    const created = +addDays(T, -(10 + Math.floor(rng() * 110)));
    const r = rng();
    const quoted = r < 0.09 ? null : created + (0.2 + rng() * 1.6) * 86400e3;
    const won = quoted && rng() < 0.52;
    const signDays = 1 + Math.floor(rng() * rng() * 7);
    const total = r0((3000 + rng() * rng() * 52000) / 10) * 10;
    out.push({ created, quoted, won, signed: won ? quoted + signDays * 86400e3 : null, total, lost: quoted && !won });
  }
  return out;
}

// 近 6 個月企業營收（含定期供貨）
export function monthlyRevenue(now = new Date()) {
  const rng = mulberry32(3301);
  const out = [];
  for (let k = 6; k >= 1; k--) {
    const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
    const m = d.getMonth() + 1;
    const sub = 26000 + r0(rng() * 3000);
    let one = 42000 + rng() * 30000;
    if (m === 9) one *= 2.4; // 中秋
    if (m === 1 || m === 2) one *= 2.1; // 尾牙、年節
    if (m === 12) one *= 1.5;
    out.push({ label: `${m} 月`, y: d.getFullYear(), m, sub, one: r0(one / 100) * 100, total: sub + r0(one / 100) * 100 });
  }
  return out;
}

// 定期供貨（訂閱）
export function seedSubs() {
  return [
    { id: 'SUB-0101', cid: 'forest', title: '烏龍茶磅蛋糕 6 條＋伯爵可麗露 4 盒', items: [L('pound', 6, { price: 270 }), L('canele', 4, { price: 310 })], weekday: 1, every: 1, shipAt: '07:30', billDay: 5, pay: '信用卡定期扣款', active: true, since: '2024/11' },
    { id: 'SUB-0102', cid: 'everyday', title: '檸檬塔 5 盒＋芋泥巴斯克 2 個', items: [L('lemon', 5, { price: 340 }), L('basque', 2, { price: 550 })], weekday: 4, every: 1, shipAt: '08:00', billDay: 5, pay: 'ATM 虛擬帳號', active: true, since: '2025/06' },
    { id: 'SUB-0103', cid: 'chenguang', title: '週五下午茶點心盒 30 盒', items: [L('tea', 30, { price: 210 })], weekday: 5, every: 1, shipAt: '14:00', billDay: 5, pay: '月結轉帳', active: true, since: '2026/03', monthlyOnly: 'first' },
    { id: 'SUB-0104', cid: 'goodday', title: '寄賣補貨：鳳梨酥禮盒 20 盒', items: [L('pineapple', 20, { price: 380 })], weekday: 1, every: 2, shipAt: '09:00', billDay: 10, pay: 'ATM 虛擬帳號', active: false, since: '2025/09', pausedNote: '店休整修，10 月底恢復' },
  ];
}

// 某訂閱在 [from, to] 之間的出貨日
export function subShipDates(s, from, to) {
  const out = [];
  let d = startOfDay(from);
  const end = +to;
  let n = 0;
  while (+d <= end) {
    if (d.getDay() === s.weekday) {
      const firstOfMonth = d.getDate() <= 7;
      if (s.monthlyOnly === 'first' ? firstOfMonth : (s.every === 1 || (Math.floor(+d / (7 * 86400e3)) % s.every === 0))) out.push(new Date(d));
      n++;
    }
    d = addDays(d, 1);
  }
  return out;
}
export function nextBillDate(s, now = new Date()) {
  const T = startOfDay(now);
  let d = new Date(T.getFullYear(), T.getMonth(), s.billDay);
  if (+d <= +T) d = new Date(T.getFullYear(), T.getMonth() + 1, s.billDay);
  return d;
}
export function lastBillDate(s, now = new Date()) {
  const T = startOfDay(now);
  let d = new Date(T.getFullYear(), T.getMonth(), s.billDay);
  if (+d >= +T) d = new Date(T.getFullYear(), T.getMonth() - 1, s.billDay);
  return d;
}

// 月結對帳單：本期（上次結帳日後到今天）多筆出貨彙總
export function statementRows(cid, deals, subs, now = new Date()) {
  const T = startOfDay(now);
  const sub = subs.find(s => s.cid === cid);
  const from = sub ? addDays(lastBillDate(sub, now), 1) : new Date(T.getFullYear(), T.getMonth(), 1);
  const rows = [];
  let n = 0;
  if (sub) {
    for (const d of subShipDates(sub, from, T)) {
      if (+d === +T && deals.some(x => x.cid === cid && x.ch === 'sub' && x.shipped >= +T)) continue; // 由看板案件代表
      rows.push({ date: +d + 8 * 3600e3, no: `SH-${ymd(d)}-${String(++n).padStart(2, '0')}`, desc: `定期供貨・${sub.title}`, items: sub.items, net: calc(sub.items).net });
    }
  }
  if (cid === 'goodday') {
    const extra = [
      { d: -18, items: [L('pineapple', 12)], desc: '寄賣補貨・鳳梨酥禮盒 12 盒' },
      { d: -9, items: [L('cookie', 8)], desc: '寄賣補貨・手工餅乾禮盒 8 盒' },
    ];
    for (const e of extra) {
      const dt = addDays(T, e.d);
      if (+dt >= +from) rows.push({ date: +dt + 10 * 3600e3, no: `SH-${ymd(dt)}-${String(++n).padStart(2, '0')}`, desc: e.desc, items: e.items, net: calc(e.items, 0.88).net });
    }
  }
  for (const d of deals) {
    if (d.cid !== cid || !d.shipped || d.stage !== 'shipped') continue;
    rows.push({ date: d.shipped, no: `SH-${ymd(new Date(d.shipped))}-${String(++n).padStart(2, '0')}`, desc: d.title, items: d.items, net: calc(d.items, d.discount).net, deal: d.id });
  }
  rows.sort((a, b) => a.date - b.date);
  const net = rows.reduce((s, r) => s + r.net, 0);
  const tax = r0(net * TAX_RATE);
  return { from, to: T, rows, net, tax, total: net + tax };
}

// ===== AI 一句話解析 =====
const CN_NUM = { 一: 1, 二: 2, 兩: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
const PRODUCT_RULES = [
  { re: /婚禮|小物|喜餅|謝禮/, pid: 'wedding' },
  { re: /下午茶|點心盒|茶點/, pid: 'tea' },
  { re: /鳳梨酥/, pid: 'pineapple' },
  { re: /餅乾/, pid: 'cookie' },
  { re: /磅蛋糕/, pid: 'pound' },
  { re: /可麗露/, pid: 'canele' },
  { re: /檸檬塔/, pid: 'lemon' },
  { re: /巴斯克|蛋糕/, pid: 'basque' },
  { re: /禮盒|伴手禮|月餅|中秋|年節|尾牙|春節/, pid: 'giftbox' },
];
const BOX_PREFIX = [[/中秋/, '中秋'], [/年節|春節|新年/, '年節'], [/週年|周年/, '週年慶'], [/尾牙/, '尾牙'], [/端午/, '端午']];

export function parsePrompt(text, now = new Date()) {
  const T = startOfDay(now);
  const t = String(text || '').trim();
  const tokens = [];
  // 客戶
  let cust = null, custText = '';
  for (const c of CUSTOMERS) {
    const a = c.alias.find(x => t.includes(x));
    if (a && (!custText || a.length > custText.length)) { cust = c; custText = a; }
  }
  if (!cust) {
    const m = t.match(/^([一-龥A-Za-z0-9]{2,14}?)(?:\s|，|,|的)/);
    custText = m ? m[1] : '新客戶';
    const legal = /公司|工作室|企業社|咖啡|餐廳|旅宿|選物|協會|學校/.test(custText) ? custText : custText + '（公司全名待確認）';
    cust = { id: 'new-' + custText, name: legal, short: custText, alias: [custText], taxId: '', contact: '', title: '', phone: '', email: '', addr: '', terms: 'deposit', color: '#9B86F0', isNew: true };
  }
  tokens.push({ k: 'cust', label: '客戶', text: custText });
  // 品項
  let pid = 'giftbox', prodText = '';
  for (const r of PRODUCT_RULES) { const m = t.match(r.re); if (m) { pid = r.pid; prodText = m[0]; break; } }
  let name = CATALOG[pid].name;
  if (pid === 'giftbox') {
    const p = BOX_PREFIX.find(([re]) => re.test(t));
    name = `${p ? p[1] : '企業'}綜合禮盒（鳳梨酥 6 入＋手工餅乾 12 片）`;
    const m = t.match(/([一-龥]{0,3}(?:禮盒|伴手禮))/); if (m) prodText = m[1];
  }
  tokens.push({ k: 'prod', label: '品項', text: prodText || CATALOG[pid].name });
  // 數量
  let qty = 0, qm = t.match(/(\d{1,5})\s*(盒|份|個|條|袋|組|入|顆|箱)/);
  if (qm) { qty = +qm[1]; tokens.push({ k: 'qty', label: '數量', text: qm[0] }); }
  else { qty = pid === 'wedding' ? 100 : 50; tokens.push({ k: 'qty', label: '數量', text: `未指定，暫填 ${qty}`, guess: true }); }
  // 交期
  let date = null, dateNote = '';
  const dm = t.match(/(\d{1,2})\s*[\/月]\s*(\d{1,2})\s*日?/);
  if (dm) {
    const mo = +dm[1], da = +dm[2];
    date = new Date(T.getFullYear(), mo - 1, da);
    if (+date < +T) { date = new Date(T.getFullYear() + 1, mo - 1, da); dateNote = `今年 ${mo}/${da} 已過，交期暫排 ${date.getFullYear()}/${mo}/${da}，請與客戶確認`; }
    tokens.push({ k: 'date', label: '交期', text: dm[0] });
  } else {
    date = addDays(T, 14); dateNote = '未指定交期，暫排 14 天後';
    tokens.push({ k: 'date', label: '交期', text: `未指定，暫排 ${md(date)}`, guess: true });
  }
  // 地點
  let loc = '';
  const lm = t.match(/(?:送到|送至|寄到|寄至|送去)\s*([一-龥A-Za-z0-9]{2,12}?)(?=[，,。\s]|打|$)/);
  if (lm) { loc = lm[1]; tokens.push({ k: 'loc', label: '地點', text: lm[1] }); }
  // 折扣
  let discount = 1;
  const fm = t.match(/(\d{1,2})\s*折/) || t.match(/([一二兩三四五六七八九]{1,2})\s*折/);
  if (fm) {
    let v = fm[1];
    if (/\D/.test(v)) v = v.split('').map(c => CN_NUM[c]).join('');
    const n = +v;
    discount = n < 10 ? n / 10 : n / 100;
    if (!(discount > 0.3 && discount < 1)) discount = 1;
    tokens.push({ k: 'disc', label: '折扣', text: fm[0] });
  }
  const card = /感謝卡|卡片/.test(t);
  if (card) tokens.push({ k: 'extra', label: '加購', text: '感謝卡' });
  return { text: t, cust, custText, pid, name, qty, date: +date, dateNote, loc, discount, card, tokens };
}

// 由解析結果組出報價單草稿
export function buildQuote(p, now = new Date(), seqNo = 1) {
  const T = startOfDay(now);
  const c = p.cust;
  const items = [{ pid: p.pid, name: p.name, qty: p.qty, price: CATALOG[p.pid].price }];
  const isBox = ['giftbox', 'pineapple', 'cookie'].includes(p.pid);
  if (isBox && p.qty >= 100) items.push({ pid: 'sleeve', name: CATALOG.sleeve.name, qty: p.qty, price: 0, note: '滿 100 盒贈送' });
  if (p.card) items.push({ pid: 'card', name: CATALOG.card.name, qty: p.qty, price: CATALOG.card.price });
  const pre = calc(items, p.discount);
  const far = p.loc && /新竹|台中|桃園|台南|高雄|宜蘭/.test(p.loc);
  if (pre.net >= 30000) items.push({ pid: 'ship', name: CATALOG.ship.name + (p.loc ? `（${p.loc}）` : ''), qty: 1, price: 0, note: '滿 NT$ 30,000 免運' });
  else items.push({ pid: 'ship', name: CATALOG.ship.name + (p.loc ? `（${p.loc}）` : ''), qty: 1, price: far ? 1800 : CATALOG.ship.price });
  let addr = c.addr || '';
  if (p.loc && !addr.includes(p.loc.replace(/區$/, ''))) addr = /[市縣]/.test(p.loc) ? p.loc : `${p.loc}（詳細地址待客戶提供）`;
  const terms = c.terms || 'deposit';
  const notes = [
    '常溫禮盒保存期限 30 天，冷藏品項請收貨後立即冷藏。',
    isBox && p.qty >= 100 ? 'LOGO 腰封請於交期 7 日前提供 AI／PDF 向量檔。' : '如需客製腰封或卡片，請於交期 7 日前告知。',
    '本報價單經客戶線上簽回即視為訂單成立。',
  ];
  return {
    no: `QT-${ymd(T)}-${String(seqNo).padStart(2, '0')}`, date: +T, valid: +addDays(T, 14), delivery: p.date, location: addr,
    cust: c, items, discount: p.discount, terms, notes, dateNote: p.dateNote,
  };
}

// AI 洞察（毛利、產能、歷史）
export function quoteInsights(q, p) {
  const out = [];
  const c = q.cust;
  if (c.isNew) out.push({ k: 'warn', t: `「${c.short}」是新客戶，已先建立客戶資料；統一編號與公司全名請客戶簽回時填寫。` });
  else out.push({ k: 'ok', t: `比對到既有客戶「${c.name}」（${c.since} 年起往來），已自動帶入統編 ${c.taxId}、聯絡人與${c.terms === 'monthly' ? '月結' : '付款'}條件。` });
  const a = calc(q.items, q.discount);
  const cost = costOf(q.items);
  const gm = a.net ? (a.net - cost) / a.net : 0;
  out.push({ k: gm >= 0.45 ? 'ok' : 'warn', t: `${q.discount < 1 ? `${fmtDisc(q.discount)}後` : ''}毛利率 ${(gm * 100).toFixed(0)}%（企業單平均 48%）${gm < 0.4 ? '，偏低，建議折扣改為 95 折或提高數量門檻' : '，仍在安全範圍'}。` });
  const main = q.items[0];
  const cap = (CATALOG[main.pid] && CATALOG[main.pid].cap) || 60;
  const days = Math.max(1, Math.ceil(main.qty / cap));
  const start = addDays(new Date(q.delivery), -(days + 1));
  out.push({ k: 'ok', t: `${main.qty} ${CATALOG[main.pid].unit}約需 ${days} 個生產日（每日產能 ${cap}），已預排 ${start.getMonth() + 1}/${start.getDate()} 開工，小芸當週排班足夠。` });
  if (q.items.some(i => i.pid === 'sleeve')) out.push({ k: 'ok', t: '數量達 100 盒，已自動加入「LOGO 燙金腰封」贈品，提高成交率。' });
  if (q.dateNote) out.push({ k: 'warn', t: q.dateNote + '。' });
  return out;
}
export const fmtDisc = (d) => {
  if (d >= 1) return '不打折';
  const n = Math.round(d * 100);
  return (n % 10 === 0 ? n / 10 : n) + ' 折';
};

// ===== 催款訊息 =====
export function dunningText(deal, tone, overdue, now = new Date()) {
  const c = CUST[deal.cid] || { short: deal.cid, contact: '' };
  const amt = 'NT$ ' + calc(deal.items, deal.discount).total.toLocaleString('en-US');
  const due = new Date(deal.due);
  const dueS = `${due.getMonth() + 1}/${due.getDate()}`;
  const tm = (c.title || '').match(/經理|店長|主任|主委|總監/);
  const who = c.contact ? (tm ? c.contact.slice(0, 1) + tm[0] : c.contact) : '';
  const greet = who ? `${who}您好` : '您好';
  if (tone === 'polite') {
    return overdue > 0
      ? `${greet}，我是阿美手作甜點的阿美～謝謝${c.short}一直以來的支持！想跟您確認一下「${deal.title}」的款項 ${amt}（發票 ${deal.inv}），原訂 ${dueS} 到期，目前系統還沒看到入帳，可能是作業上剛好錯過了。方便的話可以直接點下方付款連結，信用卡或 ATM 都可以。如果已經匯出，再麻煩告訴我末五碼，我這邊幫您對帳，謝謝您！`
      : `${greet}，我是阿美手作甜點的阿美～「${deal.title}」的請款單與電子發票 ${deal.inv} 已寄到信箱，金額 ${amt}，付款期限是 ${dueS}。附上付款連結（信用卡／ATM 虛擬帳號），有任何問題都可以直接回覆我，謝謝！`;
  }
  return `${c.name || c.short} ${c.contact || ''}${c.title || ''} 您好：\n\n本公司於 ${fmtD(deal.billed)} 開立之請款單（${deal.id.replace('QT', 'BL')}）及電子發票 ${deal.inv}，金額 ${amt}（含 5% 營業稅），付款期限為 ${fmtD(deal.due)}${overdue > 0 ? `，截至今日已逾期 ${overdue} 天` : ''}。\n\n敬請於 ${fmtD(+addDays(startOfDay(now), 5))} 前完成付款（付款連結與 ATM 虛擬帳號如附）。若貴公司已付款，請回覆匯款日期與帳號末五碼以利沖帳；如對帳款有疑義，亦請於期限內告知。\n\n阿美手作甜點 敬上`;
}
const fmtD = (t) => { const d = new Date(t); return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`; };

// 偽 QR（示意用，非可掃描）
export function fakeQR(seed, n = 25) {
  const rng = mulberry32(seed);
  const cells = [];
  const finder = (x, y) => [[0, 0], [n - 7, 0], [0, n - 7]].some(([fx, fy]) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!finder(x, y) && rng() < 0.48) cells.push(`M${x} ${y}h1v1h-1z`);
  const f = (fx, fy) => `M${fx} ${fy}h7v7h-7zM${fx + 1} ${fy + 1}v5h5v-5zM${fx + 2} ${fy + 2}h3v3h-3z`;
  return `<svg viewBox="-1 -1 ${n + 2} ${n + 2}" shape-rendering="crispEdges"><rect x="-1" y="-1" width="${n + 2}" height="${n + 2}" fill="#fff"/><path fill="#0b1f17" fill-rule="evenodd" d="${f(0, 0)}${f(n - 7, 0)}${f(0, n - 7)}${cells.join('')}"/></svg>`;
}
export function fakeBarcode(seed, w = 220, h = 34) {
  const rng = mulberry32(seed);
  let x = 0; const bars = [];
  while (x < w) { const bw = 1 + Math.floor(rng() * 3); if (rng() < 0.55) bars.push(`M${x} 0h${bw}v${h}h-${bw}z`); x += bw + (rng() < 0.5 ? 1 : 2); }
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><path fill="#0b1f17" d="${bars.join('')}"/></svg>`;
}
