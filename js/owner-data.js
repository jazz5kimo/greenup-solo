// 老闆的錢：可安心領金額、稅金預留帳戶、領錢方式試算、現金跑道、公私分明、存錢目標
// 數字皆由 ledger.js（month／position／annualEstimate／PAYROLL）與 store 推導，與會計帳務、報稅頁一致。
// 所有金額為示範資料・試算；稅率級距為簡化示意，僅供參考，請與會計師確認。
import { store } from './state.js';
import { mulberry32 } from './data.js';
import { month, monthList, position, annualEstimate, withholdings, taxCalendar, RATES, STAFF } from './ledger.js';
import { TENANT } from './tenant.js';
import { AMEI, BIG_BUY } from './bank-data.js';

const r0 = (n) => Math.round(n);
const OWNER = STAFF.find(s => s.kind === 'owner') || STAFF[0];
export const OWNER_NAME = OWNER.name;
const EMPS = STAFF.filter(s => s.kind !== 'owner');
// 設備汰換基金：阿美為旋風烤箱；其他業主依 TENANT.fixed.equip 與折舊推估
const EQUIP = AMEI ? '旋風烤箱' : (TENANT.fixed?.equip || '營業設備');
export const EQUIP_NAME = EQUIP;
const depr = TENANT.fixed?.depreciation || 2000;
const EQ_TARGET = Math.max(50000, Math.round(depr * 60 * 1.33 / 10000) * 10000);
const EQ_MONTHLY = Math.max(1000, Math.ceil(EQ_TARGET / 40 / 500) * 500);
// 老闆代墊情境：依業態大類（TENANT.cat）各一組
const ADV_CAT = {
  food: ['不鏽鋼湯勺與砧板一批', '週末市集（虛構）', '急件外送運費', '食品級手套、外帶袋補貨'],
  drink: ['器具零件與量杯一批', '週末市集（虛構）', '急件宅配運費', '濾紙、杯蓋補貨'],
  dessert: ['模具與擠花嘴一批', '週末市集（虛構）', '冷藏急件運費', '食品級手套、烤盤紙補貨'],
  retail: ['展示架與標價卡一批', '週末選物市集（虛構）', '急件宅配運費', '包裝膠帶、緩衝材補貨'],
  craft: ['工具刀片與蠟線一批', '手作市集（虛構）', '急件宅配運費', '包裝紙盒、緩衝材補貨'],
  flower: ['花剪與保水管一批', '假日花市（虛構）', '冷藏急件配送運費', '包裝紙、緞帶補貨'],
  service: ['工作用工具與收納盒一批', '週末體驗市集（虛構）', '急件快遞運費', '一次性耗材、消毒用品補貨'],
  farm: ['採收籃與分級秤一批', '農夫市集（虛構）', '冷藏急件宅配運費', '紙箱、保鮮袋補貨'],
};

// ---- 已承諾支出（與「金流對帳」60 天現金流預測一致） ----
export const COMMITMENTS = AMEI ? [
  { id: 'gift', name: '年節禮盒原料＋包材預購', who: '北海乳品、綠紙包裝', due: [11, 12], amt: 360000, note: '已下單，11/12 付款（金流對帳頁現金流預測同一筆）' },
  { id: 'design', name: '聖誕限定禮盒包裝設計尾款', who: '自由接案設計師', due: [11, 30], amt: 12000, note: '研發專案「聖誕限定禮盒」委外設計，交稿後支付' },
] : [
  { id: 'gift', name: BIG_BUY.name, who: BIG_BUY.who, due: BIG_BUY.due, amt: BIG_BUY.amt, note: `已下單，${BIG_BUY.due[0]}/${BIG_BUY.due[1]} 付款（金流對帳頁現金流預測同一筆）` },
  { id: 'design', name: '年節檔期視覺設計尾款', who: '自由接案設計師（虛構）', due: [11, 30], amt: 8000, note: '年節檔期主視覺與包裝委外設計，交稿後支付' },
];

// ---- 老闆代墊（應付股東／業主往來貸方） ----
const ADV = ADV_CAT[TENANT.cat] || ADV_CAT.retail;
export const ADVANCES = !AMEI ? [
  { id: 'a1', date: [9, 18], item: ADV[0], vendor: `蝦皮購物（${OWNER.name}個人信用卡）`, amt: 2640, doc: '電子發票（個人手機條碼）' },
  { id: 'a2', date: [9, 25], item: '市集攤位清潔保證金（不退部分）', vendor: `${ADV[1]}（${OWNER.name}現金）`, amt: 500, doc: '收據' },
  { id: 'a3', date: [10, 1], item: ADV[2], vendor: `綠野物流（${OWNER.name} LINE Pay）`, amt: 1180, doc: '電子發票' },
  { id: 'a4', date: [10, 3], item: ADV[3], vendor: `全聯福利中心（${OWNER.name}個人卡）`, amt: 868, doc: '電子發票（個人載具）' },
] : [
  { id: 'a1', date: [9, 18], item: '蛋糕模具與擠花嘴一批', vendor: '蝦皮購物（阿美個人信用卡）', amt: 2640, doc: '電子發票（個人手機條碼）' },
  { id: 'a2', date: [9, 25], item: '市集攤位清潔保證金（不退部分）', vendor: '華山文創市集（阿美現金）', amt: 500, doc: '收據' },
  { id: 'a3', date: [10, 1], item: '冷藏急件運費', vendor: '綠野冷鏈物流（阿美 LINE Pay）', amt: 1180, doc: '電子發票' },
  { id: 'a4', date: [10, 3], item: '食品級手套、烘焙紙補貨', vendor: '全聯福利中心（阿美個人卡）', amt: 868, doc: '電子發票（個人載具）' },
];

// ---- AI 偵測：可能的私人支出（公司卡／公司帳戶支付） ----
export const FLAGS = [
  { id: 'f1', date: [9, 14], vendor: '誠品書店', item: '小說 2 本、旅遊書 1 本', amt: 1260, conf: 86, why: `書名與${AMEI ? '烘焙' : TENANT.typeName}營業無關，且於週日在住家附近分店消費`, acct: '雜項費用' },
  { id: 'f2', date: [9, 21], vendor: '全聯福利中心', item: '衛生紙、洗衣精、貓砂', amt: 2380, conf: 81, why: '發票品項含家用品（貓砂、洗衣精），非店內耗材', acct: '清潔消毒費' },
  { id: 'f3', date: [9, 27], vendor: '台灣中油', item: '加油 95 無鉛', amt: 1500, conf: 74, why: '公司未登記營業用車輛，加油費可能屬個人用車', acct: '運費' },
  { id: 'f4', date: [10, 2], vendor: 'Netflix', item: '標準方案月費', amt: 390, conf: 92, why: '影音串流訂閱，與營業項目無直接關聯', acct: '軟體訂閱費' },
  { id: 'f5', date: [10, 4], vendor: '鼎泰豐 信義店', item: '週日晚餐 4 人', amt: 3280, conf: 63, why: '交際費需註明招待對象與業務目的；若為家庭聚餐應轉列私人', acct: '交際費' },
];

// ---- 存錢目標 ----
// 員工年終：全職 1.5 個月＋兼職 0.5 個月；只有負責人時改存年度保費與記帳費用
function bonusGoal() {
  if (!EMPS.length) {
    const t = Math.max(12000, Math.round(OWNER.pay * 0.4 / 1000) * 1000);
    return { name: '年度保費與記帳費預備', target: t, monthly: Math.ceil(t / 3 / 500) * 500, due: [new Date().getFullYear() + 1, 1, 20], note: '目前只有負責人、沒有員工年終；改存商業保險與記帳費用' };
  }
  const t = EMPS.reduce((a, e) => a + Math.round(e.pay * (e.kind === 'full' ? 1.5 : 0.5)), 0);
  return { name: '員工年終獎金', target: t, monthly: Math.ceil(t / 3 / 500) * 500, due: [new Date().getFullYear() + 1, 1, 20], note: EMPS.map(e => `${e.name} ${e.kind === 'full' ? '1.5' : '0.5'} 個月`).join('＋') };
}
export const GOALS = {
  emergency: { months: 6 },                         // 緊急預備金：6 個月固定支出；已存＝安全金
  bonus: AMEI ? { name: '員工年終獎金', target: 58300, monthly: 19500, due: [2027, 1, 20], note: '小芸 1.5 個月＋小傑 0.5 個月' } : bonusGoal(),
  oven: AMEI ? { name: '烤箱汰換基金', target: 240000, saved: 18000, monthly: 6000, due: [2029, 10], note: '旋風烤箱（現有設備成本 18 萬，耐用 5 年）預計 3 年後汰換，新機含安裝約 24 萬' }
    : { name: `${EQUIP}汰換基金`, target: EQ_TARGET, saved: EQ_MONTHLY * 3, monthly: EQ_MONTHLY, due: [new Date().getFullYear() + 3, 10], note: `${EQUIP}（耐用約 5 年，每月折舊 ${depr.toLocaleString()}）預計 3 年後汰換，新設備含安裝約 ${Math.round(EQ_TARGET / 10000)} 萬（示範估計）` },
};

// 每月固定支出（取最近一個完整月的實際帳務，排除老闆自己的董事酬勞）
const FIXED_GROUPS = [
  ['pay', AMEI ? '員工薪資（小芸、小傑）' : EMPS.length ? `員工薪資（${EMPS.map(e => e.name).join('、')}）` : '員工薪資（目前無員工）', e => e.acct === '薪資支出'],
  ['ins', '勞健保・勞退（雇主負擔）', e => e.acct === '保險費－勞健保' || e.acct === '退休金'],
  ['rent', AMEI ? '店面租金＋市集攤位' : '營業場所租金', e => e.acct === '租金支出'],
  ['util', '水電瓦斯', e => e.acct === '水電瓦斯費'],
  ['misc', '通訊、軟體、保險、清潔', e => ['通訊費', '軟體訂閱費', '保險費', '清潔消毒費', '清潔費'].includes(e.acct)],
  ['pro', '記帳士、管理費、修繕、郵電', e => ['記帳及申報費', '管理費', '修繕費', '郵電費'].includes(e.acct)],
  ['ops', '交通、牌照稅、伙食、平台手續費', e => ['交通費', '稅捐', '伙食費', '佣金支出'].includes(e.acct)],
];
export function fixedMonthly() {
  const full = monthList().filter(x => !x.current);
  const d = month(full[full.length - 1].y, full[full.length - 1].m);
  const rows = FIXED_GROUPS.map(([id, name, f]) => ({ id, name, amt: r0(d.entries.filter(e => e.type === 'out' && f(e)).reduce((s, e) => s + e.net + e.tax, 0)) }));
  return { rows, total: rows.reduce((s, r) => s + r.amt, 0), from: d.m };
}

const ymd = (y, m, d) => new Date(y, m - 1, d, 23, 59);

// ---- 核心：這個月可以安心領多少 ----
// opts: { safetyMonths, repaid:Set, privateIds:Set, extraGoal }
export function snapshot({ safetyMonths = 3, repaid = new Set(), privateIds = new Set(), extraGoal = 0, bonusNow = false } = {}) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth() + 1;
  const list = monthList();
  const cur = month(y, m);
  const pos = position(y, m);
  const liab = Object.fromEntries(pos.liab);
  const repaidAmt = ADVANCES.filter(a => repaid.has(a.id)).reduce((s, a) => s + a.amt, 0);
  const cash = r0(pos.assets[0][1] - repaidAmt);

  // 稅金預留
  const vat = r0(liab['應付營業稅'] || 0);
  const est = annualEstimate();
  const citMonthly = r0(est.tax / 12);
  const citMonths = (list.length - 1) + cur.factor; // 自 GreenUP 啟用月（monthList 第一個月）起按月提列
  const cit = r0(citMonthly * citMonths);
  const prev = month(list[list.length - 2].y, list[list.length - 2].m);
  const prevWh = withholdings(prev).reduce((s, r) => s + r.tax + r.nhi, 0);
  const whDue = ymd(y, m, 10);
  const wh = r0((now <= whDue ? prevWh : 0) + (liab['代扣款項（扣繳稅款、補充保費）'] || 0));
  const vatPeriod = m % 2 === 0 ? `${m - 1}–${m} 月` : `${m}–${m + 1} 月`;
  const vatDueM = m % 2 === 0 ? m + 1 : m + 2;
  const taxItems = [
    { name: `營業稅 ${vatPeriod}（累計至今應納）`, amt: vat, note: `銷項稅額 − 進項稅額，${vatDueM > 12 ? vatDueM - 12 : vatDueM}/15 前申報繳納；與報稅頁 401 試算同源` },
    { name: '營所稅預估（按月提列）', amt: cit, note: `全年預估應納 ${est.tax.toLocaleString()} ÷ 12 ＝ 每月 ${citMonthly.toLocaleString()}，自 ${list[0].m} 月啟用 GreenUP 起提列 ${citMonths.toFixed(1)} 個月；次年 5 月結算申報` },
    { name: '扣繳與補充保費待繳', amt: wh, note: `${prev.m} 月租金扣繳 10%、勞務報酬扣繳與二代健保補充保費，${m}/10 前繳納` },
  ];
  const taxTotal = taxItems.reduce((s, x) => s + x.amt, 0);

  // 安全金
  const fx = fixedMonthly();
  const safety = fx.total * safetyMonths;

  // 應付帳款
  const ap = r0(liab['應付帳款'] || 0);
  const advLeft = ADVANCES.filter(a => !repaid.has(a.id));
  const advAmt = advLeft.reduce((s, a) => s + a.amt, 0);
  const apItems = [
    { name: '應付帳款（供應商月結）', amt: ap, note: `${AMEI ? '原料' : ''}進貨月結未付款；與資產負債表同源` },
    { name: '應付股東（老闆代墊未還）', amt: advAmt, note: advLeft.length ? `${advLeft.length} 筆代墊款待還給${OWNER.name}` : '代墊款已全部還清' },
  ];
  const apTotal = ap + advAmt;

  // 已承諾支出
  const privAmt = FLAGS.filter(f => privateIds.has(f.id)).reduce((s, f) => s + f.amt, 0);
  const comItems = [
    ...COMMITMENTS.map(c => ({ name: c.name, amt: c.amt, note: `${c.who}・${c.due[0]}/${c.due[1]} 付款。${c.note}` })),
    { name: `${GOALS.oven.name}（已提撥，不動用）`, amt: GOALS.oven.saved + extraGoal, note: `每月自動提撥 ${GOALS.oven.monthly.toLocaleString()}，專款專用` },
  ];
  if (bonusNow) comItems.push({ name: `${GOALS.bonus.name}（本月提撥）`, amt: GOALS.bonus.monthly, note: `${GOALS.bonus.note}，${GOALS.bonus.due[1]}/${GOALS.bonus.due[2]} 發放` });
  if (privAmt) comItems.push({ name: '私人支出轉列老闆預支（視同已領）', amt: privAmt, note: '公司卡付的私人消費，轉列業主往來，從本月可領金額扣回' });
  const comTotal = comItems.reduce((s, x) => s + x.amt, 0);

  const avail = cash - taxTotal - safety - apTotal - comTotal;
  return {
    now, cash, cur, pos, est, fx, safetyMonths,
    layers: [
      { id: 'tax', name: '稅金預留', sub: '營業稅＋營所稅提列＋扣繳', amt: taxTotal, color: '#F0A531', icon: 'tax', items: taxItems },
      { id: 'safe', name: `${safetyMonths} 個月固定支出安全金`, sub: '租金、員工薪資、勞健保等', amt: safety, color: '#2E97D4', icon: 'shield', items: fx.rows.map(r => ({ name: r.name, amt: r.amt * safetyMonths, note: `每月 ${r.amt.toLocaleString()} × ${safetyMonths}（依 ${fx.from} 月實際帳務）` })) },
      { id: 'ap', name: '應付帳款', sub: '供應商月結＋老闆代墊', amt: apTotal, color: '#7C62E6', icon: 'receipt', items: apItems },
      { id: 'com', name: '已承諾支出', sub: '已下單、已簽約、專款專用', amt: comTotal, color: '#EC6A55', icon: 'lock', items: comItems },
    ],
    avail, availPos: Math.max(0, avail), advAmt, advLeft, privAmt,
  };
}

// ---- 稅金預留帳戶（每筆收款自動撥 rate） ----
export function reserveAccount(rate = 0.12, snap) {
  const now = new Date();
  const list = monthList();
  const start = new Date(list[0].y, list[0].m - 1, 1);
  const paid = store.orders.filter(o => o.status === 'paid' && (o.paidAt || o.ts) >= +start);
  const inflow = paid.reduce((s, o) => s + o.total, 0);
  const swept = r0(inflow * rate);
  // 已從預留帳戶繳出的稅（position 現金流中的營業稅＋已過期的扣繳）
  const flows = position(now.getFullYear(), now.getMonth() + 1).flows;
  const vatPaid = flows.reduce((s, f) => s + f.vat, 0);
  // 各完整月的扣繳於次月 10 日繳納；已過繳納日者視為已從預留帳戶繳出
  const whPaid = list.slice(0, -1).filter(x => new Date(x.y, x.m, 10, 23, 59) < now)
    .reduce((s, x) => s + withholdings(month(x.y, x.m)).reduce((a, r) => a + r.tax + r.nhi, 0), 0);
  const balance = swept - vatPaid - whPaid;
  const tax = snap.layers[0];
  const need = tax.amt;
  // 期末預估：本期營業稅以本月進度推估到期末
  const cur = snap.cur;
  const vatFull = r0(tax.items[0].amt + (cur.tax - cur.inTax) * (1 / cur.factor - 1));
  // 下一個繳稅日
  const cal = taxCalendar(now.getFullYear()).concat(taxCalendar(now.getFullYear() + 1));
  const next = (k) => cal.find(c => c.k === k && c.d > now && (k !== 'cit' || c.t.includes('結算')));
  const nVat = next('vat'), nWh = next('wh'), nCit = next('cit');
  const dues = [
    { k: 'wh', d: nWh.d, t: nWh.t, amt: tax.items[2].amt },
    { k: 'vat', d: nVat.d, t: nVat.t, amt: vatFull, sub: `目前累計 ${tax.items[0].amt.toLocaleString()}，依進度推估期末` },
    { k: 'cit', d: nCit.d, t: `${nCit.d.getFullYear() - 1912} 年度營所稅結算申報`, amt: snap.est.tax, sub: `已提列 ${tax.items[1].amt.toLocaleString()}／全年預估` },
  ].sort((a, b) => a.d - b.d);
  const monthlyIn = (flows.slice(0, -1).reduce((s, f) => s + f.receipts, 0) / Math.max(1, flows.length - 1));
  // 最近幾筆自動撥
  const feed = paid.slice(-7).reverse().map(o => ({ id: o.id, ts: o.paidAt || o.ts, who: o.customer, ch: o.channel, total: o.total, cut: r0(o.total * rate) }));
  return { rate, inflow, swept, vatPaid, whPaid, balance, need, gap: balance - need, dues, feed, monthlySweep: r0(monthlyIn * rate), start };
}

// ---- 領錢方式比較（簡化示意） ----
// 114 年度綜所稅級距與扣除額近似；單身、無其他所得、無扶養。
export const PIT = {
  exempt: 97000, standard: 131000, salaryDed: 218000,
  brackets: [[590000, 0.05], [1330000, 0.12], [2660000, 0.20], [4980000, 0.30], [Infinity, 0.40]],
  divCredit: 0.085, divCreditCap: 80000, divSeparate: 0.28, nhi: RATES.nhiSupp,
};
function bracketTax(x) {
  let t = 0, lo = 0;
  for (const [hi, r] of PIT.brackets) { if (x <= lo) break; t += (Math.min(x, hi) - lo) * r; lo = hi; }
  return t;
}
export function citOf(income) {
  if (income <= RATES.citExempt) return 0;
  return Math.min(r0(income * RATES.cit), r0((income - RATES.citExempt) / 2));
}
export function profitPool() {
  const est = annualEstimate();
  return { est, pool: est.income + OWNER.pay * 12, ownerPay: OWNER.pay };
}
// total：老闆一年從公司拿的總額（稅前）；share：其中董事酬勞的比例 0–1
export function payScenario(total, share, pool) {
  const S = r0(total * share);
  const cit = citOf(pool - S);
  const after = pool - S - cit;
  const D = Math.min(r0(total - S), Math.max(0, after));
  const capped = D < r0(total - S);
  const salaryNet = Math.max(0, S - PIT.salaryDed);
  const ded = PIT.exempt + PIT.standard;
  const merged = Math.max(0, bracketTax(Math.max(0, salaryNet + D - ded))) - Math.min(D * PIT.divCredit, PIT.divCreditCap);
  const separate = bracketTax(Math.max(0, salaryNet - ded)) + D * PIT.divSeparate;
  const pit = r0(Math.min(merged, separate));
  const method = D === 0 ? '—' : merged <= separate ? '股利合併計稅（8.5% 抵減）' : '股利分開計稅（28%）';
  const nhi = D > 20000 ? r0(D * PIT.nhi) : 0;
  const burden = cit + pit + nhi;
  const take = S + D - pit - nhi;
  return { S, D, cit, pit, nhi, burden, take, keep: after - D, method, capped };
}

// ---- 現金跑道（近 3 個月平均＋情境） ----
const SEASON = { 1: 1.15, 2: 1.08, 3: 0.95, 4: 0.97, 5: 1.0, 6: 0.95, 7: 0.9, 8: 0.92, 9: 1.08, 10: 1.0, 11: 1.03, 12: 1.2 };
export function runwayBase() {
  const now = new Date();
  const list = monthList();
  const flows = position(now.getFullYear(), now.getMonth() + 1).flows;
  const cur = month(now.getFullYear(), now.getMonth() + 1);
  const scale = (f, i) => (i === flows.length - 1 ? 1 / cur.factor : 1);
  const avg = (k) => r0(flows.reduce((s, f, i) => s + f[k] * scale(f, i), 0) / flows.length);
  const rin = avg('receipts'), buy = avg('buy'), exp = avg('exp'), hr = avg('hr');
  const vat = r0(flows.slice(0, -1).reduce((s, f) => s + f.vat, 0) / Math.max(1, flows.length - 1) || 0);
  return { rin, buy, exp, hr, vat, out: buy + exp + hr, list, buyRatio: buy / rin };
}
// rev：營收變動（-0.6 ~ +0.4）；draw：本月額外領取
export function runwayProject({ rev = 0, draw = 0, seasonal = true } = {}, snap) {
  const b = runwayBase();
  const now = new Date();
  const est = snap.est;
  const rng = mulberry32(5150);
  const pts = [{ label: '今天', ax: '今天', v: snap.cash, base: snap.cash, ev: [] }];
  let v = snap.cash, base = snap.cash;
  const fixedOut = b.exp + b.hr;
  let minV = v, minAt = '今天', negAt = null, vatDone = false;
  const cur = snap.cur;
  const vatFirst = r0(snap.layers[0].items[0].amt + Math.max(0, cur.tax - cur.inTax) * (1 / cur.factor - 1));
  for (let k = 0; k < 12; k++) {
    const d = new Date(now.getFullYear(), now.getMonth() + k, 1);
    const mm = d.getMonth() + 1;
    const frac = k === 0 ? 1 - snap.cur.factor : 1; // 本月剩餘天數
    const s = seasonal ? SEASON[mm] : 1;
    const noise = 0.97 + rng() * 0.06;
    const inBase = b.rin * s * noise * frac;
    const inS = inBase * (1 + rev);
    const ev = [];
    let lump = 0;
    if (k === 0 && draw > 0) { lump += draw; ev.push(['老闆本月領取', draw]); }
    for (const c of COMMITMENTS) if (c.due[0] === mm && k < 3) { lump += c.amt; ev.push([c.name, c.amt]); }
    if (mm === 5) { lump += est.tax; ev.push(['營所稅結算', est.tax]); }
    let vatS = 0, vatB = 0;
    if (mm % 2 === 1) {
      if (!vatDone) { vatB = vatFirst; vatS = vatFirst; vatDone = true; } // 本期已發生的部分，不受情境影響
      else { vatB = r0(b.vat * 2); vatS = r0(b.vat * 2 * (1 + rev)); }
      ev.push(['營業稅', vatS]);
    }
    // 變動成本隨營收、固定支出不變
    const outS = inS * b.buyRatio + fixedOut * frac;
    const outB = inBase * b.buyRatio + fixedOut * frac;
    v = v + inS - outS - lump - vatS;
    base = base + inBase - outB - lump - vatB;
    const yr = d.getFullYear() !== now.getFullYear();
    const label = `${yr ? d.getFullYear() + ' 年 ' : ''}${mm} 月底`;
    pts.push({ label, ax: `${yr ? String(d.getFullYear()).slice(2) + '/' : ''}${mm}月`, v: r0(v), base: r0(base), ev });
    if (v < minV) { minV = v; minAt = label; }
    if (v < 0 && !negAt) negAt = { k: k + 1, label };
  }
  const monthNet = b.rin * (1 + rev) - b.rin * (1 + rev) * b.buyRatio - fixedOut - b.vat;
  // 零收入時：扣掉稅金、應付與已承諾後的現金，還能付幾個月固定支出（含老闆董事酬勞）
  const burnZero = snap.fx.total + OWNER.pay;
  const liquid = snap.cash - snap.layers[0].amt - snap.layers[2].amt - snap.layers[3].amt;
  return { pts, b, minV: r0(minV), minAt, negAt, monthNet: r0(monthNet), zeroMonths: Math.max(0, liquid) / burnZero, burnZero, fixedOut, liquid };
}
