// 銷售網頁 3D 開場的「城市百貨商圈」場景（像模擬城市）：中間是百貨公司與廣場（商品展台照樣排在廣場的環狀步道上），
// 四周是馬路、紅綠燈、斑馬線、公車站、停車場與一棟棟大樓。車子會跟車、遇紅燈停下；公車到站下客；
// 有人開車來停車、走進百貨、提著購物袋出來再開走；有人等綠燈過馬路；百貨裡每層樓都有人在逛、搭手扶梯、在櫃台結帳。
// 依業主代號決定大樓配置；手機減少車輛與大樓。
import * as THREE from 'three';
import { TENANT } from '../tenant.js';
import { makeLayout, kit, tree, bench, lamp, faceTo } from './island-scenes.js';

const TAU = Math.PI * 2;
const C = (c) => new THREE.Color(c);
const hex = (c) => '#' + C(c).getHexString();
const turn = (a, b, k) => { const d = ((b - a) % TAU + TAU * 1.5) % TAU - Math.PI; return a + d * Math.min(1, k); };
const angDist = (a, b) => Math.abs(((a - b) % TAU + TAU * 1.5) % TAU - Math.PI);

// ---------- 城市尺寸 ----------
const BLOCK = { x0: -10.2, x1: 10.2, z0: -11.0, z1: 10.2 };      // 百貨所在的街廓（人行道高 0.12）
const ROAD_W = 2.4;                                                  // 雙向兩線道
const ROADS_X = [-25, -11.4, 11.4, 25], ROADS_Z = [-26, -12.2, 11.4, 25];
const STORE = { x0: -4.8, x1: 4.8, z0: -10.4, z1: -6.4, floors: 5, fh: 1.3 };
const LOT = { x0: 5.6, x1: 9.9, z0: -10.7, z1: -5.4 };              // 停車場
const ANNEX = { x0: -9.9, x1: -5.6, z0: -10.7, z1: -7.0 };          // 百貨旁的辦公大樓
const FLOOR_Y = (f) => 0.13 + f * STORE.fh;
const onRoad = (x, z) => ROADS_X.some(r => Math.abs(x - r) < ROAD_W / 2) || ROADS_Z.some(r => Math.abs(z - r) < ROAD_W / 2);
const inBox = (b, x, z, m = 0) => x > b.x0 - m && x < b.x1 + m && z > b.z0 - m && z < b.z1 + m;

// 城市場景的空地規劃（沿用小島的規則：環狀步道、展台、人物路線、鏡頭視線）
export function cityLayout({ RING, SHOP_Z, stations }) {
  // 過馬路的位置：選在前方兩個展台之間，讓人可以直直走進廣場
  const front = stations.filter(a => Math.abs(a) < 1.4).sort((a, b) => a - b);
  let phi = 0.4;
  if (front.length) { let best = -1; const pts = [-1.4, ...front, 1.4]; for (let i = 0; i < pts.length - 1; i++) { const m = (pts[i] + pts[i + 1]) / 2, gap = pts[i + 1] - pts[i]; const score = gap - Math.abs(m - 0.35) * 0.6; if (score > best) { best = score; phi = m; } } }
  const xc = Math.sin(phi) * RING;
  const door = [0.05, STORE.z1 + 0.35];
  const arcR = (a0, a1, side) => { const out = []; for (let i = 0; i <= 6; i++) { const a = a0 + (a1 - a0) * i / 6; out.push([side * 1.62 * Math.sin(a), 0.9 + 1.62 * Math.cos(a)]); } return out; };
  // 過馬路的人：公車站 → 斑馬線 → 廣場右側 → 百貨大門
  const cross = [[xc + 4.6, 13.15], [xc + 0.35, 13.15], [xc + 0.35, 9.9], [Math.sin(phi) * 6.3, Math.cos(phi) * 6.3], [Math.sin(phi) * RING, Math.cos(phi) * RING], [Math.sin(phi) * 3.3, Math.cos(phi) * 3.3], ...arcR(Math.max(0.3, phi), 2.62, 1), [0.4, -1.2], [0.35, STORE.z1 + 0.6], door];
  // 前步道散步的人（從廣場前端繞到百貨門口）
  const walk = [[-0.32, 3.3], [-0.32, 2.55], ...arcR(0.25, 2.62, -1), [-0.4, -1.2], [-0.45, STORE.z1 + 0.7]];
  // 停車場 → 百貨大門
  const park = [[5.3, -5.4], [2.0, -5.55], [0.6, STORE.z1 + 0.55], door];
  const venue = {
    box: { x0: STORE.x0 - 0.2, x1: STORE.x1 + 0.2, z0: STORE.z0 - 0.2, z1: STORE.z1 + 0.55 },
    keepOut: [LOT, ANNEX, { x0: -1.8, x1: 1.8, z0: STORE.z1, z1: STORE.z1 + 1.2 }],
    inBounds: (x, z, rad) => x - rad > BLOCK.x0 + 0.3 && x + rad < BLOCK.x1 - 0.3 && z - rad > BLOCK.z0 + 0.3 && z + rad < BLOCK.z1 - 0.3,
    walk: [STORE.z1, BLOCK.z1],
    routes: { cross, front: walk, park },
    door, keeper: [-1.45, STORE.z1 + 0.5],
    ground: (x, z) => (onRoad(x, z) && !inBox(BLOCK, x, z) ? 0.03 : 0.13),
  };
  const L = makeLayout({ shore: () => 14, RING, SHOP_Z, stations, venue });
  return Object.assign(L, { xc, phi, city: true });
}

// ---------- 路徑（車道） ----------
function makePath(pts, closed) {
  const P = closed ? [...pts, pts[0]] : pts.slice();
  const cum = [0];
  for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const len = cum[cum.length - 1];
  const at = (s) => {
    s = closed ? ((s % len) + len) % len : Math.max(0, Math.min(len, s));
    let lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
    const a = P[lo], b = P[hi], u = (s - cum[lo]) / ((cum[hi] - cum[lo]) || 1);
    return { x: a[0] + (b[0] - a[0]) * u, z: a[1] + (b[1] - a[1]) * u, h: Math.atan2(b[0] - a[0], b[1] - a[1]) };
  };
  const project = (x, z) => { let best = 1e9, bs = 0; for (let i = 0; i < P.length - 1; i++) { const [ax, az] = P[i], [bx, bz] = P[i + 1]; const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1; const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)); const d = Math.hypot(x - ax - dx * t, z - az - dz * t); if (d < best) { best = d; bs = cum[i] + t * Math.sqrt(l2); } } return bs; };
  return { len, at, project, closed, cars: [] };
}
// 圓角矩形車道：順序 前路往 -x → 左路往 -z → 後路往 +x → 右路往 +z（靠右行駛時街廓在右手邊）；reverse 為反方向
function loop(x0, x1, z0, z1, r, reverse) {
  const pts = [];
  const arc = (cx, cz, a0, a1) => { for (let i = 1; i <= 6; i++) { const a = a0 + (a1 - a0) * i / 6; pts.push([cx + Math.sin(a) * r, cz + Math.cos(a) * r]); } };
  pts.push([x1 - r, z1]); pts.push([x0 + r, z1]); arc(x0 + r, z1 - r, 0, -Math.PI / 2);
  pts.push([x0, z0 + r]); arc(x0 + r, z0 + r, -Math.PI / 2, -Math.PI);
  pts.push([x1 - r, z0]); arc(x1 - r, z0 + r, Math.PI, Math.PI / 2);
  pts.push([x1, z1 - r]); arc(x1 - r, z1 - r, Math.PI / 2, 0);
  pts.pop();
  return makePath(reverse ? pts.reverse() : pts, true);
}

// ---------- 模型 ----------
function canvas(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
function makeCar(k, color, kind = 'car') {
  const g = new THREE.Group(), body = k.m(color, { roughness: 0.35, metalness: 0.2 });
  const glass = k.m('#24313d', { roughness: 0.15, metalness: 0.3 });
  const wheelG = k.g('wheel', () => { const x = new THREE.CylinderGeometry(0.17, 0.17, 0.12, 10); x.rotateZ(Math.PI / 2); return x; });
  const wheelM = k.m('#1f1f22'), wheels = [];
  const head = k.night ? k.glow('#fff4d0', 2.6) : k.m('#f4f1e8', { roughness: 0.3 }), tail = k.glow('#e23b3b', k.night ? 2 : 0.6);
  let len = 2.0;
  if (kind === 'bus') {
    len = 3.6;
    g.add(k.mesh(k.g('busb', () => new THREE.BoxGeometry(1.05, 0.9, 3.6)), body, 0, 0.62, 0));
    g.add(k.mesh(k.g('busw', () => new THREE.BoxGeometry(1.07, 0.3, 3.3)), k.night ? k.glow('#ffe7a8', 1.1) : glass, 0, 0.82, 0.05, false));
    g.add(k.mesh(k.g('buss', () => new THREE.BoxGeometry(1.07, 0.1, 3.62)), k.m('#ffffff'), 0, 0.5, 0, false));
    g.add(k.mesh(k.g('busf', () => new THREE.BoxGeometry(0.9, 0.36, 0.03)), glass, 0, 0.82, 1.8, false));
    for (const z of [-1.2, 1.2]) for (const x of [-0.5, 0.5]) { const w = k.mesh(wheelG, wheelM, x, 0.17, z); g.add(w); wheels.push(w); }
    for (const x of [-0.35, 0.35]) { g.add(k.mesh(k.g('hl', () => new THREE.BoxGeometry(0.18, 0.08, 0.03)), head, x, 0.36, 1.81, false)); g.add(k.mesh(k.g('tl', () => new THREE.BoxGeometry(0.16, 0.08, 0.03)), tail, x, 0.36, -1.81, false)); }
  } else {
    g.add(k.mesh(k.g('carb', () => new THREE.BoxGeometry(0.95, 0.32, 2.0)), body, 0, 0.32, 0));
    g.add(k.mesh(k.g('carc', () => new THREE.BoxGeometry(0.84, 0.28, 1.05)), glass, 0, 0.62, -0.12));
    g.add(k.mesh(k.g('carr', () => new THREE.BoxGeometry(0.86, 0.05, 0.98)), body, 0, 0.78, -0.12, false));
    if (kind === 'taxi') { g.add(k.mesh(k.g('taxis', () => new THREE.BoxGeometry(0.36, 0.1, 0.18)), k.glow('#fff7d6', 1.4), 0, 0.86, -0.12, false)); }
    for (const z of [-0.64, 0.64]) for (const x of [-0.46, 0.46]) { const w = k.mesh(wheelG, wheelM, x, 0.17, z); g.add(w); wheels.push(w); }
    for (const x of [-0.3, 0.3]) { g.add(k.mesh(k.g('hl', () => new THREE.BoxGeometry(0.18, 0.08, 0.03)), head, x, 0.34, 1.0, false)); g.add(k.mesh(k.g('tl', () => new THREE.BoxGeometry(0.16, 0.08, 0.03)), tail, x, 0.34, -1.0, false)); }
  }
  return { group: g, wheels, len, kind };
}
// 窗戶貼圖：白天是玻璃、晚上隨機亮燈（8×8 格一張，依大樓大小重複）
function windowTex(style, night, seed) {
  let a = seed; const r = () => (a = (a * 16807) % 2147483647) / 2147483647;
  const base = { office: '#7fa7c4', apart: '#e8dcc6', brick: '#b5694e', mint: '#cfe5dc' }[style] || '#d8d2c6';
  const day = canvas(256, 256, (g, w) => {
    g.fillStyle = base; g.fillRect(0, 0, w, w);
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
      const x = i * 32, y = j * 32;
      if (style === 'office') { g.fillStyle = `rgba(${200 + r() * 40},${225 + r() * 25},255,0.85)`; g.fillRect(x + 2, y + 3, 28, 24); g.fillStyle = 'rgba(40,70,100,.35)'; g.fillRect(x + 2, y + 27, 28, 2); }
      else { g.fillStyle = r() < 0.15 ? '#5b6b78' : '#9bb7cc'; g.fillRect(x + 8, y + 8, 16, 16); if (style === 'apart' && j % 2) { g.fillStyle = 'rgba(120,110,100,.5)'; g.fillRect(x + 4, y + 24, 24, 4); } }
    }
  });
  day.wrapS = day.wrapT = THREE.RepeatWrapping;
  let lit = null;
  if (night) {
    lit = canvas(256, 256, (g, w) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, w); for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) if (r() < 0.42) { g.fillStyle = r() < 0.7 ? '#ffd88a' : '#cfe8ff'; if (style === 'office') g.fillRect(i * 32 + 2, j * 32 + 3, 28, 24); else g.fillRect(i * 32 + 8, j * 32 + 8, 16, 16); } });
    lit.wrapS = lit.wrapT = THREE.RepeatWrapping;
  }
  return { day, lit };
}
function building(k, tex, w, d, h, roofC, style) {
  const g = new THREE.Group();
  const face = (rx, ry) => { const m = new THREE.MeshStandardMaterial({ map: tex.day.clone(), roughness: style === 'office' ? 0.35 : 0.8, metalness: style === 'office' ? 0.15 : 0 }); m.map.repeat.set(rx, ry); m.map.needsUpdate = true; if (tex.lit) { m.emissiveMap = tex.lit.clone(); m.emissiveMap.repeat.set(rx, ry); m.emissiveMap.needsUpdate = true; m.emissive = C('#ffffff'); m.emissiveIntensity = 1.1; } return m; };
  const fw = face(w / 8, h / 7.2), fd = face(d / 8, h / 7.2), top = k.m(roofC, { roughness: 0.9 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [fd, fd, top, top, fw, fw]); box.position.y = h / 2 + 0.12; box.castShadow = h < 6; box.receiveShadow = true; g.add(box);
  // 屋頂：冷氣、水塔（台灣的屋頂常見）、天線
  if (h > 2) {
    g.add(k.mesh(k.g('ac', () => new THREE.BoxGeometry(0.5, 0.3, 0.4)), k.m('#d9dcdf'), w * 0.2, h + 0.27, -d * 0.15, false));
    if (k.rnd() < 0.6) { const t = k.mesh(k.g('tank', () => new THREE.CylinderGeometry(0.28, 0.28, 0.5, 10)), k.m(k.rnd() < 0.5 ? '#e9eef2' : '#7fb3d5', { metalness: 0.4, roughness: 0.4 }), -w * 0.22, h + 0.5, d * 0.18, false); g.add(t); }
    if (h > 7 && k.rnd() < 0.5) g.add(k.mesh(k.g('ant', () => new THREE.CylinderGeometry(0.03, 0.03, 1.4, 4)), k.m('#888888'), 0, h + 0.82, 0, false));
  } else if (style === 'shop') {
    const aw = k.mesh(new THREE.BoxGeometry(w * 0.9, 0.06, 0.6), k.m(k.pick(['#e07a5f', '#3d8bd3', '#f2c94c', '#4caf7a', '#b07bd3'])), 0, 1.0, d / 2 + 0.28, false); aw.rotation.x = 0.25; g.add(aw);
  }
  return g;
}

// ---------- 建造 ----------
// ctx：{ world, anim, rnd, night, mobile, pal, vars, layout, camPts（鏡頭路線取樣點）, scene, ui }
export function buildCity(ctx) {
  const { world, anim, rnd, night, mobile, pal, vars, layout: L, camPts = [] } = ctx;
  const k = kit(world, anim, rnd, night, mobile);
  const spots = [];
  const wallC = hex(C(vars.card || '#fffaf2').lerp(C('#f3ead9'), 0.3));
  const brand = hex(pal[0]), brandDeep = vars.deep || '#1f3329';

  // 地面、街廓、馬路
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), k.m(night ? '#3a4346' : '#b9bdb2', { roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.01; ground.receiveShadow = true; world.add(ground);
  const plate = (b, color) => { const m = new THREE.Mesh(new THREE.BoxGeometry(b.x1 - b.x0, 0.12, b.z1 - b.z0), k.m(color, { roughness: 0.95 })); m.position.set((b.x0 + b.x1) / 2, 0.06, (b.z0 + b.z1) / 2); m.receiveShadow = true; world.add(m); return m; };
  plate(BLOCK, night ? '#6f6a62' : '#e4dccd');
  const asphalt = k.m(night ? '#2a2e33' : '#5b6066', { roughness: 0.95 });
  const dash = canvas(16, 128, (g) => { g.fillStyle = '#5b6066'; g.fillRect(0, 0, 16, 128); g.fillStyle = '#f2d15c'; g.fillRect(6, 0, 4, 64); });
  dash.wrapS = dash.wrapT = THREE.RepeatWrapping; dash.repeat.set(1, 90 / 2.2);
  const markM = new THREE.MeshStandardMaterial({ map: dash, roughness: 0.9, color: night ? 0x777777 : 0xffffff });
  for (const x of ROADS_X) { const r = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W, 90), asphalt); r.rotation.x = -Math.PI / 2; r.position.set(x, 0.01, 0); r.receiveShadow = true; world.add(r); const m = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 90), markM); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.015, 0); world.add(m); }
  for (const z of ROADS_Z) { const r = new THREE.Mesh(new THREE.PlaneGeometry(90, ROAD_W), asphalt); r.rotation.x = -Math.PI / 2; r.position.set(0, 0.012, z); r.receiveShadow = true; world.add(r); const m = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 90), markM); m.rotation.set(-Math.PI / 2, 0, Math.PI / 2); m.position.set(0, 0.017, z); world.add(m); }
  for (const x of ROADS_X) for (const z of ROADS_Z) { const p = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W, ROAD_W), asphalt); p.rotation.x = -Math.PI / 2; p.position.set(x, 0.02, z); world.add(p); }
  // 四周街廓（人行道板）
  const xs = [[-23.6, -13.0], [BLOCK.x0, BLOCK.x1], [13.0, 23.6]], zs = [[-24.6, -13.6], [BLOCK.z0, BLOCK.z1], [12.8, 23.6]];
  const blocks = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { if (i === 1 && j === 1) continue; const b = { x0: xs[i][0], x1: xs[i][1], z0: zs[j][0], z1: zs[j][1], col: i, row: j }; plate(b, night ? '#5f5f5c' : '#d4d2cb'); blocks.push(b); }
  // 斑馬線＋紅綠燈
  const xc = L.xc, stripeM = k.m(night ? '#bdbdbd' : '#f7f7f2');
  for (let i = 0; i < 7; i++) { const s = new THREE.Mesh(k.g('zebra', () => new THREE.BoxGeometry(0.7, 0.01, 0.2)), stripeM); s.position.set(xc + 0.2, 0.025, 10.45 + i * 0.32); world.add(s); }
  const light = { phase: 0, state: 'go' };
  const lamps = [];
  for (const [x, z, rot] of [[xc - 0.75, 10.0, 0], [xc + 1.1, 12.85, Math.PI]]) {
    const g = new THREE.Group(); g.position.set(x, 0.12, z); g.rotation.y = rot;
    g.add(k.mesh(k.g('tlp', () => new THREE.CylinderGeometry(0.04, 0.05, 1.8, 6)), k.m('#3a3f44'), 0, 0.9, 0));
    g.add(k.mesh(k.g('tlb', () => new THREE.BoxGeometry(0.22, 0.6, 0.18)), k.m('#2b2f33'), 0, 1.75, 0.1));
    const mk = (c, y) => { const m = new THREE.MeshStandardMaterial({ color: C(c), emissive: C(c), emissiveIntensity: 0 }); const b = new THREE.Mesh(k.g('tlbulb', () => new THREE.SphereGeometry(0.06, 8, 6)), m); b.position.set(0, y, 0.2); g.add(b); return m; };
    lamps.push({ r: mk('#ff3b30', 1.93), y: mk('#ffcc00', 1.75), gr: mk('#34c759', 1.57) });
    world.add(g);
  }
  // 號誌：車輛綠燈 10 秒、黃燈 2 秒、紅燈 8 秒（行人可過）
  anim.push((t) => {
    const c = t % 20; light.c = c; light.state = c < 10 ? 'go' : c < 12 ? 'yellow' : 'stop';
    for (const l of lamps) { l.gr.emissiveIntensity = light.state === 'go' ? 2.2 : 0; l.y.emissiveIntensity = light.state === 'yellow' ? 2.2 : 0; l.r.emissiveIntensity = light.state === 'stop' ? 2.2 : 0; }
  });
  // 公車站
  const busX = xc + 4.6;
  { const g = new THREE.Group(); g.position.set(busX, 0.12, 13.55);
    g.add(k.mesh(k.g('bsr', () => new THREE.BoxGeometry(1.8, 0.06, 0.7)), k.m(brand), 0, 1.15, 0));
    for (const x of [-0.85, 0.85]) g.add(k.mesh(k.g('bsp', () => new THREE.BoxGeometry(0.05, 1.15, 0.05)), k.m('#3a3f44'), x, 0.58, -0.25));
    g.add(k.mesh(k.g('bsw', () => new THREE.BoxGeometry(1.8, 0.9, 0.03)), new THREE.MeshStandardMaterial({ color: 0xdff2ff, transparent: true, opacity: 0.4 }), 0, 0.6, -0.3, false));
    g.add(k.mesh(k.g('bsb', () => new THREE.BoxGeometry(1.2, 0.06, 0.3)), k.m('#a8754a'), 0, 0.32, -0.12));
    world.add(g); }

  // ---------- 百貨公司 ----------
  const store = new THREE.Group(); world.add(store);
  const W = STORE.x1 - STORE.x0, D = STORE.z1 - STORE.z0, H = STORE.floors * STORE.fh, cz = (STORE.z0 + STORE.z1) / 2;
  const wallM = k.m(wallC, { roughness: 0.7 }), bandM = k.m(brand, { roughness: 0.5 }), frameM = k.m('#e9ecef', { roughness: 0.4, metalness: 0.3 });
  // 側牆、後牆、屋頂
  store.add(k.mesh(new THREE.BoxGeometry(0.2, H, D), wallM, STORE.x0 + 0.1, 0.12 + H / 2, cz));
  store.add(k.mesh(new THREE.BoxGeometry(0.2, H, D), wallM, STORE.x1 - 0.1, 0.12 + H / 2, cz));
  store.add(k.mesh(new THREE.BoxGeometry(W, H, 0.2), wallM, 0, 0.12 + H / 2, STORE.z0 + 0.1));
  store.add(k.mesh(new THREE.BoxGeometry(W + 0.2, 0.25, D + 0.2), k.m('#d6d2c8'), 0, 0.12 + H + 0.12, cz));
  // 樓板（2 樓在手扶梯上方留洞）、天花燈、後方貨架
  const slabM = k.m('#f3efe8', { roughness: 0.6 }), rackCs = [brand, hex(pal[1]), hex(pal[2]), hex(pal[3]), '#ffffff'];
  const ESC = { x0: 1.9, x1: 3.7, z: -7.7, w: 0.55 };
  const slab = (x0, x1, z0, z1, y) => store.add(k.mesh(new THREE.BoxGeometry(x1 - x0, 0.12, z1 - z0), slabM, (x0 + x1) / 2, y - 0.06, (z0 + z1) / 2, false));
  const innerX0 = STORE.x0 + 0.2, innerX1 = STORE.x1 - 0.2, innerZ0 = STORE.z0 + 0.2, innerZ1 = STORE.z1;
  for (let f = 0; f < STORE.floors; f++) {
    const y = FLOOR_Y(f);
    if (f === 1) { slab(innerX0, innerX1, innerZ0, ESC.z - ESC.w / 2, y); slab(innerX0, innerX1, ESC.z + ESC.w / 2, innerZ1, y); slab(innerX0, ESC.x0, ESC.z - ESC.w / 2, ESC.z + ESC.w / 2, y); slab(ESC.x1 + 0.1, innerX1, ESC.z - ESC.w / 2, ESC.z + ESC.w / 2, y); }
    else if (f > 0) slab(innerX0, innerX1, innerZ0, innerZ1, y);
    const lightM = night ? k.glow('#fff6dc', 1.6) : k.m('#fffdf6', { emissive: C('#fffdf6'), emissiveIntensity: 0.35 });
    for (const x of [-3, -1, 1, 3]) store.add(k.mesh(k.g('ceil', () => new THREE.BoxGeometry(1.2, 0.03, 0.4)), lightM, x, y + STORE.fh - 0.08, -7.6, false));
    for (let i = 0; i < 6; i++) { const rx = innerX0 + 0.6 + i * 1.45; const r = k.mesh(k.g('rack', () => new THREE.BoxGeometry(1.1, 0.7, 0.35)), k.m(rackCs[(i + f) % rackCs.length], { roughness: 0.6 }), rx, y + 0.35, innerZ0 + 0.4); store.add(r); }
    if (f > 0) for (let i = 0; i < 3; i++) store.add(k.mesh(k.g('table', () => new THREE.BoxGeometry(0.9, 0.35, 0.5)), k.m(rackCs[(i + f + 2) % rackCs.length]), -3.2 + i * 2.2, y + 0.18, -8.6));
  }
  // 手扶梯（1F → 2F）
  { const len = Math.hypot(ESC.x1 - ESC.x0, STORE.fh), ang = Math.atan2(STORE.fh, ESC.x1 - ESC.x0);
    const steps = canvas(64, 16, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#9aa3ab' : '#c9d0d6'; g.fillRect(i * 8, 0, 8, 16); } }); steps.wrapS = THREE.RepeatWrapping; steps.repeat.set(len * 3, 1);
    const e = new THREE.Mesh(new THREE.BoxGeometry(len, 0.12, ESC.w), [k.m('#8d969e'), k.m('#8d969e'), new THREE.MeshStandardMaterial({ map: steps, roughness: 0.5 }), k.m('#8d969e'), k.m('#8d969e'), k.m('#8d969e')]);
    e.position.set((ESC.x0 + ESC.x1) / 2, FLOOR_Y(0) + STORE.fh / 2 - 0.06, ESC.z); e.rotation.z = ang; store.add(e);
    for (const dz of [-1, 1]) { const rail = k.mesh(new THREE.BoxGeometry(len, 0.3, 0.04), new THREE.MeshStandardMaterial({ color: 0xdff2ff, transparent: true, opacity: 0.5 }), (ESC.x0 + ESC.x1) / 2, FLOOR_Y(0) + STORE.fh / 2 + 0.15, ESC.z + dz * ESC.w / 2, false); rail.rotation.z = ang; store.add(rail); }
    anim.push((t) => { steps.offset.x = -t * 0.6; });
  }
  // 1F 收銀台
  store.add(k.mesh(new THREE.BoxGeometry(1.4, 0.55, 0.5), k.m(brand), -2.9, FLOOR_Y(0) + 0.28, -7.9));
  store.add(k.mesh(new THREE.BoxGeometry(0.3, 0.2, 0.25), k.m('#2b2f33'), -2.5, FLOOR_Y(0) + 0.65, -7.9, false));
  // 正面：每層玻璃帷幕、品牌色樓層帶、直框
  const glassM = new THREE.MeshStandardMaterial({ color: 0xd8eefc, transparent: true, opacity: night ? 0.18 : 0.28, roughness: 0.05, metalness: 0.2, depthWrite: false });
  for (let f = 0; f < STORE.floors; f++) {
    const y = FLOOR_Y(f);
    store.add(k.mesh(new THREE.BoxGeometry(W, STORE.fh - 0.22, 0.04), glassM, 0, y + 0.22 + (STORE.fh - 0.22) / 2, STORE.z1 + 0.02, false));
    if (f > 0) store.add(k.mesh(new THREE.BoxGeometry(W + 0.1, 0.24, 0.16), f % 2 ? bandM : frameM, 0, y + 0.06, STORE.z1 + 0.06));
  }
  for (let i = 0; i <= 8; i++) store.add(k.mesh(k.g('mull', () => new THREE.BoxGeometry(0.07, H, 0.08)), frameM, STORE.x0 + i * W / 8, 0.12 + H / 2, STORE.z1 + 0.06, false));
  // 大招牌（店名）、側邊直立旗幟、屋頂廣告牌
  const name = TENANT.name || '';
  const signT = canvas(1024, 160, (g, w, h) => { g.fillStyle = brandDeep; g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff'; let fs = 96; const font = (n) => `800 ${n}px "Noto Sans TC", system-ui, sans-serif`; g.font = font(fs); while (g.measureText(name).width > w - 80 && fs > 30) { fs -= 6; g.font = font(fs); } g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name, w / 2, h / 2 + 4); });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.95, 0.14), [k.m('#333333'), k.m('#333333'), k.m('#333333'), k.m('#333333'), new THREE.MeshBasicMaterial({ map: signT, toneMapped: false }), k.m('#333333')]);
  sign.position.set(0, 0.12 + H + 0.7, STORE.z1 - 0.2); store.add(sign);
  for (const x of [STORE.x0 + 0.35, STORE.x1 - 0.35]) { const fl = k.mesh(new THREE.BoxGeometry(0.5, 2.4, 0.04), k.m(hex(pal[2]), { roughness: 0.7 }), x, 0.12 + H - 1.6, STORE.z1 + 0.18, false); store.add(fl); }
  const av = canvas(256, 256, (g, w) => { g.fillStyle = brand; g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 6, 0, TAU); g.fill(); g.fillStyle = '#ffffff'; g.font = '800 150px "Noto Sans TC", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(TENANT.avatar || name.slice(0, 1), w / 2, w / 2 + 8); });
  const bill = new THREE.Mesh(new THREE.CircleGeometry(0.9, 32), new THREE.MeshBasicMaterial({ map: av, toneMapped: false, side: THREE.DoubleSide }));
  bill.position.set(STORE.x1 - 1.4, 0.12 + H + 1.6, cz + 0.6); store.add(bill);
  store.add(k.mesh(new THREE.BoxGeometry(0.08, 1.2, 0.08), k.m('#555b60'), STORE.x1 - 1.4, 0.12 + H + 0.7, cz + 0.6));
  for (const [x, z] of [[-2.8, -9.2], [-1.6, -9.4], [2.6, -9.0]]) store.add(k.mesh(k.g('ac', () => new THREE.BoxGeometry(0.5, 0.3, 0.4)), k.m('#d9dcdf'), x, 0.12 + H + 0.4, z, false));
  // 大門雨遮＋自動門（有人靠近就打開）
  const canopy = k.mesh(new THREE.BoxGeometry(3.4, 0.12, 1.1), bandM, 0, 1.25, STORE.z1 + 0.55); store.add(canopy);
  const doorM = new THREE.MeshStandardMaterial({ color: 0xcfeaff, transparent: true, opacity: 0.45, roughness: 0.05, depthWrite: false });
  const dl = k.mesh(new THREE.BoxGeometry(0.62, 1.0, 0.04), doorM, -0.31, 0.62, STORE.z1 + 0.08, false), dr = dl.clone(); dr.position.x = 0.31; store.add(dl, dr);
  // 1F 櫥窗：假人模特兒
  const manM = k.m('#f4f1ec', { roughness: 0.4 });
  for (const x of [-3.8, -2.0, 2.0, 3.8]) { const g = new THREE.Group(); g.position.set(x, FLOOR_Y(0), STORE.z1 - 0.35);
    g.add(k.mesh(k.g('manb', () => new THREE.CapsuleGeometry(0.12, 0.35, 4, 8)), k.m(rackCs[Math.abs(Math.round(x)) % rackCs.length]), 0, 0.55, 0));
    g.add(k.mesh(k.g('manh', () => new THREE.SphereGeometry(0.1, 10, 8)), manM, 0, 0.92, 0));
    g.add(k.mesh(k.g('manl', () => new THREE.CylinderGeometry(0.03, 0.03, 0.35, 5)), manM, 0, 0.17, 0)); store.add(g); }
  let doorOpen = 0;
  if (night) { const pl = new THREE.PointLight(0xffe2a8, 5, 8); pl.position.set(0, 1.4, STORE.z1 + 1.0); store.add(pl); }

  // 旁邊的辦公大樓
  { const tex = windowTex('office', night, 77); const b = building(k, tex, ANNEX.x1 - ANNEX.x0 - 0.3, ANNEX.z1 - ANNEX.z0 - 0.3, 8.5, '#9aa3ab', 'office'); b.position.set((ANNEX.x0 + ANNEX.x1) / 2, 0, (ANNEX.z0 + ANNEX.z1) / 2); world.add(b); }
  // 停車場：格線＋停好的車
  const lotM = new THREE.Mesh(new THREE.BoxGeometry(LOT.x1 - LOT.x0, 0.02, LOT.z1 - LOT.z0), k.m(night ? '#33373b' : '#6b7076', { roughness: 0.95 })); lotM.position.set((LOT.x0 + LOT.x1) / 2, 0.125, (LOT.z0 + LOT.z1) / 2); lotM.receiveShadow = true; world.add(lotM);
  const SLOT_X = [6.25, 7.4, 8.55], ROW_Z = [-9.6, -6.4], AISLE = -8.0;
  for (const x of SLOT_X) for (const z of ROW_Z) for (const dx of [-0.57, 0.57]) { const l = new THREE.Mesh(k.g('pline', () => new THREE.BoxGeometry(0.05, 0.01, 1.8)), stripeM); l.position.set(x + dx, 0.14, z); world.add(l); }
  const driveway = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.02, 2.0), asphalt); driveway.position.set(10.15, 0.125, AISLE + 0.3); world.add(driveway);
  const carCs = ['#e8e8e8', '#2b2f33', '#c0392b', '#2e86de', '#f1c40f', '#7f8c8d', '#16a085', '#d35400', '#8e44ad', '#fdfdfd'];
  const free = [];
  SLOT_X.forEach((x, i) => ROW_Z.forEach((z, j) => { if ((i + j) % 3 === 1 && free.length < (mobile ? 1 : 2)) { free.push({ x, z }); return; } if (rnd() < 0.75) { const c = makeCar(k, k.pick(carCs)); c.group.position.set(x, 0.13, z); c.group.rotation.y = z < AISLE ? Math.PI : 0; world.add(c.group); } }));

  // 街道設施：路燈、行道樹、長椅、花台（避開步道與展台）
  for (let i = 0; i < (mobile ? 8 : 14); i++) { const along = i / (mobile ? 8 : 14); const per = 2 * (BLOCK.x1 - BLOCK.x0) + 2 * (BLOCK.z1 - BLOCK.z0); let d = along * per, x, z; const wx = BLOCK.x1 - BLOCK.x0, wz = BLOCK.z1 - BLOCK.z0; if (d < wx) { x = BLOCK.x0 + d; z = BLOCK.z1 - 0.35; } else if ((d -= wx) < wz) { x = BLOCK.x1 - 0.35; z = BLOCK.z1 - d; } else if ((d -= wz) < wx) { x = BLOCK.x1 - d; z = BLOCK.z0 + 0.35; } else { d -= wx; x = BLOCK.x0 + 0.35; z = BLOCK.z0 + d; } if (inBox(LOT, x, z, 0.3) || inBox(ANNEX, x, z, 0.3) || Math.abs(x - xc) < 1.4) continue; world.add(lamp(k, x, z, '#ffe6a8')); }
  for (let i = 0; i < (mobile ? 5 : 9); i++) { const p = L.spot(rnd, { zone: i < 2 ? 'inner' : 'outer', rad: 0.45, h: 1.6 }); if (p) world.add(tree(k, p.x, p.z, k.pick(['round', 'round', 'blossom']), 0.8 + rnd() * 0.3)); }
  for (let i = 0; i < 3; i++) { const p = L.spot(rnd, { rad: 0.55 }); if (!p) continue; const b = bench(k, p.x, p.z); faceTo(b); world.add(b); if (i === 0) spots.push({ x: p.x + Math.sin(b.rotation.y) * 0.05, z: p.z + Math.cos(b.rotation.y) * 0.05, face: [p.x + Math.sin(b.rotation.y) * 2, p.z + Math.cos(b.rotation.y) * 2], pose: 'sit', y: 0.48, prop: 'bag' }); }
  // 廣場上的噴水池（原本小島店舖的位置）
  { const p = L.place(rnd, 1.0, 0.8); if (p) { const g = new THREE.Group(); g.position.set(p.x, 0.13, p.z);
    g.add(k.mesh(k.g('fpool', () => new THREE.CylinderGeometry(0.95, 1.0, 0.25, 28)), k.m('#d6d2c8'), 0, 0.12, 0));
    const wtr = k.mesh(k.g('fw', () => new THREE.CylinderGeometry(0.85, 0.85, 0.05, 28)), k.m('#5fc9e0', { roughness: 0.1, emissive: night ? C('#1a6a80') : C('#000000') }), 0, 0.24, 0, false); g.add(wtr);
    const jet = k.mesh(k.g('fjet', () => new THREE.CylinderGeometry(0.03, 0.08, 0.8, 8)), new THREE.MeshStandardMaterial({ color: 0xe8fbff, transparent: true, opacity: 0.7 }), 0, 0.65, 0, false); g.add(jet);
    anim.push((t) => { jet.scale.y = 1 + Math.sin(t * 3) * 0.12; });
    world.add(g); } }
  // 前方花台
  for (let i = 0; i < 4; i++) { const p = L.spot(rnd, { rad: 0.35 }); if (!p) continue; const g = new THREE.Group(); g.position.set(p.x, 0.13, p.z); g.add(k.mesh(k.g('cplant', () => new THREE.BoxGeometry(0.7, 0.3, 0.7)), k.m('#bfb6a6'), 0, 0.15, 0)); g.add(k.mesh(k.g('cbush', () => new THREE.IcosahedronGeometry(0.33, 0)), k.m(night ? '#2f6b3a' : '#4fae5b', { flatShading: true }), 0, 0.45, 0)); world.add(g); }

  // ---------- 四周大樓 ----------
  const styles = ['office', 'apart', 'brick', 'mint'];
  const texs = styles.map((s, i) => windowTex(s, night, 101 + i * 37 + (TENANT.id || '').length));
  const roofs = ['#9aa3ab', '#b9b2a6', '#8f8a82', '#a7b4b0'];
  const lot = mobile ? 5.4 : 4.4;
  for (const b of blocks) {
    const nx = Math.max(1, Math.floor((b.x1 - b.x0) / lot)), nz = Math.max(1, Math.floor((b.z1 - b.z0) / lot));
    const cw = (b.x1 - b.x0) / nx, cd = (b.z1 - b.z0) / nz;
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const x = b.x0 + cw * (i + 0.5), z = b.z0 + cd * (j + 0.5);
      const w = cw - 0.7 - rnd() * 0.5, d = cd - 0.7 - rnd() * 0.5;
      // 前排低矮（不擋開場視角）；後排是天際線
      let h = b.row === 2 ? 1.3 + rnd() * 1.1 : b.row === 0 ? 4 + rnd() * 5.5 + (b.col === 1 ? 0 : 1.5) : 2.2 + rnd() * 3;
      if (b.row === 2 && b.col === 1 && (i + j) % 2 === 0) { for (let n = 0; n < 3; n++) world.add(tree(k, x + (rnd() - 0.5) * cw * 0.6, z + (rnd() - 0.5) * cd * 0.6, k.pick(['round', 'pine', 'blossom']), 0.9 + rnd() * 0.4)); continue; }
      // 不擋鏡頭路線
      for (const p of camPts) if (Math.abs(p.x - x) < w / 2 + 1.3 && Math.abs(p.z - z) < d / 2 + 1.3) h = Math.min(h, p.y - 1.8);
      if (h < 1.0) { world.add(tree(k, x, z, 'round', 0.9)); continue; }
      const si = Math.floor(rnd() * styles.length);
      const bd = building(k, texs[si], w, d, h, roofs[si], h < 3 && rnd() < 0.6 ? 'shop' : styles[si]);
      bd.position.set(x, 0, z); world.add(bd);
    }
  }
  // 遠方天際線（剪影）
  const farM = k.m(night ? '#1d2433' : '#a9b6c4', { roughness: 1 });
  for (let i = 0; i < (mobile ? 8 : 16); i++) { const a = Math.PI + (i / 15 - 0.5) * 2.4 + (rnd() - 0.5) * 0.1, r = 44 + rnd() * 18, h = 6 + rnd() * 16; const m = new THREE.Mesh(new THREE.BoxGeometry(3 + rnd() * 3, h, 3 + rnd() * 3), farM); m.position.set(Math.sin(a) * r, h / 2, Math.cos(a) * r); world.add(m); }

  // ---------- 飛船（店名） ----------
  { const g = new THREE.Group();
    const env = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), k.m(brand, { roughness: 0.4 })); env.scale.set(1.1, 1.1, 3.0); g.add(env);
    const tx = canvas(512, 96, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); c.fillStyle = brandDeep; c.font = '800 60px "Noto Sans TC", system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(name, w / 2, h / 2 + 3); });
    for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.64), new THREE.MeshBasicMaterial({ map: tx, toneMapped: false })); p.position.set(s * 1.12, 0, 0); p.rotation.y = s * Math.PI / 2; g.add(p); }
    g.add(k.mesh(new THREE.BoxGeometry(0.4, 0.3, 0.9), k.m('#f4f1ec'), 0, -1.1, 0.2, false));
    for (const [rx, rz] of [[0, 0], [0, Math.PI / 2]]) { const f = k.mesh(new THREE.BoxGeometry(0.06, 1.2, 0.8), k.m(hex(pal[2])), 0, 0, -2.8, false); f.rotation.set(rx, 0, rz); g.add(f); }
    world.add(g);
    anim.push((t) => { const a = t * 0.04 + 2.4, r = 19; g.position.set(Math.sin(a) * r, 13 + Math.sin(t * 0.5) * 0.4, Math.cos(a) * r - 4); g.rotation.y = a + Math.PI / 2; });
  }

  // ---------- 車流 ----------
  const lanes = { A: loop(-10.8, 10.8, -11.6, 10.8, 0.8, false), B: loop(-12.0, 12.0, -12.8, 12.0, 2.0, true), OA: loop(-24.4, 24.4, -25.4, 24.4, 0.8, false), OB: loop(-25.6, 25.6, -26.6, 25.6, 2.0, true) };
  // 停車線：前路 A 車道往 -x（從 +x 來，停在斑馬線右邊）、B 車道往 +x
  const stopA = lanes.A.project(xc + 1.7, 10.8), stopB = lanes.B.project(xc - 1.3, 12.0), busStop = lanes.B.project(busX, 12.0);
  const red = () => light.state !== 'go';
  const cars = [];
  const addCar = (lane, s, kind, color, vmax) => { const c = makeCar(k, color, kind); c.lane = lane; c.s = s; c.v = vmax * 0.5; c.vmax = vmax; c.heading = 0; c.dwell = 0; world.add(c.group); lane.cars.push(c); cars.push(c); place(c); return c; };
  const place = (c) => { const p = c.lane.at(c.s); c.group.position.set(p.x, 0.01, p.z); c.heading = c.heading ? turn(c.heading, p.h, 0.35) : p.h; c.group.rotation.y = c.heading; };
  const nA = mobile ? 3 : 5, nB = mobile ? 2 : 4;
  for (let i = 0; i < nA; i++) addCar(lanes.A, i / nA * lanes.A.len + 3, rnd() < 0.2 ? 'taxi' : 'car', k.pick(carCs), 2.6 + rnd() * 0.5);
  const bus = addCar(lanes.B, busStop - 14, 'bus', hex(pal[1]), 2.2); bus.isBus = true;
  for (let i = 1; i < nB; i++) addCar(lanes.B, busStop - 14 + i / nB * lanes.B.len, 'car', k.pick(carCs), 2.6 + rnd() * 0.5);
  if (!mobile) { for (let i = 0; i < 5; i++) addCar(lanes.OA, i / 5 * lanes.OA.len, rnd() < 0.3 ? 'taxi' : 'car', k.pick(carCs), 3.2); for (let i = 0; i < 4; i++) addCar(lanes.OB, i / 4 * lanes.OB.len, 'car', k.pick(carCs), 3.2); }
  cars.forEach(c => { if (c.kind === 'taxi') c.group.children[0].material = k.m('#f6c90e', { roughness: 0.35, metalness: 0.2 }); });
  // 停車的車：A 車道右路往 +z，到停車場入口轉進去 → 停好 → 駕駛走去百貨 → 回來開走
  const exitS = lanes.A.project(10.8, AISLE - 1.6), mergeS = lanes.A.project(10.8, AISLE + 1.4);
  const parkers = free.map((slot, i) => {
    const c = addCar(lanes.A, (exitS - 9 - i * 13 + lanes.A.len) % lanes.A.len, 'car', k.pick(carCs.slice(2)), 2.5);
    c.slot = slot; c.wantPark = true; c.state = 'lane'; c.wait = 0;
    const nose = slot.z < AISLE ? -1 : 1;
    c.inPath = makePath([[10.8, AISLE - 1.6], [10.35, AISLE - 0.5], [9.5, AISLE], [slot.x + 0.7, AISLE], [slot.x, AISLE + nose * 0.6], [slot.x, slot.z]], false);
    c.backPath = makePath([[slot.x, slot.z], [slot.x, AISLE + nose * 0.2]], false);
    c.outPath = makePath([[slot.x, AISLE + nose * 0.2], [slot.x + 0.6, AISLE + 0.25], [9.4, AISLE + 0.25], [10.3, AISLE + 0.9], [10.8, AISLE + 1.4]], false);
    c.driverAt = [slot.x + 0.75, slot.z + (nose < 0 ? 0.3 : -0.3)];
    return c;
  });
  const followPath = (c, path, dt, speed, reverse = false) => { c.ps = Math.min(path.len, (c.ps || 0) + speed * dt); const p = path.at(c.ps); c.group.position.set(p.x, 0.13, p.z); const h = reverse ? p.h + Math.PI : p.h; c.heading = turn(c.heading, h, dt * 4); c.group.rotation.y = c.heading; c.v = speed; return c.ps >= path.len - 0.01; };
  let lastT = -1;
  anim.push((t) => {
    const dt = lastT < 0 ? 0.016 : Math.min(0.05, Math.max(0, t - lastT)); lastT = t;
    const crowd = ctx.crowd ? ctx.crowd.list : [];
    // 斑馬線上有人：車子一律停讓
    const pedOn = crowd.some(p => p.root.visible !== false && Math.abs(p.root.position.x - xc - 0.35) < 0.9 && p.root.position.z > 9.9 && p.root.position.z < 13.0);
    for (const lane of Object.values(lanes)) {
      const list = lane.cars.slice().sort((a, b) => a.s - b.s), n = list.length;
      list.forEach((c, i) => {
        let gap = Infinity;
        if (n > 1) { const a = list[(i + 1) % n]; gap = ((a.s - c.s) % lane.len + lane.len) % lane.len - (a.len + c.len) / 2; }
        const obstacle = (s, on) => { if (!on) return; const d = ((s - c.s) % lane.len + lane.len) % lane.len - c.len / 2; if (d > -0.3 && d < gap) gap = d; };
        const close = (s) => ((s - c.s) % lane.len + lane.len) % lane.len - c.len / 2 < 1.2;
        if (lane === lanes.A) obstacle(stopA, pedOn || (red() && !(light.state === 'yellow' && close(stopA))));
        if (lane === lanes.B) obstacle(stopB, pedOn || (red() && !(light.state === 'yellow' && close(stopB))));
        // 公車：開到站牌前停 5 秒讓人上下車
        if (c.isBus) {
          if (c.dwell > 0) { c.dwell -= dt; gap = 0; if (c.dwell <= 0) c.left = 6; }
          else if (c.left > 0) c.left -= dt;
          else { obstacle(busStop + c.len / 2 + 0.5, true); const d = ((busStop - c.s) % lane.len + lane.len) % lane.len; if (d < 0.9 && c.v < 0.08) c.dwell = 5; }
          c.atStop = c.dwell > 0;
        }
        const target = c.vmax * Math.max(0, Math.min(1, (gap - 0.5) / 3));
        c.v += (target - c.v) * Math.min(1, dt * (target < c.v ? 6 : 1.8));
        const prev = c.s; c.s = (c.s + c.v * dt) % lane.len;
        place(c);
        c.wheels.forEach(w => { w.rotation.x += c.v * dt / 0.17; });
        // 轉進停車場
        if (c.wantPark && c.state === 'lane' && lane === lanes.A) { const d0 = ((exitS - prev) % lane.len + lane.len) % lane.len, d1 = ((exitS - c.s) % lane.len + lane.len) % lane.len; if (d1 > d0 && d0 < 1) { lane.cars.splice(lane.cars.indexOf(c), 1); c.state = 'in'; c.ps = 0; } }
      });
    }
    for (const c of parkers) {
      if (c.state === 'in') { if (followPath(c, c.inPath, dt, Math.max(0.6, 1.8 * (1 - c.ps / c.inPath.len)))) { c.state = 'parked'; c.v = 0; } }
      else if (c.state === 'back') { if (followPath(c, c.backPath, dt, 0.7, true)) { c.state = 'out'; c.ps = 0; } }
      else if (c.state === 'out') { if (c.ps < c.outPath.len - 0.05) followPath(c, c.outPath, dt, 1.2); else { const busy = lanes.A.cars.some(o => { const d = ((mergeS - o.s) % lanes.A.len + lanes.A.len) % lanes.A.len; return d < 6 || d > lanes.A.len - 3; }); if (!busy) { c.state = 'lane'; c.s = mergeS; c.v = 0.6; lanes.A.cars.push(c); c.wantPark = false; c.trips = (c.trips || 0) + 1; c.again = 25 + rnd() * 20; } } }
      else if (c.state === 'lane' && !c.wantPark) { c.again -= dt; if (c.again < 0) c.wantPark = true; }
      if (c.state !== 'lane') c.wheels.forEach(w => { w.rotation.x += c.v * dt / 0.17; });
    }
    // 自動門
    const near = crowd.some(p => p.root.visible !== false && p.legL && p.kind !== 'instore' && Math.hypot(p.root.position.x - L.door[0], p.root.position.z - L.door[1]) < 1.4 && p.root.position.y < 0.5);
    doorOpen += ((near ? 1 : 0) - doorOpen) * Math.min(1, dt * 5);
    dl.position.x = -0.31 - doorOpen * 0.55; dr.position.x = 0.31 + doorOpen * 0.55;
  });

  // ---------- 購買提示（提著袋子走出百貨時冒出 +1） ----------
  const popT = canvas(160, 96, (g, w, h) => { g.fillStyle = brand; g.beginPath(); g.roundRect ? g.roundRect(6, 6, w - 12, h - 12, 26) : g.rect(6, 6, w - 12, h - 12); g.fill(); g.fillStyle = '#ffffff'; g.fillRect(30, 40, 34, 30); g.strokeStyle = '#ffffff'; g.lineWidth = 5; g.beginPath(); g.arc(47, 40, 10, Math.PI, 0); g.stroke(); g.font = '800 40px system-ui, sans-serif'; g.textBaseline = 'middle'; g.fillText('+1', 76, 52); });
  const pops = [0, 1, 2, 3].map(() => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: popT, transparent: true, depthWrite: false, toneMapped: false })); s.scale.set(0.9, 0.54, 1); s.visible = false; s.userData.t = 0; world.add(s); return s; });
  let sales = 0;
  const pop = (x, y, z) => { const s = pops.find(p => !p.visible) || pops[0]; s.visible = true; s.userData.t = 0; s.position.set(x, y, z); s.userData.y0 = y; sales++; };
  anim.push((t) => { for (const s of pops) if (s.visible) { s.userData.t += 0.016; const u = s.userData.t / 1.6; s.position.y = s.userData.y0 + u * 1.0; s.material.opacity = 1 - u; if (u >= 1) s.visible = false; } });

  // ---------- 人物（在 createPeople 之後接上） ----------
  function attach(crowd) {
    ctx.crowd = crowd;
    const { person, script, there, SPEED } = crowd;
    const look = (o = {}) => ({ hat: rnd() < 0.15 ? 'cap' : null, skirt: rnd() < 0.3, bun: rnd() < 0.3, ...o });
    const show = (q) => { q.root.visible = true; }, hide = (q) => { q.root.visible = false; };
    const bagOn = (q) => { if (q.bag) q.bag.visible = true; }, bagOff = (q) => { if (q.bag) q.bag.visible = false; };
    const door = L.door, inside = [door[0], door[1] - 3];
    const buy = (q) => { show(q); bagOn(q); pop(door[0], 1.7, door[1] + 0.2); };
    // 公車下車 → 等綠燈過馬路 → 進百貨 → 提袋出來 → 過馬路 → 搭公車
    const R = L.routes.cross;
    const toDoor = R.slice(2), curbOut = R[1], curbIn = R[2];
    const nCross = mobile ? 1 : 3;
    for (let i = 0; i < nCross; i++) {
      const p = person(look({ kind: 'shopper', bag: false }));
      const steps = [
        { until: () => bus.atStop, on: hide }, { wait: 0.4 + i * 0.6, on: (q) => { show(q); bagOff(q); } },
        { go: R[0] }, { go: curbOut }, { until: () => light.state === 'stop' && light.c < 14, look: curbIn },
        ...toDoor.map(go => ({ go })), { wait: 6 + rnd() * 6, on: hide, look: inside }, { wait: 0.2, on: buy },
        ...toDoor.slice(0, -1).reverse().map(go => ({ go })), { until: () => light.state === 'stop' && light.c < 14, look: curbOut },
        { go: curbOut }, { go: R[0] }, { until: () => bus.atStop, look: [R[0][0], 30] }, { wait: 0.5 + i * 0.4, on: (q) => { hide(q); bagOff(q); } },
        { until: () => !bus.atStop }];
      script(p, steps, 0);
    }
    // 開車來的人
    for (const c of parkers) {
      const p = person(look({ kind: 'driver', bag: false }));
      const path = [c.driverAt, [c.driverAt[0], AISLE], [5.45, AISLE], ...L.routes.park];
      script(p, [
        { until: () => c.state === 'parked', on: hide }, { wait: 0.5, on: show },
        ...path.map(go => ({ go })), { wait: 7 + rnd() * 6, on: hide, look: inside }, { wait: 0.2, on: buy },
        ...path.slice(0, -1).reverse().map(go => ({ go })), { wait: 0.4, on: (q) => { hide(q); bagOff(q); c.state = 'back'; c.ps = 0; } },
        { until: () => c.state === 'lane' }], 0);
      p.root.position.set(c.driverAt[0], 0.13, c.driverAt[1]);
    }
    // 百貨裡面：每層樓逛街的人、收銀台、搭手扶梯
    const fz = STORE.z1 - 0.7;
    const floorG = (f) => () => FLOOR_Y(f);
    for (let f = 0; f < STORE.floors; f++) {
      for (let j = 0; j < (mobile ? 1 : 2); j++) {
        const p = person(look({ kind: 'instore', bag: rnd() < 0.4 }));
        const xa = -3.6 + rnd() * 2, xb = 1.0 + rnd() * 2.6, z = fz - j * 0.45 - (f === 1 ? 0.25 : 0);
        script(p, [{ go: [xa, z] }, { wait: 1.5 + rnd() * 2, look: [xa, STORE.z0], mode: 'look' }, { go: [xb, z] }, { wait: 1.5 + rnd() * 2, look: [xb, STORE.z0], mode: 'look' }], j, floorG(f));
      }
    }
    { const cashier = person(look({ kind: 'instore', apron: true, shirt: brand }));
      cashier.root.position.set(-2.9, FLOOR_Y(0), -8.35); cashier.heading = 0; cashier.root.rotation.y = 0; cashier.update = () => { cashier.mode = 'work'; };
      const buyer = person(look({ kind: 'instore', bag: true }));
      buyer.root.position.set(-2.9, FLOOR_Y(0), -7.35); buyer.heading = Math.PI; buyer.root.rotation.y = Math.PI; buyer.update = () => { buyer.mode = 'stand'; }; }
    { const rider = person(look({ kind: 'instore' }));
      const esc = (x) => FLOOR_Y(0) + Math.max(0, Math.min(1, (x - ESC.x0) / (ESC.x1 - ESC.x0))) * STORE.fh;
      script(rider, [{ go: [ESC.x0 - 0.6, ESC.z] }, { wait: 0.1, on: (q) => { q.ground = (x) => esc(x); } }, { go: [ESC.x1 + 0.35, ESC.z], speed: SPEED * 0.75 },
        { wait: 0.1, on: (q) => { q.ground = floorG(1); } }, { go: [ESC.x1 + 0.4, fz] }, { go: [-2.5, fz] }, { wait: 2.5, look: [-2.5, STORE.z0], mode: 'look' },
        { wait: 0.1, on: (q) => { hide(q); q.ground = floorG(0); q.root.position.set(-1.5, FLOOR_Y(0), fz); } }, { wait: 0.1, on: show }, { go: [ESC.x0 - 0.6, fz] }], 0, floorG(0));
    }
  }

  return {
    spots, attach, store, features: ['百貨公司', '馬路車流與紅綠燈', '公車站', '停車場', '四周大樓'],
    info: () => ({ xc, cars: cars.length, moving: cars.filter(c => c.v > 0.3).length, parked: parkers.filter(c => c.state === 'parked').length, light: light.state, bus: bus.atStop ? 'stop' : 'go', sales, door: +doorOpen.toFixed(2),
      carPos: cars.map(c => ({ x: +c.group.position.x.toFixed(2), z: +c.group.position.z.toFixed(2), state: c.state || 'lane', lane: Object.keys(lanes).find(n => lanes[n] === c.lane) })) }),
  };
}

// 城市場景的店舖位置（給標籤與最後一站鏡頭）
export const CITY_VENUE = { pinZ: (STORE.z0 + STORE.z1) / 2 + 0.6, pinY: 0.12 + STORE.floors * STORE.fh + 2.8, lookZ: STORE.z1 - 0.5, lookY: 3.4, final: [5.2, 7.6, 9.4], finalM: [6.2, 9.6, 12.6] };
