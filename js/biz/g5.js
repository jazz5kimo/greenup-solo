// 第 5 組：精品燕窩 1 家（嬿窩：使用者自己的品牌，第一個正式站；商品、價格、規格仍為示範，等店主提供實際資料）
// BIZ：{ merchant, theme, profile }；ART：本組新增的商品插圖（kind 皆以 g5_ 開頭）
// merchant.layout = 'luxe'（精品版面）；merchant.story 是前台的品牌故事區塊（shop/story.js 繪製，五語）。
// 燕窩是一般食品：文案只談口感、產地、工序與保存，不寫任何療效或保健功效（食品安全衛生管理法）。

// ---- 色彩工具（本檔自用） ----
const toRgb = (h) => { h = String(h || '#999').replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = (r, g, b) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const x = toRgb(a), y = toRgb(b); return toHex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t); };
const dk = (c, t = 0.25) => mix(c, '#000000', t);
const lt = (c, t = 0.35) => mix(c, '#ffffff', t);
const f1 = (n) => (+n).toFixed(1);

// ---- SVG 零件 ----
const vg = (id, a, b) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const hg = (id, a, b, m) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${a}"/>${m ? `<stop offset=".5" stop-color="${m}"/>` : ''}<stop offset="1" stop-color="${b}"/></linearGradient>`;
const rg = (id, a, b, cx = 0.4, cy = 0.35) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r=".75"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>`;
const sh = (rx = 36, cy = 100) => `<ellipse cx="60" cy="${cy}" rx="${rx}" ry="${Math.max(4, rx / 6).toFixed(1)}" fill="rgba(40,30,10,.18)"/>`;
// 金屬金（香檳金漸層）
const GOLD = ['#f7e3a6', '#d9b56b', '#a77c33'];
const goldV = (id) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GOLD[0]}"/><stop offset=".55" stop-color="${GOLD[1]}"/><stop offset="1" stop-color="${GOLD[2]}"/></linearGradient>`;
// 小燕子剪影（朝右，約 22×16）
const swallow = (x, y, s = 1, c = '#d9b56b', r = 0) => `<path transform="translate(${x} ${y}) rotate(${r}) scale(${s})" d="M0 8 C4 4.5 8 3.6 11.5 4.6 L21 0 L15.6 6.2 C17.6 7 18.8 8.6 18.2 9.8 C15.6 9 13.4 9.2 11.6 10.2 L3 16 L6.6 10.2 C4 10.4 1.6 9.6 0 8 Z" fill="${c}"/>`;
// 燕絲：一束細細的波浪線（燕窩的纖維感）
const strands = (x0, x1, y0, y1, n, c, w = 1.1, o = 0.75, seed = 1) => { let s = ''; let a = seed; const r = () => (a = (a * 9301 + 49297) % 233280) / 233280; for (let i = 0; i < n; i++) { const y = y0 + (y1 - y0) * (i + 0.5) / n, amp = 1 + r() * 1.6, ph = r() * 6; let d = `M${f1(x0 + r() * 3)} ${f1(y)}`; for (let x = x0 + 4; x <= x1; x += 4) d += ` L${f1(x)} ${f1(y + Math.sin(x * 0.35 + ph) * amp)}`; s += `<path d="${d}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round" opacity="${f1(o * (0.6 + r() * 0.4))}"/>`; } return s; };
// 燕盞（半月形，cx 中心、w 寬）
const nestCup = (u, cx, cy, w, c, k = '') => { const h = w * 0.42; return `<g>
    <path d="M${f1(cx - w / 2)} ${f1(cy - h * 0.25)} Q${cx} ${f1(cy + h * 1.25)} ${f1(cx + w / 2)} ${f1(cy - h * 0.25)} Q${cx} ${f1(cy + h * 0.25)} ${f1(cx - w / 2)} ${f1(cy - h * 0.25)} Z" fill="url(#${u}n${k})"/>
    <path d="M${f1(cx - w / 2)} ${f1(cy - h * 0.25)} Q${cx} ${f1(cy + h * 0.25)} ${f1(cx + w / 2)} ${f1(cy - h * 0.25)} Q${cx} ${f1(cy - h * 0.05)} ${f1(cx - w / 2)} ${f1(cy - h * 0.25)} Z" fill="${dk(c, 0.18)}" opacity=".55"/>
    ${Array.from({ length: 6 }, (_, i) => { const t = (i + 1) / 7, yy = cy - h * 0.1 + h * 0.95 * t; const half = (w / 2) * Math.sqrt(1 - Math.pow(t * 0.92, 2)) * 0.96; return `<path d="M${f1(cx - half)} ${f1(yy - h * 0.12)} Q${cx} ${f1(yy + h * 0.2)} ${f1(cx + half)} ${f1(yy - h * 0.12)}" stroke="${dk(c, 0.16)}" stroke-width=".9" fill="none" opacity=".55"/>`; }).join('')}
    <path d="M${f1(cx - w * 0.36)} ${f1(cy + h * 0.1)} Q${f1(cx - w * 0.1)} ${f1(cy + h * 0.65)} ${f1(cx + w * 0.12)} ${f1(cy + h * 0.6)}" stroke="#fff" stroke-width="2" fill="none" opacity=".55" stroke-linecap="round"/>
  </g>`; };
// 玻璃瓶（鮮燉燕窩）：x 中心、y 瓶底、w 寬、h 高
const jar = (u, x, y, w, h, c, a, k = '') => { const x0 = x - w / 2, top = y - h, lid = Math.max(7, h * 0.16); return `
    <rect x="${f1(x0)}" y="${f1(top + lid - 1)}" width="${w}" height="${f1(h - lid + 1)}" rx="${f1(w * 0.18)}" fill="#ffffff" opacity=".55"/>
    <rect x="${f1(x0 + 2)}" y="${f1(top + lid + h * 0.12)}" width="${w - 4}" height="${f1(h - lid - h * 0.12 - 2)}" rx="${f1(w * 0.15)}" fill="url(#${u}j${k})"/>
    ${strands(x0 + 5, x0 + w - 5, top + lid + h * 0.18, y - 6, Math.max(4, Math.round(h / 9)), lt(c, 0.6), 1, 0.8, w + h)}
    <rect x="${f1(x0)}" y="${f1(top + lid - 1)}" width="${w}" height="${f1(h - lid + 1)}" rx="${f1(w * 0.18)}" fill="none" stroke="${dk(c, 0.25)}" stroke-opacity=".35" stroke-width="1.2"/>
    <rect x="${f1(x0 + w * 0.12)}" y="${f1(top + lid + 3)}" width="${f1(w * 0.12)}" height="${f1(h * 0.55)}" rx="3" fill="#fff" opacity=".6"/>
    <rect x="${f1(x0 + w * 0.2)}" y="${f1(top + lid + h * 0.36)}" width="${f1(w * 0.6)}" height="${f1(h * 0.28)}" rx="2" fill="${a}"/>
    <rect x="${f1(x0 + w * 0.2 + 1.5)}" y="${f1(top + lid + h * 0.36 + 1.5)}" width="${f1(w * 0.6 - 3)}" height="${f1(h * 0.28 - 3)}" rx="1.5" fill="none" stroke="url(#${u}g)" stroke-width=".9"/>
    ${swallow(x - w * 0.16, top + lid + h * 0.36 + h * 0.06, w / 70, GOLD[1])}
    <rect x="${f1(x0 - 1.5)}" y="${f1(top)}" width="${w + 3}" height="${f1(lid)}" rx="${f1(lid * 0.35)}" fill="url(#${u}g)"/>
    ${Array.from({ length: Math.round(w / 3.4) }, (_, i) => `<rect x="${f1(x0 + 1 + i * 3.4)}" y="${f1(top + 1.6)}" width=".9" height="${f1(lid - 3.2)}" fill="${GOLD[2]}" opacity=".45"/>`).join('')}
    <rect x="${f1(x0 + 1)}" y="${f1(top + 1)}" width="${w - 1}" height="1.4" rx=".7" fill="#fff" opacity=".6"/>`; };

// ---- 新增插圖 ----
export const ART = {
  // 鮮燉燕窩：金蓋玻璃瓶＋金色緞帶
  g5_jar: (u, c, a) => `<defs>${vg(u + 'j', lt(c, 0.45), c)}${goldV(u + 'g')}</defs>${sh(30)}
    ${jar(u, 60, 98, 44, 64, c, a)}
    <path d="M86 92 q8 -2 12 4" stroke="url(#${u}g)" stroke-width="3" fill="none" stroke-linecap="round"/>
    ${[[22, 40, 1], [96, 30, 0.8], [28, 70, 0.6]].map(([x, y, s]) => `<path d="M${x} ${y - 4 * s} L${x + s} ${y - s} L${x + 4 * s} ${y} L${x + s} ${y + s} L${x} ${y + 4 * s} L${x - s} ${y + s} L${x - 4 * s} ${y} L${x - s} ${y - s}Z" fill="${GOLD[1]}" opacity=".8"/>`).join('')}`,

  // 嘗鮮兩入：一高一矮兩瓶，繫金緞帶
  g5_duo: (u, c, a) => `<defs>${vg(u + 'j', lt(c, 0.45), c)}${goldV(u + 'g')}</defs>${sh(40)}
    ${jar(u, 44, 98, 34, 56, c, a)}${jar(u, 77, 98, 34, 48, c, a)}
    <path d="M27 82 Q60 92 94 84" stroke="url(#${u}g)" stroke-width="3.2" fill="none"/>
    <path d="M60 88 q-10 -10 -14 -2 q4 6 14 2 q10 -10 14 -2 q-4 6 -14 2z" fill="url(#${u}g)"/><path d="M58 89 l-6 10 M62 89 l6 10" stroke="${GOLD[2]}" stroke-width="2.4" stroke-linecap="round"/>`,

  // 特級燕盞：青瓷淺盤上的兩盞燕盞
  g5_cup: (u, c, a) => `<defs>${rg(u + 'n', lt(c, 0.5), dk(c, 0.08), 0.45, 0.3)}${rg(u + 'p', lt(a, 0.55), a, 0.5, 0.3)}</defs>${sh(44, 101)}
    <ellipse cx="60" cy="88" rx="46" ry="12" fill="url(#${u}p)"/><ellipse cx="60" cy="86" rx="38" ry="8.5" fill="${lt(a, 0.35)}"/><ellipse cx="60" cy="86" rx="38" ry="8.5" fill="none" stroke="#fff" stroke-opacity=".5"/>
    ${nestCup(u, 46, 70, 40, c)}${nestCup(u, 76, 64, 38, c)}
    ${strands(36, 58, 66, 72, 2, lt(c, 0.7), 0.8, 0.6, 3)}`,

  // 燕條：散開成扇形的燕條，墊和紙
  g5_strip: (u, c, a) => `<defs>${vg(u + 'p', lt(a, 0.75), lt(a, 0.45))}</defs>${sh(44, 101)}
    <path d="M14 92 L22 40 L100 34 L106 88 Z" fill="url(#${u}p)"/><path d="M14 92 L22 40 L100 34 L106 88 Z" fill="none" stroke="${a}" stroke-opacity=".35"/>
    ${[-26, -14, -3, 8, 19, 30].map((r, i) => { const cx = 60, cy = 92; const L = 46 - Math.abs(r) * 0.25; return `<g transform="rotate(${r} ${cx} ${cy})"><path d="M${cx - 6} ${cy - 6} Q${cx - 8} ${cy - L / 2} ${cx - 3} ${cy - L} Q${cx + 4} ${cy - L - 2} ${cx + 6} ${cy - L + 4} Q${cx + 8} ${cy - L / 2} ${cx + 5} ${cy - 6} Z" fill="${i % 2 ? c : lt(c, 0.25)}" stroke="${dk(c, 0.18)}" stroke-width=".8"/>${strands(cx - 5, cx + 5, cy - L + 6, cy - 10, 5, dk(c, 0.15), 0.6, 0.55, i + 4)}</g>`; }).join('')}
    <circle cx="60" cy="90" r="5" fill="${a}"/><circle cx="60" cy="90" r="2.2" fill="#fff" opacity=".7"/>`,

  // 金緞禮盒：深色禮盒＋金色緞帶蝴蝶結＋燙金燕子
  g5_gift: (u, c, a) => `<defs>${vg(u + 'b', lt(c, 0.12), dk(c, 0.25))}${vg(u + 'l', lt(c, 0.22), c)}${goldV(u + 'g')}</defs>${sh(44, 102)}
    <path d="M18 50 h84 v44 q0 4 -4 4 h-76 q-4 0 -4 -4z" fill="url(#${u}b)"/>
    <path d="M14 40 h92 v12 h-92z" fill="url(#${u}l)"/><path d="M14 52 h92" stroke="#000" stroke-opacity=".18"/>
    <rect x="54" y="40" width="12" height="58" fill="url(#${u}g)"/><rect x="14" y="44" width="92" height="5" fill="url(#${u}g)" opacity=".9"/>
    <path d="M60 41 C46 22 32 30 40 40 C44 44 54 43 60 41 Z" fill="url(#${u}g)"/><path d="M60 41 C74 22 88 30 80 40 C76 44 66 43 60 41 Z" fill="url(#${u}g)"/>
    <path d="M60 41 l-10 16 M60 41 l10 16" stroke="${GOLD[2]}" stroke-width="3.4" stroke-linecap="round"/><circle cx="60" cy="41" r="4.6" fill="${GOLD[0]}"/>
    ${swallow(24, 66, 0.95, GOLD[1])}${swallow(78, 74, 0.7, GOLD[1], -8)}
    <rect x="24" y="84" width="22" height="1.2" fill="${GOLD[1]}" opacity=".7"/><rect x="74" y="84" width="22" height="1.2" fill="${GOLD[1]}" opacity=".7"/>`,

  // 燉盅：白瓷燉盅（蓋子微開）＋熱氣
  g5_bowl: (u, c, a) => `<defs>${vg(u + 'w', '#ffffff', '#e9e3d6')}${vg(u + 's', lt(c, 0.5), c)}${goldV(u + 'g')}</defs>${sh(40, 101)}
    <ellipse cx="60" cy="94" rx="34" ry="6" fill="${a}" opacity=".9"/>
    <path d="M28 58 Q28 92 60 92 Q92 92 92 58 Z" fill="url(#${u}w)"/><path d="M28 58 Q28 92 60 92 Q92 92 92 58" fill="none" stroke="${a}" stroke-width="1.6"/>
    <ellipse cx="60" cy="58" rx="32" ry="8" fill="url(#${u}s)"/>${strands(34, 86, 54, 62, 3, lt(c, 0.75), 1, 0.85, 9)}
    <path d="M34 72 Q60 80 86 72" stroke="${a}" stroke-width="1.2" fill="none" opacity=".6"/>
    <g transform="rotate(-16 92 46)"><ellipse cx="74" cy="46" rx="30" ry="7" fill="url(#${u}w)" stroke="${a}" stroke-width="1.2"/><path d="M50 45 Q74 30 98 45" fill="url(#${u}w)" stroke="${a}" stroke-width="1.2"/><circle cx="74" cy="34" r="4" fill="url(#${u}g)"/></g>
    <g fill="none" stroke="#c9b8a6" stroke-width="2.2" stroke-linecap="round" opacity=".7"><path d="M46 46 q-4 -6 0 -11 q4 -5 0 -10"/><path d="M58 44 q-4 -6 0 -11 q4 -5 0 -10"/></g>`,

  // 桂圓紅棗燕窩飲：細長玻璃瓶＋紅棗、桂圓
  g5_drink: (u, c, a) => `<defs>${vg(u + 'd', lt(c, 0.3), dk(c, 0.18))}${goldV(u + 'g')}${rg(u + 'r', '#d4524a', '#7a1e1c', 0.4, 0.3)}</defs>${sh(30)}
    <path d="M48 30 h24 v8 q10 6 10 18 v38 q0 4 -4 4 h-36 q-4 0 -4 -4 v-38 q0 -12 10 -18z" fill="#fff" opacity=".5"/>
    <path d="M42 58 q0 -10 9 -15 h18 q9 5 9 15 v35 q0 3 -3 3 h-30 q-3 0 -3 -3z" fill="url(#${u}d)"/>
    ${strands(46, 74, 62, 92, 5, lt(c, 0.7), 0.9, 0.7, 12)}
    <rect x="46" y="64" width="28" height="18" rx="2" fill="${a}"/>${swallow(53, 68, 0.62, GOLD[1])}
    <rect x="46" y="22" width="28" height="10" rx="3" fill="url(#${u}g)"/>
    <path d="M48 36 q-6 14 -2 50" stroke="#fff" stroke-width="2.6" opacity=".5" fill="none" stroke-linecap="round"/>
    <ellipse cx="24" cy="92" rx="9" ry="7" fill="url(#${u}r)"/><path d="M24 85 q2 -3 5 -3" stroke="#5a3a1a" stroke-width="1.4" fill="none"/>
    <circle cx="98" cy="92" r="7" fill="#c49a5a"/><circle cx="98" cy="92" r="7" fill="none" stroke="#8a6a35"/><circle cx="96" cy="90" r="2" fill="#fff" opacity=".4"/>`,

  // 鮮燉訂閱：三瓶並排＋月曆卡
  g5_sub: (u, c, a) => `<defs>${vg(u + 'j', lt(c, 0.45), c)}${goldV(u + 'g')}</defs>${sh(46)}
    <rect x="62" y="20" width="44" height="40" rx="5" fill="#fffdf7" stroke="${a}" stroke-opacity=".4"/><rect x="62" y="20" width="44" height="11" rx="5" fill="${a}"/><rect x="62" y="26" width="44" height="5" fill="${a}"/>
    ${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<circle cx="${70 + (i % 4) * 9.5}" cy="${39 + Math.floor(i / 4) * 10}" r="2.8" fill="${[1, 3, 5].includes(i) ? GOLD[1] : '#e6dccb'}"/>`).join('')}
    ${jar(u, 32, 98, 26, 40, c, a)}${jar(u, 60, 98, 26, 46, c, a)}${jar(u, 88, 98, 26, 40, c, a)}`,
};

const N = (zh, en, ja, vi, ms) => ({ zh, en, ja, vi, ms });
// i18n：[名稱, 規格, 說明]（英日越馬）；tags 給前台標籤，kw 給 AI 導購比對
const P = (id, name, unit, price, cost, stock, desc, kind, color, accent, x) => ({ id, name, unit, price, cost, stock, desc, en: x.i18n.en[0], descEn: x.i18n.en[2], art: { kind, color, accent }, ...x });

// ─────────────────────────── 精品燕窩 ───────────────────────────
export const BIZ = [
  {
    merchant: {
      id: 'birdnest', name: '嬿窩', en: 'YAN NEST', type: 'birdnest', cat: 'food',
      typeName: '精品燕窩', kw: '燕窩 燕盞 燕條 鮮燉燕窩 bird nest swiftlet 燕の巣 yến sào sarang burung', owner: '店主', ownerEn: 'the owner', theme: 'birdnest', brand: '#B8146A', tagline: '一盞好燕，慢火細燉',
      layout: 'luxe', ship: { mode: 'ship', fee: 150, free: 1500, cold: true },
      products: [
        P('bn-fresh', '冰糖鮮燉燕窩', '150ml × 6 瓶', 1680, 690, 36, '每週二、五現燉，冰糖清甜、燕絲完整，冷藏宅配到府。（示範規格：每瓶以約 3g 乾燕盞燉製）', 'g5_jar', '#F3E3C0', '#B8146A',
          { tags: ['hot', 'signature'], storage: 'fridge', days: 10, gift: true, kw: ['鮮燉', '冰糖', '即食', '瓶', 'fresh', 'ready', 'rock sugar', 'jar', '冷藏', '生鮮', 'tươi', 'segar'],
            i18n: { en: ['Fresh-stewed Bird’s Nest, Rock Sugar', '150ml × 6 jars', 'Stewed every Tue & Fri, lightly sweet with whole strands, chilled delivery. (Demo spec: about 3g dry nest per jar)'], ja: ['氷砂糖仕立て 生燕の巣', '150ml × 6本', '毎週火・金に炊き上げ。やさしい甘さでクール便でお届け。（デモ仕様：1本あたり乾燥燕の巣 約3g）'], vi: ['Yến chưng tươi đường phèn', '150ml × 6 hũ', 'Chưng mỗi thứ Ba và thứ Sáu, ngọt thanh, sợi yến nguyên, giao lạnh. (Quy cách demo: khoảng 3g yến khô mỗi hũ)'], ms: ['Sarang Burung Segar, Gula Batu', '150ml × 6 balang', 'Ditanak setiap Selasa & Jumaat, manis lembut, helaian utuh, dihantar sejuk. (Spesifikasi demo: kira-kira 3g sarang kering sebalang)'] } }),
        P('bn-plain', '無糖鮮燉燕窩', '150ml × 6 瓶', 1680, 680, 30, '不加糖，保留燕窩本身的淡雅蛋白香，可依喜好加蜂蜜或鮮奶。', 'g5_jar', '#F6EEDC', '#8C6A35',
          { tags: ['new'], storage: 'fridge', days: 10, kw: ['無糖', '不甜', '原味', 'sugar free', 'no sugar', 'plain', '無糖', 'không đường', 'tanpa gula'],
            i18n: { en: ['Fresh-stewed Bird’s Nest, Unsweetened', '150ml × 6 jars', 'No sugar added, just the nest’s own delicate aroma. Add honey or milk to taste.'], ja: ['無糖 生燕の巣', '150ml × 6本', '砂糖不使用。燕の巣本来の淡い香りを。お好みで蜂蜜やミルクを。'], vi: ['Yến chưng tươi không đường', '150ml × 6 hũ', 'Không thêm đường, giữ hương thanh tự nhiên của yến. Có thể thêm mật ong hoặc sữa.'], ms: ['Sarang Burung Segar, Tanpa Gula', '150ml × 6 balang', 'Tanpa gula, aroma asli yang lembut. Tambah madu atau susu ikut citarasa.'] } }),
        P('bn-duo', '嘗鮮兩入組', '150ml × 2 瓶', 580, 240, 40, '第一次吃燕窩？冰糖與無糖各一瓶，先試試哪一種是你的口味。', 'g5_duo', '#F3E3C0', '#B0823F',
          { tags: ['starter', 'value'], storage: 'fridge', days: 10, kw: ['嘗鮮', '試吃', '第一次', '入門', '兩入', 'trial', 'first time', 'try', 'starter', 'お試し', 'dùng thử', 'cuba'],
            i18n: { en: ['Tasting Duo', '150ml × 2 jars', 'New to bird’s nest? One rock-sugar and one unsweetened jar to find your favourite.'], ja: ['お試し2本セット', '150ml × 2本', '初めての方に。氷砂糖と無糖を1本ずつ、お好みを見つけてください。'], vi: ['Bộ dùng thử 2 hũ', '150ml × 2 hũ', 'Lần đầu ăn yến? Một hũ đường phèn, một hũ không đường để chọn vị bạn thích.'], ms: ['Set Cuba Dua', '150ml × 2 balang', 'Kali pertama? Satu gula batu dan satu tanpa gula untuk cari kegemaran anda.'] } }),
        P('bn-cup', '特級燕盞（乾）', '50g（約 6–7 盞）', 4280, 2380, 14, '盞型完整、紋理細密，人工以鑷子挑毛。適合自己在家慢燉。', 'g5_cup', '#F1E2C4', '#9FC2B4',
          { tags: ['signature', 'gift'], storage: 'room', days: 730, gift: true, kw: ['燕盞', '乾燕窩', '乾', '原盞', '自己燉', 'dried', 'nest cup', 'whole', '燕の巣', 'tổ yến', 'sarang kering'],
            i18n: { en: ['Premium Dried Nest Cups', '50g (about 6–7 cups)', 'Whole, finely-textured cups, hand-cleaned with tweezers. Perfect for slow stewing at home.'], ja: ['特級 燕の巣（乾燥・盞）', '50g（約6〜7個）', '形の整った盞を職人が手作業で毛取り。ご自宅でゆっくり炊くのに。'], vi: ['Tổ yến khô thượng hạng', '50g (khoảng 6–7 tổ)', 'Tổ nguyên, sợi mịn, nhặt lông thủ công bằng nhíp. Thích hợp tự chưng tại nhà.'], ms: ['Sarang Burung Kering Premium', '50g (kira-kira 6–7 mangkuk)', 'Mangkuk utuh bertekstur halus, dibersihkan dengan penyepit. Sesuai ditanak sendiri.'] } }),
        P('bn-strip', '燕條（乾）', '100g', 5980, 3150, 10, '盞型不整的燕條，品質與燕盞同源、價格更親切，浸泡時間也更短。', 'g5_strip', '#EFDDBA', '#D9B56B',
          { tags: ['value'], storage: 'room', days: 730, kw: ['燕條', '划算', '自己燉', 'strip', 'strips', 'value', '燕條', 'yến vụn', 'jalur'],
            i18n: { en: ['Dried Nest Strips', '100g', 'Same source as our cups, just not cup-shaped: friendlier price and shorter soaking.'], ja: ['燕の巣（乾燥・条）', '100g', '盞と同じ産地。形が不揃いな分お手頃で、浸水時間も短めです。'], vi: ['Yến sợi khô', '100g', 'Cùng nguồn với tổ nguyên, chỉ không thành hình tổ: giá dễ chịu hơn, ngâm nhanh hơn.'], ms: ['Jalur Sarang Burung Kering', '100g', 'Sumber sama dengan mangkuk, cuma tidak berbentuk mangkuk: lebih berpatutan dan rendam lebih singkat.'] } }),
        P('bn-gift', '金緞禮盒', '鮮燉 6 瓶＋提袋＋卡片', 2280, 920, 20, '冰糖鮮燉 6 瓶裝進洋紅燙金禮盒，附提袋與手寫卡片，送長輩、送客戶都體面。', 'g5_gift', '#B8146A', '#D9B56B',
          { tags: ['gift', 'hot'], storage: 'fridge', days: 10, gift: true, kw: ['禮盒', '送禮', '長輩', '客戶', '中秋', '過年', 'gift', 'box', 'present', 'ギフト', 'quà', 'hadiah', '彌月', '探病'],
            i18n: { en: ['Golden Ribbon Gift Box', '6 fresh jars + bag + card', 'Six rock-sugar jars in a magenta, gold-foiled box with a gift bag and handwritten card.'], ja: ['金リボン ギフトボックス', '生6本＋手提げ袋＋カード', '氷砂糖仕立て6本をマゼンタ×金箔の箱に。手提げ袋と手書きカード付き。'], vi: ['Hộp quà ruy băng vàng', '6 hũ tươi + túi + thiệp', '6 hũ yến đường phèn trong hộp màu hồng cánh sen ép kim, kèm túi xách và thiệp viết tay.'], ms: ['Kotak Hadiah Reben Emas', '6 balang + beg + kad', 'Enam balang gula batu dalam kotak magenta bersalut emas, dengan beg dan kad tulisan tangan.'] } }),
        P('bn-drink', '桂圓紅棗燕窩飲', '250ml × 6 瓶', 880, 330, 48, '桂圓與紅棗慢熬，加入燕絲，常溫保存、隨身好帶。', 'g5_drink', '#C9844A', '#B8146A',
          { tags: ['new', 'value'], storage: 'room', days: 270, kw: ['飲', '紅棗', '桂圓', '常溫', '隨身', 'drink', 'red date', 'longan', 'bottle', 'ドリンク', 'nước', 'minuman'],
            i18n: { en: ['Longan & Red Date Bird’s Nest Drink', '250ml × 6 bottles', 'Slow-simmered longan and red dates with nest strands. Shelf-stable and easy to carry.'], ja: ['龍眼となつめの燕の巣ドリンク', '250ml × 6本', '龍眼となつめをじっくり煮出し燕の巣入り。常温保存で持ち運びにも。'], vi: ['Nước yến long nhãn táo đỏ', '250ml × 6 chai', 'Long nhãn và táo đỏ nấu chậm cùng sợi yến. Bảo quản thường, tiện mang theo.'], ms: ['Minuman Sarang Burung Longan & Kurma Merah', '250ml × 6 botol', 'Longan dan kurma merah direneh perlahan dengan helaian sarang. Tahan suhu bilik.'] } }),
        P('bn-sub', '鮮燉訂閱（四週）', '每週 3 瓶 × 4 週', 3980, 1650, 25, '每週固定送 3 瓶到家，可隨時暫停或改日期，冰糖、無糖可混搭。', 'g5_sub', '#F3E3C0', '#B8146A',
          { tags: ['sub'], storage: 'fridge', days: 10, kw: ['訂閱', '每週', '定期', '固定', 'subscription', 'weekly', 'subscribe', '定期便', 'định kỳ', 'langganan'],
            i18n: { en: ['Fresh Subscription (4 weeks)', '3 jars a week × 4 weeks', 'Three jars delivered every week. Pause or reschedule anytime; mix rock-sugar and unsweetened.'], ja: ['生燕の巣 定期便（4週）', '毎週3本 × 4週', '毎週3本をお届け。いつでも一時停止・日程変更でき、氷砂糖と無糖を組み合わせられます。'], vi: ['Gói định kỳ yến tươi (4 tuần)', '3 hũ/tuần × 4 tuần', 'Mỗi tuần giao 3 hũ. Tạm dừng hoặc đổi ngày bất cứ lúc nào; kết hợp có đường và không đường.'], ms: ['Langganan Segar (4 minggu)', '3 balang seminggu × 4 minggu', 'Tiga balang dihantar setiap minggu. Boleh jeda atau tukar tarikh; campur gula batu dan tanpa gula.'] } }),
      ],
      copy: {
        zh: { type: '精品燕窩', tagline: '芽莊燕島，一盞好燕', kicker: '越南芽莊燕島・每週現燉・冷鏈到府', title: '一盞好燕，<br>來自芽莊燕島。', sub: '嬿窩的燕窩來自越南芽莊外海的燕島。我們把每一盞細心挑毛、慢火燉好，出貨前一天才燉、冷藏送到你家。不知道怎麼選？右下角的 AI 導購小燕會用你的語言幫你挑。', prodTitle: '本季燕窩', prodSub: '鮮燉、乾燕盞到禮盒（商品、規格與價格為示範，正式上架以實際為準）', about: '品牌故事', f: [['芽莊燕島', '越南慶和省外海'], ['出貨前一天現燉', '冷藏 0–7°C 宅配'], ['手工挑毛', '一盞一盞細心整理']], chips: ['第一次吃選哪個？', '送長輩的禮盒', '預算 2,000 元', '怎麼保存？', '燕盞怎麼燉？', '結帳'],
          announce: '嬿窩・芽莊燕島，一盞好燕・支援 5 種語言 AI 客服', footer: '嬿窩・品牌籌備中。本頁商品、規格、價格與檢驗資訊為示範內容，正式上架以實際標示為準。' },
        en: { type: 'Fine bird’s nest', tagline: 'From the nest islands of Nha Trang', kicker: 'Nha Trang nest islands · stewed weekly · chilled delivery', title: 'A fine nest,<br>from the islands of Nha Trang.', sub: 'YAN NEST bird’s nest comes from the swiftlet islands off Nha Trang, Vietnam. We clean every nest by hand and stew it slowly the day before it ships, then deliver it chilled. Not sure what to pick? Our AI concierge (bottom right) will help in your language.', prodTitle: 'This season’s nests', prodSub: 'Fresh-stewed jars, dried cups and gift boxes (products, specs and prices are samples; final listings may differ)', about: 'Our story', f: [['Nha Trang nest islands', 'Off the coast of Khánh Hòa, Vietnam'], ['Stewed the day before shipping', 'Chilled 0–7°C delivery'], ['Hand-cleaned', 'Every nest, one by one']], chips: ['First time, which one?', 'Gift for parents', 'Budget NT$2,000', 'How to store it?', 'How do I stew nest cups?', 'Checkout'],
          announce: 'YAN NEST · From the nest islands of Nha Trang · AI concierge in 5 languages', footer: 'YAN NEST · Brand in preparation. Products, specs, prices and test information on this page are samples; final listings follow the actual labels.' },
        ja: { type: '高級燕の巣', tagline: 'ニャチャンの燕の島から', kicker: 'ベトナム・ニャチャンの燕の島・毎週炊き上げ・クール便', title: '上質な燕の巣を、<br>ニャチャンの島から。', sub: '嬿窩の燕の巣は、ベトナム・ニャチャン沖に浮かぶ燕の島から届きます。ひとつずつ丁寧に毛を取り、出荷の前日にことこと炊き上げ、クール便でお届けします。迷ったら右下のAIスタッフが日本語でご案内します。', prodTitle: '今季の燕の巣', prodSub: '生の燕の巣から乾燥の盞、ギフトまで（商品・規格・価格はサンプルです。正式な掲載内容は実物の表示に従います）', about: 'ブランドストーリー', f: [['ニャチャンの燕の島', 'ベトナム・カインホア省の沖合'], ['出荷前日に炊き上げ', '0〜7°Cのクール便'], ['手作業の毛取り', 'ひとつずつ丁寧に']], chips: ['初めてならどれ？', '両親へのギフト', '予算2,000元', '保存方法は？', '盞の炊き方は？', 'お会計'],
          announce: '嬿窩・ニャチャンの燕の島から・5言語のAIスタッフ対応', footer: '嬿窩・ブランド準備中。本ページの商品・規格・価格・検査情報はサンプルです。正式な販売時は実物の表示に従います。' },
        vi: { type: 'Yến sào cao cấp', tagline: 'Yến đảo Nha Trang', kicker: 'Yến đảo Nha Trang · chưng mỗi tuần · giao lạnh', title: 'Tổ yến ngon,<br>từ đảo yến Nha Trang.', sub: 'Yến của YAN NEST đến từ các đảo yến ngoài khơi Nha Trang, Việt Nam. Chúng tôi nhặt lông từng tổ và chưng chậm một ngày trước khi giao, rồi giao lạnh tận nhà. Chưa biết chọn gì? Trợ lý AI (góc phải) sẽ giúp bạn bằng tiếng Việt.', prodTitle: 'Yến mùa này', prodSub: 'Yến chưng tươi, tổ yến khô và hộp quà (sản phẩm, quy cách và giá là mẫu; thông tin chính thức theo nhãn thực tế)', about: 'Câu chuyện', f: [['Yến đảo Nha Trang', 'Ngoài khơi Khánh Hòa, Việt Nam'], ['Chưng trước ngày giao', 'Giao lạnh 0–7°C'], ['Nhặt lông thủ công', 'Từng tổ, cẩn thận']], chips: ['Lần đầu nên chọn gì?', 'Quà biếu bố mẹ', 'Ngân sách 2.000', 'Bảo quản thế nào?', 'Chưng tổ yến ra sao?', 'Thanh toán'],
          announce: 'YAN NEST · Yến đảo Nha Trang · Trợ lý AI 5 ngôn ngữ', footer: 'YAN NEST · Thương hiệu đang chuẩn bị. Sản phẩm, quy cách, giá và thông tin kiểm nghiệm trên trang là mẫu; khi bán chính thức sẽ theo nhãn thực tế.' },
        ms: { type: 'Sarang burung premium', tagline: 'Dari pulau walit Nha Trang', kicker: 'Pulau walit Nha Trang · ditanak setiap minggu · penghantaran sejuk', title: 'Sarang terbaik,<br>dari pulau Nha Trang.', sub: 'Sarang burung YAN NEST datang dari pulau-pulau walit di luar pantai Nha Trang, Vietnam. Kami membersihkan setiap sarang dengan tangan dan menanaknya perlahan sehari sebelum dihantar, lalu dihantar sejuk. Tidak pasti? Pembantu AI (bawah kanan) sedia membantu dalam bahasa anda.', prodTitle: 'Sarang musim ini', prodSub: 'Balang segar, mangkuk kering dan kotak hadiah (produk, spesifikasi dan harga ialah contoh; jualan rasmi ikut label sebenar)', about: 'Kisah kami', f: [['Pulau walit Nha Trang', 'Luar pantai Khánh Hòa, Vietnam'], ['Ditanak sehari sebelum hantar', 'Penghantaran sejuk 0–7°C'], ['Dibersihkan dengan tangan', 'Satu demi satu']], chips: ['Kali pertama, yang mana?', 'Hadiah untuk ibu bapa', 'Bajet NT$2,000', 'Cara simpan?', 'Cara tanak mangkuk sarang?', 'Bayar'],
          announce: 'YAN NEST · Dari pulau walit Nha Trang · Pembantu AI 5 bahasa', footer: 'YAN NEST · Jenama dalam persediaan. Produk, spesifikasi, harga dan maklumat ujian di halaman ini ialah contoh; jualan rasmi ikut label sebenar.' },
      },
      // 前台品牌故事區塊（精品版面）：故事、四種燕窩、工序、燉煮計算、品質承諾、常見問題、聲明
      story: {
        zh: {
          badges: ['出貨前一天現燉', '冷鏈 0–7°C', '每批附檢驗紀錄（示範）'],
          story: { k: 'OUR STORY', h: '海風裡的燕島，<br>一盞一盞慢慢來。', p: ['越南芽莊外海散落著幾座燕島，金絲燕在島上的岩洞與崖壁間，用唾液一圈一圈築巢，一盞燕窩要花上好幾週。', '嬿窩把這份來自燕島的禮物帶回台灣：一盞一盞浸泡、用鑷子挑去細毛，再以隔水燉的方式慢慢燉好。不追求快，只想讓你吃到燕窩本來的樣子。'], sign: '嬿窩' },
          origin: { k: 'ORIGIN', h: '產地：越南芽莊燕島', sub: '芽莊位於越南中南部的慶和省，外海的島嶼岩壁是金絲燕築巢的地方。', coord: '12.2°N  109.2°E', map: ['芽莊', '慶和省・越南', '燕島'], facts: [['產地', '越南慶和省芽莊外海燕島'], ['燕窩種類', '島燕（岩洞燕窩）'], ['採收', '依燕子築巢季節進行'], ['來台', '輸入檢疫與查驗文件（準備中）']], note: '地圖為示意；產地資訊以實際包裝標示為準。' },
          grades: { k: 'HOW TO CHOOSE', h: '四種燕窩，怎麼挑', sub: '差別在形狀，不在產地；形狀越完整，價格越高。', list: [
            { id: 'cup', n: '燕盞', d: '完整的半月形，最適合送禮與慢燉。', soak: '浸泡 4–6 小時', fit: '送禮・自己燉' },
            { id: 'strip', n: '燕條', d: '盞型不整的條狀，品質同源、價格親切。', soak: '浸泡 2–3 小時', fit: '日常自己燉' },
            { id: 'corner', n: '燕角', d: '燕盞兩端黏在牆上的部分，口感較紮實。', soak: '浸泡 6–8 小時', fit: '喜歡咬勁的人' },
            { id: 'bits', n: '燕碎', d: '整理時留下的碎片，最省時。', soak: '浸泡 1 小時', fit: '甜湯・入菜' } ] },
          steps: { k: 'FROM NEST TO TABLE', h: '從芽莊燕島到你的餐桌', list: [
            ['燕島採收', '依燕子築巢季節，從島上岩洞採收'], ['浸泡', '清水浸泡，燕絲慢慢舒展'], ['挑毛', '人工以鑷子挑除細毛與雜質'], ['定型', '低溫烘乾，保留完整盞型'], ['檢驗', '每批送驗並留存紀錄（示範）'], ['現燉冷鏈', '出貨前一天燉好，0–7°C 宅配'] ] },
          calc: { k: 'STEW AT HOME', h: '在家燉一盞', sub: '選人數和口感，算給你看。以下為一般參考，可依喜好調整。', people: '人份', texture: '口感', light: '清爽', rich: '濃郁', dry: '乾燕', water: '清水', soak: '浸泡', stew: '隔水燉', g: 'g', ml: 'ml', hr: '小時', min: '分鐘', tips: ['乾燕盞先用冷水浸泡，泡到燕絲柔軟舒展', '挑掉殘留細毛，用濾網輕輕沖洗', '加水隔水燉 30–40 分鐘，起鍋前再加冰糖'] },
          promise: { k: 'OUR PROMISE', h: '品質承諾', list: [['不加防腐劑、色素', '只用燕窩、清水與冰糖'], ['每批檢驗（示範）', '亞硝酸鹽、二氧化硫等項目留存紀錄'], ['合法輸入（示範）', '附輸入檢疫文件，產地可追溯'], ['冷鏈配送', '鮮燉品全程 0–7°C，收到請立即冷藏']] },
          faq: { k: 'FAQ', h: '常見問題', list: [
            ['第一次吃，選哪一款？', '建議先買「嘗鮮兩入組」，冰糖與無糖各一瓶，喜歡哪一種再買 6 瓶裝或訂閱。'],
            ['鮮燉燕窩可以放多久？', '收到後請冷藏（0–7°C），未開封約 10 天（示範），開封後當天吃完。冰過再吃也很好吃。'],
            ['乾燕盞要怎麼保存？', '放在陰涼乾燥處，避免潮濕與陽光直射；梅雨季可密封後冷藏。'],
            ['燕窩有什麼功效？', '燕窩是一般食品，我們不宣稱任何療效。大家喜歡它，是因為細緻的口感和送禮的心意。'],
            ['孕期、小朋友或過敏體質可以吃嗎？', '每個人的狀況不同，請先詢問醫師或營養師；對蛋白質類食物容易過敏的人請先少量嘗試。'],
            ['可以指定到貨日或寄送禮盒給別人嗎？', '可以，結帳時填寫收件人與希望到貨日，卡片內容也可以請 AI 導購幫你寫。'] ] },
          note: '嬿窩品牌籌備中：本頁商品、價格、規格與檢驗資訊為示範內容，正式上架以實際標示為準。燕窩為一般食品，不具醫療效能；食用與標示規範以主管機關公告為準，特殊體質請諮詢醫師或營養師。',
        },
        en: {
          badges: ['Stewed the day before shipping', 'Chilled 0–7°C', 'Test record for every batch (demo)'],
          story: { k: 'OUR STORY', h: 'Islands in the sea breeze,<br>one nest at a time.', p: ['A handful of swiftlet islands lie off the coast of Nha Trang, Vietnam. In their rock caves and cliffs, swiftlets weave their nests strand by strand over several weeks.', 'YAN NEST brings this gift from the islands to Taiwan: every nest is soaked, cleaned by hand with tweezers and slowly double-boiled. We’re not in a hurry; we just want you to taste bird’s nest the way it should be.'], sign: 'YAN NEST' },
          origin: { k: 'ORIGIN', h: 'Origin: the nest islands of Nha Trang', sub: 'Nha Trang is in Khánh Hòa province, south-central Vietnam. The cliffs of its offshore islands are where swiftlets build their nests.', coord: '12.2°N  109.2°E', map: ['Nha Trang', 'Khánh Hòa · Vietnam', 'Nest islands'], facts: [['Origin', 'Nest islands off Nha Trang, Khánh Hòa, Vietnam'], ['Type', 'Island cave nest'], ['Harvest', 'Following the swiftlets’ nesting seasons'], ['Import', 'Quarantine and inspection papers (in preparation)']], note: 'Map is illustrative; origin details follow the actual package label.' },
          grades: { k: 'HOW TO CHOOSE', h: 'Four kinds of nest', sub: 'The difference is the shape, not the origin; the more complete the shape, the higher the price.', list: [
            { id: 'cup', n: 'Cup', d: 'A whole half-moon cup, ideal for gifts and slow stewing.', soak: 'Soak 4–6 hours', fit: 'Gifts · home stewing' },
            { id: 'strip', n: 'Strip', d: 'Irregular strips from the same nests, friendlier price.', soak: 'Soak 2–3 hours', fit: 'Everyday stewing' },
            { id: 'corner', n: 'Corner', d: 'The ends where the cup meets the wall, a firmer bite.', soak: 'Soak 6–8 hours', fit: 'If you like texture' },
            { id: 'bits', n: 'Bits', d: 'Small pieces left from cleaning, the quickest to cook.', soak: 'Soak 1 hour', fit: 'Sweet soups · cooking' } ] },
          steps: { k: 'FROM NEST TO TABLE', h: 'From the islands of Nha Trang to your table', list: [
            ['Island harvest', 'Collected from island caves, following the nesting seasons'], ['Soak', 'Soaked in clean water until the strands relax'], ['Clean', 'Fine feathers removed by hand with tweezers'], ['Shape', 'Dried at low heat to keep the cup shape'], ['Test', 'Each batch tested, records kept (demo)'], ['Stew & chill', 'Stewed the day before, delivered at 0–7°C'] ] },
          calc: { k: 'STEW AT HOME', h: 'Stew a cup at home', sub: 'Pick servings and texture and we’ll do the maths. A general guide only; adjust to taste.', people: 'servings', texture: 'Texture', light: 'Light', rich: 'Rich', dry: 'Dry nest', water: 'Water', soak: 'Soak', stew: 'Double-boil', g: 'g', ml: 'ml', hr: 'hr', min: 'min', tips: ['Soak dried cups in cold water until the strands are soft', 'Pick out any remaining feathers and rinse gently in a sieve', 'Double-boil for 30–40 minutes; add rock sugar at the end'] },
          promise: { k: 'OUR PROMISE', h: 'Our promise', list: [['No preservatives or colouring', 'Just nest, water and rock sugar'], ['Every batch tested (demo)', 'Records kept for nitrite, sulphur dioxide and more'], ['Legally imported (demo)', 'Import quarantine papers, traceable origin'], ['Cold-chain delivery', 'Fresh jars kept at 0–7°C; refrigerate on arrival']] },
          faq: { k: 'FAQ', h: 'Questions', list: [
            ['First time, which one should I get?', 'Start with the Tasting Duo: one rock-sugar and one unsweetened jar. Then pick a 6-pack or subscription.'],
            ['How long do fresh jars keep?', 'Refrigerate at 0–7°C on arrival. Unopened about 10 days (demo); finish the same day once opened.'],
            ['How do I store dried cups?', 'Somewhere cool and dry, away from humidity and sunlight. In the rainy season, seal and refrigerate.'],
            ['What are the health benefits?', 'Bird’s nest is a regular food and we make no health claims. People love it for its delicate texture and as a thoughtful gift.'],
            ['Is it OK during pregnancy, for kids or with allergies?', 'Everyone is different, so please ask your doctor or dietitian first. If you react easily to protein foods, try a small amount first.'],
            ['Can I choose a delivery date or send a gift?', 'Yes. Enter the recipient and preferred date at checkout, and our AI concierge can help write the card.'] ] },
          note: 'YAN NEST is a brand in preparation: products, prices, specs and test information on this page are samples, and final listings follow the actual labels. Bird’s nest is a regular food with no medical effect; labelling and consumption rules follow the competent authorities. Please consult a doctor or dietitian if you have special health conditions.',
        },
        ja: {
          badges: ['出荷前日に炊き上げ', 'クール便 0〜7°C', 'ロットごとに検査記録（デモ）'],
          story: { k: 'OUR STORY', h: '海風の吹く燕の島から、<br>ひとつずつ丁寧に。', p: ['ベトナム・ニャチャンの沖合には燕の島が点在し、アナツバメは島の岩洞や崖で、何週間もかけて少しずつ巣を作ります。', '嬿窩は島からの贈り物を台湾へ。ひとつずつ浸水し、ピンセットで毛を取り、湯せんでゆっくり炊き上げます。急がず、燕の巣本来の味を届けたいと思っています。'], sign: '嬿窩' },
          origin: { k: 'ORIGIN', h: '産地：ベトナム・ニャチャンの燕の島', sub: 'ニャチャンはベトナム中南部のカインホア省。沖合の島の岩壁がアナツバメの巣作りの場所です。', coord: '12.2°N  109.2°E', map: ['ニャチャン', 'カインホア省・ベトナム', '燕の島'], facts: [['産地', 'ベトナム・カインホア省ニャチャン沖の燕の島'], ['種類', '島の岩洞の燕の巣'], ['採取', 'ツバメの営巣シーズンに合わせて'], ['輸入', '輸入検疫・検査書類（準備中）']], note: '地図はイメージです。産地情報は実際の包装表示に従います。' },
          grades: { k: 'HOW TO CHOOSE', h: '燕の巣の4つの形', sub: '違いは産地ではなく形。形が整っているほど価格が上がります。', list: [
            { id: 'cup', n: '盞（さん）', d: '半月形の完全な形。ギフトやじっくり炊くのに。', soak: '浸水 4〜6時間', fit: 'ギフト・ご自宅で' },
            { id: 'strip', n: '条', d: '形が不揃いな細長いもの。品質は同じでお手頃。', soak: '浸水 2〜3時間', fit: '普段使いに' },
            { id: 'corner', n: '角', d: '盞の両端、壁に付いていた部分。しっかりした食感。', soak: '浸水 6〜8時間', fit: '歯ごたえ好きに' },
            { id: 'bits', n: '砕', d: '選別で出た小さなかけら。いちばん手軽。', soak: '浸水 1時間', fit: 'デザート・料理に' } ] },
          steps: { k: 'FROM NEST TO TABLE', h: 'ニャチャンの燕の島から食卓まで', list: [
            ['島での採取', '営巣シーズンに合わせて島の岩洞から'], ['浸水', 'きれいな水でゆっくり戻す'], ['毛取り', 'ピンセットで一本ずつ手作業'], ['成形', '低温で乾燥し形を保つ'], ['検査', 'ロットごとに検査・記録（デモ）'], ['炊き上げ・クール便', '前日に炊いて0〜7°Cでお届け'] ] },
          calc: { k: 'STEW AT HOME', h: 'ご自宅で炊く', sub: '人数と食感を選ぶと分量を計算します。一般的な目安です。お好みで調整してください。', people: '人分', texture: '食感', light: 'あっさり', rich: 'こってり', dry: '乾燥燕の巣', water: '水', soak: '浸水', stew: '湯せん', g: 'g', ml: 'ml', hr: '時間', min: '分', tips: ['乾燥の盞は冷水に浸し、やわらかくなるまで戻す', '残った毛を取り、ざるでやさしくすすぐ', '水を加えて湯せんで30〜40分、仕上げに氷砂糖を'] },
          promise: { k: 'OUR PROMISE', h: '品質へのお約束', list: [['保存料・着色料不使用', '燕の巣・水・氷砂糖だけ'], ['ロットごとの検査（デモ）', '亜硝酸塩・二酸化硫黄などを記録'], ['正規輸入（デモ）', '輸入検疫書類付き、産地を追跡可能'], ['クール便', '生の商品は0〜7°Cで。届いたらすぐ冷蔵庫へ']] },
          faq: { k: 'FAQ', h: 'よくあるご質問', list: [
            ['初めてならどれがいい？', 'まずは「お試し2本セット」で氷砂糖と無糖を食べ比べ、気に入った方を6本入りや定期便で。'],
            ['生の燕の巣の日持ちは？', '届いたら冷蔵（0〜7°C）で未開封約10日（デモ）。開封後はその日のうちにお召し上がりください。'],
            ['乾燥の盞の保存方法は？', '湿気と直射日光を避け、涼しく乾燥した場所で。梅雨時は密封して冷蔵庫へ。'],
            ['燕の巣の効能は？', '燕の巣は一般食品で、効能をうたうことはしていません。繊細な食感と贈り物としての気持ちが人気の理由です。'],
            ['妊娠中・子ども・アレルギー体質でも大丈夫？', '体質は人それぞれなので、まず医師や栄養士にご相談ください。たんぱく質の食品でアレルギーが出やすい方は少量からお試しを。'],
            ['配達日の指定やギフト配送はできる？', 'できます。お会計で送り先と希望日を入力してください。カードの文面はAIスタッフもお手伝いします。'] ] },
          note: '嬿窩はブランド準備中です。本ページの商品・価格・規格・検査情報はサンプルで、正式な販売時は実物の表示に従います。燕の巣は一般食品であり医療効果はありません。表示や摂取については所管官庁の定めに従い、持病のある方は医師・栄養士にご相談ください。',
        },
        vi: {
          badges: ['Chưng trước ngày giao', 'Giao lạnh 0–7°C', 'Mỗi lô có hồ sơ kiểm nghiệm (demo)'],
          story: { k: 'OUR STORY', h: 'Đảo yến trong gió biển,<br>từng tổ một, thật chậm.', p: ['Ngoài khơi Nha Trang, Việt Nam có những đảo yến, nơi chim yến kết tổ từng sợi trong hang đá và vách núi suốt nhiều tuần.', 'YAN NEST mang món quà từ đảo yến về Đài Loan: ngâm từng tổ, nhặt lông bằng nhíp và chưng cách thủy thật chậm. Không vội vàng, chỉ muốn bạn thưởng thức yến đúng vị nguyên bản.'], sign: 'YAN NEST' },
          origin: { k: 'ORIGIN', h: 'Xuất xứ: đảo yến Nha Trang', sub: 'Nha Trang thuộc tỉnh Khánh Hòa, Nam Trung Bộ Việt Nam. Vách đá trên các đảo ngoài khơi là nơi chim yến làm tổ.', coord: '12.2°N  109.2°E', map: ['Nha Trang', 'Khánh Hòa · Việt Nam', 'Đảo yến'], facts: [['Xuất xứ', 'Đảo yến ngoài khơi Nha Trang, Khánh Hòa'], ['Loại', 'Yến đảo (yến hang)'], ['Thu hoạch', 'Theo mùa làm tổ của chim yến'], ['Nhập khẩu', 'Giấy kiểm dịch và kiểm tra (đang chuẩn bị)']], note: 'Bản đồ mang tính minh họa; thông tin xuất xứ theo nhãn bao bì thực tế.' },
          grades: { k: 'HOW TO CHOOSE', h: 'Bốn loại yến', sub: 'Khác nhau ở hình dáng chứ không ở nguồn gốc; tổ càng nguyên vẹn, giá càng cao.', list: [
            { id: 'cup', n: 'Tổ nguyên', d: 'Hình bán nguyệt nguyên vẹn, hợp làm quà và chưng chậm.', soak: 'Ngâm 4–6 giờ', fit: 'Làm quà · tự chưng' },
            { id: 'strip', n: 'Yến sợi', d: 'Sợi không thành tổ, cùng nguồn, giá dễ chịu.', soak: 'Ngâm 2–3 giờ', fit: 'Dùng hằng ngày' },
            { id: 'corner', n: 'Chân yến', d: 'Phần hai đầu tổ bám vào tường, giòn dai hơn.', soak: 'Ngâm 6–8 giờ', fit: 'Thích độ dai' },
            { id: 'bits', n: 'Yến vụn', d: 'Mảnh nhỏ còn lại khi làm sạch, nhanh nhất.', soak: 'Ngâm 1 giờ', fit: 'Chè · nấu món' } ] },
          steps: { k: 'FROM NEST TO TABLE', h: 'Từ đảo yến Nha Trang đến bàn ăn', list: [
            ['Thu hoạch trên đảo', 'Lấy từ hang đá trên đảo, theo mùa làm tổ'], ['Ngâm', 'Ngâm nước sạch cho sợi yến nở'], ['Nhặt lông', 'Nhặt lông tơ thủ công bằng nhíp'], ['Định hình', 'Sấy nhiệt thấp, giữ dáng tổ'], ['Kiểm nghiệm', 'Mỗi lô đều kiểm và lưu hồ sơ (demo)'], ['Chưng & giao lạnh', 'Chưng hôm trước, giao 0–7°C'] ] },
          calc: { k: 'STEW AT HOME', h: 'Tự chưng tại nhà', sub: 'Chọn số người và độ đậm, chúng tôi tính giúp. Chỉ để tham khảo, điều chỉnh theo khẩu vị.', people: 'người', texture: 'Độ đậm', light: 'Thanh', rich: 'Đậm', dry: 'Yến khô', water: 'Nước', soak: 'Ngâm', stew: 'Chưng cách thủy', g: 'g', ml: 'ml', hr: 'giờ', min: 'phút', tips: ['Ngâm tổ yến khô trong nước lạnh đến khi sợi mềm', 'Nhặt sạch lông còn sót, rửa nhẹ qua rây', 'Thêm nước, chưng cách thủy 30–40 phút, cho đường phèn lúc cuối'] },
          promise: { k: 'OUR PROMISE', h: 'Cam kết chất lượng', list: [['Không chất bảo quản, phẩm màu', 'Chỉ có yến, nước và đường phèn'], ['Kiểm nghiệm từng lô (demo)', 'Lưu hồ sơ nitrit, SO₂ và các chỉ tiêu khác'], ['Nhập khẩu hợp pháp (demo)', 'Có giấy kiểm dịch, truy xuất được nguồn gốc'], ['Giao lạnh', 'Yến tươi giữ 0–7°C; nhận hàng hãy cho vào tủ lạnh']] },
          faq: { k: 'FAQ', h: 'Câu hỏi thường gặp', list: [
            ['Lần đầu nên chọn loại nào?', 'Hãy thử “Bộ dùng thử 2 hũ”: một hũ đường phèn, một hũ không đường, rồi chọn hộp 6 hũ hoặc gói định kỳ.'],
            ['Yến chưng tươi để được bao lâu?', 'Bảo quản lạnh 0–7°C khi nhận; chưa mở khoảng 10 ngày (demo), đã mở thì dùng trong ngày.'],
            ['Bảo quản tổ yến khô thế nào?', 'Nơi khô ráo thoáng mát, tránh ẩm và nắng trực tiếp. Mùa mưa nên đóng kín và để tủ lạnh.'],
            ['Yến có công dụng gì?', 'Yến là thực phẩm thông thường, chúng tôi không quảng cáo công dụng chữa bệnh. Mọi người yêu thích yến vì vị thanh mịn và tấm lòng khi làm quà.'],
            ['Phụ nữ mang thai, trẻ nhỏ hoặc người dị ứng có dùng được không?', 'Cơ địa mỗi người khác nhau, hãy hỏi bác sĩ hoặc chuyên gia dinh dưỡng trước. Người dễ dị ứng thực phẩm giàu đạm nên thử lượng nhỏ.'],
            ['Có chọn ngày giao hoặc gửi quà cho người khác được không?', 'Được. Nhập người nhận và ngày mong muốn khi thanh toán; trợ lý AI có thể giúp viết thiệp.'] ] },
          note: 'YAN NEST là thương hiệu đang chuẩn bị: sản phẩm, giá, quy cách và thông tin kiểm nghiệm trên trang là mẫu; khi bán chính thức sẽ theo nhãn thực tế. Yến là thực phẩm thông thường, không có tác dụng chữa bệnh; quy định ghi nhãn và sử dụng theo cơ quan có thẩm quyền. Người có tình trạng sức khỏe đặc biệt nên hỏi ý kiến bác sĩ hoặc chuyên gia dinh dưỡng.',
        },
        ms: {
          badges: ['Ditanak sehari sebelum hantar', 'Sejuk 0–7°C', 'Rekod ujian setiap kelompok (demo)'],
          story: { k: 'OUR STORY', h: 'Pulau dalam bayu laut,<br>satu sarang demi satu.', p: ['Di luar pantai Nha Trang, Vietnam terdapat beberapa pulau walit. Di gua batu dan tebingnya, burung walit menganyam sarang helai demi helai selama beberapa minggu.', 'YAN NEST membawa hadiah dari pulau ini ke Taiwan: setiap sarang direndam, dibersihkan dengan penyepit dan ditanak secara double-boil perlahan-lahan. Tidak tergesa-gesa, cuma mahu anda merasa sarang burung yang sebenar.'], sign: 'YAN NEST' },
          origin: { k: 'ORIGIN', h: 'Asal: pulau walit Nha Trang', sub: 'Nha Trang terletak di wilayah Khánh Hòa, tengah selatan Vietnam. Tebing pulau-pulau di luar pantainya ialah tempat burung walit bersarang.', coord: '12.2°N  109.2°E', map: ['Nha Trang', 'Khánh Hòa · Vietnam', 'Pulau walit'], facts: [['Asal', 'Pulau walit di luar Nha Trang, Khánh Hòa, Vietnam'], ['Jenis', 'Sarang gua pulau'], ['Kutipan', 'Mengikut musim bersarang burung walit'], ['Import', 'Dokumen kuarantin dan pemeriksaan (dalam persediaan)']], note: 'Peta ialah ilustrasi; maklumat asal ikut label pada bungkusan sebenar.' },
          grades: { k: 'HOW TO CHOOSE', h: 'Empat jenis sarang', sub: 'Bezanya pada bentuk, bukan asal; makin utuh bentuknya, makin tinggi harganya.', list: [
            { id: 'cup', n: 'Mangkuk', d: 'Bentuk separuh bulan yang utuh, sesuai untuk hadiah.', soak: 'Rendam 4–6 jam', fit: 'Hadiah · tanak sendiri' },
            { id: 'strip', n: 'Jalur', d: 'Jalur tidak sekata dari sarang sama, lebih berpatutan.', soak: 'Rendam 2–3 jam', fit: 'Harian' },
            { id: 'corner', n: 'Bucu', d: 'Hujung sarang yang melekat di dinding, lebih kenyal.', soak: 'Rendam 6–8 jam', fit: 'Suka tekstur' },
            { id: 'bits', n: 'Serpihan', d: 'Kepingan kecil selepas dibersihkan, paling cepat.', soak: 'Rendam 1 jam', fit: 'Pencuci mulut · masakan' } ] },
          steps: { k: 'FROM NEST TO TABLE', h: 'Dari pulau walit Nha Trang ke meja anda', list: [
            ['Kutipan di pulau', 'Dari gua pulau, ikut musim bersarang'], ['Rendam', 'Direndam dalam air bersih'], ['Bersih', 'Bulu halus dibuang dengan penyepit'], ['Bentuk', 'Dikeringkan pada suhu rendah'], ['Uji', 'Setiap kelompok diuji, rekod disimpan (demo)'], ['Tanak & sejuk', 'Ditanak sehari sebelum, dihantar 0–7°C'] ] },
          calc: { k: 'STEW AT HOME', h: 'Tanak sendiri di rumah', sub: 'Pilih bilangan hidangan dan tekstur, kami kirakan. Panduan umum sahaja; laraskan ikut citarasa.', people: 'hidangan', texture: 'Tekstur', light: 'Ringan', rich: 'Pekat', dry: 'Sarang kering', water: 'Air', soak: 'Rendam', stew: 'Double-boil', g: 'g', ml: 'ml', hr: 'jam', min: 'minit', tips: ['Rendam mangkuk sarang kering dalam air sejuk hingga lembut', 'Buang bulu yang tinggal, bilas perlahan dalam penapis', 'Tambah air, double-boil 30–40 minit; masukkan gula batu di akhir'] },
          promise: { k: 'OUR PROMISE', h: 'Janji kualiti', list: [['Tanpa pengawet atau pewarna', 'Hanya sarang, air dan gula batu'], ['Setiap kelompok diuji (demo)', 'Rekod nitrit, sulfur dioksida dan lain-lain'], ['Diimport secara sah (demo)', 'Dokumen kuarantin, asal boleh dijejak'], ['Penghantaran sejuk', 'Balang segar pada 0–7°C; simpan dalam peti sejuk']] },
          faq: { k: 'FAQ', h: 'Soalan lazim', list: [
            ['Kali pertama, pilih yang mana?', 'Mulakan dengan Set Cuba Dua: satu gula batu dan satu tanpa gula, kemudian pilih pek 6 atau langganan.'],
            ['Berapa lama balang segar tahan?', 'Simpan sejuk 0–7°C. Belum dibuka kira-kira 10 hari (demo); habiskan pada hari dibuka.'],
            ['Cara simpan mangkuk sarang kering?', 'Di tempat sejuk dan kering, jauh dari lembap dan cahaya matahari. Musim hujan, tutup rapat dan simpan sejuk.'],
            ['Apakah khasiatnya?', 'Sarang burung ialah makanan biasa dan kami tidak membuat dakwaan kesihatan. Ramai suka kerana teksturnya yang halus dan sebagai hadiah bermakna.'],
            ['Sesuai untuk ibu mengandung, kanak-kanak atau yang alah?', 'Setiap orang berbeza, sila tanya doktor atau pakar diet dahulu. Jika mudah alah pada makanan berprotein, cuba sedikit dahulu.'],
            ['Boleh pilih tarikh hantar atau hantar hadiah?', 'Boleh. Masukkan penerima dan tarikh pilihan semasa bayar; pembantu AI boleh bantu tulis kad.'] ] },
          note: 'YAN NEST ialah jenama dalam persediaan: produk, harga, spesifikasi dan maklumat ujian di halaman ini ialah contoh; jualan rasmi ikut label sebenar. Sarang burung ialah makanan biasa tanpa kesan perubatan; pelabelan dan pengambilan tertakluk kepada pihak berkuasa. Sila rujuk doktor atau pakar diet jika ada keadaan kesihatan khas.',
        },
      },
    },
    theme: {
      id: 'birdnest', kind: 'base', name: N('洋紅鎏金', 'Magenta & Gold', 'マゼンタ＆ゴールド', 'Hồng cánh sen & Vàng', 'Magenta & Emas'), deco: 'sparkle', dark: false,
      vars: { cream: '#fcf6f2', cream2: '#f5e6e3', ink: '#2a1a21', ink2: '#5a4650', ink3: '#94838b', rose: '#b0823f', g: '#b8146a', gl: '#d9b56b', card: '#fffbf9', deep: '#4d0a2e', deep2: '#7e1150', heroA: '#f8d6e6', heroB: '#fff7f4', heroC: '#efd5b9', btn: '#4d0a2e', btnInk: '#f4e3bd' },
      hero: { pal: ['#d9b56b', '#f8e3ec', '#b8146a', '#b0823f', '#fff7f4', '#7e1150'], dots: ['#d9b56b', '#ffffff', '#b8146a', '#f4e3bd'], sky: '#fbeff2', ground: '#f0dccf', point: '#ffd98a' },
      style: { font: 'serif', radius: 'soft', hero: 'split', grid: 'magazine', button: 'solid', texture: 'none' },
    },
    profile: {
      avatar: '嬿', volume: 8, aiName: '小燕', region: '台灣（待填寫）',
      staff: [
        { name: '店主（待填寫）', title: '負責人・燉煮與挑毛（示範薪資）', kind: 'owner', pay: 52000 },
        { name: '兼職人員（示範）', title: '挑毛與包裝・兼職', kind: 'part', pay: 16000, level: 16500, hours: 80, hourly: 200 },
      ],
      suppliers: [
        { item: '乾燕盞與燕條（越南芽莊進口）', vendor: '芽莊燕島供應商（待填寫）', base: 42000 },
        { item: '玻璃瓶、金蓋與標籤', vendor: '晶亮玻璃（示範，待填寫）', base: 6200 },
        { item: '燙金禮盒與提袋', vendor: '好包裝材料行（示範，待填寫）', base: 5400 },
        { item: '冷藏宅配運費', vendor: '綠野物流（示範，待填寫）', base: 7800 },
      ],
      fixed: { rent: 16000, utility: 4200, ads: 9000, depreciation: 3800, equip: '燉鍋、冷藏櫃與真空封口機' },
      rd: [['檢驗費', '每批燕窩送驗亞硝酸鹽、二氧化硫等項目', '食品檢驗所（示範，待填寫）', 6800, '收據', 12]],
      channels: { web: 0.40, line: 0.30, pos: 0.04, phone: 0.08, whatsapp: 0.08, zalo: 0.04, messenger: 0.06 },
      langs: { zh: 0.78, en: 0.06, ja: 0.04, vi: 0.06, ms: 0.06 },
    },
  },
];
