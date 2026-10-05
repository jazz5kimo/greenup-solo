// 合規與文件：合規健檢分數、文件櫃＋AI 讀合約、到期提醒時間軸、本月注意事項（全部為示範資料）
import { store } from '../state.js';
import { $, $$, el, gsap, esc, countUp, toast, sleep } from '../util.js';
import { icon } from '../icons.js';
import { makeChart } from '../charts.js';
import { startOfDay, addDays } from '../data.js';
import { CATS, CAT_MAP, CHECKS, LAST_SCORES, KIND, DISCLAIMER, COMPANY, buildDocs, buildTimeline, guessDoc, fmt } from '../comply-data.js';

// 模組內自用 inline SVG
const SV = (d, s = 16, extra = '') => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;
const I = {
  upload: (s) => SV('<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>', s),
  search: (s) => SV('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', s),
  chev: (s) => SV('<path d="m6 9 6 6 6-6"/>', s),
  gcal: (s) => SV('<rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M8 3v3M16 3v3"/><path d="M12 12.5v5M9.5 15h5"/>', s),
  line: (s) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24"><path fill="currentColor" d="M12 3C6.5 3 2 6.6 2 11c0 3.9 3.5 7.2 8.3 7.9.3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.6 1.1-.5 6-3.5 8.2-6.1C21.6 14.2 22 12.7 22 11c0-4.4-4.5-8-10-8z"/></svg>`,
  doc: (s) => SV('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>', s),
};
const STATUS = { pass: { name: '通過', icon: 'check' }, warn: { name: '注意', icon: 'alert' }, todo: { name: '待辦', icon: 'clock' } };
const SHORT = { tax: '稅務發票', labor: '勞動保險', food: '食品安全', ecom: '電商消保', privacy: '個資資安', corp: '公司登記' };
const LANE = [['lease', '租約', 'store'], ['insurance', '保險', 'shield'], ['contract', '合約', 'file'], ['license', '證照', 'check']];
const LANE_OF = (k) => (k === 'lease' || k === 'insurance' || k === 'contract') ? k : 'license';
const LANE_COLOR = { lease: KIND.lease.color, insurance: KIND.insurance.color, contract: KIND.contract.color, license: KIND.license.color };
const REMIND_OPTS = [7, 14, 30, 45, 60, 90];
const SHORT_TL = { ins: '產品責任險', dairy: '北海乳品供貨合約', lease: '店面租約' };

let root, go, now, today, checks, docs, tl, radar = null, firstShow = true;
let fCat = 'all', fStatus = 'open', fKind = 'all', fQuery = '', selDoc = 'dairy', typeTok = 0, upSeq = 0, scoreShown = -1;

const daysTo = (d) => Math.round((startOfDay(d) - today) / 864e5);
const md = (d) => { d = new Date(d); return `${d.getMonth() + 1}/${d.getDate()}`; };
const fsize = (b) => b >= 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1e3)) + ' KB';
const val = (s) => s === 'pass' ? 1 : s === 'warn' ? 0.5 : 0;
const catScore = (cid) => { const l = checks.filter(c => c.cat === cid); return Math.round(l.reduce((s, c) => s + val(c.status), 0) / l.length * 100); };
const totalScore = () => Math.round(checks.reduce((s, c) => s + val(c.status), 0) / checks.length * 100);
const lastTotal = () => Math.round(CATS.reduce((s, c) => s + LAST_SCORES[c.id] * checks.filter(x => x.cat === c.id).length, 0) / checks.length);
const grade = (v) => v >= 90 ? ['優良', '#5EE0C4'] : v >= 75 ? ['良好', '#2DB674'] : v >= 60 ? ['尚可', '#F0A531'] : ['需加強', '#EC6A55'];

export default {
  mount(section, ctx) {
    root = section; go = (ctx && ctx.go) || (() => {});
    now = new Date(); today = startOfDay(now);
    checks = CHECKS.map(c => ({ ...c }));
    const since = +addDays(today, -91);
    const dairy = store.purchases.filter(p => p.vendor === '北海乳品貿易' && p.ts >= since).reduce((s, p) => s + p.total, 0) * 4;
    docs = buildDocs(now, Math.round(dairy / 1000) * 1000);
    tl = buildTimeline(now).map(t => ({ ...t, cal: false })).sort((a, b) => a.date - b.date);

    section.innerHTML = `
    <div class="cp">
      <div class="glass cp-head anim-in">
        <div class="cp-head-txt">
          <div class="cp-badges"><span class="demo-badge">${icon('alert', 14)} 示範資料</span><span class="cp-note-badge">${icon('shield', 13)} ${DISCLAIMER}</span></div>
          <h2>法規、合約、證照到期，AI 幫你顧好</h2>
          <p>不懂法規也沒關係：AI 每天依你的<b>營業型態、員工、銷售通路</b>做合規健檢，用白話告訴你哪裡要注意；合約、保單、證照丟進<b>文件櫃</b>，自動讀出到期日與續約條款，時間到了提醒你。</p>
        </div>
        <div class="cp-head-stats">
          <div><b id="cpHsDocs">0</b><small>份文件</small></div>
          <div><b id="cpHsTl">0</b><small>項 12 個月內到期</small></div>
          <div class="hot"><b id="cpHsOpen">0</b><small>項需處理</small></div>
        </div>
      </div>

      <div class="cp-top">
        <div class="glass card cp-score anim-in">
          <div class="card-h"><h3>${icon('shield', 18)} 合規健檢分數</h3><span class="chip-sm">今日 ${md(now)} 自動健檢</span></div>
          <div class="cp-ring-wrap">
            <svg class="cp-ring" viewBox="0 0 160 160" aria-hidden="true">
              <defs><linearGradient id="cpRingG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5EE0C4"/><stop offset=".55" stop-color="#2DB674"/><stop offset="1" stop-color="#F0A531"/></linearGradient></defs>
              <circle cx="80" cy="80" r="66" class="cp-ring-bg"/>
              <circle cx="80" cy="80" r="66" class="cp-ring-tick"/>
              <circle cx="80" cy="80" r="66" class="cp-ring-fg" id="cpRingFg"/>
            </svg>
            <div class="cp-ring-c"><b id="cpScore">0</b><small>/ 100</small><em id="cpGrade"></em></div>
          </div>
          <div class="cp-delta" id="cpDelta"></div>
          <div class="cp-counts" id="cpCounts"></div>
          <div class="cp-next" id="cpNext"></div>
          <button class="btn btn-primary cp-ai-btn" id="cpFixAll">${icon('wand', 16)} <span>AI 一鍵處理</span></button>
        </div>
        <div class="glass card cp-radar-card anim-in">
          <div class="card-h"><h3>${icon('trend', 18)} 六大面向</h3><span class="cp-legend"><i class="now"></i>今日 <i class="last"></i>30 天前</span></div>
          <div class="chart cp-radar" id="cpRadar"></div>
        </div>
        <div class="glass card cp-month anim-in">
          <div class="card-h"><h3>${icon('bell', 18)} 這個月要注意</h3><span class="chip-sm warn" id="cpMonthChip"></span></div>
          <div class="cp-month-list" id="cpMonth"></div>
        </div>
      </div>

      <div class="glass card cp-checks-card anim-in" id="cpChecksCard">
        <div class="card-h">
          <h3>${icon('check', 18)} 合規健檢清單<span class="cp-h-sub">白話說明＋為什麼重要＋一鍵處理</span></h3>
          <div class="cp-segs" id="cpStatusF">${[['open', '需處理'], ['all', '全部'], ['pass', '已通過']].map(([k, t]) => `<button class="seg ${k === fStatus ? 'on' : ''}" data-s="${k}">${t}<em></em></button>`).join('')}</div>
        </div>
        <div class="cp-cats" id="cpCats"></div>
        <div class="cp-ck-list" id="cpChecks"></div>
      </div>

      <div class="cp-docs-row">
        <div class="glass card cp-cab anim-in" id="cpCab">
          <div class="card-h"><h3>${icon('book', 18)} 文件櫃</h3><span class="chip-sm">${icon('lock', 12)} 加密保存・示範</span></div>
          <div class="cp-cab-tools">
            <label class="cp-search">${I.search(15)}<input id="cpQ" type="search" placeholder="搜尋：租約、保險、北海…" autocomplete="off"></label>
            <div class="cp-kinds" id="cpKinds">${[['all', '全部'], ['lease', '租約'], ['contract', '合約'], ['insurance', '保險'], ['cert', '證照與登記']].map(([k, t]) => `<button class="cp-kind-b ${k === fKind ? 'on' : ''}" data-k="${k}">${t}</button>`).join('')}</div>
          </div>
          <label class="cp-drop" id="cpDrop">
            <input type="file" id="cpFile" multiple accept=".pdf,.jpg,.jpeg,.png,.heic,.doc,.docx">
            <span class="cp-drop-ic">${I.upload(24)}</span>
            <span class="cp-drop-t"><b>拖放合約、保單、證照到這裡</b><small>或點擊選擇檔案・PDF、照片、Word 皆可・AI 自動辨識類型與到期日（辨識為模擬）</small></span>
          </label>
          <div class="cp-doc-grid" id="cpDocs"></div>
          <div class="cp-cab-foot" id="cpCabFoot"></div>
        </div>
        <div class="glass card cp-sum anim-in" id="cpSum"></div>
      </div>

      <div class="glass card cp-tl-card anim-in" id="cpTlCard">
        <div class="card-h">
          <h3>${icon('calendar', 18)} 到期提醒時間軸<span class="cp-h-sub">未來 12 個月・租約、保險、合約、證照</span></h3>
          <span class="chip-sm" id="cpTlChip"></span>
        </div>
        <div class="cp-lanes" id="cpLanes"></div>
        <div class="cp-tl-list" id="cpTl"></div>
      </div>

      <p class="cp-foot">${icon('alert', 13)} 本頁所有合規項目、文件與日期皆為示範資料；法規說明為一般性白話整理，${DISCLAIMER}。AI 摘要為模擬結果，請以原始文件為準。</p>
    </div>
    <div class="cp-modal" id="cpModal" hidden><div class="cp-modal-bg"></div><div class="cp-modal-p glass" role="dialog" aria-label="LINE 通知預覽"></div></div>`;

    bind();
    renderAll(false);
    renderDocs();
    renderSumSkeleton();
  },
  show() {
    if (!radar) radar = makeChart($('#cpRadar', root));
    renderRadar();
    renderScore(true);
    countUp($('#cpHsDocs', root), docs.length, { duration: 1 });
    countUp($('#cpHsTl', root), tl.length, { duration: 1 });
    countUp($('#cpHsOpen', root), checks.filter(c => c.status !== 'pass').length, { duration: 1 });
    if (firstShow) {
      firstShow = false;
      gsap.fromTo($$('.cp-lane-mk, .cp-lane-win', root), { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.6, stagger: 0.04, delay: 0.35, ease: 'back.out(2)', clearProps: 'transform' });
      setTimeout(() => openDoc(selDoc), 500);
    }
  },
  hide() { closeModal(true); },
};

/* ---------- 事件 ---------- */
function bind() {
  $('#cpStatusF', root).addEventListener('click', (e) => { const b = e.target.closest('.seg'); if (!b) return; fStatus = b.dataset.s; renderChecks(true); });
  $('#cpCats', root).addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (!b) return; fCat = fCat === b.dataset.c ? 'all' : b.dataset.c; renderChecks(true); });
  $('#cpChecks', root).addEventListener('click', (e) => {
    const f = e.target.closest('[data-fix]'); if (f) return fixOne(f.dataset.fix, f);
    const g = e.target.closest('[data-go]'); if (g) return go(g.dataset.go);
  });
  $('#cpFixAll', root).addEventListener('click', fixAll);
  $('#cpNext', root).addEventListener('click', (e) => {
    const b = e.target.closest('[data-next]'); if (!b) return;
    fStatus = 'open'; fCat = 'all'; renderChecks(false);
    const card = $(`.cp-ck[data-id="${b.dataset.next}"]`, root); if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    gsap.fromTo(card, { boxShadow: '0 0 0 2px rgba(94,224,196,.9), 0 0 36px rgba(94,224,196,.4)' }, { boxShadow: '0 0 0 0 rgba(94,224,196,0)', duration: 1.8, delay: 0.4, clearProps: 'boxShadow' });
  });
  $('#cpMonth', root).addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (b) attentionAct(b.dataset.act, b.dataset.id); });
  $('#cpQ', root).addEventListener('input', (e) => { fQuery = e.target.value.trim(); renderDocs(); });
  $('#cpKinds', root).addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (!b) return; fKind = b.dataset.k; $$('.cp-kind-b', root).forEach(x => x.classList.toggle('on', x === b)); renderDocs(); });
  $('#cpDocs', root).addEventListener('click', (e) => { const t = e.target.closest('[data-doc]'); if (t && !t.classList.contains('scanning')) openDoc(t.dataset.doc); });
  $('#cpSum', root).addEventListener('click', (e) => {
    const b = e.target.closest('[data-sact]'); if (!b) return;
    const d = docs.find(x => x.id === selDoc); if (!d) return;
    if (b.dataset.sact === 'retype') openDoc(d.id, true);
    if (b.dataset.sact === 'tl') { const it = tl.find(x => x.doc === d.id); if (it) focusTl(it.id); }
    if (b.dataset.sact === 'share') toast('已分享給記帳士（示範）', `林雅婷 記帳士可檢視「${d.name}」與 AI 摘要，並可留言`, { icon: icon('users', 18) });
  });
  // 上傳與拖放
  const drop = $('#cpDrop', root), cab = $('#cpCab', root);
  $('#cpFile', root).addEventListener('change', (e) => { addFiles([...e.target.files]); e.target.value = ''; });
  ['dragenter', 'dragover'].forEach(ev => cab.addEventListener(ev, (e) => { if (!e.dataTransfer || ![...e.dataTransfer.types].includes('Files')) return; e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => cab.addEventListener(ev, (e) => { if (ev === 'dragleave' && cab.contains(e.relatedTarget)) return; drop.classList.remove('over'); }));
  cab.addEventListener('drop', (e) => { if (!e.dataTransfer || !e.dataTransfer.files.length) return; e.preventDefault(); addFiles([...e.dataTransfer.files]); });
  // 時間軸
  $('#cpTl', root).addEventListener('change', (e) => {
    const s = e.target.closest('select[data-remind]'); if (!s) return;
    const it = tl.find(x => x.id === s.dataset.remind); it.remind = +s.value;
    renderLanes(); renderTlRow(it); renderMonth();
    toast('提醒已更新', `「${it.title}」將在到期前 ${it.remind} 天（${fmt(addDays(it.date, -it.remind))}）提醒你`, { kind: 'info', icon: icon('bell', 18) });
  });
  $('#cpTl', root).addEventListener('click', (e) => {
    const b = e.target.closest('[data-tact]'); if (!b) return;
    const it = tl.find(x => x.id === b.dataset.id);
    if (b.dataset.tact === 'cal') addCal(it, b);
    if (b.dataset.tact === 'line') openLine(it);
    if (b.dataset.tact === 'doc') { openDoc(it.doc); $('#cpSum', root).scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  });
  $('#cpLanes', root).addEventListener('click', (e) => { const m = e.target.closest('[data-mk]'); if (m) focusTl(m.dataset.mk); });
  // Modal
  const modal = $('#cpModal', root);
  modal.addEventListener('click', (e) => {
    if (e.target.classList.contains('cp-modal-bg') || e.target.closest('[data-mact="close"]')) closeModal();
    const s = e.target.closest('[data-mact="send"]'); if (s) sendLine(s);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });
}

/* ---------- 分數、雷達 ---------- */
function renderAll(anim = true) {
  renderScore(anim); renderRadar(); renderCats(); renderChecks(false); renderMonth(); renderLanes(); renderTl();
}

function renderScore(anim) {
  const v = totalScore(), [g, gc] = grade(v);
  const C = 2 * Math.PI * 66, fg = $('#cpRingFg', root);
  fg.style.strokeDasharray = `${C}`;
  if (anim && gsap) gsap.to(fg, { strokeDashoffset: C * (1 - v / 100), duration: 1.4, ease: 'power3.out' });
  else fg.style.strokeDashoffset = `${C * (1 - v / 100)}`;
  if (anim) countUp($('#cpScore', root), v, { duration: 1.4, from: scoreShown < 0 ? 0 : scoreShown }); else $('#cpScore', root).textContent = v;
  scoreShown = v;
  const ge = $('#cpGrade', root); ge.textContent = g; ge.style.color = gc;
  const d = v - lastTotal();
  $('#cpDelta', root).innerHTML = `${icon('trend', 13)} 比 30 天前 <b class="${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '+' : ''}${d} 分</b>・共 ${checks.length} 項檢查`;
  const n = (s) => checks.filter(c => c.status === s).length;
  $('#cpCounts', root).innerHTML = ['pass', 'warn', 'todo'].map(s => `<div class="cp-cnt cp-st-${s}"><span>${icon(STATUS[s].icon, 13)}</span><b>${n(s)}</b><small>${STATUS[s].name}</small></div>`).join('');
  const pri = checks.filter(c => c.status === 'todo').concat(checks.filter(c => c.status === 'warn')).slice(0, 3);
  $('#cpNext', root).innerHTML = pri.length ? `<h5>優先處理</h5>${pri.map(c => `<button class="cp-next-i cp-st-${c.status}" data-next="${c.id}"><i></i><span>${esc(c.title.split('：')[0])}</span>${icon('arrow', 12)}</button>`).join('')}` : `<h5>優先處理</h5><p>${icon('check', 13)} 目前沒有待辦，太棒了！</p>`;
  const fixable = checks.filter(c => c.status !== 'pass' && c.fix).length;
  const btn = $('#cpFixAll', root);
  btn.disabled = !fixable;
  $('span', btn).textContent = fixable ? `AI 一鍵處理 ${fixable} 項` : '可自動處理的項目都完成了';
  const open = n('warn') + n('todo');
  if (!anim) $('#cpHsOpen', root).textContent = open; else countUp($('#cpHsOpen', root), open, { duration: 0.8 });
  $$('#cpStatusF .seg', root).forEach(b => { const k = b.dataset.s; $('em', b).textContent = k === 'open' ? open : k === 'pass' ? n('pass') : checks.length; });
}

function renderRadar() {
  if (!radar) return;
  const narrow = root.clientWidth < 600;
  const cur = CATS.map(c => catScore(c.id));
  radar.setOption({
    animationDuration: 1100,
    tooltip: { trigger: 'item', confine: true },
    radar: {
      indicator: CATS.map((c, i) => ({ name: `${SHORT[c.id]}\n${cur[i]}`, max: 100 })),
      radius: narrow ? '60%' : '70%', center: ['50%', '53%'], splitNumber: 4, shape: 'polygon',
      axisName: { color: '#d6f0e2', fontSize: narrow ? 11 : 12, lineHeight: 16, rich: {} },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.09)' } },
      splitArea: { areaStyle: { color: ['rgba(45,182,116,0.02)', 'rgba(45,182,116,0.05)'] } },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
    },
    series: [{
      type: 'radar', symbol: 'circle', symbolSize: 6,
      data: [
        { name: '30 天前', value: CATS.map(c => LAST_SCORES[c.id]), lineStyle: { color: '#2E97D4', type: 'dashed', width: 1.5 }, itemStyle: { color: '#2E97D4' }, areaStyle: { color: 'rgba(46,151,212,0.08)' } },
        { name: '今日', value: cur, lineStyle: { color: '#5EE0C4', width: 2.5, shadowColor: '#5EE0C4', shadowBlur: 12 }, itemStyle: { color: '#5EE0C4' },
          areaStyle: { color: new window.echarts.graphic.RadialGradient(0.5, 0.5, 1, [{ offset: 0, color: 'rgba(45,182,116,0.15)' }, { offset: 1, color: 'rgba(94,224,196,0.45)' }]) } },
      ],
    }],
  }, true);
}

/* ---------- 健檢清單 ---------- */
function renderCats() {
  $('#cpCats', root).innerHTML = CATS.map(c => {
    const s = catScore(c.id), open = checks.filter(x => x.cat === c.id && x.status !== 'pass').length;
    return `<button class="cp-cat ${fCat === c.id ? 'on' : ''}" data-c="${c.id}" style="--c:${c.color}">
      <span class="cp-cat-ic">${icon(c.icon, 16)}</span><span class="cp-cat-t"><b><span class="full">${c.name}</span><span class="short">${SHORT[c.id]}</span></b><small>${open ? `${open} 項需處理` : '全部通過'}</small></span>
      <span class="cp-cat-s"><b>${s}</b><i style="--p:${s}%"></i></span></button>`;
  }).join('');
}

function checkHTML(c) {
  const cat = CAT_MAP[c.cat], st = STATUS[c.status];
  const extra = c.id === 'label' ? labelGrid(c.status === 'pass') : '';
  const acts = [];
  if (c.fix && c.status !== 'pass') acts.push(`<button class="btn btn-sm cp-fix" data-fix="${c.id}">${icon('wand', 14)} ${esc(c.fix[0])}</button>`);
  if (c.go) acts.push(`<button class="btn btn-ghost btn-sm" data-go="${c.go[0]}">${esc(c.go[1])} ${icon('arrow', 13)}</button>`);
  if (c.status === 'pass' && c.fixed) acts.unshift(`<span class="cp-fixed">${icon('sparkle', 13)} AI 已處理・待你確認</span>`);
  return `<article class="cp-ck cp-st-${c.status}" data-id="${c.id}" style="--cc:${cat.color}">
    <header><span class="cp-ck-cat">${icon(cat.icon, 13)} ${cat.name}</span><span class="cp-pill">${icon(st.icon, 12)} ${st.name}</span></header>
    <h4>${esc(c.title)}</h4>
    <p class="cp-ck-plain">${esc(c.plain)}</p>
    ${extra}
    <div class="cp-ck-why"><b>${icon('alert', 12)} 為什麼重要</b><span>${esc(c.why)}</span></div>
    ${acts.length ? `<footer>${acts.join('')}</footer>` : ''}
  </article>`;
}
function labelGrid(fixed) {
  const P = [['檸檬塔', 1], ['草莓生乳捲', 1], ['芋泥巴斯克', 1], ['烏龍茶磅蛋糕', 1], ['手工餅乾禮盒', 'a'], ['鳳梨酥禮盒', 'm'], ['伯爵可麗露', 1]];
  const F = [['品名', 'n'], ['成分', 'i'], ['過敏原', 'a'], ['有效日期', 'e'], ['廠商', 'm']];
  return `<div class="cp-lbl"><div class="cp-lbl-h"><span></span>${F.map(f => `<span>${f[0]}</span>`).join('')}</div>${P.map(([n, miss]) => `<div class="cp-lbl-r"><span>${n}</span>${F.map(f => { const bad = !fixed && miss === f[1]; return `<i class="${bad ? 'bad' : 'ok'}">${icon(bad ? 'x' : 'check', 11)}</i>`; }).join('')}</div>`).join('')}</div>`;
}

function filtered() {
  const ord = { todo: 0, warn: 1, pass: 2 };
  return checks.filter(c => (fCat === 'all' || c.cat === fCat) && (fStatus === 'all' || (fStatus === 'open' ? c.status !== 'pass' : c.status === 'pass')))
    .sort((a, b) => ord[a.status] - ord[b.status] || CATS.findIndex(x => x.id === a.cat) - CATS.findIndex(x => x.id === b.cat));
}
function renderChecks(anim) {
  $$('#cpStatusF .seg', root).forEach(b => b.classList.toggle('on', b.dataset.s === fStatus));
  $$('#cpCats .cp-cat', root).forEach(b => b.classList.toggle('on', b.dataset.c === fCat));
  const list = filtered(), host = $('#cpChecks', root);
  host.innerHTML = list.length ? list.map(checkHTML).join('') : `<div class="cp-empty">${icon('check', 28)}<b>這個分類目前沒有需要處理的項目</b><small>切換「全部」可查看所有檢查</small></div>`;
  if (anim && gsap) gsap.fromTo(host.children, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.035, ease: 'power2.out', clearProps: 'transform' });
}

async function fixOne(id, btn, quiet = false) {
  const c = checks.find(x => x.id === id); if (!c || c.status === 'pass') return;
  const card = btn ? btn.closest('.cp-ck') : $(`.cp-ck[data-id="${id}"]`, root);
  if (btn) { btn.disabled = true; btn.innerHTML = `<i class="cp-spin"></i> AI 處理中…`; }
  if (card) card.classList.add('working');
  await sleep(quiet ? 650 : 1200);
  c.status = 'pass'; c.fixed = true;
  if (!quiet) toast(`已處理：${c.title}`, c.fix[1], { icon: icon('wand', 18) });
  if (card) {
    card.classList.remove('working');
    const fresh = el(checkHTML(c));
    card.replaceWith(fresh);
    gsap.fromTo(fresh, { boxShadow: '0 0 0 2px rgba(94,224,196,.9), 0 0 40px rgba(94,224,196,.45)' }, { boxShadow: '0 0 0 0px rgba(94,224,196,0), 0 0 0 rgba(94,224,196,0)', duration: 1.4, clearProps: 'boxShadow' });
    if (fStatus === 'open') gsap.to(fresh, { opacity: 0, height: 0, padding: 0, margin: 0, duration: 0.5, delay: quiet ? 0.5 : 1.6, ease: 'power2.in', onComplete: () => { if (fStatus === 'open') renderChecks(false); } });
  }
  renderScore(true); renderRadar(); renderCats(); renderMonth();
}
async function fixAll() {
  const list = checks.filter(c => c.status !== 'pass' && c.fix);
  if (!list.length) return;
  const btn = $('#cpFixAll', root); btn.disabled = true; $('span', btn).textContent = `AI 處理中 0 / ${list.length}`;
  for (let i = 0; i < list.length; i++) {
    const b = $(`[data-fix="${list[i].id}"]`, root);
    await fixOne(list[i].id, b, true);
    $('span', btn).textContent = `AI 處理中 ${i + 1} / ${list.length}`;
  }
  renderScore(true);
  const left = checks.filter(c => c.status !== 'pass').length;
  toast(`AI 已處理 ${list.length} 項`, left ? `還有 ${left} 項需要你本人確認或辦理` : '所有可自動處理的項目都完成了，請逐項確認 AI 產生的草稿', { icon: icon('sparkle', 18) });
}

/* ---------- 本月注意 ---------- */
function attention() {
  const out = [];
  for (const it of tl) {
    const d = daysTo(it.date), nd = it.notice ? daysTo(addDays(it.date, -it.notice)) : null;
    const name = SHORT_TL[it.id] || it.title;
    if (it.autoRenew && it.notice && nd != null && nd >= 0 && nd <= 45) {
      out.push({ id: it.id, k: it.kind, urg: nd, n: nd, unit: '天內要決定', title: `${name} ${d} 天後自動續約`, sub: `若不續約或想議價，需在 ${fmt(addDays(it.date, -it.notice))} 前書面通知對方`, acts: [['doc', '看合約摘要'], ['line', 'LINE 約談續約']] });
    } else if (!it.autoRenew && it.notice && nd != null && nd >= 0 && nd <= 45) {
      out.push({ id: it.id, k: it.kind, urg: nd, n: nd, unit: '天內要表態', title: `${name} ${d} 天後到期`, sub: `依約需在到期前 ${it.notice} 天（${fmt(addDays(it.date, -it.notice))}）表明是否續租`, acts: [['doc', '看租約摘要'], ['line', 'LINE 聯絡房東']] });
    } else if (d <= 60) {
      out.push({ id: it.id, k: it.kind, urg: d, n: d, unit: '天後到期', title: `${name} ${d} 天後到期（${md(it.date)}）`, sub: `建議到期前 ${it.remind} 天（${md(addDays(it.date, -it.remind))}）開始${it.action}，避免保障空窗`, acts: [['line', 'LINE 洽詢續保'], ['cal', '加入日曆']] });
    }
  }
  // 稅務截止（營業稅：單月 15 日）
  const vat = (() => { for (let i = 0; i < 3; i++) { const d = new Date(now.getFullYear(), now.getMonth() + i, 15); if (d.getMonth() % 2 === 0 && d >= today) return d; } return null; })();
  if (vat && daysTo(vat) <= 45) out.push({ id: 'vat', k: 'tax', urg: daysTo(vat) + 5, n: daysTo(vat), unit: '天後截止', title: `營業稅申報 ${md(vat)} 截止`, sub: '銷項、進項已自動彙整，申報前請確認統編更正是否完成', acts: [['go:tax', '前往報稅']] });
  const todo = checks.filter(c => c.status === 'todo');
  if (todo.length) out.push({ id: 'todo', k: 'todo', urg: 99, n: todo.length, unit: '項待辦', title: `合規健檢有 ${todo.length} 項待辦`, sub: todo.map(c => c.title.split('：')[0]).join('、'), acts: [['todo', '查看待辦']] });
  return out.sort((a, b) => a.urg - b.urg);
}
function renderMonth() {
  const list = attention();
  $('#cpMonthChip', root).textContent = `${list.length} 件`;
  const color = (k) => k === 'tax' ? '#2DB674' : k === 'todo' ? '#EC6A55' : KIND[k] ? KIND[k].color : '#5EE0C4';
  $('#cpMonth', root).innerHTML = list.map(a => `<div class="cp-att ${a.n <= 30 && a.k !== 'todo' ? 'urgent' : ''}" style="--c:${color(a.k)}">
    <div class="cp-att-n"><b>${a.n}</b><small>${a.unit}</small></div>
    <div class="cp-att-t"><b>${esc(a.title)}</b><small>${esc(a.sub)}</small>
      <div class="cp-att-a">${a.acts.map(([k, t]) => `<button class="cp-link" data-act="${k}" data-id="${a.id}">${k === 'line' ? I.line(13) : k === 'cal' ? I.gcal(13) : ''}${t}${k.startsWith('go') || k === 'todo' || k === 'doc' ? ' ' + icon('arrow', 12) : ''}</button>`).join('')}</div>
    </div></div>`).join('');
}
function attentionAct(act, id) {
  const it = tl.find(x => x.id === id);
  if (act === 'line' && it) openLine(it);
  else if (act === 'cal' && it) addCal(it);
  else if (act === 'doc' && it) { openDoc(it.doc); $('#cpSum', root).scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  else if (act.startsWith('go:')) go(act.slice(3));
  else if (act === 'todo') { fStatus = 'open'; fCat = 'all'; renderChecks(true); $('#cpChecksCard', root).scrollIntoView({ behavior: 'smooth', block: 'start' }); }
}

/* ---------- 文件櫃 ---------- */
function docMatch(d) {
  const k = d.kind, g = fKind === 'cert' ? ['license', 'report', 'reg', 'other'].includes(k) : fKind === 'all' || fKind === k;
  const q = fQuery.toLowerCase();
  return g && (!q || [d.name, d.file, KIND[k].name, d.sum ? d.sum.parties : ''].join(' ').toLowerCase().includes(q));
}
function docTile(d) {
  const k = KIND[d.kind], e = d.sum && d.sum.expire, dd = e ? daysTo(e) : null;
  const exp = d.scanning ? '<span class="cp-scan-t">AI 辨識中…</span>' : e ? `<span class="${dd <= 60 ? 'hot' : ''}">${dd >= 0 ? `${dd} 天後到期` : '已到期'}</span>` : '<span>長期有效</span>';
  return `<button class="cp-doc ${d.id === selDoc ? 'on' : ''} ${d.scanning ? 'scanning' : ''} ${d.isNew ? 'new' : ''}" data-doc="${d.id}" style="--c:${k.color}">
    <span class="cp-doc-ic">${I.doc(20)}<em>${d.file.split('.').pop().toUpperCase().slice(0, 4)}</em></span>
    <span class="cp-doc-t"><b>${esc(d.name)}</b><small>${k.name}・${fsize(d.size)}${d.pages ? `・${d.pages} 頁` : ''}</small>${exp}</span>
    ${d.scanning ? '<i class="cp-doc-scan"></i>' : ''}
  </button>`;
}
function renderDocs() {
  const list = docs.filter(docMatch);
  $('#cpDocs', root).innerHTML = list.length ? list.map(docTile).join('') : `<div class="cp-empty sm">${I.search(22)}<b>找不到「${esc(fQuery)}」</b><small>試試「租約」「保險」或廠商名稱</small></div>`;
  $('#cpHsDocs', root).textContent = docs.length;
  const withExp = docs.filter(d => d.sum && d.sum.expire), soon = withExp.filter(d => daysTo(d.sum.expire) <= 90).length;
  $('#cpCabFoot', root).innerHTML = `<div><b>${docs.length}</b><small>份文件</small></div><div><b>${withExp.length}</b><small>份已讀出到期日</small></div><div class="${soon ? 'hot' : ''}"><b>${soon}</b><small>份 90 天內到期</small></div>`;
}

async function addFiles(files) {
  if (!files.length) return;
  fQuery = ''; fKind = 'all'; $('#cpQ', root).value = ''; $$('.cp-kind-b', root).forEach(x => x.classList.toggle('on', x.dataset.k === 'all'));
  const fresh = files.slice(0, 8).map(f => {
    const base = f.name.replace(/\.[^.]+$/, '');
    let seed = 7; for (const ch of f.name) seed = (seed * 31 + ch.charCodeAt(0)) % 100003;
    return { id: 'up' + (++upSeq), kind: 'other', name: base.length > 22 ? base.slice(0, 22) + '…' : base, file: f.name, size: f.size, pages: 0, up: now, scanning: true, isNew: true, seed };
  });
  docs.unshift(...fresh.reverse());
  renderDocs();
  toast(`已上傳 ${fresh.length} 份文件`, '正在辨識文件類型、雙方、金額與到期日（模擬）', { kind: 'info', icon: I.upload(18) });
  await sleep(1700);
  for (const d of fresh) {
    const g = guessDoc(d.file, now, d.seed);
    d.kind = g.kind; d.sum = g.sum; d.scanning = false; d.pages = 1 + d.seed % 14;
    if (g.sum.expire) {
      tl.push({ id: 'tl-' + d.id, kind: LANE_OF(g.kind), title: d.name, party: g.sum.parties.split('／')[0], date: g.sum.expire, remind: 30, autoRenew: /自動續約/.test(g.sum.autoRenew) && !/未找到/.test(g.sum.autoRenew), notice: 0, action: '確認續約或更新文件', doc: d.id, cal: false,
        msg: `您好，我是${COMPANY.brand}的阿美。關於「${d.name}」，將於 {date} 到期，想跟您確認後續續約或更新的安排，謝謝！` });
    }
  }
  tl.sort((a, b) => a.date - b.date);
  renderDocs(); renderLanes(); renderTl(); renderMonth();
  countUp($('#cpHsTl', root), tl.length, { duration: 0.8 });
  const last = fresh[fresh.length - 1];
  openDoc(last.id);
  const added = fresh.filter(d => d.sum.expire).length;
  toast('AI 辨識完成（模擬）', added ? `已讀出 ${added} 份文件的到期日，並加入到期提醒時間軸` : '未偵測到到期日，可在摘要卡確認內容', { icon: icon('sparkle', 18) });
}

/* ---------- AI 摘要卡（打字機） ---------- */
function renderSumSkeleton() {
  $('#cpSum', root).innerHTML = `<div class="card-h"><h3>${icon('sparkle', 18)} AI 合約摘要</h3><span class="demo-badge">示範資料</span></div><div class="cp-empty">${I.doc(30)}<b>點左邊任一份文件</b><small>AI 會讀出雙方、期間、金額、到期日、自動續約與風險條款</small></div>`;
}
const FIELDS = [['parties', '雙方', 'users'], ['period', '期間', 'calendar'], ['amount', '金額', 'coins'], ['expire', '到期日', 'clock'], ['autoRenew', '自動續約', 'refresh'], ['notice', '提前通知', 'bell']];
function fieldText(s, k) {
  if (k === 'expire') { if (!s.expire) return '無固定到期日'; const d = daysTo(s.expire); return `${fmt(s.expire)}（${d >= 0 ? `剩 ${d} 天` : '已到期'}）`; }
  if (k === 'notice') return s.notice ? `${s.notice} 天前｜${s.noticeText}` : s.noticeText;
  return s[k];
}
async function openDoc(id, force = false) {
  const d = docs.find(x => x.id === id); if (!d || !d.sum) return;
  if (!force && $('#cpSum', root).dataset.doc === id) return;
  selDoc = id;
  $$('.cp-doc', root).forEach(t => t.classList.toggle('on', t.dataset.doc === id));
  const tok = ++typeTok, s = d.sum, k = KIND[d.kind];
  const inTl = tl.find(x => x.doc === d.id);
  const host = $('#cpSum', root); host.dataset.doc = id;
  const hot = (key) => (key === 'autoRenew' && /有：|疑似有/.test(s.autoRenew)) || (key === 'expire' && s.expire && daysTo(s.expire) <= 60) ? 'hot' : '';
  host.innerHTML = `
    <div class="card-h"><h3>${icon('sparkle', 18)} AI 合約摘要</h3><span class="demo-badge">示範資料・模擬辨識</span></div>
    <div class="cp-sum-head" style="--c:${k.color}">
      <span class="cp-doc-ic lg">${I.doc(26)}</span>
      <div><b>${esc(d.name)}</b><small>${esc(d.file)}・${fsize(d.size)}${d.pages ? `・${d.pages} 頁` : ''}</small></div>
      <span class="cp-kind-chip">${k.name}</span>
    </div>
    <div class="cp-sum-status"><i class="cp-spin"></i><span>AI 正在閱讀 ${d.pages || 1} 頁內容…</span></div>
    <div class="cp-sum-body">
      <dl class="cp-sum-grid">${FIELDS.map(([key, lab, ic]) => `<div class="cp-sf ${hot(key)}"><dt>${icon(ic, 13)} ${lab}</dt><dd data-f="${key}"></dd></div>`).join('')}</dl>
      <div class="cp-sum-lists">
        <div class="cp-sl duty"><h5>${icon('check', 13)} 重要義務</h5><ul data-l="duties"></ul></div>
        <div class="cp-sl risk"><h5>${icon('alert', 13)} 風險提醒</h5><ul data-l="risks"></ul></div>
      </div>
    </div>
    <div class="cp-sum-foot">
      <button class="btn btn-ghost btn-sm" data-sact="retype">${icon('refresh', 13)} 重新摘要</button>
      ${inTl ? `<button class="btn btn-ghost btn-sm" data-sact="tl">${icon('calendar', 13)} 看到期提醒</button>` : ''}
      <button class="btn btn-ghost btn-sm" data-sact="share">${icon('users', 13)} 分享給記帳士</button>
      <small>${DISCLAIMER}</small>
    </div>`;
  gsap.fromTo(host.querySelector('.cp-sum-head'), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4 });
  await sleep(550); if (tok !== typeTok) return;
  const st = $('.cp-sum-status', host);
  for (const [key] of FIELDS) {
    const dd = $(`[data-f="${key}"]`, host);
    dd.parentElement.classList.add('in');
    if (!(await typeInto(dd, fieldText(s, key), tok))) return;
  }
  for (const L of ['duties', 'risks']) {
    const ul = $(`[data-l="${L}"]`, host);
    for (const line of s[L]) {
      const li = document.createElement('li'); ul.appendChild(li);
      if (!(await typeInto(li, line, tok))) return;
    }
  }
  if (tok !== typeTok) return;
  st.innerHTML = `${icon('check', 14)}<span>摘要完成：${s.expire ? `到期日 ${fmt(s.expire)}${inTl ? '，已在到期提醒中' : ''}` : '無固定到期日'}・請與原文核對</span>`;
  st.classList.add('done');
}
async function typeInto(node, text, tok) {
  const caret = document.createElement('span'); caret.className = 'caret';
  const step = text.length > 40 ? 3 : 2;
  for (let i = step; i < text.length + step; i += step) {
    if (tok !== typeTok) return false;
    node.textContent = text.slice(0, i); node.appendChild(caret);
    await sleep(16);
  }
  caret.remove();
  return tok === typeTok;
}

/* ---------- 時間軸 ---------- */
function renderLanes() {
  const span = 365, pos = (d) => Math.max(0, Math.min(100, daysTo(d) / span * 100));
  const months = [];
  for (let i = 1; i <= 12; i++) { const d = new Date(today.getFullYear(), today.getMonth() + i, 1); if (daysTo(d) <= span) months.push(d); }
  const ticks = months.map((d, i) => `<span class="cp-mt ${d.getMonth() === 0 ? 'yr' : ''} ${(i + 1) % 3 ? 'minor' : ''}" style="left:${pos(d)}%">${d.getMonth() === 0 ? `${d.getFullYear()}<br>` : ''}${d.getMonth() + 1} 月</span>`).join('');
  const grid = months.map(d => `<i style="left:${pos(d)}%"></i>`).join('');
  $('#cpLanes', root).innerHTML = `
    <div class="cp-lane head"><span class="cp-lane-l"></span><div class="cp-lane-track"><span class="cp-mt now" style="left:0">今天</span>${ticks}</div></div>
    ${LANE.map(([k, n, ic]) => {
      const items = tl.filter(t => LANE_OF(t.kind) === k);
      return `<div class="cp-lane" style="--c:${LANE_COLOR[k]}"><span class="cp-lane-l">${icon(ic, 14)} ${n}<em>${items.length}</em></span>
        <div class="cp-lane-track"><div class="cp-lane-grid">${grid}</div>
          ${items.map(t => { const p = pos(t.date), w = Math.max(0, p - pos(addDays(t.date, -t.remind))); const dd = daysTo(t.date);
            return `<span class="cp-lane-win" style="left:${p - w}%;width:${w}%"></span><button class="cp-lane-mk ${dd <= 60 ? 'hot' : ''} ${p > 78 ? 'flip' : ''}" data-mk="${t.id}" style="left:${p}%" title="${esc(t.title)}｜${fmt(t.date)}"><i></i><span>${esc(SHORT_TL[t.id] || t.title.replace(/（.*?）/g, ''))}<small>${md(t.date)}</small></span></button>`; }).join('')}
        </div></div>`;
    }).join('')}
    <div class="cp-lane-legend"><span><i class="w"></i>提醒期間（到期前 N 天起）</span><span><i class="m"></i>到期日・點一下看詳細</span></div>`;
}
function tlRowHTML(t) {
  const d = daysTo(t.date), c = LANE_COLOR[LANE_OF(t.kind)], kname = { lease: '租約', insurance: '保險', contract: '合約', license: '證照' }[LANE_OF(t.kind)];
  const lvl = d <= 60 ? 'hot' : d <= 120 ? 'mid' : 'ok';
  const opts = [...new Set([...REMIND_OPTS, t.remind])].sort((a, b) => a - b);
  const nd = t.notice ? addDays(t.date, -t.notice) : null;
  return `<div class="cp-tl-row ${lvl}" data-row="${t.id}" style="--c:${c}">
    <div class="cp-tl-days"><b>${d}</b><small>天後</small><i style="--p:${Math.max(4, 100 - d / 365 * 100)}%"></i></div>
    <div class="cp-tl-info">
      <div class="cp-tl-top"><span class="cp-kind-chip">${kname}</span><b>${esc(t.title)}</b>${t.autoRenew ? `<span class="cp-auto">${icon('refresh', 11)} 自動續約</span>` : ''}</div>
      <small>到期 ${fmt(t.date)}・對象：${esc(t.party)}</small>
      <small class="cp-tl-todo">${icon('arrow', 11)} ${esc(t.action)}${nd ? `・<b>${t.autoRenew ? '不續約' : '表態'}期限 ${fmt(nd)}</b>` : ''}</small>
    </div>
    <label class="cp-tl-remind"><span>提前</span><select data-remind="${t.id}" aria-label="提前提醒天數">${opts.map(o => `<option value="${o}" ${o === t.remind ? 'selected' : ''}>${o}</option>`).join('')}</select><span>天提醒</span><small>${fmt(addDays(t.date, -t.remind))}</small></label>
    <div class="cp-tl-btns">
      <button class="btn btn-sm cp-gcal ${t.cal ? 'done' : ''}" data-tact="cal" data-id="${t.id}">${t.cal ? icon('check', 13) + ' 已加入日曆' : I.gcal(14) + ' Google 日曆'}</button>
      <button class="btn btn-sm cp-line" data-tact="line" data-id="${t.id}">${I.line(14)} LINE 通知對方</button>
      ${t.doc ? `<button class="icon-btn cp-tl-doc" data-tact="doc" data-id="${t.id}" title="看文件摘要" aria-label="看文件摘要">${I.doc(15)}</button>` : ''}
    </div>
  </div>`;
}
function renderTl() {
  $('#cpTl', root).innerHTML = tl.map(tlRowHTML).join('');
  const soon = tl.filter(t => daysTo(t.date) <= 90).length;
  $('#cpTlChip', root).innerHTML = `${tl.length} 項・90 天內 <b style="color:#ffcf8a">${soon}</b> 項`;
}
function renderTlRow(t) { const r = $(`[data-row="${t.id}"]`, root); if (r) r.replaceWith(el(tlRowHTML(t))); }
function focusTl(id) {
  const r = $(`[data-row="${id}"]`, root); if (!r) return;
  r.scrollIntoView({ behavior: 'smooth', block: 'center' });
  r.classList.remove('flash'); void r.offsetWidth; r.classList.add('flash');
}
function addCal(t, btn) {
  t.cal = true;
  renderTlRow(t);
  const r = addDays(t.date, -t.remind);
  toast('已加入 Google 日曆（示範）', `${fmt(r)} 提醒「${t.title}」，${fmt(t.date)} 到期；並同步邀請記帳士`, { icon: I.gcal(18) });
  const b = $(`[data-row="${t.id}"] .cp-gcal`, root); if (b) gsap.fromTo(b, { scale: 0.85 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
}

/* ---------- LINE 通知（示範） ---------- */
let lineTok = 0;
async function openLine(t) {
  const modal = $('#cpModal', root), p = $('.cp-modal-p', modal);
  const msg = t.msg.replace('{date}', fmt(t.date));
  const tok = ++lineTok;
  p.innerHTML = `
    <div class="cp-ln-h">${I.line(22)}<div><b>${esc(t.party)}</b><small>透過 LINE 官方帳號傳送・示範</small></div><button class="icon-btn" data-mact="close" aria-label="關閉">${icon('x', 16)}</button></div>
    <div class="cp-ln-body">
      <div class="cp-ln-sys">AI 依「${esc(t.title)}」的到期日與條款，幫你擬好洽談訊息</div>
      <div class="cp-ln-bub"><span id="cpLnTxt"></span><small class="cp-ln-meta"></small></div>
    </div>
    <div class="cp-ln-foot"><small>${icon('alert', 12)} 示範：不會真的傳送訊息</small><button class="btn btn-ghost btn-sm" data-mact="close">取消</button><button class="btn btn-sm cp-line" data-mact="send" data-id="${t.id}" disabled>${icon('send', 14)} 傳送</button></div>`;
  modal.hidden = false;
  gsap.fromTo($('.cp-modal-bg', modal), { opacity: 0 }, { opacity: 1, duration: 0.25 });
  gsap.fromTo(p, { opacity: 0, y: 30, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'back.out(1.6)' });
  const span = $('#cpLnTxt', p), caret = document.createElement('span'); caret.className = 'caret';
  for (let i = 2; i < msg.length + 2; i += 2) { if (tok !== lineTok || modal.hidden) return; span.textContent = msg.slice(0, i); span.appendChild(caret); await sleep(14); }
  caret.remove();
  const s = $('[data-mact="send"]', p); if (s) s.disabled = false;
}
async function sendLine(btn) {
  const t = tl.find(x => x.id === btn.dataset.id); if (!t) return;
  btn.disabled = true; btn.innerHTML = '<i class="cp-spin"></i> 傳送中';
  const tok = lineTok;
  await sleep(700); if (tok !== lineTok) return;
  const meta = $('.cp-ln-meta', root); if (meta) meta.textContent = `已送達 ${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;
  btn.innerHTML = `${icon('check', 14)} 已傳送`;
  toast('已用 LINE 通知對方（示範）', `${t.party}：洽談「${t.title}」續約事宜；對方回覆後會出現在 AI 聊天收單`, { icon: I.line(18) });
  await sleep(1000); if (tok === lineTok) closeModal();
}
function closeModal(instant = false) {
  const modal = root && $('#cpModal', root); if (!modal || modal.hidden) return;
  lineTok++;
  if (instant || !gsap) { modal.hidden = true; return; }
  gsap.to($('.cp-modal-p', modal), { opacity: 0, y: 20, duration: 0.2 });
  gsap.to($('.cp-modal-bg', modal), { opacity: 0, duration: 0.2, onComplete: () => { modal.hidden = true; } });
}
