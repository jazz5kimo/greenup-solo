// 自動化中心：三步驟設定、白話自動化食譜、即時執行流水、n8n 地端流程匯出（皆為示範）
import { store, itemsText } from '../state.js';
import { $, $$, el, gsap, esc, money, pad, fmtTime, sleep, countUp, toast } from '../util.js';
import { icon, chIcon } from '../icons.js';
import { mulberry32, startOfDay, addDays, PRODUCT_MAP, LANG_LABEL } from '../data.js';
import { taxCalendar } from '../ledger.js';
import { RECIPES, RECIPE_MAP, CATS, CAT_MAP, CH_LABEL, LANG_NAME, n8nWorkflow } from '../auto-data.js';

let root, ctxGo;
const S = {
  wizard: [true, true, false],
  invite: true,
  recipes: Object.fromEntries(RECIPES.map(r => [r.id, { on: true, s: { ...r.defaults } }])),
  filter: 'all',
  open: null,       // 展開「調整」的食譜
  runs: [],         // 最近執行
  shown: null,      // 目前顯示在流程上的 run
};
let queue = Promise.resolve();
let modal = null;

const STEPS = [
  { key: 'take', name: '收單', icon: 'cart' },
  { key: 'pay', name: '收款', icon: 'coins' },
  { key: 'inv', name: '開電子發票', icon: 'receipt' },
  { key: 'book', name: '記帳', icon: 'book' },
  { key: 'stock', name: '扣庫存', icon: 'box' },
  { key: 'ship', name: '出貨通知', icon: 'truck' },
];

const WIZ = [
  { title: '開通接單', icon: 'chat', color: '#2DB674', desc: '客人從哪裡來都能接，AI 24 小時回覆。',
    items: [['LINE 官方帳號', '@amei-sweets（示範）'], ['官網商店', 'amei.greenup.shop（示範）'], ['電話', 'AI 電話客服代接']],
    auth: ['開啟 LINE 官方帳號授權頁…', '確認你是帳號管理員…', '連結官網商店與購物車…', '設定 AI 電話客服轉接…'] },
  { title: '開通收款', icon: 'coins', color: '#2E97D4', desc: '客人付款後，錢和訂單自動對起來。',
    items: [['信用卡', '綠界科技（示範）'], ['LINE Pay', '行動支付'], ['轉帳虛擬帳號', '玉山銀行・每筆訂單一個帳號']],
    auth: ['開啟金流商授權頁…', '驗證商店代號與收款帳戶…', '開通 LINE Pay 收款…', '產生轉帳虛擬帳號規則…'] },
  { title: '開通電子發票與報稅', icon: 'tax', color: '#DD5597', desc: '付款完自動開發票，每兩個月幫你整理好申報資料。',
    items: [['電子發票字軌', '10–11 月字軌 AB，自動取號（示範）'], ['營業稅 401 申報資料', '每期自動整理，負責人確認後才申報'], ['邀請記帳士（選填）', '王記帳士事務所（示範）']],
    auth: ['連線財政部電子發票整合服務平台（示範）…', '驗證統一編號與營業登記…', '取得 10–11 月字軌 AB，共 250 號…', '建立 401 申報資料範本…'] },
];

// ---------- 工具 ----------
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function todayRange() { const t = startOfDay(new Date()); return [t, addDays(t, 1)]; }
function todayOrders() { const [a, b] = todayRange(); return store.ordersBetween(a, b); }
const on = (id) => S.recipes[id].on;
const cfg = (id) => S.recipes[id].s;
function hm(d) { return fmtTime(d); }
function dayLabel(d) { const t = startOfDay(new Date()); const x = startOfDay(d); const diff = Math.round((t - x) / 864e5); return diff === 0 ? '今天' : diff === 1 ? '昨天' : `${x.getMonth() + 1}/${x.getDate()}`; }

function nextVat() {
  const now = new Date();
  const list = [...taxCalendar(now.getFullYear()), ...taxCalendar(now.getFullYear() + 1)].filter(x => x.k === 'vat' && x.d >= now);
  const n = list[0];
  const days = Math.ceil((startOfDay(n.d) - startOfDay(now)) / 864e5);
  const period = (n.t.match(/(\d+–\d+ 月)/) || [])[1] || '';
  return { d: n.d, days, period };
}

// 各食譜今日統計（由 store 今日訂單推算 + 固定種子）
function recipeStats() {
  const now = new Date();
  const [t0] = todayRange();
  const tO = todayOrders();
  const rng = mulberry32(hashStr(String(+t0)) ^ 0x5eed);
  const online = tO.filter(o => o.channel !== 'pos');
  const paid = tO.filter(o => o.status === 'paid');
  const last = (list) => list.length ? hm(list[list.length - 1].ts) : '—';
  const out = {};
  out.reply = { n: online.length * 3 + 4 + Math.floor(rng() * 6), last: online.length ? hm(online[online.length - 1].ts + 0) : '08:12' };
  out.paid = { n: paid.length, last: last(paid) };
  const overdue = store.orders.filter(o => o.status === 'pending' && o.ts < +t0);
  out.remind = { n: overdue.length, last: overdue.length ? `${pad(now.getHours())}:00` : '—' };
  const [dh, dm] = cfg('daily').time.split(':').map(Number);
  const sent = now.getHours() * 60 + now.getMinutes() >= dh * 60 + dm;
  out.daily = { n: sent ? 1 : 0, last: `${sent ? '今天' : '昨天'} ${cfg('daily').time}` };
  const yd = store.ordersBetween(addDays(t0, -1), t0);
  const prov = new Set(yd.filter(o => o.payment !== '現金').map(o => o.payment));
  const settleT = new Date(t0); settleT.setHours(9, 30);
  out.settle = { n: now > settleT ? Math.min(4, prov.size) : 0, last: `${now > settleT ? '今天' : '昨天'} 09:30` };
  const low = store.inventory().filter(p => p.low);
  out.stock = { n: low.length, last: low.length ? (cfg('stock').check === 'daily' ? '今天 08:00' : '今天 ' + last(tO)) : '—' };
  const v = nextVat();
  const trig = addDays(startOfDay(v.d), -cfg('vat').days);
  out.vat = { n: 0, last: `下次 ${trig.getMonth() + 1}/${trig.getDate()} 09:00`, next: true };
  const cd = cfg('close').day;
  const closeD = now.getDate() >= cd ? new Date(now.getFullYear(), now.getMonth(), cd) : new Date(now.getFullYear(), now.getMonth() - 1, cd);
  out.close = { n: now.getDate() === cd && now.getHours() >= 8 ? 1 : 0, last: `${closeD.getMonth() + 1}/${closeD.getDate()} 08:00` };
  const shipped = paid.filter(o => o.channel !== 'pos');
  out.track = { n: shipped.length, last: last(shipped) };
  for (const id of Object.keys(out)) if (!on(id)) out[id] = { n: 0, last: '已暫停', off: true };
  return out;
}

function heroStats() {
  const st = recipeStats();
  let runs = 0, mins = 0;
  for (const r of RECIPES) { runs += st[r.id].n; mins += st[r.id].n * r.mins; }
  const rng = mulberry32(hashStr('ok' + todayOrders().length));
  const fails = runs > 20 ? 1 + (rng() < 0.4 ? 1 : 0) : 0;
  const rate = runs ? (runs - fails) / runs * 100 : 100;
  return { runs, hours: mins / 60, rate, fails };
}

// ---------- 版面 ----------
export default {
  mount(section, { go }) {
    root = section; ctxGo = go;
    section.innerHTML = `
    <div class="au">
      <div class="au-hero glass anim-in">
        <div class="au-hero-txt">
          <span class="au-kicker">${icon('wand', 14)} 自動化中心 <span class="demo-badge">示範資料</span></span>
          <h2>設定一次，<b class="grad-txt">之後 AI 自己跑</b></h2>
          <p>客人下單、付款、開發票、記帳、出貨通知、報稅資料整理，全部在背景自動完成。你只要看結果、按確認。</p>
          <div class="au-hstats">
            <div><b id="auRuns">0</b><span>今天自動執行（次）</span></div>
            <div><b id="auHours">0</b><span>幫你省下（小時）</span></div>
            <div><b id="auRate">0</b><span id="auRateSub">成功率</span></div>
          </div>
          <div class="au-hero-btns">
            <button class="btn btn-primary au-sim" data-sim="paid">${icon('play', 16)} 模擬一筆網頁訂單</button>
            <button class="btn btn-ghost" data-preview>${icon('phone', 16)} 看今晚的銷售摘要</button>
          </div>
        </div>
        <div class="au-next"><div class="au-next-h">${icon('calendar', 15)} 接下來 AI 會自動做</div><ul id="auNext"></ul></div>
        <div class="au-orbit" aria-hidden="true">
          <svg class="au-orbit-svg" viewBox="0 0 260 260"><defs><linearGradient id="auOg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5EE0C4"/><stop offset="1" stop-color="#2DB674"/></linearGradient></defs>
            <circle cx="130" cy="130" r="100" class="au-orbit-track"/><circle cx="130" cy="130" r="100" class="au-orbit-run"/></svg>
          <div class="au-orbit-spin"><i></i></div>
          <div class="au-orbit-core"><b>全自動</b><small>AI 代理運作中</small></div>
          ${['cart|下單', 'coins|付款', 'receipt|開發票', 'book|記帳', 'truck|出貨'].map((x, i) => { const [ic, t] = x.split('|'); const a = -90 + i * 72; return `<span class="au-orbit-n" data-on="${i}" style="--a:${a}deg">${icon(ic, 18)}<em>${t}</em></span>`; }).join('')}
        </div>
      </div>

      <div class="au-wiz glass anim-in">
        <div class="au-sec-h">
          <div><h3>${icon('sparkle', 18)} 三步驟快速設定</h3><p>不用懂技術，每一步按「連線」就好，大約 3 分鐘。</p></div>
          <div class="au-ring" id="auRing"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="27" class="au-ring-bg"/><circle cx="32" cy="32" r="27" class="au-ring-fg" id="auRingFg"/></svg><b id="auRingTxt">2/3</b><small id="auRingSub">還差 1 步</small></div>
        </div>
        <div class="au-steps" id="auSteps"></div>
        <div class="au-sum" id="auSum"></div>
      </div>

      <div class="au-live glass anim-in">
        <div class="au-sec-h">
          <div><h3>${icon('cpu', 18)} 即時執行流水 <span class="live-dot">LIVE</span></h3><p>每一筆新訂單（銷售網頁、聊天、電話、門市 POS）都會在這裡一步步自動跑完。</p></div>
          <div class="au-live-btns">
            <button class="btn btn-ghost btn-sm" data-sim="pending">${icon('clock', 15)} 模擬未付款訂單</button>
            <button class="btn btn-primary au-sim" data-sim="paid">${icon('play', 16)} 模擬一筆網頁訂單</button>
          </div>
        </div>
        <div class="au-run-h" id="auRunH"></div>
        <div class="au-pipe" id="auPipe"></div>
        <div class="au-hist-h"><b>最近 10 次執行</b><small>點一下可在上方重看流程</small></div>
        <div class="au-hist" id="auHist"></div>
      </div>

      <div class="au-rc-wrap anim-in">
        <div class="au-rc-top">
          <div><h3>${icon('wand', 18)} 自動化開關</h3><p>每一張卡片就是一個「當…就自動…」的規則。打開就會跑，按「調整」改時間、天數或門檻。</p></div>
          <div class="au-filter" id="auFilter">${CATS.map(c => `<button class="au-fbtn${c.id === 'all' ? ' on' : ''}" data-f="${c.id}">${c.name}<i></i></button>`).join('')}</div>
        </div>
        <div class="au-rc-grid" id="auGrid"></div>
        <p class="au-safe">${icon('shield', 16)}<span><b>安全說明：</b>自動化<b>不會</b>自動送出報稅。營業稅、營所稅等申報一定由負責人（或你委託的記帳士）確認後才送出；AI 只負責把資料整理好、提醒你期限。</span></p>
      </div>

      <div class="au-n8n glass anim-in">
        <div class="au-n8n-l">
          <span class="au-n8n-ic">${icon('server', 22)}</span>
          <h3>地端版：每個自動化對應一條 n8n 流程</h3>
          <p>選擇「企業地端」部署時，這些自動化會在你自己的主機上用 <b>n8n</b>（開源流程自動化工具）執行。每張卡片都能「匯出 n8n 流程」，資料不離開公司。</p>
          <div class="au-arch">
            <span>${icon('bell', 15)}觸發<small>付款、訊息、排程</small></span><i>${icon('arrow', 14)}</i>
            <span class="n8">${icon('link', 15)}n8n<small>串接・排程・通知</small></span><i>${icon('arrow', 14)}</i>
            <span class="gu">${icon('db', 15)}GreenUP API<small>開票＋記帳＋扣庫存一次完成</small></span>
          </div>
          <button class="au-link au-go" data-go="deploy">${icon('deploy', 14)} 看三種部署模式（雲端／地端／雲地混合）</button>
          <small class="au-fine">核心交易（開發票、記帳、扣庫存）一律呼叫 GreenUP API 一次完成，n8n 不直接寫資料庫，不會發生「發票開了、帳沒記」的情況。示範格式，正式版由 GreenUP API 提供端點。</small>
        </div>
        <div class="au-n8n-list" id="auN8nList"></div>
      </div>
    </div>`;

    $$('[data-sim]', section).forEach(b => b.addEventListener('click', () => simulate(b.dataset.sim, b)));
    $$('[data-preview]', section).forEach(b => b.addEventListener('click', openPreview));
    $$('[data-go]', section).forEach(b => b.addEventListener('click', () => ctxGo(b.dataset.go)));
    $('#auFilter', section).addEventListener('click', (e) => { const b = e.target.closest('[data-f]'); if (b) setFilter(b.dataset.f); });

    renderWizard(false);
    renderRecipes();
    renderN8nList();
    seedRuns();
    S.shown = S.runs.find(r => r.status === 'done') || S.runs[0] || null;
    renderRun(S.shown);
    renderHist();

    store.on('order', ({ order }) => onOrder(order));
    store.on('order-updated', ({ order }) => onUpdated(order));
    store.on('reset', () => { S.runs = S.runs.filter(r => r.order.source !== 'live'); if (S.runs.length < 10) seedRuns(); S.shown = S.runs[0] || null; renderRun(S.shown); renderHist(); refreshStats(true); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal) closeModal(); });
  },
  show() { refreshStats(false); },
  hide() { closeModal(); },
};

// ---------- Hero 統計 ----------
function refreshStats(live) {
  const h = heroStats();
  countUp($('#auRuns', root), h.runs, { duration: live ? 1 : 1.6 });
  countUp($('#auHours', root), h.hours, { decimals: 1, duration: live ? 1 : 1.6 });
  countUp($('#auRate', root), h.rate, { decimals: 1, suffix: '%', duration: live ? 1 : 1.6 });
  renderNext();
  $('#auRateSub', root).textContent = h.fails ? `成功率（${h.fails} 次失敗已自動重試）` : '成功率';
  updateRecipeStats();
}

function renderNext() {
  const now = new Date();
  const items = [];
  const at = (d, h, m) => { const x = new Date(d); x.setHours(h, m, 0, 0); return x; };
  if (on('daily')) { const [h, m] = cfg('daily').time.split(':').map(Number); let d = at(now, h, m); if (d < now) d = addDays(d, 1); items.push({ d, t: `傳今日銷售摘要到你的 ${cfg('daily').to === 'mail' ? 'Email' : 'LINE'}`, ic: 'trend' }); }
  if (on('settle')) { let d = at(now, 9, 30); if (d < now) d = addDays(d, 1); items.push({ d, t: '金流撥款入帳，自動對帳沖銷', ic: 'bank' }); }
  if (on('remind')) { const n = store.orders.filter(o => o.status === 'pending').length; if (n) { const d = at(now, now.getHours() + 1, 0); items.push({ d, t: `檢查 ${n} 筆未付款，到時間就提醒`, ic: 'bell' }); } }
  if (on('vat')) { const v = nextVat(); const d = at(addDays(startOfDay(v.d), -cfg('vat').days), 9, 0); items.push({ d: d < now ? at(addDays(now, 1), 9, 0) : d, t: `整理營業稅 ${v.period} 申報資料給你確認`, ic: 'tax' }); }
  if (on('close')) { const cd = cfg('close').day; let d = new Date(now.getFullYear(), now.getMonth(), cd, 8); if (d < now) d = new Date(now.getFullYear(), now.getMonth() + 1, cd, 8); items.push({ d, t: `${d.getMonth() === 0 ? 12 : d.getMonth()} 月月結，損益表寄給你`, ic: 'book' }); }
  items.sort((a, b) => a.d - b.d);
  const host = $('#auNext', root); if (!host) return;
  host.innerHTML = items.slice(0, 4).map(x => `<li><span class="au-next-ic">${icon(x.ic, 14)}</span><span><b>${dayLabel2(x.d)} ${hm(x.d)}</b><small>${esc(x.t)}</small></span></li>`).join('') || '<li><small>目前沒有排程</small></li>';
}
function dayLabel2(d) { const t = startOfDay(new Date()); const diff = Math.round((startOfDay(d) - t) / 864e5); return diff === 0 ? '今天' : diff === 1 ? '明天' : `${d.getMonth() + 1}/${d.getDate()}`; }

// ---------- 三步驟精靈 ----------
function renderWizard(animate) {
  const host = $('#auSteps', root);
  host.innerHTML = WIZ.map((w, i) => {
    const done = S.wizard[i];
    return `<div class="au-step${done ? ' done' : ''}" data-i="${i}" style="--c:${w.color}">
      <div class="au-step-top"><span class="au-step-no">${done ? icon('check', 18) : i + 1}</span><span class="au-step-ic">${icon(w.icon, 22)}</span>
        <span class="au-step-st ${done ? 'ok' : 'todo'}">${done ? '已完成' : '待完成'}</span></div>
      <h4>${i + 1}. ${w.title}</h4><p>${w.desc}</p>
      <ul>${w.items.map((it, k) => {
        const optional = i === 2 && k === 2;
        const itemOn = done && (!optional || S.invite);
        return `<li class="${itemOn ? 'on' : ''}"><i>${itemOn ? icon('check', 12) : ''}</i><span><b>${it[0]}</b><small>${optional && done && !S.invite ? '未邀請（之後可在「整合與協作」邀請）' : it[1]}</small></span></li>`;
      }).join('')}</ul>
      ${i === 2 && !done ? `<label class="au-invite"><input type="checkbox" ${S.invite ? 'checked' : ''} data-invite> 同時邀請記帳士一起看帳（選填）</label>` : ''}
      <div class="au-step-foot">${done
        ? `<span class="au-step-okline">${icon('shield', 14)} 已安全連線（示範）</span><button class="au-link" data-redo="${i}">重新示範</button>`
        : `<button class="btn btn-primary au-connbtn" data-conn="${i}">${icon('link', 16)} 連線（示範）</button>`}</div>
      <div class="au-auth" hidden><div class="au-auth-spin"></div><ol></ol></div>
    </div>`;
  }).join('');
  $$('[data-conn]', host).forEach(b => b.addEventListener('click', () => connect(+b.dataset.conn)));
  $$('[data-redo]', host).forEach(b => b.addEventListener('click', () => { S.wizard[+b.dataset.redo] = false; renderWizard(true); toast('已還原為待完成', '可以再按一次「連線（示範）」看授權流程', { kind: 'info', icon: icon('refresh', 18) }); }));
  const inv = $('[data-invite]', host); if (inv) inv.addEventListener('change', () => { S.invite = inv.checked; });
  updateRing(animate);
  renderSummary(animate);
}

function updateRing(animate) {
  const n = S.wizard.filter(Boolean).length;
  const C = 2 * Math.PI * 27;
  const fg = $('#auRingFg', root);
  fg.style.strokeDasharray = C;
  const off = C * (1 - n / 3);
  if (animate && gsap) gsap.to(fg, { strokeDashoffset: off, duration: 0.9, ease: 'power3.out' }); else fg.style.strokeDashoffset = off;
  $('#auRingTxt', root).textContent = `${n}/3`;
  $('#auRingSub', root).textContent = n === 3 ? '全部完成' : `還差 ${3 - n} 步`;
  $('#auRing', root).classList.toggle('full', n === 3);
}

function renderSummary(animate) {
  const all = S.wizard.every(Boolean);
  const box = $('#auSum', root);
  const flow = ['客人下單', '付款', '開發票', '記帳', '出貨通知'];
  box.className = 'au-sum' + (all ? ' on' : '');
  box.innerHTML = `<span class="au-sum-ic">${icon(all ? 'check' : 'lock', 18)}</span>
    <div class="au-sum-flow">${flow.map((f, i) => `<span class="au-sum-chip">${f}</span>${i < flow.length - 1 ? `<i>${icon('arrow', 13)}</i>` : ''}`).join('')}<b>${all ? '，全部自動' : ''}</b></div>
    <small>${all ? '設定完成！從現在起，每一筆訂單都會自動跑完上面的流程。' : '完成第 3 步後，下面這條流程就會全部自動。'}</small>`;
  if (animate && all && gsap) {
    gsap.fromTo($$('.au-sum-chip, .au-sum-flow i, .au-sum-flow b', box), { opacity: 0, y: 10, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, stagger: 0.08, duration: 0.45, ease: 'back.out(2)' });
    gsap.fromTo(box, { boxShadow: '0 0 0 0 rgba(45,182,116,0.7)' }, { boxShadow: '0 0 0 14px rgba(45,182,116,0)', duration: 1.2 });
  }
}

async function connect(i) {
  const card = $(`.au-step[data-i="${i}"]`, root);
  const btn = $('[data-conn]', card); btn.disabled = true;
  const auth = $('.au-auth', card), ol = $('ol', auth);
  const lines = [...WIZ[i].auth]; if (i === 2 && S.invite) lines.push('寄出記帳士邀請（示範）…');
  ol.innerHTML = '';
  auth.hidden = false;
  if (gsap) gsap.fromTo(auth, { opacity: 0 }, { opacity: 1, duration: 0.25 });
  for (const t of lines) {
    const li = el(`<li><i></i>${esc(t)}</li>`); ol.appendChild(li);
    if (gsap) gsap.fromTo(li, { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.3 });
    await sleep(520);
    li.classList.add('ok'); $('i', li).innerHTML = icon('check', 11);
  }
  await sleep(250);
  S.wizard[i] = true;
  renderWizard(true);
  const nc = $(`.au-step[data-i="${i}"]`, root);
  if (gsap) {
    gsap.fromTo(nc, { scale: 0.97 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.5)' });
    gsap.fromTo($('.au-step-no', nc), { scale: 0, rotate: -90 }, { scale: 1, rotate: 0, duration: 0.6, ease: 'back.out(3)' });
  }
  toast(`第 ${i + 1} 步完成｜${WIZ[i].title}`, S.wizard.every(Boolean) ? '全部設定完成，之後每筆訂單都會自動處理' : '示範授權完成', { icon: icon('check', 18) });
}

// ---------- 自動化食譜 ----------
function chainHTML(r) {
  const c = r.chain(cfg(r.id));
  return `<div class="au-chain"><span class="au-when">${icon('bell', 12)}${esc(c.when)}</span>${c.then.map(t => `<i>${icon('arrow', 11)}</i><span class="au-do">${esc(t)}</span>`).join('')}</div>`;
}
function settingHTML(r) {
  const s = cfg(r.id);
  return r.settings.map(f => {
    let ctl = '';
    if (f.type === 'select') ctl = `<select data-k="${f.key}">${f.options.map(([v, t]) => `<option value="${v}"${String(s[f.key]) === v ? ' selected' : ''}>${t}</option>`).join('')}</select>`;
    else if (f.type === 'number') ctl = `<span class="au-num"><button data-step="-1" data-k="${f.key}" aria-label="減少">${icon('minus', 13)}</button><input type="number" inputmode="numeric" data-k="${f.key}" value="${s[f.key]}" min="${f.min}" max="${f.max}" step="${f.step}"><button data-step="1" data-k="${f.key}" aria-label="增加">${icon('plus', 13)}</button><em>${f.unit}</em></span>`;
    else ctl = `<label class="au-sw sm"><input type="checkbox" data-k="${f.key}"${s[f.key] ? ' checked' : ''}><i></i></label>`;
    return `<div class="au-set-row"><span>${f.label}${f.hint ? `<small>${f.hint}</small>` : ''}</span>${ctl}</div>`;
  }).join('');
}
function renderRecipes() {
  const grid = $('#auGrid', root);
  const st = recipeStats();
  grid.innerHTML = RECIPES.map(r => {
    const R = S.recipes[r.id], cat = CAT_MAP[r.cat];
    return `<article class="au-rc glass${R.on ? '' : ' off'}${S.open === r.id ? ' open' : ''}" data-id="${r.id}" data-cat="${r.cat}" style="--c:${r.color}">
      <div class="au-rc-h"><span class="au-rc-ic">${icon(r.icon, 20)}</span><span class="au-rc-cat" style="--cc:${cat.color}">${cat.name}</span>
        <label class="au-sw" title="開啟／關閉"><input type="checkbox" data-toggle${R.on ? ' checked' : ''} aria-label="${esc(r.title)}"><i></i></label></div>
      <h4>${esc(r.title)}</h4>
      ${chainHTML(r)}
      ${r.safe ? `<small class="au-rc-safe">${icon('lock', 12)} 只整理資料，不會自動送出申報</small>` : ''}
      ${r.core ? `<small class="au-rc-safe core">${icon('shield', 12)} 開票＋記帳＋扣庫存在同一筆交易完成，不會只做一半</small>` : ''}
      <div class="au-rc-stat"><span><b data-n>${st[r.id].n}</b> 次<small>今日執行</small></span><span><b data-last>${st[r.id].last}</b><small>${st[r.id].next ? '排程' : '上次執行'}</small></span><span class="au-rc-state">${R.on ? '<i></i>運作中' : '已暫停'}</span></div>
      <div class="au-rc-foot">
        <button class="btn btn-ghost btn-sm" data-adj>${icon('wand', 14)} 調整</button>
        ${r.preview ? `<button class="btn btn-ghost btn-sm" data-preview>${icon('phone', 14)} 手機預覽</button>` : ''}
        <button class="btn btn-ghost btn-sm au-x" data-n8n>${icon('external', 14)} 匯出 n8n 流程</button>
      </div>
      <div class="au-set"${S.open === r.id ? '' : ' hidden'}>${settingHTML(r)}</div>
    </article>`;
  }).join('');
  applyFilter(false);
  updateFilterCounts();
  $$('.au-rc', grid).forEach(card => bindRecipe(card));
}
function bindRecipe(card) {
  const id = card.dataset.id, r = RECIPE_MAP[id];
  const tg = $('[data-toggle]', card);
  tg.addEventListener('change', () => {
    if (!tg.checked) { tg.checked = true; confirmOff(r); }
    else setOn(id, true);
  });
  $('[data-adj]', card).addEventListener('click', () => {
    const box = $('.au-set', card);
    const opening = box.hidden;
    $$('.au-rc.open', root).forEach(c => { if (c !== card) { c.classList.remove('open'); $('.au-set', c).hidden = true; } });
    S.open = opening ? id : null;
    card.classList.toggle('open', opening);
    box.hidden = !opening;
    if (opening && gsap) gsap.fromTo(box, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.3 });
  });
  const pv = $('[data-preview]', card); if (pv) pv.addEventListener('click', openPreview);
  $('[data-n8n]', card).addEventListener('click', () => openN8n(id));
  const box = $('.au-set', card);
  const commit = (key, val) => {
    const f = r.settings.find(x => x.key === key);
    if (f.type === 'number') { val = Math.max(f.min, Math.min(f.max, Math.round(+val / f.step) * f.step || f.min)); }
    cfg(id)[key] = val;
    const chain = $('.au-chain', card); chain.outerHTML = chainHTML(r);
    const nc = $('.au-chain', card); if (gsap) gsap.fromTo(nc, { backgroundColor: 'rgba(94,224,196,0.14)' }, { backgroundColor: 'rgba(94,224,196,0)', duration: 1 });
    if (f.type === 'number') { const inp = $(`input[data-k="${key}"]`, box); inp.value = val; }
    updateRecipeStats();
    refreshStats(true);
    toast('設定已更新', `${f.label}：${f.type === 'toggle' ? (val ? '開啟' : '關閉') : f.type === 'select' ? f.options.find(o => o[0] === String(val))[1] : val + ' ' + f.unit}`, { kind: 'info', icon: icon('check', 18), duration: 2600 });
  };
  box.addEventListener('change', (e) => {
    const t = e.target; if (!t.dataset.k) return;
    commit(t.dataset.k, t.type === 'checkbox' ? t.checked : t.type === 'number' ? +t.value : t.value);
  });
  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-step]'); if (!b) return;
    const f = r.settings.find(x => x.key === b.dataset.k);
    commit(b.dataset.k, +cfg(id)[b.dataset.k] + (+b.dataset.step) * f.step);
  });
}
function setOn(id, val) {
  S.recipes[id].on = val;
  const card = $(`.au-rc[data-id="${id}"]`, root);
  card.classList.toggle('off', !val);
  $('[data-toggle]', card).checked = val;
  $('.au-rc-state', card).innerHTML = val ? '<i></i>運作中' : '已暫停';
  if (gsap) gsap.fromTo(card, { scale: 0.985 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
  refreshStats(true);
  updateFilterCounts();
  renderN8nList();
  const r = RECIPE_MAP[id];
  toast(val ? '自動化已開啟' : '自動化已暫停', r.title, { kind: val ? 'ok' : 'warn', icon: icon(val ? 'check' : 'alert', 18) });
}
function confirmOff(r) {
  openModal(`<div class="au-dlg au-dlg-sm">
    <div class="au-dlg-h"><span class="au-dlg-ic warn">${icon('alert', 20)}</span><div><b>確定要關閉這個自動化？</b><small>${esc(r.title)}</small></div></div>
    <p class="au-dlg-p">${esc(r.offWarn)}</p>
    ${r.id === 'paid' ? `<p class="au-dlg-note">${icon('receipt', 14)} 關閉後，新的付款訂單會停在「收款」這一步，並提示「需要手動開票」。</p>` : ''}
    ${r.id === 'vat' ? `<p class="au-dlg-note">${icon('calendar', 14)} 下一期營業稅截止日 ${fmtMDx(nextVat().d)}，還有 ${nextVat().days} 天。</p>` : ''}
    <div class="au-dlg-btns"><button class="btn btn-ghost" data-close>保留開啟</button><button class="btn au-btn-warn" data-ok>仍要關閉</button></div>
  </div>`, (m) => { $('[data-ok]', m).addEventListener('click', () => { closeModal(); setOn(r.id, false); }); });
}
const fmtMDx = (d) => `${d.getMonth() + 1}/${d.getDate()}`;

function setFilter(f) {
  S.filter = f;
  $$('.au-fbtn', root).forEach(b => b.classList.toggle('on', b.dataset.f === f));
  applyFilter(true);
}
function applyFilter(animate) {
  const cards = $$('.au-rc', root);
  const vis = [];
  cards.forEach(c => { const show = S.filter === 'all' || c.dataset.cat === S.filter; c.hidden = !show; if (show) vis.push(c); });
  if (animate && gsap) gsap.fromTo(vis, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.04, ease: 'power2.out', clearProps: 'transform' });
}
function updateFilterCounts() {
  $$('.au-fbtn', root).forEach(b => {
    const list = RECIPES.filter(r => b.dataset.f === 'all' || r.cat === b.dataset.f);
    $('i', b).textContent = `${list.filter(r => on(r.id)).length}/${list.length}`;
  });
}
function updateRecipeStats() {
  const st = recipeStats();
  for (const r of RECIPES) {
    const card = $(`.au-rc[data-id="${r.id}"]`, root); if (!card) continue;
    const nEl = $('[data-n]', card), lEl = $('[data-last]', card);
    if (nEl.textContent !== String(st[r.id].n)) { nEl.textContent = st[r.id].n; if (gsap) gsap.fromTo(nEl, { color: '#5EE0C4', scale: 1.3 }, { color: '', scale: 1, duration: 0.8 }); }
    lEl.textContent = st[r.id].last;
  }
}

// ---------- n8n ----------
function renderN8nList() {
  const host = $('#auN8nList', root);
  host.innerHTML = RECIPES.map(r => {
    const wf = n8nWorkflow(r.id, cfg(r.id));
    return `<button class="au-n8n-row${on(r.id) ? '' : ' off'}" data-wf="${r.id}" style="--c:${r.color}"><span class="au-n8n-dot">${icon(r.icon, 14)}</span><span class="au-n8n-name">${esc(wf.name.replace('GreenUP｜', ''))}</span><em>${wf.nodes.length} 個節點</em>${icon('external', 14)}</button>`;
  }).join('');
  $$('[data-wf]', host).forEach(b => b.addEventListener('click', () => openN8n(b.dataset.wf)));
}
function hiJSON(s) {
  return esc(s).replace(/(&quot;(?:[^&]|&(?!quot;))*?&quot;)(\s*:)?|\b(true|false|null)\b|(-?\b\d+(?:\.\d+)?\b)/g, (m, str, colon, kw, n) => {
    if (str) return colon ? `<span class="k">${str}</span>${colon}` : `<span class="s">${str}</span>`;
    if (kw) return `<span class="b">${kw}</span>`;
    return `<span class="n">${n}</span>`;
  });
}
function openN8n(id) {
  const r = RECIPE_MAP[id];
  const wf = n8nWorkflow(id, cfg(id));
  const text = JSON.stringify(wf, null, 2);
  const typeName = (t) => ({ 'n8n-nodes-base.webhook': 'Webhook', 'n8n-nodes-base.httpRequest': 'HTTP Request', 'n8n-nodes-base.if': 'IF', 'n8n-nodes-base.scheduleTrigger': 'Schedule', 'n8n-nodes-base.wait': 'Wait', 'n8n-nodes-base.emailSend': 'Email' }[t] || t);
  const typeCls = (t) => t.split('.').pop();
  openModal(`<div class="au-dlg au-dlg-wf">
    <div class="au-dlg-h"><span class="au-dlg-ic" style="--c:${r.color}">${icon(r.icon, 20)}</span><div><b>${esc(wf.name)}</b><small>n8n workflow JSON・${wf.nodes.length} 個節點・可直接在 n8n 用「Import from File／貼上」匯入</small></div><button class="icon-btn" data-close aria-label="關閉">${icon('x', 18)}</button></div>
    <div class="au-wf-nodes">${wf.nodes.map((n, i) => `<span class="au-wf-n t-${typeCls(n.type)}"><em>${typeName(n.type)}</em>${esc(n.name)}</span>${i < wf.nodes.length - 1 ? `<i>${icon('arrow', 12)}</i>` : ''}`).join('')}</div>
    <pre class="au-code" tabindex="0"><code>${hiJSON(text)}</code></pre>
    <div class="au-dlg-foot"><small>${icon('alert', 13)} 示範格式，正式版由 GreenUP API 提供端點。核心交易只呼叫 GreenUP API 一次，n8n 不直接寫資料庫。</small>
      <div class="au-dlg-btns"><button class="btn btn-ghost btn-sm" data-dl>${icon('file', 14)} 下載 .json</button><button class="btn btn-primary btn-sm" data-copy>${icon('check', 14)} 複製</button></div></div>
  </div>`, (m) => {
    $('[data-copy]', m).addEventListener('click', (e) => copyText(text, e.currentTarget, $('.au-code', m)));
    $('[data-dl]', m).addEventListener('click', () => {
      try {
        const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
        const a = document.createElement('a'); a.href = url; a.download = `greenup-${id}.n8n.json`; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        toast('已下載流程檔', `greenup-${id}.n8n.json`, { icon: icon('file', 18) });
      } catch { toast('無法下載', '瀏覽器封鎖了下載，請改用「複製」', { kind: 'warn', icon: icon('alert', 18) }); }
    });
  });
}
async function copyText(text, btn, pre) {
  let ok = false;
  try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); ok = true; } } catch { ok = false; }
  if (!ok) {
    try {
      const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
      document.body.appendChild(ta); ta.select(); ok = document.execCommand('copy'); ta.remove();
    } catch { ok = false; }
  }
  if (ok) {
    btn.innerHTML = `${icon('check', 14)} 已複製`; btn.classList.add('done');
    setTimeout(() => { btn.innerHTML = `${icon('check', 14)} 複製`; btn.classList.remove('done'); }, 1800);
    toast('已複製到剪貼簿', '到 n8n 新增流程後按 Ctrl＋V 貼上即可', { icon: icon('check', 18) });
  } else {
    try { const rg = document.createRange(); rg.selectNodeContents(pre); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(rg); } catch { /* ignore */ }
    toast('無法存取剪貼簿', '已幫你選取全部內容，請按 Ctrl＋C（Mac：⌘＋C）複製', { kind: 'warn', icon: icon('alert', 18) });
  }
}

// ---------- 今日銷售摘要（手機預覽） ----------
function dailySummary() {
  const tO = todayOrders();
  const k = store.kpis();
  const qty = {};
  for (const o of tO) for (const it of o.items) qty[it.pid] = (qty[it.pid] || 0) + it.qty;
  const top = Object.entries(qty).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([pid, q]) => ({ name: PRODUCT_MAP[pid].name, q }));
  const ch = {};
  for (const o of tO) ch[o.channel] = (ch[o.channel] || 0) + 1;
  const topCh = Object.entries(ch).sort((a, b) => b[1] - a[1])[0];
  const pend = store.orders.filter(o => o.status === 'pending');
  const ship = tO.filter(o => o.channel !== 'pos' && o.status === 'paid').length;
  const low = store.inventory().filter(p => p.low);
  const v = nextVat();
  const todo = [];
  if (ship) todo.push(`包裝出貨 ${ship} 件（小傑負責，託運單已建好）`);
  for (const p of low.slice(0, 2)) todo.push(`補貨：${p.name}剩 ${p.current} 件，低於安全量 ${p.safety}（採購單草稿已備好）`);
  if (pend.length) todo.push(`${pend.length} 筆未付款，AI 明早 10:00 會用客人的語言再提醒`);
  if (v.days <= 14) todo.push(`營業稅 ${v.period} 申報資料待你確認（${fmtMDx(v.d)} 截止）`);
  else todo.push(`營業稅 ${v.period} 還有 ${v.days} 天截止，資料 AI 持續整理中`);
  return { rev: k.today, n: tO.length, delta: k.todayDelta, top, topCh, pend: store.sum(pend), pendN: pend.length, todo };
}
function openPreview() {
  const d = dailySummary();
  const s = cfg('daily');
  const now = new Date();
  openModal(`<div class="au-dlg au-dlg-phone">
    <button class="icon-btn au-dlg-x" data-close aria-label="關閉">${icon('x', 18)}</button>
    <div class="au-phone">
      <div class="au-ph-bar"><span>${s.time}</span><span class="au-ph-notch"></span><span>5G ▮▮▮</span></div>
      <div class="au-ph-h"><span class="au-ph-av">G</span><div><b>GreenUP 小幫手</b><small>官方帳號・示範</small></div></div>
      <div class="au-ph-body">
        <div class="au-ph-date">${now.getMonth() + 1}/${now.getDate()}（${'日一二三四五六'[now.getDay()]}）${s.time}</div>
        <div class="au-ph-msg">
          <div class="au-ph-card">
            <div class="au-ph-ttl">${icon('trend', 14)} 今日銷售摘要</div>
            <div class="au-ph-big"><small>今日營收（含稅）</small><b data-cu="${d.rev}">NT$ 0</b><em class="${d.delta >= 0 ? 'up' : 'down'}">${d.delta >= 0 ? '▲' : '▼'} ${Math.abs(d.delta).toFixed(0)}% vs 昨天同時段</em></div>
            <div class="au-ph-grid">
              <span><small>訂單數</small><b>${d.n} 筆</b></span>
              <span><small>最多來自</small><b>${d.topCh ? (CH_LABEL[d.topCh[0]] || d.topCh[0]).replace(' AI 導購', '') + ' ' + d.topCh[1] + ' 筆' : '—'}</b></span>
              <span><small>待收款</small><b class="warn">${money(d.pend)}</b><em>${d.pendN} 筆</em></span>
              <span><small>賣最多</small><b>${d.top[0] ? esc(d.top[0].name) : '—'}</b><em>${d.top[0] ? d.top[0].q + ' 份' : ''}</em></span>
            </div>
            ${d.top.length ? `<div class="au-ph-top">${d.top.map((t, i) => `<span><i>${i + 1}</i>${esc(t.name)}<em>×${t.q}</em></span>`).join('')}</div>` : ''}
          </div>
          ${s.tomorrow ? `<div class="au-ph-card"><div class="au-ph-ttl">${icon('calendar', 14)} 明天要做的事</div><ol class="au-ph-todo">${d.todo.map(t => `<li>${esc(t)}</li>`).join('')}</ol></div>` : ''}
          <div class="au-ph-btns"><span>看完整報表</span><span>問 AI</span></div>
        </div>
      </div>
    </div>
    <div class="au-ph-side">
      <b>每天 ${s.time} 自動傳到${s.to === 'mail' ? '你的 Email' : '你的 LINE'}</b>
      <p>數字直接從今天的訂單計算（示範資料）。不用打開電腦，躺在沙發上就知道今天賣了什麼。</p>
      <button class="btn btn-primary btn-sm" data-sendnow>${icon('send', 14)} 現在傳一次給我（示範）</button>
    </div>
  </div>`, (m) => {
    const b = $('[data-cu]', m); countUp(b, +b.dataset.cu, { prefix: 'NT$ ', from: 0, duration: 1.2 });
    if (gsap) gsap.fromTo($$('.au-ph-card, .au-ph-btns', m), { opacity: 0, y: 16 }, { opacity: 1, y: 0, stagger: 0.15, duration: 0.5, delay: 0.15, ease: 'power3.out' });
    $('[data-sendnow]', m).addEventListener('click', () => toast('今日銷售摘要已傳出（示範）', `今日營收 ${money(d.rev)}・${d.n} 筆訂單`, { icon: icon('send', 18) }));
  });
}

// ---------- 對話框 ----------
function openModal(html, bind) {
  closeModal();
  modal = el(`<div class="au-modal" role="dialog" aria-modal="true">${html}</div>`);
  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => { if (e.target === modal || e.target.closest('[data-close]')) closeModal(); });
  bind && bind(modal);
  if (gsap) { gsap.fromTo(modal, { opacity: 0 }, { opacity: 1, duration: 0.2 }); gsap.fromTo(modal.firstElementChild, { y: 24, scale: 0.97, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.5)' }); }
}
function closeModal() { if (modal) { modal.remove(); modal = null; } }

// ---------- 即時執行流水 ----------
function makeRun(order, live) {
  const rng = mulberry32(hashStr(order.id));
  const gaps = [0, 80 + rng() * 160, 180 + rng() * 240, 40 + rng() * 80, 30 + rng() * 60, 150 + rng() * 250].map(Math.round);
  const t = []; gaps.reduce((a, g, i) => (t[i] = a + g), 0);
  const run = { order, live, t, steps: STEPS.map(() => 'idle'), status: 'idle', at: live ? Date.now() : order.ts, manual: false, noShip: false };
  if (!live) settleRun(run);
  return run;
}
function settleRun(run) { // 歷史訂單直接算出結果（不播動畫）
  const o = run.order;
  run.steps[0] = 'done';
  if (o.status === 'pending') { run.steps[1] = 'wait'; run.status = 'wait'; return; }
  run.steps = run.steps.map(() => 'done');
  run.status = 'done';
}
function seedRuns() {
  const have = new Set(S.runs.map(r => r.order.id));
  const list = store.orders.slice(-14).reverse().filter(o => !have.has(o.id));
  for (const o of list) { if (S.runs.length >= 10) break; S.runs.push(makeRun(o, false)); }
  S.runs.sort((a, b) => b.at - a.at);
}

function stepInfo(run, i) {
  const o = run.order;
  const lang = LANG_NAME[o.lang] || LANG_LABEL[o.lang] || '中文';
  switch (i) {
    case 0: return { v: CH_LABEL[o.channel] || o.channel, sub: `${o.customer}・${itemsText(o.items)}`, extra: `<span class="au-mini">${LANG_LABEL[o.lang] || ''}</span>` };
    case 1: {
      const st = run.steps[1];
      if (st === 'wait') return { v: `等待付款・${o.payment}`, sub: `${on('remind') ? `超過 ${cfg('remind').first} 小時會用${lang}自動提醒` : '提醒已關閉，需自行聯絡'}`, extra: `<span class="au-mini warn">應收 ${money(o.total)}</span>` };
      return { v: o.payment, sub: `已收 ${money(o.total)}${o.createdPending ? '・沖銷應收' : ''}` };
    }
    case 2: if (run.steps[2] === 'manual') return { v: '需要手動開票', sub: '「付款後自動開發票」已關閉', extra: `<span class="au-mini warn">發票號預留 ${o.invoice}</span>` };
      return { v: `<span class="mono">${o.invoice}</span>`, sub: o.buyerTaxId ? `三聯式・統編 ${o.buyerTaxId}` : `銷售額 ${o.net.toLocaleString()}＋稅 ${o.tax.toLocaleString()}` };
    case 3: return { v: '產銷人發財・銷', sub: '', extra: `<div class="au-jr"><span><em>借</em>${o.createdPending ? '應收帳款' : '銀行存款'}<b>${o.total.toLocaleString()}</b></span><span><em class="cr">貸</em>銷貨收入<b>${o.net.toLocaleString()}</b></span><span><em class="cr">貸</em>銷項稅額<b>${o.tax.toLocaleString()}</b></span></div>` };
    case 4: {
      const inv = store.inventory();
      const parts = o.items.slice(0, 2).map(it => { const p = inv.find(x => x.id === it.pid); return `${PRODUCT_MAP[it.pid].name} −${it.qty}${p ? `（剩 ${p.current}）` : ''}`; });
      const low = o.items.map(it => inv.find(x => x.id === it.pid)).filter(p => p && p.low);
      return { v: parts[0] || '—', sub: parts.slice(1).join('・') + (o.items.length > 2 ? ` 等 ${o.items.length} 項` : ''), extra: low.length ? `<span class="au-mini warn">${esc(low[0].name)}低於安全量${on('stock') ? '，已產生採購單草稿' : ''}</span>` : '' };
    }
    case 5: {
      if (o.channel === 'pos') return { v: '現場取貨', sub: '門市已交付，不需出貨' };
      if (run.steps[5] === 'skip') return { v: '出貨通知已關閉', sub: '請自行通知出貨' };
      const who = { jie: '小傑', me: '我', both: '小傑和我' }[cfg('paid').notify];
      return { v: o.pickup ? '門市自取通知' : (o.region ? `宅配・${o.region}` : '冷藏宅配'), sub: `已通知${who}出貨・用${lang}告知客人` };
    }
  }
  return { v: '', sub: '' };
}

function renderRun(run) {
  const head = $('#auRunH', root), pipe = $('#auPipe', root);
  if (!run) { head.innerHTML = '<span class="au-idle">待命中，等待下一筆訂單…</span>'; pipe.innerHTML = ''; return; }
  const o = run.order;
  head.innerHTML = `<div class="au-rh-l">${chIcon(o.channel, 22)}<b class="mono">${o.id}</b><span>${esc(o.customer)}</span><span class="au-rh-amt">${money(o.total)}</span>${run.live ? '<span class="au-tag-live">剛剛</span>' : `<span class="au-rh-t">${dayLabel(o.ts)} ${hm(o.ts)}</span>`}</div>
    <div class="au-rh-r"><span class="au-rh-st" data-st></span><span class="au-rh-ms" data-ms></span></div>`;
  pipe.innerHTML = STEPS.map((s, i) => `${i ? `<div class="au-conn" data-c="${i}"><i class="au-conn-fill"></i><i class="au-conn-dot"></i></div>` : ''}
    <div class="au-node" data-s="${i}"><div class="au-node-top"><span class="au-node-ic">${icon(s.icon, 20)}<i class="au-node-ok">${icon('check', 11)}</i></span><span class="au-node-k"><small>步驟 ${i + 1}</small><b>${s.name}</b></span><span class="au-node-ms mono" data-t></span></div>
      <div class="au-node-v" data-v></div><div class="au-node-sub" data-sub></div><div class="au-node-x" data-x></div></div>`).join('');
  STEPS.forEach((_, i) => paintStep(run, i, false));
  paintHead(run);
}
function paintStep(run, i, animate) {
  if (S.shown !== run) return;
  const node = $(`.au-node[data-s="${i}"]`, root); if (!node) return;
  const st = run.steps[i];
  node.className = `au-node is-${st}`;
  const info = st === 'idle' ? { v: '<span class="au-dim">等待中</span>', sub: '' } : stepInfo(run, i);
  if (st === 'skip') { info.v = '<span class="au-dim">暫停</span>'; info.sub = '前一步需手動處理'; info.extra = ''; }
  $('[data-v]', node).innerHTML = info.v;
  $('[data-sub]', node).textContent = info.sub || '';
  $('[data-x]', node).innerHTML = info.extra || '';
  const tEl = $('[data-t]', node);
  tEl.textContent = (st === 'done' || st === 'wait' || st === 'manual') ? (i === 0 ? '+0 ms' : `+${run.t[i].toLocaleString()} ms`) : '';
  const conn = $(`.au-conn[data-c="${i}"]`, root);
  if (conn) {
    const lit = st !== 'idle' && st !== 'skip';
    conn.classList.toggle('lit', lit); conn.classList.toggle('warn', st === 'wait' || st === 'manual');
    if (animate && lit && gsap) {
      const vertical = getComputedStyle(conn).flexDirection === 'column' || conn.offsetHeight > conn.offsetWidth;
      gsap.fromTo($('.au-conn-fill', conn), vertical ? { scaleY: 0, scaleX: 1 } : { scaleX: 0, scaleY: 1 }, vertical ? { scaleY: 1, duration: 0.35, ease: 'power2.out' } : { scaleX: 1, duration: 0.35, ease: 'power2.out' });
    }
  }
  if (animate && gsap) {
    if (st === 'run') gsap.fromTo(node, { y: 6, opacity: 0.6 }, { y: 0, opacity: 1, duration: 0.3 });
    if (st === 'done' || st === 'wait' || st === 'manual') {
      if (st === 'done') gsap.fromTo($('.au-node-ok', node), { scale: 0 }, { scale: 1, duration: 0.45, ease: 'back.out(3)' });
      gsap.fromTo(node, { boxShadow: '0 0 0 0 rgba(94,224,196,0.55)' }, { boxShadow: '0 0 0 12px rgba(94,224,196,0)', duration: 0.8, clearProps: 'boxShadow' });
    }
  }
}
function paintHead(run) {
  if (S.shown !== run) return;
  const st = $('[data-st]', root), ms = $('[data-ms]', root);
  if (!st) return;
  const map = { done: ['ok', `${icon('check', 14)} 全自動完成`], wait: ['warn', `${icon('clock', 14)} 等待客人付款`], manual: ['warn', `${icon('alert', 14)} 需要手動開票`], run: ['run', '<i class="au-spin"></i> 自動處理中'], idle: ['run', '<i class="au-spin"></i> 準備中'] };
  const [cls, txt] = map[run.status] || map.idle;
  st.className = `au-rh-st ${cls}`; st.innerHTML = txt;
  const lastIdx = run.steps.reduce((a, s, i) => (s === 'done' || s === 'wait' || s === 'manual' ? i : a), 0);
  ms.textContent = run.status === 'done' ? `全程 ${(run.t[5] / 1000).toFixed(2)} 秒` : run.status === 'run' ? '' : `+${run.t[lastIdx].toLocaleString()} ms`;
}

function renderHist() {
  const host = $('#auHist', root);
  host.innerHTML = S.runs.slice(0, 10).map((r, idx) => {
    const o = r.order;
    const stTxt = { done: '全自動完成', wait: '等待付款（會提醒）', manual: '需手動開票', run: '處理中…', idle: '排隊中' }[r.status];
    const cls = { done: 'ok', wait: 'warn', manual: 'warn', run: 'run', idle: 'run' }[r.status];
    return `<button class="au-hrow${S.shown === r ? ' cur' : ''}" data-h="${idx}">
      <span class="au-h-t mono">${dayLabel(r.at) === '今天' ? '' : dayLabel(r.at) + ' '}${hm(r.at)}${r.live ? `:${pad(new Date(r.at).getSeconds())}` : ''}</span>
      ${chIcon(o.channel, 20)}
      <span class="au-h-c"><b>${esc(o.customer)}</b><small class="mono">${o.id}</small></span>
      <span class="au-h-amt">${money(o.total)}</span>
      <span class="au-h-dots">${r.steps.map(s => `<i class="d-${s}"></i>`).join('')}</span>
      <span class="au-h-st ${cls}">${stTxt}${r.status === 'done' ? `<small>${(r.t[5] / 1000).toFixed(2)} 秒</small>` : ''}</span>
    </button>`;
  }).join('');
  $$('[data-h]', host).forEach(b => b.addEventListener('click', () => {
    const r = S.runs[+b.dataset.h]; if (!r || r === S.shown) return;
    S.shown = r; renderRun(r); renderHist();
    if (gsap) gsap.fromTo($$('.au-node', root), { opacity: 0.3, y: 8 }, { opacity: 1, y: 0, stagger: 0.05, duration: 0.35 });
  }));
}

function pulseOrbit(i) {
  const n = $(`.au-orbit-n[data-on="${i}"]`, root); if (!n || !gsap) return;
  n.classList.add('hot'); setTimeout(() => n.classList.remove('hot'), 900);
}

async function play(run, from) {
  run.status = 'run';
  S.shown = run; renderRun(run); renderHist();
  const o = run.order;
  for (let i = from; i < STEPS.length; i++) {
    if (i === 1 && o.status === 'pending') {
      run.steps[1] = 'run'; paintStep(run, 1, true); await sleep(650);
      run.steps[1] = 'wait'; run.status = 'wait'; paintStep(run, 1, true); paintHead(run); renderHist(); pulseOrbit(1);
      showPayBtn(run);
      return;
    }
    if (i === 2 && !on('paid')) {
      run.steps[2] = 'manual'; for (let k = 3; k < 6; k++) run.steps[k] = 'skip';
      run.status = 'manual'; STEPS.forEach((_, k) => k >= 2 && paintStep(run, k, true)); paintHead(run); renderHist();
      toast('需要手動開票', `${o.id} 已收款，但「付款後自動開發票」已關閉`, { kind: 'warn', icon: icon('alert', 18) });
      return;
    }
    run.steps[i] = 'run'; paintStep(run, i, true);
    await sleep(i === 0 ? 450 : 620);
    run.steps[i] = 'done'; paintStep(run, i, true); paintHead(run); pulseOrbit(Math.min(4, [0, 1, 2, 3, 4, 4][i]));
    renderHistRow(run);
  }
  run.status = 'done'; paintHead(run); renderHist();
  const hs = $('#auRunH .au-rh-st', root); if (hs && gsap && S.shown === run) gsap.fromTo(hs, { scale: 1.25 }, { scale: 1, duration: 0.6, ease: 'back.out(3)' });
}
function renderHistRow(run) {
  const idx = S.runs.indexOf(run); const row = $(`.au-hrow[data-h="${idx}"]`, root); if (!row) return;
  $('.au-h-dots', row).innerHTML = run.steps.map(s => `<i class="d-${s}"></i>`).join('');
}
function showPayBtn(run) {
  if (S.shown !== run) return;
  const node = $('.au-node[data-s="1"] [data-x]', root); if (!node) return;
  if (run.order.source !== 'live') return;
  const b = el(`<button class="au-paybtn">${icon('coins', 13)} 模擬客人完成付款</button>`);
  node.appendChild(b);
  b.addEventListener('click', () => { b.disabled = true; store.markPaid(run.order.id); });
}

function onOrder(order) {
  if (S.runs.some(r => r.order.id === order.id)) return;
  const run = makeRun(order, true);
  S.runs.unshift(run); S.runs = S.runs.slice(0, 10);
  refreshStats(true);
  queue = queue.then(() => play(run, 0)).catch(() => {});
}
function onUpdated(order) {
  refreshStats(true);
  let run = S.runs.find(r => r.order.id === order.id);
  if (!run) { // 歷史待付款訂單被收款：加入流水
    if (order.status !== 'paid') return;
    run = makeRun(order, true); run.steps[0] = 'done'; run.at = Date.now();
    S.runs.unshift(run); S.runs = S.runs.slice(0, 10);
  }
  if (order.status !== 'paid' || run.status === 'done') return;
  run.order = order;
  queue = queue.then(async () => {
    run.at = Date.now(); run.live = true;
    S.shown = run; renderRun(run);
    run.steps[1] = 'run'; paintStep(run, 1, true); await sleep(500);
    run.steps[1] = 'done'; paintStep(run, 1, true);
    toast('付款完成，流程自動接續', `${order.id}・開發票 → 記帳 → 扣庫存 → 出貨通知`, { kind: 'info', icon: icon('play', 18) });
    await play(run, 2);
  }).catch(() => {});
}

function simulate(kind, btn) {
  if (btn) { btn.disabled = true; setTimeout(() => { btn.disabled = false; }, 1200); }
  const live = $('.au-live', root);
  if (live && live.getBoundingClientRect().top > window.innerHeight - 200) live.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (kind === 'pending') store.createOrder({ channel: 'line', customer: '佐藤 ゆき', lang: 'ja', items: [{ pid: 'roll', qty: 1 }, { pid: 'canele', qty: 1 }], payment: 'LINE Pay', status: 'pending' });
  else store.createOrder({ channel: 'web', customer: '測試客人', lang: 'zh', items: [{ pid: 'lemon', qty: 1 }], payment: '信用卡', status: 'paid' });
}
