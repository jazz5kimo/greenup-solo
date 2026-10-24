// 銷售網頁：精品版面（lay-luxe）的品牌故事區塊
// 故事、產地（芽莊燕島示意地圖）、四種燕窩怎麼挑、從燕島到餐桌、在家燉一盞（份量計算）、品質承諾、常見問題、示範聲明。
// 內容放在業主的 merchant.story（五語，見 biz/g5.js）；沒有 story 的業主不顯示這一區。
import { TENANT } from '../tenant.js';
import { $, $$, el, esc, money } from '../util.js';
import { PRODUCT_MAP } from '../data.js';
import { cart } from './cart.js';

export const hasStory = () => !!(TENANT && TENANT.story);
const S = (l) => (TENANT.story[l] || TENANT.story.en || TENANT.story.zh);
const REDUCED = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } })();

// ---------- 線條插畫（金色細線，顏色跟著風格變數走） ----------
const sw = (x, y, s = 1, r = 0, cls = '') => `<path class="${cls}" transform="translate(${x} ${y}) rotate(${r}) scale(${s})" d="M0 8 C4 4.5 8 3.6 11.5 4.6 L21 0 L15.6 6.2 C17.6 7 18.8 8.6 18.2 9.8 C15.6 9 13.4 9.2 11.6 10.2 L3 16 L6.6 10.2 C4 10.4 1.6 9.6 0 8 Z"/>`;
const STORY_ART = `<svg class="lx-art" viewBox="0 0 400 400" aria-hidden="true">
  <defs><linearGradient id="lxG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7e3a6"/><stop offset=".5" stop-color="#d9b56b"/><stop offset="1" stop-color="#a77c33"/></linearGradient>
  <radialGradient id="lxSun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff3d0"/><stop offset="1" stop-color="#fff3d0" stop-opacity="0"/></radialGradient></defs>
  <circle cx="200" cy="200" r="182" class="lx-ring"/><circle cx="200" cy="200" r="170" class="lx-ring thin"/>
  <circle cx="200" cy="168" r="120" fill="url(#lxSun)" opacity=".8"/>
  <path class="lx-line" d="M88 262 V170 Q88 98 200 82 Q312 98 312 170 V262"/>
  <path class="lx-line thin" d="M106 262 V176 Q106 114 200 100 Q294 114 294 176 V262"/>
  <g class="lx-house"><path d="M150 262 V168 h100 V262"/><path d="M140 170 L200 132 L260 170"/><path d="M162 132 L200 108 L238 132"/>
    ${[0, 1, 2, 3, 4].map(i => `<rect x="${164 + i * 15}" y="182" width="7" height="3" rx="1"/>`).join('')}${[0, 1, 2, 3].map(i => `<rect x="${171 + i * 15}" y="200" width="7" height="3" rx="1"/>`).join('')}
    <path d="M186 262 V230 q14 -14 28 0 V262"/></g>
  <path class="lx-fill" d="M120 300 Q200 368 280 300 Q200 326 120 300 Z"/>
  ${[0, 1, 2, 3, 4].map(i => `<path class="lx-line thin" d="M${136 + i * 4} ${308 + i * 7} Q200 ${344 + i * 4} ${264 - i * 4} ${308 + i * 7}"/>`).join('')}
  <path class="lx-line" d="M64 262 H336"/>
  <g class="lx-birds">${sw(70, 96, 1.6, -10, 'lx-b b1')}${sw(300, 70, 1.25, 8, 'lx-b b2')}${sw(318, 140, 0.9, -4, 'lx-b b3')}${sw(108, 54, 0.8, 12, 'lx-b b4')}${sw(250, 40, 0.7, -14, 'lx-b b5')}</g>
</svg>`;
const GRADE_ART = {
  cup: `<path class="lx-fill" d="M10 26 Q40 64 70 26 Q40 38 10 26 Z"/>${[0, 1, 2].map(i => `<path class="lx-line thin" d="M${16 + i * 4} ${32 + i * 6} Q40 ${52 + i * 3} ${64 - i * 4} ${32 + i * 6}"/>`).join('')}`,
  strip: [0, 1, 2, 3].map(i => `<path class="lx-fill" transform="rotate(${-24 + i * 16} 40 58)" d="M36 56 Q34 30 40 16 Q46 30 44 56 Z"/>`).join(''),
  corner: `<path class="lx-fill" d="M12 46 Q20 22 40 30 Q30 40 26 54 Z"/><path class="lx-fill" d="M68 46 Q60 22 40 30 Q50 40 54 54 Z"/>`,
  bits: [[22, 40, 6], [38, 30, 5], [52, 44, 7], [30, 52, 4], [58, 28, 4], [44, 56, 5]].map(([x, y, r]) => `<path class="lx-fill" d="M${x - r} ${y} Q${x} ${y - r * 1.4} ${x + r} ${y} Q${x} ${y + r * 0.6} ${x - r} ${y} Z"/>`).join(''),
};
const STEP_ICON = [
  '<path d="M6 30 L20 8 L34 30 Z"/><rect x="14" y="20" width="12" height="10"/>',
  '<path d="M6 16 h28 v12 q0 6 -6 6 h-16 q-6 0 -6 -6 z"/><path d="M12 10 q2 -3 0 -6 M20 10 q2 -3 0 -6 M28 10 q2 -3 0 -6"/>',
  '<path d="M8 32 L26 8 M14 34 L30 12"/><circle cx="29" cy="9" r="3"/>',
  '<path d="M6 22 Q20 36 34 22 Q20 28 6 22 Z"/><path d="M10 12 h20"/>',
  '<path d="M14 4 v12 L6 32 h28 L26 16 V4"/><path d="M12 4 h16"/>',
  '<rect x="4" y="12" width="22" height="16" rx="2"/><path d="M26 18 h6 l4 5 v5 h-10"/><circle cx="11" cy="31" r="3"/><circle cx="31" cy="31" r="3"/>',
];
const PROMISE_ICON = [
  '<circle cx="20" cy="20" r="14"/><path d="M12 28 L28 12"/>',
  '<path d="M14 4 v12 L6 32 h28 L26 16 V4"/><path d="M11 26 h18"/>',
  '<path d="M20 4 L34 10 V20 Q34 30 20 36 Q6 30 6 20 V10 Z"/><path d="M13 20 l5 5 l9 -10"/>',
  '<path d="M20 4 v32 M6 12 l28 16 M34 12 L6 28"/><path d="M16 6 l4 4 l4 -4 M16 34 l4 -4 l4 4"/>',
];
const icon = (d, cls = 'lx-ic', vb = '0 0 40 40') => `<svg class="${cls}" viewBox="${vb}" aria-hidden="true">${d}</svg>`;
const GVB = '4 8 72 58'; // 四種燕窩插圖的範圍

// ---------- 產地：芽莊海岸與外海燕島（示意地圖） ----------
const ORIGIN_MAP = (m) => `<svg class="lx-map" viewBox="0 0 520 420" aria-hidden="true">
  <defs><linearGradient id="lxSea" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="var(--card)" stop-opacity="0"/><stop offset="1" stop-color="var(--gl)" stop-opacity=".16"/></linearGradient></defs>
  <rect x="0" y="0" width="520" height="420" fill="url(#lxSea)"/>
  ${[70, 150, 230, 310, 390].map(y => `<path class="lx-grid" d="M0 ${y} H520"/>`).join('')}${[90, 190, 290, 390, 490].map(x => `<path class="lx-grid" d="M${x} 0 V420"/>`).join('')}
  <path class="lx-land" d="M0 0 H178 C172 40 188 62 176 92 C166 118 196 132 204 156 C212 182 186 196 196 222 C206 248 236 252 230 282 C224 312 196 322 204 352 C210 376 232 392 226 420 H0 Z"/>
  <path class="lx-coast" d="M178 0 C172 40 188 62 176 92 C166 118 196 132 204 156 C212 182 186 196 196 222 C206 248 236 252 230 282 C224 312 196 322 204 352 C210 376 232 392 226 420"/>
  <path class="lx-coast thin" d="M188 0 C182 40 198 62 186 92 C176 118 206 132 214 156 C222 182 196 196 206 222 C216 248 246 252 240 282 C234 312 206 322 214 352 C220 376 242 392 236 420"/>
  ${[[262, 196, 26, 15, -18], [300, 238, 12, 8, 10], [326, 170, 15, 9, -30], [352, 214, 9, 6, 20], [372, 256, 18, 10, 6], [404, 190, 11, 7, -12], [286, 288, 9, 6, 0]].map(([x, y, rx, ry, r]) => `<ellipse class="lx-isle" cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${r} ${x} ${y})"/>`).join('')}
  <path class="lx-route" d="M206 214 C250 206 300 200 336 210"/>
  <circle class="lx-pin" cx="204" cy="216" r="6"/><circle class="lx-pin-ring" cx="204" cy="216" r="13"/>
  <text class="lx-t big" x="186" y="248" text-anchor="end">${esc(m.map[0])}</text><text class="lx-t" x="186" y="268" text-anchor="end">${esc(m.map[1])}</text>
  <text class="lx-t gold" x="340" y="150" text-anchor="middle">${esc(m.map[2])}</text>
  ${[[300, 96, 1.1, -8], [338, 80, 0.8, 10], [370, 102, 0.9, -4]].map(([x, y, s2, r]) => sw(x, y, s2, r, 'lx-mb')).join('')}
  <g class="lx-compass" transform="translate(460 70)"><circle r="26"/><path d="M0 -34 L5 0 L0 34 L-5 0 Z"/><path d="M-34 0 L0 5 L34 0 L0 -5 Z" opacity=".5"/><text y="-40" text-anchor="middle">N</text></g>
  <text class="lx-t coord" x="500" y="402" text-anchor="end">${esc(m.coord)}</text>
</svg>`;
function originHTML(o) {
  return `<div class="lx-sec lx-origin lx-rv" id="origin">
    <div class="lx-origin-a">${ORIGIN_MAP(o)}</div>
    <div class="lx-origin-t"><span class="lx-k">${esc(o.k)}</span><h2>${esc(o.h)}</h2><p>${esc(o.sub)}</p>
      <dl class="lx-facts">${o.facts.map(([a, b], i) => `<div style="--i:${i}"><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join('')}</dl>
      <small class="lx-fnote">${esc(o.note)}</small></div>
  </div>`;
}

// ---------- 份量計算 ----------
const CALC = { n: 2, tex: 'light', grade: 'cup' };
function calcOut(s) {
  const c = s.calc, per = CALC.tex === 'rich' ? 5 : 3, ratio = CALC.tex === 'rich' ? 28 : 35;
  const dry = per * CALC.n, water = Math.round(dry * ratio / 10) * 10, stew = CALC.tex === 'rich' ? 40 : 30;
  const g = (s.grades.list.find(x => x.id === CALC.grade) || s.grades.list[0]);
  const soak = (g.soak.match(/[\d.]+(?:[–-][\d.]+)?/) || ['4–6'])[0];
  return `<div class="lx-res"><div><small>${esc(c.dry)}</small><b>${dry}<i>${esc(c.g)}</i></b></div><div><small>${esc(c.water)}</small><b>${water}<i>${esc(c.ml)}</i></b></div>
    <div><small>${esc(c.soak)}</small><b>${esc(soak)}<i>${esc(c.hr)}</i></b></div><div><small>${esc(c.stew)}</small><b>${stew}<i>${esc(c.min)}</i></b></div></div>
    <p class="lx-res-g">${GRADE_ART[g.id] ? icon(GRADE_ART[g.id], 'lx-gi sm', GVB) : ''}<span>${esc(g.n)}・${esc(g.soak)}</span></p>`;
}

// ---------- 繪製 ----------
export function renderStory(lang) {
  let host = $('#sfStory');
  if (!hasStory()) { if (host) host.remove(); return; }
  if (!host) { host = el('<section class="lx-story" id="sfStory"></section>'); const at = $('#about') || $('#ship'); at.parentNode.insertBefore(host, at); }
  const nav = $('.s-links a[href="#about"]'); if (nav) nav.setAttribute('href', '#story');
  const s = S(lang);
  const st = s.story, gr = s.grades, sp = s.steps, ca = s.calc, pr = s.promise, fq = s.faq;
  host.innerHTML = `
  ${s.gift && PRODUCT_MAP['bn-gift'] ? giftHTML(s) : ''}
  <div class="lx-sec lx-intro lx-rv" id="story">
    <div class="lx-intro-t"><span class="lx-k">${esc(st.k)}</span><h2>${st.h}</h2>${st.p.map(p => `<p>${esc(p)}</p>`).join('')}<span class="lx-sign">— ${esc(st.sign)}</span></div>
    <div class="lx-intro-a">${STORY_ART}</div>
  </div>
  ${s.origin ? originHTML(s.origin) : ''}
  <div class="lx-sec lx-rv"><div class="lx-h"><span class="lx-k">${esc(gr.k)}</span><h2>${esc(gr.h)}</h2><p>${esc(gr.sub)}</p></div>
    <div class="lx-grades">${gr.list.map((g, i) => `<button class="lx-grade ${g.id === CALC.grade ? 'on' : ''}" data-grade="${g.id}" style="--i:${i}">
      ${icon(GRADE_ART[g.id] || '', 'lx-gi', GVB)}<b>${esc(g.n)}</b><p>${esc(g.d)}</p><dl><div><dt>⏱</dt><dd>${esc(g.soak)}</dd></div><div><dt>✦</dt><dd>${esc(g.fit)}</dd></div></dl></button>`).join('')}</div></div>
  <div class="lx-sec lx-rv"><div class="lx-h"><span class="lx-k">${esc(sp.k)}</span><h2>${esc(sp.h)}</h2></div>
    <ol class="lx-steps">${sp.list.map(([h, d], i) => `<li style="--i:${i}"><span class="lx-num">${String(i + 1).padStart(2, '0')}</span>${icon(STEP_ICON[i] || STEP_ICON[0])}<b>${esc(h)}</b><small>${esc(d)}</small></li>`).join('')}</ol></div>
  <div class="lx-sec lx-calc lx-rv" id="stew"><div class="lx-calc-t"><span class="lx-k">${esc(ca.k)}</span><h2>${esc(ca.h)}</h2><p>${esc(ca.sub)}</p>
      <ol class="lx-tips">${ca.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ol></div>
    <div class="lx-calc-box">
      <div class="lx-row"><span>${esc(ca.people)}</span><div class="lx-seg" data-seg="n">${[1, 2, 4, 6].map(n => `<button data-v="${n}" class="${CALC.n === n ? 'on' : ''}">${n}</button>`).join('')}</div></div>
      <div class="lx-row"><span>${esc(ca.texture)}</span><div class="lx-seg" data-seg="tex">${['light', 'rich'].map(v => `<button data-v="${v}" class="${CALC.tex === v ? 'on' : ''}">${esc(ca[v])}</button>`).join('')}</div></div>
      <div class="lx-out" id="lxOut">${calcOut(s)}</div>
    </div></div>
  <div class="lx-band lx-rv"><div class="lx-h inv"><span class="lx-k">${esc(pr.k)}</span><h2>${esc(pr.h)}</h2></div>
    <div class="lx-promise">${pr.list.map(([h, d], i) => `<div style="--i:${i}">${icon(PROMISE_ICON[i] || PROMISE_ICON[0])}<b>${esc(h)}</b><small>${esc(d)}</small></div>`).join('')}</div></div>
  <div class="lx-sec lx-faq lx-rv" id="faq"><div class="lx-h"><span class="lx-k">${esc(fq.k)}</span><h2>${esc(fq.h)}</h2></div>
    <div class="lx-qs">${fq.list.map(([q, a], i) => `<details ${i === 0 ? 'open' : ''}><summary><span>${esc(q)}</span><i></i></summary><p>${esc(a)}</p></details>`).join('')}</div></div>
  <p class="lx-note">${esc(s.note)}</p>`;
  bind(host, lang);
  if (s.gift && PRODUCT_MAP['bn-gift']) bindGift(host, lang);
  reveal(host);
  luxeNav(lang); luxeFooter(lang);
}

function bind(host, lang) {
  const redraw = () => { const o = $('#lxOut', host); if (o) o.innerHTML = calcOut(S(lang)); };
  $$('[data-seg]', host).forEach(seg => $$('button', seg).forEach(b => b.addEventListener('click', () => {
    const k = seg.dataset.seg; CALC[k] = k === 'n' ? +b.dataset.v : b.dataset.v;
    $$('button', seg).forEach(x => x.classList.toggle('on', x === b)); redraw();
  })));
  $$('[data-grade]', host).forEach(b => b.addEventListener('click', () => {
    CALC.grade = b.dataset.grade; $$('[data-grade]', host).forEach(x => x.classList.toggle('on', x === b)); redraw();
  }));
}

// 捲到才浮現（減少動態時直接顯示）
let io = null;
function reveal(host) {
  const items = $$('.lx-rv', host);
  if (REDUCED || !('IntersectionObserver' in window)) { items.forEach(n => n.classList.add('in')); return; }
  if (io) io.disconnect();
  io = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  items.forEach(n => io.observe(n));
}

// 主視覺下方的精品標示（出貨前一天現燉・冷鏈・檢驗紀錄）
export function luxeBadges(lang) {
  if (!hasStory()) return '';
  const b = S(lang).badges || [];
  return `<div class="sfx-luxe">${b.map(x => `<span><i></i>${esc(x)}</span>`).join('')}</div>`;
}

// ---------- 訂製禮盒：六瓶任選冰糖／無糖（點瓶蓋就能換）＋手寫卡片 ----------
const GIFT = { jars: ['s', 's', 's', 'p', 'p', 'p'], msg: '' };
const LS_GIFT = 'greenup-solo:gift-notes';
function giftBox() {
  const pos = [[90, 86], [170, 86], [250, 86], [90, 176], [170, 176], [250, 176]];
  return `<svg class="lx-gbox" viewBox="0 0 340 270" aria-hidden="true">
    <defs><linearGradient id="lxGb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9c1259"/><stop offset="1" stop-color="#4d0a2e"/></linearGradient>
      <radialGradient id="lxLid" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#fbeec4"/><stop offset=".55" stop-color="#d9b56b"/><stop offset="1" stop-color="#a77c33"/></radialGradient></defs>
    <rect x="14" y="20" width="312" height="236" rx="10" fill="url(#lxGb)"/><rect x="26" y="32" width="288" height="212" rx="6" fill="#3a0822"/>
    <rect x="160" y="14" width="20" height="248" fill="#d9b56b" opacity=".9"/><rect x="8" y="128" width="324" height="14" fill="#d9b56b" opacity=".9"/>
    ${pos.map(([x, y], i) => `<g class="lx-jar ${GIFT.jars[i] === 's' ? 'sw' : 'pl'}" data-jar="${i}" transform="translate(${x} ${y})" tabindex="0" role="button">
      <circle r="34" fill="#2a0618"/><circle r="30" fill="url(#lxLid)"/>${Array.from({ length: 24 }, (_, k) => { const a = k / 24 * Math.PI * 2; return `<line x1="${(Math.cos(a) * 26).toFixed(1)}" y1="${(Math.sin(a) * 26).toFixed(1)}" x2="${(Math.cos(a) * 30).toFixed(1)}" y2="${(Math.sin(a) * 30).toFixed(1)}" stroke="#a77c33" stroke-width="1"/>`; }).join('')}
      <circle class="lx-jdot" r="13"/><text class="lx-jt" y="4.5" text-anchor="middle"></text></g>`).join('')}
  </svg>`;
}
function giftHTML(s) {
  const g = s.gift, p = PRODUCT_MAP['bn-gift'];
  return `<div class="lx-sec lx-gift lx-rv" id="giftbox">
    <div class="lx-gift-a">${giftBox()}<div class="lx-gcard"><small>${esc(g.card)}</small><p id="lxGcardTxt">${esc(GIFT.msg || g.ph)}</p><i>嬿窩</i></div></div>
    <div class="lx-gift-t"><span class="lx-k">${esc(g.k)}</span><h2>${esc(g.h)}</h2><p>${esc(g.sub)}</p>
      <div class="lx-gmix"><div><i class="sw"></i><b>${esc(g.sweet)}</b><span><button data-gmix="s:-1">−</button><em id="lxGs">0</em><button data-gmix="s:1">＋</button></span></div>
        <div><i class="pl"></i><b>${esc(g.plain)}</b><span><button data-gmix="p:-1">−</button><em id="lxGp">0</em><button data-gmix="p:1">＋</button></span></div></div>
      <label class="lx-gmsg">${esc(g.card)}<textarea id="lxGmsg" maxlength="40" rows="2" placeholder="${esc(g.ph)}">${esc(GIFT.msg)}</textarea><small><em id="lxGn">0</em>/40</small></label>
      <div class="lx-gbuy"><div><small>${esc(g.price)}</small><b>${money(p.price)}</b></div><button class="s-btn s-btn-primary" id="lxGadd">${esc(g.add)}</button></div>
      <small class="lx-gnote">${esc(g.note)}</small></div>
  </div>`;
}
function bindGift(host, lang) {
  const g = S(lang).gift;
  const paint = () => {
    $$('.lx-jar', host).forEach(j => { const sw = GIFT.jars[+j.dataset.jar] === 's'; j.classList.toggle('sw', sw); j.classList.toggle('pl', !sw); $('.lx-jt', j).textContent = (sw ? g.sweet : g.plain).slice(0, lang === 'zh' || lang === 'ja' ? 2 : 1); });
    const ns = GIFT.jars.filter(x => x === 's').length; $('#lxGs', host).textContent = ns; $('#lxGp', host).textContent = 6 - ns;
  };
  $$('.lx-jar', host).forEach(j => { const flip = () => { const i = +j.dataset.jar; GIFT.jars[i] = GIFT.jars[i] === 's' ? 'p' : 's'; paint(); j.classList.remove('pop'); void j.getBBox(); j.classList.add('pop'); };
    j.addEventListener('click', flip); j.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } }); });
  $$('[data-gmix]', host).forEach(b => b.addEventListener('click', () => { const [k, d] = b.dataset.gmix.split(':'); const want = k === 's' ? 's' : 'p', other = want === 's' ? 'p' : 's';
    if (+d > 0) { const i = GIFT.jars.indexOf(other); if (i >= 0) GIFT.jars[i] = want; } else { const i = GIFT.jars.lastIndexOf(want); if (i >= 0) GIFT.jars[i] = other; } paint(); }));
  const ta = $('#lxGmsg', host), out = $('#lxGcardTxt', host), n = $('#lxGn', host);
  const upd = () => { GIFT.msg = ta.value.slice(0, 40); out.textContent = GIFT.msg || g.ph; out.classList.toggle('ph', !GIFT.msg); n.textContent = GIFT.msg.length; };
  ta.addEventListener('input', upd); upd();
  $('#lxGadd', host).addEventListener('click', (e) => {
    const ns = GIFT.jars.filter(x => x === 's').length;
    try { const a = JSON.parse(localStorage.getItem(LS_GIFT) || '[]'); a.push({ sweet: ns, plain: 6 - ns, msg: GIFT.msg }); localStorage.setItem(LS_GIFT, JSON.stringify(a)); } catch { /* ignore */ }
    const b = e.currentTarget, old = b.textContent;
    if (!cart.add('bn-gift', 1)) { b.textContent = g.soldout; setTimeout(() => { b.textContent = old; }, 1600); return; } b.textContent = '✓ ' + g.added; b.classList.add('ok'); setTimeout(() => { b.textContent = old; b.classList.remove('ok'); }, 1500);
  });
  paint();
}
// 結帳時把訂製禮盒的內容與卡片寫進訂單備註（後台出貨看得到），用完就清掉
export function takeGiftNote(items) {
  if (!items.some(i => i.pid === 'bn-gift')) return '';
  let a = []; try { a = JSON.parse(localStorage.getItem(LS_GIFT) || '[]'); localStorage.removeItem(LS_GIFT); } catch { /* ignore */ }
  return a.map(x => `金緞禮盒：冰糖 ${x.sweet} 瓶、無糖 ${x.plain} 瓶${x.msg ? `；卡片「${x.msg}」` : ''}`).join('\n');
}

// ---------- 商品卡與商品詳情的精品資訊 ----------
export function luxeCardMeta(p, lang) {
  if (!hasStory()) return '';
  const m = S(lang).meta || {};
  return `<span class="lx-cm"><i></i>${esc(m.origin || '')}</span><span class="dot">·</span><span>${esc(p.storage === 'fridge' ? m.fridge : m.room)}</span>`;
}
export function luxeSpecs(p, lang) {
  if (!hasStory()) return '';
  const s = S(lang), sp = s.spec || {}, o = s.origin;
  const d = p.days >= 365 ? `${Math.round(p.days / 365)}${sp.year}` : `${p.days}${sp.day}`;
  return `${o ? `<dt>${esc(sp.origin)}</dt><dd>${esc(o.facts[0][1])}</dd>` : ''}<dt>${esc(sp.keep)}</dt><dd>${esc((p.storage === 'fridge' ? sp.fridge : sp.room).replace('{d}', d))}</dd>`;
}
export const luxeImgNote = (lang) => (hasStory() ? ((S(lang).spec || {}).img || '') : '');

// ---------- 精品版面啟動：字體、主視覺照片與飛過的燕子 ----------
export function luxeBoot() {
  if (!hasStory()) return;
  // 本機開發與測試（localhost）不載入網路字體，用系統襯線字；正式網站才向 Google Fonts 取字
  const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && new URLSearchParams(location.search).get('fonts') !== '1';
  if (!local && !document.querySelector('link[data-lx-font]')) {
    for (const href of ['https://fonts.googleapis.com', 'https://fonts.gstatic.com']) { const l = document.createElement('link'); l.rel = 'preconnect'; l.href = href; if (href.includes('gstatic')) l.crossOrigin = ''; document.head.appendChild(l); }
    const f = document.createElement('link'); f.rel = 'stylesheet'; f.dataset.lxFont = '1';
    f.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Noto+Serif+TC:wght@400;500;600;700&display=swap';
    document.head.appendChild(f);
  }
  const hi = TENANT.heroImg;
  const hero = $('.s-hero');
  if (hi && hero) {
    document.body.classList.add('lx-photo');
    hero.style.setProperty('--lx-hero', `url("${hi.wide}")`); hero.style.setProperty('--lx-hero-m', `url("${hi.tall || hi.wide}")`);
    if (!$('.lx-fly', hero)) hero.insertAdjacentHTML('afterbegin', `<div class="lx-fly" aria-hidden="true">${[0, 1, 2, 3, 4].map(i => `<svg class="f${i}" viewBox="0 0 24 16"><path d="M0 8 C4 4.5 8 3.6 11.5 4.6 L21 0 L15.6 6.2 C17.6 7 18.8 8.6 18.2 9.8 C15.6 9 13.4 9.2 11.6 10.2 L3 16 L6.6 10.2 C4 10.4 1.6 9.6 0 8 Z"/></svg>`).join('')}</div><div class="lx-veil" aria-hidden="true"></div>`);
  }
}

// ---------- 精品版面的導覽列與頁尾 ----------
const NAV = { zh: ['產地', '禮盒'], en: ['Origin', 'Gift box'], ja: ['産地', 'ギフト'], vi: ['Xuất xứ', 'Hộp quà'], ms: ['Asal', 'Kotak hadiah'] };
function luxeNav(lang) {
  const box = $('.s-links'); if (!box) return;
  $$('[data-lxnav]', box).forEach(a => a.remove());
  const [o, g] = NAV[lang] || NAV.en, prod = $('a[href="#products"]', box);
  const links = [['#origin', o], ['#giftbox', g]].filter(([h]) => document.querySelector(h));
  links.reverse().forEach(([h, t]) => { const a = el(`<a href="${h}" data-lxnav>${esc(t)}</a>`); if (prod) prod.after(a); else box.prepend(a); });
}
const FOOT = {
  zh: { shop: '購物', about: '關於嬿窩', care: '客服', all: '全部商品', gift: '訂製禮盒', sub: '鮮燉訂閱', track: '訂單查詢', story: '品牌故事', origin: '芽莊燕島', faq: '常見問題', stew: '燉煮方法', ai: 'AI 導購（24 小時）', soon: '客服電話與信箱將於正式上架時公布', rights: '嬿窩 YAN NEST', img: '商品圖為 3D 示意' },
  en: { shop: 'Shop', about: 'About', care: 'Help', all: 'All products', gift: 'Gift box', sub: 'Subscription', track: 'Track order', story: 'Our story', origin: 'Nha Trang islands', faq: 'FAQ', stew: 'How to stew', ai: 'AI concierge (24/7)', soon: 'Phone and email will be published at launch', rights: 'YAN NEST', img: 'Product images are 3D illustrations' },
  ja: { shop: 'ショップ', about: '嬿窩について', care: 'サポート', all: 'すべての商品', gift: 'ギフト', sub: '定期便', track: '注文照会', story: 'ブランドストーリー', origin: 'ニャチャンの燕の島', faq: 'よくあるご質問', stew: '炊き方', ai: 'AIスタッフ（24時間）', soon: '電話・メールは正式オープン時に公開します', rights: '嬿窩 YAN NEST', img: '商品画像は3Dのイメージです' },
  vi: { shop: 'Mua sắm', about: 'Về YAN NEST', care: 'Hỗ trợ', all: 'Tất cả sản phẩm', gift: 'Hộp quà', sub: 'Gói định kỳ', track: 'Tra đơn', story: 'Câu chuyện', origin: 'Đảo yến Nha Trang', faq: 'Câu hỏi', stew: 'Cách chưng', ai: 'Trợ lý AI (24/7)', soon: 'Số điện thoại và email sẽ công bố khi chính thức mở bán', rights: 'YAN NEST', img: 'Hình sản phẩm là minh họa 3D' },
  ms: { shop: 'Beli-belah', about: 'Tentang', care: 'Bantuan', all: 'Semua produk', gift: 'Kotak hadiah', sub: 'Langganan', track: 'Jejak pesanan', story: 'Kisah kami', origin: 'Pulau Nha Trang', faq: 'Soalan lazim', stew: 'Cara tanak', ai: 'Pembantu AI (24/7)', soon: 'Telefon dan e-mel akan diumumkan semasa pelancaran', rights: 'YAN NEST', img: 'Gambar produk ialah ilustrasi 3D' },
};
function luxeFooter(lang) {
  const f = $('.s-foot'); if (!f) return;
  const t = FOOT[lang] || FOOT.en, s = S(lang), c = TENANT.contact || null;
  let box = $('.lx-foot', f); if (!box) { box = el('<div class="lx-foot"></div>'); f.prepend(box); }
  const care = c ? [c.line && `LINE：${esc(c.line)}`, c.email && esc(c.email), c.phone && esc(c.phone)].filter(Boolean).map(x => `<li>${x}</li>`).join('') : `<li class="muted">${esc(t.soon)}</li>`;
  box.innerHTML = `<div class="lx-fb"><img src="img/birdnest/logo.svg" width="56" height="56" alt=""><div><b>${esc(TENANT.name)}</b><small>${esc(TENANT.en || '')}</small></div><p>${esc((TENANT.copy && TENANT.copy[lang] && TENANT.copy[lang].tagline) || TENANT.tagline || '')}</p></div>
    <div><h6>${esc(t.shop)}</h6><ul><li><a href="#products">${esc(t.all)}</a></li><li><a href="#giftbox">${esc(t.gift)}</a></li><li><a href="#products" data-lxp="bn-sub">${esc(t.sub)}</a></li><li><a href="#" data-lxtrack>${esc(t.track)}</a></li></ul></div>
    <div><h6>${esc(t.about)}</h6><ul><li><a href="#story">${esc(t.story)}</a></li><li><a href="#origin">${esc(t.origin)}</a></li><li><a href="#stew">${esc(t.stew)}</a></li><li><a href="#faq">${esc(t.faq)}</a></li></ul></div>
    <div><h6>${esc(t.care)}</h6><ul><li><a href="#" data-lxbot>${esc(t.ai)}</a></li>${care}</ul></div>
    <p class="lx-fcopy">© ${new Date().getFullYear()} ${esc(t.rights)}・${esc(t.img)}</p>`;
  $('[data-lxbot]', box).addEventListener('click', (e) => { e.preventDefault(); const b = $('#botFab'); if (b) b.click(); });
  $('[data-lxtrack]', box).addEventListener('click', (e) => { e.preventDefault(); const b = $('.track-btn'); if (b) b.click(); });
}
