// 用問的：用一句話問出經營圖表
import { answer, EXAMPLES } from '../ask.js';
import { $, $$, el, gsap, esc, typeText, countUp, fmtDate, fmtTime, toast, getRecognizer } from '../util.js';
import { icon } from '../icons.js';
import { makeChart } from '../charts.js';
import { addDays } from '../data.js';

let root, chart = null, history = [], rec = null, listening = false, busy = false;

export default {
  mount(section) {
    root = section;
    section.innerHTML = `
    <div class="ask-wrap">
      <div class="ask-aurora" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="ask-hero anim-in">
        <h2>想知道生意狀況？<span class="grad-txt">直接問。</span></h2>
        <p>不用學報表、不用拉樞紐。用一句話問，AI 幫你查資料、畫圖、標出處。</p>
        <form class="ask-bar" id="askForm" autocomplete="off">
          <span class="ab-ic">${icon('sparkle', 22)}</span>
          <input id="askInput" placeholder="例如：上個月哪個商品賣最好？" aria-label="輸入問題">
          <button type="button" class="ab-mic" id="askMic" title="語音提問">${icon('mic', 20)}</button>
          <button type="submit" class="ab-go">${icon('arrow', 20)}<span>問 AI</span></button>
        </form>
        <div class="chips" id="askChips">${EXAMPLES.map(q => `<button class="chip" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>
      </div>
      <div class="ask-main">
        <div class="glass answer anim-in" id="answer">
          <div class="ans-empty">${icon('ask', 46)}<p>點上方的範例問題，或用麥克風直接說</p></div>
        </div>
        <div class="glass ask-hist anim-in"><div class="card-h"><h3>${icon('clock', 16)} 最近提問</h3></div><ul id="askHist"><li class="muted">尚無提問</li></ul></div>
      </div>
    </div>`;
    $('#askForm', section).addEventListener('submit', (e) => { e.preventDefault(); ask($('#askInput', root).value); });
    $$('.chip', section).forEach(c => c.addEventListener('click', () => { $('#askInput', root).value = c.dataset.q; ask(c.dataset.q); }));
    $('#askMic', section).addEventListener('click', toggleMic);
  },
  show() {
    gsap.fromTo($$('.chip', root), { opacity: 0, y: 12 }, { opacity: 1, y: 0, stagger: 0.04, duration: 0.4, delay: 0.2 });
  },
};

function toggleMic() {
  if (listening) { try { rec && rec.stop(); } catch { /* ignore */ } return; }
  rec = getRecognizer('zh-TW');
  const btn = $('#askMic', root);
  if (!rec) { toast('此瀏覽器不支援語音輸入', '請改用文字輸入，或使用 Chrome / Edge 開啟', { kind: 'warn', icon: icon('mic', 18) }); gsap.fromTo(btn, { x: -6 }, { x: 0, duration: 0.4, ease: 'elastic.out(1,0.3)' }); return; }
  const input = $('#askInput', root);
  rec.onresult = (e) => { let t = ''; for (const r of e.results) t += r[0].transcript; input.value = t; if (e.results[e.results.length - 1].isFinal) { stop(); ask(t); } };
  const stop = () => { listening = false; btn.classList.remove('rec'); };
  rec.onerror = () => { stop(); toast('沒有聽清楚', '請再說一次，或改用文字輸入', { kind: 'warn', icon: icon('mic', 18) }); };
  rec.onend = stop;
  try { rec.start(); listening = true; btn.classList.add('rec'); input.placeholder = '正在聆聽…請說出你的問題'; } catch { stop(); }
}

async function ask(q) {
  q = (q || '').trim();
  if (!q || busy) return;
  busy = true;
  const box = $('#answer', root);
  const t0 = new Date();
  let res = null;
  try { res = answer(q); } catch (e) { console.warn(e); res = null; }
  box.innerHTML = `
    <div class="ans-q"><span class="me">${icon('user', 16)}</span><p>${esc(q)}</p></div>
    <div class="ans-thinking"><span class="spin"></span>AI 正在理解問題、查詢訂單資料表…</div>`;
  gsap.fromTo(box.children, { opacity: 0, y: 12 }, { opacity: 1, y: 0, stagger: 0.1, duration: 0.4 });
  await new Promise(r => setTimeout(r, 650));
  if (!res) {
    box.innerHTML = `<div class="ans-q"><span class="me">${icon('user', 16)}</span><p>${esc(q)}</p></div>
      <div class="ans-body"><div class="ans-ai">${icon('bot', 18)}</div><div><p class="ans-text">這個問題我還在學習中。可以試試問「營收、熱銷商品、通路比例、趨勢、毛利率、庫存、時段、應收帳款」相關的問題。</p></div></div>`;
    busy = false; return;
  }
  const from = res.period.from, to = res.period.to;
  const atMidnight = to.getHours() === 0 && to.getMinutes() === 0 && to.getSeconds() === 0;
  const toShow = +to > +from && atMidnight ? addDays(to, -1) : to;
  const src = `資料來源：${res.table}，期間 ${fmtDate(from)}–${fmtDate(toShow > new Date() ? new Date() : toShow)}，查詢時間 ${fmtTime(t0)}`;
  const hl = res.highlight || {};
  box.innerHTML = `
    <div class="ans-q"><span class="me">${icon('user', 16)}</span><p>${esc(q)}</p><span class="intent">${icon('wand', 13)} 理解為：${esc(res.intent)}・${esc(res.period.label)}</span></div>
    <div class="ans-grid">
      <div class="ans-left">
        <div class="ans-hl"><small>${esc(hl.label || '')}</small><b id="ansHl">${hl.text ? esc(hl.text) : '0'}</b></div>
        <div class="ans-body"><div class="ans-ai">${icon('bot', 18)}</div><p class="ans-text" id="ansText"></p></div>
        <div class="ans-stats">${(res.stats || []).map(([k, v]) => `<div><small>${esc(k)}</small><b>${esc(v)}</b></div>`).join('')}</div>
      </div>
      <div class="ans-chart"><div class="chart" id="askChart"></div></div>
    </div>
    <div class="src-tag">${icon('db', 14)} ${esc(src)}</div>`;
  chart && chart.dispose();
  chart = makeChart($('#askChart', root));
  chart.setOption(res.option, true);
  gsap.fromTo($('.ans-grid', box).children, { opacity: 0, y: 20 }, { opacity: 1, y: 0, stagger: 0.12, duration: 0.6, ease: 'power3.out' });
  gsap.fromTo($('.src-tag', box), { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.6, delay: 0.5 });
  if (!hl.text) countUp($('#ansHl', root), hl.value || 0, { prefix: hl.prefix || '', suffix: hl.suffix || '', decimals: hl.decimals || 0, from: 0 });
  else gsap.fromTo('#ansHl', { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(2)' });
  history.unshift({ q, intent: res.intent, at: t0 });
  history = history.slice(0, 8);
  $('#askHist', root).innerHTML = history.map(h => `<li data-q="${esc(h.q)}"><b>${esc(h.q)}</b><small>${esc(h.intent)}・${fmtTime(h.at)}</small></li>`).join('');
  $$('#askHist li', root).forEach(li => li.addEventListener('click', () => { $('#askInput', root).value = li.dataset.q; ask(li.dataset.q); }));
  await typeText($('#ansText', root), res.text, 18);
  busy = false;
}
