// 3D 開場場景的清單（不載入 three.js，給後台網站設計工作室與銷售網頁展示面板用）：id → 名稱；各業主與各業態的預設場景
export const SCENE_NAMES = [
  ['city', '城市百貨商圈'], ['candy', '糖果王國'], ['market', '夜市老街'], ['tea', '梯田茶山'], ['town', '歐風小鎮'],
  ['forest', '森林樹屋'], ['garden', '玻璃溫室花田'], ['resort', '海濱度假飯店'], ['farm', '田園牧場'],
  ['snow', '雪山木屋'], ['zen', '禪寺庭園'], ['neon', '霓虹電子街'], ['harbor', '漁港'], ['park', '寵物公園'],
  ['moon', '月夜燈會'], ['campus', '大學書街'], ['carnival', '歡樂遊樂園'], ['desert', '沙漠綠洲'], ['isle', '經典小島'],
];
// 業態的預設（沒有業主專屬設定時）
export const SCENE_BY_CAT = { dessert: 'candy', food: 'market', drink: 'tea', retail: 'city', craft: 'forest', flower: 'garden', service: 'resort', farm: 'farm' };
// 每個業主的預設場景（同一個場景的業主還有各自的招牌地標，見 island-landmarks.js）；經典小島（isle）只供手動選擇
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
export const SCENE_ICON = { city: '🏙️', candy: '🍭', market: '🏮', tea: '🍵', town: '🏘️', forest: '🌲', garden: '🌷', resort: '🏖️', farm: '🐄', snow: '⛄', zen: '🎋', neon: '🌃', harbor: '⚓', park: '🐕', moon: '🌕', campus: '📚', carnival: '🎡', desert: '🌵', isle: '🏝️' };
export const SCENE_SHORT = { city: '城市百貨', candy: '糖果王國', market: '夜市老街', tea: '梯田茶山', town: '歐風小鎮', forest: '森林樹屋', garden: '溫室花田', resort: '海濱飯店', farm: '田園牧場', snow: '雪山木屋', zen: '禪寺庭園', neon: '霓虹街', harbor: '漁港', park: '寵物公園', moon: '月夜燈會', campus: '大學書街', carnival: '遊樂園', desert: '沙漠綠洲', isle: '經典小島' };
export const SCENE_EN = { city: 'City mall', candy: 'Candy kingdom', market: 'Night market', tea: 'Tea terraces', town: 'Old town', forest: 'Treehouse forest', garden: 'Glasshouse garden', resort: 'Seaside resort', farm: 'Ranch', snow: 'Alpine lodge', zen: 'Temple garden', neon: 'Neon street', harbor: 'Fishing port', park: 'Pet park', moon: 'Lantern night', campus: 'Campus', carnival: 'Carnival', desert: 'Desert oasis', isle: 'Classic island' };
