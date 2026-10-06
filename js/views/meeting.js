// 會議機器人：逐字稿 → 摘要、決議、待辦 → 報價單草稿
import { store } from '../state.js';
import { $, $$, el, gsap, esc, sleep, money, fmtMD, fmtDate, toast, typeText } from '../util.js';
import { icon } from '../icons.js';
import { addDays, startOfDay, PRODUCTS } from '../data.js';
import { TENANT } from '../tenant.js';
import { IS_AMEI, CAT, VOC, SUPPLIERS, TAKEOUT, DRINK_TAKEOUT, measure } from '../brief-data.js';

const AMEI_LINES = [
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
const AMEI_WHO = { amei: { name: '阿美', role: '阿美手作甜點', c: '#2DB674' }, chen: { name: '陳經理', role: '好日子選物（通路商）', c: '#2E97D4' } };


// ---------- 其他業主：依業態大類產生會議劇本（通路批發／企業客戶），商品與價格取自目前業主 ----------
const nextWedTxt = () => fmtMD(nextWed(new Date())) + '（下週三）';
function buildScenario() {
  if (IS_AMEI) {
    return {
      lines: AMEI_LINES, who: AMEI_WHO, title: '好日子選物｜年末禮盒合作洽談', partner: '好日子選物（虛構通路商）', attendees: '阿美、陳經理（虛構通路商）',
      decisions: ['批發價：手工餅乾禮盒 NT$400／盒、鳳梨酥禮盒 NT$370／盒', '數量：首批餅乾禮盒 200 盒、鳳梨酥禮盒 150 盒', '交期：分兩批出貨（11/10、11/18），11/20 前全數送達台北倉庫', '付款：首批三成訂金，餘款月結 30 天；包裝加印聯名腰封'],
      summary: '好日子選物計畫在台北、台中兩間門市上架阿美手作甜點的禮盒，作為年底送禮檔期主力。首批採購手工餅乾禮盒 200 盒、鳳梨酥禮盒 150 盒，並加印雙方聯名腰封；預估本案營收約 NT$14.2 萬（含稅）。',
      todos: (today) => [
        { t: '寄送正式報價單給陳經理', who: '阿美', due: '今天', quote: true },
        { t: '設計聯名腰封 2 款供挑選', who: '阿美', due: fmtMD(nextWed(today)) + '（下週三）' },
        { t: '確認門市陳列位置與上架日', who: '陳經理', due: fmtMD(addDays(today, 10)) },
        { t: '奶油、麵粉、禮盒包材備料排程', who: 'AI 助理', due: fmtMD(addDays(today, 14)), auto: true },
      ],
      rows: [['手工餅乾禮盒（24 片）', 200, 400], ['鳳梨酥禮盒（10 入）', 150, 370], ['聯名腰封設計與加印', 1, 0]],
      terms: ['交期：11/10、11/18 分兩批出貨，11/20 前送達台北倉庫', '付款：簽約後付三成訂金，餘款月結 30 天'],
      extra: '聯名腰封設計與加印', editTip: '例如：「餅乾改成 250 盒，給 95 折」（示範）',
    };
  }
  const O = TENANT.owner;
  const sorted = [...PRODUCTS].sort((x, y) => (y.pop || 0) - (x.pop || 0));
  const A = sorted[0], B = sorted[1] || sorted[0];
  const ws = (p) => Math.max(10, Math.round(p.price * 0.78 / 10) * 10); // 批發／專案價約 78 折
  const q = (p, budget) => Math.max(10, Math.min(300, Math.round(budget / p.price / 10) * 10));
  const qa = q(A, 90000), qb = q(B, 60000), pa = ws(A), pb = ws(B);
  const un = measure;
  const total = Math.round((qa * pa + qb * pb) * 1.05);
  const sup = SUPPLIERS[0];
  const prep = `${sup ? sup.item : VOC.material}${VOC.make}排程`;
  const K = {
    flower: { partner: '晨光商辦', kind: '企業客戶', topic: '辦公室花藝與年末活動花禮', mgr: '陳經理',
      open: `${O}你好，上次送來的花禮同事都很喜歡，我們想把辦公室接待區的花藝固定交給你。`,
      need: `每週一換一次，先簽三個月；年末活動另外要 ${A.name} ${qa} ${un(A)}、${B.name} ${qb} ${un(B)}。`,
      extraQ: '花材可以配合我們的品牌色嗎？卡片也想印公司 logo。', extraA: `可以，我挑兩組配色方案，${nextWedTxt()}前給您選；卡片印製我來安排。`,
      due: `年末活動花禮希望 12/20 前送到台北辦公室。`, dueA: `沒問題，鮮花會在活動前一天${VOC.ship}，確保最新鮮；每週花藝固定週一上午到。`,
      extra: '品牌色配色設計與卡片印製', loc: '台北辦公室', act: '確認辦公室擺放位置與每週收件人' },
    service: { partner: '晨光科技', kind: '企業福利委員會', topic: '員工福利專案', mgr: '陳經理',
      open: `${O}你好，我們福委會想把${TENANT.typeName}列入今年的員工福利，同事反應很好。`,
      need: `預計第一波 ${A.name} ${qa} 次、${B.name} ${qb} 次，用預付券的方式發給同事。`,
      extraQ: '可以安排同事集中在平日下午預約嗎？', extraA: `可以，我每週保留兩個平日下午時段給貴公司，預約由 AI 用 LINE 統一確認。`,
      due: '券希望 12 月初就能發給同事，效期半年。', dueA: '可以，12 月 1 日前把電子券與預約說明寄給您，名單確認後即可發放。',
      extra: '專屬預約時段與電子券設定', loc: '貴公司福委會', act: '確認發券名單與預約規則公告' },
    food: { partner: '晨光科技', kind: '企業客戶', topic: DRINK_TAKEOUT ? '員工下午茶與活動訂購' : '員工午餐與年末聚餐訂餐', mgr: '陳經理',
      open: `${O}你好，上次試喝試吃的${A.name}大家都說好，我們想固定訂員工${DRINK_TAKEOUT ? '下午茶' : '午餐'}。`.replace('試喝試吃', DRINK_TAKEOUT ? '試喝' : '試吃'),
      need: `每月大約 ${A.name} ${qa} ${un(A)}、${B.name} ${qb} ${un(B)}，分批在${DRINK_TAKEOUT ? '下午' : '中午'}送到。`,
      extraQ: DRINK_TAKEOUT ? '可以分開標示甜度冰塊嗎？有同事不能喝奶。' : '可以分開標示辣度和過敏原嗎？有同事不吃辣，也有人對海鮮過敏。', extraA: DRINK_TAKEOUT ? '可以，每杯都貼品名、甜度冰塊與過敏原標籤，不能喝奶的同事會改用無奶選項。' : '可以，每份都貼品名、辣度與過敏原標籤，特殊需求的餐點另外分裝、分開標示。',
      due: DRINK_TAKEOUT ? '希望 11 月中開始，每次 15:00 前送到。' : '希望 11 月中開始，每次 11:45 前送到。', dueA: DRINK_TAKEOUT ? '可以，14:15 開始製作、15:00 前送達，外送保冷袋全程溫控。' : '可以，我們 11:00 出餐、11:45 前送達，外送保溫箱全程溫控。',
      extra: '分裝標籤與保溫外送', loc: '貴公司', act: '確認每週訂餐人數與用餐地點' },
  }[TAKEOUT ? 'food' : CAT] || { partner: '好日子選物', kind: '通路商', topic: `年末${TENANT.typeName}合作洽談`, mgr: '陳經理',
    open: `${O}你好，上次寄來的樣品我們老闆很喜歡，想放在台北和台中兩間門市賣。`,
    need: `年底檔期，我們想先進 ${A.name} ${qa} ${un(A)}、${B.name} ${qb} ${un(B)}。`,
    extraQ: '包裝能不能加我們的聯名腰封？', extraA: `可以，腰封設計我出兩款，${nextWedTxt()}前給您挑。`,
    due: '交貨希望 11 月 20 號前到台北倉庫。', dueA: `可以，我分兩批${VOC.ship}：11/10 第一批、11/18 第二批。`,
    extra: '聯名腰封設計與加印', loc: '台北倉庫', act: '確認門市陳列位置與上架日' };
  const lines = [
    ['chen', '00:05', K.open],
    ['amei', '00:18', '謝謝！請問第一批預計要多少量呢？'],
    ['chen', '00:24', K.need],
    ['amei', '00:37', `沒問題。專案價的部分，${A.name} ${pa} 元、${B.name} ${pb} 元。`],
    ['chen', '00:51', `價格可以接受。${K.extraQ}`],
    ['amei', '01:03', K.extraA],
    ['chen', '01:15', K.due],
    ['amei', '01:26', K.dueA],
    ['chen', '01:40', '付款我們是月結 30 天，可以嗎？'],
    ['amei', '01:49', '可以，首批請先付三成訂金，其餘月結 30 天。'],
    ['chen', '02:01', 'OK，那麻煩你先給我一份正式報價單。'],
    ['amei', '02:08', '好，今天下班前寄給您。'],
  ];
  return {
    lines, who: { amei: { name: O, role: TENANT.name, c: '#2DB674' }, chen: { name: K.mgr, role: `${K.partner}（${K.kind}）`, c: '#2E97D4' } },
    title: `${K.partner}｜${K.topic}`, partner: `${K.partner}（虛構${K.kind}）`, attendees: `${O}、${K.mgr}（虛構${K.kind}）`,
    decisions: [`專案價：${A.name} NT$${pa}／${un(A)}、${B.name} NT$${pb}／${un(B)}`, `數量：首批 ${A.name} ${qa} ${un(A)}、${B.name} ${qb} ${un(B)}`, `交期：${K.dueA.replace(/^(可以|沒問題)[，,]\s*(我們?)?/, '')}`, `付款：首批三成訂金，餘款月結 30 天；另含${K.extra}`],
    summary: `${K.partner}計畫與${TENANT.name}合作「${K.topic}」。首批 ${A.name} ${qa} ${un(A)}、${B.name} ${qb} ${un(B)}，並包含${K.extra}；預估本案營收約 NT$${(total / 10000).toFixed(1)} 萬（含稅）。`,
    todos: (today) => [
      { t: `寄送正式報價單給${K.mgr}`, who: O, due: '今天', quote: true },
      { t: `準備${K.extra}方案`, who: O, due: fmtMD(nextWed(today)) + '（下週三）' },
      { t: K.act, who: K.mgr, due: fmtMD(addDays(today, 10)) },
      { t: prep, who: 'AI 助理', due: fmtMD(addDays(today, 14)), auto: true },
    ],
    rows: [[`${A.name}（${A.unit}）`, qa, pa], [`${B.name}（${B.unit}）`, qb, pb], [K.extra, 1, 0]],
    terms: [`交期：${K.dueA.replace(/^(可以|沒問題)[，,]\s*(我們?)?/, '')}`, '付款：簽約後付三成訂金，餘款月結 30 天'],
    extra: K.extra, editTip: `例如：「${A.name}改成 ${qa + 50} ${un(A)}，給 95 折」（示範）`,
  };
}
const SC = buildScenario();
const LINES = SC.lines, WHO = SC.who;

let root, playing = false, done = false;

function nextWed(d) { const x = startOfDay(d); const add = ((3 - x.getDay()) + 7) % 7 || 7; return addDays(x, add); }

export default {
  mount(section) {
    root = section;
    section.innerHTML = `
    <div class="meet-wrap">
      <div class="glass meet-left anim-in">
        <div class="meet-h">
          <div><span class="chip-sm">${icon('meeting', 13)} 線上會議・自動錄音轉寫</span><h3>${esc(SC.title)}</h3><small>${fmtDate(new Date())}・與會：${esc(SC.attendees)}</small></div>
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
  store.log('meet', `會議機器人已產生「${SC.title}」紀錄：4 項決議、4 項待辦`);
}

async function generate() {
  const today = new Date();
  const sum = $('#mSum', root); sum.className = 'mr-text';
  sum.innerHTML = '<p></p>';
  const decisions = SC.decisions;
  const todos = SC.todos(today);
  await typeText($('p', sum), SC.summary, 14);
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
  const rows = SC.rows;
  const sub = rows.reduce((s, r) => s + r[1] * r[2], 0);
  const tax = Math.round(sub * 0.05);
  const no = `Q-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-01`;
  $('#quote', root).innerHTML = `
    <div class="q-h"><div><span class="chip-sm">${icon('wand', 13)} AI 依會議紀錄自動產生・草稿</span><h3>報價單</h3><small class="mono">${no}</small></div><button class="icon-btn" id="qClose">${icon('x', 18)}</button></div>
    <div class="q-meta"><div><small>客戶</small><b>${esc(SC.partner)}</b><span>聯絡人：${esc(WHO.chen.name)}</span></div><div><small>報價方</small><b>${esc(IS_AMEI ? '阿美手作甜點' : TENANT.name)}</b><span>報價日期：${fmtDate(today)}</span></div></div>
    <table class="q-tbl"><thead><tr><th>品項</th><th class="r">數量</th><th class="r">單價</th><th class="r">金額</th></tr></thead><tbody>
      ${rows.map(r => `<tr><td>${esc(r[0])}</td><td class="r">${r[1]}</td><td class="r">${r[2] ? money(r[2]) : '贈送'}</td><td class="r">${money(r[1] * r[2])}</td></tr>`).join('')}
    </tbody><tfoot><tr><td colspan="3">小計（未稅）</td><td class="r">${money(sub)}</td></tr><tr><td colspan="3">營業稅 5%</td><td class="r">${money(tax)}</td></tr><tr class="tot"><td colspan="3">總計</td><td class="r">${money(sub + tax)}</td></tr></tfoot></table>
    <ul class="q-terms">${SC.terms.map(t => `<li>${esc(t)}</li>`).join('')}<li>報價有效期限：${fmtDate(addDays(today, 30))}</li></ul>
    <div class="q-act"><button class="btn btn-ghost" id="qEdit">${icon('wand', 16)} 請 AI 調整</button><button class="btn btn-primary" id="qSend">${icon('send', 16)} 確認並寄出（模擬）</button></div>`;
  const m = $('#quoteModal', root); m.hidden = false;
  gsap.fromTo(m, { opacity: 0 }, { opacity: 1, duration: 0.3 });
  gsap.fromTo('#quote', { y: 40, scale: 0.94, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.55, ease: 'back.out(1.6)' });
  gsap.fromTo('#quote .q-tbl tbody tr', { opacity: 0, x: -14 }, { opacity: 1, x: 0, stagger: 0.1, delay: 0.3 });
  $('#qClose', root).addEventListener('click', closeQuote);
  $('#qEdit', root).addEventListener('click', () => toast('AI 可依指示改寫', SC.editTip, { kind: 'info', icon: icon('wand', 18) }));
  $('#qSend', root).addEventListener('click', () => {
    toast('報價單已寄出（模擬）', `${no} 已寄給${WHO.chen.name}，待辦「寄送正式報價單」已完成`, { icon: icon('send', 18) });
    const box = $('.td .td-box', root); box && box.classList.add('done');
    closeQuote();
  });
}
function closeQuote() { const m = $('#quoteModal', root); gsap.to(m, { opacity: 0, duration: 0.25, onComplete: () => { m.hidden = true; } }); }
