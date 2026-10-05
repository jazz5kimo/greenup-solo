// 排班打卡：AI 排班、勞基法檢核、打卡機、請假加班、工時自動算薪（示範資料）
import { store } from '../state.js';
import { $, $$, gsap, esc, money, fmtMD, fmtDate, pad, sleep, countUp, toast, typeText } from '../util.js';
import { icon } from '../icons.js';
import { makeChart } from '../charts.js';
import { startOfDay, addDays } from '../data.js';
import { RATES, PAYROLL } from '../ledger.js';
import {
  DAY_NAMES as DN, H0, H1, wdOf, weekStart, PEOPLE, PERSON, SHIFT_TYPES as ST, CYCLE, brk, workH, hm, mm,
  traffic, draftSchedule, aiSchedule, annualLeaveDays, LEAVE_TIERS, otPay, hourlyBase, genAttendance,
} from '../staff-data.js';

const SPAN = H1 - H0;
const n0 = (v) => Math.round(v).toLocaleString('en-US');
const h1 = (v) => (Math.round(v * 10) / 10).toLocaleString('en-US');
const clone = (w) => w.map(d => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v ? { ...v } : null])));
const LAW = PEOPLE.filter(p => p.law);
const av = (p, cls = '') => `<span class="sf-av ${cls}" style="--c:${p.color}">${esc(p.name.slice(-1))}</span>`;
const pct = (v) => `${(v / SPAN * 100).toFixed(3)}%`;

let root, go, now, ws, todayWd, tr, ai, draft, sched, recs, leaves, aiDone = false, firstShow = true;
let timer = 0, chart, chartMonth = 'prev', recFilter = 'all', selPid = 'yun', busy = false, payTab = 'yun', payDone = false;
const annualUsed = { yun: 5, jie: 1 };

export default {
  mount(section, ctx) {
    root = section; go = ctx && ctx.go;
    now = new Date(); ws = weekStart(now); todayWd = wdOf(now);
    tr = traffic(store.orders, now);
    ai = aiSchedule(tr);
    draft = draftSchedule(tr);
    sched = clone(draft);
    const at = (dd, h, m) => { const x = addDays(startOfDay(now), dd); x.setHours(h, m); return x; };
    leaves = [
      { id: 'L1', pid: 'yun', kind: 'annual', label: '特休', date: addDays(ws, 11), span: '全天（8 小時）', hours: 8, reason: '家人婚禮，需請一天', via: 'LINE 官方帳號', at: at(-1, 21, 14), status: 'pending' },
      { id: 'L2', pid: 'jie', kind: 'personal', label: '事假', date: addDays(ws, 5), span: '13:00–19:00（5.5 小時）', hours: 5.5, reason: '學校期中考，週六下午無法上班', via: 'GreenUP App', at: at(-2, 22, 3), status: 'pending' },
      { id: 'L3', pid: 'yun', kind: 'ot', label: '加班', date: addDays(ws, 4), span: '17:00–19:00（2 小時）', hours: 2, reason: '週末預購單量大，延長烘焙備料', via: 'GreenUP App', at: at(0, 8, 41), status: 'pending' },
      { id: 'L4', pid: 'jie', kind: 'sick', label: '病假', date: addDays(ws, -2), span: '全班（5.5 小時）', hours: 5.5, reason: '感冒就醫（已上傳診斷證明）', via: 'LINE 官方帳號', at: (() => { const x = addDays(ws, -2); x.setHours(9, 12); return x; })(), status: 'ok' },
    ];
    recs = genAttendance(now, ai.week, sched, leaves);
    const def = PEOPLE.find(p => sched[todayWd][p.id] && !todayRec(p.id)?.out);
    selPid = def ? def.id : 'yun';

    section.innerHTML = `
    <div class="sf">
      <div class="glass sf-head anim-in">
        <div class="sf-head-txt">
          <span class="demo-badge">${icon('alert', 14)} 示範資料・勞基法規則簡化</span>
          <h2>班表、打卡、算薪，一條龍自動化</h2>
          <p>AI 讀取全通路訂單的<b>星期 × 小時來客分布</b>自動排班，打卡工時直接彙整成<b>薪資單</b>，同步寫入會計帳務「<b>人</b>」與年度扣繳憑單；每一次排班都先跑過勞基法檢核。</p>
        </div>
        <div class="sf-team">${PEOPLE.map(p => `<div class="sf-mem">${av(p, 'lg')}<div><b>${p.name}</b><small>${esc(p.role)}</small><em>${p.kind === 'owner' ? '負責人' : p.kind === 'full' ? `月薪 ${n0(p.pay)}` : `時薪 ${p.hourly}`}</em></div></div>`).join('')}</div>
      </div>

      <div class="sf-kpis anim-in" id="sfKpis"></div>

      <div class="glass card sf-sched-card anim-in">
        <div class="card-h sf-sch-h">
          <h3>${icon('calendar', 18)} 本週班表 <span class="sf-week">${fmtMD(ws)}（一）– ${fmtMD(addDays(ws, 6))}（日）</span><span class="chip-sm" id="sfSchState"></span></h3>
          <div class="sf-sch-tools">
            <span class="sf-hint">${icon('hang', 14)} 點色塊切換班別・左右拖拉調整時段・點空白處加班</span>
            <button class="btn btn-ghost btn-sm" id="sfReset">${icon('refresh', 14)} 還原草稿</button>
            <button class="btn btn-primary sf-ai-btn" id="sfAI">${icon('wand', 16)} AI 自動排班</button>
          </div>
        </div>
        <div class="sf-legend">${Object.entries(ST).map(([k, t]) => `<span style="--c:${t.color}"><i></i>${t.name} ${hm(t.s)}–${hm(t.e)}<small>${t.desc}</small></span>`).join('')}<span class="sf-lg-curve"><i></i>預估來客曲線（近 8 週訂單）</span></div>
        <div class="sf-sch-body">
          <div class="sf-sched-scroll"><div class="sf-sched" id="sfSched"></div></div>
          <aside class="sf-side" id="sfSide"></aside>
        </div>
      </div>

      <div class="sf-row2">
        <div class="glass card sf-punch-card anim-in">
          <div class="card-h"><h3>${icon('clock', 18)} 打卡機</h3><span class="chip-sm">GPS 範圍＋臉部辨識・防代打卡</span></div>
          <div class="sf-punch">
            <div class="sf-pc-top">
              <div class="sf-clock"><b id="sfClk">--:--:--</b><small id="sfDate"></small></div>
              <div class="sf-who" id="sfWho"></div>
            </div>
            <div class="sf-pc-mid">
              <div class="sf-gps" id="sfGps">${gpsSvg()}<div class="sf-gps-t"><b>${icon('check', 13)} 在店內打卡範圍</b><small>距店 18 公尺・允許 100 公尺內・Wi-Fi AMEI-STORE</small></div></div>
              <div class="sf-face" id="sfFace">${faceSvg()}<div class="sf-face-t" id="sfFaceT">對準鏡頭，按下打卡即開始辨識</div></div>
            </div>
            <div class="sf-pc-btns">
              <button class="sf-pbtn in" id="sfIn"><span>${icon('arrow', 22)}</span><b>上班打卡</b><small id="sfInSub"></small></button>
              <button class="sf-pbtn out" id="sfOut"><span>${icon('check', 22)}</span><b>下班打卡</b><small id="sfOutSub"></small></button>
            </div>
          </div>
        </div>
        <div class="glass card sf-rec-card anim-in">
          <div class="card-h"><h3>${icon('file', 18)} 打卡紀錄（近 7 天）</h3><div class="sf-filt" id="sfRecF">${[['all', '全部'], ...PEOPLE.map(p => [p.id, p.name])].map(([k, t]) => `<button class="seg ${k === recFilter ? 'on' : ''}" data-f="${k}">${t}</button>`).join('')}</div></div>
          <div class="sf-rec-sum" id="sfRecSum"></div>
          <div class="tbl-wrap sf-rec-tbl"><table class="tbl"><thead><tr><th>日期</th><th>人員</th><th>班別</th><th>上班</th><th>下班</th><th class="r">遲到</th><th class="r">工時</th><th>狀態</th></tr></thead><tbody id="sfRecBody"></tbody></table></div>
        </div>
      </div>

      <div class="sf-row3">
        <div class="glass card sf-law-card anim-in">
          <div class="card-h"><h3>${icon('shield', 18)} 勞基法檢核</h3><span class="chip-sm" id="sfLawChip"></span></div>
          <ul class="sf-checks" id="sfChecks"></ul>
        </div>
        <div class="glass card sf-leave-card anim-in">
          <div class="card-h"><h3>${icon('bell', 18)} 請假與加班申請</h3><span class="chip-sm" id="sfLvChip"></span></div>
          <div class="sf-leaves" id="sfLeaves"></div>
          <div class="sf-al-wrap"><div class="sf-sub-h">${icon('sparkle', 14)} 特休天數：依年資自動計算（勞基法 §38）</div><div class="sf-als" id="sfAL"></div></div>
        </div>
      </div>

      <div class="sf-row4">
        <div class="glass card sf-pay-card anim-in">
          <div class="card-h"><h3>${icon('trend', 18)} 工時統計</h3><div class="sf-filt" id="sfMonF"><button class="seg on" data-m="prev">${now.getMonth() === 0 ? 12 : now.getMonth()} 月・已結算</button><button class="seg" data-m="cur">${now.getMonth() + 1} 月・至今</button></div></div>
          <div class="chart sf-chart" id="sfChart"></div>
          <div class="sf-hsum" id="sfHSum"></div>
        </div>
        <div class="glass card sf-slip-card anim-in">
          <div class="card-h"><h3>${icon('receipt', 18)} 工時 → 薪資單</h3><span class="chip-sm">${prevMonthLabel()} 薪資・${fmtMD(payday())} 發薪</span></div>
          <div class="sf-slip-host" id="sfSlipHost"></div>
        </div>
      </div>
    </div>`;

    // 事件
    $('#sfAI', section).addEventListener('click', runAI);
    $('#sfReset', section).addEventListener('click', () => { sched = clone(draft); aiDone = false; refreshSched(true); toast('已還原手動草稿', '可以再按「AI 自動排班」看看差異', { kind: 'info', icon: icon('refresh', 18) }); });
    bindSched();
    $('#sfIn', section).addEventListener('click', () => punch('in'));
    $('#sfOut', section).addEventListener('click', () => punch('out'));
    $('#sfWho', section).addEventListener('click', (e) => { const b = e.target.closest('[data-p]'); if (!b) return; selPid = b.dataset.p; renderWho(); gsap.fromTo(b, { scale: 0.9 }, { scale: 1, duration: 0.45, ease: 'back.out(3)' }); });
    $('#sfRecF', section).addEventListener('click', (e) => { const b = e.target.closest('.seg'); if (!b) return; recFilter = b.dataset.f; $$('#sfRecF .seg', root).forEach(x => x.classList.toggle('on', x === b)); renderRecs(); });
    $('#sfMonF', section).addEventListener('click', (e) => { const b = e.target.closest('.seg'); if (!b) return; chartMonth = b.dataset.m; $$('#sfMonF .seg', root).forEach(x => x.classList.toggle('on', x === b)); renderChart(); });
    $('#sfChecks', section).addEventListener('click', (e) => { if (e.target.closest('.sf-fix')) aiFix(e.target.closest('.sf-fix')); });
    $('#sfLeaves', section).addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (b) decide(b.dataset.id, b.dataset.act, b); });

    refreshSched(false);
    renderWho(); renderRecs(); renderLeaves(); renderAL(); renderSlipIdle();
    tick();
  },
  show() {
    if (!chart) chart = makeChart($('#sfChart', root));
    renderChart();
    renderKpis(true);
    if (firstShow) {
      firstShow = false;
      gsap.fromTo($$('.sf-blk', root), { opacity: 0, scaleX: 0.2, transformOrigin: 'left center' }, { opacity: 1, scaleX: 1, duration: 0.6, stagger: 0.012, ease: 'power3.out', delay: 0.25, clearProps: 'transform' });
      gsap.fromTo($$('.sf-curve path', root), { opacity: 0 }, { opacity: 1, duration: 1.2, stagger: 0.04, delay: 0.2 });
    }
    clearInterval(timer); timer = setInterval(tick, 1000); tick();
  },
  hide() { clearInterval(timer); timer = 0; },
};

/* ---------- 計算 ---------- */
function todayRec(pid) { const t = +startOfDay(now); return recs.find(r => r.pid === pid && +r.date === t); }
function weekHours(pid, w = sched) { return w.reduce((s, d) => s + workH(d[pid]), 0); }
function offDays(pid, w = sched) { return w.filter(d => !d[pid]).length; }
function maxRun(pid, w = sched) { let run = 0, best = 0; for (let i = 0; i < 14; i++) { if (w[i % 7][pid]) { run++; best = Math.max(best, run); } else run = 0; } return Math.min(best, 7); }
function onDuty(w, d, h) { return PEOPLE.filter(p => { const s = w[d][p.id]; return s && s.s <= h && s.e >= h + 1; }).length; }
let covThr = null;
function coverage(w) {
  if (covThr == null) { const v = tr.avg.flatMap(r => r.slice(11, 20)).sort((a, b) => a - b); covThr = v[Math.floor(v.length * 0.6)]; }
  let tot = 0, cov = 0;
  for (let d = 0; d < 7; d++) for (let h = 11; h < 20; h++) { const v = tr.avg[d][h], need = v >= covThr ? 2 : 1; tot += v; cov += v * Math.min(1, onDuty(w, d, h) / need); }
  return tot ? Math.round(cov / tot * 100) : 0;
}
function peakOf(d, lo = 11, hi = 20) { let b = lo; for (let h = lo; h < hi; h++) if (tr.avg[d][h] > tr.avg[d][b]) b = h; return b; }
const prevMonth = () => new Date(now.getFullYear(), now.getMonth() - 1, 1);
const prevMonthLabel = () => `${prevMonth().getFullYear() - 1911} 年 ${prevMonth().getMonth() + 1} 月`;
const payday = () => new Date(now.getFullYear(), now.getMonth(), 5);
function monthRecs(m0) { return recs.filter(r => r.date.getFullYear() === m0.getFullYear() && r.date.getMonth() === m0.getMonth()); }
function monthStats(m0, pid) {
  const list = monthRecs(m0).filter(r => r.pid === pid && r.out != null);
  const hours = list.reduce((s, r) => s + r.hours, 0), ot = list.reduce((s, r) => s + r.ot, 0);
  const p = PERSON[pid];
  return { days: list.length, hours, ot, normal: hours - ot, late: list.filter(r => r.late).length, otPay: list.reduce((s, r) => s + (r.ot ? otPay(p, r.ot) : 0), 0) };
}
function approvedOT() { return leaves.filter(l => l.kind === 'ot' && l.status === 'ok'); }
function curOT() {
  const m0 = new Date(now.getFullYear(), now.getMonth(), 1);
  const yun = monthStats(m0, 'yun');
  const extra = approvedOT().reduce((s, l) => s + l.hours, 0);
  return { hours: yun.ot + extra, pay: yun.otPay + approvedOT().reduce((s, l) => s + otPay(PERSON[l.pid], l.hours), 0) };
}

/* ---------- 勞基法檢核 ---------- */
function checks() {
  const yun = PERSON.yun, jie = PERSON.jie;
  const wk = LAW.map(p => [p, weekHours(p.id)]);
  const over = wk.filter(([, h]) => h > 40);
  const offBad = LAW.filter(p => offDays(p.id) < 2);
  const run7 = LAW.filter(p => maxRun(p.id) >= 7);
  const maxDay = Math.max(...LAW.flatMap(p => sched.map(d => workH(d[p.id]))), ...recs.filter(r => PERSON[r.pid].law).map(r => r.hours));
  const prevYun = monthStats(prevMonth(), 'yun');
  const ot = curOT();
  const yunOTm = Math.max(prevYun.ot, ot.hours);
  const noBreak = LAW.flatMap(p => sched.map((d, i) => [p, i, d[p.id]])).filter(([, , s]) => s && s.e - s.s > 4 && brk(s.e - s.s) < 0.5);
  return [
    { id: 'week', ok: !over.length, law: '§30', title: '每週正常工時 40 小時', detail: over.length ? over.map(([p, h]) => `${p.name} 本週排 ${h1(h)} 小時，超出 ${h1(h - 40)} 小時需經同意並給付加班費`).join('；') : wk.map(([p, h]) => `${p.name} ${h1(h)}h`).join('・') + '（皆 ≤ 40h）' },
    { id: 'day', ok: maxDay <= 12, law: '§32', title: '每日工時含加班不超過 12 小時', detail: `本週與近期打卡最長單日 ${h1(maxDay)} 小時` },
    { id: 'rest', ok: !offBad.length && !run7.length, law: '§36', title: '一例一休（七休一）', detail: offBad.length ? offBad.map(p => `${p.name} 本週僅休 ${offDays(p.id)} 天${maxRun(p.id) >= 6 ? `，連續上班 ${maxRun(p.id)} 天` : ''}；休息日出勤須另計加班費`).join('；') : LAW.map(p => `${p.name} 休 ${sched.map((d, i) => d[p.id] ? '' : DN[i].slice(1)).filter(Boolean).join('、')}`).join('・') + '，每七日皆有例假與休息日' },
    { id: 'otcap', ok: yunOTm <= 46, law: '§32', title: '每月延長工時 46 小時以內', detail: `小芸 上月 ${h1(prevYun.ot)}h・本月至今 ${h1(ot.hours)}h（含已核准申請）` },
    { id: 'otpay', ok: true, law: '§24', title: '加班費依法加成計給', detail: `時薪基準 ${n0(yun.pay)}÷240＝${hourlyBase(yun).toFixed(1)} 元；前 2 小時 ×4/3＝${(hourlyBase(yun) * 4 / 3).toFixed(1)}、再 2 小時 ×5/3＝${(hourlyBase(yun) * 5 / 3).toFixed(1)}；本月加班費 ${money(ot.pay)}` },
    { id: 'hourly', ok: jie.hourly >= RATES.minHourly, law: '基本工資', title: '兼職時薪不低於基本時薪', detail: `小傑 時薪 ${jie.hourly} 元 ≥ 115 年基本時薪 ${RATES.minHourly} 元` },
    { id: 'wage', ok: yun.pay >= RATES.minWage, law: '基本工資', title: '月薪不低於基本工資', detail: `小芸 月薪 ${n0(yun.pay)} 元 ≥ 115 年基本工資 ${n0(RATES.minWage)} 元` },
    { id: 'break', ok: !noBreak.length, law: '§35', title: '連續工作 4 小時給 30 分鐘休息', detail: '班表已自動扣除休息時間：8 小時以上班別休 1 小時、4 小時以上休 30 分鐘' },
  ];
}

/* ---------- KPI ---------- */
function renderKpis(anim) {
  const total = PEOPLE.reduce((s, p) => s + weekHours(p.id), 0);
  const sch = PEOPLE.filter(p => sched[todayWd][p.id]);
  const att = sch.filter(p => todayRec(p.id)?.in != null);
  const late = PEOPLE.filter(p => todayRec(p.id)?.late).length;
  const ot = curOT();
  const pr = PAYROLL();
  const base = pr.reduce((s, p) => s + p.cost, 0), emp = pr.reduce((s, p) => s + p.employer, 0);
  const cost = base + ot.pay;
  const cs = checks(), ok = cs.filter(c => c.ok).length;
  const K = [
    ['本週排班總工時', 'clock', '#2DB674', total, ' h', 1, PEOPLE.map(p => `${p.name} ${h1(weekHours(p.id))}`).join('・')],
    ['今日出勤', 'user', '#2E97D4', att.length, ` / ${sch.length} 人`, 0, sch.length ? `已打卡／今日排班${late ? `・遲到 ${late}` : '・無遲到'}` : '今日無人排班'],
    ['本月加班時數', 'trend', '#F0A531', ot.hours, ' h', 1, `加班費 ${money(ot.pay)}・上限 46h／人`],
    ['預估本月薪資成本', 'coins', '#7C62E6', cost, '', 0, `含雇主勞健保勞退 ${money(emp)}`],
    ['勞基法檢核', 'shield', ok === cs.length ? '#5EE0C4' : '#EC6A55', ok, ` / ${cs.length} 通過`, 0, ok === cs.length ? '全部通過，可發布班表' : `${cs.length - ok} 項需注意・可一鍵 AI 修正`],
  ];
  const host = $('#sfKpis', root);
  if (!host.children.length) {
    host.innerHTML = K.map(([t, ic, c], i) => `<div class="glass kpi sf-kpi" style="--c:${c}" data-i="${i}"><div class="kpi-top"><span class="kpi-ic">${icon(ic, 16)}</span><span class="kpi-label">${t}</span></div><div class="kpi-val"><b id="sfK${i}">0</b><em id="sfKu${i}"></em></div><div class="kpi-sub" id="sfKs${i}"></div></div>`).join('');
  }
  K.forEach(([, , c, v, unit, dec, sub], i) => {
    const card = host.children[i];
    card.style.setProperty('--c', c);
    card.classList.toggle('warn', i === 4 && ok < cs.length);
    $(`#sfKu${i}`, host).textContent = unit;
    $(`#sfKs${i}`, host).textContent = sub;
    countUp($(`#sfK${i}`, host), v, { decimals: dec, prefix: i === 3 ? 'NT$ ' : '', from: anim ? 0 : undefined, duration: anim ? 1.4 : 0.8 });
  });
}
function flashKpi(i) { const c = $(`#sfKpis [data-i="${i}"]`, root); if (!c) return; c.classList.remove('flash'); void c.offsetWidth; c.classList.add('flash'); }

/* ---------- 班表 ---------- */
function curvePath(row, max) {
  const pts = [];
  for (let h = H0; h < H1; h++) pts.push([((h + 0.5 - H0) / SPAN) * 1000, 96 - (row[h] / max) * 84]);
  pts.unshift([0, pts[0][1]]); pts.push([1000, pts[pts.length - 1][1]]);
  let d = `M${pts[0][0]},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return { line: d, area: d + ' L1000,100 L0,100 Z' };
}

function renderSched() {
  const max = Math.max(...tr.avg.flatMap(r => r.slice(H0, H1)), 0.1);
  const weekLeaves = leaves.filter(l => l.status === 'ok' && l.kind !== 'ot' && l.date >= ws && l.date < addDays(ws, 7));
  const ticks = Array.from({ length: SPAN + 1 }, (_, i) => `<span style="left:${pct(i)}">${pad(H0 + i)}</span>`).join('');
  const nowH = now.getHours() + now.getMinutes() / 60;
  const rows = DN.map((name, d) => {
    const date = addDays(ws, d), isT = d === todayWd;
    const { line, area } = curvePath(tr.avg[d], max);
    const pk = peakOf(d, H0, H1);
    const lanes = PEOPLE.map(p => {
      const s = sched[d][p.id], t = s && ST[s.type];
      const lv = weekLeaves.find(l => l.pid === p.id && wdOf(l.date) === d);
      if (!s) return `<div class="sf-lane" data-d="${d}" data-p="${p.id}"><span class="sf-off">${p.name}・休</span></div>`;
      return `<div class="sf-lane" data-d="${d}" data-p="${p.id}"><div class="sf-blk ${lv ? 'leave' : ''}" data-d="${d}" data-p="${p.id}" style="--c:${t.color};left:${pct(s.s - H0)};width:${pct(s.e - s.s)}" title="${p.name} ${t.name} ${hm(s.s)}–${hm(s.e)}（工時 ${workH(s)}h）">${av(p, 'sm')}<b>${p.name}</b><span class="sf-bt">${lv ? lv.label : t.name}</span><span class="sf-tm">${hm(s.s)}–${hm(s.e)}</span></div></div>`;
    }).join('');
    return `<div class="sf-day ${isT ? 'today' : ''} ${d >= 5 ? 'wkend' : ''}" data-d="${d}">
      <div class="sf-dl"><b>${name}${isT ? '<em>今天</em>' : ''}</b><small>${fmtMD(date)}</small><span class="sf-pred">預估 ${Math.round(tr.total[d])} 單</span></div>
      <div class="sf-tl">
        <svg class="sf-curve" viewBox="0 0 1000 100" preserveAspectRatio="none"><defs><linearGradient id="sfG${d}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5EE0C4" stop-opacity=".34"/><stop offset="1" stop-color="#5EE0C4" stop-opacity="0"/></linearGradient></defs><path class="a" d="${area}" fill="url(#sfG${d})"/><path class="l" d="${line}"/></svg>
        <span class="sf-peak" style="left:${pct(pk + 0.5 - H0)}">尖峰 ${pk}時</span>
        ${lanes}
        ${isT && nowH > H0 && nowH < H1 ? `<i class="sf-now" style="left:${pct(nowH - H0)}"><em>${pad(now.getHours())}:${pad(now.getMinutes())}</em></i>` : ''}
      </div>
    </div>`;
  }).join('');
  $('#sfSched', root).innerHTML = `<div class="sf-axis"><div class="sf-dl"></div><div class="sf-ticks">${ticks}</div></div>${rows}<i class="sf-scan" id="sfScan"></i>`;
  const st = $('#sfSchState', root);
  st.textContent = aiDone ? 'AI 最佳化版本' : '手動草稿';
  st.classList.toggle('warn', !aiDone);
}

function renderSide(typed = false) {
  const host = $('#sfSide', root);
  const bars = PEOPLE.map(p => {
    const h = weekHours(p.id), off = offDays(p.id);
    const lim = 40;
    const bad = p.law && (h > 40 || off < 2);
    return `<div class="sf-wh ${bad ? 'bad' : ''}">${av(p, 'sm')}<div class="sf-wh-t"><b>${p.name}</b><small>${h1(h)} h・休 ${off} 天${p.law ? '' : '（負責人）'}</small><i><em style="width:${Math.min(100, h / 56 * 100)}%;--c:${p.color}"></em><s style="left:${lim / 56 * 100}%"></s></i></div></div>`;
  }).join('');
  const cov = coverage(sched);
  let list;
  if (!aiDone) {
    const iss = [];
    const yOff = offDays('yun');
    if (yOff < 2) iss.push(`小芸本週只休 ${yOff} 天、連續上班 ${maxRun('yun')} 天，違反一例一休`);
    if (offDays('mei') === 0) iss.push('阿美連續 7 天上班，負責人也需要休息');
    const sat = sched[5].jie, pk = peakOf(5);
    if (!sat || sat.s > pk || sat.e < pk + 1) iss.push(`週六 ${pk}:00 是全週尖峰，小傑${sat ? ` ${hm(sat.s)}–${hm(sat.e)}` : '沒排班'}，錯過出貨高峰`);
    iss.push(`尖峰時段人力覆蓋率僅 ${cov}%（目標 85% 以上）`);
    list = `<div class="sf-side-h warn">${icon('alert', 15)} AI 發現 ${iss.length} 個問題</div><ul class="sf-iss">${iss.map(t => `<li>${esc(t)}</li>`).join('')}</ul><div class="sf-side-cta">按右上「AI 自動排班」，依近 8 週來客分布重新安排。</div>`;
  } else {
    list = `<div class="sf-side-h">${icon('sparkle', 15)} AI 排班理由</div><ul class="sf-why" id="sfWhy">${aiReasons().map(([ic, t]) => `<li><span>${icon(ic, 14)}</span><p data-t="${esc(t)}">${typed ? '' : esc(t)}</p></li>`).join('')}</ul>`;
  }
  host.innerHTML = `<div class="sf-side-sec"><div class="sf-sub-h">${icon('users', 14)} 本週工時（虛線＝40h）</div>${bars}</div><div class="sf-side-sec sf-cov"><div><small>尖峰人力覆蓋率</small><b id="sfCov">${cov}%</b></div><div class="sf-cov-bar"><i style="width:${cov}%"></i></div></div><div class="sf-side-sec">${list}</div>`;
}

function aiReasons() {
  const { d1, d2, d3 } = ai.rank;
  const sat = ai.week[5].jie, pk = peakOf(5);
  const wkAvg = [0, 1, 2, 3].reduce((s, d) => s + tr.total[d], 0) / 4, endAvg = (tr.total[4] + tr.total[5] + tr.total[6]) / 3;
  const draftH = PEOPLE.reduce((s, p) => s + weekHours(p.id, draft), 0), aiH = PEOPLE.reduce((s, p) => s + weekHours(p.id, ai.week), 0);
  return [
    ['trend', `週六 ${pk}:00 為全週來客最高峰（平均 ${tr.avg[5][pk].toFixed(1)} 單／時），安排小傑 ${hm(sat.s)}–${hm(sat.e)} 支援包裝出貨與門市。`],
    ['calendar', `${DN[d1]}來客全週最低（預估 ${Math.round(tr.total[d1])} 單），阿美排休；由小芸中班 10:00–19:00 顧店。`],
    ['shield', `小芸改為做五休二（${DN[d2]}、${DN[d3]}休），週工時 ${h1(weekHours('yun', ai.week))} 小時，符合一例一休。`],
    ['clock', `週五至週日訂單是平日的 ${(endAvg / wkAvg).toFixed(2)} 倍，阿美延長至 20:00，處理晚間 LINE 與官網訂單。`],
    ['truck', `${[d1, d2, d3].sort().map(d => DN[d]).join('、')}各加派小傑 4 小時尖峰班（${[d1, d2, d3].sort().map(d => hm(ai.week[d].jie.s)).join('／')} 起），每天尖峰都有兩人顧店與出貨。`],
    ['check', `本週總工時 ${h1(aiH)}h（草稿 ${h1(draftH)}h），尖峰人力覆蓋率 ${coverage(draft)}% → ${coverage(ai.week)}%，預估加班 0 小時。`],
  ];
}

function refreshSched(anim) {
  renderSched(); renderSide(); renderChecks(anim); renderKpis(false); renderWho();
}

function bindSched() {
  const host = $('#sfSched', root);
  let drag = null;
  host.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.sf-blk'); if (!b) return;
    const d = +b.dataset.d, pid = b.dataset.p, s = sched[d][pid];
    drag = { b, d, pid, x0: e.clientX, W: b.closest('.sf-tl').clientWidth, s0: s.s, e0: s.e, ds: 0, moved: false, id: e.pointerId };
  });
  host.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x0;
    if (!drag.moved && Math.abs(dx) > 6) { drag.moved = true; try { drag.b.setPointerCapture(e.pointerId); } catch { /* ignore */ } drag.b.classList.add('drag'); }
    if (!drag.moved) return;
    let ds = Math.round(dx / drag.W * SPAN * 2) / 2;
    ds = Math.max(H0 - drag.s0, Math.min(H1 - drag.e0, ds));
    drag.ds = ds;
    drag.b.style.left = pct(drag.s0 + ds - H0);
    $('.sf-tm', drag.b).textContent = `${hm(drag.s0 + ds)}–${hm(drag.e0 + ds)}`;
  });
  const end = () => {
    if (!drag) return;
    const { d, pid, ds, moved, s0, e0 } = drag; drag = null;
    const p = PERSON[pid];
    if (moved) {
      if (ds) {
        sched[d][pid] = { ...sched[d][pid], s: s0 + ds, e: e0 + ds };
        refreshSched(false); popBlock(d, pid);
        toast(`已調整 ${p.name} ${DN[d]}`, `${hm(s0 + ds)}–${hm(e0 + ds)}・工時與勞基法檢核已即時重算`, { kind: 'info', icon: icon('clock', 18) });
      } else refreshSched(false);
      return;
    }
    const cur = sched[d][pid];
    const next = CYCLE[(CYCLE.indexOf(cur.type) + 1) % CYCLE.length];
    sched[d][pid] = next ? { type: next, s: ST[next].s, e: ST[next].e } : null;
    refreshSched(false);
    if (next) popBlock(d, pid);
    else gsap.fromTo($(`.sf-lane[data-d="${d}"][data-p="${pid}"] .sf-off`, root), { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.4 });
  };
  host.addEventListener('pointerup', end);
  host.addEventListener('pointercancel', () => { drag = null; refreshSched(false); });
  host.addEventListener('click', (e) => {
    if (e.target.closest('.sf-blk')) return;
    const lane = e.target.closest('.sf-lane'); if (!lane) return;
    const d = +lane.dataset.d, pid = lane.dataset.p;
    if (sched[d][pid]) return;
    const t = PERSON[pid].def;
    sched[d][pid] = { type: t, s: ST[t].s, e: ST[t].e };
    refreshSched(false); popBlock(d, pid);
  });
}
function popBlock(d, pid) {
  const b = $(`.sf-blk[data-d="${d}"][data-p="${pid}"]`, root);
  if (b) gsap.fromTo(b, { scale: 0.7, opacity: 0.3 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2.6)', clearProps: 'transform' });
}

async function runAI() {
  const btn = $('#sfAI', root);
  if (btn.disabled) return;
  btn.disabled = true;
  btn.innerHTML = `<span class="sf-spin"></span> AI 分析來客中…`;
  const scan = $('#sfScan', root);
  gsap.set(scan, { opacity: 1, left: '0%' });
  gsap.to(scan, { left: '100%', duration: 1.1, ease: 'power1.inOut' });
  gsap.to($$('.sf-day', root), { '--glow': 1, duration: 0.3, stagger: 0.08, yoyo: true, repeat: 1 });
  await sleep(500);
  await gsap.to($$('.sf-blk', root), { opacity: 0, scale: 0.6, y: -6, duration: 0.32, stagger: { each: 0.012, from: 'random' }, ease: 'power2.in' });
  await sleep(250);
  sched = clone(ai.week); aiDone = true;
  renderSched(); renderSide(true); renderChecks(true); renderKpis(false); renderWho();
  [0, 2, 4].forEach(flashKpi);
  gsap.fromTo($$('.sf-blk', root), { opacity: 0, x: -36, scale: 0.7 }, { opacity: 1, x: 0, scale: 1, duration: 0.55, stagger: { each: 0.028, from: 'start' }, ease: 'back.out(1.8)', clearProps: 'transform' });
  gsap.fromTo('#sfCov', { scale: 1.4, color: '#5EE0C4' }, { scale: 1, color: '#eafff4', duration: 0.8, ease: 'back.out(3)' });
  btn.innerHTML = `${icon('wand', 16)} 重新 AI 排班`;
  btn.disabled = false;
  toast('AI 自動排班完成', `尖峰人力覆蓋率 ${coverage(draft)}% → ${coverage(sched)}%・勞基法檢核全數通過`, { icon: icon('sparkle', 18) });
  store.log('staff', `AI 依來客分布重新排定 ${fmtMD(ws)} 當週班表，勞基法檢核全數通過`);
  for (const p of $$('#sfWhy p', root)) { if (!root.isConnected) break; await typeText(p, p.dataset.t, 14); }
}

/* ---------- 勞基法檢核 ---------- */
function renderChecks(anim) {
  const cs = checks();
  const ok = cs.filter(c => c.ok).length;
  const chip = $('#sfLawChip', root);
  chip.textContent = ok === cs.length ? `${ok}/${cs.length} 全部通過` : `${ok}/${cs.length} 通過・${cs.length - ok} 項警示`;
  chip.classList.toggle('warn', ok < cs.length);
  $('#sfChecks', root).innerHTML = cs.map(c => `<li class="sf-ck ${c.ok ? 'ok' : 'warn'}" data-id="${c.id}">
    <span class="sf-ck-ic">${c.ok ? icon('check', 15) : icon('alert', 15)}</span>
    <div class="sf-ck-t"><b>${c.title}<em>${c.law}</em></b><small>${esc(c.detail)}</small></div>
    ${c.ok ? '<span class="sf-ck-ok">通過</span>' : `<button class="btn btn-sm sf-fix" data-id="${c.id}">${icon('wand', 14)} AI 修正</button>`}
  </li>`).join('');
  if (anim) gsap.fromTo($$('.sf-ck', root), { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: 0.45, stagger: 0.05, ease: 'power3.out' });
}

async function aiFix(btn) {
  btn.disabled = true; btn.innerHTML = `<span class="sf-spin"></span> 修正中`;
  const li = btn.closest('.sf-ck');
  gsap.to(li, { boxShadow: '0 0 0 1px #5EE0C4, 0 0 26px rgba(94,224,196,.45)', duration: 0.4 });
  await sleep(700);
  const before = clone(sched);
  const msgs = [];
  for (const p of LAW) {
    let guard = 0;
    while (offDays(p.id) < 2 && guard++ < 7) {
      const work = sched.map((d, i) => [i, d[p.id]]).filter(([, s]) => s).sort((a, b) => workH(a[1]) - workH(b[1]) || tr.total[a[0]] - tr.total[b[0]]);
      const [i] = work[0]; sched[i][p.id] = null; msgs.push(`${p.name} ${DN[i]}改為休息日`);
    }
    if (p.kind === 'full') {
      for (let i = 0; i < 7 && weekHours(p.id) < 40; i++) {
        const s = sched[i][p.id];
        if (s && workH(s) < 8 && weekHours(p.id) - workH(s) + 8 <= 40) { sched[i][p.id] = { type: 'early', s: 8, e: 17 }; msgs.push(`${DN[i]}改早班`); }
      }
    }
    for (let i = 0; i < 7 && weekHours(p.id) > 40; i++) {
      const s = sched[i][p.id];
      if (s && workH(s) > 8) { s.e = s.s + 9; msgs.push(`${p.name} ${DN[i]}縮為 8 小時`); }
    }
    let g2 = 0;
    while (weekHours(p.id) > 40 && g2++ < 7) {
      const work = sched.map((d, i) => [i, d[p.id]]).filter(([, s]) => s).sort((a, b) => tr.total[a[0]] - tr.total[b[0]]);
      sched[work[0][0]][p.id] = null; msgs.push(`${p.name} ${DN[work[0][0]]}排休`);
    }
  }
  refreshSched(false);
  renderChecks(false);
  const changed = [];
  for (let d = 0; d < 7; d++) for (const p of PEOPLE) if (JSON.stringify(before[d][p.id]) !== JSON.stringify(sched[d][p.id])) changed.push([d, p.id]);
  changed.forEach(([d, pid]) => { const lane = $(`.sf-lane[data-d="${d}"][data-p="${pid}"]`, root); if (lane) { lane.classList.add('fixed'); setTimeout(() => lane.classList.remove('fixed'), 2600); } popBlock(d, pid); });
  flashKpi(4);
  $('.sf-sched-card', root).scrollIntoView({ behavior: 'smooth', block: 'center' });
  toast('AI 已修正班表', msgs.length ? msgs.join('、') + `；小芸週工時 ${h1(weekHours('yun'))} 小時` : '目前班表已符合規定', { icon: icon('shield', 18) });
  store.log('staff', `勞基法檢核：AI 修正班表（${msgs.join('、') || '無需調整'}）`);
}

/* ---------- 打卡機 ---------- */
function gpsSvg() {
  return `<svg viewBox="0 0 220 150" class="sf-gps-svg">
    <rect width="220" height="150" rx="14" fill="rgba(6,26,19,.6)"/>
    <g stroke="rgba(255,255,255,.07)" stroke-width="10"><path d="M0 52H220M0 112H220M64 0V150M160 0V150"/></g>
    <g stroke="rgba(255,255,255,.12)" stroke-width="1" stroke-dasharray="4 5"><path d="M0 52H220M0 112H220M64 0V150M160 0V150"/></g>
    <g fill="rgba(45,182,116,.08)"><rect x="76" y="62" width="74" height="40" rx="5"/><rect x="8" y="62" width="46" height="40" rx="5"/><rect x="170" y="8" width="42" height="34" rx="5"/><rect x="76" y="8" width="74" height="34" rx="5"/><rect x="170" y="122" width="42" height="24" rx="5"/></g>
    <circle cx="112" cy="82" r="50" class="sf-fence"/>
    <circle cx="112" cy="82" r="50" class="sf-fence-pulse"/>
    <g transform="translate(112 82)"><path d="M0 -4c-7 0-12-5-12-12 0-8 12-20 12-20s12 12 12 20c0 7-5 12-12 12z" fill="#2DB674" stroke="#04130d" stroke-width="1.5"/><circle cx="0" cy="-17" r="4.5" fill="#04130d"/></g>
    <text x="112" y="104" text-anchor="middle" class="sf-gps-lbl">阿美手作甜點</text>
    <g class="sf-me"><circle cx="128" cy="70" r="11" class="sf-me-ring"/><circle cx="128" cy="70" r="5.5" fill="#5EE0C4" stroke="#fff" stroke-width="2"/></g>
  </svg>`;
}
function faceSvg() {
  const rng = (i) => { const x = Math.sin(i * 91.7) * 43758.5453; return x - Math.floor(x); };
  const dots = Array.from({ length: 46 }, (_, i) => { const a = rng(i) * Math.PI * 2, r = Math.sqrt(rng(i + 99)) ; return [80 + Math.cos(a) * r * 36, 78 + Math.sin(a) * r * 46]; });
  return `<svg viewBox="0 0 160 160" class="sf-face-svg">
    <defs><linearGradient id="sfScanG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5EE0C4" stop-opacity="0"/><stop offset=".85" stop-color="#5EE0C4" stop-opacity=".55"/><stop offset="1" stop-color="#eafff4"/></linearGradient>
    <clipPath id="sfFaceClip"><rect x="14" y="14" width="132" height="132" rx="18"/></clipPath></defs>
    <rect x="14" y="14" width="132" height="132" rx="18" fill="rgba(6,26,19,.55)"/>
    <g class="sf-brk" fill="none" stroke-width="3.5" stroke-linecap="round"><path d="M10 34V18a8 8 0 0 1 8-8h16M126 10h16a8 8 0 0 1 8 8v16M150 126v16a8 8 0 0 1-8 8h-16M34 150H18a8 8 0 0 1-8-8v-16"/></g>
    <g class="sf-fhead" fill="none" stroke-width="1.6">
      <ellipse cx="80" cy="76" rx="34" ry="44"/>
      <path d="M62 66q6-5 12 0M86 66q6-5 12 0"/>
      <circle cx="68" cy="72" r="2.4"/><circle cx="92" cy="72" r="2.4"/>
      <path d="M80 76v12l-4 3M70 101q10 7 20 0"/>
      <path d="M38 150q6-26 42-28q36 2 42 28"/>
    </g>
    <g class="sf-mesh">${dots.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.3"/>`).join('')}</g>
    <g clip-path="url(#sfFaceClip)"><rect class="sf-scanline" x="14" y="-30" width="132" height="34" fill="url(#sfScanG)"/></g>
    <g class="sf-ok" opacity="0"><circle cx="128" cy="128" r="15" fill="#2DB674"/><path d="M121 128l5 5 9-10" stroke="#04130d" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>
  </svg>`;
}

function tick() {
  if (!root) return;
  const d = new Date();
  const c = $('#sfClk', root); if (c) c.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  const t = $('#sfDate', root); if (t) t.textContent = `${fmtDate(d)} ${DN[wdOf(d)]}・門市 11:00–20:00`;
}

function renderWho() {
  const host = $('#sfWho', root); if (!host) return;
  host.innerHTML = PEOPLE.map(p => {
    const s = sched[todayWd][p.id], r = todayRec(p.id);
    const st = r?.leave ? r.leave : r?.out != null ? `已下班 ${mm(r.out)}` : r?.in != null ? `上班中・${mm(r.in)}` : s ? `今日 ${hm(s.s)}–${hm(s.e)}` : '今日休';
    return `<button class="sf-who-b ${p.id === selPid ? 'on' : ''} ${r?.in != null && r?.out == null ? 'live' : ''}" data-p="${p.id}" style="--c:${p.color}">${av(p)}<span><b>${p.name}</b><small>${st}</small></span></button>`;
  }).join('');
  const r = todayRec(selPid), s = sched[todayWd][selPid];
  $('#sfInSub', root).textContent = r?.in != null ? `已打卡 ${mm(r.in)}` : s ? `排班 ${hm(s.s)}` : '非排班日';
  $('#sfOutSub', root).textContent = r?.out != null ? `已打卡 ${mm(r.out)}` : s ? `排班 ${hm(s.e)}` : '—';
  $('#sfIn', root).classList.toggle('done', r?.in != null);
  $('#sfOut', root).classList.toggle('done', r?.out != null);
}

async function punch(kind) {
  if (busy) return;
  const p = PERSON[selPid], r = todayRec(selPid), s = sched[todayWd][selPid];
  if (kind === 'in' && r?.in != null) return toast(`${p.name} 今天已打過上班卡`, `上班時間 ${mm(r.in)}，不需要重複打卡`, { kind: 'warn', icon: icon('alert', 18) });
  if (kind === 'out' && (!r || r.in == null)) return toast(`${p.name} 尚未打上班卡`, '請先按「上班打卡」', { kind: 'warn', icon: icon('alert', 18) });
  if (kind === 'out' && r.out != null) return toast(`${p.name} 今天已打過下班卡`, `下班時間 ${mm(r.out)}`, { kind: 'warn', icon: icon('alert', 18) });
  busy = true;
  const face = $('#sfFace', root), gps = $('#sfGps', root), ft = $('#sfFaceT', root);
  const btn = $(kind === 'in' ? '#sfIn' : '#sfOut', root);
  btn.classList.add('busy');
  gsap.fromTo(btn, { scale: 0.94 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
  gps.classList.add('locating'); ft.textContent = 'GPS 定位中…';
  gsap.fromTo($('.sf-me', gps), { x: 40, y: -30, opacity: 0.3 }, { x: 0, y: 0, opacity: 1, duration: 0.7, ease: 'power3.out' });
  await sleep(750);
  gps.classList.remove('locating'); gps.classList.add('okay');
  face.classList.add('scanning'); ft.textContent = '臉部辨識中…請看鏡頭';
  const line = $('.sf-scanline', face);
  const tl = gsap.timeline();
  tl.fromTo(line, { attr: { y: -30 } }, { attr: { y: 140 }, duration: 0.65, ease: 'sine.inOut', repeat: 1, yoyo: true });
  gsap.fromTo($$('.sf-mesh circle', face), { opacity: 0 }, { opacity: 1, duration: 0.25, stagger: { each: 0.018, from: 'random' } });
  await sleep(1350);
  const conf = (97.2 + Math.random() * 2.5).toFixed(1);
  face.classList.remove('scanning'); face.classList.add('matched');
  gsap.fromTo($('.sf-ok', face), { opacity: 0, scale: 0.3, transformOrigin: '128px 128px' }, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(3)' });
  ft.innerHTML = `<b>辨識成功：${p.name}</b>・相似度 ${conf}%`;
  const d = new Date(), nm = d.getHours() * 60 + d.getMinutes();
  let row, title, body;
  if (kind === 'in') {
    const late = s ? Math.max(0, nm - s.s * 60) : 0;
    row = { date: startOfDay(now), pid: selPid, sh: s, in: nm, out: null, late: late > 0 && late < 600 ? late : 0, hours: 0, ot: 0, live: true, extra: !s };
    recs.push(row);
    title = `上班打卡成功｜${p.name} ${mm(nm)}`;
    body = `GPS 店內 18m・臉部辨識 ${conf}%${row.late ? `・遲到 ${row.late} 分鐘` : s ? '・準時' : '・非排班日，已自動送出加班申請'}`;
  } else {
    row = r; row.out = Math.max(nm, row.in); row.live = true;
    const span = (row.out - row.in) / 60;
    row.hours = Math.max(0, Math.round((span - brk(span)) * 2) / 2);
    row.ot = p.law && p.kind === 'full' ? Math.max(0, row.hours - 8) : 0;
    title = `下班打卡成功｜${p.name} ${mm(row.out)}`;
    body = `今日工時 ${h1(row.hours)} 小時${row.ot ? `・加班 ${h1(row.ot)} 小時（已計入加班費）` : ''}・已同步薪資工時`;
  }
  toast(title, body, { icon: icon('clock', 18) });
  store.log('staff', `${p.name} ${kind === 'in' ? '上班' : '下班'}打卡 ${mm(nm)}（GPS＋臉部辨識）`);
  burst(btn);
  recFilter = 'all'; $$('#sfRecF .seg', root).forEach(x => x.classList.toggle('on', x.dataset.f === 'all'));
  renderWho(); renderRecs(row); renderKpis(false); flashKpi(1);
  await sleep(1500);
  face.classList.remove('matched'); gps.classList.remove('okay'); btn.classList.remove('busy');
  gsap.to($('.sf-ok', face), { opacity: 0, duration: 0.3 });
  gsap.to($$('.sf-mesh circle', face), { opacity: 0.35, duration: 0.4 });
  busy = false;
}
function burst(btn) {
  const b = btn.getBoundingClientRect();
  for (let i = 0; i < 14; i++) {
    const dot = document.createElement('i');
    dot.className = 'sf-burst';
    dot.style.left = (b.left + b.width / 2) + 'px'; dot.style.top = (b.top + b.height / 2) + 'px';
    document.body.appendChild(dot);
    const a = (i / 14) * Math.PI * 2, r = 50 + Math.random() * 40;
    gsap.to(dot, { x: Math.cos(a) * r, y: Math.sin(a) * r, opacity: 0, scale: 0.4, duration: 0.8, ease: 'power3.out', onComplete: () => dot.remove() });
  }
}

/* ---------- 打卡紀錄 ---------- */
function renderRecs(hl) {
  const today = startOfDay(now), from = addDays(today, -6);
  const rows = [];
  for (let day = today; day >= from; day = addDays(day, -1)) {
    for (const p of PEOPLE) {
      if (recFilter !== 'all' && recFilter !== p.id) continue;
      const r = recs.find(x => x.pid === p.id && +x.date === +day);
      if (r) rows.push(r);
      else if (+day === +today && sched[todayWd][p.id]) rows.push({ date: day, pid: p.id, sh: sched[todayWd][p.id], pending: true });
    }
  }
  const week = recs.filter(r => r.date >= from && r.out != null);
  const sumH = week.reduce((s, r) => s + r.hours, 0), lates = week.filter(r => r.late).length, ots = week.reduce((s, r) => s + r.ot, 0);
  $('#sfRecSum', root).innerHTML = [['總工時', `${h1(sumH)} h`], ['出勤人次', `${week.length}`], ['遲到', `${lates} 次`], ['加班', `${h1(ots)} h`]].map(([t, v]) => `<div><small>${t}</small><b>${v}</b></div>`).join('');
  $('#sfRecBody', root).innerHTML = rows.map(r => {
    const p = PERSON[r.pid], t = r.sh && ST[r.sh.type];
    let st;
    if (r.leave) st = `<span class="sf-st lv">${r.leave}</span>`;
    else if (r.pending) st = '<span class="sf-st idle">待打卡</span>';
    else if (r.out == null) st = '<span class="sf-st live">上班中</span>';
    else if (r.late) st = '<span class="sf-st late">遲到</span>';
    else if (r.extra) st = '<span class="sf-st ot">加班申請</span>';
    else if (r.ot) st = '<span class="sf-st ot">加班</span>';
    else st = '<span class="sf-st ok">正常</span>';
    const wd = DN[wdOf(r.date)].slice(1);
    return `<tr class="${r === hl ? 'hl' : ''}"><td>${fmtMD(r.date)}（${wd}）</td><td><span class="sf-pn">${av(p, 'xs')}${p.name}</span></td><td>${t ? `<span class="sf-tag" style="--c:${t.color}">${t.name}</span>` : '<span class="sf-tag">加班</span>'}</td>
      <td class="mono">${r.in != null ? mm(r.in) : '—'}</td><td class="mono">${r.out != null ? mm(r.out) : '—'}</td>
      <td class="r ${r.late ? 'sf-late' : ''}">${r.late ? r.late + ' 分' : '—'}</td><td class="r">${r.out != null ? h1(r.hours) + (r.ot ? `<small class="sf-otx">+${h1(r.ot)}</small>` : '') : '—'}</td><td>${st}</td></tr>`;
  }).join('') || '<tr><td colspan="8">沒有紀錄</td></tr>';
  if (hl) {
    const tr0 = $('#sfRecBody tr.hl', root);
    if (tr0) { tr0.scrollIntoView({ block: 'nearest' }); gsap.fromTo(tr0, { backgroundColor: 'rgba(94,224,196,.35)' }, { backgroundColor: 'rgba(94,224,196,0)', duration: 2.2, ease: 'power2.out' }); }
  }
}

/* ---------- 請假與加班 ---------- */
const LV_COLOR = { annual: '#2DB674', personal: '#F0A531', sick: '#EC6A55', ot: '#7C62E6' };
function lvNote(l) {
  const p = PERSON[l.pid];
  if (l.kind === 'annual') { const a = annualLeaveDays(p.hire, now), rem = a.days - annualUsed[p.id]; return `特休剩 ${rem} 天，核准後剩 ${rem - 1} 天；AI 建議當天由阿美代早班`; }
  if (l.kind === 'personal') return `事假不給薪，扣 ${l.hours}h × ${p.hourly} ＝ ${money(l.hours * p.hourly)}；AI 建議週六由阿美補位`;
  if (l.kind === 'sick') return `病假半薪：${l.hours}h × ${p.hourly} ÷ 2 ＝ ${money(l.hours * p.hourly / 2)}，已自動帶入薪資單`;
  return `平日延長 ${l.hours}h，加班費 ${money(otPay(p, l.hours))}；本月累計 ${h1(curOT().hours + (l.status === 'ok' ? 0 : l.hours))}h／上限 46h`;
}
function renderLeaves() {
  const pend = leaves.filter(l => l.status === 'pending').length;
  const chip = $('#sfLvChip', root);
  chip.textContent = pend ? `${pend} 件待核准` : '全部處理完成';
  chip.classList.toggle('warn', pend > 0);
  $('#sfLeaves', root).innerHTML = leaves.map(l => {
    const p = PERSON[l.pid];
    const stamp = l.status === 'ok' ? '<span class="sf-stamp ok">已核准</span>' : l.status === 'no' ? '<span class="sf-stamp no">已退回</span>' : '';
    return `<div class="sf-lv ${l.status}" data-id="${l.id}" style="--c:${LV_COLOR[l.kind]}">
      <div class="sf-lv-h">${av(p)}<div><b>${p.name}</b><small>${esc(p.title)}</small></div><span class="sf-lv-k">${l.label}${l.kind === 'ot' ? '申請' : ''}</span></div>
      <div class="sf-lv-d">${icon('calendar', 14)} ${fmtMD(l.date)}（${DN[wdOf(l.date)].slice(1)}）・${l.span}</div>
      <p class="sf-lv-r">${esc(l.reason)}</p>
      <div class="sf-lv-ai">${icon('sparkle', 12)} ${esc(lvNote(l))}</div>
      <div class="sf-lv-f"><small>${esc(l.via)}・${fmtMD(l.at)} ${pad(l.at.getHours())}:${pad(l.at.getMinutes())} 申請</small>
        ${l.status === 'pending' ? `<div class="sf-lv-act"><button class="btn btn-ghost btn-sm" data-act="no" data-id="${l.id}">${icon('x', 13)} 退回</button><button class="btn btn-primary btn-sm" data-act="ok" data-id="${l.id}">${icon('check', 13)} 核准</button></div>` : ''}
      </div>${stamp}
    </div>`;
  }).join('');
}
async function decide(id, act, btn) {
  const l = leaves.find(x => x.id === id); if (!l || l.status !== 'pending') return;
  const card = btn.closest('.sf-lv');
  gsap.to(card, { scale: 0.97, duration: 0.15, yoyo: true, repeat: 1 });
  await sleep(220);
  const note = lvNote(l);
  l.status = act;
  const p = PERSON[l.pid];
  if (act === 'ok' && l.kind === 'annual') annualUsed[p.id] += 1;
  renderLeaves(); renderAL();
  const stamp = $(`.sf-lv[data-id="${id}"] .sf-stamp`, root);
  if (stamp) gsap.fromTo(stamp, { scale: 2.6, opacity: 0, rotate: -24 }, { scale: 1, opacity: 1, rotate: -10, duration: 0.5, ease: 'back.out(2.2)' });
  if (act === 'ok') {
    toast(`已核准 ${p.name} ${l.label}${l.kind === 'ot' ? '申請' : ''}`, `${fmtMD(l.date)}・${note}`, { icon: icon('check', 18) });
    if (l.kind === 'personal' || l.kind === 'sick') { refreshSched(false); const b = $(`.sf-blk[data-p="${l.pid}"][data-d="${wdOf(l.date)}"]`, root); if (b && l.date >= ws && l.date < addDays(ws, 7)) gsap.fromTo(b, { scale: 1.15 }, { scale: 1, duration: 0.6, ease: 'back.out(3)' }); }
    if (l.kind === 'ot') { renderKpis(false); renderChecks(false); flashKpi(2); flashKpi(3); }
  } else {
    toast(`已退回 ${p.name} ${l.label}申請`, '系統已透過 LINE 通知申請人，可補充說明後重新送出', { kind: 'info', icon: icon('x', 18) });
  }
  store.log('staff', `負責人${act === 'ok' ? '核准' : '退回'} ${p.name} ${fmtMD(l.date)} ${l.label}${l.kind === 'ot' ? '申請' : ''}`);
}
function tierPos(y) {
  const T = LEAVE_TIERS, n = T.length - 1;
  if (y <= T[0][0]) return 0;
  for (let i = 0; i < n; i++) if (y < T[i + 1][0]) return (i + (y - T[i][0]) / (T[i + 1][0] - T[i][0])) / n * 100;
  return 100;
}
function renderAL() {
  $('#sfAL', root).innerHTML = LAW.map(p => {
    const a = annualLeaveDays(p.hire, now);
    const ratio = p.kind === 'part' ? p.hours / 176 : 1;
    const total = a.days * ratio, used = Math.min(total, annualUsed[p.id] * (p.kind === 'part' ? ratio : 1)), rem = total - used;
    const y = a.months / 12;
    const C = 2 * Math.PI * 22;
    return `<div class="sf-al" style="--c:${p.color}">
      <div class="sf-al-ring"><svg viewBox="0 0 54 54"><circle cx="27" cy="27" r="22"/><circle cx="27" cy="27" r="22" class="fg" style="stroke-dasharray:${C};stroke-dashoffset:${C * (1 - rem / Math.max(total, 0.01))}"/></svg><b>${h1(rem)}</b><small>剩餘天</small></div>
      <div class="sf-al-t">
        <div class="sf-al-n">${av(p, 'xs')}<b>${p.name}</b><small>到職 ${fmtDate(p.hire)}・年資 ${a.years} 年 ${a.rest} 個月</small></div>
        <div class="sf-al-v">應有特休 <b>${a.days} 天</b>${p.kind === 'part' ? `<em> × 工時比例 ${Math.round(ratio * 100)}% ＝ ${h1(total)} 天（${h1(total * 8)} 小時）</em>` : ''}・已休 ${h1(used)} 天</div>
        <div class="sf-tier">${LEAVE_TIERS.map(([yy, dd], i) => `<span class="${y >= yy ? 'on' : ''}" style="left:${i / (LEAVE_TIERS.length - 1) * 100}%"><i></i>${yy < 1 ? '半年' : yy + '年'}<b>${dd}天</b></span>`).join('')}<em class="sf-tier-me" style="left:${tierPos(y)}%"></em></div>
      </div>
    </div>`;
  }).join('');
}

/* ---------- 工時統計 ---------- */
function renderChart() {
  if (!chart) return;
  const m0 = chartMonth === 'prev' ? prevMonth() : new Date(now.getFullYear(), now.getMonth(), 1);
  const mEnd = new Date(m0.getFullYear(), m0.getMonth() + 1, 0);
  const list = monthRecs(m0).filter(r => r.out != null);
  const weeks = [];
  for (let d = weekStart(m0); d <= mEnd; d = addDays(d, 7)) {
    const a = d < m0 ? m0 : d, b = addDays(d, 6) > mEnd ? mEnd : addDays(d, 6);
    if (a > now) break;
    weeks.push({ a, b, label: `${fmtMD(a)}–${b.getDate()}` });
  }
  const sum = (pid, k, w) => list.filter(r => r.pid === pid && r.date >= startOfDay(w.a) && r.date <= w.b).reduce((s, r) => s + (k === 'n' ? r.hours - r.ot : r.ot), 0);
  const S = (name, pid, k, color, stack) => ({
    name, type: 'bar', stack, barMaxWidth: 26, data: weeks.map(w => +sum(pid, k, w).toFixed(1)),
    itemStyle: { color: new window.echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color }, { offset: 1, color: color + '44' }]), borderRadius: k === 'o' || pid === 'jie' ? [6, 6, 0, 0] : 0, shadowBlur: 10, shadowColor: color + '55' },
    emphasis: { focus: 'series' },
  });
  chart.setOption({
    animationDuration: 1100, animationDelay: (i) => i * 60,
    grid: { left: 6, right: 10, top: 40, bottom: 4, containLabel: true },
    legend: { top: 0, right: 0, itemWidth: 12, itemHeight: 8, textStyle: { fontSize: 11 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: v => v + ' 小時' },
    xAxis: { type: 'category', data: weeks.map(w => w.label), axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', axisLabel: { formatter: '{value}h' } },
    series: [S('小芸 正常工時', 'yun', 'n', '#2E97D4', 'yun'), S('小芸 加班', 'yun', 'o', '#F0A531', 'yun'), S('小傑 工時（時薪）', 'jie', 'n', '#DD5597', 'jie')],
  }, true);
  const ms = LAW.map(p => [p, monthStats(m0, p.id)]);
  $('#sfHSum', root).innerHTML = ms.map(([p, s]) => `<div class="sf-hs" style="--c:${p.color}">${av(p, 'sm')}<div><b>${p.name}</b><small>出勤 ${s.days} 天・遲到 ${s.late} 次</small></div><span><small>正常</small><b>${h1(s.normal)}h</b></span><span><small>加班</small><b>${h1(s.ot)}h</b></span><span><small>加班費</small><b>${n0(s.otPay)}</b></span></div>`).join('')
    + `<div class="sf-hs-note">${icon('sparkle', 13)} 工時直接取自打卡紀錄，阿美為負責人不計薪資工時${chartMonth === 'cur' ? `；${now.getMonth() + 1} 月為至今累計` : ''}。</div>`;
}

/* ---------- 薪資單 ---------- */
function slipData(pid) {
  const p = PERSON[pid], s = monthStats(prevMonth(), pid), pr = p.pr;
  const sick = leaves.filter(l => l.pid === pid && l.kind === 'sick' && l.status === 'ok' && l.date.getMonth() === prevMonth().getMonth());
  const base = p.kind === 'part' ? Math.round(s.hours * p.hourly) : p.pay;
  const sickPay = sick.reduce((a, l) => a + l.hours * p.hourly / 2, 0);
  const earn = [[p.kind === 'part' ? `時薪 ${p.hourly} × ${h1(s.hours)} 小時` : '本薪（月薪）', base]];
  if (s.otPay) earn.push([`平日加班費（${h1(s.ot)} 小時，×4/3 起）`, s.otPay]);
  if (sickPay) earn.push(['病假半薪', sickPay]);
  const gross = earn.reduce((a, [, v]) => a + v, 0);
  const ded = [['勞保費（自付 20%）', pr.emp.labor], ['健保費（自付 30%・本人）', pr.emp.health], ['勞退自提（0%）', 0]];
  const dsum = ded.reduce((a, [, v]) => a + v, 0);
  return { p, s, pr, earn, gross, ded, dsum, net: gross - dsum, employer: [['勞保＋職災（雇主）', pr.labor], ['健保（雇主）', pr.health], ['勞退提繳 6%（雇主）', pr.pension]] };
}
function renderSlipIdle() {
  const steps = ['彙整打卡工時與請假', '計算加班費（§24）', '套用勞健保投保級距', '產生個人薪資單', '寫入會計帳務「人」與扣繳資料'];
  $('#sfSlipHost', root).innerHTML = `<div class="sf-slip-idle">
    <div class="sf-slip-steps">${steps.map((t, i) => `<div class="sf-step" data-i="${i}"><i>${i + 1}</i><span>${t}</span></div>`).join('')}</div>
    <div class="sf-slip-cta"><p>${prevMonthLabel()}工時已結算：小芸 ${h1(monthStats(prevMonth(), 'yun').hours)} 小時、小傑 ${h1(monthStats(prevMonth(), 'jie').hours)} 小時。一鍵產生薪資單，自動寄給員工並入帳。</p>
    <button class="btn btn-primary btn-lg" id="sfGen">${icon('receipt', 18)} 產生薪資單</button></div>
  </div>`;
  $('#sfGen', root).addEventListener('click', genSlip);
}
async function genSlip() {
  const btn = $('#sfGen', root); btn.disabled = true; btn.innerHTML = `<span class="sf-spin"></span> 產生中…`;
  for (const s of $$('.sf-step', root)) {
    s.classList.add('run'); await sleep(330); s.classList.remove('run'); s.classList.add('done');
    $('i', s).innerHTML = icon('check', 12);
  }
  await sleep(200);
  payDone = true;
  renderSlip(true);
  const all = ['yun', 'jie'].map(slipData);
  toast('薪資單已產生', `${prevMonthLabel()}・實發合計 ${money(all.reduce((a, d) => a + d.net, 0))}，已寫入會計帳務（人）`, { icon: icon('receipt', 18) });
  store.log('staff', `${prevMonthLabel()}薪資單已產生並寫入會計帳務「人」：實發合計 ${money(all.reduce((a, d) => a + d.net, 0))}`);
}
function renderSlip(anim) {
  const d = slipData(payTab);
  const all = ['yun', 'jie'].map(slipData);
  const G = all.reduce((a, x) => a + x.gross, 0), EMP = all.reduce((a, x) => a + x.dsum, 0), NET = all.reduce((a, x) => a + x.net, 0);
  const INS = all.reduce((a, x) => a + x.pr.labor + x.pr.health, 0), PEN = all.reduce((a, x) => a + x.pr.pension, 0);
  const nM = prevMonth().getMonth() + 1;
  const ytd = all.map(x => [x.p, x.gross * nM]);
  const host = $('#sfSlipHost', root);
  host.innerHTML = `<div class="sf-slip-tabs">${['yun', 'jie'].map(id => `<button class="seg ${id === payTab ? 'on' : ''}" data-p="${id}">${PERSON[id].name}</button>`).join('')}<button class="btn btn-ghost btn-sm" id="sfSend">${icon('send', 13)} LINE 寄送薪資單</button></div>
  <div class="sf-paper" id="sfPaper">
    <div class="sf-pp-h"><div><b>薪資明細表</b><small>阿美手作甜點（示範）・${prevMonthLabel()}</small></div><span class="stamp">已核發</span></div>
    <div class="sf-pp-meta"><span>姓名：${d.p.name}</span><span>職稱：${esc(d.p.title)}</span><span>投保薪資：${n0(d.p.level)}</span><span>發薪日：${fmtDate(payday())}</span><span>出勤：${d.s.days} 天／${h1(d.s.hours)} 小時</span></div>
    <div class="sf-pp-cols">
      <table class="sf-pp-t"><tr class="sec"><th colspan="2">應發項目</th></tr>${d.earn.map(([t, v]) => `<tr><td>${t}</td><td class="r">${n0(v)}</td></tr>`).join('')}<tr class="sub"><td>應發合計</td><td class="r">${n0(d.gross)}</td></tr></table>
      <table class="sf-pp-t"><tr class="sec"><th colspan="2">應扣項目</th></tr>${d.ded.map(([t, v]) => `<tr><td>${t}</td><td class="r">${v ? n0(v) : '0'}</td></tr>`).join('')}<tr class="sub"><td>應扣合計</td><td class="r">${n0(d.dsum)}</td></tr></table>
    </div>
    <div class="sf-pp-net"><span>實發金額<small>薪轉帳戶 ＊＊＊＊${d.p.id === 'yun' ? '3318' : '7520'}</small></span><b>NT$ ${n0(d.net)}</b></div>
    <div class="sf-pp-emp">雇主負擔（不從薪資扣除）：${d.employer.map(([t, v]) => `${t} ${n0(v)}`).join('・')}</div>
    <div class="sf-pp-foot">薪資所得未達扣繳起扣標準，本月免扣繳；年度結束自動彙總產生扣繳憑單（格式 50）。</div>
  </div>
  <div class="sf-post">
    <div class="sf-sub-h">${icon('book', 14)} 已自動寫入會計帳務「人」</div>
    <div class="sf-je">
      <div><span class="dr">借</span>薪資支出<b>${n0(G)}</b></div>
      <div><span class="dr">借</span>保險費（勞健保雇主負擔）<b>${n0(INS)}</b></div>
      <div><span class="dr">借</span>退休金（勞退 6%）<b>${n0(PEN)}</b></div>
      <div><span class="cr">貸</span>銀行存款（薪轉實發）<b>${n0(NET)}</b></div>
      <div><span class="cr">貸</span>代收款（員工自付勞健保）<b>${n0(EMP)}</b></div>
      <div><span class="cr">貸</span>應付費用（勞健保・勞退）<b>${n0(INS + PEN)}</b></div>
    </div>
    <div class="sf-post-f"><span class="chip-sm">${icon('file', 12)} 扣繳憑單資料 1–${nM} 月累計：${ytd.map(([p, v]) => `${p.name} 約 ${n0(v)}`).join('・')}</span><button class="btn btn-ghost btn-sm" id="sfToBooks">${icon('external', 13)} 前往會計帳務</button></div>
  </div>`;
  $$('.sf-slip-tabs .seg', host).forEach(b => b.addEventListener('click', () => { payTab = b.dataset.p; renderSlip(false); gsap.fromTo('#sfPaper', { opacity: 0, x: 16 }, { opacity: 1, x: 0, duration: 0.4 }); }));
  $('#sfSend', host).addEventListener('click', () => toast('薪資單已寄送', `透過 LINE 官方帳號寄給小芸、小傑（含密碼保護 PDF）`, { kind: 'info', icon: icon('send', 18) }));
  $('#sfToBooks', host).addEventListener('click', () => go && go('books'));
  if (anim) {
    gsap.fromTo('#sfPaper', { clipPath: 'inset(0 0 100% 0)', y: -10 }, { clipPath: 'inset(0 0 0% 0)', y: 0, duration: 1.1, ease: 'power2.out' });
    gsap.fromTo($$('.sf-je > div', host), { opacity: 0, x: -12 }, { opacity: 1, x: 0, stagger: 0.08, delay: 0.8, duration: 0.4 });
    gsap.fromTo($('.sf-paper .stamp', host), { scale: 2.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, delay: 1.0, ease: 'back.out(2)' });
  }
}
