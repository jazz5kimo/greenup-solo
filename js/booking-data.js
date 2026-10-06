// 預約與訂金：模擬資料（全部虛構，僅供示範）
// 以固定種子產生「本月前一週」到「未來六週」的預約，日期相對於今天，讓每次載入一致。
import { mulberry32, startOfDay, addDays, PRODUCTS } from './data.js';
import { pad } from './util.js';
import { TENANT } from './tenant.js';
import { IS_AMEI, CAT, FOODISH, KIT } from './inventory-data.js';

// ── 用語：阿美沿用原本；其他業主依業態大類（service＝以服務預約為主） ──
const A_W = { main: '客製蛋糕', ms: '蛋糕', mu: '個', cap: '產能', at: '取貨', pick: '門市取貨', pickSlot: '門市取貨時段', pv: '取貨', cls: '烘焙小班課', clsShort: '烘焙課', clsWeek: '週末烘焙小班課', clsEn: 'baking class', order: '訂蛋糕', exItem: '6 吋蛋糕', dv: '交貨', notMade: '太趕做不出來，AI 會婉拒並推薦現貨', owe: '欠客人一個蛋糕', atJa: 'お受け取り' };
const G_W = {
  food: { main: '團體訂餐', ms: '團餐', mu: '組', cap: '接單量', at: '用餐', pick: '外帶取餐', pickSlot: '外帶取餐時段', pv: '取餐', cls: '料理小班課', clsShort: '料理課', clsWeek: '週末料理小班課', clsEn: 'cooking class', order: '訂團餐', dv: '出餐', notMade: '太趕備不了料，AI 會婉拒並推薦現點餐點', owe: '欠客人一頓餐', atJa: 'ご利用日時' },
  drink: { main: '客製禮盒', ms: '禮盒', mu: '份', cap: '製作量', at: '取貨', pick: '門市取貨', pickSlot: '門市取貨時段', pv: '取貨', cls: '品飲小班課', clsShort: '品飲課', clsWeek: '週末品飲小班課', clsEn: 'tasting class', order: '訂禮盒', dv: '交貨', notMade: '太趕做不出來，AI 會婉拒並推薦現貨', owe: '欠客人一份禮盒', atJa: 'お受け取り' },
  dessert: { main: '客製糕點', ms: '糕點', mu: '份', cap: '產能', at: '取貨', pick: '門市取貨', pickSlot: '門市取貨時段', pv: '取貨', cls: '手作小班課', clsShort: '手作課', clsWeek: '週末手作小班課', clsEn: 'workshop', order: '訂糕點', dv: '交貨', notMade: '太趕做不出來，AI 會婉拒並推薦現貨', owe: '欠客人一份糕點', atJa: 'お受け取り' },
  retail: { main: '客製禮盒', ms: '禮盒', mu: '份', cap: '包裝量', at: '取貨', pick: '門市取貨', pickSlot: '門市取貨時段', pv: '取貨', cls: '選物體驗課', clsShort: '體驗課', clsWeek: '週末體驗課', clsEn: 'workshop', order: '訂禮盒', dv: '交貨', notMade: '太趕包裝不及，AI 會婉拒並推薦現貨', owe: '欠客人一份禮盒', atJa: 'お受け取り' },
  craft: { main: '客製訂製', ms: '訂製', mu: '件', cap: '工時', at: '取件', pick: '門市取件', pickSlot: '門市取件時段', pv: '取件', cls: '手作體驗課', clsShort: '手作課', clsWeek: '週末手作體驗課', clsEn: 'workshop', order: '訂製', dv: '交件', notMade: '工期不夠做不出來，AI 會婉拒並推薦現貨', owe: '欠客人一件作品', atJa: 'お受け取り' },
  flower: { main: '客製花禮', ms: '花禮', mu: '件', cap: '產能', at: '取花', pick: '門市取花', pickSlot: '門市取花時段', pv: '取花', cls: '花藝小班課', clsShort: '花藝課', clsWeek: '週末花藝小班課', clsEn: 'floral workshop', order: '訂花', dv: '交花', notMade: '太趕備不到花材，AI 會婉拒並推薦現貨花束', owe: '欠客人一束花', atJa: 'お受け取り' },
  service: { main: '服務預約', ms: '預約', mu: '位', cap: '可預約名額', at: '預約', pick: '快速服務', pickSlot: '快速服務時段', pv: '到店', cls: '小班體驗課', clsShort: '體驗課', clsWeek: '週末小班體驗課', clsEn: 'workshop', order: '預約', dv: '完成服務', notMade: '時段太趕排不進來，AI 會婉拒並推薦其他時段', owe: '欠客人一次服務', atJa: 'ご来店日時' },
  farm: { main: '預購箱', ms: '預購', mu: '箱', cap: '採收量', at: '取貨', pick: '門市取貨', pickSlot: '門市取貨時段', pv: '取貨', cls: '農場體驗課', clsShort: '體驗課', clsWeek: '週末農場體驗', clsEn: 'farm experience', order: '預購', dv: '交貨', notMade: '採收量不夠，AI 會婉拒並推薦現貨', owe: '欠客人一箱農產', atJa: 'お受け取り' },
}[CAT];
export const W = IS_AMEI ? A_W : G_W;
W.capN = IS_AMEI ? '蛋糕產能' : CAT === 'service' ? W.cap : W.ms + W.cap;
const r10b = (n) => Math.max(10, Math.round(n / 10) * 10);
const svcLike = (p) => /次|堂|位|晚|小時|節|趟|場|人/.test(String(p.unit || '')) || /分鐘|小時/.test(String(p.desc || ''));
const POPB0 = IS_AMEI ? [] : KIT.byPop().filter(p => !/券|卡$/.test(p.name));
// 預約服務業：優先用「服務型」品項（以次／堂／晚計、或描述含時間）
const POPB = CAT === 'service' && POPB0.filter(svcLike).length >= 2 ? POPB0.filter(svcLike) : POPB0;
const PB = (i) => POPB.length ? POPB[i % POPB.length] : PRODUCTS[0];
const minsOf = (p) => { const m = String(p?.desc || '').match(/(\d{2,3})\s*分鐘/); return m ? +m[1] : 60; };
// 主要預約品項（尺寸／價格）、備註、課程（其他業主）
const G = IS_AMEI ? null : (() => {
  const lpx = (p) => p.listPrice ?? p.price;
  let items;
  if (CAT === 'service') items = POPB.slice(0, 5).map(p => ({ item: p.name, price: lpx(p), dur: minsOf(p) }));
  else if (CAT === 'food') items = POPB.slice(0, 4).flatMap(p => [{ item: `10 人份${KIT.short(p)}團餐`, price: r10b(lpx(p) * 10 * 0.95), dur: 30 }, { item: `20 人份${KIT.short(p)}團餐`, price: r10b(lpx(p) * 20 * 0.9), dur: 30 }]);
  else items = POPB.slice(0, 4).flatMap(p => [{ item: `客製${KIT.short(p)}`, price: r10b(lpx(p) * 1.3), dur: 30 }, { item: `客製${KIT.short(p)}（加大）`, price: r10b(lpx(p) * 1.8), dur: 30 }]);
  if (!items.length) items = [{ item: W.main, price: 1200, dur: 30 }];
  const NOTES = {
    food: ['不要香菜', '分裝外帶', '其中 2 位吃素', '要開統編', '辣度降低', '12:00 準時取'],
    drink: ['附送禮卡片「生日快樂」', '要開統編', '研磨成手沖粗細', '附提袋 3 個', '要燙金貼紙', '低糖'],
    dessert: ['卡片寫「Happy Birthday 小米」', '少糖', '附刀叉 6 份', '不要堅果（家中小孩過敏）', '盒子加緞帶', '要開統編'],
    retail: ['禮物包裝・附卡片', '要開統編', '拆吊牌', '分開包 3 份', '附提袋', '指定色系：大地色'],
    craft: ['刻字「YUI」', '刻字「2026.10」', '深咖啡色', '附保養油', '禮盒包裝', '加長背帶'],
    flower: ['粉色系・附卡片', '不要百合（花粉過敏）', '卡片寫「生日快樂」', '白綠色系', '要加花瓶', '送到公司櫃台'],
    service: ['第一次來，想要簡約風格', '指定上次的款式', '皮膚較敏感，請溫和處理', '會晚 10 分鐘到', '想加購保養', '需要停車資訊'],
    farm: ['要禮盒包裝', '要開統編', '分 2 箱寄送', '挑大顆一點', '附食譜', '冷藏宅配'],
  }[CAT];
  const PICK = CAT === 'service' ? ['', '', '想順便諮詢保養', '會晚 10 分鐘到', '', ''] : ['', '', '', '請幫忙分裝 2 袋', '要送禮，請附提袋', '會晚 10 分鐘到', '', ''];
  const sh = (i) => KIT.short(PB(i));
  const kid = { food: '親子料理課', drink: '親子品飲課', dessert: '親子手作課', retail: '親子手作課', craft: '親子手作課', flower: '親子花藝課', service: '親子體驗課', farm: '親子採收體驗' }[CAT];
  const titles = [`${sh(0)}入門`, `${sh(1)}手作`, kid, `${sh(2)}進階`];
  const allergy = FOODISH ? ['', '', '', '', '堅果過敏', '不吃蛋', '乳糖不耐'] : CAT === 'flower' ? ['', '', '', '', '花粉過敏', '初學者'] : CAT === 'service' ? ['', '', '', '', '皮膚敏感', '初學者'] : ['', '', '', '', '左撇子', '初學者'];
  const classPrice = CAT === 'service' ? Math.max(800, r10b(lpx(PB(0)) * 0.9)) : CAT === 'craft' ? 1500 : CAT === 'flower' ? 1600 : CAT === 'retail' ? 1000 : 1200;
  const rules = CAT === 'service' ? { depositPct: 30, leadDays: 1, cakeCap: 6, slotCap: 2, closed: [1] } : CAT === 'craft' ? { leadDays: 7, cakeCap: 2 } : CAT === 'food' ? { leadDays: 2, cakeCap: 3 } : CAT === 'flower' ? { leadDays: 2, cakeCap: 4 } : {};
  return { items, NOTES, PICK, titles, allergy, classPrice, rules };
})();

export const TYPES = {
  cake: { name: W.main, short: W.ms, color: '#DD5597', icon: 'heart' },
  pickup: { name: W.pick, short: W.pv, color: '#2E97D4', icon: 'box' },
  class: { name: W.cls, short: '課程', color: '#F0A531', icon: 'users' },
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
  ...(IS_AMEI ? {} : { classPrice: G.classPrice, ...G.rules }),
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

const A_CAKE_SIZES = [{ size: '6 吋', price: 1400 }, { size: '8 吋', price: 1900 }];
const CAKE_FLAVORS = ['草莓鮮奶油', '芋泥奶霜', '伯爵茶戚風', '檸檬乳酪', '巧克力莓果'];
const CAKE_NOTES = [
  '蛋糕寫 Happy Birthday 小米', '插數字蠟燭「5」、加一組生日帽', '巧克力牌寫「爸爸生日快樂」', '少糖、不要含酒精',
  '寫「お誕生日おめでとう」（AI 已翻譯確認）', '寫 Happy 30th Mei，要附刀叉 6 份', '水果不要奇異果（過敏）', '要做成小熊造型，附照片參考',
  '寫「結婚週年快樂」，盒子加緞帶', '不要堅果（家中小孩過敏）',
];
const A_PICKUP_NOTES = ['', '', '', '請幫忙分裝 2 袋', '要送禮，請附提袋與賀卡', '會晚 10 分鐘到', '請附保冷劑', ''];
const A_CLASS_TITLES = ['檸檬塔入門', '草莓生乳捲', '伯爵可麗露', '親子手工餅乾'];
const A_ALLERGY = ['', '', '', '', '堅果過敏', '不吃蛋', '乳糖不耐'];

export const CAKE_SIZES = IS_AMEI ? A_CAKE_SIZES : G.items.map(x => ({ size: x.item, price: x.price }));
const PICKUP_NOTES = IS_AMEI ? A_PICKUP_NOTES : G.PICK;
export const CLASS_TITLES = IS_AMEI ? A_CLASS_TITLES : G.titles;
const ALLERGY = IS_AMEI ? A_ALLERGY : G.allergy;
export const BK_ITEMS = IS_AMEI ? null : G.items;
export const BK_NOTES = IS_AMEI ? null : G.NOTES;
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
    const svc = !IS_AMEI && CAT === 'service';
    const nCake = svc ? (weekend ? 4 + Math.floor(rng() * 3) : 2 + Math.floor(rng() * 4)) : weekend ? 1 + Math.floor(rng() * 3) : Math.floor(rng() * 3);
    for (let i = 0; i < Math.min(nCake, DEFAULT_RULES.cakeCap); i++) {
      const c = pickCust(rng);
      let itemName, base, dur = 30, note;
      if (IS_AMEI) {
        const sz = CAKE_SIZES[rng() < 0.7 ? 0 : 1];
        const flavor = CAKE_FLAVORS[Math.floor(rng() * CAKE_FLAVORS.length)];
        itemName = `${sz.size}${flavor}蛋糕`; base = sz.price;
      } else {
        const it = G.items[Math.floor(rng() * G.items.length)];
        itemName = it.item; base = it.price; dur = it.dur || 30;
      }
      const start = at(takeSlot());
      const price = base + (rng() < 0.3 ? 100 : 0);
      const deposit = Math.round(price * DEFAULT_RULES.depositPct / 100);
      const isPast = past(start);
      const r = rng();
      note = IS_AMEI ? CAKE_NOTES[Math.floor(rng() * CAKE_NOTES.length)] : G.NOTES[Math.floor(rng() * G.NOTES.length)];
      list.push({ id: `BK-${seq++}`, type: 'cake', start, dur, ...c, item: itemName, price, deposit,
        depStatus: isPast ? 'paid' : (r < 0.72 ? 'paid' : 'pending'),
        status: isPast ? (rng() < 0.04 ? 'noshow' : 'done') : 'confirmed',
        note, moved: 0 });
    }

    // 門市取貨
    const nPick = svc ? 1 + Math.floor(rng() * 3) : weekend ? 5 + Math.floor(rng() * 4) : 3 + Math.floor(rng() * 4);
    for (let i = 0; i < nPick; i++) {
      const c = pickCust(rng);
      const items = [];
      const k = 1 + Math.floor(rng() * 2);
      const pool = svc ? POPB.slice().sort((a, b) => a.price - b.price).slice(0, Math.max(1, Math.ceil(POPB.length / 2))) : PRODUCTS;
      if (!pool.length) pool.push(PRODUCTS[0]);
      for (let j = 0; j < (svc ? 1 : k); j++) { const p = pool[Math.floor(rng() * pool.length)]; if (!items.find(x => x.p === p)) items.push({ p, qty: svc ? 1 : 1 + Math.floor(rng() * 2) }); }
      const price = items.reduce((s, x) => s + (x.p.listPrice ?? x.p.price) * x.qty, 0);
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
  if (IS_AMEI) list.push({ id: 'BK-0888', type: 'cake', start: chenAt, dur: 30, customer: '陳先生', lang: 'zh', channel: 'line', item: '8 吋巧克力莓果蛋糕', price: 1900,
    deposit: 950, depStatus: 'paid', status: 'confirmed', note: '巧克力牌寫「爸爸生日快樂」，附 6 份刀叉', moved: 0, fixed: 'chen' });
  else { const it = G.items[Math.min(1, G.items.length - 1)]; list.push({ id: 'BK-0888', type: 'cake', start: chenAt, dur: it.dur || 30, customer: '陳先生', lang: 'zh', channel: 'line', item: it.item, price: it.price,
    deposit: Math.round(it.price * DEFAULT_RULES.depositPct / 100), depStatus: 'paid', status: 'confirmed', note: G.NOTES[2], moved: 0, fixed: 'chen' }); }
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
    zh: IS_AMEI ? `${name} 您好，提醒您 ${when}「${title}」課程，地點在阿美手作甜點門市。圍裙與材料我們準備，有過敏請先告訴我們。`
      : `${name} 您好，提醒您 ${when}「${title}」課程，地點在${TENANT.name}。${FOODISH ? '圍裙與材料我們準備，有過敏請先告訴我們。' : '工具與材料我們準備，有任何需求請先告訴我們。'}`,
    ja: IS_AMEI || FOODISH ? `${name}様、${when}「${title}」クラスのご案内です。エプロンと材料はご用意しております。アレルギーがあれば事前にお知らせください。` : `${name}様、${when}「${title}」クラスのご案内です。道具と材料はご用意しております。`,
    en: IS_AMEI || FOODISH ? `Hi ${name}, a reminder for "${title}" on ${when}. Aprons and ingredients are provided — please tell us about any allergies.` : `Hi ${name}, a reminder for "${title}" on ${when}. All tools and materials are provided.`,
    vi: IS_AMEI || FOODISH ? `Chào ${name}, nhắc bạn lớp "${title}" vào ${when}. Tạp dề và nguyên liệu đã được chuẩn bị sẵn.` : `Chào ${name}, nhắc bạn lớp "${title}" vào ${when}. Dụng cụ và vật liệu đã được chuẩn bị sẵn.`,
    ms: IS_AMEI || FOODISH ? `Hai ${name}, peringatan kelas "${title}" pada ${when}. Apron dan bahan disediakan.` : `Hai ${name}, peringatan kelas "${title}" pada ${when}. Alatan dan bahan disediakan.`,
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
