// 第 4 組：預約服務業 11 家（全部 cat:'service'）
// salon 美髮沙龍、lash 美睫、petgroom 寵物美容、photo 攝影工作室、yoga 瑜伽教室、fitness 健身私人教練、
// music 音樂才藝教室、cleaning 居家清潔、bnb 民宿、phonefix 手機維修、carcare 汽車美容
// 服務項目以時間或次數為單位；stock＝本週可預約名額（民宿為本週可訂房晚數）。所有店名、人名皆為虛構。

const N = (zh, en, ja, vi, ms) => ({ zh, en, ja, vi, ms });

// ---- 色彩與繪圖小工具（只在本檔使用）----
const toRgb = (h) => { h = String(h || '#999').replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = (r, g, b) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const x = toRgb(a), y = toRgb(b); return toHex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t); };
const dk = (c, t = 0.25) => mix(c, '#000000', t);
const lt = (c, t = 0.35) => mix(c, '#ffffff', t);
const vgrad = (id, a, b) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const hgrad = (id, a, b) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const dgrad = (id, a, b) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const shadow = (rx = 36, cy = 98) => `<ellipse cx="60" cy="${cy}" rx="${rx}" ry="${Math.max(4, rx / 6)}" fill="rgba(0,0,0,.16)"/>`;
const shine = (d, o = 0.22) => `<path d="${d}" fill="#fff" opacity="${o}"/>`;
const spark = (x, y, s, c = '#ffffff') => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -6 Q1 -1 6 0 Q1 1 0 6 Q-1 1 -6 0 Q-1 -1 0 -6Z" fill="${c}"/>`;
const bubble = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffffff" opacity=".55" stroke="#ffffff" stroke-width=".8"/><circle cx="${x - r * 0.35}" cy="${y - r * 0.35}" r="${(r * 0.28).toFixed(1)}" fill="#fff"/>`;
const f1 = (n) => n.toFixed(1);

// ---- 新增商品插圖（kind 名稱皆加 g4_ 前綴）----
export const ART = {
  // 美髮剪刀＋梳子
  g4_scissors: (u, c, a) => `<defs>${hgrad(u + 'x', '#f7f8fa', '#9aa3ad')}${dgrad(u + 'xr', lt(c, 0.15), dk(c, 0.25))}</defs>${shadow(32)}
    <g transform="translate(14 6) rotate(14 60 60)" opacity=".95">
      <rect x="70" y="30" width="12" height="62" rx="3" fill="${a}" transform="rotate(24 76 61)"/>
      ${Array.from({ length: 10 }, (_, i) => `<rect x="63" y="${36 + i * 5}" width="6" height="2.2" rx="1" fill="${a}" transform="rotate(24 76 61)"/>`).join('')}
    </g>
    <path d="M58 62 L33 16 Q31 13 32 18 L54 66 Z" fill="url(#${u}x)"/>
    <path d="M62 62 L87 16 Q89 13 88 18 L66 66 Z" fill="url(#${u}x)"/>
    <path d="M58 62 L33 16 L35 20 L58 64 Z" fill="#ffffff" opacity=".6"/>
    <path d="M57 64 L46 76" stroke="url(#${u}xr)" stroke-width="7" stroke-linecap="round"/>
    <path d="M63 64 L74 76" stroke="url(#${u}xr)" stroke-width="7" stroke-linecap="round"/>
    <circle cx="42" cy="83" r="10.5" fill="none" stroke="url(#${u}xr)" stroke-width="6.5"/>
    <circle cx="78" cy="83" r="10.5" fill="none" stroke="url(#${u}xr)" stroke-width="6.5"/>
    <path d="M70 76 q-6 -10 2 -16" fill="none" stroke="${dk(c, 0.2)}" stroke-width="3" stroke-linecap="round"/>
    <path d="M35 77 a9 9 0 0 1 9 -4" fill="none" stroke="#fff" stroke-width="2" opacity=".55" stroke-linecap="round"/>
    <path d="M71 77 a9 9 0 0 1 9 -4" fill="none" stroke="#fff" stroke-width="2" opacity=".55" stroke-linecap="round"/>
    <circle cx="60" cy="62" r="4.5" fill="${dk(a, 0.1)}"/><circle cx="60" cy="62" r="1.8" fill="#f4f4f4"/>
    ${spark(24, 34, 0.9, lt(c, 0.5))}${spark(96, 50, 0.7, lt(c, 0.5))}`,

  // 吹風機
  g4_dryer: (u, c, a) => `<defs>${vgrad(u + 'x', lt(c, 0.2), dk(c, 0.25))}${vgrad(u + 'xh', lt(c, 0.05), dk(c, 0.35))}</defs>${shadow(32)}
    <path d="M50 58 L44 90 Q43 95 48 95 L56 95 Q60 95 60 90 L62 60 Z" fill="url(#${u}xh)"/>
    <rect x="47" y="72" width="3" height="10" rx="1.5" fill="${a}" transform="rotate(10 48 77)"/>
    <path d="M52 94 q-10 4 -20 0 q-8 -3 -12 2" fill="none" stroke="${dk(c, 0.4)}" stroke-width="2.2" stroke-linecap="round"/>
    <rect x="26" y="34" width="58" height="30" rx="15" fill="url(#${u}x)"/>
    <path d="M82 38 L98 40 Q101 41 101 44 L101 54 Q101 57 98 58 L82 60 Z" fill="${dk(c, 0.3)}"/>
    <rect x="96" y="40" width="5" height="18" rx="2" fill="${dk(c, 0.45)}"/>
    <circle cx="34" cy="49" r="11" fill="${dk(c, 0.2)}"/><circle cx="34" cy="49" r="8" fill="${a}"/>
    ${[0, 45, 90, 135].map(r => `<rect x="33" y="42" width="2" height="14" rx="1" fill="${dk(a, 0.3)}" transform="rotate(${r} 34 49)"/>`).join('')}
    <circle cx="34" cy="49" r="2.2" fill="${lt(a, 0.5)}"/>
    ${shine('M44 37 h30 q6 0 8 4 h-38 z', 0.35)}
    <g stroke="${lt(c, 0.45)}" stroke-width="2.2" stroke-linecap="round" fill="none" opacity=".85"><path d="M106 42 q4 2 8 0"/><path d="M106 49 q4 2 8 0"/><path d="M106 56 q4 2 8 0"/></g>`,

  // 美睫：閉眼＋濃密睫毛
  g4_lash: (u, c, a) => {
    const P0 = [24, 54], P1 = [60, 82], P2 = [96, 54];
    const B = (t) => [(1 - t) ** 2 * P0[0] + 2 * (1 - t) * t * P1[0] + t * t * P2[0], (1 - t) ** 2 * P0[1] + 2 * (1 - t) * t * P1[1] + t * t * P2[1]];
    const lashes = Array.from({ length: 15 }, (_, i) => {
      const t = 0.08 + i * (0.86 / 14); const [x, y] = B(t);
      const len = 10 + Math.sin(t * Math.PI) * 8 + t * 5; const dir = (t - 0.5) * 1.3;
      const ex = x + dir * len * 0.9, ey = y + len;
      return `<path d="M${f1(x)} ${f1(y)} Q${f1(x + dir * len * 0.2)} ${f1(y + len * 0.75)} ${f1(ex + dir * 3)} ${f1(ey - 2)}" stroke="#231a24" stroke-width="${i % 2 ? 1.5 : 2.2}" fill="none" stroke-linecap="round"/>`;
    }).join('');
    return `<defs><radialGradient id="${u}x" cx=".45" cy=".4" r=".65"><stop offset="0" stop-color="${lt(c, 0.45)}"/><stop offset="1" stop-color="${c}"/></radialGradient></defs>${shadow(30)}
    <circle cx="60" cy="58" r="38" fill="url(#${u}x)"/>
    <path d="M24 54 Q60 30 96 54 Q60 82 24 54 Z" fill="${lt(a, 0.55)}" opacity=".9"/>
    <path d="M28 52 Q60 36 92 52" fill="none" stroke="${lt(a, 0.2)}" stroke-width="1.6" opacity=".8"/>
    ${lashes}
    <path d="M24 54 Q60 82 96 54" fill="none" stroke="#231a24" stroke-width="3.2" stroke-linecap="round"/>
    ${spark(88, 28, 1.1)}${spark(30, 30, 0.7)}${spark(98, 80, 0.6, lt(a, 0.4))}
    ${shine('M34 34 q14 -12 30 -12 q-18 6 -26 16 z', 0.35)}`;
  },

  // 狗狗頭像＋泡泡
  g4_dog: (u, c, a) => `<defs><radialGradient id="${u}x" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="${lt(c, 0.3)}"/><stop offset="1" stop-color="${dk(c, 0.08)}"/></radialGradient></defs>${shadow(32)}
    <ellipse cx="34" cy="52" rx="11" ry="22" fill="${a}" transform="rotate(18 34 52)"/>
    <ellipse cx="86" cy="52" rx="11" ry="22" fill="${a}" transform="rotate(-18 86 52)"/>
    <circle cx="60" cy="58" r="30" fill="url(#${u}x)"/>
    <ellipse cx="60" cy="74" rx="17" ry="13" fill="${lt(c, 0.6)}"/>
    <ellipse cx="60" cy="67" rx="6.5" ry="4.5" fill="#2a1d1a"/>
    <path d="M60 71 v5 M60 76 q-5 4 -9 0 M60 76 q5 4 9 0" stroke="#2a1d1a" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <path d="M56 80 q4 9 8 0 z" fill="#f47c8a"/>
    <circle cx="48" cy="54" r="4.2" fill="#2a1d1a"/><circle cx="72" cy="54" r="4.2" fill="#2a1d1a"/>
    <circle cx="49.4" cy="52.6" r="1.4" fill="#fff"/><circle cx="73.4" cy="52.6" r="1.4" fill="#fff"/>
    <ellipse cx="42" cy="66" rx="4" ry="2.4" fill="#f7a0ad" opacity=".55"/><ellipse cx="78" cy="66" rx="4" ry="2.4" fill="#f7a0ad" opacity=".55"/>
    ${bubble(56, 30, 7)}${bubble(68, 26, 5)}${bubble(46, 26, 4.5)}${bubble(96, 30, 6)}${bubble(22, 82, 5)}${bubble(100, 78, 3.5)}`,

  // 肉球徽章
  g4_paw: (u, c, a) => `<defs>${dgrad(u + 'x', lt(c, 0.2), dk(c, 0.2))}</defs>${shadow(32)}
    <circle cx="60" cy="58" r="36" fill="url(#${u}x)"/>
    <circle cx="60" cy="58" r="30" fill="none" stroke="#fff" stroke-width="1.6" stroke-dasharray="4 3" opacity=".6"/>
    <path d="M60 58 q-16 0 -18 14 q-1 10 10 9 q8 -2 16 0 q11 1 10 -9 q-2 -14 -18 -14z" fill="${a}"/>
    <ellipse cx="42" cy="50" rx="6" ry="7.5" fill="${a}" transform="rotate(-20 42 50)"/>
    <ellipse cx="53" cy="41" rx="6" ry="8" fill="${a}" transform="rotate(-6 53 41)"/>
    <ellipse cx="67" cy="41" rx="6" ry="8" fill="${a}" transform="rotate(6 67 41)"/>
    <ellipse cx="78" cy="50" rx="6" ry="7.5" fill="${a}" transform="rotate(20 78 50)"/>
    ${shine('M32 40 q10 -16 28 -18 q-16 8 -22 22 z', 0.3)}
    ${bubble(94, 26, 6)}${bubble(102, 40, 3.5)}${bubble(20, 88, 4.5)}`,

  // 相機
  g4_camera: (u, c, a) => `<defs>${vgrad(u + 'x', lt(c, 0.15), dk(c, 0.25))}<radialGradient id="${u}xl" cx=".38" cy=".35" r=".7"><stop offset="0" stop-color="#6f8fb8"/><stop offset=".55" stop-color="#1b2433"/><stop offset="1" stop-color="#0a0e15"/></radialGradient></defs>${shadow(40)}
    <rect x="36" y="28" width="24" height="12" rx="3" fill="${dk(c, 0.3)}"/>
    <rect x="74" y="30" width="12" height="6" rx="2" fill="${a}"/>
    <rect x="20" y="36" width="80" height="54" rx="9" fill="url(#${u}x)"/>
    <rect x="20" y="50" width="80" height="26" fill="${dk(c, 0.35)}" opacity=".55"/>
    ${Array.from({ length: 16 }, (_, i) => `<rect x="${22 + i * 4.9}" y="51" width="2" height="24" fill="#000" opacity=".12"/>`).join('')}
    <circle cx="60" cy="63" r="22" fill="${dk(c, 0.5)}"/>
    <circle cx="60" cy="63" r="18" fill="${a}"/>
    <circle cx="60" cy="63" r="14" fill="url(#${u}xl)"/>
    <circle cx="60" cy="63" r="6" fill="#05070b"/>
    <ellipse cx="54" cy="57" rx="4" ry="2.6" fill="#fff" opacity=".6" transform="rotate(-30 54 57)"/>
    <circle cx="66" cy="69" r="1.6" fill="#fff" opacity=".4"/>
    <rect x="84" y="42" width="10" height="7" rx="2" fill="#f4f1e8" opacity=".9"/>
    <circle cx="30" cy="44" r="3" fill="${a}"/>
    ${shine('M26 38 h68 q5 0 5 4 h-77 q0 -4 4 -4z', 0.28)}`,

  // 相框＋照片
  g4_frame: (u, c, a) => `<defs>${dgrad(u + 'x', lt(c, 0.15), dk(c, 0.3))}${vgrad(u + 'xs', lt(a, 0.55), lt(a, 0.15))}</defs>${shadow(34)}
    <path d="M70 92 L84 98 L88 96 L76 86 Z" fill="${dk(c, 0.45)}"/>
    <rect x="24" y="18" width="72" height="78" rx="3" fill="url(#${u}x)"/>
    <rect x="24" y="18" width="72" height="78" rx="3" fill="none" stroke="${dk(c, 0.35)}" stroke-width="1.2"/>
    <rect x="31" y="25" width="58" height="64" fill="#fbf8f2"/>
    <rect x="37" y="31" width="46" height="46" fill="url(#${u}xs)"/>
    <circle cx="71" cy="43" r="5.5" fill="#fff4c4"/>
    <path d="M37 77 L37 64 L50 50 L60 60 L68 54 L83 68 L83 77 Z" fill="${dk(a, 0.25)}"/>
    <path d="M37 77 L37 70 L52 62 L66 70 L83 64 L83 77 Z" fill="${dk(a, 0.45)}"/>
    <rect x="47" y="81" width="26" height="2" rx="1" fill="#c9c2b6"/>
    ${shine('M27 21 h10 l-7 72 h-3 z', 0.2)}`,

  // 捲起的瑜伽墊
  g4_mat: (u, c, a) => `<defs>${vgrad(u + 'x', lt(c, 0.2), dk(c, 0.2))}</defs>${shadow(42)}
    <path d="M18 90 L100 90 L104 97 L14 97 Z" fill="${lt(c, 0.15)}"/>
    <path d="M18 90 L100 90 L101 92 L17 92 Z" fill="#fff" opacity=".3"/>
    <rect x="36" y="44" width="62" height="40" fill="url(#${u}x)"/>
    <ellipse cx="98" cy="64" rx="10" ry="20" fill="${dk(c, 0.12)}"/>
    <ellipse cx="36" cy="64" rx="11" ry="20" fill="${dk(c, 0.22)}"/>
    <ellipse cx="36" cy="64" rx="8" ry="15" fill="none" stroke="${lt(c, 0.3)}" stroke-width="1.4"/><ellipse cx="35" cy="65" rx="5.2" ry="10" fill="none" stroke="${lt(c, 0.3)}" stroke-width="1.4"/><ellipse cx="34.5" cy="66" rx="2.6" ry="5" fill="${dk(c, 0.4)}"/>
    <rect x="52" y="43" width="7" height="42" fill="${a}"/><rect x="78" y="43" width="7" height="42" fill="${a}"/>
    <rect x="52" y="43" width="7" height="42" fill="#000" opacity=".08"/><rect x="78" y="43" width="7" height="42" fill="#000" opacity=".08"/>
    <path d="M36 44 h62 v5 h-62 z" fill="#fff" opacity=".22"/>
    <path d="M60 30 q0 -10 6 -14 q2 8 -6 14z" fill="${lt(a, 0.2)}"/><path d="M60 30 q0 -10 -6 -14 q-2 8 6 14z" fill="${a}"/>`,

  // 啞鈴
  g4_dumbbell: (u, c, a) => `<defs>${vgrad(u + 'x', lt(c, 0.25), dk(c, 0.3))}${vgrad(u + 'xb', '#f2f4f6', '#8d949c')}</defs>${shadow(42)}
    <g transform="rotate(-14 60 62)">
      <rect x="26" y="58" width="68" height="8" rx="3" fill="url(#${u}xb)"/>
      ${[50, 56, 62, 68].map(x => `<rect x="${x}" y="58" width="1.4" height="8" fill="#6c737b" opacity=".6"/>`).join('')}
      <rect x="30" y="40" width="12" height="44" rx="3.5" fill="url(#${u}x)"/>
      <rect x="20" y="46" width="11" height="32" rx="3" fill="url(#${u}x)"/>
      <rect x="78" y="40" width="12" height="44" rx="3.5" fill="url(#${u}x)"/>
      <rect x="89" y="46" width="11" height="32" rx="3" fill="url(#${u}x)"/>
      <rect x="33" y="44" width="3" height="36" rx="1.5" fill="#fff" opacity=".3"/><rect x="81" y="44" width="3" height="36" rx="1.5" fill="#fff" opacity=".3"/>
      <rect x="40" y="56" width="4" height="12" rx="1" fill="${a}"/><rect x="76" y="56" width="4" height="12" rx="1" fill="${a}"/>
    </g>
    ${spark(96, 26, 1, a)}${spark(24, 30, 0.7, a)}`,

  // 木吉他
  g4_guitar: (u, c, a) => `<defs><radialGradient id="${u}x" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="${lt(c, 0.25)}"/><stop offset="1" stop-color="${dk(c, 0.25)}"/></radialGradient></defs>${shadow(30)}
    <g transform="rotate(30 60 58) translate(0 2)">
      <rect x="56.5" y="12" width="7" height="46" fill="${dk(a, 0.15)}"/>
      ${[20, 26, 32, 38, 44, 50].map(y => `<rect x="56.5" y="${y}" width="7" height=".9" fill="#d8d2c4"/>`).join('')}
      <path d="M54 2 h12 l-1 13 h-10 z" fill="${a}"/>
      ${[5, 9, 13].map(y => `<circle cx="52.5" cy="${y}" r="1.6" fill="#e8e2d0"/><circle cx="67.5" cy="${y}" r="1.6" fill="#e8e2d0"/>`).join('')}
      <circle cx="60" cy="58" r="16" fill="url(#${u}x)"/>
      <circle cx="60" cy="82" r="21" fill="url(#${u}x)"/>
      <rect x="44" y="64" width="32" height="10" fill="url(#${u}x)"/>
      <circle cx="60" cy="66" r="6.5" fill="#2a1a10"/><circle cx="60" cy="66" r="8" fill="none" stroke="${a}" stroke-width="1.2"/>
      <rect x="52" y="86" width="16" height="4" rx="1.5" fill="${dk(a, 0.2)}"/>
      ${[58, 59.3, 60.7, 62].map(x => `<path d="M${x} 13 V88" stroke="#f6f2e8" stroke-width=".55"/>`).join('')}
      ${shine('M48 50 q4 -6 10 -7 q-6 6 -6 14 z', 0.3)}${shine('M44 78 q3 -10 12 -14 q-6 8 -7 20 z', 0.22)}
    </g>
    <g fill="${dk(c, 0.1)}" opacity=".75"><ellipse cx="96" cy="88" rx="4" ry="3" transform="rotate(-20 96 88)"/><rect x="99" y="72" width="1.6" height="16"/></g>`,

  // 直立鋼琴
  g4_piano: (u, c, a) => `<defs>${vgrad(u + 'x', lt(c, 0.18), dk(c, 0.25))}</defs>${shadow(42)}
    <rect x="24" y="92" width="5" height="6" fill="${dk(c, 0.4)}"/><rect x="91" y="92" width="5" height="6" fill="${dk(c, 0.4)}"/>
    <rect x="22" y="26" width="76" height="66" rx="4" fill="url(#${u}x)"/>
    <rect x="18" y="22" width="84" height="8" rx="3" fill="${dk(c, 0.15)}"/>
    <rect x="30" y="34" width="60" height="18" rx="2" fill="${dk(c, 0.3)}"/>
    <path d="M44 36 h32 l-2 14 h-28 z" fill="#fbf8ef"/>
    ${[40, 43, 46].map(y => `<path d="M48 ${y} h24" stroke="#b9b2a2" stroke-width=".7"/>`).join('')}
    <ellipse cx="54" cy="45.5" rx="2" ry="1.4" fill="#333"/><path d="M55.8 45.5 v-6" stroke="#333" stroke-width=".8"/>
    <ellipse cx="64" cy="43" rx="2" ry="1.4" fill="#333"/><path d="M65.8 43 v-6" stroke="#333" stroke-width=".8"/>
    <rect x="18" y="56" width="84" height="16" rx="2" fill="${dk(c, 0.2)}"/>
    <rect x="21" y="58" width="78" height="12" fill="#fbfaf6"/>
    ${Array.from({ length: 13 }, (_, i) => `<path d="M${f1(21 + (i + 1) * 6)} 58 v12" stroke="#c8c3b8" stroke-width=".7"/>`).join('')}
    ${[0, 1, 3, 4, 5, 7, 8, 10, 11, 12].map(i => `<rect x="${f1(21 + (i + 1) * 6 - 1.8)}" y="58" width="3.6" height="7" fill="#1a1a1a"/>`).join('')}
    <rect x="22" y="72" width="76" height="2" fill="${a}"/>
    <rect x="44" y="80" width="32" height="6" rx="1.5" fill="${dk(c, 0.3)}" opacity=".7"/>
    <circle cx="52" cy="96" r="2" fill="${a}"/><circle cx="60" cy="96" r="2" fill="${a}"/><circle cx="68" cy="96" r="2" fill="${a}"/>
    ${shine('M26 30 h4 v58 h-4 z', 0.18)}
    <g fill="${a}"><ellipse cx="104" cy="22" rx="3.6" ry="2.6" transform="rotate(-20 104 22)"/><rect x="106.6" y="8" width="1.4" height="14"/></g>`,

  // 雙連八分音符
  g4_note: (u, c, a) => `<defs>${vgrad(u + 'x', lt(c, 0.2), dk(c, 0.25))}</defs>${shadow(32)}
    <circle cx="60" cy="58" r="38" fill="${lt(a, 0.55)}"/>
    ${[40, 50, 60, 70, 80].map(y => `<path d="M24 ${y} H96" stroke="${dk(a, 0.05)}" stroke-width="1" opacity=".45"/>`).join('')}
    <path d="M47 32 L83 24 L83 33 L47 41 Z" fill="url(#${u}x)"/>
    <rect x="44" y="33" width="5" height="48" fill="url(#${u}x)"/>
    <rect x="80" y="25" width="5" height="48" fill="url(#${u}x)"/>
    <ellipse cx="38" cy="82" rx="11" ry="8" fill="url(#${u}x)" transform="rotate(-22 38 82)"/>
    <ellipse cx="74" cy="74" rx="11" ry="8" fill="url(#${u}x)" transform="rotate(-22 74 74)"/>
    <ellipse cx="34" cy="79" rx="4" ry="2" fill="#fff" opacity=".35" transform="rotate(-22 34 79)"/>
    <ellipse cx="70" cy="71" rx="4" ry="2" fill="#fff" opacity=".35" transform="rotate(-22 70 71)"/>
    ${spark(98, 22, 0.9, a)}${spark(22, 34, 0.7, a)}`,

  // 清潔噴瓶
  g4_spray: (u, c, a) => `<defs>${hgrad(u + 'x', lt(c, 0.2), dk(c, 0.2))}</defs>${shadow(26)}
    <path d="M50 46 h20 l4 8 q6 6 6 16 v20 q0 7 -7 7 h-26 q-7 0 -7 -7 v-20 q0 -10 6 -16 z" fill="url(#${u}x)"/>
    <rect x="46" y="64" width="34" height="22" rx="3" fill="#fff" opacity=".9"/>
    <circle cx="56" cy="75" r="5" fill="${a}"/><rect x="64" y="71" width="12" height="2.4" rx="1.2" fill="${dk(c, 0.1)}"/><rect x="64" y="76" width="9" height="2" rx="1" fill="${lt(c, 0.2)}"/>
    <rect x="53" y="38" width="14" height="9" rx="2" fill="${dk(a, 0.25)}"/>
    <path d="M46 24 h26 q6 0 6 6 v4 q0 4 -4 4 h-28 l-10 -4 v-6 z" fill="${a}"/>
    <rect x="30" y="27" width="8" height="5" rx="1.5" fill="${dk(a, 0.35)}"/>
    <path d="M60 38 q-2 10 -10 12 q-3 1 -3 -2 q6 -3 7 -10 z" fill="${dk(a, 0.2)}"/>
    ${shine('M48 58 q2 -6 6 -8 v38 q-6 0 -6 -5 z', 0.3)}
    <g fill="${lt(c, 0.4)}" opacity=".8"><circle cx="24" cy="28" r="2"/><circle cx="18" cy="24" r="1.5"/><circle cx="20" cy="33" r="1.6"/><circle cx="13" cy="29" r="1.2"/><circle cx="15" cy="37" r="1"/></g>
    ${spark(92, 40, 1.1, lt(c, 0.3))}${spark(28, 74, 0.8, lt(c, 0.3))}`,

  // 清潔水桶＋海綿泡泡
  g4_bucket: (u, c, a) => `<defs>${hgrad(u + 'x', lt(c, 0.15), dk(c, 0.25))}</defs>${shadow(34)}
    <path d="M30 46 Q60 14 90 46" fill="none" stroke="${dk(c, 0.35)}" stroke-width="3"/>
    <path d="M28 48 h64 l-7 44 q-25 7 -50 0 z" fill="url(#${u}x)"/>
    <ellipse cx="60" cy="48" rx="32" ry="7" fill="${dk(c, 0.2)}"/>
    <ellipse cx="60" cy="48" rx="28" ry="5" fill="${lt(c, 0.55)}"/>
    <path d="M30 56 h60" stroke="${lt(c, 0.3)}" stroke-width="2"/>
    <circle cx="48" cy="44" r="7" fill="#fff"/><circle cx="58" cy="40" r="9" fill="#fff"/><circle cx="70" cy="43" r="7" fill="#fff"/><circle cx="64" cy="35" r="5" fill="#fff"/>
    <g transform="rotate(-14 82 40)"><rect x="70" y="30" width="26" height="14" rx="3" fill="${a}"/><rect x="70" y="30" width="26" height="5" rx="2" fill="${dk(a, 0.25)}"/>
    ${[76, 82, 88].map(x => `<circle cx="${x}" cy="40" r="1.2" fill="${dk(a, 0.15)}"/>`).join('')}</g>
    ${shine('M33 58 h5 l4 30 h-4 z', 0.25)}
    ${bubble(24, 34, 4)}${bubble(18, 46, 2.8)}${spark(100, 72, 1, lt(c, 0.3))}`,

  // 小屋
  g4_house: (u, c, a) => `<defs>${vgrad(u + 'x', lt(c, 0.1), dk(c, 0.12))}${vgrad(u + 'xr', lt(a, 0.1), dk(a, 0.3))}</defs>${shadow(40)}
    <rect x="74" y="24" width="9" height="18" fill="${dk(a, 0.2)}"/>
    <path d="M32 56 v38 h56 v-38 z" fill="url(#${u}x)"/>
    <path d="M22 58 L60 26 L98 58 L92 62 L60 35 L28 62 Z" fill="url(#${u}xr)"/>
    <path d="M60 35 L92 62 L28 62 Z" fill="${dk(c, 0.12)}" opacity=".25"/>
    <rect x="53" y="70" width="14" height="24" rx="6" fill="${dk(a, 0.15)}"/><circle cx="64" cy="83" r="1.3" fill="#ffd77a"/>
    <rect x="37" y="68" width="12" height="11" rx="1.5" fill="#fff4c8"/><path d="M43 68 v11 M37 73.5 h12" stroke="${dk(c, 0.3)}" stroke-width="1.2"/>
    <rect x="71" y="68" width="12" height="11" rx="1.5" fill="#fff4c8"/><path d="M77 68 v11 M71 73.5 h12" stroke="${dk(c, 0.3)}" stroke-width="1.2"/>
    <circle cx="60" cy="50" r="4.5" fill="#fff4c8" stroke="${dk(c, 0.3)}" stroke-width="1"/>
    <path d="M28 94 q-8 -10 0 -16 q6 6 0 16z" fill="#6fae7a"/><path d="M92 94 q8 -10 0 -16 q-6 6 0 16z" fill="#5c9a68"/>
    ${spark(24, 34, 1, '#ffd77a')}${spark(102, 40, 0.7, '#ffd77a')}`,

  // 床（房型）
  g4_bed: (u, c, a) => `<defs>${vgrad(u + 'x', lt(c, 0.15), dk(c, 0.2))}${vgrad(u + 'xh', lt(a, 0.1), dk(a, 0.2))}</defs>${shadow(44)}
    <path d="M22 66 V40 q0 -12 12 -12 h52 q12 0 12 12 V66 z" fill="url(#${u}xh)"/>
    <path d="M30 60 V42 q0 -6 6 -6 h48 q6 0 6 6 V60 z" fill="${lt(a, 0.15)}" opacity=".6"/>
    <rect x="16" y="62" width="88" height="22" rx="4" fill="#f6f2ea"/>
    <ellipse cx="42" cy="60" rx="15" ry="7" fill="#ffffff"/><ellipse cx="78" cy="60" rx="15" ry="7" fill="#ffffff"/>
    <ellipse cx="42" cy="58" rx="11" ry="3" fill="#fff" opacity=".8"/><ellipse cx="78" cy="58" rx="11" ry="3" fill="#fff" opacity=".8"/>
    <path d="M16 70 h88 v16 q0 4 -4 4 h-80 q-4 0 -4 -4 z" fill="url(#${u}x)"/>
    <rect x="16" y="68" width="88" height="6" rx="2" fill="${lt(c, 0.45)}"/>
    <path d="M30 80 q8 -3 16 0 t16 0 t16 0 t16 0" fill="none" stroke="${lt(c, 0.3)}" stroke-width="1.2" opacity=".8"/>
    <rect x="20" y="90" width="5" height="7" fill="${dk(a, 0.35)}"/><rect x="95" y="90" width="5" height="7" fill="${dk(a, 0.35)}"/>
    ${shine('M26 34 q4 -4 10 -4 h-4 q-4 2 -4 10 v20 h-2 z', 0.3)}`,

  // 智慧型手機
  g4_phone: (u, c, a) => `<defs>${dgrad(u + 'x', lt(a, 0.15), dk(a, 0.25))}${hgrad(u + 'xc', lt(c, 0.2), dk(c, 0.25))}</defs>${shadow(26)}
    <g transform="rotate(-8 60 56)">
      <rect x="36" y="12" width="48" height="86" rx="10" fill="url(#${u}xc)"/>
      <rect x="39" y="15" width="42" height="80" rx="8" fill="#12161d"/>
      <rect x="41" y="17" width="38" height="76" rx="6.5" fill="url(#${u}x)"/>
      <rect x="53" y="19" width="14" height="4" rx="2" fill="#12161d"/>
      ${[0, 1, 2].map(r => [0, 1, 2].map(k => `<rect x="${45 + k * 11}" y="${32 + r * 12}" width="8" height="8" rx="2.4" fill="#fff" opacity="${0.35 + ((r + k) % 3) * 0.2}"/>`).join('')).join('')}
      <rect x="45" y="72" width="30" height="12" rx="4" fill="#fff" opacity=".25"/>
      <rect x="52" y="89" width="16" height="1.8" rx=".9" fill="#fff" opacity=".7"/>
      <rect x="84" y="32" width="2" height="12" rx="1" fill="${dk(c, 0.3)}"/>
      ${shine('M43 19 h14 l-16 40 v-34 q0 -6 2 -6z', 0.25)}
    </g>
    ${spark(98, 30, 1, lt(a, 0.3))}${spark(22, 76, 0.75, lt(a, 0.3))}`,

  // 起子＋齒輪（維修）
  g4_tool: (u, c, a) => {
    const teeth = Array.from({ length: 8 }, (_, i) => `<rect x="39" y="22" width="10" height="12" rx="2" fill="${a}" transform="rotate(${i * 45} 44 46)"/>`).join('');
    return `<defs>${vgrad(u + 'x', lt(c, 0.2), dk(c, 0.25))}${hgrad(u + 'xm', '#f3f5f7', '#8f979f')}</defs>${shadow(36)}
    ${teeth}<circle cx="44" cy="46" r="20" fill="${a}"/><circle cx="44" cy="46" r="8" fill="${lt(a, 0.55)}"/>
    <circle cx="44" cy="46" r="16" fill="none" stroke="${dk(a, 0.2)}" stroke-width="1.4" opacity=".5"/>
    <g transform="rotate(40 66 64)">
      <rect x="62" y="20" width="8" height="40" rx="1.5" fill="url(#${u}xm)"/>
      <path d="M62 20 L66 12 L70 20 Z" fill="#8f979f"/>
      <rect x="58" y="58" width="16" height="40" rx="7" fill="url(#${u}x)"/>
      ${[63, 66, 69].map(x => `<rect x="${x}" y="64" width="1.6" height="28" rx=".8" fill="${dk(c, 0.3)}" opacity=".6"/>`).join('')}
      <rect x="57" y="56" width="18" height="6" rx="2" fill="${dk(c, 0.3)}"/>
      ${shine('M60 62 h3 v32 h-3 z', 0.35)}
    </g>
    ${spark(94, 26, 1, lt(a, 0.2))}`;
  },

  // 汽車側面＋亮晶晶
  g4_car: (u, c, a) => `<defs>${vgrad(u + 'x', lt(c, 0.25), dk(c, 0.3))}${vgrad(u + 'xw', '#d8eefc', '#7fa9c8')}</defs>${shadow(48, 96)}
    <path d="M12 80 L12 68 Q14 60 28 57 L42 54 L54 40 Q57 36 64 36 L80 36 Q87 36 91 42 L99 54 Q108 56 108 66 L108 80 Z" fill="url(#${u}x)"/>
    <path d="M47 54 L57 42 Q59 40 63 40 L68 40 L68 54 Z" fill="url(#${u}xw)"/>
    <path d="M72 40 L80 40 Q84 40 87 44 L94 54 L72 54 Z" fill="url(#${u}xw)"/>
    <path d="M70 40 v14" stroke="${dk(c, 0.35)}" stroke-width="2"/>
    <path d="M14 66 H106" stroke="${lt(c, 0.4)}" stroke-width="1.4" opacity=".6"/>
    <path d="M14 72 H106" stroke="${a}" stroke-width="3"/>
    <rect x="100" y="60" width="7" height="4" rx="2" fill="#fff6c8"/><rect x="12" y="62" width="5" height="4" rx="1.5" fill="#ff6b5e"/>
    <rect x="60" y="60" width="6" height="2" rx="1" fill="${dk(c, 0.4)}"/>
    ${[34, 88].map(x => `<circle cx="${x}" cy="80" r="12" fill="#1c1f24"/><circle cx="${x}" cy="80" r="7" fill="#c9ced6"/><circle cx="${x}" cy="80" r="2.6" fill="#5b616b"/>${[0, 72, 144, 216, 288].map(r => `<rect x="${x - 0.8}" y="74" width="1.6" height="5" fill="#5b616b" transform="rotate(${r} ${x} 80)"/>`).join('')}`).join('')}
    ${shine('M24 58 Q40 54 56 44 Q62 38 70 38 L60 40 Q52 48 44 56 Z', 0.4)}
    ${spark(50, 24, 1.2)}${spark(98, 24, 0.9, a)}${spark(20, 44, 0.8, a)}`,

  // 課程票卡／次數卡（打卡格）
  g4_pass: (u, c, a) => `<defs>${dgrad(u + 'x', lt(c, 0.15), dk(c, 0.2))}</defs>${shadow(40)}
    <rect x="22" y="30" width="80" height="52" rx="7" fill="${lt(c, 0.55)}" transform="rotate(8 62 56)"/>
    <g transform="rotate(-6 60 60)">
      <rect x="18" y="36" width="84" height="54" rx="7" fill="url(#${u}x)"/>
      <rect x="18" y="36" width="84" height="14" rx="7" fill="${a}"/><rect x="18" y="43" width="84" height="7" fill="${a}"/>
      <rect x="26" y="41" width="30" height="4" rx="2" fill="#fff" opacity=".85"/>
      <circle cx="92" cy="43" r="3" fill="#fff" opacity=".8"/>
      ${[0, 1, 2, 3, 4].map(i => `<circle cx="${32 + i * 14}" cy="66" r="5.5" fill="${i < 3 ? '#fff' : 'none'}" stroke="#fff" stroke-width="1.6" opacity="${i < 3 ? 0.95 : 0.7}"/>${i < 3 ? `<path d="M${29 + i * 14} 66 l2.2 2.4 l4 -4.6" stroke="${a}" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` : ''}`).join('')}
      <rect x="26" y="78" width="40" height="3" rx="1.5" fill="#fff" opacity=".55"/>
      ${shine('M22 52 h76 v4 h-76 z', 0.18)}
    </g>`,
};

// ---- 11 家業主 ----
export const BIZ = [
  // 1. 美髮沙龍：深色＋香檳金，海報式主視覺
  {
    merchant: {
      id: 'salon', name: '剪影髮藝', en: 'Silhouette Hair Atelier', type: 'salon', cat: 'service',
      typeName: '美髮沙龍', owner: '阿澄', theme: 'salon', tagline: '一位設計師，從頭陪你到底',
      products: [
        { id: 'sl-cut', name: '設計剪髮', en: 'Signature Haircut', unit: '60 分鐘', price: 900, cost: 120, stock: 28, desc: '諮詢、洗髮、剪髮與造型吹整。', descEn: 'Consultation, wash, cut and blow-dry styling.', art: { kind: 'g4_scissors', color: '#C8A26B', accent: '#2B2520' } },
        { id: 'sl-color', name: '質感染髮', en: 'Dimensional Colour', unit: '120 分鐘', price: 2800, cost: 750, stock: 12, desc: '低刺激染劑，含色彩諮詢。', descEn: 'Gentle dye with colour consultation.', art: { kind: 'bottle', color: '#7B4B6A', accent: '#E0C28F' } },
        { id: 'sl-perm', name: '溫塑燙髮', en: 'Soft Wave Perm', unit: '150 分鐘', price: 3200, cost: 800, stock: 8, desc: '自然捲度，好整理不毛躁。', descEn: 'Natural waves that are easy to style.', art: { kind: 'g4_dryer', color: '#3A3430', accent: '#D8B47C' } },
        { id: 'sl-scalp', name: '頭皮清潔舒壓', en: 'Scalp Cleanse & Massage', unit: '50 分鐘', price: 1200, cost: 260, stock: 16, desc: '深層清潔加肩頸按摩，放鬆一下。', descEn: 'Deep cleanse plus a relaxing neck massage.', art: { kind: 'lotion', color: '#E9DCC6', accent: '#8C6A43' } },
        { id: 'sl-treat', name: '結構護髮', en: 'Bond Repair Treatment', unit: '40 分鐘', price: 1500, cost: 380, stock: 14, desc: '染燙後的髮絲保養，觸感柔順。', descEn: 'Aftercare for coloured or permed hair.', art: { kind: 'bottle', color: '#D9B98A', accent: '#2B2520' } },
        { id: 'sl-gift', name: '髮藝禮券', en: 'Salon Gift Voucher', unit: '1 張', price: 1000, cost: 20, stock: 99, desc: '一年內有效，可折抵任何項目。', descEn: 'Valid one year for any service.', art: { kind: 'voucher', color: '#C8A26B', accent: '#2B2520' } },
      ],
    },
    theme: {
      id: 'salon', kind: 'base', name: N('香檳剪影', 'Champagne Silhouette', 'シャンパンシルエット', 'Bóng champagne', 'Siluet Champagne'),
      deco: null, dark: true,
      vars: { cream: '#16130f', cream2: '#221d18', ink: '#f3ece2', ink2: '#c9bba8', ink3: '#958a7b', rose: '#d4a373', g: '#c8a26b', gl: '#e0c28f', card: '#1f1a15', deep: '#0b0907', deep2: '#2a221a', heroA: '#3a2e22', heroB: '#1f1a16', heroC: '#4a3a2a', btn: '#d8b47c', btnInk: '#1a140d' },
      hero: { pal: ['#d8b47c', '#2b2520', '#e9dcc6', '#7b4b6a', '#c8a26b', '#f3ece2'], dots: ['#e0c28f', '#ffffff', '#c8a26b', '#7b4b6a'], sky: '#f3e2c4', ground: '#2a221a', point: '#ffd9a0', dim: true },
      style: { font: 'serif', radius: 'sharp', hero: 'poster', grid: 'magazine', button: 'outline', texture: 'none' },
    },
    profile: {
      avatar: '澄', volume: 8, aiName: '小澄', region: '台北市大安區',
      staff: [
        { name: '阿澄', title: '負責人・設計師（董事酬勞）', kind: 'owner', pay: 60000 },
        { name: '小鈺', title: '助理・兼職', kind: 'part', pay: 17600, level: 17880, hours: 88, hourly: 200 },
      ],
      suppliers: [
        { item: '染劑、燙劑、護髮品', vendor: '髮研美髮材料行（虛構）', base: 18000 },
        { item: '毛巾送洗', vendor: '潔白布巾洗衣坊（虛構）', base: 3200 },
        { item: '洗髮精、造型品', vendor: '晨露沙龍用品（虛構）', base: 4800 },
      ],
      fixed: { rent: 32000, utility: 7200, ads: 8000, depreciation: 4200, equip: '洗髮椅與吹風機' },
      rd: [['教育訓練', '新式剪裁技法進修', '髮藝學苑（虛構）', 6800, '收據', 14]],
      channels: { web: 0.30, line: 0.36, pos: 0.10, phone: 0.12, whatsapp: 0.02, zalo: 0.0, messenger: 0.10 },
      langs: { zh: 0.86, en: 0.08, ja: 0.06 },
    },
  },

  // 2. 美睫：淡紫＋玫瑰粉，手寫字體
  {
    merchant: {
      id: 'lash', name: '睫語美睫', en: 'Lash Whisper Studio', type: 'lash', cat: 'service',
      typeName: '美睫工作室', owner: '小羽', theme: 'lash', tagline: '睜眼就是好氣色',
      products: [
        { id: 'ls-natural', name: '自然單根嫁接', en: 'Classic Lash Extensions', unit: '90 分鐘', price: 1200, cost: 260, stock: 18, desc: '一根接一根，自然有神。', descEn: 'One-by-one extensions for a natural look.', art: { kind: 'g4_lash', color: '#E9D5F2', accent: '#B494CF' } },
        { id: 'ls-volume', name: '濃密束狀嫁接', en: 'Volume Lash Extensions', unit: '120 分鐘', price: 1800, cost: 380, stock: 12, desc: '手工開花束，濃密但輕盈。', descEn: 'Handmade fans, full yet light.', art: { kind: 'g4_lash', color: '#C9A6DE', accent: '#8A5FA8' } },
        { id: 'ls-lift', name: '角蛋白翹睫', en: 'Keratin Lash Lift', unit: '60 分鐘', price: 1000, cost: 200, stock: 16, desc: '自睫上翹，約維持 6 週。', descEn: 'Lifts your own lashes, lasts about 6 weeks.', art: { kind: 'g4_lash', color: '#F6D5DF', accent: '#C97FA0' } },
        { id: 'ls-refill', name: '三週內補睫', en: '3-Week Refill', unit: '60 分鐘', price: 700, cost: 150, stock: 20, desc: '本店嫁接三週內回補。', descEn: 'Refill within three weeks of your set.', art: { kind: 'g4_lash', color: '#F3EADF', accent: '#B4876F' } },
        { id: 'ls-serum', name: '睫毛保養液', en: 'Lash Conditioning Serum', unit: '8 ml', price: 480, cost: 160, stock: 25, desc: '日常保養，讓睫毛更好整理。', descEn: 'Daily care to keep lashes in shape.', art: { kind: 'bottle', color: '#C9A6DE', accent: '#5B3F78' } },
        { id: 'ls-pass', name: '補睫三次券', en: 'Refill 3-Visit Pass', unit: '3 次', price: 1890, cost: 420, stock: 15, desc: '三次補睫，半年內使用。', descEn: 'Three refills, use within six months.', art: { kind: 'g4_pass', color: '#B494CF', accent: '#C97FA0' } },
      ],
    },
    theme: {
      id: 'lash', kind: 'base', name: N('薰衣草睫語', 'Lavender Whisper', 'ラベンダーの囁き', 'Thì thầm oải hương', 'Bisikan Lavender'),
      deco: 'petal', dark: false,
      vars: { cream: '#fbf7fc', cream2: '#f1e8f5', ink: '#2e2236', ink2: '#66566f', ink3: '#9d8fa5', rose: '#c97fa0', g: '#8a5fa8', gl: '#b494cf', card: '#ffffff', deep: '#2e1f3d', deep2: '#4a3360', heroA: '#ecdff6', heroB: '#fbe4ec', heroC: '#f6efe0', btn: '#5b3f78' },
      hero: { pal: ['#c9a6de', '#f6d5df', '#b494cf', '#f3eadf', '#c97fa0', '#ffffff'], dots: ['#b494cf', '#f6d5df', '#ffffff', '#c97fa0'], sky: '#fbf4ff', ground: '#e6d4f0', point: '#e8b8f0' },
      style: { font: 'hand', radius: 'round', hero: 'minimal', grid: 'cards', button: 'pill', texture: 'dots' },
    },
    profile: {
      avatar: '羽', volume: 6, aiName: '小羽毛', region: '新竹市東區',
      staff: [{ name: '小羽', title: '負責人・美睫師（董事酬勞）', kind: 'owner', pay: 48000 }],
      suppliers: [
        { item: '嫁接睫毛、黏著劑', vendor: '柔睫美容材料（虛構）', base: 6800 },
        { item: '翹睫藥劑與耗材', vendor: '晨露沙龍用品（虛構）', base: 2600 },
        { item: '保養液代工', vendor: '青禾化粧品代工（虛構）', base: 3200 },
      ],
      fixed: { rent: 14000, utility: 2800, ads: 5000, depreciation: 1500, equip: '美睫床與放大燈' },
      rd: [['教育訓練', '束狀開花技法進修', '睫藝學苑（虛構）', 4500, '收據', 9]],
      channels: { web: 0.26, line: 0.40, pos: 0.04, phone: 0.04, whatsapp: 0.04, zalo: 0.0, messenger: 0.22 },
      langs: { zh: 0.90, en: 0.05, ja: 0.05 },
    },
  },

  // 3. 寵物美容：陽光黃＋湖水綠，圓體字
  {
    merchant: {
      id: 'petgroom', name: '毛孩泡泡屋', en: 'Bubble Paws Grooming', type: 'petgroom', cat: 'service',
      typeName: '寵物美容', owner: '阿柚', theme: 'petgroom', tagline: '香香出門，開心回家',
      products: [
        { id: 'pg-bath', name: '小型犬洗澡', en: 'Small Dog Bath', unit: '60 分鐘', price: 600, cost: 120, stock: 20, desc: '洗澡、吹乾、剪指甲、清耳朵。', descEn: 'Bath, dry, nail trim and ear cleaning.', art: { kind: 'g4_dog', color: '#F2C27B', accent: '#B8743A' } },
        { id: 'pg-groom', name: '小型犬美容造型', en: 'Small Dog Full Groom', unit: '120 分鐘', price: 1200, cost: 260, stock: 12, desc: '洗澡加全身修剪造型。', descEn: 'Bath plus full-body styling trim.', art: { kind: 'g4_dog', color: '#FFFFFF', accent: '#E8B07A' } },
        { id: 'pg-cat', name: '貓咪洗澡', en: 'Cat Bath', unit: '90 分鐘', price: 900, cost: 200, stock: 8, desc: '獨立安靜空間，溫柔慢慢洗。', descEn: 'A quiet private room, gentle and unhurried.', art: { kind: 'g4_paw', color: '#45C3B3', accent: '#FFFFFF' } },
        { id: 'pg-spa', name: '泡泡 SPA 加購', en: 'Bubble Spa Add-on', unit: '30 分鐘', price: 400, cost: 90, stock: 20, desc: '細緻泡泡浴，毛髮更蓬鬆。', descEn: 'Fine bubble soak for a fluffier coat.', art: { kind: 'g4_paw', color: '#FFB627', accent: '#FFF6E0' } },
        { id: 'pg-shampoo', name: '低敏寵物洗毛精', en: 'Gentle Pet Shampoo', unit: '500 ml', price: 420, cost: 170, stock: 30, desc: '店內同款，在家也能洗。', descEn: 'The same shampoo we use in store.', art: { kind: 'bottle', color: '#2A9D8F', accent: '#FFE08A' } },
        { id: 'pg-pass', name: '洗澡五次卡', en: '5-Bath Pass', unit: '5 次', price: 2700, cost: 600, stock: 15, desc: '小型犬洗澡五次，一年內有效。', descEn: 'Five small-dog baths, valid one year.', art: { kind: 'g4_pass', color: '#2A9D8F', accent: '#FFB627' } },
      ],
    },
    theme: {
      id: 'petgroom', kind: 'base', name: N('泡泡毛孩', 'Bubbly Paws', 'あわあわペット', 'Bong bóng thú cưng', 'Buih Comel'),
      deco: 'bubble', dark: false,
      vars: { cream: '#fffaf0', cream2: '#fdefcf', ink: '#1f2d3a', ink2: '#4f5d6a', ink3: '#86909a', rose: '#ff7a5c', g: '#2a9d8f', gl: '#45c3b3', card: '#ffffff', deep: '#1d4e57', deep2: '#2a6f6a', heroA: '#ffe08a', heroB: '#c9f0ea', heroC: '#ffd3c4', btn: '#ffb627', btnInk: '#2a1d05' },
      hero: { pal: ['#ffb627', '#45c3b3', '#ff7a5c', '#f2c27b', '#ffffff', '#c9f0ea'], dots: ['#ffffff', '#45c3b3', '#ffb627', '#ff7a5c', '#c9f0ea'], sky: '#fffbe6', ground: '#c9f0ea', point: '#ffd36a' },
      style: { font: 'round', radius: 'pill', hero: 'split', grid: 'tiles', button: 'block', texture: 'dots' },
    },
    profile: {
      avatar: '柚', volume: 9, aiName: '泡泡', region: '台中市南屯區',
      staff: [
        { name: '阿柚', title: '負責人・寵物美容師（董事酬勞）', kind: 'owner', pay: 46000 },
        { name: '小豆', title: '美容助理・全職', kind: 'full', pay: 31000, level: 31800 },
      ],
      suppliers: [
        { item: '寵物洗毛精、護毛素', vendor: '毛毛寵物用品批發（虛構）', base: 5600 },
        { item: '毛巾、拋棄式耗材', vendor: '潔白布巾洗衣坊（虛構）', base: 2400 },
        { item: '自有品牌洗毛精代工', vendor: '青禾化粧品代工（虛構）', base: 4200 },
      ],
      fixed: { rent: 22000, utility: 6800, ads: 5000, depreciation: 3000, equip: '美容桌與烘毛箱' },
      rd: [['教育訓練', '貓咪美容低壓力手法課程', '寵美學院（虛構）', 3800, '收據', 18]],
      channels: { web: 0.28, line: 0.42, pos: 0.06, phone: 0.10, whatsapp: 0.02, zalo: 0.0, messenger: 0.12 },
      langs: { zh: 0.92, en: 0.05, ja: 0.03 },
    },
  },

  // 4. 攝影工作室：底片暖白＋純黑＋暗房紅，極簡主視覺
  {
    merchant: {
      id: 'photo', name: '光盒攝影', en: 'Lightbox Photo Studio', type: 'photo', cat: 'service',
      typeName: '攝影工作室', owner: '阿景', theme: 'photo', tagline: '把光留給值得的時刻',
      products: [
        { id: 'ph-id', name: '證件照', en: 'ID Photos', unit: '30 分鐘', price: 450, cost: 60, stock: 30, desc: '含修圖與一組沖洗，當天取件。', descEn: 'Retouch and one print set, same-day pickup.', art: { kind: 'g4_camera', color: '#2B2B2B', accent: '#B9B4AA' } },
        { id: 'ph-portrait', name: '個人形象照', en: 'Personal Portrait', unit: '60 分鐘', price: 2800, cost: 500, stock: 10, desc: '兩套服裝，精修 8 張。', descEn: 'Two outfits, eight retouched photos.', art: { kind: 'g4_camera', color: '#E8E4DC', accent: '#B3261E' } },
        { id: 'ph-family', name: '全家福', en: 'Family Session', unit: '90 分鐘', price: 4200, cost: 800, stock: 6, desc: '最多 8 人，精修 12 張。', descEn: 'Up to eight people, twelve retouched photos.', art: { kind: 'g4_frame', color: '#8A6A4A', accent: '#7DA3C2' } },
        { id: 'ph-couple', name: '情侶寫真', en: 'Couple Session', unit: '2 小時', price: 6800, cost: 1500, stock: 4, desc: '棚拍加近郊外拍，精修 20 張。', descEn: 'Studio plus nearby outdoor, twenty edits.', art: { kind: 'g4_frame', color: '#2B2B2B', accent: '#E89A7A' } },
        { id: 'ph-print', name: '木框相片輸出', en: 'Framed Print', unit: '8 吋 1 幅', price: 680, cost: 220, stock: 20, desc: '藝術微噴，實木框裝好。', descEn: 'Fine-art inkjet print in a solid wood frame.', art: { kind: 'g4_frame', color: '#C9A77C', accent: '#8FB39A' } },
        { id: 'ph-gift', name: '攝影禮券', en: 'Photo Gift Voucher', unit: '1 張', price: 2000, cost: 30, stock: 50, desc: '可折抵任一方案，一年有效。', descEn: 'Use toward any session, valid one year.', art: { kind: 'voucher', color: '#1A1A1A', accent: '#B3261E' } },
      ],
    },
    theme: {
      id: 'photo', kind: 'base', name: N('底片暗房', 'Film Darkroom', 'フィルム暗室', 'Phòng tối phim', 'Bilik Gelap Filem'),
      deco: null, dark: false,
      vars: { cream: '#efebe3', cream2: '#e2ddd2', ink: '#111111', ink2: '#474542', ink3: '#86827a', rose: '#b3261e', g: '#1f1f1f', gl: '#5a5753', card: '#faf8f4', deep: '#0d0d0d', deep2: '#2a2725', heroA: '#dcd7cc', heroB: '#c9c4ba', heroC: '#efe2d4', btn: '#111111' },
      hero: { pal: ['#1a1a1a', '#e8e4dc', '#b3261e', '#8a8378', '#c9a77c', '#ffffff'], dots: ['#1a1a1a', '#b3261e', '#ffffff', '#8a8378'], sky: '#f4efe6', ground: '#c9c4ba', point: '#ffe0b8' },
      style: { font: 'sans', radius: 'sharp', hero: 'minimal', grid: 'tiles', button: 'outline', texture: 'grain' },
    },
    profile: {
      avatar: '景', volume: 5, aiName: '小景', region: '台南市東區',
      staff: [
        { name: '阿景', title: '負責人・攝影師（董事酬勞）', kind: 'owner', pay: 52000 },
        { name: '小晴', title: '修圖助理・兼職', kind: 'part', pay: 15600, level: 15840, hours: 78, hourly: 200 },
      ],
      suppliers: [
        { item: '相紙、墨水', vendor: '光影影像耗材（虛構）', base: 4800 },
        { item: '實木相框', vendor: '木子框業（虛構）', base: 3600 },
        { item: '背景紙、道具', vendor: '棚內佈景材料行（虛構）', base: 1800 },
      ],
      fixed: { rent: 26000, utility: 4800, ads: 7000, depreciation: 9000, equip: '相機、鏡頭與棚燈' },
      rd: [['設備測試', '新款柔光箱與背景試拍', '自家採購', 5200, '電子發票', 6]],
      channels: { web: 0.38, line: 0.30, pos: 0.06, phone: 0.06, whatsapp: 0.04, zalo: 0.0, messenger: 0.16 },
      langs: { zh: 0.82, en: 0.10, ja: 0.08 },
    },
  },

  // 5. 瑜伽：沙色＋鼠尾草綠＋陶土橘，紙感
  {
    merchant: {
      id: 'yoga', name: '晨光瑜伽', en: 'Morning Light Yoga', type: 'yoga', cat: 'service',
      typeName: '瑜伽教室', owner: '小晴', theme: 'yoga', tagline: '慢慢呼吸，好好伸展',
      products: [
        { id: 'yg-trial', name: '單堂體驗', en: 'Trial Class', unit: '60 分鐘', price: 350, cost: 60, stock: 40, desc: '第一次來，先感受一下節奏。', descEn: 'First visit? Get a feel for the class.', art: { kind: 'g4_mat', color: '#A9BB9B', accent: '#C8714F' } },
        { id: 'yg-hatha', name: '哈達瑜伽單堂', en: 'Hatha Drop-in', unit: '75 分鐘', price: 450, cost: 80, stock: 36, desc: '穩定體位與呼吸練習，初學可。', descEn: 'Steady poses and breathwork, beginner friendly.', art: { kind: 'g4_mat', color: '#D9A68A', accent: '#4F6447' } },
        { id: 'yg-10', name: '十堂課卡', en: '10-Class Card', unit: '10 堂', price: 3800, cost: 700, stock: 20, desc: '半年內使用，可預約任一團課。', descEn: 'Any group class, valid six months.', art: { kind: 'g4_pass', color: '#7D9471', accent: '#C8714F' } },
        { id: 'yg-private', name: '一對一私人課', en: 'Private Session', unit: '60 分鐘', price: 1600, cost: 300, stock: 8, desc: '依你的程度與目標調整課表。', descEn: 'Tailored to your level and goals.', art: { kind: 'g4_mat', color: '#7D9471', accent: '#E9D8B8' } },
        { id: 'yg-mat', name: '天然橡膠瑜伽墊', en: 'Natural Rubber Mat', unit: '1 張', price: 1680, cost: 720, stock: 12, desc: '止滑好抓地，教室同款。', descEn: 'Non-slip grip, the same mat we use.', art: { kind: 'g4_mat', color: '#C8714F', accent: '#F3E6CF' } },
        { id: 'yg-bag', name: '帆布瑜伽墊背袋', en: 'Canvas Mat Bag', unit: '1 個', price: 680, cost: 240, stock: 15, desc: '可放墊子與毛巾，好背好收。', descEn: 'Fits a mat and towel, easy to carry.', art: { kind: 'tote', color: '#E9D8B8', accent: '#7D9471' } },
      ],
    },
    theme: {
      id: 'yoga', kind: 'base', name: N('晨光鼠尾草', 'Sage Morning', 'セージの朝', 'Bình minh xô thơm', 'Pagi Sage'),
      deco: 'leaf', dark: false,
      vars: { cream: '#f7f1e8', cream2: '#ece2d2', ink: '#2c2a24', ink2: '#5e594f', ink3: '#958e80', rose: '#c8714f', g: '#6f8763', gl: '#a9bb9b', card: '#fffcf6', deep: '#3b4636', deep2: '#5a6b51', heroA: '#e6dccb', heroB: '#dde6d3', heroC: '#f3d9c6', btn: '#4f6447' },
      hero: { pal: ['#a9bb9b', '#c8714f', '#e9d8b8', '#7d9471', '#f3d9c6', '#ffffff'], dots: ['#a9bb9b', '#ffffff', '#c8714f', '#e9d8b8'], sky: '#fff8ec', ground: '#d8d0bc', point: '#ffd8b0' },
      style: { font: 'sans', radius: 'round', hero: 'center', grid: 'list', button: 'outline', texture: 'paper' },
    },
    profile: {
      avatar: '晴', volume: 12, aiName: '小晨', region: '台北市松山區',
      staff: [
        { name: '小晴', title: '負責人・瑜伽老師（董事酬勞）', kind: 'owner', pay: 50000 },
        { name: '阿芷', title: '代課老師・兼職', kind: 'part', pay: 12000, level: 12540, hours: 24, hourly: 500 },
      ],
      suppliers: [
        { item: '瑜伽墊、瑜伽磚', vendor: '自在運動用品（虛構）', base: 6800 },
        { item: '帆布背袋', vendor: '好布帆布工坊（虛構）', base: 2400 },
        { item: '教室清潔用品', vendor: '亮潔清潔用品社（虛構）', base: 1200 },
      ],
      fixed: { rent: 30000, utility: 4200, ads: 6000, depreciation: 2000, equip: '木地板教室與音響' },
      rd: [['教育訓練', '陰瑜伽師資進修', '瑜伽研習社（虛構）', 8000, '收據', 21]],
      channels: { web: 0.42, line: 0.30, pos: 0.08, phone: 0.04, whatsapp: 0.04, zalo: 0.0, messenger: 0.12 },
      langs: { zh: 0.78, en: 0.14, ja: 0.08 },
    },
  },

  // 6. 健身私人教練：黑底＋螢光萊姆，窄體大字
  {
    merchant: {
      id: 'fitness', name: '鐵心私人教練', en: 'Iron Core Personal Training', type: 'fitness', cat: 'service',
      typeName: '健身私人教練', owner: '阿剛', theme: 'fitness', tagline: '每一下，都練得正確',
      products: [
        { id: 'ft-trial', name: '體驗課＋體能檢測', en: 'Trial & Fitness Check', unit: '60 分鐘', price: 800, cost: 150, stock: 10, desc: '了解你的體能狀態，再排課表。', descEn: 'Assess your fitness, then plan your sessions.', art: { kind: 'g4_dumbbell', color: '#C6FF3D', accent: '#1A1C1E' } },
        { id: 'ft-single', name: '一對一私人課', en: '1-on-1 Session', unit: '60 分鐘', price: 1500, cost: 300, stock: 24, desc: '教練全程指導動作與呼吸。', descEn: 'Full coaching on form and breathing.', art: { kind: 'g4_dumbbell', color: '#3A3F45', accent: '#C6FF3D' } },
        { id: 'ft-10', name: '私人課十堂', en: '10-Session Package', unit: '10 堂', price: 13500, cost: 2800, stock: 6, desc: '三個月內使用，每堂省 150。', descEn: 'Use within three months, save 150 each.', art: { kind: 'g4_pass', color: '#2A2E33', accent: '#C6FF3D' } },
        { id: 'ft-duo', name: '雙人小班課', en: 'Duo Session', unit: '60 分鐘', price: 2000, cost: 380, stock: 10, desc: '跟朋友一起練，兩人同價。', descEn: 'Train with a friend, one price for two.', art: { kind: 'g4_dumbbell', color: '#FF5A36', accent: '#F5F7F2' } },
        { id: 'ft-plan', name: '居家訓練計畫', en: 'Home Training Plan', unit: '4 週', price: 1200, cost: 150, stock: 20, desc: '依器材與時間量身排課表。', descEn: 'A plan built around your gear and schedule.', art: { kind: 'card', color: '#1A1C1E', accent: '#C6FF3D' } },
        { id: 'ft-band', name: '彈力帶組', en: 'Resistance Band Set', unit: '1 組 3 條', price: 560, cost: 210, stock: 25, desc: '輕中重三種阻力，好收納。', descEn: 'Light, medium and heavy, easy to pack.', art: { kind: 'pack', color: '#C6FF3D', accent: '#1A1C1E' } },
      ],
    },
    theme: {
      id: 'fitness', kind: 'base', name: N('鐵心螢光', 'Iron Neon', 'アイアンネオン', 'Thép neon', 'Neon Besi'),
      deco: null, dark: true,
      vars: { cream: '#0e0f10', cream2: '#1a1c1e', ink: '#f5f7f2', ink2: '#b9bfb4', ink3: '#848a80', rose: '#ff5a36', g: '#c6ff3d', gl: '#9be22d', card: '#17191b', deep: '#050606', deep2: '#1f2a10', heroA: '#26301a', heroB: '#1a1c1e', heroC: '#3a1d14', btn: '#c6ff3d', btnInk: '#101405' },
      hero: { pal: ['#c6ff3d', '#3a3f45', '#ff5a36', '#f5f7f2', '#9be22d', '#1a1c1e'], dots: ['#c6ff3d', '#ffffff', '#ff5a36', '#9be22d'], sky: '#e8ffd0', ground: '#1a1c1e', point: '#c6ff3d', dim: true },
      style: { font: 'condensed', radius: 'sharp', hero: 'banner', grid: 'tiles', button: 'block', texture: 'lines' },
    },
    profile: {
      avatar: '剛', volume: 7, aiName: '小鐵', region: '高雄市左營區',
      staff: [{ name: '阿剛', title: '負責人・私人教練（董事酬勞）', kind: 'owner', pay: 55000 }],
      suppliers: [
        { item: '彈力帶、訓練小物', vendor: '力行運動器材（虛構）', base: 3600 },
        { item: '器材保養與零件', vendor: '鋼鐵健身器材行（虛構）', base: 2200 },
      ],
      fixed: { rent: 28000, utility: 5200, ads: 7000, depreciation: 6500, equip: '深蹲架與啞鈴組' },
      rd: [['教育訓練', '功能性訓練認證課程', '體能教練學會（虛構）', 9000, '收據', 11]],
      channels: { web: 0.30, line: 0.38, pos: 0.04, phone: 0.06, whatsapp: 0.04, zalo: 0.0, messenger: 0.18 },
      langs: { zh: 0.85, en: 0.12, ja: 0.03 },
    },
  },

  // 7. 音樂教室：米黃樂譜紙＋深藏青＋黃銅金
  {
    merchant: {
      id: 'music', name: '和弦音樂教室', en: 'Chord Music Room', type: 'music', cat: 'service',
      typeName: '音樂才藝教室', owner: '莉莉', theme: 'music', tagline: '每個人都有自己的旋律',
      products: [
        { id: 'ms-piano', name: '鋼琴個別課', en: 'Private Piano Lesson', unit: '50 分鐘', price: 1000, cost: 180, stock: 20, desc: '兒童、成人皆可，依程度教學。', descEn: 'Kids and adults, taught at your level.', art: { kind: 'g4_piano', color: '#1F2A44', accent: '#D4A017' } },
        { id: 'ms-guitar', name: '吉他個別課', en: 'Private Guitar Lesson', unit: '50 分鐘', price: 900, cost: 160, stock: 16, desc: '從和弦到自彈自唱。', descEn: 'From first chords to playing and singing.', art: { kind: 'g4_guitar', color: '#D9954A', accent: '#3B2418' } },
        { id: 'ms-uke', name: '烏克麗麗團體班', en: 'Ukulele Group Course', unit: '4 堂', price: 2400, cost: 450, stock: 12, desc: '六人小班，四週學會三首歌。', descEn: 'Six per class, three songs in four weeks.', art: { kind: 'g4_guitar', color: '#E8C07D', accent: '#8C5A3C' } },
        { id: 'ms-trial', name: '樂器體驗課', en: 'Instrument Taster', unit: '30 分鐘', price: 300, cost: 50, stock: 20, desc: '鋼琴、吉他、烏克麗麗任選。', descEn: 'Try piano, guitar or ukulele.', art: { kind: 'g4_note', color: '#1F3A6B', accent: '#E8C66A' } },
        { id: 'ms-room', name: '琴房租借', en: 'Practice Room Rental', unit: '1 小時', price: 250, cost: 40, stock: 30, desc: '隔音琴房，附直立鋼琴。', descEn: 'Soundproof room with an upright piano.', art: { kind: 'g4_piano', color: '#5A3A2A', accent: '#E8C66A' } },
        { id: 'ms-book', name: '初學樂譜集', en: 'Beginner Songbook', unit: '1 本', price: 380, cost: 160, stock: 25, desc: '老師自編二十首入門曲。', descEn: 'Twenty starter pieces arranged by our teacher.', art: { kind: 'g4_note', color: '#C0392B', accent: '#9CB4D8' } },
      ],
    },
    theme: {
      id: 'music', kind: 'base', name: N('五線譜藍金', 'Staff & Brass', '五線譜ブラス', 'Khuông nhạc xanh vàng', 'Not Muzik Biru Emas'),
      deco: null, dark: false,
      vars: { cream: '#f8f3e7', cream2: '#eee3c9', ink: '#1b2340', ink2: '#4a5170', ink3: '#868aa0', rose: '#c0392b', g: '#1f3a6b', gl: '#d4a017', card: '#fffdf6', deep: '#141b33', deep2: '#2a3560', heroA: '#f2e2b0', heroB: '#d9def0', heroC: '#f4d6c6', btn: '#1f3a6b' },
      hero: { pal: ['#1f3a6b', '#d4a017', '#c0392b', '#f2e2b0', '#d9954a', '#ffffff'], dots: ['#d4a017', '#1f3a6b', '#ffffff', '#c0392b'], sky: '#fff8e6', ground: '#d9def0', point: '#ffd36a' },
      style: { font: 'serif', radius: 'soft', hero: 'split', grid: 'list', button: 'solid', texture: 'lines' },
    },
    profile: {
      avatar: '莉', volume: 10, aiName: '小音', region: '桃園市中壢區',
      staff: [
        { name: '莉莉', title: '負責人・鋼琴老師（董事酬勞）', kind: 'owner', pay: 48000 },
        { name: '阿弦', title: '吉他老師・兼職', kind: 'part', pay: 16000, level: 16500, hours: 40, hourly: 400 },
      ],
      suppliers: [
        { item: '樂譜印刷裝訂', vendor: '音符印刷社（虛構）', base: 2600 },
        { item: '鋼琴調音保養', vendor: '和聲琴行（虛構）', base: 3000 },
        { item: '烏克麗麗、吉他弦', vendor: '和聲琴行（虛構）', base: 1800 },
      ],
      fixed: { rent: 24000, utility: 5600, ads: 4500, depreciation: 5000, equip: '直立鋼琴與隔音琴房' },
      rd: [['教材開發', '兒童樂理繪本教材編寫', '自家採購', 3200, '電子發票', 16]],
      channels: { web: 0.24, line: 0.44, pos: 0.06, phone: 0.14, whatsapp: 0.02, zalo: 0.0, messenger: 0.10 },
      langs: { zh: 0.92, en: 0.06, ja: 0.02 },
    },
  },

  // 8. 居家清潔：清新湖水綠＋檸檬黃，圓體
  {
    merchant: {
      id: 'cleaning', name: '亮晶晶居家清潔', en: 'Sparkle Home Cleaning', type: 'cleaning', cat: 'service',
      typeName: '居家清潔', owner: '阿潔', theme: 'cleaning', tagline: '你休息，家交給我',
      products: [
        { id: 'cl-basic', name: '居家清潔', en: 'Standard Home Clean', unit: '3 小時', price: 2400, cost: 900, stock: 14, desc: '客廳、臥室、浴室基本打掃。', descEn: 'Living room, bedrooms and bathroom.', art: { kind: 'g4_spray', color: '#14A39A', accent: '#F2B705' } },
        { id: 'cl-deep', name: '深度清潔', en: 'Deep Clean', unit: '6 小時', price: 4800, cost: 1800, stock: 5, desc: '櫃內、窗溝、死角一次處理。', descEn: 'Inside cabinets, window tracks and corners.', art: { kind: 'g4_house', color: '#E6F6F3', accent: '#14A39A' } },
        { id: 'cl-kitchen', name: '廚房油污清潔', en: 'Kitchen Degrease', unit: '3 小時', price: 2800, cost: 1000, stock: 8, desc: '爐台、抽油煙機外部、牆面。', descEn: 'Stovetop, hood exterior and walls.', art: { kind: 'g4_spray', color: '#F28C6B', accent: '#0F7D76' } },
        { id: 'cl-move', name: '搬家前後清潔', en: 'Move-in/out Clean', unit: '8 小時', price: 6800, cost: 2600, stock: 3, desc: '空屋全室清潔，約 30 坪內。', descEn: 'Whole empty home, up to about 100 m².', art: { kind: 'g4_house', color: '#FFF6C8', accent: '#0F7D76' } },
        { id: 'cl-month', name: '每月定期清潔', en: 'Monthly Plan', unit: '4 次', price: 9000, cost: 3500, stock: 6, desc: '每週一次三小時，固定人員。', descEn: 'Three hours weekly, same cleaner.', art: { kind: 'g4_bucket', color: '#5FD3C4', accent: '#F2B705' } },
        { id: 'cl-kit', name: '天然清潔劑組', en: 'Natural Cleaner Set', unit: '3 瓶', price: 520, cost: 200, stock: 20, desc: '我們用的同款，溫和好洗。', descEn: 'The same gentle cleaners we use.', art: { kind: 'bottle', color: '#5FD3C4', accent: '#FFFFFF' } },
      ],
    },
    theme: {
      id: 'cleaning', kind: 'base', name: N('清新亮晶晶', 'Fresh Sparkle', 'ぴかぴかミント', 'Sạch bóng bạc hà', 'Bersih Berkilau'),
      deco: 'sparkle', dark: false,
      vars: { cream: '#f2fbfa', cream2: '#dcf3f0', ink: '#0f3a3a', ink2: '#3b6563', ink3: '#7a9a98', rose: '#f28c6b', g: '#14a39a', gl: '#5fd3c4', card: '#ffffff', deep: '#0b4f4c', deep2: '#137a72', heroA: '#c8f1ec', heroB: '#e6f6ff', heroC: '#fff6c8', btn: '#0f7d76' },
      hero: { pal: ['#5fd3c4', '#f2b705', '#ffffff', '#14a39a', '#bfe9ff', '#f28c6b'], dots: ['#ffffff', '#5fd3c4', '#f2b705', '#bfe9ff'], sky: '#f4ffff', ground: '#c8f1ec', point: '#fff1a0' },
      style: { font: 'round', radius: 'soft', hero: 'banner', grid: 'cards', button: 'pill', texture: 'grid' },
    },
    profile: {
      avatar: '潔', volume: 4, aiName: '小亮', region: '新北市板橋區',
      staff: [
        { name: '阿潔', title: '負責人・清潔師（董事酬勞）', kind: 'owner', pay: 45000 },
        { name: '阿麗姐', title: '清潔師・全職', kind: 'full', pay: 34000, level: 34800 },
        { name: '小芳', title: '清潔師・兼職', kind: 'part', pay: 16560, level: 17280, hours: 72, hourly: 230 },
      ],
      suppliers: [
        { item: '清潔劑、抹布、刷具', vendor: '亮潔清潔用品社（虛構）', base: 6200 },
        { item: '自有品牌清潔劑代工', vendor: '綠葉日化代工（虛構）', base: 3000 },
        { item: '機車油資與停車', vendor: '順行加油站（虛構）', base: 3600 },
      ],
      fixed: { rent: 9000, utility: 2400, ads: 6000, depreciation: 2500, equip: '吸塵器與蒸氣清洗機' },
      rd: [['教育訓練', '居家收納與清潔技術課程', '整理收納協會（虛構）', 3500, '收據', 25]],
      channels: { web: 0.34, line: 0.40, pos: 0.0, phone: 0.14, whatsapp: 0.02, zalo: 0.0, messenger: 0.10 },
      langs: { zh: 0.90, en: 0.06, ja: 0.04 },
    },
  },

  // 9. 民宿：海洋藍＋沙色，手寫海報風
  {
    merchant: {
      id: 'bnb', name: '海角小屋民宿', en: 'Cape Cottage B&B', type: 'bnb', cat: 'service',
      typeName: '海邊民宿', owner: '阿海', theme: 'bnb', tagline: '聽著浪聲，睡到自然醒',
      products: [
        { id: 'bb-sea', name: '海景雙人房', en: 'Sea-view Double', unit: '1 晚', price: 2800, cost: 700, stock: 7, desc: '大窗看海，含雙人手作早餐。', descEn: 'Big ocean window, breakfast for two.', art: { kind: 'g4_bed', color: '#4FA3C7', accent: '#C9A27A' } },
        { id: 'bb-loft', name: '閣樓雙人房', en: 'Attic Double', unit: '1 晚', price: 2200, cost: 550, stock: 7, desc: '斜屋頂天窗，可躺著看星星。', descEn: 'Skylight under a sloped roof, stargazing bed.', art: { kind: 'g4_bed', color: '#F3E6C9', accent: '#8A6A4A' } },
        { id: 'bb-family', name: '家庭四人房', en: 'Family Room for Four', unit: '1 晚', price: 3800, cost: 950, stock: 7, desc: '兩張雙人床，含四人早餐。', descEn: 'Two double beds, breakfast for four.', art: { kind: 'g4_bed', color: '#E07A5F', accent: '#1B5B85' } },
        { id: 'bb-whole', name: '包棟（三房十人）', en: 'Whole House (3 Rooms, 10 Guests)', unit: '1 晚', price: 12800, cost: 3200, stock: 2, desc: '整棟獨享，含烤肉區與客廳。', descEn: 'The whole house, BBQ deck and lounge.', art: { kind: 'g4_house', color: '#F7F1E3', accent: '#1D6FA3' } },
        { id: 'bb-bfast', name: '加購手作早餐', en: 'Extra Breakfast', unit: '1 人', price: 220, cost: 90, stock: 60, desc: '在地食材，現做吐司與沙拉。', descEn: 'Local produce, fresh toast and salad.', art: { kind: 'bowl', color: '#F3E6C9', accent: '#E07A5F' } },
        { id: 'bb-gift', name: '住宿禮券', en: 'Stay Gift Voucher', unit: '1 張', price: 2800, cost: 50, stock: 30, desc: '平日雙人房一晚，一年有效。', descEn: 'One weekday double night, valid one year.', art: { kind: 'voucher', color: '#1D6FA3', accent: '#F3E6C9' } },
      ],
    },
    theme: {
      id: 'bnb', kind: 'base', name: N('海角沙灘', 'Cape Seaside', '岬の海辺', 'Bờ biển mũi đất', 'Pantai Tanjung'),
      deco: 'star', dark: false,
      vars: { cream: '#f7f3ea', cream2: '#ece3d0', ink: '#12324a', ink2: '#425c70', ink3: '#8296a3', rose: '#e07a5f', g: '#1d6fa3', gl: '#4fa3c7', card: '#fffdf8', deep: '#0e2f47', deep2: '#1b4f72', heroA: '#cfe8f3', heroB: '#f3e6c9', heroC: '#ffe0cc', btn: '#1b5b85' },
      hero: { pal: ['#1d6fa3', '#4fa3c7', '#f3e6c9', '#e07a5f', '#ffffff', '#c9a27a'], dots: ['#ffffff', '#4fa3c7', '#f3e6c9', '#e07a5f'], sky: '#e6f6ff', ground: '#e9d6b0', point: '#ffd9a8' },
      style: { font: 'hand', radius: 'soft', hero: 'poster', grid: 'magazine', button: 'solid', texture: 'paper' },
    },
    profile: {
      avatar: '海', volume: 4, aiName: '小浪', region: '台東縣成功鎮',
      staff: [
        { name: '阿海', title: '負責人・民宿主人（董事酬勞）', kind: 'owner', pay: 45000 },
        { name: '阿珠', title: '房務・兼職', kind: 'part', pay: 15000, level: 15840, hours: 75, hourly: 200 },
      ],
      suppliers: [
        { item: '床單、毛巾送洗', vendor: '海風布巾洗衣坊（虛構）', base: 9600 },
        { item: '早餐食材', vendor: '東岸小農直送（虛構）', base: 7200 },
        { item: '備品（牙刷、沐浴乳）', vendor: '旅宿備品行（虛構）', base: 2800 },
      ],
      fixed: { rent: 38000, utility: 9800, ads: 8000, depreciation: 7500, equip: '冷氣、熱水器與床組' },
      rd: [['設計開發', '包棟方案烤肉區佈置試辦', '自家採購', 6000, '電子發票', 4]],
      channels: { web: 0.46, line: 0.24, pos: 0.0, phone: 0.12, whatsapp: 0.06, zalo: 0.0, messenger: 0.12 },
      langs: { zh: 0.70, en: 0.18, ja: 0.12 },
    },
  },

  // 10. 手機維修：深藍黑＋電光藍＋警示橘，等寬字
  {
    merchant: {
      id: 'phonefix', name: '快修手機站', en: 'QuickFix Phone Lab', type: 'phonefix', cat: 'service',
      typeName: '手機維修', owner: '阿哲', theme: 'phonefix', tagline: '多數維修，一小時取件',
      products: [
        { id: 'pf-screen', name: '螢幕更換', en: 'Screen Replacement', unit: '1 次', price: 2800, cost: 1500, stock: 15, desc: '常見機型現場更換，保固 90 天。', descEn: 'Common models on the spot, 90-day warranty.', art: { kind: 'g4_phone', color: '#36B3FF', accent: '#1A3A5C' } },
        { id: 'pf-battery', name: '電池更換', en: 'Battery Replacement', unit: '1 次', price: 1200, cost: 550, stock: 20, desc: '約 40 分鐘，舊電池代為回收。', descEn: 'About 40 minutes, old battery recycled.', art: { kind: 'g4_phone', color: '#FF8A3D', accent: '#2BD47D' } },
        { id: 'pf-port', name: '充電孔清潔維修', en: 'Charging Port Repair', unit: '1 次', price: 600, cost: 120, stock: 20, desc: '接觸不良先清潔，必要再換件。', descEn: 'Clean first, replace parts only if needed.', art: { kind: 'g4_tool', color: '#FF8A3D', accent: '#36B3FF' } },
        { id: 'pf-check', name: '故障檢測', en: 'Diagnostic Check', unit: '1 次', price: 200, cost: 20, stock: 40, desc: '確認問題再報價，維修可折抵。', descEn: 'Diagnose before quoting, credited if repaired.', art: { kind: 'g4_tool', color: '#36B3FF', accent: '#5A6B80' } },
        { id: 'pf-film', name: '玻璃保護貼含施工', en: 'Tempered Glass + Fitting', unit: '1 片', price: 490, cost: 120, stock: 40, desc: '9H 鋼化玻璃，現場無塵貼好。', descEn: '9H tempered glass, fitted dust-free.', art: { kind: 'g4_phone', color: '#C9D6E3', accent: '#36B3FF' } },
        { id: 'pf-case', name: '防摔手機殼', en: 'Shockproof Case', unit: '1 個', price: 590, cost: 210, stock: 30, desc: '四角氣墊，多款機型可選。', descEn: 'Air-cushion corners, many models.', art: { kind: 'g4_phone', color: '#2B3442', accent: '#FF8A3D' } },
      ],
    },
    theme: {
      id: 'phonefix', kind: 'base', name: N('電路藍橘', 'Circuit Blue', '回路ブルー', 'Mạch xanh cam', 'Litar Biru'),
      deco: null, dark: true,
      vars: { cream: '#0d1520', cream2: '#152132', ink: '#e6f0fa', ink2: '#a3b4c6', ink3: '#7489a0', rose: '#ff8a3d', g: '#36b3ff', gl: '#5fd0ff', card: '#122033', deep: '#070c13', deep2: '#0f2740', heroA: '#123a5a', heroB: '#1a2a40', heroC: '#3a2a1a', btn: '#ff8a3d', btnInk: '#1a0e04' },
      hero: { pal: ['#36b3ff', '#ff8a3d', '#2b3442', '#c9d6e3', '#5fd0ff', '#2bd47d'], dots: ['#36b3ff', '#ff8a3d', '#ffffff', '#2bd47d'], sky: '#bfe6ff', ground: '#152132', point: '#36b3ff', dim: true },
      style: { font: 'mono', radius: 'sharp', hero: 'split', grid: 'list', button: 'block', texture: 'grid' },
    },
    profile: {
      avatar: '哲', volume: 11, aiName: '小修', region: '台中市北區',
      staff: [
        { name: '阿哲', title: '負責人・維修技師（董事酬勞）', kind: 'owner', pay: 50000 },
        { name: '阿宏', title: '維修技師・全職', kind: 'full', pay: 33000, level: 33300 },
      ],
      suppliers: [
        { item: '螢幕、電池零件', vendor: '鑫達通訊零件（虛構）', base: 32000 },
        { item: '保護貼、手機殼', vendor: '亮面配件批發（虛構）', base: 6800 },
        { item: '維修耗材、膠條', vendor: '精工電子材料（虛構）', base: 1800 },
      ],
      fixed: { rent: 26000, utility: 4600, ads: 5500, depreciation: 3500, equip: '拆機熱風台與顯微鏡' },
      rd: [['設備測試', '新型號拆機治具試用', '自家採購', 4800, '電子發票', 8]],
      channels: { web: 0.26, line: 0.30, pos: 0.24, phone: 0.10, whatsapp: 0.02, zalo: 0.02, messenger: 0.06 },
      langs: { zh: 0.82, en: 0.08, vi: 0.06, ja: 0.04 },
    },
  },

  // 11. 汽車美容：冷銀灰＋皇家藍＋賽車紅，膠囊圓角
  {
    merchant: {
      id: 'carcare', name: '光澤汽車美容', en: 'Gloss Lab Auto Detailing', type: 'carcare', cat: 'service',
      typeName: '汽車美容', owner: '阿凱哥', theme: 'carcare', tagline: '亮到可以當鏡子',
      products: [
        { id: 'cc-wash', name: '精緻手工洗車', en: 'Premium Hand Wash', unit: '60 分鐘', price: 600, cost: 120, stock: 30, desc: '雙桶洗法，輪框與門邊都清。', descEn: 'Two-bucket wash, wheels and door jambs too.', art: { kind: 'g4_car', color: '#C8102E', accent: '#F2F4F7' } },
        { id: 'cc-wax', name: '洗車＋打蠟', en: 'Wash & Wax', unit: '120 分鐘', price: 1500, cost: 350, stock: 15, desc: '棕櫚蠟手工上蠟，深邃亮面。', descEn: 'Hand-applied carnauba for deep gloss.', art: { kind: 'g4_car', color: '#0B3D91', accent: '#C8102E' } },
        { id: 'cc-interior', name: '內裝深層清潔', en: 'Interior Deep Clean', unit: '180 分鐘', price: 2800, cost: 700, stock: 8, desc: '座椅、地毯、冷氣出風口。', descEn: 'Seats, carpets and air vents.', art: { kind: 'g4_spray', color: '#2B2F36', accent: '#C8102E' } },
        { id: 'cc-coat', name: '鍍膜施工', en: 'Ceramic Coating', unit: '1 天', price: 12000, cost: 3800, stock: 3, desc: '含拋光，留車一天施工。', descEn: 'Polish included, one-day drop-off.', art: { kind: 'g4_car', color: '#1C1F24', accent: '#5FB0FF' } },
        { id: 'cc-pass', name: '洗車五次卡', en: '5-Wash Pass', unit: '5 次', price: 2700, cost: 550, stock: 20, desc: '精緻洗車五次，半年內使用。', descEn: 'Five premium washes, within six months.', art: { kind: 'g4_pass', color: '#0B3D91', accent: '#C8102E' } },
        { id: 'cc-kit', name: '車用清潔組', en: 'Car Care Kit', unit: '1 組', price: 880, cost: 360, stock: 15, desc: '洗車精、內裝清潔劑與纖維布。', descEn: 'Shampoo, interior cleaner and microfibre.', art: { kind: 'bottle', color: '#0B3D91', accent: '#E3E6EA' } },
      ],
    },
    theme: {
      id: 'carcare', kind: 'base', name: N('鏡面賽道', 'Mirror Track', 'ミラートラック', 'Đường đua gương', 'Litar Cermin'),
      deco: null, dark: false,
      vars: { cream: '#eef1f5', cream2: '#dde2e9', ink: '#121722', ink2: '#454e5c', ink3: '#848c98', rose: '#c8102e', g: '#0b3d91', gl: '#3d72c9', card: '#ffffff', deep: '#0a1a33', deep2: '#7a0f1e', heroA: '#dfe6f0', heroB: '#c9d2de', heroC: '#f6d4d8', btn: '#0b3d91' },
      hero: { pal: ['#0b3d91', '#c8102e', '#e3e6ea', '#1c1f24', '#5fb0ff', '#ffffff'], dots: ['#ffffff', '#0b3d91', '#c8102e', '#5fb0ff'], sky: '#f2f6ff', ground: '#c9d2de', point: '#9cc8ff' },
      style: { font: 'sans', radius: 'pill', hero: 'banner', grid: 'cards', button: 'solid', texture: 'none' },
    },
    profile: {
      avatar: '凱', volume: 6, aiName: '小光', region: '新北市新莊區',
      staff: [
        { name: '阿凱哥', title: '負責人・美容技師（董事酬勞）', kind: 'owner', pay: 52000 },
        { name: '小武', title: '美容技師・全職', kind: 'full', pay: 32000, level: 33300 },
      ],
      suppliers: [
        { item: '洗車精、蠟、鍍膜劑', vendor: '亮車化學用品（虛構）', base: 12000 },
        { item: '纖維布、海綿耗材', vendor: '細纖布業（虛構）', base: 3200 },
        { item: '自有品牌清潔組代工', vendor: '綠葉日化代工（虛構）', base: 3600 },
      ],
      fixed: { rent: 35000, utility: 8200, ads: 6000, depreciation: 5500, equip: '拋光機與高壓洗車機' },
      rd: [['設備測試', '新款鍍膜劑耐候試驗', '自家採購', 5600, '電子發票', 19]],
      channels: { web: 0.32, line: 0.36, pos: 0.10, phone: 0.12, whatsapp: 0.02, zalo: 0.0, messenger: 0.08 },
      langs: { zh: 0.90, en: 0.06, ja: 0.04 },
    },
  },
];
