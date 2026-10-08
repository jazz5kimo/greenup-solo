// 第 2 組：烘焙甜點 4 家＋蜂蜜 1 家＋零售選物 6 家（全部為虛構業主）
// BIZ：{ merchant, theme, profile }；ART：本組新增的商品插圖（kind 皆以 g2_ 開頭）

// ---- 色彩工具（本檔自用） ----
const toRgb = (h) => { h = String(h || '#999').replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = (r, g, b) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const x = toRgb(a), y = toRgb(b); return toHex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t); };
const dk = (c, t = 0.25) => mix(c, '#000000', t);
const lt = (c, t = 0.35) => mix(c, '#ffffff', t);
const f1 = (n) => (+n).toFixed(1);

// ---- SVG 零件 ----
const vg = (id, a, b) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const hg = (id, a, b) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const rg = (id, a, b, cx = 0.4, cy = 0.35) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r=".75"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>`;
const sh = (rx = 36, cy = 98) => `<ellipse cx="60" cy="${cy}" rx="${rx}" ry="${Math.max(4, rx / 6).toFixed(1)}" fill="rgba(0,0,0,.16)"/>`;
const hi = (d, o = 0.24) => `<path d="${d}" fill="#fff" opacity="${o}"/>`;
const steam = (x = 60, y = 30, c = '#c9b8a6') => `<g fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round" opacity=".7"><path d="M${x - 7} ${y} q-4 -6 0 -11 q4 -5 0 -10"/><path d="M${x + 3} ${y - 3} q-4 -6 0 -11 q4 -5 0 -10"/></g>`;
const leaf = (x, y, r, c, s = 1) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})"><path d="M0 0 q8 -10 18 0 q-10 9 -18 0z" fill="${c}"/><path d="M1 0 h15" stroke="${dk(c, 0.3)}" stroke-width=".8"/></g>`;
const bloom = (x, y, r, c, ctr = '#ffe08a', n = 5) => `<g transform="translate(${x} ${y})">${Array.from({ length: n }, (_, i) => { const t = i / n * Math.PI * 2; const px = f1(Math.cos(t) * r * 0.6), py = f1(Math.sin(t) * r * 0.6); return `<ellipse cx="${px}" cy="${py}" rx="${f1(r * 0.55)}" ry="${f1(r * 0.4)}" transform="rotate(${Math.round(t * 180 / Math.PI)} ${px} ${py})" fill="${c}"/>`; }).join('')}<circle r="${f1(r * 0.3)}" fill="${ctr}"/></g>`;
const wheat = (x, y, r, s = 1, c = '#d4a64a') => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})"><path d="M0 0 V-34" stroke="${dk(c, 0.15)}" stroke-width="1.6" stroke-linecap="round"/>${Array.from({ length: 5 }, (_, i) => `<ellipse cx="-3" cy="${-12 - i * 5}" rx="2.3" ry="4.2" transform="rotate(-28 -3 ${-12 - i * 5})" fill="${c}"/><ellipse cx="3" cy="${-14 - i * 5}" rx="2.3" ry="4.2" transform="rotate(28 3 ${-14 - i * 5})" fill="${lt(c, 0.1)}"/>`).join('')}<ellipse cy="-39" rx="2.2" ry="4" fill="${c}"/></g>`;
// 立體方塊（正面＋頂面＋側面）
const box3 = (x, y, w, h, d, c, front) => `<path d="M${x} ${y} l${d} ${-d} h${w} l${-d} ${d} z" fill="${lt(c, 0.18)}"/><path d="M${x + w} ${y} l${d} ${-d} v${h} l${-d} ${d} z" fill="${dk(c, 0.22)}"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${front || c}"/>`;
// 冰淇淋球（底部波浪裙邊）
const scoop = (cx, cy, r, c, u) => { const n = 6, w = (r * 2) / n; let skirt = `M${f1(cx - r)} ${f1(cy + r * 0.25)}`; for (let i = 0; i < n; i++) skirt += ` q${f1(w / 2)} ${f1(r * 0.32)} ${f1(w)} 0`; return `<path d="M${f1(cx - r)} ${f1(cy + r * 0.25)} a${r} ${r} 0 1 1 ${f1(r * 2)} 0 z" fill="${u}"/><path d="${skirt} v${f1(-r * 0.3)} h${f1(-r * 2)} z" fill="${dk(c, 0.08)}"/><path d="${skirt}" fill="none" stroke="${dk(c, 0.18)}" stroke-width="1"/><ellipse cx="${f1(cx - r * 0.35)}" cy="${f1(cy - r * 0.4)}" rx="${f1(r * 0.32)}" ry="${f1(r * 0.2)}" fill="#fff" opacity=".35" transform="rotate(-25 ${f1(cx - r * 0.35)} ${f1(cy - r * 0.4)})"/>`; };
const paw = (x, y, s, c) => `<g transform="translate(${x} ${y}) scale(${s})" fill="${c}"><ellipse cx="0" cy="3" rx="6" ry="5"/><ellipse cx="-7" cy="-4" rx="2.6" ry="3.2"/><ellipse cx="-2.5" cy="-8" rx="2.6" ry="3.3"/><ellipse cx="2.5" cy="-8" rx="2.6" ry="3.3"/><ellipse cx="7" cy="-4" rx="2.6" ry="3.2"/></g>`;
const hexPath = (cx, cy, r) => 'M' + Array.from({ length: 6 }, (_, i) => { const t = Math.PI / 6 + i * Math.PI / 3; return `${f1(cx + Math.cos(t) * r)} ${f1(cy + Math.sin(t) * r)}`; }).join(' L') + 'z';

// ---- 新增插圖 ----
export const ART = {
  // 天然酵母鄉村麵包
  g2_boule: (u, c, a) => `<defs>${rg(u + 'x', lt(c, 0.28), dk(c, 0.28), 0.42, 0.3)}</defs>${sh(40)}
    ${wheat(98, 92, 24, 0.9)}${wheat(22, 94, -28, 0.8)}
    <path d="M18 76 q0 -42 42 -44 q42 2 42 44 q0 20 -42 20 q-42 0 -42 -20z" fill="url(#${u}x)"/>
    <path d="M18 76 q0 20 42 20 q42 0 42 -20 q-8 12 -42 12 q-34 0 -42 -12z" fill="${dk(c, 0.35)}" opacity=".45"/>
    <path d="M30 56 q30 -26 60 0 q-30 -14 -60 0z" fill="#fff" opacity=".32"/>
    <path d="M28 74 Q58 46 94 64" stroke="${a}" stroke-width="8" fill="none" stroke-linecap="round"/>
    <path d="M28 70 Q58 41 94 60" stroke="${dk(c, 0.38)}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    ${[0, 1, 2, 3].map(i => `<path d="M${38 + i * 13} 86 l7 -6" stroke="${lt(a, 0.2)}" stroke-width="2.4" stroke-linecap="round" opacity=".85"/>`).join('')}
    ${[[44, 48], [62, 42], [76, 47], [52, 60]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4" fill="#fff" opacity=".55"/>`).join('')}`,

  // 生吐司／磅蛋糕（山形）＋切片
  g2_toast: (u, c, a) => `<defs>${vg(u + 'x', lt(c, 0.18), dk(c, 0.22))}${vg(u + 'y', lt(a, 0.5), a)}</defs>${sh(42)}
    <path d="M14 60 q0 -18 12 -20 q10 -2 12 6 q2 -11 12 -11 q10 0 12 11 q2 -8 12 -6 q12 2 12 20 v32 q0 4 -4 4 h-64 q-4 0 -4 -4 z" fill="url(#${u}x)"/>
    ${hi('M18 52 q2 -8 8 -9 q-4 4 -4 10z', 0.35)}${hi('M42 44 q2 -6 8 -6 q-4 3 -4 8z', 0.35)}${hi('M66 46 q3 -6 8 -5 q-4 3 -4 8z', 0.35)}
    <path d="M14 82 h76" stroke="${dk(c, 0.3)}" stroke-width="1" opacity=".4"/>
    <g transform="rotate(6 84 74)">
      <path d="M62 64 q0 -16 11 -16 q7 0 10 6 q3 -6 10 -6 q11 0 11 16 v28 q0 4 -4 4 h-34 q-4 0 -4 -4 z" fill="${dk(c, 0.1)}"/>
      <path d="M65.5 64.5 q0 -13 8.5 -13 q6 0 9 6 q3 -6 9 -6 q8.5 0 8.5 13 v26 q0 2.5 -2.5 2.5 h-30.5 q-2.5 0 -2.5 -2.5 z" fill="url(#${u}y)"/>
      ${[[72, 66, 1.6], [86, 62, 1.3], [94, 74, 1.5], [78, 80, 1.2], [90, 86, 1.4], [70, 86, 1]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r * 1.4}" ry="${r}" fill="${dk(a, 0.12)}" opacity=".6"/>`).join('')}
    </g>`,

  // 可頌
  g2_croissant: (u, c, a) => { const segs = [-3, 3, -2, 2, -1, 1, 0]; return `<defs>${rg(u + 'x', lt(c, 0.3), dk(c, 0.22), 0.45, 0.3)}</defs>${sh(42)}
    ${segs.map(i => { const t = i * 0.34, x = 60 + Math.sin(t) * 40, y = 56 + (1 - Math.cos(t)) * 40, rx = 14 - Math.abs(i) * 2.2, ry = 23 - Math.abs(i) * 3.6; return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(t * 57.3)})"><ellipse rx="${rx}" ry="${ry}" fill="url(#${u}x)" stroke="${dk(c, 0.3)}" stroke-width="1.1"/><path d="M${-rx * 0.6} ${-ry * 0.55} q${rx * 0.6} ${-ry * 0.25} ${rx * 1.2} 0" stroke="${a}" stroke-width="1.3" fill="none" opacity=".55"/><ellipse cx="${f1(-rx * 0.3)}" cy="${f1(-ry * 0.45)}" rx="${f1(rx * 0.3)}" ry="${f1(ry * 0.18)}" fill="#fff" opacity=".35"/></g>`; }).join('')}
    ${[[50, 44], [66, 40], [58, 52]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.4" ry=".8" fill="#fff6dc" opacity=".8"/>`).join('')}`; },

  // 肉桂捲（俯視）
  g2_cinnamon: (u, c, a) => { let d = ''; for (let t = 0; t <= Math.PI * 2 * 3.1; t += 0.22) { const r = 2 + t * (27 / (Math.PI * 2 * 3.1)); d += `${d ? ' L' : 'M'}${f1(60 + Math.cos(t) * r)} ${f1(56 + Math.sin(t) * r * 0.82)}`; } return `<defs>${rg(u + 'x', lt(c, 0.3), dk(c, 0.15), 0.45, 0.4)}</defs>${sh(40)}
    <ellipse cx="60" cy="62" rx="36" ry="32" fill="${dk(c, 0.3)}"/>
    <ellipse cx="60" cy="56" rx="35" ry="29" fill="url(#${u}x)"/>
    <path d="${d}" fill="none" stroke="${dk(c, 0.4)}" stroke-width="3.2" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="${lt(c, 0.35)}" stroke-width="1.2" stroke-linecap="round" transform="translate(1.8 1.4)" opacity=".7"/>
    <path d="M30 46 l9 18 l8 -24 l9 26 l8 -26 l9 24 l8 -20 l6 10" fill="none" stroke="${a}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" opacity=".95"/>
    ${hi('M34 40 q10 -10 24 -12 q-14 6 -22 16z', 0.3)}`; },

  // 冰淇淋紙杯（雙球）
  g2_scoopcup: (u, c, a) => `<defs>${rg(u + 'x', lt(c, 0.35), dk(c, 0.08), 0.4, 0.3)}${vg(u + 'y', lt(a, 0.25), dk(a, 0.12))}</defs>${sh(30)}
    <path d="M78 22 l14 -10" stroke="${dk(a, 0.2)}" stroke-width="5" stroke-linecap="round"/><path d="M74 30 q-4 -8 4 -10 q6 0 4 8 z" fill="${lt(a, 0.5)}"/>
    ${scoop(48, 52, 16, c, `url(#${u}x)`)}${scoop(72, 50, 15, c, `url(#${u}x)`)}${scoop(60, 36, 14, c, `url(#${u}x)`)}
    <rect x="32" y="62" width="56" height="8" rx="3" fill="${dk(a, 0.1)}"/>
    <path d="M35 70 h50 l-6 26 h-38 z" fill="url(#${u}y)"/>
    ${[44, 54, 64, 74].map(x => `<path d="M${x} 70 l${(x - 60) * -0.1} 26" stroke="#fff" stroke-width="3" opacity=".35"/>`).join('')}
    ${[[52, 30, '#fff'], [66, 34, dk(c, 0.3)], [44, 46, dk(c, 0.3)], [76, 44, '#fff'], [58, 44, lt(a, 0.3)]].map(([x, y, f]) => `<rect x="${x}" y="${y}" width="4" height="1.6" rx=".8" fill="${f}" transform="rotate(${x % 3 * 30 - 30} ${x} ${y})"/>`).join('')}`,

  // 甜筒
  g2_cone: (u, c, a) => `<defs>${rg(u + 'x', lt(c, 0.35), dk(c, 0.1))}${rg(u + 'z', lt(a, 0.35), dk(a, 0.1))}${vg(u + 'k', '#e7b46a', '#b9792f')}<clipPath id="${u}c"><path d="M38 58 L60 100 L82 58z"/></clipPath></defs>${sh(18, 100)}
    <path d="M38 58 L60 100 L82 58z" fill="url(#${u}k)"/>
    <g clip-path="url(#${u}c)" stroke="#9a6224" stroke-width="1.4" opacity=".6">${Array.from({ length: 8 }, (_, i) => `<path d="M${20 + i * 10} 50 l30 52"/><path d="M${100 - i * 10} 50 l-30 52"/>`).join('')}</g>
    ${scoop(60, 50, 22, a, `url(#${u}z)`)}${scoop(60, 30, 17, c, `url(#${u}x)`)}
    <circle cx="66" cy="12" r="5" fill="#d63a4a"/><path d="M66 7 q2 -6 8 -6" stroke="#5b8a3c" stroke-width="1.6" fill="none"/><circle cx="64.5" cy="10.5" r="1.4" fill="#fff" opacity=".6"/>`,

  // 外帶盒
  g2_pint: (u, c, a) => `<defs>${hg(u + 'x', lt(c, 0.2), dk(c, 0.18))}</defs>${sh(32)}
    <path d="M34 40 h52 l-5 50 q-21 6 -42 0 z" fill="url(#${u}x)"/>
    <ellipse cx="60" cy="90" rx="21" ry="4" fill="${dk(c, 0.2)}" opacity=".5"/>
    <rect x="31" y="30" width="58" height="12" rx="4" fill="${lt(c, 0.5)}"/><ellipse cx="60" cy="30" rx="29" ry="5" fill="${lt(c, 0.7)}"/>
    <path d="M36 52 h48 l-2 22 h-44 z" fill="#fffdf8"/>
    ${scoop(60, 61, 8, a, a)}
    <rect x="47" y="70" width="26" height="2.2" rx="1.1" fill="${dk(c, 0.2)}"/>
    ${hi('M38 44 h5 l3 42 h-4z', 0.3)}
    <circle cx="94" cy="80" r="2.5" fill="${a}" opacity=".7"/><circle cx="26" cy="74" r="2" fill="${c}" opacity=".7"/>`,

  // 水果冰棒
  g2_popsicle: (u, c, a) => `<defs>${hg(u + 'x', lt(c, 0.2), dk(c, 0.12))}${hg(u + 'z', lt(a, 0.2), dk(a, 0.12))}</defs>${sh(32)}
    <g transform="rotate(16 74 60)"><rect x="70" y="74" width="8" height="24" rx="4" fill="#d9b07a"/><rect x="54" y="16" width="40" height="64" rx="18" fill="url(#${u}z)"/>${hi('M59 26 q2 -6 6 -6 v52 q-6 0 -6 -6z', 0.28)}</g>
    <g transform="rotate(-10 50 60)"><rect x="46" y="76" width="8" height="24" rx="4" fill="#e3bd86"/><path d="M48 92 h4" stroke="#b98c55"/>
      <rect x="30" y="18" width="40" height="64" rx="18" fill="url(#${u}x)"/>
      ${[[40, 36], [56, 30], [48, 52], [60, 62], [38, 68]].map(([x, y], i) => `<path d="M${x} ${y} l6 -3 l3 6 l-6 3z" fill="${i % 2 ? lt(c, 0.4) : dk(c, 0.15)}" opacity=".8"/>`).join('')}
      ${hi('M35 28 q2 -6 6 -6 v52 q-6 0 -6 -6z', 0.3)}</g>
    <circle cx="96" cy="26" r="2.4" fill="${a}"/><circle cx="22" cy="40" r="2" fill="${c}"/>`,

  // 木模月餅＋切片
  g2_mooncake: (u, c, a) => { const N = 14, R = 30, cx = 52, cy = 56; let d = ''; for (let k = 0; k < N; k++) { const t0 = k / N * Math.PI * 2, t1 = (k + 1) / N * Math.PI * 2, tm = (t0 + t1) / 2; if (!k) d = `M${f1(cx + Math.cos(t0) * R)} ${f1(cy + Math.sin(t0) * R)}`; d += ` Q${f1(cx + Math.cos(tm) * R * 1.16)} ${f1(cy + Math.sin(tm) * R * 1.16)} ${f1(cx + Math.cos(t1) * R)} ${f1(cy + Math.sin(t1) * R)}`; } return `<defs>${rg(u + 'x', lt(c, 0.3), dk(c, 0.25))}</defs>${sh(42)}
    <ellipse cx="${cx}" cy="${cy + 7}" rx="${R + 4}" ry="${R}" fill="${dk(c, 0.35)}"/>
    <path d="${d}z" fill="url(#${u}x)"/>
    <circle cx="${cx}" cy="${cy}" r="22" fill="none" stroke="${dk(c, 0.28)}" stroke-width="1.6"/>
    <circle cx="${cx}" cy="${cy}" r="19" fill="none" stroke="${lt(c, 0.3)}" stroke-width="1" stroke-dasharray="2 2.4"/>
    ${Array.from({ length: 8 }, (_, i) => `<ellipse cx="${cx}" cy="${cy - 10}" rx="4" ry="8" fill="${lt(c, 0.12)}" stroke="${dk(c, 0.25)}" stroke-width="1" transform="rotate(${i * 45} ${cx} ${cy})"/>`).join('')}
    <circle cx="${cx}" cy="${cy}" r="5" fill="${dk(c, 0.18)}"/><circle cx="${cx}" cy="${cy}" r="2.2" fill="${lt(c, 0.35)}"/>
    <path d="M86 94 L82.5 74.3 A20 20 0 0 1 104.8 87.2 Z" fill="${a}" stroke="${c}" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="90" cy="84" r="4.6" fill="#f2b233"/><circle cx="89" cy="83" r="1.4" fill="#fff" opacity=".5"/>
    ${hi('M30 40 q10 -12 24 -14 q-12 6 -20 18z', 0.3)}`; },

  // 酥皮餅（綠豆椪、蛋黃酥）
  g2_flaky: (u, c, a) => `<defs>${rg(u + 'x', lt(c, 0.45), dk(c, 0.12), 0.45, 0.25)}</defs>${sh(42)}
    <path d="M16 84 q0 -42 36 -44 q36 2 36 44 q-36 8 -72 0 z" fill="url(#${u}x)"/>
    ${[0, 1, 2, 3].map(i => `<path d="M${22 + i * 3} ${80 - i * 7} q${30 - i * 3} ${-26 + i * 5} ${60 - i * 6} 0" fill="none" stroke="${dk(c, 0.14)}" stroke-width="1" opacity=".55"/>`).join('')}
    <circle cx="52" cy="52" r="4" fill="#c43a2f"/><circle cx="52" cy="52" r="1.6" fill="#e86a5a"/>
    <path d="M64 96 a22 18 0 0 1 44 0 z" fill="${c}"/><path d="M69 96 a17 13 0 0 1 34 0 z" fill="${a}"/>
    <circle cx="86" cy="92" r="5" fill="#f2b233" opacity="${a === c ? 0 : 0.9}"/>
    ${[0, 1].map(i => `<path d="M${66 + i * 2} ${94 - i * 4} a${20 - i * 2} ${16 - i * 3} 0 0 1 ${40 - i * 4} 0" fill="none" stroke="${lt(c, 0.4)}" stroke-width=".8"/>`).join('')}
    ${hi('M26 70 q6 -20 22 -24 q-14 10 -16 28z', 0.35)}`,

  // 鳳梨酥
  g2_pineapple: (u, c, a) => `${sh(42)}
    ${box3(18, 52, 40, 24, 10, c)}<rect x="18" y="52" width="40" height="24" fill="${c}"/>${hi('M20 54 h36 v3 h-36z', 0.3)}
    <g transform="translate(44 16)">${box3(16, 56, 40, 24, 10, c)}<rect x="20" y="60" width="32" height="16" rx="2" fill="${a}"/>${[0, 1, 2, 3, 4].map(i => `<path d="M${24 + i * 6} 62 q2 6 -1 12" stroke="${dk(a, 0.2)}" stroke-width="1" fill="none" opacity=".6"/>`).join('')}</g>
    <g transform="translate(54 34) scale(.8)">${leaf(0, 0, -100, '#5c8e57', 1)}${leaf(2, 0, -60, '#6fa36b', 0.9)}${leaf(-2, 0, -140, '#6fa36b', 0.9)}</g>
    ${[[30, 92], [38, 95], [100, 92]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="${lt(c, 0.2)}"/>`).join('')}`,

  // 禮盒
  g2_giftbox: (u, c, a) => `<defs>${vg(u + 'x', lt(c, 0.1), dk(c, 0.2))}</defs>${sh(40)}
    <rect x="26" y="50" width="68" height="44" rx="3" fill="url(#${u}x)"/>
    ${[[34, 60], [80, 62], [36, 84], [82, 86], [46, 74], [72, 76]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="none" stroke="${a}" stroke-width="1" opacity=".55"/>`).join('')}
    <rect x="22" y="40" width="76" height="14" rx="3" fill="${lt(c, 0.06)}"/><rect x="22" y="51" width="76" height="3" fill="${dk(c, 0.3)}" opacity=".5"/>
    <rect x="55" y="40" width="10" height="54" fill="${a}"/><rect x="22" y="44" width="76" height="6" fill="${a}"/>
    <path d="M60 40 q-24 -22 -24 -4 q2 8 24 4z" fill="${a}"/><path d="M60 40 q24 -22 24 -4 q-2 8 -24 4z" fill="${dk(a, 0.1)}"/>
    <path d="M60 40 q-16 -12 -18 -4" stroke="${dk(a, 0.3)}" stroke-width="1" fill="none"/><circle cx="60" cy="40" r="5" fill="${dk(a, 0.15)}"/>
    <rect x="70" y="62" width="18" height="12" rx="2" fill="#fffaf0" transform="rotate(8 79 68)"/><path d="M73 67 h12 M73 70 h8" stroke="${c}" stroke-width="1.2" transform="rotate(8 79 68)"/>
    ${hi('M28 56 h4 v34 h-4z', 0.22)}`,

  // 巧克力片（半拆包裝）
  g2_chocbar: (u, c, a) => `<defs>${vg(u + 'f', '#f4f5f7', '#a9adb5')}</defs>${sh(36)}
    <g transform="rotate(-12 60 60)">
      <rect x="32" y="16" width="56" height="50" rx="3" fill="${dk(c, 0.2)}"/>
      ${[0, 1].map(j => [0, 1, 2].map(i => `<rect x="${34 + i * 18}" y="${18 + j * 18}" width="16" height="16" rx="2" fill="${c}"/><rect x="${37 + i * 18}" y="${21 + j * 18}" width="10" height="10" rx="1.5" fill="${lt(c, 0.12)}"/><path d="M${37 + i * 18} ${21 + j * 18} h10" stroke="#fff" stroke-opacity=".3"/>`).join('')).join('')}
      <path d="M30 56 ${Array.from({ length: 10 }, (_, i) => `l3 ${i % 2 ? 4 : -4} l3 ${i % 2 ? -4 : 4}`).join(' ')} v10 h-60 z" fill="url(#${u}f)"/>
      <rect x="28" y="62" width="64" height="38" rx="2" fill="${a}"/>
      <rect x="28" y="70" width="64" height="18" fill="${lt(a, 0.75)}"/>
      <text x="60" y="83" text-anchor="middle" font-family="Georgia, serif" font-size="11" font-weight="700" fill="${dk(c, 0.1)}" letter-spacing="1">CACAO</text>
      <path d="M28 94 h64" stroke="${dk(a, 0.25)}" stroke-width="1.4"/>
      ${hi('M31 64 h4 v34 h-4z', 0.25)}
    </g>`,

  // 夾心巧克力盒
  g2_bonbon: (u, c, a) => { const cols = [c, lt(c, 0.4), dk(c, 0.25), '#f3e6d4', mix(c, '#d98a8a', 0.5), lt(c, 0.15)]; return `<defs>${vg(u + 'b', lt(a, 0.12), dk(a, 0.15))}</defs>${sh(44)}
    <path d="M22 46 L28 16 h64 l6 30 z" fill="${dk(a, 0.25)}"/><path d="M28 16 h64 l1 5 h-66z" fill="${lt(a, 0.15)}"/><rect x="55" y="16" width="10" height="30" fill="#d98a8a" opacity=".85"/>
    <rect x="16" y="44" width="88" height="50" rx="6" fill="url(#${u}b)"/>
    <rect x="21" y="49" width="78" height="40" rx="4" fill="${dk(a, 0.35)}"/>
    ${[0, 1].map(j => [0, 1, 2].map(i => { const x = 34 + i * 26, y = 60 + j * 18, k = j * 3 + i, col = cols[k]; return `<circle cx="${x}" cy="${y + 1.5}" r="9.5" fill="rgba(0,0,0,.25)"/><circle cx="${x}" cy="${y}" r="9" fill="${col}"/>${k % 3 === 0 ? `<path d="M${x - 6} ${y - 1} q3 -3 6 0 t6 0" stroke="${k ? dk(col, 0.4) : lt(col, 0.5)}" stroke-width="1.4" fill="none"/>` : k % 3 === 1 ? `<circle cx="${x}" cy="${y - 1}" r="2.4" fill="#d63a4a"/>` : `<path d="M${x - 4} ${y - 4} l8 8 M${x + 4} ${y - 4} l-8 8" stroke="${lt(col, 0.45)}" stroke-width="1"/>`}<ellipse cx="${x - 3}" cy="${y - 4}" rx="2.6" ry="1.4" fill="#fff" opacity=".35"/>`; }).join('')).join('')}`; },

  // 生巧克力（可可粉方塊）
  g2_truffle: (u, c, a) => `${sh(42)}
    <rect x="16" y="68" width="88" height="22" rx="11" fill="${a}"/><rect x="16" y="64" width="88" height="22" rx="11" fill="${lt(a, 0.25)}"/>
    ${[[30, 50], [50, 46], [70, 50], [40, 34], [62, 32]].map(([x, y], i) => `<g transform="translate(${x} ${y})">${box3(0, 0, 18, 14, 6, c)}${Array.from({ length: 8 }, (_, k) => `<circle cx="${(k * 7 + i * 3) % 18 + 1}" cy="${(k * 5 + i) % 13 + 1}" r=".8" fill="${lt(c, 0.35)}"/>`).join('')}</g>`).join('')}
    <path d="M88 30 l10 -14" stroke="#c9a77a" stroke-width="2" stroke-linecap="round"/><path d="M88 30 l-3 4" stroke="#c9a77a" stroke-width="3" stroke-linecap="round"/>
    ${[[24, 60], [96, 58], [86, 44], [34, 64]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.2" fill="${c}" opacity=".6"/>`).join('')}`,

  // 蜂蜜罐＋蜜勺
  g2_honeyjar: (u, c, a) => `<defs>${vg(u + 'x', lt(c, 0.3), dk(c, 0.25))}</defs>${sh(40)}
    <path d="M30 46 q-4 0 -4 6 v36 q0 8 8 8 h40 q8 0 8 -8 v-36 q0 -6 -4 -6z" fill="url(#${u}x)"/>
    <path d="M30 46 q-4 0 -4 6 v36 q0 8 8 8 h40 q8 0 8 -8 v-36 q0 -6 -4 -6z" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="1.4"/>
    <path d="${hexPath(54, 70, 13)}" fill="#fff8e6"/><path d="${hexPath(54, 70, 10)}" fill="none" stroke="${c}" stroke-width="1"/>
    <g transform="translate(54 70)"><ellipse rx="4" ry="3" fill="${dk(c, 0.35)}"/><path d="M-1.5 -3 v6 M1.5 -3 v6" stroke="#f6d36b" stroke-width="1"/><ellipse cx="-2" cy="-4" rx="2.6" ry="1.6" fill="#fff" opacity=".9"/><ellipse cx="2" cy="-4" rx="2.6" ry="1.6" fill="#fff" opacity=".9"/></g>
    <rect x="28" y="36" width="52" height="12" rx="3" fill="${dk(a, 0.15)}"/>
    <path d="M24 38 q30 -14 60 0 l-4 8 q-26 -8 -52 0z" fill="${a}"/>
    ${[0, 1, 2, 3, 4].map(i => `<path d="M${30 + i * 11} 34 v10" stroke="${dk(a, 0.18)}" stroke-width="2.2" opacity=".5"/>`).join('')}
    <path d="M28 46 q26 -6 52 0" stroke="#c9a04a" stroke-width="2" fill="none"/>
    <path d="M38 46 q-2 8 0 12 q2 -4 1 -12z" fill="${c}"/>
    ${hi('M31 52 h4 v36 h-4z', 0.32)}
    <path d="M106 18 L88 58" stroke="#b98a55" stroke-width="3.4" stroke-linecap="round"/>
    <g transform="rotate(24 86 66)">${[0, 1, 2, 3].map(i => `<ellipse cx="86" cy="${58 + i * 4.5}" rx="${7 - Math.abs(i - 1.5) * 1.2}" ry="2.6" fill="${i % 2 ? '#c99a62' : '#b5844b'}"/>`).join('')}</g>
    <path d="M86 76 q1 8 -1 12 q-2 -4 1 -12z" fill="${c}"/><circle cx="85" cy="92" r="2.4" fill="${c}"/>`,

  // 巢蜜
  g2_comb: (u, c, a) => { const cells = []; for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) { const x = 26 + k * 12.2 + (r % 2) * 6.1, y = 38 + r * 10.6; if (x < 96) cells.push([x, y, r, k]); } return `<defs>${vg(u + 'x', lt(c, 0.3), dk(c, 0.12))}${vg(u + 'w', lt(a, 0.15), dk(a, 0.2))}</defs>${sh(44)}
    <rect x="14" y="80" width="84" height="14" rx="7" fill="url(#${u}w)"/><rect x="94" y="84" width="16" height="6" rx="3" fill="${dk(a, 0.1)}"/><circle cx="104" cy="87" r="1.4" fill="${dk(a, 0.4)}"/>
    <path d="M18 32 h84 v44 q-42 6 -84 0 z" fill="${dk(c, 0.15)}"/>
    ${cells.map(([x, y, r, k]) => `<path d="${hexPath(x, y, 6.6)}" fill="${(r + k) % 3 ? `url(#${u}x)` : lt(c, 0.5)}" stroke="${dk(c, 0.28)}" stroke-width="1.4"/>`).join('')}
    ${[[30, 76, 8], [52, 77, 12], [80, 76, 6]].map(([x, y, h]) => `<path d="M${x - 3} ${y} q3 ${h} 3 ${h} q3 0 3 -${h}z" fill="${c}"/><circle cx="${x}" cy="${y + h + 1}" r="2.6" fill="${c}"/>`).join('')}
    <path d="M18 32 h84" stroke="${lt(c, 0.5)}" stroke-width="2"/>${hi('M20 34 h20 v3 h-20z', 0.3)}`; },

  // 罐裝蠟燭
  g2_candle: (u, c, a) => `<defs>${vg(u + 'x', lt(c, 0.2), dk(c, 0.2))}<radialGradient id="${u}f" cx=".5" cy=".7"><stop offset="0" stop-color="#fff6c4"/><stop offset=".6" stop-color="#ffb43a"/><stop offset="1" stop-color="#ff7a1a"/></radialGradient></defs>${sh(32)}
    <circle cx="60" cy="28" r="14" fill="#ffd27a" opacity=".22"/>
    <path d="M60 14 q-7 9 -3 15 q3 3 6 0 q4 -6 -3 -15z" fill="url(#${u}f)"/><path d="M60 29 v6" stroke="#3a2a1a" stroke-width="1.6"/>
    <rect x="36" y="38" width="48" height="56" rx="8" fill="url(#${u}x)"/>
    <ellipse cx="60" cy="41" rx="22" ry="4" fill="#fbf4e4"/><ellipse cx="60" cy="41" rx="17" ry="2.6" fill="#f1e5c8"/>
    <rect x="36" y="56" width="48" height="24" fill="${a}"/>
    <rect x="44" y="61" width="32" height="2.4" rx="1.2" fill="${lt(a, 0.6)}"/>${leaf(52, 71, -20, lt(a, 0.55), 0.7)}<rect x="56" y="70" width="16" height="1.8" rx=".9" fill="${lt(a, 0.5)}"/>
    ${hi('M40 42 h4 v48 h-4z', 0.3)}`,

  // 陶杯
  g2_mug: (u, c, a) => `<defs>${hg(u + 'x', lt(c, 0.18), dk(c, 0.18))}</defs>${sh(38)}
    ${steam(54, 32)}
    <path d="M78 52 q18 0 18 16 q0 16 -18 16" fill="none" stroke="${dk(c, 0.1)}" stroke-width="7" stroke-linecap="round"/>
    <path d="M30 42 h50 v40 q0 12 -12 12 h-26 q-12 0 -12 -12z" fill="url(#${u}x)"/>
    <path d="M30 70 q6 5 12.5 0 t12.5 0 t12.5 0 t12.5 0 v12 q0 12 -12 12 h-26 q-12 0 -12 -12z" fill="${a}"/>
    <ellipse cx="55" cy="42" rx="25" ry="5" fill="${lt(c, 0.25)}"/><ellipse cx="55" cy="42.6" rx="21" ry="3.6" fill="${dk(c, 0.45)}"/>
    ${[[38, 52], [48, 60], [62, 50], [70, 62], [42, 64], [58, 58]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".9" fill="${dk(c, 0.45)}" opacity=".6"/>`).join('')}
    ${hi('M34 46 h4 v36 h-4z', 0.28)}`,

  // 摺疊毛巾組
  g2_towel: (u, c, a) => { const rows = [[76, a], [60, lt(c, 0.2)], [44, c]]; return `${sh(42)}
    ${rows.map(([y, col], i) => `<g transform="translate(${i % 2 ? 3 : 0} 0)"><rect x="22" y="${y}" width="74" height="18" rx="6" fill="${col}"/><rect x="22" y="${y + 12}" width="74" height="6" rx="3" fill="${dk(col, 0.12)}"/><path d="M28 ${y + 3} q-6 0 -6 6 q0 6 6 6" fill="${dk(col, 0.08)}"/>${Array.from({ length: 9 }, (_, k) => `<path d="M${34 + k * 7} ${y + 2} v10" stroke="${lt(col, 0.3)}" stroke-width="1" opacity=".7"/>`).join('')}<rect x="80" y="${y + 3}" width="10" height="10" fill="${lt(col, 0.4)}" opacity=".7"/></g>`).join('')}
    <rect x="66" y="36" width="16" height="11" rx="2" fill="#fffaf0" transform="rotate(-8 74 42)"/><path d="M74 36 v-6" stroke="${dk(c, 0.3)}" stroke-width="1"/>`; },

  // 玻璃花器
  g2_vase: (u, c, a) => `<defs>${vg(u + 'x', lt(c, 0.25), dk(c, 0.1))}</defs>${sh(30)}
    <path d="M60 56 q-4 -22 6 -40" stroke="#5c8e57" stroke-width="2.2" fill="none"/>${leaf(62, 34, -40, '#6fa36b', 0.9)}${leaf(60, 44, -150, '#5c8e57', 0.8)}
    ${bloom(68, 16, 10, a, '#ffe08a', 6)}
    <path d="M52 34 h16 v10 q16 8 16 30 q0 22 -24 22 q-24 0 -24 -22 q0 -22 16 -30z" fill="url(#${u}x)" opacity=".85"/>
    <path d="M38 70 q22 6 44 0 q0 22 -22 22 q-22 0 -22 -22z" fill="${dk(c, 0.18)}" opacity=".45"/>
    <path d="M52 34 h16" stroke="${lt(c, 0.5)}" stroke-width="3" stroke-linecap="round"/>
    ${[[48, 62, 2], [70, 56, 1.4], [64, 80, 1.8], [52, 82, 1.2], [74, 72, 1]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#fff" stroke-width=".8" opacity=".7"/>`).join('')}
    ${hi('M42 66 q2 -12 10 -18 v4 q-6 6 -6 16z', 0.45)}`,

  // 擴香瓶
  g2_diffuser: (u, c, a) => `<defs>${hg(u + 'x', lt(c, 0.25), dk(c, 0.2))}</defs>${sh(30)}
    ${[[30, 12], [44, 8], [60, 6], [76, 9], [90, 14]].map(([x, y]) => `<path d="M60 50 L${x} ${y}" stroke="#8a6a48" stroke-width="2" stroke-linecap="round"/>`).join('')}
    <rect x="52" y="42" width="16" height="10" rx="2" fill="${a}"/>
    <rect x="36" y="50" width="48" height="44" rx="10" fill="url(#${u}x)"/>
    <rect x="44" y="62" width="32" height="20" rx="2" fill="#fbf7ef"/><rect x="49" y="68" width="22" height="2.2" rx="1.1" fill="${a}"/><rect x="53" y="73" width="14" height="1.6" rx=".8" fill="${lt(a, 0.4)}"/>
    ${hi('M40 54 h4 v36 h-4z', 0.3)}`,

  // 丹寧外套
  g2_jacket: (u, c, a) => `<defs>${vg(u + 'x', lt(c, 0.15), dk(c, 0.2))}</defs>${sh(44)}
    <path d="M40 24 L26 30 L14 76 L26 80 L32 58 L32 94 L88 94 L88 58 L94 80 L106 76 L94 30 L80 24 Q60 32 40 24 Z" fill="url(#${u}x)"/>
    <path d="M40 24 L52 46 L60 32z" fill="${dk(c, 0.18)}"/><path d="M80 24 L68 46 L60 32z" fill="${dk(c, 0.18)}"/>
    <path d="M60 32 V94" stroke="${dk(c, 0.3)}" stroke-width="1.6"/>
    ${[50, 62, 74, 86].map(y => `<circle cx="64" cy="${y}" r="2.3" fill="${a}"/><circle cx="63.3" cy="${y - 0.7}" r=".8" fill="#fff" opacity=".6"/>`).join('')}
    <rect x="38" y="50" width="16" height="13" rx="1.5" fill="${dk(c, 0.08)}"/><path d="M38 50 h16 l-8 6z" fill="${dk(c, 0.2)}"/>
    <rect x="66" y="50" width="16" height="13" rx="1.5" fill="${dk(c, 0.08)}"/><path d="M66 50 h16 l-8 6z" fill="${dk(c, 0.2)}"/>
    <rect x="32" y="86" width="56" height="8" fill="${dk(c, 0.12)}"/>
    <g fill="none" stroke="${a}" stroke-width="1" stroke-dasharray="2.4 1.8" opacity=".85"><path d="M34 88 h52"/><path d="M39.5 51 v11 h14 v-11"/><path d="M67.5 51 v11 h14 v-11"/><path d="M33 46 q27 6 54 0"/><path d="M28 34 L18 74"/><path d="M92 34 L102 74"/></g>
    ${hi('M36 30 l4 2 l-4 60 h-3z', 0.2)}`,

  // 夏威夷衫
  g2_aloha: (u, c, a) => `<defs><clipPath id="${u}c"><path d="M42 24 L24 32 L14 54 L28 60 L34 50 L34 94 L86 94 L86 50 L92 60 L106 54 L96 32 L78 24 Q60 30 42 24Z"/></clipPath></defs>${sh(40)}
    <path d="M42 24 L24 32 L14 54 L28 60 L34 50 L34 94 L86 94 L86 50 L92 60 L106 54 L96 32 L78 24 Q60 30 42 24Z" fill="${c}"/>
    <g clip-path="url(#${u}c)">${[[30, 40], [52, 50], [76, 42], [42, 72], [70, 70], [56, 90], [96, 46], [20, 48], [84, 88], [36, 92]].map(([x, y], i) => `${leaf(x + 4, y + 6, i * 40, dk(c, 0.3), 1)}${bloom(x, y, 7, i % 2 ? a : lt(a, 0.4), dk(c, 0.2), 5)}`).join('')}</g>
    <path d="M42 24 L52 42 L60 30z" fill="${lt(c, 0.12)}"/><path d="M78 24 L68 42 L60 30z" fill="${lt(c, 0.12)}"/>
    <path d="M60 30 V94" stroke="${dk(c, 0.3)}" stroke-width="1.2"/>
    ${[50, 64, 78].map(y => `<circle cx="62" cy="${y}" r="1.8" fill="#f7efe0"/>`).join('')}`,

  // 格紋襯衫
  g2_shirt: (u, c, a) => `<defs><clipPath id="${u}c"><path d="M42 22 L26 28 L16 84 L28 86 L34 50 L34 96 L86 96 L86 50 L92 86 L104 84 L94 28 L78 22 L60 30 Z"/></clipPath></defs>${sh(40)}
    <path d="M42 22 L26 28 L16 84 L28 86 L34 50 L34 96 L86 96 L86 50 L92 86 L104 84 L94 28 L78 22 L60 30 Z" fill="${c}"/>
    <g clip-path="url(#${u}c)">${Array.from({ length: 8 }, (_, i) => `<rect x="${12 + i * 13}" y="18" width="5" height="80" fill="${dk(c, 0.3)}" opacity=".45"/><rect x="12" y="${20 + i * 12}" width="96" height="5" fill="${dk(c, 0.3)}" opacity=".45"/><rect x="${15 + i * 13}" y="18" width="1.4" height="80" fill="${a}" opacity=".7"/><rect x="12" y="${23 + i * 12}" width="96" height="1.4" fill="${a}" opacity=".7"/>`).join('')}</g>
    <path d="M42 22 L50 36 L60 30z" fill="${dk(c, 0.15)}"/><path d="M78 22 L70 36 L60 30z" fill="${dk(c, 0.15)}"/>
    <path d="M60 30 V96" stroke="${dk(c, 0.4)}" stroke-width="1.4"/>
    ${[42, 56, 70, 84].map(y => `<circle cx="62.5" cy="${y}" r="1.7" fill="#f2ead8"/>`).join('')}
    <rect x="40" y="44" width="13" height="11" rx="1" fill="none" stroke="${dk(c, 0.4)}" stroke-width="1"/>`,

  // 印花 T 恤
  g2_tee: (u, c, a) => `<defs>${vg(u + 'x', lt(c, 0.12), dk(c, 0.12))}</defs>${sh(40)}
    <path d="M44 22 L22 32 L12 54 L28 62 L34 52 L34 96 L86 96 L86 52 L92 62 L108 54 L98 32 L76 22 q-16 10 -32 0z" fill="url(#${u}x)"/>
    <path d="M44 22 q16 12 32 0" fill="none" stroke="${dk(c, 0.2)}" stroke-width="3"/>
    <circle cx="60" cy="62" r="17" fill="${a}"/><path d="M43 66 h34 v4 h-34z" fill="${c}" opacity=".7"/><path d="M46 72 h28 v3 h-28z" fill="${c}" opacity=".5"/>
    <path d="M60 46 l4 9 l9 1 l-7 6 l2 9 l-8 -5 l-8 5 l2 -9 l-7 -6 l9 -1z" fill="${lt(a, 0.6)}" transform="translate(0 -2) scale(1) "/>
    <text x="60" y="88" text-anchor="middle" font-family="Impact, 'Arial Narrow', sans-serif" font-size="8" letter-spacing="1.5" fill="${dk(a, 0.15)}">REWIND · 1979</text>
    ${hi('M38 54 l3 0 v38 h-3z', 0.2)}`,

  // 牛仔褲
  g2_jeans: (u, c, a) => `<defs>${vg(u + 'x', lt(c, 0.18), dk(c, 0.2))}</defs>${sh(36)}
    <path d="M34 26 h52 l7 66 h-24 l-9 -48 l-9 48 h-24 z" fill="url(#${u}x)"/>
    <rect x="33" y="18" width="54" height="10" rx="1.5" fill="${dk(c, 0.1)}"/>
    ${[38, 50, 70, 82].map(x => `<rect x="${x - 1.6}" y="17" width="3.2" height="12" rx="1" fill="${dk(c, 0.25)}"/>`).join('')}
    <circle cx="60" cy="23" r="2.6" fill="${a}"/><circle cx="59.4" cy="22.4" r=".9" fill="#fff" opacity=".6"/>
    <g fill="none" stroke="${a}" stroke-width="1" stroke-dasharray="2.2 1.6"><path d="M34 29 h52"/><path d="M38 30 q10 2 14 10"/><path d="M82 30 q-10 2 -14 10"/><path d="M60 29 v15 q-3 3 -6 0"/><path d="M27 88 h22"/><path d="M71 88 h22"/></g>
    <rect x="26" y="86" width="24" height="6" fill="${lt(c, 0.25)}"/><rect x="70" y="86" width="24" height="6" fill="${lt(c, 0.25)}"/>
    ${hi('M38 32 l3 0 l-5 52 h-3z', 0.22)}`,

  // 單本書
  g2_book: (u, c, a) => `<defs>${hg(u + 'x', dk(c, 0.1), lt(c, 0.12))}</defs>${sh(32)}
    <rect x="38" y="18" width="50" height="78" rx="2" fill="#f3ead7"/>${[0, 1, 2, 3, 4, 5].map(i => `<path d="M86 ${24 + i * 12} h3" stroke="#cdbf9f" stroke-width=".8"/>`).join('')}
    <rect x="32" y="16" width="52" height="78" rx="3" fill="url(#${u}x)"/>
    <rect x="32" y="16" width="8" height="78" rx="2" fill="${dk(c, 0.25)}"/><path d="M40 16 v78" stroke="${lt(c, 0.2)}" stroke-width="1"/>
    <rect x="48" y="30" width="28" height="4" rx="1" fill="${a}"/><rect x="48" y="38" width="20" height="2.4" rx="1" fill="${lt(a, 0.3)}"/>
    <circle cx="62" cy="64" r="11" fill="none" stroke="${a}" stroke-width="1.4"/>${leaf(56, 66, -40, a, 0.7)}${leaf(62, 62, -120, lt(a, 0.2), 0.6)}
    <rect x="50" y="84" width="24" height="2" rx="1" fill="${lt(a, 0.2)}" opacity=".8"/>
    <path d="M74 94 v10 l3 -3 l3 3 v-10z" fill="${a}"/>`,

  // 書堆
  g2_bookstack: (u, c, a) => { const books = [[20, 80, 78, 14, c], [26, 66, 70, 14, a], [16, 52, 74, 14, lt(c, 0.35)], [28, 40, 62, 12, dk(a, 0.2)]]; return `${sh(44)}
    ${books.map(([x, y, w, h, col]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${col}"/><rect x="${x + w - 4}" y="${y + 2}" width="3" height="${h - 4}" fill="#f3ead7"/><rect x="${x + 6}" y="${y + 2}" width="3" height="${h - 4}" fill="${lt(col, 0.4)}"/><rect x="${x + 14}" y="${y + h / 2 - 1.2}" width="${w * 0.4}" height="2.4" rx="1" fill="${lt(col, 0.55)}"/>${hi(`M${x + 1} ${y + 1} h${w - 6} v2 h-${w - 6}z`, 0.25)}`).join('')}
    <g transform="translate(64 40)"><path d="M0 0 h18 l-2 -14 h-14z" fill="#e9dcc2"/>${leaf(9, -14, -100, '#5c8e57', 1)}${leaf(9, -14, -50, '#6fa36b', 0.8)}${leaf(9, -14, -150, '#6fa36b', 0.8)}</g>`; },

  // 書籤＋翻開的書
  g2_bookmark: (u, c, a) => `<defs><linearGradient id="${u}m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${lt(c, 0.5)}"/><stop offset=".5" stop-color="${c}"/><stop offset="1" stop-color="${dk(c, 0.3)}"/></linearGradient></defs>${sh(46)}
    <path d="M60 50 Q38 42 14 48 V92 Q38 86 60 94 Q82 86 106 92 V48 Q82 42 60 50z" fill="${a}"/>
    <path d="M60 48 Q40 40 18 45 V88 Q40 82 60 90z" fill="#fbf6ea"/><path d="M60 48 Q80 40 102 45 V88 Q80 82 60 90z" fill="#f4ecdc"/>
    ${[0, 1, 2, 3, 4].map(i => `<path d="M24 ${54 + i * 7} q14 -3 28 1" stroke="#cdbf9f" stroke-width="1" fill="none"/><path d="M68 ${55 + i * 7} q14 -4 28 -1" stroke="#cdbf9f" stroke-width="1" fill="none"/>`).join('')}
    <path d="M60 48 V90" stroke="#d8ccb2" stroke-width="1.2"/>
    <path d="M74 20 h14 v52 l-7 -6 l-7 6z" fill="url(#${u}m)"/><circle cx="81" cy="28" r="2.6" fill="#fff" opacity=".85"/><path d="M78 40 l6 0 M78 46 l6 0" stroke="${dk(c, 0.3)}" stroke-width="1"/>
    <path d="M81 28 q-14 -10 -20 -2 q-4 6 -2 14" stroke="${a}" stroke-width="1.4" fill="none"/>
    <path d="M57 40 h4 l2 14 h-8z" fill="${a}"/><rect x="56" y="38" width="6" height="4" rx="2" fill="${dk(a, 0.2)}"/>
    ${hi('M75 22 h3 v44 h-3z', 0.35)}`,

  // 寵物飼料袋
  g2_kibble: (u, c, a) => `<defs>${vg(u + 'x', lt(c, 0.15), dk(c, 0.2))}</defs>${sh(38)}
    <path d="M32 26 h56 l5 64 q-33 7 -66 0 z" fill="url(#${u}x)"/>
    <rect x="30" y="20" width="60" height="9" rx="2" fill="${dk(c, 0.18)}"/>${Array.from({ length: 12 }, (_, i) => `<path d="M${33 + i * 5} 21 v7" stroke="${lt(c, 0.3)}" stroke-width=".8"/>`).join('')}
    <ellipse cx="60" cy="56" rx="20" ry="17" fill="#fffdf8"/>${paw(60, 57, 1.35, a)}
    <rect x="42" y="78" width="36" height="5" rx="2.5" fill="#fff" opacity=".85"/>
    ${hi('M36 30 h4 l3 56 h-4z', 0.28)}
    ${[[22, 92], [28, 96], [96, 93], [102, 96], [90, 97]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="3" fill="${i % 2 ? '#a8693a' : '#c4874f'}"/><circle cx="${x}" cy="${y}" r="1" fill="#7a4a24"/>`).join('')}`,

  // 寵物罐頭
  g2_petcan: (u, c, a) => { const can = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${u}s)"/><rect x="${x}" y="${y + 5}" width="${w}" height="${h - 10}" fill="url(#${u}x)"/><ellipse cx="${x + w / 2}" cy="${y + h}" rx="${w / 2}" ry="4" fill="${dk(c, 0.3)}"/><ellipse cx="${x + w / 2}" cy="${y}" rx="${w / 2}" ry="5" fill="#dfe3e8"/><ellipse cx="${x + w / 2}" cy="${y}" rx="${w / 2 - 3}" ry="3.4" fill="none" stroke="#b9bfc7"/><rect x="${x + w / 2 - 4}" y="${y - 2.4}" width="8" height="4.8" rx="2.4" fill="none" stroke="#9aa0a8" stroke-width="1.4"/><g transform="translate(${x + w / 2} ${y + h / 2 + 2})"><ellipse rx="9" ry="5.4" fill="${a}"/><path d="M8 0 l7 -5 v10z" fill="${a}"/><circle cx="-4.5" cy="-1" r="1.2" fill="${dk(c, 0.3)}"/></g>`; return `<defs>${hg(u + 'x', lt(c, 0.15), dk(c, 0.2))}${hg(u + 's', '#eef1f4', '#a9b0b8')}</defs>${sh(42)}
    ${can(58, 30, 38, 46)}${can(24, 46, 40, 46)}${hi('M27 52 h3 v34 h-3z', 0.3)}`; },

  // 骨頭零食
  g2_bone: (u, c, a) => { const bone = (s, col, id) => `<g transform="scale(${s})"><rect x="-26" y="-7" width="52" height="14" rx="4" fill="url(#${id})"/>${[[-26, -7], [-26, 7], [26, -7], [26, 7]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="8.5" fill="url(#${id})"/>`).join('')}<path d="M-20 -4 h40" stroke="#fff" stroke-width="2.4" opacity=".35" stroke-linecap="round"/><path d="M-29 -11 a6 6 0 0 1 6 -2" stroke="#fff" stroke-width="2" opacity=".35" fill="none" stroke-linecap="round"/></g>`; return `<defs>${vg(u + 'x', lt(c, 0.25), dk(c, 0.18))}${vg(u + 'z', lt(a, 0.25), dk(a, 0.18))}</defs>${sh(42)}
    <g transform="translate(76 80) rotate(14)">${bone(0.62, a, u + 'z')}</g>
    <g transform="translate(54 52) rotate(-24)">${bone(1, c, u + 'x')}</g>
    ${[[24, 84], [100, 56], [30, 30]].map(([x, y]) => `<path d="M${x} ${y - 4} l1.2 2.8 l2.8 1.2 l-2.8 1.2 l-1.2 2.8 l-1.2 -2.8 l-2.8 -1.2 l2.8 -1.2z" fill="${a}"/>`).join('')}`; },

  // 甜甜圈睡窩
  g2_petbed: (u, c, a) => `<defs>${vg(u + 'x', lt(c, 0.25), dk(c, 0.18))}</defs>${sh(46, 96)}
    <ellipse cx="58" cy="74" rx="46" ry="21" fill="${dk(c, 0.15)}"/>
    <ellipse cx="58" cy="66" rx="46" ry="21" fill="url(#${u}x)"/>
    <ellipse cx="58" cy="68" rx="30" ry="11" fill="${dk(a, 0.12)}"/><ellipse cx="58" cy="70" rx="27" ry="8.5" fill="${a}"/>
    ${Array.from({ length: 14 }, (_, i) => { const t = i / 14 * Math.PI * 2; return `<path d="M${f1(58 + Math.cos(t) * 32)} ${f1(66 + Math.sin(t) * 13)} L${f1(58 + Math.cos(t) * 44)} ${f1(66 + Math.sin(t) * 19)}" stroke="${lt(c, 0.4)}" stroke-width="1.2" opacity=".6"/>`; }).join('')}
    ${hi('M24 58 q14 -12 40 -12 q-26 4 -36 16z', 0.4)}
    <circle cx="100" cy="86" r="9" fill="#ff8a3d"/><path d="M92 84 q8 6 16 0 M94 90 q6 -10 12 -10" stroke="#fff" stroke-width="1.2" fill="none" opacity=".8"/>
    ${paw(58, 70, 0.7, lt(a, 0.6))}`,

  // 寵物碗
  g2_petbowl: (u, c, a) => `<defs>${vg(u + 'x', lt(c, 0.2), dk(c, 0.2))}</defs>${sh(44)}
    <path d="M18 60 h84 l-8 30 q-34 8 -68 0 z" fill="url(#${u}x)"/>
    <ellipse cx="60" cy="60" rx="42" ry="10" fill="${lt(c, 0.3)}"/><ellipse cx="60" cy="60" rx="35" ry="7" fill="${dk(c, 0.3)}"/>
    ${Array.from({ length: 16 }, (_, i) => `<circle cx="${30 + (i * 13) % 60}" cy="${56 + (i * 7) % 6}" r="3" fill="${i % 2 ? '#a8693a' : '#c4874f'}"/>`).join('')}
    ${paw(60, 78, 1, a)}
    ${hi('M24 64 h5 l5 22 h-4z', 0.3)}`,

  // 鋼筆
  g2_pen: (u, c, a) => `<defs>${vg(u + 'x', lt(c, 0.3), dk(c, 0.25))}${vg(u + 'z', lt(a, 0.3), dk(a, 0.25))}${vg(u + 'g', '#f4e7c2', '#a8862e')}</defs>${sh(38)}
    <path d="M24 94 q10 -8 20 0 t20 0 t18 -2" stroke="${c}" stroke-width="1.8" fill="none" opacity=".55"/>
    <g transform="rotate(-38 60 58)">
      <rect x="16" y="52" width="38" height="13" rx="6" fill="url(#${u}z)"/>
      <rect x="22" y="48" width="26" height="3.4" rx="1.7" fill="url(#${u}g)"/><circle cx="47" cy="50" r="2.4" fill="url(#${u}g)"/>
      <rect x="50" y="52" width="4" height="13" fill="url(#${u}g)"/>
      <path d="M54 52.5 h34 l4 2 v8 l-4 2 h-34z" fill="url(#${u}x)"/>
      <path d="M92 54 h6 v9 h-6z" fill="#2a2a2e"/>
      <path d="M98 54 q10 1 16 4.5 q-6 3.5 -16 4.5z" fill="url(#${u}g)"/><path d="M100 58.5 h12" stroke="#7a5f1f" stroke-width=".8"/><circle cx="102" cy="58.5" r="1" fill="#7a5f1f"/>
      ${hi('M18 54 h34 v2.4 h-34z', 0.35)}${hi('M56 54 h32 v2 h-32z', 0.3)}
    </g>
    <path d="M100 20 q-4 6 0 9 q4 -3 0 -9z" fill="${c}"/>`,

  // 筆記本／手帳
  g2_notebook: (u, c, a) => `<defs>${vg(u + 'x', lt(c, 0.12), dk(c, 0.18))}</defs>${sh(36)}
    <rect x="34" y="20" width="56" height="76" rx="4" fill="#f5efe3"/>${[0, 1, 2, 3, 4, 5, 6].map(i => `<path d="M88 ${26 + i * 10} h3" stroke="#d6ccb8" stroke-width=".8"/>`).join('')}
    <rect x="28" y="16" width="58" height="78" rx="4" fill="url(#${u}x)"/>
    <rect x="28" y="16" width="9" height="78" rx="3" fill="${dk(c, 0.2)}"/>
    <rect x="44" y="30" width="32" height="26" rx="2" fill="#fbfaf4"/>
    <g stroke="#c9d6ea" stroke-width=".7">${[0, 1, 2, 3, 4, 5, 6].map(i => `<path d="M${46 + i * 4.6} 32 v22"/>`).join('')}${[0, 1, 2, 3, 4].map(i => `<path d="M46 ${34 + i * 4.6} h28"/>`).join('')}</g>
    <rect x="49" y="40" width="22" height="3" rx="1.5" fill="${a}"/>
    <rect x="76" y="16" width="5" height="78" fill="${a}"/>
    <path d="M58 94 v10 l3 -3 l3 3 v-10z" fill="${a}"/>
    ${hi('M39 18 h4 v74 h-4z', 0.22)}`,

  // 紙膠帶
  g2_tape: (u, c, a) => { const roll = (x, y, R, col, pat, id) => `<circle cx="${x}" cy="${y}" r="${R}" fill="${col}"/><circle cx="${x}" cy="${y}" r="${R}" fill="url(#${id})"/>${pat}<circle cx="${x}" cy="${y}" r="${R * 0.58}" fill="#d8c7a6"/><circle cx="${x}" cy="${y}" r="${R * 0.5}" fill="#f6f1e6"/><circle cx="${x}" cy="${y}" r="${R}" fill="none" stroke="${dk(col, 0.15)}" stroke-width="1"/>`;
    const dots = (x, y, R, col) => Array.from({ length: 10 }, (_, i) => { const t = i / 10 * Math.PI * 2; return `<circle cx="${f1(x + Math.cos(t) * R * 0.8)}" cy="${f1(y + Math.sin(t) * R * 0.8)}" r="${f1(R * 0.08)}" fill="${col}"/>`; }).join('');
    const rays = (x, y, R, col) => Array.from({ length: 12 }, (_, i) => { const t = i / 12 * Math.PI * 2; return `<path d="M${f1(x + Math.cos(t) * R * 0.6)} ${f1(y + Math.sin(t) * R * 0.6)} L${f1(x + Math.cos(t) * R)} ${f1(y + Math.sin(t) * R)}" stroke="${col}" stroke-width="${f1(R * 0.12)}"/>`; }).join('');
    return `<defs>${rg(u + 'x', 'rgba(255,255,255,.35)', 'rgba(0,0,0,.08)', 0.35, 0.3)}</defs>${sh(44)}
    <path d="M30 84 l52 10 l-1 3 l3 3 l-2 3 l-52 -10 l2 -3 l-3 -3z" fill="${c}" opacity=".85"/>${[0, 1, 2, 3, 4].map(i => `<circle cx="${38 + i * 10}" cy="${88 + i * 2}" r="1.6" fill="${lt(c, 0.6)}"/>`).join('')}
    ${roll(80, 44, 19, a, rays(80, 44, 19, lt(a, 0.5)), u + 'x')}
    ${roll(44, 58, 22, c, dots(44, 58, 22, lt(c, 0.6)), u + 'x')}
    ${roll(86, 78, 14, lt(c, 0.45), dots(86, 78, 14, a), u + 'x')}`; },

  // 鉛筆組（筆筒）
  g2_pencils: (u, c, a) => { const pencil = (r, col, len) => `<g transform="translate(60 74) rotate(${r})"><rect x="-4.5" y="${-len}" width="9" height="${len}" fill="${col}"/><rect x="-1.5" y="${-len}" width="3" height="${len}" fill="${lt(col, 0.25)}"/><path d="M-4.5 ${-len} L0 ${-len - 12} L4.5 ${-len}z" fill="#f0d2a4"/><path d="M-1.6 ${-len - 7.6} L0 ${-len - 12} L1.6 ${-len - 7.6}z" fill="#3a3a3a"/></g>`; return `<defs>${vg(u + 'x', lt(a, 0.2), dk(a, 0.2))}</defs>${sh(30)}
    ${pencil(-26, c, 44)}${pencil(-8, '#f3c623', 50)}${pencil(10, lt(c, 0.3), 46)}${pencil(26, dk(c, 0.15), 40)}
    <path d="M36 62 h48 l-4 34 h-40z" fill="url(#${u}x)"/><ellipse cx="60" cy="62" rx="24" ry="4" fill="${dk(a, 0.25)}"/>
    <rect x="38" y="74" width="44" height="8" fill="${lt(a, 0.4)}" opacity=".6"/>
    ${hi('M40 66 h4 l1 26 h-4z', 0.3)}`; },

  // 手機（背面＋保護殼）
  g2_phone: (u, c, a) => `<defs>${vg(u + 'x', lt(c, 0.2), dk(c, 0.2))}</defs>${sh(30)}
    <g transform="rotate(-8 60 58)">
      <rect x="34" y="12" width="52" height="88" rx="12" fill="${dk(c, 0.3)}"/>
      <rect x="36" y="14" width="48" height="84" rx="10" fill="url(#${u}x)"/>
      ${[[34, 12], [86, 12], [34, 100], [86, 100]].map(([x, y]) => `<circle cx="${x + (x < 60 ? 3 : -3)}" cy="${y + (y < 50 ? 3 : -3)}" r="4" fill="${a}" opacity=".85"/>`).join('')}
      <rect x="42" y="20" width="22" height="22" rx="6" fill="${dk(c, 0.35)}"/>
      ${[[48, 26], [58, 26], [48, 36]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#111"/><circle cx="${x}" cy="${y}" r="2.6" fill="#22303f"/><circle cx="${x - 1}" cy="${y - 1}" r=".9" fill="#7fd6ff"/>`).join('')}
      <circle cx="58" cy="36" r="1.6" fill="#fff6d0"/>
      <circle cx="60" cy="68" r="10" fill="none" stroke="${a}" stroke-width="3"/><circle cx="60" cy="68" r="4" fill="${a}" opacity=".5"/>
      <rect x="86" y="34" width="2.4" height="12" rx="1.2" fill="${dk(c, 0.4)}"/>
      ${hi('M40 18 h4 v76 h-4z', 0.22)}
    </g>`,

  // 無線耳機
  g2_earbuds: (u, c, a) => { const bud = (x, flip) => `<g transform="translate(${x} 52) scale(${flip} 1) rotate(-16)"><rect x="-3.2" y="0" width="6.4" height="22" rx="3.2" fill="${lt(c, 0.4)}" stroke="${dk(c, 0.12)}" stroke-width=".8"/><ellipse cx="0" cy="-2" rx="8" ry="7" fill="${lt(c, 0.5)}" stroke="${dk(c, 0.15)}" stroke-width=".8"/><ellipse cx="-4.5" cy="-3" rx="3.4" ry="3.6" fill="${dk(c, 0.18)}"/><circle cx="-4.5" cy="-3" r="1.4" fill="${a}" opacity=".8"/><path d="M2 -6 q3 2 3 6" stroke="#fff" stroke-width="1.4" fill="none" opacity=".8" stroke-linecap="round"/></g>`; return `<defs>${vg(u + 'x', lt(c, 0.4), dk(c, 0.1))}</defs>${sh(36)}
    <path d="M28 64 q0 -32 32 -32 q32 0 32 32z" fill="${dk(c, 0.12)}"/><path d="M34 64 q0 -26 26 -26 q26 0 26 26z" fill="${dk(c, 0.3)}"/>
    ${bud(47, 1)}${bud(73, -1)}
    <path d="M26 64 h68 v8 q0 22 -22 22 h-24 q-22 0 -22 -22z" fill="url(#${u}x)"/>
    <path d="M26 64 h68" stroke="${dk(c, 0.2)}" stroke-width="1.4"/>
    <rect x="44" y="64" width="32" height="7" rx="2" fill="${dk(c, 0.25)}"/>
    <circle cx="60" cy="82" r="2.2" fill="${a}"/><circle cx="60" cy="82" r="5" fill="${a}" opacity=".25"/>
    ${hi('M30 70 h4 v12 q0 4 2 8 h-3 q-3 -4 -3 -8z', 0.4)}`; },

  // 快充頭＋線
  g2_charger: (u, c, a) => `<defs>${vg(u + 'x', lt(c, 0.1), dk(c, 0.15))}</defs>${sh(40)}
    <path d="M58 76 q6 20 24 16 q16 -4 14 -18" fill="none" stroke="${a}" stroke-width="5" stroke-linecap="round"/>
    <rect x="90" y="56" width="12" height="18" rx="3" fill="${dk(a, 0.15)}"/><rect x="93" y="50" width="6" height="7" rx="1.5" fill="#b9bfc7"/>
    <rect x="44" y="20" width="4" height="12" rx="1.5" fill="#b9bfc7"/><rect x="58" y="20" width="4" height="12" rx="1.5" fill="#b9bfc7"/>
    ${box3(28, 38, 40, 40, 10, c, `url(#${u}x)`)}
    <path d="M50 46 l-8 13 h6 l-3 11 l9 -14 h-6 l3 -10z" fill="${a}"/>
    ${[0, 1, 2].map(i => `<rect x="${34 + i * 11}" y="72" width="8" height="3" rx="1.5" fill="${dk(c, 0.45)}"/>`).join('')}
    ${hi('M30 40 h4 v36 h-4z', 0.35)}`,

  // 編織快充線（捲好的線＋魔鬼氈）
  g2_cable: (u, c, a) => `<defs>${vg(u + 'x', '#eef1f4', '#9aa0a8')}</defs>${sh(40)}
    <path d="M86 62 q14 -6 16 -26" fill="none" stroke="${dk(c, 0.25)}" stroke-width="6" stroke-linecap="round"/><path d="M86 62 q14 -6 16 -26" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round"/>
    <path d="M34 66 q-14 10 -12 26" fill="none" stroke="${dk(c, 0.25)}" stroke-width="6" stroke-linecap="round"/><path d="M34 66 q-14 10 -12 26" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round"/>
    ${[0, 1, 2, 3, 4, 5].map(i => `<ellipse cx="${56 + i * 1.6}" cy="${52 + i * 1.4}" rx="30" ry="24" fill="none" stroke="${dk(c, 0.25)}" stroke-width="5.6"/><ellipse cx="${56 + i * 1.6}" cy="${52 + i * 1.4}" rx="30" ry="24" fill="none" stroke="${c}" stroke-width="3.6"/><ellipse cx="${56 + i * 1.6}" cy="${52 + i * 1.4}" rx="30" ry="24" fill="none" stroke="${lt(c, 0.45)}" stroke-width="3.6" stroke-dasharray="1.2 2.6"/>`).join('')}
    <rect x="22" y="42" width="16" height="26" rx="4" fill="${a}" transform="rotate(-12 30 55)"/><rect x="25" y="46" width="10" height="18" rx="2" fill="${lt(a, 0.15)}" transform="rotate(-12 30 55)"/>
    <g transform="translate(102 30) rotate(-80)"><rect x="-8" y="-5" width="16" height="10" rx="3" fill="${a}"/><rect x="7" y="-3" width="9" height="6" rx="3" fill="url(#${u}x)"/></g>
    <g transform="translate(22 94) rotate(95)"><rect x="-8" y="-5" width="16" height="10" rx="3" fill="${a}"/><rect x="7" y="-3" width="9" height="6" rx="3" fill="url(#${u}x)"/></g>`,

  // 行動電源
  g2_powerbank: (u, c, a) => `<defs>${vg(u + 'x', lt(c, 0.2), dk(c, 0.25))}</defs>${sh(42)}
    <g transform="rotate(-10 60 60)">
      <rect x="26" y="34" width="68" height="50" rx="12" fill="${dk(c, 0.3)}" transform="translate(0 4)"/>
      <rect x="26" y="34" width="68" height="50" rx="12" fill="url(#${u}x)"/>
      <circle cx="52" cy="59" r="16" fill="none" stroke="${lt(c, 0.3)}" stroke-width="1.6" stroke-dasharray="3 2.4"/>
      <path d="M54 48 l-8 13 h6 l-3 10 l9 -14 h-6 l3 -9z" fill="${a}"/>
      ${[0, 1, 2, 3].map(i => `<circle cx="${78 + 0}" cy="${46 + i * 7}" r="2" fill="${i ? a : lt(c, 0.3)}"/>`).join('')}
      <rect x="40" y="82" width="12" height="3" rx="1.5" fill="${dk(c, 0.5)}"/>
      ${hi('M30 38 q20 -2 60 0 v3 q-30 -2 -60 0z', 0.3)}
    </g>`,
};

// ---- 名稱五語 ----
const N = (zh, en, ja, vi, ms) => ({ zh, en, ja, vi, ms });
const P = (id, name, en, unit, price, cost, stock, desc, descEn, kind, color, accent) => ({ id, name, en, unit, price, cost, stock, desc, descEn, art: { kind, color, accent } });

export const BIZ = [
  // ─────────────────────────── 1. 麵包店 ───────────────────────────
  {
    merchant: {
      id: 'bakery', name: '小麥日常麵包坊', en: 'Little Wheat Daily Bakery', type: 'bakery', cat: 'dessert',
      typeName: '天然酵母麵包', owner: '阿麥', theme: 'bakery', brand: '#B8741A', tagline: '清晨六點，第一爐出爐',
      products: [
        P('bk-boule', '天然酵母鄉村麵包', 'Country Sourdough Boule', '1 個', 260, 88, 14, '自養魯邦種，低溫發酵 18 小時。', 'House levain, 18-hour cold ferment.', 'g2_boule', '#C98A3E', '#F3E1BE'),
        P('bk-toast', '鮮奶生吐司', 'Fresh Milk Shokupan', '1 條', 140, 48, 22, '以鮮奶取代水，柔軟可撕成絲。', 'Made with milk instead of water, pillowy soft.', 'g2_toast', '#D99A4A', '#FFF1D2'),
        P('bk-croissant', '發酵奶油可頌', 'Cultured Butter Croissant', '1 個', 68, 26, 36, '27 層手工摺疊，外酥內軟。', '27 hand-folded layers, crisp and tender.', 'g2_croissant', '#D88A2E', '#8A4E14'),
        P('bk-cinnamon', '肉桂捲', 'Cinnamon Roll', '1 個', 75, 24, 28, '錫蘭肉桂與黑糖，淋奶油乳酪霜。', 'Ceylon cinnamon, brown sugar, cream cheese glaze.', 'g2_cinnamon', '#C98247', '#FFF8EC'),
        P('bk-pound', '檸檬磅蛋糕', 'Lemon Pound Cake', '1 條', 320, 110, 10, '整顆檸檬皮入麵糊，糖霜微酸。', 'Whole lemon zest with a tangy glaze.', 'g2_toast', '#E8B84A', '#FFF6C8'),
        P('bk-sub', '週末麵包訂閱 4 週', 'Weekend Bread Subscription ×4', '4 週', 1000, 420, 15, '每週六取一籃當季麵包。', 'A basket of seasonal bread every Saturday.', 'voucher', '#2F5F8F', '#E3A63B'),
      ],
    },
    theme: {
      id: 'bakery', kind: 'base', name: N('麥香晨光', 'Wheat Morning', '麦の朝', 'Bình minh lúa mì', 'Pagi Gandum'), deco: 'steam', dark: false,
      vars: { cream: '#fcf5e6', cream2: '#f5e6c6', ink: '#2f2410', ink2: '#5f4e30', ink3: '#93815f', rose: '#2f5f8f', g: '#a8641a', gl: '#e0a33b', card: '#fffbf2', deep: '#22344d', deep2: '#7a4a14', heroA: '#f8dca0', heroB: '#fbeccd', heroC: '#d9e4f0', btn: '#22344d', btnInk: '#ffffff' },
      hero: { pal: ['#e0a33b', '#c98a3e', '#f3e1be', '#2f5f8f', '#f8dca0', '#8a4e14'], dots: ['#e0a33b', '#f3e1be', '#2f5f8f', '#ffffff', '#c98a3e'], sky: '#fff6e0', ground: '#e8c48a', point: '#ffc870' },
      style: { font: 'serif', radius: 'soft', hero: 'split', grid: 'cards', button: 'solid', texture: 'grain' },
    },
    profile: {
      avatar: '麥', volume: 34, aiName: '小麥', region: '新竹市東區',
      staff: [
        { name: '阿麥', title: '負責人・麵包師（董事酬勞）', kind: 'owner', pay: 52000 },
        { name: '小瑜', title: '烘焙助理・全職', kind: 'full', pay: 32000, level: 33300 },
        { name: '阿青', title: '門市結帳・兼職', kind: 'part', pay: 16000, level: 16500, hours: 80, hourly: 200 },
      ],
      suppliers: [
        { item: '石磨麵粉、裸麥粉', vendor: '金穗麵粉行（虛構）', base: 18000 },
        { item: '發酵奶油、鮮奶', vendor: '晨光乳品批發（虛構）', base: 14000 },
        { item: '牛皮紙袋、麵包盒', vendor: '好包裝材料行（虛構）', base: 3800 },
      ],
      fixed: { rent: 32000, utility: 12500, ads: 4000, depreciation: 7500, equip: '石板層爐與攪拌機' },
      rd: [['新品試作', '秋季南瓜酸種麵包試作', '自家採購', 2600, '電子發票', 11]],
      channels: { web: 0.14, line: 0.22, pos: 0.52, phone: 0.06, whatsapp: 0.01, zalo: 0.01, messenger: 0.04 },
      langs: { zh: 0.9, en: 0.06, ja: 0.04 },
    },
  },

  // ─────────────────────────── 2. 義式冰淇淋 ───────────────────────────
  {
    merchant: {
      id: 'gelato', name: '雪朵義式冰淇淋', en: 'Snowpuff Gelato', type: 'gelato', cat: 'dessert',
      typeName: '義式冰淇淋', owner: '朵朵', theme: 'gelato', brand: '#F2788F', tagline: '每天少量現打，當日售完',
      products: [
        P('ge-pistachio', '開心果雙球杯', 'Pistachio Double Cup', '1 杯', 130, 48, 30, '整顆開心果研磨，濃郁不甜膩。', 'Stone-ground pistachios, rich not sweet.', 'g2_scoopcup', '#A7C47A', '#F2788F'),
        P('ge-strawberry', '草莓牛奶甜筒', 'Strawberry Milk Cone', '1 支', 110, 36, 40, '在地草莓與鮮乳，現烤脆筒。', 'Local strawberries and milk in a fresh cone.', 'g2_cone', '#F4A3B5', '#FFF3E0'),
        P('ge-lemon', '檸檬羅勒雪酪', 'Lemon Basil Sorbet', '1 杯', 120, 38, 26, '無乳製品，清爽解膩。', 'Dairy-free, bright and refreshing.', 'g2_scoopcup', '#F5E27A', '#7FBF8E'),
        P('ge-choc', '70% 黑巧克力甜筒', '70% Dark Chocolate Cone', '1 支', 120, 42, 34, '可可香濃，尾韻微苦。', 'Deep cocoa with a gentle bitter finish.', 'g2_cone', '#6B3E2A', '#F7E3C3'),
        P('ge-pint', '外帶盒 500ml', 'Gelato Pint 500ml', '500ml', 420, 150, 18, '任選兩種口味，附保冷袋。', 'Pick two flavours, insulated bag included.', 'g2_pint', '#7FC8B0', '#F2788F'),
        P('ge-mango', '芒果冰棒', 'Mango Fruit Bar', '1 支', 75, 22, 45, '芒果果肉含量六成。', 'Made with 60% real mango pulp.', 'g2_popsicle', '#F5B041', '#FF8C69'),
      ],
    },
    theme: {
      id: 'gelato', kind: 'base', name: N('冰淇淋粉彩', 'Gelato Pastel', 'ジェラートパステル', 'Kem pastel', 'Pastel Gelato'), deco: 'snow', dark: false,
      vars: { cream: '#f3fbf6', cream2: '#dcf3e6', ink: '#173a32', ink2: '#406a5f', ink3: '#7d9e94', rose: '#f2788f', g: '#2a8a63', gl: '#8fd3b0', card: '#ffffff', deep: '#1c4c43', deep2: '#a33a55', heroA: '#ffd6df', heroB: '#d2f2e1', heroC: '#fff1b3', btn: '#c73d62', btnInk: '#ffffff' },
      hero: { pal: ['#f4a3b5', '#a7c47a', '#f5e27a', '#8fd3b0', '#fff3e0', '#f5b041'], dots: ['#f2788f', '#8fd3b0', '#f5e27a', '#ffffff', '#ffd6df'], sky: '#f6fff9', ground: '#ffd6df', point: '#ffb3c6' },
      style: { font: 'round', radius: 'pill', hero: 'center', grid: 'tiles', button: 'pill', texture: 'dots' },
    },
    profile: {
      avatar: '朵', volume: 42, aiName: '小朵', region: '台南市安平區',
      staff: [
        { name: '朵朵', title: '負責人・冰淇淋師（董事酬勞）', kind: 'owner', pay: 48000 },
        { name: '小凡', title: '門市・兼職', kind: 'part', pay: 19200, level: 19200, hours: 96, hourly: 200 },
      ],
      suppliers: [
        { item: '鮮乳、鮮奶油', vendor: '南方牧場乳品（虛構）', base: 16000 },
        { item: '當季水果、開心果', vendor: '安平蔬果行（虛構）', base: 12000 },
        { item: '紙杯、甜筒、保冷袋', vendor: '好包裝材料行（虛構）', base: 5200 },
      ],
      fixed: { rent: 26000, utility: 14000, ads: 6000, depreciation: 6500, equip: '義式冰淇淋機與展示冰櫃' },
      rd: [['新品試作', '在地鳳梨與芒果雪酪配方', '自家採購', 2200, '電子發票', 14]],
      channels: { web: 0.12, line: 0.20, pos: 0.50, phone: 0.04, whatsapp: 0.04, zalo: 0.02, messenger: 0.08 },
      langs: { zh: 0.78, en: 0.12, ja: 0.1 },
    },
  },

  // ─────────────────────────── 3. 傳統漢餅 ───────────────────────────
  {
    merchant: {
      id: 'mooncake', name: '福月傳統漢餅', en: 'Fuyue Traditional Pastry', type: 'mooncake', cat: 'dessert',
      typeName: '傳統漢餅糕餅', owner: '阿福', theme: 'mooncake', brand: '#9E2A22', tagline: '三代手藝，古早味不變',
      products: [
        P('mc-lvdou', '綠豆椪', 'Mung Bean Flaky Cake', '1 個', 65, 22, 60, '酥皮層層分明，綠豆沙綿密。', 'Flaky layers, smooth mung bean filling.', 'g2_flaky', '#F4EBD6', '#B5C98A'),
        P('mc-yolk', '蛋黃酥', 'Salted Egg Yolk Pastry', '1 個', 55, 20, 80, '紅豆沙包整顆鹹蛋黃。', 'Red bean paste around a whole salted yolk.', 'g2_flaky', '#E3A64B', '#6B2E22'),
        P('mc-pine', '土鳳梨酥 10 入', 'Pineapple Cakes ×10', '10 入', 420, 150, 30, '土鳳梨果肉微酸，奶油酥皮。', 'Tangy native pineapple in butter crust.', 'g2_pineapple', '#E2B261', '#C98A1E'),
        P('mc-moon', '棗泥核桃月餅', 'Jujube Walnut Mooncake', '1 個', 90, 32, 40, '木模壓花，棗泥核桃不死甜。', 'Hand-pressed, jujube and walnut, lightly sweet.', 'g2_mooncake', '#C78A3E', '#6B2E22'),
        P('mc-big', '漢式大餅', 'Traditional Wedding Cake', '1 個', 480, 170, 12, '豬油酥皮包滷肉、冬瓜餡。', 'Lard pastry with braised pork and winter melon.', 'g2_mooncake', '#D9A85A', '#8A3A22'),
        P('mc-gift', '中秋六入禮盒', 'Mid-Autumn Gift Box ×6', '1 盒', 680, 260, 25, '綠豆椪、蛋黃酥、月餅各兩入。', 'Two each of our three classics.', 'g2_giftbox', '#B8262B', '#D4A84A'),
      ],
    },
    theme: {
      id: 'mooncake', kind: 'base', name: N('朱印餅舖', 'Vermilion Seal', '朱印の菓子舗', 'Ấn son', 'Cop Merah'), deco: 'lantern', dark: false,
      vars: { cream: '#f6efdf', cream2: '#ebdcbd', ink: '#1f1612', ink2: '#5a4636', ink3: '#8e7a66', rose: '#b8262b', g: '#9e2a22', gl: '#c8a04a', card: '#fffaf0', deep: '#2a1a14', deep2: '#7c1d1d', heroA: '#f1d6a8', heroB: '#f3e4c4', heroC: '#e9c0a4', btn: '#9e2a22', btnInk: '#ffffff' },
      hero: { pal: ['#b8262b', '#d4a84a', '#e3a64b', '#f4ebd6', '#6b2e22', '#c78a3e'], dots: ['#d4a84a', '#b8262b', '#f4ebd6', '#ffffff'], sky: '#fff3dc', ground: '#d9b07a', point: '#ffb060' },
      style: { font: 'serif', radius: 'sharp', hero: 'poster', grid: 'list', button: 'block', texture: 'paper' },
    },
    profile: {
      avatar: '福', volume: 24, aiName: '小福', region: '彰化縣鹿港鎮',
      staff: [
        { name: '阿福', title: '負責人・糕餅師傅（董事酬勞）', kind: 'owner', pay: 50000 },
        { name: '阿珠', title: '包餡製作・全職', kind: 'full', pay: 31000, level: 31800 },
        { name: '小蓉', title: '包裝出貨・兼職', kind: 'part', pay: 14400, level: 15840, hours: 72, hourly: 200 },
      ],
      suppliers: [
        { item: '綠豆、紅豆、棗泥、核桃', vendor: '鹿港南北貨行（虛構）', base: 15000 },
        { item: '鹹蛋黃、豬油、麵粉', vendor: '中部食材批發（虛構）', base: 11000 },
        { item: '禮盒、提袋、內襯', vendor: '紅喜印刷包裝（虛構）', base: 8600 },
        { item: '常溫宅配運費', vendor: '綠野物流（虛構）', base: 5400 },
      ],
      fixed: { rent: 18000, utility: 9000, ads: 5000, depreciation: 4000, equip: '烤爐與木製餅模' },
      rd: [['新品試作', '低糖烏龍茶月餅餡試作', '自家採購', 1800, '電子發票', 6], ['設計開發', '中秋禮盒新包裝打樣', '紅喜印刷包裝（虛構）', 4200, '電子發票', 20]],
      channels: { web: 0.20, line: 0.30, pos: 0.30, phone: 0.16, whatsapp: 0.01, zalo: 0.01, messenger: 0.02 },
      langs: { zh: 0.92, en: 0.03, ja: 0.05 },
    },
  },

  // ─────────────────────────── 4. 手工巧克力 ───────────────────────────
  {
    merchant: {
      id: 'chocolate', name: '暗可可手工巧克力', en: 'Dark Cacao Chocolatier', type: 'chocolate', cat: 'dessert',
      typeName: '手工巧克力', owner: '小卡', theme: 'chocolate', brand: '#4A2A1E', tagline: '從可可豆到巧克力一手包辦',
      products: [
        P('ch-dark', '70% 屏東黑巧克力', 'Pingtung 70% Dark Bar', '50g', 220, 75, 30, '台灣可可豆，帶紅果與蜂蜜香。', 'Taiwan cacao with red fruit and honey notes.', 'g2_chocbar', '#4A2A1E', '#C9A96E'),
        P('ch-milk', '海鹽牛奶巧克力', 'Sea Salt Milk Bar', '50g', 200, 68, 34, '50% 牛奶巧克力撒手工海鹽。', '50% milk chocolate with hand-harvested salt.', 'g2_chocbar', '#8A5A3C', '#7FB3C8'),
        P('ch-bonbon', '夾心巧克力 6 入', 'Bonbon Box ×6', '6 入', 560, 200, 14, '百香果、烏龍茶、焦糖等六種。', 'Six flavours incl. passion fruit and oolong.', 'g2_bonbon', '#6B3A26', '#2B1A14'),
        P('ch-nama', '生巧克力 16 入', 'Nama Chocolate ×16', '16 入', 450, 160, 16, '入口即化，需冷藏保存。', 'Melts on the tongue, keep refrigerated.', 'g2_truffle', '#5A3424', '#C9A96E'),
        P('ch-cocoa', '熱可可粉', 'Hot Cocoa Mix', '200g', 380, 120, 22, '加熱牛奶即沖，冬天必備。', 'Just add hot milk.', 'g2_mug', '#8A4B32', '#E8D3B8'),
        P('ch-gift', '綜合禮盒', 'Assorted Gift Box', '1 盒', 980, 360, 10, '片狀、夾心與生巧克力綜合。', 'Bars, bonbons and nama assorted.', 'g2_giftbox', '#3A2018', '#D98A8A'),
      ],
    },
    theme: {
      id: 'chocolate', kind: 'base', dark: true, name: N('可可暗夜', 'Cacao Noir', 'カカオノワール', 'Ca cao đêm', 'Koko Gelap'), deco: 'sparkle',
      vars: { cream: '#1c1310', cream2: '#2a1c17', ink: '#f4e8dc', ink2: '#cdb6a4', ink3: '#97816f', rose: '#e0828c', g: '#c9a26e', gl: '#ddb682', card: '#2a1d18', deep: '#0d0807', deep2: '#3d2419', heroA: '#4a2c20', heroB: '#2e1c16', heroC: '#5b3328', btn: '#ddb682', btnInk: '#1c1310' },
      hero: { pal: ['#4a2a1e', '#8a5a3c', '#c9a96e', '#d98a8a', '#f3e6d4', '#6b3a26'], dots: ['#ddb682', '#e0828c', '#ffffff', '#f3e6d4'], sky: '#f2d2b0', ground: '#3d2419', point: '#ffb38a', dim: true },
      style: { font: 'sans', radius: 'sharp', hero: 'minimal', grid: 'magazine', button: 'outline', texture: 'none' },
    },
    profile: {
      avatar: '卡', volume: 8, aiName: '小可', region: '屏東縣內埔鄉',
      staff: [
        { name: '小卡', title: '負責人・巧克力師（董事酬勞）', kind: 'owner', pay: 50000 },
        { name: '阿蔓', title: '調溫包裝・兼職', kind: 'part', pay: 12800, level: 13500, hours: 64, hourly: 200 },
      ],
      suppliers: [
        { item: '在地可可豆', vendor: '南國可可農場（虛構）', base: 16000 },
        { item: '可可脂、鮮奶油、海鹽', vendor: '烘焙原料行（虛構）', base: 7200 },
        { item: '鋁箔、紙盒、緞帶', vendor: '好包裝材料行（虛構）', base: 4800 },
        { item: '冷藏宅配運費', vendor: '綠野冷鏈物流（虛構）', base: 4200 },
      ],
      fixed: { rent: 14000, utility: 6800, ads: 7000, depreciation: 5200, equip: '可可研磨機與調溫機' },
      rd: [['新品試作', '台灣茶風味夾心試作', '自家採購', 3200, '電子發票', 9]],
      channels: { web: 0.42, line: 0.24, pos: 0.12, phone: 0.02, whatsapp: 0.06, zalo: 0.02, messenger: 0.12 },
      langs: { zh: 0.74, en: 0.14, ja: 0.12 },
    },
  },

  // ─────────────────────────── 5. 蜂蜜蜂產品 ───────────────────────────
  {
    merchant: {
      id: 'honey', name: '蜂谷蜜園', en: 'Bee Valley Apiary', type: 'honey', cat: 'farm',
      typeName: '蜂蜜蜂產品', owner: '阿谷', theme: 'honey', brand: '#E0A526', tagline: '跟著花期，一季一蜜',
      products: [
        P('hn-longan', '龍眼蜜', 'Longan Honey', '700g', 650, 260, 40, '龍眼花期採收，焦糖般香氣。', 'Harvested in longan bloom, caramel-like aroma.', 'g2_honeyjar', '#B8651B', '#E8D3A8'),
        P('hn-lychee', '荔枝蜜', 'Lychee Honey', '700g', 680, 270, 30, '花香明亮，適合調飲。', 'Bright floral notes, great in drinks.', 'g2_honeyjar', '#E3A52E', '#C94F4F'),
        P('hn-comb', '巢蜜', 'Raw Honeycomb', '400g', 880, 360, 12, '整片蜂巢切塊，原汁原味。', 'Cut from the whole comb, just as the bees made it.', 'g2_comb', '#F2B705', '#8A5A34'),
        P('hn-squeeze', '百花蜜擠壓瓶', 'Wildflower Honey Squeeze Bottle', '350g', 320, 120, 50, '倒立瓶不沾手，抹吐司方便。', 'Upside-down bottle, easy on toast.', 'bottle', '#E8A317', '#5A3A10'),
        P('hn-candle', '蜂蠟蠟燭', 'Beeswax Candle', '1 個', 380, 120, 24, '自家蜂蠟手工灌製。', 'Hand-poured from our own beeswax.', 'g2_candle', '#F2D16B', '#6B4A1A'),
        P('hn-gift', '雙蜜禮盒', 'Twin Honey Gift Box', '1 盒', 1280, 520, 15, '龍眼蜜與荔枝蜜各一，附蜜勺。', 'Longan and lychee honey with a dipper.', 'g2_giftbox', '#E0A526', '#3A2A05'),
      ],
    },
    theme: {
      id: 'honey', kind: 'base', name: N('蜂巢金', 'Honeycomb Gold', 'ハニカムゴールド', 'Tổ ong vàng', 'Sarang Emas'), deco: 'petal', dark: false,
      vars: { cream: '#fff8e2', cream2: '#fdebb4', ink: '#2c1f06', ink2: '#644e1c', ink3: '#9a8450', rose: '#d9692b', g: '#9a6a00', gl: '#f2b705', card: '#fffdf4', deep: '#3a2a05', deep2: '#5c4209', heroA: '#ffe08a', heroB: '#fff3c4', heroC: '#f9d2a0', btn: '#2c1f06', btnInk: '#ffffff' },
      hero: { pal: ['#f2b705', '#e3a52e', '#b8651b', '#fff3c4', '#8a5a34', '#ffd86b'], dots: ['#f2b705', '#ffffff', '#d9692b', '#ffe08a'], sky: '#fffbe6', ground: '#f0c860', point: '#ffcf40' },
      style: { font: 'hand', radius: 'round', hero: 'banner', grid: 'cards', button: 'solid', texture: 'dots' },
    },
    profile: {
      avatar: '谷', volume: 9, aiName: '小蜂', region: '南投縣國姓鄉',
      staff: [
        { name: '阿谷', title: '負責人・養蜂人（董事酬勞）', kind: 'owner', pay: 46000 },
        { name: '阿土', title: '蜂場助手・全職', kind: 'full', pay: 30000, level: 30300 },
      ],
      suppliers: [
        { item: '玻璃罐、擠壓瓶、蜜勺', vendor: '晶亮玻璃（虛構）', base: 6800 },
        { item: '蜂箱、巢框與養蜂資材', vendor: '山城養蜂資材（虛構）', base: 5200 },
        { item: '禮盒與標籤', vendor: '好包裝材料行（虛構）', base: 3600 },
        { item: '常溫宅配運費', vendor: '綠野物流（虛構）', base: 5800 },
      ],
      fixed: { rent: 8000, utility: 3200, ads: 5000, depreciation: 4200, equip: '搖蜜機與蜂箱' },
      rd: [['檢驗費', '每批蜂蜜送驗成分與殘留', '食品檢驗所（虛構）', 4800, '收據', 16]],
      channels: { web: 0.38, line: 0.30, pos: 0.10, phone: 0.12, whatsapp: 0.02, zalo: 0.02, messenger: 0.06 },
      langs: { zh: 0.88, en: 0.06, ja: 0.06 },
    },
  },

  // ─────────────────────────── 6. 生活選物店 ───────────────────────────
  {
    merchant: {
      id: 'select', name: '日常感生活選物', en: 'Everyday Edit Lifestyle', type: 'select', cat: 'retail',
      typeName: '生活選物店', owner: '小晴', theme: 'select', brand: '#6D7A5E', tagline: '好用的東西，用很久',
      products: [
        P('se-candle', '大豆蠟香氛蠟燭', 'Soy Wax Candle', '200g', 680, 230, 18, '雪松與無花果，可燃約 40 小時。', 'Cedar and fig, about 40 hours of burn.', 'g2_candle', '#9AA68A', '#B86B4B'),
        P('se-mug', '手作粗陶杯', 'Stoneware Mug', '1 個', 720, 300, 12, '在地陶藝家小量燒製。', 'Small batches from a local potter.', 'g2_mug', '#D8CFC0', '#6D7A5E'),
        P('se-towel', '有機棉毛巾組', 'Organic Cotton Towel Set', '3 條', 880, 360, 15, '吸水快乾，越洗越柔。', 'Absorbent, quick-dry, softer every wash.', 'g2_towel', '#E6DCCB', '#B86B4B'),
        P('se-vase', '手吹玻璃花器', 'Hand-blown Bud Vase', '1 個', 980, 420, 8, '每只氣泡紋路都不同。', 'Every bubble pattern is one of a kind.', 'g2_vase', '#A9C2B8', '#E8A07A'),
        P('se-diffuser', '白茶擴香瓶', 'White Tea Reed Diffuser', '100ml', 760, 260, 16, '淡雅白茶香，約可放兩個月。', 'Soft white tea scent, lasts about two months.', 'g2_diffuser', '#C9B79A', '#2F322B'),
        P('se-tote', '帆布市場袋', 'Canvas Market Tote', '1 個', 590, 210, 20, '厚磅帆布，裝得下一週的菜。', 'Heavy canvas, fits a week of groceries.', 'tote', '#DCD3C0', '#6D7A5E'),
      ],
    },
    theme: {
      id: 'select', kind: 'base', name: N('日常留白', 'Everyday Edit', '日常の余白', 'Khoảng lặng', 'Ruang Harian'), deco: null, dark: false,
      vars: { cream: '#f4f2ee', cream2: '#e8e4dc', ink: '#22231f', ink2: '#5a5b54', ink3: '#8f8f86', rose: '#b86b4b', g: '#5f6c51', gl: '#9aa68a', card: '#ffffff', deep: '#2f322b', deep2: '#4b5243', heroA: '#e6e1d6', heroB: '#dfe4d6', heroC: '#efe0d2', btn: '#22231f', btnInk: '#ffffff' },
      hero: { pal: ['#d8cfc0', '#9aa68a', '#b86b4b', '#a9c2b8', '#e6dccb', '#6d7a5e'], dots: ['#9aa68a', '#d8cfc0', '#b86b4b', '#ffffff'], sky: '#faf8f4', ground: '#dcd6ca', point: '#f2d6c0' },
      style: { font: 'sans', radius: 'soft', hero: 'center', grid: 'magazine', button: 'outline', texture: 'paper' },
    },
    profile: {
      avatar: '晴', volume: 9, aiName: '小晴', region: '台北市松山區',
      staff: [
        { name: '小晴', title: '負責人・選品師（董事酬勞）', kind: 'owner', pay: 50000 },
        { name: '阿禾', title: '門市・兼職', kind: 'part', pay: 16000, level: 16500, hours: 80, hourly: 200 },
      ],
      suppliers: [
        { item: '陶器、玻璃器（寄賣與買斷）', vendor: '山窯工作室（虛構）', base: 18000 },
        { item: '香氛蠟燭、擴香', vendor: '靜香製作所（虛構）', base: 9000 },
        { item: '毛巾、帆布袋', vendor: '棉織小廠（虛構）', base: 7600 },
      ],
      fixed: { rent: 38000, utility: 4200, ads: 8000, depreciation: 2500, equip: '展示層架與燈具' },
      rd: [['設計開發', '聯名帆布袋圖樣打樣', '棉織小廠（虛構）', 3600, '電子發票', 18]],
      channels: { web: 0.36, line: 0.22, pos: 0.30, phone: 0.02, whatsapp: 0.02, zalo: 0.01, messenger: 0.07 },
      langs: { zh: 0.8, en: 0.08, ja: 0.12 },
    },
  },

  // ─────────────────────────── 7. 二手古著 ───────────────────────────
  {
    merchant: {
      id: 'vintage', name: '倒帶古著', en: 'Rewind Vintage', type: 'vintage', cat: 'retail',
      typeName: '二手古著', owner: '阿凱', theme: 'vintage', brand: '#C7502A', tagline: '每一件，都只有一件',
      products: [
        P('vt-denim', '80s 丹寧外套', '80s Denim Jacket', '1 件', 1880, 700, 3, '日本選回，石洗刷色自然。', 'Sourced in Japan, natural stone wash.', 'g2_jacket', '#4A6E94', '#D9822B'),
        P('vt-aloha', '70s 夏威夷衫', '70s Aloha Shirt', '1 件', 1280, 450, 5, '嫘縈材質，大花滿版。', 'Rayon with an all-over hibiscus print.', 'g2_aloha', '#C7502A', '#F0C46A'),
        P('vt-jeans', '直筒牛仔褲', 'Straight-leg Jeans', '1 件', 1580, 560, 6, '原色布邊，尺寸已量好。', 'Selvedge denim, measurements listed.', 'g2_jeans', '#2F4E73', '#E0A32E'),
        P('vt-flannel', '格紋法蘭絨襯衫', 'Plaid Flannel Shirt', '1 件', 980, 320, 7, '厚實保暖，秋冬好搭。', 'Thick and warm for autumn layering.', 'g2_shirt', '#9B3B2E', '#E8D4AD'),
        P('vt-tee', '單針復古印花 T', 'Single-stitch Print Tee', '1 件', 680, 200, 10, '單針車縫，薄軟好穿。', 'Single-stitch hem, thin and soft.', 'g2_tee', '#E8D4AD', '#2F5373'),
        P('vt-bag', '皮革郵差包', 'Leather Messenger Bag', '1 個', 2280, 900, 2, '老皮革使用痕跡，已清潔保養。', 'Worn-in leather, cleaned and conditioned.', 'pouch', '#8A5A34', '#2A1D14'),
      ],
    },
    theme: {
      id: 'vintage', kind: 'base', name: N('復古唱片行', 'Retro Rewind', 'レトロリワインド', 'Hoài cổ', 'Retro Ulang'), deco: 'star', dark: false,
      vars: { cream: '#f3e6cc', cream2: '#e7d0a6', ink: '#24180f', ink2: '#57412d', ink3: '#86705a', rose: '#c7502a', g: '#2f5373', gl: '#e0a32e', card: '#fbf3e2', deep: '#1f3550', deep2: '#7a3418', heroA: '#f0c46a', heroB: '#eba57e', heroC: '#a9c0d4', btn: '#b0441f', btnInk: '#ffffff' },
      hero: { pal: ['#c7502a', '#e0a32e', '#2f5373', '#4a6e94', '#e8d4ad', '#7a3418'], dots: ['#e0a32e', '#c7502a', '#2f5373', '#fbf3e2'], sky: '#fff0d0', ground: '#d9a066', point: '#ff9a50' },
      style: { font: 'condensed', radius: 'sharp', hero: 'poster', grid: 'tiles', button: 'block', texture: 'grain' },
    },
    profile: {
      avatar: '凱', volume: 7, aiName: '小凱', region: '台中市西區',
      staff: [{ name: '阿凱', title: '負責人・選貨買手（董事酬勞）', kind: 'owner', pay: 46000 }],
      suppliers: [
        { item: '日本、美國古著批貨', vendor: '海外古著批發（虛構）', base: 28000 },
        { item: '清洗整燙、修補', vendor: '老街洗衣坊（虛構）', base: 5600 },
        { item: '牛皮紙袋、吊牌', vendor: '好包裝材料行（虛構）', base: 2200 },
      ],
      fixed: { rent: 22000, utility: 3800, ads: 9000, depreciation: 1500, equip: '蒸汽整燙機與衣架' },
      rd: [['選貨差旅', '大阪古著批貨選貨', '自家採購', 12000, '收據', 4]],
      channels: { web: 0.30, line: 0.18, pos: 0.30, phone: 0.02, whatsapp: 0.04, zalo: 0.01, messenger: 0.15 },
      langs: { zh: 0.78, en: 0.1, ja: 0.12 },
    },
  },

  // ─────────────────────────── 8. 獨立書店 ───────────────────────────
  {
    merchant: {
      id: 'bookstore', name: '慢頁獨立書店', en: 'Slow Page Books', type: 'bookstore', cat: 'retail',
      typeName: '獨立書店', owner: '阿頁', theme: 'bookstore', brand: '#2C3E66', tagline: '一本書，一段安靜時光',
      products: [
        P('bs-pick', '店主每月選書', "Owner's Monthly Pick", '1 本', 420, 290, 20, '每月一本，附手寫推薦卡。', 'One book a month with a handwritten note.', 'g2_book', '#2C3E66', '#D9B25F'),
        P('bs-zine', '城市角落獨立誌', 'City Corners Zine', '1 本', 250, 160, 25, '小誌出版，記錄城市巷弄。', 'A small-press zine about city alleys.', 'g2_book', '#A63D32', '#F1E6D0'),
        P('bs-blind', '選書盲盒 3 本', 'Blind Date with Books ×3', '3 本', 990, 620, 12, '只看關鍵字挑書，拆開才知道。', 'Chosen by keywords, a surprise inside.', 'g2_bookstack', '#5A74A8', '#A63D32'),
        P('bs-mark', '黃銅書籤', 'Brass Bookmark', '1 枚', 360, 110, 30, '手工打磨，可加購刻字。', 'Hand-polished, engraving available.', 'g2_bookmark', '#C9A24A', '#2C3E66'),
        P('bs-tote', '書店帆布袋', 'Bookshop Tote', '1 個', 490, 160, 22, '放得下 A4 書與一瓶水。', 'Fits A4 books and a water bottle.', 'tote', '#E9E1D0', '#1A2233'),
        P('bs-club', '週四讀書會', 'Thursday Book Club', '1 場', 350, 120, 16, '含飲品一杯，限額 16 人。', 'One drink included, 16 seats.', 'voucher', '#2C3E66', '#D9B25F'),
      ],
    },
    theme: {
      id: 'bookstore', kind: 'base', name: N('書頁靜讀', 'Quiet Pages', '静かな頁', 'Trang sách tĩnh', 'Halaman Sunyi'), deco: null, dark: false,
      vars: { cream: '#f5f1e8', cream2: '#e9e1d0', ink: '#1a2233', ink2: '#4a5366', ink3: '#848a97', rose: '#a63d32', g: '#2c3e66', gl: '#5a74a8', card: '#fffdf8', deep: '#141b2b', deep2: '#2c3e66', heroA: '#dfe3ee', heroB: '#f1e6d0', heroC: '#ead5cd', btn: '#1a2233', btnInk: '#ffffff' },
      hero: { pal: ['#2c3e66', '#a63d32', '#d9b25f', '#f1e6d0', '#5a74a8', '#e9e1d0'], dots: ['#d9b25f', '#a63d32', '#ffffff', '#5a74a8'], sky: '#fbf8f0', ground: '#d9cfb8', point: '#ffe0a0' },
      style: { font: 'serif', radius: 'soft', hero: 'minimal', grid: 'list', button: 'outline', texture: 'lines' },
    },
    profile: {
      avatar: '頁', volume: 11, aiName: '小頁', region: '台北市大同區',
      staff: [
        { name: '阿頁', title: '負責人・店主（董事酬勞）', kind: 'owner', pay: 45000 },
        { name: '小書', title: '門市與活動・兼職', kind: 'part', pay: 14400, level: 15840, hours: 72, hourly: 200 },
      ],
      suppliers: [
        { item: '新書進貨', vendor: '城南圖書經銷（虛構）', base: 30000 },
        { item: '獨立誌寄賣', vendor: '小誌創作者聯盟（虛構）', base: 4200 },
        { item: '書套、帆布袋、書籤', vendor: '好包裝材料行（虛構）', base: 3200 },
      ],
      fixed: { rent: 28000, utility: 3600, ads: 3000, depreciation: 1800, equip: '書架與活動桌椅' },
      rd: [['活動企劃', '作家座談講師費', '自家採購', 5000, '收據', 22]],
      channels: { web: 0.28, line: 0.20, pos: 0.40, phone: 0.04, whatsapp: 0.01, zalo: 0.01, messenger: 0.06 },
      langs: { zh: 0.86, en: 0.08, ja: 0.06 },
    },
  },

  // ─────────────────────────── 9. 寵物用品 ───────────────────────────
  {
    merchant: {
      id: 'petshop', name: '毛毛樂園寵物用品', en: 'Fluffy Paw Pet Supply', type: 'petshop', cat: 'retail',
      typeName: '寵物用品', owner: '阿毛', theme: 'petshop', brand: '#1A6FAE', tagline: '毛孩的日常，幫你備好',
      products: [
        P('pt-cat', '無穀貓乾糧', 'Grain-free Cat Kibble', '1.5kg', 880, 560, 20, '高蛋白配方，小顆粒好咀嚼。', 'High-protein recipe in small kibble.', 'g2_kibble', '#4FB3F0', '#FF8A3D'),
        P('pt-dog', '成犬雞肉乾糧', 'Adult Dog Chicken Kibble', '2kg', 760, 480, 18, '雞肉為第一原料，大小犬適用。', 'Chicken first, for all breed sizes.', 'g2_kibble', '#FF8A3D', '#1A6FAE'),
        P('pt-can', '貓咪主食罐 24 入', 'Cat Wet Food ×24', '24 罐', 1200, 780, 14, '鮪魚、雞肉口味綜合。', 'Assorted tuna and chicken.', 'g2_petcan', '#1A6FAE', '#FFD166'),
        P('pt-treat', '凍乾雞肉零食', 'Freeze-dried Chicken Treats', '100g', 280, 140, 40, '單一原料，訓練獎勵好用。', 'Single ingredient, handy for training.', 'g2_bone', '#E8B57A', '#FF8A3D'),
        P('pt-bed', '甜甜圈睡窩', 'Donut Pet Bed', '1 個', 1280, 520, 8, '長毛絨面，可整個下水洗。', 'Plush and fully machine washable.', 'g2_petbed', '#B9D9F2', '#FFE2C4'),
        P('pet-bowl', '陶瓷寵物碗', 'Ceramic Pet Bowl', '1 個', 420, 150, 24, '加高碗身，吃飯不低頭。', 'Raised bowl for comfier mealtimes.', 'g2_petbowl', '#F2F5F9', '#1A6FAE'),
      ],
    },
    theme: {
      id: 'petshop', kind: 'base', name: N('毛孩樂園', 'Paw Park', 'ペットパーク', 'Công viên thú cưng', 'Taman Haiwan'), deco: 'bubble', dark: false,
      vars: { cream: '#f0f8ff', cream2: '#dbeefb', ink: '#132a3d', ink2: '#425d73', ink3: '#7d93a5', rose: '#ff8a3d', g: '#1a6fae', gl: '#4fb3f0', card: '#ffffff', deep: '#0f3554', deep2: '#b4500f', heroA: '#cdeafd', heroB: '#ffe2c4', heroC: '#fff3b0', btn: '#1a6fae', btnInk: '#ffffff' },
      hero: { pal: ['#4fb3f0', '#ff8a3d', '#ffd166', '#b9d9f2', '#ffe2c4', '#1a6fae'], dots: ['#ff8a3d', '#4fb3f0', '#ffd166', '#ffffff'], sky: '#f2faff', ground: '#bfe3fa', point: '#ffc080' },
      style: { font: 'round', radius: 'round', hero: 'banner', grid: 'cards', button: 'pill', texture: 'none' },
    },
    profile: {
      avatar: '毛', volume: 14, aiName: '小毛', region: '新北市新莊區',
      staff: [
        { name: '阿毛', title: '負責人・店長（董事酬勞）', kind: 'owner', pay: 48000 },
        { name: '小柚', title: '門市理貨・全職', kind: 'full', pay: 30000, level: 30300 },
      ],
      suppliers: [
        { item: '乾糧、主食罐', vendor: '寵糧總經銷（虛構）', base: 42000 },
        { item: '睡窩、碗、玩具', vendor: '毛孩用品批發（虛構）', base: 9800 },
        { item: '宅配與外送運費', vendor: '綠野物流（虛構）', base: 6800 },
      ],
      fixed: { rent: 30000, utility: 4800, ads: 7000, depreciation: 2000, equip: '倉儲貨架與手推車' },
      rd: [['新品評估', '新進零食試吃樣品', '自家採購', 1800, '電子發票', 13]],
      channels: { web: 0.30, line: 0.32, pos: 0.26, phone: 0.06, whatsapp: 0.01, zalo: 0.01, messenger: 0.04 },
      langs: { zh: 0.92, en: 0.05, vi: 0.03 },
    },
  },

  // ─────────────────────────── 10. 文具店 ───────────────────────────
  {
    merchant: {
      id: 'stationery', name: '格格文具', en: 'Grid & Ink Stationery', type: 'stationery', cat: 'retail',
      typeName: '文具店', owner: '小格', theme: 'stationery', brand: '#2B5FA8', tagline: '寫字，是最慢的快樂',
      products: [
        P('st-pen', '入門鋼筆', 'Starter Fountain Pen', '1 支', 980, 420, 14, 'F 尖，附吸墨器。', 'Fine nib, converter included.', 'g2_pen', '#2B5FA8', '#1C2A3A'),
        P('st-note', '方格筆記本 A5', 'A5 Grid Notebook', '1 本', 260, 90, 40, '5mm 方格，鋼筆不透墨。', '5mm grid, fountain-pen friendly.', 'g2_notebook', '#E2574C', '#1C2A3A'),
        P('st-planner', '2027 週間手帳', '2027 Weekly Planner', '1 本', 680, 260, 25, '週間格式，附布書衣。', 'Weekly layout with a fabric cover.', 'g2_notebook', '#2B5FA8', '#F3C623'),
        P('st-tape', '紙膠帶 3 卷', 'Washi Tape ×3', '3 卷', 180, 60, 60, '原創插畫，好撕不殘膠。', 'Original art, tears easily, no residue.', 'g2_tape', '#F3C623', '#E2574C'),
        P('st-pencil', '素描鉛筆 12 支', 'Sketching Pencils ×12', '12 支', 320, 110, 30, '6B 到 2H，附削鉛筆器。', 'From 6B to 2H with a sharpener.', 'g2_pencils', '#2E7D5B', '#C9D6EA'),
        P('st-ink', '海港藍鋼筆墨水', 'Harbour Blue Ink', '30ml', 450, 160, 24, '乾後帶紅色光澤。', 'Dries with a red sheen.', 'bottle', '#1E4F8C', '#FBFAF4'),
      ],
    },
    theme: {
      id: 'stationery', kind: 'base', name: N('方格手帖', 'Grid Notebook', '方眼手帖', 'Sổ ô vuông', 'Buku Grid'), deco: null, dark: false,
      vars: { cream: '#fbfaf4', cream2: '#eef0e6', ink: '#1c2a3a', ink2: '#4b586a', ink3: '#8a95a2', rose: '#e2574c', g: '#2b5fa8', gl: '#6b9be0', card: '#ffffff', deep: '#1c2a3a', deep2: '#2b5fa8', heroA: '#fff2b0', heroB: '#dce8fb', heroC: '#ffd9d4', btn: '#2b5fa8', btnInk: '#ffffff' },
      hero: { pal: ['#2b5fa8', '#f3c623', '#e2574c', '#6b9be0', '#2e7d5b', '#fff2b0'], dots: ['#f3c623', '#e2574c', '#2b5fa8', '#ffffff'], sky: '#ffffff', ground: '#dce8fb', point: '#ffe27a' },
      style: { font: 'hand', radius: 'soft', hero: 'split', grid: 'tiles', button: 'outline', texture: 'grid' },
    },
    profile: {
      avatar: '格', volume: 12, aiName: '小格', region: '台中市北區',
      staff: [
        { name: '小格', title: '負責人・店主（董事酬勞）', kind: 'owner', pay: 45000 },
        { name: '阿筆', title: '門市・兼職', kind: 'part', pay: 12800, level: 13500, hours: 64, hourly: 200 },
      ],
      suppliers: [
        { item: '鋼筆、墨水', vendor: '書寫工具代理（虛構）', base: 16000 },
        { item: '筆記本、手帳', vendor: '紙研所印刷（虛構）', base: 12000 },
        { item: '紙膠帶、鉛筆', vendor: '文具批發街（虛構）', base: 5600 },
      ],
      fixed: { rent: 22000, utility: 3200, ads: 5000, depreciation: 1500, equip: '試寫桌與展示櫃' },
      rd: [['設計開發', '原創紙膠帶插畫打樣', '紙研所印刷（虛構）', 2800, '電子發票', 10]],
      channels: { web: 0.38, line: 0.20, pos: 0.30, phone: 0.02, whatsapp: 0.02, zalo: 0.01, messenger: 0.07 },
      langs: { zh: 0.82, en: 0.06, ja: 0.12 },
    },
  },

  // ─────────────────────────── 11. 3C 手機配件 ───────────────────────────
  {
    merchant: {
      id: 'gadget', name: '電光 3C 配件', en: 'Volt Mobile Gear', type: 'gadget', cat: 'retail',
      typeName: '3C 手機配件', owner: '阿哲', theme: 'gadget', brand: '#00A6CC', tagline: '充電快，摔不壞',
      products: [
        P('gd-case', '氣墊防摔手機殼', 'Air-cushion Phone Case', '1 個', 590, 180, 40, '四角氣墊，多款機型可選。', 'Corner air cushions, many models.', 'g2_phone', '#1C2533', '#00D1FF'),
        P('gd-clear', '透明磁吸手機殼', 'Clear Magnetic Case', '1 個', 690, 210, 32, '不易泛黃，內建磁吸圈。', 'Anti-yellowing with a built-in magnet ring.', 'g2_phone', '#B9C6D4', '#FF5C8A'),
        P('gd-buds', '真無線藍牙耳機', 'True Wireless Earbuds', '1 組', 1490, 620, 18, '主動降噪，含盒續航 24 小時。', 'ANC, 24 hours with the case.', 'g2_earbuds', '#F2F5F9', '#00D1FF'),
        P('gd-charger', '65W 氮化鎵快充頭', '65W GaN Charger', '1 個', 990, 380, 25, '三孔同時充，筆電也能用。', 'Three ports, powers laptops too.', 'g2_charger', '#E9EEF5', '#FF5C8A'),
        P('gd-cable', '編織快充線 1.5m', 'Braided USB-C Cable 1.5m', '1 條', 350, 90, 50, '耐彎折，支援 100W。', 'Bend-resistant, 100W support.', 'g2_cable', '#FF5C8A', '#1C2533'),
        P('gd-power', '磁吸行動電源', 'Magnetic Power Bank', '10000mAh', 1290, 520, 20, '吸上就充，附折疊支架。', 'Snap on to charge, with a kickstand.', 'g2_powerbank', '#2A3445', '#B6FF3B'),
      ],
    },
    theme: {
      id: 'gadget', kind: 'base', dark: true, name: N('電光迴路', 'Neon Circuit', 'ネオンサーキット', 'Mạch neon', 'Litar Neon'), deco: 'star',
      vars: { cream: '#0d1117', cream2: '#161c26', ink: '#e9f1ff', ink2: '#a7b4c8', ink3: '#74829a', rose: '#ff5c8a', g: '#00d1ff', gl: '#38e8ff', card: '#151b25', deep: '#05070b', deep2: '#10243a', heroA: '#0f2a44', heroB: '#1b1640', heroC: '#0a3a3a', btn: '#00d1ff', btnInk: '#04121a' },
      hero: { pal: ['#00d1ff', '#ff5c8a', '#b6ff3b', '#2a3445', '#e9eef5', '#7c62e6'], dots: ['#00d1ff', '#ff5c8a', '#b6ff3b', '#ffffff'], sky: '#9ee8ff', ground: '#10243a', point: '#00d1ff', dim: true },
      style: { font: 'mono', radius: 'sharp', hero: 'banner', grid: 'tiles', button: 'block', texture: 'grid' },
    },
    profile: {
      avatar: '哲', volume: 13, aiName: '小哲', region: '高雄市三民區',
      staff: [
        { name: '阿哲', title: '負責人・店長（董事酬勞）', kind: 'owner', pay: 48000 },
        { name: '小宇', title: '門市・代貼・兼職', kind: 'part', pay: 17600, level: 17880, hours: 88, hourly: 200 },
      ],
      suppliers: [
        { item: '手機殼、保護貼', vendor: '深港配件貿易（虛構）', base: 22000 },
        { item: '充電器、線材、行動電源', vendor: '電能科技批發（虛構）', base: 26000 },
        { item: '藍牙耳機', vendor: '聲波音訊代理（虛構）', base: 14000 },
      ],
      fixed: { rent: 26000, utility: 4600, ads: 10000, depreciation: 2200, equip: '展示壁板與貼膜機' },
      rd: [['檢驗費', '新款快充頭安規送驗', '電子檢測中心（虛構）', 6000, '電子發票', 19]],
      channels: { web: 0.34, line: 0.22, pos: 0.28, phone: 0.04, whatsapp: 0.03, zalo: 0.03, messenger: 0.06 },
      langs: { zh: 0.82, en: 0.1, vi: 0.08 },
    },
  },
];
