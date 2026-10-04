// AI 電話客服模擬
import { store } from '../state.js';
import { $, $$, el, gsap, esc, money, sleep, speak, stopSpeak, pad } from '../util.js';
import { icon } from '../icons.js';

const SCRIPT = [
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
        <div class="caller-num" id="callerNum">AI 客服小美已上線</div>
        <div class="call-timer" id="callTimer">00:00</div>
        <canvas class="wave" id="wave" width="640" height="160"></canvas>
        <div class="speaking" id="speaking"><span class="sp-c">客人</span><span class="sp-ai">AI 小美</span></div>
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
          ${[['item', '品項'], ['qty', '數量'], ['region', '寄送地'], ['date', '送達日'], ['total', '金額'], ['ok', '確認']].map(([k, l]) => `<div class="slot" data-k="${k}"><span>${l}</span><b>—</b></div>`).join('')}
        </div>
        <div class="confirm-box" id="confirmBox"><div class="cb-h">${icon('shield', 16)} 關鍵條件複述確認</div><p>AI 會在建單前複述「品項、數量、地點、日期、金額」，避免聽錯。</p></div>
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
  $('#callerName', root).textContent = '王小姐（回購客）';
  $('#callerNum', root).textContent = '0912-***-386・上次訂購：檸檬塔';
  $('#trState', root).textContent = '來電中';
  gsap.fromTo('#callerAv', { rotate: -12 }, { rotate: 12, duration: 0.08, repeat: 15, yoyo: true });
  await sleep(1600);
  card.classList.remove('ringing'); card.classList.add('incall');
  $('#callState', root).textContent = 'AI 已自動接聽';
  $('#trState', root).textContent = '通話中・即時轉寫';
  t0 = Date.now();
  timerId = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); $('#callTimer', root).textContent = `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; }, 500);

  for (const line of SCRIPT) {
    setSpeaker(line.who);
    const row = el(`<div class="tr-line ${line.who}"><span class="tr-who">${line.who === 'ai' ? icon('bot', 14) + ' AI 小美' : icon('user', 14) + ' 客人'}</span><p></p></div>`);
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
      cb.innerHTML = `<div class="cb-h">${icon('shield', 16)} 關鍵條件複述確認</div><p class="cb-q">「${esc(line.text.replace('跟您確認一下：', ''))}」</p><div class="cb-tags"><span>品項 ✓</span><span>數量 ✓</span><span>地點 ✓</span><span>日期 ✓</span><span>金額 ✓</span></div>`;
      gsap.fromTo(cb, { scale: 0.95, boxShadow: '0 0 0 0 rgba(240,165,49,.8)' }, { scale: 1, boxShadow: '0 0 0 14px rgba(240,165,49,0)', duration: 1 });
    }
    if (line.create) {
      const order = store.createOrder({ channel: 'phone', customer: '王小姐', lang: 'zh', items: [{ pid: 'basque', qty: 2 }], payment: '簡訊付款連結', status: 'pending', region: '台中市' });
      const r = $('#callResult', root); r.hidden = false;
      r.innerHTML = `<div class="cr-h">${icon('check', 18)} 通話結束・訂單已自動建立</div>
        <div class="cr-grid"><span>訂單</span><b class="mono">${order.id}</b><span>發票</span><b class="mono">${order.invoice}</b><span>金額</span><b>${money(order.total)}</b><span>付款</span><b>簡訊付款連結已送出</b></div>
        <p class="cr-sum"><b>AI 通話摘要：</b>回購客王小姐為母親生日訂購芋泥巴斯克 2 個，寄台中、週六前送達；已複述確認。</p>`;
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
