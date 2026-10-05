// AI 經營顧問：週報推導、決策試算引擎、問顧問規則、政府資源媒合
// 全部為示範資料與簡化試算；價格彈性、產能、平台抽成等皆為示範假設，非真實數據。
import { store } from './state.js';
import { PRODUCTS, PRODUCT_MAP, CHANNELS, CHANNEL_MAP, startOfDay, addDays } from './data.js';
import { month, monthList, position, annualEstimate, RATES, PAYROLL, payrollRow, RD_PROJECTS } from './ledger.js';

export const n0 = (v) => Math.round(v).toLocaleString('en-US');
export const nt = (v) => `NT$ ${n0(v)}`;
export const snt = (v) => `${v < 0 ? '−' : '+'}NT$ ${n0(Math.abs(v))}`;
export const r100 = (v) => Math.round(v / 100) * 100;
export const wan = (v) => { const a = Math.abs(v), s = v < 0 ? '−' : ''; return a >= 10000 ? `${s}${(a / 10000).toFixed(a >= 1e6 ? 0 : 1)} 萬` : `${s}${n0(a)}`; };
const sp = (name) => (/[A-Za-z]$/.test(name) ? `${name} ` : name);
const pctOf = (a, b) => (b ? (a - b) / b * 100 : 0);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const VAR_FEE = 0.06; // 包材、金流等變動費用占售價（示範假設）
const WD = ['日', '一', '二', '三', '四', '五', '六'];

// ---------- 基準數據（與會計帳務同一套帳：ledger.month / position） ----------
export function baseline() {
  const now = new Date();
  const list = monthList(now);
  const fullL = list.filter(x => !x.current);
  const full = fullL.map(x => month(x.y, x.m));
  const curL = list[list.length - 1];
  const cur = month(curL.y, curL.m);
  const avg = (k) => full.reduce((s, d) => s + d[k], 0) / full.length;
  const prods = PRODUCTS.map(p => {
    const qty = full.reduce((s, d) => s + (d.byProd.find(x => x.id === p.id)?.qty || 0), 0) / full.length;
    const unitNet = p.price / 1.05, unitGM = unitNet - p.cost;
    return { id: p.id, name: p.name, unit: p.unit, price: p.price, cost: p.cost, gift: p.gift, storage: p.storage, days: p.days, color: p.accent,
      qty, unitNet, unitGM, gm: unitGM / unitNet, rev: qty * unitNet, gp: qty * unitGM };
  });
  const units = prods.reduce((s, p) => s + p.qty, 0);
  const prodRev = prods.reduce((s, p) => s + p.rev, 0), prodGP = prods.reduce((s, p) => s + p.gp, 0);
  const avgUnitNet = prodRev / units, avgUnitGM = prodGP / units;
  const pos = position(curL.y, curL.m);
  const cash = pos.assets[0][1];
  const ff = pos.flows.slice(0, -1);
  const fixedOut = ff.reduce((s, f) => s + f.exp + f.hr, 0) / ff.length;
  const nOrders = full.reduce((s, d) => s + d.orders.length, 0);
  const byCh = CHANNELS.map(c => {
    const os = full.flatMap(d => d.orders.filter(o => o.channel === c.id));
    const net = os.reduce((s, o) => s + o.net, 0) / full.length, gp = os.reduce((s, o) => s + o.net - o.cost, 0) / full.length;
    return { id: c.id, name: c.name, color: c.color, net, gp, orders: os.length / full.length, perOrder: os.length ? gp * full.length / os.length : 0 };
  });
  // 近 4 週：週末 vs 平日每日訂單
  const t0 = startOfDay(now);
  let we = 0, weN = 0, wd = 0, wdN = 0;
  for (let i = 1; i <= 28; i++) {
    const d = addDays(t0, -i), n = store.ordersBetween(d, addDays(d, 1)).length, w = d.getDay();
    if (w === 0 || w === 6) { we += n; weN++; } else if (w >= 1 && w <= 4) { wd += n; wdN++; }
  }
  const payroll = PAYROLL();
  const gift = prods.filter(p => p.gift);
  return {
    now, full, cur, curL, monthsTxt: fullL.map(x => x.m + ' 月').join('、'),
    net: avg('net'), cost: avg('cost'), gross: avg('gross'), opex: avg('opex'), pretax: avg('pretax'), rd: avg('rd'),
    margin: avg('gross') / avg('net'), netMargin: avg('pretax') / avg('net'),
    prods, units, avgUnitNet, avgUnitGM, contribUnit: avgUnitGM - avgUnitNet * VAR_FEE, costRatio: 1 - prodGP / prodRev,
    cash, fixedOut, runway: cash / fixedOut, ar: pos.assets[1][1],
    orders: nOrders / full.length, aov: full.reduce((s, d) => s + d.total, 0) / nOrders, byCh,
    weekendDay: we / Math.max(1, weN), weekdayDay: wd / Math.max(1, wdN),
    payroll, staffCost: payroll.filter(p => p.kind !== 'owner').reduce((s, p) => s + p.cost, 0),
    giftShare: gift.reduce((s, p) => s + p.rev, 0) / prodRev, giftQty: gift.reduce((s, p) => s + p.qty, 0),
    overseasShare: byCh.filter(c => c.id === 'whatsapp' || c.id === 'zalo').reduce((s, c) => s + c.net, 0) / avg('net'),
    est: annualEstimate(), rdProjects: RD_PROJECTS,
  };
}

// ---------- 本週經營檢討（近 7 天 vs 前 7 天） ----------
function agg(list) {
  const ch = {}, pq = {}, pg = {};
  let net = 0, total = 0;
  for (const o of list) {
    net += o.net; total += o.total; ch[o.channel] = (ch[o.channel] || 0) + o.net;
    for (const it of o.items) { pq[it.pid] = (pq[it.pid] || 0) + it.qty; pg[it.pid] = (pg[it.pid] || 0) + it.qty * (it.price / 1.05 - (PRODUCT_MAP[it.pid]?.cost || 0)); }
  }
  return { n: list.length, net, total, aov: list.length ? total / list.length : 0, ch, pq, pg };
}

export function weekly(B) {
  const now = Date.now(), D = 864e5;
  const A = agg(store.ordersBetween(now - 7 * D, now + 1)), P = agg(store.ordersBetween(now - 14 * D, now - 7 * D));
  const g = pctOf(A.total, P.total);
  const t0 = startOfDay(new Date());
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(t0, -i), p = addDays(d, -7);
    days.push({ label: `${d.getMonth() + 1}/${d.getDate()} 週${WD[d.getDay()]}`, v: store.sum(store.ordersBetween(d, addDays(d, 1))), pv: store.sum(store.ordersBetween(p, addDays(p, 1))) });
  }
  const from = addDays(t0, -6);
  const range = `${from.getMonth() + 1}/${from.getDate()}–${t0.getMonth() + 1}/${t0.getDate()}`;
  const chs = CHANNELS.map(c => ({ c, a: A.ch[c.id] || 0, p: P.ch[c.id] || 0 })).map(x => ({ ...x, d: x.a - x.p, g: pctOf(x.a, x.p) }));
  const ps = PRODUCTS.map(p => ({ p, q: A.pq[p.id] || 0, pq: P.pq[p.id] || 0, gp: A.pg[p.id] || 0, gm: (p.price / 1.05 - p.cost) / (p.price / 1.05) }));

  // 好消息
  const good = [];
  if (g > 0) good.push({ s: 60 + g, ic: 'trend', t: `近 7 天營收 NT$ ${n0(A.total)}，比前 7 天成長 ${g.toFixed(1)}%，共 ${A.n} 筆訂單。` });
  const upCh = chs.filter(x => x.p > 2000 && x.d > 0).sort((a, b) => b.d - a.d)[0];
  if (upCh) good.push({ s: 50 + Math.min(upCh.g, 40) / 2, ic: 'chat', t: `${sp(upCh.c.name)}通路近 7 天未稅營收 NT$ ${n0(upCh.a)}，比前 7 天多 NT$ ${n0(upCh.d)}（+${upCh.g.toFixed(0)}%），是本週成長最多的通路。` });
  const topP = [...ps].sort((a, b) => b.gp - a.gp)[0];
  good.push({ s: 48, ic: 'coins', t: `${topP.p.name}賣出 ${topP.q} 份，貢獻商品毛利 NT$ ${n0(topP.gp)}，是本週毛利冠軍（單位毛利率 ${(topP.gm * 100).toFixed(0)}%）。` });
  const ga = pctOf(A.aov, P.aov);
  if (ga > 0.5) good.push({ s: 40 + ga, ic: 'cart', t: `平均客單價 NT$ ${n0(A.aov)}，比前 7 天提高 ${ga.toFixed(1)}%，加購與組合購買變多了。` });
  const os = (A.ch.whatsapp || 0) + (A.ch.zalo || 0);
  good.push({ s: 34, ic: 'globe', t: `海外通路（WhatsApp、Zalo）近 7 天貢獻 NT$ ${n0(os)}，占營收 ${(os / Math.max(1, A.net) * 100).toFixed(0)}%，多語 AI 接單持續帶來新客。` });
  good.push({ s: 30, ic: 'percent', t: `本月至今毛利率 ${(B.cur.margin * 100).toFixed(1)}%（與會計帳務同口徑），維持在健康水準。` });
  good.sort((a, b) => b.s - a.s);

  // 要注意
  const watch = [];
  const arList = store.orders.filter(o => o.status === 'pending');
  const arSum = store.sum(arList);
  const oldest = arList.length ? Math.max(1, Math.floor((now - Math.min(...arList.map(o => o.ts))) / D)) : 0;
  if (g < 0) watch.push({ s: 80, ic: 'trend', t: `近 7 天營收 NT$ ${n0(A.total)}，比前 7 天少 ${Math.abs(g).toFixed(1)}%；訂單 ${A.n} 筆（前 7 天 ${P.n} 筆），客單 NT$ ${n0(A.aov)}。` });
  if (arList.length) watch.push({ s: 66, ic: 'clock', key: 'ar', t: `應收帳款 ${arList.length} 筆、NT$ ${n0(arSum)} 尚未收款，最久的一筆已 ${oldest} 天。` });
  const low = store.inventory().filter(p => p.low).sort((a, b) => a.current / a.safety - b.current / b.safety);
  const lowP = low[0];
  if (lowP) {
    const daily = (A.pq[lowP.id] || 0) / 7;
    watch.push({ s: 62, ic: 'box', key: 'stock', t: `${lowP.name}庫存剩 ${lowP.current} 份，低於安全庫存 ${lowP.safety} 份；依近 7 天銷速，約 ${daily ? (lowP.current / daily).toFixed(1) : '—'} 天就會賣完。` });
  }
  const downCh = chs.filter(x => x.p > 2000 && x.d < 0).sort((a, b) => a.d - b.d)[0];
  if (downCh) watch.push({ s: 45 + Math.min(Math.abs(downCh.g), 40) / 2, ic: 'alert', t: `${sp(downCh.c.name)}通路近 7 天營收少了 ${Math.abs(downCh.g).toFixed(0)}%（NT$ ${n0(Math.abs(downCh.d))}），建議檢查回覆速度與活動曝光。` });
  const lowGm = [...ps].sort((a, b) => a.gm - b.gm)[0];
  watch.push({ s: 30, ic: 'percent', t: `${lowGm.p.name}單位毛利率 ${(lowGm.gm * 100).toFixed(0)}%，是全店最低；原料若再漲價會最先被侵蝕。` });
  watch.sort((a, b) => b.s - a.s);

  // 本週行動建議
  const actions = [];
  if (arList.length) actions.push({ id: 'ar', ic: 'coins', t: `催收 ${arList.length} 筆應收帳款`, d: 'AI 已依客戶慣用通路與語言，草擬 LINE／WhatsApp 付款提醒並附付款連結。', impact: arSum, unit: '可回收現金', run: '一鍵發送付款提醒', done: `已發送 ${arList.length} 則付款提醒（示範）`, go: 'bank', goLabel: '金流對帳' });
  if (lowP) {
    const make = Math.max(lowP.safety * 2 - lowP.current, 6);
    const p = B.prods.find(x => x.id === lowP.id);
    actions.push({ id: 'stock', ic: 'box', t: `明天加做 ${lowP.name} ${make} 份`, d: `補回安全庫存以上，避開週末斷貨；AI 已確認原料足夠並排入早班生產。`, impact: r100(Math.min(make, (A.pq[lowP.id] || 0)) * p.unitGM), unit: '避免流失毛利', run: '加入生產排程', done: `已排入明日生產：${lowP.name} × ${make}（示範）`, go: 'inventory', goLabel: '庫存與生產' });
  }
  const chTop = upCh ? upCh.c : CHANNEL_MAP.line;
  const slow = [...ps].sort((a, b) => a.q - b.q).slice(0, 3).sort((a, b) => b.gm - a.gm)[0];
  const chOrders = store.ordersBetween(now - 7 * D, now + 1).filter(o => o.channel === chTop.id).length;
  const extra = Math.max(10, Math.round(chOrders * 0.3));
  const spd = B.prods.find(x => x.id === slow.p.id);
  actions.push({ id: 'mkt', ic: 'heart', t: `對${/^[A-Za-z]/.test(chTop.name) ? ' ' : ''}${sp(chTop.name)}會員推「${slow.p.name}」組合`, d: `${slow.p.name}毛利率 ${(slow.gm * 100).toFixed(0)}%，但近 7 天只賣 ${slow.q} 份；AI 已擬好推播文案與 9 折組合。`, impact: r100(extra * (spd.unitNet * 0.9 - spd.cost)), unit: '預估每週多賺毛利', run: '產生推播活動', done: `已建立「${slow.p.name}」推播草稿，待你確認後發送（示範）`, go: 'crm', goLabel: '會員與行銷' });
  if (actions.length < 3) {
    const roll = B.prods.find(x => x.id === lowGm.p.id);
    actions.push({ id: 'price', ic: 'percent', t: `試算${lowGm.p.name}漲價 5%`, d: `它是毛利率最低的商品，先用決策模擬器看看漲價後還會不會划算。`, impact: r100(roll.qty / 4.3 * roll.unitNet * 0.05 * 0.94), unit: '預估每週多賺毛利', run: '打開漲價試算', sim: { tab: 'price', pid: lowGm.p.id, r: 5 } });
  }
  const tone = g >= 8 ? '生意穩健成長，可以開始想下一步的擴張。' : g >= 0 ? '整體持平略增，重點放在現金回收與毛利。' : '營收略降，先顧好現金與熟客回購。';
  const summary = `本週（${range}）營收 NT$ ${n0(A.total)}（${g >= 0 ? '+' : '−'}${Math.abs(g).toFixed(1)}%），訂單 ${A.n} 筆、平均客單 NT$ ${n0(A.aov)}。${tone}`;
  return { A, P, g, days, range, good: good.slice(0, 3), watch: watch.slice(0, 2), actions: actions.slice(0, 3), summary, arSum, arN: arList.length };
}

// ---------- 決策模擬：漲價 ----------
export const ELASTIC = { all: 1.0, lemon: 1.2, roll: 1.1, basque: 0.8, pound: 1.0, cookie: 0.9, pineapple: 1.0, canele: 1.5 }; // 價格彈性絕對值（示範假設）
export function priceSim(B, { pid = 'all', r = 8, e = 1.0 }) {
  const list = pid === 'all' ? B.prods : B.prods.filter(p => p.id === pid);
  const calc = (rr) => {
    let q = 0, rev = 0, gp = 0;
    for (const p of list) { const qq = Math.max(0, p.qty * (1 - e * rr)); const un = p.unitNet * (1 + rr); q += qq; rev += qq * un; gp += qq * (un - p.cost); }
    return { q, rev, gp };
  };
  const rr = r / 100;
  const base = calc(0), next = calc(rr);
  const newMargin = list.reduce((s, p) => s + p.qty * (p.unitNet * (1 + rr) - p.cost), 0);
  const beDrop = rr > 0 ? 1 - base.gp / newMargin : 0; // 銷量最多可掉多少仍不虧
  const curve = [];
  for (let i = 0; i <= 30; i++) curve.push({ r: i, gp: calc(i / 100).gp - base.gp });
  const best = curve.reduce((m, c) => (c.gp > m.gp ? c : m), curve[0]);
  const dgp = next.gp - base.gp;
  const one = pid !== 'all' ? list[0] : null;
  const newPrice = one ? Math.round(one.price * (1 + rr) / 10) * 10 : 0;
  const def = ELASTIC[pid] ?? 1;
  const conf = Math.round(clamp(86 - r * 1.3 - Math.abs(e - def) * 18 - (pid === 'all' ? 4 : 0), 32, 90));
  const qDrop = base.q ? (next.q - base.q) / base.q : 0;
  let title, body;
  const who = one ? `「${one.name}」` : '全店';
  if (r === 0) { title = '拉動滑桿看看漲價效果'; body = `目前${who}每月約賣 ${n0(base.q)} 份、商品毛利 NT$ ${n0(base.gp)}。`; }
  else if (dgp > 0 && r <= best.r + 2) { title = `可以漲：${who}漲 ${r}% 划算`; body = `預估銷量 ${(qDrop * 100).toFixed(1)}%，但每月商品毛利 ${snt(dgp)}（一年約 ${snt(dgp * 12)}）。只要銷量掉幅不超過 ${(beDrop * 100).toFixed(1)}%，漲價就比不漲好。`; }
  else if (dgp > 0) { title = `可以漲，但 ${r}% 已過最佳點`; body = `依目前敏感度，最佳漲幅約 ${best.r}%（每月 ${snt(best.gp)}）。漲到 ${r}% 仍多賺 ${snt(dgp)}，但流失的客人可能不會回來。`; }
  else { title = `不建議：${who}漲 ${r}% 反而少賺`; body = `顧客對價格較敏感，銷量預估 ${(qDrop * 100).toFixed(1)}%，每月商品毛利 ${snt(dgp)}。若要調價，建議幅度控制在 ${Math.max(1, best.r)}% 以內，或搭配新包裝、加量。`; }
  const risks = [
    `銷量掉幅超過 ${(beDrop * 100).toFixed(1)}% 就開始少賺；AI 會在調價後每天追蹤，超過就提醒你。`,
    one && one.gift ? '禮盒類商品送禮需求較不看價格，但企業客戶可能要求重新報價。' : 'LINE 熟客對價格變動最敏感，建議先私訊說明原料漲價、給熟客 2 週舊價。',
    `價格彈性 ${e.toFixed(1)} 為示範假設；建議先在官網小範圍 A/B 測試 2 週再全面調整。`,
  ];
  return { list, base, next, dgp, beDrop, qDrop, curve, best, newPrice, one, conf, title, body, risks, avgPrice: base.q ? base.rev / base.q * 1.05 : 0, avgPriceNew: next.q ? next.rev / next.q * 1.05 : 0 };
}

// ---------- 決策模擬：雇人 ----------
// 勞保投保薪資級距（簡化示意，非完整級距表）
const GRADES = [11100, 12540, 13500, 15840, 16500, 17280, 17880, 19047, 20008, 21009, 22000, 23100, 24000, 25250, 26400, 27600, 28800, 29500, 30300, 31800, 33300, 34800, 36300, 38200, 40100, 42000, 43900, 45800];
export const gradeFor = (pay) => GRADES.find(g => g >= pay) || GRADES[GRADES.length - 1];
export function hireSim(B, { kind = 'part', hourly = 210, hours = 80, salary = 32000, demand = 45 }) {
  hourly = Math.max(hourly, RATES.minHourly); salary = Math.max(salary, RATES.minWage);
  const h = kind === 'part' ? hours : 174;
  const pay = kind === 'part' ? hourly * hours : salary;
  const level = gradeFor(pay);
  const row = payrollRow({ name: '新夥伴', title: '', kind, pay, level, hours: h, hourly });
  const perHour = kind === 'part' ? 3.0 : 2.6; // 每工時可增加的可售產能（件，示範假設）
  const cap = h * perHour, sold = cap * demand / 100;
  const gain = sold * B.contribUnit;
  const net = gain - row.cost;
  const ramp = [0.5, 0.8];
  const series = [];
  let cum = -3000, payback = null;
  for (let i = 1; i <= 12; i++) {
    const gi = gain * (ramp[i - 1] ?? 1);
    cum += gi - row.cost;
    series.push({ m: i, gain: Math.round(gi), cost: row.cost + (i === 1 ? 3000 : 0), cum: Math.round(cum) });
    if (payback === null && cum >= 0) payback = i;
  }
  const ownerWeek = h * (kind === 'part' ? 0.7 : 0.5) / 4.33;
  const ratio = (B.staffCost + row.cost) / B.net;
  const conf = Math.round(clamp(78 - Math.abs(demand - 45) * 0.6 - (kind === 'full' ? 8 : 0) + (net > 0 ? 4 : -6), 35, 88));
  const kindTxt = kind === 'part' ? `兼職 ${hours} 小時、時薪 ${hourly}` : `全職月薪 ${n0(salary)}`;
  let title, body;
  if (net > 0 && payback && payback <= 6) { title = kind === 'part' ? '建議：可以先加一位兼職' : '建議：可以考慮全職'; body = `${kindTxt}，雇主每月總成本 ${nt(row.cost)}（含勞健保勞退 ${nt(row.employer)}）。多出的產能若賣掉 ${demand}%，每月淨貢獻 ${snt(net)}，約第 ${payback} 個月回本，老闆每週還多出 ${ownerWeek.toFixed(0)} 小時。`; }
  else if (net > 0) { title = '可以雇，但回本較慢'; body = `${kindTxt}，每月淨貢獻 ${snt(net)}，${payback ? `第 ${payback} 個月才回本` : '一年內還沒回本'}。建議先用兼職測試週末產能，確認訂單接得住再加人。`; }
  else { title = kind === 'full' ? '暫不建議：全職還撐不起來' : '暫不建議：多出的產能賣不掉'; body = `${kindTxt}，雇主每月總成本 ${nt(row.cost)}，但以 ${demand}% 的產能消化率，只多賺 ${nt(gain)}，每月 ${snt(net)}。先把需求做起來（預購、企業訂單），或改兼職、減少時數。`; }
  const risks = [
    `時薪不得低於基本時薪 ${RATES.minHourly} 元、月薪不得低於基本工資 ${n0(RATES.minWage)} 元；兼職也要投保勞健保並提繳勞退 6%。`,
    `加人後人事成本占營收約 ${(ratio * 100).toFixed(1)}%（目前 ${(B.staffCost / B.net * 100).toFixed(1)}%），淡季營收若掉 15% 仍需支付。`,
    '新人前 2 個月產能約 5–8 成，需老闆花時間帶；建議先寫好 SOP 與排班。',
  ];
  return { h, pay, level, row, cap, sold, gain, net, series, payback, ownerWeek, revGain: sold * B.avgUnitNet, conf, title, body, risks, ratio };
}

// ---------- 決策模擬：買設備 ----------
export const EQUIP = {
  oven: { name: '第二台烤箱', price: 180000, years: 5, units: 320, util: 1800, note: '旋風烤箱＋層架，週末可多出一整爐' },
  vacuum: { name: '真空包裝機', price: 45000, years: 5, units: 120, util: 300, note: '延長常溫禮盒保存，接企業大單' },
  fridge: { name: '冷藏展示櫃', price: 90000, years: 6, units: 150, util: 900, note: '門市多陳列 2 層，提高現場加購' },
};
const PAY_RATE = { cash: 0, 12: 0.03, 24: 0.05 }; // 分期總成本（示範假設）
export function equipSim(B, { price, years, units, sell, util, pay = 'cash' }) {
  const n = pay === 'cash' ? 1 : +pay;
  const totalPay = price * (1 + PAY_RATE[pay]);
  const inst = totalPay / n;
  const monthlyGain = units * sell / 100 * B.contribUnit - util;
  const dep = price / (years * 12);
  const ramp = [0.4, 0.75];
  const series = [];
  let cum = 0, payback = null, minCum = 0, minAt = 0;
  for (let i = 1; i <= 36; i++) {
    const inflow = (units * sell / 100 * B.contribUnit) * (ramp[i - 1] ?? 1) - util;
    const out = i <= n ? inst : 0;
    cum += inflow - out;
    series.push({ m: i, net: Math.round(inflow - out), cum: Math.round(cum) });
    if (cum < minCum) { minCum = cum; minAt = i; }
    if (payback === null && cum >= 0 && i >= 1) payback = i;
  }
  const upfront = pay === 'cash' ? price : inst;
  const runwayAfter = (B.cash - upfront) / (B.fixedOut + (pay === 'cash' ? 0 : inst));
  const lifeProfit = monthlyGain * years * 12 - totalPay;
  const pb = monthlyGain > 0 ? totalPay / monthlyGain : Infinity;
  const conf = Math.round(clamp(84 - Math.abs(sell - 55) * 0.5 - (pb > 24 ? 12 : 0) - (runwayAfter < 3 ? 8 : 0), 30, 90));
  let title, body;
  if (monthlyGain <= 0) { title = '不建議：增加的產能不夠付水電'; body = `每月增加的貢獻扣掉水電後是 ${snt(monthlyGain)}，設備買了也賺不回來。`; }
  else if (pb <= 18 && runwayAfter >= 3) { title = `建議購買：約 ${Math.ceil(pb)} 個月回本`; body = `每月增加貢獻 ${nt(monthlyGain)}（已扣水電），帳上每月折舊 ${nt(dep)}。${pay === 'cash' ? '一次付清' : `分 ${n} 期每月 ${nt(inst)}`}後，現金仍可支付固定支出 ${runwayAfter.toFixed(1)} 個月；${years} 年使用期合計多賺約 ${nt(lifeProfit)}。`; }
  else if (pb <= 18) { title = '划算，但建議改分期'; body = `約 ${Math.ceil(pb)} 個月回本，但一次付清後現金只夠支付固定支出 ${runwayAfter.toFixed(1)} 個月，低於安全線 3 個月。建議分 12 或 24 期，或搭配政府相關貸款。`; }
  else { title = `回本偏慢：約 ${Number.isFinite(pb) ? Math.ceil(pb) : '—'} 個月`; body = `每月只多賺 ${nt(monthlyGain)}，回本超過 1.5 年。建議先確認週末訂單是否真的接不完，或考慮二手設備、租賃。`; }
  const risks = [
    `產能消化率 ${sell}% 為示範假設；若訂單沒有跟上，回收期會拉長到 ${Number.isFinite(pb) ? Math.ceil(pb * sell / Math.max(20, sell - 20)) : '—'} 個月以上。`,
    `現金跑道：購買後帳上現金可支付固定支出 ${runwayAfter.toFixed(1)} 個月（目前 ${B.runway.toFixed(1)} 個月）${runwayAfter < 3 ? '，已低於 3 個月安全線' : ''}。`,
    '設備需預留安裝與電力改線費用；可留意數位轉型或產業升級相關補助（見下方政府資源）。',
  ];
  return { n, totalPay, inst, monthlyGain, dep, profit: monthlyGain - dep, series, payback, pb, minCum: Math.round(minCum), minAt, runwayAfter, lifeProfit, conf, title, body, risks };
}

// ---------- 決策模擬：開新通路 ----------
export const CHAN = {
  delivery: { name: '外送平台', comm: 30, aov: 650, orders: 80, per: 25, cannibal: 15, mkt: 2000, note: '抽成約 30%（示範假設）・冷藏甜點當日配送' },
  shopee: { name: '蝦皮購物', comm: 12, aov: 780, orders: 60, per: 90, cannibal: 15, mkt: 3000, note: '成交與金流手續費約 12%（示範假設）・常溫禮盒為主' },
  cross: { name: '跨境電商', comm: 18, aov: 1600, orders: 30, per: 380, cannibal: 5, mkt: 5000, note: '平台與金流約 18%（示範假設）・日本、馬來西亞常溫禮盒' },
};
export function channelSim(B, { ch = 'delivery', orders, aov, comm, per, cannibal, mkt }) {
  const rev = orders * aov / 1.05;
  const commission = orders * aov * comm / 100;
  const prodCost = rev * B.costRatio;
  const logi = orders * per;
  const ownMargin = B.aov / 1.05 * (1 - B.costRatio) - B.aov * 0.024;
  const cannibalLoss = orders * cannibal / 100 * ownMargin;
  const net = rev - commission - prodCost - logi - mkt - cannibalLoss;
  const perOrder = orders ? (rev - commission - prodCost - logi) / orders : 0;
  const unitGain = perOrder - cannibal / 100 * ownMargin;
  const beOrders = unitGain > 0 ? Math.ceil(mkt / unitGain) : Infinity;
  const ramp = [0.35, 0.6, 0.8];
  let year = 0;
  const series = [];
  for (let i = 1; i <= 12; i++) { const k = ramp[i - 1] ?? 1; const v = (rev - commission - prodCost - logi - cannibalLoss) * k - mkt; year += v; series.push(Math.round(v)); }
  const conf = Math.round(clamp(76 - (ch === 'cross' ? 14 : 0) - Math.abs(cannibal - CHAN[ch].cannibal) * 0.4 - (orders > CHAN[ch].orders * 1.6 ? 10 : 0), 30, 88));
  const name = CHAN[ch].name;
  let title, body;
  if (net > 0 && perOrder > ownMargin * 0.6) { title = `建議開：${name}每月淨賺 ${nt(net)}`; body = `每單淨利 ${nt(perOrder)}（自家通路約 ${nt(ownMargin)}），扣掉行銷與被取代的自家訂單後仍有正貢獻；首年（含 3 個月爬坡）約 ${snt(year)}。`; }
  else if (net > 0) { title = `可以開，但當「曝光」用`; body = `每單淨利只有 ${nt(perOrder)}，約自家通路的 ${(perOrder / ownMargin * 100).toFixed(0)}%。建議只上架高毛利品項、設定最低消費，並把新客引導回 LINE 回購。`; }
  else { title = `暫不建議：${name}目前是賠的`; body = `每月淨貢獻 ${snt(net)}。${Number.isFinite(beOrders) ? `每月至少要 ${n0(beOrders)} 筆訂單才打平。` : (perOrder <= 0 ? '每單扣掉抽成、成本與物流後已無利潤。' : '被取代的熟客訂單損失大於新訂單利潤，訂單越多賠越多。')}可試著提高客單（組合包）、降低包材物流成本。`; }
  const risks = [
    `抽成 ${comm}% 為示範假設，實際依平台合約與活動加碼而定；平台促銷常要求再折扣。`,
    `約 ${cannibal}% 訂單可能是原本會在 LINE／官網下單的熟客，等於多付抽成。`,
    ch === 'delivery' ? '冷藏蛋糕外送有碰撞、退款風險，需加強包材。' : ch === 'shopee' ? '需處理平台客服時效與評價，AI 可代為回覆。' : '跨境需確認目的地食品輸入、成分標示與關稅規定，冷藏品不適合。',
  ];
  return { rev, commission, prodCost, logi, mkt, cannibalLoss, net, perOrder, ownMargin, beOrders, year, series, conf, title, body, risks };
}

export const confLevel = (c) => (c >= 70 ? '高' : c >= 50 ? '中' : '低');

// ---------- 政府資源媒合（示範） ----------
export function govList(B) {
  const rdQ = B.full.reduce((s, d) => s + d.rd, 0) + B.cur.rd;
  return [
    { id: 'loan', ic: 'bank', c: '#2E97D4', name: '中小企業與青年創業相關貸款', ex: '例如：青年創業及啟動金貸款、中小企業信用保證融資等方向',
      score: B.runway < 4 ? 90 : 76, why: `帳上現金可支付固定支出約 ${B.runway.toFixed(1)} 個月；若要添購第二台烤箱，搭配低利貸款可保住現金跑道。`,
      fit: ['依法設立登記、負責人或公司信用正常', '資金用途明確（設備、週轉、裝修）', '依各貸款類別的年齡、設立年限等條件'],
      amount: '依貸款類別與銀行審核結果而定（示意）', time: '多為常態受理；送件到撥款約數週至數月（示意）', use: '購置第二台烤箱與週轉金' },
    { id: 'sbir', ic: 'flask', c: '#7C62E6', name: '小型企業創新研發相關計畫', ex: '例如：中央或地方型 SBIR 等研發補助方向',
      score: rdQ > 20000 ? 86 : 70, why: `近三個月研發支出 NT$ ${n0(rdQ)}（${B.rdProjects.slice(0, 2).map(p => p.name).join('、')}），研發項目與檢驗紀錄明確。`,
      fit: ['有具體的新產品、新製程或服務創新', '能提出研發計畫書與查核點', '通常需自籌部分經費'],
      amount: '依計畫階段與審查結果核定，需搭配自籌款（示意）', time: '多為分梯次公告受理，審查期約數個月（示意）', use: '減糖配方研發與保存期限延長' },
    { id: 'dx', ic: 'cloud', c: '#5EE0C4', name: '數位轉型相關輔導', ex: '例如：中小企業數位轉型、雲端服務導入等輔導或補助方向',
      score: 82, why: `已用 GreenUP 串接 ${CHANNELS.length} 個接單通路、電子發票與自動記帳，數位化基礎完整，適合申請進階導入。`,
      fit: ['導入雲端系統、電子發票或線上金流', '願意配合輔導訪視與成果回報', '依公告的企業規模條件'],
      amount: '多為部分補助或顧問輔導資源，比例依公告（示意）', time: '常見為年度公告、額滿為止（示意）', use: 'AI 客服與跨境多語接單升級' },
    { id: 'local', ic: 'store', c: '#F0A531', name: '地方政府產業補助', ex: '例如：縣市政府的店家升級、地方特色產品、行銷推廣等補助方向',
      score: 74, why: `伴手禮類商品占商品營收 ${(B.giftShare * 100).toFixed(0)}%，鳳梨酥、烏龍茶磅蛋糕具在地特色。`,
      fit: ['公司或商業登記在該縣市', '具地方特色產品或實體店面', '依各縣市公告條件'],
      amount: '各縣市規定不同（示意）', time: '依各縣市年度公告（示意）', use: '在地伴手禮包裝升級與市集行銷' },
    { id: 'hire', ic: 'users', c: '#2DB674', name: '僱用與人才培訓相關獎助', ex: '例如：勞動部門的僱用獎助、在職訓練課程補助等方向',
      score: B.weekendDay / Math.max(1, B.weekdayDay) > 1.3 ? 78 : 64, why: `週末每日訂單是平日的 ${(B.weekendDay / Math.max(1, B.weekdayDay)).toFixed(1)} 倍；若依決策模擬器加雇兼職，可先確認是否符合僱用相關獎助。`,
      fit: ['新僱用符合資格的求職者', '依規定投保勞健保並提繳勞退', '於規定期限內提出申請'],
      amount: '依僱用對象與期間計算（示意）', time: '僱用後依規定期限申請（示意）', use: '週末烘焙與包裝人力' },
    { id: 'export', ic: 'globe', c: '#DD5597', name: '跨境電商與外銷拓展輔導', ex: '例如：貿易推廣單位的跨境電商課程、海外展售與通路媒合等方向',
      score: B.overseasShare > 0.15 ? 80 : 62, why: `WhatsApp、Zalo 海外通路占營收約 ${(B.overseasShare * 100).toFixed(0)}%，已有跨境客群基礎。`,
      fit: ['有外銷或跨境銷售計畫', '產品可常溫保存並備妥成分標示', '依活動公告報名'],
      amount: '多為課程、展會或媒合資源（示意）', time: '依年度活動公告（示意）', use: '日本、馬來西亞常溫禮盒跨境上架' },
  ].sort((a, b) => b.score - a.score);
}

export function draftFor(g, B) {
  const staffN = B.payroll.length;
  return [
    ['一、申請單位概況', `阿美手作甜點有限公司（示範），負責人阿美，含負責人共 ${staffN} 人（全職 1、兼職 1）。主要商品：檸檬塔、草莓生乳捲、芋泥巴斯克等 ${B.prods.length} 項手作甜點，透過 LINE、官網、門市 POS、WhatsApp、Zalo 等 ${CHANNELS.length} 個通路銷售。`],
    ['二、近期營運數據（系統自動帶入）', `近兩個完整月（${B.monthsTxt}）平均每月營收（未稅）${nt(B.net)}、毛利率 ${(B.margin * 100).toFixed(1)}%、稅前淨利 ${nt(B.pretax)}；每月約 ${n0(B.orders)} 筆訂單，海外通路占 ${(B.overseasShare * 100).toFixed(0)}%。`],
    ['三、計畫目的與資金用途', `${g.use}。${g.why}`],
    ['四、預期效益（引用決策模擬器）', `預計提升產能與毛利，並建立可追蹤的 KPI：月營收、毛利率、新客數、回購率；詳細數字請以決策模擬器最新試算為準。`],
    ['五、應備文件清單（示意）', '公司登記資料、近一年營業稅申報書（401）、損益表與資產負債表、計畫書或報價單、負責人身分證明。GreenUP 可一鍵匯出帳務報表。'],
  ];
}

// ---------- 問顧問（規則式） ----------
export const QUICK = ['我該再雇一個人嗎？', '11 月要不要做聖誕禮盒？', '哪個商品該停售？', '全店漲價 5% 會怎樣？', '現金夠撐多久？', '哪個通路最賺錢？'];
export function answer(q, B, W) {
  const has = (re) => re.test(q);
  if (has(/雇|僱|員工|人手|請人|兼職|全職|招/)) {
    const h = hireSim(B, { kind: 'part', hourly: 210, hours: 80, demand: 45 });
    const yun = B.payroll.find(p => p.kind === 'full'), jie = B.payroll.find(p => p.kind === 'part');
    return { t: `目前團隊是小芸（全職，雇主每月總成本 ${nt(yun.cost)}）與小傑（兼職 ${jie.hours} 小時，${nt(jie.cost)}），人事成本占月均營收 ${(B.staffCost / B.net * 100).toFixed(1)}%。近 4 週週末每天平均 ${B.weekendDay.toFixed(0)} 筆訂單，是平日的 ${(B.weekendDay / Math.max(1, B.weekdayDay)).toFixed(1)} 倍，產能卡在週末。用模擬器試算再雇一位兼職（80 小時、時薪 210）：雇主總成本 ${nt(h.row.cost)}，每月淨貢獻 ${snt(h.net)}${h.payback ? `，約第 ${h.payback} 個月回本` : ''}。建議先加週五到週日的兼職，暫不加全職。`,
      cites: [['月均營收（未稅）', nt(B.net)], ['現有人事成本', nt(B.staffCost) + '／月'], ['週末／平日訂單', `${(B.weekendDay / Math.max(1, B.weekdayDay)).toFixed(1)} 倍`]],
      acts: [{ label: '打開雇人試算', sim: { tab: 'hire' } }, { label: '前往排班打卡', go: 'staff' }] };
  }
  if (has(/聖誕|禮盒|節慶|過年|中秋|年節|11 ?月|12 ?月/)) {
    const xm = B.rdProjects.find(p => /聖誕/.test(p.name));
    const boxes = 150, price = 880, gp = boxes * price / 1.05 * (1 - B.costRatio);
    return { t: `建議做，而且 11 月中就要開預購。禮盒類商品占商品營收 ${(B.giftShare * 100).toFixed(0)}%，每月約賣 ${n0(B.giftQty)} 盒，送禮需求穩定；12 月通常是甜點旺季。研發進度上「${xm ? xm.name : '聖誕限定禮盒'}」目前 ${xm ? xm.pct : 24}%（${xm ? xm.note : '配方開發中'}）。若預購 ${boxes} 盒、定價 NT$ ${price}（示範），商品毛利約 ${nt(gp)}。時程建議：11/5 前定案包材、11/15 開 LINE 預購收訂金、12/10 起分批出貨。風險：包材打樣約需 3 週，第二台烤箱沒到位前要控制預購量。`,
      cites: [['禮盒營收占比', `${(B.giftShare * 100).toFixed(0)}%`], ['禮盒月銷量', `${n0(B.giftQty)} 盒`], ['預估毛利（示範）', nt(gp)]],
      acts: [{ label: '前往預約與訂金', go: 'booking' }, { label: 'AI 商品上架', go: 'listing' }] };
  }
  if (has(/停售|下架|不賣|淘汰|商品|品項/)) {
    const ps = [...B.prods].sort((a, b) => a.gp - b.gp);
    const w = ps[0], tot = B.prods.reduce((s, p) => s + p.gp, 0), best = ps[ps.length - 1];
    return { t: `不建議直接停售，但「${w.name}」是貢獻最低的商品：月均 ${n0(w.qty)} 份、商品毛利 ${nt(w.gp)}，只占全店 ${(w.gp / tot * 100).toFixed(1)}%（第一名${best.name}是 ${nt(best.gp)}）。它的毛利率 ${(w.gm * 100).toFixed(0)}% 並不差，問題是量少、保存只有 ${w.days} 天，容易報廢。建議改成每週二、五限量供應，或併進下午茶組合；若連續 4 週月銷低於 ${Math.round(w.qty * 0.7)} 份再考慮下架。`,
      cites: B.prods.slice().sort((a, b) => b.gp - a.gp).slice(0, 3).map(p => [p.name, nt(p.gp) + '／月']).concat([[w.name, nt(w.gp) + '／月']]),
      acts: [{ label: `試算${w.name}漲價`, sim: { tab: 'price', pid: w.id, r: 5 } }, { label: '前往庫存與生產', go: 'inventory' }] };
  }
  if (has(/漲價|調價|價格|定價|售價/)) {
    const s = priceSim(B, { pid: 'all', r: 5, e: 1 });
    return { t: `以價格敏感度 1.0（示範假設）試算：全店漲 5%，銷量約 ${(s.qDrop * 100).toFixed(1)}%，每月商品毛利 ${snt(s.dgp)}，一年約 ${snt(s.dgp * 12)}。只要銷量掉幅不超過 ${(s.beDrop * 100).toFixed(1)}%，漲價就划算。建議先從禮盒與新品調整，熟客常買的檸檬塔、生乳捲最後動。`,
      cites: [['目前毛利率', `${(B.margin * 100).toFixed(1)}%`], ['損益平衡銷量降幅', `${(s.beDrop * 100).toFixed(1)}%`], ['每月毛利變化', snt(s.dgp)]],
      acts: [{ label: '打開漲價試算', sim: { tab: 'price', pid: 'all', r: 5 } }] };
  }
  if (has(/現金|撐|跑道|週轉|周轉|錢夠/)) {
    return { t: `帳上現金 ${nt(B.cash)}（與會計帳務資產負債表一致），每月固定支出（費用＋薪資）約 ${nt(B.fixedOut)}，就算完全沒有營收也能支付約 ${B.runway.toFixed(1)} 個月。另有應收帳款 ${nt(W.arSum)}（${W.arN} 筆）可先收回。下一個大額支出是 11/15 前繳納 9–10 月營業稅。買設備前，建議維持至少 3 個月固定支出的現金。`,
      cites: [['帳上現金', nt(B.cash)], ['每月固定支出', nt(B.fixedOut)], ['可支付月數', `${B.runway.toFixed(1)} 個月`]],
      acts: [{ label: '前往老闆的錢', go: 'owner' }, { label: '前往金流對帳', go: 'bank' }] };
  }
  if (has(/通路|外送|蝦皮|跨境|平台|LINE|官網/i)) {
    const top = [...B.byCh].sort((a, b) => b.gp - a.gp), per = [...B.byCh].sort((a, b) => b.perOrder - a.perOrder)[0];
    return { t: `以近兩個月平均：毛利最多的是 ${top[0].name}（每月約 ${nt(top[0].gp)}），其次 ${top[1].name}（${nt(top[1].gp)}）；每單毛利最高的是 ${per.name}（約 ${nt(per.perOrder)}／單）。自家通路沒有平台抽成，是最賺的；若要開外送平台，抽成約 30%（示範假設），每單淨利會掉到自家的一半左右，建議當作曝光、把新客導回 LINE。`,
      cites: top.slice(0, 3).map(c => [c.name, nt(c.gp) + '／月']),
      acts: [{ label: '打開開新通路試算', sim: { tab: 'chan' } }] };
  }
  if (has(/設備|烤箱|機器|買/)) {
    const e = EQUIP.oven, s = equipSim(B, { price: e.price, years: e.years, units: e.units, sell: 55, util: e.util, pay: 'cash' });
    return { t: `以第二台烤箱 18 萬、使用 5 年、每月多 320 件產能、賣掉 55% 試算：每月增加貢獻 ${nt(s.monthlyGain)}，約 ${Math.ceil(s.pb)} 個月回本；一次付清後現金可支付固定支出 ${s.runwayAfter.toFixed(1)} 個月。${s.runwayAfter < 3 ? '低於 3 個月安全線，建議分期或搭配貸款。' : '仍在安全範圍。'}`,
      cites: [['回收期', `${Math.ceil(s.pb)} 個月`], ['每月折舊', nt(s.dep)], ['購買後可支付月數', `${s.runwayAfter.toFixed(1)} 個月`]],
      acts: [{ label: '打開買設備試算', sim: { tab: 'equip' } }] };
  }
  if (has(/補助|貸款|政府|計畫|申請|SBIR/i)) {
    const g = govList(B).slice(0, 2);
    return { t: `依你的數據，最可能適合的方向是「${g[0].name}」與「${g[1].name}」。${g[0].why} 名稱、額度與條件請以主管機關最新公告為準，我可以幫你先整理申請資料草稿。`,
      cites: g.map(x => [x.name, `媒合度 ${x.score}%`]), acts: [{ label: '查看政府資源媒合', scroll: 'adGov' }] };
  }
  if (has(/稅|營所|報稅/)) {
    return { t: `依近兩個完整月推估全年：營收（未稅）${nt(B.est.rev)}、課稅所得約 ${nt(B.est.income)}，營利事業所得稅約 ${nt(B.est.tax)}（試算）。建議每月預留約 ${nt(B.est.tax / 12)}，避免 5 月結算時現金吃緊。`,
      cites: [['推估全年所得', nt(B.est.income)], ['營所稅試算', nt(B.est.tax)]], acts: [{ label: '前往自動化報稅', go: 'tax' }] };
  }
  return { t: `我先幫你整理目前的狀況：近兩個月平均每月營收 ${nt(B.net)}、毛利率 ${(B.margin * 100).toFixed(1)}%、稅前淨利 ${nt(B.pretax)}；本週營收 ${W.g >= 0 ? '成長' : '減少'} ${Math.abs(W.g).toFixed(1)}%。你可以問我雇人、漲價、買設備、開新通路、現金、商品或補助相關的問題，我會用帳上的數字回答。`,
    cites: [['月均營收', nt(B.net)], ['毛利率', `${(B.margin * 100).toFixed(1)}%`], ['本週營收', nt(W.A.total)]], acts: [] };
}
