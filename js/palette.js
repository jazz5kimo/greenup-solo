// 指令面板：⌘K／Ctrl+K／「/」開啟，用打字找功能或直接做事（依角色權限過濾）
import { $, $$, el } from './util.js';
import { icon } from './icons.js';

// 每個頁面的常用說法：老闆不一定記得功能叫什麼，但記得要做什麼
const SYN = {
  dashboard: '總覽 首頁 營收 今天 業績',
  brief: '晨報 今天要做什麼 待辦 摘要',
  auto: '自動化 n8n 流程 排程 自動',
  pos: '收銀 結帳 門市 發票 刷卡 找零 日結 交班 載具 統編',
  chat: 'LINE WhatsApp Messenger Zalo 聊天 訊息 客服 接單',
  phone: '電話 來電 接聽 語音',
  booking: '預約 訂金 課程 時段 取貨',
  quotes: '報價 請款 企業 簽回 月結 估價',
  listing: '商品 拍照上架 定價 新品 文案',
  market: '蝦皮 momo PChome Yahoo 露天 Pinkoi 上架 通路',
  studio: '網站 銷售網頁 風格 AI 設計 版型 配色 主題',
  promo: '特價 折扣 中秋 雙11 聖誕 春節 檔期 打折 促銷',
  auction: '拍賣 1元 出價 競標 得標',
  crm: '會員 客戶 行銷 優惠券 評論 推播 分眾',
  inventory: '庫存 原料 補貨 生產 BOM 效期 盤點',
  shipping: '出貨 物流 託運 宅配 超商 冷鏈 揀貨',
  staff: '員工 排班 打卡 薪資 請假 工時',
  receipts: '收據 發票拍照 進項 費用 支出 房租',
  books: '記帳 損益 資產負債 分錄 產銷人發財 會計',
  tax: '營業稅 401 營所稅 扣繳 二代健保 報稅 稅',
  bank: '對帳 金流 綠界 藍新 應收 催款 付款 銀行 現金流',
  owner: '薪水 領多少 現金 存錢 老闆',
  time: '休假 請假 勿擾 休息',
  advisor: '顧問 漲價 補助 貸款 決策',
  ask: '問 圖表 查詢 報表 分析',
  meeting: '會議 逐字稿 記錄 摘要',
  agent: 'AI 店員 店規 客服設定 退換貨',
  hub: '串接 權限 角色 員工帳號 稽核 API 會計師 核准 成員',
  comply: '法規 合約 證照 合規',
  import: '匯入 Excel 搬家 資料',
  deploy: '地端 雲端 升級 OTA 安裝 部署 備份',
};

const LS_RECENT = 'greenup-solo:recent-views';
export function pushRecent(id) {
  try {
    const r = JSON.parse(localStorage.getItem(LS_RECENT) || '[]').filter(x => x !== id);
    r.unshift(id); localStorage.setItem(LS_RECENT, JSON.stringify(r.slice(0, 6)));
  } catch { /* ignore */ }
}
function recent() { try { return JSON.parse(localStorage.getItem(LS_RECENT) || '[]'); } catch { return []; } }

const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, '');
function score(q, item) {
  if (!q) return 1;
  const name = norm(item.name), syn = norm(item.syn), grp = norm(item.group), sub = norm(item.sub);
  if (name.startsWith(q)) return 100;
  if (name.includes(q)) return 80;
  if (syn.includes(q)) return 60;
  if (grp.includes(q)) return 40;
  if (sub.includes(q)) return 30;
  // 字元依序出現（例如「拍記」→ 拍照記帳）
  let i = 0; for (const c of name + syn) { if (c === q[i]) i++; if (i === q.length) return 15; }
  return 0;
}

/**
 * @param {object} o
 * @param {Array} o.views   VIEWS（id, group, name, icon, sub）
 * @param {Object} o.groups 群組名稱 → { color }
 * @param {Function} o.go   go(id)
 * @param {Function} o.can  can(id) → 這個角色看得到嗎
 * @param {Array} o.actions [{ id, name, icon, view?, hint, run }]
 */
export function initPalette({ views, groups, go, can, actions }) {
  const box = el(`<div class="pal" id="palette" hidden role="dialog" aria-modal="true" aria-label="搜尋功能或動作">
    <div class="pal-bg"></div>
    <div class="pal-panel">
      <label class="pal-in">${icon('search', 18)}<input id="palInput" placeholder="想做什麼？例如：中秋特價、對帳、拍收據、請假" autocomplete="off" spellcheck="false"><kbd>Esc</kbd></label>
      <div class="pal-list" id="palList" role="listbox"></div>
      <div class="pal-foot"><span><kbd>↑</kbd><kbd>↓</kbd> 選擇</span><span><kbd>Enter</kbd> 開啟</span><span><kbd>Esc</kbd> 關閉</span><span class="pal-tip">任何頁面按 <kbd>/</kbd> 或 <kbd>⌘K</kbd> 都能叫出來</span></div>
    </div>
  </div>`);
  document.body.appendChild(box);
  const input = $('#palInput', box), list = $('#palList', box);
  let rows = [], sel = 0, lastFocus = null;

  const pages = () => views.filter(v => can(v.id)).map(v => ({ kind: 'page', id: v.id, name: v.name, icon: v.icon, group: v.group, sub: v.sub, syn: SYN[v.id] || '' }));
  const acts = () => actions.filter(a => !a.view || can(a.view, a.need || 'view')).map(a => ({ kind: 'act', ...a, group: '快速動作', sub: a.hint || '', syn: a.syn || '' }));

  function render() {
    const q = norm(input.value);
    let sections;
    if (!q) {
      const r = recent().map(id => pages().find(p => p.id === id)).filter(Boolean).slice(0, 5);
      sections = [['最近使用', r], ['快速動作', acts().slice(0, 6)]];
      if (!r.length) sections.push(['常用功能', pages().filter(p => ['dashboard', 'pos', 'receipts', 'bank', 'promo', 'ask'].includes(p.id))]);
    } else {
      const ranked = (arr) => arr.map(x => [score(q, x), x]).filter(([s]) => s > 0).sort((a, b) => b[0] - a[0]).map(([, x]) => x);
      sections = [['功能', ranked(pages()).slice(0, 8)], ['快速動作', ranked(acts()).slice(0, 5)]];
    }
    rows = []; let html = '';
    for (const [title, items] of sections) {
      if (!items.length) continue;
      html += `<div class="pal-sec">${title}</div>`;
      for (const it of items) {
        const color = (groups[it.group] || {}).color || '#9aa7a0';
        html += `<button class="pal-row" data-i="${rows.length}" role="option" style="--gc:${color}">
          <span class="pal-ic">${icon(it.icon || 'arrow', 17)}</span>
          <span class="pal-txt"><b>${it.name}</b><small>${it.sub || ''}</small></span>
          <span class="pal-grp">${it.kind === 'page' ? `<i></i>${it.group}` : '動作'}</span>
        </button>`;
        rows.push(it);
      }
    }
    if (!rows.length) html = `<div class="pal-empty">找不到「${input.value.replace(/[<&]/g, '')}」。試試別的說法，例如「發票」「出貨」「薪水」。</div>`;
    list.innerHTML = html;
    sel = Math.min(sel, Math.max(rows.length - 1, 0));
    mark();
  }
  function mark() {
    $$('.pal-row', list).forEach((b, i) => b.classList.toggle('on', i === sel));
    const on = $('.pal-row.on', list); if (on) on.scrollIntoView({ block: 'nearest' });
  }
  function run(i) {
    const it = rows[i]; if (!it) return;
    close();
    if (it.kind === 'page') go(it.id); else it.run();
  }
  function open(q = '') {
    lastFocus = document.activeElement;
    box.hidden = false; input.value = q; sel = 0; render();
    input.focus();
  }
  function close() {
    if (box.hidden) return;
    box.hidden = true;
    if (lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus();
  }

  input.addEventListener('input', () => { sel = 0; render(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % Math.max(rows.length, 1); mark(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + rows.length) % Math.max(rows.length, 1); mark(); }
    else if (e.key === 'Enter') { e.preventDefault(); run(sel); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
  });
  list.addEventListener('click', (e) => { const b = e.target.closest('.pal-row'); if (b) run(+b.dataset.i); });
  list.addEventListener('mousemove', (e) => { const b = e.target.closest('.pal-row'); if (b && +b.dataset.i !== sel) { sel = +b.dataset.i; mark(); } });
  $('.pal-bg', box).addEventListener('click', close);

  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); box.hidden ? open() : close(); }
    else if (e.key === '/' && !typing && box.hidden && !$('#authGate:not([hidden])') && !$('#launcher:not([hidden])')) { e.preventDefault(); open(); }
  });
  return { open, close };
}
