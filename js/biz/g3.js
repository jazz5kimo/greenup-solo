// 第 3 組：零售（嬰幼兒、露營、眼鏡）＋手作工藝（手工皂、蠟燭、陶藝、銀飾、木工、裁縫、植物染）＋多肉植栽
// 全部店名、人名、廠商皆為虛構示範資料。
// 手工皂、蠟燭不宣稱任何療效；眼鏡行只販售鏡框、太陽眼鏡、配件與驗光預約服務，不宣稱醫療效果。

// ---- 色彩與繪圖小工具（插圖用） ----
const toRgb = (h) => { h = String(h || '#999').replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = (r, g, b) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const x = toRgb(a), y = toRgb(b); return toHex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t); };
const dk = (c, t = 0.25) => mix(c, '#000000', t);
const lt = (c, t = 0.35) => mix(c, '#ffffff', t);
const vg = (id, a, b) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const hg = (id, a, b) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const dg = (id, a, b) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const shadow = (rx = 36, cy = 98) => `<ellipse cx="60" cy="${cy}" rx="${rx}" ry="${Math.max(4, rx / 6)}" fill="rgba(0,0,0,.16)"/>`;
const shine = (d, o = 0.24) => `<path d="${d}" fill="#fff" opacity="${o}"/>`;
const leaf = (x, y, r, c, s = 1) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})"><path d="M0 0 q8 -10 18 0 q-10 9 -18 0z" fill="${c}"/><path d="M1 0 h15" stroke="${dk(c, 0.3)}" stroke-width=".8"/></g>`;
const stitch = (d, c) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="1.2" stroke-dasharray="3 2.4" stroke-linecap="round"/>`;
const flame = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="-6" rx="9" ry="12" fill="#ffd36b" opacity=".25"/><path d="M0 -14 q7 9 0 16 q-7 -7 0 -16z" fill="#ffb53d"/><path d="M0 -7 q3.5 4.5 0 8 q-3.5 -3.5 0 -8z" fill="#fff4c4"/></g>`;
const bubble = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" fill-opacity=".35" stroke="#fff" stroke-width="1.2"/><circle cx="${x - r * 0.35}" cy="${y - r * 0.35}" r="${Math.max(0.8, r * 0.22)}" fill="#fff"/>`;
const spark = (x, y, s = 1, c = '#fff') => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -6 q1 5 6 6 q-5 1 -6 6 q-1 -5 -6 -6 q5 -1 6 -6z" fill="${c}"/>`;
const SILVER = (id) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#c9ced6"/><stop offset=".7" stop-color="#eef1f4"/><stop offset="1" stop-color="#8d949e"/></linearGradient>`;
const metal = (id, c) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${lt(c, 0.6)}"/><stop offset=".45" stop-color="${c}"/><stop offset=".7" stop-color="${lt(c, 0.4)}"/><stop offset="1" stop-color="${dk(c, 0.3)}"/></linearGradient>`;
const rosette = (cx, cy, c, tip, s = 1) => {
  const ring = (n, d, len, w, col, off = 0) => Array.from({ length: n }, (_, i) => {
    const ang = (i / n) * 360 + off;
    return `<g transform="rotate(${ang.toFixed(1)}) translate(0 ${-d})"><path d="M0 0 q${-w} ${-len * 0.5} 0 ${-len} q${w} ${len * 0.5} 0 ${len}z" fill="${col}"/><path d="M0 ${-len} q-2 ${len * 0.18} 0 ${len * 0.28} q2 ${-len * 0.1} 0 ${-len * 0.28}z" fill="${tip}"/></g>`;
  }).join('');
  return `<g transform="translate(${cx} ${cy}) scale(${s} ${s * 0.72})">${ring(9, 4, 20, 8, dk(c, 0.12), 0)}${ring(7, 2, 15, 7, c, 20)}${ring(5, 0, 10, 6, lt(c, 0.2), 10)}<circle r="3.5" fill="${lt(c, 0.35)}"/></g>`;
};

// ---- 新增插圖（kind 名稱以 g3_ 開頭） ----
export const ART = {
  // 嬰兒包屁衣
  g3_onesie: (u, c, a) => `<defs>${vg(u + 'x', lt(c, 0.15), dk(c, 0.1))}</defs>${shadow(34)}
    <path d="M42 24 q18 10 36 0 l18 10 l-8 14 l-8 -4 v34 q0 6 -6 8 l-6 10 h-16 l-6 -10 q-6 -2 -6 -8 v-34 l-8 4 l-8 -14 z" fill="url(#${u}x)"/>
    <path d="M42 24 q18 10 36 0" fill="none" stroke="${a}" stroke-width="3" stroke-linecap="round"/>
    <path d="M30 45 l-6 -11 M90 45 l6 -11" stroke="${a}" stroke-width="3" stroke-linecap="round"/>
    <path d="M56 96 h8" stroke="${a}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="55" cy="90" r="1.8" fill="${dk(c, 0.3)}"/><circle cx="65" cy="90" r="1.8" fill="${dk(c, 0.3)}"/>
    <path d="M60 68 c-7 -6 -12 -1 -10 3 c2 5 10 9 10 9 c0 0 8 -4 10 -9 c2 -4 -3 -9 -10 -3z" fill="${a}"/>
    ${spark(46, 54, 0.7, lt(a, 0.3))}${spark(76, 58, 0.55, lt(a, 0.3))}
    ${shine('M44 46 h4 v32 h-4 z')}`,

  // 玻璃奶瓶
  g3_babybottle: (u, c, a) => `<defs>${hg(u + 'x', lt(c, 0.35), c)}</defs>${shadow(26)}
    <path d="M54 26 q6 -14 12 0 v4 h-12 z" fill="#f3d9b8"/><ellipse cx="60" cy="20" rx="3" ry="3" fill="#ead0ac"/>
    <rect x="46" y="29" width="28" height="11" rx="3" fill="${a}"/>
    <path d="M46 34 h28" stroke="${dk(a, 0.15)}" stroke-width="1"/>
    <rect x="44" y="40" width="32" height="54" rx="10" fill="url(#${u}x)" opacity=".92"/>
    <rect x="46" y="60" width="28" height="32" rx="8" fill="#fffaf0" opacity=".9"/>
    ${[48, 56, 64, 72, 80].map((y, i) => `<path d="M66 ${y} h${i % 2 ? 5 : 8}" stroke="${dk(c, 0.3)}" stroke-width="1.2"/>`).join('')}
    ${shine('M48 44 h4 v44 h-4 z', 0.4)}
    ${spark(88, 40, 0.8, a)}${spark(32, 58, 0.6, lt(a, 0.2))}`,

  // 紗布包巾（摺疊堆疊）
  g3_blanket: (u, c, a) => `<defs>${vg(u + 'x', lt(c, 0.1), dk(c, 0.12))}</defs>${shadow(40)}
    <rect x="22" y="72" width="76" height="20" rx="7" fill="${dk(c, 0.08)}"/>
    <rect x="26" y="54" width="70" height="20" rx="7" fill="${lt(a, 0.55)}"/>
    ${Array.from({ length: 6 }, (_, i) => `<circle cx="${34 + i * 11}" cy="64" r="2" fill="${a}" opacity=".7"/>`).join('')}
    <rect x="20" y="34" width="74" height="22" rx="7" fill="url(#${u}x)"/>
    ${[0, 1, 2, 3, 4, 5, 6].map(i => `<path d="M${26 + i * 10} 34 v22" stroke="#fff" stroke-width="2" opacity=".35"/>`).join('')}
    <rect x="60" y="30" width="9" height="64" rx="2" fill="${a}"/>
    <path d="M64 30 q-14 -14 -18 -2 q6 6 18 2 q14 -14 18 -2 q-6 6 -18 2" fill="${dk(a, 0.1)}"/><circle cx="64" cy="30" r="3" fill="${dk(a, 0.25)}"/>
    ${shine('M24 37 h30 v3 h-30 z', 0.35)}`,

  // 木製搖鈴
  g3_rattle: (u, c, a) => `<defs><radialGradient id="${u}x" cx=".35" cy=".35"><stop offset="0" stop-color="${lt(c, 0.35)}"/><stop offset="1" stop-color="${dk(c, 0.12)}"/></radialGradient></defs>${shadow(32)}
    <circle cx="46" cy="72" r="17" fill="none" stroke="#d9b07a" stroke-width="7"/>
    <circle cx="46" cy="72" r="17" fill="none" stroke="#b98a52" stroke-width="1" stroke-dasharray="2 4"/>
    ${[[0.6, a], [1.6, c], [2.6, lt(a, 0.3)], [3.6, '#f6f1e6']].map(([t, col]) => `<circle cx="${(46 + Math.cos(t) * 17).toFixed(1)}" cy="${(72 + Math.sin(t) * 17).toFixed(1)}" r="4.6" fill="${col}"/>`).join('')}
    <path d="M58 60 L68 50" stroke="#c99b62" stroke-width="7" stroke-linecap="round"/>
    <circle cx="76" cy="42" r="18" fill="url(#${u}x)"/>
    <path d="M60 44 q16 6 32 -4 M62 34 q14 -4 28 4" stroke="${a}" stroke-width="3" fill="none" opacity=".85"/>
    <circle cx="70" cy="35" r="4" fill="#fff" opacity=".45"/>
    ${spark(28, 40, 0.7, a)}`,

  // 軟積木
  g3_blocks: (u, c, a) => {
    const blk = (x, y, s, col, letter) => `<path d="M${x} ${y} l${s * 0.3} ${-s * 0.3} h${s} l${-s * 0.3} ${s * 0.3} z" fill="${lt(col, 0.25)}"/>
      <path d="M${x + s} ${y} l${s * 0.3} ${-s * 0.3} v${s} l${-s * 0.3} ${s * 0.3} z" fill="${dk(col, 0.15)}"/>
      <rect x="${x}" y="${y}" width="${s}" height="${s}" rx="3" fill="${col}"/>
      <text x="${x + s / 2}" y="${y + s * 0.72}" text-anchor="middle" font-family="Arial Rounded MT Bold, Arial, sans-serif" font-weight="800" font-size="${s * 0.6}" fill="#fff">${letter}</text>`;
    return `${shadow(40)}${blk(20, 66, 28, c, 'A')}${blk(54, 66, 28, a, 'B')}${blk(36, 36, 28, mix(c, a, 0.5), 'C')}
      ${spark(92, 36, 0.8, a)}${spark(24, 40, 0.6, c)}`;
  },

  // 禮盒
  g3_giftbox: (u, c, a) => `<defs>${vg(u + 'x', lt(c, 0.08), dk(c, 0.18))}</defs>${shadow(36)}
    <rect x="30" y="56" width="60" height="38" rx="3" fill="url(#${u}x)"/>
    <rect x="26" y="44" width="68" height="14" rx="3" fill="${lt(c, 0.12)}"/>
    <rect x="26" y="56" width="68" height="3" fill="${dk(c, 0.25)}" opacity=".4"/>
    <rect x="55" y="44" width="10" height="50" fill="${a}"/>
    <path d="M60 44 q-22 -20 -24 -4 q4 8 24 4 q22 -20 24 -4 q-4 8 -24 4" fill="${a}"/>
    <path d="M60 44 q-14 -12 -16 -3 M60 44 q14 -12 16 -3" stroke="${dk(a, 0.2)}" stroke-width="1.2" fill="none"/>
    <circle cx="60" cy="44" r="4" fill="${dk(a, 0.15)}"/>
    <rect x="72" y="68" width="14" height="10" rx="2" fill="#fffaf0" transform="rotate(-8 79 73)"/>
    ${shine('M30 47 h22 v3 h-22 z', 0.35)}`,

  // 帳篷
  g3_tent: (u, c, a) => `<defs>${vg(u + 'x', lt(c, 0.12), dk(c, 0.15))}</defs>${shadow(46)}
    <path d="M52 30 L78 26 L110 86 L90 92 Z" fill="${dk(c, 0.22)}"/>
    <path d="M14 92 L52 30 L90 92 Z" fill="url(#${u}x)"/>
    <path d="M52 46 L38 92 H66 Z" fill="${dk(c, 0.55)}"/>
    <path d="M52 46 L66 92 L76 92 Z" fill="${lt(c, 0.18)}"/>
    <path d="M52 30 L52 18" stroke="${dk(c, 0.4)}" stroke-width="2"/><path d="M52 18 l10 3 l-10 3 z" fill="${a}"/>
    <path d="M52 32 L6 96 M78 28 L116 90" stroke="${lt(c, 0.5)}" stroke-width="1" opacity=".8"/>
    <path d="M22 80 L44 44" stroke="#fff" stroke-width="2.5" opacity=".25"/>
    <rect x="20" y="88" width="80" height="4" rx="2" fill="${a}" opacity=".55"/>
    ${spark(96, 24, 0.7, a)}`,

  // 露營燈
  g3_lantern: (u, c, a) => `<defs><radialGradient id="${u}x" cx=".5" cy=".5"><stop offset="0" stop-color="#fffbe6"/><stop offset=".6" stop-color="${lt(a, 0.3)}"/><stop offset="1" stop-color="${a}"/></radialGradient>${vg(u + 'y', lt(c, 0.12), dk(c, 0.2))}</defs>${shadow(28)}
    <circle cx="60" cy="60" r="34" fill="${a}" opacity=".12"/>
    <path d="M44 30 q16 -24 32 0" fill="none" stroke="${dk(c, 0.3)}" stroke-width="3.4"/>
    <rect x="40" y="28" width="40" height="11" rx="5" fill="url(#${u}y)"/>
    <rect x="56" y="22" width="8" height="7" rx="2" fill="${dk(c, 0.2)}"/>
    <rect x="45" y="39" width="30" height="41" rx="4" fill="url(#${u}x)"/>
    <ellipse cx="60" cy="58" rx="7" ry="11" fill="#fff" opacity=".7"/>
    ${[48, 60, 72].map(x => `<path d="M${x} 39 v41" stroke="${dk(c, 0.15)}" stroke-width="2"/>`).join('')}
    <rect x="38" y="80" width="44" height="12" rx="4" fill="url(#${u}y)"/>
    <circle cx="70" cy="86" r="2" fill="${a}"/>
    ${shine('M42 30 h12 v3 h-12 z', 0.35)}`,

  // 折疊月亮椅
  g3_campchair: (u, c, a) => `<defs>${vg(u + 'x', lt(c, 0.1), dk(c, 0.2))}</defs>${shadow(40)}
    <path d="M30 94 L82 54 M90 94 L38 54" stroke="#3a3d40" stroke-width="4" stroke-linecap="round"/>
    <path d="M38 94 L84 60 M82 94 L36 60" stroke="#55595e" stroke-width="2.5" stroke-linecap="round" opacity=".6"/>
    <path d="M26 34 q4 42 34 46 q30 -4 34 -46 q-34 16 -68 0 z" fill="url(#${u}x)"/>
    <path d="M26 34 q34 16 68 0" fill="none" stroke="${a}" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M34 50 q26 16 52 0" fill="none" stroke="${dk(c, 0.25)}" stroke-width="1.2" opacity=".6"/>
    ${stitch('M32 40 q4 32 28 36 q24 -4 28 -36', lt(c, 0.45))}
    <rect x="52" y="58" width="16" height="9" rx="2" fill="${a}"/>
    <rect x="26" y="92" width="10" height="4" rx="2" fill="#2b2d30"/><rect x="84" y="92" width="10" height="4" rx="2" fill="#2b2d30"/>`,

  // 琺瑯露營杯
  g3_enamel: (u, c, a) => `<defs>${hg(u + 'x', lt(c, 0.15), dk(c, 0.12))}</defs>${shadow(30)}
    <g fill="none" stroke="#c9c2b4" stroke-width="2.2" stroke-linecap="round" opacity=".8"><path d="M50 30 q-4 -6 0 -11 q4 -5 0 -10"/><path d="M60 28 q-4 -6 0 -11 q4 -5 0 -10"/></g>
    <path d="M78 52 q16 0 16 13 q0 13 -16 13" fill="none" stroke="${a}" stroke-width="5.5"/>
    <path d="M32 42 h46 v40 q0 12 -12 12 h-22 q-12 0 -12 -12 z" fill="url(#${u}x)"/>
    <path d="M38 80 l9 -14 l6 8 l6 -9 l10 15 z" fill="${a}" opacity=".85"/><path d="M47 66 l2.4 3.6 h-4.8z M59 65 l3 4.5 h-6z" fill="#fff"/>
    <ellipse cx="55" cy="42" rx="23" ry="5.5" fill="${a}"/><ellipse cx="55" cy="42.5" rx="19.5" ry="4" fill="${dk(c, 0.45)}"/>
    ${[[40, 56], [70, 62], [64, 50], [44, 88]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.1" fill="#fff" opacity=".6"/>`).join('')}
    ${shine('M35 48 h4 v32 h-4 z', 0.3)}`,

  // 卡式爐＋套鍋
  g3_stove: (u, c, a) => `<defs>${vg(u + 'x', '#9aa0a6', '#4a4f55')}${hg(u + 'y', lt(c, 0.3), dk(c, 0.2))}</defs>${shadow(42)}
    <rect x="22" y="76" width="76" height="18" rx="5" fill="url(#${u}x)"/>
    <rect x="28" y="80" width="18" height="10" rx="2" fill="#2d3136"/><circle cx="84" cy="85" r="4.5" fill="${a}"/><circle cx="84" cy="85" r="1.8" fill="#fff" opacity=".6"/>
    <path d="M40 76 l-4 -8 M80 76 l4 -8 M60 76 v-8" stroke="#3a3e43" stroke-width="2.5"/>
    <path d="M48 70 q4 -6 6 0 q2 -7 6 -1 q3 -6 6 1 q3 -5 6 0" fill="#5fb0f0" opacity=".9"/>
    <path d="M30 44 h60 v20 q0 6 -6 6 h-48 q-6 0 -6 -6 z" fill="url(#${u}y)"/>
    <ellipse cx="60" cy="44" rx="30" ry="5" fill="${lt(c, 0.25)}"/><ellipse cx="60" cy="42" rx="20" ry="3" fill="${dk(c, 0.15)}"/>
    <rect x="56" y="36" width="8" height="5" rx="2" fill="${a}"/>
    <path d="M90 50 h14" stroke="${dk(c, 0.3)}" stroke-width="3.5" stroke-linecap="round"/>
    ${shine('M34 48 h4 v14 h-4 z', 0.4)}`,

  // 光學眼鏡框
  g3_glasses: (u, c, a) => `<defs>${dg(u + 'x', lt(c, 0.25), dk(c, 0.15))}</defs>${shadow(42, 92)}
    <path d="M20 56 L8 44 M100 56 L112 44" stroke="${dk(c, 0.15)}" stroke-width="4" stroke-linecap="round"/>
    <circle cx="38" cy="60" r="18" fill="#eaf4fa" fill-opacity=".55" stroke="url(#${u}x)" stroke-width="5.5"/>
    <circle cx="82" cy="60" r="18" fill="#eaf4fa" fill-opacity=".55" stroke="url(#${u}x)" stroke-width="5.5"/>
    <path d="M55 55 q5 -6 10 0" fill="none" stroke="${c}" stroke-width="4"/>
    <path d="M22 50 q16 -12 32 -2 M66 48 q16 -10 32 2" fill="none" stroke="${a}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="20" cy="56" r="2.6" fill="${a}"/><circle cx="100" cy="56" r="2.6" fill="${a}"/>
    <path d="M28 66 l14 -14 M33 70 l12 -12 M72 66 l14 -14 M77 70 l12 -12" stroke="#fff" stroke-width="2.4" opacity=".7" stroke-linecap="round"/>
    <circle cx="54" cy="66" r="2" fill="#dfe6ea"/><circle cx="66" cy="66" r="2" fill="#dfe6ea"/>`,

  // 太陽眼鏡
  g3_shades: (u, c, a) => `<defs>${vg(u + 'x', lt(c, 0.15), dk(c, 0.35))}</defs>${shadow(42, 92)}
    <path d="M16 48 L6 40 M104 48 L114 40" stroke="${a}" stroke-width="4" stroke-linecap="round"/>
    <path d="M16 46 h38 q3 0 3 4 l-3 16 q-2 10 -13 10 h-9 q-12 0 -15 -12 l-3 -14 q0 -4 2 -4 z" fill="url(#${u}x)" stroke="${a}" stroke-width="3.5"/>
    <path d="M66 46 h38 q2 0 2 4 l-3 14 q-3 12 -15 12 h-9 q-11 0 -13 -10 l-3 -16 q0 -4 3 -4 z" fill="url(#${u}x)" stroke="${a}" stroke-width="3.5"/>
    <path d="M57 50 q3 -4 6 0" fill="none" stroke="${a}" stroke-width="3.5"/>
    <path d="M14 46 h92" stroke="${a}" stroke-width="5" stroke-linecap="round"/>
    <path d="M24 66 l14 -16 h6 l-14 16 z M74 66 l14 -16 h6 l-14 16 z" fill="#fff" opacity=".3"/>
    <circle cx="20" cy="46" r="1.6" fill="#fff" opacity=".7"/><circle cx="100" cy="46" r="1.6" fill="#fff" opacity=".7"/>`,

  // 視力檢查表（驗光預約）
  g3_eyechart: (u, c, a) => {
    const E = (x, y, s, r) => `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-family="Arial, sans-serif" font-weight="900" font-size="${s}" fill="${c}" transform="rotate(${r} ${x} ${y})">E</text>`;
    return `${shadow(30)}
    <path d="M44 92 L50 82 M76 92 L70 82" stroke="${dk(a, 0.2)}" stroke-width="3" stroke-linecap="round"/>
    <rect x="32" y="16" width="56" height="70" rx="4" fill="#ffffff" stroke="${lt(c, 0.6)}"/>
    <rect x="32" y="16" width="56" height="8" rx="4" fill="${a}"/>
    ${E(60, 37, 18, 0)}${E(51, 53, 10, 90)}${E(69, 53, 10, 180)}
    ${E(47, 65, 7, 270)}${E(60, 65, 7, 0)}${E(73, 65, 7, 90)}
    ${[44, 54, 64, 74].map((x, i) => E(x + 2, 75, 5, i * 90)).join('')}
    <path d="M38 70 h44" stroke="${a}" stroke-width="1" opacity=".7"/>
    ${shine('M35 26 h3 v56 h-3 z', 0.15)}`;
  },

  // 眼鏡盒＋拭鏡布＋清潔液
  g3_eyecase: (u, c, a) => `<defs>${vg(u + 'x', lt(c, 0.15), dk(c, 0.2))}${hg(u + 'y', '#eef3f6', '#c9d3da')}</defs>${shadow(42)}
    <rect x="80" y="34" width="16" height="50" rx="4" fill="url(#${u}y)"/><rect x="83" y="26" width="10" height="9" rx="2" fill="${a}"/><rect x="86" y="21" width="9" height="5" rx="1.5" fill="${a}"/>
    <rect x="82" y="52" width="12" height="14" rx="2" fill="#fff" opacity=".85"/>
    <rect x="22" y="70" width="58" height="22" rx="3" fill="${lt(a, 0.55)}" transform="rotate(-4 51 81)"/>
    <path d="M24 78 h56 M24 84 h56" stroke="${a}" stroke-width="1.2" opacity=".5" transform="rotate(-4 51 81)"/>
    <rect x="20" y="46" width="62" height="28" rx="14" fill="url(#${u}x)"/>
    <path d="M22 58 h58" stroke="${dk(c, 0.35)}" stroke-width="1.4"/>
    <rect x="46" y="55" width="10" height="6" rx="2" fill="#d9b25f"/>
    ${shine('M28 49 h44 v3 h-44 z', 0.3)}${shine('M83 38 h3 v42 h-3 z', 0.5)}`,

  // 手工皂
  g3_soap: (u, c, a) => `<defs>${vg(u + 'x', c, dk(c, 0.1))}</defs>${shadow(40)}
    <path d="M20 64 L36 48 H98 L82 64 Z" fill="${lt(c, 0.2)}"/>
    <path d="M82 64 L98 48 V72 q0 3 -3 5 L82 90 z" fill="${dk(c, 0.18)}"/>
    <path d="M20 64 h62 v22 q0 4 -4 4 h-54 q-4 0 -4 -4 z" fill="url(#${u}x)"/>
    <ellipse cx="59" cy="56" rx="16" ry="5" fill="none" stroke="${dk(c, 0.18)}" stroke-width="1.4"/>
    ${leaf(52, 56, -10, dk(c, 0.2), 0.7)}
    ${[[30, 74], [44, 82], [58, 72], [70, 80], [36, 86]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".9" fill="${dk(c, 0.3)}" opacity=".4"/>`).join('')}
    ${leaf(28, 44, -150, a, 1)}${leaf(30, 44, -110, lt(a, 0.15), 0.85)}
    ${bubble(92, 34, 7)}${bubble(80, 24, 4.5)}${bubble(100, 20, 3.4)}
    ${shine('M24 66 h56 v2 h-56 z', 0.35)}`,

  // 木製皂盤
  g3_soapdish: (u, c, a) => `<defs>${vg(u + 'x', lt(c, 0.2), dk(c, 0.08))}</defs>${shadow(44)}
    <rect x="18" y="80" width="84" height="10" rx="4" fill="${dk(a, 0.15)}"/>
    ${Array.from({ length: 7 }, (_, i) => `<rect x="${20 + i * 11.6}" y="74" width="9" height="12" rx="2" fill="${i % 2 ? a : lt(a, 0.12)}"/>`).join('')}
    <rect x="34" y="52" width="52" height="24" rx="11" fill="url(#${u}x)"/>
    <ellipse cx="60" cy="58" rx="20" ry="3.5" fill="#fff" opacity=".35"/>
    <path d="M50 66 q10 -6 20 0" fill="none" stroke="${dk(c, 0.15)}" stroke-width="1.4"/>
    ${bubble(36, 46, 6)}${bubble(46, 36, 3.6)}${bubble(82, 42, 5)}${bubble(90, 32, 3)}${bubble(70, 40, 2.6)}`,

  // 罐裝香氛蠟燭
  g3_candle: (u, c, a) => `<defs>${hg(u + 'x', lt(c, 0.2), dk(c, 0.2))}</defs>${shadow(32)}
    <circle cx="60" cy="30" r="22" fill="#ffd36b" opacity=".12"/>
    <rect x="34" y="40" width="52" height="54" rx="8" fill="url(#${u}x)"/>
    <ellipse cx="60" cy="46" rx="24" ry="4.5" fill="#fbf1df"/><ellipse cx="60" cy="46" rx="24" ry="4.5" fill="none" stroke="${dk(c, 0.2)}" opacity=".5"/>
    <path d="M60 46 v-6" stroke="#3a2a20" stroke-width="1.6"/>
    ${flame(60, 39)}
    <rect x="40" y="58" width="40" height="26" rx="2" fill="${a}"/>
    <rect x="43" y="61" width="34" height="20" rx="1" fill="none" stroke="${lt(a, 0.45)}" stroke-width=".8"/>
    <rect x="48" y="67" width="24" height="2.4" rx="1.2" fill="${lt(a, 0.6)}"/><rect x="52" y="73" width="16" height="1.8" rx=".9" fill="${lt(a, 0.45)}"/>
    ${shine('M38 50 h4 v40 h-4 z', 0.3)}`,

  // 旅行鐵罐蠟燭
  g3_tin: (u, c, a) => `<defs>${metal(u + 'x', c)}${vg(u + 'y', lt(c, 0.2), dk(c, 0.22))}</defs>${shadow(38)}
    <ellipse cx="78" cy="48" rx="22" ry="22" fill="url(#${u}x)" transform="rotate(-20 78 48)"/>
    <ellipse cx="78" cy="48" rx="17" ry="17" fill="${a}" transform="rotate(-20 78 48)"/>
    <text x="78" y="51" text-anchor="middle" font-family="Georgia, serif" font-size="8" font-style="italic" fill="${lt(a, 0.7)}">scent</text>
    <path d="M24 66 v18 q0 9 30 9 q30 0 30 -9 v-18" fill="url(#${u}y)"/>
    <ellipse cx="54" cy="66" rx="30" ry="9" fill="${lt(c, 0.35)}"/><ellipse cx="54" cy="66" rx="26" ry="7" fill="#f8ecd9"/>
    <path d="M54 66 v-5" stroke="#3a2a20" stroke-width="1.5"/>
    ${flame(54, 60, 0.85)}
    <path d="M24 76 q30 10 60 0" stroke="${a}" stroke-width="4" fill="none" opacity=".85"/>`,

  // 柱狀蠟燭
  g3_pillar: (u, c, a) => {
    const p = (x, w, h, col) => `<rect x="${x}" y="${94 - h}" width="${w}" height="${h}" rx="4" fill="${col}"/><ellipse cx="${x + w / 2}" cy="${94 - h + 2}" rx="${w / 2}" ry="2.6" fill="${lt(col, 0.3)}"/><path d="M${x + 3} ${94 - h + 3} q1 6 2 2 q1 6 2 0" stroke="${lt(col, 0.35)}" stroke-width="2" fill="none"/><path d="M${x + w / 2} ${94 - h + 2} v-5" stroke="#3a2a20" stroke-width="1.4"/>${flame(x + w / 2, 94 - h - 3, 0.8)}<rect x="${x + 2}" y="${94 - h + 6}" width="3" height="${h - 12}" rx="1.5" fill="#fff" opacity=".25"/>`;
    return `${shadow(42)}${p(26, 20, 42, lt(c, 0.12))}${p(76, 18, 30, dk(c, 0.06))}${p(48, 24, 58, c)}
      <rect x="48" y="70" width="24" height="7" fill="${a}"/><circle cx="60" cy="73.5" r="2.4" fill="${dk(a, 0.2)}"/>`;
  },

  // 擴香瓶
  g3_diffuser: (u, c, a) => `<defs>${hg(u + 'x', lt(c, 0.3), dk(c, 0.12))}</defs>${shadow(30)}
    <g stroke="#c9a26b" stroke-width="2" stroke-linecap="round"><path d="M57 50 L38 12"/><path d="M59 50 L50 8"/><path d="M60 50 L64 6"/><path d="M61 50 L76 10"/><path d="M62 50 L86 18"/></g>
    <path d="M40 66 q0 -10 12 -13 v-5 h16 v5 q12 3 12 13 v22 q0 6 -6 6 h-28 q-6 0 -6 -6 z" fill="url(#${u}x)" opacity=".92"/>
    <path d="M42 70 h36 v18 q0 4 -4 4 h-28 q-4 0 -4 -4 z" fill="${dk(c, 0.18)}" opacity=".45"/>
    <rect x="51" y="44" width="18" height="7" rx="2" fill="${a}"/>
    <rect x="47" y="70" width="26" height="14" rx="2" fill="#fffaf0" opacity=".92"/><rect x="51" y="75" width="18" height="2" rx="1" fill="${a}"/><rect x="54" y="79" width="12" height="1.6" rx=".8" fill="${lt(a, 0.3)}"/>
    ${shine('M44 62 h3 v26 h-3 z', 0.45)}`,

  // 手拉坯馬克杯
  g3_mug: (u, c, a) => `<defs>${hg(u + 'x', lt(c, 0.15), dk(c, 0.15))}</defs>${shadow(32)}
    <path d="M80 50 q17 2 15 17 q-2 13 -15 12" fill="none" stroke="${dk(c, 0.05)}" stroke-width="6.5" stroke-linecap="round"/>
    <path d="M36 40 h44 v44 q0 10 -10 10 h-24 q-10 0 -10 -10 z" fill="url(#${u}x)"/>
    <path d="M36 74 q5 7 10 0 q5 9 11 0 q5 6 10 0 q5 8 10 0 q3 3 3 3 v7 q0 10 -10 10 h-24 q-10 0 -10 -10 z" fill="${a}"/>
    ${[50, 58, 66].map(y => `<path d="M36 ${y} q22 3 44 0" stroke="${dk(c, 0.2)}" stroke-width=".9" fill="none" opacity=".5"/>`).join('')}
    <ellipse cx="58" cy="40" rx="22" ry="5" fill="${lt(c, 0.2)}"/><ellipse cx="58" cy="40.5" rx="18.5" ry="3.6" fill="${dk(c, 0.3)}"/>
    ${[[42, 86], [52, 89], [66, 87], [73, 84]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".9" fill="${dk(a, 0.35)}"/>`).join('')}
    ${shine('M40 46 h4 v30 h-4 z', 0.3)}`,

  // 灰釉餐盤
  g3_plate: (u, c, a) => `<defs><radialGradient id="${u}x" cx=".4" cy=".35"><stop offset="0" stop-color="${lt(c, 0.25)}"/><stop offset="1" stop-color="${dk(c, 0.12)}"/></radialGradient></defs>${shadow(46)}
    <circle cx="74" cy="46" r="28" fill="url(#${u}x)"/>
    <circle cx="74" cy="46" r="27" fill="none" stroke="${a}" stroke-width="2"/>
    <circle cx="74" cy="46" r="18" fill="none" stroke="${dk(c, 0.15)}" stroke-width="1" opacity=".6"/>
    <ellipse cx="54" cy="78" rx="44" ry="16" fill="${dk(c, 0.1)}"/>
    <ellipse cx="54" cy="76" rx="44" ry="15" fill="url(#${u}x)"/>
    <ellipse cx="54" cy="76" rx="44" ry="15" fill="none" stroke="${a}" stroke-width="2"/>
    <ellipse cx="54" cy="77" rx="30" ry="9" fill="${lt(c, 0.12)}" stroke="${dk(c, 0.12)}" stroke-width=".8"/>
    ${[[34, 72], [60, 70], [70, 82], [44, 84], [76, 74]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1" fill="${dk(c, 0.45)}" opacity=".5"/>`).join('')}
    <path d="M30 70 q14 -6 34 -6" stroke="#fff" stroke-width="2" opacity=".35" fill="none"/>`,

  // 柴燒花器
  g3_vase: (u, c, a) => `<defs>${hg(u + 'x', lt(c, 0.18), dk(c, 0.25))}</defs>${shadow(30)}
    <path d="M60 30 q-4 -14 -12 -20" stroke="#6b5a3a" stroke-width="1.6" fill="none"/>${leaf(52, 16, -140, '#7d9a5b', 0.8)}<circle cx="47" cy="10" r="3.6" fill="${a}"/>
    <path d="M60 30 q6 -12 16 -14" stroke="#6b5a3a" stroke-width="1.4" fill="none"/><circle cx="77" cy="15" r="3" fill="${lt(a, 0.3)}"/>
    <path d="M52 24 h16 v8 q0 6 6 10 q14 10 14 28 q0 18 -14 24 q-14 4 -28 0 q-14 -6 -14 -24 q0 -18 14 -28 q6 -4 6 -10 z" fill="url(#${u}x)"/>
    <ellipse cx="60" cy="24" rx="8" ry="2.4" fill="${dk(c, 0.4)}"/>
    <path d="M42 52 q18 -6 36 0 l-2 6 q-3 10 -4 2 q-2 12 -5 1 q-3 9 -6 0 q-3 10 -5 0 q-3 8 -6 -2 q-4 6 -6 -2 z" fill="${a}" opacity=".85"/>
    <ellipse cx="72" cy="78" rx="8" ry="10" fill="${dk(c, 0.35)}" opacity=".35"/>
    ${shine('M42 60 q2 -6 6 -10 v34 q-6 -6 -6 -14 z', 0.25)}`,

  // 飯碗兩入
  g3_ricebowl: (u, c, a) => {
    const b = (x, y, s, col) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-24 0 h48 q-2 26 -24 28 q-22 -2 -24 -28 z" fill="url(#${u}x)"/><path d="M-24 0 h48 q-2 26 -24 28 q-22 -2 -24 -28 z" fill="${col}" opacity=".35"/><rect x="-9" y="26" width="18" height="5" rx="1.5" fill="${dk(col, 0.25)}"/><ellipse cx="0" cy="0" rx="24" ry="5.5" fill="${lt(col, 0.4)}"/><ellipse cx="0" cy=".5" rx="20" ry="4" fill="${dk(col, 0.15)}"/><path d="M-16 12 q8 -6 14 2 q6 6 14 -2" stroke="${a}" stroke-width="3.2" fill="none" stroke-linecap="round"/></g>`;
    return `<defs>${hg(u + 'x', lt(c, 0.2), dk(c, 0.15))}</defs>${shadow(44)}${b(78, 50, 0.9, lt(c, 0.1))}${b(44, 60, 1.05, c)}`;
  },

  // 拉坯轆轤（體驗課）
  g3_wheel: (u, c, a) => `<defs>${hg(u + 'x', lt(c, 0.2), dk(c, 0.2))}${vg(u + 'y', '#c4c8cc', '#7d838a')}</defs>${shadow(44)}
    <path d="M18 78 q42 16 84 0 v8 q-42 16 -84 0 z" fill="${a}"/>
    <ellipse cx="60" cy="78" rx="42" ry="10" fill="${lt(a, 0.25)}"/>
    <ellipse cx="60" cy="74" rx="30" ry="7" fill="url(#${u}y)"/><ellipse cx="60" cy="72" rx="30" ry="7" fill="#d7dbdf"/>
    <path d="M44 72 q-6 -22 4 -36 h24 q10 14 4 36 q-16 6 -32 0z" fill="url(#${u}x)"/>
    <ellipse cx="60" cy="36" rx="12" ry="3.4" fill="${lt(c, 0.25)}"/><ellipse cx="60" cy="36.4" rx="9" ry="2.3" fill="${dk(c, 0.3)}"/>
    ${[46, 54, 62].map(y => `<path d="M${46 - (y - 46) * 0.1} ${y} q14 4 28 0" stroke="${dk(c, 0.2)}" stroke-width="1" fill="none" opacity=".55"/>`).join('')}
    <path d="M48 40 q-4 10 0 26" stroke="#fff" stroke-width="2.4" opacity=".35" fill="none"/>
    <circle cx="96" cy="60" r="2" fill="${lt(c, 0.2)}"/><circle cx="24" cy="62" r="1.6" fill="${lt(c, 0.2)}"/>`,

  // 素銀戒指
  g3_ring: (u, c, a) => `<defs>${metal(u + 'x', c)}</defs>${shadow(32)}
    <path fill-rule="evenodd" fill="url(#${u}x)" d="M28 66 a32 24 0 1 0 64 0 a32 24 0 1 0 -64 0 Z M35 62 a25 17 0 1 0 50 0 a25 17 0 1 0 -50 0 Z"/>
    <path d="M35 62 a25 17 0 0 1 50 0" fill="none" stroke="${dk(c, 0.35)}" stroke-width="1.4" opacity=".6"/>
    ${[[36, 76], [48, 86], [64, 88], [80, 80], [88, 66], [32, 64]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2.6" ry="1.4" fill="#fff" opacity=".45"/>`).join('')}
    <path d="M52 44 l8 -10 l8 10 z" fill="${dk(c, 0.15)}"/>
    <circle cx="60" cy="38" r="7" fill="${a}"/><circle cx="57.5" cy="35.5" r="2.4" fill="#fff" opacity=".7"/>
    ${spark(92, 34, 0.9)}${spark(26, 44, 0.6)}`,

  // 月亮項鍊
  g3_necklace: (u, c, a) => `<defs>${metal(u + 'x', c)}</defs>${shadow(26)}
    <rect x="26" y="14" width="68" height="80" rx="6" fill="${a}"/><rect x="29" y="17" width="62" height="74" rx="4" fill="none" stroke="${lt(a, 0.3)}" stroke-width=".8"/>
    <path d="M30 18 q32 74 64 0" transform="translate(-1 0)" fill="none" stroke="${dk(c, 0.1)}" stroke-width="2.4" stroke-dasharray="2.6 1.6" stroke-linecap="round"/>
    <circle cx="62" cy="57" r="3" fill="none" stroke="url(#${u}x)" stroke-width="2"/>
    <path fill="url(#${u}x)" d="M62 60 A18 18 0 1 0 62 96 A10 18 0 0 1 62 60 Z"/><path d="M62 60 A18 18 0 1 0 62 96" fill="none" stroke="${dk(c, 0.3)}" stroke-width=".8" opacity=".5"/>
    <circle cx="60" cy="78" r="3.2" fill="#9fb7d6"/><circle cx="59" cy="77" r="1" fill="#fff" opacity=".7"/>
    ${spark(78, 64, 0.7)}${spark(40, 40, 0.5, c)}`,

  // 耳環（卡片）
  g3_earring: (u, c, a) => `<defs>${metal(u + 'x', c)}</defs>${shadow(30)}
    <rect x="30" y="18" width="60" height="76" rx="6" fill="${lt(a, 0.7)}"/>
    <circle cx="60" cy="25" r="2.6" fill="${lt(a, 0.35)}"/>
    ${[44, 76].map(x => `<circle cx="${x}" cy="40" r="4" fill="url(#${u}x)"/><circle cx="${x}" cy="60" r="14" fill="none" stroke="url(#${u}x)" stroke-width="3.2"/><path d="M${x} 74 v6" stroke="${c}" stroke-width="1.4"/><ellipse cx="${x}" cy="84" rx="4" ry="5" fill="${a}"/><circle cx="${x - 1.4}" cy="82.4" r="1.2" fill="#fff" opacity=".8"/>`).join('')}
    ${spark(88, 30, 0.7)}`,

  // 敲紋手環
  g3_bangle: (u, c, a) => `<defs>${metal(u + 'x', c)}</defs>${shadow(42)}
    <path d="M30 72 A34 20 0 1 0 46 52" fill="none" stroke="${dk(c, 0.25)}" stroke-width="10" stroke-linecap="round"/>
    <path d="M30 70 A34 20 0 1 0 46 50" fill="none" stroke="url(#${u}x)" stroke-width="9" stroke-linecap="round"/>
    ${[[40, 86], [56, 90], [72, 89], [86, 82], [94, 70], [88, 56], [74, 50]].map(([x, y]) => `<ellipse cx="${x}" cy="${y - 2}" rx="2.4" ry="1.3" fill="#fff" opacity=".55"/>`).join('')}
    <circle cx="30" cy="70" r="5" fill="${a}"/><circle cx="46" cy="50" r="5" fill="${a}"/>
    ${spark(26, 36, 0.8)}${spark(98, 36, 0.6)}`,

  // 胡桃木砧板
  g3_board: (u, c, a) => `<defs>${vg(u + 'x', lt(c, 0.12), dk(c, 0.12))}</defs>${shadow(46)}
    <g transform="rotate(-10 60 66)">
      <rect x="16" y="52" width="70" height="42" rx="8" fill="${dk(c, 0.35)}"/>
      <rect x="84" y="64" width="22" height="16" rx="8" fill="${dk(c, 0.35)}"/>
      <rect x="16" y="48" width="70" height="42" rx="8" fill="url(#${u}x)"/>
      <rect x="82" y="60" width="24" height="16" rx="8" fill="url(#${u}x)"/>
      <circle cx="98" cy="68" r="3" fill="${dk(c, 0.45)}"/>
      ${[56, 64, 72, 80].map((y, i) => `<path d="M20 ${y} q16 ${i % 2 ? 4 : -4} 32 0 t32 0" stroke="${dk(c, 0.22)}" stroke-width="1" fill="none" opacity=".55"/>`).join('')}
      <ellipse cx="40" cy="68" rx="5" ry="3" fill="none" stroke="${dk(c, 0.25)}" stroke-width="1" opacity=".6"/>
      ${shine('M20 51 h60 v2.6 h-60 z', 0.3)}
    </g>
    ${leaf(58, 58, -30, a, 1)}${leaf(60, 60, -80, lt(a, 0.15), 0.85)}`,

  // 橡木小板凳
  g3_stool: (u, c, a) => `<defs>${vg(u + 'x', lt(c, 0.12), dk(c, 0.15))}</defs>${shadow(40)}
    <path d="M48 50 L46 86 h5 L54 50 z M72 50 L74 86 h-5 L66 50 z" fill="${dk(c, 0.3)}"/>
    <path d="M38 52 L30 94 h7 L45 54 z M82 52 L90 94 h-7 L75 54 z" fill="url(#${u}x)"/>
    <rect x="35" y="74" width="50" height="5" rx="2" fill="${a}"/>
    <path d="M28 44 v6 q32 14 64 0 v-6" fill="${dk(c, 0.2)}"/>
    <ellipse cx="60" cy="44" rx="32" ry="10" fill="${lt(c, 0.18)}"/>
    ${[[-2, 0], [2, 4], [-1, 8]].map(([o, i]) => `<path d="M${36 + i} ${44 + o} q12 -5 24 0 t24 0" stroke="${dk(c, 0.15)}" stroke-width=".9" fill="none" opacity=".6"/>`).join('')}
    ${shine('M34 41 q14 -6 30 -6 v2 q-16 0 -30 6 z', 0.35)}`,

  // 壁掛層架
  g3_shelf: (u, c, a) => `<defs>${vg(u + 'x', lt(c, 0.15), dk(c, 0.1))}</defs>${shadow(40, 100)}
    <rect x="26" y="24" width="68" height="70" rx="2" fill="#000" opacity=".05"/>
    <rect x="20" y="70" width="10" height="20" rx="1.5" fill="${dk(c, 0.3)}"/><rect x="90" y="70" width="10" height="20" rx="1.5" fill="${dk(c, 0.3)}"/>
    <rect x="20" y="36" width="10" height="20" rx="1.5" fill="${dk(c, 0.3)}"/><rect x="90" y="36" width="10" height="20" rx="1.5" fill="${dk(c, 0.3)}"/>
    <rect x="14" y="62" width="92" height="8" rx="2" fill="url(#${u}x)"/><rect x="14" y="28" width="92" height="8" rx="2" fill="url(#${u}x)"/>
    <rect x="30" y="8" width="7" height="20" rx="1" fill="${a}"/><rect x="38" y="11" width="6" height="17" rx="1" fill="${lt(a, 0.4)}"/><rect x="45" y="9" width="7" height="19" rx="1" transform="rotate(8 48 28)" fill="${dk(c, 0.2)}"/>
    <path d="M72 28 h14 l-2 -12 h-10 z" fill="#d9c3a6"/>${leaf(79, 16, -120, '#6f9a5a', 0.9)}${leaf(79, 16, -60, '#7fae68', 0.9)}
    <path d="M38 62 h20 l-2 -14 q-8 -4 -16 0 z" fill="${lt(a, 0.55)}" stroke="${dk(c, 0.2)}" stroke-width=".8"/>
    <circle cx="80" cy="54" r="8" fill="${a}"/><circle cx="80" cy="54" r="3" fill="${lt(a, 0.5)}"/>
    ${shine('M16 29 h88 v2 h-88 z', 0.4)}${shine('M16 63 h88 v2 h-88 z', 0.4)}`,

  // 手刻木湯匙
  g3_spoon: (u, c, a) => {
    const sp = (x, y, r, col, s = 1) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})"><path d="M-3 -10 q-2 24 -4 46 q4 5 7 5 q3 0 7 -5 q-2 -22 -4 -46 z" fill="${col}"/><ellipse cx="0" cy="-24" rx="12" ry="16" fill="${col}"/><ellipse cx="0" cy="-23" rx="8.5" ry="12" fill="${dk(col, 0.15)}"/><ellipse cx="-3" cy="-27" rx="2.5" ry="4" fill="#fff" opacity=".3"/><path d="M-2 0 q-1 14 -3 28" stroke="${lt(col, 0.3)}" stroke-width="1.2" fill="none"/></g>`;
    return `<defs></defs>${shadow(36)}${sp(46, 58, -22, lt(c, 0.15), 1)}${sp(74, 60, 20, c, 1.05)}
      <path d="M30 90 q6 -3 10 1 M84 92 q5 -4 10 0 M60 94 q4 -3 8 0" stroke="${lt(c, 0.25)}" stroke-width="2" fill="none" stroke-linecap="round"/>
      <rect x="54" y="84" width="18" height="6" rx="3" fill="${a}" transform="rotate(-6 63 87)"/>`;
  },

  // 亞麻襯衫
  g3_shirt: (u, c, a) => `<defs>${vg(u + 'x', lt(c, 0.1), dk(c, 0.12))}</defs>${shadow(36)}
    <path d="M40 22 L52 18 q8 6 16 0 L80 22 l20 14 l-8 18 l-10 -6 v46 q-22 6 -44 0 v-46 l-10 6 l-8 -18 z" fill="url(#${u}x)"/>
    <path d="M28 48 l-8 -12 M92 48 l8 -12" stroke="${dk(c, 0.2)}" stroke-width="2.4"/>
    <path d="M52 18 L60 32 L46 30 z M68 18 L60 32 L74 30 z" fill="${lt(c, 0.25)}" stroke="${dk(c, 0.15)}" stroke-width=".8"/>
    <path d="M60 32 v62" stroke="${dk(c, 0.18)}" stroke-width="1.2"/>
    ${[42, 54, 66, 78].map(y => `<circle cx="63" cy="${y}" r="1.8" fill="${a}"/>`).join('')}
    <rect x="42" y="44" width="11" height="12" rx="1.5" fill="none" stroke="${dk(c, 0.18)}" stroke-width="1"/>
    ${stitch('M40 90 q20 5 40 0', dk(c, 0.2))}
    ${shine('M42 40 h3 v48 h-3 z', 0.25)}`,

  // 棉麻洋裝（衣架）
  g3_dress: (u, c, a) => `<defs>${vg(u + 'x', lt(c, 0.1), dk(c, 0.15))}</defs>${shadow(36)}
    <path d="M60 22 v-5 q0 -4 4 -4 q4 0 4 4" fill="none" stroke="#8a6a4a" stroke-width="2"/>
    <path d="M60 22 L36 34 h48 z" fill="none" stroke="#8a6a4a" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M44 30 l2 8 q14 6 28 0 l2 -8 l6 4 l-6 22 l20 38 q-36 10 -72 0 l20 -38 l-6 -22 z" fill="url(#${u}x)"/>
    <path d="M46 38 q14 10 28 0" fill="none" stroke="${dk(c, 0.2)}" stroke-width="1.2"/>
    <rect x="40" y="54" width="40" height="5" rx="2" fill="${a}"/>
    ${[[44, 70], [62, 74], [78, 82], [36, 86], [54, 88], [70, 66]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="${lt(c, 0.5)}"/><circle cx="${x}" cy="${y}" r=".8" fill="${a}"/>`).join('')}
    ${shine('M48 40 h3 v14 h-3 z', 0.3)}`,

  // 工作圍裙
  g3_apron: (u, c, a) => `<defs>${vg(u + 'x', lt(c, 0.1), dk(c, 0.15))}</defs>${shadow(36)}
    <path d="M46 32 q14 -26 28 0" fill="none" stroke="${dk(c, 0.25)}" stroke-width="3"/>
    <path d="M30 54 q-10 4 -14 14 M90 54 q10 4 14 14" stroke="${a}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M44 30 h32 l4 20 h10 l-4 44 q-26 6 -52 0 l-4 -44 h10 z" fill="url(#${u}x)"/>
    ${stitch('M47 34 h26 l3.6 18 h9.4 l-3.6 38', lt(c, 0.4))}${stitch('M47 34 l-3.6 18 h-9.4 l3.6 38', lt(c, 0.4))}
    <rect x="44" y="64" width="32" height="18" rx="2" fill="${a}"/>
    <path d="M60 64 v18" stroke="${dk(a, 0.25)}" stroke-width="1.2"/>
    ${stitch('M46 66 h28', lt(a, 0.4))}
    <path d="M66 62 v-12" stroke="#c9a26b" stroke-width="2.4" stroke-linecap="round"/><path d="M70 62 l4 -10" stroke="${dk(c, 0.4)}" stroke-width="2" stroke-linecap="round"/>`,

  // 剪刀＋線軸＋布尺（修改服務）
  g3_sewing: (u, c, a) => `<defs>${vg(u + 'x', lt(c, 0.12), dk(c, 0.15))}</defs>${shadow(44)}
    <ellipse cx="80" cy="82" rx="20" ry="9" fill="#e7c34a"/><ellipse cx="80" cy="80" rx="20" ry="9" fill="#f6d65c"/><ellipse cx="80" cy="80" rx="8" ry="3.6" fill="#d4ad2c"/>
    ${Array.from({ length: 9 }, (_, i) => `<path d="M${64 + i * 4} ${76 + Math.abs(4 - i) * 0.5} v3" stroke="#6b5216" stroke-width=".8"/>`).join('')}
    <rect x="22" y="38" width="28" height="7" rx="2" fill="#c99b62"/>
    <rect x="25" y="45" width="22" height="34" fill="url(#${u}x)"/>
    ${[50, 56, 62, 68, 74].map(y => `<path d="M25 ${y} h22" stroke="${dk(c, 0.2)}" stroke-width=".8" opacity=".5"/>`).join('')}
    <rect x="22" y="79" width="28" height="7" rx="2" fill="#c99b62"/>
    <path d="M47 60 q14 6 10 22" stroke="${c}" stroke-width="1.4" fill="none"/>
    <g transform="rotate(-35 76 46)"><path d="M70 16 L76 48 L82 16 z" fill="#d7dce1"/><path d="M76 16 L76 48" stroke="#9aa1a8"/><circle cx="76" cy="46" r="2.4" fill="#8d949e"/>
      <circle cx="68" cy="58" r="7" fill="none" stroke="${a}" stroke-width="3.6"/><circle cx="84" cy="58" r="7" fill="none" stroke="${a}" stroke-width="3.6"/>
      <path d="M72 52 L76 47 L80 52" stroke="${a}" stroke-width="3" fill="none"/></g>`,

  // 藍染方巾
  g3_scarf: (u, c, a) => `<defs>${dg(u + 'x', lt(c, 0.12), dk(c, 0.2))}</defs>${shadow(44)}
    <path d="M60 36 L104 64 L60 92 L16 64 Z" fill="${dk(c, 0.3)}"/>
    <path d="M60 28 L104 58 L60 88 L16 58 Z" fill="url(#${u}x)"/>
    ${[[60, 44], [44, 56], [76, 56], [60, 70], [32, 58], [88, 58], [60, 58]].map(([x, y], i) => `<ellipse cx="${x}" cy="${y}" rx="${i === 6 ? 6 : 4.5}" ry="${i === 6 ? 4 : 3}" fill="none" stroke="#fff" stroke-width="1.6" stroke-dasharray="${i % 2 ? '2 1.6' : '0'}" opacity=".85"/>`).join('')}
    <path d="M38 44 L82 74 M82 44 L38 74" stroke="#fff" stroke-width=".9" opacity=".35"/>
    <path d="M60 28 L104 58" stroke="#fff" stroke-width="1.4" opacity=".3"/>
    <rect x="86" y="70" width="12" height="8" rx="1.5" fill="${a}" transform="rotate(-30 92 74)"/>`,

  // 藍染帆布包（漸層浸染）
  g3_dyebag: (u, c, a) => `<defs><linearGradient id="${u}x" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4efe4"/><stop offset=".38" stop-color="#f4efe4"/><stop offset=".55" stop-color="${lt(c, 0.45)}"/><stop offset="1" stop-color="${dk(c, 0.1)}"/></linearGradient></defs>${shadow(38)}
    <path d="M44 46 q0 -26 16 -26 q16 0 16 26" fill="none" stroke="${dk(c, 0.1)}" stroke-width="4.5"/>
    <rect x="28" y="44" width="64" height="50" rx="4" fill="url(#${u}x)"/>
    <path d="M28 66 q8 -3 16 0 t16 0 t16 0 t16 0" stroke="${lt(c, 0.3)}" stroke-width="2" fill="none" opacity=".7"/>
    ${[[40, 82], [60, 80], [80, 84], [50, 72], [72, 72]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="none" stroke="#fff" stroke-width="1.4" opacity=".75"/>`).join('')}
    <rect x="70" y="50" width="12" height="9" rx="1.5" fill="${a}"/>
    ${stitch('M31 47 h58', '#d4ccbb')}
    ${shine('M31 50 h4 v40 h-4 z', 0.3)}`,

  // 在家植染材料包
  g3_dyekit: (u, c, a) => `<defs>${hg(u + 'x', '#f6fafc', '#cfdbe2')}</defs>${shadow(44)}
    <rect x="18" y="66" width="44" height="26" rx="3" fill="#f6f1e6"/>
    <rect x="18" y="76" width="44" height="7" fill="${c}"/>
    <rect x="22" y="58" width="38" height="10" rx="3" fill="#ffffff" stroke="#e1dace"/>
    <circle cx="28" cy="56" r="5" fill="none" stroke="${a}" stroke-width="2.4"/><circle cx="36" cy="54" r="4" fill="none" stroke="${lt(a, 0.2)}" stroke-width="2"/>
    <rect x="64" y="40" width="34" height="52" rx="6" fill="url(#${u}x)" opacity=".95"/>
    <rect x="66" y="56" width="30" height="34" rx="4" fill="${c}"/>
    ${[[72, 64], [84, 70], [76, 80], [90, 62]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4" fill="${lt(c, 0.4)}"/>`).join('')}
    <rect x="62" y="32" width="38" height="10" rx="3" fill="${a}"/>
    ${leaf(66, 32, -140, '#5f8a4e', 1)}${leaf(70, 30, -100, '#7aa463', 0.9)}
    ${shine('M68 44 h3 v44 h-3 z', 0.5)}`,

  // 多肉小盆
  g3_succulent: (u, c, a) => `<defs>${vg(u + 'x', lt(a, 0.1), dk(a, 0.2))}</defs>${shadow(30)}
    ${rosette(60, 54, c, '#e88a8a', 1.15)}
    <rect x="36" y="62" width="48" height="9" rx="3" fill="${dk(a, 0.06)}"/>
    <path d="M39 71 h42 l-5 23 q-16 4 -32 0 z" fill="url(#${u}x)"/>
    <ellipse cx="60" cy="63" rx="21" ry="2.6" fill="#5b4632"/>
    ${[[50, 63], [66, 63.5], [58, 64]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="#e9e1d1"/>`).join('')}
    ${shine('M41 73 h4 l3 18 h-4 z', 0.25)}`,

  // 玻璃微景觀瓶
  g3_terrarium: (u, c, a) => `<defs><clipPath id="${u}x"><circle cx="60" cy="60" r="32"/></clipPath></defs>${shadow(34)}
    <circle cx="60" cy="60" r="34" fill="#eaf6f6" fill-opacity=".45"/>
    <g clip-path="url(#${u}x)">
      <rect x="20" y="72" width="80" height="30" fill="${a}"/>
      <path d="M20 78 q20 -4 40 0 t40 0" stroke="${lt(a, 0.35)}" stroke-width="3" fill="none"/>
      <path d="M20 86 q20 4 40 0 t40 0" stroke="${dk(a, 0.15)}" stroke-width="2" fill="none"/>
      ${[[38, 72], [46, 74], [78, 73], [84, 75]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="3.4" ry="2.4" fill="#e9e6df"/>`).join('')}
      ${rosette(58, 66, c, '#e88a8a', 0.62)}
      <path d="M78 72 v-12 q0 -4 3 -4 q3 0 3 4 v12z" fill="${dk(c, 0.15)}"/>
    </g>
    <circle cx="60" cy="60" r="34" fill="none" stroke="#bcd8da" stroke-width="2"/>
    <ellipse cx="60" cy="27" rx="13" ry="3.4" fill="#f4fbfb" stroke="#bcd8da" stroke-width="1.6"/>
    <path d="M36 44 q6 -12 18 -16" stroke="#fff" stroke-width="3" opacity=".7" fill="none" stroke-linecap="round"/>`,

  // 仙人掌
  g3_cactus: (u, c, a) => `<defs>${hg(u + 'x', lt(c, 0.15), dk(c, 0.15))}${vg(u + 'y', lt(a, 0.1), dk(a, 0.2))}</defs>${shadow(28)}
    <path d="M46 62 q-12 0 -12 -12 v-10 q0 -5 5 -5 q5 0 5 5 v10 h6" fill="url(#${u}x)"/>
    <path d="M74 54 q12 0 12 -12 v-6 q0 -5 -5 -5 q-5 0 -5 5 v6 h-6" fill="url(#${u}x)"/>
    <rect x="48" y="22" width="24" height="48" rx="12" fill="url(#${u}x)"/>
    ${[54, 60, 66].map(x => `<path d="M${x} 26 v40" stroke="${dk(c, 0.2)}" stroke-width="1" opacity=".6"/>`).join('')}
    ${[[52, 34], [64, 42], [56, 52], [68, 30], [38, 44], [82, 40]].map(([x, y]) => `<path d="M${x} ${y} l-2 -2 M${x} ${y} l2 -2" stroke="#f5f2e6" stroke-width=".9"/>`).join('')}
    <circle cx="60" cy="21" r="5" fill="#f28fb0"/><circle cx="60" cy="21" r="2" fill="#ffd27a"/>
    <rect x="38" y="68" width="44" height="8" rx="3" fill="${dk(a, 0.05)}"/>
    <path d="M41 76 h38 l-4 18 q-15 4 -30 0 z" fill="url(#${u}y)"/>`,

  // 多肉介質土袋
  g3_soil: (u, c, a) => `<defs>${vg(u + 'x', lt(c, 0.1), dk(c, 0.18))}</defs>${shadow(38)}
    <path d="M32 24 h56 l4 66 q-32 6 -64 0 z" fill="url(#${u}x)"/>
    <path d="M30 22 h60 v8 h-60 z" fill="${dk(c, 0.15)}"/>
    ${Array.from({ length: 12 }, (_, i) => `<path d="M${32 + i * 5} 22.5 v7" stroke="${dk(c, 0.3)}" stroke-width=".8"/>`).join('')}
    <rect x="40" y="42" width="40" height="34" rx="4" fill="#fffaf0"/>
    ${rosette(60, 58, a, '#e88a8a', 0.5)}
    <rect x="46" y="68" width="28" height="2.4" rx="1.2" fill="${a}"/>
    ${[[24, 94, '#7a5a3a'], [30, 96, '#e9e1d1'], [94, 95, '#9a7a52'], [88, 97, '#e9e1d1'], [20, 97, '#5b4632']].map(([x, y, col]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="${col}"/>`).join('')}
    ${shine('M36 32 h4 v52 h-4 z', 0.25)}`,
};

// ---- 共用 ----
const N = (zh, en, ja, vi, ms) => ({ zh, en, ja, vi, ms });
const P = (id, name, en, unit, price, cost, stock, desc, descEn, kind, color, accent) => ({ id, name, en, unit, price, cost, stock, desc, descEn, art: { kind, color, accent } });

// ---- 11 家業主 ----
export const BIZ = [
  // 1. 嬰幼兒用品
  {
    merchant: {
      id: 'baby', name: '小芽芽嬰幼兒選物', en: 'Little Sprout Baby Goods', type: 'baby', cat: 'retail',
      typeName: '嬰幼兒用品', owner: '芽媽', theme: 'baby', tagline: '溫柔好用，陪寶寶長大',
      products: [
        P('bb-onesie', '純棉包屁衣', 'Cotton Bodysuit', '1 件', 590, 220, 24, '柔軟純棉，肩開設計好穿脫。', 'Soft cotton with easy-on shoulder snaps.', 'g3_onesie', '#BFE3D6', '#F49A8A'),
        P('bb-bottle', '玻璃奶瓶 240ml', 'Glass Feeding Bottle 240ml', '1 支', 650, 280, 18, '耐熱玻璃，刻度清楚好清洗。', 'Heat-resistant glass, clear markings, easy to wash.', 'g3_babybottle', '#CFE6F5', '#F7C873'),
        P('bb-swaddle', '紗布包巾', 'Muslin Swaddle Blanket', '1 條', 780, 300, 20, '四層紗布，透氣柔軟。', 'Four-layer muslin, breathable and soft.', 'g3_blanket', '#F8D9C4', '#7FC3AE'),
        P('bb-rattle', '木製搖鈴', 'Wooden Rattle', '1 個', 420, 150, 22, '櫸木手握環，聲音清脆。', 'Beech wood ring with a gentle chime.', 'g3_rattle', '#F6C66B', '#7FC3AE'),
        P('bb-blocks', '布面軟積木 6 入', 'Soft Fabric Blocks ×6', '6 入', 880, 360, 12, '輕軟布面，邊角圓潤。', 'Light fabric blocks with rounded corners.', 'g3_blocks', '#F49A8A', '#7FB8E0'),
        P('baby-gift', '彌月禮盒', 'Newborn Gift Box', '1 盒', 1680, 760, 8, '包屁衣＋包巾＋搖鈴，附賀卡。', 'Bodysuit, swaddle and rattle with a card.', 'g3_giftbox', '#FFE7B3', '#F49A8A'),
      ],
    },
    theme: {
      id: 'baby', kind: 'base', name: N('奶油粉彩', 'Pastel Nursery', 'パステルナーサリー', 'Phấn màu dịu', 'Pastel Bayi'), deco: 'star', dark: false,
      vars: { cream: '#fffaf3', cream2: '#fdeee4', ink: '#2f3550', ink2: '#5d6380', ink3: '#9196ad', rose: '#f49a8a', g: '#5fb3a1', gl: '#9ad6c4', card: '#ffffff', deep: '#3b4a6b', deep2: '#56689a', heroA: '#ffe0d6', heroB: '#d8f1e8', heroC: '#fff1c4', btn: '#3b4a6b' },
      hero: { pal: ['#f49a8a', '#9ad6c4', '#ffe7b3', '#cfe6f5', '#f8d9c4', '#ffffff'], dots: ['#f49a8a', '#9ad6c4', '#ffe7b3', '#7fb8e0', '#ffffff'], sky: '#fff8ee', ground: '#f8dccd', point: '#ffd0c0' },
      style: { font: 'round', radius: 'pill', hero: 'center', grid: 'cards', button: 'pill', texture: 'dots' },
    },
    profile: {
      avatar: '芽', volume: 9, aiName: '小芽', region: '新竹市東區',
      staff: [
        { name: '芽媽', title: '負責人・選品（董事酬勞）', kind: 'owner', pay: 48000 },
        { name: '小晴', title: '包裝出貨・兼職', kind: 'part', pay: 15200, level: 15840, hours: 76, hourly: 200 },
      ],
      suppliers: [
        { item: '純棉衣物、紗布包巾', vendor: '綿綿織品（虛構）', base: 18000 },
        { item: '玻璃奶瓶、木製玩具', vendor: '童心批發（虛構）', base: 12000 },
        { item: '禮盒與包材', vendor: '好包裝材料行（虛構）', base: 3200 },
      ],
      fixed: { rent: 22000, utility: 3200, ads: 8000, depreciation: 1200, equip: '展示櫃與包裝台' },
      rd: [['選品開發', '新款彌月禮盒打樣', '自家採購', 2600, '電子發票', 10]],
      channels: { web: 0.36, line: 0.30, pos: 0.16, phone: 0.04, whatsapp: 0.02, zalo: 0.02, messenger: 0.10 },
      langs: { zh: 0.88, en: 0.07, ja: 0.05 },
    },
  },

  // 2. 戶外露營用品
  {
    merchant: {
      id: 'camping', name: '野森露營補給站', en: 'Wildgrove Camp Supply', type: 'camping', cat: 'retail',
      typeName: '戶外露營用品', owner: '阿森', theme: 'camping', tagline: '週末上山，裝備一次備齊',
      products: [
        P('cp-tent', '雙人輕量帳篷', 'Two-person Lightweight Tent', '1 頂', 4980, 2600, 6, '一人十分鐘搭好，附營釘。', 'Pitch it solo in ten minutes, stakes included.', 'g3_tent', '#4F7A4A', '#E2A93B'),
        P('cp-lamp', '復古 LED 營燈', 'Vintage LED Lantern', '1 盞', 1280, 560, 14, '三段亮度，USB 充電。', 'Three brightness levels, USB rechargeable.', 'g3_lantern', '#3E4A3A', '#F4B544'),
        P('cp-chair', '折疊月亮椅', 'Folding Moon Chair', '1 張', 1580, 720, 10, '收納後 1.2 公斤，好攜帶。', 'Packs down to 1.2 kg.', 'g3_campchair', '#B5652E', '#E8D3A2'),
        P('cp-mug', '琺瑯露營杯 350ml', 'Enamel Camp Mug 350ml', '1 個', 390, 140, 30, '山形圖案，可直火加熱。', 'Mountain print, safe on open flame.', 'g3_enamel', '#F2EEE3', '#2F5240'),
        P('cp-stove', '登山爐套鍋組', 'Camp Stove & Pot Set', '1 組', 1680, 880, 9, '爐頭加兩件鍋，收納一袋。', 'Burner plus two pots in one bag.', 'g3_stove', '#B8BEC4', '#E07B39'),
        P('cp-rent', '雙人裝備租借', 'Two-person Gear Rental', '1 晚', 1200, 300, 8, '帳篷、睡墊、營燈一次租。', 'Tent, sleeping pads and lantern for one night.', 'g3_tent', '#C08A3E', '#2F5240'),
      ],
    },
    theme: {
      id: 'camping', kind: 'base', name: N('營火森林', 'Campfire Forest', 'キャンプファイアの森', 'Rừng lửa trại', 'Hutan Unggun'), deco: 'star', dark: true,
      vars: { cream: '#1a2219', cream2: '#232f22', ink: '#f1ead6', ink2: '#cbc2a8', ink3: '#958e78', rose: '#e07b39', g: '#e2a93b', gl: '#9dbb5f', card: '#253224', deep: '#0e140d', deep2: '#2f3d20', heroA: '#2f4a30', heroB: '#4a3a1f', heroC: '#1e3340', btn: '#e2a93b', btnInk: '#1a1408' },
      hero: { pal: ['#4f7a4a', '#e2a93b', '#b5652e', '#e8d3a2', '#2f5240', '#f4b544'], dots: ['#f4b544', '#ffffff', '#e07b39', '#9dbb5f'], sky: '#ffd9a0', ground: '#2f4a30', point: '#ff9a40', dim: true },
      style: { font: 'condensed', radius: 'sharp', hero: 'poster', grid: 'tiles', button: 'block', texture: 'grain' },
    },
    profile: {
      avatar: '森', volume: 8, aiName: '小森', region: '台中市北屯區',
      staff: [
        { name: '阿森', title: '負責人・選品（董事酬勞）', kind: 'owner', pay: 50000 },
        { name: '阿凱', title: '倉儲與租借整備・全職', kind: 'full', pay: 31000, level: 31800 },
      ],
      suppliers: [
        { item: '帳篷、椅子、營燈', vendor: '山野戶外批發（虛構）', base: 42000 },
        { item: '琺瑯杯與炊具', vendor: '野營器材行（虛構）', base: 9800 },
        { item: '租借裝備清洗', vendor: '潔淨洗衣坊（虛構）', base: 3600 },
        { item: '大件宅配運費', vendor: '綠野物流（虛構）', base: 7200 },
      ],
      fixed: { rent: 28000, utility: 3800, ads: 12000, depreciation: 5500, equip: '租借用帳篷與倉儲貨架' },
      rd: [['選品測試', '新款輕量帳篷實地試搭', '自家採購', 5200, '電子發票', 14]],
      channels: { web: 0.42, line: 0.26, pos: 0.12, phone: 0.06, whatsapp: 0.03, zalo: 0.01, messenger: 0.10 },
      langs: { zh: 0.86, en: 0.10, ja: 0.04 },
    },
  },

  // 3. 眼鏡行
  {
    merchant: {
      id: 'eyewear', name: '透光眼鏡行', en: 'Lumen Optical', type: 'eyewear', cat: 'retail',
      typeName: '眼鏡行', owner: '阿光', theme: 'eyewear', tagline: '一副好框，看見日常',
      products: [
        P('ey-ti', '鈦金屬細框', 'Titanium Thin Frame', '1 副', 3680, 1500, 12, '輕量鈦材，長時間配戴不壓鼻。', 'Lightweight titanium, comfortable all day.', 'g3_glasses', '#8C8F94', '#C9A15A'),
        P('ey-round', '板材圓框', 'Acetate Round Frame', '1 副', 2880, 1100, 15, '玳瑁紋板材，復古圓框。', 'Tortoiseshell acetate, retro round shape.', 'g3_glasses', '#6B4A32', '#2A2A2A'),
        P('ey-sun', '偏光太陽眼鏡', 'Polarized Sunglasses', '1 副', 2480, 950, 14, 'UV400 鏡片，戶外開車都好用。', 'UV400 lenses, great for driving and outdoors.', 'g3_shades', '#2E3B44', '#1A1A1A'),
        P('ey-kids', '兒童彈性鏡框', 'Kids Flexible Frame', '1 副', 1680, 620, 10, '彈性材質不易折，多色可選。', 'Bendable and sturdy, several colours.', 'g3_glasses', '#E4572E', '#2E7DBF'),
        P('ey-exam', '驗光配鏡預約', 'Eye Test & Fitting Booking', '30 分鐘', 300, 60, 12, '預約驗光，配鏡時可全額折抵。', 'Book a refraction test, fully credited to your frames.', 'g3_eyechart', '#1A1A1A', '#E4572E'),
        P('ey-care', '鏡盒清潔組', 'Case & Cleaning Kit', '1 組', 290, 80, 40, '硬殼鏡盒、拭鏡布與清潔液。', 'Hard case, lens cloth and cleaning spray.', 'g3_eyecase', '#2A2A2A', '#E4572E'),
      ],
    },
    theme: {
      id: 'eyewear', kind: 'base', name: N('極簡黑白', 'Monochrome', 'モノクローム', 'Đen trắng tối giản', 'Monokrom'), deco: null, dark: false,
      vars: { cream: '#f7f7f5', cream2: '#ebebe8', ink: '#111111', ink2: '#4a4a4a', ink3: '#8a8a8a', rose: '#e4572e', g: '#111111', gl: '#555555', card: '#ffffff', deep: '#111111', deep2: '#2a2a2a', heroA: '#f0f0ee', heroB: '#e3e6ea', heroC: '#faf4ec', btn: '#111111' },
      hero: { pal: ['#111111', '#8c8f94', '#e4572e', '#ffffff', '#c9a15a', '#d6d8db'], dots: ['#111111', '#e4572e', '#ffffff', '#8c8f94'], sky: '#ffffff', ground: '#e3e3e0', point: '#ffffff' },
      style: { font: 'sans', radius: 'sharp', hero: 'minimal', grid: 'list', button: 'outline', texture: 'none' },
    },
    profile: {
      avatar: '光', volume: 7, aiName: '小光', region: '台北市大安區',
      staff: [
        { name: '阿光', title: '負責人・驗光師（董事酬勞）', kind: 'owner', pay: 62000 },
        { name: '小寧', title: '門市配鏡・全職', kind: 'full', pay: 34000, level: 34800 },
      ],
      suppliers: [
        { item: '鈦金屬與板材鏡框', vendor: '明框光學批發（虛構）', base: 36000 },
        { item: '光學鏡片', vendor: '清晰鏡片實業（虛構）', base: 22000 },
        { item: '鏡盒、拭鏡布、清潔液', vendor: '好包裝材料行（虛構）', base: 3800 },
      ],
      fixed: { rent: 42000, utility: 5200, ads: 9000, depreciation: 6800, equip: '電腦驗光機與磨片機' },
      rd: [['設計開發', '自有品牌鏡框打樣', '自家採購', 6800, '電子發票', 18], ['訓練費', '驗光配鏡進修課程', '視光學會（虛構）', 4500, '收據', 25]],
      channels: { web: 0.24, line: 0.30, pos: 0.32, phone: 0.08, whatsapp: 0.02, zalo: 0.01, messenger: 0.03 },
      langs: { zh: 0.80, en: 0.12, ja: 0.08 },
    },
  },

  // 4. 手工皂
  {
    merchant: {
      id: 'soap', name: '泡泡森林手工皂', en: 'Bubble Woods Soapery', type: 'soap', cat: 'craft',
      typeName: '手工皂', owner: '小泡', theme: 'soap', tagline: '冷製熟成，每塊靜置三十天',
      products: [
        P('sp-oat', '燕麥乳皂', 'Oat Milk Soap', '100g', 280, 90, 40, '燕麥與牛奶入皂，泡沫綿密。', 'Oats and milk, rich creamy lather.', 'g3_soap', '#F1E4C8', '#B89B5E'),
        P('sp-lav', '薰衣草冷製皂', 'Lavender Cold-process Soap', '100g', 320, 100, 36, '淡淡薰衣草香，洗感清爽。', 'A soft lavender scent, fresh feel.', 'g3_soap', '#C9B6E4', '#7B9A5E'),
        P('sp-char', '竹炭清爽皂', 'Bamboo Charcoal Soap', '100g', 300, 95, 32, '黑白漩渦紋，夏天最受歡迎。', 'Black-and-white swirl, a summer favourite.', 'g3_soap', '#5A5A5E', '#9AB07A'),
        P('sp-gift', '三入皂禮盒', 'Soap Gift Box ×3', '1 盒', 880, 300, 16, '任選三款，附手寫卡片。', 'Pick any three, with a handwritten card.', 'g3_giftbox', '#E9DFF2', '#8A74B0'),
        P('sp-dish', '木製瀝水皂盤', 'Wooden Draining Soap Dish', '1 個', 260, 80, 28, '條紋設計，讓皂保持乾爽。', 'Slatted design keeps soap dry.', 'g3_soapdish', '#F3C9D2', '#C49A68'),
        P('sp-class', '手工皂體驗課', 'Soap Making Workshop', '1 堂', 1200, 350, 8, '2 小時，做兩塊帶回家。', '2 hours, take home two bars.', 'voucher', '#8A74B0', '#E3909E'),
      ],
    },
    theme: {
      id: 'soap', kind: 'base', name: N('薰衣草泡泡', 'Lavender Suds', 'ラベンダーの泡', 'Bọt oải hương', 'Buih Lavender'), deco: 'petal', dark: false,
      vars: { cream: '#f9f6f1', cream2: '#efe8f2', ink: '#33293f', ink2: '#625870', ink3: '#9a92a6', rose: '#e3909e', g: '#8a74b0', gl: '#b7a6d6', card: '#fffdfb', deep: '#3a2f4a', deep2: '#4d5a3e', heroA: '#e9e0f4', heroB: '#e4efdc', heroC: '#fbe7e2', btn: '#6b5591' },
      hero: { pal: ['#c9b6e4', '#f1e4c8', '#f3c9d2', '#9ab07a', '#ffffff', '#8a74b0'], dots: ['#ffffff', '#c9b6e4', '#f3c9d2', '#9ab07a', '#ffffff'], sky: '#fbf6ff', ground: '#e4d6ee', point: '#e8c8ff' },
      style: { font: 'hand', radius: 'round', hero: 'split', grid: 'magazine', button: 'solid', texture: 'paper' },
    },
    profile: {
      avatar: '泡', volume: 5, aiName: '泡泡', region: '宜蘭縣羅東鎮',
      staff: [{ name: '小泡', title: '負責人・製皂師（董事酬勞）', kind: 'owner', pay: 42000 }],
      suppliers: [
        { item: '植物油脂與皂基原料', vendor: '自然油品行（虛構）', base: 9800 },
        { item: '精油與天然粉類', vendor: '香草原料社（虛構）', base: 5200 },
        { item: '包裝紙與禮盒', vendor: '好包裝材料行（虛構）', base: 2800 },
      ],
      fixed: { rent: 12000, utility: 2200, ads: 4500, depreciation: 900, equip: '晾皂架與攪拌器' },
      rd: [['新品試作', '季節限定皂配方試作', '自家採購', 1600, '電子發票', 7]],
      channels: { web: 0.38, line: 0.28, pos: 0.18, phone: 0.02, whatsapp: 0.03, zalo: 0.01, messenger: 0.10 },
      langs: { zh: 0.84, en: 0.08, ja: 0.08 },
    },
  },

  // 5. 香氛蠟燭
  {
    merchant: {
      id: 'candle', name: '微光香氛蠟燭', en: 'Glimmer Candle Studio', type: 'candle', cat: 'craft',
      typeName: '香氛蠟燭', owner: '微微', theme: 'candle', tagline: '點一盞光，給今晚的自己',
      products: [
        P('cd-jar', '大豆蠟罐裝蠟燭', 'Soy Wax Jar Candle', '200g', 680, 240, 20, '琥珀玻璃罐，可燃約 40 小時。', 'Amber glass jar, about 40 hours burn time.', 'g3_candle', '#B8752E', '#2E1F27'),
        P('cd-tin', '旅行鐵罐蠟燭', 'Travel Tin Candle', '80g', 380, 130, 30, '小巧好帶，三種香調可選。', 'Pocket size, three scents to choose.', 'g3_tin', '#C9A46A', '#6B3A4A'),
        P('cd-pillar', '造型柱狀蠟燭', 'Sculpted Pillar Candles', '1 組', 450, 150, 18, '三支高低組，擺著就好看。', 'A trio of heights, lovely even unlit.', 'g3_pillar', '#F3E3CF', '#B8752E'),
        P('cd-diff', '藤枝擴香瓶', 'Reed Diffuser', '100ml', 780, 280, 16, '無火擴香，香氣約可維持兩個月。', 'Flameless scent, lasts about two months.', 'g3_diffuser', '#D9A7A0', '#3A2A30'),
        P('cd-gift', '蠟燭禮盒', 'Candle Gift Set', '1 盒', 1280, 480, 10, '罐裝蠟燭＋燭芯剪＋火柴。', 'Jar candle, wick trimmer and matches.', 'g3_giftbox', '#3A2A30', '#E8B04B'),
        P('cd-class', '調香蠟燭體驗課', 'Scented Candle Workshop', '1 堂', 1500, 450, 8, '2.5 小時，調出自己的香味。', '2.5 hours to blend your own scent.', 'voucher', '#6B3A4A', '#E8B04B'),
      ],
    },
    theme: {
      id: 'candle', kind: 'base', name: N('燭光琥珀', 'Amber Candlelight', '琥珀のキャンドル', 'Ánh nến hổ phách', 'Cahaya Lilin Ambar'), deco: 'lantern', dark: true,
      vars: { cream: '#1e1418', cream2: '#2a1d23', ink: '#f7e9d7', ink2: '#d4c1aa', ink3: '#9c8a7a', rose: '#f0a24a', g: '#e8b04b', gl: '#f5cf7a', card: '#2c1f26', deep: '#120b0e', deep2: '#3d2530', heroA: '#4a2a2e', heroB: '#5a3a1e', heroC: '#2e2238', btn: '#e8b04b', btnInk: '#24160a' },
      hero: { pal: ['#e8b04b', '#b8752e', '#f3e3cf', '#6b3a4a', '#d9a7a0', '#ffcf7a'], dots: ['#ffcf7a', '#ffffff', '#f0a24a', '#d9a7a0'], sky: '#ffcf8a', ground: '#3d2530', point: '#ffb050', dim: true },
      style: { font: 'serif', radius: 'soft', hero: 'center', grid: 'magazine', button: 'outline', texture: 'none' },
    },
    profile: {
      avatar: '微', volume: 6, aiName: '小微', region: '台北市松山區',
      staff: [
        { name: '微微', title: '負責人・調香師（董事酬勞）', kind: 'owner', pay: 46000 },
        { name: '小禾', title: '包裝出貨・兼職', kind: 'part', pay: 12000, level: 12540, hours: 60, hourly: 200 },
      ],
      suppliers: [
        { item: '大豆蠟、棉芯', vendor: '光源蠟材行（虛構）', base: 11000 },
        { item: '香氛油', vendor: '香調原料社（虛構）', base: 8200 },
        { item: '玻璃罐、鐵罐與禮盒', vendor: '晶亮玻璃（虛構）', base: 5600 },
      ],
      fixed: { rent: 18000, utility: 2600, ads: 6500, depreciation: 1000, equip: '融蠟爐與工作台' },
      rd: [['新品試作', '秋冬限定香調試作', '自家採購', 2400, '電子發票', 11]],
      channels: { web: 0.40, line: 0.24, pos: 0.12, phone: 0.02, whatsapp: 0.04, zalo: 0.01, messenger: 0.17 },
      langs: { zh: 0.78, en: 0.12, ja: 0.10 },
    },
  },

  // 6. 陶藝工作室
  {
    merchant: {
      id: 'pottery', name: '土裡陶藝工作室', en: 'Tuli Clay Studio', type: 'pottery', cat: 'craft',
      typeName: '陶藝工作室', owner: '阿土', theme: 'pottery', tagline: '一團土，在手裡慢慢成形',
      products: [
        P('pt-mug', '手拉坯馬克杯', 'Wheel-thrown Mug', '1 個', 880, 280, 16, '每個釉色流動都不一樣。', 'Every glaze drip is one of a kind.', 'g3_mug', '#5E8C8A', '#D9B48F'),
        P('pt-plate', '灰釉餐盤 8 吋', 'Ash-glaze Plate 8"', '1 個', 980, 320, 12, '霧面灰釉，盛菜很有質感。', 'Matte ash glaze that makes food look great.', 'g3_plate', '#C9C2B2', '#8A5A3A'),
        P('pt-vase', '柴燒小花器', 'Wood-fired Bud Vase', '1 個', 1280, 420, 8, '柴窯落灰自然成釉。', 'Natural ash glaze from the wood kiln.', 'g3_vase', '#A0633E', '#C8B46A'),
        P('pt-bowl', '飯碗兩入組', 'Rice Bowl Pair', '2 個', 1180, 400, 10, '手感圓潤，一大一小。', 'Rounded and hand-held, one large one small.', 'g3_ricebowl', '#E8E1D3', '#3E5A7A'),
        P('pt-custom', '客製刻字杯', 'Custom Engraved Mug', '1 個', 1180, 380, 6, '杯底刻名字或日期，製作 21 天。', 'Name or date carved on the base, 21 days.', 'g3_mug', '#C7663F', '#E8D9C7'),
        P('pt-class', '手拉坯體驗課', 'Pottery Wheel Class', '1 堂', 1800, 500, 8, '2 小時，作品燒好後寄送。', '2 hours, your piece is fired and shipped.', 'g3_wheel', '#B87A55', '#6B7B6A'),
      ],
    },
    theme: {
      id: 'pottery', kind: 'base', name: N('陶土赤褐', 'Terracotta Clay', 'テラコッタ', 'Đất nung', 'Tanah Liat'), deco: null, dark: false,
      vars: { cream: '#f4ece2', cream2: '#e8d9c7', ink: '#33241b', ink2: '#664e3e', ink3: '#9b8370', rose: '#c7663f', g: '#a65a3a', gl: '#c98a5e', card: '#fbf6ef', deep: '#4a3226', deep2: '#3f4a40', heroA: '#ead2bd', heroB: '#dfe3d6', heroC: '#f1e0c6', btn: '#8a4a2e' },
      hero: { pal: ['#c7663f', '#5e8c8a', '#d9b48f', '#e8e1d3', '#a0633e', '#6b7b6a'], dots: ['#c7663f', '#e8d9c7', '#5e8c8a', '#ffffff'], sky: '#fff3e6', ground: '#c9a07a', point: '#ffc9a0' },
      style: { font: 'sans', radius: 'round', hero: 'poster', grid: 'tiles', button: 'solid', texture: 'grain' },
    },
    profile: {
      avatar: '土', volume: 4, aiName: '小土', region: '新北市鶯歌區',
      staff: [
        { name: '阿土', title: '負責人・陶藝師（董事酬勞）', kind: 'owner', pay: 45000 },
        { name: '小陶', title: '課程助教・兼職', kind: 'part', pay: 12800, level: 13500, hours: 64, hourly: 200 },
      ],
      suppliers: [
        { item: '陶土與釉料', vendor: '窯火陶材行（虛構）', base: 8600 },
        { item: '柴窯木柴與窯具', vendor: '山林木料（虛構）', base: 4200 },
        { item: '易碎品包材與運費', vendor: '綠野物流（虛構）', base: 3800 },
      ],
      fixed: { rent: 20000, utility: 6800, ads: 4000, depreciation: 3600, equip: '電窯與拉坯機' },
      rd: [['釉藥試驗', '新色系釉藥試燒', '自家採購', 2800, '電子發票', 16]],
      channels: { web: 0.32, line: 0.30, pos: 0.20, phone: 0.06, whatsapp: 0.03, zalo: 0.01, messenger: 0.08 },
      langs: { zh: 0.76, en: 0.10, ja: 0.14 },
    },
  },

  // 7. 銀飾金工
  {
    merchant: {
      id: 'silver', name: '月銀金工室', en: 'Moonsilver Metalsmith', type: 'silver', cat: 'craft',
      typeName: '銀飾金工', owner: '小月', theme: 'silver', tagline: '敲出只屬於你的光',
      products: [
        P('sv-ring', '敲紋素銀戒', 'Hammered Silver Ring', '1 只', 1680, 520, 14, '925 純銀，手敲紋路。', '925 silver with hand-hammered texture.', 'g3_ring', '#D7DCE2', '#9FB7D6'),
        P('sv-pair', '刻字對戒', 'Engraved Couple Rings', '1 對', 3980, 1300, 6, '內圈可刻字，製作 10 天。', 'Inner engraving, made in 10 days.', 'g3_ring', '#E3C98E', '#D7DCE2'),
        P('sv-moon', '月亮項鍊', 'Crescent Moon Necklace', '1 條', 2280, 700, 10, '彎月墜飾，鍊長可調。', 'Crescent pendant, adjustable chain.', 'g3_necklace', '#D7DCE2', '#3A4250'),
        P('sv-hoop', '小圓耳環', 'Mini Hoop Earrings', '1 對', 1280, 380, 16, '輕巧小圓圈，日常百搭。', 'Light little hoops for every day.', 'g3_earring', '#D7DCE2', '#C9A96E'),
        P('sv-cuff', '敲紋開口手環', 'Hammered Open Cuff', '1 只', 2480, 800, 8, '開口設計，尺寸可微調。', 'Open design, gently adjustable.', 'g3_bangle', '#D7DCE2', '#7C93B8'),
        P('sv-class', '一日銀戒課', 'One-day Silver Ring Class', '1 堂', 2200, 700, 6, '3 小時，做好當天帶走。', '3 hours, take your ring home the same day.', 'voucher', '#3A4250', '#C9A96E'),
      ],
    },
    theme: {
      id: 'silver', kind: 'base', name: N('月夜銀光', 'Moonlit Silver', '月夜のシルバー', 'Bạc ánh trăng', 'Perak Cahaya Bulan'), deco: 'sparkle', dark: true,
      vars: { cream: '#15171b', cream2: '#1f2329', ink: '#eef1f4', ink2: '#b5bcc5', ink3: '#7f8792', rose: '#c9a96e', g: '#c0c7d0', gl: '#e3e8ee', card: '#1d2127', deep: '#0a0b0e', deep2: '#2a2f37', heroA: '#2b3038', heroB: '#3a3f48', heroC: '#1f2a33', btn: '#d7dde4', btnInk: '#15171b' },
      hero: { pal: ['#d7dce2', '#c9a96e', '#9fb7d6', '#ffffff', '#7c93b8', '#e3c98e'], dots: ['#ffffff', '#d7dce2', '#c9a96e', '#9fb7d6'], sky: '#dfe8ff', ground: '#2a2f37', point: '#c8d8ff', dim: true },
      style: { font: 'mono', radius: 'sharp', hero: 'split', grid: 'magazine', button: 'outline', texture: 'lines' },
    },
    profile: {
      avatar: '月', volume: 4, aiName: '月月', region: '台南市東區',
      staff: [{ name: '小月', title: '負責人・金工師（董事酬勞）', kind: 'owner', pay: 48000 }],
      suppliers: [
        { item: '925 銀材與銀線', vendor: '亮銀貴金屬材料（虛構）', base: 16000 },
        { item: '天然石與配件', vendor: '石光飾品材料（虛構）', base: 4200 },
        { item: '飾品盒與拭銀布', vendor: '好包裝材料行（虛構）', base: 2400 },
      ],
      fixed: { rent: 16000, utility: 2800, ads: 5000, depreciation: 1800, equip: '焊槍與拋光機' },
      rd: [['設計開發', '新款月相系列打樣', '自家採購', 3200, '電子發票', 21]],
      channels: { web: 0.42, line: 0.26, pos: 0.10, phone: 0.02, whatsapp: 0.04, zalo: 0.01, messenger: 0.15 },
      langs: { zh: 0.80, en: 0.10, ja: 0.10 },
    },
  },

  // 8. 木工家具小物
  {
    merchant: {
      id: 'woodwork', name: '拾木木工所', en: 'Shimu Woodshop', type: 'woodwork', cat: 'craft',
      typeName: '木工家具小物', owner: '阿拾', theme: 'woodwork', tagline: '老木頭，新日子',
      products: [
        P('ww-board', '胡桃木砧板', 'Walnut Cutting Board', '1 塊', 1680, 650, 10, '整塊胡桃木，附食用級木蠟油。', 'Solid walnut, finished with food-safe oil.', 'g3_board', '#7A5236', '#7D9A5B'),
        P('ww-stool', '橡木小板凳', 'Oak Step Stool', '1 張', 2980, 1200, 5, '榫接結構，大人小孩都能坐。', 'Joinery-built, for grown-ups and kids.', 'g3_stool', '#C79A62', '#E3B23C'),
        P('ww-spoon', '手刻木湯匙', 'Hand-carved Wooden Spoon', '1 支', 380, 110, 30, '山櫻木手刻，每支形狀不同。', 'Carved cherry wood, each one unique.', 'g3_spoon', '#B07A45', '#E3B23C'),
        P('ww-tray', '實木小托盤', 'Solid Wood Serving Tray', '1 個', 980, 360, 12, '早餐、茶點都適合。', 'Perfect for breakfast and tea.', 'g3_board', '#D1A26B', '#E3B23C'),
        P('ww-shelf', '橡木壁掛層架', 'Oak Wall Shelf', '1 座', 1580, 600, 7, '附安裝五金，承重 5 公斤。', 'Hardware included, holds 5 kg.', 'g3_shelf', '#C79A62', '#E3B23C'),
        P('ww-class', '木湯匙手作課', 'Spoon Carving Class', '1 堂', 1500, 450, 8, '3 小時，刀具與木料全包。', '3 hours, tools and wood included.', 'voucher', '#B07A45', '#222222'),
      ],
    },
    theme: {
      id: 'woodwork', kind: 'base', name: N('橡木工坊', 'Oak Workshop', 'オークの工房', 'Xưởng gỗ sồi', 'Bengkel Kayu Oak'), deco: null, dark: false,
      vars: { cream: '#f6f1e7', cream2: '#ebe1cf', ink: '#222222', ink2: '#555048', ink3: '#8c857a', rose: '#e3b23c', g: '#b07a45', gl: '#d1a26b', card: '#fffcf5', deep: '#262626', deep2: '#3b3631', heroA: '#f0dfc2', heroB: '#e8e3d8', heroC: '#f6e7b8', btn: '#222222' },
      hero: { pal: ['#b07a45', '#d1a26b', '#7a5236', '#e3b23c', '#f0dfc2', '#3b3631'], dots: ['#e3b23c', '#d1a26b', '#ffffff', '#222222'], sky: '#fff8ea', ground: '#d1b48a', point: '#ffd890' },
      style: { font: 'condensed', radius: 'soft', hero: 'split', grid: 'list', button: 'block', texture: 'lines' },
    },
    profile: {
      avatar: '拾', volume: 3, aiName: '小拾', region: '苗栗縣三義鄉',
      staff: [{ name: '阿拾', title: '負責人・木工師傅（董事酬勞）', kind: 'owner', pay: 46000 }],
      suppliers: [
        { item: '胡桃木、橡木板材', vendor: '森材木業（虛構）', base: 18000 },
        { item: '木蠟油與砂紙耗材', vendor: '巧手五金（虛構）', base: 3200 },
        { item: '大件包材與運費', vendor: '綠野物流（虛構）', base: 4600 },
      ],
      fixed: { rent: 14000, utility: 4200, ads: 3500, depreciation: 4200, equip: '帶鋸機與集塵機' },
      rd: [['新品打樣', '可拆式小邊桌打樣', '自家採購', 3600, '電子發票', 9]],
      channels: { web: 0.38, line: 0.30, pos: 0.16, phone: 0.06, whatsapp: 0.02, zalo: 0.01, messenger: 0.07 },
      langs: { zh: 0.86, en: 0.06, ja: 0.08 },
    },
  },

  // 9. 手作服飾裁縫
  {
    merchant: {
      id: 'tailor', name: '縫事所手作服飾', en: 'Seam Story Tailoring', type: 'tailor', cat: 'craft',
      typeName: '手作服飾裁縫', owner: '阿縫', theme: 'tailor', tagline: '量身裁縫，穿得剛剛好',
      products: [
        P('tl-shirt', '亞麻襯衫', 'Linen Shirt', '1 件', 2680, 1000, 10, '透氣亞麻，可依身形調整。', 'Breathable linen, fitted to your shape.', 'g3_shirt', '#E9E1D2', '#7A2E3A'),
        P('tl-dress', '棉麻洋裝', 'Cotton-linen Dress', '1 件', 3280, 1250, 8, 'A 字裙襬，接單製作 14 天。', 'A-line skirt, made to order in 14 days.', 'g3_dress', '#7A2E3A', '#D4A24C'),
        P('tl-apron', '帆布工作圍裙', 'Canvas Work Apron', '1 件', 1280, 450, 14, '厚帆布，雙口袋。', 'Heavy canvas with two pockets.', 'g3_apron', '#4A5A6A', '#C49A68'),
        P('tl-alter', '衣褲修改', 'Clothing Alterations', '1 件', 300, 60, 20, '改褲長、收腰，約 5 天完成。', 'Hemming and taking in, about 5 days.', 'g3_sewing', '#7A2E3A', '#D4A24C'),
        P('tl-bespoke', '訂製襯衫', 'Made-to-measure Shirt', '1 件', 3800, 1500, 4, '到店量身，兩次試穿。', 'Measured in store, two fittings.', 'g3_shirt', '#3A3F4A', '#D4A24C'),
        P('tl-class', '縫紉入門課', 'Beginner Sewing Class', '1 堂', 1600, 450, 6, '3 小時，做一個束口袋。', '3 hours, sew your own drawstring bag.', 'voucher', '#7A2E3A', '#D4A24C'),
      ],
    },
    theme: {
      id: 'tailor', kind: 'base', name: N('酒紅裁縫', 'Burgundy Atelier', 'バーガンディの仕立屋', 'Xưởng may đỏ rượu', 'Atelier Merah Anggur'), deco: null, dark: false,
      vars: { cream: '#f7f2ee', cream2: '#ece2dc', ink: '#2d1f2b', ink2: '#5e4a57', ink3: '#968590', rose: '#d4a24c', g: '#7a2e3a', gl: '#a8505e', card: '#fffdfb', deep: '#3a1820', deep2: '#5a2a35', heroA: '#efdcd8', heroB: '#e7e2d4', heroC: '#f4e6cf', btn: '#7a2e3a' },
      hero: { pal: ['#7a2e3a', '#d4a24c', '#e9e1d2', '#4a5a6a', '#a8505e', '#ffffff'], dots: ['#d4a24c', '#7a2e3a', '#ffffff', '#e9e1d2'], sky: '#fff6f2', ground: '#e2c8c4', point: '#ffc8b8' },
      style: { font: 'serif', radius: 'sharp', hero: 'banner', grid: 'cards', button: 'block', texture: 'grid' },
    },
    profile: {
      avatar: '縫', volume: 5, aiName: '小縫', region: '高雄市新興區',
      staff: [
        { name: '阿縫', title: '負責人・裁縫師（董事酬勞）', kind: 'owner', pay: 45000 },
        { name: '小線', title: '縫製助理・兼職', kind: 'part', pay: 16000, level: 16500, hours: 80, hourly: 200 },
      ],
      suppliers: [
        { item: '亞麻、棉麻布料', vendor: '布莊織品行（虛構）', base: 14000 },
        { item: '鈕扣、拉鍊、縫線', vendor: '巧手五金（虛構）', base: 2600 },
        { item: '吊牌與包材', vendor: '好包裝材料行（虛構）', base: 1800 },
      ],
      fixed: { rent: 16000, utility: 3000, ads: 4000, depreciation: 1600, equip: '工業縫紉機與拷克機' },
      rd: [['版型開發', '秋冬外套新版型打版', '自家採購', 2200, '電子發票', 13]],
      channels: { web: 0.30, line: 0.36, pos: 0.18, phone: 0.06, whatsapp: 0.02, zalo: 0.01, messenger: 0.07 },
      langs: { zh: 0.90, en: 0.06, ja: 0.04 },
    },
  },

  // 10. 植物染布包
  {
    merchant: {
      id: 'indigo', name: '青藍植染', en: 'Aolan Natural Dye', type: 'indigo', cat: 'craft',
      typeName: '植物染布包', owner: '阿藍', theme: 'indigo', tagline: '一缸藍，染出山的顏色',
      products: [
        P('ig-scarf', '藍染方巾', 'Indigo Bandana', '1 條', 880, 300, 18, '綁染圓紋，每條花樣都不同。', 'Tie-dyed rings, every piece is unique.', 'g3_scarf', '#24407A', '#C8742E'),
        P('ig-tote', '浸染帆布包', 'Dip-dyed Canvas Tote', '1 個', 1480, 520, 12, '下半漸層藍，A4 可放。', 'Gradient indigo base, fits A4.', 'g3_dyebag', '#24407A', '#C49A68'),
        P('ig-pouch', '植染零錢包', 'Plant-dyed Coin Pouch', '1 個', 480, 160, 24, '薯榔染赭紅色，越用越柔。', 'Dyed russet with dye yam, softens with use.', 'pouch', '#9A4A32', '#24407A'),
        P('ig-tee', '藍染短袖襯衫', 'Indigo Short-sleeve Shirt', '1 件', 1680, 620, 10, '純棉布料，手染深淺藍。', 'Cotton, hand-dyed in layered blues.', 'g3_shirt', '#3A5A94', '#F3EEE2'),
        P('ig-kit', '在家植染材料包', 'Home Dye Kit', '1 組', 680, 250, 20, '染料、手帕與橡皮筋，附教學。', 'Dye, handkerchief and bands with a guide.', 'g3_dyekit', '#24407A', '#C8742E'),
        P('ig-class', '藍染體驗課', 'Indigo Dyeing Workshop', '1 堂', 1200, 380, 10, '2 小時，染一條方巾帶回家。', '2 hours, take home your own bandana.', 'g3_scarf', '#3A5A94', '#F3EEE2'),
      ],
    },
    theme: {
      id: 'indigo', kind: 'base', name: N('藍染手作', 'Indigo Dye', '藍染め', 'Nhuộm chàm', 'Celup Nila'), deco: null, dark: false,
      vars: { cream: '#f2f4f7', cream2: '#dfe5ee', ink: '#14213d', ink2: '#44506b', ink3: '#7f8aa0', rose: '#c8742e', g: '#24407a', gl: '#4a6fb0', card: '#ffffff', deep: '#0f1d3d', deep2: '#1e3466', heroA: '#c9d6ea', heroB: '#eef2f8', heroC: '#f5e2c9', btn: '#24407a' },
      hero: { pal: ['#24407a', '#4a6fb0', '#c8742e', '#f3eee2', '#9a4a32', '#9fb5d8'], dots: ['#ffffff', '#4a6fb0', '#c8742e', '#9fb5d8'], sky: '#f4f8ff', ground: '#9fb5d8', point: '#c8dcff' },
      style: { font: 'hand', radius: 'soft', hero: 'banner', grid: 'list', button: 'pill', texture: 'paper' },
    },
    profile: {
      avatar: '藍', volume: 4, aiName: '小藍', region: '新北市三峽區',
      staff: [{ name: '阿藍', title: '負責人・染布師（董事酬勞）', kind: 'owner', pay: 42000 }],
      suppliers: [
        { item: '藍靛泥與植物染料', vendor: '山藍染料坊（虛構）', base: 6800 },
        { item: '棉布、帆布胚布', vendor: '布莊織品行（虛構）', base: 7600 },
        { item: '包材與運費', vendor: '綠野物流（虛構）', base: 2600 },
      ],
      fixed: { rent: 13000, utility: 3200, ads: 3500, depreciation: 1200, equip: '染缸與晾布架' },
      rd: [['新品試作', '茜草紅系新色試染', '自家採購', 1800, '電子發票', 5]],
      channels: { web: 0.34, line: 0.28, pos: 0.20, phone: 0.04, whatsapp: 0.04, zalo: 0.01, messenger: 0.09 },
      langs: { zh: 0.74, en: 0.12, ja: 0.14 },
    },
  },

  // 11. 多肉植栽
  {
    merchant: {
      id: 'succulent', name: '肉肉植栽室', en: 'Chubby Succulent Room', type: 'succulent', cat: 'flower',
      typeName: '多肉植栽', owner: '肉肉', theme: 'succulent', tagline: '懶人也養得活的小綠',
      products: [
        P('sc-mini', '多肉小盆', 'Mini Succulent Pot', '1 盆', 220, 70, 40, '兩週澆一次水，新手也好養。', 'Water every two weeks, beginner-friendly.', 'g3_succulent', '#8DBF9F', '#E8E1D6'),
        P('sc-trio', '三入組合盆', 'Succulent Trio Planter', '1 組', 580, 200, 20, '三種多肉合植，送禮剛好。', 'Three succulents together, a perfect gift.', 'g3_succulent', '#A6B8D8', '#C9845B'),
        P('sc-terr', '玻璃微景觀瓶', 'Glass Terrarium', '1 個', 980, 360, 12, '彩砂分層，擺在桌上很療癒。', 'Layered sand, a calming desk piece.', 'g3_terrarium', '#7FB08E', '#E8D2A6'),
        P('sc-cactus', '小仙人掌', 'Little Cactus', '1 盆', 280, 90, 30, '陽台窗邊都適合。', 'Happy on a balcony or windowsill.', 'g3_cactus', '#5E9A6A', '#D98A6A'),
        P('sc-soil', '多肉專用介質', 'Succulent Potting Mix', '2 公升', 180, 60, 36, '排水透氣，換盆必備。', 'Fast draining and airy, for repotting.', 'g3_soil', '#B89A72', '#7FB08E'),
        P('sc-class', '組盆手作課', 'Succulent Planter Workshop', '1 堂', 880, 300, 10, '90 分鐘，帶走自己的組盆。', '90 minutes, take home your own planter.', 'voucher', '#5E9A6A', '#F08A6C'),
      ],
    },
    theme: {
      id: 'succulent', kind: 'base', name: N('多肉綠洲', 'Succulent Oasis', '多肉のオアシス', 'Ốc đảo sen đá', 'Oasis Sukulen'), deco: 'leaf', dark: false,
      vars: { cream: '#f4f7f1', cream2: '#e2ebdc', ink: '#1f2f2a', ink2: '#4b5f57', ink3: '#83958c', rose: '#f08a6c', g: '#4f8a72', gl: '#8dbf9f', card: '#ffffff', deep: '#23423a', deep2: '#3a5a4a', heroA: '#dbeee0', heroB: '#fbe3d6', heroC: '#eef3d2', btn: '#2f5e4e' },
      hero: { pal: ['#8dbf9f', '#a6b8d8', '#f08a6c', '#e8d2a6', '#5e9a6a', '#ffffff'], dots: ['#8dbf9f', '#f08a6c', '#ffffff', '#e8d2a6'], sky: '#f8fff4', ground: '#cfe3c8', point: '#ffd8b0' },
      style: { font: 'round', radius: 'round', hero: 'minimal', grid: 'tiles', button: 'solid', texture: 'dots' },
    },
    profile: {
      avatar: '肉', volume: 8, aiName: '小肉', region: '彰化縣田尾鄉',
      staff: [
        { name: '肉肉', title: '負責人・植栽師（董事酬勞）', kind: 'owner', pay: 42000 },
        { name: '阿青', title: '溫室照顧與出貨・兼職', kind: 'part', pay: 14400, level: 14700, hours: 72, hourly: 200 },
      ],
      suppliers: [
        { item: '多肉、仙人掌苗', vendor: '綠意苗圃（虛構）', base: 9600 },
        { item: '盆器與玻璃瓶', vendor: '器皿批發社（虛構）', base: 5200 },
        { item: '介質、彩砂與石頭', vendor: '園藝資材行（虛構）', base: 2800 },
        { item: '植栽宅配運費', vendor: '綠野物流（虛構）', base: 4200 },
      ],
      fixed: { rent: 12000, utility: 2600, ads: 4500, depreciation: 1500, equip: '溫室遮光網與植物燈' },
      rd: [['新品試作', '迷你景觀瓶新款試作', '自家採購', 1500, '電子發票', 19]],
      channels: { web: 0.36, line: 0.32, pos: 0.18, phone: 0.04, whatsapp: 0.02, zalo: 0.01, messenger: 0.07 },
      langs: { zh: 0.90, en: 0.05, ja: 0.05 },
    },
  },
];
