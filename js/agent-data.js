// AI 店員設定：人設選項、預設店規、護欄、測試問題、模擬統計（皆為示範資料）
import { PRODUCTS, PRODUCT_MAP, SHIPPING_FEE, FREE_SHIP, PAYMENTS, mulberry32 } from './data.js';

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
  { id: 'cat', name: '甜點貓', bg: ['#F4D35E', '#F0A531'],
    svg: `<path d="M14 26 16 8l12 10zM50 26 48 8 36 18z" fill="#f2c27a"/><path d="M17 22l1-9 6 6zM47 22l-1-9-6 6z" fill="#ff9fb2"/>${face('#f2c27a', '')}<path d="M8 38h10M8 43h10M46 38h10M46 43h10" stroke="#8a5a2b" stroke-width="1.6" stroke-linecap="round"/>` },
  { id: 'bear', name: '烘焙熊', bg: ['#C9935A', '#8B5A3C'],
    svg: `<circle cx="15" cy="18" r="7" fill="#b07a4a"/><circle cx="49" cy="18" r="7" fill="#b07a4a"/><circle cx="15" cy="18" r="3.5" fill="#e7b98a"/><circle cx="49" cy="18" r="3.5" fill="#e7b98a"/>${face('#d39a63', '')}<ellipse cx="32" cy="43" rx="8" ry="6" fill="#f1d2ae"/><path d="M18 14q14-12 28 0l-2 6H20z" fill="#fff"/><rect x="18" y="16" width="28" height="5" rx="2" fill="#f4f4f4"/>` },
  { id: 'bot', name: '小機器人', bg: ['#5EE0C4', '#2E97D4'],
    svg: `<path d="M32 6v8" stroke="#dffaf2" stroke-width="2.4" stroke-linecap="round"/><circle cx="32" cy="6" r="3" fill="#F0A531"/><rect x="12" y="15" width="40" height="36" rx="12" fill="#e9fff8"/><rect x="17" y="22" width="30" height="18" rx="8" fill="#0c3326"/><circle cx="25" cy="31" r="3" fill="#5EE0C4"/><circle cx="39" cy="31" r="3" fill="#5EE0C4"/><path d="M27 45h10" stroke="#2E97D4" stroke-width="2.4" stroke-linecap="round"/>` },
  { id: 'cake', name: '杯子蛋糕', bg: ['#B79AD9', '#7C62E6'],
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
  { id: 'lively', name: '活潑', sample: '哈囉哈囉！今天想吃點什麼甜的？' },
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
export const pname = (pid, lang = 'zh') => lang === 'en' ? EN_NAME[pid] : lang === 'ja' ? JA_NAME[pid] : PRODUCT_MAP[pid].name;

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
export const DEFAULT_KB = () => [
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
export const GUARDS = [
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
export const TEST_Q = {
  zh: ['有沒有不含堅果的禮盒？', '明天寄得到台南嗎？', '可以打 8 折嗎？', '我吃了過敏怎麼辦', '運費多少？多少免運？', '公司尾牙要訂 30 盒鳳梨酥', '吃這個可以降血糖嗎？', '蛋糕送來壓壞了，我要退款', '生日蛋糕可以寫字嗎？', '有全素的蛋糕嗎？'],
  ja: ['ナッツが入っていないギフトはありますか？', '明日、台南に届きますか？', '20%割引できますか？', '賞味期限はどのくらいですか？', '日本に送れますか？'],
  en: ['Do you have a nut-free gift box?', 'Can I get 20% off?', 'I ate your cookies and my throat feels itchy', 'How do I store the basque cake?', 'Is it halal?', 'We need 40 boxes of cookies for our office'],
};

// ---------- 匯入示範 ----------
export const IMPORT_SAMPLE = `【阿美手作甜點｜購物須知】
・節慶檔期（中秋、春節）訂單量大，出貨可能延後 2–3 天，請提早下單。
・禮盒可加購提袋，每個 NT$10，下單時備註數量即可。
・可代寫手寫小卡（50 字內），免費隨貨附上。
・企業大量訂購 20 盒以上，可指定統一配送日並提供報價單。
・冷藏商品收到後請立即冷藏，不建議放在車上超過 1 小時。`;
export const IMPORT_URL = 'https://amei-sweets.example/faq';
export const IMPORT_FAQ = [
  { title: '節慶出貨時間', body: '中秋、春節等節慶檔期訂單量大，出貨可能延後 2–3 天，建議提早下單。', kw: ['中秋', '春節', '過年', '節慶', 'festival', 'mid-autumn'] },
  { title: '禮盒提袋', body: '禮盒可加購提袋，每個 NT$10，下單時備註數量即可。', kw: ['提袋', '袋子', '紙袋', 'gift bag', '手提げ'] },
  { title: '代寫小卡', body: '可以代寫手寫小卡（50 字內），免費隨貨附上，結帳時在備註寫下想說的話。', kw: ['小卡', '卡片', '寫卡', 'card', 'カード'] },
  { title: '企業大量訂購', body: '企業訂購 20 盒以上，可指定統一配送日，並提供正式報價單。', kw: ['企業', '報價', '大量', 'quotation', 'corporate', '見積'] },
  { title: '冷藏品收貨提醒', body: '冷藏商品收到後請立即冷藏，不建議放在車上超過 1 小時。', kw: ['放車上', '車上', '退冰', 'in the car'] },
];

// ---------- AI 不會回答的問題（本週，示範） ----------
export const UNKNOWN_SEED = [
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
export const TOP_FAQ = [
  { q: '運費多少？多少免運？', n: 168, kb: 'ship' },
  { q: '有沒有不含堅果的禮盒？', n: 121, kb: 'allergen' },
  { q: '明天寄得到台南嗎？', n: 97, kb: 'area' },
  { q: '蛋糕可以放幾天？', n: 74, kb: 'storage' },
  { q: '生日蛋糕可以寫字嗎？', n: 53, kb: 'custom' },
];

// ---------- 最近轉給老闆的對話（示範） ----------
export const HANDOFF_SEED = [
  { ago: '今天 10:42', who: '陳先生', ch: 'line', reason: '大額訂單', text: '公司中秋要訂 60 盒鳳梨酥（約 NT$28,800）', st: '已核准' },
  { ago: '昨天 21:15', who: 'Hannah K.', ch: 'whatsapp', reason: '過敏反應', text: '吃餅乾後喉嚨癢，已請她先就醫', st: '已致電關心' },
  { ago: '10/3 16:08', who: '林小姐', ch: 'messenger', reason: '客訴退款', text: '生乳捲送到時側邊壓到', st: '已補寄' },
];

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
