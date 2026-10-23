// AI 自動駕駛：等你確認的事（一鍵核准／自己處理／略過）、今天 AI 做了什麼、每項工作交給 AI 到什麼程度、一鍵暫停
import { store } from '../state.js';
import { $, $$, gsap, esc, money, fmtTime, toast } from '../util.js';
import { icon } from '../icons.js';
import * as auth from '../auth.js';
import * as AP from '../autopilot.js';

let root = null, go = () => {};
const VIEW_NAME = { chat: 'AI 聊天收單', pos: 'POS 收銀台', books: '會計帳務', bank: '金流對帳', receipts: '拍照記帳', inventory: '庫存與生產', promo: '節日特價', staff: '排班打卡', crm: '會員與行銷', tax: '自動化報稅' };
const AREA_ICON = { reply: 'chat', order: 'cart', invoice: 'receipt', books: 'book', recon: 'bank', receipts: 'receipt', dunning: 'bell', restock: 'box', promo: 'percent', schedule: 'clock', marketing: 'heart', refund: 'shield', tax: 'tax' };
let items = [];

function hero() {
  const paused = AP.isPaused(), n = items.filter(i => i.mode === 'ask').length, done = AP.autoDone().reduce((s, r) => s + r.n, 0) + AP.logToday().filter(x => x.kind === 'auto').length;
  const hrs = AP.savedMinutes() / 60;
  const cfg = AP.canConfigure();
  return `<div class="ap-state ${paused ? 'off' : 'on'}"><i></i><div><b>${paused ? 'AI 已暫停' : 'AI 自動駕駛中'}</b>
      <small>${paused ? `從 ${fmtTime(AP.pausedAt() || Date.now())} 起全部改為手動；AI 只提醒，不會自己執行` : '例行工作 AI 自動完成；花錢、改價、發訊息的事先問你；任何一項都可以改成自己做'}</small></div></div>
    <div class="ap-stats">
      <div><b>${n}</b><small>等你確認</small></div>
      <div><b>${done}</b><small>今天 AI 完成</small></div>
      <div><b>${hrs >= 1 ? hrs.toFixed(1) : Math.round(hrs * 60)}</b><small>${hrs >= 1 ? '小時' : '分鐘'}・約省下（估計）</small></div>
    </div>
    ${cfg ? `<button class="btn ${paused ? 'btn-primary' : 'btn-ghost'} ap-pause" id="apPause">${icon(paused ? 'play' : 'x', 15)} ${paused ? '恢復 AI 自動化' : '暫停全部 AI'}</button>` : ''}`;
}

function itemCard(it, i) {
  const ask = it.mode === 'ask';
  const canDo = auth.currentUser() ? auth.can(it.view, 'edit') : true;
  return `<article class="ap-item ${ask ? 'ask' : 'manual'}" data-i="${i}">
    <div class="ap-item-h"><span class="ap-area">${icon(AREA_ICON[it.area] || 'sparkle', 14)}${esc(it.areaName)}</span>
      <span class="ap-mode ${it.mode}">${ask ? 'AI 已準備好・等你確認' : '手動・AI 提醒'}</span>${it.risk ? `<span class="ap-risk">${icon('alert', 12)}${esc(it.risk)}</span>` : ''}</div>
    <h4>${esc(it.title)}${it.amount ? `<em>${money(it.amount)}</em>` : ''}</h4>
    ${it.lines && it.lines.length ? `<ul>${it.lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}
    <p class="ap-note">${esc(it.note || '')}</p>
    <div class="ap-acts">
      ${ask && canDo ? `<button class="btn btn-primary btn-sm" data-act="approve">${icon('check', 14)} ${esc(it.approve || '核准')}</button>` : ''}
      ${ask && canDo && it.reject ? `<button class="btn btn-ghost btn-sm" data-act="reject">${icon('x', 14)} ${esc(it.reject)}</button>` : ''}
      <button class="btn btn-ghost btn-sm" data-act="manual">${icon('arrow', 14)} 我自己處理（${esc(VIEW_NAME[it.view] || '')}）</button>
      ${ask ? `<button class="ap-skip" data-act="skip">略過</button>` : `<button class="ap-skip" data-act="donemanual">我已處理好</button>`}
    </div></article>`;
}

function renderInbox() {
  const box = $('#apInbox', root);
  $('#apInboxN', root).textContent = items.length ? `${items.length} 件` : '沒有待辦';
  box.innerHTML = items.length ? items.map(itemCard).join('') : `<div class="ap-empty">${icon('check', 28)}<b>目前沒有要你決定的事</b><span>${AP.isPaused() ? 'AI 已暫停，恢復後會繼續處理例行工作' : 'AI 正在處理例行工作，有需要你決定的事會出現在這裡'}</span></div>`;
}

function renderDone() {
  const rows = AP.autoDone();
  const log = AP.logToday();
  $('#apDone', root).innerHTML = (AP.isPaused() ? `<div class="ap-paused-note">${icon('alert', 15)} AI 已暫停：新的工作不會自動執行</div>` : '') +
    (rows.length ? `<ul class="ap-auto">${rows.map(r => `<li>${icon(AREA_ICON[r.area] || 'sparkle', 16)}<span>${esc(r.text)}</span><button class="ap-link" data-go="${r.view}">查看 ${icon('arrow', 12)}</button></li>`).join('')}</ul>` : '') +
    (log.length ? `<h5>紀錄</h5><ol class="ap-log">${log.slice(0, 12).map(x => `<li class="${x.kind}"><time>${fmtTime(x.at)}</time><span>${esc(x.text)}</span><small>${esc(x.kind === 'auto' ? 'AI' : x.by || '')}</small></li>`).join('')}</ol>` : '') +
    (!rows.length && !log.length ? '<p class="ap-muted">今天還沒有自動完成的工作。</p>' : '');
}

function renderModes() {
  const cfg = AP.canConfigure();
  $('#apModes', root).innerHTML = `${cfg ? `<div class="ap-presets">${Object.entries(AP.PRESETS).map(([k, p]) => `<button class="ap-preset" data-preset="${k}" title="${esc(p.hint)}"><b>${esc(p.name)}</b><small>${esc(p.hint)}</small></button>`).join('')}</div>` : `<p class="ap-muted">${icon('lock', 13)} 只有負責人可以調整；你可以看到目前的設定。</p>`}
    <div class="ap-rows">${AP.AREAS.map(a => {
      const m = AP.mode(a.id), allowed = a.modes || ['auto', 'ask', 'manual'];
      return `<div class="ap-row"><div class="ap-row-t">${icon(AREA_ICON[a.id] || 'sparkle', 16)}<div><b>${esc(a.name)}</b><small>${esc(a.does)}</small>${a.risk ? `<span class="ap-risk">${icon('alert', 11)}${esc(a.risk)}</span>` : ''}</div></div>
        <div class="ap-seg" role="radiogroup" aria-label="${esc(a.name)}">${['auto', 'ask', 'manual'].map(x => `<button role="radio" aria-checked="${m === x}" data-area="${a.id}" data-mode="${x}" class="${m === x ? 'on' : ''}" ${!allowed.includes(x) || !cfg ? 'disabled' : ''} title="${!allowed.includes(x) ? esc(a.risk || '此項不提供') : ''}">${AP.MODE_NAME[x]}</button>`).join('')}</div>
        <button class="ap-link" data-go="${a.view}">手動做：${esc(VIEW_NAME[a.view] || '')} ${icon('arrow', 12)}</button></div>`;
    }).join('')}</div>`;
}

function render() {
  if (!root) return;
  items = AP.inbox();
  $('#apHero', root).innerHTML = hero();
  renderInbox(); renderDone(); renderModes();
}

export default {
  mount(section, ctx) {
    root = section; go = ctx.go;
    section.innerHTML = `<div class="ap">
      <section class="glass card ap-hero anim-in" id="apHero"></section>
      <div class="ap-grid">
        <section class="glass card anim-in"><div class="card-h"><h3>${icon('bell', 18)} 等你確認</h3><span class="chip-sm" id="apInboxN"></span></div><div class="ap-inbox" id="apInbox"></div></section>
        <section class="glass card anim-in"><div class="card-h"><h3>${icon('bot', 18)} 今天 AI 做了什麼</h3><span class="demo-badge">${icon('alert', 13)} 示範：依今日資料統計</span></div><div id="apDone"></div></section>
      </div>
      <section class="glass card anim-in"><div class="card-h"><h3>${icon('wand', 18)} 每項工作交給 AI 到什麼程度</h3><small class="ap-muted">全自動＝AI 直接做並記錄；先問我＝AI 準備好等你按核准；手動＝AI 只提醒、你自己做</small></div><div id="apModes"></div></section>
    </div>`;
    section.addEventListener('click', (e) => {
      const g = e.target.closest('[data-go]'); if (g) { go(g.dataset.go); return; }
      if (e.target.closest('#apPause')) { const on = !AP.isPaused(); AP.setPaused(on); toast(on ? '已暫停全部 AI 自動化' : '已恢復 AI 自動化', on ? '所有工作改為手動，AI 只提醒' : '例行工作會依設定自動完成', { kind: on ? 'warn' : 'ok', icon: icon('bot', 18) }); return; }
      const pr = e.target.closest('[data-preset]'); if (pr) { AP.applyPreset(pr.dataset.preset); toast(`已套用「${AP.PRESETS[pr.dataset.preset].name}」`, AP.PRESETS[pr.dataset.preset].hint, { icon: icon('wand', 18) }); return; }
      const sg = e.target.closest('.ap-seg [data-mode]'); if (sg && !sg.disabled) { if (AP.setMode(sg.dataset.area, sg.dataset.mode)) toast(`「${AP.AREA_MAP[sg.dataset.area].name}」改為${AP.MODE_NAME[sg.dataset.mode]}`, '已寫入稽核日誌', { icon: icon('wand', 18) }); return; }
      const b = e.target.closest('.ap-item [data-act]'); if (!b) return;
      const card = b.closest('.ap-item'); const it = items[+card.dataset.i]; if (!it) return;
      const act = b.dataset.act;
      const finish = () => { if (act === 'manual') go(it.view); };
      gsap.to(card, { opacity: 0, x: act === 'approve' ? 30 : -30, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0, duration: 0.3, onComplete: () => { AP.decide(it, act === 'donemanual' ? 'manual' : act); finish(); } });
      if (act === 'approve') toast('已核准', it.done, { icon: icon('check', 18) });
    });
    AP.onAutopilot(render);
    store.on('order', render); store.on('reset', render);
    try { auth.onAuth(render); } catch { /* ignore */ }
    render();
  },
  show() { render(); },
};
