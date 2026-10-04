// 部署模式：雲端訂閱／企業地端／雲地混合（GSAP 動畫架構圖）
import { store } from '../state.js';
import { $, $$, el, gsap } from '../util.js';
import { icon } from '../icons.js';

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
    </div>`;
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
