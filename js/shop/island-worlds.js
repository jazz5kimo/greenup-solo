// 銷售網頁 3D 開場的「主題世界」：不再是同一座小島換顏色，每個場景都有自己的地形、主建築、周邊與天空
// （雪山木屋、夜市街、茶山、歐風小鎮、森林樹屋、玻璃溫室花田、海濱飯店、牧場、禪寺、霓虹街、漁港、寵物公園、燈會、大學書街、遊樂園、沙漠綠洲、糖果王國）。
// 共通的部分：中間一塊平坦的核心廣場（展台環狀步道、主角、人物都在這裡），主建築固定在廣場後方，客人從前方走進主建築。
// 各世界的建造函式在 island-worlds-a.js、island-worlds-b.js。
import * as THREE from 'three';
import { TENANT } from '../tenant.js';
import { makeLayout, kit } from './island-scenes.js';

export const TAU = Math.PI * 2;
export const C = (c) => new THREE.Color(c);
export const hex = (c) => '#' + C(c).getHexString();
export const CORE = 8.6;                                              // 核心廣場半徑（地面高 0.12）
export const HERO = { x0: -3.6, x1: 3.6, z0: -10.4, z1: -6.4 };        // 主建築的範圍（正面朝 +z）
export const WORLD_VENUE = { pinZ: -8.2, pinY: 7.2, lookZ: -6.9, lookY: 3.0, final: [5.2, 7.6, 9.4], finalM: [6.2, 9.6, 12.6] };

// 核心廣場的空地規劃（沿用小島的規則：環狀步道、展台、人物路線、鏡頭視線）
export function worldLayout({ RING, SHOP_Z, stations }) {
  const front = stations.filter(a => Math.abs(a) < 1.4).sort((a, b) => a - b);
  let phi = 0.4;
  if (front.length) { let best = -1; const pts = [-1.4, ...front, 1.4]; for (let i = 0; i < pts.length - 1; i++) { const m = (pts[i] + pts[i + 1]) / 2, gap = pts[i + 1] - pts[i]; const score = gap - Math.abs(m - 0.35) * 0.6; if (score > best) { best = score; phi = m; } } }
  const door = [0.05, HERO.z1 + 0.35];
  const arcR = (a0, a1, side) => { const out = []; for (let i = 0; i <= 6; i++) { const a = a0 + (a1 - a0) * i / 6; out.push([side * 1.62 * Math.sin(a), 0.9 + 1.62 * Math.cos(a)]); } return out; };
  const at = (r) => [Math.sin(phi) * r, Math.cos(phi) * r];
  // 客人：從廣場前緣走進來 → 繞過主角 → 主建築大門
  const visitor = [at(CORE - 0.4), at(6.3), at(RING), at(3.3), ...arcR(Math.max(0.3, phi), 2.62, 1), [0.4, -1.2], [0.35, HERO.z1 + 0.6], door];
  const walk = [[-0.32, 3.3], [-0.32, 2.55], ...arcR(0.25, 2.62, -1), [-0.4, -1.2], [-0.45, HERO.z1 + 0.7]];
  const venue = {
    box: { x0: HERO.x0 - 0.2, x1: HERO.x1 + 0.2, z0: HERO.z0 - 0.2, z1: HERO.z1 + 0.55 },
    keepOut: [{ x0: -1.8, x1: 1.8, z0: HERO.z1, z1: HERO.z1 + 1.2 }],
    inBounds: (x, z, rad) => Math.hypot(x, z) + rad < CORE - 0.35,
    walk: [HERO.z1, CORE],
    routes: { visitor, front: walk },
    door, keeper: [-1.45, HERO.z1 + 0.5],
    ground: (x, z) => (Math.hypot(x, z) < CORE + 0.05 ? 0.13 : 0.02),
  };
  const L = makeLayout({ shore: () => 14, RING, SHOP_Z, stations, venue });
  return Object.assign(L, { phi, world: true });
}

// ---------- 共用小工具 ----------
export function canvas(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
export const add = (k, g, geo, color, x = 0, y = 0, z = 0, o = {}) => { const m = k.mesh(geo, Array.isArray(color) || (color && color.isMaterial) ? color : k.m(color, o), x, y, z); g.add(m); return m; };
export const grp = (x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); return g; };
export const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
export const cyl = (a, b, h, s = 16, open = false) => new THREE.CylinderGeometry(a, b, h, s, 1, open);
export const sph = (r, a = 16, b = 12) => new THREE.SphereGeometry(r, a, b);
export const cone = (r, h, s = 12) => new THREE.ConeGeometry(r, h, s);
export const dome = (r, a = 24, b = 12) => new THREE.SphereGeometry(r, a, b, 0, TAU, 0, Math.PI / 2);
// 人字屋頂（屋脊沿 x 方向）
export function gable(w, d, h, over = 0.2) { const s = new THREE.Shape(); s.moveTo(-d / 2 - over, 0); s.lineTo(d / 2 + over, 0); s.lineTo(0, h); const g = new THREE.ExtrudeGeometry(s, { depth: w + over * 2, bevelEnabled: false }); g.translate(0, 0, -(w + over * 2) / 2); g.rotateY(Math.PI / 2); return g; }
// 店名招牌
export function nameSign(k, w, h, bg, fg = '#ffffff', font = '"Noto Sans TC", system-ui, sans-serif') {
  const name = TENANT.name || '';
  const t = canvas(1024, Math.round(1024 * h / w), (g, W, H) => { g.fillStyle = bg; g.fillRect(0, 0, W, H); g.fillStyle = fg; let fs = Math.round(H * 0.62); g.font = `800 ${fs}px ${font}`; while (g.measureText(name).width > W - 60 && fs > 24) { fs -= 4; g.font = `800 ${fs}px ${font}`; } g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name, W / 2, H / 2 + 3); });
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), [k.m('#333333'), k.m('#333333'), k.m('#333333'), k.m('#333333'), new THREE.MeshBasicMaterial({ map: t, toneMapped: false }), k.m('#333333')]);
}
// 窗戶貼圖（白天玻璃、晚上隨機亮燈），repeat 依牆面大小
export function windowMat(k, base, w, h, { cols = 8, rows = 6, glass = '#9bb7cc', seed = 7, lit = 0.45 } = {}) {
  let a = seed; const r = () => (a = (a * 16807) % 2147483647) / 2147483647;
  const day = canvas(256, 192, (g, W, H) => { g.fillStyle = base; g.fillRect(0, 0, W, H); for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) { g.fillStyle = r() < 0.12 ? '#5b6b78' : glass; g.fillRect(i * W / cols + 6, j * H / rows + 6, W / cols - 12, H / rows - 12); } });
  day.wrapS = day.wrapT = THREE.RepeatWrapping; day.repeat.set(w / 4, h / 3);
  const m = new THREE.MeshStandardMaterial({ map: day, roughness: 0.75 });
  if (k.night) { const em = canvas(256, 192, (g, W, H) => { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) if (r() < lit) { g.fillStyle = r() < 0.7 ? '#ffd88a' : '#cfe8ff'; g.fillRect(i * W / cols + 6, j * H / rows + 6, W / cols - 12, H / rows - 12); } }); em.wrapS = em.wrapT = THREE.RepeatWrapping; em.repeat.copy(day.repeat); m.emissiveMap = em; m.emissive = C('#ffffff'); m.emissiveIntensity = 1.1; }
  return m;
}
// 地面：整片大地＋核心廣場（可換顏色或貼圖）；edge 給廣場外圈的收邊（矮牆、樹籬…）
export function ground(k, world, { color, core, coreTex, edge, edgeH = 0.18 }) {
  if (color) { const g = new THREE.Mesh(new THREE.PlaneGeometry(320, 320), k.m(color, { roughness: 1 })); g.rotation.x = -Math.PI / 2; g.position.y = -0.01; g.receiveShadow = true; world.add(g); }
  const mat = coreTex ? new THREE.MeshStandardMaterial({ map: coreTex, roughness: 0.95 }) : k.m(core, { roughness: 0.95 });
  const c = new THREE.Mesh(new THREE.CylinderGeometry(CORE, CORE + 0.1, 0.12, 72), [k.m(edge || core), mat, mat]); c.position.y = 0.06; c.receiveShadow = true; world.add(c);
  if (edge) { const r = new THREE.Mesh(new THREE.TorusGeometry(CORE + 0.05, 0.12, 6, 96), k.m(edge, { roughness: 0.9 })); r.rotation.x = Math.PI / 2; r.position.y = 0.12 + edgeH / 2 - 0.06; r.scale.z = edgeH / 0.24; world.add(r); }
}
// 簡單的水面（會流動的波光貼圖）
export function waterPlane(k, world, w, d, x, z, { color = '#2a8fc4', y = 0.0, speed = [0.01, 0.02], opacity = 0.92 } = {}) {
  const t = canvas(128, 128, (g) => { g.fillStyle = color; g.fillRect(0, 0, 128, 128); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; for (let i = 0; i < 12; i++) { g.beginPath(); for (let x = 0; x <= 128; x += 6) g.lineTo(x, i * 11 + Math.sin(x * 0.1 + i) * 3); g.stroke(); } });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(w / 6, d / 6);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: t, roughness: 0.15, metalness: 0.1, transparent: opacity < 1, opacity, emissive: k.night ? C(color).multiplyScalar(0.3) : C('#000000') }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; world.add(m);
  k.anim.push((tt) => { t.offset.set(tt * speed[0], tt * speed[1]); });
  return m;
}
// 一棵大樹（遠景用，沒有搖晃動畫以省效能）
export function bigTree(k, x, z, s = 1, leaf = '#4fae5b', kind = 'round') {
  const g = grp(x, 0, z); g.scale.setScalar(s);
  add(k, g, k.g('btrunk', () => cyl(0.18, 0.28, 1.6, 7)), '#7a5236', 0, 0.8, 0);
  if (kind === 'pine') [[1.2, 1.6, 1.8], [0.95, 1.4, 2.6], [0.65, 1.2, 3.3]].forEach(([r, h, y]) => add(k, g, k.g('bpine' + r, () => cone(r, h, 8)), k.m(leaf, { flatShading: true }), 0, y, 0));
  else { add(k, g, k.g('bcrown', () => new THREE.IcosahedronGeometry(1.25, 0)), k.m(leaf, { flatShading: true }), 0, 2.3, 0); add(k, g, k.g('bcrown2', () => new THREE.IcosahedronGeometry(0.85, 0)), k.m(leaf, { flatShading: true }), 0.6, 2.9, 0.2); }
  return g;
}

// 建造主題世界；回傳 { spots, dogs, features（特徵清單，給測試與說明）, heroH（主建築高度）, attach(crowd) }
export function buildWorld(def, ctx) {
  const { world, anim, rnd, night, mobile, camPts = [], pal = [] } = ctx;
  const k = kit(world, anim, rnd, night, mobile);
  // 鏡頭路線附近不能放高的東西
  const clear = (x, z, rad, h) => !camPts.some(p => Math.hypot(p.x - x, p.z - z) < rad + 1.3 && p.y < h + 1.6);
  const out = def.build({ ...ctx, k, clear, name: TENANT.name || '' }) || {};
  const heroH = out.heroH || 5;
  const live = enliven(k, world, def, pal, heroH);
  return { spots: out.spots || [], dogs: out.dogs || 0, features: out.features || [], heroH, fog: out.fog, kit: k, attach: live.attach };
}

// ---------- 讓每個世界更生動：補光、飄浮粒子、主建築門口的氣球與彩旗、買到東西冒出 +1 ----------
// 各世界的飄浮粒子（沒列的白天用閃光點、晚上用螢火蟲）
const PARTICLE = { candy: 'confetti', garden: 'petals', zen: 'petals', tea: 'leaves', forest: 'fireflies', farm: 'leaves', moon: 'embers', market: 'embers', carnival: 'confetti', park: 'leaves', campus: 'leaves', snow: 'none', neon: 'none', desert: 'sand', swiftlet: 'gold' };
const PCOL = { confetti: null, petals: ['#ffc0d6', '#ffd6e6', '#ffffff'], leaves: ['#8bc34a', '#f2c94c', '#e8763a'], fireflies: ['#d8ff6a'], embers: ['#ffb45a', '#ff7a3a'], sparkle: ['#ffffff', '#fff3c4'], sand: ['#f1dca6'], gold: ['#ffd98a', '#f4c25b', '#fff3c4'] };
function enliven(k, world, def, pal, heroH) {
  const hexes = pal.map(hex);
  // 補光：從主光的另一側打一點品牌色，畫面比較不平
  const fill = new THREE.DirectionalLight(C(hexes[0] || '#ffffff').lerp(C('#ffffff'), 0.6), k.night ? 0.35 : 0.55); fill.position.set(-12, 9, 14); world.add(fill);
  // 飄浮粒子
  const kind = PARTICLE[def.id] || (k.night ? 'fireflies' : 'sparkle');
  if (kind !== 'none') {
    const N = k.mobile ? 50 : 120, pa = new Float32Array(N * 3), pc = new Float32Array(N * 3), sp = new Float32Array(N);
    const cols = (PCOL[kind] || hexes.concat(['#ffffff'])).map(c => C(c));
    for (let i = 0; i < N; i++) { const a = k.rnd() * TAU, r = 1 + k.rnd() * 15; pa.set([Math.sin(a) * r, k.rnd() * 7, Math.cos(a) * r], i * 3); const c = cols[i % cols.length]; pc.set([c.r, c.g, c.b], i * 3); sp[i] = 0.4 + k.rnd(); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pa, 3)); g.setAttribute('color', new THREE.BufferAttribute(pc, 3));
    const dot = canvas(32, 32, (q) => { const r = q.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.5, 'rgba(255,255,255,.7)'); r.addColorStop(1, 'rgba(255,255,255,0)'); q.fillStyle = r; q.fillRect(0, 0, 32, 32); });
    const big = kind === 'confetti' || kind === 'petals' || kind === 'leaves';
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: big ? 0.22 : kind === 'fireflies' ? 0.2 : 0.14, map: dot, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, blending: kind === 'fireflies' || kind === 'embers' || kind === 'sparkle' || kind === 'gold' ? THREE.AdditiveBlending : THREE.NormalBlending }));
    world.add(pts);
    const fall = big || kind === 'sand' ? -1 : 1; let last = 0;
    k.anim.push((t) => { const dt = Math.min(0.05, t - last); last = t; const p = g.attributes.position;
      for (let i = 0; i < N; i++) { let y = p.getY(i) + fall * dt * 0.35 * sp[i]; if (y < 0) y = 7; if (y > 7) y = 0; p.setY(i, y); p.setX(i, p.getX(i) + Math.sin(t * sp[i] + i) * dt * 0.25); p.setZ(i, p.getZ(i) + Math.cos(t * 0.7 * sp[i] + i) * dt * 0.2); }
      p.needsUpdate = true; pts.material.opacity = kind === 'fireflies' ? 0.6 + Math.sin(t * 3) * 0.3 : 0.9; });
  }
  // 主建築門口：兩串品牌色氣球＋門楣上方隨風擺動的三角彩旗
  const z0 = HERO.z1 + 0.7, cs = (hexes.length ? hexes : ['#ff6b6b', '#ffd34e', '#4ecdc4']).slice(0, 5);
  const bgeo = k.g('lvball', () => { const g = sph(0.24, 12, 10); g.scale(1, 1.2, 1); return g; });
  for (const sx of [-1, 1]) {
    const cl = grp(sx * 2.1, 0.12, z0); world.add(cl);
    add(k, cl, k.g('lvstr', () => cyl(0.01, 0.01, 1.6, 3)), '#ffffff', 0, 0.8, 0, false);
    const bs = [];
    for (let i = 0; i < 5; i++) { const b = add(k, cl, bgeo, k.m(cs[i % cs.length], { roughness: 0.25, metalness: 0.1 }), Math.cos(i * 1.3) * 0.25, 1.75 + (i % 3) * 0.28, Math.sin(i * 1.3) * 0.25); bs.push(b); }
    const ph = sx * 1.7; k.anim.push((t) => { cl.rotation.z = Math.sin(t * 1.3 + ph) * 0.06; bs.forEach((b, i) => { b.position.y = 1.75 + (i % 3) * 0.28 + Math.sin(t * 2 + i + ph) * 0.05; }); });
  }
  const flagG = k.g('lvflag', () => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([-0.16, 0, 0, 0.16, 0, 0, 0, -0.36, 0], 3)); g.computeVertexNormals(); return g; });
  const fy = Math.min(heroH * 0.55, 3.6), flags = [];
  for (let i = 0; i < 13; i++) { const u = i / 12, x = -3.2 + u * 6.4, y = fy - Math.sin(Math.PI * u) * 0.5; const f = add(k, world, flagG, k.m(cs[i % cs.length], { side: THREE.DoubleSide, roughness: 0.7 }), x, y, HERO.z1 + 0.35, false); flags.push(f); }
  k.anim.push((t) => flags.forEach((f, i) => { f.rotation.x = Math.sin(t * 3 + i * 0.7) * 0.35; }));
  // 買到東西：客人提著袋子走出主建築時，門口冒出「+1」
  const popT = canvas(160, 96, (g, w, h) => { g.fillStyle = cs[0]; g.beginPath(); if (g.roundRect) g.roundRect(6, 6, w - 12, h - 12, 26); else g.rect(6, 6, w - 12, h - 12); g.fill(); g.fillStyle = '#ffffff'; g.fillRect(30, 40, 34, 30); g.strokeStyle = '#ffffff'; g.lineWidth = 5; g.beginPath(); g.arc(47, 40, 10, Math.PI, 0); g.stroke(); g.font = '800 40px system-ui, sans-serif'; g.textBaseline = 'middle'; g.fillText('+1', 76, 52); });
  const pops = [0, 1, 2].map(() => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: popT, transparent: true, depthWrite: false, toneMapped: false })); s.scale.set(0.9, 0.54, 1); s.visible = false; s.userData.t = 0; world.add(s); return s; });
  let sales = 0;
  const pop = (x, z) => { const s = pops.find(p => !p.visible) || pops[0]; s.visible = true; s.userData.t = 0; s.position.set(x, 1.8, z); sales++; };
  k.anim.push(() => { for (const s of pops) if (s.visible) { s.userData.t += 0.016; const u = s.userData.t / 1.6; s.position.y = 1.8 + u; s.material.opacity = 1 - u; if (u >= 1) s.visible = false; } });
  function attach(crowd) {
    const seen = new Map();
    k.anim.push(() => { for (const p of crowd.list) { if (p.kind !== 'visitor') continue; const vis = p.root.visible !== false, was = seen.get(p); if (was === false && vis && p.bag && p.bag.visible) pop(p.root.position.x, p.root.position.z + 0.3); seen.set(p, vis); } });
  }
  world.userData.sales = () => sales;
  return { attach };
}
