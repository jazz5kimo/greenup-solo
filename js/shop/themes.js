// 銷售網頁風格（CSS 變數）＋自動換風格規則（節慶日期、夜間時段）
// 所有節慶日期為 2026–2027 示範值，可在後台「網站設計工作室」編輯（存在 shop-config 的 schedule 欄位）。
import { mix } from '../merchant-art.js';
import { BIZ } from '../biz/index.js';

const N = (zh, en, ja, vi, ms) => ({ zh, en, ja, vi, ms });

// vars：只需定義主要色，其他由 themeVars() 推導
// hero：3D 主視覺配色（物件色票、粒子色、燈光）
export const THEMES = [
  { id: 'cream', kind: 'base', name: N('奶油森林', 'Cream Forest', 'クリームの森', 'Rừng kem', 'Hutan Krim'), deco: null,
    vars: { cream: '#fbf6ee', cream2: '#f5ecdf', ink: '#1f3329', ink2: '#5b6b62', ink3: '#8a978f', rose: '#e8708e', g: '#1f8f5a', gl: '#2DB674', card: '#ffffff', deep: '#0c3326', deep2: '#10293a', heroA: '#ffe1ea', heroB: '#e3f5ea', heroC: '#fff0c8', btn: '#1f3329' },
    hero: { pal: ['#f7b2c4', '#b8e0c8', '#f9dc82', '#c9b6ec', '#ffc8a2', '#a8dadc'], dots: ['#f7b2c4', '#2DB674', '#F0A531', '#7C62E6', '#2E97D4', '#ffffff'], sky: '#fff4e6', ground: '#f0c8d8', point: '#ffb0c8' } },
  { id: 'roast', kind: 'base', style: { font: 'serif', radius: 'soft', hero: 'split', button: 'solid', texture: 'paper' }, name: N('深焙咖啡', 'Dark Roast', 'ダークロースト', 'Rang đậm', 'Panggang Gelap'), deco: 'steam',
    vars: { cream: '#f6efe6', cream2: '#ebdccb', ink: '#2b1d14', ink2: '#6b5646', ink3: '#9a8676', rose: '#c8743a', g: '#7a4a2a', gl: '#b5793f', card: '#fffaf4', deep: '#2b1a10', deep2: '#4a2c1a', heroA: '#f0d3b0', heroB: '#e8dccd', heroC: '#f7e2c0', btn: '#3b2416' },
    hero: { pal: ['#6b3e26', '#c98b5b', '#e8c07d', '#3b2416', '#f2d3a0', '#8c5a3c'], dots: ['#6b3e26', '#e8c07d', '#c98b5b', '#ffffff', '#3b2416'], sky: '#fff1df', ground: '#c9a07a', point: '#ffc890' } },
  { id: 'leather', kind: 'base', style: { font: 'serif', radius: 'sharp', hero: 'minimal', button: 'outline', texture: 'grain' }, name: N('皮革工坊', 'Leather Atelier', 'レザー工房', 'Xưởng da', 'Bengkel Kulit'), deco: null,
    vars: { cream: '#f5efe6', cream2: '#e9ddcb', ink: '#2e2218', ink2: '#6a5a4a', ink3: '#9b8b78', rose: '#b5674d', g: '#8b5a34', gl: '#a8743f', card: '#fffcf7', deep: '#3a2616', deep2: '#5a3418', heroA: '#ecd3b4', heroB: '#e6dccb', heroC: '#f2e3c8', btn: '#3e2e1a' },
    hero: { pal: ['#a0612e', '#c68b59', '#7d8c5a', '#5a3418', '#e9d3b4', '#b5674d'], dots: ['#d9b25f', '#a0612e', '#e9d3b4', '#ffffff'], sky: '#fff3e2', ground: '#b98a5e', point: '#ffd9a0' } },
  { id: 'bloom', kind: 'base', style: { font: 'round', radius: 'round', hero: 'center', button: 'pill', texture: 'dots' }, name: N('花漾', 'Blossom', '花ざかり', 'Hoa nở', 'Mekar'), deco: 'petal',
    vars: { cream: '#fff6f7', cream2: '#fde6ea', ink: '#3a1f2b', ink2: '#7a5866', ink3: '#a8919b', rose: '#e86f8b', g: '#c2456a', gl: '#e86f8b', card: '#ffffff', deep: '#4a1d33', deep2: '#6b2a48', heroA: '#ffd1dc', heroB: '#e6f2df', heroC: '#fff0c8', btn: '#3a1f2b' },
    hero: { pal: ['#f2a7b8', '#e86f8b', '#b79ad9', '#ffd27a', '#ffffff', '#7fb77e'], dots: ['#f2a7b8', '#e86f8b', '#ffffff', '#b79ad9', '#7fb77e'], sky: '#fff0f3', ground: '#f6c6d2', point: '#ff9fb8' } },
  { id: 'blush', kind: 'base', style: { font: 'sans', radius: 'pill', hero: 'split', button: 'pill', texture: 'none' }, name: N('粉霧', 'Blush Mist', 'ピンクミスト', 'Hồng phấn', 'Kabus Merah Jambu'), deco: 'sparkle',
    vars: { cream: '#faf3f4', cream2: '#f0e3e6', ink: '#3b3038', ink2: '#75676f', ink3: '#a3959c', rose: '#d98ba6', g: '#a5577a', gl: '#c98aa6', card: '#fffdfd', deep: '#3e2c3a', deep2: '#5b4256', heroA: '#f3d6df', heroB: '#e8e0f0', heroC: '#f8e8e0', btn: '#3b3038' },
    hero: { pal: ['#e8b4c4', '#f7e7e1', '#b79ad9', '#d9d4cc', '#f0a5bd', '#ffffff'], dots: ['#e8b4c4', '#ffffff', '#b79ad9', '#f0d0dc'], sky: '#fff5f8', ground: '#e8c8d8', point: '#ffc0d8' } },
  { id: 'herb', kind: 'base', style: { font: 'condensed', radius: 'soft', hero: 'banner', button: 'block', texture: 'lines' }, name: N('香草綠', 'Fresh Herb', 'ハーブグリーン', 'Xanh rau thơm', 'Hijau Herba'), deco: 'leaf',
    vars: { cream: '#f3f7ee', cream2: '#e4eedb', ink: '#1e3322', ink2: '#52664f', ink3: '#849580', rose: '#e07a3f', g: '#2f7d4f', gl: '#5aa469', card: '#ffffff', deep: '#173b25', deep2: '#22502f', heroA: '#e0f0cf', heroB: '#fdf3d0', heroC: '#f8dcc8', btn: '#1e3322' },
    hero: { pal: ['#e9c46a', '#6fa36b', '#c0392b', '#f4e3b1', '#4f9a5e', '#d99a4e'], dots: ['#6fa36b', '#e9c46a', '#c0392b', '#ffffff'], sky: '#fbffe8', ground: '#b9d8a0', point: '#ffd08a' } },
  { id: 'night', kind: 'base', dark: true, name: N('夜間模式', 'Night', 'ナイト', 'Ban đêm', 'Malam'), deco: 'star',
    vars: { cream: '#0f1720', cream2: '#1a2532', ink: '#e8eef3', ink2: '#aab6c2', ink3: '#7d8a97', rose: '#ff8fab', g: '#5ee0c4', gl: '#2DB674', card: '#18232f', deep: '#060b10', deep2: '#10233a', heroA: '#1d3a4a', heroB: '#2a1f3f', heroC: '#10302a', btn: '#2DB674' },
    hero: { pal: ['#5ee0c4', '#7c62e6', '#2e97d4', '#ff8fab', '#f9dc82', '#2DB674'], dots: ['#5ee0c4', '#ffffff', '#7c62e6', '#f9dc82'], sky: '#9ec8ff', ground: '#1d2a44', point: '#7c62e6', dim: true } },
  // ── 節慶 ──
  { id: 'midautumn', kind: 'festival', dark: true, name: N('中秋', 'Mid-Autumn', '中秋', 'Trung thu', 'Pertengahan Musim Luruh'), deco: 'lantern',
    vars: { cream: '#0f1833', cream2: '#18244a', ink: '#f6eedb', ink2: '#cdc4ad', ink3: '#958f7f', rose: '#f2b33d', g: '#f2b33d', gl: '#f7c75c', card: '#19244a', deep: '#070d1f', deep2: '#1d2a55', heroA: '#4a3f2a', heroB: '#243a77', heroC: '#3a2a5a', btn: '#f2b33d', btnInk: '#1a1206' },
    hero: { pal: ['#f7c75c', '#f2b33d', '#e8743a', '#fff1c4', '#c94f3a', '#f9dc82'], dots: ['#f7c75c', '#fff1c4', '#ffffff', '#e8743a'], sky: '#ffe2a0', ground: '#1d2a55', point: '#ffb347', dim: true } },
  { id: 'xmas', kind: 'festival', name: N('聖誕', 'Christmas', 'クリスマス', 'Giáng sinh', 'Krismas'), deco: 'snow',
    vars: { cream: '#fbf7f2', cream2: '#f1e7dc', ink: '#1d2b22', ink2: '#56655b', ink3: '#8b978f', rose: '#c8303f', g: '#1d6b45', gl: '#2c8c5a', card: '#ffffff', deep: '#14432c', deep2: '#7a1420', heroA: '#ffd9d9', heroB: '#d8eedf', heroC: '#fff2cf', btn: '#c8303f' },
    hero: { pal: ['#c8303f', '#1d6b45', '#f2c14e', '#ffffff', '#e85d6a', '#2c8c5a'], dots: ['#ffffff', '#ffffff', '#c8303f', '#f2c14e', '#2c8c5a'], sky: '#fff6ee', ground: '#cfe6d8', point: '#ff8080' } },
  { id: 'cny', kind: 'festival', name: N('春節', 'Lunar New Year', '旧正月', 'Tết Nguyên Đán', 'Tahun Baru Cina'), deco: 'redlantern',
    vars: { cream: '#fff5ea', cream2: '#fbe3cc', ink: '#3a1410', ink2: '#7a4a3a', ink3: '#a5826f', rose: '#d4232f', g: '#c0262d', gl: '#e0a526', card: '#fffaf3', deep: '#8c1018', deep2: '#b5161f', heroA: '#ffcfb0', heroB: '#ffe7a6', heroC: '#ffd0d0', btn: '#c0262d' },
    hero: { pal: ['#d4232f', '#e0a526', '#f7d27a', '#b5161f', '#ffe7a6', '#ff6a3d'], dots: ['#e0a526', '#d4232f', '#ffe7a6', '#ffffff'], sky: '#fff0d8', ground: '#f0b080', point: '#ff7040' } },
  { id: 'summer', kind: 'festival', name: N('夏日', 'Summer', 'サマー', 'Mùa hè', 'Musim Panas'), deco: 'bubble',
    vars: { cream: '#f1fbfd', cream2: '#dff3f6', ink: '#0f3340', ink2: '#4a6c78', ink3: '#7f9aa3', rose: '#ff7a59', g: '#0c8fa8', gl: '#16b5c9', card: '#ffffff', deep: '#0b4c5f', deep2: '#0f6e7a', heroA: '#bfeff5', heroB: '#fff1b8', heroC: '#ffd6c7', btn: '#0f3340' },
    hero: { pal: ['#16b5c9', '#ffd84d', '#ff7a59', '#ffffff', '#7fe0c8', '#ffb3c1'], dots: ['#16b5c9', '#ffd84d', '#ffffff', '#ff7a59'], sky: '#f0ffff', ground: '#bfeff5', point: '#ffd84d' } },
];
// 前 7 種為核心風格（展示面板常駐）；其後附加 50 種業態各自的風格（biz/index.js）
export const CORE_THEMES = THEMES.filter(t => t.kind === 'base');
for (const b of BIZ) { const t = b && b.theme; if (t && t.id && t.vars && !THEMES.some(x => x.id === t.id)) THEMES.push({ kind: 'base', ...t, biz: true }); }
export const THEME_MAP = Object.fromEntries(THEMES.map(t => [t.id, t]));
export const BASE_THEMES = THEMES.filter(t => t.kind === 'base');
export const FESTIVAL_THEMES = THEMES.filter(t => t.kind === 'festival');

// 預設節慶排程（示範日期，可在後台調整）：中秋 2026/9/25、聖誕、春節 2027/2/6（除夕 2/5）、夏日
export const DEFAULT_SCHEDULE = [
  { theme: 'cny', from: '2026-02-03', to: '2026-03-04', note: '2026 春節（2/17）前後' },
  { theme: 'summer', from: '2026-07-01', to: '2026-08-31', note: '2026 暑假' },
  { theme: 'midautumn', from: '2026-09-11', to: '2026-10-09', note: '2026 中秋（9/25）前後約 2 週' },
  { theme: 'xmas', from: '2026-12-01', to: '2026-12-26', note: '2026 聖誕月' },
  { theme: 'cny', from: '2027-01-22', to: '2027-02-21', note: '2027 春節（2/6）至元宵' },
  { theme: 'summer', from: '2027-07-01', to: '2027-08-31', note: '2027 暑假' },
  { theme: 'midautumn', from: '2027-09-01', to: '2027-09-29', note: '2027 中秋（9/15）前後約 2 週' },
  { theme: 'xmas', from: '2027-12-01', to: '2027-12-26', note: '2027 聖誕月' },
];
export const DEFAULT_NIGHT = { on: true, from: 19, to: 6 };

// 版面設計軸：一律取「業主自己的風格」的 style，節慶／夜間／自訂只換顏色
export const STYLE_AXES = { font: ['sans', 'serif', 'round', 'mono', 'hand', 'condensed'], radius: ['sharp', 'soft', 'round', 'pill'], hero: ['split', 'center', 'banner', 'minimal', 'poster'], grid: ['cards', 'list', 'magazine', 'tiles'], button: ['solid', 'outline', 'pill', 'block'], texture: ['none', 'paper', 'grain', 'dots', 'lines', 'grid'] };
export function styleOf(merchant) { const t = THEME_MAP[merchant?.theme]; return (t && t.style) || {}; }
export const themeName = (theme, lang = 'zh') => (theme && theme.name ? theme.name[lang] || theme.name.en || theme.name.zh : '');

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function nowOf(cfg) {
  if (cfg && cfg.simNow) { const d = new Date(cfg.simNow); if (!isNaN(d)) return d; }
  return new Date();
}
export function getTheme(id, cfg) {
  if (id === 'custom') return cfg && cfg.custom ? customTheme(cfg.custom) : null;
  return THEME_MAP[id] || null;
}

// 決定目前風格：手動 → 指定（完整替換配色）；自動 → 節慶 > 夜間 > 業主預設
// 自動模式的節慶與夜間是「疊加」：保留業主自己的配色與設計軸，只加節慶裝飾／色調，或由業主配色推導深色版
export function baseThemeOf(merchant) { return THEME_MAP[merchant?.theme] || THEME_MAP.cream; }
export function resolveTheme(cfg, merchant, now = nowOf(cfg)) {
  const base = baseThemeOf(merchant);
  if (cfg && cfg.theme && cfg.theme !== 'auto') {
    return { theme: getTheme(cfg.theme, cfg) || base, auto: false, reason: 'manual' };
  }
  const day = ymd(now);
  const sched = (cfg && Array.isArray(cfg.schedule) ? cfg.schedule : DEFAULT_SCHEDULE);
  const night = Object.assign({}, DEFAULT_NIGHT, cfg && cfg.night);
  const h = now.getHours();
  const inNight = !!night.on && (night.from > night.to ? (h >= night.from || h < night.to) : (h >= night.from && h < night.to));
  for (const row of sched) {
    if (row.on === false || !THEME_MAP[row.theme]) continue;
    if (row.from && row.to && day >= row.from && day <= row.to) {
      const ft = THEME_MAP[row.theme];
      // 節慶期間的夜晚：業主配色的深色版＋節慶裝飾
      const b = inNight ? nightVariant(base) : base;
      const theme = ft.kind === 'festival' ? festivalOverlay(b, ft) : ft.id === 'night' ? nightVariant(base) : ft;
      return { theme, auto: true, reason: 'festival', row, night: inNight };
    }
  }
  if (inNight) return { theme: nightVariant(base), auto: true, reason: 'night' };
  return { theme: base, auto: true, reason: 'default' };
}
// 節慶疊加：業主配色＋節慶裝飾＋淡淡的節慶色調（heroC、粒子）
export function festivalOverlay(base, fest) {
  const v = base.vars, f = fest.vars;
  return { ...base, overlay: 'festival', festival: fest.id, name: fest.name, deco: fest.deco,
    vars: { ...v, heroC: mix(v.heroC, f.rose, 0.35), heroB: mix(v.heroB, f.gl, 0.12) },
    hero: { ...base.hero, dots: [...(base.hero.dots || []).slice(0, 4), f.rose, f.gl] } };
}
// 夜間：由業主配色推導深色版（深色底、文字提亮、保留主色與強調色色相）
const _night = new Map();
export function nightVariant(base) {
  if (base.dark) return { ...base, overlay: 'night', name: THEME_MAP.night.name, deco: base.deco || 'star' };
  if (_night.has(base.id)) return _night.get(base.id);
  const v = base.vars;
  let cream = mix(v.deep, '#000000', 0.4);
  let card = mix(cream, '#ffffff', 0.07);
  let ink = mix(v.cream, '#ffffff', 0.55);
  let i = 0; while ((contrast(ink, card) < 8 || contrast(ink, cream) < 8) && i++ < 20) { cream = mix(cream, '#000000', 0.15); card = mix(cream, '#ffffff', 0.07); ink = mix(ink, '#ffffff', 0.2); }
  const lift = (c, bg, target) => { let x = c, k = 0; while (contrast(x, bg) < target && k++ < 30) x = mix(x, '#ffffff', 0.08); return x; };
  const ink2 = lift(mix(ink, cream, 0.3), card, 5), ink3 = lift(mix(ink, cream, 0.48), card, 3.2);
  const g = lift(v.g, card, 4.6), gl = lift(v.gl, card, 3.2), rose = lift(v.rose, card, 3.2);
  const btnInk = contrast('#ffffff', gl) >= contrast('#0b0f14', gl) ? '#ffffff' : '#0b0f14';
  const t = { ...base, overlay: 'night', dark: true, name: THEME_MAP.night.name, deco: base.deco === 'snow' || base.deco === 'bubble' ? base.deco : 'star',
    vars: { cream, cream2: mix(cream, '#ffffff', 0.05), ink, ink2, ink3, rose, g, gl, card, deep: mix(v.deep, '#000000', 0.6), deep2: mix(v.deep2, '#000000', 0.45),
      heroA: mix(cream, v.gl, 0.24), heroB: mix(cream, v.rose, 0.2), heroC: mix(cream, v.heroC, 0.16), btn: gl, btnInk },
    hero: { ...base.hero, sky: '#9ec8ff', ground: mix(v.deep, '#000000', 0.3), dim: true } };
  _night.set(base.id, t); return t;
}

// ---- CSS 變數 ----
const rgb = (h) => { h = h.replace('#', ''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgba = (h, a) => `rgba(${rgb(h).join(',')},${a})`;
export function themeVars(theme) {
  const v = theme.vars, dark = !!theme.dark;
  return {
    '--cream': v.cream, '--cream2': v.cream2, '--ink': v.ink, '--ink2': v.ink2, '--ink3': v.ink3, '--rose': v.rose, '--g': v.g, '--gl': v.gl,
    '--card': v.card, '--card2': dark ? mix(v.card, '#ffffff', 0.06) : mix(v.cream, v.card, 0.5),
    '--line': rgba(v.ink, dark ? 0.14 : 0.1), '--line2': rgba(v.ink, dark ? 0.22 : 0.16),
    '--shadow': rgba(dark ? '#000000' : v.ink, dark ? 0.35 : 0.08), '--shadow2': rgba(dark ? '#000000' : v.ink, dark ? 0.5 : 0.16),
    '--nav-bg': rgba(v.cream, 0.84), '--deep': v.deep, '--deep2': v.deep2, '--on-deep': dark ? v.ink : mix(v.cream, '#ffffff', 0.4),
    '--hero-a': v.heroA, '--hero-b': v.heroB, '--hero-c': v.heroC, '--title': dark ? v.ink : mix(v.ink, '#000000', 0.1),
    '--soft': dark ? mix(v.card, v.gl, 0.16) : mix(v.cream, v.gl, 0.12), '--soft-ink': dark ? mix(v.gl, '#ffffff', 0.25) : v.g,
    '--btn': v.btn, '--btn-ink': v.btnInk || (dark ? '#06120d' : '#ffffff'),
    ...gradOf(v, dark),
    '--glow': rgba(v.gl, 0.35), '--rose-soft': rgba(v.rose, dark ? 0.25 : 0.14), '--input': dark ? mix(v.card, '#000000', 0.15) : '#ffffff',
  };
}

// 主要按鈕漸層：挑白字或深字中對比較好的一個，再微調漸層兩端，確保按鈕文字對比 ≥ 4.5
function gradOf(v, dark) {
  const darkInk = dark ? '#0b0f14' : mix(v.deep || v.ink, '#000000', 0.3);
  const minC = (ink, a, b) => Math.min(contrast(ink, a), contrast(ink, b));
  const white = minC('#ffffff', v.gl, v.g) >= minC(darkInk, v.gl, v.g);
  const ink = v.btnInk && minC(v.btnInk, v.gl, v.g) >= 4.5 ? v.btnInk : white ? '#ffffff' : darkInk;
  let a = v.gl, b = v.g, i = 0;
  const toward = ink === '#ffffff' ? '#000000' : '#ffffff';
  while (contrast(ink, a) < 4.5 && i++ < 30) a = mix(a, toward, 0.06);
  i = 0; while (contrast(ink, b) < 4.5 && i++ < 30) b = mix(b, toward, 0.06);
  return { '--grad-a': a, '--grad-b': b, '--grad-ink': ink };
}

// ---- AI 依 logo 色票產生自訂風格 ----
const lum = (h) => { const [r, g, b] = rgb(h).map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const sat = (h) => { const [r, g, b] = rgb(h).map(x => x / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx === 0 ? 0 : (mx - mn) / mx; };
export const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
// 讓顏色在淺底上有足夠對比
function deepen(c, bg = '#ffffff', target = 4.5) { let x = c, i = 0; while (contrast(x, bg) < target && i < 20) { x = mix(x, '#000000', 0.08); i++; } return x; }

export function paletteToVars(colors) {
  const cs = colors.filter(Boolean);
  const vivid = [...cs].sort((a, b) => sat(b) * (1 - Math.abs(lum(b) - 0.35)) - sat(a) * (1 - Math.abs(lum(a) - 0.35)));
  const primary = vivid[0] || '#2DB674';
  const accent = vivid.find(c => Math.abs(hue(c) - hue(primary)) > 40) || mix(primary, '#e8708e', 0.6);
  const cream = mix(primary, '#ffffff', 0.93), cream2 = mix(primary, '#ffffff', 0.84);
  const ink = deepen(mix(primary, '#101010', 0.82), cream, 12);
  return {
    cream, cream2, ink, ink2: mix(ink, cream, 0.38), ink3: mix(ink, cream, 0.55), rose: deepen(accent, '#ffffff', 3),
    g: deepen(primary, '#ffffff', 4.6), gl: deepen(primary, '#ffffff', 3), card: '#ffffff', deep: mix(primary, '#000000', 0.72), deep2: mix(accent, '#000000', 0.7),
    heroA: mix(primary, '#ffffff', 0.75), heroB: mix(accent, '#ffffff', 0.8), heroC: mix(cs[2] || primary, '#ffffff', 0.85), btn: mix(primary, '#000000', 0.6),
  };
}
function hue(h) { const [r, g, b] = rgb(h).map(x => x / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (!d) return 0; let x = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return (x * 60 + 360) % 360; }

export function customTheme(c) {
  const vars = c.vars || paletteToVars(c.colors || []);
  const pal = (c.colors && c.colors.length ? c.colors : [vars.gl, vars.rose, vars.heroA]).slice(0, 6);
  while (pal.length < 6) pal.push(mix(pal[pal.length % Math.max(1, pal.length)] || '#ccc', '#ffffff', 0.4));
  return { id: 'custom', kind: 'custom', name: N(c.name || 'AI 自訂風格', 'AI custom', 'AI カスタム', 'AI tùy chỉnh', 'AI tersuai'), deco: 'sparkle', vars,
    hero: { pal, dots: [...pal.slice(0, 4), '#ffffff'], sky: '#ffffff', ground: vars.heroA, point: vars.rose } };
}

// 依風格產生迷你縮圖（後台卡片、展示面板用）
export function themeThumb(theme, { w = 160, h = 100, merchant } = {}) {
  const v = theme.vars;
  return `<svg viewBox="0 0 160 100" width="${w}" height="${h}" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
    <defs><radialGradient id="tt${theme.id}a" cx=".8" cy=".4" r=".6"><stop offset="0" stop-color="${v.heroA}"/><stop offset="1" stop-color="${v.cream}" stop-opacity="0"/></radialGradient></defs>
    <rect width="160" height="100" fill="${v.cream}"/><rect width="160" height="100" fill="url(#tt${theme.id}a)"/>
    <rect width="160" height="7" fill="${v.deep}"/><rect y="7" width="160" height="12" fill="${v.cream}" opacity=".9"/>
    <circle cx="10" cy="13" r="4" fill="${merchant?.brand || v.rose}"/><rect x="17" y="11" width="26" height="4" rx="2" fill="${v.ink}"/>
    <rect x="128" y="10" width="24" height="6" rx="3" fill="${v.card}" stroke="${v.ink3}" stroke-width=".5"/>
    <rect x="10" y="28" width="58" height="7" rx="2" fill="${v.ink}"/><rect x="10" y="38" width="44" height="7" rx="2" fill="${v.ink}"/>
    <rect x="10" y="50" width="50" height="3" rx="1.5" fill="${v.ink3}"/><rect x="10" y="57" width="26" height="8" rx="4" fill="${v.gl}"/><rect x="39" y="57" width="22" height="8" rx="4" fill="${v.card}"/>
    <circle cx="116" cy="44" r="20" fill="${theme.hero.pal[0]}"/><circle cx="102" cy="34" r="8" fill="${theme.hero.pal[1]}"/><circle cx="136" cy="58" r="7" fill="${theme.hero.pal[2]}"/>
    ${[0, 1, 2, 3].map(i => `<rect x="${10 + i * 36}" y="72" width="32" height="24" rx="4" fill="${v.card}"/><circle cx="${26 + i * 36}" cy="81" r="5" fill="${theme.hero.pal[(i + 1) % 6]}"/><rect x="${14 + i * 36}" y="89" width="14" height="3" rx="1.5" fill="${v.ink2}"/><rect x="${32 + i * 36}" y="88" width="7" height="5" rx="2.5" fill="${v.btn}"/>`).join('')}
    ${theme.dark ? '<circle cx="148" cy="28" r="5" fill="#fff6d0" opacity=".9"/>' : ''}
  </svg>`;
}
