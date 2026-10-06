// 預約與訂金：客製蛋糕、門市取貨時段、週末烘焙小班課；AI 自動預約、拖拉改期、訂金會計
import { store } from '../state.js';
import { $, $$, el, gsap, esc, money, sleep, countUp, toast } from '../util.js';
import { icon, chIcon } from '../icons.js';
import { startOfDay, addDays } from '../data.js';
import {
  TYPES, OPEN_H, CLOSE_H, SLOT_MIN, DOW_ZH, LANG_NAME, CH_NAME, DEFAULT_RULES, weekStart, sameDay, hm, mdw, whenIn,
  buildBookings, daysBetween, classTaken, NOSHOW_TREND, NOSHOW_AI_WEEK, moveNotice, classNotice, waitNotice, W, BK_ITEMS, BK_NOTES,
} from '../booking-data.js';
import { IS_AMEI, CAT, FOODISH, KIT } from '../inventory-data.js';

let root, DATA, FULL_SNAP = null;
const R = { ...DEFAULT_RULES, closed: [...DEFAULT_RULES.closed] };
const NOW = () => new Date();
const T0 = () => startOfDay(new Date());
const ROWS = (CLOSE_H - OPEN_H) * 60 / SLOT_MIN;
const V = { mode: 'week', week: weekStart(new Date()), month: new Date(new Date().getFullYear(), new Date().getMonth(), 1), narrow: false, selClass: null, scen: 0, started: false, ledger: [], agOpen: new Set() };
let runId = 0, invSeq = 0, seq = 5000;
const n0 = (n) => Math.round(n).toLocaleString('en-US');
const net = (x) => Math.round(x / 1.05);
const byId = (id) => DATA.list.find(b => b.id === id);
const initial = (name) => (/^[A-Za-z]/.test(name) ? name[0] : (name.length > 2 && name.includes(' ') ? name.split(' ')[0][0] : name[0]));
const typeChip = (t) => `<span class="bk2-tchip" style="--tc:${TYPES[t].color}"><i></i>${TYPES[t].name}</span>`;
const LINE_SVG = (s = 14) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 4C6.5 4 3 7.3 3 11.1c0 3.4 3 6.2 7.2 6.8l-.4 2.4c0 .4.3.6.7.4 2.6-1.4 6.6-4.2 8.1-6.5.9-1.2 1.4-2.2 1.4-3.1C21 7.3 17.5 4 12 4z"/></svg>`;
const DRAG_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/></svg>`;

// ───────── 計算 ─────────
const slotKey = (d) => `${startOfDay(d).getTime()}|${d.getHours()}:${d.getMinutes()}`;
function slotLoad(d, except) { const k = slotKey(d); return DATA.list.filter(b => b.type !== 'class' && b !== except && b.status !== 'cancel' && slotKey(b.start) === k).length; }
function cakesOn(d, except) { return DATA.list.filter(b => b.type === 'cake' && b !== except && b.status !== 'cancel' && sameDay(b.start, d)).length; }
const classOn = (d) => DATA.classes.find(c => sameDay(c.start, d));
const active = (b) => b.status !== 'cancel';
function inRange(from, to) { return DATA.list.filter(b => active(b) && b.start >= from && b.start < to); }

function kpis() {
  const w0 = weekStart(NOW()), w1 = addDays(w0, 7), wp = addDays(w0, -7);
  const count = (arr) => arr.reduce((s, b) => s + (b.type === 'class' ? b.roster.length : 1), 0);
  const thisWk = inRange(w0, w1), lastWk = inRange(wp, w0);
  const fut = DATA.list.filter(b => active(b) && b.status === 'confirmed' && b.start > NOW());
  const pend = fut.filter(b => b.type === 'cake' && b.depStatus === 'pending');
  const paidCake = fut.filter(b => b.type === 'cake' && b.depStatus === 'paid').reduce((s, b) => s + b.deposit, 0);
  const paidCls = fut.filter(b => b.type === 'class').reduce((s, c) => s + c.roster.filter(r => r.paid).reduce((a, r) => a + r.pax * c.price, 0), 0);
  // 空位率：本週課程座位＋客製蛋糕產能
  let cap = 0, used = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(w0, i);
    if (R.closed.includes(d.getDay())) continue;
    cap += R.cakeCap; used += Math.min(R.cakeCap, cakesOn(d));
    const c = classOn(d); if (c) { cap += c.seats; used += Math.min(c.seats, classTaken(c)); }
  }
  return {
    week: count(thisWk), weekDelta: count(thisWk) - count(lastWk),
    pend: pend.reduce((s, b) => s + b.deposit, 0), pendN: pend.length,
    paid: paidCake + paidCls, paidCake, paidCls,
    vac: cap ? (1 - used / cap) * 100 : 0, vacSeats: cap - used,
    noshow: NOSHOW_TREND[NOSHOW_TREND.length - 1], before: NOSHOW_TREND.slice(0, NOSHOW_AI_WEEK).reduce((a, b) => a + b, 0) / NOSHOW_AI_WEEK,
    cakes: thisWk.filter(b => b.type === 'cake').length, picks: thisWk.filter(b => b.type === 'pickup').length,
    seats: thisWk.filter(b => b.type === 'class').reduce((s, c) => s + classTaken(c), 0), seatCap: thisWk.filter(b => b.type === 'class').reduce((s, c) => s + c.seats, 0),
  };
}

function canPlace(b, d) {
  if (d < NOW()) return '不能改到已經過去的時間';
  if (R.closed.includes(d.getDay())) return `週${DOW_ZH[d.getDay()]}是公休日`;
  const mins = (d.getHours() - OPEN_H) * 60 + d.getMinutes();
  if (mins < 0 || mins >= (CLOSE_H - OPEN_H) * 60) return '不在營業時段';
  const c = classOn(d);
  if (c && d >= c.start && d < new Date(c.start.getTime() + c.dur * 60000)) return `這段時間在上${W.clsShort}`;
  if (slotLoad(d, b) >= R.slotCap) return `這個時段已滿（上限 ${R.slotCap} 單）`;
  if (b.type === 'cake') {
    if (!sameDay(d, b.start) && cakesOn(d, b) >= R.cakeCap) return `當天${W.capN}已滿（每天 ${R.cakeCap} ${W.mu}）`;
    if (d < b.start && daysBetween(NOW(), d) < R.leadDays) return `${W.main}需 ${R.leadDays} 天前預訂，${IS_AMEI ? '提前會來不及做' : '太趕會來不及準備'}`;
  }
  return '';
}
function freeSlots(b, day, fromH = 11, toH = 18.5, n = 4) {
  const out = [];
  for (let m = fromH * 60; m <= toH * 60 && out.length < n; m += 30) {
    const d = new Date(day); d.setHours(0, m, 0, 0);
    if (!canPlace(b, d)) out.push({ d, left: R.slotCap - slotLoad(d, b) });
  }
  return out;
}
function suggest(b, n = 4) {
  const out = [];
  for (let i = 0; i < 10 && out.length < n; i++) {
    const day = addDays(startOfDay(b.start), i);
    const tod = b.start.getHours() * 60 + b.start.getMinutes();
    const s = freeSlots(b, day, 11, 18.5, 20).filter(x => x.d.getTime() !== b.start.getTime())
      .sort((p, q) => Math.abs(p.d.getHours() * 60 + p.d.getMinutes() - tod) - Math.abs(q.d.getHours() * 60 + q.d.getMinutes() - tod));
    out.push(...s.slice(0, 1));
  }
  return out.slice(0, n);
}

// ───────── 版面 ─────────
const KPI_DEF = [
  { k: 'week', label: '本週預約數', icon: 'calendar', c: 'var(--leaf)' },
  { k: 'pend', label: '待收訂金', icon: 'clock', c: 'var(--amber)' },
  { k: 'paid', label: '已收訂金・預收款項', icon: 'coins', c: 'var(--sky)' },
  { k: 'vac', label: '本週空位率', icon: 'percent', c: 'var(--violet)' },
  { k: 'noshow', label: '爽約率', icon: 'bell', c: 'var(--pink)' },
];
const SCEN = [
  { key: 'cake', name: IS_AMEI ? '日文客人訂生日蛋糕' : `日文客人${W.order}`, short: W.order, ch: 'line' },
  { key: 'class', name: `中文客人報名${W.clsShort}`, short: '報名課程', ch: 'line' },
  { key: 'move', name: '熟客要改期', short: '改期', ch: 'line' },
  { key: 'cancel', name: '英文客人取消退費', short: '取消退費', ch: 'whatsapp' },
];

export default {
  mount(section) {
    root = section;
    DATA = buildBookings(NOW());
    const fc = DATA.classes.find(c => c.fixed === 'full');
    if (fc) FULL_SNAP = { roster: fc.roster.map(r => ({ ...r })), waitlist: fc.waitlist.map(r => ({ ...r })) };
    V.selClass = (DATA.classes.find(c => c.start > NOW()) || DATA.classes[0])?.id;
    section.innerHTML = `
    <div class="bk2">
      <div class="glass bk2-head anim-in">
        <div class="bk2-head-t">
          <div class="bk2-head-badges"><span class="demo-badge">${icon('alert', 13)} 示範資料・非真實預約</span><span class="chip-sm">${icon('sparkle', 12)} AI 代接預約・自動收訂金・自動提醒</span></div>
          <h2>預約、訂金、提醒，<span class="grad-txt">交給 AI 顧</span></h2>
          <p>客人在 LINE 說一句「想${W.order}」，AI 就會查空檔、推薦時段、確認客製內容、傳訂金連結；付款後自動排進行事曆，前一天再提醒，減少爽約。</p>
        </div>
        <div class="bk2-types" id="bk2Types"></div>
      </div>

      <div class="bk2-kpis">${KPI_DEF.map(k => `
        <div class="kpi glass anim-in" data-k="${k.k}" style="--c:${k.c}">
          <div class="kpi-top"><span class="kpi-ic">${icon(k.icon, 18)}</span><span class="kpi-label">${k.label}</span><span class="kpi-delta" data-delta></span></div>
          <div class="kpi-val" data-val>0</div>
          <div class="kpi-sub" data-sub></div>
          ${k.k === 'noshow' ? '<svg class="bk2-spark" id="bk2Spark" viewBox="0 0 100 30" preserveAspectRatio="none"></svg>' : ''}
        </div>`).join('')}
      </div>

      <div class="bk2-main">
        <div class="glass bk2-ai anim-in">
          <div class="bk2-ai-h">
            <div class="bk2-ai-title"><span class="bk2-orb">${icon('bot', 18)}</span><div><h3>AI 自動預約</h3><small>模擬客人傳訊息，看 AI 怎麼一路處理到收訂金</small></div></div>
            <div class="bk2-scen" id="bk2Scen">${SCEN.map((s, i) => `<button class="bk2-scen-b" data-i="${i}"><b>${i + 1}</b>${s.short}</button>`).join('')}</div>
          </div>
          <div class="bk2-phone">
            <div class="bk2-ph-top" id="bk2PhTop"></div>
            <div class="bk2-ph-body" id="bk2Chat"></div>
          </div>
          <div class="bk2-steps" id="bk2Steps"></div>
          <div class="bk2-ai-act">
            <button class="btn btn-primary" id="bk2Run">${icon('play', 16)} 開始示範</button>
            <small id="bk2RunNote">AI 會用客人的語言回覆，老闆看到的是中文翻譯</small>
          </div>
        </div>

        <div class="glass bk2-cal anim-in">
          <div class="bk2-cal-h">
            <h3>${icon('calendar', 18)} 預約行事曆</h3>
            <div class="bk2-nav">
              <button class="icon-btn bk2-navb" data-nav="-1" aria-label="上一頁">${icon('arrow', 15)}</button>
              <button class="btn btn-ghost btn-sm" data-nav="0">今天</button>
              <button class="icon-btn bk2-navb" data-nav="1" aria-label="下一頁">${icon('arrow', 15)}</button>
              <b class="bk2-range" id="bk2Range"></b>
            </div>
            <div class="bk2-modes"><button class="seg on" data-mode="week">週</button><button class="seg" data-mode="month">月</button></div>
          </div>
          <div class="bk2-legend">
            ${Object.keys(TYPES).map(t => `<span style="--tc:${TYPES[t].color}"><i></i>${TYPES[t].name}</span>`).join('')}
            <span class="bk2-lg-dot"><i class="pend"></i>待付訂金</span>
            <em class="bk2-hint">${DRAG_SVG} 拖拉區塊可改時段，AI 會用客人的語言通知</em>
          </div>
          <div class="bk2-cal-body" id="bk2Cal"></div>
        </div>
      </div>

      <div class="bk2-row2">
        <div class="glass card bk2-rules anim-in">
          <div class="card-h"><h3>${icon('wand', 18)} 預約規則<small>用白話設定，AI 照著跟客人說</small></h3><span class="chip-sm">改了立即生效</span></div>
          <div class="bk2-rule-list" id="bk2Rules"></div>
          <div class="bk2-say"><b>${icon('chat', 14)} AI 會這樣跟客人說明</b><p id="bk2Say"></p></div>
        </div>
        <div class="glass card bk2-cls anim-in">
          <div class="card-h"><h3>${icon('users', 18)} ${W.cls}名單</h3><span class="chip-sm" id="bk2ClsChip"></span></div>
          <div class="bk2-cls-list" id="bk2ClsList"></div>
          <div class="bk2-roster" id="bk2Roster"></div>
        </div>
      </div>

      <div class="glass card bk2-acct anim-in" id="bk2Acct"></div>
    </div>
    <div class="bk2-modal" id="bk2Modal" hidden><div class="bk2-mask" data-close></div><div class="glass bk2-dlg" id="bk2Dlg"></div></div>`;

    // 事件
    $('#bk2Run', root).addEventListener('click', () => runScenario(V.scen));
    $('#bk2Scen', root).addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (b) runScenario(+b.dataset.i); });
    $$('[data-mode]', root).forEach(b => b.addEventListener('click', () => { V.mode = b.dataset.mode; $$('[data-mode]', root).forEach(x => x.classList.toggle('on', x === b)); renderCal(true); }));
    $$('[data-nav]', root).forEach(b => b.addEventListener('click', () => nav(+b.dataset.nav)));
    const cal = $('#bk2Cal', root);
    cal.addEventListener('pointerdown', onDown);
    cal.addEventListener('click', onCalClick);
    $('#bk2Modal', root).addEventListener('click', onModalClick);
    $('#bk2Rules', root).addEventListener('click', onRuleClick);
    $('#bk2ClsList', root).addEventListener('click', (e) => { const r = e.target.closest('[data-cls]'); if (r) { V.selClass = r.dataset.cls; renderClasses(true); } });
    $('#bk2Roster', root).addEventListener('click', onRosterClick);
    $('#bk2Acct', root).addEventListener('click', onAcctClick);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
    let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (!root.hidden) { const n = isNarrow(); if (n !== V.narrow) renderCal(); } }, 150); });

    renderTypes(); renderKpis(true); renderCal(); renderRules(); renderClasses(); renderAcct(); idleChat();
  },
  show() { if (!root) return; requestAnimationFrame(() => { if (isNarrow() !== V.narrow) renderCal(); renderKpis(true); }); },
  hide() { closeModal(); },
};

// ───────── KPI ─────────
function renderTypes() {
  const k = kpis();
  $('#bk2Types', root).innerHTML = `
    <div class="bk2-type" style="--tc:${TYPES.cake.color}"><span>${icon('heart', 16)}</span><div><b>${W.main}</b><small>${R.leadDays} 天前預訂・訂金 ${R.depositPct}%</small></div><em>${k.cakes}<small>本週</small></em></div>
    <div class="bk2-type" style="--tc:${TYPES.pickup.color}"><span>${icon('box', 16)}</span><div><b>${W.pickSlot}</b><small>每 30 分鐘最多 ${R.slotCap} 單</small></div><em>${k.picks}<small>本週</small></em></div>
    <div class="bk2-type" style="--tc:${TYPES.class.color}"><span>${icon('users', 16)}</span><div><b>${W.clsWeek}</b><small>每班 ${R.classSeats} 人・${money(R.classPrice)}/人</small></div><em>${k.seats}<small>/${k.seatCap} 位</small></em></div>`;
}
function renderKpis(anim) {
  const k = kpis();
  const set = (key, val, opt, sub, delta) => {
    const c = $(`.kpi[data-k="${key}"]`, root); if (!c) return;
    const v = $('[data-val]', c);
    if (anim) countUp(v, val, opt); else { countUp(v, val, { ...opt, duration: 0.8 }); c.classList.remove('flash'); void c.offsetWidth; c.classList.add('flash'); }
    $('[data-sub]', c).innerHTML = sub;
    const d = $('[data-delta]', c); if (delta) { d.className = `kpi-delta ${delta[1]}`; d.textContent = delta[0]; } else d.textContent = '';
  };
  set('week', k.week, { suffix: ' 筆' }, `${W.ms} ${k.cakes}・${W.pv} ${k.picks}・課程報名 ${k.week - k.cakes - k.picks}`, [`${k.weekDelta >= 0 ? '+' : ''}${k.weekDelta} vs 上週`, k.weekDelta >= 0 ? 'up' : 'down']);
  set('pend', k.pend, { prefix: 'NT$ ' }, `${k.pendN} 筆${W.ms}等客人付款・AI 已自動催`, k.pendN ? [`${k.pendN} 筆`, 'warn'] : null);
  set('paid', k.paid, { prefix: 'NT$ ' }, `${W.ms}訂金 ${n0(k.paidCake)}・課程費 ${n0(k.paidCls)}`, ['負債', 'warn']);
  set('vac', k.vac, { suffix: '%', decimals: 1 }, `還有 ${k.vacSeats} 個課位／${W.capN}可接`, null);
  set('noshow', k.noshow, { suffix: '%', decimals: 1 }, `AI 提醒前 ${k.before.toFixed(1)}%`, [`−${(k.before - k.noshow).toFixed(1)}%`, 'up']);
  // 爽約率走勢
  const sv = $('#bk2Spark', root); if (sv && !sv.dataset.done) {
    sv.dataset.done = 1;
    const mx = 18, pts = NOSHOW_TREND.map((v, i) => [i * (100 / (NOSHOW_TREND.length - 1)), 28 - v / mx * 26]);
    const x0 = pts[NOSHOW_AI_WEEK][0];
    sv.innerHTML = `<line x1="${x0}" x2="${x0}" y1="0" y2="30" class="ai"/><path d="M${pts.map(p => p.join(',')).join(' L')} L100,30 L0,30Z" class="a"/><path d="M${pts.map(p => p.join(',')).join(' L')}" class="l"/>`;
  }
}

// ───────── 行事曆 ─────────
function isNarrow() { const c = $('#bk2Cal', root); return c ? c.clientWidth < 640 : false; }
function nav(dir) {
  if (V.mode === 'week') V.week = dir === 0 ? weekStart(NOW()) : addDays(V.week, dir * 7);
  else { const m = V.month; V.month = dir === 0 ? new Date(NOW().getFullYear(), NOW().getMonth(), 1) : new Date(m.getFullYear(), m.getMonth() + dir, 1); }
  renderCal(true);
}
function renderCal(anim) {
  const host = $('#bk2Cal', root);
  V.narrow = isNarrow();
  if (V.mode === 'week') {
    const end = addDays(V.week, 6);
    $('#bk2Range', root).textContent = `${V.week.getMonth() + 1}/${V.week.getDate()} – ${end.getMonth() + 1}/${end.getDate()}`;
    host.innerHTML = V.narrow ? agendaHTML() : weekHTML();
  } else {
    $('#bk2Range', root).textContent = `${V.month.getFullYear()} 年 ${V.month.getMonth() + 1} 月`;
    host.innerHTML = monthHTML();
  }
  if (anim) gsap.fromTo(host.children, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.35, stagger: 0.02, clearProps: 'transform' });
}
function evHTML(b, n) {
  const t = TYPES[b.type];
  const cls = [`bk2-ev`, `t-${b.type}`, b.status, b.depStatus === 'pending' ? 'pend' : '', n >= 3 ? 'tight' : '', b.isNew ? 'isnew' : ''].join(' ');
  return `<button class="${cls}" data-id="${b.id}" style="--tc:${t.color}" title="${esc(`${hm(b.start)} ${b.customer}・${b.item}`)}">
    <b>${n >= 3 ? esc(initial(b.customer)) : esc(b.customer)}</b>${n < 3 ? `<span>${esc(b.type === 'cake' ? b.item.replace('蛋糕', '') : b.item.split('、')[0])}</span>` : ''}</button>`;
}
function weekHTML() {
  const days = Array.from({ length: 7 }, (_, i) => addDays(V.week, i));
  const now = NOW();
  const head = days.map(d => {
    const items = inRange(d, addDays(d, 1));
    const closed = R.closed.includes(d.getDay());
    return `<div class="bk2-dh ${sameDay(d, now) ? 'today' : ''} ${closed ? 'closed' : ''}"><small>週${DOW_ZH[d.getDay()]}</small><b>${d.getDate()}</b><em>${closed ? '公休' : `${items.reduce((s, b) => s + (b.type === 'class' ? 1 : 1), 0)} 筆`}</em></div>`;
  }).join('');
  const times = Array.from({ length: CLOSE_H - OPEN_H }, (_, i) => `<span style="top:calc(var(--row) * ${i * 2})">${OPEN_H + i}:00</span>`).join('');
  const cols = days.map((d, di) => {
    const closed = R.closed.includes(d.getDay());
    const items = inRange(d, addDays(d, 1));
    let html = '';
    const groups = new Map();
    for (const b of items) {
      if (b.type === 'class') {
        const top = ((b.start.getHours() - OPEN_H) * 60 + b.start.getMinutes()) / SLOT_MIN;
        const tk = classTaken(b);
        html += `<button class="bk2-ev t-class ${b.status} ${tk >= b.seats ? 'full' : ''}" data-id="${b.id}" style="--tc:${TYPES.class.color};top:calc(var(--row) * ${top} + 1px);height:calc(var(--row) * ${b.dur / SLOT_MIN} - 3px)">
          <i>${hm(b.start)}</i><b>${esc(b.title)}</b><span class="bk2-seat"><em style="width:${Math.min(100, tk / b.seats * 100)}%"></em></span><span>${tk}/${b.seats} 位${b.waitlist.length ? `・候補 ${b.waitlist.length}` : ''}</span></button>`;
        continue;
      }
      const s = ((b.start.getHours() - OPEN_H) * 60 + b.start.getMinutes()) / SLOT_MIN;
      if (s < 0 || s >= ROWS) continue;
      if (!groups.has(s)) groups.set(s, []);
      groups.get(s).push(b);
    }
    for (const [s, arr] of groups) {
      arr.sort((a, b) => (a.type === 'cake' ? -1 : 1) - (b.type === 'cake' ? -1 : 1));
      html += `<div class="bk2-slot ${arr.length >= R.slotCap ? 'capfull' : ''}" style="top:calc(var(--row) * ${s} + 1px)">${arr.map(b => evHTML(b, arr.length)).join('')}</div>`;
    }
    return `<div class="bk2-day ${closed ? 'closed' : ''} ${sameDay(d, now) ? 'today' : ''}" data-di="${di}">${closed ? '<div class="bk2-closed-t">公休日</div>' : ''}${html}</div>`;
  }).join('');
  let nowLine = '';
  const di = days.findIndex(d => sameDay(d, now));
  const nm = (now.getHours() - OPEN_H) * 60 + now.getMinutes();
  if (di >= 0 && nm >= 0 && nm < (CLOSE_H - OPEN_H) * 60) nowLine = `<div class="bk2-now" style="--di:${di};top:calc(var(--row) * ${nm / SLOT_MIN})"><i></i></div>`;
  return `<div class="bk2-wk"><div class="bk2-wk-h"><div class="bk2-corner"></div>${head}</div>
    <div class="bk2-wk-b" style="--rows:${ROWS}"><div class="bk2-times">${times}</div>${cols}${nowLine}</div></div>`;
}
function agendaHTML() {
  const now = NOW();
  return `<div class="bk2-agenda">${Array.from({ length: 7 }, (_, i) => addDays(V.week, i)).map(d => {
    const closed = R.closed.includes(d.getDay());
    const items = inRange(d, addDays(d, 1));
    const key = startOfDay(d).getTime(), open = V.agOpen.has(key), LIM = 4;
    const shown = open ? items : items.slice(0, LIM);
    return `<div class="bk2-ag-day ${sameDay(d, now) ? 'today' : ''}"><div class="bk2-ag-h"><b>${d.getMonth() + 1}/${d.getDate()}</b><small>週${DOW_ZH[d.getDay()]}</small><em>${closed ? '公休日' : `${items.length} 筆`}</em></div>
      ${items.length > LIM ? `<button class="bk2-ag-more" data-ag="${key}">${open ? '收合' : `顯示全部 ${items.length} 筆（還有 ${items.length - LIM} 筆）`}</button>` : ''}
      ${shown.map(b => `<button class="bk2-ag-row ${b.status} ${b.depStatus === 'pending' ? 'pend' : ''}" data-id="${b.id}" style="--tc:${TYPES[b.type].color}"><i>${hm(b.start)}</i><span><b>${esc(b.type === 'class' ? b.title : b.customer)}</b><small>${esc(b.type === 'class' ? `${classTaken(b)}/${b.seats} 位・${W.cls}` : b.item)}</small></span>${b.depStatus === 'pending' ? '<em class="st pending">待付訂金</em>' : ''}</button>`).join('')}</div>`;
  }).join('')}</div>`;
}
function monthHTML() {
  const m = V.month, start = weekStart(m), now = NOW();
  const head = ['一', '二', '三', '四', '五', '六', '日'].map(x => `<div class="bk2-mh">${x}</div>`).join('');
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = addDays(start, i);
    const items = inRange(d, addDays(d, 1));
    const closed = R.closed.includes(d.getDay());
    const cnt = { cake: 0, pickup: 0, class: 0 }; items.forEach(b => cnt[b.type]++);
    const tot = items.length;
    const order = items.slice().sort((a, b) => ({ class: 0, cake: 1, pickup: 2 }[a.type] - { class: 0, cake: 1, pickup: 2 }[b.type]));
    const show = order.slice(0, V.narrow ? 0 : 3);
    return `<div class="bk2-mc ${d.getMonth() !== m.getMonth() ? 'other' : ''} ${sameDay(d, now) ? 'today' : ''} ${closed ? 'closed' : ''}" data-date="${d.getTime()}">
      <div class="bk2-mc-h"><b>${d.getDate()}</b>${closed ? '<small>公休</small>' : tot ? `<small>${tot} 筆</small>` : ''}</div>
      ${tot ? `<div class="bk2-mc-bar">${Object.keys(cnt).filter(t => cnt[t]).map(t => `<i style="flex:${cnt[t]};background:${TYPES[t].color}"></i>`).join('')}</div>` : ''}
      <div class="bk2-mc-pills">${show.map(b => `<button class="bk2-pill ${b.status} ${b.depStatus === 'pending' ? 'pend' : ''} ${b.isNew ? 'isnew' : ''}" data-id="${b.id}" style="--tc:${TYPES[b.type].color}"><i>${hm(b.start)}</i>${esc(b.type === 'class' ? b.title : b.customer)}</button>`).join('')}
      ${order.length > show.length && !V.narrow ? `<span class="bk2-more">+${order.length - show.length} 筆</span>` : ''}</div>
      ${V.narrow && tot ? `<div class="bk2-mc-dots">${Object.keys(cnt).filter(t => cnt[t]).map(t => `<i style="background:${TYPES[t].color}"></i>`).join('')}</div>` : ''}
    </div>`;
  }).join('');
  return `<div class="bk2-month"><div class="bk2-mgrid">${head}${cells}</div></div>`;
}
function onCalClick(e) {
  if (drag.justDragged) { drag.justDragged = false; return; }
  const more = e.target.closest('[data-ag]');
  if (more) { const k = +more.dataset.ag; if (V.agOpen.has(k)) V.agOpen.delete(k); else V.agOpen.add(k); renderCal(); return; }
  const ag = e.target.closest('.bk2-ag-row, .bk2-pill');
  if (ag) { openDetail(ag.dataset.id); return; }
  const mc = e.target.closest('.bk2-mc');
  if (mc && V.mode === 'month') {
    V.week = weekStart(new Date(+mc.dataset.date)); V.mode = 'week';
    $$('[data-mode]', root).forEach(x => x.classList.toggle('on', x.dataset.mode === 'week'));
    renderCal(true);
  }
}

// 拖拉改期
const drag = { on: false, justDragged: false };
function onDown(e) {
  if (e.button !== 0) return;
  const ev = e.target.closest('.bk2-ev'); if (!ev) return;
  const b = byId(ev.dataset.id); if (!b) return;
  e.preventDefault();
  Object.assign(drag, { x: e.clientX, y: e.clientY, ev, b, on: false, ghost: null, target: null });
  const move = (m) => onMove(m);
  const up = (u) => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); onUp(u); };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}
function onMove(e) {
  if (!drag.on) {
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
    drag.on = true;
    if (drag.b.type === 'class' || drag.b.status !== 'confirmed') return;
    const r = drag.ev.getBoundingClientRect();
    drag.ghost = drag.ev.cloneNode(true);
    drag.ghost.classList.add('bk2-ghost');
    Object.assign(drag.ghost.style, { width: Math.max(r.width, 110) + 'px', height: r.height + 'px', left: r.left + 'px', top: r.top + 'px' });
    drag.ox = e.clientX - r.left; drag.oy = e.clientY - r.top;
    document.body.appendChild(drag.ghost);
    drag.ev.classList.add('dragging');
  }
  if (!drag.ghost) return;
  drag.ghost.style.left = (e.clientX - drag.ox) + 'px';
  drag.ghost.style.top = (e.clientY - drag.oy) + 'px';
  const col = document.elementsFromPoint(e.clientX, e.clientY).find(n => n.classList && n.classList.contains('bk2-day'));
  $$('.bk2-drop', root).forEach(n => n.remove());
  drag.target = null;
  if (!col) return;
  const rect = col.getBoundingClientRect();
  const row = rect.height / ROWS;
  const s = Math.max(0, Math.min(ROWS - 1, Math.floor((e.clientY - drag.oy + row / 2 - rect.top) / row)));
  const d = addDays(V.week, +col.dataset.di); d.setHours(OPEN_H, s * SLOT_MIN, 0, 0);
  const why = canPlace(drag.b, d);
  drag.target = { d, why };
  col.appendChild(el(`<div class="bk2-drop ${why ? 'bad' : ''}" style="top:calc(var(--row) * ${s} + 1px)"><b>${hm(d)}</b><small>${why ? esc(why) : `剩 ${R.slotCap - slotLoad(d, drag.b)} 個名額`}</small></div>`));
}
function onUp() {
  const { b, ghost, target, on } = drag;
  drag.on = false;
  $$('.bk2-drop', root).forEach(n => n.remove());
  if (drag.ev) drag.ev.classList.remove('dragging');
  if (!on) { openDetail(b.id); return; }
  drag.justDragged = true; setTimeout(() => { drag.justDragged = false; }, 50);
  if (!ghost) {
    if (b.type === 'class') toast('課程請整班改期', '課程有多位學員，請在詳情中按「通知全班改期」，AI 會逐一徵詢', { kind: 'warn', icon: icon('users', 18) });
    else toast('已完成的預約不能改期', '只有尚未到期的預約可以拖拉改時段', { kind: 'warn', icon: icon('alert', 18) });
    return;
  }
  ghost.remove();
  if (!target) return;
  if (target.d.getTime() === b.start.getTime()) return;
  if (target.why) { toast('這個時段不行', target.why, { kind: 'warn', icon: icon('alert', 18) }); return; }
  moveBooking(b, target.d);
}
function moveBooking(b, d, { quiet = false } = {}) {
  b.start = d; b.moved = (b.moved || 0) + 1; b.isNew = false;
  DATA.list.sort((x, y) => x.start - y.start);
  if (V.mode === 'week' && (d < V.week || d >= addDays(V.week, 7))) V.week = weekStart(d);
  renderCal(); renderKpis(); renderTypes(); renderAcct();
  flashBooking(b.id);
  if (!quiet) {
    toast(`已改到 ${mdw(d)} ${hm(d)}・已通知 ${b.customer}`, `AI 用${LANG_NAME[b.lang]}傳 ${CH_NAME[b.channel]}：「${moveNotice(b.lang, b.customer, whenIn(b.lang, d))}」`, { kind: 'info', icon: icon('send', 18), duration: 6000 });
    store.log('order', `預約 ${b.id} 改到 ${mdw(d)} ${hm(d)}，已用${LANG_NAME[b.lang]}通知 ${b.customer}`);
  }
}
function flashBooking(id) {
  const n = $(`#bk2Cal [data-id="${id}"]`, root);
  if (!n) return;
  n.classList.add('flash');
  gsap.fromTo(n, { scale: 1.25 }, { scale: 1, duration: 0.6, ease: 'back.out(3)', clearProps: 'transform' });
  setTimeout(() => n.classList.remove('flash'), 2400);
}

// ───────── 詳情 ─────────
function openDetail(id) {
  const b = byId(id); if (!b) return;
  const dlg = $('#bk2Dlg', root);
  dlg.innerHTML = b.type === 'class' ? classDetail(b) : bookingDetail(b);
  dlg.dataset.id = id;
  const m = $('#bk2Modal', root); m.hidden = false;
  gsap.fromTo($('.bk2-mask', m), { opacity: 0 }, { opacity: 1, duration: 0.25 });
  gsap.fromTo(dlg, { opacity: 0, y: 24, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'power3.out' });
}
function closeModal() { const m = root && $('#bk2Modal', root); if (m && !m.hidden) m.hidden = true; }
function reminders(b) {
  const eve = addDays(startOfDay(b.start), -1); eve.setHours(20, 0, 0, 0);
  const h2 = new Date(b.start.getTime() - 2 * 3600e3);
  const row = (on, t, label) => {
    if (!on) return `<li class="off"><i>${icon('minus', 12)}</i><span>${label}</span><small>已關閉</small></li>`;
    const done = t < NOW();
    return `<li class="${done ? 'done' : ''}"><i>${icon(done ? 'check' : 'clock', 12)}</i><span>${label}</span><small>${mdw(t)} ${hm(t)}・${done ? '已送出' : '已排程'}</small></li>`;
  };
  return `<ul class="bk2-rem">${row(R.remindEve, eve, `前一天 LINE 提醒（${LANG_NAME[b.lang]}）`)}${row(R.remind2h, h2, '當天 2 小時前提醒')}</ul>`;
}
function bookingDetail(b) {
  const t = TYPES[b.type];
  const st = b.status === 'done' ? ['已完成', 'paid'] : b.status === 'noshow' ? ['爽約', 'pending'] : b.status === 'cancel' ? ['已取消', 'idle'] : b.depStatus === 'pending' ? ['待付訂金', 'pending'] : ['已確認', 'paid'];
  const dep = b.type === 'cake'
    ? `<div class="bk2-dep"><div class="bk2-dep-t"><span>訂金 ${Math.round(b.deposit / b.price * 100)}%</span><b>${money(b.deposit)}</b><em class="st ${b.depStatus === 'paid' ? 'paid' : 'pending'}">${b.depStatus === 'paid' ? '已收' : '待付'}</em></div>
       <div class="bk2-dep-bar"><i style="width:${b.depStatus === 'paid' ? b.deposit / b.price * 100 : 0}%"></i></div>
       <small>總價 ${money(b.price)}・${W.at}時付尾款 ${money(b.price - b.deposit)}${b.depStatus === 'paid' ? '・訂金已記入「預收款項」' : ''}</small></div>`
    : `<div class="bk2-dep"><div class="bk2-dep-t"><span>付款方式</span><b>${money(b.price)}</b><em class="st ${b.depStatus === 'full' || b.status === 'done' ? 'paid' : 'idle'}">${b.depStatus === 'full' ? '已線上付清' : b.status === 'done' ? `${W.pv}時已付` : `${W.pv}時付款`}</em></div><small>${W.pick}不收訂金，未付款者${W.pv}時 POS 結帳</small></div>`;
  const live = b.status === 'confirmed' && b.start > NOW();
  const sug = live ? suggest(b) : [];
  return `
    <div class="bk2-dlg-h" style="--tc:${t.color}">
      <div>${typeChip(b.type)}<span class="st ${st[1]}">${st[0]}</span><small class="mono">${b.id}</small></div>
      <button class="icon-btn" data-close aria-label="關閉">${icon('x', 16)}</button>
    </div>
    <div class="bk2-who"><span class="bk2-av" style="--tc:${t.color}">${esc(initial(b.customer))}</span><div><b>${esc(b.customer)}</b><small>${chIcon(b.channel, 18)} ${CH_NAME[b.channel]}・<span class="bk2-lang">${icon('globe', 12)} ${LANG_NAME[b.lang]}</span></small></div>
      <div class="bk2-when"><small>${b.type === 'cake' ? `${W.at}時間` : `${W.pv}時段`}</small><b>${mdw(b.start)} ${hm(b.start)}</b></div></div>
    <div class="bk2-dl">
      <div><small>品項</small><b>${esc(b.item)}</b></div>
      ${b.note ? `<div class="bk2-note"><small>${icon('file', 12)} 備註（AI 已從對話整理）</small><b>${esc(b.note)}</b></div>` : ''}
    </div>
    ${dep}
    ${live ? `<div class="bk2-sec"><h4>${icon('bell', 14)} 自動提醒</h4>${reminders(b)}</div>` : ''}
    ${live ? `<div class="bk2-sec"><h4>${icon('sparkle', 14)} 改期：AI 找到的空檔</h4><div class="bk2-sug">${sug.map(s => `<button class="bk2-sugb" data-move="${s.d.getTime()}"><b>${mdw(s.d)}</b><span>${hm(s.d)}・剩 ${s.left} 名額</span></button>`).join('') || '<small>近期沒有空檔</small>'}</div><small class="bk2-tip">改期後會自動用${LANG_NAME[b.lang]}通知客人，提醒時間也會跟著改。也可以直接在週曆上拖拉。</small></div>` : ''}
    <div class="bk2-dlg-act">
      ${live && b.depStatus === 'pending' ? `<button class="btn btn-ghost btn-sm" data-act="paylink">${icon('link', 14)} 再傳一次訂金連結</button><button class="btn btn-primary btn-sm" data-act="paid">${icon('coins', 14)} 模擬客人付款</button>` : ''}
      ${live && b.type === 'cake' && b.depStatus === 'paid' ? `<button class="btn btn-primary btn-sm" data-act="deliver">${icon('check', 14)} ${IS_AMEI ? '完成交貨' : (W.dv.startsWith('完成') ? W.dv : '完成' + W.dv)}・訂金轉收入</button>` : ''}
      ${live ? `<button class="btn btn-ghost btn-sm bk2-danger" data-act="cancel">${icon('x', 14)} 客人要取消</button>` : ''}
    </div>
    <div class="bk2-cancel" id="bk2CancelBox" hidden></div>`;
}
function classDetail(c) {
  const tk = classTaken(c);
  return `
    <div class="bk2-dlg-h" style="--tc:${TYPES.class.color}"><div>${typeChip('class')}<span class="st ${tk >= c.seats ? 'pending' : 'paid'}">${tk >= c.seats ? '額滿' : `剩 ${c.seats - tk} 位`}</span><small class="mono">${c.id}</small></div><button class="icon-btn" data-close aria-label="關閉">${icon('x', 16)}</button></div>
    <div class="bk2-who"><span class="bk2-av" style="--tc:${TYPES.class.color}">${icon('users', 18)}</span><div><b>${esc(c.title)}</b><small>${money(c.price)}/人・每班 ${c.seats} 人・約 2.5 小時</small></div><div class="bk2-when"><small>上課時間</small><b>${mdw(c.start)} ${hm(c.start)}</b></div></div>
    <div class="bk2-seatbar"><i style="width:${Math.min(100, tk / c.seats * 100)}%"></i><span>${tk}/${c.seats} 位</span></div>
    <div class="bk2-sec"><h4>${icon('user', 14)} 學員（${c.roster.length} 筆報名）</h4>
      <div class="bk2-mini-ros">${c.roster.map(r => `<div><span class="bk2-av sm" style="--tc:${TYPES.class.color}">${esc(initial(r.customer))}</span><b>${esc(r.customer)}</b>${r.pax > 1 ? `<em>${r.pax} 位</em>` : ''}<small>${LANG_NAME[r.lang]}</small>${r.allergy ? `<span class="chip-sm warn">${esc(r.allergy)}</span>` : ''}${r.hold ? '<span class="chip-sm">保留中</span>' : ''}</div>`).join('')}</div>
      ${c.waitlist.length ? `<small class="bk2-tip">候補：${c.waitlist.map(w => esc(w.customer)).join('、')}（有人取消時 AI 自動依序通知）</small>` : ''}
    </div>
    <div class="bk2-dlg-act"><button class="btn btn-primary btn-sm" data-act="roster">${icon('users', 14)} 到課程名單管理</button></div>`;
}
function onModalClick(e) {
  if (e.target.closest('[data-close]')) { closeModal(); return; }
  const id = $('#bk2Dlg', root).dataset.id; const b = byId(id); if (!b) return;
  const mv = e.target.closest('[data-move]');
  if (mv) { closeModal(); moveBooking(b, new Date(+mv.dataset.move)); return; }
  const a = e.target.closest('[data-act]'); if (!a) return;
  const act = a.dataset.act;
  if (act === 'roster') { closeModal(); V.selClass = b.id; renderClasses(true); $('.bk2-cls', root).scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  if (act === 'paylink') toast(`已重傳訂金連結給 ${b.customer}`, `用${LANG_NAME[b.lang]}透過 ${CH_NAME[b.channel]} 傳送，24 小時未付款 AI 會再提醒一次`, { kind: 'info', icon: icon('link', 18) });
  if (act === 'paid') { b.depStatus = 'paid'; pushLedger('in', b, b.deposit, `${b.customer} 付訂金`); toast(`收到訂金 ${money(b.deposit)}`, `${b.customer}・已記入「預收款項」（負債），交貨時才轉收入`, { icon: icon('coins', 18) }); store.log('pay', `收到 ${b.customer} ${W.ms}訂金 NT$ ${b.deposit.toLocaleString()}，記入預收款項`); refreshAll(); openDetail(b.id); }
  if (act === 'deliver') { closeModal(); deliver(b); }
  if (act === 'cancel') showCancel(b);
  if (act === 'cancel-ok') { closeModal(); cancelBooking(b); }
}
function refundOf(b, when = NOW()) {
  const days = daysBetween(when, b.start);
  const paid = b.type === 'class' ? b.price : (b.depStatus === 'paid' ? b.deposit : 0);
  if (days >= R.fullRefundDays) return { days, pct: 100, amt: paid, paid, rule: `${R.fullRefundDays} 天前取消，全額退` };
  if (days < R.noRefundDays) return { days, pct: 0, amt: 0, paid, rule: `${R.noRefundDays} 天內取消不退${R.allowMoveOnce ? '（可改期一次）' : ''}` };
  return { days, pct: R.midRefundPct, amt: Math.round(paid * R.midRefundPct / 100), paid, rule: `${R.noRefundDays}–${R.fullRefundDays} 天前取消，退 ${R.midRefundPct}%` };
}
function showCancel(b) {
  const box = $('#bk2CancelBox', root); const r = refundOf(b);
  box.hidden = false;
  box.innerHTML = b.type === 'pickup'
    ? `<p>${W.pick}沒有收訂金，取消後時段會自動釋出給其他客人。${b.depStatus === 'full' ? `已付的 ${money(b.price)} 會全額退回。` : ''}</p><button class="btn btn-sm bk2-dangerbtn" data-act="cancel-ok">確認取消並通知客人</button>`
    : `<p>距${W.at} <b>${r.days} 天</b>，套用規則「${r.rule}」：已收訂金 ${money(r.paid)}，${r.amt ? `退回 <b>${money(r.amt)}</b>` : '<b>不退款</b>'}${r.paid - r.amt > 0 ? `，${money(r.paid - r.amt)} 轉列「其他收入」` : ''}。${r.pct === 0 && R.allowMoveOnce ? 'AI 會先建議客人改期一次。' : ''}</p><button class="btn btn-sm bk2-dangerbtn" data-act="cancel-ok">確認取消並通知客人</button>`;
  gsap.from(box, { opacity: 0, y: 8, duration: 0.3 });
}
function cancelBooking(b) {
  const r = refundOf(b);
  b.status = 'cancel';
  if (b.type === 'cake' && b.depStatus === 'paid') pushLedger('cancel', b, r.paid, `${b.customer} 取消・退 ${n0(r.amt)}`);
  refreshAll();
  toast(`已取消 ${b.customer} 的預約`, b.type === 'cake' ? `${r.rule}：退款 ${money(r.amt)}，已用${LANG_NAME[b.lang]}通知客人；時段已釋出` : `時段已釋出，已用${LANG_NAME[b.lang]}通知客人`, { kind: 'warn', icon: icon('x', 18), duration: 5600 });
}
function deliver(b) {
  b.status = 'done';
  pushLedger('out', b, b.deposit, `${b.customer} ${W.dv}轉收入`);
  invSeq++;
  refreshAll();
  const box = $('#bk2Acct', root);
  box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => highlightStep(2), 450);
  toast(`${W.dv}完成・訂金轉為營業收入`, `${b.customer}：預收款項 −${money(net(b.deposit))}、營業收入 +${money(net(b.deposit) + net(b.price - b.deposit))}，已開立尾款發票 AB-${30428800 + invSeq}`, { icon: icon('receipt', 18), duration: 6000 });
  store.log('order', `${b.customer} ${W.main}${W.dv}，訂金由預收款項轉列營業收入，開立尾款發票`);
}
function refreshAll() { renderCal(); renderKpis(); renderTypes(); renderClasses(); renderAcct(); }

// ───────── 規則 ─────────
const RULE_DEF = [
  { k: 'depositPct', q: `${W.main}要先收多少訂金？`, h: '付了訂金，預約才算成立', opts: [[30, '30%'], [50, '50%'], [100, '全額']] },
  { k: 'leadDays', q: `${W.main}最晚幾天前要訂？`, h: W.notMade, step: [1, 7, '天前'] },
  { k: 'cancel', q: '客人取消怎麼退？', h: `依距離${W.at}／上課的天數自動判斷`, custom: true },
  { k: 'remind', q: '什麼時候提醒客人？', h: '用客人的語言、在客人下單的通路提醒', custom: true },
  { k: 'slotCap', q: `每 30 分鐘最多幾單${W.pv}？`, h: '避免門市一次擠太多人', step: [1, 8, '單'] },
  { k: 'closed', q: '哪幾天公休？', h: '公休日不開放預約，已排的 AI 協助改期', custom: true, half: true },
  { k: 'waitlistAuto', q: '有人取消時自動通知候補？', h: '課程與熱門時段空出來，AI 依序通知候補名單', sw: true, wide: true },
];
const sw = (k, on, label) => `<button class="bk2-sw ${on ? 'on' : ''}" data-sw="${k}" role="switch" aria-checked="${on}"><i></i><span>${label}</span></button>`;
function renderRules() {
  $('#bk2Rules', root).innerHTML = RULE_DEF.map(d => {
    let ctl = '';
    if (d.opts) ctl = `<div class="bk2-opts">${d.opts.map(([v, l]) => `<button class="${R[d.k] === v ? 'on' : ''}" data-opt="${d.k}" data-v="${v}">${l}</button>`).join('')}</div>`;
    else if (d.step) ctl = `<div class="bk2-step"><button data-step="${d.k}" data-d="-1" aria-label="減少">${icon('minus', 14)}</button><b>${R[d.k]}</b><span>${d.step[2]}</span><button data-step="${d.k}" data-d="1" aria-label="增加">${icon('plus', 14)}</button></div>`;
    else if (d.sw) ctl = sw(d.k, R[d.k], R[d.k] ? '開啟' : '關閉');
    else if (d.k === 'cancel') ctl = `<div class="bk2-pol">
        <div class="bk2-pol-bar"><span class="g" style="flex:3">${R.fullRefundDays} 天前・全退</span><span class="a" style="flex:2">${R.noRefundDays}–${R.fullRefundDays} 天・退 ${R.midRefundPct}%</span><span class="r" style="flex:2">${R.noRefundDays} 天內・不退</span></div>
        <div class="bk2-pol-ctl"><div class="bk2-opts sm">${[5, 7, 14].map(v => `<button class="${R.fullRefundDays === v ? 'on' : ''}" data-opt="fullRefundDays" data-v="${v}">${v} 天前全退</button>`).join('')}</div>${sw('allowMoveOnce', R.allowMoveOnce, '3 天內可改期一次')}</div></div>`;
    else if (d.k === 'remind') ctl = `<div class="bk2-sws">${sw('remindEve', R.remindEve, '前一天晚上 8 點')}${sw('remind2h', R.remind2h, '當天 2 小時前')}${sw('remindMap', R.remindMap, '附地圖與停車資訊')}</div>`;
    else if (d.k === 'closed') ctl = `<div class="bk2-days">${[1, 2, 3, 4, 5, 6, 0].map(x => `<button class="${R.closed.includes(x) ? 'on' : ''}" data-day="${x}">${DOW_ZH[x]}</button>`).join('')}</div>`;
    return `<div class="bk2-rule ${(d.custom && !d.half) || d.wide ? 'wide' : ''} ${d.sw ? 'row' : ''}"><div class="bk2-rule-q"><b>${d.q}</b><small>${d.h}</small></div>${ctl}</div>`;
  }).join('');
  sayText();
}
function sayText() {
  const rem = [R.remindEve && '前一天晚上 8 點', R.remind2h && `當天${W.at}前 2 小時`].filter(Boolean);
  const closed = R.closed.length ? `每週${R.closed.slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(x => DOW_ZH[x]).join('、')}公休` : '全年無休';
  $('#bk2Say', root).innerHTML = `「${W.main}請在 <b>${R.leadDays} 天前</b>預訂，預約時先付 <b>${R.depositPct === 100 ? '全額' : R.depositPct + '% 訂金'}</b>。${W.at}前 <b>${R.fullRefundDays} 天</b>以上取消可全額退費，${R.noRefundDays}–${R.fullRefundDays} 天退 ${R.midRefundPct}%，<b>${R.noRefundDays} 天內</b>恕不退費${R.allowMoveOnce ? '，但可以免費改期一次' : ''}。${rem.length ? `我們會在${rem.join('和')}用 LINE 提醒您${R.remindMap ? '，並附上地圖與停車資訊' : ''}。` : ''}門市${closed}。」`;
}
function onRuleClick(e) {
  const o = e.target.closest('[data-opt]'), s = e.target.closest('[data-step]'), w = e.target.closest('[data-sw]'), dy = e.target.closest('[data-day]');
  let msg = '';
  if (o) { R[o.dataset.opt] = +o.dataset.v; msg = o.dataset.opt === 'depositPct' ? `${W.main}訂金改為 ${R.depositPct === 100 ? '全額' : R.depositPct + '%'}（新預約適用，既有訂單不變）` : `${W.at}前 ${R.fullRefundDays} 天以上取消可全額退`; }
  if (s) { const k = s.dataset.step, def = RULE_DEF.find(x => x.k === k); R[k] = Math.max(def.step[0], Math.min(def.step[1], R[k] + +s.dataset.d)); msg = k === 'slotCap' ? `每 30 分鐘最多 ${R.slotCap} 單${W.pv}，行事曆已套用` : `${W.main}需 ${R.leadDays} 天前預訂`; }
  if (w) { const k = w.dataset.sw; R[k] = !R[k]; msg = `${w.textContent.trim().replace(/開啟|關閉/, '') || RULE_DEF.find(x => x.k === k)?.q}：${R[k] ? '開啟' : '關閉'}`; }
  if (dy) {
    const x = +dy.dataset.day; const i = R.closed.indexOf(x);
    if (i >= 0) R.closed.splice(i, 1); else R.closed.push(x);
    const affected = DATA.list.filter(b => b.status === 'confirmed' && b.start > NOW() && b.start.getDay() === x).length;
    msg = i >= 0 ? `週${DOW_ZH[x]}恢復營業，開放預約` : `週${DOW_ZH[x]}設為公休${affected ? `，有 ${affected} 筆已排預約，AI 會逐一聯絡客人改期` : ''}`;
  }
  if (!msg) return;
  renderRules(); renderTypes(); renderKpis(); renderCal();
  gsap.fromTo('#bk2Say', { opacity: 0.3 }, { opacity: 1, duration: 0.5 });
  toast('規則已更新', msg, { icon: icon('wand', 18) });
}

// ───────── 課程名單 ─────────
function upcomingClasses() { return DATA.classes.filter(c => c.start > addDays(NOW(), -1)).slice(0, 6); }
function renderClasses(anim) {
  const list = upcomingClasses();
  if (!list.find(c => c.id === V.selClass)) V.selClass = list[0]?.id;
  $('#bk2ClsChip', root).textContent = `每班 ${R.classSeats} 人・${money(R.classPrice)}/人`;
  $('#bk2ClsList', root).innerHTML = list.map(c => {
    const tk = classTaken(c), full = tk >= c.seats;
    return `<button class="bk2-crow ${c.id === V.selClass ? 'on' : ''}" data-cls="${c.id}">
      <span class="bk2-cdate"><b>${c.start.getMonth() + 1}/${c.start.getDate()}</b><small>週${DOW_ZH[c.start.getDay()]} ${hm(c.start)}</small></span>
      <span class="bk2-cmain"><b>${esc(c.title)}</b><span class="bk2-cbar ${full ? 'full' : ''}"><i style="width:${Math.min(100, tk / c.seats * 100)}%"></i></span></span>
      <span class="bk2-cnum"><b>${tk}<small>/${c.seats}</small></b>${full ? `<em class="full">${c.waitlist.length ? `候補 ${c.waitlist.length}` : '額滿'}</em>` : `<em>剩 ${c.seats - tk} 位</em>`}</span>
      ${c.noticeSent ? `<span class="bk2-sent" title="已寄課前通知">${icon('check', 12)}</span>` : ''}</button>`;
  }).join('');
  renderRoster(anim);
}
function langMix(c) { const m = {}; c.roster.forEach(r => { m[r.lang] = (m[r.lang] || 0) + 1; }); return Object.entries(m).map(([l, n]) => `${LANG_NAME[l]} ×${n}`).join('、'); }
function renderRoster(anim) {
  const c = DATA.classes.find(x => x.id === V.selClass); const host = $('#bk2Roster', root);
  if (!c) { host.innerHTML = ''; return; }
  const tk = classTaken(c);
  host.innerHTML = `
    <div class="bk2-ros-h"><div><b>${esc(c.title)}</b><small>${mdw(c.start)} ${hm(c.start)}・已收 ${money(c.roster.filter(r => r.paid).reduce((s, r) => s + r.pax * c.price, 0))}（預收）</small></div>
      <button class="btn btn-primary btn-sm" data-notice ${c.noticeSent ? 'disabled' : ''}>${icon('send', 14)} ${c.noticeSent ? '課前通知已寄出' : '一鍵寄課前通知'}</button></div>
    <div class="bk2-ros-list">${c.roster.map((r, i) => `<div class="bk2-ros ${r.notified || c.noticeSent ? 'sent' : ''}" data-ri="${i}">
        <span class="bk2-av sm" style="--tc:${TYPES.class.color}">${esc(initial(r.customer))}</span>
        <span class="bk2-ros-n"><b>${esc(r.customer)}</b><small>${chIcon(r.channel, 16)} ${CH_NAME[r.channel]}・${LANG_NAME[r.lang]}</small></span>
        ${r.pax > 1 ? `<em class="bk2-pax">${r.pax} 位</em>` : ''}${r.allergy ? `<span class="chip-sm warn">${esc(r.allergy)}</span>` : ''}${r.hold ? '<span class="chip-sm">候補遞補・保留中</span>' : ''}
        <span class="bk2-ros-st">${icon('check', 13)}</span></div>`).join('')}
      ${Array.from({ length: Math.max(0, c.seats - tk) }, () => `<div class="bk2-ros empty"><span class="bk2-av sm">${icon('plus', 12)}</span><span class="bk2-ros-n"><b>空位</b><small>AI 會在 LINE 熟客群推播</small></span></div>`).join('')}
    </div>
    <div class="bk2-wait"><b>${icon('clock', 13)} 候補名單</b>${c.waitlist.length ? c.waitlist.map((w, i) => `<span class="bk2-wchip"><em>#${i + 1}</em>${esc(w.customer)}<small>${LANG_NAME[w.lang]}</small>${tk < c.seats ? `<button data-promote="${i}">遞補</button>` : ''}</span>`).join('') : '<small>目前沒有候補</small>'}</div>
    <small class="bk2-tip">課前通知內容：時間地點、停車資訊、穿著建議、${FOODISH || IS_AMEI ? '過敏確認' : '需求確認'}；會用 ${langMix(c) || '客人語言'} 分別發送。</small>`;
  if (anim) gsap.fromTo($$('.bk2-ros', host), { opacity: 0, x: -10 }, { opacity: 1, x: 0, stagger: 0.03, duration: 0.3 });
}
async function onRosterClick(e) {
  const c = DATA.classes.find(x => x.id === V.selClass); if (!c) return;
  const p = e.target.closest('[data-promote]');
  if (p) {
    const w = c.waitlist.splice(+p.dataset.promote, 1)[0];
    c.roster.push({ ...w, allergy: '', paid: false, hold: true, notified: false });
    renderClasses(); renderCal(); renderKpis();
    toast(`已通知候補 ${w.customer}`, `「${waitNotice(w.lang, w.customer, whenIn(w.lang, c.start), c.title)}」`, { kind: 'info', icon: icon('send', 18), duration: 6000 });
    return;
  }
  const n = e.target.closest('[data-notice]');
  if (n && !c.noticeSent) {
    n.disabled = true; n.innerHTML = `<span class="bk2-spin"></span> AI 寄送中…`;
    const rows = $$('.bk2-ros:not(.empty)', $('#bk2Roster', root));
    for (let i = 0; i < c.roster.length; i++) {
      c.roster[i].notified = true;
      const row = rows[i]; if (row) { row.classList.add('sent'); gsap.fromTo(row, { backgroundColor: 'rgba(45,182,116,0.25)' }, { backgroundColor: 'rgba(45,182,116,0.05)', duration: 0.8 }); }
      await sleep(260);
    }
    c.noticeSent = true;
    const first = c.roster.find(r => r.lang !== 'zh') || c.roster[0];
    toast(`已寄出 ${c.roster.length} 封課前通知`, `${langMix(c)}。範例（${LANG_NAME[first.lang]}）：「${classNotice(first.lang, first.customer, whenIn(first.lang, c.start), c.title)}」`, { icon: icon('send', 18), duration: 6500 });
    renderClasses();
  }
}

// ───────── 訂金與會計 ─────────
function pushLedger(kind, b, amt, label) { V.ledger.unshift({ kind, amt, label, t: NOW() }); V.ledger = V.ledger.slice(0, 5); }
function renderAcct() {
  const k = kpis();
  const price = IS_AMEI ? 1400 : (BK_ITEMS[0]?.price || 1400), dep = Math.round(price * R.depositPct / 100), tail = price - dep;
  const dn = net(dep), dt = dep - dn, tn = net(tail), tt = tail - tn;
  const soon = DATA.list.filter(b => b.type === 'cake' && b.status === 'confirmed' && b.depStatus === 'paid' && b.start > NOW()).slice(0, 4);
  const je = (rows) => `<table class="bk2-je"><tbody>${rows.map(([dc, name, amt, cls]) => `<tr class="${dc} ${cls || ''}"><td>${dc === 'dr' ? '借' : '貸'}</td><td>${name}</td><td class="r">${n0(amt)}</td></tr>`).join('')}</tbody></table>`;
  $('#bk2Acct', root).innerHTML = `
    <div class="card-h"><h3>${icon('book', 18)} 訂金怎麼記帳？<small>收到訂金 ≠ 賺到錢，這點報稅很重要</small></h3><span class="chip-sm">示意分錄・以 ${money(price)} 的${IS_AMEI ? ' 6 吋蛋糕' : `「${esc(BK_ITEMS[0]?.item || W.main)}」`}、訂金 ${R.depositPct}% 為例</span></div>
    <div class="bk2-acct-grid">
      <div class="bk2-flow">
        <div class="bk2-fs" data-step="0">
          <div class="bk2-fs-h"><span>1</span><div><b>收到訂金</b><small>客人 LINE Pay 付 ${money(dep)}</small></div></div>
          ${je([['dr', '銀行存款（LINE Pay）', dep], ['cr', '預收款項（負債）', dn, 'hl'], ['cr', '銷項稅額 5%', dt]])}
          <p>${IS_AMEI ? '蛋糕還沒交' : `${W.ms}還沒${W.dv}`}，這筆錢其實是「${W.owe}」，先記在<b>負債</b>，不能算當月營收。</p>
        </div>
        <div class="bk2-arrow">${icon('arrow', 18)}</div>
        <div class="bk2-fs" data-step="1">
          <div class="bk2-fs-h"><span>2</span><div><b>開立訂金發票</b><small>收款當天，AI 自動開</small></div></div>
          <div class="bk2-inv"><div><small>電子發票・訂金</small><b>${money(dep)}</b></div><div><small>銷售額</small><span>${n0(dn)}</span></div><div><small>稅額</small><span>${n0(dt)}</span></div></div>
          <p>台灣規定：<b>交貨前先收的貨款，收款時就要開發票</b>（課程費也是收款時開）。所以訂金要開發票，但還不是收入——兩件事要分開看。</p>
        </div>
        <div class="bk2-arrow">${icon('arrow', 18)}</div>
        <div class="bk2-fs" data-step="2">
          <div class="bk2-fs-h"><span>3</span><div><b>${W.dv}・轉為營業收入</b><small>${W.at}付尾款 ${money(tail)}，開尾款發票</small></div></div>
          ${je([['dr', '銀行存款／現金', tail], ['dr', '預收款項', dn, 'hl'], ['cr', '營業收入', dn + tn, 'hl2'], ['cr', '銷項稅額 5%', tt]])}
          <p>${IS_AMEI ? '蛋糕交到客人手上' : `${W.ms}${W.dv}給客人`}，這時才認列收入 ${money(dn + tn)}（未稅），預收款項歸零。</p>
        </div>
      </div>
      <div class="bk2-acct-side">
        <div class="bk2-bal"><small>目前預收款項餘額（負債）</small><b id="bk2Bal">NT$ ${n0(k.paid)}</b><span>${W.ms}訂金 ${n0(k.paidCake)}・課程費 ${n0(k.paidCls)}</span></div>
        <div class="bk2-soon"><div class="bk2-soon-h"><b>即將${W.dv}、轉為收入</b><button class="btn btn-ghost btn-sm" data-deliver ${soon.length ? '' : 'disabled'}>${icon('check', 13)} 示範：${W.dv}轉收入</button></div>
          ${soon.map(b => `<div class="bk2-srow"><span>${mdw(b.start)}</span><b>${esc(b.customer)}</b><em>${money(b.deposit)}</em></div>`).join('') || '<small>近期沒有待交貨的訂金</small>'}
          ${V.ledger.length ? `<div class="bk2-led">${V.ledger.map(l => `<div class="${l.kind}"><i>${l.kind === 'in' ? '＋' : '−'}</i><span>${esc(l.label)}</span><b>${n0(l.amt)}</b></div>`).join('')}</div>` : ''}
        </div>
      </div>
    </div>
    <div class="bk2-why">
      <div><h4>${icon('tax', 15)} 為什麼對報稅很重要</h4>
        <ul>
          <li><b>營業稅：</b>訂金收款當期就要開發票、申報銷項稅額；漏開會被補稅還可能受罰。系統收款同時自動開立。</li>
          <li><b>營所稅與損益：</b>收入要等交貨（或課程上完）才認列。月底、年底還沒交貨的訂金留在「預收款項」，不會把下個月的錢算進這個月，損益才正確。</li>
          <li><b>跨年要特別注意：</b>12 月收訂金、隔年 1 月交貨，收入算在隔年度。系統結帳時會列出跨期訂金清單給記帳士。</li>
        </ul></div>
      <div><h4>${icon('receipt', 15)} 客人取消時</h4>
        <ul>
          <li><b>退訂金：</b>借 預收款項、銷項稅額／貸 銀行存款，並開立「銷貨退回、進貨退出或折讓證明單」。</li>
          <li><b>不退（沒收訂金）：</b>借 預收款項／貸 其他收入。已開發票的稅務處理，依記帳士建議辦理。</li>
          <li><b>小規模營業人</b>（免用統一發票、國稅局查定課徵）不用自己開發票，但帳上一樣先記預收款項。</li>
        </ul></div>
    </div>
    <small class="bk2-disc">${icon('alert', 12)} 以上為示意分錄與一般原則說明，實際帳務與稅務處理請依您的記帳士／會計師判斷。</small>`;
}
function highlightStep(i) {
  const s = $(`.bk2-fs[data-step="${i}"]`, root); if (!s) return;
  s.classList.add('glow'); setTimeout(() => s.classList.remove('glow'), 2600);
  const bal = $('#bk2Bal', root); if (bal) gsap.fromTo(bal, { scale: 1.12, color: '#ffcf8a' }, { scale: 1, color: '#eafff4', duration: 0.8, clearProps: 'all' });
}
function onAcctClick(e) {
  if (!e.target.closest('[data-deliver]')) return;
  const b = DATA.list.find(x => x.type === 'cake' && x.status === 'confirmed' && x.depStatus === 'paid' && x.start > NOW());
  if (b) deliver(b);
}

// ───────── AI 自動預約示範 ─────────
const chat = () => $('#bk2Chat', root);
function phoneTop(s, name, lang) {
  $('#bk2PhTop', root).innerHTML = `<span class="bk2-ph-av">${esc(initial(name))}</span><div><b>${esc(name)}</b><small>${chIcon(s.ch, 16)} ${CH_NAME[s.ch]}・${LANG_NAME[lang]}</small></div><span class="bk2-live"><i></i>AI 代答中</span>`;
}
function setSteps(names, i) {
  $('#bk2Steps', root).innerHTML = names.map((n, k) => `<span class="${k < i ? 'done' : k === i ? 'on' : ''}"><i>${k < i ? icon('check', 11) : k + 1}</i>${n}</span>`).join('');
}
function idleChat() {
  phoneTop(SCEN[0], '佐藤 ゆき', 'ja');
  chat().innerHTML = `<div class="bk2-idle">${icon('chat', 30)}<b>按「開始示範」</b><span>${IS_AMEI ? '看 AI 接一位日本客人的生日蛋糕預約' : `看 AI 接一位日本客人的${W.main}`}：查空檔 → 推薦時段 → 確認客製內容 → 傳 ${R.depositPct}% 訂金連結 → 付款後自動排進行事曆。</span></div>`;
  setSteps(['查空檔', '推薦時段', '確認客製', '收訂金', '已確認'], -1);
  markScen();
}
function markScen() { $$('.bk2-scen-b', root).forEach((b, i) => b.classList.toggle('on', i === V.scen)); }
function add(node) {
  const c = chat(); c.appendChild(node);
  gsap.fromTo(node, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' });
  c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' });
  return node;
}
function makeCtx(my) {
  const ok = () => { if (my !== runId) throw new Error('abort'); };
  const w = async (ms) => { await sleep(ms); ok(); };
  const cust = async (text, tr) => { await w(500); add(el(`<div class="bk2-msg cust"><div class="bk2-bub">${esc(text)}${tr ? `<small class="bk2-tr">${icon('globe', 11)} ${esc(tr)}</small>` : ''}</div></div>`)); await w(900); };
  const ai = async (text, tr, extra = '') => {
    const typing = add(el(`<div class="bk2-msg ai"><div class="bk2-bub typing"><i></i><i></i><i></i></div></div>`));
    await w(800); typing.remove();
    add(el(`<div class="bk2-msg ai"><div class="bk2-bub"><em class="bk2-aitag">${icon('sparkle', 10)} AI</em>${esc(text)}${extra}${tr ? `<small class="bk2-tr">${icon('globe', 11)} ${esc(tr)}</small>` : ''}</div></div>`));
    await w(900);
  };
  const think = async (text, result) => {
    const n = add(el(`<div class="bk2-think"><span class="bk2-spin sm"></span><span>${esc(text)}</span></div>`));
    await w(1100);
    n.classList.add('ok'); n.innerHTML = `${icon('check', 12)}<span>${esc(result || text)}</span>`;
    await w(400);
  };
  const sys = async (html, kind = '') => { add(el(`<div class="bk2-sys ${kind}">${html}</div>`)); await w(800); };
  const card = async (html) => { const n = add(el(`<div class="bk2-msg ai"><div class="bk2-card">${html}</div></div>`)); await w(700); return n; };
  const pay = async (amount, label, payer) => {
    const n = await card(`<div class="bk2-pay"><div class="bk2-pay-h">${icon('coins', 15)} ${esc(label)}</div><b>${money(amount)}</b><button class="bk2-paybtn">${LINE_SVG(13)} LINE Pay 付款（示範）</button><small>連結 24 小時內有效</small></div>`);
    await w(1300);
    const btn = $('.bk2-paybtn', n); btn.classList.add('press'); await w(350);
    btn.classList.add('paid'); btn.innerHTML = `${icon('check', 13)} 已付款`;
    gsap.fromTo(btn, { scale: 0.9 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' });
    await w(500);
    if (payer) await cust(payer[0], payer[1]);
    return n;
  };
  const slots = async (title, list, pickIdx) => {
    const n = await card(`<div class="bk2-slots"><small>${esc(title)}</small>${list.map((s, i) => `<span class="${i === pickIdx ? 'rec' : ''}"><b>${s.label}</b><em>${s.sub}</em>${i === pickIdx ? '<i>AI 推薦</i>' : ''}</span>`).join('')}</div>`);
    return n;
  };
  return { ok, w, cust, ai, think, sys, card, pay, slots };
}
async function runScenario(i) {
  const my = ++runId;
  V.scen = i; V.started = true; markScen();
  const btn = $('#bk2Run', root);
  btn.disabled = true; btn.innerHTML = `<span class="bk2-spin"></span> AI 處理中…`;
  chat().innerHTML = '';
  const ctx = makeCtx(my);
  try {
    await (IS_AMEI ? [scCake, scClass, scMove, scCancel] : [gCake, gClass, gMove, gCancel])[i](ctx);
  } catch (e) { if (e.message !== 'abort') throw e; return; }
  if (my !== runId) return;
  V.scen = (i + 1) % SCEN.length;
  btn.disabled = false; btn.innerHTML = `${icon('refresh', 16)} 模擬下一位客人：${SCEN[V.scen].name}`;
  $('#bk2RunNote', root).textContent = '也可以點上方 1–4 直接切換情境';
}

function flyTo(fromNode, b) {
  // 切換到該預約所在的週／月，讓區塊出現在行事曆
  if (V.mode === 'week') V.week = weekStart(b.start); else V.month = new Date(b.start.getFullYear(), b.start.getMonth(), 1);
  renderCal();
  const target = $(`#bk2Cal [data-id="${b.id}"]`, root);
  if (!target || !fromNode) { flashBooking(b.id); return; }
  const fr = fromNode.getBoundingClientRect(), tr = target.getBoundingClientRect();
  if (tr.top > innerHeight || tr.bottom < 0) { flashBooking(b.id); return; }
  const fly = el(`<div class="bk2-fly" style="--tc:${TYPES[b.type].color}">${icon(TYPES[b.type].icon, 14)}<b>${esc(b.type === 'class' ? b.title : b.customer)}</b></div>`);
  document.body.appendChild(fly);
  target.style.opacity = '0';
  gsap.fromTo(fly, { left: fr.left + fr.width / 2 - 70, top: fr.top + fr.height / 2 - 18, scale: 1.1, opacity: 0 },
    { opacity: 1, duration: 0.2 });
  gsap.to(fly, { left: tr.left + tr.width / 2 - 70, top: tr.top + tr.height / 2 - 18, scale: 0.7, duration: 1.0, ease: 'power3.inOut', delay: 0.15,
    onComplete: () => { fly.remove(); target.style.opacity = ''; flashBooking(b.id); } });
}
function nextDay(from, pred) { let d = startOfDay(from); for (let i = 0; i < 30; i++) { if (pred(d)) return d; d = addDays(d, 1); } return d; }
const JA_DOW = ['日', '月', '火', '水', '木', '金', '土'];

// 情境 1：日文客人訂 6 吋生日蛋糕
async function scCake(x) {
  const s = SCEN[0];
  phoneTop(s, '佐藤 ゆき', 'ja');
  const STEPS = ['查空檔', '推薦時段', '確認客製', '收訂金', '已確認'];
  setSteps(STEPS, 0);
  DATA.list = DATA.list.filter(b => b.demo !== 'sato');
  const probe = { type: 'cake', start: new Date(0) };
  // 找最近一個有產能、也有取貨空檔的週末（最多往後看 8 週）
  const okDay = (d) => (d.getDay() === 6 || d.getDay() === 0) && !R.closed.includes(d.getDay()) && cakesOn(d) < R.cakeCap;
  let day = nextDay(addDays(T0(), R.leadDays), okDay), cand = freeSlots(probe, day, 14, 17.5, 8);
  for (let k = 0; k < 16 && !cand.length; k++) { day = nextDay(addDays(day, 1), okDay); cand = freeSlots(probe, day, 14, 17.5, 8); }
  const md = `${day.getMonth() + 1}/${day.getDate()}`;
  await x.cust(`こんにちは！${md}（${JA_DOW[day.getDay()]}）に6号のバースデーケーキを予約できますか？`, `你好！${md}（${DOW_ZH[day.getDay()]}）可以預訂 6 吋生日蛋糕嗎？`);
  await x.think(`查詢 ${mdw(day)} 蛋糕產能與取貨空檔…`, `${mdw(day)} 蛋糕產能剩 ${R.cakeCap - cakesOn(day)} 個・距今 ${daysBetween(NOW(), day)} 天，符合「${R.leadDays} 天前預訂」`);
  setSteps(STEPS, 1);
  if (!cand.length) {
    await x.ai('申し訳ございません、8 週間先まで週末のお受け取り枠が満席です。キャンセル待ちにご登録しますか？', '很抱歉，未來 8 週的週末取貨時段都已額滿，要幫您登記候補嗎？');
    await x.sys(`${icon('clock', 13)} 已登記候補，有空位時 AI 會用日文通知客人`, 'ok');
    return;
  }
  const opts = [cand[0], cand[Math.floor(cand.length / 2)], cand[cand.length - 1]].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);
  const rec = opts.reduce((bi, o, i) => (o.left > opts[bi].left ? i : bi), 0);
  await x.ai(`お問い合わせありがとうございます！${md}は下記の時間にお受け取りいただけます。`, `感謝詢問！${md} 以下時段可以取貨。`);
  await x.slots(`${mdw(day)} 可取貨時段`, opts.map(o => ({ label: hm(o.d), sub: `剩 ${o.left} 名額` })), rec);
  const pick = opts[rec].d;
  await x.cust(`${hm(pick)}でお願いします。プレートに「Happy Birthday ゆい」と書いてもらえますか？いちご多めで！`, `${hm(pick)} 麻煩了。巧克力牌可以寫「Happy Birthday ゆい」嗎？草莓多一點！`);
  setSteps(STEPS, 2);
  const price = 1500, dep = Math.round(price * R.depositPct / 100);
  await x.ai('かしこまりました。ご注文内容をご確認ください。', '好的，請確認訂單內容。',
    `<div class="bk2-sum"><div><span>6号 いちご生クリーム</span><b>NT$1,400</b></div><div><span>いちご増量</span><b>+NT$100</b></div><div><span>プレート</span><b>Happy Birthday ゆい</b></div><div><span>お受け取り</span><b>${md}（${JA_DOW[day.getDay()]}）${hm(pick)}</b></div><div class="t"><span>合計</span><b>NT$1,500</b></div></div>`);
  await x.ai(`ご予約確定には${R.depositPct === 100 ? '全額' : `${R.depositPct}%の内金`}（NT$${n0(dep)}）のお支払いをお願いしております。${R.fullRefundDays}日前までのキャンセルは全額返金です。`, `確認預約需先付${R.depositPct === 100 ? '全額' : ` ${R.depositPct}% 訂金`}（NT$${n0(dep)}）。${R.fullRefundDays} 天前取消全額退。`);
  setSteps(STEPS, 3);
  const payNode = await x.pay(dep, `訂金 ${R.depositPct}%・6 吋生日蛋糕`, ['お支払いしました！', '付好了！']);
  await x.sys(`${icon('coins', 13)} 已收訂金 ${money(dep)}（LINE Pay）・記入「預收款項」・訂金發票已自動開立`, 'ok');
  setSteps(STEPS, 4);
  const b = { id: `BK-${seq++}`, type: 'cake', start: pick, dur: 30, customer: '佐藤 ゆき', lang: 'ja', channel: 'line', item: '6 吋草莓鮮奶油蛋糕（草莓加量）', price, deposit: dep,
    depStatus: 'paid', status: 'confirmed', note: '巧克力牌寫「Happy Birthday ゆい」・草莓加量（AI 由日文翻譯）', moved: 0, demo: 'sato', isNew: true };
  DATA.list.push(b); DATA.list.sort((p, q) => p.start - q.start);
  pushLedger('in', b, dep, '佐藤 ゆき 蛋糕訂金');
  store.log('pay', `AI 完成預約：佐藤 ゆき 6 吋生日蛋糕，收訂金 NT$ ${dep.toLocaleString()}，記入預收款項`);
  flyTo(payNode, b);
  renderKpis(); renderTypes(); renderAcct();
  await x.ai(`ご予約が確定しました！前日20時と当日2時間前にLINEでお知らせします。`, `預約完成！前一天晚上 8 點和當天 2 小時前會用 LINE 提醒您。`);
  setSteps(STEPS, 5);
  toast('AI 完成一筆客製蛋糕預約', `佐藤 ゆき・${mdw(pick)} ${hm(pick)}・訂金 ${money(dep)} 已收，已排進行事曆`, { icon: icon('calendar', 18) });
}

// 情境 2：中文客人報名烘焙課（2 位）
async function scClass(x) {
  const s = SCEN[1];
  phoneTop(s, '王太太', 'zh');
  const STEPS = ['查名額', '推薦場次', '確認過敏', '收課程費', '加入名單'];
  setSteps(STEPS, 0);
  DATA.classes.forEach(c => { c.roster = c.roster.filter(r => r.demo !== 'wang'); });
  await x.cust('請問週末的烘焙課還有位子嗎？我想跟女兒一起上，2 位。');
  const up = DATA.classes.filter(c => c.start > addDays(NOW(), 1) && c.fixed !== 'full').slice(0, 4);
  let pick = up.find(c => c.seats - classTaken(c) >= 2);
  if (!pick) { pick = up[0]; while (pick.seats - classTaken(pick) < 2) pick.roster.pop(); }
  await x.think('查詢近期烘焙小班課名額…', `找到 ${up.length} 個場次・${up.filter(c => c.seats - classTaken(c) >= 2).length} 場還有 2 個以上空位`);
  setSteps(STEPS, 1);
  await x.ai('有的！近期場次如下，每人 NT$1,200（含材料，成品可帶回家）：');
  const opt = up.slice(0, 3);
  await x.slots('近期烘焙小班課', opt.map(c => { const l = c.seats - classTaken(c); return { label: `${c.start.getMonth() + 1}/${c.start.getDate()}（${DOW_ZH[c.start.getDay()]}）${esc(c.title)}`, sub: l >= 2 ? `剩 ${l} 位` : l === 1 ? '剩 1 位' : '額滿・可候補' }; }), opt.indexOf(pick) >= 0 ? opt.indexOf(pick) : 0);
  await x.cust(`那我們報 ${pick.start.getMonth() + 1}/${pick.start.getDate()} 的${pick.title}！女兒對堅果過敏，可以嗎？`);
  setSteps(STEPS, 2);
  await x.think('查詢課程配方過敏原…', `「${pick.title}」可改用無堅果配方`);
  const amt = pick.price * 2;
  await x.ai(`沒問題，已幫您備註「堅果過敏」，老師會準備無堅果材料。2 位共 NT$${n0(amt)}，需全額預付完成報名；${R.fullRefundDays} 天前取消可全額退費。`);
  setSteps(STEPS, 3);
  const payNode = await x.pay(amt, `課程費・${pick.title} ×2`, ['付好了，謝謝！']);
  await x.sys(`${icon('coins', 13)} 已收課程費 ${money(amt)}・記入「預收款項」，上課當天轉為收入・已開立發票`, 'ok');
  setSteps(STEPS, 4);
  pick.roster.push({ customer: '王太太', lang: 'zh', channel: 'line', pax: 2, allergy: '堅果過敏', paid: true, notified: false, demo: 'wang' });
  pick.noticeSent = false;
  V.selClass = pick.id;
  store.log('pay', `AI 完成課程報名：王太太 2 位（${pick.title}），收課程費 NT$ ${amt.toLocaleString()}`);
  renderClasses(true); renderKpis(); renderTypes(); renderAcct();
  flyTo(payNode, pick);
  const row = $(`.bk2-crow[data-cls="${pick.id}"]`, root); if (row) gsap.fromTo(row, { boxShadow: '0 0 0 2px #F0A531' }, { boxShadow: '0 0 0 0 rgba(0,0,0,0)', duration: 1.6 });
  await x.ai(`報名完成！上課前一天會傳課前通知給您（地點、停車、穿著建議）。${classTaken(pick) >= pick.seats ? '這班已經額滿囉，您們剛好搶到最後的位子！' : ''}`);
  setSteps(STEPS, 5);
  toast('AI 完成一筆課程報名', `王太太 2 位・${mdw(pick.start)} ${pick.title}・${classTaken(pick)}/${pick.seats} 位`, { icon: icon('users', 18) });
}

// 情境 3：熟客改期
async function scMove(x) {
  const s = SCEN[2];
  phoneTop(s, '陳先生', 'zh');
  const STEPS = ['找到訂單', '檢查規則', '找空檔', '改期', '更新提醒'];
  setSteps(STEPS, 0);
  const b = DATA.list.find(q => q.fixed === 'chen');
  if (!b) { await x.ai('目前查不到您的訂單，已轉給阿美確認，稍後回覆您。'); return; }
  if (!b.orig) b.orig = new Date(b.start);
  b.start = new Date(b.orig); b.status = 'confirmed'; b.moved = 0;
  if (V.mode === 'week') V.week = weekStart(b.start);
  renderCal();
  const target = nextDay(addDays(b.start, 1), d => !R.closed.includes(d.getDay()) && freeSlots(b, d, 14, 18, 8).length >= 2);
  await x.cust(`不好意思，我 ${mdw(b.start)} 要拿的蛋糕，可以改到 ${mdw(target)} 下午嗎？`);
  await x.think('辨識 LINE 帳號・查詢訂單…', `找到訂單 ${b.id}：${b.item}・${mdw(b.start)} ${hm(b.start)}・訂金已收 ${money(b.deposit)}`);
  setSteps(STEPS, 1);
  const days = daysBetween(NOW(), b.start);
  await x.think('套用改期規則…', days >= R.noRefundDays ? `距取貨 ${days} 天・可免費改期` : `距取貨 ${days} 天・3 天內可改期一次`);
  setSteps(STEPS, 2);
  const opts = freeSlots(b, target, 14, 18, 8).filter((o, i, a) => i % 2 === 0).slice(0, 3);
  if (!opts.length) {
    await x.ai('不好意思，接下來 30 天的下午取貨時段都滿了，已幫您登記候補，一有空位會馬上通知您；原本的取貨時間也先幫您保留。');
    return;
  }
  const pickI = Math.min(2, opts.length - 1);
  await x.ai(`可以的！${mdw(target)} 下午這幾個時段有空：`);
  await x.slots(`${mdw(target)} 下午`, opts.map(o => ({ label: hm(o.d), sub: `剩 ${o.left} 名額` })), -1);
  const pick = opts[pickI].d;
  await x.cust(`${pick.getHours() - 12} 點${pick.getMinutes() ? '半' : ''}好了，謝謝`);
  setSteps(STEPS, 3);
  const old = b.start;
  moveBooking(b, pick, { quiet: true });
  await x.ai(`已幫您改到 ${mdw(pick)} ${hm(pick)}，訂金 ${money(b.deposit)} 保留不用重付；巧克力牌「爸爸生日快樂」也照舊。`);
  setSteps(STEPS, 4);
  await x.sys(`${icon('bell', 13)} 提醒已改排：${mdw(addDays(pick, -1))} 20:00・${mdw(pick)} ${hm(new Date(pick.getTime() - 7200e3))}`, 'ok');
  setSteps(STEPS, 5);
  toast(`陳先生改期完成`, `${mdw(old)} ${hm(old)} → ${mdw(pick)} ${hm(pick)}・行事曆、提醒、產能都已自動更新`, { kind: 'info', icon: icon('calendar', 18) });
}

// 情境 4：英文客人取消課程（套用退費規則＋自動通知候補）
async function scCancel(x) {
  const s = SCEN[3];
  phoneTop(s, 'Daniel Tan', 'en');
  const STEPS = ['找到報名', '套用退費規則', '退款', '通知候補', '更新名單'];
  setSteps(STEPS, 0);
  const c = DATA.classes.find(q => q.fixed === 'full');
  if (FULL_SNAP) { c.roster = FULL_SNAP.roster.map(r => ({ ...r })); c.waitlist = FULL_SNAP.waitlist.map(r => ({ ...r })); }
  if (V.mode === 'week') V.week = weekStart(c.start); else V.month = new Date(c.start.getFullYear(), c.start.getMonth(), 1);
  V.selClass = c.id;
  renderClasses(); renderCal();
  const when = whenIn('en', c.start);
  await x.cust(`Hi, so sorry — something came up and I can't make the baking class on ${when}. Can I get a refund?`, `抱歉臨時有事，${mdw(c.start)} 的烘焙課沒辦法去了，可以退費嗎？`);
  await x.think('查詢 WhatsApp 報名紀錄…', `找到：${c.title}・${mdw(c.start)}・已付 ${money(c.price)}`);
  setSteps(STEPS, 1);
  const r = refundOf({ type: 'class', price: c.price, start: c.start });
  await x.think('套用取消政策…', `距上課 ${r.days} 天 → ${r.rule}`);
  const en = r.pct === 100 ? `Since it's ${r.days} days before the class, you'll get a full refund of NT$${n0(r.amt)}.`
    : r.pct === 0 ? `As it's within ${R.noRefundDays} days of the class, we're unable to refund${R.allowMoveOnce ? ', but you can move to another class once for free' : ''}.`
      : `Since it's ${r.days} days before the class, our policy refunds ${r.pct}% — NT$${n0(r.amt)}.`;
  const zh = r.pct === 100 ? `距上課 ${r.days} 天，可全額退 NT$${n0(r.amt)}。` : r.pct === 0 ? `上課前 ${R.noRefundDays} 天內無法退費${R.allowMoveOnce ? '，但可免費改到其他場次一次' : ''}。` : `距上課 ${r.days} 天，依規定退 ${r.pct}%，共 NT$${n0(r.amt)}。`;
  await x.ai(`No worries, Daniel! ${en} Shall I go ahead and cancel?`, `沒關係！${zh}要幫您取消嗎？`);
  await x.cust('Yes please, thank you for understanding!', '好的，謝謝體諒！');
  setSteps(STEPS, 2);
  await x.sys(`${icon('coins', 13)} ${r.amt ? `已退款 ${money(r.amt)}（原路退回）・開立銷貨退回折讓證明單` : '不退款'}${r.paid - r.amt > 0 ? `・${money(r.paid - r.amt)} 轉列其他收入` : ''}`, 'ok');
  c.roster = c.roster.filter(q => q.fixed !== 'daniel');
  renderClasses(); renderCal(); renderKpis(); renderTypes(); renderAcct();
  setSteps(STEPS, 3);
  if (R.waitlistAuto && c.waitlist.length) {
    const wl = c.waitlist.shift();
    await x.think('空出 1 個座位・自動通知候補第 1 位…', `已通知 ${wl.customer}（${CH_NAME[wl.channel]}・${LANG_NAME[wl.lang]}）`);
    await x.sys(`${icon('send', 13)} 傳給 ${esc(wl.customer)}：「${esc(waitNotice(wl.lang, wl.customer, whenIn(wl.lang, c.start), c.title))}」`, 'info');
    c.roster.push({ ...wl, allergy: '', paid: false, hold: true, notified: false });
  } else await x.sys(`${icon('alert', 13)} 自動通知候補已關閉・空位留給熟客推播`, 'info');
  setSteps(STEPS, 4);
  renderClasses(true); renderCal(); renderKpis(); flashBooking(c.id);
  await x.ai('Done! Your booking is cancelled and the refund is on its way. Hope to see you at another class soon!', '已取消，退款處理中。期待下次在其他課程見到您！');
  setSteps(STEPS, 5);
  toast('取消與候補遞補自動完成', `Daniel Tan 取消・${r.rule}・候補已自動通知，老闆不用介入`, { kind: 'info', icon: icon('users', 18) });
}

// ───────── 其他業主的示範情境（依業態大類用語；service 以服務預約為主） ─────────
const DM = {
  food: { req: ['10名で利用します。辛さ控えめでお願いします！', '我們 10 個人，麻煩辣度降低！'], note: '10 人・辣度降低', extra: ['ドリンク追加', '加購飲品'], noteJa: 'ご要望', echo: '辣度降低' },
  drink: { req: ['ギフト用にカードを付けてください。「Thank you ゆい」でお願いします。', '可以附送禮卡片嗎？寫「Thank you ゆい」。'], note: '卡片寫「Thank you ゆい」', extra: ['ギフトカード', '送禮卡片'], noteJa: 'カード', echo: '送禮卡片' },
  dessert: { req: ['カードに「Happy Birthday ゆい」と書いてもらえますか？', '卡片可以寫「Happy Birthday ゆい」嗎？'], note: '卡片寫「Happy Birthday ゆい」', extra: ['フルーツ増量', '水果加量'], noteJa: 'カード', echo: '卡片內容' },
  retail: { req: ['ギフト包装で、カードに「Thank you ゆい」と入れてください。', '要禮物包裝，卡片寫「Thank you ゆい」。'], note: '禮物包裝・卡片寫「Thank you ゆい」', extra: ['ギフト包装', '禮物包裝'], noteJa: 'カード', echo: '禮物包裝' },
  craft: { req: ['「YUI」と刻印をお願いできますか？', '可以幫我刻「YUI」嗎？'], note: '刻字「YUI」', extra: ['刻印', '刻字'], noteJa: '刻印', echo: '刻字「YUI」' },
  flower: { req: ['ピンク系で、カードに「Happy Birthday ゆい」とお願いします。', '要粉色系，卡片寫「Happy Birthday ゆい」。'], note: '粉色系・卡片寫「Happy Birthday ゆい」', extra: ['メッセージカード', '賀卡'], noteJa: 'カード', echo: '粉色系與卡片' },
  service: { req: ['初めてです。シンプルなデザインでお願いします！', '第一次來，想要簡約風格！'], note: '第一次來店・簡約風格', extra: ['ケア追加', '加購保養'], noteJa: 'ご要望', echo: '指定的風格' },
  farm: { req: ['ギフト用に箱入りでお願いします。', '要送禮用的禮盒包裝。'], note: '送禮禮盒包裝', extra: ['ギフト箱', '禮盒包裝'], noteJa: 'ご要望', echo: '禮盒包裝' },
}[CAT];
async function gCake(x) {
  const s = SCEN[0];
  phoneTop(s, '佐藤 ゆき', 'ja');
  const STEPS = ['查空檔', '推薦時段', '確認內容', '收訂金', '已確認'];
  setSteps(STEPS, 0);
  DATA.list = DATA.list.filter(b => b.demo !== 'sato');
  const it = BK_ITEMS[0] || { item: W.main, price: 1200, dur: 30 };
  const probe = { type: 'cake', start: new Date(0) };
  const okDay = (d) => (d.getDay() === 6 || d.getDay() === 0 || CAT === 'service') && !R.closed.includes(d.getDay()) && cakesOn(d) < R.cakeCap;
  let day = nextDay(addDays(T0(), R.leadDays), okDay), cand = freeSlots(probe, day, 14, 17.5, 8);
  for (let k = 0; k < 16 && !cand.length; k++) { day = nextDay(addDays(day, 1), okDay); cand = freeSlots(probe, day, 14, 17.5, 8); }
  const md = `${day.getMonth() + 1}/${day.getDate()}`;
  const P = PRODUCTS_BY_NAME(it.item);
  const enItem = P ? (P.en || P.name) : it.item;
  await x.cust(`こんにちは！${md}（${JA_DOW[day.getDay()]}）に「${enItem}」を予約できますか？`, `你好！${md}（${DOW_ZH[day.getDay()]}）可以預約「${it.item}」嗎？`);
  await x.think(`查詢 ${mdw(day)} ${W.cap}與空檔…`, `${mdw(day)} ${W.cap}剩 ${R.cakeCap - cakesOn(day)} ${W.mu}・距今 ${daysBetween(NOW(), day)} 天，符合「${R.leadDays} 天前預訂」`);
  setSteps(STEPS, 1);
  if (!cand.length) {
    await x.ai('申し訳ございません、しばらく先まで予約枠が満席です。キャンセル待ちにご登録しますか？', '很抱歉，近期的時段都已額滿，要幫您登記候補嗎？');
    await x.sys(`${icon('clock', 13)} 已登記候補，有空位時 AI 會用日文通知客人`, 'ok');
    return;
  }
  const opts = [cand[0], cand[Math.floor(cand.length / 2)], cand[cand.length - 1]].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);
  const rec = opts.reduce((bi, o, i) => (o.left > opts[bi].left ? i : bi), 0);
  await x.ai(`お問い合わせありがとうございます！${md}は下記の時間がご利用いただけます。`, `感謝詢問！${md} 以下時段可以預約。`);
  await x.slots(`${mdw(day)} 可預約時段`, opts.map(o => ({ label: hm(o.d), sub: `剩 ${o.left} 名額` })), rec);
  const pick = opts[rec].d;
  await x.cust(`${hm(pick)}でお願いします。${DM.req[0]}`, `${hm(pick)} 麻煩了。${DM.req[1]}`);
  setSteps(STEPS, 2);
  const price = it.price + 100, dep = Math.round(price * R.depositPct / 100);
  await x.ai('かしこまりました。ご予約内容をご確認ください。', '好的，請確認預約內容。',
    `<div class="bk2-sum"><div><span>${esc(enItem)}</span><b>NT$${n0(it.price)}</b></div><div><span>${esc(DM.extra[0])}</span><b>+NT$100</b></div><div><span>${esc(DM.noteJa)}</span><b>${esc(DM.note)}</b></div><div><span>${esc(W.atJa)}</span><b>${md}（${JA_DOW[day.getDay()]}）${hm(pick)}</b></div><div class="t"><span>合計</span><b>NT$${n0(price)}</b></div></div>`);
  await x.ai(`ご予約確定には${R.depositPct === 100 ? '全額' : `${R.depositPct}%の内金`}（NT$${n0(dep)}）のお支払いをお願いしております。${R.fullRefundDays}日前までのキャンセルは全額返金です。`, `確認預約需先付${R.depositPct === 100 ? '全額' : ` ${R.depositPct}% 訂金`}（NT$${n0(dep)}）。${R.fullRefundDays} 天前取消全額退。`);
  setSteps(STEPS, 3);
  const payNode = await x.pay(dep, `訂金 ${R.depositPct}%・${it.item}`, ['お支払いしました！', '付好了！']);
  await x.sys(`${icon('coins', 13)} 已收訂金 ${money(dep)}（LINE Pay）・記入「預收款項」・訂金發票已自動開立`, 'ok');
  setSteps(STEPS, 4);
  const b = { id: `BK-${seq++}`, type: 'cake', start: pick, dur: it.dur || 30, customer: '佐藤 ゆき', lang: 'ja', channel: 'line', item: `${it.item}（${DM.extra[1]}）`, price, deposit: dep,
    depStatus: 'paid', status: 'confirmed', note: `${DM.note}（AI 由日文翻譯）`, moved: 0, demo: 'sato', isNew: true };
  DATA.list.push(b); DATA.list.sort((p, q) => p.start - q.start);
  pushLedger('in', b, dep, `佐藤 ゆき ${W.ms}訂金`);
  store.log('pay', `AI 完成預約：佐藤 ゆき ${it.item}，收訂金 NT$ ${dep.toLocaleString()}，記入預收款項`);
  flyTo(payNode, b);
  renderKpis(); renderTypes(); renderAcct();
  await x.ai('ご予約が確定しました！前日20時と当日2時間前にLINEでお知らせします。', `預約完成！前一天晚上 8 點和當天 2 小時前會用 LINE 提醒您。`);
  setSteps(STEPS, 5);
  toast(`AI 完成一筆${W.main}`, `佐藤 ゆき・${mdw(pick)} ${hm(pick)}・訂金 ${money(dep)} 已收，已排進行事曆`, { icon: icon('calendar', 18) });
}
const PRODUCTS_BY_NAME = (name) => KIT.byPop().find(p => String(name).includes(p.name) || String(name).includes(KIT.short(p)));
async function gClass(x) {
  const s = SCEN[1];
  phoneTop(s, '王太太', 'zh');
  const STEPS = ['查名額', '推薦場次', FOODISH ? '確認過敏' : '確認需求', '收課程費', '加入名單'];
  setSteps(STEPS, 0);
  DATA.classes.forEach(c => { c.roster = c.roster.filter(r => r.demo !== 'wang'); });
  await x.cust(`請問週末的${W.clsShort}還有位子嗎？我想跟女兒一起上，2 位。`);
  const up = DATA.classes.filter(c => c.start > addDays(NOW(), 1) && c.fixed !== 'full').slice(0, 4);
  if (!up.length) { await x.ai(`近期的${W.cls}都額滿了，已幫您登記候補，有空位會馬上通知您！`); return; }
  let pick = up.find(c => c.seats - classTaken(c) >= 2);
  if (!pick) { pick = up[0]; while (pick.seats - classTaken(pick) < 2) pick.roster.pop(); }
  await x.think(`查詢近期${W.cls}名額…`, `找到 ${up.length} 個場次・${up.filter(c => c.seats - classTaken(c) >= 2).length} 場還有 2 個以上空位`);
  setSteps(STEPS, 1);
  await x.ai(`有的！近期場次如下，每人 ${money(pick.price)}（含材料，成品可帶回家）：`);
  const opt = up.slice(0, 3);
  await x.slots(`近期${W.cls}`, opt.map(c => { const l = c.seats - classTaken(c); return { label: `${c.start.getMonth() + 1}/${c.start.getDate()}（${DOW_ZH[c.start.getDay()]}）${esc(c.title)}`, sub: l >= 2 ? `剩 ${l} 位` : l === 1 ? '剩 1 位' : '額滿・可候補' }; }), opt.indexOf(pick) >= 0 ? opt.indexOf(pick) : 0);
  const note = FOODISH ? '堅果過敏' : '初學者';
  await x.cust(FOODISH ? `那我們報 ${pick.start.getMonth() + 1}/${pick.start.getDate()} 的${pick.title}！女兒對堅果過敏，可以嗎？` : `那我們報 ${pick.start.getMonth() + 1}/${pick.start.getDate()} 的${pick.title}！女兒是第一次上，需要自己帶工具嗎？`);
  setSteps(STEPS, 2);
  await x.think(FOODISH ? '查詢課程材料過敏原…' : '查詢課程準備清單…', FOODISH ? `「${pick.title}」可改用無堅果材料` : `「${pick.title}」工具與材料全部提供`);
  const amt = pick.price * 2;
  await x.ai(FOODISH ? `沒問題，已幫您備註「堅果過敏」，老師會準備無堅果材料。2 位共 NT$${n0(amt)}，需全額預付完成報名；${R.fullRefundDays} 天前取消可全額退費。`
    : `不用喔，工具與材料都由我們準備，已幫您備註「初學者」，老師會多留意。2 位共 NT$${n0(amt)}，需全額預付完成報名；${R.fullRefundDays} 天前取消可全額退費。`);
  setSteps(STEPS, 3);
  const payNode = await x.pay(amt, `課程費・${pick.title} ×2`, ['付好了，謝謝！']);
  await x.sys(`${icon('coins', 13)} 已收課程費 ${money(amt)}・記入「預收款項」，上課當天轉為收入・已開立發票`, 'ok');
  setSteps(STEPS, 4);
  pick.roster.push({ customer: '王太太', lang: 'zh', channel: 'line', pax: 2, allergy: note, paid: true, notified: false, demo: 'wang' });
  pick.noticeSent = false;
  V.selClass = pick.id;
  store.log('pay', `AI 完成課程報名：王太太 2 位（${pick.title}），收課程費 NT$ ${amt.toLocaleString()}`);
  renderClasses(true); renderKpis(); renderTypes(); renderAcct();
  flyTo(payNode, pick);
  await x.ai(`報名完成！上課前一天會傳課前通知給您（地點、停車、穿著建議）。${classTaken(pick) >= pick.seats ? '這班已經額滿囉，您們剛好搶到最後的位子！' : ''}`);
  setSteps(STEPS, 5);
  toast('AI 完成一筆課程報名', `王太太 2 位・${mdw(pick.start)} ${pick.title}・${classTaken(pick)}/${pick.seats} 位`, { icon: icon('users', 18) });
}
async function gMove(x) {
  const s = SCEN[2];
  phoneTop(s, '陳先生', 'zh');
  const STEPS = ['找到預約', '檢查規則', '找空檔', '改期', '更新提醒'];
  setSteps(STEPS, 0);
  const b = DATA.list.find(q => q.fixed === 'chen');
  if (!b) { await x.ai(`目前查不到您的預約，已轉給${KIT.owner}確認，稍後回覆您。`); return; }
  if (!b.orig) b.orig = new Date(b.start);
  b.start = new Date(b.orig); b.status = 'confirmed'; b.moved = 0;
  if (V.mode === 'week') V.week = weekStart(b.start);
  renderCal();
  const target = nextDay(addDays(b.start, 1), d => !R.closed.includes(d.getDay()) && freeSlots(b, d, 14, 18, 8).length >= 2);
  await x.cust(`不好意思，我 ${mdw(b.start)} 的${W.ms}（${b.item}），可以改到 ${mdw(target)} 下午嗎？`);
  await x.think('辨識 LINE 帳號・查詢預約…', `找到 ${b.id}：${b.item}・${mdw(b.start)} ${hm(b.start)}・訂金已收 ${money(b.deposit)}`);
  setSteps(STEPS, 1);
  const days = daysBetween(NOW(), b.start);
  await x.think('套用改期規則…', days >= R.noRefundDays ? `距${W.at} ${days} 天・可免費改期` : `距${W.at} ${days} 天・3 天內可改期一次`);
  setSteps(STEPS, 2);
  const opts = freeSlots(b, target, 14, 18, 8).filter((o, i) => i % 2 === 0).slice(0, 3);
  if (!opts.length) { await x.ai('不好意思，接下來 30 天的下午時段都滿了，已幫您登記候補，一有空位會馬上通知您；原本的時間也先幫您保留。'); return; }
  const pickI = Math.min(2, opts.length - 1);
  await x.ai(`可以的！${mdw(target)} 下午這幾個時段有空：`);
  await x.slots(`${mdw(target)} 下午`, opts.map(o => ({ label: hm(o.d), sub: `剩 ${o.left} 名額` })), -1);
  const pick = opts[pickI].d;
  await x.cust(`${pick.getHours() - 12} 點${pick.getMinutes() ? '半' : ''}好了，謝謝`);
  setSteps(STEPS, 3);
  const old = b.start;
  moveBooking(b, pick, { quiet: true });
  await x.ai(`已幫您改到 ${mdw(pick)} ${hm(pick)}，訂金 ${money(b.deposit)} 保留不用重付；備註「${b.note}」也照舊。`);
  setSteps(STEPS, 4);
  await x.sys(`${icon('bell', 13)} 提醒已改排：${mdw(addDays(pick, -1))} 20:00・${mdw(pick)} ${hm(new Date(pick.getTime() - 7200e3))}`, 'ok');
  setSteps(STEPS, 5);
  toast('陳先生改期完成', `${mdw(old)} ${hm(old)} → ${mdw(pick)} ${hm(pick)}・行事曆、提醒、${W.cap}都已自動更新`, { kind: 'info', icon: icon('calendar', 18) });
}
async function gCancel(x) {
  const s = SCEN[3];
  phoneTop(s, 'Daniel Tan', 'en');
  const STEPS = ['找到報名', '套用退費規則', '退款', '通知候補', '更新名單'];
  setSteps(STEPS, 0);
  const c = DATA.classes.find(q => q.fixed === 'full');
  if (!c) { await x.ai('Sorry, I could not find your booking. I have passed this to the owner.', '查不到報名紀錄，已轉給老闆確認。'); return; }
  if (FULL_SNAP) { c.roster = FULL_SNAP.roster.map(r => ({ ...r })); c.waitlist = FULL_SNAP.waitlist.map(r => ({ ...r })); }
  if (V.mode === 'week') V.week = weekStart(c.start); else V.month = new Date(c.start.getFullYear(), c.start.getMonth(), 1);
  V.selClass = c.id;
  renderClasses(); renderCal();
  const when = whenIn('en', c.start);
  await x.cust(`Hi, so sorry — something came up and I can't make the ${W.clsEn} on ${when}. Can I get a refund?`, `抱歉臨時有事，${mdw(c.start)} 的${W.clsShort}沒辦法去了，可以退費嗎？`);
  await x.think('查詢 WhatsApp 報名紀錄…', `找到：${c.title}・${mdw(c.start)}・已付 ${money(c.price)}`);
  setSteps(STEPS, 1);
  const r = refundOf({ type: 'class', price: c.price, start: c.start });
  await x.think('套用取消政策…', `距上課 ${r.days} 天 → ${r.rule}`);
  const en = r.pct === 100 ? `Since it's ${r.days} days before the class, you'll get a full refund of NT$${n0(r.amt)}.`
    : r.pct === 0 ? `As it's within ${R.noRefundDays} days of the class, we're unable to refund${R.allowMoveOnce ? ', but you can move to another class once for free' : ''}.`
      : `Since it's ${r.days} days before the class, our policy refunds ${r.pct}% — NT$${n0(r.amt)}.`;
  const zh = r.pct === 100 ? `距上課 ${r.days} 天，可全額退 NT$${n0(r.amt)}。` : r.pct === 0 ? `上課前 ${R.noRefundDays} 天內無法退費${R.allowMoveOnce ? '，但可免費改到其他場次一次' : ''}。` : `距上課 ${r.days} 天，依規定退 ${r.pct}%，共 NT$${n0(r.amt)}。`;
  await x.ai(`No worries, Daniel! ${en} Shall I go ahead and cancel?`, `沒關係！${zh}要幫您取消嗎？`);
  await x.cust('Yes please, thank you for understanding!', '好的，謝謝體諒！');
  setSteps(STEPS, 2);
  await x.sys(`${icon('coins', 13)} ${r.amt ? `已退款 ${money(r.amt)}（原路退回）・開立銷貨退回折讓證明單` : '不退款'}${r.paid - r.amt > 0 ? `・${money(r.paid - r.amt)} 轉列其他收入` : ''}`, 'ok');
  c.roster = c.roster.filter(q => q.fixed !== 'daniel');
  renderClasses(); renderCal(); renderKpis(); renderTypes(); renderAcct();
  setSteps(STEPS, 3);
  if (R.waitlistAuto && c.waitlist.length) {
    const wl = c.waitlist.shift();
    await x.think('空出 1 個座位・自動通知候補第 1 位…', `已通知 ${wl.customer}（${CH_NAME[wl.channel]}・${LANG_NAME[wl.lang]}）`);
    await x.sys(`${icon('send', 13)} 傳給 ${esc(wl.customer)}：「${esc(waitNotice(wl.lang, wl.customer, whenIn(wl.lang, c.start), c.title))}」`, 'info');
    c.roster.push({ ...wl, allergy: '', paid: false, hold: true, notified: false });
  } else await x.sys(`${icon('alert', 13)} 自動通知候補已關閉・空位留給熟客推播`, 'info');
  setSteps(STEPS, 4);
  renderClasses(true); renderCal(); renderKpis(); flashBooking(c.id);
  await x.ai('Done! Your booking is cancelled and the refund is on its way. Hope to see you at another class soon!', '已取消，退款處理中。期待下次在其他課程見到您！');
  setSteps(STEPS, 5);
  toast('取消與候補遞補自動完成', `Daniel Tan 取消・${r.rule}・候補已自動通知，老闆不用介入`, { kind: 'info', icon: icon('users', 18) });
}
