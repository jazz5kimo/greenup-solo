// 老闆的時間：休假模式、勿擾時段、工時健康、AI 省下的時間、緊急代理人（示範資料）
import { store } from '../state.js';
import { $, $$, el, gsap, esc, money, countUp, toast, sleep, fmtTime } from '../util.js';
import { icon } from '../icons.js';
import { makeChart } from '../charts.js';
import { addDays, startOfDay } from '../data.js';
import {
  OWNER, WD, wdOf, md, hh, weekMessages, blocked, workWeek, savedTime, vacationEstimate, shipSamples, nightSample,
  SUPPLIERS, URGENT, DAY_SIM, LANGS, REASONS, notice, PROXIES, AVATAR, CUSTOM_TXT, URGENT_PING,
} from '../time-data.js';

const MOON = (s = 18) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>`;
const SUN = (s = 18) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`;
const CH_TXT = { line: 'L', whatsapp: 'W', zalo: 'Z', messenger: 'M', web: '官', phone: '電', pos: 'P' };
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parse = (v) => { const [y, m, d] = v.split('-').map(Number); return new Date(y, m - 1, d); };
const dayDiff = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / 864e5);
const hLabel = (h) => (h % 1 ? h.toFixed(1) : String(h));

let root, go, wm, ww, sv, healthChart, savedChart, inited = false, runTok = 0, simTok = 0;
const S = {
  on: false, from: addDays(startOfDay(new Date()), 4), to: addDays(startOfDay(new Date()), 8), reason: 'rest', pickup: 'pause',
  lang: 'zh', chan: 'web', urgent: Object.fromEntries(URGENT.map(u => [u.id, u.on])), bigAmt: 10000,
  quietOn: true, quiet: { s: 22, e: 8, off: new Set() }, view: 'heat', proxy: 'cpa', notify: 'line', wait: 30, applied: new Set(),
};

const PLAN = [
  { id: 'ai', icon: 'bot', t: 'AI 店員全天接手，主動告知客人休假期間' },
  { id: 'notice', icon: 'globe', t: '官網與 LINE 顯示休假公告（5 種語言）' },
  { id: 'ship', icon: 'truck', t: '宅配訂單出貨日自動順延，並告知客人' },
  { id: 'pickup', icon: 'store', t: '門市取貨與預約' },
  { id: 'supplier', icon: 'box', t: '通知供應商暫停送貨' },
  { id: 'urgent', icon: 'bell', t: '急件規則啟動：只有大事才找你' },
  { id: 'back', icon: 'file', t: '回來前一天整理「回來要處理的事」' },
];

function vac() {
  const days = dayDiff(S.from, S.to) + 1;
  const back = addDays(S.to, 1);
  return { days, back, est: vacationEstimate(store.orders, days) };
}
function urgentNames() {
  const map = { allergy: '過敏反應', complaint: '客訴', refund: '退款', big: `超過 ${money(S.bigAmt)} 的訂單`, b2b: '企業詢價' };
  return URGENT.filter(u => S.urgent[u.id]).map(u => map[u.id]);
}
function planDetail(id) {
  const { back, est } = vac();
  const s = md(S.from), e = md(S.to), b = md(back);
  const names = shipSamples(store.orders, 2).map(o => o.customer).join('、');
  switch (id) {
    case 'ai': return `LINE、WhatsApp、Zalo、Messenger、官網、電話 24 小時回覆，每段對話開頭都先說明 ${s}–${e} 休假中`;
    case 'notice': return `中、日、英、越、馬 5 種語言公告已排程上架 <button class="tm-link" data-jump="tmNotice">預覽公告</button>`;
    case 'ship': return `預估 ${est.ship} 筆宅配改為 ${b} 起依序出貨，已傳訊告知 ${esc(names)} 等客人`;
    case 'pickup': return S.pickup === 'pause' ? `${s}–${e} 暫停門市取貨與客製預約，客人可改約 ${b} 之後` : `休假期間只開放 ${b} 之後的取貨與預約時段`;
    case 'supplier': return `${SUPPLIERS.map(x => x.name).join('、')}：${s}–${e} 暫停，${b} 恢復（已發 LINE 給對方確認）`;
    case 'urgent': return `只有 ${urgentNames().join('、')} 才會推播給你，其他 AI 先處理、回來再整理 <button class="tm-link" data-jump="tmUrg">調整規則</button>`;
    case 'back': return `${md(addDays(S.to, 0))} 晚上 8 點傳到你的 LINE，回來第一天不用手忙腳亂 <button class="tm-link" data-jump="tmBack">先看看</button>`;
  }
  return '';
}

export default {
  mount(section, ctx) {
    root = section; go = ctx.go;
    wm = weekMessages(store.orders);
    ww = workWeek();
    sv = savedTime(store.orders, store.purchases, wm);
    section.innerHTML = `
    <div class="tm">
      <div class="glass tm-hero anim-in" id="tmVac">
        <div class="tm-stars" aria-hidden="true">${Array.from({ length: 26 }, (_, i) => `<i style="left:${(i * 37) % 100}%;top:${(i * 53) % 90}%;animation-delay:${(i % 7) * 0.4}s"></i>`).join('')}</div>
        <div class="tm-hero-l">
          <div class="tm-badges">
            <span class="demo-badge">${icon('alert', 14)} 示範資料</span>
            <span class="chip-sm">${icon('heart', 12)} 你休息，AI 顧店</span>
          </div>
          <h2 class="tm-h2">想休息就休息，店交給 AI 顧</h2>
          <p class="tm-lead">生病、出國、家裡有事，或只是想好好睡一覺⋯⋯打開休假模式，AI 店員會接手所有通路，只有真正的急事才會找你。</p>
          <div class="tm-sw-row">
            <button class="tm-switch" id="tmSwitch" role="switch" aria-checked="false" aria-label="休假模式"><i>${SUN(18)}${MOON(18)}</i></button>
            <div class="tm-sw-txt"><b id="tmSwState">休假模式：關閉</b><span id="tmSwSub">選好日期，按一下就能放心休息</span></div>
          </div>
          <div class="tm-dates">
            <label class="tm-date"><small>開始</small><input type="date" id="tmFrom"></label>
            <span class="tm-arrow">${icon('arrow', 16)}</span>
            <label class="tm-date"><small>結束（含當天）</small><input type="date" id="tmTo"></label>
            <div class="tm-dur"><b id="tmDays">5</b><small>天</small></div>
          </div>
          <div class="tm-presets" id="tmPresets">${[[2, '週末兩天'], [5, '休 5 天'], [7, '出國一週'], [14, '長假 14 天']].map(([n, t]) => `<button class="tm-pill" data-n="${n}">${t}</button>`).join('')}</div>
          <div class="tm-reason"><small>休假原因（只影響公告用語，可以不寫）</small><div class="tm-pills" id="tmReason">${REASONS.map(([id, t]) => `<button class="tm-pill ${id === S.reason ? 'on' : ''}" data-r="${id}">${t}</button>`).join('')}</div></div>
          <div class="tm-est">
            <div class="tm-est-h">${icon('sparkle', 14)} 休假期間預估 <small id="tmEstRange"></small></div>
            <div class="tm-est-g">
              <div><b id="tmEstMsg">0</b><span>則訊息<br>AI 會處理</span></div>
              <div><b id="tmEstOrd">0</b><span>筆訂單<br>AI 會接單</span></div>
              <div class="tm-est-you"><b id="tmEstYou">0–2</b><span>件需要<br>你親自處理</span></div>
            </div>
          </div>
        </div>
        <div class="tm-hero-r">
          <div class="tm-plan-h">
            <span class="tm-moon">${MOON(22)}</span>
            <div><b>打開後，AI 會自動做這 7 件事</b><small id="tmPlanSub">尚未開啟・每一項都可以再調整</small></div>
            <span class="tm-prog" id="tmProg">0/7</span>
          </div>
          <ol class="tm-plan" id="tmPlan">${PLAN.map((p, i) => `
            <li class="tm-step" data-id="${p.id}">
              <span class="tm-st"><em>${i + 1}</em><i class="tm-spin"></i><span class="tm-ok">${icon('check', 14)}</span></span>
              <div class="tm-step-b">
                <b>${icon(p.icon, 15)}${p.t}${p.id === 'pickup' ? `<span class="tm-mini" id="tmPick"><button data-p="pause" class="on">全部暫停</button><button data-p="after">只接休假後</button></span>` : ''}</b>
                <span class="tm-step-d" data-d="${p.id}"></span>
              </div>
            </li>`).join('')}
          </ol>
        </div>
      </div>

      <nav class="tm-jump anim-in">${[['tmNotice', 'globe', '休假公告'], ['tmUrg', 'bell', '急件規則'], ['tmBack', 'file', '回來要處理的事'], ['tmQuiet', 'mute', '勿擾時段'], ['tmHealth', 'heart', '工時健康'], ['tmSaved', 'clock', 'AI 省下的時間'], ['tmProxy', 'users', '緊急代理人']].map(([id, ic, t]) => `<button data-jump="${id}">${icon(ic, 14)}${t}</button>`).join('')}</nav>

      <div class="tm-row tm-row3">
        <div class="glass card tm-notice anim-in" id="tmNotice">
          <div class="card-h"><h3>${icon('globe', 18)} 休假公告預覽</h3><span class="chip-sm">${icon('sparkle', 12)} AI 自動翻譯</span></div>
          <div class="tm-tabs" id="tmChan"><button data-c="web" class="on">${icon('store', 14)} 官網橫幅</button><button data-c="line" class="">${icon('chat', 14)} LINE 訊息</button></div>
          <div class="tm-langs" id="tmLangs">${LANGS.map(([id, t]) => `<button data-l="${id}" class="${id === 'zh' ? 'on' : ''}">${t}</button>`).join('')}</div>
          <div class="tm-pv" id="tmPv"></div>
          <div class="tm-pv-foot"><span>${icon('check', 13)} 休假結束隔天自動下架</span><button class="btn btn-ghost btn-sm" id="tmCopy">${icon('file', 14)} 複製文字</button></div>
        </div>

        <div class="glass card tm-urg anim-in" id="tmUrg">
          <div class="card-h"><h3>${icon('bell', 18)} 急件規則：什麼事才打擾你</h3></div>
          <p class="tm-note">勾選的才會推播到你的手機，其餘 AI 先安撫客人、處理好，回來再整理給你。</p>
          <ul class="tm-rules" id="tmRules">${URGENT.map(u => `
            <li class="${u.lock ? 'lock' : ''}">
              <span class="tm-r-ic">${icon(u.icon, 15)}</span>
              <div><b>${u.name}</b><small>${u.id === 'big' ? `單筆超過 NT$ <input class="tm-amt" id="tmAmt" type="number" min="1000" step="1000" value="${S.bigAmt}" aria-label="大額訂單門檻">` : u.desc}</small></div>
              ${u.lock ? `<span class="tm-lock" title="為了客人安全，一定會通知你">${icon('lock', 13)} 必通知</span>` : `<label class="tm-tg"><input type="checkbox" data-u="${u.id}" ${S.urgent[u.id] ? 'checked' : ''}><i></i></label>`}
            </li>`).join('')}
          </ul>
          <div class="tm-sub-h">${icon('play', 14)} 模擬：休假中的一天<button class="btn btn-ghost btn-sm" id="tmSim">${icon('play', 13)} 播放</button></div>
          <ul class="tm-feed" id="tmFeed"><li class="tm-feed-empty">按「播放」看看 AI 怎麼替你接住一整天的訊息</li></ul>
          <div class="tm-sim-sum" id="tmSimSum" hidden></div>
        </div>

        <div class="glass card tm-back anim-in" id="tmBack">
          <div class="card-h"><h3>${icon('file', 18)} 回來要處理的事</h3><span class="chip-sm" id="tmBackWhen"></span></div>
          <p class="tm-note" id="tmBackLead"></p>
          <ul class="tm-todo" id="tmTodo"></ul>
          <div class="tm-sub-h">${icon('check', 14)} AI 已經做完，不用管</div>
          <div class="tm-done" id="tmDone"></div>
          <button class="btn btn-ghost btn-sm tm-regen" id="tmRegen">${icon('refresh', 14)} 重新產生預覽</button>
        </div>
      </div>

      <div class="tm-row tm-row2">
        <div class="glass card tm-quiet anim-in" id="tmQuiet">
          <div class="card-h"><h3>${icon('mute', 18)} 勿擾時段</h3><label class="tm-tg"><input type="checkbox" id="tmQuietOn" checked><i></i></label></div>
          <div class="tm-q-grid">
            <div class="tm-dial" id="tmDial"></div>
            <div class="tm-q-ctl">
              <div class="tm-q-time">
                <label><small>每天從</small><select id="tmQs">${[19, 20, 21, 22, 23].map(h => `<option value="${h}" ${h === 22 ? 'selected' : ''}>${hh(h)}</option>`).join('')}</select></label>
                <span>到</span>
                <label><small>隔天</small><select id="tmQe">${[6, 7, 8, 9, 10].map(h => `<option value="${h}" ${h === 8 ? 'selected' : ''}>${hh(h)}</option>`).join('')}</select></label>
              </div>
              <small class="tm-q-l">每週店休日（整天由 AI 顧店）</small>
              <div class="tm-wd" id="tmWd">${WD.map((w, i) => `<button data-w="${i}">${w}</button>`).join('')}</div>
              <p class="tm-q-rule">${icon('bell', 13)} 這段時間的訊息由 AI 處理，只有<b>急件</b>才會推播；其他早上 ${'<span id="tmQeTxt">08:00</span>'} 一次整理給你。</p>
            </div>
          </div>
          <div class="tm-blocked">
            <span class="tm-b-ic">${MOON(22)}</span>
            <div><small>這 7 天 AI 幫你擋下</small><b><em id="tmBlk">0</em> 則深夜訊息</b><span id="tmBlkSub"></span></div>
          </div>
          <ul class="tm-nights" id="tmNights"></ul>
          <div class="tm-digest" id="tmDigest"></div>
        </div>

        <div class="glass card tm-health anim-in" id="tmHealth">
          <div class="card-h"><h3>${icon('heart', 18)} 工時健康</h3><div class="tm-tabs sm" id="tmHView"><button data-v="heat" class="on">熱力圖</button><button data-v="bar">每日長條</button></div></div>
          <div class="tm-kpis">
            <div style="--c:var(--amber)"><small>${icon('clock', 13)} 這 7 天工作</small><b><em id="tmKH">0</em> 小時</b><span>依打卡與系統使用時間估算</span></div>
            <div style="--c:var(--coral)"><small>${icon('calendar', 13)} 連續工作</small><b><em id="tmKS">0</em> 天</b><span>上次整天休息：${md(ww.lastOff)}</span></div>
            <div style="--c:var(--violet)"><small>${MOON(13)} 深夜工作</small><b><em id="tmKN">0</em> 次</b><span>最晚 ${hh(ww.latest.latest)} 還在${esc(ww.latest.what)}</span></div>
          </div>
          <div class="chart tm-hchart" id="tmHChart"></div>
          <div class="tm-care" id="tmCare"></div>
        </div>
      </div>

      <div class="tm-row tm-row2b">
        <div class="glass card tm-saved anim-in" id="tmSaved">
          <div class="card-h"><h3>${icon('sparkle', 18)} AI 這 7 天幫你省下的時間</h3><span class="chip-sm">以人工作業平均時間換算</span></div>
          <div class="tm-sv-grid">
            <div class="tm-sv-chart"><div class="chart" id="tmSChart"></div></div>
            <ul class="tm-sv-list" id="tmSList">${sv.rows.map(r => `
              <li style="--c:${r.color}"><span class="tm-sv-ic">${icon(r.icon, 15)}</span><div><b>${r.name}</b><small>${r.detail}</small></div><em>${hLabel(r.h)} 小時</em></li>`).join('')}
            </ul>
          </div>
          <div class="tm-sv-foot">
            <div><small>合計省下</small><b><em id="tmSvH">0</em> 小時</b></div>
            <div class="tm-sv-eq">=</div>
            <div class="tm-sv-days"><small>等於多休</small><b><em id="tmSvD">0</em> 天</b><span>以一天 8 小時計</span></div>
            <div class="tm-sv-more">${MOON(16)}<span>或是每天提早 <b>${hLabel(Math.round(sv.total / 7 * 10) / 10)} 小時</b>收工，晚上陪家人、好好睡覺</span></div>
          </div>
        </div>

        <div class="glass card tm-proxy anim-in" id="tmProxy">
          <div class="card-h"><h3>${icon('users', 18)} 緊急聯絡與代理人</h3><span class="chip-sm">${icon('lock', 12)} 權限：唯讀</span></div>
          <p class="tm-note">找不到你的時候，誰可以幫你看一下？代理人只會在急件時收到通知，<b>只能看、不能動錢</b>。</p>
          <div class="tm-px" id="tmPx">${PROXIES.map(p => `<button data-p="${p.id}" class="${p.id === S.proxy ? 'on' : ''}" style="--c:${p.color}"><span class="tm-av">${p.initial}</span><span><b>${p.name}</b><small>${p.rel}</small></span></button>`).join('')}</div>
          <div class="tm-form">
            <label><small>姓名</small><input id="tmPxName" maxlength="20"></label>
            <label><small>關係</small><input id="tmPxRel" maxlength="20"></label>
            <label><small>手機</small><input id="tmPxPhone" maxlength="20"></label>
            <div class="tm-f-notify"><small>通知方式</small><div class="tm-mini" id="tmNotify"><button data-n="line" class="on">LINE</button><button data-n="sms">簡訊</button><button data-n="call">AI 打電話</button></div></div>
          </div>
          <div class="tm-perm">
            <div><small>${icon('check', 13)} 可以看</small><ul><li>急件內容與客人聯絡方式</li><li>今天的訂單與出貨狀態</li><li>AI 已回覆的對話紀錄</li></ul></div>
            <div class="no"><small>${icon('lock', 13)} 不能做</small><ul><li>退款、改價格</li><li>看完整帳務與銀行</li><li>修改店規與設定</li></ul></div>
          </div>
          <div class="tm-chain">
            <div><span>1</span>AI 先處理、安撫客人</div><i>${icon('arrow', 14)}</i>
            <div><span>2</span>推播給${OWNER}</div><i>${icon('arrow', 14)}</i>
            <div><span>3</span><label>未讀 <select id="tmWait">${[15, 30, 60].map(m => `<option value="${m}" ${m === 30 ? 'selected' : ''}>${m} 分鐘</option>`).join('')}</select></label>通知代理人</div>
          </div>
          <div class="tm-px-act">
            <button class="btn btn-primary btn-sm" id="tmInvite">${icon('send', 14)} 儲存並傳送邀請</button>
            <button class="btn btn-ghost btn-sm" id="tmTest">${icon('bell', 14)} 測試緊急通知</button>
          </div>
          <div class="tm-ping" id="tmPing" hidden></div>
        </div>
      </div>
    </div>`;

    $('#tmFrom', root).value = iso(S.from); $('#tmTo', root).value = iso(S.to);
    $('#tmFrom', root).min = iso(startOfDay(new Date())); $('#tmTo', root).min = iso(startOfDay(new Date()));
    bind();
    renderPlanDetails(); renderEst(false); renderNotice(); renderBack(); renderQuiet(false); renderProxy(); renderCare();
    $$('.tm-step', root).forEach(li => li.classList.add('idle'));
  },
  show() {
    if (!inited) {
      inited = true;
      healthChart = makeChart($('#tmHChart', root));
      savedChart = makeChart($('#tmSChart', root));
      renderHealth(); renderSaved();
      renderEst(true); renderQuiet(true);
      countUp($('#tmKH', root), ww.total, { decimals: 1 }); countUp($('#tmKS', root), ww.streak); countUp($('#tmKN', root), ww.nightCount);
      countUp($('#tmSvH', root), sv.total, { decimals: 1 }); countUp($('#tmSvD', root), sv.days, { decimals: 1 });
    }
  },
  hide() { simTok++; },
};

function bind() {
  root.addEventListener('click', (e) => {
    const j = e.target.closest('[data-jump]');
    if (j) { const t = $('#' + j.dataset.jump, root); if (t) { t.scrollIntoView({ behavior: 'smooth', block: 'start' }); gsap.fromTo(t, { boxShadow: '0 0 0 2px rgba(94,224,196,0.7)' }, { boxShadow: '0 0 0 0px rgba(94,224,196,0)', duration: 1.6, delay: 0.4, clearProps: 'boxShadow' }); } }
  });
  $('#tmSwitch', root).addEventListener('click', () => setVacation(!S.on));
  const onDate = () => {
    const f = $('#tmFrom', root).value, t = $('#tmTo', root).value;
    if (f) S.from = parse(f);
    if (t) S.to = parse(t);
    if (S.to < S.from) { S.to = new Date(S.from); $('#tmTo', root).value = iso(S.to); }
    if (dayDiff(S.from, S.to) > 59) { S.to = addDays(S.from, 59); $('#tmTo', root).value = iso(S.to); }
    $$('#tmPresets .tm-pill', root).forEach(b => b.classList.remove('on'));
    datesChanged();
  };
  $('#tmFrom', root).addEventListener('change', onDate);
  $('#tmTo', root).addEventListener('change', onDate);
  $$('#tmPresets .tm-pill', root).forEach(b => b.addEventListener('click', () => {
    const n = +b.dataset.n; const today = startOfDay(new Date());
    if (n === 2) { const sat = addDays(today, ((5 - wdOf(today)) + 7) % 7 || 7); S.from = sat; } else S.from = addDays(today, n >= 7 ? 7 : 4);
    S.to = addDays(S.from, n - 1);
    $('#tmFrom', root).value = iso(S.from); $('#tmTo', root).value = iso(S.to);
    $$('#tmPresets .tm-pill', root).forEach(x => x.classList.toggle('on', x === b));
    datesChanged();
  }));
  $$('#tmReason .tm-pill', root).forEach(b => b.addEventListener('click', () => {
    S.reason = b.dataset.r; $$('#tmReason .tm-pill', root).forEach(x => x.classList.toggle('on', x === b)); renderNotice(true);
  }));
  $$('#tmPick button', root).forEach(b => b.addEventListener('click', (e) => {
    e.stopPropagation(); S.pickup = b.dataset.p; $$('#tmPick button', root).forEach(x => x.classList.toggle('on', x === b));
    renderPlanDetails(); renderNotice();
    if (S.on) toast(S.pickup === 'pause' ? '門市取貨與預約：休假期間全部暫停' : `門市預約：只開放 ${md(vac().back)} 之後的時段`, '已同步更新公告與預約頁', { icon: icon('store', 18) });
  }));
  // 公告
  $$('#tmChan button', root).forEach(b => b.addEventListener('click', () => { S.chan = b.dataset.c; $$('#tmChan button', root).forEach(x => x.classList.toggle('on', x === b)); renderNotice(true); }));
  $$('#tmLangs button', root).forEach(b => b.addEventListener('click', () => { S.lang = b.dataset.l; $$('#tmLangs button', root).forEach(x => x.classList.toggle('on', x === b)); renderNotice(true); }));
  $('#tmCopy', root).addEventListener('click', () => {
    const { back } = vac(); const n = notice(S.lang, S.reason, S.from, S.to, back, S.pickup === 'pause');
    const txt = `【${n.title}】${n.shop}\n${n.body}`;
    try { navigator.clipboard && navigator.clipboard.writeText(txt).catch(() => {}); } catch { /* ignore */ }
    toast('公告文字已複製', '可以貼到 Instagram、Facebook 或其他地方', { icon: icon('check', 18) });
  });
  // 急件
  $$('#tmRules input[type=checkbox]', root).forEach(c => c.addEventListener('change', () => { S.urgent[c.dataset.u] = c.checked; renderPlanDetails(); }));
  $('#tmAmt', root).addEventListener('change', (e) => { S.bigAmt = Math.max(1000, Math.round((+e.target.value || 10000) / 1000) * 1000); e.target.value = S.bigAmt; renderPlanDetails(); });
  $('#tmSim', root).addEventListener('click', runSim);
  $('#tmRegen', root).addEventListener('click', () => renderBack(true));
  // 勿擾
  $('#tmQuietOn', root).addEventListener('change', (e) => { S.quietOn = e.target.checked; renderQuiet(true); toast(S.quietOn ? '勿擾時段已開啟' : '勿擾時段已關閉', S.quietOn ? `${hh(S.quiet.s)}–${hh(S.quiet.e)} 只有急件才會打擾你` : '所有訊息都會即時通知你', { icon: S.quietOn ? MOON(18) : icon('bell', 18), kind: S.quietOn ? 'ok' : 'warn' }); });
  $('#tmQs', root).addEventListener('change', (e) => { S.quiet.s = +e.target.value; renderQuiet(true); });
  $('#tmQe', root).addEventListener('change', (e) => { S.quiet.e = +e.target.value; renderQuiet(true); });
  $$('#tmWd button', root).forEach(b => b.addEventListener('click', () => {
    const w = +b.dataset.w; S.quiet.off.has(w) ? S.quiet.off.delete(w) : S.quiet.off.add(w);
    renderQuiet(true); renderCare();
  }));
  // 工時
  $$('#tmHView button', root).forEach(b => b.addEventListener('click', () => { S.view = b.dataset.v; $$('#tmHView button', root).forEach(x => x.classList.toggle('on', x === b)); renderHealth(); }));
  // 代理人
  $$('#tmPx button', root).forEach(b => b.addEventListener('click', () => { S.proxy = b.dataset.p; $$('#tmPx button', root).forEach(x => x.classList.toggle('on', x === b)); renderProxy(); }));
  $$('#tmNotify button', root).forEach(b => b.addEventListener('click', () => { S.notify = b.dataset.n; $$('#tmNotify button', root).forEach(x => x.classList.toggle('on', x === b)); }));
  $('#tmWait', root).addEventListener('change', (e) => { S.wait = +e.target.value; });
  $('#tmInvite', root).addEventListener('click', () => {
    const name = $('#tmPxName', root).value.trim() || '代理人';
    const via = { line: 'LINE', sms: '簡訊', call: '電話' }[S.notify];
    toast(`已傳送邀請給 ${name}`, `對方用 ${via} 確認後生效・權限唯讀・未讀 ${S.wait} 分鐘才會通知（示範）`, { icon: icon('send', 18) });
    gsap.fromTo('#tmInvite', { scale: 0.94 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
  });
  $('#tmTest', root).addEventListener('click', testPing);
}

function datesChanged() {
  renderEst(true); renderPlanDetails(); renderNotice(); renderBack();
  if (S.on) { $('#tmSwSub', root).textContent = swSub(); toast('休假日期已更新', `${md(S.from)}–${md(S.to)}，公告、出貨日與供應商通知都已同步`, { icon: icon('calendar', 18) }); }
}
const swSub = () => `${md(S.from)}–${md(S.to)} 休假中，${md(vac().back)} 回來・AI 顧店中`;

function renderEst(anim) {
  const { days, est } = vac();
  $('#tmDays', root).textContent = days;
  $('#tmEstRange', root).textContent = `${md(S.from)}–${md(S.to)}・共 ${days} 天`;
  if (anim) { countUp($('#tmEstMsg', root), est.msgs); countUp($('#tmEstOrd', root), est.ord); }
  else { $('#tmEstMsg', root).textContent = est.msgs.toLocaleString(); $('#tmEstOrd', root).textContent = est.ord.toLocaleString(); }
  $('#tmEstYou', root).textContent = `${est.lo}–${est.hi}`;
}
function renderPlanDetails() {
  PLAN.forEach(p => { const d = $(`[data-d="${p.id}"]`, root); if (d) d.innerHTML = planDetail(p.id); });
}

async function setVacation(on) {
  S.on = on;
  const tok = ++runTok;
  const sw = $('#tmSwitch', root), hero = $('#tmVac', root);
  sw.classList.toggle('on', on); sw.setAttribute('aria-checked', on ? 'true' : 'false');
  hero.classList.toggle('on', on);
  $('#tmSwState', root).textContent = on ? '休假模式：開啟中' : '休假模式：關閉';
  const steps = $$('.tm-step', root);
  if (!on) {
    steps.forEach(li => { li.classList.remove('run', 'done'); li.classList.add('idle'); });
    $('#tmProg', root).textContent = '0/7';
    $('#tmPlanSub', root).textContent = '尚未開啟・每一項都可以再調整';
    $('#tmSwSub', root).textContent = '選好日期，按一下就能放心休息';
    toast('歡迎回來！', '休假模式已關閉，公告已下架、出貨與門市恢復正常', { icon: SUN(18), kind: 'info' });
    return;
  }
  $('#tmSwSub', root).textContent = swSub();
  $('#tmPlanSub', root).textContent = 'AI 正在幫你安排⋯';
  gsap.fromTo(sw.querySelector('i'), { scale: 0.7 }, { scale: 1, duration: 0.6, ease: 'back.out(3)' });
  steps.forEach(li => { li.classList.remove('run', 'done'); li.classList.add('idle'); });
  for (let i = 0; i < steps.length; i++) {
    if (tok !== runTok) return;
    const li = steps[i];
    li.classList.remove('idle'); li.classList.add('run');
    await sleep(520);
    if (tok !== runTok) return;
    li.classList.remove('run'); li.classList.add('done');
    gsap.fromTo($('.tm-ok', li), { scale: 0, rotate: -90 }, { scale: 1, rotate: 0, duration: 0.45, ease: 'back.out(2.6)' });
    gsap.fromTo($('.tm-step-d', li), { opacity: 0, y: -4 }, { opacity: 1, y: 0, duration: 0.35 });
    $('#tmProg', root).textContent = `${i + 1}/7`;
  }
  const { est } = vac();
  $('#tmPlanSub', root).textContent = `都安排好了，安心休息吧！預估只有 ${est.lo}–${est.hi} 件需要你`;
  toast('休假模式已開啟', `${md(S.from)}–${md(S.to)} 由 AI 顧店，只有急件才會通知你`, { icon: MOON(18) });
}

function renderNotice(anim) {
  const { back } = vac();
  const n = notice(S.lang, S.reason, S.from, S.to, back, S.pickup === 'pause');
  const pv = $('#tmPv', root);
  pv.className = 'tm-pv ' + S.chan;
  if (S.chan === 'web') {
    pv.innerHTML = `
      <div class="tm-br"><i></i><i></i><i></i><span>amei-dessert.tw</span></div>
      <div class="tm-site">
        <div class="tm-banner"><span class="tm-bn-ic">${MOON(18)}</span><div><b>${esc(n.title)}</b><p>${esc(n.body)}</p></div></div>
        <div class="tm-site-body"><div class="tm-site-logo">${esc(n.shop)}</div><div class="tm-site-ph"><i></i><i></i><i></i></div></div>
      </div>`;
  } else {
    pv.innerHTML = `
      <div class="tm-lhead"><span class="tm-lav">${esc(AVATAR)}</span><b>${esc(n.shop)}</b><small>官方帳號</small></div>
      <div class="tm-lbody">
        <div class="tm-lmsg"><span class="tm-lav sm">${esc(AVATAR)}</span><div class="tm-lbub"><b>【${esc(n.title)}】</b>${esc(n.body)}</div><time>${fmtTime(new Date())}</time></div>
        <div class="tm-lcard"><b>${icon('calendar', 13)} ${md(S.from)}–${md(S.to)}</b><span>${S.pickup === 'pause' ? '門市取貨暫停' : `可預約 ${md(back)} 之後`}</span></div>
      </div>`;
  }
  if (anim) gsap.fromTo(pv.children, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.06 });
}

function renderBack(anim) {
  const { days, back, est } = vac();
  const nShip = est.ship;
  $('#tmBackWhen', root).textContent = `${md(S.to)} 20:00 自動產生`;
  $('#tmBackLead', root).innerHTML = `休假 ${days} 天，AI 預估處理 <b>${est.msgs.toLocaleString()}</b> 則訊息、<b>${est.ord}</b> 筆訂單。${md(back)} 回來後，你只需要看這幾件：`;
  const todo = [
    { p: 'hi', t: `2 位客人想跟你本人討論${CUSTOM_TXT}`, s: 'AI 已先收訂金、記下需求與日期' },
    { p: 'hi', t: '1 筆退款等你按同意（NT$ 580）', s: '客人已附照片，AI 已先致歉' },
    { p: 'mid', t: `確認 ${nShip} 筆延後宅配的出貨順序`, s: `AI 已依下單時間排好，${md(back)} 一早可直接印託運單` },
    { p: 'low', t: `確認${SUPPLIERS[0].name} ${md(back)} 恢復送貨的數量`, s: 'AI 依預估銷量建議了數量' },
  ];
  $('#tmTodo', root).innerHTML = todo.map((x, i) => `<li class="${x.p}"><label class="tm-cb"><input type="checkbox" data-i="${i}"><i>${icon('check', 12)}</i></label><div><b>${x.t}</b><small>${x.s}</small></div><span class="tm-pri">${{ hi: '優先', mid: '本週', low: '有空再看' }[x.p]}</span></li>`).join('');
  const inv = Math.round(est.ord * 1.0);
  $('#tmDone', root).innerHTML = [`回覆 ${est.msgs.toLocaleString()} 則訊息`, `開立 ${inv} 張發票`, `入帳＋對帳 ${inv} 筆`, '營業稅資料已歸檔', `${SUPPLIERS.length} 家供應商已通知`].map(t => `<span>${icon('check', 12)} ${t}</span>`).join('');
  $$('#tmTodo input', root).forEach(c => c.addEventListener('change', () => {
    c.closest('li').classList.toggle('ok', c.checked);
    if ($$('#tmTodo input', root).every(x => x.checked)) toast('全部處理完了！', '回來第一天就上軌道，辛苦了', { icon: icon('heart', 18) });
  }));
  if (anim) {
    gsap.fromTo($$('#tmTodo li', root), { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: 0.4, stagger: 0.09 });
    gsap.fromTo($$('#tmDone span', root), { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.3, stagger: 0.05, delay: 0.35 });
  }
}

async function runSim() {
  const tok = ++simTok;
  const feed = $('#tmFeed', root), sum = $('#tmSimSum', root);
  feed.innerHTML = ''; sum.hidden = true;
  const btn = $('#tmSim', root); btn.disabled = true;
  let ai = 0, urg = 0, held = 0;
  for (const m of DAY_SIM) {
    if (tok !== simTok) { btn.disabled = false; return; }
    const isUrgent = m.kind === 'urgent' && (m.rule === 'allergy' || S.urgent[m.rule]) && !(m.rule === 'big' && 19200 <= S.bigAmt);
    const isB2BUrgent = m.rule === 'b2b' && S.urgent.b2b;
    const push = isUrgent || isB2BUrgent;
    if (push) urg++; else if (m.kind === 'urgent') held++; else ai++;
    const li = el(`<li class="${push ? 'urgent' : ''}">
      <time>${m.t}</time><span class="chdot ch-${m.ch}">${CH_TXT[m.ch]}</span>
      <div><b>${esc(m.who)}</b><p>${esc(m.msg)}</p><small>${push ? icon('bell', 12) + ' 推播給你・' : icon('bot', 12) + ' '}${esc(m.ai)}${!push && m.kind === 'urgent' ? '（規則已關閉，回來再處理）' : ''}</small></div>
      <span class="tm-tag">${push ? '急件' : 'AI 處理'}</span></li>`);
    feed.appendChild(li);
    gsap.fromTo(li, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35 });
    feed.scrollTop = feed.scrollHeight;
    await sleep(620);
  }
  btn.disabled = false;
  sum.hidden = false;
  sum.innerHTML = `${icon('sparkle', 14)} 這一天 <b>${DAY_SIM.length}</b> 則訊息，AI 處理 <b>${ai + held}</b> 則，只有 <b>${urg}</b> 件需要你看一眼。`;
  gsap.fromTo(sum, { opacity: 0 }, { opacity: 1, duration: 0.4 });
}

function arc(cx, cy, r, h0, h1) {
  const a = (h) => (h / 24) * Math.PI * 2 - Math.PI / 2;
  let span = (h1 - h0 + 24) % 24; if (span === 0) span = 24;
  const x0 = cx + r * Math.cos(a(h0)), y0 = cy + r * Math.sin(a(h0));
  const x1 = cx + r * Math.cos(a(h0 + span)), y1 = cy + r * Math.sin(a(h0 + span));
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${span > 12 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}
function renderQuiet(anim) {
  const q = S.quiet, on = S.quietOn;
  const span = (q.e - q.s + 24) % 24;
  const now = new Date(), nh = now.getHours() + now.getMinutes() / 60;
  const na = (nh / 24) * Math.PI * 2 - Math.PI / 2;
  const ticks = Array.from({ length: 24 }, (_, h) => { const a = (h / 24) * Math.PI * 2 - Math.PI / 2, r0 = h % 6 ? 74 : 70; return `<line x1="${(100 + r0 * Math.cos(a)).toFixed(1)}" y1="${(100 + r0 * Math.sin(a)).toFixed(1)}" x2="${(100 + 78 * Math.cos(a)).toFixed(1)}" y2="${(100 + 78 * Math.sin(a)).toFixed(1)}"/>`; }).join('');
  const labels = [[0, '0'], [6, '6'], [12, '12'], [18, '18']].map(([h, t]) => { const a = (h / 24) * Math.PI * 2 - Math.PI / 2; return `<text x="${(100 + 60 * Math.cos(a)).toFixed(1)}" y="${(100 + 60 * Math.sin(a) + 4).toFixed(1)}">${t}</text>`; }).join('');
  $('#tmDial', root).innerHTML = `<svg viewBox="0 0 200 200" class="${on ? '' : 'off'}">
    <defs><linearGradient id="tmQg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7C62E6"/><stop offset="1" stop-color="#2E97D4"/></linearGradient></defs>
    <circle cx="100" cy="100" r="88" class="tm-d-bg"/>
    <path d="${arc(100, 100, 88, q.e, q.s)}" class="tm-d-day"/>
    <path d="${arc(100, 100, 88, q.s, q.e)}" class="tm-d-q" id="tmArc"/>
    <g class="tm-d-tk">${ticks}</g><g class="tm-d-lb">${labels}</g>
    <circle cx="${(100 + 88 * Math.cos(na)).toFixed(1)}" cy="${(100 + 88 * Math.sin(na)).toFixed(1)}" r="6" class="tm-d-now"/>
    <text x="100" y="94" class="tm-d-big">${on ? `${span} 小時` : '關閉中'}</text>
    <text x="100" y="114" class="tm-d-sm">${hh(q.s)} – ${hh(q.e)}</text>
  </svg>`;
  if (anim) { const p = $('#tmArc', root); if (p && p.getTotalLength) { const L = p.getTotalLength(); gsap.fromTo(p, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: 0.8, ease: 'power2.out', clearProps: 'strokeDasharray,strokeDashoffset' }); } }
  $('#tmQeTxt', root).textContent = hh(q.e);
  $$('#tmWd button', root).forEach(b => b.classList.toggle('on', q.off.has(+b.dataset.w)));
  $('#tmQuiet', root).classList.toggle('off', !on);
  const b = on ? blocked(wm, q) : { night: 0, off: 0, total: 0 };
  if (anim) countUp($('#tmBlk', root), b.night); else $('#tmBlk', root).textContent = b.night;
  $('#tmBlkSub', root).textContent = !on ? '勿擾時段關閉中，所有訊息都會即時通知你' : b.off ? `另外店休日 AI 顧店接住 ${b.off} 則，你都不用回` : `都由 AI 回覆，你一則都沒被吵醒`;
  const nights = wm.night.filter(o => { const h = new Date(o.ts).getHours(); return on && (h >= q.s || h < q.e); }).slice(0, 4).map(nightSample);
  const lastNight = wm.grid[6].reduce((t, n, h) => t + (h < q.e ? n : 0), 0) + wm.grid[5].reduce((t, n, h) => t + (h >= q.s ? n : 0), 0);
  const lastOrd = wm.night.filter(o => { const d = new Date(o.ts), h = d.getHours(); return (h >= q.s && +startOfDay(d) === +wm.days[5]) || (h < q.e && +startOfDay(d) === +wm.days[6]); }).length;
  $('#tmDigest', root).innerHTML = on ? `<span class="tm-dg-ic">${SUN(16)}</span><div><b>每天 ${hh(q.e)} 的早安摘要（今天這份）</b><p>昨晚 AI 回覆了 <em>${lastNight}</em> 則訊息、成立 <em>${lastOrd}</em> 筆訂單，<em>0</em> 件急件。睡得好嗎？今天也加油！</p></div>` : '';
  $('#tmNights', root).innerHTML = nights.length ? nights.map(n => `<li><time>${md(n.t)} ${fmtTime(n.t)}</time><span class="chdot ch-${n.ch}">${CH_TXT[n.ch]}</span><div><b>${esc(n.who)}</b><small>${esc(n.text)}</small></div><em>${icon('check', 12)} ${esc(n.done)}</em></li>`).join('') : '';
}

function renderHealth() {
  if (!healthChart) return;
  const days = ww.days;
  const ylab = days.map(d => `週${WD[d.wd]} ${md(d.date)}`);
  if (S.view === 'heat') {
    const hours = Array.from({ length: 20 }, (_, i) => i + 6);
    const data = [];
    const cell = (m, h) => {
      if (!m) return 'rgba(255,255,255,0.035)';
      const a = 0.25 + (m / 60) * 0.75;
      return h >= 22 ? `rgba(160,132,255,${a})` : h >= 20 ? `rgba(240,165,49,${a})` : `rgba(45,182,116,${a})`;
    };
    days.forEach((d, di) => d.mins.forEach((m, hi) => data.push({ value: [hi, di, m], itemStyle: { color: cell(m, hours[hi]) } })));
    healthChart.setOption({
      animationDuration: 900,
      grid: { left: 4, right: 10, top: 28, bottom: 4, containLabel: true },
      legend: { show: false },
      graphic: [['白天', '#2DB674'], ['晚上 20–22 點', '#F0A531'], ['深夜 22 點後', '#a084ff']].map(([t, c], i) => ({ type: 'group', left: i * 104, top: 2, children: [
        { type: 'rect', shape: { x: 0, y: 3, width: 10, height: 10, r: 3 }, style: { fill: c } },
        { type: 'text', style: { x: 15, y: 2, text: t, fill: 'rgba(214,240,226,0.72)', fontSize: 11 } }] })),
      tooltip: { formatter: p => `${ylab[p.value[1]]} ${hh(hours[p.value[0]])}<br/><b>工作 ${p.value[2]} 分鐘</b>${hours[p.value[0]] >= 22 ? '<br/>深夜時段' : ''}` },
      xAxis: { type: 'category', data: hours.map(h => (h % 24) + '時'), axisLabel: { fontSize: 10, interval: 1 }, splitArea: { show: false } },
      yAxis: { type: 'category', data: ylab, axisLabel: { fontSize: 11 } },
      series: [{ type: 'heatmap', data, itemStyle: { borderRadius: 3, borderColor: 'rgba(6,26,19,.9)', borderWidth: 2 },
      }],
    }, true);
  } else {
    healthChart.setOption({
      animationDuration: 900,
      grid: { left: 4, right: 10, top: 30, bottom: 4, containLabel: true },
      legend: { top: 0, right: 0, itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 11 } },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: v => v + ' 小時' },
      xAxis: { type: 'category', data: days.map(d => `週${WD[d.wd]}\n${md(d.date)}`), axisLabel: { fontSize: 11 } },
      yAxis: { type: 'value', axisLabel: { formatter: '{value}h' } },
      series: [
        { name: '白天', type: 'bar', stack: 'w', barWidth: '46%', data: days.map(d => +d.day.toFixed(2)), itemStyle: { color: '#2DB674' } },
        { name: '晚上 20–22 點', type: 'bar', stack: 'w', data: days.map(d => +d.eve.toFixed(2)), itemStyle: { color: '#F0A531' } },
        { name: '深夜 22 點後', type: 'bar', stack: 'w', data: days.map(d => +d.night.toFixed(2)), itemStyle: { color: '#7C62E6', borderRadius: [5, 5, 0, 0] },
          markLine: { silent: true, symbol: 'none', lineStyle: { color: '#EC6A55', type: 'dashed' }, label: { color: '#ffb3a6', formatter: '建議 8 小時', position: 'insideStartTop' }, data: [{ yAxis: 8 }] } },
      ],
    }, true);
  }
}

function renderCare() {
  const care = $('#tmCare', root);
  const eveH = ww.days.reduce((s, d) => s + d.eve, 0);
  const offAvg = S.quiet.off.size ? (ww.total / 7) * S.quiet.off.size * 0.8 : 0;
  const nextWeek = Math.round((ww.total - ww.nightH - eveH - offAvg) * 10) / 10;
  if (ww.total <= 60) { care.innerHTML = `<div class="tm-care-ok">${icon('check', 16)} 這週工時在健康範圍內，繼續保持！</div>`; return; }
  const sugg = [
    { id: 'night', ic: MOON(15), t: '深夜訊息交給 AI 店員', s: `你有 ${ww.nightCount} 個晚上在 22 點後回訊息`, save: ww.nightH, done: S.quietOn, act: S.quietOn ? '已開啟勿擾' : '開啟勿擾' },
    { id: 'auto', ic: icon('wand', 15), t: '晚上的記帳、對帳改成自動化', s: '收款、發票、入帳一次串好', save: Math.round(eveH * 10) / 10, act: '去設定' },
    { id: 'off', ic: icon('calendar', 15), t: '每週固定休一天', s: `已經連續工作 ${ww.streak} 天了`, save: Math.round((ww.total / 7) * 0.8 * 10) / 10, done: S.quiet.off.size > 0, act: S.quiet.off.size ? '已設定店休' : '設週一店休' },
  ];
  care.innerHTML = `
    <div class="tm-care-box">
      <div class="tm-care-h"><span>${icon('heart', 16)}</span><div><b>${OWNER}，這 7 天你工作了 ${ww.total} 小時</b><p>比一般上班族的 40 小時多了一半以上。身體是公司最重要的資產，有些事可以放心交給 AI。</p></div></div>
      <ul class="tm-sugg">${sugg.map(x => `<li class="${x.done ? 'done' : ''}"><span class="tm-sg-ic">${x.ic}</span><div><b>${x.t}</b><small>${x.s}・每週約省 ${x.save} 小時</small></div><button class="btn btn-ghost btn-sm" data-sg="${x.id}" ${x.done ? 'disabled' : ''}>${x.done ? icon('check', 13) : ''}${x.act}</button></li>`).join('')}</ul>
      <div class="tm-care-f"><span>全部採用後，下週預估約 <b>${nextWeek}</b> 小時</span><button class="btn btn-primary btn-sm" id="tmGoAuto">${icon('wand', 14)} 前往自動化中心</button></div>
    </div>`;
  $('#tmGoAuto', care).addEventListener('click', () => go('auto'));
  $$('[data-sg]', care).forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.sg;
    if (id === 'auto') { go('auto'); return; }
    if (id === 'night') { S.quietOn = true; $('#tmQuietOn', root).checked = true; renderQuiet(true); toast('勿擾時段已開啟', `${hh(S.quiet.s)}–${hh(S.quiet.e)} 的訊息交給 AI`, { icon: MOON(18) }); }
    if (id === 'off') { S.quiet.off.add(0); renderQuiet(true); toast('已設定每週一店休', '週一整天由 AI 顧店，只有急件才會找你', { icon: icon('calendar', 18) }); }
    renderCare();
    $('#tmQuiet', root).scrollIntoView({ behavior: 'smooth', block: 'center' });
  }));
}

function renderSaved() {
  if (!savedChart) return;
  savedChart.setOption({
    animationDuration: 1200,
    tooltip: { trigger: 'item', formatter: p => `${p.marker}${p.name}<br/><b>${p.value} 小時</b>（${p.percent}%）` },
    title: { text: hLabel(sv.total), subtext: '小時／7 天', left: 'center', top: '40%', textStyle: { fontSize: 26, color: '#eafff4', fontWeight: 800 }, subtextStyle: { color: 'rgba(214,240,226,0.6)', fontSize: 11 }, itemGap: 2 },
    series: [{ type: 'pie', radius: ['60%', '84%'], center: ['50%', '50%'], padAngle: 2, itemStyle: { borderRadius: 6 }, label: { show: false },
      emphasis: { scale: true, scaleSize: 6 }, data: sv.rows.map(r => ({ name: r.name, value: r.h, itemStyle: { color: r.color } })) }],
  });
  savedChart.on('mouseover', (p) => { $$('#tmSList li', root).forEach((li, i) => li.classList.toggle('hl', i === p.dataIndex)); });
  savedChart.on('mouseout', () => { $$('#tmSList li', root).forEach(li => li.classList.remove('hl')); });
}

function renderProxy() {
  const p = PROXIES.find(x => x.id === S.proxy);
  $('#tmPxName', root).value = p.name; $('#tmPxRel', root).value = p.rel; $('#tmPxPhone', root).value = p.phone;
  $('#tmPing', root).hidden = true;
}

async function testPing() {
  const name = $('#tmPxName', root).value.trim() || '代理人';
  const ping = $('#tmPing', root);
  ping.hidden = false;
  ping.innerHTML = `
    <div class="tm-ping-steps">
      <span data-s="0">${icon('bot', 13)} AI 先安撫客人</span>
      <span data-s="1">${icon('bell', 13)} 推播給${OWNER}</span>
      <span data-s="2">${icon('clock', 13)} ${S.wait} 分鐘未讀</span>
      <span data-s="3">${icon('users', 13)} 通知 ${esc(name)}</span>
    </div>
    <div class="tm-phone"><div class="tm-ph-top"><b>GreenUP</b><small>現在</small></div>
      <b>【急件・示範】${esc(OWNER)}休假中，需要協助</b>
      <p>${esc(URGENT_PING)}</p>
      <small>${icon('lock', 11)} 你的權限：唯讀・不能退款或修改訂單</small></div>`;
  const steps = $$('.tm-ping-steps span', ping);
  gsap.set($('.tm-phone', ping), { opacity: 0, y: 14 });
  for (let i = 0; i < steps.length; i++) { await sleep(380); steps[i].classList.add('on'); }
  gsap.to($('.tm-phone', ping), { opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.8)' });
  toast(`測試通知已送到 ${name}`, '這是測試，不會真的發送', { icon: icon('bell', 18), kind: 'info' });
}
