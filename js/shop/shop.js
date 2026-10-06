// 銷售網頁主程式（多業主：品牌、文案、版面、風格由 storefront.js 決定；結帳一律寫入目前業主的 store）
import '../tenant.js'; // 必須最先載入：資料隔離層
import { TENANT_ID } from '../tenant.js';
import { store } from '../state.js';
import { PRODUCT_MAP } from '../data.js';
import { LANGS, pName, pUnit, pDesc } from '../i18n.js';
import { $, $$, el, gsap, esc, money, sleep, toast } from '../util.js';
import { productArt } from '../art.js';
import { cart } from './cart.js';
import { initBot } from './bot.js';
import { createShopHero } from './shop-hero.js';
import { initTrack, trackText } from './track.js';
import { initStorefront, bootStorefront, T, G, isAmei, LAYOUT, SHIP_MODE, STYLE, visibleProducts, featuredId, tagsOf, heroExtra, priceHTML, saleTag, promoOf, saleLabel, bindHeroExtra, onStorefront, getSlot, setSlot, slotDays, dayLabel, TIME_SLOTS, slotText, setHero } from './storefront.js';
import { initAuction } from './auction.js';

const t = (l, k, v) => T(l, k, v);
const LS_LANG = 'greenup-solo:lang';
let lang = (() => { try { return localStorage.getItem(LS_LANG) || 'zh'; } catch { return 'zh'; } })();
const urlLang = new URLSearchParams(location.search).get('lang');
if (urlLang && LANGS.find(l => l.id === urlLang)) lang = urlLang;
const listeners = new Set();

export const shop = {
  get lang() { return lang; },
  get tenant() { return TENANT_ID; },
  setLang(l, { silent = false } = {}) {
    if (!LANGS.find(x => x.id === l) || l === lang) return false;
    lang = l;
    try { localStorage.setItem(LS_LANG, l); } catch { /* ignore */ }
    applyI18n(true);
    listeners.forEach(fn => fn(l, silent));
    return true;
  },
  onLang(fn) { listeners.add(fn); },
  t: (k, v) => t(lang, k, v),
  openCart, openCheckout, openDetail, placeOrder, addToCart,
};

// 先套用業主品牌、版面類別與風格，避免第一次渲染閃動
bootStorefront(shop);

// ---------- i18n ----------
function applyI18n(animate) {
  document.documentElement.lang = { zh: 'zh-Hant-TW', en: 'en', ja: 'ja', vi: 'vi', ms: 'ms' }[lang];
  $$('[data-i18n]').forEach(n => { n.textContent = t(lang, n.dataset.i18n); });
  $$('[data-i18n-html]').forEach(n => { n.innerHTML = t(lang, n.dataset.i18nHtml); });
  $$('[data-i18n-ph]').forEach(n => { n.placeholder = t(lang, n.dataset.i18nPh); });
  $('#langLabel').textContent = LANGS.find(l => l.id === lang).label;
  $('#langMenu').innerHTML = LANGS.map(l => `<li><button data-l="${l.id}" class="${l.id === lang ? 'on' : ''}"><b>${l.short}</b>${l.label}</button></li>`).join('');
  $$('#langMenu button').forEach(b => b.addEventListener('click', () => { $('#langMenu').hidden = true; shop.setLang(b.dataset.l); }));
  renderHeroExtra();
  renderProducts(animate);
  renderStripChips();
  renderCart();
  if (animate) gsap.fromTo(['.s-hero-txt > *', '.s-sec-h'], { opacity: 0.2, y: 8 }, { opacity: 1, y: 0, stagger: 0.04, duration: 0.5 });
}

// 版面附加區塊（預約時段、外帶資訊、雜誌期數、職人標示）
function renderHeroExtra() {
  let box = $('#sfHeroX');
  if (!box) { box = el('<div id="sfHeroX" class="sfx"></div>'); $('.s-cta').after(box); }
  box.innerHTML = heroExtra(lang);
  box.hidden = !box.innerHTML;
  bindHeroExtra(box);
}

// ---------- 商品 ----------
const TAGS = { lemon: ['bestseller', 'fruit'], roll: ['bestseller', 'fruit'], basque: ['signature'], pound: ['lesssweet', 'elder'], cookie: ['gift', 'elder'], pineapple: ['souvenir', 'gift'], canele: ['tea'] };
const sweetDots = (n) => `<span class="sweet">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
function stockOf(pid) { const r = store.inventory().find(p => p.id === pid); return r ? r.current : (PRODUCT_MAP[pid]?.stock ?? 0); }
const tagHTML = (p) => (isAmei ? (TAGS[p.id] || []).map(tg => `<span>${t(lang, 'tag_' + tg)}</span>`) : (tagsOf(p) || []).map(tg => `<span>${esc(G(lang, 'tag_' + tg))}</span>`)).join('');
const metaHTML = (p) => {
  if (isAmei) return `<span>${t(lang, 'sweet')} ${sweetDots(p.sweet)}</span>`;
  if (SHIP_MODE === 'service') return `<span>⏱ ${p.dur ? `${p.dur} ${esc(G(lang, 'min'))}` : esc(pUnit(lang, p.id))}</span>`;
  return `<span>${esc(G(lang, 'dStock'))} ${stockOf(p.id)}</span><span class="dot">·</span><span>${esc(G(lang, 'mode_' + SHIP_MODE))}</span>`;
};
const featHTML = (p) => (p.id === featuredId() ? `<span class="p-feat">★ ${esc(G(lang, 'feat'))}</span>` : '');
const lowHTML = (p, left) => (left < (p.safety || 0) ? `<span class="p-low">${t(lang, 'soldLow', { n: left })}</span>` : '');

function cardHTML(p, i) {
  const left = stockOf(p.id);
  const no = `<span class="p-no">${esc(G(lang, 'no'))}${String(i + 1).padStart(2, '0')}</span>`;
  return `<article class="p-card ${p.id === featuredId() ? 'feat' : ''} ${i === 0 && LAYOUT === 'editorial' ? 'lead' : ''}" data-pid="${p.id}" style="--pc:${p.color}">
    <div class="p-art">${productArt(p.id, LAYOUT === 'editorial' && i === 0 ? 300 : 200)}<div class="p-tags">${tagHTML(p)}</div>${lowHTML(p, left)}${featHTML(p)}${saleTag(p, lang, 'p-sale p-sale-art')}</div>
    <div class="p-body">${LAYOUT === 'editorial' || LAYOUT === 'atelier' ? no : ''}<div class="p-top"><h3>${esc(pName(lang, p.id))}</h3><small>${esc(pUnit(lang, p.id))}</small></div>
    <p>${esc(pDesc(lang, p.id))}</p>
    <div class="p-meta">${metaHTML(p)}</div>
    <div class="p-foot">${priceHTML(p, lang, money)}<button class="p-add" data-add="${p.id}">${t(lang, 'add')}</button></div></div>
  </article>`;
}
function rowHTML(p) { // 預約制：服務項目列
  return `<article class="p-row ${p.id === featuredId() ? 'feat' : ''}" data-pid="${p.id}" style="--pc:${p.color}">
    <div class="pr-art">${productArt(p.id, 110)}</div>
    <div class="pr-body"><div class="pr-top"><h3>${esc(pName(lang, p.id))}</h3>${featHTML(p)}</div><p>${esc(pDesc(lang, p.id))}</p>
      <div class="pr-meta">${metaHTML(p)}<span class="p-tags inline">${tagHTML(p)}</span></div></div>
    <div class="pr-buy">${saleTag(p, lang)}${priceHTML(p, lang, money)}<small>${esc(G(lang, 'perSession'))}</small><button class="p-add" data-add="${p.id}">${t(lang, 'add')}</button></div>
  </article>`;
}
function menuHTML(p) { // 菜單版：餐點列
  const sub = lang === 'zh' ? pName('en', p.id) : pName('zh', p.id);
  return `<article class="m-row ${p.id === featuredId() ? 'feat' : ''}" data-pid="${p.id}" style="--pc:${p.color}">
    <div class="mr-art">${productArt(p.id, 84)}</div>
    <div class="mr-body"><div class="mr-top"><h3>${esc(pName(lang, p.id))}</h3><i class="mr-dots"></i>${priceHTML(p, lang, money)}</div>
      <small class="mr-sub">${esc(sub)}${featHTML(p)}${saleTag(p, lang)}</small><p>${esc(pDesc(lang, p.id))}</p></div>
    <button class="m-add" data-add="${p.id}" aria-label="${esc(t(lang, 'add'))}">＋</button>
  </article>`;
}
function aiCardHTML(wide) {
  const chips = t(lang, 'chips').slice(0, 3);
  return `<article class="p-card ai-card ${wide ? 'wide' : ''}" id="aiCard"><div><span class="aic-bot"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8"><rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01M9 17h6"/><circle cx="12" cy="3" r="1"/></svg></span>
    <h3>${esc(t(lang, 'botStrip'))}</h3><p>${esc(t(lang, 'botStripSub'))}</p>
    <div class="aic-chips">${chips.map(c => `<span>${esc(c)}</span>`).join('')}</div></div><div class="aic-go">${esc(t(lang, 'askBot'))} →</div></article>`;
}

function renderProducts(animate) {
  const grid = $('#pGrid');
  const list = visibleProducts();
  const mode = LAYOUT === 'booking' ? 'rows' : LAYOUT === 'menu' ? 'menu' : 'cards';
  grid.className = `p-grid pg-${LAYOUT} pg-${mode}`;
  if (mode === 'rows') grid.innerHTML = list.map(rowHTML).join('') + aiCardHTML(true);
  else if (mode === 'menu') grid.innerHTML = `<div class="m-board"><div class="m-board-h"><b>${esc(G(lang, 'takeTitle'))}</b><small>⏱ ${esc(G(lang, 'ready'))}・${esc(G(lang, 'menuNote'))}</small></div><div class="m-cols">${list.map(menuHTML).join('')}</div></div>` + aiCardHTML(true);
  else grid.innerHTML = list.map(cardHTML).join('') + aiCardHTML(LAYOUT !== 'classic' || STYLE.grid === 'list' || STYLE.grid === 'magazine');
  $('#aiCard').addEventListener('click', () => bot.open());
  $$('[data-pid]', grid).forEach(c => c.addEventListener('click', (e) => { if (!e.target.closest('[data-add]')) openDetail(c.dataset.pid); }));
  $$('[data-add]', grid).forEach(b => b.addEventListener('click', () => addToCart(b.dataset.add, 1, b)));
  if (animate !== false) gsap.fromTo($$('.p-card, .p-row, .m-row', grid), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.05, ease: 'power3.out' });
}

function addToCart(pid, qty, srcEl) {
  if (!PRODUCT_MAP[pid]) return;
  cart.add(pid, qty);
  if (srcEl) {
    const old = srcEl.textContent; srcEl.textContent = srcEl.classList.contains('m-add') ? '✓' : '✓ ' + t(lang, 'added'); srcEl.classList.add('ok');
    setTimeout(() => { srcEl.textContent = old; srcEl.classList.remove('ok'); }, 1200);
    // 飛入購物車動畫
    const art = srcEl.closest('.p-card, .p-row, .m-row, .s-modal-card, .bc-card')?.querySelector('.art');
    if (art) {
      const r = art.getBoundingClientRect(), c = $('#cartBtn').getBoundingClientRect();
      const fly = el(`<div class="fly">${productArt(pid, 80)}</div>`); document.body.appendChild(fly);
      gsap.fromTo(fly, { left: r.left + r.width / 2 - 40, top: r.top + r.height / 2 - 40, scale: 1, opacity: 1 },
        { left: c.left + c.width / 2 - 40, top: c.top - 20, scale: 0.2, opacity: 0.6, duration: 0.8, ease: 'power2.in', onComplete: () => fly.remove() });
    }
  }
  gsap.fromTo('#cartCount', { scale: 1.8 }, { scale: 1, duration: 0.5, delay: 0.6, ease: 'back.out(3)' });
}

function openDetail(pid) {
  const p = PRODUCT_MAP[pid]; if (!p) return;
  let q = 1;
  const card = $('#sModalCard');
  card.className = 's-modal-card detail';
  const dl = isAmei
    ? `<dt>${t(lang, 'sweet')}</dt><dd>${sweetDots(p.sweet)}</dd>
        <dt>${t(lang, 'allergens')}</dt><dd>${p.allergens.map(a => t(lang, 'al_' + a)).join('、')}</dd>
        <dt>${t(lang, 'storage')}</dt><dd>${t(lang, 'st_' + p.storage, { d: p.days })}</dd>`
    : `<dt>${esc(G(lang, 'dUnit'))}</dt><dd>${esc(pUnit(lang, pid))}</dd>
        ${p.dur ? `<dt>${esc(G(lang, 'dDur'))}</dt><dd>${p.dur} ${esc(G(lang, 'min'))}</dd>` : ''}
        <dt>${esc(G(lang, 'dStock'))}</dt><dd>${stockOf(pid)}</dd>
        <dt>${esc(G(lang, 'dMode'))}</dt><dd>${esc(G(lang, 'mode_' + SHIP_MODE))}</dd>`;
  card.innerHTML = `<button class="x-btn m-x">✕</button>
    <div class="d-art" style="--pc:${p.color}">${productArt(pid, 320)}</div>
    <div class="d-body"><div class="p-tags inline">${tagHTML(p)}${saleTag(p, lang)}</div>
      <h2>${esc(pName(lang, pid))}</h2><small class="d-unit">${esc(pUnit(lang, pid))}</small>
      <p>${esc(pDesc(lang, pid))}</p>
      <dl>${dl}</dl>
      <div class="d-buy">${priceHTML(p, lang, money)}<div class="qty"><button data-q="-1">−</button><span id="dQ">1</span><button data-q="1">+</button></div><button class="s-btn s-btn-primary" id="dAdd">${t(lang, 'add')}</button></div>
    </div>`;
  showModal();
  $$('[data-q]', card).forEach(b => b.addEventListener('click', () => { q = Math.max(1, q + +b.dataset.q); $('#dQ').textContent = q; }));
  $('#dAdd').addEventListener('click', (e) => { addToCart(pid, q, e.currentTarget); setTimeout(hideModal, 700); });
  $('.m-x', card).addEventListener('click', hideModal);
}
function showModal() {
  const m = $('#sModal'); m.hidden = false;
  gsap.fromTo(m, { opacity: 0 }, { opacity: 1, duration: 0.25 });
  gsap.fromTo('#sModalCard', { y: 40, scale: 0.95, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.5)' });
}
function hideModal() { const m = $('#sModal'); gsap.to(m, { opacity: 0, duration: 0.2, onComplete: () => { m.hidden = true; } }); }
$('#sModal').addEventListener('click', (e) => { if (e.target.id === 'sModal') hideModal(); });

// ---------- 購物車 ----------
function renderCart() {
  $('#cartCount').textContent = cart.count();
  const list = cart.list().filter(i => PRODUCT_MAP[i.pid]);
  const box = $('#drItems');
  if (!list.length) { box.innerHTML = `<div class="dr-empty">${t(lang, 'cartEmpty')}</div>`; $('#drFoot').innerHTML = ''; return; }
  box.innerHTML = list.map(i => `<div class="dr-it"><span class="dr-art">${productArt(i.pid, 64)}</span><div><b>${esc(pName(lang, i.pid))}</b><small>${promoOf(PRODUCT_MAP[i.pid]) ? `<s>${money(promoOf(PRODUCT_MAP[i.pid]).list)}</s> ` : ''}${money(i.price)}</small>${saleTag(PRODUCT_MAP[i.pid], lang)}
    <div class="qty sm"><button data-pid="${i.pid}" data-d="-1">−</button><span>${i.qty}</span><button data-pid="${i.pid}" data-d="1">+</button></div></div><b class="dr-sum">${money(i.price * i.qty)}</b></div>`).join('');
  $$('.qty button', box).forEach(b => b.addEventListener('click', () => { const cur = cart.list().find(x => x.pid === b.dataset.pid)?.qty || 0; cart.set(b.dataset.pid, cur + +b.dataset.d); }));
  const tt = cart.totals();
  const ship = SHIP_MODE === 'service' ? 0 : tt.shipping;
  $('#drFoot').innerHTML = `<div class="tot-row"><span>${t(lang, 'subtotal')}</span><b>${money(tt.subtotal)}</b></div>
    <div class="tot-row"><span>${t(lang, 'shipping')}</span><b>${ship ? money(ship) : t(lang, 'free')}</b></div>
    <div class="tot-row big"><span>${t(lang, 'total')}</span><b>${money(tt.subtotal + ship)}</b></div>
    <button class="s-btn s-btn-primary wide" id="goCheckout">${t(lang, 'checkout')}</button>`;
  $('#goCheckout').addEventListener('click', () => { closeCart(); openCheckout(); });
}
cart.onChange(renderCart);
function openCart() {
  const d = $('#drawer'); d.hidden = false;
  gsap.fromTo('.drawer-bg', { opacity: 0 }, { opacity: 1, duration: 0.3 });
  gsap.fromTo('.drawer-panel', { x: 420 }, { x: 0, duration: 0.45, ease: 'power3.out' });
}
function closeCart() { gsap.to('.drawer-panel', { x: 420, duration: 0.3, onComplete: () => { $('#drawer').hidden = true; } }); gsap.to('.drawer-bg', { opacity: 0, duration: 0.3 }); }
$('#cartBtn').addEventListener('click', openCart);
$$('[data-close]').forEach(b => b.addEventListener('click', closeCart));

// ---------- 結帳 ----------
function regionList() { const r = t(lang, 'regions'); return isAmei ? r : r.slice(0, 7); }
function openCheckout() {
  if (!cart.count()) { openCart(); return; }
  const card = $('#sModalCard');
  card.className = 's-modal-card checkout';
  const regions = regionList();
  // 外帶業主預設自取；預約服務不需配送
  let delivery = SHIP_MODE === 'takeout' ? 'pickup' : 'home', pay = '信用卡';
  const dv = SHIP_MODE === 'takeout' ? [['pickup', t(lang, 'ckPickup')], ['home', t(lang, 'ckHome')]] : [['home', t(lang, 'ckHome')], ['pickup', t(lang, 'ckPickup')]];
  const days = slotDays(), s0 = getSlot();
  const slotUI = `<label>${esc(t(lang, 'ckDelivery'))}</label><div class="ck-slot"><select id="ckDay">${days.map(d => `<option value="${+d.day}" ${+d.day === +s0.day ? 'selected' : ''}>${esc(dayLabel(d.day, lang))}</option>`).join('')}</select><select id="ckTime"></select></div>`;
  card.innerHTML = `<button class="x-btn m-x">✕</button><h2>${t(lang, 'ckTitle')}</h2>
    <div class="ck-grid"><div class="ck-form">
      <label>${t(lang, 'ckName')}<input id="ckName" placeholder="${esc(t(lang, 'ckNamePh'))}"></label>
      ${SHIP_MODE === 'service' ? slotUI : `<label>${t(lang, 'ckDelivery')}</label><div class="seg2">${dv.map(([id, lb]) => `<button class="${id === delivery ? 'on' : ''}" data-dv="${id}">${esc(lb)}</button>`).join('')}</div>
      <label>${t(lang, 'ckRegion')}<select id="ckRegion" ${delivery === 'pickup' ? 'disabled' : ''}>${regions.map((r, i) => `<option ${i === 3 ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select></label>`}
      <label>${t(lang, 'ckPay')}</label><div class="seg2 pay"><button class="on" data-pm="信用卡">${t(lang, 'ckCard')}</button><button data-pm="LINE Pay">LINE Pay</button><button data-pm="Apple Pay">Apple Pay</button></div>
      <small class="ck-note">${t(lang, 'ckNote')}</small>
    </div><div class="ck-sum" id="ckSum"></div></div>`;
  const fillTimes = () => {
    const ds = $('#ckDay', card); if (!ds) return;
    const d = days.find(x => +x.day === +ds.value) || days[0]; const cur = getSlot();
    $('#ckTime', card).innerHTML = TIME_SLOTS.map(tm => `<option value="${tm}" ${d.taken.includes(tm) ? 'disabled' : ''} ${tm === cur.time && !d.taken.includes(tm) ? 'selected' : ''}>${tm}${d.taken.includes(tm) ? ` · ${esc(G(lang, 'soldOut'))}` : ''}</option>`).join('');
    const sel = $('#ckTime', card); if (sel.selectedOptions[0]?.disabled) sel.value = TIME_SLOTS.find(x => !d.taken.includes(x)) || TIME_SLOTS[0];
  };
  const sum = () => {
    const region = SHIP_MODE === 'service' || delivery === 'pickup' ? '' : $('#ckRegion').value;
    const tt = cart.totals(region); const ship = SHIP_MODE === 'service' || delivery === 'pickup' ? 0 : tt.shipping;
    $('#ckSum').innerHTML = cart.list().filter(i => PRODUCT_MAP[i.pid]).map(i => { const pi = promoOf(PRODUCT_MAP[i.pid]); return `<div class="cs-row"><span>${esc(pName(lang, i.pid))} × ${i.qty}${pi ? saleTag(PRODUCT_MAP[i.pid], lang) : ''}</span><b>${pi ? `<s>${money(pi.list * i.qty)}</s> ` : ''}${money(i.price * i.qty)}</b></div>`; }).join('')
      + (SHIP_MODE === 'service' ? `<div class="cs-row muted"><span>${esc(t(lang, 'ckDelivery'))}</span><b>${esc(slotText(lang))}</b></div>` : `<div class="cs-row muted"><span>${t(lang, 'shipping')}</span><b>${ship ? money(ship) : t(lang, 'free')}</b></div>`)
      + `<div class="cs-row big"><span>${t(lang, 'total')}</span><b>${money(tt.subtotal + ship)}</b></div>
      <button class="s-btn s-btn-primary wide" id="ckPay">${t(lang, 'ckPayBtn')}</button>`;
    $('#ckPay').addEventListener('click', async (e) => {
      const btn = e.currentTarget; btn.disabled = true; btn.innerHTML = `<span class="s-spin"></span>${t(lang, 'ckProcessing')}`;
      await sleep(1300);
      const order = placeOrder({ name: $('#ckName').value.trim(), region, pickup: SHIP_MODE === 'service' || delivery === 'pickup', payment: pay });
      showSuccess(order);
    });
  };
  showModal();
  if (SHIP_MODE === 'service') {
    fillTimes();
    $('#ckDay', card).addEventListener('change', () => { fillTimes(); setSlot({ day: new Date(+$('#ckDay', card).value), time: $('#ckTime', card).value }); sum(); });
    $('#ckTime', card).addEventListener('change', () => { setSlot({ day: new Date(+$('#ckDay', card).value), time: $('#ckTime', card).value }); sum(); });
  }
  sum();
  $$('[data-dv]', card).forEach(b => b.addEventListener('click', () => { delivery = b.dataset.dv; $$('[data-dv]', card).forEach(x => x.classList.toggle('on', x === b)); $('#ckRegion').disabled = delivery === 'pickup'; sum(); }));
  $$('[data-pm]', card).forEach(b => b.addEventListener('click', () => { pay = b.dataset.pm; $$('[data-pm]', card).forEach(x => x.classList.toggle('on', x === b)); }));
  const rg = $('#ckRegion'); if (rg) rg.addEventListener('change', sum);
  $('.m-x', card).addEventListener('click', hideModal);
}

function placeOrder({ name = '', region = '', pickup = false, payment = '信用卡', conv = null } = {}) {
  const items = cart.list().filter(i => PRODUCT_MAP[i.pid]).map(i => ({ pid: i.pid, qty: i.qty }));
  const customer = name || `官網訪客${lang !== 'zh' ? `（${LANGS.find(l => l.id === lang).label}）` : ''}`;
  // 後台以中文顯示取貨方式
  const where = SHIP_MODE === 'service' ? `${G('zh', 'ckService')} ${slotText('zh')}` : pickup ? (isAmei ? '台中門市自取' : T('zh', 'ckPickup')) : (region || '宅配');
  const order = store.createOrder({ channel: 'web', customer, lang, items, payment, status: 'paid', region: where, pickup: pickup || SHIP_MODE === 'service', conv });
  cart.clear();
  return order;
}

function showSuccess(order) {
  const card = $('#sModalCard');
  card.className = 's-modal-card success';
  card.innerHTML = `<svg viewBox="0 0 120 120" class="ok-check"><circle cx="60" cy="60" r="50"/><path d="M38 62 l15 15 l30 -32"/></svg>
    <h2>${t(lang, 'okTitle')}</h2>
    <div class="ok-grid"><span>${t(lang, 'okOrder')}</span><b class="mono">${order.id}</b><span>${t(lang, 'okInvoice')}</span><b class="mono">${order.invoice}</b>${SHIP_MODE === 'service' ? `<span>${esc(t(lang, 'ckDelivery'))}</span><b>${esc(slotText(lang))}</b>` : ''}<span>${t(lang, 'total')}</span><b>${money(order.total)}</b></div>
    <p class="ok-sync"><i></i>${t(lang, 'okSync')}</p>
    <div class="ok-act"><a class="s-btn s-btn-ghost" href="index.html?tenant=${TENANT_ID}#pos" target="greenup-admin">${t(lang, 'okAdmin')} ↗</a><button class="s-btn s-btn-ghost" id="okTrack">${trackText('nav')}</button><button class="s-btn s-btn-primary" id="okClose">${t(lang, 'close')}</button></div>`;
  const c = $('.ok-check circle', card), p = $('.ok-check path', card);
  const lc = c.getTotalLength(), lp = p.getTotalLength();
  gsap.set(c, { strokeDasharray: lc, strokeDashoffset: lc }); gsap.set(p, { strokeDasharray: lp, strokeDashoffset: lp });
  gsap.timeline().fromTo(card, { scale: 0.92 }, { scale: 1, duration: 0.4, ease: 'back.out(2)' }).to(c, { strokeDashoffset: 0, duration: 0.6 }).to(p, { strokeDashoffset: 0, duration: 0.4 })
    .from(card.querySelectorAll('h2, .ok-grid, .ok-sync, .ok-act'), { opacity: 0, y: 10, stagger: 0.08, duration: 0.35 });
  $('#okClose').addEventListener('click', hideModal);
  $('#okTrack').addEventListener('click', () => track.open(order.id));
}

// ---------- AI 導購快捷 ----------
function renderStripChips() {
  const chips = t(lang, 'chips').slice(0, 3);
  $('#bsChips').innerHTML = chips.map(c => `<button data-ask="${esc(c)}">${esc(c)}</button>`).join('');
  $$('#bsChips button').forEach(b => b.addEventListener('click', () => bot.open(b.dataset.ask)));
}

// ---------- 語言選單 ----------
$('#langBtn').addEventListener('click', (e) => { e.stopPropagation(); const m = $('#langMenu'); m.hidden = !m.hidden; if (!m.hidden) gsap.fromTo(m, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.25 }); });
document.addEventListener('click', () => { $('#langMenu').hidden = true; });

// ---------- 同步（後台下單、工作室調整商品時更新） ----------
store.on('order', ({ remote }) => { if (remote) renderProducts(false); });
store.on('reset', () => renderProducts(false));
onStorefront((kind) => { if (kind === 'catalog') renderProducts(true); if (kind === 'slot') renderHeroExtra(); });

// ---------- 啟動 ----------
applyI18n(false);
gsap.from('.s-hero-txt > *', { opacity: 0, y: 30, duration: 0.8, stagger: 0.08, ease: 'power3.out' });
gsap.from('.s-nav', { y: -30, opacity: 0, duration: 0.6 });
setHero(STYLE.hero === 'minimal' ? null : createShopHero($('#shopHero'), { cat: document.body.dataset.cat, center: STYLE.hero === 'center' }));
const bot = initBot(shop);
const track = initTrack(shop);
const storefront = initStorefront(shop);
const auction = initAuction(shop);
window.__storefront = storefront; window.__auction = auction;
$('#heroAsk').addEventListener('click', () => bot.open());
window.__shop = shop;
export { toast };
