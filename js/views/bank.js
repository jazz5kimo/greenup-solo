// 金流對帳（財）：銀行／金流 AI 自動對帳、應收催款、現金流預測、電子發票
import { store } from '../state.js';
import { $, $$, el, gsap, esc, money, fmtMD, fmtTime, sleep, countUp, typeText, toast } from '../util.js';
import { icon } from '../icons.js';
import { makeChart } from '../charts.js';
import { startOfDay } from '../data.js';
import { PROVIDERS, buildRecon, accountCards, payoutTimeline, cashForecast, b2bReceivables, dunningMessage, LANG_NAME, einvoiceStats } from '../bank-data.js';

let root, recon, accts, charts = null;
const S = { running: false, done: false, links: [], resolved: new Set(), matched: 0, books: 0, oneMany: 0, fee: 0, b2bPaid: new Set(), sel: null, app: 'line', sent: new Set(), extraBook: null };

const SVG_NS = 'http://www.w3.org/2000/svg';
const n0 = (n) => Math.round(n).toLocaleString('en-US');
const wan = (n) => (n / 10000).toFixed(n >= 1e6 ? 0 : 1) + ' 萬';
const PROV_COLOR = { bank: '#2DB674', ecpay: '#2E97D4', linepay: '#06C755', jko: '#EC6A55' };
const BOOK_TAG = { order: ['訂單', 'var(--leaf)'], pos: ['日結', 'var(--coral)'], ar: ['應收', 'var(--pink)'], buy: ['進貨', 'var(--sky)'], hr: ['薪資', 'var(--violet)'], rent: ['租金', 'var(--amber)'], fee: ['分錄', 'var(--mint)'] };
const CH_NAME = { line: 'LINE', web: '官網', pos: '門市', phone: '電話', whatsapp: 'WhatsApp', zalo: 'Zalo', messenger: 'Messenger' };

// 小型品牌標記（自繪，非官方標誌）
const mark = (p, size = 40) => `<span class="bnk-mark" style="--pc:${p.color};width:${size}px;height:${size}px">${p.id === 'bank' ? icon('bank', size * 0.5) : `<b>${p.mark}</b>`}</span>`;
const waIcon = (s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.6-2-1-1 .8c-1-.4-1.8-1.2-2.2-2.2l.8-1-1-2z"/></svg>`;
const lineIcon = (s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 4C6.5 4 3 7.3 3 11.1c0 3.4 3 6.2 7.2 6.8l-.4 2.4c0 .4.3.6.7.4 2.6-1.4 6.6-4.2 8.1-6.5.9-1.2 1.4-2.2 1.4-3.1C21 7.3 17.5 4 12 4z"/></svg>`;

const KPI_DEF = [
  { key: 'cash', label: '銀行存款餘額', icon: 'bank', color: 'var(--leaf)' },
  { key: 'inflow', label: '今日入帳', icon: 'coins', color: 'var(--sky)' },
  { key: 'pending', label: '待對帳筆數', icon: 'clock', color: 'var(--amber)' },
  { key: 'rate', label: '自動對帳率', icon: 'sparkle', color: 'var(--mint)' },
  { key: 'ar', label: '應收帳款', icon: 'receipt', color: 'var(--pink)' },
];

export default {
  mount(section) {
    root = section;
    recon = buildRecon(store);
    accts = accountCards(store, recon);
    section.innerHTML = `
    <div class="bnk">
      <div class="bnk-kpis">${KPI_DEF.map(k => `
        <div class="kpi glass anim-in" data-k="${k.key}" style="--c:${k.color}">
          <div class="kpi-top"><span class="kpi-ic">${icon(k.icon, 18)}</span><span class="kpi-label">${k.label}</span><span class="kpi-delta" data-delta></span></div>
          <div class="kpi-val" data-val>0</div>
          <div class="kpi-sub" data-sub></div>
        </div>`).join('')}
      </div>

      <div class="glass card bnk-acc anim-in">
        <div class="card-h"><h3>${icon('bank', 18)} 帳戶與金流總覽</h3><span class="demo-badge">${icon('alert', 13)} 示範資料・非真實串接</span></div>
        <div class="bnk-acc-grid">${accts.map(a => `
          <div class="bnk-tile" style="--pc:${a.color}">
            <div class="bnk-tile-h">${mark(a, 38)}<div><b>${a.name}</b><small>${a.sub}</small></div></div>
            <div class="bnk-tile-bal"><small>${a.label}</small><b data-bal="${a.balance}">NT$ 0</b></div>
            <div class="bnk-tile-row"><span>${a.todayLabel}</span><b class="up">+ ${money(a.today)}</b></div>
            <div class="bnk-tile-foot"><small>${a.extra}</small><svg class="bnk-spark" viewBox="0 0 100 28" preserveAspectRatio="none"><path d="${spark(a.spark).area}" class="a"/><path d="${spark(a.spark).line}" class="l"/></svg></div>
          </div>`).join('')}
        </div>
        <div class="bnk-tl-h"><b>撥款時間軸</b><small>AI 依各金流撥款週期自動預估，入帳後即時對帳</small></div>
        <div class="bnk-tl" id="bnkTl"></div>
      </div>

      <div class="glass bnk-rc-card anim-in">
        <div class="bnk-rc-head">
          <div class="bnk-orb" id="bnkOrb"><i></i><i></i><i></i>${icon('sparkle', 26)}</div>
          <div class="bnk-rc-title">
            <h3>AI 自動對帳 <span class="chip-sm">銀行 × 金流 × 帳上紀錄</span></h3>
            <p id="bnkStatus">今日共有 <b>${recon.bank.length}</b> 筆銀行與金流交易待對帳。AI 會比對金額、日期、戶名與金流批次，自動配對訂單、發票與進貨。</p>
          </div>
          <div class="bnk-rc-actions">
            <button class="btn btn-primary btn-lg" id="bnkRun">${icon('wand', 18)} 開始 AI 對帳</button>
          </div>
        </div>
        <div class="bnk-rc-stats">
          <div><small>已配對</small><b id="bsMatch">0</b><span>/ ${recon.bank.length} 筆</span></div>
          <div><small>一對多撥款</small><b id="bsMany">0</b><span>批</span></div>
          <div><small>沖銷訂單／憑證</small><b id="bsBooks">0</b><span>張</span></div>
          <div><small>手續費自動入帳</small><b id="bsFee">NT$ 0</b></div>
          <div class="warn"><small>異常待確認</small><b id="bsAnom">0</b><span>筆</span></div>
          <div class="bnk-prog"><i id="bnkProg"></i></div>
        </div>
        <div class="bnk-rc" id="bnkRc">
          <div class="bnk-col bnk-col-l">
            <div class="bnk-col-h">${icon('bank', 15)} 銀行／金流交易明細 <small>玉山銀行・綠界・LINE Pay・街口</small></div>
            ${recon.bank.map(txRow).join('')}
          </div>
          <div class="bnk-gap" aria-hidden="true"></div>
          <div class="bnk-col bnk-col-r" id="bnkBooks">
            <div class="bnk-col-h">${icon('book', 15)} 帳上紀錄 <small>訂單・發票・進貨・薪資</small></div>
            ${bookRows()}
          </div>
          <svg class="bnk-svg" id="bnkSvg"><defs>
            <filter id="bnkGlow" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="3.2"/></filter>
            <linearGradient id="bnkGradOk" x1="0" x2="1"><stop offset="0" stop-color="#5EE0C4"/><stop offset="1" stop-color="#2DB674"/></linearGradient>
            <linearGradient id="bnkGradWarn" x1="0" x2="1"><stop offset="0" stop-color="#F0A531"/><stop offset="1" stop-color="#ffcf8a"/></linearGradient>
          </defs><g id="bnkLinks"></g></svg>
        </div>
        <div class="bnk-anoms" id="bnkAnoms" hidden>
          <div class="bnk-anoms-h"><h4>${icon('alert', 17)} AI 無法自動配對的 <b id="bnkAnN">0</b> 筆・已附判斷建議</h4><button class="btn btn-ghost btn-sm" id="bnkAcceptAll">${icon('check', 15)} 全部接受建議</button></div>
          <div class="bnk-anom-list" id="bnkAnomList"></div>
        </div>
      </div>

      <div class="bnk-ar">
        <div class="glass card bnk-aging anim-in"><div class="card-h"><h3>${icon('clock', 17)} 應收帳款帳齡</h3><span class="chip-sm" id="bnkArTot">—</span></div><div class="bnk-lg"><span><i></i>線上訂單</span><span><i class="soft"></i>企業月結（淡色）</span><span class="r">顏色＝帳齡風險</span></div><div class="chart" id="bnkAging"></div>
          <div class="bnk-aging-note" id="bnkAgingNote"></div></div>
        <div class="glass card bnk-arlist anim-in"><div class="card-h"><h3>${icon('receipt', 17)} 待付款訂單</h3><span class="chip-sm warn" id="bnkArCnt">—</span></div><div class="bnk-ar-rows" id="bnkArRows"></div></div>
        <div class="glass card bnk-dun anim-in">
          <div class="card-h"><h3>${icon('bot', 17)} AI 催款訊息</h3><div class="bnk-app"><button class="seg" data-app="line">${lineIcon(14)} LINE</button><button class="seg" data-app="wa">${waIcon(14)} WhatsApp</button></div></div>
          <div class="bnk-dun-who" id="bnkDunWho"></div>
          <div class="bnk-phone" id="bnkPhone">
            <div class="bnk-ph-top"><span class="bnk-ph-av">美</span><div><b>阿美手作甜點</b><small id="bnkPhSub">官方帳號</small></div></div>
            <div class="bnk-ph-body" id="bnkPhBody"></div>
          </div>
          <div class="bnk-dun-act">
            <button class="btn btn-ghost btn-sm" id="bnkGen">${icon('wand', 15)} AI 產生催款訊息</button>
            <button class="btn btn-primary btn-sm" id="bnkSend">${icon('send', 15)} 發送</button>
            <button class="btn btn-ghost btn-sm" id="bnkPaid">${icon('check', 15)} 標記已收款</button>
          </div>
        </div>
      </div>

      <div class="bnk-cf">
        <div class="glass card bnk-fc anim-in">
          <div class="card-h"><h3>${icon('trend', 17)} 未來 60 天現金流預測</h3><span class="chip-sm">AI 預測・含 80% 信賴區間</span></div>
          <div class="bnk-ai-note" id="bnkFcNote"></div>
          <div class="chart" id="bnkFc"></div>
          <div class="bnk-evs" id="bnkEvs"></div>
        </div>
        <div class="glass card bnk-inv anim-in" id="bnkInv"></div>
      </div>
    </div>`;

    $('#bnkRun', root).addEventListener('click', () => (S.done ? resetRecon(true) : runRecon()));
    $('#bnkAcceptAll', root).addEventListener('click', acceptAll);
    $('#bnkGen', root).addEventListener('click', () => genMessage(true));
    $('#bnkSend', root).addEventListener('click', sendMessage);
    $('#bnkPaid', root).addEventListener('click', () => S.sel && markPaid(S.sel));
    $$('.bnk-app .seg', root).forEach(b => b.addEventListener('click', () => { S.app = b.dataset.app; applyApp(); }));
    $('#bnkRc', root).addEventListener('mouseover', hoverLinks);
    $('#bnkRc', root).addEventListener('mouseleave', () => $$('.bnk-link', root).forEach(p => p.classList.remove('hl', 'dim')));
    window.addEventListener('resize', () => { if (root && !root.hidden) relayout(); });

    renderTimeline();
    renderInvoice();
    const refreshAll = () => { renderKpis(true); renderAR(); };
    store.on('order', refreshAll);
    store.on('order-updated', refreshAll);
    store.on('reset', refreshAll);
  },
  show() {
    if (!charts) charts = { aging: makeChart($('#bnkAging', root)), fc: makeChart($('#bnkFc', root)) };
    renderKpis(false);
    $$('.bnk-tile-bal b', root).forEach((b, i) => countUp(b, +b.dataset.bal, { prefix: 'NT$ ', duration: 1.6, from: 0 }));
    renderAR();
    renderForecast();
    requestAnimationFrame(relayout);
  },
};

// ---------- 共用 ----------
function spark(vals, w = 100, h = 28) {
  const max = Math.max(...vals), min = Math.min(...vals);
  const pts = vals.map((v, i) => [i / (vals.length - 1) * w, h - 3 - (max === min ? 0.5 : (v - min) / (max - min)) * (h - 6)]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  return { line: d, area: d + ` L ${w} ${h} L 0 ${h} Z` };
}

function pendingOrders() { return store.orders.filter(o => o.status === 'pending'); }
function arItems() {
  const now = Date.now();
  const age = (ts) => Math.max(0, Math.floor((startOfDay(now) - startOfDay(ts)) / 864e5));
  const a = pendingOrders().map(o => ({ ...o, age: age(o.ts), src: 'order' }));
  const b = b2bReceivables().filter(x => !S.b2bPaid.has(x.id)).map(x => ({ ...x, age: age(x.ts), src: 'b2b' }));
  return [...b, ...a].sort((x, y) => y.age - x.age || y.total - x.total);
}

function unresolvedCount() {
  if (!S.done && !S.running) return recon.bank.length;
  return recon.bank.filter(t => !(t.anomaly ? S.resolved.has(t.i) : rowState(t.i) === 'ok')).length;
}
const rowState = (i) => { const r = $(`.bnk-tx[data-i="${i}"]`, root); return r ? r.dataset.state : ''; };

function renderKpis(live) {
  const inflow = recon.bank.filter(t => t.dir === 'in').reduce((s, t) => s + t.amt, 0);
  const pend = pendingOrders();
  const st = recon.stats;
  const autoNow = S.done ? S.matched : 0;
  const totNow = S.done ? recon.bank.length : 0;
  const rate = (st.prevMatched + autoNow) / (st.prevTotal + totNow) * 100;
  const unres = unresolvedCount();
  const vals = {
    cash: [accts[0].balance, { prefix: 'NT$ ' }, '玉山銀行活存・即時餘額', ['up', '帳實相符']],
    inflow: [inflow, { prefix: 'NT$ ' }, `${recon.bank.filter(t => t.dir === 'in').length} 筆・含金流撥款與轉帳`, ['up', '今日']],
    pending: [unres, { suffix: ' 筆' }, S.done ? (unres ? 'AI 已附建議，一鍵即可處理' : '今日帳務已全部核對完成') : '按「開始 AI 對帳」自動處理', unres ? ['warn', S.done ? '待確認' : '待處理'] : ['up', '完成']],
    rate: [rate, { suffix: '%', decimals: 1 }, `近 30 天 ${n0(st.prevTotal + totNow)} 筆交易`, ['up', '人工 0 分鐘']],
    ar: [store.sum(pend), { prefix: 'NT$ ' }, `${pend.length} 筆訂單待付款・付款連結已附`, ['warn', `${pend.length} 筆`]],
  };
  for (const def of KPI_DEF) {
    const card = $(`.kpi[data-k="${def.key}"]`, root);
    const [v, opt, sub, [cls, txt]] = vals[def.key];
    const ve = $('[data-val]', card);
    const before = parseFloat(ve.dataset.value || 0);
    countUp(ve, v, { ...opt, duration: live ? 1.1 : 1.6 });
    if (live && Math.abs(before - v) > 0.01) { card.classList.remove('flash'); void card.offsetWidth; card.classList.add('flash'); }
    $('[data-sub]', card).textContent = sub;
    const d = $('[data-delta]', card); d.className = 'kpi-delta ' + cls; d.textContent = txt;
  }
}

// ---------- 帳戶時間軸 ----------
function renderTimeline() {
  const items = payoutTimeline(store, recon);
  const today = startOfDay(new Date());
  const dayLbl = (ts) => { const d = Math.round((startOfDay(ts) - today) / 864e5); return d === 0 ? '今天' : d === 1 ? '明天' : d === 2 ? '後天' : fmtMD(ts); };
  const nowIdx = items.findIndex(x => !x.done);
  $('#bnkTl', root).innerHTML = `<div class="bnk-tl-track"><i class="bnk-tl-fill" style="--p:${nowIdx < 0 ? 1 : (nowIdx - 0.5) / items.length}"></i></div>` + items.map((x, k) => `
    <div class="bnk-tl-node ${x.done ? 'done' : 'next'}" style="--pc:${PROV_COLOR[x.prov]}">
      <span class="bnk-tl-dot">${x.done ? icon('check', 12) : ''}</span>
      <small>${dayLbl(x.ts)} ${fmtTime(x.ts)}</small>
      <b>${esc(x.title.replace(' 預計撥款', '').replace(' 撥款', ''))}</b>
      <em>${x.done ? '已入帳' : '預計'} ${money(x.amt)}</em>
    </div>${k === nowIdx - 1 ? '<div class="bnk-tl-now"><span>現在</span></div>' : ''}`).join('');
}

// ---------- AI 對帳 ----------
function txRow(t) {
  const p = PROVIDERS[t.prov];
  return `<div class="bnk-tx" data-i="${t.i}" data-state="idle" style="--pc:${PROV_COLOR[t.prov]}">
    <span class="bnk-tx-ic ${t.dir}">${t.prov === 'bank' ? (t.dir === 'in' ? '<b>＋</b>' : '<b>－</b>') : `<b>${p.mark}</b>`}</span>
    <div class="bnk-tx-m"><b>${esc(t.title)}</b><small>${fmtTime(t.ts)}・${esc(t.sub)}</small></div>
    <div class="bnk-tx-a ${t.dir}">${t.dir === 'in' ? '+' : '−'}${n0(t.amt)}${t.fee ? `<small>手續費 ${n0(t.fee)}</small>` : ''}</div>
    <span class="bnk-st"></span><span class="bnk-no"></span>
  </div>`;
}
function bookRow(b) {
  const [tg, c] = BOOK_TAG[b.type];
  return `<div class="bnk-bk" data-j="${b.j}" style="--tc:${c}"><span class="bnk-no"></span><span class="bnk-bk-t">${tg}</span><div class="bnk-bk-m"><b>${esc(b.title)}<em>${esc(b.who)}</em></b><small>${esc(b.sub)}</small></div><div class="bnk-bk-a">${n0(b.amt)}</div><span class="bnk-st"></span></div>`;
}
function bookRows() {
  let g = '', h = '';
  for (const b of recon.book) {
    if (b.group !== g) { g = b.group; h += `<div class="bnk-grp">${esc(g)}</div>`; }
    h += bookRow(b);
  }
  return h;
}

function pathD(i, j) {
  const box = $('#bnkRc', root).getBoundingClientRect();
  const a = $(`.bnk-tx[data-i="${i}"]`, root).getBoundingClientRect();
  const b = $(`.bnk-bk[data-j="${j}"]`, root).getBoundingClientRect();
  const x1 = a.right - box.left - 2, y1 = a.top + a.height / 2 - box.top;
  const x2 = b.left - box.left + 2, y2 = b.top + b.height / 2 - box.top;
  const dx = Math.max(40, (x2 - x1) * 0.55);
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${(x1 + dx).toFixed(1)} ${y1.toFixed(1)}, ${(x2 - dx).toFixed(1)} ${y2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}
function svgEl(tag, attrs) { const e = document.createElementNS(SVG_NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; }

function drawLink(i, j, kind = 'ok', animate = true) {
  const g = $('#bnkLinks', root);
  const d = pathD(i, j);
  const grp = svgEl('g', { class: `bnk-link ${kind}`, 'data-i': i, 'data-j': j });
  const stroke = kind === 'ok' ? 'url(#bnkGradOk)' : 'url(#bnkGradWarn)';
  const glow = svgEl('path', { d, class: 'glow', stroke, filter: 'url(#bnkGlow)' });
  const core = svgEl('path', { d, class: 'core', stroke });
  grp.append(glow, core);
  g.appendChild(grp);
  const link = { i, j, kind, grp };
  S.links.push(link);
  if (!animate) return Promise.resolve(link);
  const len = core.getTotalLength();
  const dot = svgEl('circle', { r: 4.5, class: 'dot' });
  grp.appendChild(dot);
  return new Promise(res => {
    [glow, core].forEach(p => { p.style.strokeDasharray = `${len} ${len}`; p.style.strokeDashoffset = len; });
    const o = { t: 0 };
    gsap.to(o, { t: 1, duration: 0.5, ease: 'power2.inOut', onUpdate: () => {
      const off = len * (1 - o.t);
      glow.style.strokeDashoffset = off; core.style.strokeDashoffset = off;
      const pt = core.getPointAtLength(len * o.t); dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y);
    }, onComplete: () => {
      [glow, core].forEach(p => { p.style.strokeDasharray = kind === 'warn' ? '6 6' : ''; p.style.strokeDashoffset = 0; });
      gsap.to(dot, { attr: { r: 10 }, opacity: 0, duration: 0.45, onComplete: () => dot.remove() });
      res(link);
    } });
  });
}
function relayout() {
  for (const l of S.links) {
    if (!$(`.bnk-bk[data-j="${l.j}"]`, root)) continue;
    const d = pathD(l.i, l.j);
    $$('path', l.grp).forEach(p => p.setAttribute('d', d));
  }
  const svg = $('#bnkSvg', root), box = $('#bnkRc', root);
  svg.setAttribute('width', box.clientWidth); svg.setAttribute('height', box.clientHeight);
}
function hoverLinks(e) {
  const row = e.target.closest('.bnk-tx, .bnk-bk');
  const ls = $$('.bnk-link', root);
  if (!row) { ls.forEach(p => p.classList.remove('hl', 'dim')); return; }
  const isTx = row.classList.contains('bnk-tx');
  const id = isTx ? row.dataset.i : row.dataset.j;
  ls.forEach(p => { const on = (isTx ? p.dataset.i : p.dataset.j) === id; p.classList.toggle('hl', on); p.classList.toggle('dim', !on); });
}

function setRow(sel, state, label = '') {
  const r = $(sel, root); if (!r) return;
  r.dataset.state = state;
  const st = $('.bnk-st', r);
  st.innerHTML = state === 'ok' ? icon('check', 13) : state === 'warn' ? '<b>!</b>' : state === 'scan' ? '<i></i>' : '';
  if (label) $('.bnk-no', r).textContent = label;
  if (state === 'ok' || state === 'warn') gsap.fromTo(st, { scale: 0.2 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
}
function setStatus(html) {
  const s = $('#bnkStatus', root);
  s.innerHTML = html;
  gsap.fromTo(s, { opacity: 0.2, x: -6 }, { opacity: 1, x: 0, duration: 0.3 });
}
function updStats() {
  const anom = recon.bank.filter(t => t.anomaly && !S.resolved.has(t.i) && rowState(t.i) === 'warn').length;
  $('#bsMatch', root).textContent = S.matched;
  $('#bsMany', root).textContent = S.oneMany;
  $('#bsBooks', root).textContent = S.books;
  $('#bsFee', root).textContent = money(S.fee);
  $('#bsAnom', root).textContent = anom;
}

function resetRecon(thenRun = false) {
  S.links = []; S.resolved.clear(); S.matched = 0; S.books = 0; S.oneMany = 0; S.fee = 0; S.done = false;
  $('#bnkLinks', root).innerHTML = '';
  $$('.bnk-tx', root).forEach(r => setRow(`.bnk-tx[data-i="${r.dataset.i}"]`, 'idle'));
  $$('.bnk-tx .bnk-no, .bnk-bk .bnk-no', root).forEach(n => { n.textContent = ''; });
  $$('.bnk-bk', root).forEach(r => { r.dataset.state = 'idle'; $('.bnk-st', r).innerHTML = ''; });
  const extra = $('.bnk-bk.extra', root); if (extra) { extra.previousElementSibling?.classList.contains('bnk-grp') && extra.previousElementSibling.remove(); extra.remove(); }
  if (S.b2bPaidByRecon) { S.b2bPaid.delete(S.b2bPaidByRecon); S.b2bPaidByRecon = null; renderAR(); }
  $('#bnkAnoms', root).hidden = true;
  $('#bnkProg', root).style.width = '0%';
  updStats(); renderKpis(true);
  if (thenRun) runRecon();
}

async function runRecon() {
  if (S.running) return;
  S.running = true;
  const btn = $('#bnkRun', root);
  btn.disabled = true; btn.innerHTML = `<span class="bnk-spin"></span> AI 對帳中…`;
  $('#bnkOrb', root).classList.add('on');
  relayout();
  let n = 0;
  for (const t of recon.bank) {
    const sel = `.bnk-tx[data-i="${t.i}"]`;
    setRow(sel, 'scan');
    setStatus(`<b class="bnk-hot">掃描中</b> ${esc(t.title)}・${t.dir === 'in' ? '+' : '−'}${n0(t.amt)}　→　${scanText(t)}`);
    await sleep(240);
    if (!t.anomaly) {
      n += 1;
      const tag = `#${n}`;
      const ps = t.books.map((j, k) => sleep(k * 90).then(() => drawLink(t.i, j, 'ok')));
      await Promise.all(ps);
      t.books.forEach(j => setRow(`.bnk-bk[data-j="${j}"]`, 'ok', tag));
      setRow(sel, 'ok', tag);
      S.matched += 1; S.books += t.books.length; if (t.books.length > 1) S.oneMany += 1; S.fee += t.fee || 0;
    } else {
      const a = t.anomaly;
      if (a.cand.length) await Promise.all(a.cand.map(j => drawLink(t.i, j, 'warn')));
      a.cand.forEach(j => setRow(`.bnk-bk[data-j="${j}"]`, 'warn', '?'));
      setRow(sel, 'warn', '?');
      gsap.fromTo($(sel, root), { x: -5 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
    }
    updStats();
    $('#bnkProg', root).style.width = `${(t.i + 1) / recon.bank.length * 100}%`;
    await sleep(130);
  }
  S.running = false; S.done = true;
  $('#bnkOrb', root).classList.remove('on');
  btn.disabled = false; btn.innerHTML = `${icon('refresh', 18)} 重新對帳`;
  const anoms = recon.bank.filter(t => t.anomaly);
  setStatus(`對帳完成：<b>${S.matched}</b> 筆自動配對（含 <b>${S.oneMany}</b> 批金流撥款一對多沖銷 ${S.books} 張單據），手續費 <b>${money(S.fee)}</b> 已自動記入「金流手續費」；<b class="bnk-warn-t">${anoms.length}</b> 筆需要你確認。`);
  renderAnoms();
  renderKpis(true);
  toast('AI 對帳完成', `${S.matched} 筆自動配對、${anoms.length} 筆異常已附建議（示範）`, { icon: icon('sparkle', 18) });
}
function scanText(t) {
  if (t.anomaly) return `<span class="bnk-warn-t">異常：${esc(t.anomaly.title)}</span>`;
  if (t.kind === 'settle') return `比對 ${t.books.length} 筆訂單合計 ${n0(t.gross)} − 手續費 ${n0(t.fee)} ＝ ${n0(t.amt)}，一對多配對`;
  const b = recon.book[t.books[0]];
  if (t.kind === 'transfer') return `金額與戶名相符：${esc(b.title)}（${esc(b.who)}）`;
  if (t.kind === 'cash') return `與 ${esc(b.title)} 現金營收相符`;
  if (t.kind === 'buy') return `與進項憑證 ${esc(b.sub.replace('進項發票 ', ''))} 金額相符`;
  if (t.kind === 'payroll') return '與薪資單實發淨額相符';
  if (t.kind === 'rent') return '與租約扣繳 10% 後實付金額相符';
  return '配對中';
}

function renderAnoms() {
  const list = recon.bank.filter(t => t.anomaly);
  const box = $('#bnkAnomList', root);
  $('#bnkAnN', root).textContent = list.length;
  box.innerHTML = list.map(t => { const a = t.anomaly; return `
    <div class="bnk-anom" data-i="${t.i}">
      <div class="bnk-anom-h"><span class="bnk-anom-ic">!</span><div><b>${esc(t.title)}　${t.dir === 'in' ? '+' : '−'}${money(t.amt)}</b><small>${fmtTime(t.ts)}・${esc(a.title)}</small></div></div>
      <p>${esc(a.text)}</p>
      <div class="bnk-conf"><span>AI 信心</span><i><em style="width:${a.conf}%"></em></i><b>${a.conf}%</b></div>
      <div class="bnk-sug">${icon('sparkle', 14)} <span>${esc(a.action)}</span></div>
      <div class="bnk-anom-act"><button class="btn btn-primary btn-sm" data-acc="${t.i}">${icon('check', 14)} ${a.btn}</button><button class="btn btn-ghost btn-sm" data-man="${t.i}">交給會計師</button></div>
      <div class="bnk-anom-done">${icon('check', 15)} ${esc(a.done)}</div>
    </div>`; }).join('');
  $$('[data-acc]', box).forEach(b => b.addEventListener('click', () => accept(+b.dataset.acc)));
  $$('[data-man]', box).forEach(b => b.addEventListener('click', () => toast('已轉給會計師', '已加入「整合與協作」的會計師待辦，附上 AI 判斷與原始明細（示範）', { kind: 'info', icon: icon('users', 18) })));
  const sec = $('#bnkAnoms', root);
  sec.hidden = false;
  gsap.fromTo(sec, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5 });
  gsap.fromTo($$('.bnk-anom', sec), { opacity: 0, y: 20, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.1, ease: 'power3.out' });
}

async function accept(i) {
  if (S.resolved.has(i)) return;
  const t = recon.bank[i], a = t.anomaly;
  S.resolved.add(i);
  const card = $(`.bnk-anom[data-i="${i}"]`, root);
  card.classList.add('ok');
  gsap.fromTo(card, { scale: 0.97 }, { scale: 1, duration: 0.5, ease: 'back.out(2)' });
  // 原本的虛線改為綠色實線
  S.links.filter(l => l.i === i).forEach(l => { l.grp.remove(); });
  S.links = S.links.filter(l => l.i !== i);
  let targets = a.cand;
  if (!targets.length) {
    // 新增一筆 AI 分錄到帳上紀錄
    const col = $('#bnkBooks', root);
    const j = recon.book.length + 100;
    col.appendChild(el(`<div class="bnk-grp extra-g">AI 新增分錄</div>`));
    const row = el(bookRow({ j, type: 'fee', title: '手續費', who: '銀行費用', sub: '借：手續費／貸：銀行存款', amt: t.amt }));
    row.classList.add('extra');
    col.appendChild(row);
    gsap.fromTo(row, { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 0.4 });
    relayout();
    targets = [j];
  }
  await Promise.all(targets.map(j => drawLink(i, j, 'ok')));
  targets.forEach(j => setRow(`.bnk-bk[data-j="${j}"]`, 'ok', '✓'));
  setRow(`.bnk-tx[data-i="${i}"]`, 'ok', '✓');
  if (a.code === 'short') S.fee += a.diff;
  if (a.code === 'fee') S.fee += t.amt;
  if (a.b2b) { S.b2bPaid.add(a.b2b); S.b2bPaidByRecon = a.b2b; renderAR(); }
  S.books += targets.length;
  updStats(); renderKpis(true);
  toast('已接受 AI 建議', a.done, { icon: icon('check', 18) });
  if (recon.bank.filter(x => x.anomaly).every(x => S.resolved.has(x.i))) {
    setStatus(`<b class="bnk-hot">今日帳務 100% 核對完成</b>：${recon.bank.length} 筆交易全部入帳，分錄已同步至「會計帳務」，可直接結帳。`);
  }
}
async function acceptAll() { for (const t of recon.bank.filter(x => x.anomaly && !S.resolved.has(x.i))) { await accept(t.i); await sleep(200); } }

// ---------- 應收與催款 ----------
const bucket = (age) => age <= 7 ? 0 : age <= 30 ? 1 : age <= 60 ? 2 : 3;
const BUCKETS = ['0–7 天', '8–30 天', '31–60 天', '60 天以上'];
const BCOLOR = ['#2DB674', '#F0A531', '#EC6A55', '#DD5597'];

function renderAR() {
  const items = arItems();
  const total = items.reduce((s, x) => s + x.total, 0);
  $('#bnkArTot', root).textContent = `合計 ${money(total)}`;
  $('#bnkArCnt', root).textContent = `${items.length} 筆`;
  const ord = [0, 0, 0, 0], b2b = [0, 0, 0, 0];
  items.forEach(x => { (x.src === 'b2b' ? b2b : ord)[bucket(x.age)] += x.total; });
  const over30 = items.filter(x => x.age > 30).reduce((s, x) => s + x.total, 0);
  $('#bnkAgingNote', root).innerHTML = `${icon('sparkle', 14)}<span>逾 30 天 <b>${money(over30)}</b>（占 ${total ? Math.round(over30 / total * 100) : 0}%），多為企業月結；AI 建議本週優先催收並改為「預付 50% 訂金」。</span>`;
  if (charts) {
    charts.aging.setOption({
      animationDuration: 1100,
      grid: { left: 4, right: 8, top: 30, bottom: 2, containLabel: true },
            tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: v => money(v) },
      xAxis: { type: 'category', data: BUCKETS, axisLabel: { fontSize: 10, interval: 0 } },
      yAxis: { type: 'value', axisLabel: { formatter: v => v >= 10000 ? v / 10000 + '萬' : v, fontSize: 10 } },
      series: [
        { name: '線上訂單', type: 'bar', stack: 'a', barWidth: '46%', data: ord.map((v, k) => ({ value: v, itemStyle: { color: BCOLOR[k] } })) },
        { name: '企業月結', type: 'bar', stack: 'a', data: b2b.map((v, k) => ({ value: v, itemStyle: { color: BCOLOR[k] + '88', borderRadius: [6, 6, 0, 0] } })),
          label: { show: true, position: 'top', color: '#cfe', fontSize: 11, formatter: p => { const s = ord[p.dataIndex] + b2b[p.dataIndex]; return s ? n0(s) : ''; } } },
      ],
    }, true);
  }
  const rows = $('#bnkArRows', root);
  rows.innerHTML = items.map(x => `
    <div class="bnk-ar-row ${S.sel && S.sel.id === x.id ? 'on' : ''}" data-id="${x.id}" style="--bc:${BCOLOR[bucket(x.age)]}">
      <div class="bnk-ar-m"><b>${esc(x.customer)}</b><small>${x.src === 'b2b' ? esc(x.kind) : `${CH_NAME[x.channel] || ''}・${x.id}`}</small></div>
      <span class="bnk-lang">${LANG_NAME[x.lang] || '中文'}</span>
      <span class="bnk-age">${x.age} 天</span>
      <b class="bnk-ar-amt">${n0(x.total)}</b>
      <button class="icon-btn bnk-mk" title="標記已收款" data-paid="${x.id}">${icon('check', 15)}</button>
    </div>`).join('') || `<div class="bnk-empty">${icon('check', 20)} 目前沒有待收款項</div>`;
  $$('.bnk-ar-row', rows).forEach(r => r.addEventListener('click', (e) => {
    if (e.target.closest('[data-paid]')) return;
    select(items.find(x => x.id === r.dataset.id), true);
  }));
  $$('[data-paid]', rows).forEach(b => b.addEventListener('click', () => markPaid(items.find(x => x.id === b.dataset.paid))));
  if (!S.sel || !items.find(x => x.id === S.sel.id)) {
    const first = items.find(x => x.lang === 'ja') || items[0];
    select(first, false);
  }
}

function select(x, animate) {
  S.sel = x || null;
  $$('.bnk-ar-row', root).forEach(r => r.classList.toggle('on', !!x && r.dataset.id === x.id));
  if (!x) { $('#bnkDunWho', root).innerHTML = ''; $('#bnkPhBody', root).innerHTML = `<div class="bnk-empty">${icon('check', 20)} 沒有需要催收的款項</div>`; return; }
  S.app = x.channel === 'whatsapp' || x.channel === 'zalo' || (x.channel === 'messenger' && x.lang !== 'zh') || x.lang === 'en' || x.lang === 'vi' ? 'wa' : 'line';
  $('#bnkDunWho', root).innerHTML = `<div><b>${esc(x.customer)}</b><small>${x.src === 'b2b' ? esc(x.kind) : x.id}・${money(x.total)}・已 ${x.age} 天</small></div><span class="chip-sm">${icon('globe', 12)} 偵測語言：${LANG_NAME[x.lang] || '中文'}</span>`;
  applyApp();
  genMessage(animate);
}
function applyApp() {
  $$('.bnk-app .seg', root).forEach(b => b.classList.toggle('on', b.dataset.app === S.app));
  const ph = $('#bnkPhone', root);
  ph.dataset.app = S.app;
  $('#bnkPhSub', root).textContent = S.app === 'wa' ? 'WhatsApp Business・已驗證' : 'LINE 官方帳號';
}
let genToken = 0;
async function genMessage(animate) {
  const x = S.sel; if (!x) return;
  const tok = ++genToken;
  const body = $('#bnkPhBody', root);
  const msg = dunningMessage(x, x.age);
  const link = `pay.greenup.ai/${x.id.slice(-6).toLowerCase()}`;
  body.innerHTML = `<div class="bnk-ph-day">今天</div>
    <div class="bnk-bub"><p></p>
      <div class="bnk-paylink">${icon('link', 14)}<div><b>${money(x.total)}</b><small>${link}（示範連結）</small></div><span>${x.lang === 'ja' ? 'お支払い' : x.lang === 'en' ? 'Pay now' : x.lang === 'vi' ? 'Thanh toán' : '立即付款'}</span></div>
      <i class="bnk-bub-t">${fmtTime(new Date())}</i></div>`;
  const p = $('.bnk-bub p', body);
  if (animate) {
    const bub = $('.bnk-bub', body);
    bub.classList.add('typing');
    p.innerHTML = '<span class="bnk-dots"><i></i><i></i><i></i></span>';
    gsap.fromTo(bub, { opacity: 0, y: 14, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.35 });
    await sleep(650);
    if (tok !== genToken) return;
    bub.classList.remove('typing');
    await typeText(p, msg, 7);
  } else p.textContent = msg;
}
function sendMessage() {
  const x = S.sel; if (!x) return;
  const bub = $('#bnkPhBody .bnk-bub', root);
  if (bub && !$('.bnk-read', bub)) $('.bnk-bub-t', bub).insertAdjacentHTML('beforeend', ' <span class="bnk-read">已送達</span>');
  if (bub) gsap.fromTo(bub, { boxShadow: '0 0 0 2px rgba(94,224,196,.8)' }, { boxShadow: '0 0 0 0 rgba(94,224,196,0)', duration: 1 });
  S.sent.add(x.id);
  toast(`催款訊息已發送｜${x.customer}`, `${S.app === 'wa' ? 'WhatsApp' : 'LINE'}・${LANG_NAME[x.lang] || '中文'}・附付款連結 ${money(x.total)}（模擬發送）`, { icon: icon('send', 18) });
}
function markPaid(x) {
  if (!x) return;
  if (x.src === 'b2b') {
    S.b2bPaid.add(x.id);
    toast(`收款完成｜${x.customer}`, `${money(x.total)} 已入帳，應收帳款自動沖銷`, { kind: 'info', icon: icon('coins', 18) });
    renderAR(); renderKpis(true);
  } else store.markPaid(x.id); // 會觸發 order-updated → 重新整理
}

// ---------- 現金流預測 ----------
function renderForecast() {
  const f = cashForecast(store);
  const x = f.pts.map(p => fmtMD(p.date));
  const ev = f.events;
  const majors = ev.filter(e => e.major);
  const minLbl = `${f.min.date.getMonth() + 1} 月${f.min.date.getDate() <= 10 ? '上旬' : f.min.date.getDate() <= 20 ? '中' : '下旬'}`;
  const minEvs = ev.filter(e => e.amt >= 30000 && e.date <= f.min.date && e.date > new Date(f.min.date - 8 * 864e5)).map(e => e.name);
  const safe = f.min.v >= f.safe;
  $('#bnkFcNote', root).innerHTML = `<span class="bnk-ai-ic">${icon('sparkle', 15)}</span><p><b>AI 提醒：</b>${minLbl}（${fmtMD(f.min.date)}${minEvs.length ? '，' + esc(minEvs.join('、')) + '後' : ''}）現金最低點仍有 <b class="hl">NT$ ${(f.min.v / 10000).toFixed(1)} 萬</b>，高於安全水位 ${wan(f.safe)}（約 2 個月薪資＋租金），<b class="${safe ? 'ok' : 'bad'}">${safe ? '安全' : '需注意'}</b>。年節備料可如期下單，閒置資金約 ${wan(Math.max(0, f.min.v - f.safe))} 可考慮轉存定存。</p>`;
  const lo = f.pts.map(p => p.lo), band = f.pts.map(p => p.hi - p.lo);
  const idx = (d) => f.pts.findIndex(p => +startOfDay(p.date) === +d);
  charts.fc.setOption({
    animationDuration: 1500,
    grid: { left: 6, right: 14, top: 30, bottom: 4, containLabel: true },
    legend: { top: 0, right: 0, itemWidth: 14, itemHeight: 8, data: ['預測現金餘額', '信賴區間'], textStyle: { fontSize: 11 } },
    tooltip: { trigger: 'axis', formatter: (ps) => {
      const k = ps[0].dataIndex, p = f.pts[k];
      return `<b>${fmtMD(p.date)}</b><br>預測餘額 <b>${money(p.v)}</b><br><span style="opacity:.7">區間 ${wan(p.lo)} – ${wan(p.hi)}</span>${p.evs.map(e => `<br><span style="color:#ffcf8a">● ${esc(e.name)} −${n0(e.amt)}</span>`).join('')}`;
    } },
    xAxis: { type: 'category', data: x, boundaryGap: false, axisLabel: { interval: 9, fontSize: 10 } },
    yAxis: { type: 'value', min: v => Math.floor(Math.min(v.min, f.safe) / 100000) * 100000 - 100000, axisLabel: { formatter: v => v / 10000 + '萬', fontSize: 10 } },
    series: [
      { name: '下界', type: 'line', data: lo, stack: 'ci', symbol: 'none', lineStyle: { opacity: 0 }, tooltip: { show: false } },
      { name: '信賴區間', type: 'line', data: band, stack: 'ci', symbol: 'none', lineStyle: { opacity: 0 }, areaStyle: { color: 'rgba(94,224,196,0.14)' }, itemStyle: { color: 'rgba(94,224,196,0.4)' } },
      { name: '預測現金餘額', type: 'line', data: f.pts.map(p => p.v), smooth: 0.25, symbol: 'circle', showSymbol: false, symbolSize: 6,
        lineStyle: { width: 3, color: '#5EE0C4', shadowColor: '#5EE0C4', shadowBlur: 12 }, itemStyle: { color: '#5EE0C4' },
        markLine: { symbol: 'none', silent: true, data: [
          { yAxis: f.safe, lineStyle: { color: '#EC6A55', type: 'dashed', width: 1.2 }, label: { formatter: `安全水位 ${wan(f.safe)}`, position: 'insideStartTop', color: '#ff9f8f', fontSize: 10 } },
          ...ev.map(e => ({ xAxis: idx(e.date), lineStyle: { color: e.major ? 'rgba(240,165,49,.45)' : 'rgba(255,255,255,.12)', type: 'dotted', width: 1 }, label: { show: false } })),
        ] },
        markPoint: { data: [
          { coord: [idx(f.min.date), f.min.v], value: wan(f.min.v), symbol: 'pin', symbolSize: 46, itemStyle: { color: '#F0A531' }, label: { color: '#04130d', fontSize: 9, fontWeight: 700, formatter: '最低' } },
        ] },
      },
      { name: '重大支出', type: 'scatter', data: majors.map(e => [idx(e.date), f.pts[idx(e.date)].v]), symbolSize: 9, itemStyle: { color: '#F0A531', borderColor: '#04130d', borderWidth: 2 }, tooltip: { show: false }, z: 5 },
    ],
  }, true);
  // 事件清單（合併同日）
  const byDay = new Map();
  ev.forEach(e => { const k = +e.date; if (!byDay.has(k)) byDay.set(k, []); byDay.get(k).push(e); });
  $('#bnkEvs', root).innerHTML = [...byDay.entries()].map(([k, es]) => `<span class="bnk-ev ${es.some(e => e.major) ? 'major' : ''}"><em>${fmtMD(k)}</em>${es.map(e => esc(e.name)).join('＋')}<b>−${wan(es.reduce((s, e) => s + e.amt, 0))}</b></span>`).join('');
}

// ---------- 電子發票 ----------
function renderInvoice() {
  const s = einvoiceStats(store);
  const now = new Date();
  const last = new Date(+now - 7 * 60e3);
  const box = $('#bnkInv', root);
  box.innerHTML = `
    <div class="card-h"><h3>${icon('receipt', 17)} 電子發票管理</h3><span class="chip-sm">${s.label}（本期）</span></div>
    <div class="bnk-inv-grid">
      <div><small>本期開立</small><b data-n="${s.count}">0</b><span>張</span></div>
      <div><small>作廢／折讓</small><b>${s.voided}<i>／</i>${s.allowance}</b><span>張・皆已上傳</span></div>
      <div><small>手機條碼載具</small><b data-n="${s.carrier}">0</b><span>張・${s.count ? Math.round(s.carrier / s.count * 100) : 0}%</span></div>
      <div><small>捐贈發票</small><b data-n="${s.donated}">0</b><span>張</span></div>
    </div>
    <div class="bnk-win">
      <div class="bnk-win-ic">${icon('sparkle', 20)}</div>
      <div><b>中獎通知：${s.prevLabel}期 1 張中六獎 NT$ 200</b>
        <small>發票 ${s.win ? s.win.invoice : 'AB-30410288'}・會員 ${esc(s.win ? s.win.customer : '林小姐')}（載具）・AI 已自動以 ${s.win && s.win.channel === 'whatsapp' ? 'WhatsApp' : 'LINE'} 通知，獎金將自動匯入其帳戶（模擬）</small></div>
    </div>
    <div class="bnk-sync">
      <svg viewBox="0 0 44 44" class="bnk-ring"><circle cx="22" cy="22" r="18"/><circle cx="22" cy="22" r="18" class="fg" id="bnkRing"/></svg>
      <div><b>財政部電子發票整合服務平台</b><small id="bnkSyncTxt">已上傳 ${n0(s.uploaded)}／${n0(s.count)} 張・最後同步 ${fmtTime(last)}・48 小時內上傳率 100%</small></div>
      <button class="btn btn-ghost btn-sm" id="bnkSync">${icon('refresh', 14)} 立即同步</button>
    </div>
    <small class="bnk-inv-foot">${icon('shield', 12)} 示範：未實際連線財政部平台</small>`;
  $$('[data-n]', box).forEach(b => countUp(b, +b.dataset.n, { duration: 1.4 }));
  const ring = $('#bnkRing', box); const C = 2 * Math.PI * 18;
  ring.style.strokeDasharray = C; ring.style.strokeDashoffset = 0;
  $('#bnkSync', box).addEventListener('click', async (e) => {
    const b = e.currentTarget; b.disabled = true;
    gsap.fromTo(ring, { strokeDashoffset: C }, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut' });
    b.innerHTML = '<span class="bnk-spin sm"></span> 同步中';
    await sleep(1500);
    const n = store.ordersBetween(new Date(now.getFullYear(), now.getMonth() - (now.getMonth() % 2), 1), new Date(Date.now() + 1)).length;
    $('#bnkSyncTxt', box).textContent = `已上傳 ${n0(n)}／${n0(n)} 張・最後同步 ${fmtTime(new Date())}・48 小時內上傳率 100%`;
    b.disabled = false; b.innerHTML = `${icon('refresh', 14)} 立即同步`;
    toast('電子發票同步完成', `本期 ${n} 張發票與作廢、折讓資料皆已上傳（模擬）`, { icon: icon('receipt', 18) });
  });
}
