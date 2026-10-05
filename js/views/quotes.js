// 報價與請款：企業客戶報價 → 線上簽回 → 出貨 → 請款／電子發票 → 收款，定期扣款與應收追蹤
import { store } from '../state.js';
import { $, $$, el, gsap, esc, money, fmtDate, fmtTime, sleep, countUp, toast, getRecognizer } from '../util.js';
import { icon } from '../icons.js';
import { makeChart } from '../charts.js';
import { startOfDay, addDays, mulberry32 } from '../data.js';
import {
  SELLER, TERMS, CUST, CATALOG, STAGES, STAGE_IDX, CH_NAME, calc, lineName, seedDeals, historyDeals, monthlyRevenue, seedSubs,
  subShipDates, nextBillDate, statementRows, parsePrompt, buildQuote, quoteInsights, fmtDisc, dunningText, fakeQR, fakeBarcode,
} from '../quotes-data.js';

const DAY = 86400e3;
const TERM_TAG = { monthly: '月結', deposit: '訂金 30%', net7: '7 日付清' };
const WEEK = '日一二三四五六';
const n0 = (n) => Math.round(n).toLocaleString('en-US');
const wan = (n) => (n / 10000).toFixed(1) + ' 萬';
const md = (t) => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()}`; };
const mdY = (t) => { const d = new Date(t); return d.getFullYear() !== new Date().getFullYear() ? `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}` : md(t); };
const fmtDW = (t) => `${fmtDate(t)}（${WEEK[new Date(t).getDay()]}）`;
const dayDiff = (a, b) => Math.round((+startOfDay(b) - +startOfDay(a)) / DAY);
const totalOf = (d) => calc(d.items, d.discount).total;
const freeLbl = (it) => (it.pid === 'ship' ? '免運' : '贈送');
const custOf = (d) => d.cust || CUST[d.cid];
const shortName = (s) => String(s).replace(/（.*?）/g, '');
function ago(t) {
  const m = (Date.now() - t) / 60000;
  if (m < 1) return '剛剛'; if (m < 60) return `${Math.floor(m)} 分鐘前`;
  const h = m / 60; if (h < 24) return `${Math.floor(h)} 小時前`;
  return `${Math.floor(h / 24)} 天前`;
}
const LINE_IC = (s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 4C6.5 4 3 7.3 3 11.1c0 3.4 3 6.2 7.2 6.8l-.4 2.4c0 .4.3.6.7.4 2.6-1.4 6.6-4.2 8.1-6.5.9-1.2 1.4-2.2 1.4-3.1C21 7.3 17.5 4 12 4z"/></svg>`;
const MAIL_IC = (s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>`;
const PEN_IC = (s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>`;
const CARD_IC = (s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/></svg>`;
const ZOOM_IC = (s = 15, plus = true) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3M8 11h6${plus ? 'M11 8v6' : ''}"/></svg>`;
const DL_IC = (s = 15) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5M4 21h16"/></svg>`;

let root, charts = null, modal = null, rec = null;
const S = {
  deals: [], subs: [], hist: [], months: [], draft: null, parsed: null, genFor: null, genBusy: false,
  arSel: null, tone: null, arCh: 'line', billTab: 'todo', stmtCid: 'forest', invSeq: 30417260, aiDocs: 0, aiMin: 0, zoom: 1,
};

function seed() {
  const now = new Date();
  S.deals = seedDeals(now);
  S.subs = seedSubs();
  S.hist = historyDeals(now);
  S.months = monthlyRevenue(now);
  S.genFor = null; S.arSel = null; S.tone = null;
  S.aiDocs = 37; S.aiMin = 14.5 * 60;
}

const RULES = [
  { ic: 'receipt', t: '出貨隔天 09:00 自動請款', s: '自動開三聯式發票、附信用卡／ATM 付款連結', on: true },
  { ic: 'calendar', t: '月結客戶每月 5 日寄對帳單', s: '本期多筆出貨彙總成一張發票', on: true },
  { ic: 'bell', t: '逾期自動催款', s: '3 天禮貌提醒、14 天改正式語氣', on: true },
  { ic: 'coins', t: '收款自動沖銷並記帳', s: 'ATM 虛擬帳號一對一，免核對末五碼', on: true },
];

const KPI_DEF = [
  { key: 'quote', label: '本月報價金額', icon: 'file', color: 'var(--sky)', prefix: 'NT$ ' },
  { key: 'win', label: '成交率', icon: 'percent', color: 'var(--leaf)', suffix: '%', decimals: 0 },
  { key: 'days', label: '平均成交天數', icon: 'clock', color: 'var(--violet)', suffix: ' 天', decimals: 1 },
  { key: 'ar', label: '待收款', icon: 'receipt', color: 'var(--pink)', prefix: 'NT$ ' },
  { key: 'fc', label: '預估下月企業營收', icon: 'trend', color: 'var(--amber)', prefix: 'NT$ ' },
];

// ================= 計算 =================
function metrics() {
  const now = Date.now();
  const T = startOfDay(new Date());
  const monthStart = +new Date(T.getFullYear(), T.getMonth(), 1);
  const nextStart = +new Date(T.getFullYear(), T.getMonth() + 1, 1);
  const nextEnd = +new Date(T.getFullYear(), T.getMonth() + 2, 1);
  const quotedThisMonth = S.deals.filter(d => d.quoted && d.quoted >= monthStart);
  const quote = quotedThisMonth.reduce((s, d) => s + totalOf(d), 0);
  const q30 = S.deals.filter(d => d.quoted && d.quoted >= now - 30 * DAY).reduce((s, d) => s + totalOf(d), 0)
    + S.hist.filter(h => h.quoted && h.quoted >= now - 30 * DAY).reduce((s, h) => s + h.total, 0);
  // 成交率／平均成交天數：近 90 天
  const from = now - 90 * DAY;
  let won = 0, lost = 0, dsum = 0;
  for (const h of S.hist) if (h.quoted && h.quoted >= from) { if (h.won) { won++; dsum += (h.signed - h.quoted) / DAY; } else lost++; }
  for (const d of S.deals) if (d.quoted && d.quoted >= from && d.signed) { won++; dsum += (d.signed - d.quoted) / DAY; }
  const win = won / Math.max(1, won + lost);
  const days = dsum / Math.max(1, won);
  // 待收款
  const billed = S.deals.filter(d => d.stage === 'billed');
  const shipped = S.deals.filter(d => d.stage === 'shipped');
  const ar = [...billed, ...shipped].reduce((s, d) => s + totalOf(d), 0);
  const overdue = billed.filter(d => d.due < +T);
  const overdueAmt = overdue.reduce((s, d) => s + totalOf(d), 0);
  // 下月預估（未稅）
  let subs = 0;
  for (const s of S.subs) if (s.active) subs += calc(s.items).net * subShipDates(s, new Date(nextStart), new Date(nextEnd - DAY)).length;
  let pipe = 0;
  for (const d of S.deals) {
    const net = calc(d.items, d.discount).net;
    const inNext = d.delivery ? (d.delivery >= nextStart && d.delivery < nextEnd) : false;
    if (d.stage === 'signed' && inNext) pipe += net;
    else if (d.stage === 'quoted') pipe += net * win * (inNext ? 1 : 0.35);
    else if (d.stage === 'inquiry') pipe += net * win * 0.5;
  }
  const avgOne = S.months.reduce((s, m) => s + m.one, 0) / S.months.length;
  const base = avgOne * 0.42;
  const fc = subs + pipe + base;
  // 本月至今
  let curSub = 0, curOne = 0;
  for (const s of S.subs) if (s.active) curSub += calc(s.items).net * subShipDates(s, new Date(monthStart), T).length;
  for (const d of S.deals) if (d.ch !== 'sub' && d.shipped && d.shipped >= monthStart) curOne += calc(d.items, d.discount).net;
  return { quote, quoteN: quotedThisMonth.length, q30, win, won, decided: won + lost, days, ar, overdueN: overdue.length, overdueAmt, fc, subs, pipe, base, curSub, curOne, billedN: billed.length, shippedN: shipped.length };
}

function renderKpis() {
  const m = metrics();
  const val = { quote: m.quote, win: m.win * 100, days: m.days, ar: m.ar, fc: m.fc };
  const sub = {
    quote: `${m.quoteN} 張報價・近 30 天 NT$ ${wan(m.q30)}`,
    win: `近 90 天 ${m.won}／${m.decided} 件成交`,
    days: '報價送出 → 客戶簽回',
    ar: m.overdueN ? `逾期 ${m.overdueN} 筆・NT$ ${n0(m.overdueAmt)}` : '目前無逾期帳款',
    fc: `定期 ${wan(m.subs)}＋案件 ${wan(m.pipe)}＋新單 ${wan(m.base)}`,
  };
  for (const k of KPI_DEF) {
    const node = $(`.qt-kpis [data-k="${k.key}"]`, root);
    if (!node) continue;
    countUp($('[data-val]', node), val[k.key], { prefix: k.prefix || '', suffix: k.suffix || '', decimals: k.decimals || 0, duration: 1.2 });
    $('[data-sub]', node).textContent = sub[k.key];
    $('[data-sub]', node).title = sub[k.key];
  }
  const d = $('#qtArDelta', root);
  if (d) { d.textContent = m.overdueN ? `${m.overdueN} 筆逾期` : '健康'; d.className = 'kpi-delta ' + (m.overdueN ? 'warn' : 'up'); }
  const a = $('#qtAiDocs', root); if (a) countUp(a, S.aiDocs, { duration: 1 });
  const h = $('#qtAiHrs', root); if (h) countUp(h, S.aiMin / 60, { decimals: 1, duration: 1 });
  return m;
}

// ================= 看板 =================
function stageMeta(d) {
  const T = startOfDay(new Date());
  switch (d.stage) {
    case 'inquiry': return { a: `${CH_NAME[d.ch]} 詢價`, b: ago(d.created), tag: '' };
    case 'quoted': return { a: d.views ? `客戶已開啟 ${d.views} 次` : '客戶尚未開啟', b: `有效至 ${md(d.valid)}`, tag: d.views ? 'hot' : '' };
    case 'signed': return { a: `簽回 ${ago(d.signed)}`, b: `交期 ${mdY(d.delivery)}`, tag: '' };
    case 'shipped': return { a: `${md(d.shipped)} 出貨`, b: custOf(d).terms === 'monthly' ? '月結客戶' : '待請款', tag: custOf(d).terms === 'monthly' ? 'mon' : '' };
    case 'billed': {
      const od = dayDiff(d.due, T);
      return od > 0 ? { a: `逾期 ${od} 天`, b: `發票 ${d.inv}`, tag: 'late' } : { a: od === 0 ? '今天到期' : `${md(d.due)} 到期（剩 ${-od} 天）`, b: `發票 ${d.inv}`, tag: '' };
    }
    case 'paid': return { a: `${md(d.paid)} 收款・已沖銷`, b: `發票 ${d.inv}`, tag: 'ok' };
  }
  return { a: '', b: '', tag: '' };
}
function cardHTML(d) {
  const c = custOf(d);
  const st = STAGES[STAGE_IDX[d.stage]];
  const m = stageMeta(d);
  const monthly = d.stage === 'shipped' && c.terms === 'monthly';
  const act = d.stage === 'shipped' && monthly ? '月結對帳' : st.act;
  return `<div class="qt-deal ${m.tag ? 'is-' + m.tag : ''}" data-id="${d.id}" style="--cc:${c.color};--sc:${st.color}">
    <div class="qt-deal-h"><span class="qt-av">${esc(c.short.slice(0, 1))}</span><div class="qt-deal-who"><b>${esc(c.short)}</b><small>${d.id}${d.ch === 'sub' ? '・定期' : ''}</small></div></div>
    <div class="qt-deal-t" title="${esc(d.title)}">${esc(d.title)}</div>
    <div class="qt-deal-amt">${d.estimate ? '<small>預估</small>' : ''}NT$ ${n0(totalOf(d))}</div>
    <div class="qt-deal-m"><span class="qt-deal-a">${esc(m.a)}</span><span class="qt-deal-b">${esc(m.b)}</span></div>
    ${st.act ? `<button class="qt-adv" data-act="${d.id}">${icon(st.actIc, 13)}<span>${act}</span>${icon('arrow', 12)}</button>` : `<div class="qt-done">${icon('check', 13)} 已入帳・自動沖銷</div>`}
  </div>`;
}
function renderBoard() {
  const host = $('#qtBoard', root);
  host.innerHTML = STAGES.map((s, i) => `
    <div class="qt-col" data-stage="${s.id}" style="--sc:${s.color}">
      <div class="qt-col-h"><span class="qt-col-ic">${icon(s.icon, 14)}</span><b>${s.name}</b><em data-cnt>0</em>${i < STAGES.length - 1 ? `<i class="qt-col-arrow">${icon('arrow', 12)}</i>` : ''}</div>
      <div class="qt-col-sum"><small>合計</small><b data-sum>NT$ 0</b></div>
      <div class="qt-col-body" data-body>${S.deals.filter(d => d.stage === s.id).sort(sortDeals).map(cardHTML).join('')}</div>
    </div>`).join('');
  updateColHeads(true);
}
function sortDeals(a, b) {
  const t = (d) => d[{ inquiry: 'created', quoted: 'quoted', signed: 'signed', shipped: 'shipped', billed: 'billed', paid: 'paid' }[d.stage]] || 0;
  return t(b) - t(a);
}
function updateColHeads(instant = false) {
  for (const s of STAGES) {
    const col = $(`.qt-col[data-stage="${s.id}"]`, root); if (!col) continue;
    const list = S.deals.filter(d => d.stage === s.id);
    $('[data-cnt]', col).textContent = list.length;
    const sum = list.reduce((a, d) => a + totalOf(d), 0);
    countUp($('[data-sum]', col), sum, { prefix: 'NT$ ', duration: instant ? 1.4 : 0.9 });
    let empty = $('.qt-col-empty', col);
    if (!list.length && !empty) $('[data-body]', col).appendChild(el(`<div class="qt-col-empty">目前沒有案件</div>`));
    if (list.length && empty) empty.remove();
  }
  const tot = S.deals.filter(d => d.stage !== 'paid').reduce((a, d) => a + totalOf(d), 0);
  countUp($('#qtPipeTot', root), tot, { prefix: 'NT$ ', duration: 1 });
}

// FLIP 動畫：把卡片移到新的欄位
async function moveDeal(d, stage, { scroll = true } = {}) {
  if (scroll) await scrollToBoard();
  const old = $(`.qt-deal[data-id="${d.id}"]`, root);
  const r0 = old ? old.getBoundingClientRect() : null;
  d.stage = stage;
  const card = el(cardHTML(d));
  const body = $(`.qt-col[data-stage="${stage}"] [data-body]`, root);
  if (old) old.remove();
  body.prepend(card);
  const colBody = body.closest('.qt-board');
  // 讓目標欄位在水平捲動中可見
  if (colBody && colBody.scrollWidth > colBody.clientWidth) {
    const col = body.closest('.qt-col');
    const left = col.offsetLeft - 12;
    colBody.scrollTo({ left, behavior: 'smooth' });
    await sleep(320);
  }
  updateColHeads();
  const r1 = card.getBoundingClientRect();
  if (r0) gsap.fromTo(card, { x: r0.left - r1.left, y: r0.top - r1.top, scale: 1.06, rotate: -2 }, { x: 0, y: 0, scale: 1, rotate: 0, duration: 0.85, ease: 'power3.inOut', clearProps: 'transform' });
  else gsap.fromTo(card, { opacity: 0, y: -24, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'back.out(1.6)', clearProps: 'transform' });
  card.classList.add('flash');
  setTimeout(() => card.classList.remove('flash'), 1800);
  const col = body.closest('.qt-col');
  gsap.fromTo($('.qt-col-h', col), { backgroundColor: 'rgba(255,255,255,0.16)' }, { backgroundColor: 'rgba(255,255,255,0.03)', duration: 1.2, clearProps: 'backgroundColor' });
  refreshSide();
}
async function scrollToBoard() {
  const b = $('.qt-board-card', root);
  const views = $('#views');
  if (!b || !views) return;
  const r = b.getBoundingClientRect();
  if (r.top < 40 || r.top > innerHeight * 0.45) {
    views.scrollTo({ top: views.scrollTop + r.top - 90, behavior: 'smooth' });
    await sleep(520);
  }
}
function onAct(id) {
  const d = S.deals.find(x => x.id === id); if (!d) return;
  if (d.stage === 'inquiry') {
    S.genFor = d.id;
    const ta = $('#qtPrompt', root); ta.value = d.prompt;
    const g = $('.qt-gen', root);
    const views = $('#views');
    views.scrollTo({ top: views.scrollTop + g.getBoundingClientRect().top - 90, behavior: 'smooth' });
    setTimeout(() => generate(true), 450);
  } else if (d.stage === 'quoted') openSign(d, 'email');
  else if (d.stage === 'signed') shipDeal(d);
  else if (d.stage === 'shipped') openBill(d);
  else if (d.stage === 'billed') markPaid(d);
}
function shipDeal(d) {
  d.shipped = Date.now();
  const sh = `SH-${String(new Date().getFullYear()).slice(2)}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${String(10 + S.deals.filter(x => x.shipped).length).padStart(2, '0')}`;
  toast(`已建立出貨單｜${custOf(d).short}`, `${sh}・已通知小傑揀貨包裝，冷藏專車單號自動回填`, { icon: icon('truck', 18) });
  store.log('ship', `${custOf(d).short}「${d.title}」已出貨（${sh}），${custOf(d).terms === 'monthly' ? '併入本期月結對帳單' : 'AI 將於明早 09:00 自動請款'}`);
  bump(1, 10);
  moveDeal(d, 'shipped', { scroll: false });
}

// ================= AI 一句話報價 =================
function defaultPrompt() {
  const d = addDays(new Date(), 21);
  return `晨光設計 週年慶禮盒 120 盒 ${d.getMonth() + 1}/${d.getDate()} 送到內湖，打 9 折`;
}
function exampleChips() {
  const T = new Date();
  const p = (n) => { const d = addDays(T, n); return `${d.getMonth() + 1}/${d.getDate()}`; };
  return [
    defaultPrompt(),
    '晨光設計 中秋禮盒 120 盒 10/1 送到內湖，打 9 折',
    `好日子選物 鳳梨酥 60 盒 ${p(10)} 送到台中，打 88 折`,
    `拾光旅宿 可麗露 40 盒 ${p(7)} 送到大同區`,
    `白日夢婚禮 婚禮小物 200 份 ${p(30)} 送到中山區，附感謝卡`,
  ];
}
const STEPS = ['理解需求、拆出關鍵資訊', '比對客戶資料與統一編號', '套用企業價目、數量折扣', '計算營業稅 5%（外加）', '檢查產能、交期與毛利', '排版報價單 PDF'];
async function generate(animate = true) {
  if (S.genBusy) return;
  const ta = $('#qtPrompt', root);
  const text = ta.value.trim();
  if (!text) { toast('請先輸入一句話', '例如：晨光設計 中秋禮盒 120 盒 10/1 送到內湖，打 9 折', { kind: 'warn', icon: icon('alert', 18) }); return; }
  if (S.genFor) { const g = S.deals.find(x => x.id === S.genFor); if (!g || g.stage !== 'inquiry' || !text.includes(custOf(g).short.slice(0, 2))) S.genFor = null; }
  S.genBusy = true;
  const btn = $('#qtGen', root);
  btn.disabled = true; btn.innerHTML = `<span class="qt-spin"></span> AI 解析中…`;
  const p = parsePrompt(text);
  const sameDay = S.deals.filter(d => d.id.startsWith('QT-' + ymdNow())).length;
  const draft = buildQuote(p, new Date(), sameDay + 1);
  draft.cust = { ...p.cust };
  S.parsed = p; S.draft = draft;
  const tokHost = $('#qtTokens', root), stepHost = $('#qtSteps', root), insHost = $('#qtInsights', root);
  tokHost.innerHTML = p.tokens.map(t => `<span class="qt-tok k-${t.k} ${t.guess ? 'guess' : ''}"><small>${t.label}</small>${esc(t.text)}</span>`).join('');
  stepHost.innerHTML = STEPS.map(s => `<li><i></i><span>${s}</span></li>`).join('');
  insHost.innerHTML = '';
  $('#qtAiOrb', root).classList.add('on');
  if (animate) {
    gsap.fromTo($$('.qt-tok', tokHost), { opacity: 0, y: 10, scale: 0.8 }, { opacity: 1, y: 0, scale: 1, stagger: 0.09, duration: 0.4, ease: 'back.out(2)' });
    $('#qtPaper', root).classList.add('building');
    for (const li of $$('li', stepHost)) { li.classList.add('run'); await sleep(260); li.classList.remove('run'); li.classList.add('ok'); }
  } else $$('li', stepHost).forEach(li => li.classList.add('ok'));
  renderPaper();
  $('#qtPaper', root).classList.remove('building');
  const ins = quoteInsights(draft, p);
  insHost.innerHTML = ins.map(x => `<li class="${x.k}">${icon(x.k === 'ok' ? 'sparkle' : 'alert', 14)}<span>${esc(x.t)}</span></li>`).join('');
  if (animate) {
    gsap.fromTo($$('.qt-p-anim', root), { opacity: 0, y: 12 }, { opacity: 1, y: 0, stagger: 0.05, duration: 0.45, ease: 'power2.out', clearProps: 'transform' });
    gsap.fromTo($$('li', insHost), { opacity: 0, x: -10 }, { opacity: 1, x: 0, stagger: 0.12, duration: 0.4, delay: 0.3 });
    toast('AI 報價單已產生', `${draft.no}・含稅 ${money(calc(draft.items, draft.discount).total)}・可直接修改後寄出`, { icon: icon('wand', 18) });
  }
  $('#qtAiOrb', root).classList.remove('on');
  $('#qtGenFor', root).innerHTML = S.genFor ? `${icon('link', 13)} 對應看板詢價卡 ${S.genFor}` : `${icon('plus', 13)} 寄出後建立新案件`;
  btn.disabled = false; btn.innerHTML = `${icon('wand', 18)} AI 產生報價單`;
  S.genBusy = false;
}
const ymdNow = () => { const d = new Date(); return `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`; };

function renderPaper() {
  const q = S.draft; if (!q) return;
  const c = q.cust;
  const host = $('#qtPaper', root);
  host.innerHTML = `
    <div class="qt-p-head qt-p-anim">
      <div class="qt-p-brand"><span class="qt-p-logo">美</span><div><b>${SELLER.legal}</b><small>統一編號 ${SELLER.taxId}</small><small>${SELLER.addr}</small><small>${SELLER.phone}・${SELLER.email}</small></div></div>
      <div class="qt-p-title"><h4>報 價 單</h4><small>QUOTATION</small>
        <dl><dt>單號</dt><dd class="mono">${q.no}</dd><dt>報價日期</dt><dd>${fmtDate(q.date)}</dd><dt>有效期限</dt><dd>${fmtDate(q.valid)}</dd></dl></div>
    </div>
    <div class="qt-p-cust qt-p-anim">
      <div><span>客戶名稱</span><b contenteditable="true" spellcheck="false" data-f="name">${esc(c.name)}</b></div>
      <div><span>統一編號</span><b contenteditable="true" spellcheck="false" data-f="taxId" class="mono ${c.taxId ? '' : 'empty'}">${esc(c.taxId || '（待客戶提供）')}</b></div>
      <div><span>聯絡人</span><b contenteditable="true" spellcheck="false" data-f="contact">${esc(c.contact ? `${c.contact} ${c.title}` : '（待填寫）')}</b></div>
      <div><span>電話／Email</span><b contenteditable="true" spellcheck="false" data-f="phone">${c.phone ? `${esc(c.phone)}<br>${esc(c.email)}` : '（待填寫）'}</b></div>
      <div class="w2"><span>送貨地址</span><b contenteditable="true" spellcheck="false" data-f="loc">${esc(q.location || '（待填寫）')}</b></div>
    </div>
    <table class="qt-p-tbl qt-p-anim">
      <thead><tr><th class="c-no">#</th><th>品項</th><th class="r">數量</th><th class="c-unit">單位</th><th class="r">單價</th><th class="r">金額</th></tr></thead>
      <tbody>${q.items.map((it, i) => `<tr>
        <td class="c-no">${i + 1}</td>
        <td class="c-name"><span contenteditable="true" spellcheck="false" data-name="${i}">${esc(lineName(it))}</span>${it.note ? `<em>${esc(it.note)}</em>` : ''}</td>
        <td class="r"><input type="number" min="0" step="1" data-qty="${i}" value="${it.qty}" aria-label="數量"></td>
        <td class="c-unit">${CATALOG[it.pid] ? CATALOG[it.pid].unit : ''}</td>
        <td class="r">${it.price === 0 && it.note ? `<span class="qt-free">${freeLbl(it)}</span>` : `<input type="number" min="0" step="1" data-price="${i}" value="${it.price}" aria-label="單價">`}</td>
        <td class="r mono" data-amt="${i}">${n0(it.qty * it.price)}</td></tr>`).join('')}</tbody>
    </table>
    <div class="qt-p-sum qt-p-anim">
      <div class="qt-p-terms">
        <div><span>交期</span><b>${fmtDW(q.delivery)}${q.dateNote ? ' <em class="qt-p-warn">待確認</em>' : ''}</b></div>
        <div><span>付款條件</span><b>${TERMS[q.terms]}</b></div>
        <div><span>備註</span><ol contenteditable="true" spellcheck="false" data-f="notes">${q.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ol></div>
      </div>
      <dl class="qt-p-tot">
        <dt>小計</dt><dd class="mono" data-t="sub"></dd>
        <dt>折扣 <label class="qt-p-disc"><input type="number" min="50" max="100" step="1" data-disc value="${Math.round(q.discount * 100)}" aria-label="折扣百分比">%</label></dt><dd class="mono neg" data-t="disc"></dd>
        <dt>未稅合計</dt><dd class="mono" data-t="net"></dd>
        <dt>營業稅 5%（外加）</dt><dd class="mono" data-t="tax"></dd>
        <dt class="big">含稅總計</dt><dd class="big mono" data-t="total"></dd>
      </dl>
    </div>
    <div class="qt-p-foot qt-p-anim">
      <div class="qt-p-sig"><span>報價人</span><b>${SELLER.owner}</b><i class="qt-stamp">阿美手作<br>甜點工作室<br>報價專用章</i></div>
      <div class="qt-p-sig client"><span>客戶簽回</span><b class="qt-p-line">線上簽署後自動帶入</b></div>
    </div>`;
  recalcPaper();
}
function recalcPaper() {
  const q = S.draft; if (!q) return;
  const a = calc(q.items, q.discount);
  const set = (k, v) => { const n = $(`#qtPaper [data-t="${k}"]`, root); if (n) n.textContent = v; };
  set('sub', n0(a.sub)); set('disc', a.disc ? '−' + n0(a.disc) : '0'); set('net', n0(a.net)); set('tax', n0(a.tax)); set('total', 'NT$ ' + n0(a.total));
  q.items.forEach((it, i) => { const n = $(`#qtPaper [data-amt="${i}"]`, root); if (n) n.textContent = n0(it.qty * it.price); });
  $('#qtVwName', root).textContent = `報價單_${q.no}_${shortName(q.cust.short)}.pdf`;
  $('#qtSendAmt', root).textContent = 'NT$ ' + n0(a.total);
}
function onPaperInput(e) {
  const q = S.draft; if (!q) return;
  const t = e.target;
  if (t.dataset.qty != null) q.items[+t.dataset.qty].qty = Math.max(0, +t.value || 0);
  else if (t.dataset.price != null) q.items[+t.dataset.price].price = Math.max(0, +t.value || 0);
  else if (t.dataset.disc != null) q.discount = Math.min(1, Math.max(0.5, (+t.value || 100) / 100));
  else if (t.dataset.name != null) q.items[+t.dataset.name].name = t.textContent.trim();
  else if (t.dataset.f) {
    const v = t.textContent.trim();
    if (t.dataset.f === 'name') q.cust.name = v;
    if (t.dataset.f === 'taxId') { q.cust.taxId = /^\d{8}$/.test(v) ? v : q.cust.taxId; t.classList.toggle('empty', !/^\d{8}$/.test(v)); }
    if (t.dataset.f === 'loc') q.location = v;
    if (t.dataset.f === 'notes') q.notes = $$('li', t).map(li => li.textContent.trim()).filter(Boolean);
  }
  recalcPaper();
}

function sendQuote(ch) {
  const q = S.draft; if (!q) return;
  const c = q.cust;
  const main = q.items[0];
  const title = `${shortName(lineName(main))} ${main.qty} ${CATALOG[main.pid] ? CATALOG[main.pid].unit : ''}`;
  const now = Date.now();
  let d = S.genFor ? S.deals.find(x => x.id === S.genFor && x.stage === 'inquiry') : null;
  const fields = {
    cid: c.id, cust: { ...c }, ch: ch === 'line' ? 'line' : 'email', title, items: q.items.map(i => ({ ...i })), discount: q.discount,
    quoted: now, valid: q.valid, delivery: q.delivery, location: q.location, terms: q.terms, views: 0, estimate: false,
  };
  if (d) {
    const oldId = d.id;
    Object.assign(d, fields, { id: q.no });
    const card = $(`.qt-deal[data-id="${oldId}"]`, root); if (card) card.dataset.id = d.id;
  } else {
    if (S.deals.some(x => x.id === q.no)) q.no = q.no.replace(/-(\d+)$/, (m, n) => '-' + String(+n + S.deals.length).padStart(2, '0'));
    d = { id: q.no, created: now, ...fields, stage: 'quoted' };
    S.deals.push(d);
  }
  S.genFor = null;
  bump(1, 25);
  store.log('order', `AI 報價單 ${d.id} 已用 ${ch === 'line' ? 'LINE' : 'Email'} 寄給 ${c.short}，含稅 NT$ ${n0(totalOf(d))}`);
  toast(`報價單已用 ${ch === 'line' ? 'LINE' : 'Email'} 寄出`, `${c.short}・${d.id}・客戶可線上簽回`, { icon: icon('send', 18) });
  if (d.stage === 'inquiry') moveDeal(d, 'quoted', { scroll: false });
  else {
    const body = $(`.qt-col[data-stage="quoted"] [data-body]`, root);
    const card = el(cardHTML(d)); body.prepend(card); card.classList.add('flash');
    gsap.fromTo(card, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.6)', clearProps: 'transform' });
    updateColHeads(); refreshSide();
  }
  // 產生下一張報價的單號，避免重複
  S.draft = null;
  setTimeout(() => openSign(d, ch), 350);
  setTimeout(() => { $('#qtPrompt', root).value = ''; resetGenPanel(); }, 900);
}
function resetGenPanel() {
  $('#qtTokens', root).innerHTML = '<span class="qt-tok-empty">輸入一句話，AI 會拆出客戶、品項、數量、交期、地點、折扣</span>';
  $('#qtSteps', root).innerHTML = STEPS.map(s => `<li><i></i><span>${s}</span></li>`).join('');
  $('#qtInsights', root).innerHTML = '';
  $('#qtGenFor', root).innerHTML = '';
  $('#qtPaper', root).innerHTML = `<div class="qt-p-empty">${icon('file', 40)}<b>報價單已寄出</b><span>輸入下一句需求，AI 會再幫你產生一張</span></div>`;
  $('#qtVwName', root).textContent = '尚未產生';
  $('#qtSendAmt', root).textContent = '—';
}

// ================= Modal 共用 =================
function openModal(cls, html) {
  closeModal(true);
  modal = el(`<div class="qt-modal ${cls}" role="dialog" aria-modal="true"><div class="qt-mbox">${html}</div></div>`);
  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => { if (e.target === modal || e.target.closest('[data-close]')) closeModal(); });
  gsap.fromTo(modal, { opacity: 0 }, { opacity: 1, duration: 0.25 });
  gsap.fromTo($('.qt-mbox', modal), { y: 40, scale: 0.97, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.5, ease: 'power3.out', clearProps: 'transform' });
  return modal;
}
function closeModal(instant = false) {
  if (!modal) return;
  const m = modal; modal = null;
  if (instant) { m.remove(); return; }
  gsap.to(m, { opacity: 0, duration: 0.22, onComplete: () => m.remove() });
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal) closeModal(); });

// ================= 線上簽回（客戶端預覽） =================
function openSign(d, ch = 'email') {
  const c = custOf(d);
  const a = calc(d.items, d.discount);
  const link = `https://sign.greenup.example/q/${d.id}`;
  const m = openModal('qt-sign-m', `
    <div class="qt-m-h">
      <div><h3>${PEN_IC(18)} 客戶端預覽：線上簽回</h3><p>客戶點開連結就能看報價、勾選同意、用手指或滑鼠簽名，不用列印掃描。</p></div>
      <span class="demo-badge">${icon('alert', 13)} 示範畫面</span>
      <button class="icon-btn" data-close aria-label="關閉">${icon('x', 18)}</button>
    </div>
    <div class="qt-sign-grid">
      <div class="qt-msg">
        <div class="qt-msg-tabs"><button class="seg ${ch === 'line' ? '' : 'on'}" data-ch="email">${MAIL_IC(14)} Email</button><button class="seg ${ch === 'line' ? 'on' : ''}" data-ch="line">${LINE_IC(14)} LINE</button></div>
        <div class="qt-mail" ${ch === 'line' ? 'hidden' : ''}>
          <div class="qt-mail-h"><div><small>寄件者</small><b>${SELLER.name} &lt;${SELLER.email}&gt;</b></div><div><small>收件者</small><b>${esc(c.contact || c.short)} &lt;${esc(c.email || '待填寫')}&gt;</b></div><div><small>主旨</small><b>【報價單】${esc(d.title)}｜${d.id}</b></div></div>
          <div class="qt-mail-b">
            <p>${esc(c.contact ? c.contact + ' 您好' : '您好')}：</p>
            <p>感謝${esc(c.short)}的詢價！附上「${esc(d.title)}」報價單，含稅總計 <b>NT$ ${n0(a.total)}</b>，報價有效至 ${fmtDate(d.valid)}。</p>
            <p>點下方按鈕即可線上確認並簽回，完成後系統會自動寄送確認信${c.terms === 'deposit' ? '與訂金付款連結' : ''}。</p>
            <div class="qt-attach">${icon('file', 18)}<div><b>報價單_${d.id}.pdf</b><small>186 KB</small></div></div>
            <span class="qt-mail-btn">${PEN_IC(14)} 線上確認並簽回</span>
            <p class="qt-mail-sign">阿美手作甜點 阿美<br>${SELLER.phone}</p>
          </div>
        </div>
        <div class="qt-line" ${ch === 'line' ? '' : 'hidden'}>
          <div class="qt-line-top"><span class="qt-line-av">美</span><div><b>阿美手作甜點</b><small>LINE 官方帳號</small></div></div>
          <div class="qt-line-body">
            <div class="qt-bub">${esc(c.contact ? c.contact.slice(0, 1) + (c.title.match(/經理|店長|主任|主委|總監/) || ['先生／小姐'])[0] : '您')}好～「${esc(d.title)}」的報價單準備好了，含稅 NT$ ${n0(a.total)}，點下方卡片就能線上簽回喔！</div>
            <div class="qt-flex">
              <div class="qt-flex-h">${icon('file', 15)} 報價單 ${d.id}</div>
              <div class="qt-flex-b"><small>${esc(c.short)}</small><b>NT$ ${n0(a.total)}</b><span>交期 ${fmtDate(d.delivery)}・有效至 ${md(d.valid)}</span></div>
              <span class="qt-flex-btn">線上簽回</span>
            </div>
            <small class="qt-line-time">已讀 ${fmtTime(new Date())}</small>
          </div>
        </div>
        <ul class="qt-msg-auto">
          <li>${icon('check', 14)} 客戶開啟連結時即時通知你</li>
          <li>${icon('check', 14)} 3 天未回覆，AI 自動送出溫和提醒</li>
          <li>${icon('check', 14)} 簽回後自動排入生產與出貨排程</li>
        </ul>
      </div>
      <div class="qt-browser">
        <div class="qt-br-bar"><i></i><i></i><i></i><span>${icon('lock', 12)} ${esc(link)}</span></div>
        <div class="qt-client" id="qtClient">
          <div class="qt-cl-head"><span class="qt-p-logo sm">美</span><div><b>${SELLER.name}</b><small>報價單線上確認</small></div><span class="qt-cl-secure">${icon('shield', 13)} 加密連線</span></div>
          <div class="qt-cl-hi"><b>${esc(c.contact ? c.contact + ' 您好' : '您好')}</b>，以下是「${esc(d.title)}」報價內容，請確認後簽回。</div>
          <div class="qt-cl-box">
            <div class="qt-cl-row head"><span>報價單號 <b class="mono">${d.id}</b></span><span>有效至 ${fmtDate(d.valid)}</span></div>
            ${d.items.map(it => `<div class="qt-cl-row"><span>${esc(shortName(lineName(it)))} <small>× ${it.qty}</small></span><b class="mono">${it.price ? n0(it.qty * it.price) : freeLbl(it)}</b></div>`).join('')}
            ${a.disc ? `<div class="qt-cl-row sub"><span>折扣（${fmtDisc(d.discount)}）</span><b class="mono">−${n0(a.disc)}</b></div>` : ''}
            <div class="qt-cl-row sub"><span>營業稅 5%</span><b class="mono">${n0(a.tax)}</b></div>
            <div class="qt-cl-row tot"><span>含稅總計</span><b class="mono">NT$ ${n0(a.total)}</b></div>
            <div class="qt-cl-meta"><span>${icon('truck', 13)} 交期 ${fmtDW(d.delivery)}</span><span>${icon('coins', 13)} ${TERMS[d.terms || c.terms]}</span></div>
          </div>
          <label class="qt-cl-agree"><input type="checkbox" id="qtAgree"> 我已詳閱報價內容與付款條件，同意訂購</label>
          <div class="qt-cl-who">
            <label><span>簽署人</span><input id="qtSigner" value="${esc(c.contact || '')}" placeholder="姓名"></label>
            <label><span>職稱</span><input id="qtSignerT" value="${esc(c.title || '')}" placeholder="職稱"></label>
            <label><span>統一編號</span><input id="qtSignerTax" class="mono" value="${esc(c.taxId || '')}" placeholder="8 碼" maxlength="8"></label>
          </div>
          <div class="qt-pad-wrap"><div class="qt-pad-h"><span>${PEN_IC(14)} 請在框內簽名</span><button class="qt-pad-clear" id="qtPadClear">${icon('refresh', 13)} 清除</button></div>
            <div class="qt-pad"><canvas id="qtPad"></canvas><span class="qt-pad-ph" id="qtPadPh">用滑鼠或手指在這裡簽名</span><i class="qt-pad-x">✕</i></div></div>
          <button class="btn btn-primary qt-cl-go" id="qtSignGo" disabled>${icon('check', 17)} 確認簽回</button>
          <small class="qt-cl-legal">簽署紀錄含時間戳記與裝置資訊，依電子簽章法保存（示範）。</small>
          <div class="qt-cl-done" id="qtSignDone" hidden>
            <div class="qt-done-ring"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-16"/></svg></div>
            <h4>簽回完成，謝謝您！</h4>
            <p id="qtSignInfo"></p>
            <button class="btn btn-ghost btn-sm" data-close>${icon('arrow', 14)} 回到看板</button>
          </div>
        </div>
      </div>
    </div>`);
  // 已讀次數 +1（模擬客戶開啟）
  d.views = (d.views || 0) + 1;
  $$('.qt-msg-tabs .seg', m).forEach(b => b.addEventListener('click', () => {
    $$('.qt-msg-tabs .seg', m).forEach(x => x.classList.toggle('on', x === b));
    $('.qt-mail', m).hidden = b.dataset.ch !== 'email';
    $('.qt-line', m).hidden = b.dataset.ch !== 'line';
  }));
  const pad = setupPad($('#qtPad', m), () => check());
  const agree = $('#qtAgree', m);
  const go = $('#qtSignGo', m);
  function check() { go.disabled = !(agree.checked && pad.drawn() && $('#qtSigner', m).value.trim()); $('#qtPadPh', m).hidden = pad.drawn(); }
  agree.addEventListener('change', check);
  $('#qtSigner', m).addEventListener('input', check);
  $('#qtPadClear', m).addEventListener('click', () => { pad.clear(); check(); });
  go.addEventListener('click', async () => {
    go.disabled = true; go.innerHTML = `<span class="qt-spin"></span> 簽署中…`;
    await sleep(700);
    const signer = $('#qtSigner', m).value.trim();
    const tax = $('#qtSignerTax', m).value.trim();
    if (d.cust && /^\d{8}$/.test(tax)) d.cust.taxId = tax;
    d.signed = Date.now(); d.signer = `${signer} ${$('#qtSignerT', m).value.trim()}`.trim();
    d.sigImg = pad.data();
    const done = $('#qtSignDone', m);
    $('#qtSignInfo', m).innerHTML = `簽署人 ${esc(d.signer)}・${fmtDate(d.signed)} ${fmtTime(d.signed)}<br>${(d.terms || c.terms) === 'deposit' ? `訂金 30%（NT$ ${n0(Math.round(totalOf(d) * 0.3))}）付款連結已寄到您的信箱` : '將依月結條件於出貨後請款，電子發票寄到您的信箱'}`;
    done.hidden = false;
    gsap.fromTo(done, { opacity: 0 }, { opacity: 1, duration: 0.3 });
    gsap.fromTo($('.qt-done-ring circle', done), { strokeDashoffset: 160 }, { strokeDashoffset: 0, duration: 0.7, ease: 'power2.out' });
    gsap.fromTo($('.qt-done-ring path', done), { strokeDashoffset: 50 }, { strokeDashoffset: 0, duration: 0.5, delay: 0.5, ease: 'power2.out' });
    store.log('order', `${c.short} 已線上簽回報價單 ${d.id}（NT$ ${n0(totalOf(d))}），AI 已排入 ${mdY(d.delivery)} 出貨排程`);
    toast(`客戶已簽回｜${c.short}`, `${d.id}・${d.signer}・已自動排入生產與出貨排程`, { icon: icon('check', 18) });
    bump(1, 15);
    setTimeout(() => { if (modal === m) { closeModal(); } moveDeal(d, 'signed'); }, 1900);
  });
}
function setupPad(canvas, onChange) {
  const ctx = canvas.getContext('2d');
  let drawing = false, last = null, len = 0;
  const fit = () => {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(r.width * dpr)); canvas.height = Math.max(1, Math.round(r.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#123a8c'; ctx.lineWidth = 2.6;
    len = 0;
  };
  requestAnimationFrame(fit);
  const pos = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  canvas.addEventListener('pointerdown', (e) => { drawing = true; last = pos(e); try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ } e.preventDefault(); });
  canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const p = pos(e);
    const mid = { x: (last.x + p.x) / 2, y: (last.y + p.y) / 2 };
    ctx.lineWidth = Math.max(1.6, 3.2 - Math.hypot(p.x - last.x, p.y - last.y) / 14);
    ctx.beginPath(); ctx.moveTo(last.mx ?? last.x, last.my ?? last.y); ctx.quadraticCurveTo(last.x, last.y, mid.x, mid.y); ctx.stroke();
    len += Math.hypot(p.x - last.x, p.y - last.y);
    last = { ...p, mx: mid.x, my: mid.y };
    if (len > 40) onChange();
  });
  const end = () => { if (drawing) { drawing = false; onChange(); } };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end); canvas.addEventListener('pointerleave', end);
  return { drawn: () => len > 40, clear: () => { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.restore(); len = 0; }, data: () => { try { return canvas.toDataURL('image/png'); } catch { return ''; } } };
}

// ================= 一鍵請款（請款單／月結對帳單＋三聯式電子發票＋付款連結） =================
function openBill(d) {
  const c = custOf(d);
  const monthly = c.terms === 'monthly';
  const st = monthly ? statementRows(d.cid, S.deals, S.subs) : null;
  const a = monthly ? { net: st.net, tax: st.tax, total: st.total, disc: 0, sub: st.net } : calc(d.items, d.discount);
  const inv = `AB-${S.invSeq + 1}`;
  const rng = mulberry32(S.invSeq);
  const rand = String(Math.floor(rng() * 9000) + 1000);
  const T = new Date();
  const dueDays = monthly ? 30 : 7;
  const due = +addDays(startOfDay(T), dueDays);
  const vacct = `9103 ${String(T.getFullYear()).slice(2)}${String(T.getMonth() + 1).padStart(2, '0')} ${String(T.getDate()).padStart(2, '0')}${String(S.invSeq).slice(-2)} ${String(Math.floor(rng() * 9000) + 1000)}`;
  const bl = d.id.replace('QT', 'BL');
  const period = st ? `${fmtDate(st.from)} – ${fmtDate(st.to)}` : '';
  const doc1 = monthly ? `
    <div class="qt-doc qt-paper sm">
      <div class="qt-doc-h"><div><b>月結對帳單</b><small>STATEMENT</small></div><span class="mono">${bl}</span></div>
      <div class="qt-doc-kv"><span>客戶</span><b>${esc(c.name)}</b><span>統一編號</span><b class="mono">${esc(c.taxId)}</b><span>對帳期間</span><b>${period}</b></div>
      <table class="qt-doc-tbl"><thead><tr><th>日期</th><th>出貨單／內容</th><th class="r">未稅</th></tr></thead>
        <tbody>${st.rows.map(r => `<tr class="${r.deal === d.id ? 'hl' : ''}"><td>${md(r.date)}</td><td><b class="mono">${r.no}</b><small>${esc(r.desc)}</small></td><td class="r mono">${n0(r.net)}</td></tr>`).join('')}</tbody></table>
      <dl class="qt-doc-tot"><dt>本期出貨 ${st.rows.length} 筆・未稅</dt><dd class="mono">${n0(st.net)}</dd><dt>營業稅 5%</dt><dd class="mono">${n0(st.tax)}</dd><dt class="big">本期應付</dt><dd class="big mono">NT$ ${n0(st.total)}</dd></dl>
      <div class="qt-doc-note">付款期限 ${fmtDate(due)}（月結 30 天）・本期多筆出貨合併開立一張發票</div>
    </div>` : `
    <div class="qt-doc qt-paper sm">
      <div class="qt-doc-h"><div><b>請款單</b><small>INVOICE REQUEST</small></div><span class="mono">${bl}</span></div>
      <div class="qt-doc-kv"><span>客戶</span><b>${esc(c.name)}</b><span>統一編號</span><b class="mono">${esc(c.taxId || '（待補）')}</b><span>對應報價</span><b class="mono">${d.id}</b></div>
      <table class="qt-doc-tbl"><thead><tr><th>品項</th><th class="r">數量</th><th class="r">金額</th></tr></thead>
        <tbody>${d.items.map(it => `<tr><td>${esc(shortName(lineName(it)))}</td><td class="r">${it.qty}</td><td class="r mono">${it.price ? n0(it.qty * it.price) : freeLbl(it)}</td></tr>`).join('')}</tbody></table>
      <dl class="qt-doc-tot">${a.disc ? `<dt>折扣（${fmtDisc(d.discount)}）</dt><dd class="mono">−${n0(a.disc)}</dd>` : ''}<dt>未稅合計</dt><dd class="mono">${n0(a.net)}</dd><dt>營業稅 5%</dt><dd class="mono">${n0(a.tax)}</dd><dt class="big">應付總額</dt><dd class="big mono">NT$ ${n0(a.total)}</dd></dl>
      <div class="qt-doc-note">付款期限 ${fmtDate(due)}・${TERMS[d.terms || c.terms]}</div>
    </div>`;
  const m = openModal('qt-bill-m', `
    <div class="qt-m-h">
      <div><h3>${icon('receipt', 18)} 一鍵請款：${esc(c.short)}・${esc(monthly ? '本期月結' : d.title)}</h3><p>AI 已自動產生${monthly ? '月結對帳單' : '請款單'}、三聯式電子發票與付款連結，確認後一次寄出。</p></div>
      <span class="demo-badge">${icon('alert', 13)} 示範資料・非真實開立</span>
      <button class="icon-btn" data-close aria-label="關閉">${icon('x', 18)}</button>
    </div>
    <div class="qt-bill-grid">
      ${doc1}
      <div class="qt-doc qt-einv">
        <div class="qt-einv-top"><b>${SELLER.name}</b><span>電子發票證明聯</span><em>格式 25・三聯式</em></div>
        <div class="qt-einv-period">${T.getFullYear() - 1911} 年 ${String(T.getMonth() + 1 - ((T.getMonth()) % 2)).padStart(2, '0')}–${String(T.getMonth() + 2 - ((T.getMonth()) % 2)).padStart(2, '0')} 月</div>
        <div class="qt-einv-no mono">${inv}</div>
        <div class="qt-einv-kv">
          <span>${fmtDate(T)} ${fmtTime(T)}</span><span>格式 25</span>
          <span>隨機碼 ${rand}</span><span>總計 ${n0(a.total)}</span>
          <span>賣方 ${SELLER.taxId}</span><span>買方 ${esc(c.taxId || '—')}</span>
        </div>
        <div class="qt-einv-bar">${fakeBarcode(S.invSeq)}</div>
        <div class="qt-einv-qr">${fakeQR(S.invSeq + 1, 21)}${fakeQR(S.invSeq + 2, 21)}</div>
        <dl class="qt-einv-amt"><dt>銷售額（未稅）</dt><dd class="mono">${n0(a.net)}</dd><dt>營業稅額</dt><dd class="mono">${n0(a.tax)}</dd><dt>總計</dt><dd class="mono">${n0(a.total)}</dd></dl>
        <div class="qt-einv-buyer">買受人：${esc(c.name)}</div>
      </div>
      <div class="qt-doc qt-pay">
        <div class="qt-pay-h"><b>${icon('link', 16)} 付款連結</b><small>客戶點開即可付款，入帳後自動沖銷</small></div>
        <div class="qt-pay-tabs"><button class="seg on" data-pt="card">${CARD_IC(14)} 信用卡</button><button class="seg" data-pt="atm">${icon('bank', 14)} ATM 虛擬帳號</button></div>
        <div class="qt-pay-card" data-pp="card">
          <div class="qt-ccard"><span class="qt-cc-chip"></span><b class="mono">•••• •••• •••• ••••</b><small>支援 VISA／Master／JCB・Apple Pay・Google Pay</small></div>
          <div class="qt-pay-amt"><small>應付金額</small><b>NT$ ${n0(a.total)}</b></div>
          <div class="qt-pay-btn">${icon('lock', 14)} 安全付款（3D 驗證）</div>
        </div>
        <div class="qt-pay-atm" data-pp="atm" hidden>
          <dl><dt>銀行代碼</dt><dd class="mono">822（示範）</dd><dt>虛擬帳號</dt><dd class="mono big">${vacct}</dd><dt>繳費期限</dt><dd>${fmtDate(due)} 23:59</dd><dt>應付金額</dt><dd class="mono">NT$ ${n0(a.total)}</dd></dl>
          <small>每張請款單專屬帳號，入帳即自動對到這筆款項，不用再核對末五碼。</small>
        </div>
        <div class="qt-pay-link"><div class="qt-pay-qr">${fakeQR(S.invSeq + 7, 25)}</div><div><small>付款連結</small><b class="mono">pay.greenup.example/i/${inv}</b><button class="btn btn-ghost btn-sm" id="qtCopy">${icon('link', 13)} 複製連結</button></div></div>
      </div>
    </div>
    <div class="qt-m-f">
      <ul class="qt-bill-auto">
        <li>${icon('check', 14)} 發票上傳財政部平台（示範）</li>
        <li>${icon('check', 14)} 應收帳款自動入帳</li>
        <li>${icon('check', 14)} 逾期 3 天自動提醒</li>
      </ul>
      <div class="qt-m-act"><button class="btn btn-ghost" data-close>取消</button><button class="btn btn-primary" id="qtBillGo">${icon('send', 16)} 寄出請款（Email＋LINE）</button></div>
    </div>`);
  $$('.qt-pay-tabs .seg', m).forEach(b => b.addEventListener('click', () => {
    $$('.qt-pay-tabs .seg', m).forEach(x => x.classList.toggle('on', x === b));
    $$('[data-pp]', m).forEach(p => { p.hidden = p.dataset.pp !== b.dataset.pt; });
  }));
  $('#qtCopy', m).addEventListener('click', () => {
    try { navigator.clipboard && navigator.clipboard.writeText(`https://pay.greenup.example/i/${inv}`).catch(() => {}); } catch { /* ignore */ }
    toast('付款連結已複製', '示範連結，貼到 LINE 或 Email 給客戶即可', { icon: icon('link', 18) });
  });
  gsap.fromTo($$('.qt-bill-grid > *', m), { opacity: 0, y: 24 }, { opacity: 1, y: 0, stagger: 0.12, duration: 0.5, delay: 0.15, ease: 'power3.out', clearProps: 'transform' });
  $('#qtBillGo', m).addEventListener('click', async (e) => {
    const b = e.currentTarget; b.disabled = true; b.innerHTML = `<span class="qt-spin"></span> 開立發票、寄出中…`;
    await sleep(900);
    S.invSeq++;
    if (monthly) {
      d.items = st.rows.map(r => ({ pid: 'stmt', name: `${md(r.date)} ${r.desc}`, qty: 1, price: r.net }));
      d.discount = 1;
      d.title = `${st.from.getMonth() + 1}/${st.from.getDate()}–${md(st.to)} 月結對帳`;
    }
    d.billed = Date.now(); d.due = due; d.inv = inv;
    closeModal();
    store.log('bank', `已向 ${c.short} 請款 NT$ ${n0(totalOf(d))}，三聯式電子發票 ${inv}（買方 ${c.taxId || '—'}）與付款連結已寄出`);
    toast(`請款已寄出｜${c.short}`, `${monthly ? '月結對帳單' : '請款單'}＋電子發票 ${inv}＋付款連結・${fmtDate(due)} 到期`, { icon: icon('receipt', 18) });
    bump(3, monthly ? 35 : 18);
    S.arSel = d.id; S.tone = null;
    await moveDeal(d, 'billed');
  });
}

// ================= 收款／自動沖銷 =================
async function markPaid(d) {
  const c = custOf(d);
  d.paid = Date.now();
  store.log('pay', `收到 ${c.short} 付款 NT$ ${n0(totalOf(d))}（發票 ${d.inv}），應收帳款已自動沖銷`);
  toast(`收款完成｜${c.short}`, `NT$ ${n0(totalOf(d))} 已入帳，發票 ${d.inv} 應收帳款自動沖銷`, { kind: 'info', icon: icon('coins', 18) });
  if (S.arSel === d.id) S.arSel = null;
  bump(1, 5);
  const row = $(`.qt-ar-row[data-id="${d.id}"]`, root);
  if (row) { row.classList.add('paid'); await sleep(450); }
  await moveDeal(d, 'paid');
}
function bump(docs, min) { S.aiDocs += docs; S.aiMin += min; }

// ================= 請款中心 =================
function renderBilling() {
  const host = $('#qtBillBody', root); if (!host) return;
  const todo = S.deals.filter(d => d.stage === 'shipped').sort((a, b) => b.shipped - a.shipped);
  $('#qtBillCnt', root).textContent = todo.length;
  $$('#qtBillTabs .seg', root).forEach(b => b.classList.toggle('on', b.dataset.tab === S.billTab));
  if (S.billTab === 'todo') {
    host.innerHTML = todo.length ? todo.map(d => {
      const c = custOf(d); const mon = c.terms === 'monthly';
      return `<div class="qt-bill-row" style="--cc:${c.color}"><span class="qt-av">${esc(c.short.slice(0, 1))}</span>
        <div class="qt-bill-m"><b>${esc(c.short)} <span class="chip-sm ${mon ? '' : 'warn'}">${TERM_TAG[c.terms]}</span></b><small>${esc(d.title)}・${md(d.shipped)} 出貨</small></div>
        <div class="qt-bill-a"><b class="mono">NT$ ${n0(totalOf(d))}</b><small>買方統編 ${esc(c.taxId || '待補')}</small></div>
        <button class="btn btn-primary btn-sm" data-bill="${d.id}">${icon('receipt', 14)} ${mon ? '月結對帳' : '一鍵請款'}</button></div>`;
    }).join('') : `<div class="qt-empty">${icon('check', 22)}<b>出貨的單都請款完了</b><small>新出貨後，AI 會在隔天 09:00 自動請款</small></div>`;
    host.insertAdjacentHTML('beforeend', `<div class="qt-bill-tip">${icon('sparkle', 14)}<span>每張請款會同時產生：<b>請款單</b>＋<b>三聯式電子發票</b>（帶入買方統編）＋<b>付款連結</b>（信用卡／ATM 虛擬帳號）</span></div>`);
  } else {
    const ids = ['forest', 'everyday', 'chenguang', 'goodday'];
    const st = statementRows(S.stmtCid, S.deals, S.subs);
    const c = CUST[S.stmtCid];
    host.innerHTML = `
      <div class="qt-stmt-cs">${ids.map(id => `<button class="seg ${id === S.stmtCid ? 'on' : ''}" data-stmt="${id}">${CUST[id].short}</button>`).join('')}</div>
      <div class="qt-stmt">
        <div class="qt-stmt-h"><div><b>${esc(c.name)}</b><small>統編 ${c.taxId}・對帳期間 ${fmtDate(st.from)} – ${fmtDate(st.to)}</small></div><span class="chip-sm">${st.rows.length} 筆出貨</span></div>
        <div class="qt-stmt-rows">${st.rows.length ? st.rows.map(r => `<div class="qt-stmt-r"><span class="mono">${md(r.date)}</span><span class="d">${esc(r.desc)}</span><b class="mono">${n0(r.net)}</b></div>`).join('') : '<div class="qt-stmt-r"><span class="d">本期尚無出貨</span></div>'}</div>
        <div class="qt-stmt-t"><span>未稅 ${n0(st.net)}＋稅 ${n0(st.tax)}</span><b>本期應付 NT$ ${n0(st.total)}</b></div>
        <div class="qt-stmt-f"><small>${icon('clock', 13)} 每月 5 日 09:00 自動寄出對帳單＋一張彙總發票</small><button class="btn btn-ghost btn-sm" data-stmt-send="${c.id}">${icon('send', 14)} 立即寄出</button></div>
      </div>`;
  }
}

// ================= 應收追蹤 =================
function arList() {
  const T = startOfDay(new Date());
  return S.deals.filter(d => d.stage === 'billed').map(d => ({ d, od: dayDiff(d.due, T) })).sort((a, b) => b.od - a.od);
}
function suggestTone(od) { return od > 10 ? 'formal' : 'polite'; }
function renderAR() {
  const list = arList();
  const host = $('#qtArRows', root); if (!host) return;
  const buckets = [['未到期', (x) => x.od <= 0, '#2E97D4'], ['逾期 1–15 天', (x) => x.od > 0 && x.od <= 15, '#F0A531'], ['16–30 天', (x) => x.od > 15 && x.od <= 30, '#EC6A55'], ['30 天以上', (x) => x.od > 30, '#DD5597']];
  const tot = list.reduce((s, x) => s + totalOf(x.d), 0) || 1;
  $('#qtAging', root).innerHTML = `<div class="qt-aging-bar">${buckets.map(([n, f, col]) => { const v = list.filter(f).reduce((s, x) => s + totalOf(x.d), 0); return v ? `<i style="flex:${v};--bc:${col}" title="${n} NT$ ${n0(v)}"></i>` : ''; }).join('')}</div>
    <div class="qt-aging-lg">${buckets.map(([n, f, col]) => { const l = list.filter(f); const v = l.reduce((s, x) => s + totalOf(x.d), 0); return `<span style="--bc:${col}"><i></i>${n}<b class="mono">${v ? n0(v) : '0'}</b></span>`; }).join('')}</div>`;
  void tot;
  $('#qtArCnt', root).textContent = `${list.length} 筆・NT$ ${n0(list.reduce((s, x) => s + totalOf(x.d), 0))}`;
  if (!list.length) {
    host.innerHTML = `<div class="qt-empty">${icon('check', 22)}<b>所有款項都收齊了</b><small>收款後 AI 會自動沖銷應收帳款並記帳</small></div>`;
    $('#qtDun', root).hidden = true; return;
  }
  $('#qtDun', root).hidden = false;
  if (!S.arSel || !list.some(x => x.d.id === S.arSel)) S.arSel = list[0].d.id;
  host.innerHTML = list.map(({ d, od }) => {
    const c = custOf(d);
    const w = Math.min(100, Math.max(6, od / 30 * 100));
    return `<button class="qt-ar-row ${d.id === S.arSel ? 'on' : ''} ${od > 0 ? 'late' : ''}" data-id="${d.id}" style="--cc:${c.color};--w:${w}%">
      <span class="qt-av">${esc(c.short.slice(0, 1))}</span>
      <span class="qt-ar-m"><b>${esc(c.short)}</b><small>${esc(d.title)}・${d.inv}</small></span>
      <span class="qt-ar-od ${od > 15 ? 'hi' : od > 0 ? 'mid' : 'ok'}">${od > 0 ? `逾期 ${od} 天` : od === 0 ? '今天到期' : `${-od} 天後到期`}<i></i></span>
      <b class="qt-ar-amt mono">NT$ ${n0(totalOf(d))}</b>
    </button>`;
  }).join('');
  selectAR(S.arSel, false);
}
function selectAR(id, animate = true) {
  S.arSel = id;
  $$('.qt-ar-row', root).forEach(r => r.classList.toggle('on', r.dataset.id === id));
  const x = arList().find(v => v.d.id === id); if (!x) return;
  const sug = suggestTone(x.od);
  if (!S.tone || animate) S.tone = sug;
  const c = custOf(x.d);
  $('#qtDunWho', root).innerHTML = `<b>${esc(c.short)}</b>・${x.od > 0 ? `逾期 ${x.od} 天` : `${md(x.d.due)} 到期`}・往來 ${c.since ? new Date().getFullYear() - c.since + 1 : 1} 年`;
  $('#qtDunAi', root).innerHTML = `${icon('sparkle', 14)}<span>AI 建議：<b>${sug === 'polite' ? '禮貌' : '正式'}</b>語氣・${x.od > 10 ? '逾期超過 10 天，改用正式書面並附付款期限' : x.od > 0 ? '剛逾期、往來良好，先溫和提醒' : '尚未到期，貼心提醒付款期限即可'}</span>`;
  $$('#qtTone .seg', root).forEach(b => { b.classList.toggle('on', b.dataset.tone === S.tone); b.classList.toggle('sug', b.dataset.tone === sug); });
  $$('#qtArCh .seg', root).forEach(b => b.classList.toggle('on', b.dataset.ch === S.arCh));
  writeDun(animate);
}
let dunToken = 0;
async function writeDun(animate) {
  const x = arList().find(v => v.d.id === S.arSel); if (!x) return;
  const txt = dunningText(x.d, S.tone, x.od);
  const node = $('#qtDunMsg', root);
  node.className = 'qt-dun-msg ' + S.arCh + ' ' + S.tone;
  const tk = ++dunToken;
  if (!animate) { node.textContent = txt; return; }
  node.textContent = '';
  const caret = document.createElement('span'); caret.className = 'caret';
  for (let i = 0; i < txt.length; i += 3) {
    if (tk !== dunToken) return;
    node.textContent = txt.slice(0, i + 3); node.appendChild(caret);
    await sleep(12);
  }
  if (tk === dunToken) node.textContent = txt;
}
function sendDun() {
  const x = arList().find(v => v.d.id === S.arSel); if (!x) return;
  const c = custOf(x.d);
  x.d.reminded = (x.d.reminded || 0) + 1;
  store.log('bank', `已用 ${S.arCh === 'line' ? 'LINE' : 'Email'} 寄出${S.tone === 'polite' ? '禮貌' : '正式'}催款提醒給 ${c.short}（${x.d.inv}，NT$ ${n0(totalOf(x.d))}）`);
  toast(`催款提醒已寄出｜${c.short}`, `${S.arCh === 'line' ? 'LINE' : 'Email'}・${S.tone === 'polite' ? '禮貌' : '正式'}語氣・附付款連結，客戶付款後自動沖銷`, { icon: icon('bell', 18) });
  bump(1, 8);
  const b = $('#qtDunSend', root);
  gsap.fromTo(b, { scale: 0.92 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
  const row = $(`.qt-ar-row[data-id="${x.d.id}"] .qt-ar-m small`, root);
  if (row && !row.querySelector('.qt-sent')) row.insertAdjacentHTML('beforeend', ' <span class="qt-sent">・已提醒</span>');
  renderKpis();
}

// ================= 定期供貨／自動扣款 =================
function subNext(s) {
  const T = startOfDay(new Date());
  const ship = subShipDates(s, addDays(T, 1), addDays(T, 70))[0];
  const bill = nextBillDate(s);
  const shipsToBill = subShipDates(s, new Date(T.getFullYear(), bill.getMonth() - 1, s.billDay + 1), addDays(bill, -1)).length;
  const per = calc(s.items).total;
  const todayShip = subShipDates(s, T, T).length > 0;
  const todayBill = T.getDate() === s.billDay;
  return { ship, bill, per, amt: per * Math.max(1, shipsToBill), n: Math.max(1, shipsToBill), todayShip, todayBill };
}
function renderSubs() {
  const host = $('#qtSubRows', root); if (!host) return;
  host.innerHTML = S.subs.map(s => {
    const c = CUST[s.cid]; const n = subNext(s);
    const freq = s.monthlyOnly === 'first' ? `每月第一個週${WEEK[s.weekday]}` : `${s.every === 2 ? '每兩週' : '每週'}${WEEK[s.weekday]}`;
    return `<div class="qt-sub ${s.active ? '' : 'off'}" data-sub="${s.id}" style="--cc:${c.color}">
      <div class="qt-sub-c"><span class="qt-av">${c.short.slice(0, 1)}</span><div><b>${c.short}</b><small>${s.id}・${s.since} 起</small></div></div>
      <div class="qt-sub-t"><b>${esc(s.title)}</b><small>${freq} ${s.shipAt} 自動出貨・每月 ${s.billDay} 日自動請款</small></div>
      <div class="qt-sub-n"><small>下次出貨</small><b>${s.active ? `${md(n.ship)}（${WEEK[n.ship.getDay()]}）` : '—'}</b>${s.active && n.todayShip ? `<em>今天 ${s.shipAt} 已出貨</em>` : ''}</div>
      <div class="qt-sub-n"><small>下次扣款</small><b>${s.active ? md(n.bill) : '—'}</b>${s.active && n.todayBill ? '<em>今天已自動請款</em>' : `<em>${s.pay}</em>`}</div>
      <div class="qt-sub-a"><small>${s.active ? `${n.n} 次出貨・含稅` : '每次'}</small><b class="mono">NT$ ${n0(s.active ? n.amt : n.per)}</b></div>
      <div class="qt-sub-s"><span class="qt-sub-st">${s.active ? '自動中' : '已暫停'}</span>
        <button class="qt-switch ${s.active ? 'on' : ''}" data-toggle="${s.id}" role="switch" aria-checked="${s.active}" aria-label="啟用或暫停"><i></i></button></div>
      ${!s.active && s.pausedNote ? `<div class="qt-sub-note">${icon('clock', 12)} ${esc(s.pausedNote)}</div>` : ''}
    </div>`;
  }).join('');
  renderCal();
}
function renderCal() {
  const host = $('#qtCal', root); if (!host) return;
  const T = startOfDay(new Date());
  const start = addDays(T, -((T.getDay() + 6) % 7)); // 本週一
  const cells = [];
  for (let i = 0; i < 35; i++) {
    const d = addDays(start, i);
    const ev = [];
    for (const s of S.subs) {
      if (!s.active) continue;
      if (subShipDates(s, d, d).length) ev.push(`<i class="ship" style="--cc:${CUST[s.cid].color}" title="${CUST[s.cid].short} 出貨"></i>`);
      if (d.getDate() === s.billDay) ev.push(`<i class="bill" title="${CUST[s.cid].short} 自動請款"></i>`);
    }
    const bill = ev.some(e => e.includes('bill'));
    cells.push(`<div class="qt-cal-d ${+d === +T ? 'today' : ''} ${+d < +T ? 'past' : ''} ${bill ? 'billday' : ''}"><span>${d.getDate() === 1 ? `${d.getMonth() + 1}/1` : d.getDate()}</span><div>${ev.filter(e => e.includes('ship')).join('')}</div>${bill ? `<em>${icon('coins', 10)}</em>` : ''}</div>`);
  }
  host.innerHTML = `<div class="qt-cal-wk">${['一', '二', '三', '四', '五', '六', '日'].map(w => `<span>${w}</span>`).join('')}</div><div class="qt-cal-g">${cells.join('')}</div>`;
  const m = S.subs.filter(s => s.active).reduce((a, s) => a + calc(s.items).net * subShipDates(s, addDays(T, 1), addDays(T, 30)).length, 0);
  $('#qtSubSum', root).textContent = `未來 30 天定期營收 NT$ ${n0(m)}（未稅）`;
}
function toggleSub(id) {
  const s = S.subs.find(x => x.id === id); if (!s) return;
  s.active = !s.active;
  const c = CUST[s.cid];
  toast(s.active ? `已恢復定期供貨｜${c.short}` : `已暫停定期供貨｜${c.short}`, s.active ? `下次出貨 ${md(subNext(s).ship)}，扣款日 ${md(subNext(s).bill)}` : '暫停期間不會出貨，也不會扣款；隨時可以恢復', { kind: s.active ? 'ok' : 'warn', icon: icon(s.active ? 'play' : 'clock', 18) });
  store.log('order', `${c.short} 定期供貨（${s.id}）已${s.active ? '恢復' : '暫停'}`);
  renderSubs();
  const row = $(`.qt-sub[data-sub="${id}"]`, root);
  if (row) gsap.fromTo(row, { backgroundColor: s.active ? 'rgba(45,182,116,0.22)' : 'rgba(240,165,49,0.18)' }, { backgroundColor: 'rgba(255,255,255,0.03)', duration: 1.2, clearProps: 'backgroundColor' });
  renderKpis(); updateCharts();
}

// ================= 圖表 =================
function funnelData() {
  const from = Date.now() - 90 * DAY;
  const cnt = [0, 0, 0, 0, 0];
  for (const h of S.hist) {
    if (h.created < from) continue;
    cnt[0]++; if (h.quoted) cnt[1]++; if (h.won) { cnt[2]++; cnt[3]++; cnt[4]++; }
  }
  for (const d of S.deals) {
    if ((d.created || d.quoted) < from) continue;
    const k = STAGE_IDX[d.stage];
    cnt[0]++; if (k >= 1) cnt[1]++; if (k >= 2) cnt[2]++; if (k >= 3) cnt[3]++; if (k >= 5) cnt[4]++;
  }
  return [['詢價', cnt[0]], ['報價', cnt[1]], ['簽回成交', cnt[2]], ['出貨', cnt[3]], ['收款', cnt[4]]];
}
function funnelOption() {
  const data = funnelData();
  const cols = ['#9B86F0', '#2E97D4', '#5EE0C4', '#F0A531', '#2DB674'];
  const top = data[0][1] || 1;
  return {
    animationDuration: 1100,
    tooltip: { trigger: 'item', formatter: (p) => `${p.name}<br><b>${p.value}</b> 件・轉換 ${(p.value / top * 100).toFixed(0)}%` },
    series: [{
      type: 'funnel', left: '4%', right: '30%', top: 10, bottom: 10, minSize: '22%', maxSize: '100%', gap: 4, sort: 'none',
      label: { position: 'right', color: 'rgba(214,240,226,0.85)', fontSize: 12, formatter: (p) => `{n|${p.name}} {v|${p.value}}  {p|${(p.value / top * 100).toFixed(0)}%}`, rich: { n: { color: 'rgba(214,240,226,0.75)' }, v: { fontWeight: 800, color: '#eafff4', fontSize: 14 }, p: { color: 'rgba(214,240,226,0.5)', fontSize: 11 } } },
      labelLine: { length: 14, lineStyle: { color: 'rgba(255,255,255,0.2)' } },
      itemStyle: { borderColor: 'rgba(0,0,0,0)', borderWidth: 0 },
      data: data.map(([name, value], i) => ({ name, value, itemStyle: { color: new window.echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: cols[i] + 'cc' }, { offset: 1, color: cols[i] + '66' }]), shadowColor: cols[i], shadowBlur: 12 } })),
    }],
  };
}
function trendOption() {
  const m = metrics();
  const T = new Date();
  const labels = [...S.months.map(x => x.label), `${T.getMonth() + 1} 月至今`, `${((T.getMonth() + 1) % 12) + 1} 月預估`];
  const subs = [...S.months.map(x => x.sub), Math.round(m.curSub), null];
  const one = [...S.months.map(x => x.one), Math.round(m.curOne), null];
  const fc = [...S.months.map(() => null), null, Math.round(m.fc)];
  const fmt = (v) => v >= 10000 ? (v / 10000).toFixed(1) + '萬' : v;
  return {
    animationDuration: 1200,
    grid: { left: 6, right: 10, top: 34, bottom: 4, containLabel: true },
    legend: { top: 0, right: 0, itemWidth: 12, itemHeight: 8, textStyle: { fontSize: 11.5 }, data: ['定期供貨', '企業單', 'AI 預估'] },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v) => v == null ? '—' : 'NT$ ' + Number(v).toLocaleString() },
    xAxis: { type: 'category', data: labels, axisLabel: { fontSize: 11, interval: 0, hideOverlap: true } },
    yAxis: { type: 'value', axisLabel: { formatter: fmt } },
    series: [
      { name: '定期供貨', type: 'bar', stack: 'a', data: subs, barMaxWidth: 34, itemStyle: { color: '#2DB674' } },
      { name: '企業單', type: 'bar', stack: 'a', data: one, barMaxWidth: 34, itemStyle: { color: '#2E97D4', borderRadius: [6, 6, 0, 0] } },
      { name: 'AI 預估', type: 'bar', stack: 'a', data: fc, barMaxWidth: 34, itemStyle: { color: 'rgba(240,165,49,0.28)', borderColor: '#F0A531', borderWidth: 1.5, borderType: 'dashed', borderRadius: [6, 6, 0, 0] },
        label: { show: true, position: 'top', color: '#ffcf8a', fontWeight: 700, formatter: (p) => p.value ? 'NT$ ' + fmt(p.value) : '' } },
      { name: '趨勢', type: 'line', data: labels.map((_, i) => i < 6 ? S.months[i].total : i === 6 ? null : Math.round(m.fc)), connectNulls: true, smooth: true, symbol: 'circle', symbolSize: 6, lineStyle: { color: '#F0A531', width: 2, type: 'dashed' }, itemStyle: { color: '#F0A531' }, tooltip: { show: false } },
    ],
  };
}
function updateCharts() {
  if (!charts) return;
  charts.funnel.setOption(funnelOption(), true);
  charts.trend.setOption(trendOption(), true);
  const m = metrics();
  const f = funnelData();
  $('#qtFunNote', root).innerHTML = `${icon('sparkle', 14)}<span>報價 → 簽回轉換 <b>${(f[2][1] / Math.max(1, f[1][1]) * 100).toFixed(0)}%</b>；AI 自動提醒後，平均 <b>${m.days.toFixed(1)} 天</b>簽回，比人工追蹤快約 2 天。</span>`;
  $('#qtTrendNote', root).innerHTML = `${icon('trend', 14)}<span>下月預估 <b>NT$ ${n0(m.fc)}</b>：定期供貨 ${wan(m.subs)} 很穩定，佔 ${(m.subs / m.fc * 100).toFixed(0)}%；建議把 ${S.deals.filter(d => d.stage === 'quoted').length} 張待簽報價追到成交。</span>`;
}
function refreshSide() { renderKpis(); renderBilling(); renderAR(); updateCharts(); }

// ================= 掛載 =================
export default {
  mount(section) {
    root = section;
    seed();
    section.innerHTML = `
    <div class="qt">
      <div class="glass qt-hero anim-in">
        <div class="qt-hero-orb">${icon('file', 26)}</div>
        <div class="qt-hero-t">
          <h2>企業訂單，從報價到收款一條龍自動跑</h2>
          <p>一句話產生報價單 → 客戶線上簽回 → 出貨後自動請款＋電子發票 → 逾期自動提醒 → 收款自動沖銷入帳。你只要做甜點。</p>
          <div class="qt-flow">${['AI 一句話報價', '線上簽回', '出貨自動請款', '三聯式電子發票', '逾期自動提醒', '收款自動沖銷'].map((t, i) => `<span style="--i:${i}">${t}</span>`).join(`<i>${icon('arrow', 11)}</i>`)}</div>
        </div>
        <div class="qt-hero-s">
          <span class="demo-badge">${icon('alert', 13)} 示範資料</span>
          <div class="qt-hero-stat"><small>本月 AI 代辦文件</small><b><span id="qtAiDocs">0</span> 份</b></div>
          <div class="qt-hero-stat"><small>幫你省下</small><b><span id="qtAiHrs">0</span> 小時</b></div>
        </div>
      </div>

      <div class="qt-kpis">${KPI_DEF.map(k => `
        <div class="kpi glass anim-in" data-k="${k.key}" style="--c:${k.color}">
          <div class="kpi-top"><span class="kpi-ic">${icon(k.icon, 18)}</span><span class="kpi-label">${k.label}</span>${k.key === 'ar' ? '<span class="kpi-delta" id="qtArDelta"></span>' : ''}</div>
          <div class="kpi-val" data-val>0</div>
          <div class="kpi-sub" data-sub></div>
        </div>`).join('')}
      </div>

      <div class="glass card qt-board-card anim-in">
        <div class="card-h">
          <h3>${icon('dashboard', 18)} 企業訂單流程看板 <span class="chip-sm">進行中 <b id="qtPipeTot">NT$ 0</b></span></h3>
          <div class="qt-board-tools"><span class="qt-hint">${icon('sparkle', 13)} 點卡片上的按鈕推進下一步</span><button class="btn btn-primary btn-sm" id="qtNew">${icon('wand', 15)} AI 一句話報價</button></div>
        </div>
        <div class="qt-swipe">左右滑動查看 6 個階段 ${icon('arrow', 13)}</div>
        <div class="qt-board" id="qtBoard"></div>
      </div>

      <div class="qt-gen">
        <div class="glass card qt-ai anim-in">
          <div class="card-h"><h3>${icon('wand', 18)} AI 一句話產生報價單</h3><span class="chip-sm">含 5% 營業稅外加</span></div>
          <div class="qt-ai-in">
            <div class="qt-ai-orb" id="qtAiOrb"><i></i><i></i>${icon('sparkle', 20)}</div>
            <textarea id="qtPrompt" rows="2" placeholder="例如：晨光設計 中秋禮盒 120 盒 10/1 送到內湖，打 9 折"></textarea>
            <button class="icon-btn" id="qtMic" title="用說的" aria-label="語音輸入">${icon('mic', 18)}</button>
          </div>
          <div class="qt-ex">${exampleChips().map(t => `<button class="qt-ex-c" data-ex="${esc(t)}">${esc(t)}</button>`).join('')}</div>
          <div class="qt-ai-go"><button class="btn btn-primary" id="qtGen">${icon('wand', 18)} AI 產生報價單</button><small id="qtGenFor"></small></div>
          <div class="qt-sec-t">AI 讀懂了這些</div>
          <div class="qt-tokens" id="qtTokens"></div>
          <div class="qt-sec-t">處理步驟</div>
          <ol class="qt-steps" id="qtSteps"></ol>
          <div class="qt-sec-t">AI 提醒</div>
          <ul class="qt-ins" id="qtInsights"></ul>
        </div>
        <div class="glass card qt-viewer anim-in">
          <div class="qt-vw-bar">
            <span class="qt-vw-file">${icon('file', 15)} <b id="qtVwName">—</b></span>
            <span class="qt-vw-pg">1 / 1</span>
            <div class="qt-vw-tools">
              <button class="icon-btn sm" id="qtZoomOut" title="縮小" aria-label="縮小">${ZOOM_IC(15, false)}</button>
              <button class="icon-btn sm" id="qtZoomIn" title="放大" aria-label="放大">${ZOOM_IC(15, true)}</button>
              <button class="icon-btn sm" id="qtDl" title="下載 PDF" aria-label="下載 PDF">${DL_IC(15)}</button>
            </div>
          </div>
          <div class="qt-vw-stage"><div class="qt-paper" id="qtPaper"></div></div>
          <div class="qt-vw-foot">
            <div class="qt-vw-tot"><small>含稅總計</small><b id="qtSendAmt">—</b><span>${PEN_IC(13)} 白底文字都能直接點選修改</span></div>
            <div class="qt-vw-send">
              <button class="btn btn-ghost" data-send="email">${MAIL_IC(16)} 用 Email 寄出</button>
              <button class="btn btn-primary qt-btn-line" data-send="line">${LINE_IC(16)} 用 LINE 寄出</button>
            </div>
          </div>
        </div>
      </div>

      <div class="qt-row2">
        <div class="glass card qt-billing anim-in">
          <div class="card-h"><h3>${icon('receipt', 18)} 請款中心</h3>
            <div class="qt-tabs" id="qtBillTabs"><button class="seg" data-tab="todo">待請款 <em id="qtBillCnt">0</em></button><button class="seg" data-tab="stmt">月結對帳單</button></div></div>
          <div class="qt-bill-body" id="qtBillBody"></div>
          <div class="qt-rules">
            <div class="qt-rules-h"><b>${icon('wand', 15)} 自動金流規則</b><small>設定一次，之後 AI 自己跑</small></div>
            ${RULES.map((r, i) => `<div class="qt-rule"><span class="qt-rule-ic">${icon(r.ic, 15)}</span><div><b>${r.t}</b><small>${r.s}</small></div><button class="qt-switch ${r.on ? 'on' : ''}" data-rule="${i}" role="switch" aria-checked="${r.on}" aria-label="${r.t}"><i></i></button></div>`).join('')}
          </div>
        </div>
        <div class="glass card qt-ar anim-in">
          <div class="card-h"><h3>${icon('clock', 18)} 應收追蹤・AI 催款</h3><span class="chip-sm warn" id="qtArCnt">—</span></div>
          <div class="qt-aging" id="qtAging"></div>
          <div class="qt-ar-rows" id="qtArRows"></div>
          <div class="qt-dun" id="qtDun">
            <div class="qt-dun-h"><span id="qtDunWho"></span>
              <div class="qt-dun-ctl"><div class="qt-tabs" id="qtTone"><button class="seg" data-tone="polite">禮貌</button><button class="seg" data-tone="formal">正式</button></div>
              <div class="qt-tabs" id="qtArCh"><button class="seg" data-ch="line">${LINE_IC(13)} LINE</button><button class="seg" data-ch="email">${MAIL_IC(13)} Email</button></div></div></div>
            <div class="qt-dun-ai" id="qtDunAi"></div>
            <div class="qt-dun-msg" id="qtDunMsg"></div>
            <div class="qt-dun-act">
              <small>${icon('bell', 13)} 自動規則：逾期 3 天禮貌提醒、逾期 14 天改正式語氣</small>
              <button class="btn btn-ghost btn-sm" id="qtDunRe">${icon('refresh', 14)} 重寫</button>
              <button class="btn btn-primary btn-sm" id="qtDunSend">${icon('send', 14)} 一鍵寄出提醒</button>
              <button class="btn btn-ghost btn-sm qt-paid-btn" id="qtDunPaid">${icon('coins', 14)} 已收款・自動沖銷</button>
            </div>
          </div>
        </div>
      </div>

      <div class="glass card qt-subs anim-in">
        <div class="card-h"><h3>${icon('refresh', 18)} 定期供貨・自動扣款</h3><span class="chip-sm" id="qtSubSum">—</span></div>
        <div class="qt-subs-grid">
          <div class="qt-sub-rows" id="qtSubRows"></div>
          <div class="qt-cal-wrap"><div class="qt-cal-h"><b>未來 5 週排程</b><span><i class="ship"></i>自動出貨</span><span><em>${icon('coins', 10)}</em>自動請款</span></div><div class="qt-cal" id="qtCal"></div></div>
        </div>
      </div>

      <div class="qt-charts">
        <div class="glass card anim-in"><div class="card-h"><h3>${icon('percent', 18)} 成交漏斗（近 90 天）</h3><span class="chip-sm">件數</span></div><div class="chart qt-chart" id="qtFunnel"></div><div class="qt-chart-note" id="qtFunNote"></div></div>
        <div class="glass card anim-in"><div class="card-h"><h3>${icon('trend', 18)} 企業營收趨勢與下月預估</h3><span class="chip-sm">未稅</span></div><div class="chart qt-chart" id="qtTrend"></div><div class="qt-chart-note" id="qtTrendNote"></div></div>
      </div>
    </div>`;

    renderBoard();
    renderBilling();
    renderAR();
    renderSubs();
    // 預先放一張範例報價（不跑動畫）
    $('#qtPrompt', root).value = defaultPrompt();
    S.genFor = S.deals.find(d => d.stage === 'inquiry' && d.cid === 'chenguang')?.id || null;
    generate(false);

    // 事件
    $('#qtBoard', root).addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (b) onAct(b.dataset.act); });
    $('#qtNew', root).addEventListener('click', () => {
      const g = $('.qt-gen', root); const views = $('#views');
      views.scrollTo({ top: views.scrollTop + g.getBoundingClientRect().top - 90, behavior: 'smooth' });
      setTimeout(() => $('#qtPrompt', root).focus({ preventScroll: true }), 500);
    });
    $('#qtGen', root).addEventListener('click', () => generate(true));
    $('#qtPrompt', root).addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); generate(true); } });
    $$('.qt-ex-c', root).forEach(b => b.addEventListener('click', () => { $('#qtPrompt', root).value = b.dataset.ex; S.genFor = null; generate(true); }));
    $('#qtMic', root).addEventListener('click', toggleMic);
    const paper = $('#qtPaper', root);
    paper.addEventListener('input', onPaperInput);
    paper.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('[contenteditable]:not(ol)')) { e.preventDefault(); e.target.blur(); } });
    $$('[data-send]', root).forEach(b => b.addEventListener('click', () => {
      if (!S.draft) { toast('還沒有報價單', '先輸入一句話讓 AI 產生報價單', { kind: 'warn', icon: icon('alert', 18) }); return; }
      sendQuote(b.dataset.send);
    }));
    $('#qtZoomIn', root).addEventListener('click', () => setZoom(S.zoom + 0.1));
    $('#qtZoomOut', root).addEventListener('click', () => setZoom(S.zoom - 0.1));
    $('#qtDl', root).addEventListener('click', () => toast('PDF 預覽（示範）', '原型不會真的產生檔案；正式版可一鍵下載或直接寄給客戶', { kind: 'info', icon: icon('file', 18) }));

    $('#qtBillTabs', root).addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) { S.billTab = b.dataset.tab; renderBilling(); gsap.fromTo('#qtBillBody > *', { opacity: 0, y: 8 }, { opacity: 1, y: 0, stagger: 0.04, duration: 0.3 }); } });
    $('#qtBillBody', root).addEventListener('click', (e) => {
      const b = e.target.closest('[data-bill]'); if (b) { const d = S.deals.find(x => x.id === b.dataset.bill); if (d) openBill(d); return; }
      const s = e.target.closest('[data-stmt]'); if (s) { S.stmtCid = s.dataset.stmt; renderBilling(); return; }
      const ss = e.target.closest('[data-stmt-send]');
      if (ss) {
        const c = CUST[ss.dataset.stmtSend]; const st = statementRows(c.id, S.deals, S.subs);
        store.log('bank', `${c.short} 月結對帳單（${st.rows.length} 筆出貨，NT$ ${n0(st.total)}）與彙總電子發票已寄出`);
        toast(`月結對帳單已寄出｜${c.short}`, `${st.rows.length} 筆出貨彙總・NT$ ${n0(st.total)}・合併開立一張三聯式發票`, { icon: icon('send', 18) });
        bump(2, 30); renderKpis();
        ss.disabled = true; ss.innerHTML = `${icon('check', 14)} 已寄出`;
      }
    });
    $('#qtArRows', root).addEventListener('click', (e) => { const r = e.target.closest('.qt-ar-row'); if (r) selectAR(r.dataset.id, true); });
    $('#qtTone', root).addEventListener('click', (e) => { const b = e.target.closest('[data-tone]'); if (!b) return; S.tone = b.dataset.tone; $$('#qtTone .seg', root).forEach(x => x.classList.toggle('on', x === b)); writeDun(true); });
    $('#qtArCh', root).addEventListener('click', (e) => { const b = e.target.closest('[data-ch]'); if (!b) return; S.arCh = b.dataset.ch; $$('#qtArCh .seg', root).forEach(x => x.classList.toggle('on', x === b)); writeDun(true); });
    $('#qtDunRe', root).addEventListener('click', () => writeDun(true));
    $('#qtDunSend', root).addEventListener('click', sendDun);
    $('#qtDunPaid', root).addEventListener('click', () => { const d = S.deals.find(x => x.id === S.arSel); if (d) markPaid(d); });
    $$('[data-rule]', root).forEach(b => b.addEventListener('click', () => {
      const r = RULES[+b.dataset.rule]; r.on = !r.on;
      b.classList.toggle('on', r.on); b.setAttribute('aria-checked', r.on);
      toast(r.on ? `已開啟｜${r.t}` : `已關閉｜${r.t}`, r.on ? r.s : '關閉後需要你手動處理這一步', { kind: r.on ? 'ok' : 'warn', icon: icon(r.ic, 18) });
    }));
    $('#qtSubRows', root).addEventListener('click', (e) => { const b = e.target.closest('[data-toggle]'); if (b) toggleSub(b.dataset.toggle); });

    charts = { funnel: makeChart($('#qtFunnel', root)), trend: makeChart($('#qtTrend', root)) };
    store.on('reset', () => {
      closeModal(true); seed(); renderBoard(); renderBilling(); renderAR(); renderSubs();
      $('#qtPrompt', root).value = defaultPrompt();
      S.genFor = S.deals.find(d => d.stage === 'inquiry' && d.cid === 'chenguang')?.id || null;
      generate(false); renderKpis(); updateCharts();
    });
  },
  show() {
    renderKpis();
    updateCharts();
    setTimeout(() => { if (charts) { charts.funnel.resize(); charts.trend.resize(); } }, 60);
  },
  hide() { closeModal(true); if (rec) { try { rec.stop(); } catch { /* ignore */ } } },
};

function setZoom(z) {
  S.zoom = Math.min(1.3, Math.max(0.7, Math.round(z * 10) / 10));
  $('#qtPaper', root).style.setProperty('--z', S.zoom);
  toast(`縮放 ${Math.round(S.zoom * 100)}%`, '', { kind: 'info', icon: ZOOM_IC(18, true), duration: 1200 });
}
function toggleMic() {
  const btn = $('#qtMic', root);
  if (rec) { try { rec.stop(); } catch { /* ignore */ } return; }
  rec = getRecognizer('zh-TW');
  if (!rec) { toast('此瀏覽器不支援語音輸入', '可改用 Chrome，或直接打字', { kind: 'warn', icon: icon('mic', 18) }); return; }
  btn.classList.add('on');
  const ta = $('#qtPrompt', root);
  rec.onresult = (e) => { ta.value = Array.from(e.results).map(r => r[0].transcript).join(''); };
  rec.onend = () => { btn.classList.remove('on'); rec = null; if (ta.value.trim()) generate(true); };
  rec.onerror = () => { btn.classList.remove('on'); rec = null; };
  try { rec.start(); } catch { btn.classList.remove('on'); rec = null; }
}
