// 3D 開場場景的清單（不載入 three.js，給後台網站設計工作室與銷售網頁展示面板用）：id → 名稱；各業主與各業態的預設場景
export const SCENE_NAMES = [
  ['city', '城市百貨商圈'], ['candy', '糖果王國'], ['market', '夜市老街'], ['tea', '梯田茶山'], ['town', '歐風小鎮'],
  ['forest', '森林樹屋'], ['garden', '玻璃溫室花田'], ['resort', '海濱度假飯店'], ['farm', '田園牧場'],
  ['snow', '雪山木屋'], ['zen', '禪寺庭園'], ['neon', '霓虹電子街'], ['harbor', '漁港'], ['park', '寵物公園'],
  ['moon', '月夜燈會'], ['campus', '大學書街'], ['carnival', '歡樂遊樂園'], ['desert', '沙漠綠洲'],
  ['italy', '義大利海岸小鎮'], ['coffeefarm', '咖啡莊園'], ['boba', '珍奶樂園'], ['brewery', '啤酒花園'], ['orchard', '熱帶果園'],
  ['mekong', '水上市場'], ['station', '鐵道車站'], ['cafe', '巴黎街角咖啡'], ['juancun', '眷村巷弄'], ['yokocho', '日式橫丁'],
  ['retro', '復古美式街'], ['paper', '紙藝文具世界'], ['camp', '湖畔露營地'], ['observatory', '天文台星空'], ['lavender', '薰衣草田'],
  ['castle', '童話城堡'], ['kiln', '陶瓷窯場'], ['crystal', '水晶礦洞'], ['lumber', '伐木場'], ['runway', '時裝伸展台'],
  ['dyevillage', '染布村'], ['glam', '粉紅美妝大道'], ['hollywood', '星光大道'], ['butterfly', '蝴蝶花園'], ['bubblebath', '泡泡浴樂園'],
  ['filmset', '電影片場'], ['stadium', '運動場'], ['concert', '音樂祭舞台'], ['suburb', '美式郊區住宅'], ['robot', '機器人工廠'],
  ['racetrack', '賽車場'], ['beehive', '蜂巢花谷'], ['swiftlet', '芽莊燕島'],
  ['isle', '經典小島'],
];
// 業態的預設（沒有業主專屬設定時）
export const SCENE_BY_CAT = { dessert: 'candy', food: 'market', drink: 'tea', retail: 'city', craft: 'forest', flower: 'garden', service: 'resort', farm: 'farm' };
// 每個業主的預設場景：51 個業主各一個專屬場景（另有各自的招牌地標，見 island-landmarks.js）；經典小島（isle）只供手動選擇
export const SCENE_BY_TENANT = {
  amei: 'candy', bakery: 'town', gelato: 'italy', mooncake: 'moon', chocolate: 'snow',
  coffee: 'coffeefarm', brunch: 'cafe', bubbletea: 'boba', teahouse: 'tea', craftbeer: 'brewery', juice: 'orchard',
  pho: 'mekong', bento: 'station', luwei: 'market', dumpling: 'juancun', ramen: 'yokocho', chef: 'harbor',
  select: 'city', eyewear: 'observatory', vintage: 'retro', bookstore: 'campus', stationery: 'paper', petshop: 'park', gadget: 'neon', baby: 'carnival', camping: 'camp',
  leather: 'forest', woodwork: 'lumber', soap: 'lavender', candle: 'castle', pottery: 'kiln', silver: 'crystal', tailor: 'runway', indigo: 'dyevillage',
  flower: 'garden', succulent: 'desert',
  nail: 'glam', salon: 'hollywood', carcare: 'racetrack', lash: 'butterfly', petgroom: 'bubblebath', photo: 'filmset', yoga: 'zen', fitness: 'stadium', music: 'concert', cleaning: 'suburb', bnb: 'resort', phonefix: 'robot',
  veggiebox: 'farm', honey: 'beehive', birdnest: 'swiftlet',
};
export const defaultScene = (t) => SCENE_BY_TENANT[t && t.id] || SCENE_BY_CAT[(t && t.cat) || 'retail'] || 'city';
export const sceneName = (id) => (SCENE_NAMES.find(([k]) => k === id) || [id, id])[1];
// 銷售網頁展示面板用：圖示、短名稱與英文名稱
export const SCENE_ICON = { swiftlet: '🏝️', city: '🏙️', candy: '🍭', market: '🏮', tea: '🍵', town: '🏘️', forest: '🌲', garden: '🌷', resort: '🏖️', farm: '🐄', snow: '⛄', zen: '🎋', neon: '🌃', harbor: '⚓', park: '🐕', moon: '🌕', campus: '📚', carnival: '🎡', desert: '🌵', isle: '🏝️', italy: '🍨', coffeefarm: '☕', boba: '🧋', brewery: '🍺', orchard: '🍊', mekong: '🛶', station: '🚉', cafe: '🥐', juancun: '🏮', yokocho: '🍜', retro: '🛻', paper: '✏️', camp: '🏕️', observatory: '🔭', lavender: '💜', castle: '🏰', kiln: '🏺', crystal: '💎', lumber: '🪵', runway: '👗', dyevillage: '🧵', glam: '💅', hollywood: '⭐', butterfly: '🦋', bubblebath: '🛁', filmset: '🎬', stadium: '🏟️', concert: '🎸', suburb: '🏡', robot: '🤖', racetrack: '🏎️', beehive: '🐝' };
export const SCENE_SHORT = { swiftlet: '芽莊燕島', city: '城市百貨', candy: '糖果王國', market: '夜市老街', tea: '梯田茶山', town: '歐風小鎮', forest: '森林樹屋', garden: '溫室花田', resort: '海濱飯店', farm: '田園牧場', snow: '雪山木屋', zen: '禪寺庭園', neon: '霓虹街', harbor: '漁港', park: '寵物公園', moon: '月夜燈會', campus: '大學書街', carnival: '遊樂園', desert: '沙漠綠洲', isle: '經典小島', italy: '海岸小鎮', coffeefarm: '咖啡莊園', boba: '珍奶樂園', brewery: '啤酒花園', orchard: '熱帶果園', mekong: '水上市場', station: '鐵道車站', cafe: '街角咖啡', juancun: '眷村巷弄', yokocho: '日式橫丁', retro: '復古美式', paper: '文具世界', camp: '露營地', observatory: '天文台', lavender: '薰衣草田', castle: '童話城堡', kiln: '陶瓷窯場', crystal: '水晶礦洞', lumber: '伐木場', runway: '伸展台', dyevillage: '染布村', glam: '美妝大道', hollywood: '星光大道', butterfly: '蝴蝶花園', bubblebath: '泡泡樂園', filmset: '電影片場', stadium: '運動場', concert: '音樂祭', suburb: '郊區住宅', robot: '機器人工廠', racetrack: '賽車場', beehive: '蜂巢花谷' };
export const SCENE_EN = { swiftlet: 'Nha Trang nest isles', city: 'City mall', candy: 'Candy kingdom', market: 'Night market', tea: 'Tea terraces', town: 'Old town', forest: 'Treehouse forest', garden: 'Glasshouse garden', resort: 'Seaside resort', farm: 'Ranch', snow: 'Alpine lodge', zen: 'Temple garden', neon: 'Neon street', harbor: 'Fishing port', park: 'Pet park', moon: 'Lantern night', campus: 'Campus', carnival: 'Carnival', desert: 'Desert oasis', isle: 'Classic island', italy: 'Amalfi coast', coffeefarm: 'Coffee estate', boba: 'Boba land', brewery: 'Beer garden', orchard: 'Tropical orchard', mekong: 'Floating market', station: 'Railway station', cafe: 'Paris café street', juancun: 'Old village alleys', yokocho: 'Yokocho alley', retro: 'Retro diner street', paper: 'Paper world', camp: 'Lakeside camp', observatory: 'Observatory', lavender: 'Lavender fields', castle: 'Fairy-tale castle', kiln: 'Pottery kilns', crystal: 'Crystal cave', lumber: 'Lumber mill', runway: 'Fashion runway', dyevillage: 'Dye village', glam: 'Glam boulevard', hollywood: 'Walk of fame', butterfly: 'Butterfly garden', bubblebath: 'Bubble bath land', filmset: 'Film set', stadium: 'Stadium', concert: 'Music festival', suburb: 'Suburb', robot: 'Robot factory', racetrack: 'Racetrack', beehive: 'Honeycomb valley' };
