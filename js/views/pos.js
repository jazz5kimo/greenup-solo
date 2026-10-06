// POS 收銀台：門市結帳、會員、優惠、載具／統編／捐贈、電子發票證明聯、作廢折讓、掛單、交班日結（Z 帳）、離線模式、客顯
// 純前端示範：所有資料為模擬；結帳呼叫 store.createOrder，讓總覽、會計帳務等頁面同步。
import { store, itemsText } from '../state.js';
import { $, $$, el, gsap, esc, money, pad, fmtTime, fmtMD, fmtDate, countUp, toast, sleep, typeText } from '../util.js';
import { icon, chIcon } from '../icons.js';
import { PRODUCTS, PRODUCT_MAP, startOfDay, addDays, mulberry32 } from '../data.js';
import { productArt } from '../art.js';
import { promoInfo, onPromos } from '../promo.js';
import { TENANT, TENANT_ID } from '../tenant.js';
import { IS_AMEI, CAT, FOODISH, KIT } from '../inventory-data.js';

// ---------- 常數與模擬資料 ----------
const CH = { line: 'LINE', web: '官網', pos: '門市', phone: '電話', whatsapp: 'WhatsApp', zalo: 'Zalo', messenger: 'Messenger' };
const A_CATS = [{ id: 'all', name: '全部' }, { id: 'cake', name: '塔類蛋糕' }, { id: 'gift', name: '禮盒' }, { id: 'ltd', name: '限定' }];
const A_PMETA = {
  lemon: { cat: ['cake'], code: '4719853100018', tag: '' },
  roll: { cat: ['cake', 'ltd'], code: '4719853100025', tag: '草莓季限定' },
  basque: { cat: ['cake', 'ltd'], code: '4719853100032', tag: '每日限量' },
  pound: { cat: ['cake', 'gift'], code: '4719853100049', tag: '' },
  cookie: { cat: ['gift'], code: '4719853100056', tag: '' },
  pineapple: { cat: ['gift'], code: '4719853100063', tag: '' },
  canele: { cat: ['cake', 'ltd'], code: '4719853100070', tag: '秋季限定' },
};
const ALG = { egg: '蛋', milk: '奶', gluten: '麩質', nuts: '堅果' };
const A_PN = {
  lemon: { en: 'Lemon Tart', ja: 'レモンタルト' }, roll: { en: 'Strawberry Roll', ja: 'いちごロール' },
  basque: { en: 'Taro Basque', ja: 'タロバスク' }, pound: { en: 'Oolong Pound Cake', ja: '烏龍茶パウンド' },
  cookie: { en: 'Cookie Gift Box', ja: 'クッキー詰合せ' }, pineapple: { en: 'Pineapple Cake Box', ja: 'パイナップルケーキ' },
  canele: { en: 'Earl Grey Canelé', ja: 'アールグレイカヌレ' },
};
const TODAY = startOfDay(new Date());
const A_MEMBERS = [
  { id: 'M-000128', phone: '0912345678', name: '林小姐', full: '林佳穎', tier: '金卡', c: '#F0A531', points: 1280, visits: 23, last: { d: addDays(TODAY, -7), items: [['lemon', 2]] }, allergy: ['nuts'], lang: 'zh', bday: true, pref: '偏好低甜度' },
  { id: 'M-000342', phone: '0922876543', name: '陳先生', full: '陳冠宇', tier: '銀卡', c: '#9fd6f5', points: 460, visits: 9, last: { d: addDays(TODAY, -14), items: [['pineapple', 3]] }, allergy: [], lang: 'zh', taxId: '53212539', company: '示範貿易有限公司', pref: '公司送禮常客・需統編' },
  { id: 'M-000517', phone: '0933556677', name: '佐藤 ゆき', full: '佐藤 ゆき', tier: '一般', c: '#5EE0C4', points: 120, visits: 2, last: { d: addDays(TODAY, -30), items: [['canele', 1]] }, allergy: [], lang: 'ja', pref: '日本旅客・LINE 會員' },
];
const A_PAIR = { lemon: ['pound', 'canele'], roll: ['canele', 'lemon'], basque: ['cookie', 'pound'], pound: ['lemon', 'pineapple'], cookie: ['pineapple', 'pound'], pineapple: ['cookie', 'pound'], canele: ['roll', 'lemon'] };
const A_WHY = {
  'lemon>pound': '酸甜檸檬塔配低甜烏龍茶香，回購組合第 1 名', 'lemon>canele': '下午茶雙拼，可套用第二件 8 折',
  'roll>canele': '生乳捲＋可麗露是週末下午茶熱門組合', 'roll>lemon': '水果系雙主角，冷藏 2 天內享用',
  'basque>cookie': '芋泥巴斯克送禮常加購餅乾禮盒', 'basque>pound': '6 吋蛋糕搭常溫磅蛋糕，隔天也有得吃',
  'pound>lemon': '茶香配果酸，68% 顧客會一起帶', 'pound>pineapple': '常溫禮盒雙件組，適合拜訪長輩',
  'cookie>pineapple': '伴手禮雙盒組，中秋後送禮需求仍高', 'cookie>pound': '常溫可放 7 天，方便分送',
  'pineapple>cookie': '鳳梨酥＋餅乾雙禮盒，公司送禮首選', 'pineapple>pound': '常溫禮盒雙件組，適合拜訪長輩',
  'canele>roll': '可麗露搭草莓生乳捲，限定組合', 'canele>lemon': '伯爵茶香配檸檬，日本旅客最愛',
};
const A_CODES = {
  AMEI100: { desc: '滿 NT$800 折 NT$100', type: 'amt', v: 100, min: 800 },
  TEA20: { desc: '烏龍茶磅蛋糕 8 折', type: 'pid', pid: 'pound', pct: 0.2 },
  BDAY15: { desc: '會員生日月 85 折', type: 'pct', v: 0.15, bday: true },
};
const PCT_LABEL = { 0.05: '95 折', 0.1: '9 折', 0.15: '85 折' };
const PAY = [
  { id: 'cash', name: '現金', c: '#2DB674' }, { id: 'card', name: '信用卡', c: '#2E97D4' },
  { id: 'linepay', name: 'LINE Pay', c: '#3ddc84' }, { id: 'jko', name: '街口支付', c: '#EC6A55' },
  { id: 'easy', name: '悠遊卡', c: '#F0A531' }, { id: 'split', name: '分開付款', c: '#7C62E6' },
];
const PAY_LABEL = { cash: '現金', card: '信用卡', linepay: 'LINE Pay', jko: '街口支付', easy: '悠遊卡', split: '分開付款' };
const Z_METHODS = ['現金', '信用卡', 'LINE Pay', '街口支付', '悠遊卡'];
const Z_COLOR = { 現金: '#2DB674', 信用卡: '#2E97D4', 'LINE Pay': '#3ddc84', 街口支付: '#EC6A55', 悠遊卡: '#F0A531' };
const DONATE = [{ code: '5299', name: '（示範）偏鄉兒童閱讀計畫' }, { code: '9527', name: '（示範）流浪動物之家' }, { code: '168', name: '（示範）食物銀行' }];
const SELLER_MASK = '83****47';
const FLOAT = 5000;
const A_CDL = {
  zh: { k: '中', welcome: '歡迎光臨', idle: '今日現烤・草莓生乳捲限量供應', due: '應付金額', saved: '已為您節省', thanks: '謝謝光臨，歡迎再來！', sub: '電子發票已開立', change: '找零', points: '本次累積 {n} 點', more: '另 {n} 項', mar: '今日限定：伯爵可麗露第二件 8 折・加入 LINE 會員首購送 50 點' },
  en: { k: 'EN', welcome: 'Welcome!', idle: 'Freshly baked today', due: 'Amount Due', saved: 'You saved', thanks: 'Thank you! See you again.', sub: 'Your e-invoice has been issued', change: 'Change', points: '+{n} points earned', more: '+{n} more', mar: 'Today: 20% off your 2nd Earl Grey Canelé · Join our LINE membership for 50 bonus points' },
  ja: { k: '日', welcome: 'いらっしゃいませ', idle: '本日焼きたて', due: 'お支払い金額', saved: '割引', thanks: 'ありがとうございました！', sub: '電子レシートを発行しました', change: 'おつり', points: '{n} ポイント獲得', more: '他 {n} 点', mar: '本日限定：カヌレ 2 個目 20% オフ・LINE 会員登録で 50 ポイント' },
  vi: { k: 'VI', welcome: 'Xin chào quý khách', idle: 'Bánh mới nướng hôm nay', due: 'Số tiền cần trả', saved: 'Đã giảm', thanks: 'Cảm ơn quý khách! Hẹn gặp lại.', sub: 'Hóa đơn điện tử đã được xuất', change: 'Tiền thừa', points: '+{n} điểm', more: '+{n} món', mar: 'Hôm nay: giảm 20% cho chiếc canelé thứ hai' },
  ms: { k: 'MY', welcome: 'Selamat datang', idle: 'Dibakar segar hari ini', due: 'Jumlah Perlu Dibayar', saved: 'Jimat', thanks: 'Terima kasih! Jumpa lagi.', sub: 'E-invois telah dikeluarkan', change: 'Baki', points: '+{n} mata ganjaran', more: '+{n} lagi', mar: 'Hari ini: diskaun 20% untuk canelé kedua' },
};

// ---------- 其他業主：依業態大類與商品主檔產生（示範） ----------
const G = IS_AMEI ? null : (() => {
  const pop = KIT.byPop(), byP = KIT.byPrice();
  const hot = new Set(pop.slice(0, 3).map(p => p.id));
  const giftRe = /禮|組|券|盒|套|束|籃|訂閱/;
  const gifts = new Set(PRODUCTS.filter(p => giftRe.test(p.name)).map(p => p.id));
  if (!gifts.size) byP.slice(-2).forEach(p => gifts.add(p.id));
  const ltdP = PRODUCTS.find(p => !hot.has(p.id) && !gifts.has(p.id)) || PRODUCTS[PRODUCTS.length - 1];
  const GN = { food: '套餐加購', drink: '禮盒組合', dessert: '禮盒', retail: '送禮推薦', craft: '送禮推薦', flower: '花禮', service: '加購・禮券', farm: '禮盒組合' }[CAT];
  const cats = [{ id: 'all', name: '全部' }, { id: 'cake', name: '熱銷' }, { id: 'gift', name: GN }, { id: 'ltd', name: '限定' }];
  const pmeta = Object.fromEntries(PRODUCTS.map((p, i) => [p.id, {
    cat: [...(hot.has(p.id) ? ['cake'] : []), ...(gifts.has(p.id) ? ['gift'] : []), ...(p === ltdP ? ['ltd'] : [])],
    code: `4719853${String(310 + i * 7).padStart(5, '0')}${(i * 3 + 1) % 10}`,
    tag: p.id === pop[0].id ? '人氣第一' : p === ltdP ? (CAT === 'service' ? '本月限定' : '季節限定') : '',
  }]));
  const pn = Object.fromEntries(PRODUCTS.map(p => [p.id, { en: p.en || p.name, ja: p.en || p.name }]));
  const T = addDays(startOfDay(new Date()), 0);
  const PREF = { food: '偏好少辣・不加香菜', drink: '偏好淺焙・少糖', dessert: '偏好低甜度', retail: '喜歡簡約款・常買送禮', craft: '偏好深色系・常加購刻字', flower: '偏好淡色系花材', service: '偏好裸色系・約每 3 週回訪', farm: '偏好當季蔬果箱' }[CAT];
  const members = [
    { id: 'M-000128', phone: '0912345678', name: '林小姐', full: '林佳穎', tier: '金卡', c: '#F0A531', points: 1280, visits: 23, last: { d: addDays(T, -7), items: [[pop[0].id, 2]] }, allergy: FOODISH ? ['nuts'] : [], lang: 'zh', bday: true, pref: PREF },
    { id: 'M-000342', phone: '0922876543', name: '陳先生', full: '陳冠宇', tier: '銀卡', c: '#9fd6f5', points: 460, visits: 9, last: { d: addDays(T, -14), items: [[[...gifts][0] || byP[byP.length - 1].id, 3]] }, allergy: [], lang: 'zh', taxId: '53212539', company: '示範貿易有限公司', pref: '公司送禮常客・需統編' },
    { id: 'M-000517', phone: '0933556677', name: '佐藤 ゆき', full: '佐藤 ゆき', tier: '一般', c: '#5EE0C4', points: 120, visits: 2, last: { d: addDays(T, -30), items: [[pop[Math.min(2, pop.length - 1)].id, 1]] }, allergy: [], lang: 'ja', pref: '日本旅客・LINE 會員' },
  ];
  const pair = Object.fromEntries(PRODUCTS.map(p => [p.id, pop.filter(x => x.id !== p.id).slice(0, 2).map(x => x.id)]));
  const word = (KIT.slug.split('-')[0] || 'shop').toUpperCase().slice(0, 6);
  const top = pop[1] || pop[0];
  const codes = {
    [`${word}100`]: { desc: '滿 NT$800 折 NT$100', type: 'amt', v: 100, min: 800 },
    HOT20: { desc: `${top.name} 8 折`, type: 'pid', pid: top.id, pct: 0.2 },
    BDAY15: { desc: '會員生日月 85 折', type: 'pct', v: 0.15, bday: true },
  };
  const IDLE = {
    food: ['今日現做・外帶外送都可以', 'Freshly made today', '本日の手作り', 'Món mới làm hôm nay', 'Disediakan segar hari ini'],
    drink: ['每日新鮮製作・歡迎試飲', 'Freshly made daily', '毎日丁寧に仕上げています', 'Pha chế mới mỗi ngày', 'Dibuat segar setiap hari'],
    dessert: ['今日現做・數量有限', 'Handmade today', '本日の手作り', 'Làm mới hôm nay', 'Buatan tangan hari ini'],
    retail: ['店主選品・可包裝送禮', 'Curated by the owner · gift wrap available', '店主セレクト・ギフト包装可', 'Chủ tiệm tuyển chọn · có gói quà', 'Pilihan pemilik · bungkusan hadiah'],
    craft: ['全手工製作・可現場刻字', 'Handmade · engraving available', 'ハンドメイド・刻印承ります', 'Làm thủ công · khắc tên tại chỗ', 'Buatan tangan · ukiran nama'],
    flower: ['今日到貨鮮花・現場配花', 'Fresh flowers in today', '本日入荷の生花', 'Hoa tươi về hôm nay', 'Bunga segar tiba hari ini'],
    service: ['一對一預約・器具一客一消毒', 'One-to-one · tools sterilised for every guest', 'マンツーマン・器具はお客様ごとに消毒', 'Phục vụ 1 kèm 1 · khử trùng cho từng khách', 'Satu-ke-satu · peralatan disterilkan'],
    farm: ['今日採收・產地直送', 'Harvested today · farm direct', '本日収穫・産地直送', 'Thu hoạch hôm nay · từ nông trại', 'Dituai hari ini · terus dari ladang'],
  }[CAT];
  const en = top.en || top.name;
  const MAR = CAT === 'service'
    ? [`本月限定：${top.name}平日 9 折・加入 LINE 會員首次預約送 50 點`, `This month: 10% off ${en} on weekdays · Join our LINE membership for 50 bonus points`, `今月限定：平日の${en} 10% オフ・LINE 会員登録で 50 ポイント`, `Tháng này: giảm 10% ${en} ngày thường`, `Bulan ini: diskaun 10% ${en} pada hari biasa`]
    : [`今日限定：${top.name}第二件 8 折・加入 LINE 會員首購送 50 點`, `Today: 20% off your 2nd ${en} · Join our LINE membership for 50 bonus points`, `本日限定：${en} 2 点目 20% オフ・LINE 会員登録で 50 ポイント`, `Hôm nay: giảm 20% cho ${en} thứ hai`, `Hari ini: diskaun 20% untuk ${en} kedua`];
  const cdl = Object.fromEntries(Object.entries(A_CDL).map(([k, v], i) => [k, { ...v, idle: IDLE[i], mar: MAR[i] }]));
  const CHIPS = { food: ['不要香菜', '加辣', '分開裝', '外帶餐具', '湯麵分開'], drink: ['禮盒包裝', '研磨（手沖）', '研磨（義式）', '附提袋', '少冰'], dessert: ['加蠟燭', '保冷袋', '禮盒包裝', '切 8 片', '附小卡'], retail: ['禮物包裝', '附提袋', '拆吊牌', '附小卡', '分開包'], craft: ['刻字', '禮盒包裝', '附保養油', '附小卡', '防塵袋'], flower: ['附賀卡', '加購花瓶', '保水處理', '指定送達', '不要百合'], service: ['指定時段', '加購保養', '卸甲', '加長', '禮券包裝'], farm: ['附提袋', '冷藏', '分裝', '附食譜', '挑大顆'] }[CAT];
  const gp = [...gifts][0] || byP[byP.length - 1].id;
  const hold = { id: 'H-0001', ts: Date.now() - 18 * 60e3, label: CAT === 'service' ? '現場・顧客先去領車' : '外帶・顧客回車上拿錢包', memberId: 'M-000342', cart: [{ pid: gp, qty: 2, note: `${CHIPS[1]}・${CHIPS[0]}` }, { pid: pop.find(x => x.id !== gp)?.id || gp, qty: 1, note: '' }], rules: { second: true, threshold: true }, wholePct: 0, code: null };
  return { cats, pmeta, pn, members, pair, codes, cdl, chips: CHIPS, hold, pop };
})();
const CATS = IS_AMEI ? A_CATS : G.cats;
const PMETA = IS_AMEI ? A_PMETA : G.pmeta;
const PN = IS_AMEI ? A_PN : G.pn;
const MEMBERS = IS_AMEI ? A_MEMBERS : G.members;
const PAIR = IS_AMEI ? A_PAIR : G.pair;
const WHY = IS_AMEI ? A_WHY : {};
const CODES = IS_AMEI ? A_CODES : G.codes;
const CDL = IS_AMEI ? A_CDL : G.cdl;
const NOTE_CHIPS = IS_AMEI ? ['加蠟燭', '保冷袋', '禮盒包裝', '切 8 片', '生日卡'] : G.chips;
const SHOP_NAME = IS_AMEI ? '阿美手作甜點' : (TENANT.name || '本店');
const CASHIER = IS_AMEI ? '阿美' : KIT.owner;
const NEXT_SHIFT = IS_AMEI ? '小芸' : KIT.helper;
// 本機暫存 key：阿美沿用原本名稱，其他業主加上業主 id，避免讀到別家的掛單與作廢紀錄
const LSK = (k) => IS_AMEI ? `greenup-pos:${k}:v1` : `greenup-pos:${TENANT_ID}:${k}:v1`;

// ---------- 內嵌圖示 ----------
const svg = (d, s = 18, sw = 1.8) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  barcode: '<path d="M3 5v14M6 5v14M9.5 5v14M13 5v14M15.5 5v14M18 5v14M21 5v14"/>',
  cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 12h.01M18 12h.01"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M10 18h4"/><rect x="9" y="6" width="6" height="6" rx="1"/>',
  nfc: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M19 9a5 5 0 0 1 0 6M21.5 7a8.5 8.5 0 0 1 0 10"/>',
  split: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18M12 12l6.4-6.4"/>',
  wifi: '<path d="M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0M12 19h.01"/>',
  wifiOff: '<path d="M3 3l18 18M8.5 15.5a5 5 0 0 1 7 0M5 12a10 10 0 0 1 4.6-2.6M14.6 9.5A10 10 0 0 1 19 12M2 8.5a15 15 0 0 1 4-2.6M10.5 5.1A15 15 0 0 1 22 8.5M12 19h.01"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  printer: '<path d="M6 9V2h12v7"/><rect x="2" y="9" width="20" height="8" rx="2"/><path d="M6 14h12v8H6z"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><path d="M7 7h.01"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  back: '<path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><path d="M18 9l-6 6M12 9l6 6"/>',
  drawer: '<rect x="2" y="10" width="20" height="10" rx="2"/><path d="M5 10V5h14v5M9 15h6"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  zr: '<path d="M4 3h16v18l-3-2-3 2-2-2-2 2-3-2-3 2z"/><path d="M8 8h8M8 12h8M8 16h4"/>',
};
const PAY_IC = { cash: I.cash, card: I.card, linepay: I.qr, jko: I.phone, easy: I.nfc, split: I.split };

// ---------- 小工具 ----------
const hash = (s) => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
const nf = (n) => Math.round(n).toLocaleString('en-US');
const fmtFull = (d) => { d = new Date(d); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };
function validUBN(s) {
  if (!/^\d{8}$/.test(s)) return false;
  const w = [1, 2, 1, 2, 1, 2, 4, 1]; let sum = 0;
  for (let i = 0; i < 8; i++) { const p = +s[i] * w[i]; sum += Math.floor(p / 10) + p % 10; }
  return sum % 5 === 0 || (s[6] === '7' && (sum + 1) % 5 === 0);
}
function barcodeSvg(text, h = 34, w = 220) {
  const rng = mulberry32(hash(text)); let x = 0, out = '', bar = true;
  out += `<rect x="0" y="0" width="2" height="${h}"/><rect x="4" y="0" width="1" height="${h}"/>`; x = 7;
  while (x < w - 8) { const wd = (1 + Math.floor(rng() * 3)) * 1.2; if (bar) out += `<rect x="${x.toFixed(1)}" y="0" width="${wd.toFixed(1)}" height="${h}"/>`; x += wd; bar = !bar; }
  out += `<rect x="${w - 5}" y="0" width="1" height="${h}"/><rect x="${w - 2}" y="0" width="2" height="${h}"/>`;
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none" fill="#121a16" aria-hidden="true">${out}</svg>`;
}
function qrSvg(seed, n = 25) {
  const rng = mulberry32(seed); let r = '';
  const inF = (x, y) => (x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!inF(x, y) && rng() < 0.48) r += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
  const f = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3"/>`;
  return `<svg class="ei-qr" viewBox="-1 -1 ${n + 2} ${n + 2}" shape-rendering="crispEdges" fill="#121a16" aria-hidden="true"><rect x="-1" y="-1" width="${n + 2}" height="${n + 2}" fill="#fff"/>${r}${f(0, 0)}${f(n - 7, 0)}${f(0, n - 7)}</svg>`;
}
function beep(freq = 1320, dur = 0.09) {
  try {
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return;
    beep.ctx = beep.ctx || new A();
    const c = beep.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'square'; o.frequency.value = freq; g.gain.value = 0.04;
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + dur);
  } catch { /* ignore */ }
}
function lsGet(k, f) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : f; } catch { return f; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } }

// ---------- 狀態 ----------
let root, ctx;
let cart = [];               // [{pid, qty, note}]
let member = null, usePoints = false;
let rules = { second: true, threshold: true }, wholePct = 0, code = null, codeDraft = '';
let cat = 'all', query = '', editNote = null;
let online = true, queue = [], syncing = false;
let holds = [];
let adj = lsGet(LSK('adj'), {});
let tab = 'tx', txFilter = 'all';
let cdLang = 'zh', cdAuto = false, cdThanks = null, cdTimer = null, tick = null;
let ticketSeq = 1, scanSeq = 0, memScanSeq = 0, aiKey = '';
const scanRng = mulberry32(8517);

// ---------- 價格計算 ----------
function calc() {
  const lines = cart.map(l => { const p = PRODUCT_MAP[l.pid]; return { ...l, p, pr: promoInfo(p), amt: p.price * l.qty, second: 0 }; });
  const subtotal = lines.reduce((s, l) => s + l.amt, 0);
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const discounts = [];
  let after = subtotal, codeMsg = '';
  if (rules.second) {
    let d = 0;
    lines.forEach(l => { const pairs = Math.floor(l.qty / 2); if (pairs) { l.second = Math.round(l.p.price * 0.2) * pairs; d += l.second; } });
    if (d) { discounts.push({ key: 'second', label: '同品項第二件 8 折', amt: d }); after -= d; }
  }
  if (code) {
    const C = CODES[code]; let d = 0;
    if (C.type === 'amt') { if (after >= C.min) d = C.v; else codeMsg = `未達門檻：還差 ${money(C.min - after)}`; }
    if (C.type === 'pid') { const l = lines.find(x => x.pid === C.pid); if (l) d = Math.round((l.amt - l.second) * C.pct); else codeMsg = `購物車內沒有${PRODUCT_MAP[C.pid]?.name || '指定商品'}`; }
    if (C.type === 'pct') { if (member && member.bday) d = Math.round(after * C.v); else codeMsg = '限本月壽星會員使用'; }
    if (d) { discounts.push({ key: 'code', label: `折扣碼 ${code}（${C.desc}）`, amt: d }); after -= d; }
  }
  if (rules.threshold && after >= 1500) { discounts.push({ key: 'th', label: '滿 NT$1,500 折 NT$150', amt: 150 }); after -= 150; }
  if (wholePct) { const d = Math.round(after * wholePct); if (d) { discounts.push({ key: 'pct', label: `整單 ${PCT_LABEL[wholePct]}`, amt: d }); after -= d; } }
  const maxPts = member ? Math.max(0, Math.min(member.points, Math.floor(after * 0.3))) : 0;
  if (usePoints && maxPts > 0) { discounts.push({ key: 'pts', label: `會員點數折抵 ${nf(maxPts)} 點`, amt: maxPts }); after -= maxPts; }
  const disc = subtotal - after;
  const total = Math.max(0, after);
  const net = Math.round(total / 1.05);
  return { lines, subtotal, count, discounts, disc, total, net, tax: total - net, maxPts, ptsUsed: usePoints ? maxPts : 0, earn: member ? Math.floor(total / 50) : 0, codeMsg };
}

// ---------- 掛單 ----------
function loadHolds() {
  const h = lsGet(LSK('holds'), null);
  if (Array.isArray(h)) return h.filter(x => x && Array.isArray(x.cart) && x.cart.every(l => PRODUCT_MAP[l.pid]));
  if (!IS_AMEI) return [G.hold];
  const ts = Date.now() - 18 * 60e3;
  return [{ id: 'H-0001', ts, label: '外帶・顧客回車上拿錢包', memberId: 'M-000342', cart: [{ pid: 'pineapple', qty: 2, note: '禮盒包裝・附提袋' }, { pid: 'cookie', qty: 1, note: '' }], rules: { second: true, threshold: true }, wholePct: 0, code: null }];
}
function saveHolds() { lsSet(LSK('holds'), holds); }

// ---------- mount ----------
export default {
  mount(section, c) {
    root = section; ctx = c;
    holds = loadHolds();
    section.innerHTML = `
    <div class="px">
      <div class="px-top anim-in">
        <div class="px-kpis">
          <div class="glass px-kpi" style="--c:var(--leaf)"><span>${icon('receipt', 17)}</span><div><small>今日開立發票</small><b id="pkInv">0</b></div></div>
          <div class="glass px-kpi" style="--c:var(--mint)"><span>${icon('coins', 17)}</span><div><small>今日已入帳</small><b id="pkPaid">0</b></div></div>
          <div class="glass px-kpi" style="--c:var(--amber)"><span>${icon('clock', 17)}</span><div><small>應收帳款</small><b id="pkAR">0</b></div></div>
          <div class="glass px-kpi" style="--c:var(--violet)"><span>${icon('percent', 17)}</span><div><small>本月銷項稅額 5%</small><b id="pkTax">0</b></div></div>
        </div>
        <div class="px-acts">
          <span class="demo-badge">示範資料</span>
          <button class="px-net" id="pxNet" data-act="net" title="切換離線模式示範"><span class="px-net-ic">${svg(I.wifi, 16)}</span><span class="px-net-t"><b>連線中</b><small>雲端即時同步</small></span><span class="px-sw on"><i></i></span></button>
          <button class="btn btn-ghost btn-sm" data-act="holds">${icon('hang', 15)} 取回掛單 <em class="px-cnt" id="pxHoldN">0</em></button>
          <button class="btn btn-sm px-zbtn" data-act="zreport">${svg(I.zr, 15)} 交班日結</button>
        </div>
      </div>
      <div class="px-main">
        <section class="glass px-prod anim-in">
          <div class="px-prod-h">
            <div class="px-cats">${CATS.map(c => `<button class="px-cat ${c.id === cat ? 'on' : ''}" data-act="cat" data-c="${c.id}">${c.name}</button>`).join('')}</div>
            <label class="px-search">${svg(I.search, 16)}<input id="pxQ" placeholder="搜尋品名／條碼" autocomplete="off"></label>
            <button class="btn btn-primary btn-sm px-scanbtn" data-act="scan">${svg(I.barcode, 16)} 掃描條碼</button>
          </div>
          <div class="px-grid" id="pxGrid"></div>
          <div class="px-scan" id="pxScan" hidden>
            <div class="px-scan-box"><div class="px-scan-code">${barcodeSvg('scan', 70, 240)}</div><i class="px-laser"></i><span class="px-corner a"></span><span class="px-corner b"></span><span class="px-corner c"></span><span class="px-corner d"></span></div>
            <b class="px-scan-t">對準商品條碼…</b><small class="mono px-scan-n">EAN-13 讀取中</small>
          </div>
        </section>
        <section class="glass px-ai anim-in">
          <div class="px-sec-h"><h3>${icon('sparkle', 16)} AI 加購推薦</h3><span class="chip-sm">依會員紀錄＋購物車</span></div>
          <p class="px-ai-t" id="pxAiT"></p>
          <div class="px-ai-list" id="pxAi"></div>
        </section>
        <section class="glass px-cd anim-in">
          <div class="px-sec-h"><h3>${svg(I.monitor, 16)} <span class="px-h3t">客顯</span></h3><div class="px-langs" id="pxLangs">${Object.entries(CDL).map(([k, v]) => `<button data-act="cdlang" data-l="${k}" class="${k === cdLang ? 'on' : ''}">${v.k}</button>`).join('')}<button data-act="cdauto" class="px-auto" title="多語輪播">${icon('refresh', 12)}</button></div></div>
          <div class="px-screen"><div class="px-scr-h"><span>${icon('leaf', 13)} ${esc(SHOP_NAME)}</span><small id="pxScrClock">--:--</small></div><div class="px-scr-b" id="pxScr"></div><div class="px-scr-f"><span id="pxMar"></span></div></div>
        </section>
        <section class="glass px-cart anim-in">
          <div class="px-cart-h"><div><h3>${icon('cart', 17)} 目前訂單</h3><small class="mono" id="pxTicket"></small></div>
            <div class="px-cart-btns"><button class="icon-btn" data-act="hold" title="掛單">${icon('hang', 16)}</button><button class="icon-btn" data-act="clear" title="清空">${svg(I.trash, 16)}</button></div></div>
          <div class="px-offbar" id="pxOff" hidden>${svg(I.wifiOff, 14)} 離線模式：交易暫存於本機，恢復連線後自動上傳</div>
          <div class="px-mem" id="pxMem"></div>
          <div class="px-lines" id="pxLines"></div>
          <div class="px-promo" id="pxPromo"></div>
          <div class="px-sum" id="pxSum"></div>
          <div class="px-go-row"><button class="btn btn-ghost px-holdbtn" data-act="hold">${icon('hang', 16)} 掛單</button><button class="btn btn-primary px-go" data-act="checkout" id="pxGo" disabled>${icon('check', 18)} 結帳 <b id="pxGoAmt">NT$ 0</b></button></div>
        </section>
        <section class="glass px-side anim-in">
          <div class="px-tabs">
            <button class="px-tab on" data-act="tab" data-t="tx">今日交易 <em id="pxTxN">0</em></button>
            <button class="px-tab" data-act="tab" data-t="je">自動分錄</button>
            <button class="px-tab" data-act="tab" data-t="inv">庫存 <em id="pxLowN" hidden>0</em></button>
          </div>
          <div class="px-pane" data-p="tx">
            <div class="px-txf"><button class="on" data-act="txf" data-f="all">全通路</button><button data-act="txf" data-f="pos">只看門市</button><span>可作廢／折讓／補印</span></div>
            <div class="px-txlist" id="pxTx"></div>
          </div>
          <div class="px-pane" data-p="je" hidden><div class="px-pane-note">由訂單即時產生・含稅拆分 5%</div><div class="journal" id="pxJe"></div></div>
          <div class="px-pane" data-p="inv" hidden><div class="px-pane-note" id="pxInvNote"></div><ul class="inv" id="pxInv"></ul></div>
        </section>
      </div>
    </div>`;

    section.addEventListener('click', onClick);
    $('#pxQ', section).addEventListener('input', (e) => { query = e.target.value; renderTiles(); });
    section.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      if (e.target.id === 'pxPhone') findMember(e.target.value);
      if (e.target.id === 'pxCode') applyCode();
      if (e.target.classList.contains('px-note-in')) saveNote(e.target.value);
      if (e.target.id === 'pxQ') { const first = $('.px-tile', root); if (first) addItem(first.dataset.pid, first); }
    });
    section.addEventListener('input', (e) => { if (e.target.id === 'pxCode') codeDraft = e.target.value; });

    renderTiles(); renderMember(); renderCart(); renderAll(false); renderTicket();
    store.on('order', ({ order }) => { renderAll(true, order.id); renderTiles(); });
    store.on('order-updated', ({ order }) => renderAll(true, order.id));
    store.on('reset', () => { renderAll(false); renderTiles(); });
    onPromos(() => { aiKey = ''; renderTiles(); renderCart(); });
  },
  show() { renderAll(false); renderTiles(); startTick(); },
  hide() { stopTick(); },
};

function startTick() {
  stopTick();
  const clock = () => { const n = $('#pxScrClock', root); if (n) n.textContent = fmtTime(new Date()); };
  clock();
  let i = 0;
  tick = setInterval(() => {
    i++; if (i % 8 === 0) clock();
    if (cdAuto) { const ks = Object.keys(CDL); cdLang = ks[(ks.indexOf(cdLang) + 1) % ks.length]; renderLangs(); renderCD(true); }
  }, 2600);
}
function stopTick() { if (tick) clearInterval(tick); tick = null; }

// ---------- 事件 ----------
function onClick(e) {
  const t = e.target.closest('[data-act]');
  if (!t || !root.contains(t)) return;
  const act = t.dataset.act;
  const pid = t.closest('[data-pid]')?.dataset.pid;
  switch (act) {
    case 'cat': cat = t.dataset.c; $$('.px-cat', root).forEach(b => b.classList.toggle('on', b === t)); renderTiles(true); break;
    case 'add': addItem(pid, t); break;
    case 'scan': scanProduct(); break;
    case 'inc': changeQty(pid, 1); break;
    case 'dec': changeQty(pid, -1); break;
    case 'note': editNote = editNote === pid ? null : pid; renderCart(); { const inp = $('.px-note-in', root); inp && inp.focus(); } break;
    case 'note-chip': { const inp = $('.px-note-in', root); if (inp) { inp.value = inp.value ? `${inp.value}、${t.dataset.v}` : t.dataset.v; inp.focus(); } break; }
    case 'note-ok': saveNote($('.px-note-in', root)?.value || ''); break;
    case 'clear': if (cart.length) { cart = []; code = null; wholePct = 0; usePoints = false; editNote = null; renderCart(); toast('已清空購物車', '', { kind: 'info', icon: svg(I.trash, 18) }); } break;
    case 'mem-find': findMember($('#pxPhone', root)?.value || ''); break;
    case 'mem-scan': scanMember(); break;
    case 'mem-clear': member = null; usePoints = false; if (code === 'BDAY15') code = null; renderMember(); renderCart(); break;
    case 'mem-try': findMember(t.dataset.p); break;
    case 'rule': rules[t.dataset.r] = !rules[t.dataset.r]; renderCart(); break;
    case 'pct': wholePct = +t.dataset.v; renderCart(); break;
    case 'code': applyCode(); break;
    case 'code-x': code = null; codeDraft = ''; renderCart(); break;
    case 'pts': usePoints = !usePoints; renderCart(); break;
    case 'checkout': openCheckout(); break;
    case 'hold': holdCurrent(); break;
    case 'holds': openHolds(); break;
    case 'zreport': openZ(); break;
    case 'net': toggleNet(); break;
    case 'tab': tab = t.dataset.t; $$('.px-tab', root).forEach(b => b.classList.toggle('on', b === t)); $$('.px-pane', root).forEach(p => { p.hidden = p.dataset.p !== tab; }); gsap.fromTo($(`.px-pane[data-p="${tab}"]`, root), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.35 }); break;
    case 'txf': txFilter = t.dataset.f; $$('.px-txf button', root).forEach(b => b.classList.toggle('on', b === t)); renderTx(); break;
    case 'void': openAdjust(t.closest('[data-id]').dataset.id, 'void'); break;
    case 'allow': openAdjust(t.closest('[data-id]').dataset.id, 'allow'); break;
    case 'reprint': reprint(t.closest('[data-id]').dataset.id); break;
    case 'ai-add': addItem(t.dataset.p, t.closest('.px-rec')); break;
    case 'cdlang': cdLang = t.dataset.l; cdAuto = false; renderLangs(); renderCD(true); break;
    case 'cdauto': cdAuto = !cdAuto; renderLangs(); if (cdAuto) toast('客顯多語輪播已開啟', '中文、English、日本語、Tiếng Việt、Bahasa Melayu 依序切換', { kind: 'info', icon: svg(I.monitor, 18) }); break;
    default: break;
  }
}

// ---------- 商品 ----------
function renderTiles(anim) {
  const grid = $('#pxGrid', root); if (!grid) return;
  const inv = Object.fromEntries(store.inventory().map(p => [p.id, p]));
  const q = query.trim().toLowerCase();
  const list = PRODUCTS.filter(p => (cat === 'all' || PMETA[p.id].cat.includes(cat)) && (!q || p.name.toLowerCase().includes(q) || PMETA[p.id].code.includes(q) || (PN[p.id].en.toLowerCase().includes(q))));
  grid.innerHTML = list.length ? list.map(p => {
    const m = PMETA[p.id], s = inv[p.id] || { current: p.stock, low: false };
    const pr = promoInfo(p);
    return `<button class="px-tile ${pr ? 'promo' : ''}" data-act="add" data-pid="${p.id}" style="--pc:${p.color}">
      ${pr ? `<span class="px-ribbon px-ribbon-promo">${esc(pr.badge)}</span>` : m.tag ? `<span class="px-ribbon">${m.tag}</span>` : ''}
      <span class="px-tile-art">${productArt(p.id, 78)}</span>
      <b>${p.name}</b>
      <span class="px-tile-f"><em>${money(p.price)}${pr ? `<s class="px-was">${money(pr.list)}</s>` : ''}</em><small class="${s.low ? 'low' : ''}">${s.low ? '剩 ' : '存 '}${s.current}</small></span>
      <i class="px-q" hidden>0</i></button>`;
  }).join('') : `<div class="px-empty">${svg(I.search, 28)}<span>找不到「${esc(query)}」，試試「${IS_AMEI ? '檸檬' : esc(KIT.short(PRODUCTS[0]))}」或條碼 4719853</span></div>`;
  updateBadges();
  if (anim) gsap.fromTo($$('.px-tile', grid), { opacity: 0, y: 14, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.03, ease: 'power3.out' });
}
function updateBadges() {
  $$('.px-tile', root).forEach(t => {
    const l = cart.find(x => x.pid === t.dataset.pid); const i = $('.px-q', t);
    i.hidden = !l; i.textContent = l ? l.qty : 0; t.classList.toggle('in', !!l);
  });
}
function addItem(pid, fromEl) {
  if (!PRODUCT_MAP[pid]) return;
  const l = cart.find(x => x.pid === pid);
  if (l) l.qty += 1; else cart.push({ pid, qty: 1, note: '' });
  cdThanks = null;
  renderCart(pid);
  if (fromEl) { fly(fromEl, pid); gsap.fromTo(fromEl, { scale: 0.93 }, { scale: 1, duration: 0.45, ease: 'back.out(3)' }); }
  if (member && member.allergy.some(a => PRODUCT_MAP[pid].allergens.includes(a)) && (!l)) {
    toast(`過敏提醒｜${member.name}`, `${PRODUCT_MAP[pid].name} 含${member.allergy.map(a => ALG[a]).join('、')}，會員資料註記過敏，請與顧客確認`, { kind: 'warn', icon: icon('alert', 18) });
  }
}
function fly(fromEl, pid) {
  const target = $('#pxLines', root); if (!target || !fromEl.getBoundingClientRect) return;
  const a = fromEl.getBoundingClientRect(), b = target.getBoundingClientRect();
  if (!a.width || !b.width) return;
  const f = el(`<div class="px-fly">${productArt(pid, 60)}</div>`); document.body.appendChild(f);
  gsap.fromTo(f, { x: a.left + a.width / 2 - 30, y: a.top + 10, scale: 1, opacity: 1 },
    { x: b.left + 30, y: b.top + Math.min(b.height - 40, 30), scale: 0.45, opacity: 0.3, duration: 0.6, ease: 'power2.in', onComplete: () => f.remove() });
}
function changeQty(pid, d) {
  const l = cart.find(x => x.pid === pid); if (!l) return;
  l.qty += d; if (l.qty <= 0) { cart = cart.filter(x => x !== l); if (editNote === pid) editNote = null; }
  renderCart(d > 0 ? pid : null);
}
function saveNote(v) {
  const l = cart.find(x => x.pid === editNote); if (l) l.note = v.trim().slice(0, 40);
  editNote = null; renderCart();
}
async function scanProduct() {
  const box = $('#pxScan', root); if (!box.hidden) return;
  box.hidden = false;
  const pick = PRODUCTS[Math.floor(scanRng() * PRODUCTS.length)];
  scanSeq++;
  $('.px-scan-t', box).textContent = '對準商品條碼…'; $('.px-scan-n', box).textContent = 'EAN-13 讀取中';
  $('.px-scan-code', box).innerHTML = barcodeSvg(PMETA[pick.id].code, 70, 240);
  gsap.fromTo(box, { opacity: 0 }, { opacity: 1, duration: 0.25 });
  gsap.fromTo($('.px-scan-box', box), { scale: 0.8 }, { scale: 1, duration: 0.4, ease: 'back.out(2)' });
  await sleep(1100);
  beep();
  box.classList.add('hit');
  $('.px-scan-t', box).textContent = `${pick.name}　${money(pick.price)}`;
  $('.px-scan-n', box).textContent = `${PMETA[pick.id].code} ✓ 已辨識`;
  await sleep(650);
  addItem(pick.id, $('.px-scan-box', box));
  gsap.to(box, { opacity: 0, duration: 0.3, onComplete: () => { box.hidden = true; box.classList.remove('hit'); } });
}

// ---------- 會員 ----------
function renderMember() {
  const box = $('#pxMem', root); if (!box) return;
  if (!member) {
    box.innerHTML = `<div class="px-mem-find"><span class="px-mem-ic">${icon('user', 16)}</span><input id="pxPhone" inputmode="numeric" maxlength="12" placeholder="會員手機號碼" autocomplete="off">
      <button class="btn btn-ghost btn-sm" data-act="mem-find">查詢</button><button class="icon-btn px-mscan" data-act="mem-scan" title="掃會員條碼">${svg(I.barcode, 16)}</button></div>
      <div class="px-mem-try">試用：${MEMBERS.map(m => `<button data-act="mem-try" data-p="${m.phone}">${m.phone.replace(/(\d{4})(\d{3})(\d{3})/, '$1-$2-$3')}</button>`).join('')}</div>`;
    return;
  }
  const m = member;
  const last = m.last ? `${fmtMD(m.last.d)} ${m.last.items.map(([p, q]) => `${PRODUCT_MAP[p].name}×${q}`).join('、')}` : '首次消費';
  box.innerHTML = `<div class="px-mem-card" style="--c:${m.c}">
    <span class="px-av">${esc(m.name.slice(0, 1))}</span>
    <div class="px-mem-b">
      <div class="px-mem-n"><b>${esc(m.full)}</b><span class="px-tier">${m.tier}會員</span>${m.bday ? '<span class="px-bday">本月壽星</span>' : ''}${m.lang !== 'zh' ? `<span class="px-lang">${CDL[m.lang].k}</span>` : ''}</div>
      <small>點數 <b class="px-pts-v">${nf(m.points)}</b>・上次 ${esc(last)}・來店 ${m.visits} 次</small>
      <small class="${m.allergy.length ? 'px-alg' : 'px-ok'}">${m.allergy.length ? `${icon('alert', 12)} 過敏：${m.allergy.map(a => ALG[a]).join('、')}` : `${icon('check', 12)} 無過敏註記`}・${esc(m.pref)}</small>
    </div>
    <button class="px-x" data-act="mem-clear" title="移除會員">${icon('x', 14)}</button></div>`;
  gsap.fromTo($('.px-mem-card', box), { opacity: 0, y: -8, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'back.out(1.8)' });
}
function setMember(m) {
  member = m; usePoints = false;
  if (m.lang && CDL[m.lang]) { cdLang = m.lang; renderLangs(); }
  renderMember(); renderCart();
  toast(`會員：${m.full}（${m.tier}）`, `點數 ${nf(m.points)}・${m.allergy.length ? `注意過敏：${m.allergy.map(a => ALG[a]).join('、')}` : m.pref}`, { kind: m.allergy.length ? 'warn' : 'info', icon: icon('user', 18) });
}
function findMember(raw) {
  const phone = String(raw).replace(/\D/g, '');
  const m = MEMBERS.find(x => x.phone === phone);
  if (m) return setMember(m);
  if (/^09\d{8}$/.test(phone)) {
    const nm = { id: `M-${String(900 + (hash(phone) % 99)).padStart(6, '0')}`, phone, name: '新會員', full: `新會員（${phone.slice(-3)}）`, tier: '一般', c: '#5EE0C4', points: 50, visits: 0, last: null, allergy: [], lang: 'zh', pref: '首購贈 50 點' };
    MEMBERS.push(nm); setMember(nm);
    toast('已快速註冊新會員（示範）', `手機 ${phone.slice(0, 4)}-***-${phone.slice(-3)}，首購贈 50 點`, { icon: icon('plus', 18) });
    return;
  }
  toast('手機號碼格式不正確', '請輸入 09 開頭的 10 碼手機號碼', { kind: 'warn', icon: icon('alert', 18) });
  const inp = $('#pxPhone', root); inp && gsap.fromTo(inp, { x: -6 }, { x: 0, duration: 0.4, ease: 'elastic.out(1, 0.3)' });
}
async function scanMember() {
  const box = $('#pxMem', root);
  const ov = el(`<div class="px-mscan-ov"><i class="px-laser"></i>${svg(I.barcode, 20)}<span>請顧客出示會員條碼…</span></div>`);
  box.appendChild(ov); gsap.fromTo(ov, { opacity: 0 }, { opacity: 1, duration: 0.2 });
  await sleep(1000); beep(1500);
  const m = MEMBERS[memScanSeq++ % 3];
  setMember(m);
}

// ---------- 購物車 ----------
function renderTicket() { const n = $('#pxTicket', root); if (n) n.textContent = `POS-01・單號 ${fmtMD(new Date()).replace('/', '')}-${String(ticketSeq).padStart(3, '0')}・收銀 ${CASHIER}`; }
function renderCart(hiPid) {
  const c = calc();
  const box = $('#pxLines', root);
  updateBadges();
  if (!c.lines.length) {
    box.innerHTML = `<div class="px-cart-empty"><div class="px-ce-ic">${icon('cart', 30)}</div><b>點選左側商品或掃描條碼</b><small>支援會員、折扣碼、第二件 8 折與點數折抵</small></div>`;
  } else {
    box.innerHTML = c.lines.map(l => {
      const hit = member && member.allergy.filter(a => l.p.allergens.includes(a));
      return `<div class="px-line ${hit && hit.length ? 'warn' : ''}" data-pid="${l.pid}">
        <span class="px-line-art">${productArt(l.pid, 42)}</span>
        <div class="px-line-b"><b>${l.p.name}</b>
          <small>${money(l.p.price)}／${l.p.unit}${l.pr ? ` <s class="px-was">${money(l.pr.list)}</s> <i class="px-pbadge">${esc(l.pr.badge)}</i>` : ''}${l.second ? ` <em>第二件 8 折 −${nf(l.second)}</em>` : ''}</small>
          ${l.note && editNote !== l.pid ? `<span class="px-note">${svg(I.pen, 11)} ${esc(l.note)}</span>` : ''}
          ${hit && hit.length ? `<span class="px-awarn">${icon('alert', 11)} 含${hit.map(a => ALG[a]).join('、')}・會員過敏</span>` : ''}
        </div>
        <div class="px-qty"><button data-act="dec" aria-label="減少">${icon('minus', 13)}</button><b>${l.qty}</b><button data-act="inc" aria-label="增加">${icon('plus', 13)}</button></div>
        <b class="px-line-amt">${money(l.amt)}</b>
        <button class="px-note-btn ${l.note ? 'has' : ''}" data-act="note" title="單品備註">${svg(I.pen, 13)}</button>
        ${editNote === l.pid ? `<div class="px-note-ed"><input class="px-note-in" maxlength="40" value="${esc(l.note)}" placeholder="${IS_AMEI ? '例：加蠟燭 2 支、生日卡文字…' : `例：${NOTE_CHIPS[0]}、${NOTE_CHIPS[3]}…`}"><button class="btn btn-primary btn-sm" data-act="note-ok">確定</button>
          <div class="px-note-chips">${NOTE_CHIPS.map(v => `<button data-act="note-chip" data-v="${v}">${v}</button>`).join('')}</div></div>` : ''}
      </div>`;
    }).join('');
    if (hiPid) { const n = $(`.px-line[data-pid="${hiPid}"]`, box); if (n) { gsap.fromTo(n, { backgroundColor: 'rgba(45,182,116,.28)' }, { backgroundColor: 'rgba(45,182,116,0)', duration: 1.2 }); n.scrollIntoView({ block: 'nearest' }); } }
  }
  // 優惠
  $('#pxPromo', root).innerHTML = `
    <div class="px-pr-row">
      <button class="px-pchip ${rules.second ? 'on' : ''}" data-act="rule" data-r="second">${svg(I.tag, 12)} 第二件 8 折</button>
      <button class="px-pchip ${rules.threshold ? 'on' : ''}" data-act="rule" data-r="threshold">${svg(I.tag, 12)} 滿 1,500 折 150</button>
      ${code ? `<span class="px-codechip ${c.codeMsg ? 'bad' : ''}">${esc(code)}${c.codeMsg ? `・${esc(c.codeMsg)}` : ''}<button data-act="code-x" aria-label="移除">${icon('x', 11)}</button></span>`
    : `<span class="px-code"><input id="pxCode" placeholder="折扣碼" value="${esc(codeDraft)}" autocomplete="off"><button data-act="code">套用</button></span>`}
    </div>
    <div class="px-pr-row">
      <span class="px-pct"><small>整單</small>${[0, 0.05, 0.1, 0.15].map(v => `<button class="${wholePct === v ? 'on' : ''}" data-act="pct" data-v="${v}">${v ? PCT_LABEL[v] : '無'}</button>`).join('')}</span>
      ${member ? `<button class="px-ptsw ${usePoints ? 'on' : ''}" data-act="pts" ${c.maxPts ? '' : 'disabled'}><span class="px-sw ${usePoints ? 'on' : ''}"><i></i></span>點數折抵 <b>${nf(c.maxPts)}</b></button>` : '<span class="px-pr-hint">輸入會員可折抵點數</span>'}
    </div>`;
  // 合計
  $('#pxSum', root).innerHTML = `
    <div class="px-sum-row"><span>小計（${c.count} 件）</span><b>${money(c.subtotal)}</b></div>
    ${c.discounts.map(d => `<div class="px-sum-row disc"><span>${svg(I.tag, 12)} ${esc(d.label)}</span><b>−${money(d.amt)}</b></div>`).join('')}
    <div class="px-sum-tot"><span>應付金額<small>銷售額 ${money(c.net)}・稅額 ${money(c.tax)}${member ? `・可得 ${c.earn} 點` : ''}</small></span><b id="pxTotal">${money(c.total)}</b></div>`;
  $('#pxGoAmt', root).textContent = money(c.total);
  $('#pxGo', root).disabled = !c.lines.length;
  renderAI(); renderCD();
}
function applyCode() {
  const v = ($('#pxCode', root)?.value || codeDraft).trim().toUpperCase();
  if (!v) return;
  if (!CODES[v]) {
    toast('折扣碼無效', `「${v}」不存在或已過期。示範可用：${Object.keys(CODES).join('、')}`, { kind: 'warn', icon: icon('alert', 18) });
    const n = $('.px-code', root); n && gsap.fromTo(n, { x: -6 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
    return;
  }
  code = v; codeDraft = ''; renderCart();
  const c = calc();
  toast(c.codeMsg ? `折扣碼 ${v} 已加入（尚未生效）` : `已套用折扣碼 ${v}`, c.codeMsg || CODES[v].desc, { kind: c.codeMsg ? 'warn' : 'ok', icon: svg(I.tag, 18) });
}

// ---------- AI 推薦 ----------
function renderAI() {
  const inCart = new Set(cart.map(l => l.pid));
  let base, head;
  if (member && member.last) { base = member.last.items[0][0]; head = `${member.name}上次買了${PRODUCT_MAP[base].name}，推薦搭配：`; }
  if (cart.length) { base = cart[cart.length - 1].pid; head = member && member.last ? `${member.name}上次買${PRODUCT_MAP[member.last.items[0][0]].name}，這次有${PRODUCT_MAP[base].name}，推薦搭配：` : `購物車有${PRODUCT_MAP[base].name}，常一起買：`; }
  if (!base) { base = IS_AMEI ? 'lemon' : G.pop[0].id; head = '今日門市熱賣，適合推薦給新客人：'; }
  const avoid = member ? member.allergy : [];
  let recs = (PAIR[base] || []).filter(p => !inCart.has(p) && !PRODUCT_MAP[p].allergens.some(a => avoid.includes(a)));
  if (recs.length < 2) recs = recs.concat(PRODUCTS.map(p => p.id).filter(p => p !== base && !inCart.has(p) && !recs.includes(p) && !PRODUCT_MAP[p].allergens.some(a => avoid.includes(a)))).slice(0, 2);
  recs = recs.slice(0, 2);
  const key = head + recs.join();
  if (key === aiKey) return; aiKey = key;
  const t = $('#pxAiT', root); typeText(t, head, 18);
  const pct = (p) => 38 + hash(base + p) % 40;
  $('#pxAi', root).innerHTML = recs.map(p => {
    const P = PRODUCT_MAP[p];
    return `<div class="px-rec"><span class="px-rec-art">${productArt(p, 50)}</span><div class="px-rec-b"><b>${P.name} <small>${money(P.price)}</small></b><span>${esc(WHY[`${base}>${p}`] || `買${PRODUCT_MAP[base].name}的顧客有 ${pct(p)}% 也會帶這款`)}</span></div>
      <button class="btn btn-sm px-rec-add" data-act="ai-add" data-p="${p}">${icon('plus', 13)}<span class="px-rec-t">加入</span></button></div>`;
  }).join('') + (member && member.allergy.length ? `<div class="px-ai-safe">${icon('shield', 12)} 已排除含${member.allergy.map(a => ALG[a]).join('、')}商品</div>` : '');
  gsap.fromTo($$('.px-rec', root), { opacity: 0, x: 16 }, { opacity: 1, x: 0, duration: 0.45, stagger: 0.08, ease: 'power3.out' });
}

// ---------- 客顯 ----------
function renderLangs() { $$('#pxLangs button', root).forEach(b => b.classList.toggle('on', b.dataset.l ? b.dataset.l === cdLang : cdAuto)); }
function pname(pid) { return cdLang === 'zh' ? PRODUCT_MAP[pid].name : (PN[pid][cdLang] || PN[pid].en); }
function renderCD(anim) {
  const box = $('#pxScr', root); if (!box) return;
  const L = CDL[cdLang];
  $('#pxMar', root).textContent = L.mar;
  if (cdThanks) {
    box.innerHTML = `<div class="cd-thanks"><span class="cd-ok">${icon('check', 22)}</span><b>${L.thanks}</b><small>${L.sub}</small>
      <div class="cd-row">${cdThanks.change ? `<span><small>${L.change}</small><b>${money(cdThanks.change)}</b></span>` : ''}${cdThanks.earn ? `<span><small>Points</small><b>+${cdThanks.earn}</b></span>` : ''}</div></div>`;
  } else if (!cart.length) {
    box.innerHTML = `<div class="cd-idle"><div class="cd-arts">${(IS_AMEI ? ['lemon', 'roll', 'canele'] : G.pop.slice(0, 3).map(p => p.id)).map(p => productArt(p, 46)).join('')}</div><b>${L.welcome}</b><small>${L.idle}</small></div>`;
  } else {
    const c = calc();
    const shown = c.lines.slice(-3);
    box.innerHTML = `<ul class="cd-items">${shown.map(l => `<li><span>${esc(pname(l.pid))}</span><em>×${l.qty}</em><b>${nf(l.amt)}</b></li>`).join('')}${c.lines.length > 3 ? `<li class="more">${L.more.replace('{n}', c.lines.length - 3)}</li>` : ''}</ul>
      ${c.disc ? `<div class="cd-disc">${L.saved} −${money(c.disc)}</div>` : ''}
      <div class="cd-due"><small>${L.due}</small><b>${money(c.total)}</b></div>`;
  }
  if (anim) gsap.fromTo(box.firstElementChild, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.35 });
}

// ---------- 彈窗 ----------
function modal(html, cls = '') {
  const m = el(`<div class="px-modal ${cls}">${html}</div>`);
  document.body.appendChild(m);
  const close = () => { document.removeEventListener('keydown', onKey); gsap.to(m, { opacity: 0, duration: 0.22, onComplete: () => m.remove() }); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('[data-act="close"]')) close(); });
  gsap.fromTo(m, { opacity: 0 }, { opacity: 1, duration: 0.25 });
  gsap.fromTo(m.firstElementChild, { y: 30, scale: 0.96, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(1.5)' });
  return { m, close };
}

// ---------- 結帳 ----------
function openCheckout() {
  const c = calc(); if (!c.lines.length) return;
  editNote = null;
  const P = { method: 'cash', tendered: '', splitA: '', splitB: 'card', inv: member ? 'carrier' : 'print', ctype: member ? 'member' : 'mobile', carrier: '', taxId: '', title: '', donate: '' };
  const { m, close } = modal(`<div class="px-dlg px-co">
    <div class="px-dlg-h"><div><h3>${icon('pos', 18)} 結帳</h3><small>${c.count} 件・${member ? `${esc(member.full)}（${member.tier}）` : '門市顧客'}${c.disc ? `・已折 ${money(c.disc)}` : ''}${online ? '' : '・<b class="px-offtxt">離線暫存</b>'}</small></div>
      <div class="px-co-due"><small>應收金額</small><b>${money(c.total)}</b></div><button class="icon-btn" data-act="close" aria-label="關閉">${icon('x', 18)}</button></div>
    <div class="px-co-body">
      <div class="px-co-pay"><div class="px-co-lbl">付款方式</div>
        <div class="px-methods">${PAY.map(p => `<button class="px-m ${p.id === P.method ? 'on' : ''}" data-m="${p.id}" style="--c:${p.c}"><span>${svg(PAY_IC[p.id], 22)}</span><b>${p.name}</b></button>`).join('')}</div>
        <div class="px-co-area" id="coArea"></div></div>
      <div class="px-co-inv"><div class="px-co-lbl">電子發票</div>
        <div class="px-invtabs">${[['print', '雲端發票'], ['carrier', '載具'], ['tax', '統編'], ['donate', '捐贈']].map(([k, v]) => `<button data-i="${k}" class="${P.inv === k ? 'on' : ''}">${v}</button>`).join('')}</div>
        <div class="px-inv-area" id="coInv"></div>
        <div class="px-co-sum">
          ${c.lines.map(l => `<div><span>${l.p.name} ×${l.qty}</span><b>${nf(l.amt)}</b></div>`).join('')}
          ${c.discounts.map(d => `<div class="disc"><span>${esc(d.label)}</span><b>−${nf(d.amt)}</b></div>`).join('')}
          <div class="tot"><span>應收（含稅 5%）</span><b>${money(c.total)}</b></div>
          ${member ? `<div class="pts"><span>會員點數</span><b>${c.ptsUsed ? `−${c.ptsUsed} ` : ''}+${c.earn} 點</b></div>` : ''}
        </div></div>
    </div>
    <div class="px-dlg-f"><span class="px-co-msg" id="coMsg"></span><button class="btn btn-ghost" data-act="close">取消</button><button class="btn btn-primary btn-lg" id="coGo">${icon('check', 18)} 確認收款・開立發票</button></div>
    <div class="px-proc" id="coProc" hidden><div class="px-ring"></div><b id="coProcT">處理中…</b><ul id="coProcL"></ul></div>
  </div>`, 'px-co-modal');

  const due = c.total;
  const area = $('#coArea', m), invA = $('#coInv', m), msg = $('#coMsg', m), go = $('#coGo', m);
  const quick = () => { const s = new Set([due, Math.ceil(due / 100) * 100, Math.ceil(due / 500) * 500, Math.ceil(due / 1000) * 1000, Math.ceil((due + 1) / 1000) * 1000 + (due >= 1000 ? 1000 : 0)]); return [...s].filter(v => v >= due).sort((a, b) => a - b).slice(0, 4); };
  const keypad = () => `<div class="px-keypad">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'del'].map(k => `<button data-k="${k}">${k === 'del' ? svg(I.back, 20) : k}</button>`).join('')}</div>`;

  function renderPay() {
    $$('.px-m', m).forEach(b => b.classList.toggle('on', b.dataset.m === P.method));
    const meth = PAY.find(x => x.id === P.method);
    if (P.method === 'cash') {
      area.innerHTML = `<div class="px-cash"><div class="px-cash-disp"><div><small>收取現金</small><b id="coTend">NT$ 0</b></div><div class="chg"><small>找零</small><b id="coChg">—</b></div></div>
        <div class="px-quick">${quick().map(v => `<button data-q="${v}">${v === due ? '剛好 ' : ''}${money(v)}</button>`).join('')}</div>${keypad()}</div>`;
    } else if (P.method === 'split') {
      area.innerHTML = `<div class="px-split">
        <div class="px-sp-row"><span class="px-sp-n">1</span><span>${svg(I.cash, 16)} 現金</span><b id="spA">NT$ 0</b></div>
        <div class="px-sp-row"><span class="px-sp-n">2</span><span class="px-sp-ms">${['card', 'linepay', 'jko', 'easy'].map(k => `<button data-sb="${k}" class="${P.splitB === k ? 'on' : ''}">${PAY_LABEL[k]}</button>`).join('')}</span><b id="spB">${money(due)}</b></div>
        <div class="px-quick">${[Math.round(due / 2 / 10) * 10, 500, 1000].filter(v => v < due).map(v => `<button data-sq="${v}">${v === Math.round(due / 2 / 10) * 10 ? '各半 ' : '現金 '}${money(v)}</button>`).join('')}</div>${keypad()}</div>`;
    } else {
      const txt = { card: ['已傳送金額至刷卡機（示範）', '請顧客插卡、刷卡或感應信用卡／手機錢包'], linepay: ['請掃描顧客 LINE Pay 付款碼（示範）', '顧客開啟 App 付款條碼，對準掃描槍即可'], jko: ['請掃描顧客街口支付付款碼（示範）', '支援街口帳戶與綁定卡，回饋由平台發放'], easy: ['請將悠遊卡放上感應區（示範）', '扣款後顯示卡片餘額，餘額不足可改分開付款'] }[P.method];
      area.innerHTML = `<div class="px-term" style="--c:${meth.c}"><div class="px-dev ${P.method}">
          <div class="px-dev-scr"><small>${meth.name}</small><b>${money(due)}</b></div>
          ${P.method === 'card' ? '<div class="px-dev-keys">' + '<i></i>'.repeat(12) + '</div><div class="px-dev-card"></div>' : ''}
          ${P.method === 'easy' ? '<div class="px-waves"><i></i><i></i><i></i></div><div class="px-dev-card ez"></div>' : ''}
          ${P.method === 'linepay' || P.method === 'jko' ? `<div class="px-dev-phone"><div>${qrSvg(hash(P.method), 21)}</div><i class="px-laser"></i></div>` : ''}
        </div><b>${txt[0]}</b><small>${txt[1]}</small></div>`;
    }
    gsap.fromTo(area.firstElementChild, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35 });
    updatePay();
  }
  function updatePay() {
    if (P.method === 'cash') {
      const t = +P.tendered || 0;
      $('#coTend', m).textContent = money(t);
      const chg = t - due;
      const n = $('#coChg', m); n.textContent = t ? (chg >= 0 ? money(chg) : `差 ${money(-chg)}`) : '—';
      n.parentElement.classList.toggle('neg', t > 0 && chg < 0); n.parentElement.classList.toggle('pos', chg >= 0 && t > 0);
    }
    if (P.method === 'split') {
      const a = Math.min(+P.splitA || 0, due);
      $('#spA', m).textContent = money(a); $('#spB', m).textContent = money(due - a);
      $$('[data-sb]', m).forEach(b => b.classList.toggle('on', b.dataset.sb === P.splitB));
    }
    validate();
  }
  function renderInv() {
    $$('.px-invtabs button', m).forEach(b => b.classList.toggle('on', b.dataset.i === P.inv));
    let h = '';
    if (P.inv === 'print') h = `<div class="px-inv-note">${icon('receipt', 18)}<div><b>列印電子發票證明聯（二聯式）</b><small>B2C 一般發票，顧客可於財政部電子發票平台查詢、自動對獎（示範）</small></div></div>`;
    if (P.inv === 'carrier') h = `<div class="px-csub">${[['mobile', '手機條碼'], ['cert', '自然人憑證'], ...(member ? [['member', '會員載具']] : [])].map(([k, v]) => `<button data-ct="${k}" class="${P.ctype === k ? 'on' : ''}">${v}</button>`).join('')}</div>
      ${P.ctype === 'member' ? `<div class="px-inv-note ok">${icon('user', 18)}<div><b>存入 ${esc(member.full)} 的會員載具</b><small>載具號碼 ${member.id}・不列印證明聯，中獎自動通知</small></div></div>`
    : `<div class="px-field"><input id="coCarrier" value="${esc(P.carrier)}" placeholder="${P.ctype === 'mobile' ? '/ABC+123（斜線開頭共 8 碼）' : '2 碼英文 + 14 碼數字'}" maxlength="${P.ctype === 'mobile' ? 8 : 16}" autocomplete="off"><span class="px-vd" id="coVd"></span></div>
      <button class="btn btn-ghost btn-sm px-scanc" data-scanc="1">${svg(I.barcode, 14)} 掃描顧客手機條碼</button>`}`;
    if (P.inv === 'tax') h = `<div class="px-field"><input id="coTax" inputmode="numeric" value="${esc(P.taxId)}" placeholder="買方統一編號 8 碼" maxlength="8" autocomplete="off"><span class="px-vd" id="coVd"></span></div>
      <div class="px-field"><input id="coTitle" value="${esc(P.title)}" placeholder="公司抬頭（選填）" autocomplete="off"></div>
      ${member && member.taxId ? `<button class="btn btn-ghost btn-sm" data-usetax="1">${icon('user', 14)} 帶入會員常用統編 ${member.taxId}</button>` : '<small class="px-hint">示範可用：53212539、24536806</small>'}
      <small class="px-hint">三聯式（格式 25）：證明聯列印買方統編、銷售額與稅額</small>`;
    if (P.inv === 'donate') h = `<div class="px-don">${DONATE.map(d => `<button data-dn="${d.code}" class="${P.donate === d.code ? 'on' : ''}"><b>${d.code}</b><small>${d.name}</small></button>`).join('')}</div>
      <div class="px-field"><input id="coDon" inputmode="numeric" value="${esc(P.donate)}" placeholder="或輸入捐贈碼（3～7 碼數字）" maxlength="7" autocomplete="off"><span class="px-vd" id="coVd"></span></div>`;
    invA.innerHTML = h;
    gsap.fromTo(invA, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3 });
    validate();
  }
  function invValid() {
    if (P.inv === 'print') return [true, ''];
    if (P.inv === 'carrier') {
      if (P.ctype === 'member') return [true, ''];
      if (P.ctype === 'mobile') return /^\/[0-9A-Z.+-]{7}$/.test(P.carrier) ? [true, '手機條碼格式正確'] : [false, P.carrier ? '格式：/ 開頭＋7 碼（0-9、A-Z、+、-、.）' : '請輸入手機條碼'];
      return /^[A-Z]{2}\d{14}$/.test(P.carrier) ? [true, '自然人憑證格式正確'] : [false, P.carrier ? '格式：2 碼大寫英文＋14 碼數字' : '請輸入自然人憑證條碼'];
    }
    if (P.inv === 'tax') return validUBN(P.taxId) ? [true, '統編檢查碼正確'] : [false, P.taxId.length === 8 ? '統編檢查碼不符，請再確認' : '請輸入 8 碼統一編號'];
    if (P.inv === 'donate') return /^\d{3,7}$/.test(P.donate) ? [true, '捐贈碼格式正確'] : [false, '請選擇或輸入捐贈碼'];
    return [true, ''];
  }
  function validate() {
    const [iv, imsg] = invValid();
    const vd = $('#coVd', m);
    if (vd) { const has = (P.inv === 'carrier' && P.carrier) || (P.inv === 'tax' && P.taxId) || (P.inv === 'donate' && P.donate); vd.className = `px-vd ${has ? (iv ? 'ok' : 'bad') : ''}`; vd.innerHTML = has ? `${icon(iv ? 'check' : 'alert', 12)} ${imsg}` : ''; }
    let pv = true, pmsg = '';
    if (P.method === 'cash') { const t = +P.tendered || 0; pv = t >= due; pmsg = pv ? `找零 ${money(t - due)}` : (t ? `收取金額不足 ${money(due - t)}` : '請輸入收取金額或點選快捷金額'); }
    if (P.method === 'split') { const a = +P.splitA || 0; pv = a > 0 && a < due; pmsg = pv ? `現金 ${money(a)}＋${PAY_LABEL[P.splitB]} ${money(due - a)}` : '請輸入第 1 筆現金金額（需小於應收）'; }
    go.disabled = !(iv && pv);
    msg.textContent = !iv ? imsg : pmsg; msg.className = `px-co-msg ${iv && pv ? 'ok' : ''}`;
  }
  function key(k) {
    const f = P.method === 'split' ? 'splitA' : 'tendered';
    if (k === 'del') P[f] = P[f].slice(0, -1); else if (P[f].length < 6) P[f] = (P[f] + k).replace(/^0+/, '');
    updatePay();
  }

  m.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.m) { P.method = b.dataset.m; P.tendered = ''; P.splitA = ''; renderPay(); }
    else if (b.dataset.k) { key(b.dataset.k); gsap.fromTo(b, { scale: 0.9 }, { scale: 1, duration: 0.3, ease: 'back.out(3)' }); }
    else if (b.dataset.q) { P.tendered = b.dataset.q; updatePay(); }
    else if (b.dataset.sq) { P.splitA = b.dataset.sq; updatePay(); }
    else if (b.dataset.sb) { P.splitB = b.dataset.sb; updatePay(); }
    else if (b.dataset.i) { P.inv = b.dataset.i; renderInv(); }
    else if (b.dataset.ct) { P.ctype = b.dataset.ct; P.carrier = ''; renderInv(); }
    else if (b.dataset.dn) { P.donate = b.dataset.dn; renderInv(); }
    else if (b.dataset.usetax) { P.taxId = member.taxId; P.title = member.company; renderInv(); }
    else if (b.dataset.scanc) { b.disabled = true; b.innerHTML = '掃描中…'; setTimeout(() => { beep(1500); P.carrier = P.ctype === 'mobile' ? '/K7Q+2.M' : 'AB12345678901234'; renderInv(); }, 800); }
  });
  m.addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'coCarrier') { t.value = t.value.toUpperCase(); P.carrier = t.value; validate(); }
    if (t.id === 'coTax') { t.value = t.value.replace(/\D/g, ''); P.taxId = t.value; if (validUBN(P.taxId) && !P.title) { P.title = '（示範）統編查詢：已登記營業人'; const ti = $('#coTitle', m); if (ti) ti.value = P.title; } validate(); }
    if (t.id === 'coTitle') P.title = t.value;
    if (t.id === 'coDon') { t.value = t.value.replace(/\D/g, ''); P.donate = t.value; $$('.px-don button', m).forEach(b => b.classList.toggle('on', b.dataset.dn === P.donate)); validate(); }
  });
  const onKey = (e) => {
    if (!document.body.contains(m)) return document.removeEventListener('keydown', onKey);
    if (e.target.tagName === 'INPUT') return;
    if ((P.method === 'cash' || P.method === 'split') && /^\d$/.test(e.key)) key(e.key);
    if ((P.method === 'cash' || P.method === 'split') && e.key === 'Backspace') key('del');
    if (e.key === 'Enter' && !go.disabled) go.click();
  };
  document.addEventListener('keydown', onKey);
  go.addEventListener('click', async () => {
    if (go.disabled) return;
    const proc = $('#coProc', m); proc.hidden = false;
    gsap.fromTo(proc, { opacity: 0 }, { opacity: 1, duration: 0.25 });
    const auth = String(100000 + hash(Date.now()) % 900000);
    const steps = {
      cash: ['開啟錢櫃', `收取 ${money(+P.tendered)}・找零 ${money(+P.tendered - due)}`],
      card: ['傳送金額至刷卡機', '等待顧客感應…', `授權成功・授權碼 ${auth}`],
      linepay: ['掃描顧客付款碼', '向 LINE Pay 請款（示範）', '付款成功'],
      jko: ['掃描顧客付款碼', '向街口支付請款（示範）', '付款成功'],
      easy: ['偵測悠遊卡', `扣款成功・卡片餘額 ${money(300 + hash(auth) % 1200)}`],
      split: [`收取現金 ${money(+P.splitA)}`, `${PAY_LABEL[P.splitB]} 扣款 ${money(due - +P.splitA)}`, '兩筆款項皆完成'],
    }[P.method];
    const ul = $('#coProcL', m);
    for (const s of [...steps, online ? '開立電子發票並上傳（示範）' : '離線：暫存交易於本機']) {
      $('#coProcT', m).textContent = s;
      const li = el(`<li>${icon('check', 13)} ${esc(s)}</li>`); ul.appendChild(li);
      gsap.fromTo(li, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.3 });
      await sleep(P.method === 'cash' ? 380 : 560);
    }
    beep(1760, 0.12);
    document.removeEventListener('keydown', onKey);
    close();
    finalize(c, P);
  });
  renderPay(); renderInv();
}

function finalize(c, P) {
  const due = c.total;
  const items = c.lines.map(l => ({ pid: l.pid, qty: l.qty, ...(l.note ? { note: l.note } : {}) }));
  let payment = PAY_LABEL[P.method], payments = null, tendered = null, change = null;
  if (P.method === 'cash') { tendered = +P.tendered; change = tendered - due; }
  if (P.method === 'split') { const a = +P.splitA; payments = [{ method: '現金', amount: a }, { method: PAY_LABEL[P.splitB], amount: due - a }]; tendered = a; change = 0; }
  let carrier = null, buyerTaxId = '', donate = '';
  if (P.inv === 'carrier') carrier = P.ctype === 'member' ? { type: '會員載具', code: member.id } : { type: P.ctype === 'mobile' ? '手機條碼' : '自然人憑證', code: P.carrier };
  if (P.inv === 'tax') buyerTaxId = P.taxId;
  if (P.inv === 'donate') donate = P.donate;
  const params = {
    channel: 'pos', customer: member ? member.full : '門市顧客', lang: member?.lang || 'zh', items, payment, status: 'paid',
    discount: c.disc, buyerTaxId, carrier, donate, member: member ? { id: member.id, name: member.full, tier: member.tier } : null,
    tendered, change, payments, note: c.discounts.map(d => `${d.label} −${d.amt}`).join('；'),
  };
  const info = { c, P, carrier, buyerTaxId, title: P.title, donate, payment, payments, tendered, change, earn: c.earn, ptsUsed: c.ptsUsed, memberName: member?.full, memberTier: member?.tier || '', memberLeft: member ? member.points - c.ptsUsed + c.earn : 0 };
  if (member) member.points = member.points - c.ptsUsed + c.earn;
  let order = null;
  if (online) order = store.createOrder(params);
  else {
    const q = { tmp: `OFF-${String(queue.length + 1).padStart(3, '0')}`, ts: Date.now(), params, total: due };
    queue.push(q); renderNet(); renderTx();
  }
  cdThanks = { change: change || 0, earn: c.earn };
  cart = []; member = null; usePoints = false; code = null; codeDraft = ''; wholePct = 0; ticketSeq++;
  renderMember(); renderCart(); renderTicket(); renderCD(true);
  clearTimeout(cdTimer); cdTimer = setTimeout(() => { cdThanks = null; renderCD(true); }, 9000);
  openDone(order, info);
  if (order) {
    setTimeout(() => toast('已自動入帳・扣庫存・寫入會計分錄', `借 ${store.journalFor(order)[0].lines[0].acct} ${money(order.total)}／貸 銷貨收入 ${money(order.net)}、銷項稅額 ${money(order.tax)}；總覽與會計帳務已同步`, { icon: icon('book', 18) }), 700);
  } else {
    setTimeout(() => toast('離線交易已暫存', `目前暫存 ${queue.length} 筆，恢復連線後自動上傳並配發發票號碼`, { kind: 'warn', icon: svg(I.wifiOff, 18) }), 500);
  }
}

// ---------- 電子發票證明聯 ----------
function einvoiceHtml(d) {
  const t = new Date(d.ts); const roc = t.getFullYear() - 1911; const mo = t.getMonth() + 1; const s = mo % 2 ? mo : mo - 1;
  const no = d.invoice || '（連線後配號）';
  const rnd = String(hash(d.id || d.tmp) % 10000).padStart(4, '0');
  const bar = `${roc}${pad(s + 1)}${(d.invoice || 'XX00000000').replace('-', '')}${rnd}`;
  const b2b = !!d.buyerTaxId;
  const stamp = d.carrier ? `<div class="ei-stamp">已存入${esc(d.carrier.type)}<small>不列印證明聯（示意）</small></div>` : d.donate ? `<div class="ei-stamp">已捐贈 ${esc(d.donate)}<small>不列印證明聯（示意）</small></div>` : !d.invoice ? '<div class="ei-stamp off">離線暫存<small>恢復連線後上傳</small></div>' : '';
  const lines = d.items.map(it => `<div><span>${PRODUCT_MAP[it.pid]?.name || it.pid}${it.list && it.list > it.price ? `<i>${esc(it.promo || '特價')}・原價 ${nf(it.list)}</i>` : ''}${it.note ? `<i>${esc(it.note)}</i>` : ''}</span><span>${it.qty} × ${it.price}</span><b>${nf(it.qty * it.price)}</b></div>`).join('');
  return `<div class="ei">
    <div class="ei-logo">${icon('leaf', 15)} ${esc(SHOP_NAME)}</div>
    <div class="ei-title">電子發票證明聯</div>
    <div class="ei-period">${roc}年${pad(s)}-${pad(s + 1)}月</div>
    <div class="ei-no">${esc(no)}</div>
    <div class="ei-r"><span>${fmtFull(t)}</span>${b2b ? '<span>格式 25</span>' : ''}</div>
    <div class="ei-r"><span>隨機碼 ${rnd}</span><span>總計 ${nf(d.total)}</span></div>
    <div class="ei-r"><span>賣方 ${SELLER_MASK}</span>${b2b ? `<span>買方 ${esc(d.buyerTaxId)}</span>` : ''}</div>
    <div class="ei-bar">${barcodeSvg(bar, 30, 200)}</div>
    <div class="ei-qrs">${qrSvg(hash(bar))}${qrSvg(hash(bar + 'R'))}</div>
    <div class="ei-foot">退貨請持證明聯正本辦理・示範單據</div>
    ${stamp}
  </div>
  <div class="ei-cut"></div>
  <div class="ei-det"><div class="ei-dh">交易明細</div>${lines}
    ${d.discount ? `<div class="disc"><span>優惠折扣</span><span></span><b>−${nf(d.discount)}</b></div>` : ''}
    ${b2b ? `<div><span>銷售額</span><span></span><b>${nf(d.net)}</b></div><div><span>稅額 5%</span><span></span><b>${nf(d.tax)}</b></div>` : ''}
    <div class="tot"><span>合計</span><span></span><b>NT$ ${nf(d.total)}</b></div>
    <div><span>${esc(d.payment)}</span><span></span><b>${d.tendered != null ? nf(d.tendered) : nf(d.total)}</b></div>
    ${d.change ? `<div><span>找零</span><span></span><b>${nf(d.change)}</b></div>` : ''}
    <div class="ei-meta">${d.id ? `${d.id}・` : ''}POS-01・收銀 ${CASHIER}${d.member ? `<br>會員 ${esc(d.member.name)}（${esc(d.member.tier)}）` : ''}</div>
  </div>`;
}
function openDone(order, info) {
  const c = info.c;
  const d = order ? { ...order } : { tmp: queue[queue.length - 1].tmp, ts: queue[queue.length - 1].ts, items: c.lines.map(l => ({ pid: l.pid, qty: l.qty, price: l.p.price, note: l.note, ...(l.pr ? { list: l.pr.list, promo: l.pr.badge } : {}) })), total: c.total, net: c.net, tax: c.tax, discount: c.disc, payment: info.payment, tendered: info.tendered, change: info.change, carrier: info.carrier, donate: info.donate, buyerTaxId: info.buyerTaxId, member: info.memberName ? { name: info.memberName, tier: info.memberTier } : null };
  const inv = store.inventory();
  const stockTxt = c.lines.map(l => { const s = inv.find(p => p.id === l.pid); return `${l.p.name} −${l.qty}${order ? `（剩 ${s.current}${s.low ? '，低於安全庫存' : ''}）` : ''}`; }).join('、');
  const debit = order ? store.journalFor(order)[0].lines[0].acct : (info.payment === '現金' ? '現金' : '銀行存款');
  const invKind = info.buyerTaxId ? `三聯式・買方 ${info.buyerTaxId}` : info.carrier ? `${info.carrier.type} ${info.carrier.code}` : info.donate ? `捐贈碼 ${info.donate}` : '二聯式・列印證明聯';
  const { m } = modal(`<div class="px-dlg px-done">
    <div class="px-printer"><div class="px-pr-top"><span class="px-led"></span><span>熱感印表機・58mm</span></div><div class="px-slot"></div><div class="px-paper-wrap"><div class="px-paper">${einvoiceHtml(d)}</div></div></div>
    <div class="px-done-r">
      <div class="px-done-h"><span class="px-okc">${icon('check', 30)}</span><div><h3>${order ? '收款完成，電子發票已開立' : '收款完成（離線暫存）'}</h3><small>${order ? `${order.id}・${order.invoice}` : `${d.tmp}・恢復連線後自動上傳`}</small></div><button class="icon-btn" data-act="close" aria-label="關閉">${icon('x', 18)}</button></div>
      <div class="px-done-amt"><div><small>應收</small><b>${money(c.total)}</b></div><div><small>${esc(info.payment)}${info.payments ? '' : '實收'}</small><b>${money(info.tendered ?? c.total)}</b></div><div class="${info.change ? 'chg' : ''}"><small>找零</small><b>${money(info.change || 0)}</b></div></div>
      ${info.payments ? `<div class="px-done-split">${info.payments.map(p => `<span>${p.method} ${money(p.amount)}</span>`).join('<i>＋</i>')}</div>` : ''}
      <ul class="px-steps">
        <li style="--c:var(--leaf)">${icon('receipt', 16)}<div><b>${order ? `開立電子發票 ${order.invoice}` : '電子發票待配號'}</b><small>${esc(invKind)}・${order ? '已排程上傳至財政部平台（示範）' : '離線期間暫存於本機'}</small></div></li>
        <li style="--c:var(--mint)">${icon('coins', 16)}<div><b>自動入帳</b><small>借 ${debit} ${nf(c.total)}／貸 銷貨收入 ${nf(c.net)}、銷項稅額 ${nf(c.tax)}${c.disc ? `（已折 ${nf(c.disc)}）` : ''}</small></div></li>
        <li style="--c:var(--amber)">${icon('box', 16)}<div><b>扣除庫存</b><small>${esc(stockTxt)}</small></div></li>
        <li style="--c:var(--violet)">${icon('book', 16)}<div><b>寫入會計分錄</b><small>總覽 KPI、會計帳務、營業稅試算已同步更新</small></div></li>
        ${info.memberName ? `<li style="--c:var(--pink)">${icon('heart', 16)}<div><b>會員點數 ${info.ptsUsed ? `−${info.ptsUsed} ` : ''}+${info.earn}</b><small>${esc(info.memberName)} 目前 ${nf(info.memberLeft)} 點・AI 將於 3 天後推播回購提醒</small></div></li>` : ''}
      </ul>
      <div class="px-done-f"><button class="btn btn-ghost" data-reprint="1">${svg(I.printer, 16)} 重印明細</button><button class="btn btn-primary btn-lg" data-act="close">下一位顧客 ${icon('arrow', 16)}</button></div>
    </div></div>`, 'px-done-modal');
  printAnim(m);
  gsap.fromTo($$('.px-steps li', m), { opacity: 0, x: 18 }, { opacity: 1, x: 0, duration: 0.45, stagger: 0.18, delay: 0.5, ease: 'power3.out' });
  gsap.fromTo($('.px-okc', m), { scale: 0, rotate: -40 }, { scale: 1, rotate: 0, duration: 0.7, ease: 'back.out(2.4)', delay: 0.15 });
  m.addEventListener('click', (e) => { if (e.target.closest('[data-reprint]')) { printAnim(m); toast('已重新列印交易明細', '', { kind: 'info', icon: svg(I.printer, 18) }); } });
}
function printAnim(m) {
  const paper = $('.px-paper', m);
  gsap.fromTo(paper, { yPercent: -100 }, { yPercent: 0, duration: 2.2, ease: 'steps(28)' });
  gsap.fromTo($('.px-led', m), { opacity: 1 }, { opacity: 0.25, duration: 0.18, repeat: 11, yoyo: true });
}
function reprint(id) {
  const o = store.orders.find(x => x.id === id); if (!o) return;
  const { m } = modal(`<div class="px-dlg px-reprint"><div class="px-dlg-h"><div><h3>${svg(I.printer, 18)} 補印證明聯</h3><small>${o.id}・依法補印需註記「補印」</small></div><button class="icon-btn" data-act="close">${icon('x', 18)}</button></div>
    <div class="px-printer sm"><div class="px-slot"></div><div class="px-paper-wrap"><div class="px-paper"><div class="ei-reprint">補印</div>${einvoiceHtml(o)}</div></div></div></div>`, 'px-done-modal');
  printAnim(m);
}

// ---------- 作廢／折讓 ----------
function openAdjust(id, type) {
  const o = store.orders.find(x => x.id === id); if (!o) return;
  if (adj[id]) { toast('此發票已處理', `${o.invoice} 已${adj[id].type === 'void' ? '作廢' : '開立折讓'}`, { kind: 'warn', icon: icon('alert', 18) }); return; }
  const isVoid = type === 'void';
  const reasons = isVoid ? ['開立錯誤', '顧客退貨（全額）', '重複開立', '載具／統編填錯'] : ['商品瑕疵', '部分退貨', '價格調整', '顧客抱怨補償'];
  const st = { reason: reasons[0], amt: Math.round(o.total * 0.1) };
  const { m, close } = modal(`<div class="px-dlg px-adj ${isVoid ? 'void' : ''}">
    <div class="px-dlg-h"><div><h3>${isVoid ? svg(I.trash, 18) + ' 作廢發票' : svg(I.undo, 18) + ' 開立折讓單'}</h3><small>${o.invoice}・${fmtTime(o.ts)}・${esc(o.customer)}・${money(o.total)}</small></div><button class="icon-btn" data-act="close">${icon('x', 18)}</button></div>
    <div class="px-adj-b">
      <div class="px-adj-items">${o.items.map(it => `<span>${productArt(it.pid, 30)}${PRODUCT_MAP[it.pid].name}×${it.qty}</span>`).join('')}</div>
      <div class="px-co-lbl">原因</div><div class="px-reasons">${reasons.map((r, i) => `<button data-r="${r}" class="${i ? '' : 'on'}">${r}</button>`).join('')}</div>
      ${isVoid ? `<div class="px-adj-warn">${icon('alert', 16)} 作廢僅限當期（${new Date(o.ts).getMonth() + 1} 月所屬期別）發票；作廢後將上傳作廢訊息、沖回分錄與庫存（模擬）。</div>`
    : `<div class="px-co-lbl">折讓金額（含稅）</div><div class="px-field"><input id="adjAmt" inputmode="numeric" value="${st.amt}" autocomplete="off"><span class="px-vd ok" id="adjInfo"></span></div>`}
      <div class="px-adj-je"><div class="px-co-lbl">沖銷分錄（自動）</div><div id="adjJe"></div></div>
    </div>
    <div class="px-dlg-f"><button class="btn btn-ghost" data-act="close">取消</button><button class="btn ${isVoid ? 'px-danger' : 'btn-primary'}" id="adjGo">${isVoid ? '確認作廢' : '開立折讓證明單'}</button></div></div>`, 'px-adj-modal');
  const je = () => {
    const amt = isVoid ? o.total : Math.max(0, Math.min(o.total, +st.amt || 0)); const net = Math.round(amt / 1.05);
    $('#adjJe', m).innerHTML = `<div class="je-l dr"><span class="side">借</span><span class="acct">${isVoid ? '銷貨收入' : '銷貨退回及折讓'}</span><b>${money(net)}</b></div><div class="je-l dr"><span class="side">借</span><span class="acct">銷項稅額</span><b>${money(amt - net)}</b></div><div class="je-l cr"><span class="side">貸</span><span class="acct">${store.journalFor(o)[0].lines[0].acct}</span><b>${money(amt)}</b></div>`;
    const info = $('#adjInfo', m); if (info) info.textContent = `銷售額 ${money(net)}・稅額 ${money(amt - net)}`;
  };
  je();
  m.addEventListener('click', (e) => { const b = e.target.closest('[data-r]'); if (b) { st.reason = b.dataset.r; $$('[data-r]', m).forEach(x => x.classList.toggle('on', x === b)); } });
  m.addEventListener('input', (e) => { if (e.target.id === 'adjAmt') { e.target.value = e.target.value.replace(/\D/g, ''); st.amt = e.target.value; je(); } });
  $('#adjGo', m).addEventListener('click', () => {
    const amt = isVoid ? o.total : Math.max(1, Math.min(o.total, +st.amt || 0));
    adj[id] = { type, amt, reason: st.reason, ts: Date.now(), no: isVoid ? '' : `D-${fmtMD(new Date()).replace('/', '')}${String(Object.keys(adj).length + 1).padStart(3, '0')}` };
    lsSet(LSK('adj'), adj);
    close(); renderTx();
    const row = $(`.px-tx[data-id="${id}"]`, root); row && gsap.fromTo(row, { backgroundColor: isVoid ? 'rgba(236,106,85,.35)' : 'rgba(240,165,49,.3)' }, { backgroundColor: 'rgba(0,0,0,0)', duration: 1.6 });
    toast(isVoid ? `發票 ${o.invoice} 已作廢` : `已開立折讓單 ${adj[id].no}`, isVoid ? `原因：${st.reason}；作廢訊息已排程上傳、分錄與庫存已沖回（模擬）` : `折讓 ${money(amt)}（${st.reason}），已產生銷貨退回及折讓分錄（模擬）`, { kind: isVoid ? 'warn' : 'info', icon: isVoid ? svg(I.trash, 18) : svg(I.undo, 18) });
  });
}

// ---------- 掛單 ----------
function holdCurrent() {
  if (!cart.length) { toast('購物車是空的', '加入商品後才能掛單', { kind: 'warn', icon: icon('alert', 18) }); return; }
  const c = calc();
  const h = { id: `H-${String(Date.now()).slice(-4)}`, ts: Date.now(), label: `${member ? member.full : '門市顧客'}・${c.count} 件`, memberId: member?.id || null, cart: cart.map(l => ({ ...l })), rules: { ...rules }, wholePct, code };
  holds.push(h); saveHolds();
  cart = []; member = null; usePoints = false; code = null; wholePct = 0; editNote = null; ticketSeq++;
  renderMember(); renderCart(); renderTicket(); renderHoldN();
  const n = $('#pxHoldN', root); gsap.fromTo(n, { scale: 1.8 }, { scale: 1, duration: 0.6, ease: 'back.out(3)' });
  toast(`已掛單 ${h.id}`, `${h.label}・${money(c.total)}，可隨時從「取回掛單」繼續結帳`, { kind: 'info', icon: icon('hang', 18) });
}
function holdTotal(h) {
  const save = { cart, member, rules, wholePct, code, usePoints };
  cart = h.cart; member = MEMBERS.find(x => x.id === h.memberId) || null; rules = h.rules; wholePct = h.wholePct; code = h.code; usePoints = false;
  const t = calc().total;
  ({ cart, member, rules, wholePct, code, usePoints } = save);
  return t;
}
function renderHoldN() { const n = $('#pxHoldN', root); if (n) { n.textContent = holds.length; n.classList.toggle('zero', !holds.length); } }
function openHolds() {
  const { m, close } = modal(`<div class="px-dlg px-holds"><div class="px-dlg-h"><div><h3>${icon('hang', 18)} 掛單清單</h3><small>暫停中的交易，取回後可繼續加點或結帳</small></div><button class="icon-btn" data-act="close">${icon('x', 18)}</button></div>
    <div class="px-hl" id="hl"></div></div>`, 'px-holds-modal');
  const render = () => {
    $('#hl', m).innerHTML = holds.length ? holds.map(h => `<div class="px-h" data-h="${h.id}"><div class="px-h-arts">${h.cart.slice(0, 3).map(l => productArt(l.pid, 40)).join('')}</div>
      <div class="px-h-b"><b>${esc(h.label)}</b><small>${h.id}・${fmtTime(h.ts)} 掛單・${esc(h.cart.map(l => `${PRODUCT_MAP[l.pid].name}×${l.qty}`).join('、'))}</small>${h.cart.some(l => l.note) ? `<small class="px-h-note">${svg(I.pen, 11)} ${esc(h.cart.filter(l => l.note).map(l => l.note).join('；'))}</small>` : ''}</div>
      <b class="px-h-amt">${money(holdTotal(h))}</b><button class="btn btn-primary btn-sm" data-take="${h.id}">取回</button><button class="icon-btn" data-del="${h.id}" title="刪除">${svg(I.trash, 15)}</button></div>`).join('')
      : `<div class="px-cart-empty">${icon('hang', 28)}<b>目前沒有掛單</b><small>結帳到一半顧客要離開？按「掛單」先保留</small></div>`;
  };
  render();
  m.addEventListener('click', (e) => {
    const tk = e.target.closest('[data-take]'), del = e.target.closest('[data-del]');
    if (tk) {
      const h = holds.find(x => x.id === tk.dataset.take); if (!h) return;
      if (cart.length) holdCurrent();
      holds = holds.filter(x => x !== h); saveHolds();
      cart = h.cart.map(l => ({ ...l })); member = MEMBERS.find(x => x.id === h.memberId) || null; rules = { ...h.rules }; wholePct = h.wholePct; code = h.code; usePoints = false;
      if (member && CDL[member.lang]) { cdLang = member.lang; renderLangs(); }
      cdThanks = null; renderMember(); renderCart(); renderHoldN(); close();
      gsap.fromTo($$('.px-line', root), { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.4, stagger: 0.06 });
      toast(`已取回掛單 ${h.id}`, `${h.label}・${money(calc().total)}`, { icon: icon('hang', 18) });
    }
    if (del) { holds = holds.filter(x => x.id !== del.dataset.del); saveHolds(); renderHoldN(); render(); }
  });
}

// ---------- 離線模式 ----------
function renderNet() {
  const b = $('#pxNet', root); if (!b) return;
  b.classList.toggle('off', !online); b.classList.toggle('sync', syncing);
  $('.px-net-ic', b).innerHTML = svg(online ? I.wifi : I.wifiOff, 16);
  $('.px-net-t', b).innerHTML = syncing ? `<b>同步上傳中</b><small id="pxSyncT">準備上傳…</small>` : online ? '<b>連線中</b><small>雲端即時同步</small>' : `<b>離線模式</b><small>暫存 ${queue.length} 筆待上傳</small>`;
  $('.px-sw', b).classList.toggle('on', online);
  $('#pxOff', root).hidden = online;
}
async function toggleNet() {
  if (syncing) return;
  online = !online; renderNet();
  gsap.fromTo('#pxNet', { scale: 0.92 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
  if (!online) { toast('已切換離線模式（示範）', '網路中斷時仍可收銀：交易與發票暫存於本機，恢復連線後自動上傳', { kind: 'warn', icon: svg(I.wifiOff, 18) }); return; }
  if (!queue.length) { toast('已恢復連線', '雲端即時同步中', { kind: 'info', icon: svg(I.wifi, 18) }); return; }
  syncing = true; renderNet();
  const n = queue.length;
  const bar = el('<i class="px-net-bar"></i>'); $('#pxNet', root).appendChild(bar);
  for (let i = 0; i < n; i++) {
    const q = queue[0];
    const st = $('#pxSyncT', root); if (st) st.textContent = `上傳 ${i + 1}／${n}・${q.tmp}`;
    const row = $(`.px-tx[data-tmp="${q.tmp}"]`, root);
    if (row) { row.classList.add('up'); gsap.to(row, { x: 30, opacity: 0, duration: 0.5 }); }
    gsap.to(bar, { scaleX: (i + 1) / n, duration: 0.6 });
    await sleep(700);
    queue.shift();
    store.createOrder(q.params);
  }
  syncing = false; bar.remove(); renderNet(); renderTx();
  toast(`已上傳 ${n} 筆離線交易`, '發票號碼已配發並補傳財政部平台（示範），分錄與庫存已同步', { icon: svg(I.upload, 18) });
}

// ---------- 右側：交易／分錄／庫存 ----------
function renderAll(live, hiId) {
  if (!root) return;
  const today = startOfDay(new Date());
  const todayO = store.ordersBetween(today, addDays(today, 1));
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  countUp($('#pkInv', root), todayO.length, { suffix: ' 張', duration: 0.8 });
  countUp($('#pkPaid', root), store.sum(todayO.filter(o => o.status === 'paid')), { prefix: 'NT$ ', duration: 0.8 });
  countUp($('#pkAR', root), store.sum(store.orders.filter(o => o.status === 'pending')), { prefix: 'NT$ ', duration: 0.8 });
  countUp($('#pkTax', root), store.sum(store.ordersBetween(monthStart, addDays(today, 1)), 'tax'), { prefix: 'NT$ ', duration: 0.8 });
  renderTx(live && hiId);
  renderHoldN();

  const js = store.journal(10);
  $('#pxJe', root).innerHTML = js.map(j => `<div class="je ${j.ref === hiId ? 'hi' : ''}"><div class="je-h"><span>${fmtMD(j.date)} ${fmtTime(j.date)}</span><span class="mono">${j.ref}</span><small>${esc(j.memo)}</small></div>
    ${j.lines.map(l => `<div class="je-l ${l.side === '貸' ? 'cr' : 'dr'}"><span class="side">${l.side}</span><span class="acct">${l.acct}</span><b>${money(l.amt)}</b></div>`).join('')}</div>`).join('');
  if (live && hiId) $$('#pxJe .je.hi', root).forEach(n => gsap.fromTo(n, { x: 20, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6 }));

  const inv = store.inventory();
  const low = inv.filter(p => p.low).length;
  $('#pxInvNote', root).innerHTML = low ? `<span class="chip-sm warn">${low} 項低於安全庫存</span> 結帳即時扣庫存` : '<span class="chip-sm">庫存充足</span> 結帳即時扣庫存';
  const ln = $('#pxLowN', root); ln.hidden = !low; ln.textContent = low;
  $('#pxInv', root).innerHTML = inv.map(p => {
    const pct = Math.min(100, p.current / (p.safety * 3) * 100);
    return `<li class="${p.low ? 'low' : ''}"><span class="inv-art">${productArt(p.id, 34)}</span><div class="inv-b"><div class="inv-t"><b>${p.name}</b><span>${p.current} <small>/ 安全 ${p.safety}</small></span></div>
      <div class="bar"><i style="width:${pct}%"></i><em style="left:${100 / 3}%"></em></div></div>${p.low ? `<span class="inv-warn">${icon('alert', 14)} 補貨</span>` : ''}</li>`;
  }).join('');
}
function renderTx(hiId) {
  const box = $('#pxTx', root); if (!box) return;
  const today = startOfDay(new Date());
  const flt = (l) => txFilter === 'pos' ? l.filter(o => o.channel === 'pos') : l;
  const list = flt(store.ordersBetween(today, addDays(today, 1)).slice().reverse());
  const older = list.length < 12 ? flt(store.orders.filter(o => o.ts < +today)).slice(-(14 - list.length)).reverse() : [];
  $('#pxTxN', root).textContent = list.length + queue.length;
  const qRows = queue.map(q => `<div class="px-tx queued" data-tmp="${q.tmp}"><div class="px-tx-ic">${svg(I.wifiOff, 16)}</div>
    <div class="px-tx-b"><div><b>${fmtTime(q.ts)}</b><span class="mono">${q.tmp}</span></div><small>${esc(q.params.customer)}・${esc(itemsText(q.params.items))}</small></div>
    <div class="px-tx-r"><b>${money(q.total)}</b><span class="st pending">待上傳</span></div></div>`).join('');
  const row = (o, old) => {
    const a = adj[o.id];
    const stt = a ? (a.type === 'void' ? '<span class="st px-void">已作廢</span>' : `<span class="st px-allow">折讓 ${nf(a.amt)}</span>`) : o.status === 'paid' ? '<span class="st paid">已付款</span>' : '<span class="st pending">待付款</span>';
    const tags = [o.carrier ? '載具' : '', o.buyerTaxId ? '統編' : '', o.donate ? '捐贈' : ''].filter(Boolean);
    return `<div class="px-tx ${a ? a.type : ''} ${o.source === 'live' ? 'live' : ''}" data-id="${o.id}">
      <div class="px-tx-ic">${chIcon(o.channel, 20)}</div>
      <div class="px-tx-b"><div><b>${old ? `${fmtMD(o.ts)} ` : ''}${fmtTime(o.ts)}</b><span class="mono">${o.invoice}</span>${tags.map(t => `<i class="px-tg">${t}</i>`).join('')}</div><small>${esc(CH[o.channel] || '')}・${esc(o.customer)}・${esc(itemsText(o.items))}</small></div>
      <div class="px-tx-r"><b>${money(o.total)}</b>${stt}</div>
      ${a ? '' : `<div class="px-tx-act"><button data-act="void">作廢</button><button data-act="allow">折讓</button><button data-act="reprint">補印</button><span>${esc(o.payment)}</span></div>`}
    </div>`;
  };
  box.innerHTML = qRows + (list.length ? list.slice(0, 40).map(o => row(o, false)).join('') : '<div class="px-txdiv">今天還沒有交易</div>')
    + (older.length ? `<div class="px-txdiv">較早交易</div>${older.map(o => row(o, true)).join('')}` : '');
  if (hiId) { const r = $(`.px-tx[data-id="${hiId}"]`, box); r && gsap.fromTo(r, { backgroundColor: 'rgba(45,182,116,.4)' }, { backgroundColor: 'rgba(45,182,116,0)', duration: 2.2 }); }
}

// ---------- 交班日結（Z 帳） ----------
function zData() {
  const today = startOfDay(new Date());
  const list = store.ordersBetween(today, addDays(today, 1)).filter(o => o.channel === 'pos');
  const voids = list.filter(o => adj[o.id]?.type === 'void');
  const allows = list.filter(o => adj[o.id]?.type === 'allow');
  const valid = list.filter(o => adj[o.id]?.type !== 'void');
  const by = Object.fromEntries(Z_METHODS.map(k => [k, { n: 0, amt: 0 }]));
  for (const o of valid) {
    const al = adj[o.id]?.type === 'allow' ? adj[o.id].amt : 0;
    const parts = o.payments || [{ method: o.payment, amount: o.total }];
    parts.forEach((p, i) => { const k = by[p.method] ? p.method : '信用卡'; by[k].n++; by[k].amt += p.amount - (i === 0 ? al : 0); });
  }
  const gross = valid.reduce((s, o) => s + o.total, 0) - allows.reduce((s, o) => s + adj[o.id].amt, 0);
  const inv = list.map(o => o.invoice).sort();
  const hours = {}; const qty = {};
  valid.forEach(o => { const h = new Date(o.ts).getHours(); hours[h] = (hours[h] || 0) + o.total; o.items.forEach(it => { qty[it.pid] = (qty[it.pid] || 0) + it.qty; }); });
  const peak = Object.entries(hours).sort((a, b) => b[1] - a[1])[0];
  const top = Object.entries(qty).sort((a, b) => b[1] - a[1])[0];
  const disc = valid.reduce((s, o) => s + (o.discount || 0), 0);
  return { list, valid, voids, allows, by, gross, inv, hours, peak, top, disc, cashExp: FLOAT + by['現金'].amt, mobile: by['LINE Pay'].amt + by['街口支付'].amt };
}
function openZ() {
  const z = zData();
  const DEN = [1000, 500, 100, 50, 10, 5, 1];
  const counts = {}; let rem = z.cashExp; DEN.forEach(d => { counts[d] = Math.floor(rem / d); rem -= counts[d] * d; });
  const maxM = Math.max(1, ...Object.values(z.by).map(v => v.amt));
  const hk = Object.keys(z.hours).map(Number); const hrs = []; for (let h = Math.min(10, ...hk); h <= Math.max(20, ...hk); h++) hrs.push(h);
  const maxH = Math.max(1, ...hrs.map(h => z.hours[h] || 0));
  const now = new Date();
  const { m, close } = modal(`<div class="px-dlg px-z">
    <div class="px-dlg-h"><div><h3>${svg(I.zr, 18)} 交班日結・Z 帳</h3><small>${fmtDate(now)}・POS-01・收銀員 ${CASHIER}${NEXT_SHIFT ? ` → 交班給 ${NEXT_SHIFT}` : '（單人營業）'}・開班 10:30・結帳 ${fmtTime(now)}</small></div><span class="demo-badge">示範資料</span><button class="icon-btn" data-act="close">${icon('x', 18)}</button></div>
    <div class="px-z-grid">
      <div class="px-z-c px-z-pay"><div class="px-co-lbl">各付款方式</div>
        ${Z_METHODS.map(k => `<div class="px-zp" style="--c:${Z_COLOR[k]}"><span>${k}</span><small>${z.by[k].n} 筆</small><b>${money(z.by[k].amt)}</b><i style="--w:${z.by[k].amt / maxM * 100}%"></i></div>`).join('')}
        <div class="px-zp tot"><span>門市營業額</span><small>${z.valid.length} 筆</small><b class="zc" data-v="${z.gross}">${money(z.gross)}</b></div>
        <div class="px-z-mini"><span>優惠折扣 <b>${money(z.disc)}</b></span><span>作廢 <b>${z.voids.length} 張</b></span><span>折讓 <b>${z.allows.length} 筆</b></span></div>
      </div>
      <div class="px-z-c px-z-cash"><div class="px-co-lbl">現金點收</div>
        <div class="px-zc-exp"><div><small>開班零用金</small><b>${money(FLOAT)}</b></div><div><small>＋現金收入</small><b>${money(z.by['現金'].amt)}</b></div><div class="eq"><small>＝現金應有數</small><b>${money(z.cashExp)}</b></div></div>
        <div class="px-den">${DEN.map(d => `<label><span><i>${d >= 100 ? '鈔' : '幣'}</i>${d}</span><input type="number" min="0" data-d="${d}" value="${counts[d]}"><em>${nf(d * counts[d])}</em></label>`).join('')}</div>
        <div class="px-zc-res"><div><small>點鈔合計</small><b id="zCount">—</b></div><div id="zDiffBox"><small>差額</small><b id="zDiff">—</b></div></div>
      </div>
      <div class="px-z-c px-z-inv"><div class="px-co-lbl">電子發票</div>
        <div class="px-zi"><div><small>開立張數</small><b>${z.list.length} 張</b></div><div><small>作廢</small><b>${z.voids.length} 張</b></div>
          <div class="w"><small>起號</small><b class="mono">${z.inv[0] || '—'}</b></div><div class="w"><small>迄號</small><b class="mono">${z.inv[z.inv.length - 1] || '—'}</b></div>
          <div><small>載具／統編</small><b>${z.list.filter(o => o.carrier).length}／${z.list.filter(o => o.buyerTaxId).length}</b></div><div><small>捐贈</small><b>${z.list.filter(o => o.donate).length} 張</b></div></div>
        <div class="px-co-lbl">時段營收</div>
        <div class="px-zh" style="grid-template-columns:repeat(${hrs.length}, minmax(0, 1fr))">${hrs.map(h => `<div title="${h}:00 ${money(z.hours[h] || 0)}"><i style="--h:${(z.hours[h] || 0) / maxH * 100}%" class="${z.peak && +z.peak[0] === h ? 'pk' : ''}"></i><small>${h}</small></div>`).join('')}</div>
      </div>
      <div class="px-z-c px-z-ai"><div class="px-co-lbl">${icon('sparkle', 14)} AI 日結摘要</div><p id="zAi"></p>${queue.length ? `<div class="px-adj-warn">${svg(I.wifiOff, 14)} 尚有 ${queue.length} 筆離線交易未上傳，恢復連線後會自動補入</div>` : ''}</div>
    </div>
    <div class="px-dlg-f"><span class="px-co-msg ok" id="zMsg"></span><button class="btn btn-ghost" id="zPrint">${svg(I.printer, 16)} 列印日結單</button><button class="btn btn-primary" id="zDone">${icon('check', 16)} ${NEXT_SHIFT ? '確認交班' : '確認日結'}</button></div>
    <div class="px-zslip" id="zSlip" hidden><div class="px-paper-wrap"><div class="px-paper"><div class="zs" id="zsBody"></div></div></div></div>
  </div>`, 'px-z-modal');

  const recount = () => {
    let s = 0; $$('.px-den input', m).forEach(i => { const d = +i.dataset.d, n = Math.max(0, +i.value || 0); s += d * n; i.nextElementSibling.textContent = nf(d * n); });
    const diff = s - z.cashExp;
    $('#zCount', m).textContent = money(s);
    $('#zDiff', m).textContent = diff === 0 ? '帳實相符' : `${diff > 0 ? '溢收 +' : '短少 −'}${money(Math.abs(diff)).replace('NT$ ', 'NT$ ')}`;
    $('#zDiffBox', m).className = diff === 0 ? 'ok' : 'bad';
    $('#zMsg', m).textContent = diff === 0 ? '現金帳實相符，可交班' : `現金差額 ${diff > 0 ? '+' : ''}${nf(diff)}，請複點或填寫說明`;
    $('#zMsg', m).className = `px-co-msg ${diff === 0 ? 'ok' : ''}`;
    return { s, diff };
  };
  m.addEventListener('input', (e) => { if (e.target.dataset.d) recount(); });
  recount();
  gsap.fromTo($$('.px-zp i', m), { scaleX: 0 }, { scaleX: 1, duration: 0.9, stagger: 0.06, ease: 'power3.out', delay: 0.2 });
  gsap.fromTo($$('.px-zh i', m), { scaleY: 0 }, { scaleY: 1, duration: 0.8, stagger: 0.04, ease: 'power3.out', delay: 0.3 });
  countUp($('.zc', m), z.gross, { prefix: 'NT$ ', from: 0, duration: 1.2 });

  const topName = z.top ? `${PRODUCT_MAP[z.top[0]].name}（${z.top[1]} 件）` : '—';
  const mobilePct = z.gross ? Math.round((z.gross - z.by['現金'].amt) / z.gross * 100) : 0;
  const lowNames = store.inventory().filter(p => p.low).map(p => p.name);
  const avg = z.valid.length ? Math.round(z.gross / z.valid.length) : 0;
  const text = `今日門市 ${z.valid.length} 筆、營業額 ${money(z.gross)}，客單價 ${money(avg)}。${z.peak ? `尖峰在 ${z.peak[0]}:00–${+z.peak[0] + 1}:00（${money(z.peak[1])}）。` : ''}最熱賣是${topName}；非現金支付占 ${mobilePct}%。${z.voids.length || z.allows.length ? `今日作廢 ${z.voids.length} 張、折讓 ${z.allows.length} 筆，已自動產生沖銷分錄。` : '今日無作廢與折讓。'}${lowNames.length ? `明日建議提早備料：${lowNames.join('、')}。` : '庫存充足，明日照常備料。'}`;
  setTimeout(() => typeText($('#zAi', m), text, 14), 450);

  $('#zPrint', m).addEventListener('click', () => {
    const { s, diff } = recount();
    const slip = $('#zSlip', m);
    $('#zsBody', m).innerHTML = `<b class="zs-h">${esc(SHOP_NAME)}・日結單（Z 帳）</b><small>${fmtFull(now)}・POS-01・${CASHIER}</small><hr>
      ${Z_METHODS.map(k => `<div><span>${k}（${z.by[k].n}）</span><b>${nf(z.by[k].amt)}</b></div>`).join('')}<hr>
      <div><span>營業額</span><b>${nf(z.gross)}</b></div><div><span>優惠折扣</span><b>${nf(z.disc)}</b></div><div><span>發票張數</span><b>${z.list.length}</b></div>
      <div><span>起 ${z.inv[0] || '-'}</span></div><div><span>迄 ${z.inv[z.inv.length - 1] || '-'}</span></div><div><span>作廢／折讓</span><b>${z.voids.length}／${z.allows.length}</b></div><hr>
      <div><span>現金應有</span><b>${nf(z.cashExp)}</b></div><div><span>點鈔合計</span><b>${nf(s)}</b></div><div><span>差額</span><b>${diff >= 0 ? '+' : ''}${nf(diff)}</b></div><hr>
      <div class="zs-bar">${barcodeSvg('Z' + fmtFull(now), 26, 200)}</div><small>${NEXT_SHIFT ? `交班：${CASHIER} → ${NEXT_SHIFT}` : `日結：${CASHIER}（單人營業）`}</small>`;
    slip.hidden = false;
    gsap.fromTo(slip, { opacity: 0 }, { opacity: 1, duration: 0.2 });
    gsap.fromTo($('.px-paper', slip), { yPercent: -100 }, { yPercent: 0, duration: 2.4, ease: 'steps(30)' });
    slip.onclick = () => gsap.to(slip, { opacity: 0, duration: 0.25, onComplete: () => { slip.hidden = true; } });
    toast('日結單列印中（示範）', '點一下紙條可收起', { kind: 'info', icon: svg(I.printer, 18) });
  });
  $('#zDone', m).addEventListener('click', () => {
    const { diff } = recount();
    close();
    toast(NEXT_SHIFT ? `交班完成：${CASHIER} → ${NEXT_SHIFT}` : `日結完成：${CASHIER}`, `今日門市 ${money(z.gross)}、現金${diff === 0 ? '帳實相符' : `差額 ${nf(diff)}`}；日結資料已寫入會計帳務（現金日記帳）`, { icon: icon('users', 18) });
  });
}
