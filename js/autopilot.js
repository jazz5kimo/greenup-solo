// AI 自動駕駛：每一項日常工作可選「全自動／先問我／手動」，AI 把要你決定的事集中在一個待確認匣，
// 其餘自動完成並留紀錄；可一鍵暫停全部 AI。手動永遠可以：每件事都能「我自己處理」帶你到對應頁面。
// 原型：狀態存在瀏覽器（依業主分開）；正式版由 API／n8n 依同一份設定執行，並寫入稽核日誌。
import { store } from './state.js';
import { PRODUCTS, startOfDay } from './data.js';
import { vatPeriod } from './ledger.js';
import { FESTIVALS, getPromos, upsertPromo, roundPrice } from './promo.js';
import { SUPPLIERS } from './brief-data.js';
import { TENANT } from './tenant.js';
import * as auth from './auth.js';

const LS = 'greenup-solo:autopilot';
const DAY = 864e5;

// 工作項目：mode 預設值、可選模式、手動時到哪一頁做、風險說明
export const AREAS = [
  { id: 'reply', name: '回覆客人訊息', does: 'AI 用客人的語言回覆 LINE、WhatsApp 等訊息；不確定或客訴時轉給你', def: 'auto', view: 'chat', min: 2 },
  { id: 'order', name: '接單建立訂單', does: '聊天、電話、網頁的訂單自動建立並通知你', def: 'auto', view: 'chat', min: 3 },
  { id: 'invoice', name: '開立電子發票', does: '收款後自動開立並寄給客人', def: 'auto', view: 'pos', min: 1 },
  { id: 'books', name: '記帳分錄', does: '每筆收入支出自動記到產銷人發財', def: 'auto', view: 'books', min: 1 },
  { id: 'recon', name: '對帳沖銷', does: '金流撥款自動對到訂單；對不到的交給你', def: 'auto', view: 'bank', min: 1 },
  { id: 'receipts', name: '收據入帳', does: '辨識清楚的收據自動入帳；看不清楚的請你確認', def: 'auto', view: 'receipts', min: 2 },
  { id: 'dunning', name: '催收未付款', does: '超過 2 天沒付款的訂單，用客人的語言提醒付款', def: 'ask', view: 'bank', min: 3, risk: '會發訊息給客人' },
  { id: 'restock', name: '補貨下單', does: '低於安全庫存時擬好採購單，傳給供應商', def: 'ask', view: 'inventory', min: 10, risk: '會花錢' },
  { id: 'promo', name: '節日特價', does: '節日前擬好特價檔期，時間到自動變價', def: 'ask', view: 'promo', min: 15, risk: '會改售價' },
  { id: 'schedule', name: '排班', does: '依來客預測排下週班表並檢查勞基法', def: 'ask', view: 'staff', min: 30 },
  { id: 'marketing', name: '行銷推播', does: '對會員發送活動與優惠', def: 'ask', view: 'crm', min: 20, risk: '會發訊息給會員' },
  { id: 'refund', name: '退款與作廢', does: '員工送出的作廢、退款、折讓申請', def: 'ask', view: 'pos', min: 3, modes: ['ask', 'manual'], risk: '涉及金錢，不提供全自動' },
  { id: 'tax', name: '營業稅申報', does: '試算本期營業稅並產生申報資料；送出仍由你或記帳士完成', def: 'ask', view: 'tax', min: 60, modes: ['ask', 'manual'], risk: '依法須由你確認，不提供全自動' },
];
export const AREA_MAP = Object.fromEntries(AREAS.map(a => [a.id, a]));
export const MODE_NAME = { auto: '全自動', ask: '先問我', manual: '手動' };
export const PRESETS = {
  recommended: { name: '建議設定', hint: '例行工作全自動，花錢、改價、發訊息先問我' },
  careful: { name: '保守', hint: '全部先問我，AI 只準備好不執行' },
  manual: { name: '全部手動', hint: 'AI 只提醒，你自己做' },
};
// 每個後台頁面相關的工作（頁面上方顯示目前的自動化程度）
export const VIEW_AREAS = { chat: ['reply', 'order'], phone: ['order'], pos: ['invoice', 'refund'], books: ['books'], bank: ['recon', 'dunning'], inventory: ['restock'], promo: ['promo'], staff: ['schedule'], crm: ['marketing'], receipts: ['receipts'], tax: ['tax'] };

const load = () => { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch { return {}; } };
let S = load();
const save = () => { try { localStorage.setItem(LS, JSON.stringify(S)); } catch { /* ignore */ } emit(); };
const subs = new Set();
export const onAutopilot = (fn) => { subs.add(fn); return () => subs.delete(fn); };
function emit() { subs.forEach(fn => { try { fn(); } catch { /* ignore */ } }); }
window.addEventListener('storage', (e) => { if (e.key && e.key.endsWith(LS)) { S = load(); emit(); } });

const who = () => { const u = auth.currentUser(); return u ? `${u.name || auth.roleName()}` : '負責人'; };
export const canConfigure = () => { const u = auth.currentUser(); return !u || u.role === 'owner'; };
export const isPaused = () => !!S.paused;
export function mode(id) {
  const a = AREA_MAP[id]; if (!a) return 'manual';
  const m = (S.modes || {})[id] || a.def;
  return (a.modes || ['auto', 'ask', 'manual']).includes(m) ? m : a.def;
}
export const effectiveMode = (id) => (S.paused ? 'manual' : mode(id));
export function setMode(id, m) {
  const a = AREA_MAP[id]; if (!a || !(a.modes || ['auto', 'ask', 'manual']).includes(m) || mode(id) === m) return false;
  S.modes = { ...(S.modes || {}), [id]: m }; addLog(`「${a.name}」改為${MODE_NAME[m]}`, 'config'); save();
  try { auth.audit('變更 AI 自動化程度', `${a.name}：${MODE_NAME[m]}`, { kind: 'autopilot' }); } catch { /* ignore */ }
  return true;
}
export function applyPreset(key) {
  const modes = {};
  for (const a of AREAS) {
    const allowed = a.modes || ['auto', 'ask', 'manual'];
    modes[a.id] = key === 'manual' ? 'manual' : key === 'careful' ? 'ask' : a.def;
    if (!allowed.includes(modes[a.id])) modes[a.id] = allowed[0];
  }
  S.modes = modes; addLog(`套用「${PRESETS[key].name}」`, 'config'); save();
  try { auth.audit('套用 AI 自動化設定', PRESETS[key].name, { kind: 'autopilot' }); } catch { /* ignore */ }
}
export function setPaused(on) {
  S.paused = !!on; S.pausedAt = on ? Date.now() : null;
  addLog(on ? '暫停全部 AI 自動化' : '恢復 AI 自動化', 'config'); save();
  try { auth.audit(on ? '暫停全部 AI 自動化' : '恢復 AI 自動化', '', { kind: 'autopilot' }); } catch { /* ignore */ }
}
export const pausedAt = () => S.pausedAt || null;
function addLog(text, kind = 'done', area = '') { S.log = [{ at: Date.now(), text, kind, area, by: who() }, ...(S.log || [])].slice(0, 60); }
export const logToday = () => (S.log || []).filter(x => x.at >= +startOfDay(new Date()));

// ---------- 待確認匣：依目前資料產生；已決定的（依編號）不再出現 ----------
const ymd = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
const md = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
const money = (n) => `NT$ ${Math.round(n).toLocaleString('en-US')}`;
const decided = (id) => !!(S.decided || {})[id];

function candidates(now = new Date()) {
  const out = [];
  const today = ymd(now);
  // 補貨
  const low = store.inventory().filter(p => p.low && p.stock > 0);
  if (low.length) {
    const lines = low.slice(0, 5).map(p => { const qty = Math.max(1, Math.ceil(p.safety * 1.5 - p.current)); return { p, qty }; });
    const cost = lines.reduce((s, x) => s + (x.p.cost || 0) * x.qty, 0);
    const sup = SUPPLIERS[0] ? SUPPLIERS[0].vendor : '常用供應商';
    out.push({ id: `restock-${today}-${low.map(p => p.id).join('.')}`, area: 'restock', title: `補貨單：${low.length} 項低於安全庫存`, amount: cost,
      lines: lines.map(x => `${x.p.name} 剩 ${x.p.current}（安全量 ${x.p.safety}）→ 補 ${x.qty}`),
      note: `AI 擬好採購單，核准後用 LINE 傳給 ${sup}（示範，不會真的送出）`, approve: '核准並送出', done: `補貨單已送出給 ${sup}（${low.length} 項，約 ${money(cost)}）` });
  }
  // 催款
  const late = store.orders.filter(o => o.status === 'pending' && o.ts < now - 2 * DAY);
  if (late.length) {
    const sum = late.reduce((s, o) => s + o.total, 0);
    out.push({ id: `dunning-${today}-${late.length}`, area: 'dunning', title: `${late.length} 筆訂單超過 2 天未付款`, amount: sum,
      lines: late.slice(0, 4).map(o => `${o.customer}・${money(o.total)}・${md(new Date(o.ts))} 下單`).concat(late.length > 4 ? [`…另 ${late.length - 4} 筆`] : []),
      note: 'AI 用每位客人的語言擬好付款提醒，附付款連結', approve: '發送提醒', done: `已發送付款提醒給 ${late.length} 位客人（共 ${money(sum)}）` });
  }
  // 營業稅
  const v = vatPeriod(now); const days = Math.ceil((v.deadline - now) / DAY);
  const vp = v.deadline.getMonth() === 0 ? -1 : 0;
  if (days >= 0 && days <= 25) {
    out.push({ id: `tax-${v.roc}-${v.idx}${vp}`, area: 'tax', title: `營業稅 ${v.label}：${days} 天後截止（${md(v.deadline)}）`, amount: v.payable,
      lines: [`銷項稅額 ${money(v.outTax)}`, `進項稅額 ${money(v.inTax)}`, `應納稅額 ${money(v.payable)}`],
      note: '核准後產生 401 申報資料；送出申報仍由你或記帳士在財政部系統完成（試算以主管機關為準）', approve: '產生申報資料', done: `已產生營業稅 ${v.label} 申報資料（應納 ${money(v.payable)}），待送出` });
  }
  // 節日特價：60 天內的節日還沒有開啟的特價
  const promos = getPromos();
  const next = FESTIVALS.find(f => { const d = new Date(f.from); return d > now && d - now < 60 * DAY && !promos.some(p => p.festival === f.id && p.on); });
  if (next && PRODUCTS.length) {
    const top = [...PRODUCTS].sort((a, b) => (b.pop || 0) - (a.pop || 0)).slice(0, 3);
    const items = Object.fromEntries(top.map(p => [p.id, Math.max((p.cost || 0) + 1, roundPrice(p.listPrice * 0.9))]));
    out.push({ id: `promo-${next.id}-${next.from}`, area: 'promo', title: `「${next.name}」還沒有特價檔期（${md(new Date(next.from))} 開始）`,
      lines: top.map(p => `${p.name} ${money(p.listPrice)} → ${money(items[p.id])}`), note: `AI 建議熱銷前 3 名 9 折，${next.from}～${next.to} 自動變價、結束自動恢復`,
      approve: '核准並排程', done: `已排好「${next.name}」特價（3 項 9 折）`, run: () => upsertPromo({ id: `p-ai-${next.id}`, festival: next.id, name: next.name, badge: next.badge, from: next.from, to: next.to, on: true, scope: 'items', items }) });
  }
  // 排班：週四起準備下週班表
  const staff = (TENANT.staff || []).length;
  if (staff > 1 && now.getDay() >= 4) {
    const mon = new Date(now); mon.setDate(now.getDate() + ((8 - now.getDay()) % 7 || 7));
    out.push({ id: `schedule-${ymd(mon)}`, area: 'schedule', title: `下週（${md(mon)} 起）班表已排好`, lines: [`${staff} 位同事`, '依來客預測安排尖峰人力', '已檢查工時與休息時間（規定以勞動部為準）'],
      note: '核准後通知同事；要調整請到「排班打卡」', approve: '核准並通知同事', done: `已通知同事下週班表（${md(mon)} 起）` });
  }
  // 員工送來的申請（作廢、退款、折讓…）
  try {
    if (!auth.currentUser() || auth.can('hub', 'edit')) for (const a of auth.pendingApprovals()) {
      out.push({ id: `appr-${a.id}`, area: 'refund', title: `員工申請：${a.title}`, lines: [a.detail || '', `申請人：${a.by || ''}`].filter(Boolean),
        note: '核准後由系統執行並記錄', approve: '核准', reject: '駁回', done: `已核准：${a.title}`, run: () => auth.decideApproval(a.id, 'approved'), runReject: () => auth.decideApproval(a.id, 'rejected', '負責人駁回') });
    }
  } catch { /* ignore */ }
  return out;
}

// 依模式分流：先問我 → 待確認；手動 → 提醒（只提供「我自己處理」）；全自動 → AI 直接完成並記錄
export function inbox(now = new Date()) {
  const items = [];
  let changed = false;
  for (const c of candidates(now)) {
    if (decided(c.id)) continue;
    const m = effectiveMode(c.area);
    if (m === 'auto') { // 全自動：直接執行一次並記錄
      try { c.run && c.run(); } catch { /* ignore */ }
      S.decided = { ...(S.decided || {}), [c.id]: { s: 'auto', at: Date.now() } };
      addLog(`AI 自動完成：${c.done}`, 'auto', c.area); changed = true;
      continue;
    }
    items.push({ ...c, mode: m, areaName: AREA_MAP[c.area].name, view: AREA_MAP[c.area].view, risk: AREA_MAP[c.area].risk });
  }
  if (changed) save();
  return items;
}
export function decide(item, action) {
  if (action === 'approve') { try { item.run && item.run(); } catch { /* ignore */ } addLog(`你核准：${item.done}`, 'approved', item.area); }
  else if (action === 'reject') { try { item.runReject && item.runReject(); } catch { /* ignore */ } addLog(`你駁回：${item.title}`, 'rejected', item.area); }
  else if (action === 'manual') addLog(`你自己處理：${item.title}`, 'manual', item.area);
  else addLog(`略過：${item.title}`, 'skipped', item.area);
  S.decided = { ...(S.decided || {}), [item.id]: { s: action, at: Date.now(), by: who() } };
  save();
  try { auth.audit(action === 'approve' ? '核准 AI 準備的工作' : action === 'reject' ? '駁回申請' : action === 'manual' ? '改為自己處理' : '略過 AI 建議', item.title, { kind: 'autopilot' }); } catch { /* ignore */ }
}
export const pendingCount = () => inbox().filter(i => i.mode === 'ask').length;

// 今天 AI 自動完成的例行工作（依今日資料統計；只計入設定為全自動的項目）
export function autoDone(now = new Date()) {
  if (S.paused) return [];
  const t0 = startOfDay(now);
  const today = store.ordersBetween(t0, now);
  const paid = today.filter(o => o.status === 'paid');
  const chats = today.filter(o => !['pos', 'web'].includes(o.channel));
  const rows = [];
  const add = (area, n, text) => { if (n > 0 && mode(area) === 'auto') rows.push({ area, n, text, min: n * AREA_MAP[area].min, view: AREA_MAP[area].view }); };
  add('reply', chats.length * 3, `回覆客人訊息 ${chats.length * 3} 則`);
  add('order', today.length, `建立訂單 ${today.length} 筆`);
  add('invoice', paid.length, `開立電子發票 ${paid.length} 張`);
  add('books', today.length, `記帳分錄 ${today.length} 筆`);
  add('recon', paid.length, `對帳沖銷 ${paid.length} 筆`);
  return rows;
}
export const savedMinutes = () => autoDone().reduce((s, r) => s + r.min, 0) + logToday().filter(x => x.kind === 'auto' || x.kind === 'approved').reduce((s, x) => s + ((AREA_MAP[x.area] || {}).min || 0), 0);
