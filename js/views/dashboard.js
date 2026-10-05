// 總覽 Dashboard
import { store } from '../state.js';
import { $, $$, el, gsap, countUp, money, fmtTime, fmtDate, esc } from '../util.js';
import { icon } from '../icons.js';
import { makeChart, trendOption, channelOption, productOption, heatmapOption } from '../charts.js';
import { createHero } from '../three-hero.js';
import { startOfDay, addDays } from '../data.js';
import { mountThree, renderThree } from './dash-three.js';

let root, charts = null, hero = null;
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

const KPI_DEF = [
  { key: 'today', label: '今日營收', icon: 'coins', color: 'var(--leaf)', prefix: 'NT$ ', spark: 'total' },
  { key: 'month', label: '本月營收', icon: 'trend', color: 'var(--sky)', prefix: 'NT$ ', spark: 'total' },
  { key: 'orders', label: '本月訂單數', icon: 'receipt', color: 'var(--violet)', suffix: ' 筆', spark: 'count' },
  { key: 'margin', label: '毛利率', icon: 'percent', color: 'var(--amber)', suffix: '%', decimals: 1, spark: 'margin' },
  { key: 'ar', label: '應收帳款', icon: 'clock', color: 'var(--pink)', prefix: 'NT$ ' },
  { key: 'low', label: '庫存警示', icon: 'alert', color: 'var(--coral)', suffix: ' 項' },
];

function sparkPath(vals, w = 120, h = 34) {
  const max = Math.max(...vals), min = Math.min(...vals);
  const pts = vals.map((v, i) => [i / (vals.length - 1) * w, h - 3 - (max === min ? 0.5 : (v - min) / (max - min)) * (h - 6)]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  return { line: d, area: d + ` L ${w} ${h} L 0 ${h} Z` };
}

function aiStats() {
  const today = startOfDay(new Date());
  const t = store.ordersBetween(today, addDays(today, 1));
  const online = t.filter(o => o.channel !== 'pos').length;
  const msgs = online * 6 + 14;
  const hours = (msgs * 1.5 + t.length * 5 + 20) / 60;
  return { msgs, online, invoices: t.length, hours, total: msgs + online + t.length };
}

export default {
  mount(section, ctx) {
    root = section;
    const now = new Date();
    section.innerHTML = `
    <div class="dash">
      <div class="hero glass anim-in">
        <div class="hero-txt">
          <span class="kicker">${icon('sparkle', 14)} 早安，阿美 · ${fmtDate(now)} 星期${WEEK[now.getDay()]}</span>
          <h2>今天 AI 已經幫你處理了 <b class="grad-txt" id="hTotal">0</b> 件事</h2>
          <p>多語言自動回覆、接單、開發票、記帳、對帳都在背景完成。你只需要專心做甜點。</p>
          <div class="hero-stats">
            <div><b id="hMsgs">0</b><span>則訊息自動回覆</span></div>
            <div><b id="hOnline">0</b><span>筆訂單自動建立</span></div>
            <div><b id="hInv">0</b><span>張電子發票開立</span></div>
            <div><b id="hHours">0</b><span>小時工時省下</span></div>
          </div>
          <div class="hero-actions">
            <a class="btn btn-primary" href="shop.html" target="greenup-shop">${icon('store', 18)} 開啟銷售網頁（客人端）</a>
            <button class="btn btn-ghost" data-go="chat">${icon('chat', 18)} 模擬聊天收單</button>
            <button class="btn btn-ghost" data-go="ask">${icon('ask', 18)} 用問的</button>
          </div>
        </div>
        <div class="hero-3d" id="hero3d"><div class="hero-3d-label"><span>GreenUP AI Core</span><small>7 個通路 · 即時同步</small></div></div>
      </div>

      <div class="three anim-in" id="dashThree"></div>
      <div class="kpis">
        ${KPI_DEF.map(k => `
          <div class="kpi glass anim-in" data-k="${k.key}" style="--c:${k.color}">
            <div class="kpi-top"><span class="kpi-ic">${icon(k.icon, 18)}</span><span class="kpi-label">${k.label}</span><span class="kpi-delta" data-delta></span></div>
            <div class="kpi-val" data-val>0</div>
            <div class="kpi-foot"><small data-sub></small><svg class="spark" viewBox="0 0 120 34" preserveAspectRatio="none"><path class="sa" d=""/><path class="sl" d=""/></svg></div>
          </div>`).join('')}
      </div>

      <div class="dash-grid">
        <div class="card glass c-trend anim-in"><div class="card-h"><h3>近 30 天營收趨勢</h3><span class="chip-sm">含稅 · 全通路</span></div><div class="chart" id="cTrend"></div></div>
        <div class="card glass c-channel anim-in"><div class="card-h"><h3>通路營收占比</h3><span class="chip-sm">近 30 天</span></div><div class="chart" id="cChannel"></div></div>
        <div class="card glass c-feed anim-in"><div class="card-h"><h3>${icon('bot', 18)} AI 即時動態</h3><span class="live-dot">LIVE</span></div><ul class="feed" id="feed"></ul></div>
        <div class="card glass c-products anim-in"><div class="card-h"><h3>熱銷商品排行</h3><span class="chip-sm">近 30 天營收</span></div><div class="chart" id="cProducts"></div></div>
        <div class="card glass c-heat anim-in"><div class="card-h"><h3>下單時段熱力圖</h3><span class="chip-sm">近 30 天 · 週 × 小時</span></div><div class="chart" id="cHeat"></div></div>
      </div>
    </div>`;
    $$('[data-go]', section).forEach(b => b.addEventListener('click', () => ctx.go(b.dataset.go)));
    renderFeed();
    mountThree($('#dashThree', section), ctx.go);
    store.on('order', ({ order }) => { refresh(true); hero && hero.pulse(order.channel); });
    store.on('order-updated', () => refresh(true));
    store.on('reset', () => refresh(true));
    store.on('activity', (a) => addFeed(a, true));
  },
  show() {
    if (!hero) hero = createHero($('#hero3d', root));
    if (!charts) {
      charts = { trend: makeChart($('#cTrend', root)), channel: makeChart($('#cChannel', root)), products: makeChart($('#cProducts', root)), heat: makeChart($('#cHeat', root)) };
    }
    refresh(false);
  },
};

function refresh(live) {
  renderThree(live);
  const k = store.kpis();
  const st = aiStats();
  countUp($('#hTotal', root), st.total); countUp($('#hMsgs', root), st.msgs); countUp($('#hOnline', root), st.online);
  countUp($('#hInv', root), st.invoices); countUp($('#hHours', root), st.hours, { decimals: 1 });
  const daily = store.dailySeries(14);
  for (const def of KPI_DEF) {
    const card = $(`.kpi[data-k="${def.key}"]`, root);
    if (!card) continue;
    const v = k[def.key];
    const valEl = $('[data-val]', card);
    const before = parseFloat(valEl.dataset.value || 0);
    countUp(valEl, v, { prefix: def.prefix || '', suffix: def.suffix || '', decimals: def.decimals || 0, duration: live ? 1.2 : 1.8 });
    if (live && Math.abs(before - v) > 0.01) { card.classList.remove('flash'); void card.offsetWidth; card.classList.add('flash'); }
    const delta = { today: k.todayDelta, month: k.monthDelta, orders: k.ordersDelta, margin: k.marginDelta }[def.key];
    const dEl = $('[data-delta]', card);
    if (delta !== undefined) { const up = delta >= 0; dEl.className = 'kpi-delta ' + (up ? 'up' : 'down'); dEl.textContent = `${up ? '▲' : '▼'} ${Math.abs(delta).toFixed(1)}${def.key === 'margin' ? 'pt' : '%'}`; }
    else if (def.key === 'low') { dEl.className = 'kpi-delta ' + (k.low ? 'warn' : 'up'); dEl.textContent = k.low ? '需補貨' : '正常'; }
    else { dEl.className = 'kpi-delta warn'; dEl.textContent = `${k.arCount} 筆`; }
    const sub = { today: `今日 ${k.ordersToday} 筆訂單`, month: '較上月同期', orders: `今日 +${k.ordersToday}`, margin: '本月（未稅）', ar: '付款連結已自動催收', low: k.lowNames.join('、') || '庫存充足' }[def.key];
    $('[data-sub]', card).textContent = sub;
    let vals = null;
    if (def.spark === 'total') vals = daily.map(d => d.value);
    else if (def.spark === 'count') vals = daily.map(d => d.orders);
    else if (def.spark === 'margin') vals = daily.map((d, i) => 60 + Math.sin(i * 1.3) * 2 + (d.value % 7) / 3);
    else vals = [3, 4, 3, 5, 4, 6, 5, 4, 6, 5, 7, 6, 5, def.key === 'low' ? k.low + 2 : 6];
    const p = sparkPath(vals);
    $('.sl', card).setAttribute('d', p.line); $('.sa', card).setAttribute('d', p.area);
  }
  if (!charts) return;
  const today = startOfDay(new Date());
  const last30 = store.ordersBetween(addDays(today, -29), addDays(today, 1));
  charts.trend.setOption(trendOption(store.dailySeries(30)));
  charts.channel.setOption(channelOption(last30));
  charts.products.setOption(productOption(last30));
  charts.heat.setOption(heatmapOption(last30));
}

const KIND_IC = { order: ['chat', 'var(--leaf)'], web: ['store', 'var(--mint)'], pay: ['coins', 'var(--sky)'], tax: ['tax', 'var(--amber)'], meet: ['meeting', 'var(--violet)'], stock: ['alert', 'var(--coral)'], staff: ['clock', 'var(--sky)'], purchase: ['cart', 'var(--amber)'], ship: ['truck', 'var(--mint)'], bank: ['bank', 'var(--sky)'] };
function feedItem(a) {
  const [ic, c] = KIND_IC[a.kind] || KIND_IC.order;
  return el(`<li style="--c:${c}"><span class="f-ic">${icon(ic, 16)}</span><div><p>${esc(a.text)}</p><small>${fmtTime(a.ts)}</small></div></li>`);
}
function renderFeed() {
  const ul = $('#feed', root); ul.innerHTML = '';
  store.activity.slice(0, 12).forEach(a => ul.appendChild(feedItem(a)));
}
function addFeed(a, animate) {
  const ul = $('#feed', root); if (!ul) return;
  const li = feedItem(a); ul.prepend(li);
  while (ul.children.length > 14) ul.lastElementChild.remove();
  if (animate) gsap.fromTo(li, { opacity: 0, x: -20, backgroundColor: 'rgba(45,182,116,0.25)' }, { opacity: 1, x: 0, backgroundColor: 'rgba(45,182,116,0)', duration: 1.2, ease: 'power2.out' });
}
