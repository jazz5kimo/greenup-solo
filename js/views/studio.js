// 網站設計工作室：選業主（50 種業態）、選風格（自動／手動、節慶排程、夜間）、產品顯示管理、AI 依 logo 色票產生風格；右側 iframe 即時預覽
// 業主切換＝setTenant（重新載入，各業主資料隔離）；風格與產品設定寫入 shop-config（依業主分開），預覽 iframe 透過 BroadcastChannel 即時更新
import { TENANT, TENANT_ID, TENANTS, setTenant } from '../tenant.js';
import { PRODUCTS, PRODUCT_MAP } from '../data.js';
import { getShopConfig, setShopConfig, onShopConfig } from '../shop-config.js';
import { THEMES, THEME_MAP, CORE_THEMES, FESTIVAL_THEMES, DEFAULT_SCHEDULE, DEFAULT_NIGHT, resolveTheme, themeName, themeThumb, customTheme, paletteToVars, contrast, styleOf, STYLE_AXES } from '../shop/themes.js';
import { merchantLogo, mix } from '../merchant-art.js';
import { CATS } from '../biz/index.js';
import { productArt } from '../art.js';
import { $, $$, el, gsap, esc, money, toast, fmtTime } from '../util.js';
import { icon } from '../icons.js';

let root, cfg, tab = 'merchant', device = 'desktop', merQ = '', merCat = 'all', showAllThemes = false, palette = null, paletteSrc = '';
const AXIS_ZH = { font: '字體', radius: '圓角', hero: '主視覺', grid: '商品排列', button: '按鈕', texture: '底紋' };
const VAL_ZH = { sans: '黑體', serif: '明體', round: '圓體', mono: '等寬', hand: '手寫', condensed: '窄體', sharp: '直角', soft: '微圓', pill: '膠囊', split: '左右分欄', center: '置中', banner: '橫幅', minimal: '極簡', poster: '海報', cards: '卡片', list: '清單', magazine: '雜誌', tiles: '磁磚', solid: '實心', outline: '線框', block: '方塊', none: '無', paper: '紙紋', grain: '顆粒', dots: '圓點', lines: '橫線', grid: '方格' };
const LAYOUT_ZH = { classic: '通用卡片（依設計軸）', editorial: '雜誌感', atelier: '質感留白', soft: '柔和花藝', booking: '預約導向', menu: '菜單＋外帶' };
const REASON_ZH = { festival: '節慶期間', night: '夜間時段', default: '業主預設風格', manual: '手動指定' };

const shopUrl = () => `shop.html?preview=1&tenant=${TENANT_ID}`;
const curRes = () => resolveTheme(cfg, TENANT);
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function save(patch, msg) {
  cfg = setShopConfig(patch);
  pulse();
  if (msg) toast(msg, '銷售網頁已即時更新（示範）', { icon: icon('wand', 18) });
}
function pulse() {
  const s = $('.st-sync', root); if (!s) return;
  s.innerHTML = `<i></i>已同步 ${fmtTime(new Date())}:${String(new Date().getSeconds()).padStart(2, '0')}`;
  gsap.fromTo(s, { scale: 1.08 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' });
}

export default {
  mount(section) {
    root = section;
    cfg = getShopConfig();
    const st = styleOf(TENANT);
    section.innerHTML = `<div class="st">
      <div class="glass st-head anim-in">
        <div class="st-head-l">
          <div class="st-badges"><span class="demo-badge">${icon('alert', 13)} 示範資料・業主皆為虛構</span><span class="chip-sm">${icon('sparkle', 12)} 同一套後台・${TENANTS.length} 種業態各有前台</span></div>
          <h2>網站設計工作室</h2>
          <p>挑業主、換風格、排節慶、管商品，右邊即時預覽客人看到的銷售網頁。切換業主會載入該業主自己的商品與訂單；風格與商品顯示設定只影響這家店的前台。</p>
        </div>
        <div class="st-cur">
          <span class="st-cur-logo">${merchantLogo(TENANT, 52)}</span>
          <div><b>${esc(TENANT.name)}</b><small>${esc(TENANT.typeName || '')}・${esc(CATS[TENANT.cat] || '')}・負責人 ${esc(TENANT.owner || '')}</small>
            <div class="st-axes">${TENANT.layout && TENANT.layout !== 'classic' ? `<span class="chip-sm">版面：${LAYOUT_ZH[TENANT.layout]}</span>` : ''}${Object.keys(STYLE_AXES).filter(k => st[k]).map(k => `<span class="chip-sm">${AXIS_ZH[k]}：${VAL_ZH[st[k]] || st[k]}</span>`).join('')}</div></div>
          <a class="btn btn-ghost btn-sm" href="shop.html?tenant=${TENANT_ID}" target="greenup-shop">${icon('external', 14)} 開啟銷售網頁</a>
        </div>
      </div>
      <div class="st-main">
        <div class="st-left">
          <div class="st-tabs glass anim-in">${[['merchant', '業主', 'store'], ['theme', '風格與排程', 'wand'], ['products', '商品顯示', 'box'], ['ai', 'AI 配色', 'sparkle']].map(([id, n, ic]) => `<button data-tab="${id}" class="${tab === id ? 'on' : ''}">${icon(ic, 16)}<span>${n}</span></button>`).join('')}</div>
          <div class="st-panel glass anim-in" id="stPanel"></div>
        </div>
        <div class="st-right">
          <div class="glass st-prev anim-in">
            <div class="st-prev-h"><b>${icon('play', 15)} 即時預覽</b><span class="st-sync"><i></i>等待變更</span>
              <div class="st-dev">${[['desktop', '桌機'], ['mobile', '手機']].map(([d, n]) => `<button data-dev="${d}" class="${device === d ? 'on' : ''}">${n}</button>`).join('')}</div>
              <button class="icon-btn st-reload" title="重新整理預覽">${icon('refresh', 15)}</button></div>
            <div class="st-frame-wrap" id="stWrap"><div class="st-frame" id="stFrame"><iframe title="銷售網頁預覽" src="${shopUrl()}" loading="lazy"></iframe></div></div>
            <div class="st-prev-f"><span id="stNow"></span><a href="shop.html?tenant=${TENANT_ID}" target="greenup-shop">新分頁開啟 ↗</a></div>
          </div>
        </div>
      </div>
    </div>`;
    $$('[data-tab]', section).forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; $$('[data-tab]', section).forEach(x => x.classList.toggle('on', x === b)); renderPanel(true); }));
    $$('[data-dev]', section).forEach(b => b.addEventListener('click', () => { device = b.dataset.dev; $$('[data-dev]', section).forEach(x => x.classList.toggle('on', x === b)); fitFrame(); }));
    $('.st-reload', section).addEventListener('click', () => { const f = $('iframe', section); f.src = shopUrl(); });
    new ResizeObserver(fitFrame).observe($('#stWrap', section));
    onShopConfig((c) => { cfg = c; renderNow(); if (tab !== 'products' && tab !== 'ai') renderPanel(false); });
    renderPanel(false); renderNow(); fitFrame();
  },
  show() { cfg = getShopConfig(); renderPanel(false); renderNow(); fitFrame(); },
};

function renderNow() {
  const r = curRes(); const n = $('#stNow', root); if (!n) return;
  n.innerHTML = `${icon('clock', 13)} 前台目前風格：<b>${esc(r.theme.id === 'custom' ? 'AI 自訂' : themeName(r.theme))}</b>${r.auto ? '（自動）' : ''}・${REASON_ZH[r.reason]}${cfg.simNow ? '・模擬時間' : ''}`;
}

// 預覽 iframe：桌機以 1280×800 縮放、手機 390×780
function fitFrame() {
  const wrap = $('#stWrap', root), fr = $('#stFrame', root); if (!wrap || !fr) return;
  const W = device === 'desktop' ? 1280 : 390, H = device === 'desktop' ? 800 : 780;
  const avail = wrap.clientWidth - 2;
  const maxH = device === 'desktop' ? 99999 : Math.min(640, window.innerHeight - 200);
  const s = Math.min(1, avail / W, maxH / H);
  fr.style.width = W + 'px'; fr.style.height = H + 'px'; fr.style.transform = `scale(${s})`;
  wrap.style.height = Math.round(H * s) + 'px';
  fr.classList.toggle('phone', device === 'mobile');
  fr.style.left = device === 'mobile' ? `${Math.max(0, (avail - W * s) / 2)}px` : '0px';
}

function renderPanel(animate) {
  const p = $('#stPanel', root); if (!p) return;
  if (tab === 'merchant') renderMerchants(p);
  if (tab === 'theme') renderThemes(p);
  if (tab === 'products') renderProducts(p);
  if (tab === 'ai') renderAI(p);
  if (animate) gsap.fromTo(p.children, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35, stagger: 0.03 });
}

// ---------------- 業主 ----------------
function renderMerchants(p) {
  const cats = Object.keys(CATS);
  p.innerHTML = `<div class="st-sec-h"><h3>${icon('store', 16)} 選擇業主（${TENANTS.length} 種業態）</h3><small>每家都有自己的前台設計；後台是同一套</small></div>
    <div class="st-filter"><label class="st-q">${icon('ask', 14)}<input id="stQ" type="search" placeholder="搜尋店名、業態…" value="${esc(merQ)}"></label>
      <div class="st-cats"><button data-cat="all" class="${merCat === 'all' ? 'on' : ''}">全部 ${TENANTS.length}</button>${cats.map(c => { const n = TENANTS.filter(m => (m.cat || 'retail') === c).length; return n ? `<button data-cat="${c}" class="${merCat === c ? 'on' : ''}">${CATS[c]} ${n}</button>` : ''; }).join('')}</div></div>
    <div class="st-mers" id="stMers"></div>`;
  const list = () => {
    const q = merQ.trim().toLowerCase();
    const ms = TENANTS.filter(m => (merCat === 'all' || (m.cat || 'retail') === merCat) && (!q || [m.name, m.en, m.typeName, m.id, CATS[m.cat], m.tagline].some(x => x && String(x).toLowerCase().includes(q))));
    $('#stMers', p).innerHTML = ms.length ? ms.map(m => { const th = THEME_MAP[m.theme] || THEME_MAP.cream; return `<button class="st-mer ${m.id === TENANT_ID ? 'on' : ''}" data-m="${m.id}">
      <span class="st-mer-sw" style="background:linear-gradient(135deg, ${th.vars.cream} 0 45%, ${th.vars.gl} 45% 72%, ${th.vars.deep} 72%)"></span>
      <span class="st-mer-top">${merchantLogo(m, 38)}<span><b>${esc(m.name)}</b><small>${esc(m.typeName || '')}・${esc(CATS[m.cat] || '')}</small></span></span>
      <em>${esc(m.tagline || '')}</em>
      <span class="st-mer-f"><span>${(m.products || PRODUCTS).length} 項商品</span><span>${esc(themeName(th))}</span>${m.id === TENANT_ID ? '<i>目前</i>' : ''}</span></button>`; }).join('') : '<p class="st-empty">找不到符合的業主</p>';
    $$('[data-m]', p).forEach(b => b.addEventListener('click', () => {
      if (b.dataset.m === TENANT_ID) { toast('已是目前業主', TENANT.name); return; }
      const m = TENANTS.find(x => x.id === b.dataset.m);
      toast(`切換到「${m.name}」`, '載入該業主的獨立資料與前台…', { icon: icon('store', 18) });
      gsap.to(root, { opacity: 0.35, duration: 0.35, onComplete: () => setTenant(m.id) });
    }));
  };
  list();
  $('#stQ', p).addEventListener('input', (e) => { merQ = e.target.value; list(); });
  $$('[data-cat]', p).forEach(b => b.addEventListener('click', () => { merCat = b.dataset.cat; $$('[data-cat]', p).forEach(x => x.classList.toggle('on', x === b)); list(); }));
}

// ---------------- 風格與排程 ----------------
function themeCard(t, sel, live) {
  return `<button class="st-th ${sel ? 'on' : ''} ${live ? 'live' : ''}" data-t="${t.id}">${themeThumb(t, { merchant: TENANT })}<span><b>${esc(t.id === 'custom' ? 'AI 自訂風格' : themeName(t))}</b><small>${t.kind === 'festival' ? '節慶' : t.dark ? '深色' : t.biz ? '業態風格' : t.id === 'custom' ? '依 logo 色票' : '基本'}${t.id === TENANT.theme ? '・本店預設' : ''}</small></span>${live ? '<i>前台套用中</i>' : ''}</button>`;
}
function renderThemes(p) {
  const r = curRes(), sel = cfg.theme || 'auto', isAuto = sel === 'auto';
  const sched = Array.isArray(cfg.schedule) ? cfg.schedule : DEFAULT_SCHEDULE;
  const night = Object.assign({}, DEFAULT_NIGHT, cfg.night);
  const own = THEME_MAP[TENANT.theme];
  const custom = cfg.custom ? customTheme(cfg.custom) : null;
  const main = [...(own ? [own] : []), ...CORE_THEMES.filter(t => t !== own), ...(custom ? [custom] : [])];
  const others = THEMES.filter(t => t.kind === 'base' && !main.includes(t));
  const today = ymd(r.reason === 'festival' || cfg.simNow ? new Date(cfg.simNow || Date.now()) : new Date());
  p.innerHTML = `<div class="st-sec-h"><h3>${icon('wand', 16)} 風格模式</h3><small>自動：節慶 ＞ 夜間 ＞ 業主預設</small></div>
    <div class="st-mode"><button data-mode="auto" class="${isAuto ? 'on' : ''}"><b>自動換風格</b><small>依日期與時間自動切換</small></button><button data-mode="manual" class="${!isAuto ? 'on' : ''}"><b>手動指定</b><small>固定使用選定的風格</small></button></div>
    <div class="st-res"><span class="st-res-sw" style="background:linear-gradient(135deg, ${r.theme.vars.cream} 0 40%, ${r.theme.vars.gl} 40% 70%, ${r.theme.vars.deep} 70%)"></span><div><b>前台目前：${esc(r.theme.id === 'custom' ? 'AI 自訂風格' : themeName(r.theme))}${r.auto ? '（自動）' : ''}</b><small>${REASON_ZH[r.reason]}${r.row ? `：${r.row.from} ～ ${r.row.to}${r.row.note ? `（${esc(r.row.note)}）` : ''}` : ''}</small></div></div>
    <div class="st-sec-h"><h3>${icon('sparkle', 16)} 風格庫</h3><small>點選即手動套用；版面設計軸（字體、版型…）維持本店設定，只換配色</small></div>
    <div class="st-ths">${main.map(t => themeCard(t, !isAuto && sel === t.id, r.theme.id === t.id)).join('')}</div>
    <h4 class="st-sub">節慶風格</h4>
    <div class="st-ths">${FESTIVAL_THEMES.map(t => themeCard(t, !isAuto && sel === t.id, r.theme.id === t.id)).join('')}</div>
    ${others.length ? `<button class="st-more" id="stMore">${showAllThemes ? '收合' : `顯示其他 ${others.length} 種業態風格`} ${showAllThemes ? '▴' : '▾'}</button>${showAllThemes ? `<div class="st-ths">${others.map(t => themeCard(t, !isAuto && sel === t.id, r.theme.id === t.id)).join('')}</div>` : ''}` : ''}
    <div class="st-sec-h"><h3>${icon('calendar', 16)} 節慶排程</h3><small>2026–2027 示範日期，可直接修改；自動模式下依此切換</small></div>
    <div class="tbl-wrap"><table class="tbl st-sched"><thead><tr><th>啟用</th><th>風格</th><th>開始</th><th>結束</th><th>備註</th><th></th></tr></thead><tbody>
      ${sched.map((row, i) => `<tr class="${today >= row.from && today <= row.to && row.on !== false ? 'now' : ''}"><td><input type="checkbox" data-i="${i}" data-k="on" ${row.on !== false ? 'checked' : ''}></td>
        <td><select data-i="${i}" data-k="theme">${FESTIVAL_THEMES.concat(CORE_THEMES).map(t => `<option value="${t.id}" ${t.id === row.theme ? 'selected' : ''}>${esc(themeName(t))}</option>`).join('')}</select></td>
        <td><input type="date" data-i="${i}" data-k="from" value="${row.from}"></td><td><input type="date" data-i="${i}" data-k="to" value="${row.to}"></td>
        <td><input data-i="${i}" data-k="note" value="${esc(row.note || '')}" placeholder="備註"></td><td><button class="icon-btn" data-del="${i}" title="刪除">${icon('x', 14)}</button></td></tr>`).join('')}
    </tbody></table></div>
    <div class="st-row"><button class="btn btn-ghost btn-sm" id="stAdd">${icon('plus', 14)} 新增節慶</button><button class="btn btn-ghost btn-sm" id="stReset">${icon('refresh', 14)} 恢復預設日期</button></div>
    <div class="st-sec-h"><h3>${icon('clock', 16)} 夜間模式與模擬時間</h3><small>自動模式下，非節慶期間的夜間時段改用深色風格</small></div>
    <div class="st-night"><label class="st-chk"><input type="checkbox" id="stNightOn" ${night.on ? 'checked' : ''}> 晚上自動切換夜間模式</label>
      <label>從 <select id="stNf">${Array.from({ length: 24 }, (_, h) => `<option ${h === night.from ? 'selected' : ''}>${h}</option>`).join('')}</select>:00</label>
      <label>到 <select id="stNt">${Array.from({ length: 24 }, (_, h) => `<option ${h === night.to ? 'selected' : ''}>${h}</option>`).join('')}</select>:00</label></div>
    <div class="st-sim"><label>模擬日期時間（示範用）<input type="datetime-local" id="stSim" value="${cfg.simNow ? cfg.simNow.slice(0, 16) : ''}"></label>
      <div class="st-sim-q">${[['2026-12-20T14:00', '聖誕 12/20'], ['2027-02-06T11:00', '春節 2/6'], ['2027-07-15T15:00', '夏日 7/15'], [`${ymd(new Date())}T21:30`, '今晚 21:30'], ['2026-11-10T10:00', '平日白天']].map(([v, n]) => `<button class="chip-sm" data-sim="${v}">${n}</button>`).join('')}<button class="chip-sm warn" data-sim="">用現在時間</button></div></div>`;
  $$('[data-mode]', p).forEach(b => b.addEventListener('click', () => save({ theme: b.dataset.mode === 'auto' ? 'auto' : (r.theme.id || TENANT.theme) }, b.dataset.mode === 'auto' ? '已切換為自動換風格' : `已固定為「${themeName(r.theme)}」`)));
  $$('[data-t]', p).forEach(b => b.addEventListener('click', () => { const t = b.dataset.t; save({ theme: t }, `套用風格：${t === 'custom' ? 'AI 自訂風格' : themeName(THEME_MAP[t])}`); }));
  const more = $('#stMore', p); if (more) more.addEventListener('click', () => { showAllThemes = !showAllThemes; renderThemes(p); });
  const editRow = (i, k, v) => { const s = (Array.isArray(cfg.schedule) ? cfg.schedule : DEFAULT_SCHEDULE).map(x => ({ ...x })); s[i][k] = v; if (s[i].from > s[i].to) { toast('結束日期早於開始日期', '請確認日期區間', { kind: 'warn', icon: icon('alert', 18) }); return; } save({ schedule: s }); };
  $$('.st-sched [data-k]', p).forEach(inp => inp.addEventListener('change', () => editRow(+inp.dataset.i, inp.dataset.k, inp.type === 'checkbox' ? inp.checked : inp.value)));
  $$('[data-del]', p).forEach(b => b.addEventListener('click', () => { const s = sched.filter((_, i) => i !== +b.dataset.del); save({ schedule: s }, '已刪除節慶'); }));
  $('#stAdd', p).addEventListener('click', () => { const d = new Date(); const e = new Date(Date.now() + 7 * 864e5); save({ schedule: [...sched, { theme: 'summer', from: ymd(d), to: ymd(e), note: '自訂檔期' }] }, '已新增節慶（今天起 7 天）'); });
  $('#stReset', p).addEventListener('click', () => save({ schedule: null }, '已恢復預設節慶日期'));
  const nightSave = () => save({ night: { on: $('#stNightOn', p).checked, from: +$('#stNf', p).value, to: +$('#stNt', p).value } }, '夜間模式設定已更新');
  ['#stNightOn', '#stNf', '#stNt'].forEach(s => $(s, p).addEventListener('change', nightSave));
  $('#stSim', p).addEventListener('change', (e) => save({ simNow: e.target.value || null }, e.target.value ? `模擬時間：${e.target.value.replace('T', ' ')}` : '已恢復現在時間'));
  $$('[data-sim]', p).forEach(b => b.addEventListener('click', () => save({ simNow: b.dataset.sim || null, ...(b.dataset.sim && cfg.theme !== 'auto' ? { theme: 'auto' } : {}) }, b.dataset.sim ? `模擬時間：${b.dataset.sim.replace('T', ' ')}（自動模式）` : '已恢復現在時間')));
}

// ---------------- 商品顯示 ----------------
function productOrder() {
  const all = PRODUCTS.map(p => p.id);
  const ord = Array.isArray(cfg.order) ? cfg.order.filter(id => PRODUCT_MAP[id]) : [];
  const shown = Array.isArray(cfg.products) ? cfg.products.filter(id => PRODUCT_MAP[id]) : [];
  const base = ord.length ? ord : shown.length ? [...shown, ...all.filter(id => !shown.includes(id))] : all;
  return [...base, ...all.filter(id => !base.includes(id))];
}
function shownSet() { const s = Array.isArray(cfg.products) && cfg.products.length ? cfg.products : PRODUCTS.map(p => p.id); return new Set(s.filter(id => PRODUCT_MAP[id])); }
function saveProducts(order, shown, featured, msg) {
  const products = order.filter(id => shown.has(id));
  const all = products.length === PRODUCTS.length && products.every((id, i) => id === PRODUCTS[i].id);
  save({ order, products: all ? null : products, featured: featured && shown.has(featured) ? featured : null }, msg);
}
function renderProducts(p) {
  const order = productOrder(), shown = shownSet(), feat = cfg.featured;
  p.innerHTML = `<div class="st-sec-h"><h3>${icon('box', 16)} 商品顯示與排序</h3><small>勾選要在前台顯示的商品；拖拉或用上下鍵排序；★ 設定主打（排第一並加上標籤）</small></div>
    <div class="st-row"><span class="chip-sm">顯示 ${order.filter(id => shown.has(id)).length} / ${order.length} 項</span><button class="btn btn-ghost btn-sm" id="stAll">全部顯示</button><button class="btn btn-ghost btn-sm" id="stDef">恢復預設排序</button></div>
    <ol class="st-plist" id="stPlist">${order.map((id, i) => { const pr = PRODUCT_MAP[id]; return `<li class="st-p ${shown.has(id) ? '' : 'off'} ${feat === id ? 'feat' : ''}" draggable="true" data-id="${id}">
      <span class="st-grip" title="拖拉排序">⋮⋮</span><input type="checkbox" ${shown.has(id) ? 'checked' : ''} aria-label="顯示">
      <span class="st-p-art">${productArt(id, 46)}</span>
      <span class="st-p-n"><b>${esc(pr.name)}</b><small>${esc(pr.unit || '')}・庫存 ${pr.stock}</small></span>
      <b class="st-p-price">${pr.listPrice && pr.listPrice > pr.price ? `<s>${money(pr.listPrice)}</s>` : ''}${money(pr.price)}</b>
      <button class="st-star ${feat === id ? 'on' : ''}" title="設為主打">★</button>
      <span class="st-ud"><button data-mv="-1" ${i === 0 ? 'disabled' : ''} title="上移">▲</button><button data-mv="1" ${i === order.length - 1 ? 'disabled' : ''} title="下移">▼</button></span></li>`; }).join('')}</ol>`;
  const list = $('#stPlist', p);
  const cur = () => $$('.st-p', list).map(li => li.dataset.id);
  $$('.st-p', list).forEach(li => {
    const id = li.dataset.id;
    $('input', li).addEventListener('change', (e) => { const s = shownSet(); if (e.target.checked) s.add(id); else s.delete(id); if (!s.size) { e.target.checked = true; toast('至少要顯示一項商品', '', { kind: 'warn', icon: icon('alert', 18) }); return; } saveProducts(cur(), s, cfg.featured, `${e.target.checked ? '顯示' : '隱藏'}：${PRODUCT_MAP[id].name}`); renderProducts(p); });
    $('.st-star', li).addEventListener('click', () => { const s = shownSet(); s.add(id); saveProducts(cur(), s, cfg.featured === id ? null : id, cfg.featured === id ? '已取消主打' : `主打商品：${PRODUCT_MAP[id].name}`); renderProducts(p); });
    $$('[data-mv]', li).forEach(b => b.addEventListener('click', () => { const o = cur(); const i = o.indexOf(id), j = i + +b.dataset.mv; [o[i], o[j]] = [o[j], o[i]]; saveProducts(o, shownSet(), cfg.featured); renderProducts(p); gsap.fromTo($(`[data-id="${id}"]`, p), { backgroundColor: 'rgba(45,182,116,0.25)' }, { backgroundColor: 'rgba(45,182,116,0)', duration: 0.8 }); }));
    li.addEventListener('dragstart', (e) => { li.classList.add('drag'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', id); } catch { /* ignore */ } });
    li.addEventListener('dragend', () => { li.classList.remove('drag'); saveProducts(cur(), shownSet(), cfg.featured, '已更新商品排序'); renderProducts(p); });
  });
  list.addEventListener('dragover', (e) => {
    e.preventDefault(); const drag = $('.st-p.drag', list); if (!drag) return;
    const after = $$('.st-p:not(.drag)', list).find(li => { const r = li.getBoundingClientRect(); return e.clientY < r.top + r.height / 2; });
    if (after) list.insertBefore(drag, after); else list.appendChild(drag);
  });
  $('#stAll', p).addEventListener('click', () => { saveProducts(cur(), new Set(PRODUCTS.map(x => x.id)), cfg.featured, '全部商品已顯示'); renderProducts(p); });
  $('#stDef', p).addEventListener('click', () => { save({ order: null, products: null, featured: null }, '已恢復預設排序與顯示'); renderProducts(p); });
}

// ---------------- AI 依 logo 色票產生風格 ----------------
function extractPalette(img) {
  const c = document.createElement('canvas'); const S = 72; c.width = c.height = S;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, S, S);
  const d = g.getImageData(0, 0, S, S).data; const bins = new Map();
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 128) continue;
    const r = d[i], gg = d[i + 1], b = d[i + 2]; const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
    const key = `${r >> 4},${gg >> 4},${b >> 4}`; const w = (mx > 245 && mn > 235) || mx < 18 ? 0.15 : 1 + (mx - mn) / 255;
    const e = bins.get(key) || { r: 0, g: 0, b: 0, n: 0, w: 0 }; e.r += r; e.g += gg; e.b += b; e.n++; e.w += w; bins.set(key, e);
  }
  const cands = [...bins.values()].sort((a, b) => b.w - a.w).map(e => ({ hex: '#' + [e.r / e.n, e.g / e.n, e.b / e.n].map(v => Math.round(v).toString(16).padStart(2, '0')).join(''), w: e.w }));
  const out = [];
  const dist = (a, b) => { const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16); return Math.hypot(((x >> 16) & 255) - ((y >> 16) & 255), ((x >> 8) & 255) - ((y >> 8) & 255), (x & 255) - (y & 255)); };
  for (const c2 of cands) { if (out.every(o => dist(o.hex, c2.hex) > 60)) out.push(c2); if (out.length >= 5) break; }
  const tot = out.reduce((s, o) => s + o.w, 0) || 1;
  return out.map(o => ({ hex: o.hex, pct: Math.round(o.w / tot * 100) }));
}
function loadImage(src) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; }); }
function sampleLogo(m) {
  const th = THEME_MAP[m.theme] || THEME_MAP.cream; const v = th.vars;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="${v.cream}"/><circle cx="100" cy="92" r="64" fill="${m.brand || v.gl}"/><circle cx="100" cy="92" r="40" fill="${v.rose}"/><path d="M60 170 h80" stroke="${v.deep}" stroke-width="14" stroke-linecap="round"/><circle cx="148" cy="44" r="16" fill="${th.hero.pal[2] || v.heroC}"/></svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}
function renderAI(p) {
  const pal = palette;
  const vars = pal ? paletteToVars(pal.map(x => x.hex)) : null;
  const th = vars ? customTheme({ colors: pal.map(x => x.hex), vars }) : null;
  const ratio = vars ? contrast(vars.ink, vars.cream) : 0, ratio2 = vars ? contrast(vars.g, '#ffffff') : 0;
  p.innerHTML = `<div class="st-sec-h"><h3>${icon('sparkle', 16)} AI 依商家 logo 色票產生風格</h3><small>上傳 logo 或店面照片，用 canvas 取主色，產生一組可讀性合格的 CSS 變數（示範，在瀏覽器內完成、不上傳）</small></div>
    <div class="st-ai">
      <label class="st-drop" id="stDrop"><input type="file" accept="image/*" id="stFile" hidden>${paletteSrc ? `<img src="${paletteSrc}" alt="logo">` : `${icon('file', 28)}<b>拖放或點選上傳 logo</b><small>PNG／JPG／SVG</small>`}</label>
      <div class="st-ai-r"><h4 class="st-sub">或用示範 logo 試試</h4><div class="st-samples">${TENANTS.slice(0, 8).map(m => `<button data-sample="${m.id}" title="${esc(m.name)}">${merchantLogo(m, 30)}<span>${esc(m.name)}</span></button>`).join('')}</div>
        ${pal ? `<h4 class="st-sub">取得的主色</h4><div class="st-pal">${pal.map(c => `<span style="--c:${c.hex}"><i></i><b class="mono">${c.hex}</b><small>${c.pct}%</small></span>`).join('')}</div>` : '<p class="st-empty">尚未分析圖片</p>'}</div>
    </div>
    ${vars ? `<div class="st-gen"><div class="st-gen-prev">${themeThumb(th, { merchant: TENANT, w: 300, h: 188 })}</div>
      <div class="st-gen-r"><h4 class="st-sub">產生的 CSS 變數</h4><div class="st-vars">${Object.entries(vars).map(([k, v]) => `<span><i style="background:${v}"></i><code>--${k.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}</code><b class="mono">${v}</b></span>`).join('')}</div>
        <div class="st-checks"><span class="chip-sm ${ratio >= 7 ? '' : 'warn'}">文字對比 ${ratio.toFixed(1)}:1 ${ratio >= 7 ? '✓ AAA' : '需調整'}</span><span class="chip-sm ${ratio2 >= 4.5 ? '' : 'warn'}">主色對白 ${ratio2.toFixed(1)}:1 ${ratio2 >= 4.5 ? '✓ AA' : ''}</span></div>
        <div class="st-row"><button class="btn btn-primary" id="stApply">${icon('wand', 16)} 套用為自訂風格</button>${cfg.custom ? '<button class="btn btn-ghost btn-sm" id="stDelCustom">移除自訂風格</button>' : ''}</div></div></div>` : ''}`;
  const analyze = async (src) => {
    try { const im = await loadImage(src); palette = extractPalette(im); paletteSrc = src; if (!palette.length) throw new Error('empty'); renderAI(p); gsap.fromTo($$('.st-pal span', p), { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, stagger: 0.06, duration: 0.4, ease: 'back.out(2)' }); toast('AI 已分析色票', `取得 ${palette.length} 個主色，產生一組風格變數`, { icon: icon('sparkle', 18) }); }
    catch { toast('無法讀取這張圖片', '請改用 PNG 或 JPG', { kind: 'warn', icon: icon('alert', 18) }); }
  };
  const file = $('#stFile', p), drop = $('#stDrop', p);
  file.addEventListener('change', () => { const f = file.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => analyze(rd.result); rd.readAsDataURL(f); });
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); const f = e.dataTransfer.files[0]; if (f) { const rd = new FileReader(); rd.onload = () => analyze(rd.result); rd.readAsDataURL(f); } });
  $$('[data-sample]', p).forEach(b => b.addEventListener('click', () => analyze(sampleLogo(TENANTS.find(m => m.id === b.dataset.sample)))));
  const ap = $('#stApply', p); if (ap) ap.addEventListener('click', () => { save({ custom: { name: 'AI 自訂風格', colors: pal.map(x => x.hex), vars }, theme: 'custom' }, '已套用 AI 自訂風格'); renderAI(p); });
  const dc = $('#stDelCustom', p); if (dc) dc.addEventListener('click', () => { save({ custom: null, theme: cfg.theme === 'custom' ? 'auto' : cfg.theme }, '已移除自訂風格'); renderAI(p); });
}
void mix;
