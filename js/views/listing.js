// AI 商品上架：拍照／上傳 → AI 生成五語文案、SEO、過敏原、分類 → AI 定價 → 圖片優化 → 一鍵上架各通路（示範，不會真的串接）
import { $, $$, el, gsap, esc, money, sleep, countUp, toast } from '../util.js';
import { icon } from '../icons.js';
import { store } from '../state.js';
import { PRODUCTS, PRODUCT_MAP, startOfDay, addDays } from '../data.js';
import { productArt } from '../art.js';
import { makeChart } from '../charts.js';
import { MAT, LABOR_RATE, bom } from '../inventory-data.js';
import {
  LS_LANGS, NEW_PRODUCT, NEW_BOM, COPY, KW, hashtags, ALG_I18N, STORE_I18N, UI_I18N, META, LS_CH, buildListed, LANG_FUNNEL, yuzuArt,
} from '../listing-data.js';

/* ---------- 內嵌圖示 ---------- */
const svg = (d, s = 18, extra = '') => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
const I = {
  camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.6"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  crop: '<path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M2 6h14a2 2 0 0 1 2 2v14"/>',
  tag: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.4"/>',
  hash: '<path d="M5 9h15M4 15h15M10 3 8 21M16 3l-2 18"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',
  comment: '<path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.4 8.4 0 1 1 21 11.5z"/>',
  share: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
  save: '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
  star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
  pin: '<path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  route: '<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H17a3.5 3.5 0 0 0 0-7H7a3.5 3.5 0 0 1 0-7h8.5"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
};

/* ---------- 狀態 ---------- */
const S = {
  pid: 'yuzu', photo: null, photoName: '', lang: 'zh', margin: 60, plan: 'std', bg: 'studio', ba: 50,
  chOn: { web: true, line: true, ig: true, shopee: true, google: true },
  gen: 0, generated: false, generating: false, publishing: false, published: false,
  t0: 0, listed: buildListed(), langDone: new Set(),
};
let root, chart, timerId;
const BG = [
  { id: 'studio', name: '純白攝影棚' },
  { id: 'cream', name: '奶油粉彩' },
  { id: 'marble', name: '大理石桌面' },
  { id: 'forest', name: '森林綠' },
];
const STEP_TXT = ['上傳圖片・自動裁切', '寫入五語文案與 SEO', '同步價格與庫存', '發布'];

const prod = (pid = S.pid) => pid === 'yuzu' ? NEW_PRODUCT : PRODUCT_MAP[pid];
const copy = (lang = S.lang, pid = S.pid) => COPY[pid][lang];
const artSVG = (pid, size) => pid === 'yuzu' ? yuzuArt(size) : productArt(pid, size);
const svgCache = {};
function artUrl(pid) {
  if (!svgCache[pid]) svgCache[pid] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(artSVG(pid, 600).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '));
  return svgCache[pid];
}
const imgSrc = () => S.photo || artUrl(S.pid);
const round10 = (n) => Math.round(n / 10) * 10;
const volUnit = (p) => /入|片/.test(p.unit) ? '盒' : /吋/.test(p.unit) ? '個' : p.unit.replace(/^[\d\s]+/, '');
const fmtN = (n) => Math.round(n).toLocaleString('en-US');

/* ---------- 成本、定價模型 ---------- */
function costInfo(pid = S.pid) {
  if (pid === 'yuzu') {
    const rows = NEW_BOM.lines.map(([mid, q]) => {
      const m = MAT[mid] || NEW_BOM.extra[mid];
      return { name: m.name, unit: m.unit, qty: q, cost: m.cost, sub: q * m.cost, cat: m.cat, isNew: !MAT[mid] };
    });
    const raw = rows.filter(r => r.cat === 'raw').reduce((s, r) => s + r.sub, 0);
    const pack = rows.filter(r => r.cat === 'pack').reduce((s, r) => s + r.sub, 0);
    const labor = NEW_BOM.labor * LABOR_RATE;
    const total = Math.round(raw + pack + labor + NEW_BOM.mfg);
    return { total, parts: [['原料', raw], ['包材', pack], ['人工', labor], ['製造費用', NEW_BOM.mfg]], src: 'BOM 估算（8 項原料・人工 9 分鐘）', rows };
  }
  const p = PRODUCT_MAP[pid];
  const b = bom(pid);
  const k = p.cost / b.total;
  return { total: p.cost, parts: [['原料', b.raw * k], ['包材', b.pack * k], ['人工', b.labor * k], ['製造費用', b.mfg * k]], src: '商品主檔成本（與 BOM 連動）', rows: null };
}
function baseInfo(pid = S.pid) {
  const now = new Date();
  const list = store.ordersBetween(addDays(startOfDay(now), -29), addDays(startOfDay(now), 1));
  const qtyOf = (id) => list.reduce((s, o) => s + o.items.filter(it => it.pid === id).reduce((a, it) => a + it.qty, 0), 0);
  if (pid === 'yuzu') return { vol: Math.max(40, Math.round(qtyOf('lemon') * 0.55)), ref: META.yuzu.range[1], cur: null };
  const p = PRODUCT_MAP[pid];
  return { vol: Math.max(20, qtyOf(pid)), ref: p.price, cur: p.price };
}
const E = 1.6;
function volAt(P, base, range) {
  let v = base.vol * Math.pow(base.ref / P, E);
  if (P > range[2]) v *= Math.exp(-(P - range[2]) / range[2] * 2.5);
  return v;
}
const priceFor = (cost, m) => round10(cost / (1 - m / 100) * 1.05);
function plans() {
  const c = costInfo(); const base = baseInfo(); const range = META[S.pid].range;
  const mk = (id, name, m, extraCost, volK, note) => {
    const cost = c.total + extraCost;
    const P = priceFor(cost, Math.min(85, Math.max(15, m)));
    const net = P / 1.05;
    const unit = net - cost;
    const vol = Math.round(volAt(P, base, range) * volK);
    return { id, name, P, cost, unit, mgn: unit / net * 100, vol, month: unit * vol, note };
  };
  return [
    mk('lite', '薄利多銷', S.margin - 12, 0, 1, '衝新客、搭配組合價'),
    mk('std', '標準', S.margin, 0, 1, '日常販售・AI 推薦'),
    mk('prem', '精品', S.margin + 10, 18, 0.9, '精裝禮盒＋手寫卡'),
  ];
}
const curPlan = () => plans().find(p => p.id === S.plan);

/* ---------- 版面 ---------- */
function layout() {
  return `
  <div class="ls">
    <div class="ls-head glass anim-in">
      <div class="ls-head-l">
        <span class="ls-logo">${icon('wand', 24)}</span>
        <div><b>拍一張照，AI 幫你上架到 5 個通路</b>
        <p>AI 看照片寫好<b>五種語言</b>的介紹、算好<b>建議售價</b>、裁好各通路圖片，一鍵同步上架。手動上架一件商品約 50 分鐘，現在 1 分鐘。</p></div>
      </div>
      <div class="ls-head-r"><span class="demo-badge">${icon('flask', 14)} 示範資料</span><span class="chip-sm">${icon('shield', 13)} 示範流程・不會真的發布到各平台</span></div>
    </div>

    <div class="ls-steps glass anim-in" id="lsSteps">
      ${[['1', '拍照或選商品', 'camera'], ['2', 'AI 生成文案與定價', 'sparkle'], ['3', '選通路一鍵上架', 'send']].map(([n, t, ic], i) => `
        <button class="ls-step" data-s="${n}" data-go="lsStep${n}"><span class="ls-step-n">${n}</span><span class="ls-step-t"><small>步驟 ${n}</small><b>${t}</b></span><span class="ls-step-ic">${ic === 'camera' ? svg(I.camera, 18) : icon(ic, 18)}</span></button>
        ${i < 2 ? '<i class="ls-step-line"><u></u></i>' : ''}`).join('')}
      <div class="ls-timer"><small>本次上架用時</small><b id="lsTimer">00:00</b><span>手動約 50 分鐘</span></div>
    </div>

    <div class="ls-row ls-row1">
      <div class="glass card ls-shot anim-in" id="lsStep1">
        <div class="card-h"><h3><span class="ls-num">1</span> 商品照片</h3><span class="chip-sm" id="lsShotTag">新品・尚未上架</span></div>
        <div class="ls-stage" id="lsStage">
          <img id="lsMainImg" alt="商品照片">
          <div class="ls-scan" id="lsScan"><i></i></div>
          <div class="ls-box" id="lsBox"><b></b><b></b><b></b><b></b></div>
          <div class="ls-see" id="lsSee"></div>
          <div class="ls-drop">${svg(I.upload, 26)}<b>放開以上傳照片</b></div>
        </div>
        <div class="ls-upbtns">
          <label class="btn btn-primary ls-up">${svg(I.camera, 17)} 拍照<input type="file" accept="image/*" capture="environment" id="lsCam" hidden></label>
          <label class="btn btn-ghost ls-up">${svg(I.upload, 17)} 上傳商品照<input type="file" accept="image/*" id="lsFile" hidden></label>
          <small>也可以直接把照片拖進上方框框</small>
        </div>
        <div class="ls-pick-h">或直接選商品（現有商品可重新優化上架）</div>
        <div class="ls-pick" id="lsPick">
          ${['yuzu', ...PRODUCTS.map(p => p.id)].map(id => `<button class="ls-pp" data-pid="${id}">${artSVG(id, 36)}<span>${esc(prod(id).name)}</span>${id === 'yuzu' ? '<em>新品</em>' : ''}</button>`).join('')}
        </div>
      </div>

      <div class="glass card ls-gen anim-in" id="lsStep2">
        <div class="ls-glow"></div>
        <div class="card-h"><h3><span class="ls-num">2</span> AI 生成上架內容</h3>
          <div class="ls-gen-r"><span class="ls-gen-st" id="lsGenSt"></span><button class="btn btn-ghost btn-sm" id="lsRegen">${icon('refresh', 14)} 重新生成</button></div></div>
        <div class="ls-langs" id="lsLangs">${LS_LANGS.map(l => `<button class="ls-lang" data-lang="${l.id}"><span>${l.label}</span><i></i></button>`).join('')}</div>
        <div class="ls-copy" id="lsCopy">
          <div class="ls-f"><label>商品名稱</label><h2 class="ls-name" id="lsName"></h2></div>
          <div class="ls-f"><label>一句話賣點</label><p class="ls-tag" id="lsTagline"></p></div>
          <div class="ls-f"><label>完整介紹</label><p class="ls-desc" id="lsDesc"></p></div>
        </div>
        <div class="ls-meta" id="lsMeta">
          <div class="ls-mb"><label>${svg(I.search, 14)} SEO 關鍵字</label><div class="ls-chips" id="lsKw"></div></div>
          <div class="ls-mb"><label>${svg(I.hash, 14)} Hashtag</label><div class="ls-chips ls-ht" id="lsHt"></div></div>
          <div class="ls-mb"><label>${icon('alert', 14)} 過敏原與保存（沿用商品主檔）</label><div id="lsAlg"></div></div>
          <div class="ls-mb"><label>${svg(I.tag, 14)} 建議分類與標籤</label><div id="lsCat"></div></div>
        </div>
      </div>
    </div>

    <div class="ls-row ls-row2">
      <div class="glass card ls-img anim-in">
        <div class="card-h"><h3>${svg(I.image, 18)} AI 圖片優化</h3><span class="chip-sm">示意：去背・換背景・自動裁切</span></div>
        <div class="ls-img-g"><div class="ls-img-l">
        <div class="ls-bgs" id="lsBgs">${BG.map(b => `<button class="ls-bgb" data-bg="${b.id}"><i class="ls-bg-${b.id}"></i>${b.name}</button>`).join('')}</div>
        <div class="ls-ba" id="lsBa" style="--x:50%">
          <div class="ls-ba-before"><div class="ls-mess"><i></i><i></i><i></i></div><img alt="" id="lsBeforeImg"></div>
          <div class="ls-ba-after" id="lsAfter"></div>
          <div class="ls-ba-line"><span>${svg('<path d="m9 6-6 6 6 6M15 6l6 6-6 6"/>', 16)}</span></div>
          <em class="ls-ba-l">原始照片</em><em class="ls-ba-r">AI 優化後</em>
          <input type="range" min="0" max="100" value="50" id="lsBaR" aria-label="前後對比">
        </div>
        </div><div class="ls-img-r">
        <div class="ls-crops-h"><span>${svg(I.crop, 15)} 自動裁切成各通路尺寸</span><button class="btn btn-ghost btn-sm" id="lsRecrop">${icon('wand', 14)} 重新裁切</button></div>
        <div class="ls-crops" id="lsCrops"></div>
        <ul class="ls-fix">${[['去背', '主體分離 99%'], ['白平衡', '暖黃偏色已校正'], ['亮度', '+12%・陰影補光'], ['銳利化', '細節增強'], ['檔案壓縮', '4.8 MB → 380 KB'], ['替代文字', '五語 alt 已寫好']].map(([a, b]) => `<li>${icon('check', 14)}<b>${a}</b><span>${b}</span></li>`).join('')}</ul>
        </div></div>
      </div>

      <div class="glass card ls-price anim-in">
        <div class="card-h"><h3>${icon('coins', 18)} AI 定價建議</h3><span class="chip-sm" id="lsCostSrc"></span></div>
        <div class="ls-pt">
          <div class="ls-cost" id="lsCost"></div>
          <div class="ls-slider">
            <div class="ls-sl-h"><span>目標毛利率</span><b id="lsMgnV">60%</b></div>
            <input type="range" min="40" max="75" step="1" value="60" id="lsMgn" aria-label="目標毛利率">
            <div class="ls-sl-s"><span>40%</span><span>甜點業常見 55–65%</span><span>75%</span></div>
          </div>
        </div>
        <div class="ls-range" id="lsRange"></div>
        <div class="ls-plans" id="lsPlans"></div>
        <div class="ls-ai-say" id="lsSay"></div>
        <div class="ls-chart-h"><span>售價 × 預估月銷量 × 月毛利</span><small>示範模型：價格彈性 1.6，參考近 30 天實際銷量</small></div>
        <div class="chart ls-pchart" id="lsChart"></div>
      </div>
    </div>

    <div class="glass card ls-chs anim-in" id="lsStep3">
      <div class="card-h ls-chs-h"><h3><span class="ls-num">3</span> 選通路，一鍵上架</h3>
        <div class="ls-chs-r"><span class="chip-sm" id="lsPvLang"></span><span class="chip-sm" id="lsPvCount"></span>
        <button class="btn btn-primary" id="lsPub">${icon('send', 17)} 一鍵上架</button></div></div>
      <div class="ls-chgrid" id="lsChGrid"></div>
    </div>

    <div class="glass card ls-listed anim-in">
      <div class="card-h"><h3>${icon('trend', 18)} 已上架商品・成效與 AI 建議</h3><span class="chip-sm">近 30 天・示範資料</span></div>
      <div class="ls-lk" id="lsLk"></div>
      <div class="ls-lt" id="lsList"></div>
    </div>
  </div>`;
}

/* ---------- 步驟狀態 ---------- */
function setStep(n, state) {
  const b = $(`.ls-step[data-s="${n}"]`, root);
  b.classList.toggle('done', state === 'done');
  b.classList.toggle('on', state === 'on');
  const lines = $$('.ls-step-line', root);
  if (n <= 2) lines[n - 1].classList.toggle('full', state === 'done');
}
function startTimer() {
  if (timerId) return;
  S.t0 = Date.now();
  const tick = () => { const s = Math.floor((Date.now() - S.t0) / 1000); $('#lsTimer', root).textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
  tick(); timerId = setInterval(tick, 1000);
}
function stopTimer() { clearInterval(timerId); timerId = null; }

/* ---------- 步驟 1：照片 ---------- */
function renderPhoto() {
  const p = prod();
  $('#lsMainImg', root).src = imgSrc();
  $('#lsMainImg', root).classList.toggle('is-photo', !!S.photo);
  $('#lsShotTag', root).textContent = S.photo ? `你的照片・${S.photoName}` : p.isNew ? '新品・尚未上架' : '現有商品・可重新上架';
  $$('.ls-pp', root).forEach(b => b.classList.toggle('on', b.dataset.pid === S.pid));
}
async function scan(token) {
  const sc = $('#lsScan', root), box = $('#lsBox', root), see = $('#lsSee', root);
  see.innerHTML = ''; box.classList.remove('on');
  sc.classList.add('on');
  await sleep(900); if (token !== S.gen) return false;
  sc.classList.remove('on'); box.classList.add('on');
  const m = META[S.pid];
  const items = [...m.see.split('・').map(t => `<span>${esc(t)}</span>`), `<span class="ok">${icon('check', 12)} ${S.photo ? '比對範本' : '辨識'}：${esc(prod().name)} ${m.conf}%</span>`];
  see.innerHTML = items.join('');
  gsap.fromTo($$('span', see), { opacity: 0, y: 8 }, { opacity: 1, y: 0, stagger: 0.12, duration: 0.35 });
  await sleep(500);
  return token === S.gen;
}
function loadFile(f) {
  if (!f || !f.type || !f.type.startsWith('image/')) { toast('請選擇圖片檔', '支援 JPG、PNG、HEIC 轉檔後的照片', { kind: 'warn', icon: icon('alert', 18) }); return; }
  const r = new FileReader();
  r.onload = () => {
    S.photo = r.result; S.photoName = f.name.length > 16 ? f.name.slice(0, 14) + '…' : f.name;
    toast('照片已載入', `AI 會辨識照片並套用「${prod().name}」的商品資料（示範）`, { icon: svg(I.image, 18) });
    onProductChange();
  };
  r.readAsDataURL(f);
}

/* ---------- 步驟 2：生成 ---------- */
async function typeInto(node, text, token, maxMs = 1500) {
  const n = text.length; const frames = Math.max(8, Math.min(maxMs, n * 14) / 16); const per = Math.max(1, Math.ceil(n / frames));
  const caret = document.createElement('span'); caret.className = 'caret';
  node.classList.remove('ls-sk');
  for (let i = per; i < n + per; i += per) {
    if (token !== S.gen) return false;
    node.textContent = text.slice(0, i); node.appendChild(caret);
    await sleep(16);
  }
  caret.remove();
  return true;
}
function fillCopy(lang = S.lang) {
  const [name, tag, desc] = copy(lang);
  $('#lsName', root).textContent = name; $('#lsTagline', root).textContent = tag; $('#lsDesc', root).textContent = desc;
  $$('#lsCopy .ls-sk', root).forEach(n => n.classList.remove('ls-sk'));
}
function renderMeta(anim = false) {
  const p = prod(); const m = META[S.pid]; const L = S.lang; const ui = UI_I18N[L];
  $('#lsKw', root).innerHTML = KW[S.pid][L].map(k => `<span class="ls-kw">${esc(k)}</span>`).join('');
  $('#lsHt', root).innerHTML = hashtags(S.pid, L).map(k => `<span class="ls-h">${esc(k)}</span>`).join('');
  $('#lsAlg', root).innerHTML = `
    <div class="ls-alg">${p.allergens.map(a => `<span class="ls-a">${esc(ALG_I18N[a][L])}</span>`).join('')}<small>${esc(ui.alg)}</small></div>
    <div class="ls-keep ${p.storage}">${p.storage === 'fridge' ? icon('snow', 15) : icon('box', 15)}<span>${esc(STORE_I18N[p.storage][L](p.days))}</span></div>`;
  $('#lsCat', root).innerHTML = `<div class="ls-cat"><b>${esc(m.cat)}</b><small>信心度 ${m.conf}%</small></div>
    <div class="ls-chips">${m.tags.map(t => `<span class="ls-t">${esc(t)}</span>`).join('')}</div>`;
  if (anim) gsap.fromTo($$('#lsMeta .ls-kw, #lsMeta .ls-h, #lsMeta .ls-a, #lsMeta .ls-keep, #lsMeta .ls-cat, #lsMeta .ls-t', root), { opacity: 0, y: 8, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, stagger: 0.03, duration: 0.35, ease: 'back.out(2)' });
}
function renderLangTabs() {
  $$('.ls-lang', root).forEach(b => {
    b.classList.toggle('on', b.dataset.lang === S.lang);
    b.classList.toggle('done', S.langDone.has(b.dataset.lang));
    b.classList.toggle('wait', S.generating && !S.langDone.has(b.dataset.lang));
  });
}
async function generate() {
  const token = ++S.gen;
  S.generated = false; S.generating = true; S.langDone = new Set(); S.published = false;
  startTimer();
  setStep(1, 'done'); setStep(2, 'on'); setStep(3, '');
  const card = $('#lsStep2', root);
  card.classList.add('run');
  const st = $('#lsGenSt', root);
  st.innerHTML = `<i class="ls-spin"></i>AI 正在看照片…`;
  ['#lsName', '#lsTagline', '#lsDesc'].forEach(s => { const n = $(s, root); n.textContent = ''; n.classList.add('ls-sk'); });
  $$('#lsMeta .ls-chips, #lsAlg, #lsCat', root).forEach(n => { n.innerHTML = '<i class="ls-skl"></i><i class="ls-skl s"></i>'; });
  renderLangTabs(); renderChannels();
  const t = performance.now();
  if (!(await scan(token))) return;
  st.innerHTML = `<i class="ls-spin"></i>撰寫${LS_LANGS.find(l => l.id === S.lang).full}文案…`;
  const [name, tag, desc] = copy();
  if (!(await typeInto($('#lsName', root), name, token, 500))) return;
  if (!(await typeInto($('#lsTagline', root), tag, token, 700))) return;
  if (!(await typeInto($('#lsDesc', root), desc, token, 1500))) return;
  S.langDone.add(S.lang); renderLangTabs();
  st.innerHTML = `<i class="ls-spin"></i>翻譯其他 4 種語言、整理 SEO…`;
  renderMeta(true);
  for (const l of LS_LANGS) {
    if (S.langDone.has(l.id)) continue;
    await sleep(260); if (token !== S.gen) return;
    S.langDone.add(l.id); renderLangTabs();
    gsap.fromTo($(`.ls-lang[data-lang="${l.id}"]`, root), { scale: 1.12 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' });
  }
  S.generating = false; S.generated = true;
  card.classList.remove('run');
  const secs = ((performance.now() - t) / 1000).toFixed(1);
  st.innerHTML = `${icon('check', 14)} 完成：5 語文案・${KW[S.pid].zh.length * 5} 個 SEO 字・用時 ${secs} 秒`;
  renderLangTabs();
  setStep(2, 'done'); setStep(3, 'on');
  renderChannels(true);
}
function onProductChange() {
  renderPhoto(); renderImage(); renderPrice(true);
  generate();
}

/* ---------- 圖片優化 ---------- */
function shotHTML(cls = '') {
  return `<div class="ls-sc ls-bg-${S.bg} ${S.photo ? 'is-photo' : ''} ${cls}"><img src="${imgSrc()}" alt=""></div>`;
}
function renderImage() {
  $('#lsBeforeImg', root).src = imgSrc();
  $('#lsAfter', root).innerHTML = shotHTML('ls-sc-big');
  $$('.ls-bgb', root).forEach(b => b.classList.toggle('on', b.dataset.bg === S.bg));
  $('#lsCrops', root).innerHTML = [['1:1', '1 / 1', 'LINE・蝦皮'], ['4:5', '4 / 5', 'Instagram'], ['16:9', '16 / 9', '官網橫幅']].map(([r, ar, use]) => `
    <div class="ls-crop"><div class="ls-cf" style="aspect-ratio:${ar}">${shotHTML()}<span class="ls-cf-b"><b></b><b></b><b></b><b></b></span></div>
    <div class="ls-cl"><b>${r}</b><span>${use}</span></div></div>`).join('');
}
function recropAnim() {
  gsap.fromTo($$('.ls-cf-b', root), { scale: 1.25, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, stagger: 0.12, ease: 'power3.out' });
  gsap.fromTo($$('.ls-cf .ls-sc img', root), { scale: 1.2 }, { scale: 1, duration: 0.8, stagger: 0.12, ease: 'power3.out' });
}

/* ---------- 定價 ---------- */
function renderPrice(anim = false) {
  const c = costInfo(); const base = baseInfo(); const range = META[S.pid].range; const ps = plans(); const p = prod();
  $('#lsCostSrc', root).textContent = c.src;
  const tot = c.parts.reduce((s, x) => s + x[1], 0);
  const col = ['#2DB674', '#5EE0C4', '#F0A531', '#7C62E6'];
  $('#lsCost', root).innerHTML = `
    <div class="ls-cost-t"><span>單位成本</span><b>${money(c.total)}</b><small>／${esc(p.unit)}${base.cur ? `・目前售價 ${money(base.cur)}` : '・新品尚未定價'}</small></div>
    <div class="ls-cbar">${c.parts.map((x, i) => `<i style="width:${x[1] / tot * 100}%;background:${col[i]}" title="${x[0]} ${money(x[1])}"></i>`).join('')}</div>
    <div class="ls-clg">${c.parts.map((x, i) => `<span><i style="background:${col[i]}"></i>${x[0]} ${Math.round(x[1])}</span>`).join('')}</div>`;
  $('#lsMgnV', root).textContent = S.margin + '%';
  $('#lsMgn', root).value = S.margin;
  const std = ps.find(x => x.id === 'std');
  const lo = Math.min(range[0], ps[0].P) * 0.92, hi = Math.max(range[2], ps[2].P) * 1.05;
  const pos = (v) => Math.max(0, Math.min(100, (v - lo) / (hi - lo) * 100));
  $('#lsRange', root).innerHTML = `
    <div class="ls-rg-h"><span>同類商品價格區間（周邊 12 家甜點店・示範）</span><b>${money(range[0])} – ${money(range[2])}</b></div>
    <div class="ls-rg"><i class="ls-rg-band" style="left:${pos(range[0])}%;width:${pos(range[2]) - pos(range[0])}%"></i>
      <i class="ls-rg-med" style="left:${pos(range[1])}%"><em>中位數 ${range[1]}</em></i>
      ${ps.map(x => `<i class="ls-rg-pt ${x.id} ${x.id === S.plan ? 'on' : ''}" style="left:${pos(x.P)}%"><em>${x.P}</em></i>`).join('')}
    </div>`;
  const sel = curPlan();
  $('#lsPlans', root).innerHTML = ps.map(x => `
    <button class="ls-plan ${x.id} ${x.id === S.plan ? 'on' : ''}" data-plan="${x.id}">
      <span class="ls-plan-h"><b>${x.name}</b>${x.id === 'std' ? '<em>AI 推薦</em>' : ''}</span>
      <span class="ls-plan-p" data-v="${x.P}">${money(x.P)}</span>
      <span class="ls-plan-n">${x.note}</span>
      <span class="ls-plan-g"><span><small>毛利／件</small><b>${money(x.unit)}</b></span><span><small>毛利率</small><b>${x.mgn.toFixed(1)}%</b></span>
      <span><small>預估月銷</small><b>${fmtN(x.vol)} ${volUnit(p)}</b></span><span><small>預估月毛利</small><b class="ls-mm" data-v="${Math.round(x.month)}">${money(x.month)}</b></span></span>
    </button>`).join('');
  if (anim) $$('.ls-mm', root).forEach(n => countUp(n, +n.dataset.v, { prefix: 'NT$ ', duration: 1 }));
  const diff = (std.P - range[1]) / range[1] * 100;
  $('#lsSay', root).innerHTML = `${icon('sparkle', 15)}<span>建議售價 <b>${money(std.P)}</b>，${Math.abs(diff) < 3 ? '貼近' : diff > 0 ? `高於同類中位數 ${diff.toFixed(0)}%，` : `低於同類中位數 ${(-diff).toFixed(0)}%，`}${Math.abs(diff) < 3 ? '同類中位數，' : ''}${S.pid === 'yuzu' ? '新品搭配「秋冬限定」題材，' : ''}毛利率 ${std.mgn.toFixed(0)}%；每月約可賺 <b>${money(std.month)}</b>。目前選用：<b>${sel.name} ${money(sel.P)}</b></span>`;
  drawChart(c, base, range, ps);
}
function drawChart(c, base, range, ps) {
  if (!chart) chart = makeChart($('#lsChart', root));
  const lo = round10(Math.max(c.total * 1.25, Math.min(range[0], ps[0].P) * 0.75));
  const hi = round10(Math.max(range[2], ps[2].P) * 1.18);
  const step = Math.max(10, round10((hi - lo) / 36));
  const vols = [], prof = [];
  for (let P = lo; P <= hi; P += step) { const v = volAt(P, base, range); vols.push([P, Math.round(v)]); prof.push([P, Math.round((P / 1.05 - c.total) * v)]); }
  const PC = { lite: '#2E97D4', std: '#2DB674', prem: '#F0A531' };
  chart.setOption({
    animationDuration: 900,
    grid: { left: 6, right: 6, top: 34, bottom: 4, containLabel: true },
    legend: { top: 0, right: 0, itemWidth: 12, itemHeight: 6, textStyle: { fontSize: 11 }, data: ['預估月毛利', '預估月銷量'] },
    tooltip: { trigger: 'axis', axisPointer: { type: 'line' }, formatter: (arr) => { const P = arr[0].value[0]; return `售價 <b>NT$ ${P}</b><br/>` + arr.filter(a => a.seriesName !== '方案').map(a => `${a.marker}${a.seriesName}：${a.seriesName === '預估月銷量' ? a.value[1] + ' 份' : 'NT$ ' + a.value[1].toLocaleString()}`).join('<br/>'); } },
    xAxis: { type: 'value', min: lo, max: hi, axisLabel: { formatter: v => v, fontSize: 10 }, splitLine: { show: false }, axisLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.08)' } } },
    yAxis: [
      { type: 'value', max: (v) => Math.ceil(v.max * 1.3 / 10000) * 10000, axisLabel: { formatter: v => v >= 10000 ? (v / 10000).toFixed(1) + '萬' : v, fontSize: 10 } },
      { type: 'value', axisLabel: { fontSize: 10 }, splitLine: { show: false } },
    ],
    series: [
      { name: '預估月銷量', type: 'bar', yAxisIndex: 1, data: vols, barWidth: '55%', itemStyle: { color: 'rgba(46,151,212,0.28)', borderRadius: [3, 3, 0, 0] }, z: 1,
        markArea: { silent: true, itemStyle: { color: 'rgba(240,165,49,0.08)', borderColor: 'rgba(240,165,49,0.35)', borderWidth: 1, borderType: 'dashed' },
          label: { color: '#ffcf8a', fontSize: 10, position: 'insideTop', distance: 4 }, data: [[{ name: '同類價格區間', xAxis: range[0] }, { xAxis: range[2] }]] } },
      { name: '預估月毛利', type: 'line', data: prof, smooth: true, symbol: 'none', lineStyle: { width: 3, color: '#2DB674', shadowColor: '#2DB674', shadowBlur: 10 }, z: 3,
        areaStyle: { color: new window.echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(45,182,116,0.35)' }, { offset: 1, color: 'rgba(45,182,116,0)' }]) } },
      { name: '方案', type: 'scatter', z: 5, symbolSize: (v, p) => p.data.on ? 16 : 11,
        data: ps.map(x => ({ value: [x.P, Math.round(x.month)], on: x.id === S.plan, itemStyle: { color: PC[x.id], borderColor: '#04130d', borderWidth: 2, shadowBlur: x.id === S.plan ? 14 : 0, shadowColor: PC[x.id] },
          label: { show: true, position: 'top', formatter: x.name, color: '#eafff4', fontSize: 11, fontWeight: 600 } })) },
    ],
  }, true);
}

/* ---------- 步驟 3：通路預覽 ---------- */
const IGICON = (d) => svg(d, 20);
function preview(ch) {
  const L = S.lang; const [name, tag, desc] = copy(L); const ui = UI_I18N[L]; const p = prod(); const P = curPlan().P;
  const algs = p.allergens.map(a => ALG_I18N[a][L]).join('・');
  const tags = hashtags(S.pid, L);
  const slug = META[S.pid].slug;
  switch (ch.id) {
    case 'web': return `
      <div class="ls-pv-web">
        <div class="ls-bar"><i></i><i></i><i></i><span>amei-sweets.tw/p/${slug}</span></div>
        <div class="ls-pv-img r169">${shotHTML()}</div>
        <div class="ls-web-b"><small>${esc(META[S.pid].cat)}</small><b>${esc(name)}</b><p>${esc(tag)}</p>
          <div class="ls-web-p"><span>${money(P)}</span><small>${esc(p.unit)}</small></div>
          <div class="ls-web-a">${esc(ui.alg)}：${esc(algs)}</div>
          <span class="ls-web-btn">${esc(ui.buy)}</span></div>
      </div>`;
    case 'line': return `
      <div class="ls-pv-line">
        <div class="ls-line-top"><span class="ls-av">美</span><b>阿美手作甜點</b><small>官方帳號</small></div>
        <div class="ls-line-chat"><small class="ls-line-time">今天 10:30</small>
          <div class="ls-flex"><div class="ls-pv-img r11">${shotHTML()}</div>
            <div class="ls-flex-b"><b>${esc(name)}</b><p>${esc(tag)}</p><div class="ls-flex-p">${money(P)} <small>${esc(p.unit)}</small></div></div>
            <span class="ls-flex-btn">${esc(ui.now)}</span><span class="ls-flex-btn2">${esc(ui.more)}</span></div></div>
      </div>`;
    case 'ig': return `
      <div class="ls-pv-ig">
        <div class="ls-ig-h"><span class="ls-ig-av"><i>美</i></span><b>amei.sweets</b><small>台北・手作甜點</small><span class="ls-ig-dots">•••</span></div>
        <div class="ls-pv-img r45">${shotHTML()}<span class="ls-ig-tagp">${esc(name)}・${money(P)}</span></div>
        <div class="ls-ig-ic">${IGICON(I.heart)}${IGICON(I.comment)}${IGICON(I.share)}<span></span>${IGICON(I.save)}</div>
        <div class="ls-ig-cap"><b>amei.sweets</b> ${esc(tag)} <span class="ls-ig-ht">${tags.map(esc).join(' ')}</span></div>
      </div>`;
    case 'shopee': return `
      <div class="ls-pv-shp">
        <div class="ls-shp-top">${svg(I.search, 14)}<span>${esc(name)}</span></div>
        <div class="ls-pv-img r11">${shotHTML()}<span class="ls-shp-badge">${esc(ui.ship.split('・')[0])}</span></div>
        <div class="ls-shp-b"><b>${esc(name)}｜${esc(p.unit)}</b>
          <div class="ls-shp-p">${money(P)}</div>
          <div class="ls-shp-m"><span>${svg(I.star, 12, 'fill="currentColor"')} 新上架</span><span>${ui.sold} 0</span></div>
          <div class="ls-shp-ship">${icon('truck', 13)} ${esc(ui.ship)}</div>
          <div class="ls-shp-btns"><span>${esc(ui.buy)}</span><span>${esc(ui.now)}</span></div></div>
      </div>`;
    case 'google': return `
      <div class="ls-pv-ggl">
        <div class="ls-ggl-h"><b>阿美手作甜點</b><span>4.9 ${svg(I.star, 11, 'fill="currentColor"')} (238)・甜點店</span></div>
        <div class="ls-ggl-tabs"><span>總覽</span><span class="on">產品</span><span>評論</span></div>
        <div class="ls-pv-img r43">${shotHTML()}</div>
        <div class="ls-ggl-b"><b>${esc(name)}</b><div class="ls-ggl-p">${money(P)}</div><p>${esc(desc.length > 90 ? desc.slice(0, L === 'zh' || L === 'ja' ? 52 : 92) + '…' : desc)}</p>
          <div class="ls-ggl-btns"><span>${svg(I.route, 14)} 路線</span><span>${icon('phone', 14)} 致電</span><span>${icon('globe', 14)} 網站</span></div></div>
      </div>`;
  }
  return '';
}
function renderChannels(flash = false) {
  const grid = $('#lsChGrid', root);
  const statusTxt = (id) => {
    if (!S.chOn[id]) return '<span class="ls-cst off">不上架</span>';
    if (S.published) return `<span class="ls-cst ok">${icon('check', 13)} 已上架（示範）</span>`;
    return S.generated ? '<span class="ls-cst ready">待上架</span>' : '<span class="ls-cst wait">等待 AI 生成…</span>';
  };
  grid.innerHTML = LS_CH.map(c => `
    <div class="ls-ch ${S.chOn[c.id] ? '' : 'off'} ${S.generated ? '' : 'waiting'}" data-ch="${c.id}" style="--c:${c.color}">
      <div class="ls-ch-h"><span class="ls-ch-dot">${c.short}</span><b>${c.name}</b><small>${c.ratio}</small>
        <label class="ls-sw" title="上架到${c.short}"><input type="checkbox" data-sw="${c.id}" ${S.chOn[c.id] ? 'checked' : ''}><i></i></label></div>
      <div class="ls-ch-pv">${preview(c)}</div>
      <div class="ls-ch-f"><div class="ls-prog"><i></i></div><span class="ls-ch-step"></span>${statusTxt(c.id)}</div>
    </div>`).join('');
  const on = LS_CH.filter(c => S.chOn[c.id]).length;
  $('#lsPvLang', root).innerHTML = `${icon('globe', 13)} 預覽語言：${LS_LANGS.find(l => l.id === S.lang).full}（跟隨上方分頁）`;
  $('#lsPvCount', root).textContent = `已選 ${on} / ${LS_CH.length} 個通路`;
  const btn = $('#lsPub', root);
  btn.disabled = S.publishing || !S.generated || on === 0;
  btn.innerHTML = S.published ? `${icon('check', 17)} 已上架・再次同步` : `${icon('send', 17)} 一鍵上架 ${on} 個通路`;
  if (flash) gsap.fromTo($$('.ls-ch', grid), { y: 14, opacity: 0.4 }, { y: 0, opacity: 1, stagger: 0.07, duration: 0.5, ease: 'power3.out', clearProps: 'transform,opacity' });
}
async function publish() {
  const chs = LS_CH.filter(c => S.chOn[c.id]);
  if (!S.generated) { toast('AI 還在生成內容', '完成後就能一鍵上架', { kind: 'warn', icon: icon('clock', 18) }); return; }
  if (!chs.length) { toast('請至少開啟一個通路', '', { kind: 'warn', icon: icon('alert', 18) }); return; }
  S.publishing = true; S.published = false;
  renderChannels();
  const token = S.gen;
  const name = copy('zh')[0]; const P = curPlan().P;
  for (const c of chs) {
    const card = $(`.ls-ch[data-ch="${c.id}"]`, root);
    card.classList.add('run');
    card.scrollIntoView && window.innerWidth < 861 && card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const bar = $('.ls-prog i', card), stp = $('.ls-ch-step', card), stt = $('.ls-cst', card);
    stt.className = 'ls-cst run'; stt.textContent = '上架中';
    for (let i = 0; i < STEP_TXT.length; i++) {
      stp.textContent = i === 0 ? `${STEP_TXT[0]} ${c.ratio}` : STEP_TXT[i];
      gsap.to(bar, { width: `${(i + 1) / STEP_TXT.length * 100}%`, duration: 0.3, ease: 'power2.out' });
      await sleep(300);
      if (token !== S.gen) { S.publishing = false; renderChannels(); return; }
    }
    card.classList.remove('run'); card.classList.add('ok');
    stp.textContent = '';
    stt.className = 'ls-cst ok'; stt.innerHTML = `${icon('check', 13)} 已上架（示範）`;
    gsap.fromTo(card, { boxShadow: `0 0 0 2px ${c.color}, 0 0 40px ${c.color}88` }, { boxShadow: '0 0 0 0px rgba(0,0,0,0)', duration: 1.2, clearProps: 'boxShadow' });
    toast(`${c.name}・上架成功（示範）`, `${name}・${money(P)}`, { icon: icon('check', 18), duration: 2600 });
  }
  S.publishing = false; S.published = true;
  stopTimer();
  setStep(3, 'done');
  const used = Math.max(1, Math.floor((Date.now() - S.t0) / 1000));
  toast('全部通路上架完成', `${chs.length} 個通路・五語文案已同步・本次用時 ${used} 秒（手動約 50 分鐘）`, { kind: 'info', icon: icon('sparkle', 18), duration: 5200 });
  store.log && store.log('ai', `AI 商品上架：${name} 已同步到 ${chs.map(c => c.short).join('、')}（示範）`);
  updateListed(chs);
  renderChannels();
}

/* ---------- 已上架商品 ---------- */
const ST_TXT = { on: '上架中', review: '審核中', off: '未上架', new: '剛上架' };
function updateListed(chs) {
  let row = S.listed.find(r => r.pid === S.pid);
  if (!row) {
    row = { pid: S.pid, name: prod().name, st: {}, lang: 'zh', views: 0, atc: 0, conv: 0, spark: Array(14).fill(0), fresh: true, kind: 'new',
      tip: 'AI 會在上架 48 小時後分析各語言頁面成效，並給出第一份優化建議' };
    S.listed.unshift(row);
  }
  LS_CH.forEach(c => { if (chs.some(x => x.id === c.id)) row.st[c.id] = row.fresh ? 'new' : 'on'; else if (!row.st[c.id]) row.st[c.id] = 'off'; });
  row.updated = true;
  renderListed(true);
}
function spark(arr, c = '#5EE0C4') {
  const max = Math.max(1, ...arr); const w = 70, h = 22;
  const pts = arr.map((v, i) => `${(i / (arr.length - 1) * w).toFixed(1)},${(h - 2 - v / max * (h - 4)).toFixed(1)}`).join(' ');
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" class="ls-spark" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${c}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}
function renderListed(flash = false) {
  const L = S.listed;
  const live = L.filter(r => Object.values(r.st).some(s => s === 'on' || s === 'new'));
  const views = L.reduce((s, r) => s + r.views, 0);
  const old = L.filter(r => !r.fresh);
  const atc = old.reduce((s, r) => s + r.atc * r.views, 0) / Math.max(1, old.reduce((s, r) => s + r.views, 0));
  const tips = L.filter(r => !r.fresh && !r.applied).length;
  $('#lsLk', root).innerHTML = [
    ['已上架商品', live.length, ' 件', '#2DB674', 'box'], ['商品頁瀏覽', views, ' 次', '#2E97D4', null], ['平均加購率', atc, '%', '#F0A531', 'cart'], ['待處理 AI 建議', tips, ' 則', '#DD5597', 'sparkle'],
  ].map(([t, v, u, c, ic]) => `<div class="ls-lkb" style="--c:${c}"><span>${ic ? icon(ic, 16) : svg(I.eye, 16)}</span><div><small>${t}</small><b data-v="${v}" data-u="${u}" data-d="${u === '%' ? 1 : 0}">0</b></div></div>`).join('');
  $$('#lsLk b', root).forEach(b => countUp(b, +b.dataset.v, { suffix: b.dataset.u, decimals: +b.dataset.d, duration: 1.1, from: 0 }));
  $('#lsList', root).innerHTML = `
    <div class="ls-lr ls-lr-h"><span>商品</span><span>各通路狀態</span><span class="r">近 30 天瀏覽</span><span class="r">加購率</span><span class="r">轉換率</span><span>AI 建議</span></div>
    ${L.map(r => {
      const f = LANG_FUNNEL[r.pid];
      const lang = LS_LANGS.find(l => l.id === r.lang);
      return `<div class="ls-lr ${r.fresh ? 'fresh' : ''} ${r.updated ? 'upd' : ''}" data-pid="${r.pid}">
        <span class="ls-lp">${artSVG(r.pid, 38)}<span><b>${esc(r.name)}</b><small>${esc(META[r.pid].cat)}</small></span></span>
        <span class="ls-lst">${LS_CH.map(c => `<i class="ls-sd ${r.st[c.id] || 'off'}" title="${c.name}：${ST_TXT[r.st[c.id] || 'off']}" style="--c:${c.color}">${c.short === 'Google' ? 'G' : c.short === 'LINE' ? 'L' : c.short}</i>`).join('')}</span>
        <span class="r ls-lv"><b>${r.fresh ? '—' : fmtN(r.views)}</b>${r.fresh ? '' : spark(r.spark)}</span>
        <span class="r"><b class="${r.atc >= 8 ? 'ls-good' : ''}">${r.fresh ? '—' : r.atc.toFixed(1) + '%'}</b></span>
        <span class="r"><b>${r.fresh ? '—' : r.conv.toFixed(1) + '%'}</b></span>
        <span class="ls-tip ${r.kind}"><span class="ls-tip-t">${r.fresh ? '' : `<em>${esc(lang.label)}</em>`}${esc(r.tip)}${f ? `<small>日文頁點擊率 ${f.ctr}%（平均 ${f.avgCtr}%）・轉換率 ${f.conv}%（平均 ${f.avgConv}%）</small>` : ''}</span>
          ${r.fresh ? '<span class="ls-tip-b wait">分析中</span>' : r.applied ? `<span class="ls-tip-b done">${icon('check', 12)} 已排入</span>` : `<button class="btn btn-ghost btn-sm" data-apply="${r.pid}">${icon('wand', 13)} 套用</button>`}</span>
      </div>`; }).join('')}`;
  if (flash) gsap.fromTo($$('.ls-lr.upd', root), { backgroundColor: 'rgba(45,182,116,0.25)' }, { backgroundColor: 'rgba(45,182,116,0)', duration: 1.6, clearProps: 'backgroundColor' });
}

/* ---------- 事件 ---------- */
function bind() {
  root.addEventListener('click', (e) => {
    const t = e.target.closest('button, [data-go]');
    if (!t || !root.contains(t)) return;
    if (t.dataset.go) { $('#' + t.dataset.go, root).scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (t.dataset.pid) {
      if (t.dataset.pid === S.pid && !S.photo && S.generated) return;
      S.pid = t.dataset.pid; S.photo = null; S.plan = 'std';
      const p = prod();
      S.margin = p.isNew ? 60 : Math.round((p.price / 1.05 - p.cost) / (p.price / 1.05) * 100);
      gsap.fromTo(t, { scale: 0.92 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' });
      onProductChange(); return;
    }
    if (t.dataset.lang) {
      S.lang = t.dataset.lang; renderLangTabs();
      if (S.generated || S.langDone.has(S.lang)) {
        fillCopy(); renderMeta();
        gsap.fromTo($$('#lsCopy h2, #lsCopy p, #lsMeta .ls-chips, #lsAlg', root), { opacity: 0, y: 6 }, { opacity: 1, y: 0, stagger: 0.04, duration: 0.35 });
      }
      renderChannels(); return;
    }
    if (t.id === 'lsRegen') { onProductChange(); return; }
    if (t.dataset.bg) { S.bg = t.dataset.bg; renderImage(); renderChannels(); gsap.fromTo($('#lsAfter', root), { opacity: 0.3 }, { opacity: 1, duration: 0.5 }); return; }
    if (t.id === 'lsRecrop') { recropAnim(); toast('已重新裁切', 'AI 以商品主體為中心，裁成 1:1、4:5、16:9 三種尺寸', { icon: svg(I.crop, 18), duration: 2600 }); return; }
    if (t.dataset.plan) { S.plan = t.dataset.plan; renderPrice(); renderChannels(); gsap.fromTo($('.ls-plan.on', root), { scale: 0.96 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' }); return; }
    if (t.id === 'lsPub') { publish(); return; }
    if (t.dataset.apply) {
      const r = S.listed.find(x => x.pid === t.dataset.apply); r.applied = true; r.updated = false;
      toast(`已排入待辦｜${r.name}`, r.tip, { icon: icon('wand', 18) });
      renderListed(); return;
    }
  });
  root.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.sw) { S.chOn[t.dataset.sw] = t.checked; renderChannels(); return; }
    if (t.id === 'lsCam' || t.id === 'lsFile') { loadFile(t.files && t.files[0]); t.value = ''; }
  });
  const mg = $('#lsMgn', root);
  mg.addEventListener('input', () => { S.margin = +mg.value; renderPrice(); renderChannels(); });
  const ba = $('#lsBaR', root), baBox = $('#lsBa', root);
  ba.addEventListener('input', () => { S.ba = +ba.value; baBox.style.setProperty('--x', S.ba + '%'); });
  const stage = $('#lsStage', root);
  stage.addEventListener('dragover', (e) => { e.preventDefault(); stage.classList.add('drag'); });
  stage.addEventListener('dragleave', () => stage.classList.remove('drag'));
  stage.addEventListener('drop', (e) => { e.preventDefault(); stage.classList.remove('drag'); loadFile(e.dataTransfer.files && e.dataTransfer.files[0]); });
}

let firstShow = true;
export default {
  mount(section) {
    root = section;
    section.innerHTML = layout();
    renderPhoto(); renderImage(); renderPrice(); renderLangTabs(); renderChannels(); renderListed();
    fillCopy(); renderMeta();
    bind();
  },
  show() {
    if (firstShow) {
      firstShow = false;
      setTimeout(() => {
        generate();
        const box = $('#lsBa', root); const o = { x: 88 };
        gsap.to(o, { x: 50, duration: 1.6, delay: 0.6, ease: 'power3.inOut', onUpdate: () => { box.style.setProperty('--x', o.x + '%'); $('#lsBaR', root).value = o.x; } });
        recropAnim();
      }, 450);
    } else if (!S.generated && !S.generating) generate();
    if (chart) setTimeout(() => chart.resize(), 60);
  },
  hide() {
    if (S.generating) { S.gen++; S.generating = false; $('#lsStep2', root).classList.remove('run'); }
  },
};
