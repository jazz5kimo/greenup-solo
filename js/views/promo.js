// 後台：節日特價（前綴 .pm-）
// 老闆先排好檔期與折扣，時間到自動變價、結束自動恢復原價；官網、LINE、POS、訂單、發票、帳務全部同步（價格由 data.js 讀 promo.js）
// 節日日期、AI 建議為示範；成效依目前系統內的真實訂單（store）即時統計
import { $, $$, el, gsap, esc, money, toast as baseToast, pad, countUp } from '../util.js';
import { icon } from '../icons.js';
import { productArt } from '../art.js';
import { PRODUCTS } from '../data.js';
import { store } from '../state.js';
import { TENANT_ID } from '../tenant.js';
import { FESTIVALS, FESTIVAL_MAP, getPromos, upsertPromo, removePromo, promoStatus, onPromos, roundPrice } from '../promo.js';

const toast = (title, body = '', opt = {}) => baseToast(title, body, { icon: icon(opt.kind === 'warn' ? 'alert' : 'percent', 18), ...opt });

const ST_LABEL = { live: '進行中', scheduled: '排程中', ended: '已結束', off: '已關閉' };
const ST_ORDER = { live: 0, scheduled: 1, off: 2, ended: 3 };
const QUICK = [[0.95, '95 折'], [0.9, '9 折'], [0.88, '88 折'], [0.85, '85 折'], [0.8, '8 折']];
const WD = '日一二三四五六';
const DAY = 86400000;

let root = null;
let visible = false;
let timer = 0;
let lastSig = '';
let modal = null;
let ed = null;
const armed = new Map();

/* ---------- 日期小工具 ---------- */
const D = (s) => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const endOf = (s) => +D(s) + DAY - 1;
const nDays = (p) => Math.round((D(p.to) - D(p.from)) / DAY) + 1;
const thisYear = () => new Date().getFullYear();
const md = (s) => { const d = D(s); return `${d.getMonth() + 1}/${d.getDate()}`; };
const mdY = (s) => { const d = D(s); return `${d.getFullYear() !== thisYear() ? d.getFullYear() + '/' : ''}${d.getMonth() + 1}/${d.getDate()}`; };
const mdW = (s) => `${mdY(s)}（${WD[D(s).getDay()]}）`;
const range = (p) => `${md(p.from)}–${md(p.to)}`;
const rangeY = (p) => `${mdY(p.from)}–${D(p.to).getFullYear() !== D(p.from).getFullYear() ? mdY(p.to) : md(p.to)}`;
const addYear = (s) => { const [y, m, d] = s.split('-').map(Number); const dd = m === 2 && d === 29 ? 28 : d; return `${y + 1}-${pad(m)}-${pad(dd)}`; };
function fmtLeft(ms) {
  ms = Math.max(0, ms);
  const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60;
  return (d ? `${d} 天 ` : '') + `${pad(h)}:${pad(m)}:${pad(ss)}`;
}
const daysUntil = (s) => Math.max(0, Math.ceil((+D(s) - Date.now()) / DAY));
// 節日範本：已經過去的檔期自動往後推一年（示範日期）
function festivalWindows() {
  const today = ymd(new Date());
  return FESTIVALS.map(f => (f.to < today ? { ...f, from: addYear(f.from), to: addYear(f.to) } : { ...f })).sort((a, b) => a.from.localeCompare(b.from));
}

/* ---------- 計算 ---------- */
const costOf = (pr) => (pr.cost != null ? +pr.cost : Math.round(pr.listPrice * 0.45));
const pctTxt = (v) => `${Math.round(v * 100)}%`;
const zhe = (pct) => { const n = Math.round(pct * 100); return n % 10 === 0 ? `${n / 10} 折` : `${n} 折`; };
function saleOf(p, pr) {
  if (p.scope === 'all') return p.pct ? roundPrice(pr.listPrice * p.pct) : null;
  const v = p.items ? p.items[pr.id] : null;
  return v == null || v === '' || isNaN(+v) ? null : +v;
}
function stats(p) {
  const rows = [];
  for (const pr of PRODUCTS) {
    const sale = saleOf(p, pr);
    if (sale == null) continue;
    const list = pr.listPrice, cost = costOf(pr);
    rows.push({ pr, sale, list, cost, off: 1 - sale / list, margin: sale > 0 ? (sale - cost) / sale : -1 });
  }
  const eff = rows.filter(r => r.sale < r.list);
  const sum = (a, f) => a.reduce((s, r) => s + f(r), 0);
  const avgOff = eff.length ? sum(eff, r => r.off) / eff.length : 0;
  const sSale = sum(eff, r => r.sale), sList = sum(eff, r => r.list);
  const margin = sSale ? sum(eff, r => r.sale - r.cost) / sSale : 0;
  const base = sList ? sum(eff, r => r.list - r.cost) / sList : 0;
  return { rows, eff, avgOff, margin, base, below: rows.filter(r => r.sale <= r.cost), thin: rows.filter(r => r.sale > r.cost && r.margin < 0.15 && r.sale < r.list) };
}
function scopeTxt(p) {
  if (p.scope === 'all') return p.pct ? `全店 ${zhe(p.pct)}` : '全店（未設定折數）';
  const n = Object.keys(p.items || {}).length;
  return `${n} 項指定商品`;
}
const overlaps = (a, b) => a.from <= b.to && b.from <= a.to;
function overlapWith(p, list = getPromos()) { return list.filter(x => x.id !== p.id && x.on && overlaps(x, p)); }
// 成效：該檔期日期內、品項標記為此檔期標籤的真實訂單
function perf(p) {
  const a = +D(p.from), b = endOf(p.to);
  const by = new Map();
  let orders = 0, sales = 0, units = 0, give = 0;
  for (const o of store.orders) {
    if (o.ts < a || o.ts > b || !o.items || /cancel|refund|void/.test(o.status || '')) continue;
    const its = o.items.filter(i => i.promo === p.badge);
    if (!its.length) continue;
    orders += 1;
    for (const i of its) {
      sales += i.price * i.qty; units += i.qty; give += Math.max(0, ((i.list ?? i.price) - i.price) * i.qty);
      by.set(i.pid, (by.get(i.pid) || 0) + i.qty);
    }
  }
  return { orders, sales, units, give, by: [...by.entries()].sort((x, y) => y[1] - x[1]) };
}
const prodOf = (pid) => PRODUCTS.find(x => x.id === pid);
const art = (pid, size) => { try { return productArt(pid, size); } catch { return ''; } };
const thumb = (pr, size = 34, cls = '') => `<span class="pm-thumb ${cls}" style="--pc:${pr?.color || '#2DB674'}">${pr ? art(pr.id, size) : ''}</span>`;
const stChip = (st) => `<span class="pm-st ${st}"><i></i>${ST_LABEL[st]}</span>`;
const sorted = () => getPromos().sort((x, y) => (ST_ORDER[promoStatus(x)] - ST_ORDER[promoStatus(y)]) || (promoStatus(x) === 'ended' ? y.to.localeCompare(x.to) : x.from.localeCompare(y.from)));
const sig = () => getPromos().map(p => p.id + promoStatus(p)).join();

/* ---------- 版面 ---------- */
function layout() {
  return `<div class="pm">
    <div class="glass pm-head anim-in">
      <div class="pm-head-t">
        <div class="pm-badges"><span class="demo-badge">${icon('alert', 13)} 示範：節日日期與資料為示範</span><span class="chip-sm">${icon('refresh', 12)} 官網・LINE・POS・訂單・發票・帳務同步</span></div>
        <h2>節日特價：<span class="grad-txt">先排好，時間到自動變價</span></h2>
        <p>先排好檔期，時間到自動變價、結束自動恢復原價；官網、LINE、POS 等所有通路同步。</p>
        <div class="pm-head-btns">
          <button class="btn btn-primary" data-new>${icon('plus', 16)} 新增特價檔期</button>
          <a class="btn btn-ghost" href="shop.html?tenant=${encodeURIComponent(TENANT_ID)}" target="greenup-shop">${icon('external', 16)} 看銷售網頁價格</a>
        </div>
      </div>
      <div class="pm-now" id="pmNow"></div>
    </div>
    <section class="glass card pm-tl-card anim-in">
      <div class="card-h"><h3>${icon('calendar', 16)} 一年檔期表</h3><div class="pm-legend"><span class="live">進行中</span><span class="scheduled">排程中</span><span class="ended">已結束</span><span class="off">已關閉</span></div></div>
      <div class="pm-tl-wrap">
        <div class="pm-tl" id="pmTl"></div>
        <div class="pm-fest">
          <div class="pm-fest-h"><b>節日清單</b><small>點一下就幫你帶入日期（示範日期）</small></div>
          <div class="pm-fest-list" id="pmFest"></div>
        </div>
      </div>
    </section>
    <section class="pm-sec anim-in">
      <div class="pm-sec-h"><h3>${icon('percent', 16)} 特價檔期</h3><span class="chip-sm" id="pmCount"></span></div>
      <div class="pm-cards" id="pmCards"></div>
    </section>
    <section class="glass card pm-perf-card anim-in">
      <div class="card-h"><h3>${icon('trend', 16)} 特價成效</h3><span class="chip-sm">依系統內實際訂單即時統計</span></div>
      <div class="pm-perf" id="pmPerf"></div>
    </section>
  </div>`;
}

/* ---------- 頂部：現在／下一檔 ---------- */
function renderNow() {
  const list = getPromos();
  const live = list.filter(p => promoStatus(p) === 'live').sort((a, b) => a.to.localeCompare(b.to));
  const next = list.filter(p => promoStatus(p) === 'scheduled').sort((a, b) => a.from.localeCompare(b.from))[0];
  const L = live[0];
  const liveHtml = L ? `<div class="pm-now-tile live" data-edit="${esc(L.id)}" role="button" tabindex="0">
      <small><span class="pm-dot"></span>現在進行中${live.length > 1 ? `・共 ${live.length} 檔（重疊取最低價）` : ''}</small>
      <b>${esc(L.name)} <span class="pm-badge">${esc(L.badge)}</span></b>
      <div class="pm-cd"><span>距離結束</span><em data-cd="${endOf(L.to)}">${fmtLeft(endOf(L.to) - Date.now())}</em></div>
      <span class="pm-now-sub">${scopeTxt(L)}・${md(L.to)} 23:59 自動恢復原價</span>
    </div>` : `<div class="pm-now-tile idle"><small>現在進行中</small><b>目前沒有特價</b><span class="pm-now-sub">所有商品都是原價</span></div>`;
  const nextHtml = next ? `<div class="pm-now-tile next" data-edit="${esc(next.id)}" role="button" tabindex="0">
      <small>${icon('clock', 12)} 下一檔</small>
      <b>${esc(next.name)} <span class="pm-badge">${esc(next.badge)}</span></b>
      <div class="pm-cd"><span>${daysUntil(next.from)} 天後開始</span><em>${mdW(next.from)}</em></div>
      <span class="pm-now-sub">${scopeTxt(next)}・00:00 自動變價</span>
    </div>` : `<div class="pm-now-tile idle"><small>下一檔</small><b>還沒有排程</b><span class="pm-now-sub">從下方節日清單點一下就能建立</span></div>`;
  $('#pmNow', root).innerHTML = liveHtml + nextHtml;
}

/* ---------- 一年檔期表 ---------- */
function renderTimeline() {
  const now = new Date();
  const t0 = new Date(now.getFullYear(), now.getMonth(), 1), t1 = new Date(now.getFullYear(), now.getMonth() + 12, 1);
  const span = t1 - t0;
  const pos = (ts) => Math.min(100, Math.max(0, (ts - t0) / span * 100));
  const months = [];
  for (let i = 0; i < 12; i++) {
    const a = new Date(t0.getFullYear(), t0.getMonth() + i, 1), b = new Date(t0.getFullYear(), t0.getMonth() + i + 1, 1);
    months.push(`<span class="pm-mo${a.getMonth() === 0 ? ' yr' : ''}" style="flex:${(b - a) / DAY}">${a.getMonth() === 0 ? `<i>${a.getFullYear()}</i>` : ''}<b>${a.getMonth() + 1}</b><small>月</small></span>`);
  }
  const all = sorted().sort((a, b) => a.from.localeCompare(b.from));
  const inWin = all.filter(p => endOf(p.to) >= +t0 && +D(p.from) < +t1);
  const out = all.length - inWin.length;
  const today = pos(Date.now());
  const rows = inWin.map((p, i) => {
    const st = promoStatus(p);
    const l = pos(+D(p.from)), r = pos(endOf(p.to) + 1);
    const cutL = +D(p.from) < +t0, cutR = endOf(p.to) >= +t1;
    const side = r > 72 ? `right:${100 - l}%;text-align:right;padding-right:6px` : `left:${r}%;padding-left:6px`;
    return `<button class="pm-tl-lab" style="grid-row:${i + 2}" data-edit="${esc(p.id)}" title="編輯 ${esc(p.name)}"><b>${esc(p.name)}</b><small>${rangeY(p)}</small></button>
      <div class="pm-tl-track" style="grid-row:${i + 2}"><button class="pm-bar ${st}${cutL ? ' cutl' : ''}${cutR ? ' cutr' : ''}" data-edit="${esc(p.id)}" style="left:${l}%;width:${Math.max(0.9, r - l)}%" title="${esc(p.name)}・${rangeY(p)}・${ST_LABEL[st]}" aria-label="編輯 ${esc(p.name)}"></button><span class="pm-bar-l ${st}" style="${side}">${esc(p.badge)}<small>${ST_LABEL[st]}・${scopeTxt(p)}</small></span></div>`;
  }).join('');
  // 還沒排的節日（虛線，點一下建立）
  const free = festivalWindows().filter(f => endOf(f.to) >= +t0 && +D(f.from) < +t1 && !all.some(p => p.festival === f.id && overlaps(p, f)));
  const gr = inWin.length + 2;
  const ghost = free.length ? `<div class="pm-tl-lab ghost" style="grid-row:${gr}"><b>還沒排的節日</b><small>點虛線直接建立</small></div>
      <div class="pm-tl-track ghost" style="grid-row:${gr}">${free.map(f => { const l = pos(+D(f.from)), r = pos(endOf(f.to) + 1); return `<button class="pm-ghost" data-fest="${f.id}" style="left:${l}%;width:${Math.max(0.9, r - l)}%" title="建立 ${esc(f.name)}（${rangeY(f)}）" aria-label="建立 ${esc(f.name)}">${icon('plus', 11)}</button>`; }).join('')}</div>` : '';
  const nRows = inWin.length + (free.length ? 1 : 0);
  $('#pmTl', root).innerHTML = `<div class="pm-tl-grid" style="--today:${today}%">
      <div class="pm-tl-corner"></div>
      <div class="pm-tl-months">${months.join('')}</div>
      ${rows || `<div class="pm-tl-empty">未來 12 個月還沒有特價檔期，點節日就能建立。</div>`}${ghost}
      <div class="pm-tl-now" style="grid-row:1 / ${Math.max(3, nRows + 2)}"><i style="left:${today}%"><em>今天 ${now.getMonth() + 1}/${now.getDate()}</em></i></div>
    </div>${out ? `<p class="pm-note">另有 ${out} 檔不在這 12 個月內，可在下方檔期卡片查看。</p>` : ''}`;
  const list = getPromos();
  $('#pmFest', root).innerHTML = festivalWindows().map(f => {
    const has = list.find(p => p.festival === f.id && overlaps(p, f));
    return `<button class="pm-fest-i${has ? ' has' : ''}" data-fest="${f.id}"><span class="pm-fest-n">${esc(f.name)}</span><small>${rangeY(f)}</small>${has ? `<em>已排・${ST_LABEL[promoStatus(has)]}</em>` : `<em class="add">${icon('plus', 12)} 建立</em>`}</button>`;
  }).join('') + `<button class="pm-fest-i custom" data-fest="custom"><span class="pm-fest-n">自訂檔期</span><small>店慶、清倉、會員日…</small><em class="add">${icon('plus', 12)} 建立</em></button>`;
}

/* ---------- 檔期卡片 ---------- */
function renderCards() {
  const list = sorted();
  const cnt = list.reduce((m, p) => { const s = promoStatus(p); m[s] = (m[s] || 0) + 1; return m; }, {});
  $('#pmCount', root).textContent = `共 ${list.length} 檔・進行中 ${cnt.live || 0}・排程中 ${cnt.scheduled || 0}`;
  const host = $('#pmCards', root);
  if (!list.length) {
    host.innerHTML = `<div class="glass pm-empty"><b>還沒有任何特價檔期</b><span>按「新增特價檔期」，或從檔期表右側點一個節日開始。</span><button class="btn btn-primary btn-sm" data-new>${icon('plus', 14)} 新增特價檔期</button></div>`;
    return;
  }
  host.innerHTML = list.map(p => {
    const st = promoStatus(p), s = stats(p), pf = (st === 'live' || st === 'ended') ? perf(p) : null;
    const ov = p.on ? overlapWith(p, list) : [];
    const items = s.eff.slice(0, 6);
    const when = st === 'live' ? `<span class="pm-when live">剩 <em data-cd="${endOf(p.to)}">${fmtLeft(endOf(p.to) - Date.now())}</em></span>`
      : st === 'scheduled' ? `<span class="pm-when">${daysUntil(p.from)} 天後自動開始</span>`
        : st === 'ended' ? `<span class="pm-when">已恢復原價</span>` : `<span class="pm-when">關閉中，不會變價</span>`;
    const del = armed.has(p.id);
    return `<article class="glass pm-card ${st}" data-id="${esc(p.id)}">
      <div class="pm-card-top">
        <div class="pm-card-t"><b>${esc(p.name)}</b><span class="pm-badge">${esc(p.badge)}</span></div>
        ${stChip(st)}
      </div>
      <div class="pm-card-date">${icon('calendar', 13)} ${mdW(p.from)} – ${mdW(p.to)}<span>・${nDays(p)} 天</span></div>
      <div class="pm-card-scope"><span class="pm-scope-tag ${p.scope}">${scopeTxt(p)}</span>${when}</div>
      ${p.scope === 'items' ? `<div class="pm-card-items">${items.map(r => `<span class="pm-ci" title="${esc(r.pr.name)} ${money(r.list)} → ${money(r.sale)}">${thumb(r.pr, 26, 'sm')}<s>${r.list}</s><b>${r.sale}</b></span>`).join('')}${s.eff.length > items.length ? `<span class="pm-more">+${s.eff.length - items.length}</span>` : ''}${!s.eff.length ? '<span class="pm-muted">尚未設定商品</span>' : ''}</div>` : ''}
      <div class="pm-card-m">
        <div><small>平均折扣</small><b>${s.eff.length ? `${pctTxt(s.avgOff)} off` : '—'}</b></div>
        <div><small>預估毛利率</small><b class="${s.margin < 0.15 && s.eff.length ? 'warn' : ''}">${s.eff.length ? pctTxt(s.margin) : '—'}</b><i>原 ${s.eff.length ? pctTxt(s.base) : '—'}</i></div>
        <div><small>成效</small><b>${pf ? `${pf.orders} 筆` : '—'}</b><i>${pf ? money(pf.sales) : '開始後統計'}</i></div>
      </div>
      ${ov.length ? `<div class="pm-card-warn">${icon('alert', 13)} 與 ${ov.map(o => `「${esc(o.name)}」`).join('')}日期重疊，重疊時自動取最低價</div>` : ''}
      ${s.below.length ? `<div class="pm-card-warn bad">${icon('alert', 13)} ${s.below.length} 項特價低於成本，請編輯調整</div>` : ''}
      <div class="pm-card-act">
        <label class="pm-sw" title="${p.on ? '關閉這檔特價' : '開啟這檔特價'}"><input type="checkbox" data-toggle="${esc(p.id)}" ${p.on ? 'checked' : ''}><span class="pm-sw-k"></span><span class="pm-sw-t">${p.on ? '開啟' : '關閉'}</span></label>
        <div class="pm-card-btns">
          <button class="btn btn-ghost btn-sm" data-edit="${esc(p.id)}">編輯</button>
          <button class="btn btn-ghost btn-sm" data-copy="${esc(p.id)}">複製到明年</button>
          <button class="btn btn-ghost btn-sm pm-del${del ? ' armed' : ''}" data-del="${esc(p.id)}">${del ? '確定刪除？' : '刪除'}</button>
        </div>
      </div>
    </article>`;
  }).join('');
}

/* ---------- 成效 ---------- */
function renderPerf() {
  const list = sorted().filter(p => { const st = promoStatus(p); return st === 'live' || st === 'ended' || (st === 'off' && +D(p.from) <= Date.now()); });
  const host = $('#pmPerf', root);
  if (!list.length) { host.innerHTML = '<p class="pm-perf-empty">檔期開始後，這裡會即時統計特價帶來的訂單、銷售額與各商品賣出件數。</p>'; return; }
  host.innerHTML = list.map(p => {
    const st = promoStatus(p), f = perf(p);
    const max = Math.max(1, ...f.by.map(x => x[1]));
    return `<div class="pm-pf">
      <div class="pm-pf-h"><b>${esc(p.name)}</b><span class="pm-badge">${esc(p.badge)}</span>${stChip(st)}<small>${rangeY(p)}</small></div>
      <div class="pm-pf-k">
        <div><small>特價訂單</small><b data-n="${f.orders}" data-suf=" 筆">0 筆</b></div>
        <div><small>特價銷售額</small><b data-n="${f.sales}" data-pre="NT$ ">NT$ 0</b></div>
        <div><small>賣出件數</small><b data-n="${f.units}" data-suf=" 件">0 件</b></div>
        <div><small>讓利給客人</small><b data-n="${f.give}" data-pre="NT$ ">NT$ 0</b></div>
      </div>
      ${f.by.length ? `<div class="pm-pf-bars">${f.by.map(([pid, q]) => { const pr = prodOf(pid); return `<div class="pm-pf-row">${thumb(pr, 22, 'xs')}<span class="pm-pf-name">${esc(pr?.name || pid)}</span><span class="pm-pf-bar"><i style="width:${q / max * 100}%"></i></span><b>${q} 件</b></div>`; }).join('')}</div>`
        : `<p class="pm-perf-empty sm">還沒有特價訂單（0 筆）。到銷售網頁或 POS 下一筆特價商品，這裡會即時更新。</p>`}
    </div>`;
  }).join('');
  $$('[data-n]', host).forEach(n => countUp(n, +n.dataset.n, { prefix: n.dataset.pre || '', suffix: n.dataset.suf || '', duration: 0.9, from: 0 }));
}

function renderAll() { if (!root) return; renderNow(); renderTimeline(); renderCards(); renderPerf(); lastSig = sig(); }

/* ---------- 卡片動作 ---------- */
function newId() { return 'p-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function onToggle(id, on) {
  const p = getPromos().find(x => x.id === id); if (!p) return;
  p.on = on; upsertPromo(p);
  const st = promoStatus(p);
  if (!on) toast(`已關閉：${p.name}`, st === 'off' && +D(p.from) <= Date.now() && endOf(p.to) >= Date.now() ? '已立即恢復原價' : '時間到也不會變價');
  else if (st === 'live') toast(`已開啟：${p.name} 現在生效`, `${md(p.to)} 結束後自動恢復原價`);
  else if (st === 'scheduled') toast(`已排程：${p.name} ${range(p)} 自動生效`);
  else toast(`已開啟：${p.name}`, '這檔已結束，不會再變價');
}
function onCopy(id) {
  const p = getPromos().find(x => x.id === id); if (!p) return;
  const c = { ...p, id: newId(), from: addYear(p.from), to: addYear(p.to), on: true, items: { ...(p.items || {}) } };
  upsertPromo(c);
  toast(`已複製到明年：${c.name}`, `${D(c.from).getFullYear()}/${range(c)} 自動生效，可再編輯折扣`);
}
function onDelete(id, btn) {
  if (!armed.has(id)) {
    armed.set(id, setTimeout(() => { armed.delete(id); if (btn.isConnected) { btn.classList.remove('armed'); btn.textContent = '刪除'; } }, 3500));
    btn.classList.add('armed'); btn.textContent = '確定刪除？';
    return;
  }
  clearTimeout(armed.get(id)); armed.delete(id);
  const p = getPromos().find(x => x.id === id);
  const card = btn.closest('.pm-card');
  const done = () => { removePromo(id); toast(`已刪除：${p ? p.name : ''}`, p && promoStatus(p) === 'live' ? '已立即恢復原價' : '', { kind: 'warn' }); };
  if (card) { card.style.transition = 'opacity .2s, transform .2s'; card.style.opacity = '0'; card.style.transform = 'scale(.96)'; card.style.pointerEvents = 'none'; }
  setTimeout(done, card ? 200 : 0);
}

/* ---------- 編輯器 ---------- */
function openEditor(id, festId) {
  const exist = id ? getPromos().find(x => x.id === id) : null;
  if (exist) ed = { ...exist, items: { ...(exist.items || {}) }, isNew: false };
  else {
    const f = festId && festId !== 'custom' ? festivalWindows().find(x => x.id === festId) : null;
    const t = new Date(); const a = ymd(new Date(t.getFullYear(), t.getMonth(), t.getDate() + 7)), b = ymd(new Date(t.getFullYear(), t.getMonth(), t.getDate() + 13));
    ed = { id: newId(), isNew: true, festival: f ? f.id : 'custom', name: f ? f.name : '', badge: f ? f.badge : '', from: f ? f.from : a, to: f ? f.to : b, on: true, scope: 'all', pct: 0.9, items: {} };
  }
  ed.sel = new Set(Object.keys(ed.items));
  ed.custom = ed.scope === 'all' && ed.pct && !QUICK.some(q => Math.abs(q[0] - ed.pct) < 1e-6);
  ed.preview = Object.keys(ed.items)[0] || [...PRODUCTS].sort((x, y) => (y.pop || 0) - (x.pop || 0))[0]?.id;
  closeEditor(true);
  modal = el(`<div class="pm-modal" role="dialog" aria-modal="true" aria-label="${ed.isNew ? '新增特價檔期' : '編輯特價檔期'}">
    <div class="pm-dlg">
      <div class="pm-dlg-h">
        <div><small>${ed.isNew ? '新增' : '編輯'}・時間到自動變價、結束自動恢復原價</small><h3>${icon('percent', 18)} ${ed.isNew ? '新增特價檔期' : `編輯「${esc(ed.name)}」`}</h3></div>
        <button class="icon-btn" data-x aria-label="關閉">${icon('x', 18)}</button>
      </div>
      <div class="pm-dlg-b">
        <div class="pm-form">
          <section class="pm-step">
            <h4><i>1</i> 選節日<small>自動帶入名稱、標籤與日期（示範日期，可再改）</small></h4>
            <div class="pm-tpls" id="pmTpls"></div>
            <div class="pm-fields">
              <label class="pm-f"><span>檔期名稱</span><input id="pmName" maxlength="20" value="${esc(ed.name)}" placeholder="例如：週年慶"></label>
              <label class="pm-f"><span>商品上的標籤文字</span><input id="pmBadge" maxlength="10" value="${esc(ed.badge)}" placeholder="例如：限時特價"></label>
              <label class="pm-f"><span>開始日（00:00 生效）</span><input type="date" id="pmFrom" value="${ed.from}"></label>
              <label class="pm-f"><span>結束日（23:59 恢復原價）</span><input type="date" id="pmTo" value="${ed.to}"></label>
            </div>
            <div id="pmOverlap"></div>
          </section>
          <section class="pm-step">
            <h4><i>2</i> 怎麼打折<small>多檔重疊時，每項商品自動取最低價</small></h4>
            <div class="pm-scope" role="tablist">
              <button class="seg" data-scope="all" role="tab">全店折扣<small>所有商品一起打折</small></button>
              <button class="seg" data-scope="items" role="tab">指定商品<small>逐項設定特價</small></button>
            </div>
            <div id="pmScopeBody"></div>
          </section>
        </div>
        <aside class="pm-side">
          <h4>銷售網頁預覽</h4>
          <div id="pmPreview"></div>
          <div class="pm-sum" id="pmSum"></div>
        </aside>
      </div>
      <div class="pm-dlg-f">
        <div class="pm-msg" id="pmMsg"></div>
        <div class="pm-dlg-act">
          <label class="pm-sw"><input type="checkbox" id="pmOn" ${ed.on ? 'checked' : ''}><span class="pm-sw-k"></span><span class="pm-sw-t">開啟</span></label>
          <button class="btn btn-ghost" data-x>取消</button>
          <button class="btn btn-primary" id="pmSave">${icon('check', 16)} 儲存並排程</button>
        </div>
      </div>
    </div>
  </div>`);
  document.body.appendChild(modal);
  renderTpls(); renderScope(); refreshEditor();
  bindEditor();
  if (gsap) { gsap.fromTo(modal, { opacity: 0 }, { opacity: 1, duration: 0.2 }); gsap.fromTo($('.pm-dlg', modal), { y: 24, scale: 0.98 }, { y: 0, scale: 1, duration: 0.35, ease: 'power3.out' }); }
  setTimeout(() => { try { (ed.isNew && !festId ? $('[data-tpl]', modal) : $('#pmName', modal))?.focus({ preventScroll: true }); } catch { /* ignore */ } }, 50);
}
function closeEditor(instant) {
  if (!modal) return;
  const m = modal; modal = null;
  m.style.pointerEvents = 'none';
  if (instant || !gsap) { m.remove(); return; }
  gsap.to(m, { opacity: 0, duration: 0.18 });
  setTimeout(() => m.remove(), 200);
}
function renderTpls() {
  $('#pmTpls', modal).innerHTML = festivalWindows().map(f => `<button class="pm-tpl${ed.festival === f.id ? ' on' : ''}" data-tpl="${f.id}"><b>${esc(f.name)}</b><small>${range(f)}</small></button>`).join('')
    + `<button class="pm-tpl${ed.festival === 'custom' || !FESTIVAL_MAP[ed.festival] ? ' on' : ''}" data-tpl="custom"><b>自訂</b><small>自己填日期</small></button>`;
}
function rowHtml(pr, editable) {
  const sale = saleOf(ed, pr);
  const v = editable ? (ed.items[pr.id] ?? '') : (sale ?? '');
  return `<div class="pm-row${editable && ed.sel.has(pr.id) ? ' sel' : ''}${ed.preview === pr.id ? ' pv' : ''}" data-pid="${esc(pr.id)}">
    ${editable ? `<label class="pm-ck"><input type="checkbox" data-sel="${esc(pr.id)}" ${ed.sel.has(pr.id) ? 'checked' : ''} aria-label="選取 ${esc(pr.name)}"></label>` : '<span class="pm-ck"></span>'}
    <span class="pm-r-name">${thumb(pr, 34)}<span><b>${esc(pr.name)}</b><small>${esc(pr.unit || '')}</small></span></span>
    <span class="pm-r-num pm-r-list" data-l="原價"><s>${money(pr.listPrice)}</s></span>
    <span class="pm-r-num pm-r-cost" data-l="成本">${money(costOf(pr))}</span>
    <span class="pm-r-in" data-l="特價">${editable ? `<input type="number" inputmode="numeric" min="1" step="1" data-price="${esc(pr.id)}" value="${esc(v)}" placeholder="不參加">` : `<b>${sale != null ? money(sale) : '—'}</b>`}</span>
    <span class="pm-r-num pm-r-off" data-l="折扣" data-off></span>
    <span class="pm-r-num pm-r-mg" data-l="毛利" data-mg></span>
  </div>`;
}
function renderScope() {
  $$('[data-scope]', modal).forEach(b => { const on = b.dataset.scope === ed.scope; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
  const head = `<div class="pm-rows-h"><span></span><span>商品</span><span>原價</span><span>成本</span><span>特價</span><span>折扣</span><span>毛利</span></div>`;
  let html;
  if (ed.scope === 'all') {
    html = `<div class="pm-quick">${QUICK.map(([v, t]) => `<button class="pm-q${!ed.custom && Math.abs((ed.pct || 0) - v) < 1e-6 ? ' on' : ''}" data-pct="${v}">${t}</button>`).join('')}
        <label class="pm-q pm-q-custom${ed.custom ? ' on' : ''}"><span>自訂</span><input type="number" id="pmPctIn" min="50" max="99" step="1" inputmode="numeric" placeholder="例 87" value="${ed.custom ? Math.round(ed.pct * 100) : ''}"><span>折</span></label></div>
      <p class="pm-hint">全店所有商品 × ${ed.pct ? ed.pct.toFixed(2) : '—'}，價格自動取整（百元以上取到十位）。下面是每項商品的特價：</p>
      <div class="pm-rows ro">${head}${PRODUCTS.map(pr => rowHtml(pr, false)).join('')}</div>`;
  } else {
    html = `<div class="pm-tools">
        <button class="btn btn-ghost btn-sm" data-selall>${ed.sel.size === PRODUCTS.length ? '取消全選' : '全選'}</button>
        <button class="btn btn-ghost btn-sm" data-nine>選取的商品一鍵 9 折</button>
        <button class="btn btn-ghost btn-sm" data-clear>清除選取的特價</button>
        <button class="btn btn-sm pm-ai" data-ai>${icon('sparkle', 14)} AI 建議 <em>示範</em></button>
      </div>
      <p class="pm-hint">填了特價的商品才會參加；空白＝原價不變。特價不能低於或等於成本。</p>
      <div class="pm-rows">${head}${PRODUCTS.map(pr => rowHtml(pr, true)).join('')}</div>`;
  }
  $('#pmScopeBody', modal).innerHTML = html;
}
function readFields() {
  ed.name = $('#pmName', modal).value.trim();
  ed.badge = $('#pmBadge', modal).value.trim();
  ed.from = $('#pmFrom', modal).value;
  ed.to = $('#pmTo', modal).value;
  ed.on = $('#pmOn', modal).checked;
}
function validate() {
  const err = [], warn = [];
  if (!ed.name) err.push('請填檔期名稱');
  if (!ed.badge) err.push('請填商品上的標籤文字');
  if (!ed.from || !ed.to) err.push('請選開始與結束日期');
  else if (ed.from > ed.to) err.push('結束日不能早於開始日');
  const s = stats(ed);
  if (ed.scope === 'all' && !(ed.pct >= 0.5 && ed.pct < 1)) err.push('全店折數請設定在 50～99 折之間');
  if (ed.scope === 'items' && !s.eff.length) err.push('請至少替一項商品填入低於原價的特價');
  if (s.below.length) err.push(`有 ${s.below.length} 項特價低於或等於成本，會賠錢，不能儲存：${s.below.slice(0, 3).map(r => `「${r.pr.name}」${money(r.sale)}（成本 ${money(r.cost)}）`).join('、')}${s.below.length > 3 ? '…' : ''}`);
  if (s.thin.length) warn.push(`${s.thin.length} 項毛利低於 15%：${s.thin.slice(0, 3).map(r => `「${r.pr.name}」${pctTxt(r.margin)}`).join('、')}${s.thin.length > 3 ? '…' : ''}，確認一下是否刻意`);
  if (ed.scope === 'items') { const same = s.rows.filter(r => r.sale >= r.list); if (same.length) warn.push(`${same.length} 項特價不低於原價，這些商品不會變價`); }
  if (ed.to && endOf(ed.to) < Date.now()) warn.push('結束日已經過了，這檔不會生效');
  if (!ed.on) warn.push('目前設定為「關閉」，儲存後時間到也不會變價');
  return { err, warn, s };
}
function refreshEditor() {
  if (!modal) return;
  const { err, warn, s } = validate();
  // 每列折扣與毛利
  $$('.pm-row', modal).forEach(row => {
    const pr = prodOf(row.dataset.pid); if (!pr) return;
    const sale = saleOf(ed, pr), cost = costOf(pr);
    const off = $('[data-off]', row), mg = $('[data-mg]', row);
    row.classList.toggle('bad', sale != null && sale <= cost);
    row.classList.toggle('thin', sale != null && sale > cost && (sale - cost) / sale < 0.15 && sale < pr.listPrice);
    row.classList.toggle('pv', ed.preview === pr.id);
    if (sale == null) { off.textContent = '—'; mg.textContent = pctTxt((pr.listPrice - cost) / pr.listPrice); mg.className = 'pm-r-num pm-r-mg dim'; return; }
    off.textContent = sale < pr.listPrice ? `−${pctTxt(1 - sale / pr.listPrice)}` : '不變價';
    const m = sale > 0 ? (sale - cost) / sale : -1;
    mg.textContent = sale <= cost ? '賠錢' : pctTxt(m);
    mg.className = `pm-r-num pm-r-mg ${sale <= cost ? 'bad' : m < 0.15 ? 'warn' : 'ok'}`;
  });
  // 重疊
  const ov = ed.from && ed.to && ed.on ? overlapWith(ed) : [];
  $('#pmOverlap', modal).innerHTML = ov.length ? `<div class="pm-ov">${icon('alert', 14)}<span>和 ${ov.map(o => `「${esc(o.name)}」（${rangeY(o)}）`).join('、')} 日期重疊：重疊時自動取最低價，客人一定拿到最便宜的價格。</span></div>` : '';
  // 預覽
  renderPreview();
  // 摘要
  const days = ed.from && ed.to && ed.from <= ed.to ? nDays(ed) : 0;
  $('#pmSum', modal).innerHTML = `<div class="pm-sum-row"><span>參加商品</span><b>${ed.scope === 'all' ? `全店 ${PRODUCTS.length} 項` : `${s.eff.length} 項`}</b></div>
    <div class="pm-sum-row"><span>平均折扣</span><b>${s.eff.length ? `${pctTxt(s.avgOff)} off` : '—'}</b></div>
    <div class="pm-sum-row"><span>預估毛利率</span><b class="${s.eff.length && s.margin < 0.15 ? 'warn' : ''}">${s.eff.length ? `${pctTxt(s.margin)}（原 ${pctTxt(s.base)}）` : '—'}</b></div>
    <div class="pm-sum-row"><span>檔期</span><b>${days ? `${rangeY(ed)}・${days} 天` : '—'}</b></div>`;
  // 訊息與儲存鈕
  $('#pmMsg', modal).innerHTML = err.map(t => `<p class="err">${icon('alert', 13)} ${esc(t)}</p>`).join('') + warn.map(t => `<p class="warn">${icon('alert', 13)} ${esc(t)}</p>`).join('')
    + (!err.length && !warn.length ? `<p class="ok">${icon('check', 13)} 可以儲存：${ed.from ? md(ed.from) : ''} 00:00 自動變價，${ed.to ? md(ed.to) : ''} 23:59 自動恢復原價</p>` : '');
  const save = $('#pmSave', modal);
  save.disabled = !!err.length;
  const st = ed.on && ed.from && ed.to ? promoStatus({ on: true, from: ed.from, to: ed.to }) : 'off';
  save.innerHTML = `${icon('check', 16)} ${!ed.on ? '儲存（關閉中）' : st === 'live' ? '儲存並立即生效' : '儲存並排程'}`;
}
function renderPreview() {
  const pr = prodOf(ed.preview) || PRODUCTS[0];
  if (!pr) { $('#pmPreview', modal).innerHTML = ''; return; }
  const sale = saleOf(ed, pr);
  const on = sale != null && sale < pr.listPrice && sale > 0;
  $('#pmPreview', modal).innerHTML = `<div class="pm-pv">
      <div class="pm-pv-art" style="--pc:${pr.color || '#2DB674'}">${art(pr.id, 150)}${on ? `<span class="pm-pv-rib">${esc(ed.badge || '特價')}</span><span class="pm-pv-off">−${pctTxt(1 - sale / pr.listPrice)}</span>` : ''}</div>
      <div class="pm-pv-b">
        <b class="pm-pv-n">${esc(pr.name)}</b><small>${esc(pr.unit || '')}</small>
        <div class="pm-pv-p">${on ? `<s>${money(pr.listPrice)}</s><em>${money(sale)}</em>` : `<em class="plain">${money(pr.listPrice)}</em>`}</div>
        <span class="pm-pv-t">${on ? `${ed.to ? `活動至 ${md(ed.to)}，之後自動恢復原價` : ''}` : '這項商品不參加，維持原價'}</span>
        <span class="pm-pv-btn">加入購物車</span>
      </div>
    </div>
    <p class="pm-pv-note">${ed.scope === 'items' ? '點表格中的商品可切換預覽' : '點表格中的商品可切換預覽'}・LINE、POS 顯示同一個價格</p>`;
}
// AI 建議（示範）：熱門 × 高毛利的商品折扣較深；任何特價都不低於成本 + 10%
function aiSuggest() {
  const ps = PRODUCTS.map(pr => ({ pr, cost: costOf(pr), m: (pr.listPrice - costOf(pr)) / pr.listPrice, pop: pr.pop || 1 }));
  const maxM = Math.max(...ps.map(x => x.m)), minM = Math.min(...ps.map(x => x.m));
  const maxP = Math.max(...ps.map(x => x.pop)), minP = Math.min(...ps.map(x => x.pop));
  const nrm = (v, a, b) => (b - a < 1e-9 ? 0.5 : (v - a) / (b - a));
  ps.forEach(x => { x.score = nrm(x.m, minM, maxM) * 0.55 + nrm(x.pop, minP, maxP) * 0.45; });
  ps.sort((a, b) => b.score - a.score);
  const take = Math.max(1, Math.ceil(ps.length * 0.6));
  ed.items = {}; ed.sel = new Set();
  let n = 0;
  ps.slice(0, take).forEach(x => {
    const disc = 0.05 + 0.13 * x.score; // 5%～18%
    const floor = x.cost * 1.1;
    let sale = roundPrice(x.pr.listPrice * (1 - disc));
    if (sale < floor) sale = x.pr.listPrice >= 100 ? Math.ceil(floor / 10) * 10 : Math.ceil(floor);
    if (sale >= x.pr.listPrice) return;
    ed.items[x.pr.id] = sale; ed.sel.add(x.pr.id); n += 1;
  });
  ed.preview = ps[0]?.pr.id || ed.preview;
  renderScope(); refreshEditor();
  toast(`AI 建議（示範）：${n} 項商品`, '熱門又高毛利的折扣較深（最多約 18%），每項都保留成本 + 10% 以上，可再自行微調');
}
function applyTpl(id) {
  readFields();
  ed.festival = id;
  if (id !== 'custom') {
    const f = festivalWindows().find(x => x.id === id);
    if (f) { ed.name = f.name; ed.badge = f.badge; ed.from = f.from; ed.to = f.to; }
    $('#pmName', modal).value = ed.name; $('#pmBadge', modal).value = ed.badge; $('#pmFrom', modal).value = ed.from; $('#pmTo', modal).value = ed.to;
  } else { $('#pmName', modal).focus(); }
  renderTpls(); refreshEditor();
}
function bindEditor() {
  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.closest('[data-x]')) { closeEditor(); return; }
    const t = e.target.closest('[data-tpl]'); if (t) { applyTpl(t.dataset.tpl); return; }
    const sc = e.target.closest('[data-scope]');
    if (sc) {
      readFields();
      ed.scope = sc.dataset.scope;
      if (ed.scope === 'all' && !ed.pct) ed.pct = 0.9;
      renderScope(); refreshEditor(); return;
    }
    const q = e.target.closest('[data-pct]'); if (q) { ed.pct = +q.dataset.pct; ed.custom = false; renderScope(); refreshEditor(); return; }
    if (e.target.closest('[data-selall]')) { ed.sel = ed.sel.size === PRODUCTS.length ? new Set() : new Set(PRODUCTS.map(p => p.id)); renderScope(); refreshEditor(); return; }
    if (e.target.closest('[data-nine]')) {
      if (!ed.sel.size) { toast('請先勾選商品', '在表格左側勾選要打 9 折的商品', { kind: 'warn' }); return; }
      let skip = 0;
      ed.sel.forEach(pid => { const pr = prodOf(pid); if (!pr) return; const v = roundPrice(pr.listPrice * 0.9); if (v <= costOf(pr)) skip += 1; ed.items[pid] = v; });
      ed.preview = [...ed.sel][0];
      renderScope(); refreshEditor();
      toast(`已將 ${ed.sel.size} 項商品設為 9 折`, skip ? `其中 ${skip} 項 9 折會低於成本，請調整` : '價格已自動取整，可再逐項微調', skip ? { kind: 'warn' } : {});
      return;
    }
    if (e.target.closest('[data-clear]')) {
      const tgt = ed.sel.size ? [...ed.sel] : Object.keys(ed.items);
      tgt.forEach(pid => delete ed.items[pid]);
      renderScope(); refreshEditor(); return;
    }
    if (e.target.closest('[data-ai]')) { aiSuggest(); return; }
    if (e.target.closest('#pmSave')) { save(); return; }
    const row = e.target.closest('.pm-row');
    if (row && ed.preview !== row.dataset.pid) { ed.preview = row.dataset.pid; refreshEditor(); }
  });
  modal.addEventListener('input', (e) => {
    const t = e.target;
    if (t.matches('[data-price]')) {
      const pid = t.dataset.price;
      if (t.value === '' || isNaN(+t.value)) delete ed.items[pid]; else { ed.items[pid] = Math.max(0, Math.round(+t.value)); ed.sel.add(pid); }
      const ck = $(`[data-sel="${CSS.escape(pid)}"]`, modal); if (ck) ck.checked = ed.sel.has(pid);
      t.closest('.pm-row')?.classList.toggle('sel', ed.sel.has(pid));
      ed.preview = pid; refreshEditor(); return;
    }
    if (t.id === 'pmPctIn') {
      const n = +t.value;
      ed.custom = true;
      ed.pct = !t.value ? 0 : n < 10 ? n / 10 : n / 100;
      $$('.pm-q', modal).forEach(b => b.classList.toggle('on', b.classList.contains('pm-q-custom')));
      const h = $('.pm-hint', modal); if (h) h.textContent = `全店所有商品 × ${ed.pct ? ed.pct.toFixed(2) : '—'}，價格自動取整（百元以上取到十位）。下面是每項商品的特價：`;
      $$('.pm-row', modal).forEach(row => { const pr = prodOf(row.dataset.pid); const s = pr ? saleOf(ed, pr) : null; const b = $('.pm-r-in b', row); if (b) b.textContent = s != null && ed.pct ? money(s) : '—'; });
      refreshEditor(); return;
    }
    if (['pmName', 'pmBadge', 'pmFrom', 'pmTo'].includes(t.id)) {
      readFields();
      refreshEditor(); return;
    }
  });
  modal.addEventListener('change', (e) => {
    const t = e.target;
    if (t.matches('[data-sel]')) { const pid = t.dataset.sel; if (t.checked) ed.sel.add(pid); else ed.sel.delete(pid); t.closest('.pm-row')?.classList.toggle('sel', t.checked); const b = $('[data-selall]', modal); if (b) b.textContent = ed.sel.size === PRODUCTS.length ? '取消全選' : '全選'; return; }
    if (t.id === 'pmOn') { readFields(); refreshEditor(); return; }
    if (t.id === 'pmFrom' || t.id === 'pmTo') { readFields(); refreshEditor(); }
  });
}
function save() {
  readFields();
  const { err } = validate();
  if (err.length) {
    toast('還不能儲存', err[0], { kind: 'warn' });
    const m = $('#pmMsg', modal); if (m && gsap) gsap.fromTo(m, { x: -6 }, { x: 0, duration: 0.4, ease: 'elastic.out(1, 0.3)' });
    return;
  }
  const items = {};
  if (ed.scope === 'items') for (const [pid, v] of Object.entries(ed.items)) { const pr = prodOf(pid); if (pr && v !== '' && v != null && +v < pr.listPrice) items[pid] = +v; }
  const p = { id: ed.id, festival: FESTIVAL_MAP[ed.festival] ? ed.festival : 'custom', name: ed.name, badge: ed.badge, from: ed.from, to: ed.to, on: ed.on, scope: ed.scope, ...(ed.scope === 'all' ? { pct: Math.round(ed.pct * 100) / 100, items: {} } : { items }) };
  const isNew = ed.isNew;
  upsertPromo(p);
  closeEditor();
  const st = promoStatus(p);
  if (st === 'live') toast(`已生效：${p.name} 現在起特價`, `${range(p)}・${md(p.to)} 23:59 自動恢復原價，所有通路已同步`);
  else if (st === 'scheduled') toast(`已排程：${p.name} ${range(p)} 自動生效`, `${scopeTxt(p)}・時間到自動變價、結束自動恢復原價`);
  else if (st === 'off') toast(`已儲存：${p.name}（關閉中）`, '打開開關後才會自動變價');
  else toast(`已儲存：${p.name}`, '這檔日期已過，不會變價');
  if (!isNew) return;
  setTimeout(() => { const c = root && $(`.pm-card[data-id="${CSS.escape(p.id)}"]`, root); if (c) { c.classList.add('flash'); c.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } }, 80);
}

/* ---------- 計時 ---------- */
function tick() {
  if (!visible || !root) return;
  if (sig() !== lastSig) { renderAll(); return; }
  $$('[data-cd]', root).forEach(n => { n.textContent = fmtLeft(+n.dataset.cd - Date.now()); });
}

export default {
  mount(section, { go } = {}) {
    root = section;
    section.innerHTML = layout();
    renderAll();
    section.addEventListener('click', (e) => {
      if (e.target.closest('[data-new]')) { openEditor(null); return; }
      const f = e.target.closest('[data-fest]'); if (f) { openEditor(null, f.dataset.fest); return; }
      const ed2 = e.target.closest('[data-edit]'); if (ed2) { openEditor(ed2.dataset.edit); return; }
      const c = e.target.closest('[data-copy]'); if (c) { onCopy(c.dataset.copy); return; }
      const d = e.target.closest('[data-del]'); if (d) { onDelete(d.dataset.del, d); return; }
    });
    section.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.pm-now-tile[data-edit]')) { e.preventDefault(); openEditor(e.target.dataset.edit); } });
    section.addEventListener('change', (e) => { const t = e.target.closest('[data-toggle]'); if (t) onToggle(t.dataset.toggle, t.checked); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal) closeEditor(); });
    onPromos(() => { if (root) renderAll(); });
    const re = () => { if (root) { renderCards(); renderPerf(); } };
    store.on('order', re); store.on('order-updated', re); store.on('reset', re);
    void go;
  },
  show() {
    visible = true;
    renderAll();
    clearInterval(timer); timer = setInterval(tick, 1000);
  },
  hide() { visible = false; clearInterval(timer); timer = 0; closeEditor(true); },
};
