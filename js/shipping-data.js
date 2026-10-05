// 出貨物流：模擬資料與規則（物流商、目的地、時間軸、多語通知、託運單號）
// 所有資料皆為示範用途；物流商名稱僅作情境示意，非真實串接。
import { mulberry32, PRODUCT_MAP, startOfDay, addDays } from './data.js';
import { pName } from './i18n.js';

export const STAGES = [
  { id: 'pick', name: '待揀貨', color: '#F0A531' },
  { id: 'pack', name: '包裝中', color: '#7C62E6' },
  { id: 'ship', name: '已交寄', color: '#2E97D4' },
  { id: 'move', name: '配送中', color: '#5EE0C4' },
  { id: 'done', name: '已送達', color: '#2DB674' },
];

export const CARRIERS = {
  tcat: { id: 'tcat', name: '黑貓宅急便', short: '黑貓宅急便', en: 'Black Cat TA-Q-BIN', ja: '台湾 宅急便（黒猫）', color: '#F2C200', feeCold: 185, feeRoom: 130, lead: 1.1, ex: 1.6 },
  seven: { id: 'seven', name: '7-ELEVEN 交貨便', short: '7-11 交貨便', en: '7-ELEVEN store pickup', ja: 'セブン-イレブン店舗受取', color: '#EE7623', fee: 60, lead: 2.2, ex: 0.9 },
  fami: { id: 'fami', name: '全家店到店', short: '全家店到店', en: 'FamilyMart store pickup', ja: 'ファミリーマート店舗受取', color: '#1BA2DB', fee: 60, lead: 2.0, ex: 1.1 },
  ems: { id: 'ems', name: 'EMS 國際快捷', short: 'EMS 國際快捷', en: 'EMS Express Mail', ja: 'EMS 国際スピード郵便', color: '#3D6FD8', fee: 520, lead: 3.4, ex: 3.8 },
  pickup: { id: 'pickup', name: '門市自取', short: '門市自取', en: 'in-store pickup', ja: '店頭受取', color: '#DD5597', fee: 0, lead: 0, ex: 0 },
};
export const CARRIER_ORDER = ['tcat', 'seven', 'fami', 'ems'];

// 出貨地（示範商家，虛構地址）
export const ORIGIN = { city: '台北市', lat: 25.033, lon: 121.543, addr: '台北市大安區復興南路一段＊＊號 1 樓' };

export const CITIES = {
  taipei: { name: '台北市', country: 'TW', lat: 25.04, lon: 121.56, dist: ['大安區', '信義區', '中山區', '內湖區', '士林區', '松山區'] },
  newtaipei: { name: '新北市', country: 'TW', lat: 25.01, lon: 121.46, dist: ['板橋區', '新店區', '中和區', '淡水區', '三重區'] },
  taoyuan: { name: '桃園市', country: 'TW', lat: 24.99, lon: 121.31, dist: ['桃園區', '中壢區', '龜山區'] },
  hsinchu: { name: '新竹市', country: 'TW', lat: 24.81, lon: 120.97, dist: ['東區', '北區'] },
  taichung: { name: '台中市', country: 'TW', lat: 24.15, lon: 120.67, dist: ['西屯區', '北屯區', '南屯區', '西區'] },
  tainan: { name: '台南市', country: 'TW', lat: 22.99, lon: 120.21, dist: ['東區', '安平區', '中西區'] },
  kaohsiung: { name: '高雄市', country: 'TW', lat: 22.63, lon: 120.30, dist: ['左營區', '苓雅區', '鼓山區'] },
  tokyo: { name: '東京', country: 'JP', lat: 35.68, lon: 139.69, dist: ['港区', '世田谷区', '渋谷区'], label: '日本・東京' },
  osaka: { name: '大阪', country: 'JP', lat: 34.69, lon: 135.50, dist: ['北区', '天王寺区'], label: '日本・大阪' },
  fukuoka: { name: '福岡', country: 'JP', lat: 33.59, lon: 130.40, dist: ['中央区', '博多区'], label: '日本・福岡' },
  kl: { name: '吉隆坡', country: 'MY', lat: 3.14, lon: 101.69, dist: ['Bukit Bintang', 'Mont Kiara'], label: '馬來西亞・吉隆坡' },
  sg: { name: '新加坡', country: 'SG', lat: 1.35, lon: 103.82, dist: ['Orchard', 'Tampines'], label: '新加坡' },
  hcm: { name: '胡志明市', country: 'VN', lat: 10.82, lon: 106.63, dist: ['Quận 1', 'Quận 3'], label: '越南・胡志明市' },
  hanoi: { name: '河內', country: 'VN', lat: 21.03, lon: 105.85, dist: ['Hoàn Kiếm', 'Ba Đình'], label: '越南・河內' },
};
const DOMESTIC_W = [['taipei', 0.32], ['newtaipei', 0.22], ['taoyuan', 0.12], ['hsinchu', 0.06], ['taichung', 0.13], ['tainan', 0.07], ['kaohsiung', 0.08]];
const LANG_DEST = {
  zh: DOMESTIC_W,
  ja: [['tokyo', 0.42], ['osaka', 0.25], ['fukuoka', 0.16], ['taipei', 0.17]],
  en: [['kl', 0.42], ['sg', 0.2], ['taipei', 0.26], ['newtaipei', 0.12]],
  vi: [['hcm', 0.25], ['hanoi', 0.15], ['taoyuan', 0.35], ['newtaipei', 0.25]],
  ms: [['kl', 0.7], ['taipei', 0.3]],
};
// 線上訂單 region 字串 → 城市
const REGION_KEYS = [
  [/日本|Japan|Jepun|Nhật|国際|東京/i, 'tokyo'], [/新北|New Taipei|Tân Bắc/i, 'newtaipei'], [/台北|臺北|Taipei|Đài Bắc/i, 'taipei'],
  [/桃園|Taoyuan|Đào Viên/i, 'taoyuan'], [/台中|臺中|Taichung|Đài Trung/i, 'taichung'], [/台南|臺南|Tainan|Đài Nam/i, 'tainan'],
  [/高雄|Kaohsiung|Cao Hùng/i, 'kaohsiung'], [/新竹|Hsinchu/i, 'hsinchu'], [/吉隆坡|Kuala Lumpur|KL/i, 'kl'], [/新加坡|Singapore/i, 'sg'],
];

const SEVEN_STORES = ['大安門市', '敦南門市', '板橋站前門市', '中壢新光門市', '西屯福科門市', '安平港門市', '左營高鐵門市', '新竹巨城門市', '內湖瑞光門市'];
const FAMI_STORES = ['大安和平店', '信義松仁店', '新店北新店', '桃園中正店', '台中文心店', '台南成大店', '高雄美術館店', '淡水英專店'];

function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function pick(rng, list) { const tot = list.reduce((s, x) => s + x[1], 0); let r = rng() * tot; for (const x of list) { r -= x[1]; if (r <= 0) return x[0]; } return list[list.length - 1][0]; }
const H = 3600e3;

export function isFridge(order) { return order.items.some(it => PRODUCT_MAP[it.pid]?.storage === 'fridge'); }

export function trackingNo(carrier, rng) {
  const d = (n) => Array.from({ length: n }, () => Math.floor(rng() * 10)).join('');
  if (carrier === 'tcat') return `${d(4)}-${d(4)}-${d(4)}`;
  if (carrier === 'seven') return `T${d(3)}${d(4)}${d(4)}`;
  if (carrier === 'fami') return `F${d(11)}`;
  if (carrier === 'ems') { const n = d(8); const w = [8, 6, 4, 2, 3, 5, 9, 7]; let s = 0; for (let i = 0; i < 8; i++) s += +n[i] * w[i]; let c = 11 - (s % 11); if (c === 10) c = 0; if (c === 11) c = 5; return `EE${n}${c}TW`; }
  return `PU-${d(6)}`;
}

// 工作時間（09:00–20:00）內才揀貨出貨
function nextWork(t, rng) {
  const d = new Date(t);
  if (d.getHours() < 9) { d.setHours(9, Math.floor(rng() * 50), 0, 0); return +d; }
  if (d.getHours() >= 20) { const n = addDays(startOfDay(d), 1); n.setHours(9, Math.floor(rng() * 50)); return +n; }
  return t;
}

// 由訂單建立一張出貨卡（固定種子：以訂單編號雜湊）
export function buildShipment(order, now = Date.now()) {
  const rng = mulberry32(hash(order.id));
  const fridge = isFridge(order);
  let cityId = null, carrier;
  if (order.source === 'live' && order.region) { for (const [re, id] of REGION_KEYS) if (re.test(order.region)) { cityId = id; break; } }
  if (order.pickup) { cityId = 'taipei'; carrier = 'pickup'; }
  if (!cityId) cityId = order.source === 'live' && !order.region ? 'taipei' : pick(rng, LANG_DEST[order.lang] || DOMESTIC_W);
  const city = CITIES[cityId];
  const intl = city.country !== 'TW';
  if (!carrier) {
    if (intl) carrier = 'ems';
    else if (fridge) carrier = 'tcat';
    else { const r = rng(); carrier = r < 0.4 ? 'seven' : r < 0.75 ? 'fami' : 'tcat'; }
  }
  const district = city.dist[Math.floor(rng() * city.dist.length)];
  const store = carrier === 'seven' ? SEVEN_STORES[Math.floor(rng() * SEVEN_STORES.length)] : carrier === 'fami' ? FAMI_STORES[Math.floor(rng() * FAMI_STORES.length)] : '';
  // 時間軸
  const pack = nextWork(order.ts + (0.6 + rng() * 2.2) * H, rng);
  const ship = pack + (0.8 + rng() * 2.4) * H;
  const hub = ship + (2 + rng() * 3.5) * H;
  // 配送中＝離開轉運中心後的運輸／派送；國內隔日送達，跨境 2–3 天
  // 宅配：隔天早上司機出車才算「配送中」；超商與跨境：離開轉運中心即在途
  let out = hub + (1 + rng() * 3) * H;
  if (carrier === 'tcat') { const n = addDays(startOfDay(ship), 1); n.setHours(7, 30, 0, 0); out = Math.max(out, +n + rng() * 1.2 * H); }
  const nextDay = (h0, span) => { const n = addDays(startOfDay(ship), 1); n.setHours(h0, 0, 0, 0); return Math.max(out + 2 * H, +n + rng() * span * H); };
  let done;
  if (intl) done = out + (40 + rng() * 26) * H;
  else if (carrier === 'seven' || carrier === 'fami') done = nextDay(11, 7);
  else done = nextDay(9, 9);
  if (carrier === 'pickup') done = ship + (2 + rng() * 20) * H;
  const times = { order: order.ts, pack, ship, hub, out, done };
  const stage = now < pack ? 0 : now < ship ? 1 : now < out ? 2 : now < done ? 3 : 4;
  const fee = carrier === 'tcat' ? (fridge ? CARRIERS.tcat.feeCold : CARRIERS.tcat.feeRoom) : carrier === 'ems' ? (city.country === 'JP' ? 520 : 480) : CARRIERS[carrier].fee;
  const phone = `09${Math.floor(rng() * 90 + 10)}-${String(Math.floor(rng() * 1000)).padStart(3, '0')}-${String(Math.floor(rng() * 1000)).padStart(3, '0')}`;
  const sh = {
    id: order.id, order, customer: order.customer, lang: order.lang || 'zh', channel: order.channel,
    fridge, temp: fridge ? '冷藏' : '常溫', carrier, cityId, city, district, intl, store, fee, phone,
    times, stage, tracking: stage >= 2 ? trackingNo(carrier, rng) : null,
    pending: order.status === 'pending', live: order.source === 'live',
    weight: +(order.items.reduce((s, it) => s + it.qty * (PRODUCT_MAP[it.pid].storage === 'fridge' ? 0.7 : 0.5), 0) + 0.4).toFixed(1),
  };
  sh.rng = rng;
  return sh;
}

// 手動推進到某階段：把該階段之前的時間點設為「已發生」，之後重新估算
export function setStage(sh, s, now = Date.now()) {
  const keys = ['pack', 'ship', 'out', 'done'];
  const dur = { pack: 1.2 * H, ship: 1.5 * H, out: sh.intl ? 30 * H : 14 * H, done: sh.intl ? 6 * H : 4 * H };
  const t = sh.times;
  sh.stage = s;
  let prev = t.order;
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (i < s) {
      if (t[k] > now) t[k] = now - (s - 1 - i) * 4 * 6e4;
      if (t[k] <= prev) t[k] = prev + 6e4;
    } else if (t[k] <= Math.max(now, prev)) t[k] = Math.max(now, prev) + dur[k];
    prev = t[k];
  }
  if (t.hub <= t.ship || t.hub >= t.out) t.hub = t.ship + (t.out - t.ship) * 0.3;
  if (s >= 2 && !sh.tracking) sh.tracking = trackingNo(sh.carrier, sh.rng);
}

// 姓名遮罩：王小明 → 王＊明；林小姐 → 林＊姐；Daniel Tan → D＊＊＊＊ Tan
export function maskName(n) {
  n = String(n || '').trim();
  if (/^[㐀-鿿぀-ヿ]/.test(n)) {
    const s = n.replace(/\s+/g, '');
    if (s.length <= 1) return s;
    if (s.length === 2) return s[0] + '＊';
    return s[0] + '＊'.repeat(s.length - 2) + s[s.length - 1];
  }
  const parts = n.split(/\s+/);
  return parts.map((p, i) => i === 0 ? p[0] + '＊'.repeat(Math.max(1, Math.min(4, p.length - 1))) : p).join(' ');
}
export function maskPhone(p) { return p.replace(/^(\d{4})-\d{3}-(\d{3})$/, '$1-＊＊＊-$2'); }

const pad = (n) => String(n).padStart(2, '0');
const md = (t) => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()}`; };
const hm = (t) => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

export function destLabel(sh) {
  if (sh.carrier === 'pickup') return '門市自取・大安店';
  if (sh.intl) return sh.city.label;
  return `${sh.city.name}${sh.district}`;
}

// AI 多語出貨通知
export function shipMessage(sh) {
  const lang = sh.lang;
  const items = sh.order.items.map(it => `${pName(lang, it.pid)}×${it.qty}`).join(lang === 'zh' ? '、' : lang === 'ja' ? '、' : ', ');
  const c = CARRIERS[sh.carrier];
  const trk = sh.tracking || '（產生中）';
  const date = `${md(sh.times.ship)} ${hm(sh.times.ship)}`;
  const eta = md(sh.times.done);
  const storeTxt = sh.store ? `${c.short}「${sh.store}」` : '';
  if (lang === 'ja') {
    return { lang: '日本語', text: `${sh.customer} 様\nご注文の${items}を${date}に発送いたしました（${c.ja}・追跡番号 ${trk}）。お届け予定は${eta}です。${sh.fridge ? '到着後はすぐに冷蔵庫で保管してください。' : 'ご利用ありがとうございます。'}\n— 阿美手作甜點`,
      zh: `${sh.customer} 您好，您訂購的商品已於 ${date} 寄出（${c.short}，貨號 ${trk}），預計 ${eta} 送達。` };
  }
  if (lang === 'en' || lang === 'ms') {
    if (lang === 'ms') return { lang: 'Bahasa Melayu', text: `Hai ${sh.customer}! Pesanan anda (${items}) telah dihantar pada ${date} melalui ${c.en}. No. penjejakan: ${trk}. Anggaran tiba: ${eta}.${sh.fridge ? ' Sila simpan dalam peti sejuk sebaik tiba.' : ''}\n— A-Mei Handmade Desserts`, zh: `已通知客人商品於 ${date} 寄出，貨號 ${trk}，預計 ${eta} 送達。` };
    return { lang: 'English', text: `Hi ${sh.customer}! Your order (${items}) shipped on ${date} via ${c.en}${sh.store ? ` to ${sh.store}` : ''}. Tracking no. ${trk}, estimated arrival ${eta}.${sh.fridge ? ' Please refrigerate as soon as it arrives.' : ' Thank you for your order!'}\n— A-Mei Handmade Desserts`,
      zh: `${sh.customer} 您好，您的訂單已於 ${date} 寄出（${c.short}，貨號 ${trk}），預計 ${eta} 送達。` };
  }
  if (lang === 'vi') {
    return { lang: 'Tiếng Việt', text: `Chào ${sh.customer}! Đơn hàng (${items}) đã được gửi lúc ${date} qua ${c.en}. Mã vận đơn: ${trk}. Dự kiến nhận hàng: ${eta}.${sh.fridge ? ' Vui lòng bảo quản lạnh ngay khi nhận.' : ' Cảm ơn bạn đã ủng hộ!'}\n— A-Mei Handmade Desserts`,
      zh: `${sh.customer} 您好，您的訂單已於 ${date} 寄出（貨號 ${trk}），預計 ${eta} 送達。` };
  }
  const body = sh.carrier === 'pickup'
    ? `${sh.customer}您好～您訂購的${items}已包裝完成，可於營業時間到大安店取貨，取貨時請出示訂單末四碼 ${sh.id.slice(-4)}。`
    : `${sh.customer}您好～您訂購的${items}已於 ${date} 交寄${storeTxt || c.short}${sh.fridge ? '（冷藏）' : ''}，貨號 ${trk}，預計 ${eta} ${sh.store ? '到店，取貨請出示手機末三碼' : '送達'}。${sh.fridge ? '收到後請立即冷藏，風味最佳喔！' : '謝謝您的支持！'}`;
  return { lang: '中文', text: `${body}\n— 阿美手作甜點`, zh: null };
}

// 物流商比較（近 30 天）：由訂單推算件數與運費
export function carrierStats(shipments) {
  const out = {};
  for (const id of CARRIER_ORDER) out[id] = { id, n: 0, fee: 0, lead: CARRIERS[id].lead, ex: CARRIERS[id].ex, cold: 0 };
  for (const s of shipments) { const o = out[s.carrier]; if (!o) continue; o.n++; o.fee += s.fee; if (s.fridge) o.cold++; }
  return CARRIER_ORDER.map(id => out[id]);
}

// 簡化海岸線（lat, lon）— 僅供視覺示意
export const COASTS = [
  // 台灣
  [[25.3, 121.5], [25.0, 121.95], [24.4, 121.8], [23.5, 121.5], [22.8, 121.2], [21.9, 120.85], [22.5, 120.4], [23.1, 120.1], [23.8, 120.2], [24.5, 120.7], [25.1, 121.15], [25.3, 121.5]],
  // 九州
  [[33.9, 130.9], [33.5, 129.9], [32.8, 129.7], [31.4, 130.2], [31.0, 130.9], [31.6, 131.4], [32.5, 131.7], [33.6, 131.6], [33.9, 130.9]],
  // 四國
  [[34.2, 132.9], [33.4, 132.4], [32.8, 133.0], [33.4, 134.2], [34.2, 134.6], [34.3, 133.6], [34.2, 132.9]],
  // 本州
  [[34.0, 131.0], [34.7, 131.9], [35.5, 133.2], [35.6, 135.2], [36.8, 136.8], [37.5, 137.3], [37.8, 138.7], [39.5, 140.0], [41.2, 140.3], [41.4, 141.4], [40.2, 141.9], [38.3, 141.5], [37.0, 140.9], [35.7, 140.8], [35.0, 139.8], [34.6, 138.3], [34.6, 137.0], [33.5, 135.8], [34.3, 134.9], [34.0, 132.5], [34.0, 131.0]],
  // 北海道
  [[41.5, 140.0], [42.6, 139.8], [43.3, 141.3], [45.4, 141.8], [44.3, 143.5], [43.3, 145.6], [42.0, 143.3], [42.5, 141.0], [41.8, 141.0], [41.5, 140.0]],
  // 朝鮮半島
  [[39.8, 124.3], [38.7, 125.2], [37.7, 126.6], [36.0, 126.5], [34.6, 126.4], [34.6, 127.6], [35.2, 129.2], [36.5, 129.4], [37.6, 129.1], [38.6, 128.3], [40.0, 128.0], [41.0, 129.7], [42.4, 130.6]],
  // 中國沿海 → 中南半島 → 馬來半島
  [[41.0, 121.0], [39.8, 121.5], [38.9, 121.2], [39.2, 119.2], [38.3, 117.8], [37.4, 119.2], [37.6, 120.8], [36.9, 122.5], [36.0, 120.3], [35.0, 119.5], [33.6, 120.4], [31.8, 121.8], [30.4, 122.0], [28.0, 121.2], [26.0, 119.6], [24.5, 118.2], [23.0, 116.5], [22.4, 114.2], [21.8, 112.4], [21.4, 110.0], [20.2, 110.4], [21.0, 109.6], [21.6, 108.0], [20.3, 106.6], [18.6, 105.8], [17.0, 107.1], [15.8, 108.4], [13.0, 109.3], [11.2, 108.8], [10.4, 107.2], [9.1, 105.6], [8.6, 104.8], [10.4, 104.5], [11.6, 103.0], [12.6, 101.6], [13.5, 100.9], [12.7, 100.0], [10.6, 99.3], [8.3, 100.3], [6.6, 101.3], [5.4, 103.2], [4.0, 103.4], [2.6, 103.9], [1.4, 104.2], [1.3, 103.5], [2.0, 102.6], [3.0, 101.3], [4.2, 100.6], [6.4, 100.1], [8.0, 98.3], [10.0, 98.5], [13.0, 98.6], [15.5, 97.6], [16.6, 97.4], [16.4, 94.4], [18.5, 94.2], [20.7, 92.4]],
  // 海南
  [[20.0, 110.2], [19.6, 111.0], [18.5, 110.4], [18.2, 109.5], [19.2, 108.6], [20.0, 109.6], [20.0, 110.2]],
  // 呂宋
  [[18.5, 120.6], [18.4, 122.2], [16.2, 122.0], [14.1, 124.0], [13.1, 123.7], [13.8, 122.0], [14.5, 120.6], [16.3, 120.3], [17.6, 120.4], [18.5, 120.6]],
  // 菲律賓南部（民答那峨）
  [[9.8, 125.5], [8.6, 126.4], [6.3, 126.2], [5.9, 125.2], [6.9, 124.0], [7.6, 122.1], [8.5, 123.6], [9.0, 124.9], [9.8, 125.5]],
  // 婆羅洲
  [[7.0, 116.8], [5.9, 118.2], [4.4, 118.6], [1.0, 118.8], [-1.5, 116.6], [-3.6, 116.0], [-3.2, 111.0], [-1.0, 109.6], [1.6, 109.3], [2.9, 111.3], [4.6, 114.0], [6.0, 116.0], [7.0, 116.8]],
  // 蘇門答臘
  [[5.6, 95.3], [4.0, 98.0], [2.0, 100.6], [0.5, 103.4], [-1.6, 104.6], [-3.6, 106.0], [-5.8, 105.8], [-5.0, 104.0], [-2.6, 101.2], [0.2, 99.2], [2.4, 97.4], [4.3, 95.8], [5.6, 95.3]],
  // 爪哇
  [[-6.0, 106.0], [-6.2, 108.3], [-6.9, 110.4], [-6.9, 112.6], [-7.7, 114.5], [-8.6, 114.4], [-8.2, 111.0], [-7.7, 108.6], [-7.0, 106.4], [-6.0, 106.0]],
];
