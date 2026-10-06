// 50 種業態示範業主的登錄表：每組檔案匯出 BIZ（業主資料＋銷售網頁設計＋後台設定）與 ART（新增的商品插圖種類）
// BIZ 每筆：{ merchant, theme, profile }
//   merchant：與 merchants.js 相同欄位（id, name, en, type, cat, typeName, owner, theme, tagline, products[6]）
//   theme：與 shop/themes.js THEMES 相同欄位（id, kind:'base', name, deco, vars, hero）＋ style（版面設計軸）
//   profile：與 tenant.js PROFILES 相同欄位（avatar, volume, aiName, region, staff, suppliers, fixed, rd, channels, langs）
import * as g1 from './g1.js';
import * as g2 from './g2.js';
import * as g3 from './g3.js';
import * as g4 from './g4.js';

const GROUPS = [g1, g2, g3, g4];
export const BIZ = GROUPS.flatMap(g => g.BIZ || []);
export const BIZ_ART = Object.assign({}, ...GROUPS.map(g => g.ART || {}));
// 業態大類：後台各模組依此挑選情境文案
export const CATS = {
  food: '餐飲小吃', drink: '飲品茶咖啡', dessert: '烘焙甜點', retail: '零售選物',
  craft: '手作工藝', flower: '花藝植栽', service: '預約服務', farm: '農產生鮮',
};
