// 老闆的錢：這個月可以安心領多少、稅金預留帳戶、領錢方式比較、現金跑道、公私分明、存錢目標
import { store } from '../state.js';
import { $, $$, el, gsap, esc, money, countUp, typeText, toast, fmtMD, fmtTime, sleep } from '../util.js';
import { icon } from '../icons.js';
import { makeChart } from '../charts.js';
import { CHANNEL_MAP } from '../data.js';
import {
  snapshot, reserveAccount, profitPool, payScenario, runwayProject, ADVANCES, FLAGS, GOALS,
} from '../owner-data.js';

let root, snap, res, payChart, runChart, typed = false, shown = false;
const S = {
  safetyMonths: 3, repaid: new Set(), privateIds: new Set(), cleared: new Set(), extraGoal: 0,
  bonusNow: false, rate: 0.12, payTotal: 1200000, payShare: 0.6, rev: 0, seasonal: true, drawn: false, open: new Set(['tax']),
  pick: new Set(ADVANCES.map(a => a.id)),
};
const n0 = (v) => Math.round(v).toLocaleString('en-US');
const wan = (v) => {
  const a = Math.abs(v), s = v < 0 ? '−' : '';
  return a >= 10000 ? `${s}${(a / 10000).toFixed(a >= 1e6 ? 0 : 1)} 萬` : `${s}${n0(a)}`;
};
const pctTxt = (a, b) => b ? Math.round(a / b * 100) + '%' : '0%';
const CHEV = '<svg class="ic ow-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
const daysTo = (d) => Math.max(0, Math.ceil((d - new Date()) / 864e5));
const dstr = (d) => `${d.getFullYear() !== new Date().getFullYear() ? d.getFullYear() + '/' : ''}${d.getMonth() + 1}/${d.getDate()}`;

export default {
  mount(section) {
    root = section;
    section.innerHTML = `
    <div class="ow">
      <div class="glass ow-hero anim-in" id="owTop">
        <div class="ow-hero-l">
          <div class="ow-badges">
            <span class="demo-badge">${icon('alert', 14)} 示範資料・試算</span>
            <span class="chip-sm" id="owAsOf"></span>
            <span class="chip-sm">${icon('link', 12)} 與會計帳務、報稅頁同一套帳</span>
          </div>
          <h2 class="ow-q">公司的錢，我這個月可以拿多少？</h2>
          <div class="ow-big">
            <small>這個月可以安心領</small>
            <b id="owAvail">NT$ 0</b>
            <span class="ow-big-note" id="owAvailNote"></span>
          </div>
          <p class="ow-ai"><span class="ow-ai-ic">${icon('sparkle', 14)}</span><span id="owAi"></span></p>
          <div class="ow-hchips" id="owHChips"></div>
          <div class="ow-hact">
            <div class="ow-seg-wrap"><small>安全金預留</small><div class="ow-segs" id="owSafeSeg">${[2, 3, 6].map(n => `<button class="seg ${n === 3 ? 'on' : ''}" data-n="${n}">${n} 個月</button>`).join('')}</div></div>
            <button class="btn btn-primary" id="owDraw">${icon('coins', 16)} 安排轉帳給自己</button>
          </div>
        </div>
        <div class="ow-tank-wrap">
          <div class="ow-tank" id="owTank">
            <div class="ow-tank-cap"><span>帳上現金</span><b id="owTankCash"></b></div>
            <div class="ow-tank-body" id="owTankBody"></div>
          </div>
          <div class="ow-tank-leg" id="owTankLeg"></div>
        </div>
      </div>

      <nav class="ow-jump anim-in">${[['owCalc', 'coins', '可領多少'], ['owRes', 'shield', '稅金預留'], ['owPay', 'percent', '怎麼領比較好'], ['owRun', 'trend', '現金跑道'], ['owSep', 'user', '公私分明'], ['owGoal', 'leaf', '存錢目標']].map(([id, ic, t]) => `<button data-to="${id}">${icon(ic, 14)}${t}</button>`).join('')}</nav>

      <div class="ow-row ow-row-a">
        <div class="glass card ow-calc anim-in" id="owCalc">
          <div class="card-h"><h3>${icon('coins', 18)} 計算過程：從帳上現金一路扣到可分配金額</h3><span class="chip-sm">點每一層看明細</span></div>
          <div class="ow-wf" id="owWf"></div>
        </div>
        <div class="glass card ow-res anim-in" id="owRes">
          <div class="card-h"><h3>${icon('shield', 18)} 稅金預留帳戶</h3><span class="chip-sm">${icon('wand', 12)} GreenUP 自動撥款・示範</span></div>
          <div class="ow-res-top">
            <div class="ow-res-bal"><small>目前累積</small><b id="owResBal">NT$ 0</b><span id="owResSince"></span></div>
            <div class="ow-res-rate">
              <div class="ow-rl"><small>每筆收款自動撥</small><b id="owRateTxt">12%</b></div>
              <input type="range" class="ow-range" id="owRate" min="5" max="20" step="1" value="12" aria-label="自動撥款比例">
              <div class="ow-split"><i id="owSplitOp"></i><i id="owSplitTx"></i></div>
              <div class="ow-split-l"><span>營運帳戶 <b id="owSplitOpT"></b></span><span>稅金預留 <b id="owSplitTxT"></b></span></div>
            </div>
          </div>
          <div class="ow-res-stats" id="owResStats"></div>
          <div class="ow-sub-h">${icon('calendar', 14)} 下一個繳稅日</div>
          <div class="ow-dues" id="owDues"></div>
          <div class="ow-sub-h">${icon('refresh', 14)} 最近自動撥款<small>新訂單收款時即時撥入</small></div>
          <ul class="ow-feed" id="owFeed"></ul>
        </div>
      </div>

      <div class="glass card ow-pay anim-in" id="owPay">
        <div class="card-h ow-pay-h">
          <h3>${icon('percent', 18)} 領錢方式比較：董事酬勞 vs 盈餘分配</h3>
          <span class="ow-warn">${icon('alert', 14)} 簡化示意試算，僅供參考，請與會計師確認</span>
        </div>
        <div class="ow-pay-grid">
          <div class="ow-pay-ctl">
            <div class="ow-ways">
              <div class="ow-way" style="--c:var(--sky)"><b>${icon('users', 14)} 董事酬勞</b><span>每月固定發，公司可列費用；個人併入綜合所得（薪資所得）。</span></div>
              <div class="ow-way" style="--c:var(--violet)"><b>${icon('coins', 14)} 盈餘分配</b><span>年度結算後發放，公司先繳營所稅；個人為股利所得，單次超過 2 萬扣 2.11% 補充保費。</span></div>
            </div>
            <label class="ow-sl"><span>今年想從公司拿（稅前）<b id="owPayTotalT"></b></span>
              <input type="range" class="ow-range" id="owPayTotal" min="600000" max="2400000" step="60000" value="1200000"></label>
            <label class="ow-sl"><span>其中董事酬勞比例 <b id="owPayShareT"></b></span>
              <input type="range" class="ow-range violet" id="owPayShare" min="0" max="100" step="5" value="60">
              <em class="ow-sl-ends"><i>全部盈餘分配</i><i>全部董事酬勞</i></em></label>
            <ul class="ow-assume">
              <li>公司董事酬勞前年度盈餘（預估）<b id="owPool"></b></li>
              <li>營所稅 20%（課稅所得 12 萬以下免稅，簡化）</li>
              <li>綜所稅以 114 年度級距、免稅額、標準與薪資特別扣除額近似；假設單身、無其他所得</li>
              <li>未計未分配盈餘加徵 5%、老闆自身健保、各項列舉扣除</li>
            </ul>
          </div>
          <div class="ow-pay-r">
          <div class="ow-scen" id="owScen"></div>
          <div class="ow-pay-chart">
            <div class="ow-chart-t">總稅負組成 vs 董事酬勞比例<small>同樣拿 <b id="owPayTotalT2"></b> 時</small></div>
            <div class="chart" id="owPayChart"></div>
          </div>
          </div>
        </div>
        <p class="ow-foot">${icon('alert', 13)} 董事酬勞需依公司章程或股東同意，金額應與職務相當，否則可能遭國稅局剔除；盈餘分配需先彌補虧損、提列法定盈餘公積。以上為簡化示意，不構成稅務建議，實際請與會計師確認。</p>
      </div>

      <div class="glass card ow-run anim-in" id="owRun">
        <div class="card-h"><h3>${icon('trend', 18)} 現金跑道：還能撐幾個月？</h3><span class="chip-sm">近 3 個月平均推算・12 個月預測</span></div>
        <div class="ow-run-grid">
          <div class="ow-run-l">
            <div class="ow-run-big"><small>就算明天起一張單都沒有，也能撐</small><b id="owZero">0</b><span id="owZeroSub"></span></div>
            <div class="ow-run-kv" id="owRunKv"></div>
            <div class="ow-sub-h">${icon('wand', 14)} 情境模擬</div>
            <div class="ow-presets" id="owPresets">${[[-0.3, '營收 −30%'], [0, '基準'], [0.2, '旺季 +20%']].map(([v, t]) => `<button class="seg ${v === 0 ? 'on' : ''}" data-v="${v}">${t}</button>`).join('')}</div>
            <label class="ow-sl"><span>營收變動 <b id="owRevT">0%</b></span>
              <input type="range" class="ow-range amber" id="owRev" min="-60" max="40" step="5" value="0"></label>
            <div class="ow-toggles">
              <label class="ow-tg"><input type="checkbox" id="owSeason" checked><i></i>套用季節性（聖誕、年節旺、暑假淡）</label>
              <label class="ow-tg"><input type="checkbox" id="owIncDraw"><i></i>扣掉本月「安心領」金額</label>
            </div>
          </div>
          <div class="ow-run-r">
            <div class="ow-run-verdict" id="owVerdict"></div>
            <div class="chart" id="owRunChart"></div>
          </div>
        </div>
      </div>

      <div class="ow-row ow-row-b">
        <div class="glass card ow-sep anim-in" id="owSep">
          <div class="card-h"><h3>${icon('user', 18)} 公私分明檢查</h3><span class="chip-sm">${icon('sparkle', 12)} AI 每天掃描公司帳戶與發票</span></div>
          <div class="ow-sep-top">
            <div class="ow-score"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" class="bg"/><circle cx="60" cy="60" r="50" class="fg" id="owScoreRing"/></svg><div><b id="owScore">0</b><small>公私分明指數</small></div></div>
            <p class="ow-sep-txt" id="owSepTxt"></p>
          </div>
          <div class="ow-sub-h">${icon('alert', 14)} 可能是私人支出<small>公司卡／公司帳戶付款</small></div>
          <ul class="ow-flags" id="owFlags"></ul>
          <div class="ow-sub-h">${icon('hang', 14)} 老闆代墊款（應付股東／業主往來）<small>你用個人錢幫公司付的</small></div>
          <ul class="ow-adv" id="owAdv"></ul>
          <div class="ow-adv-act">
            <button class="btn btn-primary" id="owRepay">${icon('refresh', 16)} 一鍵建立「老闆代墊」還款</button>
            <small>AI 產生傳票與轉帳草稿，你確認後才會執行（示範不會真的轉帳）</small>
          </div>
          <div class="ow-jv" id="owJv" hidden></div>
        </div>
        <div class="glass card ow-goal anim-in" id="owGoal">
          <div class="card-h"><h3>${icon('leaf', 18)} 存錢目標</h3><span class="chip-sm">專款專用・自動提撥</span></div>
          <div class="ow-goals" id="owGoals"></div>
        </div>
      </div>
    </div>`;

    // 事件
    $$('#owSafeSeg .seg', root).forEach(b => b.addEventListener('click', () => {
      S.safetyMonths = +b.dataset.n;
      $$('#owSafeSeg .seg', root).forEach(x => x.classList.toggle('on', x === b));
      refresh(true);
      toast(`安全金改為 ${S.safetyMonths} 個月固定支出`, `可安心領金額已重新試算：${money(snap.availPos)}`, { kind: 'info', icon: icon('shield', 18) });
    }));
    $('#owDraw', root).addEventListener('click', onDraw);
    $$('.ow-jump button', root).forEach(b => b.addEventListener('click', () => {
      const t = $('#' + b.dataset.to, root);
      t && t.scrollIntoView({ behavior: 'smooth', block: 'start' });
      gsap.fromTo(t, { boxShadow: '0 0 0 2px rgba(94,224,196,0.7)' }, { boxShadow: '0 0 0 0px rgba(94,224,196,0)', duration: 1.4, delay: 0.4, clearProps: 'boxShadow' });
    }));
    $('#owWf', root).addEventListener('click', (e) => {
      const row = e.target.closest('.ow-wf-row[data-id]');
      if (!row) return;
      const id = row.dataset.id;
      S.open.has(id) ? S.open.delete(id) : S.open.add(id);
      row.classList.toggle('open', S.open.has(id));
      const det = row.nextElementSibling;
      if (det && det.classList.contains('ow-wf-det')) {
        if (S.open.has(id)) { det.hidden = false; gsap.fromTo(det, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: 0.35, ease: 'power2.out' }); }
        else gsap.to(det, { height: 0, opacity: 0, duration: 0.25, onComplete: () => { det.hidden = true; det.style.height = ''; } });
      }
    });
    $('#owRate', root).addEventListener('input', (e) => { S.rate = +e.target.value / 100; renderReserve(false); });
    $('#owPayTotal', root).addEventListener('input', (e) => { S.payTotal = +e.target.value; renderPay(); });
    $('#owPayShare', root).addEventListener('input', (e) => { S.payShare = +e.target.value / 100; renderPay(); });
    $$('#owPresets .seg', root).forEach(b => b.addEventListener('click', () => {
      S.rev = +b.dataset.v; $('#owRev', root).value = Math.round(S.rev * 100);
      renderRun();
    }));
    $('#owRev', root).addEventListener('input', (e) => { S.rev = +e.target.value / 100; renderRun(); });
    $('#owSeason', root).addEventListener('change', (e) => { S.seasonal = e.target.checked; renderRun(); });
    $('#owIncDraw', root).addEventListener('change', (e) => { S.drawn = e.target.checked; renderRun(); });
    $('#owFlags', root).addEventListener('click', onFlag);
    $('#owAdv', root).addEventListener('change', (e) => {
      const cb = e.target.closest('input[data-id]'); if (!cb) return;
      cb.checked ? S.pick.add(cb.dataset.id) : S.pick.delete(cb.dataset.id);
      renderSep();
    });
    $('#owRepay', root).addEventListener('click', onRepay);
    $('#owGoals', root).addEventListener('click', onGoal);

    const live = () => { if (shown && !root.hidden) refresh(false, true); };
    store.on('order', ({ order }) => { live(); if (order.status === 'paid') flashSweep(order); });
    store.on('order-updated', ({ order }) => { live(); if (order.status === 'paid') flashSweep(order); });
    store.on('reset', live);
  },
  show() {
    shown = true;
    if (!payChart) payChart = makeChart($('#owPayChart', root));
    if (!runChart) runChart = makeChart($('#owRunChart', root));
    refresh(true);
  },
  hide() { shown = false; },
};

// ---------- 整體 ----------
function refresh(anim, liveOnly = false) {
  snap = snapshot({ safetyMonths: S.safetyMonths, repaid: S.repaid, privateIds: S.privateIds, extraGoal: S.extraGoal, bonusNow: S.bonusNow });
  renderHero(anim);
  renderCalc(anim);
  renderReserve(anim);
  if (!liveOnly) renderPay();
  renderRun();
  renderSep();
  renderGoals(anim);
}

// ---------- 主視覺 ----------
function renderHero(anim) {
  const now = snap.now;
  $('#owAsOf', root).textContent = `截至 ${now.getMonth() + 1}/${now.getDate()} ${fmtTime(now)}`;
  const big = $('#owAvail', root);
  countUp(big, snap.availPos, { prefix: 'NT$ ', duration: anim ? 1.6 : 0.8 });
  big.classList.toggle('zero', snap.avail <= 0);
  $('#owAvailNote', root).innerHTML = snap.avail > 0
    ? `${icon('check', 14)} 另有固定董事酬勞 ${money(profitPool().ownerPay)} 已照常列入薪資`
    : `${icon('alert', 14)} 扣完預留後不足 ${money(-snap.avail)}，這個月建議先不要額外領`;
  const [tax, safe, ap, com] = snap.layers;
  const aiTxt = `帳上有 ${wan(snap.cash)}，但其中 ${wan(tax.amt)} 是遲早要繳的稅、${wan(safe.amt)} 要留給未來 ${S.safetyMonths} 個月的房租和薪水、${wan(ap.amt + com.amt)} 已經答應要付出去。扣完之後，這個月真正可以安心領的是 ${wan(snap.availPos)}。`;
  const ai = $('#owAi', root);
  if (!typed && anim) { typed = true; typeText(ai, aiTxt, 18); } else if (typed) ai.textContent = aiTxt;
  const rw = runwayProject({ rev: 0, draw: 0, seasonal: true }, snap);
  res = reserveAccount(S.rate, snap);
  const nd = res.dues[0];
  $('#owHChips', root).innerHTML = [
    ['bank', '帳上現金', money(snap.cash), 'var(--mint)'],
    ['tax', '稅金要留', money(tax.amt), 'var(--amber)'],
    ['clock', '零收入可撐', `${rw.zeroMonths.toFixed(1)} 個月`, 'var(--sky)'],
    ['calendar', '下次繳稅', `${dstr(nd.d)}・${daysTo(nd.d)} 天後`, 'var(--coral)'],
  ].map(([ic, k, v, c]) => `<div class="ow-hc" style="--c:${c}"><span>${icon(ic, 14)}${k}</span><b>${v}</b></div>`).join('');

  // 水位圖
  $('#owTankCash', root).textContent = money(snap.cash);
  const parts = [...snap.layers, { id: 'avail', name: '可安心領', amt: snap.availPos, color: '#2DB674' }];
  const scale = Math.max(snap.cash, parts.reduce((s, p) => s + p.amt, 0));
  const body = $('#owTankBody', root);
  body.innerHTML = parts.map(p => {
    const h = p.amt / scale * 100;
    return `<div class="ow-lay ow-lay-${p.id}" style="--c:${p.color};--h:${h.toFixed(2)}%">${p.id === 'avail' ? '<svg class="ow-wave" viewBox="0 0 200 12" preserveAspectRatio="none"><path d="M0 6 Q 25 0 50 6 T 100 6 T 150 6 T 200 6 V12 H0z"/></svg>' : ''}${h > 9 ? `<span>${esc(p.id === 'safe' ? '安全金' : p.name)}<b>${wan(p.amt)}</b></span>` : ''}</div>`;
  }).join('');
  if (snap.avail < 0) body.insertAdjacentHTML('beforeend', `<div class="ow-over" style="--h:${((-snap.avail) / scale * 100).toFixed(2)}%"></div>`);
  $('#owTankLeg', root).innerHTML = parts.map(p => `<div><i style="background:${p.color}"></i><span>${p.id === 'safe' ? '安全金' : p.name}</span><b>${pctTxt(p.amt, snap.cash)}</b></div>`).join('');
  if (anim) gsap.fromTo($$('.ow-lay', body), { scaleY: 0 }, { scaleY: 1, duration: 0.7, stagger: 0.12, ease: 'power3.out', transformOrigin: 'bottom', delay: 0.15 });
}

// ---------- 計算過程（分層長條） ----------
function renderCalc(anim) {
  const cash = snap.cash;
  let off = 0;
  const bar = (left, w, color) => `<div class="ow-wf-bar"><i style="left:${(left / cash * 100).toFixed(2)}%;width:${Math.max(0.6, w / cash * 100).toFixed(2)}%;--c:${color}"></i></div>`;
  let html = `<div class="ow-wf-row start"><span class="ow-wf-op">${icon('bank', 15)}</span><div class="ow-wf-name"><b>銀行存款（帳上現金）</b><small>玉山銀行營運帳戶＋稅金預留子帳戶，與資產負債表「現金及約當現金」一致</small></div><b class="ow-wf-amt">${money(cash)}</b>${bar(0, cash, '#5EE0C4')}</div>`;
  for (const L of snap.layers) {
    const open = S.open.has(L.id);
    html += `<div class="ow-wf-row ${open ? 'open' : ''}" data-id="${L.id}" style="--c:${L.color}" role="button" tabindex="0">
      <span class="ow-wf-op">−</span>
      <div class="ow-wf-name"><b>${icon(L.icon, 14)} ${esc(L.name)}</b><small>${esc(L.sub)}</small></div>
      <b class="ow-wf-amt">${money(L.amt)}${CHEV}</b>
      ${bar(Math.min(off, cash), Math.min(L.amt, Math.max(0, cash - off)), L.color)}
    </div>
    <div class="ow-wf-det" ${open ? '' : 'hidden'}><ul>${L.items.map(it => `<li><span><b>${esc(it.name)}</b><small>${esc(it.note)}</small></span><em>${money(it.amt)}</em></li>`).join('')}</ul></div>`;
    off += L.amt;
  }
  const a = snap.avail;
  html += `<div class="ow-wf-row end ${a <= 0 ? 'neg' : ''}"><span class="ow-wf-op">＝</span><div class="ow-wf-name"><b>可分配金額（這個月可以安心領）</b><small>${a > 0 ? `占帳上現金 ${pctTxt(a, cash)}；超過這個數字，就是在挪用稅金或安全金` : '預留後已不足，建議延後領取或先補足安全金'}</small></div><b class="ow-wf-amt">${a < 0 ? '−' : ''}${money(Math.abs(a))}</b>${bar(Math.max(0, cash - Math.max(0, a)), Math.max(0, a), '#2DB674')}</div>`;
  $('#owWf', root).innerHTML = html;
  if (anim) gsap.fromTo($$('.ow-wf-bar i', root), { scaleX: 0 }, { scaleX: 1, transformOrigin: 'left', duration: 0.8, stagger: 0.1, ease: 'power3.out', delay: 0.2 });
}

// ---------- 稅金預留帳戶 ----------
function renderReserve(anim) {
  res = reserveAccount(S.rate, snap);
  const pct = Math.round(S.rate * 100);
  $('#owRateTxt', root).textContent = `${pct}%`;
  $('#owSplitOp', root).style.width = `${100 - pct}%`;
  $('#owSplitTx', root).style.width = `${pct}%`;
  $('#owSplitOpT', root).textContent = `${100 - pct}%`;
  $('#owSplitTxT', root).textContent = `${pct}%`;
  countUp($('#owResBal', root), res.balance, { prefix: 'NT$ ', duration: anim ? 1.4 : 0.5 });
  $('#owResSince', root).textContent = `自 ${res.start.getMonth() + 1}/1 起收款 ${wan(res.inflow)} × ${pct}%，已繳出營業稅與扣繳 ${wan(res.vatPaid + res.whPaid)}`;
  const gap = res.gap;
  $('#owResStats', root).innerHTML = `
    <div style="--c:var(--mint)"><small>每月約自動撥入</small><b>${money(res.monthlySweep)}</b><em>依近期月收款 × ${pct}%</em></div>
    <div style="--c:var(--amber)"><small>本期應繳＋應提列</small><b>${money(res.need)}</b></div>
    <div class="${gap >= 0 ? 'ok' : 'bad'}" style="--c:${gap >= 0 ? 'var(--leaf)' : 'var(--coral)'}"><small>差額</small><b>${gap >= 0 ? '+' : '−'}${money(Math.abs(gap))}</b><em>${gap >= 0 ? '已足額，多出的先留給明年 5 月營所稅' : `不足，需提高撥款比例或手動補 ${wan(-gap)}`}</em></div>`;
  let left = res.balance;
  $('#owDues', root).innerHTML = res.dues.map(d => {
    const days = daysTo(d.d);
    const covered = d.amt ? Math.min(1, Math.max(0, left) / d.amt) : 1;
    left -= d.amt;
    return `<div class="ow-due ${days <= 14 ? 'soon' : ''}">
      <div class="ow-due-d"><b>${d.d.getMonth() + 1}/${d.d.getDate()}</b>${d.d.getFullYear() !== new Date().getFullYear() ? `<small>${d.d.getFullYear()} 年</small>` : ''}<small>${days} 天後</small></div>
      <div class="ow-due-t"><b>${esc(d.t)}</b><small>${esc(d.sub || '依帳務自動試算')}</small><i class="ow-due-bar"><em style="width:${(covered * 100).toFixed(0)}%"></em></i></div>
      <div class="ow-due-a">${money(d.amt)}<small>${covered >= 1 ? '已備足' : `已備 ${Math.round(covered * 100)}%`}</small></div>
    </div>`;
  }).join('');
  $('#owFeed', root).innerHTML = res.feed.slice(0, 5).map(feedRow).join('');
}
function feedRow(f) {
  const ch = CHANNEL_MAP[f.ch];
  return `<li><span class="chdot ch-${f.ch}">${esc((ch?.name || f.ch).slice(0, 1))}</span><span class="ow-feed-t"><b>${esc(f.who)}</b><small>${fmtMD(f.ts)} ${fmtTime(f.ts)}・收款 ${money(f.total)}</small></span><em>+${money(f.cut)}</em></li>`;
}
function flashSweep(order) {
  if (!root) return;
  const ul = $('#owFeed', root); if (!ul) return;
  const li = el(feedRow({ id: order.id, ts: order.paidAt || order.ts, who: order.customer, ch: order.channel, total: order.total, cut: Math.round(order.total * S.rate) }));
  li.classList.add('new');
  ul.prepend(li);
  while (ul.children.length > 5) ul.lastElementChild.remove();
  gsap.fromTo(li, { opacity: 0, x: -20, backgroundColor: 'rgba(45,182,116,0.3)' }, { opacity: 1, x: 0, backgroundColor: 'rgba(45,182,116,0)', duration: 1.2, ease: 'power2.out' });
}

// ---------- 領錢方式比較 ----------
function renderPay() {
  const { pool } = profitPool();
  const T = S.payTotal, sh = S.payShare;
  $('#owPayTotalT', root).textContent = money(T);
  $('#owPayTotalT2', root).textContent = wan(T);
  $('#owPayShareT', root).textContent = `${Math.round(sh * 100)}%（${wan(T * sh)}／年，約 ${wan(T * sh / 12)}／月）`;
  $('#owPool', root).textContent = money(pool);
  const scen = [
    { k: 'sal', t: '全部董事酬勞', s: 1, c: 'var(--sky)' },
    { k: 'mix', t: `你的組合（酬勞 ${Math.round(sh * 100)}%）`, s: sh, c: 'var(--mint)', me: true },
    { k: 'div', t: '全部盈餘分配', s: 0, c: 'var(--violet)' },
  ].map(x => ({ ...x, r: payScenario(T, x.s, pool) }));
  const minB = Math.min(...scen.map(x => x.r.burden));
  const rows = [
    ['公司營所稅', r => r.cit],
    ['個人綜所稅', r => r.pit],
    ['二代健保補充保費', r => r.nhi],
  ];
  $('#owScen', root).innerHTML = scen.map(x => `
    <div class="ow-sc ${x.me ? 'me' : ''}" style="--c:${x.c}">
      <div class="ow-sc-h"><b>${esc(x.t)}</b><small>酬勞 ${wan(x.r.S)}・股利 ${wan(x.r.D)}</small></div>
      ${rows.map(([n, f]) => `<div class="ow-sc-r"><span>${n}</span><b>${f(x.r) < 0 ? '−' : ''}${money(Math.abs(f(x.r)))}</b></div>`).join('')}
      <div class="ow-sc-r tot"><span>合計稅負</span><b>${money(x.r.burden)}</b></div>
      <div class="ow-sc-r take"><span>老闆實拿（稅後）</span><b>${money(x.r.take)}</b></div>
      <div class="ow-sc-r"><span>公司留存（稅後）</span><b>${money(x.r.keep)}</b></div>
      <div class="ow-sc-f">${x.r.D ? esc(x.r.method) : '無股利所得'}${x.r.burden === minB ? '<em>三者中試算稅負最低</em>' : ''}${x.r.capped ? '<em class="bad">盈餘不足，股利已上限</em>' : ''}</div>
    </div>`).join('');

  // 曲線：不同比例的稅負組成
  const xs = Array.from({ length: 21 }, (_, i) => i * 5);
  const rs = xs.map(p => payScenario(T, p / 100, pool));
  const cur = Math.round(sh * 20);
  payChart && payChart.setOption({
    animationDuration: 600,
    grid: { left: 8, right: 14, top: 34, bottom: 4, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 12, itemHeight: 8, textStyle: { fontSize: 11 } },
    tooltip: { trigger: 'axis', formatter: (ps) => `董事酬勞 ${ps[0].axisValue}%<br/>` + ps.map(p => `${p.marker}${p.seriesName} NT$ ${n0(p.value)}`).join('<br/>') + `<br/><b>合計 NT$ ${n0(rs[ps[0].dataIndex].burden)}</b>` },
    xAxis: { type: 'category', data: xs, boundaryGap: false, axisLabel: { formatter: '{value}%', interval: 3 } },
    yAxis: { type: 'value', axisLabel: { formatter: v => wan(v) } },
    series: [
      { name: '公司營所稅', type: 'line', stack: 't', data: rs.map(r => r.cit), smooth: true, symbol: 'none', lineStyle: { width: 1, color: '#F0A531' }, areaStyle: { color: 'rgba(240,165,49,0.35)' }, itemStyle: { color: '#F0A531' },
        markLine: { silent: true, symbol: 'none', data: [{ xAxis: cur }], lineStyle: { color: '#5EE0C4', type: 'solid', width: 2 }, label: { formatter: '你的組合', color: '#5EE0C4', fontSize: 11 } } },
      { name: '個人綜所稅', type: 'line', stack: 't', data: rs.map(r => Math.max(0, r.pit)), smooth: true, symbol: 'none', lineStyle: { width: 1, color: '#2E97D4' }, areaStyle: { color: 'rgba(46,151,212,0.35)' }, itemStyle: { color: '#2E97D4' } },
      { name: '補充保費', type: 'line', stack: 't', data: rs.map(r => r.nhi), smooth: true, symbol: 'none', lineStyle: { width: 1, color: '#DD5597' }, areaStyle: { color: 'rgba(221,85,151,0.35)' }, itemStyle: { color: '#DD5597' } },
    ],
  });
}

// ---------- 現金跑道 ----------
function renderRun() {
  const rw = runwayProject({ rev: S.rev, draw: S.drawn ? snap.availPos : 0, seasonal: S.seasonal }, snap);
  $$('#owPresets .seg', root).forEach(b => b.classList.toggle('on', Math.abs(+b.dataset.v - S.rev) < 0.001));
  $('#owRevT', root).textContent = `${S.rev > 0 ? '+' : S.rev < 0 ? '−' : ''}${Math.abs(Math.round(S.rev * 100))}%`;
  $('#owZero', root).textContent = `${rw.zeroMonths.toFixed(1)} 個月`;
  $('#owZeroSub', root).textContent = `扣掉稅金、應付與已承諾後的現金 ${wan(rw.liquid)} ÷ 每月固定支出（含你的董事酬勞）${wan(rw.burnZero)}`;
  const b = rw.b;
  $('#owRunKv', root).innerHTML = [
    ['近 3 個月平均收款', money(b.rin), 'var(--leaf)'],
    ['平均進貨（隨營收變動）', money(b.buy), 'var(--violet)'],
    ['平均費用＋薪資', money(b.exp + b.hr), 'var(--sky)'],
    [`情境下每月淨現金流`, `${rw.monthNet >= 0 ? '+' : '−'}${money(Math.abs(rw.monthNet))}`, rw.monthNet >= 0 ? 'var(--mint)' : 'var(--coral)'],
  ].map(([k, v, c]) => `<div style="--c:${c}"><span>${k}</span><b>${v}</b></div>`).join('');
  const safeLine = snap.fx.total * 3;
  const low = rw.minV;
  let cls = 'ok', msg;
  if (rw.negAt) { cls = 'bad'; msg = `此情境下現金約在 <b>${rw.negAt.label}</b> 見底（第 ${rw.negAt.k} 個月），需要先準備週轉或調整支出。`; }
  else if (low < safeLine) { cls = 'warn'; msg = `12 個月內不會見底，但最低點 <b>${wan(low)}</b>（${rw.minAt}）會跌破 3 個月安全水位 ${wan(safeLine)}，主因是禮盒預購與 5 月營所稅。`; }
  else if (rw.minAt === '今天') msg = `12 個月內現金都在安全水位以上，且一路往上；最低就是今天的 <b>${wan(low)}</b>。`;
  else msg = `12 個月內現金都在安全水位以上，最低點 <b>${wan(low)}</b> 出現在 ${rw.minAt}。`;
  $('#owVerdict', root).className = `ow-run-verdict ${cls}`;
  $('#owVerdict', root).innerHTML = `${icon(cls === 'ok' ? 'check' : 'alert', 16)}<span>${msg}</span>`;
  const col = cls === 'bad' ? '#EC6A55' : cls === 'warn' ? '#F0A531' : '#2DB674';
  const evPts = rw.pts.map((p, i) => p.ev.filter(e => e[1] >= 100000).length ? { coord: [i, p.v], value: p.ev.filter(e => e[1] >= 100000).map(e => e[0].replace(/（.*/, '').replace('年節禮盒原料＋包材預購', '禮盒預購')).join('、') } : null).filter(Boolean);
  runChart && runChart.setOption({
    animationDuration: 700,
    grid: { left: 8, right: 16, top: 40, bottom: 4, containLabel: true },
    legend: { top: 0, right: 0, itemWidth: 14, itemHeight: 4, textStyle: { fontSize: 11 }, data: ['情境預測', '基準'] },
    tooltip: { trigger: 'axis', formatter: (ps) => { const p = rw.pts[ps[0].dataIndex]; return `<b>${p.label}</b><br/>` + ps.map(x => `${x.marker}${x.seriesName} NT$ ${n0(x.value)}`).join('<br/>') + (p.ev.length ? '<br/><span style="color:#ffcf8a">' + p.ev.map(e => `${e[0]} −${n0(e[1])}`).join('<br/>') + '</span>' : ''); } },
    xAxis: { type: 'category', data: rw.pts.map(p => p.ax), boundaryGap: false, axisLabel: { fontSize: 11, hideOverlap: true } },
    yAxis: { type: 'value', axisLabel: { formatter: v => wan(v) } },
    series: [
      { name: '情境預測', type: 'line', data: rw.pts.map(p => p.v), smooth: 0.3, symbol: 'circle', symbolSize: 7, lineStyle: { width: 3, color: col, shadowColor: col, shadowBlur: 12 }, itemStyle: { color: col },
        areaStyle: { color: new window.echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: col + '66' }, { offset: 1, color: col + '00' }]) },
        markLine: { silent: true, symbol: 'none', data: [
          { yAxis: safeLine, lineStyle: { color: '#2E97D4', type: 'dashed' }, label: { formatter: `3 個月安全水位 ${wan(safeLine)}`, position: 'insideStartTop', color: '#8fd0f5', fontSize: 10 } },
          { yAxis: 0, lineStyle: { color: '#EC6A55', type: 'solid', width: 1 }, label: { formatter: '現金歸零', position: 'insideEndTop', color: '#ff9f8f', fontSize: 10 } },
        ] },
        markPoint: { symbol: 'pin', symbolSize: 34, itemStyle: { color: '#F0A531' }, label: { show: false }, data: evPts.map(e => ({ coord: e.coord, value: e.value, name: e.value })),
          tooltip: { formatter: p => p.name } } },
      { name: '基準', type: 'line', data: rw.pts.map(p => p.base), smooth: 0.3, symbol: 'none', lineStyle: { width: 1.5, type: 'dashed', color: 'rgba(214,240,226,0.5)' }, itemStyle: { color: 'rgba(214,240,226,0.5)' } },
    ],
  });
}

// ---------- 公私分明 ----------
function renderSep() {
  const open = FLAGS.filter(f => !S.privateIds.has(f.id) && !S.cleared.has(f.id));
  const advLeft = ADVANCES.filter(a => !S.repaid.has(a.id));
  const score = Math.max(0, 100 - open.length * 5 - advLeft.length * 2 - (S.privateIds.size ? 0 : 0));
  countUp($('#owScore', root), score, { duration: 0.8 });
  const ring = $('#owScoreRing', root); const C = 2 * Math.PI * 50;
  ring.style.strokeDasharray = C; ring.style.strokeDashoffset = C * (1 - score / 100);
  ring.style.stroke = score >= 90 ? '#2DB674' : score >= 75 ? '#F0A531' : '#EC6A55';
  $('#owSepTxt', root).innerHTML = open.length || advLeft.length
    ? `AI 找到 ${[open.length ? `<b>${open.length}</b> 筆可能的私人支出` : '', advLeft.length ? `<b>${advLeft.length}</b> 筆老闆代墊款（${money(advLeft.reduce((s, a) => s + a.amt, 0))}）尚未還` : ''].filter(Boolean).join('、')}。公私混在一起，查帳時容易被剔除費用，也會讓「可以領多少」算不準。`
    : '公司帳和你的私人錢已經分得很清楚，查帳時會輕鬆很多。';
  $('#owFlags', root).innerHTML = FLAGS.map(f => {
    const st = S.privateIds.has(f.id) ? 'priv' : S.cleared.has(f.id) ? 'biz' : '';
    return `<li class="ow-flag ${st}" data-id="${f.id}">
      <div class="ow-flag-m"><b>${esc(f.vendor)}<em>${money(f.amt)}</em></b><small>${f.date[0]}/${f.date[1]}・${esc(f.item)}・原列「${esc(f.acct)}」</small><span class="ow-flag-why">${icon('sparkle', 12)} ${esc(f.why)}</span></div>
      <div class="ow-flag-c"><i class="ow-conf" style="--p:${f.conf}%"></i><small>私人可能性 ${f.conf}%</small></div>
      <div class="ow-flag-a">${st ? `<span class="st ${st === 'priv' ? 'pending' : 'paid'}">${st === 'priv' ? '已轉列老闆預支' : '確認為公司支出'}</span><button class="ow-link" data-act="undo">復原</button>`
        : `<button class="btn btn-sm btn-ghost" data-act="priv">轉為私人</button><button class="btn btn-sm btn-ghost" data-act="biz">是公司的</button>`}</div>
    </li>`;
  }).join('');
  $('#owAdv', root).innerHTML = ADVANCES.map(a => {
    const done = S.repaid.has(a.id);
    return `<li class="${done ? 'done' : ''}"><label><input type="checkbox" data-id="${a.id}" ${S.pick.has(a.id) && !done ? 'checked' : ''} ${done ? 'disabled' : ''}><i></i></label>
      <span class="ow-adv-t"><b>${esc(a.item)}</b><small>${a.date[0]}/${a.date[1]}・${esc(a.vendor)}・${esc(a.doc)}</small></span>
      <em>${done ? '<span class="st paid">已還款</span>' : money(a.amt)}</em></li>`;
  }).join('');
  const sel = ADVANCES.filter(a => S.pick.has(a.id) && !S.repaid.has(a.id));
  const btn = $('#owRepay', root);
  btn.disabled = !sel.length;
  btn.innerHTML = sel.length ? `${icon('refresh', 16)} 一鍵建立「老闆代墊」還款 ${money(sel.reduce((s, a) => s + a.amt, 0))}` : `${icon('check', 16)} ${advLeft.length ? '請勾選要還的代墊款' : '代墊款已全部還清'}`;
}
function onFlag(e) {
  const b = e.target.closest('button[data-act]'); if (!b) return;
  const id = b.closest('.ow-flag').dataset.id;
  const f = FLAGS.find(x => x.id === id);
  if (b.dataset.act === 'priv') {
    S.privateIds.add(id); S.cleared.delete(id);
    toast(`已轉列老闆預支｜${f.vendor}`, `傳票：借 業主往來－阿美 ${n0(f.amt)}／貸 ${f.acct} ${n0(f.amt)}；本月可安心領減少 ${money(f.amt)}`, { kind: 'warn', icon: icon('user', 18) });
    store.log('bank', `公私分明：${f.vendor} ${money(f.amt)} 轉列業主往來（老闆預支）`);
  } else if (b.dataset.act === 'biz') {
    S.cleared.add(id); S.privateIds.delete(id);
    toast(`已確認為公司支出｜${f.vendor}`, f.acct === '交際費' ? '請補上招待對象與業務目的，AI 已附註在傳票備註欄' : 'AI 會記住這類支出，下次不再提醒', { icon: icon('check', 18) });
  } else { S.privateIds.delete(id); S.cleared.delete(id); }
  refresh(false, true);
}
async function onRepay() {
  const sel = ADVANCES.filter(a => S.pick.has(a.id) && !S.repaid.has(a.id));
  if (!sel.length) return;
  const btn = $('#owRepay', root);
  const amt = sel.reduce((s, a) => s + a.amt, 0);
  btn.disabled = true; btn.innerHTML = `<span class="ow-spin"></span> AI 產生傳票與轉帳草稿…`;
  await sleep(900);
  sel.forEach(a => S.repaid.add(a.id));
  const now = new Date();
  const no = `JV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(40 + S.repaid.size).padStart(3, '0')}`;
  const jv = $('#owJv', root);
  jv.hidden = false;
  jv.innerHTML = `<div class="ow-jv-h"><b>${icon('file', 15)} 傳票 ${no}</b><span class="st paid">已建立・待你確認轉帳</span></div>
    <table class="ow-jv-t"><tr><td>借</td><td>應付股東－阿美（業主往來）</td><td class="r">${n0(amt)}</td></tr><tr><td>貸</td><td>銀行存款－玉山營運帳戶</td><td class="r">${n0(amt)}</td></tr></table>
    <small>摘要：償還老闆代墊 ${sel.length} 筆（${sel.map(a => `${a.date[0]}/${a.date[1]} ${a.item}`).join('、')}）。轉帳草稿：今日 15:30 轉入阿美個人帳戶（示範，不會真的轉帳）。</small>`;
  gsap.fromTo(jv, { opacity: 0, y: 12, scale: 0.98 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'back.out(1.6)' });
  toast('老闆代墊還款已建立', `${sel.length} 筆共 ${money(amt)}，傳票 ${no}；帳上現金與應付股東同步減少，可安心領金額不變`, { icon: icon('check', 18) });
  store.log('pay', `建立老闆代墊還款 ${money(amt)}（傳票 ${no}）`);
  refresh(false, true);
}

// ---------- 存錢目標 ----------
function renderGoals(anim) {
  const em = GOALS.emergency;
  const emTarget = snap.fx.total * em.months;
  const emSaved = snap.layers[1].amt;
  const ov = GOALS.oven;
  const ovSaved = ov.saved + S.extraGoal;
  const now = new Date();
  const left = Math.max(1, (ov.due[0] - now.getFullYear()) * 12 + (ov.due[1] - 1 - now.getMonth()));
  const need = Math.max(0, Math.ceil((ov.target - ovSaved) / left / 100) * 100);
  const eta = ov.monthly > 0 ? Math.ceil((ov.target - ovSaved) / ov.monthly) : Infinity;
  const etaD = new Date(now.getFullYear(), now.getMonth() + eta, 1);
  const goals = [
    { id: 'em', name: '緊急預備金', ic: 'shield', c: '#2E97D4', target: emTarget, saved: Math.min(emSaved, emTarget),
      sub: `目標：${em.months} 個月固定支出（每月 ${wan(snap.fx.total)}）`,
      note: `目前以「${S.safetyMonths} 個月安全金」圈存在營運帳戶${emSaved >= emTarget ? '，已達標' : `；還差 ${wan(emTarget - emSaved)}，可把上方安全金改成 6 個月`}`,
      act: emSaved >= emTarget ? '' : `<button class="btn btn-sm btn-ghost" data-act="em6">${icon('shield', 14)} 安全金改為 6 個月</button>` },
    { id: 'ov', name: ov.name, ic: 'factory', c: '#F0A531', target: ov.target, saved: ovSaved,
      sub: `${ov.due[0]}/${ov.due[1]} 汰換旋風烤箱・還有 ${left} 個月`,
      note: `${ov.note}。每月自動提撥 ${money(ov.monthly)}，${eta <= left ? `預計 ${etaD.getFullYear()}/${etaD.getMonth() + 1} 存滿，來得及` : `照目前速度要到 ${etaD.getFullYear()}/${etaD.getMonth() + 1}，需每月 ${money(need)} 才來得及`}`,
      act: `<button class="btn btn-sm btn-primary" data-act="ov5k">${icon('plus', 14)} 本月加碼 NT$ 5,000</button>` },
    { id: 'bn', name: GOALS.bonus.name, ic: 'users', c: '#DD5597', target: GOALS.bonus.target, saved: S.bonusNow ? GOALS.bonus.monthly : 0,
      sub: `${GOALS.bonus.due[0]}/${GOALS.bonus.due[1]}/${GOALS.bonus.due[2]} 發放・${GOALS.bonus.note}`,
      note: S.bonusNow ? `本月已先提撥 ${money(GOALS.bonus.monthly)}（已從可安心領扣除），之後每月自動提撥，1 月中存滿。` : `尚未開始存。11 月起每月自動提撥 ${money(GOALS.bonus.monthly)}，發放前剛好存滿；也可以從本月就開始。`,
      act: S.bonusNow ? '' : `<button class="btn btn-sm btn-ghost" data-act="bonus">${icon('play', 14)} 本月就開始提撥</button>` },
  ];
  $('#owGoals', root).innerHTML = goals.map(g => {
    const p = Math.min(100, g.saved / g.target * 100);
    return `<div class="ow-g" style="--c:${g.c}">
      <div class="ow-g-h"><span class="ow-g-ic">${icon(g.ic, 18)}</span><div><b>${esc(g.name)}</b><small>${esc(g.sub)}</small></div><em>${p.toFixed(0)}%</em></div>
      <div class="ow-g-bar"><i data-w="${p.toFixed(1)}%" style="width:${p.toFixed(1)}%"></i>${[25, 50, 75].map(m => `<s style="left:${m}%"></s>`).join('')}</div>
      <div class="ow-g-num"><b>${money(g.saved)}</b><span>／ ${money(g.target)}</span></div>
      <p>${esc(g.note)}</p>
      ${g.act ? `<div class="ow-g-act">${g.act}</div>` : ''}
    </div>`;
  }).join('') + `<div class="ow-g-tip">${icon('sparkle', 14)}<span>存錢目標的錢都會從「可安心領」裡先扣掉，所以你領走的每一塊錢，都不會動到預備金和設備基金。</span></div>`;
  if (anim) $$('.ow-g-bar i', root).forEach((t, i) => gsap.fromTo(t, { width: '0%' }, { width: t.dataset.w, duration: 1.1, ease: 'power3.out', delay: 0.3 + i * 0.12 }));
}
function onGoal(e) {
  const b = e.target.closest('button[data-act]'); if (!b) return;
  if (b.dataset.act === 'ov5k') {
    S.extraGoal += 5000;
    toast('已加碼烤箱汰換基金 NT$ 5,000', `基金累積 ${money(GOALS.oven.saved + S.extraGoal)}；本月可安心領同步減少 5,000`, { icon: icon('leaf', 18) });
    refresh(false, true);
    const bar = $('.ow-g[style*="F0A531"] .ow-g-bar i', root);
    bar && gsap.fromTo(bar, { filter: 'brightness(1.8)' }, { filter: 'brightness(1)', duration: 1 });
  } else if (b.dataset.act === 'bonus') {
    S.bonusNow = true;
    toast('員工年終獎金開始提撥', `本月先存 ${money(GOALS.bonus.monthly)}，可安心領同步減少`, { icon: icon('users', 18) });
    refresh(false, true);
  } else if (b.dataset.act === 'em6') {
    $$('#owSafeSeg .seg', root).find(x => x.dataset.n === '6')?.click();
  }
}

// ---------- 安排轉帳給自己 ----------
function onDraw() {
  if (snap.avail <= 0) { toast('這個月先不要額外領', '扣完稅金、安全金與已承諾支出後已不足，AI 會在收款回升後提醒你', { kind: 'warn', icon: icon('alert', 18) }); return; }
  S.drawn = true; $('#owIncDraw', root).checked = true;
  renderRun();
  toast(`已建立轉帳草稿 ${money(snap.availPos)}（示範）`, '用董事酬勞加發或年度盈餘分配，請參考下方試算並與會計師確認；現金跑道已扣除這筆', { icon: icon('coins', 18) });
  const t = $('#owRun', root);
  setTimeout(() => t.scrollIntoView({ behavior: 'smooth', block: 'start' }), 500);
}
