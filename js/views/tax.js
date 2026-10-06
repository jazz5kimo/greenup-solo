// 自動化報稅：營業稅（401）試算示範
import { store } from '../state.js';
import { $, $$, el, gsap, money, countUp, fmtDate, pad, fmtMD, toast } from '../util.js';
import { icon } from '../icons.js';
import { makeChart } from '../charts.js';
import { addDays, startOfDay } from '../data.js';
import { renderExtra } from './tax-extra.js';
import { vatPeriod } from '../ledger.js';
import { TENANT } from '../tenant.js';

let root, chart = null, cdTimer = 0, submitted = false;

function period(now = new Date()) {
  const m = now.getMonth(); // 0-based
  const startM = m - (m % 2);
  const start = new Date(now.getFullYear(), startM, 1);
  const end = new Date(now.getFullYear(), startM + 2, 1);
  const deadline = new Date(now.getFullYear(), startM + 2, 15, 23, 59, 59);
  return { start, end, deadline, idx: startM / 2 + 1, label: `${startM + 1}–${startM + 2} 月`, roc: now.getFullYear() - 1911 };
}

function compute() {
  // 與總覽、老闆的錢共用 ledger.vatPeriod：進項含所有附發票的進貨與費用
  const v = vatPeriod();
  return { p: period(), sales: v.sales, buys: v.ins, salesNet: v.salesNet, outTax: v.outTax, buyNet: v.buyNet, inTax: v.inTax, payable: v.payable };
}

export default {
  mount(section, ctx) {
    root = section;
    const { p } = compute();
    section.innerHTML = `
    <div class="tax-wrap">
      <div class="tx-tabs anim-in">${[['vat', 'receipt', '營業稅 401', '每兩個月'], ['cit', 'bank', '營利事業所得稅', '年度結算・暫繳'], ['wh', 'users', '扣繳與二代健保', '薪資、租金、勞務'], ['cal', 'calendar', '稅務行事曆', '全年截止日提醒']].map(([k, ic, t, sub], i) => `<button class="glass tx-tab ${i ? '' : 'on'}" data-p="${k}">${icon(ic, 20)}<span><b>${t}</b><small>${sub}</small></span></button>`).join('')}</div>
      <div class="tx-pane" data-p="vat">
      <div class="glass tax-head anim-in">
        <div class="th-l">
          <span class="demo-badge">${icon('alert', 14)} 試算／示範・非正式申報</span>
          <h2>民國 ${p.roc} 年 ${p.label}（第 ${p.idx} 期）營業稅</h2>
          <p>AI 已從 <b id="tSalesN">0</b> 張銷項電子發票與 <b id="tBuyN">0</b> 張進項憑證自動彙整，本期截至今日的試算如下。</p>
        </div>
        <div class="countdown">
          <svg viewBox="0 0 120 120" class="cd-ring"><circle cx="60" cy="60" r="52" class="cd-bg"/><circle cx="60" cy="60" r="52" class="cd-fg" id="cdRing"/></svg>
          <div class="cd-days"><b id="cdD">0</b><span>天</span></div>
          <div class="cd-meta"><small>申報截止</small><b>${fmtDate(p.deadline)}</b><span class="mono" id="cdHMS">00:00:00</span></div>
        </div>
      </div>
      <div class="tax-eq anim-in">
        <div class="glass teq" style="--c:var(--leaf)"><small>銷項稅額（銷售額 × 5%）</small><b id="tOut">0</b><span>銷售額 <em id="tSales">0</em></span></div>
        <div class="op">−</div>
        <div class="glass teq" style="--c:var(--sky)"><small>進項稅額（可扣抵）</small><b id="tIn">0</b><span>進貨及費用 <em id="tBuy">0</em></span></div>
        <div class="op">＝</div>
        <div class="glass teq total" style="--c:var(--amber)"><small>本期應納稅額</small><b id="tPay">0</b><span>系統試算・待本人確認</span></div>
      </div>
      <div class="tax-grid">
        <div class="glass card anim-in"><div class="card-h"><h3>本期累計：銷項 vs 進項稅額</h3><span class="chip-sm">逐日自動入帳</span></div><div class="chart" id="cTax"></div>
          <ul class="checks" id="checks"></ul>
        </div>
        <div class="glass card form401 anim-in">
          <div class="f-h"><div><b>營業人銷售額與稅額申報書（401）</b><small>預覽・示範用，格式簡化</small></div><span class="stamp">試算</span></div>
          <div class="f-meta"><span>營業人名稱：${TENANT.name}（示範）</span><span>統一編號：＊＊＊＊＊＊＊＊</span><span>所屬年月：${p.roc} 年 ${p.label}</span></div>
          <table class="f-tbl" id="f401"></table>
          <div class="f-actions">
            <button class="btn btn-primary btn-lg" id="taxGo">${icon('shield', 18)} 本人確認後送出</button>
            <button class="btn btn-ghost" id="taxAcct">${icon('users', 16)} 交給記帳士審核</button>
            <small>送出前 AI 不會自動申報；需負責人確認。本示範不會連線財政部系統。</small>
          </div>
        </div>
      </div>
      </div>
      <div class="tx-pane" data-p="cit" hidden></div>
      <div class="tx-pane" data-p="wh" hidden></div>
      <div class="tx-pane" data-p="cal" hidden></div>
      <div class="tax-success" id="taxOk" hidden>
        <div class="ts-card">
          <svg viewBox="0 0 120 120" class="ts-check"><circle cx="60" cy="60" r="50"/><path d="M38 62 l15 15 l30 -32"/></svg>
          <h3>申報資料已送出（模擬）</h3>
          <p>收執編號 <b class="mono" id="taxNo"></b></p>
          <p class="ts-sub">應納稅額 <b id="taxAmt"></b> 已排入扣款排程；AI 將於截止日前 3 天再次提醒。</p>
          <button class="btn btn-ghost" id="taxClose">完成</button>
        </div>
      </div>
    </div>`;
    $('#taxGo', section).addEventListener('click', submit);
    $('#taxAcct', section).addEventListener('click', () => { toast('已送交記帳士審核（示範）', '林記帳士事務所將收到 401 申報資料與進銷項明細，審核完成後通知你確認送出', { kind: 'info', icon: icon('users', 18) }); ctx && ctx.go && setTimeout(() => ctx.go('hub'), 900); });
    $$('.tx-tab', section).forEach(b => b.addEventListener('click', () => {
      $$('.tx-tab', root).forEach(x => x.classList.toggle('on', x === b));
      $$('.tx-pane', root).forEach(x => { x.hidden = x.dataset.p !== b.dataset.p; });
      const pane = $(`.tx-pane[data-p="${b.dataset.p}"]`, root);
      if (b.dataset.p !== 'vat') renderExtra(b.dataset.p, pane);
      gsap.fromTo(pane.children, { opacity: 0, y: 18 }, { opacity: 1, y: 0, stagger: 0.06, duration: 0.5, ease: 'power3.out' });
      window.dispatchEvent(new Event('resize'));
    }));
    $('#taxClose', section).addEventListener('click', () => gsap.to('#taxOk', { opacity: 0, duration: 0.3, onComplete: () => { $('#taxOk', root).hidden = true; } }));
    store.on('order', () => root && !root.hidden && render(true));
  },
  show() {
    if (!chart) chart = makeChart($('#cTax', root));
    render(false);
    clearInterval(cdTimer); tickCd(); cdTimer = setInterval(tickCd, 1000);
  },
  hide() { clearInterval(cdTimer); },
};

function tickCd() {
  const { p } = compute();
  const ms = Math.max(0, p.deadline - Date.now());
  const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60, s = Math.floor(ms / 1e3) % 60;
  $('#cdD', root).textContent = d;
  $('#cdHMS', root).textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
  const total = p.deadline - p.start;
  const ring = $('#cdRing', root); const C = 2 * Math.PI * 52;
  ring.style.strokeDasharray = C; ring.style.strokeDashoffset = C * (1 - ms / total);
}

function render(live) {
  const c = compute();
  countUp($('#tSalesN', root), c.sales.length, { duration: 1 });
  countUp($('#tBuyN', root), c.buys.length, { duration: 1 });
  countUp($('#tOut', root), c.outTax, { prefix: 'NT$ ' });
  countUp($('#tIn', root), c.inTax, { prefix: 'NT$ ' });
  countUp($('#tPay', root), c.payable, { prefix: 'NT$ ' });
  countUp($('#tSales', root), c.salesNet, { prefix: 'NT$ ' });
  countUp($('#tBuy', root), c.buyNet, { prefix: 'NT$ ' });

  // 逐日累計
  const days = [];
  for (let d = new Date(c.p.start); d <= new Date() && d < c.p.end; d = addDays(d, 1)) days.push(startOfDay(d));
  let co = 0, ci = 0; const outS = [], inS = [];
  for (const d of days) {
    const e = addDays(d, 1);
    co += store.sum(store.ordersBetween(d, e), 'tax');
    ci += c.buys.filter(b => b.ts >= +d && b.ts < +e).reduce((s, b) => s + b.tax, 0);
    outS.push(co); inS.push(ci);
  }
  const echarts = window.echarts;
  chart.setOption({
    animationDuration: 1400,
    grid: { left: 8, right: 12, top: 34, bottom: 4, containLabel: true },
    legend: { top: 0, right: 0 },
    tooltip: { trigger: 'axis', valueFormatter: v => 'NT$ ' + Number(v).toLocaleString() },
    xAxis: { type: 'category', boundaryGap: false, data: days.map(d => fmtMD(d)) },
    yAxis: { type: 'value' },
    series: [
      { name: '累計銷項稅額', type: 'line', data: outS, smooth: true, showSymbol: false, lineStyle: { width: 3, color: '#2DB674' }, itemStyle: { color: '#2DB674' },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#2DB67466' }, { offset: 1, color: '#2DB67400' }]) } },
      { name: '累計進項稅額', type: 'line', data: inS, step: 'end', showSymbol: false, lineStyle: { width: 3, color: '#2E97D4' }, itemStyle: { color: '#2E97D4' },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#2E97D455' }, { offset: 1, color: '#2E97D400' }]) } },
    ],
  });

  const voids = 0;
  $('#checks', root).innerHTML = [
    `本期電子發票 ${c.sales.length} 張，字軌連號、無跳號`,
    `進項憑證 ${c.buys.length} 張已與電子發票平台比對（模擬）`,
    `銷項稅額與帳載「銷項稅額」科目一致`,
    `作廢／折讓發票 ${voids} 張，無異常`,
  ].map(t => `<li>${icon('check', 14)}${t}</li>`).join('');

  const r = (n) => Math.round(n).toLocaleString();
  $('#f401', root).innerHTML = `
    <tr class="sec"><th colspan="3">銷項</th></tr>
    <tr><td>應稅・電子發票（含收銀機）</td><td class="r">銷售額 ${r(c.salesNet)}</td><td class="r">稅額 ${r(c.outTax)}</td></tr>
    <tr><td>零稅率銷售額</td><td class="r">0</td><td class="r">—</td></tr>
    <tr><td>免稅銷售額</td><td class="r">0</td><td class="r">—</td></tr>
    <tr class="sec"><th colspan="3">進項</th></tr>
    <tr><td>進貨及費用（統一發票扣抵聯）</td><td class="r">金額 ${r(c.buyNet)}</td><td class="r">稅額 ${r(c.inTax)}</td></tr>
    <tr><td>固定資產</td><td class="r">0</td><td class="r">0</td></tr>
    <tr class="sec"><th colspan="3">稅額計算</th></tr>
    <tr><td>(1) 本期銷項稅額合計</td><td></td><td class="r">${r(c.outTax)}</td></tr>
    <tr><td>(7) 得扣抵進項稅額合計</td><td></td><td class="r">${r(c.inTax)}</td></tr>
    <tr><td>(8) 上期累積留抵稅額</td><td></td><td class="r">0</td></tr>
    <tr class="tot"><td>(11) 本期應實繳稅額</td><td></td><td class="r">NT$ ${r(c.payable)}</td></tr>`;
  if (live) gsap.fromTo('#f401 .tot', { backgroundColor: 'rgba(240,165,49,.4)' }, { backgroundColor: 'rgba(240,165,49,.08)', duration: 1.5 });
}

function submit() {
  if (submitted) { $('#taxOk', root).hidden = false; gsap.fromTo('#taxOk', { opacity: 0 }, { opacity: 1, duration: 0.3 }); return; }
  const c = compute();
  submitted = true;
  const btn = $('#taxGo', root);
  btn.innerHTML = `${icon('check', 18)} 已送出（模擬）`; btn.classList.add('done');
  $('#taxNo', root).textContent = `T${c.p.roc}${pad(c.p.idx)}-${String(Date.now()).slice(-8)}`;
  $('#taxAmt', root).textContent = money(c.payable);
  const ok = $('#taxOk', root); ok.hidden = false;
  const circle = $('.ts-check circle', ok), path = $('.ts-check path', ok);
  const lc = circle.getTotalLength(), lp = path.getTotalLength();
  gsap.set(circle, { strokeDasharray: lc, strokeDashoffset: lc }); gsap.set(path, { strokeDasharray: lp, strokeDashoffset: lp });
  const tl = gsap.timeline();
  tl.fromTo(ok, { opacity: 0 }, { opacity: 1, duration: 0.3 })
    .fromTo('.ts-card', { scale: 0.7, y: 30 }, { scale: 1, y: 0, duration: 0.6, ease: 'back.out(1.8)' }, '<')
    .to(circle, { strokeDashoffset: 0, duration: 0.7, ease: 'power2.inOut' })
    .to(path, { strokeDashoffset: 0, duration: 0.45, ease: 'power2.out' })
    .from('.ts-card h3, .ts-card p, .ts-card button', { opacity: 0, y: 12, stagger: 0.08, duration: 0.4 });
  confetti($('.ts-card', ok));
  store.log('tax', `營業稅 ${c.p.label} 申報資料已由負責人確認送出（模擬），應納 ${money(c.payable)}`);
}

function confetti(host) {
  const colors = ['#2DB674', '#F0A531', '#2E97D4', '#7C62E6', '#EC6A55', '#DD5597', '#5EE0C4'];
  for (let i = 0; i < 70; i++) {
    const d = el(`<i class="confetti" style="background:${colors[i % colors.length]}"></i>`);
    host.appendChild(d);
    const a = Math.random() * Math.PI * 2, r = 160 + Math.random() * 240;
    gsap.fromTo(d, { x: 0, y: 0, rotate: 0, opacity: 1 }, { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.7 + 120, rotate: Math.random() * 720, opacity: 0, duration: 1.6 + Math.random(), ease: 'power3.out', delay: 0.6, onComplete: () => d.remove() });
  }
}
