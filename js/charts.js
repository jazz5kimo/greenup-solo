// ECharts 主題與共用圖表選項
import { CHANNELS, PRODUCTS, PRODUCT_MAP } from './data.js';
const echarts = window.echarts;

export const PALETTE = ['#2DB674', '#F0A531', '#2E97D4', '#7C62E6', '#EC6A55', '#DD5597', '#5EE0C4'];
const TXT = 'rgba(214,240,226,0.72)';
const LINE = 'rgba(255,255,255,0.07)';

echarts.registerTheme('greenup', {
  color: PALETTE,
  backgroundColor: 'transparent',
  textStyle: { fontFamily: 'inherit', color: TXT },
  title: { textStyle: { color: '#eafff4' } },
  legend: { textStyle: { color: TXT } },
  tooltip: {
    backgroundColor: 'rgba(6,26,19,0.92)', borderColor: 'rgba(45,182,116,0.45)', borderWidth: 1,
    textStyle: { color: '#eafff4', fontSize: 12 }, extraCssText: 'backdrop-filter: blur(8px); border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,.4);',
  },
  categoryAxis: { axisLine: { lineStyle: { color: LINE } }, axisTick: { show: false }, axisLabel: { color: TXT }, splitLine: { show: false } },
  valueAxis: { axisLine: { show: false }, axisLabel: { color: TXT }, splitLine: { lineStyle: { color: LINE, type: 'dashed' } } },
});

const charts = new Set();
export function makeChart(node) {
  const c = echarts.init(node, 'greenup', { renderer: 'canvas' });
  charts.add(c);
  return c;
}
export function resizeAll() { for (const c of charts) { try { c.resize(); } catch { /* ignore */ } } }
window.addEventListener('resize', () => resizeAll());

const grad = (c1, c2) => new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: c1 }, { offset: 1, color: c2 }]);
const hgrad = (c1, c2) => new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: c1 }, { offset: 1, color: c2 }]);
const fmtK = (v) => v >= 10000 ? (v / 10000).toFixed(v >= 100000 ? 0 : 1) + '萬' : v.toLocaleString();

export function trendOption(series, { title = '', color = '#2DB674', ma = true } = {}) {
  const x = series.map(d => `${d.date.getMonth() + 1}/${d.date.getDate()}`);
  const y = series.map(d => d.value);
  const avg = y.map((_, i) => { const s = y.slice(Math.max(0, i - 6), i + 1); return Math.round(s.reduce((a, b) => a + b, 0) / s.length); });
  return {
    animationDuration: 1400, animationEasing: 'cubicOut',
    grid: { left: 8, right: 16, top: title ? 40 : 24, bottom: 4, containLabel: true },
    title: title ? { text: title, left: 0, top: 0, textStyle: { fontSize: 13, fontWeight: 500, color: TXT } } : undefined,
    tooltip: { trigger: 'axis', valueFormatter: v => 'NT$ ' + Number(v).toLocaleString() },
    legend: ma ? { right: 0, top: 0, itemWidth: 14, itemHeight: 4, data: ['每日營收', '7 日均線'] } : undefined,
    xAxis: { type: 'category', data: x, boundaryGap: false, axisLabel: { interval: Math.ceil(x.length / 10) - 1 } },
    yAxis: { type: 'value', axisLabel: { formatter: fmtK } },
    series: [
      { name: '每日營收', type: 'line', data: y, smooth: 0.35, symbol: 'circle', symbolSize: 6, showSymbol: false,
        lineStyle: { width: 3, color, shadowColor: color, shadowBlur: 14 }, itemStyle: { color },
        areaStyle: { color: grad(color + '88', color + '00') } },
      ...(ma ? [{ name: '7 日均線', type: 'line', data: avg, smooth: true, symbol: 'none', lineStyle: { width: 2, type: 'dashed', color: '#F0A531' }, itemStyle: { color: '#F0A531' } }] : []),
    ],
  };
}

export function channelOption(orders, { center = ['50%', '54%'], radius = ['52%', '74%'], legend = true } = {}) {
  const sums = {};
  for (const o of orders) sums[o.channel] = (sums[o.channel] || 0) + o.total;
  const data = CHANNELS.map(c => ({ name: c.name, value: sums[c.id] || 0, itemStyle: { color: c.color } })).filter(d => d.value > 0);
  const total = data.reduce((s, d) => s + d.value, 0);
  return {
    animationDuration: 1300,
    tooltip: { trigger: 'item', formatter: p => `${p.marker}${p.name}<br/><b>NT$ ${p.value.toLocaleString()}</b>（${p.percent}%）` },
    legend: legend ? { orient: 'vertical', right: 4, top: 'middle', itemWidth: 10, itemHeight: 10, icon: 'circle', textStyle: { fontSize: 12 },
      formatter: n => { const d = data.find(x => x.name === n); return `${n}  ${total ? Math.round(d.value / total * 100) : 0}%`; } } : undefined,
    title: { text: fmtK(total), subtext: '營收合計', left: legend ? '34%' : 'center', top: '45%', textAlign: 'center', textVerticalAlign: 'middle',
      textStyle: { fontSize: 20, color: '#eafff4', fontWeight: 700 }, subtextStyle: { color: TXT, fontSize: 11 } },
    series: [{ type: 'pie', radius, center: legend ? ['34%', '54%'] : center, padAngle: 2, itemStyle: { borderRadius: 6, borderColor: 'rgba(6,26,19,.6)', borderWidth: 1 },
      label: { show: false }, emphasis: { scale: true, scaleSize: 8, itemStyle: { shadowBlur: 20, shadowColor: 'rgba(0,0,0,.5)' } }, data }],
  };
}

export function productOption(orders, { metric = 'revenue', highlightTop = true } = {}) {
  const sums = {};
  for (const o of orders) for (const it of o.items) sums[it.pid] = (sums[it.pid] || 0) + (metric === 'qty' ? it.qty : it.qty * it.price);
  const rows = PRODUCTS.map(p => ({ name: p.name, value: sums[p.id] || 0, color: p.accent })).sort((a, b) => a.value - b.value);
  const max = Math.max(...rows.map(r => r.value));
  return {
    animationDuration: 1300, animationDelay: i => i * 80,
    grid: { left: 4, right: 56, top: 6, bottom: 0, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: v => metric === 'qty' ? v + ' 盒' : 'NT$ ' + v.toLocaleString() },
    xAxis: { type: 'value', show: false },
    yAxis: { type: 'category', data: rows.map(r => r.name), axisLabel: { color: '#d6f0e2', fontSize: 12 }, axisLine: { show: false } },
    series: [{ type: 'bar', data: rows.map(r => ({ value: r.value, itemStyle: { color: hgrad((r.value === max && highlightTop ? '#F0A531' : '#2DB674') + '33', r.value === max && highlightTop ? '#F0A531' : '#2DB674'), borderRadius: [0, 8, 8, 0] } })),
      barWidth: '58%', showBackground: true, backgroundStyle: { color: 'rgba(255,255,255,0.03)', borderRadius: [0, 8, 8, 0] },
      label: { show: true, position: 'right', color: '#eafff4', fontSize: 11, formatter: p => metric === 'qty' ? p.value + ' 盒' : fmtK(p.value) } }],
  };
}

export function heatmapOption(orders) {
  const days = ['日', '一', '二', '三', '四', '五', '六'];
  const hours = Array.from({ length: 16 }, (_, i) => i + 8);
  const grid = {};
  for (const o of orders) { const d = new Date(o.ts); const h = d.getHours(); if (h < 8) continue; const k = d.getDay() + '-' + h; grid[k] = (grid[k] || 0) + 1; }
  const data = [];
  let max = 1;
  for (let d = 0; d < 7; d++) for (const h of hours) { const v = grid[d + '-' + h] || 0; max = Math.max(max, v); data.push([hours.indexOf(h), d, v]); }
  return {
    animationDuration: 1000,
    grid: { left: 4, right: 8, top: 8, bottom: 30, containLabel: true },
    tooltip: { formatter: p => `週${days[p.value[1]]} ${hours[p.value[0]]}:00<br/><b>${p.value[2]} 筆訂單</b>` },
    xAxis: { type: 'category', data: hours.map(h => h + '時'), splitArea: { show: false }, axisLabel: { fontSize: 10, interval: 1 } },
    yAxis: { type: 'category', data: days.map(d => '週' + d), axisLabel: { fontSize: 11 } },
    visualMap: { min: 0, max, calculable: false, orient: 'horizontal', left: 'center', bottom: 0, itemWidth: 10, itemHeight: 120, textStyle: { color: TXT, fontSize: 10 },
      inRange: { color: ['rgba(45,182,116,0.06)', '#1d7a52', '#2DB674', '#F0A531', '#EC6A55'] } },
    series: [{ type: 'heatmap', data, itemStyle: { borderRadius: 4, borderColor: 'rgba(6,26,19,.9)', borderWidth: 2 }, emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(240,165,49,.6)' } } }],
  };
}

export function inventoryOption(inv) {
  const rows = [...inv].sort((a, b) => a.current / a.safety - b.current / b.safety);
  return {
    animationDuration: 1200,
    grid: { left: 4, right: 20, top: 30, bottom: 4, containLabel: true },
    legend: { top: 0, right: 0, data: ['目前庫存', '安全庫存'] },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'category', data: rows.map(r => r.name), axisLabel: { color: '#d6f0e2', interval: 0, fontSize: 11 } },
    yAxis: { type: 'value' },
    series: [
      { name: '目前庫存', type: 'bar', barWidth: '42%', data: rows.map(r => ({ value: r.current, itemStyle: { borderRadius: [8, 8, 0, 0], color: grad(r.low ? '#EC6A55' : '#2DB674', (r.low ? '#EC6A55' : '#2DB674') + '22') } })),
        label: { show: true, position: 'top', color: '#eafff4', formatter: p => rows[p.dataIndex].low ? `${p.value} 不足` : p.value } },
      { name: '安全庫存', type: 'line', data: rows.map(r => r.safety), symbol: 'diamond', symbolSize: 10, lineStyle: { type: 'dashed', color: '#F0A531' }, itemStyle: { color: '#F0A531' } },
    ],
  };
}

export function marginOption(months) {
  return {
    animationDuration: 1300,
    grid: { left: 8, right: 8, top: 36, bottom: 4, containLabel: true },
    legend: { top: 0, right: 0 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: months.map(m => m.label) },
    yAxis: [{ type: 'value', axisLabel: { formatter: fmtK } }, { type: 'value', min: 0, max: 100, axisLabel: { formatter: '{value}%' }, splitLine: { show: false } }],
    series: [
      { name: '銷貨收入（未稅）', type: 'bar', barWidth: 26, data: months.map(m => m.net), itemStyle: { borderRadius: [6, 6, 0, 0], color: grad('#2E97D4', '#2E97D422') } },
      { name: '銷貨成本', type: 'bar', barWidth: 26, data: months.map(m => m.cost), itemStyle: { borderRadius: [6, 6, 0, 0], color: grad('#7C62E6', '#7C62E622') } },
      { name: '毛利率', type: 'line', yAxisIndex: 1, data: months.map(m => +m.margin.toFixed(1)), smooth: true, symbolSize: 10, lineStyle: { width: 3, color: '#2DB674' }, itemStyle: { color: '#2DB674' },
        label: { show: true, formatter: '{c}%', color: '#eafff4', position: 'top' } },
    ],
  };
}

export function gaugeOption(value, name = '毛利率') {
  return {
    series: [{ type: 'gauge', startAngle: 210, endAngle: -30, min: 0, max: 100, radius: '92%', center: ['50%', '58%'],
      progress: { show: true, width: 16, roundCap: true, itemStyle: { color: hgrad('#2E97D4', '#2DB674'), shadowBlur: 16, shadowColor: '#2DB67488' } },
      axisLine: { lineStyle: { width: 16, color: [[1, 'rgba(255,255,255,0.06)']] }, roundCap: true },
      axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false }, pointer: { show: false },
      title: { offsetCenter: [0, '34%'], color: TXT, fontSize: 13 },
      detail: { valueAnimation: true, offsetCenter: [0, '-4%'], formatter: '{value}%', color: '#eafff4', fontSize: 34, fontWeight: 700 },
      data: [{ value: +value.toFixed(1), name }] }],
  };
}

export function monthBarOption(series, { color = '#2DB674', label = '營收' } = {}) {
  return {
    animationDuration: 1200, animationDelay: i => i * 30,
    grid: { left: 8, right: 8, top: 16, bottom: 4, containLabel: true },
    tooltip: { trigger: 'axis', valueFormatter: v => 'NT$ ' + Number(v).toLocaleString() },
    xAxis: { type: 'category', data: series.map(d => `${d.date.getMonth() + 1}/${d.date.getDate()}`) },
    yAxis: { type: 'value', axisLabel: { formatter: fmtK } },
    series: [{ name: label, type: 'bar', data: series.map(d => d.value), barWidth: '60%', itemStyle: { borderRadius: [6, 6, 0, 0], color: grad(color, color + '22') } }],
  };
}

export { PRODUCT_MAP, fmtK };
