// AI 晨報：每天早上 AI 告訴老闆昨天發生什麼、今天該做什麼（示範資料）
import * as THREE from 'three';
import { store } from '../state.js';
import { $, $$, el, gsap, esc, money, fmtTime, fmtDate, sleep, countUp, toast, speak, stopSpeak } from '../util.js';
import { icon, chIcon } from '../icons.js';
import { makeChart, fmtK } from '../charts.js';
import { productArt } from '../art.js';
import { WEATHER, LANGS, yesterdayStats, forecast, anomalies, goals, overnight, todos, summary, todayKey } from '../brief-data.js';

const echarts = window.echarts;
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
const TXT2 = 'rgba(214,240,226,0.72)';
let root, go = () => {}, charts = null, orb = null, shown = false, visible = false, dirty = false;
let lang = 'zh', segs = [], typeSeq = 0, typing = false, speakTok = 0, speaking = false;
const mountTs = Date.now();

const KIND = {
  order: ['chat', '#2DB674'], web: ['store', '#5EE0C4'], pay: ['coins', '#2E97D4'], invoice: ['receipt', '#5EE0C4'], bank: ['bank', '#2E97D4'],
  shield: ['shield', '#7C62E6'], trend: ['trend', '#F0A531'], factory: ['factory', '#2DB674'], box: ['box', '#EC6A55'], coins: ['coins', '#F0A531'],
  tax: ['tax', '#DD5597'], stock: ['alert', '#EC6A55'], meet: ['meeting', '#7C62E6'],
};
const PUNIT = { lemon: '盒', roll: '條', basque: '個', pound: '條', cookie: '盒', pineapple: '盒', canele: '盒' };
const LANG_TAG = { ja: '日', en: 'EN', vi: 'VI', ms: 'MS' };

// ---------------- 掛載 ----------------
export default {
  mount(section, ctx) {
    root = section; go = (ctx && ctx.go) || go;
    const now = new Date();
    section.innerHTML = `
    <div class="bf">
      <section class="bf-hero glass anim-in">
        <div class="bf-hero-main">
          <div class="bf-top">
            <span class="bf-kicker">${icon('sparkle', 14)} AI 晨報・${fmtDate(now)} 星期${WEEK[now.getDay()]}</span>
            <span class="demo-badge">示範資料</span>
          </div>
          <div class="bf-greet-row">
            <h2 class="bf-greet">${greet(now)}，<span class="grad-txt">阿美</span></h2>
            <div class="bf-weather" title="模擬天氣資料">
              ${weatherSvg()}
              <div class="bf-w-main"><b>${WEATHER.temp}°C</b><span>${WEATHER.city}・${WEATHER.text}</span></div>
              <div class="bf-w-sub"><span>${dropSvg()} 降雨 ${WEATHER.rain}%</span><span>${WEATHER.lo}–${WEATHER.hi}°C・濕度 ${WEATHER.hum}%</span></div>
            </div>
          </div>
          <div class="bf-sum-box">
            <div class="bf-sum-h">
              <span class="bf-ai-tag"><i></i>AI 今日摘要</span>
              <div class="bf-langs" role="group" aria-label="摘要語言">${LANGS.map(l => `<button class="bf-lang ${l.id === lang ? 'on' : ''}" data-lang="${l.id}">${l.label}</button>`).join('')}</div>
            </div>
            <p class="bf-sum" id="bfSum" aria-live="polite"></p>
          </div>
          <div class="bf-ctrl">
            <button class="btn btn-primary bf-read" id="bfRead">${icon('volume', 18)}<span class="bf-read-t">朗讀晨報</span><span class="bf-eq" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span></button>
            <button class="btn btn-ghost" id="bfRegen">${icon('refresh', 16)} 重新生成</button>
            <small class="bf-ctrl-note">${icon('globe', 14)} 切換語言會重新生成並朗讀</small>
          </div>
          <div class="bf-chips" id="bfChips"></div>
        </div>
        <div class="bf-orb" id="bfOrb">
          <div class="bf-orb-fallback"></div>
          <div class="bf-orb-label"><b>GreenUP AI 助理</b><small id="bfOrbState">已備妥今日晨報</small></div>
        </div>
      </section>

      <div class="bf-row bf-row1">
        <section class="glass card bf-night anim-in">
          <div class="card-h"><h3>${icon('bot', 18)} AI 昨晚幫你做了什麼</h3><span class="chip-sm">昨晚 18:00 – 今早 08:00</span></div>
          <div class="bf-saved">
            <div class="bf-saved-main"><small>今天幫你省下</small><b><span id="bfHours">0</span><em>小時</em></b></div>
            <div class="bf-saved-stats" id="bfNightStats"></div>
          </div>
          <div class="bf-tl-wrap"><i class="bf-tl-line"></i><ul class="bf-tl" id="bfTl"></ul></div>
        </section>

        <section class="glass card bf-todo anim-in">
          <div class="card-h"><h3>${icon('check', 18)} 今日待辦</h3><span class="chip-sm">${icon('sparkle', 12)} AI 依優先順序建議</span></div>
          <div class="bf-todo-prog"><span id="bfTodoCount">0 / 0</span><div class="bf-bar"><i id="bfTodoBar"></i></div></div>
          <ul class="bf-todos" id="bfTodos"></ul>
        </section>

        <section class="bf-anoms anim-in" id="bfAnoms">
          <div class="bf-anoms-h"><h3>${icon('alert', 18)} 異常偵測</h3><span class="chip-sm">近 7 天 vs 前 7 天</span></div>
        </section>
      </div>

      <section class="glass card bf-goals anim-in">
        <div class="card-h"><h3>${icon('trend', 18)} 本月目標進度</h3><span class="chip-sm" id="bfTimePct">月份時間進度 0%</span></div>
        <div class="bf-gauges" id="bfGauges"></div>
      </section>

      <div class="bf-row bf-row3">
        <section class="glass card bf-fc anim-in">
          <div class="card-h"><h3>${icon('trend', 18)} 今日預估・逐小時</h3><span class="chip-sm">近 4 週同星期＋天氣＋成長趨勢</span></div>
          <div class="bf-fc-kpis" id="bfFcKpis"></div>
          <div class="chart bf-fc-chart" id="bfFcChart"></div>
        </section>
        <section class="glass card bf-prod anim-in">
          <div class="card-h"><h3>${icon('factory', 18)} AI 建議今日生產量</h3><button class="btn btn-sm btn-ghost" id="bfSched">${icon('calendar', 14)} 排入生產排程</button></div>
          <div class="bf-prod-head"><span>商品</span><span>庫存／預估需求</span><span class="r">建議生產</span></div>
          <ul class="bf-prods" id="bfProds"></ul>
        </section>
      </div>
    </div>`;

    $$('.bf-lang', section).forEach(b => b.addEventListener('click', () => switchLang(b.dataset.lang)));
    $('#bfRead', section).addEventListener('click', toggleRead);
    $('#bfRegen', section).addEventListener('click', () => { stopReading(); regenerate(true); });
    $('#bfSched', section).addEventListener('click', (e) => {
      const b = e.currentTarget; b.disabled = true; b.innerHTML = `${icon('check', 14)} 已排入`;
      gsap.fromTo(b, { scale: 0.9 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
      toast('已排入今日生產排程', '已透過 LINE 通知小芸，09:00 上工後依序製作', { icon: icon('factory', 18) });
    });

    renderStatic();
    store.on('order', () => onData());
    store.on('order-updated', () => onData());
    store.on('reset', () => onData());
    store.on('activity', (a) => { if (a.ts >= mountTs) addLiveEvent(a); });
  },

  show() {
    visible = true;
    if (!orb) orb = createOrb($('#bfOrb', root));
    orb.start();
    if (!charts) initCharts();
    if (!shown) {
      shown = true;
      introAnim();
      regenerate(false);
    } else if (dirty) { refreshData(); }
    dirty = false;
  },

  hide() {
    visible = false;
    orb && orb.stop();
    stopReading();
    cancelTyping();
    orb && orb.setMode('idle');
  },
};

function greet(d) { const h = d.getHours(); return h < 11 ? '早安' : h < 14 ? '午安' : h < 18 ? '午後好' : '晚安'; }

// ---------------- 靜態（不依賴圖表）區塊 ----------------
function renderStatic() {
  renderChips();
  renderNight();
  renderTodos();
  renderAnoms();
  renderGoalsShell();
  renderFcKpis();
  renderProds();
}

function onData() { if (visible) refreshData(); else dirty = true; }
function refreshData() {
  renderChips(true);
  renderTodos();
  renderFcKpis(true);
  renderProds();
  if (charts) { updateFcChart(); updateGauges(); }
}

function renderChips(live) {
  const ys = yesterdayStats();
  const up = ys.delta >= 0;
  const chips = [
    { k: 'rev', label: '昨日營收', v: ys.rev, pre: 'NT$ ', c: 'var(--leaf)', ic: 'coins' },
    { k: 'ord', label: '昨日訂單', v: ys.orders, suf: ' 筆', c: 'var(--sky)', ic: 'receipt' },
    { k: 'wk', label: '較上週同日', v: Math.abs(ys.delta), pre: up ? '+' : '−', suf: '%', dec: 1, c: up ? 'var(--leaf)' : 'var(--coral)', ic: 'trend' },
    { k: 'top', label: '最熱賣', text: `${ys.top.name} ×${ys.topQty}`, c: 'var(--amber)', ic: 'heart' },
    { k: 'pend', label: '待付款', v: ys.pending, suf: ' 筆', c: 'var(--pink)', ic: 'clock' },
    { k: 'low', label: '低庫存', v: ys.low.length, suf: ' 項', c: ys.low.length ? 'var(--coral)' : 'var(--leaf)', ic: 'box' },
  ];
  const host = $('#bfChips', root);
  if (!host.children.length) {
    host.innerHTML = chips.map(c => `<div class="bf-chip" data-k="${c.k}" style="--c:${c.c}"><span class="bf-chip-ic">${icon(c.ic, 15)}</span><div><small>${c.label}</small><b data-v>${c.text ? esc(c.text) : '0'}</b></div></div>`).join('');
  }
  for (const c of chips) {
    const node = $(`[data-k="${c.k}"]`, host);
    node.style.setProperty('--c', c.c);
    const v = $('[data-v]', node);
    if (c.text) v.textContent = c.text;
    else if (shown || live) countUp(v, c.v, { prefix: c.pre || '', suffix: c.suf || '', decimals: c.dec || 0, duration: live ? 1 : 1.6 });
    else { v.dataset.value = 0; v.dataset.target = c.v; v.dataset.pre = c.pre || ''; v.dataset.suf = c.suf || ''; v.dataset.dec = c.dec || 0; }
  }
}

// ---- 昨晚時間軸 ----
let night = null;
function renderNight() {
  night = overnight();
  const st = night.stats;
  $('#bfNightStats', root).innerHTML = [
    ['chat', st.msgs, '則訊息自動回覆'], ['receipt', st.orders, '筆訂單自動成立'], ['bank', st.recon, '筆款項自動對帳'],
  ].map(([ic, v, l]) => `<div><span>${icon(ic, 14)}</span><b data-to="${v}">0</b><small>${l}</small></div>`).join('');
  const ul = $('#bfTl', root);
  ul.innerHTML = night.events.map(evItem).join('');
}
function evItem(e) {
  const [ic, c] = KIND[e.kind] || KIND.order;
  const badge = e.ch ? `<span class="bf-tl-ch">${chIcon(e.ch, 18)}${LANG_TAG[e.lang] ? `<em>${LANG_TAG[e.lang]}</em>` : ''}</span>` : '';
  return `<li class="bf-tl-i${e.live ? ' live' : ''}" style="--c:${c}">
    <time class="mono">${e.live ? '剛剛' : fmtTime(e.ts)}</time>
    <span class="bf-tl-dot">${icon(ic, 14)}</span>
    <div class="bf-tl-body"><p>${badge}${esc(e.text)}</p>${e.meta ? `<small>${esc(e.meta)}</small>` : ''}</div>
  </li>`;
}
function addLiveEvent(a) {
  const ul = $('#bfTl', root); if (!ul) return;
  const kind = a.kind === 'web' ? 'web' : a.kind === 'pay' ? 'pay' : a.kind in KIND ? a.kind : 'order';
  const li = el(evItem({ ts: a.ts, kind, text: a.text, meta: 'AI 即時處理', live: true }));
  ul.prepend(li);
  while (ul.children.length > 16) ul.lastElementChild.remove();
  if (visible) gsap.fromTo(li, { opacity: 0, x: -24, backgroundColor: 'rgba(45,182,116,0.28)' }, { opacity: 1, x: 0, backgroundColor: 'rgba(45,182,116,0)', duration: 1.2, ease: 'power2.out', clearProps: 'backgroundColor' });
}

// ---- 今日待辦 ----
const TODO_KEY = () => `greenup-brief-todo:${todayKey()}`;
function loadDone() { try { return new Set(JSON.parse(localStorage.getItem(TODO_KEY()) || '[]')); } catch { return new Set(); } }
function saveDone(set) { try { localStorage.setItem(TODO_KEY(), JSON.stringify([...set])); } catch { /* ignore */ } }
const PRI = { high: ['優先', 'var(--coral)'], mid: ['今天', 'var(--amber)'], low: ['有空再做', 'var(--sky)'] };

function renderTodos() {
  const list = todos();
  const done = loadDone();
  const ul = $('#bfTodos', root);
  ul.innerHTML = list.map(t => `
    <li class="bf-td${done.has(t.id) ? ' done' : ''}" data-id="${t.id}" style="--p:${PRI[t.pri][1]}">
      <button class="bf-check" aria-label="標記完成" aria-pressed="${done.has(t.id)}"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <div class="bf-td-body">
        <div class="bf-td-t"><span class="bf-td-ic">${icon(t.icon, 15)}</span><b>${esc(t.title)}</b><em>${PRI[t.pri][0]}</em></div>
        <p>${esc(t.desc)}</p>
      </div>
      <button class="btn btn-sm bf-td-go">${esc(t.btn)} ${icon('arrow', 14)}</button>
    </li>`).join('');
  $$('.bf-td', ul).forEach(li => {
    const t = list.find(x => x.id === li.dataset.id);
    $('.bf-check', li).addEventListener('click', () => toggleTodo(li));
    $('.bf-td-go', li).addEventListener('click', (e) => {
      const b = e.currentTarget;
      gsap.fromTo(b, { scale: 0.92 }, { scale: 1, duration: 0.45, ease: 'back.out(3)' });
      if (t.go) go(t.go);
      else if (t.toast) {
        toast(t.toast[0], t.toast[1], { icon: icon('chat', 18) });
        if (!li.classList.contains('done')) toggleTodo(li);
      }
    });
  });
  updateTodoProg(false);
}
function toggleTodo(li) {
  const done = loadDone();
  const on = !li.classList.contains('done');
  li.classList.toggle('done', on);
  $('.bf-check', li).setAttribute('aria-pressed', on);
  on ? done.add(li.dataset.id) : done.delete(li.dataset.id);
  saveDone(done);
  if (on) {
    gsap.fromTo($('.bf-check', li), { scale: 0.6, rotate: -30 }, { scale: 1, rotate: 0, duration: 0.55, ease: 'back.out(3)' });
    gsap.fromTo(li, { x: 0 }, { x: 8, duration: 0.12, yoyo: true, repeat: 1, ease: 'power1.inOut' });
    burst($('.bf-check', li));
  }
  updateTodoProg(true);
}
function updateTodoProg(animate) {
  const all = $$('.bf-td', root), d = all.filter(x => x.classList.contains('done')).length;
  $('#bfTodoCount', root).textContent = `已完成 ${d} / ${all.length}`;
  const bar = $('#bfTodoBar', root);
  const w = all.length ? d / all.length * 100 : 0;
  if (animate) gsap.to(bar, { width: w + '%', duration: 0.6, ease: 'power3.out' }); else bar.style.width = w + '%';
  if (animate && d === all.length && all.length) toast('今日待辦全部完成', '太棒了！剩下的交給 AI，好好做甜點吧', { icon: icon('sparkle', 18) });
}
function burst(node) {
  const r = node.getBoundingClientRect();
  const host = document.body;
  const colors = ['#2DB674', '#5EE0C4', '#F0A531', '#F4D35E'];
  for (let i = 0; i < 10; i++) {
    const p = el(`<i class="bf-spark" style="left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px;background:${colors[i % 4]}"></i>`);
    host.appendChild(p);
    const a = (i / 10) * Math.PI * 2, d = 22 + Math.random() * 16;
    gsap.to(p, { x: Math.cos(a) * d, y: Math.sin(a) * d, opacity: 0, scale: 0.3, duration: 0.6, ease: 'power2.out', onComplete: () => p.remove() });
  }
}

// ---- 異常偵測 ----
let anomList = [];
function renderAnoms() {
  anomList = anomalies();
  const host = $('#bfAnoms', root);
  $$('.bf-an', host).forEach(n => n.remove());
  const IC = { bad: 'alert', warn: 'percent', good: 'trend' };
  const TAG = { bad: '下滑', warn: '注意', good: '成長' };
  anomList.forEach(a => host.appendChild(el(`
    <div class="glass bf-an bf-an-${a.level}" style="--c:${a.color}">
      <div class="bf-an-top"><span class="bf-an-ic">${icon(IC[a.level], 16)}</span><b>${esc(a.title)}</b><em>${TAG[a.level]}</em></div>
      <div class="bf-an-mid"><p>${esc(a.body)}</p><div class="bf-an-spark" data-id="${a.id}"></div></div>
      <div class="bf-an-foot"><span>${icon('wand', 14)} ${esc(a.tip)}</span><button class="btn btn-sm btn-ghost" data-go="${a.action.go}">${esc(a.action.label)}</button></div>
    </div>`)));
  $$('[data-go]', host).forEach(b => b.addEventListener('click', () => go(b.dataset.go)));
}

// ---- 目標 ----
let goalData = null;
function renderGoalsShell() {
  goalData = goals();
  $('#bfTimePct', root).textContent = `本月時間進度 ${goalData.timePct.toFixed(0)}%`;
  $('#bfGauges', root).innerHTML = goalData.items.map(g => `
    <div class="bf-g" data-id="${g.id}" style="--c:${g.color}">
      <div class="bf-g-ring"><div class="bf-g-chart" data-chart="${g.id}"></div><div class="bf-g-center"><b data-pct>0%</b><small>${g.fmt === 'pct' ? `目標 ${g.target}%` : '目標達成'}</small></div></div>
      <div class="bf-g-txt"><b>${g.name}</b><span class="bf-g-val" data-val>${fmtGoal(g, 0)}</span><small>${esc(g.sub)}</small></div>
    </div>`).join('');
}
function fmtGoal(g, v) {
  if (g.fmt === 'money') return `NT$ ${Math.round(v).toLocaleString('en-US')}`;
  if (g.fmt === 'count') return `${Math.round(v)} 位`;
  return `${(+v).toFixed(1)}%`;
}

// ---- 今日預估 ----
let fc = null;
function renderFcKpis(live) {
  fc = forecast();
  const host = $('#bfFcKpis', root);
  const rows = [
    { k: 'cnt', label: '預估來客（訂單）', v: fc.cnt, suf: ' 人', sub: `區間 ${Math.round(fc.cntLo)}–${Math.round(fc.cntHi)} 人`, c: 'var(--sky)' },
    { k: 'rev', label: '預估營收', v: fc.rev, pre: 'NT$ ', sub: `區間 ${fmtK(Math.round(fc.revLo / 100) * 100)}–${fmtK(Math.round(fc.revHi / 100) * 100)}`, c: 'var(--leaf)' },
    { k: 'now', label: '目前已實現', v: fc.sofar, pre: 'NT$ ', sub: `${fc.sofarCnt} 筆・達成 ${fc.rev ? (fc.sofar / fc.rev * 100).toFixed(0) : 0}%`, c: 'var(--amber)' },
  ];
  if (!host.children.length) host.innerHTML = rows.map(r => `<div class="bf-fk" data-k="${r.k}" style="--c:${r.c}"><small>${r.label}</small><b data-v>0</b><span data-sub></span></div>`).join('');
  for (const r of rows) {
    const n = $(`[data-k="${r.k}"]`, host);
    $('[data-sub]', n).textContent = r.sub;
    if (shown || live) countUp($('[data-v]', n), r.v, { prefix: r.pre || '', suffix: r.suf || '', duration: live ? 1 : 1.6 });
  }
}
function renderProds() {
  const list = [...fc.products].sort((a, b) => b.suggest - a.suggest || b.demand - a.demand);
  const max = Math.max(...list.map(p => Math.max(p.current, p.demand + p.safety)), 1);
  $('#bfProds', root).innerHTML = list.map(p => `
    <li class="bf-pr${p.suggest ? ' need' : ''}">
      <span class="bf-pr-art">${productArt(p.id, 38)}</span>
      <div class="bf-pr-main">
        <div class="bf-pr-n"><b>${esc(p.name)}</b><small>${esc(p.unit)}${p.fresh ? '・冷藏短效' : ''}</small></div>
        <div class="bf-pr-bar" title="庫存 ${p.current}／預估今日需求 ${p.demand.toFixed(1)}／安全庫存 ${p.safety}">
          <i class="stock" style="width:${p.current / max * 100}%"></i>
          <i class="need" style="left:${Math.min(98, (p.demand + p.safety) / max * 100)}%"></i>
        </div>
        <small class="bf-pr-s">庫存 ${p.current}・今日需求約 ${p.demand.toFixed(1)}・安全 ${p.safety}</small>
      </div>
      <div class="bf-pr-sug">${p.suggest ? `<b>+${p.suggest}</b><small>${PUNIT[p.id] || '份'}</small>` : '<span>免生產</span>'}</div>
    </li>`).join('');
}

// ---------------- 圖表 ----------------
function initCharts() {
  charts = { fc: makeChart($('#bfFcChart', root)), sparks: {}, gauges: {} };
  $$('.bf-an-spark', root).forEach(n => { charts.sparks[n.dataset.id] = makeChart(n); });
  $$('[data-chart]', root).forEach(n => { charts.gauges[n.dataset.chart] = makeChart(n); });
  updateFcChart();
  for (const a of anomList) charts.sparks[a.id].setOption(sparkOption(a));
  updateGauges();
}

function sparkOption(a) {
  const c = a.color;
  const data = a.spark;
  return {
    animationDuration: 1400,
    grid: { left: 2, right: 8, top: 8, bottom: 4 },
    tooltip: { trigger: 'axis', axisPointer: { type: 'none' }, formatter: (p) => `${a.id === 'margin' ? `第 ${p[0].dataIndex + 1} 週` : `${14 - p[0].dataIndex} 天前`}<br/><b>${p[0].value}${a.unit === '%' ? '%' : ' 筆'}</b>`, confine: true },
    xAxis: { type: 'category', show: false, boundaryGap: false, data: data.map((_, i) => i) },
    yAxis: { type: 'value', show: false, min: (v) => v.min - (v.max - v.min) * 0.25, max: (v) => v.max + (v.max - v.min) * 0.2 },
    series: [{
      type: 'line', data, smooth: 0.4, symbol: 'circle', symbolSize: 5, showSymbol: false,
      lineStyle: { width: 2.2, color: c, shadowColor: c, shadowBlur: 8 }, itemStyle: { color: c },
      areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: c + '55' }, { offset: 1, color: c + '00' }]) },
      markPoint: { symbol: 'circle', symbolSize: 8, itemStyle: { color: c, borderColor: '#eafff4', borderWidth: 1.5, shadowBlur: 10, shadowColor: c }, label: { show: false }, data: [{ coord: [data.length - 1, data[data.length - 1]] }] },
    }],
  };
}

function updateGauges() {
  goalData = goals();
  for (const g of goalData.items) {
    const ch = charts.gauges[g.id]; if (!ch) continue;
    const prog = Math.min(100, g.value);
    const grad = new echarts.graphic.LinearGradient(0, 0, 1, 1, [{ offset: 0, color: g.color2 }, { offset: 1, color: g.color }]);
    const base = { type: 'gauge', startAngle: 90, endAngle: -270, min: 0, max: 100, pointer: { show: false }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false }, center: ['50%', '50%'] };
    const series = [{
      ...base, radius: '92%',
      progress: { show: true, roundCap: true, width: 12, itemStyle: { color: grad, shadowBlur: 14, shadowColor: g.color + '88' } },
      axisLine: { roundCap: true, lineStyle: { width: 12, color: [[1, 'rgba(255,255,255,0.06)']] } },
      title: { show: false }, detail: { show: false },
      data: [{ value: +prog.toFixed(1), name: g.fmt === 'pct' ? `目標 ${g.target}%` : '目標達成' }],
    }];
    if (g.id === 'rev') {
      series.push({ ...base, radius: '70%', progress: { show: true, roundCap: true, width: 4, itemStyle: { color: 'rgba(240,165,49,0.85)' } },
        axisLine: { roundCap: true, lineStyle: { width: 4, color: [[1, 'rgba(255,255,255,0.04)']] } }, title: { show: false }, detail: { show: false },
        data: [{ value: +goalData.timePct.toFixed(1), name: '時間進度' }] });
    }
    ch.setOption({ animationDuration: 1600, animationEasing: 'cubicOut', tooltip: { show: false }, series }, true);
    const node = $(`.bf-g[data-id="${g.id}"] [data-val]`, root);
    if (node) animNum(node, g, g.big);
    countUp($(`.bf-g[data-id="${g.id}"] [data-pct]`, root), g.value, { suffix: '%', decimals: g.fmt === 'pct' ? 1 : 0, duration: 1.6 });
  }
}
function animNum(node, g, to) {
  const o = { v: parseFloat(node.dataset.v || 0) };
  node.dataset.v = to;
  gsap.to(o, { v: to, duration: 1.6, ease: 'power3.out', onUpdate: () => { node.textContent = fmtGoal(g, o.v); } });
}

function updateFcChart() {
  if (!charts) return;
  const H = fc.hours;
  const nowH = fc.nowHour;
  const labels = H.map(x => `${x.h}時`);
  const actual = fc.actual.map((v, h) => (h <= nowH ? v : null));
  charts.fc.setOption({
    animationDuration: 1500, animationEasing: 'cubicOut',
    grid: { left: 6, right: 14, top: 34, bottom: 4, containLabel: true },
    legend: { top: 0, right: 0, itemWidth: 14, itemHeight: 8, textStyle: { fontSize: 11 }, data: ['預估營收', '80% 信賴區間', '今日實際'] },
    tooltip: {
      trigger: 'axis', confine: true,
      formatter: (ps) => {
        const i = ps[0].dataIndex, x = H[i];
        return `<b>${x.h}:00–${x.h + 1}:00</b><br/>預估營收 <b>NT$ ${Math.round(x.rev).toLocaleString()}</b><br/>區間 NT$ ${Math.round(x.lo).toLocaleString()} – ${Math.round(x.hi).toLocaleString()}<br/>預估來客 ${x.cnt.toFixed(1)} 人${i <= nowH ? `<br/>今日實際 <b>NT$ ${fc.actual[i].toLocaleString()}</b>（${fc.actualCnt[i]} 筆）` : ''}`;
      },
    },
    xAxis: { type: 'category', data: labels, boundaryGap: true, axisLabel: { interval: 2, fontSize: 11 } },
    yAxis: { type: 'value', axisLabel: { formatter: fmtK, fontSize: 11 } },
    series: [
      { name: '區間下緣', type: 'line', stack: 'ci', data: H.map(x => Math.round(x.lo)), symbol: 'none', lineStyle: { opacity: 0 }, smooth: 0.4, silent: true, tooltip: { show: false } },
      { name: '80% 信賴區間', type: 'line', stack: 'ci', data: H.map(x => Math.round(x.hi - x.lo)), symbol: 'none', smooth: 0.4, lineStyle: { opacity: 0 }, itemStyle: { color: 'rgba(94,224,196,0.5)' },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(94,224,196,0.28)' }, { offset: 1, color: 'rgba(94,224,196,0.08)' }]) }, silent: true },
      { name: '今日實際', type: 'bar', data: actual, barWidth: '46%', itemStyle: { borderRadius: [5, 5, 0, 0], color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#F0A531' }, { offset: 1, color: 'rgba(240,165,49,0.15)' }]) } },
      { name: '預估營收', type: 'line', data: H.map(x => Math.round(x.rev)), smooth: 0.4, symbol: 'circle', symbolSize: 5, showSymbol: false,
        lineStyle: { width: 3, color: '#2DB674', shadowColor: '#2DB674', shadowBlur: 12 }, itemStyle: { color: '#2DB674' },
        markLine: { symbol: 'none', silent: true, lineStyle: { color: 'rgba(234,255,244,0.55)', type: 'dashed', width: 1 }, label: { formatter: '現在', color: '#eafff4', fontSize: 11, position: 'insideEndTop' }, data: [{ xAxis: labels[nowH] }] } },
    ],
  }, true);
}

// ---------------- 摘要：打字機＋朗讀 ----------------
function renderSum(s, n) {
  let left = n, html = '';
  for (const seg of s) {
    if (left <= 0) break;
    const t = seg.t.slice(0, left); left -= seg.t.length;
    html += seg.hl ? `<b class="hl-${seg.hl}">${esc(t)}</b>` : esc(t);
  }
  $('#bfSum', root).innerHTML = html;
}
async function typeSummary() {
  const tok = ++typeSeq; typing = true;
  const total = segs.reduce((s, x) => s + x.t.length, 0);
  const step = lang === 'en' ? 3 : 1, speed = lang === 'en' ? 16 : 30;
  const box = $('#bfSum', root);
  box.classList.add('bf-typing');
  orb && orb.setMode('think');
  setOrbState('AI 正在撰寫晨報…');
  for (let i = 0; i <= total; i += step) {
    if (tok !== typeSeq) return false;
    renderSum(segs, i);
    box.insertAdjacentHTML('beforeend', '<span class="caret"></span>');
    await sleep(speed);
  }
  if (tok !== typeSeq) return false;
  renderSum(segs, total);
  box.classList.remove('bf-typing');
  typing = false;
  orb && orb.setMode('idle');
  setOrbState('已備妥今日晨報');
  return true;
}
async function regenerate(andRead) {
  segs = summary(lang);
  const box = $('#bfSum', root);
  gsap.fromTo(box, { opacity: 0.35 }, { opacity: 1, duration: 0.4 });
  const ok = await typeSummary();
  if (ok && andRead && visible) startReading();
}
function switchLang(l) {
  if (l === lang && !typing) { if (!speaking) startReading(); return; }
  lang = l;
  $$('.bf-lang', root).forEach(b => b.classList.toggle('on', b.dataset.lang === l));
  stopReading();
  regenerate(true);
}
function cancelTyping() {
  if (!typing) return;
  typeSeq++; typing = false;
  renderSum(segs, Infinity);
  $('#bfSum', root).classList.remove('bf-typing');
}
function toggleRead() { speaking ? stopReading() : startReading(); }
async function startReading() {
  cancelTyping();
  const text = segs.map(s => s.t).join('');
  const tts = LANGS.find(x => x.id === lang).tts;
  const tok = ++speakTok;
  speaking = true;
  const btn = $('#bfRead', root);
  btn.classList.add('playing'); $('.bf-read-t', btn).textContent = '停止朗讀';
  orb && orb.setMode('speak');
  setOrbState(`朗讀中・${LANGS.find(x => x.id === lang).label}`);
  const supported = 'speechSynthesis' in window && !!window.SpeechSynthesisUtterance;
  if (!supported) {
    toast('此瀏覽器不支援語音朗讀', '以動畫示範朗讀效果，可改用 Chrome／Edge／Safari', { kind: 'warn', icon: icon('mute', 18) });
    await sleep(4500);
  } else {
    stopSpeak();
    const t0 = Date.now();
    await speak(text, tts, { rate: lang === 'zh' ? 1.05 : 1 });
    // 沒有對應語音時會立即結束：保留動畫示範一段時間並提示
    if (tok === speakTok && Date.now() - t0 < 1200) {
      toast('找不到可用的語音', `此裝置未安裝 ${LANGS.find(x => x.id === lang).label} 語音，以動畫示範朗讀效果`, { kind: 'warn', icon: icon('mute', 18) });
      await sleep(Math.min(7000, text.length * (lang === 'en' ? 25 : 70)));
    }
  }
  if (tok === speakTok) finishReading();
}
function stopReading() {
  if (!speaking) return;
  speakTok++;
  stopSpeak();
  finishReading();
}
function finishReading() {
  speaking = false;
  const btn = $('#bfRead', root);
  btn.classList.remove('playing'); $('.bf-read-t', btn).textContent = '朗讀晨報';
  orb && orb.setMode('idle');
  setOrbState('已備妥今日晨報');
}
function setOrbState(t) { const n = $('#bfOrbState', root); if (n) n.textContent = t; }

// ---------------- 進場動畫 ----------------
function introAnim() {
  $$('#bfChips [data-v]', root).forEach(v => {
    if (v.dataset.target === undefined) return;
    countUp(v, +v.dataset.target, { prefix: v.dataset.pre, suffix: v.dataset.suf, decimals: +v.dataset.dec, duration: 1.8 });
  });
  renderFcKpis(true);
  countUp($('#bfHours', root), night.stats.hours, { decimals: 1, duration: 2.2 });
  $$('#bfNightStats [data-to]', root).forEach(n => countUp(n, +n.dataset.to, { duration: 1.8 }));
  gsap.fromTo($('.bf-tl-line', root), { scaleY: 0 }, { scaleY: 1, duration: 1.4, ease: 'power2.out', delay: 0.2 });
  gsap.fromTo($$('.bf-tl-i', root), { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: 0.5, stagger: 0.07, delay: 0.25, ease: 'power2.out', clearProps: 'transform' });
  gsap.fromTo($$('.bf-td', root), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.06, delay: 0.3, ease: 'power2.out', clearProps: 'transform' });
  gsap.fromTo($$('.bf-pr-bar i.stock', root), { scaleX: 0 }, { scaleX: 1, duration: 1.1, stagger: 0.05, delay: 0.4, ease: 'power3.out', transformOrigin: 'left' });
  gsap.fromTo('.bf-weather .bf-sun', { rotate: -40, opacity: 0 }, { rotate: 0, opacity: 1, duration: 1.2, ease: 'power2.out', transformOrigin: '50% 50%' });
}

// ---------------- 天氣圖示 ----------------
function weatherSvg() {
  return `<svg class="bf-w-ic" viewBox="0 0 64 52" width="58" height="48" aria-hidden="true">
    <defs><radialGradient id="bfSunG" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFE08A"/><stop offset="1" stop-color="#F0A531"/></radialGradient>
    <linearGradient id="bfCloudG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4fffa"/><stop offset="1" stop-color="#b9d8cb"/></linearGradient></defs>
    <g class="bf-sun"><circle cx="22" cy="18" r="9" fill="url(#bfSunG)"/>${Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return `<line x1="${22 + Math.cos(a) * 12.5}" y1="${18 + Math.sin(a) * 12.5}" x2="${22 + Math.cos(a) * 16}" y2="${18 + Math.sin(a) * 16}" stroke="#F0A531" stroke-width="2.4" stroke-linecap="round"/>`; }).join('')}</g>
    <path class="bf-cloud" d="M20 46h30a10 10 0 0 0 0-20 13 13 0 0 0-25 3 8.5 8.5 0 0 0-5 17z" fill="url(#bfCloudG)"/>
  </svg>`;
}
function dropSvg() { return '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z" fill="#5EB8F0"/></svg>'; }

// ---------------- Three.js AI 球體 ----------------
function glowTex(color) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, color); r.addColorStop(0.3, color + 'aa'); r.addColorStop(1, color + '00');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function createOrb(host) {
  const noop = { start() {}, stop() {}, setMode() {} };
  let renderer;
  try {
    const test = document.createElement('canvas');
    if (!(test.getContext('webgl2') || test.getContext('webgl'))) throw new Error('no webgl');
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch {
    host.classList.add('bf-nogl');
    return { ...noop, setMode(m) { host.dataset.mode = m; } };
  }
  host.classList.add('bf-gl');
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.className = 'bf-orb-canvas';
  host.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
  camera.position.set(0, 0, 7.4);
  const group = new THREE.Group(); scene.add(group);

  // 費氏球面粒子
  const N = 1500, R = 1.55;
  const base = new Float32Array(N * 3), pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  const cA = new THREE.Color('#2DB674'), cB = new THREE.Color('#5EE0C4'), cC = new THREE.Color('#7C62E6'), tmp = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * Math.PI * (3 - Math.sqrt(5));
    base[i * 3] = Math.cos(th) * r; base[i * 3 + 1] = y; base[i * 3 + 2] = Math.sin(th) * r;
    const k = (y + 1) / 2;
    tmp.copy(k > 0.5 ? cB : cA).lerp(k > 0.5 ? cA : cC, k > 0.5 ? (1 - k) * 2 * 0.4 : (0.5 - k) * 1.6);
    col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  sg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const sphere = new THREE.Points(sg, new THREE.PointsMaterial({ size: 0.075, map: glowTex('#ffffff'), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  group.add(sphere);

  // 核心光暈
  const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('#2DB674'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 }));
  core.scale.set(4.2, 4.2, 1); scene.add(core);
  const core2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('#b8ffe0'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 }));
  core2.scale.set(1.5, 1.5, 1); scene.add(core2);

  // 粒子環
  const rings = [];
  [[2.35, '#5EE0C4', 0.9, 420], [2.75, '#F0A531', -0.6, 300], [3.1, '#7C62E6', 0.4, 260]].forEach(([rad, c, speed, n], idx) => {
    const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, jitter = (Math.sin(i * 12.9898) * 43758.5453 % 1) * 0.08;
      p[i * 3] = Math.cos(a) * (rad + jitter); p[i * 3 + 1] = (Math.sin(i * 3.7) * 0.03); p[i * 3 + 2] = Math.sin(a) * (rad + jitter);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const m = new THREE.Points(g, new THREE.PointsMaterial({ size: idx === 0 ? 0.05 : 0.04, color: c, map: glowTex('#ffffff'), transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.rotation.x = 1.15 + idx * 0.28; m.rotation.z = -0.35 + idx * 0.45;
    scene.add(m); rings.push({ m, speed });
  });

  let w = 1, h = 1;
  function resize() {
    const r = host.getBoundingClientRect(); w = Math.max(1, r.width); h = Math.max(1, r.height);
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.position.z = w / h < 0.9 ? 8.6 : 7.4;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(host); resize();
  let mx = 0, my = 0;
  host.addEventListener('pointermove', (e) => { const r = host.getBoundingClientRect(); mx = (e.clientX - r.left) / r.width - 0.5; my = (e.clientY - r.top) / r.height - 0.5; });

  let running = false, inView = true, raf = 0, last = 0, t = 0, mode = 'idle', energy = 0;
  const io = new IntersectionObserver((ents) => { inView = ents[0].isIntersecting; if (inView) kick(); });
  io.observe(host);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });

  function kick() { if (running && inView && !document.hidden && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function frame(now) {
    raf = 0;
    if (!running || !inView || document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    const target = mode === 'speak' ? 0.55 + 0.45 * Math.abs(Math.sin(t * 7.3) * Math.sin(t * 2.1 + 1)) : mode === 'think' ? 0.35 : 0.05;
    energy += (target - energy) * Math.min(1, dt * 6);
    for (let i = 0; i < N; i++) {
      const bx = base[i * 3], by = base[i * 3 + 1], bz = base[i * 3 + 2];
      const wave = Math.sin(t * 2.2 + by * 5 + bx * 2) * 0.045 + Math.sin(t * 3.1 + bz * 6) * 0.03;
      const s = R * (1 + wave * (0.6 + energy * 3.2) + energy * 0.06);
      pos[i * 3] = bx * s; pos[i * 3 + 1] = by * s; pos[i * 3 + 2] = bz * s;
    }
    sg.attributes.position.needsUpdate = true;
    group.rotation.y += dt * (0.22 + energy * 0.9);
    group.rotation.x = Math.sin(t * 0.35) * 0.15 + my * 0.35;
    group.rotation.z = mx * 0.2;
    rings.forEach((r, i) => { r.m.rotation.y += dt * r.speed * (0.4 + energy * 1.4); r.m.material.opacity = 0.55 + energy * 0.4 + Math.sin(t * 1.5 + i) * 0.1; });
    const pulse = 1 + Math.sin(t * 1.8) * 0.05 + energy * 0.45;
    core.scale.set(4.2 * pulse, 4.2 * pulse, 1); core.material.opacity = 0.65 + energy * 0.35;
    core2.scale.setScalar(1.4 + energy * 1.2);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  return {
    start() { running = true; kick(); },
    stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
    setMode(m) { mode = m; host.dataset.mode = m; },
  };
}
