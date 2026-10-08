// 後台 SPA：路由、側邊欄、頂欄、全域事件
import { TENANT, TENANTS, TENANT_ID, CATS, setTenant, tenantInfra } from './tenant.js'; // 必須最先載入：資料隔離層
import { store } from './state.js';
import { $, $$, el, gsap, toast, fmtTime, money } from './util.js';
import { icon } from './icons.js';
import { resizeAll } from './charts.js';
import * as auth from './auth.js';
import { initPalette, pushRecent } from './palette.js'; // 分權示範：角色、矩陣、唯讀鎖定、需核准、稽核（前端體驗，非安全邊界）
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
import market from './views/market.js';
import studio from './views/studio.js';
import auctionView from './views/auction.js';
import promoView from './views/promo.js';
import timeView from './views/time.js';
import importView from './views/import.js';
import comply from './views/comply.js';
import advisor from './views/advisor.js';
import receipts from './views/receipts.js';
import listing from './views/listing.js';
import booking from './views/booking.js';
import quotes from './views/quotes.js';
import agent from './views/agent.js';
import owner from './views/owner.js';

const VIEWS = [
  { mod: dashboard, id: 'dashboard', group: '今天', name: '總覽', icon: 'dashboard', sub: '今天的生意，AI 都幫你顧好了' },
  { mod: brief, id: 'brief', group: '今天', name: 'AI 晨報', icon: 'sparkle', sub: '每天早上 AI 告訴你：昨天發生什麼、今天該做什麼', tag: 'AI' },
  { mod: auto, id: 'auto', group: '今天', name: '自動化中心', icon: 'wand', sub: '設定一次，AI 自動接單、收款、開發票、記帳、報稅提醒', tag: '自動' },
  { mod: pos, id: 'pos', group: '接單收款', name: 'POS 收銀台', icon: 'pos', sub: '門市結帳、會員、載具統編、電子發票、交班日結' },
  { mod: chat, id: 'chat', group: '接單收款', name: 'AI 聊天收單', icon: 'chat', sub: 'LINE、WhatsApp、Zalo、Messenger 多語言自動接單', tag: '多語' },
  { mod: phone, id: 'phone', group: '接單收款', name: 'AI 電話客服', icon: 'phone', sub: '24 小時接聽、複述確認、自動建單' },
  { mod: booking, id: 'booking', group: '接單收款', name: '預約與訂金', icon: 'calendar', sub: '客製蛋糕、取貨時段、課程預約，LINE 收訂金與提醒' },
  { mod: quotes, id: 'quotes', group: '接單收款', name: '報價與請款', icon: 'file', sub: '企業客戶報價、電子簽回、月結請款、定期扣款' },
  { mod: listing, id: 'listing', group: '商品上架', name: 'AI 商品上架', icon: 'sparkle', sub: '拍一張照，AI 寫五語介紹、建議定價、一鍵上架各通路' },
  { mod: market, id: 'market', group: '商品上架', name: '多平台上架', icon: 'store', sub: '一次上架蝦皮、momo、PChome、Yahoo、露天、Pinkoi…；不能串接的自動打包上傳檔', tag: '新' },
  { mod: studio, id: 'studio', group: '商品上架', name: '網站設計工作室', icon: 'wand', sub: '銷售網頁的商家、風格、產品自由切換，即時預覽' },
  { mod: promoView, id: 'promo', group: '行銷促銷', name: '節日特價', icon: 'percent', sub: '先排好中秋、雙 11、聖誕、春節的特價，時間到自動變價、結束自動恢復原價', tag: '新' },
  { mod: auctionView, id: 'auction', group: '行銷促銷', name: '競標管理', icon: 'trend', sub: '1 元起標集客、即時出價、得標自動成立訂單、非得標者送優惠券', tag: '新' },
  { mod: crm, id: 'crm', group: '行銷促銷', name: '會員與行銷', icon: 'heart', sub: '跨通路會員、分眾、AI 多語行銷活動與自動推播' },
  { mod: inventory, id: 'inventory', group: '店務管理', name: '庫存與生產', icon: 'box', sub: '配方 BOM、原料效期、AI 補貨與今日生產排程' },
  { mod: shipping, id: 'shipping', group: '店務管理', name: '出貨物流', icon: 'truck', sub: '揀貨、託運單、冷鏈、超商取貨、跨境寄送' },
  { mod: staff, id: 'staff', group: '店務管理', name: '排班打卡', icon: 'clock', sub: 'AI 排班、打卡、請假、工時自動算薪與勞基法檢核' },
  { mod: receipts, id: 'receipts', group: '帳務報稅', name: '拍照記帳', icon: 'receipt', sub: '收據發票拍照，AI 辨識金額統編，自動入帳與進項扣抵', tag: 'AI' },
  { mod: books, id: 'books', group: '帳務報稅', name: '會計帳務', icon: 'book', sub: '產銷人發財・收入費用・損益表・資產負債表，AI 自動記帳結帳' },
  { mod: tax, id: 'tax', group: '帳務報稅', name: '自動化報稅', icon: 'tax', sub: '營業稅、營所稅、扣繳與二代健保，自動試算（示範）' },
  { mod: bank, id: 'bank', group: '帳務報稅', name: '金流對帳', icon: 'bank', sub: '銀行與金流自動對帳、應收催款、現金流預測' },
  { mod: owner, id: 'owner', group: '老闆專區', name: '老闆的錢', icon: 'coins', sub: '這個月可以安心領多少、稅金預留、現金還能撐幾個月' },
  { mod: timeView, id: 'time', group: '老闆專區', name: '老闆的時間', icon: 'clock', sub: '休假模式、勿擾時段、工時健康：你休息，AI 顧店' },
  { mod: advisor, id: 'advisor', group: '老闆專區', name: 'AI 經營顧問', icon: 'trend', sub: '每週經營檢討、決策模擬器、補助與貸款媒合', tag: 'AI' },
  { mod: ask, id: 'ask', group: 'AI 助理', name: '用問的', icon: 'ask', sub: '用一句話問出經營圖表', tag: 'AI' },
  { mod: meeting, id: 'meeting', group: 'AI 助理', name: '會議機器人', icon: 'meeting', sub: '逐字稿 → 摘要、決議、待辦、報價單' },
  { mod: agent, id: 'agent', group: 'AI 助理', name: 'AI 店員設定', icon: 'bot', sub: '教 AI 店規：退換貨、運費、過敏原、何時轉給你' },
  { mod: hub, id: 'hub', group: '設定', name: '串接與權限', icon: 'link', sub: '通路與金流串接、成員與權限、稽核日誌、會計師協作、多國稅制' },
  { mod: comply, id: 'comply', group: '設定', name: '合規與文件', icon: 'shield', sub: '法規健檢、合約證照到期提醒、AI 讀合約' },
  { mod: importView, id: 'import', group: '設定', name: '資料搬家', icon: 'db', sub: 'Excel、蝦皮、LINE 記事本、紙本，一鍵搬進 GreenUP' },
  { mod: deploy, id: 'deploy', group: '設定', name: '部署與升級', icon: 'deploy', sub: '雲端訂閱／企業地端／雲地混合、多業主資料隔離、OTA 一鍵升級' },
];
// 側欄分類：依「老闆要做的事」分 9 組，每組一個顏色，標題可收合
const GROUPS = {
  '今天': { color: '#2DB674', hint: '今天的生意、AI 晨報與自動化' },
  '接單收款': { color: '#F0A531', hint: '門市結帳、線上接單、預約、報價請款' },
  '商品上架': { color: '#2E97D4', hint: '商品文案、多平台上架、銷售網頁' },
  '行銷促銷': { color: '#DD5597', hint: '節日特價、競標集客、會員行銷' },
  '店務管理': { color: '#7C62E6', hint: '庫存生產、出貨物流、排班打卡' },
  '帳務報稅': { color: '#5EE0C4', hint: '拍照記帳、帳務、報稅、對帳' },
  '老闆專區': { color: '#EC6A55', hint: '可以領多少錢、休假、經營建議' },
  'AI 助理': { color: '#a78bfa', hint: '用問的、會議記錄、AI 店員設定' },
  '設定': { color: '#9aa7a0', hint: '串接與權限、合規、資料匯入、部署升級' },
};
const gColor = (g) => (GROUPS[g] || {}).color || '#9aa7a0';
const DEPLOY_NAME = { cloud: '雲端訂閱', onprem: '企業地端', hybrid: '雲地混合' };

const nav = $('#nav');
const viewsHost = $('#views');
const mounted = new Map();
let current = null;
auth.registerModules(VIEWS);
auth.init(); // ?role= 直接以該角色進入；?nolaunch 無 role → 負責人；否則沿用上次登入或顯示登入畫面

// 簡單模式：一人公司只看核心頁面（接單、收款、帳務報稅、用問的、自動化），其餘收進「全部功能」
const SIMPLE = new Set(['dashboard', 'auto', 'brief', 'chat', 'phone', 'pos', 'promo', 'receipts', 'bank', 'books', 'tax', 'ask']);
// 依角色決定「核心」：員工的核心是收銀出貨打卡，記帳士的核心是帳務報稅（自訂角色沿用負責人的，太少就全部顯示）
const CORE_BY_ROLE = {
  manager: new Set(['dashboard', 'brief', 'pos', 'chat', 'phone', 'booking', 'promo', 'crm', 'inventory', 'shipping', 'staff', 'ask']),
  staff: new Set(['pos', 'chat', 'phone', 'booking', 'inventory', 'shipping', 'staff']),
  accountant: new Set(['dashboard', 'receipts', 'books', 'tax', 'bank', 'owner', 'ask']),
};
const LS_NAV = 'greenup-solo:nav';
let simpleNav = true;
try { simpleNav = localStorage.getItem(LS_NAV) !== 'all'; } catch { /* ignore */ }

const LS_COLL = 'greenup-solo:nav-collapsed';
let collapsed = new Set();
try { collapsed = new Set(JSON.parse(localStorage.getItem(LS_COLL) || '[]')); } catch { /* ignore */ }
const MOD_KEY = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? '⌘' : 'Ctrl';
const navSearch = el(`<button class="nav-search" id="navSearch" title="搜尋功能或動作（${MOD_KEY} K 或 /）">${icon('search', 16)}<span>搜尋功能或動作…</span><kbd>${MOD_KEY} K</kbd></button>`);
nav.before(navSearch);

let lastGroup = '';
VIEWS.forEach((v, i) => {
  if (v.group !== lastGroup) {
    const g = GROUPS[v.group] || {};
    nav.appendChild(el(`<button class="nav-group" data-g="${v.group}" style="--gc:${gColor(v.group)}" title="${g.hint || ''}（點一下收合／展開）" aria-expanded="true"><i class="ng-dot"></i><span class="ng-name">${v.group}</span><small class="ng-n"></small>${icon('chev', 14, 'ng-caret')}</button>`));
    lastGroup = v.group;
  }
  const a = el(`<a class="nav-item ${SIMPLE.has(v.id) ? '' : 'adv'}" data-g="${v.group}" style="--gc:${gColor(v.group)}" href="#${v.id}" data-id="${v.id}" title="${v.name}：${v.sub}">${icon(v.icon, 20)}<span>${v.name}</span>${v.tag ? `<em>${v.tag}</em>` : ''}<i class="nav-ro" title="唯讀" hidden>${icon('lock', 11)}唯讀</i><i class="nav-badge" hidden></i></a>`);
  nav.appendChild(a);
});

const modeBtn = el(`<button class="nav-mode" id="navMode"></button>`);
$('.side-foot').prepend(modeBtn);
function applyNavMode() {
  document.body.classList.toggle('nav-simple', simpleNav);
  const u = auth.currentUser(), items = $$('.nav-item[data-id]', nav);
  let core = (u && CORE_BY_ROLE[u.role]) || SIMPLE;
  if (items.filter(a => !a.hidden && core.has(a.dataset.id)).length < 4) core = new Set(items.map(a => a.dataset.id));
  items.forEach(a => a.classList.toggle('adv', !core.has(a.dataset.id)));
  $$('.nav-group', nav).forEach(g => {
    const all = $$(`.nav-item[data-g="${g.dataset.g}"]`, nav), items = all.filter(a => !a.hidden);
    const shown = simpleNav ? items.filter(a => !a.classList.contains('adv') || a.classList.contains('active')) : items;
    g.hidden = !shown.length;
    const coll = collapsed.has(g.dataset.g);
    g.classList.toggle('coll', coll); g.setAttribute('aria-expanded', String(!coll));
    $('.ng-n', g).textContent = coll ? shown.length : '';
    all.forEach(a => a.classList.toggle('g-collapsed', coll)); // 收合時仍顯示目前所在頁（CSS 以 :not(.active) 處理）
  });
  const visible = $$('.nav-item[data-id]', nav).filter(a => !a.hidden), coreN = visible.filter(a => !a.classList.contains('adv')).length; // 分權：只數這個角色看得到的
  modeBtn.innerHTML = simpleNav
    ? `${icon('plus', 14)}<span>顯示全部功能（${visible.length}）</span>`
    : `${icon('minus', 14)}<span>簡單模式（只看核心 ${coreN} 項）</span>`;
  modeBtn.title = simpleNav ? `顯示全部功能（${visible.length}）` : `簡單模式（只看核心 ${coreN} 項）`;
  modeBtn.hidden = coreN >= visible.length; // 這個角色本來就只有核心功能，不需要切換
}
nav.addEventListener('click', (e) => {
  const g = e.target.closest('.nav-group'); if (!g) return;
  const name = g.dataset.g;
  collapsed.has(name) ? collapsed.delete(name) : collapsed.add(name);
  try { localStorage.setItem(LS_COLL, JSON.stringify([...collapsed])); } catch { /* ignore */ }
  applyNavMode();
  if (!collapsed.has(name)) gsap.fromTo($$(`.nav-item[data-g="${name}"]`, nav).filter(a => a.offsetParent), { opacity: 0, x: -8 }, { opacity: 1, x: 0, stagger: 0.03, duration: 0.25 });
});
modeBtn.addEventListener('click', () => {
  simpleNav = !simpleNav;
  try { localStorage.setItem(LS_NAV, simpleNav ? 'simple' : 'all'); } catch { /* ignore */ }
  applyNavMode();
  gsap.fromTo($$('.nav-item:not(.adv)', nav).concat(simpleNav ? [] : $$('.nav-item.adv', nav)), { opacity: 0, x: -8 }, { opacity: 1, x: 0, stagger: 0.02, duration: 0.3 });
});

// 手機底部分頁列：老闆最常用的 4 個功能＋「更多」
const TABS = [['dashboard', '總覽'], ['pos', '收銀'], ['receipts', '拍照記帳'], ['tax', '報稅']];
const tabbar = el(`<nav class="tabbar" id="tabbar">${TABS.map(([id, n]) => { const v = VIEWS.find(x => x.id === id); return `<a href="#${id}" data-tab="${id}">${icon(v.icon, 22)}<span>${n}</span></a>`; }).join('')}<button data-tab="more">${icon('plus', 22)}<span>更多</span></button></nav>`);
document.body.appendChild(tabbar);
const sheet = el(`<div class="more-sheet" hidden><div class="ms-bg"></div><div class="ms-panel"><div class="ms-h"><b>全部功能</b><button class="ms-x">${icon('x', 18)}</button></div><button class="ms-search" id="msSearch">${icon('search', 16)}<span>想做什麼？打字找功能…</span></button>${[...new Set(VIEWS.map(v => v.group))].map(g => `<h4 style="--gc:${gColor(g)}"><i></i>${g}<small>${(GROUPS[g] || {}).hint || ''}</small></h4><div class="ms-grid">${VIEWS.filter(v => v.group === g).map(v => `<a href="#${v.id}" data-id="${v.id}">${icon(v.icon, 22)}<span>${v.name}</span></a>`).join('')}</div>`).join('')}</div></div>`);
document.body.appendChild(sheet);
function closeSheet() { gsap.to($('.ms-panel', sheet), { y: '100%', duration: 0.25, onComplete: () => { sheet.hidden = true; } }); }
$('[data-tab="more"]', tabbar).addEventListener('click', () => { sheet.hidden = false; gsap.fromTo($('.ms-panel', sheet), { y: '100%' }, { y: '0%', duration: 0.35, ease: 'power3.out' }); });
$('.ms-bg', sheet).addEventListener('click', closeSheet); $('.ms-x', sheet).addEventListener('click', closeSheet);
$$('.ms-grid a', sheet).forEach(a => a.addEventListener('click', closeSheet));

function ensureMounted(v) {
  if (mounted.has(v.id)) return mounted.get(v.id);
  const section = el(`<section class="view view-${v.id}" id="view-${v.id}" hidden></section>`);
  viewsHost.appendChild(section);
  mounted.set(v.id, section);
  try { v.mod.mount(section, { go }); } catch (e) {
    // 單一頁面載入失敗時顯示提示，不讓整個後台卡住；錯誤仍拋出供除錯與測試捕捉
    section.innerHTML = `<div class="glass card" style="padding:28px"><h3>${icon('alert', 18)} 「${v.name}」暫時無法顯示</h3><p style="color:var(--txt2)">請重新整理頁面；若持續發生，請聯絡 GreenUP 支援。</p></div>`;
    setTimeout(() => { throw e; });
  }
  return section;
}

function go(id) {
  let v = VIEWS.find(x => x.id === id) || VIEWS[0];
  // 分權：直接改網址到看不到的模組 → 導回第一個看得到的模組（未登入時由登入畫面擋住，不在此處理）
  if (auth.currentUser() && !auth.can(v.id, 'view')) {
    const first = auth.firstVisible(VIEWS.map(x => x.id));
    auth.deny(`「${v.name}」對 ${auth.roleName()} 不開放`, first ? `已回到「${VIEWS.find(x => x.id === first).name}」` : '此角色沒有任何可見模組', { key: 'nav:' + v.id });
    if (!first) return;
    v = VIEWS.find(x => x.id === first);
  }
  if (location.hash.slice(1) !== v.id) history.replaceState(null, '', '#' + v.id);
  show(v);
}

// 分權：套用側欄／手機分頁列可見性、唯讀標記、目前 section 的 ro、頂欄、待核准徽章
function applyAuth() {
  const u = auth.currentUser();
  for (const v of VIEWS) {
    const lv = u ? auth.level(v.id) : 'edit';
    const a = $(`.nav-item[data-id="${v.id}"]`, nav);
    if (a) { a.hidden = lv === 'none'; a.classList.toggle('ro', lv === 'view'); const ro = $('.nav-ro', a); if (ro) ro.hidden = lv !== 'view'; }
    const t = $(`#tabbar [data-tab="${v.id}"]`); if (t) t.hidden = lv === 'none';
    const m = $(`.more-sheet .ms-grid a[data-id="${v.id}"]`); if (m) { m.hidden = lv === 'none'; m.classList.toggle('ro', lv === 'view'); }
    const sec = mounted.get(v.id); if (sec) sec.classList.toggle('ro', lv === 'view');
  }
  $$('.more-sheet h4').forEach(h => { let n = h.nextElementSibling; h.hidden = !(n && $$('a', n).some(a => !a.hidden)); });
  const rb = $('#resetBtn'); if (rb) rb.hidden = !!u && !auth.can('reset', 'edit');
  const hb = $('.nav-item[data-id="hub"] .nav-badge');
  if (hb && u) { const n = auth.pendingApprovals().length; if (auth.can('hub', 'edit') && n && !(current && current.id === 'hub')) { hb.hidden = false; hb.textContent = n; } else if (!n) hb.hidden = true; }
  applyNavMode();
  if (u && current && !auth.can(current.id, 'view')) go(current.id);
}

function show(v) {
  if (current === v) return;
  const prev = current; current = v;
  const section = ensureMounted(v);
  $$('.nav-item').forEach(a => a.classList.toggle('active', a.dataset.id === v.id));
  const navA = $(`.nav-item[data-id="${v.id}"]`, nav); if (navA && navA.offsetParent) navA.scrollIntoView({ block: 'nearest' });
  section.classList.toggle('ro', !!auth.currentUser() && auth.level(v.id) === 'view');
  $$('#tabbar [data-tab]').forEach(a => a.classList.toggle('on', a.dataset.tab === v.id || (a.dataset.tab === 'more' && !TABS.some(t => t[0] === v.id))));
  applyNavMode();
  const badge = $(`.nav-item[data-id="${v.id}"] .nav-badge`); if (badge) badge.hidden = true;
  const crumb = $('#viewCrumb'); if (crumb) { crumb.style.setProperty('--gc', gColor(v.group)); crumb.innerHTML = `<i></i>${v.group}`; }
  pushRecent(v.id);
  $('#viewTitle').textContent = v.name;
  $('#viewSub').textContent = v.sub;
  if (prev) { const ps = mounted.get(prev.id); if (ps) ps.hidden = true; prev.mod.hide && prev.mod.hide(); }
  section.hidden = false;
  viewsHost.scrollTop = 0;
  gsap.fromTo(section, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out', clearProps: 'transform' });
  gsap.fromTo($$('.anim-in', section), { opacity: 0, y: 26, scale: 0.98 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.05, ease: 'power3.out', delay: 0.05, clearProps: 'transform' });
  gsap.fromTo(['#viewCrumb', '#viewTitle', '#viewSub'], { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.4, stagger: 0.06 });
  v.mod.show && v.mod.show();
  requestAnimationFrame(() => resizeAll());
  setTimeout(resizeAll, 350);
}

window.addEventListener('hashchange', () => go(location.hash.slice(1)));

// 指令面板（⌘K）：打字找功能或直接做事；只列出目前角色看得到／可操作的項目
const canDo = (id, act = 'view') => !auth.currentUser() || auth.can(id, act);
const after = (fn) => setTimeout(fn, 150);
const palette = initPalette({
  views: VIEWS, groups: GROUPS, go, can: canDo,
  actions: [
    { id: 'shop', name: '開啟銷售網頁（客人端）', icon: 'external', hint: '用客人的角度看你的店', syn: '網站 商店 前台 客人', run: () => window.open(`shop.html?tenant=${TENANT_ID}`, 'greenup-shop') },
    { id: 'promo-new', name: '新增節日特價檔期', icon: 'percent', view: 'promo', need: 'edit', hint: '排好時間，到期自動變價、結束自動恢復', syn: '特價 中秋 雙11 聖誕 春節 折扣 打折', run: () => { go('promo'); after(() => { const b = $('#view-promo [data-new]'); if (b) b.click(); }); } },
    { id: 'designer', name: '用 AI 設計銷售網頁', icon: 'wand', view: 'studio', need: 'edit', hint: '用一句話描述想要的風格', syn: 'AI 設計師 prompt 風格 網站 版型', run: () => { go('studio'); after(() => { const b = $('#view-studio [data-tab="designer"]'); if (b) b.click(); }); } },
    { id: 'scan', name: '拍收據記帳', icon: 'receipt', view: 'receipts', need: 'edit', hint: '拍一張，AI 辨識金額與統編', syn: '收據 發票 拍照 費用 房租', run: () => { go('receipts'); after(() => { const b = $('#rcScan'); if (b) b.scrollIntoView({ block: 'start', behavior: 'smooth' }); }); } },
    { id: 'checkout', name: '開始收銀結帳', icon: 'pos', view: 'pos', need: 'edit', hint: '門市結帳、開電子發票', syn: '收銀 結帳 發票 POS', run: () => go('pos') },
    { id: 'quote', name: 'AI 一句話報價', icon: 'file', view: 'quotes', need: 'edit', hint: '企業客戶報價單，一句話產生', syn: '報價 估價 請款', run: () => { go('quotes'); after(() => { const b = $('#qtNew'); if (b) b.click(); }); } },
    { id: 'askai', name: '問 AI 一個經營問題', icon: 'ask', view: 'ask', hint: '例如：上個月哪個商品賣最好？', syn: '問 圖表 報表 分析', run: () => { go('ask'); after(() => { const i = $('#askInput'); if (i) i.focus(); }); } },
    { id: 'approvals', name: '查看待核准申請', icon: 'shield', view: 'hub', need: 'edit', hint: '員工送出的作廢、退款、折讓', syn: '核准 審核 申請 作廢 退款', run: () => { go('hub'); after(() => { const h = $('#hubApprN'); if (h) h.closest('.card')?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }); } },
    { id: 'tenant', name: '切換業主（示範）', icon: 'users', hint: '50 種業態的示範店家', syn: '業主 店家 切換 業態', run: () => { const b = $('#tenantBtn'); if (b) b.click(); } },
    { id: 'role', name: '切換角色／登出', icon: 'user', hint: '負責人、店長、員工、記帳士、支援', syn: '角色 登出 登入 使用者 權限', run: () => { const b = $('#authBtn'); if (b) b.click(); } },
    { id: 'navmode', name: '切換側欄：簡單模式／全部功能', icon: 'dashboard', hint: '簡單模式只顯示核心功能', syn: '簡單 全部 側欄 選單', run: () => modeBtn.click() },
  ],
});
navSearch.addEventListener('click', () => palette.open());
const tbSearch = $('#tbSearch'); if (tbSearch) { tbSearch.innerHTML = icon('search', 18); tbSearch.addEventListener('click', () => palette.open()); }
const msSearch = $('#msSearch'); if (msSearch) msSearch.addEventListener('click', () => { closeSheet(); setTimeout(() => palette.open(), 260); });

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

// 分權：登入畫面（覆蓋在內容上）＋角色變更即時套用（本分頁與跨分頁）
auth.showGate(!auth.currentUser());
auth.onAuth((type) => {
  if (type === 'user') { auth.showGate(!auth.currentUser()); applyAuth(); }
  else if (type === 'matrix' || type === 'approvals') applyAuth();
});

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
applyAuth();
// 可安裝成手機 App（PWA）＋離線快取
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => { /* ignore */ });
let installEvt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; $('#installBtn').hidden = false; });
$('#installBtn').addEventListener('click', async () => { if (!installEvt) return; installEvt.prompt(); try { await installEvt.userChoice; } catch { /* ignore */ } installEvt = null; $('#installBtn').hidden = true; });
window.addEventListener('appinstalled', () => toast('已安裝 GreenUP', '之後可從手機主畫面直接開啟', { icon: icon('check', 18) }));

// 自動化中心在背景預先載入，讓開啟前進來的訂單也會記錄在即時執行流水
setTimeout(() => ensureMounted(VIEWS.find(v => v.id === 'auto')), 1200);

// ── 業主切換：同一套後台介面，每個業主各自獨立的資料（正式版：各自的資料庫與 n8n）──
(function tenantSwitcher() {
  const box = $('.topbar .company');
  if (!box) return;
  const inf = tenantInfra();
  box.innerHTML = `<button class="tenant-btn" id="tenantBtn" aria-haspopup="true" aria-expanded="false" title="切換業主（示範）">
      <span class="avatar">${TENANT.avatar}</span><span class="tn-txt"><b>${TENANT.name}</b><small>負責人：${TENANT.owner}・${TENANT.typeName}</small></span><span class="tn-caret">▾</span></button>
    <div class="tenant-menu" id="tenantMenu" hidden role="menu">
      <div class="tm-head">切換業主 <em>示範</em><small>同一套後台，${TENANTS.length} 個業主的資料完全分開</small></div>
      <input class="tm-search" id="tmSearch" type="search" placeholder="搜尋店名、業態、負責人…" aria-label="搜尋業主">
      <div class="tm-list" id="tmList"></div>
      <div class="tm-foot">目前資料庫 <code>${inf.db}</code>・自動化 <code>${inf.n8n}</code>・流程版本 ${inf.workflows}</div>
    </div>`;
  const item = (x) => `<button class="tm-item${x.id === TENANT_ID ? ' on' : ''}" role="menuitem" data-tenant="${x.id}"><span class="avatar">${x.avatar || x.name[0]}</span><span><b>${x.name}</b><small>${x.typeName}・${x.region || ''}</small></span>${x.id === TENANT_ID ? '<i>目前</i>' : ''}</button>`;
  const renderList = (q = '') => {
    const k = q.trim().toLowerCase();
    const hit = TENANTS.filter(x => !k || [x.name, x.en, x.typeName, x.owner, x.region, CATS[x.cat]].some(f => f && String(f).toLowerCase().includes(k)));
    const groups = Object.keys(CATS).map(c => [c, hit.filter(x => x.cat === c)]).filter(([, l]) => l.length);
    $('#tmList').innerHTML = groups.length ? groups.map(([c, l]) => `<div class="tm-cat">${CATS[c]}<span>${l.length}</span></div>${l.map(item).join('')}`).join('') : '<div class="tm-empty">找不到符合的業主</div>';
  };
  renderList();
  $('#tmSearch').addEventListener('input', (e) => renderList(e.target.value));
  const btn = $('#tenantBtn'), menu = $('#tenantMenu');
  const close = () => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
  btn.addEventListener('click', (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; btn.setAttribute('aria-expanded', String(!menu.hidden)); if (!menu.hidden) { const on = menu.querySelector('.tm-item.on'); if (on) on.scrollIntoView({ block: 'nearest' }); if (matchMedia('(min-width: 861px)').matches) $('#tmSearch').focus(); } });
  menu.addEventListener('click', (e) => {
    const it = e.target.closest('[data-tenant]'); if (!it) return;
    if (it.dataset.tenant === TENANT_ID) { close(); return; }
    toast(`切換到「${TENANTS.find(x => x.id === it.dataset.tenant).name}」的後台…`);
    setTimeout(() => setTenant(it.dataset.tenant), 250);
  });
  document.addEventListener('click', (e) => { if (!menu.hidden && !box.contains(e.target)) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  document.title = `${TENANT.name}・GreenUP 一人公司後台`;
  const shopLink = $('.topbar a[href^="shop.html"]'); if (shopLink) shopLink.href = `shop.html?tenant=${TENANT_ID}`;
  // 目前使用者（頭像字＋角色名；下拉：查看我的權限、切換角色（示範）、登出）
  auth.mountUserMenu($('.tb-right'), box);
})();
