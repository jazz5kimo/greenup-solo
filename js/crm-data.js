// 會員與行銷：模擬資料（全部虛構，固定種子）
// 真實會員＝store.orders 中非門市顧客的線上客人（依名稱彙整）；
// 另以固定種子補足歷史會員到約 1,2xx 位，讓分眾與活動估算有合理規模。
import { mulberry32, PRODUCTS, PRODUCT_MAP, startOfDay, addDays } from './data.js';

const DAY = 86400e3;

export const TIERS = {
  gold: { id: 'gold', name: '金卡', color: '#F0A531', grad: 'linear-gradient(135deg,#f7d27a,#c98a1c 55%,#8a5a0c)' },
  silver: { id: 'silver', name: '銀卡', color: '#c9d6df', grad: 'linear-gradient(135deg,#eef3f6,#9fb2bf 55%,#5d7180)' },
  normal: { id: 'normal', name: '一般', color: '#5EE0C4', grad: 'linear-gradient(135deg,#5EE0C4,#1f8a63 60%,#0c4a35)' },
};
export const tierOf = (M) => M >= 12000 ? 'gold' : M >= 4000 ? 'silver' : 'normal';

export const SEGMENTS = [
  { id: 'champ', name: '冠軍顧客', color: '#F0A531', rule: '21 天內有消費・累計 6 次以上', tip: '邀請新品搶先試吃、寫 Google 評論，給予金卡專屬禮', purpose: 'new' },
  { id: 'loyal', name: '忠誠顧客', color: '#2DB674', rule: '45 天內有消費・累計 3 次以上', tip: '節慶禮盒預購早鳥、集點加倍，推升為冠軍', purpose: 'festival' },
  { id: 'potential', name: '潛力新客', color: '#2E97D4', rule: '30 天內首購・僅 1～2 次', tip: '首購後 3 天送保存小卡＋第二次購買 9 折', purpose: 'new' },
  { id: 'attention', name: '需喚回', color: '#7C62E6', rule: '超過一段時間未回購（≤ 90 天）', tip: '用最愛商品＋限時 85 折喚回，避免變成流失', purpose: 'winback' },
  { id: 'risk', name: '流失風險', color: '#EC6A55', rule: '超過 90 天未消費', tip: '換通路觸及（WhatsApp／簡訊），附生日或回饋券', purpose: 'winback' },
];
export const SEG_MAP = Object.fromEntries(SEGMENTS.map(s => [s.id, s]));
export function segOf(R, F) {
  if (R <= 21 && F >= 6) return 'champ';
  if (R <= 45 && F >= 3) return 'loyal';
  if (R <= 30 && F <= 2) return 'potential';
  if (R <= 90) return 'attention';
  return 'risk';
}

// 會員通路（含 IG、Email 等非訂單通路）
export const MCH = {
  line: { name: 'LINE', color: '#2DB674', letter: 'L' },
  whatsapp: { name: 'WhatsApp', color: '#2E97D4', letter: 'W' },
  zalo: { name: 'Zalo', color: '#7C62E6', letter: 'Z' },
  messenger: { name: 'Messenger', color: '#DD5597', letter: 'M' },
  ig: { name: 'Instagram', color: '#E1306C', letter: 'IG' },
  phone: { name: '電話', color: '#F0A531', letter: '☎' },
  web: { name: '官網', color: '#20a98d', letter: 'W' },
  pos: { name: '門市', color: '#EC6A55', letter: 'P' },
  email: { name: 'Email', color: '#8aa0ad', letter: '@' },
};
export const LANGS = [['zh', '中文'], ['ja', '日本語'], ['en', 'English'], ['vi', 'Tiếng Việt'], ['ms', 'Bahasa Melayu']];
export const LANG_NAME = Object.fromEntries(LANGS);

// 姓名羅馬拼音（產生帳號用）
const ROMA = { 林: 'lin', 陳: 'chen', 王: 'wang', 張: 'chang', 李: 'lee', 黃: 'huang', 吳: 'wu', 劉: 'liu', 蔡: 'tsai', 許: 'hsu', 鄭: 'cheng', 謝: 'hsieh', 楊: 'yang', 郭: 'kuo', 洪: 'hung', 邱: 'chiu', 曾: 'tseng', 廖: 'liao', 賴: 'lai', 周: 'chou', 徐: 'hsu', 蘇: 'su', 葉: 'yeh', 莊: 'chuang', 呂: 'lu', 江: 'chiang', 何: 'ho', 蕭: 'hsiao', 羅: 'lo', 高: 'kao',
  佐藤: 'sato', 田中: 'tanaka', 鈴木: 'suzuki', 高橋: 'takahashi', 伊藤: 'ito', 山本: 'yamamoto', 渡辺: 'watanabe', 中村: 'nakamura', 小林: 'kobayashi', 加藤: 'kato' };
const ZH_SUR = Object.keys(ROMA).filter(k => k.length === 1);
const ZH_GIVEN = ['怡君', '雅婷', '佳穎', '宜蓁', '志豪', '冠宇', '欣怡', '家豪', '詩涵', '俊傑', '婉婷', '承恩', '品妍', '柏翰', '筱涵', '子晴', '彥廷', '思妤', '宥辰', '佩珊', '育如', '建宏', '靜宜', '心妤'];
const JA_SUR = ['佐藤', '田中', '鈴木', '高橋', '伊藤', '山本', '渡辺', '中村', '小林', '加藤'];
const JA_GIVEN = ['さくら', '結衣', '陽菜', '美咲', '翔太', '健', '葵', '蓮', '真央', '彩花'];
const EN_FIRST = ['Daniel', 'Hannah', 'Kevin', 'Grace', 'Ryan', 'Chloe', 'Marcus', 'Ethan', 'Olivia', 'Joanne', 'Vincent', 'Rachel'];
const EN_LAST = ['Tan', 'Lim', 'Wong', 'Ng', 'Lee', 'Goh', 'Teo', 'Chua'];
const VI_SUR = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi'];
const VI_GIVEN = ['Thị Lan', 'Minh Anh', 'Thu Hà', 'Quốc Bảo', 'Ngọc Hân', 'Văn Hùng', 'Hải Yến', 'Gia Huy', 'Phương Linh'];
const MS_FIRST = ['Aisyah', 'Nurul', 'Farah', 'Siti', 'Ahmad', 'Hafiz', 'Amirah', 'Syafiq', 'Izzati', 'Aiman'];
const MS_LAST = ['Rahman', 'Ismail', 'Hassan', 'Yusof', 'Abdullah', 'Kamal', 'Osman'];

const ALLERGY = [
  { w: 52, text: '' },
  { w: 12, text: '對堅果過敏', avoid: ['cookie'] },
  { w: 10, text: '乳糖不耐（少量可）', avoid: [] },
  { w: 14, text: '偏好少糖', avoid: [] },
  { w: 6, text: '麩質敏感', avoid: ['lemon', 'roll', 'pound', 'cookie', 'pineapple', 'canele'] },
  { w: 6, text: '送禮為主・需附提袋與卡片', avoid: [], note: true },
];

function hashStr(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
function pickW(rng, list) { const t = list.reduce((s, x) => s + x.w, 0); let r = rng() * t; for (const x of list) { r -= x.w; if (r <= 0) return x; } return list[list.length - 1]; }

function romanOf(name, lang) {
  if (lang === 'zh') { const s = name.replace(/(小姐|先生|太太|媽媽)$/, ''); return ROMA[s[0]] || 'amei'; }
  if (lang === 'ja') { const s = name.split(' ')[0]; return ROMA[s] || 'jp'; }
  return name.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '') || 'member';
}
function maskTail(rng) { return String(Math.floor(rng() * 900) + 100); }

// 產生每個通路的帳號字串
function handleFor(ch, m, rng) {
  const r = m.roman;
  switch (ch) {
    case 'line': return `${m.name.split(' ')[0]}${rng() < 0.5 ? ' ♡' : ''}`;
    case 'whatsapp': return m.lang === 'ms' || m.lang === 'en' ? `+60 1${Math.floor(rng() * 9)}-***-${maskTail(rng)}` : `+886 9**-***-${maskTail(rng)}`;
    case 'zalo': return `+84 9* *** ${maskTail(rng)}`;
    case 'messenger': return `${r[0].toUpperCase()}${r.slice(1)} ${['Huang', 'Chen', 'Tan', 'Lin', 'Wu'][Math.floor(rng() * 5)]}`;
    case 'ig': return `@${r}.${['sweet', 'eats', 'daily', 'foodie', 'life'][Math.floor(rng() * 5)]}`;
    case 'phone': return `09${Math.floor(rng() * 9) + 1}*-***-${maskTail(rng)}`;
    case 'web': return `官網會員 #A${1000 + Math.floor(rng() * 8999)}`;
    case 'pos': return `門市會員卡・手機載具`;
    case 'email': return `${r.slice(0, 3)}***@${['gmail.com', 'yahoo.com.tw', 'outlook.com', 'icloud.com'][Math.floor(rng() * 4)]}`;
    default: return '';
  }
}

function buildIds(m, rng) {
  const ids = m.channels.map(ch => ({ ch, handle: handleFor(ch, m, rng) }));
  if (!m.channels.includes('email') && rng() < 0.75) ids.push({ ch: 'email', handle: handleFor('email', m, rng) });
  return ids;
}

function favsFrom(qtyMap) {
  return Object.entries(qtyMap).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([pid, qty]) => ({ pid, qty }));
}

// ---------- 種子會員 ----------
let SEEDED = null;
const SEED_N = 1208;
function seeded(now) {
  if (SEEDED) return SEEDED;
  const rng = mulberry32(5150);
  const list = [];
  const LANG_W = [{ v: 'zh', w: 64 }, { v: 'ja', w: 10 }, { v: 'en', w: 10 }, { v: 'vi', w: 9 }, { v: 'ms', w: 7 }];
  const CH_P = {
    zh: { line: 0.9, phone: 0.55, messenger: 0.22, web: 0.45, ig: 0.35, pos: 0.4 },
    ja: { line: 0.8, web: 0.6, ig: 0.4 },
    en: { whatsapp: 0.85, web: 0.5, messenger: 0.4, ig: 0.45 },
    vi: { zalo: 0.9, messenger: 0.4, web: 0.3, ig: 0.2 },
    ms: { whatsapp: 0.9, web: 0.4, ig: 0.4 },
  };
  for (let i = 0; i < SEED_N; i++) {
    const lang = pickW(rng, LANG_W).v;
    let name;
    if (lang === 'zh') name = pick(rng, ZH_SUR) + pick(rng, ZH_GIVEN);
    else if (lang === 'ja') name = pick(rng, JA_SUR) + ' ' + pick(rng, JA_GIVEN);
    else if (lang === 'en') name = pick(rng, EN_FIRST) + ' ' + pick(rng, EN_LAST);
    else if (lang === 'vi') name = pick(rng, VI_SUR) + ' ' + pick(rng, VI_GIVEN);
    else name = pick(rng, MS_FIRST) + ' ' + pick(rng, MS_LAST);
    const jd = Math.floor(Math.pow(rng(), 1.6) * 720) + 1;
    const interval = 12 + rng() * 60;
    const stopped = rng() < 0.5;
    let R = stopped ? Math.floor(rng() * Math.min(jd, 260)) : Math.floor(rng() * Math.min(jd, interval * 1.3));
    const span = jd - R;
    let F = span < 4 ? 1 : Math.max(1, Math.min(32, Math.round(span / interval * (0.3 + rng() * 0.5)) + (rng() < 0.3 ? 1 : 0)));
    const aov = 420 + Math.round(rng() * 880);
    const M = Math.round(F * aov / 10) * 10;
    const chP = CH_P[lang];
    let channels = Object.keys(chP).filter(c => rng() < chP[c]);
    if (!channels.length) channels = [Object.keys(chP)[0]];
    const m = {
      id: 'M' + String(10000 + i * 7 % 89999).padStart(5, '0'),
      seed: 9000 + i, real: false, name, lang, roman: romanOf(name, lang),
      R, F, M, aov, interval,
      lastTs: +addDays(startOfDay(now), -R) + (10 + Math.floor(rng() * 11)) * 3600e3,
      joinedTs: +addDays(startOfDay(now), -jd),
      channels,
    };
    m.ids = buildIds(m, rng);
    const q = {};
    for (let k = 0; k < 3; k++) { const p = PRODUCTS[Math.floor(Math.pow(rng(), 1.3) * PRODUCTS.length)]; q[p.id] = (q[p.id] || 0) + 1 + Math.floor(rng() * F); }
    m.favs = favsFrom(q);
    m.allergy = pickW(rng, ALLERGY);
    m.bday = { m: 1 + Math.floor(rng() * 12), d: 1 + Math.floor(rng() * 28) };
    m.redeemed = Math.floor(rng() * 0.6 * M / 100);
    list.push(m);
  }
  SEEDED = list;
  return list;
}

// ---------- 由 store 訂單彙整真實會員 ----------
export function buildMembers(orders, now = new Date()) {
  const by = new Map();
  for (const o of orders) {
    if (!o.customer || o.customer === '門市顧客') continue;
    let g = by.get(o.customer);
    if (!g) { g = { name: o.customer, orders: [], langs: {}, chs: new Set(), qty: {} }; by.set(o.customer, g); }
    g.orders.push(o); g.langs[o.lang] = (g.langs[o.lang] || 0) + 1; g.chs.add(o.channel);
    for (const it of o.items) g.qty[it.pid] = (g.qty[it.pid] || 0) + it.qty;
  }
  const real = [];
  let idx = 0;
  for (const g of by.values()) {
    const h = hashStr(g.name);
    const rng = mulberry32(h);
    const lang = Object.entries(g.langs).sort((a, b) => b[1] - a[1])[0][0];
    const os = g.orders.sort((a, b) => b.ts - a.ts);
    const M = os.reduce((s, o) => s + o.total, 0);
    const lastTs = os[0].ts, firstTs = os[os.length - 1].ts;
    const R = Math.max(0, (now - lastTs) / DAY);
    const channels = [...g.chs];
    if (lang === 'zh' && !channels.includes('phone') && rng() < 0.7) channels.push('phone');
    if (rng() < 0.55) channels.push('ig');
    const m = {
      id: 'M' + String(1001 + idx++ * 13).padStart(5, '0'), seed: h, real: true, name: g.name, lang, roman: romanOf(g.name, lang),
      R, F: os.length, M, aov: M / os.length, interval: os.length > 1 ? (lastTs - firstTs) / DAY / (os.length - 1) : 30,
      lastTs, joinedTs: firstTs - Math.floor(rng() * 400) * DAY, channels, orders: os,
    };
    m.ids = buildIds(m, rng);
    m.favs = favsFrom(g.qty);
    m.allergy = pickW(rng, ALLERGY);
    m.bday = { m: 1 + Math.floor(rng() * 12), d: 1 + Math.floor(rng() * 28) };
    m.redeemed = Math.floor(rng() * 0.5 * M / 100);
    real.push(m);
  }
  const all = [...real, ...seeded(now)];
  for (const m of all) {
    m.tier = tierOf(m.M);
    m.seg = segOf(m.R, m.F);
    m.points = Math.max(0, Math.floor(m.M / 100) * (m.tier === 'gold' ? 2 : 1) - m.redeemed);
    // AI 預測：下次回購與流失風險
    const iv = Math.max(1.5, m.interval);
    m.nextTs = m.lastTs + iv * DAY;
    m.risk = Math.round(Math.min(97, Math.max(3, 100 * (1 - Math.exp(-m.R / (iv * 1.6))))));
  }
  return all.sort((a, b) => (b.real - a.real) || (b.M - a.M));
}

// 種子會員的歷史消費（依頻率與最近一次推回去）；真實會員直接用訂單
export function memberTimeline(m, limit = 6) {
  if (m.real) return m.orders.slice(0, limit).map(o => ({ ts: o.ts, ch: o.channel, items: o.items, total: o.total, id: o.id, real: true }));
  const rng = mulberry32(m.seed);
  const out = [];
  const orderChs = m.channels.filter(c => c !== 'email' && c !== 'ig');
  let ts = m.lastTs;
  for (let i = 0; i < Math.min(limit, m.F); i++) {
    const n = 1 + (rng() < 0.35 ? 1 : 0);
    const items = [];
    for (let k = 0; k < n; k++) {
      const f = m.favs[Math.floor(rng() * m.favs.length)] || { pid: 'lemon' };
      if (!items.find(x => x.pid === f.pid)) items.push({ pid: f.pid, qty: 1 + (rng() < 0.25 ? 1 : 0), price: PRODUCT_MAP[f.pid].price });
    }
    const total = items.reduce((s, it) => s + it.qty * it.price, 0) + (rng() < 0.5 ? 150 : 0);
    out.push({ ts, ch: orderChs.length ? orderChs[Math.floor(rng() * orderChs.length)] : 'web', items, total, id: '歷史匯入', real: false });
    ts -= m.interval * (0.6 + rng() * 0.8) * DAY;
  }
  return out;
}

// ---------- AI 行銷文案範本 ----------
export const PURPOSES = [
  { id: 'new', name: '新品上市', pid: 'canele', code: 'CANELE90', disc: 0.9 },
  { id: 'bday', name: '生日禮', pid: 'basque', code: 'BDAY150', disc: 150 },
  { id: 'winback', name: '喚回', pid: 'lemon', code: 'MISSU85', disc: 0.85 },
  { id: 'festival', name: '節慶', pid: 'cookie', code: 'HALLO120', disc: 120 },
];
export const PURPOSE_MAP = Object.fromEntries(PURPOSES.map(p => [p.id, p]));
export const CAMP_CHANNELS = [['line', 'LINE'], ['whatsapp', 'WhatsApp'], ['zalo', 'Zalo'], ['ig', 'IG']];

export const PNAME = {
  zh: Object.fromEntries(PRODUCTS.map(p => [p.id, p.name])),
  ja: { lemon: 'レモンタルト', roll: 'いちご生クリームロール', basque: 'タロイモ・バスクチーズケーキ', pound: '烏龍茶パウンドケーキ', cookie: '手作りクッキーギフトボックス', pineapple: 'パイナップルケーキ', canele: 'アールグレイ・カヌレ' },
  en: { lemon: 'Lemon Tart', roll: 'Strawberry Cream Roll', basque: 'Taro Basque Cheesecake', pound: 'Oolong Pound Cake', cookie: 'Handmade Cookie Gift Box', pineapple: 'Pineapple Cake Gift Box', canele: 'Earl Grey Canelé' },
  vi: { lemon: 'Bánh tart chanh', roll: 'Bánh cuộn kem dâu', basque: 'Bánh Basque khoai môn', pound: 'Bánh bông lan trà ô long', cookie: 'Hộp bánh quy thủ công', pineapple: 'Hộp bánh dứa', canele: 'Bánh Canelé trà bá tước' },
  ms: { lemon: 'Tart Lemon', roll: 'Gulung Krim Strawberi', basque: 'Kek Keju Basque Keladi', pound: 'Kek Paun Teh Oolong', cookie: 'Kotak Hadiah Biskut', pineapple: 'Kotak Kek Nanas', canele: 'Canelé Earl Grey' },
};

const DISC_TXT = {
  new: { zh: '新品 9 折', ja: '10%オフ', en: '10% off', vi: 'giảm 10%', ms: 'diskaun 10%' },
  bday: { zh: 'NT$150 生日禮金', ja: 'NT$150', en: 'NT$150', vi: 'NT$150', ms: 'NT$150' },
  winback: { zh: '85 折', ja: '15%オフ', en: '15% off', vi: 'giảm 15%', ms: 'diskaun 15%' },
  festival: { zh: '滿 NT$1,000 折 NT$120', ja: 'NT$1,000以上でNT$120引き', en: 'NT$120 off orders over NT$1,000', vi: 'giảm NT$120 cho đơn từ NT$1.000', ms: 'potongan NT$120 untuk pesanan melebihi NT$1,000' },
};

export const UI_TXT = {
  zh: { shop: '阿美手作甜點', coupon: '會員優惠券', cta: '立即預訂', until: '有效至', hi: '親愛的會員', today: '今天' },
  ja: { shop: 'アメイ手作りスイーツ', coupon: '会員クーポン', cta: '今すぐ予約', until: '有効期限', hi: 'お客', today: '今日' },
  en: { shop: 'Amei Handmade Desserts', coupon: 'Member coupon', cta: 'Order now', until: 'Valid until', hi: 'there', today: 'Today' },
  vi: { shop: 'Tiệm bánh Amei', coupon: 'Phiếu ưu đãi', cta: 'Đặt ngay', until: 'Hạn dùng', hi: 'bạn', today: 'Hôm nay' },
  ms: { shop: 'Amei Handmade Desserts', coupon: 'Kupon ahli', cta: 'Tempah sekarang', until: 'Sah sehingga', hi: 'anda', today: 'Hari ini' },
};

const TPL = {
  zh: {
    new: '{name}您好！阿美手作甜點本週推出新品「{product}」：外殼焦脆、內裡是濕潤的伯爵茶香。身為我們的會員，搶先享{discount}，結帳輸入優惠碼 {code} 即可使用（{expiry} 前有效）。每天現烤、數量有限，想吃記得早點預訂喔！',
    bday: '{name}生日快樂！謝謝您一直以來支持阿美手作甜點。我們準備了一份小小的生日禮：{discount}，搭配您喜歡的「{product}」剛剛好。優惠碼 {code}，生日當月都能使用。祝您有個甜甜的一年！',
    winback: '{name}好久不見！最近過得好嗎？您之前最喜歡的「{product}」這一季換上了更新鮮的在地食材。我們特別為您保留一張{discount}回饋券，優惠碼 {code}，{expiry} 前有效。直接回覆「預訂」，AI 小幫手馬上幫您安排。',
    festival: '萬聖節快到了！萬聖節限定包裝的「{product}」上市囉，送朋友、辦公室分享都適合。{name}專屬優惠：{discount}，優惠碼 {code}（{expiry} 前有效）。10/28 前下單，保證節前送達。',
  },
  ja: {
    new: '{name}様、こんにちは！アメイ手作りスイーツから新商品「{product}」のお知らせです。外はカリッと、中はアールグレイが香るしっとり食感。会員様限定で{discount}、クーポンコード {code} をご利用ください（{expiry}まで有効）。毎日焼きたて・数量限定です。',
    bday: '{name}様、お誕生日おめでとうございます！いつもご愛顧いただきありがとうございます。ささやかなプレゼントとして{discount}のバースデークーポンをお贈りします。お気に入りの「{product}」と一緒にどうぞ。コード：{code}（誕生月中有効）',
    winback: '{name}様、お久しぶりです！以前お気に入りいただいた「{product}」、今季は旬の素材でさらに美味しくなりました。{name}様だけに{discount}クーポンをご用意しました。コード {code}（{expiry}まで）。「予約」とご返信いただければ、AIがすぐに手配します。',
    festival: 'ハロウィン限定パッケージの「{product}」が登場！ご友人へのギフトや職場でのシェアにぴったりです。{name}様限定：{discount}、コード {code}（{expiry}まで有効）。10/28までのご注文でハロウィン前にお届けします。',
  },
  en: {
    new: 'Hi {name}! Something new just came out of Amei\'s oven: {product}. Crisp caramelised shell, soft Earl Grey centre. As a member you get {discount} with code {code} (valid until {expiry}). Baked fresh daily in small batches, so pre-order early!',
    bday: 'Happy birthday, {name}! Thank you for being part of the Amei Handmade Desserts family. Here\'s a little gift: {discount} birthday credit, perfect with your favourite {product}. Use code {code} any time this month. Have a sweet year ahead!',
    winback: 'Hi {name}, we\'ve missed you! Your favourite {product} is back with fresh seasonal ingredients. We\'ve saved a {discount} voucher just for you: code {code}, valid until {expiry}. Reply "ORDER" and our AI assistant will set it up for you.',
    festival: 'Halloween is coming! Our limited-edition Halloween {product} is here, great for friends and office treats. Your member offer: {discount} with code {code} (until {expiry}). Order by 28 Oct for guaranteed delivery.',
  },
  vi: {
    new: 'Chào {name}! Tiệm bánh Amei vừa ra mắt món mới: {product}. Vỏ giòn caramel, ruột mềm thơm trà bá tước. Thành viên được ưu đãi {discount} với mã {code} (hạn đến {expiry}). Bánh nướng mới mỗi ngày, số lượng có hạn!',
    bday: 'Chúc mừng sinh nhật {name}! Cảm ơn bạn đã luôn ủng hộ Amei. Tặng bạn món quà nhỏ: {discount} mừng sinh nhật, dùng kèm món {product} bạn yêu thích. Mã {code}, dùng được trong suốt tháng sinh nhật.',
    winback: 'Chào {name}, lâu rồi không gặp! Món {product} bạn thích nay đã có nguyên liệu mới theo mùa. Amei dành riêng cho bạn phiếu {discount}: mã {code}, hạn đến {expiry}. Trả lời "ĐẶT" để trợ lý AI hỗ trợ ngay nhé.',
    festival: 'Halloween sắp đến! {product} phiên bản Halloween giới hạn đã lên kệ, rất hợp làm quà cho bạn bè và đồng nghiệp. Ưu đãi cho {name}: {discount}, mã {code} (đến {expiry}). Đặt trước 28/10 để nhận hàng kịp lễ.',
  },
  ms: {
    new: 'Hai {name}! Amei Handmade Desserts baru melancarkan produk baharu: {product}. Kulit rangup berkaramel, isi lembut beraroma teh Earl Grey. Ahli menikmati {discount} dengan kod {code} (sah sehingga {expiry}). Dibakar segar setiap hari, kuantiti terhad!',
    bday: 'Selamat hari jadi, {name}! Terima kasih kerana sentiasa menyokong Amei. Ini hadiah kecil untuk anda: kredit hari jadi {discount}, sesuai dengan {product} kegemaran anda. Guna kod {code} sepanjang bulan ini.',
    winback: 'Hai {name}, lama tak jumpa! {product} kegemaran anda kini kembali dengan bahan bermusim yang segar. Kami simpan baucar {discount} khas untuk anda: kod {code}, sah sehingga {expiry}. Balas "TEMPAH" dan pembantu AI kami akan uruskan segera.',
    festival: 'Halloween hampir tiba! {product} edisi Halloween terhad kini tersedia, sesuai untuk rakan dan pejabat. Tawaran ahli untuk {name}: {discount} dengan kod {code} (sehingga {expiry}). Tempah sebelum 28 Okt untuk penghantaran tepat masa.',
  },
};

const MON_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MON_MS = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];
export function fmtLangDate(d, lang) {
  d = new Date(d); const m = d.getMonth(), day = d.getDate();
  if (lang === 'ja') return `${m + 1}月${day}日`;
  if (lang === 'en') return `${day} ${MON_EN[m]}`;
  if (lang === 'ms') return `${day} ${MON_MS[m]}`;
  if (lang === 'vi') return `${day}/${m + 1}`;
  return `${m + 1}/${day}`;
}
export function expiryFor(purpose, now = new Date()) {
  if (purpose === 'bday') return new Date(now.getFullYear(), now.getMonth() + 1, 0);
  if (purpose === 'festival') return new Date(now.getFullYear(), 9, 31);
  return addDays(startOfDay(now), 14);
}

export function composeMessage({ purpose, lang, name, pid }) {
  const p = { ...PURPOSE_MAP[purpose] };
  if (pid && PRODUCT_MAP[pid]) p.pid = pid;
  const exp = expiryFor(purpose);
  const vars = {
    name: name || UI_TXT[lang].hi,
    product: PNAME[lang][p.pid],
    discount: DISC_TXT[purpose][lang],
    code: p.code,
    expiry: fmtLangDate(exp, lang),
  };
  const text = TPL[lang][purpose].replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  return { text, vars, product: PRODUCT_MAP[p.pid], productName: vars.product, code: p.code, discount: vars.discount, expiry: vars.expiry, ui: UI_TXT[lang] };
}

// ---------- 優惠券 ----------
export function seedCoupons(now = new Date()) {
  const d = (n) => addDays(startOfDay(now), n);
  return [
    { code: 'WELCOME100', name: '新會員見面禮', disc: '折 NT$100', ch: ['line', 'whatsapp', 'zalo', 'web'], issued: 486, used: 301, exp: d(60), color: '#2DB674', auto: true },
    { code: 'BDAY150', name: '生日禮金（10 月壽星）', disc: '折 NT$150', ch: ['line', 'whatsapp', 'zalo'], issued: 104, used: 37, exp: new Date(now.getFullYear(), now.getMonth() + 1, 0), color: '#DD5597', auto: true },
    { code: 'MISSU85', name: '沉睡會員喚回', disc: '85 折', ch: ['line', 'whatsapp'], issued: 318, used: 49, exp: d(5), color: '#7C62E6', auto: true },
    { code: 'FREESHIP', name: '冷藏宅配免運', disc: '免運費', ch: ['line', 'web', 'messenger'], issued: 380, used: 212, exp: d(41), color: '#2E97D4' },
    { code: 'REVIEW50', name: '評論感謝回饋', disc: '折 NT$50', ch: ['line', 'web'], issued: 152, used: 96, exp: d(25), color: '#F0A531' },
    { code: 'MOON2026', name: '中秋禮盒早鳥', disc: '滿千折 200', ch: ['line', 'whatsapp', 'web', 'pos'], issued: 650, used: 517, exp: d(-8), color: '#EC6A55' },
  ];
}

// ---------- 評論與口碑 ----------
export const SENTI = [
  { id: 'pos', name: '正面', color: '#2DB674', count: 186 },
  { id: 'neu', name: '中立', color: '#F0A531', count: 27 },
  { id: 'neg', name: '負面', color: '#EC6A55', count: 9 },
];
export const STAR_DIST = [[5, 161], [4, 38], [3, 13], [2, 6], [1, 4]];
export const KEYWORDS = [
  ['口感綿密', 'pos', 64], ['包裝精美', 'pos', 51], ['甜度剛好', 'pos', 47], ['回覆很快', 'pos', 39], ['適合送禮', 'pos', 36],
  ['多語客服', 'pos', 18], ['價格偏高', 'neu', 11], ['想要低糖版', 'neu', 9], ['冷藏運送', 'neg', 6], ['付款連結', 'neg', 3],
];

export function seedReviews(now = new Date()) {
  const h = (n) => +now - n * 3600e3;
  return [
    { id: 'r1', src: 'google', author: 'Iris C.', stars: 5, lang: 'zh', senti: 'pos', ts: h(3), tags: ['口感綿密', '適合送禮'],
      text: '芋泥巴斯克真的太邪惡了！芋泥綿密不會太甜，外層焦香。包裝也很用心，送禮很有面子，已經回購第三次。',
      replies: ['Iris 您好，謝謝您第三次回購！芋泥都是我們每天手工炒製、不加香精，能被您喜歡真的很開心。下次來店報上會員手機，我們再送您一份試吃小點，期待再為您服務！', 'Iris 謝謝這麼用心的評論！巴斯克的焦香是我們調了好多次的溫度才找到的平衡。歡迎下次試試本週新品伯爵可麗露，也很適合搭配送禮喔！'] },
    { id: 'r2', src: 'line', author: '張小姐', stars: 0, lang: 'zh', senti: 'neg', ts: h(5), tags: ['冷藏運送'], urgent: true,
      text: '這次的草莓生乳捲收到時奶油有點塌，感覺運送途中溫度不夠低……有點可惜，之前都很好吃。',
      replies: ['張小姐非常抱歉讓您失望了！我們查到這次是物流冷鏈交接時延誤約 40 分鐘，已向物流反映。為您補寄一條新的草莓生乳捲（明天上午送達），並附上 NT$100 購物金，再次向您致歉。', '張小姐真的很抱歉！奶油塌陷是溫度回升造成的，我們已改用加厚保冷袋並調整出貨時段。這次訂單將全額退款，也想邀請您再給我們一次機會，補寄費用由我們負擔。'] },
    { id: 'r3', src: 'google', author: '佐藤 ゆき', stars: 5, lang: 'ja', senti: 'pos', ts: h(9), tags: ['多語客服', '適合送禮'],
      text: '台湾旅行のお土産にパイナップルケーキを購入しました。上品な甘さで家族にも好評でした。LINEで日本語で丁寧に対応してくれて、とても助かりました。',
      replies: ['佐藤様、素敵なレビューをありがとうございます！パイナップルケーキがご家族のお口に合って嬉しいです。日本への国際配送も承っておりますので、またいつでもLINEでお気軽にご連絡ください。', '佐藤様、ありがとうございます！次回のご旅行の際は、季節限定のアールグレイ・カヌレもぜひお試しください。お待ちしております。'] },
    { id: 'r4', src: 'google', author: 'Kevin L.', stars: 3, lang: 'en', senti: 'neu', ts: h(20), tags: ['價格偏高'],
      text: 'Lemon tart was good but a little too sour for me. Delivery to Taichung took 2 days. Decent, but a bit pricey for the size.',
      replies: ['Hi Kevin, thanks for the honest feedback! Our lemon curd is made with fresh local lemons, so it does lean tangy. If you prefer something milder, try our Oolong Pound Cake. We\'ve also added next-day delivery to Taichung for orders placed before 2 pm.', 'Thanks Kevin! We\'ve noted your comment on sweetness and size. Next time, use code REVIEW50 for NT$50 off, and let our AI assistant know you prefer it less tart, we can adjust on request.'] },
    { id: 'r5', src: 'line', author: '林小姐', stars: 0, lang: 'zh', senti: 'neu', ts: h(26), tags: ['想要低糖版'],
      text: '烏龍茶磅蛋糕很香，長輩很喜歡！請問可以做無糖或低糖的版本嗎？家裡有人在控制血糖。',
      replies: ['林小姐您好，謝謝您和家人的喜歡！低糖版烏龍茶磅蛋糕我們正在試做，預計 11 月推出（糖量減少約 40%）。已幫您登記搶先通知，上市時會第一時間 LINE 給您！', '林小姐謝謝詢問！目前可以客製「減糖 30%」版本，需提前 2 天預訂，價格相同。要幫您直接安排下週的訂單嗎？'] },
    { id: 'r6', src: 'google', author: 'Nguyễn Thị Lan', stars: 5, lang: 'vi', senti: 'pos', ts: h(31), tags: ['多語客服', '回覆很快'],
      text: 'Bánh canelé rất ngon, vỏ giòn và thơm. Nhân viên trả lời tin nhắn Zalo rất nhanh bằng tiếng Việt. Chắc chắn sẽ quay lại!',
      replies: ['Cảm ơn chị Lan rất nhiều! Rất vui vì chị thích bánh canelé. Lần sau đặt qua Zalo, chị nhớ nhắn mã WELCOME100 để được giảm NT$100 nhé. Hẹn gặp lại chị!', 'Cảm ơn chị Lan! Tuần này Amei có thêm vị trà bá tước mới, chị ghé thử nhé. Chúc chị một ngày vui vẻ!'] },
    { id: 'r7', src: 'google', author: 'Daniel T.', stars: 2, lang: 'en', senti: 'neg', ts: h(44), tags: ['付款連結'], urgent: true,
      text: 'Ordered via WhatsApp, but the payment link expired before I could pay and nobody followed up for a whole day. The cakes are nice though.',
      replies: ['Hi Daniel, we\'re really sorry about this. The payment link has now been extended to 72 hours, and our AI assistant will send a reminder before it expires. We\'ve re-sent your order with free shipping as an apology. Thank you for letting us know!', 'Sorry Daniel, that shouldn\'t have happened. We\'ve fixed the follow-up rule so unpaid orders get a reminder within 2 hours. Your order is ready with a NT$100 credit applied, just reply on WhatsApp to confirm.'] },
    { id: 'r8', src: 'line', author: '黃小姐', stars: 0, lang: 'zh', senti: 'pos', ts: h(52), tags: ['適合送禮', '包裝精美'],
      text: '公司用手工餅乾禮盒送客戶，大家都說好吃又好看！年底尾牙還想再訂 30 盒，可以開統編嗎？',
      replies: ['黃小姐謝謝您的支持！30 盒企業訂單沒問題，可以開立統編電子發票，並享企業團購 95 折。AI 已幫您建立報價單草稿，稍後由阿美親自與您確認交期！', '黃小姐您好，謝謝推薦給客戶！尾牙禮盒可加印公司 logo 貼紙，30 盒以上免運。請提供統編與送達日期，我們馬上幫您保留產能。'] },
  ];
}

export function seedSchedules(now = new Date()) {
  const d = (n, h = 20, mi = 30) => { const x = addDays(startOfDay(now), n); x.setHours(h, mi); return +x; };
  return [
    { name: '萬聖節限定禮盒預購', seg: 'loyal', ch: 'line', lang: 'zh', ts: d(3), reach: 186, status: 'sched' },
    { name: '10 月壽星生日禮（自動）', seg: 'bday', ch: 'line', lang: 'zh', ts: d(0, 9, 0), reach: 104, status: 'running' },
    { name: 'Weekend Strawberry Roll', seg: 'champ', ch: 'whatsapp', lang: 'en', ts: d(-2, 19, 0), reach: 41, status: 'done', orders: 9, rev: 6380 },
    { name: '中秋禮盒感謝回饋', seg: 'all', ch: 'line', lang: 'zh', ts: d(-14, 20, 0), reach: 812, status: 'done', orders: 71, rev: 48620 },
  ];
}

export const DAYMS = DAY;
