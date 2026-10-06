// 部署模式：雲端訂閱／企業地端／雲地混合（GSAP 動畫架構圖）
import { store } from '../state.js';
import { $, $$, el, gsap, esc, toast, sleep } from '../util.js';
import { icon } from '../icons.js';
import { TENANT, TENANT_ID, TENANTS, CATS, tenantInfra } from '../tenant.js';

const MODES = {
  cloud: { name: '雲端訂閱', icon: 'cloud', tag: '一人公司・小微企業', desc: '註冊即用，免買主機。所有 AI 代理、資料庫與報稅模組由 GreenUP 雲端代管，自動更新與備份。',
    points: ['開通 10 分鐘即可接單', '按月訂閱、免硬體成本', '資料加密存放於台灣機房（示意）'] },
  onprem: { name: '企業地端', icon: 'server', tag: '重視資料主權的企業', desc: 'AI 模型、資料庫與所有個資都在企業自有主機內運作，可完全離線，對外只開放必要的通路介接。',
    points: ['資料不出公司', '支援本地端開源模型推論', '可整合既有 ERP／會計系統'] },
  hybrid: { name: '雲地混合', icon: 'hybrid', tag: '成長中的品牌・連鎖', desc: '對話與語音等需要彈性算力的服務放雲端；訂單、會計與客戶個資留在地端，透過加密通道同步。',
    points: ['個資與帳務留在地端', '尖峰流量由雲端彈性擴充', '雙向加密通道、權限分級'] },
};

const COMPS = [
  { id: 'agent', name: 'AI 對話代理', sub: '多語言 LLM', icon: 'bot', c: '#2DB674' },
  { id: 'voice', name: '語音辨識／合成', sub: '電話・語音點餐', icon: 'mic', c: '#F0A531' },
  { id: 'db', name: '訂單與會計資料庫', sub: '訂單・分錄・庫存', icon: 'db', c: '#2E97D4' },
  { id: 'tax', name: '電子發票與報稅', sub: '401 試算', icon: 'tax', c: '#7C62E6' },
  { id: 'pii', name: '客戶個資', sub: '加密儲存', icon: 'lock', c: '#EC6A55' },
  { id: 'admin', name: '經營分析後台', sub: '用問的・會議', icon: 'dashboard', c: '#DD5597' },
];
const CLOUD_SLOTS = [[28, 24], [48, 24], [28, 52], [48, 52], [28, 80], [48, 80]];
const PREM_SLOTS = [[70.5, 24], [89, 24], [70.5, 52], [89, 52], [70.5, 80], [89, 80]];
const PLACEMENT = {
  cloud: { agent: 'c0', voice: 'c1', db: 'c2', tax: 'c3', pii: 'c4', admin: 'c5' },
  onprem: { agent: 'p0', voice: 'p1', db: 'p2', tax: 'p3', pii: 'p4', admin: 'p5' },
  hybrid: { agent: 'c0', voice: 'c1', admin: 'c3', db: 'p2', tax: 'p3', pii: 'p4' },
};
const EDGES = [['ch0', 'agent'], ['ch1', 'agent'], ['ch2', 'voice'], ['ch3', 'agent'], ['agent', 'db'], ['voice', 'agent'], ['db', 'tax'], ['db', 'pii'], ['db', 'admin']];
const CHS = [['LINE／WhatsApp', 'chat', '#2DB674'], ['Zalo／Messenger', 'globe', '#7C62E6'], ['電話', 'phone', '#F0A531'], ['官網／POS', 'store', '#5EE0C4']];

let root, mode = 'cloud', raf = 0;

export default {
  mount(section) {
    root = section;
    mode = store.settings.deploy || 'cloud';
    section.innerHTML = `
    <div class="dep-wrap">
      <div class="dep-modes anim-in">${Object.entries(MODES).map(([k, m]) => `
        <button class="glass dep-mode" data-m="${k}"><span class="dm-ic">${icon(m.icon, 26)}</span><div><b>${m.name}</b><small>${m.tag}</small></div><span class="dm-check">${icon('check', 14)}</span></button>`).join('')}
      </div>
      <div class="glass dep-stage anim-in" id="stage">
        <div class="zone z-net"><span>${icon('globe', 14)} 客人與通路</span></div>
        <div class="zone z-cloud"><span>${icon('cloud', 14)} GreenUP 雲端</span><em class="z-empty">僅提供模型更新與備份（選配）</em></div>
        <div class="zone z-prem"><span>${icon('server', 14)} 企業地端主機</span><em class="z-empty">只需瀏覽器或手機</em></div>
        <div class="tunnel" id="tunnel">${icon('shield', 14)} 加密同步通道</div>
        <svg class="edges" id="edges"></svg>
        ${CHS.map((c, i) => `<div class="node ch" data-id="ch${i}" style="left:9.5%;top:${20 + i * 20}%;--c:${c[2]}"><span>${icon(c[1], 16)}</span><b>${c[0]}</b></div>`).join('')}
        ${COMPS.map(c => `<div class="node comp" data-id="${c.id}" style="--c:${c.c}"><span>${icon(c.icon, 20)}</span><div><b>${c.name}</b><small>${c.sub}</small></div></div>`).join('')}
      </div>
      <div class="glass dep-info anim-in" id="depInfo"></div>
    </div>
    ${tenancyHTML()}`;
    injectStyle();
    bindTenancy();
    $$('.dep-mode', section).forEach(b => b.addEventListener('click', () => setMode(b.dataset.m, true)));
    store.on('deploy', (m) => { if (m !== mode) setMode(m, false); });
  },
  show() { setMode(mode, false, true); loop(); },
  hide() { cancelAnimationFrame(raf); raf = 0; },
};

function slot(s) { return (s[0] === 'c' ? CLOUD_SLOTS : PREM_SLOTS)[+s.slice(1)]; }

function setMode(m, user, instant = false) {
  mode = m;
  if (user) store.setDeploy(m);
  $$('.dep-mode', root).forEach(b => b.classList.toggle('on', b.dataset.m === m));
  const place = PLACEMENT[m];
  COMPS.forEach((c, i) => {
    const [x, y] = slot(place[c.id]);
    const n = $(`.node[data-id="${c.id}"]`, root);
    gsap.to(n, { left: x + '%', top: y + '%', duration: instant ? 0 : 1.1, ease: 'power3.inOut', delay: instant ? 0 : i * 0.06 });
    if (!instant) gsap.fromTo(n, { scale: 1 }, { scale: 1.08, yoyo: true, repeat: 1, duration: 0.55, delay: i * 0.06 });
  });
  $('.z-cloud', root).classList.toggle('dim', m === 'onprem');
  $('.z-prem', root).classList.toggle('dim', m === 'cloud');
  $('.z-cloud .z-empty', root).style.opacity = m === 'onprem' ? 1 : 0;
  $('.z-prem .z-empty', root).style.opacity = m === 'cloud' ? 1 : 0;
  gsap.to('#tunnel', { opacity: m === 'hybrid' ? 1 : 0, scale: m === 'hybrid' ? 1 : 0.8, duration: 0.6 });
  const md = MODES[m];
  const info = $('#depInfo', root);
  info.innerHTML = `<div class="di-h"><span class="dm-ic">${icon(md.icon, 22)}</span><div><b>${md.name}</b><small>${md.tag}</small></div></div><p>${md.desc}</p>
    <ul>${md.points.map(p => `<li>${icon('check', 14)}${p}</li>`).join('')}</ul>
    <div class="di-where">${COMPS.map(c => `<div><span style="color:${c.c}">${icon(c.icon, 14)}</span>${c.name}<em class="${place[c.id][0] === 'c' ? 'w-cloud' : 'w-prem'}">${place[c.id][0] === 'c' ? '雲端' : '地端'}</em></div>`).join('')}</div>`;
  if (!instant) gsap.fromTo(info.children, { opacity: 0, y: 12 }, { opacity: 1, y: 0, stagger: 0.06, duration: 0.4 });
}

function loop() {
  cancelAnimationFrame(raf);
  const stage = $('#stage', root), svg = $('#edges', root);
  const draw = () => {
    const sr = stage.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${sr.width} ${sr.height}`);
    const center = (id) => { const r = $(`.node[data-id="${id}"]`, root).getBoundingClientRect(); return [r.left - sr.left + r.width / 2, r.top - sr.top + r.height / 2]; };
    if (svg.childElementCount !== EDGES.length) svg.innerHTML = EDGES.map(() => '<path class="edge"/>').join('');
    EDGES.forEach(([a, b], i) => {
      const [x1, y1] = center(a), [x2, y2] = center(b);
      const cross = !a.startsWith('ch') && (x1 < sr.width * 0.6) !== (x2 < sr.width * 0.6);
      const mx = (x1 + x2) / 2;
      const p = svg.children[i];
      p.setAttribute('d', `M${x1.toFixed(1)} ${y1.toFixed(1)} C ${mx.toFixed(1)} ${y1.toFixed(1)}, ${mx.toFixed(1)} ${y2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`);
      p.classList.toggle('cross', cross);
    });
    raf = requestAnimationFrame(draw);
  };
  draw();
}

/* ====================================================================
 * 多業主資料隔離 ＋ OTA 一鍵升級（純前端模擬・示範）
 * 同一套後台介面；每個業主獨立資料庫、獨立 n8n 實例，共用版本化 workflow 範本。
 * 升級狀態存 localStorage（greenup-solo: 開頭的 key 會自動依業主分開）。
 * ==================================================================== */
const OTA_KEY = 'greenup-solo:ota';
const BASE_VER = tenantInfra().workflows || 'v1.4.0';
const NEXT_VER = 'v1.5.0';
const CHANGES = [
  ['sparkle', 'AI 店員：各業態共用的回覆範本可依業主個別覆寫'],
  ['bank', '金流對帳：新增「部分退款」自動比對規則'],
  ['refresh', 'n8n workflow：訂單 → 發票 → 記帳流程失敗時自動重試 3 次'],
  ['db', '資料庫：新增業態大類索引欄位（migration 0042、0043）'],
  ['check', '修正：月結報表跨年度日期顯示'],
];
const STEPS = [
  { id: 'backup', ic: 'db', t: '自動備份資料庫', s: '每個業主的資料庫各建立升級前快照' },
  { id: 'migrate', ic: 'cpu', t: '資料庫結構遷移', s: '0042_add_cat_index・0043_recon_partial_refund' },
  { id: 'wf', ic: 'refresh', t: '更新 n8n workflow 範本', s: `範本 ${BASE_VER} → ${NEXT_VER}（12 條流程）` },
  { id: 'canary', ic: 'shield', t: '試點業主先升級＋健康檢查', s: 'API 回應、workflow 試跑、資料筆數比對' },
  { id: 'batch', ic: 'users', t: '分批升級其他業主', s: '每批 10 家，失敗即停' },
  { id: 'done', ic: 'check', t: '完成', s: '所有業主已在新版本運作' },
];
const lsGet = () => { try { return JSON.parse(localStorage.getItem(OTA_KEY) || 'null'); } catch { return null; } };
const lsSet = (v) => { try { if (v) localStorage.setItem(OTA_KEY, JSON.stringify(v)); else localStorage.removeItem(OTA_KEY); } catch { /* ignore */ } };
const OT = { ver: (lsGet() || {}).ver || BASE_VER, at: (lsGet() || {}).at || 0, busy: false, failed: null, fail: false, done: new Set(), q: '', cat: 'all', page: 0 };
const PER_PAGE = 12;
// 試點業主：目前業主＋另一個不同業態的業主（示範）
const CANARY = [TENANT_ID, (TENANTS.find(t => t.id !== TENANT_ID && t.id !== 'amei' && t.cat !== TENANT.cat) || TENANTS.find(t => t.id !== TENANT_ID) || TENANT).id].filter((v, i, a) => a.indexOf(v) === i);
const verOf = (id) => (OT.busy || OT.failed ? (OT.done.has(id) ? NEXT_VER : BASE_VER) : OT.ver);
const catName = (c) => (CATS && CATS[c]) || c || '其他';

function tenancyHTML() {
  const inf = tenantInfra();
  const catIds = Object.keys(CATS || {});
  return `
  <div class="dpx anim-in">
    <div class="glass card dpx-iso" id="dpxIso">
      <div class="card-h"><h3>${icon('db', 18)} 多業主資料隔離</h3><span class="demo-badge">${icon('alert', 13)} 示範・命名為虛構</span></div>
      <p class="dpx-lead">同一套後台介面，服務很多個一人公司；但<b>每個業主的資料完全分開</b>：各自一個資料庫、各自一個 n8n 自動化實例，只共用經過版本控管的 workflow 範本。升級範本時逐一套用到每個業主，資料不會互相流通。</p>
      <div class="dpx-flow">
        <div class="dpx-node ui"><span>${icon('dashboard', 18)}</span><b>GreenUP 後台介面</b><small>同一套程式・所有業主共用</small></div>
        <i class="dpx-arrow">${icon('arrow', 16)}</i>
        <div class="dpx-cards">
          <div class="dpx-node db"><span>${icon('db', 18)}</span><b>獨立資料庫</b><code>${esc(inf.db)}</code><small>訂單、帳務、客戶個資只在這裡</small></div>
          <div class="dpx-node n8n"><span>${icon('cpu', 18)}</span><b>獨立 n8n 實例</b><code>${esc(inf.n8n)}</code><small>自動化流程、憑證與排程各自隔離</small></div>
          <div class="dpx-node wf"><span>${icon('file', 18)}</span><b>共用 workflow 範本</b><code id="dpxCurVer">${esc(OT.ver)}</code><small>版本化範本，升級時逐業主套用</small></div>
        </div>
      </div>
      <div class="dpx-me"><span class="avatar">${esc(TENANT.avatar || TENANT.name.slice(0, 1))}</span><div><b>目前業主：${esc(TENANT.name)}</b><small>${esc(catName(TENANT.cat))}・${esc(TENANT.typeName || '')}・瀏覽器示範資料前綴 <code>${esc(inf.storagePrefix)}</code></small></div></div>
      <div class="dpx-stats" id="dpxStats">${catIds.map(c => { const n = TENANTS.filter(t => t.cat === c).length; return `<button class="dpx-stat ${n ? '' : 'zero'}" data-cat="${c}"><b>${n}</b><small>${esc(catName(c))}</small></button>`; }).join('')}</div>
      <div class="dpx-tools">
        <label class="dpx-search">${icon('ask', 15)}<input id="dpxQ" type="search" placeholder="搜尋業主、業態或資料庫名稱" autocomplete="off" aria-label="搜尋業主"></label>
        <div class="dpx-cats" id="dpxCats"><button class="seg on" data-cat="all">全部 ${TENANTS.length}</button>${catIds.filter(c => TENANTS.some(t => t.cat === c)).map(c => `<button class="seg" data-cat="${c}">${esc(catName(c))}</button>`).join('')}</div>
      </div>
      <div class="tbl-wrap dpx-tbl"><table class="tbl"><thead><tr><th>業主</th><th>業態大類</th><th>資料庫</th><th>n8n 實例</th><th>workflow 版本</th><th>狀態</th></tr></thead><tbody id="dpxRows"></tbody></table></div>
      <div class="dpx-pager" id="dpxPager"></div>
    </div>

    <div class="glass card dpx-ota" id="dpxOta">
      <div class="card-h"><h3>${icon('refresh', 18)} OTA 一鍵升級</h3><span class="demo-badge">${icon('alert', 13)} 純前端模擬・示範</span></div>
      <div class="dpx-ver">
        <div><small>目前版本</small><b id="dpxVerNow">${esc(OT.ver)}</b></div>
        <i>${icon('arrow', 18)}</i>
        <div class="next"><small>可用新版本</small><b>${NEXT_VER}</b></div>
        <span class="chip-sm" id="dpxVerChip"></span>
      </div>
      <div class="dpx-chg"><div class="dpx-sub">${icon('sparkle', 14)} ${NEXT_VER} 更新內容（虛構示範）</div><ul>${CHANGES.map(([ic, t]) => `<li>${icon(ic, 13)}<span>${esc(t)}</span></li>`).join('')}</ul></div>
      <ol class="dpx-steps" id="dpxSteps">${STEPS.map((x, i) => `<li data-s="${x.id}"><span class="dpx-si">${i + 1}</span><div><b>${x.t}</b><small>${x.s}</small><em class="dpx-sbar"><i></i></em></div><span class="dpx-st"></span></li>`).join('')}</ol>
      <div class="dpx-log mono" id="dpxLog" aria-live="polite"></div>
      <div class="dpx-actions">
        <label class="dpx-fail"><input type="checkbox" id="dpxFail"> 模擬失敗（試點健康檢查不通過）</label>
        <button class="btn btn-ghost btn-sm" id="dpxRollback" hidden>${icon('refresh', 14)} 一鍵還原</button>
        <button class="btn btn-primary" id="dpxStart">${icon('play', 15)} 開始升級</button>
      </div>
    </div>
  </div>`;
}

function bindTenancy() {
  const q = $('#dpxQ', root);
  q.addEventListener('input', () => { OT.q = q.value.trim(); OT.page = 0; renderRows(); });
  const setCat = (c) => { OT.cat = c; OT.page = 0; $$('#dpxCats .seg', root).forEach(b => b.classList.toggle('on', b.dataset.cat === c)); renderRows(); };
  $('#dpxCats', root).addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (b) setCat(b.dataset.cat); });
  $('#dpxStats', root).addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (!b || b.classList.contains('zero')) return; setCat(OT.cat === b.dataset.cat ? 'all' : b.dataset.cat); });
  $('#dpxPager', root).addEventListener('click', (e) => { const b = e.target.closest('[data-pg]'); if (!b || b.disabled) return; OT.page = +b.dataset.pg; renderRows(); });
  $('#dpxStart', root).addEventListener('click', () => (OT.ver === NEXT_VER && !OT.failed ? resetDemo() : runUpgrade()));
  $('#dpxRollback', root).addEventListener('click', rollback);
  $('#dpxFail', root).addEventListener('change', (e) => { OT.fail = e.target.checked; });
  renderRows(); renderOta();
}

function filteredTenants() {
  const k = OT.q.toLowerCase();
  return TENANTS.filter(t => (OT.cat === 'all' || t.cat === OT.cat) && (!k || [t.name, t.en, t.typeName, catName(t.cat), tenantInfra(t.id).db, t.id].some(v => String(v || '').toLowerCase().includes(k))))
    .sort((a, b) => (b.id === TENANT_ID) - (a.id === TENANT_ID));
}
function renderRows() {
  const list = filteredTenants();
  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  OT.page = Math.min(OT.page, pages - 1);
  const rows = list.slice(OT.page * PER_PAGE, (OT.page + 1) * PER_PAGE);
  $('#dpxRows', root).innerHTML = rows.length ? rows.map(t => {
    const inf = tenantInfra(t.id), v = verOf(t.id), me = t.id === TENANT_ID;
    const st = OT.failed && OT.done.has(t.id) ? ['warn', '待還原'] : OT.busy && !OT.done.has(t.id) ? ['wait', '排隊中'] : ['ok', '正常'];
    return `<tr class="${me ? 'me' : ''}" data-t="${esc(t.id)}"><td><b>${esc(t.name)}</b>${me ? ' <span class="chip-sm">目前</span>' : ''}${CANARY.includes(t.id) ? ' <span class="chip-sm dpx-canary">試點</span>' : ''}<small>${esc(t.typeName || '')}</small></td>
      <td>${esc(catName(t.cat))}</td><td><code>${esc(inf.db)}</code></td><td><code>${esc(inf.n8n)}</code></td>
      <td><span class="dpx-v ${v === NEXT_VER ? 'new' : ''}">${v}</span></td><td><span class="dpx-dot ${st[0]}"><i></i>${st[1]}</span></td></tr>`;
  }).join('') : '<tr><td colspan="6" class="dpx-none">找不到符合的業主</td></tr>';
  $('#dpxPager', root).innerHTML = `<span>共 ${list.length} 個業主${OT.cat !== 'all' ? `・${esc(catName(OT.cat))}` : ''}（示範）</span>${pages > 1 ? `<div><button class="btn btn-ghost btn-sm" data-pg="${OT.page - 1}" ${OT.page ? '' : 'disabled'}>上一頁</button><em>${OT.page + 1} / ${pages}</em><button class="btn btn-ghost btn-sm" data-pg="${OT.page + 1}" ${OT.page < pages - 1 ? '' : 'disabled'}>下一頁</button></div>` : ''}`;
}

function renderOta() {
  const up = OT.ver === NEXT_VER && !OT.failed;
  $('#dpxVerNow', root).textContent = OT.ver;
  $('#dpxCurVer', root).textContent = OT.ver;
  const chip = $('#dpxVerChip', root);
  chip.textContent = OT.failed ? '升級失敗・可一鍵還原' : up ? `已是最新版本${OT.at ? `・${new Date(OT.at).toLocaleString('zh-TW', { hour12: false })}` : ''}` : '有新版本可升級';
  chip.classList.toggle('warn', !!OT.failed || !up);
  const btn = $('#dpxStart', root);
  btn.disabled = OT.busy || !!OT.failed;
  btn.innerHTML = up ? `${icon('refresh', 15)} 回到 ${BASE_VER}（重新示範）` : `${icon('play', 15)} 開始升級`;
  btn.classList.toggle('btn-primary', !up); btn.classList.toggle('btn-ghost', up);
  $('#dpxRollback', root).hidden = !OT.failed;
  $('#dpxFail', root).disabled = OT.busy;
  $('.dpx-ver .next', root).classList.toggle('done', up);
}

function log(t, k = '') {
  const host = $('#dpxLog', root); if (!host) return;
  const d = new Date();
  const line = document.createElement('div');
  line.className = k;
  line.textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}  ${t}`;
  host.appendChild(line);
  while (host.childElementCount > 60) host.firstChild.remove();
  host.scrollTop = host.scrollHeight;
}
function stepEl(id) { return $(`#dpxSteps li[data-s="${id}"]`, root); }
function setStep(id, state, pct) {
  const li = stepEl(id); if (!li) return;
  li.classList.remove('run', 'ok', 'bad', 'undo');
  if (state) li.classList.add(state);
  $('.dpx-st', li).innerHTML = state === 'ok' ? icon('check', 14) : state === 'bad' ? icon('x', 14) : state === 'undo' ? icon('refresh', 14) : state === 'run' ? '<span class="dpx-spin"></span>' : '';
  if (pct != null) gsap.to($('.dpx-sbar i', li), { width: `${pct}%`, duration: 0.35, ease: 'power1.out' });
}
const alive = () => root && root.isConnected;

async function runUpgrade() {
  if (OT.busy) return;
  OT.busy = true; OT.failed = null; OT.done = new Set();
  $('#dpxLog', root).innerHTML = '';
  STEPS.forEach(x => setStep(x.id, null, 0));
  renderOta(); renderRows();
  const ids = TENANTS.map(t => t.id);
  log(`開始 OTA 升級 ${BASE_VER} → ${NEXT_VER}，共 ${ids.length} 個業主（示範）`);
  // 1 備份
  setStep('backup', 'run', 0);
  for (let i = 0; i < ids.length; i++) {
    if (!alive()) return;
    if (i % Math.max(1, Math.ceil(ids.length / 6)) === 0 || i === ids.length - 1) { log(`備份 ${tenantInfra(ids[i]).db} → snapshot @pre-${NEXT_VER}`); setStep('backup', 'run', (i + 1) / ids.length * 100); await sleep(140); }
  }
  setStep('backup', 'ok', 100); log(`已完成 ${ids.length} 份資料庫快照`, 'ok');
  // 2 遷移
  setStep('migrate', 'run', 0);
  for (const [k, m] of [['0042', '新增業態大類索引欄位'], ['0043', '對帳規則新增部分退款欄位']].entries()) { log(`migration ${m[0]}：${m[1]}（每個資料庫各自執行，於交易內）`); setStep('migrate', 'run', (k + 1) * 50); await sleep(420); }
  setStep('migrate', 'ok', 100); log('結構遷移完成，可隨時以快照回復', 'ok');
  // 3 workflow 範本
  setStep('wf', 'run', 0);
  for (let k = 1; k <= 4; k++) { log(['驗證範本簽章與相依節點', '比對 12 條 workflow 差異（3 條有變更）', `發布範本 ${NEXT_VER} 到範本庫`, '設定各業主 n8n 實例的升級排程'][k - 1]); setStep('wf', 'run', k * 25); await sleep(320); }
  setStep('wf', 'ok', 100);
  // 4 試點
  setStep('canary', 'run', 0);
  for (const id of CANARY) {
    const t = TENANTS.find(x => x.id === id);
    log(`試點升級：${t ? t.name : id}（${tenantInfra(id).n8n}）`);
    OT.done.add(id); renderRows(); await sleep(380);
  }
  setStep('canary', 'run', 50);
  const checks = ['API 健康檢查 200 OK', 'workflow 試跑：訂單 → 發票 → 記帳', '資料筆數與升級前一致'];
  for (let k = 0; k < checks.length; k++) {
    await sleep(360);
    if (!alive()) return;
    if (OT.fail && k === 1) {
      setStep('canary', 'bad', 100);
      log(`健康檢查失敗：${checks[k]} 逾時（模擬）`, 'bad');
      log('已自動停止，其他業主維持舊版本；請按「一鍵還原」', 'bad');
      OT.busy = false; OT.failed = 'canary';
      renderOta(); renderRows();
      toast('升級已暫停（模擬失敗）', '試點健康檢查未通過，其他業主未受影響；可一鍵還原', { kind: 'warn', icon: icon('alert', 18) });
      return;
    }
    log(`✓ ${checks[k]}`, 'ok'); setStep('canary', 'run', 50 + (k + 1) / checks.length * 50);
  }
  setStep('canary', 'ok', 100);
  // 5 分批
  setStep('batch', 'run', 0);
  const rest = ids.filter(id => !CANARY.includes(id));
  const B = 10;
  for (let i = 0; i < rest.length; i += B) {
    if (!alive()) return;
    const part = rest.slice(i, i + B);
    log(`第 ${i / B + 1} 批：升級 ${part.length} 個業主`);
    part.forEach(id => OT.done.add(id));
    renderRows();
    setStep('batch', 'run', Math.min(100, (i + part.length) / Math.max(1, rest.length) * 100));
    await sleep(420);
    log(`第 ${i / B + 1} 批健康檢查通過`, 'ok');
  }
  if (!rest.length) await sleep(200);
  setStep('batch', 'ok', 100);
  // 6 完成
  OT.busy = false; OT.ver = NEXT_VER; OT.at = Date.now();
  lsSet({ ver: OT.ver, at: OT.at });
  setStep('done', 'ok', 100);
  log(`全部完成：${ids.length} 個業主已升級到 ${NEXT_VER}`, 'ok');
  renderOta(); renderRows();
  gsap.fromTo('#dpxVerNow', { scale: 1.4, color: '#5EE0C4' }, { scale: 1, color: '#eafff4', duration: 0.8, ease: 'back.out(3)' });
  toast(`已升級到 ${NEXT_VER}（示範）`, `${ids.length} 個業主分批完成，備份快照保留 30 天`, { icon: icon('check', 18) });
  store.log && store.log('deploy', `OTA 升級 ${BASE_VER} → ${NEXT_VER} 完成（示範）`);
}

async function rollback() {
  if (OT.busy) return;
  OT.busy = true;
  renderOta();
  log('開始一鍵還原', 'bad');
  const order = ['canary', 'wf', 'migrate', 'backup'];
  const txt = { canary: `試點業主切回 ${BASE_VER}`, wf: `workflow 範本回到 ${BASE_VER}`, migrate: '以快照回復資料庫結構（0043、0042 反向）', backup: '確認快照與目前資料一致' };
  for (const id of order) {
    if (!alive()) return;
    setStep(id, 'run'); log(txt[id]); await sleep(420);
    setStep(id, 'undo', 0);
  }
  OT.done = new Set(); OT.busy = false; OT.failed = null; OT.ver = BASE_VER; OT.at = 0;
  lsSet(null);
  log(`已還原：所有業主維持 ${BASE_VER}，資料未受影響`, 'ok');
  renderOta(); renderRows();
  toast('已一鍵還原', `所有業主維持 ${BASE_VER}（示範）`, { kind: 'info', icon: icon('refresh', 18) });
}

function resetDemo() {
  OT.ver = BASE_VER; OT.at = 0; OT.failed = null; OT.done = new Set();
  lsSet(null);
  STEPS.forEach(x => setStep(x.id, null, 0));
  $('#dpxLog', root).innerHTML = '';
  log(`已回到 ${BASE_VER}，可以再示範一次升級`);
  renderOta(); renderRows();
}

function injectStyle() {
  if (document.getElementById('dpx-style')) return;
  const st = document.createElement('style');
  st.id = 'dpx-style';
  st.textContent = `
.dpx { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr); gap: 16px; margin-top: 16px; align-items: start; }
.dpx .card-h .demo-badge { font-size: 11px; }
.dpx-lead { margin: 0 0 14px; color: var(--txt2); font-size: 13.5px; line-height: 1.7; }
.dpx-lead b { color: var(--mint); font-weight: 600; }
.dpx-flow { display: grid; grid-template-columns: minmax(0, 0.9fr) auto minmax(0, 3fr); gap: 10px; align-items: center; }
.dpx-cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.dpx-node { display: flex; flex-direction: column; gap: 4px; padding: 12px; border-radius: 14px; border: 1px solid var(--line); background: rgba(255,255,255,.04); min-width: 0; }
.dpx-node > span { color: var(--mint); }
.dpx-node.ui > span { color: var(--sky); }
.dpx-node.n8n > span { color: var(--pink); }
.dpx-node.wf > span { color: var(--amber); }
.dpx-node b { font-size: 13.5px; }
.dpx-node small { color: var(--txt3); font-size: 11.5px; line-height: 1.5; }
.dpx-node code, .dpx code { font-family: var(--mono); font-size: 11.5px; color: #bff5e6; word-break: break-all; }
.dpx-arrow { color: var(--txt3); font-style: normal; display: grid; place-items: center; }
.dpx-me { display: flex; align-items: center; gap: 10px; margin: 12px 0; padding: 10px 12px; border-radius: 12px; background: rgba(94,224,196,.07); border: 1px solid rgba(94,224,196,.25); }
.dpx-me .avatar { width: 32px; height: 32px; flex: none; display: grid; place-items: center; border-radius: 50%; background: var(--leaf); color: #04130d; font-weight: 800; }
.dpx-me b { display: block; font-size: 13.5px; }
.dpx-me small { color: var(--txt2); font-size: 12px; }
.dpx-stats { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 8px; margin-bottom: 12px; }
.dpx-stat { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px; border-radius: 12px; border: 1px solid var(--line); background: rgba(255,255,255,.035); color: var(--txt); }
.dpx-stat b { font-size: 18px; }
.dpx-stat small { font-size: 11px; color: var(--txt3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
.dpx-stat.zero { opacity: .45; cursor: default; }
.dpx-tools { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 10px; }
.dpx-search { display: flex; align-items: center; gap: 8px; flex: 1 1 220px; padding: 7px 12px; border-radius: 10px; border: 1px solid var(--line); background: rgba(255,255,255,.04); color: var(--txt3); }
.dpx-search input { flex: 1; min-width: 0; background: none; border: 0; outline: 0; color: var(--txt); font-size: 13px; }
.dpx-cats { display: flex; flex-wrap: wrap; gap: 6px; }
.dpx-cats .seg { flex: none; padding: 5px 10px; font-size: 12px; white-space: nowrap; }
.dpx-tbl { max-height: 420px; border: 1px solid var(--line); border-radius: 12px; }
.dpx-tbl td { padding: 8px 10px; border-bottom: 1px solid var(--line); vertical-align: middle; }
.dpx-tbl td small { display: block; color: var(--txt3); font-size: 11px; }
.dpx-tbl tr.me td { background: rgba(94,224,196,.07); }
.dpx-tbl .chip-sm { font-size: 10.5px; padding: 1px 7px; }
.dpx-canary { color: #ffd79a; border-color: rgba(240,165,49,.45); }
.dpx-v { font-family: var(--mono); font-size: 12px; padding: 2px 8px; border-radius: 999px; background: rgba(255,255,255,.06); }
.dpx-v.new { background: rgba(45,182,116,.2); color: #bff5d9; }
.dpx-dot { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--txt2); white-space: nowrap; }
.dpx-dot i { width: 8px; height: 8px; border-radius: 50%; background: var(--leaf); box-shadow: 0 0 8px var(--leaf); }
.dpx-dot.wait i { background: var(--txt3); box-shadow: none; }
.dpx-dot.warn i { background: var(--amber); box-shadow: 0 0 8px var(--amber); }
.dpx-none { text-align: center; color: var(--txt3); padding: 18px !important; }
.dpx-pager { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: 10px; font-size: 12px; color: var(--txt3); flex-wrap: wrap; }
.dpx-pager > div { display: flex; align-items: center; gap: 8px; }
.dpx-pager em { font-style: normal; color: var(--txt2); }
.dpx-ver { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding: 12px 14px; border-radius: 14px; background: rgba(255,255,255,.04); border: 1px solid var(--line); }
.dpx-ver small { display: block; font-size: 11.5px; color: var(--txt3); }
.dpx-ver b { font-family: var(--mono); font-size: 22px; display: inline-block; }
.dpx-ver > i { color: var(--txt3); display: grid; }
.dpx-ver .next b { color: var(--mint); }
.dpx-ver .next.done { opacity: .5; }
.dpx-ver .chip-sm { margin-left: auto; }
.dpx-sub { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--txt2); font-weight: 600; margin: 12px 0 6px; }
.dpx-chg ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 5px; }
.dpx-chg li { display: flex; gap: 8px; align-items: flex-start; font-size: 12.5px; color: var(--txt2); line-height: 1.5; }
.dpx-chg li .ic { color: var(--mint); flex: none; margin-top: 2px; }
.dpx-steps { list-style: none; margin: 14px 0 0; padding: 0; display: grid; gap: 8px; }
.dpx-steps li { display: flex; gap: 10px; align-items: center; padding: 8px 10px; border-radius: 12px; border: 1px solid var(--line); background: rgba(255,255,255,.03); transition: border-color .3s, background .3s; }
.dpx-steps li > div { flex: 1; min-width: 0; }
.dpx-steps b { display: block; font-size: 13px; }
.dpx-steps small { display: block; font-size: 11.5px; color: var(--txt3); }
.dpx-si { width: 24px; height: 24px; flex: none; display: grid; place-items: center; border-radius: 50%; font-size: 12px; font-weight: 700; background: rgba(255,255,255,.07); color: var(--txt2); }
.dpx-sbar { display: block; height: 3px; margin-top: 6px; border-radius: 3px; background: rgba(255,255,255,.06); overflow: hidden; }
.dpx-sbar i { display: block; height: 100%; width: 0; background: linear-gradient(90deg, var(--leaf), var(--mint)); }
.dpx-st { width: 22px; flex: none; display: grid; place-items: center; }
.dpx-steps li.run { border-color: rgba(94,224,196,.45); background: rgba(94,224,196,.06); }
.dpx-steps li.ok .dpx-si { background: var(--leaf); color: #04130d; }
.dpx-steps li.ok .dpx-st { color: var(--leaf); }
.dpx-steps li.bad { border-color: rgba(236,106,85,.55); background: rgba(236,106,85,.08); }
.dpx-steps li.bad .dpx-st, .dpx-steps li.bad .dpx-si { color: var(--coral); }
.dpx-steps li.undo .dpx-st { color: var(--amber); }
.dpx-spin { width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(94,224,196,.25); border-top-color: var(--mint); animation: dpxSpin .8s linear infinite; }
@keyframes dpxSpin { to { transform: rotate(360deg); } }
.dpx-log { margin-top: 12px; height: 128px; overflow: auto; padding: 8px 10px; border-radius: 10px; background: rgba(0,0,0,.28); border: 1px solid var(--line); font-size: 11.5px; line-height: 1.6; color: var(--txt2); scrollbar-width: thin; }
.dpx-log:empty::before { content: '升級紀錄會顯示在這裡'; color: var(--txt3); }
.dpx-log .ok { color: #9ff0c8; }
.dpx-log .bad { color: #ffb4a6; }
.dpx-actions { display: flex; align-items: center; gap: 10px; margin-top: 12px; flex-wrap: wrap; }
.dpx-actions .btn-primary, .dpx-actions #dpxStart { margin-left: auto; }
.dpx-fail { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--txt3); cursor: pointer; }
@media (max-width: 1280px) { .dpx { grid-template-columns: 1fr; } }
@media (max-width: 860px) {
  .dpx-flow { grid-template-columns: 1fr; }
  .dpx-arrow { transform: rotate(90deg); }
  .dpx-cards { grid-template-columns: 1fr; }
  .dpx-stats { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .dpx-tbl table { min-width: 640px; }
  .dpx-ver .chip-sm { margin-left: 0; }
}`;
  document.head.appendChild(st);
}
