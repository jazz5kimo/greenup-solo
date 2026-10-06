// 會計帳務：產銷人發財、損益表、資產負債表、收入費用明細帳
import { store } from '../state.js';
import { $, $$, gsap, esc, money, fmtMD, countUp } from '../util.js';
import { icon } from '../icons.js';
import { makeChart } from '../charts.js';
import { PRODUCT_MAP } from '../data.js';
import { FIVE, FIVE_MAP, RD_PROJECTS, RATES, month, monthList, position } from '../ledger.js';

let root, sel, tab = 'sales', filter = 'all', query = '', paneCharts = [], trendChart, roseChart;
const pct = (a, b) => b ? (a / b * 100).toFixed(1) + '%' : '—';
const n0 = (v) => Math.round(v).toLocaleString('en-US');

export default {
  mount(section) {
    root = section;
    const months = monthList();
    sel = months[months.length - 2];
    section.innerHTML = `
    <div class="bk-wrap">
      <div class="glass bk-head anim-in">
        <div>
          <span class="demo-badge">${icon('alert', 14)} 示範資料・依商業會計法科目簡化</span>
          <h2 id="bkTitle"></h2>
          <p>每一筆訂單、進貨發票、薪資與費用，AI 都自動歸到<b>產、銷、人、發、財</b>五大管理面向與會計科目，月底自動結帳，產生損益表與資產負債表。</p>
        </div>
        <div class="bk-months">${months.map(x => `<button class="seg ${x === sel ? 'on' : ''}" data-y="${x.y}" data-m="${x.m}">${x.label}</button>`).join('')}</div>
      </div>
      <div class="bk-kpis anim-in" id="bkKpis"></div>
      <div class="bk-five anim-in" id="bkFive">${FIVE.map(f => `
        <button class="glass five ${f.id === tab ? 'on' : ''}" data-id="${f.id}" style="--c:${f.color}">
          <span class="five-k">${f.k}</span>
          <span class="five-t"><b>${f.name}</b><small>${f.desc}</small></span>
          <span class="five-v" data-v="${f.id}">0</span>
          <i class="five-bar"><em data-b="${f.id}"></em></i>
        </button>`).join('')}</div>
      <div class="bk-main">
        <div class="glass card bk-pane anim-in" id="bkPane"></div>
        <div class="glass card bk-is anim-in"><div class="card-h"><h3>${icon('file', 18)} 損益表</h3><span class="chip-sm" id="isChip"></span></div><div id="isBody" class="is"></div></div>
      </div>
      <div class="bk-charts">
        <div class="glass card anim-in"><div class="card-h"><h3>${icon('trend', 18)} 收入與費用趨勢</h3><span class="chip-sm">近三個月・未稅</span></div><div class="chart" id="cBkTrend"></div></div>
        <div class="glass card anim-in"><div class="card-h"><h3>${icon('dashboard', 18)} 支出結構（產銷人發財）</h3><span class="chip-sm">營業成本＋營業費用</span></div><div class="chart" id="cBkRose"></div></div>
      </div>
      <div class="glass card bk-ledger anim-in">
        <div class="card-h"><h3>${icon('book', 18)} 收入費用明細帳</h3><span class="chip-sm" id="ledChip"></span></div>
        <div class="led-tools">
          <div class="led-filters">${[['all', '全部'], ['in', '收入'], ['out', '支出'], ...FIVE.map(f => [f.id, f.k + '・' + f.name])].map(([k, t]) => `<button class="seg ${k === filter ? 'on' : ''}" data-f="${k}">${t}</button>`).join('')}</div>
          <input class="led-q" id="ledQ" placeholder="搜尋科目、摘要、對象…">
        </div>
        <div class="tbl-wrap led-tbl"><table class="tbl"><thead><tr><th>日期</th><th>五管</th><th>會計科目</th><th>摘要</th><th class="col-items">對象</th><th class="col-items">憑證</th><th class="r">未稅金額</th><th class="r">稅額</th><th class="r">AI 分類</th></tr></thead><tbody id="ledBody"></tbody></table></div>
      </div>
    </div>`;
    $$('.bk-months .seg', section).forEach(b => b.addEventListener('click', () => {
      sel = months.find(x => x.y === +b.dataset.y && x.m === +b.dataset.m);
      $$('.bk-months .seg', root).forEach(x => x.classList.toggle('on', x === b));
      render(true);
    }));
    $$('.five', section).forEach(b => b.addEventListener('click', () => {
      tab = b.dataset.id; $$('.five', root).forEach(x => x.classList.toggle('on', x === b));
      gsap.fromTo(b, { scale: 0.96 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
      renderPane(); renderLedger();
    }));
    $$('.led-filters .seg', section).forEach(b => b.addEventListener('click', () => { filter = b.dataset.f; $$('.led-filters .seg', root).forEach(x => x.classList.toggle('on', x === b)); renderLedger(); }));
    $('#ledQ', section).addEventListener('input', (e) => { query = e.target.value.trim(); renderLedger(); });
    const refresh = () => root && !root.hidden && render(false);
    store.on('order', refresh); store.on('order-updated', refresh); store.on('reset', refresh);
  },
  show() {
    if (!trendChart) { trendChart = makeChart($('#cBkTrend', root)); roseChart = makeChart($('#cBkRose', root)); }
    render(true);
  },
};

function render(anim) {
  const d = month(sel.y, sel.m);
  $('#bkTitle', root).innerHTML = d.current ? `${d.m} 月帳務：AI 即時記帳中（截至 ${d.m}/${d.elapsed}）` : `${d.m} 月帳務：AI 已自動完成月結`;
  const k = [
    ['營業收入', d.net, 'coins', '#2DB674', `訂單 ${d.orders.length} 筆`],
    ['營業成本', d.cost, 'box', '#5EE0C4', `毛利率 ${pct(d.gross, d.net)}`],
    ['營業費用', d.opex, 'receipt', '#F0A531', `占營收 ${pct(d.opex, d.net)}`],
    ['稅前淨利', d.pretax, 'trend', '#7C62E6', `淨利率 ${pct(d.pretax, d.net)}`],
    ['應收帳款', d.ar, 'clock', '#EC6A55', `${d.arN} 筆待收款`],
  ];
  $('#bkKpis', root).innerHTML = k.map(([t, v, ic, c, sub], i) => `<div class="glass kpi" style="--c:${c}"><div class="kpi-top"><span class="kpi-ic">${icon(ic, 16)}</span><span class="kpi-label">${t}</span></div><div class="kpi-val" id="bkK${i}">NT$ 0</div><div class="kpi-sub">${sub}</div></div>`).join('');
  k.forEach(([, v], i) => { const n = $('#bkK' + i, root); n.classList.toggle('neg', v < 0); countUp(n, Math.abs(v), { prefix: v < 0 ? '−NT$ ' : 'NT$ ', from: 0 }); });
  const max = Math.max(...d.byFive.map(f => f.value), 1);
  for (const f of d.byFive) {
    countUp($(`[data-v="${f.id}"]`, root), f.value, { prefix: 'NT$ ', from: 0 });
    gsap.to($(`[data-b="${f.id}"]`, root), { width: (f.value / max * 100) + '%', duration: 1.2, ease: 'power3.out' });
  }
  if (anim) gsap.fromTo($$('.five', root), { y: 16, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.07, duration: 0.6, ease: 'power3.out' });
  renderIS(d); renderPane(); renderTrend(); renderRose(d); renderLedger();
}

function renderIS(d) {
  $('#isChip', root).textContent = d.current ? `${d.m}/1–${d.m}/${d.elapsed}` : `${d.y} 年 ${d.m} 月`;
  const L = [
    ['h', '營業收入淨額', d.net], ['s', '銷貨收入（全通路）', d.net],
    ['h', '營業成本', -d.cost], ['s', '銷貨成本（依 BOM 標準成本結轉）', -d.cogs], ['s', '製造費用（水電、折舊、清潔、修繕）', -d.mfg],
    ['t', '營業毛利', d.gross],
    ['h', '營業費用', -d.opex], ['s', '推銷費用（廣告、運費、金流、平台手續費、交通）', -d.sell], ['s', '管理費用（薪資、勞健保、租金、記帳士、管理費等）', -d.admin], ['s', '研究發展費用', -d.rd],
    ['t', '營業淨利', d.opInc],
    ['s', '營業外收入（利息）', d.other],
    ['g', '稅前淨利', d.pretax],
  ];
  $('#isBody', root).innerHTML = L.map(([c, t, v]) => `<div class="is-row ${c}"><span>${t}</span><b class="${v < 0 ? 'neg' : ''}">${v < 0 ? '(' + n0(-v) + ')' : n0(v)}</b><em>${pct(Math.abs(v), d.net)}</em></div>`).join('')
    + `<div class="is-note">${icon('sparkle', 14)} AI 檢核：借貸平衡、發票與帳載一致、薪資與勞健保已入帳${d.current ? '；本月固定費用按天數估列' : ''}。</div>`;
}

function disposePane() { for (const c of paneCharts) { try { c.dispose(); } catch { /* ignore */ } } paneCharts = []; }
function chart(id) { const c = makeChart($('#' + id, root)); paneCharts.push(c); return c; }

function renderPane() {
  const d = month(sel.y, sel.m), f = FIVE_MAP[tab];
  disposePane();
  const pane = $('#bkPane', root);
  pane.style.setProperty('--c', f.color);
  const head = `<div class="card-h"><h3><span class="five-k sm">${f.k}</span>${f.name}</h3><span class="chip-sm">${f.desc}</span></div>`;
  const chips = (arr) => `<div class="pane-chips">${arr.map(([t, v, s]) => `<div><small>${t}</small><b>${v}</b>${s ? `<span>${s}</span>` : ''}</div>`).join('')}</div>`;
  if (tab === 'prod') {
    const buys = d.entries.filter(e => e.pl === 'inv');
    const inv = store.inventory();
    pane.innerHTML = head + chips([
      ['本月原料包材進貨', money(d.purchases), `${buys.length} 張進項發票`], ['銷貨成本', money(d.cogs), 'BOM 標準成本'], ['製造費用', money(d.mfg), '水電、折舊、清潔'], ['成品存貨', money(inv.reduce((s, p) => s + p.current * p.cost, 0)), `${inv.filter(p => p.low).length} 項低於安全庫存`],
    ]) + `<div class="pane-split"><div class="chart" id="cP1"></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>日期</th><th>進貨品項</th><th class="r">未稅</th></tr></thead><tbody>${buys.slice(0, 9).map(e => `<tr><td>${fmtMD(e.ts)}</td><td>${esc(e.item)}<small class="sub">${esc(e.vendor)}</small></td><td class="r">${n0(e.net)}</td></tr>`).join('') || '<tr><td colspan="3">本月尚無進貨</td></tr>'}</tbody></table></div></div>`;
    const ps = d.byProd;
    chart('cP1').setOption({
      grid: { left: 6, right: 6, top: 34, bottom: 4, containLabel: true }, legend: { top: 0, left: 'center', itemWidth: 10 },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: ps.map(p => p.name), axisLabel: { interval: 0, fontSize: 10, rotate: 28 } },
      yAxis: [{ type: 'value' }, { type: 'value', max: 100, axisLabel: { formatter: '{value}%' }, splitLine: { show: false } }],
      series: [
        { name: '售價（未稅）', type: 'bar', data: ps.map(p => Math.round(PRICE(p.id) / 1.05)), itemStyle: { color: 'rgba(45,182,116,.35)', borderRadius: [6, 6, 0, 0] }, barGap: '-100%' },
        { name: '單位成本', type: 'bar', data: ps.map(p => COST(p.id)), itemStyle: { color: '#2DB674', borderRadius: [6, 6, 0, 0] } },
        { name: '毛利率', type: 'line', yAxisIndex: 1, smooth: true, data: ps.map(p => Math.round((1 - COST(p.id) / (PRICE(p.id) / 1.05)) * 100)), lineStyle: { color: '#F0A531', width: 3 }, itemStyle: { color: '#F0A531' } },
      ],
    });
  } else if (tab === 'sales') {
    const ads = d.entries.filter(e => e.acct === '廣告費').reduce((s, e) => s + e.net, 0);
    pane.innerHTML = head + chips([
      ['營業收入', money(d.net), `含稅 ${money(d.total)}`], ['客單價', money(d.orders.length ? d.total / d.orders.length : 0), `${d.orders.length} 筆訂單`], ['推銷費用', money(d.sell), `占營收 ${pct(d.sell, d.net)}`], ['廣告投報率', ads ? (d.net / ads).toFixed(1) + ' 倍' : '—', `廣告費 ${money(ads)}`],
    ]) + `<div class="pane-split"><div class="chart" id="cS1"></div><div class="chart" id="cS2"></div></div>`;
    chart('cS1').setOption({
      title: { text: '各通路收入', textStyle: { fontSize: 12, fontWeight: 500 } }, tooltip: { trigger: 'item', valueFormatter: v => money(v) },
      series: [{ type: 'pie', radius: ['42%', '72%'], center: ['50%', '56%'], itemStyle: { borderColor: '#061a13', borderWidth: 2, borderRadius: 6 }, label: { color: '#cfe', fontSize: 11, formatter: '{b}\n{d}%' },
        data: d.byCh.map(c => ({ name: c.name, value: c.value, itemStyle: { color: c.color } })) }],
    });
    const bp = [...d.byProd].sort((a, b) => a.rev - b.rev);
    chart('cS2').setOption({
      title: { text: '各商品收入（未稅）', textStyle: { fontSize: 12, fontWeight: 500 } }, tooltip: { trigger: 'axis', valueFormatter: v => money(v) },
      grid: { left: 4, right: 40, top: 30, bottom: 0, containLabel: true }, xAxis: { type: 'value', axisLabel: { show: false } }, yAxis: { type: 'category', data: bp.map(p => p.name), axisLabel: { fontSize: 11 } },
      series: [{ type: 'bar', data: bp.map(p => ({ value: p.rev, itemStyle: { color: p.color, borderRadius: [0, 6, 6, 0] } })), label: { show: true, position: 'right', color: '#cfe', fontSize: 10, formatter: p => (p.value / 1e4).toFixed(1) + '萬' } }],
    });
  } else if (tab === 'hr') {
    const rows = d.payroll;
    const tot = rows.reduce((s, p) => s + p.cost, 0);
    pane.innerHTML = head + chips([
      ['人事成本（含雇主負擔）', money(tot * d.factor), `占營收 ${pct(tot * d.factor, d.net)}`], ['薪資總額', money(d.wage), `${rows.length} 人`], ['勞健保・勞退雇主負擔', money(d.employer), '依投保級距'], ['115 年基本工資', `${RATES.minWage.toLocaleString()}／${RATES.minHourly}`, '月薪／時薪 已檢核'],
    ]) + `<div class="tbl-wrap"><table class="tbl pay"><thead><tr><th>人員</th><th class="r">薪資</th><th class="r">勞保＋職災</th><th class="r">健保</th><th class="r">勞退 6%</th><th class="r">雇主總成本</th><th class="r">員工自付</th><th>說明</th></tr></thead><tbody>${rows.map(p => `<tr><td><b>${p.name}</b><small class="sub">${p.title}</small></td><td class="r">${n0(p.pay)}</td><td class="r">${p.labor ? n0(p.labor) : '—'}</td><td class="r">${p.health ? n0(p.health) : '—'}</td><td class="r">${p.pension ? n0(p.pension) : '—'}</td><td class="r"><b>${n0(p.cost)}</b></td><td class="r">${p.emp.labor ? n0(p.emp.labor + p.emp.health) : '—'}</td><td class="note">${p.note}</td></tr>`).join('')}
      <tr class="tot"><td>合計</td><td class="r">${n0(rows.reduce((s, p) => s + p.pay, 0))}</td><td class="r">${n0(rows.reduce((s, p) => s + p.labor, 0))}</td><td class="r">${n0(rows.reduce((s, p) => s + p.health, 0))}</td><td class="r">${n0(rows.reduce((s, p) => s + p.pension, 0))}</td><td class="r"><b>${n0(tot)}</b></td><td class="r">${n0(rows.reduce((s, p) => s + p.emp.labor + p.emp.health, 0))}</td><td></td></tr></tbody></table></div>
      <ul class="checks hr-checks">${['薪資轉帳與薪資單自動產生，並寄送給員工', '勞保、健保、勞退繳款單金額與帳載一致', '兼職人員工時由打卡紀錄彙整，時薪高於基本時薪', '年底自動產生薪資扣繳憑單（50）'].map(t => `<li>${icon('check', 14)}${t}</li>`).join('')}</ul>`;
  } else if (tab === 'rd') {
    const rds = d.entries.filter(e => e.five === 'rd');
    const credit = Math.round(d.rd * 0.15);
    pane.innerHTML = head + chips([
      ['研究發展費用', money(d.rd), `占營收 ${pct(d.rd, d.net)}`], ['進行中專案', `${RD_PROJECTS.length} 項`, '新品與包裝'], ['研發投資抵減（試算）', money(credit), '支出 15%，以當年應納稅額 30% 為限'], ['研發憑證', `${rds.length} 張`, 'AI 已歸檔'],
    ]) + `<div class="pane-split"><div class="rd-proj">${RD_PROJECTS.map(p => `<div class="rdp" style="--p:${p.pct};--pc:${p.color}"><div class="rdp-ring"><svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="18"/><circle cx="22" cy="22" r="18" class="fg"/></svg><b>${p.pct}%</b></div><div><b>${p.name}</b><small>${p.stage}</small><span>${p.note}</span></div></div>`).join('')}</div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>日期</th><th>研發支出</th><th class="r">未稅</th></tr></thead><tbody>${rds.map(e => `<tr><td>${fmtMD(e.ts)}</td><td>${esc(e.item)}<small class="sub">${esc(e.acct.replace('研究發展費－', ''))}・${esc(e.vendor)}</small></td><td class="r">${n0(e.net)}</td></tr>`).join('') || '<tr><td colspan="3">本月尚無研發支出</td></tr>'}</tbody></table></div></div>`;
    gsap.fromTo($$('.rdp .fg', pane), { strokeDashoffset: 113 }, { strokeDashoffset: (i, t) => 113 * (1 - +getComputedStyle(t.closest('.rdp')).getPropertyValue('--p') / 100), duration: 1.4, ease: 'power3.out', stagger: 0.1 });
  } else {
    const pos = position(sel.y, sel.m), fl = pos.flow;
    const sideRows = (arr) => arr.map(([t, v]) => `<div class="bs-row"><span>${t}</span><b>${n0(v)}</b></div>`).join('');
    pane.innerHTML = head + chips([
      ['資產總額', money(pos.A), '期末'], ['負債總額', money(pos.L), `負債比 ${pct(pos.L, pos.A)}`], ['期末現金', money(fl.close), (fl.close >= fl.open ? `本月淨流入 ${money(fl.close - fl.open)}` : `本月淨流出 ${money(fl.open - fl.close)}`)], ['流動比率', pos.L ? ((pos.A - pos.assets[3][1]) / pos.L).toFixed(1) + ' 倍' : '—', '流動資產 ÷ 流動負債'],
    ]) + `<div class="pane-split"><div class="bs"><div class="bs-col"><h4>資產</h4>${sideRows(pos.assets)}<div class="bs-row tot"><span>資產總計</span><b>${n0(pos.A)}</b></div></div><div class="bs-col"><h4>負債</h4>${sideRows(pos.liab)}<h4>權益</h4>${sideRows(pos.equity)}<div class="bs-row tot"><span>負債及權益總計</span><b>${n0(pos.L + pos.E)}</b></div></div></div><div class="chart" id="cF1"></div></div>`;
    const steps = [['期初現金', fl.open, 'base'], ['銷貨收款', fl.receipts, 'up'], ['原料進貨', -fl.buy, 'down'], ['營業費用', -fl.exp, 'down'], ['薪資勞健保', -fl.hr, 'down'], ['繳納營業稅', -fl.vat, 'down'], ['期末現金', fl.close, 'base']];
    let run = 0; const base = [], val = [];
    for (const [, v, k] of steps) {
      if (k === 'base') { base.push(0); val.push({ value: v, itemStyle: { color: '#2E97D4' } }); run = v; }
      else if (v >= 0) { base.push(run); val.push({ value: v, itemStyle: { color: '#2DB674' } }); run += v; }
      else { run += v; base.push(run); val.push({ value: -v, itemStyle: { color: '#EC6A55' } }); }
    }
    chart('cF1').setOption({
      title: { text: '本月現金流量', textStyle: { fontSize: 12, fontWeight: 500 } }, tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (ps) => `${ps[1].name}<br>${money(ps[1].value)}` },
      grid: { left: 4, right: 6, top: 30, bottom: 0, containLabel: true }, xAxis: { type: 'category', data: steps.map(s => s[0]), axisLabel: { interval: 0, fontSize: 10, rotate: 25 } }, yAxis: { type: 'value', axisLabel: { formatter: v => (v / 1e4) + '萬' } },
      series: [{ type: 'bar', stack: 'w', data: base, itemStyle: { color: 'transparent' }, emphasis: { disabled: true } }, { type: 'bar', stack: 'w', data: val, itemStyle: { borderRadius: 5 }, label: { show: true, position: 'top', color: '#cfe', fontSize: 10, formatter: p => (p.value / 1e4).toFixed(1) + '萬' } }],
    });
  }
  gsap.fromTo(pane.children, { opacity: 0, y: 12 }, { opacity: 1, y: 0, stagger: 0.06, duration: 0.45, ease: 'power3.out' });
}
const PRICE = (id) => PRODUCT_MAP[id].price;
const COST = (id) => PRODUCT_MAP[id].cost;
const SERIES_NAME = { prod: '產・營業成本', sales: '銷・行銷費用', hr: '人・人事費用', rd: '發・研發費用', fin: '財・租金與管理' };

function renderTrend() {
  const ms = monthList().map(x => month(x.y, x.m));
  trendChart.setOption({
    animationDuration: 1200, legend: { top: 0, right: 0, itemWidth: 10 }, tooltip: { trigger: 'axis', valueFormatter: v => money(v) },
    grid: { left: 6, right: 8, top: 34, bottom: 4, containLabel: true },
    xAxis: { type: 'category', data: ms.map(d => d.current ? `${d.m} 月至今` : `${d.m} 月`) }, yAxis: { type: 'value', axisLabel: { formatter: v => (v / 1e4) + '萬' } },
    series: [
      { name: '營業收入', type: 'bar', data: ms.map(d => d.net), barWidth: 26, itemStyle: { color: '#2DB674', borderRadius: [6, 6, 0, 0] } },
      ...FIVE.filter(f => f.id !== 'sales').concat(FIVE_MAP.sales).map(f => ({ name: SERIES_NAME[f.id], type: 'bar', stack: 'exp', barWidth: 26, data: ms.map(d => d.byFive.find(x => x.id === f.id).value), itemStyle: { color: f.color } })),
      { name: '稅前淨利', type: 'line', data: ms.map(d => d.pretax), smooth: true, symbolSize: 9, lineStyle: { width: 3, color: '#fff' }, itemStyle: { color: '#fff' } },
    ],
  }, true);
}

function renderRose(d) {
  roseChart.setOption({
    tooltip: { trigger: 'item', valueFormatter: v => money(v) },
    series: [{ type: 'pie', roseType: 'radius', radius: ['18%', '78%'], center: ['50%', '52%'], itemStyle: { borderRadius: 8, borderColor: '#061a13', borderWidth: 2 },
      label: { color: '#e6fff2', formatter: (p) => `{k|${FIVE_MAP[p.data.id].k}} ${p.percent}%`, rich: { k: { fontSize: 16, fontWeight: 800, color: '#fff' } } },
      data: d.byFive.map(f => ({ id: f.id, name: f.k + '・' + f.name, value: Math.round(f.value), itemStyle: { color: f.color, shadowBlur: 18, shadowColor: f.color + '66' } })) }],
    graphic: [{ type: 'text', left: 'center', top: '47%', style: { text: '支出', fill: 'rgba(214,240,226,.6)', fontSize: 12 } }],
  }, true);
}

function renderLedger() {
  const d = month(sel.y, sel.m);
  let list = d.entries;
  if (filter === 'in' || filter === 'out') list = list.filter(e => e.type === filter);
  else if (filter !== 'all') list = list.filter(e => e.five === filter);
  if (query) list = list.filter(e => (e.acct + e.item + e.vendor + e.doc).includes(query));
  const inSum = list.filter(e => e.type === 'in').reduce((s, e) => s + e.net, 0), outSum = list.filter(e => e.type === 'out').reduce((s, e) => s + e.net, 0);
  $('#ledChip', root).textContent = `${list.length} 筆・收入 ${money(inSum)}・支出 ${money(outSum)}`;
  $('#ledBody', root).innerHTML = list.slice(0, 80).map(e => {
    const f = FIVE_MAP[e.five];
    return `<tr class="${e.type}"><td>${fmtMD(e.ts)}</td><td><span class="five-tag" style="--c:${f.color}">${f.k}</span></td><td>${esc(e.acct)}</td><td class="items">${esc(e.item)}</td><td class="col-items">${esc(e.vendor)}</td><td class="col-items">${esc(e.doc)}</td><td class="r ${e.type === 'in' ? 'pos' : ''}">${e.type === 'in' ? '+' : '−'}${n0(e.net)}</td><td class="r">${e.tax ? n0(e.tax) : '—'}</td><td class="r"><span class="conf">${icon('sparkle', 12)} ${e.conf}%</span></td></tr>`;
  }).join('') || '<tr><td colspan="9">沒有符合條件的帳目</td></tr>';
}
