// 聊天導購機器人（規則式意圖比對 + 多語言 + 語音）
import { PRODUCTS, PRODUCT_MAP } from '../data.js';
import { LANGS, t, pName, PRODUCT_ALIASES, detectLang } from '../i18n.js';
import { $, $$, el, gsap, esc, money, sleep, speak, stopSpeak, getRecognizer } from '../util.js';
import { icon } from '../icons.js';
import { productArt } from '../art.js';
import { cart } from './cart.js';

const R = {
  checkout: /結帳|買單|付款|下單|checkout|check out|\bpay\b|お会計|会計|注文する|購入|レジ|thanh toán|đặt hàng|\bbayar\b|daftar keluar/i,
  cartView: /購物車|\bcart\b|カート|giỏ hàng|troli/i,
  allergen: /過敏|堅果|花生|麩質|allerg|\bnuts?\b|gluten|dairy|アレルギー|ナッツ|dị ứng|\bhạt\b|alahan|kacang/i,
  storage: /保存|冷藏|放多久|保鮮|可以放|\bstore\b|storage|shelf|fridge|how long.*keep|賞味|冷蔵|日持ち|bảo quản|tủ lạnh|bao lâu|simpan|peti sejuk|tahan berapa/i,
  shipping: /運費|寄送|寄到|宅配|運送|多久到|到貨|shipping|deliver|\bship\b|送料|配送|届く|giao hàng|phí ship|vận chuyển|penghantaran|hantar|\bpos\b/i,
  budget: /預算|以內|以下|budget|under|below|within|less than|予算|以内|ngân sách|dưới|bajet|bawah|kurang dari/i,
  money: /nt\$|元|円|\brm\b|塊|đồng|\$/i,
  gift: /長輩|爸媽|父母|送禮|禮盒|伴手禮|禮物|gift|parent|elder|grand|present|お土産|ギフト|贈り物|両親|プレゼント|quà|biếu|ông bà|bố mẹ|hadiah|ibu bapa|orang tua|cenderamata/i,
  less: /不要太甜|不甜|少糖|低糖|甜度低|控糖|not too sweet|less sweet|low sugar|甘さ控えめ|甘くない|甘すぎ|ít ngọt|không quá ngọt|kurang manis|tak terlalu manis|tidak terlalu manis/i,
  recommend: /推薦|熱銷|人氣|招牌|好吃|recommend|best|popular|suggest|おすすめ|人気|gợi ý|bán chạy|\bngon\b|cadang|terlaris/i,
  thanks: /謝謝|感謝|thank|ありがと|cảm ơn|terima kasih/i,
  greet: /^(你好|哈囉|嗨|hi\b|hello|hey|こんにちは|xin chào|chào|hai\b|helo|salam)/i,
  add: /買|要|訂|加|來|\badd\b|\bbuy\b|want|order|take|ください|買い|欲しい|お願い|mua|lấy|đặt|thêm|\bnak\b|mahu|beli|tambah/i,
};
const CN_NUM = { 一: 1, 兩: 2, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
const INTENT_ZH = { gift: '想找送長輩的禮盒', less: '想要不太甜的甜點', budget: '詢問預算內的推薦', shipping: '詢問運費與配送', allergen: '詢問過敏原', storage: '詢問保存方式', checkout: '要求結帳', add: '要購買商品', recommend: '請求推薦', thanks: '致謝', greet: '打招呼', cartView: '查看購物車', product: '詢問商品', fallback: '一般詢問' };

export function initBot(shop) {
  const box = $('#bot'), fab = $('#botFab'), msgs = $('#botMsgs');
  let opened = false, voiceOn = 'speechSynthesis' in window, rec = null, listening = false;
  const conv = [];
  const L = () => shop.lang;
  const speechLang = () => LANGS.find(l => l.id === L()).speech;

  // 語言選單
  const sel = $('#botLang');
  const renderSel = () => { sel.innerHTML = LANGS.map(l => `<option value="${l.id}" ${l.id === L() ? 'selected' : ''}>${l.label}</option>`).join(''); };
  renderSel();
  sel.addEventListener('change', () => shop.setLang(sel.value));
  shop.onLang((l, silent) => {
    renderSel(); renderChips(); renderVoice();
    if (opened && !silent) botSay(() => t(L(), 'botGreet'));
  });

  // 語音回覆開關
  const renderVoice = () => { const b = $('#botVoice'); b.innerHTML = icon(voiceOn ? 'volume' : 'mute', 18); b.title = t(L(), voiceOn ? 'voiceOn' : 'voiceOff'); b.classList.toggle('on', voiceOn); };
  renderVoice();
  $('#botVoice').addEventListener('click', () => { voiceOn = !voiceOn && ('speechSynthesis' in window); if (!voiceOn) stopSpeak(); renderVoice(); sysNote(t(L(), voiceOn ? 'voiceOn' : 'voiceOff')); });

  function renderChips() {
    const chips = t(L(), 'chips');
    $('#botChips').innerHTML = chips.map((c, i) => `<button data-i="${i}">${esc(c)}</button>`).join('');
    $$('#botChips button').forEach(b => b.addEventListener('click', () => userSay(b.textContent, { zh: t('zh', 'chips')[+b.dataset.i], chip: true })));
  }
  renderChips();

  function open(prefill) {
    if (!opened) {
      opened = true; box.hidden = false;
      gsap.fromTo(box, { opacity: 0, y: 30, scale: 0.92, transformOrigin: '100% 100%' }, { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'back.out(1.6)' });
      fab.classList.add('hide');
      if (!msgs.children.length) botSay(() => t(L(), 'botGreet'), { delay: 300 });
    }
    if (prefill) { const i = t(L(), 'chips').indexOf(prefill); setTimeout(() => userSay(prefill, { zh: i >= 0 ? t('zh', 'chips')[i] : undefined, chip: i >= 0 }), 500); }
    setTimeout(() => $('#botInput').focus(), 300);
  }
  function close() { gsap.to(box, { opacity: 0, y: 30, scale: 0.92, duration: 0.25, onComplete: () => { box.hidden = true; opened = false; fab.classList.remove('hide'); } }); }
  fab.addEventListener('click', () => open());
  $('#botClose').addEventListener('click', close);
  setTimeout(() => { if (!opened) gsap.fromTo('.fab-badge', { scale: 0 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' }); }, 2500);

  $('#botForm').addEventListener('submit', (e) => { e.preventDefault(); const v = $('#botInput').value.trim(); if (v) { $('#botInput').value = ''; userSay(v); } });

  // 麥克風（Web Speech API）
  $('#botMic').addEventListener('click', () => {
    if (listening) { try { rec && rec.stop(); } catch { /* ignore */ } return; }
    rec = getRecognizer(speechLang());
    if (!rec) { sysNote(t(L(), 'micNo')); gsap.fromTo('#botMic', { x: -5 }, { x: 0, duration: 0.5, ease: 'elastic.out(1,0.3)' }); return; }
    const input = $('#botInput');
    rec.onresult = (e) => { let s = ''; for (const r of e.results) s += r[0].transcript; input.value = s; if (e.results[e.results.length - 1].isFinal) { stopL(); input.value = ''; voiceOn = 'speechSynthesis' in window; renderVoice(); userSay(s); } };
    const stopL = () => { listening = false; $('#botMic').classList.remove('rec'); input.placeholder = t(L(), 'botPh'); };
    rec.onerror = stopL; rec.onend = stopL;
    try { rec.start(); listening = true; $('#botMic').classList.add('rec'); input.placeholder = t(L(), 'listening'); } catch { stopL(); }
  });

  // ---------- 訊息呈現 ----------
  function scroll() { msgs.scrollTo({ top: msgs.scrollHeight, behavior: 'smooth' }); }
  function sysNote(text) { const n = el(`<div class="b-sys">${esc(text)}</div>`); msgs.appendChild(n); gsap.fromTo(n, { opacity: 0 }, { opacity: 1, duration: 0.4 }); scroll(); }
  function userSay(text, { zh: zhKnown, chip = false } = {}) {
    const n = el(`<div class="b-msg me"><div class="b-bub">${esc(text)}</div></div>`);
    msgs.appendChild(n); gsap.fromTo(n, { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.35 }); scroll();
    // 自動偵測語言並切換
    const d = detectLang(text);
    if (!chip && d && d !== L() && !(L() === 'ms' && d === 'en')) { shop.setLang(d, { silent: true }); sysNote(t(d, 'rSwitched')); }
    const res = respond(text);
    conv.push({ from: 'c', text, zh: L() === 'zh' ? undefined : (zhKnown || `〔AI 意圖摘要〕${res.gloss || INTENT_ZH[res.intent] || '一般詢問'}`) });
    botSay(res.text, { cards: res.cards, checkout: res.checkout, delay: 700 + Math.min(900, text.length * 15) });
  }
  async function botSay(textFn, { cards = null, checkout = false, delay = 650 } = {}) {
    const typing = el('<div class="b-msg ai"><span class="b-av">' + icon('bot', 16) + '</span><div class="b-bub typing"><i></i><i></i><i></i></div></div>');
    msgs.appendChild(typing); scroll();
    await sleep(delay);
    typing.remove();
    const text = textFn(L());
    conv.push({ from: 'ai', text, zh: L() === 'zh' ? undefined : textFn('zh') });
    const n = el(`<div class="b-msg ai"><span class="b-av">${icon('bot', 16)}</span><div class="b-col"><div class="b-bub">${esc(text)}</div></div></div>`);
    const col = $('.b-col', n);
    if (cards && cards.length) {
      const row = el(`<div class="bc-row">${cards.map(pid => cardHTML(pid)).join('')}</div>`);
      col.appendChild(row);
      $$('[data-badd]', row).forEach(b => b.addEventListener('click', () => {
        cart.add(b.dataset.badd, 1);
        b.textContent = '✓ ' + t(L(), 'added'); b.disabled = true;
        conv.push({ from: 'c', text: `[+] ${pName(L(), b.dataset.badd)}`, zh: `〔點選加入購物車〕${pName('zh', b.dataset.badd)}` });
        botSay((l) => t(l, 'rAdded', { p: pName(l, b.dataset.badd), q: 1, t: cart.totals().subtotal.toLocaleString() }), { delay: 450 });
      }));
    }
    if (checkout) col.appendChild(checkoutCard());
    msgs.appendChild(n);
    gsap.fromTo(n, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
    if (cards) gsap.fromTo($$('.bc-card', n), { opacity: 0, y: 16, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, stagger: 0.08, duration: 0.4, delay: 0.15, ease: 'back.out(1.6)' });
    scroll();
    if (voiceOn) speak(text, speechLang(), { rate: 1.05 });
  }
  function cardHTML(pid) {
    const p = PRODUCT_MAP[pid];
    return `<div class="bc-card" style="--pc:${p.color}"><div class="bc-art">${productArt(pid, 86)}</div><b>${esc(pName(L(), pid))}</b>
      <span class="bc-meta">${money(p.price)} · ${t(L(), 'sweet')} ${'●'.repeat(p.sweet)}${'○'.repeat(5 - p.sweet)}</span>
      <button data-badd="${pid}">${t(L(), 'add')}</button></div>`;
  }
  function checkoutCard() {
    const items = cart.list();
    const regions = t(L(), 'regions');
    const intl = L() === 'ja' && items.every(i => PRODUCT_MAP[i.pid].storage === 'room');
    const region = intl ? regions[7] : regions[3];
    const tt = cart.totals(region);
    const c = el(`<div class="b-checkout">
      ${items.map(i => `<div class="bco-row"><span>${esc(pName(L(), i.pid))} × ${i.qty}</span><b>${money(i.price * i.qty)}</b></div>`).join('')}
      <div class="bco-row muted"><span>${t(L(), 'shipping')}（${esc(region)}）</span><b>${tt.shipping ? money(tt.shipping) : t(L(), 'free')}</b></div>
      <div class="bco-row big"><span>${t(L(), 'total')}</span><b>${money(tt.total)}</b></div>
      <div class="bco-pay"><span>${icon('lock', 13)} ${t(L(), 'ckCard')} · LINE Pay · Apple Pay</span></div>
      <button class="bco-go">${t(L(), 'rConfirm')}</button>
      <button class="bco-alt">${t(L(), 'viewCart')}</button></div>`);
    $('.bco-alt', c).addEventListener('click', () => shop.openCart());
    $('.bco-go', c).addEventListener('click', async (e) => {
      const b = e.currentTarget; b.disabled = true; b.innerHTML = `<span class="s-spin"></span>${t(L(), 'ckProcessing')}`;
      await sleep(1200);
      if (!cart.count()) { b.textContent = '—'; return; }
      conv.push({ from: 'c', text: `[${t(L(), 'rConfirm')}]`, zh: '〔按下確認付款〕' });
      const order = shop.placeOrder({ region, payment: '信用卡', conv: conv.slice() });
      b.innerHTML = '✓ ' + order.id; b.classList.add('done');
      gsap.fromTo(c, { boxShadow: '0 0 0 0 rgba(45,182,116,.8)' }, { boxShadow: '0 0 0 14px rgba(45,182,116,0)', duration: 1 });
      botSay((l) => t(l, 'rPaid', { id: order.id, inv: order.invoice }), { delay: 400 });
    });
    return c;
  }

  // ---------- 意圖比對 ----------
  function matchProducts(q) {
    const found = [];
    for (const [pid, al] of Object.entries(PRODUCT_ALIASES)) if (al.some(a => q.includes(a.toLowerCase()))) found.push(pid);
    return found;
  }
  function extractQty(q) {
    let m = q.match(/(?:x|×|\*)\s*(\d{1,2})\b/i) || q.match(/(\d{1,2})\s*(盒|個|條|份|組|箱|入|つ|個|本|hộp|cái|kotak|biji|boxes|box|pcs|pieces|rolls?|loaf)/i);
    if (m) return +m[1];
    m = q.match(/([一兩二三四五六七八九十])\s*(盒|個|條|份|組|箱)/);
    if (m) return CN_NUM[m[1]];
    m = q.match(/\b(\d{1,2})\b/); if (m && +m[1] > 0 && +m[1] < 20) return +m[1];
    return 0;
  }
  function budgetAmount(q) {
    const nums = (q.replace(/,/g, '').match(/\d{2,6}/g) || []).map(Number).filter(n => n >= 100);
    if (!nums.length) return 0;
    let n = Math.max(...nums);
    if (/\brm\b/i.test(q)) n = Math.round(n * 7);
    return n;
  }
  const byPop = [...PRODUCTS].sort((a, b) => b.pop - a.pop);

  function respond(text) {
    const q = text.toLowerCase();
    const prods = matchProducts(q);
    if (R.checkout.test(q)) {
      if (!cart.count()) return { intent: 'checkout', text: (l) => t(l, 'rCartEmpty'), cards: byPop.slice(0, 3).map(p => p.id) };
      return { intent: 'checkout', text: (l) => t(l, 'rCheckout'), checkout: true };
    }
    if (R.allergen.test(q)) {
      if (prods.length) {
        const p = PRODUCT_MAP[prods[0]];
        return { intent: 'allergen', text: (l) => t(l, 'rAllergenOne', { p: pName(l, p.id), a: p.allergens.map(a => t(l, 'al_' + a)).join(', '), nuts: t(l, p.allergens.includes('nuts') ? 'rHasNuts' : 'rNoNuts') }) };
      }
      return { intent: 'allergen', text: (l) => { const cjk = l === 'zh' || l === 'ja'; return t(l, 'rAllergen', { list: PRODUCTS.map(p => cjk ? `${pName(l, p.id)}（${p.allergens.map(a => t(l, 'al_' + a)).join('、')}）` : `${pName(l, p.id)} (${p.allergens.map(a => t(l, 'al_' + a)).join(', ')})`).join(cjk ? '；' : '; ') }); } };
    }
    if (R.storage.test(q)) {
      if (prods.length) { const p = PRODUCT_MAP[prods[0]]; return { intent: 'storage', text: (l) => t(l, 'rStorageOne', { p: pName(l, p.id), s: t(l, 'st_' + p.storage, { d: p.days }) }) }; }
      return { intent: 'storage', text: (l) => t(l, 'rStorage') };
    }
    if (R.shipping.test(q) && !R.add.test(q.replace(/寄到|ship/g, ''))) return { intent: 'shipping', text: (l) => t(l, 'rShip') };
    const amt = budgetAmount(q);
    if (amt && (R.budget.test(q) || R.money.test(q)) && !prods.length) {
      const wantLess = R.less.test(q), wantGift = R.gift.test(q);
      const pool = byPop.filter(p => (!wantLess || p.sweet <= 2) && (!wantGift || p.gift));
      const ok = (pool.length ? pool : byPop).filter(p => p.price <= amt);
      const gloss = `預算 NT$${amt} 內${wantLess ? '、不要太甜' : ''}${wantGift ? '、送禮用' : ''}的推薦`;
      if (!ok.length) return { intent: 'budget', gloss, text: (l) => t(l, 'rBudgetNone', { n: amt.toLocaleString() }), cards: ['pound'] };
      let best = null;
      for (let i = 0; i < PRODUCTS.length; i++) for (let j = i + 1; j < PRODUCTS.length; j++) {
        const s = PRODUCTS[i].price + PRODUCTS[j].price;
        if (s <= amt && (!best || s > best.s)) best = { a: PRODUCTS[i].id, b: PRODUCTS[j].id, s };
      }
      return { intent: 'budget', gloss, cards: ok.slice(0, 3).map(p => p.id),
        text: (l) => t(l, 'rBudget', { n: amt.toLocaleString() }) + (best ? ' ' + t(l, 'rBudgetCombo', { a: pName(l, best.a), b: pName(l, best.b), t: best.s.toLocaleString() }) : '') };
    }
    if (prods.length && (R.add.test(q) || extractQty(q))) {
      const qty = Math.max(1, extractQty(q));
      prods.forEach(pid => cart.add(pid, qty));
      const total = cart.totals().subtotal;
      return { intent: 'add', gloss: `要購買 ${prods.map(pid => pName('zh', pid)).join('、')} × ${qty}`, text: (l) => t(l, 'rAdded', { p: prods.map(pid => pName(l, pid)).join(' + '), q: qty, t: total.toLocaleString() }) };
    }
    if (R.gift.test(q)) return { intent: 'gift', text: (l) => t(l, 'rGift'), cards: ['cookie', 'pineapple', 'pound'] };
    if (R.less.test(q)) return { intent: 'less', text: (l) => t(l, 'rLess'), cards: ['pound', 'cookie'] };
    if (prods.length) return { intent: 'product', gloss: `詢問 ${prods.map(pid => pName('zh', pid)).join('、')}`, text: (l) => t(l, 'rRecommend'), cards: prods.slice(0, 3) };
    if (R.cartView.test(q)) { shop.openCart(); return { intent: 'cartView', text: (l) => cart.count() ? t(l, 'rCheckout') : t(l, 'rCartEmpty'), checkout: cart.count() > 0 }; }
    if (R.recommend.test(q)) return { intent: 'recommend', text: (l) => t(l, 'rRecommend'), cards: ['basque', 'lemon', 'roll'] };
    if (R.thanks.test(q)) return { intent: 'thanks', text: (l) => t(l, 'rThanks') };
    if (R.greet.test(q)) return { intent: 'greet', text: (l) => t(l, 'botGreet') };
    return { intent: 'fallback', text: (l) => t(l, 'rFallback'), cards: ['basque', 'cookie', 'lemon'] };
  }

  return { open, close, say: userSay };
}
