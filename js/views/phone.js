// AI 電話客服模擬
import { store } from '../state.js';
import { $, $$, el, gsap, esc, money, sleep, speak, stopSpeak, pad } from '../util.js';
import { icon } from '../icons.js';
import { PRODUCTS, PRODUCT_MAP, SHIPPING_FEE, FREE_SHIP } from '../data.js';
import { TENANT } from '../tenant.js';
import { IS_AMEI, CAT, HAS_BEANS, TAKEOUT, DRINK_TAKEOUT, measure } from '../brief-data.js';

const AMEI_SCRIPT = [
  { who: 'ai', text: '您好，這裡是阿美手作甜點，我是 AI 客服小美，請問需要什麼服務呢？', intent: '問候' },
  { who: 'c', text: '你好，我想訂芋泥巴斯克，要送給我媽媽當生日禮物。', fields: { item: '芋泥巴斯克（6 吋）' }, intent: '下訂單・送禮' },
  { who: 'ai', text: '好的！芋泥巴斯克 6 吋一個 NT$680，冷藏宅配。請問要訂幾個呢？' },
  { who: 'c', text: '兩個好了，寄到台中。', fields: { qty: '2 個', region: '台中市' } },
  { who: 'ai', text: '了解。請問希望哪一天送達呢？' },
  { who: 'c', text: '這個禮拜六之前就可以。', fields: { date: '本週六前' } },
  { who: 'ai', text: '跟您確認一下：芋泥巴斯克 2 個，寄到台中，週六前送達，含冷藏運費共 NT$1,510，對嗎？', confirm: true, fields: { total: 'NT$ 1,510' } },
  { who: 'c', text: '對，沒錯。', fields: { ok: '客人已口頭確認' }, intent: '確認' },
  { who: 'ai', text: '好的，訂單已經建立，付款連結會用簡訊傳給您。祝令堂生日快樂，謝謝您的來電！', create: true },
];

// 金額依目前售價（含節日特價）即時換算
if (IS_AMEI) {
  const b = PRODUCT_MAP.basque.price, F = (v) => `NT$${Math.round(v).toLocaleString('en-US')}`;
  for (const m of AMEI_SCRIPT) { if (m.text) m.text = m.text.replace(/NT\$680(?!\d|,\d)/g, F(b)).replace(/NT\$1,510(?!\d|,\d)/g, F(b * 2 + 150)); if (m.fields && m.fields.total) m.fields.total = `NT$ ${Math.round(b * 2 + 150).toLocaleString('en-US')}`; }
}
const AMEI_CALL = {
  script: AMEI_SCRIPT, ai: '小美', name: '王小姐（回購客）', num: '0912-***-386・上次訂購：檸檬塔', customer: '王小姐',
  items: [{ pid: 'basque', qty: 2 }], region: '台中市', pickup: false,
  slots: [['item', '品項'], ['qty', '數量'], ['region', '寄送地'], ['date', '送達日'], ['total', '金額'], ['ok', '確認']],
  sum: '回購客王小姐為母親生日訂購芋泥巴斯克 2 個，寄台中、週六前送達；已複述確認。', tags: ['品項', '數量', '地點', '日期', '金額'],
};

// ---------- 其他業主：依業態大類產生通話劇本（商品、價格取自目前業主，AI 名用 TENANT.aiName） ----------
const nt = (v) => `NT$${Math.round(v).toLocaleString('en-US')}`;
const qword = measure;
function buildCall() {
  if (IS_AMEI) return AMEI_CALL;
  const ai = TENANT.aiName || 'AI 小幫手';
  const hello = { who: 'ai', text: `您好，這裡是${TENANT.name}，我是 AI 客服${ai}，請問需要什麼服務呢？`, intent: '問候' };
  const byPrice = [...PRODUCTS].sort((a, b) => a.price - b.price);
  const P = PRODUCTS[0], Q = byPrice[0] === P ? byPrice[1] : byPrice[0];
  const ship = (sub, pickup) => pickup ? 0 : sub >= FREE_SHIP ? 0 : SHIPPING_FEE;
  if (CAT === 'service') {
    const total = P.price + Q.price;
    return {
      ai, name: '林小姐（老客人）', num: `0928-***-517・上次預約：${P.name}`, customer: '林小姐', items: [{ pid: P.id, qty: 1 }, { pid: Q.id, qty: 1 }], region: '到店服務', pickup: true,
      slots: [['item', '服務項目'], ['qty', '人數'], ['region', '原預約'], ['date', '改約時段'], ['total', '金額'], ['ok', '確認']], tags: ['項目', '人數', '原預約', '新時段', '金額'],
      script: [hello,
        { who: 'c', text: `你好，我原本約這週六下午兩點的${P.name}，臨時有事想改期。`, fields: { item: P.name, region: '週六 14:00（將釋出）' }, intent: '預約改期' },
        { who: 'ai', text: '沒問題，已經查到您的預約。請問想改到哪一天、什麼時段呢？' },
        { who: 'c', text: `下週三晚上七點可以嗎？順便加一個${Q.name}。`, fields: { date: '下週三 19:00', qty: '1 位' } },
        { who: 'ai', text: `下週三 19:00 目前有空檔，已經先幫您保留。${P.name}加${Q.name}，合計 ${nt(total)}。` },
        { who: 'ai', text: `跟您確認一下：改到下週三 19:00，${P.name}加${Q.name}，一位，共 ${nt(total)}，對嗎？`, confirm: true, fields: { total: nt(total) } },
        { who: 'c', text: '對，沒錯。', fields: { ok: '客人已口頭確認' }, intent: '確認' },
        { who: 'ai', text: '好的，預約已經改好，原本週六的時段已釋出；前一天會傳簡訊提醒您，也可以用簡訊連結先預付。謝謝您的來電！', create: true },
      ],
      sum: `老客人林小姐將週六 14:00 的${P.name}改約至下週三 19:00，並加購${Q.name}；已複述確認，原時段已釋出。`,
    };
  }
  if (TAKEOUT) {
    const D = DRINK_TAKEOUT;
    const sub = P.price * 2 + Q.price;
    const qp = qword(P);
    return {
      ai, name: '陳先生（常客）', num: `0935-***-208・上次點餐：${P.name}`, customer: '陳先生', items: [{ pid: P.id, qty: 2 }, { pid: Q.id, qty: 1 }], region: '到店自取', pickup: true,
      slots: [['item', '品項'], ['qty', '數量'], ['region', '取餐方式'], ['date', '取餐時間'], ['total', '金額'], ['ok', '確認']], tags: ['品項', '數量', D ? '甜度冰塊' : '辣度', '取餐時間', '金額'],
      script: [hello,
        { who: 'c', text: `你好，我要外帶兩${qp}${P.name}、一份${Q.name}。`, fields: { item: `${P.name}、${Q.name}`, qty: `2＋1` }, intent: '外帶點餐' },
        { who: 'ai', text: `好的！${P.name}一${qp} ${nt(P.price)}，${Q.name} ${nt(Q.price)}。${D ? '請問甜度冰塊要怎麼調？需要提袋嗎？' : '請問辣度要怎麼調？湯汁醬料要分開裝嗎？'}` },
        { who: 'c', text: D ? '一杯半糖少冰、一杯微糖去冰，要提袋，我自己來拿。' : '一份小辣、一份不辣，湯汁分開裝，我自己來拿。', fields: { region: D ? '到店自取・附提袋' : '到店自取・湯汁分裝' } },
        { who: 'ai', text: D ? '了解，一杯半糖少冰、一杯微糖去冰。請問大約幾點來拿呢？' : '了解，一份小辣、一份不辣。請問大約幾點來拿呢？' },
        { who: 'c', text: '六點半左右。', fields: { date: '今天 18:30' } },
        { who: 'ai', text: `跟您確認一下：${P.name}兩${qp}（${D ? '一半糖少冰、一微糖去冰' : '一小辣、一不辣'}）、${Q.name}一份，${D ? '附提袋' : '湯汁分裝'}，今天 18:30 到店自取，共 ${nt(sub)}，對嗎？`, confirm: true, fields: { total: nt(sub) } },
        { who: 'c', text: '對，沒錯。', fields: { ok: '客人已口頭確認' }, intent: '確認' },
        { who: 'ai', text: '好的，訂單已經送進製作區，18:20 會備好；到店報手機末三碼就可以取餐。謝謝您的來電！', create: true },
      ],
      sum: `常客陳先生電話外帶${P.name} 2 ${qp}（${D ? '一半糖少冰、一微糖去冰' : '一小辣、一不辣'}）與${Q.name} 1 份，${D ? '附提袋' : '湯汁分裝'}，今天 18:30 到店自取；已複述確認。`,
    };
  }
  if (CAT === 'flower') {
    const sub = P.price;
    const fee = ship(sub, false);
    return {
      ai, name: '張先生（新客人）', num: '0910-***-743・第一次來電', customer: '張先生', items: [{ pid: P.id, qty: 1 }], region: '台北市信義區', pickup: false,
      slots: [['item', '品項'], ['qty', '卡片'], ['region', '送達地'], ['date', '配送時段'], ['total', '金額'], ['ok', '確認']], tags: ['品項', '卡片', '地點', '時段', '金額'],
      script: [hello,
        { who: 'c', text: `你好，我想訂一束${P.name}，明天送到我太太的公司，結婚週年要給她驚喜。`, fields: { item: `${P.name} ×1` }, intent: '下訂單・送禮' },
        { who: 'ai', text: `好浪漫！${P.name}一束 ${nt(P.price)}，當天早上花材現包，可以附手寫卡片。請問送到哪裡、希望什麼時段送達呢？` },
        { who: 'c', text: '台北市信義區，下午兩點到四點之間。卡片寫「結婚週年快樂，愛你」。', fields: { region: '台北市信義區', date: '明天 14:00–16:00', qty: '週年卡片（代寫）' } },
        { who: 'ai', text: '收到。鮮花會用保濕包裝送達，請收到後盡快放水。需要配送時打電話給您確認嗎？' },
        { who: 'c', text: '先不要打給我太太，打給我就好。' },
        { who: 'ai', text: `跟您確認一下：${P.name}一束，明天下午兩點到四點送到台北市信義區，附週年卡片，含配送費共 ${nt(sub + fee)}，對嗎？`, confirm: true, fields: { total: nt(sub + fee) } },
        { who: 'c', text: '對，沒錯。', fields: { ok: '客人已口頭確認' }, intent: '確認' },
        { who: 'ai', text: '好的，訂單已經建立，付款連結會用簡訊傳給您；送達後會拍照回報。祝兩位週年快樂！', create: true },
      ],
      sum: `新客人張先生訂購${P.name}一束，明天 14:00–16:00 送至台北市信義區作為結婚週年驚喜，附代寫卡片；配送聯絡只打給訂購人，已複述確認。`,
    };
  }
  // 宅配型（飲品、零售、手作、農產、烘焙點心等）
  const beans0 = CAT === 'drink' && HAS_BEANS;
  const qp = beans0 && qword(P) === '份' ? '包' : qword(P);
  const sub = P.price * 2;
  const fee = ship(sub, false);
  const craft = CAT === 'craft', beans = CAT === 'drink' && HAS_BEANS;
  const mid = craft
    ? [{ who: 'c', text: '兩個，可以刻英文縮寫嗎？寄到台中。', fields: { qty: `2 ${qp}・刻字`, region: '台中市' } },
      { who: 'ai', text: '可以，刻字免費，製作需要多 2 個工作天。請問兩個都刻一樣的字嗎？希望哪一天送達呢？' },
      { who: 'c', text: '一個刻 K.L.、一個刻 M.C.，下週五前到就好。', fields: { date: '下週五前' } }]
    : beans
      ? [{ who: 'c', text: '兩包，要磨好的粉，手沖用，寄到台中。', fields: { qty: `2 ${qp}・中細研磨`, region: '台中市' } },
        { who: 'ai', text: '好的，這批是前天剛烘的，烘焙日期會印在袋子上；手沖建議中細研磨，磨粉後風味會掉得比較快，建議兩週內喝完。請問希望哪一天送達呢？' },
        { who: 'c', text: '這個禮拜六之前就可以。', fields: { date: '本週六前' } }]
      : [{ who: 'c', text: '兩個好了，寄到台中。', fields: { qty: `2 ${qp}`, region: '台中市' } },
        { who: 'ai', text: '了解。請問希望哪一天送達呢？' },
        { who: 'c', text: '這個禮拜六之前就可以。', fields: { date: '本週六前' } }];
  const extraTxt = craft ? '，分別刻 K.L.、M.C.' : beans ? '，中細研磨' : '';
  const when = craft ? '下週五前' : '週六前';
  return {
    ai, name: '王太太（回購客）', num: `0912-***-386・上次訂購：${PRODUCTS[1] ? PRODUCTS[1].name : P.name}`, customer: '王太太', items: [{ pid: P.id, qty: 2 }], region: '台中市', pickup: false,
    slots: [['item', '品項'], ['qty', '數量'], ['region', '寄送地'], ['date', '送達日'], ['total', '金額'], ['ok', '確認']], tags: ['品項', '數量', '地點', '日期', '金額'],
    script: [hello,
      { who: 'c', text: `你好，我想訂${P.name}，要送給家人當生日禮物。`, fields: { item: `${P.name}（${P.unit}）` }, intent: '下訂單・送禮' },
      { who: 'ai', text: `好的！${P.name}一${qp} ${nt(P.price)}，宅配寄送。請問要訂幾${qp}呢？` },
      ...mid,
      { who: 'ai', text: `跟您確認一下：${P.name} 2 ${qp}${extraTxt}，寄到台中，${when}送達，${fee ? '含運費' : '已達免運'}共 ${nt(sub + fee)}，對嗎？`, confirm: true, fields: { total: nt(sub + fee) } },
      { who: 'c', text: '對，沒錯。', fields: { ok: '客人已口頭確認' }, intent: '確認' },
      { who: 'ai', text: '好的，訂單已經建立，付款連結會用簡訊傳給您。祝家人生日快樂，謝謝您的來電！', create: true },
    ],
    sum: `回購客王太太為家人生日訂購${P.name} 2 ${qp}${extraTxt}，寄台中、${when}送達；已複述確認。`,
  };
}
const CALL = buildCall();

let root, running = false, voiceOn = false, timerId = 0, t0 = 0;
const wave = { amp: 0.08, who: 'idle', raf: 0 };

export default {
  mount(section) {
    root = section;
    section.innerHTML = `
    <div class="phone-wrap">
      <div class="glass call-card anim-in" id="callCard">
        <div class="call-state" id="callState">待命中・24 小時自動接聽</div>
        <div class="caller">
          <div class="rings"><i></i><i></i><i></i></div>
          <div class="caller-av" id="callerAv">${icon('phone', 34)}</div>
        </div>
        <div class="caller-name" id="callerName">等待來電</div>
        <div class="caller-num" id="callerNum">AI 客服${esc(CALL.ai)}已上線</div>
        <div class="call-timer" id="callTimer">00:00</div>
        <canvas class="wave" id="wave" width="640" height="160"></canvas>
        <div class="speaking" id="speaking"><span class="sp-c">客人</span><span class="sp-ai">AI ${esc(CALL.ai)}</span></div>
        <div class="call-stats">
          <div><b>97%</b><small>語音辨識信心</small></div>
          <div><b>0.8 秒</b><small>平均回應延遲</small></div>
          <div><b>128 通</b><small>本月 AI 接聽</small></div>
          <div><b>0 通</b><small>需轉真人</small></div>
        </div>
        <div class="call-actions">
          <button class="btn btn-primary" id="callBtn">${icon('phone', 18)} 模擬來電</button>
          <button class="icon-btn lg" id="voiceBtn" title="AI 語音播放">${icon('mute', 20)}</button>
        </div>
        <small class="voice-hint" id="voiceHint">語音播放：關閉（點喇叭開啟，瀏覽器不支援時自動略過）</small>
      </div>
      <div class="glass transcript anim-in">
        <div class="card-h"><h3>${icon('file', 18)} 即時逐字稿</h3><span class="chip-sm" id="trState">尚未開始</span></div>
        <div class="tr-list" id="trList"><div class="empty-convo">${icon('phone', 40)}<p>點「模擬來電」，AI 會自動接聽、理解需求、複述確認並建立訂單</p></div></div>
      </div>
      <div class="glass understand anim-in">
        <div class="card-h"><h3>${icon('cpu', 18)} AI 即時理解</h3></div>
        <div class="intent-chips" id="intents"><span>語言：中文（台灣）</span><span>情緒：—</span><span>意圖：—</span></div>
        <div class="slots" id="slots">
          ${CALL.slots.map(([k, l]) => `<div class="slot" data-k="${k}"><span>${l}</span><b>—</b></div>`).join('')}
        </div>
        <div class="confirm-box" id="confirmBox"><div class="cb-h">${icon('shield', 16)} 關鍵條件複述確認</div><p>AI 會在建單前複述「${CALL.tags.join('、')}」，避免聽錯。</p></div>
        <div class="call-result" id="callResult" hidden></div>
      </div>
    </div>`;
    $('#callBtn', section).addEventListener('click', startCall);
    $('#voiceBtn', section).addEventListener('click', () => {
      voiceOn = !voiceOn && ('speechSynthesis' in window);
      $('#voiceBtn', root).innerHTML = icon(voiceOn ? 'volume' : 'mute', 20);
      $('#voiceBtn', root).classList.toggle('on', voiceOn);
      $('#voiceHint', root).textContent = voiceOn ? '語音播放：開啟（使用瀏覽器內建語音）' : ('speechSynthesis' in window ? '語音播放：關閉' : '此瀏覽器不支援語音合成，已自動略過');
      if (!voiceOn) stopSpeak();
    });
  },
  show() { startWave(); },
  hide() { cancelAnimationFrame(wave.raf); wave.raf = 0; },
};

function startWave() {
  if (wave.raf) return;
  const cv = $('#wave', root); const g = cv.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const fit = () => { const r = cv.getBoundingClientRect(); cv.width = Math.max(1, r.width * dpr); cv.height = Math.max(1, r.height * dpr); };
  fit(); new ResizeObserver(fit).observe(cv);
  let t = 0;
  const draw = () => {
    t += 0.016;
    const W = cv.width, H = cv.height; g.clearRect(0, 0, W, H);
    const color = wave.who === 'c' ? [240, 165, 49] : wave.who === 'ai' ? [45, 182, 116] : [94, 224, 196];
    for (let layer = 0; layer < 4; layer++) {
      g.beginPath();
      const a = wave.amp * (1 - layer * 0.2);
      for (let x = 0; x <= W; x += 3) {
        const nx = x / W;
        const env = Math.sin(nx * Math.PI) ** 2;
        const y = H / 2 + Math.sin(nx * (10 + layer * 3) + t * (4 + layer)) * Math.sin(nx * 3 + t * 1.3 + layer) * env * a * H * 0.9
          + (wave.who !== 'idle' ? Math.sin(nx * 47 + t * 12) * env * a * H * 0.12 : 0);
        x ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.strokeStyle = `rgba(${color.join(',')},${0.9 - layer * 0.2})`;
      g.lineWidth = (layer === 0 ? 3 : 1.5) * dpr;
      g.shadowColor = `rgba(${color.join(',')},0.8)`; g.shadowBlur = layer === 0 ? 16 * dpr : 0;
      g.stroke();
    }
    if (wave.who !== 'idle') wave.jitter = 0.35 + Math.random() * 0.25;
    wave.raf = requestAnimationFrame(draw);
  };
  draw();
}
function setSpeaker(who) {
  wave.who = who;
  gsap.to(wave, { amp: who === 'idle' ? 0.08 : who === 'ai' ? 0.42 : 0.36, duration: 0.4 });
  $('#speaking', root).dataset.who = who;
}

async function startCall() {
  if (running) return;
  running = true;
  const btn = $('#callBtn', root); btn.disabled = true; btn.innerHTML = `${icon('phone', 18)} 通話進行中`;
  $('#trList', root).innerHTML = '';
  $('#callResult', root).hidden = true;
  $$('.slot', root).forEach(s => { s.classList.remove('on'); $('b', s).textContent = '—'; });
  $('#confirmBox', root).classList.remove('active');
  $('#intents', root).innerHTML = '<span>語言：中文（台灣）</span><span>情緒：—</span><span>意圖：—</span>';
  const card = $('#callCard', root);
  card.classList.add('ringing');
  $('#callState', root).textContent = '來電中…';
  $('#callerName', root).textContent = CALL.name;
  $('#callerNum', root).textContent = CALL.num;
  $('#trState', root).textContent = '來電中';
  gsap.fromTo('#callerAv', { rotate: -12 }, { rotate: 12, duration: 0.08, repeat: 15, yoyo: true });
  await sleep(1600);
  card.classList.remove('ringing'); card.classList.add('incall');
  $('#callState', root).textContent = 'AI 已自動接聽';
  $('#trState', root).textContent = '通話中・即時轉寫';
  t0 = Date.now();
  timerId = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); $('#callTimer', root).textContent = `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; }, 500);

  for (const line of CALL.script) {
    setSpeaker(line.who);
    const row = el(`<div class="tr-line ${line.who}"><span class="tr-who">${line.who === 'ai' ? icon('bot', 14) + ` AI ${esc(CALL.ai)}` : icon('user', 14) + ' 客人'}</span><p></p></div>`);
    $('#trList', root).appendChild(row);
    gsap.fromTo(row, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.35 });
    const p = $('p', row);
    if (line.confirm) row.classList.add('confirm');
    const speech = line.who === 'ai' && voiceOn ? speak(line.text, 'zh-TW', { rate: 1.2 }) : null;
    // 逐字出現（模擬即時語音轉文字）
    const chunks = line.text.match(/.{1,2}/gu) || [line.text];
    const per = Math.max(60, Math.min(140, (line.text.length * 105) / chunks.length));
    for (const c of chunks) { p.textContent += c; await sleep(per); $('#trList', root).scrollTop = 1e6; }
    if (speech) await Promise.race([speech, sleep(Math.max(1200, line.text.length * 170))]);
    else await sleep(500);
    if (line.fields) for (const [k, v] of Object.entries(line.fields)) {
      const s = $(`.slot[data-k="${k}"]`, root); s.classList.add('on'); $('b', s).textContent = v;
      gsap.fromTo(s, { backgroundColor: 'rgba(240,165,49,.35)', scale: 1.04 }, { backgroundColor: 'rgba(255,255,255,0.03)', scale: 1, duration: 1 });
    }
    if (line.intent) $('#intents', root).innerHTML = `<span>語言：中文（台灣）</span><span>情緒：正面</span><span class="hl">意圖：${line.intent}</span>`;
    if (line.confirm) {
      const cb = $('#confirmBox', root); cb.classList.add('active');
      cb.innerHTML = `<div class="cb-h">${icon('shield', 16)} 關鍵條件複述確認</div><p class="cb-q">「${esc(line.text.replace('跟您確認一下：', ''))}」</p><div class="cb-tags">${CALL.tags.map(t => `<span>${t} ✓</span>`).join('')}</div>`;
      gsap.fromTo(cb, { scale: 0.95, boxShadow: '0 0 0 0 rgba(240,165,49,.8)' }, { scale: 1, boxShadow: '0 0 0 14px rgba(240,165,49,0)', duration: 1 });
    }
    if (line.create) {
      const order = store.createOrder({ channel: 'phone', customer: CALL.customer, lang: 'zh', items: CALL.items, payment: '簡訊付款連結', status: 'pending', region: CALL.region, pickup: CALL.pickup });
      const r = $('#callResult', root); r.hidden = false;
      r.innerHTML = `<div class="cr-h">${icon('check', 18)} 通話結束・訂單已自動建立</div>
        <div class="cr-grid"><span>訂單</span><b class="mono">${order.id}</b><span>發票</span><b class="mono">${order.invoice}</b><span>金額</span><b>${money(order.total)}</b><span>付款</span><b>簡訊付款連結已送出</b></div>
        <p class="cr-sum"><b>AI 通話摘要：</b>${esc(CALL.sum)}</p>`;
      gsap.fromTo(r, { opacity: 0, y: 20, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'back.out(1.8)' });
    }
    setSpeaker('idle');
    await sleep(420);
  }
  clearInterval(timerId);
  card.classList.remove('incall');
  $('#callState', root).textContent = '通話已結束・待命中';
  $('#trState', root).textContent = '已完成・已存檔';
  btn.disabled = false; btn.innerHTML = `${icon('phone', 18)} 再模擬一通`;
  running = false;
}
