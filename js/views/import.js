// 資料搬家：Excel／CSV、Google 試算表、電商匯出、LINE 記事本、紙本拍照、舊記帳軟體
// → 真的讀 CSV（FileReader）→ AI 欄位對應（連線動畫＋信心值）→ AI 一鍵整理 → 匯入結果；另含新手 7 天上手任務
import { $, $$, el, gsap, esc, sleep, toast, countUp } from '../util.js';
import { icon } from '../icons.js';
import {
  parseCSV, decodeBuffer, demoCustomers, demoProducts, demoOrders, DEMO_LINE_TEXT, parseLineText, TYPES, autoMap, scoreType,
  normPhone, phoneCanonical, dateKind, DATE_KIND_LABEL, normDate, normMoney, moneyDirty, normName,
} from '../import-data.js';
import { AMEI as IM_AMEI, OWNER_NAME as IM_OWNER } from '../import-data.js';
import { PRODUCTS as IM_PRODUCTS } from '../data.js';
// 手寫帳本示意：其他業主用自家商品
const IM_LEDGER = (() => {
  if (IM_AMEI) return null;
  const P = (i) => IM_PRODUCTS.length ? IM_PRODUCTS[i % IM_PRODUCTS.length] : { name: '商品', price: 300 };
  const L = (d, who, i, q, yuan = true) => `${d} ${who} ${P(i).name} ×${q} ${(P(i).price * q).toLocaleString('en-US')}${yuan ? '元' : ''}`;
  return [L('8/14', '王小美', 0, 2), L('8/15', '林佳蓉', 1, 1, false), L('8/17', '陳志明', 2, 3), L('115/8/20', '吳詩涵', 3, 2, false), L('8/22', '黃淑芬', 4, 1), L('8/23', '王 小美', 5, 2, false), `中秋前 張雅婷 ${P(0).name} ×5 ？`];
})();

const svg = (d, size = 20) => `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const CAM = (s) => svg('<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>', s);
const UPLOAD = (s) => svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v12"/>', s);
const DOWNLOAD = (s) => svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/>', s);
const SHEET = (s) => svg('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>', s);

const SOURCES = [
  { id: 'csv', t: 'Excel／CSV 檔', d: 'Excel 另存 CSV、試算表下載檔，拖進來就好', ic: SHEET(22), c: '#2DB674', tags: ['.csv', 'UTF-8／Big5'] },
  { id: 'gsheet', t: 'Google 試算表連結', d: '貼上共用連結，Google 表單回覆也可以', ic: icon('link', 22), c: '#2E97D4', tags: ['共用連結'] },
  { id: 'shop', t: '電商平台訂單匯出檔', d: '賣家中心匯出的訂單檔，AI 認得各家欄位', ic: icon('cart', 22), c: '#F0A531', tags: ['蝦皮', 'Pinkoi', '露天', '其他平台'] },
  { id: 'line', t: 'LINE 記事本／聊天記錄', d: '把記事本或聊天文字整段貼上，AI 拆成表格', ic: icon('chat', 22), c: '#5EE0C4', tags: ['貼上文字'] },
  { id: 'paper', t: '紙本拍照', d: '手寫客戶名單、帳本拍一張，AI 辨識成資料', ic: CAM(22), c: '#DD5597', tags: ['客戶名單', '帳本'] },
  { id: 'legacy', t: '舊記帳／收銀軟體', d: '舊 POS、記帳 App、進銷存軟體的匯出檔', ic: icon('db', 22), c: '#7C62E6', tags: ['匯出 CSV'] },
];
const DEMOS = [
  { id: 'customers', t: '客戶名單', d: '電話寫法混雜、有重複客人、生日格式不一', ic: 'users', type: 'customer', make: () => demoCustomers() },
  { id: 'products', t: '商品清單', d: '價格含「元」、「NT$」與千分位逗號', ic: 'box', type: 'product', make: () => demoProducts() },
  { id: 'orders', t: '過去 3 個月訂單', d: '民國年、西元、「5月1日」混用', ic: 'receipt', type: 'order', make: () => demoOrders() },
];
const PAPER_TEXT = `陳美玲 0937-208-511 生日 66/02/14 台南市東區崇學路 77 號
郭志豪 0918 552 307 生日 1985-7-9 高雄市左營區博愛二路 120 號
蔡宜君 0926552108 生日 3月8日 新竹市東區光復路二段 101 號
曾子晴 0955-882-016 LINE: zq_tseng 要開統編
陳 美玲 0937208511 改寄台北市信義區松仁路 58 號
許書豪 0911-306-722 生日 74/12/01
廖思妤 0963 410 285 台中市南屯區公益路二段 51 號 少糖
邱彥廷 0920-115-873 LINE: ytchiu 中秋禮盒 10 盒`;
const QUEST = [
  { d: 1, t: '搬資料', s: '客戶名單、商品、過去訂單搬進來，AI 幫你整理', min: 15, ic: 'db', go: null, btn: '開始搬家' },
  { d: 2, t: '設定 AI 店員店規', s: '教 AI 退換貨、運費、過敏原，何時要轉給你', min: 10, ic: 'bot', go: 'agent', btn: '去設定店規' },
  { d: 3, t: '開通收款', s: '打開自動收款連結與電子發票，客人下單就能付', min: 8, ic: 'coins', go: 'auto', btn: '去開通' },
  { d: 4, t: '第一張拍照記帳', s: '拍一張進貨收據，看 AI 自動辨識入帳', min: 3, ic: 'receipt', go: 'receipts', btn: '去拍照' },
  { d: 5, t: '看懂三件事', s: '今天賺多少、錢收到沒、什麼該補貨', min: 5, ic: 'dashboard', go: 'dashboard', btn: '去總覽' },
  { d: 6, t: '設定勿擾時段', s: '下班後交給 AI 顧店，緊急的才叫你', min: 3, ic: 'clock', go: 'time', btn: '去設定' },
  { d: 7, t: '邀請記帳士', s: '一鍵邀請記帳士協作，報稅不用再交紙本', min: 5, ic: 'users', go: 'hub', btn: '去邀請' },
];
const DEST = [
  { id: 'crm', type: 'customer', t: '會員與行銷', ic: 'heart', c: '#DD5597', s: '客戶變成統一會員：分眾、生日禮、回購提醒自動跑；訂單裡的客人也會建檔' },
  { id: 'listing', type: 'product', t: 'AI 商品上架', ic: 'sparkle', c: '#F0A531', s: '商品帶入名稱、售價、成本、庫存，AI 補寫五語介紹，一鍵上架各通路' },
  { id: 'books', type: 'order', t: '會計帳務・歷史營收', ic: 'book', c: '#2E97D4', s: '過去訂單變成歷史營收：月比較、毛利、通路占比，和新系統資料接續' },
];
const ISSUE_DEF = [
  { k: 'dup', ic: 'users', c: '#DD5597' },
  { k: 'phone', ic: 'phone', c: '#2E97D4', t: '電話格式不一' },
  { k: 'money', ic: 'coins', c: '#F0A531', t: '金額含逗號或「元」' },
  { k: 'date', ic: 'calendar', c: '#7C62E6', t: '日期格式混用' },
];
const KIND_TAG = { phone: '電話', date: '日期', money: '金額', int: '數字', addr: '地址', name: '文字', text: '文字' };
const LS_Q = 'greenup-import:quest';

let root, goFn, mapRO = null, firstShow = true;
const S = { src: 'csv', paperMode: 'ledger', ds: null, type: 'customer', aiType: 'customer', map: {}, an: null, cleaned: false, clean: null, changed: new Set(), merged: new Set(), view: 'raw', busy: false, result: null, importedTypes: new Set(), quest: new Set() };
try { JSON.parse(localStorage.getItem(LS_Q) || '[]').forEach(d => S.quest.add(d)); } catch { /* ignore */ }
const saveQuest = () => { try { localStorage.setItem(LS_Q, JSON.stringify([...S.quest])); } catch { /* ignore */ } };
const n0 = (v) => Number(v).toLocaleString('en-US');

export default {
  mount(section, { go }) {
    root = section; goFn = go;
    section.innerHTML = `
    <div class="im-wrap">
      <div class="glass im-head anim-in">
        <div class="im-head-txt">
          <span class="demo-badge">${icon('alert', 14)} 示範資料・示範檔內容皆為虛構</span>
          <h2>舊資料一次搬進來，<b class="grad-txt">AI 幫你整理好</b></h2>
          <p>Excel、Google 試算表、蝦皮等電商匯出檔、LINE 記事本、紙本筆記本，丟進來就好。AI 自動認欄位、合併重複客人、統一電話與日期格式，搬完直接接上會員、商品與歷史營收。</p>
          <div class="im-head-pts">
            <span>${icon('check', 14)} 不用先整理 Excel</span><span>${icon('check', 14)} 民國年、「5月1日」都看得懂</span><span>${icon('check', 14)} 匯入前可逐欄確認</span>
          </div>
        </div>
        <div class="im-hq" id="imHQ"></div>
      </div>

      <nav class="im-steps anim-in" id="imSteps"></nav>

      <section class="glass card im-sec anim-in" id="imS1">
        <div class="card-h"><h3><i class="im-no">1</i> 選擇資料來源</h3><span class="chip-sm">不知道選哪個？直接把檔案拖進來，AI 自己判斷</span></div>
        <div class="im-srcs" id="imSrcs">${SOURCES.map(s => `
          <button class="im-src" data-act="src" data-id="${s.id}" style="--c:${s.c}">
            <span class="im-src-ic">${s.ic}</span>
            <span class="im-src-t"><b>${s.t}</b><small>${s.d}</small></span>
            <span class="im-src-tags">${s.tags.map(t => `<em>${t}</em>`).join('')}</span>
          </button>`).join('')}
        </div>
        <div class="im-panel" id="imPanel"></div>
        <input type="file" id="imFile" accept=".csv,.tsv,.txt,.xlsx,.xls,text/csv" hidden>
        <input type="file" id="imPhoto" accept="image/*" hidden>
      </section>

      <section class="glass card im-sec anim-in" id="imS2"></section>

      <section class="glass card im-sec anim-in" id="imS3">
        <div class="card-h im-s3h"><h3><i class="im-no">3</i> AI 欄位對應 ${icon('sparkle', 16)}</h3>
          <div class="im-s3-meta" id="imMapMeta"></div></div>
        <p class="im-hint">左邊是你檔案裡的欄位，右邊是 GreenUP 的欄位。AI 依欄名與內容自動配對，信心值不夠高的會標黃色；覺得不對可直接用下拉選單改。</p>
        <div class="im-map" id="imMap"></div>
        <div class="im-iss-h" id="imIssH"></div>
        <div class="im-iss" id="imIss"></div>
      </section>

      <section class="glass card im-sec anim-in" id="imS4"></section>

      <section class="glass card im-sec anim-in" id="imS5"></section>
    </div>`;

    renderPanel(); renderSteps(); renderQuest(); renderHQ();
    loadDemo(DEMOS[0], { quiet: true, source: 'csv' });

    root.addEventListener('click', onClick);
    root.addEventListener('change', onChange);
    $('#imFile', root).addEventListener('change', (e) => { const f = e.target.files[0]; if (f) readFile(f); e.target.value = ''; });
    $('#imPhoto', root).addEventListener('change', (e) => { const f = e.target.files[0]; if (f) paperScan(f); e.target.value = ''; });
    // 整個來源區都可以拖放
    const s1 = $('#imS1', root);
    s1.addEventListener('dragover', (e) => { e.preventDefault(); s1.classList.add('im-dragging'); });
    s1.addEventListener('dragleave', (e) => { if (!s1.contains(e.relatedTarget)) s1.classList.remove('im-dragging'); });
    s1.addEventListener('drop', (e) => { e.preventDefault(); s1.classList.remove('im-dragging'); const f = e.dataTransfer.files[0]; if (f) readFile(f); });

    if (window.ResizeObserver) { let raf = 0; mapRO = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => drawLines(false)); }); mapRO.observe($('#imMap', root)); }
  },
  show() {
    if (firstShow) { firstShow = false; setTimeout(() => renderMap(true), 420); }
    else requestAnimationFrame(() => drawLines(false));
    renderHQ();
  },
};

// ---------------------------------------------------------------- 事件
function onClick(e) {
  const b = e.target.closest('[data-act]'); if (!b || !root.contains(b)) return;
  const a = b.dataset.act;
  if (a === 'src') { S.src = b.dataset.id; renderPanel(true); return; }
  if (a === 'pick') { $('#imFile', root).click(); return; }
  if (a === 'photo') { $('#imPhoto', root).click(); return; }
  if (a === 'demo') { const d = DEMOS.find(x => x.id === b.dataset.id); loadDemo(d, { source: S.src }); return; }
  if (a === 'dl') { const d = DEMOS.find(x => x.id === b.dataset.id); const f = d.make(); download(f.name, f.csv); return; }
  if (a === 'gsheet') return gsheetRead(b);
  if (a === 'lineparse') return lineParse(b);
  if (a === 'paper') return paperScan(null);
  if (a === 'pmode') { S.paperMode = b.dataset.m; $$('[data-act="pmode"]', root).forEach(x => x.classList.toggle('on', x === b)); $('#imPaperDoc', root).innerHTML = paperDoc(); return; }
  if (a === 'shopdemo') return loadFile(demoOrders('shopee'), '電商平台訂單匯出檔');
  if (a === 'legacydemo') return loadFile(demoOrders('pos'), '舊記帳／收銀軟體');
  if (a === 'type') { setType(b.dataset.t); return; }
  if (a === 'view') { S.view = b.dataset.v; renderPreview(); return; }
  if (a === 'remap') { remap(); return; }
  if (a === 'clean') { runClean(); return; }
  if (a === 'import') { doImport(); return; }
  if (a === 'go') { goFn(b.dataset.go); return; }
  if (a === 'loadtype') { const d = DEMOS.find(x => x.type === b.dataset.t); loadDemo(d, { source: 'csv' }); return; }
  if (a === 'step') { const t = $('#' + b.dataset.to, root); t && t.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  if (a === 'qgo') { const q = QUEST.find(x => x.d === +b.dataset.d); if (q.go) goFn(q.go); else $('#imS1', root).scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  if (a === 'qtoggle') { toggleQuest(+b.dataset.d); return; }
  if (a === 'mkeep' || a === 'mskip') { manualResolve(b, a === 'mkeep'); return; }
}
function onChange(e) {
  const s = e.target.closest('.im-sel'); if (!s) return;
  const i = +s.dataset.i, k = s.value;
  if (k) for (const [j, m] of Object.entries(S.map)) if (m.k === k && +j !== i) delete S.map[j];
  if (k) S.map[i] = { k, conf: 100, why: '你手動指定', manual: true }; else delete S.map[i];
  S.cleaned = false; S.view = 'raw'; S.result = null;
  analyze(); renderMap(false, i); renderIssues(); renderPreview(); renderResult(); renderSteps();
  toast('已更新欄位對應', k ? `「${S.ds.headers[i]}」→ ${TYPES[S.type].targets.find(t => t.k === k).label}` : `「${S.ds.headers[i]}」設為不匯入`, { kind: 'info', icon: icon('link', 18) });
}

function download(name, text) {
  try {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast('已下載示範檔', `${name}・可以用它試試真的上傳`, { icon: DOWNLOAD(18) });
  } catch { toast('下載失敗', '瀏覽器不允許下載', { kind: 'warn', icon: icon('alert', 18) }); }
}

// ---------------------------------------------------------------- 來源面板
function renderPanel(anim) {
  $$('.im-src', root).forEach(x => x.classList.toggle('on', x.dataset.id === S.src));
  const P = $('#imPanel', root);
  const demoRow = `<div class="im-demos">${DEMOS.map(d => `
    <div class="im-demo">
      <span class="im-demo-ic">${icon(d.ic, 20)}</span>
      <div class="im-demo-t"><b>${d.t}.csv</b><small>${d.d}</small></div>
      <div class="im-demo-b"><button class="btn btn-primary btn-sm" data-act="demo" data-id="${d.id}">${icon('play', 13)} 一鍵載入</button><button class="icon-btn im-ib" data-act="dl" data-id="${d.id}" title="下載示範檔" aria-label="下載示範檔">${DOWNLOAD(16)}</button></div>
    </div>`).join('')}</div>`;
  let h = '';
  if (S.src === 'csv') {
    h = `<div class="im-pgrid">
      <label class="im-drop" data-act="pick"><span class="im-drop-ic">${UPLOAD(30)}</span><b>把 CSV 拖到這裡，或點一下選擇檔案</b>
        <small>Excel：檔案 → 另存新檔 →「CSV UTF-8（逗號分隔）」。支援 UTF-8（含 BOM）、Big5、逗號／Tab 分隔、欄位內有逗號或引號</small></label>
      <div class="im-pside"><div class="im-ptitle">${icon('file', 15)} 沒有檔案？先用示範檔試試（虛構資料）</div>${demoRow}</div></div>`;
  } else if (S.src === 'gsheet') {
    h = `<div class="im-pgrid">
      <div class="im-form"><div class="im-ptitle">${icon('link', 15)} 貼上 Google 試算表連結</div>
        <div class="im-url"><input id="imUrl" type="url" placeholder="https://docs.google.com/spreadsheets/d/…" value="https://docs.google.com/spreadsheets/d/1aMei-demo-sheet/edit#gid=0" aria-label="Google 試算表連結"><button class="btn btn-primary btn-sm" data-act="gsheet">${icon('arrow', 14)} 讀取</button></div>
        <ol class="im-ol"><li>在試算表右上角按「共用」</li><li>一般存取權改成「知道連結的任何人：檢視者」</li><li>複製連結貼上，AI 會讀第一個工作表</li></ol>
        <small class="im-note">${icon('alert', 13)} 示範版不會真的連到 Google，會載入一份虛構的「Google 表單回覆」</small></div>
      <div class="im-pside"><div class="im-ptitle">${icon('file', 15)} 或直接用示範檔</div>${demoRow}</div></div>`;
  } else if (S.src === 'shop') {
    h = `<div class="im-pgrid">
      <div class="im-form"><div class="im-ptitle">${icon('cart', 15)} 電商平台訂單匯出檔</div>
        <div class="im-plats">${['蝦皮購物', 'Pinkoi', '露天拍賣', 'momo 摩天商城', 'Shopline', '自架官網', '其他平台'].map(p => `<span>${p}</span>`).join('')}</div>
        <ol class="im-ol"><li>到平台的「賣家中心 → 我的銷售／訂單」</li><li>選日期區間（建議過去 3 個月）→ 匯出</li><li>Excel 開啟後另存成 CSV，丟進來</li></ol>
        <div class="im-pbtns"><button class="btn btn-primary btn-sm" data-act="pick">${UPLOAD(14)} 上傳匯出檔</button><button class="btn btn-ghost btn-sm" data-act="shopdemo">${icon('play', 13)} 載入示範：蝦皮訂單匯出</button></div>
        <small class="im-note">${icon('alert', 13)} 平台名稱僅為文字標示，示範檔為虛構資料，未與任何平台串接</small></div>
      <div class="im-pside"><div class="im-ptitle">${icon('file', 15)} 示範檔</div>${demoRow}</div></div>`;
  } else if (S.src === 'line') {
    h = `<div class="im-pgrid">
      <div class="im-form"><div class="im-ptitle">${icon('chat', 15)} 把 LINE 記事本或聊天記錄整段貼上</div>
        <textarea id="imLineTxt" rows="9" aria-label="LINE 記事本文字">${esc(DEMO_LINE_TEXT)}</textarea>
        <div class="im-pbtns"><button class="btn btn-primary btn-sm" data-act="lineparse">${icon('wand', 14)} AI 解析成表格</button><small class="im-note">AI 會抓出姓名、電話、LINE、生日、地址，其餘放進備註</small></div></div>
      <div class="im-pside"><div class="im-ptitle">${icon('sparkle', 15)} 小技巧</div>
        <ul class="im-tips"><li>LINE 聊天室 → 右上選單 →「其他設定」→「傳送聊天記錄」可存成文字檔</li><li>一行一位客人最準，但混在一起 AI 也會拆</li><li>同一位客人寫了好幾次，匯入時會自動合併</li></ul></div></div>`;
  } else if (S.src === 'paper') {
    h = `<div class="im-pgrid">
      <div class="im-paper" id="imPaper"><div class="im-paper-doc" id="imPaperDoc">${paperDoc()}</div><i class="im-beam"></i></div>
      <div class="im-form"><div class="im-ptitle">${CAM(15)} 紙本筆記本拍照</div>
        <div class="im-pmode"><button class="im-seg ${S.paperMode === 'ledger' ? 'on' : ''}" data-act="pmode" data-m="ledger">手寫帳本</button><button class="im-seg ${S.paperMode === 'customers' ? 'on' : ''}" data-act="pmode" data-m="customers">客戶名單</button></div>
        <ol class="im-ol"><li>攤平拍正，一次一頁，光線充足</li><li>AI 辨識手寫字，看不清楚的會標「需確認」</li><li>可以連拍多頁，自動接成一份</li></ol>
        <div class="im-pbtns"><button class="btn btn-primary btn-sm" data-act="photo">${CAM(14)} 拍照／選擇照片</button><button class="btn btn-ghost btn-sm" data-act="paper">${icon('play', 13)} 用示範照片辨識</button></div>
        <small class="im-note">${icon('alert', 13)} 示範：辨識結果為模擬資料，不會上傳你的照片</small></div></div>`;
  } else if (S.src === 'legacy') {
    h = `<div class="im-pgrid">
      <div class="im-form"><div class="im-ptitle">${icon('db', 15)} 舊記帳／收銀軟體匯出檔</div>
        <div class="im-plats">${['舊 POS 收銀機', '記帳 App', 'Excel 記帳範本', '進銷存軟體', '會計軟體'].map(p => `<span>${p}</span>`).join('')}</div>
        <ol class="im-ol"><li>在舊軟體找「匯出」或「備份成 Excel／CSV」</li><li>銷售明細、商品資料、客戶資料可以分開匯出</li><li>一次丟一個檔，AI 自動判斷是哪一種</li></ol>
        <div class="im-pbtns"><button class="btn btn-primary btn-sm" data-act="pick">${UPLOAD(14)} 上傳匯出檔</button><button class="btn btn-ghost btn-sm" data-act="legacydemo">${icon('play', 13)} 載入示範：舊收銀匯出</button></div></div>
      <div class="im-pside"><div class="im-ptitle">${icon('file', 15)} 示範檔</div>${demoRow}</div></div>`;
  }
  P.innerHTML = h;
  if (anim && gsap) gsap.fromTo(P.children, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
}

function paperDoc() {
  const lines = S.paperMode === 'ledger'
    ? IM_LEDGER || ['8/14 王小美 檸檬塔 ×2 840元', '8/15 林佳蓉 巴斯克 ×1 680', '8/17 陳志明 鳳梨酥 ×3 1,440元', '115/8/20 吳詩涵 可麗露 ×2 780', '8/22 黃淑芬 餅乾禮盒 ×1 520元', '8/23 王 小美 磅蛋糕 ×2 720', '中秋前 張雅婷 禮盒 ×5 ？']
    : ['陳美玲 0937-208-511 生日66/2/14', '郭志豪 0918 552 307 高雄左營', '蔡宜君 0926552108 生日3月8日', '曾子晴 0955-882-016 要統編', '陳 美玲 0937208511 改寄信義區', '許書豪 0911-306-722', IM_AMEI ? '廖思妤 0963 410 285 少糖' : '廖思妤 0963 410 285 要收據'];
  return `<svg viewBox="0 0 300 250" preserveAspectRatio="xMidYMid meet" role="img" aria-label="手寫筆記本示意">
    <rect x="6" y="6" width="288" height="238" rx="8" fill="#fbf7ea"/>
    ${Array.from({ length: 9 }, (_, i) => `<line x1="14" x2="286" y1="${44 + i * 24}" y2="${44 + i * 24}" stroke="#bcd3e6" stroke-width="1"/>`).join('')}
    <line x1="40" x2="40" y1="6" y2="244" stroke="#f0a6a6" stroke-width="1.2"/>
    <text x="48" y="32" font-size="14" fill="#7a5a3a" font-weight="700">${S.paperMode === 'ledger' ? `${esc(IM_OWNER)}的帳本　八月` : '老客人電話簿'}</text>
    ${lines.map((t, i) => `<text x="48" y="${62 + i * 24}" font-size="12.5" fill="#24427a" transform="rotate(${((i * 7) % 5 - 2) * 0.35} 48 ${62 + i * 24})">${esc(t)}</text>`).join('')}
  </svg>`;
}

// ---------------------------------------------------------------- 讀取
function readFile(file) {
  if (/\.(xlsx|xls|numbers)$/i.test(file.name)) {
    toast('請先另存成 CSV', 'Excel：檔案 → 另存新檔 →「CSV UTF-8（逗號分隔）」，再上傳（示範版只讀 CSV）', { kind: 'warn', icon: icon('alert', 18), duration: 6000 });
    return;
  }
  if (file.size > 8 * 1024 * 1024) { toast('檔案太大', '示範版一次最多 8 MB，可以分月份匯出', { kind: 'warn', icon: icon('alert', 18) }); return; }
  const fr = new FileReader();
  fr.onload = () => {
    try {
      const { text, enc, bom } = decodeBuffer(fr.result);
      const p = parseCSV(text);
      p.bom = p.bom || bom;
      if (p.headers.length < 2 || !p.rows.length) { toast('讀不到表格', '請確認第一列是欄位名稱，且至少有一列資料', { kind: 'warn', icon: icon('alert', 18) }); return; }
      loadDataset({ name: file.name, size: file.size, enc, source: SOURCES.find(s => s.id === S.src)?.t || '上傳檔案', demo: false, ...p });
    } catch (err) { toast('解析失敗', String(err && err.message || err), { kind: 'warn', icon: icon('alert', 18) }); }
  };
  fr.onerror = () => toast('讀取失敗', '瀏覽器無法讀取這個檔案', { kind: 'warn', icon: icon('alert', 18) });
  fr.readAsArrayBuffer(file);
}
function loadFile(f, source, opts = {}) {
  const p = parseCSV(f.csv);
  loadDataset({ name: f.name, size: new Blob([f.csv]).size, enc: 'UTF-8', source, demo: true, ...p }, opts);
}
function loadDemo(d, opts = {}) { loadFile(d.make(), opts.source === 'csv' || !opts.source ? '示範檔' : (SOURCES.find(s => s.id === opts.source)?.t || '示範檔'), opts); }

async function gsheetRead(btn) {
  const url = ($('#imUrl', root).value || '').trim();
  if (!/docs\.google\.com\/spreadsheets/.test(url)) { toast('連結看起來不對', '請貼上 docs.google.com/spreadsheets/… 開頭的共用連結', { kind: 'warn', icon: icon('alert', 18) }); return; }
  btn.disabled = true; btn.innerHTML = '<i class="im-spin"></i> 讀取中…';
  await sleep(900);
  btn.disabled = false; btn.innerHTML = `${icon('arrow', 14)} 讀取`;
  loadFile(demoCustomers('gsheet'), 'Google 試算表（示範）');
}
async function lineParse(btn) {
  const txt = $('#imLineTxt', root).value;
  if (!txt.trim()) { toast('還沒貼上文字', '把 LINE 記事本內容貼進來再按一次', { kind: 'warn', icon: icon('alert', 18) }); return; }
  btn.disabled = true; btn.innerHTML = '<i class="im-spin"></i> AI 解析中…';
  await sleep(800);
  btn.disabled = false; btn.innerHTML = `${icon('wand', 14)} AI 解析成表格`;
  const f = parseLineText(txt);
  if (parseCSV(f.csv).rows.length === 0) { toast('沒有找到客人資料', '試試一行一位客人，含姓名與電話', { kind: 'warn', icon: icon('alert', 18) }); return; }
  loadFile(f, 'LINE 記事本');
}
async function paperScan(file) {
  if (S.busy) return;
  if (S.src !== 'paper') { S.src = 'paper'; renderPanel(); }
  const doc = $('#imPaperDoc', root), box = $('#imPaper', root);
  let url = null;
  if (file) { url = URL.createObjectURL(file); doc.innerHTML = `<img src="${url}" alt="上傳的照片">`; }
  S.busy = true; box.classList.add('scanning');
  await sleep(1700);
  box.classList.remove('scanning'); S.busy = false;
  if (url) setTimeout(() => URL.revokeObjectURL(url), 4000);
  if (S.paperMode === 'ledger') loadFile(demoOrders('paper'), '紙本拍照（辨識結果為示範）');
  else { const f = parseLineText(PAPER_TEXT); f.name = '手寫客戶名單（拍照辨識）'; loadFile(f, '紙本拍照（辨識結果為示範）'); }
}

function loadDataset(ds, { quiet = false } = {}) {
  S.ds = ds;
  const best = autoMap(ds.headers, ds.rows);
  S.type = S.aiType = best.type; S.map = best.map;
  S.cleaned = false; S.clean = null; S.changed = new Set(); S.merged = new Set(); S.view = 'raw'; S.result = null;
  analyze();
  renderPreview(); renderIssues(); renderResult(); renderSteps();
  if (!quiet) {
    renderMap(true);
    toast(`已讀取 ${n0(ds.rows.length)} 列`, `${ds.name}・AI 判斷為「${TYPES[S.type].label}」，已自動對應 ${Object.keys(S.map).length} 個欄位`, { icon: icon('check', 18) });
    setTimeout(() => $('#imS2', root).scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
  } else renderMap(false);
}
function setType(t) {
  if (!S.ds || t === S.type) return;
  S.type = t; S.map = scoreType(S.ds.headers, S.ds.rows, t).map;
  S.cleaned = false; S.view = 'raw'; S.result = null;
  analyze(); renderPreview(); renderMap(true); renderIssues(); renderResult(); renderSteps();
}
function remap() {
  if (!S.ds) return;
  S.map = scoreType(S.ds.headers, S.ds.rows, S.type).map; S.cleaned = false; S.view = 'raw'; S.result = null;
  analyze(); renderMap(true); renderPreview(); renderIssues(); renderResult(); renderSteps();
}

// ---------------------------------------------------------------- 分析與清理
const colOf = (k) => { for (const [i, m] of Object.entries(S.map)) if (m.k === k) return +i; return -1; };
const tgt = (k) => TYPES[S.type].targets.find(t => t.k === k);
const phoneStyle = (v) => String(v).replace(/\d/g, 'd');

function analyze() {
  const T = TYPES[S.type], rows = S.ds.rows;
  const flags = new Map(), manual = new Map();
  const addManual = (r, why) => { if (!manual.has(r)) manual.set(r, []); manual.get(r).push(why); };
  const iss = {};
  for (const t of T.targets.filter(t => t.req)) {
    const c = colOf(t.k); if (c < 0) continue;
    rows.forEach((row, r) => { if (!row[c]) { addManual(r, `缺少${t.label}`); flags.set(`${r}:${c}`, 'bad'); } });
  }
  // 電話
  const pc = colOf('phone');
  const ph = iss.phone = { on: pc >= 0, n: 0, bad: 0, ex: [], sub: '' };
  if (pc >= 0) {
    const styles = new Set();
    rows.forEach((row, r) => {
      const v = row[pc]; if (!v) return; styles.add(phoneStyle(v));
      if (phoneCanonical(v)) return;
      const p = normPhone(v);
      if (p.ok) { ph.n++; flags.set(`${r}:${pc}`, 'warn'); if (ph.ex.length < 3 && !ph.ex.some(e => phoneStyle(e.b) === phoneStyle(v))) ph.ex.push({ b: v, a: p.out }); }
      else { ph.bad++; addManual(r, `電話「${v}」位數不對`); flags.set(`${r}:${pc}`, 'bad'); }
    });
    ph.sub = `共 ${styles.size} 種寫法，統一成 0912-345-678`;
  }
  // 金額
  const mo = iss.money = { on: false, n: 0, bad: 0, ex: [], sub: '' };
  for (const t of T.targets.filter(t => t.kind === 'money')) {
    const c = colOf(t.k); if (c < 0) continue; mo.on = true;
    rows.forEach((row, r) => {
      const v = row[c]; if (!v) return;
      const m = normMoney(v);
      if (!m.ok) { mo.bad++; addManual(r, `${t.label}「${v}」不是數字`); flags.set(`${r}:${c}`, 'bad'); }
      else if (moneyDirty(v)) { mo.n++; flags.set(`${r}:${c}`, 'warn'); if (mo.ex.length < 3 && !mo.ex.some(e => e.b.replace(/\d/g, '') === v.replace(/\d/g, ''))) mo.ex.push({ b: v, a: m.out }); }
    });
  }
  if (mo.on) mo.sub = '去掉「元」、NT$、千分位，變成可加總的數字';
  // 日期
  const dt = iss.date = { on: false, n: 0, bad: 0, ex: [], sub: '', kinds: {} };
  for (const t of T.targets.filter(t => t.kind === 'date')) {
    const c = colOf(t.k); if (c < 0) continue; dt.on = true;
    rows.forEach((row, r) => {
      const v = row[c]; const k = dateKind(v); if (k === 'empty') return;
      dt.kinds[k] = (dt.kinds[k] || 0) + 1;
      if (k === 'std') return;
      const d = normDate(v, { birthday: t.k === 'birthday' });
      if (!d.ok) { dt.bad++; addManual(r, `${t.label}「${v}」看不懂`); flags.set(`${r}:${c}`, 'bad'); }
      else { dt.n++; flags.set(`${r}:${c}`, 'warn'); if (dt.ex.length < 3 && !dt.ex.some(e => dateKind(e.b) === k)) dt.ex.push({ b: v, a: d.out + (d.noYear ? '（無年份）' : '') }); }
    });
  }
  if (dt.on) dt.sub = Object.entries(dt.kinds).filter(([k]) => k !== 'bad').map(([k, n]) => `${DATE_KIND_LABEL[k]} ${n}`).join('・') || '格式一致';
  // 重複
  const dupT = S.type === 'product' ? 'name' : S.type === 'order' ? 'customer' : 'name';
  const nc = colOf(dupT);
  const dp = iss.dup = { on: nc >= 0, n: 0, bad: 0, ex: [], sub: '', groups: [] };
  if (nc >= 0) {
    const g = new Map();
    rows.forEach((row, r) => {
      if (manual.has(r)) return;
      let key = null;
      if (S.type === 'customer' && pc >= 0) { const p = normPhone(row[pc]); if (p.ok) key = 'p' + p.d; }
      if (!key) { const nn = normName(row[nc]); if (!nn) return; key = 'n' + nn; }
      if (!g.has(key)) g.set(key, []); g.get(key).push(r);
    });
    for (const rs of g.values()) {
      if (rs.length < 2) continue;
      const raws = [...new Set(rs.map(r => rows[r][nc].trim()))];
      const canon = rs.map(r => normName(rows[r][nc])).sort((a, b) => b.length - a.length || a.localeCompare(b))[0];
      if (S.type === 'order') {
        const vars = rs.filter(r => rows[r][nc].trim() !== canon);
        if (!vars.length) continue;
        dp.n += vars.length; dp.groups.push({ rs, canon });
        vars.forEach(r => flags.set(`${r}:${nc}`, 'warn'));
        if (dp.ex.length < 3) dp.ex.push({ b: raws.filter(x => x !== canon).slice(0, 2).join('／'), a: canon });
      } else {
        dp.n += rs.length - 1; dp.groups.push({ rs, canon });
        rs.forEach(r => { if (rows[r][nc].trim() !== canon) flags.set(`${r}:${nc}`, 'warn'); });
        if (dp.ex.length < 3) dp.ex.push({ b: raws.slice(0, 2).join('／'), a: canon + (raws.length > 1 ? '' : '') });
      }
    }
    dp.sub = S.type === 'customer' ? '同電話、不同名字寫法，合併成一位' : S.type === 'order' ? '同一位客人不同寫法，歸到同一人' : '同名商品合併成一項';
  }
  S.an = { iss, flags, manual };
}

function buildClean() {
  const T = TYPES[S.type], rows = S.ds.rows.map(r => r.slice());
  const changed = new Set(), merged = new Set();
  const set = (r, c, v) => { if (rows[r][c] !== v) { rows[r][c] = v; changed.add(`${r}:${c}`); } };
  const pc = colOf('phone');
  if (pc >= 0) rows.forEach((row, r) => { const v = row[pc]; if (v && !phoneCanonical(v)) { const p = normPhone(v); if (p.ok) set(r, pc, p.out); } });
  for (const t of T.targets) {
    const c = colOf(t.k); if (c < 0) continue;
    if (t.kind === 'money') rows.forEach((row, r) => { const m = normMoney(row[c]); if (m.ok && row[c] && moneyDirty(row[c])) set(r, c, m.out); });
    if (t.kind === 'date') rows.forEach((row, r) => { const v = row[c]; if (v && dateKind(v) !== 'std') { const d = normDate(v, { birthday: t.k === 'birthday' }); if (d.ok) set(r, c, d.out); } });
  }
  const nc = colOf(S.type === 'order' ? 'customer' : 'name');
  for (const g of S.an.iss.dup.groups || []) {
    g.rs.forEach((r, i) => { set(r, nc, g.canon); if (S.type !== 'order' && i > 0) merged.add(r); });
  }
  return { rows, changed, merged };
}

async function runClean(fast = false) {
  if (!S.ds || S.busy) return;
  if (S.cleaned) { toast('已經整理好了', '可以直接按「開始匯入」', { kind: 'info', icon: icon('check', 18) }); return; }
  S.busy = true;
  const btn = $('#imCleanBtn', root);
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="im-spin"></i> AI 整理中…'; }
  const cards = $$('.im-is', root);
  for (const card of cards) {
    const k = card.dataset.k, it = S.an.iss[k];
    if (!it.on || !it.n) { card.classList.add('done'); continue; }
    card.classList.add('run');
    if (!fast) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    const bar = $('.im-is-bar i', card), cnt = $('.im-is-fixed b', card);
    const dur = fast ? 0.35 : 1.0;
    if (gsap) gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: dur, ease: 'power2.inOut' });
    countUp(cnt, it.n, { duration: dur, from: 0 });
    const exs = $$('.im-ex li', card);
    for (const li of exs) { await sleep(fast ? 60 : 260); li.classList.add('fixed'); if (gsap) gsap.fromTo($('em', li), { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.35, ease: 'back.out(2)' }); }
    await sleep(fast ? 200 : Math.max(200, dur * 1000 - exs.length * 260));
    card.classList.remove('run'); card.classList.add('done');
    if (!card.isConnected) { S.busy = false; return; } // 整理中切換了資料來源，卡片已重繪，這次整理作廢
    const stEl = $('.im-is-st', card); if (stEl) stEl.innerHTML = `${icon('check', 13)} 已整理`;
    if (gsap && $('.im-is-ok', card)) gsap.fromTo($('.im-is-ok', card), { scale: 0, rotate: -40 }, { scale: 1, rotate: 0, duration: 0.5, ease: 'back.out(3)' });
  }
  const c = buildClean();
  S.clean = c.rows; S.changed = c.changed; S.merged = c.merged; S.cleaned = true; S.view = 'clean'; S.busy = false;
  renderPreview(); renderIssueHead(); renderResult(); renderSteps();
  $$('#imS2 td.im-fixed', root).forEach((td, i) => gsap && gsap.fromTo(td, { backgroundColor: 'rgba(94,224,196,0.45)' }, { backgroundColor: 'rgba(45,182,116,0.12)', duration: 1.2, delay: i * 0.02 }));
  const man = S.an.manual.size;
  toast('AI 整理完成', `修正 ${n0(c.changed.size)} 個欄位${c.merged.size ? `・合併 ${c.merged.size} 位重複` : ''}${man ? `・${man} 筆需要你確認` : ''}`, { icon: icon('wand', 18) });
}

// ---------------------------------------------------------------- 預覽
function renderPreview() {
  const box = $('#imS2', root), ds = S.ds;
  if (!ds) { box.innerHTML = ''; return; }
  const T = TYPES[S.type];
  const rows = (S.view === 'clean' && S.cleaned ? S.clean : ds.rows).slice(0, 10);
  const tMap = {}; for (const [i, m] of Object.entries(S.map)) tMap[i] = T.targets.find(t => t.k === m.k)?.label;
  const cell = (r, c, v) => {
    const key = `${r}:${c}`;
    let cls = '';
    if (S.view === 'clean' && S.cleaned) { if (S.changed.has(key)) cls = 'im-fixed'; else if (S.an.flags.get(key) === 'bad') cls = 'im-bad'; }
    else { const f = S.an.flags.get(key); if (f) cls = f === 'bad' ? 'im-bad' : 'im-warn'; }
    return `<td class="${cls}" title="${esc(v)}">${v ? esc(v) : '<i class="im-empty">（空白）</i>'}</td>`;
  };
  const kb = (ds.size / 1024).toFixed(ds.size < 10240 ? 1 : 0);
  box.innerHTML = `
    <div class="card-h"><h3><i class="im-no">2</i> 檔案預覽 <small class="im-h-sub">前 10 列</small></h3>
      <div class="im-types">${Object.entries(TYPES).map(([k, t]) => `<button class="im-seg ${S.type === k ? 'on' : ''}" data-act="type" data-t="${k}">${icon(t.icon, 14)} ${t.label}${S.aiType === k ? '<em>AI 判斷</em>' : ''}</button>`).join('')}</div></div>
    <div class="im-finfo">
      <span class="im-fname">${icon('file', 15)} <b>${esc(ds.name)}</b></span>
      <span class="chip-sm">${esc(ds.source)}</span>
      <span class="chip-sm">${n0(ds.rows.length)} 列 × ${ds.headers.length} 欄</span>
      <span class="chip-sm">${ds.enc}${ds.bom ? '・已移除 BOM' : ''}</span>
      <span class="chip-sm">${ds.delim === '\t' ? 'Tab' : ds.delim === ';' ? '分號' : '逗號'}分隔${ds.quotedCells ? `・${ds.quotedCells} 格含引號` : ''}</span>
      <span class="chip-sm">${kb} KB</span>
      ${ds.demo ? '<span class="chip-sm warn">示範檔・虛構資料</span>' : '<span class="chip-sm im-real">你上傳的檔案・只在瀏覽器內讀取</span>'}
    </div>
    <div class="im-prev-bar">
      <div class="im-legend">${S.view === 'clean' && S.cleaned ? '<span><i class="im-lg fixed"></i>AI 已修正</span><span><i class="im-lg bad"></i>需人工確認</span>' : '<span><i class="im-lg warn"></i>格式待整理</span><span><i class="im-lg bad"></i>需人工確認</span>'}</div>
      ${S.cleaned ? `<div class="im-vt"><button class="im-seg ${S.view === 'raw' ? 'on' : ''}" data-act="view" data-v="raw">原始</button><button class="im-seg ${S.view === 'clean' ? 'on' : ''}" data-act="view" data-v="clean">${icon('wand', 13)} AI 整理後</button></div>` : ''}
    </div>
    <div class="tbl-wrap im-tw"><table class="tbl im-tbl">
      <thead><tr><th class="im-rn">#</th>${ds.headers.map((h, i) => `<th>${esc(h)}${tMap[i] ? `<small class="im-thm">→ ${tMap[i]}</small>` : '<small class="im-thm off">不匯入</small>'}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((row, r) => `<tr class="${S.view === 'clean' && S.merged.has(r) ? 'im-mrow' : ''}"><td class="im-rn">${r + 1}${S.view === 'clean' && S.merged.has(r) ? '<em>合併</em>' : ''}</td>${ds.headers.map((_, c) => cell(r, c, row[c])).join('')}</tr>`).join('')}</tbody>
    </table></div>
    ${ds.rows.length > 10 ? `<div class="im-more">還有 ${n0(ds.rows.length - 10)} 列未顯示，匯入時會一起處理</div>` : ''}`;
}

// ---------------------------------------------------------------- 欄位對應（主視覺）
const confColor = (m) => m.manual ? '#7C62E6' : m.conf >= 90 ? '#2DB674' : m.conf >= 75 ? '#5EE0C4' : '#F0A531';
function sampleKind(i) {
  const vs = S.ds.rows.map(r => r[i]).filter(Boolean).slice(0, 20);
  if (!vs.length) return '空白';
  const t = (rx) => vs.filter(v => rx.test(v)).length / vs.length;
  if (t(/^(\+?886|0)?[\s-]?\(?9\d\)?[\d\s-]{6,12}$/) > 0.6) return '電話';
  if (vs.filter(v => dateKind(v) !== 'bad').length / vs.length > 0.6) return '日期';
  if (t(/^(NT\$|\$)?\s*[\d,]+\s*元?$/i) > 0.6) return /^\d{1,3}$/.test(vs[0]) && t(/^\d{1,3}$/) > 0.8 ? '數字' : '金額';
  if (t(/(市|縣).*(路|街|號)/) > 0.5) return '地址';
  return '文字';
}
function renderMap(animate, only) {
  const host = $('#imMap', root), ds = S.ds;
  if (!ds) { host.innerHTML = ''; return; }
  const T = TYPES[S.type];
  const mappedN = Object.keys(S.map).length;
  const autos = Object.values(S.map).filter(m => !m.manual);
  const avg = autos.length ? Math.round(autos.reduce((s, m) => s + m.conf, 0) / autos.length) : 0;
  const reqMiss = T.targets.filter(t => t.req && colOf(t.k) < 0);
  $('#imMapMeta', root).innerHTML = `
    <span class="im-meta"><small>AI 平均信心</small><b id="imAvg">${avg}%</b></span>
    <span class="im-meta"><small>已對應</small><b>${T.targets.filter(t => colOf(t.k) >= 0).length}/${T.targets.length}</b></span>
    ${reqMiss.length ? `<span class="chip-sm warn">${icon('alert', 12)} 必填未對應：${reqMiss.map(t => t.label).join('、')}</span>` : ''}
    <button class="btn btn-ghost btn-sm" data-act="remap">${icon('refresh', 14)} 重新對應</button>`;
  const opts = (i) => `<option value="">不匯入</option>${T.targets.map(t => `<option value="${t.k}" ${S.map[i]?.k === t.k ? 'selected' : ''}>${t.label}${t.req ? '（必填）' : ''}</option>`).join('')}`;
  host.innerHTML = `
    <div class="im-col im-col-l"><div class="im-col-h">${icon('file', 14)} 你的檔案欄位 <small>${ds.headers.length} 欄</small></div>
      ${ds.headers.map((h, i) => {
        const m = S.map[i];
        const smp = ds.rows.map(r => r[i]).filter(Boolean).slice(0, 2);
        return `<div class="im-sf ${m ? '' : 'off'}" data-i="${i}">
          <span class="im-sf-k">${sampleKind(i)}</span>
          <div class="im-sf-t"><b title="${esc(h)}">${esc(h)}</b><small title="${esc(smp.join('・'))}">${smp.length ? esc(smp.join('・')) : '（空白欄）'}</small></div>
          <div class="im-sf-r"><select class="im-sel" data-i="${i}" aria-label="${esc(h)} 對應到">${opts(i)}</select>
          <span class="im-sf-c" style="--c:${m ? confColor(m) : 'var(--txt3)'}">${m ? (m.manual ? '手動' : m.conf + '%') : '—'}</span></div>
          <i class="im-anc"></i>
        </div>`;
      }).join('')}</div>
    <div class="im-gut" aria-hidden="true"><span>${icon('sparkle', 14)} AI 配對</span></div>
    <div class="im-col im-col-r"><div class="im-col-h"><span class="im-gu">G</span> GreenUP「${T.label}」欄位</div>
      ${T.targets.map(t => {
        const i = colOf(t.k), m = S.map[i];
        return `<div class="im-tf ${i >= 0 ? 'ok' : t.req ? 'miss' : ''}" data-k="${t.k}">
          <i class="im-anc"></i>
          <div class="im-tf-t"><b>${t.label}${t.req ? '<em>必填</em>' : ''}</b><small>${i >= 0 ? `← ${esc(ds.headers[i])}` : t.req ? '還沒對應，請從左邊下拉選擇' : '未對應（可留空）'}</small></div>
          <span class="im-tf-why">${m ? esc(m.why || '') : ''}</span>
          <span class="im-tf-st">${i >= 0 ? icon('check', 14) : t.req ? icon('alert', 14) : icon('minus', 14)}</span>
        </div>`;
      }).join('')}</div>
    <svg class="im-svg" aria-hidden="true"></svg>
    <div class="im-badges"></div>
    <i class="im-scanl"></i>`;
  drawLines(animate, only);
}

function drawLines(animate, only) {
  const host = $('#imMap', root); if (!host || !S.ds) return;
  const svgEl = $('.im-svg', host), badges = $('.im-badges', host);
  if (!svgEl) return;
  const box = host.getBoundingClientRect();
  if (box.width === 0 || getComputedStyle(svgEl).display === 'none') return;
  svgEl.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
  svgEl.setAttribute('width', box.width); svgEl.setAttribute('height', box.height);
  let paths = '', bs = '';
  const list = [];
  for (const [i, m] of Object.entries(S.map)) {
    const a = $(`.im-sf[data-i="${i}"] .im-anc`, host), b = $(`.im-tf[data-k="${m.k}"] .im-anc`, host);
    if (!a || !b) continue;
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const x1 = ra.left + ra.width / 2 - box.left, y1 = ra.top + ra.height / 2 - box.top;
    const x2 = rb.left + rb.width / 2 - box.left, y2 = rb.top + rb.height / 2 - box.top;
    const dx = Math.max(40, (x2 - x1) * 0.5);
    const d = `M${x1.toFixed(1)} ${y1.toFixed(1)} C${(x1 + dx).toFixed(1)} ${y1.toFixed(1)}, ${(x2 - dx).toFixed(1)} ${y2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`;
    const c = confColor(m);
    paths += `<g class="im-ln-g" data-i="${i}"><path class="im-ln-glow" d="${d}" stroke="${c}"/><path class="im-ln" d="${d}" stroke="${c}"/><path class="im-ln-flow" d="${d}" stroke="${c}"/></g>`;
    bs += `<span class="im-cb" data-i="${i}" style="left:${(x2 - 14).toFixed(1)}px;top:${y2.toFixed(1)}px;--c:${c}"><b>${m.manual ? '手動' : m.conf + '%'}</b></span>`;
    list.push(i);
  }
  svgEl.innerHTML = `<defs></defs>${paths}`;
  badges.innerHTML = bs;
  if (!gsap) return;
  const anim = (sel) => {
    const g = sel.map(i => $(`.im-ln-g[data-i="${i}"]`, svgEl)).filter(Boolean);
    g.forEach((gg, k) => {
      $$('path', gg).forEach(p => { const L = p.getTotalLength(); if (!p.classList.contains('im-ln-flow')) gsap.fromTo(p, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: 0.7, delay: 0.25 + k * 0.13, ease: 'power2.inOut', clearProps: 'strokeDasharray,strokeDashoffset' }); });
      gsap.fromTo($('.im-ln-flow', gg), { opacity: 0 }, { opacity: 1, duration: 0.3, delay: 0.9 + k * 0.13 });
      const cb = $(`.im-cb[data-i="${gg.dataset.i}"]`, badges);
      if (cb) {
        gsap.fromTo(cb, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, delay: 0.75 + k * 0.13, ease: 'back.out(2.4)' });
        const m = S.map[gg.dataset.i];
        if (m && !m.manual) { const bb = $('b', cb); setTimeout(() => countUp(bb, m.conf, { suffix: '%', from: 40, duration: 0.8 }), (0.75 + k * 0.13) * 1000); }
      }
      const tf = $(`.im-tf[data-k="${S.map[gg.dataset.i]?.k}"]`, host);
      if (tf) gsap.fromTo(tf, { boxShadow: '0 0 0 0 rgba(45,182,116,0)' }, { boxShadow: '0 0 0 2px rgba(45,182,116,0.5)', duration: 0.3, delay: 0.9 + k * 0.13, yoyo: true, repeat: 1 });
    });
  };
  if (animate) {
    gsap.fromTo($$('.im-sf', host), { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: 0.4, stagger: 0.04, ease: 'power2.out' });
    gsap.fromTo($$('.im-tf', host), { opacity: 0, x: 16 }, { opacity: 1, x: 0, duration: 0.4, stagger: 0.05, ease: 'power2.out' });
    const sc = $('.im-scanl', host);
    gsap.fromTo(sc, { top: 0, opacity: 1 }, { top: '100%', duration: 1.0, ease: 'power1.inOut', onComplete: () => gsap.to(sc, { opacity: 0, duration: 0.2 }) });
    anim(list);
    countUp($('#imAvg', root), parseInt($('#imAvg', root).textContent) || 0, { suffix: '%', from: 0, duration: 1.6 });
  } else if (only != null && list.includes(String(only))) anim([String(only)]);
}

// ---------------------------------------------------------------- 問題偵測卡
function renderIssueHead() {
  const it = S.an.iss;
  const kinds = ISSUE_DEF.filter(d => it[d.k].on && it[d.k].n > 0).length;
  const fixN = ISSUE_DEF.reduce((s, d) => s + (it[d.k].on ? it[d.k].n : 0), 0);
  const man = S.an.manual.size;
  $('#imIssH', root).innerHTML = `
    <div class="im-iss-t"><b>${S.cleaned ? `${icon('check', 18)} AI 已整理完成` : `${icon('alert', 18)} AI 偵測到 ${kinds} 類問題`}</b>
      <small>${S.cleaned ? `已修正 ${n0(S.changed.size)} 個欄位${S.merged.size ? `、合併 ${S.merged.size} 位重複` : ''}；${man ? `${man} 筆看不懂的留給你確認` : '沒有需要人工確認的資料'}` : `共 ${n0(fixN)} 處可自動修正${man ? `，另有 ${man} 筆需要你確認` : ''}`}</small></div>
    <button class="btn ${S.cleaned ? 'btn-ghost' : 'btn-primary'} btn-lg im-clean" id="imCleanBtn" data-act="${S.cleaned ? 'import' : 'clean'}">${S.cleaned ? `${icon('arrow', 16)} 下一步：匯入` : `${icon('wand', 18)} AI 幫我整理`}</button>`;
  $('#imIssH', root).classList.toggle('done', S.cleaned);
}
function renderIssues() {
  if (!S.ds) { $('#imIss', root).innerHTML = ''; $('#imIssH', root).innerHTML = ''; return; }
  renderIssueHead();
  const it = S.an.iss;
  $('#imIss', root).innerHTML = ISSUE_DEF.map(d => {
    const x = it[d.k];
    const title = d.k === 'dup' ? (S.type === 'product' ? '重複商品' : '重複客人') : d.t;
    const na = !x.on ? `這份檔案沒有${d.k === 'dup' ? '姓名' : d.k === 'phone' ? '電話' : d.k === 'money' ? '金額' : '日期'}欄位` : !x.n ? '格式一致，不用整理' : '';
    return `<div class="im-is ${na ? 'na' : ''} ${S.cleaned && !na ? 'done' : ''}" data-k="${d.k}" style="--c:${d.c}">
      <div class="im-is-h"><span class="im-is-ic">${icon(d.ic, 18)}</span><div class="im-is-tt"><b>${title}</b><small>${na || esc(x.sub)}</small></div>
        <span class="im-is-n">${x.n ? n0(x.n) : icon('check', 16)}</span></div>
      ${na ? '' : `<ul class="im-ex">${x.ex.map(e => `<li class="${S.cleaned ? 'fixed' : ''}"><s>${esc(e.b)}</s><i>${icon('arrow', 12)}</i><em>${esc(e.a)}</em></li>`).join('')}</ul>
      <div class="im-is-foot"><span class="im-is-fixed">已修正 <b>${S.cleaned ? n0(x.n) : 0}</b> / ${n0(x.n)}</span><span class="im-is-st">${S.cleaned ? `${icon('check', 13)} 已整理` : '待整理'}</span></div>
      <div class="im-is-bar"><i style="transform:scaleX(${S.cleaned ? 1 : 0})"></i></div>
      ${x.bad ? `<div class="im-is-bad">${icon('alert', 12)} ${x.bad} 筆看不懂，留給你確認</div>` : ''}`}
      <span class="im-is-ok">${icon('check', 16)}</span>
    </div>`;
  }).join('');
}

// ---------------------------------------------------------------- 匯入結果
function renderResult() {
  const box = $('#imS4', root);
  const T = S.ds ? TYPES[S.type] : null;
  const r = S.result;
  let main = '';
  if (!S.ds) main = `<div class="im-empty-b">先在上面選擇來源或載入示範檔</div>`;
  else if (!r) {
    const reqMiss = T.targets.filter(t => t.req && colOf(t.k) < 0);
    main = `<div class="im-ready">
      <div class="im-ready-ic">${icon(T.icon, 30)}</div>
      <div class="im-ready-t"><b>準備匯入 ${n0(S.ds.rows.length)} 列「${T.label}」</b>
        <ul><li class="${reqMiss.length ? 'no' : 'ok'}">${icon(reqMiss.length ? 'alert' : 'check', 14)} ${reqMiss.length ? `必填欄位未對應：${reqMiss.map(t => t.label).join('、')}` : '必填欄位都對應好了'}</li>
          <li class="${S.cleaned ? 'ok' : 'wait'}">${icon(S.cleaned ? 'check' : 'wand', 14)} ${S.cleaned ? 'AI 已整理格式與重複資料' : '尚未整理（按匯入時 AI 會先自動整理）'}</li>
          <li class="ok">${icon('shield', 14)} 原始檔保留 30 天，隨時可以復原這次匯入</li></ul></div>
      <button class="btn btn-primary btn-lg" data-act="import" ${reqMiss.length ? 'disabled' : ''}>${icon('db', 18)} 開始匯入</button></div>`;
  } else {
    main = `<div class="im-res">
      <div class="im-kpi ok"><span>${icon('check', 18)}</span><small>成功匯入</small><b id="imRS">0</b><em>筆</em></div>
      <div class="im-kpi mg"><span>${icon('users', 18)}</span><small>${S.type === 'order' ? '合併重複（客人寫法統一）' : '合併重複'}</small><b id="imRM">0</b><em>${S.type === 'order' ? '筆' : '筆'}</em></div>
      <div class="im-kpi mn"><span>${icon('alert', 18)}</span><small>需人工確認</small><b id="imRN">0</b><em>筆</em></div>
      <div class="im-kpi fx"><span>${icon('wand', 18)}</span><small>AI 自動修正欄位</small><b id="imRF">0</b><em>格</em></div>
    </div>
    ${r.manual.length ? `<div class="im-man"><div class="im-man-h">${icon('alert', 15)} 需人工確認（示範：按下即可處理）</div>
      <ul>${r.manual.map(m => `<li data-r="${m.r}"><span class="im-man-no">第 ${m.r + 1} 列</span><span class="im-man-why">${esc(m.why.join('、'))}</span><span class="im-man-v">${esc(m.preview)}</span>
        <span class="im-man-b"><button class="btn btn-ghost btn-sm" data-act="mkeep">${icon('check', 13)} 補好並匯入</button><button class="btn btn-ghost btn-sm" data-act="mskip">略過</button></span></li>`).join('')}</ul></div>` : ''}
    <div class="im-done-note">${icon('alert', 14)} 示範匯入：資料不會寫入系統，重新整理頁面即恢復原狀。</div>`;
  }
  box.innerHTML = `
    <div class="card-h"><h3><i class="im-no">4</i> 匯入結果</h3>${r ? `<span class="chip-sm">${esc(S.ds.name)}・${T.label}</span>` : '<span class="chip-sm">匯入後會自動進到這些頁面</span>'}</div>
    <div class="im-resmain" id="imResMain">${main}</div>
    <div class="im-dest-h">${icon('link', 15)} 搬完之後，資料會自動出現在</div>
    <div class="im-dests">${DEST.map(d => {
      const here = S.ds && S.type === d.type, done = S.importedTypes.has(d.type);
      return `<div class="im-dest ${here ? 'here' : ''} ${done ? 'done' : ''}" style="--c:${d.c}">
        <div class="im-dest-h2"><span class="im-dest-ic">${icon(d.ic, 20)}</span><b>${d.t}</b>${done ? `<em class="ok">${icon('check', 12)} 已匯入</em>` : here ? '<em>這次會進來</em>' : ''}</div>
        <p>${d.s}</p>
        <div class="im-dest-b"><button class="btn btn-sm ${here || done ? 'btn-primary' : 'btn-ghost'}" data-act="go" data-go="${d.id}">前往 ${d.t.split('・')[0]} ${icon('arrow', 13)}</button>
          ${!here && !done ? `<button class="btn btn-ghost btn-sm" data-act="loadtype" data-t="${d.type}">載入${TYPES[d.type].label}示範</button>` : ''}</div>
      </div>`;
    }).join('')}</div>`;
}

async function doImport() {
  if (!S.ds || S.busy) return;
  const T = TYPES[S.type];
  if (T.targets.some(t => t.req && colOf(t.k) < 0)) { toast('還有必填欄位沒對應', '請先在 AI 欄位對應中指定', { kind: 'warn', icon: icon('alert', 18) }); return; }
  if (!S.cleaned) { toast('先幫你整理好再匯入', 'AI 正在統一格式、合併重複', { kind: 'info', icon: icon('wand', 18) }); await runClean(true); }
  S.busy = true;
  $('#imS4', root).scrollIntoView({ behavior: 'smooth', block: 'start' });
  const steps = S.type === 'customer' ? ['建立客戶檔', '合併重複客人', '寫入會員名單', '設定生日提醒']
    : S.type === 'product' ? ['建立商品資料', '換算售價與成本', '同步庫存', '準備 AI 上架文案']
      : ['建立歷史訂單', '客人自動建檔', '彙總月營收', '接上會計帳務'];
  const main = $('#imResMain', root);
  main.innerHTML = `<div class="im-prog"><div class="im-prog-t"><b>匯入中…</b><span id="imPP">0%</span></div><div class="im-prog-bar"><i id="imPB"></i></div>
    <ul class="im-prog-st">${steps.map(s => `<li><i class="im-spin"></i><span>${s}</span></li>`).join('')}</ul></div>`;
  const pb = $('#imPB', root), pp = $('#imPP', root);
  if (gsap) { const o = { v: 0 }; gsap.to(o, { v: 100, duration: 2.0, ease: 'power1.inOut', onUpdate: () => { pb.style.transform = `scaleX(${o.v / 100})`; pp.textContent = Math.round(o.v) + '%'; } }); }
  const lis = $$('.im-prog-st li', main);
  for (const li of lis) { li.classList.add('run'); await sleep(480); li.classList.remove('run'); li.classList.add('ok'); li.querySelector('i').outerHTML = icon('check', 14); }
  await sleep(150);
  const total = S.ds.rows.length;
  const man = [...S.an.manual.entries()].map(([r, why]) => ({ r, why, preview: S.ds.rows[r].filter(Boolean).slice(0, 3).join('・') }));
  const merged = S.type === 'order' ? S.an.iss.dup.n : S.merged.size;
  const success = total - man.length - (S.type === 'order' ? 0 : merged);
  S.result = { success, merged, manual: man, fixed: S.changed.size };
  S.importedTypes.add(S.type);
  S.busy = false;
  renderResult(); renderSteps();
  countUp($('#imRS', root), success, { from: 0 }); countUp($('#imRM', root), merged, { from: 0 });
  countUp($('#imRN', root), man.length, { from: 0 }); countUp($('#imRF', root), S.changed.size, { from: 0 });
  if (gsap) {
    gsap.fromTo($$('.im-kpi', root), { opacity: 0, y: 16, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.08, ease: 'back.out(1.6)' });
    gsap.fromTo($$('.im-dest.here', root), { boxShadow: '0 0 0 0 rgba(45,182,116,0)' }, { boxShadow: '0 0 0 3px rgba(45,182,116,0.55)', duration: 0.5, yoyo: true, repeat: 3, delay: 0.6 });
  }
  toast(`匯入完成（示範）｜${T.label}`, `成功 ${success} 筆・合併 ${merged} 筆・待確認 ${man.length} 筆`, { icon: icon('db', 18) });
  if (!S.quest.has(1)) setTimeout(() => toggleQuest(1, true), 900);
}
function manualResolve(btn, keep) {
  const li = btn.closest('li'); if (!li || !S.result) return;
  const r = +li.dataset.r;
  S.result.manual = S.result.manual.filter(m => m.r !== r);
  if (keep) { S.result.success++; countUp($('#imRS', root), S.result.success); }
  countUp($('#imRN', root), S.result.manual.length);
  const done = () => { li.remove(); if (!S.result.manual.length) { const w = $('.im-man', root); w && w.remove(); toast('都確認完了', '這次匯入沒有待處理的資料', { icon: icon('check', 18) }); } };
  if (gsap) gsap.to(li, { opacity: 0, x: keep ? 30 : -30, height: 0, paddingTop: 0, paddingBottom: 0, marginTop: 0, duration: 0.35, onComplete: done }); else done();
}

// ---------------------------------------------------------------- 步驟列
function renderSteps() {
  const st = [
    ['imS1', '選擇來源', !!S.ds], ['imS2', '預覽', !!S.ds], ['imS3', 'AI 對應與整理', S.cleaned], ['imS4', '匯入結果', !!S.result],
  ];
  const cur = st.findIndex(s => !s[2]);
  $('#imSteps', root).innerHTML = st.map(([id, t, ok], i) => `<button data-act="step" data-to="${id}" class="${ok ? 'ok' : ''} ${i === cur ? 'cur' : ''}"><i>${ok ? icon('check', 12) : i + 1}</i><span>${t}</span></button>${i < 3 ? '<b class="im-step-ln"></b>' : ''}`).join('')
    + `<button data-act="step" data-to="imS5" class="im-step-q">${icon('calendar', 14)}<span>7 天上手 ${S.quest.size}/7</span></button>`;
}

// ---------------------------------------------------------------- 新手 7 天上手
function questStats() {
  const done = S.quest.size, left = QUEST.filter(q => !S.quest.has(q.d)).reduce((s, q) => s + q.min, 0);
  const next = QUEST.find(q => !S.quest.has(q.d));
  return { done, left, next, pct: Math.round(done / 7 * 100) };
}
function renderHQ() {
  const { done, left, next, pct } = questStats();
  const C = 2 * Math.PI * 34;
  $('#imHQ', root).innerHTML = `
    <div class="im-hq-ring"><svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="34" class="bg"/><circle cx="40" cy="40" r="34" class="fg" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - pct / 100)).toFixed(1)}"/></svg><b>${done}<small>/7</small></b></div>
    <div class="im-hq-t"><small>第一次用？跟著做就上手</small><b>新手 7 天上手任務</b>
      ${next ? `<span>下一步：第 ${next.d} 天「${next.t}」・約 ${next.min} 分鐘</span>` : '<span>全部完成，你已經是 GreenUP 老手了！</span>'}
      <div class="im-hq-b">${next ? `<button class="btn btn-primary btn-sm" data-act="qgo" data-d="${next.d}">${next.btn} ${icon('arrow', 13)}</button>` : ''}<button class="btn btn-ghost btn-sm" data-act="step" data-to="imS5">看全部（剩約 ${left} 分鐘）</button></div></div>`;
}
function renderQuest() {
  const { done, left, pct } = questStats();
  const nextD = QUEST.find(q => !S.quest.has(q.d))?.d;
  $('#imS5', root).innerHTML = `
    <div class="card-h"><h3>${icon('calendar', 18)} 新手 7 天上手任務 <small class="im-h-sub">每天 3–15 分鐘，一週就會用</small></h3><span class="chip-sm">示範進度・只存在這台瀏覽器</span></div>
    <div class="im-qprog"><div class="im-qprog-t"><b id="imQPct">${pct}%</b><span>已完成 <b id="imQDone">${done}</b>/7・剩約 ${left} 分鐘</span></div><div class="im-qbar"><i style="transform:scaleX(${pct / 100})"></i>${QUEST.map((q, i) => `<em style="left:${((i + 1) / 7) * 100}%" class="${S.quest.has(q.d) ? 'on' : ''}"></em>`).join('')}</div></div>
    <div class="im-quest">${QUEST.map(q => {
      const ok = S.quest.has(q.d);
      return `<div class="im-q ${ok ? 'ok' : ''} ${q.d === nextD ? 'next' : ''}" data-d="${q.d}">
        <div class="im-q-top"><span class="im-q-day">第 ${q.d} 天</span><span class="im-q-min">${icon('clock', 12)} 約 ${q.min} 分鐘</span></div>
        <div class="im-q-mid"><span class="im-q-ic">${icon(q.ic, 20)}</span><div><b>${q.t}</b><small>${q.s}</small></div></div>
        <div class="im-q-foot"><button class="btn btn-sm ${q.d === nextD ? 'btn-primary' : 'btn-ghost'}" data-act="qgo" data-d="${q.d}">${q.btn}</button>
          <button class="im-ck ${ok ? 'on' : ''}" data-act="qtoggle" data-d="${q.d}" aria-label="標記第 ${q.d} 天完成" aria-pressed="${ok}">
            <svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="13"/><path d="M10 16.5l4 4 8-8.5"/></svg><span>${ok ? '完成' : '打勾'}</span></button></div>
      </div>`;
    }).join('')}</div>`;
}
function toggleQuest(d, auto = false) {
  const on = !S.quest.has(d);
  if (on) S.quest.add(d); else S.quest.delete(d);
  saveQuest();
  const card = $(`.im-q[data-d="${d}"]`, root);
  renderQuest(); renderHQ(); renderSteps();
  const nc = $(`.im-q[data-d="${d}"]`, root);
  if (on && gsap && nc) {
    const p = $('.im-ck path', nc), c = $('.im-ck circle', nc);
    gsap.fromTo(c, { scale: 0.4, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
    gsap.fromTo(p, { strokeDasharray: 22, strokeDashoffset: 22 }, { strokeDashoffset: 0, duration: 0.45, delay: 0.15, ease: 'power2.out' });
    gsap.fromTo(nc, { scale: 0.97 }, { scale: 1, duration: 0.5, ease: 'back.out(2)' });
    burst($('.im-ck', nc));
    toast(auto ? `第 ${d} 天任務自動完成` : `第 ${d} 天完成！`, QUEST[d - 1].t + (S.quest.size === 7 ? '・恭喜完成新手 7 天上手！' : `・已完成 ${S.quest.size}/7`), { icon: icon('check', 18) });
  }
  void card;
  const fill = $('#imHQ .fg', root);
  if (fill && gsap) gsap.from(fill, { strokeDashoffset: parseFloat(fill.getAttribute('stroke-dasharray')), duration: 0.8, ease: 'power2.out' });
}
function burst(anchor) {
  if (!anchor || !gsap) return;
  const cols = ['#2DB674', '#5EE0C4', '#F0A531', '#DD5597', '#2E97D4'];
  for (let i = 0; i < 12; i++) {
    const p = el(`<i class="im-burst" style="background:${cols[i % cols.length]}"></i>`);
    anchor.appendChild(p);
    const a = (i / 12) * Math.PI * 2, r = 26 + (i % 3) * 8;
    gsap.fromTo(p, { x: 0, y: 0, opacity: 1, scale: 1 }, { x: Math.cos(a) * r, y: Math.sin(a) * r, opacity: 0, scale: 0.4, duration: 0.7, ease: 'power2.out', onComplete: () => p.remove() });
  }
}
