// AI 店員設定：人設選項、預設店規、護欄、測試問題、模擬統計（皆為示範資料）
import { PRODUCTS, PRODUCT_MAP, SHIPPING_FEE, FREE_SHIP, PAYMENTS, mulberry32 } from './data.js';
import { TENANT } from './tenant.js';
import { pName } from './i18n.js';
import { IS_AMEI, CAT, HAS_BEANS, TAKEOUT, DRINK_TAKEOUT, measure } from './brief-data.js';

// ---------- 頭像（inline SVG） ----------
const face = (skin, hair, extra = '') => `
  <circle cx="32" cy="34" r="20" fill="${skin}"/>
  ${extra}
  <circle cx="25" cy="35" r="2.4" fill="#2a1d14"/><circle cx="39" cy="35" r="2.4" fill="#2a1d14"/>
  <circle cx="21" cy="41" r="3.2" fill="#ff8fa3" opacity=".55"/><circle cx="43" cy="41" r="3.2" fill="#ff8fa3" opacity=".55"/>
  <path d="M27.5 42.5q4.5 4 9 0" stroke="#2a1d14" stroke-width="2" fill="none" stroke-linecap="round"/>`;
export const AVATARS = [
  { id: 'girl', name: '綁包頭女孩', bg: ['#F7B2C4', '#DD5597'],
    svg: `<circle cx="32" cy="12" r="8" fill="#4a2c1d"/>${face('#ffe3cf', '#4a2c1d', '<path d="M12 33q0-19 20-19t20 19q-6-9-20-10-14 1-20 10z" fill="#4a2c1d"/>')}<rect x="27" y="8" width="10" height="3" rx="1.5" fill="#F0A531"/>` },
  { id: 'cat', name: IS_AMEI ? '甜點貓' : '店貓', bg: ['#F4D35E', '#F0A531'],
    svg: `<path d="M14 26 16 8l12 10zM50 26 48 8 36 18z" fill="#f2c27a"/><path d="M17 22l1-9 6 6zM47 22l-1-9-6 6z" fill="#ff9fb2"/>${face('#f2c27a', '')}<path d="M8 38h10M8 43h10M46 38h10M46 43h10" stroke="#8a5a2b" stroke-width="1.6" stroke-linecap="round"/>` },
  { id: 'bear', name: IS_AMEI ? '烘焙熊' : '圍裙熊', bg: ['#C9935A', '#8B5A3C'],
    svg: `<circle cx="15" cy="18" r="7" fill="#b07a4a"/><circle cx="49" cy="18" r="7" fill="#b07a4a"/><circle cx="15" cy="18" r="3.5" fill="#e7b98a"/><circle cx="49" cy="18" r="3.5" fill="#e7b98a"/>${face('#d39a63', '')}<ellipse cx="32" cy="43" rx="8" ry="6" fill="#f1d2ae"/><path d="M18 14q14-12 28 0l-2 6H20z" fill="#fff"/><rect x="18" y="16" width="28" height="5" rx="2" fill="#f4f4f4"/>` },
  { id: 'bot', name: '小機器人', bg: ['#5EE0C4', '#2E97D4'],
    svg: `<path d="M32 6v8" stroke="#dffaf2" stroke-width="2.4" stroke-linecap="round"/><circle cx="32" cy="6" r="3" fill="#F0A531"/><rect x="12" y="15" width="40" height="36" rx="12" fill="#e9fff8"/><rect x="17" y="22" width="30" height="18" rx="8" fill="#0c3326"/><circle cx="25" cy="31" r="3" fill="#5EE0C4"/><circle cx="39" cy="31" r="3" fill="#5EE0C4"/><path d="M27 45h10" stroke="#2E97D4" stroke-width="2.4" stroke-linecap="round"/>` },
  { id: 'cake', name: IS_AMEI ? '杯子蛋糕' : '招牌吉祥物', bg: ['#B79AD9', '#7C62E6'],
    svg: `<path d="M14 36h36l-5 18H19z" fill="#F0A531"/><path d="M20 36l2 18M28 36l1 18M36 36l-1 18M44 36l-2 18" stroke="#c97f12" stroke-width="1.4"/><path d="M12 36q0-10 10-12 2-10 10-10t10 10q10 2 10 12z" fill="#fff3f7"/><circle cx="32" cy="12" r="4" fill="#EC6A55"/><circle cx="26" cy="30" r="2" fill="#2a1d14"/><circle cx="38" cy="30" r="2" fill="#2a1d14"/><path d="M29 33q3 2.5 6 0" stroke="#2a1d14" stroke-width="1.6" fill="none" stroke-linecap="round"/>` },
];
export const AVATAR_MAP = Object.fromEntries(AVATARS.map(a => [a.id, a]));
export function avatarSvg(id, size = 40) {
  const a = AVATAR_MAP[id] || AVATARS[0];
  const gid = `agav-${a.id}-${size}`;
  return `<svg class="ag-av" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a.bg[0]}"/><stop offset="1" stop-color="${a.bg[1]}"/></linearGradient></defs><circle cx="32" cy="32" r="32" fill="url(#${gid})"/>${a.svg}</svg>`;
}

// ---------- 語氣 ----------
export const TONES = [
  { id: 'warm', name: '親切', sample: '您好～有任何問題都可以問我喔！' },
  { id: 'pro', name: '專業', sample: '您好，請問有什麼可以為您服務？' },
  { id: 'lively', name: '活潑', sample: IS_AMEI ? '哈囉哈囉！今天想吃點什麼甜的？' : '哈囉哈囉！今天想找點什麼呢？' },
];
// 每種語言的開頭／結尾（{name} 會換成店員名字）
export const TONE_WRAP = {
  zh: { warm: ['您好～', '有任何問題都可以再問{name}喔！'], pro: ['您好，', '如需其他協助，請隨時告訴我。'], lively: ['哈囉哈囉！', '還想知道什麼，儘管丟給{name}吧！'] },
  en: { warm: ['Hi there! ', 'Feel free to ask {name} anything else.'], pro: ['Hello, thank you for reaching out. ', 'Please let me know if you need further assistance.'], lively: ['Hey hey! ', 'Anything else? {name} is all ears!'] },
  ja: { warm: ['こんにちは！', 'ほかにも気軽に{name}に聞いてくださいね。'], pro: ['お問い合わせありがとうございます。', 'ほかにご不明点がございましたらお知らせください。'], lively: ['やっほー！', 'なんでも{name}に聞いてね！'] },
  vi: { warm: ['Xin chào bạn! ', 'Bạn cần gì cứ hỏi {name} nhé!'], pro: ['Xin chào quý khách. ', 'Nếu cần hỗ trợ thêm, xin vui lòng cho biết.'], lively: ['Hello hello! ', 'Hỏi {name} thêm gì cũng được nha!'] },
  ms: { warm: ['Hai! ', 'Tanya {name} apa sahaja lagi ya.'], pro: ['Selamat sejahtera. ', 'Sila maklumkan jika perlukan bantuan lanjut.'], lively: ['Helo helo! ', 'Ada soalan lagi? Tanya {name}!'] },
};

export const LANG_OPTS = [
  { id: 'zh', label: '中文', sub: '繁體' },
  { id: 'en', label: 'English', sub: '英文' },
  { id: 'ja', label: '日本語', sub: '日文' },
  { id: 'vi', label: 'Tiếng Việt', sub: '越南文' },
  { id: 'ms', label: 'Melayu', sub: '馬來文' },
];

export const BIZ_HOURS = { open: 11, close: 20, label: '11:00–20:00（週一公休）' };
export const SIM_TIMES = { open: { h: 14, m: 20, label: '14:20 營業中' }, closed: { h: 22, m: 40, label: '22:40 下班後' } };

// ---------- 由商品資料推導的文字 ----------
const AL_ZH = { egg: '蛋', milk: '奶', gluten: '麩質', nuts: '堅果' };
const AL_EN = { egg: 'egg', milk: 'milk', gluten: 'gluten', nuts: 'nuts' };
const AL_JA = { egg: '卵', milk: '乳', gluten: '小麦', nuts: 'ナッツ' };
const EN_NAME = { lemon: 'Lemon Tart', roll: 'Strawberry Cream Roll', basque: 'Taro Basque Cheesecake', pound: 'Oolong Tea Pound Cake', cookie: 'Cookie Gift Box', pineapple: 'Pineapple Cake Gift Box', canele: 'Earl Grey Canelé' };
const JA_NAME = { lemon: 'レモンタルト', roll: 'いちごロール', basque: 'タロイモバスク', pound: '烏龍茶パウンドケーキ', cookie: 'クッキーギフト', pineapple: 'パイナップルケーキギフト', canele: 'アールグレイカヌレ' };
export const pname = (pid, lang = 'zh') => !IS_AMEI ? (lang === 'zh' ? PRODUCT_MAP[pid]?.name || pid : pName(lang, pid)) : lang === 'en' ? EN_NAME[pid] : lang === 'ja' ? JA_NAME[pid] : PRODUCT_MAP[pid].name;

export const NUTS = PRODUCTS.filter(p => p.allergens.includes('nuts'));
export const NO_NUT_GIFTS = PRODUCTS.filter(p => p.gift && !p.allergens.includes('nuts'));
export const NO_GLUTEN = PRODUCTS.filter(p => !p.allergens.includes('gluten'));
const ALL_EGG_MILK = PRODUCTS.every(p => p.allergens.includes('egg') && p.allergens.includes('milk'));
export const FRIDGE = PRODUCTS.filter(p => p.storage === 'fridge');
export const ROOM = PRODUCTS.filter(p => p.storage === 'room');
const join = (arr, sep = '、') => arr.join(sep);

export function allergenText(lang = 'zh') {
  if (lang === 'en') return `Nuts: only in ${join(NUTS.map(p => EN_NAME[p.id]), ', ')}; everything else is nut-free. ${ALL_EGG_MILK ? 'All items contain egg and milk. ' : ''}Gluten-free: ${join(NO_GLUTEN.map(p => EN_NAME[p.id]), ', ')}. Our kitchen also handles nuts, so we cannot guarantee zero cross-contact.`;
  if (lang === 'ja') return `ナッツを含むのは${join(NUTS.map(p => JA_NAME[p.id]))}のみで、ほかはナッツ不使用です。${ALL_EGG_MILK ? '全商品に卵・乳を使用しています。' : ''}小麦不使用：${join(NO_GLUTEN.map(p => JA_NAME[p.id]))}。同じ厨房でナッツを扱うため、微量混入の可能性はゼロではありません。`;
  return `含堅果：只有${join(NUTS.map(p => p.name))}，其他品項都不含堅果。${ALL_EGG_MILK ? '全部品項都含蛋、奶。' : ''}不含麩質：${join(NO_GLUTEN.map(p => p.name))}。廚房同時處理堅果，無法保證完全沒有交叉接觸。`;
}
export function storageText(lang = 'zh') {
  if (lang === 'en') return `Refrigerate: ${join(FRIDGE.map(p => `${EN_NAME[p.id]} ${p.days} days`), ', ')}. Room temperature: ${join(ROOM.map(p => `${EN_NAME[p.id]} ${p.days} days`), ', ')}. Keep away from direct sunlight.`;
  if (lang === 'ja') return `要冷蔵：${join(FRIDGE.map(p => `${JA_NAME[p.id]} ${p.days}日`))}。常温：${join(ROOM.map(p => `${JA_NAME[p.id]} ${p.days}日`))}。直射日光を避けて保存してください。`;
  return `冷藏：${join(FRIDGE.map(p => `${p.name} ${p.days} 天`))}。常溫：${join(ROOM.map(p => `${p.name} ${p.days} 天`))}。避免陽光直射，收到冷藏品請盡快放冰箱。`;
}
const payList = (lang) => lang === 'en' ? 'credit card, LINE Pay, bank transfer, Apple Pay and JKOPAY' : lang === 'ja' ? 'クレジットカード、LINE Pay、銀行振込、Apple Pay、街口支付' : join(PAYMENTS);

// ---------- 預設店規（白話卡片） ----------
// body：中文內容，{key} 會以 params 取代（卡片上顯示成可直接修改的數字）；en/ja 為 AI 自動翻譯版本
const AMEI_KB = () => [
  { id: 'return', key: 'return', icon: 'refresh', color: '#EC6A55', title: '退換貨政策', params: { hours: 24 },
    body: '甜點屬於食品，非瑕疵恕不退換。收到後 {hours} 小時內發現壓損或變質，拍照傳給我們，免費補寄或全額退款。',
    en: 'As food items, desserts cannot be returned unless defective. If anything arrives damaged or spoiled, send us a photo within {hours} hours for a free replacement or full refund.',
    ja: '食品のため、不良品以外の返品・交換はできません。到着後{hours}時間以内に破損や傷みがあれば写真をお送りください。無料で再送または全額返金します。' },
  { id: 'ship', key: 'ship', icon: 'coins', color: '#F0A531', title: '運費與免運門檻', params: { fee: SHIPPING_FEE, free: FREE_SHIP },
    body: '宅配運費 NT${fee}，單筆滿 NT${free} 免運；門市自取免運費。',
    en: 'Delivery is NT${fee}; orders of NT${free} or more ship free. Store pickup is always free.',
    ja: '配送料は NT${fee}、NT${free} 以上のご注文で送料無料です。店頭受け取りは無料です。' },
  { id: 'area', key: 'area', icon: 'truck', color: '#2E97D4', title: '配送區域與冷藏限制', params: { cutoff: 15 },
    body: '冷藏蛋糕以黑貓冷藏宅配，台灣本島隔日到，離島與偏遠山區不寄冷藏。常溫禮盒全台含離島都能寄，鳳梨酥、餅乾禮盒可寄海外（國際運費 NT$450 起）。下午 {cutoff} 點前付款當天出貨，週日不出貨。',
    en: 'Chilled cakes ship by refrigerated courier and arrive the next day anywhere on Taiwan\'s main island (no chilled delivery to outlying islands). Room-temperature gift boxes ship island-wide; pineapple cakes and cookie boxes can ship overseas (from NT$450). Paid before {cutoff}:00 ships the same day; no dispatch on Sundays.',
    ja: '冷蔵ケーキはクール便で台湾本島なら翌日着、離島へは冷蔵発送できません。常温ギフトは離島も可、パイナップルケーキとクッキーは海外発送できます（国際送料 NT$450〜）。{cutoff}時までのお支払いで当日発送、日曜は発送休みです。' },
  { id: 'allergen', key: 'allergen', icon: 'alert', color: '#DD5597', title: '過敏原說明', auto: true,
    body: allergenText('zh'), en: allergenText('en'), ja: allergenText('ja') },
  { id: 'storage', key: 'storage', icon: 'snow', color: '#5EE0C4', title: '保存方式', auto: true,
    body: storageText('zh'), en: storageText('en'), ja: storageText('ja') },
  { id: 'custom', key: 'custom', icon: 'calendar', color: '#7C62E6', title: '客製蛋糕規則', params: { days: 7, deposit: 50 },
    body: '客製蛋糕請至少 {days} 天前預訂，6 吋起，可寫字、放照片糖片，不做翻糖人偶。預訂需付 {deposit}% 訂金，取貨 3 天前取消可全額退訂金。',
    en: 'Custom cakes need at least {days} days\' notice, from 6 inches. We can pipe messages and add photo sugar sheets, but no fondant figures. A {deposit}% deposit is required, fully refundable if cancelled 3 days before pickup.',
    ja: 'オーダーケーキは{days}日前までにご予約ください（6号から）。文字入れ・写真プリント可、シュガー人形は不可。{deposit}%の前金が必要で、受取3日前までのキャンセルは全額返金します。' },
  { id: 'pay', key: 'pay', icon: 'bank', color: '#2DB674', title: '付款方式',
    body: `線上可用${payList('zh')}；門市另收現金。不提供貨到付款。`,
    en: `Online we accept ${payList('en')}; cash is accepted in store. No cash on delivery.`,
    ja: `オンラインは${payList('ja')}がご利用いただけます。店頭では現金も可。代引きは承っておりません。` },
  { id: 'invoice', key: 'invoice', icon: 'receipt', color: '#F0A531', title: '發票說明',
    body: '一律開立電子發票，可存手機載具、捐贈，或打統一編號；公司報帳請在結帳時填寫統編與抬頭。',
    en: 'We issue e-invoices for every order. You can save it to a mobile barcode carrier, donate it, or add a company tax ID at checkout.',
    ja: 'すべてのご注文で電子インボイス（統一発票）を発行します。モバイルバーコード保存・寄付・会社の統一番号記載が選べます。' },
  { id: 'hours', key: 'hours', icon: 'clock', color: '#2E97D4', title: '營業時間與門市自取',
    body: `門市營業 ${BIZ_HOURS.label}，可預約自取；當日現做數量有限，熱門品項建議前一天預訂。`,
    en: `Our shop is open ${BIZ_HOURS.open}:00–${BIZ_HOURS.close}:00 (closed Mondays). Pickup by reservation; popular items are best ordered a day ahead.`,
    ja: `店舗営業は${BIZ_HOURS.open}:00〜${BIZ_HOURS.close}:00（月曜定休）。予約受取可、人気商品は前日までのご予約がおすすめです。` },
];

// ---------- 安全護欄 ----------
const AMEI_GUARDS = [
  { id: 'promise', icon: 'shield', color: '#2DB674', title: '不亂承諾', desc: 'AI 不說醫療功效、不保證送達時間、不保證「完全不含過敏原」。', blocked: 37 },
  { id: 'discount', icon: 'percent', color: '#F0A531', title: '折扣上限', desc: 'AI 只能在你設定的範圍內給折扣，超過一律婉拒。', blocked: 52 },
  { id: 'approve', icon: 'coins', color: '#2E97D4', title: '大額訂單要你點頭', desc: '單筆金額超過門檻，AI 先跟客人確認需求，再請你核准。', blocked: 6 },
  { id: 'escalate', icon: 'bell', color: '#EC6A55', title: '敏感狀況立即轉給你', desc: '客訴、退款、吃了過敏，AI 先安撫並給安全指引，同時馬上通知你。', blocked: 9 },
];
export const DISCOUNT_OPTS = [100, 95, 90, 85];
export const discountLabel = (v) => v >= 100 ? '不給折扣' : v % 10 === 0 ? `${v / 10} 折` : `${v} 折`;
export function foldText(v, lang = 'zh') {
  if (lang === 'en') return `${100 - v}% off`;
  if (lang === 'ja') return `${100 - v}%割引`;
  return v % 10 === 0 ? `${v / 10} 折` : `${v} 折`;
}

// ---------- 測試問題 ----------
const AMEI_TEST_Q = {
  zh: ['有沒有不含堅果的禮盒？', '明天寄得到台南嗎？', '可以打 8 折嗎？', '我吃了過敏怎麼辦', '運費多少？多少免運？', '公司尾牙要訂 30 盒鳳梨酥', '吃這個可以降血糖嗎？', '蛋糕送來壓壞了，我要退款', '生日蛋糕可以寫字嗎？', '有全素的蛋糕嗎？'],
  ja: ['ナッツが入っていないギフトはありますか？', '明日、台南に届きますか？', '20%割引できますか？', '賞味期限はどのくらいですか？', '日本に送れますか？'],
  en: ['Do you have a nut-free gift box?', 'Can I get 20% off?', 'I ate your cookies and my throat feels itchy', 'How do I store the basque cake?', 'Is it halal?', 'We need 40 boxes of cookies for our office'],
};

// ---------- 匯入示範 ----------
const AMEI_IMPORT_SAMPLE = `【阿美手作甜點｜購物須知】
・節慶檔期（中秋、春節）訂單量大，出貨可能延後 2–3 天，請提早下單。
・禮盒可加購提袋，每個 NT$10，下單時備註數量即可。
・可代寫手寫小卡（50 字內），免費隨貨附上。
・企業大量訂購 20 盒以上，可指定統一配送日並提供報價單。
・冷藏商品收到後請立即冷藏，不建議放在車上超過 1 小時。`;
const AMEI_IMPORT_URL = 'https://amei-sweets.example/faq';
const AMEI_IMPORT_FAQ = [
  { title: '節慶出貨時間', body: '中秋、春節等節慶檔期訂單量大，出貨可能延後 2–3 天，建議提早下單。', kw: ['中秋', '春節', '過年', '節慶', 'festival', 'mid-autumn'] },
  { title: '禮盒提袋', body: '禮盒可加購提袋，每個 NT$10，下單時備註數量即可。', kw: ['提袋', '袋子', '紙袋', 'gift bag', '手提げ'] },
  { title: '代寫小卡', body: '可以代寫手寫小卡（50 字內），免費隨貨附上，結帳時在備註寫下想說的話。', kw: ['小卡', '卡片', '寫卡', 'card', 'カード'] },
  { title: '企業大量訂購', body: '企業訂購 20 盒以上，可指定統一配送日，並提供正式報價單。', kw: ['企業', '報價', '大量', 'quotation', 'corporate', '見積'] },
  { title: '冷藏品收貨提醒', body: '冷藏商品收到後請立即冷藏，不建議放在車上超過 1 小時。', kw: ['放車上', '車上', '退冰', 'in the car'] },
];

// ---------- AI 不會回答的問題（本週，示範） ----------
const AMEI_UNKNOWN_SEED = [
  { q: '有全素的蛋糕嗎？', n: 14, title: '素食說明', kw: ['全素', '純素', '素食', 'vegan', 'ヴィーガン'],
    draft: `目前所有甜點都含蛋、奶，屬於蛋奶素，沒有全素（純素）品項。` },
  { q: 'Is it halal?', n: 11, title: '清真認證', kw: ['halal', '清真', 'ハラール'],
    draft: '目前沒有清真（Halal）認證。商品不含豬肉成分，但廚房沒有做清真分流，請依個人需求斟酌。',
    en: 'We are not halal-certified yet. Our desserts contain no pork, but the kitchen is not halal-segregated, so please decide based on your needs.' },
  { q: '寵物可以吃嗎？', n: 6, title: '寵物食用', kw: ['寵物', '狗狗', '貓咪', '毛孩', 'pet', 'dog', 'ペット'],
    draft: '甜點是做給人吃的，含糖與奶油，不建議給毛孩食用喔。' },
  { q: '有沒有無糖或低糖的？', n: 5, title: '低糖選擇', kw: ['無糖', '低糖', '減糖', 'sugar', '甘さ控えめ'],
    draft: `目前沒有無糖產品；甜度最低的是${PRODUCTS.filter(p => p.sweet <= 2).map(p => p.name).join('、')}（甜度 2／5）。` },
];

// ---------- 常見問題 Top 5（本週，示範） ----------
const AMEI_TOP_FAQ = [
  { q: '運費多少？多少免運？', n: 168, kb: 'ship' },
  { q: '有沒有不含堅果的禮盒？', n: 121, kb: 'allergen' },
  { q: '明天寄得到台南嗎？', n: 97, kb: 'area' },
  { q: '蛋糕可以放幾天？', n: 74, kb: 'storage' },
  { q: '生日蛋糕可以寫字嗎？', n: 53, kb: 'custom' },
];

// ---------- 最近轉給老闆的對話（示範） ----------
const AMEI_HANDOFF_SEED = [
  { ago: '今天 10:42', who: '陳先生', ch: 'line', reason: '大額訂單', text: '公司中秋要訂 60 盒鳳梨酥（約 NT$28,800）', st: '已核准' },
  { ago: '昨天 21:15', who: 'Hannah K.', ch: 'whatsapp', reason: '過敏反應', text: '吃餅乾後喉嚨癢，已請她先就醫', st: '已致電關心' },
  { ago: '10/3 16:08', who: '林小姐', ch: 'messenger', reason: '客訴退款', text: '生乳捲送到時側邊壓到', st: '已補寄' },
];


// =====================================================================
// 其他業主：依業態大類（TENANT.cat）產生店規、測試問題、匯入示範與儀表資料（商品取自目前業主）
// =====================================================================
const MODE = CAT === 'flower' ? 'flower' : CAT === 'service' ? 'service' : TAKEOUT ? 'food' : 'ship';
const FOODISH = ['food', 'drink', 'dessert', 'farm'].includes(CAT);
const P0 = PRODUCTS[0], P1 = PRODUCTS[1] || PRODUCTS[0];
const BY_PRICE = [...PRODUCTS].sort((a, b) => a.price - b.price);
const qword = measure;
const SLUG = (String(TENANT.en || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')) || TENANT.id;
// 大量訂購示範：數量讓金額超過 NT$12,000（觸發「大額訂單要你點頭」）
const BULK_P = [...PRODUCTS].sort((a, b) => b.price - a.price).find(p => p.price <= 2000) || BY_PRICE[0];
export const BULK_Q = Math.max(30, Math.ceil(12000 / BULK_P.price / 10) * 10);
export const MODE_ID = MODE;
export const IS_FOODISH = FOODISH;
export const unitWord = qword;
// 商品辨識：名稱、英文名、空白切開的片段、商品關鍵字（kw）
export const GEN_ALIASES = Object.fromEntries(PRODUCTS.map(p => [p.id, [p.name, p.en, ...String(p.name).split(/\s+/).filter(w => w.length >= 2), ...(p.kw || [])].filter(Boolean)]));

// 各業態的店規卡片內容（中／英／日）
const CARD = {
  allergen: {
    food: ['過敏原與辣度', '花生、蝦蟹等常見過敏原都標在菜單上；辣度可選不辣、小辣、中辣，醬料可以另外裝。廚房同時處理多種食材，無法保證完全零接觸。', 'Common allergens such as peanuts and shellfish are marked on the menu. Spice level can be none, mild or medium, and sauces can be packed separately. Our kitchen handles many ingredients, so we cannot guarantee zero cross-contact.', 'ピーナッツや甲殻類などのアレルゲンはメニューに表示しています。辛さは「なし・小辛・中辛」から選べ、タレは別添えも可能です。同じ厨房で多くの食材を扱うため、微量混入の可能性はゼロではありません。'],
    drink: HAS_BEANS
      ? ['成分與咖啡因', '咖啡豆只有咖啡本身，不添加香料或糖；含咖啡因，孕婦或對咖啡因敏感的客人請斟酌飲用。部分包材與堅果類產品同場分裝，無法保證完全零接觸。', 'Our beans are 100% coffee with no flavouring or sugar. They contain caffeine, so please take care if you are pregnant or caffeine-sensitive. Packing is shared with nut products, so zero cross-contact cannot be guaranteed.', 'コーヒー豆は香料・砂糖不使用です。カフェインを含むため、妊娠中の方や敏感な方はご注意ください。ナッツ製品と同じ場所で包装しているため、微量混入の可能性はゼロではありません。']
      : ['成分與咖啡因', '每項飲品的成分、糖量與是否含咖啡因都標在商品頁；可選少糖或無糖。製作區同時處理奶類與堅果，無法保證完全零接觸。', 'Ingredients, sugar level and caffeine are listed on each product page; less or no sugar is available. Our prep area also handles dairy and nuts.', '各商品の原材料・糖分・カフェインの有無は商品ページに記載しています。微糖・無糖も選べます。乳製品とナッツも扱っています。'],
    dessert: ['過敏原說明', '每項商品的過敏原（蛋、奶、麩質、堅果）都標在商品頁；廚房同時處理堅果，無法保證完全沒有交叉接觸。', 'Allergens (egg, dairy, gluten, nuts) are listed on each product page. Our kitchen also handles nuts, so zero cross-contact cannot be guaranteed.', '各商品のアレルゲン（卵・乳・小麦・ナッツ）は商品ページに記載しています。同じ厨房でナッツを扱っています。'],
    farm: ['產地與栽培方式', '每批農產都附產地與採收日期；依安全用藥規範栽培，收到後建議清洗再食用。對特定蔬果過敏者請先確認品項。', 'Every batch comes with its origin and harvest date. Grown under safe-use pesticide rules; please wash before eating.', 'すべてのロットに産地と収穫日を記載しています。安全基準に沿って栽培していますが、洗ってからお召し上がりください。'],
    craft: ['材質說明', '主要材質與五金都標在商品頁；五金為無鎳合金，皮革或布料天然紋路與色差屬正常現象。對特定材質過敏者請先詢問。', 'Materials and hardware are listed on each product page. Hardware is nickel-free; natural marks and colour variation are normal.', '素材と金具は商品ページに記載しています。金具はニッケルフリー、天然素材の傷や色ムラは個性です。'],
    flower: ['花粉與寵物安全', '花束可指定低花粉花材；百合、鬱金香等對貓狗有毒，家中有寵物請先告訴我們，會改用安全花材。', 'We can choose low-pollen stems on request. Lilies and tulips are toxic to cats and dogs, so tell us if you have pets and we will use safe flowers.', 'ご希望で花粉の少ない花材にできます。ユリやチューリップは猫・犬に有毒なため、ペットがいる場合はお知らせください。'],
    service: ['衛生與過敏', '每位客人結束後工具都會清潔消毒，一次性耗材不重複使用；皮膚敏感或曾過敏的客人，請在預約時告知，我們會先做局部測試。', 'All tools are cleaned and sterilised after every guest and single-use items are never reused. If you have sensitive skin or allergies, tell us when booking and we will do a patch test first.', 'お客様ごとに器具を洗浄・消毒し、使い捨て用品は再利用しません。敏感肌・アレルギーのある方はご予約時にお知らせください。パッチテストを行います。'],
    retail: ['材質與成分', '每項商品的材質、成分與產地都標在商品頁；對特定成分過敏者請先詢問，我們會協助確認。', 'Materials, ingredients and origin are listed on each product page. Ask us if you have allergies and we will check for you.', '各商品の素材・成分・原産地は商品ページに記載しています。アレルギーのある方はお問い合わせください。'],
  },
  storage: {
    food: ['保存與復熱', '外帶餐點建議 2 小時內食用；湯品冷藏可放 1 天，冷凍品冷凍可放 3 個月，加熱至沸騰再食用。', 'Takeaway meals are best eaten within 2 hours. Soups keep 1 day chilled; frozen items keep 3 months. Reheat until boiling.', 'テイクアウトは2時間以内にお召し上がりください。スープは冷蔵1日、冷凍品は3か月保存できます。'],
    drink: HAS_BEANS
      ? ['保存與沖泡', '咖啡豆請密封、避光、常溫保存，開封後 3–4 週內風味最好；不建議冰冷藏。袋上都有烘焙日期，烘好後養豆 3–5 天最好喝。', 'Keep beans sealed, away from light at room temperature; best within 3–4 weeks of opening. The roast date is on every bag; beans taste best 3–5 days after roasting.', '豆は密閉・遮光・常温で保存し、開封後3〜4週間以内がおすすめです。袋に焙煎日を記載しています。']
      : ['保存方式', '每項商品的保存方式與期限都標在包裝上；冷藏品收到請盡快冰存，開封後請盡早飲用。', 'Storage and shelf life are printed on each pack. Refrigerate chilled items promptly.', '保存方法と期限はパッケージに記載しています。要冷蔵品は届いたらすぐ冷蔵庫へ。'],
    dessert: ['保存方式', '每項商品的保存方式與天數都標在包裝上；冷藏品收到請盡快放冰箱，避免陽光直射。', 'Storage and shelf life are printed on each pack. Refrigerate chilled items promptly and avoid direct sunlight.', '保存方法と日数はパッケージに記載しています。'],
    farm: ['保存方式', '收到後請拆箱通風，依標示冷藏或常溫保存，建議 5–7 天內食用完畢。', 'Unpack on arrival, then refrigerate or keep at room temperature as labelled. Best within 5–7 days.', '到着後は箱から出し、表示どおり冷蔵または常温で保存し、5〜7日以内にお召し上がりください。'],
    craft: ['保養方式', '避免長時間曝曬與泡水；每 2–3 個月用保養油薄擦一次，就會越用越有光澤。手工縫線與五金保固一年。', 'Avoid long sun exposure and soaking. Apply care oil thinly every 2–3 months. Stitching and hardware have a 1-year warranty.', '長時間の直射日光や水濡れを避け、2〜3か月に一度オイルで手入れしてください。縫製と金具は1年保証です。'],
    flower: ['照顧方式', '收到後斜剪花莖 1–2 公分、每兩天換水，避開陽光直射與冷氣出風口，大多能維持 5–7 天；乾燥花請避免潮濕。', 'Trim stems at an angle, change water every 2 days and keep away from sun and air-con. Most bouquets last 5–7 days.', '茎を斜めに切り、2日ごとに水を替え、直射日光とエアコンの風を避けてください。多くは5〜7日もちます。'],
    service: ['居家保養', '服務後 24 小時內避免長時間泡熱水；每天擦護理油，可以維持更久。若有翹起或不適，7 天內免費修補。', 'Avoid soaking in hot water for 24 hours and apply care oil daily. Free touch-ups within 7 days if anything lifts.', '施術後24時間は長時間の入浴を避け、毎日オイルでケアしてください。7日以内のお直しは無料です。'],
    retail: ['使用與保存', '每項商品的使用方式與保存建議都附在包裝內；避免高溫潮濕，延長使用壽命。', 'Usage and care instructions are included in every package. Avoid heat and humidity.', '使用方法と保存方法は同梱の説明書をご覧ください。'],
  },
  custom: {
    food: ['團體訂餐與包場', '10 份以上團體訂餐請至少 {days} 天前預訂，可分裝並標示辣度；包場需付 {deposit}% 訂金，3 天前取消可全額退訂金。', 'Group orders of 10+ need {days} days\' notice and can be labelled by spice level. Private bookings need a {deposit}% deposit, fully refundable 3 days ahead.', '10食以上の団体注文は{days}日前までにご予約ください。貸切は{deposit}%の前金が必要です。'],
    drink: HAS_BEANS
      ? ['研磨與客製', '可依沖煮器材研磨（手沖中細、摩卡壺細、法壓粗）；企業客製禮盒請至少 {days} 天前預訂，需付 {deposit}% 訂金。', 'We grind to your brewer (pour-over medium-fine, moka fine, French press coarse). Corporate gift boxes need {days} days\' notice and a {deposit}% deposit.', '抽出器具に合わせて挽き分けます。法人向けギフトは{days}日前までにご予約、{deposit}%の前金が必要です。']
      : ['客製與大量訂購', '客製禮盒或大量訂購請至少 {days} 天前預訂，需付 {deposit}% 訂金，3 天前取消可全額退訂金。', 'Custom or bulk orders need {days} days\' notice and a {deposit}% deposit, refundable 3 days ahead.', 'カスタム・大量注文は{days}日前までにご予約ください。{deposit}%の前金が必要です。'],
    dessert: ['客製規則', '客製商品請至少 {days} 天前預訂，可寫字；預訂需付 {deposit}% 訂金，取貨 3 天前取消可全額退訂金。', 'Custom orders need at least {days} days\' notice. A {deposit}% deposit is required, refundable 3 days before pickup.', 'オーダー品は{days}日前までにご予約ください。{deposit}%の前金が必要です。'],
    farm: ['預購與禮盒', '當季預購請至少 {days} 天前下單，產季開始依序出貨；企業禮盒需付 {deposit}% 訂金。', 'Seasonal pre-orders need {days} days\' notice and ship in order once the season starts. Corporate gift boxes need a {deposit}% deposit.', '旬の予約は{days}日前までに。法人ギフトは{deposit}%の前金が必要です。'],
    craft: ['客製刻字規則', '刻字免費（英文 10 字內），需多 2 個工作天；全客製款請至少 {days} 天前預訂，需付 {deposit}% 訂金，開工前取消可全額退訂金。', 'Engraving is free (up to 10 letters) and adds 2 working days. Fully custom pieces need {days} days\' notice and a {deposit}% deposit, refundable before work starts.', '刻印は無料（英字10文字まで）、+2営業日です。フルオーダーは{days}日前までにご予約、{deposit}%の前金が必要です。'],
    flower: ['客製花禮規則', '可指定色系與預算，免費代寫卡片；開幕花籃與婚禮花藝請至少 {days} 天前預訂，需付 {deposit}% 訂金。', 'Choose colours and budget, with a free handwritten card. Opening baskets and wedding flowers need {days} days\' notice and a {deposit}% deposit.', '色やご予算を指定でき、カードの代筆は無料です。開店祝い・ウェディングは{days}日前までにご予約ください。'],
    service: ['預約與改期規則', '完全預約制；改期請於 {days} 天前告知，免手續費。熱門時段需預付 {deposit}% 訂金，當天未到訂金不退。', 'By appointment only. Reschedule at least {days} day(s) ahead at no charge. Peak slots need a {deposit}% deposit, non-refundable for no-shows.', '完全予約制です。{days}日前までの変更は無料。人気枠は{deposit}%の前金が必要です。'],
    retail: ['預購與調貨', '缺貨商品可預購或調貨，約 {days} 天到貨；大量訂購需付 {deposit}% 訂金。', 'Out-of-stock items can be pre-ordered in about {days} days. Bulk orders need a {deposit}% deposit.', '欠品は予約・取り寄せ可能で約{days}日です。'],
  },
  area: {
    ship: ['配送區域與時間', '宅配台灣本島隔日到，離島約 2–3 天；部分品項可寄海外（國際運費 NT$450 起）。下午 {cutoff} 點前付款當天出貨，週日不出貨。', 'Home delivery arrives the next day on Taiwan\'s main island and in 2–3 days to outlying islands. Some items ship overseas (from NT$450). Paid before {cutoff}:00 ships the same day; no dispatch on Sundays.', '台湾本島は翌日、離島は2〜3日でお届けします。一部商品は海外発送可（NT$450〜）。{cutoff}時までのお支払いで当日発送、日曜は発送休みです。'],
    flower: ['配送區域與時段', '鮮花限雙北市區配送，可選上午 10–12 點或下午 2–5 點；當天 {cutoff} 點前付款可當日配送，離島與海外不寄鮮花。', 'Fresh flowers deliver within Taipei and New Taipei, in a 10–12 am or 2–5 pm slot. Paid before {cutoff}:00 can go out the same day. No fresh-flower delivery to islands or overseas.', '生花は台北・新北のみ配達、午前10〜12時か午後2〜5時を選べます。{cutoff}時までのお支払いで当日配達可能です。'],
    service: ['服務地點與交通', `服務地點在${TENANT.region || '店內'}，完全預約制，請於預約時間前 5 分鐘到店；${'{cutoff}'} 點後的預約需前一天確認。`, `We are located in ${TENANT.region || 'the studio'}. Appointment only; please arrive 5 minutes early. Bookings after {cutoff}:00 must be confirmed the day before.`, '完全予約制です。予約時間の5分前にお越しください。'],
    food: ['外送範圍與取餐', '外送限店家 3 公里內，下單後約 40 分鐘送達；到店自取約 15 分鐘出餐。{cutoff} 點後停止接受外送訂單。', 'Delivery within 3 km, about 40 minutes. Pickup orders are ready in about 15 minutes. No delivery orders after {cutoff}:00.', '配達は3km以内で約40分、店頭受け取りは約15分です。{cutoff}時以降は配達受付を終了します。'],
  },
  ship: {
    ship: ['宅配運費 NT${fee}，單筆滿 NT${free} 免運；門市自取免運費。', 'Delivery is NT${fee}; orders of NT${free} or more ship free. Pickup is free.', '配送料は NT${fee}、NT${free} 以上で送料無料です。'],
    flower: ['配送費 NT${fee}，單筆滿 NT${free} 免配送費；到店自取不收費。', 'Delivery is NT${fee}; free over NT${free}. Pickup is free.', '配達料は NT${fee}、NT${free} 以上で無料です。'],
    service: ['到店服務不收運費；實體禮券宅配 NT${fee}，滿 NT${free} 免運，電子禮券免運。', 'No fee for in-studio services. Physical gift cards ship for NT${fee} (free over NT${free}); e-vouchers are free.', '店内サービスに送料はかかりません。ギフト券の配送は NT${fee}（NT${free}以上無料）です。'],
    food: ['外送費 NT${fee}，單筆滿 NT${free} 免外送費；到店自取不用外送費。', 'Delivery is NT${fee}; free over NT${free}. Pickup is free.', '配達料は NT${fee}、NT${free} 以上で無料です。'],
  },
  ret: {
    food: '餐點屬於食品，非品質問題恕不退換。收到後 {hours} 小時內發現餐點有誤或品質問題，拍照傳給我們，立即重做或全額退款。',
    drink: (HAS_BEANS ? '飲品與咖啡豆' : '飲品') + '屬於食品，未拆封且 {hours} 小時內可辦理退換；收到時包裝破損或品質有問題，拍照傳給我們，免費補寄或全額退款。',
    dessert: '食品非瑕疵恕不退換。收到後 {hours} 小時內發現壓損或變質，拍照傳給我們，免費補寄或全額退款。',
    farm: '生鮮農產非品質問題恕不退換。收到後 {hours} 小時內發現碰傷或腐壞，拍照傳給我們，免費補寄或退款。',
    craft: '未使用且保持完整可於收到後 {hours} 小時內辦理退換；客製刻字商品恕不退換，但瑕疵一律免費修理或更換。',
    flower: '鮮花屬於生鮮，非瑕疵恕不退換。收到後 {hours} 小時內發現花材損傷或與訂單不符，拍照傳給我們，免費補送或退款。',
    service: '服務後 {hours} 小時內若有翹起、脫落或不滿意，可免費修補一次；預付訂金依預約與改期規則處理。',
    retail: '收到後 {hours} 小時內，未使用且包裝完整可辦理退換；瑕疵品一律免費更換。',
  },
};
const cc = (k) => (CARD[k][CAT] || CARD[k].retail);
const cm = (k) => (CARD[k][MODE] || CARD[k].ship);
const GEN_KB = () => {
  const [aT, aZ, aE, aJ] = cc('allergen'), [sT, sZ, sE, sJ] = cc('storage'), [cT, cZ, cE, cJ] = cc('custom'), [rT, rZ, rE, rJ] = cm('area'), [shZ, shE, shJ] = cm('ship');
  const hoursNote = MODE === 'service' ? '完全預約制，請先線上預約；可預約的時段 AI 會即時回覆。' : MODE === 'food' ? '可線上點餐、到店自取免排隊；尖峰時段建議提前 30 分鐘下單。' : '可預約自取；熱門品項數量有限，建議提前預訂。';
  return [
    { id: 'return', key: 'return', icon: 'refresh', color: '#EC6A55', title: MODE === 'service' ? '補救與退費政策' : '退換貨政策', params: { hours: MODE === 'service' ? 72 : 24 },
      body: CARD.ret[CAT] || CARD.ret.retail,
      en: 'If anything is wrong, send us a photo within {hours} hours and we will make it right with a replacement, a fix or a refund.',
      ja: '{hours}時間以内に写真をお送りいただければ、交換・お直し・返金で対応します。' },
    { id: 'ship', key: 'ship', icon: 'coins', color: '#F0A531', title: MODE === 'food' ? '外送費與免運門檻' : MODE === 'service' ? '費用與禮券寄送' : '運費與免運門檻', params: { fee: SHIPPING_FEE, free: FREE_SHIP }, body: shZ, en: shE, ja: shJ },
    { id: 'area', key: 'area', icon: 'truck', color: '#2E97D4', title: rT, params: { cutoff: MODE === 'food' ? 20 : 15 }, body: rZ, en: rE, ja: rJ },
    { id: 'allergen', key: 'allergen', icon: 'alert', color: '#DD5597', title: aT, body: aZ, en: aE, ja: aJ },
    { id: 'storage', key: 'storage', icon: 'snow', color: '#5EE0C4', title: sT, body: sZ, en: sE, ja: sJ },
    { id: 'custom', key: 'custom', icon: 'calendar', color: '#7C62E6', title: cT, params: { days: MODE === 'service' ? 1 : 7, deposit: MODE === 'service' ? 30 : 50 }, body: cZ, en: cE, ja: cJ },
    { id: 'pay', key: 'pay', icon: 'bank', color: '#2DB674', title: '付款方式',
      body: `線上可用${payList('zh')}；${MODE === 'service' ? '到店' : '門市'}另收現金。不提供貨到付款。`,
      en: `Online we accept ${payList('en')}; cash is accepted in store. No cash on delivery.`,
      ja: `オンラインは${payList('ja')}がご利用いただけます。店頭では現金も可。代引きは承っておりません。` },
    { id: 'invoice', key: 'invoice', icon: 'receipt', color: '#F0A531', title: '發票說明',
      body: '一律開立電子發票，可存手機載具、捐贈，或打統一編號；公司報帳請在結帳時填寫統編與抬頭。',
      en: 'We issue e-invoices for every order. You can save it to a mobile barcode carrier, donate it, or add a company tax ID at checkout.',
      ja: 'すべてのご注文で電子インボイス（統一発票）を発行します。モバイルバーコード保存・寄付・会社の統一番号記載が選べます。' },
    { id: 'hours', key: 'hours', icon: 'clock', color: '#2E97D4', title: MODE === 'service' ? '營業時間與預約' : MODE === 'food' ? '營業時間與自取' : '營業時間與門市自取',
      body: `營業 ${BIZ_HOURS.label}，${MODE === 'ship' ? '工作室' : '店面'}位於${TENANT.region || '市區'}；${hoursNote}`,
      en: `Open ${BIZ_HOURS.open}:00–${BIZ_HOURS.close}:00 (closed Mondays). ${MODE === 'service' ? 'Appointment only.' : 'Pickup by reservation.'}`,
      ja: `営業時間は${BIZ_HOURS.open}:00〜${BIZ_HOURS.close}:00（月曜定休）。${MODE === 'service' ? '完全予約制です。' : '予約受取可。'}` },
  ];
};

const GEN_GUARDS = [
  { id: 'promise', icon: 'shield', color: '#2DB674', title: '不亂承諾', desc: `AI 不說醫療功效、不保證送達時間、不保證「${MODE === 'service' ? '完全不會過敏' : '完全不含過敏原'}」。`, blocked: 37 },
  { id: 'discount', icon: 'percent', color: '#F0A531', title: '折扣上限', desc: 'AI 只能在你設定的範圍內給折扣，超過一律婉拒。', blocked: 52 },
  { id: 'approve', icon: 'coins', color: '#2E97D4', title: '大額訂單要你點頭', desc: '單筆金額超過門檻，AI 先跟客人確認需求，再請你核准。', blocked: 6 },
  { id: 'escalate', icon: 'bell', color: '#EC6A55', title: '敏感狀況立即轉給你', desc: `客訴、退款、${FOODISH ? '吃了過敏' : '使用後不適'}，AI 先安撫並給安全指引，同時馬上通知你。`, blocked: 9 },
];

// 測試問題（中／日／英），都能被規則引擎辨識
const MED_Q = { food: '吃這個可以降血壓嗎？', drink: '喝這個可以減肥嗎？', dessert: '吃這個可以降血糖嗎？', farm: '吃這個可以降血糖嗎？', service: '做這個可以治療灰指甲嗎？' }[CAT] || '';
const REACT_Q = { food: '吃了之後喉嚨癢，怎麼辦', drink: '喝了之後心悸不舒服怎麼辦', dessert: '我吃了過敏怎麼辦', farm: '吃了之後嘴巴癢怎麼辦', service: '做完之後手指紅腫發癢怎麼辦', flower: '摸了花之後手很癢怎麼辦', craft: '戴了之後皮膚起疹子怎麼辦' }[CAT] || '用了之後皮膚過敏怎麼辦';
const ALG_Q = { food: '有花生過敏可以吃嗎？', drink: HAS_BEANS ? '我對咖啡因過敏，可以喝嗎？' : '有沒有不含咖啡因、不怕過敏的？', dessert: '有沒有不含堅果的禮盒？', farm: '對芒果過敏可以吃嗎？', service: '我皮膚容易過敏，可以做嗎？', flower: '我對花粉過敏，有適合的嗎？', craft: '我對金屬過敏，五金會不會有問題？' }[CAT] || '我容易過敏，材質是什麼？';
const STORE_Q = { food: '外帶回家可以放多久？', drink: HAS_BEANS ? '咖啡豆怎麼保存比較好？' : '可以保存多久？', service: '做完之後怎麼保養？', flower: '花可以放多久？怎麼照顧？', craft: '平常要怎麼保養？' }[CAT] || '收到後怎麼保存？';
const CUSTOM_Q = { food: '公司要團體訂餐，可以分裝嗎？', drink: HAS_BEANS ? '可以幫我研磨成手沖用的粉嗎？' : '可以客製禮盒嗎？', service: '可以改期嗎？', flower: '可以客製花禮、寫卡片嗎？', craft: '可以刻字嗎？' }[CAT] || '可以客製嗎？';
const COMPLAIN_Q = MODE === 'service' ? '做完隔天就脫落了，我要退款' : MODE === 'food' ? '餐點送來灑出來了，我要退款' : '收到的商品壞掉了，我要退款';
const BULK_ZH = `公司要訂 ${BULK_Q} ${qword(BULK_P)}${BULK_P.name}`;
const GEN_TEST_Q = {
  zh: [ALG_Q, MODE === 'service' ? '店的地址在哪？' : MODE === 'food' ? '外送多久會到？' : '明天寄得到台南嗎？', '可以打 8 折嗎？', REACT_Q, MODE === 'service' ? '費用怎麼算？禮券要運費嗎？' : '運費多少？多少免運？', BULK_ZH, MED_Q, COMPLAIN_Q, CUSTOM_Q, STORE_Q].filter(Boolean),
  ja: [MODE === 'service' ? '予約の変更はできますか？' : '日持ちはどのくらいですか？', '20%割引できますか？', MODE === 'service' || MODE === 'food' ? '営業時間は何時までですか？' : '明日、台南に届きますか？', '送料はいくらですか？', MODE === 'ship' ? '日本に送れますか？' : 'アレルギーが心配です。'],
  en: ['Can I get 20% off?', 'How much is shipping?', MODE === 'ship' ? 'Do you ship overseas?' : 'What are your opening hours?', FOODISH ? 'I ate it and my throat feels itchy' : 'I feel itchy after using it', `We need ${BULK_Q} ${pName('en', BULK_P.id)} for our office`, 'Can I pay by credit card?'],
};
const GEN_IMPORT = {
  ship: [['節慶出貨時間', '中秋、春節等節慶檔期訂單量大，出貨可能延後 2–3 天，建議提早下單。', ['中秋', '春節', '過年', '節慶', 'festival']],
    ['禮物提袋', '可加購提袋，每個 NT$10，下單時備註數量即可。', ['提袋', '袋子', '紙袋', 'gift bag', '手提げ']],
    ['代寫小卡', '可以代寫手寫小卡（50 字內），免費隨貨附上，結帳時在備註寫下想說的話。', ['小卡', '卡片', '寫卡', 'greeting card', 'note card', 'カード']],
    ['企業大量訂購', '企業訂購 20 份以上，可指定統一配送日，並提供正式報價單。', ['企業', '報價', '大量', 'quotation', 'corporate', '見積']],
    ['收貨提醒', '收到後請盡快拆箱檢查，有任何問題 24 小時內拍照告訴我們。', ['拆箱', '檢查', '收到後', 'unbox']]],
  flower: [['節日檔期', '情人節、母親節等節日訂單量大，請至少 3 天前預訂，當日單可能無法指定花材。', ['情人節', '母親節', '節日', '節慶', 'valentine']],
    ['代寫卡片', '可以代寫手寫卡片（50 字內），免費附上，結帳時在備註寫下想說的話。', ['小卡', '卡片', '寫卡', 'greeting card', 'note card', 'カード']],
    ['匿名送花', '可以匿名配送，卡片不署名，配送人員也不會透露訂購人。', ['匿名', '不署名', 'anonymous']],
    ['企業月租花藝', '辦公室與店面可月租花藝，每週更換一次，提供正式報價單。', ['企業', '月租', '辦公室', '報價', 'corporate']],
    ['收花提醒', '收到花後請盡快放水，避免放在車上超過 30 分鐘。', ['放車上', '車上', '收到花', 'in the car']]],
  service: [['遲到規則', '遲到 15 分鐘以上可能需縮短服務內容或改期，請提早出門喔。', ['遲到', '晚到', 'late']],
    ['同行優惠', '兩人同行預約相鄰時段，各享 9 折。', ['同行', '朋友一起', '兩個人', 'friend']],
    ['禮券使用', '禮券一年內有效，可轉贈，預約時告知禮券號碼即可折抵。', ['禮券使用', '禮券號碼', '折抵', '禮物卡', 'gift voucher']],
    ['兒童陪同', '可以帶小朋友，店內有兒童座椅，服務時請家長在旁照顧。', ['小朋友', '小孩', '兒童', 'kids']],
    ['停車資訊', '附近有付費停車場，步行約 3 分鐘；建議搭乘大眾運輸。', ['停車', '車位', 'parking']]],
  food: [['尖峰時段', '午餐 11:30–13:00、晚餐 17:30–19:00 是尖峰，建議提早 30 分鐘線上點餐。', ['尖峰', '排隊', '人多', 'peak']],
    ['餐具與環保', '外帶預設不附餐具，需要請在備註寫「要餐具」；自備容器折 NT$5。', ['餐具', '筷子', '湯匙', '環保', 'cutlery']],
    ['加料與份量', '可以加料或加大份量，價格依品項另計，下單時備註即可。', ['加料', '加大', '大碗', '份量', 'extra']],
    ['企業訂餐', '企業訂餐 20 份以上可指定送達時間，並提供正式報價單。', ['企業', '報價', '大量', 'quotation', 'corporate']],
    DRINK_TAKEOUT ? ['外帶飲用時間', '外帶飲品建議 30 分鐘內喝完，冰塊融化會影響口感。', ['融化', '多久喝', '外帶多久']] : ['外帶保存', '外帶湯品建議 2 小時內食用，湯汁分開裝可避免泡軟。', ['泡軟', '分開裝', '外帶多久', 'soggy']]],
}[MODE];
const GEN_UNKNOWN = {
  ship: [
    { q: '可以寄到公司給同事驚喜嗎？', n: 14, title: '寄到公司', kw: ['寄到公司', '寄公司', '驚喜'], draft: '可以，地址填公司即可，備註收件人與分機；外箱不會標示內容物，不會破梗。' },
    FOODISH
      ? { q: 'Is it halal?', n: 11, title: '清真認證', kw: ['halal', '清真', 'ハラール'], draft: '目前沒有清真（Halal）認證，商品不含豬肉成分，但製作環境沒有清真分流，請依個人需求斟酌。', en: 'We are not halal-certified. Our products contain no pork, but production is not halal-segregated, so please decide based on your needs.' }
      : { q: 'Can I get a gift receipt?', n: 11, title: '贈禮不附價格', kw: ['gift receipt', '不附價格', '價格明細', '贈禮'], draft: '可以，結帳時勾選「贈禮」，包裹內不放價格明細。', en: 'Yes, tick "gift" at checkout and we will leave out the price list.' },
    { q: '有實體店可以看看嗎？', n: 6, title: '參觀實品', kw: ['實體店', '看看', '參觀', '實品'], draft: '目前以線上為主，可以預約到工作室看實品，請先跟 AI 約時間。' },
    { q: '可以先保留，下個月再買嗎？', n: 5, title: '保留商品', kw: ['保留', '下個月', '先留'], draft: '可以幫您保留 3 天；之後若有庫存，仍可再預訂。' },
  ],
  flower: [
    { q: '有不會凋謝的花嗎？', n: 14, title: '不凋花選擇', kw: ['不會凋謝', '永生花', '乾燥花', '凋謝'], draft: '可以選乾燥花或永生花款式，保存一年以上，適合長期擺放。' },
    { q: 'Is it pet-safe?', n: 11, title: '寵物安全', kw: ['pet', '寵物', '貓', '狗', 'ペット'], draft: '百合、鬱金香等花材對貓狗有毒；有養寵物請先告訴我們，會改用安全花材。', en: 'Some flowers such as lilies are toxic to cats and dogs. Tell us if you have pets and we will use safe stems.' },
    { q: '可以指定花材顏色嗎？', n: 6, title: '指定色系', kw: ['顏色', '色系', '指定'], draft: '可以，在備註寫下想要的色系，花藝師會依當季花材搭配。' },
    { q: '可以送到醫院病房嗎？', n: 5, title: '醫院送花', kw: ['醫院', '病房'], draft: '部分醫院病房不收鮮花，建議改送到護理站或改選乾燥花禮，下單前請先確認院方規定。' },
  ],
  service: [
    { q: '可以帶小朋友一起來嗎？', n: 14, title: '兒童陪同', kw: ['小朋友', '小孩', '兒童'], draft: '可以，店內有兒童座椅，服務時請家長在旁照顧。' },
    { q: 'Do you speak English?', n: 11, title: '英文服務', kw: ['english', '英文', '英語'], draft: '可以，AI 可以用英文預約與確認，現場也有英文價目表。', en: 'Yes! Our AI can book and confirm in English, and we have an English price list in the studio.' },
    { q: '有停車位嗎？', n: 6, title: '停車資訊', kw: ['停車', '車位', 'parking'], draft: '附近有付費停車場，步行約 3 分鐘；建議搭乘大眾運輸前來。' },
    { q: '可以兩個人同時做嗎？', n: 5, title: '兩人同行', kw: ['兩個人', '同時', '一起做'], draft: '目前一對一服務，兩位可以預約相鄰時段，AI 會幫您排在一起。' },
  ],
  food: [
    { q: '有素食的選擇嗎？', n: 14, title: '素食說明', kw: ['素食', '吃素', '全素', 'vegan', 'ヴィーガン'], draft: '部分品項可以做蛋奶素，點餐時備註「素食」，我們會確認後回覆；全素需另外詢問。' },
    { q: 'Is it halal?', n: 11, title: '清真認證', kw: ['halal', '清真', 'ハラール'], draft: '目前沒有清真（Halal）認證，廚房沒有清真分流，請依個人需求斟酌。', en: 'We are not halal-certified and the kitchen is not halal-segregated, so please decide based on your needs.' },
    { q: '可以帶寵物進來嗎？', n: 6, title: '寵物入店', kw: ['寵物', '狗狗', '貓咪', '毛孩', 'pet'], draft: '店內歡迎牽繩或推車中的毛孩；餐點調味較重，不建議給寵物食用。' },
    { q: '可以多人併桌嗎？', n: 5, title: '多人用餐', kw: ['併桌', '多人', '人數'], draft: '可以，6 人以上建議先訂位，AI 會幫您保留座位。' },
  ],
}[MODE];
const GEN_TOP = [
  { q: MODE === 'service' ? '費用怎麼算？禮券要運費嗎？' : '運費多少？多少免運？', n: 168, kb: 'ship' },
  { q: ALG_Q, n: 121, kb: 'allergen' },
  MODE === 'ship' ? { q: '明天寄得到台南嗎？', n: 97, kb: 'area' } : MODE === 'food' ? { q: '外送多久會到？', n: 97, kb: 'area' } : MODE === 'flower' ? { q: '明天可以送到嗎？', n: 97, kb: 'area' } : { q: '店的地址在哪？', n: 97, kb: 'hours' },
  { q: STORE_Q, n: 74, kb: 'storage' },
  { q: CUSTOM_Q, n: 53, kb: 'custom' },
];
const BULK_AMT = BULK_Q * BULK_P.price;
const GEN_HANDOFF = [
  { ago: '今天 10:42', who: '陳先生', ch: 'line', reason: '大額訂單', text: `公司要訂 ${BULK_Q} ${qword(BULK_P)}${BULK_P.name}（約 NT$${BULK_AMT.toLocaleString('en-US')}）`, st: '已核准' },
  { ago: '昨天 21:15', who: 'Hannah K.', ch: 'whatsapp', reason: '過敏反應', text: FOODISH ? '用餐後喉嚨癢，已請她先就醫' : '使用後皮膚發癢，已請她先就醫', st: '已致電關心' },
  { ago: '10/3 16:08', who: '林小姐', ch: 'messenger', reason: '客訴退款', text: MODE === 'service' ? '服務隔天就脫落' : MODE === 'food' ? '外送餐點灑出來' : MODE === 'flower' ? '花束送到時有花材折損' : `${P1.name}收到時包裝破損`, st: MODE === 'service' ? '已免費修補' : '已補寄' },
];
export const IMPORT_TRY = IS_AMEI ? '可以代寫卡片嗎？' : `${GEN_IMPORT[1][0]}怎麼算？`;
export const TRY_Q = IS_AMEI
  ? { promise: '吃這個可以降血糖嗎？', discount: '可以打 8 折嗎？', approve: '公司尾牙要訂 30 盒鳳梨酥', escalate: '我吃了過敏怎麼辦' }
  : { promise: MED_Q || (MODE === 'flower' ? '明天一定送得到嗎？' : '保證明天一定送到嗎？'), discount: '可以打 8 折嗎？', approve: BULK_ZH, escalate: REACT_Q };
export const PRESET_Q = IS_AMEI ? ['有沒有不含堅果的禮盒？', '可以打 8 折嗎？'] : [ALG_Q, '可以打 8 折嗎？'];

export const DEFAULT_KB = IS_AMEI ? AMEI_KB : GEN_KB;
export const GUARDS = IS_AMEI ? AMEI_GUARDS : GEN_GUARDS;
export const TEST_Q = IS_AMEI ? AMEI_TEST_Q : GEN_TEST_Q;
export const IMPORT_SAMPLE = IS_AMEI ? AMEI_IMPORT_SAMPLE : `【${TENANT.name}｜購物須知】\n` + GEN_IMPORT.map(([, b]) => `・${b}`).join('\n');
export const IMPORT_URL = IS_AMEI ? AMEI_IMPORT_URL : `https://${SLUG}.example/faq`;
export const IMPORT_FAQ = IS_AMEI ? AMEI_IMPORT_FAQ : GEN_IMPORT.map(([title, body, kw]) => ({ title, body, kw }));
export const UNKNOWN_SEED = IS_AMEI ? AMEI_UNKNOWN_SEED : GEN_UNKNOWN;
export const TOP_FAQ = IS_AMEI ? AMEI_TOP_FAQ : GEN_TOP;
export const HANDOFF_SEED = IS_AMEI ? AMEI_HANDOFF_SEED : GEN_HANDOFF;

// ---------- 本週 7 天模擬統計 ----------
export function weekSeries(baseOnline) {
  const rng = mulberry32(20261005);
  const out = [];
  for (let i = 0; i < 7; i++) {
    const online = baseOnline[i] || 0;
    const ai = Math.round(online * (3.6 + rng() * 1.2) + 40 + rng() * 25);
    const human = Math.max(2, Math.round(ai * (0.045 + rng() * 0.035)));
    const csat = +(4.6 + rng() * 0.35).toFixed(2);
    out.push({ ai, human, csat });
  }
  return out;
}
