// 自動化報稅：營利事業所得稅、扣繳與二代健保、稅務行事曆（試算／示範）
import { $, $$, gsap, money, fmtDate, countUp, toast } from '../util.js';
import { icon } from '../icons.js';
import { makeChart } from '../charts.js';
import { month, monthList, annualEstimate, withholdings, taxCalendar, RATES } from '../ledger.js';
import { TENANT, TENANT_ID } from '../tenant.js';
const TX_AMEI = TENANT_ID === 'amei';
const TX_EQUIP = TX_AMEI ? '烘焙設備' : (TENANT.fixed?.equip || '營業設備');

const n0 = (v) => Math.round(v).toLocaleString('en-US');
let citChart = null;

export function renderExtra(kind, pane) {
  if (kind === 'cit') cit(pane);
  else if (kind === 'wh') wh(pane);
  else cal(pane);
}

function cit(pane) {
  const e = annualEstimate();
  const roc = new Date().getFullYear() - 1911;
  const rdYear = monthList().filter(x => !x.current).map(x => month(x.y, x.m).rd).reduce((a, b) => a + b, 0) / 2 * 12;
  const credit = Math.min(Math.round(rdYear * 0.15), Math.round(e.tax * 0.3));
  const final = Math.max(0, e.tax - credit);
  pane.innerHTML = `
    <div class="glass tax-head">
      <div class="th-l">
        <span class="demo-badge">${icon('alert', 14)} 試算／示範・非正式申報</span>
        <h2>${roc} 年度營利事業所得稅（結算申報試算）</h2>
        <p>AI 依帳載收入、成本與費用推估全年課稅所得，並自動套用稅率 20%、起徵額 12 萬元與研發投資抵減。正式申報期間為次年 5 月 1 日至 5 月 31 日，申報前由會計師或記帳士複核。</p>
      </div>
      <div class="cit-rate"><b id="citEff">0</b><span>有效稅率</span></div>
    </div>
    <div class="cit-flow">
      ${[['全年營業收入', e.rev, '#2DB674', ''], ['營業成本', e.cost, '#5EE0C4', '−'], ['營業費用', e.opex, '#F0A531', '−'], ['營業外收入', e.other, '#2E97D4', '＋'], ['課稅所得', e.income, '#7C62E6', '＝']].map(([t, v, c, op], i) => `${op ? `<div class="op">${op}</div>` : ''}<div class="glass teq" style="--c:${c}"><small>${t}</small><b data-cit="${i}">0</b></div>`).join('')}
    </div>
    <div class="tax-grid">
      <div class="glass card">
        <div class="card-h"><h3>${icon('percent', 18)} 應納稅額計算</h3><span class="chip-sm">依近兩個完整月推估全年</span></div>
        <table class="f-tbl cit-tbl">
          <tr><td>課稅所得額</td><td class="r">${n0(e.income)}</td></tr>
          <tr><td>× 稅率 20%（所得 12 萬元以下免稅，12–20 萬元以超過部分半數為限）</td><td class="r">${n0(e.tax)}</td></tr>
          <tr><td>− 研發投資抵減（研發支出 ${n0(rdYear)} × 15%，以應納稅額 30% 為限）</td><td class="r">(${n0(credit)})</td></tr>
          <tr><td>− 暫繳稅額（前一年度無應納稅額，免辦暫繳）</td><td class="r">0</td></tr>
          <tr class="tot"><td>本年度應自行繳納稅額（試算）</td><td class="r">NT$ ${n0(final)}</td></tr>
          <tr><td>未分配盈餘加徵 5%（若稅後盈餘全數保留，次年申報）</td><td class="r">${n0(e.undistributed)}</td></tr>
        </table>
        <div class="chart" id="cCit" style="min-height:200px"></div>
      </div>
      <div class="glass card">
        <div class="card-h"><h3>${icon('shield', 18)} AI 帳務與稅務檢核</h3><span class="chip-sm">${7} 項通過</span></div>
        <ul class="checks cit-checks">
          ${[
            `交際費全年約 ${n0(e.entertain)} 元，未超過限額 ${n0(e.entertainLimit)} 元（銷貨淨額 4.5‰）`,
            TX_AMEI ? '烘焙設備依固定資產耐用年數表 5 年提列折舊' : `${TX_EQUIP}依固定資產耐用年數表提列折舊（年限以會計師確認為準）`,
            '店面租金已扣繳 10% 並繳納二代健保補充保費，扣繳憑單（51）將於 1 月自動產生',
            '薪資、董事酬勞已入帳且有薪資單；勞健保、勞退提繳與繳款單一致',
            '進項發票皆有統一編號，與電子發票平台比對無異常（模擬）',
            `研發支出 ${n0(rdYear)} 元已分類並保留檢驗、設計憑證，可申請研發投資抵減`,
            '申報書（營所稅結算申報書）草稿於次年 4 月自動產生，交會計師／記帳士複核',
          ].map(t => `<li>${icon('check', 14)}${t}</li>`).join('')}
        </ul>
        <div class="callout-mini">${icon('sparkle', 14)} 建議：預估全年稅前淨利 ${money(e.income)}，若年底前購置${TX_AMEI ? '節能烤箱，可依法提列折舊並評估適用節能設備投資抵減。' : `節能${TX_EQUIP}，可依法提列折舊並評估適用節能設備投資抵減（以主管機關公告與會計師意見為準）。`}</div>
      </div>
    </div>`;
  [e.rev, e.cost, e.opex, e.other, e.income].forEach((v, i) => countUp($(`[data-cit="${i}"]`, pane), v, { prefix: 'NT$ ', from: 0 }));
  countUp($('#citEff', pane), e.income ? final / e.income * 100 : 0, { suffix: '%', decimals: 1, from: 0 });
  if (citChart) { try { citChart.dispose(); } catch { /* ignore */ } }
  citChart = makeChart($('#cCit', pane));
  citChart.setOption({
    tooltip: { trigger: 'item', valueFormatter: v => money(v) },
    series: [{ type: 'pie', radius: ['48%', '76%'], center: ['50%', '54%'], startAngle: 180, endAngle: 360, itemStyle: { borderRadius: 6, borderColor: '#061a13', borderWidth: 2 }, label: { color: '#e6fff2', fontSize: 11, formatter: '{b}\n{d}%' },
      data: [
        { name: '營業成本', value: e.cost, itemStyle: { color: '#5EE0C4' } },
        { name: '營業費用', value: e.opex, itemStyle: { color: '#F0A531' } },
        { name: '所得稅', value: final, itemStyle: { color: '#EC6A55' } },
        { name: '稅後淨利', value: Math.max(0, e.income - final), itemStyle: { color: '#7C62E6' } },
      ] }],
  });
}

function wh(pane) {
  const ms = monthList().filter(x => !x.current);
  const last = ms[ms.length - 1];
  const d = month(last.y, last.m);
  const rows = withholdings(d);
  const taxSum = rows.reduce((s, r) => s + r.tax, 0), nhiSum = rows.reduce((s, r) => s + r.nhi, 0);
  const now = new Date();
  const due = new Date(now.getFullYear(), last.m, 10, 23, 59);
  const left = Math.ceil((due - now) / 864e5);
  pane.innerHTML = `
    <div class="glass tax-head">
      <div class="th-l">
        <span class="demo-badge">${icon('alert', 14)} 試算／示範・非正式申報</span>
        <h2>${last.m} 月扣繳稅款與二代健保補充保費</h2>
        <p>付款給個人房東、接案設計師或發薪時，AI 自動判斷所得類別、扣繳率與補充保費（費率 ${(RATES.nhiSupp * 100).toFixed(2)}%），產生繳款書並於次年 1 月自動申報扣繳憑單。</p>
      </div>
      <div class="wh-due ${left < 0 ? 'done' : ''}"><b>${left < 0 ? '已繳' : left}</b><span>${left < 0 ? '已於期限內繳納' : `天後截止（${fmtDate(due)}）`}</span></div>
    </div>
    <div class="tax-eq wh-eq">
      <div class="glass teq" style="--c:var(--sky)"><small>代扣所得稅</small><b id="whT">0</b><span>扣繳率依所得類別</span></div>
      <div class="op">＋</div>
      <div class="glass teq" style="--c:var(--violet)"><small>二代健保補充保費</small><b id="whN">0</b><span>單次給付達 2 萬元</span></div>
      <div class="op">＝</div>
      <div class="glass teq total" style="--c:var(--amber)"><small>本月應繳納合計</small><b id="whS">0</b><span>次月 10 日前繳納</span></div>
    </div>
    <div class="glass card">
      <div class="card-h"><h3>${icon('receipt', 18)} 扣繳明細</h3><span class="chip-sm">AI 自動判斷所得類別</span></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>給付項目</th><th>所得人</th><th class="r">給付金額</th><th>扣繳規定</th><th class="r">扣繳稅額</th><th class="r">補充保費</th><th>扣繳憑單</th></tr></thead>
      <tbody>${rows.map(r => `<tr><td><b>${r.item}</b></td><td>${r.who}</td><td class="r">${n0(r.base)}</td><td>${r.rate}</td><td class="r">${r.tax ? n0(r.tax) : '—'}</td><td class="r">${r.nhi ? n0(r.nhi) : '—'}</td><td>${r.form}</td></tr>`).join('')}
      <tr class="tot"><td>合計</td><td></td><td class="r">${n0(rows.reduce((s, r) => s + r.base, 0))}</td><td></td><td class="r">${n0(taxSum)}</td><td class="r">${n0(nhiSum)}</td><td></td></tr></tbody></table></div>
      <div class="f-actions"><button class="btn btn-primary" id="whGo">${icon('file', 18)} 產生繳款書（模擬）</button><small>勞務報酬單次 12,000 元未達 2 萬元，免扣補充保費；薪資未達起扣標準免扣繳，年底仍開立免扣繳憑單。</small></div>
    </div>`;
  countUp($('#whT', pane), taxSum, { prefix: 'NT$ ', from: 0 });
  countUp($('#whN', pane), nhiSum, { prefix: 'NT$ ', from: 0 });
  countUp($('#whS', pane), taxSum + nhiSum, { prefix: 'NT$ ', from: 0 });
  $('#whGo', pane).addEventListener('click', (ev) => {
    toast('繳款書已產生（模擬）', `扣繳稅款 ${money(taxSum)}、補充保費 ${money(nhiSum)}，已排入 ${fmtDate(due)} 前扣款`, { icon: icon('check', 18) });
    gsap.fromTo(ev.currentTarget, { scale: 0.94 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
  });
}

function cal(pane) {
  const now = new Date();
  const list = taxCalendar(now.getFullYear());
  const next = list.filter(x => x.d >= now);
  const K = { vat: ['營業稅', '#2DB674'], cit: ['營所稅', '#7C62E6'], wh: ['扣繳', '#2E97D4'] };
  const yStart = new Date(now.getFullYear(), 0, 1), yEnd = new Date(now.getFullYear() + 1, 0, 1);
  const pos = (d) => ((d - yStart) / (yEnd - yStart) * 100).toFixed(2);
  pane.innerHTML = `
    <div class="glass card cal-card">
      <div class="card-h"><h3>${icon('calendar', 18)} ${now.getFullYear() - 1911} 年稅務行事曆</h3><span class="chip-sm">AI 會在截止前 7 天、3 天提醒</span></div>
      <div class="cal-line">
        <div class="cal-months">${Array.from({ length: 12 }, (_, i) => `<span>${i + 1} 月</span>`).join('')}</div>
        <div class="cal-track"><i class="cal-now" style="left:${pos(now)}%"><em>今天</em></i>
          ${list.map((x, i) => `<span class="cal-dot ${x.d < now ? 'past' : ''}" style="left:${pos(x.d)}%;--c:${K[x.k][1]};--row:${i % 3}" title="${fmtDate(x.d)} ${x.t}"><b>${x.d.getMonth() + 1}/${x.d.getDate()}</b></span>`).join('')}
        </div>
      </div>
      <div class="cal-legend">${Object.values(K).map(([t, c]) => `<span style="--c:${c}"><i></i>${t}</span>`).join('')}</div>
    </div>
    <div class="cal-next">${next.slice(0, 4).map((x, i) => {
      const days = Math.ceil((x.d - now) / 864e5);
      return `<div class="glass cal-item ${i === 0 ? 'first' : ''}" style="--c:${K[x.k][1]}"><span class="cal-k">${K[x.k][0]}</span><b>${x.t}</b><small>${fmtDate(x.d)}</small><div class="cal-days"><b>${days}</b><span>天</span></div></div>`;
    }).join('')}</div>`;
  gsap.fromTo($$('.cal-dot', pane), { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, stagger: 0.05, duration: 0.5, ease: 'back.out(3)' });
  gsap.fromTo($('.cal-now', pane), { opacity: 0 }, { opacity: 1, duration: 0.8, delay: 0.6 });
}
