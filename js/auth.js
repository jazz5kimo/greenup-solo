// 後台分權（前端示範）：角色、權限矩陣、登入／切換角色、唯讀鎖定、需核准動作、稽核日誌
// 依 docs/後台分權設計.md。這裡的隱藏／鎖定只是「體驗」，正式版由 API 與資料庫強制執行（JWT＋RLS＋INSERT-only 稽核表）。
// 矩陣、稽核、待核准存 localStorage（key 以 greenup-solo: 開頭 → tenant.js 自動依業主分開）；BroadcastChannel 跨分頁同步。
import { TENANT } from './tenant.js';
import { STAFF } from './ledger.js';
import { store } from './state.js';
import { $, $$, el, esc, toast, fmtTime } from './util.js';
import { icon } from './icons.js';

const LS_MATRIX = 'greenup-solo:auth:matrix:v1';
const LS_USER = 'greenup-solo:auth:user:v1';      // 共用登入狀態（所有分頁）
const SS_USER = 'greenup-solo:auth:session:v1';   // 單一分頁覆寫（?role= 測試用）
const LS_AUDIT = 'greenup-solo:auth:audit:v1';
const LS_APPR = 'greenup-solo:auth:approvals:v1';
const CH = 'greenup-auth';
const AUDIT_MAX = 200;

// ── 角色 ─────────────────────────────────────────────────────
export const ROLES = [
  { id: 'owner', name: '負責人', color: '#F0A531', who: '老闆本人', desc: '全部權限；唯一能管成員、權限、金流、AI 金鑰、匯出個資、刪除資料' },
  { id: 'manager', name: '店長', color: '#2DB674', who: '第二個管理者、家人', desc: '營運全部＋查看帳務；不能改設定、不能匯出個資、不能作廢發票' },
  { id: 'staff', name: '員工', color: '#2E97D4', who: '兼職／全職', desc: 'POS、出貨、預約、盤點、打卡；看不到營收、帳務與客戶完整個資；作廢、折讓需核准' },
  { id: 'accountant', name: '記帳士', color: '#7C62E6', who: '外部會計', desc: '帳務、報稅、收據、對帳唯讀；看不到客戶聯絡方式、不能建單' },
  { id: 'support', name: 'GreenUP 支援', color: '#DD5597', who: '我們的客服', desc: '業主允許後 24 小時內唯讀＋診斷；看不到個資明文與金鑰' },
];
export const ROLE_MAP = Object.fromEntries(ROLES.map(r => [r.id, r]));
export const LEVELS = [['none', '看不到'], ['view', '唯讀'], ['edit', '可操作'], ['approve', '可核准']];
const RANK = { none: 0, view: 1, edit: 2, approve: 3 };
// 只有負責人能擁有的模組／動作：其他角色固定 none，矩陣裡不可開放
export const LOCKED = new Set(['hub', 'export', 'reset']);
// 需核准的動作（員工／店長送出 → 負責人核准）：data-act 關鍵字、按鈕文字
const APPROVAL_ACTS = ['void', 'refund', 'discount', 'allow', 'credit', 'scrap', 'writeoff'];
const APPROVAL_TEXT = /作廢|折讓|退款|報廢/;

// ── 預設矩陣（設計文件第三節；模組 key = app.js VIEWS 的 id）────────
const D = (owner, manager, staff, accountant, support) => ({ owner, manager, staff, accountant, support });
const DEFAULTS = {
  dashboard: D('edit', 'view', 'none', 'view', 'view'),
  auto: D('edit', 'view', 'none', 'none', 'view'),
  brief: D('edit', 'view', 'none', 'view', 'view'),
  time: D('edit', 'none', 'none', 'none', 'none'),
  chat: D('edit', 'edit', 'edit', 'none', 'view'),
  phone: D('edit', 'edit', 'edit', 'none', 'view'),
  pos: D('edit', 'edit', 'edit', 'none', 'view'),
  crm: D('edit', 'edit', 'view', 'none', 'none'),
  listing: D('edit', 'edit', 'view', 'none', 'view'),
  market: D('edit', 'edit', 'view', 'none', 'view'),
  promo: D('edit', 'edit', 'view', 'none', 'view'),
  auction: D('edit', 'edit', 'view', 'none', 'view'),
  studio: D('edit', 'edit', 'none', 'none', 'view'),
  booking: D('edit', 'edit', 'edit', 'none', 'view'),
  quotes: D('edit', 'edit', 'none', 'view', 'view'),
  inventory: D('edit', 'edit', 'edit', 'none', 'view'),
  shipping: D('edit', 'edit', 'edit', 'none', 'view'),
  staff: D('edit', 'edit', 'view', 'none', 'view'),
  books: D('edit', 'view', 'none', 'view', 'view'),
  tax: D('edit', 'view', 'none', 'view', 'view'),
  bank: D('edit', 'view', 'none', 'view', 'view'),
  receipts: D('edit', 'view', 'none', 'view', 'view'),
  owner: D('edit', 'none', 'none', 'view', 'none'),
  ask: D('edit', 'view', 'none', 'view', 'view'),
  meeting: D('edit', 'edit', 'none', 'none', 'view'),
  agent: D('edit', 'edit', 'view', 'none', 'view'),
  advisor: D('edit', 'none', 'none', 'none', 'none'),
  import: D('edit', 'none', 'none', 'none', 'view'),
  comply: D('edit', 'view', 'none', 'view', 'view'),
  hub: D('edit', 'none', 'none', 'none', 'none'),
  deploy: D('edit', 'none', 'none', 'none', 'edit'),
  // 敏感動作（非頁面）
  export: D('edit', 'none', 'none', 'none', 'none'),
  reset: D('edit', 'none', 'none', 'none', 'none'),
};
// 模組清單（名稱、群組）由 app.js 註冊；敏感動作固定附在最後
const EXTRA_MODULES = [
  { id: 'export', name: '匯出客戶個資', group: '敏感動作' },
  { id: 'reset', name: '刪除示範／全部資料', group: '敏感動作' },
];
let MODULES = [...EXTRA_MODULES];
export function registerModules(list) {
  MODULES = [...list.map(v => ({ id: v.id, name: v.name, group: v.group })), ...EXTRA_MODULES];
}
export const modules = () => MODULES;

// ── 儲存 ─────────────────────────────────────────────────────
const lsGet = (k, fb, st = localStorage) => { try { const v = st.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } };
const lsSet = (k, v, st = localStorage) => { try { st.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };
const lsDel = (k, st = localStorage) => { try { st.removeItem(k); } catch { /* ignore */ } };

function defaultMatrix() {
  const m = {};
  for (const r of ROLES) { m[r.id] = {}; for (const [k, v] of Object.entries(DEFAULTS)) m[r.id][k] = v[r.id]; }
  return m;
}
let matrix = null;
function loadMatrix() {
  const base = defaultMatrix();
  const saved = lsGet(LS_MATRIX, null);
  if (saved) for (const r of ROLES) if (saved[r.id]) for (const k of Object.keys(saved[r.id])) if (base[r.id] && k in base[r.id]) base[r.id][k] = saved[r.id][k];
  // 負責人永遠全開；鎖定項目其他角色固定 none
  for (const k of Object.keys(DEFAULTS)) { base.owner[k] = 'edit'; if (LOCKED.has(k)) for (const r of ROLES) if (r.id !== 'owner') base[r.id][k] = 'none'; }
  matrix = base;
  return matrix;
}
export const getMatrix = () => matrix || loadMatrix();
export const isDefaultMatrix = () => JSON.stringify(getMatrix()) === JSON.stringify(defaultMatrix());

let user = null;
function loadUser() {
  const ss = lsGet(SS_USER, null, sessionStorage);
  user = (ss && ROLE_MAP[ss.role]) ? ss : (() => { const u = lsGet(LS_USER, null); return u && ROLE_MAP[u.role] ? u : null; })();
  return user;
}
export const currentUser = () => user;
export const hasSessionOverride = () => !!lsGet(SS_USER, null, sessionStorage);

// 示範人名：負責人與員工取自該業主的 STAFF（ledger.js），其餘為預設
export function defaultName(role) {
  const owner = STAFF.find(x => x.kind === 'owner') || STAFF[0];
  const full = STAFF.filter(x => x.kind === 'full'), part = STAFF.filter(x => x.kind === 'part');
  const emps = STAFF.filter(x => x.kind !== 'owner');
  return {
    owner: owner?.name || TENANT.owner || '負責人',
    manager: full[0]?.name || emps[0]?.name || '店長',
    staff: part[0]?.name || emps[1]?.name || emps[0]?.name || '員工',
    accountant: '林雅婷 記帳士',
    support: 'GreenUP 客服',
  }[role] || role;
}

// ── 事件（本分頁＋跨分頁）──────────────────────────────────
const listeners = new Set();
export const onAuth = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = (type) => listeners.forEach(fn => { try { fn(type); } catch { /* ignore */ } });
let bc = null;
try { bc = new BroadcastChannel(CH); } catch { bc = null; }
function broadcast(type) { try { bc && bc.postMessage({ type, t: Date.now() }); } catch { /* ignore */ } }
function onRemote(type) {
  if (type === 'matrix') { clearTimeout(onRemote._mt); onRemote._mt = setTimeout(() => { loadMatrix(); emit('matrix'); }, 80); }
  else if (type === 'user') { if (!hasSessionOverride()) { loadUser(); emit('user'); } }
  else if (type === 'audit') emit('audit');
  else if (type === 'approvals') emit('approvals');
}
if (bc) bc.onmessage = (e) => onRemote(e.data?.type);
window.addEventListener('storage', (e) => {
  if (e.key === LS_MATRIX) onRemote('matrix');
  else if (e.key === LS_USER) onRemote('user');
  else if (e.key === LS_AUDIT) onRemote('audit');
  else if (e.key === LS_APPR) onRemote('approvals');
});

// ── 權限查詢 ─────────────────────────────────────────────────
export function level(viewId, role = user?.role) {
  if (!role) return 'none';
  if (role === 'owner') return 'edit';
  return getMatrix()[role]?.[viewId] ?? 'none';
}
// can('pos', 'edit')：目前使用者在該模組是否達到該動作等級；未登入時一律 false
export function can(viewId, action = 'view', role = user?.role) {
  if (!role) return false;
  return RANK[level(viewId, role)] >= (RANK[action] ?? 1);
}
export const roleName = (r = user?.role) => ROLE_MAP[r]?.name || '';

// ── 稽核日誌（本機，最多 200 筆）──────────────────────────────
// 多分頁同時寫入時 localStorage 可能讀到舊值；每筆帶 id，寫入前與本分頁看過的項目合併，遺漏的會在下次寫入補回
const known = new Map();
function mergeAudit(...lists) {
  for (const l of lists) for (const e of l) if (e && e.id && !known.has(e.id)) known.set(e.id, e);
  return [...known.values()].sort((a, b) => b.ts - a.ts).slice(0, AUDIT_MAX);
}
export function audit(action, detail = '', { kind = '', who = null, role = null } = {}) {
  const entry = { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, ts: Date.now(), who: who || user?.name || '系統', role: role || (who ? '' : user?.role || ''), action, detail, k: kind };
  lsSet(LS_AUDIT, mergeAudit(lsGet(LS_AUDIT, []), [entry]));
  broadcast('audit'); emit('audit');
  return entry;
}
export const auditLog = () => mergeAudit(lsGet(LS_AUDIT, []));

// ── 待核准申請 ───────────────────────────────────────────────
export const approvals = () => lsGet(LS_APPR, []);
export const pendingApprovals = () => approvals().filter(a => a.status === 'pending');
export function requestApproval(title, detail = '', { module = '', ref = '' } = {}) {
  const list = approvals();
  const a = { id: `AP-${Date.now().toString(36).toUpperCase()}`, ts: Date.now(), title, detail, module, ref, by: user?.name || '？', role: user?.role || '', status: 'pending' };
  list.unshift(a); lsSet(LS_APPR, list.slice(0, 100));
  audit('送出核准申請', `${title}${detail ? `：${detail}` : ''}`, { kind: 'warn' });
  broadcast('approvals'); emit('approvals');
  return a;
}
export function decideApproval(id, status, reason = '') {
  if (!can('hub', 'edit')) { deny('只有負責人能核准或駁回'); return null; }
  const list = approvals(); const a = list.find(x => x.id === id);
  if (!a || a.status !== 'pending') return null;
  a.status = status; a.decidedBy = user?.name; a.decidedAt = Date.now(); a.reason = reason;
  lsSet(LS_APPR, list);
  audit(status === 'approved' ? '核准申請' : '駁回申請', `${a.title}（${a.by}）${reason ? `：${reason}` : ''}${status === 'approved' ? '・示範：僅記錄，不實際執行' : ''}`, { kind: status === 'approved' ? 'ok' : 'warn' });
  broadcast('approvals'); emit('approvals');
  return a;
}

// ── 登入／登出／切換 ─────────────────────────────────────────
export function login(role, name = '', { session = false, quiet = false } = {}) {
  if (!ROLE_MAP[role]) return null;
  const prev = user;
  const u = { role, name: name || defaultName(role), at: Date.now() };
  if (session) lsSet(SS_USER, u, sessionStorage);
  else { lsDel(SS_USER, sessionStorage); lsSet(LS_USER, u); }
  user = u;
  if (!quiet) audit(prev ? '切換角色（示範）' : '登入（示範，無密碼）', `${u.name}・${ROLE_MAP[role].name}${prev ? `（原 ${prev.name}・${ROLE_MAP[prev.role].name}）` : ''}`, { kind: 'ok' });
  if (!session) broadcast('user');
  emit('user');
  return u;
}
export function logout() {
  if (user) audit('登出', `${user.name}・${ROLE_MAP[user.role].name}`);
  lsDel(SS_USER, sessionStorage); lsDel(LS_USER);
  user = null; broadcast('user'); emit('user');
}

// ── 矩陣編輯（只有負責人）────────────────────────────────────
export function setPerm(role, viewId, lv) {
  if (!can('hub', 'edit')) { deny('只有負責人能修改權限'); return false; }
  if (role === 'owner' || !ROLE_MAP[role] || !(viewId in DEFAULTS) || !(lv in RANK)) return false;
  if (LOCKED.has(viewId) && lv !== 'none') { toast('此項目僅限負責人', `「${(MODULES.find(m => m.id === viewId) || {}).name || viewId}」為高風險權限，無法授予其他角色`, { kind: 'warn', icon: icon('lock', 18) }); return false; }
  const m = getMatrix(); const old = m[role][viewId]; if (old === lv) return true;
  const mod = MODULES.find(x => x.id === viewId) || { name: viewId };
  audit('變更權限', `${ROLE_MAP[role].name}・${mod.name}：${LEVELS.find(l => l[0] === old)?.[1]} → ${LEVELS.find(l => l[0] === lv)?.[1]}`, { kind: 'warn' });
  m[role][viewId] = lv; lsSet(LS_MATRIX, m);
  broadcast('matrix'); emit('matrix');
  return true;
}
export function resetMatrix() {
  if (!can('hub', 'edit')) { deny('只有負責人能修改權限'); return false; }
  audit('恢復預設權限矩陣', '五個角色全部回到預設值', { kind: 'warn' });
  lsDel(LS_MATRIX); loadMatrix();
  broadcast('matrix'); emit('matrix');
  return true;
}

// ── 拒絕提示（含節流）與稽核 ───────────────────────────────────
let lastDeny = 0, lastDenyKey = '';
export function deny(title = '這個角色只能查看', detail = '', { log = true, key = '' } = {}) {
  const now = Date.now();
  if (now - lastDeny > 1500 || key !== lastDenyKey) toast(title, detail || `目前身分：${user ? `${user.name}・${roleName()}` : '未登入'}（示範：正式版由 API 拒絕並寫稽核）`, { kind: 'warn', icon: icon('lock', 18), duration: 3000 });
  if (log && (now - lastDeny > 1500 || key !== lastDenyKey)) audit('操作被拒絕', `${title}${detail ? `：${detail}` : ''}`, { kind: 'warn' });
  lastDeny = now; lastDenyKey = key;
}

// ── 包裝 store 寫入（不改 state.js）────────────────────────────
const activeViewId = () => (document.querySelector('section.view:not([hidden])')?.id || '').replace(/^view-/, '') || location.hash.slice(1) || 'dashboard';
function guardStore() {
  if (store.__authGuarded) return; store.__authGuarded = true;
  const wrap = (name, check, label) => {
    const orig = store[name].bind(store);
    store[name] = (...args) => {
      if (user && !check()) { deny(`${label}被拒絕`, `目前模組「${(MODULES.find(m => m.id === activeViewId()) || {}).name || activeViewId()}」對 ${roleName()} 為${LEVELS.find(l => l[0] === level(activeViewId()))?.[1] || '看不到'}`, { key: name }); return null; }
      return orig(...args);
    };
  };
  wrap('createOrder', () => can(activeViewId(), 'edit'), '建立訂單');
  wrap('markPaid', () => can(activeViewId(), 'edit'), '標記付款');
  wrap('reset', () => can('reset', 'edit'), '重置示範資料');
  wrap('setDeploy', () => can('deploy', 'edit'), '切換部署模式');
}

// ── 唯讀鎖定與需核准動作：全域 capture 攔截 ───────────────────
// 唯讀模組（section.ro）內的 button／input／select 一律攔下；分頁切換、關閉等保留
const RO_ALLOW = '.ro-ok, .seg, [data-tab], [role="tab"], .hub-tab, .px-tab, [data-act="tab"], [data-act="txf"], [data-act="cat"], [data-act="close"], [data-close], .m-x, .px-x, .ms-x, .icon-btn[title="關閉"], [aria-label="關閉"], [aria-label="Close"], [class*="-tabs"] > button, [class$="-tab"], [class*="-tab "]';
const RO_TARGET = 'button, input, select, textarea, a.btn, [data-act], [data-del], [data-new], [data-paid]';
const denyTs = new Map();
function installGuards() {
  if (document.body.__authGuards) return; document.body.__authGuards = true;
  const onEvt = (e) => {
    if (!user) return;
    const sec = e.target.closest?.('section.view'); if (!sec) return;
    const id = sec.id.replace(/^view-/, '');
    const t = e.target.closest(RO_TARGET); if (!t || !sec.contains(t)) return;
    const lv = level(id);
    if (sec.classList.contains('ro') || lv === 'view') {
      if (t.matches(RO_ALLOW) || t.closest(RO_ALLOW)) return;
      if (t.tagName === 'A' && !t.matches('a.btn')) return;
      e.preventDefault(); e.stopPropagation();
      if (e.type !== 'click') return;
      const key = `${id}:${(t.textContent || t.value || t.name || '').trim().slice(0, 20)}`;
      const log = Date.now() - (denyTs.get(key) || 0) > 5000; denyTs.set(key, Date.now());
      deny('這個角色只能查看', `「${(MODULES.find(m => m.id === id) || {}).name || id}」對 ${roleName()} 為唯讀${key.split(':')[1] ? `：${key.split(':')[1]}` : ''}`, { log, key });
      return;
    }
    // 需核准：員工／店長在可操作模組按下作廢、折讓、退款類動作 → 改為送出申請
    if (e.type !== 'click' || user.role === 'owner' || lv === 'approve') return;
    const btn = e.target.closest('button, [data-act]'); if (!btn || !sec.contains(btn)) return;
    const act = (btn.dataset.act || '').toLowerCase();
    const text = (btn.textContent || '').trim();
    if (!(APPROVAL_ACTS.some(k => act.includes(k)) || (btn.tagName === 'BUTTON' && APPROVAL_TEXT.test(text) && text.length <= 14))) return;
    e.preventDefault(); e.stopPropagation();
    const mod = (MODULES.find(m => m.id === id) || {}).name || id;
    const ref = btn.closest('[data-id]')?.dataset.id || '';
    const a = requestApproval(`${mod}：${text || act}`, ref ? `對象 ${ref}` : '', { module: id, ref });
    toast('已送出核准申請', `${text || act}${ref ? `（${ref}）` : ''} 需負責人核准後才會執行；申請編號 ${a.id}`, { kind: 'info', icon: icon('shield', 18), duration: 4500 });
  };
  document.addEventListener('click', onEvt, true);
  document.addEventListener('mousedown', onEvt, true);
  document.addEventListener('pointerdown', onEvt, true);
  document.addEventListener('keydown', (e) => { if (user && e.key === 'Enter' && e.target.closest?.('section.view.ro') && e.target.matches?.('input, select, textarea')) { e.preventDefault(); } }, true);
}

// ── 登入畫面（覆蓋在 #views 上）──────────────────────────────
let gate = null;
export function mountGate() {
  if (gate) return gate;
  gate = el(`<div class="auth-gate" id="authGate" hidden role="dialog" aria-label="登入">
    <div class="ag-card">
      <div class="ag-head">
        <span class="ag-mark">${icon('shield', 20)}</span>
        <div><b>登入 ${esc(TENANT.name)} 後台</b><small>示範：選一個角色就能進入。正式版為帳號密碼＋TOTP（負責人、店長強制），5 次失敗鎖 15 分鐘。</small></div>
      </div>
      <div class="ag-roles">${ROLES.map(r => `<button class="ag-role" data-role="${r.id}" style="--rc:${r.color}"><span class="ag-av">${esc(defaultName(r.id).slice(0, 1))}</span><span class="ag-txt"><b>${r.name}</b><em>${esc(defaultName(r.id))}</em><small>${r.desc}</small></span></button>`).join('')}</div>
      <div class="ag-foot">${icon('lock', 13)} 前端的隱藏與鎖定只是體驗；正式版每個 API 端點都會檢查角色（JWT）、資料庫啟用 RLS、稽核表只能新增。</div>
    </div>
  </div>`);
  document.body.appendChild(gate);
  gate.addEventListener('click', (e) => {
    const b = e.target.closest('[data-role]'); if (!b) return;
    login(b.dataset.role);
  });
  return gate;
}
export function showGate(show) {
  if (!gate) mountGate();
  if (show) { gate.hidden = false; if (window.gsap) window.gsap.fromTo($$('.ag-role', gate), { opacity: 0, y: 14 }, { opacity: 1, y: 0, stagger: 0.05, duration: 0.4, ease: 'power3.out' }); }
  else if (!gate.hidden) { if (window.gsap) window.gsap.to(gate, { opacity: 0, duration: 0.3, onComplete: () => { gate.hidden = true; gate.style.opacity = ''; } }); else gate.hidden = true; }
}

// ── 頂欄使用者選單 ───────────────────────────────────────────
let userBox = null;
export function mountUserMenu(host, before = null) {
  if (userBox) return userBox;
  userBox = el(`<div class="auth-user" id="authUser"><button class="au-btn" id="authBtn" aria-haspopup="true" aria-expanded="false" title="目前使用者"></button><div class="au-menu" id="authMenu" hidden role="menu"></div></div>`);
  if (before && before.parentNode === host) host.insertBefore(userBox, before.nextSibling); else host.appendChild(userBox);
  const btn = $('#authBtn', userBox), menu = $('#authMenu', userBox);
  const close = () => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
  btn.addEventListener('click', (e) => { e.stopPropagation(); if (!user) return; renderMenu(); menu.hidden = !menu.hidden; btn.setAttribute('aria-expanded', String(!menu.hidden)); });
  menu.addEventListener('click', (e) => {
    const b = e.target.closest('[data-au]'); if (!b) return;
    const k = b.dataset.au;
    if (k === 'logout') { close(); logout(); }
    else if (k === 'perms') { close(); showMyPerms(); }
    else if (k === 'role') { close(); const r = b.dataset.role; if (r !== user.role) { login(r); toast(`已切換為「${ROLE_MAP[r].name}」（示範）`, `${defaultName(r)}・側欄與可操作的功能已依角色調整`, { icon: icon('user', 18) }); } }
  });
  document.addEventListener('click', (e) => { if (!menu.hidden && !userBox.contains(e.target)) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  renderUserBtn();
  return userBox;
}
function renderUserBtn() {
  if (!userBox) return;
  const btn = $('#authBtn', userBox);
  if (!user) { btn.innerHTML = `<span class="au-av">?</span><span class="au-txt"><b>未登入</b><small>請選擇角色</small></span>`; btn.dataset.role = ''; return; }
  const r = ROLE_MAP[user.role];
  btn.dataset.role = user.role;
  btn.style.setProperty('--rc', r.color);
  btn.innerHTML = `<span class="au-av">${esc(user.name.slice(0, 1))}</span><span class="au-txt"><b>${esc(user.name)}</b><small>${r.name}${user.role === 'owner' ? '' : ' <i>示範</i>'}</small></span><span class="au-caret">▾</span>`;
}
function renderMenu() {
  const menu = $('#authMenu', userBox); if (!menu || !user) return;
  const pend = pendingApprovals();
  const mine = approvals().filter(a => a.by === user.name && a.role === user.role);
  menu.innerHTML = `<div class="au-head"><b>${esc(user.name)}</b><small>${ROLE_MAP[user.role].name}・${esc(TENANT.name)}・登入於 ${fmtTime(user.at)}</small></div>
    <button class="au-item" data-au="perms" role="menuitem">${icon('shield', 15)} 查看我的權限</button>
    ${user.role === 'owner' ? `<a class="au-item" href="#hub" role="menuitem">${icon('users', 15)} 成員與權限${pend.length ? `<em>${pend.length} 待核准</em>` : ''}</a>` : mine.length ? `<div class="au-note">${icon('clock', 13)} 我的申請：${mine.filter(a => a.status === 'pending').length} 筆待核准、${mine.filter(a => a.status === 'approved').length} 筆已核准</div>` : ''}
    <div class="au-sep">切換角色 <em>示範</em></div>
    ${ROLES.map(r => `<button class="au-item au-role ${r.id === user.role ? 'on' : ''}" data-au="role" data-role="${r.id}" role="menuitem" style="--rc:${r.color}"><span class="au-av sm">${esc(defaultName(r.id).slice(0, 1))}</span><span><b>${r.name}</b><small>${esc(defaultName(r.id))}</small></span>${r.id === user.role ? '<i>目前</i>' : ''}</button>`).join('')}
    <div class="au-sep"></div>
    <button class="au-item warn" data-au="logout" role="menuitem">${icon('x', 15)} 登出</button>
    <div class="au-foot">正式版：帳號密碼＋TOTP、工作階段 12 小時、閒置 30 分鐘登出</div>`;
}
function showMyPerms() {
  if (!user) return;
  const groups = [...new Set(MODULES.map(m => m.group))];
  const m = el(`<div class="auth-modal" id="authPerms"><div class="am-bg"></div><div class="am-card">
    <div class="am-h"><div><b>我的權限</b><small>${esc(user.name)}・${ROLE_MAP[user.role].name}・${esc(TENANT.name)}</small></div><button class="icon-btn ro-ok" data-close aria-label="關閉">${icon('x', 18)}</button></div>
    <div class="am-body">${groups.map(g => `<h4>${esc(g)}</h4><div class="am-grid">${MODULES.filter(x => x.group === g).map(x => { const lv = level(x.id); return `<span class="am-item lv-${lv}"><b>${esc(x.name)}</b><em>${LEVELS.find(l => l[0] === lv)[1]}</em></span>`; }).join('')}</div>`).join('')}</div>
    <div class="am-foot">${icon('lock', 13)} 權限由負責人在「整合與協作 → 資安與權限」設定，變更即時生效。</div>
  </div></div>`);
  document.body.appendChild(m);
  const close = () => m.remove();
  m.addEventListener('click', (e) => { if (e.target.closest('[data-close]') || e.target.classList.contains('am-bg')) close(); });
  document.addEventListener('keydown', function h(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', h); } });
}

// ── 初始化：?role= → 單一分頁覆寫；?nolaunch 無 role → 預設負責人（既有測試不變）────
export function init() {
  loadMatrix(); loadUser();
  const params = new URLSearchParams(location.search);
  const r = params.get('role');
  if (r && ROLE_MAP[r]) login(r, '', { session: true, quiet: true });
  else if (params.has('nolaunch') && !user) login('owner', '', { quiet: true });
  else if (params.has('nolaunch') && user && user.role !== 'owner' && !hasSessionOverride()) login('owner', '', { quiet: true });
  guardStore(); installGuards(); mountGate();
  onAuth((type) => { if (type === 'user') renderUserBtn(); });
  return user;
}

// 第一個看得到的模組（給 app.js 導回用）
export const firstVisible = (ids) => ids.find(id => can(id, 'view')) || null;

window.__auth = { can, level, currentUser, login, logout, setPerm, resetMatrix, getMatrix, audit, auditLog, approvals, pendingApprovals, decideApproval, requestApproval, ROLES };
