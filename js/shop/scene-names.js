// 3D 開場場景的清單（不載入 three.js，給後台網站設計工作室用）：id → 名稱；各業態預設場景
export const SCENE_NAMES = [
  ['city', '城市百貨商圈'], ['candy', '糖果甜點島'], ['market', '夜市小吃島'], ['tea', '茶山咖啡島'], ['town', '小鎮市集島'],
  ['forest', '森林工坊島'], ['garden', '花田溫室島'], ['resort', '海灘度假島'], ['farm', '田園牧場島'],
];
export const SCENE_BY_CAT = { dessert: 'candy', food: 'market', drink: 'tea', retail: 'city', craft: 'forest', flower: 'garden', service: 'resort', farm: 'farm' };
export const sceneName = (id) => (SCENE_NAMES.find(([k]) => k === id) || [id, id])[1];
// 銷售網頁展示面板用：圖示與英文名稱
export const SCENE_ICON = { city: '🏙️', candy: '🍭', market: '🏮', tea: '🍵', town: '🏘️', forest: '🌲', garden: '🌷', resort: '🏖️', farm: '🐄' };
export const SCENE_SHORT = { city: '城市百貨', candy: '糖果島', market: '夜市', tea: '茶山咖啡', town: '小鎮市集', forest: '森林工坊', garden: '花田溫室', resort: '海灘度假', farm: '田園牧場' };
export const SCENE_EN = { city: 'City mall', candy: 'Candy isle', market: 'Night market', tea: 'Tea hills', town: 'Market town', forest: 'Forest atelier', garden: 'Flower garden', resort: 'Beach resort', farm: 'Farm' };
