// AI 晨報：資料推導（從 store / ledger 計算）＋固定種子模擬，以及三語摘要文字
import { store } from './state.js';
import { PRODUCTS, PRODUCT_MAP, CHANNELS, CHANNEL_MAP, mulberry32, startOfDay, addDays } from './data.js';
import { taxCalendar, STAFF } from './ledger.js';
import { pad, fmtMD } from './util.js';
import { TENANT, TENANT_ID } from './tenant.js';
import { pName } from './i18n.js';

// ---------- 業態用語（多業主）：後台各模組依「業態大類」挑選情境文案 ----------
// 阿美（IS_AMEI）維持原本的甜點示範劇本；其他業主依 TENANT.cat（或 type）套用下列用語
export const IS_AMEI = TENANT_ID === 'amei';
const CAT_OF_TYPE = { dessert: 'dessert', coffee: 'drink', leather: 'craft', flower: 'flower', service: 'service', food: 'food' };
export const CAT = TENANT.cat || CAT_OF_TYPE[TENANT.type] || 'retail';
const VOC_CAT = {
  dessert: { make: '生產', remake: '補做', focus: '做好每一份點心', material: '主要原料', alt: '調整配方或改用同級替代原料', confirm: '確認取貨日', ship: '出貨' },
  drink: { make: '製作', remake: '補貨', focus: '做好每一杯', material: '原料', alt: '調整配方比例或改用同級替代原料', confirm: '確認取貨日', ship: '出貨' },
  food: { make: '備料', remake: '補備料', focus: '把每一道菜做好', material: '主要食材', alt: '調整份量或改用同級替代食材', confirm: '確認取餐時間', ship: '出餐' },
  craft: { make: '製作', remake: '補做', focus: '做好每一件作品', material: '主要材料', alt: '改用同等級替代材料打樣比較', confirm: '確認刻字與交期', ship: '出貨' },
  flower: { make: '備花', remake: '補花材', focus: '包好每一束花', material: '花材', alt: '改用當季在地花材搭配', confirm: '確認配送時段與卡片', ship: '配送' },
  service: { make: '備料', remake: '補耗材', focus: '服務好每一位客人', material: '耗材', alt: '比較其他同級耗材供應商', confirm: '確認預約時段', ship: '準備' },
  retail: { make: '補貨', remake: '補貨', focus: '挑好每一件商品', material: '進貨', alt: '與供應商議價或改找替代貨源', confirm: '確認寄送資訊', ship: '出貨' },
  farm: { make: '採收包裝', remake: '補採收', focus: '照顧好每一批作物', material: '包材與運費', alt: '調整包裝規格或改用替代包材', confirm: '確認寄送日', ship: '出貨' },
};
// 商品內容判斷（依商品資料，不依業主 id）：飲品類若賣咖啡豆，用語改成烘豆
const PTXT = PRODUCTS.map(p => `${p.name}${p.desc || ''}`).join('|');
export const HAS_BEANS = /咖啡/.test(PTXT) && /咖啡豆|烘豆|淺焙|中焙|深焙|配方豆|掛耳/.test(PTXT);
// 外帶型（餐飲；或飲品大多是「杯」裝現做）：對話情境用外帶／外送，而不是宅配
export const DRINK_TAKEOUT = CAT === 'drink' && PRODUCTS.filter(p => /杯/.test(p.unit || '')).length >= 3;
export const TAKEOUT = CAT === 'food' || DRINK_TAKEOUT;
// 商品量詞：「1 杯（700ml）」→ 杯；沒有就用「份」
export const measure = (p) => ((String((p && p.unit) || '').match(/^1\s*([^\d\s（(、,，]{1,2})/) || [])[1]) || '份';
export const VOC = { ...VOC_CAT.retail, ...(VOC_CAT[CAT] || {}), ...(DRINK_TAKEOUT ? { make: '備料', remake: '補備料', focus: '做好每一杯', confirm: '確認取餐時間', ship: '出餐' } : {}), ...(CAT === 'drink' && HAS_BEANS ? { make: '烘豆', remake: '補烘', focus: '烘好每一鍋豆子', material: '生豆', alt: '改用同產區次批次生豆並重新杯測' } : {}) };
export const CITY = (TENANT.region || '台北市').slice(0, 2);
// 助理（可能沒有）：全職優先，其次任一非負責人
export const ASSISTANT = STAFF.find(s => s.kind === 'full') || STAFF.find(s => s.kind !== 'owner') || null;
// 負責出貨／外送的人（可能沒有）：職稱含出貨、外送、包裝者優先，其次兼職
export const SHIPPER = IS_AMEI ? STAFF.find(s => s.name === '小傑') || null
  : (STAFF.find(s => s.kind !== 'owner' && /出貨|外送|包裝|配送/.test(s.title || '')) || STAFF.find(s => s.kind === 'part') || null);
export const SUPPLIERS = Array.isArray(TENANT.suppliers) ? TENANT.suppliers : [];

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
const WEEK_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEK_JA = ['日', '月', '火', '水', '木', '金', '土'];
export const WEATHER = { city: IS_AMEI ? '台北' : CITY, temp: 26, feels: 28, text: '多雲', rain: 20, hum: 72, hi: 29, lo: 23 };

const pct = (a, b) => (b ? (a - b) / b * 100 : 0);
const sum = (l, k = 'total') => l.reduce((s, o) => s + o[k], 0);
const qtyBy = (list) => { const m = {}; for (const o of list) for (const it of o.items) m[it.pid] = (m[it.pid] || 0) + it.qty; return m; };

// ---------- 昨日與比較 ----------
export function yesterdayStats(now = new Date()) {
  const today = startOfDay(now);
  const y = store.ordersBetween(addDays(today, -1), today);
  const lw = store.ordersBetween(addDays(today, -8), addDays(today, -7));
  const q = qtyBy(y);
  const top = Object.entries(q).sort((a, b) => b[1] - a[1])[0] || [PRODUCTS[0].id, 0];
  const pending = store.orders.filter(o => o.status === 'pending');
  const inv = store.inventory();
  const low = inv.filter(p => p.low).sort((a, b) => a.current / a.safety - b.current / b.safety);
  return {
    date: addDays(today, -1), rev: sum(y), orders: y.length, lwRev: sum(lw), delta: pct(sum(y), sum(lw)),
    top: PRODUCT_MAP[top[0]], topQty: top[1], pending: pending.length, pendingAmt: sum(pending), low,
    avg: y.length ? sum(y) / y.length : 0,
  };
}

// ---------- 今日預估（依過去 4 個同星期幾、逐小時） ----------
export function forecast(now = new Date()) {
  const today = startOfDay(now);
  const weeks = [1, 2, 3, 4].map(k => addDays(today, -7 * k));
  const hourRev = Array.from({ length: 24 }, () => []);
  const hourCnt = Array.from({ length: 24 }, () => []);
  const prodQty = {};
  for (const d of weeks) {
    const list = store.ordersBetween(d, addDays(d, 1));
    const r = new Array(24).fill(0), c = new Array(24).fill(0);
    for (const o of list) { const h = new Date(o.ts).getHours(); r[h] += o.total; c[h] += 1; for (const it of o.items) prodQty[it.pid] = (prodQty[it.pid] || 0) + it.qty; }
    for (let h = 0; h < 24; h++) { hourRev[h].push(r[h]); hourCnt[h].push(c[h]); }
  }
  // 成長係數：近 14 天 vs 前 14 天（上下限 ±12%），天氣多雲小降雨 ×0.98
  const a = sum(store.ordersBetween(addDays(today, -14), today)), b = sum(store.ordersBetween(addDays(today, -28), addDays(today, -14)));
  const growth = Math.max(0.88, Math.min(1.12, b ? Math.pow(a / b, 0.5) : 1)) * 0.98;
  const mean = (v) => v.reduce((s, x) => s + x, 0) / v.length;
  const sd = (v) => { const m = mean(v); return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / v.length); };
  const hours = Array.from({ length: 24 }, (_, h) => {
    const m = mean(hourRev[h]) * growth, s = sd(hourRev[h]) * growth;
    const mc = mean(hourCnt[h]) * growth, sc = sd(hourCnt[h]) * growth;
    return { h, rev: m, lo: Math.max(0, m - 0.8 * s), hi: m + 0.8 * s + m * 0.06, cnt: mc, clo: Math.max(0, mc - 1.1 * sc), chi: mc + 1.1 * sc };
  });
  // 相鄰小時平滑（0.25／0.5／0.25），讓曲線反映趨勢而非單日雜訊
  const smooth = (k) => { const v = hours.map(x => x[k]); hours.forEach((x, i) => { x[k] = (v[Math.max(0, i - 1)] * 0.25 + v[i] * 0.5 + v[Math.min(23, i + 1)] * 0.25); }); };
  ['rev', 'lo', 'hi', 'cnt', 'clo', 'chi'].forEach(smooth);
  const todayList = store.ordersBetween(today, addDays(today, 1));
  const actual = new Array(24).fill(0), actualCnt = new Array(24).fill(0);
  for (const o of todayList) { const h = new Date(o.ts).getHours(); actual[h] += o.total; actualCnt[h] += 1; }
  const totRev = sum(hours.map(x => ({ total: x.rev }))), totCnt = hours.reduce((s, x) => s + x.cnt, 0);
  // 區間：各小時誤差不完全相關，取平方和開根號再放大
  const rSpread = Math.sqrt(hours.reduce((s, x) => s + ((x.hi - x.lo) / 2) ** 2, 0)) * 1.6;
  const cSpread = Math.sqrt(hours.reduce((s, x) => s + ((x.chi - x.clo) / 2) ** 2, 0)) * 1.6;
  const products = PRODUCTS.map(p => {
    const inv = store.inventory().find(x => x.id === p.id);
    const demand = (prodQty[p.id] || 0) / weeks.length * growth;
    const tomorrow = demand * 0.9;
    const fresh = p.storage === 'fridge' && p.days <= 4;
    const need = Math.ceil(demand + (fresh ? tomorrow * 0.6 : tomorrow * 1.5) + p.safety - inv.current);
    const batch = p.id === 'lemon' || p.id === 'canele' ? 2 : 1;
    const suggest = Math.max(0, Math.ceil(need / batch) * batch);
    return { ...p, demand, current: inv.current, low: inv.low, suggest, fresh };
  });
  return {
    hours, actual, actualCnt, growth, nowHour: now.getHours(),
    rev: totRev, revLo: Math.max(0, totRev - rSpread), revHi: totRev + rSpread,
    cnt: totCnt, cntLo: Math.max(0, totCnt - cSpread), cntHi: totCnt + cSpread,
    sofar: sum(todayList), sofarCnt: todayList.length, products,
  };
}

// ---------- 異常偵測 ----------
export function anomalies(now = new Date()) {
  const today = startOfDay(now);
  const cur = store.ordersBetween(addDays(today, -7), today), prev = store.ordersBetween(addDays(today, -14), addDays(today, -7));
  const cc = {}, pc = {};
  for (const o of cur) cc[o.channel] = (cc[o.channel] || 0) + 1;
  for (const o of prev) pc[o.channel] = (pc[o.channel] || 0) + 1;
  const rows = CHANNELS.filter(c => (pc[c.id] || 0) >= 10).map(c => ({ ch: c, cur: cc[c.id] || 0, prev: pc[c.id] || 0, d: pct(cc[c.id] || 0, pc[c.id] || 0) }));
  const down = [...rows].sort((a, b) => a.d - b.d)[0];
  const up = [...rows].sort((a, b) => b.d - a.d)[0];
  const daily = (chId) => Array.from({ length: 14 }, (_, i) => { const d = addDays(today, -14 + i); return store.ordersBetween(d, addDays(d, 1)).filter(o => o.channel === chId).length; });

  // 毛利異常（模擬，固定種子）：阿美＝草莓生乳捲的草莓進價上漲；其他業主＝主力商品的主要原物料進價上漲
  const rng = mulberry32(5150);
  const roll = (IS_AMEI && PRODUCT_MAP.roll) || PRODUCTS[0];
  const netPrice = roll.price / 1.05;
  const weeks = 8;
  const costs = Array.from({ length: weeks }, (_, i) => Math.round(roll.cost * (1 + (i < 4 ? 0 : (i - 3) * 0.032) + (rng() - 0.5) * 0.012)));
  const margins = costs.map(c => +((netPrice - c) / netPrice * 100).toFixed(1));
  const costUp = pct(costs[weeks - 1], costs[0]);
  const sup = SUPPLIERS[0];
  const margin = IS_AMEI
    ? { title: '草莓生乳捲毛利下降',
      body: `大湖果園草莓進價 8 週上漲 ${costUp.toFixed(0)}%，毛利率 ${margins[0]}% → ${margins[weeks - 1]}%（${(margins[weeks - 1] - margins[0]).toFixed(1)}pt）。`,
      tip: '建議售價調至 NT$ 620，或改用冷凍草莓泥內餡' }
    : { title: `${roll.name}毛利下降`,
      body: `${sup ? `${sup.vendor}「${sup.item}」` : VOC.material}進價 8 週上漲 ${costUp.toFixed(0)}%，毛利率 ${margins[0]}% → ${margins[weeks - 1]}%（${(margins[weeks - 1] - margins[0]).toFixed(1)}pt）。`,
      tip: `建議售價調至 NT$ ${(Math.ceil(roll.price * 1.06 / 10) * 10).toLocaleString('en-US')}，或${VOC.alt}` };

  return [
    { id: 'down', level: 'bad', title: `${down.ch.name} 訂單比上週少 ${Math.abs(down.d).toFixed(0)}%`,
      body: `近 7 天 ${down.cur} 筆，前 7 天 ${down.prev} 筆。AI 判斷：上週推播優惠到期、回購客減少。`,
      tip: `建議對 ${down.ch.name} 會員推播回流優惠`, action: { label: '設定推播', go: 'crm' },
      spark: daily(down.ch.id), color: '#EC6A55', unit: '筆' },
    { id: 'margin', level: 'warn', title: margin.title, body: margin.body, tip: margin.tip,
      action: { label: IS_AMEI ? '查看配方成本' : '查看商品成本', go: 'inventory' },
      spark: margins, color: '#F0A531', unit: '%' },
    { id: 'up', level: 'good', title: `${up.ch.name} 訂單比上週多 ${up.d.toFixed(0)}%`,
      body: `近 7 天 ${up.cur} 筆，前 7 天 ${up.prev} 筆。AI 導購推薦${IS_AMEI ? '禮盒' : ''}組合的轉換率提升。`,
      tip: '建議把相同推薦組合同步到 LINE 選單', action: { label: '看會員分眾', go: 'crm' },
      spark: daily(up.ch.id), color: '#2DB674', unit: '筆' },
  ];
}

// ---------- 目標進度 ----------
export function goals(now = new Date()) {
  const k = store.kpis();
  const lastStart = new Date(now.getFullYear(), now.getMonth() - 1, 1), monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastRev = sum(store.ordersBetween(lastStart, monthStart));
  const target = Math.max(300000, Math.round(lastRev * 1.06 / 50000) * 50000);
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const elapsed = (now.getDate() - 1 + now.getHours() / 24) / days;
  const projected = elapsed > 0.02 ? k.month / elapsed : lastRev;
  const monthOrders = store.ordersBetween(monthStart, addDays(startOfDay(now), 1));
  const rng = mulberry32(20261005 + now.getMonth());
  const members = Math.round(monthOrders.filter(o => o.channel !== 'pos').length * 0.38 + 6 + rng() * 3);
  const memTarget = 60;
  return {
    timePct: elapsed * 100,
    items: [
      { id: 'rev', name: '本月營收', value: k.month / target * 100, big: k.month, target, fmt: 'money', color: '#2DB674', color2: '#5EE0C4',
        sub: `目標 NT$ ${(target / 10000).toFixed(0)} 萬・依目前步調月底約 NT$ ${(projected / 10000).toFixed(1)} 萬` },
      { id: 'mem', name: '新增會員', value: members / memTarget * 100, big: members, target: memTarget, fmt: 'count', color: '#2E97D4', color2: '#5EE0C4',
        sub: `目標 ${memTarget} 位・LINE 加好友自動入會` },
      { id: 'rate', name: '好評率', value: 96.4, big: 96.4, target: 95, fmt: 'pct', color: '#F0A531', color2: '#F4D35E',
        sub: '近 30 天 4.9 ★・138 則評價・目標 95%' },
      { id: 'auto', name: 'AI 自動處理率', value: 92.7, big: 92.7, target: 90, fmt: 'pct', color: '#7C62E6', color2: '#DD5597',
        sub: '訊息、訂單、對帳免人工・目標 90%' },
    ],
  };
}

// ---------- 昨晚 AI 做了什麼 ----------
const LANG_VERB = { ja: '用日文', en: '用英文', vi: '用越南文', ms: '用馬來文', zh: '' };
const CH_NAME = { line: 'LINE', web: '官網', pos: '門市', phone: '電話', whatsapp: 'WhatsApp', zalo: 'Zalo', messenger: 'Messenger' };

export function overnight(now = new Date()) {
  const today = startOfDay(now);
  const from = new Date(addDays(today, -1)); from.setHours(18, 0, 0, 0);
  const to = new Date(today); to.setHours(8, 0, 0, 0);
  const ords = store.ordersBetween(from, Math.min(+to, +now));
  const y = store.ordersBetween(addDays(today, -1), today);
  const at = (h, m, dayOffset = 0) => { const d = addDays(today, dayOffset); d.setHours(h, m, 0, 0); return d.getTime(); };
  const ev = [];
  // 挑出代表性的真實訂單：外語優先、電話、其他
  const picked = [];
  const pick = (fn) => { const o = ords.find(x => fn(x) && !picked.includes(x)); if (o) picked.push(o); };
  pick(o => o.lang === 'ja'); pick(o => o.lang === 'en'); pick(o => o.lang === 'vi'); pick(o => o.channel === 'phone'); pick(o => o.channel === 'line');
  while (picked.length < 4 && picked.length < ords.length) pick(() => true);
  const itemsTxt = (o) => o.items.map(it => `${PRODUCT_MAP[it.pid]?.name || it.pid}×${it.qty}`).join('、');
  for (const o of picked) {
    let text;
    if (o.channel === 'phone') text = `AI 電話接聽 ${o.customer}，複述確認後成立訂單：${itemsTxt(o)}`;
    else if (LANG_VERB[o.lang]) text = `在 ${CH_NAME[o.channel]} ${LANG_VERB[o.lang]}回覆 ${o.customer} 的詢問，推薦後成立訂單：${itemsTxt(o)}`;
    else text = `在 ${CH_NAME[o.channel]} 自動回覆 ${o.customer}，${IS_AMEI ? '確認取貨日' : VOC.confirm}並成立訂單：${itemsTxt(o)}`;
    ev.push({ ts: o.ts, kind: 'order', ch: o.channel, lang: o.lang, text, meta: `NT$ ${o.total.toLocaleString()}・發票 ${o.invoice}${o.status === 'pending' ? '・待付款' : ''}`, real: true });
  }
  const rest = ords.length - picked.length;
  const paidY = y.filter(o => o.status === 'paid' && o.payment !== '現金').length;
  const pendingY = store.orders.filter(o => o.status === 'pending');
  const low = store.inventory().filter(p => p.low);
  const next = taxCalendar(now.getFullYear()).concat(taxCalendar(now.getFullYear() + 1)).find(t => t.d > now);
  const dleft = next ? Math.ceil((next.d - now) / 86400000) : 0;
  const assistant = IS_AMEI ? STAFF.find(s => s.kind === 'full') : ASSISTANT;
  const sched = IS_AMEI ? '生產排程' : `${VOC.make}排程`;
  const supMeta = IS_AMEI ? '供應商：北海乳品、山城農產' : (SUPPLIERS.length ? `供應商：${SUPPLIERS.slice(0, 2).map(x => x.vendor).join('、')}` : '');
  ev.push(
    { ts: at(23, 30, -1), kind: 'invoice', text: `完成昨日日結：${y.length} 筆訂單、${y.length} 張電子發票上傳財政部平台，自動產生會計分錄`, meta: `營收 NT$ ${sum(y).toLocaleString()}` },
    { ts: at(2, 30), kind: 'bank', text: `自動對帳 ${paidY} 筆：銀行入帳、LINE Pay、信用卡撥款與訂單逐筆核對`, meta: '差異 0 筆・應收帳款已沖銷' },
    { ts: at(3, 10), kind: 'shield', text: '加密備份帳務與訂單資料，完成資安弱點掃描', meta: 'AES-256・異地備份' },
    { ts: at(5, 45), kind: 'trend', text: `依天氣（${WEATHER.city} ${WEATHER.temp}°C ${WEATHER.text}）、星期${WEEK[now.getDay()]}與近 4 週資料更新今日銷售預測`, meta: '預測模型 v3・誤差 ±9%' },
    { ts: at(6, 0), kind: 'factory', text: assistant ? `產生今日${sched}並傳給${assistant.name}（09:00 上工）` : `產生今日${sched}，已排進你的行事曆`, meta: low.length ? `優先：${low.map(p => p.name).join('、')}` : '依預估需求排程' },
    { ts: at(6, 20), kind: 'box', text: low.length ? `偵測到 ${low.length} 項低於安全庫存，已草擬${IS_AMEI ? '原料' : ''}採購單待你確認` : '庫存檢查完成，所有品項高於安全庫存', meta: low.length ? supMeta : '' },
    { ts: at(7, 0), kind: 'coins', text: `發送 ${pendingY.length} 筆待付款提醒（LINE／Email 付款連結）`, meta: `合計 NT$ ${sum(pendingY).toLocaleString()}` },
  );
  if (next) ev.push({ ts: at(7, 30), kind: 'tax', text: `提醒：${next.t} 截止日 ${fmtMD(next.d)}（剩 ${dleft} 天），資料已備妥`, meta: '營業稅與扣繳自動試算完成' });
  ev.sort((a, b) => a.ts - b.ts);
  const msgs = ords.length * 6 + 17 + rest;
  const minutes = msgs * 1.4 + ords.length * 5 + paidY * 1.2 + y.length * 0.6 + 25 + 15 + 10;
  return { events: ev, stats: { msgs, orders: ords.length, recon: paidY, hours: minutes / 60 }, rest };
}

// ---------- 今日待辦 ----------
export function todos(now = new Date()) {
  const ys = yesterdayStats(now);
  const next = taxCalendar(now.getFullYear()).concat(taxCalendar(now.getFullYear() + 1)).find(t => t.d > now);
  const vat = taxCalendar(now.getFullYear()).concat(taxCalendar(now.getFullYear() + 1)).find(t => t.d > now && t.k === 'vat');
  const list = [];
  if (ys.low.length) {
    const p = ys.low[0];
    list.push({ id: 'restock', pri: 'high', icon: 'box', title: `補貨${p.name}`, desc: `剩 ${p.current} 個，低於安全庫存 ${p.safety}${ys.low.length > 1 ? `（另有 ${ys.low.slice(1).map(x => x.name).join('、')}）` : ''}，建議今天${IS_AMEI ? '補做' : VOC.remake}`, btn: '前往庫存', go: 'inventory' });
  }
  if (ys.pending) list.push({ id: 'collect', pri: 'high', icon: 'coins', title: `催收 ${ys.pending} 筆待付款`, desc: `合計 NT$ ${ys.pendingAmt.toLocaleString()}，AI 已發第一次提醒，逾 48 小時的建議改用電話`, btn: '前往對帳', go: 'bank' });
  list.push({ id: 'tax', pri: 'mid', icon: 'tax', title: '確認營業稅試算', desc: `${vat ? `${vat.t}（${fmtMD(vat.d)} 截止）` : '本期營業稅'}，AI 已比對進銷項發票${next && next.k !== 'vat' ? `；${next.t} ${fmtMD(next.d)} 截止` : ''}`, btn: '查看試算', go: 'tax' });
  list.push({ id: 'review', pri: 'mid', icon: 'chat', title: '回覆 2 則評論', desc: 'Google 評論 1 則（4★ 提到等待太久）、官網 1 則日文評論，AI 已草擬回覆', btn: '一鍵送出', toast: ['已送出 2 則評論回覆', 'AI 以中文與日文回覆，語氣依你的品牌設定'] });
  if (IS_AMEI) list.push({ id: 'prod', pri: 'low', icon: 'factory', title: '確認今日生產排程', desc: '小芸 09:00 上工，AI 依預估需求排了 4 項，約 5.5 小時', btn: '查看排班', go: 'staff' });
  else list.push({ id: 'prod', pri: 'low', icon: 'factory', title: `確認今日${VOC.make}排程`, desc: ASSISTANT ? `${ASSISTANT.name} 09:00 上工，AI 依預估需求排了 4 項，約 5.5 小時` : '目前只有你一人，AI 依預估需求排了 4 項，已避開出貨與回覆高峰', btn: '查看排班', go: 'staff' });
  list.push({ id: 'line', pri: 'low', icon: 'heart', title: '推播週末回流優惠', desc: 'AI 選出 86 位 30 天未回購的會員，文案已用中／日文產生', btn: '設定推播', go: 'crm' });
  return list;
}

// ---------- 三語摘要 ----------
export const LANGS = [
  { id: 'zh', label: '中文', tts: 'zh-TW' },
  { id: 'en', label: 'English', tts: 'en-US' },
  { id: 'ja', label: '日本語', tts: 'ja-JP' },
];

// 回傳片段陣列 [{ t, hl }]，hl 為強調色類別
export function summary(lang = 'zh', now = new Date()) {
  const ys = yesterdayStats(now);
  const fc = forecast(now);
  const up = ys.delta >= 0;
  const d = Math.abs(ys.delta).toFixed(1);
  const n = (v) => Math.round(v).toLocaleString('en-US');
  const low = ys.low[0];
  const md = `${ys.date.getMonth() + 1}/${ys.date.getDate()}`;
  if (lang === 'en') {
    return [
      { t: `Good morning, ${IS_AMEI ? 'Amei' : TENANT.owner}! Yesterday (${WEEK_EN[ys.date.getDay()]}, ${md}) you made ` }, { t: `NT$ ${n(ys.rev)}`, hl: 'g' },
      { t: ` from ` }, { t: `${ys.orders} orders`, hl: 'g' }, { t: `, ` }, { t: `${up ? 'up' : 'down'} ${d}%`, hl: up ? 'g' : 'r' },
      { t: ` versus the same day last week. Your best seller was the ` }, { t: enName(ys.top.id), hl: 'a' }, { t: ` with ${ys.topQty} sold. ` },
      { t: `There are ` }, { t: `${ys.pending} unpaid orders`, hl: 'a' }, { t: ` worth NT$ ${n(ys.pendingAmt)}, and I have already sent payment reminders. ` },
      ...(low ? [{ t: `The ${enName(low.id)} is down to ` }, { t: `${low.current} left`, hl: 'r' }, { t: `, below the safety level, so please ${IS_AMEI ? 'bake more' : 'restock'} today. ` }] : []),
      { t: `Today I expect about ` }, { t: `NT$ ${n(fc.rev)}`, hl: 'g' }, { t: ` in sales. Have a lovely day!` },
    ];
  }
  if (lang === 'ja') {
    return [
      { t: `おはようございます、${IS_AMEI ? 'アメイ' : TENANT.owner}さん！昨日（${md}・${WEEK_JA[ys.date.getDay()]}曜日）の売上は ` }, { t: `NT$ ${n(ys.rev)}`, hl: 'g' },
      { t: `、注文は ` }, { t: `${ys.orders} 件`, hl: 'g' }, { t: `で、先週の同じ曜日より ` }, { t: `${d}% ${up ? '増加' : '減少'}`, hl: up ? 'g' : 'r' },
      { t: `しました。一番の人気は ` }, { t: jaName(ys.top.id), hl: 'a' }, { t: `で ${ys.topQty} 個売れました。未入金の注文が ` },
      { t: `${ys.pending} 件`, hl: 'a' }, { t: `（合計 NT$ ${n(ys.pendingAmt)}）あり、支払いリマインドは送信済みです。` },
      ...(low ? [{ t: `${jaName(low.id)}の在庫は残り ` }, { t: `${low.current} 個`, hl: 'r' }, { t: `で安全在庫を下回っているので、今日の補充をおすすめします。` }] : []),
      { t: `今日の売上予測は約 ` }, { t: `NT$ ${n(fc.rev)}`, hl: 'g' }, { t: ` です。素敵な一日を！` },
    ];
  }
  return [
    { t: `早安${IS_AMEI ? '阿美' : TENANT.owner}！昨天（${md} 週${WEEK[ys.date.getDay()]}）營收 ` }, { t: `NT$ ${n(ys.rev)}`, hl: 'g' },
    { t: `，共 ` }, { t: `${ys.orders} 筆訂單`, hl: 'g' }, { t: `，比上週同日${up ? '成長' : '減少'} ` }, { t: `${d}%`, hl: up ? 'g' : 'r' },
    { t: `。最熱賣的是` }, { t: ys.top.name, hl: 'a' }, { t: `，賣出 ${ys.topQty} 份。目前有 ` }, { t: `${ys.pending} 筆待付款`, hl: 'a' },
    { t: `、合計 NT$ ${n(ys.pendingAmt)}，AI 已自動發送付款提醒。` },
    ...(low ? [{ t: `${low.name}庫存剩 ` }, { t: `${low.current} 個`, hl: 'r' }, { t: `，低於安全庫存，建議今天${IS_AMEI ? '補做' : VOC.remake}。` }] : []),
    { t: `今天預估營收約 ` }, { t: `NT$ ${n(fc.rev)}`, hl: 'g' }, { t: `，祝你有美好的一天！` },
  ];
}
function enName(id) { if (!IS_AMEI) return pName('en', id); return { lemon: 'lemon tart', roll: 'strawberry cream roll', basque: 'taro Basque cheesecake', pound: 'oolong pound cake', cookie: 'cookie gift box', pineapple: 'pineapple cake box', canele: 'Earl Grey canelé' }[id] || id; }
function jaName(id) { if (!IS_AMEI) return pName('ja', id); return { lemon: 'レモンタルト', roll: 'いちごロールケーキ', basque: 'タロイモバスクチーズケーキ', pound: '烏龍茶パウンドケーキ', cookie: 'クッキーギフトボックス', pineapple: 'パイナップルケーキ', canele: 'アールグレイカヌレ' }[id] || id; }

export function todayKey(now = new Date()) { return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`; }
export { CHANNEL_MAP };
