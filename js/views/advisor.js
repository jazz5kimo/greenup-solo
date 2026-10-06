// AI 經營顧問：本週經營檢討（AI 週報）、決策模擬器、問顧問、政府資源媒合（示範資料・試算）
import { store } from '../state.js';
import { $, $$, el, gsap, esc, countUp, typeText, toast, sleep } from '../util.js';
import { icon } from '../icons.js';
import { makeChart, fmtK } from '../charts.js';
import { RATES, STAFF } from '../ledger.js';
const PT0 = STAFF.find(x => x.kind === 'part' && x.hours);
import {
  baseline, weekly, priceSim, hireSim, equipSim, channelSim, govList, draftFor, answer, QUICK,
  ELASTIC, EQUIP, CHAN, confLevel, n0, nt, snt, wan, AMEI,
} from '../advisor-data.js';

let root, go, B, W, weekChart, simChart, shown = false, typing = 0, simTabPrev = null;
const S = {
  tab: 'price',
  price: { pid: 'all', r: 8, e: 10 },
  hire: { kind: 'part', hourly: 210, hours: 80, salary: 32000, demand: 45 },
  equip: { preset: 'oven', price: EQUIP.oven.price, years: EQUIP.oven.years, units: EQUIP.oven.units, sell: 55, util: EQUIP.oven.util, pay: 'cash' },
  chan: { ch: 'delivery', ...pick(CHAN.delivery) },
};
function pick(c) { return { orders: c.orders, aov: c.aov, comm: c.comm, per: c.per, cannibal: c.cannibal, mkt: c.mkt }; }

const TABS = [
  { id: 'price', ic: 'percent', t: '漲價', s: '漲多少不會掉客？', c: '#F0A531' },
  { id: 'hire', ic: 'users', t: '雇人', s: '請兼職還是全職？', c: '#2E97D4' },
  { id: 'equip', ic: 'factory', t: '買設備', s: AMEI ? '第二台烤箱多久回本？' : `${EQUIP.oven.name}多久回本？`, c: '#7C62E6' },
  { id: 'chan', ic: 'store', t: '開新通路', s: `${CHAN.delivery.name.replace('平台', '')}、蝦皮、跨境划算嗎？`, c: '#2DB674' },
];
const BOLD_RE = /(NT\$ [\d,]+|[+−-]NT\$ [\d,]+|[+−-]?\d+(?:\.\d+)?%|(?<![近前] )\d+(?:\.\d+)? (?:筆|天|份|盒|個月|小時|倍))/g;
const boldify = (s) => esc(s).replace(BOLD_RE, '<b>$1</b>');

export default {
  mount(section, ctx) {
    root = section; go = ctx && ctx.go;
    section.innerHTML = `
    <div class="ad">
      <div class="glass ad-hero anim-in">
        <div class="ad-hero-l">
          <div class="ad-badges">
            <span class="demo-badge">${icon('alert', 14)} 示範資料・試算</span>
            <span class="chip-sm">${icon('link', 12)} 與會計帳務同一套帳</span>
            <span class="chip-sm" id="adAsOf"></span>
          </div>
          <h2 class="ad-h">老闆，這週的帳我都看過了。<br><span>有什麼決定，先來跟我商量。</span></h2>
          <p class="ad-lead">一人公司最難的是沒人可以討論。AI 顧問每週幫你檢討經營、把「要不要漲價、雇人、買設備、開通路」變成可以拉動的試算，也幫你找可能適合的政府資源。</p>
          <nav class="ad-jump">${[['adWeek', 'sparkle', '本週檢討'], ['adSim', 'trend', '決策模擬器'], ['adAsk', 'chat', '問顧問'], ['adGov', 'bank', '政府資源']].map(([id, ic, t]) => `<button data-to="${id}">${icon(ic, 14)}${t}</button>`).join('')}</nav>
        </div>
        <div class="ad-hk" id="adHk"></div>
      </div>

      <section class="glass card ad-week anim-in" id="adWeek">
        <div class="card-h"><h3>${icon('sparkle', 18)} 本週經營檢討（AI 週報）</h3>
          <div class="ad-h-r"><span class="chip-sm" id="adWkRange"></span><button class="btn btn-ghost btn-sm" id="adRegen">${icon('refresh', 14)} 重新產生</button></div></div>
        <div class="ad-wk-top">
          <div class="ad-wk-sum"><span class="ad-ai-ic">${icon('bot', 16)}</span><div class="ad-wk-sum-r"><p id="adSum"></p><div class="ad-wk-chips" id="adWkChips"></div></div></div>
          <div class="ad-wk-chart"><div class="ad-mini-h"><span>近 7 天每日營收</span><em><i class="ad-lg a"></i>本週 <i class="ad-lg b"></i>前一週同日</em></div><div id="adWkC" class="ad-c-mini"></div></div>
        </div>
        <div class="ad-wk-cols">
          <div class="ad-col ad-good"><h4>${icon('check', 15)} 好消息 <small>3</small></h4><ol id="adGood"></ol></div>
          <div class="ad-col ad-warn"><h4>${icon('alert', 15)} 要注意 <small>2</small></h4><ol id="adWarn"></ol></div>
        </div>
        <div class="ad-col ad-act"><h4>${icon('wand', 15)} 本週行動建議 <small>每個都附預估影響，可一鍵執行</small></h4><div id="adActs" class="ad-acts"></div></div>
      </section>

      <section class="glass card ad-sim anim-in" id="adSim">
        <div class="card-h"><h3>${icon('trend', 18)} 決策模擬器</h3><span class="chip-sm">拉動滑桿即時試算・試算僅供參考</span></div>
        <div class="ad-tabs" role="tablist">${TABS.map(t => `<button class="ad-tab ${t.id === S.tab ? 'on' : ''}" data-tab="${t.id}" style="--c:${t.c}" role="tab"><span class="ad-tab-ic">${icon(t.ic, 20)}</span><span><b>${t.t}</b><small>${t.s}</small></span></button>`).join('')}</div>
        <div class="ad-sim-body">
          <div class="ad-ctl" id="adCtl"></div>
          <div class="ad-main">
            <div class="ad-skpis" id="adSk"></div>
            <div class="ad-c-sim" id="adSimC"></div>
          </div>
          <div class="ad-verdict" id="adVer"></div>
        </div>
      </section>

      <div class="ad-row2">
        <section class="glass card ad-ask anim-in" id="adAsk">
          <div class="card-h"><h3>${icon('chat', 18)} 問顧問</h3><span class="chip-sm">規則式・引用帳上實際數字</span></div>
          <div class="ad-quick" id="adQuick">${QUICK.map(q => `<button class="ad-q">${esc(q)}</button>`).join('')}</div>
          <div class="ad-msgs" id="adMsgs"></div>
          <form class="ad-input" id="adForm" autocomplete="off">
            <input id="adIn" placeholder="例如：要不要開${esc(CHAN.delivery.name)}？現金夠不夠${AMEI ? '買烤箱' : '買設備'}？" aria-label="問顧問">
            <button class="btn btn-primary" type="submit">${icon('send', 16)}<span>送出</span></button>
          </form>
        </section>
        <section class="glass card ad-gov anim-in" id="adGov">
          <div class="card-h"><h3>${icon('bank', 18)} 政府資源媒合</h3><span class="chip-sm warn">${icon('alert', 12)} 示範媒合</span></div>
          <p class="ad-gov-note">${icon('shield', 14)}<span>名稱與內容以主管機關最新公告為準，此為示範媒合。額度與時程皆為示意，不代表實際核定條件；AI 依你的帳務數據推估可能適合的方向。</span></p>
          <div class="ad-gov-grid" id="adGovGrid"></div>
        </section>
      </div>
      <p class="ad-foot">${icon('alert', 12)} 本頁所有數字為示範資料與簡化試算（價格彈性、產能、平台抽成等為示範假設），僅供參考，重大決策請與會計師或專業顧問討論。</p>
    </div>`;

    $$('.ad-jump button', section).forEach(b => b.addEventListener('click', () => scrollTo(b.dataset.to)));
    $('#adRegen', section).addEventListener('click', () => { B = baseline(); W = weekly(B); renderWeek(true); });
    $$('.ad-tab', section).forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
    $$('.ad-q', section).forEach(b => b.addEventListener('click', () => ask(b.textContent)));
    $('#adForm', section).addEventListener('submit', (e) => { e.preventDefault(); const v = $('#adIn', root).value.trim(); if (!v) return; $('#adIn', root).value = ''; ask(v); });
    section.addEventListener('click', (e) => {
      const a = e.target.closest('[data-go],[data-sim],[data-scroll]');
      if (!a || !root.contains(a)) return;
      if (a.dataset.go) go && go(a.dataset.go);
      else if (a.dataset.scroll) scrollTo(a.dataset.scroll);
      else if (a.dataset.sim) openSim(JSON.parse(a.dataset.sim));
    });
    const refresh = () => { if (!root.hidden && shown) { B = baseline(); W = weekly(B); renderHero(); renderSim(); } };
    store.on('order', refresh); store.on('order-updated', refresh); store.on('reset', refresh);
  },
  show() {
    B = baseline(); W = weekly(B);
    if (!weekChart) { weekChart = makeChart($('#adWkC', root)); simChart = makeChart($('#adSimC', root)); }
    renderHero();
    if (!shown) {
      shown = true;
      renderWeek(true); renderSim(); renderGov();
      addMsg('ai', `嗨${STAFF[0] ? STAFF[0].name : ''}，我是你的 AI 經營顧問。我讀得到近 90 天的訂單、會計帳務與庫存；點上面的常見問題，或直接打字問我。`, { instant: true });
    } else { renderWeekChart(); renderSim(); }
  },
};

function scrollTo(id) {
  const t = $('#' + id, root); const host = root.closest('.views') || document.scrollingElement;
  if (!t || !host) return;
  host.scrollTo({ top: t.getBoundingClientRect().top - host.getBoundingClientRect().top + host.scrollTop - 12, behavior: 'smooth' });
  gsap.fromTo(t, { boxShadow: '0 0 0 2px rgba(94,224,196,0.7)' }, { boxShadow: '0 0 0 0px rgba(94,224,196,0)', duration: 1.4, delay: 0.4, clearProps: 'boxShadow' });
}

// ---------- 主視覺 KPI ----------
function renderHero() {
  const d = new Date();
  $('#adAsOf', root).textContent = `資料截至 ${d.getMonth() + 1}/${d.getDate()}・月均以 ${B.monthsTxt} 計`;
  const k = [
    ['trend', '近 7 天營收', W.A.total, `${W.g >= 0 ? '▲' : '▼'} ${Math.abs(W.g).toFixed(1)}% vs 前 7 天`, '#2DB674', W.g >= 0 ? 'up' : 'down'],
    ['coins', '月均稅前淨利', B.pretax, `淨利率 ${(B.netMargin * 100).toFixed(1)}%・毛利率 ${(B.margin * 100).toFixed(1)}%`, '#F0A531'],
    ['bank', '帳上現金', B.cash, `應收帳款 ${nt(B.ar)}`, '#2E97D4'],
    ['clock', '現金可支付固定支出', B.runway, `每月固定支出 ${nt(B.fixedOut)}`, '#7C62E6', '', ' 個月'],
  ];
  $('#adHk', root).innerHTML = k.map(([ic, t, , sub, c, cls], i) => `<div class="ad-hk-i" style="--c:${c}"><span class="ad-hk-t">${icon(ic, 14)}${t}</span><b id="adHk${i}">0</b><small class="${cls || ''}">${sub}</small></div>`).join('');
  k.forEach(([, , v, , , , suf], i) => countUp($('#adHk' + i, root), v, suf ? { suffix: suf, decimals: 1, from: 0 } : { prefix: 'NT$ ', from: 0 }));
}

// ---------- 週報 ----------
async function renderWeek(anim) {
  const my = ++typing;
  $('#adWkRange', root).textContent = `${W.range}・近 7 天 vs 前 7 天`;
  renderWeekChart();
  const lowN = store.inventory().filter(p => p.low).length;
  const chips = [['receipt', '訂單', `${W.A.n} 筆`, `前 7 天 ${W.P.n} 筆`], ['cart', '平均客單', nt(W.A.aov), `前 7 天 ${nt(W.P.aov)}`], ['clock', '應收帳款', `${W.arN} 筆`, nt(W.arSum)], ['box', '低於安全庫存', `${lowN} 項`, lowN ? '已列入行動建議' : '庫存健康']];
  $('#adWkChips', root).innerHTML = chips.map(([ic, t, v, sub]) => `<div class="ad-wk-chip"><span>${icon(ic, 13)}${t}</span><b>${v}</b><small>${sub}</small></div>`).join('');
  if (anim) gsap.fromTo($$('.ad-wk-chip', root), { opacity: 0, y: 8 }, { opacity: 1, y: 0, stagger: 0.06, duration: 0.4, delay: 0.2 });
  const good = $('#adGood', root), warn = $('#adWarn', root), acts = $('#adActs', root);
  good.innerHTML = W.good.map(g => `<li><span class="ad-li-ic">${icon(g.ic, 14)}</span><p></p></li>`).join('');
  warn.innerHTML = W.watch.map(g => `<li><span class="ad-li-ic">${icon(g.ic, 14)}</span><p></p></li>`).join('');
  acts.innerHTML = W.actions.map((a, i) => `
    <div class="ad-action" data-i="${i}">
      <div class="ad-ac-top"><span class="ad-ac-n">${i + 1}</span><b>${esc(a.t)}</b></div>
      <p>${esc(a.d)}</p>
      <div class="ad-ac-imp"><small>${esc(a.unit)}</small><strong>預估影響 <em data-imp="${i}">NT$ 0</em></strong></div>
      <div class="ad-ac-btns">
        <button class="btn btn-primary btn-sm" data-run="${i}">${icon(a.sim ? 'trend' : 'wand', 14)} ${esc(a.run)}</button>
        ${a.go ? `<button class="btn btn-ghost btn-sm" data-go="${a.go}">${esc(a.goLabel)} ${icon('arrow', 13)}</button>` : ''}
      </div>
    </div>`).join('');
  $$('[data-run]', acts).forEach(b => b.addEventListener('click', () => runAction(+b.dataset.run, b)));
  if (anim) {
    gsap.fromTo($$('.ad-col', root), { y: 14, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08, duration: 0.5, ease: 'power3.out' });
    gsap.set($$('.ad-action', acts), { opacity: 0.25 });
  }
  const typeInto = async (p, txt, speed) => { if (my !== typing) return; await typeText(p, txt, speed); if (my === typing) p.innerHTML = boldify(txt); };
  await typeInto($('#adSum', root), W.summary, 16);
  const items = [...$$('li p', good).map((p, i) => [p, W.good[i].t]), ...$$('li p', warn).map((p, i) => [p, W.watch[i].t])];
  for (const [p, t] of items) { if (my !== typing) return; p.closest('li').classList.add('on'); await typeInto(p, t, 11); }
  for (let i = 0; i < W.actions.length; i++) {
    if (my !== typing) return;
    const c = $(`.ad-action[data-i="${i}"]`, acts);
    gsap.to(c, { opacity: 1, duration: 0.35 });
    gsap.fromTo(c, { y: 10 }, { y: 0, duration: 0.45, ease: 'back.out(2)' });
    countUp($(`[data-imp="${i}"]`, acts), W.actions[i].impact, { prefix: 'NT$ ', from: 0, duration: 1 });
    await sleep(260);
  }
}

function renderWeekChart() {
  if (!weekChart || !W) return;
  weekChart.setOption({
    animationDuration: 900,
    grid: { left: 4, right: 6, top: 10, bottom: 2, containLabel: true },
    tooltip: { trigger: 'axis', valueFormatter: v => 'NT$ ' + Number(v).toLocaleString() },
    xAxis: { type: 'category', data: W.days.map(d => d.label.split(' ')[1]), axisLabel: { fontSize: 10.5 } },
    yAxis: { type: 'value', splitNumber: 3, axisLabel: { formatter: fmtK, fontSize: 10 } },
    series: [
      { name: '本週', type: 'bar', barWidth: '52%', data: W.days.map(d => d.v), itemStyle: { borderRadius: [5, 5, 0, 0], color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#5EE0C4' }, { offset: 1, color: 'rgba(45,182,116,0.25)' }] } } },
      { name: '前一週同日', type: 'line', data: W.days.map(d => d.pv), smooth: true, symbol: 'circle', symbolSize: 5, lineStyle: { width: 2, type: 'dashed', color: '#F0A531' }, itemStyle: { color: '#F0A531' } },
    ],
  }, true);
}

function runAction(i, btn) {
  const a = W.actions[i];
  if (a.sim) { openSim(a.sim); return; }
  if (btn.classList.contains('done')) { toast('這個行動已執行', a.done, { kind: 'info', icon: icon('check', 18) }); return; }
  btn.classList.add('done');
  btn.innerHTML = `${icon('check', 14)} 已執行`;
  gsap.fromTo(btn.closest('.ad-action'), { scale: 0.97 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
  toast(a.t, a.done, { icon: icon('check', 18) });
  store.log('ai', `AI 經營顧問：${a.done}`);
}

// ---------- 決策模擬器 ----------
function setTab(id) {
  S.tab = id;
  $$('.ad-tab', root).forEach(b => b.classList.toggle('on', b.dataset.tab === id));
  renderSim(true);
  gsap.fromTo([$('#adCtl', root), $('#adVer', root)], { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.06, ease: 'power3.out' });
}
function openSim(o) {
  if (o.tab === 'price') { if (o.pid) { S.price.pid = o.pid; S.price.e = Math.round((ELASTIC[o.pid] ?? 1) * 10); } if (o.r != null) S.price.r = o.r; }
  setTab(o.tab);
  scrollTo('adSim');
}

const slider = (k, label, min, max, step, val, fmt, hint = '') => `
  <label class="ad-sl"><span class="ad-sl-h">${label}<b data-out="${k}">${fmt(val)}</b></span>
  <input type="range" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${val}">
  ${hint ? `<small>${hint}</small>` : ''}</label>`;
const segs = (k, opts, val) => `<div class="ad-segs" data-seg="${k}">${opts.map(([v, t]) => `<button class="seg ${String(v) === String(val) ? 'on' : ''}" data-v="${v}">${t}</button>`).join('')}</div>`;

const FMT = {
  r: v => `+${v}%`, e: v => (v / 10).toFixed(1), hourly: v => `NT$ ${v}`, hours: v => `${v} 小時`, salary: v => `NT$ ${n0(v)}`, demand: v => `${v}%`,
  price: v => `NT$ ${wan(v)}`, years: v => `${v} 年`, units: v => `${v} 件`, sell: v => `${v}%`, util: v => `NT$ ${n0(v)}`,
  orders: v => `${v} 筆`, aov: v => `NT$ ${n0(v)}`, comm: v => `${v}%`, per: v => `NT$ ${v}`, cannibal: v => `${v}%`, mkt: v => `NT$ ${n0(v)}`,
};

function renderCtl() {
  const c = $('#adCtl', root), t = S.tab;
  let h = '';
  if (t === 'price') {
    const P = S.price;
    h = `<div class="ad-ctl-h">調整哪個商品？</div>${segs('pid', [['all', '全店'], ...B.prods.map(p => [p.id, p.name])], P.pid)}
      ${slider('r', '漲幅', 0, 30, 1, P.r, FMT.r)}
      ${slider('e', '顧客價格敏感度（彈性）', 3, 25, 1, P.e, FMT.e, `1.0＝漲 10% 銷量約少 10%；AI 預設 ${(ELASTIC[P.pid] ?? 1).toFixed(1)}（示範假設）`)}`;
  } else if (t === 'hire') {
    const H = S.hire;
    h = `<div class="ad-ctl-h">雇用型態</div>${segs('kind', [['part', '兼職（時薪）'], ['full', '全職（月薪）']], H.kind)}
      ${H.kind === 'part'
        ? slider('hourly', '時薪', RATES.minHourly, 300, 2, Math.max(H.hourly, RATES.minHourly), FMT.hourly, `不得低於基本時薪 NT$ ${RATES.minHourly}`) + slider('hours', '每月工時', 40, 140, 4, H.hours, FMT.hours, (PT0 ? `參考：${PT0.name}兼職每月 ${PT0.hours} 小時` : '目前沒有兼職人員，可先從每月 60–80 小時試起'))
        : slider('salary', '月薪', RATES.minWage, 48000, 500, Math.max(H.salary, RATES.minWage), FMT.salary, `不得低於基本工資 NT$ ${n0(RATES.minWage)}；以每月 174 工時計`)}
      ${slider('demand', '多出的產能能賣掉幾成', 20, 90, 5, H.demand, FMT.demand, `週末每日訂單是平日的 ${(B.weekendDay / Math.max(1, B.weekdayDay)).toFixed(1)} 倍`)}`;
  } else if (t === 'equip') {
    const E = S.equip;
    h = `<div class="ad-ctl-h">要買什麼？</div>${segs('preset', Object.entries(EQUIP).map(([k, v]) => [k, v.name]), E.preset)}
      <p class="ad-ctl-note">${icon('sparkle', 13)} ${EQUIP[E.preset].note}</p>
      ${slider('price', '設備價格', 30000, 400000, 5000, E.price, FMT.price)}
      ${slider('years', '使用年限', 3, 10, 1, E.years, FMT.years)}
      ${slider('units', '每月增加產能', 50, 600, 10, E.units, FMT.units)}
      ${slider('sell', '增加的產能能賣掉幾成', 20, 100, 5, E.sell, FMT.sell)}
      <div class="ad-ctl-h">付款方式</div>${segs('pay', [['cash', '一次付清'], ['12', '分 12 期'], ['24', '分 24 期']], E.pay)}`;
  } else {
    const C = S.chan;
    h = `<div class="ad-ctl-h">想開哪個通路？</div>${segs('ch', Object.entries(CHAN).map(([k, v]) => [k, v.name]), C.ch)}
      <p class="ad-ctl-note">${icon('sparkle', 13)} ${CHAN[C.ch].note}</p>
      ${slider('orders', '每月預估訂單', 10, 300, 5, C.orders, FMT.orders)}
      ${slider('aov', '客單價（含稅）', 300, 2500, 10, C.aov, FMT.aov)}
      ${slider('comm', '平台抽成＋金流', 0, 40, 1, C.comm, FMT.comm, '示範假設，實際依平台合約')}
      ${slider('per', '每單包材＋物流自付', 0, 600, 5, C.per, FMT.per)}
      ${slider('cannibal', '其中原本就會在自家下單的熟客', 0, 60, 5, C.cannibal, FMT.cannibal)}
      ${slider('mkt', '每月平台廣告／行銷', 0, 20000, 500, C.mkt, FMT.mkt)}`;
  }
  c.innerHTML = h;
  const st = S[t];
  $$('input[type=range]', c).forEach(inp => inp.addEventListener('input', () => {
    st[inp.dataset.k] = +inp.value;
    $(`[data-out="${inp.dataset.k}"]`, c).textContent = FMT[inp.dataset.k](+inp.value);
    paintRange(inp);
    compute(false);
  }));
  $$('input[type=range]', c).forEach(paintRange);
  $$('.ad-segs', c).forEach(sg => $$('.seg', sg).forEach(b => b.addEventListener('click', () => {
    const k = sg.dataset.seg, v = b.dataset.v;
    if (k === 'pid') { st.pid = v; st.e = Math.round((ELASTIC[v] ?? 1) * 10); }
    else if (k === 'preset') { const e = EQUIP[v]; Object.assign(st, { preset: v, price: e.price, years: e.years, units: e.units, util: e.util }); }
    else if (k === 'ch') Object.assign(st, { ch: v }, pick(CHAN[v]));
    else st[k] = v;
    renderSim();
  })));
}
function paintRange(inp) { const p = (inp.value - inp.min) / (inp.max - inp.min) * 100; inp.style.setProperty('--p', p + '%'); }

function renderSim(tabChanged = false) {
  if (!B) return;
  renderCtl();
  compute(tabChanged || simTabPrev !== S.tab, true);
  simTabPrev = S.tab;
}

function kpis(list) {
  const box = $('#adSk', root);
  if (box.dataset.tab !== S.tab || box.children.length !== list.length) {
    box.dataset.tab = S.tab;
    box.innerHTML = list.map((k, i) => `<div class="ad-sk" style="--c:${k.c}"><small>${k.t}</small><b id="adSk${i}">${k.raw ?? ''}</b><span id="adSkS${i}"></span></div>`).join('');
  }
  list.forEach((k, i) => {
    const b = $('#adSk' + i, root), s = $('#adSkS' + i, root);
    b.className = k.cls || '';
    if (k.raw != null) b.textContent = k.raw;
    else countUp(b, k.abs ? Math.abs(k.v) : k.v, { prefix: k.pre ?? 'NT$ ', suffix: k.suf || '', decimals: k.dec || 0, duration: 0.6 });
    s.textContent = k.sub || '';
  });
}

function verdict(r, notes) {
  const lv = confLevel(r.conf);
  $('#adVer', root).innerHTML = `
    <div class="ad-v-h">${icon('sparkle', 16)} AI 建議</div>
    <h4 class="ad-v-t">${esc(r.title)}</h4>
    <p class="ad-v-b">${boldify(r.body)}</p>
    <div class="ad-conf lv-${lv === '高' ? 'hi' : lv === '中' ? 'md' : 'lo'}">
      <div class="ad-conf-h"><span>信心程度</span><b>${lv}・${r.conf}%</b></div>
      <i><em style="width:${r.conf}%"></em></i>
      <small>${esc(notes)}</small>
    </div>
    <div class="ad-v-h sm">${icon('alert', 14)} 風險與提醒</div>
    <ul class="ad-risks">${r.risks.map(x => `<li>${boldify(x)}</li>`).join('')}</ul>
    <p class="ad-v-foot">${icon('alert', 12)} 試算僅供參考・示範假設</p>`;
}

function compute(full = false, rebuildVerdict = true) {
  const t = S.tab;
  let opt;
  if (t === 'price') {
    const P = S.price, r = priceSim(B, { pid: P.pid, r: P.r, e: P.e / 10 });
    kpis([
      { t: '每月商品毛利變化', abs: 1, v: r.dgp, pre: r.dgp < 0 ? '−NT$ ' : '+NT$ ', cls: r.dgp >= 0 ? 'pos' : 'neg', sub: `一年約 ${snt(r.dgp * 12)}`, c: '#F0A531' },
      { t: '預估銷量變化', v: r.qDrop * 100, pre: r.qDrop < 0 ? '' : '+', suf: '%', dec: 1, sub: `每月 ${n0(r.base.q)} → ${n0(r.next.q)} 份`, c: '#2E97D4' },
      { t: '損益平衡：銷量可掉', v: r.beDrop * 100, pre: '', suf: '%', dec: 1, sub: '掉幅在這以內，漲價仍比不漲好', c: '#2DB674' },
      r.one ? { t: '新售價（尾數取整）', v: r.newPrice, sub: `原價 NT$ ${n0(r.one.price)}／${r.one.unit}`, c: '#7C62E6' }
        : { t: '平均單價（含稅）', v: r.avgPriceNew, sub: `原本 ${nt(r.avgPrice)}`, c: '#7C62E6' },
    ]);
    const x = r.curve.map(c => c.r + '%');
    opt = {
      animationDurationUpdate: 350,
      grid: { left: 8, right: 22, top: 52, bottom: 4, containLabel: true },
      legend: { top: 0, right: 0, itemWidth: 14, itemHeight: 4, data: ['每月商品毛利變化', '損益平衡線'] },
      tooltip: { trigger: 'axis', valueFormatter: v => (v < 0 ? '−' : '+') + 'NT$ ' + Math.abs(Math.round(v)).toLocaleString() },
      xAxis: { type: 'category', data: x, boundaryGap: false, axisLabel: { interval: 4 } },
      yAxis: { type: 'value', axisLabel: { formatter: v => (v < 0 ? '−' : '') + fmtK(Math.abs(v)) } },
      series: [
        { name: '每月商品毛利變化', type: 'line', smooth: true, symbol: 'none', data: r.curve.map(c => Math.round(c.gp)), lineStyle: { width: 3, color: '#F0A531', shadowColor: '#F0A531', shadowBlur: 12 },
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(240,165,49,0.35)' }, { offset: 1, color: 'rgba(240,165,49,0)' }] } },
          markLine: { symbol: 'none', silent: true, data: [{ xAxis: r.curve[S.price.r].r + '%', lineStyle: { color: '#5EE0C4', width: 2 }, label: { formatter: `你的選擇 +${S.price.r}%`, color: '#5EE0C4', position: 'end', fontSize: 11 } }] },
          markPoint: { symbol: 'pin', symbolSize: 44, itemStyle: { color: '#2DB674' }, label: { fontSize: 10, color: '#04130d', formatter: '最佳' }, data: [{ coord: [r.best.r + '%', Math.round(r.best.gp)] }] } },
        { name: '損益平衡線', type: 'line', symbol: 'none', data: r.curve.map(() => 0), lineStyle: { type: 'dashed', color: 'rgba(236,106,85,0.8)', width: 1.5 } },
      ],
    };
    if (rebuildVerdict) verdict(r, `價格彈性為示範假設；漲幅越大、越偏離 AI 預設，預測越不確定。`);
  } else if (t === 'hire') {
    const H = S.hire, r = hireSim(B, H);
    kpis([
      { t: '雇主每月總成本', v: r.row.cost, sub: `薪資 ${nt(r.pay)}＋勞健保勞退 ${n0(r.row.employer)}`, c: '#2E97D4' },
      { t: '每月多賣', v: r.sold, pre: '', suf: ' 件', sub: `產能 ${n0(r.cap)} 件 × ${S.hire.demand}%，營收約 +${nt(r.revGain)}`, c: '#F0A531' },
      { t: '每月淨貢獻', abs: 1, v: r.net, pre: r.net < 0 ? '−NT$ ' : '+NT$ ', cls: r.net >= 0 ? 'pos' : 'neg', sub: `老闆每週多出 ${r.ownerWeek.toFixed(0)} 小時`, c: '#2DB674' },
      { t: '回收月數', raw: r.payback ? `第 ${r.payback} 個月` : '一年內未回本', cls: r.payback ? '' : 'neg', sub: `投保級距 ${n0(r.level)}（簡化）`, c: '#7C62E6' },
    ]);
    opt = {
      animationDurationUpdate: 350,
      grid: { left: 8, right: 8, top: 40, bottom: 4, containLabel: true },
      legend: { top: 0, right: 0, itemWidth: 12, itemHeight: 8, data: ['增加的貢獻', '雇主總成本', '累計損益'] },
      tooltip: { trigger: 'axis', valueFormatter: v => (v < 0 ? '−' : '') + 'NT$ ' + Math.abs(Math.round(v)).toLocaleString() },
      xAxis: { type: 'category', data: r.series.map(s => `第${s.m}月`), axisLabel: { interval: 1, fontSize: 10.5 } },
      yAxis: { type: 'value', axisLabel: { formatter: v => (v < 0 ? '−' : '') + fmtK(Math.abs(v)) } },
      series: [
        { name: '增加的貢獻', type: 'bar', barWidth: '30%', data: r.series.map(s => s.gain), itemStyle: { borderRadius: [4, 4, 0, 0], color: '#2DB674' } },
        { name: '雇主總成本', type: 'bar', barWidth: '30%', data: r.series.map(s => -s.cost), itemStyle: { borderRadius: [0, 0, 4, 4], color: 'rgba(236,106,85,0.75)' } },
        { name: '累計損益', type: 'line', smooth: true, data: r.series.map(s => s.cum), symbolSize: 6, lineStyle: { width: 3, color: '#F0A531' }, itemStyle: { color: '#F0A531' },
          markLine: { symbol: 'none', silent: true, data: [{ yAxis: 0 }], lineStyle: { color: 'rgba(255,255,255,0.35)', type: 'dashed' }, label: { show: false } },
          markPoint: r.payback ? { symbol: 'pin', symbolSize: 46, itemStyle: { color: '#5EE0C4' }, label: { fontSize: 10, color: '#04130d', formatter: '回本' }, data: [{ coord: [`第${r.payback}月`, r.series[r.payback - 1].cum] }] } : { data: [] } },
      ],
    };
    if (rebuildVerdict) verdict(r, `產能與消化率為示範假設；兼職較容易調整，信心高於全職。`);
  } else if (t === 'equip') {
    const E = S.equip, r = equipSim(B, E);
    kpis([
      { t: '回收期', raw: Number.isFinite(r.pb) ? `${Math.ceil(r.pb)} 個月` : '無法回收', cls: Number.isFinite(r.pb) && r.pb <= 18 ? 'pos' : 'neg', sub: r.payback ? `含爬坡期，第 ${r.payback} 個月累計轉正` : '36 個月內未轉正', c: '#7C62E6' },
      { t: '每月增加貢獻', abs: 1, v: r.monthlyGain, pre: r.monthlyGain < 0 ? '−NT$ ' : 'NT$ ', sub: `已扣水電 ${nt(E.util)}`, c: '#2DB674' },
      { t: '每月折舊（帳上）', v: r.dep, sub: `扣折舊後淨利 ${snt(r.profit)}／月`, c: '#F0A531' },
      { t: '購買後現金可撐', raw: `${r.runwayAfter.toFixed(1)} 個月`, cls: r.runwayAfter < 3 ? 'neg' : 'pos', sub: `原 ${B.runway.toFixed(1)} 個月固定支出・${r.runwayAfter < 3 ? '低於 3 個月安全線' : '高於 3 個月安全線'}`, c: '#2E97D4' },
    ]);
    opt = {
      animationDurationUpdate: 350,
      grid: { left: 8, right: 8, top: 40, bottom: 4, containLabel: true },
      legend: { top: 0, right: 0, itemWidth: 12, itemHeight: 8, data: ['每月現金流', '累計現金影響'] },
      tooltip: { trigger: 'axis', valueFormatter: v => (v < 0 ? '−' : '') + 'NT$ ' + Math.abs(Math.round(v)).toLocaleString() },
      xAxis: { type: 'category', data: r.series.map(s => `${s.m}`), axisLabel: { interval: 5, formatter: v => '第' + v + '月' } },
      yAxis: { type: 'value', axisLabel: { formatter: v => (v < 0 ? '−' : '') + fmtK(Math.abs(v)) } },
      series: [
        { name: '每月現金流', type: 'bar', barWidth: '55%', data: r.series.map(s => ({ value: s.net, itemStyle: { color: s.net >= 0 ? 'rgba(45,182,116,0.7)' : 'rgba(236,106,85,0.75)', borderRadius: 3 } })) },
        { name: '累計現金影響', type: 'line', smooth: true, symbol: 'none', data: r.series.map(s => s.cum), lineStyle: { width: 3, color: '#7C62E6', shadowColor: '#7C62E6', shadowBlur: 12 },
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(124,98,230,0.3)' }, { offset: 1, color: 'rgba(124,98,230,0)' }] } },
          markLine: { symbol: 'none', silent: true, data: [{ yAxis: 0 }], lineStyle: { color: 'rgba(255,255,255,0.35)', type: 'dashed' }, label: { show: false } },
          markPoint: r.payback ? { symbol: 'pin', symbolSize: 46, itemStyle: { color: '#5EE0C4' }, label: { fontSize: 10, color: '#04130d', formatter: '回本' }, data: [{ coord: [`${r.payback}`, r.series[r.payback - 1].cum] }] } : { data: [] } },
      ],
    };
    if (rebuildVerdict) verdict(r, `產能消化率越接近實際週末缺貨量、現金跑道越充足，信心越高。`);
  } else {
    const C = S.chan, r = channelSim(B, C);
    kpis([
      { t: '每月淨利貢獻', abs: 1, v: r.net, pre: r.net < 0 ? '−NT$ ' : '+NT$ ', cls: r.net >= 0 ? 'pos' : 'neg', sub: `首年（含爬坡）${snt(r.year)}`, c: '#2DB674' },
      { t: '每單淨利', abs: 1, v: r.perOrder, pre: r.perOrder < 0 ? '−NT$ ' : 'NT$ ', sub: `自家通路約 ${nt(r.ownMargin)}／單`, c: '#F0A531' },
      { t: '每月平台抽成', v: r.commission, sub: `占營收 ${(r.commission / Math.max(1, r.rev) * 100).toFixed(1)}%（未稅計）`, c: '#EC6A55' },
      { t: '打平所需訂單', raw: Number.isFinite(r.beOrders) ? `${n0(r.beOrders)} 筆／月` : '無法打平', cls: Number.isFinite(r.beOrders) && r.beOrders <= C.orders ? 'pos' : 'neg', sub: `目前設定 ${C.orders} 筆`, c: '#2E97D4' },
    ]);
    const steps = [['營收', r.rev], ['平台抽成', -r.commission], ['商品成本', -r.prodCost], ['包材物流', -r.logi], ['行銷', -r.mkt], ['取代自家', -r.cannibalLoss]];
    // 瀑布圖：正負分開堆疊（跨過 0 的減項拆成上下兩段）
    const base = [], up = [], down = [], downNeg = [];
    let run = 0;
    for (const [, v] of steps) {
      const prev = run, next = run + v;
      if (v >= 0) { base.push(Math.round(prev)); up.push(Math.round(v)); down.push('-'); downNeg.push('-'); }
      else if (next >= 0) { base.push(Math.round(next)); down.push(Math.round(-v)); downNeg.push('-'); up.push('-'); }
      else if (prev > 0) { base.push('-'); down.push(Math.round(prev)); downNeg.push(Math.round(next)); up.push('-'); }
      else { base.push(Math.round(prev)); down.push('-'); downNeg.push(Math.round(v)); up.push('-'); }
      run = next;
    }
    const lab = (i) => '−' + fmtK(Math.abs(Math.round(steps[i][1])));
    const cats = [...steps.map(s => s[0]), '淨貢獻'];
    opt = {
      animationDurationUpdate: 350,
      grid: { left: 8, right: 8, top: 24, bottom: 4, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (ps) => { const i = ps[0].dataIndex; const v = i < steps.length ? steps[i][1] : r.net; return `${cats[i]}<br/><b>${v < 0 ? '−' : ''}NT$ ${Math.abs(Math.round(v)).toLocaleString()}</b>`; } },
      xAxis: { type: 'category', data: cats, axisLabel: { interval: 0, fontSize: 10.5 } },
      yAxis: { type: 'value', axisLabel: { formatter: v => (v < 0 ? '−' : '') + fmtK(Math.abs(v)) } },
      series: [
        { type: 'bar', stack: 'w', silent: true, itemStyle: { color: 'transparent' }, data: [...base, '-'] },
        { type: 'bar', stack: 'w', barWidth: '56%', data: [...up, '-'], itemStyle: { color: '#2E97D4', borderRadius: 4 }, label: { show: true, position: 'top', color: '#eafff4', fontSize: 10.5, formatter: p => fmtK(p.value) } },
        { type: 'bar', stack: 'w', data: [...down, '-'], itemStyle: { color: 'rgba(236,106,85,0.8)', borderRadius: 4 }, label: { show: true, position: 'top', color: '#ffb3a6', fontSize: 10.5, formatter: p => lab(p.dataIndex) } },
        { type: 'bar', stack: 'w', data: [...downNeg, '-'], itemStyle: { color: 'rgba(236,106,85,0.8)', borderRadius: 4 }, label: { show: true, position: 'bottom', color: '#ffb3a6', fontSize: 10.5, formatter: p => (down[p.dataIndex] === '-' ? lab(p.dataIndex) : '') } },
        { type: 'bar', stack: 'w', data: [...steps.map(() => '-'), { value: Math.round(r.net), itemStyle: { color: r.net >= 0 ? '#2DB674' : '#EC6A55', borderRadius: 4, shadowColor: r.net >= 0 ? '#2DB674' : '#EC6A55', shadowBlur: 14 } }],
          label: { show: true, position: r.net >= 0 ? 'top' : 'bottom', color: '#eafff4', fontWeight: 700, fontSize: 11, formatter: () => (r.net < 0 ? '−' : '') + fmtK(Math.abs(Math.round(r.net))) } },
      ],
    };
    if (rebuildVerdict) verdict(r, `平台抽成、訂單量與熟客轉移比例為示範假設；跨境變數較多，信心較低。`);
  }
  simChart.setOption(opt, full);
}

// ---------- 問顧問 ----------
function addMsg(who, text, { instant = false, cites = [], acts = [] } = {}) {
  const box = $('#adMsgs', root);
  const m = el(`<div class="ad-msg ${who}"><span class="ad-av">${who === 'ai' ? icon('bot', 16) : '美'}</span><div class="ad-bub"><p></p></div></div>`);
  box.appendChild(m);
  const p = $('p', m);
  const finish = () => {
    p.innerHTML = who === 'ai' ? boldify(text) : esc(text);
    if (cites.length) $('.ad-bub', m).appendChild(el(`<div class="ad-cites"><small>${icon('db', 12)} 引用數據</small>${cites.map(([k, v]) => `<span><em>${esc(k)}</em>${esc(v)}</span>`).join('')}</div>`));
    if (acts.length) $('.ad-bub', m).appendChild(el(`<div class="ad-macts">${acts.map(a => `<button class="btn btn-ghost btn-sm" ${a.go ? `data-go="${a.go}"` : a.scroll ? `data-scroll="${a.scroll}"` : `data-sim='${JSON.stringify(a.sim)}'`}>${esc(a.label)} ${icon('arrow', 13)}</button>`).join('')}</div>`));
    box.scrollTop = box.scrollHeight;
  };
  gsap.fromTo(m, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35 });
  if (instant || who !== 'ai') { finish(); return Promise.resolve(); }
  return typeText(p, text, 9).then(finish);
}
let asking = false;
async function ask(q) {
  if (asking) return;
  asking = true;
  B = baseline(); W = W || weekly(B);
  await addMsg('me', q);
  const box = $('#adMsgs', root);
  const th = el(`<div class="ad-msg ai"><span class="ad-av">${icon('bot', 16)}</span><div class="ad-bub ad-think"><span class="ad-dots"><i></i><i></i><i></i></span>正在讀帳、比對近 90 天數據…</div></div>`);
  box.appendChild(th); box.scrollTop = box.scrollHeight;
  await sleep(750);
  th.remove();
  const a = answer(q, B, W);
  const scroll = setInterval(() => { box.scrollTop = box.scrollHeight; }, 120);
  await addMsg('ai', a.t, { cites: a.cites, acts: a.acts });
  clearInterval(scroll);
  asking = false;
}

// ---------- 政府資源 ----------
function renderGov() {
  const list = govList(B);
  $('#adGovGrid', root).innerHTML = list.map(g => `
    <article class="ad-gc" style="--c:${g.c}">
      <div class="ad-gc-h"><span class="ad-gc-ic">${icon(g.ic, 18)}</span><div><b>${esc(g.name)}</b><small>${esc(g.ex)}</small></div><span class="ad-gc-score"><em>${g.score}%</em>媒合度</span></div>
      <p class="ad-gc-why">${icon('sparkle', 13)}<span>${boldify(g.why)}</span></p>
      <dl>
        <dt>適合條件</dt><dd><ul>${g.fit.map(f => `<li>${esc(f)}</li>`).join('')}</ul></dd>
        <dt>可能額度範圍</dt><dd>${esc(g.amount)}</dd>
        <dt>申請時程</dt><dd>${esc(g.time)}</dd>
      </dl>
      <button class="btn btn-ghost btn-sm ad-gc-btn" data-gov="${g.id}">${icon('file', 14)} AI 幫你整理申請資料草稿</button>
    </article>`).join('');
  $$('[data-gov]', root).forEach(b => b.addEventListener('click', () => openDraft(list.find(g => g.id === b.dataset.gov))));
}

async function openDraft(g) {
  const secs = draftFor(g, B);
  const m = el(`<div class="ad-modal" role="dialog" aria-modal="true">
    <div class="ad-modal-bg"></div>
    <div class="glass ad-modal-p">
      <div class="ad-modal-h"><div><span class="demo-badge">${icon('alert', 12)} 示範草稿</span><h3>${esc(g.name)}・申請資料草稿</h3></div><button class="icon-btn ad-x" aria-label="關閉">${icon('x', 18)}</button></div>
      <p class="ad-gov-note">${icon('shield', 14)}<span>名稱與內容以主管機關最新公告為準，此為示範媒合；草稿僅供整理思路，送件前請依實際公告格式調整。</span></p>
      <div class="ad-draft" id="adDraft">${secs.map(([h]) => `<section><h5>${esc(h)}</h5><p></p></section>`).join('')}</div>
      <div class="ad-modal-f"><button class="btn btn-ghost btn-sm ad-x">關閉</button><button class="btn btn-primary btn-sm" id="adCopy">${icon('file', 14)} 複製草稿</button></div>
    </div></div>`);
  document.body.appendChild(m);
  let alive = true;
  const close = () => { alive = false; gsap.to(m, { opacity: 0, duration: 0.2, onComplete: () => m.remove() }); };
  $$('.ad-x', m).forEach(b => b.addEventListener('click', close));
  $('.ad-modal-bg', m).addEventListener('click', close);
  $('#adCopy', m).addEventListener('click', async () => {
    const txt = secs.map(([h, t]) => `${h}\n${t}`).join('\n\n');
    try { await navigator.clipboard.writeText(txt); } catch { /* ignore */ }
    toast('已複製申請資料草稿', '示範草稿，送件前請依主管機關最新公告調整', { icon: icon('check', 18) });
  });
  gsap.fromTo(m, { opacity: 0 }, { opacity: 1, duration: 0.25 });
  gsap.fromTo($('.ad-modal-p', m), { y: 30, scale: 0.97 }, { y: 0, scale: 1, duration: 0.45, ease: 'back.out(1.6)' });
  const ps = $$('#adDraft p', m);
  for (let i = 0; i < secs.length; i++) { if (!alive) return; await typeText(ps[i], secs[i][1], 6); }
}
