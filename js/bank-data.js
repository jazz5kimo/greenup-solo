// 金流對帳：模擬資料（銀行／金流明細、企業月結應收、現金流預測、催款文案）
// 所有資料皆為虛構示範，以固定種子產生並對應 store.orders / store.purchases。
import { mulberry32, startOfDay, addDays, PRODUCT_MAP } from './data.js';
import { PAYROLL, month, position, monthList } from './ledger.js';

const r0 = (n) => Math.round(n);

// 金流帳戶（費率為示範值）
export const PROVIDERS = {
  bank: { id: 'bank', name: '玉山銀行', sub: '活期存款 ・ 帳號末四碼 8826', color: '#2DB674', mark: '玉', fee: 0 },
  ecpay: { id: 'ecpay', name: '綠界科技', sub: '信用卡／Apple Pay ・ T+2 撥款', color: '#2E97D4', mark: 'EC', fee: 0.0275, pays: ['信用卡', 'Apple Pay'] },
  linepay: { id: 'linepay', name: 'LINE Pay', sub: '行動支付 ・ T+1 撥款', color: '#06C755', mark: 'LP', fee: 0.03, pays: ['LINE Pay'] },
  jko: { id: 'jko', name: '街口支付', sub: '行動支付 ・ T+1 撥款', color: '#EC6A55', mark: '街', fee: 0.025, pays: ['街口支付'] },
};

// 企業月結／寄賣應收（模擬，帳齡較長，讓帳齡分析有層次）
export function b2bReceivables(now = new Date()) {
  const today = startOfDay(now);
  return [
    { id: 'AR-B2B-0912', customer: '晨光設計有限公司', lang: 'zh', channel: 'line', kind: '中秋禮盒團購（月結 30 天）', total: 18600, ts: +addDays(today, -15) + 10.5 * 3600e3, b2b: true, items: [{ pid: 'pineapple', qty: 20 }, { pid: 'cookie', qty: 12 }], invoice: 'AB-30416127' },
    { id: 'AR-B2B-0923', customer: '青田企業社', lang: 'zh', channel: 'phone', kind: '員工下午茶（月結）', total: 3450, ts: +addDays(today, -12) + 14 * 3600e3, b2b: true, items: [{ pid: 'canele', qty: 5 }, { pid: 'lemon', qty: 3 }], invoice: 'AB-30416893' },
    { id: 'AR-B2B-0831', customer: '森林小屋咖啡', lang: 'zh', channel: 'line', kind: '9 月寄賣貨款', total: 4860, ts: +addDays(today, -35) + 9 * 3600e3, b2b: true, items: [{ pid: 'pound', qty: 9 }, { pid: 'canele', qty: 4 }], invoice: 'AB-30414502' },
    { id: 'AR-B2B-0826', customer: 'さくら旅行社 台北支店', lang: 'ja', channel: 'web', kind: '訪台團伴手禮', total: 9600, ts: +addDays(today, -41) + 11 * 3600e3, b2b: true, items: [{ pid: 'pineapple', qty: 20 }], invoice: 'AB-30413766' },
    { id: 'AR-B2B-0730', customer: '好日子民宿', lang: 'zh', channel: 'line', kind: '早餐甜點 8 月月結', total: 6240, ts: +addDays(today, -66) + 9 * 3600e3, b2b: true, items: [{ pid: 'pound', qty: 8 }, { pid: 'lemon', qty: 8 }], invoice: 'AB-30411902' },
  ];
}

// 由 store 訂單挑出各金流的撥款組合
function pickOrders(orders, today, pays, n, used, { pos = false } = {}) {
  const from = +addDays(today, -4), to = +today;
  const list = orders.filter(o => o.source === 'history' && o.status === 'paid' && o.ts >= from && o.ts < to && pays.includes(o.payment) && (pos ? o.channel === 'pos' : o.channel !== 'pos') && !used.has(o.id));
  const out = list.slice(0, n);
  out.forEach(o => used.add(o.id));
  return out;
}

// 對帳工作台資料：bank（銀行／金流明細）、book（帳上紀錄）、links
export function buildRecon(store, now = new Date()) {
  const rng = mulberry32(5150);
  const today = startOfDay(now);
  const used = new Set();
  const orders = store.orders;
  const ec = pickOrders(orders, today, PROVIDERS.ecpay.pays, 4, used);
  const lp = pickOrders(orders, today, PROVIDERS.linepay.pays, 3, used);
  const jk = pickOrders(orders, today, PROVIDERS.jko.pays, 2, used);
  const tr = pickOrders(orders, today, ['銀行轉帳'], 2, used);
  const yd = addDays(today, -1);
  let cash = orders.filter(o => o.channel === 'pos' && o.payment === '現金' && o.ts >= +yd && o.ts < +today);
  if (!cash.length) cash = pickOrders(orders, today, ['現金'], 3, used, { pos: true });
  const cashDay = cash.length ? startOfDay(cash[0].ts) : yd;
  const purchases = store.purchases.filter(p => p.ts < +now).slice(-2);
  const payroll = PAYROLL();
  const payNet = payroll.reduce((s, p) => s + p.pay - p.emp.labor - p.emp.health, 0);
  const prevM = new Date(today.getFullYear(), today.getMonth() - 1, 1).getMonth() + 1;
  const b2b = b2bReceivables(now).find(x => x.customer === '森林小屋咖啡');

  // 今日交易時間：壓在「今天 00:00 ～ 現在」之間，確保不會出現未來時間
  const end = Math.max(+today + 50 * 60e3, Math.min(+now - 3 * 60e3, +today + 17.5 * 3600e3));
  const start = Math.max(+today + 5 * 60e3, end - 9 * 3600e3);

  const book = [];
  const addBook = (b) => { b.j = book.length; book.push(b); return b.j; };
  const orderRow = (o, tag) => addBook({ type: 'order', group: '訂單／發票', title: o.id, who: o.customer, sub: `發票 ${o.invoice}・${o.payment}`, amt: o.total, ts: o.ts, tag, oid: o.id });

  const bank = [];
  const sum = (l) => l.reduce((s, o) => s + o.total, 0);
  const settle = (prov, list, label) => {
    if (!list.length) return;
    const gross = sum(list), fee = r0(gross * prov.fee);
    bank.push({ dir: 'in', prov: prov.id, title: `${prov.name} 撥款`, sub: `${label}・${list.length} 筆`, amt: gross - fee, gross, fee, kind: 'settle', books: list.map(o => orderRow(o, prov.id)) });
  };
  settle(PROVIDERS.ecpay, ec, '信用卡／Apple Pay 批次');
  settle(PROVIDERS.linepay, lp, 'LINE Pay 交易');
  settle(PROVIDERS.jko, jk, '街口支付交易');
  if (tr[0]) bank.push({ dir: 'in', prov: 'bank', title: `轉帳入帳 ${tr[0].customer}`, sub: `跨行轉入・帳號末碼 ${String(1000 + Math.floor(rng() * 9000))}`, amt: tr[0].total, kind: 'transfer', books: [orderRow(tr[0], 'bank')] });
  if (tr[1]) {
    const j = orderRow(tr[1], 'bank');
    bank.push({ dir: 'in', prov: 'bank', title: `轉帳入帳 ${tr[1].customer}`, sub: `跨行轉入・帳號末碼 ${String(1000 + Math.floor(rng() * 9000))}`, amt: tr[1].total - 30, kind: 'short', books: [], anomaly: {
      code: 'short', cand: [j], diff: 30, conf: 96,
      title: `金額差 NT$ 30`, text: `入帳 ${(tr[1].total - 30).toLocaleString()} 元，與訂單 ${tr[1].id}（${tr[1].total.toLocaleString()} 元）相差 30 元。比對客戶過往紀錄，判定為跨行匯款手續費由收款方負擔。`,
      action: '判定為匯費，建議沖銷應收並記入「手續費」30 元', btn: '接受建議', done: '已沖銷訂單，30 元記入手續費',
    } });
  }
  if (cash.length) {
    const tot = sum(cash);
    const j = addBook({ type: 'pos', group: '訂單／發票', title: `POS 日結 ${cashDay.getMonth() + 1}/${cashDay.getDate()}`, who: '門市現金', sub: `${cash.length} 筆現金交易・發票已開立`, amt: tot, ts: +cashDay + 21 * 3600e3, tag: 'bank' });
    bank.push({ dir: 'in', prov: 'bank', title: '門市現金存入', sub: `ATM 存款・${cashDay.getMonth() + 1}/${cashDay.getDate()} 營業額`, amt: tot, kind: 'cash', books: [j] });
  }
  // 不明匯入款：AI 比對到企業月結應收
  const bj = addBook({ type: 'ar', group: '應收帳款（企業月結）', title: b2b.customer, who: b2b.kind, sub: `發票 ${b2b.invoice}・已逾 30 天`, amt: b2b.total, ts: b2b.ts, tag: 'bank', b2b: b2b.id });
  bank.push({ dir: 'in', prov: 'bank', title: '不明匯入款', sub: 'ATM 轉入・戶名「林＊＊」', amt: b2b.total, kind: 'unknown', books: [], anomaly: {
    code: 'unknown', cand: [bj], conf: 92,
    title: '查無對應訂單', text: `匯款人戶名與客戶資料不符。AI 比對到企業月結客戶「${b2b.customer}」${b2b.kind} ${b2b.total.toLocaleString()} 元金額完全相符，且該店負責人姓林。`,
    action: `判定為「${b2b.customer}」付款，建議沖銷應收並傳 LINE 確認`, btn: '接受建議', done: '已沖銷應收，並傳訊息請對方確認', b2b: b2b.id,
  } });
  // 出帳
  purchases.forEach((p) => {
    const j = addBook({ type: 'buy', group: '進貨／費用', title: p.vendor, who: p.item, sub: `進項發票 ${p.invoice}`, amt: p.total, ts: p.ts, tag: 'out' });
    bank.push({ dir: 'out', prov: 'bank', title: `進貨付款 ${p.vendor}`, sub: '網銀轉帳・貨到付款', amt: p.total, kind: 'buy', books: [j] });
  });
  const jp = addBook({ type: 'hr', group: '薪資／租金', title: `${prevM} 月薪資單`, who: payroll.map(p => p.name).join('、'), sub: '已扣員工自付勞健保', amt: payNet, ts: +today, tag: 'out' });
  bank.push({ dir: 'out', prov: 'bank', title: '薪資轉帳（3 人）', sub: '網銀批次轉帳', amt: payNet, kind: 'payroll', books: [jp] });
  const jr = addBook({ type: 'rent', group: '薪資／租金', title: `${today.getMonth() + 1} 月店面租金`, who: '房東 王＊＊', sub: '25,000 扣繳 10% 後實付', amt: 22500, ts: +today, tag: 'out' });
  bank.push({ dir: 'out', prov: 'bank', title: '租金 房東 王＊＊', sub: '網銀轉帳・扣繳 2,500 另行繳庫', amt: 22500, kind: 'rent', books: [jr] });
  bank.push({ dir: 'out', prov: 'bank', title: '跨行轉帳手續費', sub: '銀行自動扣款', amt: 15, kind: 'fee', books: [], anomaly: {
    code: 'fee', cand: [], conf: 99,
    title: '帳上無對應紀錄', text: '於租金轉帳後 1 秒扣款 15 元，摘要為「跨行手續費」，與玉山網銀跨行轉帳收費標準一致。',
    action: '判定為銀行手續費，建議記入「手續費」15 元', btn: '接受建議', done: '已新增分錄：手續費 15／銀行存款 15',
  } });

  // 依序給時間（入帳在前、出帳在後，看起來像一天的流水）
  const order = ['settle', 'cash', 'transfer', 'short', 'unknown', 'buy', 'payroll', 'rent', 'fee'];
  bank.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
  bank.forEach((t, i) => { t.i = i; t.ts = Math.round(start + (end - start) * (i + 0.3 * rng()) / bank.length); });
  // 帳上紀錄依類別、時間排序（自然形成交錯連線）
  const gOrder = ['訂單／發票', '應收帳款（企業月結）', '進貨／費用', '薪資／租金'];
  const sorted = [...book].sort((a, b) => gOrder.indexOf(a.group) - gOrder.indexOf(b.group) || a.ts - b.ts);
  const remap = new Map(sorted.map((b, k) => [b.j, k]));
  sorted.forEach((b, k) => { b.j = k; });
  for (const t of bank) {
    t.books = t.books.map(j => remap.get(j));
    if (t.anomaly) t.anomaly.cand = t.anomaly.cand.map(j => remap.get(j));
  }
  return { bank, book: sorted, used, stats: { prevMatched: 1063, prevTotal: 1087 } };
}

// 帳戶卡片：待撥款、今日撥款、近 7 日撥款
export function accountCards(store, recon, now = new Date()) {
  const today = startOfDay(now);
  const cash = position(now.getFullYear(), now.getMonth() + 1).flow.close;
  const rng = mulberry32(8826);
  const out = [];
  const bankIn = recon.bank.filter(t => t.dir === 'in').reduce((s, t) => s + t.amt, 0);
  const bankOut = recon.bank.filter(t => t.dir === 'out').reduce((s, t) => s + t.amt, 0);
  out.push({ ...PROVIDERS.bank, balance: cash, label: '存款餘額', today: bankIn, todayLabel: '今日入帳', extra: `今日出帳 NT$ ${bankOut.toLocaleString()}`, spark: Array.from({ length: 10 }, (_, i) => cash * (0.9 + i * 0.011 + rng() * 0.02)) });
  for (const id of ['ecpay', 'linepay', 'jko']) {
    const p = PROVIDERS[id];
    const lag = id === 'ecpay' ? 2 : 1;
    const pend = store.orders.filter(o => o.status === 'paid' && p.pays.includes(o.payment) && o.ts >= +addDays(today, -lag) && o.ts < +now && !recon.used.has(o.id));
    const gross = pend.reduce((s, o) => s + o.total, 0);
    const st = recon.bank.find(t => t.prov === id);
    const daily = [];
    for (let d = 9; d >= 0; d--) { const a = addDays(today, -d - lag), b = addDays(a, 1); daily.push(store.orders.filter(o => o.ts >= +a && o.ts < +b && p.pays.includes(o.payment)).reduce((s, o) => s + o.total, 0) * (1 - p.fee)); }
    out.push({ ...p, balance: r0(gross * (1 - p.fee)), label: '待撥款', today: st ? st.amt : 0, todayLabel: '今日撥款', extra: `手續費 ${(p.fee * 100).toFixed(2).replace(/0$/, '')}%・今日扣 NT$ ${(st ? st.fee : 0).toLocaleString()}`, spark: daily, pendCount: pend.length });
  }
  return out;
}

// 撥款時間軸（今日已入帳 + 未來預計）
export function payoutTimeline(store, recon, now = new Date()) {
  const today = startOfDay(now);
  const items = recon.bank.filter(t => t.kind === 'settle' || t.kind === 'cash').map(t => ({ ts: t.ts, prov: t.prov, title: t.title, amt: t.amt, done: true }));
  const est = (id, lagDays, dayOffset, hour) => {
    const p = PROVIDERS[id];
    const src = addDays(today, dayOffset - lagDays - 1);
    const gross = store.orders.filter(o => o.ts >= +src && o.ts < +addDays(src, 1) && p.pays.includes(o.payment)).reduce((s, o) => s + o.total, 0);
    return { ts: +addDays(today, dayOffset) + hour * 3600e3, prov: id, title: `${p.name} 預計撥款`, amt: r0(gross * (1 - p.fee)), done: false };
  };
  items.push(est('linepay', 1, 1, 9.5), est('jko', 1, 1, 10), est('ecpay', 2, 1, 11), est('ecpay', 2, 2, 11));
  return items.sort((a, b) => a.ts - b.ts);
}

// 60 天現金流預測
export function cashForecast(store, now = new Date()) {
  const rng = mulberry32(6060);
  const today = startOfDay(now);
  const list = monthList(now);
  const cash0 = position(now.getFullYear(), now.getMonth() + 1).flow.close;
  const full = list.filter(x => !x.current).map(x => position(x.y, x.m).flows.find(f => f.m === x.m));
  const days = full.map(x => new Date(now.getFullYear(), x.m, 0).getDate()).reduce((s, d) => s + d, 0) || 61;
  const baseOut = full.reduce((s, f) => s + f.buy + f.exp, 0) / days;
  const daily = store.dailySeries(28).map(d => d.value);
  const baseIn = daily.reduce((s, v) => s + v, 0) / daily.length * 0.975;
  const payroll = PAYROLL();
  const payNet = payroll.reduce((s, p) => s + p.pay - p.emp.labor - p.emp.health, 0);
  const ins = payroll.reduce((s, p) => s + p.labor + p.health + p.pension + p.emp.labor + p.emp.health, 0);
  const prev = month(now.getFullYear(), now.getMonth()); // 上個月（JS month 0-based → 上月）
  const vat = Math.max(0, r0((prev.tax - prev.inTax) * 2 / 100) * 100);
  const D = (m, d) => new Date(now.getFullYear() + (m < now.getMonth() + 1 ? 1 : 0), m - 1, d);
  const events = [];
  const N = 60;
  const endDay = addDays(today, N);
  const push = (date, name, amt, kind, major = false) => { if (date > today && date <= endDay) events.push({ date: startOfDay(date), name, amt, kind, major }); };
  for (let k = 0; k < 3; k++) {
    const m = now.getMonth() + 1 + k;
    const mm = ((m - 1) % 12) + 1;
    const y = now.getFullYear() + Math.floor((m - 1) / 12);
    push(new Date(y, mm - 1, 5), '薪資', payNet, 'hr', true);
    push(new Date(y, mm - 1, 5), '店面租金', 22500, 'rent', true);
    push(new Date(y, mm - 1, 10), '10 日扣繳＋補充保費', 2500 + 528, 'tax', true);
    push(new Date(y, mm, 0), '勞健保・勞退', ins, 'hr');
    if (mm % 2 === 1) push(new Date(y, mm - 1, 15), `營業稅（${mm - 2 <= 0 ? mm + 10 : mm - 2}–${mm - 1 <= 0 ? 12 : mm - 1} 月）`, vat, 'vat', true);
  }
  push(D(11, 12), '年節禮盒原料＋包材預購', 360000, 'buy', true);
  events.sort((a, b) => a.date - b.date);
  const pts = [];
  let bal = cash0;
  for (let t = 0; t <= N; t++) {
    const day = addDays(today, t);
    const dow = day.getDay();
    const wk = dow === 0 || dow === 6 ? 1.3 : dow === 5 ? 1.12 : 0.88;
    const evs = events.filter(e => +e.date === +startOfDay(day));
    if (t > 0) {
      bal += baseIn * wk * (0.9 + rng() * 0.2) - baseOut * (0.85 + rng() * 0.3);
      for (const e of evs) bal -= e.amt;
    }
    const sd = 9000 * Math.sqrt(t);
    pts.push({ date: day, v: r0(bal), lo: r0(bal - sd), hi: r0(bal + sd), evs });
  }
  let min = pts[1];
  for (const p of pts.slice(1)) if (p.v < min.v) min = p;
  const safe = r0((payNet + 22500 + ins) * 2 / 10000) * 10000;
  return { pts, events, min, safe, cash0, baseIn, baseOut };
}

// 多語催款文案
const PNAME = {
  ja: { lemon: 'レモンタルト', roll: 'いちご生ロール', basque: 'タロイモのバスクチーズケーキ', pound: '烏龍茶パウンドケーキ', cookie: '手作りクッキーギフト', pineapple: 'パイナップルケーキ詰め合わせ', canele: 'アールグレイのカヌレ' },
  en: { lemon: 'Lemon Tart', roll: 'Strawberry Cream Roll', basque: 'Taro Basque Cheesecake', pound: 'Oolong Pound Cake', cookie: 'Handmade Cookie Gift Box', pineapple: 'Pineapple Cake Gift Box', canele: 'Earl Grey Canelés' },
  vi: { lemon: 'Bánh tart chanh', roll: 'Bánh cuộn kem dâu', basque: 'Bánh Basque khoai môn', pound: 'Bánh bông lan trà Ô Long', cookie: 'Hộp bánh quy thủ công', pineapple: 'Hộp bánh dứa', canele: 'Bánh canelé trà bá tước' },
};
function itemsIn(items, lang) {
  const sep = lang === 'zh' || lang === 'ja' ? '、' : ', ';
  return items.map(it => `${lang === 'zh' ? PRODUCT_MAP[it.pid].name : PNAME[lang][it.pid]} ×${it.qty}`).join(sep);
}
export function dunningMessage(o, ageDays) {
  const lang = ['zh', 'ja', 'en', 'vi'].includes(o.lang) ? o.lang : 'zh';
  const d = new Date(o.ts);
  const amt = `NT$ ${o.total.toLocaleString('en-US')}`;
  const items = itemsIn(o.items, lang);
  const late = ageDays > 30;
  const id = o.id;
  if (lang === 'ja') {
    return `${o.customer} 様\n\nいつも阿美手作甜點をご利用いただき、誠にありがとうございます。\n${d.getMonth() + 1}月${d.getDate()}日にご注文いただいた「${items}」（ご注文番号 ${id}、${amt}）につきまして、${late ? `お支払い期日より${ageDays - 30}日ほど経過しておりますが、` : ''}まだご入金が確認できておりません。\n\nお手数をおかけいたしますが、下記リンクよりお手続きいただけますと幸いです。行き違いでお支払い済みの場合は、何卒ご容赦ください。`;
  }
  if (lang === 'en') {
    return `Hi ${o.customer},\n\nThank you for ordering from A-Mei Handmade Desserts! This is a friendly reminder that payment for order ${id} (${items}, ${amt}) placed on ${d.getMonth() + 1}/${d.getDate()} ${late ? 'is now past due' : "hasn't come through yet"}.\n\nYou can complete it securely via the link below. If you've already paid, please disregard this message. Have a lovely day!`;
  }
  if (lang === 'vi') {
    return `Chào ${o.customer},\n\nCảm ơn bạn đã đặt bánh tại A-Mei Handmade Desserts! Đơn hàng ${id} (${items}, ${amt}) ngày ${d.getDate()}/${d.getMonth() + 1} hiện ${late ? 'đã quá hạn thanh toán' : 'chưa được thanh toán'}.\n\nBạn có thể thanh toán nhanh qua liên kết bên dưới. Nếu bạn đã thanh toán rồi, xin vui lòng bỏ qua tin nhắn này. Chúc bạn một ngày tốt lành!`;
  }
  return `${o.customer} 您好：\n\n感謝您${d.getMonth() + 1}/${d.getDate()} 向阿美手作甜點訂購「${items}」（${o.b2b ? o.kind + '，' : ''}單號 ${id}），金額 ${amt}。${late ? `目前帳款已超過約定付款期限 ${ageDays - 30} 天，` : '目前系統尚未收到款項，'}想跟您確認一下付款狀況。\n\n可直接點選下方連結付款；若您已經付款，請忽略此訊息，謝謝您！`;
}
export const LANG_NAME = { zh: '中文', ja: '日本語', en: 'English', vi: 'Tiếng Việt' };

// 電子發票（本期）
export function einvoiceStats(store, now = new Date()) {
  const m = now.getMonth();
  const startM = m - (m % 2);
  const start = new Date(now.getFullYear(), startM, 1), end = new Date(now.getFullYear(), startM + 2, 1);
  const list = store.ordersBetween(start, end);
  const rng = mulberry32(3030 + list.length);
  // 上一期中獎發票：挑上一期一位會員
  const ps = new Date(now.getFullYear(), startM - 2, 1), pe = start;
  const prev = store.ordersBetween(ps, pe).filter(o => o.channel !== 'pos');
  const win = prev[Math.floor(prev.length * 0.37)] || prev[0];
  return {
    label: `${startM + 1}–${startM + 2} 月`, prevLabel: `${startM - 1 <= 0 ? startM + 11 : startM - 1}–${startM <= 0 ? 12 : startM} 月`, count: list.length,
    voided: 2 + Math.floor(rng() * 2), allowance: 1 + Math.floor(rng() * 2), carrier: Math.round(list.length * 0.62), donated: Math.round(list.length * 0.04),
    win, uploaded: list.length,
  };
}
