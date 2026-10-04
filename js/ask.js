// 「用問的」：規則式中文自然語言解析 → 查詢模擬資料 → 文字＋圖表＋資料來源
import { store } from './state.js';
import { PRODUCTS, CHANNELS, LANG_LABEL, startOfDay, addDays } from './data.js';
import { trendOption, channelOption, productOption, heatmapOption, inventoryOption, marginOption, monthBarOption, PALETTE } from './charts.js';
import { money, fmtDate, fmtMD } from './util.js';

const CN_NUM = { 一: 1, 二: 2, 兩: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
function parseCnNumber(s) {
  if (/^\d+$/.test(s)) return +s;
  if (s === '十') return 10;
  let m = s.match(/^([一二兩三四五六七八九])?十([一二三四五六七八九])?$/);
  if (m) return (m[1] ? CN_NUM[m[1]] : 1) * 10 + (m[2] ? CN_NUM[m[2]] : 0);
  return CN_NUM[s] || null;
}

export function parsePeriod(q, fallback = 'month') {
  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const mk = (from, to, label) => ({ from, to, label });
  let m = q.match(/(?:最近|近|過去|前)\s*([0-9一二兩三四五六七八九十]+)\s*(天|日|週|周|個月|月)/);
  if (m) {
    const n = parseCnNumber(m[1]) || 30;
    const days = /週|周/.test(m[2]) ? n * 7 : /月/.test(m[2]) ? n * 30 : n;
    return mk(addDays(today, -(Math.min(days, 90) - 1)), tomorrow, `最近 ${days} 天`);
  }
  if (/今天|今日/.test(q)) return mk(today, tomorrow, '今天');
  if (/昨天|昨日/.test(q)) return mk(addDays(today, -1), today, '昨天');
  if (/上週|上周|上禮拜|上星期/.test(q)) { const wd = (today.getDay() + 6) % 7; const s = addDays(today, -wd - 7); return mk(s, addDays(s, 7), '上週'); }
  if (/本週|本周|這週|這周|這禮拜|這星期/.test(q)) { const wd = (today.getDay() + 6) % 7; return mk(addDays(today, -wd), tomorrow, '本週'); }
  if (/上上個月/.test(q)) return mk(new Date(now.getFullYear(), now.getMonth() - 2, 1), new Date(now.getFullYear(), now.getMonth() - 1, 1), '上上個月');
  if (/上個月|上月/.test(q)) return mk(new Date(now.getFullYear(), now.getMonth() - 1, 1), new Date(now.getFullYear(), now.getMonth(), 1), '上個月');
  if (/這個月|本月|這月|當月/.test(q)) return mk(new Date(now.getFullYear(), now.getMonth(), 1), tomorrow, '這個月');
  if (/今年|本年|這季|本季|三個月|季/.test(q)) return mk(addDays(today, -89), tomorrow, '最近 90 天');
  if (fallback === '30d') return mk(addDays(today, -29), tomorrow, '最近 30 天');
  if (fallback === 'today') return mk(today, tomorrow, '今天');
  return mk(new Date(now.getFullYear(), now.getMonth(), 1), tomorrow, '這個月');
}

function findProduct(q) {
  return PRODUCTS.find(p => q.includes(p.name) || q.includes(p.name.slice(0, 2)) && !/商品|產品/.test(p.name.slice(0, 2)));
}
function findChannel(q) {
  const lq = q.toLowerCase();
  return CHANNELS.find(c => lq.includes(c.name.toLowerCase()) || (c.id === 'pos' && /門市|現場|pos/i.test(q)) || (c.id === 'web' && /官網|網站|網店/.test(q)) || (c.id === 'phone' && /電話/.test(q)));
}

const pct = (a, b) => (b ? ((a - b) / b * 100) : 0);
const sumBy = (list, key) => list.reduce((s, o) => s + o[key], 0);

function prevPeriod(p) {
  const len = p.to - p.from;
  if (p.label === '這個月') { const f = new Date(p.from.getFullYear(), p.from.getMonth() - 1, 1); const t = new Date(f); t.setDate(Math.min(new Date().getDate() + 1, 29)); return { from: f, to: t }; }
  if (p.label === '上個月') return { from: new Date(p.from.getFullYear(), p.from.getMonth() - 1, 1), to: p.from };
  return { from: new Date(+p.from - len), to: p.from };
}

function dailyIn(p, filterFn, key = 'total') {
  const out = [];
  for (let d = startOfDay(p.from); d < p.to && d <= new Date(); d = addDays(d, 1)) {
    const list = store.ordersBetween(d, addDays(d, 1)).filter(filterFn);
    out.push({ date: d, value: key === 'count' ? list.length : key === 'qty' ? list.reduce((s, o) => s + o.items.reduce((a, b) => a + b.qty, 0), 0) : sumBy(list, key), orders: list.length });
  }
  return out;
}

// 主函式：回傳 { intent, text, highlight, option, period, table, stats[] }
export function answer(qRaw) {
  const q = (qRaw || '').trim().replace(/[？?！!。．\s]+$/g, '');
  const prod = findProduct(q);
  const ch = findChannel(q);
  const filt = (o) => (!ch || o.channel === ch.id) && (!prod || o.items.some(it => it.pid === prod.id));
  const lineRev = (o) => prod ? o.items.filter(i => i.pid === prod.id).reduce((s, i) => s + i.qty * i.price, 0) : o.total;
  const scope = `${ch ? ch.name + ' ' : ''}${prod ? prod.name + ' ' : ''}`;

  // 1. 庫存
  if (/庫存|缺貨|補貨|存貨|不足|賣完/.test(q)) {
    const inv = store.inventory();
    const low = inv.filter(p => p.low);
    const today = startOfDay(new Date());
    return {
      intent: '庫存查詢', table: '庫存資料表', period: { from: today, to: today, label: '截至今日' },
      text: low.length ? `目前有 ${low.length} 項商品低於安全庫存：${low.map(p => `${p.name}（剩 ${p.current}，安全量 ${p.safety}）`).join('、')}。建議今天備料，AI 已草擬補貨清單。` : '目前所有商品庫存都高於安全量，暫時不需要補貨。',
      highlight: { label: '低庫存品項', value: low.length, suffix: ' 項' },
      stats: [['庫存總件數', inv.reduce((s, p) => s + p.current, 0) + ' 件'], ['最低庫存', inv.slice().sort((a, b) => a.current / a.safety - b.current / b.safety)[0].name]],
      option: inventoryOption(inv),
    };
  }
  // 2. 毛利
  if (/毛利|利潤|賺了?多少|獲利|成本/.test(q)) {
    const now = new Date();
    const months = [2, 1, 0].map(k => {
      const f = new Date(now.getFullYear(), now.getMonth() - k, 1); const t = k ? new Date(now.getFullYear(), now.getMonth() - k + 1, 1) : addDays(startOfDay(now), 1);
      const list = store.ordersBetween(f, t); const net = sumBy(list, 'net'), cost = sumBy(list, 'cost');
      return { label: `${f.getMonth() + 1} 月${k ? '' : '（至今）'}`, net, cost, margin: net ? (net - cost) / net * 100 : 0, from: f, to: t };
    });
    const cur = months[2], prev = months[1];
    return {
      intent: '毛利分析', table: '訂單資料表＋成本資料表', period: { from: months[0].from, to: cur.to, label: '近三個月' },
      text: `這個月毛利率為 ${cur.margin.toFixed(1)}%，毛利 ${money(cur.net - cur.cost)}；上個月為 ${prev.margin.toFixed(1)}%（${cur.margin >= prev.margin ? '提升' : '下降'} ${Math.abs(cur.margin - prev.margin).toFixed(1)} 個百分點）。主要成本來自鮮奶油與冷藏物流。`,
      highlight: { label: '本月毛利率', value: cur.margin, suffix: '%', decimals: 1 },
      stats: [['本月毛利', money(cur.net - cur.cost)], ['本月成本', money(cur.cost)]],
      option: marginOption(months),
    };
  }
  // 3. 應收
  if (/應收|未付|沒付|欠款|催款/.test(q)) {
    const list = store.orders.filter(o => o.status === 'pending');
    const p = { from: list.length ? new Date(list[0].ts) : new Date(), to: new Date(), label: '未結清' };
    return {
      intent: '應收帳款', table: '訂單資料表', period: p,
      text: `目前有 ${list.length} 筆訂單待付款，應收帳款合計 ${money(sumBy(list, 'total'))}。AI 已自動傳送付款提醒，最久的一筆是 ${list[0] ? fmtMD(list[0].ts) : '—'} 的訂單。`,
      highlight: { label: '應收帳款', value: sumBy(list, 'total'), prefix: 'NT$ ' },
      stats: [['待付款筆數', list.length + ' 筆'], ['平均金額', money(list.length ? sumBy(list, 'total') / list.length : 0)]],
      option: channelOption(list),
    };
  }
  // 4. 稅
  if (/稅/.test(q)) {
    const now = new Date(); const sm = now.getMonth() - now.getMonth() % 2;
    const p = { from: new Date(now.getFullYear(), sm, 1), to: addDays(startOfDay(now), 1), label: `${sm + 1}–${sm + 2} 月` };
    const list = store.ordersBetween(p.from, p.to);
    const buys = store.purchases.filter(b => b.ts >= +p.from && b.ts < +p.to);
    const out = sumBy(list, 'tax'), inn = buys.reduce((s, b) => s + b.tax, 0);
    return {
      intent: '營業稅試算', table: '訂單資料表＋進項憑證', period: p,
      text: `本期（${p.label}）截至今日銷項稅額 ${money(out)}，進項稅額 ${money(inn)}，試算應納營業稅約 ${money(Math.max(0, out - inn))}（示範試算）。`,
      highlight: { label: '試算應納稅額', value: Math.max(0, out - inn), prefix: 'NT$ ' },
      stats: [['銷項稅額', money(out)], ['進項稅額', money(inn)]],
      option: monthBarOption(dailyIn(p, () => true, 'tax'), { color: '#F0A531', label: '銷項稅額' }),
    };
  }
  // 5. 通路比例
  if (/通路|管道|渠道|比例|佔比|占比|來源|分布|分佈/.test(q) && !/時段|國家|語言/.test(q)) {
    const p = parsePeriod(q, '30d');
    const list = store.ordersBetween(p.from, p.to).filter(o => !prod || o.items.some(i => i.pid === prod.id));
    const sums = CHANNELS.map(c => ({ c, v: sumBy(list.filter(o => o.channel === c.id), 'total') })).sort((a, b) => b.v - a.v);
    const total = sumBy(list, 'total');
    return {
      intent: '通路營收比例', table: '訂單資料表', period: p,
      text: `${p.label}${prod ? prod.name : ''}營收 ${money(total)}，最大通路是 ${sums[0].c.name}（${(sums[0].v / total * 100).toFixed(1)}%），其次是 ${sums[1].c.name}（${(sums[1].v / total * 100).toFixed(1)}%）。海外通訊軟體（WhatsApp、Zalo）合計占 ${((sums.filter(s => ['whatsapp', 'zalo'].includes(s.c.id)).reduce((a, b) => a + b.v, 0)) / total * 100).toFixed(1)}%。`,
      highlight: { label: `${sums[0].c.name} 占比`, value: sums[0].v / total * 100, suffix: '%', decimals: 1 },
      stats: [['總營收', money(total)], ['訂單數', list.length + ' 筆']],
      option: channelOption(list, { legend: true }),
    };
  }
  // 6. 時段
  if (/時段|幾點|什麼時候|哪個時間|尖峰|高峰/.test(q)) {
    const p = parsePeriod(q, '30d');
    const list = store.ordersBetween(p.from, p.to).filter(filt);
    const byH = {}; list.forEach(o => { const h = new Date(o.ts).getHours(); byH[h] = (byH[h] || 0) + 1; });
    const top = Object.entries(byH).sort((a, b) => b[1] - a[1]).slice(0, 2);
    return {
      intent: '下單時段分析', table: '訂單資料表', period: p,
      text: `${p.label}${scope}最熱門的下單時段是 ${top[0][0]}:00（${top[0][1]} 筆），其次是 ${top[1][0]}:00。晚上 8–10 點是線上訊息高峰，AI 客服會自動接住這段時間的詢問。`,
      highlight: { label: '尖峰時段', value: +top[0][0], suffix: ':00' },
      stats: [['訂單數', list.length + ' 筆'], ['尖峰訂單', top[0][1] + ' 筆']],
      option: heatmapOption(list),
    };
  }
  // 7. 國家／語言
  if (/國家|語言|外國|海外|日本客|國外|越南|馬來西亞|客群/.test(q)) {
    const p = parsePeriod(q, '30d');
    const list = store.ordersBetween(p.from, p.to);
    const by = {}; list.forEach(o => { by[o.lang] = (by[o.lang] || 0) + o.total; });
    const total = sumBy(list, 'total');
    const data = Object.entries(by).map(([k, v], i) => ({ name: LANG_LABEL[k] || k, value: v, itemStyle: { color: PALETTE[i] } })).sort((a, b) => b.value - a.value);
    const foreign = total - (by.zh || 0);
    return {
      intent: '客群語言分析', table: '訂單資料表', period: p,
      text: `${p.label}外語客人貢獻營收 ${money(foreign)}（${(foreign / total * 100).toFixed(1)}%），其中日文客人最多。這些訂單都由 AI 以客人母語自動回覆完成。`,
      highlight: { label: '外語客營收占比', value: foreign / total * 100, suffix: '%', decimals: 1 },
      stats: [['日文客營收', money(by.ja || 0)], ['英文客營收', money(by.en || 0)]],
      option: { tooltip: { trigger: 'item' }, legend: { bottom: 0 }, series: [{ type: 'pie', roseType: 'radius', radius: ['18%', '72%'], center: ['50%', '46%'], itemStyle: { borderRadius: 8 }, label: { color: '#eafff4', formatter: '{b}\n{d}%' }, data }] },
    };
  }
  // 8. 熱銷商品
  if (/(哪|什麼|甚麼).{0,4}(商品|產品|品項|甜點|東西|蛋糕)|賣最好|賣得最好|最好賣|熱銷|暢銷|排行|排名|top|冠軍|人氣/i.test(q)) {
    const p = parsePeriod(q, '30d');
    const list = store.ordersBetween(p.from, p.to).filter(o => !ch || o.channel === ch.id);
    const byQty = /數量|幾盒|幾個|件數/.test(q);
    const sums = {}; list.forEach(o => o.items.forEach(i => { sums[i.pid] = (sums[i.pid] || 0) + (byQty ? i.qty : i.qty * i.price); }));
    const rank = PRODUCTS.map(pp => ({ p: pp, v: sums[pp.id] || 0 })).sort((a, b) => b.v - a.v);
    const qty = {}; list.forEach(o => o.items.forEach(i => { qty[i.pid] = (qty[i.pid] || 0) + i.qty; }));
    return {
      intent: '熱銷商品排行', table: '訂單資料表', period: p,
      text: `${p.label}${ch ? ch.name + ' 通路' : ''}賣最好的是「${rank[0].p.name}」，${byQty ? `共 ${rank[0].v} 盒` : `營收 ${money(rank[0].v)}，共 ${qty[rank[0].p.id] || 0} 盒`}；第二名是「${rank[1].p.name}」，第三名是「${rank[2].p.name}」。`,
      highlight: { label: '冠軍商品', text: rank[0].p.name },
      stats: [['冠軍營收', money(byQty ? rank[0].v * rank[0].p.price : rank[0].v)], ['商品數', PRODUCTS.length + ' 款']],
      option: productOption(list, { metric: byQty ? 'qty' : 'revenue' }),
    };
  }
  // 9. 比較／成長
  if (/比較|成長|衰退|比上|跟上|相比|差多少/.test(q)) {
    const now = new Date();
    const cur = parsePeriod('這個月'); const prev = prevPeriod(cur);
    const a = store.ordersBetween(cur.from, cur.to).filter(filt), b = store.ordersBetween(prev.from, prev.to).filter(filt);
    const va = sumBy(a, 'total'), vb = sumBy(b, 'total');
    return {
      intent: '期間比較', table: '訂單資料表', period: { from: prev.from, to: cur.to, label: '本月 vs 上月同期' },
      text: `${scope}本月至今營收 ${money(va)}，上月同期 ${money(vb)}，${va >= vb ? '成長' : '減少'} ${Math.abs(pct(va, vb)).toFixed(1)}%。`,
      highlight: { label: '成長率', value: pct(va, vb), suffix: '%', decimals: 1 },
      stats: [['本月訂單', a.length + ' 筆'], ['上月同期', b.length + ' 筆']],
      option: { tooltip: { trigger: 'axis' }, grid: { left: 8, right: 8, top: 20, bottom: 4, containLabel: true }, xAxis: { type: 'category', data: [`上月同期（${now.getMonth()} 月）`, `本月至今（${now.getMonth() + 1} 月）`] }, yAxis: { type: 'value' },
        series: [{ type: 'bar', barWidth: 70, data: [{ value: vb, itemStyle: { color: '#2E97D4', borderRadius: [10, 10, 0, 0] } }, { value: va, itemStyle: { color: '#2DB674', borderRadius: [10, 10, 0, 0] } }], label: { show: true, position: 'top', color: '#eafff4', formatter: p => 'NT$ ' + p.value.toLocaleString() } }] },
    };
  }
  // 10. 趨勢
  if (/趨勢|走勢|變化|每天|每日|曲線|折線/.test(q)) {
    const p = parsePeriod(q, '30d');
    const series = dailyIn(p, filt).map(d => ({ ...d, value: store.ordersBetween(d.date, addDays(d.date, 1)).filter(filt).reduce((s, o) => s + lineRev(o), 0) }));
    const total = series.reduce((s, d) => s + d.value, 0);
    const half = Math.floor(series.length / 2);
    const first = series.slice(0, half).reduce((s, d) => s + d.value, 0), second = series.slice(half).reduce((s, d) => s + d.value, 0);
    const best = series.reduce((a, b) => (b.value > a.value ? b : a), series[0]);
    return {
      intent: '營收趨勢', table: '訂單資料表', period: p,
      text: `${p.label}${scope}營收合計 ${money(total)}，日平均 ${money(total / series.length)}。後半段比前半段${second >= first ? '成長' : '減少'} ${Math.abs(pct(second, first)).toFixed(1)}%，單日最高是 ${fmtMD(best.date)}（${money(best.value)}），週末明顯較高。`,
      highlight: { label: '期間營收', value: total, prefix: 'NT$ ' },
      stats: [['日平均', money(total / series.length)], ['最高單日', fmtMD(best.date)]],
      option: trendOption(series, { ma: true }),
    };
  }
  // 11. 訂單數
  if (/訂單|幾筆|多少單|幾單|單量/.test(q) && !/營收|業績|金額/.test(q)) {
    const p = parsePeriod(q, 'month');
    const series = dailyIn(p, filt, 'count');
    const n = series.reduce((s, d) => s + d.value, 0);
    return {
      intent: '訂單數', table: '訂單資料表', period: p,
      text: `${p.label}${scope}共有 ${n} 筆訂單，平均每天 ${(n / series.length).toFixed(1)} 筆，其中 ${Math.round(n * 0.82)} 筆由 AI 自動完成接單。`,
      highlight: { label: '訂單數', value: n, suffix: ' 筆' },
      stats: [['日平均', (n / series.length).toFixed(1) + ' 筆'], ['AI 自動接單', '約 82%']],
      option: monthBarOption(series.map(d => d), { color: '#7C62E6', label: '訂單數' }),
    };
  }
  // 12. 營收（預設）
  if (/營收|業績|營業額|收入|賣了?多少|銷售額|賺|多少錢/.test(q) || prod || ch) {
    const p = parsePeriod(q, 'month');
    const list = store.ordersBetween(p.from, p.to).filter(filt);
    const total = list.reduce((s, o) => s + lineRev(o), 0);
    const prev = prevPeriod(p);
    const plist = store.ordersBetween(prev.from, prev.to).filter(filt);
    const ptotal = plist.reduce((s, o) => s + lineRev(o), 0);
    const series = dailyIn(p, filt).map(d => ({ ...d, value: store.ordersBetween(d.date, addDays(d.date, 1)).filter(filt).reduce((s, o) => s + lineRev(o), 0) }));
    const range = `${fmtMD(p.from)}–${fmtMD(addDays(p.to, -1))}`;
    return {
      intent: '營收查詢', table: '訂單資料表', period: p,
      text: `${p.label}（${range}）${scope}營收為 ${money(total)}，共 ${list.length} 筆訂單，客單價 ${money(list.length ? total / list.length : 0)}；比前一期${total >= ptotal ? '成長' : '減少'} ${Math.abs(pct(total, ptotal)).toFixed(1)}%。`,
      highlight: { label: `${p.label}營收`, value: total, prefix: 'NT$ ' },
      stats: [['訂單數', list.length + ' 筆'], ['客單價', money(list.length ? total / list.length : 0)]],
      option: series.length > 1 ? monthBarOption(series) : channelOption(list),
    };
  }
  return null;
}

export const EXAMPLES = ['這個月營收多少？', '上個月哪個商品賣最好？', '各通路營收比例', '最近 30 天營收趨勢', '毛利率', '哪些商品庫存不足？', '什麼時段訂單最多？', '外國客人占多少？', '跟上個月比成長多少？', '還有哪些訂單沒付款？'];
export { fmtDate };
