// 銷售網頁：訂單查詢（物流追蹤）與 LINE 會員加入（示範）
import { store } from '../state.js';
import { TENANT_ID } from '../tenant.js';
// 非甜點業主：第二步改用通用說法
const PREP = { zh: '備貨製作中', en: 'Preparing', ja: '準備中', vi: 'Đang chuẩn bị', ms: 'Sedang disediakan' };
import { $, $$, el, gsap, esc, money, fmtDT, toast } from '../util.js';

const T = {
  zh: { nav: '訂單查詢', title: '訂單查詢與物流追蹤', ph: '輸入訂單編號，例如 SO-20261005-0001', go: '查詢', mine: '你在本裝置的訂單', none: '找不到這筆訂單，請確認編號。', empty: '你在本裝置還沒有訂單，可直接輸入訂單編號查詢。', steps: ['訂單成立', '甜點製作中', '已交寄', '配送中', '已送達'], pickSteps: ['訂單成立', '甜點製作中', '可取貨', '已取貨', '完成'], eta: '預計送達', note: '示範：狀態依下單時間自動加速推進。', notify: 'AI 會在每個階段用你的語言主動通知你。', memT: '加入 LINE 會員', memS: '首次加入送 50 點（1 點 = 1 元），生日當月 9 折，還能用 LINE 直接查訂單。', memB: '用 LINE 加入會員', memOk: '已加入會員！50 點已入帳', close: '關閉' },
  en: { nav: 'Track order', title: 'Order status & tracking', ph: 'Enter order number, e.g. SO-20261005-0001', go: 'Search', mine: 'Orders on this device', none: 'Order not found. Please check the number.', empty: 'No orders on this device yet. You can search by order number.', steps: ['Order placed', 'Baking', 'Handed to courier', 'Out for delivery', 'Delivered'], pickSteps: ['Order placed', 'Baking', 'Ready for pickup', 'Picked up', 'Done'], eta: 'Estimated delivery', note: 'Demo: status advances quickly based on order time.', notify: 'Our AI messages you in your language at every step.', memT: 'Join as a LINE member', memS: 'Get 50 points on joining (1 point = NT$1), 10% off in your birthday month, and check orders right in LINE.', memB: 'Join with LINE', memOk: 'Welcome! 50 points added', close: 'Close' },
  ja: { nav: '注文照会', title: '注文照会・配送状況', ph: '注文番号を入力（例：SO-20261005-0001）', go: '照会', mine: 'この端末のご注文', none: '注文が見つかりません。番号をご確認ください。', empty: 'この端末でのご注文はまだありません。注文番号で照会できます。', steps: ['ご注文受付', '製造中', '発送済み', '配達中', '配達完了'], pickSteps: ['ご注文受付', '製造中', '受取可能', '受取済み', '完了'], eta: 'お届け予定', note: 'デモ：注文時刻に応じて状態が早送りで進みます。', notify: 'AI が各段階でご希望の言語でお知らせします。', memT: 'LINE 会員になる', memS: '入会で 50 ポイント（1pt＝1元）、誕生月は 10% オフ、LINE で注文照会もできます。', memB: 'LINE で入会', memOk: '入会完了！50 ポイント付与しました', close: '閉じる' },
  vi: { nav: 'Tra đơn', title: 'Tra cứu & theo dõi đơn hàng', ph: 'Nhập mã đơn, ví dụ SO-20261005-0001', go: 'Tra cứu', mine: 'Đơn hàng trên thiết bị này', none: 'Không tìm thấy đơn hàng. Vui lòng kiểm tra mã.', empty: 'Chưa có đơn trên thiết bị này. Bạn có thể tra theo mã đơn.', steps: ['Đã đặt hàng', 'Đang làm bánh', 'Đã giao vận chuyển', 'Đang giao', 'Đã giao'], pickSteps: ['Đã đặt hàng', 'Đang làm bánh', 'Sẵn sàng nhận', 'Đã nhận', 'Hoàn tất'], eta: 'Dự kiến giao', note: 'Demo: trạng thái chạy nhanh theo thời gian đặt hàng.', notify: 'AI sẽ nhắn bạn bằng ngôn ngữ của bạn ở mỗi bước.', memT: 'Trở thành hội viên LINE', memS: 'Tặng 50 điểm khi tham gia (1 điểm = 1 Đài tệ), giảm 10% tháng sinh nhật, tra đơn ngay trên LINE.', memB: 'Tham gia bằng LINE', memOk: 'Chào mừng! Đã cộng 50 điểm', close: 'Đóng' },
  ms: { nav: 'Jejak pesanan', title: 'Status & penjejakan pesanan', ph: 'Masukkan nombor pesanan, cth. SO-20261005-0001', go: 'Cari', mine: 'Pesanan pada peranti ini', none: 'Pesanan tidak dijumpai. Sila semak nombor.', empty: 'Tiada pesanan pada peranti ini. Anda boleh cari dengan nombor pesanan.', steps: ['Pesanan diterima', 'Sedang dibakar', 'Diserahkan kepada kurier', 'Dalam penghantaran', 'Telah dihantar'], pickSteps: ['Pesanan diterima', 'Sedang dibakar', 'Sedia diambil', 'Telah diambil', 'Selesai'], eta: 'Anggaran tiba', note: 'Demo: status bergerak pantas mengikut masa pesanan.', notify: 'AI akan memaklumkan anda dalam bahasa anda pada setiap langkah.', memT: 'Sertai ahli LINE', memS: 'Dapat 50 mata apabila menyertai (1 mata = NT$1), diskaun 10% pada bulan hari jadi, dan semak pesanan terus di LINE.', memB: 'Sertai dengan LINE', memOk: 'Selamat datang! 50 mata telah ditambah', close: 'Tutup' },
};

let shopRef;
const tt = (k) => (T[shopRef.lang] || T.zh)[k];

// 示範：依下單後經過的分鐘數推進狀態（歷史訂單視為已送達）
function stage(o) {
  if (o.source !== 'live') return 4;
  const min = (Date.now() - o.ts) / 6e4;
  return min < 1 ? 0 : min < 3 ? 1 : min < 6 ? 2 : min < 10 ? 3 : 4;
}

function timeline(o) {
  const st = stage(o), steps = (o.pickup ? tt('pickSteps') : tt('steps')).slice();
  if (TENANT_ID !== 'amei') steps[1] = PREP[shopRef.lang] || PREP.en;
  const eta = new Date(o.ts + (o.pickup ? 1 : 2) * 864e5);
  return `<div class="tr-card">
    <div class="tr-h"><b class="mono">${esc(o.id)}</b><span>${fmtDT(o.ts)}</span><b>${money(o.total)}</b></div>
    <ol class="tr-steps">${steps.map((s, i) => `<li class="${i < st ? 'done' : i === st ? 'cur' : ''}"><i></i><span>${s}</span></li>`).join('')}</ol>
    <div class="tr-meta"><span>${tt('eta')}：<b>${eta.getMonth() + 1}/${eta.getDate()}</b></span><span>${esc(o.region || '')}</span></div>
  </div>`;
}

function open(prefill = '') {
  const card = $('#sModalCard');
  card.className = 's-modal-card track';
  const mine = store.live.filter(o => o.channel === 'web').slice(-3).reverse();
  card.innerHTML = `<button class="x-btn m-x">✕</button><h2>${tt('title')}</h2>
    <form class="tr-form" id="trForm"><input id="trQ" placeholder="${esc(tt('ph'))}" value="${esc(prefill)}"><button class="s-btn s-btn-primary">${tt('go')}</button></form>
    <div id="trOut">${mine.length ? `<h4>${tt('mine')}</h4>${mine.map(timeline).join('')}` : `<p class="tr-empty">${tt('empty')}</p>`}</div>
    <p class="tr-note">${tt('notify')}<br><small>${tt('note')}</small></p>
    <div class="mem-card"><div><b>${tt('memT')}</b><small>${tt('memS')}</small></div><button class="mem-btn" id="memBtn">${tt('memB')}</button></div>`;
  const m = $('#sModal'); m.hidden = false;
  gsap.fromTo(m, { opacity: 0 }, { opacity: 1, duration: 0.25 });
  gsap.fromTo(card, { y: 30, scale: 0.97 }, { y: 0, scale: 1, duration: 0.4, ease: 'back.out(1.6)' });
  animateSteps(card);
  $('.m-x', card).addEventListener('click', close);
  $('#trForm', card).addEventListener('submit', (e) => {
    e.preventDefault();
    const q = $('#trQ', card).value.trim().toUpperCase();
    const o = store.orders.find(x => x.id.toUpperCase() === q);
    $('#trOut', card).innerHTML = o ? timeline(o) : `<p class="tr-empty">${tt('none')}</p>`;
    animateSteps(card);
  });
  if (prefill) $('#trForm', card).requestSubmit();
  $('#memBtn', card).addEventListener('click', (e) => {
    const b = e.currentTarget; b.disabled = true; b.textContent = '✓ ' + tt('memOk');
    b.classList.add('ok');
    gsap.fromTo(b, { scale: 0.9 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
    toast(tt('memOk'), 'LINE');
  });
}

function animateSteps(card) {
  gsap.fromTo($$('.tr-steps li', card), { opacity: 0, x: -10 }, { opacity: 1, x: 0, stagger: 0.07, duration: 0.35 });
}
function close() { const m = $('#sModal'); gsap.to(m, { opacity: 0, duration: 0.2, onComplete: () => { m.hidden = true; } }); }

export const trackText = (k) => tt(k);

export function initTrack(shop) {
  shopRef = shop;
  const btn = el(`<button class="track-btn" id="trackBtn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg><span></span></button>`);
  $('#cartBtn').before(btn);
  const label = () => { $('span', btn).textContent = tt('nav'); };
  label(); shop.onLang(label);
  btn.addEventListener('click', () => open());
  return { open };
}
