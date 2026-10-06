// 資料搬家：CSV 解析、示範檔產生、AI 欄位對應、資料清理（純前端，所有示範資料皆為虛構）
import { mulberry32, PRODUCTS, startOfDay, addDays } from './data.js';
import { TENANT, TENANT_ID } from './tenant.js';
import { STAFF } from './ledger.js';

// 多業主：阿美維持原示範檔；其他業主用自己的商品與負責人名
export const AMEI = TENANT_ID === 'amei';
export const OWNER_NAME = AMEI ? '阿美' : ((STAFF[0] && STAFF[0].name) || TENANT.owner || '老闆');
const PN = (i) => (PRODUCTS.length ? PRODUCTS[i % PRODUCTS.length].name : '商品');

// ---------------------------------------------------------------- CSV 解析
// 支援：UTF-8 BOM、雙引號包住的欄位、欄位內逗號與換行、"" 跳脫、CRLF、自動判斷分隔符（, Tab ;）
export function parseCSV(text) {
  let bom = false;
  if (text.charCodeAt(0) === 0xFEFF) { text = text.slice(1); bom = true; }
  const firstLine = text.split(/\r?\n/, 1)[0] || '';
  const count = (ch) => { let n = 0, q = false; for (const c of firstLine) { if (c === '"') q = !q; else if (c === ch && !q) n++; } return n; };
  const cand = [[',', count(',')], ['\t', count('\t')], [';', count(';')]].sort((a, b) => b[1] - a[1]);
  const delim = cand[0][1] > 0 ? cand[0][0] : ',';
  const rows = []; let row = []; let f = ''; let q = false; let quotedCells = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
      else f += c;
    } else if (c === '"' && f === '') { q = true; quotedCells++; }
    else if (c === delim) { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(f); f = ''; rows.push(row); row = [];
    } else f += c;
  }
  if (f !== '' || row.length) { row.push(f); rows.push(row); }
  const clean = rows.filter(r => r.some(v => v.trim() !== ''));
  const headers = (clean.shift() || []).map((h, i) => h.trim() || `欄位 ${i + 1}`);
  const data = clean.map(r => headers.map((_, i) => (r[i] ?? '').trim()));
  return { headers, rows: data, bom, delim, quotedCells };
}

// 讀檔：先試 UTF-8，若出現亂碼（�）改用 Big5（台灣舊版 Excel 常見）
export function decodeBuffer(buf) {
  const u8 = new Uint8Array(buf);
  const bom = u8[0] === 0xEF && u8[1] === 0xBB && u8[2] === 0xBF;
  let text = new TextDecoder('utf-8').decode(u8);
  let enc = 'UTF-8';
  if (text.includes('�')) {
    try { const t2 = new TextDecoder('big5').decode(u8); if (!t2.includes('�')) { text = t2; enc = 'Big5'; } } catch { /* ignore */ }
  }
  return { text, enc, bom };
}

export function toCSV(headers, rows, bom = true) {
  const q = (v) => { v = String(v ?? ''); return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; };
  return (bom ? '﻿' : '') + [headers, ...rows].map(r => r.map(q).join(',')).join('\r\n');
}

// ---------------------------------------------------------------- 示範檔
const SUR = ['林', '陳', '王', '張', '李', '黃', '吳', '劉', '蔡', '楊', '許', '鄭', '謝', '郭', '洪', '曾', '邱', '廖', '賴', '周'];
const GIV = ['佳蓉', '小美', '志明', '怡君', '雅婷', '冠宇', '淑芬', '家豪', '詩涵', '俊傑', '宜蓁', '承恩', '筱涵', '建宏', '珮瑜', '柏翰', '欣怡', '宗翰', '美玲', '育成', '思妤', '品妍', '振宇', '惠如', '子晴', '彥廷', '玉珍', '書豪', '心怡', '凱文'];
const ROADS = [['台北市', '大安區', '復興南路一段'], ['台北市', '信義區', '松仁路'], ['新北市', '板橋區', '文化路二段'], ['新北市', '永和區', '中正路'], ['桃園市', '中壢區', '中山東路三段'], ['台中市', '西屯區', '河南路二段'], ['台中市', '南屯區', '公益路二段'], ['台南市', '東區', '崇學路'], ['高雄市', '左營區', '博愛二路'], ['新竹市', '東區', '光復路二段'], ['台北市', '中山區', '南京東路三段'], ['宜蘭縣', '羅東鎮', '興東路']];
const LINE_IDS = AMEI ? ['amy_lin', 'jiarong.0501', 'mei~sweet', 'kevin_chen', 'yating88', 'shuhan_w', 'alice.tw', 'dessert_lover', 'momo_huang', 'peggy.liu', 'jjwu', 'cindy0312']
  : ['amy_lin', 'jiarong.0501', 'mei~shop', 'kevin_chen', 'yating88', 'shuhan_w', 'alice.tw', 'shop_lover', 'momo_huang', 'peggy.liu', 'jjwu', 'cindy0312'];
const NOTES = AMEI ? ['常買檸檬塔', '對"堅果"過敏', '公司下午茶，要統編', '生日蛋糕回頭客', '偏好少糖', '團購主揪', '', '', '', '喜歡"芋泥"系列', '週末自取', '']
  : [`常買${PN(0)}`, '要開"統編"', '公司團購，要統編', '老客人介紹', '喜歡簡單包裝', '團購主揪', '', '', '', `喜歡"${PN(1)}"`, '週末自取', ''];

function phoneDigits(rng) { return '09' + String(Math.floor(rng() * 90) + 10) + String(Math.floor(rng() * 900000) + 100000); }
function fmtPhoneStyle(d, s) {
  const a = d.slice(0, 4), b = d.slice(4, 7), c = d.slice(7);
  return [`${a}-${b}-${c}`, d, `${a} ${b} ${c}`, `+886 ${d.slice(1, 4)} ${b} ${c}`, `(${d.slice(0, 2)})${d.slice(2, 4)}-${b}${c}`][s];
}
const p2 = (n) => String(n).padStart(2, '0');
function fmtDateStyle(y, m, d, s) {
  return [`${y - 1911}/${p2(m)}/${p2(d)}`, `${y}-${m}-${d}`, `${m}月${d}日`, `${y}/${p2(m)}/${p2(d)}`][s];
}

export function demoCustomers(variant = 'excel') {
  const rng = mulberry32(51208);
  const people = [];
  for (let i = 0; i < 30; i++) {
    const name = SUR[Math.floor(rng() * SUR.length)] + GIV[i % GIV.length];
    const r = ROADS[Math.floor(rng() * ROADS.length)];
    const no = Math.floor(rng() * 380) + 2;
    const floor = rng() < 0.35 ? `, ${Math.floor(rng() * 12) + 2}樓` : '';
    const by = 1968 + Math.floor(rng() * 34), bm = 1 + Math.floor(rng() * 12), bd = 1 + Math.floor(rng() * 28);
    people.push({ name, phone: phoneDigits(rng), line: rng() < 0.7 ? LINE_IDS[Math.floor(rng() * LINE_IDS.length)] + (i > 11 ? i : '') : '',
      bday: rng() < 0.85 ? fmtDateStyle(by, bm, bd, Math.floor(rng() * 4)) : '', addr: `${r[0]}${r[1]}${r[2]}${no}號${floor}`, note: NOTES[Math.floor(rng() * NOTES.length)] });
  }
  const rows = people.map((p) => ({ ...p, phoneOut: fmtPhoneStyle(p.phone, Math.floor(rng() * 5)) }));
  // 同電話、不同名字寫法（重複客人）
  const dupWays = [(n) => `${n[0]} ${n.slice(1)}`, (n) => `${n}（老客人）`, (n) => n.slice(1), (n) => `${n}(公司)`, (n) => `${n[0]}　${n.slice(1)}`, (n) => `${n}（LINE）`];
  [3, 7, 12, 18, 22, 26].forEach((idx, k) => {
    const p = people[idx];
    rows.splice(idx + 1 + k, 0, { ...p, name: dupWays[k](p.name), phoneOut: fmtPhoneStyle(p.phone, (k + 2) % 5), line: k % 2 ? p.line : '', note: k % 2 ? '' : 'LINE 記事本補登' });
  });
  // 需人工確認：電話少碼、缺姓名
  rows[35].phoneOut = '0912-34-56';
  rows.splice(20, 0, { name: '', phoneOut: '0935-221-087', line: 'sweet_tooth', bday: '', addr: '台中市北區英才路 532 號', note: '只留電話，名字待問' });
  const H = variant === 'gsheet'
    ? ['時間戳記', '您的大名', '手機號碼', 'LINE ID', '生日', '寄送地址', `想對${OWNER_NAME}說的話`]
    : ['客戶姓名', '手機', 'LINE名稱', '生日', '地址', '備註'];
  const now = new Date();
  const data = rows.map((r, i) => {
    const base = [r.name, r.phoneOut, r.line, r.bday, r.addr, r.note];
    if (variant === 'gsheet') { const t = addDays(now, -(rows.length - i) * 3); return [`${t.getFullYear()}/${t.getMonth() + 1}/${t.getDate()} 下午 ${1 + (i % 9)}:${p2((i * 17) % 60)}:00`, ...base]; }
    return base;
  });
  return { name: variant === 'gsheet' ? 'Google 表單回覆（客戶資料）' : '客戶名單.csv', csv: toCSV(H, data) };
}

const AMEI_EXTRA = [['抹茶費南雪', '6 入', 360, 120], ['蜂蜜瑪德蓮', '8 入', 320, 105], ['巧克力布朗尼', '4 入', 380, 140], ['焦糖布丁', '4 入', 300, 95], ['原味司康', '4 入', 260, 80], ['蔓越莓司康', '4 入', 280, 90],
  ['生巧克力', '16 粒', 450, 170], ['檸檬糖霜蛋糕', '1 條', 380, 130], ['肉桂捲', '4 入', 340, 115], ['法式鹹派', '6 吋', 520, 210], ['提拉米蘇杯', '4 杯', 420, 160], ['千層蛋糕', '6 吋', 880, 360],
  ['蛋黃酥禮盒', '6 入', 450, 180], ['中秋綜合禮盒', '1 盒', 1280, 520], ['彌月蛋糕禮盒', '10 入', 1180, 470], ['客製生日蛋糕', '6 吋', 1450, 560], ['布丁塔', '6 入', 330, 110]];
// 其他業主：由自家商品延伸出舊系統裡的組合、限定款與舊品項
const r10 = (v) => Math.round(v / 10) * 10;
const EXTRA_PRODUCTS = AMEI ? AMEI_EXTRA : PRODUCTS.flatMap(p => [
  [`${p.name} 兩入組`, '1 組', r10(p.price * 1.9), r10(p.cost * 2)],
  [`${p.name}（季節限定）`, p.unit, r10(p.price * 1.15), r10(p.cost * 1.2)],
  [`${p.name}（舊款）`, p.unit, r10(p.price * 0.9), r10(p.cost)],
]).slice(0, 17);
export function demoProducts() {
  const rng = mulberry32(7702);
  const list = [...PRODUCTS.map(p => [p.name, p.unit, p.price, p.cost, p.stock]), ...EXTRA_PRODUCTS.map(p => [...p, Math.floor(rng() * 40) + 3])];
  const cat = AMEI ? (n) => /禮盒/.test(n) ? '禮盒' : /蛋糕|巴斯克|捲|千層/.test(n) ? '蛋糕' : /司康|費南雪|瑪德蓮|可麗露|餅乾|酥/.test(n) ? '烘焙點心' : '冷藏甜點'
    : (n) => /兩入組/.test(n) ? '組合' : /限定/.test(n) ? '季節限定' : /舊款/.test(n) ? '舊品項' : (TENANT.typeName || '商品');
  const money = (v, s) => [String(v), `${v.toLocaleString('en-US')}元`, `NT$${v.toLocaleString('en-US')}`, `$${v}`][s];
  const data = list.map(([n, u, price, cost, stock], i) => [n, u, money(price, Math.floor(rng() * 4)), i === 15 ? '待補' : money(cost, Math.floor(rng() * 3)), String(stock), cat(n)]);
  return { name: '商品清單.csv', csv: toCSV(['品名', '規格', '售價', '進貨成本', '庫存量', '分類'], data) };
}

const BUYERS = ['王小美', '林佳蓉', '陳志明', '張雅婷', '黃淑芬', '李冠宇', '吳詩涵', '蔡俊傑', '劉宜蓁', '許承恩', '鄭珮瑜', '郭欣怡', '洪子晴', '曾彥廷'];
const NAME_VAR = [(n) => n, (n) => `${n[0]} ${n.slice(1)}`, (n) => `${n}小姐`];
export function demoOrders(variant = 'excel') {
  const rng = mulberry32(variant === 'paper' ? 3311 : 90417);
  const today = startOfDay(new Date());
  const N = variant === 'paper' ? 22 : 48;
  const chs = variant === 'shopee' ? [['蝦皮購物', 1]] : [['蝦皮', 0.3], ['LINE', 0.28], ['門市', 0.18], ['官網', 0.12], ['Pinkoi', 0.07], ['電話', 0.05]];
  const pick = (l) => { let r = rng() * l.reduce((s, x) => s + x[1], 0); for (const x of l) { r -= x[1]; if (r <= 0) return x[0]; } return l[0][0]; };
  const rows = [];
  for (let i = 0; i < N; i++) {
    const d = addDays(today, -Math.floor((N - i) * (88 / N)) - Math.floor(rng() * 2));
    const p = PRODUCTS[Math.floor(rng() * PRODUCTS.length)];
    const qty = 1 + Math.floor(rng() * (rng() < 0.2 ? 6 : 3));
    const amt = p.price * qty;
    const b = BUYERS[Math.floor(rng() * BUYERS.length)];
    const nameV = rng() < 0.22 ? NAME_VAR[1 + Math.floor(rng() * 2)](b) : b;
    const ds = variant === 'paper' ? (rng() < 0.6 ? 0 : 2) : variant === 'shopee' ? 3 : Math.floor(rng() * 4);
    const ms = variant === 'paper' ? 1 : variant === 'shopee' ? 0 : Math.floor(rng() * 4);
    const amtS = [String(amt), `${amt.toLocaleString('en-US')}元`, `NT$${amt.toLocaleString('en-US')}`, amt.toLocaleString('en-US')][ms];
    rows.push({ date: fmtDateStyle(d.getFullYear(), d.getMonth() + 1, d.getDate(), ds), buyer: nameV, item: p.name, qty: String(qty), amt: amtS, ch: pick(chs), id: `${variant === 'shopee' ? '2' : 'A'}${p2(d.getMonth() + 1)}${p2(d.getDate())}${String(100 + i)}`, pay: ['LINE Pay', '轉帳', '現金', '信用卡'][Math.floor(rng() * 4)] });
  }
  rows[N - 6].amt = '待確認';
  rows[Math.floor(N / 2)].date = '中秋前';
  if (variant === 'shopee') {
    const H = ['訂單編號', '訂單成立日期', '買家帳號', '商品名稱', '數量', '買家總支付金額', '平台'];
    return { name: '蝦皮訂單匯出.csv', csv: toCSV(H, rows.map(r => [r.id, r.date, r.buyer, r.item, r.qty, r.amt, r.ch])) };
  }
  if (variant === 'paper') {
    const H = ['日期', '客人', '買了什麼', '幾個', '收多少'];
    return { name: '手寫帳本（拍照辨識）', csv: toCSV(H, rows.map(r => [r.date, r.buyer, r.item, r.qty, r.amt])) };
  }
  if (variant === 'pos') {
    const H = ['交易日期', '客戶', '品名', '數量', '小計', '銷售管道', '付款方式'];
    return { name: '舊收銀記帳匯出.csv', csv: toCSV(H, rows.map(r => [r.date, r.buyer, r.item, r.qty, r.amt, r.ch, r.pay])) };
  }
  const H = ['訂單日期', '買家', '商品', '數量', '訂單金額', '通路', '付款方式'];
  return { name: '過去3個月訂單.csv', csv: toCSV(H, rows.map(r => [r.date, r.buyer, r.item, r.qty, r.amt, r.ch, r.pay])) };
}

const AMEI_LINE_TEXT = `【阿美的客人筆記】（LINE 記事本）
王小美 0912-345-678 生日 5/3 住台北市大安區復興南路一段 100 號 愛吃芋泥
林佳蓉小姐 0922 118 406 LINE: jiarong.0501 生日79/08/12
陳志明 +886 935 667 102 公司在新北市板橋區文化路二段 88 號，要統編
張雅婷 0988123456 生日 1992-11-2 少糖
王 小美 0912345678 改寄高雄市左營區博愛二路 66 號
吳詩涵 0933-552-901 LINE: shuhan_w 對堅果過敏
黃淑芬 0910 727 334 生日 3月21日 台中市西屯區河南路二段 260 號
劉宜蓁（團購主揪） 0921-660-115 LINE: peggy.liu`;

export const DEMO_LINE_TEXT = AMEI ? AMEI_LINE_TEXT : `【${OWNER_NAME}的客人筆記】（LINE 記事本）
王小美 0912-345-678 生日 5/3 住台北市大安區復興南路一段 100 號 常買${PN(0)}
林佳蓉小姐 0922 118 406 LINE: jiarong.0501 生日79/08/12
陳志明 +886 935 667 102 公司在新北市板橋區文化路二段 88 號，要統編
張雅婷 0988123456 生日 1992-11-2 喜歡簡單包裝
王 小美 0912345678 改寄高雄市左營區博愛二路 66 號
吳詩涵 0933-552-901 LINE: shuhan_w 想訂${PN(1)}
黃淑芬 0910 727 334 生日 3月21日 台中市西屯區河南路二段 260 號
劉宜蓁（團購主揪） 0921-660-115 LINE: peggy.liu`;

// 解析 LINE 記事本／聊天文字：每行抓姓名、電話、LINE、生日、地址
export function parseLineText(text) {
  const out = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || /^【.*】/.test(line)) continue;
    const ph = line.match(/(\+886[\s-]?9\d{2}[\s-]?\d{3}[\s-]?\d{3}|09\d{2}[\s-]?\d{3}[\s-]?\d{3})/);
    const lineId = (line.match(/LINE\s*[:：]\s*([\w.~@-]+)/i) || [])[1] || '';
    const bd = (line.match(/生日\s*(\d{1,2}月\d{1,2}日|[\d/.-]+)/) || [])[1] || '';
    const addr = (line.match(/((?:台北|新北|桃園|台中|台南|高雄|新竹|基隆|嘉義)市[^，,\n]*?\d+\s*號)/) || [])[1] || '';
    const name = ph ? line.slice(0, ph.index).trim() : line.split(/\s+/)[0];
    const rest = line.replace(ph?.[0] || '', '').replace(name, '').replace(/LINE\s*[:：]\s*[\w.~@-]+/i, '').replace(/生日\s*(\d{1,2}月\d{1,2}日|[\d/.-]+)/, '').replace(addr, '').replace(/(^|\s)(住|公司在|改寄)(?=[\s，,]|$)/g, ' ').replace(/^[\s，,]+|[\s，,]+$/g, '').replace(/\s{2,}/g, ' ');
    out.push([name, ph ? ph[0] : '', lineId, bd, addr, rest]);
  }
  return { name: 'LINE 記事本（AI 解析）', csv: toCSV(['姓名', '電話', 'LINE', '生日', '地址', '原始備註'], out) };
}

// ---------------------------------------------------------------- AI 欄位對應
export const TYPES = {
  customer: { label: '客戶名單', icon: 'users', dest: 'crm', targets: [
    { k: 'name', label: '姓名', req: true, kind: 'name', syn: ['姓名', '客戶姓名', '名字', '客人', '顧客', '會員姓名', '客戶名稱', '會員名稱', '會員', '您的大名', '大名', '稱呼', 'name', '聯絡人'] },
    { k: 'phone', label: '電話', req: true, kind: 'phone', syn: ['電話', '手機', '手機號碼', '行動電話', '聯絡電話', 'phone', 'mobile', 'tel', '電話號碼'] },
    { k: 'line', label: 'LINE', kind: 'text', syn: ['line', 'lineid', 'line名稱', 'line暱稱', 'line帳號', '賴'] },
    { k: 'birthday', label: '生日', kind: 'date', syn: ['生日', '出生日期', '出生年月日', 'birthday', 'birth', '生日日期'] },
    { k: 'address', label: '地址', kind: 'addr', syn: ['地址', '住址', '收件地址', '寄送地址', '送貨地址', '通訊地址', 'address'] },
  ] },
  product: { label: '商品清單', icon: 'box', dest: 'listing', targets: [
    { k: 'name', label: '名稱', req: true, kind: 'text', syn: ['名稱', '品名', '商品名稱', '商品', '產品', '產品名稱', '品項', 'product', 'item', '商品名'] },
    { k: 'price', label: '售價', req: true, kind: 'money', syn: ['售價', '價格', '單價', '定價', '賣價', 'price', '售價元'] },
    { k: 'cost', label: '成本', kind: 'money', syn: ['成本', '進價', '成本價', '進貨成本', '進貨價', 'cost'] },
    { k: 'stock', label: '庫存', kind: 'int', syn: ['庫存', '庫存量', '存貨', '現有數量', '在庫', 'stock', '庫存數'] },
  ] },
  order: { label: '訂單紀錄', icon: 'receipt', dest: 'books', targets: [
    { k: 'date', label: '日期', req: true, kind: 'date', syn: ['日期', '訂單日期', '交易日期', '下單日', '下單日期', '訂單成立日期', '成立日期', 'date'] },
    { k: 'customer', label: '客人', kind: 'name', syn: ['客人', '買家', '客戶', '顧客', '訂購人', '買家帳號', '會員', '姓名'] },
    { k: 'item', label: '品項', req: true, kind: 'text', syn: ['品項', '商品', '商品名稱', '品名', '內容', '買了什麼', '購買品項', 'item'] },
    { k: 'qty', label: '數量', kind: 'int', syn: ['數量', '件數', '幾個', 'qty', '購買數量'] },
    { k: 'amount', label: '金額', req: true, kind: 'money', syn: ['金額', '訂單金額', '小計', '總價', '合計', '總金額', '買家總支付金額', '實收', '收多少', '收款金額'] },
    { k: 'channel', label: '通路', kind: 'text', syn: ['通路', '平台', '來源', '銷售管道', '管道', '銷售通路', 'channel'] },
  ] },
};

const norm = (s) => String(s).toLowerCase().replace(/[\s_()（）［］\[\]\-：:./]/g, '');
const RX = {
  phone: /^(\+?886|0)?[\s-]?\(?9\d\)?[\d\s-]{6,12}$/,
  date: /^(\d{2,4}[/.-]\d{1,2}[/.-]\d{1,2}|(\d{2,4}年)?\d{1,2}月\d{1,2}日?)$/,
  money: /^(NT\$|\$)?\s*[\d,]+(\.\d+)?\s*元?$/i,
  int: /^\d{1,4}$/,
  addr: /(市|縣).*(路|街|道|號)/,
};
function valueFit(values, kind) {
  const vs = values.filter(v => v !== '').slice(0, 30);
  if (!vs.length || !RX[kind]) return 0;
  const test = kind === 'addr' ? (v) => RX.addr.test(v) : (v) => RX[kind].test(v);
  return vs.filter(test).length / vs.length;
}
function headerScore(h, t) {
  const n = norm(h);
  let best = 0, why = '';
  for (const s of t.syn) {
    const sn = norm(s);
    if (n === sn) return { s: 0.96 + (s === t.syn[0] ? 0.03 : 0.01), why: '欄名相符' };
    if (sn.length >= 2 && (n.includes(sn) || sn.includes(n)) && n.length >= 2) { const v = 0.84 + Math.min(sn.length, n.length) / Math.max(sn.length, n.length) * 0.08; if (v > best) { best = v; why = `欄名相近「${s}」`; } }
  }
  if (!best) {
    const a = new Set([...n]); let common = 0;
    for (const s of t.syn) { const b = [...norm(s)]; const c = b.filter(x => a.has(x)).length; common = Math.max(common, (2 * c) / (a.size + b.length)); }
    if (common > 0.3) { best = common * 0.7; why = '欄名部分相似'; }
  }
  return { s: best, why };
}
const KIND_HINT = { phone: '內容像手機號碼', date: '內容像日期', money: '內容像金額', int: '內容像數量', addr: '內容像地址' };

export function scoreType(headers, rows, type) {
  const T = TYPES[type];
  const cols = headers.map((h, i) => rows.map(r => r[i] || ''));
  const pairs = [];
  headers.forEach((h, i) => T.targets.forEach((t) => {
    let { s, why } = headerScore(h, t);
    const fit = valueFit(cols[i], t.kind);
    if (RX[t.kind] || t.kind === 'addr') {
      if (s >= 0.8 && fit > 0.6) s = Math.min(0.99, s + 0.02);
      if (s >= 0.8 && fit < 0.3 && cols[i].some(Boolean)) s -= 0.12;
      if (s < 0.6 && fit >= 0.8) { s = 0.66 + fit * 0.12; why = KIND_HINT[t.kind]; }
    }
    if (s >= 0.55) pairs.push({ i, k: t.k, s, why });
  }));
  pairs.sort((a, b) => b.s - a.s);
  const map = {}; const usedT = new Set();
  for (const p of pairs) { if (map[p.i] || usedT.has(p.k)) continue; map[p.i] = { k: p.k, conf: Math.round(p.s * 100), why: p.why }; usedT.add(p.k); }
  const score = T.targets.reduce((s, t) => { const m = Object.values(map).find(x => x.k === t.k); return s + (m ? m.conf / 100 : 0) * (t.req ? 1.3 : 1); }, 0) / T.targets.length;
  return { map, score };
}
export function autoMap(headers, rows) {
  const res = Object.keys(TYPES).map(type => ({ type, ...scoreType(headers, rows, type) }));
  res.sort((a, b) => b.score - a.score);
  return res[0];
}

// ---------------------------------------------------------------- 清理規則
export function normPhone(v) {
  if (!v) return { ok: false, out: '' };
  let d = String(v).replace(/\D/g, '');
  if (d.startsWith('886')) d = '0' + d.slice(3);
  if (d.length === 9 && d[0] === '9') d = '0' + d;
  if (/^09\d{8}$/.test(d)) return { ok: true, out: `${d.slice(0, 4)}-${d.slice(4, 7)}-${d.slice(7)}`, d };
  if (/^0[2-8]\d{7,8}$/.test(d)) { const a = d[1] === '2' ? 2 : 3; return { ok: true, out: `${d.slice(0, a)}-${d.slice(a, d.length - 4)}-${d.slice(-4)}`, d }; }
  return { ok: false, out: v, d };
}
export const phoneCanonical = (v) => /^09\d{2}-\d{3}-\d{3}$/.test(v) || /^0\d{1,2}-\d{3,4}-\d{4}$/.test(v);

export function dateKind(v) {
  v = String(v).trim();
  let m = v.match(/^(\d{2,4})[/.-](\d{1,2})[/.-](\d{1,2})$/);
  if (m) return +m[1] < 200 ? 'roc' : (/^\d{4}-\d{2}-\d{2}$/.test(v) ? 'std' : 'ad');
  if (/^(\d{2,4}年)?\d{1,2}月\d{1,2}日?$/.test(v)) return 'cn';
  if (/^\d{1,2}\/\d{1,2}$/.test(v)) return 'md';
  return v ? 'bad' : 'empty';
}
export const DATE_KIND_LABEL = { roc: '民國年', ad: '西元（未補零）', cn: '中文月日', md: '月/日', std: '標準格式', bad: '無法辨識' };

export function normDate(v, { birthday = false, today = new Date() } = {}) {
  v = String(v || '').trim();
  if (!v) return { ok: true, out: '' };
  let y, mo, d, m;
  if ((m = v.match(/^(\d{2,4})[/.-](\d{1,2})[/.-](\d{1,2})$/))) { y = +m[1]; mo = +m[2]; d = +m[3]; if (y < 200) y += 1911; }
  else if ((m = v.match(/^(?:(\d{2,4})年)?(\d{1,2})月(\d{1,2})日?$/))) { y = m[1] ? +m[1] : null; mo = +m[2]; d = +m[3]; if (y && y < 200) y += 1911; }
  else if ((m = v.match(/^(\d{1,2})\/(\d{1,2})$/))) { y = null; mo = +m[1]; d = +m[2]; }
  else return { ok: false, out: v };
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return { ok: false, out: v };
  if (!y) {
    if (birthday) return { ok: true, out: `${p2(mo)}-${p2(d)}`, noYear: true };
    y = today.getFullYear();
    if (new Date(y, mo - 1, d) > today) y -= 1;
  }
  return { ok: true, out: `${y}-${p2(mo)}-${p2(d)}` };
}

export function normMoney(v) {
  const s = String(v || '').trim();
  if (!s) return { ok: true, out: '' };
  const c = s.replace(/NT\$|\$|元|,|，|\s/gi, '');
  if (/^\d+(\.\d+)?$/.test(c)) return { ok: true, out: String(Math.round(+c)) };
  return { ok: false, out: s };
}
export const moneyDirty = (v) => /[,，元$]|NT/i.test(String(v || ''));

export function normName(v) {
  return String(v || '').replace(/[\s　]/g, '').replace(/[（(].*?[)）]/g, '').replace(/(小姐|先生|太太|媽媽|姐|哥)$/, '');
}
