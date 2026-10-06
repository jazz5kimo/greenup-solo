// AI 設計師：老闆在後台用一句話描述想要的感覺，由 Claude（預設 Opus）設計銷售網頁的風格
// 輸出是一份「設計規格」：配色變數、版面六軸、裝飾、3D 主視覺配色、五語標語與主視覺文案，
// 交給 shop/themes.js customTheme() 變成可套用的風格；全部欄位都會在本機再驗證一次（對比度、合法值）。
//
// 兩種連線方式：
//  1. 雲端示範：瀏覽器直接呼叫 Claude Messages API（金鑰只存在這台瀏覽器；正式版不建議）
//  2. 地端：呼叫自己 n8n 的 /webhook/ai-design，金鑰放在伺服器（installer/n8n/workflows/ai-design.json）
// 沒有金鑰時用內建的規則式設計師（示範），同樣的輸入會得到同樣的結果。
import { TENANT, TENANT_ID, CATS } from './tenant.js';
import { PRODUCTS } from './data.js';
import { STYLE_AXES, contrast, THEME_MAP } from './shop/themes.js';
import { mix } from './merchant-art.js';

export const MODELS = [
  { id: 'claude-opus-5-5', name: 'Claude Opus 5.5（預設・設計品質最好）' },
  { id: 'claude-sonnet-5-5', name: 'Claude Sonnet 5.5（較快、較省）' },
];
export const DEFAULT_MODEL = 'claude-opus-5-5';
const LS_SETTINGS = 'greenup-solo:ai-design:settings'; // 依業主自動分開（tenant.js 前綴）
const LS_HISTORY = 'greenup-solo:ai-design:history';
const DECOS = ['none', 'steam', 'petal', 'sparkle', 'leaf', 'star', 'lantern', 'snow', 'redlantern', 'bubble'];
const LANGS = ['zh', 'en', 'ja', 'vi', 'ms'];

// ---------- 設定（連線方式、金鑰、模型） ----------
export function getSettings() {
  try { return Object.assign({ mode: 'demo', model: DEFAULT_MODEL, auth: 'apikey', apiKey: '', token: '', proxyUrl: '' }, JSON.parse(localStorage.getItem(LS_SETTINGS) || '{}')); } catch { return { mode: 'demo', model: DEFAULT_MODEL, auth: 'apikey', apiKey: '', token: '', proxyUrl: '' }; }
}
export function saveSettings(patch) {
  const s = Object.assign(getSettings(), patch);
  try { localStorage.setItem(LS_SETTINGS, JSON.stringify(s)); } catch { /* ignore */ }
  return s;
}
export const maskKey = (k) => (k && k.length > 12 ? `${k.slice(0, 7)}…${k.slice(-4)}` : (k ? '已設定' : '未設定'));

// ---------- 歷史版本 ----------
export function getHistory() { try { return JSON.parse(localStorage.getItem(LS_HISTORY) || '[]'); } catch { return []; } }
export function pushHistory(entry) {
  const h = [entry, ...getHistory()].slice(0, 12);
  try { localStorage.setItem(LS_HISTORY, JSON.stringify(h)); } catch { /* ignore */ }
  return h;
}
export function clearHistory() { try { localStorage.removeItem(LS_HISTORY); } catch { /* ignore */ } }

// ---------- 給 Claude 的設計規格（structured output JSON Schema） ----------
const HEX = { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' };
const VAR_KEYS = ['cream', 'cream2', 'ink', 'ink2', 'ink3', 'rose', 'g', 'gl', 'card', 'deep', 'deep2', 'heroA', 'heroB', 'heroC', 'btn', 'btnInk'];
const COPY_PROPS = { type: 'object', properties: { tagline: { type: 'string' }, title: { type: 'string' }, sub: { type: 'string' }, cta: { type: 'string' } }, required: ['tagline', 'title', 'sub', 'cta'], additionalProperties: false };
export const DESIGN_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string', description: '風格名稱（繁體中文，6 字內）' },
    concept: { type: 'string', description: '設計概念說明，給老闆看的 2–3 句繁體中文：用了什麼顏色、為什麼適合這家店' },
    dark: { type: 'boolean', description: '是否深色底' },
    vars: { type: 'object', properties: Object.fromEntries(VAR_KEYS.map(k => [k, HEX])), required: VAR_KEYS, additionalProperties: false },
    style: { type: 'object', properties: Object.fromEntries(Object.entries(STYLE_AXES).map(([k, v]) => [k, { type: 'string', enum: v }])), required: Object.keys(STYLE_AXES), additionalProperties: false },
    deco: { type: 'string', enum: DECOS },
    hero: { type: 'object', properties: { pal: { type: 'array', items: HEX, minItems: 6, maxItems: 6 }, dots: { type: 'array', items: HEX, minItems: 4, maxItems: 6 }, sky: HEX, ground: HEX, point: HEX }, required: ['pal', 'dots', 'sky', 'ground', 'point'], additionalProperties: false },
    copy: { type: 'object', properties: Object.fromEntries(LANGS.map(l => [l, COPY_PROPS])), required: LANGS, additionalProperties: false },
  },
  required: ['name', 'concept', 'dark', 'vars', 'style', 'deco', 'hero', 'copy'],
  additionalProperties: false,
};

const AXIS_DOC = `版面六軸（每個只能選一個值）：
- font：sans 現代無襯線／serif 典雅襯線／round 圓潤可愛／mono 工業等寬／hand 手寫親切／condensed 緊湊有力
- radius：sharp 直角俐落／soft 微圓／round 圓角友善／pill 全圓
- hero：split 左文右圖／center 置中大標／banner 滿版橫幅／minimal 極簡留白／poster 海報感
- grid：cards 卡片／list 清單／magazine 雜誌錯落／tiles 方磚
- button：solid 實心／outline 線框／pill 膠囊／block 粗體塊
- texture：none／paper 紙感／grain 顆粒／dots 點陣／lines 線條／grid 格線
裝飾 deco：none／steam 熱氣／petal 花瓣／sparkle 閃光／leaf 葉子／star 星星／lantern 燈籠／snow 雪／redlantern 紅燈籠／bubble 泡泡`;

const VARS_DOC = `配色變數（16 進位色）：cream/cream2 頁面底色（深色風格就用深色）、ink/ink2/ink3 文字（ink 對 cream 對比 ≥ 7:1、ink2 ≥ 4.5:1）、rose 強調色、g/gl 主色與亮主色、card 卡片底、deep/deep2 頁尾等深色區塊、heroA/B/C 主視覺漸層三色、btn 按鈕底、btnInk 按鈕文字（對 btn ≥ 4.5:1）。
3D 主視覺 hero：pal 六個物件色、dots 粒子色、sky 天空、ground 地面、point 點光源。`;

export function buildSystemPrompt() {
  return `你是 GreenUP 的品牌與網頁設計師，專門替台灣的一人公司設計銷售網頁。老闆會用一句話描述想要的感覺，你要產出一份完整的設計規格 JSON。
設計原則：配色要符合業態與老闆描述的氣質；文字對比度一定要達標（可讀性優先）；版面六軸要互相呼應（例如手寫字體配紙感紋理、工業感配等寬字體與直角）；避免與老闆描述相反的選擇。
文案要短而有畫面感，五種語言各自道地（不是逐字翻譯）：tagline 15 字內、title 主標 12 字內（可含換行「\\n」）、sub 副標 40 字內、cta 按鈕 6 字內。不可捏造品牌合作、得獎或療效。
${AXIS_DOC}
${VARS_DOC}`;
}

export function buildUserPrompt(prompt, { prev = null, feedback = '' } = {}) {
  const ps = PRODUCTS.slice(0, 8).map(p => `${p.name}（${p.unit}，NT$${p.listPrice ?? p.price}）`).join('、');
  const base = THEME_MAP[TENANT.theme];
  const lines = [
    `店家：${TENANT.name}（${TENANT.en || ''}）`, `業態：${TENANT.typeName}／${CATS[TENANT.cat] || TENANT.cat}`, `負責人：${TENANT.owner}`, `地區：${TENANT.region || '台灣'}`,
    `主要商品：${ps}`, `目前標語：${TENANT.tagline || '—'}`,
    base ? `目前風格：${base.name?.zh || base.id}（${Object.entries(base.style || {}).map(([k, v]) => `${k}=${v}`).join(' ')}）` : '',
    '', `老闆的描述：${prompt}`,
  ];
  if (prev) lines.push('', `上一版設計（JSON）：${JSON.stringify({ name: prev.name, vars: prev.vars, style: prev.style, deco: prev.deco })}`, `老闆的修改意見：${feedback}`, '請在上一版的基礎上修改，只改老闆提到的部分，其餘保留。');
  return lines.filter(x => x !== undefined).join('\n');
}

// ---------- 呼叫 Claude ----------
export async function callClaude({ prompt, prev, feedback, signal }) {
  const s = getSettings();
  const body = {
    model: s.model || DEFAULT_MODEL,
    max_tokens: 4000,
    output_config: { effort: 'high', format: { type: 'json_schema', schema: DESIGN_SCHEMA } },
    system: buildSystemPrompt(),
    messages: [{ role: 'user', content: buildUserPrompt(prompt, { prev, feedback }) }],
  };
  let res;
  if (s.mode === 'proxy') {
    if (!s.proxyUrl) throw new Error('請先填入 n8n 的 /webhook/ai-design 網址');
    // auth 告訴 n8n 代理用哪一組憑證（API 金鑰，或 greenup ai login 寫入的帳號登入權杖）
    res = await fetch(s.proxyUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tenant: TENANT_ID, auth: s.auth === 'oauth' ? 'oauth' : 'apikey', request: body }), signal });
  } else {
    const headers = { 'content-type': 'application/json', 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' };
    if (s.auth === 'oauth') {
      // Anthropic 帳號登入（ant auth login）的權杖：Bearer＋oauth beta 標頭；權杖是短效的，過期要重新取得
      if (!s.token) throw new Error('請先貼上帳號登入權杖（ant auth print-credentials --access-token），或改用示範模式');
      headers.authorization = `Bearer ${s.token.replace(/^Bearer\s+/i, '')}`; headers['anthropic-beta'] = 'oauth-2025-04-20';
    } else {
      if (!s.apiKey) throw new Error('請先填入 Claude API 金鑰，或改用示範模式');
      headers['x-api-key'] = s.apiKey;
    }
    res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', signal, headers, body: JSON.stringify(body) });
  }
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); msg = j.error?.message || j.message || msg; } catch { /* ignore */ }
    if (res.status === 401) msg = (s.mode !== 'proxy' && s.auth === 'oauth' ? '登入權杖無效或已過期（401），請重新執行 ant auth print-credentials --access-token 取得新權杖：' : '金鑰無效或已失效（401）：') + msg;
    if (res.status === 429) msg = '目前請求太多，稍後再試（429）：' + msg;
    throw new Error(msg);
  }
  const data = await res.json();
  if (data.stop_reason === 'refusal') throw new Error('Claude 拒絕了這個請求：' + (data.stop_details?.explanation || '請換個描述'));
  const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  let spec;
  try { spec = JSON.parse(text); } catch { throw new Error('Claude 回傳的不是有效的設計規格，請再試一次'); }
  return { spec: validateSpec(spec), usage: data.usage || null, model: data.model || body.model, raw: text };
}

// ---------- 驗證與修正（不信任模型輸出，保證可讀） ----------
const isHex = (v) => /^#[0-9a-fA-F]{6}$/.test(String(v || ''));
const lum = (h) => { const n = parseInt(h.slice(1), 16); const c = [16, 8, 0].map(s => { const v = ((n >> s) & 255) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
function fixContrast(fg, bg, target) {
  let x = fg; const toward = lum(bg) > 0.4 ? '#000000' : '#ffffff';
  for (let i = 0; i < 30 && contrast(x, bg) < target; i++) x = mix(x, toward, 0.08);
  return x;
}
export function validateSpec(raw) {
  const spec = JSON.parse(JSON.stringify(raw || {}));
  const notes = [];
  const base = THEME_MAP[TENANT.theme] || THEME_MAP.cream;
  spec.vars = spec.vars || {};
  for (const k of VAR_KEYS) if (!isHex(spec.vars[k])) { spec.vars[k] = base.vars[k] || base.vars.ink || '#333333'; notes.push(`${k} 不是合法色碼，改用預設`); }
  const v = spec.vars;
  spec.dark = typeof spec.dark === 'boolean' ? spec.dark : lum(v.cream) < 0.3;
  // 對比度：文字對底色、按鈕文字對按鈕
  const fixes = [['ink', 'cream', 7], ['ink2', 'cream', 4.5], ['ink3', 'cream', 3], ['ink', 'card', 7], ['btnInk', 'btn', 4.5]];
  for (const [fg, bg, t] of fixes) { const c0 = contrast(v[fg], v[bg]); if (c0 < t) { v[fg] = fixContrast(v[fg], v[bg], t); notes.push(`${fg} 對 ${bg} 對比 ${c0.toFixed(1)} → 已加深到 ${contrast(v[fg], v[bg]).toFixed(1)}`); } }
  spec.style = spec.style || {};
  for (const [k, opts] of Object.entries(STYLE_AXES)) if (!opts.includes(spec.style[k])) { spec.style[k] = (base.style && base.style[k]) || opts[0]; notes.push(`style.${k} 無效，改用 ${spec.style[k]}`); }
  if (!DECOS.includes(spec.deco)) spec.deco = 'none';
  const h = spec.hero || {}; const pal = (Array.isArray(h.pal) ? h.pal : []).filter(isHex);
  while (pal.length < 6) pal.push([v.gl, v.rose, v.heroA, v.heroB, v.heroC, v.g][pal.length]);
  const dots = (Array.isArray(h.dots) ? h.dots : []).filter(isHex); while (dots.length < 4) dots.push(pal[dots.length]);
  spec.hero = { pal: pal.slice(0, 6), dots: dots.slice(0, 6), sky: isHex(h.sky) ? h.sky : v.heroA, ground: isHex(h.ground) ? h.ground : v.heroB, point: isHex(h.point) ? h.point : v.rose, ...(spec.dark ? { dim: true } : {}) };
  const copy = spec.copy || {}; const zh = copy.zh || {};
  spec.copy = Object.fromEntries(LANGS.map(l => { const c = copy[l] || zh; return [l, { tagline: String(c.tagline || zh.tagline || TENANT.tagline || '').slice(0, 40), title: String(c.title || zh.title || TENANT.name).slice(0, 60), sub: String(c.sub || zh.sub || '').slice(0, 160), cta: String(c.cta || zh.cta || '').slice(0, 24) }]; }));
  spec.name = String(spec.name || 'AI 設計').slice(0, 12);
  spec.concept = String(spec.concept || '').slice(0, 400);
  spec.notes = notes;
  return spec;
}

// ---------- 內建規則式設計師（沒有金鑰時的示範；同樣輸入同樣結果） ----------
const MOODS = [
  { re: /日式|和風|禪|侘寂|茶|木質|wabi|zen|japan/i, vars: { cream: '#f6f1e8', ink: '#2b2a26', rose: '#b5543a', g: '#5c6b4a', deep: '#2b2a26' }, style: { font: 'serif', radius: 'sharp', hero: 'minimal', grid: 'list', button: 'outline', texture: 'paper' }, deco: 'leaf', name: '和風素雅' },
  { re: /北歐|極簡|簡約|留白|minimal|clean|nordic/i, vars: { cream: '#fbfbf9', ink: '#1f2328', rose: '#e07a3f', g: '#3b5b7a', deep: '#1f2328' }, style: { font: 'sans', radius: 'soft', hero: 'minimal', grid: 'cards', button: 'outline', texture: 'none' }, deco: 'none', name: '北歐極簡' },
  { re: /可愛|粉嫩|少女|夢幻|kawaii|pastel|cute/i, vars: { cream: '#fff6f8', ink: '#4a2c3a', rose: '#f28bb0', g: '#c2567f', deep: '#4a2c3a' }, style: { font: 'round', radius: 'pill', hero: 'center', grid: 'tiles', button: 'pill', texture: 'dots' }, deco: 'sparkle', name: '粉嫩可愛' },
  { re: /工業|復古|美式|皮革|深色|黑|酷|industrial|vintage|dark|retro/i, vars: { cream: '#1b1a18', ink: '#f1ece2', rose: '#e0a526', g: '#c98b5b', deep: '#0e0d0c' }, style: { font: 'condensed', radius: 'sharp', hero: 'poster', grid: 'magazine', button: 'block', texture: 'grain' }, deco: 'none', dark: true, name: '工業復古' },
  { re: /自然|有機|森林|綠|植物|田|農|natural|organic|forest|green/i, vars: { cream: '#f3f7ee', ink: '#1e3322', rose: '#e07a3f', g: '#2f7d4f', deep: '#173b25' }, style: { font: 'hand', radius: 'round', hero: 'banner', grid: 'cards', button: 'solid', texture: 'paper' }, deco: 'leaf', name: '自然有機' },
  { re: /海|藍|夏|清爽|度假|ocean|sea|blue|summer|fresh/i, vars: { cream: '#f1fbfd', ink: '#0f3340', rose: '#ff7a59', g: '#0c8fa8', deep: '#0b4c5f' }, style: { font: 'sans', radius: 'round', hero: 'center', grid: 'tiles', button: 'solid', texture: 'none' }, deco: 'bubble', name: '清爽海洋' },
  { re: /奢華|精品|金|黑金|高級|luxury|premium|gold|elegant|典雅/i, vars: { cream: '#121212', ink: '#f3e9d2', rose: '#d4af37', g: '#b8963e', deep: '#0a0a0a' }, style: { font: 'serif', radius: 'sharp', hero: 'poster', grid: 'magazine', button: 'outline', texture: 'lines' }, deco: 'sparkle', dark: true, name: '黑金精品' },
  { re: /溫暖|暖|手作|家|溫馨|warm|cozy|home|handmade/i, vars: { cream: '#fbf6ee', ink: '#3a2a1e', rose: '#d9773f', g: '#8b5a34', deep: '#3a2616' }, style: { font: 'hand', radius: 'soft', hero: 'split', grid: 'cards', button: 'solid', texture: 'paper' }, deco: 'steam', name: '溫暖手作' },
  { re: /活力|鮮豔|繽紛|年輕|潮|街頭|bold|vivid|pop|street|young/i, vars: { cream: '#fffbe6', ink: '#1a1a2e', rose: '#ff3d71', g: '#5b2cff', deep: '#1a1a2e' }, style: { font: 'condensed', radius: 'pill', hero: 'poster', grid: 'tiles', button: 'block', texture: 'dots' }, deco: 'star', name: '繽紛街頭' },
  { re: /節慶|聖誕|過年|春節|新年|喜氣|紅|christmas|festive/i, vars: { cream: '#fff5ea', ink: '#3a1410', rose: '#d4232f', g: '#c0262d', deep: '#8c1018' }, style: { font: 'serif', radius: 'soft', hero: 'banner', grid: 'cards', button: 'solid', texture: 'paper' }, deco: 'redlantern', name: '喜氣節慶' },
];
const hashOf = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
export function localDesign(prompt, { prev = null, feedback = '' } = {}) {
  const text = `${prompt} ${feedback}`;
  const mood = MOODS.find(m => m.re.test(text)) || MOODS[(hashOf(prompt) % MOODS.length)];
  const base = THEME_MAP[TENANT.theme] || THEME_MAP.cream;
  const dark = !!mood.dark;
  const v0 = Object.assign({}, base.vars, prev ? prev.vars : {}, mood.vars);
  // 由主色推導其餘變數
  const cream = v0.cream, ink = v0.ink, g = v0.g, rose = v0.rose, deep = v0.deep;
  const vars = {
    cream, cream2: mix(cream, dark ? '#ffffff' : ink, dark ? 0.06 : 0.06), ink, ink2: mix(ink, cream, 0.3), ink3: mix(ink, cream, 0.5), rose, g, gl: mix(g, dark ? '#ffffff' : '#ffffff', 0.18),
    card: dark ? mix(cream, '#ffffff', 0.06) : '#ffffff', deep, deep2: mix(deep, g, 0.3), heroA: mix(rose, cream, 0.7), heroB: mix(g, cream, 0.75), heroC: mix(rose, '#ffe08a', 0.5), btn: dark ? rose : ink, btnInk: dark ? '#111111' : '#ffffff',
  };
  // 修改意見：更暗／更亮／更溫暖／更冷
  if (/更暗|深一點|暗一點|darker/i.test(feedback)) { vars.cream = mix(vars.cream, '#000000', 0.08); vars.cream2 = mix(vars.cream2, '#000000', 0.08); }
  if (/更亮|亮一點|淺一點|lighter/i.test(feedback)) { vars.cream = mix(vars.cream, '#ffffff', 0.3); vars.cream2 = mix(vars.cream2, '#ffffff', 0.3); }
  if (/更暖|溫暖|warm/i.test(feedback)) { vars.cream = mix(vars.cream, '#ffd9a0', 0.15); vars.rose = mix(vars.rose, '#ff7a30', 0.3); }
  if (/更冷|冷一點|cool/i.test(feedback)) { vars.cream = mix(vars.cream, '#cfe3ff', 0.15); vars.g = mix(vars.g, '#2e6cd4', 0.3); }
  const style = Object.assign({}, prev ? prev.style : {}, mood.style);
  if (/圓角|圓潤|round/i.test(feedback)) style.radius = 'round';
  if (/直角|俐落|sharp/i.test(feedback)) style.radius = 'sharp';
  if (/襯線|典雅|serif/i.test(feedback)) style.font = 'serif';
  if (/手寫/i.test(feedback)) style.font = 'hand';
  const p0 = PRODUCTS[0]?.name || '招牌商品';
  const nm = TENANT.name;
  const copy = {
    zh: { tagline: `${TENANT.tagline || mood.name}`, title: `${mood.name}的\n${TENANT.typeName}`, sub: `${TENANT.owner}一個人用心經營，${p0}每天現做。`, cta: '立即選購' },
    en: { tagline: TENANT.en || nm, title: `${nm}`, sub: `Run by ${TENANT.owner} alone, made fresh every day.`, cta: 'Shop now' },
    ja: { tagline: TENANT.en || nm, title: `${nm}`, sub: `${TENANT.owner}がひとりで営む、毎日手づくりのお店。`, cta: '今すぐ購入' },
    vi: { tagline: TENANT.en || nm, title: `${nm}`, sub: `${TENANT.owner} tự tay làm mỗi ngày.`, cta: 'Mua ngay' },
    ms: { tagline: TENANT.en || nm, title: `${nm}`, sub: `${TENANT.owner} mengusahakannya seorang diri, segar setiap hari.`, cta: 'Beli sekarang' },
  };
  const spec = validateSpec({
    name: mood.name, dark, vars, style, deco: mood.deco,
    hero: { pal: [g, rose, vars.heroA, vars.heroB, vars.heroC, mix(g, '#ffffff', 0.5)], dots: [g, rose, '#ffffff', vars.heroC], sky: vars.heroA, ground: vars.heroB, point: rose },
    copy,
    concept: `依「${prompt}」選了${mood.name}方向：底色 ${cream}、主色 ${g}、強調色 ${rose}；版面用 ${style.font}／${style.hero}／${style.grid}。（示範：內建規則式設計師，接上 Claude 後會由模型依店家與商品量身設計）`,
  });
  spec.source = 'local';
  return spec;
}

// ---------- 統一入口 ----------
export async function design(prompt, { prev = null, feedback = '', signal } = {}) {
  const s = getSettings();
  if (s.mode === 'demo' || (s.mode === 'cloud' && !(s.auth === 'oauth' ? s.token : s.apiKey)) || (s.mode === 'proxy' && !s.proxyUrl)) {
    await new Promise(r => setTimeout(r, 900 + Math.random() * 600));
    return { spec: localDesign(prompt, { prev, feedback }), usage: null, model: '示範設計師（規則式）', source: 'local' };
  }
  const out = await callClaude({ prompt, prev, feedback, signal });
  out.spec.source = 'claude';
  return { ...out, source: 'claude' };
}

// 轉成 shop-config 的 custom 欄位（themes.customTheme 會讀）
export const toCustom = (spec, prompt) => ({ name: spec.name, vars: spec.vars, style: spec.style, deco: spec.deco, dark: spec.dark, hero: spec.hero, copy: spec.copy, concept: spec.concept, prompt, source: spec.source || 'claude', at: Date.now() });
