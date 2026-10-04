// 商品插畫（純 SVG，離線可用；無任何外部圖片）
let uid = 0;

export function productArt(id, size = 120, { bg = true } = {}) {
  const u = 'a' + (++uid);
  const body = ART[id] ? ART[id](u) : '';
  return `<svg class="art" width="${size}" height="${size}" viewBox="0 0 120 120" aria-hidden="true">${body.replace(/BG/, bg ? '' : 'display:none')}</svg>`;
}

const plate = (u, c = '#ffffff') => `<ellipse cx="60" cy="92" rx="46" ry="12" fill="rgba(0,0,0,.18)"/><ellipse cx="60" cy="88" rx="48" ry="13" fill="${c}"/><ellipse cx="60" cy="86" rx="40" ry="9" fill="#f3efe8"/>`;
const halo = (u, c) => `<radialGradient id="${u}h"><stop offset="0" stop-color="${c}" stop-opacity=".55"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;

const ART = {
  lemon: (u) => `<defs>${halo(u, '#F4D35E')}<radialGradient id="${u}f" cx=".45" cy=".4"><stop offset="0" stop-color="#fff6b0"/><stop offset=".7" stop-color="#f6d548"/><stop offset="1" stop-color="#e2b52a"/></radialGradient>
    <linearGradient id="${u}c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9b46a"/><stop offset="1" stop-color="#b9783a"/></linearGradient></defs>
    <circle cx="60" cy="58" r="56" fill="url(#${u}h)" style="BG"/>${plate(u)}
    <ellipse cx="60" cy="76" rx="38" ry="12" fill="#a8672f"/>
    <path d="M22 66 Q60 92 98 66 L98 74 Q60 100 22 74z" fill="url(#${u}c)"/>
    <ellipse cx="60" cy="66" rx="38" ry="15" fill="url(#${u}c)"/>
    <ellipse cx="60" cy="64.5" rx="32" ry="11.5" fill="url(#${u}f)"/>
    ${[0, 1, 2, 3, 4, 5].map(i => { const a = i / 6 * Math.PI * 2; return `<path d="M${60 + Math.cos(a) * 20} ${63 + Math.sin(a) * 6.5} q3 -8 6 0z" fill="#fff8ee" stroke="#f0d9b8" stroke-width=".6"/>`; }).join('')}
    <g transform="translate(60 52)"><circle r="11" fill="#fbe36a" stroke="#f2c230" stroke-width="2"/><circle r="8" fill="#fff4a6"/>${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<line x1="0" y1="0" x2="${Math.cos(i * Math.PI / 4) * 8}" y2="${Math.sin(i * Math.PI / 4) * 8}" stroke="#f2c230" stroke-width="1"/>`).join('')}</g>
    <path d="M70 46 q8 -6 12 0 q-6 4 -12 0z" fill="#58b368"/>`,

  roll: (u) => `<defs>${halo(u, '#F7B2C4')}<linearGradient id="${u}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6dca6"/><stop offset="1" stop-color="#e2b46c"/></linearGradient></defs>
    <circle cx="60" cy="58" r="56" fill="url(#${u}h)" style="BG"/>${plate(u)}
    <path d="M30 50 h48 a22 22 0 0 1 0 38 h-48z" fill="url(#${u}s)"/>
    <path d="M30 50 h48" stroke="#c98d48" stroke-width="2"/>
    <circle cx="34" cy="69" r="21" fill="#f3d39a" stroke="#c98d48" stroke-width="2.5"/>
    <path d="M34 69 m0 -3 a3 3 0 1 1 -3 3 a7 7 0 1 1 7 7 a11 11 0 1 1 -11 -11 a15 15 0 1 1 15 15" fill="none" stroke="#fffaf2" stroke-width="5" stroke-linecap="round"/>
    <g><path d="M34 63 q6 -2 6 5 q-1 6 -6 7 q-5 -1 -6 -7 q0 -7 6 -5z" fill="#e8384f"/><circle cx="32" cy="67" r=".8" fill="#ffe08a"/><circle cx="36" cy="69" r=".8" fill="#ffe08a"/><circle cx="34" cy="72" r=".8" fill="#ffe08a"/></g>
    <g transform="translate(68 40)"><path d="M0 4 q8 -4 10 6 q-2 9 -10 10 q-8 -1 -10 -10 q2 -10 10 -6z" fill="#e8384f"/><path d="M-4 3 l4 -5 l4 5" fill="#58b368"/></g>
    <path d="M56 48 q6 -8 12 0 q6 -8 12 0" fill="#fffaf2"/>`,

  basque: (u) => `<defs>${halo(u, '#B79AD9')}<linearGradient id="${u}t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b160c"/><stop offset=".6" stop-color="#6a3a1c"/><stop offset="1" stop-color="#a5602b"/></linearGradient>
    <linearGradient id="${u}i" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff1d6"/><stop offset="1" stop-color="#f3d8a6"/></linearGradient></defs>
    <circle cx="60" cy="58" r="56" fill="url(#${u}h)" style="BG"/>${plate(u)}
    <path d="M22 60 L80 42 L100 58 L100 84 L42 92 L22 80z" fill="url(#${u}i)"/>
    <path d="M42 66 L100 58 L100 84 L42 92z" fill="#f6e2bb"/>
    <path d="M42 74 L100 67 L100 74 L42 81z" fill="#a98bd6"/>
    <path d="M42 70 Q70 64 100 63" stroke="#c7b2ea" stroke-width="1.5" fill="none"/>
    <path d="M22 60 L80 42 L100 58 L42 66z" fill="url(#${u}t)"/>
    <path d="M22 60 L42 66 L42 92 L22 80z" fill="#7c4a24"/>
    <path d="M30 59 q20 -6 40 -12" stroke="#1a0b05" stroke-width="2" opacity=".5" fill="none"/>`,

  pound: (u) => `<defs>${halo(u, '#C9935A')}<linearGradient id="${u}p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b56f33"/><stop offset="1" stop-color="#7d4520"/></linearGradient></defs>
    <circle cx="60" cy="58" r="56" fill="url(#${u}h)" style="BG"/>${plate(u)}
    <path d="M24 56 q36 -18 66 0 v26 h-66z" fill="url(#${u}p)"/>
    <path d="M40 48 q14 6 30 0" stroke="#e7b06f" stroke-width="3" fill="none" stroke-linecap="round"/>
    <rect x="90" y="56" width="10" height="26" fill="#7d4520"/>
    <path d="M90 56 q5 -9 10 0" fill="#9a5a2a"/>
    <path d="M74 58 h18 v26 h-18z" fill="#e7c98e" transform="skewY(-4)"/>
    ${[[78, 66], [84, 62], [86, 72], [80, 76], [88, 79]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.1" fill="#6b7d3a"/>`).join('')}
    <g transform="translate(36 34)"><path d="M0 8 q6 -14 14 -6 q-4 10 -14 6z" fill="#4f9a5e"/><path d="M2 7 q4 -4 9 -6" stroke="#2d6b3a" fill="none"/></g>`,

  cookie: (u) => `<defs>${halo(u, '#E2B56F')}<linearGradient id="${u}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f6b4a"/><stop offset="1" stop-color="#0f4430"/></linearGradient></defs>
    <circle cx="60" cy="58" r="56" fill="url(#${u}h)" style="BG"/>
    <ellipse cx="60" cy="94" rx="46" ry="8" fill="rgba(0,0,0,.18)"/>
    <path d="M16 44 h88 v44 a4 4 0 0 1 -4 4 h-80 a4 4 0 0 1 -4 -4z" fill="url(#${u}b)"/>
    <rect x="20" y="48" width="80" height="38" rx="3" fill="#f7ecd8"/>
    ${[[32, 58, '#d9a35b'], [50, 58, '#8b5a3c'], [68, 58, '#e8c07a'], [86, 58, '#d9a35b'], [32, 76, '#e8c07a'], [50, 76, '#d9a35b'], [68, 76, '#8b5a3c'], [86, 76, '#e8c07a']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="7.5" fill="${c}"/><circle cx="${x - 2}" cy="${y - 2}" r="1.2" fill="#5a3320"/><circle cx="${x + 2.5}" cy="${y + 1.5}" r="1" fill="#5a3320"/>`).join('')}
    <path d="M14 30 h92 l-4 14 h-84z" fill="#2DB674"/>
    <rect x="54" y="28" width="12" height="64" fill="#F0A531" opacity=".95"/>
    <path d="M60 28 q-14 -14 -20 -4 q4 8 20 4 q14 -14 20 -4 q-4 8 -20 4z" fill="#F0A531"/>`,

  pineapple: (u) => `<defs>${halo(u, '#F2C14E')}<linearGradient id="${u}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3c066"/><stop offset="1" stop-color="#d48f34"/></linearGradient></defs>
    <circle cx="60" cy="58" r="56" fill="url(#${u}h)" style="BG"/>${plate(u)}
    ${[[30, 50], [62, 50], [30, 68]].map(([x, y]) => `<rect x="${x}" y="${y}" width="28" height="18" rx="4" fill="url(#${u}g)" stroke="#b9772a" stroke-width="1.2"/><path d="M${x + 4} ${y + 4} h20 M${x + 4} ${y + 9} h20 M${x + 4} ${y + 14} h20" stroke="#e7a84c" stroke-width="1"/>`).join('')}
    <rect x="62" y="68" width="28" height="18" rx="4" fill="url(#${u}g)" stroke="#b9772a" stroke-width="1.2"/>
    <rect x="66" y="72" width="20" height="10" rx="2" fill="#f7d34f"/><path d="M68 77 q4 -3 8 0 q4 3 8 0" stroke="#e0a92a" fill="none"/>
    <g transform="translate(86 26)"><ellipse cx="0" cy="12" rx="8" ry="10" fill="#f2b632"/><path d="M-6 8 l12 8 M-6 14 l12 -8 M-6 16 l12 0" stroke="#c98a1c" stroke-width="1"/><path d="M0 2 l-6 -10 l6 5 l2 -9 l2 9 l6 -5z" fill="#58b368"/></g>`,

  canele: (u) => `<defs>${halo(u, '#DD5597')}<linearGradient id="${u}k" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a1a0c"/><stop offset=".45" stop-color="#8b4a22"/><stop offset="1" stop-color="#3a1a0c"/></linearGradient></defs>
    <circle cx="60" cy="58" r="56" fill="url(#${u}h)" style="BG"/>${plate(u)}
    ${[[38, 56, 1], [82, 56, 1], [60, 62, 1.15]].map(([x, y, s]) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-14 -16 h28 l-3 30 h-22z" fill="url(#${u}k)"/>${[-9, -3, 3, 9].map(dx => `<path d="M${dx} -16 l${dx * -0.15} 30" stroke="#24100a" stroke-width="1.4" opacity=".6"/>`).join('')}<ellipse cx="0" cy="-16" rx="14" ry="4.5" fill="#6b3518"/><ellipse cx="0" cy="-16.5" rx="6" ry="2" fill="#c47a3a"/></g>`).join('')}`,
};
