// 預約與訂金：模擬資料（全部虛構，僅供示範）
// 以固定種子產生「本月前一週」到「未來六週」的預約，日期相對於今天，讓每次載入一致。
import { mulberry32, startOfDay, addDays, PRODUCTS } from './data.js';
import { pad } from './util.js';

export const TYPES = {
  cake: { name: '客製蛋糕', short: '蛋糕', color: '#DD5597', icon: 'heart' },
  pickup: { name: '門市取貨', short: '取貨', color: '#2E97D4', icon: 'box' },
  class: { name: '烘焙小班課', short: '課程', color: '#F0A531', icon: 'users' },
};

export const OPEN_H = 10, CLOSE_H = 19; // 行事曆顯示 10:00–19:00
export const SLOT_MIN = 30;
export const DOW_ZH = ['日', '一', '二', '三', '四', '五', '六'];
const DOW = {
  zh: ['日', '一', '二', '三', '四', '五', '六'],
  ja: ['日', '月', '火', '水', '木', '金', '土'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  vi: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
  ms: ['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'],
};
export const LANG_NAME = { zh: '中文', ja: '日本語', en: 'English', vi: 'Tiếng Việt', ms: 'Bahasa Melayu' };
export const CH_NAME = { line: 'LINE', web: '官網', pos: '門市', phone: '電話', whatsapp: 'WhatsApp', zalo: 'Zalo', messenger: 'Messenger' };

export const DEFAULT_RULES = {
  depositPct: 50,        // 客製蛋糕訂金比例
  leadDays: 3,           // 客製蛋糕最晚幾天前預訂
  fullRefundDays: 7,     // N 天前取消全額退
  noRefundDays: 3,       // N 天內取消不退
  midRefundPct: 50,      // 中間區間退幾成
  allowMoveOnce: true,   // 3 天內不退但可改期一次
  remindEve: true,       // 前一天 20:00 LINE 提醒
  remind2h: true,        // 當天 2 小時前提醒
  remindMap: true,       // 提醒附地圖與停車資訊
  slotCap: 4,            // 每 30 分鐘取貨上限
  cakeCap: 3,            // 每天客製蛋糕產能
  closed: [2],           // 公休日（0=日）
  classSeats: 6,
  classPrice: 1200,
  waitlistAuto: true,    // 有人取消自動通知候補
};

export const weekStart = (d) => { const x = startOfDay(d); return addDays(x, -((x.getDay() + 6) % 7)); };
export const sameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime();
export const hm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const mdw = (d) => `${d.getMonth() + 1}/${d.getDate()}（${DOW_ZH[d.getDay()]}）`;

// 依客人語言輸出日期時間
export function whenIn(lang, d) {
  const md = `${d.getMonth() + 1}/${d.getDate()}`;
  const w = (DOW[lang] || DOW.zh)[d.getDay()];
  if (lang === 'en') return `${w} ${md}, ${hm(d)}`;
  if (lang === 'vi' || lang === 'ms') return `${w} ${md} ${hm(d)}`;
  return `${md}（${w}）${hm(d)}`;
}

const CUSTOMERS = [
  ['林小姐', 'zh', 'line'], ['陳先生', 'zh', 'phone'], ['王太太', 'zh', 'line'], ['張小姐', 'zh', 'web'], ['李先生', 'zh', 'pos'],
  ['黃小姐', 'zh', 'line'], ['吳媽媽', 'zh', 'line'], ['劉先生', 'zh', 'messenger'], ['蔡小姐', 'zh', 'line'], ['許先生', 'zh', 'phone'],
  ['鄭小姐', 'zh', 'web'], ['謝先生', 'zh', 'line'], ['周小姐', 'zh', 'messenger'], ['楊先生', 'zh', 'pos'], ['郭小姐', 'zh', 'line'],
  ['佐藤 ゆき', 'ja', 'line'], ['田中 さくら', 'ja', 'line'], ['鈴木 健', 'ja', 'web'], ['高橋 美咲', 'ja', 'line'],
  ['Daniel Tan', 'en', 'whatsapp'], ['Hannah K.', 'en', 'messenger'], ['Kevin Lim', 'en', 'web'],
  ['Nguyễn Thị Lan', 'vi', 'zalo'], ['Trần Minh Anh', 'vi', 'zalo'],
  ['Aisyah R.', 'ms', 'whatsapp'], ['Farah N.', 'ms', 'whatsapp'],
];

export const CAKE_SIZES = [{ size: '6 吋', price: 1400 }, { size: '8 吋', price: 1900 }];
const CAKE_FLAVORS = ['草莓鮮奶油', '芋泥奶霜', '伯爵茶戚風', '檸檬乳酪', '巧克力莓果'];
const CAKE_NOTES = [
  '蛋糕寫 Happy Birthday 小米', '插數字蠟燭「5」、加一組生日帽', '巧克力牌寫「爸爸生日快樂」', '少糖、不要含酒精',
  '寫「お誕生日おめでとう」（AI 已翻譯確認）', '寫 Happy 30th Mei，要附刀叉 6 份', '水果不要奇異果（過敏）', '要做成小熊造型，附照片參考',
  '寫「結婚週年快樂」，盒子加緞帶', '不要堅果（家中小孩過敏）',
];
const PICKUP_NOTES = ['', '', '', '請幫忙分裝 2 袋', '要送禮，請附提袋與賀卡', '會晚 10 分鐘到', '請附保冷劑', ''];
export const CLASS_TITLES = ['檸檬塔入門', '草莓生乳捲', '伯爵可麗露', '親子手工餅乾'];
const ALLERGY = ['', '', '', '', '堅果過敏', '不吃蛋', '乳糖不耐'];

function pickCust(rng, pool = CUSTOMERS) { const c = pool[Math.floor(rng() * pool.length)]; return { customer: c[0], lang: c[1], channel: c[2] }; }

// 產生全部預約
export function buildBookings(now = new Date()) {
  const rng = mulberry32(20261005);
  const T0 = startOfDay(now);
  const from = addDays(weekStart(new Date(T0.getFullYear(), T0.getMonth(), 1)), -7);
  const to = addDays(weekStart(T0), 7 * 7);
  const list = [];
  const classes = [];
  let seq = 1001, wk = 0;
  for (let d = new Date(from); d < to; d = addDays(d, 1)) {
    const dow = d.getDay();
    if (DEFAULT_RULES.closed.includes(dow)) continue;
    const weekend = dow === 0 || dow === 6;
    const firstSlot = weekend ? 6 : 2;               // 週末 13:00 起取貨（上午是課程），平日 11:00 起
    const slots = (CLOSE_H - OPEN_H) * 2;
    const used = new Map();
    const takeSlot = () => {
      for (let k = 0; k < 20; k++) {
        const s = firstSlot + Math.floor(rng() * (slots - firstSlot));
        const n = used.get(s) || 0;
        if (n < 3) { used.set(s, n + 1); return s; }
      }
      return firstSlot;
    };
    const at = (s) => { const x = new Date(d); x.setHours(OPEN_H, s * SLOT_MIN, 0, 0); return x; };
    const past = (t) => t.getTime() < now.getTime();

    // 課程（週六、週日上午）
    if (weekend) {
      const start = new Date(d); start.setHours(10, 0, 0, 0);
      const title = CLASS_TITLES[(wk + (dow === 0 ? 1 : 0)) % CLASS_TITLES.length];
      const seats = DEFAULT_RULES.classSeats;
      let target = past(start) ? 5 + Math.floor(rng() * 2) : 2 + Math.floor(rng() * 5);
      const roster = [];
      const pool = CUSTOMERS.slice();
      let taken = 0;
      while (taken < target) {
        const c = pickCust(rng, pool);
        pool.splice(pool.findIndex(p => p[0] === c.customer), 1);
        const pax = (target - taken >= 2 && rng() < 0.3) ? 2 : 1;
        roster.push({ ...c, pax, allergy: ALLERGY[Math.floor(rng() * ALLERGY.length)], paid: true, notified: false });
        taken += pax;
      }
      const waitlist = [];
      if (taken >= seats && !past(start)) {
        const n = Math.floor(rng() * 3);
        for (let i = 0; i < n; i++) { const c = pickCust(rng, pool); pool.splice(pool.findIndex(p => p[0] === c.customer), 1); waitlist.push({ ...c, pax: 1 }); }
      }
      const cls = { id: `CL-${seq++}`, type: 'class', start, dur: 150, title, seats, price: DEFAULT_RULES.classPrice, roster, waitlist,
        status: past(start) ? 'done' : 'confirmed', noticeSent: past(start) };
      classes.push(cls); list.push(cls);
    }
    if (dow === 0) wk++;

    // 客製蛋糕
    const nCake = weekend ? 1 + Math.floor(rng() * 3) : Math.floor(rng() * 3);
    for (let i = 0; i < Math.min(nCake, DEFAULT_RULES.cakeCap); i++) {
      const c = pickCust(rng);
      const sz = CAKE_SIZES[rng() < 0.7 ? 0 : 1];
      const flavor = CAKE_FLAVORS[Math.floor(rng() * CAKE_FLAVORS.length)];
      const start = at(takeSlot());
      const price = sz.price + (rng() < 0.3 ? 100 : 0);
      const deposit = Math.round(price * DEFAULT_RULES.depositPct / 100);
      const isPast = past(start);
      const r = rng();
      list.push({ id: `BK-${seq++}`, type: 'cake', start, dur: 30, ...c, item: `${sz.size}${flavor}蛋糕`, price, deposit,
        depStatus: isPast ? 'paid' : (r < 0.72 ? 'paid' : 'pending'),
        status: isPast ? (rng() < 0.04 ? 'noshow' : 'done') : 'confirmed',
        note: CAKE_NOTES[Math.floor(rng() * CAKE_NOTES.length)], moved: 0 });
    }

    // 門市取貨
    const nPick = weekend ? 5 + Math.floor(rng() * 4) : 3 + Math.floor(rng() * 4);
    for (let i = 0; i < nPick; i++) {
      const c = pickCust(rng);
      const items = [];
      const k = 1 + Math.floor(rng() * 2);
      for (let j = 0; j < k; j++) { const p = PRODUCTS[Math.floor(rng() * PRODUCTS.length)]; if (!items.find(x => x.p === p)) items.push({ p, qty: 1 + Math.floor(rng() * 2) }); }
      const price = items.reduce((s, x) => s + x.p.price * x.qty, 0);
      const start = at(takeSlot());
      const isPast = past(start);
      const prepaid = rng() < 0.55;
      list.push({ id: `BK-${seq++}`, type: 'pickup', start, dur: 30, ...c,
        item: items.map(x => `${x.p.name} ×${x.qty}`).join('、'), price, deposit: 0,
        depStatus: prepaid ? 'full' : 'na',
        status: isPast ? (rng() < 0.03 ? 'noshow' : 'done') : 'confirmed',
        note: PICKUP_NOTES[Math.floor(rng() * PICKUP_NOTES.length)], moved: 0 });
    }
  }

  // 示範情境需要的固定資料
  const future = classes.filter(c => c.start.getTime() > now.getTime() + 2 * 864e5);
  // 改期情境：陳先生下一個週末前的客製蛋糕
  let sat = addDays(T0, 3); while (sat.getDay() !== 6) sat = addDays(sat, 1);
  const chenAt = new Date(sat); chenAt.setHours(14, 0, 0, 0);
  list.push({ id: 'BK-0888', type: 'cake', start: chenAt, dur: 30, customer: '陳先生', lang: 'zh', channel: 'line', item: '8 吋巧克力莓果蛋糕', price: 1900,
    deposit: 950, depStatus: 'paid', status: 'confirmed', note: '巧克力牌寫「爸爸生日快樂」，附 6 份刀叉', moved: 0, fixed: 'chen' });
  // 取消情境：Daniel 報名的課程設為額滿＋候補兩位
  const fullCls = future.slice().sort((a, b) => Math.abs(daysBetween(T0, a.start) - 5) - Math.abs(daysBetween(T0, b.start) - 5))[0];
  if (fullCls) {
    fullCls.roster = fullCls.roster.filter(r => r.customer !== 'Daniel Tan' && r.customer !== '郭小姐' && r.customer !== 'Nguyễn Thị Lan');
    let n = fullCls.roster.reduce((s, r) => s + r.pax, 0);
    while (n > 5) { const r = fullCls.roster.pop(); n -= r.pax; }
    while (n < 5) { fullCls.roster.push({ customer: ['蔡小姐', '黃小姐', '鈴木 健', '楊先生', '周小姐'][n], lang: n === 2 ? 'ja' : 'zh', channel: 'line', pax: 1, allergy: '', paid: true, notified: false }); n++; }
    fullCls.roster.push({ customer: 'Daniel Tan', lang: 'en', channel: 'whatsapp', pax: 1, allergy: '', paid: true, notified: false, fixed: 'daniel' });
    fullCls.waitlist = [{ customer: '郭小姐', lang: 'zh', channel: 'line', pax: 1 }, { customer: 'Nguyễn Thị Lan', lang: 'vi', channel: 'zalo', pax: 1 }];
    fullCls.fixed = 'full';
  }
  return { list: list.sort((a, b) => a.start - b.start), classes };
}

export const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / 864e5);
export const classTaken = (c) => c.roster.reduce((s, r) => s + r.pax, 0);

// 爽約率趨勢（近 10 週，第 5 週起啟用 AI 提醒）
export const NOSHOW_TREND = [15.2, 14.1, 16.0, 13.8, 7.6, 5.4, 4.3, 3.7, 3.2, 2.9];
export const NOSHOW_AI_WEEK = 4;

// 改期通知（客人語言）
export function moveNotice(lang, name, when) {
  return ({
    zh: `${name} 您好，您的預約已改到 ${when}，當天見！需要調整直接回覆這則訊息就可以。`,
    ja: `${name}様、ご予約を ${when} に変更いたしました。当日お待ちしております。`,
    en: `Hi ${name}, your booking has been moved to ${when}. See you then!`,
    vi: `Chào ${name}, lịch hẹn của bạn đã được đổi sang ${when}. Hẹn gặp bạn!`,
    ms: `Hai ${name}, tempahan anda telah dipindahkan ke ${when}. Jumpa nanti!`,
  })[lang] || '';
}
// 課前通知（客人語言）
export function classNotice(lang, name, when, title) {
  return ({
    zh: `${name} 您好，提醒您 ${when}「${title}」課程，地點在阿美手作甜點工作室。圍裙與材料我們準備，有過敏請先告訴我們。`,
    ja: `${name}様、${when}「${title}」クラスのご案内です。エプロンと材料はご用意しております。アレルギーがあれば事前にお知らせください。`,
    en: `Hi ${name}, a reminder for "${title}" on ${when}. Aprons and ingredients are provided — please tell us about any allergies.`,
    vi: `Chào ${name}, nhắc bạn lớp "${title}" vào ${when}. Tạp dề và nguyên liệu đã được chuẩn bị sẵn.`,
    ms: `Hai ${name}, peringatan kelas "${title}" pada ${when}. Apron dan bahan disediakan.`,
  })[lang] || '';
}
// 候補遞補通知
export function waitNotice(lang, name, when, title) {
  return ({
    zh: `${name} 您好，「${title}」${when} 有空位了！已先幫您保留 12 小時，點連結付款即完成報名。`,
    ja: `${name}様、「${title}」${when} に空きが出ました。12時間お席を確保しています。`,
    en: `Hi ${name}, a seat just opened for "${title}" on ${when}. We're holding it for 12 hours.`,
    vi: `Chào ${name}, lớp "${title}" ${when} vừa có chỗ trống! Chúng tôi giữ chỗ cho bạn trong 12 giờ.`,
    ms: `Hai ${name}, ada tempat kosong untuk "${title}" pada ${when}. Kami simpan selama 12 jam.`,
  })[lang] || '';
}
