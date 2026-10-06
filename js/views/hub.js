// 整合與協作：通路／金流串接中心、會計師協作、多國稅制設定、資安與權限（全部為示範，非真實串接）
import * as THREE from 'three';
import { store } from '../state.js';
import { $, $$, el, gsap, esc, money, countUp, fmtTime, pad, sleep, toast } from '../util.js';
import { icon } from '../icons.js';
import { makeChart } from '../charts.js';
import { mulberry32, startOfDay, addDays } from '../data.js';
import { STAFF } from '../ledger.js';
import { CATS, CAT_MAP, SERVICES, EVENT_TPL, REVIEW_QUEUE, CLIENTS, PLAN_PRICE, REFERRAL_RATE, COUNTRIES, PERMS, fxSeries, ANCHOR_NOTE, DEMO_ITEM } from '../hub-data.js';
import { TENANT } from '../tenant.js';
const OWN = STAFF[0].name; // 負責人
const EMPS = STAFF.filter(x => x.kind !== 'owner');

// 模組內自用的 inline SVG 圖示
const SV = (d, s = 16) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const I = {
  eye: (s) => SV('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', s),
  download: (s) => SV('<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>', s),
  key: (s) => SV('<circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3 20 3M16 7l3 3M14 9l2 2"/>', s),
  pause: (s) => SV('<path d="M8 5v14M16 5v14"/>', s),
  flag: (s) => SV('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>', s),
  undo: (s) => SV('<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>', s),
  mail: (s) => SV('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>', s),
  fp: (s) => SV('<path d="M12 11v3a8 8 0 0 1-1.5 4.7M8.5 7.3A5 5 0 0 1 17 11v2M6 10a6 6 0 0 1 .4-2M7 15a12 12 0 0 0 .5-4 4.5 4.5 0 0 1 9 0v1.5M16.5 17a14 14 0 0 1-1 3"/>', s),
};

const FONT = '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", "Noto Sans CJK TC", sans-serif';
let root, shown = false, tab = 'int';
const rng = mulberry32(20261005);
const svc = SERVICES.map(s => ({ ...s, paused: false, count: 0, last: null }));
const SVC = Object.fromEntries(svc.map(s => [s.id, s]));
let net = null, evTimer = 0, evPaused = false, apiCalls = 0, filter = 'all';
const charts = {};
let country = 'tw';
const review = REVIEW_QUEUE.map(r => ({ ...r, state: 'pending', note: '' }));
const MONTH_TOTAL = 312;
const collaborators = [
  { name: '林雅婷 記帳士', org: '林記帳士事務所', email: 'yating@lin-bookkeeping.example', role: 'review', perms: ['view', 'review', 'download'], status: '已加入' },
  { name: '陳志明 會計師', org: '明誠聯合會計師事務所（示範）', email: 'cpa.chen@mingcheng.example', role: 'view', perms: ['view'], status: '已加入' },
];
const audit = [];

// ---------- 今日同步筆數（依 store 今日訂單推算） ----------
function todayOrders() { const t = startOfDay(new Date()); return store.ordersBetween(t, addDays(t, 1)); }
function computeCounts() {
  const list = todayOrders();
  const r = mulberry32(99);
  const by = (fn) => list.filter(fn).length;
  for (const s of svc) {
    const seed = Math.floor(r() * 9) + 3;
    if (!s.on) { s.count = 0; continue; }
    let n = 0;
    if (s.ch) n = by(o => o.channel === s.ch) * 3 + seed;
    else if (s.pay === 'online') n = by(o => o.channel !== 'pos') + seed;
    else if (s.pay === 'card') n = by(o => o.payment === '信用卡' || o.payment === 'Apple Pay');
    else if (s.pay) n = by(o => o.payment === s.pay);
    else if (s.inv) n = list.length + (s.id === 'einv' ? seed : 0);
    else if (s.ship) n = by(o => o.channel !== 'pos') * 2;
    else if (s.id === 'esun') n = by(o => o.payment === '銀行轉帳') + seed;
    else n = seed;
    s.count = Math.max(s.count, n);
  }
}

// ---------- 掛載 ----------
export default {
  mount(section) {
    root = section;
    computeCounts();
    seedAudit();
    section.innerHTML = `
    <div class="hub-wrap">
      <div class="glass hub-head anim-in">
        <div class="hub-head-l">
          <span class="demo-badge">${icon('alert', 14)} 示範設定・非真實串接</span>
          <h2>一個 AI 核心，串起所有<span class="grad-txt">通路、金流、會計師與國家</span></h2>
          <p>訂單從各通路進來，付款、發票、物流、對帳自動接力；會計師同平台線上審核，跨國稅制一鍵切換。</p>
        </div>
        <div class="hub-tabs" role="tablist">
          ${[['int', 'link', '整合中心', '通路・金流・物流'], ['acct', 'users', '會計師協作', '審核・申報・分潤'], ['geo', 'globe', '多國設定', '幣別・稅制・發票']].map(([k, ic, t, s]) => `
          <button class="hub-tab ${k === tab ? 'on' : ''}" data-t="${k}" role="tab">${icon(ic, 18)}<span><b>${t}</b><small>${s}</small></span></button>`).join('')}
        </div>
      </div>
      <div class="hub-pane" data-t="int">${intHTML()}</div>
      <div class="hub-pane" data-t="acct" hidden>${acctHTML()}</div>
      <div class="hub-pane" data-t="geo" hidden>${geoHTML()}</div>
      ${secHTML()}
      <div class="hub-modal" id="hubModal" hidden></div>
    </div>`;
    bindInt(); bindAcct(); bindGeo(); bindSec();
    $$('.hub-tab', section).forEach(b => b.addEventListener('click', () => setTab(b.dataset.t)));
    store.on('order', ({ order }) => onOrder(order));
    store.on('reset', () => { computeCounts(); renderCards(); });
  },
  show() {
    shown = true;
    computeCounts(); renderCards(false);
    activateTab(tab, false);
  },
  hide() {
    shown = false;
    stopInt();
  },
};

function setTab(t) {
  if (t === tab) return;
  $$('.hub-tab', root).forEach(b => b.classList.toggle('on', b.dataset.t === t));
  tab = t;
  activateTab(t, true);
}
function activateTab(t, anim) {
  $$('.hub-pane', root).forEach(p => { p.hidden = p.dataset.t !== t; });
  const pane = $(`.hub-pane[data-t="${t}"]`, root);
  if (anim) gsap.fromTo(pane.children, { opacity: 0, y: 18 }, { opacity: 1, y: 0, stagger: 0.06, duration: 0.5, ease: 'power3.out', clearProps: 'transform' });
  if (t === 'int') startInt(); else stopInt();
  if (t === 'acct') showAcct();
  if (t === 'geo') showGeo();
  requestAnimationFrame(() => Object.values(charts).forEach(c => c && c.resize()));
}

// ====================================================================
// A. 整合中心
// ====================================================================
function intHTML() {
  return `
  <div class="hub-int-top">
    <div class="glass hub-net-card anim-in">
      <div class="card-h"><h3>${icon('cpu', 18)} 即時資料流</h3><span class="chip-sm"><i class="hub-live"></i>GreenUP AI 核心・示範</span></div>
      <div class="hub-net" id="hubNet"><div class="hub-net-labels" id="hubNetLabels"></div>
        <div class="hub-net-legend">${CATS.map(c => `<span style="--c:${c.color}"><i></i>${c.name}</span>`).join('')}</div>
      </div>
    </div>
    <div class="hub-int-side">
      <div class="hub-kpis anim-in">
        <div class="glass kpi" style="--c:var(--leaf)"><div class="kpi-top"><span class="kpi-ic">${icon('link', 16)}</span><span class="kpi-label">已連線服務</span></div><div class="kpi-val"><span id="hkOn">0</span><small> / ${svc.length}</small></div></div>
        <div class="glass kpi" style="--c:var(--sky)"><div class="kpi-top"><span class="kpi-ic">${icon('refresh', 16)}</span><span class="kpi-label">今日同步筆數</span></div><div class="kpi-val" id="hkSync">0</div></div>
        <div class="glass kpi" style="--c:var(--amber)"><div class="kpi-top"><span class="kpi-ic">${icon('cpu', 16)}</span><span class="kpi-label">API 呼叫數</span></div><div class="kpi-val" id="hkApi">0</div></div>
        <div class="glass kpi" style="--c:var(--violet)"><div class="kpi-top"><span class="kpi-ic">${icon('shield', 16)}</span><span class="kpi-label">Webhook 成功率</span></div><div class="kpi-val">99.8<small>%</small></div></div>
      </div>
      <div class="glass card hub-ev-card anim-in">
        <div class="card-h"><h3>${icon('external', 16)} API 與 Webhook 事件流</h3>
          <button class="btn btn-ghost btn-sm" id="hubEvPause">${I.pause(14)}<span>暫停</span></button></div>
        <div class="hub-ev-list mono" id="hubEv"></div>
      </div>
    </div>
  </div>
  <div class="glass card hub-svc-card anim-in">
    <div class="card-h hub-svc-h">
      <h3>${icon('store', 18)} 服務串接</h3>
      <div class="hub-filters" id="hubFilters"></div>
    </div>
    <p class="hub-fine">${icon('alert', 13)} 以下服務名稱僅用於示意可串接的類型，卡片為示範介面，不代表與各公司有合作關係，也不會實際連線。</p>
    <div class="hub-svc-grid" id="hubSvc"></div>
  </div>`;
}

function bindInt() {
  renderFilters();
  renderCards(false);
  const list = $('#hubEv', root);
  for (let i = 0; i < 9; i++) pushEvent(null, false, Date.now() - (9 - i) * 2300);
  list.scrollTop = 0;
  $('#hubEvPause', root).addEventListener('click', (e) => {
    evPaused = !evPaused;
    e.currentTarget.querySelector('span').textContent = evPaused ? '繼續' : '暫停';
    e.currentTarget.classList.toggle('on', evPaused);
  });
  $('#hubSvc', root).addEventListener('click', onCardClick);
  $('#hubSvc', root).addEventListener('change', onCardToggle);
}

function renderFilters() {
  const n = (c) => c === 'all' ? svc.length : svc.filter(s => s.cat === c).length;
  $('#hubFilters', root).innerHTML = [{ id: 'all', name: '全部', color: '#eafff4' }, ...CATS].map(c =>
    `<button class="hub-fchip ${filter === c.id ? 'on' : ''}" data-f="${c.id}" style="--c:${c.color}">${c.name}<em>${n(c.id)}</em></button>`).join('');
  $$('.hub-fchip', root).forEach(b => b.addEventListener('click', () => {
    filter = b.dataset.f;
    $$('.hub-fchip', root).forEach(x => x.classList.toggle('on', x === b));
    $$('.hub-svc', root).forEach(c => {
      const show = filter === 'all' || c.dataset.cat === filter;
      c.hidden = !show;
    });
    gsap.fromTo($$('.hub-svc:not([hidden])', root), { opacity: 0, y: 14, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.025, ease: 'power3.out', clearProps: 'transform' });
  }));
}

function cardHTML(s) {
  const c = CAT_MAP[s.cat];
  const st = !s.on ? ['off', '未連線'] : s.paused ? ['pause', '已暫停'] : ['on', '已連線'];
  return `<div class="hub-svc glass" data-id="${s.id}" data-cat="${s.cat}" style="--c:${c.color}" ${filter !== 'all' && filter !== s.cat ? 'hidden' : ''}>
    <div class="hub-svc-top">
      <span class="hub-ab ${s.ab.length > 2 ? 'sm' : ''}">${esc(s.ab)}</span>
      <div class="hub-svc-name"><b title="${esc(s.name)}">${esc(s.name)}</b><small>${c.name}</small></div>
      <span class="hub-demo">示範</span>
    </div>
    <p class="hub-svc-desc">${esc(s.desc)}</p>
    <div class="hub-svc-stat">
      <span class="hub-status ${st[0]}"><i></i>${st[1]}</span>
      <span class="hub-sync"><b data-n="${s.id}">${s.on ? s.count.toLocaleString() : '—'}</b><small>今日同步</small></span>
    </div>
    <div class="hub-svc-act">
      <label class="hub-sw" title="${s.on ? '自動同步開關' : '開啟後進行授權'}"><input type="checkbox" data-sw="${s.id}" ${s.on && !s.paused ? 'checked' : ''}><i></i></label>
      <small>${s.on ? (s.paused ? '同步暫停中' : '自動同步') : '尚未授權'}</small>
      ${s.on ? `<button class="btn btn-ghost btn-sm" data-act="disc" data-id="${s.id}">中斷</button>` : `<button class="btn btn-primary btn-sm" data-act="conn" data-id="${s.id}">${icon('link', 14)} 連線</button>`}
    </div>
  </div>`;
}
function renderCards(anim = false) {
  const host = $('#hubSvc', root); if (!host) return;
  host.innerHTML = svc.map(cardHTML).join('');
  updateKpis(anim);
  net && net.setState(svc);
}
function renderCard(id, flash) {
  const s = SVC[id]; const old = $(`.hub-svc[data-id="${id}"]`, root);
  const n = el(cardHTML(s)); old.replaceWith(n);
  if (flash) gsap.fromTo(n, { boxShadow: '0 0 0 2px var(--c), 0 0 40px var(--c)' }, { boxShadow: '0 0 0 0px var(--c), 0 0 0px transparent', duration: 1.6, ease: 'power2.out', clearProps: 'boxShadow' });
  updateKpis(true);
  net && net.setState(svc);
}
function updateKpis(anim) {
  const on = svc.filter(s => s.on).length;
  const sum = svc.reduce((a, s) => a + (s.on ? s.count : 0), 0);
  countUp($('#hkOn', root), on, { duration: anim ? 0.8 : 1.2 });
  countUp($('#hkSync', root), sum, { duration: anim ? 0.8 : 1.4 });
}

function onCardClick(e) {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const s = SVC[b.dataset.id];
  if (b.dataset.act === 'conn') openOAuth(s);
  if (b.dataset.act === 'disc') {
    s.on = false; s.paused = false; s.count = 0;
    renderCard(s.id, false);
    toast(`已中斷｜${s.name}`, '示範：已撤銷存取權杖，歷史資料保留於 GreenUP', { kind: 'info', icon: icon('link', 18) });
    addAudit(OWN, `中斷串接「${s.name}」`, 'warn');
    pushEvent(s.id, true, Date.now(), ['DELETE', 'integration.revoked', `· ${s.name}`]);
  }
}
function onCardToggle(e) {
  const sw = e.target.closest('[data-sw]'); if (!sw) return;
  const s = SVC[sw.dataset.sw];
  if (!s.on) { sw.checked = false; openOAuth(s); return; }
  s.paused = !sw.checked;
  renderCard(s.id, false);
  toast(s.paused ? `已暫停同步｜${s.name}` : `已恢復同步｜${s.name}`, s.paused ? '暫停期間的事件會排入佇列，恢復後自動補送（示範）' : '佇列中的事件已補送完成（示範）', { kind: s.paused ? 'warn' : 'ok', icon: icon('refresh', 18) });
  addAudit(OWN, `${s.paused ? '暫停' : '恢復'}「${s.name}」自動同步`);
}

// ---------- 模擬 OAuth 授權 ----------
async function openOAuth(s) {
  const m = $('#hubModal', root);
  const c = CAT_MAP[s.cat];
  m.innerHTML = `<div class="hub-oauth glass" style="--c:${c.color}">
    <button class="icon-btn hub-x" data-close>${icon('x', 16)}</button>
    <div class="hub-oa-pair"><span class="hub-oa-gu">${icon('leaf', 26)}</span><span class="hub-oa-dots"><i></i><i></i><i></i></span><span class="hub-ab lg ${s.ab.length > 2 ? 'sm' : ''}">${esc(s.ab)}</span></div>
    <h3>授權 GreenUP 存取「${esc(s.name)}」</h3>
    <p class="hub-oa-sub">示範授權流程：不會開啟或連線到真實服務，也不會傳送任何資料。</p>
    <div class="hub-oa-body">
      <b>GreenUP 將取得以下權限</b>
      <ul class="hub-oa-scopes">${s.scopes.map(x => `<li><label><input type="checkbox" checked> ${esc(x)}</label></li>`).join('')}</ul>
      <small>帳號：${esc(TENANT.name)}（示範）・可隨時於此頁中斷連線</small>
    </div>
    <div class="hub-oa-prog" hidden>
      <div class="hub-oa-bar"><i></i></div>
      <ol class="hub-oa-steps">${['導向授權頁面', '取得授權碼', '交換存取權杖（加密保存）', '註冊 Webhook 回呼網址', '首次同步資料'].map(x => `<li>${icon('check', 13)}<span>${x}</span></li>`).join('')}</ol>
    </div>
    <div class="hub-oa-act"><button class="btn btn-ghost" data-close>取消</button><button class="btn btn-primary" id="hubOaGo">${icon('shield', 16)} 同意並授權</button></div>
  </div>`;
  m.hidden = false;
  gsap.fromTo(m, { opacity: 0 }, { opacity: 1, duration: 0.25 });
  gsap.fromTo($('.hub-oauth', m), { y: 30, scale: 0.94, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.5)' });
  const close = () => gsap.to(m, { opacity: 0, duration: 0.25, onComplete: () => { m.hidden = true; m.innerHTML = ''; } });
  $$('[data-close]', m).forEach(b => b.addEventListener('click', close));
  m.onclick = (e) => { if (e.target === m) close(); };
  $('#hubOaGo', m).addEventListener('click', async (e) => {
    const btn = e.currentTarget; btn.disabled = true; $$('[data-close]', m).forEach(b => { b.disabled = true; });
    btn.innerHTML = '<span class="hub-spin"></span> 授權中…';
    $('.hub-oa-body', m).hidden = true; const prog = $('.hub-oa-prog', m); prog.hidden = false;
    gsap.fromTo(prog, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3 });
    const steps = $$('.hub-oa-steps li', m);
    gsap.to($('.hub-oa-bar i', m), { scaleX: 1, duration: 2.6, ease: 'power1.inOut' });
    for (const li of steps) { li.classList.add('run'); await sleep(520); li.classList.remove('run'); li.classList.add('ok'); }
    // 完成
    s.on = true; s.paused = false;
    s.count = 4 + Math.floor(rng() * 18);
    btn.innerHTML = `${icon('check', 16)} 已連線`;
    await sleep(380);
    close();
    renderCard(s.id, true);
    net && net.pulse(s.id);
    toast(`已連線｜${s.name}`, `示範授權完成，首次同步 ${s.count} 筆資料`, { icon: icon('link', 18) });
    addAudit(OWN, `授權串接「${s.name}」（${s.scopes.length} 項權限）`, 'ok');
    pushEvent(s.id, true, Date.now(), ['POST', 'integration.connected', `· ${s.name}`]);
  });
}

// ---------- 事件流 ----------
const MCLS = { POST: 'post', WEBHOOK: 'hook', GET: 'get', PUT: 'put', DELETE: 'del' };
function pushEvent(id, anim = true, ts = Date.now(), forced = null) {
  const list = $('#hubEv', root); if (!list) return;
  let s = id ? SVC[id] : null;
  if (!s) {
    const live = svc.filter(x => x.on && !x.paused);
    if (!live.length) return;
    // 通路類較常出現
    const w = live.map(x => x.cat === 'channel' ? 3 : x.cat === 'pay' || x.cat === 'invoice' ? 2 : 1);
    let r = rng() * w.reduce((a, b) => a + b, 0); s = live[live.length - 1];
    for (let i = 0; i < live.length; i++) { r -= w[i]; if (r <= 0) { s = live[i]; break; } }
  }
  const tpls = EVENT_TPL[s.id] || [['POST', 'sync.completed', s.name]];
  const [m, ev, via] = forced || tpls[Math.floor(rng() * tpls.length)];
  const ms = 60 + Math.floor(rng() * 260);
  const d = new Date(ts);
  const row = el(`<div class="hub-ev" style="--c:${CAT_MAP[s.cat].color}"><time>${fmtTime(d)}:${pad(d.getSeconds())}</time><b class="m ${MCLS[m] || 'get'}">${m === 'WEBHOOK' ? 'HOOK' : m}</b><code>${esc(ev)}</code><span>${esc(via)}</span><em>200 · ${ms}ms</em></div>`);
  list.prepend(row);
  while (list.children.length > 40) list.lastElementChild.remove();
  apiCalls += 1;
  const k = $('#hkApi', root); if (k) k.textContent = (1240 + apiCalls).toLocaleString();
  if (!forced && s.on && rng() < 0.6) {
    s.count += 1;
    const n = $(`[data-n="${s.id}"]`, root); if (n) { n.textContent = s.count.toLocaleString(); gsap.fromTo(n, { color: '#fff', scale: 1.25 }, { color: '', scale: 1, duration: 0.6, clearProps: 'all' }); }
    updateKpis(true);
  }
  if (anim) {
    gsap.fromTo(row, { opacity: 0, x: -16, backgroundColor: 'rgba(94,224,196,0.16)' }, { opacity: 1, x: 0, backgroundColor: 'rgba(94,224,196,0)', duration: 0.8, ease: 'power3.out', clearProps: 'transform,backgroundColor' });
    net && net.burst(s.id, /order|message|dm|call|cart|deposit|payment/.test(ev) ? 'in' : 'out');
  }
}
function evLoop() {
  clearTimeout(evTimer);
  evTimer = setTimeout(() => { if (!evPaused) pushEvent(); evLoop(); }, 1100 + rng() * 1500);
}

function onOrder(order) {
  const s = svc.find(x => x.ch === order.channel);
  if (s && s.on) {
    s.count += 3;
    const n = $(`[data-n="${s.id}"]`, root); if (n) n.textContent = s.count.toLocaleString();
    pushEvent(s.id, shown && tab === 'int', Date.now(), ['POST', 'order.created', `via ${s.name.replace(' 官方帳號', '')} · ${order.id}`]);
    updateKpis(true);
  }
}

function startInt() {
  if (!shown) return;
  if (!net) {
    const host = $('#hubNet', root);
    net = createNet(host, $('#hubNetLabels', root)) || createFallbackNet(host);
    net.setState(svc);
  }
  evLoop();
  try { net.start(); } catch { /* 圖表失敗不影響事件流 */ }
}
function stopInt() { clearTimeout(evTimer); evTimer = 0; net && net.stop(); }

// ---------- Three.js 網路圖 ----------
function glowTex(color = '#ffffff') {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, color); r.addColorStop(0.22, color + 'cc'); r.addColorStop(0.5, color + '33'); r.addColorStop(1, color + '00');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function nodeTex(s, on) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); const col = CAT_MAP[s.cat].color;
  const r = g.createRadialGradient(64, 64, 20, 64, 64, 64);
  r.addColorStop(0, col + (on ? '88' : '22')); r.addColorStop(1, col + '00');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  g.beginPath(); g.arc(64, 64, 30, 0, Math.PI * 2);
  g.fillStyle = on ? col : 'rgba(20,40,32,0.95)'; g.fill();
  g.lineWidth = 3; g.strokeStyle = on ? 'rgba(255,255,255,0.7)' : col + 'aa'; if (!on) g.setLineDash([6, 5]); g.stroke();
  g.fillStyle = on ? '#04130d' : col; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `800 ${s.ab.length > 2 ? 18 : s.ab.length > 1 ? 22 : 26}px "Noto Sans TC", "Noto Sans CJK TC", system-ui, sans-serif`;
  g.fillText(s.ab, 64, 66);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function createNet(host, labelHost) {
  let renderer;
  try {
    const test = document.createElement('canvas');
    if (!(test.getContext('webgl2') || test.getContext('webgl'))) throw new Error('no webgl');
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch { return null; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.className = 'hub-net-cv';
  host.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 2, 0.1, 100);
  camera.position.set(0, 0, 10);
  scene.add(new THREE.AmbientLight(0x406a58, 1.3));
  const kl = new THREE.PointLight(0x2DB674, 60, 30); kl.position.set(2, 3, 4); scene.add(kl);
  const rl = new THREE.PointLight(0x7C62E6, 40, 30); rl.position.set(-3, -2, 3); scene.add(rl);

  const world = new THREE.Group(); scene.add(world);
  // 核心
  const coreG = new THREE.Group(); world.add(coreG);
  const coreMat = new THREE.MeshStandardMaterial({ color: 0x0f5c3c, emissive: 0x0b4a30, emissiveIntensity: 0.9, metalness: 0.3, roughness: 0.3, flatShading: true });
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 1), coreMat); coreG.add(core);
  const wire = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.9, 1)), new THREE.LineBasicMaterial({ color: 0x5ef0a8, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending }));
  coreG.add(wire);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('#2DB674'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 }));
  halo.scale.set(4, 4, 1); coreG.add(halo);
  const rings = [0, 1].map(i => {
    const r = new THREE.Mesh(new THREE.TorusGeometry(1.15 + i * 0.25, 0.008, 6, 120), new THREE.MeshBasicMaterial({ color: i ? 0xF0A531 : 0x5EE0C4, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending }));
    r.rotation.x = Math.PI / 2.4 + i * 0.5; coreG.add(r); return r;
  });

  // 星點背景
  const sr = mulberry32(4242); const SN = 260; const sp = new Float32Array(SN * 3);
  for (let i = 0; i < SN; i++) { sp[i * 3] = (sr() - 0.5) * 22; sp[i * 3 + 1] = (sr() - 0.5) * 11; sp[i * 3 + 2] = -2 - sr() * 6; }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 0.05, map: glowTex('#9fe8c8'), transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(stars);

  // 節點與連線
  const SEG = 28;
  const nodes = svc.map((s, i) => {
    const col = new THREE.Color(CAT_MAP[s.cat].color);
    const texOn = nodeTex(s, true), texOff = nodeTex(s, false);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: s.on ? texOn : texOff, transparent: true, depthWrite: false }));
    world.add(sprite);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((SEG + 1) * 3), 3));
    const line = new THREE.Line(g, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
    world.add(line);
    const label = el(`<span class="hub-nl" style="--c:${CAT_MAP[s.cat].color}">${esc(s.short || s.name)}</span>`);
    labelHost.appendChild(label);
    return { s, i, col, sprite, texOn, texOff, line, label, p: new THREE.Vector3(), ctrl: new THREE.Vector3(), flash: 0, on: s.on, live: s.on && !s.paused };
  });
  const coreLabel = el('<span class="hub-nl core">GreenUP AI 核心</span>'); labelHost.appendChild(coreLabel);

  // 粒子池
  const PN = 260;
  const pPos = new Float32Array(PN * 3).fill(0), pCol = new Float32Array(PN * 3);
  const parts = Array.from({ length: PN }, () => ({ alive: false, n: 0, t: 0, v: 0, dir: 1 }));
  for (let i = 0; i < PN; i++) pPos[i * 3 + 2] = -999;
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pg.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  const pts = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.26, map: glowTex('#ffffff'), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  world.add(pts);
  let pCursor = 0;
  function spawn(n, dir, speed = 0.45, big = false) {
    for (let k = 0; k < PN; k++) {
      const idx = (pCursor + k) % PN; const p = parts[idx];
      if (p.alive) continue;
      pCursor = idx + 1;
      Object.assign(p, { alive: true, n, t: 0, v: speed * (0.8 + Math.random() * 0.4), dir });
      const c = big ? n.col.clone().lerp(new THREE.Color('#ffffff'), 0.45) : n.col;
      pCol[idx * 3] = c.r; pCol[idx * 3 + 1] = c.g; pCol[idx * 3 + 2] = c.b;
      return;
    }
  }
  const bez = (n, t, out) => {
    const a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
    out.set(b * n.ctrl.x + c * n.p.x, b * n.ctrl.y + c * n.p.y, b * n.ctrl.z + c * n.p.z); return out;
  };

  let w = 1, h = 1, compact = false;
  function layout() {
    const halfH = 10 * Math.tan(THREE.MathUtils.degToRad(20)); const halfW = halfH * camera.aspect;
    compact = w < 560;
    const ry = halfH * (compact ? 0.66 : 0.7), rx = Math.min(halfW * (compact ? 0.74 : 0.76), ry * 2.5);
    const N = nodes.length; const tmp = new THREE.Vector3();
    // 依橢圓弧長平均分配節點，避免左右兩端擁擠
    const K = 720, cum = [0]; let prev = [0, -ry];
    for (let k = 1; k <= K; k++) { const a = -Math.PI / 2 + k / K * Math.PI * 2; const q = [Math.cos(a) * rx, Math.sin(a) * ry]; cum.push(cum[k - 1] + Math.hypot(q[0] - prev[0], q[1] - prev[1])); prev = q; }
    const L = cum[K]; let k = 0;
    nodes.forEach((n, i) => {
      const target = (i + 0.5) / N * L; while (k < K && cum[k + 1] < target) k++;
      const a = -Math.PI / 2 + (k + (target - cum[k]) / Math.max(1e-6, cum[k + 1] - cum[k])) / K * Math.PI * 2;
      n.p.set(Math.cos(a) * rx, Math.sin(a) * ry, Math.sin(a * 2) * 0.5);
      n.side = Math.abs(Math.cos(a)) > 0.9 ? 1 : 0;
      // 曲線控制點：中點加上垂直偏移
      n.ctrl.set(n.p.x * 0.5 - n.p.y * 0.18, n.p.y * 0.5 + n.p.x * 0.12, n.p.z * 0.5 + 0.6);
      n.sprite.position.copy(n.p);
      const sc = compact ? 0.62 : 0.78; n.sprite.scale.set(sc, sc, 1); n.base = sc;
      const pos = n.line.geometry.attributes.position;
      for (let k = 0; k <= SEG; k++) { bez(n, k / SEG, tmp); pos.setXYZ(k, tmp.x, tmp.y, tmp.z); }
      pos.needsUpdate = true; n.line.geometry.computeBoundingSphere();
    });
    coreG.scale.setScalar(compact ? 0.7 : 1);
    labelHost.classList.toggle('compact', compact);
  }
  function resize() {
    const r = host.getBoundingClientRect(); w = Math.max(1, r.width); h = Math.max(1, r.height);
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); layout();
  }
  const ro = new ResizeObserver(resize); ro.observe(host); resize();
  let mx = 0, my = 0;
  host.addEventListener('pointermove', (e) => { const r = host.getBoundingClientRect(); mx = (e.clientX - r.left) / r.width - 0.5; my = (e.clientY - r.top) / r.height - 0.5; });
  host.addEventListener('pointerleave', () => { mx = 0; my = 0; });

  let raf = 0, running = false, last = 0, t = 0, energy = 0;
  const v = new THREE.Vector3(), wp = new THREE.Vector3();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    energy = Math.max(0, energy - dt * 0.7);
    world.rotation.y += ((Math.sin(t * 0.22) * 0.22 + mx * 0.35) - world.rotation.y) * 0.05;
    world.rotation.x += ((-0.08 + my * 0.25) - world.rotation.x) * 0.05;
    core.rotation.y += dt * (0.4 + energy * 2); core.rotation.x += dt * 0.15;
    wire.rotation.y -= dt * 0.25; wire.rotation.z += dt * 0.1;
    rings[0].rotation.z += dt * 0.5; rings[1].rotation.z -= dt * 0.35;
    coreMat.emissiveIntensity = 0.8 + Math.sin(t * 2) * 0.2 + energy * 1.4;
    halo.material.opacity = 0.65 + Math.sin(t * 1.6) * 0.1 + energy * 0.3;
    const hs = (compact ? 3 : 4) + energy * 1.2; halo.scale.set(hs, hs, 1);
    stars.rotation.z += dt * 0.004;

    for (const n of nodes) {
      n.flash = Math.max(0, n.flash - dt * 0.9);
      const sc = n.base * (1 + n.flash * 0.8 + (n.live ? Math.sin(t * 2 + n.i) * 0.04 : 0));
      n.sprite.scale.set(sc, sc, 1);
      n.line.material.opacity = (n.live ? 0.32 + Math.sin(t * 1.5 + n.i * 0.7) * 0.08 : n.on ? 0.14 : 0.05) + n.flash * 0.6;
      if (n.live && Math.random() < dt * (n.s.cat === 'channel' ? 0.9 : 0.5)) spawn(n, n.s.cat === 'channel' || n.s.cat === 'commerce' ? -1 : (Math.random() < 0.6 ? 1 : -1));
    }
    for (let i = 0; i < PN; i++) {
      const p = parts[i];
      if (!p.alive) continue;
      p.t += dt * p.v;
      if (p.t >= 1) { p.alive = false; pPos[i * 3 + 2] = -999; if (p.dir < 0) energy = Math.min(1, energy + 0.08); continue; }
      bez(p.n, p.dir > 0 ? p.t : 1 - p.t, v);
      pPos[i * 3] = v.x; pPos[i * 3 + 1] = v.y; pPos[i * 3 + 2] = v.z;
    }
    pg.attributes.position.needsUpdate = true; pg.attributes.color.needsUpdate = true;
    renderer.render(scene, camera);
    // 標籤位置
    for (const n of nodes) {
      n.sprite.getWorldPosition(wp); wp.project(camera);
      const x = (wp.x * 0.5 + 0.5) * w, y = (-wp.y * 0.5 + 0.5) * h;
      const dy = (n.side || n.p.y < 0 ? 1 : -1) * (compact ? 20 : 28);
      n.label.style.transform = `translate(${x.toFixed(1)}px, ${(y + dy).toFixed(1)}px) translate(-50%, -50%)`;
    }
    coreG.getWorldPosition(wp); wp.project(camera);
    coreLabel.style.transform = `translate(${((wp.x * 0.5 + 0.5) * w).toFixed(1)}px, ${((-wp.y * 0.5 + 0.5) * h + (compact ? 52 : 74)).toFixed(1)}px) translate(-50%, -50%)`;
  }
  const step = (now) => { if (!running) return; if (!document.hidden) frame(now); raf = requestAnimationFrame(step); };

  return {
    start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(step); },
    stop() { running = false; cancelAnimationFrame(raf); raf = 0; },
    setState(list) {
      for (const n of nodes) {
        const s = list.find(x => x.id === n.s.id);
        n.on = s.on; n.live = s.on && !s.paused;
        n.sprite.material.map = s.on ? n.texOn : n.texOff; n.sprite.material.needsUpdate = true;
        n.label.classList.toggle('off', !s.on);
        n.label.classList.toggle('pause', s.on && s.paused);
      }
    },
    burst(id, dir) {
      const n = nodes.find(x => x.s.id === id); if (!n) return;
      n.flash = Math.max(n.flash, 0.6);
      for (let k = 0; k < 3; k++) setTimeout(() => spawn(n, dir === 'in' ? -1 : 1, 0.7, true), k * 110);
    },
    pulse(id) {
      const n = nodes.find(x => x.s.id === id); if (!n) return;
      n.flash = 1.4; energy = 1;
      for (let k = 0; k < 8; k++) setTimeout(() => spawn(n, k % 2 ? -1 : 1, 0.6, true), k * 90);
    },
  };
}

// 無 WebGL 時：ECharts 力導向圖（靜態降級）
function createFallbackNet(host) {
  host.classList.add('no-webgl');
  const box = el('<div class="hub-net-fb"></div>'); host.prepend(box);
  const chart = makeChart(box);
  const opt = () => ({
    animationDurationUpdate: 600,
    tooltip: { formatter: p => p.dataType === 'node' ? `${p.data.name}${p.data.st ? `<br/>${p.data.st}` : ''}` : '' },
    series: [{
      type: 'graph', layout: 'none', roam: false, left: 60, right: 60, top: 40, bottom: 60,
      label: { show: true, position: 'bottom', color: '#d6f0e2', fontSize: 11 },
      data: [{ name: 'GreenUP AI 核心', symbolSize: 64, x: 0, y: 0, itemStyle: { color: '#2DB674', shadowBlur: 30, shadowColor: '#2DB674' }, label: { fontSize: 13, fontWeight: 700 } },
        ...svc.map((s, i) => ({ name: s.name, x: Math.cos(-Math.PI / 2 + (i + 0.5) / svc.length * Math.PI * 2) * 300, y: Math.sin(-Math.PI / 2 + (i + 0.5) / svc.length * Math.PI * 2) * 160, st: !s.on ? '未連線' : s.paused ? '已暫停' : '已連線', symbolSize: 26,
          itemStyle: { color: s.on ? CAT_MAP[s.cat].color : 'rgba(20,40,32,0.95)', borderColor: CAT_MAP[s.cat].color, borderWidth: 2, borderType: s.on ? 'solid' : 'dashed' } }))],
      links: svc.map((s, i) => ({ source: 0, target: i + 1, lineStyle: { color: CAT_MAP[s.cat].color, opacity: s.on ? 0.6 : 0.15, width: s.on ? 1.6 : 1, type: s.on ? 'solid' : 'dashed', curveness: 0.12 } })),
    }],
  });
  return {
    start() { chart.resize(); }, stop() {},
    setState() { chart.setOption(opt(), true); },
    burst() {}, pulse() {},
  };
}

// ====================================================================
// B. 會計師協作
// ====================================================================
function lastPeriod() {
  const now = new Date(); const m = now.getMonth();
  const curStart = m - (m % 2);
  const s = new Date(now.getFullYear(), curStart - 2, 1);
  return { roc: s.getFullYear() - 1911, a: s.getMonth() + 1, b: s.getMonth() + 2 };
}
function acctHTML() {
  const lp = lastPeriod(); const roc = new Date().getFullYear() - 1911;
  return `
  <div class="glass hub-acct-head anim-in">
    <div>
      <span class="chip-sm">${icon('users', 13)} 會計師／記帳士協作</span>
      <h3>帳交給 AI 記，<b>關鍵分錄交給專業的人點頭</b></h3>
      <p>AI 自動入帳後，只把需要專業判斷的分錄送進審核佇列；會計師線上核准或退回，申報檔一鍵產出。</p>
    </div>
    <div class="hub-acct-stats">
      <div><b id="haTotal">0</b><small>本月分錄</small></div>
      <div><b id="haAuto">0</b><small>AI 自動入帳</small></div>
      <div><b id="haPend">0</b><small>待人工確認</small></div>
      <div><b id="haDone">0</b><small>帳務完成度</small></div>
    </div>
  </div>
  <div class="hub-acct-grid">
    <div class="glass card hub-invite anim-in">
      <div class="card-h"><h3>${I.mail(17)} 邀請會計師／記帳士</h3></div>
      <form id="hubInvite" novalidate>
        <label class="hub-lbl">Email</label>
        <div class="hub-input"><input type="email" id="hubEmail" placeholder="例如 accountant@example.com" autocomplete="off"></div>
        <label class="hub-lbl">權限等級</label>
        <div class="hub-segs"><button type="button" class="seg" data-role="view">${I.eye(14)} 唯讀</button><button type="button" class="seg on" data-role="review">${icon('check', 14)} 可審核</button></div>
        <label class="hub-lbl">可存取項目</label>
        <div class="hub-perms">
          <label><input type="checkbox" value="view" checked><span>檢視帳務</span><small>分錄、憑證、報表</small></label>
          <label><input type="checkbox" value="review" checked><span>審核分錄</span><small>核准、退回、調整</small></label>
          <label><input type="checkbox" value="download" checked><span>下載申報檔</span><small>401、營所稅、扣繳</small></label>
        </div>
        <button class="btn btn-primary hub-inv-btn" type="submit">${icon('send', 15)} 寄送邀請</button>
      </form>
      <div class="hub-collab" id="hubCollab"></div>
    </div>
    <div class="glass card hub-queue anim-in">
      <div class="card-h"><h3>${I.flag(17)} 審核佇列 <span class="hub-count" id="hubQN">0</span></h3>
        <button class="btn btn-ghost btn-sm" id="hubApproveLow">${icon('check', 14)} 一鍵核准低風險</button></div>
      <p class="hub-fine">${icon('sparkle', 13)} AI 標記需人工確認的分錄（以林雅婷記帳士身分示範操作）</p>
      <div class="hub-q-list" id="hubQ"></div>
    </div>
    <div class="glass card hub-ring-card anim-in">
      <div class="card-h"><h3>${icon('trend', 17)} 審核進度</h3></div>
      <div class="hub-ring" id="hubRing"></div>
      <ul class="hub-ring-legend" id="hubRingLg"></ul>
    </div>
  </div>
  <div class="glass hub-partner anim-in">
    <div class="hub-browser"><i></i><i></i><i></i><span class="mono">partner.greenup.example／林記帳士事務所</span><em class="demo-badge">記帳士夥伴後台預覽・示範</em></div>
    <div class="hub-partner-body">
      <div class="hub-partner-main">
        <div class="hub-pk">
          <div><small>管理客戶</small><b id="hpC">0</b><span>家一人公司</span></div>
          <div><small>本期 401 已申報</small><b id="hpF">0</b><span>/ ${CLIENTS.length} 家</span></div>
          <div><small>平均帳務完成度</small><b id="hpD">0</b><span>%</span></div>
          <div><small>需關注</small><b id="hpR">0</b><span>家（紅燈）</span></div>
        </div>
        <div class="tbl-wrap hub-ctbl"><table class="tbl"><thead><tr><th>客戶</th><th>產業</th><th>方案</th><th>帳務完成度</th><th>申報狀態</th><th>風險</th></tr></thead><tbody id="hubClients"></tbody></table></div>
      </div>
      <div class="hub-partner-side">
        <div class="card-h"><h3>${icon('coins', 17)} 推薦分潤（首年 20%）</h3></div>
        <div class="chart hub-ref-chart" id="hubRef"></div>
        <div class="hub-calc">
          <label>若推薦 <b id="hubRefN">10</b> 家一人公司</label>
          <input type="range" min="5" max="60" step="1" value="10" id="hubRefR">
          <div class="hub-calc-out"><span>首年分潤約</span><b id="hubRefY">NT$ 0</b></div>
          <small>以一人公司版月費 NT$ ${PLAN_PRICE['一人公司版'].toLocaleString()} × 12 個月 × 20% 估算；方案與分潤條件皆為示範。</small>
        </div>
      </div>
    </div>
  </div>
  <div class="hub-exports">
    ${[['401', 'tax', '401 媒體檔', `${lp.roc} 年 ${pad(lp.a)}–${pad(lp.b)} 月營業稅`, `401_${lp.roc}${pad(lp.a)}${pad(lp.b)}.TXT`, '#2DB674'],
      ['cit', 'bank', '營所稅申報書草稿', `${roc} 年度（年中試算）`, `營所稅草稿_${roc}.pdf`, '#F0A531'],
      ['wh', 'users', '扣繳憑單', `${roc} 年度各類所得（預備資料）`, `扣繳憑單_${roc}.TXT`, '#2E97D4']].map(([k, ic, t, sub, fn, c]) => `
    <div class="glass hub-exp anim-in" style="--c:${c}" data-k="${k}">
      <span class="hub-exp-ic">${icon(ic, 22)}</span>
      <div class="hub-exp-t"><b>${t}</b><small>${sub}</small><code class="mono">${fn}</code></div>
      <button class="btn btn-ghost btn-sm" data-exp="${k}" data-fn="${fn}" data-t="${t}">${I.download(15)} 匯出</button>
      <div class="hub-exp-bar"><i></i></div>
    </div>`).join('')}
  </div>`;
}

function bindAcct() {
  renderCollab(); renderQueue(); renderClients();
  const form = $('#hubInvite', root);
  const reviewCb = $('.hub-perms input[value="review"]', root);
  $$('.hub-segs .seg', root).forEach(b => b.addEventListener('click', () => {
    $$('.hub-segs .seg', root).forEach(x => x.classList.toggle('on', x === b));
    const ro = b.dataset.role === 'view';
    reviewCb.disabled = ro; reviewCb.checked = !ro;
    reviewCb.closest('label').classList.toggle('dis', ro);
  }));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const inp = $('#hubEmail', root); const v = inp.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      gsap.fromTo(inp.parentElement, { x: -8 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
      inp.parentElement.classList.add('err'); setTimeout(() => inp.parentElement.classList.remove('err'), 1600);
      toast('請輸入正確的 Email', '例如 accountant@example.com', { kind: 'warn', icon: icon('alert', 18) });
      return;
    }
    const role = $('.hub-segs .seg.on', root).dataset.role;
    const perms = $$('.hub-perms input:checked', root).map(x => x.value);
    const btn = $('.hub-inv-btn', root); btn.disabled = true; btn.innerHTML = '<span class="hub-spin"></span> 寄送中…';
    await sleep(900);
    collaborators.push({ name: v.split('@')[0], org: '邀請中', email: v, role, perms, status: '待接受', fresh: true });
    renderCollab();
    btn.disabled = false; btn.innerHTML = `${icon('send', 15)} 寄送邀請`; inp.value = '';
    toast('邀請已寄出（示範）', `${v}・${role === 'review' ? '可審核' : '唯讀'}・${perms.length} 項權限`, { icon: I.mail(18) });
    addAudit(OWN, `邀請 ${v} 為${role === 'review' ? '可審核' : '唯讀'}協作者`, 'ok');
  });
  $('#hubQ', root).addEventListener('click', (e) => {
    const b = e.target.closest('[data-q]'); if (!b) return;
    const item = b.closest('.hub-q');
    const r = review_(item.dataset.id);
    if (b.dataset.q === 'note') { const box = $('.hub-q-note', item); box.hidden = !box.hidden; if (!box.hidden) $('textarea', box).focus(); return; }
    decide(r, b.dataset.q, $('textarea', item).value.trim());
  });
  $('#hubApproveLow', root).addEventListener('click', () => {
    const lows = review.filter(r => r.state === 'pending' && r.level === 'low');
    if (!lows.length) { toast('沒有待審的低風險分錄', '', { kind: 'info', icon: icon('check', 18) }); return; }
    lows.forEach((r, i) => setTimeout(() => decide(r, 'ok', '', true), i * 260));
    setTimeout(() => toast(`已核准 ${lows.length} 筆低風險分錄`, '林雅婷記帳士・批次核准（示範）', { icon: icon('check', 18) }), lows.length * 260 + 200);
  });
  $$('[data-exp]', root).forEach(b => b.addEventListener('click', () => exportFile(b)));
  const range = $('#hubRefR', root);
  range.addEventListener('input', () => updateCalc(+range.value));
}
const review_ = (id) => review.find(r => r.id === id);

function renderCollab() {
  $('#hubCollab', root).innerHTML = `<div class="hub-lbl">目前協作者</div>` + collaborators.map(c => `
    <div class="hub-co ${c.fresh ? 'fresh' : ''}">
      <span class="hub-av">${esc(c.name.slice(0, 1).toUpperCase())}</span>
      <div><b>${esc(c.name)}</b><small>${esc(c.org)}・${esc(c.email)}</small></div>
      <span class="hub-role ${c.role}">${c.role === 'review' ? '可審核' : '唯讀'}</span>
      <span class="chip-sm ${c.status === '待接受' ? 'warn' : ''}">${c.status}</span>
    </div>`).join('');
  const f = $('.hub-co.fresh', root);
  if (f) { gsap.fromTo(f, { opacity: 0, y: 12, backgroundColor: 'rgba(45,182,116,0.25)' }, { opacity: 1, y: 0, backgroundColor: 'rgba(255,255,255,0.03)', duration: 1, clearProps: 'backgroundColor' }); collaborators.forEach(c => { c.fresh = false; }); }
}

const LV = { high: ['高', 'coral'], mid: ['中', 'amber'], low: ['低', 'sky'] };
function renderQueue() {
  const host = $('#hubQ', root);
  const pend = review.filter(r => r.state === 'pending');
  host.innerHTML = pend.length ? pend.map(r => `
    <div class="hub-q" data-id="${r.id}">
      <div class="hub-q-top">
        <span class="hub-flag ${LV[r.level][1]}">${I.flag(12)} ${esc(r.flag)}</span>
        <span class="hub-lv ${LV[r.level][1]}">風險 ${LV[r.level][0]}</span>
        <span class="hub-q-amt">${money(r.amt)}</span>
      </div>
      <div class="hub-q-meta"><span class="mono">${r.id}</span><span>${r.date}</span><span>${esc(r.acct)}</span><span>${esc(r.vendor)}</span></div>
      <p class="hub-q-why">${esc(r.why)}</p>
      <p class="hub-q-ai">${icon('sparkle', 13)} ${esc(r.ai)}</p>
      <div class="hub-q-note" hidden><textarea rows="2" placeholder="留言給${esc(OWN)}（例如：請補上與會客戶名稱）"></textarea></div>
      <div class="hub-q-act">
        <button class="btn btn-ghost btn-sm" data-q="note">${icon('chat', 14)} 留言</button>
        <button class="btn btn-ghost btn-sm hub-back" data-q="back">${I.undo(14)} 退回</button>
        <button class="btn btn-primary btn-sm" data-q="ok">${icon('check', 14)} 核准</button>
      </div>
    </div>`).join('') : `<div class="hub-q-empty">${icon('check', 30)}<b>佇列已清空</b><small>本月需人工確認的分錄都處理完了，帳務可以結帳。</small></div>`;
  $('#hubQN', root).textContent = pend.length;
  updateAcctStats();
}
function decide(r, act, note, silent = false) {
  if (r.state !== 'pending') return;
  const node = $(`.hub-q[data-id="${r.id}"]`, root);
  r.state = act === 'ok' ? 'ok' : 'back'; r.note = note || (act === 'ok' ? '' : '請補充說明與憑證');
  const done = () => { renderQueue(); updateRing(); };
  if (node) {
    node.classList.add(act === 'ok' ? 'ok' : 'back');
    gsap.to(node, { x: act === 'ok' ? 60 : -60, opacity: 0, duration: 0.35, ease: 'power2.in', onComplete: () => gsap.to(node, { height: 0, paddingTop: 0, paddingBottom: 0, marginBottom: 0, borderWidth: 0, duration: 0.25, onComplete: done }) });
  } else done();
  if (!silent) toast(act === 'ok' ? `已核准｜${r.id}` : `已退回｜${r.id}`, act === 'ok' ? `${r.acct} ${money(r.amt)}${note ? `・留言：${note}` : ''}` : `已通知${OWN}：${r.note}`, { kind: act === 'ok' ? 'ok' : 'warn', icon: act === 'ok' ? icon('check', 18) : I.undo(18) });
  addAudit('林雅婷 記帳士', `${act === 'ok' ? '核准' : '退回'}分錄 ${r.id}（${r.flag}）${r.note && act !== 'ok' ? `：${r.note}` : ''}`, act === 'ok' ? 'ok' : 'warn');
}
function updateAcctStats() {
  const pend = review.filter(r => r.state === 'pending').length;
  const ok = review.filter(r => r.state === 'ok').length;
  const auto = MONTH_TOTAL - review.length;
  countUp($('#haTotal', root), MONTH_TOTAL, { duration: 1 });
  countUp($('#haAuto', root), auto, { duration: 1 });
  countUp($('#haPend', root), pend, { duration: 0.6 });
  countUp($('#haDone', root), (auto + ok) / MONTH_TOTAL * 100, { decimals: 1, suffix: '%', duration: 0.8 });
}
function ringOption() {
  const ok = review.filter(r => r.state === 'ok').length, back = review.filter(r => r.state === 'back').length, pend = review.length - ok - back;
  const pct = Math.round((ok + back) / review.length * 100);
  return {
    tooltip: { trigger: 'item', formatter: p => `${p.marker}${p.name}：<b>${p.value}</b> 筆` },
    title: { text: pct + '%', subtext: '已處理', left: 'center', top: '40%', textStyle: { fontSize: 30, fontWeight: 800, color: '#eafff4', fontFamily: FONT }, subtextStyle: { color: 'rgba(214,240,226,0.72)', fontSize: 12, fontFamily: FONT } },
    series: [
      { type: 'pie', radius: ['70%', '86%'], center: ['50%', '50%'], silent: true, label: { show: false }, data: [{ value: 1, itemStyle: { color: 'rgba(255,255,255,0.05)' } }] },
      { type: 'pie', radius: ['70%', '86%'], center: ['50%', '50%'], padAngle: 3, itemStyle: { borderRadius: 6 }, label: { show: false }, animationDurationUpdate: 700,
        data: [{ name: '已核准', value: ok, itemStyle: { color: '#2DB674' } }, { name: '已退回', value: back, itemStyle: { color: '#F0A531' } }, { name: '待審核', value: pend, itemStyle: { color: 'rgba(214,240,226,0.22)' } }] },
    ],
  };
}
function updateRing() {
  if (charts.ring) charts.ring.setOption(ringOption());
  const ok = review.filter(r => r.state === 'ok').length, back = review.filter(r => r.state === 'back').length;
  $('#hubRingLg', root).innerHTML = [['已核准', ok, '#2DB674'], ['已退回', back, '#F0A531'], ['待審核', review.length - ok - back, 'rgba(214,240,226,0.4)']]
    .map(([n, v, c]) => `<li><i style="background:${c}"></i>${n}<b>${v}</b></li>`).join('') +
    `<li class="hub-ring-note">退回的分錄會出現在${esc(OWN)}的待辦，補件後自動回到佇列。</li>` +
    `<li class="hub-ring-close">${icon('calendar', 14)}<span>${review.every(r => r.state !== 'pending') ? `可以結帳：AI 將產生 ${new Date().getMonth() || 12} 月結帳分錄` : '全部處理後，AI 自動執行月結'}</span></li>`;
}

function renderClients() {
  const FIL = { ok: ['已申報', 'ok'], wait: ['待確認', 'wait'], miss: ['資料不足', 'miss'] };
  const RISK = { g: ['正常', 'g'], y: ['注意', 'y'], r: ['高風險', 'r'] };
  $('#hubClients', root).innerHTML = CLIENTS.map(c => `<tr class="${c.me ? 'me' : ''}">
    <td><b>${esc(c.name)}</b>${c.me ? ' <span class="chip-sm">你</span>' : ''}</td><td>${esc(c.ind)}</td><td>${esc(c.plan)}</td>
    <td><div class="hub-pbar"><i style="width:${c.done}%;--c:${c.done >= 85 ? '#2DB674' : c.done >= 60 ? '#F0A531' : '#EC6A55'}"></i></div><span class="hub-pv">${c.done}%</span></td>
    <td><span class="hub-fil ${FIL[c.filing][1]}">${FIL[c.filing][0]}</span></td>
    <td><span class="hub-lamp ${RISK[c.risk][1]}"><i></i>${RISK[c.risk][0]}</span></td></tr>`).join('');
}
function refData() {
  // 12 個月：每家客戶加入後 12 個月內分潤 20%
  const now = new Date(); const months = [];
  for (let i = -8; i <= 3; i++) { const d = new Date(now.getFullYear(), now.getMonth() + i, 1); months.push({ label: `${d.getMonth() + 1}月`, i }); }
  return months.map(m => {
    let v = 0;
    for (const c of CLIENTS) { const joinedAt = -8 + c.joined; if (m.i >= joinedAt && m.i - joinedAt < 12) v += PLAN_PRICE[c.plan] * REFERRAL_RATE; }
    return { label: m.label, value: Math.round(v), future: m.i > 0 };
  });
}
function refOption() {
  const d = refData();
  return {
    animationDuration: 1100,
    grid: { left: 4, right: 8, top: 26, bottom: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (p) => `${p[0].name}${d[p[0].dataIndex].future ? '（預估）' : ''}<br/>${p[0].marker}分潤 <b>NT$ ${p[0].value.toLocaleString()}</b>` },
    title: { text: '每月推薦分潤（NT$，淺色為預估）', left: 0, top: 0, textStyle: { fontSize: 11.5, fontWeight: 400, color: 'rgba(214,240,226,0.6)', fontFamily: FONT } },
    xAxis: { type: 'category', data: d.map(x => x.label), axisLabel: { fontSize: 10.5, interval: 1 } },
    yAxis: { type: 'value', splitNumber: 3, axisLabel: { fontSize: 10.5 } },
    series: [{ type: 'bar', barWidth: '58%', data: d.map(x => ({ value: x.value, itemStyle: { color: x.future ? 'rgba(45,182,116,0.35)' : '#2DB674', borderRadius: [4, 4, 0, 0], borderColor: x.future ? '#2DB674' : 'transparent', borderType: 'dashed', borderWidth: x.future ? 1 : 0 } })) }],
  };
}
function updateCalc(n) {
  $('#hubRefN', root).textContent = n;
  countUp($('#hubRefY', root), n * PLAN_PRICE['一人公司版'] * 12 * REFERRAL_RATE, { prefix: 'NT$ ', duration: 0.5 });
}
function showAcct() {
  if (!charts.ring) { charts.ring = makeChart($('#hubRing', root)); updateRing(); charts.ring.setOption(ringOption()); }
  if (!charts.ref) { charts.ref = makeChart($('#hubRef', root)); charts.ref.setOption(refOption()); }
  updateAcctStats();
  countUp($('#hpC', root), CLIENTS.length, { duration: 0.8 });
  countUp($('#hpF', root), CLIENTS.filter(c => c.filing === 'ok').length, { duration: 0.8 });
  countUp($('#hpD', root), CLIENTS.reduce((a, c) => a + c.done, 0) / CLIENTS.length, { duration: 1, decimals: 1 });
  countUp($('#hpR', root), CLIENTS.filter(c => c.risk === 'r').length, { duration: 0.8 });
  updateCalc(+$('#hubRefR', root).value);
  gsap.fromTo($$('.hub-pbar i', root), { scaleX: 0 }, { scaleX: 1, duration: 1, stagger: 0.04, ease: 'power3.out', transformOrigin: 'left' });
}
async function exportFile(b) {
  if (b.disabled) return;
  const card = b.closest('.hub-exp'); const bar = $('.hub-exp-bar i', card);
  b.disabled = true; b.innerHTML = '<span class="hub-spin"></span> 產生中';
  card.classList.add('run');
  await new Promise(r => gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: 1.5, ease: 'power2.inOut', onComplete: r }));
  card.classList.remove('run'); card.classList.add('done');
  b.innerHTML = `${icon('check', 15)} 已產生`;
  gsap.fromTo($('.hub-exp-ic', card), { scale: 1.4, rotate: -12 }, { scale: 1, rotate: 0, duration: 0.6, ease: 'back.out(3)' });
  toast(`已產生｜${b.dataset.t}`, `${b.dataset.fn}・示範環境不會實際下載，正式申報前請由負責人或會計師確認`, { icon: I.download(18) });
  addAudit('林雅婷 記帳士', `匯出 ${b.dataset.t}（${b.dataset.fn}）`);
  setTimeout(() => { b.disabled = false; b.innerHTML = `${I.download(15)} 再次匯出`; card.classList.remove('done'); gsap.set(bar, { scaleX: 0 }); }, 4000);
}

// ====================================================================
// C. 多國設定
// ====================================================================
function geoHTML() {
  return `
  <div class="glass hub-geo-head anim-in">
    <div class="hub-countries" id="hubCountries">${COUNTRIES.map(c => `
      <button class="hub-cty ${c.id === country ? 'on' : ''}" data-c="${c.id}" style="--c:${c.color}"><span class="hub-cty-code">${c.code}</span><span><b>${c.name}</b><small>${c.sub}・${c.cur}</small></span></button>`).join('')}
    </div>
    <div class="hub-notice">${icon('alert', 16)}<span><b>${ANCHOR_NOTE}</b>正式上線前需由當地會計師或稅務顧問確認。</span></div>
  </div>
  <div class="hub-geo-grid" id="hubGeo">
    <div class="glass card hub-g" data-g="cur"></div>
    <div class="glass card hub-g" data-g="tax"></div>
    <div class="glass card hub-g" data-g="einv"></div>
    <div class="glass card hub-g" data-g="ch"></div>
    <div class="glass card hub-g hub-g-lang" data-g="lang"></div>
  </div>
  <div class="hub-geo-charts">
    <div class="glass card anim-in"><div class="card-h"><h3>${icon('trend', 17)} 新台幣兌外幣匯率走勢</h3><span class="chip-sm">近 12 週・第 1 週＝100・示意</span></div><div class="chart" id="hubFx"></div></div>
    <div class="glass card anim-in"><div class="card-h"><h3>${icon('globe', 17)} 跨境營收（換算新台幣）</h3><span class="chip-sm" id="hubXbShare">—</span></div><div class="chart" id="hubXb"></div></div>
  </div>`;
}
function bindGeo() {
  $$('.hub-cty', root).forEach(b => b.addEventListener('click', () => setCountry(b.dataset.c)));
  renderGeo(false);
}
function fmtLocal(c, twd) {
  const v = twd * c.rate;
  try { return new Intl.NumberFormat(c.locale, { style: 'currency', currency: c.cur, maximumFractionDigits: c.dec, minimumFractionDigits: c.dec }).format(c.cur === 'VND' ? Math.round(v / 1000) * 1000 : v); }
  catch { return `${c.sym} ${v.toFixed(c.dec)}`; }
}
function geoCards(c) {
  const lemon = DEMO_ITEM.price;
  const t = Number(c.taxes[c.calc || 0][1].match(/\d+/)[0]);
  return {
    cur: `<div class="card-h"><h3>${icon('coins', 17)} 幣別</h3><span class="chip-sm">${c.locale}</span></div>
      <div class="hub-cur"><b class="hub-big" style="--c:${c.color}">${c.cur}</b><span class="hub-sym">${esc(c.sym)}</span></div>
      <div class="hub-kv"><span>示意匯率</span><b>${c.id === 'tw' ? '本國幣別' : `1 TWD ≈ ${c.rate} ${c.cur}`}</b></div>
      <div class="hub-kv"><span>${esc(DEMO_ITEM.zh)}</span><b>${fmtLocal(c, lemon)}</b></div>
      <div class="hub-kv"><span>金額小數位</span><b>${c.dec ? c.dec + ' 位' : '整數'}</b></div>`,
    tax: `<div class="card-h"><h3>${icon('percent', 17)} 稅制</h3><span class="chip-sm warn">依最新公告為準</span></div>
      <div class="hub-taxes">${c.taxes.map(([n, r, d]) => `<div class="hub-tax"><b style="--c:${c.color}">${r}</b><div><span>${esc(n)}</span><small>${esc(d)}</small></div></div>`).join('')}</div>
      <p class="hub-g-note">${esc(c.taxNote)}</p>
      <div class="hub-kv"><span>試算：${esc(DEMO_ITEM.zh.replace(/（.*$/, ''))}內含稅額（${t}%）</span><b>${fmtLocal(c, lemon - lemon / (1 + t / 100))}</b></div>`,
    einv: `<div class="card-h"><h3>${icon('receipt', 17)} 電子發票制度</h3></div>
      <div class="hub-einv"><b>${esc(c.einv.name)}</b><span>${esc(c.einv.local)}</span></div>
      <div class="hub-kv"><span>主管機關</span><b>${esc(c.einv.body)}</b></div>
      <ul class="hub-pts">${c.einv.pts.map(p => `<li>${icon('check', 13)}${esc(p)}</li>`).join('')}</ul>`,
    ch: `<div class="card-h"><h3>${icon('chat', 17)} 常用通路</h3></div>
      <div class="hub-chs">${c.channels.map((x, i) => `<span class="hub-chp ${i ? '' : 'pri'}" style="--c:${c.color}">${i ? '' : '<em>主力</em>'}${esc(x)}</span>`).join('')}</div>
      <p class="hub-g-note">AI 會依國家自動切換預設通路、客服語言與營業時區。</p>`,
    lang: `<div class="card-h"><h3>${icon('globe', 17)} 介面語言預覽</h3><span class="chip-sm">${esc(c.lang.label)}</span></div>
      <div class="hub-phone">
        <div class="hub-bub in">${esc(c.lang.hello)}</div>
        <div class="hub-ocard">
          <div class="hub-ocard-h">${icon('check', 14)} ${esc(c.lang.order)}</div>
          <div class="hub-kv"><span>${esc(c.lang.item)}</span><b>${fmtLocal(c, lemon)}</b></div>
          <div class="hub-kv tot"><span>${esc(c.lang.total)}</span><b>${fmtLocal(c, lemon + 150)}</b></div>
          <button class="hub-obtn" style="--c:${c.color}" tabindex="-1">${esc(c.lang.btn)}</button>
        </div>
        <div class="hub-bub out">${esc(c.lang.thanks)}</div>
      </div>`,
  };
}
function renderGeo(anim) {
  const c = COUNTRIES.find(x => x.id === country);
  const html = geoCards(c);
  const cards = $$('.hub-g', root);
  const fill = () => cards.forEach(n => { n.innerHTML = html[n.dataset.g]; n.style.setProperty('--c', c.color); });
  if (!anim) { fill(); return; }
  gsap.to(cards, { opacity: 0, y: -10, rotateX: 12, duration: 0.22, stagger: 0.03, ease: 'power2.in', onComplete: () => {
    fill();
    gsap.fromTo(cards, { opacity: 0, y: 16, rotateX: -14 }, { opacity: 1, y: 0, rotateX: 0, duration: 0.5, stagger: 0.06, ease: 'back.out(1.4)', clearProps: 'transform' });
    gsap.fromTo($$('.hub-big, .hub-tax b', root), { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, delay: 0.15, ease: 'back.out(2.5)', stagger: 0.05 });
  } });
}
function setCountry(id) {
  if (id === country) return;
  country = id;
  $$('.hub-cty', root).forEach(b => b.classList.toggle('on', b.dataset.c === id));
  renderGeo(true);
  updateGeoCharts();
  const c = COUNTRIES.find(x => x.id === id);
  toast(`已切換為「${c.name}」設定（示範）`, `${c.cur}・${c.taxes.map(t => t[0] + ' ' + t[1]).join('、')}`, { kind: 'info', icon: icon('globe', 18) });
}
function xbData() {
  // 依 store 訂單推算：Zalo→越南、WhatsApp→馬來西亞、日文客人→日本，其餘為台灣
  const today = startOfDay(new Date()); const weeks = [];
  for (let w = 11; w >= 0; w--) {
    const from = addDays(today, -w * 7 - 6), to = addDays(today, -w * 7 + 1);
    const list = store.ordersBetween(from, to);
    const r = { label: `${from.getMonth() + 1}/${from.getDate()}`, tw: 0, vn: 0, my: 0, jp: 0 };
    for (const o of list) { const k = o.channel === 'zalo' ? 'vn' : o.channel === 'whatsapp' ? 'my' : o.lang === 'ja' ? 'jp' : 'tw'; r[k] += o.total; }
    weeks.push(r);
  }
  return weeks;
}
function fxOption() {
  const { base, idx } = fxSeries(12);
  const today = startOfDay(new Date());
  const x = Array.from({ length: 12 }, (_, i) => { const d = addDays(today, -(11 - i) * 7); return `${d.getMonth() + 1}/${d.getDate()}`; });
  const map = { VND: 'vn', MYR: 'my', JPY: 'jp' };
  return {
    animationDuration: 900,
    grid: { left: 4, right: 40, top: 34, bottom: 4, containLabel: true },
    legend: { top: 0, right: 0, itemWidth: 14, itemHeight: 4, data: Object.keys(idx).map(k => `TWD→${k}`) },
    tooltip: { trigger: 'axis', formatter: (ps) => `${ps[0].axisValue}<br/>` + ps.map(p => { const k = p.seriesName.slice(4); return `${p.marker}${p.seriesName}　指數 <b>${p.value.toFixed(1)}</b>（1 TWD ≈ ${(base[k] * p.value / 100).toFixed(k === 'MYR' ? 4 : k === 'JPY' ? 2 : 0)} ${k}）`; }).join('<br/>') },
    xAxis: { type: 'category', data: x, boundaryGap: false, axisLabel: { fontSize: 10.5, interval: 2 } },
    yAxis: { type: 'value', scale: true, axisLabel: { fontSize: 10.5 } },
    series: Object.entries(idx).map(([k, arr]) => {
      const c = COUNTRIES.find(z => z.id === map[k]); const sel = country === map[k] || country === 'tw';
      return { name: `TWD→${k}`, type: 'line', data: arr, smooth: 0.3, showSymbol: false, symbolSize: 8,
        lineStyle: { width: 2, color: c.color, opacity: sel ? 1 : 0.25 }, itemStyle: { color: c.color },
        endLabel: { show: sel, formatter: '{c}', color: '#d6f0e2', fontSize: 10.5 },
        areaStyle: country === map[k] ? { color: new window.echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: c.color + '44' }, { offset: 1, color: c.color + '00' }]) } : undefined };
    }),
  };
}
function xbOption() {
  const d = xbData();
  const keys = ['vn', 'my', 'jp'];
  return {
    animationDuration: 900,
    grid: { left: 4, right: 8, top: 34, bottom: 4, containLabel: true },
    legend: { top: 0, right: 0, itemWidth: 10, itemHeight: 10, data: keys.map(k => COUNTRIES.find(c => c.id === k).name) },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: v => 'NT$ ' + Math.round(v).toLocaleString() },
    xAxis: { type: 'category', data: d.map(x => x.label), axisLabel: { fontSize: 10.5, interval: 1 } },
    yAxis: { type: 'value', splitNumber: 4, axisLabel: { fontSize: 10.5, formatter: v => v >= 10000 ? (v / 10000) + '萬' : v } },
    series: keys.map(k => {
      const c = COUNTRIES.find(z => z.id === k); const dim = country !== 'tw' && country !== k;
      return { name: c.name, type: 'bar', stack: 'xb', barWidth: '56%', data: d.map(x => x[k]),
        itemStyle: { color: c.color, opacity: dim ? 0.3 : 1, borderColor: 'rgba(6,26,19,0.9)', borderWidth: 1, borderRadius: k === 'jp' ? [4, 4, 0, 0] : 0 } };
    }),
  };
}
function updateGeoCharts() {
  if (charts.fx) charts.fx.setOption(fxOption(), true);
  if (charts.xb) charts.xb.setOption(xbOption(), true);
  const d = xbData();
  const tot = d.reduce((a, x) => a + x.tw + x.vn + x.my + x.jp, 0), xb = d.reduce((a, x) => a + x.vn + x.my + x.jp, 0);
  const s = $('#hubXbShare', root); if (s) s.textContent = `近 12 週跨境 ${money(xb)}・占 ${(xb / tot * 100).toFixed(1)}%`;
}
function showGeo() {
  if (!charts.fx) charts.fx = makeChart($('#hubFx', root));
  if (!charts.xb) charts.xb = makeChart($('#hubXb', root));
  updateGeoCharts();
}

// ====================================================================
// 資安與權限
// ====================================================================
const ROLE_COLS = [['負責人', STAFF[0].name], ['員工', STAFF.slice(1).map(x => x.name).join('、') || '（目前無員工）'], ['會計師／記帳士', '林雅婷 記帳士']];
const perms = PERMS.map(p => [...p]);
const PL = { full: ['完整', 'full'], view: ['唯讀', 'view'], none: ['—', 'none'] };
const LOCKED = new Set(['管理成員與權限', '匯出客戶個資', '管理串接與 API 金鑰']);
// 雙因素驗證名單：依 STAFF（最後一位員工尚未設定，可按「提醒設定」）
const twofa = [
  { name: OWN, role: '負責人', how: '驗證器 App', on: true },
  ...EMPS.map((x, i) => i === EMPS.length - 1 ? { name: x.name, role: '員工', how: '尚未設定', on: false } : { name: x.name, role: '員工', how: '簡訊驗證碼', on: true }),
  { name: '林雅婷', role: '記帳士', how: '驗證器 App', on: true },
];
const NO2FA = twofa.find(x => !x.on);
function secHTML() {
  return `
  <div class="hub-sec-title anim-in"><h3>${icon('shield', 18)} 資安與權限</h3><span class="chip-sm">示意設定・依部署模式調整</span></div>
  <div class="hub-sec">
    <div class="glass card hub-roles anim-in">
      <div class="card-h"><h3>${icon('users', 17)} 角色權限</h3><small class="hub-fine">點選員工、會計師欄位可調整</small></div>
      <div class="tbl-wrap"><table class="tbl hub-rtbl"><thead><tr><th>權限</th>${ROLE_COLS.map(([r, n]) => `<th><b>${r}</b><small>${esc(n)}</small></th>`).join('')}</tr></thead><tbody id="hubRoles"></tbody></table></div>
    </div>
    <div class="hub-sec-mid">
      <div class="glass card hub-2fa anim-in">
        <div class="card-h"><h3>${I.fp(17)} 雙因素驗證</h3><label class="hub-sw"><input type="checkbox" id="hub2fa" checked><i></i></label></div>
        <ul class="hub-2fa-list" id="hub2faList"></ul>
      </div>
      <div class="glass card hub-enc anim-in">
        <div class="card-h"><h3>${icon('lock', 17)} 資料加密</h3><span class="chip-sm"><i class="hub-live"></i>運作中</span></div>
        <ul class="hub-enc-list">
          <li>${I.key(15)}<span>傳輸加密</span><b>TLS 1.3</b></li>
          <li>${icon('db', 15)}<span>靜態資料加密</span><b>AES-256</b></li>
          <li>${icon('refresh', 15)}<span>金鑰輪替</span><b>每 90 天</b></li>
          <li>${icon('cloud', 15)}<span>異地備份</span><b>每日 03:00</b></li>
          <li>${icon('lock', 15)}<span>串接權杖</span><b>加密保存・可撤銷</b></li>
        </ul>
      </div>
    </div>
    <div class="glass card hub-audit anim-in">
      <div class="card-h"><h3>${icon('file', 17)} 稽核日誌</h3><span class="chip-sm">不可竄改・保留 5 年（示意）</span></div>
      <ul class="hub-audit-list" id="hubAudit"></ul>
    </div>
  </div>`;
}
function bindSec() {
  renderRoles(); render2fa(); renderAudit();
  $('#hubRoles', root).addEventListener('click', (e) => {
    const td = e.target.closest('td[data-r]'); if (!td) return;
    const r = +td.dataset.r, c = +td.dataset.c; const row = perms[r];
    if (LOCKED.has(row[0])) { toast('此權限僅限負責人', `「${row[0]}」為高風險權限，無法授予其他角色`, { kind: 'warn', icon: icon('lock', 18) }); return; }
    const order = ['none', 'view', 'full']; row[c] = order[(order.indexOf(row[c]) + 1) % 3];
    renderRoles();
    const cell = $(`td[data-r="${r}"][data-c="${c}"] .hub-pl`, root);
    gsap.fromTo(cell, { scale: 1.4 }, { scale: 1, duration: 0.45, ease: 'back.out(3)' });
    addAudit(OWN, `調整「${ROLE_COLS[c - 1][0]}」權限：${row[0]} → ${PL[row[c]][0] === '—' ? '無' : PL[row[c]][0]}`, 'warn');
  });
  $('#hub2fa', root).addEventListener('change', (e) => {
    const on = e.target.checked;
    toast(on ? '已要求所有成員啟用雙因素驗證' : '已關閉強制雙因素驗證', on ? '未設定的成員下次登入時需完成設定（示範）' : '不建議關閉：帳務與申報資料屬敏感資料', { kind: on ? 'ok' : 'warn', icon: I.fp(18) });
    addAudit(OWN, `${on ? '開啟' : '關閉'}強制雙因素驗證`, on ? 'ok' : 'warn');
    render2fa();
  });
  $('#hub2faList', root).addEventListener('click', (e) => {
    const b = e.target.closest('[data-remind]'); if (!b) return;
    b.disabled = true; b.textContent = '已提醒';
    const who = NO2FA ? NO2FA.name : '成員';
    toast(`已提醒${who}設定雙因素驗證`, '透過 LINE 與 Email 傳送設定連結（示範）', { kind: 'info', icon: icon('bell', 18) });
    addAudit('系統', `提醒${who}完成雙因素驗證設定`);
  });
}
function renderRoles() {
  $('#hubRoles', root).innerHTML = perms.map((p, r) => `<tr><td>${esc(p[0])}${LOCKED.has(p[0]) ? ` <span class="hub-lock" title="僅限負責人">${icon('lock', 11)}</span>` : ''}</td>${[1, 2, 3].map(c =>
    `<td data-r="${r}" data-c="${c}" class="${c === 1 ? 'own' : 'edit'}"><span class="hub-pl ${PL[p[c]][1]}">${p[c] === 'full' ? icon('check', 12) : p[c] === 'view' ? I.eye(12) : ''}${PL[p[c]][0]}</span></td>`).join('')}</tr>`).join('');
  $$('#hubRoles td.own', root).forEach(td => td.removeAttribute('data-r'));
}
function render2fa() {
  const force = $('#hub2fa', root)?.checked ?? true;
  const n = twofa.filter(x => x.on).length;
  $('#hub2faList', root).innerHTML = `<li class="hub-2fa-sum"><b>${n} / ${twofa.length}</b> 位成員已啟用${force ? '・強制啟用中' : ''}</li>` + twofa.map(x => `
    <li><span class="hub-av sm">${esc(x.name.slice(0, 1))}</span><div><b>${esc(x.name)}</b><small>${x.role}・${x.how}</small></div>
    ${x.on ? `<span class="hub-ok">${icon('check', 13)} 已啟用</span>` : `<button class="btn btn-ghost btn-sm" data-remind>提醒設定</button>`}</li>`).join('');
}
function seedAudit() {
  const now = Date.now();
  const seed = [
    [-5.2, '林雅婷 記帳士', '登入（驗證器 App 通過）', ''],
    [-5.0, '林雅婷 記帳士', '核准分錄 JE-0930-061（員工伙食費）', 'ok'],
    [-3.6, '系統', '玉山銀行 API 權杖自動更新', ''],
    [-2.1, OWN, '下載 9 月損益表', ''],
    EMPS.length ? [-1.4, EMPS[0].name, '嘗試存取帳務分錄（權限不足，已阻擋）', 'warn'] : [-1.4, '未知裝置', '嘗試登入負責人帳號（雙因素驗證未通過，已阻擋）', 'warn'],
    [-0.4, '系統', '每日異地備份完成（2.4 GB）', 'ok'],
  ];
  for (const [h, who, what, k] of seed) audit.unshift({ ts: now + h * 3600e3, who, what, k });
}
function addAudit(who, what, k = '') {
  audit.unshift({ ts: Date.now(), who, what, k, fresh: true });
  if (audit.length > 30) audit.pop();
  renderAudit();
}
function renderAudit() {
  const host = $('#hubAudit', root); if (!host) return;
  host.innerHTML = audit.slice(0, 9).map(a => `<li class="${a.k} ${a.fresh ? 'fresh' : ''}"><time class="mono">${fmtTime(a.ts)}</time><div><b>${esc(a.who)}</b><span>${esc(a.what)}</span></div></li>`).join('');
  const f = $('li.fresh', host);
  if (f) gsap.fromTo(f, { opacity: 0, x: -12, backgroundColor: 'rgba(94,224,196,0.18)' }, { opacity: 1, x: 0, backgroundColor: 'rgba(94,224,196,0)', duration: 0.9, clearProps: 'all' });
  audit.forEach(a => { a.fresh = false; });
}
