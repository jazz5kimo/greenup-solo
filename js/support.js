// 後台右下角「小幫手」：常見問題即答＋帶我去、轉真人客服（工單）、允許 GreenUP 支援存取 24 小時、自動附上錯誤回報
// 原型：問答以關鍵字比對 support-kb.js；工單與授權存在瀏覽器（依業主分開）。正式版見 README「後台小幫手」。
import { $, $$, el, esc, fmtDT, gsap, toast } from './util.js';
import { icon } from './icons.js';
import { KB, PAGE_FAQ, matchKB, looksLikeDataQuestion } from './support-kb.js';

const LS_CHAT = 'greenup-solo:support-chat';
const LS_TICKETS = 'greenup-solo:support-tickets';
const LS_GRANT = 'greenup-solo:support-grant';
const GRANT_MS = 24 * 3600e3;
const CATS = ['操作問題', '帳務報稅', '金流收款', '系統錯誤', '功能建議'];

const lsGet = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };

export const supportGrant = () => { const g = lsGet(LS_GRANT, null); return g && g.expires > Date.now() && !g.revoked ? g : null; };

/**
 * @param {object} o
 * @param {Array} o.views
 * @param {Function} o.go
 * @param {Function} o.can        (viewId, act) → boolean
 * @param {object} o.auth         auth.js 模組（currentUser、roleName、audit、onAuth）
 * @param {Function} o.current    () → 目前頁面 view
 * @param {Function} o.runAction  (id) → 執行指令面板的快速動作
 * @param {Function} o.rankPages  (q) → 依關鍵字排序的頁面
 */
export function initSupport({ views, go, can, auth, current, runAction, rankPages }) {
  const errors = [];
  const fab = el(`<button class="sp-fab" id="spFab" aria-label="小幫手：問問題或聯絡 GreenUP 支援" aria-expanded="false" aria-controls="spPanel">
    <span class="sp-fab-ic">${icon('chat', 24)}</span><span class="sp-fab-x">${icon('x', 22)}</span><span class="sp-fab-tip">需要幫忙？</span><i class="sp-dot" hidden></i></button>`);
  const panel = el(`<section class="sp-panel" id="spPanel" role="dialog" aria-label="小幫手" hidden>
    <header class="sp-h">
      <span class="sp-av">${icon('bot', 20)}</span>
      <div class="sp-ht"><b>GreenUP 小幫手</b><small id="spSub">先由 AI 回答，需要時轉真人（示範）</small></div>
      <span class="sp-grant-chip" id="spGrantChip" hidden></span>
      <button class="sp-hbtn" id="spClear" title="清除對話">${icon('refresh', 16)}</button>
      <button class="sp-hbtn" id="spClose" title="關閉（Esc）">${icon('minus', 16)}</button>
    </header>
    <div class="sp-msgs" id="spMsgs" aria-live="polite"></div>
    <div class="sp-quick" id="spQuick"></div>
    <form class="sp-in" id="spForm" autocomplete="off">
      <input id="spInput" placeholder="問問題，例如：發票開錯怎麼辦？" aria-label="輸入問題" maxlength="300">
      <button class="sp-send" aria-label="送出">${icon('send', 18)}</button>
    </form>
  </section>`);
  document.body.append(fab, panel);
  const msgs = $('#spMsgs', panel), input = $('#spInput', panel);
  let history = lsGet(LS_CHAT, []);
  let busy = false;

  // ---------- 錯誤收集：出錯時右下角亮紅點，回報工單自動附上 ----------
  const pushErr = (msg) => { errors.push({ msg: String(msg).slice(0, 200), page: current()?.id || '', at: Date.now() }); if (errors.length > 5) errors.shift(); if (panel.hidden) $('.sp-dot', fab).hidden = false; };
  window.addEventListener('error', (e) => pushErr(e.message || e.error));
  window.addEventListener('unhandledrejection', (e) => pushErr(e.reason && (e.reason.message || e.reason)));

  // ---------- 權限 ----------
  const allowed = (e) => (!e.go || can(e.go, 'view')) && (e.id !== 'reset' || can('reset', 'edit'));
  const isOwnerLike = () => can('hub', 'edit');
  const viewName = (id) => (views.find(v => v.id === id) || {}).name || id;

  // ---------- 畫面 ----------
  function bubble(m) {
    const time = m.ts ? `<time>${fmtDT(m.ts).slice(5)}</time>` : '';
    if (m.from === 'me') return `<div class="sp-m me"><p>${esc(m.text)}</p>${time}</div>`;
    const steps = m.steps ? `<ol>${m.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>` : '';
    const btns = (m.btns || []).map(b => `<button class="sp-b ${b.primary ? 'pri' : ''}" ${b.go ? `data-go="${b.go}"` : ''} ${b.act ? `data-act="${b.act}"` : ''} ${b.q ? `data-q="${esc(b.q)}"` : ''} ${b.cmd ? `data-cmd="${b.cmd}"` : ''}>${b.icon ? icon(b.icon, 14) : ''}${esc(b.label)}</button>`).join('');
    return `<div class="sp-m bot ${m.kind || ''}">${m.title ? `<b>${esc(m.title)}</b>` : ''}${m.text ? `<p>${esc(m.text)}</p>` : ''}${steps}${m.html || ''}${btns ? `<div class="sp-btns">${btns}</div>` : ''}${time}</div>`;
  }
  function greeting() {
    const v = current(); const u = auth.currentUser();
    const faq = (PAGE_FAQ[v?.id] || ['search', 'promo', 'pay']).map(id => KB.find(e => e.id === id)).filter(e => e && allowed(e));
    const who = u ? `${u.name || auth.roleName()}` : '你好';
    const extra = auth.currentUser()?.role === 'support' ? { text: grantText(true) } : {};
    return { from: 'bot', title: `嗨，${who}！`, text: `我是 GreenUP 小幫手。你現在在「${v ? v.name : '後台'}」，大家常問：${extra.text ? '\n' + extra.text : ''}`,
      btns: faq.map(e => ({ label: e.t, q: e.t })) };
  }
  function render() {
    msgs.innerHTML = [greeting(), ...history].map(bubble).join('');
    msgs.scrollTop = msgs.scrollHeight;
    renderQuick(); renderGrantChip();
  }
  function renderQuick() {
    const q = [['轉真人客服', 'handoff', 'user'], ['回報問題', 'report', 'alert']];
    if (isOwnerLike()) q.push([supportGrant() ? '支援存取中' : '允許支援查看', 'grant', 'shield']);
    if (lsGet(LS_TICKETS, []).length) q.push(['我的工單', 'tickets', 'file']);
    $('#spQuick', panel).innerHTML = q.map(([l, c, ic]) => `<button class="sp-chip" data-cmd="${c}">${icon(ic, 13)}${l}</button>`).join('');
  }
  function grantText(forSupport = false) {
    const g = supportGrant();
    if (!g) return forSupport ? '⚠ 業主尚未允許支援存取（正式版會拒絕登入）。' : '';
    const h = Math.max(1, Math.ceil((g.expires - Date.now()) / 3600e3));
    return forSupport ? `業主已允許支援存取，剩約 ${h} 小時（唯讀＋診斷，看不到個資明文與金鑰）。` : `剩約 ${h} 小時`;
  }
  function renderGrantChip() {
    const g = supportGrant(), chip = $('#spGrantChip', panel);
    chip.hidden = !g; if (g) chip.textContent = `支援存取中・${grantText()}`;
    fab.classList.toggle('granted', !!g);
  }
  function add(m, { save = true } = {}) {
    m.ts = m.ts || Date.now();
    if (save) { history.push(m); history = history.slice(-40); lsSet(LS_CHAT, history); }
    msgs.insertAdjacentHTML('beforeend', bubble(m));
    const last = msgs.lastElementChild; gsap.fromTo(last, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.25 });
    msgs.scrollTop = msgs.scrollHeight;
    return last;
  }
  async function botSay(m, delay = 380) {
    busy = true;
    const t = el(`<div class="sp-m bot typing"><i></i><i></i><i></i></div>`); msgs.appendChild(t); msgs.scrollTop = msgs.scrollHeight;
    await new Promise(r => setTimeout(r, delay));
    t.remove(); busy = false;
    return add(m);
  }

  // ---------- 問答 ----------
  async function ask(q) {
    q = q.trim(); if (!q || busy) return;
    add({ from: 'me', text: q });
    if (/真人|客服人員|找人|打電話給你們|聯絡你們|轉接/.test(q)) return handoff();
    if (/工單|進度/.test(q) && lsGet(LS_TICKETS, []).length) return tickets();
    const hits = matchKB(q, allowed);
    // 像在查數字（「上個月哪個賣最好」）且沒有很明確的操作問題 → 交給「用問的」
    if (looksLikeDataQuestion(q) && can('ask', 'view') && !(hits[0] && hits[0].score >= 6)) {
      return botSay({ from: 'bot', title: '這是查數字的問題', text: '「用問的」可以直接用這句話查，並畫成圖表：',
        btns: [{ label: '用「用問的」查這個', cmd: 'ask:' + q, primary: true, icon: 'ask' }].concat(hits.slice(0, 2).map(h => ({ label: h.t, q: h.t }))) });
    }
    if (hits.length) {
      const e = hits[0];
      const btns = [];
      if (e.go) btns.push({ label: `帶我去「${viewName(e.go)}」`, go: e.go, primary: !e.act, icon: 'arrow' });
      if (e.act && (!e.go || can(e.go, e.need || 'view'))) btns.push({ label: actLabel(e.act), act: e.act, primary: true, icon: 'wand' });
      if (e.id === 'reset') btns.push({ label: '重置示範資料', cmd: 'reset', icon: 'refresh' });
      hits.slice(1, 3).forEach(h => btns.push({ label: h.t, q: h.t }));
      return botSay({ from: 'bot', title: e.t, steps: e.a, btns, kb: e.id });
    }
    const btns = [];
    if (looksLikeDataQuestion(q) && can('ask', 'view')) btns.push({ label: '用「用問的」查這個數字', cmd: 'ask:' + q, primary: true, icon: 'ask' });
    rankPages(q).filter(v => can(v.id, 'view')).slice(0, 3).forEach(v => btns.push({ label: `前往「${v.name}」`, go: v.id, icon: 'arrow' }));
    btns.push({ label: '轉真人客服', cmd: 'handoff', icon: 'user' });
    return botSay({ from: 'bot', text: btns.length > 1 ? '這題我還不太確定，你可能在找：' : '這題我還不太確定，要幫你轉給 GreenUP 支援嗎？', btns });
  }
  const ACT_LABEL = { 'promo-new': '直接新增特價檔期', designer: '打開 AI 設計師', scan: '開始拍收據', quote: 'AI 一句話報價', approvals: '查看待核准', tenant: '切換業主', role: '切換身分', palette: '打開搜尋（⌘K）' };
  const actLabel = (id) => ACT_LABEL[id] || '直接做';

  // ---------- 轉真人：工單 ----------
  function handoff(prefill = {}) {
    const v = current();
    const errLine = errors.length ? `最近錯誤：${errors[errors.length - 1].msg}` : '';
    const form = `<form class="sp-ticket" data-ticket>
      <label>問題類型<select name="cat">${CATS.map(c => `<option ${c === (prefill.cat || '操作問題') ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
      <label>發生什麼事？<textarea name="desc" rows="3" maxlength="600" placeholder="例如：按「開始 AI 對帳」沒有反應">${esc(prefill.desc || '')}</textarea></label>
      <label class="sp-chk"><input type="checkbox" name="ctx" checked> 附上目前頁面「${esc(v ? v.name : '')}」、角色與瀏覽器資訊${errLine ? '、最近一次錯誤' : ''}（不含客戶個資）</label>
      <div class="sp-btns"><button class="sp-b pri" type="submit">${icon('send', 14)}送出給 GreenUP 支援</button><button class="sp-b" type="button" data-cancel>取消</button></div>
      <small class="sp-fine">示範：正式版會送到 GreenUP 支援團隊，回覆會出現在這裡並以 Email／LINE 通知。服務時間與回覆時效依實際方案為準。</small>
    </form>`;
    return botSay({ from: 'bot', title: '轉真人客服', text: '填一下問題，我會連同畫面資訊一起交給 GreenUP 支援：', html: form }).then(node => {
      // 表單只在當下有效，不存進對話紀錄
      history.pop(); lsSet(LS_CHAT, history);
      const f = $('form', node); $('textarea', f).focus();
      $('[data-cancel]', f).addEventListener('click', () => { node.remove(); });
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        const desc = f.desc.value.trim();
        if (desc.length < 4) { f.desc.focus(); f.desc.classList.add('err'); return; }
        const list = lsGet(LS_TICKETS, []);
        const d = new Date(); const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
        const id = `GS-${ymd}-${String(list.length + 1).padStart(3, '0')}`;
        const u = auth.currentUser();
        const t = { id, cat: f.cat.value, desc, at: Date.now(), status: '已收到', by: u ? `${u.name || ''}（${auth.roleName()}）` : '',
          ctx: f.ctx.checked ? { page: v ? v.id : '', role: u ? u.role : '', ua: navigator.userAgent.slice(0, 120), size: `${innerWidth}x${innerHeight}`, errors: errors.slice(-3) } : null };
        list.unshift(t); lsSet(LS_TICKETS, list.slice(0, 30));
        try { auth.audit('建立支援工單', `${id}・${t.cat}`, { kind: 'support' }); } catch { /* ignore */ }
        node.remove();
        add({ from: 'me', text: `【${t.cat}】${desc}` });
        botSay({ from: 'bot', kind: 'ok', title: `已建立工單 ${id}`, text: `GreenUP 支援會依序處理${t.ctx ? '，已附上頁面與瀏覽器資訊' : ''}。（示範：不會真的送出）`,
          btns: [{ label: '我的工單', cmd: 'tickets', icon: 'file' }].concat(isOwnerLike() && !supportGrant() ? [{ label: '允許支援查看 24 小時', cmd: 'grant', icon: 'shield' }] : []) });
        renderQuick();
      });
    });
  }
  function tickets() {
    const list = lsGet(LS_TICKETS, []);
    if (!list.length) return botSay({ from: 'bot', text: '目前沒有工單。', btns: [{ label: '轉真人客服', cmd: 'handoff', icon: 'user' }] });
    const html = `<ul class="sp-tk">${list.slice(0, 6).map(t => `<li><b>${t.id}</b><span class="st">${esc(t.status)}</span><small>${esc(t.cat)}・${fmtDT(t.at)}</small><p>${esc(t.desc)}</p></li>`).join('')}</ul>`;
    return botSay({ from: 'bot', title: '我的工單', html, text: '狀態為示範；正式版會同步支援團隊的處理進度。' });
  }

  // ---------- 支援存取授權（只有負責人）----------
  function grant() {
    if (!isOwnerLike()) return botSay({ from: 'bot', text: '只有負責人可以允許 GreenUP 支援存取。' });
    const g = supportGrant();
    const html = `<div class="sp-grant">
      <p>允許後 24 小時內，GreenUP 支援可以<b>唯讀查看並執行診斷</b>，<b>看不到客戶個資明文與金鑰</b>；每個動作都會寫入稽核日誌，你可以隨時收回。</p>
      ${g ? `<p class="on">${icon('shield', 14)} 支援存取中・${grantText()}（${fmtDT(g.expires)} 到期）</p>` : ''}
      <div class="sp-btns">${g ? `<button class="sp-b warn" data-cmd="revoke">${icon('x', 14)}立即收回</button>` : `<button class="sp-b pri" data-cmd="grant-on">${icon('check', 14)}允許 24 小時</button>`}</div></div>`;
    return botSay({ from: 'bot', title: '允許 GreenUP 支援存取', html });
  }
  function setGrant(on) {
    const u = auth.currentUser();
    if (on) lsSet(LS_GRANT, { by: u ? u.name || auth.roleName() : '負責人', at: Date.now(), expires: Date.now() + GRANT_MS });
    else { const g = lsGet(LS_GRANT, null); if (g) lsSet(LS_GRANT, { ...g, revoked: Date.now() }); }
    try { auth.audit(on ? '允許 GreenUP 支援存取' : '收回 GreenUP 支援存取', on ? '24 小時・唯讀＋診斷' : '', { kind: 'support' }); } catch { /* ignore */ }
    renderGrantChip(); renderQuick();
    add({ from: 'bot', kind: on ? 'ok' : '', text: on ? '已允許 GreenUP 支援存取 24 小時，已寫入稽核日誌。' : '已收回支援存取，已寫入稽核日誌。' });
    input.focus();
    toast(on ? '已允許支援存取 24 小時' : '已收回支援存取', '可在「串接與權限」的稽核日誌查看', { kind: 'info', icon: icon('shield', 18) });
  }

  // ---------- 事件 ----------
  function open() {
    if (!panel.hidden) return;
    panel.hidden = false; fab.classList.add('open'); fab.setAttribute('aria-expanded', 'true'); $('.sp-dot', fab).hidden = true;
    render();
    gsap.fromTo(panel, { opacity: 0, y: 16, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.28, ease: 'power3.out' });
    if (errors.length && !history.some(m => m.errAt === errors[errors.length - 1].at)) {
      const e = errors[errors.length - 1];
      add({ from: 'bot', kind: 'warn', errAt: e.at, title: '剛剛好像出了點問題', text: `在「${viewName(e.page)}」：${e.msg}`, btns: [{ label: '回報給 GreenUP 支援', cmd: 'report', primary: true, icon: 'alert' }] });
    }
    setTimeout(() => input.focus(), 50);
  }
  function close() {
    if (panel.hidden) return;
    panel.hidden = true; fab.classList.remove('open'); fab.setAttribute('aria-expanded', 'false');
    fab.focus();
  }
  fab.addEventListener('click', () => (panel.hidden ? open() : close()));
  $('#spClose', panel).addEventListener('click', close);
  $('#spClear', panel).addEventListener('click', () => { history = []; lsSet(LS_CHAT, history); render(); });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || panel.hidden) return;
    const a = document.activeElement;
    if (panel.contains(a) || a === fab || a === document.body || !a) { e.stopPropagation(); close(); }
  });
  $('#spForm', panel).addEventListener('submit', (e) => { e.preventDefault(); const q = input.value; input.value = ''; ask(q); });
  panel.addEventListener('click', (e) => {
    const b = e.target.closest('[data-go],[data-act],[data-q],[data-cmd]'); if (!b) return;
    if (b.dataset.q) return ask(b.dataset.q);
    if (b.dataset.go) { go(b.dataset.go); if (innerWidth <= 860) close(); return; }
    if (b.dataset.act) { if (innerWidth <= 860 || b.dataset.act !== 'palette') close(); runAction(b.dataset.act); return; }
    const c = b.dataset.cmd;
    if (c === 'handoff') return handoff();
    if (c === 'report') return handoff({ cat: '系統錯誤', desc: errors.length ? `在「${viewName(errors[errors.length - 1].page)}」出現錯誤：${errors[errors.length - 1].msg}` : '' });
    if (c === 'tickets') return tickets();
    if (c === 'grant') return grant();
    if (c === 'grant-on') return setGrant(true);
    if (c === 'revoke') return setGrant(false);
    if (c === 'reset') { const r = $('#resetBtn'); if (r) r.click(); return; }
    if (c.startsWith('ask:')) {
      const q = c.slice(4); close(); go('ask');
      setTimeout(() => { const i = $('#askInput'), f = $('#askForm'); if (i && f) { i.value = q; f.requestSubmit ? f.requestSubmit() : f.dispatchEvent(new Event('submit', { cancelable: true })); } }, 200);
    }
  });
  // 換頁時更新開頭的常見問題；換角色時重新整理
  window.addEventListener('hashchange', () => { if (!panel.hidden) setTimeout(render, 50); });
  try { auth.onAuth(() => { if (!panel.hidden) render(); renderGrantChip(); }); } catch { /* ignore */ }
  setInterval(renderGrantChip, 60e3);
  renderGrantChip();
  return { open, close, ask };
}
