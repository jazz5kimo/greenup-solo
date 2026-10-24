// 銷售網頁 3D 開場的共用工具：經典小島的造景（島形與擺設依業主代號變化）、空地規劃、樹木與小物件、店舖屋頂、帆船。
// 這裡也負責島上的空地規劃（避開步道、店舖、展台、人物走的路線與鏡頭視線），人物（island-people.js）共用同一份規劃。
import * as THREE from 'three';
import { SCENE_BY_CAT, SCENE_BY_TENANT } from './scene-names.js';

const TAU = Math.PI * 2;
const C = (c) => new THREE.Color(c);
const hex = (c) => '#' + C(c).getHexString();
const angDist = (a, b) => Math.abs(((a - b) % TAU + TAU * 1.5) % TAU - Math.PI);

// ---------- 業主代號 → 亂數種子、島的形狀 ----------
export function seedOf(id) {
  let h = 2166136261;
  for (const ch of String(id || '')) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
  return (h >>> 0) % 2147483646 + 1;
}
export function rng(seed) { let a = seed; return () => (a = (a * 16807) % 2147483647) / 2147483647; }
// 海岸線：三組正弦起伏（頻率固定為整數，海岸才會接起來）；振幅上限讓草地一定蓋得住環島步道
export function shapeOf(seed) {
  const r = rng(seed * 7 + 3);
  return {
    fr: [2 + Math.floor(r() * 2), 4 + Math.floor(r() * 2), 6 + Math.floor(r() * 2)],
    amp: [0.04 + r() * 0.04, 0.02 + r() * 0.03, 0.01 + r() * 0.02],
    ph: [r() * TAU, r() * TAU, r() * TAU],
  };
}

// ---------- 業態 → 風景 ----------
// 經典小島（島形依業主代號變化）與城市百貨；其他主題世界由 island-worlds-a.js／-b.js 以 registerScenes 加入
// sand／grass：沙灘與草地顏色；roof：店舖屋頂（pyramid 四角、gable 人字、flat 平頂、barn 穀倉）；hat：路人常見的帽子
export const SCENES = {
  isle: { id: 'isle', name: '經典小島', sand: '#f2deb6', grass: '#84c56c', roof: 'gable', build: town },
  city: { id: 'city', kind: 'city', name: '城市百貨商圈', sand: '#d9d4c8', grass: '#cfc8b8', roof: 'flat' },
};
// 加入主題世界（island-worlds-a.js／-b.js）；同代號的會取代
export function registerScenes(more) { for (const m of Object.values(more)) { for (const [key, v] of Object.entries(SCENES)) if (v.id === m.id) delete SCENES[key]; SCENES[m.id] = m; } }
export const sceneList = () => Object.values(SCENES).filter((v, i, a) => a.indexOf(v) === i);
// 預設場景：每個業主專屬（scene-names.js 的 SCENE_BY_TENANT），沒有時依業態；override 可指定場景代號（candy、market…、city）
export function sceneFor(t, override) {
  const byId = (id) => sceneList().find(s => s.id === id);
  if (override && override !== 'auto' && byId(override)) return byId(override);
  const cat = (t && t.cat) || 'retail';
  return byId(SCENE_BY_TENANT[t && t.id]) || byId(SCENE_BY_CAT[cat]) || SCENES.city;
}

// ---------- 空地規劃 ----------
// 島上已經有的東西：環島步道（半徑 RING）、步道上的展台（stations 角度）、中央廣場、往前的步道、後方店舖、碼頭；
// 人物的固定路線（環島兩條人行線、碼頭→店舖、廣場、海灘）也要留空。
// venue（城市百貨用）：{ box 百貨公司範圍, keepOut 其他禁區, inBounds(x,z,rad) 可擺放範圍, walk:[z0,z1] 前步道, routes, door, keeper, ground(x,z) }
export function makeLayout({ shore, RING, SHOP_Z, stations, pierTh = 2.5, beach, venue = null }) {
  const occ = [];
  const sP = shore(pierTh);
  const dir = [Math.sin(pierTh), Math.cos(pierTh)];
  const at = (r) => [dir[0] * r, dir[1] * r];
  const pier = venue ? null : { th: pierTh, r: sP + 1.0, len: 3.2, x: dir[0] * (sP + 1.0), z: dir[1] * (sP + 1.0) };
  // 環島人行線：平常離步道中心 0.28，經過展台時繞到 0.98 外（內）側
  const W = 0.34;
  const bell = (th) => { let b = 0; for (const a of stations) { const d = angDist(th, a); if (d < W) b = Math.max(b, 0.5 + 0.5 * Math.cos(Math.PI * d / W)); } return b; };
  const laneOff = (th) => 0.28 + 0.7 * bell(th);
  const lanePts = [];
  for (let i = 0; i < 240; i++) { const th = i / 240 * TAU, o = laneOff(th); for (const s of [-1, 1]) { const r = RING + s * o; lanePts.push([Math.sin(th) * r, Math.cos(th) * r]); } }
  // 人物固定路線
  const visitor = [at(sP + 1.0 + 0.75), at(sP - 0.35), at(RING), [2.3, SHOP_Z + 1.75], [0.35, SHOP_Z + 1.7], [0.06, SHOP_Z + 1.42]];
  const front = [[-0.32, 3.3], [-0.32, 2.55]];
  for (const a of [0.25, 0.65, 1.05, 1.45, 1.85, 2.25, 2.62]) front.push([-1.62 * Math.sin(a), 0.9 + 1.62 * Math.cos(a)]);
  front.push([-0.35, SHOP_Z + 2.05]);
  const beachLanes = venue ? [] : beach || [[-2.3, -0.9], [0.6, 2.2]];
  const R2 = venue && venue.routes ? venue.routes : { visitor, front };
  const routes = Object.values(R2).filter(Boolean);
  const segs = [];
  for (const r of routes) for (let i = 0; i < r.length - 1; i++) segs.push([...r[i], ...r[i + 1]]);
  const segDist = (x, z, [ax, az, bx, bz]) => { const dx = bx - ax, dz = bz - az; const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(x - ax - dx * t, z - az - dz * t); };
  // 展台鏡頭看商品的視線高度（站在步道外側往內看）：比這高的東西不能擋在中間
  const lineH = (r) => Math.min(1.55 + (r - RING) / 5.8 * 1.35, 1.3 + (r - RING) / 7.6 * 2.3);

  let why = '';
  const no = (w) => { why = w; return false; };
  function free(x, z, rad = 0.3, h = 0) {
    const r = Math.hypot(x, z), th = Math.atan2(x, z), s = shore(th);
    const edge = s * 0.84;
    if (venue) { if (!venue.inBounds(x, z, rad)) return no('bounds'); }
    else {
      if (r - rad < edge + 0.4 && r + rad > edge - 0.05) return no('edge'); // 不跨在草地邊坡上
      if (r + rad > s - 0.1) return no('shore');
    }
    if (Math.abs(r - RING) < 0.47 + rad) return no('path');
    if (Math.abs(r - RING) < 1.3 + rad) for (const [px, pz] of lanePts) if (Math.abs(px - x) < rad + 0.3 && Math.abs(pz - z) < rad + 0.3 && Math.hypot(px - x, pz - z) < rad + 0.24) return no('lane');
    for (const a of stations) {
      const sx = Math.sin(a) * RING, sz = Math.cos(a) * RING;
      if (Math.hypot(x - sx, z - sz) < 1.05 + rad) return no('station');
      if (h > 0 && r > RING && angDist(a, th) < 0.45 && h > Math.min(lineH(r) - 0.3, 1.1)) return no('sight');
    }
    const bx = venue ? venue.box : { x0: -2.0, x1: 2.0, z0: SHOP_Z - 1.6, z1: SHOP_Z + 1.65 };
    if (x > bx.x0 - rad && x < bx.x1 + rad && z > bx.z0 - rad && z < bx.z1 + rad) return no('shop');
    if (venue) for (const k of venue.keepOut) if (x > k.x0 - rad && x < k.x1 + rad && z > k.z0 - rad && z < k.z1 + rad) return no('keepout');
    const [w0, w1] = venue ? venue.walk : [SHOP_Z + 1.5, RING + 0.6];
    if (Math.abs(x) < 0.85 + rad && z > w0 && z < w1) return no('walk');
    if (Math.hypot(x, z - 0.9) < 1.95 + rad) return no('plaza');
    for (const sg of segs) if (segDist(x, z, sg) < 0.4 + rad) return no('route');
    if (r > edge) { const bw = s * 0.955; if (Math.abs(r - bw) < 0.28 + rad && beachLanes.some(([a, b]) => th > a - 0.06 && th < b + 0.06)) return no('beach'); }
    if (pier && angDist(th, pierTh) < 0.25 && r > RING) return no('pier');
    for (const o of occ) if (Math.hypot(o.x - x, o.z - z) < o.r + rad + 0.06) return no('occ');
    return true;
  }
  const claim = (x, z, r) => { occ.push({ x, z, r }); };
  // 隨機找一塊空地：zone = inner（步道內）、outer（步道外的草地）、beach（沙灘）、land（草地任一處）
  function spot(rnd, { zone = 'land', rad = 0.3, h = 0, tries = 80 } = {}) {
    for (let i = 0; i < tries; i++) {
      const th = rnd() * TAU, s = shore(th);
      const z0 = zone === 'land' ? (rnd() < 0.55 ? 'inner' : 'outer') : zone;
      const [a, b] = z0 === 'inner' ? [0.6, RING - 0.5] : z0 === 'outer' ? [RING + 0.5, s * 0.84] : [s * 0.84 + 0.4, s - 0.1];
      const r = a + rnd() * (b - a);
      const x = Math.sin(th) * r, z = Math.cos(th) * r;
      if (free(x, z, rad, h)) { claim(x, z, rad); return { x, z, th, r }; }
    }
    return null;
  }
  // 大型造景：掃描整座島找放得下的空地，隨機挑一處（away：離某處越遠越好，讓兩樣大東西分在兩側）
  function place(rnd, rad, h = 0, { zone = 'inner', away = null } = {}) {
    const c = [];
    const ext = venue && zone !== 'inner' ? 10.5 : RING;
    for (let x = -ext; x <= ext + 1e-6; x += 0.3) for (let z = -ext; z <= ext + 1e-6; z += 0.3) {
      if (zone === 'inner' && Math.hypot(x, z) > RING) continue;
      if (free(x, z, rad, h)) c.push([x, z, away ? Math.hypot(x - away.x, z - away.z) : 0]);
    }
    if (zone === 'any') for (let i = 0; i < 400; i++) { const th = i / 400 * TAU * 7, s = shore(th), r = RING + 0.5 + (i % 7) / 7 * (s * 0.84 - RING - 0.5); const x = Math.sin(th) * r, z = Math.cos(th) * r; if (free(x, z, rad, h)) c.push([x, z, away ? Math.hypot(x - away.x, z - away.z) : 0]); }
    if (!c.length) return null;
    let pool = c;
    if (away) { c.sort((a, b) => b[2] - a[2]); pool = c.slice(0, Math.max(1, Math.ceil(c.length / 3))); }
    const [x, z] = pool[Math.floor(rnd() * pool.length) % pool.length];
    claim(x, z, rad); return { x, z };
  }
  function ground(x, z) {
    if (venue) return venue.ground(x, z);
    const r = Math.hypot(x, z), s = shore(Math.atan2(x, z)), e = s * 0.84;
    let y = r <= e ? 0.13 : r <= e + 0.3 ? 0.13 - (r - e) / 0.3 * 0.38 : r <= s ? -0.25 : r <= s + 0.25 ? -0.25 - (r - s) : -0.55;
    const lz = x * dir[0] + z * dir[1] - pier.r, lx = x * dir[1] - z * dir[0];
    if (Math.abs(lx) < 0.5 && lz > -pier.len / 2 && lz < pier.len / 2) y = Math.max(y, 0.01);
    return y;
  }
  return { free, why: () => why, claim, spot, place, ground, pier, routes: R2, beachLanes, laneOff, stations, RING, SHOP_Z, shore, venue, door: venue ? venue.door : [0.06, SHOP_Z + 1.42], keeper: venue ? venue.keeper : [-0.78, SHOP_Z + 1.58] };
}

// ---------- 小工具 ----------
export function kit(world, anim, rnd, night, mobile) {
  const mats = new Map(), geos = new Map();
  const k = {
    rnd, night, mobile, anim,
    m(color, o = {}) { const key = hex(color) + JSON.stringify(o); if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color: C(color), roughness: 0.8, ...o })); return mats.get(key); },
    // 會發光的燈：晚上亮、白天只是淡色
    glow(color, power = 1.6) { return k.m(color, night ? { emissive: C(color), emissiveIntensity: power, roughness: 0.4 } : { roughness: 0.4 }); },
    g(key, make) { if (!geos.has(key)) geos.set(key, make()); return geos.get(key); },
    tex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; },
    add(o, x = 0, y = 0, z = 0) { o.position.set(x, y, z); world.add(o); return o; },
    pick(a) { return a[Math.floor(rnd() * a.length) % a.length]; },
  };
  k.mesh = (geo, mat, x = 0, y = 0, z = 0, cast = true) => { const n = new THREE.Mesh(geo, mat); n.position.set(x, y, z); n.castShadow = cast; n.receiveShadow = true; return n; };
  k.stripes = (a, b, n = 8, vertical = true) => k.tex(128, 128, (g, w, h) => { for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? b : a; if (vertical) g.fillRect(i * w / n, 0, w / n + 1, h); else g.fillRect(0, i * h / n, w, h / n + 1); } });
  return k;
}
export const faceTo = (o, tx = 0, tz = 0.9) => { o.rotation.y = Math.atan2(tx - o.position.x, tz - o.position.z); return o; };
// 讓上升的煙／蒸氣一顆顆變大再消失（共用材質，只改大小）
export function puffs(k, parent, x, y, z, { n = 4, color = 0xffffff, size = 0.16, rise = 0.9, speed = 0.35, opacity = 0.7 } = {}) {
  const mat = new THREE.MeshStandardMaterial({ color, transparent: true, opacity, roughness: 1, depthWrite: false });
  const geo = k.g('puff', () => new THREE.IcosahedronGeometry(1, 1));
  const list = [];
  for (let i = 0; i < n; i++) { const p = new THREE.Mesh(geo, mat); parent.add(p); list.push(p); }
  k.anim.push((t) => list.forEach((p, i) => { const u = (t * speed + i / n) % 1; p.position.set(x + Math.sin(u * 5 + i) * 0.08, y + u * rise, z); p.scale.setScalar(size * Math.sin(u * Math.PI) * (0.6 + u)); }));
}

// ---------- 樹與植物 ----------
export function tree(k, x, z, type = 'round', s = 1, leaf) {
  const g = new THREE.Group(); g.position.set(x, 0.13, z);
  const night = k.night;
  const greens = night ? ['#2e6b3f', '#3d7a3a', '#24573a'] : ['#4fae5b', '#6cc163', '#3d9b57'];
  const lc = leaf || k.pick(greens);
  const trunk = k.m('#8a5a3a');
  if (type === 'palm') {
    let px = 0, py = 0; const lean = (k.rnd() - 0.5) * 0.5;
    for (let i = 0; i < 5; i++) { const seg = k.mesh(k.g('palmseg', () => new THREE.CylinderGeometry(0.07, 0.09, 0.42, 6)), k.m('#a7835a')); seg.position.set(px, py + 0.21, 0); seg.rotation.z = -lean * (0.4 + i * 0.15); g.add(seg); px += Math.sin(lean * (0.4 + i * 0.15)) * 0.4; py += 0.4; }
    const fr = k.m(night ? '#2f6b3a' : '#3fae4f', { side: THREE.DoubleSide, flatShading: true });
    for (let i = 0; i < 7; i++) { const f = k.mesh(k.g('frond', () => { const geo = new THREE.ConeGeometry(0.16, 1.1, 4, 1); geo.translate(0, 0.55, 0); geo.scale(1, 1, 0.25); return geo; }), fr, px, py, 0); f.rotation.set(0, i / 7 * TAU, 1.95); f.rotation.order = 'YXZ'; f.rotation.x = 0; g.add(f); }
    for (let i = 0; i < 3; i++) g.add(k.mesh(k.g('coco', () => new THREE.SphereGeometry(0.07, 8, 6)), k.m('#6b4a2a'), px + Math.cos(i * 2.1) * 0.1, py - 0.08, Math.sin(i * 2.1) * 0.1));
  } else if (type === 'lolli') {
    g.add(k.mesh(k.g('lstick', () => new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8)), k.m('#fffaf5'), 0, 0.6, 0));
    const c = leaf || k.pick(['#ff8fb1', '#8fd3ff', '#ffd36e', '#b99bff', '#7fe0b0']);
    const swirl = k.tex(128, 128, (cx, w) => { cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, w, w); cx.strokeStyle = c; cx.lineWidth = 11; cx.beginPath(); for (let a = 0; a < 26; a += 0.1) { const r = a * 2.3; cx.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); } cx.stroke(); });
    const disc = k.mesh(k.g('ldisc', () => new THREE.CylinderGeometry(0.42, 0.42, 0.12, 28)), [k.m(c), new THREE.MeshStandardMaterial({ map: swirl, roughness: 0.35 }), new THREE.MeshStandardMaterial({ map: swirl, roughness: 0.35 })], 0, 1.45, 0);
    disc.rotation.x = Math.PI / 2; g.add(disc);
  } else if (type === 'pine') {
    g.add(k.mesh(k.g('trunk', () => new THREE.CylinderGeometry(0.08, 0.12, 0.7, 6)), trunk, 0, 0.35, 0));
    const m = k.m(lc, { flatShading: true });
    [[0.62, 0.9, 0.85], [0.5, 0.8, 1.3], [0.36, 0.7, 1.72]].forEach(([r, h, y]) => g.add(k.mesh(k.g('pine' + r, () => new THREE.ConeGeometry(r, h, 7)), m, 0, y, 0)));
  } else if (type === 'blossom') {
    g.add(k.mesh(k.g('trunk', () => new THREE.CylinderGeometry(0.08, 0.12, 0.7, 6)), trunk, 0, 0.35, 0));
    const m = k.m(leaf || (night ? '#b9739a' : '#f7b6cf'), { flatShading: true });
    [[0, 1.1, 0, 0.55], [0.32, 0.95, 0.1, 0.38], [-0.28, 1.0, -0.12, 0.4]].forEach(([a, b, c, r]) => g.add(k.mesh(k.g('ico' + r, () => new THREE.IcosahedronGeometry(r, 0)), m, a, b, c)));
  } else {
    g.add(k.mesh(k.g('trunk', () => new THREE.CylinderGeometry(0.08, 0.12, 0.7, 6)), trunk, 0, 0.35, 0));
    g.add(k.mesh(k.g('ico0.6', () => new THREE.IcosahedronGeometry(0.6, 0)), k.m(lc, { flatShading: true }), 0, 1.05, 0));
  }
  g.scale.setScalar(s); g.rotation.y = k.rnd() * TAU;
  const ph = k.rnd() * 6; k.anim.push((t) => { g.rotation.z = Math.sin(t * 0.8 + ph) * 0.025; });
  return g;
}
// 依高度找地方種樹（樹高約 1.4～2.1，鏡頭視線內不種）
export function plantTrees(k, L, world, n, types, { zone = 'land', leaf } = {}) {
  let c = 0;
  for (let i = 0; i < n * 3 && c < n; i++) {
    const type = k.pick(types), s = 0.75 + k.rnd() * 0.5, h = (type === 'palm' ? 2.0 : type === 'pine' ? 2.1 : 1.6) * s;
    const p = L.spot(k.rnd, { zone, rad: 0.42 * s, h });
    if (!p) continue;
    world.add(tree(k, p.x, p.z, type, s, leaf)); c++;
  }
}
export function bushes(k, L, world, n, colors) {
  const geo = k.g('bush', () => new THREE.IcosahedronGeometry(1, 0));
  for (let i = 0; i < n; i++) {
    const p = L.spot(k.rnd, { zone: 'land', rad: 0.22 }); if (!p) continue;
    const s = 0.16 + k.rnd() * 0.12;
    const b = k.mesh(geo, k.m(k.pick(colors), { roughness: 0.6, flatShading: true }), p.x, 0.13 + s * 0.7, p.z); b.scale.setScalar(s); world.add(b);
  }
}
// 一排排的花（同一排用 InstancedMesh，省效能）
export function flowerRow(k, parent, x, z, len, rotY, colors, { n = 9, stem = 0.18, size = 0.09 } = {}) {
  const row = new THREE.Group(); row.position.set(x, 0.13, z); row.rotation.y = rotY;
  row.add(k.mesh(k.g('soil' + len, () => new THREE.BoxGeometry(0.28, 0.06, len)), k.m(k.night ? '#4a3a2a' : '#7a5a3c'), 0, 0.03, 0, false));
  const leafG = k.g('fleaf', () => new THREE.IcosahedronGeometry(1, 0));
  const leaves = new THREE.InstancedMesh(leafG, k.m(k.night ? '#2f6b3a' : '#4fa452', { flatShading: true }), n);
  const blooms = new THREE.InstancedMesh(k.g('bloom', () => new THREE.IcosahedronGeometry(1, 1)), new THREE.MeshStandardMaterial({ roughness: 0.5 }), n);
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const zz = -len / 2 + (i + 0.5) * len / n;
    mtx.compose(new THREE.Vector3(0, 0.1, zz), q, sc.set(0.11, 0.09, 0.11)); leaves.setMatrixAt(i, mtx);
    mtx.compose(new THREE.Vector3((k.rnd() - 0.5) * 0.08, 0.1 + stem, zz), q, sc.setScalar(size * (0.8 + k.rnd() * 0.4))); blooms.setMatrixAt(i, mtx);
    blooms.setColorAt(i, C(colors[i % colors.length]));
  }
  leaves.castShadow = blooms.castShadow = true;
  row.add(leaves, blooms); parent.add(row);
  return row;
}
export function lamp(k, x, z, color = '#ffd88a') {
  const g = new THREE.Group(); g.position.set(x, 0.13, z);
  g.add(k.mesh(k.g('lpost', () => new THREE.CylinderGeometry(0.035, 0.05, 1.35, 6)), k.m('#2f3a40', { roughness: 0.5 }), 0, 0.68, 0));
  g.add(k.mesh(k.g('lhead', () => new THREE.SphereGeometry(0.12, 12, 8)), k.glow(color, 2.2), 0, 1.42, 0));
  g.add(k.mesh(k.g('lcap', () => new THREE.ConeGeometry(0.14, 0.1, 8)), k.m('#2f3a40'), 0, 1.55, 0));
  return g;
}
export function bench(k, x, z) {
  const g = new THREE.Group(); g.position.set(x, 0.13, z);
  const wood = k.m('#a8754a'), iron = k.m('#3a3f44');
  g.add(k.mesh(k.g('bseat', () => new THREE.BoxGeometry(0.9, 0.06, 0.32)), wood, 0, 0.32, 0));
  g.add(k.mesh(k.g('bback', () => new THREE.BoxGeometry(0.9, 0.24, 0.05)), wood, 0, 0.55, -0.15));
  for (const dx of [-0.38, 0.38]) g.add(k.mesh(k.g('bleg', () => new THREE.BoxGeometry(0.05, 0.32, 0.3)), iron, dx, 0.16, 0));
  return g;
}
export function umbrella(k, x, z, color, { h = 1.55, r = 0.75 } = {}) {
  const g = new THREE.Group(); g.position.set(x, 0.13, z);
  g.add(k.mesh(k.g('upole' + h, () => new THREE.CylinderGeometry(0.025, 0.025, h, 6)), k.m('#e8e2d8'), 0, h / 2, 0));
  const tex = k.stripes(hex(color), '#ffffff', 8);
  g.add(k.mesh(k.g('ucone' + r, () => new THREE.ConeGeometry(r, 0.35, 8, 1, true)), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.7 }), 0, h - 0.05, 0));
  return g;
}
export function table(k, x, z, chairs = 2) {
  const g = new THREE.Group(); g.position.set(x, 0.13, z);
  g.add(k.mesh(k.g('ttop', () => new THREE.CylinderGeometry(0.3, 0.3, 0.04, 16)), k.m('#fbf7f0'), 0, 0.42, 0));
  g.add(k.mesh(k.g('tleg', () => new THREE.CylinderGeometry(0.03, 0.05, 0.42, 6)), k.m('#555b60'), 0, 0.21, 0));
  const seats = [];
  for (let i = 0; i < chairs; i++) { const a = i / chairs * TAU + 0.4; const cx = Math.sin(a) * 0.55, cz = Math.cos(a) * 0.55; const s = k.mesh(k.g('stool', () => new THREE.CylinderGeometry(0.13, 0.11, 0.3, 10)), k.m('#c98f5a'), cx, 0.15, cz); g.add(s); seats.push({ dx: cx, dz: cz, a: a + Math.PI }); }
  g.userData.seats = seats;
  return g;
}

// ---------- 店舖屋頂 ----------
// 店舖主體寬 3.4、深 2.3、高 2.1；回傳放在 y=2.1 的屋頂
export function shopRoof(style, roofC, wallC, extra = {}) {
  const g = new THREE.Group(); g.position.y = 2.1;
  const roofM = new THREE.MeshStandardMaterial({ color: roofC, roughness: 0.6, flatShading: true });
  const wallM = new THREE.MeshStandardMaterial({ color: wallC, roughness: 0.7 });
  const prism = (pts, len) => {
    const s = new THREE.Shape(); pts.forEach(([u, v], i) => (i ? s.lineTo(u, v) : s.moveTo(u, v)));
    const geo = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false }); geo.translate(0, 0, -len / 2); geo.rotateY(Math.PI / 2);
    const m = new THREE.Mesh(geo, [wallM, roofM]); m.castShadow = true; return m;
  };
  if (style === 'gable') {
    g.add(prism([[-1.45, 0], [1.45, 0], [0, 1.15]], 3.8));
  } else if (style === 'barn') {
    g.add(prism([[-1.45, 0], [-1.32, 0.62], [0, 1.22], [1.32, 0.62], [1.45, 0]], 3.75));
    const loft = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.05), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 })); loft.position.set(0, 0.45, 1.1); g.add(loft);
  } else if (style === 'flat') {
    const top = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.18, 2.6), roofM); top.position.y = 0.09; top.castShadow = true; g.add(top);
    const lip = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
    for (const [w, d, x, z] of [[3.7, 0.08, 0, 1.26], [3.7, 0.08, 0, -1.26], [0.08, 2.6, 1.81, 0], [0.08, 2.6, -1.81, 0]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(w, 0.22, d), lip); p.position.set(x, 0.26, z); g.add(p); }
    if (extra.planters !== false) for (const x of [-1.2, 1.2]) { const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.22, 10), new THREE.MeshStandardMaterial({ color: 0xb8714a })); pot.position.set(x, 0.3, -0.6); const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), new THREE.MeshStandardMaterial({ color: 0x4fae5b, flatShading: true })); bush.position.set(x, 0.55, -0.6); g.add(pot, bush); }
  } else {
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.75, 1.3, 4, 1), roofM); roof.rotation.y = Math.PI / 4; roof.scale.set(1.0, 1, 0.78); roof.position.y = 0.65; roof.castShadow = true; g.add(roof);
  }
  return g;
}

// ---------- 各業態造景 ----------
// 每個 build(k, L, world, pal) 擺好造景，回傳 { spots: [...] }：人物要站／坐／工作的位置
// spot：{ x, z, face:[x,z]（面向哪裡）, pose:'stand'|'sit'|'work'|'crouch'|'swim', y（坐的高度）, prop:'balloon'|'cup'|'can'|'rod', hat }

export function house(k, x, z, wall, roof) {
  const g = new THREE.Group(); g.position.set(x, 0.13, z);
  g.add(k.mesh(k.g('hbody', () => new THREE.BoxGeometry(0.95, 0.8, 0.8)), k.m(wall, { roughness: 0.7 }), 0, 0.4, 0));
  const r = k.mesh(k.g('hroof', () => { const s = new THREE.Shape(); s.moveTo(-0.52, 0); s.lineTo(0.52, 0); s.lineTo(0, 0.5); const geo = new THREE.ExtrudeGeometry(s, { depth: 1.05, bevelEnabled: false }); geo.translate(0, 0, -0.525); geo.rotateY(Math.PI / 2); return geo; }), [k.m(wall), k.m(roof, { flatShading: true })], 0, 0.8, 0);
  g.add(r);
  g.add(k.mesh(k.g('hdoor', () => new THREE.BoxGeometry(0.22, 0.4, 0.03)), k.m('#7a5236'), 0, 0.2, 0.41, false));
  const win = k.night ? k.glow('#ffd88a', 1.3) : k.m('#cfe9ff', { roughness: 0.2 });
  for (const dx of [-0.3, 0.3]) g.add(k.mesh(k.g('hwin', () => new THREE.BoxGeometry(0.18, 0.18, 0.03)), win, dx, 0.5, 0.41, false));
  if (k.rnd() < 0.5) g.add(k.mesh(k.g('hchim', () => new THREE.BoxGeometry(0.14, 0.3, 0.14)), k.m('#9a6b55'), 0.25, 1.05, -0.15));
  return g;
}
function town(k, L, world, pal) {
  const spots = [];
  let first = null;
  const walls = ['#fff3e0', '#e9f4ff', '#fde8ec', '#eef7e6', '#fff8d6'];
  for (let i = 0; i < (k.mobile ? 3 : 5); i++) {
    const p = (i < 3 ? L.place(k.rnd, 0.62, 1.35, { away: first }) : null) || L.spot(k.rnd, { rad: 0.62, h: 1.35 }); if (!p) continue; first = first || p;
    const h = house(k, p.x, p.z, walls[i % walls.length], hex(C(pal[i % 6]).lerp(C('#000000'), 0.25))); faceTo(h); world.add(h);
    if (i === 0) { const fx = Math.sin(h.rotation.y), fz = Math.cos(h.rotation.y); spots.push({ x: p.x + fx * 0.85 + fz * 0.25, z: p.z + fz * 0.85 - fx * 0.25, face: [p.x, p.z], pose: 'stand', prop: 'bag' }); }
  }
  for (let i = 0; i < (k.mobile ? 3 : 6); i++) { const p = L.spot(k.rnd, { rad: 0.18, h: 1.6 }); if (p) world.add(lamp(k, p.x, p.z)); }
  for (let i = 0; i < 2; i++) {
    const p = L.spot(k.rnd, { zone: 'inner', rad: 0.55 }) || L.spot(k.rnd, { rad: 0.55 }); if (!p) continue;
    const b = bench(k, p.x, p.z); faceTo(b); world.add(b);
    if (i === 0) spots.push({ x: p.x + Math.sin(b.rotation.y) * 0.05, z: p.z + Math.cos(b.rotation.y) * 0.05, face: [p.x + Math.sin(b.rotation.y) * 2, p.z + Math.cos(b.rotation.y) * 2], pose: 'sit', y: 0.48 });
  }
  // 花台
  for (let i = 0; i < (k.mobile ? 2 : 4); i++) { const p = L.spot(k.rnd, { rad: 0.35 }); if (!p) continue; const g = new THREE.Group(); g.position.set(p.x, 0.13, p.z); g.add(k.mesh(k.g('planter', () => new THREE.BoxGeometry(0.6, 0.22, 0.26)), k.m('#b8714a'), 0, 0.11, 0)); flowerRow(k, g, 0, 0, 0.5, Math.PI / 2, [hex(pal[0]), hex(pal[2]), '#ffffff'], { n: 5 }).position.y = 0.16; g.rotation.y = k.rnd() * 3; world.add(g); }
  plantTrees(k, L, world, k.mobile ? 5 : 9, ['round', 'round', 'blossom', 'pine']);
  bushes(k, L, world, k.mobile ? 6 : 12, ['#4fae5b', '#6cc163', hex(pal[1])]);
  return { spots };
}

export function cabin(k, x, z) {
  const g = new THREE.Group(); g.position.set(x, 0.13, z);
  const logs = k.tex(64, 64, (c, w, h) => { for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#9a6a42' : '#b07b4f'; c.fillRect(0, i * h / 6, w, h / 6); c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(0, (i + 1) * h / 6 - 2, w, 2); } });
  const lm = new THREE.MeshStandardMaterial({ map: logs, roughness: 0.9 });
  g.add(k.mesh(k.g('cbody', () => new THREE.BoxGeometry(1.1, 0.78, 0.85)), lm, 0, 0.39, 0));
  g.add(k.mesh(k.g('croof', () => { const s = new THREE.Shape(); s.moveTo(-0.6, 0); s.lineTo(0.6, 0); s.lineTo(0, 0.55); const geo = new THREE.ExtrudeGeometry(s, { depth: 1.25, bevelEnabled: false }); geo.translate(0, 0, -0.625); geo.rotateY(Math.PI / 2); return geo; }), [lm, k.m('#5a3d2b', { flatShading: true })], 0, 0.78, 0));
  g.add(k.mesh(k.g('cdoor', () => new THREE.BoxGeometry(0.24, 0.45, 0.03)), k.m('#5a3d2b'), 0.2, 0.23, 0.44, false));
  g.add(k.mesh(k.g('cwin', () => new THREE.BoxGeometry(0.2, 0.18, 0.03)), k.night ? k.glow('#ffc46b', 1.4) : k.m('#cfe9ff', { roughness: 0.2 }), -0.25, 0.45, 0.44, false));
  g.add(k.mesh(k.g('cchim', () => new THREE.BoxGeometry(0.16, 0.42, 0.16)), k.m('#8b8580', { flatShading: true }), -0.3, 1.1, -0.1));
  puffs(k, g, -0.3, 1.38, -0.1, { n: 5, color: k.night ? 0x8a93a8 : 0xeeeeee, size: 0.13, rise: 1.2, speed: 0.22, opacity: 0.6 });
  return g;
}
// 建造某業態的造景；回傳人物要用的定點位置
export function buildScene(scene, { world, anim, rnd, night, mobile, pal, layout }) {
  const k = kit(world, anim, rnd, night, mobile);
  const out = scene.build(k, layout, world, pal) || {};
  // 岸邊的石頭（半泡在水裡，不擋海灘散步）
  for (let i = 0; i < 9; i++) {
    const th = rnd() * TAU, r = layout.shore(th) * 1.02 + 0.1;
    if (Math.abs(((th - layout.pier.th) % TAU + TAU * 1.5) % TAU - Math.PI) < 0.3) continue;
    const s = k.mesh(k.g('shorerock', () => new THREE.DodecahedronGeometry(1, 0)), k.m(night ? '#5a5f6a' : '#b9b0a3', { flatShading: true }), Math.sin(th) * r, -0.42, Math.cos(th) * r);
    s.scale.setScalar(0.2 + rnd() * 0.25); s.rotation.set(rnd(), rnd(), rnd()); world.add(s);
  }
  return { spots: out.spots || [], deco: out.deco || null, dogs: out.dogs || 0, kit: k };
}

// 店舖的小裝飾（依業態）
export function shopDeco(deco, shopG, k, roofStyle) {
  if (deco === 'lanterns') {
    for (const x of [-1.3, -0.45, 0.45, 1.3]) { const l = k.mesh(k.g('slant', () => { const g = new THREE.SphereGeometry(0.13, 12, 8); g.scale(1, 1.25, 1); return g; }), k.glow('#e8453c', 1.8), x, 1.05, 1.9, false); shopG.add(l); }
  } else if (deco === 'chimney') {
    const ch = k.mesh(k.g('schim', () => new THREE.BoxGeometry(0.3, 0.8, 0.3)), k.m('#8b8580', { flatShading: true }), 1.05, roofStyle === 'gable' ? 2.85 : 2.7, -0.4); shopG.add(ch);
    puffs(k, shopG, 1.05, 3.3, -0.4, { n: 5, color: k.night ? 0x8a93a8 : 0xeeeeee, size: 0.18, rise: 1.4, speed: 0.2, opacity: 0.55 });
  } else if (deco === 'flowerbox') {
    for (const x of [-1.05, 1.05]) { shopG.add(k.mesh(k.g('wbox', () => new THREE.BoxGeometry(0.9, 0.12, 0.18)), k.m('#a8754a'), x, 0.6, 1.24, false)); for (let i = 0; i < 5; i++) shopG.add(k.mesh(k.g('wbl', () => new THREE.IcosahedronGeometry(0.06, 0)), k.m(['#ff7aa2', '#ffd34e', '#ffffff'][i % 3], { flatShading: true }), x - 0.36 + i * 0.18, 0.7, 1.26, false)); }
  }
}

// ---------- 帆船 ----------
// 船身朝 +z（船頭）、甲板在 y=0；主帆與前帆都在船的中線平面上，隨風微微鼓起
export function makeBoat(pal, night) {
  const g = new THREE.Group();
  const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: C(c), roughness: 0.6, ...o });
  // 船身：俯視外形（尖船頭、平船尾）往下擠出，倒角做出圓弧船腹
  const deckShape = (k = 1) => { const s = new THREE.Shape(); s.moveTo(-0.36 * k, -1.0 * k); s.lineTo(0.36 * k, -1.0 * k); s.bezierCurveTo(0.5 * k, -0.2 * k, 0.48 * k, 0.45 * k, 0, 1.2 * k); s.bezierCurveTo(-0.48 * k, 0.45 * k, -0.5 * k, -0.2 * k, -0.36 * k, -1.0 * k); return s; };
  const ext = (shape, depth, bevel) => { const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 3, curveSegments: 12 }); geo.rotateX(Math.PI / 2); return geo; };
  const hull = new THREE.Mesh(ext(deckShape(0.92), 0.22, 0.12), M('#fbf7f0')); hull.position.y = -0.02; hull.castShadow = true; g.add(hull);
  const band = new THREE.Mesh(ext(deckShape(1.03), 0.07, 0), M(hex(pal[0]))); band.position.y = -0.04; g.add(band);
  const deck = new THREE.Mesh(new THREE.ShapeGeometry(deckShape(0.9), 12), M('#c99a6b', { roughness: 0.8 })); deck.rotation.x = Math.PI / 2; deck.position.y = 0.012; deck.scale.y = -1; g.add(deck);
  // 船艙
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.28, 0.62), M('#ffffff')); cabin.position.set(0, 0.15, -0.4); cabin.castShadow = true; g.add(cabin);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.05, 0.68), M(hex(pal[0]))); roof.position.set(0, 0.31, -0.4); g.add(roof);
  const winM = night ? M('#ffd88a', { emissive: C('#ffb84d'), emissiveIntensity: 1.4 }) : M('#3b5b78', { roughness: 0.2 });
  for (const s of [-1, 1]) for (const z of [-0.55, -0.25]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.09, 0.16), winM); w.position.set(s * 0.255, 0.17, z); g.add(w); }
  // 桅杆、帆桁
  const wood = M('#7a5236');
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 2.1, 6), wood); mast.position.set(0, 1.05, 0.2); mast.castShadow = true; g.add(mast);
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.05, 6), wood); boom.rotation.x = Math.PI / 2; boom.position.set(0, 0.42, -0.32); g.add(boom);
  // 帆：三角形切成細格，往側面彎一點像吃到風
  // 帆：三角形（帆腳、帆頂、帆尾）切成細格，中間往側面鼓起像吃到風
  const sail = ([a, b, c], color, belly) => {
    const N = 8, pos = [];
    const P = (u, v) => { const w = 1 - u - v; return [belly * 27 * u * v * w, a[1] * w + b[1] * u + c[1] * v, a[0] * w + b[0] * u + c[0] * v]; };
    for (let i = 0; i < N; i++) for (let j = 0; j < N - i; j++) {
      const u = i / N, v = j / N, d = 1 / N;
      pos.push(...P(u, v), ...P(u + d, v), ...P(u, v + d));
      if (j < N - i - 1) pos.push(...P(u + d, v), ...P(u + d, v + d), ...P(u, v + d));
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: C(color), side: THREE.DoubleSide, roughness: 0.75 })); m.castShadow = true; return m;
  };
  const main = sail([[0.18, 0.46], [0.18, 2.05], [-0.82, 0.46]], '#fffaf2', 0.16); g.add(main);
  const jib = sail([[0.24, 0.3], [0.24, 1.75], [1.05, 0.12]], hex(pal[2]), 0.12); g.add(jib);
  // 船頭到桅頂的支索
  const stay = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 1, 3), M('#dddddd'));
  { const p0 = new THREE.Vector3(0, 0.1, 1.08), p1 = new THREE.Vector3(0, 2.05, 0.2); stay.position.copy(p0).lerp(p1, 0.5); stay.scale.y = p0.distanceTo(p1); stay.lookAt(p1); stay.rotateX(Math.PI / 2); g.add(stay); }
  // 桅頂小旗
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.14), new THREE.MeshStandardMaterial({ color: pal[0], side: THREE.DoubleSide }));
  flag.geometry.translate(-0.14, 0, 0); flag.position.set(0, 2.06, 0.2); flag.rotation.y = Math.PI / 2; g.add(flag);
  // 船尾的白色水痕（V 字）
  const wakeM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: night ? 0.25 : 0.45, depthWrite: false });
  const wakes = [-1, 1].map(s => { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 1.6), wakeM); w.rotation.x = -Math.PI / 2; w.rotation.z = -s * 0.35; w.position.set(s * 0.3, -0.06, -1.7); g.add(w); return w; });
  return {
    group: g,
    update(t) { flag.rotation.y = Math.PI / 2 + Math.sin(t * 6) * 0.25; main.rotation.y = 0.12 + Math.sin(t * 0.7) * 0.03; jib.rotation.y = 0.1 + Math.sin(t * 0.8 + 1) * 0.03; wakes.forEach((w, i) => { w.material.opacity = (night ? 0.2 : 0.38) + Math.sin(t * 3 + i) * 0.08; }); },
  };
}
