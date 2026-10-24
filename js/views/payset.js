// 線上金流：選金流商（綠界 ECPay／藍新 NewebPay）、測試／正式環境、設定步驟、金流設定（示範／正式模式、n8n 網址、付款方式、連線測試）、線上付款入帳狀態
// 金鑰（商店代號、HashKey、HashIV）永遠只在主機的 n8n 憑證（greenup pay set），瀏覽器與這個畫面不會接觸。
import { store } from '../state.js';
import { $, $$, esc, money, fmtTime, toast } from '../util.js';
import { icon } from '../icons.js';
import { TENANT } from '../tenant.js';
import { onlinePayRows, PAY_ROW_STATUS } from '../bank-data.js';
import { getPayConfig, setPayConfig, onPayConfig, testConnection, errorText, METHODS, PAY_NOTE, fetchStatus, applyStatus, getPayRecords, onPayRecord, PROVIDER_NAME, methodLabel, normalizeBase } from '../payments.js';

let root;
const CH_NAME = { line: 'LINE', web: '官網', pos: '門市', phone: '電話', whatsapp: 'WhatsApp', zalo: 'Zalo', messenger: 'Messenger' };
// 金流商說明（文字標示，不使用金流商的品牌標誌）；實際可用的付款方式依各店與金流商的簽約內容
const PROVS = [
  { id: 'ecpay', name: '綠界 ECPay', site: 'https://www.ecpay.com.tw/', pts: ['信用卡（一次付清）', 'ATM 虛擬帳號', '超商代碼繳費'], note: '台灣中小商家常用；撥款與手續費依合約' },
  { id: 'newebpay', name: '藍新 NewebPay', site: 'https://www.newebpay.com/', pts: ['信用卡（一次付清）', 'ATM 虛擬帳號', '超商代碼繳費'], note: '可加開 LINE Pay 等行動支付（依合約）' },
];

export default {
  mount(section) {
    root = section;
    section.innerHTML = `
    <div class="pys">
      <div class="glass card pys-head anim-in">
        <div class="card-h"><h3>${icon('lock', 18)} 線上金流 <span class="chip-sm">綠界 ECPay・藍新 NewebPay</span></h3><span class="chip-sm" id="pysState"></span></div>
        <p class="pys-lead">客人在銷售網頁結帳時，會被帶到你選的金流商付款頁（信用卡、ATM、超商代碼），付款成功自動回到你的網站並入帳。三步完成：<b>選金流商</b> → <b>在主機填金鑰</b> → <b>連線測試後切正式模式</b>。</p>
        <div class="pys-provs" id="pysProvs" role="radiogroup" aria-label="選擇金流商"></div>
        <div class="pys-env" role="radiogroup" aria-label="環境"><span>環境</span><button class="seg" data-pyenv="test" type="button"><b>測試環境</b><small>金流商的測試商店，不會真的扣款</small></button><button class="seg" data-pyenv="prod" type="button"><b>正式環境</b><small>真的收款；請先在測試環境試過一筆</small></button></div>
      </div>
      <div class="glass card pys-steps anim-in" id="pysSteps"></div>
      <div class="bnk-pay">
        <div class="glass card bnk-pay-set anim-in" id="bnkPaySet"></div>
        <div class="glass card bnk-pay-list anim-in" id="bnkPayList"></div>
      </div>
      <p class="pys-foot">${icon('alert', 13)} 手續費、撥款週期與可用付款方式以你和金流商的合約為準；稅務與發票規定以主管機關公告為準。</p>
    </div>`;
    renderProv(); renderSteps(); renderPaySettings(); renderPayList();
    $$('[data-pyenv]', root).forEach(b => b.addEventListener('click', () => { setPayConfig({ env: b.dataset.pyenv }); }));
    const refresh = () => renderPayList();
    store.on('order', refresh); store.on('order-updated', refresh); store.on('reset', refresh);
    onPayConfig(() => { renderProv(); renderSteps(); renderPaySettings(); renderPayList(); schedulePoll(); });
    onPayRecord(() => renderPayList());
  },
  show() { schedulePoll(); },
  hide() { stopPoll(); },
};

// ---------- 選金流商與環境 ----------
function renderProv() {
  const c = getPayConfig(), box = $('#pysProvs', root); if (!box) return;
  box.innerHTML = PROVS.map(p => `<button class="pys-prov ${c.provider === p.id ? 'on' : ''}" data-pyprov="${p.id}" type="button" role="radio" aria-checked="${c.provider === p.id}">
    <span class="pys-radio"></span><b>${esc(p.name)}</b><ul>${p.pts.map(x => `<li>${esc(x)}</li>`).join('')}</ul><small>${esc(p.note)}</small></button>`).join('');
  $$('[data-pyprov]', box).forEach(b => b.addEventListener('click', () => { setPayConfig({ provider: b.dataset.pyprov }); toast('已選擇金流商', `${PROVIDER_NAME[b.dataset.pyprov]}：照下面的步驟在主機填入金鑰`, { icon: icon('lock', 18) }); }));
  $$('[data-pyenv]', root).forEach(b => b.classList.toggle('on', (c.env || 'test') === b.dataset.pyenv));
  const live = c.mode === 'live' && !!c.base, st = $('#pysState', root);
  if (st) { st.textContent = `${live ? '正式模式' : '示範模式'}${c.provider ? `・${PROVIDER_NAME[c.provider]}・${c.env === 'prod' ? '正式環境' : '測試環境'}` : '・尚未選擇金流商'}`; st.classList.toggle('warn', !live); }
}
function renderSteps() {
  const box = $('#pysSteps', root); if (!box) return;
  const c = getPayConfig(), p = PROVS.find(x => x.id === c.provider), env = c.env === 'prod' ? 'prod' : 'test';
  const base = c.base || payBaseHint(), live = c.mode === 'live' && !!c.base;
  const cmd = `greenup pay set --tenant ${TENANT.id} --provider ${p ? p.id : 'ecpay|newebpay'} --env ${env}`;
  const steps = [
    [!!p, '選擇金流商', p ? `已選「${p.name}」。還沒有帳號？到 <a href="${p.site}" target="_blank" rel="noopener">${esc(p.site.replace(/^https:\/\/|\/$/g, ''))}</a> 申請特店，取得商店代號、HashKey、HashIV。` : '先在上面點選綠界或藍新。'],
    [false, '在主機填入金鑰（只做一次）', `在安裝 GreenUP 的主機執行（互動輸入、不會顯示在螢幕上）：<code class="pys-cmd">${esc(cmd)}</code><button class="btn btn-ghost btn-xs" data-copy="${esc(cmd)}">${icon('file', 12)} 複製</button>`],
    [false, '到金流商後台填通知網址', `付款結果通知（需 HTTPS）：<code>${esc(base)}/pay/${p ? p.id : '（金流商）'}/notify</code>`],
    [!!c.base, '填 n8n 網址並連線測試', '在下面「金流設定」填網址、按「連線測試」；成功時會顯示主機目前設定的金流商。'],
    [live, '切到正式模式並儲存', `儲存後，銷售網頁結帳就會導到${p ? p.name : '金流商'}付款頁。建議先在${env === 'prod' ? '' : '測試環境'}用主機指令 <code>greenup pay test --tenant ${esc(TENANT.id)}</code> 試一筆 1 元付款。`],
  ];
  box.innerHTML = `<div class="card-h"><h3>${icon('check', 17)} 設定步驟</h3><small>${p ? esc(p.name) : '尚未選擇金流商'}・${env === 'prod' ? '正式環境' : '測試環境'}</small></div>
    <ol class="pys-ol">${steps.map(([ok, h, d], i) => `<li class="${ok ? 'ok' : ''}"><span class="pys-n">${ok ? icon('check', 13) : i + 1}</span><div><b>${esc(h)}</b><p>${d}</p></div></li>`).join('')}</ol>`;
  $$('[data-copy]', box).forEach(b => b.addEventListener('click', async () => { try { await navigator.clipboard.writeText(b.dataset.copy); toast('已複製指令', b.dataset.copy); } catch { toast('請手動複製', b.dataset.copy); } }));
}

// ---------- 金流設定（示範／正式模式、n8n 網址、付款方式、連線測試） ----------
// 正式模式需安裝包 n8n 金流設定；示範模式不連線。瀏覽器只呼叫 n8n webhook，金鑰只在 n8n 憑證。
const PAY = { testing: false, result: null, polling: null, timer: null, status: {}, lastAt: 0, busy: false };
const payBaseHint = () => `https://你的網域/t/${TENANT.id}/webhook`;

function renderPaySettings() {
  const box = $('#bnkPaySet', root); if (!box) return;
  const c = getPayConfig();
  const live = c.mode === 'live';
  box.innerHTML = `
    <div class="card-h"><h3>${icon('lock', 17)} 金流設定 <span class="chip-sm">綠界 ECPay・藍新 NewebPay</span></h3><span class="chip-sm ${live ? '' : 'warn'}" id="bnkPayMode">${live ? '正式模式' : '示範模式'}</span></div>
    <div class="bnk-pay-note">${icon('alert', 13)} ${esc(PAY_NOTE)}</div>
    <div class="bnk-pay-mode" role="radiogroup">
      <button class="seg ${live ? '' : 'on'}" data-paymode="demo" type="button"><b>示範模式</b><small>模擬付款，不連線金流；所有畫面標「示範」</small></button>
      <button class="seg ${live ? 'on' : ''}" data-paymode="live" type="button"><b>正式模式</b><small>結帳導到綠界／藍新付款頁，付款結果由 n8n 回報</small></button>
    </div>
    <label class="bnk-pay-f"><span>n8n webhook 網址（安裝包：Caddy 會把 /t/&lt;業主&gt;/webhook/* 轉到此業主的 n8n）</span>
      <input type="url" id="bnkPayBase" value="${esc(c.base)}" placeholder="${esc(payBaseHint())}" spellcheck="false" autocomplete="off"></label>
    <div class="bnk-pay-f"><span>客人可用的付款方式</span>
      <div class="bnk-pay-ms">${METHODS.map(m => `<label><input type="checkbox" data-paym="${m.id}" ${c.methods.includes(m.id) ? 'checked' : ''}>${esc(m.zh)}</label>`).join('')}</div></div>
    <div class="bnk-pay-act">
      <button class="btn btn-primary btn-sm" id="bnkPaySave">${icon('check', 14)} 儲存設定</button>
      <button class="btn btn-ghost btn-sm" id="bnkPayTest">${icon('refresh', 14)} 連線測試</button>
      <small class="chip-sm">pay/status?orderId=TEST → 期望 status: none</small>
    </div>
    <div class="bnk-pay-res" id="bnkPayRes" ${PAY.result ? '' : 'hidden'}></div>
    <div class="bnk-pay-keys">
      <b>商店代號與金鑰（HashKey／HashIV）請在 n8n 憑證填入</b>，瀏覽器與這個畫面永遠不會接觸金鑰。
      <ul>
        <li>安裝包指令：<code>greenup pay set --tenant ${esc(TENANT.id)} --provider ecpay|newebpay --env test|prod</code>（互動輸入、不回顯）</li>
        <li>金流商後台的通知網址：<code>${esc(c.base || payBaseHint())}/pay/ecpay/notify</code>、<code>${esc(c.base || payBaseHint())}/pay/newebpay/notify</code>（需 HTTPS）</li>
        <li>綠界／藍新與測試／正式環境由 n8n 端憑證決定；退款功能規劃中，請先至金流商後台操作。</li>
      </ul>
    </div>`;
  if (PAY.result) showPayResult(PAY.result);
  $$('[data-paymode]', box).forEach(b => b.addEventListener('click', () => {
    $$('[data-paymode]', box).forEach(x => x.classList.toggle('on', x === b));
    $('#bnkPayMode', box).textContent = b.dataset.paymode === 'live' ? '正式模式（未儲存）' : '示範模式（未儲存）';
  }));
  $('#bnkPaySave', box).addEventListener('click', () => {
    const mode = $('[data-paymode].on', box)?.dataset.paymode || 'demo';
    const base = normalizeBase($('#bnkPayBase', box).value);
    const methods = $$('[data-paym]:checked', box).map(x => x.dataset.paym);
    if (mode === 'live' && !base) { showPayResult({ ok: false, text: '正式模式需要 n8n webhook 網址；請先填入或改用示範模式。' }); return; }
    if (mode === 'live' && !/^https?:\/\//i.test(base)) { showPayResult({ ok: false, text: 'n8n 網址要以 http:// 或 https:// 開頭。' }); return; }
    if (!methods.length) { showPayResult({ ok: false, text: '至少勾選一種付款方式。' }); return; }
    setPayConfig({ mode, base, methods });
    PAY.result = { ok: true, text: `已儲存：${mode === 'live' ? '正式模式' : '示範模式'}・${methods.map(m => methodLabel(m, 'zh')).join('／')}${mode === 'live' ? `・${base}` : ''}` };
    renderPaySettings(); renderPayList();
    toast('金流設定已儲存', mode === 'live' ? '銷售網頁與競標付款將導到綠界／藍新（需 n8n 金流設定）' : '示範模式：模擬付款，不連線', { icon: icon('lock', 18) });
  });
  $('#bnkPayTest', box).addEventListener('click', async (e) => {
    const b = e.currentTarget; if (PAY.testing) return;
    const base = normalizeBase($('#bnkPayBase', box).value);
    PAY.testing = true; b.disabled = true; b.innerHTML = '<span class="bnk-spin sm"></span> 測試中…';
    showPayResult({ ok: null, text: `正在呼叫 ${base || '（未填網址）'}/pay/status?orderId=TEST …` });
    try {
      const r = await testConnection(base);
      const sp = r.data && r.data.provider, se = r.data && r.data.env, want = getPayConfig().provider;
      const srv = sp ? `主機目前設定：${PROVIDER_NAME[sp] || sp}（${se === 'prod' ? '正式環境' : '測試環境'}）。` : '主機尚未回報金流商（可能還沒執行 greenup pay set）。';
      const diff = sp && want && sp !== want ? `⚠ 和這裡選的「${PROVIDER_NAME[want]}」不同，請在主機重新執行設定指令。` : '';
      PAY.result = { ok: !diff, text: `連線成功（${r.ms} ms）：n8n 回 status: none，金流 workflow 已就緒。${srv}${diff}` };
    } catch (err) {
      PAY.result = { ok: false, text: `連線失敗：${errorText(err)}` };
    }
    PAY.testing = false;
    if ($('#bnkPayTest', root)) { const nb = $('#bnkPayTest', root); nb.disabled = false; nb.innerHTML = `${icon('refresh', 14)} 連線測試`; }
    showPayResult(PAY.result);
  });
}
function showPayResult(r) {
  const el2 = $('#bnkPayRes', root); if (!el2) return;
  el2.hidden = false; el2.className = `bnk-pay-res ${r.ok === true ? 'ok' : r.ok === false ? 'bad' : ''}`;
  el2.textContent = r.text;
}

// ---------- 線上付款狀態（待付款的即時訂單輪詢 pay/status，paid 自動入帳） ----------
const PAY_POLL_MS = 5000;
function renderPayList() {
  const box = $('#bnkPayList', root); if (!box) return;
  const c = getPayConfig(); const live = c.mode === 'live' && !!c.base;
  const rows = onlinePayRows(store, getPayRecords());
  const pending = rows.filter(r => r.status === 'pending');
  const stOf = (r) => {
    if (r.status === 'paid') return 'paid';
    if (!live) return 'demo';
    const ps = PAY.status[r.id]; if (!ps) return 'idle';
    return ps.error ? 'error' : (ps.status || 'idle');
  };
  box.innerHTML = `
    <div class="card-h"><h3>${icon('coins', 17)} 線上付款狀態</h3><span class="chip-sm ${pending.length ? 'warn' : ''}" id="bnkPayCnt">${pending.length} 筆待付款</span></div>
    <div class="bnk-pay-rows" id="bnkPayRows">${rows.length ? rows.map(r => {
      const st = stOf(r); const ps = PAY.status[r.id] || {}; const rec = r.rec || {};
      const prov = (ps.data && ps.data.provider) || rec.provider; const mth = (ps.data && ps.data.method) || rec.method;
      const tip = st === 'error' ? errorText(ps.error) : '';
      return `<div class="bnk-pay-row" data-id="${esc(r.id)}">
        <b class="id">${esc(r.id)}</b><span class="amt">${money(r.total)}</span><span class="bnk-pay-st ${st}" title="${esc(tip)}"><i></i>${esc(PAY_ROW_STATUS[st] || st)}</span>
        <span class="m">${esc(CH_NAME[r.channel] || r.channel)}・${esc(r.customer)}・${esc(mth ? methodLabel(mth, 'zh') : r.payment)}${prov ? `・${esc(PROVIDER_NAME[prov] || prov)}` : ''}${rec.tradeNo ? `・序號 ${esc(rec.tradeNo)}` : ''}${st === 'error' ? `・${esc(tip)}` : ''}${ps.at ? `・查詢 ${fmtTime(ps.at)}` : ''}</span>
      </div>`; }).join('') : `<div class="bnk-pay-empty">目前沒有待付款的即時訂單。客人在銷售網頁選「ATM／超商」付款後，這裡會顯示入帳進度。</div>`}</div>
    <div class="bnk-pay-foot">
      <span>${live ? `正式模式：每 ${PAY_POLL_MS / 1000} 秒輪詢 n8n pay/status，付款成功自動入帳（markPaid）${PAY.lastAt ? `・上次 ${fmtTime(PAY.lastAt)}` : ''}` : esc(PAY_NOTE)}</span>
      <button class="btn btn-ghost btn-sm" id="bnkPayNow" ${live && pending.length ? '' : 'disabled'}>${icon('refresh', 13)} 立即查詢</button>
    </div>`;
  $('#bnkPayNow', box).addEventListener('click', () => pollOnce(true));
}
function schedulePoll() {
  stopPoll();
  const c = getPayConfig();
  if (!(c.mode === 'live' && c.base) || !root || root.hidden) return;
  PAY.timer = setInterval(() => pollOnce(false), PAY_POLL_MS);
  pollOnce(false);
}
function stopPoll() { if (PAY.timer) { clearInterval(PAY.timer); PAY.timer = null; } }
async function pollOnce(manual) {
  if (PAY.busy) { PAY.again = PAY.again || manual; return; } // 查詢中再按「立即查詢」：這輪結束後立刻再查一次
  PAY.busy = true;
  try {
    const c = getPayConfig(); if (!(c.mode === 'live' && c.base)) return;
    const pending = store.live.filter(o => o.status === 'pending').sort((a, b) => b.ts - a.ts).slice(0, 10);
    for (const o of pending) {
      try {
        const d = await fetchStatus(o.id, { base: c.base, timeout: 6000 }); // 背景輪詢：逾時短一點，畫面才不會一直「等待查詢」
        PAY.status[o.id] = { status: d.status, data: d, at: Date.now(), error: null };
        if (d.status === 'paid') { applyStatus(o.id, d); toast(`線上付款入帳｜${o.customer}`, `${o.id}・${money(o.total)}・${PROVIDER_NAME[d.provider] || d.provider || ''}`, { icon: icon('coins', 18) }); }
        else applyStatus(o.id, d);
      } catch (err) {
        PAY.status[o.id] = { status: 'error', data: null, at: Date.now(), error: err };
        if (manual) toast('查詢付款狀態失敗', errorText(err), { kind: 'warn', icon: icon('alert', 18) });
        if (err && (err.kind === 'network' || err.kind === 'timeout')) {
          // n8n 連不上：這輪不用再逐筆試，其餘待付款訂單一律標成同樣的查詢失敗（下一輪再試）
          for (const p of pending) if (!PAY.status[p.id] || PAY.status[p.id].at < Date.now() - PAY_POLL_MS) PAY.status[p.id] = { status: 'error', data: null, at: Date.now(), error: err };
          break;
        }
      }
    }
    PAY.lastAt = Date.now();
  } finally { PAY.busy = false; renderPayList(); if (PAY.again) { PAY.again = false; setTimeout(() => pollOnce(true), 50); } }
}
window.__bankPay = { pollOnce, status: PAY };

