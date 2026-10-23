// 銷售網頁 3D 小島的「業態風景」：每種業態一套造景（糖果島、夜市、茶山咖啡、小鎮市集、森林工坊、花田溫室、海灘度假、田園牧場），
// 再依業主代號決定島的形狀、擺設位置與細節，讓每家店的小島都不一樣。
// 這裡也負責島上的空地規劃（避開步道、店舖、展台、人物走的路線與鏡頭視線），人物（island-people.js）共用同一份規劃。
import * as THREE from 'three';

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
// sand／grass：沙灘與草地顏色；roof：店舖屋頂（pyramid 四角、gable 人字、flat 平頂、barn 穀倉）；
// beach：海灘散步的人走的角度範圍（其餘沙灘可以擺設）；hat：路人常見的帽子
export const SCENES = {
  dessert: { id: 'candy', name: '糖果甜點島', sand: '#f9e1d3', grass: '#9edcb0', roof: 'pyramid', build: candy },
  food: { id: 'market', name: '夜市小吃島', sand: '#f1d9aa', grass: '#86c063', roof: 'flat', build: market },
  drink: { id: 'tea', name: '茶山咖啡島', sand: '#efdcb4', grass: '#78bd62', roof: 'gable', build: tea },
  retail: { id: 'town', name: '小鎮市集島', sand: '#f2deb6', grass: '#84c56c', roof: 'gable', build: town },
  craft: { id: 'forest', name: '森林工坊島', sand: '#e6d1a6', grass: '#62a453', roof: 'gable', build: forest },
  flower: { id: 'garden', name: '花田溫室島', sand: '#f4e2bd', grass: '#88cb6d', roof: 'pyramid', build: garden },
  service: { id: 'resort', name: '海灘度假島', sand: '#f7e6bd', grass: '#8ed27a', roof: 'flat', beach: [[0.55, 2.2]], hat: 'sun', water: { shallow: '#58e3d6', deep: '#1aa0d0' }, build: resort },
  farm: { id: 'farm', name: '田園牧場島', sand: '#efdbb0', grass: '#97c967', roof: 'barn', hat: 'straw', build: farm },
};
export function sceneFor(t) { return SCENES[(t && t.cat) || 'retail'] || SCENES.retail; }

// ---------- 空地規劃 ----------
// 島上已經有的東西：環島步道（半徑 RING）、步道上的展台（stations 角度）、中央廣場、往前的步道、後方店舖、碼頭；
// 人物的固定路線（環島兩條人行線、碼頭→店舖、廣場、海灘）也要留空。
export function makeLayout({ shore, RING, SHOP_Z, stations, pierTh = 2.5, beach }) {
  const occ = [];
  const sP = shore(pierTh);
  const dir = [Math.sin(pierTh), Math.cos(pierTh)];
  const at = (r) => [dir[0] * r, dir[1] * r];
  const pier = { th: pierTh, r: sP + 1.0, len: 3.2, x: dir[0] * (sP + 1.0), z: dir[1] * (sP + 1.0) };
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
  const beachLanes = beach || [[-2.3, -0.9], [0.6, 2.2]];
  const routes = [visitor, front];
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
    if (r - rad < edge + 0.4 && r + rad > edge - 0.05) return no('edge'); // 不跨在草地邊坡上
    if (r + rad > s - 0.1) return no('shore');
    if (Math.abs(r - RING) < 0.47 + rad) return no('path');
    if (Math.abs(r - RING) < 1.3 + rad) for (const [px, pz] of lanePts) if (Math.abs(px - x) < rad + 0.3 && Math.abs(pz - z) < rad + 0.3 && Math.hypot(px - x, pz - z) < rad + 0.24) return no('lane');
    for (const a of stations) {
      const sx = Math.sin(a) * RING, sz = Math.cos(a) * RING;
      if (Math.hypot(x - sx, z - sz) < 1.05 + rad) return no('station');
      if (h > 0 && r > RING && angDist(a, th) < 0.45 && h > Math.min(lineH(r) - 0.3, 1.1)) return no('sight');
    }
    if (Math.abs(x) < 2.0 + rad && z > SHOP_Z - 1.6 - rad && z < SHOP_Z + 1.65 + rad) return no('shop');
    if (Math.abs(x) < 0.85 + rad && z > SHOP_Z + 1.5 && z < RING + 0.6) return no('walk');
    if (Math.hypot(x, z - 0.9) < 1.95 + rad) return no('plaza');
    for (const sg of segs) if (segDist(x, z, sg) < 0.4 + rad) return no('route');
    if (r > edge) { const bw = s * 0.955; if (Math.abs(r - bw) < 0.28 + rad && beachLanes.some(([a, b]) => th > a - 0.06 && th < b + 0.06)) return no('beach'); }
    if (angDist(th, pierTh) < 0.25 && r > RING) return no('pier');
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
    for (let x = -RING; x <= RING + 1e-6; x += 0.3) for (let z = -RING; z <= RING + 1e-6; z += 0.3) {
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
    const r = Math.hypot(x, z), s = shore(Math.atan2(x, z)), e = s * 0.84;
    let y = r <= e ? 0.13 : r <= e + 0.3 ? 0.13 - (r - e) / 0.3 * 0.38 : r <= s ? -0.25 : r <= s + 0.25 ? -0.25 - (r - s) : -0.55;
    const lz = x * dir[0] + z * dir[1] - pier.r, lx = x * dir[1] - z * dir[0];
    if (Math.abs(lx) < 0.5 && lz > -pier.len / 2 && lz < pier.len / 2) y = Math.max(y, 0.01);
    return y;
  }
  return { free, why: () => why, claim, spot, place, ground, pier, routes: { visitor, front }, beachLanes, laneOff, stations, RING, SHOP_Z, shore };
}

// ---------- 小工具 ----------
function kit(world, anim, rnd, night, mobile) {
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
const faceTo = (o, tx = 0, tz = 0.9) => { o.rotation.y = Math.atan2(tx - o.position.x, tz - o.position.z); return o; };
// 讓上升的煙／蒸氣一顆顆變大再消失（共用材質，只改大小）
function puffs(k, parent, x, y, z, { n = 4, color = 0xffffff, size = 0.16, rise = 0.9, speed = 0.35, opacity = 0.7 } = {}) {
  const mat = new THREE.MeshStandardMaterial({ color, transparent: true, opacity, roughness: 1, depthWrite: false });
  const geo = k.g('puff', () => new THREE.IcosahedronGeometry(1, 1));
  const list = [];
  for (let i = 0; i < n; i++) { const p = new THREE.Mesh(geo, mat); parent.add(p); list.push(p); }
  k.anim.push((t) => list.forEach((p, i) => { const u = (t * speed + i / n) % 1; p.position.set(x + Math.sin(u * 5 + i) * 0.08, y + u * rise, z); p.scale.setScalar(size * Math.sin(u * Math.PI) * (0.6 + u)); }));
}

// ---------- 樹與植物 ----------
function tree(k, x, z, type = 'round', s = 1, leaf) {
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
function plantTrees(k, L, world, n, types, { zone = 'land', leaf } = {}) {
  let c = 0;
  for (let i = 0; i < n * 3 && c < n; i++) {
    const type = k.pick(types), s = 0.75 + k.rnd() * 0.5, h = (type === 'palm' ? 2.0 : type === 'pine' ? 2.1 : 1.6) * s;
    const p = L.spot(k.rnd, { zone, rad: 0.42 * s, h });
    if (!p) continue;
    world.add(tree(k, p.x, p.z, type, s, leaf)); c++;
  }
}
function bushes(k, L, world, n, colors) {
  const geo = k.g('bush', () => new THREE.IcosahedronGeometry(1, 0));
  for (let i = 0; i < n; i++) {
    const p = L.spot(k.rnd, { zone: 'land', rad: 0.22 }); if (!p) continue;
    const s = 0.16 + k.rnd() * 0.12;
    const b = k.mesh(geo, k.m(k.pick(colors), { roughness: 0.6, flatShading: true }), p.x, 0.13 + s * 0.7, p.z); b.scale.setScalar(s); world.add(b);
  }
}
// 一排排的花（同一排用 InstancedMesh，省效能）
function flowerRow(k, parent, x, z, len, rotY, colors, { n = 9, stem = 0.18, size = 0.09 } = {}) {
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
function lamp(k, x, z, color = '#ffd88a') {
  const g = new THREE.Group(); g.position.set(x, 0.13, z);
  g.add(k.mesh(k.g('lpost', () => new THREE.CylinderGeometry(0.035, 0.05, 1.35, 6)), k.m('#2f3a40', { roughness: 0.5 }), 0, 0.68, 0));
  g.add(k.mesh(k.g('lhead', () => new THREE.SphereGeometry(0.12, 12, 8)), k.glow(color, 2.2), 0, 1.42, 0));
  g.add(k.mesh(k.g('lcap', () => new THREE.ConeGeometry(0.14, 0.1, 8)), k.m('#2f3a40'), 0, 1.55, 0));
  return g;
}
function bench(k, x, z) {
  const g = new THREE.Group(); g.position.set(x, 0.13, z);
  const wood = k.m('#a8754a'), iron = k.m('#3a3f44');
  g.add(k.mesh(k.g('bseat', () => new THREE.BoxGeometry(0.9, 0.06, 0.32)), wood, 0, 0.32, 0));
  g.add(k.mesh(k.g('bback', () => new THREE.BoxGeometry(0.9, 0.24, 0.05)), wood, 0, 0.55, -0.15));
  for (const dx of [-0.38, 0.38]) g.add(k.mesh(k.g('bleg', () => new THREE.BoxGeometry(0.05, 0.32, 0.3)), iron, dx, 0.16, 0));
  return g;
}
function umbrella(k, x, z, color, { h = 1.55, r = 0.75 } = {}) {
  const g = new THREE.Group(); g.position.set(x, 0.13, z);
  g.add(k.mesh(k.g('upole' + h, () => new THREE.CylinderGeometry(0.025, 0.025, h, 6)), k.m('#e8e2d8'), 0, h / 2, 0));
  const tex = k.stripes(hex(color), '#ffffff', 8);
  g.add(k.mesh(k.g('ucone' + r, () => new THREE.ConeGeometry(r, 0.35, 8, 1, true)), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.7 }), 0, h - 0.05, 0));
  return g;
}
function table(k, x, z, chairs = 2) {
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

function candy(k, L, world, pal) {
  const spots = [];
  let first = null;
  const pastel = ['#ff9ec0', '#9fd8ff', '#ffe08a', '#c8a8ff', '#9ff0c8', '#ffb98a'];
  // 大杯子蛋糕
  for (let i = 0; i < 2; i++) {
    const p = L.place(k.rnd, 0.7, 1.6, { away: first }); if (!p) continue; first = first || p;
    const g = new THREE.Group(); g.position.set(p.x, 0.13, p.z);
    const wrap = k.stripes(hex(pal[i % 6]), '#ffffff', 10);
    g.add(k.mesh(k.g('cwrap', () => new THREE.CylinderGeometry(0.6, 0.45, 0.62, 18, 1)), [new THREE.MeshStandardMaterial({ map: wrap, roughness: 0.6 }), k.m('#ffffff'), k.m('#ffffff')], 0, 0.31, 0));
    const cream = k.m(k.pick(['#fff4f8', '#fff1d6', '#ffe0ec']), { roughness: 0.45 });
    [[0.62, 0.72, 0.32], [0.48, 0.98, 0.28], [0.32, 1.2, 0.24]].forEach(([r, y, s]) => { const b = k.mesh(k.g('cream' + r, () => new THREE.SphereGeometry(r, 20, 12)), cream, 0, y, 0); b.scale.y = s / r * 1.2; g.add(b); });
    g.add(k.mesh(k.g('cherry', () => new THREE.SphereGeometry(0.13, 14, 10)), k.m('#e8384f', { roughness: 0.25 }), 0, 1.45, 0));
    const spr = k.g('spr', () => new THREE.BoxGeometry(0.03, 0.03, 0.1));
    for (let j = 0; j < 22; j++) { const a = j * 2.4, r = 0.2 + (j % 5) * 0.08; const s = k.mesh(spr, k.m(pastel[j % 6]), Math.cos(a) * r, 0.92 + (5 - j % 5) * 0.05, Math.sin(a) * r, false); s.rotation.set(j, j * 2, 0); g.add(s); }
    world.add(g);
    spots.push({ x: p.x + 0.95, z: p.z + 0.35, face: [p.x, p.z], pose: 'stand', prop: 'balloon' });
  }
  // 拐杖糖
  const caneTex = k.stripes('#e8384f', '#ffffff', 12, false); caneTex.wrapS = caneTex.wrapT = THREE.RepeatWrapping; caneTex.repeat.set(1, 6);
  const caneGeo = k.g('cane', () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.9, 0), new THREE.Vector3(0, 1.25, 0), new THREE.Vector3(0.18, 1.42, 0), new THREE.Vector3(0.36, 1.25, 0), new THREE.Vector3(0.38, 1.1, 0)]), 24, 0.07, 8));
  for (let i = 0; i < (k.mobile ? 2 : 4); i++) { const p = L.spot(k.rnd, { rad: 0.35, h: 1.5 }); if (!p) continue; const c = k.mesh(caneGeo, new THREE.MeshStandardMaterial({ map: caneTex, roughness: 0.3 }), p.x, 0.13, p.z); c.rotation.y = k.rnd() * TAU; world.add(c); }
  plantTrees(k, L, world, k.mobile ? 6 : 11, ['lolli', 'lolli', 'blossom']);
  // 軟糖
  const gum = k.g('gum', () => new THREE.SphereGeometry(0.16, 14, 8, 0, TAU, 0, Math.PI / 2));
  for (let i = 0; i < (k.mobile ? 10 : 18); i++) { const p = L.spot(k.rnd, { rad: 0.16 }); if (!p) continue; world.add(k.mesh(gum, k.m(pastel[i % 6], { roughness: 0.25, transparent: true, opacity: 0.92 }), p.x, 0.13, p.z)); }
  // 甜甜圈
  const d = L.spot(k.rnd, { zone: 'beach', rad: 0.5, h: 0.4 });
  if (d) { const g = new THREE.Group(); g.position.set(d.x, -0.12, d.z); const ring = k.mesh(k.g('donut', () => new THREE.TorusGeometry(0.34, 0.16, 12, 28)), k.m('#d9a066'), 0, 0, 0); ring.rotation.x = -Math.PI / 2; const ic = k.mesh(k.g('icing', () => new THREE.TorusGeometry(0.34, 0.12, 10, 28)), k.m('#ff9ec0', { roughness: 0.3 }), 0, 0.06, 0); ic.rotation.x = -Math.PI / 2; g.add(ring, ic); world.add(g); }
  return { spots };
}

function market(k, L, world, pal) {
  const spots = [];
  let first = null;
  const red = k.glow('#e8453c', 1.8);
  const lantern = (parent, x, y, z) => { const l = k.mesh(k.g('lant', () => { const g = new THREE.SphereGeometry(0.12, 12, 8); g.scale(1, 1.25, 1); return g; }), red, x, y, z); parent.add(l); parent.add(k.mesh(k.g('lantcap', () => new THREE.CylinderGeometry(0.06, 0.06, 0.04, 8)), k.m('#3a2a1e'), x, y + 0.16, z)); return l; };
  // 小吃攤：櫃台、條紋棚子、鍋子冒煙、紅燈籠；攤販在後面忙，客人在前面排隊
  const n = k.mobile ? 2 : 3;
  for (let i = 0; i < n; i++) {
    const p = L.place(k.rnd, 0.75, 1.8, { away: first }); if (!p) continue; first = first || p;
    const g = new THREE.Group(); g.position.set(p.x, 0.13, p.z); faceTo(g);
    const c = hex(pal[(i + 1) % 6]);
    g.add(k.mesh(k.g('counter', () => new THREE.BoxGeometry(1.2, 0.62, 0.55)), k.m(c, { roughness: 0.6 }), 0, 0.31, 0.15));
    g.add(k.mesh(k.g('ctop', () => new THREE.BoxGeometry(1.28, 0.05, 0.62)), k.m('#f4efe6'), 0, 0.64, 0.15));
    for (const [dx, dz] of [[-0.6, -0.35], [0.6, -0.35], [-0.6, 0.45], [0.6, 0.45]]) g.add(k.mesh(k.g('spole', () => new THREE.CylinderGeometry(0.025, 0.025, 1.6, 6)), k.m('#6b5a4a'), dx, 0.8, dz));
    const roof = k.mesh(k.g('sroof', () => new THREE.BoxGeometry(1.45, 0.06, 1.05)), [k.m('#ffffff'), k.m('#ffffff'), new THREE.MeshStandardMaterial({ map: k.stripes(c, '#ffffff', 8), roughness: 0.7 }), k.m('#ffffff'), k.m('#ffffff'), k.m('#ffffff')], 0, 1.62, 0.05);
    roof.rotation.x = 0.12; g.add(roof);
    const pot = k.mesh(k.g('pot', () => new THREE.CylinderGeometry(0.15, 0.12, 0.16, 12)), k.m('#8d949a', { metalness: 0.6, roughness: 0.35 }), -0.3, 0.75, 0.15); g.add(pot);
    puffs(k, g, -0.3, 0.86, 0.15, { n: 4, size: 0.1, rise: 0.7, speed: 0.45, opacity: 0.55 });
    lantern(g, 0.5, 1.38, 0.5); lantern(g, -0.5, 1.38, 0.5);
    world.add(g);
    const fx = Math.sin(g.rotation.y), fz = Math.cos(g.rotation.y);
    spots.push({ x: p.x - fx * 0.15, z: p.z - fz * 0.15, face: [p.x + fx, p.z + fz], pose: 'work', hat: 'cap' });
    spots.push({ x: p.x + fx * 0.95, z: p.z + fz * 0.95, face: [p.x, p.z], pose: 'stand' });
    if (!k.mobile && i === 0) spots.push({ x: p.x + fx * 1.45 + fz * 0.2, z: p.z + fz * 1.45 - fx * 0.2, face: [p.x, p.z], pose: 'stand' });
  }
  // 燈籠柱與桌椅
  for (let i = 0; i < (k.mobile ? 3 : 6); i++) { const p = L.spot(k.rnd, { rad: 0.2, h: 1.6 }); if (!p) continue; const g = new THREE.Group(); g.position.set(p.x, 0.13, p.z); g.add(k.mesh(k.g('lpole', () => new THREE.CylinderGeometry(0.03, 0.04, 1.5, 6)), k.m('#6b4a35'), 0, 0.75, 0)); g.add(k.mesh(k.g('larm', () => new THREE.BoxGeometry(0.4, 0.03, 0.03)), k.m('#6b4a35'), 0.18, 1.45, 0)); lantern(g, 0.34, 1.25, 0); world.add(g); }
  for (let i = 0; i < (k.mobile ? 1 : 2); i++) {
    const p = L.spot(k.rnd, { zone: 'inner', rad: 0.75 }) || L.spot(k.rnd, { rad: 0.75 }); if (!p) continue;
    const t = table(k, p.x, p.z, 3); world.add(t);
    const s = t.userData.seats[0]; spots.push({ x: p.x + s.dx, z: p.z + s.dz, face: [p.x, p.z], pose: 'sit', y: 0.43 });
  }
  plantTrees(k, L, world, k.mobile ? 5 : 9, ['round', 'round', 'pine']);
  bushes(k, L, world, k.mobile ? 8 : 14, ['#4fae5b', '#6cc163', hex(pal[0])]);
  return { spots, deco: 'lanterns' };
}

function tea(k, L, world, pal) {
  const spots = [];
  // 階梯茶園：三層台地，每層邊緣一圈茶樹；採茶人戴斗笠
  const hp = L.place(k.rnd, 1.0, 1.0);
  if (hp) {
    const g = new THREE.Group(); g.position.set(hp.x, 0.13, hp.z);
    const soil = k.m(k.night ? '#3e5a32' : '#6aa24d', { flatShading: true }), bushM = k.m(k.night ? '#24573a' : '#2f8a45', { flatShading: true, roughness: 0.7 });
    const bushG = k.g('teab', () => new THREE.SphereGeometry(0.12, 8, 6));
    [[1.0, 0.0], [0.72, 0.22], [0.45, 0.44]].forEach(([r, y], li) => {
      g.add(k.mesh(k.g('tier' + r, () => new THREE.CylinderGeometry(r, r + 0.06, 0.22, 24)), soil, 0, y + 0.11, 0));
      const n = Math.round(r * 16);
      const inst = new THREE.InstancedMesh(bushG, bushM, n); const mtx = new THREE.Matrix4(); const q = new THREE.Quaternion();
      for (let j = 0; j < n; j++) { const a = j / n * TAU + li; mtx.compose(new THREE.Vector3(Math.sin(a) * (r - 0.1), y + 0.25, Math.cos(a) * (r - 0.1)), q, new THREE.Vector3(1.2, 0.8, 1.2)); inst.setMatrixAt(j, mtx); }
      inst.castShadow = true; g.add(inst);
    });
    world.add(g);
    const a = Math.atan2(-hp.x, 0.9 - hp.z);
    spots.push({ x: hp.x + Math.sin(a) * 0.8, z: hp.z + Math.cos(a) * 0.8, face: [hp.x, hp.z], pose: 'work', y: 0.35, hat: 'straw' });
  }
  // 咖啡座：陽傘＋桌椅，有人坐著喝
  for (let i = 0; i < (k.mobile ? 1 : 2); i++) {
    const p = L.place(k.rnd, 0.8, 1.6, { away: hp }) || L.spot(k.rnd, { rad: 0.8, h: 1.6 }); if (!p) continue;
    world.add(umbrella(k, p.x, p.z, pal[(i + 2) % 6]));
    const t = table(k, p.x, p.z, 2); world.add(t);
    const s = t.userData.seats[0]; spots.push({ x: p.x + s.dx, z: p.z + s.dz, face: [p.x, p.z], pose: 'sit', y: 0.43, prop: 'cup' });
  }
  // 咖啡豆麻袋
  for (let i = 0; i < 3; i++) { const p = L.spot(k.rnd, { rad: 0.22 }); if (!p) continue; const b = k.mesh(k.g('sack', () => { const g = new THREE.SphereGeometry(0.2, 10, 8); g.scale(1, 1.25, 0.85); return g; }), k.m('#b8996b', { flatShading: true }), p.x, 0.36, p.z); b.rotation.y = k.rnd() * 3; world.add(b); }
  plantTrees(k, L, world, k.mobile ? 6 : 10, ['round', 'blossom', 'round']);
  bushes(k, L, world, k.mobile ? 6 : 12, ['#2f8a45', '#4fae5b', '#3d9b57']);
  return { spots };
}

function house(k, x, z, wall, roof) {
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

function cabin(k, x, z) {
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
function forest(k, L, world, pal) {
  const spots = [];
  let first = null;
  for (let i = 0; i < (k.mobile ? 1 : 2); i++) { const p = L.place(k.rnd, 0.75, 1.5, { away: first }); if (!p) continue; first = first || p; world.add(faceTo(cabin(k, p.x, p.z))); }
  // 營火：圍著石頭、火焰會閃，夜裡打光；兩個人坐在木頭上
  const cf = L.place(k.rnd, 0.95, 0.6, { away: first });
  if (cf) {
    const g = new THREE.Group(); g.position.set(cf.x, 0.13, cf.z);
    const stone = k.g('stone', () => new THREE.DodecahedronGeometry(0.08, 0));
    for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; g.add(k.mesh(stone, k.m('#8b8580', { flatShading: true }), Math.sin(a) * 0.3, 0.05, Math.cos(a) * 0.3)); }
    const fireM = new THREE.MeshStandardMaterial({ color: 0xffa23a, emissive: 0xff7a1a, emissiveIntensity: 1.6, roughness: 0.5, flatShading: true });
    const f1 = k.mesh(k.g('flame', () => new THREE.ConeGeometry(0.16, 0.42, 6)), fireM, 0, 0.24, 0, false); const f2 = k.mesh(k.g('flame2', () => new THREE.ConeGeometry(0.1, 0.3, 5)), new THREE.MeshStandardMaterial({ color: 0xffe27a, emissive: 0xffc23a, emissiveIntensity: 1.8 }), 0.04, 0.2, 0.03, false);
    g.add(f1, f2);
    let light = null; if (k.night) { light = new THREE.PointLight(0xff9a3a, 4, 4.5); light.position.set(0, 0.6, 0); g.add(light); }
    k.anim.push((t) => { f1.scale.set(1, 1 + Math.sin(t * 13) * 0.15 + Math.sin(t * 7.3) * 0.1, 1); f2.scale.y = 1 + Math.sin(t * 17 + 1) * 0.2; f1.rotation.y = t * 2; if (light) light.intensity = 3.5 + Math.sin(t * 11) * 0.6 + Math.sin(t * 5.7) * 0.4; });
    world.add(g);
    const logG = k.g('seatlog', () => new THREE.CylinderGeometry(0.1, 0.1, 0.55, 8));
    for (const a of [0.9, -0.9 + Math.PI]) {
      const x = cf.x + Math.sin(a) * 0.72, z = cf.z + Math.cos(a) * 0.72;
      const lg = k.mesh(logG, k.m('#8a5a3a'), x, 0.21, z); lg.rotation.set(0, a + Math.PI / 2, Math.PI / 2); world.add(lg);
      spots.push({ x, z, face: [cf.x, cf.z], pose: 'sit', y: 0.31 });
    }
  }
  // 風車（扇葉會轉）
  const wm = L.spot(k.rnd, { zone: 'outer', rad: 0.45, h: 2.4 }) || L.spot(k.rnd, { rad: 0.45, h: 2.4 });
  if (wm) {
    const g = new THREE.Group(); g.position.set(wm.x, 0.13, wm.z); faceTo(g, 0, 0);
    g.add(k.mesh(k.g('wtower', () => new THREE.CylinderGeometry(0.2, 0.34, 1.7, 8)), k.m('#f1e6d2', { flatShading: true }), 0, 0.85, 0));
    g.add(k.mesh(k.g('wcap', () => new THREE.ConeGeometry(0.3, 0.4, 8)), k.m(hex(pal[0]), { flatShading: true }), 0, 1.9, 0));
    const hub = new THREE.Group(); hub.position.set(0, 1.65, 0.3); g.add(hub);
    for (let i = 0; i < 4; i++) { const b = k.mesh(k.g('blade', () => { const geo = new THREE.BoxGeometry(0.16, 0.8, 0.02); geo.translate(0, 0.45, 0); return geo; }), k.m('#fffaf2'), 0, 0, 0); b.rotation.z = i * Math.PI / 2; hub.add(b); }
    k.anim.push((t) => { hub.rotation.z = t * 0.9; });
    world.add(g);
  }
  // 柴堆＋劈柴的人
  const lp = L.spot(k.rnd, { zone: 'inner', rad: 0.6 }) || L.spot(k.rnd, { rad: 0.6 });
  if (lp) {
    const g = new THREE.Group(); g.position.set(lp.x, 0.13, lp.z); faceTo(g);
    const lg = k.g('pilelog', () => new THREE.CylinderGeometry(0.07, 0.07, 0.6, 8));
    [[-0.08, 0.07], [0.08, 0.07], [0.24, 0.07], [0, 0.2], [0.16, 0.2], [0.08, 0.33]].forEach(([x, y]) => { const l = k.mesh(lg, k.m('#9a6a42'), x - 0.25, y, -0.1); l.rotation.z = Math.PI / 2; l.rotation.y = Math.PI / 2; g.add(l); });
    g.add(k.mesh(k.g('block', () => new THREE.CylinderGeometry(0.15, 0.17, 0.22, 10)), k.m('#b07b4f'), 0.35, 0.11, 0.1));
    world.add(g);
    const fx = Math.sin(g.rotation.y), fz = Math.cos(g.rotation.y);
    spots.push({ x: lp.x + fx * 0.48 + fz * 0.35, z: lp.z + fz * 0.48 - fx * 0.35, face: [lp.x + fz * 0.35, lp.z - fx * 0.35], pose: 'work' });
  }
  plantTrees(k, L, world, k.mobile ? 9 : 17, ['pine', 'pine', 'pine', 'round']);
  bushes(k, L, world, k.mobile ? 6 : 12, ['#3d7a3a', '#4f8f45', '#7a9a3a']);
  return { spots, deco: 'chimney' };
}

function garden(k, L, world, pal) {
  const spots = [];
  const fl = [hex(pal[0]), '#ffffff', hex(pal[2]), '#ff7aa2', '#ffd34e', hex(pal[3])];
  // 一側花田、一側溫室
  const fp = L.place(k.rnd, 1.0);
  if (fp) {
    const g = new THREE.Group(); g.position.set(fp.x, 0, fp.z); faceTo(g);
    for (let i = 0; i < 4; i++) flowerRow(k, g, -0.66 + i * 0.44, 0, 1.6, 0, [fl[i % fl.length], fl[(i + 3) % fl.length]], { n: 10 });
    world.add(g);
    spots.push({ x: fp.x + Math.cos(g.rotation.y) * 0.88, z: fp.z - Math.sin(g.rotation.y) * 0.88, face: [fp.x, fp.z], pose: 'crouch', prop: 'can', hat: 'sun' });
  }
  const gp = L.place(k.rnd, 0.85, 1.5, { away: fp });
  if (gp) {
    const g = new THREE.Group(); g.position.set(gp.x, 0.13, gp.z); faceTo(g);
    const glass = new THREE.MeshStandardMaterial({ color: 0xdff5ff, transparent: true, opacity: 0.32, roughness: 0.1, metalness: 0.1, depthWrite: false, side: THREE.DoubleSide });
    const box = new THREE.BoxGeometry(1.3, 0.75, 0.95);
    g.add(k.mesh(box, glass, 0, 0.375, 0, false));
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(box), new THREE.LineBasicMaterial({ color: 0xffffff })).translateY(0.375));
    const rs = new THREE.Shape(); rs.moveTo(-0.5, 0); rs.lineTo(0.5, 0); rs.lineTo(0, 0.42);
    const rg = new THREE.ExtrudeGeometry(rs, { depth: 1.3, bevelEnabled: false }); rg.translate(0, 0, -0.65); rg.rotateY(Math.PI / 2);
    const roof = k.mesh(rg, glass, 0, 0.75, 0, false); g.add(roof);
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(rg), new THREE.LineBasicMaterial({ color: 0xffffff })).translateY(0.75));
    for (let i = 0; i < 6; i++) g.add(k.mesh(k.g('gpl', () => new THREE.IcosahedronGeometry(0.13, 0)), k.m(i % 2 ? '#4fae5b' : fl[i % fl.length], { flatShading: true }), -0.45 + (i % 3) * 0.45, 0.16, i < 3 ? -0.22 : 0.22));
    world.add(g);
  }
  // 前步道上的花拱門
  const arch = new THREE.Group(); arch.position.set(0, 0.13, 3.0);
  arch.add(k.mesh(k.g('arch', () => new THREE.TorusGeometry(0.78, 0.05, 8, 24, Math.PI)), k.m('#ffffff'), 0, 0.72, 0));
  for (const x of [-0.78, 0.78]) arch.add(k.mesh(k.g('apost', () => new THREE.CylinderGeometry(0.05, 0.05, 0.72, 6)), k.m('#ffffff'), x, 0.36, 0));
  for (let i = 0; i <= 12; i++) { const a = i / 12 * Math.PI; arch.add(k.mesh(k.g('abloom', () => new THREE.IcosahedronGeometry(0.075, 0)), k.m(fl[i % fl.length], { flatShading: true }), Math.cos(a) * 0.78, 0.72 + Math.sin(a) * 0.78, 0.04)); }
  world.add(arch);
  // 向日葵
  for (let i = 0; i < (k.mobile ? 3 : 6); i++) {
    const p = L.spot(k.rnd, { rad: 0.2, h: 1.3 }); if (!p) continue;
    const g = new THREE.Group(); g.position.set(p.x, 0.13, p.z); faceTo(g, 0, 8);
    g.add(k.mesh(k.g('sstem', () => new THREE.CylinderGeometry(0.025, 0.03, 1.1, 5)), k.m('#4f9a3f'), 0, 0.55, 0));
    const head = k.mesh(k.g('shead', () => new THREE.CylinderGeometry(0.2, 0.2, 0.05, 14)), k.m('#ffcf2e'), 0, 1.12, 0.04); head.rotation.x = Math.PI / 2 - 0.3;
    const mid = k.mesh(k.g('smid', () => new THREE.CylinderGeometry(0.1, 0.1, 0.06, 12)), k.m('#6b4a2a'), 0, 1.13, 0.07); mid.rotation.x = head.rotation.x;
    g.add(head, mid); world.add(g);
  }
  // 小花盆
  for (let i = 0; i < (k.mobile ? 6 : 12); i++) { const p = L.spot(k.rnd, { rad: 0.16 }); if (!p) continue; world.add(k.mesh(k.g('pot2', () => new THREE.CylinderGeometry(0.11, 0.08, 0.14, 8)), k.m('#c2734a'), p.x, 0.2, p.z)); world.add(k.mesh(k.g('pbloom', () => new THREE.IcosahedronGeometry(0.12, 0)), k.m(fl[i % fl.length], { flatShading: true }), p.x, 0.35, p.z)); }
  // 蝴蝶
  const wingG = k.g('wing', () => { const g = new THREE.CircleGeometry(0.09, 6); g.translate(0.09, 0, 0); return g; });
  for (let i = 0; i < (k.mobile ? 3 : 7); i++) {
    const b = new THREE.Group(); const m = new THREE.MeshBasicMaterial({ color: C(fl[(i + 1) % fl.length]), side: THREE.DoubleSide });
    const wl = new THREE.Mesh(wingG, m), wr = new THREE.Mesh(wingG, m); wr.rotation.y = Math.PI; b.add(wl, wr); world.add(b);
    const cx = (fp || gp || { x: 2.8 }).x * (i % 2 ? 1 : -1) * 0.9, cz = 0.5 + k.rnd(), ph = k.rnd() * 6, rr = 0.6 + k.rnd() * 0.8;
    k.anim.push((t) => { const a = t * 0.5 + ph; b.position.set(cx + Math.sin(a) * rr, 0.6 + Math.sin(t * 1.7 + ph) * 0.25, cz + Math.sin(a * 1.6) * rr * 0.7); b.rotation.y = a; const f = Math.sin(t * 16 + ph) * 1.1; wl.rotation.y = f; wr.rotation.y = Math.PI - f; });
  }
  plantTrees(k, L, world, k.mobile ? 5 : 9, ['blossom', 'round', 'blossom']);
  return { spots, deco: 'flowerbox' };
}

function resort(k, L, world, pal) {
  const spots = [];
  // 泳池（水面會閃）＋泡在水裡的人
  const pp = L.place(k.rnd, 0.95);
  if (pp) {
    const g = new THREE.Group(); g.position.set(pp.x, 0.13, pp.z); faceTo(g);
    g.add(k.mesh(k.g('pedge', () => new THREE.BoxGeometry(1.5, 0.12, 1.05)), k.m('#fbf7f0', { roughness: 0.5 }), 0, 0.06, 0, false));
    const wt = k.tex(128, 128, (c, w, h) => { c.fillStyle = '#4fd3e6'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 3; for (let i = 0; i < 9; i++) { c.beginPath(); for (let x = 0; x <= w; x += 8) c.lineTo(x, i * 15 + Math.sin(x * 0.12 + i) * 5); c.stroke(); } });
    wt.wrapS = wt.wrapT = THREE.RepeatWrapping;
    const water = k.mesh(k.g('pwater', () => new THREE.PlaneGeometry(1.3, 0.85)), new THREE.MeshStandardMaterial({ map: wt, roughness: 0.1, emissive: k.night ? 0x1a8aa0 : 0x000000, emissiveIntensity: 0.8 }), 0, 0.125, 0, false);
    water.rotation.x = -Math.PI / 2; g.add(water);
    k.anim.push((t) => { wt.offset.set(t * 0.03, t * 0.05); });
    world.add(g);
    spots.push({ x: pp.x + 0.25, z: pp.z, face: [pp.x - 1, pp.z + 1], pose: 'swim', y: 0.13 });
  }
  // 沙灘陽傘＋躺椅
  const loungerG = k.g('lounger', () => new THREE.BoxGeometry(0.34, 0.06, 0.85));
  for (let i = 0; i < (k.mobile ? 2 : 4); i++) {
    const p = L.spot(k.rnd, { zone: 'beach', rad: 0.45, h: 1.5 }); if (!p) continue;
    const y = L.ground(p.x, p.z);
    const u = umbrella(k, p.x, p.z, pal[i % 6], { h: 1.4, r: 0.65 }); u.position.y = y; u.rotation.z = 0.12; world.add(u);
    const ax = p.x + Math.cos(p.th) * 0.35, az = p.z - Math.sin(p.th) * 0.35;
    const l = k.mesh(loungerG, k.m(i % 2 ? '#ffffff' : hex(pal[(i + 1) % 6])), ax, y + 0.12, az); l.rotation.y = p.th; world.add(l);
    if (i === 0) spots.push({ x: ax, z: az, face: [Math.sin(p.th) * 30, Math.cos(p.th) * 30], pose: 'sit', y: y + 0.15, hat: 'sun' });
  }
  // 衝浪板、海灘球
  for (let i = 0; i < 2; i++) { const p = L.spot(k.rnd, { zone: 'beach', rad: 0.2, h: 1.0 }); if (!p) continue; const b = k.mesh(k.g('surf', () => { const g = new THREE.SphereGeometry(0.5, 12, 8); g.scale(0.28, 1, 0.06); return g; }), k.m(hex(pal[(i + 3) % 6]), { roughness: 0.3 }), p.x, L.ground(p.x, p.z) + 0.4, p.z); b.rotation.set(0.15, p.th, 0.1); world.add(b); }
  const bp = L.spot(k.rnd, { zone: 'beach', rad: 0.2 });
  if (bp) { const tex = k.stripes('#ff5a5a', '#ffffff', 6); world.add(k.mesh(k.g('ball', () => new THREE.SphereGeometry(0.16, 16, 12)), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 }), bp.x, L.ground(bp.x, bp.z) + 0.16, bp.z)); }
  plantTrees(k, L, world, k.mobile ? 5 : 9, ['palm', 'palm', 'palm', 'round']);
  plantTrees(k, L, world, k.mobile ? 1 : 3, ['palm'], { zone: 'beach' });
  bushes(k, L, world, k.mobile ? 6 : 12, ['#3fae4f', '#ff8fb1', '#ffd36e']);
  return { spots };
}

function farm(k, L, world, pal) {
  const spots = [];
  let first = null;
  const fenceM = k.m('#f4ead8');
  // 菜田：一畦一畦（高麗菜、玉米、紅蘿蔔），有農夫在除草
  const crops = [['#7cc46a', 'ball'], ['#e9c94a', 'corn'], ['#4f9a3f', 'tuft']];
  for (let i = 0; i < 2; i++) {
    const p = L.place(k.rnd, 0.95, 0, { away: first }); if (!p) continue; first = first || p;
    const g = new THREE.Group(); g.position.set(p.x, 0.13, p.z); faceTo(g);
    g.add(k.mesh(k.g('field', () => new THREE.BoxGeometry(1.5, 0.05, 1.5)), k.m(k.night ? '#4a3a2a' : '#8a6440'), 0, 0.025, 0, false));
    const [cc, kind] = crops[(i + Math.floor(k.rnd() * 3)) % 3];
    const geo = kind === 'corn' ? k.g('corn', () => new THREE.ConeGeometry(0.07, 0.5, 5)) : kind === 'tuft' ? k.g('tuft', () => new THREE.ConeGeometry(0.06, 0.2, 4)) : k.g('cab', () => new THREE.IcosahedronGeometry(0.1, 1));
    const n = 25, inst = new THREE.InstancedMesh(geo, k.m(cc, { flatShading: true }), n), mtx = new THREE.Matrix4(), q = new THREE.Quaternion();
    for (let j = 0; j < n; j++) { const r = Math.floor(j / 5), c = j % 5; mtx.compose(new THREE.Vector3(-0.56 + c * 0.28, kind === 'corn' ? 0.28 : 0.1, -0.56 + r * 0.28), q, new THREE.Vector3(1, 0.85 + k.rnd() * 0.3, 1)); inst.setMatrixAt(j, mtx); }
    inst.castShadow = true; g.add(inst);
    // 圍籬（面向廣場那邊留開口）
    for (const [x0, z0, x1, z1] of [[-0.8, -0.8, 0.8, -0.8], [-0.8, -0.8, -0.8, 0.8], [0.8, -0.8, 0.8, 0.8]]) {
      const len = Math.hypot(x1 - x0, z1 - z0), rot = Math.atan2(x1 - x0, z1 - z0);
      for (let s = 0; s <= 4; s++) g.add(k.mesh(k.g('fpost', () => new THREE.BoxGeometry(0.05, 0.32, 0.05)), fenceM, x0 + (x1 - x0) * s / 4, 0.16, z0 + (z1 - z0) * s / 4));
      const rail = k.mesh(k.g('frail' + len.toFixed(2), () => new THREE.BoxGeometry(0.03, 0.04, len)), fenceM, (x0 + x1) / 2, 0.24, (z0 + z1) / 2); rail.rotation.y = rot; g.add(rail);
    }
    world.add(g);
    if (i === 0) spots.push({ x: p.x + Math.cos(g.rotation.y) * 0.2, z: p.z - Math.sin(g.rotation.y) * 0.2, face: [p.x, p.z + 3], pose: 'work', hat: 'straw', y: 0.18 });
    else { // 稻草人
      const s = new THREE.Group(); s.position.set(p.x, 0.13, p.z);
      s.add(k.mesh(k.g('scpole', () => new THREE.CylinderGeometry(0.025, 0.025, 1.1, 5)), k.m('#8a5a3a'), 0, 0.55, 0));
      s.add(k.mesh(k.g('scarm', () => new THREE.BoxGeometry(0.7, 0.05, 0.05)), k.m('#c94a3a'), 0, 0.85, 0));
      s.add(k.mesh(k.g('schead', () => new THREE.SphereGeometry(0.12, 10, 8)), k.m('#e9d39a'), 0, 1.1, 0));
      s.add(k.mesh(k.g('schat', () => new THREE.ConeGeometry(0.2, 0.16, 10)), k.m('#d9b65f'), 0, 1.24, 0));
      faceTo(s); world.add(s);
    }
  }
  // 紅穀倉＋筒倉
  const bp = L.spot(k.rnd, { zone: 'outer', rad: 0.7, h: 1.6 }) || L.place(k.rnd, 0.7, 1.6, { zone: 'any' });
  if (bp) {
    const g = new THREE.Group(); g.position.set(bp.x, 0.13, bp.z); faceTo(g, 0, 0);
    const redM = k.m('#c2453a', { roughness: 0.75 });
    g.add(k.mesh(k.g('barnb', () => new THREE.BoxGeometry(0.95, 0.7, 0.8)), redM, 0, 0.35, 0));
    const s = new THREE.Shape(); [[-0.52, 0], [-0.46, 0.3], [0, 0.55], [0.46, 0.3], [0.52, 0]].forEach(([u, v], i) => (i ? s.lineTo(u, v) : s.moveTo(u, v)));
    const rg = new THREE.ExtrudeGeometry(s, { depth: 1.05, bevelEnabled: false }); rg.translate(0, 0, -0.525); rg.rotateY(Math.PI / 2);
    g.add(k.mesh(rg, [redM, k.m('#5a4a44', { flatShading: true })], 0, 0.7, 0));
    g.add(k.mesh(k.g('barnd', () => new THREE.BoxGeometry(0.36, 0.46, 0.03)), k.m('#ffffff'), 0, 0.23, 0.41, false));
    g.add(k.mesh(k.g('silo', () => new THREE.CylinderGeometry(0.24, 0.24, 1.2, 14)), k.m('#d9dde0', { metalness: 0.3, roughness: 0.5 }), 0.72, 0.6, -0.1));
    g.add(k.mesh(k.g('silod', () => new THREE.SphereGeometry(0.24, 14, 8, 0, TAU, 0, Math.PI / 2)), k.m('#c2453a'), 0.72, 1.2, -0.1));
    world.add(g);
  }
  // 牛（會慢慢走、低頭吃草）
  for (let i = 0; i < (k.mobile ? 1 : 2); i++) {
    const p = L.spot(k.rnd, { zone: 'outer', rad: 0.7 }) || L.spot(k.rnd, { rad: 0.7 }); if (!p) continue;
    const cow = new THREE.Group(); const white = k.m('#fbf7f0'), black = k.m('#2b2b2b');
    cow.add(k.mesh(k.g('cowb', () => new THREE.BoxGeometry(0.34, 0.3, 0.62)), white, 0, 0.42, 0));
    cow.add(k.mesh(k.g('cows', () => new THREE.BoxGeometry(0.35, 0.16, 0.2)), black, 0, 0.5, -0.08, false));
    const head = new THREE.Group(); head.position.set(0, 0.52, 0.34); cow.add(head);
    head.add(k.mesh(k.g('cowh', () => new THREE.BoxGeometry(0.2, 0.2, 0.22)), white, 0, 0, 0.08));
    head.add(k.mesh(k.g('cowm', () => new THREE.BoxGeometry(0.2, 0.1, 0.06)), k.m('#f2a6a6'), 0, -0.05, 0.2, false));
    for (const x of [-0.12, 0.12]) head.add(k.mesh(k.g('horn', () => new THREE.ConeGeometry(0.025, 0.08, 5)), k.m('#e9e0c8'), x, 0.12, 0.02, false));
    for (const [x, z] of [[-0.11, -0.22], [0.11, -0.22], [-0.11, 0.22], [0.11, 0.22]]) cow.add(k.mesh(k.g('cowl', () => new THREE.BoxGeometry(0.07, 0.28, 0.07)), white, x, 0.14, z));
    cow.position.set(p.x, 0.13, p.z); world.add(cow);
    const home = [p.x, p.z]; let tx = p.x, tz = p.z, wait = 2, last = 0;
    k.anim.push((t) => {
      const dt = Math.min(0.05, t - last); last = t;
      const dx = tx - cow.position.x, dz = tz - cow.position.z, d = Math.hypot(dx, dz);
      if (d > 0.03) { cow.position.x += dx / d * 0.12 * dt; cow.position.z += dz / d * 0.12 * dt; cow.rotation.y = Math.atan2(dx, dz); head.rotation.x = 0; }
      else { head.rotation.x = 0.5 + Math.sin(t * 2) * 0.15; wait -= dt; if (wait < 0) { const a = k.rnd() * TAU; tx = home[0] + Math.sin(a) * 0.35; tz = home[1] + Math.cos(a) * 0.35; wait = 3 + k.rnd() * 3; } }
    });
  }
  // 乾草捆、蜂箱
  for (let i = 0; i < 3; i++) { const p = L.spot(k.rnd, { rad: 0.25 }); if (!p) continue; const h = k.mesh(k.g('hay', () => new THREE.CylinderGeometry(0.2, 0.2, 0.3, 14)), k.m('#e2c15a', { roughness: 1 }), p.x, 0.33, p.z); h.rotation.set(Math.PI / 2, 0, k.rnd() * 3); world.add(h); }
  for (let i = 0; i < 2; i++) {
    const p = L.spot(k.rnd, { rad: 0.2 }); if (!p) continue;
    const g = new THREE.Group(); g.position.set(p.x, 0.13, p.z);
    [0, 1, 2].forEach(j => g.add(k.mesh(k.g('hive', () => new THREE.BoxGeometry(0.3, 0.13, 0.26)), k.m(j === 1 ? '#ffd34e' : '#fbf7f0'), 0, 0.07 + j * 0.135, 0)));
    world.add(g);
    const bees = []; for (let j = 0; j < 3; j++) { const b = k.mesh(k.g('bee', () => new THREE.SphereGeometry(0.03, 6, 4)), k.m('#2b2b2b'), 0, 0, 0, false); g.add(b); bees.push(b); }
    k.anim.push((t) => bees.forEach((b, j) => { const a = t * (2 + j * 0.5) + j * 2; b.position.set(Math.sin(a) * 0.35, 0.45 + Math.sin(t * 3 + j) * 0.1, Math.cos(a * 1.3) * 0.3); }));
  }
  plantTrees(k, L, world, k.mobile ? 4 : 8, ['round', 'round', 'pine']);
  bushes(k, L, world, k.mobile ? 5 : 10, ['#4fae5b', '#6cc163', '#e9c94a']);
  return { spots };
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
  return { spots: out.spots || [], deco: out.deco || null, kit: k };
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
