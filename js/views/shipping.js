// 出貨物流：KPI、出貨看板（拖拉／推進）、批次託運單、物流追蹤＋多語通知、出貨路線地球、物流商比較、異常處理
import * as THREE from 'three';
import { store } from '../state.js';
import { $, $$, el, gsap, esc, money, fmtTime, fmtMD, countUp, toast, typeText } from '../util.js';
import { icon, chIcon } from '../icons.js';
import { makeChart } from '../charts.js';
import { PRODUCT_MAP, startOfDay, addDays, mulberry32 } from '../data.js';
import { productArt } from '../art.js';
import {
  STAGES, CARRIERS, CARRIER_ORDER, CITIES, ORIGIN, COASTS,
  buildShipment, setStage, maskName, maskPhone, destLabel, shipMessage, carrierStats, trackingNo,
} from '../shipping-data.js';

const H = 3600e3;
const CH = { line: 'LINE', web: '官網', pos: '門市', phone: '電話', whatsapp: 'WhatsApp', zalo: 'Zalo', messenger: 'Messenger' };
const NOTIFY_VIA = { line: 'LINE', web: '官網會員 Email＋簡訊', phone: '簡訊', whatsapp: 'WhatsApp', zalo: 'Zalo', messenger: 'Messenger' };
const LANG_SHORT = { zh: '中', ja: '日', en: 'EN', vi: 'VI', ms: 'MS' };
const LANG_NAME = { zh: '中文', ja: '日文', en: '英文', vi: '越南文', ms: '馬來文' };
const NEXT_LABEL = ['開始包裝', '交寄', '配送中', '已送達'];
const CUTOFFS = [
  { c: 'tcat', name: '黑貓冷藏', h: 16, m: 30 },
  { c: 'ems', name: 'EMS 郵局', h: 17, m: 0 },
  { c: 'seven', name: '7-11 交貨便', h: 18, m: 0 },
  { c: 'fami', name: '全家店到店', h: 18, m: 0 },
];
const PIN = '<svg class="ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';
const PRINT = '<svg class="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/></svg>';

let root, ships = new Map(), month = [], selected = new Set(), filter = 'all', sessionFee = 0, sessionCount = 0;
let exceptions = [], notifs = [], globe = null, globeTried = false, chart = null, clock = 0, visible = false, pendingFly = [];
let drawerId = null, sameDayOn = false, modal = null, drawer = null;

const hm = (t) => fmtTime(t);
const md = (t) => fmtMD(t);
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

// ---------------------------------------------------------------- 資料
function build() {
  const now = Date.now();
  const today = startOfDay(new Date());
  const from3 = +addDays(today, -2), from30 = +addDays(today, -29);
  ships = new Map(); month = [];
  for (const o of store.orders) {
    if (o.channel === 'pos' || o.ts < from30) continue;
    const sh = buildShipment(o, now);
    month.push(sh);
    if (o.ts >= from3) ships.set(o.id, sh);
  }
  // 示範：深夜開啟時也讓「包裝中」有卡片（最早的兩張待揀貨先進包裝）
  const pick = [...ships.values()].filter(s => s.stage === 0).sort((a, b) => a.times.order - b.times.order);
  if (pick.length >= 4 && ![...ships.values()].some(s => s.stage === 1)) pick.slice(0, 2).forEach(s => setStage(s, 1, now));
  const packing = [...ships.values()].filter(s => s.stage === 1 && s.carrier !== 'pickup').sort((a, b) => a.times.order - b.times.order);
  if (packing.length >= 3 && ![...ships.values()].some(s => s.stage === 2)) packing.slice(0, 2).forEach((s, i) => setStage(s, 2, now - (i + 1) * 9 * 6e4));
  selected = new Set([...selected].filter(id => ships.has(id)));
  buildExceptions();
  notifs = [...ships.values()].filter(s => s.stage >= 2 && s.carrier !== 'pickup').sort((a, b) => b.times.ship - a.times.ship).slice(0, 7).map(s => ({ id: s.id, ts: s.times.ship }));
}

function buildExceptions() {
  const all = [...ships.values()];
  const used = new Set();
  const take = (fn, fb) => { let s = all.find(x => !used.has(x.id) && fn(x)); if (!s && fb) s = all.find(x => !used.has(x.id) && fb(x)); if (s) used.add(s.id); return s; };
  const list = [];
  const a = take(s => s.carrier === 'tcat' && s.stage === 2, s => s.carrier === 'tcat');
  if (a) list.push({ id: a.id, kind: 'addr', label: '地址不完整', color: 'var(--amber)', desc: `收件地址「${a.city.name}${a.district}…」缺少門牌號碼，${CARRIERS[a.carrier].short}暫停派送`, ai: `AI 已透過 ${NOTIFY_VIA[a.channel] || 'LINE'} 以${LANG_NAME[a.lang]}詢問補齊地址，客人 3 分鐘內回覆，託運資料已自動更新`, status: 'done', statusText: '已解決', prog: 4 });
  const b = take(s => s.carrier === 'tcat' && s.stage === 3, s => s.fridge && s.stage >= 2 && !s.intl);
  if (b) list.push({ id: b.id, kind: 'absent', label: '客人不在', color: 'var(--coral)', desc: `司機 ${hm(b.times.out + 3 * H)} 配送未遇收件人，包裹已回轉運中心冷藏保存`, ai: `AI 已傳訊並來電確認，客人改約明天 18–21 時二次配送，已同步通知物流商`, status: 'ai', statusText: 'AI 已改約', prog: 3 });
  const c = take(s => s.carrier === 'ems' && s.stage >= 2 && s.stage <= 3, s => s.carrier === 'ems');
  if (c) list.push({ id: c.id, kind: 'delay', label: '延遲', color: 'var(--sky)', desc: `${c.city.label} 海關抽驗，預計延遲 1 天送達`, ai: `AI 已以${LANG_NAME[c.lang]}通知客人延遲原因並附上追蹤連結，客人回覆「了解，謝謝」`, status: 'wait', statusText: '等待清關', prog: 3 });
  const d = take(s => (s.carrier === 'seven' || s.carrier === 'fami') && s.stage >= 2 && s.stage <= 3, s => s.carrier === 'seven' || s.carrier === 'fami');
  if (d) list.push({ id: d.id, kind: 'store', label: '門市異動', color: 'var(--violet)', desc: `取貨門市「${d.store}」臨時店休，包裹需改寄鄰近門市`, ai: `AI 已傳送改店連結給客人，尚未回覆（已等候 2 小時）`, status: 'wait', statusText: '等待客人回覆', prog: 2, act: 'remind' });
  const e = take(s => s.fridge && s.stage === 4, s => s.fridge);
  if (e) list.push({ id: e.id, kind: 'cold', label: '冷鏈溫度', color: 'var(--pink)', desc: `溫度記錄器顯示運送途中 8.4°C 超標 12 分鐘（標準 0–7°C）`, ai: `AI 已先向客人致歉並確認商品狀況，建議補寄一份或折讓 NT$100，等你決定`, status: 'need', statusText: '需要你決定', prog: 2, act: 'decide' });
  exceptions = list;
}
const excOf = (id) => exceptions.find(x => x.id === id);

function kpis() {
  const all = [...ships.values()];
  const cnt = (s) => all.filter(x => x.stage === s).length;
  const shipped = all.filter(x => x.stage >= 2 && x.carrier !== 'pickup');
  const avg = shipped.length ? shipped.reduce((s, x) => s + (x.times.ship - x.times.order), 0) / shipped.length / H : 0;
  const today = +startOfDay(new Date());
  const now = new Date(); const ms = +new Date(now.getFullYear(), now.getMonth(), 1);
  const ledger = store.purchases.filter(p => p.item === '冷藏宅配運費' && p.ts >= ms).reduce((s, p) => s + p.total, 0);
  const waybills = month.filter(s => s.order.ts >= ms && s.stage >= 2).reduce((s, x) => s + x.fee, 0);
  const todo = all.filter(x => x.stage <= 1);
  return {
    todo: todo.length, todoCold: todo.filter(x => x.fridge).length,
    shipped: cnt(2), shippedToday: all.filter(x => x.stage >= 2 && x.times.ship >= today).length,
    moving: cnt(3), movingIntl: all.filter(x => x.stage === 3 && x.intl).length,
    done: cnt(4), avg, ledger, waybills, fee: ledger + waybills + sessionFee,
  };
}

// ---------------------------------------------------------------- 版面
export default {
  mount(section) {
    root = section;
    build();
    section.innerHTML = `
    <div class="shp">
      <div class="shp-head glass anim-in">
        <div class="shp-head-txt">
          <span class="shp-kicker">${icon('bot', 14)} AI 物流代理 <span class="demo-badge">示範資料</span></span>
          <h2>今天有 <b class="grad-txt" id="shpTodo">0</b> 件待出貨，AI 已排好揀貨順序</h2>
          <p>依溫層、目的地與物流截收時間自動分批：冷藏品優先交寄黑貓冷藏，常溫禮盒走超商取貨，日本與東南亞訂單自動走 EMS 並附上英文報關資料。出貨後 AI 會用客人的語言自動傳送追蹤通知。</p>
        </div>
        <div class="shp-cutoffs" id="shpCut"></div>
      </div>

      <div class="shp-kpis" id="shpKpis"></div>

      <div class="glass card shp-board-card anim-in">
        <div class="card-h shp-board-h">
          <h3>${icon('box', 18)} 出貨看板 <span class="chip-sm">近 3 天・官網／LINE／電話等線上訂單</span></h3>
          <div class="shp-tools">
            <div class="shp-filter">${[['all', '全部'], ['cold', '冷藏'], ['room', '常溫'], ['intl', '跨境']].map(([k, n]) => `<button class="seg ${k === filter ? 'on' : ''}" data-f="${k}">${n}</button>`).join('')}</div>
            <button class="btn btn-ghost btn-sm" id="shpSelAll">${icon('check', 15)} 全選待出貨</button>
            <button class="btn btn-primary btn-sm" id="shpBatch" disabled>${PRINT} 批次產生託運單 <em id="shpSelN">0</em></button>
          </div>
        </div>
        <div class="shp-board" id="shpBoard">
          ${STAGES.map((s, i) => `<div class="shp-col" data-stage="${i}" style="--sc:${s.color}">
            <div class="shp-col-h"><i></i><b>${s.name}</b><span class="shp-col-n">0</span></div>
            <div class="shp-col-body"></div></div>`).join('')}
        </div>
        <p class="shp-hint">${icon('sparkle', 13)} 拖拉卡片或按「→」推進階段；點卡片看物流追蹤與 AI 通知。新的線上訂單會自動飛入「待揀貨」。</p>
      </div>

      <div class="shp-grid">
        <div class="glass card shp-globe-card anim-in">
          <div class="card-h"><h3>${icon('globe', 18)} 出貨路線</h3><span class="chip-sm">近 30 天・台北出貨</span></div>
          <div class="shp-globe-wrap">
            <div class="shp-globe" id="shpGlobe"></div>
            <div class="shp-routes" id="shpRoutes"></div>
          </div>
        </div>
        <div class="glass card shp-carrier-card anim-in">
          <div class="card-h"><h3>${icon('truck', 18)} 物流商比較</h3><span class="chip-sm">近 30 天</span></div>
          <div class="chart shp-carrier-chart" id="shpCarrier"></div>
          <div class="tbl-wrap"><table class="tbl shp-ctbl" id="shpCtbl"></table></div>
          <div class="shp-ai" id="shpAi"></div>
        </div>
        <div class="glass card shp-exc-card anim-in">
          <div class="card-h"><h3>${icon('alert', 18)} 配送異常</h3><span class="chip-sm" id="shpExcChip"></span></div>
          <ul class="shp-exc" id="shpExc"></ul>
        </div>
        <div class="glass card shp-notif-card anim-in">
          <div class="card-h"><h3>${icon('chat', 18)} AI 出貨通知</h3><span class="chip-sm">自動用客人的語言</span></div>
          <ul class="shp-notif" id="shpNotif"></ul>
        </div>
      </div>

      <div class="shp-modal" id="shpModal" hidden>
        <div class="shp-modal-bg" data-close></div>
        <div class="shp-modal-box">
          <div class="shp-modal-h">
            <div><h3>${PRINT} 託運單預覽 <span id="shpWbN"></span></h3><small>AI 已依目的地與溫層自動選擇物流商・收件人資料已遮罩</small></div>
            <span class="demo-badge">示範樣張・非正式託運單</span>
            <button class="icon-btn shp-x" data-close aria-label="關閉">${icon('x', 18)}</button>
          </div>
          <div class="shp-printer"><i></i><span>GreenUP 熱感印表機・就緒</span></div>
          <div class="shp-wb-list" id="shpWbList"></div>
          <div class="shp-modal-f">
            <div id="shpWbSum"></div>
            <div class="shp-modal-btns"><button class="btn btn-ghost" data-close>取消</button><button class="btn btn-primary" id="shpPrint">${PRINT} 列印並自動入帳</button></div>
          </div>
        </div>
      </div>

      <div class="shp-drawer" id="shpDrawer" hidden>
        <div class="shp-drawer-bg" data-dclose></div>
        <aside class="shp-drawer-panel" id="shpDrawerPanel"></aside>
      </div>
    </div>`;

    const k = [
      { k: 'todo', label: '今日待出貨', ic: 'box', c: 'var(--amber)', suf: ' 件' },
      { k: 'shipped', label: '已出貨', ic: 'truck', c: 'var(--sky)', suf: ' 件' },
      { k: 'moving', label: '配送中', ic: 'globe', c: 'var(--mint)', suf: ' 件' },
      { k: 'done', label: '已送達', ic: 'check', c: 'var(--leaf)', suf: ' 件' },
      { k: 'avg', label: '平均出貨時間', ic: 'clock', c: 'var(--violet)', suf: ' 小時', dec: 1 },
      { k: 'fee', label: '本月運費', ic: 'coins', c: 'var(--pink)', pre: 'NT$ ' },
    ];
    $('#shpKpis', root).innerHTML = k.map(d => `<div class="kpi glass anim-in" data-k="${d.k}" data-pre="${d.pre || ''}" data-suf="${d.suf || ''}" data-dec="${d.dec || 0}" style="--c:${d.c}">
      <div class="kpi-top"><span class="kpi-ic">${icon(d.ic, 18)}</span><span class="kpi-label">${d.label}</span></div>
      <div class="kpi-val" data-val>0</div><div class="kpi-sub" data-sub></div></div>`).join('');

    // 看板事件
    $$('.shp-filter .seg', root).forEach(b => b.addEventListener('click', () => { filter = b.dataset.f; $$('.shp-filter .seg', root).forEach(x => x.classList.toggle('on', x === b)); renderBoard(); }));
    $('#shpSelAll', root).addEventListener('click', () => {
      const ids = [...ships.values()].filter(s => s.stage <= 1 && passFilter(s) && s.carrier !== 'pickup').map(s => s.id);
      const allOn = ids.every(id => selected.has(id));
      ids.forEach(id => allOn ? selected.delete(id) : selected.add(id));
      renderBoard();
      $$('.shp-card.sel', root).forEach((c, i) => gsap.fromTo(c, { scale: 0.96 }, { scale: 1, duration: 0.4, delay: i * 0.02, ease: 'back.out(3)' }));
    });
    $('#shpBatch', root).addEventListener('click', openWaybills);
    const board = $('#shpBoard', root);
    board.addEventListener('click', onBoardClick);
    board.addEventListener('dragstart', (e) => { const c = e.target.closest('.shp-card'); if (!c) return; e.dataTransfer.setData('text/plain', c.dataset.id); e.dataTransfer.effectAllowed = 'move'; requestAnimationFrame(() => c.classList.add('dragging')); });
    board.addEventListener('dragend', (e) => { const c = e.target.closest('.shp-card'); c && c.classList.remove('dragging'); $$('.shp-col.over', root).forEach(x => x.classList.remove('over')); });
    $$('.shp-col', root).forEach(col => {
      col.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; col.classList.add('over'); });
      col.addEventListener('dragleave', (e) => { if (!col.contains(e.relatedTarget)) col.classList.remove('over'); });
      col.addEventListener('drop', (e) => { e.preventDefault(); col.classList.remove('over'); const id = e.dataTransfer.getData('text/plain'); if (id && ships.has(id)) move(id, +col.dataset.stage); });
    });
    // 視窗（移到 body，覆蓋側欄）
    modal = $('#shpModal', root); drawer = $('#shpDrawer', root);
    document.body.append(modal, drawer);
    $$('[data-close]', modal).forEach(b => b.addEventListener('click', closeWaybills));
    $('#shpPrint', modal).addEventListener('click', printWaybills);
    $$('[data-dclose]', drawer).forEach(b => b.addEventListener('click', closeDrawer));
    document.addEventListener('keydown', (e) => { if (e.key !== 'Escape' || !visible) return; if (!modal.hidden) closeWaybills(); else if (!drawer.hidden) closeDrawer(); });
    $('#shpExc', root).addEventListener('click', onExcClick);
    $('#shpNotif', root).addEventListener('click', (e) => { const li = e.target.closest('[data-id]'); if (li) openDrawer(li.dataset.id); });

    renderAll();

    store.on('order', ({ order }) => onNewOrder(order));
    store.on('order-updated', ({ order }) => { const s = ships.get(order.id); if (s) { s.pending = order.status === 'pending'; renderBoard(); } });
    store.on('reset', () => { build(); renderAll(); if (globe) globe.setRoutes(routeStats()); });
  },
  show() {
    visible = true;
    if (!chart) chart = makeChart($('#shpCarrier', root));
    renderCarrier();
    if (!globeTried) { globeTried = true; globe = createGlobe($('#shpGlobe', root)); if (globe) globe.setRoutes(routeStats()); else fallbackMap($('#shpGlobe', root)); }
    globe && globe.start();
    renderKpis(true);
    renderCutoffs(); clearInterval(clock); clock = setInterval(renderCutoffs, 30000);
    if (pendingFly.length) { const ids = pendingFly; pendingFly = []; setTimeout(() => ids.forEach((id, i) => setTimeout(() => flyIn(id), i * 180)), 500); }
  },
  hide() {
    visible = false;
    globe && globe.stop();
    clearInterval(clock);
    if (modal) modal.hidden = true;
    if (drawer) { drawer.hidden = true; drawerId = null; }
  },
};

function renderAll() {
  renderBoard(); renderKpis(false); renderRoutes(); renderExc(); renderNotif(); renderCutoffs();
  if (chart) renderCarrier();
}

// ---------------------------------------------------------------- KPI 與截收倒數
function renderKpis(animate) {
  if (!root) return;
  const k = kpis();
  countUp($('#shpTodo', root), k.todo, { duration: animate ? 1.2 : 0.6 });
  const sub = {
    todo: `冷藏 ${k.todoCold} 件・常溫 ${k.todo - k.todoCold} 件`,
    shipped: `今日已交寄 ${k.shippedToday} 件`,
    moving: `跨境 ${k.movingIntl} 件・即時追蹤中`,
    done: `近 3 天・準時率 97.8%`,
    avg: `從下單到交寄・目標 8 小時內`,
    fee: k.ledger ? `冷鏈月結 ${money(k.ledger)}＋託運 ${money(k.waybills + sessionFee)}` : sessionFee ? `託運單累計・本次 +${money(sessionFee)}` : '依本月託運單自動累計',
  };
  $$('.kpi', $('#shpKpis', root)).forEach(card => {
    const key = card.dataset.k; const v = key === 'avg' ? k.avg : k[key];
    const valEl = $('[data-val]', card);
    const before = parseFloat(valEl.dataset.value || 0);
    countUp(valEl, v, { prefix: card.dataset.pre, suffix: card.dataset.suf, decimals: +card.dataset.dec, duration: animate ? 1.5 : 0.8 });
    $('[data-sub]', card).textContent = sub[key];
    if (!animate && Math.abs(before - v) > 0.01 && before) { card.classList.remove('flash'); void card.offsetWidth; card.classList.add('flash'); }
  });
}

function renderCutoffs() {
  if (!root) return;
  const now = new Date();
  const counts = {}; for (const s of ships.values()) if (s.stage <= 1) counts[s.carrier] = (counts[s.carrier] || 0) + 1;
  $('#shpCut', root).innerHTML = `<div class="shp-cut-h">${icon('clock', 14)} 今日物流截收</div>` + CUTOFFS.map(c => {
    const t = new Date(now); t.setHours(c.h, c.m, 0, 0);
    const left = t - now;
    const txt = left <= 0 ? '今日已截收・明早優先' : left < H ? `剩 ${Math.ceil(left / 6e4)} 分` : `剩 ${Math.floor(left / H)} 小時 ${Math.floor(left % H / 6e4)} 分`;
    const pct = left <= 0 ? 100 : Math.max(4, 100 - left / (10 * H) * 100);
    return `<div class="shp-cut ${left <= 0 ? 'closed' : left < 2 * H ? 'soon' : ''}" style="--cc:${CARRIERS[c.c].color}"><div class="shp-cut-t"><b>${c.name}</b><span>${String(c.h).padStart(2, '0')}:${String(c.m).padStart(2, '0')}</span></div>
      <div class="shp-cut-bar"><i style="width:${pct}%"></i></div><small>${txt}・待出 ${counts[c.c] || 0} 件</small></div>`;
  }).join('');
}

// ---------------------------------------------------------------- 看板
function passFilter(s) { return filter === 'all' || (filter === 'cold' && s.fridge) || (filter === 'room' && !s.fridge) || (filter === 'intl' && s.intl); }

function cardHTML(s) {
  const c = CARRIERS[s.carrier];
  const exc = excOf(s.id);
  const items = s.order.items;
  const art = items.slice(0, 3).map(it => `<span class="sc-art">${productArt(it.pid, 26, { bg: false })}</span>`).join('');
  const txt = items.map(it => `${PRODUCT_MAP[it.pid].name}×${it.qty}`).join('、');
  const canSel = s.stage <= 1 && s.carrier !== 'pickup';
  return `<div class="shp-card ${s.fridge ? 'cold' : 'room'} ${selected.has(s.id) ? 'sel' : ''} ${exc && exc.status !== 'done' ? 'exc' : ''}" draggable="true" data-id="${s.id}" style="--cc:${c.color}">
    <div class="sc-top">${canSel ? `<label class="sc-chk" title="選取以產生託運單"><input type="checkbox" ${selected.has(s.id) ? 'checked' : ''}><i></i></label>` : ''}
      <b class="sc-name">${esc(s.customer)}</b><span class="sc-lang" title="${LANG_NAME[s.lang] || ''}">${LANG_SHORT[s.lang] || s.lang}</span>${chIcon(s.channel, 18)}
      ${exc && exc.status !== 'done' ? `<span class="sc-exc" title="${esc(exc.label)}">!</span>` : ''}</div>
    <div class="sc-items">${art}<span>${esc(txt)}</span></div>
    <div class="sc-tags"><span class="sc-temp ${s.fridge ? 'cold' : 'room'}">${s.fridge ? icon('snow', 11) + ' 冷藏' : icon('box', 11) + ' 常溫'}</span><span class="sc-car">${c.short}</span>${s.pending && s.stage <= 1 ? '<span class="sc-pend">待付款</span>' : ''}</div>
    <div class="sc-dest">${PIN}<span>${esc(destLabel(s))}${s.store ? `・${esc(s.store)}` : ''}</span></div>
    <div class="sc-foot"><span class="mono">${s.tracking ? (s.printed ? icon('file', 11) + ' ' : '') + s.tracking : s.id.slice(3)}</span>
      ${s.stage < 4 ? `<button class="sc-next" title="推進到「${STAGES[s.stage + 1].name}」">${NEXT_LABEL[s.stage]} →</button>` : `<span class="sc-ok">${icon('check', 12)} ${md(s.times.done)} ${hm(s.times.done)}</span>`}</div>
  </div>`;
}

function sortedIn(stage) {
  const list = [...ships.values()].filter(s => s.stage === stage);
  const key = stage === 4 ? (s) => s.times.done : stage >= 2 ? (s) => s.times.ship : (s) => s.times.order;
  return list.sort((a, b) => key(b) - key(a));
}

function renderBoard() {
  if (!root) return;
  $$('.shp-col', root).forEach(col => {
    const st = +col.dataset.stage;
    const list = sortedIn(st);
    const vis = list.filter(passFilter);
    $('.shp-col-n', col).textContent = vis.length;
    $('.shp-col-body', col).innerHTML = vis.length ? vis.map(cardHTML).join('') : `<div class="shp-empty">${st === 0 ? '目前沒有待揀貨訂單' : '—'}</div>`;
  });
  const n = selected.size;
  $('#shpSelN', root).textContent = n;
  $('#shpBatch', root).disabled = !n;
}

function onBoardClick(e) {
  const card = e.target.closest('.shp-card'); if (!card) return;
  const id = card.dataset.id;
  if (e.target.closest('.sc-chk')) {
    e.preventDefault();
    selected.has(id) ? selected.delete(id) : selected.add(id);
    card.classList.toggle('sel', selected.has(id));
    $('input', card).checked = selected.has(id);
    $('#shpSelN', root).textContent = selected.size; $('#shpBatch', root).disabled = !selected.size;
    gsap.fromTo(card, { scale: 0.97 }, { scale: 1, duration: 0.35, ease: 'back.out(3)' });
    gsap.fromTo('#shpBatch', { scale: 1.08 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' });
    return;
  }
  if (e.target.closest('.sc-next')) { const s = ships.get(id); if (s && s.stage < 4) move(id, s.stage + 1); return; }
  openDrawer(id);
}

// FLIP 動畫推進
function move(id, stage, { quiet = false } = {}) {
  const s = ships.get(id); if (!s || s.stage === stage) return;
  const prevStage = s.stage;
  const oldEl = $(`.shp-card[data-id="${id}"]`, root);
  const r0 = oldEl ? oldEl.getBoundingClientRect() : null;
  setStage(s, stage);
  if (stage >= 2) selected.delete(id);
  if (stage <= 1 && s.printed && stage < prevStage) { /* 退回仍保留託運單 */ }
  renderBoard();
  const nEl = $(`.shp-card[data-id="${id}"]`, root);
  if (nEl) {
    const body = nEl.parentElement;
    if (nEl.offsetTop < body.scrollTop || nEl.offsetTop + nEl.offsetHeight > body.scrollTop + body.clientHeight) body.scrollTop = Math.max(0, nEl.offsetTop - 8);
    const r1 = nEl.getBoundingClientRect();
    if (r0) gsap.fromTo(nEl, { x: r0.left - r1.left, y: r0.top - r1.top, rotation: stage > prevStage ? -3 : 3, scale: 1.04 }, { x: 0, y: 0, rotation: 0, scale: 1, duration: 0.7, ease: 'power3.inOut', clearProps: 'transform' });
    nEl.classList.add('hl'); setTimeout(() => nEl.classList.remove('hl'), 1600);
  }
  const col = $(`.shp-col[data-stage="${stage}"] .shp-col-h`, root);
  col && gsap.fromTo(col, { scale: 1.06 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
  renderKpis(false);
  if (stage >= 2 && prevStage < 2 && s.carrier !== 'pickup') {
    notifs.unshift({ id: s.id, ts: Date.now(), fresh: true }); notifs = notifs.slice(0, 7); renderNotif(true);
    if (!quiet) toast(`AI 已用${LANG_NAME[s.lang] || '中文'}通知 ${s.customer}`, `${CARRIERS[s.carrier].short}・貨號 ${s.tracking}・透過 ${NOTIFY_VIA[s.channel] || 'LINE'} 自動傳送`, { icon: icon('chat', 18) });
    globe && globe.ping(s.cityId);
  } else if (stage === 4 && !quiet) toast(`已送達｜${s.customer}`, `${destLabel(s)}・AI 將於明天自動邀請評價`, { kind: 'info', icon: icon('check', 18) });
  if (drawerId === id) renderDrawer(false);
}

function onNewOrder(order) {
  if (order.channel === 'pos' || ships.has(order.id)) return;
  const s = buildShipment(order, Date.now());
  setStage(s, 0);
  ships.set(order.id, s); month.push(s);
  renderBoard(); renderKpis(false); renderCutoffs(); renderRoutes();
  globe && globe.setRoutes(routeStats());
  if (visible) flyIn(order.id); else pendingFly.push(order.id);
}

function flyIn(id) {
  const c = $(`.shp-card[data-id="${id}"]`, root); if (!c) return;
  const body = c.parentElement; body.scrollTop = 0;
  c.classList.add('new');
  gsap.fromTo(c, { x: 260, y: -140, rotation: 12, scale: 0.4, opacity: 0 }, { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1, duration: 1, ease: 'back.out(1.3)', clearProps: 'transform' });
  const badge = el(`<span class="sc-newtag">${icon('sparkle', 11)} 新訂單・AI 已排入揀貨</span>`);
  c.prepend(badge);
  setTimeout(() => { gsap.to(badge, { opacity: 0, height: 0, marginBottom: 0, duration: 0.4, onComplete: () => badge.remove() }); c.classList.remove('new'); }, 5200);
  const head = $('.shp-col[data-stage="0"] .shp-col-h', root); head && gsap.fromTo(head, { scale: 1.12 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
}

// ---------------------------------------------------------------- 託運單
function barcode(code, h = 46) {
  const rng = mulberry32(hashStr(code));
  const W = 260; let x = 8, black = true, bars = '';
  bars += `<rect x="4" y="0" width="2" height="${h}"/>`;
  while (x < W - 10) { const w = 1 + Math.floor(rng() * 3) + (rng() < 0.12 ? 1 : 0); if (black) bars += `<rect x="${x}" y="0" width="${w * 0.9}" height="${h}"/>`; x += w; black = !black; }
  bars += `<rect x="${W - 6}" y="0" width="2" height="${h}"/>`;
  return `<svg class="wb-bc" viewBox="0 0 ${W} ${h}" preserveAspectRatio="none" aria-hidden="true">${bars}</svg>`;
}
function maskAddr(s) {
  if (s.intl) {
    if (s.city.country === 'JP') return `${s.city.name === '東京' ? '東京都' : s.city.name === '大阪' ? '大阪府' : '福岡県'}${s.district}＊＊＊ ＊-＊＊-＊`;
    return `${s.district}, ＊＊＊＊ ${s.city.country === 'SG' ? 'Singapore' : s.city.country === 'MY' ? 'Kuala Lumpur' : s.city.name}`;
  }
  return `${s.city.name}${s.district}＊＊路＊段＊＊號`;
}
const COUNTRY_EN = { JP: 'JAPAN', MY: 'MALAYSIA', SG: 'SINGAPORE', VN: 'VIET NAM', TW: 'TAIWAN' };
const CONTENT_EN = { lemon: 'Lemon tart', roll: 'Cream roll cake', basque: 'Cheesecake', pound: 'Pound cake', cookie: 'Cookies', pineapple: 'Pineapple cake', canele: 'Canelé' };

function waybillHTML(s) {
  const c = CARRIERS[s.carrier];
  const trk = s.tracking;
  const temp = s.fridge ? `<div class="wb-temp cold">${icon('snow', 16)}<b>冷藏</b><small>0–7°C</small></div>` : `<div class="wb-temp room"><b>常溫</b><small>避免高溫</small></div>`;
  const items = s.order.items.map(it => `${PRODUCT_MAP[it.pid].name}×${it.qty}`).join('、');
  const stamp = '<div class="wb-stamp">已列印</div><div class="wb-scan"></div><div class="wb-wm">示範樣張</div>';
  const rid = s.id.slice(-4);
  if (s.carrier === 'tcat') {
    return `<div class="wb wb-tcat" data-id="${s.id}">${stamp}
      <div class="wb-h"><div class="wb-logo"><b>黑貓宅急便</b><small>TA-Q-BIN${s.fridge ? '・COOL' : ''}</small></div>${s.fridge ? '<span class="wb-cool">低溫 冷藏便</span>' : '<span class="wb-cool room">常溫便</span>'}</div>
      <div class="wb-row"><div class="wb-f wb-to"><label>收件人</label><b>${esc(maskName(s.customer))}</b><span>${maskPhone(s.phone)}</span><span>${esc(maskAddr(s))}</span></div>${temp}</div>
      <div class="wb-grid"><div class="wb-f"><label>寄件人</label><span>阿美手作甜點</span><span>02-27＊＊-＊＊88</span></div>
        <div class="wb-f"><label>指定配達</label><b>${md(s.times.done)}</b><span>${s.fridge ? '14–18 時' : '不指定'}</span></div>
        <div class="wb-f"><label>尺寸／重量</label><span>60 cm・${s.weight} kg</span></div>
        <div class="wb-f"><label>品名</label><span>${s.fridge ? '甜點（易碎・冷藏）' : '甜點禮盒（易碎）'}</span></div></div>
      <div class="wb-bcw">${barcode(trk)}<div class="wb-no"><label>貨號</label><b class="mono">${trk}</b></div></div>
      <div class="wb-foot"><span>訂單 ${s.id}</span><span>${esc(items)}</span></div></div>`;
  }
  if (s.carrier === 'seven' || s.carrier === 'fami') {
    const seven = s.carrier === 'seven';
    const storeNo = String(hashStr(s.store) % 900000 + 100000);
    return `<div class="wb wb-${s.carrier}" data-id="${s.id}">${stamp}
      <div class="wb-h"><div class="wb-logo"><b>${seven ? '7-ELEVEN' : '全家 FamilyMart'}</b><small>${seven ? '交貨便・取貨付款／純取貨' : '店到店・純取貨'}</small></div><div class="wb-stripes"><i></i><i></i><i></i></div></div>
      <div class="wb-row"><div class="wb-f wb-to"><label>取貨門市</label><b>${esc(s.store)}</b><span>店號 ${storeNo}</span><span>取貨期限：${md(s.times.done + 7 * 24 * H)} 前</span></div>${temp}</div>
      <div class="wb-grid"><div class="wb-f"><label>取件人</label><b>${esc(maskName(s.customer))}</b><span>手機末三碼 ${s.phone.slice(-3)}</span></div>
        <div class="wb-f"><label>寄件人</label><span>阿美手作甜點</span><span>寄件門市：${seven ? '大安門市' : '大安和平店'}</span></div>
        <div class="wb-f"><label>包裹內容</label><span>甜點禮盒（易碎）</span></div>
        <div class="wb-f"><label>重量</label><span>${s.weight} kg・S 尺寸</span></div></div>
      <div class="wb-bcw">${barcode(trk)}<div class="wb-no"><label>${seven ? '交貨便代碼' : '寄件編號'}</label><b class="mono">${trk}</b></div></div>
      <div class="wb-foot"><span>訂單 ${s.id}</span><span>${esc(items)}</span></div></div>`;
  }
  if (s.carrier === 'ems') {
    const val = s.order.subtotal;
    return `<div class="wb wb-ems" data-id="${s.id}">${stamp}
      <div class="wb-h"><div class="wb-logo"><b>EMS</b><small>國際快捷 EXPRESS MAIL SERVICE</small></div><span class="wb-route">TW → ${s.city.country}</span></div>
      <div class="wb-row"><div class="wb-f wb-to"><label>To 收件人</label><b>${esc(maskName(s.customer))}</b><span>${esc(maskAddr(s))}</span><span>${COUNTRY_EN[s.city.country]}・Tel ＋＊＊ ＊＊＊＊ ${s.phone.slice(-3)}</span></div>${s.fridge ? `<div class="wb-temp cold">${icon('snow', 16)}<b>KEEP COOL</b><small>保冷包裝</small></div>` : temp}</div>
      <div class="wb-grid"><div class="wb-f"><label>From 寄件人</label><span>A-Mei Handmade Desserts</span><span>Da'an Dist., Taipei, TAIWAN</span></div>
        <div class="wb-f"><label>CN23 報關</label><span>☑ Merchandise ☐ Gift</span><span>${esc(s.order.items.map(it => CONTENT_EN[it.pid]).join(', '))}</span></div>
        <div class="wb-f"><label>申報價值</label><b>NT$ ${val.toLocaleString()}</b><span>≈ US$ ${Math.round(val / 32)}</span></div>
        <div class="wb-f"><label>重量</label><span>${s.weight} kg</span></div></div>
      <div class="wb-bcw">${barcode(trk)}<div class="wb-no"><label>Tracking 貨號</label><b class="mono">${trk.replace(/^(EE)(\d{3})(\d{3})(\d{3})(TW)$/, '$1 $2 $3 $4 $5')}</b></div></div>
      <div class="wb-foot"><span>訂單 ${s.id}</span><span>AI 已自動產生英文品名與 HS 編碼 1905.90</span></div></div>`;
  }
  return `<div class="wb wb-pickup" data-id="${s.id}">${stamp}
    <div class="wb-h"><div class="wb-logo"><b>門市取貨單</b><small>阿美手作甜點・大安店</small></div></div>
    <div class="wb-row"><div class="wb-f wb-to"><label>取貨人</label><b>${esc(maskName(s.customer))}</b><span>取貨碼 ${rid}</span></div>${temp}</div>
    <div class="wb-bcw">${barcode(trk)}<div class="wb-no"><label>取貨編號</label><b class="mono">${trk}</b></div></div>
    <div class="wb-foot"><span>訂單 ${s.id}</span><span>${esc(items)}</span></div></div>`;
}

function openWaybills() {
  const list = [...selected].map(id => ships.get(id)).filter(Boolean);
  if (!list.length) return;
  for (const s of list) if (!s.tracking) s.tracking = trackingNo(s.carrier, s.rng);
  const fee = list.reduce((a, s) => a + s.fee, 0);
  const by = {}; list.forEach(s => { by[s.carrier] = (by[s.carrier] || 0) + 1; });
  $('#shpWbN', modal).textContent = `（${list.length} 張）`;
  $('#shpWbList', modal).innerHTML = list.map(waybillHTML).join('');
  $('#shpWbSum', modal).innerHTML = `<div class="shp-wb-sum">${Object.entries(by).map(([c, n]) => `<span style="--cc:${CARRIERS[c].color}"><i></i>${CARRIERS[c].short} ×${n}</span>`).join('')}</div><b>運費合計 ${money(fee)}</b><small>列印後自動記入會計帳務「運費」科目（產銷人發財：銷）</small>`;
  const btn = $('#shpPrint', modal); btn.disabled = false; btn.innerHTML = `${PRINT} 列印並自動入帳`;
  $('.shp-printer span', modal).textContent = 'GreenUP 熱感印表機・就緒';
  const m = modal; m.hidden = false;
  gsap.fromTo($('.shp-modal-bg', m), { opacity: 0 }, { opacity: 1, duration: 0.3 });
  gsap.fromTo($('.shp-modal-box', m), { y: 40, opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'power3.out' });
  gsap.fromTo($$('.wb', m), { clipPath: 'inset(0 0 100% 0)', y: -24 }, { clipPath: 'inset(0 0 0% 0)', y: 0, duration: 0.7, stagger: 0.12, delay: 0.25, ease: 'power2.out', clearProps: 'clipPath,transform' });
}
function closeWaybills() {
  const m = modal; if (m.hidden) return;
  gsap.to($('.shp-modal-box', m), { y: 30, opacity: 0, duration: 0.25 });
  gsap.to($('.shp-modal-bg', m), { opacity: 0, duration: 0.3, onComplete: () => { m.hidden = true; } });
}
async function printWaybills() {
  const btn = $('#shpPrint', modal); if (btn.disabled) return;
  btn.disabled = true; btn.innerHTML = `${PRINT} 列印中…`;
  const list = [...selected].map(id => ships.get(id)).filter(Boolean);
  const pr = $('.shp-printer', modal); pr.classList.add('on'); $('span', pr).textContent = `列印中 0 / ${list.length}`;
  const wbs = $$('.wb', $('#shpWbList', modal));
  const tl = gsap.timeline();
  wbs.forEach((w, i) => {
    tl.call(() => { const L = w.parentElement; if (w.offsetTop + w.offsetHeight > L.scrollTop + L.clientHeight || w.offsetTop < L.scrollTop) L.scrollTo({ top: w.offsetTop - 12, behavior: 'smooth' }); $('span', pr).textContent = `列印中 ${i + 1} / ${list.length}`; })
      .fromTo($('.wb-scan', w), { top: '0%', opacity: 1 }, { top: '100%', duration: 0.5, ease: 'none' })
      .to($('.wb-scan', w), { opacity: 0, duration: 0.1 })
      .fromTo($('.wb-stamp', w), { opacity: 0, scale: 2.2, rotation: -24 }, { opacity: 1, scale: 1, rotation: -12, duration: 0.35, ease: 'back.out(2)' }, '-=0.05')
      .to(w, { y: -4, duration: 0.12, yoyo: true, repeat: 1 }, '<');
  });
  await tl.then();
  pr.classList.remove('on'); $('span', pr).textContent = `完成 ${list.length} 張・已傳送至物流商系統`;
  const fee = list.reduce((a, s) => a + s.fee, 0);
  sessionFee += fee; sessionCount += list.length;
  list.forEach(s => { s.printed = true; });
  selected.clear();
  toast('運費已自動入帳', `${list.length} 張託運單・運費 ${money(fee)} 已記入「運費」科目，並與物流商月結帳單自動對帳`, { icon: icon('coins', 18) });
  store.log('order', `AI 產生 ${list.length} 張託運單，運費 ${money(fee)} 已自動入帳`);
  setTimeout(() => {
    closeWaybills();
    renderBoard(); renderKpis(false);
    const fk = $('.kpi[data-k="fee"]', root); if (fk) { fk.classList.remove('flash'); void fk.offsetWidth; fk.classList.add('flash'); }
    // 待揀貨 → 包裝中（託運單已貼上）
    const toPack = list.filter(s => s.stage === 0);
    toPack.forEach((s, i) => setTimeout(() => move(s.id, 1, { quiet: true }), 350 + i * 160));
  }, 900);
}

// ---------------------------------------------------------------- 物流追蹤抽屜
function openDrawer(id) {
  if (!ships.has(id)) return;
  drawerId = id;
  const d = drawer; d.hidden = false;
  renderDrawer(true);
  gsap.fromTo($('.shp-drawer-bg', d), { opacity: 0 }, { opacity: 1, duration: 0.3 });
  gsap.fromTo($('#shpDrawerPanel', d), { x: 60, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, ease: 'power3.out' });
}
function closeDrawer() {
  const d = drawer; if (d.hidden) return;
  drawerId = null;
  gsap.to($('#shpDrawerPanel', d), { x: 60, opacity: 0, duration: 0.25 });
  gsap.to($('.shp-drawer-bg', d), { opacity: 0, duration: 0.3, onComplete: () => { d.hidden = true; } });
}

function timelineSteps(s) {
  const c = CARRIERS[s.carrier];
  const now = Date.now();
  const hub = s.intl ? '台北國際郵件處理中心・出口通關' : s.carrier === 'tcat' ? `${['桃園', '台北', '台中'][hashStr(s.id) % 3]}轉運中心${s.fridge ? '・冷藏倉 4°C' : ''}` : s.carrier === 'pickup' ? '門市冷藏櫃保管' : '物流中心理貨・配送至門市';
  const out = s.carrier === 'pickup' ? '已通知客人取貨' : s.store ? `配送至「${s.store}」・到店後簡訊通知` : s.intl ? `${s.city.label} 當地派送中` : `司機配送中・預計 ${hm(s.times.done)} 前`;
  const pickupMode = s.carrier === 'pickup';
  return [
    { k: 'order', name: '訂單成立', sub: `${CH[s.channel] || ''} AI 自動建單`, t: s.times.order, on: true },
    { k: 'pack', name: '揀貨包裝', sub: s.fridge ? '加保冷劑、貼溫層標籤' : '禮盒包裝・防撞氣泡袋', t: s.times.pack, on: s.stage >= 1 },
    { k: 'ship', name: pickupMode ? '備貨完成' : '已取件', sub: pickupMode ? '放入取貨櫃' : `${c.short} 收件${s.tracking ? '・' + s.tracking : ''}`, t: s.times.ship, on: s.stage >= 2 },
    { k: 'hub', name: pickupMode ? '門市保管' : '轉運中心', sub: hub, t: s.times.hub, on: s.stage >= 3 || (s.stage === 2 && now >= s.times.hub) },
    { k: 'out', name: pickupMode ? '通知取貨' : '配送中', sub: out, t: s.times.out, on: s.stage >= 3 },
    { k: 'done', name: pickupMode ? '已取貨' : '已送達', sub: s.store ? '客人已取貨' : pickupMode ? '客人已到店取貨' : '收件人已簽收', t: s.times.done, on: s.stage >= 4 },
  ];
}

function renderDrawer(animate) {
  const s = ships.get(drawerId); if (!s) return;
  const c = CARRIERS[s.carrier];
  const steps = timelineSteps(s);
  const curIdx = steps.reduce((a, st, i) => st.on ? i : a, 0);
  const exc = excOf(s.id);
  const msg = shipMessage(s);
  const sent = s.stage >= 2 && s.carrier !== 'pickup';
  const panel = $('#shpDrawerPanel', drawer);
  panel.innerHTML = `
    <div class="sd-h"><div><small class="mono">${s.id}</small><h3>${esc(s.customer)} <span class="sc-lang">${LANG_SHORT[s.lang] || ''}</span></h3></div><button class="icon-btn" data-dclose aria-label="關閉">${icon('x', 18)}</button></div>
    <div class="sd-sum" style="--cc:${c.color}">
      <div><label>物流商</label><b><i class="sd-dot"></i>${c.name}</b></div>
      <div><label>溫層</label><b class="${s.fridge ? 'sd-cold' : ''}">${s.fridge ? icon('snow', 13) + ' 冷藏 0–7°C' : '常溫'}</b></div>
      <div><label>目的地</label><b>${esc(destLabel(s))}</b></div>
      <div><label>貨號</label><b class="mono">${s.tracking || '待產生託運單'}</b></div>
    </div>
    <div class="sd-items">${s.order.items.map(it => `<span>${productArt(it.pid, 34, { bg: false })}<b>${PRODUCT_MAP[it.pid].name}</b><em>×${it.qty}</em></span>`).join('')}</div>
    ${exc ? `<div class="sd-exc ${exc.status}" style="--ec:${exc.color}">${icon('alert', 16)}<div><b>${exc.label}・${exc.statusText}</b><span>${esc(exc.desc)}</span><span class="sd-exc-ai">${icon('bot', 13)} ${esc(exc.ai)}</span></div></div>` : ''}
    <h4>${icon('truck', 15)} 配送時間軸</h4>
    <ol class="sd-tl">${steps.map((st, i) => `<li class="${st.on ? 'on' : ''} ${i === curIdx ? 'cur' : ''}"><i></i><div><b>${st.name}</b><span>${esc(st.sub)}</span></div><time>${st.on ? `${md(st.t)} ${hm(st.t)}` : `預計 ${md(st.t)} ${hm(st.t)}`}</time></li>`).join('')}</ol>
    <h4>${icon('chat', 15)} ${sent ? `AI 已自動傳送出貨通知` : `交寄後 AI 將自動傳送`}</h4>
    <div class="sd-msg">
      <div class="sd-msg-h">${chIcon(s.channel, 20)}<span>${NOTIFY_VIA[s.channel] || 'LINE'}・${msg.lang}</span>${sent ? `<em>${icon('check', 12)}${icon('check', 12)} 已讀 ${hm(s.times.ship + 9 * 6e4)}</em>` : '<em class="draft">草稿</em>'}</div>
      <div class="sd-bubble" id="sdBubble"></div>
      ${msg.zh ? `<div class="sd-trans">${icon('globe', 12)} 中文對照：${esc(msg.zh)}</div>` : ''}
    </div>
    <div class="sd-actions">
      <button class="btn btn-ghost btn-sm" id="sdResend">${icon('send', 14)} 重新傳送通知</button>
      ${s.stage < 4 ? `<button class="btn btn-primary btn-sm" id="sdNext">推進到「${STAGES[s.stage + 1].name}」 →</button>` : `<span class="chip-sm">${icon('check', 12)} 已完成配送</span>`}
    </div>`;
  $$('[data-dclose]', panel).forEach(b => b.addEventListener('click', closeDrawer));
  const bub = $('#sdBubble', panel);
  if (animate) { typeText(bub, msg.text, 9); gsap.fromTo($$('.sd-tl li', panel), { opacity: 0, x: 16 }, { opacity: 1, x: 0, duration: 0.4, stagger: 0.07, delay: 0.15 }); }
  else bub.textContent = msg.text;
  $('#sdResend', panel).addEventListener('click', () => toast(`已重新傳送｜${s.customer}`, `AI 以${LANG_NAME[s.lang] || '中文'}透過 ${NOTIFY_VIA[s.channel] || 'LINE'} 再次傳送追蹤連結`, { kind: 'info', icon: icon('send', 18) }));
  const nx = $('#sdNext', panel); nx && nx.addEventListener('click', () => move(s.id, s.stage + 1));
}

// ---------------------------------------------------------------- 異常與通知
function renderExc() {
  const open = exceptions.filter(x => x.status !== 'done').length;
  const chip = $('#shpExcChip', root); chip.textContent = `${exceptions.length} 件・AI 已處理 ${exceptions.length - exceptions.filter(x => x.status === 'need').length} 件`; chip.className = 'chip-sm ' + (open ? 'warn' : '');
  const PROG = ['偵測', '聯絡客人', '客人回覆', '結案'];
  $('#shpExc', root).innerHTML = exceptions.map(x => {
    const s = ships.get(x.id); if (!s) return '';
    return `<li class="shp-exc-i ${x.status}" data-id="${x.id}" style="--ec:${x.color}">
      <div class="ex-ic">${icon('alert', 16)}</div>
      <div class="ex-b"><div class="ex-t"><b>${x.label}</b><span>${esc(s.customer)}・${CARRIERS[s.carrier].short}</span><em class="ex-st ${x.status}">${x.statusText}</em></div>
        <p>${esc(x.desc)}</p><p class="ex-ai">${icon('bot', 13)} ${esc(x.ai)}</p>
        <div class="ex-prog">${PROG.map((p, i) => `<span class="${i < x.prog ? 'on' : ''}">${p}</span>`).join('')}</div></div>
      <div class="ex-act">${x.act === 'remind' ? '<button class="btn btn-ghost btn-sm" data-a="remind">再次提醒</button>' : x.act === 'decide' && x.status === 'need' ? '<button class="btn btn-primary btn-sm" data-a="resend">補寄一份</button><button class="btn btn-ghost btn-sm" data-a="refund">折讓 NT$100</button>' : ''}<button class="btn btn-ghost btn-sm" data-a="view">查看</button></div></li>`;
  }).join('');
}
function onExcClick(e) {
  const li = e.target.closest('.shp-exc-i'); if (!li) return;
  const x = excOf(li.dataset.id); const s = ships.get(li.dataset.id); if (!x || !s) return;
  const a = e.target.closest('[data-a]')?.dataset.a;
  if (a === 'remind') {
    toast(`AI 已再次提醒 ${s.customer}`, `以${LANG_NAME[s.lang]}傳送改店連結，並附上 3 間鄰近門市供選擇`, { kind: 'info', icon: icon('send', 18) });
    setTimeout(() => { Object.assign(x, { status: 'done', statusText: '已改店', prog: 4, act: null, ai: `客人已選擇新門市，AI 已通知物流改寄並更新取貨資訊` }); renderExc(); renderBoard(); flashExc(x.id); }, 1800);
  } else if (a === 'resend' || a === 'refund') {
    Object.assign(x, { status: 'done', statusText: a === 'resend' ? '已安排補寄' : '已折讓', prog: 4, ai: a === 'resend' ? 'AI 已建立補寄訂單（免運），並用客人的語言致歉說明' : 'AI 已開立折讓單 NT$100、同步會計帳務，並傳送致歉訊息' });
    toast(a === 'resend' ? '已安排補寄' : '已開立折讓 NT$100', a === 'resend' ? `${s.customer}・明天以黑貓冷藏補寄，AI 已通知客人` : `${s.customer}・銷貨折讓已自動入帳（含稅額調整）`, { icon: icon(a === 'resend' ? 'truck' : 'receipt', 18) });
    renderExc(); renderBoard(); flashExc(x.id);
  } else openDrawer(x.id);
}
function flashExc(id) { const li = $(`.shp-exc-i[data-id="${id}"]`, root); li && gsap.fromTo(li, { backgroundColor: 'rgba(45,182,116,.3)' }, { backgroundColor: 'rgba(45,182,116,0)', duration: 1.6 }); }

function renderNotif(fresh) {
  $('#shpNotif', root).innerHTML = notifs.map(n => {
    const s = ships.get(n.id); if (!s) return '';
    const m = shipMessage(s);
    return `<li data-id="${s.id}" class="${n.fresh ? 'fresh' : ''}">${chIcon(s.channel, 26)}<div class="nt-b"><div class="nt-t"><b>${esc(s.customer)}</b><span class="sc-lang">${LANG_SHORT[s.lang] || ''}</span><em>${md(n.ts)} ${hm(n.ts)}</em></div><p>${esc(m.text.split('\n').filter(Boolean)[m.text.startsWith(s.customer + ' 様') ? 1 : 0])}</p></div><span class="nt-st">${icon('check', 12)}已讀</span></li>`;
  }).join('') || '<li class="shp-empty">尚無出貨通知</li>';
  if (fresh) { const f = $('#shpNotif li.fresh', root); if (f) { gsap.fromTo(f, { x: -30, opacity: 0, backgroundColor: 'rgba(45,182,116,.28)' }, { x: 0, opacity: 1, backgroundColor: 'rgba(45,182,116,0)', duration: 1.2, ease: 'power3.out' }); } notifs.forEach(n => { n.fresh = false; }); }
}

// ---------------------------------------------------------------- 物流商比較
function renderCarrier() {
  if (!chart) return;
  const st = carrierStats(month);
  const names = st.map(x => CARRIERS[x.id].short.replace(' ', '\n').replace('店到店', '\n店到店').replace('宅急便', '\n宅急便'));
  const g = (c) => new window.echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: c }, { offset: 1, color: c + '22' }]);
  chart.setOption({
    animationDuration: 1200,
    grid: { left: 6, right: 6, top: 34, bottom: 2, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 12, itemHeight: 8, data: ['件數', '平均時效（天）'] },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (ps) => { const x = st[ps[0].dataIndex]; return `<b>${CARRIERS[x.id].name}</b><br/>件數 ${x.n} 件（冷藏 ${x.cold}）<br/>平均時效 ${x.lead} 天<br/>異常率 ${x.ex}%<br/>運費 NT$ ${x.fee.toLocaleString()}`; } },
    xAxis: { type: 'category', data: names, axisLabel: { interval: 0, fontSize: 11, color: '#d6f0e2' } },
    yAxis: [{ type: 'value', name: '件', nameTextStyle: { color: 'rgba(214,240,226,.45)', fontSize: 10 }, splitNumber: 3 }, { type: 'value', name: '天', min: 0, max: 4, splitNumber: 4, nameTextStyle: { color: 'rgba(214,240,226,.45)', fontSize: 10 }, splitLine: { show: false } }],
    series: [
      { name: '件數', type: 'bar', barWidth: '42%', data: st.map(x => ({ value: x.n, itemStyle: { color: g(CARRIERS[x.id].color), borderRadius: [8, 8, 0, 0] } })), label: { show: true, position: 'top', color: '#eafff4', fontSize: 11 }, itemStyle: { color: '#2DB674' } },
      { name: '平均時效（天）', type: 'line', yAxisIndex: 1, data: st.map(x => x.lead), smooth: true, symbol: 'circle', symbolSize: 9, lineStyle: { width: 3, color: '#5EE0C4', shadowColor: '#5EE0C4', shadowBlur: 10 }, itemStyle: { color: '#5EE0C4', borderColor: '#061a13', borderWidth: 2 } },
    ],
  });
  $('#shpCtbl', root).innerHTML = `<thead><tr><th>物流商</th><th class="r">件數</th><th class="r">時效</th><th class="r">異常率</th><th class="r">運費</th></tr></thead><tbody>${st.map(x => `<tr><td><i class="shp-cdot" style="background:${CARRIERS[x.id].color}"></i>${CARRIERS[x.id].short}</td><td class="r">${x.n}</td><td class="r">${x.lead} 天</td><td class="r ${x.ex > 3 ? 'shp-warn' : ''}">${x.ex}%</td><td class="r">${money(x.fee)}</td></tr>`).join('')}</tbody>`;
  const tp = month.filter(s => s.cityId === 'taipei' && s.carrier === 'tcat');
  const cost = tp.reduce((a, s) => a + s.fee, 0);
  const save = Math.round(cost * 0.12);
  $('#shpAi', root).innerHTML = `<div class="shp-ai-ic">${icon('sparkle', 18)}</div><div><b>AI 建議：台北市內改用同日配可省 12%</b><span>近 30 天台北市內黑貓宅配 ${tp.length} 件、運費 ${money(cost)}。15:00 前成立的台北市冷藏訂單改派「同城快送（同日配）」，每月約省 <em>${money(save)}</em>，客人當天就能收到。</span></div>
    <button class="btn ${sameDayOn ? 'btn-ghost' : 'btn-primary'} btn-sm" id="shpSameDay" ${sameDayOn ? 'disabled' : ''}>${sameDayOn ? icon('check', 14) + ' 已套用' : '套用建議'}</button>`;
  $('#shpSameDay', root).addEventListener('click', () => {
    sameDayOn = true;
    toast('已套用 AI 建議（示範）', `台北市內 15:00 前冷藏訂單改派同日配，預估每月省 ${money(save)}`, { icon: icon('sparkle', 18) });
    renderCarrier(); gsap.fromTo('#shpAi', { scale: 0.97 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
  });
}

// ---------------------------------------------------------------- 出貨路線
function routeStats() {
  const m = {};
  for (const s of month) { if (s.carrier === 'pickup') continue; m[s.cityId] = (m[s.cityId] || 0) + 1; }
  return Object.entries(m).map(([id, n]) => ({ id, n, city: CITIES[id] })).sort((a, b) => b.n - a.n);
}
const COUNTRY_COLOR = { TW: '#2DB674', JP: '#2E97D4', MY: '#F0A531', SG: '#DD5597', VN: '#7C62E6' };
function renderRoutes() {
  const r = routeStats();
  const intl = r.filter(x => x.city.country !== 'TW');
  const dom = r.filter(x => x.city.country === 'TW');
  const domN = dom.reduce((a, x) => a + x.n, 0), intlN = intl.reduce((a, x) => a + x.n, 0);
  const max = Math.max(...r.map(x => x.n), 1);
  const row = (x) => `<li style="--rc:${COUNTRY_COLOR[x.city.country]}"><i></i><span>${x.city.label || x.city.name}</span><div class="rt-bar"><em style="width:${x.n / max * 100}%"></em></div><b>${x.n}</b></li>`;
  $('#shpRoutes', root).innerHTML = `<div class="rt-sum"><div><b>${domN}</b><small>國內件</small></div><div><b>${intlN}</b><small>跨境件</small></div><div><b>${new Set(intl.map(x => x.city.country)).size}</b><small>國家</small></div></div>
    <h5>跨境</h5><ul>${intl.map(row).join('')}</ul><h5>國內前 4</h5><ul>${dom.slice(0, 4).map(row).join('')}</ul>`;
}

function glowTex(color) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, '#ffffff'); r.addColorStop(0.2, color); r.addColorStop(1, color + '00');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function createGlobe(host) {
  let renderer;
  try {
    const test = document.createElement('canvas');
    if (!(test.getContext('webgl2') || test.getContext('webgl'))) return null;
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch { return null; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);
  const labels = el('<div class="shp-glabels"></div>'); host.appendChild(labels);
  const D = Math.PI / 180, R = 2;
  const ll = (lat, lon, r = R) => { const phi = (90 - lat) * D, th = (lon + 180) * D; return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th)); };

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(0, 0, 6.1);
  scene.add(new THREE.AmbientLight(0x5a8a76, 1.4));
  const dl = new THREE.DirectionalLight(0x9effd0, 1.6); dl.position.set(-3, 3, 5); scene.add(dl);

  const tilt = new THREE.Group(); scene.add(tilt);
  const spin = new THREE.Group(); tilt.add(spin);
  const LAT0 = 22, LON0 = 118;
  tilt.rotation.x = LAT0 * D;
  const baseY = Math.PI / 2 - (LON0 + 180) * D;
  spin.rotation.y = baseY;

  const globeMat = new THREE.MeshPhongMaterial({ color: 0x07261b, emissive: 0x031a11, specular: 0x1d6b4a, shininess: 18, transparent: true, opacity: 0.96 });
  spin.add(new THREE.Mesh(new THREE.SphereGeometry(R, 64, 64), globeMat));
  // 經緯線
  const gridMat = new THREE.LineBasicMaterial({ color: 0x2DB674, transparent: true, opacity: 0.1 });
  for (let lat = -60; lat <= 60; lat += 15) { const pts = []; for (let lon = 0; lon <= 360; lon += 4) pts.push(ll(lat, lon, R * 1.001)); spin.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat)); }
  for (let lon = 0; lon < 360; lon += 15) { const pts = []; for (let lat = -90; lat <= 90; lat += 4) pts.push(ll(lat, lon, R * 1.001)); spin.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat)); }
  // 點陣
  const N = 2600, dp = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * 2.399963; dp[i * 3] = Math.cos(th) * r * R * 1.003; dp[i * 3 + 1] = y * R * 1.003; dp[i * 3 + 2] = Math.sin(th) * r * R * 1.003; }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  spin.add(new THREE.Points(dg, new THREE.PointsMaterial({ color: 0x5EE0C4, size: 0.014, transparent: true, opacity: 0.35 })));
  // 海岸線
  const coastMat = new THREE.LineBasicMaterial({ color: 0x7ff5c2, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending });
  const fillMat = new THREE.LineBasicMaterial({ color: 0x2DB674, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending });
  for (const c of COASTS) {
    const pts = []; for (let i = 0; i < c.length - 1; i++) { const [a1, o1] = c[i], [a2, o2] = c[i + 1]; for (let k = 0; k < 4; k++) { const f = k / 4; pts.push(ll(a1 + (a2 - a1) * f, o1 + (o2 - o1) * f, R * 1.004)); } }
    pts.push(ll(c[c.length - 1][0], c[c.length - 1][1], R * 1.004));
    spin.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), coastMat));
    spin.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map(p => p.clone().multiplyScalar(1.012))), fillMat));
  }
  // 大氣光暈
  const atm = new THREE.Mesh(new THREE.SphereGeometry(R * 1.14, 48, 48), new THREE.ShaderMaterial({
    vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec3 vN; void main(){ float i = pow(0.66 - dot(vN, vec3(0.0, 0.0, 1.0)), 3.0); gl_FragColor = vec4(0.2, 0.85, 0.58, 1.0) * i * 1.6; }',
    blending: THREE.AdditiveBlending, side: THREE.BackSide, transparent: true, depthWrite: false,
  }));
  scene.add(atm);

  const routeGroup = new THREE.Group(); spin.add(routeGroup);
  const tex = {}; const texOf = (c) => tex[c] || (tex[c] = glowTex(c));
  const origin = ll(ORIGIN.lat, ORIGIN.lon, R * 1.005);
  const oSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texOf('#F0A531'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  oSprite.position.copy(origin); oSprite.scale.set(0.34, 0.34, 1); spin.add(oSprite);
  const oRing = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.075, 40), new THREE.MeshBasicMaterial({ color: 0xF0A531, transparent: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
  oRing.position.copy(origin); oRing.lookAt(origin.clone().multiplyScalar(2)); spin.add(oRing);

  let arcs = [];
  const lbl = [];
  function clearRoutes() {
    for (const a of arcs) { a.tube.geometry.dispose(); a.glow.geometry.dispose(); a.packets.forEach(p => p.material.dispose()); }
    routeGroup.clear(); arcs = []; labels.innerHTML = ''; lbl.length = 0;
    lbl.push({ pos: origin, node: labels.appendChild(el(`<span class="shp-gl origin">台北出貨</span>`)) });
  }
  function setRoutes(routes) {
    clearRoutes();
    const max = Math.max(...routes.map(r => r.n), 1);
    for (const r of routes) {
      if (r.id === 'taipei') continue;
      const col = COUNTRY_COLOR[r.city.country];
      const end = ll(r.city.lat, r.city.lon, R * 1.005);
      const dist = origin.distanceTo(end);
      const ctrl = origin.clone().add(end).normalize().multiplyScalar(R + 0.12 + dist * 0.55);
      const curve = new THREE.QuadraticBezierCurve3(origin, ctrl, end);
      const w = 0.006 + r.n / max * 0.01;
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, w, 6), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
      const glow = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, w * 3.2, 6), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false }));
      routeGroup.add(tube, glow);
      const total = tube.geometry.index.count;
      tube.geometry.setDrawRange(0, 0); glow.geometry.setDrawRange(0, 0);
      const np = r.city.country === 'TW' ? 1 : Math.min(3, 1 + Math.floor(r.n / 6));
      const packets = [];
      for (let i = 0; i < np; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texOf(col), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sp.scale.set(0.14, 0.14, 1); routeGroup.add(sp); packets.push(sp); }
      const dot = new THREE.Sprite(new THREE.SpriteMaterial({ map: texOf(col), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      dot.position.copy(end); dot.scale.set(0.2, 0.2, 1); routeGroup.add(dot);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.035, 0.045, 32), new THREE.MeshBasicMaterial({ color: col, transparent: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
      ring.position.copy(end); ring.lookAt(end.clone().multiplyScalar(2)); routeGroup.add(ring);
      arcs.push({ id: r.id, curve, tube, glow, total, grow: 0, delay: arcs.length * 0.12, packets, phase: Math.random(), speed: 0.22 + 0.1 * Math.random() + (r.city.country === 'TW' ? 0.25 : 0), dot, ring, flash: 0 });
      if (r.city.country !== 'TW') lbl.push({ pos: end, node: labels.appendChild(el(`<span class="shp-gl" style="--rc:${col}">${r.city.name} <b>${r.n}</b></span>`)) });
    }
  }

  let w = 1, h = 1;
  function resize() { const rc = host.getBoundingClientRect(); w = Math.max(1, rc.width); h = Math.max(1, rc.height); renderer.setSize(w, h, false); camera.aspect = w / h; camera.position.z = w / h < 1.1 ? 5.9 : 4.9; camera.updateProjectionMatrix(); }
  const ro = new ResizeObserver(resize); ro.observe(host); resize();

  let drag = null, offY = 0, offX = 0;
  host.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, oy: offY, ox: offX }; host.setPointerCapture(e.pointerId); });
  host.addEventListener('pointermove', (e) => { if (!drag) return; offY = drag.oy + (e.clientX - drag.x) * 0.006; offX = Math.max(-0.5, Math.min(0.5, drag.ox + (e.clientY - drag.y) * 0.004)); });
  const endDrag = () => { drag = null; };
  host.addEventListener('pointerup', endDrag); host.addEventListener('pointercancel', endDrag);

  let running = false, raf = 0, last = 0, t = 0, onScreen = true;
  const io = new IntersectionObserver((ents) => { onScreen = ents[0].isIntersecting; if (onScreen && running) loop(); });
  io.observe(host);
  const v = new THREE.Vector3(), nrm = new THREE.Vector3();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    if (!drag) { offY *= 0.985; offX *= 0.97; }
    spin.rotation.y = baseY + Math.sin(t * 0.18) * 0.22 + offY;
    tilt.rotation.x = LAT0 * D + offX;
    const pulse = (Math.sin(t * 3) + 1) / 2;
    oRing.scale.setScalar(1 + pulse * 0.8); oRing.material.opacity = 0.9 - pulse * 0.7;
    for (const a of arcs) {
      if (a.grow < 1) { a.grow = Math.min(1, Math.max(0, (t - a.delay) / 1.4)); const n = Math.floor(a.total * a.grow / 3) * 3; a.tube.geometry.setDrawRange(0, n); a.glow.geometry.setDrawRange(0, n); }
      a.flash = Math.max(0, a.flash - dt * 0.8);
      a.packets.forEach((p, i) => { const u = (t * a.speed + a.phase + i / a.packets.length) % 1; const vis = a.grow >= 1; p.visible = vis; if (vis) { p.position.copy(a.curve.getPointAt(u)); const s = 0.12 + Math.sin(u * Math.PI) * 0.06 + a.flash * 0.2; p.scale.set(s, s, 1); } });
      const rp = ((t * 0.9 + a.phase) % 1);
      a.ring.scale.setScalar(1 + rp * 1.8 + a.flash * 2); a.ring.material.opacity = (1 - rp) * 0.8;
      a.tube.material.opacity = 0.75 + a.flash * 0.25; a.glow.material.opacity = 0.14 + a.flash * 0.4;
    }
    renderer.render(scene, camera);
    // HTML 標籤
    const placed = [];
    for (const L of lbl) {
      v.copy(L.pos); spin.localToWorld(v);
      nrm.copy(v).normalize();
      const facing = nrm.dot(camera.position.clone().sub(v).normalize());
      v.project(camera);
      const x = (v.x + 1) / 2 * w; let y = (1 - v.y) / 2 * h;
      const lw = L.w || (L.w = L.node.offsetWidth || 70);
      // 簡易避讓：與已放置的標籤重疊就往下移
      for (let k = 0; k < 6; k++) { const hit = placed.find(p => Math.abs(p.y - y) < 21 && x < p.x + p.w && x + lw > p.x); if (!hit) break; y = hit.y + 21; }
      placed.push({ x, y, w: lw });
      L.node.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      L.node.style.opacity = facing > 0.15 && x > 0 && x < w - 20 && y > 20 && y < h ? '1' : '0';
    }
  }
  function loop() {
    cancelAnimationFrame(raf);
    last = performance.now();
    const step = (now) => { if (!running || !onScreen || document.hidden) return; frame(now); raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && running) loop(); });
  return {
    setRoutes,
    start() { if (running) return; running = true; loop(); },
    stop() { running = false; cancelAnimationFrame(raf); },
    ping(cityId) { const a = arcs.find(x => x.id === cityId); if (a) a.flash = 1; oRing.scale.setScalar(2.5); },
    get running() { return running; },
  };
}

// 無 WebGL：2D SVG 路線圖
function fallbackMap(host) {
  host.classList.add('shp-noglobe');
  const W = 400, Hh = 300, lon0 = 96, lon1 = 146, lat0 = -8, lat1 = 46;
  const P = (lat, lon) => [((lon - lon0) / (lon1 - lon0) * W).toFixed(1), ((lat1 - lat) / (lat1 - lat0) * Hh).toFixed(1)];
  const coasts = COASTS.map(c => `<polyline points="${c.map(([a, o]) => P(a, o).join(',')).join(' ')}"/>`).join('');
  const [ox, oy] = P(ORIGIN.lat, ORIGIN.lon);
  const arcs = routeStats().filter(r => r.id !== 'taipei').map(r => {
    const [x, y] = P(r.city.lat, r.city.lon); const cx = (+ox + +x) / 2, cy = Math.min(+oy, +y) - 30;
    return `<path d="M${ox} ${oy} Q${cx} ${cy} ${x} ${y}" style="--rc:${COUNTRY_COLOR[r.city.country]}"/><circle cx="${x}" cy="${y}" r="3.5" fill="${COUNTRY_COLOR[r.city.country]}"/>`;
  }).join('');
  host.innerHTML = `<svg viewBox="0 0 ${W} ${Hh}" class="shp-fb"><g class="fb-coast">${coasts}</g><g class="fb-arcs">${arcs}</g><circle cx="${ox}" cy="${oy}" r="5" fill="#F0A531"/></svg><span class="shp-fb-note">此裝置不支援 WebGL，已改用平面路線圖</span>`;
}
