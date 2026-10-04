// POS 與會計：訂單、電子發票、自動分錄、庫存、快速結帳
import { store, itemsText } from '../state.js';
import { $, $$, el, gsap, esc, money, fmtTime, fmtMD, countUp } from '../util.js';
import { icon, chIcon } from '../icons.js';
import { PRODUCTS, PRODUCT_MAP, startOfDay, addDays } from '../data.js';
import { productArt } from '../art.js';

let root, cart = {}, payMethod = '現金';
const CH = { line: 'LINE', web: '官網', pos: '門市', phone: '電話', whatsapp: 'WhatsApp', zalo: 'Zalo', messenger: 'Messenger' };

export default {
  mount(section) {
    root = section;
    section.innerHTML = `
    <div class="pos-wrap">
      <div class="pos-strip anim-in">
        <div class="glass ps"><span>${icon('receipt', 18)}</span><div><small>今日開立電子發票</small><b id="psInv">0</b></div></div>
        <div class="glass ps"><span>${icon('coins', 18)}</span><div><small>今日已入帳</small><b id="psPaid">0</b></div></div>
        <div class="glass ps"><span>${icon('clock', 18)}</span><div><small>應收帳款（待付款）</small><b id="psAR">0</b></div></div>
        <div class="glass ps"><span>${icon('percent', 18)}</span><div><small>本月銷項稅額 5%</small><b id="psTax">0</b></div></div>
      </div>
      <div class="glass card p-orders anim-in">
        <div class="card-h"><h3>${icon('receipt', 18)} 訂單與電子發票</h3><span class="chip-sm">全通路自動彙整・最新 12 筆</span></div>
        <div class="tbl-wrap"><table class="tbl" id="orderTbl"><thead><tr><th>時間</th><th>訂單編號</th><th>通路</th><th>客人</th><th class="col-items">品項</th><th class="r">金額</th><th>電子發票</th><th>付款</th></tr></thead><tbody></tbody></table></div>
      </div>
      <div class="glass card p-pos anim-in">
        <div class="card-h"><h3>${icon('pos', 18)} 門市快速結帳</h3><span class="chip-sm">現場 POS</span></div>
        <div class="pos-tiles" id="posTiles">${PRODUCTS.map(p => `<button class="tile" data-pid="${p.id}"><span class="tile-art">${productArt(p.id, 54)}</span><b>${p.name}</b><small>${money(p.price)}</small><i class="tile-q" hidden>0</i></button>`).join('')}</div>
        <div class="pos-cart" id="posCart"></div>
        <div class="pos-pay">${['現金', '信用卡', 'LINE Pay'].map(m => `<button class="seg ${m === payMethod ? 'on' : ''}" data-m="${m}">${m}</button>`).join('')}</div>
        <button class="btn btn-primary pos-go" id="posGo" disabled>${icon('check', 18)} 結帳並開立電子發票</button>
      </div>
      <div class="glass card p-journal anim-in">
        <div class="card-h"><h3>${icon('file', 18)} 自動會計分錄</h3><span class="chip-sm">由訂單即時產生・含稅拆分 5%</span></div>
        <div class="journal" id="journal"></div>
      </div>
      <div class="glass card p-inv anim-in">
        <div class="card-h"><h3>${icon('box', 18)} 庫存</h3><span class="chip-sm" id="invChip"></span></div>
        <ul class="inv" id="invList"></ul>
      </div>
    </div>`;
    $$('.tile', section).forEach(b => b.addEventListener('click', () => { cart[b.dataset.pid] = (cart[b.dataset.pid] || 0) + 1; renderCart(); gsap.fromTo(b, { scale: 0.92 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' }); }));
    $$('.seg', section).forEach(b => b.addEventListener('click', () => { payMethod = b.dataset.m; $$('.seg', root).forEach(x => x.classList.toggle('on', x === b)); }));
    $('#posGo', section).addEventListener('click', checkout);
    renderCart(); renderAll(false);
    store.on('order', ({ order }) => renderAll(true, order.id));
    store.on('order-updated', ({ order }) => renderAll(true, order.id));
    store.on('reset', () => renderAll(false));
  },
  show() { renderAll(false); },
};

function renderCart() {
  const box = $('#posCart', root);
  const ids = Object.keys(cart).filter(k => cart[k] > 0);
  $$('.tile', root).forEach(t => { const q = cart[t.dataset.pid] || 0; const i = $('.tile-q', t); i.hidden = !q; i.textContent = q; });
  if (!ids.length) { box.innerHTML = '<div class="pc-empty">點上方商品加入結帳清單</div>'; $('#posGo', root).disabled = true; return; }
  const total = ids.reduce((s, id) => s + PRODUCT_MAP[id].price * cart[id], 0);
  const net = Math.round(total / 1.05);
  box.innerHTML = ids.map(id => `<div class="pc-row"><span>${PRODUCT_MAP[id].name}</span><span class="pc-q"><button data-d="-1" data-id="${id}">−</button>${cart[id]}<button data-d="1" data-id="${id}">+</button></span><b>${money(PRODUCT_MAP[id].price * cart[id])}</b></div>`).join('')
    + `<div class="pc-tot"><span>銷售額 ${money(net)}・稅額 ${money(total - net)}</span><b>${money(total)}</b></div>`;
  $$('.pc-q button', box).forEach(b => b.addEventListener('click', () => { cart[b.dataset.id] = Math.max(0, cart[b.dataset.id] + +b.dataset.d); renderCart(); }));
  $('#posGo', root).disabled = false;
}

function checkout() {
  const items = Object.keys(cart).filter(k => cart[k] > 0).map(pid => ({ pid, qty: cart[pid] }));
  if (!items.length) return;
  const order = store.createOrder({ channel: 'pos', customer: '門市顧客', items, payment: payMethod, status: 'paid' });
  cart = {}; renderCart();
  const btn = $('#posGo', root);
  const r = el(`<div class="receipt"><div class="rc-h">電子發票證明聯</div><div class="rc-n mono">${order.invoice}</div><div class="rc-qr">${'<i></i>'.repeat(49)}</div><div class="rc-t">${money(order.total)}</div><small>${payMethod}・已自動入帳</small></div>`);
  $$('.rc-qr i', r).forEach(i => { if (Math.random() < 0.45) i.classList.add('b'); });
  $('.p-pos', root).appendChild(r);
  gsap.fromTo(r, { y: 40, opacity: 0, scale: 0.8 }, { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.7)' });
  gsap.to(r, { opacity: 0, y: -20, delay: 2.8, duration: 0.5, onComplete: () => r.remove() });
  gsap.fromTo(btn, { scale: 0.95 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
}

function renderAll(live, hiId) {
  if (!root) return;
  const today = startOfDay(new Date());
  const todayO = store.ordersBetween(today, addDays(today, 1));
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  countUp($('#psInv', root), todayO.length, { suffix: ' 張', duration: 0.8 });
  countUp($('#psPaid', root), store.sum(todayO.filter(o => o.status === 'paid')), { prefix: 'NT$ ', duration: 0.8 });
  countUp($('#psAR', root), store.sum(store.orders.filter(o => o.status === 'pending')), { prefix: 'NT$ ', duration: 0.8 });
  countUp($('#psTax', root), store.sum(store.ordersBetween(monthStart, addDays(today, 1)), 'tax'), { prefix: 'NT$ ', duration: 0.8 });

  const rows = store.orders.slice(-12).reverse();
  $('#orderTbl tbody', root).innerHTML = rows.map(o => `<tr data-id="${o.id}" class="${o.source === 'live' ? 'live' : ''}">
    <td>${fmtMD(o.ts)} ${fmtTime(o.ts)}</td><td class="mono">${o.id}</td><td><span class="ch-cell">${chIcon(o.channel, 18)}${CH[o.channel]}</span></td>
    <td>${esc(o.customer)}</td><td class="items col-items">${esc(itemsText(o.items))}</td><td class="r">${money(o.total)}</td>
    <td class="mono">${o.invoice}</td><td>${o.status === 'paid' ? '<span class="st paid">已付款</span>' : '<span class="st pending">待付款</span>'}</td></tr>`).join('');
  if (live && hiId) { const tr = $(`tr[data-id="${hiId}"]`, root); tr && gsap.fromTo(tr, { backgroundColor: 'rgba(45,182,116,.45)' }, { backgroundColor: 'rgba(45,182,116,0)', duration: 2.2 }); }

  const js = store.journal(8);
  $('#journal', root).innerHTML = js.map(j => `<div class="je ${j.ref === hiId ? 'hi' : ''}"><div class="je-h"><span>${fmtMD(j.date)} ${fmtTime(j.date)}</span><span class="mono">${j.ref}</span><small>${esc(j.memo)}</small></div>
    ${j.lines.map(l => `<div class="je-l ${l.side === '貸' ? 'cr' : 'dr'}"><span class="side">${l.side}</span><span class="acct">${l.acct}</span><b>${money(l.amt)}</b></div>`).join('')}</div>`).join('');
  if (live && hiId) $$('.je.hi', root).forEach(n => gsap.fromTo(n, { x: 20, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6 }));

  const inv = store.inventory();
  const low = inv.filter(p => p.low).length;
  $('#invChip', root).textContent = low ? `${low} 項低於安全庫存` : '庫存充足';
  $('#invChip', root).className = 'chip-sm ' + (low ? 'warn' : '');
  $('#invList', root).innerHTML = inv.map(p => {
    const pct = Math.min(100, p.current / (p.safety * 3) * 100);
    return `<li class="${p.low ? 'low' : ''}"><span class="inv-art">${productArt(p.id, 34)}</span><div class="inv-b"><div class="inv-t"><b>${p.name}</b><span>${p.current} <small>/ 安全 ${p.safety}</small></span></div>
      <div class="bar"><i style="width:${pct}%"></i><em style="left:${p.safety / (p.safety * 3) * 100}%"></em></div></div>${p.low ? `<span class="inv-warn">${icon('alert', 14)} 補貨</span>` : ''}</li>`;
  }).join('');
}
