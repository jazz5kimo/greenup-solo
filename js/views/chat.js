// AI 聊天收單模擬器（多通路、多語言）
import { store } from '../state.js';
import { $, $$, el, gsap, esc, money, sleep, fmtTime } from '../util.js';
import { icon, chIcon } from '../icons.js';
import { PRODUCT_MAP, LANG_LABEL } from '../data.js';

const PIPE = ['偵測語言', '理解需求', '查詢庫存與價格', '確認品項／數量／寄送', '傳送付款連結', '建立訂單＋電子發票', '收款自動入帳'];

const SCENARIOS = [
  {
    id: 's-ja', channel: 'line', customer: '佐藤 ゆき', lang: 'ja', place: '日本・東京', color: '#2DB674',
    items: [{ pid: 'pineapple', qty: 3 }], region: '日本（國際寄送）', payment: '信用卡', ship: '國際寄送 NT$450',
    script: [
      { c: 'こんにちは！台湾旅行で食べたパイナップルケーキが忘れられなくて…。ギフトボックスを3箱、日本に送ってもらえますか？', zh: '你好！台灣旅行時吃到的鳳梨酥一直忘不了…可以寄 3 盒禮盒到日本嗎？', mark: [0, 1] },
      { ai: '佐藤様、こんにちは！パイナップルケーキ ギフトボックス（10個入り）は常温で14日間保存できるので、日本へ国際発送できます。3箱で NT$1,440、国際送料は NT$450 です。', zh: '佐藤小姐您好！鳳梨酥禮盒（10 入）常溫可保存 14 天，可以國際寄送到日本。3 盒 NT$1,440，國際運費 NT$450。', mark: [2], fields: ['items', 'qty'] },
      { c: 'お願いします！送り先は東京都です。', zh: '麻煩了！寄送地址是東京都。', fields: ['region'] },
      { ai: 'ご注文内容を確認します：パイナップルケーキ ギフトボックス ×3、東京都へ発送、合計 NT$1,890 です。こちらのリンクからお支払いください。', zh: '跟您確認訂單：鳳梨酥禮盒 ×3，寄送東京都，合計 NT$1,890。請由此連結付款。', mark: [3], fields: ['total'] },
      { pay: true, mark: [4] },
      { create: true, mark: [5] },
      { c: '支払いました！届くのを楽しみにしています。', zh: '付好了！很期待收到～', paid: true, mark: [6] },
      { ai: 'お支払いを確認しました。ご注文番号は {id} です。発送後に追跡番号をお送りします。ありがとうございました！', zh: '已確認收到款項，訂單編號 {id}。出貨後會傳送追蹤號碼給您，謝謝！' },
    ],
  },
  {
    id: 's-en', channel: 'whatsapp', customer: 'Aisyah R.', lang: 'en', place: '馬來西亞・吉隆坡', color: '#2E97D4',
    items: [{ pid: 'roll', qty: 2 }, { pid: 'basque', qty: 1 }], region: '台北市信義區（飯店）', payment: '信用卡', ship: '冷藏宅配・滿額免運',
    script: [
      { c: "Hi! I'm from KL and visiting Taipei this weekend. Can I order 2 strawberry cream rolls and 1 taro basque cake, delivered to my hotel in Xinyi on Saturday?", zh: '嗨！我從吉隆坡來，這週末到台北玩。可以訂 2 條草莓生乳捲和 1 個芋泥巴斯克，週六送到我在信義區的飯店嗎？', mark: [0, 1], fields: ['items', 'qty', 'region'] },
      { ai: 'Hi Aisyah, welcome to Taipei! Yes, we can deliver chilled to Xinyi on Saturday. 2 × Strawberry Cream Roll (NT$1,160) + 1 × Taro Basque 6" (NT$680) = NT$1,840, and shipping is free over NT$1,500.', zh: 'Aisyah 您好，歡迎來台北！可以，週六冷藏配送到信義區。草莓生乳捲 ×2（NT$1,160）＋芋泥巴斯克 6 吋 ×1（NT$680）＝NT$1,840，滿 NT$1,500 免運。', mark: [2], fields: ['total'] },
      { c: 'Perfect. Does the basque cake contain nuts? My friend is allergic.', zh: '太好了。巴斯克含堅果嗎？我朋友會過敏。' },
      { ai: 'Good question! The Taro Basque contains egg and milk, but no nuts. The cream roll has no nuts either. Shall I confirm the order?', zh: '好問題！芋泥巴斯克含蛋、奶，不含堅果；生乳捲也不含堅果。要幫您確認訂單嗎？' },
      { c: 'Yes please!', zh: '好的，麻煩了！', mark: [3] },
      { ai: 'Order summary: Strawberry Cream Roll ×2, Taro Basque ×1, delivery to Xinyi District on Saturday, total NT$1,840. Here is your payment link:', zh: '訂單摘要：草莓生乳捲 ×2、芋泥巴斯克 ×1，週六送達信義區，合計 NT$1,840。付款連結如下：' },
      { pay: true, mark: [4] },
      { create: true, mark: [5] },
      { c: 'Paid by card, thanks!', zh: '已用信用卡付款，謝謝！', paid: true, mark: [6] },
      { ai: 'Payment received! Order {id} is confirmed. Enjoy your trip in Taipei!', zh: '已收到款項！訂單 {id} 已確認，祝您台北玩得愉快！' },
    ],
  },
  {
    id: 's-vi', channel: 'zalo', customer: 'Nguyễn Thị Lan', lang: 'vi', place: '越南・現居桃園', color: '#7C62E6',
    items: [{ pid: 'cookie', qty: 2 }], region: '桃園市', payment: '銀行轉帳', ship: '常溫宅配 NT$150',
    script: [
      { c: 'Chào shop! Mình muốn đặt 2 hộp bánh quy thủ công để tặng sếp, giao đến Đào Viên được không?', zh: '哈囉！我想訂 2 盒手工餅乾禮盒送給老闆，可以寄到桃園嗎？', mark: [0, 1], fields: ['items', 'qty', 'region'] },
      { ai: 'Chào chị Lan! Được ạ. Hộp bánh quy thủ công (24 cái) giá NT$520/hộp, 2 hộp là NT$1,040, phí giao hàng đến Đào Viên NT$150. Bánh bảo quản ở nhiệt độ phòng được 30 ngày.', zh: 'Lan 姐您好！可以的。手工餅乾禮盒（24 片）每盒 NT$520，2 盒 NT$1,040，寄桃園運費 NT$150。餅乾常溫可保存 30 天。', mark: [2] },
      { c: 'Có thể thêm thiệp chúc mừng không?', zh: '可以加附賀卡嗎？' },
      { ai: 'Dạ được, shop tặng kèm thiệp miễn phí. Xác nhận: Bánh quy thủ công ×2, giao Đào Viên, tổng NT$1,190. Chị thanh toán qua link này nhé:', zh: '可以，免費附上賀卡。確認：手工餅乾禮盒 ×2，寄桃園，合計 NT$1,190。請透過此連結付款：', mark: [3], fields: ['total'] },
      { pay: true, mark: [4] },
      { create: true, mark: [5] },
      { c: 'Mình chuyển khoản rồi nhé. Cảm ơn shop!', zh: '我已經轉帳了，謝謝！', paid: true, mark: [6] },
      { ai: 'Cảm ơn chị! Đơn hàng {id} đã được xác nhận, shop sẽ gửi hàng trong hôm nay.', zh: '謝謝您！訂單 {id} 已確認，今天會出貨。' },
    ],
  },
  {
    id: 's-zh', channel: 'messenger', customer: '林小姐', lang: 'zh', place: '台灣・台中', color: '#DD5597',
    items: [{ pid: 'lemon', qty: 2 }, { pid: 'pound', qty: 1 }], region: '台中市', payment: '銀行轉帳', ship: '冷藏宅配 NT$150',
    script: [
      { c: '老闆娘～我想訂檸檬塔 2 盒、烏龍茶磅蛋糕 1 條，寄到台中，週六前會到嗎？', mark: [0, 1], fields: ['items', 'qty', 'region'] },
      { ai: '林小姐您好！可以的，今天下單明天冷藏出貨，週五就會到台中。檸檬塔 ×2（NT$840）＋烏龍茶磅蛋糕 ×1（NT$360），小計 NT$1,200，冷藏運費 NT$150，合計 NT$1,350。', mark: [2], fields: ['total'] },
      { c: '好～磅蛋糕可以不要太甜嗎？我爸在控糖' },
      { ai: '烏龍茶磅蛋糕是全店甜度最低的（★★☆☆☆），用凍頂烏龍茶入味，很多長輩都喜歡喔！確認訂單：檸檬塔 ×2、烏龍茶磅蛋糕 ×1，寄台中，合計 NT$1,350。付款連結如下：', mark: [3] },
      { pay: true, mark: [4] },
      { create: true, pending: true, mark: [5] },
      { c: '我等等用轉帳～' },
      { ai: '沒問題！訂單 {id} 已建立，收到款項後系統會自動通知您。' },
      { bank: true, paid: true, mark: [6] },
      { ai: '已收到您的轉帳 NT$1,350，謝謝林小姐！祝伯父吃得開心。' },
    ],
  },
];

let root, threads = [], active = null, playing = false;

export default {
  mount(section) {
    root = section;
    threads = SCENARIOS.map(s => ({ ...s, msgs: [], played: false, order: null, steps: new Set(), fieldsShown: new Set() }));
    section.innerHTML = `
    <div class="chat-wrap">
      <div class="glass inbox anim-in">
        <div class="inbox-h"><h3>多通路收件匣</h3><span class="chip-sm">${icon('globe', 13)} 自動翻譯</span></div>
        <div class="inbox-tabs"><span class="on">全部</span><span>${chIcon('line', 16)}</span><span>${chIcon('whatsapp', 16)}</span><span>${chIcon('zalo', 16)}</span><span>${chIcon('messenger', 16)}</span><span>${chIcon('web', 16)}</span></div>
        <ul class="threads" id="threads"></ul>
        <button class="btn btn-primary sim-btn" id="simBtn">${icon('play', 16)} 模擬客人訊息</button>
        <small class="sim-hint" id="simHint">依序播放：日本 → 馬來西亞 → 越南 → 台灣客人</small>
      </div>
      <div class="glass convo anim-in">
        <div class="convo-h" id="convoH"></div>
        <div class="msgs" id="msgs"></div>
        <div class="composer"><span class="auto-pill"><i></i>AI 自動駕駛中</span><input disabled placeholder="AI 正在代你回覆客人，必要時可隨時接手…"><button class="icon-btn" disabled>${icon('send', 18)}</button></div>
      </div>
      <div class="glass extract anim-in">
        <div class="card-h"><h3>${icon('wand', 18)} AI 擷取的訂單資訊</h3></div>
        <div class="ex-fields" id="exFields"></div>
        <div class="card-h" style="margin-top:14px"><h3>${icon('sparkle', 16)} 自動化流程</h3></div>
        <ol class="pipe" id="pipe">${PIPE.map((p, i) => `<li data-i="${i}"><span class="pipe-dot">${icon('check', 12)}</span>${p}</li>`).join('')}</ol>
      </div>
    </div>`;
    renderThreads();
    select(threads[0]);
    $('#simBtn', section).addEventListener('click', playNext);
    store.on('order', ({ order, remote }) => {
      if (order.channel === 'web' && order.conv) {
        const t = { id: 'web-' + order.id, channel: 'web', customer: order.customer, lang: order.lang, place: '官網 AI 導購', color: '#5EE0C4', items: order.items, region: order.region || '宅配', payment: order.payment,
          ship: order.shipping ? `運費 NT$${order.shipping}` : '免運', msgs: [], played: true, order, steps: new Set([0, 1, 2, 3, 4, 5, 6]), fieldsShown: new Set(['items', 'qty', 'region', 'total']), script: [] };
        for (const m of order.conv) t.msgs.push(m.from === 'c' ? { c: m.text, zh: m.zh } : { ai: m.text, zh: m.zh });
        t.msgs.push({ sys: `訂單 ${order.id} 已建立・電子發票 ${order.invoice}・已付款` });
        threads.unshift(t); renderThreads();
        const li = $(`.thread[data-id="${t.id}"]`, root); if (li) gsap.fromTo(li, { x: -30, opacity: 0, backgroundColor: 'rgba(94,224,196,.3)' }, { x: 0, opacity: 1, backgroundColor: 'rgba(94,224,196,0)', duration: 1 });
      }
    });
    store.on('reset', () => { threads = SCENARIOS.map(s => ({ ...s, msgs: [], played: false, order: null, steps: new Set(), fieldsShown: new Set() })); renderThreads(); select(threads[0]); updateSimBtn(); });
  },
  show() {},
};

function lastText(t) {
  const m = [...t.msgs].reverse().find(x => x.c || x.ai || x.sys);
  if (!m) return t.played ? '' : '尚無新訊息';
  return m.c || m.ai || m.sys;
}
function renderThreads() {
  const ul = $('#threads', root); ul.innerHTML = '';
  for (const t of threads) {
    const li = el(`<li class="thread ${active === t ? 'on' : ''} ${t.order ? 'done' : ''}" data-id="${t.id}">
      <div class="th-av" style="--c:${t.color}">${esc(t.customer.slice(0, 1))}${chIcon(t.channel, 18)}</div>
      <div class="th-body"><div class="th-top"><b>${esc(t.customer)}</b><span class="lang-tag">${LANG_LABEL[t.lang] || t.lang}</span></div>
      <p>${esc(lastText(t).replace('{id}', t.order?.id || ''))}</p><small>${esc(t.place)}</small></div>
      ${t.order ? `<span class="th-ok">${icon('check', 12)}</span>` : (!t.played ? '<span class="th-new"></span>' : '')}
    </li>`);
    li.addEventListener('click', () => { if (!playing) select(t); });
    ul.appendChild(li);
  }
}

function select(t) {
  active = t;
  $$('.thread', root).forEach(li => li.classList.toggle('on', li.dataset.id === t.id));
  $('#convoH', root).innerHTML = `<div class="th-av big" style="--c:${t.color}">${esc(t.customer.slice(0, 1))}${chIcon(t.channel, 20)}</div>
    <div><b>${esc(t.customer)}</b><small>${esc(t.place)}・經由 ${channelName(t.channel)}</small></div>
    <span class="lang-detect">${icon('globe', 14)} 偵測語言：${LANG_LABEL[t.lang]}${t.lang !== 'zh' ? ' → 自動翻譯中文' : ''}</span>`;
  const box = $('#msgs', root); box.innerHTML = '';
  if (!t.msgs.length) box.appendChild(el(`<div class="empty-convo">${icon('chat', 40)}<p>點左下「模擬客人訊息」，看 AI 用客人的語言自動接單</p></div>`));
  for (const m of t.msgs) box.appendChild(bubble(m, t));
  box.scrollTop = box.scrollHeight;
  renderExtract(t);
}
const channelName = (c) => ({ line: 'LINE', whatsapp: 'WhatsApp', zalo: 'Zalo', messenger: 'Messenger', web: '官網 AI 導購' }[c] || c);

function bubble(m, t) {
  const fill = (s) => esc(s || '').replace('{id}', t.order?.id || '');
  if (m.sys) return el(`<div class="sys-msg">${icon('check', 14)} ${fill(m.sys)}</div>`);
  if (m.pay) return el(`<div class="msg ai"><div class="paycard"><div class="pc-h">${icon('link', 16)} 安全付款連結</div><b>${money(m.total)}</b><small>pay.solo.greenup.ai/${esc(t.id)}（示範）</small><span class="pc-methods">信用卡・LINE Pay・Apple Pay・轉帳</span></div></div>`);
  if (m.typing) return el(`<div class="msg ${m.typing}"><div class="bub typing"><i></i><i></i><i></i></div></div>`);
  const who = m.c ? 'c' : 'ai';
  const text = m.c || m.ai;
  const showZh = t.lang !== 'zh' && m.zh;
  return el(`<div class="msg ${who}">
    ${who === 'c' ? `<div class="m-av" style="--c:${t.color}">${esc(t.customer.slice(0, 1))}</div>` : ''}
    <div class="bub"><p>${fill(text)}</p>${showZh ? `<div class="tr"><span>中文翻譯</span>${fill(m.zh)}</div>` : ''}</div>
    ${who === 'ai' ? `<div class="m-av ai">${icon('bot', 16)}</div>` : ''}
  </div>`);
}

function renderExtract(t) {
  const items = t.items.map(it => `${PRODUCT_MAP[it.pid].name} × ${it.qty}`).join('<br>');
  const total = t.order ? t.order.total : null;
  const rows = [
    ['customer', '客人', `${esc(t.customer)}（${LANG_LABEL[t.lang]}）`, true],
    ['items', '品項', items],
    ['qty', '數量', `${t.items.reduce((s, i) => s + i.qty, 0)} 件`],
    ['region', '寄送', `${esc(t.region)}<small>${esc(t.ship)}</small>`],
    ['total', '金額', total ? money(total) : esc(estTotal(t))],
    ['status', '付款', t.order ? (t.order.status === 'paid' ? '<span class="st paid">已付款・已入帳</span>' : '<span class="st pending">待付款・應收帳款</span>') : '<span class="st idle">尚未建立</span>'],
    ['invoice', '發票', t.order ? `<span class="mono">${t.order.invoice}</span>` : '—'],
  ];
  $('#exFields', root).innerHTML = rows.map(([k, l, v, always]) => `<div class="exf ${always || t.fieldsShown.has(k) || (t.order && ['status', 'invoice'].includes(k)) ? 'on' : ''}" data-k="${k}"><span>${l}</span><div>${v}</div></div>`).join('');
  $$('#pipe li', root).forEach(li => li.classList.toggle('done', t.steps.has(+li.dataset.i)));
}
function estTotal(t) {
  const sub = t.items.reduce((s, it) => s + PRODUCT_MAP[it.pid].price * it.qty, 0);
  const ship = t.region.includes('日本') ? 450 : sub >= 1500 ? 0 : 150;
  return money(sub + ship);
}

function updateSimBtn() {
  const next = threads.find(t => !t.played && t.script.length);
  const b = $('#simBtn', root);
  b.disabled = playing;
  b.innerHTML = playing ? `${icon('sparkle', 16)} AI 處理中…` : next ? `${icon('play', 16)} 模擬客人訊息` : `${icon('refresh', 16)} 重新播放`;
}

async function playNext() {
  if (playing) return;
  let t = threads.find(x => !x.played && x.script.length);
  if (!t) { // 全部播完：重設對話（訂單保留）
    threads = threads.filter(x => x.script.length).map(x => ({ ...SCENARIOS.find(s => s.id === x.id), msgs: [], played: false, order: null, steps: new Set(), fieldsShown: new Set() })).concat(threads.filter(x => !x.script.length));
    renderThreads(); t = threads.find(x => !x.played && x.script.length);
  }
  playing = true; t.played = true; updateSimBtn();
  select(t);
  const box = $('#msgs', root); box.innerHTML = '';
  for (const step of t.script) {
    if (active !== t) select(t);
    if (step.c || step.ai) {
      const typ = bubble({ typing: step.c ? 'c' : 'ai' }, t); box.appendChild(typ);
      gsap.fromTo(typ, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.25 });
      box.scrollTop = box.scrollHeight;
      await sleep(step.c ? 900 : 1200);
      typ.remove();
      const m = step.c ? { c: step.c, zh: step.zh } : { ai: step.ai, zh: step.zh };
      t.msgs.push(m);
      appendMsg(bubble(m, t), step.c ? 'c' : 'ai');
    }
    if (step.pay) { const m = { pay: true, total: estTotalNum(t) }; t.msgs.push(m); appendMsg(bubble(m, t), 'ai'); }
    if (step.create) {
      await sleep(500);
      t.order = store.createOrder({ channel: t.channel, customer: t.customer, lang: t.lang, items: t.items, payment: t.payment, status: 'pending', region: t.region,
        conv: t.msgs.filter(m => m.c || m.ai).map(m => ({ from: m.c ? 'c' : 'ai', text: m.c || m.ai, zh: m.zh })) });
      const m = { sys: `訂單 ${t.order.id} 已建立・電子發票 ${t.order.invoice}・同步至 POS／會計／庫存` }; t.msgs.push(m); appendMsg(bubble(m, t), 'sys');
    }
    if (step.bank) {
      await sleep(1600);
      const m = { sys: `銀行入帳通知：收到 ${money(t.order.total)}（虛擬帳號比對成功）` }; t.msgs.push(m); appendMsg(bubble(m, t), 'sys');
    }
    if (step.paid && t.order) { await sleep(400); store.markPaid(t.order.id); }
    for (const f of step.fields || []) t.fieldsShown.add(f);
    for (const s of step.mark || []) t.steps.add(s);
    renderExtract(t);
    for (const f of step.fields || []) { const n = $(`.exf[data-k="${f}"]`, root); n && gsap.fromTo(n, { backgroundColor: 'rgba(45,182,116,.35)' }, { backgroundColor: 'rgba(45,182,116,0)', duration: 1.2 }); }
    for (const s of step.mark || []) { const n = $(`#pipe li[data-i="${s}"]`, root); n && gsap.fromTo(n.querySelector('.pipe-dot'), { scale: 0.2 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' }); }
    renderThreads();
    await sleep(500);
  }
  playing = false; updateSimBtn(); renderThreads();
}
function estTotalNum(t) { const sub = t.items.reduce((s, it) => s + PRODUCT_MAP[it.pid].price * it.qty, 0); return sub + (t.region.includes('日本') ? 450 : sub >= 1500 ? 0 : 150); }

function appendMsg(node, who) {
  const box = $('#msgs', root);
  box.appendChild(node);
  gsap.fromTo(node, { opacity: 0, y: 16, x: who === 'c' ? -16 : who === 'ai' ? 16 : 0, scale: 0.96 }, { opacity: 1, y: 0, x: 0, scale: 1, duration: 0.45, ease: 'back.out(1.6)' });
  box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
}
