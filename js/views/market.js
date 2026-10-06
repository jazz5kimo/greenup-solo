// 多平台上架：一次填寫商品 → AI 依各平台規則調整與檢核 → API 平台一鍵上架、其他平台自動打包 ZIP（CSV＋圖片＋說明）手動上傳
// 全部為示範：平台設定、費用、串接皆為假設，不代表與各平台有合作關係。
import { $, $$, el, gsap, esc, money, sleep, countUp, toast, fmtTime, fmtDate, pad } from '../util.js';
import { icon } from '../icons.js';
import { store } from '../state.js';
import { PRODUCTS, PRODUCT_MAP } from '../data.js';
import { productArt } from '../art.js';
import { NEW_PRODUCT, COPY, KW, META, ALG_I18N, yuzuArt } from '../listing-data.js';
import {
  PLATFORMS, PLAT_MAP, DISCLAIMER, BRAND, DEMO_FDA, FIELD_LABEL, catPath, VARS, WEIGHT, INGREDIENTS, FDA_OF,
  NEW_STOCK, NEW_PRICE, NEW_COST, ST_LABEL, seedStatus, MANUAL_STEPS, skuOf, TEMP_WORD,
} from '../market-data.js';
import { IS_AMEI, FOODISH, CAT, KIT } from '../inventory-data.js';
import { specLine } from '../listing-data.js';
import { promoInfo, onPromos } from '../promo.js';
const promoOf = (pid) => (pid === 'yuzu' ? null : promoInfo(PRODUCT_MAP[pid]));
const promoTxt = (pr) => `${pr.badge} ${money(pr.price)}（原價 ${money(pr.list)}，檔期至 ${pr.to}）`;
// 食品業（含阿美）顯示食品標示；其他業態改為一般商品標示
const FOODLBL = IS_AMEI || FOODISH;
const LBL = FOODLBL ? '食品標示' : '商品標示';
import { zipBytes, toCSV, downloadBlob, fmtBytes } from '../market-zip.js';

/* ---------- 內嵌圖示 ---------- */
const svg = (d, s = 18) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I = {
  zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  pkg: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8M7.5 5.5l9 5"/>',
  dl: '<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 18v2h16v-2"/>',
  up: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
  img: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  sync: '<path d="M21 12a9 9 0 0 1-15.4 6.4L3 16"/><path d="M3 12a9 9 0 0 1 15.4-6.4L21 8"/><path d="M3 21v-5h5M21 3v5h-5"/>',
  ok: '<path d="M20 6 9 17l-5-5"/>',
  warn: '<path d="M12 8v5M12 16.5h.01"/>',
  bad: '<path d="M16 8 8 16M8 8l8 8"/>',
  csv: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8M12 11v8"/>',
  txt: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.8-9.8M17 6l3 3M14.5 8.5l2 2"/>',
};
const stIcon = (st, s = 12) => `<i class="mk-si ${st}">${svg(st === 'ok' ? I.ok : st === 'fix' ? I.warn : I.bad, s)}</i>`;

/* ---------- 狀態 ---------- */
const PIDS = ['yuzu', ...PRODUCTS.map(p => p.id)];
const S = {
  pid: 'yuzu',
  items: {},
  plat: Object.fromEntries(PLATFORMS.map(p => [p.id, { mode: p.mode, connected: p.id === 'web', fee: p.fee, sel: true, connecting: false }])),
  pricing: 'markup',
  detail: 'momo',
  status: seedStatus(),
  lastSync: new Date(Date.now() - 14 * 60e3),
  running: false,
  results: {},
  zips: {},
  syncLog: [],
  firstShow: true,
};
let root = null;
let recalcT = 0;
let mounted = false;

const prodBase = (pid) => pid === 'yuzu' ? NEW_PRODUCT : PRODUCT_MAP[pid];
const artSVG = (pid, size) => pid === 'yuzu' ? yuzuArt(size) : productArt(pid, size);
const artCache = {};
function artUrl(pid) {
  if (!artCache[pid]) artCache[pid] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(artSVG(pid, 1000).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '));
  return artCache[pid];
}
const invOf = (pid) => { try { return store.inventory().find(p => p.id === pid); } catch { return null; } };

function initItem(pid) {
  const b = prodBase(pid);
  const c = (COPY[pid] && COPY[pid].zh) || [b.name, '', ''];
  const inv = invOf(pid);
  const v = VARS[pid] || { label: '', opts: [] };
  return {
    name: c[0], unit: b.unit, point: c[1], desc: c[2],
    price: pid === 'yuzu' ? NEW_PRICE : (b.listPrice ?? b.price),
    cost: pid === 'yuzu' ? NEW_COST : b.cost,
    stock: pid === 'yuzu' ? NEW_STOCK : (inv ? inv.current : b.stock),
    vars: { label: v.label, opts: v.opts.map(o => ({ ...o })) },
    weight: WEIGHT[pid], storage: b.storage, days: IS_AMEI ? b.days : (KIT.shelfOf(pid === 'yuzu' ? PRODUCT_MAP[NEW_PRODUCT.baseId] : b) || (FOODISH ? 30 : 365)),
    spec: IS_AMEI ? '' : specLine(pid === 'yuzu' ? PRODUCT_MAP[NEW_PRODUCT.baseId] : b, 'zh').txt,
    ingredients: INGREDIENTS[pid] || '', allergens: [...b.allergens], fda: FDA_OF(pid),
    photo: null, photoW: 0, photoH: 0,
  };
}
const item = (pid = S.pid) => S.items[pid] || (S.items[pid] = initItem(pid));
const pl = (id) => PLAT_MAP[id];
const ps = (id) => S.plat[id];

/* ---------- 規則：標題 ---------- */
const lenOf = (s, mode) => mode === 'w' ? [...s].reduce((n, ch) => n + (ch.charCodeAt(0) < 0x2000 ? 1 : 2), 0) : [...s].length;
function cutTo(s, max, mode) { let out = ''; for (const ch of s) { if (lenOf(out + ch, mode) > max) break; out += ch; } return out; }
function buildTitle(it, pid, p, unitOverride) {
  const unitRaw = unitOverride ?? it.unit;
  const name = (it.name || '').trim() || '未命名商品';
  const core = name + String(unitRaw).replace(/\s+/g, '');
  const pointShort = (it.point || '').split(/[，,。！!；;]/)[0].trim();
  const kws = ((KW[pid] && KW[pid].zh) || []).filter(k => !k.includes(name) && !name.includes(k));
  const tags = (META[pid] && META[pid].tags) || [];
  const temp = TEMP_WORD(it.storage);
  const original = `${BRAND}｜${name} ${unitRaw}｜${it.point || ''}`.replace(/｜$/, '');
  const max = p.titleMax, mode = p.cnt;
  let brand = '', cands = [];
  if (p.style === 'bracket') { brand = `【${BRAND}】`; cands = [' ' + tags[0], ' ' + pointShort, ...kws.map(k => ' ' + k), ' ' + temp, ...tags.slice(1).map(t => ' ' + t)]; }
  else if (p.style === 'plain') { brand = `${BRAND} `; cands = [`（${temp}）`, ' ' + pointShort, ...kws.map(k => ' ' + k), ' ' + tags[0]]; }
  else if (p.style === 'gift') { cands = ['｜' + pointShort, ' ' + tags[0], '｜' + BRAND]; }
  const kept = [], dropped = [];
  let out;
  if (p.style === 'web' && lenOf(original, mode) <= max) out = original;
  else {
    if (p.style === 'web') { brand = `【${BRAND}】`; cands = [' ' + pointShort, ' ' + temp]; }
    out = brand + core;
    if (lenOf(out, mode) > max) { if (brand) dropped.push(BRAND); out = core; }
    else if (brand) kept.push(BRAND);
    if (lenOf(out, mode) > max) out = cutTo(core, max, mode);
    const seen = new Set();
    for (const c of cands) {
      const bare = c.replace(/^[\s｜（]+|[）]+$/g, '').trim();
      if (!bare || seen.has(bare) || out.includes(bare)) continue;
      seen.add(bare);
      if (lenOf(out + c, mode) <= max) { out += c; kept.push(bare); } else dropped.push(bare);
    }
  }
  const oLen = lenOf(original, mode), nLen = lenOf(out, mode);
  return { original, out, oLen, nLen, max, mode, kept, dropped, over: oLen > max };
}

/* ---------- 規則：價格、庫存、圖片、規格、食品標示 ---------- */
const validOpts = (it) => it.vars.opts.filter(o => String(o.n).trim());
function priceOf(base, platId) {
  if (S.pricing === 'same' || platId === 'web') return base;
  const fw = ps('web').fee / 100, f = Math.min(0.6, ps(platId).fee / 100);
  return Math.max(base, Math.ceil(base * (1 - fw) / (1 - f) / 10) * 10);
}
const poolOf = (pid) => Math.max(0, Math.round(+item(pid).stock || 0));
const ratioNum = (r) => { const [a, b] = r.split(':').map(Number); return a / b; };
function emptyField(it, k) {
  if (k === 'fda') return !String(it.fda || '').trim();
  if (k === 'weight') return !(+it.weight > 0);
  if (k === 'ingredients') return !String(it.ingredients || '').trim();
  if (k === 'shelf') return !(+it.days > 0);
  return false;
}
const optUnits = (opts, i) => { const n0 = parseFloat(opts[0] && opts[0].n) || 1; const n = parseFloat(opts[i] && opts[i].n) || n0; return Math.max(1, n / n0); };

function adapt(pid, platId) {
  const it = item(pid), p = pl(platId), s = ps(platId);
  const title = buildTitle(it, pid, p);
  const conf = Math.max(80, ((META[pid] && META[pid].conf) || 92) - (p.coarse ? 7 : 0) - (PLATFORMS.indexOf(p) % 3));
  const cat = { path: catPath(platId, pid), conf, coarse: !!p.coarse };
  const opts = validOpts(it);
  const base = +it.price || 0;
  const P = priceOf(base, platId);
  const fee = s.fee;
  const net = P * (1 - fee / 100);
  const gm = P ? (net - (+it.cost || 0)) / P : 0;
  const pool = poolOf(pid);
  const avail = Math.max(0, pool - p.safety);
  const srcR = it.photo ? it.photoW / it.photoH : 1;
  const tgtR = ratioNum(p.img.ratio);
  const needCrop = Math.abs(srcR - tgtR) > 0.03;
  const lowRes = it.photo && Math.min(it.photoW, it.photoH) < p.img.min;
  const missing = p.req.filter(k => emptyField(it, k));
  const split = opts.length > 1 && !p.variants;

  const c = {};
  c.title = title.over ? { st: 'fix', t: `${title.oLen}→${title.nLen}${p.cnt === 'w' ? ' 位元' : ' 字'}・改寫` } : { st: 'ok', t: `${title.nLen}/${title.max}${p.cnt === 'w' ? ' 位元' : ' 字'}` };
  c.cat = cat.coarse ? { st: 'fix', t: '併入上層分類' } : { st: 'ok', t: `對應 ${conf}%` };
  c.price = S.pricing === 'markup' && P !== base ? { st: 'fix', t: `${base}→${P}` } : gm < 0.25 ? { st: 'fix', t: `毛利 ${Math.round(gm * 100)}% 偏低` } : { st: 'ok', t: money(P) };
  c.stock = avail <= 0 ? { st: 'fix', t: '可售 0・暫停販售' } : { st: 'ok', t: `可售 ${avail}${p.safety ? `（留 ${p.safety}）` : ''}` };
  c.img = needCrop ? { st: 'fix', t: `${it.photo ? '裁切' : '延伸'}為 ${p.img.ratio}` } : lowRes ? { st: 'fix', t: `放大至 ${p.img.min}px` } : { st: 'ok', t: `${p.img.ratio}・${p.img.out[0][0]}px` };
  c.vars = opts.length <= 1 ? { st: 'ok', t: '單一規格' } : split ? { st: 'fix', t: `拆成 ${opts.length} 個商品` } : { st: 'ok', t: `${opts.length} 種規格` };
  c.food = missing.length ? { st: 'miss', t: '缺 ' + missing.map(k => k === 'fda' ? '登錄字號' : FIELD_LABEL[k]).join('、') } : { st: 'ok', t: '標示完整' };
  const sts = Object.values(c).map(x => x.st);
  const worst = sts.includes('miss') ? 'miss' : sts.includes('fix') ? 'fix' : 'ok';
  return { it, p, title, cat, base, P, fee, net, gm, pool, avail, opts, split, needCrop, lowRes, srcR, missing, c, worst };
}

/* ---------- 版面 ---------- */
const logo = (p, cls = '') => `<span class="mk-logo ${cls}" style="--c:${p.color}">${esc(p.short)}</span>`;
const CHECK_COLS = [['title', '標題'], ['cat', '分類'], ['price', '價格'], ['stock', '庫存'], ['img', '圖片'], ['vars', '規格'], ['food', LBL]];

function layout() {
  return `
  <div class="mk">
    <div class="mk-head glass anim-in">
      <div class="mk-head-l">
        <span class="mk-hlogo">${icon('store', 26)}</span>
        <div>
          <div class="mk-title-row"><b>多平台上架</b><span class="demo-badge">示範資料</span></div>
          <p>一次填寫商品資料，AI 依各平台規則改寫標題、對應分類、調整價格與圖片；能串接的平台 <b>API 一鍵上架</b>，不能串接的自動 <b>打包成上傳檔</b>，手工上傳即可。</p>
          <small class="mk-disc">${icon('alert', 13)} ${esc(DISCLAIMER)}平台以文字色塊表示，費用與規格皆為示範假設。</small>
        </div>
      </div>
      <div class="mk-flow" aria-hidden="true">
        <span>${svg(I.edit, 15)}一次填寫</span><i></i><span>${icon('sparkle', 15)}AI 調整檢核</span><i></i><span>${svg(I.zap, 15)}API 直送</span><em>＋</em><span>${svg(I.pkg, 15)}打包 ZIP</span><i></i><span>${icon('cart', 15)}訂單回 GreenUP</span>
      </div>
    </div>

    <div class="mk-kpis" id="mkKpis"></div>

    <section class="mk-sec glass anim-in">
      <div class="mk-sec-h"><h3><span class="mk-num">1</span>平台與連線方式</h3>
        <div class="mk-sec-r"><span class="chip-sm">${svg(I.zap, 12)} API 一鍵上架</span><span class="chip-sm">${svg(I.pkg, 12)} 打包檔案手動上傳</span><span class="chip-sm warn">費用率為示範假設，可直接修改</span></div></div>
      <div class="mk-plats" id="mkPlats"></div>
    </section>

    <section class="mk-sec glass anim-in">
      <div class="mk-sec-h"><h3><span class="mk-num">2</span>主商品資料<small>只要填一次，各平台自動套用</small></h3>
        <div class="mk-sec-r"><button class="btn btn-ghost btn-sm" id="mkFromLs">${icon('sparkle', 14)} 從「AI 商品上架」帶入文案</button><button class="btn btn-ghost btn-sm" id="mkGoLs">${icon('external', 14)} 到 AI 商品上架產生新文案</button></div></div>
      <div class="mk-picks" id="mkPicks"></div>
      <div class="mk-form" id="mkForm"></div>
    </section>

    <section class="mk-sec glass anim-in">
      <div class="mk-sec-h"><h3><span class="mk-num">3</span>各平台自動調整與檢核<small id="mkAdjSub"></small></h3>
        <div class="mk-sec-r">
          <div class="mk-segs" id="mkPricing"><span>價格策略</span><button class="seg" data-pr="same">各平台同價</button><button class="seg" data-pr="markup">依平台費用自動加價（取整到 NT$10）</button></div>
        </div></div>
      <div class="mk-legend">${stIcon('ok')}通過 ${stIcon('fix')}已自動修正／提醒 ${stIcon('miss')}需補資料（點一下直接補填）<span class="mk-legend-r">點平台列查看「原文 → 調整後」細節</span></div>
      <div class="mk-adj">
        <div class="mk-scroll mk-mx-wrap"><table class="mk-mx" id="mkMx"></table></div>
        <div class="mk-dt" id="mkDt"></div>
      </div>
    </section>

    <section class="mk-sec glass anim-in" id="mkPubSec">
      <div class="mk-sec-h"><h3><span class="mk-num">4</span>一鍵上架<small>API 平台直接建立商品；其他平台產生可下載的上傳檔（ZIP）</small></h3></div>
      <div class="mk-pub" id="mkPub"></div>
      <div class="mk-res" id="mkRes"></div>
    </section>

    <div class="mk-row">
      <section class="mk-sec glass anim-in">
        <div class="mk-sec-h"><h3><span class="mk-num">5</span>上架狀態總表<small>商品 × 平台</small></h3>
          <div class="mk-sec-r mk-stlegend">${['live', 'review', 'todo', 'miss', 'none'].map(k => `<span class="mk-pill p-${k}">${ST_LABEL[k]}</span>`).join('')}</div></div>
        <div class="mk-scroll"><table class="mk-st" id="mkSt"></table></div>
        <div class="mk-pricechk" id="mkPriceChk"></div>
      </section>
      <section class="mk-sec glass anim-in mk-sync-sec">
        <div class="mk-sec-h"><h3>${svg(I.sync, 17)}共用庫存同步</h3><span class="demo-badge">示範</span></div>
        <p class="mk-note">所有平台共用同一份庫存；任一平台賣出，GreenUP 會同步扣減其他平台可售量，避免超賣。各平台另保留「安全量」。</p>
        <div class="mk-sync" id="mkSync"></div>
      </section>
    </div>

    <section class="mk-sec glass anim-in">
      <div class="mk-sec-h"><h3><span class="mk-num">6</span>上架後：各平台訂單彙整回 GreenUP</h3><span class="demo-badge">示範流程</span></div>
      <div class="mk-orders" id="mkOrders"></div>
    </section>

    <div class="mk-modal" id="mkModal" hidden><div class="mk-modal-bg"></div><div class="mk-modal-panel glass" role="dialog" aria-modal="true"></div></div>
  </div>`;
}

/* ---------- 1. 頂部總覽 ---------- */
function renderKpis() {
  const api = PLATFORMS.filter(p => ps(p.id).mode === 'api');
  const apiOn = api.filter(p => ps(p.id).connected);
  const file = PLATFORMS.filter(p => ps(p.id).mode === 'file');
  const sel = PLATFORMS.filter(p => ps(p.id).sel).length;
  const k = (c, ic, label, val, sub, id) => `<div class="kpi glass mk-kpi anim-in" style="--c:${c}"><div class="kpi-top"><span class="kpi-ic">${ic}</span><span class="kpi-label">${label}</span></div><div class="kpi-val" ${id ? `id="${id}"` : ''}>${val}</div><div class="kpi-sub">${sub}</div></div>`;
  $('#mkKpis', root).innerHTML =
    k('#5EE0C4', svg(I.zap, 16), '已連線 API 平台', `${apiOn.length}<small> / ${api.length}</small>`, apiOn.length ? apiOn.map(p => p.name).join('・') : '尚未授權任何平台') +
    k('#F0A531', svg(I.pkg, 16), '使用檔案上傳的平台', `${file.length}<small> 個</small>`, '自動打包 CSV＋圖片＋說明') +
    k('#2DB674', icon('store', 16), '本頁一次能上架', `${PLATFORMS.length}<small> 個平台</small>`, `目前勾選 ${sel} 個・${api.length} 個 API＋${file.length} 個檔案`) +
    k('#2E97D4', svg(I.sync, 16), '上次同步時間', fmtTime(S.lastSync), `${fmtDate(S.lastSync)}・庫存／價格／狀態（示範）`, 'mkLastSync');
}

/* ---------- 平台卡 ---------- */
function platCard(p) {
  const s = ps(p.id);
  const api = s.mode === 'api';
  const conn = p.builtIn ? `<span class="mk-conn on">● 內建・免授權</span>` : api ? (s.connected ? `<span class="mk-conn on">● 已連線（示範）</span>` : `<span class="mk-conn off">○ 尚未授權</span>`) : `<span class="mk-conn file">檔案上傳</span>`;
  const foot = api
    ? (p.builtIn ? `<small class="mk-pc-hint">${icon('check', 12)} 上架後直接出現在 GreenUP 銷售網頁</small><button class="btn btn-ghost btn-sm" data-sync="${p.id}">${svg(I.sync, 13)} 立即同步</button>`
      : s.connected ? `<small class="mk-pc-hint">${icon('lock', 12)} 授權有效（示範）・自動同步庫存與訂單</small><button class="btn btn-ghost btn-sm" data-sync="${p.id}">${svg(I.sync, 13)} 立即同步</button>`
        : `<small class="mk-pc-hint">${p.mode === 'file' ? '示範：假設平台已開放 API 給您的帳號' : '需以賣家帳號授權 GreenUP 存取商品與訂單'}</small><button class="btn btn-primary btn-sm" data-conn="${p.id}" ${s.connecting ? 'disabled' : ''}>${s.connecting ? '授權中…' : `${svg(I.key, 13)} 連線（示範授權）`}</button>`)
    : `<small class="mk-pc-hint">${svg(I.zap, 12)} 平台若開放 API，可升級為自動串接</small><button class="btn btn-ghost btn-sm" data-guide="${p.id}">${icon('book', 13)} 手動上傳教學</button>`;
  return `<div class="mk-pc ${api ? 'is-api' : 'is-file'}" data-pc="${p.id}" style="--c:${p.color}">
    <div class="mk-pc-h">${logo(p)}<div class="mk-pc-n"><b>${esc(p.name)}</b><small>${p.sub ? esc(p.sub) : api ? 'API 一鍵上架' : '打包檔案手動上傳'}</small></div>${conn}</div>
    ${p.builtIn ? `<div class="mk-pc-mode one"><span class="on">${svg(I.zap, 12)} API<i class="mk-long"> 一鍵上架</i>（內建）</span></div>` : `<div class="mk-pc-mode" role="group" aria-label="上架方式"><button class="${api ? 'on' : ''}" data-mode="api" data-pid="${p.id}">${svg(I.zap, 12)} API<i class="mk-long"> 一鍵上架</i></button><button class="${api ? '' : 'on'}" data-mode="file" data-pid="${p.id}">${svg(I.pkg, 12)} 打包<i class="mk-long">檔案</i></button></div>`}
    <ul class="mk-spec">
      <li><span>標題上限</span><b>${p.titleMax} ${p.cnt === 'w' ? '位元<em>全形算 2</em>' : '字'}</b></li>
      <li><span>主圖</span><b>${p.img.ratio}・≥ ${p.img.min}px</b></li>
      <li><span>多規格</span><b class="${p.variants ? '' : 'no'}">${p.variants ? (FOODLBL ? '支援口味／尺寸' : '支援款式／尺寸') : '不支援（自動拆品）'}</b></li>
      <li><span>必填</span><b>${p.req.length} 項${LBL}</b></li>
      <li><span>費用率</span><b class="mk-fee"><input type="number" min="0" max="60" step="0.5" value="${s.fee}" data-fee="${p.id}" aria-label="${esc(p.name)} 費用率">%<em>示範</em></b></li>
    </ul>
    <div class="mk-pc-f">${foot}</div>
  </div>`;
}
function renderPlats() { $('#mkPlats', root).innerHTML = PLATFORMS.map(platCard).join(''); }

/* ---------- 2. 主商品 ---------- */
function renderPicks() {
  $('#mkPicks', root).innerHTML = PIDS.map(pid => {
    const it = item(pid);
    return `<button class="mk-pick ${pid === S.pid ? 'on' : ''}" data-pick="${pid}">${artSVG(pid, 40)}<span><b>${esc(it.name)}</b><small>${pid === 'yuzu' ? '<em>示範新品</em>' : money(it.price)}${promoOf(pid) ? ` <em class="mk-promo">${esc(promoOf(pid).badge)} ${money(promoOf(pid).price)}</em>` : ''}</small></span></button>`;
  }).join('');
}
const ALG_KEYS = ['egg', 'milk', 'gluten', 'nuts'];
function renderForm() {
  const it = item();
  const opts = it.vars.opts;
  $('#mkForm', root).innerHTML = `
    <div class="mk-f-img">
      <div class="mk-img-box" id="mkImgBox">${it.photo ? `<img src="${it.photo}" alt="商品照片" class="is-photo">` : artSVG(S.pid, 220)}<span class="mk-img-tag">${it.photo ? `上傳照片・${it.photoW}×${it.photoH}` : 'AI 商品插圖・1:1・SVG 向量'}</span></div>
      <div class="mk-img-btns">
        <label class="btn btn-ghost btn-sm mk-upl">${svg(I.up, 14)} 上傳照片<input type="file" accept="image/*" id="mkFile" hidden></label>
        ${it.photo ? `<button class="btn btn-ghost btn-sm" id="mkUseArt">${svg(I.img, 14)} 改用 AI 插圖</button>` : ''}
      </div>
      <small class="mk-hint">打包時依各平台規格自動輸出 PNG（1:1、4:3…），主圖勿加文字或浮水印。</small>
    </div>
    <div class="mk-f-col">
      <label class="mk-fl"><span>商品名稱</span><input data-f="name" value="${esc(it.name)}"></label>
      <div class="mk-f2">
        <label class="mk-fl"><span>包裝／入數</span><input data-f="unit" value="${esc(it.unit)}"></label>
        <label class="mk-fl"><span>商品貨號</span><input value="${skuOf(S.pid)}" disabled></label>
      </div>
      <label class="mk-fl"><span>一句話賣點</span><input data-f="point" value="${esc(it.point)}"></label>
      <label class="mk-fl"><span>商品描述</span><textarea data-f="desc" rows="4">${esc(it.desc)}</textarea></label>
      <div class="mk-f3">
        <label class="mk-fl"><span>售價（官網）</span><input type="number" min="0" step="10" data-f="price" value="${it.price}"></label>
        <label class="mk-fl"><span>成本</span><input type="number" min="0" data-f="cost" value="${it.cost}"></label>
        <label class="mk-fl"><span>共用庫存</span><input type="number" min="0" data-f="stock" value="${it.stock}"></label>
      </div>
      <div class="mk-fl"><span>${FOODLBL ? '規格（口味／尺寸）' : '規格（款式／尺寸）'}<em>${opts.length > 1 ? `${opts.length} 種` : '單一規格'}</em></span>
        <div class="mk-vars">
          <input class="mk-var-l" data-f="varLabel" value="${esc(it.vars.label)}" placeholder="規格名稱，例：入數">
          ${opts.map((o, i) => `<span class="mk-var"><input data-vn="${i}" value="${esc(o.n)}" aria-label="選項名稱"><small>+</small><input type="number" data-va="${i}" value="${o.add}" step="10" aria-label="加價"><button class="mk-var-x" data-vx="${i}" aria-label="刪除選項">${icon('x', 12)}</button></span>`).join('')}
          <button class="btn btn-ghost btn-sm" id="mkVarAdd">${icon('plus', 13)} 新增選項</button>
        </div>
      </div>
    </div>
    <div class="mk-f-col">${FOODLBL ? `
      <div class="mk-f3">
        <label class="mk-fl ${emptyField(it, 'weight') ? 'need' : ''}"><span>重量（g，含包裝）</span><input type="number" min="0" data-f="weight" value="${it.weight}" placeholder="必填"></label>
        <div class="mk-fl"><span>保存方式</span><div class="mk-seg2"><button class="seg ${it.storage === 'fridge' ? 'on' : ''}" data-stor="fridge">冷藏</button><button class="seg ${it.storage === 'room' ? 'on' : ''}" data-stor="room">常溫</button></div></div>
        <label class="mk-fl"><span>保存期限（天）</span><input type="number" min="0" data-f="days" value="${it.days}"></label>
      </div>
      <label class="mk-fl ${emptyField(it, 'ingredients') ? 'need' : ''}"><span>成分</span><textarea data-f="ingredients" rows="2">${esc(it.ingredients)}</textarea></label>
      <div class="mk-fl"><span>過敏原<em>沿用商品主檔</em></span><div class="mk-algs">${ALG_KEYS.map(k => `<button class="mk-alg ${it.allergens.includes(k) ? 'on' : ''}" data-alg="${k}">${ALG_I18N[k].zh}</button>`).join('')}</div></div>
      <label class="mk-fl ${emptyField(it, 'fda') ? 'need' : ''}"><span>食品業者登錄字號<em>示範值</em></span><input data-f="fda" value="${esc(it.fda)}" placeholder="例：A-000000000-00000-0"></label>
      <small class="mk-hint ${it.fda ? '' : 'bad'}">${it.fda ? `${icon('alert', 12)} 目前為示範字號，正式上架前請填入貴公司實際的食品業者登錄字號。` : `${icon('alert', 12)} 新品草稿尚未填字號：各平台檢核會顯示「需補資料」。`}${it.fda ? '' : ` <button class="mk-link" id="mkFdaDemo">套用示範字號</button>`}</small>
` : `
      <div class="mk-f3">
        ${CAT !== 'service' ? `<label class="mk-fl ${emptyField(it, 'weight') ? 'need' : ''}"><span>重量（g，含包裝）</span><input type="number" min="0" data-f="weight" value="${it.weight}" placeholder="必填"></label>` : ''}
        ${CAT === 'flower' ? `<label class="mk-fl"><span>欣賞天數</span><input type="number" min="0" data-f="days" value="${it.days}"></label>` : ''}
      </div>
      <label class="mk-fl ${emptyField(it, 'ingredients') ? 'need' : ''}"><span>${FIELD_LABEL.ingredients}</span><textarea data-f="ingredients" rows="2">${esc(it.ingredients)}</textarea></label>
      <small class="mk-hint">${icon('alert', 12)} 非食品類商品不需食品標示；請確認${FIELD_LABEL.ingredients}、尺寸與保固說明與實際商品一致。</small>`}
      <div class="mk-food-sum">${storageTxt(it)}${FOODLBL ? `・${it.allergens.length ? '含' + it.allergens.map(k => ALG_I18N[k].zh).join('、') : '無標示過敏原'}` : ''}</div>
    </div>`;
}
const storageTxt = (it) => !FOODLBL ? it.spec : it.storage === 'fridge' ? `冷藏 0–7°C・${it.days} 天內食用` : `常溫・避免日照・${it.days} 天內食用`;

/* ---------- 3. 矩陣與細節 ---------- */
function renderMatrix() {
  const rows = PLATFORMS.map(p => {
    const a = adapt(S.pid, p.id);
    const s = ps(p.id);
    return `<tr data-row="${p.id}" class="${S.detail === p.id ? 'on' : ''} w-${a.worst}">
      <th><div class="mk-mx-p">${logo(p, 'sm')}<span><b>${esc(p.name)}</b><small>${s.mode === 'api' ? svg(I.zap, 11) + ' API' : svg(I.pkg, 11) + ' 檔案'}・費用 ${s.fee}%</small></span></div></th>
      ${CHECK_COLS.map(([k]) => `<td><button class="mk-cell ${a.c[k].st}" data-cell="${p.id}" data-k="${k}">${stIcon(a.c[k].st)}<span>${esc(a.c[k].t)}</span></button></td>`).join('')}
    </tr>`;
  }).join('');
  $('#mkMx', root).innerHTML = `<thead><tr><th>平台</th>${CHECK_COLS.map(([, n]) => `<th>${n}</th>`).join('')}</tr></thead><tbody>${rows}</tbody>`;
  const all = PLATFORMS.map(p => adapt(S.pid, p.id));
  const miss = all.filter(a => a.worst === 'miss').length, fix = all.filter(a => a.worst === 'fix').length, ok = all.length - miss - fix;
  $('#mkAdjSub', root).innerHTML = `${esc(item().name)}：<b class="g">${ok} 通過</b>・<b class="a">${fix} 已自動修正</b>・<b class="r">${miss} 需補資料</b>`;
  $$('#mkPricing .seg', root).forEach(b => b.classList.toggle('on', b.dataset.pr === S.pricing));
}

function renderDetail() {
  const a = adapt(S.pid, S.detail);
  const p = a.p, it = a.it, s = ps(p.id);
  const pctTxt = (n) => `${Math.round(n * 1000) / 10}%`;
  const fw = ps('web').fee;
  const formula = S.pricing === 'same' || p.id === 'web'
    ? `各平台同價：沿用官網售價 ${money(a.base)}`
    : `${money(a.base)} ×（1 − ${fw}%）÷（1 − ${s.fee}%）= ${(a.base * (1 - fw / 100) / (1 - Math.min(60, s.fee) / 100)).toFixed(1)} → 進位到 ${money(a.P)}`;
  const outs = p.img.out.map(([w, h]) => `<figure class="mk-crop"><div class="mk-crop-box" style="aspect-ratio:${w}/${h}">${it.photo ? `<img src="${it.photo}" alt="">` : artSVG(S.pid, 120)}</div><figcaption>${w}×${h} PNG</figcaption></figure>`).join('');
  const rows = csvRows(S.pid, p.id, imgNames(S.pid, p.id));
  const head = rows[0], first = rows[1] || [];
  const preview = head.map((h, i) => `<div><span>${esc(h)}</span><b>${esc(String(first[i] ?? '')).replace(/\n/g, '<br>') || '<i>（空白）</i>'}</b></div>`).join('');
  $('#mkDt', root).innerHTML = `
    <div class="mk-dt-tabs">${PLATFORMS.map(x => `<button class="mk-dt-tab ${x.id === p.id ? 'on' : ''}" data-dt="${x.id}" style="--c:${x.color}">${esc(x.short)}</button>`).join('')}</div>
    <div class="mk-dt-h">${logo(p)}<div><b>${esc(p.name)}</b><small>${s.mode === 'api' ? 'API 一鍵上架' : '打包檔案手動上傳'}・示範規格</small></div><span class="mk-worst ${a.worst}">${stIcon(a.worst)}${a.worst === 'ok' ? '全部通過' : a.worst === 'fix' ? '已自動修正' : '需補資料'}</span></div>
    <div class="mk-dt-cols"><div class="mk-dt-c">
    <div class="mk-dt-sec">
      <h5>${icon('sparkle', 14)} 標題依字數上限改寫</h5>
      <div class="mk-ttl old"><small>原文・${a.title.oLen} ${p.cnt === 'w' ? '位元' : '字'}</small><p>${esc(a.title.original)}</p></div>
      <div class="mk-ttl-arrow">${icon('arrow', 16)}<span>${a.title.over ? `超過上限 ${a.title.max}，AI 依「品名＋入數 → 品牌 → 關鍵字」優先序重寫` : '未超過上限，AI 依平台風格調整語序並加入搜尋關鍵字'}</span></div>
      <div class="mk-ttl new"><small>調整後・${a.title.nLen}/${a.title.max} ${p.cnt === 'w' ? '位元（全形算 2）' : '字'}</small><p>${esc(a.title.out)}</p><div class="mk-len"><i style="width:${Math.min(100, a.title.nLen / a.title.max * 100)}%"></i></div></div>
      <div class="mk-kd">${a.title.kept.map(k => `<span class="k">${esc(k)}</span>`).join('')}${a.title.dropped.map(k => `<span class="d">${esc(k)}</span>`).join('')}</div>
    </div>
    <div class="mk-dt-grid">
      <div class="mk-dt-box"><h5>分類對應</h5><p>${esc(a.cat.path)}</p><small>${a.cat.coarse ? '此平台分類較粗，已併入上層分類' : `AI 對應信心 ${a.cat.conf}%`}・示範分類樹</small></div>
      <div class="mk-dt-box"><h5>價格策略</h5><p class="mk-big">${money(a.P)}${a.opts.length > 1 ? `<small> 起</small>` : ''}</p><small>${esc(formula)}</small><small>平台費 ${s.fee}%（示範）・實收 ${money(a.net)}・毛利 ${pctTxt(a.gm)}</small>${promoOf(S.pid) ? `<small class="mk-promo">${esc(promoTxt(promoOf(S.pid)))}：${p.promo ? `已填入平台「特價」欄位 ${money(priceOf(promoOf(S.pid).price, p.id))}` : '此平台沒有特價欄位，以原價上架並在描述註記檔期'}</small>` : ''}</div>
      <div class="mk-dt-box"><h5>庫存分配</h5><p class="mk-big">${a.avail}<small> 件可售</small></p><small>共用庫存 ${a.pool} − 安全量 ${p.safety} = ${a.avail}</small><small>任一平台賣出，所有平台同步扣減</small></div>
      <div class="mk-dt-box"><h5>規格</h5><p>${a.opts.length <= 1 ? '單一規格' : a.opts.map(o => esc(o.n)).join('／')}</p><small>${a.opts.length <= 1 ? '無需設定選項' : a.split ? `此平台不支援多規格，已拆成 ${a.opts.length} 個獨立商品` : `以「${esc(it.vars.label || '規格')}」建立 ${a.opts.length} 個選項`}</small></div>
    </div>
    </div><div class="mk-dt-c">
    <div class="mk-dt-sec">
      <h5>${svg(I.img, 14)} 圖片裁切規格 <small>${p.img.ratio}・最小邊長 ${p.img.min}px${a.needCrop ? (it.photo ? '・已自動置中裁切' : '・已延伸背景') : ''}</small></h5>
      <div class="mk-crops">${outs}</div>
    </div>
    <div class="mk-dt-sec">
      <h5>${svg(I.csv, 14)} ${s.mode === 'api' ? 'API 送出欄位預覽' : `CSV 第 1 列預覽`} <small>共 ${rows.length - 1} 列・${head.length} 欄・依平台示範欄位順序</small></h5>
      <div class="mk-kv">${preview}</div>
    </div>
    </div></div>
    ${a.missing.length ? `<button class="btn btn-primary btn-sm mk-dt-fix" data-fix="${p.id}">${svg(I.edit, 14)} 補填：${a.missing.map(k => k === 'fda' ? '食品業者登錄字號' : FIELD_LABEL[k]).join('、')}</button>` : ''}`;
}

/* ---------- 輸出：CSV、圖片、說明 ---------- */
function imgNames(pid, platId) {
  return pl(platId).img.out.map(([w, h]) => `圖片/${skuOf(pid)}-${w}x${h}.png`);
}
const algTxt = (it) => it.allergens.length ? it.allergens.map(k => ALG_I18N[k].zh).join('、') : '無';
function descFor(it, p) {
  const info = FOODLBL ? [
    `【商品資訊】`,
    `品名：${it.name}（${it.unit}）`,
    `成分：${it.ingredients || '（待補）'}`,
    `過敏原：${it.allergens.length ? `本產品含有${algTxt(it)}` : '無主要過敏原標示（請依實際包裝確認）'}`,
    `保存方式：${storageTxt(it)}`,
    `食品業者登錄字號：${it.fda || '（待補）'}`,
  ] : [
    `【商品資訊】`,
    `品名：${it.name}（${it.unit}）`,
    `${FIELD_LABEL.ingredients}：${it.ingredients || '（待補）'}`,
    `說明：${storageTxt(it)}`,
  ];
  const pr = it.promo;
  const promoNote = pr && !p.promo ? `\n\n【檔期特價】${promoTxt(pr)}。此平台範本沒有特價欄位，已以原價上架，請於平台活動後台另設活動價。` : '';
  return `${it.desc}\n\n${info.join('\n')}${promoNote}${p.id === 'linegift' ? '\n\n送禮小提醒：收禮人填寫地址後才會出貨。' : ''}`;
}
function csvRows(pid, platId, images) {
  const it = item(pid), p = pl(platId);
  it.promo = promoOf(pid);
  const pr = it.promo;
  const opts = validOpts(it);
  const avail = Math.max(0, poolOf(pid) - p.safety);
  const list = opts.length ? opts : [{ n: it.unit, add: 0 }];
  const multi = opts.length > 1;
  const lines = [];
  const mk = (o, i, title) => {
    const v = {
      title, brand: BRAND, cat: catPath(platId, pid), price: priceOf((+it.price || 0) + (+o.add || 0), platId),
      stock: Math.floor(avail / optUnits(list, i)), varName: multi ? (it.vars.label || '規格') : '', varOpt: multi ? o.n : '',
      sku: `${skuOf(pid)}${multi ? '-' + (i + 1) : ''}`, desc: descFor(it, p), point: it.point,
      weightG: it.weight ? Math.round(+it.weight * optUnits(list, i)) : '', weightKg: it.weight ? (+it.weight * optUnits(list, i) / 1000).toFixed(2) : '',
      ingredients: it.ingredients, allergens: algTxt(it), storageTxt: !FOODLBL ? it.spec : it.storage === 'fridge' ? '冷藏 0–7°C' : '常溫・避免日照', shelf: it.days, shelfTxt: `${it.days} 天`,
      temp: IS_AMEI ? (it.storage === 'fridge' ? '冷藏' : '常溫') : TEMP_WORD(it.storage), fda: it.fda, img1: (images[0] || '').replace(/^圖片\//, ''), img2: (images[1] || '').replace(/^圖片\//, ''),
      tags: ((META[pid] && META[pid].tags) || []).join(','),
      promoPrice: pr ? priceOf(pr.price + (+o.add || 0), platId) : '', promoPeriod: pr ? `${pr.name || pr.badge}・至 ${pr.to}` : '',
    };
    lines.push(p.cols.map(([, k]) => v[k] ?? ''));
  };
  if (multi && !p.variants) list.forEach((o, i) => mk(o, i, buildTitle(it, pid, p, o.n).out));
  else { const t = buildTitle(it, pid, p).out; (multi ? list : [list[0]]).forEach((o, i) => mk(o, i, t)); }
  return [p.cols.map(c => c[0]), ...lines];
}
function loadImg(src) {
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('圖片載入失敗')); im.src = src; });
}
const pngCache = new Map();
async function renderPng(pid, w, h) {
  const it = item(pid);
  const key = `${pid}|${w}x${h}|${it.photo ? it.photo.length + ':' + it.photo.slice(-24) : 'art'}`;
  if (pngCache.has(key)) return pngCache.get(key);
  const im = await loadImg(it.photo || artUrl(pid));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  if (it.photo) {
    const sr = im.naturalWidth / im.naturalHeight, tr = w / h;
    let sw = im.naturalWidth, sh = im.naturalHeight, sx = 0, sy = 0;
    if (sr > tr) { sw = sh * tr; sx = (im.naturalWidth - sw) / 2; } else { sh = sw / tr; sy = (im.naturalHeight - sh) / 2; }
    g.drawImage(im, sx, sy, sw, sh, 0, 0, w, h);
  } else {
    const grd = g.createRadialGradient(w / 2, h * 0.45, 0, w / 2, h / 2, Math.max(w, h) * 0.75);
    grd.addColorStop(0, '#FFFBF3'); grd.addColorStop(1, '#F1E3CB');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    const s = Math.min(w, h) * 0.94;
    g.drawImage(im, (w - s) / 2, (h - s) / 2, s, s);
  }
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  const bytes = new Uint8Array(await blob.arrayBuffer());
  pngCache.set(key, bytes);
  return bytes;
}
function guideText(pid, platId) {
  const a = adapt(pid, platId), p = a.p, it = a.it;
  const names = imgNames(pid, platId);
  const rows = csvRows(pid, platId, names).length - 1;
  const L = [
    `GreenUP 多平台上架｜${p.name} 上傳說明（示範）`,
    `產生時間：${fmtDate(new Date())} ${fmtTime(new Date())}`,
    `商品：${it.name}（${it.unit}）・貨號 ${skuOf(pid)}`,
    '',
    '■ 檔案內容',
    `- 商品資料-${p.file}.csv：UTF-8（含 BOM）、逗號分隔，${rows} 列商品資料`,
    ...names.map(n => `- ${n}：依平台示範規格輸出的 PNG`),
    '- 上傳說明.txt：本檔案',
    '',
    '■ 上傳步驟（通用流程，實際名稱依平台而異）',
    ...MANUAL_STEPS.map(([t, d], i) => `${i + 1}. ${t}：${d}`),
    '',
    '■ 已自動調整（示範規則）',
    `- 標題：上限 ${p.titleMax}${p.cnt === 'w' ? ' 位元（全形算 2）' : ' 字'}，${a.title.over ? `原文 ${a.title.oLen} 已改寫為 ${a.title.nLen}` : `目前 ${a.title.nLen}`}：${a.title.out}`,
    `- 分類：${a.cat.path}`,
    `- 售價：${money(a.P)}（${S.pricing === 'same' ? '各平台同價' : `依平台費用 ${ps(platId).fee}% 加價並進位到 NT$10`}；費用率為示範假設）`,
    `- 庫存：共用庫存 ${a.pool}，保留安全量 ${p.safety}，可售 ${a.avail}`,
    ...(promoOf(pid) ? [`- 檔期特價：${promoTxt(promoOf(pid))}；${p.promo ? 'CSV 已填入特價與期間欄位' : '此平台範本沒有特價欄位，CSV 以原價填寫，商品描述已註記檔期，請在平台活動後台另設活動價'}`] : []),
    `- 圖片：主圖比例 ${p.img.ratio}、最小邊長 ${p.img.min}px`,
    `- 規格：${a.opts.length <= 1 ? '單一規格' : a.split ? `平台不支援多規格，已拆成 ${a.opts.length} 個商品（每列一個）` : `${a.opts.length} 個選項`}`,
    '',
    '■ 注意事項',
    '- 此為 GreenUP 參考格式，並非平台官方範本；欄位名稱、順序與必填項目請對照平台最新的大量上架範本，必要時逐欄複製貼上。',
    FOODLBL ? '- 食品類商品請確認成分、過敏原、保存期限、食品業者登錄字號等標示與實際包裝一致。' : `- 請確認${FIELD_LABEL.ingredients}、尺寸、保固與使用說明等標示與實際商品一致。`,
    '- 主圖請勿加入文字、浮水印或聯絡方式（依平台規範為準）。',
    '- 若用 Excel 開啟出現亂碼，請改用「從文字／CSV 匯入」並選擇 UTF-8 編碼。',
    `- ${DISCLAIMER}`,
  ];
  if (a.missing.length) L.push('', `⚠ 尚缺資料：${a.missing.map(k => FIELD_LABEL[k]).join('、')}。檔案中以「（待補）」或空白表示，上傳前請先補齊。`);
  return '﻿' + L.join('\r\n') + '\r\n';
}
async function platformFiles(pid, platId, prefix = '') {
  const p = pl(platId);
  const names = imgNames(pid, platId);
  const files = [{ name: `${prefix}商品資料-${p.file}.csv`, data: toCSV(csvRows(pid, platId, names)) }];
  for (let i = 0; i < p.img.out.length; i++) {
    const [w, h] = p.img.out[i];
    files.push({ name: prefix + names[i], data: await renderPng(pid, w, h) });
  }
  files.push({ name: `${prefix}上傳說明.txt`, data: guideText(pid, platId) });
  return files;
}
const ymd = () => { const d = new Date(); return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`; };
async function buildZip(platId) {
  const pid = S.pid;
  const files = await platformFiles(pid, platId);
  const bytes = zipBytes(files);
  const z = { pid, name: `GreenUP-${pl(platId).file}-${item(pid).name}-${ymd()}.zip`, blob: new Blob([bytes], { type: 'application/zip' }), size: bytes.length, files: files.map(f => f.name) };
  S.zips[platId] = z;
  return z;
}

/* ---------- 4. 一鍵上架 ---------- */
function renderPub() {
  const sel = PLATFORMS.filter(p => ps(p.id).sel);
  const nApi = sel.filter(p => ps(p.id).mode === 'api').length;
  $('#mkPub', root).innerHTML = `
    <div class="mk-pub-chips">${PLATFORMS.map(p => { const a = adapt(S.pid, p.id); const s = ps(p.id); return `<label class="mk-pchip ${s.sel ? 'on' : ''}" style="--c:${p.color}"><input type="checkbox" data-sel="${p.id}" ${s.sel ? 'checked' : ''}>${logo(p, 'xs')}<span>${esc(p.name)}</span>${s.mode === 'api' ? svg(I.zap, 12) : svg(I.pkg, 12)}${stIcon(a.worst, 10)}</label>`; }).join('')}</div>
    <div class="mk-pub-bar">
      <div class="mk-pub-l"><button class="mk-link" id="mkSelAll">全選</button><button class="mk-link" id="mkSelNone">全不選</button><span>${nApi} 個 API 平台直接上架・${sel.length - nApi} 個平台產生上傳檔</span></div>
      <div class="mk-pub-r">
        <button class="btn btn-ghost" id="mkZipAll" ${S.running ? 'disabled' : ''}>${svg(I.pkg, 16)} 全部打包成一個 ZIP</button>
        <button class="btn btn-primary btn-lg mk-go" id="mkGo" ${S.running || !sel.length ? 'disabled' : ''}>${icon('send', 18)} 一次上架 ${sel.length} 個平台</button>
      </div>
    </div>`;
}

const API_STEPS = ['驗證', '上傳圖片', '建立商品', '同步庫存', '已上架（示範）'];
function resRow(id) {
  const p = pl(id), r = S.results[id];
  if (!r) return '';
  const api = r.kind === 'api';
  let body = '', act = '';
  if (api) {
    body = `<div class="mk-steps">${API_STEPS.map((t, i) => `<span class="${i < r.step ? 'done' : i === r.step && r.state === 'run' ? 'now' : ''} ${r.state === 'fail' && i === r.step ? 'fail' : ''}">${i < r.step ? svg(I.ok, 11) : ''}${t}</span>`).join('<i></i>')}</div>`;
    if (r.state === 'fail') act = `<button class="btn btn-primary btn-sm" data-fix="${id}">${svg(I.edit, 13)} 補填後重試</button>`;
    if (r.state === 'done') act = `<span class="mk-done">${icon('check', 14)} 已上架（示範）</span>`;
  } else {
    const z = S.zips[id];
    body = r.state === 'run'
      ? `<div class="mk-gen"><span class="mk-spin"></span>${esc(r.msg || '產生檔案中…')}</div>`
      : `<div class="mk-files">${z ? z.files.map(f => `<span>${/\.csv$/.test(f) ? svg(I.csv, 12) : /\.png$/.test(f) ? svg(I.img, 12) : svg(I.txt, 12)}${esc(f)}</span>`).join('') : ''}<em>${z ? fmtBytes(z.size) : ''}</em></div>`;
    if (r.state !== 'run') {
      const st = S.status[S.pid][id];
      act = `<button class="btn btn-primary btn-sm" data-dl="${id}">${svg(I.dl, 14)} 下載 ZIP</button>
        <button class="btn btn-ghost btn-sm" data-guide="${id}">${icon('book', 13)} 手動上傳教學</button>
        ${st === 'live' ? `<span class="mk-done">${icon('check', 14)} 已上架</span>` : st === 'review' ? `<span class="mk-done rv">審核中…</span>` : `<button class="btn btn-ghost btn-sm" data-mark="${id}" ${r.missing ? 'disabled title="請先補齊資料"' : ''}>${icon('check', 13)} 上傳完成，標記為已上架</button>`}`;
    }
  }
  const msg = r.state === 'fail' ? `<small class="bad">需補資料：${esc(r.missing)}</small>` : r.missing && !api ? `<small class="warn">檔案已產生，但仍缺：${esc(r.missing)}（上傳前請補齊）</small>` : `<small>${api ? (r.note || 'API 一鍵上架') : '打包檔案手動上傳'}</small>`;
  return `<div class="mk-rr ${r.state}" data-rr="${id}" style="--c:${p.color}">
    ${logo(p)}
    <div class="mk-rr-main"><div class="mk-rr-t"><b>${esc(p.name)}</b>${msg}</div>${body}<div class="mk-bar"><i style="width:${r.pct}%"></i></div></div>
    <div class="mk-rr-act">${act}</div>
  </div>`;
}
function renderRes(id) {
  const host = $('#mkRes', root);
  if (id) { const n = $(`[data-rr="${id}"]`, host); if (n) { n.outerHTML = resRow(id); return; } }
  const ids = Object.keys(S.results);
  host.innerHTML = ids.length ? `<div class="mk-res-h"><b>上架進度</b><small>${esc(item(S.results[ids[0]].pid || S.pid).name)}</small></div>` + ids.map(resRow).join('') : '';
}

async function runApi(id) {
  const r = S.results[id];
  const a = adapt(S.pid, id);
  const s = ps(id);
  r.state = 'run'; r.step = 0; r.pct = 4; renderRes(id);
  if (!s.connected) { r.note = '尚未授權，先進行示範授權…'; renderRes(id); await sleep(900); s.connected = true; renderPlats(); renderKpis(); r.note = '已完成示範授權'; }
  await sleep(500);
  if (a.missing.length) {
    r.state = 'fail'; r.missing = a.missing.map(k => FIELD_LABEL[k]).join('、'); r.pct = 12;
    setStatus(S.pid, id, 'miss'); renderRes(id); return;
  }
  for (let i = 0; i < API_STEPS.length; i++) {
    r.step = i; r.pct = Math.round((i + 0.5) / API_STEPS.length * 100); renderRes(id);
    await sleep(380 + Math.random() * 360);
  }
  r.step = API_STEPS.length; r.pct = 100; r.state = 'done'; renderRes(id);
  setStatus(S.pid, id, 'live');
}
async function runFile(id) {
  const r = S.results[id];
  const a = adapt(S.pid, id);
  r.state = 'run'; r.pct = 10; r.msg = 'AI 依平台規則調整欄位…'; renderRes(id);
  await sleep(350);
  r.pct = 40; r.msg = `產生 CSV 與 ${pl(id).img.out.length} 張 PNG（canvas 輸出）…`; renderRes(id);
  try {
    await buildZip(id);
  } catch (e) {
    r.state = 'fail'; r.missing = '圖片輸出失敗，請改用 AI 插圖再試'; r.pct = 40; renderRes(id); return;
  }
  r.pct = 80; r.msg = '打包 ZIP…'; renderRes(id);
  await sleep(300);
  r.pct = 100; r.state = 'ready'; r.missing = a.missing.length ? a.missing.map(k => FIELD_LABEL[k]).join('、') : '';
  setStatus(S.pid, id, a.missing.length ? 'miss' : 'todo');
  renderRes(id);
}
async function publishAll() {
  if (S.running) return;
  const ids = PLATFORMS.filter(p => ps(p.id).sel).map(p => p.id);
  if (!ids.length) { toast('請先勾選要上架的平台', '', { kind: 'warn', icon: icon('alert', 18) }); return; }
  S.running = true;
  S.results = {};
  ids.forEach(id => { S.results[id] = { pid: S.pid, kind: ps(id).mode, state: 'wait', step: 0, pct: 0 }; });
  renderPub(); renderRes();
  gsap.fromTo($$('.mk-rr', root), { opacity: 0, x: -14 }, { opacity: 1, x: 0, stagger: 0.04, duration: 0.35 });
  try {
    await Promise.all(ids.map((id, i) => sleep(i * 140).then(() => (ps(id).mode === 'api' ? runApi(id) : runFile(id)))));
  } catch (e) { /* 單一平台失敗不影響其他 */ }
  S.running = false;
  S.lastSync = new Date();
  renderPub(); renderKpis(); renderStatus();
  const nApi = ids.filter(id => S.results[id].kind === 'api' && S.results[id].state === 'done').length;
  const nFile = ids.filter(id => S.results[id].kind === 'file' && S.results[id].state === 'ready').length;
  const nMiss = ids.filter(id => S.results[id].missing).length;
  toast(`已處理 ${ids.length} 個平台（示範）`, `${nApi} 個 API 已上架・${nFile} 個上傳檔可下載${nMiss ? `・${nMiss} 個需補資料` : ''}`, { icon: icon('check', 18), kind: nMiss ? 'warn' : 'ok' });
}
async function zipAll() {
  const btn = $('#mkZipAll', root);
  let ids = PLATFORMS.filter(p => ps(p.id).sel && ps(p.id).mode === 'file').map(p => p.id);
  if (!ids.length) ids = PLATFORMS.filter(p => ps(p.id).mode === 'file').map(p => p.id);
  if (!ids.length) { toast('沒有使用檔案上傳的平台', '', { kind: 'info', icon: icon('alert', 18) }); return; }
  if (btn) { btn.disabled = true; btn.innerHTML = `<span class="mk-spin"></span> 打包 ${ids.length} 個平台中…`; }
  try {
    const pid = S.pid;
    const files = [];
    const overview = [`GreenUP 多平台上架｜打包總覽（示範）`, `商品：${item(pid).name}（${item(pid).unit}）`, `產生時間：${fmtDate(new Date())} ${fmtTime(new Date())}`, '', '■ 內含平台'];
    for (const id of ids) {
      const a = adapt(pid, id);
      overview.push(`- ${pl(id).name}：資料夾「${pl(id).file}/」・售價 ${money(a.P)}・可售 ${a.avail}${a.missing.length ? `・尚缺 ${a.missing.map(k => FIELD_LABEL[k]).join('、')}` : ''}`);
      files.push(...await platformFiles(pid, id, `${pl(id).file}/`));
    }
    overview.push('', '每個資料夾內有 CSV、圖片與上傳說明，請依各平台說明手動上傳。', 'CSV 為 GreenUP 參考格式，請對照各平台最新範本。', DISCLAIMER);
    files.unshift({ name: '00-總覽.txt', data: '﻿' + overview.join('\r\n') + '\r\n' });
    const bytes = zipBytes(files);
    downloadBlob(new Blob([bytes], { type: 'application/zip' }), `GreenUP-多平台上傳檔-${item(pid).name}-${ymd()}.zip`);
    toast('已打包成一個 ZIP', `${ids.length} 個平台・${files.length} 個檔案・${fmtBytes(bytes.length)}`, { icon: svg(I.pkg, 18) });
  } catch (e) {
    toast('打包失敗', '請改用 AI 插圖或重新整理後再試', { kind: 'warn', icon: icon('alert', 18) });
  }
  renderPub();
}
async function downloadOne(id) {
  let z = S.zips[id];
  if (!z || z.pid !== S.pid) z = await buildZip(id);
  downloadBlob(z.blob, z.name);
  toast(`已下載 ${pl(id).name} 上傳檔`, `${z.files.length} 個檔案・${fmtBytes(z.size)}`, { icon: svg(I.dl, 18) });
}
function markUploaded(id) {
  const pid = S.pid;
  setStatus(pid, id, 'review');
  renderRes(id);
  toast(`${pl(id).name}：已標記上傳完成`, '狀態改為「審核中」，平台審核通過後會轉為已上架（示範）', { kind: 'info', icon: icon('clock', 18) });
  setTimeout(() => {
    if (S.status[pid][id] !== 'review') return;
    setStatus(pid, id, 'live');
    if (S.pid === pid) renderRes(id);
    toast(`${pl(id).name}：${item(pid).name} 已上架`, '示範：模擬平台審核通過', { icon: icon('check', 18) });
  }, 2600);
}
function setStatus(pid, id, st) {
  S.status[pid][id] = st;
  const cell = root && $(`[data-stc="${pid}|${id}"]`, root);
  if (cell) { cell.className = `mk-pill p-${st}`; cell.textContent = ST_LABEL[st]; gsap.fromTo(cell, { scale: 1.3 }, { scale: 1, duration: 0.45, ease: 'back.out(3)' }); }
  renderPriceChk();
}

/* ---------- 5. 狀態總表、價差 ---------- */
function renderStatus() {
  $('#mkSt', root).innerHTML = `<thead><tr><th>商品</th>${PLATFORMS.map(p => `<th title="${esc(p.name)}">${logo(p, 'xs')}</th>`).join('')}<th class="r">已上架</th></tr></thead><tbody>${PIDS.map(pid => {
    const st = S.status[pid];
    const live = PLATFORMS.filter(p => st[p.id] === 'live').length;
    return `<tr class="${pid === S.pid ? 'on' : ''}"><th><button class="mk-st-p" data-pick="${pid}">${artSVG(pid, 26)}<span>${esc(item(pid).name)}</span></button></th>${PLATFORMS.map(p => `<td><span class="mk-pill p-${st[p.id]}" data-stc="${pid}|${p.id}">${ST_LABEL[st[p.id]]}</span></td>`).join('')}<td class="r"><b>${live}</b><i class="mk-of10">/${PLATFORMS.length}</i></td></tr>`;
  }).join('')}</tbody>`;
  renderPriceChk();
}
function spreadOf(pid) {
  const st = S.status[pid];
  const on = PLATFORMS.filter(p => st[p.id] !== 'none');
  if (on.length < 2) return null;
  const list = on.map(p => ({ p, P: priceOf(+item(pid).price || 0, p.id) }));
  const min = list.reduce((a, b) => (b.P < a.P ? b : a)), max = list.reduce((a, b) => (b.P > a.P ? b : a));
  return { min, max, pct: min.P ? (max.P - min.P) / min.P : 0 };
}
function renderPriceChk() {
  const host = root && $('#mkPriceChk', root);
  if (!host) return;
  const rows = PIDS.map(pid => ({ pid, s: spreadOf(pid) })).filter(x => x.s);
  const warn = rows.filter(x => x.s.pct > 0.15);
  host.innerHTML = `<div class="mk-pc-head"><b>${icon('percent', 15)} 價格一致性檢查</b><small>同一商品各平台價差超過 15% 會提醒（示範門檻）</small>
      <button class="btn btn-ghost btn-sm" data-pr="${S.pricing === 'same' ? 'markup' : 'same'}">${S.pricing === 'same' ? '改回依費用加價' : '改為全平台同價'}</button></div>
    <div class="mk-spreads">${rows.map(({ pid, s }) => `<div class="mk-spread ${s.pct > 0.15 ? 'warn' : ''}"><span>${esc(item(pid).name)}</span><div class="mk-spread-bar"><i style="width:${Math.min(100, s.pct / 0.4 * 100)}%"></i></div><b>${s.pct ? `${Math.round(s.pct * 100)}%` : '同價'}</b><small>${s.pct ? `${esc(s.min.p.short)} ${s.min.P} ～ ${esc(s.max.p.short)} ${s.max.P}` : money(s.min.P)}</small></div>`).join('')}</div>
    ${warn.length ? `<p class="mk-pc-tip">${icon('alert', 14)} ${warn.length} 項商品在高費率平台的售價比官網高 15% 以上，消費者比價時可能觀感不佳；可改為同價、或只對高費率平台調整運費門檻。</p>` : `<p class="mk-pc-tip ok">${icon('check', 14)} 各平台價差都在 15% 以內。</p>`}`;
}

/* ---------- 共用庫存同步 ---------- */
function renderSync() {
  const pid = S.pid, it = item(pid);
  const pool = poolOf(pid);
  const n = PLATFORMS.length;
  const pos = PLATFORMS.map((p, i) => { const a = (i / n) * Math.PI * 2 - Math.PI / 2; return { p, x: 50 + Math.cos(a) * 40, y: 50 + Math.sin(a) * 40 }; });
  $('#mkSync', root).innerHTML = `
    <div class="mk-ring" id="mkRing">
      <svg class="mk-ring-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${pos.map(({ x, y }) => `<line x1="50" y1="50" x2="${x}" y2="${y}"/>`).join('')}<circle cx="50" cy="50" r="40"/></svg>
      <div class="mk-pool"><small>共用庫存</small><b id="mkPoolN">${pool}</b><span>${esc(it.name)}</span></div>
      ${pos.map(({ p, x, y }) => `<div class="mk-node" data-node="${p.id}" style="left:${x}%;top:${y}%;--c:${p.color}">${logo(p, 'sm')}<b data-av="${p.id}">${Math.max(0, pool - p.safety)}</b></div>`).join('')}
    </div>
    <div class="mk-sync-ctl">
      <select id="mkSellFrom" aria-label="賣出平台">${PLATFORMS.map(p => `<option value="${p.id}" ${p.id === (S.sellFrom || 'shopee') ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>
      <button class="btn btn-primary btn-sm" id="mkSell">${icon('cart', 14)} 模擬${esc(pl(S.sellFrom || 'shopee').name.replace(/ .*/, ''))}賣出 1 件</button>
    </div>
    <ul class="mk-log" id="mkLog">${S.syncLog.length ? S.syncLog.map(l => `<li><time>${l.t}</time>${esc(l.text)}</li>`).join('') : '<li class="empty">按上方按鈕，或在其他頁面建立訂單，可看到所有平台同步扣減。</li>'}</ul>`;
}
let syncBusy = Promise.resolve();
function sellOne(fromId, qty = 1, label) {
  syncBusy = syncBusy.then(() => doSell(fromId, qty, label)).catch(() => {});
}
async function doSell(fromId, qty, label) {
  const pid = S.pid, it = item(pid);
  if (poolOf(pid) <= 0) { toast('共用庫存已為 0', '所有平台已自動暫停販售（示範）', { kind: 'warn', icon: icon('alert', 18) }); return; }
  const ring = root && $('#mkRing', root);
  const from = ring && $(`[data-node="${fromId}"]`, ring);
  if (ring && from && !root.closest('section').hidden && gsap) {
    const dot = el('<i class="mk-dot"></i>');
    ring.appendChild(dot);
    gsap.set(dot, { left: from.style.left, top: from.style.top });
    from.classList.add('sold');
    await new Promise(r => gsap.to(dot, { left: '50%', top: '50%', duration: 0.55, ease: 'power2.in', onComplete: r }));
    dot.remove(); from.classList.remove('sold');
  }
  it.stock = Math.max(0, (+it.stock || 0) - qty);
  const pool = poolOf(pid);
  const pn = root && $('#mkPoolN', root);
  if (pn) { pn.textContent = pool; gsap.fromTo(pn.parentElement, { scale: 1.15 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' }); }
  if (ring && gsap) {
    PLATFORMS.forEach((p, i) => {
      if (p.id === fromId) return;
      const node = $(`[data-node="${p.id}"]`, ring);
      if (!node) return;
      const d = el('<i class="mk-dot out"></i>'); ring.appendChild(d);
      gsap.set(d, { left: '50%', top: '50%' });
      gsap.to(d, { left: node.style.left, top: node.style.top, duration: 0.5, delay: i * 0.03, ease: 'power2.out', onComplete: () => { d.remove(); node.classList.remove('hit'); void node.offsetWidth; node.classList.add('hit'); } });
    });
  }
  PLATFORMS.forEach(p => { const b = root && $(`[data-av="${p.id}"]`, root); if (b) b.textContent = Math.max(0, pool - p.safety); });
  S.lastSync = new Date();
  const lt = $('#mkLastSync', root); if (lt) lt.textContent = fmtTime(S.lastSync);
  S.syncLog.unshift({ t: fmtTime(new Date()), text: `${label || pl(fromId).name} 賣出 ${it.name} ×${qty} → 共用庫存剩 ${pool}，已同步其他 ${PLATFORMS.length - 1} 個平台（示範）` });
  S.syncLog = S.syncLog.slice(0, 5);
  const log = root && $('#mkLog', root);
  if (log) { log.innerHTML = S.syncLog.map(l => `<li><time>${l.t}</time>${esc(l.text)}</li>`).join(''); gsap.from(log.firstElementChild, { opacity: 0, y: -8, duration: 0.4 }); }
  const fs = root && $('#mkForm [data-f="stock"]', root); if (fs) fs.value = it.stock;
  scheduleRecalc(['matrix', 'detail', 'pub']);
}

/* ---------- 6. 訂單彙整 ---------- */
function renderOrders() {
  $('#mkOrders', root).innerHTML = `
    <div class="mk-of">
      <div class="mk-of-src">${PLATFORMS.map(p => logo(p, 'sm')).join('')}<small>各平台訂單</small></div>
      <div class="mk-of-arrow"><i></i><span>API 自動拉單<br>或匯入平台訂單報表</span></div>
      <div class="mk-of-hub"><span class="mk-of-ic">${icon('db', 22)}</span><b>GreenUP 訂單中心</b><small>對應商品貨號・扣共用庫存・記帳（示範）</small></div>
      <div class="mk-of-arrow"><i></i></div>
      <div class="mk-of-go">
        <button class="mk-of-btn" data-go="pos">${icon('pos', 18)}<span><b>POS 收銀台／訂單</b><small>與門市、LINE 訂單一起看</small></span>${icon('arrow', 14)}</button>
        <button class="mk-of-btn" data-go="shipping">${icon('truck', 18)}<span><b>出貨物流</b><small>各平台訂單統一揀貨、印託運單</small></span>${icon('arrow', 14)}</button>
        <button class="mk-of-btn" data-go="listing">${icon('sparkle', 18)}<span><b>AI 商品上架</b><small>拍照產生文案，再送到這裡多平台上架</small></span>${icon('arrow', 14)}</button>
      </div>
    </div>
    <p class="mk-note">API 平台的訂單會自動進入 GreenUP；使用檔案上傳的平台，可定期下載平台訂單報表，用「資料搬家」匯入（<button class="mk-link" data-go="import">前往資料搬家</button>）。平台實際可提供的串接與報表格式依各平台規定為準（示範）。</p>`;
}

/* ---------- Modal：補填、教學 ---------- */
function openModal(html) {
  const m = $('#mkModal', root);
  $('.mk-modal-panel', m).innerHTML = html;
  m.hidden = false;
  gsap.fromTo($('.mk-modal-panel', m), { opacity: 0, y: 24, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'power3.out' });
  const f = $('.mk-modal-panel input, .mk-modal-panel textarea', m); if (f) setTimeout(() => { try { f.focus(); } catch { /* ignore */ } }, 50);
}
function closeModal() { const m = root && $('#mkModal', root); if (m) m.hidden = true; }
function openFix(platId) {
  const it = item();
  const keys = platId ? adapt(S.pid, platId).missing : [...new Set(PLATFORMS.flatMap(p => adapt(S.pid, p.id).missing))];
  if (!keys.length) { toast('這個平台的資料已完整', '', { kind: 'info', icon: icon('check', 18) }); return; }
  const affected = PLATFORMS.filter(p => adapt(S.pid, p.id).missing.length).map(p => p.name);
  const field = (k) => {
    if (k === 'fda') return `<label class="mk-fl"><span>食品業者登錄字號</span><input data-mf="fda" value="${esc(it.fda)}" placeholder="例：A-000000000-00000-0"></label><button class="mk-link" data-demo-fda>套用示範字號 ${DEMO_FDA}</button><small class="mk-hint">示範字號僅供展示，正式上架請填實際字號。</small>`;
    if (k === 'weight') return `<label class="mk-fl"><span>重量（g，含包裝）</span><input type="number" min="1" data-mf="weight" value="${esc(it.weight)}" placeholder="例：420"></label>`;
    if (k === 'ingredients') return `<label class="mk-fl"><span>${FIELD_LABEL.ingredients}</span><textarea data-mf="ingredients" rows="2">${esc(it.ingredients)}</textarea></label>`;
    if (k === 'shelf') return `<label class="mk-fl"><span>${FOODLBL ? '保存期限（天）' : FIELD_LABEL.shelf}</span><input type="number" min="1" data-mf="days" value="${esc(it.days)}"></label>`;
    return '';
  };
  openModal(`
    <div class="mk-m-h"><b>${svg(I.edit, 16)} 補填資料：${esc(it.name)}</b><button class="icon-btn mk-m-x" aria-label="關閉">${icon('x', 16)}</button></div>
    <p class="mk-m-p">${platId ? `${esc(pl(platId).name)} 要求以下欄位。` : ''}補一次，所有平台共用：目前影響 ${affected.length} 個平台（${esc(affected.slice(0, 4).join('、'))}${affected.length > 4 ? '…' : ''}）。</p>
    <div class="mk-m-fields">${keys.map(field).join('')}</div>
    <div class="mk-m-f"><button class="btn btn-ghost btn-sm mk-m-x">取消</button><button class="btn btn-primary btn-sm" id="mkFixSave">${icon('check', 14)} 儲存並重新檢核</button></div>`);
}
function saveFix() {
  const it = item();
  const m = $('#mkModal', root);
  $$('[data-mf]', m).forEach(inp => { const k = inp.dataset.mf; it[k] = inp.type === 'number' ? (inp.value === '' ? '' : +inp.value) : inp.value.trim(); });
  closeModal();
  const before = Object.keys(S.results).filter(id => S.results[id].missing);
  renderForm(); renderAll();
  const left = PLATFORMS.filter(p => adapt(S.pid, p.id).missing.length).length;
  toast(left ? `已更新，仍有 ${left} 個平台缺資料` : '資料已補齊，全部平台檢核通過', left ? '請繼續補填' : before.length ? '可再按「一次上架」重新送出' : '', { kind: left ? 'warn' : 'ok', icon: icon(left ? 'alert' : 'check', 18) });
  gsap.fromTo($$('#mkMx .mk-cell', root), { opacity: 0.3 }, { opacity: 1, duration: 0.4, stagger: 0.004 });
}
function openGuide(id) {
  const p = pl(id), a = adapt(S.pid, id);
  const st = S.status[S.pid][id];
  openModal(`
    <div class="mk-m-h"><b>${logo(p, 'sm')} ${esc(p.name)}・手動上傳教學</b><button class="icon-btn mk-m-x" aria-label="關閉">${icon('x', 16)}</button></div>
    <p class="mk-m-p">通用流程，實際功能名稱與位置依平台而異；部分平台需先成為合作廠商或完成賣家審核（依平台規定）。</p>
    <ol class="mk-guide">${MANUAL_STEPS.map(([t, d]) => `<li><b>${t}</b><span>${d}</span></li>`).join('')}</ol>
    <div class="mk-m-note">
      <div><span>本次檔案</span><b>商品資料-${esc(p.file)}.csv＋${p.img.out.map(([w, h]) => `${w}×${h}`).join('、')} PNG＋上傳說明.txt</b></div>
      <div><span>標題</span><b>${esc(a.title.out)}</b></div>
      <div><span>售價／可售</span><b>${money(a.P)}・${a.avail} 件</b></div>
      <div><span>編碼</span><b>UTF-8（含 BOM）；Excel 亂碼請用「從文字／CSV 匯入」</b></div>
    </div>
    <small class="mk-hint">此為 GreenUP 參考格式，欄位請對照平台最新範本。${esc(DISCLAIMER)}</small>
    <div class="mk-m-f"><button class="btn btn-ghost btn-sm" data-dl="${id}">${svg(I.dl, 14)} 下載 ZIP</button>${st === 'live' ? `<span class="mk-done">${icon('check', 14)} 已上架</span>` : `<button class="btn btn-primary btn-sm" data-mark="${id}" ${a.missing.length ? 'disabled title="請先補齊資料"' : ''}>${icon('check', 14)} 上傳完成，標記為已上架</button>`}</div>`);
}

/* ---------- 綁定 ---------- */
function scheduleRecalc(parts = ['matrix', 'detail', 'pub', 'status', 'sync', 'picks']) {
  clearTimeout(recalcT);
  recalcT = setTimeout(() => {
    try {
      if (parts.includes('matrix')) renderMatrix();
      if (parts.includes('detail')) renderDetail();
      if (parts.includes('pub')) renderPub();
      if (parts.includes('status')) renderStatus();
      if (parts.includes('sync')) renderSync();
      if (parts.includes('picks')) renderPicks();
    } catch (e) { console.warn('[market] render', e); }
  }, 160);
}
function renderAll() { renderKpis(); renderPlats(); renderPicks(); renderMatrix(); renderDetail(); renderPub(); renderRes(); renderStatus(); renderSync(); }

function pick(pid) {
  if (!PIDS.includes(pid) || S.running) return;
  S.pid = pid; S.results = {};
  renderPicks(); renderForm(); renderMatrix(); renderDetail(); renderPub(); renderRes(); renderStatus(); renderSync();
  gsap.fromTo($$('#mkMx .mk-cell', root), { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.006 });
  gsap.fromTo('#mkForm', { opacity: 0.4 }, { opacity: 1, duration: 0.4 });
}

function onPhoto(file) {
  if (!file || !/^image\//.test(file.type)) { toast('請選擇圖片檔', '', { kind: 'warn', icon: icon('alert', 18) }); return; }
  const fr = new FileReader();
  fr.onload = async () => {
    try {
      const im = await loadImg(fr.result);
      const it = item();
      it.photo = fr.result; it.photoW = im.naturalWidth; it.photoH = im.naturalHeight;
      renderForm(); scheduleRecalc(['matrix', 'detail', 'pub']);
      toast('已套用商品照片', `${im.naturalWidth}×${im.naturalHeight}・各平台會自動裁切成所需比例`, { icon: svg(I.img, 18) });
    } catch { toast('無法讀取這張圖片', '', { kind: 'warn', icon: icon('alert', 18) }); }
  };
  fr.readAsDataURL(file);
}

function bind() {
  root.addEventListener('click', async (e) => {
    const t = e.target.closest('button, [data-go]');
    if (!t || !root.contains(t)) return;
    const d = t.dataset;
    if (d.go) { e.preventDefault(); goFn && goFn(d.go); return; }
    if (d.pick) { pick(d.pick); return; }
    if (d.mode && d.pid) {
      const s = ps(d.pid); if (s.mode === d.mode || S.running) return;
      s.mode = d.mode; if (d.mode === 'file') s.connected = false;
      renderPlats(); renderKpis(); renderMatrix(); renderDetail(); renderPub();
      toast(`${pl(d.pid).name}：改為${d.mode === 'api' ? ' API 一鍵上架' : '打包檔案手動上傳'}`, d.mode === 'api' ? '示範：假設平台已開放 API，請按「連線（示範授權）」' : '上架時會自動產生 CSV＋圖片 ZIP', { kind: 'info', icon: d.mode === 'api' ? svg(I.zap, 18) : svg(I.pkg, 18) });
      return;
    }
    if (d.conn) {
      const s = ps(d.conn); if (s.connecting) return;
      s.connecting = true; renderPlats();
      await sleep(1300);
      s.connecting = false; s.connected = true; S.lastSync = new Date();
      renderPlats(); renderKpis();
      const card = $(`[data-pc="${d.conn}"]`, root); if (card) gsap.fromTo(card, { boxShadow: `0 0 0 2px ${pl(d.conn).color}` }, { boxShadow: '0 0 0 0px rgba(0,0,0,0)', duration: 1.2 });
      toast(`已連線 ${pl(d.conn).name}（示範授權）`, '示範：未實際連到平台，不會存取任何帳號資料', { icon: svg(I.key, 18) });
      return;
    }
    if (d.sync) {
      S.lastSync = new Date(); renderKpis();
      toast(`${pl(d.sync).name}：已同步（示範）`, '庫存、價格與上架狀態已更新', { icon: svg(I.sync, 18) });
      return;
    }
    if (d.guide) { openGuide(d.guide); return; }
    if (d.pr) { S.pricing = d.pr; scheduleRecalc(['matrix', 'detail', 'pub', 'status']); return; }
    if (d.cell) {
      if (d.k === 'food' && t.classList.contains('miss')) { openFix(d.cell); return; }
      S.detail = d.cell; renderMatrix(); renderDetail();
      if (window.innerWidth <= 1280) { const dt = $('#mkDt', root); dt && dt.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      return;
    }
    if (d.dt) { S.detail = d.dt; renderMatrix(); renderDetail(); return; }
    if (d.fix) { openFix(d.fix); return; }
    if (d.dl) { t.disabled = true; try { await downloadOne(d.dl); } catch { toast('下載失敗', '請重新整理後再試', { kind: 'warn', icon: icon('alert', 18) }); } t.disabled = false; return; }
    if (d.mark) { closeModal(); markUploaded(d.mark); return; }
    if (d.stor) { item().storage = d.stor; renderForm(); scheduleRecalc(); return; }
    if (d.alg) { const it = item(); it.allergens = it.allergens.includes(d.alg) ? it.allergens.filter(x => x !== d.alg) : [...it.allergens, d.alg]; renderForm(); scheduleRecalc(['matrix', 'detail']); return; }
    if (d.vx != null) { item().vars.opts.splice(+d.vx, 1); renderForm(); scheduleRecalc(); return; }
    if (d.demoFda != null) { const inp = $('[data-mf="fda"]', root); if (inp) inp.value = DEMO_FDA; return; }
    if (t.classList.contains('mk-m-x')) { closeModal(); return; }
    switch (t.id) {
      case 'mkGo': publishAll(); break;
      case 'mkZipAll': zipAll(); break;
      case 'mkSelAll': PLATFORMS.forEach(p => { ps(p.id).sel = true; }); renderPub(); renderKpis(); break;
      case 'mkSelNone': PLATFORMS.forEach(p => { ps(p.id).sel = false; }); renderPub(); renderKpis(); break;
      case 'mkVarAdd': item().vars.opts.push({ n: '', add: 0 }); renderForm(); { const ins = $$('[data-vn]', root); const last = ins[ins.length - 1]; last && last.focus(); } break;
      case 'mkUseArt': { const it = item(); it.photo = null; it.photoW = it.photoH = 0; renderForm(); scheduleRecalc(['matrix', 'detail', 'pub']); break; }
      case 'mkFdaDemo': item().fda = DEMO_FDA; renderForm(); scheduleRecalc(); toast('已套用示範字號', '正式上架前請改成實際的食品業者登錄字號', { kind: 'info', icon: icon('alert', 18) }); break;
      case 'mkFixSave': saveFix(); break;
      case 'mkSell': sellOne($('#mkSellFrom', root).value); break;
      case 'mkFromLs': fromListing(); break;
      case 'mkGoLs': goFn && goFn('listing'); break;
      default: break;
    }
  });
  root.addEventListener('input', (e) => {
    const t = e.target;
    const it = item();
    if (t.dataset.f) {
      const k = t.dataset.f;
      if (k === 'varLabel') it.vars.label = t.value;
      else it[k] = t.type === 'number' ? (t.value === '' ? '' : +t.value) : t.value;
      if (['weight', 'ingredients', 'fda'].includes(k)) { const lab = t.closest('.mk-fl'); lab && lab.classList.toggle('need', emptyField(it, k)); }
      scheduleRecalc(k === 'name' || k === 'price' ? undefined : ['matrix', 'detail', 'pub', 'status', 'sync']);
    } else if (t.dataset.vn != null) { it.vars.opts[+t.dataset.vn].n = t.value; scheduleRecalc(['matrix', 'detail', 'pub']); }
    else if (t.dataset.va != null) { it.vars.opts[+t.dataset.va].add = +t.value || 0; scheduleRecalc(['matrix', 'detail', 'pub']); }
    else if (t.dataset.fee) {
      const v = Math.max(0, Math.min(60, +t.value || 0));
      ps(t.dataset.fee).fee = v;
      scheduleRecalc(['matrix', 'detail', 'pub', 'status']);
    }
  });
  root.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'mkFile') { onPhoto(t.files && t.files[0]); t.value = ''; }
    else if (t.dataset.sel) { ps(t.dataset.sel).sel = t.checked; renderPub(); renderKpis(); }
    else if (t.id === 'mkSellFrom') { S.sellFrom = t.value; const b = $('#mkSell', root); if (b) b.innerHTML = `${icon('cart', 14)} 模擬${esc(pl(t.value).name.replace(/ .*/, ''))}賣出 1 件`; }
    else if (t.dataset.fee) { const v = ps(t.dataset.fee).fee; if (String(v) !== t.value) t.value = v; }
  });
  $('.mk-modal-bg', root).addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
}

async function fromListing() {
  const it = item(), c = COPY[S.pid] && COPY[S.pid].zh;
  if (!c) return;
  it.name = c[0]; it.point = c[1]; it.desc = c[2];
  renderForm();
  const box = $('[data-f="desc"]', root);
  if (box) { box.value = ''; for (let i = 0; i <= c[2].length; i += 6) { box.value = c[2].slice(0, i); await sleep(12); } box.value = c[2]; }
  scheduleRecalc();
  toast('已帶入 AI 商品上架的文案', '名稱、賣點、描述已更新，各平台標題重新改寫', { icon: icon('sparkle', 18) });
}

let goFn = null;
export default {
  mount(section, { go } = {}) {
    root = section; goFn = go;
    PIDS.forEach(pid => item(pid));
    section.innerHTML = layout();
    renderForm(); renderOrders(); renderAll();
    bind();
    mounted = true;
    onPromos(() => { S.zips = {}; renderAll(); });
    store.on('order', ({ order }) => {
      try {
        for (const li of order.items || []) {
          if (!S.items[li.pid]) continue;
          if (li.pid === S.pid) sellOne('web', li.qty, `GreenUP 訂單 ${order.id}`);
          else S.items[li.pid].stock = Math.max(0, (+S.items[li.pid].stock || 0) - li.qty);
        }
      } catch (e) { console.warn('[market] order sync', e); }
    });
    store.on('reset', () => {
      try {
        for (const p of PRODUCTS) { const inv = invOf(p.id); if (inv && S.items[p.id]) S.items[p.id].stock = inv.current; }
        S.syncLog = []; renderForm(); renderSync(); scheduleRecalc(['matrix', 'detail', 'pub']);
      } catch (e) { console.warn('[market] reset', e); }
    });
  },
  show() {
    if (!mounted) return;
    if (S.firstShow) {
      S.firstShow = false;
      setTimeout(() => {
        if (!root || root.hidden) return;
        gsap.fromTo($$('#mkMx .mk-cell', root), { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.35, stagger: 0.008, ease: 'back.out(2)' });
        $$('.mk-kpi .kpi-val', root).forEach(n => gsap.fromTo(n, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5 }));
      }, 450);
    }
  },
  hide() { closeModal(); },
};
