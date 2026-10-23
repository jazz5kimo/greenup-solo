// 3D 開場場景的清單（不載入 three.js，給後台網站設計工作室與銷售網頁展示面板用）：id → 名稱；各業主與各業態的預設場景
export const SCENE_NAMES = [
  ['city', '城市百貨商圈'], ['candy', '糖果甜點島'], ['market', '夜市小吃島'], ['tea', '茶山咖啡島'], ['town', '小鎮市集島'],
  ['forest', '森林工坊島'], ['garden', '花田溫室島'], ['resort', '海灘度假島'], ['farm', '田園牧場島'],
  ['snow', '雪國木屋'], ['zen', '禪風庭園'], ['neon', '霓虹電子街'], ['harbor', '港口漁村'], ['park', '寵物公園'],
  ['moon', '月夜燈會'], ['campus', '文青書街'], ['carnival', '歡樂遊樂園'], ['desert', '沙漠綠洲'],
];
// 業態的預設（沒有業主專屬設定時）
export const SCENE_BY_CAT = { dessert: 'candy', food: 'market', drink: 'tea', retail: 'city', craft: 'forest', flower: 'garden', service: 'resort', farm: 'farm' };
// 每個業主的預設場景（同一個場景的業主還有各自的招牌地標，見 island-landmarks.js）
export const SCENE_BY_TENANT = {
  amei: 'candy', bakery: 'town', gelato: 'carnival', mooncake: 'moon', chocolate: 'snow',
  coffee: 'tea', brunch: 'tea', bubbletea: 'carnival', teahouse: 'zen', craftbeer: 'harbor', juice: 'resort',
  pho: 'market', bento: 'market', luwei: 'market', dumpling: 'harbor', ramen: 'neon', chef: 'harbor',
  select: 'city', eyewear: 'city', vintage: 'desert', bookstore: 'campus', stationery: 'campus', petshop: 'park', gadget: 'neon', baby: 'carnival', camping: 'snow',
  leather: 'forest', woodwork: 'forest', soap: 'garden', candle: 'moon', pottery: 'zen', silver: 'moon', tailor: 'town', indigo: 'zen',
  flower: 'garden', succulent: 'desert',
  nail: 'resort', salon: 'city', carcare: 'city', lash: 'candy', petgroom: 'park', photo: 'campus', yoga: 'zen', fitness: 'park', music: 'campus', cleaning: 'town', bnb: 'harbor', phonefix: 'neon',
  veggiebox: 'farm', honey: 'farm',
};
export const defaultScene = (t) => SCENE_BY_TENANT[t && t.id] || SCENE_BY_CAT[(t && t.cat) || 'retail'] || 'city';
export const sceneName = (id) => (SCENE_NAMES.find(([k]) => k === id) || [id, id])[1];
// 銷售網頁展示面板用：圖示、短名稱與英文名稱
export const SCENE_ICON = { city: '🏙️', candy: '🍭', market: '🏮', tea: '🍵', town: '🏘️', forest: '🌲', garden: '🌷', resort: '🏖️', farm: '🐄', snow: '⛄', zen: '🎋', neon: '🌃', harbor: '⚓', park: '🐕', moon: '🌕', campus: '📚', carnival: '🎡', desert: '🌵' };
export const SCENE_SHORT = { city: '城市百貨', candy: '糖果島', market: '夜市', tea: '茶山咖啡', town: '小鎮市集', forest: '森林工坊', garden: '花田溫室', resort: '海灘度假', farm: '田園牧場', snow: '雪國木屋', zen: '禪風庭園', neon: '霓虹街', harbor: '港口漁村', park: '寵物公園', moon: '月夜燈會', campus: '文青書街', carnival: '遊樂園', desert: '沙漠綠洲' };
export const SCENE_EN = { city: 'City mall', candy: 'Candy isle', market: 'Night market', tea: 'Tea hills', town: 'Market town', forest: 'Forest atelier', garden: 'Flower garden', resort: 'Beach resort', farm: 'Farm', snow: 'Snow lodge', zen: 'Zen garden', neon: 'Neon street', harbor: 'Harbor', park: 'Pet park', moon: 'Moon festival', campus: 'Book street', carnival: 'Carnival', desert: 'Desert oasis' };
