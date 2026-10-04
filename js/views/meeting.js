// 會議機器人：逐字稿 → 摘要、決議、待辦 → 報價單草稿
import { store } from '../state.js';
import { $, $$, el, gsap, esc, sleep, money, fmtMD, fmtDate, toast, typeText } from '../util.js';
import { icon } from '../icons.js';
import { addDays, startOfDay } from '../data.js';

const LINES = [
  ['chen', '00:05', '阿美你好，上次試吃的手工餅乾禮盒，我們老闆很喜歡，想放在台北和台中兩間門市賣。'],
  ['amei', '00:18', '謝謝！請問第一批預計要多少量呢？'],
  ['chen', '00:24', '年底送禮檔期，我們想先進餅乾禮盒 200 盒、鳳梨酥禮盒 150 盒。'],
  ['amei', '00:37', '沒問題。批發價的部分，餅乾禮盒 400 元、鳳梨酥 370 元。'],
  ['chen', '00:51', '價格可以接受。包裝能不能加我們的聯名腰封？'],
  ['amei', '01:03', '可以，腰封設計我出兩款，下週三前給您挑。'],
  ['chen', '01:15', '好。交貨希望 11 月 20 號前到台北倉庫。'],
  ['amei', '01:26', '可以，我分兩批出貨：11/10 第一批、11/18 第二批。'],
  ['chen', '01:40', '付款我們是月結 30 天，可以嗎？'],
  ['amei', '01:49', '可以，首批請先付三成訂金，其餘月結 30 天。'],
  ['chen', '02:01', 'OK，那麻煩你先給我一份正式報價單。'],
  ['amei', '02:08', '好，今天下班前寄給您。'],
];
const WHO = { amei: { name: '阿美', role: '阿美手作甜點', c: '#2DB674' }, chen: { name: '陳經理', role: '好日子選物（通路商）', c: '#2E97D4' } };

let root, playing = false, done = false;

function nextWed(d) { const x = startOfDay(d); const add = ((3 - x.getDay()) + 7) % 7 || 7; return addDays(x, add); }

export default {
  mount(section) {
    root = section;
    section.innerHTML = `
    <div class="meet-wrap">
      <div class="glass meet-left anim-in">
        <div class="meet-h">
          <div><span class="chip-sm">${icon('meeting', 13)} 線上會議・自動錄音轉寫</span><h3>好日子選物｜年末禮盒合作洽談</h3><small>${fmtDate(new Date())}・與會：阿美、陳經理（虛構通路商）</small></div>
          <div class="people">${Object.values(WHO).map(w => `<span class="pp" style="--c:${w.c}" title="${w.name}">${w.name.slice(0, 1)}</span>`).join('')}<span class="pp bot" title="GreenUP 會議機器人">${icon('bot', 16)}</span></div>
        </div>
        <div class="rec-row"><div class="eq" id="eq">${'<i></i>'.repeat(28)}</div><span class="rec-t" id="recT">00:00</span>
          <button class="btn btn-primary" id="meetGo">${icon('play', 16)} 播放會議並產生紀錄</button></div>
        <div class="meet-lines" id="meetLines"><div class="empty-convo">${icon('meeting', 40)}<p>會議機器人會即時轉寫，結束後自動產生摘要、決議與待辦</p></div></div>
      </div>
      <div class="glass meet-right anim-in">
        <div class="card-h"><h3>${icon('sparkle', 18)} AI 會議紀錄</h3><span class="chip-sm" id="mStatus">等待會議</span></div>
        <section class="mr-sec"><h4>摘要</h4><div id="mSum" class="skel"><i></i><i></i><i style="width:60%"></i></div></section>
        <section class="mr-sec"><h4>決議</h4><ul id="mDec" class="skel"><i></i><i></i><i style="width:70%"></i></ul></section>
        <section class="mr-sec"><h4>待辦事項</h4><div id="mTodo" class="skel"><i></i><i></i><i></i></div></section>
      </div>
      <div class="modal" id="quoteModal" hidden><div class="quote" id="quote"></div></div>
    </div>`;
    $('#meetGo', section).addEventListener('click', play);
    $('#quoteModal', section).addEventListener('click', (e) => { if (e.target.id === 'quoteModal') closeQuote(); });
  },
  show() {},
};

async function play() {
  if (playing) return;
  playing = true; done = false;
  const btn = $('#meetGo', root); btn.disabled = true; btn.innerHTML = `${icon('mic', 16)} 會議進行中…`;
  const box = $('#meetLines', root); box.innerHTML = '';
  ['#mSum', '#mDec', '#mTodo'].forEach(s => { const n = $(s, root); n.className = 'skel'; n.innerHTML = '<i></i><i></i><i style="width:60%"></i>'; });
  $('#mStatus', root).textContent = '即時轉寫中';
  $('#eq', root).classList.add('on');
  for (const [who, t, text] of LINES) {
    const w = WHO[who];
    $('#recT', root).textContent = t;
    const row = el(`<div class="ml ${who}"><span class="ml-av" style="--c:${w.c}">${w.name.slice(0, 1)}</span><div><div class="ml-h"><b>${w.name}</b><small>${w.role}・${t}</small></div><p></p></div></div>`);
    box.appendChild(row);
    gsap.fromTo(row, { opacity: 0, x: who === 'amei' ? 20 : -20 }, { opacity: 1, x: 0, duration: 0.4 });
    await typeText($('p', row), text, 16);
    box.scrollTop = box.scrollHeight;
    await sleep(260);
  }
  $('#eq', root).classList.remove('on');
  $('#mStatus', root).textContent = 'AI 整理中…';
  await sleep(900);
  await generate();
  $('#mStatus', root).textContent = '已完成・已同步待辦與行事曆';
  btn.disabled = false; btn.innerHTML = `${icon('refresh', 16)} 重新播放`;
  playing = false; done = true;
  store.log('meet', '會議機器人已產生「好日子選物｜年末禮盒合作洽談」紀錄：4 項決議、4 項待辦');
}

async function generate() {
  const today = new Date();
  const sum = $('#mSum', root); sum.className = 'mr-text';
  sum.innerHTML = '<p></p>';
  const decisions = ['批發價：手工餅乾禮盒 NT$400／盒、鳳梨酥禮盒 NT$370／盒', '數量：首批餅乾禮盒 200 盒、鳳梨酥禮盒 150 盒', '交期：分兩批出貨（11/10、11/18），11/20 前全數送達台北倉庫', '付款：首批三成訂金，餘款月結 30 天；包裝加印聯名腰封'];
  const todos = [
    { t: '寄送正式報價單給陳經理', who: '阿美', due: '今天', quote: true },
    { t: '設計聯名腰封 2 款供挑選', who: '阿美', due: fmtMD(nextWed(today)) + '（下週三）' },
    { t: '確認門市陳列位置與上架日', who: '陳經理', due: fmtMD(addDays(today, 10)) },
    { t: '奶油、麵粉、禮盒包材備料排程', who: 'AI 助理', due: fmtMD(addDays(today, 14)), auto: true },
  ];
  await typeText($('p', sum), '好日子選物計畫在台北、台中兩間門市上架阿美手作甜點的禮盒，作為年底送禮檔期主力。首批採購手工餅乾禮盒 200 盒、鳳梨酥禮盒 150 盒，並加印雙方聯名腰封；預估本案營收約 NT$14.2 萬（含稅）。', 14);
  const dec = $('#mDec', root); dec.className = 'mr-list'; dec.innerHTML = decisions.map(d => `<li>${icon('check', 14)}<span>${esc(d)}</span></li>`).join('');
  gsap.fromTo($$('li', dec), { opacity: 0, x: 20 }, { opacity: 1, x: 0, stagger: 0.15, duration: 0.45 });
  await sleep(700);
  const td = $('#mTodo', root); td.className = 'todo';
  td.innerHTML = todos.map((x, i) => `<div class="td"><span class="td-box"></span><div class="td-b"><b>${esc(x.t)}</b><small>負責：${esc(x.who)}・期限：${esc(x.due)}${x.auto ? '・AI 自動執行' : ''}</small></div>${x.quote ? `<button class="btn btn-sm btn-primary" data-quote>${icon('file', 14)} 轉成報價單</button>` : ''}</div>`).join('');
  gsap.fromTo($$('.td', td), { opacity: 0, y: 16 }, { opacity: 1, y: 0, stagger: 0.15, duration: 0.45 });
  const qb = $('[data-quote]', td);
  qb.addEventListener('click', openQuote);
  gsap.fromTo(qb, { boxShadow: '0 0 0 0 rgba(45,182,116,.8)' }, { boxShadow: '0 0 0 12px rgba(45,182,116,0)', repeat: 3, duration: 1.1, delay: 0.8 });
}

function openQuote() {
  const today = new Date();
  const rows = [['手工餅乾禮盒（24 片）', 200, 400], ['鳳梨酥禮盒（10 入）', 150, 370], ['聯名腰封設計與加印', 1, 0]];
  const sub = rows.reduce((s, r) => s + r[1] * r[2], 0);
  const tax = Math.round(sub * 0.05);
  const no = `Q-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-01`;
  $('#quote', root).innerHTML = `
    <div class="q-h"><div><span class="chip-sm">${icon('wand', 13)} AI 依會議紀錄自動產生・草稿</span><h3>報價單</h3><small class="mono">${no}</small></div><button class="icon-btn" id="qClose">${icon('x', 18)}</button></div>
    <div class="q-meta"><div><small>客戶</small><b>好日子選物（虛構通路商）</b><span>聯絡人：陳經理</span></div><div><small>報價方</small><b>阿美手作甜點</b><span>報價日期：${fmtDate(today)}</span></div></div>
    <table class="q-tbl"><thead><tr><th>品項</th><th class="r">數量</th><th class="r">單價</th><th class="r">金額</th></tr></thead><tbody>
      ${rows.map(r => `<tr><td>${r[0]}</td><td class="r">${r[1]}</td><td class="r">${r[2] ? money(r[2]) : '贈送'}</td><td class="r">${money(r[1] * r[2])}</td></tr>`).join('')}
    </tbody><tfoot><tr><td colspan="3">小計（未稅）</td><td class="r">${money(sub)}</td></tr><tr><td colspan="3">營業稅 5%</td><td class="r">${money(tax)}</td></tr><tr class="tot"><td colspan="3">總計</td><td class="r">${money(sub + tax)}</td></tr></tfoot></table>
    <ul class="q-terms"><li>交期：11/10、11/18 分兩批出貨，11/20 前送達台北倉庫</li><li>付款：簽約後付三成訂金，餘款月結 30 天</li><li>報價有效期限：${fmtDate(addDays(today, 30))}</li></ul>
    <div class="q-act"><button class="btn btn-ghost" id="qEdit">${icon('wand', 16)} 請 AI 調整</button><button class="btn btn-primary" id="qSend">${icon('send', 16)} 確認並寄出（模擬）</button></div>`;
  const m = $('#quoteModal', root); m.hidden = false;
  gsap.fromTo(m, { opacity: 0 }, { opacity: 1, duration: 0.3 });
  gsap.fromTo('#quote', { y: 40, scale: 0.94, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.55, ease: 'back.out(1.6)' });
  gsap.fromTo('#quote .q-tbl tbody tr', { opacity: 0, x: -14 }, { opacity: 1, x: 0, stagger: 0.1, delay: 0.3 });
  $('#qClose', root).addEventListener('click', closeQuote);
  $('#qEdit', root).addEventListener('click', () => toast('AI 可依指示改寫', '例如：「餅乾改成 250 盒，給 95 折」（示範）', { kind: 'info', icon: icon('wand', 18) }));
  $('#qSend', root).addEventListener('click', () => {
    toast('報價單已寄出（模擬）', `${no} 已寄給陳經理，待辦「寄送正式報價單」已完成`, { icon: icon('send', 18) });
    const box = $('.td .td-box', root); box && box.classList.add('done');
    closeQuote();
  });
}
function closeQuote() { const m = $('#quoteModal', root); gsap.to(m, { opacity: 0, duration: 0.25, onComplete: () => { m.hidden = true; } }); }
