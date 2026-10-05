// 整合與協作：模擬資料（所有服務、會計師、客戶皆為示範，不代表真實合作或串接）
import { mulberry32 } from './data.js';

export const CATS = [
  { id: 'channel', name: '接單通路', color: '#2DB674' },
  { id: 'commerce', name: '外送與電商', color: '#EC6A55' },
  { id: 'pay', name: '金流', color: '#F0A531' },
  { id: 'invoice', name: '發票與稅務', color: '#7C62E6' },
  { id: 'logistics', name: '物流', color: '#2E97D4' },
  { id: 'bank', name: '銀行', color: '#5EE0C4' },
  { id: 'tool', name: '工具', color: '#DD5597' },
];
export const CAT_MAP = Object.fromEntries(CATS.map(c => [c.id, c]));

// ab：文字字首色塊（不使用品牌 logo）；ch：對應 store 訂單通路；pay：對應付款方式；base：今日基礎同步筆數
export const SERVICES = [
  { id: 'line', cat: 'channel', name: 'LINE 官方帳號', short: 'LINE', ab: 'L', on: true, ch: 'line', desc: '訊息收單、會員綁定、推播', scopes: ['讀取聊天訊息', '傳送訊息', '取得好友基本資料'] },
  { id: 'whatsapp', cat: 'channel', name: 'WhatsApp Business', short: 'WhatsApp', ab: 'WA', on: true, ch: 'whatsapp', desc: '海外客人英文／馬來文接單', scopes: ['接收訊息', '傳送範本訊息'] },
  { id: 'zalo', cat: 'channel', name: 'Zalo OA', ab: 'Z', on: true, ch: 'zalo', desc: '越南客人越文接單', scopes: ['接收訊息', '傳送訊息'] },
  { id: 'messenger', cat: 'channel', name: 'Facebook Messenger', short: 'Messenger', ab: 'M', on: true, ch: 'messenger', desc: '粉絲專頁私訊自動回覆', scopes: ['管理粉專訊息', '讀取粉專資訊'] },
  { id: 'instagram', cat: 'channel', name: 'Instagram', ab: 'IG', on: false, desc: '私訊詢價、限動回覆收單', scopes: ['管理私訊', '讀取商業帳號資訊'] },
  { id: 'web', cat: 'channel', name: '官網', ab: 'W', on: true, ch: 'web', desc: 'AI 導購銷售網頁', scopes: ['訂單 Webhook', '商品同步'] },
  { id: 'voice', cat: 'channel', name: '電話語音', ab: 'TEL', on: true, ch: 'phone', desc: 'AI 語音客服接聽、建單', scopes: ['來電轉接', '通話錄音轉文字'] },
  { id: 'ubereats', cat: 'commerce', name: 'Uber Eats', ab: 'UE', on: false, desc: '外送訂單自動接單、出餐', scopes: ['讀取訂單', '更新出餐狀態', '同步菜單'] },
  { id: 'foodpanda', cat: 'commerce', name: 'foodpanda', ab: 'fp', on: false, desc: '外送訂單整合、售完自動下架', scopes: ['讀取訂單', '同步菜單與庫存'] },
  { id: 'shopee', cat: 'commerce', name: '蝦皮購物', ab: 'SP', on: false, desc: '電商訂單、庫存與出貨單同步', scopes: ['讀取訂單', '同步庫存', '產生出貨單'] },
  { id: 'ecpay', cat: 'pay', name: '綠界科技', ab: '綠', on: true, pay: 'online', desc: '線上刷卡、ATM 虛擬帳號、超商代碼', scopes: ['建立交易', '接收付款通知', '查詢撥款'] },
  { id: 'linepay', cat: 'pay', name: 'LINE Pay', ab: 'LP', on: true, pay: 'LINE Pay', desc: '行動支付收款、退款', scopes: ['建立付款請求', '退款'] },
  { id: 'jko', cat: 'pay', name: '街口支付', ab: '街', on: true, pay: '街口支付', desc: '掃碼付款、門市收款', scopes: ['建立付款', '查詢交易'] },
  { id: 'card', cat: 'pay', name: '信用卡收單', ab: 'CC', on: true, pay: 'card', desc: '門市刷卡機與 Apple Pay 收單', scopes: ['交易明細', '請款撥款報表'] },
  { id: 'einv', cat: 'invoice', name: '財政部電子發票整合服務平台', short: '電子發票平台', ab: '財', on: true, inv: true, desc: '發票上傳、載具歸戶、中獎清冊', scopes: ['上傳 B2C 發票', '下載進項發票'] },
  { id: 'vac', cat: 'invoice', name: '加值中心', ab: '加', on: true, inv: true, desc: '電子發票開立、作廢、折讓', scopes: ['開立發票', '作廢／折讓'] },
  { id: 'tcat', cat: 'logistics', name: '黑貓宅急便', ab: '貓', on: true, ship: true, desc: '冷藏宅配託運單、配送追蹤', scopes: ['建立託運單', '貨態查詢'] },
  { id: 'seven', cat: 'logistics', name: '7-ELEVEN 交貨便', ab: '7', on: false, desc: '超商取貨、寄件代碼', scopes: ['產生寄件代碼', '取貨狀態'] },
  { id: 'family', cat: 'logistics', name: '全家店到店', ab: 'FM', on: false, desc: '超商店到店寄取', scopes: ['產生寄件代碼', '取貨狀態'] },
  { id: 'esun', cat: 'bank', name: '玉山銀行 API', ab: '玉', on: true, desc: '帳戶明細、入帳通知、自動對帳', scopes: ['查詢帳戶明細', '入帳即時通知'] },
  { id: 'gcal', cat: 'tool', name: 'Google 日曆', ab: 'Cal', on: true, desc: '預購取貨、會議與報稅截止日', scopes: ['建立與修改行程'] },
  { id: 'gdrive', cat: 'tool', name: 'Google 雲端硬碟', short: '雲端硬碟', ab: 'Dr', on: false, desc: '憑證影像、報表每日備份', scopes: ['建立檔案', '讀取 GreenUP 資料夾'] },
];

// 事件範本（API／Webhook 即時流）
export const EVENT_TPL = {
  line: [['WEBHOOK', 'message.received', 'via LINE'], ['POST', 'order.created', 'via LINE'], ['POST', 'reply.sent', 'to LINE']],
  whatsapp: [['WEBHOOK', 'message.received', 'via WhatsApp'], ['POST', 'order.created', 'via WhatsApp']],
  zalo: [['WEBHOOK', 'message.received', 'via Zalo'], ['POST', 'order.created', 'via Zalo']],
  messenger: [['WEBHOOK', 'message.received', 'via Messenger'], ['POST', 'order.created', 'via Messenger']],
  instagram: [['WEBHOOK', 'dm.received', 'via Instagram']],
  web: [['POST', 'order.created', 'via 官網'], ['POST', 'cart.updated', 'via 官網']],
  voice: [['WEBHOOK', 'call.completed', 'via 電話語音'], ['POST', 'order.created', 'via 電話語音']],
  ubereats: [['WEBHOOK', 'order.created', 'via Uber Eats']],
  foodpanda: [['WEBHOOK', 'order.created', 'via foodpanda']],
  shopee: [['WEBHOOK', 'order.created', 'via 蝦皮購物'], ['PUT', 'inventory.synced', 'to 蝦皮購物']],
  ecpay: [['WEBHOOK', 'payment.succeeded', 'via 綠界科技']],
  linepay: [['WEBHOOK', 'payment.succeeded', 'via LINE Pay']],
  jko: [['WEBHOOK', 'payment.succeeded', 'via 街口支付']],
  card: [['GET', 'settlement.fetched', 'from 信用卡收單']],
  einv: [['POST', 'invoice.uploaded', 'to 電子發票平台']],
  vac: [['POST', 'invoice.issued', 'via 加值中心']],
  tcat: [['POST', 'shipment.created', 'via 黑貓宅急便'], ['WEBHOOK', 'shipment.delivered', 'via 黑貓宅急便']],
  seven: [['POST', 'shipment.created', 'via 交貨便']],
  family: [['POST', 'shipment.created', 'via 店到店']],
  esun: [['WEBHOOK', 'deposit.received', 'via 玉山銀行'], ['GET', 'statement.synced', 'from 玉山銀行']],
  gcal: [['PUT', 'calendar.event.synced', 'to Google 日曆']],
  gdrive: [['PUT', 'backup.uploaded', 'to Google 雲端硬碟']],
};

// 會計師審核佇列（AI 標記需人工確認的分錄）
export const REVIEW_QUEUE = [
  { id: 'JE-1009-031', date: '10/02', acct: '交際費', vendor: '晶華軒餐廳', amt: 12800, flag: '金額異常的交際費', level: 'high',
    why: '本月交際費平均 NT$ 1,800，此筆為 7.1 倍；且交際費有年度列支限額。', ai: '建議確認是否為客戶餐敘，並補上與會客戶名稱。' },
  { id: 'JE-1003-012', date: '10/03', acct: '原料', vendor: '大湖果園合作社', amt: 3450, flag: '無統編的進項', level: 'mid',
    why: '憑證為收據，未載明買受人統一編號，進項稅額不得扣抵。', ai: '建議以免用統一發票收據入帳，費用照列、不扣抵進項稅額。' },
  { id: 'JE-0928-044', date: '09/28', acct: '修繕費', vendor: '冷鏈設備行', amt: 86000, flag: '應資本化的支出', level: 'high',
    why: '商用冷藏櫃單價逾 NT$ 80,000 且耐用 2 年以上，依規定應列資產。', ai: '建議改列「生財器具」，按 5 年提列折舊。' },
  { id: 'JE-1004-007', date: '10/04', acct: '雜項費用', vendor: '量販店', amt: 2180, flag: '疑似私人支出', level: 'mid',
    why: '週日消費、品項含生鮮與日用品，與營業無直接關聯。', ai: '建議剔除或改列業主往來。' },
  { id: 'JE-1001-003', date: '10/01', acct: '廣告費', vendor: 'Meta Platforms', amt: 36000, flag: '跨期費用', level: 'low',
    why: '一次支付 12 個月廣告方案，受益期間跨年度。', ai: '建議轉列預付費用，按月攤提 NT$ 3,000。' },
  { id: 'JE-0930-058', date: '09/30', acct: '銷貨收入', vendor: 'WhatsApp 跨境訂單', amt: 1640, flag: '外幣收款匯差', level: 'low',
    why: '以 MYR 收款，入帳日與撥款日匯率不同，差額 NT$ 23。', ai: '建議認列兌換損失 NT$ 23。' },
  { id: 'JE-1002-019', date: '10/02', acct: '進項稅額', vendor: '綠紙包裝設計', amt: 11520, flag: '疑似重複入帳', level: 'high',
    why: '同一張發票號碼於 9/30 與 10/2 各入帳一次。', ai: '建議刪除 10/2 這筆重複分錄。' },
];

// 林記帳士事務所的 10 家示範客戶（虛構）
export const CLIENTS = [
  { name: '阿美手作甜點', ind: '烘焙甜點', plan: '一人公司版', done: 96, filing: 'ok', risk: 'g', joined: 0, me: true },
  { name: '小島咖啡工作室', ind: '咖啡烘豆', plan: '一人公司版', done: 88, filing: 'ok', risk: 'g', joined: 1 },
  { name: '青禾花藝', ind: '花藝設計', plan: '一人公司版', done: 74, filing: 'wait', risk: 'y', joined: 1 },
  { name: '木子設計接案', ind: '平面設計', plan: '一人公司版', done: 100, filing: 'ok', risk: 'g', joined: 2 },
  { name: '好日子寵物美容', ind: '寵物服務', plan: '小店版', done: 61, filing: 'wait', risk: 'y', joined: 3 },
  { name: '阿杰水電工程行', ind: '水電工程', plan: '小店版', done: 42, filing: 'miss', risk: 'r', joined: 4 },
  { name: '森森植栽', ind: '植栽電商', plan: '一人公司版', done: 90, filing: 'ok', risk: 'g', joined: 5 },
  { name: '晴空攝影', ind: '婚禮攝影', plan: '一人公司版', done: 83, filing: 'ok', risk: 'g', joined: 6 },
  { name: '拾光手作皮件', ind: '手作皮件', plan: '一人公司版', done: 69, filing: 'wait', risk: 'y', joined: 7 },
  { name: '米力英語家教', ind: '語言教學', plan: '一人公司版', done: 100, filing: 'ok', risk: 'g', joined: 8 },
];
export const PLAN_PRICE = { '一人公司版': 1090, '小店版': 1690 };
export const REFERRAL_RATE = 0.20;

// 多國設定（稅率依各國最新公告為準，此為示範設定）
export const COUNTRIES = [
  { id: 'tw', code: 'TW', name: '台灣', sub: '主要市場', color: '#2DB674', cur: 'TWD', sym: 'NT$', rate: 1, locale: 'zh-TW', dec: 0,
    taxes: [['營業稅', '5%', '一般稅額計算之營業人']],
    taxNote: '每兩個月申報一次（401），進項稅額可扣抵。',
    einv: { name: '電子發票', local: '統一發票・電子發票', body: '財政部電子發票整合服務平台', pts: ['B2C 載具歸戶與自動對獎', '開立後 48 小時內上傳', '捐贈碼、統編、手機條碼'] },
    channels: ['LINE', '官網', 'Facebook Messenger', '電話語音', 'Instagram'],
    lang: { label: '繁體中文', hello: '您好！今天想來點什麼甜點呢？', order: '訂單已成立', thanks: '感謝您的購買，我們會盡快為您出貨。', item: '檸檬塔（4 入）', total: '合計（含稅）', btn: '確認付款' } },
  { id: 'vn', code: 'VN', name: '越南', sub: '東南亞擴展', color: '#EC6A55', cur: 'VND', sym: '₫', rate: 830, locale: 'vi-VN', dec: 0,
    taxes: [['VAT 標準稅率', '10%', '一般商品與服務'], ['VAT 減徵稅率', '8%', '部分商品適用，依當年政策']],
    taxNote: '減徵措施有期限，需依當年政府公告調整。',
    einv: { name: 'e-invoice', local: 'hóa đơn điện tử', body: '越南稅務總局（GDT）', pts: ['發票需取得稅務機關驗證碼', '開立後即時傳送稅務機關', '保存電子資料備查'] },
    channels: ['Zalo', 'Facebook Messenger', 'TikTok Shop', '官網'],
    lang: { label: 'Tiếng Việt', hello: 'Xin chào! Hôm nay bạn muốn dùng món bánh nào?', order: 'Đơn hàng đã được tạo', thanks: 'Cảm ơn bạn đã mua hàng, chúng tôi sẽ giao sớm nhất.', item: 'Bánh tart chanh (4 cái)', total: 'Tổng cộng (gồm VAT)', btn: 'Xác nhận thanh toán' } },
  { id: 'my', code: 'MY', name: '馬來西亞', sub: '東南亞擴展', color: '#2E97D4', cur: 'MYR', sym: 'RM', rate: 0.14, locale: 'ms-MY', dec: 2,
    taxes: [['SST 銷售稅', '5% / 10%', '依商品類別'], ['SST 服務稅', '8%', '一般應稅服務']],
    taxNote: '銷售稅與服務稅分開計算，部分商品免稅。',
    einv: { name: 'e-Invoice', local: 'MyInvois', body: '馬來西亞內陸稅收局（LHDN）', pts: ['依營業額分階段實施', '透過 MyInvois 入口或 API 驗證', '驗證後產生 QR Code'] },
    channels: ['WhatsApp', 'Facebook Messenger', 'Instagram', '官網'],
    lang: { label: 'Bahasa Melayu', hello: 'Hai! Kek apa yang anda mahu hari ini?', order: 'Pesanan telah dibuat', thanks: 'Terima kasih atas pembelian anda, kami akan menghantar secepat mungkin.', item: 'Tart lemon (4 biji)', total: 'Jumlah (termasuk cukai)', btn: 'Sahkan pembayaran' } },
  { id: 'jp', code: 'JP', name: '日本', sub: '跨境販售', color: '#7C62E6', cur: 'JPY', sym: '¥', rate: 4.7, locale: 'ja-JP', dec: 0, calc: 1,
    taxes: [['消費稅 標準稅率', '10%', '一般商品'], ['消費稅 輕減稅率', '8%', '食品（外帶、宅配）']],
    taxNote: '跨境販售：由台灣出貨寄送日本，需留意進口關稅與消費稅負擔方式。',
    einv: { name: '適格請求書', local: 'インボイス制度', body: '日本國稅廳', pts: ['登錄號碼載於請求書', '依稅率分別記載稅額', '電子帳簿保存法對應'] },
    channels: ['LINE', 'Instagram', '官網（日文）'],
    lang: { label: '日本語', hello: 'こんにちは！今日はどのスイーツにしますか？', order: 'ご注文を承りました', thanks: 'ご購入ありがとうございます。できるだけ早く発送いたします。', item: 'レモンタルト（4個入）', total: '合計（税込）', btn: 'お支払いを確定' } },
];

// 角色權限
export const PERMS = [
  ['查看營收儀表板', 'full', 'none', 'view'],
  ['建立／修改訂單', 'full', 'full', 'none'],
  ['檢視帳務分錄', 'full', 'none', 'view'],
  ['審核／調整分錄', 'full', 'none', 'full'],
  ['下載申報檔', 'full', 'none', 'full'],
  ['管理串接與 API 金鑰', 'full', 'none', 'none'],
  ['管理成員與權限', 'full', 'none', 'none'],
  ['匯出客戶個資', 'full', 'none', 'none'],
];

// 固定種子的匯率走勢（12 週，以第 1 週為基期 100，示意）
export function fxSeries(weeks = 12) {
  const rng = mulberry32(5150);
  const base = { VND: 830, MYR: 0.14, JPY: 4.7 };
  const out = { VND: [], MYR: [], JPY: [] };
  for (const k of Object.keys(base)) {
    let v = 100; out[k].push(v);
    for (let i = 1; i < weeks; i++) { v += (rng() - 0.48) * (k === 'JPY' ? 1.6 : 1.0); out[k].push(+v.toFixed(2)); }
  }
  return { base, idx: out };
}

export const ANCHOR_NOTE = '稅率依各國最新公告為準，此為示範設定';
