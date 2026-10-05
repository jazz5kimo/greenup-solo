// 後台 SPA：路由、側邊欄、頂欄、全域事件
import { store } from './state.js';
import { $, $$, el, gsap, toast, fmtTime, money } from './util.js';
import { icon } from './icons.js';
import { resizeAll } from './charts.js';
import dashboard from './views/dashboard.js';
import chat from './views/chat.js';
import phone from './views/phone.js';
import pos from './views/pos.js';
import tax from './views/tax.js';
import books from './views/books.js';
import ask from './views/ask.js';
import meeting from './views/meeting.js';
import deploy from './views/deploy.js';
import brief from './views/brief.js';
import crm from './views/crm.js';
import inventory from './views/inventory.js';
import shipping from './views/shipping.js';
import staff from './views/staff.js';
import bank from './views/bank.js';
import hub from './views/hub.js';
import auto from './views/auto.js';

const VIEWS = [
  { mod: dashboard, id: 'dashboard', group: '首頁', name: '總覽', icon: 'dashboard', sub: '今天的生意，AI 都幫你顧好了' },
  { mod: auto, id: 'auto', group: '首頁', name: '自動化中心', icon: 'wand', sub: '設定一次，AI 自動接單、收款、開發票、記帳、報稅提醒', tag: '自動' },
  { mod: brief, id: 'brief', group: '首頁', name: 'AI 晨報', icon: 'sparkle', sub: '每天早上 AI 告訴你：昨天發生什麼、今天該做什麼', tag: 'AI' },
  { mod: chat, id: 'chat', group: '接客收單', name: 'AI 聊天收單', icon: 'chat', sub: 'LINE、WhatsApp、Zalo、Messenger 多語言自動接單', tag: '多語' },
  { mod: phone, id: 'phone', group: '接客收單', name: 'AI 電話客服', icon: 'phone', sub: '24 小時接聽、複述確認、自動建單' },
  { mod: pos, id: 'pos', group: '接客收單', name: 'POS 收銀台', icon: 'pos', sub: '門市結帳、會員、載具統編、電子發票、交班日結' },
  { mod: crm, id: 'crm', group: '接客收單', name: '會員與行銷', icon: 'heart', sub: '跨通路會員、分眾、AI 多語行銷活動與自動推播' },
  { mod: inventory, id: 'inventory', group: '營運管理', name: '庫存與生產', icon: 'box', sub: '配方 BOM、原料效期、AI 補貨與今日生產排程' },
  { mod: shipping, id: 'shipping', group: '營運管理', name: '出貨物流', icon: 'truck', sub: '揀貨、託運單、冷鏈、超商取貨、跨境寄送' },
  { mod: staff, id: 'staff', group: '營運管理', name: '排班打卡', icon: 'clock', sub: 'AI 排班、打卡、請假、工時自動算薪與勞基法檢核' },
  { mod: books, id: 'books', group: '財務會計', name: '會計帳務', icon: 'book', sub: '產銷人發財・收入費用・損益表・資產負債表，AI 自動記帳結帳' },
  { mod: tax, id: 'tax', group: '財務會計', name: '自動化報稅', icon: 'tax', sub: '營業稅、營所稅、扣繳與二代健保，自動試算（示範）' },
  { mod: bank, id: 'bank', group: '財務會計', name: '金流對帳', icon: 'bank', sub: '銀行與金流自動對帳、應收催款、現金流預測' },
  { mod: ask, id: 'ask', group: 'AI 助理', name: '用問的', icon: 'ask', sub: '用一句話問出經營圖表', tag: 'AI' },
  { mod: meeting, id: 'meeting', group: 'AI 助理', name: '會議機器人', icon: 'meeting', sub: '逐字稿 → 摘要、決議、待辦、報價單' },
  { mod: hub, id: 'hub', group: '系統', name: '整合與協作', icon: 'link', sub: '通路與金流串接、會計師協作、多國稅制設定' },
  { mod: deploy, id: 'deploy', group: '系統', name: '部署模式', icon: 'deploy', sub: '雲端訂閱／企業地端／雲地混合' },
];
const DEPLOY_NAME = { cloud: '雲端訂閱', onprem: '企業地端', hybrid: '雲地混合' };

const nav = $('#nav');
const viewsHost = $('#views');
const mounted = new Map();
let current = null;

// 簡單模式：一人公司只看核心頁面（接單、收款、帳務報稅、用問的、自動化），其餘收進「全部功能」
const SIMPLE = new Set(['dashboard', 'auto', 'brief', 'chat', 'phone', 'pos', 'bank', 'books', 'tax', 'ask']);
const LS_NAV = 'greenup-solo:nav';
let simpleNav = true;
try { simpleNav = localStorage.getItem(LS_NAV) !== 'all'; } catch { /* ignore */ }

let lastGroup = '';
VIEWS.forEach((v, i) => {
  if (v.group !== lastGroup) { nav.appendChild(el(`<div class="nav-group" data-g="${v.group}">${v.group}</div>`)); lastGroup = v.group; }
  const a = el(`<a class="nav-item ${SIMPLE.has(v.id) ? '' : 'adv'}" data-g="${v.group}" href="#${v.id}" data-id="${v.id}">${icon(v.icon, 20)}<span>${v.name}</span>${v.tag ? `<em>${v.tag}</em>` : ''}<i class="nav-badge" hidden></i></a>`);
  nav.appendChild(a);
});

const modeBtn = el(`<button class="nav-mode" id="navMode"></button>`);
$('.side-foot').prepend(modeBtn);
function applyNavMode() {
  document.body.classList.toggle('nav-simple', simpleNav);
  $$('.nav-group', nav).forEach(g => {
    const items = $$(`.nav-item[data-g="${g.dataset.g}"]`, nav);
    g.hidden = simpleNav && !items.some(a => !a.classList.contains('adv') || a.classList.contains('active'));
  });
  modeBtn.innerHTML = simpleNav
    ? `${icon('plus', 14)}<span>顯示全部功能（${VIEWS.length}）</span>`
    : `${icon('minus', 14)}<span>簡單模式（只看核心 ${SIMPLE.size} 項）</span>`;
}
modeBtn.addEventListener('click', () => {
  simpleNav = !simpleNav;
  try { localStorage.setItem(LS_NAV, simpleNav ? 'simple' : 'all'); } catch { /* ignore */ }
  applyNavMode();
  gsap.fromTo($$('.nav-item:not(.adv)', nav).concat(simpleNav ? [] : $$('.nav-item.adv', nav)), { opacity: 0, x: -8 }, { opacity: 1, x: 0, stagger: 0.02, duration: 0.3 });
});

function ensureMounted(v) {
  if (mounted.has(v.id)) return mounted.get(v.id);
  const section = el(`<section class="view view-${v.id}" id="view-${v.id}" hidden></section>`);
  viewsHost.appendChild(section);
  v.mod.mount(section, { go });
  mounted.set(v.id, section);
  return section;
}

function go(id) {
  const v = VIEWS.find(x => x.id === id) || VIEWS[0];
  if (location.hash.slice(1) !== v.id) history.replaceState(null, '', '#' + v.id);
  show(v);
}

function show(v) {
  if (current === v) return;
  const prev = current; current = v;
  const section = ensureMounted(v);
  $$('.nav-item').forEach(a => a.classList.toggle('active', a.dataset.id === v.id));
  applyNavMode();
  const badge = $(`.nav-item[data-id="${v.id}"] .nav-badge`); if (badge) badge.hidden = true;
  $('#viewTitle').textContent = v.name;
  $('#viewSub').textContent = v.sub;
  if (prev) { const ps = mounted.get(prev.id); ps.hidden = true; prev.mod.hide && prev.mod.hide(); }
  section.hidden = false;
  viewsHost.scrollTop = 0;
  gsap.fromTo(section, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out', clearProps: 'transform' });
  gsap.fromTo($$('.anim-in', section), { opacity: 0, y: 26, scale: 0.98 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.05, ease: 'power3.out', delay: 0.05, clearProps: 'transform' });
  gsap.fromTo(['#viewTitle', '#viewSub'], { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.4, stagger: 0.06 });
  v.mod.show && v.mod.show();
  requestAnimationFrame(() => resizeAll());
  setTimeout(resizeAll, 350);
}

window.addEventListener('hashchange', () => go(location.hash.slice(1)));

// 頂欄
function tick() { $('#clock').textContent = fmtTime(new Date()); }
tick(); setInterval(tick, 10000);
function setDeployBadge(m) { const b = $('#deployBadge'); b.textContent = DEPLOY_NAME[m] || '雲端訂閱'; b.dataset.mode = m; gsap.fromTo(b, { scale: 1.25 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' }); }
setDeployBadge(store.settings.deploy);
store.on('deploy', setDeployBadge);

// 全域：新訂單 toast + 側欄徽章
const CH_LABEL = { line: 'LINE', web: '官網 AI 導購', pos: '現場 POS', phone: 'AI 電話客服', whatsapp: 'WhatsApp', zalo: 'Zalo', messenger: 'Messenger' };
store.on('order', ({ order, remote }) => {
  toast(remote ? `銷售網頁新訂單｜${order.customer}` : `新訂單已建立｜${CH_LABEL[order.channel] || ''}`,
    `${order.id}・${money(order.total)}・發票 ${order.invoice}${order.status === 'pending' ? '・待付款' : ''}`, { icon: icon(remote ? 'store' : 'check', 18) });
  for (const id of ['dashboard', 'pos']) {
    if (current && current.id === id) continue;
    const b = $(`.nav-item[data-id="${id}"] .nav-badge`); if (b) { b.hidden = false; b.textContent = (+b.textContent || 0) + 1; }
  }
  const low = store.inventory().filter(p => p.low && order.items.some(it => it.pid === p.id));
  low.forEach((p, i) => setTimeout(() => toast(`庫存警示｜${p.name}`, `剩 ${p.current} 件，低於安全庫存 ${p.safety}，AI 已建議補貨`, { kind: 'warn', icon: icon('alert', 18) }), 900 + i * 400));
});
store.on('order-updated', ({ order }) => {
  if (order.status === 'paid') toast(`收款完成｜${order.customer}`, `${money(order.total)} 已入帳，應收帳款自動沖銷`, { kind: 'info', icon: icon('coins', 18) });
});
store.on('reset', () => toast('示範資料已重置', '已清除示範中新增的訂單', { kind: 'info', icon: icon('refresh', 18) }));

$('#resetBtn').addEventListener('click', () => { store.reset(); });

// 啟動頁（Launcher）
const launcher = $('#launcher');
function hideLauncher() {
  gsap.to(launcher, { opacity: 0, duration: 0.45, onComplete: () => { launcher.hidden = true; } });
  try { sessionStorage.setItem('gu-launched', '1'); } catch { /* ignore */ }
}
let launched = false; try { launched = sessionStorage.getItem('gu-launched') === '1'; } catch { /* ignore */ }
const params = new URLSearchParams(location.search);
if (!launched && !location.hash && !params.has('nolaunch')) {
  launcher.hidden = false;
  gsap.from('.launch-inner > *', { opacity: 0, y: 30, duration: 0.8, stagger: 0.09, ease: 'power3.out' });
  gsap.from('.launch-card', { opacity: 0, y: 40, rotateX: 18, duration: 0.9, stagger: 0.12, delay: 0.3, ease: 'power3.out' });
}
$('#launchAdmin').addEventListener('click', hideLauncher);
$('#launchShop').addEventListener('click', () => setTimeout(hideLauncher, 300));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !launcher.hidden) hideLauncher(); });

go(location.hash.slice(1) || 'dashboard');
// 自動化中心在背景預先載入，讓開啟前進來的訂單也會記錄在即時執行流水
setTimeout(() => ensureMounted(VIEWS.find(v => v.id === 'auto')), 1200);
