// 老闆的時間：休假模式、勿擾時段、工時健康、AI 省時（皆為示範資料，固定種子）
import { mulberry32, startOfDay, addDays, CHANNEL_MAP, PRODUCT_MAP } from './data.js';

export const OWNER = '阿美';
export const WD = ['一', '二', '三', '四', '五', '六', '日'];
export const wdOf = (d) => (new Date(d).getDay() + 6) % 7; // 0=週一 … 6=週日
export const md = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
export const hh = (h) => `${String(Math.floor(h) % 24).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;
export const inQuiet = (h, s, e) => (s <= e ? h >= s && h < e : h >= s || h < e);
const r1 = (v) => Math.round(v * 10) / 10;

// 近 7 天每小時的訊息量（以 store 訂單的時段分布推算：一筆訂單約 2–4 則對話，另加未成交的詢問）
const ASK_W = [0.5, 0.3, 0.1, 0.05, 0.05, 0.1, 0.3, 0.6, 0.9, 1.1, 1.2, 1.3, 1.6, 1.4, 1.1, 1.0, 1.0, 1.1, 1.2, 1.4, 1.8, 2.0, 1.8, 1.1];
export function weekMessages(orders, now = new Date()) {
  const rng = mulberry32(51021);
  const today = startOfDay(now);
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const grid = days.map(() => new Array(24).fill(0));
  const from = +days[0], to = +addDays(today, 1);
  const night = [];
  for (const o of orders) {
    if (o.ts < from || o.ts >= to || o.channel === 'pos') continue;
    const d = new Date(o.ts), di = Math.floor((startOfDay(d) - from) / 864e5);
    if (di < 0 || di > 6) continue;
    const n = 2 + Math.floor(rng() * 3);
    grid[di][d.getHours()] += n;
    const h = d.getHours();
    if (h >= 22 || h < 8) night.push(o);
  }
  for (let di = 0; di < 7; di++) for (let h = 0; h < 24; h++) if (rng() < ASK_W[h] * 0.42) grid[di][h] += 1 + Math.floor(rng() * 2);
  const total = grid.reduce((s, r) => s + r.reduce((a, b) => a + b, 0), 0);
  return { days, grid, total, night: night.sort((a, b) => b.ts - a.ts) };
}
// 勿擾與店休日擋下的訊息
export function blocked(wm, quiet) {
  let night = 0, off = 0;
  wm.days.forEach((d, di) => {
    const isOff = quiet.off.has(wdOf(d));
    wm.grid[di].forEach((n, h) => { if (isOff) off += n; else if (inQuiet(h, quiet.s, quiet.e)) night += n; });
  });
  return { night, off, total: night + off };
}

// 老闆近 7 天工時（依打卡＋系統使用時間模擬）
const NIGHT_PLAN = [1, 1, 0, 1, 1, 0, 1]; // 哪幾天深夜還在工作
const NIGHT_WHAT = ['回 LINE 訊息', '回客人訊息、確認訂單', '對帳', '記帳、整理發票', '回 Instagram 私訊', '補登進貨單', '回 WhatsApp 詢價'];
export function workWeek(now = new Date()) {
  const rng = mulberry32(60317);
  const today = startOfDay(now);
  const q = (v) => Math.round(v * 4) / 4;
  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(today, i - 6), wd = wdOf(date);
    const segs = [];
    const start = q(wd === 6 ? 10 + rng() * 0.5 : 8.75 + rng() * 0.5);
    const end = q(wd === 6 ? 14.5 + rng() * 0.5 : 17.75 + rng() * 1);
    segs.push([start, 12, 'day'], [13, end, 'day']);
    if (rng() < 0.75) segs.push([20, q(21 + rng() * 0.5), 'eve']);
    let latest = null, what = null;
    if (NIGHT_PLAN[i]) { const s = q(22.25 + rng() * 0.5), e = q(23.25 + rng() * 1.25); segs.push([s, e, 'night']); latest = e; what = NIGHT_WHAT[i]; }
    // 6 時 ～ 次日 2 時（索引 0..19 對應 6..25 時）
    const mins = new Array(20).fill(0);
    let day = 0, eve = 0, nightH = 0;
    for (const [s, e, k] of segs) {
      for (let h = 6; h < 26; h++) { const ov = Math.max(0, Math.min(e, h + 1) - Math.max(s, h)); mins[h - 6] += Math.round(ov * 60); }
      if (k === 'day') day += e - s; else if (k === 'eve') eve += e - s; else nightH += e - s;
    }
    days.push({ date, wd, mins, day, eve, night: nightH, total: day + eve + nightH, latest, what, start, end });
  }
  const total = r1(days.reduce((s, d) => s + d.total, 0));
  const nights = days.filter(d => d.night > 0);
  const latest = nights.reduce((m, d) => (d.latest > m.latest ? d : m), nights[0]);
  const streak = 19; // 上一次整天休息是 19 天前
  return { days, total, nightCount: nights.length, nightH: r1(nights.reduce((s, d) => s + d.night, 0)), latest, streak, lastOff: addDays(today, -streak) };
}

// 「AI 本週幫你省下的時間」拆解
export function savedTime(orders, purchases, wm, now = new Date()) {
  const today = startOfDay(now), from = +addDays(today, -6), to = +addDays(today, 1);
  const wo = orders.filter(o => o.ts >= from && o.ts < to);
  const wp = purchases.filter(p => p.ts >= from && p.ts < to);
  const online = wo.filter(o => o.channel !== 'pos').length;
  const rows = [
    { id: 'reply', name: '回覆訊息', icon: 'chat', color: '#2DB674', min: wm.total * 1.6, detail: `AI 自動回覆 ${wm.total} 則訊息（5 種語言）` },
    { id: 'books', name: '記帳', icon: 'book', color: '#2E97D4', min: (wo.length + wp.length) * 1.1, detail: `${wo.length + wp.length} 筆收入與進貨自動入帳` },
    { id: 'recon', name: '對帳', icon: 'bank', color: '#7C62E6', min: online * 1.4 + 20, detail: `${online} 筆線上收款自動比對銀行與金流` },
    { id: 'invoice', name: '開發票', icon: 'receipt', color: '#F0A531', min: wo.length * 0.9, detail: `自動開立 ${wo.length} 張電子發票` },
    { id: 'shift', name: '排班', icon: 'calendar', color: '#DD5597', min: 85, detail: '3 人班表與工時自動排好、算好' },
    { id: 'tax', name: '報稅整理', icon: 'tax', color: '#5EE0C4', min: 70, detail: '營業稅進銷項自動歸檔（每週攤提）' },
  ].map(r => ({ ...r, h: r1(r.min / 60) }));
  const total = r1(rows.reduce((s, r) => s + r.h, 0));
  return { rows, total, days: r1(total / 8), orders: wo.length };
}

// 休假期間預估
export function vacationEstimate(orders, days, now = new Date()) {
  const today = startOfDay(now);
  const recent = orders.filter(o => o.ts >= +addDays(today, -28) && o.ts < +today);
  const perDay = recent.length / 28;
  const onlinePerDay = recent.filter(o => o.channel !== 'pos').length / 28;
  const ord = Math.round(onlinePerDay * days * 0.92);
  const msgs = Math.round(ord * 3.1 + days * 11);
  const ship = Math.round(onlinePerDay * days * 0.6);
  const hi = Math.max(1, Math.min(4, Math.round(days * 0.3)));
  return { perDay, ord, msgs, ship, lo: 0, hi };
}

// 會被順延出貨的宅配客人（取近期線上訂單客名作示意）
export function shipSamples(orders, n = 3) {
  const out = [], seen = new Set();
  for (let i = orders.length - 1; i >= 0 && out.length < n; i--) {
    const o = orders[i];
    if (o.channel === 'pos' || seen.has(o.customer)) continue;
    seen.add(o.customer); out.push(o);
  }
  return out;
}

export function nightSample(o) {
  const it = o.items[0], p = PRODUCT_MAP[it.pid];
  const ch = CHANNEL_MAP[o.channel];
  return { ch: o.channel, chName: ch ? ch.name : o.channel, who: o.customer, t: new Date(o.ts), text: `問「${p.name}」還有沒有、怎麼寄`, done: `AI 已回覆並成立訂單 ${o.id.slice(-4)}` };
}

// 供應商（與進貨資料一致；生鮮類需要暫停）
export const SUPPLIERS = [
  { name: '北海乳品貿易', item: '發酵奶油、鮮奶油', fresh: true },
  { name: '大湖果園合作社', item: '當季水果', fresh: true },
  { name: '綠野冷鏈物流', item: '冷藏宅配收件', fresh: true },
];

// 急件規則
export const URGENT = [
  { id: 'allergy', name: '過敏反應、食安問題', desc: '客人說吃了不舒服、過敏', icon: 'alert', lock: true, on: true },
  { id: 'complaint', name: '客訴', desc: '情緒強烈、要求找老闆本人', icon: 'heart', on: true },
  { id: 'refund', name: '退款／退貨', desc: '需要你同意才能退錢', icon: 'coins', on: true },
  { id: 'big', name: '大額訂單', desc: '單筆超過門檻', icon: 'cart', on: true, amount: 10000 },
  { id: 'b2b', name: '企業／團購詢價', desc: '50 盒以上或需要報價', icon: 'users', on: false },
];

// 休假中的一天（模擬訊息流）
export const DAY_SIM = [
  { t: '08:12', ch: 'line', who: '林小姐', msg: '檸檬塔現在訂什麼時候會到？', kind: 'ai', ai: '告知休假期間，訂單於回來後第一天出貨，已成立預購' },
  { t: '09:40', ch: 'zalo', who: 'Trần Minh Anh', msg: 'Shop có giao bánh dứa trong tuần này không?', kind: 'ai', ai: '用越南文說明休假期間與恢復出貨日' },
  { t: '11:05', ch: 'web', who: '陳先生', msg: '想訂 6 吋芋泥巴斯克，週六門市取', kind: 'ai', ai: '門市休假中，改約回來後的取貨時段並收訂金' },
  { t: '13:28', ch: 'line', who: '王太太', msg: '昨天買的生乳捲，小孩吃完嘴巴腫起來…', kind: 'urgent', rule: 'allergy', ai: '先安撫並請客人就醫，立即推播給你' },
  { t: '15:50', ch: 'whatsapp', who: 'Daniel Tan', msg: 'Can I get 30 gift boxes for our office?', kind: 'ai', ai: '提供企業禮盒報價單，回來後由你確認', rule: 'b2b' },
  { t: '17:16', ch: 'messenger', who: '蔡小姐', msg: '收到的盒子壓壞了，我要退款', kind: 'urgent', rule: 'refund', ai: '已收照片、先致歉，需你同意退款' },
  { t: '20:42', ch: 'phone', who: '張小姐', msg: '公司尾牙要訂 40 盒鳳梨酥', kind: 'urgent', rule: 'big', ai: '金額 NT$ 19,200，超過門檻，推播給你' },
  { t: '23:58', ch: 'line', who: '佐藤 ゆき', msg: '発送はいつになりますか？', kind: 'ai', ai: '用日文回覆恢復出貨日，不吵醒你' },
];

// 公告文案（多語）
export const LANGS = [['zh', '中文'], ['ja', '日本語'], ['en', 'English'], ['vi', 'Tiếng Việt'], ['ms', 'Melayu']];
export const REASONS = [['rest', '休息充電'], ['travel', '出國'], ['family', '家裡有事'], ['sick', '身體不適']];
const NOTICE = {
  zh: { title: '休假公告', shop: '阿美手作甜點',
    r: { rest: '', travel: '老闆出國進修，', family: '因家中有事，', sick: '因老闆身體微恙需要休養，' },
    body: (r, s, e, b, pick) => `${r}阿美手作甜點於 ${s}–${e} 暫停出貨${pick ? '與門市取貨' : ''}，${b} 起恢復。休假期間照常可以下單，AI 店員 24 小時為您服務，訂單將於 ${b} 起依序出貨。謝謝您的體諒！` },
  ja: { title: '臨時休業のお知らせ', shop: 'Amei 手作りスイーツ',
    r: { rest: '', travel: '店主の海外研修のため、', family: '家庭の事情により、', sick: '店主の体調不良のため、' },
    body: (r, s, e, b, pick) => `${r}${s}〜${e} の間、発送${pick ? 'と店頭受け取り' : ''}をお休みします（${b} より再開）。休業中もご注文は受け付けており、AI スタッフが 24 時間対応いたします。ご注文は ${b} より順次発送いたします。` },
  en: { title: 'Holiday Notice', shop: "Amei's Handmade Desserts",
    r: { rest: '', travel: 'While our owner is traveling abroad, ', family: 'Due to a family matter, ', sick: 'As our owner is taking time to recover, ' },
    body: (r, s, e, b, pick) => `${r}${r ? 'we' : 'We'} will pause shipping${pick ? ' and in-store pickup' : ''} from ${s} to ${e}, resuming ${b}. You can still order anytime — our AI assistant is here 24/7, and orders will ship in sequence from ${b}. Thank you for understanding!` },
  vi: { title: 'Thông báo nghỉ', shop: "Amei's Handmade Desserts",
    r: { rest: '', travel: 'Do chủ tiệm đi nước ngoài, ', family: 'Do việc gia đình, ', sick: 'Do chủ tiệm cần nghỉ ngơi, ' },
    body: (r, s, e, b, pick) => `${r}${r ? 'tiệm' : 'Tiệm'} tạm ngưng giao hàng${pick ? ' và nhận hàng tại cửa hàng' : ''} từ ${s} đến ${e}, hoạt động lại từ ${b}. Bạn vẫn có thể đặt hàng bất cứ lúc nào — trợ lý AI phục vụ 24/7, đơn hàng sẽ được giao lần lượt từ ${b}. Cảm ơn bạn đã thông cảm!` },
  ms: { title: 'Notis Cuti', shop: "Amei's Handmade Desserts",
    r: { rest: '', travel: 'Memandangkan pemilik ke luar negara, ', family: 'Atas urusan keluarga, ', sick: 'Memandangkan pemilik perlu berehat, ' },
    body: (r, s, e, b, pick) => `${r}${r ? 'kami' : 'Kami'} berhenti sementara penghantaran${pick ? ' dan pengambilan di kedai' : ''} dari ${s} hingga ${e}, dan dibuka semula pada ${b}. Anda masih boleh membuat pesanan bila-bila masa — pembantu AI kami sedia 24/7, dan pesanan dihantar mengikut giliran mulai ${b}. Terima kasih!` },
};
export function notice(lang, reason, s, e, b, pick = true) {
  const N = NOTICE[lang];
  return { title: N.title, shop: N.shop, body: N.body(N.r[reason], md(s), md(e), md(b), pick) };
}

// 代理人
export const PROXIES = [
  { id: 'mom', name: '阿美媽媽', rel: '家人', phone: '0912-***-618', color: '#DD5597', initial: '媽' },
  { id: 'cpa', name: '陳記帳士', rel: '記帳士', phone: '0935-***-207', color: '#2E97D4', initial: '陳' },
  { id: 'yun', name: '小芸', rel: '全職烘焙助理', phone: '0968-***-441', color: '#5EE0C4', initial: '芸' },
];
