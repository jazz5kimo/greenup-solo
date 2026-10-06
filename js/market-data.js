// 多平台上架：各平台「示範」設定。
// 串接方式、欄位、字數、圖片規格、費用皆為 GreenUP 示範假設，實際依各平台最新規定與您的合約為準；
// 不代表與各平台有合作關係。平台以文字字首色塊表示，不使用任何品牌標誌。
import { PRODUCTS, PRODUCT_MAP, mulberry32 } from './data.js';
import { TENANT } from './tenant.js';
import { IS_AMEI, CAT, FOODISH, KIT, MAT, RECIPES } from './inventory-data.js';
import { META, NEW_PRODUCT } from './listing-data.js';

export const DISCLAIMER = '串接方式、欄位、費用依各平台最新規定與您的合約為準；不代表與各平台有合作關係。';
export const BRAND = IS_AMEI ? '阿美手作甜點' : (TENANT.name || '本店');
export const DEMO_FDA = 'A-000000000-00000-0';

// 主檔欄位（CSV 欄位以 key 對應）
export const FIELD_LABEL = IS_AMEI || FOODISH ? {
  fda: '食品業者登錄字號', weight: '重量', ingredients: '成分', storage: '保存方式', shelf: '保存期限', allergens: '過敏原',
} : { fda: '登錄字號', weight: '重量', ingredients: CAT === 'service' ? '服務內容' : '材質／內容', storage: '使用與保養', shelf: CAT === 'flower' ? '欣賞天數' : '保固', allergens: '過敏原' };

// 分類：內部分類 → 葉節點名稱
const A_CAT_OF = { yuzu: 'tart', lemon: 'tart', roll: 'roll', basque: 'cheese', pound: 'pound', cookie: 'cookie', pineapple: 'pineapple', canele: 'petit' };
const LEAF = { tart: '塔派', roll: '蛋糕捲', cheese: '乳酪蛋糕', pound: '磅蛋糕', cookie: '餅乾禮盒', pineapple: '鳳梨酥', petit: '法式小點' };

/*
  每個平台：
  mode    預設上架方式：api（API 一鍵上架）／file（打包檔案手動上傳）
  titleMax 標題字數上限；cnt: 'char' 每字算 1、'w' 全形字算 2（示範假設）
  style   標題改寫風格
  fee     平台費用率 %（示範假設，可在卡片上修改）
  safety  各平台安全量（共用庫存保留，不給該平台賣）
  variants 是否支援多規格（口味／尺寸）
  img     ratio 主圖比例、min 最小邊長、out 打包時輸出的 PNG 尺寸
  req     必填欄位（示範）
  cat     分類路徑根節點；coarse=true 表示該平台分類較粗，葉節點併入「甜點蛋糕」
  cols    CSV 欄位順序：[表頭, key]
*/
const A_PLATFORMS = [
  { id: 'shopee', name: '蝦皮購物', short: '蝦', file: 'Shopee', color: '#EE4D2D', mode: 'api', titleMax: 120, cnt: 'char', style: 'bracket', fee: 10, safety: 2, variants: true,
    img: { ratio: '1:1', min: 500, out: [[1000, 1000]] }, req: ['fda', 'weight', 'storage', 'shelf'], cat: ['美食、伴手禮', '甜點、蛋糕'],
    cols: [['分類', 'cat'], ['商品名稱', 'title'], ['商品描述', 'desc'], ['商品選項名稱', 'varName'], ['選項', 'varOpt'], ['價格', 'price'], ['庫存', 'stock'], ['商品貨號', 'sku'], ['主商品圖片', 'img1'], ['重量(kg)', 'weightKg'], ['保存期限', 'shelfTxt'], ['食品業者登錄字號', 'fda']] },
  { id: 'momo', name: 'momo 購物網', short: 'mo', file: 'momo', color: '#D8337F', mode: 'file', titleMax: 50, cnt: 'char', style: 'plain', fee: 18, safety: 3, variants: true,
    img: { ratio: '1:1', min: 1000, out: [[1000, 1000], [800, 800]] }, req: ['fda', 'weight', 'ingredients', 'allergens', 'storage', 'shelf'], cat: ['食品', '甜點蛋糕'],
    cols: [['商品名稱', 'title'], ['品牌', 'brand'], ['分類', 'cat'], ['售價', 'price'], ['庫存', 'stock'], ['規格名稱', 'varName'], ['規格內容', 'varOpt'], ['商品重量(g)', 'weightG'], ['配送溫層', 'temp'], ['成分', 'ingredients'], ['過敏原資訊', 'allergens'], ['保存方式', 'storageTxt'], ['保存期限(天)', 'shelf'], ['食品業者登錄字號', 'fda'], ['商品特色', 'point'], ['商品說明', 'desc'], ['圖片1', 'img1'], ['圖片2', 'img2']] },
  { id: 'pchome', name: 'PChome 24h 購物', short: 'PC', file: 'PChome24h', color: '#E3262F', mode: 'file', titleMax: 45, cnt: 'char', style: 'plain', fee: 16, safety: 3, variants: true,
    img: { ratio: '1:1', min: 800, out: [[800, 800]] }, req: ['fda', 'weight', 'ingredients', 'storage', 'shelf'], cat: ['食品', '甜點'],
    cols: [['商品名稱', 'title'], ['副標', 'point'], ['分類路徑', 'cat'], ['建議售價', 'price'], ['可售數量', 'stock'], ['款式', 'varOpt'], ['重量(g)', 'weightG'], ['溫層', 'temp'], ['成分', 'ingredients'], ['過敏原', 'allergens'], ['保存條件', 'storageTxt'], ['保存期限(天)', 'shelf'], ['食品業者登錄字號', 'fda'], ['商品介紹', 'desc'], ['主圖', 'img1']] },
  { id: 'ymall', name: 'Yahoo 奇摩購物中心', short: 'Y購', file: 'Yahoo購物中心', color: '#6E2BD9', mode: 'file', titleMax: 50, cnt: 'char', style: 'plain', fee: 15, safety: 3, variants: true,
    img: { ratio: '1:1', min: 1000, out: [[1000, 1000], [600, 600]] }, req: ['fda', 'weight', 'ingredients', 'storage', 'shelf'], cat: ['美食', '甜點蛋糕'],
    cols: [['商品名稱', 'title'], ['分類', 'cat'], ['售價', 'price'], ['庫存', 'stock'], ['規格', 'varOpt'], ['商品重量(g)', 'weightG'], ['成分', 'ingredients'], ['過敏原', 'allergens'], ['保存方式', 'storageTxt'], ['有效日期(天)', 'shelf'], ['食品業者登錄字號', 'fda'], ['商品描述', 'desc'], ['主圖', 'img1'], ['縮圖', 'img2']] },
  { id: 'yauction', name: 'Yahoo 奇摩拍賣', short: 'Y拍', file: 'Yahoo拍賣', color: '#8E2BC2', mode: 'file', titleMax: 60, cnt: 'w', style: 'bracket', fee: 5, safety: 2, variants: true,
    img: { ratio: '1:1', min: 600, out: [[800, 800]] }, req: ['fda', 'weight', 'storage', 'shelf'], cat: ['美食、餐券', '甜點'], coarse: true,
    cols: [['商品名稱', 'title'], ['分類', 'cat'], ['直購價', 'price'], ['數量', 'stock'], ['規格', 'varOpt'], ['商品說明', 'desc'], ['重量(g)', 'weightG'], ['保存期限', 'shelfTxt'], ['食品業者登錄字號', 'fda'], ['圖片', 'img1']] },
  { id: 'ruten', name: '露天拍賣', short: '露', file: '露天拍賣', color: '#E9A21A', mode: 'file', titleMax: 30, cnt: 'char', style: 'bracket', fee: 5, safety: 2, variants: true,
    img: { ratio: '1:1', min: 600, out: [[800, 800]] }, req: ['fda', 'storage', 'shelf'], cat: ['食品', '甜點'], coarse: true,
    cols: [['商品名稱', 'title'], ['類別', 'cat'], ['售價', 'price'], ['數量', 'stock'], ['規格', 'varOpt'], ['商品描述', 'desc'], ['保存方式', 'storageTxt'], ['保存期限', 'shelfTxt'], ['食品業者登錄字號', 'fda'], ['圖片檔名', 'img1']] },
  { id: 'pinkoi', name: 'Pinkoi', short: 'Pk', file: 'Pinkoi', color: '#1BA6B0', mode: 'file', titleMax: 50, cnt: 'char', style: 'gift', fee: 15, safety: 2, variants: true,
    img: { ratio: '4:3', min: 900, out: [[1200, 900]] }, req: ['fda', 'weight', 'ingredients', 'allergens', 'storage', 'shelf'], cat: ['美食', '甜點'],
    cols: [['商品名稱', 'title'], ['一句話介紹', 'point'], ['分類', 'cat'], ['價格', 'price'], ['庫存', 'stock'], ['款式', 'varOpt'], ['成分', 'ingredients'], ['過敏原', 'allergens'], ['保存方式', 'storageTxt'], ['賞味期限', 'shelfTxt'], ['重量(g)', 'weightG'], ['食品業者登錄字號', 'fda'], ['商品介紹', 'desc'], ['圖片', 'img1'], ['標籤', 'tags']] },
  { id: 'coupang', name: 'Coupang 酷澎', short: '酷', file: 'Coupang', color: '#C2322C', mode: 'file', titleMax: 100, cnt: 'char', style: 'plain', fee: 12, safety: 3, variants: true,
    img: { ratio: '1:1', min: 500, out: [[1000, 1000]] }, req: ['fda', 'weight', 'ingredients', 'allergens', 'storage', 'shelf'], cat: ['食品', '烘焙甜點'],
    cols: [['分類', 'cat'], ['商品名稱', 'title'], ['品牌', 'brand'], ['選項類型', 'varName'], ['選項值', 'varOpt'], ['售價', 'price'], ['庫存', 'stock'], ['重量(g)', 'weightG'], ['成分', 'ingredients'], ['過敏原', 'allergens'], ['保存方式', 'storageTxt'], ['保存期限(天)', 'shelf'], ['食品業者登錄字號', 'fda'], ['商品詳情', 'desc'], ['主圖', 'img1'], ['賣家商品編號', 'sku']] },
  { id: 'linegift', name: 'LINE 禮物', short: 'LG', file: 'LINE禮物', color: '#18A957', mode: 'file', titleMax: 30, cnt: 'char', style: 'gift', fee: 20, safety: 3, variants: false,
    img: { ratio: '1:1', min: 800, out: [[800, 800]] }, req: ['fda', 'weight', 'ingredients', 'allergens', 'storage', 'shelf'], cat: ['美食甜點', '蛋糕甜點'], coarse: true,
    cols: [['商品名稱', 'title'], ['送禮文案', 'point'], ['分類', 'cat'], ['售價', 'price'], ['庫存', 'stock'], ['重量(g)', 'weightG'], ['配送溫層', 'temp'], ['成分', 'ingredients'], ['過敏原', 'allergens'], ['保存期限(天)', 'shelf'], ['食品業者登錄字號', 'fda'], ['商品說明', 'desc'], ['主圖', 'img1']] },
  { id: 'web', name: '自家官網', sub: 'GreenUP 內建', short: 'G', file: '自家官網', color: '#2DB674', mode: 'api', builtIn: true, titleMax: 80, cnt: 'char', style: 'web', fee: 2.8, safety: 0, variants: true,
    img: { ratio: '1:1', min: 1000, out: [[1200, 1200], [1600, 900]] }, req: ['fda', 'ingredients', 'allergens', 'storage', 'shelf'], cat: ['甜點'],
    cols: [['商品名稱', 'title'], ['分類', 'cat'], ['售價', 'price'], ['庫存', 'stock'], ['規格', 'varOpt'], ['賣點', 'point'], ['描述', 'desc'], ['成分', 'ingredients'], ['過敏原', 'allergens'], ['保存方式', 'storageTxt'], ['食品業者登錄字號', 'fda'], ['主圖', 'img1']] },
];

function A_catPath(platId, pid) {
  const p = PLAT_MAP[platId];
  const k = A_CAT_OF[pid] || 'tart';
  const leaf = p.coarse ? (k === 'cookie' || k === 'pineapple' ? '禮盒、伴手禮' : '蛋糕、甜點') : LEAF[k];
  const mid = k === 'cookie' || k === 'pineapple' ? (p.id === 'web' ? '禮盒' : null) : null;
  return [...p.cat, ...(mid ? [mid] : []), leaf].join(' › ');
}

// 各商品示範主檔補充：規格、重量、成分、登錄字號
const A_VARS = {
  yuzu: { label: '入數', opts: [{ n: '4 入', add: 0 }, { n: '8 入禮盒', add: 420 }] },
  lemon: { label: '入數', opts: [{ n: '4 入', add: 0 }, { n: '8 入', add: 400 }] },
  roll: { label: '', opts: [] },
  basque: { label: '尺寸', opts: [{ n: '6 吋', add: 0 }, { n: '8 吋', add: 320 }] },
  pound: { label: '', opts: [] },
  cookie: { label: '片數', opts: [{ n: '24 片', add: 0 }, { n: '48 片', add: 480 }] },
  pineapple: { label: '入數', opts: [{ n: '10 入', add: 0 }, { n: '20 入', add: 460 }] },
  canele: { label: '入數', opts: [{ n: '6 入', add: 0 }, { n: '12 入', add: 380 }] },
};
const A_WEIGHT = { yuzu: '', lemon: 480, roll: 520, basque: 900, pound: 450, cookie: 650, pineapple: 520, canele: 380 };
const A_INGREDIENTS = {
  yuzu: '低筋麵粉、發酵奶油、奶油乳酪、雞蛋、柚子果醬、鮮奶油、砂糖',
  lemon: '低筋麵粉、發酵奶油、檸檬汁、雞蛋、砂糖、鮮奶油、檸檬皮',
  roll: '雞蛋、鮮奶油、砂糖、低筋麵粉、新鮮草莓、牛奶、植物油',
  basque: '奶油乳酪、芋頭、雞蛋、鮮奶油、砂糖、玉米澱粉',
  pound: '發酵奶油、低筋麵粉、雞蛋、砂糖、烏龍茶粉',
  cookie: '低筋麵粉、奶油、砂糖、雞蛋、可可粉、抹茶粉、伯爵茶、蔓越莓乾、杏仁、核桃、腰果',
  pineapple: '低筋麵粉、發酵奶油、土鳳梨、麥芽糖、砂糖、雞蛋、奶粉',
  canele: '牛奶、砂糖、雞蛋、低筋麵粉、奶油、伯爵茶葉、香草',
};
// 新品草稿（柚子乳酪塔）尚未填重量與登錄字號 → 檢核會出現 ✗ 需補資料
const A_FDA_OF = (pid) => pid === 'yuzu' ? '' : DEMO_FDA;

// ── 其他業主：依業態大類調整平台分類、必填欄位與 CSV 欄位（示範） ──
const CAT_ROOT = { food: ['美食、伴手禮', '熟食・調理'], drink: ['美食、飲品', '咖啡・茶飲'], dessert: ['美食、伴手禮', '糕點・點心'], retail: ['居家生活', '生活選物'], craft: ['時尚配件', '手作・工藝'], flower: ['居家生活', '花藝・植栽'], service: ['票券・體驗', '美容・服務'], farm: ['生鮮食品', '蔬果・農產'] }[CAT];
function genPlatforms() {
  return A_PLATFORMS.map(p => {
    const q = { ...p, cat: p.id === 'web' ? [CAT_ROOT[1]] : CAT_ROOT.slice() };
    if (!FOODISH) {
      q.req = p.req.filter(k => k === 'ingredients' || (k === 'weight' && CAT !== 'service') || (k === 'shelf' && CAT === 'flower'));
      if (!q.req.includes('ingredients')) q.req.unshift('ingredients');
      q.cols = p.cols.filter(([, k]) => !['fda', 'allergens'].includes(k) && !(['shelf', 'shelfTxt'].includes(k) && CAT !== 'flower') && !(['weightG', 'weightKg'].includes(k) && CAT === 'service'))
        .map(([h, k]) => [k === 'ingredients' ? FIELD_LABEL.ingredients : k === 'storageTxt' ? '使用與保養' : k === 'temp' ? '配送方式' : (k === 'shelf' || k === 'shelfTxt') ? '欣賞天數' : h, k]);
    }
    return q;
  });
}
// 節日特價欄位：支援「特價／活動價」欄位的平台（示範假設）；其他平台以原價上架並在描述註記檔期
const PROMO_COLS = { shopee: [['特價', 'promoPrice'], ['特價期間', 'promoPeriod']], momo: [['活動價', 'promoPrice'], ['活動期間', 'promoPeriod']], ymall: [['特價', 'promoPrice'], ['特價期間', 'promoPeriod']], coupang: [['折扣價', 'promoPrice'], ['折扣期間', 'promoPeriod']], web: [['特價', 'promoPrice'], ['檔期', 'promoPeriod']] };
const withPromo = (list) => list.map(p => {
  const pc = PROMO_COLS[p.id];
  if (!pc) return { ...p, promo: false };
  const i = p.cols.findIndex(([, k]) => k === 'price');
  return { ...p, promo: true, cols: [...p.cols.slice(0, i + 1), ...pc, ...p.cols.slice(i + 1)] };
});
export const PLATFORMS = withPromo(IS_AMEI ? A_PLATFORMS : genPlatforms());
export const PLAT_MAP = Object.fromEntries(PLATFORMS.map(p => [p.id, p]));
export function catPath(platId, pid) {
  if (IS_AMEI) return A_catPath(platId, pid);
  const p = PLAT_MAP[platId];
  const leaf = String((META[pid] && META[pid].cat) || '').split(' › ').pop() || CAT_ROOT[1];
  return [...p.cat, ...(p.coarse || leaf === p.cat[p.cat.length - 1] ? [] : [leaf])].join(' › ');
}
const r10 = (n) => Math.max(10, Math.round(n / 10) * 10);
const W0 = { food: 450, drink: 320, dessert: 420, retail: 380, craft: 260, flower: 900, service: 0, farm: 1200 }[CAT];
const BASEP = IS_AMEI ? null : (PRODUCT_MAP[NEW_PRODUCT.baseId] || PRODUCTS[0]);
const matText = (pid) => (RECIPES[pid]?.lines || []).map(([m]) => MAT[m]).filter(m => m && m.cat === 'raw').map(m => m.name.replace(/（[^）]*）/g, '')).join('、');
const ingOf = (p) => CAT === 'service' ? `${p.desc || p.name}` : FOODISH ? (matText(p.id) || p.name) : `${matText(p.id) || p.name}（詳細材質以實品為準）`;
export const VARS = IS_AMEI ? A_VARS : Object.fromEntries(['yuzu', ...PRODUCTS.map(p => p.id)].map((id, i) => {
  const p = id === 'yuzu' ? BASEP : PRODUCT_MAP[id];
  const on = CAT !== 'service' && (i === 1 || i === 3);
  return [id, on ? { label: '數量', opts: [{ n: p.unit, add: 0 }, { n: '2 件組', add: r10(p.price * 0.9) }] } : { label: '', opts: [] }];
}));
export const WEIGHT = IS_AMEI ? A_WEIGHT : Object.fromEntries(['yuzu', ...PRODUCTS.map(p => p.id)].map((id, i) => [id, id === 'yuzu' || !W0 ? '' : Math.round(W0 * (0.7 + (i % 4) * 0.2) / 10) * 10]));
export const INGREDIENTS = IS_AMEI ? A_INGREDIENTS : Object.fromEntries(['yuzu', ...PRODUCTS.map(p => p.id)].map(id => [id, ingOf(id === 'yuzu' ? BASEP : PRODUCT_MAP[id])]));
export const CAT_OF = IS_AMEI ? A_CAT_OF : {};
export const FDA_OF = IS_AMEI ? A_FDA_OF : (pid) => (pid === 'yuzu' || !FOODISH ? '' : DEMO_FDA);
export const NEW_STOCK = IS_AMEI ? 30 : Math.max(6, Math.round((BASEP.stock || 20) * 0.6));
export const NEW_PRICE = IS_AMEI ? 460 : r10(BASEP.price * 1.12);
export const NEW_COST = IS_AMEI ? 175 : Math.round(BASEP.cost * 1.08);
export const SKU_PFX = IS_AMEI ? 'AM' : (KIT.slug.split('-').map(w => w[0]).join('').toUpperCase().slice(0, 3) || 'GU');
export const skuOf = (pid) => `${SKU_PFX}-${IS_AMEI ? pid.toUpperCase() : pid === 'yuzu' ? 'NEW' : String(pid).toUpperCase()}`;
// 標題中的配送字樣
export const TEMP_WORD = (storage) => IS_AMEI ? (storage === 'fridge' ? '冷藏宅配' : '常溫宅配') : ({ food: '冷藏宅配', farm: '冷藏宅配', flower: '指定日配送', service: '線上預約' }[CAT] || (storage === 'fridge' ? '冷藏宅配' : '常溫宅配'));

// 上架狀態（示範）：live 已上架、review 審核中、todo 待上傳、miss 需補資料、none 未上架
export const ST_LABEL = { live: '已上架', review: '審核中', todo: '待上傳', miss: '需補資料', none: '未上架' };
export function seedStatus() {
  const rng = mulberry32(20261006);
  const out = {};
  for (const p of PRODUCTS) {
    out[p.id] = {};
    for (const pl of PLATFORMS) {
      const r = rng();
      let st;
      if (pl.id === 'web') st = 'live';
      else if (pl.mode === 'api') st = r < 0.86 ? 'live' : 'review';
      else st = r < 0.6 ? 'live' : r < 0.7 ? 'review' : r < 0.82 ? 'todo' : r < 0.88 ? 'miss' : 'none';
      // 冷藏短效商品不上架效期要求較長的平台（示範情境）
      if (p.days <= 2 && (pl.id === 'linegift' || pl.id === 'coupang')) st = 'none';
      out[p.id][pl.id] = st;
    }
  }
  out.yuzu = Object.fromEntries(PLATFORMS.map(pl => [pl.id, 'none']));
  return out;
}

// 手動上傳通用步驟（用語保守，不寫特定選單名稱）
export const MANUAL_STEPS = [
  ['登入賣家中心', '以您的賣家或供應商帳號登入該平台後台。'],
  ['進入商品管理', '找到商品管理（或商品上架）相關功能區。'],
  ['找到大量上架／批次匯入', '功能名稱依平台而異，通常可下載平台最新的匯入範本。'],
  ['對照範本貼上資料', '打開 GreenUP 產生的 CSV，依平台範本欄位逐欄複製貼上；欄位名稱或順序不同時以平台範本為準。'],
  ['上傳檔案與圖片', '上傳填好的範本，並依平台說明上傳「圖片」資料夾中的商品圖。'],
  ['等待審核', '平台審核通過後商品才會上架；回到 GreenUP 按「上傳完成，標記為已上架」。'],
];
