// 後台：競標管理（簡單版）
// 建立拍品（兩個範本）→ 拍品清單與狀態 → 即時出價看板（銷售網頁出價即時出現）→ 提前結標 → 得標自動成立訂單、通知預覽、安慰券 → 集客成效
// 全部為示範資料：不代表真實金流、簡訊或拍賣平台串接。
import { $, $$, el, gsap, esc, money, countUp, toast as baseToast, pad } from '../util.js';
import { icon } from '../icons.js';
import { makeChart } from '../charts.js';
import { productArt } from '../art.js';
import { PRODUCTS } from '../data.js';
import { store } from '../state.js';
import { auctions, RULES, TEMPLATES, STATUS_LABEL, maskName, productOf } from '../auction-store.js';

const sv = (d, s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const IC = {
  gavel: '<path d="m14 13-7.5 7.5a2.1 2.1 0 0 1-3-3L11 10"/><path d="m16 16 6-6M8 8l6-6M9 7l8 8M21 11l-8-8"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  stop: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
  ticket: '<path d="M3 9a3 3 0 0 0 0 6v3h18v-3a3 3 0 0 1 0-6V6H3z"/><path d="M13 6v12" stroke-dasharray="2 2"/>',
  msg: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
};

const toast = (title, body = '', opt = {}) => baseToast(title, body, { icon: sv(opt.kind === 'warn' ? IC.stop : IC.gavel, 18), ...opt });
const LANG_NAME = { zh: '中文', en: 'English', ja: '日本語', vi: 'Tiếng Việt', ms: 'Bahasa Melayu' };
// 得標通知（依得標者語言）
const WIN_MSG = {
  zh: (v) => `${v.name} 您好，恭喜您以 ${v.price} 得標「${v.item}」！請在 ${v.payBy} 前完成付款（48 小時內），逾期將取消得標資格。付款連結：${v.link}`,
  en: (v) => `Hi ${v.name}, congratulations — you won "${v.item}" for ${v.price}! Please pay by ${v.payBy} (within 48 hours) or the win will be cancelled. Pay here: ${v.link}`,
  ja: (v) => `${v.name} 様、「${v.item}」を ${v.price} で落札されました。おめでとうございます！${v.payBy} まで（48 時間以内）にお支払いください。期限を過ぎると落札は取り消されます。お支払い：${v.link}`,
  vi: (v) => `Chào ${v.name}, chúc mừng bạn đã thắng "${v.item}" với giá ${v.price}! Vui lòng thanh toán trước ${v.payBy} (trong 48 giờ), quá hạn sẽ bị hủy. Thanh toán: ${v.link}`,
  ms: (v) => `Hai ${v.name}, tahniah — anda menang "${v.item}" pada ${v.price}! Sila bayar sebelum ${v.payBy} (dalam 48 jam) atau kemenangan dibatalkan. Bayar di sini: ${v.link}`,
};
const LOSE_MSG = {
  zh: (v) => `${v.name} 您好，謝謝參加「${v.item}」競標！這次差一點，送您一張 9 折券 ${v.code}，全館商品都能用。`,
  en: (v) => `Hi ${v.name}, thanks for bidding on "${v.item}"! So close this time — here is a 10%-off coupon ${v.code} for anything in the shop.`,
  ja: (v) => `${v.name} 様、「${v.item}」のオークションへのご参加ありがとうございました。全商品に使える 10% オフクーポン ${v.code} をお贈りします。`,
  vi: (v) => `Chào ${v.name}, cảm ơn bạn đã tham gia đấu giá "${v.item}"! Tặng bạn phiếu giảm 10% ${v.code} cho mọi sản phẩm.`,
  ms: (v) => `Hai ${v.name}, terima kasih kerana membida "${v.item}"! Ini kupon diskaun 10% ${v.code} untuk semua produk.`,
};

const FILTERS = [['all', '全部'], ['upcoming', '預告'], ['live', '進行中'], ['ended', '已結標'], ['sold', '已成交']];
const DURS = [[10, '10 分鐘（示範）'], [60, '1 小時'], [24 * 60, '24 小時'], [72 * 60, '3 天']];

let root = null;
let sel = null;
let filter = 'all';
let autoT = 0;
let chart = null;
let visible = false;
let lastSig = '';
let confirmClose = {};
const form = { tpl: 'one', pid: null, start: 1, inc: 10, dur: 10, buyNow: '', later: false };

const fmtClock = (ts) => { const d = new Date(ts); return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
function fmtLeft(ms) {
  ms = Math.max(0, ms);
  const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60;
  return (d ? `${d} 天 ` : '') + `${pad(h)}:${pad(m)}:${pad(ss)}`;
}
const ago = (ts) => { const m = Math.floor((Date.now() - ts) / 60000); return m < 1 ? '剛剛' : m < 60 ? `${m} 分鐘前` : m < 1440 ? `${Math.floor(m / 60)} 小時前` : `${Math.floor(m / 1440)} 天前`; };
const pname = (a) => productOf(a.pid)?.name || a.pid;
const grp = (st) => (st === 'nobid' ? 'ended' : st === 'closing' ? 'live' : st);
const kindTag = (a) => `<span class="aa-kind ${a.kind}">${a.kind === 'one' ? '1 元起標・集客' : '一般競標'}</span>`;
const stPill = (st) => `<span class="aa-st ${st}"><i></i>${STATUS_LABEL[st]}</span>`;
function artOf(pid, size) {
  try { return productArt(pid, size); } catch { return ''; }
}

/* ---------- 版面 ---------- */
function layout() {
  return `<div class="aa">
    <div class="glass aa-head anim-in">
      <div class="aa-head-t">
        <div class="aa-badges"><span class="demo-badge">${icon('alert', 13)} 示範資料・非真實金流／簡訊</span><span class="chip-sm">${sv(IC.gavel, 12)} 簡單版：一般加價競標</span></div>
        <h2>競標管理：<span class="grad-txt">1 元起標，把人潮變會員</span></h2>
        <p>挑一樣商品、選範本、按建立，銷售網頁就會出現競標。客人出價會即時跳到這裡；時間到自動結標、成立訂單、通知得標者付款，沒得標的人自動收到 9 折券。</p>
      </div>
      <div class="aa-head-act">
        <a class="btn btn-primary" href="shop.html#auction" target="greenup-shop">${sv(IC.ext, 16)} 開啟銷售網頁競標區</a>
        <label class="aa-auto"><input type="checkbox" id="aaAuto"><span class="aa-sw"></span><span><b>自動模擬買家出價</b><small>每 6 秒有一位虛構買家出價，方便一個人示範</small></span></label>
      </div>
    </div>
    <div class="aa-kpis" id="aaKpis"></div>
    <div class="aa-main">
      <section class="glass card aa-list-card anim-in">
        <div class="card-h"><h3>${sv(IC.gavel, 16)} 拍品清單</h3><div class="aa-filters" id="aaFilters"></div></div>
        <div class="aa-list" id="aaList"></div>
      </section>
      <section class="glass card aa-feed-card anim-in">
        <div class="card-h"><h3><span class="aa-live-dot"></span>即時出價看板</h3><span class="chip-sm">銷售網頁出價會即時出現</span></div>
        <ol class="aa-feed" id="aaFeed"></ol>
      </section>
    </div>
    <div class="aa-row2">
      <section class="glass card aa-detail anim-in" id="aaDetail"></section>
      <section class="glass card aa-create anim-in" id="aaCreate"></section>
    </div>
    <section class="glass card aa-perf anim-in">
      <div class="card-h"><h3>${sv(IC.eye, 16)} 集客成效</h3><span class="chip-sm">示範數據：每場競標帶來的人潮與會員</span></div>
      <div class="aa-perf-grid">
        <div class="aa-chart" id="aaChart"></div>
        <div class="aa-insight" id="aaInsight"></div>
      </div>
    </section>
  </div>`;
}

/* ---------- KPI ---------- */
const KPI = [
  { k: 'live', label: '進行中拍品', c: '#EC6A55', ic: IC.gavel, sub: (s) => `共 ${s.count} 場（含預告與已結標）` },
  { k: 'todayBids', label: '今日出價次數', c: '#2DB674', ic: IC.bolt, sub: (s) => `累計 ${s.bids.toLocaleString()} 次` },
  { k: 'bidders', label: '出價人數', c: '#2E97D4', ic: IC.share, sub: () => '同一支手機只算一人' },
  { k: 'views', label: '觀看數', c: '#7C62E6', ic: IC.eye, sub: (s) => `分享 ${s.shares.toLocaleString()} 次` },
  { k: 'members', label: '新加入會員', c: '#F0A531', ic: IC.msg, sub: () => '首次出價完成手機驗證' },
  { k: 'cUsed', label: '安慰券帶來訂單', c: '#DD5597', ic: IC.ticket, sub: (s) => `已發 ${s.cIssued} 張・帶動 ${money(s.cRev)}` },
];
function renderKpis(animate) {
  const s = auctions.stats();
  const host = $('#aaKpis', root);
  if (!host.children.length) {
    host.innerHTML = KPI.map(k => `<div class="kpi glass aa-kpi anim-in" data-k="${k.k}" style="--c:${k.c}"><div class="kpi-top"><span class="kpi-ic">${sv(k.ic, 17)}</span><span class="kpi-label">${k.label}</span></div><div class="kpi-val" data-val>0</div><div class="kpi-sub" data-sub></div></div>`).join('');
  }
  for (const k of KPI) {
    const n = $(`[data-k="${k.k}"]`, host);
    const v = $('[data-val]', n);
    const prev = +v.dataset.value || 0;
    if (animate || prev !== s[k.k]) countUp(v, s[k.k], { duration: animate ? 1.2 : 0.6 });
    if (!animate && prev && prev !== s[k.k]) { n.classList.remove('flash'); void n.offsetWidth; n.classList.add('flash'); }
    $('[data-sub]', n).textContent = k.sub(s);
  }
}

/* ---------- 清單 ---------- */
function sortedList() {
  const order = { live: 0, closing: 0, upcoming: 1, ended: 2, nobid: 3, sold: 4 };
  return [...auctions.list()].sort((x, y) => (order[auctions.status(x)] - order[auctions.status(y)]) || (auctions.status(x) === 'sold' || auctions.status(x) === 'ended' ? y.endAt - x.endAt : x.endAt - y.endAt));
}
function renderFilters() {
  const cnt = { all: auctions.list().length };
  auctions.list().forEach(a => { const g = grp(auctions.status(a)); cnt[g] = (cnt[g] || 0) + 1; });
  $('#aaFilters', root).innerHTML = FILTERS.map(([k, l]) => `<button class="aa-f ${filter === k ? 'on' : ''}" data-f="${k}">${l}<i>${cnt[k] || 0}</i></button>`).join('');
  $$('[data-f]', root).forEach(b => b.addEventListener('click', () => { filter = b.dataset.f; renderList(); }));
}
function renderList() {
  renderFilters();
  const list = sortedList().filter(a => filter === 'all' || grp(auctions.status(a)) === filter);
  if (!sel || !auctions.get(sel)) sel = (list.find(a => auctions.status(a) === 'live') || list[0] || {}).id || null;
  $('#aaList', root).innerHTML = list.length ? list.map(rowHTML).join('') : '<p class="aa-empty">這個分類目前沒有拍品</p>';
  $$('.aa-item', root).forEach(r => r.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]');
    if (act) { e.stopPropagation(); doAct(act.dataset.act, r.dataset.id, act); return; }
    sel = r.dataset.id; $$('.aa-item', root).forEach(x => x.classList.toggle('on', x === r)); renderDetail();
  }));
  updateTimers();
}
function rowHTML(a) {
  const st = auctions.status(a);
  const price = a.closed && a.final ? a.final : auctions.price(a);
  const p = productOf(a.pid) || {};
  let when = '';
  if (st === 'live') when = `<small>剩餘</small><b class="mono" data-cd="${a.id}">--:--:--</b>`;
  else if (st === 'upcoming') when = `<small>開始倒數</small><b class="mono" data-cd="${a.id}">--:--:--</b>`;
  else if (st === 'closing') when = '<small>結標中</small><b>…</b>';
  else when = `<small>結標於</small><b>${fmtClock(a.closedAt || a.endAt)}</b>`;
  let acts = '';
  if (st === 'live') acts = `<button class="btn btn-ghost btn-sm" data-act="sim" title="模擬一位虛構買家出價">${sv(IC.bolt, 13)} 模擬出價</button><button class="btn btn-ghost btn-sm aa-danger" data-act="close">${closeLabel(a.id)}</button>`;
  else if (st === 'upcoming') acts = `<button class="btn btn-ghost btn-sm" data-act="start">立即開始</button>`;
  else if (st === 'ended') acts = `<button class="btn btn-ghost btn-sm" data-act="paid">標記已付款</button>`;
  return `<div class="aa-item ${sel === a.id ? 'on' : ''} st-${st}" data-id="${a.id}">
    <span class="aa-thumb" style="--pc:${p.color || '#2DB674'}">${artOf(a.pid, 44)}</span>
    <div class="aa-it-main"><b>${esc(pname(a))}</b><small><span class="mono">${a.id}</span>${kindTag(a)}${a.extended ? `<span class="aa-ext">已延長 ${a.extended} 次</span>` : ''}</small></div>
    <div class="aa-it-st">${stPill(st)}</div>
    <div class="aa-it-num aa-it-price"><small>${a.closed ? '成交價' : a.bids.length ? '目前價' : '起標價'}</small><b data-price="${a.id}">${a.closed && !a.winner ? '—' : money(price)}</b></div>
    <div class="aa-it-num aa-it-bids"><small>出價</small><b>${a.bids.length} 次</b></div>
    <div class="aa-it-num aa-it-when">${when}</div>
    <div class="aa-it-act">${acts}</div>
  </div>`;
}

const closeLabel = (id) => (confirmClose.id === id && Date.now() - confirmClose.t < 4000 ? '確定結標？再按一次' : `${sv(IC.stop, 13)} 提前結標`);
function doAct(act, id, btn) {
  const a = auctions.get(id); if (!a) return;
  if (act === 'sim') {
    const r = auctions.simulateBid(id);
    if (!r.ok) toast('無法模擬出價', r.err === 'cap' ? '已接近直購價，請直接結標' : '競標已結束', { kind: 'warn' });
  } else if (act === 'close') {
    if (!(confirmClose.id === id && Date.now() - confirmClose.t < 4000)) {
      confirmClose = { id, t: Date.now() };
      $$(`[data-act="close"], [data-dact="close"]`, root).forEach(b => { if (b.closest(`[data-id="${id}"]`) || (b.dataset.dact && sel === id)) b.innerHTML = '確定結標？再按一次'; });
      setTimeout(() => { if (confirmClose.id === id && Date.now() - confirmClose.t >= 3900) { confirmClose = {}; renderList(); renderDetail(); } }, 4000);
      return;
    }
    confirmClose = {};
    auctions.closeNow(id); sel = id;
  } else if (act === 'start') {
    auctions.startNow(id);
    toast('拍品已開始', `${pname(a)} 現在可以出價了`);
  } else if (act === 'paid') {
    auctions.markPaid(id); sel = id;
    toast('已標記付款', a.orderId && !String(a.orderId).startsWith('示範') ? `訂單 ${a.orderId} 已沖銷應收帳款` : '示範拍品已更新為已成交');
  }
}

/* ---------- 即時看板 ---------- */
function feedItem(a, b, { extended = false, fresh = false } = {}) {
  const tags = [];
  if (b.buyNow) tags.push('<i class="t-bn">直購成交</i>');
  if (b.sim) tags.push('<i class="t-sim">模擬</i>');
  else if (String(b.uid).startsWith('me-')) tags.push('<i class="t-web">銷售網頁</i>');
  if (extended) tags.push('<i class="t-ext">+2 分鐘</i>');
  return `<li class="${fresh ? 'fresh' : ''}" data-aid="${a.id}"><span class="aa-av">${esc(String(b.name).slice(0, 1))}</span>
    <div><b>${esc(b.name)}</b> 出價 <b class="aa-amt">${money(b.amt)}</b> ${tags.join('')}<small>${esc(pname(a))}・${LANG_NAME[b.lang] || '中文'}・<span data-ago="${b.ts}">${ago(b.ts)}</span></small></div></li>`;
}
function renderFeed() {
  const all = [];
  auctions.list().forEach(a => a.bids.forEach(b => all.push([a, b])));
  all.sort((x, y) => y[1].ts - x[1].ts);
  $('#aaFeed', root).innerHTML = all.slice(0, 14).map(([a, b]) => feedItem(a, b)).join('') || '<li class="aa-empty">還沒有出價</li>';
}
function pushFeed(a, bid, extended) {
  const host = $('#aaFeed', root);
  const li = el(feedItem(a, bid, { extended, fresh: true }));
  host.prepend(li);
  while (host.children.length > 14) host.lastElementChild.remove();
  if (visible) {
    gsap.fromTo(li, { opacity: 0, y: -24, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: 'back.out(1.6)' });
    gsap.fromTo(li, { backgroundColor: 'rgba(45,182,116,0.28)' }, { backgroundColor: 'rgba(45,182,116,0)', duration: 2.4, delay: 0.3 });
  }
}

/* ---------- 選中拍品詳情 ---------- */
function renderDetail() {
  const host = $('#aaDetail', root);
  const a = sel && auctions.get(sel);
  if (!a) { host.innerHTML = '<div class="card-h"><h3>拍品詳情</h3></div><p class="aa-empty">從左側清單選一個拍品</p>'; return; }
  const st = auctions.status(a);
  const p = productOf(a.pid) || {};
  const top = auctions.top(a);
  let body = '';
  if (a.winner) {
    const lang = a.winner.lang || 'zh';
    const v = { name: a.winner.name, item: lang === 'zh' ? p.name : (p.en || p.name), price: money(a.final), payBy: fmtClock(a.payBy), link: `pay.greenup.demo/${a.id}` };
    const msg = (WIN_MSG[lang] || WIN_MSG.zh)(v);
    const zh = lang !== 'zh' ? WIN_MSG.zh({ ...v, item: p.name }) : '';
    const realOrder = a.orderId && store.orders.find(o => o.id === a.orderId);
    const used = a.coupons.filter(c => c.used);
    const c0 = a.coupons[0];
    body = `<div class="aa-win">
        <div class="aa-win-h"><span class="aa-trophy">${icon('check', 18)}</span><div><small>得標者</small><b>${esc(a.winner.name)}</b><span>${LANG_NAME[lang]}・前台顯示為「${esc(maskName(a.winner.name))}」</span></div>
          <div class="aa-win-p"><small>成交價</small><b>${money(a.final)}</b></div></div>
        <dl class="aa-dl">
          <dt>結標方式</dt><dd>${a.endedBy === 'buynow' ? '直購成交' : a.endedBy === 'early' ? '老闆提前結標' : '時間到自動結標'}${a.extended ? `（防狙擊延長 ${a.extended} 次）` : ''}</dd>
          <dt>付款期限</dt><dd>${fmtClock(a.payBy)}（得標後 ${RULES.payHours} 小時）</dd>
          <dt>付款狀態</dt><dd>${a.paidAt ? `<span class="st paid">已付款</span> ${fmtClock(a.paidAt)}` : '<span class="st pending">待付款</span>'}</dd>
          <dt>訂單</dt><dd>${realOrder ? `<span class="mono">${esc(a.orderId)}</span> 已自動成立・訂單金額 ${money(realOrder.total)}${realOrder.discount ? `（原價折讓 ${money(realOrder.discount)}）` : ''}` : a.orderId ? '<span class="aa-muted">歷史示範拍品（未寫入訂單）</span>' : '—'}</dd>
        </dl>
        <p class="aa-note">示範：訂單金額以成交價為準（運費依原規則另計）；成交價高於商品定價時，訂單以定價記錄，成交價保留在競標紀錄。</p>
        <div class="aa-msg"><div class="aa-msg-h">${sv(IC.msg, 14)} 得標通知預覽（${LANG_NAME[lang]}）<span class="chip-sm">示範・不會真的發送</span></div><p>${esc(msg)}</p>${zh ? `<small>中文對照：${esc(zh)}</small>` : ''}</div>
        <div class="aa-coupons"><b>${sv(IC.ticket, 14)} 安慰券</b><span>已自動發給 ${a.coupons.length} 位沒得標的出價者，已使用 ${used.length} 張${used.length ? `，帶動 ${money(used.reduce((s, c) => s + c.orderTotal, 0))}` : ''}</span>
          ${c0 ? `<small>範例（${LANG_NAME[c0.lang] || '中文'}）：${esc((LOSE_MSG[c0.lang] || LOSE_MSG.zh)({ name: c0.name, item: c0.lang === 'zh' ? p.name : (p.en || p.name), code: c0.code }))}</small>` : ''}</div>
      </div>`;
  } else if (st === 'nobid') {
    body = '<p class="aa-empty">這場沒有人出價，已結標（流標）。可以換個時段或改成 1 元起標再試一次。</p>';
  } else {
    body = `<div class="aa-live">
        <div class="aa-live-top"><div><small>${st === 'upcoming' ? '開始倒數' : '剩餘時間'}</small><b class="mono" data-cd="${a.id}" data-big>--:--:--</b></div>
          <div><small>${a.bids.length ? '目前最高' : '起標價'}</small><b>${money(auctions.price(a))}</b></div>
          <div><small>下一口至少</small><b>${money(auctions.minNext(a))}</b></div></div>
        <div class="aa-live-meta"><span>${sv(IC.eye, 13)} ${a.views.toLocaleString()} 次觀看</span><span>${auctions.bidderCount(a)} 人出價</span><span>${a.newMembers} 位新會員</span><span>${sv(IC.share, 13)} 分享 ${a.shares}</span></div>
        <ol class="aa-bids">${a.bids.slice(-6).reverse().map((b, i) => `<li class="${i === 0 ? 'top' : ''}"><span>${esc(b.name)}${b.sim ? ' <i class="t-sim">模擬</i>' : ''}</span><small>${ago(b.ts)}</small><b>${money(b.amt)}</b></li>`).join('') || '<li class="aa-empty">還沒有人出價</li>'}</ol>
        ${st === 'live' ? `<div class="aa-live-act"><button class="btn btn-ghost btn-sm" data-dact="sim">${sv(IC.bolt, 13)} 模擬其他買家出價</button><button class="btn btn-ghost btn-sm aa-danger" data-dact="close">${closeLabel(a.id)}</button></div>` : ''}
        ${top ? `<p class="aa-note">若現在結標，得標者是 <b>${esc(top.name)}</b>（${money(top.amt)}），系統會自動成立訂單、用${LANG_NAME[top.lang] || '中文'}通知付款，並發 9 折券給其他 ${Math.max(0, auctions.bidderCount(a) - 1)} 位出價者。</p>` : ''}
      </div>`;
  }
  host.innerHTML = `<div class="card-h"><h3><span class="aa-thumb sm" style="--pc:${p.color || '#2DB674'}">${artOf(a.pid, 30)}</span>${esc(p.name || a.pid)} <span class="mono aa-muted">${a.id}</span></h3>${stPill(st)}</div>
    <div class="aa-facts"><span>範本<b>${a.kind === 'one' ? '1 元起標集客' : '一般競標'}</b></span><span>起標價<b>${money(a.start)}</b></span><span>最低加價<b>${money(a.inc)}</b></span><span>直購價<b>${a.buyNow ? money(a.buyNow) : '不開放'}</b></span><span>結標時間<b>${fmtClock(a.endAt)}</b></span></div>
    ${body}`;
  $$('[data-dact]', host).forEach(b => b.addEventListener('click', () => doAct(b.dataset.dact, a.id, b)));
  updateTimers();
}

/* ---------- 建立拍品 ---------- */
function applyTpl(k) {
  const t = TEMPLATES[k];
  const p = productOf(form.pid) || {};
  form.tpl = k;
  form.start = t.start ?? Math.max(10, Math.round((p.price || 100) * 0.6 / 10) * 10);
  form.inc = k === 'one' ? ((p.price || 0) >= 800 ? 20 : 10) : Math.max(10, Math.round((p.price || 100) * 0.04 / 10) * 10);
  form.dur = k === 'one' ? 10 : 24 * 60;
  form.buyNow = k === 'one' ? '' : String(Math.round((p.price || 100) * 1.2 / 10) * 10);
}
function renderCreate() {
  const host = $('#aaCreate', root);
  if (!form.pid) { form.pid = PRODUCTS[0]?.id; applyTpl('one'); }
  const p = productOf(form.pid) || {};
  host.innerHTML = `<div class="card-h"><h3>${icon('plus', 16)} 建立拍品</h3><span class="chip-sm">三步驟：選商品、選範本、按建立</span></div>
    <div class="aa-tpls">${Object.values(TEMPLATES).map(t => `<button class="aa-tpl ${form.tpl === t.kind ? 'on' : ''}" data-tpl="${t.kind}"><b>${t.label}</b><small>${t.note}</small></button>`).join('')}</div>
    <div class="aa-form">
      <label class="aa-fld wide"><span>商品</span><select id="aaPid">${PRODUCTS.map(x => `<option value="${x.id}" ${x.id === form.pid ? 'selected' : ''}>${esc(x.name)}（定價 ${money(x.price)}）</option>`).join('')}</select><small>從你的商品挑一樣；建議挑討論度高、成本不高的。</small></label>
      <label class="aa-fld"><span>起標價</span><div class="aa-in"><i>NT$</i><input id="aaStart" inputmode="numeric" value="${form.start}"></div><small>第一口最低可以出多少。1 元起標就填 1。</small></label>
      <label class="aa-fld"><span>最低加價</span><div class="aa-in"><i>NT$</i><input id="aaInc" inputmode="numeric" value="${form.inc}"></div><small>每次出價至少要比目前價多這麼多。</small></label>
      <label class="aa-fld"><span>競標多久</span><select id="aaDur">${DURS.map(([v, l]) => `<option value="${v}" ${+form.dur === v ? 'selected' : ''}>${l}</option>`).join('')}</select><small>時間到自動結標；最後 2 分鐘有人出價會自動延長 2 分鐘。</small></label>
      <label class="aa-fld"><span>直購價（可不填）</span><div class="aa-in"><i>NT$</i><input id="aaBuy" inputmode="numeric" value="${esc(form.buyNow)}" placeholder="留空＝不開放直購"></div><small>有人按直購就立刻成交，不用等結標。</small></label>
      <label class="aa-fld wide aa-check"><input type="checkbox" id="aaLater" ${form.later ? 'checked' : ''}><span>先預告，1 小時後才開始出價（讓客人先分享、先收藏）</span></label>
    </div>
    <div class="aa-preview" id="aaPrev"></div>
    <div class="aa-create-act"><button class="btn btn-primary" id="aaGo">${icon('plus', 16)} 建立並上架到銷售網頁</button><small>示範：只會出現在本機的銷售網頁</small></div>`;
  const sync = () => {
    form.start = +$('#aaStart', host).value.replace(/\D/g, '') || 0;
    form.inc = +$('#aaInc', host).value.replace(/\D/g, '') || 0;
    form.dur = +$('#aaDur', host).value; form.buyNow = $('#aaBuy', host).value.replace(/\D/g, ''); form.later = $('#aaLater', host).checked;
    renderPreview();
  };
  $$('[data-tpl]', host).forEach(b => b.addEventListener('click', () => { applyTpl(b.dataset.tpl); renderCreate(); gsap.fromTo('#aaCreate .aa-form', { opacity: 0.4 }, { opacity: 1, duration: 0.4 }); }));
  $('#aaPid', host).addEventListener('change', (e) => { form.pid = e.target.value; applyTpl(form.tpl); renderCreate(); });
  $$('input, select', $('.aa-form', host)).forEach(n => n.addEventListener(n.tagName === 'SELECT' || n.type === 'checkbox' ? 'change' : 'input', sync));
  $('#aaGo', host).addEventListener('click', create);
  renderPreview();
  void p;
}
function renderPreview() {
  const p = productOf(form.pid) || {};
  const warn = [];
  if (form.start < 1) warn.push('起標價至少 1 元');
  if (form.inc < 1) warn.push('最低加價至少 1 元');
  if (form.buyNow && +form.buyNow <= form.start) warn.push('直購價要比起標價高');
  const cost = p.cost || 0;
  $('#aaPrev', root).innerHTML = warn.length
    ? `<p class="aa-warn">${icon('alert', 14)} ${warn.join('、')}</p>`
    : `<p>客人會看到：<b>${esc(p.name || '')}</b>・${form.tpl === 'one' ? '「1 元起標」' : '「競標」'}標籤・起標 ${money(form.start)}・每次至少加 ${money(form.inc)}${form.buyNow ? `・直購 ${money(+form.buyNow)}` : ''}。</p>
       <p class="aa-muted">${form.tpl === 'one' ? `集客提醒：這樣商品成本約 ${money(cost)}，最差情況以低價成交，可以把它當成行銷費用；預估帶來的新會員與安慰券回購通常能補回來（示範估算）。` : `一般競標提醒：起標價 ${money(form.start)} ${form.start < cost ? '低於成本，請確認願意承擔' : '高於成本，不會賠本'}。`}</p>`;
}
function create() {
  if (form.start < 1 || form.inc < 1 || (form.buyNow && +form.buyNow <= form.start)) { toast('請先修正欄位', '起標價、最低加價、直購價', { kind: 'warn' }); return; }
  const now = Date.now();
  const startAt = form.later ? now + 3600e3 : now;
  const a = auctions.create({ pid: form.pid, kind: form.tpl, start: form.start, inc: form.inc, buyNow: form.buyNow ? +form.buyNow : null, startAt, endAt: startAt + form.dur * 60e3 });
  if (!a) return;
  sel = a.id; filter = 'all';
  toast('拍品已建立', `${pname(a)}・${a.id} 已出現在銷售網頁競標區`, { icon: sv(IC.gavel, 18) });
  const btn = $('#aaGo', root);
  gsap.fromTo(btn, { scale: 0.94 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' });
}

/* ---------- 集客成效 ---------- */
function renderPerf() {
  const list = auctions.list().filter(a => auctions.status(a) !== 'upcoming').sort((x, y) => x.endAt - y.endAt).slice(-7);
  const cats = list.map(a => `${productOf(a.pid)?.name || a.pid}${a.kind === 'one' ? '\n(1 元起標)' : ''}`);
  if (!chart) chart = makeChart($('#aaChart', root));
  const narrow = ($('#aaChart', root).clientWidth || 800) < 560;
  chart.setOption({
    grid: { left: narrow ? 30 : 44, right: narrow ? 40 : 50, top: narrow ? 62 : 40, bottom: narrow ? 70 : 52 },
    legend: { top: 0, itemWidth: 12, itemHeight: 8, itemGap: narrow ? 8 : 14, textStyle: { fontSize: narrow ? 11 : 12 } },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: narrow ? list.map(a => (productOf(a.pid)?.name || a.pid).slice(0, 5)) : cats, axisLabel: { fontSize: narrow ? 10 : 11, interval: 0, lineHeight: 14, rotate: narrow ? 35 : 0 } },
    yAxis: [{ type: 'value', name: '人／張', nameTextStyle: { fontSize: 11 }, minInterval: 1 }, { type: 'value', name: '觀看', nameTextStyle: { fontSize: 11 }, splitLine: { show: false } }],
    series: [
      { name: '出價人數', type: 'bar', barMaxWidth: 16, itemStyle: { borderRadius: [4, 4, 0, 0], color: '#2E97D4' }, data: list.map(a => auctions.bidderCount(a)) },
      { name: '新加入會員', type: 'bar', barMaxWidth: 16, itemStyle: { borderRadius: [4, 4, 0, 0], color: '#F0A531' }, data: list.map(a => a.newMembers) },
      { name: '安慰券訂單', type: 'bar', barMaxWidth: 16, itemStyle: { borderRadius: [4, 4, 0, 0], color: '#DD5597' }, data: list.map(a => a.coupons.filter(c => c.used).length) },
      { name: '觀看數', type: 'line', yAxisIndex: 1, smooth: true, symbolSize: 7, lineStyle: { width: 2.5, color: '#5EE0C4' }, itemStyle: { color: '#5EE0C4' }, areaStyle: { color: 'rgba(94,224,196,0.08)' }, data: list.map(a => a.views) },
    ],
  }, true);
  const one = auctions.list().filter(a => a.kind === 'one');
  const nor = auctions.list().filter(a => a.kind === 'normal');
  const avg = (arr, f) => arr.length ? Math.round(arr.reduce((s, a) => s + f(a), 0) / arr.length) : 0;
  const s = auctions.stats();
  $('#aaInsight', root).innerHTML = `
    <div class="aa-ins"><small>1 元起標平均每場</small><b>${avg(one, a => a.views).toLocaleString()} 次觀看・${avg(one, a => a.newMembers)} 位新會員</b><span>一般競標平均 ${avg(nor, a => a.views).toLocaleString()} 次觀看・${avg(nor, a => a.newMembers)} 位新會員</span></div>
    <div class="aa-ins"><small>安慰券（9 折）轉換</small><b>${s.cIssued ? Math.round(s.cUsed / s.cIssued * 100) : 0}%・${s.cUsed} 張</b><span>帶動其他商品訂單 ${money(s.cRev)}</span></div>
    <div class="aa-ins ai"><small>${icon('sparkle', 13)} AI 建議（示範）</small><span>1 元起標的觀看數約是一般競標的 ${avg(nor, a => a.views) ? (avg(one, a => a.views) / avg(nor, a => a.views)).toFixed(1) : '—'} 倍。建議每週固定一個時段（例如週五晚上 9 點）辦一場，並在 LINE 提前預告。</span></div>`;
}

/* ---------- 計時與事件 ---------- */
function updateTimers() {
  if (!root) return;
  const now = Date.now();
  $$('[data-cd]', root).forEach(n => {
    const a = auctions.get(n.dataset.cd); if (!a) return;
    const st = auctions.status(a, now);
    const left = st === 'upcoming' ? a.startAt - now : a.endAt - now;
    n.textContent = fmtLeft(left);
    n.classList.toggle('urgent', st === 'live' && left < 2 * 60e3);
  });
}
function refreshAll(animateKpi = false) {
  renderList(); renderDetail(); renderKpis(animateKpi); renderPerf();
}
function onBid({ a, bid, extended, remote }) {
  if (!root || !a) return;
  pushFeed(a, bid, extended);
  renderList(); renderKpis(false);
  if (sel === a.id) renderDetail();
  const row = $(`.aa-item[data-id="${a.id}"]`, root);
  if (row && visible) {
    gsap.fromTo(row, { boxShadow: 'inset 0 0 0 2px rgba(45,182,116,0.8)' }, { boxShadow: 'inset 0 0 0 2px rgba(45,182,116,0)', duration: 1.6 });
    gsap.fromTo($(`[data-price="${a.id}"]`, row), { scale: 1.3, color: '#5EE0C4' }, { scale: 1, color: '', duration: 0.6, ease: 'back.out(2)' });
  }
  if (visible && remote && String(bid.uid).startsWith('me-')) toast('銷售網頁有新出價', `${bid.name} 出價 ${money(bid.amt)}・${pname(a)}`, { icon: sv(IC.gavel, 18) });
  if (visible && extended) toast('防狙擊延長', `${pname(a)} 最後 2 分鐘有人出價，自動延長 2 分鐘`, { kind: 'warn' });
}
function onClosed({ a }) {
  if (!root || !a) return;
  sel = a.id;
  refreshAll(false);
  if (!visible) return;
  if (a.winner) toast('競標結標', `${pname(a)} 由 ${a.winner.name} 以 ${money(a.final)} 得標${a.orderId ? `，已自動成立訂單 ${a.orderId}` : ''}`, { duration: 6000 });
  else toast('競標結標', `${pname(a)} 無人出價（流標）`, { kind: 'warn' });
}
function setAuto(on) {
  clearInterval(autoT); autoT = 0;
  if (!on) return;
  const step = () => {
    const live = auctions.list().filter(a => auctions.status(a) === 'live');
    if (!live.length) return;
    live.sort((x, y) => x.endAt - y.endAt);
    const a = Math.random() < 0.55 ? live[0] : live[Math.floor(Math.random() * live.length)];
    auctions.simulateBid(a.id);
  };
  step();
  autoT = setInterval(step, 6000);
}

export default {
  mount(section) {
    root = section;
    section.innerHTML = layout();
    renderKpis(true); renderList(); renderFeed(); renderDetail(); renderCreate(); renderPerf();
    $('#aaAuto', root).addEventListener('change', (e) => { setAuto(e.target.checked); toast(e.target.checked ? '已開啟自動模擬買家' : '已關閉自動模擬買家', e.target.checked ? '每 6 秒會有一位虛構買家出價' : ''); });
    auctions.on('bid', onBid);
    auctions.on('closed', onClosed);
    auctions.on('created', () => { if (root) { renderList(); renderDetail(); renderKpis(false); } });
    auctions.on('paid', () => { if (root) { renderList(); renderDetail(); renderKpis(false); renderPerf(); } });
    auctions.on('member', () => { if (root) { renderKpis(false); if (visible) toast('新會員加入', '有客人在銷售網頁完成手機驗證（示範）'); } });
    auctions.on('view', () => { if (root) renderKpis(false); });
    auctions.on('change', ({ remote }) => { if (remote && root) { renderList(); renderDetail(); renderKpis(false); } });
    auctions.on('tick', () => {
      if (!visible) return;
      updateTimers();
      const sig = auctions.list().map(a => auctions.status(a)).join();
      if (sig !== lastSig) { const had = lastSig; lastSig = sig; if (had) { renderList(); renderDetail(); } }
      $$('[data-ago]', root).forEach(n => { n.textContent = ago(+n.dataset.ago); });
    });
    store.on('order-updated', () => { if (root && visible) renderDetail(); });
  },
  show() {
    visible = true;
    lastSig = auctions.list().map(a => auctions.status(a)).join();
    renderKpis(true); renderList(); renderDetail(); renderPerf();
    setTimeout(() => { try { chart && chart.resize(); } catch { /* ignore */ } }, 60);
    if ($('#aaAuto', root)?.checked && !autoT) setAuto(true);
  },
  hide() { visible = false; setAuto(false); const c = $('#aaAuto', root); if (c) c.checked = false; },
};
