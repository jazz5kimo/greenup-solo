// 非阿美業主的商品插圖（純 SVG，依 product.art.kind／color／accent 繪製，離線可用）
// merchantArt(product, size, { bg }) 回傳 <svg class="art">；merchantLogo(merchant, size) 回傳品牌 logo
import { BIZ_ART } from './biz/index.js';
let uid = 0;

// ---- 色彩工具 ----
const toRgb = (h) => { h = String(h || '#999').replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = (r, g, b) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
export const mix = (a, b, t) => { const x = toRgb(a), y = toRgb(b); return toHex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t); };
const dk = (c, t = 0.25) => mix(c, '#000000', t);
const lt = (c, t = 0.35) => mix(c, '#ffffff', t);

// ---- 共用零件 ----
const halo = (u, c) => `<radialGradient id="${u}h"><stop offset="0" stop-color="${c}" stop-opacity=".5"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
const vgrad = (id, a, b) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const hgrad = (id, a, b) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const shadow = (rx = 38, cy = 98) => `<ellipse cx="60" cy="${cy}" rx="${rx}" ry="${Math.max(4, rx / 5.5)}" fill="rgba(0,0,0,.16)"/>`;
const shine = (d) => `<path d="${d}" fill="#fff" opacity=".22"/>`;
const steam = (x = 60, y = 30, c = '#ffffff') => `<g fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round" opacity=".7"><path d="M${x - 8} ${y} q-4 -6 0 -11 q4 -5 0 -10"/><path d="M${x} ${y - 2} q-4 -6 0 -11 q4 -5 0 -10"/><path d="M${x + 8} ${y} q-4 -6 0 -11 q4 -5 0 -10"/></g>`;
const leaf = (x, y, r, c, s = 1) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})"><path d="M0 0 q8 -10 18 0 q-10 9 -18 0z" fill="${c}"/><path d="M1 0 h15" stroke="${dk(c, 0.3)}" stroke-width=".8"/></g>`;
const flower = (x, y, r, c, center = '#ffe08a', n = 6) => `<g transform="translate(${x} ${y})">${Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2; return `<ellipse cx="${(Math.cos(a) * r * 0.62).toFixed(1)}" cy="${(Math.sin(a) * r * 0.62).toFixed(1)}" rx="${(r * 0.52).toFixed(1)}" ry="${(r * 0.38).toFixed(1)}" transform="rotate(${(a * 180 / Math.PI).toFixed(0)} ${(Math.cos(a) * r * 0.62).toFixed(1)} ${(Math.sin(a) * r * 0.62).toFixed(1)})" fill="${i % 2 ? c : lt(c, 0.12)}"/>`; }).join('')}<circle r="${(r * 0.36).toFixed(1)}" fill="${center}"/></g>`;
const rose = (x, y, r, c) => `<g transform="translate(${x} ${y})"><circle r="${r}" fill="${c}"/><path d="M${-r * 0.55} 0 a${r * 0.55} ${r * 0.55} 0 1 1 ${r * 0.9} ${r * 0.3}" fill="none" stroke="${dk(c, 0.22)}" stroke-width="1.4"/><path d="M${-r * 0.2} ${-r * 0.1} a${r * 0.28} ${r * 0.28} 0 1 1 ${r * 0.4} ${r * 0.2}" fill="none" stroke="${dk(c, 0.28)}" stroke-width="1.2"/><circle cx="${-r * 0.3}" cy="${-r * 0.35}" r="${r * 0.18}" fill="#fff" opacity=".35"/></g>`;
const stitch = (d, c) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="1.2" stroke-dasharray="3 2.4" stroke-linecap="round"/>`;
const bean = (x, y, r, c, s = 1) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})"><ellipse rx="6" ry="4.2" fill="${c}"/><path d="M-5 0 q2.5 -1.6 5 0 t5 0" stroke="${dk(c, 0.45)}" stroke-width="1.1" fill="none"/></g>`;
const snow = (x, y, s, c = '#fff') => `<g transform="translate(${x} ${y}) scale(${s})" stroke="${c}" stroke-width="1.6" stroke-linecap="round"><path d="M0 -7 V7 M-6 -3.5 L6 3.5 M-6 3.5 L6 -3.5"/></g>`;

// ---- 21 種插圖 ----
const ART = {
  // 咖啡豆立袋
  bag: (u, c, a) => `<defs>${vgrad(u + 'b', lt(c, 0.12), dk(c, 0.18))}</defs>${shadow(32)}
    <path d="M33 34 L87 34 L91 92 Q60 99 29 92 Z" fill="url(#${u}b)"/>
    <path d="M33 34 L38 92 Q34 92 29 92 Z" fill="${dk(c, 0.28)}" opacity=".45"/>
    <rect x="31" y="24" width="58" height="12" rx="2.5" fill="${dk(c, 0.12)}"/>
    ${Array.from({ length: 13 }, (_, i) => `<path d="M${34 + i * 4.2} 25 v10" stroke="${dk(c, 0.3)}" stroke-width=".9"/>`).join('')}
    <rect x="28" y="22" width="64" height="4" rx="2" fill="#c9a24a"/>
    <rect x="41" y="50" width="38" height="32" rx="5" fill="${a}"/>
    <rect x="44" y="53" width="32" height="26" rx="3" fill="none" stroke="${lt(a, 0.4)}" stroke-width=".8"/>
    ${bean(60, 62, -25, c, 1.15)}
    <rect x="48" y="72" width="24" height="2.4" rx="1.2" fill="${lt(a, 0.55)}"/><rect x="52" y="76" width="16" height="1.8" rx=".9" fill="${lt(a, 0.4)}"/>
    <circle cx="75" cy="42" r="3.4" fill="${dk(c, 0.35)}"/><circle cx="75" cy="42" r="1.4" fill="${lt(c, 0.3)}"/>
    ${shine('M44 38 L47 38 L49 88 L45 88 Z')}
    ${bean(24, 96, 20, '#5a3418', 0.9)}${bean(94, 95, -30, '#6b3e26', 0.9)}`,

  // 掛耳包＋馬克杯
  drip: (u, c, a) => `<defs>${vgrad(u + 'm', lt(a, 0.15), dk(a, 0.15))}</defs>${shadow(36)}
    <path d="M30 62 h52 l-4 30 q-22 7 -44 0 z" fill="url(#${u}m)"/>
    <path d="M82 68 q14 0 12 12 q-2 10 -14 8" fill="none" stroke="${dk(a, 0.1)}" stroke-width="5"/>
    <ellipse cx="56" cy="62" rx="26" ry="5.5" fill="${dk(a, 0.25)}"/><ellipse cx="56" cy="62.5" rx="22" ry="4" fill="#3b2416"/>
    <path d="M32 61 l6 -8 M80 61 l-6 -8" stroke="${dk(c, 0.15)}" stroke-width="3"/>
    <rect x="36" y="24" width="40" height="36" rx="2" fill="${c}"/>
    <path d="M36 30 h40" stroke="${dk(c, 0.08)}" stroke-width="1" stroke-dasharray="2 2"/>
    <rect x="36" y="24" width="40" height="36" rx="2" fill="none" stroke="${dk(c, 0.12)}"/>
    <circle cx="56" cy="44" r="8" fill="${a}"/>${bean(56, 44, -30, lt(c, 0.5), 0.8)}
    <path d="M40 54 h32" stroke="${dk(c, 0.18)}" stroke-width="1.6"/>
    ${steam(56, 20, '#c9b8a6')}`,

  // 瓶子（冷萃、保養油）
  bottle: (u, c, a) => `<defs>${hgrad(u + 'g', lt(c, 0.12), dk(c, 0.25))}</defs>${shadow(26)}
    <rect x="52" y="13" width="16" height="10" rx="2.5" fill="${a}"/>
    <rect x="54" y="22" width="12" height="9" fill="${dk(c, 0.2)}"/>
    <path d="M44 42 q0 -11 10 -12 h12 q10 1 10 12 v48 q0 7 -7 7 h-18 q-7 0 -7 -7 z" fill="url(#${u}g)"/>
    <rect x="44" y="54" width="32" height="28" fill="${a}"/>
    <rect x="47" y="57" width="26" height="22" fill="none" stroke="${lt(a, 0.45)}" stroke-width=".8"/>
    <circle cx="60" cy="65" r="5" fill="${lt(a, 0.5)}"/><rect x="51" y="73" width="18" height="2" rx="1" fill="${lt(a, 0.5)}"/>
    ${shine('M48 40 q2 -6 6 -7 v60 q-6 0 -6 -5 z')}
    <circle cx="34" cy="92" r="3" fill="${lt(c, 0.3)}" opacity=".6"/><circle cx="88" cy="90" r="2.2" fill="${a}" opacity=".6"/>`,

  // 手沖壺＋濾杯
  kettle: (u, c, a) => `<defs>${hgrad(u + 'k', lt(c, 0.2), dk(c, 0.28))}</defs>${shadow(40)}
    <path d="M22 54 h40 l-4 34 q-16 6 -32 0 z" fill="url(#${u}k)"/>
    <ellipse cx="42" cy="54" rx="20" ry="4.5" fill="${dk(c, 0.15)}"/>
    <rect x="38" y="44" width="8" height="6" rx="2" fill="${a}"/><ellipse cx="42" cy="50" rx="10" ry="2.6" fill="${dk(c, 0.1)}"/>
    <path d="M24 66 q-12 -2 -16 -22 q-1 -6 4 -10" fill="none" stroke="${dk(c, 0.1)}" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M60 58 q14 2 12 18 q-1 8 -12 8" fill="none" stroke="${a}" stroke-width="5" stroke-linecap="round"/>
    <path d="M70 46 h28 l-9 16 h-10 z" fill="#f4f1ea" stroke="${dk(c, 0.2)}"/>
    <rect x="74" y="62" width="20" height="4" rx="1.5" fill="${dk(c, 0.2)}"/>
    <path d="M73 66 h24 l-3 24 q-9 4 -18 0 z" fill="#ffffff" opacity=".55" stroke="${dk(c, 0.15)}"/>
    <path d="M76 78 h18 l-1 11 q-8 3 -16 0 z" fill="#3b2416" opacity=".85"/>
    ${shine('M28 58 h5 l-2 28 h-4 z')}`,

  // 植鞣短夾
  wallet: (u, c, a) => `<defs>${vgrad(u + 'w', lt(c, 0.1), dk(c, 0.2))}</defs>${shadow(40)}
    <rect x="36" y="28" width="44" height="28" rx="3" transform="rotate(-8 58 42)" fill="#f2e7d4"/>
    <rect x="40" y="31" width="44" height="28" rx="3" transform="rotate(6 62 45)" fill="${lt(a, 0.55)}"/>
    <rect x="22" y="44" width="76" height="48" rx="9" fill="url(#${u}w)"/>
    ${stitch('M27 49 h66 a4 4 0 0 1 4 4 v30 a4 4 0 0 1 -4 4 h-66 a4 4 0 0 1 -4 -4 v-30 a4 4 0 0 1 4 -4 z', lt(c, 0.55))}
    <path d="M22 58 h76" stroke="${dk(c, 0.3)}" stroke-width="1.2" opacity=".6"/>
    <rect x="70" y="60" width="28" height="16" rx="8" fill="${a}"/><circle cx="90" cy="68" r="3.6" fill="#d9b25f"/><circle cx="90" cy="68" r="1.6" fill="#a37c2c"/>
    <circle cx="40" cy="76" r="5" fill="none" stroke="${dk(c, 0.3)}" stroke-width="1.2" opacity=".6"/>
    ${shine('M26 48 q30 -4 68 0 v4 q-36 -3 -68 0 z')}`,

  // 名片夾
  card: (u, c, a) => `<defs>${vgrad(u + 'c', lt(c, 0.12), dk(c, 0.22))}</defs>${shadow(34)}
    <g transform="rotate(-10 60 44)"><rect x="34" y="26" width="52" height="32" rx="2.5" fill="#fffaf0" stroke="#e5dccb"/>
    <rect x="40" y="33" width="20" height="3" rx="1.5" fill="${a}"/><rect x="40" y="40" width="30" height="2" rx="1" fill="#cfc4b1"/><rect x="40" y="45" width="24" height="2" rx="1" fill="#cfc4b1"/><circle cx="76" cy="38" r="4" fill="${c}"/></g>
    <rect x="28" y="50" width="64" height="42" rx="7" fill="url(#${u}c)"/>
    ${stitch('M33 55 h54 a3 3 0 0 1 3 3 v28 a3 3 0 0 1 -3 3 h-54 a3 3 0 0 1 -3 -3 v-28 a3 3 0 0 1 3 -3 z', lt(c, 0.5))}
    <path d="M28 62 q32 8 64 0" fill="none" stroke="${dk(c, 0.3)}" stroke-width="1.2" opacity=".5"/>
    <text x="60" y="81" text-anchor="middle" font-family="Georgia, serif" font-size="12" font-style="italic" fill="${dk(c, 0.42)}" opacity=".75">M.B.</text>
    ${shine('M32 54 h56 v3 h-56 z')}`,

  // 鑰匙圈
  key: (u, c, a) => `<defs>${vgrad(u + 'y', lt(c, 0.12), dk(c, 0.2))}<linearGradient id="${u}m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4e7c2"/><stop offset=".5" stop-color="#c9a24a"/><stop offset="1" stop-color="#8f6d24"/></linearGradient></defs>${shadow(30)}
    <circle cx="48" cy="34" r="14" fill="none" stroke="url(#${u}m)" stroke-width="4"/>
    <path d="M54 46 l-6 8" stroke="#a88a3c" stroke-width="3"/>
    <rect x="36" y="52" width="26" height="44" rx="12" transform="rotate(-14 49 74)" fill="url(#${u}y)"/>
    ${stitch('M41 58 l15 -3.6 a7 7 0 0 1 8 5 l6 26 a7 7 0 0 1 -5 8 l-4 1 a7 7 0 0 1 -8 -5 l-6 -26 a7 7 0 0 1 4 -8z', lt(c, 0.5))}
    <circle cx="48" cy="60" r="3" fill="#c9a24a"/>
    <g transform="translate(66 30) rotate(32)"><circle r="9" fill="url(#${u}m)"/><circle r="3.5" fill="#fff" opacity=".9"/><rect x="7" y="-3" width="34" height="6" rx="1.5" fill="url(#${u}m)"/><path d="M30 3 v6 h4 v-3 h3 v4 h4 v-7" fill="#b38d36"/></g>
    <rect x="72" y="86" width="16" height="6" rx="3" fill="${a}" opacity=".5"/>`,

  // 托特包
  tote: (u, c, a) => `<defs>${vgrad(u + 't', lt(c, 0.1), dk(c, 0.22))}</defs>${shadow(40)}
    <path d="M42 46 q0 -28 18 -28 q18 0 18 28" fill="none" stroke="${dk(c, 0.3)}" stroke-width="5"/>
    <path d="M48 46 q0 -20 12 -20 q12 0 12 20" fill="none" stroke="${dk(c, 0.42)}" stroke-width="3" opacity=".7"/>
    <path d="M26 44 h68 l-5 50 q-29 5 -58 0 z" fill="url(#${u}t)"/>
    ${stitch('M30 49 h60 l-4.6 41', lt(c, 0.45))}${stitch('M30 49 l4.6 41', lt(c, 0.45))}
    <rect x="44" y="58" width="32" height="22" rx="3" fill="${a}" opacity=".9"/>
    ${stitch('M47 61 h26 v16 h-26 z', dk(a, 0.25))}
    <rect x="38" y="42" width="8" height="10" rx="2" fill="${dk(c, 0.35)}"/><rect x="74" y="42" width="8" height="10" rx="2" fill="${dk(c, 0.35)}"/>
    <circle cx="42" cy="48" r="1.6" fill="#d9b25f"/><circle cx="78" cy="48" r="1.6" fill="#d9b25f"/>
    ${shine('M29 46 h6 l3 44 h-5 z')}`,

  // 斜背包
  pouch: (u, c, a) => `<defs>${vgrad(u + 'p', lt(c, 0.12), dk(c, 0.22))}</defs>${shadow(32)}
    <path d="M36 54 C30 20, 70 6, 92 30 L86 52" fill="none" stroke="${dk(c, 0.3)}" stroke-width="4"/>
    ${stitch('M36 54 C30 20, 70 6, 92 30', lt(c, 0.4))}
    <rect x="30" y="48" width="60" height="44" rx="10" fill="url(#${u}p)"/>
    <path d="M30 58 q0 -10 10 -10 h40 q10 0 10 10 v12 q-30 10 -60 0 z" fill="${dk(c, 0.15)}"/>
    ${stitch('M33 59 q0 -8 8 -8 h38 q8 0 8 8 v9 q-27 9 -54 0 z', lt(c, 0.45))}
    <rect x="54" y="68" width="12" height="9" rx="2" fill="#d9b25f"/><rect x="57" y="70.5" width="6" height="4" rx="1" fill="${dk(c, 0.3)}"/>
    <rect x="38" y="80" width="20" height="3" rx="1.5" fill="${a}" opacity=".5"/>
    ${shine('M34 52 h52 v2 q-26 2 -52 0 z')}`,

  // 花束
  bouquet: (u, c, a) => `<defs>${vgrad(u + 'k', '#f1dfc3', '#d8b98d')}</defs>${shadow(26, 102)}
    ${leaf(36, 46, -130, a, 1.2)}${leaf(84, 44, -50, a, 1.2)}${leaf(30, 60, -160, dk(a, 0.1), 1)}${leaf(90, 58, -20, dk(a, 0.1), 1)}
    ${flower(46, 40, 11, c)}${rose(66, 34, 11, dk(c, 0.08))}${flower(78, 46, 9, lt(c, 0.25), '#fff3c4', 5)}${rose(52, 54, 9, lt(c, 0.15))}${flower(38, 56, 7, '#fff7f0', c, 5)}${rose(72, 56, 8, c)}
    <circle cx="60" cy="22" r="2.4" fill="${lt(c, 0.4)}"/><circle cx="90" cy="34" r="2" fill="#fff"/><circle cx="30" cy="34" r="2" fill="${lt(c, 0.5)}"/>
    <path d="M34 60 L60 104 L86 60 Q60 72 34 60 z" fill="url(#${u}k)"/>
    <path d="M34 60 L60 104 L50 64 z" fill="#c9a77a" opacity=".55"/>
    <path d="M52 82 q8 4 16 0 l-2 6 q-6 2 -12 0 z" fill="${dk(c, 0.15)}"/>
    <path d="M60 84 q-12 -6 -14 4 q8 2 14 -4 q12 -6 14 4 q-8 2 -14 -4" fill="${c}"/>`,

  // 乾燥花圈
  wreath: (u, c, a) => `${shadow(34)}
    <circle cx="60" cy="58" r="30" fill="none" stroke="${c}" stroke-width="11"/>
    <circle cx="60" cy="58" r="30" fill="none" stroke="${dk(c, 0.18)}" stroke-width="2" stroke-dasharray="4 5"/>
    ${Array.from({ length: 14 }, (_, i) => { const t = i / 14 * Math.PI * 2; return leaf(60 + Math.cos(t) * 30, 58 + Math.sin(t) * 30, t * 180 / Math.PI + 70, i % 2 ? a : lt(a, 0.2), 0.75); }).join('')}
    ${[[0.3, '#e9b9a6'], [1.3, '#f4e3c8'], [2.2, '#c98b7a'], [3.4, '#f4e3c8'], [4.3, '#e9b9a6'], [5.3, '#d9a7c0']].map(([t, col]) => flower(60 + Math.cos(t) * 30, 58 + Math.sin(t) * 30, 6, col, '#a77a4a', 5)).join('')}
    ${[0.8, 2.7, 3.9, 5.8].map(t => `<circle cx="${(60 + Math.cos(t) * 33).toFixed(1)}" cy="${(58 + Math.sin(t) * 33).toFixed(1)}" r="2.2" fill="#f7efe2"/>`).join('')}
    <path d="M60 90 q-14 -10 -18 2 q8 4 18 -2 q14 -10 18 2 q-8 4 -18 -2" fill="#c98b7a"/>
    <path d="M58 92 l-6 12 M62 92 l6 12" stroke="#c98b7a" stroke-width="3" stroke-linecap="round"/>`,

  // 小盆栽
  pot: (u, c, a) => `<defs>${vgrad(u + 'p', lt(a, 0.1), dk(a, 0.2))}</defs>${shadow(28)}
    ${leaf(60, 62, -95, c, 1.9)}${leaf(58, 64, -140, dk(c, 0.1), 1.6)}${leaf(62, 64, -40, dk(c, 0.05), 1.6)}${leaf(56, 66, -170, lt(c, 0.1), 1.3)}${leaf(64, 66, -10, lt(c, 0.1), 1.3)}${leaf(60, 64, -118, lt(c, 0.2), 1.2)}${leaf(60, 64, -66, lt(c, 0.15), 1.25)}
    <rect x="36" y="64" width="48" height="10" rx="3" fill="${dk(a, 0.08)}"/>
    <path d="M39 74 h42 l-5 22 q-16 4 -32 0 z" fill="url(#${u}p)"/>
    <ellipse cx="60" cy="65" rx="21" ry="3" fill="#5b3a26"/>
    <path d="M46 82 q14 4 28 0" stroke="${lt(a, 0.35)}" stroke-width="1.6" fill="none"/>
    ${shine('M41 76 h4 l3 18 h-4 z')}`,

  // 開幕花籃
  basket: (u, c, a) => `<defs>${vgrad(u + 'b', lt(c, 0.1), dk(c, 0.25))}</defs>${shadow(38)}
    <path d="M28 62 q32 -60 64 0" fill="none" stroke="${dk(c, 0.2)}" stroke-width="4"/>
    ${leaf(30, 60, -150, '#5c8e57', 1.2)}${leaf(90, 58, -30, '#5c8e57', 1.2)}${leaf(60, 50, -90, '#6fa36b', 1)}
    ${rose(42, 54, 10, a)}${flower(60, 48, 11, '#fff7e6', '#f0a531')}${rose(78, 54, 10, lt(a, 0.2))}${flower(50, 62, 8, '#ffd27a', '#c97a2a', 5)}${rose(68, 62, 8, dk(a, 0.1))}
    <path d="M26 64 h68 l-6 28 q-28 6 -56 0 z" fill="url(#${u}b)"/>
    ${[0, 1, 2].map(r => `<path d="M${28 + r * 2} ${70 + r * 7} h${64 - r * 4}" stroke="${dk(c, 0.3)}" stroke-width="1.2" opacity=".55"/>`).join('')}
    ${Array.from({ length: 8 }, (_, i) => `<path d="M${33 + i * 8} 64 l-1 28" stroke="${dk(c, 0.3)}" stroke-width="1" opacity=".4"/>`).join('')}
    <rect x="44" y="70" width="32" height="14" rx="2" fill="#fffaf0"/><text x="60" y="80" text-anchor="middle" font-size="8" font-weight="700" fill="${a}">開幕誌慶</text>`,

  // 美甲（甲油瓶＋甲片）
  nail: (u, c, a) => `<defs>${vgrad(u + 'n', lt(c, 0.1), dk(c, 0.2))}</defs>${shadow(36)}
    <rect x="30" y="20" width="16" height="30" rx="4" fill="#2b2430"/>${shine('M33 23 h3 v24 h-3 z')}
    <rect x="26" y="48" width="24" height="6" rx="2" fill="#3a313f"/>
    <path d="M24 56 h28 q4 0 4 4 v30 q0 6 -6 6 h-24 q-6 0 -6 -6 v-30 q0 -4 4 -4 z" fill="url(#${u}n)"/>
    <path d="M24 56 h28 q4 0 4 4 v30 q0 6 -6 6 h-24 q-6 0 -6 -6 v-30 q0 -4 4 -4 z" fill="none" stroke="#fff" stroke-opacity=".5"/>
    ${shine('M24 62 q0 -3 3 -3 h3 v32 h-3 q-3 0 -3 -3 z')}
    ${[[64, 34, -8], [80, 30, 0], [96, 36, 8]].map(([x, y, r], i) => `<g transform="translate(${x} ${y}) rotate(${r})"><path d="M-7 46 v-30 q0 -12 7 -12 q7 0 7 12 v30 z" fill="${lt(a, 0.15)}"/><path d="M-5.5 30 v-14 q0 -10 5.5 -10 q5.5 0 5.5 10 v14 z" fill="${i === 1 ? a : c}"/>${i === 2 ? `<circle cx="0" cy="17" r="2" fill="#fff"/><circle cx="-2" cy="24" r="1.2" fill="#fff"/>` : ''}<path d="M-3 9 q1 -3 3 -3" stroke="#fff" stroke-width="1.4" opacity=".7" fill="none"/></g>`).join('')}`,

  // 保養乳液
  lotion: (u, c, a) => `<defs>${hgrad(u + 'l', lt(c, 0.25), dk(c, 0.12))}</defs>${shadow(38)}
    <rect x="44" y="14" width="18" height="6" rx="2" fill="${a}"/><rect x="52" y="14" width="22" height="5" rx="2" fill="${a}"/><rect x="49" y="18" width="8" height="12" fill="${dk(a, 0.15)}"/>
    <rect x="44" y="28" width="18" height="8" rx="2" fill="${a}"/>
    <rect x="34" y="36" width="38" height="58" rx="10" fill="url(#${u}l)"/>
    <rect x="40" y="54" width="26" height="24" rx="3" fill="#fff" opacity=".75"/>${leaf(47, 66, -20, a, 0.8)}<rect x="44" y="72" width="18" height="2" rx="1" fill="${a}" opacity=".6"/>
    ${shine('M38 40 h4 v50 h-4 z')}
    <rect x="70" y="72" width="30" height="22" rx="6" fill="${lt(c, 0.35)}"/><rect x="68" y="64" width="34" height="10" rx="4" fill="${a}"/>
    ${leaf(86, 60, -60, a, 0.9)}${leaf(88, 60, -120, lt(a, 0.2), 0.8)}`,

  // 禮券
  voucher: (u, c, a) => `<defs><linearGradient id="${u}v" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${lt(c, 0.15)}"/><stop offset="1" stop-color="${dk(c, 0.18)}"/></linearGradient></defs>${shadow(42)}
    <rect x="16" y="34" width="88" height="56" rx="9" fill="url(#${u}v)" transform="rotate(-6 60 62)"/>
    <g transform="rotate(-6 60 62)">
      <rect x="16" y="56" width="88" height="8" fill="${a}"/><rect x="68" y="34" width="8" height="56" fill="${a}"/>
      <path d="M72 58 q-14 -14 -18 -2 q4 6 18 2 q14 -14 18 -2 q-4 6 -18 2" fill="${dk(a, 0.12)}"/><circle cx="72" cy="58" r="3.5" fill="${dk(a, 0.25)}"/>
      <text x="26" y="50" font-family="Georgia, serif" font-size="11" font-weight="700" fill="#fff" letter-spacing="1.5">GIFT</text>
      <text x="26" y="82" font-size="10" font-weight="800" fill="#fff">NT$1,000</text>
      <path d="M92 38 v48" stroke="#fff" stroke-width="1.2" stroke-dasharray="2.5 2.5" opacity=".6"/>
    </g>
    <circle cx="20" cy="30" r="2" fill="${c}"/><circle cx="102" cy="96" r="2.4" fill="${a}"/>`,

  // 河粉湯碗
  bowl: (u, c, a) => `<defs>${vgrad(u + 'w', '#ffffff', '#e4e8ee')}<radialGradient id="${u}s" cx=".5" cy=".45"><stop offset="0" stop-color="${lt(c, 0.25)}"/><stop offset="1" stop-color="${dk(c, 0.12)}"/></radialGradient></defs>${shadow(40)}
    ${steam(60, 26, '#cbb79c')}
    <path d="M14 58 h92 q-4 34 -46 36 q-42 -2 -46 -36 z" fill="url(#${u}w)"/>
    <path d="M22 72 q38 12 76 0" stroke="#3d6fb6" stroke-width="2" fill="none" opacity=".7"/>
    <path d="M24 78 q36 10 72 0" stroke="#3d6fb6" stroke-width="1" stroke-dasharray="3 3" fill="none" opacity=".6"/>
    <ellipse cx="60" cy="58" rx="46" ry="11" fill="#f4f6f9"/><ellipse cx="60" cy="58" rx="41" ry="8.5" fill="url(#${u}s)"/>
    <path d="M28 58 q8 -4 16 0 t16 0 t16 0 t16 0" stroke="#fff8e6" stroke-width="2.4" fill="none"/>
    <path d="M32 61 q8 -3 16 0 t16 0 t16 0" stroke="#fff4d8" stroke-width="2" fill="none"/>
    <ellipse cx="46" cy="55" rx="9" ry="4" fill="${a}" transform="rotate(-10 46 55)"/><ellipse cx="62" cy="53" rx="9" ry="3.6" fill="${dk(a, 0.1)}" transform="rotate(8 62 53)"/>
    ${leaf(72, 56, -20, '#4f9a5e', 0.8)}${leaf(78, 58, 160, '#6fa36b', 0.7)}${leaf(36, 60, 200, '#4f9a5e', 0.6)}
    <circle cx="84" cy="55" r="4.5" fill="#b9d86a"/><path d="M80 55 h9" stroke="#e9f3c4"/>
    <path d="M80 18 L30 52" stroke="#6b3e26" stroke-width="3" stroke-linecap="round"/><path d="M90 22 L40 54" stroke="#7a4b2f" stroke-width="3" stroke-linecap="round"/>`,

  // 越式法國麵包
  baguette: (u, c, a) => `<defs>${vgrad(u + 'b', lt(c, 0.15), dk(c, 0.22))}</defs>${shadow(44)}
    <g transform="rotate(-14 60 62)">
      <path d="M14 66 q0 -16 18 -18 h56 q18 2 18 18 q0 10 -14 12 h-64 q-14 -2 -14 -12 z" fill="url(#${u}b)"/>
      <path d="M18 62 q42 -10 84 0 l-2 4 q-40 -7 -80 0 z" fill="${dk(c, 0.3)}"/>
      <path d="M20 60 q6 -4 12 -2 l-2 6 z" fill="${a}"/>
      <path d="M26 59 q14 -6 30 -4 q-2 5 -30 7z" fill="#e8384f" opacity=".85"/>
      <path d="M44 56 q16 -4 32 0 q-14 5 -32 3z" fill="#f2a06b"/>
      <path d="M58 56 h30 l-4 5 h-26 z" fill="${a}"/>
      ${leaf(76, 55, -30, '#4f9a5e', 0.9)}${leaf(40, 56, -150, '#6fa36b', 0.7)}
      ${[30, 48, 66, 84].map(x => `<path d="M${x} 50 q6 -3 10 2" stroke="${lt(c, 0.45)}" stroke-width="2" fill="none" stroke-linecap="round"/>`).join('')}
      ${shine('M24 52 q30 -8 64 -6 v3 q-34 -1 -64 6 z')}
    </g>`,

  // 鮮蝦春捲
  roll: (u, c, a) => `${shadow(46, 96)}
    <ellipse cx="60" cy="86" rx="48" ry="12" fill="#ffffff"/><ellipse cx="60" cy="84" rx="40" ry="8.5" fill="#f3efe8"/>
    ${[[36, 66, -10], [64, 60, -6]].map(([x, y, r]) => `<g transform="translate(${x} ${y}) rotate(${r})"><rect x="-6" y="-8" width="40" height="22" rx="11" fill="rgba(0,0,0,.12)"/><rect x="-6" y="-10" width="40" height="22" rx="11" fill="#f3ece0" stroke="#d8c9b2" stroke-width="1.2"/><path d="M0 -6 q8 -4 14 2 q-6 6 -14 -2z" fill="${a}" opacity=".9"/><path d="M8 4 q6 -8 14 -2 q-4 4 -14 2z" fill="${dk(a, 0.1)}" opacity=".8"/><path d="M14 -4 a6 6 0 1 1 8 6" stroke="${c}" stroke-width="4.5" fill="none" stroke-linecap="round"/><path d="M14 -4 a6 6 0 1 1 8 6" stroke="${dk(c, 0.15)}" stroke-width="1" fill="none" stroke-dasharray="1.5 2.5"/><path d="M-2 -6 q16 -4 32 0" stroke="#fff" stroke-width="2" opacity=".7" fill="none"/></g>`).join('')}
    <ellipse cx="90" cy="80" rx="12" ry="5" fill="#d9c7a6"/><ellipse cx="90" cy="78" rx="10" ry="3.6" fill="#b5793f"/><circle cx="87" cy="77.5" r="1" fill="#e8384f"/><circle cx="92" cy="78" r=".9" fill="#f6e3b1"/>`,

  // 越南滴漏咖啡
  cup: (u, c, a) => `<defs>${vgrad(u + 'c', c, dk(c, 0.2))}</defs>${shadow(26)}
    <rect x="42" y="18" width="36" height="6" rx="2" fill="#b9bcc2"/><path d="M46 24 h28 l-2 18 h-24 z" fill="#d5d8dd"/><rect x="52" y="12" width="16" height="7" rx="2" fill="#9ea2a9"/>
    <path d="M38 42 h44" stroke="#9ea2a9" stroke-width="3" stroke-linecap="round"/>
    <path d="M58 44 v8" stroke="${c}" stroke-width="1.6" stroke-dasharray="2 2"/>
    <path d="M40 46 h40 l-4 46 q-16 4 -32 0 z" fill="#ffffff" opacity=".35" stroke="#dfe3e8"/>
    <path d="M41.5 58 h37 l-3 26 h-31 z" fill="url(#${u}c)"/>
    <path d="M44.2 84 h31.6 l-0.7 7 q-15 3.6 -30.2 0 z" fill="${a}"/>
    <path d="M44 84 q16 -5 32 0" stroke="${lt(a, 0.3)}" stroke-width="1.4" fill="none" opacity=".8"/>
    <rect x="48" y="62" width="9" height="9" rx="2" fill="#fff" opacity=".35" transform="rotate(12 52 66)"/><rect x="62" y="66" width="8" height="8" rx="2" fill="#fff" opacity=".3" transform="rotate(-8 66 70)"/>
    ${shine('M43 48 h4 l3 40 h-4 z')}`,

  // 冷凍湯底包
  pack: (u, c, a) => `<defs>${vgrad(u + 'k', lt(c, 0.1), dk(c, 0.22))}</defs>${shadow(32)}
    <path d="M30 22 h60 v6 l-3 3 l3 3 v52 q0 8 -8 8 h-44 q-8 0 -8 -8 v-52 l3 -3 l-3 -3 z" fill="url(#${u}k)"/>
    <path d="M30 22 h60 v6 h-60 z" fill="${dk(c, 0.15)}"/>
    ${Array.from({ length: 12 }, (_, i) => `<path d="M${32 + i * 5} 22.5 v5" stroke="${lt(c, 0.25)}" stroke-width=".8"/>`).join('')}
    <ellipse cx="60" cy="62" rx="22" ry="16" fill="#fff" opacity=".9"/><ellipse cx="60" cy="63" rx="18" ry="12" fill="${a}"/>
    <path d="M46 62 q7 -4 14 0 t14 0" stroke="#fff8e6" stroke-width="2" fill="none"/>
    <rect x="40" y="38" width="40" height="8" rx="4" fill="#fff" opacity=".9"/><rect x="45" y="41" width="30" height="2.4" rx="1.2" fill="${c}"/>
    <rect x="38" y="82" width="44" height="7" rx="3.5" fill="${dk(c, 0.3)}"/>
    ${snow(80, 34, 0.75)}${snow(92, 90, 0.6, '#cfe8ff')}
    ${shine('M34 34 h4 v48 h-4 z')}`,
};

// 50 種業態新增的插圖種類（biz/g1..g4.js 的 ART）
for (const [k, fn] of Object.entries(BIZ_ART || {})) if (typeof fn === 'function' && !ART[k]) ART[k] = fn;
export const ART_KINDS = Object.keys(ART);

export function merchantArt(product, size = 120, { bg = true } = {}) {
  const a = (product && product.art) || {};
  const c = a.color || product?.color || '#cfc6b8', k = a.accent || product?.accent || '#6b5a4a';
  const u = 'm' + (++uid);
  const draw = ART[a.kind] || ART.bag;
  let body = ''; try { body = draw(u, c, k); } catch { body = ART.bag(u, c, k); }
  const haloColor = a.kind === 'cup' || a.kind === 'bottle' && toRgb(c).reduce((s, v) => s + v, 0) < 200 ? k : c;
  return `<svg class="art" width="${size}" height="${size}" viewBox="0 0 120 120" aria-hidden="true"><defs>${halo(u, haloColor)}</defs>${bg ? `<circle cx="60" cy="58" r="56" fill="url(#${u}h)"/>` : ''}${body}</svg>`;
}

// ---- 品牌 logo（圓形色塊＋類型圖示） ----
const LOGO_ICON = {
  dessert: (b) => `<circle cx="20" cy="20" r="13" fill="#fff6e8"/><path d="M20 10c4 2 6 5.5 5.4 9.6-.6 3.6-3.1 5.9-5.4 5.9s-4.8-2.3-5.4-5.9C14 15.5 16 12 20 10z" fill="#2DB674"/>`,
  coffee: (b) => `<ellipse cx="20" cy="20" rx="8.5" ry="11.5" transform="rotate(28 20 20)" fill="#fff4e3"/><path d="M15.5 12 q6 6 0 8 q-5 3 1.6 9.6" transform="rotate(10 20 20)" stroke="${b}" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  leather: (b) => `<path d="M12 28 L28 12" stroke="#f6e7d0" stroke-width="2.6" stroke-linecap="round"/><ellipse cx="26.5" cy="13.5" rx="2.2" ry="1.2" transform="rotate(-45 26.5 13.5)" fill="${b}"/><path d="M10 22 q6 -2 8 4 q2 6 10 4" stroke="#f6e7d0" stroke-width="1.4" fill="none" stroke-dasharray="2.2 1.8"/>`,
  flower: (b) => `${Array.from({ length: 5 }, (_, i) => { const a = i / 5 * Math.PI * 2 - Math.PI / 2; return `<ellipse cx="${(20 + Math.cos(a) * 6.5).toFixed(1)}" cy="${(19 + Math.sin(a) * 6.5).toFixed(1)}" rx="5" ry="3.8" transform="rotate(${(a * 180 / Math.PI).toFixed(0)} ${(20 + Math.cos(a) * 6.5).toFixed(1)} ${(19 + Math.sin(a) * 6.5).toFixed(1)})" fill="#fff4f6"/>`; }).join('')}<circle cx="20" cy="19" r="3.4" fill="#ffd27a"/>`,
  service: (b) => `<rect x="16" y="8" width="8" height="10" rx="2" fill="#fff"/><rect x="13" y="18" width="14" height="15" rx="4" fill="#fff4f6"/><rect x="15.5" y="21" width="9" height="9" rx="2" fill="${b}" opacity=".7"/>`,
  drink: (b) => `<path d="M12 14 h14 l-1.6 14 q-5.4 2.4 -10.8 0 z" fill="#fff8ec"/><path d="M26 17 q5 0 4.4 4.6 q-.6 3.6 -5.2 3.4" fill="none" stroke="#fff8ec" stroke-width="1.8"/><path d="M15 11 q-1.6 -2.4 0 -4 M19 11 q-1.6 -2.4 0 -4 M23 11 q-1.6 -2.4 0 -4" stroke="#fff8ec" stroke-width="1.4" fill="none" stroke-linecap="round"/>`,
  retail: (b) => `<path d="M11 15 h18 l-1.6 16 h-14.8 z" fill="#fff8ec"/><path d="M15 15 v-2.4 a5 5 0 0 1 10 0 v2.4" fill="none" stroke="#fff8ec" stroke-width="1.8"/><circle cx="16" cy="19" r="1.2" fill="${b}"/><circle cx="24" cy="19" r="1.2" fill="${b}"/>`,
  craft: (b) => `<circle cx="20" cy="20" r="8.5" fill="none" stroke="#fff8ec" stroke-width="2.4"/><path d="M14 26 L27 11" stroke="#fff8ec" stroke-width="2" stroke-linecap="round"/><circle cx="20" cy="20" r="3" fill="#fff8ec"/>`,
  farm: (b) => `<path d="M20 31 V18" stroke="#fff8ec" stroke-width="2" stroke-linecap="round"/><path d="M20 20 q-9 -1 -9 -10 q9 0 9 10z" fill="#fff8ec"/><path d="M20 18 q8 -1 8 -9 q-8 0 -8 9z" fill="#fff8ec" opacity=".85"/>`,
  food: (b) => `<path d="M9 19 h22 q-1 10 -11 11 q-10 -1 -11 -11 z" fill="#fff8ec"/><path d="M14 15 q-2 -3 0 -5 M20 15 q-2 -3 0 -5 M26 15 q-2 -3 0 -5" stroke="#fff8ec" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M27 8 L16 19" stroke="#fff8ec" stroke-width="1.4"/>`,
};
export function merchantLogo(m, size = 40) {
  const b = (m && m.brand) || '#F7B2C4';
  const icon = LOGO_ICON[m?.type] || LOGO_ICON[m?.cat] || LOGO_ICON.dessert;
  return `<svg viewBox="0 0 40 40" width="${size}" height="${size}" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="${b}"/><circle cx="20" cy="20" r="19" fill="none" stroke="#fff" stroke-opacity=".35"/>${icon(b)}</svg>`;
}
