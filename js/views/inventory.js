// 庫存與生產（產・生產管理）：KPI、3D 倉儲、AI 補貨與採購單、配方 BOM、原料效期 FIFO、今日生產排程、盤點與損耗
import * as THREE from 'three';
import { store } from '../state.js';
import { $, $$, el, gsap, esc, money, fmtMD, countUp, toast, sleep } from '../util.js';
import { icon, chIcon } from '../icons.js';
import { makeChart } from '../charts.js';
import { productArt } from '../art.js';
import { startOfDay, addDays } from '../data.js';
import {
  PRODUCTS, PRODUCT_MAP, MATERIALS, MAT, SUPPLIERS, buildLots, bom, LEAD, BATCH, STEPS, RESOURCES, PRIORITY,
  DAY_START, PACK_START, OVEN_WINDOW, LABOR_RATE, wasteLog, RECIPES, IS_AMEI, IVL, IVX, KIT,
} from '../inventory-data.js';

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
const SHORT = IS_AMEI ? { lemon: '檸檬塔', roll: '生乳捲', basque: '巴斯克', pound: '磅蛋糕', cookie: '餅乾', pineapple: '鳳梨酥', canele: '可麗露' }
  : Object.fromEntries(PRODUCTS.map(p => [p.id, KIT.short(p)]));
// 保存天數：阿美沿用商品主檔；其他業主依商品描述與業態推估（null＝不需效期）
const shelfOf = (p) => IS_AMEI ? p.days : (KIT.shelfOf(p) ?? 9999);
const BATCHW = IS_AMEI ? '整爐' : '整批';
const shelfTxt = (d) => d >= 9999 ? '不需效期' : `保存 ${d} 天`;
const CAT_COLOR = { 原料: '#2DB674', 包材: '#2E97D4', 人工: '#F0A531', 製造費用: '#7C62E6' };
const DAY = 86400e3;

let root = null, lots = [], waste = [], selPid = IS_AMEI ? 'roll' : (IVX.ai?.pid || PRODUCTS[0]?.id), override = {}, done = new Set();
let charts = null, shelf = null, ticker = 0, chartsReady = false;
let take = { mode: false, posted: false, vals: {} };
let lastPlan = null, modalEl = null;

const fmtQ = (v, dp = 1) => Number(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: dp });
const hm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const dayLabel = (d) => `${fmtMD(d)}（${WEEK[new Date(d).getDay()]}）`;

/* ---------------- 計算 ---------------- */
function salesStats() {
  const today = startOfDay(new Date());
  const s14 = {}, s7 = {}, sp7 = {};
  for (const o of store.ordersBetween(addDays(today, -14), today)) {
    const recent = o.ts >= +addDays(today, -7);
    for (const it of o.items) {
      s14[it.pid] = (s14[it.pid] || 0) + it.qty;
      if (recent) s7[it.pid] = (s7[it.pid] || 0) + it.qty; else sp7[it.pid] = (sp7[it.pid] || 0) + it.qty;
    }
  }
  return { s14, s7, sp7 };
}

function computePlan() {
  const inv = store.inventory();
  const { s14, s7, sp7 } = salesStats();
  const rows = inv.map(p => {
    const avg = (s14[p.id] || 0) / 14;
    const trend = Math.min(1.25, Math.max(0.85, (s7[p.id] || 1) / (sp7[p.id] || 1)));
    const fc = avg * (0.6 + 0.4 * trend);
    const shelfD = shelfOf(p);
    const fresh = shelfD <= 4;
    const cover = Math.min(LEAD[p.id] + (fresh ? 2 : 7), shelfD);
    const target = Math.ceil(p.safety + fc * cover);
    const suggest = Math.max(0, target - p.current);
    const auto = suggest ? Math.ceil(suggest / BATCH[p.id]) * BATCH[p.id] : 0;
    const make = override[p.id] != null ? override[p.id] : auto;
    const days = fc ? p.current / fc : 99;
    const status = make > 0 ? 'make' : days > shelfD ? 'over' : 'ok';
    return { ...p, shelf: shelfD, avg, fc, trend, cover, target, suggest, auto, make, days, status, lead: LEAD[p.id] };
  });
  // 原料需求
  const onHand = {};
  for (const l of lots) onHand[l.mid] = (onHand[l.mid] || 0) + l.qty;
  const mats = MATERIALS.map(m => {
    let daily = 0, use = 0;
    for (const r of rows) {
      const line = bom(r.id).rows.find(x => x.mid === m.id);
      if (!line) continue;
      daily += r.fc * line.qty; use += r.make * line.qty;
    }
    const sup = SUPPLIERS[m.vendor] || { lead: 2 };
    const need = use + daily * (sup.lead + 2) + m.safety;
    const short = Math.max(0, need - (onHand[m.id] || 0));
    const packs = short > 0 ? Math.ceil(short / m.pack) : 0;
    const qty = +(packs * m.pack).toFixed(2);
    return { ...m, onHand: onHand[m.id] || 0, daily, use, need, qty, packs, amt: Math.round(qty * m.cost), lead: sup.lead, low: (onHand[m.id] || 0) < m.safety };
  });
  lastPlan = { rows, mats, inv };
  return lastPlan;
}

function buildSchedule(rows) {
  const free = { ovenA: DAY_START, ovenB: DAY_START, bench: DAY_START, pack: PACK_START };
  const lanes = [];
  const rmap = Object.fromEntries(rows.map(r => [r.id, r]));
  const chains = PRIORITY.filter(pid => rmap[pid].make > 0).map(pid => {
    const make = rmap[pid].make, runs = Math.ceil(make / BATCH[pid]);
    const steps = [];
    STEPS[pid].forEach(([res, name, d]) => {
      if (res === 'oven') for (let k = 0; k < runs; k++) steps.push({ res, name: runs > 1 ? `${name}・第 ${k + 1} ${IS_AMEI ? "爐" : "批"}` : name, d, qty: Math.min(BATCH[pid], make - k * BATCH[pid]) });
      else steps.push({ res, name, d, qty: make });
    });
    return { pid, steps, i: 0, ready: DAY_START, ovenEnd: 0 };
  });
  const tasks = [];
  const est = (c) => {
    const st = c.steps[c.i];
    if (st.res === 'oven') { const o = free.ovenA <= free.ovenB ? 'ovenA' : 'ovenB'; return { start: Math.max(c.ready, free[o]), res: o }; }
    if (st.res === 'fridge') return { start: c.ready, res: 'fridge' };
    return { start: Math.max(c.ready, free[st.res]), res: st.res };
  };
  let guard = 0;
  while (chains.some(c => c.i < c.steps.length) && guard++ < 400) {
    let best = null;
    for (const c of chains) {
      if (c.i >= c.steps.length) continue;
      const e = est(c);
      if (!best || e.start < best.e.start) best = { c, e };
    }
    const { c, e } = best; const st = c.steps[c.i];
    const end = e.start + st.d;
    let lane = 0;
    if (e.res === 'fridge') {
      lane = lanes.findIndex(f => f <= e.start); if (lane < 0) { lanes.push(0); lane = lanes.length - 1; }
      lanes[lane] = end;
    } else free[e.res] = end;
    tasks.push({ id: `${c.pid}-${c.i}`, pid: c.pid, res: e.res, lane, s: e.start, d: st.d, name: st.name, qty: st.qty, oven: st.res === 'oven' });
    if (st.res === 'oven') { c.ovenEnd = Math.max(c.ovenEnd, end); const nx = c.steps[c.i + 1]; if (!nx || nx.res !== 'oven') c.ready = c.ovenEnd; }
    else c.ready = end;
    c.i++;
  }
  // 固定：明日備料（阿美：可麗露麵糊冷藏熟成 24 小時；其他業主依業態）
  const PREP = IS_AMEI ? { pid: 'canele', name: '明日可麗露麵糊', rest: '麵糊熟成 → 明日' } : IVX.prep;
  let end;
  if (PREP && PRODUCT_MAP[PREP.pid]) {
    const prep = { id: 'prep-batter', pid: PREP.pid, res: 'bench', lane: 0, s: free.bench, d: 30, name: PREP.name, qty: 0 };
    tasks.push(prep);
    end = Math.max(...tasks.map(t => t.s + t.d), DAY_START + 11 * 60);
    end = Math.ceil(end / 60) * 60;
    let lane = lanes.findIndex(f => f <= prep.s + 30); if (lane < 0) { lanes.push(0); lane = lanes.length - 1; }
    lanes[lane] = end;
    tasks.push({ id: 'prep-rest', pid: PREP.pid, res: 'fridge', lane, s: prep.s + 30, d: end - prep.s - 30, name: PREP.rest, qty: 0, open: true });
  } else {
    end = Math.ceil(Math.max(DAY_START + 11 * 60, ...tasks.map(t => t.s + t.d)) / 60) * 60;
  }
  const ovenMin = tasks.filter(t => t.oven).reduce((s, t) => s + t.d, 0);
  const ovenA = tasks.filter(t => t.res === 'ovenA').reduce((s, t) => s + t.d, 0);
  const ovenB = tasks.filter(t => t.res === 'ovenB').reduce((s, t) => s + t.d, 0);
  const cap = (OVEN_WINDOW[1] - OVEN_WINDOW[0]) * 2;
  return { tasks: tasks.sort((a, b) => a.s - b.s), lanes: Math.max(1, lanes.length), start: DAY_START, end, ovenMin, ovenA, ovenB, util: ovenMin / cap * 100, cap };
}

function rawValue() { return lots.reduce((s, l) => s + l.qty * MAT[l.mid].cost, 0); }
function expiring(days = 3) { const lim = Date.now() + days * DAY; return lots.filter(l => +l.exp <= lim && l.qty > 0); }

function weekWaste() {
  const today = startOfDay(new Date());
  const weeks = [];
  for (let w = 7; w >= 0; w--) {
    const from = addDays(today, -6 - w * 7), to = addDays(today, 1 - w * 7);
    const amt = waste.filter(x => x.ts >= +from && x.ts < +to).reduce((s, x) => s + x.amt, 0);
    let cogs = 0;
    for (const o of store.ordersBetween(from, to)) for (const it of o.items) cogs += it.qty * PRODUCT_MAP[it.pid].cost;
    weeks.push({ label: w === 0 ? '本週' : `${fmtMD(from)}`, amt, cogs, rate: cogs ? amt / (cogs + amt) * 100 : 0 });
  }
  return weeks;
}

/* ---------------- 版面 ---------------- */
const KPI = [
  { k: 'fg', label: '成品庫存價值', icon: 'box', c: 'var(--leaf)' },
  { k: 'raw', label: '原料庫存價值', icon: 'leaf', c: 'var(--sky)' },
  { k: 'exp', label: '即將到期原料', icon: 'clock', c: 'var(--coral)' },
  { k: 'low', label: '低於安全庫存', icon: 'alert', c: 'var(--amber)' },
  { k: 'loss', label: '本週損耗率', icon: 'percent', c: 'var(--violet)' },
];

export default {
  mount(section) {
    root = section;
    lots = buildLots(store.now);
    waste = wasteLog(store.now);
    section.innerHTML = `
    <div class="ivp">
      <div class="ivp-head glass anim-in">
        <div class="ivp-head-l">
          <span class="ivp-five">產</span>
          <div><b>生產管理</b><p>AI 依近 14 天銷量算好今天要做什麼、要叫什麼貨；原料先進先出、效期倒數，盤點差異自動入帳。</p></div>
        </div>
        <div class="ivp-head-r"><span class="demo-badge">${icon('flask', 14)} 示範資料</span><span class="chip-sm">${icon('link', 13)} 與會計「產」自動連動</span></div>
      </div>

      <div class="ivp-kpis">
        ${KPI.map(k => `<div class="kpi glass anim-in" data-k="${k.k}" style="--c:${k.c}">
          <div class="kpi-top"><span class="kpi-ic">${icon(k.icon, 18)}</span><span class="kpi-label">${k.label}</span><span class="kpi-delta" data-delta></span></div>
          <div class="kpi-val" data-val>0</div><div class="kpi-foot"><small data-sub></small></div></div>`).join('')}
      </div>

      <div class="ivp-row ivp-row1">
        <div class="glass card ivp-shelf anim-in">
          <div class="card-h"><h3>${icon('cpu', 18)} 3D 智慧倉儲</h3><span class="chip-sm">方塊高度＝成品庫存・紅光＝低於安全庫存</span></div>
          <div class="ivp-stage" id="ivpStage"><div class="ivp-labels" id="ivpLabels"></div><div class="ivp-hint">${icon('refresh', 13)} 拖曳旋轉・點方塊看配方</div></div>
          <div class="ivp-shelf-foot" id="ivpShelfFoot"></div>
        </div>
        <div class="glass card ivp-replen anim-in">
          <div class="card-h"><h3>${icon('sparkle', 18)} AI 補貨建議</h3><span class="chip-sm">近 14 天銷量 × 安全庫存 × 前置天數</span></div>
          <div class="tbl-wrap ivp-tw"><table class="tbl ivp-plan"><thead><tr><th>商品</th><th class="r c-opt">預估日銷</th><th class="r">庫存／安全</th><th class="r c-opt">可售天數</th><th class="r c-opt">前置</th><th class="r">${IVL.suggest || 'AI 建議生產'}</th></tr></thead><tbody id="ivpPlan"></tbody></table></div>
          <div class="ivp-need" id="ivpNeed"></div>
        </div>
      </div>

      <div class="glass card ivp-bom anim-in">
        <div class="card-h ivp-bom-h"><h3>${icon('book', 18)} 配方 BOM 與成本結構</h3><div class="ivp-pills" id="ivpPills">${PRODUCTS.map(p => `<button class="ivp-pill" data-pid="${p.id}">${productArt(p.id, 28)}<span>${p.name}</span></button>`).join('')}</div></div>
        <div class="ivp-bom-grid">
          <div class="ivp-bom-l" id="ivpBomTbl"></div>
          <div class="ivp-bom-m"><div class="ivp-sub-h">成本結構（單位：NT$／${'個'}）</div><div class="chart" id="ivpSun"></div></div>
          <div class="ivp-bom-r"><div class="ivp-sub-h">各商品成本組成比較・點長條切換</div><div class="chart" id="ivpStack"></div></div>
        </div>
      </div>

      <div class="ivp-row ivp-row3">
        <div class="glass card ivp-mat anim-in">
          <div class="card-h"><h3>${icon('snow', 18)} 原料庫存與效期</h3>
            <div class="ivp-seg" id="ivpMatSeg"><button class="on" data-f="all">全部批號</button><button data-f="exp">即將到期</button><button data-f="low">低於安全</button></div></div>
          <div class="tbl-wrap ivp-tw ivp-mat-tw"><table class="tbl ivp-mtbl"><thead><tr><th>原料／包材</th><th>批號</th><th>供應商</th><th>入庫日</th><th>到期日</th><th>效期倒數</th><th class="r">存量</th><th>先進先出</th></tr></thead><tbody id="ivpMat"></tbody></table></div>
          <div class="ivp-mat-foot" id="ivpMatFoot"></div>
        </div>
        <div class="ivp-side3">
          <div class="glass card ivp-ai anim-in" id="ivpAi"></div>
          <div class="glass card ivp-exp anim-in"><div class="card-h"><h3>${icon('alert', 18)} 效期倒數</h3><span class="chip-sm warn">3 天內到期</span></div><div id="ivpExp" class="ivp-exp-list"></div></div>
        </div>
      </div>

      <div class="glass card ivp-gantt anim-in">
        <div class="card-h"><h3>${icon('calendar', 18)} ${IS_AMEI ? '今日生產排程' : IVL.sched}</h3><div class="ivp-gh-r"><span class="chip-sm">${icon('sparkle', 13)} AI 依預估需求自動排程</span><span class="chip-sm" id="ivpGDate"></span></div></div>
        <div class="ivp-g-grid">
          <div class="ivp-g-scroll"><div class="ivp-g" id="ivpG"></div></div>
          <div class="ivp-g-side">
            <div class="ivp-util"><div class="ivp-ring" id="ivpRing"><b id="ivpUtil">0%</b><small>${IS_AMEI ? '烤箱使用率' : IVL.util}</small></div>
              <div class="ivp-util-t" id="ivpUtilT"></div></div>
            <div class="ivp-prog"><div class="ivp-prog-h"><span>完成進度</span><b id="ivpProgT">0 / 0</b></div><div class="ivp-prog-bar"><i id="ivpProg"></i></div></div>
            <ul class="ivp-tasks" id="ivpTasks"></ul>
          </div>
        </div>
      </div>

      <div class="ivp-row ivp-row5">
        <div class="glass card ivp-take anim-in">
          <div class="card-h"><h3>${icon('file', 18)} 盤點</h3><div class="ivp-take-btns"><button class="btn btn-ghost btn-sm" id="ivpFill" hidden>${icon('wand', 15)} 帶入示範盤點結果</button><button class="btn btn-primary btn-sm" id="ivpTakeGo">${icon('check', 15)} 進入盤點模式</button></div></div>
          <div class="ivp-take-note" id="ivpTakeNote"></div>
          <div class="tbl-wrap ivp-tw"><table class="tbl ivp-ttbl"><thead><tr><th>品項</th><th>類別</th><th class="r">帳面數量</th><th class="r">實盤數量</th><th class="r">差異</th><th class="r">單位成本</th><th class="r">損耗金額</th></tr></thead><tbody id="ivpTake"></tbody></table></div>
          <div class="ivp-je" id="ivpJe"></div>
        </div>
        <div class="glass card ivp-waste anim-in">
          <div class="card-h"><h3>${icon('trend', 18)} 損耗趨勢</h3><span class="chip-sm">近 8 週・損耗金額與損耗率</span></div>
          <div class="chart" id="ivpWaste"></div>
          <div class="ivp-sub-h">最近損耗紀錄</div>
          <ul class="ivp-wlist" id="ivpWList"></ul>
        </div>
      </div>
    </div>`;
    modalEl = el('<div class="ivp-modal" hidden></div>');
    document.body.appendChild(modalEl);

    // 事件
    $$('.ivp-pill', section).forEach(b => b.addEventListener('click', () => selectProduct(b.dataset.pid)));
    $$('#ivpMatSeg button', section).forEach(b => b.addEventListener('click', () => { $$('#ivpMatSeg button', root).forEach(x => x.classList.toggle('on', x === b)); renderMaterials(b.dataset.f); }));
    $('#ivpTakeGo', section).addEventListener('click', onTakeBtn);
    $('#ivpFill', section).addEventListener('click', fillDemoTake);
    section.addEventListener('input', (e) => { if (e.target.matches('.ivp-tin')) { take.vals[e.target.dataset.k] = e.target.value; renderTakeCalc(); } });
    section.addEventListener('change', (e) => { if (e.target.matches('.ivp-tk')) toggleTask(e.target.dataset.id, e.target.checked); });
    section.addEventListener('click', (e) => {
      const bar = e.target.closest('.ivp-bar[data-id]');
      if (bar && !e.target.closest('input')) { const id = bar.dataset.id; toggleTask(id, !done.has(id)); }
      const buy = e.target.closest('[data-act="po"]'); if (buy) openPO();
      const ai = e.target.closest('[data-act="ai-roll"]'); if (ai) applyAiRoll(ai);
      const push = e.target.closest('[data-act="ai-push"]'); if (push) { gsap.fromTo(push, { scale: 0.92 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' }); pushToast(); }
    });

    renderAll(false);
    store.on('order', () => refresh(true));
    store.on('reset', () => refresh(false));
  },
  show() {
    if (!chartsReady) { initCharts(); chartsReady = true; }
    if (!shelf) shelf = createShelf($('#ivpStage', root), $('#ivpLabels', root));
    shelf.start();
    shelf.update(store.inventory());
    startTicker();
  },
  hide() {
    if (modalEl && !modalEl.hidden) { modalEl.hidden = true; modalEl.innerHTML = ''; }
    if (shelf) shelf.stop();
    stopTicker();
  },
};

function renderAll(flash) {
  const plan = computePlan();
  renderKpis(plan, flash);
  renderPlan(plan);
  renderBom();
  renderMaterials($('#ivpMatSeg button.on', root)?.dataset.f || 'all');
  renderAi();
  renderExp();
  renderGantt(plan);
  renderTake();
  renderWasteList();
  renderShelfFoot(plan);
}

function refresh(flash) {
  const plan = computePlan();
  renderKpis(plan, flash);
  renderPlan(plan, flash);
  renderGantt(plan);
  renderShelfFoot(plan);
  if (!take.mode && !take.posted) renderTake();
  if (shelf) shelf.update(plan.inv);
  if (charts) charts.waste.setOption(wasteOption());
}

/* ---------------- KPI ---------------- */
function renderKpis(plan, flash) {
  const inv = plan.inv;
  const fg = inv.reduce((s, p) => s + p.current * p.cost, 0);
  const units = inv.reduce((s, p) => s + p.current, 0);
  const raw = rawValue();
  const ex = expiring(3);
  const fLow = inv.filter(p => p.low), mLow = plan.mats.filter(m => m.low);
  const wk = weekWaste(); const cur = wk[wk.length - 1], prev = wk[wk.length - 2];
  const set = (k, v, opt, sub, delta) => {
    const card = $(`.kpi[data-k="${k}"]`, root);
    countUp($('[data-val]', card), v, opt);
    $('[data-sub]', card).textContent = sub;
    const d = $('[data-delta]', card);
    if (delta) { d.textContent = delta[0]; d.className = 'kpi-delta ' + delta[1]; } else { d.textContent = ''; d.className = 'kpi-delta'; }
    if (flash) { card.classList.remove('flash'); void card.offsetWidth; card.classList.add('flash'); }
  };
  set('fg', fg, { prefix: 'NT$ ' }, `${inv.length} 品項・共 ${units} 件（成本價）`);
  set('raw', raw, { prefix: 'NT$ ' }, `${MATERIALS.length} 項原料包材・${lots.length} 個批號`);
  set('exp', ex.length, { suffix: ' 批' }, ex.length ? ex.map(l => MAT[l.mid].name).join('、') : '3 天內無到期批號', ex.length ? ['3 天內', 'down'] : null);
  set('low', fLow.length + mLow.length, { suffix: ' 項' }, `成品 ${fLow.length}（${fLow.map(p => p.name).join('、') || '無'}）・原料 ${mLow.length}`, fLow.length + mLow.length ? ['需補貨', 'warn'] : null);
  const diff = cur.rate - prev.rate;
  set('loss', cur.rate, { suffix: '%', decimals: 1 }, `本週損耗 ${money(cur.amt)}・上週 ${prev.rate.toFixed(1)}%`, [`${diff > 0 ? '▲' : '▼'} ${Math.abs(diff).toFixed(1)}%`, diff > 0 ? 'down' : 'up']);
}

/* ---------------- AI 補貨 ---------------- */
function renderPlan(plan, flash) {
  const tb = $('#ivpPlan', root);
  tb.innerHTML = plan.rows.map(r => {
    const pct = Math.min(100, r.current / Math.max(r.safety * 2, 1) * 100);
    const act = r.status === 'make'
      ? `<b class="ivp-make">+${r.make}</b><small>${r.make !== r.suggest ? `需 ${r.suggest}・${override[r.id] != null ? 'AI 加做' : BATCHW}` : BATCHW}</small>`
      : r.status === 'over' ? `<span class="ivp-tag over">暫停生產</span><small>可售 ${r.days.toFixed(1)} 天 > ${shelfTxt(r.shelf)}</small>` : '<span class="ivp-tag ok">庫存足夠</span>';
    return `<tr class="${r.low ? 'is-low' : ''}" data-pid="${r.id}">
      <td><span class="ivp-pn">${productArt(r.id, 30)}<span><b>${r.name}</b><small>${r.unit}・${shelfTxt(r.shelf)}</small></span></span></td>
      <td class="r c-opt">${r.fc.toFixed(1)}<small class="ivp-tr ${r.trend >= 1 ? 'up' : 'down'}">${r.trend >= 1 ? '▲' : '▼'}${Math.abs((r.trend - 1) * 100).toFixed(0)}%</small></td>
      <td class="r"><span class="ivp-stk ${r.low ? 'low' : ''}">${r.current}<em>／${r.safety}</em></span><span class="ivp-mini"><i style="width:${pct}%"></i><u style="left:50%"></u></span></td>
      <td class="r c-opt ${r.days < r.lead + 1 ? 'ivp-red' : ''}">${r.days >= 99 ? '—' : r.days.toFixed(1) + ' 天'}</td>
      <td class="r c-opt">${r.lead} 天</td>
      <td class="r ivp-act">${act}</td></tr>`;
  }).join('');
  const buys = plan.mats.filter(m => m.qty > 0);
  const total = buys.reduce((s, m) => s + m.amt, 0);
  const vendors = new Set(buys.map(m => m.vendor));
  const makeN = plan.rows.filter(r => r.make > 0);
  $('#ivpNeed', root).innerHTML = `
    <div class="ivp-need-t"><span>${icon('factory', 16)} 今日排產 <b>${makeN.length}</b> 品項・共 <b>${makeN.reduce((s, r) => s + r.make, 0)}</b> 份</span>
      <span>${icon('cart', 16)} 需採購原料 <b>${buys.length}</b> 項・<b>${vendors.size}</b> 家供應商・未稅 <b>${money(total)}</b></span></div>
    <div class="ivp-need-chips">${buys.map(m => `<span class="ivp-nc" title="${esc(m.vendor)}"><i style="background:${(SUPPLIERS[m.vendor] || {}).color || '#888'}"></i>${m.name} ${fmtQ(m.qty, 2)} ${m.unit}</span>`).join('')}</div>
    <button class="btn btn-primary ivp-po-btn" data-act="po">${icon('wand', 17)} 一鍵產生採購單</button>`;
  if (flash) gsap.fromTo($$('#ivpPlan tr', root), { backgroundColor: 'rgba(45,182,116,0.18)' }, { backgroundColor: 'rgba(45,182,116,0)', duration: 1.4, stagger: 0.04, clearProps: 'backgroundColor' });
}

/* ---------------- 採購單 ---------------- */
function openPO() {
  const plan = computePlan();
  const buys = plan.mats.filter(m => m.qty > 0);
  const today = startOfDay(new Date());
  const groups = {};
  for (const m of buys) (groups[m.vendor] = groups[m.vendor] || []).push(m);
  const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const vend = Object.keys(groups);
  const grand = buys.reduce((s, m) => s + m.amt, 0);
  const modal = modalEl;
  modal.innerHTML = `
  <div class="ivp-po glass">
    <div class="ivp-po-h">
      <div><span class="demo-badge">${icon('flask', 13)} 示範：不會真的送出</span><h3>AI 採購單預覽</h3><p>依今日排產與未來 ${'前置天數＋2'} 天預估用量自動計算，已扣除現有庫存並以供應商包裝量進位。</p></div>
      <button class="icon-btn" data-close aria-label="關閉">${icon('x', 18)}</button>
    </div>
    <div class="ivp-po-body">
      ${vend.map((v, i) => { const s = SUPPLIERS[v]; const list = groups[v]; const sub = list.reduce((a, m) => a + m.amt, 0); const eta = addDays(today, s.lead);
        return `<div class="ivp-po-card" data-v="${i}" style="--vc:${s.color}">
          <div class="ivp-po-ch"><div><b>${esc(v)}</b><small>採購單號 PO-${ymd}-${String(i + 1).padStart(2, '0')}・LINE ${s.line}</small></div>
            <div class="ivp-po-eta">${icon('truck', 15)} 預計到貨 <b>${dayLabel(eta)}</b> 上午</div><span class="ivp-po-st" data-st>待傳送</span></div>
          <table class="ivp-po-t"><thead><tr><th>品項</th><th class="r">數量</th><th class="r">單價</th><th class="r">金額</th></tr></thead><tbody>
          ${list.map(m => `<tr><td>${m.name}<small>${m.packs} × ${fmtQ(m.pack, 2)} ${m.unit}</small></td><td class="r">${fmtQ(m.qty, 2)} ${m.unit}</td><td class="r">${m.cost.toLocaleString()}</td><td class="r">${m.amt.toLocaleString()}</td></tr>`).join('')}
          </tbody><tfoot><tr><td colspan="3">小計（未稅）＋ 5% 營業稅</td><td class="r">${money(Math.round(sub * 1.05))}</td></tr></tfoot></table>
          <div class="ivp-plane">${icon('send', 16)}</div>
        </div>`; }).join('')}
    </div>
    <div class="ivp-po-f">
      <div class="ivp-po-sum"><small>${vend.length} 家供應商・${buys.length} 項</small><b>${money(Math.round(grand * 1.05))}</b><span>含稅合計（未稅 ${money(grand)}）・到貨驗收後自動記入進貨與應付帳款</span></div>
      <div class="ivp-po-act"><button class="btn btn-primary ivp-line-btn" id="ivpSend">${chIcon('line', 20)} 用 LINE 傳給供應商</button><button class="btn btn-ghost" data-close>稍後再說</button></div>
    </div>
  </div>`;
  modal.hidden = false;
  if (shelf) shelf.stop();
  gsap.fromTo(modal, { opacity: 0 }, { opacity: 1, duration: 0.3 });
  gsap.fromTo($('.ivp-po', modal), { y: 40, scale: 0.96, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.5, ease: 'power3.out' });
  gsap.fromTo($$('.ivp-po-card', modal), { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.07, delay: 0.15, ease: 'power3.out' });
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  const close = () => { document.removeEventListener('keydown', onKey); gsap.to(modal, { opacity: 0, duration: 0.25, onComplete: () => { modal.hidden = true; modal.innerHTML = ''; if (shelf && !root.hidden) shelf.start(); } }); };
  $$('[data-close]', modal).forEach(b => b.addEventListener('click', close));
  modal.onclick = (e) => { if (e.target === modal) close(); };
  $('#ivpSend', modal).addEventListener('click', async (e) => {
    const btn = e.currentTarget; btn.disabled = true; btn.innerHTML = `<span class="ivp-spin"></span> 傳送中…`;
    const cards = $$('.ivp-po-card', modal);
    for (const c of cards) {
      const st = $('[data-st]', c); st.textContent = '傳送中…'; st.className = 'ivp-po-st sending';
      c.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      const plane = $('.ivp-plane', c);
      gsap.fromTo(plane, { x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }, { x: 260, y: -60, opacity: 0, scale: 0.6, rotate: -18, duration: 0.7, ease: 'power2.in' });
      await sleep(650);
      st.innerHTML = `${icon('check', 13)} 已送達`; st.className = 'ivp-po-st sent';
      c.classList.add('sent');
      gsap.fromTo(c, { boxShadow: '0 0 0 2px rgba(45,182,116,0.9), 0 0 30px rgba(45,182,116,0.5)' }, { boxShadow: '0 0 0 1px rgba(45,182,116,0.35), 0 0 0 rgba(0,0,0,0)', duration: 1 });
      await sleep(180);
    }
    await sleep(500);
    cards.forEach((c, i) => setTimeout(() => { const st = $('[data-st]', c); st.innerHTML = `${icon('check', 13)} 已讀・已確認`; st.className = 'ivp-po-st read'; }, i * 260));
    btn.innerHTML = `${icon('check', 18)} 已傳送 ${cards.length} 家供應商`; btn.classList.add('done');
    toast(`採購單已用 LINE 傳送｜${cards.length} 家供應商`, `含稅 ${money(Math.round(grand * 1.05))}・到貨驗收後自動入帳「進貨」與「應付帳款」（示範）`, { icon: chIcon('line', 18) });
    store.log('purchase', `AI 產生採購單並以 LINE 傳給 ${vend.map(v => SUPPLIERS[v].short).join('、')}，合計 ${money(Math.round(grand * 1.05))}`);
  });
}

/* ---------------- BOM ---------------- */
function selectProduct(pid) {
  selPid = pid;
  renderBom();
  if (charts) { charts.sun.setOption(sunOption(), true); charts.stack.setOption(stackOption()); }
}

function renderBom() {
  $$('.ivp-pill', root).forEach(b => b.classList.toggle('on', b.dataset.pid === selPid));
  const p = PRODUCT_MAP[selPid], b = bom(selPid);
  const lp = p.listPrice ?? p.price; // 標準售價（不含檔期特價）
  const margin = (lp / 1.05 - b.total) / (lp / 1.05) * 100;
  const diff = b.total - b.ref;
  $('#ivpBomTbl', root).innerHTML = `
    <div class="ivp-bom-hero">${productArt(selPid, 64)}<div><b>${p.name}</b><small>${p.unit}・售價 ${money(lp)}・${b.note}</small></div></div>
    <div class="tbl-wrap ivp-tw"><table class="tbl ivp-btbl"><thead><tr><th>原料／包材</th><th class="r">用量</th><th class="r c-opt">單價</th><th class="r">成本小計</th></tr></thead><tbody>
      ${b.rows.map(r => `<tr><td><i class="ivp-dot" style="background:${r.cat === 'pack' ? CAT_COLOR.包材 : CAT_COLOR.原料}"></i>${r.name}</td><td class="r">${fmtQ(r.qty, 3)} ${r.unit}</td><td class="r c-opt">${r.price.toLocaleString()}／${r.unit}</td><td class="r">${r.sub.toFixed(1)}</td></tr>`).join('')}
      <tr class="ivp-sub"><td><i class="ivp-dot" style="background:${CAT_COLOR.人工}"></i>人工（${b.laborMin} 分鐘 × ${LABOR_RATE}）</td><td class="r"></td><td class="r c-opt"></td><td class="r">${b.labor.toFixed(1)}</td></tr>
      <tr class="ivp-sub"><td><i class="ivp-dot" style="background:${CAT_COLOR.製造費用}"></i>${IS_AMEI ? `製造費用（烤箱 ${b.oven} 分・冷藏・折舊）` : `製造費用（${IVL.equip} ${b.oven} 分・${IVL.mfgShort}）`}</td><td class="r"></td><td class="r c-opt"></td><td class="r">${b.mfg.toFixed(1)}</td></tr>
    </tbody></table></div>
    <div class="ivp-bom-tot">
      <div><small>BOM 成本合計</small><b>${money(b.total)}</b></div>
      <div><small>帳列標準成本</small><b>${money(b.ref)}</b><em class="${Math.abs(diff) < 3 ? 'ok' : 'warn'}">${Math.abs(diff) < 3 ? '✓ 一致' : '差 ' + diff.toFixed(1)}</em></div>
      <div><small>毛利率（未稅）</small><b class="ivp-gm">${margin.toFixed(1)}%</b></div>
    </div>`;
  gsap.fromTo($$('#ivpBomTbl tbody tr', root), { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.35, stagger: 0.03 });
}

function sunOption() {
  const b = bom(selPid);
  const shade = (hex, i) => { const n = parseInt(hex.slice(1), 16); const k = 1 - i * 0.12; const r = (n >> 16) & 255, g = (n >> 8) & 255, bl = n & 255; return `rgb(${Math.round(r * k + 255 * (1 - k) * 0.15)},${Math.round(g * k + 255 * (1 - k) * 0.15)},${Math.round(bl * k + 255 * (1 - k) * 0.15)})`; };
  const raws = b.rows.filter(r => r.cat === 'raw').sort((a, c) => c.sub - a.sub);
  const packs = b.rows.filter(r => r.cat === 'pack');
  const data = [
    { name: '原料', itemStyle: { color: CAT_COLOR.原料 }, children: raws.map((r, i) => ({ name: r.name, value: +r.sub.toFixed(1), itemStyle: { color: shade(CAT_COLOR.原料, i) } })) },
    { name: '包材', itemStyle: { color: CAT_COLOR.包材 }, children: packs.map(r => ({ name: r.name, value: +r.sub.toFixed(1), itemStyle: { color: '#5fb4e6' } })) },
    { name: '人工', itemStyle: { color: CAT_COLOR.人工 }, children: [{ name: `人工 ${b.laborMin} 分`, value: +b.labor.toFixed(1), itemStyle: { color: '#f5bd5f' } }] },
    { name: '製造費用', itemStyle: { color: CAT_COLOR.製造費用 }, children: [{ name: IS_AMEI ? '烤箱・冷藏・折舊' : IVL.mfgShort, value: b.mfg, itemStyle: { color: '#9c88ee' } }] },
  ];
  return {
    animationDuration: 900,
    tooltip: { formatter: (p) => `${p.marker}${p.name}<br/><b>NT$ ${Number(p.value).toFixed(1)}</b>（${(p.value / b.total * 100).toFixed(1)}%）` },
    title: { text: Math.round(b.total).toString(), subtext: 'NT$／' + PRODUCT_MAP[selPid].unit, left: 'center', top: 'center', textStyle: { color: '#eafff4', fontSize: 22, fontWeight: 800 }, subtextStyle: { color: 'rgba(214,240,226,0.6)', fontSize: 11 }, itemGap: 2 },
    series: [{
      type: 'sunburst', data, radius: ['26%', '94%'], sort: null, nodeClick: false,
      itemStyle: { borderColor: 'rgba(6,26,19,0.9)', borderWidth: 2, borderRadius: 4 },
      levels: [{}, { r0: '26%', r: '52%', label: { rotate: 0, fontSize: 11, color: '#04130d', fontWeight: 700, minAngle: 18 } }, { r0: '54%', r: '94%', label: { fontSize: 10, color: '#eafff4', minAngle: 14, rotate: 'radial', overflow: 'truncate', width: 60 } }],
      emphasis: { focus: 'ancestor' },
    }],
  };
}

function stackOption() {
  const list = PRODUCTS.map(p => ({ p, b: bom(p.id) }));
  const cats = [['原料', x => x.raw], ['包材', x => x.pack], ['人工', x => x.labor], ['製造費用', x => x.mfg]];
  return {
    animationDuration: 900,
    grid: { left: 4, right: 40, top: 30, bottom: 2, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 10, icon: 'roundRect', textStyle: { fontSize: 11 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: v => 'NT$ ' + Number(v).toFixed(1) },
    xAxis: { type: 'value', axisLabel: { fontSize: 10 } },
    yAxis: { type: 'category', data: list.map(x => x.p.name), inverse: true, axisLabel: { color: '#d6f0e2', fontSize: 11 } },
    series: cats.map(([name, f], ci) => ({
      name, type: 'bar', stack: 'c', barWidth: '58%',
      data: list.map(x => ({ value: +f(x.b).toFixed(1), itemStyle: { color: CAT_COLOR[name], opacity: x.p.id === selPid ? 1 : 0.38, borderRadius: ci === 3 ? [0, 6, 6, 0] : 0 } })),
      label: ci === 3 ? { show: true, position: 'right', color: '#eafff4', fontSize: 10, formatter: (pp) => Math.round(list[pp.dataIndex].b.total) } : undefined,
    })),
  };
}

/* ---------------- 原料效期 ---------------- */
function cd(exp) {
  const ms = +exp - Date.now();
  if (ms <= 0) return { txt: '已到期', cls: 'dead' };
  const d = Math.floor(ms / DAY), h = Math.floor(ms % DAY / 3600e3), m = Math.floor(ms % 3600e3 / 60e3), s = Math.floor(ms % 60e3 / 1e3);
  if (ms <= 3 * DAY) return { txt: `${d} 天 ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`, cls: 'red' };
  if (ms <= 7 * DAY) return { txt: `剩 ${d} 天`, cls: 'amber' };
  return { txt: `剩 ${d} 天`, cls: 'ok' };
}

function renderMaterials(filter = 'all') {
  const plan = lastPlan || computePlan();
  const mm = Object.fromEntries(plan.mats.map(m => [m.id, m]));
  const lim = Date.now() + 3 * DAY;
  let rows = [];
  for (const m of MATERIALS) {
    const ls = lots.filter(l => l.mid === m.id).sort((a, b) => a.inDate - b.inDate);
    if (filter === 'low' && !mm[m.id].low) continue;
    ls.forEach((l, i) => {
      if (filter === 'exp' && +l.exp > lim) return;
      rows.push({ m, l, first: i === 0 || filter === 'exp', fifo: ls.length > 1 ? (i === 0 ? 'first' : 'later') : 'single', low: mm[m.id].low, total: mm[m.id].onHand });
    });
  }
  $('#ivpMat', root).innerHTML = rows.length ? rows.map(({ m, l, first, fifo, low, total }) => {
    const c = cd(l.exp);
    return `<tr class="${c.cls === 'red' ? 'ivp-exp-row' : ''}">
      <td>${first ? `<b class="ivp-mn">${m.name}</b>${low ? '<span class="ivp-tag low">低於安全</span>' : ''}<small class="ivp-mt">合計 ${fmtQ(total, 2)} ${m.unit}・安全 ${fmtQ(m.safety, 2)}・${m.store}</small>` : '<span class="ivp-sublot">↳ 同品項</span>'}</td>
      <td class="mono">${l.batch}</td><td class="ivp-vd"><i style="background:${(SUPPLIERS[m.vendor] || {}).color || '#888'}"></i>${m.vendor}</td>
      <td>${fmtMD(l.inDate)}</td><td>${fmtMD(l.exp)}</td>
      <td><span class="ivp-cd ${c.cls}" data-exp="${+l.exp}">${c.txt}</span></td>
      <td class="r"><b>${fmtQ(l.qty, 2)}</b> ${m.unit}</td>
      <td>${fifo === 'first' ? '<span class="ivp-fifo">① 先用此批</span>' : fifo === 'later' ? '<span class="ivp-fifo later">② 後用</span>' : '<span class="ivp-fifo single">單一批號</span>'}</td></tr>`;
  }).join('') : '<tr><td colspan="8" class="ivp-empty">沒有符合條件的批號</td></tr>';
  const fifoN = MATERIALS.filter(m => lots.filter(l => l.mid === m.id).length > 1).length;
  $('#ivpMatFoot', root).innerHTML = `<span>${icon('alert', 14)} FIFO：${fifoN} 項原料有多個批號，領料時系統自動扣最舊批號；冷藏品依效期優先（FEFO）。</span><span>原料庫存價值 <b>${money(rawValue())}</b></span>`;
}

function renderExp() {
  const list = lots.filter(l => +l.exp <= Date.now() + 7 * DAY).sort((a, b) => a.exp - b.exp);
  $('#ivpExp', root).innerHTML = list.map(l => {
    const m = MAT[l.mid], c = cd(l.exp);
    const use = IS_AMEI ? ({ cream: '草莓生乳捲・巴斯克', strawberry: '草莓生乳捲', milk: '伯爵可麗露', egg: '全品項' }[l.mid] || '—')
      : (PRODUCTS.filter(p => (RECIPES[p.id]?.lines || []).some(x => x[0] === l.mid)).map(p => SHORT[p.id]).join('・') || '—');
    return `<div class="ivp-ex ${c.cls}"><div class="ivp-ex-l"><b>${m.name}</b><small class="mono">${l.batch}・${fmtQ(l.qty, 2)} ${m.unit}・${money(l.qty * m.cost)}</small><small>建議用於：${use}</small></div>
      <div class="ivp-ex-r"><span class="ivp-cd ${c.cls}" data-exp="${+l.exp}">${c.txt}</span><small>${fmtMD(l.exp)} 23:59 到期</small></div></div>`;
  }).join('');
}

// 其他業主：用即將到期的原料加做商品（IVX.ai 由 inventory-data 依業態產生）
function aiInfo() {
  const A = IVX.ai; if (!A) return null;
  const P = PRODUCT_MAP[A.pid]; const b = bom(A.pid);
  const ms = A.mats.map(mid => ({ m: MAT[mid], lot: lots.filter(l => l.mid === mid).sort((a, c) => a.exp - c.exp)[0], q: b.rows.find(r => r.mid === mid)?.qty || 1 })).filter(x => x.m && x.lot);
  if (!ms.length) return null;
  const n = Math.max(1, Math.min(...ms.map(x => Math.floor(x.lot.qty / x.q + 1e-6))));
  const save = Math.round(ms.reduce((s2, x) => s2 + x.lot.qty * x.m.cost, 0));
  return { P, ms, n, save, rev: n * P.price, unit: KIT.unitWord(P) };
}
function renderAi() {
  if (IS_AMEI) return renderAiAmei();
  const a = aiInfo();
  if (!a) {
    $('#ivpAi', root).innerHTML = `<div class="ivp-ai-glow"></div><div class="ivp-ai-h"><span class="ivp-ai-ic">${icon('sparkle', 18)}</span><div><small>AI 建議・減少報廢</small><b>近 3 天沒有即將到期的原料</b></div></div>
      <div class="ivp-ai-body"><p>原料批號都在效期內，AI 會持續依先進先出（FIFO）提醒領料順序。</p></div>`;
    return;
  }
  const cur = (lastPlan || computePlan()).rows.find(r => r.id === a.P.id)?.make || 0;
  const applied = override[a.P.id] != null;
  const rel = (d) => { const n = Math.round((startOfDay(d) - startOfDay(new Date())) / DAY); return n <= 0 ? '今天到期' : n === 1 ? '明天到期' : n === 2 ? '後天到期' : `${n} 天後到期`; };
  const names = a.ms.map(x => x.m.name).join('、');
  $('#ivpAi', root).innerHTML = `
    <div class="ivp-ai-glow"></div>
    <div class="ivp-ai-h"><span class="ivp-ai-ic">${icon('sparkle', 18)}</span><div><small>AI 建議・減少報廢</small><b>用即將到期的${esc(names)}加做${esc(a.P.name)}</b></div></div>
    <div class="ivp-ai-body">
      <div class="ivp-ai-flow">
        ${a.ms.map(x => `<div><span>${esc(x.m.name)}</span><b>${fmtQ(x.lot.qty, 2)} ${x.m.unit}</b><small class="ivp-red">${rel(x.lot.exp)}</small></div>`).join('<i>＋</i>')}<i>→</i>
        <div class="hl">${productArt(a.P.id, 40)}<b>${a.n} ${esc(a.unit)}</b><small>${esc(SHORT[a.P.id])}</small></div>
      </div>
      <p>批號 ${a.ms.map(x => `<span class="mono">${x.lot.batch}</span>`).join(' 與 ')} 依 FIFO 優先領用，${applied ? `今日排產已改為 <b>${cur} ${esc(a.unit)}</b>` : `今日排產由 <b>${cur} ${esc(a.unit)}</b>加做到 <b>${a.n} ${esc(a.unit)}</b>`}，最多可避免 <b>${money(a.save)}</b> 原料報廢，多出的量搭配 LINE「${KIT.cat === 'service' ? '平日優惠' : '今日限定'}」推播消化（${a.n} ${esc(a.unit)}預估營收 ${money(a.rev)}）。</p>
    </div>
    <div class="ivp-ai-act">${applied ? `<span class="ivp-ai-done">${icon('check', 16)} 已加入今日排程（${a.n} ${esc(a.unit)}）</span>` : `<button class="btn btn-primary btn-sm" data-act="ai-roll">${icon('plus', 15)} 加入今日排程</button>`}<button class="btn btn-ghost btn-sm" data-act="ai-push">${chIcon('line', 16)} 推播${KIT.cat === 'service' ? '平日優惠' : '今日限定'}</button></div>`;
}
function applyAiRoll(btn) {
  if (IS_AMEI) return applyAiRollAmei(btn);
  const a = aiInfo(); if (!a) return;
  override[a.P.id] = Math.max(a.n, (lastPlan?.rows.find(r => r.id === a.P.id)?.auto) || 0);
  gsap.fromTo(btn, { scale: 0.9 }, { scale: 1, duration: 0.3 });
  const plan = computePlan();
  renderPlan(plan, true); renderGantt(plan); renderAi();
  toast(`已加入${IVL.sched}`, `${a.P.name}改為 ${override[a.P.id]} ${a.unit}，優先使用 ${a.ms.map(x => x.lot.batch).join('、')}；採購建議已重新計算`, { icon: icon('calendar', 18) });
  gsap.fromTo($$(`.ivp-bar[data-pid="${a.P.id}"]`, root), { boxShadow: '0 0 0 2px #fff, 0 0 30px ' + a.P.color }, { boxShadow: '0 0 0 0 rgba(0,0,0,0)', duration: 1.6, delay: 0.1 });
}
function pushToast() {
  if (IS_AMEI) return toast('已排程 LINE 推播｜今日限定', '「草莓生乳捲 今日現做」推播給 LINE 會員（近 60 天買過生乳捲者優先）', { icon: chIcon('line', 18) });
  const a = aiInfo(); const P = a ? a.P : PRODUCTS[0];
  const tag = KIT.cat === 'service' ? '平日優惠' : '今日限定';
  toast(`已排程 LINE 推播｜${tag}`, `「${P.name} ${tag}」推播給 LINE 會員（近 60 天${KIT.cat === 'service' ? '預約過' : '買過'}者優先）`, { icon: chIcon('line', 18) });
}

function aiRollInfoAmei() {
  const cream = lots.filter(l => l.mid === 'cream').sort((a, b) => a.exp - b.exp)[0];
  const straw = lots.filter(l => l.mid === 'strawberry').sort((a, b) => a.exp - b.exp)[0];
  const b = bom('roll');
  const cq = b.rows.find(r => r.mid === 'cream').qty, sq = b.rows.find(r => r.mid === 'strawberry').qty;
  const n = Math.min(Math.floor(cream.qty / cq + 1e-6), Math.floor(straw.qty / sq + 1e-6));
  const save = Math.round(cream.qty * MAT.cream.cost + straw.qty * MAT.strawberry.cost);
  return { cream, straw, n, save, rev: n * PRODUCT_MAP.roll.price };
}

function renderAiAmei() {
  const a = aiRollInfoAmei();
  const cur = (lastPlan || computePlan()).rows.find(r => r.id === 'roll').make;
  const applied = override.roll != null;
  const rel = (d) => { const n = Math.round((startOfDay(d) - startOfDay(new Date())) / DAY); return n <= 0 ? '今天到期' : n === 1 ? '明天到期' : n === 2 ? '後天到期' : `${n} 天後到期`; };
  $('#ivpAi', root).innerHTML = `
    <div class="ivp-ai-glow"></div>
    <div class="ivp-ai-h"><span class="ivp-ai-ic">${icon('sparkle', 18)}</span><div><small>AI 建議・減少報廢</small><b>用即將到期的鮮奶油做草莓生乳捲</b></div></div>
    <div class="ivp-ai-body">
      <div class="ivp-ai-flow">
        <div><span>鮮奶油</span><b>${fmtQ(a.cream.qty)} L</b><small class="ivp-red">${rel(a.cream.exp)}</small></div><i>＋</i>
        <div><span>草莓</span><b>${fmtQ(a.straw.qty)} kg</b><small class="ivp-red">${rel(a.straw.exp)}</small></div><i>→</i>
        <div class="hl">${productArt('roll', 40)}<b>${a.n} 條</b><small>草莓生乳捲</small></div>
      </div>
      <p>批號 <span class="mono">${a.cream.batch}</span> 與 <span class="mono">${a.straw.batch}</span> 依 FIFO 優先領用，${applied ? `今日排產已改為 <b>${cur} 條</b>` : `今日排產由 <b>${cur} 條</b>加做到 <b>${a.n} 條</b>`}，最多可避免 <b>${money(a.save)}</b> 原料報廢，多出的量搭配 LINE「今日限定」推播消化（${a.n} 條預估營收 ${money(a.rev)}）。</p>
    </div>
    <div class="ivp-ai-act">${applied ? `<span class="ivp-ai-done">${icon('check', 16)} 已加入今日排程（${a.n} 條）</span>` : `<button class="btn btn-primary btn-sm" data-act="ai-roll">${icon('plus', 15)} 加入今日排程</button>`}<button class="btn btn-ghost btn-sm" data-act="ai-push">${chIcon('line', 16)} 推播今日限定</button></div>`;
}

function applyAiRollAmei(btn) {
  const a = aiRollInfoAmei();
  override.roll = Math.max(a.n, (lastPlan?.rows.find(r => r.id === 'roll')?.auto) || 0);
  gsap.fromTo(btn, { scale: 0.9 }, { scale: 1, duration: 0.3 });
  const plan = computePlan();
  renderPlan(plan, true); renderGantt(plan); renderAi();
  toast('已加入今日生產排程', `草莓生乳捲改為 ${override.roll} 條，優先使用 ${a.cream.batch}、${a.straw.batch}；採購建議已重新計算`, { icon: icon('calendar', 18) });
  gsap.fromTo($$('.ivp-bar[data-pid="roll"]', root), { boxShadow: '0 0 0 2px #fff, 0 0 30px #F7B2C4' }, { boxShadow: '0 0 0 0 rgba(0,0,0,0)', duration: 1.6, delay: 0.1 });
}

/* ---------------- 生產排程（CSS 甘特圖） ---------------- */
function renderGantt(plan) {
  const sc = buildSchedule(plan.rows);
  lastPlan.sc = sc;
  const span = sc.end - sc.start;
  const x = (m) => ((m - sc.start) / span * 100).toFixed(3) + '%';
  const rows = [];
  for (const r of RESOURCES) {
    if (r.kind === 'fridge') for (let i = 0; i < sc.lanes; i++) rows.push({ id: 'fridge', lane: i, name: `${r.name} ${i + 1}`, kind: r.kind });
    else rows.push({ id: r.id, lane: 0, name: r.name, kind: r.kind });
  }
  const hours = []; for (let m = sc.start; m <= sc.end; m += 60) hours.push(m);
  const now = new Date(); const nm = now.getHours() * 60 + now.getMinutes();
  const today = new Date();
  $('#ivpGDate', root).textContent = `${dayLabel(today)}・${hm(sc.start)}–${hm(sc.end)}`;
  $('#ivpG', root).innerHTML = `
    <div class="ivp-g-head"><div class="ivp-g-name"></div><div class="ivp-g-track">${hours.map(m => `<span style="left:${x(m)}">${hm(m)}</span>`).join('')}</div></div>
    ${rows.map(r => `<div class="ivp-g-row k-${r.kind}"><div class="ivp-g-name">${icon(r.kind === 'oven' ? 'factory' : r.kind === 'fridge' ? 'snow' : r.kind === 'pack' ? 'box' : 'user', 14)}<span>${r.name}</span></div>
      <div class="ivp-g-track">${hours.map(m => `<i class="ivp-g-tick" style="left:${x(m)}"></i>`).join('')}
        ${r.kind === 'oven' ? `<b class="ivp-g-win" style="left:${x(OVEN_WINDOW[0])};width:${((OVEN_WINDOW[1] - OVEN_WINDOW[0]) / span * 100).toFixed(2)}%"></b>` : ''}
        ${r.kind === 'pack' && PACK_START > sc.start ? `<b class="ivp-g-off" style="left:0;width:${((PACK_START - sc.start) / span * 100).toFixed(2)}%"><span>${hm(PACK_START)} 上班</span></b>` : ''}
        ${sc.tasks.filter(t => t.res === r.id && t.lane === r.lane).map(t => {
          const p = PRODUCT_MAP[t.pid];
          const label = `${p.name}・${t.name}${t.qty ? ` ×${t.qty}` : ''}`;
          const txt = t.d >= 90 ? `${SHORT[t.pid]}・${t.name}${t.qty ? ` ×${t.qty}` : ''}` : t.d >= 28 ? SHORT[t.pid] : SHORT[t.pid].slice(0, 1);
          return `<div class="ivp-bar ${done.has(t.id) ? 'done' : ''} ${t.open ? 'open' : ''} ${t.d < 45 ? 'tiny' : ''}" data-id="${t.id}" data-pid="${t.pid}" style="left:${x(t.s)};width:${(t.d / span * 100).toFixed(3)}%;--pc:${p.color};--pa:${p.accent}" title="${esc(label)}｜${hm(t.s)}–${hm(t.s + t.d)}">
            <span class="ivp-bar-ck">${icon('check', 12)}</span><span class="ivp-bar-t">${esc(txt)}</span></div>`;
        }).join('')}
      </div></div>`).join('')}
    ${nm >= sc.start && nm <= sc.end ? `<div class="ivp-g-now" style="--x:${((nm - sc.start) / span).toFixed(4)}"><span>現在 ${hm(nm)}</span></div>` : ''}`;
  // 側欄
  const util = sc.util;
  $('#ivpRing', root).style.setProperty('--p', Math.min(100, util).toFixed(1));
  countUp($('#ivpUtil', root), util, { suffix: '%', decimals: 0, duration: 1 });
  const kwh = sc.ovenMin / 60 * 6.5;
  const RA = RESOURCES.find(x => x.id === 'ovenA')?.name || '設備 A', RB = RESOURCES.find(x => x.id === 'ovenB')?.name || '設備 B';
  $('#ivpUtilT', root).innerHTML = IS_AMEI ? `
    <div><span>旋風烤箱 A</span><b>${sc.ovenA} 分</b><em><i style="width:${(sc.ovenA / (sc.cap / 2) * 100).toFixed(0)}%"></i></em></div>
    <div><span>層爐 B</span><b>${sc.ovenB} 分</b><em><i style="width:${(sc.ovenB / (sc.cap / 2) * 100).toFixed(0)}%"></i></em></div>
    <small>可用時段 ${hm(OVEN_WINDOW[0])}–${hm(OVEN_WINDOW[1])} × 2 台・預估用電 ${kwh.toFixed(0)} 度（約 ${money(kwh * 4.2)}），已計入製造費用</small>` : `
    <div><span>${esc(RA)}</span><b>${sc.ovenA} 分</b><em><i style="width:${(sc.ovenA / (sc.cap / 2) * 100).toFixed(0)}%"></i></em></div>
    <div><span>${esc(RB)}</span><b>${sc.ovenB} 分</b><em><i style="width:${(sc.ovenB / (sc.cap / 2) * 100).toFixed(0)}%"></i></em></div>
    <small>可用時段 ${hm(OVEN_WINDOW[0])}–${hm(OVEN_WINDOW[1])} × 2 處・預估能耗約 ${money(kwh * 4.2)}，已計入製造費用</small>`;
  $('#ivpTasks', root).innerHTML = sc.tasks.map(t => {
    const p = PRODUCT_MAP[t.pid];
    return `<li class="${done.has(t.id) ? 'done' : ''}" data-id="${t.id}"><label><input type="checkbox" class="ivp-tk" data-id="${t.id}" ${done.has(t.id) ? 'checked' : ''}><span class="ivp-ck">${icon('check', 12)}</span>
      <span class="ivp-tt mono">${hm(t.s)}</span><i class="ivp-dot" style="background:${p.color}"></i><span class="ivp-tn">${p.name}・${t.name}${t.qty ? ` ×${t.qty}` : ''}</span></label></li>`;
  }).join('');
  updateProgress();
}

function toggleTask(id, on) {
  if (on) done.add(id); else done.delete(id);
  $$(`[data-id="${id}"]`, root).forEach(n => { if (n.matches('.ivp-bar, li')) n.classList.toggle('done', on); if (n.matches('input')) n.checked = on; });
  const bar = $(`.ivp-bar[data-id="${id}"]`, root);
  if (bar && on) gsap.fromTo(bar, { scale: 1.06 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
  updateProgress();
  if (on && lastPlan?.sc) {
    const t = lastPlan.sc.tasks.find(x => x.id === id);
    const all = lastPlan.sc.tasks.filter(x => x.pid === t.pid && !x.open);
    if (all.every(x => done.has(x.id))) {
      const r = lastPlan.rows.find(x => x.id === t.pid);
      toast(`生產完成｜${PRODUCT_MAP[t.pid].name}`, r.make ? `${r.make} ${PRODUCT_MAP[t.pid].unit.replace(/^[\d ]+/, '') || '份'}完工，已登錄生產紀錄並結轉「在製品 → 製成品」（示範）` : '今日製程已完成', { icon: icon('factory', 18) });
    }
  }
}

function updateProgress() {
  const tasks = lastPlan?.sc?.tasks || [];
  const n = tasks.filter(t => done.has(t.id)).length;
  $('#ivpProgT', root).textContent = `${n} / ${tasks.length}`;
  gsap.to($('#ivpProg', root), { width: (tasks.length ? n / tasks.length * 100 : 0) + '%', duration: 0.5 });
}

/* ---------------- 盤點 ---------------- */
const TAKE_MATS = IS_AMEI ? ['cream', 'strawberry', 'butter', 'milk', 'egg', 'cheese'] : IVX.take;
function takeRows() {
  const inv = store.inventory();
  const onHand = {}; for (const l of lots) onHand[l.mid] = (onHand[l.mid] || 0) + l.qty;
  return [
    ...inv.map(p => ({ k: p.id, name: p.name, kind: '成品', unit: '個', book: p.current, cost: p.cost, dp: 0 })),
    ...TAKE_MATS.filter(id => MAT[id]).map(id => ({ k: id, name: MAT[id].name, kind: '原料', unit: MAT[id].unit, book: +(onHand[id] || 0).toFixed(2), cost: MAT[id].cost, dp: MAT[id].dp })),
  ];
}
const DEMO_TAKE = IS_AMEI ? { lemon: -1, roll: 0, basque: -1, pound: 0, cookie: -1, pineapple: 0, canele: -2, cream: -0.3, strawberry: -0.2, butter: 0, milk: -0.2, egg: -6, cheese: 0 } : IVX.demoTake;

function renderTake() {
  const rows = takeRows();
  const ro = !take.mode || take.posted;
  $('#ivpTake', root).innerHTML = rows.map(r => `<tr data-k="${r.k}">
    <td><b>${r.name}</b></td><td><span class="ivp-kind ${r.kind === '成品' ? 'fg' : 'rm'}">${r.kind}</span></td>
    <td class="r">${fmtQ(r.book, 2)} <small>${r.unit}</small></td>
    <td class="r"><input class="ivp-tin" data-k="${r.k}" type="number" inputmode="decimal" step="${r.dp ? 0.1 : 1}" min="0" placeholder="${ro ? '—' : fmtQ(r.book, 2)}" value="${take.vals[r.k] ?? ''}" ${ro ? 'disabled' : ''}></td>
    <td class="r" data-diff>—</td><td class="r">${r.cost.toLocaleString()}</td><td class="r" data-amt>—</td></tr>`).join('');
  $('#ivpTake', root).closest('.ivp-take').classList.toggle('on', take.mode && !take.posted);
  $('#ivpFill', root).hidden = !(take.mode && !take.posted);
  const btn = $('#ivpTakeGo', root);
  btn.innerHTML = take.posted ? `${icon('refresh', 15)} 重新盤點` : take.mode ? `${icon('check', 15)} 確認盤點並過帳` : `${icon('check', 15)} 進入盤點模式`;
  $('#ivpTakeNote', root).innerHTML = take.posted
    ? `<span class="ivp-note ok">${icon('check', 14)} 本次盤點已過帳：差異已自動寫入會計「存貨盤損」（產・生產管理），並更新本週損耗率。</span>`
    : take.mode ? `<span class="ivp-note live"><i></i>盤點模式中：請輸入實際清點數量，系統即時計算差異與損耗金額。</span>`
      : `<span class="ivp-note">上次盤點 ${dayLabel(addDays(startOfDay(new Date()), -7))}・差異 ${money(640)}。按「進入盤點模式」開始清點；確認後差異會自動寫入會計「存貨盤損」。</span>`;
  renderTakeCalc();
}

function takeCalc() {
  const rows = takeRows();
  let fg = 0, rm = 0, n = 0;
  const out = rows.map(r => {
    const v = take.vals[r.k];
    if (v === undefined || v === '' || isNaN(+v)) return { r, diff: null };
    n++;
    const diff = +(+v - r.book).toFixed(2);
    const amt = Math.round(diff * r.cost);
    if (r.kind === '成品') fg += amt; else rm += amt;
    return { r, diff, amt };
  });
  return { out, fg, rm, n };
}

function renderTakeCalc() {
  const { out, fg, rm, n } = takeCalc();
  for (const { r, diff, amt } of out) {
    const tr = $(`#ivpTake tr[data-k="${r.k}"]`, root); if (!tr) continue;
    const dEl = $('[data-diff]', tr), aEl = $('[data-amt]', tr);
    if (diff === null) { dEl.textContent = '—'; aEl.textContent = '—'; dEl.className = 'r'; aEl.className = 'r'; tr.classList.remove('neg'); continue; }
    dEl.textContent = (diff > 0 ? '+' : '') + fmtQ(diff, 2); dEl.className = 'r ' + (diff < 0 ? 'ivp-red' : diff > 0 ? 'ivp-green' : '');
    aEl.textContent = amt ? (amt < 0 ? '−' : '+') + money(Math.abs(amt)) : '0'; aEl.className = 'r ' + (amt < 0 ? 'ivp-red' : amt > 0 ? 'ivp-green' : '');
    tr.classList.toggle('neg', diff < 0);
  }
  const loss = -(fg + rm);
  const je = $('#ivpJe', root);
  if (!n) { je.innerHTML = `<div class="ivp-je-empty">${icon('book', 16)} 輸入實盤數量後，這裡會即時產生會計分錄預覽（借：存貨盤損／貸：存貨）。</div>`; return; }
  const lines = loss >= 0
    ? [['借', '存貨盤損（營業成本）', loss], ...(fg < 0 ? [['貸', '存貨－製成品', -fg]] : []), ...(rm < 0 ? [['貸', '存貨－原料', -rm]] : []), ...(fg > 0 ? [['借', '存貨－製成品（盤盈抵減）', fg]] : []), ...(rm > 0 ? [['借', '存貨－原料（盤盈抵減）', rm]] : [])]
    : [['借', '存貨', -loss], ['貸', '存貨盤盈', -loss]];
  je.innerHTML = `<div class="ivp-je-l">
      <div class="ivp-je-sum"><small>已盤 ${n} 項・成品 ${money(Math.abs(fg))}・原料 ${money(Math.abs(rm))}</small><b class="${loss > 0 ? 'ivp-red' : ''}">${loss >= 0 ? '盤損' : '盤盈'} ${money(Math.abs(loss))}</b></div>
      <p>${icon('sparkle', 14)} ${take.posted ? '已' : '確認後系統會'}<b>自動寫入會計「存貨盤損」</b>（五管：產・生產管理），列入本月營業成本，並同步更新資產負債表的存貨金額與本週損耗率。</p></div>
    <div class="ivp-je-r"><div class="ivp-je-h">${icon('file', 14)} 分錄預覽・${dayLabel(new Date())}</div>
      ${lines.map(([s, a, v]) => `<div class="ivp-je-line ${s === '借' ? 'dr' : 'cr'}"><span>${s}</span><em>${a}</em><b>${money(v)}</b></div>`).join('')}</div>`;
}

function fillDemoTake() {
  const rows = takeRows();
  for (const r of rows) take.vals[r.k] = String(+(r.book + (DEMO_TAKE[r.k] || 0)).toFixed(2));
  $$('.ivp-tin', root).forEach((inp, i) => { setTimeout(() => { inp.value = take.vals[inp.dataset.k]; gsap.fromTo(inp, { backgroundColor: 'rgba(45,182,116,0.4)' }, { backgroundColor: 'rgba(255,255,255,0.05)', duration: 0.6, clearProps: 'backgroundColor' }); if (i === rows.length - 1) renderTakeCalc(); }, i * 60); });
}

function onTakeBtn() {
  if (take.posted) { take = { mode: true, posted: false, vals: {} }; renderTake(); setTimeout(() => $('.ivp-tin', root)?.focus(), 50); return; }
  if (!take.mode) {
    take.mode = true; renderTake();
    gsap.fromTo($('.ivp-take', root), { boxShadow: '0 0 0 2px rgba(240,165,49,0.9), 0 0 40px rgba(240,165,49,0.35)' }, { boxShadow: '0 1px 0 rgba(255,255,255,0.06) inset, 0 20px 50px rgba(0,0,0,0.25)', duration: 1.4, clearProps: 'boxShadow' });
    setTimeout(() => $('.ivp-tin', root)?.focus({ preventScroll: true }), 50);
    return;
  }
  const { out, fg, rm, n } = takeCalc();
  if (!n) { toast('尚未輸入實盤數量', '可先按「帶入示範盤點結果」快速體驗', { kind: 'warn', icon: icon('alert', 18) }); return; }
  const loss = -(fg + rm);
  take.posted = true;
  if (loss > 0) {
    const now = Date.now();
    for (const { r, diff, amt } of out) if (diff && diff < 0) waste.unshift({ ts: now, id: r.k, name: r.name, unit: r.unit, qty: -diff, amt: -amt, reason: '盤點差異（盤損）', kind: r.kind });
  }
  renderTake(); renderWasteList();
  if (charts) charts.waste.setOption(wasteOption());
  renderKpis(lastPlan || computePlan(), false);
  const k = $('.kpi[data-k="loss"]', root); k.classList.remove('flash'); void k.offsetWidth; k.classList.add('flash');
  toast(`盤點完成・已過帳｜${loss >= 0 ? '存貨盤損' : '存貨盤盈'} ${money(Math.abs(loss))}`, `已自動寫入會計（產・生產管理）：借 存貨盤損／貸 存貨－製成品 ${money(Math.max(0, -fg))}、存貨－原料 ${money(Math.max(0, -rm))}`, { icon: icon('book', 18) });
  store.log('stock', `完成盤點 ${n} 項，存貨盤損 ${money(Math.max(0, loss))} 已自動入帳`);
}

/* ---------------- 損耗 ---------------- */
function wasteOption() {
  const wk = weekWaste();
  return {
    animationDuration: 1000,
    grid: { left: 4, right: 4, top: 30, bottom: 2, containLabel: true },
    legend: { top: 0, right: 0, itemWidth: 12, itemHeight: 8, textStyle: { fontSize: 11 } },
    tooltip: { trigger: 'axis', formatter: (ps) => `${ps[0].axisValue}<br/>${ps.map(p => `${p.marker}${p.seriesName}：<b>${p.seriesIndex ? p.value + '%' : 'NT$ ' + p.value.toLocaleString()}</b>`).join('<br/>')}` },
    xAxis: { type: 'category', data: wk.map(w => w.label), axisLabel: { fontSize: 10 } },
    yAxis: [{ type: 'value', axisLabel: { fontSize: 10 } }, { type: 'value', axisLabel: { formatter: '{value}%', fontSize: 10 }, splitLine: { show: false } }],
    series: [
      { name: '損耗金額', type: 'bar', barWidth: '50%', itemStyle: { color: 'rgba(124,98,230,0.85)' }, data: wk.map((w, i) => ({ value: w.amt, itemStyle: { borderRadius: [6, 6, 0, 0], color: i === wk.length - 1 ? '#EC6A55' : 'rgba(124,98,230,0.75)' } })) },
      { name: '損耗率', type: 'line', yAxisIndex: 1, smooth: true, symbolSize: 7, data: wk.map(w => +w.rate.toFixed(2)), lineStyle: { width: 2.5, color: '#F0A531' }, itemStyle: { color: '#F0A531' } },
    ],
  };
}

function renderWasteList() {
  $('#ivpWList', root).innerHTML = waste.slice(0, 6).map(w => `<li><span class="ivp-kind ${w.kind === '成品' ? 'fg' : 'rm'}">${w.kind}</span><div><b>${w.name} ${fmtQ(w.qty, 2)} ${w.unit}</b><small>${esc(w.reason)}・${fmtMD(w.ts)}</small></div><em>−${money(w.amt)}</em></li>`).join('');
}

/* ---------------- 圖表 ---------------- */
function initCharts() {
  charts = { sun: makeChart($('#ivpSun', root)), stack: makeChart($('#ivpStack', root)), waste: makeChart($('#ivpWaste', root)) };
  charts.sun.setOption(sunOption());
  charts.stack.setOption(stackOption());
  charts.waste.setOption(wasteOption());
  charts.stack.on('click', (p) => { const pr = PRODUCTS.find(x => x.name === p.name); if (pr) selectProduct(pr.id); });
}

/* ---------------- 效期倒數 ---------------- */
function startTicker() {
  stopTicker();
  ticker = setInterval(() => {
    $$('.ivp-cd[data-exp]', root).forEach(n => { const c = cd(+n.dataset.exp); if (n.textContent !== c.txt) n.textContent = c.txt; });
  }, 1000);
}
function stopTicker() { if (ticker) clearInterval(ticker); ticker = 0; }

function renderShelfFoot(plan) {
  const max = Math.max(...plan.inv.map(p => p.current));
  $('#ivpShelfFoot', root).innerHTML = plan.inv.map(p => `<button class="ivp-sf ${p.low ? 'low' : ''}" data-pid="${p.id}" style="--pc:${p.color}"><i style="height:${Math.max(8, p.current / max * 100)}%"></i><b>${p.current}</b><span>${p.name}</span></button>`).join('');
  $$('.ivp-sf', root).forEach(b => b.addEventListener('click', () => { selectProduct(b.dataset.pid); $('.ivp-bom', root).scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
}

/* ---------------- 3D 倉儲 ---------------- */
function glowTex(color) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, color); r.addColorStop(0.3, color + '88'); r.addColorStop(1, color + '00');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return false;
    const ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext();
    return true;
  } catch { return false; }
}

function create2D(host, labels) {
  host.classList.add('ivp-2d');
  labels.innerHTML = '';
  host.appendChild(el('<span class="ivp-2d-note">此裝置未啟用 WebGL，已改用 2D 檢視</span>'));
  const wrap = el('<div class="ivp-2d-rack"></div>');
  host.appendChild(wrap);
  return {
    start() {}, stop() {},
    update(inv) {
      const max = Math.max(64, ...inv.map(p => p.current));
      wrap.innerHTML = inv.map(p => `<div class="ivp-2d-bay ${p.low ? 'low' : ''}" data-pid="${p.id}" style="--pc:${p.color}"><div class="ivp-2d-col"><i style="height:${p.current / max * 100}%"></i><u style="bottom:${p.safety / max * 100}%"></u></div><b>${p.current}</b><span>${p.name}</span></div>`).join('');
      $$('.ivp-2d-bay', wrap).forEach(b => b.addEventListener('click', () => selectProduct(b.dataset.pid)));
    },
  };
}

function createShelf(host, labels) {
  if (!hasWebGL()) return create2D(host, labels);
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { return create2D(host, labels); }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  host.insertBefore(renderer.domElement, host.firstChild);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x061a13, 14, 26);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  scene.add(new THREE.AmbientLight(0x7fb39a, 1.1));
  const dir = new THREE.DirectionalLight(0xffffff, 1.6); dir.position.set(4, 9, 6); scene.add(dir);
  const rim = new THREE.PointLight(0x2DB674, 30, 20); rim.position.set(-5, 4, -3); scene.add(rim);
  const warm = new THREE.PointLight(0xF0A531, 16, 20); warm.position.set(5, 2, 4); scene.add(warm);

  const world = new THREE.Group(); scene.add(world);
  // 地板與格線
  const floor = new THREE.Mesh(new THREE.CircleGeometry(7.5, 64), new THREE.MeshStandardMaterial({ color: 0x0a2a1e, roughness: 0.9, metalness: 0.1, transparent: true, opacity: 0.85 }));
  floor.rotation.x = -Math.PI / 2; world.add(floor);
  const grid = new THREE.GridHelper(15, 30, 0x2DB674, 0x1b4a37); grid.material.transparent = true; grid.material.opacity = 0.25; grid.position.y = 0.002; world.add(grid);
  // 貨架
  const n = PRODUCTS.length, gap = 1.0, W = n * gap + 0.3, Dp = 1.5, Ht = 3.7;
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x2b5c48, metalness: 0.6, roughness: 0.35 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(W, 0.12, Dp), new THREE.MeshStandardMaterial({ color: 0x15392b, metalness: 0.4, roughness: 0.5 })); base.position.y = 0.06; world.add(base);
  const postG = new THREE.BoxGeometry(0.06, Ht, 0.06);
  for (let i = 0; i <= n; i++) for (const z of [-Dp / 2 + 0.05, Dp / 2 - 0.05]) { const p = new THREE.Mesh(postG, frameMat); p.position.set(-W / 2 + 0.15 + i * gap, Ht / 2, z); world.add(p); }
  for (const z of [-Dp / 2 + 0.05, Dp / 2 - 0.05]) { const t = new THREE.Mesh(new THREE.BoxGeometry(W, 0.06, 0.06), frameMat); t.position.set(0, Ht, z); world.add(t); }
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W, Ht), new THREE.MeshBasicMaterial({ color: 0x2DB674, transparent: true, opacity: 0.05, side: THREE.DoubleSide })); back.position.set(0, Ht / 2, -Dp / 2 + 0.02); world.add(back);

  const boxGeo = new THREE.BoxGeometry(0.74, 1, 1.08); boxGeo.translate(0, 0.5, 0);
  const edgeGeo = new THREE.EdgesGeometry(boxGeo);
  const redTex = glowTex('#ff4a3a');
  const items = PRODUCTS.map((p, i) => {
    const color = new THREE.Color(p.color);
    const mat = new THREE.MeshStandardMaterial({ color, metalness: 0.25, roughness: 0.32, emissive: color, emissiveIntensity: 0.14, transparent: true, opacity: 0.93 });
    const mesh = new THREE.Mesh(boxGeo, mat);
    const xpos = -W / 2 + 0.15 + gap / 2 + i * gap;
    mesh.position.set(xpos, 0.12, 0); mesh.scale.y = 0.01; mesh.userData.pid = p.id;
    const edges = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 }));
    mesh.add(edges);
    world.add(mesh);
    // 安全庫存線
    const sg = new THREE.EdgesGeometry(new THREE.BoxGeometry(0.88, 0.001, 1.22));
    const safe = new THREE.LineSegments(sg, new THREE.LineBasicMaterial({ color: 0xF0A531, transparent: true, opacity: 0.85 }));
    safe.position.set(xpos, 0.12, 0); world.add(safe);
    // 低庫存紅光
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: redTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    glow.scale.set(2.6, 2.6, 1); glow.position.set(xpos, 0.8, 0.2); world.add(glow);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.78, 40), new THREE.MeshBasicMaterial({ color: 0xff4a3a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(xpos, 0.14, 0); world.add(ring);
    const lab = el(`<div class="ivp-lab" data-pid="${p.id}"><b>0</b><span>${SHORT[p.id]}</span></div>`);
    labels.appendChild(lab);
    return { p, mesh, mat, safe, glow, ring, lab, low: false, cur: 0, h: 0.01 };
  });

  let rotY = -0.35, rotX = 0.0, tY = -0.35, tX = 0, drag = null, idle = 0, hover = null;
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  const cv = renderer.domElement;
  cv.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, ry: tY, rx: tX, moved: 0 }; idle = 0; });
  window.addEventListener('pointermove', (e) => {
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved = Math.max(drag.moved, Math.abs(dx) + Math.abs(dy));
      tY = drag.ry + dx * 0.008; tX = Math.max(-0.25, Math.min(0.35, drag.rx + dy * 0.004)); idle = 0;
    }
  });
  window.addEventListener('pointerup', (e) => {
    if (drag && drag.moved < 6 && e.target === cv) { const hit = pick(e); if (hit) { selectProduct(hit.p.id); toast(`${hit.p.name}｜庫存 ${hit.cur}`, `安全庫存 ${hit.p.safety}・${hit.low ? '低於安全庫存，AI 已排入今日生產' : '庫存正常'}；下方配方 BOM 已切換`, { kind: hit.low ? 'warn' : 'info', icon: icon('box', 18) }); } }
    drag = null;
  });
  cv.addEventListener('pointermove', (e) => { if (drag) return; const hit = pick(e); if (hit !== hover) { hover = hit; items.forEach(it => it.lab.classList.toggle('hov', it === hit)); cv.style.cursor = hit ? 'pointer' : 'grab'; } });
  cv.addEventListener('pointerleave', () => { hover = null; items.forEach(it => it.lab.classList.remove('hov')); });
  function pick(e) {
    const r = cv.getBoundingClientRect();
    ptr.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const hits = ray.intersectObjects(items.map(i => i.mesh), false);
    return hits.length ? items.find(i => i.mesh === hits[0].object) : null;
  }

  let w = 0, h = 0;
  const resize = () => {
    w = host.clientWidth; h = host.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); cv.style.width = w + 'px'; cv.style.height = h + 'px';
    camera.aspect = w / h;
    host.classList.toggle('compact', w < 520);
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), tanH = tanV * camera.aspect;
    const dist = Math.max((W / 2 + 0.55) / tanH, (Ht / 2 + 0.9) / tanV);
    const elev = THREE.MathUtils.degToRad(24);
    camera.position.set(0, 1.45 + Math.sin(elev) * dist, Math.cos(elev) * dist); camera.lookAt(0, 1.45, 0);
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize); ro.observe(host); resize();

  let running = false, raf = 0, last = performance.now(), t = 0, visible = true;
  const io = new IntersectionObserver((ents) => { visible = ents[0].isIntersecting; if (visible && running) loop(); }); io.observe(host);
  const v = new THREE.Vector3();
  function frame(dt) {
    t += dt; idle += dt;
    if (!drag && idle > 2.5) tY += dt * 0.12 * Math.sin(t * 0.25 + 1) * 0.6;
    rotY += (tY - rotY) * Math.min(1, dt * 6); rotX += (tX - rotX) * Math.min(1, dt * 6);
    world.rotation.y = rotY; world.rotation.x = rotX;
    for (const it of items) {
      if (it.low) {
        const k = 0.5 + 0.5 * Math.sin(t * 4.2);
        it.mat.emissive.setRGB(1, 0.16, 0.12); it.mat.emissiveIntensity = 0.5 + k * 0.8;
        it.glow.material.opacity = 0.55 + k * 0.45;
        const rs = 1 + ((t * 0.9) % 1) * 0.9; it.ring.scale.set(rs, rs, 1); it.ring.material.opacity = 0.9 * (1 - ((t * 0.9) % 1));
      }
      // 標籤投影
      v.set(it.mesh.position.x, it.mesh.position.y + it.mesh.scale.y + 0.25, 0); world.localToWorld(v); v.project(camera);
      it.lab.style.transform = `translate(-50%, -100%) translate(${((v.x + 1) / 2 * w).toFixed(1)}px, ${((1 - v.y) / 2 * h).toFixed(1)}px)`;
    }
    renderer.render(scene, camera);
  }
  function loop() {
    cancelAnimationFrame(raf);
    const step = (now) => {
      if (!running || !visible || document.hidden) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      frame(dt);
      raf = requestAnimationFrame(step);
    };
    last = performance.now();
    raf = requestAnimationFrame(step);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && running) loop(); });

  return {
    start() { if (running) return; running = true; resize(); loop(); },
    stop() { running = false; cancelAnimationFrame(raf); },
    update(inv) {
      const max = Math.max(64, ...inv.map(p => p.current));
      inv.forEach((p, i) => {
        const it = items[i]; const target = Math.max(0.04, p.current / max * 3.2);
        it.cur = p.current; it.low = p.low;
        gsap.to(it.mesh.scale, { y: target, duration: 1.2, ease: 'power3.out' });
        it.safe.position.y = 0.12 + p.safety / max * 3.2;
        if (!p.low) { it.mat.emissive.set(p.color); it.mat.emissiveIntensity = 0.14; it.glow.material.opacity = 0; it.ring.material.opacity = 0; }
        it.glow.position.y = 0.12 + target * 0.5;
        $('b', it.lab).textContent = p.current;
        it.lab.classList.toggle('low', p.low);
      });
    },
  };
}
