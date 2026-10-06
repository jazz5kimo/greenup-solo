// 第 1 組：餐飲與飲品 11 種業態（全部為虛構示範業主）
// bento 家常便當、brunch 早午餐、luwei 滷味攤、dumpling 手工水餃、ramen 拉麵、chef 私廚外燴、
// bubbletea 手搖茶飲、teahouse 茶行、craftbeer 精釀啤酒、juice 冷壓果汁、veggiebox 小農蔬果箱

const N = (zh, en, ja, vi, ms) => ({ zh, en, ja, vi, ms });

// ---- 色彩與插圖小工具（本檔自用）----
const toRgb = (h) => { h = String(h || '#999').replace('#', ''); if (h.length === 3) h = h.split('').map(x => x + x).join(''); const n = parseInt(h, 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = (r, g, b) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (x, y, t) => { const p = toRgb(x), q = toRgb(y); return toHex(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t); };
const dk = (c, t = 0.25) => mix(c, '#000000', t);
const lt = (c, t = 0.35) => mix(c, '#ffffff', t);
const vgrad = (id, x, y) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${x}"/><stop offset="1" stop-color="${y}"/></linearGradient>`;
const hgrad = (id, x, y) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${x}"/><stop offset="1" stop-color="${y}"/></linearGradient>`;
const rgrad = (id, x, y, cx = 0.4, cy = 0.35) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r=".75"><stop offset="0" stop-color="${x}"/><stop offset="1" stop-color="${y}"/></radialGradient>`;
const shadow = (rx = 36, cy = 98) => `<ellipse cx="60" cy="${cy}" rx="${rx}" ry="${Math.max(4, rx / 6).toFixed(1)}" fill="rgba(0,0,0,.16)"/>`;
const shine = (d, o = 0.22) => `<path d="${d}" fill="#fff" opacity="${o}"/>`;
const steam = (x = 60, y = 30, c = '#ffffff') => `<g fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round" opacity=".7"><path d="M${x - 8} ${y} q-4 -6 0 -11 q4 -5 0 -10"/><path d="M${x} ${y - 2} q-4 -6 0 -11 q4 -5 0 -10"/><path d="M${x + 8} ${y} q-4 -6 0 -11 q4 -5 0 -10"/></g>`;
const leaf = (x, y, r, c, s = 1) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})"><path d="M0 0 q8 -10 18 0 q-10 9 -18 0z" fill="${c}"/><path d="M1 0 h15" stroke="${dk(c, 0.3)}" stroke-width=".8"/></g>`;
const spark = (x, y, s, c) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -6 q1 5 6 6 q-5 1 -6 6 q-1 -5 -6 -6 q5 -1 6 -6z" fill="${c}"/>`;
// 柑橘切片
const citrus = (x, y, r, c) => `<g transform="translate(${x} ${y})"><circle r="${r}" fill="${c}"/><circle r="${(r * 0.84).toFixed(1)}" fill="${lt(c, 0.55)}"/>${Array.from({ length: 8 }, (_, i) => { const t = i / 8 * Math.PI * 2; return `<path d="M0 0 L${(Math.cos(t) * r * 0.8).toFixed(1)} ${(Math.sin(t) * r * 0.8).toFixed(1)}" stroke="#fff" stroke-width="1.2"/>`; }).join('')}<circle r="${(r * 0.62).toFixed(1)}" fill="${lt(c, 0.2)}" opacity=".55"/><circle r="1.6" fill="#fff"/></g>`;
// 水餃（中心 0,0；寬約 34）
const dumpling = (x, y, s, c, r = 0) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})"><path d="M-17 5 q-3 -18 17 -20 q20 2 17 20 q-17 6 -34 0z" fill="${c}"/><path d="M-17 5 q17 6 34 0 q-1 4 -3 5 q-14 5 -28 0 q-2 -1 -3 -5z" fill="${dk(c, 0.2)}"/><path d="M-16 4 q-2 -14 16 -16 q-14 4 -12 17z" fill="#fff" opacity=".4"/>${[-9, -3, 3, 9].map(px => `<path d="M${px} ${-11 + Math.abs(px) * 0.35} q2 3 0 6" stroke="${dk(c, 0.18)}" stroke-width="1.2" fill="none" stroke-linecap="round"/>`).join('')}<path d="M-13 -6 q13 -12 26 0" stroke="${dk(c, 0.14)}" stroke-width="1.4" fill="none"/></g>`;
// 蛋（立著）
const egg = (x, y, s, c) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 -12 q9 0 9 13 q0 9 -9 9 q-9 0 -9 -9 q0 -13 9 -13z" fill="${c}"/><path d="M-5 -6 q2 -4 5 -4" stroke="#fff" stroke-width="2" stroke-linecap="round" fill="none" opacity=".6"/></g>`;

// ---- 新增插圖（kind 名稱以 g1_ 開頭）----
export const ART = {
  // 便當盒：白飯＋主菜＋青菜＋玉子燒
  g1_bento: (u, c, a) => `<defs>${vgrad(u + 'x', '#e3b06e', '#a8743c')}${vgrad(u + 'r', '#ffffff', '#ece6d8')}${rgrad(u + 'm', lt(c, 0.28), dk(c, 0.22))}</defs>${shadow(44)}
    <path d="M28 30 L104 22" stroke="#7a4f22" stroke-width="3" stroke-linecap="round"/><path d="M30 34 L106 27" stroke="#9a6a36" stroke-width="3" stroke-linecap="round"/>
    <rect x="14" y="38" width="92" height="56" rx="9" fill="url(#${u}x)"/>
    <rect x="19" y="43" width="82" height="46" rx="6" fill="#7a4f22"/>
    <rect x="21" y="45" width="37" height="42" rx="4" fill="url(#${u}r)"/>
    ${[[28, 52], [36, 56], [46, 51], [30, 74], [50, 78], [42, 70], [26, 63], [52, 62]].map(([x, y], i) => `<ellipse cx="${x}" cy="${y}" rx="2" ry="1.2" transform="rotate(${i * 37} ${x} ${y})" fill="#e3ddcf"/>`).join('')}
    <circle cx="40" cy="65" r="6" fill="#c8303f"/><circle cx="38" cy="63" r="1.8" fill="#fff" opacity=".5"/>
    <circle cx="33" cy="58" r=".9" fill="#2b2b2b"/><circle cx="47" cy="72" r=".9" fill="#2b2b2b"/><circle cx="31" cy="78" r=".9" fill="#2b2b2b"/>
    <rect x="60" y="45" width="39" height="22" rx="4" fill="#f4ecd9"/>
    ${leaf(64, 58, -30, '#7fb77e', 0.9)}
    <path d="M66 60 q-3 -12 12 -13 q16 -1 17 9 q0 8 -13 9 q-11 1 -16 -5z" fill="url(#${u}m)"/>
    <path d="M71 54 l16 -3 M70 59 l20 -3" stroke="${dk(c, 0.38)}" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>
    ${shine('M70 52 q6 -4 14 -4 l-1 2 q-7 0 -12 4z', 0.35)}
    <rect x="60" y="69" width="18" height="18" rx="3" fill="#eef3e2"/>
    ${leaf(62, 82, -50, a, 0.7)}${leaf(66, 84, -80, dk(a, 0.12), 0.75)}${leaf(70, 82, -120, lt(a, 0.12), 0.7)}
    <rect x="80" y="69" width="19" height="18" rx="3" fill="#fff6dc"/>
    <rect x="82" y="71" width="15" height="7" rx="2.5" fill="#f2c94c"/><rect x="82" y="78.5" width="15" height="7" rx="2.5" fill="#efbe3a"/>
    <path d="M85 74.5 q4 -3 8 0 M85 82 q4 -3 8 0" stroke="#d79a1f" stroke-width="1" fill="none"/>
    ${shine('M18 42 h84 v2.5 q-42 -1 -84 0z', 0.3)}`,

  // 早午餐：厚片吐司＋太陽蛋（c 蛋黃／醬，a 配菜）
  g1_toast: (u, c, a) => `<defs>${vgrad(u + 'p', '#ffffff', '#e3e6ea')}${vgrad(u + 'b', '#e3a65a', '#b46c2a')}${rgrad(u + 'y', lt(c, 0.35), dk(c, 0.1))}</defs>${shadow(46, 100)}
    <ellipse cx="60" cy="82" rx="50" ry="16" fill="url(#${u}p)"/><ellipse cx="60" cy="80" rx="40" ry="11" fill="#f5f6f8"/>
    <g transform="rotate(-6 50 62)">
      <path d="M24 84 V50 q0 -14 15 -14 q4 -7 13 -7 q9 0 13 7 q15 0 15 14 V84 z" fill="url(#${u}b)"/>
      <path d="M28 82 V51 q0 -11 12 -11 q4 -6 12 -6 q8 0 12 6 q12 0 12 11 V82 z" fill="#f7deaa"/>
      ${[[36, 70], [60, 74], [48, 78], [66, 52]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1" fill="#e2bd7c"/>`).join('')}
      <path d="M30 60 q-3 -12 12 -13 q8 -7 18 1 q13 1 10 13 q-3 11 -19 9 q-18 3 -21 -10z" fill="#fffdf6"/>
      <path d="M30 60 q-3 -12 12 -13 q8 -7 18 1 q13 1 10 13" fill="none" stroke="#efe6d2" stroke-width="1.2"/>
      <circle cx="49" cy="59" r="9" fill="url(#${u}y)"/><ellipse cx="46" cy="55.5" rx="3" ry="2" fill="#fff" opacity=".6"/>
    </g>
    ${leaf(76, 84, -150, '#6fa36b', 1.1)}${leaf(80, 78, -100, '#86b86a', 1)}
    <circle cx="90" cy="78" r="7" fill="${a}"/><circle cx="88" cy="76" r="2" fill="#fff" opacity=".45"/><path d="M90 71 l-2 -3 M90 71 l3 -2" stroke="#4f9a5e" stroke-width="1.4" stroke-linecap="round"/>
    <circle cx="98" cy="86" r="6" fill="${dk(a, 0.08)}"/><circle cx="96.5" cy="84.5" r="1.6" fill="#fff" opacity=".45"/>
    ${spark(98, 40, 0.8, '#ffd27a')}${spark(20, 46, 0.6, '#ffd27a')}`,

  // 鬆餅塔（c 餅色，a 糖漿）
  g1_pancake: (u, c, a) => `<defs>${vgrad(u + 'p', '#ffffff', '#e3e6ea')}</defs>${shadow(46, 100)}
    <ellipse cx="60" cy="86" rx="48" ry="13" fill="url(#${u}p)"/><ellipse cx="60" cy="84" rx="38" ry="8.5" fill="#f5f6f8"/>
    ${[76, 64, 52].map(y => `<ellipse cx="60" cy="${y + 7}" rx="34" ry="9" fill="${dk(c, 0.3)}"/><rect x="26" y="${y}" width="68" height="7" fill="${dk(c, 0.12)}"/><path d="M26 ${y + 3.5} q34 9 68 0" stroke="${lt(c, 0.25)}" stroke-width="1.2" fill="none" opacity=".7"/><ellipse cx="60" cy="${y}" rx="34" ry="9" fill="${lt(c, 0.18)}"/>`).join('')}
    <path d="M34 50 q26 -9 52 0 q4 3 -2 6 v8 q-2 3 -4 0 v-5 q-8 3 -14 2 v14 q-2.5 3.5 -5 0 v-13 q-8 0 -14 -2 v7 q-2 3 -4 0 v-8 q-12 -4 -9 -9z" fill="${a}" opacity=".92"/>
    ${shine('M44 48 q10 -4 22 -3 l-1 2 q-10 0 -20 3z', 0.4)}
    <rect x="53" y="40" width="14" height="10" rx="2" fill="#fff1a8" transform="rotate(-8 60 45)"/><rect x="54" y="40" width="12" height="3" rx="1.5" fill="#fffbe0" transform="rotate(-8 60 45)"/>
    <circle cx="26" cy="88" r="4.5" fill="#d6334a"/><circle cx="34" cy="92" r="4" fill="#3a4fa0"/><circle cx="92" cy="90" r="4.5" fill="#3a4fa0"/><circle cx="25" cy="87" r="1.2" fill="#fff" opacity=".6"/>
    ${leaf(84, 40, -40, '#5f9a4a', 0.7)}${leaf(84, 40, -120, '#6fa36b', 0.6)}`,

  // 滷味紙碗＋竹籤（c 滷色，a 辣椒）
  g1_luwei: (u, c, a) => `<defs>${vgrad(u + 'b', '#ffffff', '#e7e0d2')}${rgrad(u + 't', lt(c, 0.2), dk(c, 0.2))}</defs>${shadow(42)}
    <path d="M44 58 L32 12" stroke="#d9b98a" stroke-width="2.6" stroke-linecap="round"/><path d="M74 56 L90 14" stroke="#cfae7c" stroke-width="2.6" stroke-linecap="round"/>
    <ellipse cx="60" cy="58" rx="42" ry="9" fill="${dk(c, 0.45)}"/>
    <rect x="34" y="20" width="9" height="15" rx="2" fill="#3a2626" transform="rotate(-14 38 28)"/>${[[35, 24], [38, 30], [40, 26]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".9" fill="#f2ebe0"/>`).join('')}
    <rect x="80" y="22" width="10" height="13" rx="2" fill="${lt(c, 0.25)}" transform="rotate(20 85 28)"/>
    <rect x="28" y="40" width="24" height="18" rx="3" fill="url(#${u}t)" transform="rotate(-12 40 49)"/>
    <path d="M30 42 l22 -4" stroke="${lt(c, 0.35)}" stroke-width="1.4" transform="rotate(-12 40 49)" opacity=".7"/>
    <ellipse cx="78" cy="47" rx="10" ry="12" fill="${dk(c, 0.05)}"/><ellipse cx="75" cy="42" rx="3" ry="4" fill="#fff" opacity=".3"/>
    <path d="M54 55 q-8 -14 5 -17 q13 0 6 12 q-5 7 -12 0" stroke="#2f4a2a" stroke-width="5" fill="none" stroke-linecap="round"/>
    ${leaf(62, 52, -60, '#4f9a3e', 1)}${leaf(64, 54, -110, '#5fae4a', 0.9)}
    ${[[46, 50], [70, 54], [86, 52], [38, 54]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="${a}"/><circle cx="${x}" cy="${y}" r="1.4" fill="${lt(a, 0.5)}"/>`).join('')}
    ${[[52, 48], [80, 56], [34, 50], [66, 46]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8" fill="none" stroke="#8fcf5a" stroke-width="1.2"/>`).join('')}
    <path d="M18 58 q42 14 84 0 l-9 34 q-33 6 -66 0 z" fill="url(#${u}b)"/>
    <path d="M20.5 66 q39.5 13 79 0 l-1.5 6 q-38 12 -76 0z" fill="#c8303f"/>
    ${[30, 42, 54, 66, 78, 90].map(x => `<circle cx="${x}" cy="${71 + Math.abs(60 - x) * -0.05}" r="1.4" fill="#fff" opacity=".8"/>`).join('')}
    ${shine('M24 66 l3 24 h-4 l-3 -24z', 0.5)}`,

  // 水餃盤＋沾醬（c 麵皮，a 蔥花／點綴）
  g1_dumpling: (u, c, a) => `<defs>${vgrad(u + 'p', '#ffffff', '#dfe6ef')}</defs>${shadow(48, 100)}
    <ellipse cx="94" cy="44" rx="15" ry="6" fill="#fff" stroke="#c9d3df"/><ellipse cx="94" cy="44" rx="11" ry="4" fill="#5a2a14"/><circle cx="91" cy="43" r="1.4" fill="#d6332a"/><circle cx="97" cy="44.5" r="1.2" fill="${a}"/>
    <ellipse cx="58" cy="78" rx="50" ry="18" fill="url(#${u}p)"/>
    <ellipse cx="58" cy="77" rx="42" ry="13" fill="none" stroke="#3d6fb6" stroke-width="1.6" opacity=".7"/>
    <ellipse cx="58" cy="77" rx="38" ry="11" fill="#f7f9fc"/>
    ${dumpling(42, 66, 0.9, c, -8)}${dumpling(70, 64, 0.9, c, 6)}${dumpling(34, 80, 0.95, c, -4)}${dumpling(60, 82, 1, c, 2)}${dumpling(84, 78, 0.9, c, 10)}
    ${[[44, 58], [72, 56], [62, 74], [36, 72]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4" fill="${a}"/>`).join('')}
    ${steam(56, 40, '#c6d2e2')}`,

  // 拉麵碗（c 湯色，a 碗緣色）
  g1_ramen: (u, c, a) => `<defs>${vgrad(u + 'b', '#3a3434', '#0e0c0c')}${rgrad(u + 's', lt(c, 0.22), dk(c, 0.12), 0.5, 0.45)}</defs>${shadow(46)}
    ${steam(60, 24, '#d8c8b8')}
    <path d="M12 56 h96 q-4 36 -48 38 q-44 -2 -48 -38z" fill="url(#${u}b)"/>
    <path d="M16 66 q44 16 88 0" stroke="${a}" stroke-width="3" fill="none"/>
    ${[24, 36, 48, 60, 72, 84, 96].map((x, i) => `<path d="M${x - 3} ${74 + (i === 0 || i === 6 ? -3 : 0)} l3 -4 l3 4" stroke="${a}" stroke-width="1.4" fill="none" opacity=".75"/>`).join('')}
    <ellipse cx="60" cy="56" rx="48" ry="12" fill="${a}"/><ellipse cx="60" cy="56.5" rx="44" ry="10" fill="url(#${u}s)"/>
    <path d="M24 54 l5 -28 l15 2.4 l-4 27z" fill="#1f2a1c"/><path d="M27 48 l12 2" stroke="#33452e" stroke-width="1"/>
    <path d="M30 60 q6 -4 12 0 t12 0 t12 0 t12 0 t12 0" stroke="#f6dc8a" stroke-width="2.2" fill="none"/>
    <path d="M36 63 q6 -3 12 0 t12 0 t12 0 t12 0" stroke="#f2d27a" stroke-width="2" fill="none"/>
    <circle cx="50" cy="54" r="9" fill="#f0c4a6"/><circle cx="50" cy="54" r="9" fill="none" stroke="#9a4e2a" stroke-width="2"/><path d="M45 52 q5 -3 10 1" stroke="#fbe2d0" stroke-width="1.6" fill="none"/>
    <circle cx="62" cy="57" r="8" fill="#eab896"/><circle cx="62" cy="57" r="8" fill="none" stroke="#8c4424" stroke-width="2"/>
    <ellipse cx="82" cy="54" rx="10" ry="6.5" fill="#fffaf0"/><ellipse cx="82" cy="54" rx="5.5" ry="3.8" fill="#f29a1f"/><ellipse cx="81" cy="53" rx="2" ry="1.2" fill="#ffd27a"/>
    <circle cx="70" cy="49" r="5.5" fill="#fff"/><path d="M70 49 m-3 0 a3 3 0 1 1 3 3 a1.6 1.6 0 1 1 -1.4 -2" stroke="#e85d8a" stroke-width="1.3" fill="none"/>
    ${[[40, 62], [74, 62], [90, 60], [56, 64], [86, 48]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8" fill="none" stroke="#7fbf4f" stroke-width="1.3"/>`).join('')}
    ${shine('M20 60 q2 14 12 22 l-3 1 q-10 -8 -12 -23z', 0.18)}`,

  // 溏心蛋（c 蛋白滷色，a 蛋黃）
  g1_egg: (u, c, a) => `<defs>${vgrad(u + 'd', '#ffffff', '#e2dcd2')}${rgrad(u + 'y', lt(a, 0.3), dk(a, 0.15), 0.45, 0.4)}</defs>${shadow(40)}
    <ellipse cx="60" cy="82" rx="44" ry="14" fill="url(#${u}d)"/><ellipse cx="60" cy="80" rx="36" ry="9.5" fill="#f4efe6"/>
    ${[[44, 68, -12], [76, 66, 10]].map(([x, y, r]) => `<g transform="translate(${x} ${y}) rotate(${r})"><ellipse rx="19" ry="14" fill="${dk(c, 0.15)}" transform="translate(0 2)"/><ellipse rx="19" ry="13" fill="${lt(c, 0.55)}"/><ellipse rx="19" ry="13" fill="none" stroke="${c}" stroke-width="3"/><ellipse cx="1" rx="10" ry="7.5" fill="url(#${u}y)"/><ellipse cx="-2" cy="-2.5" rx="3.6" ry="2" fill="#fff" opacity=".55"/></g>`).join('')}
    ${[[56, 54], [62, 52], [50, 84], [70, 82]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.3" ry=".8" fill="#f6efe0"/>`).join('')}
    ${leaf(82, 48, -60, '#5fae4a', 0.8)}${leaf(82, 48, -120, '#7fbf4f', 0.7)}`,

  // 銀色餐蓋（私廚，c 罩色，a 點綴）
  g1_cloche: (u, c, a) => `<defs>${hgrad(u + 'd', lt(c, 0.45), dk(c, 0.3))}${vgrad(u + 'p', lt(c, 0.3), dk(c, 0.2))}</defs>${shadow(48, 100)}
    <ellipse cx="60" cy="88" rx="52" ry="10" fill="url(#${u}p)"/><ellipse cx="60" cy="86" rx="48" ry="7.5" fill="${lt(c, 0.5)}"/>
    <path d="M22 86 q-6 6 4 10 l14 -4z" fill="${a}"/>
    <path d="M18 84 q0 -46 42 -48 q42 2 42 48z" fill="url(#${u}d)"/>
    <rect x="15" y="81" width="90" height="6" rx="3" fill="${dk(c, 0.18)}"/>
    <ellipse cx="60" cy="36" rx="9" ry="3.6" fill="${dk(c, 0.25)}"/><circle cx="60" cy="31" r="5.5" fill="url(#${u}d)"/><circle cx="58" cy="29.5" r="1.6" fill="#fff" opacity=".7"/>
    ${shine('M30 74 q-2 -24 22 -32 q-14 12 -16 32z', 0.45)}
    <path d="M78 46 q12 8 14 26" stroke="#fff" stroke-width="2" fill="none" opacity=".25" stroke-linecap="round"/>
    ${spark(96, 30, 1, a)}${spark(22, 40, 0.8, a)}${spark(106, 52, 0.6, lt(a, 0.3))}`,

  // 外燴拼盤（c 木盤，a 香草）
  g1_platter: (u, c, a) => `<defs>${vgrad(u + 'w', lt(c, 0.15), dk(c, 0.15))}</defs>${shadow(50, 100)}
    <ellipse cx="60" cy="76" rx="52" ry="20" fill="${dk(c, 0.3)}"/><ellipse cx="60" cy="72" rx="52" ry="20" fill="url(#${u}w)"/>
    <path d="M18 70 q40 -10 84 2 M22 78 q40 -8 76 2" stroke="${dk(c, 0.18)}" stroke-width="1" fill="none" opacity=".6"/>
    <ellipse cx="34" cy="64" rx="11" ry="5" fill="#fff"/><ellipse cx="34" cy="63.5" rx="8.5" ry="3.4" fill="#c8462a"/>
    ${[[52, 60], [64, 62], [76, 60]].map(([x, y]) => `<ellipse cx="${x}" cy="${y + 2}" rx="7" ry="3" fill="#d9b06a"/><ellipse cx="${x}" cy="${y}" rx="7" ry="3" fill="#f2d39a"/><ellipse cx="${x}" cy="${y - 1}" rx="4.5" ry="2" fill="#f6a5a0"/>`).join('')}
    <path d="M86 68 l12 -6 l2 10z" fill="#f7d54a"/><path d="M86 68 l12 -6 l-1 3z" fill="#fff3a8"/><path d="M80 78 l12 -5 l2 9z" fill="#f2c94c"/>
    ${[[30, 76], [35, 79], [26, 79], [31, 82], [36, 84], [27, 85]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.4" fill="#7a3a6a"/><circle cx="${x - 1}" cy="${y - 1}" r="1" fill="#fff" opacity=".4"/>`).join('')}
    <circle cx="48" cy="80" r="4.5" fill="#e8483b"/><circle cx="56" cy="84" r="4" fill="#e8483b"/><circle cx="47" cy="79" r="1.2" fill="#fff" opacity=".5"/>
    <path d="M64 82 q8 -4 14 0 q-4 5 -14 0z" fill="#f0a6a0"/><path d="M66 84 q8 -3 12 1 q-4 4 -12 -1z" fill="#e88a86"/>
    ${leaf(44, 70, -20, a, 0.8)}${leaf(70, 72, -160, a, 0.8)}${leaf(94, 78, -40, dk(a, 0.1), 0.7)}${leaf(60, 68, -100, lt(a, 0.15), 0.6)}
    ${spark(102, 40, 0.8, '#f2c94c')}`,

  // 手搖杯（c 飲料，a 配料）
  g1_bubble: (u, c, a) => `<defs>${vgrad(u + 'd', lt(c, 0.12), dk(c, 0.12))}</defs>${shadow(30)}
    <rect x="62" y="4" width="9" height="88" rx="4" fill="#ff7aa8" transform="rotate(12 66 48)"/>
    <rect x="62" y="4" width="3" height="88" rx="1.5" fill="#ffb3cc" transform="rotate(12 66 48)"/>
    <path d="M34 34 h52 l-6 58 q-20 5 -40 0z" fill="#ffffff" opacity=".45" stroke="#d3d9e0"/>
    <path d="M35.6 44 h48.8 l-4.9 47.2 q-19.5 4.6 -39 0z" fill="url(#${u}d)"/>
    <path d="M40 48 q8 10 2 24 M74 50 q-6 12 2 26" stroke="${dk(c, 0.25)}" stroke-width="3" fill="none" opacity=".3" stroke-linecap="round"/>
    <rect x="44" y="50" width="12" height="11" rx="2.5" fill="#fff" opacity=".45" transform="rotate(10 50 55)"/><rect x="62" y="56" width="11" height="10" rx="2.5" fill="#fff" opacity=".35" transform="rotate(-12 67 61)"/>
    ${[[44, 88], [52, 89], [60, 89.5], [68, 89], [76, 88], [48, 82], [56, 83], [64, 83], [72, 82], [52, 76], [68, 76]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="${a}"/><circle cx="${x - 1.3}" cy="${y - 1.3}" r="1.1" fill="#fff" opacity=".5"/>`).join('')}
    <rect x="31" y="29" width="58" height="7" rx="3.5" fill="#eef1f5"/><rect x="31" y="29" width="58" height="7" rx="3.5" fill="none" stroke="#cfd6de"/>
    <circle cx="60" cy="66" r="7" fill="#fff" opacity=".8"/><path d="M57 66 q3 -5 6 0 q-3 5 -6 0z" fill="#ff7aa8"/>
    ${shine('M38 38 h4 l4 50 h-4z', 0.4)}`,

  // 茶葉罐（c 罐色，a 標籤）
  g1_teatin: (u, c, a) => `<defs><linearGradient id="${u}t" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${dk(c, 0.2)}"/><stop offset=".3" stop-color="${lt(c, 0.2)}"/><stop offset="1" stop-color="${dk(c, 0.35)}"/></linearGradient></defs>${shadow(32)}
    <rect x="36" y="34" width="48" height="60" rx="3" fill="url(#${u}t)"/><ellipse cx="60" cy="94" rx="24" ry="4" fill="${dk(c, 0.35)}"/>
    <rect x="34" y="22" width="52" height="15" rx="3" fill="url(#${u}t)"/><ellipse cx="60" cy="22" rx="26" ry="5" fill="${lt(c, 0.25)}"/><ellipse cx="60" cy="22" rx="20" ry="3.4" fill="${lt(c, 0.12)}"/>
    <path d="M34 37 h52" stroke="${dk(c, 0.4)}" stroke-width="1.4"/>
    <rect x="41" y="46" width="38" height="40" rx="2" fill="${a}"/>
    <rect x="43.5" y="48.5" width="33" height="35" rx="1" fill="none" stroke="${dk(a, 0.3)}" stroke-width=".8"/>
    <path d="M52 54 v22 M50 58 h5 M49 66 q3 -2 6 0 M58 53 q3 8 0 16 q-2 6 3 8" stroke="#2a2116" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <rect x="65" y="54" width="7" height="7" fill="#b23a2a"/><path d="M66.5 56 h4 M66.5 58.5 h4 M68.5 55 v5" stroke="#f6ecd6" stroke-width=".8"/>
    ${leaf(64, 76, -40, '#4f6b3a', 0.65)}${leaf(64, 76, -110, '#6f8f4a', 0.55)}
    ${shine('M41 36 h5 v56 h-5z', 0.28)}
    ${[[26, 92], [30, 96], [92, 94], [96, 90], [88, 97]].map(([x, y], i) => `<ellipse cx="${x}" cy="${y}" rx="3" ry="2.3" transform="rotate(${i * 40} ${x} ${y})" fill="${i % 2 ? '#3e5a34' : '#5a6f3a'}"/>`).join('')}`,

  // 冷泡茶包（c 茶葉，a 吊牌）
  g1_teabag: (u, c, a) => `<defs>${vgrad(u + 'g', lt(c, 0.5), c)}</defs>${shadow(44)}
    <path d="M72 34 h28 l-3 56 q-11 4 -22 0z" fill="#ffffff" opacity=".5" stroke="#d6dde3"/>
    <path d="M73.6 46 h24.8 l-2.4 43 q-10 3.6 -20 0z" fill="url(#${u}g)" opacity=".85"/>
    <rect x="78" y="52" width="9" height="8" rx="2" fill="#fff" opacity=".5"/>
    ${shine('M75 38 h3 l2 48 h-3z', 0.5)}
    ${[[38, 64, -8], [58, 74, 10]].map(([x, y, r]) => `<g transform="translate(${x} ${y}) rotate(${r})"><path d="M0 -26 V-44" stroke="#d8c7a6" stroke-width="1.2"/><path d="M0 -22 L20 14 L-20 14z" fill="#ffffff" opacity=".85" stroke="#e1e4e8"/>${[[-6, 6], [2, 4], [8, 9], [-2, 10], [-10, 11], [4, -2], [-3, -4], [0, -12]].map(([px, py], i) => `<ellipse cx="${px}" cy="${py}" rx="3" ry="1.8" transform="rotate(${i * 50} ${px} ${py})" fill="${i % 2 ? c : dk(c, 0.2)}"/>`).join('')}<path d="M-20 14 L20 14" stroke="#d9dde2" stroke-width="1.6"/></g>`).join('')}
    <rect x="26" y="12" width="20" height="12" rx="2" fill="${a}" transform="rotate(-10 36 18)"/>${leaf(31, 19, -10, '#fff', 0.5)}
    <rect x="50" y="22" width="16" height="10" rx="2" fill="${lt(a, 0.25)}" transform="rotate(8 58 27)"/>`,

  // 紫砂壺＋茶杯（c 壺色，a 杯色）
  g1_teapot: (u, c, a) => `<defs>${rgrad(u + 'p', lt(c, 0.25), dk(c, 0.3), 0.38, 0.35)}${vgrad(u + 'w', '#b88a5a', '#7a5230')}</defs>${shadow(50, 100)}
    <rect x="10" y="86" width="100" height="8" rx="3" fill="url(#${u}w)"/><path d="M14 89 h92" stroke="#5a3a20" stroke-width=".8" opacity=".5"/>
    <path d="M28 58 q-14 2 -10 16 q3 8 12 4" stroke="${dk(c, 0.15)}" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M70 66 q10 -2 14 -16 l5 1 q-3 18 -17 23z" fill="${dk(c, 0.12)}"/>
    <ellipse cx="50" cy="68" rx="25" ry="18" fill="url(#${u}p)"/>
    <ellipse cx="50" cy="52" rx="14" ry="4" fill="${dk(c, 0.22)}"/><ellipse cx="50" cy="51" rx="12" ry="3" fill="${lt(c, 0.08)}"/>
    <ellipse cx="50" cy="47" rx="4" ry="3.4" fill="${dk(c, 0.1)}"/>
    ${shine('M34 62 q4 -8 12 -9 q-8 4 -9 12z', 0.35)}
    ${[[86, 78], [102, 74]].map(([x, y]) => `<path d="M${x - 8} ${y} h16 l-2.5 10 q-5.5 2.4 -11 0z" fill="${a}"/><ellipse cx="${x}" cy="${y}" rx="8" ry="2.4" fill="${dk(a, 0.1)}"/><ellipse cx="${x}" cy="${y + 0.3}" rx="6.5" ry="1.7" fill="#c98a3a"/>`).join('')}
    ${steam(98, 64, '#d6c9b8')}`,

  // 啤酒罐（c 罐身，a 標籤帶）
  g1_can: (u, c, a) => `<defs><linearGradient id="${u}c" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${dk(c, 0.18)}"/><stop offset=".32" stop-color="${lt(c, 0.25)}"/><stop offset="1" stop-color="${dk(c, 0.32)}"/></linearGradient><linearGradient id="${u}m" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9aa1ab"/><stop offset=".35" stop-color="#eef1f4"/><stop offset="1" stop-color="#8a919b"/></linearGradient></defs>${shadow(28)}
    ${leaf(88, 90, -30, '#6fa36b', 1.1)}${leaf(86, 92, -80, '#86b86a', 0.9)}
    <rect x="40" y="28" width="40" height="64" rx="5" fill="url(#${u}c)"/>
    <path d="M40 30 q20 -6 40 0 v-2 q-20 -6 -40 0z" fill="url(#${u}m)"/><ellipse cx="60" cy="26" rx="20" ry="4" fill="url(#${u}m)"/><ellipse cx="60" cy="26" rx="16" ry="2.8" fill="#c3c9d1"/>
    <ellipse cx="64" cy="25.6" rx="5" ry="1.6" fill="#a8afb9"/><circle cx="62" cy="25.6" r=".9" fill="#7d848e"/>
    <path d="M40 88 h40 v2 q0 6 -6 6 h-28 q-6 0 -6 -6z" fill="url(#${u}m)"/>
    <rect x="40" y="48" width="40" height="30" fill="${a}"/><rect x="40" y="48" width="40" height="2" fill="${lt(a, 0.3)}"/><rect x="40" y="76" width="40" height="2" fill="${dk(a, 0.3)}"/>
    <g transform="translate(60 63)">${[[0, -8, 3.4], [-3, -4, 3.6], [3, -4, 3.6], [-3.6, 1, 3.8], [3.6, 1, 3.8], [0, -1, 3.8], [0, 5, 3.6], [-2.6, 7, 2.8], [2.6, 7, 2.8]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${(r * 0.8).toFixed(1)}" fill="#9ad15f" stroke="#5f8f3a" stroke-width=".8"/>`).join('')}<path d="M0 -12 v-4 q4 -2 6 1" stroke="#5f8f3a" stroke-width="1.2" fill="none"/></g>
    ${shine('M45 32 h4 v56 h-4z', 0.32)}
    ${[[72, 38], [74, 44], [48, 84], [70, 84], [52, 40]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.1" ry="1.6" fill="#fff" opacity=".55"/>`).join('')}`,

  // 啤酒杯（c 酒色，a 杯墊）
  g1_pint: (u, c, a) => `<defs>${vgrad(u + 'b', lt(c, 0.2), dk(c, 0.18))}</defs>${shadow(36)}
    <ellipse cx="60" cy="94" rx="30" ry="6" fill="${a}"/><ellipse cx="60" cy="92.5" rx="26" ry="4.4" fill="${lt(a, 0.15)}"/>
    <path d="M36 26 h48 l-6 66 q-18 3 -36 0z" fill="#ffffff" opacity=".35" stroke="#dfe3e8"/>
    <path d="M37.8 38 h44.4 l-5 53.2 q-17.2 2.8 -34.4 0z" fill="url(#${u}b)"/>
    ${[[50, 80, 1.4], [56, 70, 1], [66, 76, 1.2], [62, 58, 1], [48, 60, 1.1], [70, 62, .9], [58, 86, 1]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity=".6"/>`).join('')}
    <path d="M35 40 q-4 -10 6 -13 q3 -8 13 -5 q7 -6 15 0 q10 -3 12 6 q6 4 2 10 q-2 3 -6 2 h-38 q-5 1 -4 0z" fill="#fffaf0"/>
    <path d="M38 38 q8 3 16 0 q8 3 16 0 q6 2 10 0" stroke="#efe4cf" stroke-width="1.4" fill="none"/>
    <circle cx="48" cy="30" r="2" fill="#fff"/><circle cx="68" cy="28" r="1.5" fill="#fff"/>
    ${shine('M41 42 h4 l3 46 h-4z', 0.35)}
    ${leaf(90, 80, -60, '#6fa36b', 0.9)}${leaf(90, 80, -120, '#86b86a', 0.8)}`,

  // 冷壓果汁瓶（c 果汁，a 葉／點綴）
  g1_juice: (u, c, a) => `<defs>${vgrad(u + 'j', lt(c, 0.18), dk(c, 0.15))}</defs>${shadow(34)}
    <rect x="50" y="14" width="20" height="10" rx="2.5" fill="${dk(a, 0.15)}"/>${[53, 57, 61, 65].map(x => `<path d="M${x} 15 v8" stroke="${lt(a, 0.2)}" stroke-width=".8"/>`).join('')}
    <rect x="52" y="24" width="16" height="6" fill="#e9eef2" opacity=".9"/>
    <path d="M44 42 q0 -12 10 -12 h12 q10 0 10 12 v48 q0 6 -6 6 h-20 q-6 0 -6 -6z" fill="#ffffff" opacity=".5" stroke="#d6dde3"/>
    <path d="M45.5 44 q0 -6 4 -6 h21 q4 0 4 6 v46 q0 4.5 -4.5 4.5 h-20 q-4.5 0 -4.5 -4.5z" fill="url(#${u}j)"/>
    <rect x="44" y="56" width="32" height="26" fill="#ffffff"/>
    ${citrus(60, 66, 6, c)}<rect x="50" y="75" width="20" height="2.2" rx="1.1" fill="${dk(c, 0.2)}"/>
    ${shine('M48 42 h3.5 v50 h-3.5z', 0.35)}
    ${citrus(90, 88, 11, c)}${leaf(26, 88, -30, a, 1.1)}${leaf(28, 90, -80, lt(a, 0.15), 0.9)}`,

  // 蔬果木箱（c 木色，a 番茄／水果色）
  g1_crate: (u, c, a) => `<defs>${vgrad(u + 'w', lt(c, 0.12), dk(c, 0.15))}</defs>${shadow(50, 100)}
    <path d="M30 54 l-6 -30 l6 -2 l6 30z" fill="#ff8a2a"/><path d="M27 22 q-6 -10 2 -14 M29 22 q2 -12 10 -10 M28 22 q-10 -4 -10 2" stroke="#4f9a3e" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M40 54 l2 -28 l6 1 l-2 28z" fill="#f47a1a"/><path d="M45 26 q0 -10 8 -12 M44 26 q-6 -8 -2 -14" stroke="#5fae4a" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    ${[[62, 40, 14], [76, 36, 12], [90, 42, 13], [70, 48, 12]].map(([x, y, r], i) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${['#4f9a3e', '#6fbf5a', '#3f8a32', '#5fae4a'][i]}"/>`).join('')}
    <path d="M62 40 q6 -8 14 -4 M78 36 q6 2 10 8" stroke="#9ad17a" stroke-width="1.4" fill="none"/>
    ${[[50, 50], [100, 50], [36, 52]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="8" fill="${a}"/><circle cx="${x - 2.5}" cy="${y - 2.5}" r="2.2" fill="#fff" opacity=".45"/><path d="M${x - 3} ${y - 7} l3 2 l3 -2 M${x} ${y - 5} v-3" stroke="#3f7a2a" stroke-width="1.6" stroke-linecap="round"/>`).join('')}
    <rect x="14" y="54" width="92" height="40" rx="3" fill="url(#${u}w)"/>
    <rect x="14" y="54" width="92" height="11" fill="${lt(c, 0.12)}"/><rect x="14" y="68" width="92" height="11" fill="${c}"/><rect x="14" y="82" width="92" height="12" fill="${dk(c, 0.08)}"/>
    <path d="M14 66.5 h92 M14 80.5 h92" stroke="${dk(c, 0.4)}" stroke-width="2"/>
    <rect x="14" y="54" width="8" height="40" fill="${dk(c, 0.18)}"/><rect x="98" y="54" width="8" height="40" fill="${dk(c, 0.18)}"/>
    ${[[18, 59], [18, 73], [18, 87], [102, 59], [102, 73], [102, 87]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.2" fill="${dk(c, 0.5)}"/>`).join('')}
    <ellipse cx="60" cy="60" rx="8" ry="2.6" fill="${dk(c, 0.5)}"/>
    <rect x="44" y="70" width="32" height="15" rx="2" fill="#f6efe0" transform="rotate(-3 60 77)"/>${leaf(50, 78, -20, '#5fae4a', 0.6)}<rect x="56" y="75" width="16" height="2" rx="1" fill="#8a6a44" transform="rotate(-3 60 77)"/><rect x="56" y="79" width="11" height="1.6" rx=".8" fill="#b59a74" transform="rotate(-3 60 77)"/>
    ${shine('M16 55 h88 v2 h-88z', 0.35)}`,

  // 雞蛋盒（c 紙盒，a 蛋殼）
  g1_eggbox: (u, c, a) => `<defs>${vgrad(u + 'b', lt(c, 0.12), dk(c, 0.18))}</defs>${shadow(48)}
    <path d="M18 62 l6 -34 h72 l6 34z" fill="${lt(c, 0.2)}"/><path d="M24 28 h72 l1 4 h-74z" fill="${dk(c, 0.08)}"/>
    <rect x="44" y="36" width="32" height="16" rx="3" fill="#fffaf0" opacity=".85"/>${egg(52, 45, 0.45, '#f2c94c')}<rect x="57" y="40" width="15" height="2.2" rx="1.1" fill="#8a6a44"/><rect x="57" y="45" width="11" height="1.8" rx=".9" fill="#b59a74"/>
    ${[[34, 56], [60, 55], [86, 56]].map(([x, y]) => egg(x, y, 1, a)).join('')}
    ${[[26, 64], [52, 65], [78, 64]].map(([x, y]) => egg(x + 8, y, 1.05, lt(a, 0.08))).join('')}
    <path d="M14 70 h92 l-6 22 q-40 6 -80 0z" fill="url(#${u}b)"/>
    ${[26, 48, 70, 92].map(x => `<path d="M${x} 72 q6 9 0 18" stroke="${dk(c, 0.22)}" stroke-width="1.2" fill="none" opacity=".6"/>`).join('')}
    <path d="M14 70 h92" stroke="${dk(c, 0.2)}" stroke-width="1.6"/>
    <path d="M22 96 q8 -4 14 2 M84 97 q8 -6 14 0" stroke="#e8c46a" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <path d="M98 50 q10 -6 12 -18 q-10 4 -12 18z" fill="#fffaf0" stroke="#e1d6c2" stroke-width=".8"/>`,

  // 米袋（c 布袋，a 標籤）
  g1_ricebag: (u, c, a) => `<defs>${vgrad(u + 'g', lt(c, 0.15), dk(c, 0.15))}</defs>${shadow(40)}
    <path d="M24 92 q-4 -40 4 -66" stroke="#c99a3a" stroke-width="1.8" fill="none"/>${[30, 38, 46, 54, 62].map((y, i) => `<ellipse cx="${27 + i * 0.3 + (i % 2 ? 3 : -3)}" cy="${y}" rx="2" ry="3.6" transform="rotate(${i % 2 ? 30 : -30} ${27 + (i % 2 ? 3 : -3)} ${y})" fill="#e0b84a"/>`).join('')}
    <path d="M36 42 q-6 26 -4 50 q28 7 56 0 q2 -24 -4 -50z" fill="url(#${u}g)"/>
    <path d="M38 42 q22 -6 44 0 l-4 -14 q-6 -6 -18 -3 q-12 -3 -18 3z" fill="${lt(c, 0.22)}"/>
    <path d="M44 30 l2 10 M54 26 v14 M66 26 l-1 14 M76 30 l-2 10" stroke="${dk(c, 0.12)}" stroke-width="1" opacity=".6"/>
    <path d="M37 42 q23 5 46 0" stroke="#8a5a34" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M62 44 q8 10 4 16 M62 44 q-2 12 -8 14" stroke="#8a5a34" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <rect x="42" y="60" width="36" height="24" rx="3" fill="${a}"/><rect x="44.5" y="62.5" width="31" height="19" rx="2" fill="none" stroke="${lt(a, 0.45)}" stroke-width=".8"/>
    ${[[54, 70, -20], [60, 68, 0], [66, 70, 20]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="2.2" ry="4" transform="rotate(${r} ${x} ${y})" fill="#fffaf0"/>`).join('')}<rect x="50" y="76" width="20" height="2" rx="1" fill="${lt(a, 0.5)}"/>
    ${shine('M40 46 q-3 20 -2 40 h4 q-2 -20 2 -40z', 0.28)}
    ${[[94, 94], [98, 92], [90, 96], [100, 96], [86, 93]].map(([x, y], i) => `<ellipse cx="${x}" cy="${y}" rx="1.8" ry="1.1" transform="rotate(${i * 35} ${x} ${y})" fill="#f6f0e0" stroke="#d9cdb2" stroke-width=".4"/>`).join('')}`,

  // 集點兌換卡（c 卡色，a 點章色）
  g1_ticket: (u, c, a) => `<defs><linearGradient id="${u}k" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${lt(c, 0.15)}"/><stop offset="1" stop-color="${dk(c, 0.2)}"/></linearGradient></defs>${shadow(44)}
    <rect x="22" y="30" width="80" height="50" rx="8" fill="#ffffff" transform="rotate(8 62 55)" opacity=".9"/>
    <g transform="rotate(-6 60 62)">
      <rect x="14" y="36" width="92" height="56" rx="9" fill="url(#${u}k)"/>
      <rect x="14" y="36" width="92" height="14" rx="9" fill="${dk(c, 0.15)}"/><rect x="14" y="44" width="92" height="6" fill="${dk(c, 0.15)}"/>
      <text x="22" y="47" font-family="Arial, sans-serif" font-size="8.5" font-weight="800" fill="#fff" letter-spacing=".8">DRINK PASS</text>
      ${Array.from({ length: 10 }, (_, i) => { const x = 25 + (i % 5) * 17.5, y = 62 + Math.floor(i / 5) * 17; return i < 6 ? `<circle cx="${x}" cy="${y}" r="6.4" fill="${a}"/><path d="M${x - 3} ${y} l2 2.4 l4 -4.6" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` : `<circle cx="${x}" cy="${y}" r="6.4" fill="none" stroke="#fff" stroke-width="1.4" stroke-dasharray="2.4 2" opacity=".85"/>`; }).join('')}
      ${shine('M18 52 h84 v2 h-84z', 0.3)}
    </g>
    ${spark(104, 30, 0.8, a)}${spark(16, 92, 0.6, lt(a, 0.3))}`,

  // 湯碗＋湯匙（c 湯色，a 蔥花／配料）
  g1_soup: (u, c, a) => `<defs>${vgrad(u + 'w', '#ffffff', '#e2e5ea')}${rgrad(u + 's', lt(c, 0.2), dk(c, 0.1), 0.5, 0.45)}</defs>${shadow(40)}
    ${steam(56, 34, '#cbbfae')}
    <path d="M20 58 h80 q-4 34 -40 36 q-36 -2 -40 -36z" fill="url(#${u}w)"/>
    <path d="M24 68 q36 12 72 0" stroke="#c8a26a" stroke-width="1.6" fill="none" opacity=".8"/>
    <ellipse cx="60" cy="58" rx="40" ry="9" fill="#f6f4ef"/><ellipse cx="60" cy="58.5" rx="36" ry="7.2" fill="url(#${u}s)"/>
    ${[[42, 57], [56, 60], [70, 56]].map(([x, y], i) => `<rect x="${x - 3.5}" y="${y - 3}" width="7" height="6" rx="1.2" fill="#fffaf0" transform="rotate(${i * 20 - 15} ${x} ${y})"/>`).join('')}
    <ellipse cx="50" cy="61" rx="5" ry="2.4" fill="#a0603a"/>
    ${[[36, 58], [48, 55], [64, 61], [74, 59], [58, 55], [80, 57]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="none" stroke="${a}" stroke-width="1.2"/>`).join('')}
    <path d="M76 58 l20 -22 q4 -3 6 0 q1 3 -3 5 l-17 19z" fill="#ffffff" stroke="#d6dbe1"/><ellipse cx="80" cy="58" rx="7" ry="3.2" fill="#ffffff" stroke="#d6dbe1"/>
    ${shine('M24 62 q2 14 12 22 l-3 1 q-10 -8 -12 -23z', 0.5)}`,
};

// ---- 11 家業主 ----
const P = (id, name, en, unit, price, cost, stock, desc, descEn, kind, color, accent) => ({ id, name, en, unit, price, cost, stock, desc, descEn, art: { kind, color, accent } });

export const BIZ = [
  // 1. 家常便當
  {
    merchant: {
      id: 'bento', name: '巷口家常便當', en: 'Corner Home Bento', type: 'bento', cat: 'food',
      typeName: '家常便當', owner: '阿華', theme: 'bento', tagline: '像家裡煮的，每天現做',
      products: [
        P('bt-chicken', '香煎雞腿便當', 'Pan-fried Chicken Leg Bento', '1 份', 120, 52, 40, '整隻去骨雞腿，配三樣當日青菜。', 'Whole boneless leg with three daily veggies.', 'g1_bento', '#c8742e', '#6fa36b'),
        P('bt-pork', '古早味排骨便當', 'Classic Pork Chop Bento', '1 份', 110, 46, 40, '醬油醃一晚，外酥內嫩。', 'Marinated overnight, crispy outside, tender inside.', 'g1_bento', '#a0522d', '#86b86a'),
        P('bt-fish', '鹽烤鯖魚便當', 'Salt-grilled Mackerel Bento', '1 份', 115, 50, 30, '鯖魚現烤，皮脆肉多汁。', 'Grilled to order, crisp skin and juicy flesh.', 'g1_bento', '#8c9aa8', '#5f9a3e'),
        P('bt-veg', '蔬食五寶便當', 'Five-treasure Veggie Bento', '1 份', 95, 38, 25, '豆包、菇類與季節蔬菜，全素可。', 'Tofu skin, mushrooms and seasonal greens, vegan.', 'g1_bento', '#b5a06a', '#4f9a3e'),
        P('bt-group', '團體便當 10 份', 'Group Bento ×10', '10 份', 1100, 480, 10, '會議活動訂餐，請前一天預訂。', 'For meetings and events, order a day ahead.', 'g1_bento', '#c8742e', '#6fa36b'),
        P('bt-soup', '每日例湯', 'Soup of the Day', '1 碗', 35, 10, 60, '每天換口味，今天是蘿蔔排骨湯。', 'Changes daily, today: radish and pork rib.', 'g1_soup', '#f1e2c2', '#5fae4a'),
      ],
    },
    theme: {
      id: 'bento', kind: 'base', name: N('木盒便當', 'Wooden Bento', '木箱弁当', 'Hộp cơm gỗ', 'Bento Kotak Kayu'), deco: 'steam', dark: false,
      vars: { cream: '#fdf4e3', cream2: '#f6e3c3', ink: '#33210f', ink2: '#6b5038', ink3: '#9a7f63', rose: '#d9472b', g: '#a2541c', gl: '#e39a2d', card: '#fffdf7', deep: '#3d2412', deep2: '#7a3a16', heroA: '#ffdca0', heroB: '#fde9d2', heroC: '#e6efcb', btn: '#a2481a', btnInk: '#ffffff' },
      hero: { pal: ['#e39a2d', '#c8742e', '#f2c94c', '#6fa36b', '#fffaf0', '#d9472b'], dots: ['#f2c94c', '#e39a2d', '#6fa36b', '#ffffff'], sky: '#fff3dc', ground: '#d9a866', point: '#ffc070' },
      style: { font: 'round', radius: 'soft', hero: 'split', grid: 'cards', button: 'solid', texture: 'paper' },
    },
    profile: {
      avatar: '華', volume: 58, aiName: '小華', region: '高雄市苓雅區',
      staff: [
        { name: '阿華', title: '負責人・主廚（董事酬勞）', kind: 'owner', pay: 45000 },
        { name: '小青', title: '打菜外場・兼職', kind: 'part', pay: 16000, level: 16500, hours: 80, hourly: 200 },
      ],
      suppliers: [
        { item: '白米、雜糧', vendor: '豐收米行（虛構）', base: 12000 },
        { item: '雞腿、排骨、鯖魚', vendor: '好肉肉品行（虛構）', base: 36000 },
        { item: '當日青菜、雞蛋', vendor: '果菜市場批發（虛構）', base: 16000 },
        { item: '紙餐盒、筷子、提袋', vendor: '環保餐盒行（虛構）', base: 5200 },
      ],
      fixed: { rent: 22000, utility: 9000, ads: 3000, depreciation: 2500, equip: '大型電鍋與炸爐' },
      rd: [['新菜試作', '秋季限定滷肉便當試作', '自家採購', 1800, '電子發票', 10]],
      channels: { web: 0.12, line: 0.30, pos: 0.40, phone: 0.14, whatsapp: 0, zalo: 0, messenger: 0.04 },
      langs: { zh: 0.94, en: 0.04, ja: 0.02 },
    },
  },

  // 2. 早午餐店
  {
    merchant: {
      id: 'brunch', name: '晨光慢慢早午餐', en: 'Slow Morning Brunch', type: 'brunch', cat: 'food',
      typeName: '早午餐店', owner: '小晴', theme: 'brunch', tagline: '睡飽了，再來吃早餐',
      products: [
        P('br-big', '經典大早餐', 'Big Classic Breakfast', '1 份', 260, 105, 30, '厚片吐司、太陽蛋、德腸與沙拉。', 'Thick toast, sunny egg, sausage and salad.', 'g1_toast', '#f6b72a', '#e8573b'),
        P('br-bene', '酪梨班尼迪克蛋', 'Avocado Eggs Benedict', '1 份', 280, 115, 24, '水波蛋配酪梨，荷蘭醬現做。', 'Poached egg, avocado, fresh hollandaise.', 'g1_toast', '#f2c14e', '#7fae4f'),
        P('br-pancake', '蜂蜜厚鬆餅', 'Honey Fluffy Pancakes', '1 份', 200, 62, 30, '三層厚鬆餅，淋上在地龍眼蜜。', 'Three fluffy layers with local longan honey.', 'g1_pancake', '#e6a54a', '#c8722a'),
        P('br-french', '法式莓果吐司', 'Berry French Toast', '1 份', 180, 58, 28, '布里歐吐司煎到金黃，佐莓果醬。', 'Golden brioche toast with berry compote.', 'g1_pancake', '#d39b52', '#a8324a'),
        P('br-latte', '冰拿鐵', 'Iced Latte', '1 杯', 110, 28, 50, '自家配方豆，鮮奶分層。', 'House blend espresso over fresh milk.', 'cup', '#7a4a2a', '#f4e3c8'),
        P('br-oj', '鮮榨柳橙汁', 'Fresh Orange Juice', '1 杯', 120, 40, 30, '現點現榨，不加糖不加水。', 'Squeezed to order, no sugar or water.', 'g1_juice', '#ffa62b', '#5f9a3a'),
      ],
    },
    theme: {
      id: 'brunch', kind: 'base', name: N('晨光奶油', 'Morning Butter', '朝のバター', 'Bơ buổi sáng', 'Mentega Pagi'), deco: 'sparkle', dark: false,
      vars: { cream: '#fffaee', cream2: '#fdefc6', ink: '#2a2a1c', ink2: '#5e5a44', ink3: '#8f8a70', rose: '#f07c5a', g: '#5f7f4a', gl: '#8fb26b', card: '#ffffff', deep: '#2f3b26', deep2: '#5f7f4a', heroA: '#ffe7a0', heroB: '#ffd8c8', heroC: '#e3efd2', btn: '#f2b632', btnInk: '#2a2108' },
      hero: { pal: ['#f6b72a', '#f07c5a', '#8fb26b', '#fff3c4', '#e6a54a', '#ffffff'], dots: ['#f6b72a', '#f07c5a', '#8fb26b', '#ffffff'], sky: '#fffbe6', ground: '#f6dca0', point: '#ffd36a' },
      style: { font: 'serif', radius: 'round', hero: 'center', grid: 'magazine', button: 'pill', texture: 'none' },
    },
    profile: {
      avatar: '晴', volume: 36, aiName: '小晴', region: '台北市大安區',
      staff: [
        { name: '小晴', title: '負責人・主廚（董事酬勞）', kind: 'owner', pay: 48000 },
        { name: '小米', title: '外場・兼職', kind: 'part', pay: 17600, level: 17880, hours: 88, hourly: 200 },
      ],
      suppliers: [
        { item: '吐司、布里歐麵包', vendor: '晨麥烘焙坊（虛構）', base: 15000 },
        { item: '雞蛋、鮮奶、蔬果', vendor: '鮮農食材（虛構）', base: 24000 },
        { item: '咖啡豆', vendor: '山丘咖啡豆商（虛構）', base: 7000 },
        { item: '德腸、培根', vendor: '好肉肉品行（虛構）', base: 9000 },
      ],
      fixed: { rent: 35000, utility: 8000, ads: 5000, depreciation: 3500, equip: '商用咖啡機與煎台' },
      rd: [['新品試作', '季節水果鬆餅試作', '自家採購', 2200, '電子發票', 12]],
      channels: { web: 0.18, line: 0.26, pos: 0.38, phone: 0.06, whatsapp: 0.02, zalo: 0, messenger: 0.10 },
      langs: { zh: 0.80, en: 0.12, ja: 0.08 },
    },
  },

  // 3. 滷味攤
  {
    merchant: {
      id: 'luwei', name: '阿德夜市滷味', en: "Ade's Night Market Luwei", type: 'luwei', cat: 'food',
      typeName: '滷味攤', owner: '阿德', theme: 'luwei', tagline: '一鍋老滷，滷了二十年',
      products: [
        P('lw-combo', '招牌綜合滷味', 'Signature Luwei Combo', '1 份', 150, 60, 50, '豆干、百頁、米血、海帶、青菜。', 'Tofu, tofu skin, rice cake, kelp and greens.', 'g1_luwei', '#8a4a1c', '#d6332a'),
        P('lw-tofu', '百頁豆腐', 'Braised Tofu Slices', '1 份', 35, 11, 80, '吸飽滷汁，一口咬下會爆汁。', 'Soaks up the braise, bursts with flavour.', 'g1_luwei', '#c8913e', '#d6332a'),
        P('lw-egg', '慢滷滷蛋 2 顆', 'Slow-braised Eggs ×2', '2 顆', 30, 9, 60, '慢滷三天，越嚼越香。', 'Braised for three days, richer every bite.', 'g1_egg', '#7a4220', '#f0a531'),
        P('lw-duck', '滷鴨翅 2 隻', 'Braised Duck Wings ×2', '2 隻', 70, 30, 40, '甘甜微辣，追劇良伴。', 'Sweet and mildly spicy, a perfect snack.', 'g1_luwei', '#6b3412', '#f2c14e'),
        P('lw-veg', '滷汁燙青菜', 'Blanched Greens', '1 份', 40, 12, 60, '當季青菜，淋上滷汁與蒜末。', 'Seasonal greens with braising sauce and garlic.', 'g1_luwei', '#4f7a2e', '#d6332a'),
        P('lw-pack', '真空滷味包', 'Vacuum-packed Luwei', '1 包（600g）', 380, 160, 30, '冷凍宅配，回家加熱就能吃。', 'Frozen delivery, just heat and eat.', 'pack', '#7a3412', '#e9c46a'),
      ],
    },
    theme: {
      id: 'luwei', kind: 'base', name: N('夜市滷香', 'Night Market Braise', '夜市の煮込み', 'Đồ kho chợ đêm', 'Rebusan Pasar Malam'), deco: 'redlantern', dark: false,
      vars: { cream: '#efe2c8', cream2: '#e3cfa9', ink: '#24140a', ink2: '#57392a', ink3: '#86684c', rose: '#c8102e', g: '#7b3f12', gl: '#c9802a', card: '#f8efdc', deep: '#1e110a', deep2: '#7d1a16', heroA: '#e9b97a', heroB: '#f3d9a9', heroC: '#e7a98a', btn: '#b5121b', btnInk: '#ffffff' },
      hero: { pal: ['#8a4a1c', '#c8913e', '#d6332a', '#f2c14e', '#4f7a2e', '#3a2626'], dots: ['#d6332a', '#f2c14e', '#c8913e', '#ffffff'], sky: '#fbe7c4', ground: '#b9824a', point: '#ff8a4a' },
      style: { font: 'condensed', radius: 'sharp', hero: 'banner', grid: 'list', button: 'block', texture: 'grain' },
    },
    profile: {
      avatar: '德', volume: 48, aiName: '小德', region: '台中市北區',
      staff: [
        { name: '阿德', title: '負責人・滷味師傅（董事酬勞）', kind: 'owner', pay: 42000 },
        { name: '小玉', title: '夜班夾料・兼職', kind: 'part', pay: 14400, level: 14700, hours: 72, hourly: 200 },
      ],
      suppliers: [
        { item: '豆干、百頁、米血', vendor: '大豆豆製品行（虛構）', base: 21000 },
        { item: '鴨翅、雞蛋', vendor: '鴨鴨禽肉批發（虛構）', base: 15000 },
        { item: '青菜、海帶', vendor: '果菜市場批發（虛構）', base: 8000 },
        { item: '滷包香料、醬油', vendor: '老街南北貨（虛構）', base: 5500 },
      ],
      fixed: { rent: 12000, utility: 5200, ads: 1500, depreciation: 1500, equip: '滷鍋與攤車' },
      rd: [['新品試作', '麻辣滷汁配方試作', '自家採購', 1600, '電子發票', 18]],
      channels: { web: 0.08, line: 0.18, pos: 0.58, phone: 0.10, whatsapp: 0.01, zalo: 0, messenger: 0.05 },
      langs: { zh: 0.90, en: 0.05, ja: 0.05 },
    },
  },

  // 4. 手工水餃
  {
    merchant: {
      id: 'dumpling', name: '秀姨手工水餃', en: "Auntie Xiu's Dumplings", type: 'dumpling', cat: 'food',
      typeName: '手工水餃', owner: '秀姨', theme: 'dumpling', tagline: '每一顆都是手捏的',
      products: [
        P('dp-cabbage', '高麗菜豬肉水餃', 'Cabbage & Pork Dumplings', '10 顆', 80, 32, 60, '高麗菜現切，皮Q肉多汁。', 'Fresh-cut cabbage, chewy skin, juicy filling.', 'g1_dumpling', '#f7f3ea', '#6fa36b'),
        P('dp-leek', '韭菜豬肉水餃', 'Chive & Pork Dumplings', '10 顆', 80, 32, 60, '韭菜香濃，老客人最愛。', 'Fragrant chives, a regulars’ favourite.', 'g1_dumpling', '#f2efe2', '#3f8a3a'),
        P('dp-shrimp', '鮮蝦水餃', 'Shrimp Dumplings', '10 顆', 120, 56, 40, '整尾鮮蝦，皮薄透著橘紅。', 'Whole shrimp, thin skin with a rosy glow.', 'g1_dumpling', '#fbe9df', '#ff8a6b'),
        P('dp-potsticker', '煎鍋貼 10 個', 'Pan-fried Potstickers ×10', '10 個', 90, 36, 40, '底部煎得金黃酥脆。', 'Golden and crispy on the bottom.', 'g1_dumpling', '#efcf86', '#5fae4a'),
        P('dp-frozen', '冷凍水餃 50 顆', 'Frozen Dumplings ×50', '50 顆', 380, 170, 30, '急速冷凍，下鍋煮 8 分鐘。', 'Flash-frozen, boil for 8 minutes.', 'pack', '#1f4e9a', '#f4f0e4'),
        P('dp-soup', '酸辣湯', 'Hot & Sour Soup', '1 碗', 45, 14, 50, '豆腐、木耳、蛋花，酸辣剛好。', 'Tofu, wood ear and egg, perfectly tangy.', 'g1_soup', '#b5662a', '#e8573b'),
      ],
    },
    theme: {
      id: 'dumpling', kind: 'base', name: N('青花瓷', 'Blue Porcelain', '青花磁器', 'Sứ men lam', 'Porselin Biru'), deco: null, dark: false,
      vars: { cream: '#f7f9fc', cream2: '#e5ecf6', ink: '#13284a', ink2: '#445a7c', ink3: '#7d8ca6', rose: '#d6453d', g: '#1f4e9a', gl: '#3d74c4', card: '#ffffff', deep: '#0f2347', deep2: '#1f4e9a', heroA: '#d6e4f7', heroB: '#fff4e3', heroC: '#e9eef7', btn: '#1f4e9a', btnInk: '#ffffff' },
      hero: { pal: ['#f7f3ea', '#3d74c4', '#1f4e9a', '#d6453d', '#efcf86', '#ffffff'], dots: ['#3d74c4', '#ffffff', '#d6453d', '#c6d2e2'], sky: '#f2f7ff', ground: '#c6d6ee', point: '#a8c4ff' },
      style: { font: 'hand', radius: 'soft', hero: 'minimal', grid: 'tiles', button: 'outline', texture: 'grid' },
    },
    profile: {
      avatar: '秀', volume: 52, aiName: '小秀', region: '新北市永和區',
      staff: [
        { name: '秀姨', title: '負責人・包餃師傅（董事酬勞）', kind: 'owner', pay: 40000 },
        { name: '阿芬', title: '包餃內場・全職', kind: 'full', pay: 30000, level: 30300 },
      ],
      suppliers: [
        { item: '豬絞肉、鮮蝦', vendor: '好肉肉品行（虛構）', base: 20000 },
        { item: '麵粉', vendor: '金麥麵粉行（虛構）', base: 4800 },
        { item: '高麗菜、韭菜、蔥薑', vendor: '果菜市場批發（虛構）', base: 7600 },
        { item: '冷凍包裝袋、外帶盒', vendor: '好包裝材料行（虛構）', base: 3800 },
      ],
      fixed: { rent: 16000, utility: 6200, ads: 2000, depreciation: 1600, equip: '冷凍櫃與攪餡機' },
      rd: [['新品試作', '玉米豬肉口味試作', '自家採購', 1200, '電子發票', 7]],
      channels: { web: 0.16, line: 0.28, pos: 0.42, phone: 0.10, whatsapp: 0, zalo: 0, messenger: 0.04 },
      langs: { zh: 0.92, en: 0.04, ja: 0.04 },
    },
  },

  // 5. 拉麵小店
  {
    merchant: {
      id: 'ramen', name: '夜燈拉麵', en: 'Night Lamp Ramen', type: 'ramen', cat: 'food',
      typeName: '拉麵小店', owner: '阿哲', theme: 'ramen', tagline: '一碗湯，熬足十八小時',
      products: [
        P('rm-tonkotsu', '濃厚豚骨拉麵', 'Rich Tonkotsu Ramen', '1 碗', 260, 96, 40, '豬骨熬 18 小時，湯頭乳白濃郁。', 'Pork bone broth simmered 18 hours, creamy and rich.', 'g1_ramen', '#f1dfbf', '#d6332a'),
        P('rm-shoyu', '醬油雞湯拉麵', 'Shoyu Chicken Ramen', '1 碗', 240, 86, 40, '雞湯配特調醬油，清爽回甘。', 'Chicken broth with house soy tare, clean finish.', 'g1_ramen', '#9a5a28', '#d6332a'),
        P('rm-miso', '地獄辣味噌拉麵', 'Inferno Spicy Miso Ramen', '1 碗', 280, 100, 30, '辣度 1–5 級可選，挑戰者限定。', 'Spice level 1–5, for the brave.', 'g1_ramen', '#c8461f', '#f2a516'),
        P('rm-gyoza', '冰花煎餃 5 個', 'Crispy Gyoza ×5', '5 個', 90, 30, 40, '日式薄皮，冰花煎法。', 'Thin skin with a lacy crisp crust.', 'g1_dumpling', '#efcf86', '#7fbf4f'),
        P('rm-egg', '溏心蛋 2 顆', 'Marinated Soft Eggs ×2', '2 顆', 50, 14, 60, '醬汁醃漬一夜，蛋黃流心。', 'Marinated overnight, jammy yolk.', 'g1_egg', '#c98a4a', '#ff9a1f'),
        P('rm-chashu', '炙燒叉燒丼', 'Torched Chashu Rice Bowl', '1 碗', 130, 48, 30, '叉燒現炙，配溫泉蛋與蔥花。', 'Torched chashu with onsen egg and scallions.', 'bowl', '#f4efe4', '#c0603a'),
      ],
    },
    theme: {
      id: 'ramen', kind: 'base', name: N('深夜朱紅', 'Midnight Vermilion', '深夜の朱', 'Đỏ son đêm khuya', 'Merah Tengah Malam'), deco: 'steam', dark: true,
      vars: { cream: '#16110f', cream2: '#221a16', ink: '#f5ece0', ink2: '#c9b9a6', ink3: '#8e7f70', rose: '#ff5a36', g: '#ff5a36', gl: '#ff7a4d', card: '#211915', deep: '#0b0806', deep2: '#3a1510', heroA: '#4a1e14', heroB: '#2a201a', heroC: '#3d2a12', btn: '#ff5a36', btnInk: '#120806' },
      hero: { pal: ['#ff5a36', '#f1dfbf', '#1c1a1a', '#f29a1f', '#7fbf4f', '#c8461f'], dots: ['#ff5a36', '#f2a516', '#ffffff', '#f1dfbf'], sky: '#ffcfa0', ground: '#2a1a14', point: '#ff6a3d', dim: true },
      style: { font: 'condensed', radius: 'sharp', hero: 'poster', grid: 'magazine', button: 'block', texture: 'lines' },
    },
    profile: {
      avatar: '哲', volume: 42, aiName: '小哲', region: '台北市松山區',
      staff: [
        { name: '阿哲', title: '負責人・主廚（董事酬勞）', kind: 'owner', pay: 55000 },
        { name: '小林', title: '煮麵內場・全職', kind: 'full', pay: 32000, level: 33300 },
        { name: '小宇', title: '外場・兼職', kind: 'part', pay: 16000, level: 16500, hours: 80, hourly: 200 },
      ],
      suppliers: [
        { item: '豬骨、雞骨架', vendor: '好肉肉品行（虛構）', base: 28000 },
        { item: '生拉麵', vendor: '細麵製麵所（虛構）', base: 16000 },
        { item: '叉燒用豬五花、雞蛋', vendor: '鮮農食材（虛構）', base: 24000 },
        { item: '醬油、味噌、海苔', vendor: '東洋食材行（虛構）', base: 8000 },
      ],
      fixed: { rent: 38000, utility: 14000, ads: 4000, depreciation: 5000, equip: '湯桶爐與煮麵機' },
      rd: [['新菜試作', '冬季限定柚子鹽味拉麵試作', '自家採購', 2600, '電子發票', 5]],
      channels: { web: 0.12, line: 0.20, pos: 0.52, phone: 0.06, whatsapp: 0.02, zalo: 0, messenger: 0.08 },
      langs: { zh: 0.70, en: 0.12, ja: 0.18 },
    },
  },

  // 6. 私廚外燴
  {
    merchant: {
      id: 'chef', name: '山海私廚', en: 'Shanhai Private Kitchen', type: 'chef', cat: 'food',
      typeName: '私廚外燴', owner: '阿凱', theme: 'chef', tagline: '把餐廳搬進你家',
      products: [
        P('cf-home', '到府私廚 4 人套餐', 'Private Chef at Home (4 pax)', '1 場（4 人）', 6800, 3000, 8, '七道菜，主廚到府現做現上。', 'Seven courses cooked and served at your home.', 'g1_cloche', '#c9ccd2', '#b08d57'),
        P('cf-buffet', '外燴自助餐 20 人', 'Catering Buffet (20 pax)', '1 場（20 人）', 16000, 7600, 4, '公司活動、家族聚會，含擺設。', 'For company events and family parties, setup included.', 'g1_platter', '#a0703f', '#6fa36b'),
        P('cf-box', '精緻餐盒 10 份', 'Gourmet Meal Boxes ×10', '10 份', 2800, 1300, 12, '會議講座首選，請三天前預訂。', 'Ideal for meetings, order 3 days ahead.', 'g1_bento', '#b5552c', '#7f9a5a'),
        P('cf-class', '料理小班課', 'Small-group Cooking Class', '1 堂（3 小時）', 1800, 600, 10, '六人小班，學會三道宴客菜。', 'Six per class, learn three party dishes.', 'g1_cloche', '#e2d6bd', '#3b4a3f'),
        P('cf-xo', '主廚 XO 醬', "Chef's XO Sauce", '1 罐（180g）', 480, 170, 30, '干貝、火腿慢火炒製。', 'Dried scallops and ham, slow-fried.', 'bottle', '#8a2f1a', '#b08d57'),
        P('cf-gift', '私廚禮券', 'Private Kitchen Gift Voucher', '1 張', 1000, 0, 50, '面額千元，一年內有效，可累加折抵。', 'NT$1,000 value, valid one year, stackable.', 'voucher', '#2b2a27', '#b08d57'),
      ],
    },
    theme: {
      id: 'chef', kind: 'base', name: N('黃銅餐桌', 'Brass Table', '真鍮のテーブル', 'Bàn đồng thau', 'Meja Loyang'), deco: null, dark: false,
      vars: { cream: '#f8f6f1', cream2: '#ece7dc', ink: '#1b1b1a', ink2: '#54514b', ink3: '#8c877d', rose: '#9a7440', g: '#3b4a3f', gl: '#b08d57', card: '#ffffff', deep: '#141414', deep2: '#2b2a27', heroA: '#e9e0cc', heroB: '#f2efe8', heroC: '#dcd6c8', btn: '#1b1b1a', btnInk: '#ffffff' },
      hero: { pal: ['#b08d57', '#c9ccd2', '#3b4a3f', '#e9e0cc', '#1b1b1a', '#8a2f1a'], dots: ['#b08d57', '#ffffff', '#c9ccd2', '#e9e0cc'], sky: '#fbf8f2', ground: '#d6ccb8', point: '#ffd9a0' },
      style: { font: 'sans', radius: 'sharp', hero: 'split', grid: 'cards', button: 'outline', texture: 'none' },
    },
    profile: {
      avatar: '凱', volume: 3, aiName: '小凱', region: '台南市東區',
      staff: [
        { name: '阿凱', title: '負責人・主廚（董事酬勞）', kind: 'owner', pay: 60000 },
        { name: '小蘋', title: '外燴助理・兼職', kind: 'part', pay: 16000, level: 16500, hours: 80, hourly: 200 },
      ],
      suppliers: [
        { item: '海鮮、干貝', vendor: '安平漁貨行（虛構）', base: 32000 },
        { item: '牛肉、豬肉、雞肉', vendor: '好肉肉品行（虛構）', base: 22000 },
        { item: '有機蔬果', vendor: '鮮農食材（虛構）', base: 9000 },
        { item: '餐具、保溫箱租借', vendor: '宴會器材租賃（虛構）', base: 6500 },
      ],
      fixed: { rent: 20000, utility: 7000, ads: 8000, depreciation: 4000, equip: '中央廚房設備與保溫餐車' },
      rd: [['菜單開發', '秋冬宴客新菜單試作', '自家採購', 5200, '電子發票', 14], ['訓練費', '法式料理進修課程', '料理學苑（虛構）', 8000, '收據', 22]],
      channels: { web: 0.30, line: 0.34, pos: 0.02, phone: 0.16, whatsapp: 0.05, zalo: 0, messenger: 0.13 },
      langs: { zh: 0.86, en: 0.10, ja: 0.04 },
    },
  },

  // 7. 手搖茶飲
  {
    merchant: {
      id: 'bubbletea', name: '泡泡手搖', en: 'Bubble Pop Tea', type: 'bubbletea', cat: 'drink',
      typeName: '手搖茶飲', owner: '小芊', theme: 'bubbletea', tagline: '今天也要好心情',
      products: [
        P('bb-pearl', '黑糖珍珠鮮奶', 'Brown Sugar Boba Milk', '1 杯（700ml）', 75, 24, 80, '黑糖現炒珍珠，每 2 小時煮一鍋。', 'Brown sugar pearls, freshly cooked every 2 hours.', 'g1_bubble', '#ead8c2', '#3a2014'),
        P('bb-four', '四季春青茶', 'Four Seasons Oolong', '1 杯（700ml）', 40, 9, 100, '清香回甘，甜度冰塊可調。', 'Floral and smooth, adjust sugar and ice.', 'g1_bubble', '#e6d27a', '#f7f1c8'),
        P('bb-taro', '芋泥波波鮮奶', 'Taro Boba Milk', '1 杯（700ml）', 85, 30, 60, '芋頭手壓成泥，綿密香甜。', 'Hand-mashed taro, creamy and sweet.', 'g1_bubble', '#c9a6e0', '#3a2014'),
        P('bb-mango', '芒果冰沙', 'Mango Smoothie', '1 杯（700ml）', 90, 32, 50, '當季芒果現打，夏天限定。', 'Fresh seasonal mango, summer only.', 'g1_bubble', '#ffb627', '#fff3c4'),
        P('bb-grapefruit', '葡萄柚綠茶', 'Grapefruit Green Tea', '1 杯（700ml）', 70, 22, 60, '整顆葡萄柚果肉，酸甜清爽。', 'Whole grapefruit pulp, sweet and tangy.', 'g1_bubble', '#ff8f7a', '#ffd9cf'),
        P('bb-ticket', '飲料兌換券 10 杯', 'Drink Pass ×10', '10 杯', 600, 220, 40, '一年內有效，可分次兌換。', 'Valid one year, redeem any time.', 'g1_ticket', '#7b4bb7', '#ff6fa3'),
      ],
    },
    theme: {
      id: 'bubbletea', kind: 'base', name: N('芋泥泡泡', 'Taro Pop', 'タロイモポップ', 'Khoai môn bong bóng', 'Keladi Pop'), deco: 'bubble', dark: false,
      vars: { cream: '#fbf5ff', cream2: '#efe1fb', ink: '#2c1838', ink2: '#604c75', ink3: '#9584a8', rose: '#ff5f97', g: '#7b4bb7', gl: '#a77de0', card: '#ffffff', deep: '#3b1f4f', deep2: '#6b3a2a', heroA: '#e5d0ff', heroB: '#ffe0c2', heroC: '#ffd6e7', btn: '#6b3fa0', btnInk: '#ffffff' },
      hero: { pal: ['#c9a6e0', '#ff7aa8', '#3a2014', '#ffb627', '#ead8c2', '#a77de0'], dots: ['#ff7aa8', '#a77de0', '#3a2014', '#ffffff', '#ffb627'], sky: '#fff5fc', ground: '#e6d0f7', point: '#ff9ac0' },
      style: { font: 'round', radius: 'pill', hero: 'poster', grid: 'tiles', button: 'pill', texture: 'dots' },
    },
    profile: {
      avatar: '芊', volume: 60, aiName: '小芊', region: '台中市西屯區',
      staff: [
        { name: '小芊', title: '負責人・調飲師（董事酬勞）', kind: 'owner', pay: 40000 },
        { name: '小柔', title: '吧台・兼職', kind: 'part', pay: 17600, level: 17880, hours: 88, hourly: 200 },
      ],
      suppliers: [
        { item: '茶葉', vendor: '翠峰茶葉批發（虛構）', base: 7500 },
        { item: '鮮奶', vendor: '牧場直送乳品（虛構）', base: 15000 },
        { item: '黑糖、粉圓、芋頭', vendor: '甜甜原物料行（虛構）', base: 7000 },
        { item: '杯子、封膜、吸管', vendor: '環保餐盒行（虛構）', base: 6800 },
      ],
      fixed: { rent: 25000, utility: 7200, ads: 3000, depreciation: 3000, equip: '封口機與製冰機' },
      rd: [['新品試作', '冬季熱飲新品試作', '自家採購', 1500, '電子發票', 9]],
      channels: { web: 0.14, line: 0.20, pos: 0.52, phone: 0.04, whatsapp: 0.02, zalo: 0.01, messenger: 0.07 },
      langs: { zh: 0.86, en: 0.08, ja: 0.06 },
    },
  },

  // 8. 茶行
  {
    merchant: {
      id: 'teahouse', name: '山霧茶行', en: 'Mountain Mist Tea House', type: 'teahouse', cat: 'drink',
      typeName: '茶行（台灣茶葉）', owner: '林伯', theme: 'teahouse', tagline: '一泡好茶，慢慢回甘',
      products: [
        P('th-dongding', '凍頂烏龍', 'Dong Ding Oolong', '150g', 680, 280, 30, '中焙炭香，焙火三次。', 'Medium charcoal roast, roasted three times.', 'g1_teatin', '#3e5a34', '#efe4c8'),
        P('th-highmt', '高山烏龍', 'High Mountain Oolong', '150g', 980, 430, 24, '海拔一千五百公尺，清香花韻。', 'Grown at 1,500 m, floral and clear.', 'g1_teatin', '#5f8a4a', '#f4ecd8'),
        P('th-ruby', '紅玉紅茶', 'Ruby Black Tea', '75g', 560, 210, 30, '帶天然肉桂與薄荷香氣。', 'Natural notes of cinnamon and mint.', 'g1_teatin', '#8a2a1f', '#f2e2c8'),
        P('th-beauty', '東方美人茶', 'Oriental Beauty Tea', '75g', 1280, 560, 12, '蜜香熟果味，茶湯琥珀色。', 'Honey and ripe fruit, amber liquor.', 'g1_teatin', '#b5822a', '#f6ecd6'),
        P('th-coldbrew', '冷泡茶包 15 入', 'Cold Brew Tea Bags ×15', '15 入', 320, 110, 50, '冷水泡 6 小時，上班族好方便。', 'Steep in cold water for 6 hours, easy for work.', 'g1_teabag', '#6f8f3a', '#b23a2a'),
        P('th-set', '旅行茶具組', 'Travel Tea Set', '1 組', 1680, 760, 10, '一壺二杯附收納袋，露營也能泡。', 'One pot, two cups and a pouch, great for camping.', 'g1_teapot', '#8a4a2a', '#f4efe4'),
      ],
    },
    theme: {
      id: 'teahouse', kind: 'base', name: N('山霧茶香', 'Misty Tea Hills', '霧の茶山', 'Đồi chè sương mù', 'Bukit Teh Berkabus'), deco: 'leaf', dark: false,
      vars: { cream: '#f3f0e4', cream2: '#e5dfc8', ink: '#1c2219', ink2: '#4b5445', ink3: '#7f8875', rose: '#9c3b2a', g: '#4f6b3a', gl: '#7f9a5a', card: '#fbf9f1', deep: '#1f2a1c', deep2: '#3e4a2f', heroA: '#dce4c6', heroB: '#efe6cf', heroC: '#d4dac0', btn: '#2e3a26', btnInk: '#ffffff' },
      hero: { pal: ['#4f6b3a', '#8a4a2a', '#efe4c8', '#7f9a5a', '#b5822a', '#9c3b2a'], dots: ['#7f9a5a', '#efe4c8', '#ffffff', '#b5822a'], sky: '#f4f6ec', ground: '#a9b88a', point: '#ffe0a0' },
      style: { font: 'serif', radius: 'sharp', hero: 'minimal', grid: 'list', button: 'outline', texture: 'paper' },
    },
    profile: {
      avatar: '林', volume: 8, aiName: '小茶', region: '南投縣鹿谷鄉',
      staff: [
        { name: '林伯', title: '負責人・焙茶師（董事酬勞）', kind: 'owner', pay: 45000 },
        { name: '阿萍', title: '包裝出貨・兼職', kind: 'part', pay: 14400, level: 14700, hours: 72, hourly: 200 },
      ],
      suppliers: [
        { item: '烏龍、紅茶毛茶', vendor: '合作茶農產銷班（虛構）', base: 48000 },
        { item: '茶罐、茶包袋、禮盒', vendor: '好包裝材料行（虛構）', base: 7500 },
        { item: '宅配運費', vendor: '綠野物流（虛構）', base: 5200 },
      ],
      fixed: { rent: 15000, utility: 4800, ads: 5000, depreciation: 3000, equip: '焙茶機與真空包裝機' },
      rd: [['新品開發', '蜜香紅茶冷泡包試作', '自家採購', 2800, '電子發票', 16]],
      channels: { web: 0.38, line: 0.24, pos: 0.16, phone: 0.06, whatsapp: 0.06, zalo: 0, messenger: 0.10 },
      langs: { zh: 0.65, en: 0.10, ja: 0.25 },
    },
  },

  // 9. 精釀啤酒
  {
    merchant: {
      id: 'craftbeer', name: '麥浪精釀', en: 'Barley Wave Brewing', type: 'craftbeer', cat: 'drink',
      typeName: '精釀啤酒', owner: '阿傑', theme: 'craftbeer', tagline: '小鍋釀造，每批都編號',
      products: [
        P('cb-ipa', '柑橘 IPA', 'Citrus IPA', '330ml', 160, 62, 80, '柑橘與松針香，苦韻俐落。', 'Citrus and pine notes, clean bitter finish.', 'g1_can', '#f2a516', '#2f5d3a'),
        P('cb-wheat', '小麥白啤', 'Wheat Beer', '330ml', 150, 56, 80, '香蕉與丁香氣息，口感輕盈。', 'Banana and clove aromas, light body.', 'g1_can', '#f4e3a1', '#3d74c4'),
        P('cb-stout', '燕麥司陶特', 'Oatmeal Stout', '330ml', 170, 66, 60, '可可與咖啡烘焙香，泡沫綿密。', 'Cocoa and roasted coffee, creamy head.', 'bottle', '#2a1a10', '#f2a516'),
        P('cb-sour', '芭樂酸啤', 'Guava Sour', '330ml', 180, 72, 50, '在地紅心芭樂發酵，酸香爽口。', 'Fermented with local pink guava, bright and tart.', 'g1_can', '#ff8fa3', '#4f9a5e'),
        P('cb-flight', '品飲 4 杯組', 'Tasting Flight ×4', '4 杯', 320, 110, 30, '店內現場品飲。未成年請勿飲酒。', 'Taproom tasting. No alcohol for minors.', 'g1_pint', '#e0902a', '#5a3c0c'),
        P('cb-box', '精釀 6 入禮盒', 'Craft Beer Gift Box ×6', '6 入', 920, 380, 24, '六罐綜合。禁止酒駕，未成年請勿飲酒。', 'Six mixed cans. Don’t drink and drive; adults only.', 'g1_can', '#c8461f', '#f4ead2'),
      ],
    },
    theme: {
      id: 'craftbeer', kind: 'base', name: N('琥珀酒窖', 'Amber Cellar', '琥珀の酒蔵', 'Hầm bia hổ phách', 'Bilik Bir Ambar'), deco: 'bubble', dark: true,
      vars: { cream: '#1a1610', cream2: '#262016', ink: '#f4ead2', ink2: '#cdbf9e', ink3: '#94886d', rose: '#9ad15f', g: '#f2a516', gl: '#ffc53d', card: '#231d14', deep: '#0d0a06', deep2: '#3a2a10', heroA: '#5a3c0c', heroB: '#2b2a14', heroC: '#3e2c12', btn: '#f2a516', btnInk: '#1a1206' },
      hero: { pal: ['#f2a516', '#ffc53d', '#9ad15f', '#c8461f', '#f4ead2', '#2a1a10'], dots: ['#ffc53d', '#ffffff', '#9ad15f', '#f2a516'], sky: '#ffe2a0', ground: '#2b2010', point: '#ffb347', dim: true },
      style: { font: 'mono', radius: 'soft', hero: 'banner', grid: 'cards', button: 'block', texture: 'grain' },
    },
    profile: {
      avatar: '麥', volume: 12, aiName: '小麥', region: '宜蘭縣羅東鎮',
      staff: [
        { name: '阿傑', title: '負責人・釀酒師（董事酬勞）', kind: 'owner', pay: 50000 },
        { name: '小涵', title: '酒吧外場・兼職', kind: 'part', pay: 12800, level: 13500, hours: 64, hourly: 200 },
      ],
      suppliers: [
        { item: '麥芽', vendor: '金穗麥芽進口（虛構）', base: 16000 },
        { item: '啤酒花、酵母', vendor: '綠花原料行（虛構）', base: 11000 },
        { item: '鋁罐、瓶蓋、標籤', vendor: '晶亮包材（虛構）', base: 8500 },
        { item: '冷藏宅配', vendor: '綠野冷鏈物流（虛構）', base: 5600 },
      ],
      fixed: { rent: 28000, utility: 12000, ads: 6000, depreciation: 12000, equip: '500 公升釀造槽與發酵桶' },
      rd: [['新酒試釀', '金桔小麥啤酒試釀', '自家採購', 4800, '電子發票', 11]],
      channels: { web: 0.34, line: 0.22, pos: 0.26, phone: 0.04, whatsapp: 0.04, zalo: 0, messenger: 0.10 },
      langs: { zh: 0.74, en: 0.20, ja: 0.06 },
    },
  },

  // 10. 冷壓果汁
  {
    merchant: {
      id: 'juice', name: '日日冷壓果汁', en: 'Daily Press Juicery', type: 'juice', cat: 'drink',
      typeName: '冷壓果汁', owner: '小橙', theme: 'juice', tagline: '每天早上，現壓現送',
      products: [
        P('jc-green', '羽衣甘藍蘋果綠', 'Kale & Apple Green', '350ml', 150, 56, 40, '蘋果的甜中和甘藍，順口好喝。', 'Sweet apple balances kale, easy to drink.', 'g1_juice', '#7cc242', '#2f7a2a'),
        P('jc-beet', '甜菜根莓果', 'Beet & Berry', '350ml', 150, 58, 40, '莓果酸甜，顏色超漂亮。', 'Sweet-tart berries with a stunning colour.', 'g1_juice', '#b0204a', '#4f9a5e'),
        P('jc-carrot', '鮮橙紅蘿蔔', 'Orange & Carrot', '350ml', 130, 48, 50, '在地柳丁搭紅蘿蔔，香甜滑順。', 'Local oranges with carrot, sweet and smooth.', 'g1_juice', '#ff8a1f', '#3f8a3a'),
        P('jc-pine', '鳳梨薄荷', 'Pineapple Mint', '350ml', 140, 50, 40, '在地鳳梨配新鮮薄荷，清涼解渴。', 'Local pineapple with fresh mint, refreshing.', 'g1_juice', '#f7d33b', '#3fae6a'),
        P('jc-ginger', '薑黃檸檬小瓶', 'Turmeric Lemon Shot', '60ml', 65, 22, 60, '微辣酸香，一口一瓶。', 'Zesty and lightly spicy, one gulp.', 'g1_juice', '#f2b01e', '#8fb23a'),
        P('jc-box', '果汁 6 入禮盒', 'Juice Gift Box ×6', '6 瓶', 820, 320, 20, '六種口味各一瓶，冷藏宅配。', 'One of each flavour, chilled delivery.', 'g1_crate', '#c89a5e', '#ff8a1f'),
      ],
    },
    theme: {
      id: 'juice', kind: 'base', name: N('鮮榨活力', 'Fresh Squeeze', 'フレッシュ搾り', 'Ép tươi', 'Perahan Segar'), deco: 'petal', dark: false,
      vars: { cream: '#fffdf6', cream2: '#ffefd9', ink: '#1d2a12', ink2: '#4c5a40', ink3: '#86917a', rose: '#ff3d6e', g: '#d4560f', gl: '#ff9a2e', card: '#ffffff', deep: '#173d12', deep2: '#d4560f', heroA: '#ffd7a0', heroB: '#d6f5c0', heroC: '#ffd0dc', btn: '#1f7a2e', btnInk: '#ffffff' },
      hero: { pal: ['#ff8a1f', '#7cc242', '#b0204a', '#f7d33b', '#ff3d6e', '#ffffff'], dots: ['#ff8a1f', '#7cc242', '#ff3d6e', '#f7d33b', '#ffffff'], sky: '#fffbea', ground: '#ffe0b0', point: '#ffb347' },
      style: { font: 'sans', radius: 'round', hero: 'center', grid: 'tiles', button: 'solid', texture: 'none' },
    },
    profile: {
      avatar: '橙', volume: 32, aiName: '小橙', region: '台北市信義區',
      staff: [
        { name: '小橙', title: '負責人・榨汁師（董事酬勞）', kind: 'owner', pay: 42000 },
        { name: '阿綠', title: '備料配送・兼職', kind: 'part', pay: 14400, level: 14700, hours: 72, hourly: 200 },
      ],
      suppliers: [
        { item: '當季蔬果', vendor: '鮮農食材（虛構）', base: 30000 },
        { item: '玻璃瓶、瓶蓋、標籤', vendor: '晶亮玻璃（虛構）', base: 8800 },
        { item: '冷藏宅配', vendor: '綠野冷鏈物流（虛構）', base: 6200 },
      ],
      fixed: { rent: 20000, utility: 6200, ads: 5000, depreciation: 3500, equip: '冷壓榨汁機與冷藏櫃' },
      rd: [['新品試作', '芭樂百香果新口味試作', '自家採購', 1600, '電子發票', 20]],
      channels: { web: 0.36, line: 0.26, pos: 0.22, phone: 0.02, whatsapp: 0.04, zalo: 0, messenger: 0.10 },
      langs: { zh: 0.78, en: 0.16, ja: 0.06 },
    },
  },

  // 11. 小農蔬果箱
  {
    merchant: {
      id: 'veggiebox', name: '田邊小農蔬果箱', en: 'Fieldside Farm Box', type: 'veggiebox', cat: 'farm',
      typeName: '小農蔬果箱', owner: '阿田', theme: 'veggiebox', tagline: '從田裡直送你家餐桌',
      products: [
        P('vb-s', '當季蔬菜箱 S', 'Seasonal Veg Box S', '1 箱（約 3kg）', 480, 260, 30, '6–8 種當季蔬菜，兩人一週份。', '6–8 seasonal vegetables, a week for two.', 'g1_crate', '#b5824f', '#e8483b'),
        P('vb-l', '當季蔬菜箱 L', 'Seasonal Veg Box L', '1 箱（約 6kg）', 880, 480, 20, '10 種以上蔬菜，全家一週份。', '10+ vegetables, a week for the family.', 'g1_crate', '#a0703f', '#ff8a1f'),
        P('vb-fruit', '季節水果箱', 'Seasonal Fruit Box', '1 箱（約 5kg）', 980, 580, 15, '果園現採，依季節出貨。', 'Picked from the orchard, shipped by season.', 'g1_crate', '#c89a5e', '#f2c14e'),
        P('vb-sub', '每週蔬菜訂閱 4 週', 'Weekly Veg Subscription (4 wks)', '4 箱', 1800, 1020, 25, '每週二到貨，可隨時暫停。', 'Delivered every Tuesday, pause anytime.', 'g1_crate', '#8a5a34', '#d9532b'),
        P('vb-egg', '放牧雞蛋 10 顆', 'Free-range Eggs ×10', '10 顆', 180, 95, 40, '雞隻在果園散步長大。', 'Hens roam free in our orchard.', 'g1_eggbox', '#c9a77a', '#f3e3cc'),
        P('vb-rice', '友善耕作糙米', 'Eco-farmed Brown Rice', '2kg', 360, 190, 30, '不灑除草劑，田間手工除草。', 'No herbicides, weeded by hand.', 'g1_ricebag', '#e8dcc0', '#3f7a2a'),
      ],
    },
    theme: {
      id: 'veggiebox', kind: 'base', name: N('田園牛皮紙', 'Kraft Farm', 'クラフト農園', 'Nông trại giấy kraft', 'Ladang Kraf'), deco: 'leaf', dark: false,
      vars: { cream: '#f4eee0', cream2: '#e8dbc0', ink: '#232d18', ink2: '#525b44', ink3: '#858b72', rose: '#d9532b', g: '#3f7a2a', gl: '#6aa84f', card: '#fffdf6', deep: '#2f2418', deep2: '#5a4128', heroA: '#d4eabb', heroB: '#f1dfbc', heroC: '#ffd4bd', btn: '#5a4128', btnInk: '#ffffff' },
      hero: { pal: ['#6aa84f', '#e8483b', '#ff8a1f', '#c89a5e', '#f2c14e', '#3f7a2a'], dots: ['#6aa84f', '#e8483b', '#f2c14e', '#ffffff'], sky: '#f6f9e8', ground: '#b98a5e', point: '#ffd08a' },
      style: { font: 'hand', radius: 'round', hero: 'banner', grid: 'magazine', button: 'outline', texture: 'paper' },
    },
    profile: {
      avatar: '田', volume: 10, aiName: '小田', region: '花蓮縣壽豐鄉',
      staff: [
        { name: '阿田', title: '負責人・農夫（董事酬勞）', kind: 'owner', pay: 45000 },
        { name: '小禾', title: '包裝配送・全職', kind: 'full', pay: 30000, level: 30300 },
      ],
      suppliers: [
        { item: '合作小農蔬果收購', vendor: '東部小農聯盟（虛構）', base: 82000 },
        { item: '紙箱、保鮮袋', vendor: '好包裝材料行（虛構）', base: 6000 },
        { item: '冷藏宅配', vendor: '綠野冷鏈物流（虛構）', base: 21000 },
      ],
      fixed: { rent: 8000, utility: 4200, ads: 5000, depreciation: 4500, equip: '冷藏庫與貨車' },
      rd: [['產品開發', '醃漬蔬菜加工品試作', '自家採購', 2400, '電子發票', 25]],
      channels: { web: 0.42, line: 0.32, pos: 0.06, phone: 0.08, whatsapp: 0.02, zalo: 0, messenger: 0.10 },
      langs: { zh: 0.92, en: 0.06, ja: 0.02 },
    },
  },
];
