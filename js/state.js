// 共用狀態 + 事件匯流排（後台 index.html 與銷售網頁 shop.html 共用）
// 歷史訂單由種子 PRNG 產生；示範中新增的「即時訂單」存在 localStorage，
// 並以 BroadcastChannel（或 storage 事件）讓兩個分頁即時同步。
import { generateHistory, generatePurchases, PRODUCTS, PRODUCT_MAP, priceOrder, nextInvoice, fmtYMD, startOfDay, addDays, setInvoiceSeq } from './data.js';

const LS_ORDERS = 'greenup-solo:live-orders:v1';
const LS_SETTINGS = 'greenup-solo:settings:v1';
const CH_NAME = 'greenup-solo';

function lsGet(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* 無痕或封鎖時忽略 */ }
}

class Store {
  constructor() {
    this.now = new Date();
    this.history = generateHistory(this.now);
    this.purchases = generatePurchases(this.now);
    this.live = lsGet(LS_ORDERS, []);
    this.settings = Object.assign({ deploy: 'cloud' }, lsGet(LS_SETTINGS, {}));
    this.bus = new EventTarget();
    this.activity = [];
    this.seq = this.history.length + this.live.length;
    setInvoiceSeq(this.history.length + this.live.length);
    this._rebuild();
    this._seedActivity();
    try {
      this.channel = new BroadcastChannel(CH_NAME);
      this.channel.onmessage = (e) => this._onRemote(e.data);
    } catch { this.channel = null; }
    window.addEventListener('storage', (e) => {
      if (e.key === LS_ORDERS) {
        const incoming = lsGet(LS_ORDERS, []);
        for (const o of incoming) {
          const ex = this.live.find(x => x.id === o.id);
          if (!ex) this._onRemote({ type: 'order', order: o });
          else if (ex.status !== o.status) this._onRemote({ type: 'order-updated', order: o });
        }
        if (incoming.length === 0 && this.live.length) this._onRemote({ type: 'reset' });
      }
      if (e.key === LS_SETTINGS) { this.settings = Object.assign(this.settings, lsGet(LS_SETTINGS, {})); this.emit('deploy', this.settings.deploy); }
    });
  }

  _rebuild() { this.orders = [...this.history, ...this.live].sort((a, b) => a.ts - b.ts); }

  on(type, fn) { const h = (e) => fn(e.detail); this.bus.addEventListener(type, h); return () => this.bus.removeEventListener(type, h); }
  emit(type, detail) { this.bus.dispatchEvent(new CustomEvent(type, { detail })); }

  _broadcast(msg) { try { this.channel && this.channel.postMessage(msg); } catch { /* ignore */ } }

  _onRemote(msg) {
    if (!msg) return;
    if (msg.type === 'order') {
      if (this.live.find(x => x.id === msg.order.id)) return;
      this.live.push(msg.order); this._rebuild(); this.seq += 1; setInvoiceSeq(this.history.length + this.live.length);
      this.log(msg.order.channel === 'web' ? 'web' : 'order', describeOrder(msg.order));
      this.emit('order', { order: msg.order, remote: true });
    } else if (msg.type === 'order-updated') {
      const o = this.live.find(x => x.id === msg.order.id);
      if (o) { Object.assign(o, msg.order); this._rebuild(); this.emit('order-updated', { order: o, remote: true }); }
    } else if (msg.type === 'deploy') {
      this.settings.deploy = msg.mode; this.emit('deploy', msg.mode);
    } else if (msg.type === 'reset') {
      this.live = []; this._rebuild(); this.emit('reset', {});
    }
  }

  // 建立訂單：items = [{pid, qty}]
  createOrder({ channel, customer, lang = 'zh', items, payment = '信用卡', status = 'paid', conv = null, note = '', region = '', pickup = false }) {
    const full = items.map(it => ({ pid: it.pid, qty: it.qty, price: PRODUCT_MAP[it.pid].price }));
    const money = priceOrder(full, channel);
    const setShip = (fee) => { money.shipping = fee; money.total = money.subtotal + fee; money.net = Math.round(money.total / 1.05); money.tax = money.total - money.net; };
    if (pickup) setShip(0);
    else if (region && /日本|Japan|東京|International|Jepun|Nhật|国際/i.test(region)) setShip(450);
    const ts = Date.now();
    this.seq += 1;
    const order = {
      id: `SO-${fmtYMD(new Date(ts))}-${String(this.seq).padStart(4, '0')}`,
      ts, channel, lang, customer, items: full, ...money, payment, status,
      invoice: nextInvoice(), source: 'live', conv, note, region,
      paidAt: status === 'paid' ? ts : null, createdPending: status === 'pending',
    };
    this.live.push(order); this._rebuild();
    lsSet(LS_ORDERS, this.live);
    this._broadcast({ type: 'order', order });
    this.log(channel === 'web' ? 'web' : 'order', describeOrder(order));
    this.emit('order', { order, remote: false });
    return order;
  }

  markPaid(id) {
    const o = this.live.find(x => x.id === id) || this.history.find(x => x.id === id);
    if (!o || o.status === 'paid') return o;
    o.status = 'paid'; o.paidAt = Date.now();
    if (o.source === 'live') { lsSet(LS_ORDERS, this.live); this._broadcast({ type: 'order-updated', order: o }); }
    this.log('pay', `收到 ${o.customer} 付款 NT$ ${o.total.toLocaleString()}，已自動沖銷應收帳款`);
    this.emit('order-updated', { order: o, remote: false });
    return o;
  }

  setDeploy(mode) {
    this.settings.deploy = mode; lsSet(LS_SETTINGS, this.settings);
    this._broadcast({ type: 'deploy', mode });
    this.emit('deploy', mode);
  }

  reset() {
    this.live = []; lsSet(LS_ORDERS, []); this._rebuild();
    this._broadcast({ type: 'reset' });
    this.emit('reset', {});
  }

  log(kind, text) {
    const item = { ts: Date.now(), kind, text };
    this.activity.unshift(item);
    this.activity = this.activity.slice(0, 40);
    this.emit('activity', item);
  }
  _seedActivity() {
    const recent = this.orders.slice(-6);
    for (const o of recent) this.activity.unshift({ ts: o.ts, kind: o.channel === 'web' ? 'web' : 'order', text: describeOrder(o) });
  }

  // ---- 查詢 ----
  inventory() {
    const sold = {};
    for (const o of this.live) for (const it of o.items) sold[it.pid] = (sold[it.pid] || 0) + it.qty;
    return PRODUCTS.map(p => {
      const stock = Math.max(0, p.stock - (sold[p.id] || 0));
      return { ...p, current: stock, low: stock < p.safety };
    });
  }
  ordersBetween(from, to) { const a = +from, b = +to; return this.orders.filter(o => o.ts >= a && o.ts < b); }
  sum(list, key = 'total') { return list.reduce((s, o) => s + o[key], 0); }

  kpis() {
    const now = new Date();
    const today = startOfDay(now);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthSame = new Date(lastMonthStart); lastMonthSame.setDate(Math.min(now.getDate(), 28)); lastMonthSame.setHours(now.getHours(), now.getMinutes());
    const todayO = this.ordersBetween(today, addDays(today, 1));
    const ydayO = this.ordersBetween(addDays(today, -1), addDays(now, -1));
    const monthO = this.ordersBetween(monthStart, addDays(today, 1));
    const lastO = this.ordersBetween(lastMonthStart, lastMonthSame);
    const net = this.sum(monthO, 'net'), cost = this.sum(monthO, 'cost');
    const lnet = this.sum(lastO, 'net'), lcost = this.sum(lastO, 'cost');
    const ar = this.orders.filter(o => o.status === 'pending');
    const inv = this.inventory();
    const pct = (a, b) => b ? (a - b) / b * 100 : 0;
    return {
      today: this.sum(todayO), todayDelta: pct(this.sum(todayO), this.sum(ydayO)),
      month: this.sum(monthO), monthDelta: pct(this.sum(monthO), this.sum(lastO)),
      orders: monthO.length, ordersToday: todayO.length, ordersDelta: pct(monthO.length, lastO.length),
      margin: net ? (net - cost) / net * 100 : 0, marginDelta: (net ? (net - cost) / net * 100 : 0) - (lnet ? (lnet - lcost) / lnet * 100 : 0),
      ar: this.sum(ar), arCount: ar.length,
      low: inv.filter(p => p.low).length, lowNames: inv.filter(p => p.low).map(p => p.name),
    };
  }

  dailySeries(days = 30, key = 'total') {
    const today = startOfDay(new Date());
    const out = [];
    for (let d = days - 1; d >= 0; d--) {
      const day = addDays(today, -d);
      const list = this.ordersBetween(day, addDays(day, 1));
      out.push({ date: day, value: key === 'count' ? list.length : this.sum(list, key), orders: list.length });
    }
    return out;
  }

  // 會計分錄（由訂單自動產生）
  journalFor(o) {
    const entries = [];
    const d = new Date(o.ts);
    const debit = o.createdPending || o.status === 'pending' ? '應收帳款' : '銀行存款';
    entries.push({ ts: o.ts, ref: o.id, lines: [
      { side: '借', acct: debit, amt: o.total },
      { side: '貸', acct: '銷貨收入', amt: o.net },
      { side: '貸', acct: '銷項稅額', amt: o.tax },
    ], memo: `${o.customer}｜發票 ${o.invoice}`, date: d });
    if (o.createdPending && o.paidAt) {
      entries.push({ ts: o.paidAt, ref: o.id, lines: [
        { side: '借', acct: '銀行存款', amt: o.total },
        { side: '貸', acct: '應收帳款', amt: o.total },
      ], memo: `收款沖銷｜${o.payment}`, date: new Date(o.paidAt) });
    }
    return entries;
  }
  journal(limit = 12) {
    const out = [];
    for (let i = this.orders.length - 1; i >= 0 && out.length < limit + 4; i--) out.push(...this.journalFor(this.orders[i]));
    return out.sort((a, b) => b.ts - a.ts).slice(0, limit);
  }
}

export function itemsText(items) {
  return items.map(it => `${PRODUCT_MAP[it.pid].name}×${it.qty}`).join('、');
}
export function describeOrder(o) {
  const chName = { line: 'LINE', web: '官網 AI 導購', pos: '現場 POS', phone: 'AI 電話', whatsapp: 'WhatsApp', zalo: 'Zalo', messenger: 'Messenger' }[o.channel] || o.channel;
  return `${chName}｜${o.customer} 訂購 ${itemsText(o.items)}，NT$ ${o.total.toLocaleString()}，已開立發票 ${o.invoice}`;
}

export const store = new Store();
window.__store = store; // 方便現場除錯
