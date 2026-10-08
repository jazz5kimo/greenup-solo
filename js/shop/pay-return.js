// 付款結果頁（pay-return.html）：金流商付完款 → n8n pay/return 302 → 這裡（?orderId=…&provider=…&lang=…）
// 輪詢 n8n 的 pay/status（每 3 秒，最多 10 分鐘），成功就 store.markPaid 入帳（跨分頁同步到後台），
// 顯示付款成功／處理中（ATM 虛擬帳號、超商代碼與期限，可複製）／失敗，提供「回到商店」「查看訂單」。
// 風格沿用銷售網頁：themes.js 的變數＋shop-config 的風格設定；五種語言。
// 正式模式需安裝包 n8n 金流設定；示範模式不連線（只讀本機 store 的訂單狀態）。
import '../tenant.js';
import { TENANT, TENANT_ID } from '../tenant.js';
import { store } from '../state.js';
import { LANGS } from '../i18n.js';
import { getShopConfig } from '../shop-config.js';
import { resolveTheme, themeVars, styleOf } from './themes.js';
import { merchantLogo } from '../merchant-art.js';
import { $, $$, esc, money, gsap } from '../util.js';
import { isLive, getPayConfig, pollStatus, getPayRecord, errorText, methodLabel, PROVIDER_NAME, fmtExpire, POLL_MAX, POLL_INTERVAL, PAY_NOTE } from '../payments.js';

const L = {
  zh: {
    okT: '付款成功，謝謝你！', okS: '訂單已入帳並即時同步到店主後台，店家會盡快為你準備。',
    waitT: '付款處理中', waitS: '正在向金流商確認付款結果，請稍候，不用重新整理。', waitAtm: '已取得 ATM 虛擬帳號，請在期限內轉帳，入帳後會自動通知你。', waitCvs: '已取得超商繳費代碼，請在期限內到超商繳費，入帳後會自動通知你。',
    failT: '付款未完成', failS: '這次付款沒有成功，沒有扣款。你可以回到商店重新結帳。', expT: '付款已逾期', expS: '這筆付款超過繳費期限，請回到商店重新下單。',
    noneT: '找不到這筆付款', noneS: '金流系統沒有這筆訂單的付款紀錄，請確認訂單編號或聯絡店家。',
    toT: '還在處理中', toS: '已等待 10 分鐘仍未收到付款結果（ATM／超商入帳可能需要幾分鐘到一天）。請稍後至「訂單查詢」確認，不用重複付款。',
    missT: '缺少訂單編號', missS: '網址沒有 orderId，無法查詢付款狀態。', demoS: '示範模式不連線金流：顯示本機訂單狀態。',
    order: '訂單編號', amount: '金額', method: '付款方式', provider: '金流商', tradeNo: '交易序號', paidAt: '付款時間',
    bank: '銀行代碼', account: '虛擬帳號', expire: '繳費期限', code: '繳費代碼', copy: '複製', copied: '已複製',
    back: '回到商店', track: '查看訂單', retry: '重新查詢', polling: '每 {s} 秒自動查詢中（第 {n} 次）', errLine: '查詢失敗，將自動重試：{e}',
    note: '正式模式需安裝包 n8n 金流設定；示範模式不連線。本頁不會接觸你的卡號。', foot: '{name}・GreenUP 原型示範',
  },
  en: {
    okT: 'Payment successful. Thank you!', okS: 'Your order is paid and synced live to the owner console. The shop will prepare it shortly.',
    waitT: 'Processing payment', waitS: 'Confirming the result with the payment provider. Please wait, no need to refresh.', waitAtm: 'Your ATM virtual account is ready. Transfer before the deadline and we will notify you once received.', waitCvs: 'Your convenience-store payment code is ready. Pay at any store before the deadline and we will notify you once received.',
    failT: 'Payment not completed', failS: 'The payment did not go through and nothing was charged. You can return to the shop and check out again.', expT: 'Payment expired', expS: 'This payment passed its deadline. Please place the order again.',
    noneT: 'Payment not found', noneS: 'No payment record exists for this order. Check the order number or contact the shop.',
    toT: 'Still processing', toS: 'No result after 10 minutes (ATM / store payments can take minutes to a day). Please check under “Track order” later. Do not pay again.',
    missT: 'Missing order number', missS: 'The URL has no orderId, so the payment status cannot be checked.', demoS: 'Demo mode does not connect to a payment provider: showing the local order status.',
    order: 'Order no.', amount: 'Amount', method: 'Method', provider: 'Provider', tradeNo: 'Trade no.', paidAt: 'Paid at',
    bank: 'Bank code', account: 'Virtual account', expire: 'Pay by', code: 'Payment code', copy: 'Copy', copied: 'Copied',
    back: 'Back to shop', track: 'Track order', retry: 'Check again', polling: 'Auto-checking every {s}s (attempt {n})', errLine: 'Check failed, retrying: {e}',
    note: 'Live mode requires the n8n payment setup from the installer; demo mode never connects. This page never sees your card number.', foot: '{name} · GreenUP prototype demo',
  },
  ja: {
    okT: 'お支払いが完了しました', okS: 'ご注文は入金済みとしてオーナー管理画面に同期されました。まもなく準備いたします。',
    waitT: '決済処理中', waitS: '決済会社に結果を確認しています。更新せずにお待ちください。', waitAtm: 'ATM 振込用の口座番号を発行しました。期限内にお振込みください。入金確認後にお知らせします。', waitCvs: 'コンビニ支払いコードを発行しました。期限内にお支払いください。入金確認後にお知らせします。',
    failT: 'お支払いが完了していません', failS: '決済は成立せず、請求もされていません。お店に戻ってもう一度お手続きください。', expT: 'お支払い期限切れ', expS: 'お支払い期限を過ぎました。もう一度ご注文ください。',
    noneT: '決済が見つかりません', noneS: 'このご注文の決済記録がありません。注文番号をご確認いただくか、お店にご連絡ください。',
    toT: 'まだ処理中です', toS: '10 分経っても結果が届いていません（ATM・コンビニ入金は数分〜1 日かかることがあります）。後ほど「注文照会」でご確認ください。二重にお支払いしないでください。',
    missT: '注文番号がありません', missS: 'URL に orderId がないため、決済状況を確認できません。', demoS: 'デモモードでは決済会社に接続しません。端末内の注文状況を表示しています。',
    order: '注文番号', amount: '金額', method: 'お支払い方法', provider: '決済会社', tradeNo: '取引番号', paidAt: '支払日時',
    bank: '銀行コード', account: '振込口座', expire: '支払期限', code: '支払コード', copy: 'コピー', copied: 'コピーしました',
    back: 'お店に戻る', track: '注文照会', retry: '再確認', polling: '{s} 秒ごとに自動確認中（{n} 回目）', errLine: '確認に失敗しました。再試行します：{e}',
    note: '本番モードはインストーラの n8n 決済設定が必要です。デモモードは接続しません。カード番号を当ページが扱うことはありません。', foot: '{name}・GreenUP プロトタイプ',
  },
  vi: {
    okT: 'Thanh toán thành công. Cảm ơn bạn!', okS: 'Đơn hàng đã được ghi nhận và đồng bộ ngay với trang quản lý. Cửa hàng sẽ chuẩn bị sớm.',
    waitT: 'Đang xử lý thanh toán', waitS: 'Đang xác nhận kết quả với cổng thanh toán. Vui lòng đợi, không cần tải lại.', waitAtm: 'Đã có số tài khoản ảo ATM. Vui lòng chuyển khoản trước hạn, chúng tôi sẽ báo khi nhận được.', waitCvs: 'Đã có mã thanh toán cửa hàng tiện lợi. Vui lòng thanh toán trước hạn, chúng tôi sẽ báo khi nhận được.',
    failT: 'Thanh toán chưa hoàn tất', failS: 'Giao dịch không thành công và chưa trừ tiền. Bạn có thể quay lại cửa hàng để thanh toán lại.', expT: 'Thanh toán đã hết hạn', expS: 'Giao dịch đã quá hạn thanh toán. Vui lòng đặt hàng lại.',
    noneT: 'Không tìm thấy thanh toán', noneS: 'Không có bản ghi thanh toán cho đơn này. Kiểm tra mã đơn hoặc liên hệ cửa hàng.',
    toT: 'Vẫn đang xử lý', toS: 'Sau 10 phút vẫn chưa có kết quả (ATM / cửa hàng tiện lợi có thể mất vài phút đến một ngày). Vui lòng kiểm tra lại ở “Tra đơn” sau. Đừng thanh toán lại.',
    missT: 'Thiếu mã đơn', missS: 'URL không có orderId nên không thể kiểm tra trạng thái.', demoS: 'Chế độ demo không kết nối cổng thanh toán: hiển thị trạng thái đơn trên máy này.',
    order: 'Mã đơn', amount: 'Số tiền', method: 'Phương thức', provider: 'Cổng thanh toán', tradeNo: 'Mã giao dịch', paidAt: 'Thời gian thanh toán',
    bank: 'Mã ngân hàng', account: 'Tài khoản ảo', expire: 'Hạn thanh toán', code: 'Mã thanh toán', copy: 'Sao chép', copied: 'Đã sao chép',
    back: 'Về cửa hàng', track: 'Tra đơn', retry: 'Kiểm tra lại', polling: 'Tự động kiểm tra mỗi {s} giây (lần {n})', errLine: 'Kiểm tra thất bại, sẽ thử lại: {e}',
    note: 'Chế độ chính thức cần cấu hình thanh toán n8n từ bộ cài; chế độ demo không kết nối. Trang này không lưu số thẻ của bạn.', foot: '{name} · Bản demo GreenUP',
  },
  ms: {
    okT: 'Bayaran berjaya. Terima kasih!', okS: 'Pesanan anda telah dibayar dan disegerakkan ke konsol pemilik. Kedai akan menyediakannya tidak lama lagi.',
    waitT: 'Memproses bayaran', waitS: 'Mengesahkan keputusan dengan penyedia pembayaran. Sila tunggu, tidak perlu muat semula.', waitAtm: 'Akaun maya ATM anda sedia. Pindahkan sebelum tarikh akhir dan kami akan memaklumkan anda setelah diterima.', waitCvs: 'Kod bayaran kedai serbaneka anda sedia. Bayar sebelum tarikh akhir dan kami akan memaklumkan anda setelah diterima.',
    failT: 'Bayaran tidak selesai', failS: 'Bayaran tidak berjaya dan tiada caj dikenakan. Anda boleh kembali ke kedai dan cuba lagi.', expT: 'Bayaran tamat tempoh', expS: 'Bayaran ini telah melepasi tarikh akhir. Sila buat pesanan semula.',
    noneT: 'Bayaran tidak dijumpai', noneS: 'Tiada rekod bayaran untuk pesanan ini. Semak nombor pesanan atau hubungi kedai.',
    toT: 'Masih diproses', toS: 'Tiada keputusan selepas 10 minit (bayaran ATM / kedai boleh mengambil masa beberapa minit hingga sehari). Sila semak di “Jejak pesanan” kemudian. Jangan bayar semula.',
    missT: 'Tiada nombor pesanan', missS: 'URL tiada orderId, jadi status bayaran tidak dapat disemak.', demoS: 'Mod demo tidak menyambung ke penyedia pembayaran: memaparkan status pesanan tempatan.',
    order: 'No. pesanan', amount: 'Jumlah', method: 'Kaedah', provider: 'Penyedia', tradeNo: 'No. urus niaga', paidAt: 'Dibayar pada',
    bank: 'Kod bank', account: 'Akaun maya', expire: 'Bayar sebelum', code: 'Kod bayaran', copy: 'Salin', copied: 'Disalin',
    back: 'Kembali ke kedai', track: 'Jejak pesanan', retry: 'Semak semula', polling: 'Semakan automatik setiap {s}s (cubaan {n})', errLine: 'Semakan gagal, mencuba semula: {e}',
    note: 'Mod sebenar memerlukan tetapan pembayaran n8n daripada pemasang; mod demo tidak menyambung. Halaman ini tidak menyimpan nombor kad anda.', foot: '{name} · Demo prototaip GreenUP',
  },
};

const LS_LANG = 'greenup-solo:lang';
const q = new URLSearchParams(location.search);
let lang = q.get('lang') || (() => { try { return localStorage.getItem(LS_LANG) || 'zh'; } catch { return 'zh'; } })();
if (!LANGS.find(l => l.id === lang)) lang = 'zh';
const t = (k, v = {}) => String((L[lang] || L.zh)[k] ?? L.zh[k] ?? k).replace(/\{(\w+)\}/g, (_, n) => v[n] ?? '');
const orderId = (q.get('orderId') || q.get('orderid') || '').trim();
const providerParam = (q.get('provider') || '').trim();

// ---- 風格：沿用銷售網頁（themes.js 變數＋設計軸） ----
function paint() {
  const b = document.body;
  const cfg = getShopConfig();
  const { theme } = resolveTheme(cfg, TENANT);
  for (const [k, v] of Object.entries(themeVars(theme))) b.style.setProperty(k, v);
  b.dataset.theme = theme.id; b.dataset.cat = TENANT.cat || '';
  b.classList.add('lay-' + (TENANT.layout || 'classic'), 'tenant-' + TENANT_ID);
  const st = Object.assign({}, styleOf(TENANT), theme.style || {});
  for (const k of Object.keys(st)) { if (st[k]) b.setAttribute('data-sf-' + k, st[k]); else b.removeAttribute('data-sf-' + k); }
  b.classList.toggle('sf-dark', !!theme.dark);
  const meta = document.querySelector('meta[name="theme-color"]') || document.head.appendChild(Object.assign(document.createElement('meta'), { name: 'theme-color' }));
  meta.content = theme.vars.cream;
}
const isAmei = TENANT_ID === 'amei';
function renderBrand() {
  const b = $('#prBrand');
  const main = lang === 'zh' ? TENANT.name : (TENANT.en || TENANT.name), sub = lang === 'zh' ? (TENANT.en || '') : TENANT.name;
  b.href = shopUrl();
  $('.s-logo', b).innerHTML = isAmei ? '<svg viewBox="0 0 40 40" width="40" height="40"><circle cx="20" cy="20" r="19" fill="#F7B2C4"/><circle cx="20" cy="20" r="13" fill="#fff6e8"/><path d="M20 10c4 2 6 5.5 5.4 9.6-.6 3.6-3.1 5.9-5.4 5.9s-4.8-2.3-5.4-5.9C14 15.5 16 12 20 10z" fill="#2DB674"/></svg>' : merchantLogo(TENANT, 40);
  $('b', b).textContent = main; $('small', b).textContent = sub;
  document.title = `${lang === 'zh' ? '付款結果' : 'Payment'}｜${TENANT.name}`;
  $('#prFoot').textContent = t('foot', { name: lang === 'zh' ? TENANT.name : (TENANT.en || TENANT.name) });
  const sel = $('#prLang');
  sel.innerHTML = LANGS.map(l => `<option value="${l.id}" ${l.id === lang ? 'selected' : ''}>${esc(l.label)}</option>`).join('');
  document.documentElement.lang = { zh: 'zh-Hant-TW', en: 'en', ja: 'ja', vi: 'vi', ms: 'ms' }[lang] || 'zh-Hant-TW';
}
const shopUrl = (extra = {}) => { const u = new URL('shop.html', location.href); u.search = ''; u.searchParams.set('tenant', TENANT_ID); u.searchParams.set('lang', lang); for (const [k, v] of Object.entries(extra)) u.searchParams.set(k, v); return u.toString(); };

// ---- 狀態畫面 ----
const IC = {
  ok: '<svg viewBox="0 0 120 120" class="ok-check pr-check"><circle cx="60" cy="60" r="50"/><path d="M38 62 l15 15 l30 -32"/></svg>',
  wait: '<span class="pr-spin"></span>',
  clock: '<svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  fail: '<svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
  warn: '<svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>',
};
let state = { kind: 'wait', data: null, error: null, tries: 0 };
let poller = null;

function localOrder() { return store.orders.find(o => o.id === orderId) || null; }

function detailRows(d) {
  const o = localOrder(); const rec = getPayRecord(orderId) || {};
  const amount = (d && d.amount) || (o && o.total) || rec.amount;
  const method = (d && d.method) || rec.method || '';
  const provider = (d && d.provider) || rec.provider || providerParam || '';
  const rows = [[t('order'), `<b class="mono">${esc(orderId)}</b>`]];
  if (amount) rows.push([t('amount'), `<b>${money(amount)}</b>`]);
  if (method) rows.push([t('method'), `<b>${esc(methodLabel(method, lang))}</b>`]);
  if (provider) rows.push([t('provider'), `<b>${esc(PROVIDER_NAME[provider] || provider)}${d && d.env === 'test' ? ' <i class="pr-env">test</i>' : ''}</b>`]);
  if (d && d.tradeNo) rows.push([t('tradeNo'), `<b class="mono">${esc(d.tradeNo)}</b>`]);
  if (d && d.status === 'paid' && d.paidAt) rows.push([t('paidAt'), `<b>${esc(fmtExpire(d.paidAt))}</b>`]);
  return rows.map(([k, v]) => `<span>${esc(k)}</span>${v}`).join('');
}
const copyBtn = (val) => `<button type="button" class="pr-copy" data-copy="${esc(val)}">${esc(t('copy'))}</button>`;
function infoHTML(d) {
  if (!d) return '';
  if (d.atm && d.atm.account) return `<div class="pr-info-h">${t('waitAtm')}</div><dl class="pr-dl">
    ${d.atm.bank ? `<dt>${esc(t('bank'))}</dt><dd><b class="mono">${esc(d.atm.bank)}</b>${copyBtn(d.atm.bank)}</dd>` : ''}
    <dt>${esc(t('account'))}</dt><dd><b class="mono big">${esc(d.atm.account)}</b>${copyBtn(d.atm.account)}</dd>
    ${d.atm.expire ? `<dt>${esc(t('expire'))}</dt><dd><b>${esc(fmtExpire(d.atm.expire))}</b></dd>` : ''}</dl>`;
  if (d.cvs && d.cvs.code) return `<div class="pr-info-h">${t('waitCvs')}</div><dl class="pr-dl">
    <dt>${esc(t('code'))}</dt><dd><b class="mono big">${esc(d.cvs.code)}</b>${copyBtn(d.cvs.code)}</dd>
    ${d.cvs.expire ? `<dt>${esc(t('expire'))}</dt><dd><b>${esc(fmtExpire(d.cvs.expire))}</b></dd>` : ''}</dl>`;
  return '';
}

function render() {
  const card = $('#prCard'); const { kind, data } = state;
  const map = { ok: ['ok', 'okT', 'okS'], wait: ['wait', 'waitT', 'waitS'], failed: ['fail', 'failT', 'failS'], expired: ['fail', 'expT', 'expS'], none: ['warn', 'noneT', 'noneS'], timeout: ['clock', 'toT', 'toS'], missing: ['warn', 'missT', 'missS'] };
  const [ic, tk, sk] = map[kind] || map.wait;
  card.dataset.state = kind;
  const info = kind === 'wait' ? infoHTML(data) : '';
  $('#prIc').innerHTML = IC[ic];
  $('#prTitle').textContent = t(tk);
  $('#prSub').textContent = kind === 'wait' && info ? '' : t(sk);
  $('#prGrid').innerHTML = kind === 'missing' ? '' : detailRows(data);
  $('#prGrid').hidden = kind === 'missing';
  const ib = $('#prInfo'); ib.innerHTML = info; ib.hidden = !info;
  const act = $('#prAct');
  act.innerHTML = `<a class="s-btn s-btn-ghost" id="prBack" href="${esc(shopUrl())}">${esc(t('back'))}</a>`
    + (orderId ? `<a class="s-btn s-btn-primary" id="prTrack" href="${esc(shopUrl({ track: orderId }))}">${esc(t('track'))}</a>` : '')
    + (kind === 'timeout' || kind === 'none' ? `<button class="s-btn s-btn-ghost" id="prRetry" type="button">${esc(t('retry'))}</button>` : '');
  $('#prRetry', act)?.addEventListener('click', () => start());
  $$('[data-copy]', ib).forEach(b => b.addEventListener('click', async () => {
    const v = b.dataset.copy; let ok = false;
    try { if (navigator.clipboard) { await navigator.clipboard.writeText(v); ok = true; } } catch { ok = false; }
    if (!ok) { try { const ta = document.createElement('textarea'); ta.value = v; document.body.appendChild(ta); ta.select(); ok = document.execCommand('copy'); ta.remove(); } catch { ok = false; } }
    b.textContent = ok ? t('copied') : t('copy'); b.classList.toggle('done', ok);
    setTimeout(() => { b.textContent = t('copy'); b.classList.remove('done'); }, 1600);
  }));
  const note = $('#prNote');
  note.textContent = isLive() ? t('note') : `${t('demoS')} ${PAY_NOTE}`;
  if (kind === 'ok' && gsap) {
    const c = $('.pr-check circle', card), p = $('.pr-check path', card);
    if (c && p) {
      const lc = c.getTotalLength(), lp = p.getTotalLength();
      gsap.set(c, { strokeDasharray: lc, strokeDashoffset: lc }); gsap.set(p, { strokeDasharray: lp, strokeDashoffset: lp });
      gsap.timeline().to(c, { strokeDashoffset: 0, duration: 0.6 }).to(p, { strokeDashoffset: 0, duration: 0.4 });
    }
  }
}
function setErr(msg) { const e = $('#prErr'); e.textContent = msg || ''; e.hidden = !msg; }
function setPollLine(n) { const e = $('#prErr'); if (state.kind === 'wait') { e.textContent = t('polling', { s: POLL_INTERVAL / 1000, n }); e.hidden = false; e.classList.remove('bad'); } }

// ---- 啟動：示範模式只看本機；正式模式輪詢 n8n ----
function start() {
  if (poller) { poller.stop(); poller = null; }
  if (!orderId) { state = { kind: 'missing' }; render(); setErr(''); return; }
  if (!isLive()) {
    const o = localOrder();
    state = { kind: o ? (o.status === 'paid' ? 'ok' : 'wait') : 'none', data: o ? { amount: o.total, status: o.status } : null };
    render(); setErr('');
    return;
  }
  state = { kind: 'wait', data: null }; render(); setPollLine(1);
  poller = pollStatus(orderId, {
    onUpdate: ({ status, data, error, tries }) => {
      if (status === 'error') { const e = $('#prErr'); e.textContent = t('errLine', { e: errorText(error) }); e.hidden = false; e.classList.add('bad'); return; }
      if (status === 'paid') { state = { kind: 'ok', data }; render(); setErr(''); return; }
      if (status === 'failed' || status === 'expired' || status === 'none') { state = { kind: status, data }; render(); setErr(''); return; }
      state = { kind: 'wait', data }; render(); setPollLine(tries);
    },
  });
  poller.promise.then((r) => { if (r && r.timeout) { state = { kind: 'timeout', data: state.data }; render(); setErr(''); } });
}

paint(); renderBrand();
$('#prLang').addEventListener('change', (e) => { lang = e.target.value; try { localStorage.setItem(LS_LANG, lang); } catch { /* ignore */ } renderBrand(); render(); if (state.kind === 'wait' && isLive()) setPollLine(state.tries || 1); });
start();
if (gsap) gsap.from('#prCard', { opacity: 0, y: 24, duration: 0.6, ease: 'power3.out' });
// 另一個分頁（後台輪詢）先入帳時，本頁跟著顯示成功
store.on('order-updated', ({ order }) => { if (order && order.id === orderId && order.status === 'paid' && state.kind !== 'ok') { state = { kind: 'ok', data: state.data }; render(); setErr(''); if (poller) poller.stop(); } });
window.__payReturn = { get state() { return state; }, restart: start, lang: () => lang, config: getPayConfig, POLL_MAX };
