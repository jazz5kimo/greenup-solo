// 銷售網頁：精品版面（lay-luxe）的品牌故事區塊
// 故事、四種燕窩怎麼挑、從燕屋到餐桌、在家燉一盞（份量計算）、品質承諾、常見問題、示範聲明。
// 內容放在業主的 merchant.story（五語，見 biz/g5.js）；沒有 story 的業主不顯示這一區。
import { TENANT } from '../tenant.js';
import { $, $$, el, esc } from '../util.js';

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
  <div class="lx-sec lx-intro lx-rv" id="story">
    <div class="lx-intro-t"><span class="lx-k">${esc(st.k)}</span><h2>${st.h}</h2>${st.p.map(p => `<p>${esc(p)}</p>`).join('')}<span class="lx-sign">— ${esc(st.sign)}</span></div>
    <div class="lx-intro-a">${STORY_ART}</div>
  </div>
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
  reveal(host);
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
