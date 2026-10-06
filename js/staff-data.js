// 排班打卡：人員設定、班別、來客分布、AI 排班、打卡紀錄模擬（皆為示範資料）
import { STAFF, RATES, payrollRow } from './ledger.js';
import { mulberry32, startOfDay, addDays } from './data.js';
import { TENANT_ID } from './tenant.js';

export const DAY_NAMES = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];
export const H0 = 8, H1 = 21; // 班表時間軸 08:00–21:00
export const wdOf = (d) => (new Date(d).getDay() + 6) % 7; // 0=週一 … 6=週日
export const weekStart = (now = new Date()) => addDays(startOfDay(now), -wdOf(now));

// 人員：沿用 ledger STAFF，補上排班所需欄位
// 排班用固定「角色槽」：mei＝負責人、yun＝全職員工、jie＝兼職員工（各業主人數不同，可能只有負責人一人）
const EXTRA = {
  阿美: { id: 'mei', color: '#5EE0C4', hire: new Date(2021, 2, 1), role: '店長・接單', def: 'mid', law: false },
  小芸: { id: 'yun', color: '#2E97D4', hire: new Date(2023, 3, 10), role: '烘焙・門市', def: 'early', law: true },
  小傑: { id: 'jie', color: '#DD5597', hire: new Date(2025, 7, 18), role: '包裝・出貨', def: 'short', law: true },
};
const SLOT = {
  owner: { id: 'mei', color: '#5EE0C4', hire: new Date(2022, 4, 1), def: 'mid', law: false },
  full: { id: 'yun', color: '#2E97D4', hire: new Date(2024, 1, 15), def: 'early', law: true },
  part: { id: 'jie', color: '#DD5597', hire: new Date(2025, 2, 3), def: 'short', law: true },
};
const roleOf = (s) => s.kind === 'owner' ? '負責人・接單' : String(s.title || '').split('・')[0] || '門市';
const used = new Set();
export const PEOPLE = STAFF.map((s, i) => {
  if (TENANT_ID === 'amei' && EXTRA[s.name]) return { ...s, ...EXTRA[s.name], pr: payrollRow(s) };
  const base = SLOT[s.kind] || SLOT.part;
  const id = used.has(base.id) ? `p${i}` : base.id; used.add(id);
  return { ...s, ...base, id, role: roleOf(s), pr: payrollRow(s) };
});
export const PERSON = Object.fromEntries(PEOPLE.map(p => [p.id, p]));
export const OWNER = PEOPLE[0];
export const EMPS = PEOPLE.filter(p => p.kind !== 'owner');
export const SOLO = !EMPS.length; // 只有負責人一人（AI 代班）

// 班別
export const SHIFT_TYPES = {
  early: { name: '早班', s: 8, e: 17, color: '#F0A531', desc: TENANT_ID === 'amei' ? '烘焙備料' : '開店備料' },
  mid: { name: '中班', s: 10, e: 19, color: '#2DB674', desc: '門市・接單' },
  late: { name: '晚班', s: 12, e: 21, color: '#7C62E6', desc: '晚間出貨' },
  short: { name: '短班', s: 13, e: 19, color: '#EC6A55', desc: '尖峰支援' },
  half: { name: '半班', s: 8, e: 12.5, color: '#2E97D4', desc: '上午備料' },
};
export const CYCLE = ['early', 'mid', 'late', 'short', 'half', null];

export const brk = (span) => span >= 8 ? 1 : span > 4 ? 0.5 : 0; // 勞基法 §35：連續工作 4 小時至少休息 30 分鐘
export const workH = (sh) => sh ? (sh.e - sh.s) - brk(sh.e - sh.s) : 0;
export const hm = (h) => `${String(Math.floor(h)).padStart(2, '0')}:${h % 1 ? String(Math.round((h % 1) * 60)).padStart(2, '0') : '00'}`;
export const mm = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(Math.round(min % 60)).padStart(2, '0')}`;

// 來客分布：近 8 週各星期、各小時平均訂單數
export function traffic(orders, now = new Date()) {
  const today = startOfDay(now), from = addDays(today, -56);
  const grid = Array.from({ length: 7 }, () => new Array(24).fill(0));
  for (const o of orders) {
    if (o.ts < +from || o.ts >= +today) continue;
    const d = new Date(o.ts); grid[wdOf(d)][d.getHours()] += 1;
  }
  const avg = grid.map(r => r.map(v => v / 8));
  const total = avg.map(r => r.reduce((a, b) => a + b, 0));
  return { avg, total };
}

// 某天在 [lo, hi] 間最佳 len 小時視窗
export function bestWindow(row, len, lo = 11, hi = 20) {
  let best = lo, bv = -1;
  for (let s = lo; s + len <= hi; s++) { let v = 0; for (let h = s; h < s + len; h++) v += row[h]; if (v > bv) { bv = v; best = s; } }
  return best;
}

const sh = (type, s, e) => ({ type, s: s ?? SHIFT_TYPES[type].s, e: e ?? SHIFT_TYPES[type].e });
const emptyWeek = () => Array.from({ length: 7 }, () => Object.fromEntries(PEOPLE.map(p => [p.id, null])));
const rankWeekdays = (tr) => [0, 1, 2, 3].sort((a, b) => tr.total[a] - tr.total[b]);
const has = (id) => !!PERSON[id];

// 手動草稿：阿美天天上班、小芸只休一天（做六休一）、小傑早上來錯過下午尖峰
// （其他業主同理：負責人天天上班；只有負責人時，草稿為七天無休）
export function draftSchedule(tr) {
  const [d1, d2, , d4] = rankWeekdays(tr);
  const w = emptyWeek();
  for (let d = 0; d < 7; d++) {
    w[d].mei = sh('mid');
    if (has('yun')) w[d].yun = d === d4 ? null : (d === d1 || d === d2) ? sh('half') : sh('early');
    if (has('jie')) w[d].jie = d >= 4 ? sh('short', 10, 16) : null;
  }
  return w;
}

// AI 排班：依來客曲線放人力、守一例一休、壓低加班；讓每天尖峰都有兩人
// 沒有全職員工時：負責人排休那天由兼職顧店；只有負責人時：最低來客日店休，由 AI 代接訊息與預約
export function aiSchedule(tr) {
  const [d1, d2, d3, d4] = rankWeekdays(tr);
  const w = emptyWeek();
  const jie = {};
  for (let d = 0; d < 7; d++) {
    w[d].mei = d === d1 ? null : d >= 4 ? sh('mid', 10, 20) : sh('mid');
    if (has('yun')) w[d].yun = d === d2 || d === d3 ? null : d === d1 ? sh('mid') : sh('early');
    if (has('jie')) {
      let len = 0;
      if (d >= 5) len = 6; else if (d === d1 || d === d2 || d === d3) len = 4;
      if (!has('yun') && d === d1) w[d].jie = sh('mid');
      else if (len) { const s = bestWindow(tr.avg[d], len); w[d].jie = sh('short', s, s + len); jie[d] = s; }
    }
  }
  return { week: w, rank: { d1, d2, d3, d4 }, jie };
}

// 特休（勞基法 §38）
export function annualLeaveDays(hire, now = new Date()) {
  const months = (now.getFullYear() - hire.getFullYear()) * 12 + now.getMonth() - hire.getMonth() - (now.getDate() < hire.getDate() ? 1 : 0);
  const y = months / 12;
  let days = 0;
  if (months >= 6 && y < 1) days = 3; else if (y < 2 && y >= 1) days = 7; else if (y < 3 && y >= 2) days = 10; else if (y < 5 && y >= 3) days = 14; else if (y < 10 && y >= 5) days = 15; else if (y >= 10) days = Math.min(30, 15 + Math.floor(y) - 9);
  return { months, years: Math.floor(y), rest: months % 12, days };
}
export const LEAVE_TIERS = [[0.5, 3], [1, 7], [2, 10], [3, 14], [5, 15], [10, 16]];

// 加班費（勞基法 §24：平日延長前 2 小時 ×4/3、再 2 小時 ×5/3）
export const hourlyBase = (p) => p.kind === 'part' ? p.hourly : p.pay / 240;
export function otPay(p, ot) {
  const base = hourlyBase(p);
  return Math.round(Math.min(ot, 2) * base * 4 / 3 + Math.max(0, Math.min(ot - 2, 2)) * base * 5 / 3);
}

// 打卡紀錄：9/1（上月初）起至今天，依 AI 班表（本週依目前班表）產生
export function genAttendance(now, histWeek, curWeek, leaves = []) {
  const rng = mulberry32(115_0905);
  const today = startOfDay(now), ws = weekStart(now);
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const recs = [];
  const nowMin = now.getHours() * 60 + now.getMinutes();
  for (let day = start; day <= today; day = addDays(day, 1)) {
    const wd = wdOf(day), isToday = +day === +today;
    const week = day >= ws ? curWeek : histWeek;
    for (const p of PEOPLE) {
      const s = week[wd][p.id];
      if (!s) continue;
      const lv = leaves.find(l => l.pid === p.id && +l.date === +day && l.status === 'ok' && l.kind !== 'ot');
      if (lv) { recs.push({ date: day, pid: p.id, sh: s, leave: lv.label, in: null, out: null, late: 0, hours: 0, ot: 0 }); continue; }
      const r1 = rng(), r2 = rng(), r3 = rng(), r4 = rng();
      const late = r1 < 0.09 ? 3 + Math.floor(r2 * 12) : 0;
      const inMin = s.s * 60 + (late || -(2 + Math.floor(r2 * 12)));
      let ot = 0;
      if (p.id === 'yun' && wd === 5) ot = 1.5;
      else if (p.id === 'yun' && wd === 4 && r3 < 0.55) ot = 1;
      else if (p.id === 'mei' && r3 < 0.3) ot = 0.5;
      const hours = workH(s) + ot;
      const outMin = s.e * 60 + ot * 60 + Math.floor(r4 * 7);
      const rec = { date: day, pid: p.id, sh: s, in: inMin, out: outMin, late, hours, ot: p.law && p.kind === 'full' ? ot : 0 };
      if (isToday) {
        if (nowMin < inMin) continue; // 還沒上班
        if (nowMin < outMin) { rec.out = null; rec.hours = 0; rec.ot = 0; }
      }
      recs.push(rec);
    }
  }
  // 小傑上月工時對齊 ledger（88 小時 × 時薪 200）
  const jie = PERSON.jie, pm = start.getMonth();
  if (!jie || !jie.hours) return recs;
  const list = recs.filter(r => r.pid === 'jie' && r.date.getMonth() === pm && r.out != null);
  let diff = jie.hours - list.reduce((a, r) => a + r.hours, 0), i = 0, guard = 0;
  while (Math.abs(diff) > 0.01 && list.length && guard++ < 400) {
    const r = list[i++ % list.length], step = diff > 0 ? 0.5 : -0.5;
    if (step < 0 && r.hours <= 4) continue;
    r.hours += step; r.out += step * 60; diff -= step;
  }
  return recs;
}

export { RATES };
