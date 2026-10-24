// 主題世界（一）：糖果王國、夜市老街、梯田茶山、歐風小鎮、森林樹屋、玻璃溫室花田、海濱度假飯店、田園牧場、雪山木屋
import * as THREE from 'three';
import { puffs, lamp, bench, umbrella, tree, makeBoat } from './island-scenes.js';
import { TAU, C, hex, CORE, HERO, canvas, add, grp, box, cyl, sph, cone, dome, gable, nameSign, windowMat, ground, waterPlane, bigTree } from './island-worlds.js';

const HX = (HERO.x0 + HERO.x1) / 2, HZ = (HERO.z0 + HERO.z1) / 2, HW = HERO.x1 - HERO.x0, HD = HERO.z1 - HERO.z0;
// 在環狀的外圍放東西：避開鏡頭路線；front=false 時不放在正前方（不擋開場全景）
function ringOut(k, clear, n, r0, r1, h, rad, make, { front = true, back = true } = {}) {
  let c = 0;
  for (let i = 0; i < n * 6 && c < n; i++) {
    const a = k.rnd() * TAU, r = r0 + k.rnd() * (r1 - r0), x = Math.sin(a) * r, z = Math.cos(a) * r;
    if (!front && z > 4) continue; if (!back && z < -6) continue;
    if (!clear(x, z, rad, h)) continue;
    const o = make(x, z, a); if (o) { c++; } }
}
const stripeTex = (a, b, n = 8, v = true) => canvas(128, 128, (g, w, h) => { for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? b : a; if (v) g.fillRect(i * w / n, 0, w / n + 1, h); else g.fillRect(0, i * h / n, w, h / n + 1); } });

// ================= 糖果王國 =================
function candy({ k, world, pal, clear, name }) {
  const pink = '#ff9ec0', mint = '#c8f2dc';
  const wafer = canvas(128, 128, (g) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = (i + j) % 2 ? '#ffd1e3' : '#fff4f9'; g.fillRect(i * 16, j * 16, 16, 16); } }); wafer.wrapS = wafer.wrapT = THREE.RepeatWrapping; wafer.repeat.set(6, 6);
  ground(k, world, { color: mint, coreTex: wafer, edge: pink, edgeH: 0.3 });
  // 薑餅屋（主建築）
  const h = grp(HX, 0.12, HZ); world.add(h);
  const gin = k.m('#b5763f', { roughness: 0.85 }), icing = k.m('#ffffff', { roughness: 0.35 });
  add(k, h, box(HW - 0.6, 3.2, HD - 0.4), gin, 0, 1.6, 0);
  for (const y of [0.05, 3.2]) add(k, h, box(HW - 0.4, 0.14, HD - 0.2), icing, 0, y, 0);
  const roof = add(k, h, gable(HW - 0.4, HD - 0.2, 2.6, 0.35), [k.m('#b5763f'), k.m(pink, { roughness: 0.4 })], 0, 3.25, 0);
  const cs = [pink, '#9fd8ff', '#ffe08a', '#c8a8ff', '#9ff0c8'];
  for (let i = 0; i < 9; i++) add(k, h, sph(0.22, 12, 8), cs[i % cs.length], -3 + i * 0.75, 5.85 - Math.abs(i - 4) * 0.02, 0, { roughness: 0.2 });
  for (let i = 0; i < 12; i++) add(k, h, sph(0.12, 10, 8), cs[i % cs.length], -3.1 + (i % 6) * 1.24, 3.6 + Math.floor(i / 6) * 0.9, HD / 2 + 0.25 - Math.floor(i / 6) * 0.5);
  const cane = stripeTex('#e8384f', '#ffffff', 10, false); cane.wrapT = THREE.RepeatWrapping; cane.repeat.set(1, 4);
  for (const x of [-1.3, 1.3]) add(k, h, cyl(0.16, 0.16, 3.0, 12), new THREE.MeshStandardMaterial({ map: cane, roughness: 0.3 }), x, 1.5, HD / 2 + 0.2);
  const choc = canvas(64, 96, (g) => { g.fillStyle = '#4a2a14'; g.fillRect(0, 0, 64, 96); g.fillStyle = '#5e3518'; for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) g.fillRect(6 + i * 28, 6 + j * 30, 24, 26); });
  add(k, h, box(1.3, 2.0, 0.1), new THREE.MeshStandardMaterial({ map: choc, roughness: 0.4 }), 0, 1.0, HD / 2 - 0.15);
  for (const x of [-2.4, 2.4]) { add(k, h, new THREE.CircleGeometry(0.55, 24), k.night ? k.glow('#ffe7a8', 1.6) : k.m('#bfe8ff', { roughness: 0.1 }), x, 1.9, HD / 2 - 0.19); add(k, h, new THREE.TorusGeometry(0.58, 0.08, 8, 24), icing, x, 1.9, HD / 2 - 0.15); }
  const sign = nameSign(k, 4.2, 0.7, pink); sign.position.set(0, 2.85, HD / 2 - 0.1); h.add(sign);
  // 巧克力河（前方蜿蜒）＋餅乾橋
  const rv = new THREE.PlaneGeometry(3.2, 120, 1, 120); const p = rv.attributes.position; for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) + Math.sin(p.getY(i) / 7) * 2.2); rv.computeVertexNormals();
  const ct = canvas(128, 64, (g) => { g.fillStyle = '#5a3418'; g.fillRect(0, 0, 128, 64); g.strokeStyle = 'rgba(160,100,60,.6)'; g.lineWidth = 3; for (let i = 0; i < 6; i++) { g.beginPath(); for (let x = 0; x <= 128; x += 8) g.lineTo(x, i * 11 + Math.sin(x * 0.15 + i) * 4); g.stroke(); } }); ct.wrapS = ct.wrapT = THREE.RepeatWrapping; ct.repeat.set(1, 30); ct.rotation = Math.PI / 2;
  const river = new THREE.Mesh(rv, new THREE.MeshStandardMaterial({ map: ct, roughness: 0.15 })); river.rotation.x = -Math.PI / 2; river.position.set(-12.5, 0.03, 0); world.add(river); k.anim.push((t) => { ct.offset.y = -t * 0.05; });
  const br = grp(-12.5 + Math.sin(2 / 7) * 2.2, 0, -2); add(k, br, box(4.2, 0.3, 2.2), '#e8b56a', 0, 0.35, 0); for (let i = 0; i < 5; i++) add(k, br, box(0.08, 0.06, 2.2), '#c9934a', -1.6 + i * 0.8, 0.52, 0); world.add(br);
  // 彩虹拱門
  ['#ff6b6b', '#ffa94d', '#ffe066', '#8ce99a', '#74c0fc', '#b197fc'].forEach((c, i) => { const r = add(k, world, new THREE.TorusGeometry(26 - i * 0.9, 0.45, 8, 64, Math.PI), c, 0, -0.5, -34, { roughness: 0.6 }); r.castShadow = false; });
  // 巨型棒棒糖、拐杖糖、杯子蛋糕山、甜甜圈
  const swirl = (c) => canvas(128, 128, (g) => { g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 128); g.strokeStyle = c; g.lineWidth = 12; g.beginPath(); for (let a = 0; a < 26; a += 0.1) g.lineTo(64 + Math.cos(a) * a * 2.3, 64 + Math.sin(a) * a * 2.3); g.stroke(); });
  ringOut(k, clear, k.mobile ? 6 : 11, 10, 22, 5, 1.3, (x, z, a) => { const g = grp(x, 0, z); const c = cs[Math.floor(k.rnd() * cs.length)]; add(k, g, cyl(0.12, 0.12, 4, 8), '#fffaf5', 0, 2, 0); const s = swirl(c); const d = add(k, g, cyl(1.2, 1.2, 0.3, 32), [k.m(c), new THREE.MeshStandardMaterial({ map: s, roughness: 0.3 }), new THREE.MeshStandardMaterial({ map: s, roughness: 0.3 })], 0, 4.6, 0); d.rotation.x = Math.PI / 2; g.rotation.y = a + Math.PI; world.add(g); return g; }, { front: false });
  ringOut(k, clear, k.mobile ? 3 : 6, 24, 40, 12, 4, (x, z) => { const g = grp(x, 0, z); const s = 3 + k.rnd() * 2.5; g.scale.setScalar(s); const w = stripeTex(cs[Math.floor(k.rnd() * 5)], '#ffffff', 12); add(k, g, cyl(1, 0.75, 1.1, 20), [new THREE.MeshStandardMaterial({ map: w }), k.m('#fff'), k.m('#fff')], 0, 0.55, 0); add(k, g, sph(1.05, 20, 12), '#fff0f6', 0, 1.3, 0).scale.y = 0.7; add(k, g, sph(0.25), '#e8384f', 0, 2.05, 0); world.add(g); return g; }, { front: false });
  ringOut(k, clear, 10, 9.2, 12, 0.4, 0.3, (x, z) => { add(k, world, new THREE.SphereGeometry(0.35, 14, 8, 0, TAU, 0, Math.PI / 2), cs[Math.floor(k.rnd() * 5)], x, 0, z, { roughness: 0.2, transparent: true, opacity: 0.9 }); return 1; });
  return { features: ['薑餅屋', '巧克力河', '彩虹拱門', '巨型棒棒糖', '杯子蛋糕山'], heroH: 6.2 };
}

// ================= 夜市老街（永遠是夜晚） =================
function market({ k, world, pal, clear, mobile }) {
  const tiles = canvas(128, 128, (g) => { g.fillStyle = '#6b3a32'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#4e2a24'; g.lineWidth = 3; for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(0, i * 16); g.lineTo(128, i * 16); g.stroke(); for (let j = 0; j < 4; j++) { g.beginPath(); g.moveTo(j * 32 + (i % 2) * 16, i * 16); g.lineTo(j * 32 + (i % 2) * 16, i * 16 + 16); g.stroke(); } } }); tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping; tiles.repeat.set(8, 8);
  ground(k, world, { color: '#2a2827', coreTex: tiles, edge: '#8d3a2e' });
  // 騎樓老店（主建築）：一樓騎樓柱廊、二樓窗戶亮燈、屋頂招牌
  const h = grp(HX, 0.12, HZ); world.add(h);
  add(k, h, box(HW, 4.4, HD - 1.0), windowMat(k, '#c7a88a', HW, 4.4, { cols: 6, rows: 3, glass: '#ffd9a0', lit: 0.8 }), 0, 2.2, -0.5);
  add(k, h, box(HW + 0.2, 0.35, HD), k.m('#8d3a2e'), 0, 2.0, 0);
  for (let i = 0; i < 6; i++) add(k, h, box(0.3, 1.9, 0.3), k.m('#e9dcc4'), -3.2 + i * 1.28, 0.95, HD / 2 - 0.25);
  const sign = nameSign(k, 5.2, 0.9, '#c0392b', '#fff4c4'); sign.position.set(0, 3.4, HD / 2 + 0.05); h.add(sign);
  const vs = nameSign(k, 0.7, 3.0, '#f2c94c', '#8d3a2e'); vs.position.set(3.5, 5.1, HD / 2 - 0.4); vs.rotation.y = Math.PI / 2; h.add(vs);
  const lant = k.glow('#ff4a2e', 2.4), lg = k.g('mklant', () => { const g = sph(0.2, 12, 8); g.scale(1, 1.3, 1); return g; });
  for (let i = 0; i < 7; i++) add(k, h, lg, lant, -3.3 + i * 1.1, 1.6, HD / 2 + 0.1, false);
  // 兩條攤販街（左右）＋後面的騎樓街屋
  const words = ['小吃', '冰', '茶', '炸', '麵', '湯', '烤', '甜'];
  const sideSt = (sx) => {
    for (let i = 0; i < (mobile ? 6 : 11); i++) {
      const z = -20 + i * 4, x = sx * 12.5;
      if (!clear(x, z, 1.2, 2.2)) continue;
      const g = grp(x, 0, z); g.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2; world.add(g);
      const c = [hex(pal[0]), '#e74c3c', '#f1c40f', '#2ecc71', '#3498db'][i % 5];
      add(k, g, box(2.2, 0.9, 1.0), '#3a2f2a', 0, 0.45, 0); add(k, g, box(2.6, 0.08, 1.6), new THREE.MeshStandardMaterial({ map: stripeTex(c, '#ffffff', 10), roughness: 0.7, emissive: C(c), emissiveIntensity: 0.35 }), 0, 2.0, 0.2);
      for (const dx of [-1.2, 1.2]) add(k, g, cyl(0.04, 0.04, 2.0, 6), '#555', dx, 1.0, 0.6);
      const s = canvas(128, 64, (q) => { q.fillStyle = '#fff4c4'; q.fillRect(0, 0, 128, 64); q.fillStyle = '#c0392b'; q.font = '800 44px "Noto Sans TC", sans-serif'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText(words[i % words.length], 64, 34); });
      add(k, g, box(1.2, 0.5, 0.05), new THREE.MeshBasicMaterial({ map: s, toneMapped: false }), 0, 1.5, 0.55, false);
      puffs(k, g, -0.5, 1.0, 0.1, { n: 3, size: 0.12, rise: 1, opacity: 0.45 });
      add(k, g, lg, lant, 0.9, 1.7, 0.75, false);
    }
    for (let i = 0; i < (mobile ? 4 : 7); i++) { const z = -24 + i * 7, x = sx * 17; const hh = 5 + k.rnd() * 4; if (!clear(x, z, 3, hh)) continue;
      const g = grp(x, 0, z); g.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2; world.add(g);
      add(k, g, box(6, hh, 3), windowMat(k, ['#b8a48c', '#9aa3ab', '#c9b29a'][i % 3], 6, hh, { cols: 5, rows: 4, lit: 0.6, seed: 11 + i }), 0, hh / 2, 0);
      const v = nameSign(k, 0.6, 2.4, ['#e74c3c', '#2ecc71', '#3498db', '#f1c40f'][i % 4], '#ffffff'); v.material[4].map.dispose(); v.material[4] = new THREE.MeshBasicMaterial({ map: canvas(64, 256, (q) => { q.fillStyle = ['#e74c3c', '#2ecc71', '#3498db', '#f1c40f'][i % 4]; q.fillRect(0, 0, 64, 256); q.fillStyle = '#fff'; q.font = '800 44px "Noto Sans TC", sans-serif'; q.textAlign = 'center'; ['好', '吃', '老', '店'].forEach((w, j) => q.fillText(w, 32, 40 + j * 58)); }), toneMapped: false });
      v.position.set(2.4, Math.min(hh - 1.3, 3.6), 1.6); g.add(v); }
  };
  sideSt(1); sideSt(-1);
  // 燈串：從廣場邊的燈柱拉到主角上方
  const posts = []; for (let i = 0; i < 8; i++) { const a = -2.6 + i * (5.2 / 7), x = Math.sin(a) * (CORE - 0.3), z = Math.cos(a) * (CORE - 0.3); posts.push([x, z]); add(k, world, cyl(0.06, 0.08, 4.2, 6), '#3a2f2a', x, 2.1, z); }
  const bulb = k.glow('#ffd88a', 2.6), bg = k.g('bulb', () => sph(0.07, 6, 4));
  for (const [x, z] of posts) for (let j = 1; j < 12; j++) { const u = j / 12; const px = x * (1 - u), pz = z * (1 - u) + 0.9 * u, py = 4.2 - Math.sin(Math.PI * u) * 0.9 + u * 0.6; add(k, world, bg, j % 3 ? bulb : lant, px, py, pz, false); }
  // 機車停一排
  for (let i = 0; i < (mobile ? 4 : 8); i++) { const a = 2.2 + i * 0.12, x = Math.sin(a) * 9.4, z = Math.cos(a) * 9.4; const g = grp(x, 0.02, z); g.rotation.y = a; const c = ['#e74c3c', '#3498db', '#ecf0f1', '#2c3e50', '#f1c40f'][i % 5];
    add(k, g, box(0.35, 0.35, 1.2), c, 0, 0.45, 0); for (const zz of [-0.5, 0.5]) { const w = add(k, g, cyl(0.2, 0.2, 0.1, 12), '#1c1c1c', 0, 0.2, zz); w.rotation.z = Math.PI / 2; } add(k, g, box(0.5, 0.06, 0.06), '#333', 0, 0.95, 0.5); add(k, g, box(0.3, 0.12, 0.5), '#2b2b2b', 0, 0.7, -0.15); world.add(g); }
  return { features: ['騎樓老店', '攤販街', '燈串', '機車'], heroH: 6.6 };
}

// ================= 梯田茶山 =================
function tea({ k, world, pal, clear }) {
  ground(k, world, { color: '#6fae5a', core: '#cfc6b0', edge: '#8a7f6a' });
  const soil = k.m(k.night ? '#3e5a32' : '#79b45c', { flatShading: true }), bushM = k.m(k.night ? '#24573a' : '#2f8a45', { roughness: 0.7 }), bushG = k.g('teab2', () => sph(0.35, 8, 6));
  const terrace = (x, z, r0, tiers, th) => { const g = grp(x, 0, z); world.add(g); const mtx = new THREE.Matrix4(), q = new THREE.Quaternion();
    for (let i = 0; i < tiers; i++) { const r = r0 * (1 - i / (tiers + 0.6)), y = i * th; add(k, g, cyl(r, r + 0.4, th, 40), soil, 0, y + th / 2, 0);
      const n = Math.round(r * 5), inst = new THREE.InstancedMesh(bushG, bushM, n); for (let j = 0; j < n; j++) { const a = j / n * TAU; mtx.compose(new THREE.Vector3(Math.sin(a) * (r - 0.4), y + th + 0.18, Math.cos(a) * (r - 0.4)), q, new THREE.Vector3(1.3, 0.7, 1.3)); inst.setMatrixAt(j, mtx); } g.add(inst); }
    return g; };
  // 主建築後方與兩側的梯田山
  [[-17, -17, 10, 7], [17, -19, 11, 8], [0, -30, 14, 10], [-27, 2, 9, 6], [27, 0, 9, 6]].forEach(([x, z, r, t]) => terrace(x, z, r, t, 0.9));
  // 遠山
  for (const [x, z, s] of [[-45, -50, 22], [10, -60, 28], [50, -45, 20]]) { const m = add(k, world, cone(s, s * 0.8, 7), k.m(k.night ? '#2c4a3a' : '#7fa88a', { flatShading: true }), x, s * 0.4, z); m.castShadow = false; }
  // 茶屋（主建築）：兩層木造、紅柱迴廊、重簷屋頂、紙燈籠
  const h = grp(HX, 0.12, HZ); world.add(h);
  const wood = k.m('#8a5a3a', { roughness: 0.8 }), tile = k.m('#3d4a4a', { flatShading: true }), red = k.m('#a83a2a');
  add(k, h, box(HW - 1.2, 2.4, HD - 0.8), k.m('#f1e6d2'), 0, 1.2, 0); add(k, h, box(HW - 2.4, 1.6, HD - 1.6), k.m('#f1e6d2'), 0, 3.5, 0);
  for (let i = 0; i < 6; i++) add(k, h, cyl(0.1, 0.1, 2.4, 8), red, -2.6 + i * 1.04, 1.2, HD / 2 - 0.2);
  const r1 = add(k, h, cone(5.2, 1.3, 4), tile, 0, 2.95, 0); r1.rotation.y = Math.PI / 4; r1.scale.set(1, 1, 0.62);
  const r2 = add(k, h, cone(3.6, 1.5, 4), tile, 0, 4.9, 0); r2.rotation.y = Math.PI / 4; r2.scale.set(1, 1, 0.6);
  add(k, h, box(HW - 1.4, 0.15, 0.6), wood, 0, 0.1, HD / 2 + 0.1);
  for (const x of [-2.2, -0.8, 0.8, 2.2]) add(k, h, k.g('plant', () => { const g = sph(0.22, 12, 8); g.scale(1, 1.3, 1); return g; }), k.glow('#fff1d0', 1.8), x, 2.05, HD / 2 + 0.15, false);
  const sign = nameSign(k, 2.6, 0.55, '#3d2a1e', '#f2d39a'); sign.position.set(0, 2.55, HD / 2 + 0.05); h.add(sign);
  // 石階步道、竹製水車、採茶人
  for (let i = 0; i < 12; i++) { const a = 1.9 + i * 0.03, r = CORE + 0.6 + i * 0.9; add(k, world, box(1.2, 0.2, 0.5), '#b9b0a3', Math.sin(a) * r, 0.1 + i * 0.18, Math.cos(a) * r).rotation.y = a; }
  const wt = grp(-11, 0, -7); world.add(wt); const wheel = add(k, wt, cyl(1.4, 1.4, 0.3, 16, true), k.m('#8a5a3a', { side: THREE.DoubleSide }), 0, 1.5, 0); wheel.rotation.z = Math.PI / 2; for (let i = 0; i < 8; i++) { const sp = add(k, wt, box(0.08, 2.7, 0.08), '#6b4a35', 0, 1.5, 0); sp.rotation.x = i / 8 * Math.PI; wt.userData[i] = sp; }
  k.anim.push((t) => { wheel.rotation.x = t * 0.6; for (let i = 0; i < 8; i++) wt.userData[i].rotation.x = i / 8 * Math.PI + t * 0.6; });
  const spots = [[-17, -17, 10, 2], [17, -19, 11, 3]].map(([x, z, r, ti]) => { const rr = r * (1 - ti / 7.6) - 0.9, a = Math.atan2(-x, -z) ; return { x: x + Math.sin(a) * rr, z: z + Math.cos(a) * rr, y: ti * 0.9 + 0.9, face: [x, z], pose: 'work', hat: 'straw' }; });
  return { spots, features: ['梯田茶山', '重簷茶屋', '石階步道', '水車', '採茶人'], heroH: 5.8, fog: [24, 95] };
}

// ================= 歐風小鎮 =================
function town({ k, world, pal, clear, mobile }) {
  const cob = canvas(128, 128, (g) => { g.fillStyle = '#b9ab96'; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 10; i++) for (let j = 0; j < 10; j++) { g.fillStyle = ['#a89a84', '#c4b6a0', '#b0a28c'][(i * 3 + j) % 3]; g.beginPath(); g.ellipse(i * 13 + (j % 2) * 6 + 6, j * 13 + 6, 5.5, 5, 0, 0, TAU); g.fill(); } }); cob.wrapS = cob.wrapT = THREE.RepeatWrapping; cob.repeat.set(8, 8);
  ground(k, world, { color: '#a8a08e', coreTex: cob, edge: '#8a7f6a' });
  // 市政廳＋鐘樓（主建築）
  const h = grp(HX, 0.12, HZ); world.add(h); const stone = k.m('#e8dcc4', { roughness: 0.8 });
  add(k, h, box(HW, 3.4, HD - 0.4), windowMat(k, '#e8dcc4', HW, 3.4, { cols: 7, rows: 2, glass: '#6a8aa8', lit: 0.7 }), 0, 1.7, 0);
  add(k, h, gable(HW, HD - 0.4, 1.6, 0.25), [stone, k.m('#8a3a2a', { flatShading: true })], 0, 3.4, 0);
  const tw = grp(0, 0, 0.2); h.add(tw); add(k, tw, box(1.8, 7.5, 1.8), stone, 0, 3.75, 0); add(k, tw, cone(1.5, 2.2, 4), k.m('#3a4a5a', { flatShading: true }), 0, 8.6, 0).rotation.y = Math.PI / 4;
  const face = canvas(128, 128, (c) => { c.fillStyle = '#fffaf0'; c.beginPath(); c.arc(64, 64, 60, 0, TAU); c.fill(); c.strokeStyle = '#2b2b2b'; c.lineWidth = 5; c.stroke(); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; c.fillStyle = '#2b2b2b'; c.fillRect(64 + Math.cos(a) * 48 - 3, 64 + Math.sin(a) * 48 - 3, 6, 6); } });
  add(k, tw, new THREE.CircleGeometry(0.7, 32), new THREE.MeshStandardMaterial({ map: face, emissive: C(k.night ? '#fff6d0' : '#000'), emissiveMap: k.night ? face : null, emissiveIntensity: 0.9 }), 0, 6.2, 0.91, false);
  const hand = add(k, tw, box(0.06, 0.5, 0.02), '#2b2b2b', 0, 6.2, 0.93, false); hand.geometry.translate(0, 0.22, 0); k.anim.push((t) => { hand.rotation.z = -t * 0.3; });
  for (const x of [-2.6, 2.6]) { add(k, h, cyl(0.03, 0.03, 2.2, 6), '#555', x, 4.4, HD / 2 - 0.3); add(k, h, box(0.7, 0.45, 0.02), hex(pal[0]), x + 0.36, 5.2, HD / 2 - 0.3); }
  const sign = nameSign(k, 4.4, 0.6, '#2f4a5a', '#fff3c4'); sign.position.set(0, 2.75, HD / 2 - 0.15); h.add(sign);
  add(k, h, box(1.4, 2.0, 0.1), k.m('#6b4a35'), 0, 1.0, HD / 2 - 0.15);
  // 廣場四周的彩色排屋
  const walls = ['#f2b5a0', '#a8d0e6', '#f6dd8a', '#b8e0b0', '#d8b8e8', '#f4c48a', '#e8e0d0'];
  let n = 0;
  for (let i = 0; i < 40 && n < (mobile ? 9 : 16); i++) {
    const a = -Math.PI + (i + 0.5) / 40 * TAU, r = Math.abs(a) < 2.3 ? 13.2 : 11.0, x = Math.sin(a) * r, z = Math.cos(a) * r;
    if (Math.abs(a) < 0.9) continue; // 正前方留空看得到廣場
    const w = 1.8 + k.rnd() * 0.6, hh = 3.2 + k.rnd() * 2.2; if (!clear(x, z, 1.4, hh + 1)) continue; if (x > HERO.x0 - 1.5 && x < HERO.x1 + 1.5 && z < HERO.z1 + 1) continue;
    const g = grp(x, 0, z); g.rotation.y = a + Math.PI; world.add(g); const c = walls[n % walls.length];
    add(k, g, box(w, hh, 2.2), windowMat(k, c, w, hh, { cols: 2, rows: 3, glass: '#5b7b98', seed: 3 + n }), 0, hh / 2, 0);
    add(k, g, gable(2.2, w, 1.0, 0.12), [k.m(c), k.m(['#8a3a2a', '#3a4a5a', '#5a4a44'][n % 3], { flatShading: true })], 0, hh, 0).rotation.y = 0;
    add(k, g, box(0.5, 0.9, 0.05), '#6b4a35', 0, 0.45, 1.11);
    n++;
  }
  // 三角旗串、市集陽傘攤、路燈
  const flagC = [hex(pal[0]), '#e74c3c', '#f1c40f', '#3498db', '#2ecc71'];
  for (let s = 0; s < 4; s++) { const a0 = -2.4 + s * 1.6, x0 = Math.sin(a0) * (CORE - 0.4), z0 = Math.cos(a0) * (CORE - 0.4); add(k, world, cyl(0.05, 0.06, 4, 6), '#555', x0, 2, z0);
    for (let j = 1; j < 10; j++) { const u = j / 10, x = x0 * (1 - u), z = z0 * (1 - u) + 0.9 * u, y = 4 - Math.sin(Math.PI * u) * 0.8 + u * 0.4; const f = add(k, world, cone(0.18, 0.35, 3), flagC[j % flagC.length], x, y - 0.18, z, false); f.rotation.x = Math.PI; } }
  return { features: ['鐘樓市政廳', '彩色排屋', '石板廣場', '三角旗'], heroH: 9.5 };
}

// ================= 森林樹屋 =================
function forest({ k, world, pal, clear, mobile }) {
  ground(k, world, { color: k.night ? '#223a22' : '#3f6b3a', core: k.night ? '#3a5a32' : '#6a9a4f', edge: '#5a4a34' });
  // 樹屋工坊（主建築）：大樹幹、樹冠、繞樹的平台與木屋、樓梯
  const h = grp(HX, 0.12, HZ - 0.6); world.add(h);
  const bark = k.m('#6b4a2e', { roughness: 1, flatShading: true });
  add(k, h, cyl(1.1, 1.7, 9, 10), bark, 0, 4.5, -0.6);
  add(k, h, new THREE.IcosahedronGeometry(4.2, 1), k.m(k.night ? '#2e5a35' : '#4f9a45', { flatShading: true }), 0, 10.2, -0.6);
  add(k, h, new THREE.IcosahedronGeometry(2.8, 1), k.m(k.night ? '#24573a' : '#3d8a45', { flatShading: true }), 2.6, 9.0, 0.4);
  add(k, h, cyl(3.4, 3.4, 0.25, 24), k.m('#a8754a'), 0, 3.4, 0);
  const logs = canvas(64, 64, (c) => { for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#9a6a42' : '#b07b4f'; c.fillRect(0, i * 10.7, 64, 10.7); } });
  const cab = grp(0, 3.5, 0.6); h.add(cab); add(k, cab, box(3.6, 2.0, 2.0), new THREE.MeshStandardMaterial({ map: logs }), 0, 1.0, 0); add(k, cab, gable(3.6, 2.0, 1.2, 0.25), [k.m('#9a6a42'), k.m('#5a3d2b', { flatShading: true })], 0, 2.0, 0);
  for (const x of [-1.1, 1.1]) add(k, cab, box(0.6, 0.5, 0.05), k.night ? k.glow('#ffc46b', 1.6) : k.m('#cfe9ff'), x, 1.1, 1.01, false);
  for (let i = 0; i < 20; i++) { const a = i / 20 * TAU; add(k, h, box(0.06, 0.6, 0.06), '#8a5a3a', Math.sin(a) * 3.3, 3.8, Math.cos(a) * 3.3); }
  for (let i = 0; i < 12; i++) { const a = 1.2 + i * 0.22, y = 0.15 + i * 0.27; add(k, h, box(0.9, 0.08, 0.35), '#a8754a', Math.sin(a) * 2.2, y, Math.cos(a) * 2.2).rotation.y = a; }
  // 地面的工坊門口（客人從這裡進出）
  add(k, h, box(2.6, 2.2, 1.0), new THREE.MeshStandardMaterial({ map: logs }), 0, 1.1, 1.6); add(k, h, box(0.9, 1.6, 0.05), '#4a2f1e', 0, 0.8, 2.11);
  const sign = nameSign(k, 2.6, 0.5, '#4a2f1e', '#f2d39a'); sign.position.set(0, 2.5, 2.12); h.add(sign);
  if (k.night) { const l = new THREE.PointLight(0xffb84d, 5, 9); l.position.set(0, 4.5, 2.2); h.add(l); }
  // 參天巨樹
  ringOut(k, clear, mobile ? 7 : 13, 13, 30, 12, 3.5, (x, z) => { const g = grp(x, 0, z); const s = 0.8 + k.rnd() * 0.6; g.scale.setScalar(s);
    add(k, g, cyl(1.2, 1.9, 11, 9), bark, 0, 5.5, 0); add(k, g, new THREE.IcosahedronGeometry(5, 1), k.m(k.night ? '#24573a' : ['#3d8a45', '#4f9a45', '#2f7a3a'][Math.floor(k.rnd() * 3)], { flatShading: true }), 0, 12.5, 0); world.add(g); return g; }, { front: false });
  ringOut(k, clear, mobile ? 10 : 22, 9.5, 20, 4, 1.2, (x, z) => { world.add(bigTree(k, x, z, 0.8 + k.rnd() * 0.5, k.night ? '#2e5a45' : '#3d7a4a', 'pine')); return 1; });
  // 巨型蘑菇、螢火蟲
  ringOut(k, clear, mobile ? 4 : 8, 9.2, 14, 2.2, 0.9, (x, z) => { const g = grp(x, 0, z); const s = 0.7 + k.rnd() * 0.7; g.scale.setScalar(s); add(k, g, cyl(0.25, 0.35, 1.4, 10), '#f4efe4', 0, 0.7, 0);
    add(k, g, dome(1.0, 18, 8), k.night ? k.glow('#ff5a6a', 0.6) : k.m('#e8384f'), 0, 1.35, 0).scale.y = 0.7; for (let i = 0; i < 6; i++) add(k, g, sph(0.12, 8, 6), '#ffffff', Math.cos(i) * 0.6, 1.75 - (i % 2) * 0.15, Math.sin(i) * 0.6); world.add(g); return g; });
  const N = mobile ? 40 : 90, pa = new Float32Array(N * 3); for (let i = 0; i < N; i++) { pa[i * 3] = (k.rnd() - 0.5) * 30; pa[i * 3 + 1] = 0.5 + k.rnd() * 4; pa[i * 3 + 2] = (k.rnd() - 0.5) * 30; }
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(pa, 3));
  const ff = new THREE.Points(fg, new THREE.PointsMaterial({ color: 0xd8ff6a, size: k.night ? 0.18 : 0.1, transparent: true, opacity: k.night ? 1 : 0.6, depthWrite: false })); world.add(ff);
  k.anim.push((t) => { ff.rotation.y = t * 0.02; ff.material.opacity = (k.night ? 0.7 : 0.4) + Math.sin(t * 2) * 0.25; });
  return { features: ['巨木樹屋', '參天巨樹', '巨型蘑菇', '螢火蟲'], heroH: 13 };
}

// ================= 玻璃溫室花田 =================
function garden({ k, world, pal, clear }) {
  ground(k, world, { color: '#6aa84f', core: '#efe9dc', edge: '#5a8a45', edgeH: 0.5 });
  // 維多利亞玻璃溫室（主建築）：中央圓頂＋兩翼
  const h = grp(HX, 0.12, HZ); world.add(h);
  const glassM = new THREE.MeshStandardMaterial({ color: 0xe6f7ff, transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.2, depthWrite: false, side: THREE.DoubleSide });
  const frame = new THREE.LineBasicMaterial({ color: 0xffffff });
  const glassBox = (geo, x, y, z) => { const m = new THREE.Mesh(geo, glassM); m.position.set(x, y, z); h.add(m); const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 1), frame); e.position.copy(m.position); h.add(e); return m; };
  glassBox(cyl(2.0, 2.0, 2.6, 16, true), 0, 1.3, -0.2); glassBox(new THREE.SphereGeometry(2.0, 16, 8, 0, TAU, 0, Math.PI / 2), 0, 2.6, -0.2);
  add(k, h, cyl(0.12, 0.12, 0.8, 8), '#ffffff', 0, 4.9, -0.2);
  for (const s of [-1, 1]) { glassBox(box(1.9, 2.0, 2.8), s * 2.6, 1.0, 0); glassBox(gable(1.9, 2.8, 0.9, 0), s * 2.6, 2.0, 0); }
  for (let i = 0; i < 16; i++) add(k, h, k.g('gplant', () => new THREE.IcosahedronGeometry(0.4, 0)), k.m(i % 3 ? '#3f9a4f' : hex(pal[i % 6]), { flatShading: true }), Math.cos(i * 2.4) * (0.8 + (i % 4) * 0.8), 0.45 + (i % 3) * 0.3, Math.sin(i * 2.4) * 0.9);
  add(k, h, cyl(0.2, 0.25, 3.2, 8), '#7a5236', 0, 1.6, -0.2); add(k, h, new THREE.IcosahedronGeometry(1.1, 0), k.m('#4f9a45', { flatShading: true }), 0, 3.0, -0.2);
  const sign = nameSign(k, 3.2, 0.5, '#2f5a3a', '#ffffff'); sign.position.set(0, 2.35, 1.42); h.add(sign);
  // 鬱金香花田（一條一條的色帶，延伸到遠方）
  const tulipG = k.g('tulip', () => { const g = sph(0.16, 8, 6); g.scale(1, 1.3, 1); return g; });
  const bands = ['#e8384f', '#f7d046', '#ff8fb1', '#9b6bd8', '#ffffff', '#ff7a2e'];
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), pos = new THREE.Vector3();
  bands.forEach((c, bi) => { for (const side of [-1, 1]) {
    const inst = new THREE.InstancedMesh(tulipG, new THREE.MeshStandardMaterial({ color: C(c), roughness: 0.5 }), 420); let n = 0;
    for (let row = 0; row < 3; row++) for (let i = 0; i < 140 && n < 420; i++) { const x = side * (11 + bi * 2.6 + row * 0.7), z = -40 + i * 0.6; if (Math.hypot(x, z) < CORE + 1) continue; pos.set(x, 0.42, z); mtx.compose(pos, q, sc); inst.setMatrixAt(n++, mtx); }
    inst.count = n; world.add(inst); } });
  // 風車（扇葉會轉）
  for (const [x, z, s] of [[-22, -24, 1.4], [24, -30, 1.1]]) { const g = grp(x, 0, z); g.scale.setScalar(s); add(k, g, cyl(1.0, 1.6, 6, 8), '#c97a5a', 0, 3, 0, { flatShading: true }); add(k, g, cone(1.3, 1.6, 8), '#5a4a44', 0, 6.8, 0);
    const hub = grp(0, 5.8, 1.4); g.add(hub); for (let i = 0; i < 4; i++) { const b = add(k, hub, box(0.6, 4.2, 0.08), '#f4efe4', 0, 0, 0); b.geometry = new THREE.BoxGeometry(0.6, 4.2, 0.08).translate(0, 2.2, 0); b.rotation.z = i * Math.PI / 2; }
    k.anim.push((t) => { hub.rotation.z = t * 0.5; }); g.rotation.y = Math.atan2(-x, -z) + Math.PI; world.add(g); }
  // 花拱門與樹籬
  for (const a of [-2.3, 2.3, -1.2, 1.2]) { const x = Math.sin(a) * (CORE + 1.2), z = Math.cos(a) * (CORE + 1.2); if (!clear(x, z, 1, 2.5)) continue; const g = grp(x, 0, z); g.rotation.y = a; add(k, g, new THREE.TorusGeometry(1.0, 0.08, 8, 24, Math.PI), '#ffffff', 0, 1.2, 0);
    for (let i = 0; i <= 10; i++) { const u = i / 10 * Math.PI; add(k, g, k.g('abl2', () => new THREE.IcosahedronGeometry(0.12, 0)), bands[i % 4], Math.cos(u), 1.2 + Math.sin(u), 0.06); } world.add(g); }
  return { features: ['玻璃溫室', '鬱金香花田', '風車', '花拱門'], heroH: 5.6 };
}

// ================= 海濱度假飯店 =================
function resort({ k, world, pal, clear, mobile }) {
  ground(k, world, { color: '#f3e2b8', core: '#f4f1ea', edge: '#e0d6c0' });
  waterPlane(k, world, 160, 340, -94, 0, { color: '#2fb5d0', y: 0.03, speed: [0.012, 0.004] });
  waterPlane(k, world, 6, 340, -14.5, 0, { color: '#7fe0e0', y: 0.035, speed: [0.03, 0.01], opacity: 0.85 });
  // 度假飯店（主建築）：白色高樓、每層陽台、藍玻璃、屋頂招牌
  const h = grp(HX, 0.12, HZ - 0.6); world.add(h);
  add(k, h, box(HW, 10, HD - 1.2), windowMat(k, '#fbfbf7', HW, 10, { cols: 8, rows: 8, glass: '#7cc7e8', lit: 0.5 }), 0, 5, -0.6);
  for (let f = 1; f < 9; f++) add(k, h, box(HW + 0.3, 0.1, 0.9), k.m('#ffffff'), 0, f * 1.12, HD / 2 - 0.65);
  add(k, h, box(3.6, 0.2, 2.0), k.m(hex(pal[0])), 0, 1.25, HD / 2 + 0.2); for (const x of [-1.6, 1.6]) add(k, h, cyl(0.06, 0.06, 1.2, 8), '#ffffff', x, 0.6, HD / 2 + 1.1);
  add(k, h, box(2.4, 1.0, 0.05), k.m('#bfe8ff', { roughness: 0.05 }), 0, 0.5, HD / 2 - 0.6);
  const sign = nameSign(k, 5.6, 0.9, '#0f5c7a', '#ffffff'); sign.position.set(0, 10.6, HD / 2 - 1.0); h.add(sign);
  // 沙灘陽傘、躺椅、棕櫚樹
  const cs = [hex(pal[0]), '#ff6b6b', '#ffd34e', '#4ecdc4', '#ffffff'];
  for (let i = 0; i < (mobile ? 5 : 10); i++) { const z = -18 + i * 4 + k.rnd(), x = -10.2 - k.rnd() * 1.2; if (Math.hypot(x, z) < CORE + 0.8) continue; world.add(umbrella(k, x, z, cs[i % cs.length], { h: 1.6, r: 0.8 })); const l = add(k, world, box(1.2, 0.08, 0.5), '#ffffff', x - 0.9, 0.25, z); l.rotation.y = 0.2; }
  ringOut(k, clear, mobile ? 6 : 12, 9.4, 18, 4, 1, (x, z) => { if (x < -9) return null; world.add(tree(k, x, z, 'palm', 1.5 + k.rnd() * 0.5)); return 1; });
  // 無邊際泳池（兩側）
  for (const [x, z] of [[13, -3], [12, 7]]) { if (!clear(x, z, 2.5, 1)) continue; add(k, world, box(5, 0.5, 3.2), '#f4f1ea', x, 0.25, z); waterPlane(k, world, 4.6, 2.8, x, z, { color: '#4fd3e6', y: 0.51, speed: [0.02, 0.03] }); for (let i = 0; i < 3; i++) add(k, world, box(0.5, 0.1, 1.2), cs[i], x - 1.8 + i * 1.8, 0.55, z + 2.3); }
  // 碼頭與快艇、帆船
  const jt = grp(-15, 0, 4); jt.rotation.y = -Math.PI / 2; world.add(jt); add(k, jt, box(1.4, 0.15, 10), '#a8754a', 0, 0.3, 4); for (let i = 0; i < 5; i++) for (const s of [-0.6, 0.6]) add(k, jt, cyl(0.07, 0.07, 1.2, 6), '#7a5236', s, -0.2, i * 2.2);
  const sp = grp(0, 0, 0); world.add(sp); add(k, sp, box(0.9, 0.35, 2.4), '#ffffff', 0, 0.2, 0); add(k, sp, box(0.8, 0.3, 0.7), '#24313d', 0, 0.45, 0.1); add(k, sp, box(0.95, 0.06, 2.4), hex(pal[0]), 0, 0.12, 0);
  k.anim.push((t) => { const a = t * 0.12; sp.position.set(-30 + Math.cos(a) * 8, 0.06 + Math.sin(t * 2) * 0.04, -4 + Math.sin(a) * 14); sp.rotation.y = -a; });
  const sb = makeBoat(pal, k.night); world.add(sb.group); sb.group.scale.setScalar(1.6); k.anim.push((t) => { const a = t * 0.03 + 2; sb.group.position.set(-40 + Math.cos(a) * 10, 0.02, -10 + Math.sin(a) * 26); sb.group.rotation.y = -a; sb.update(t); });
  return { features: ['度假飯店', '無邊際泳池', '沙灘陽傘', '碼頭快艇'], heroH: 11.2 };
}

// ================= 田園牧場 =================
function farm({ k, world, pal, clear, mobile }) {
  const patch = canvas(512, 512, (g) => { const cs = ['#8fc45a', '#c9d46a', '#6ea64a', '#d9b96a', '#a8c87a', '#7a5a3a']; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = cs[(i * 5 + j * 3) % cs.length]; g.fillRect(i * 64, j * 64, 64, 64); g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 2; for (let r = 0; r < 64; r += 8) { g.beginPath(); if ((i + j) % 2) { g.moveTo(i * 64 + r, j * 64); g.lineTo(i * 64 + r, j * 64 + 64); } else { g.moveTo(i * 64, j * 64 + r); g.lineTo(i * 64 + 64, j * 64 + r); } g.stroke(); } } });
  patch.wrapS = patch.wrapT = THREE.RepeatWrapping; patch.repeat.set(6, 6);
  const gp = new THREE.Mesh(new THREE.PlaneGeometry(320, 320), new THREE.MeshStandardMaterial({ map: patch, roughness: 1 })); gp.rotation.x = -Math.PI / 2; gp.position.y = -0.005; gp.receiveShadow = true; world.add(gp);
  ground(k, world, { color: null, core: '#d9c39a', edge: '#f4ead8', edgeH: 0.5 });
  // 紅色穀倉＋筒倉（主建築）
  const h = grp(HX, 0.12, HZ); world.add(h); const red = k.m('#c2453a', { roughness: 0.75 });
  add(k, h, box(HW - 1.6, 3.2, HD - 0.4), red, -0.8, 1.6, 0);
  const s = new THREE.Shape(); [[-1.9, 0], [-1.7, 1.0], [0, 1.9], [1.7, 1.0], [1.9, 0]].forEach(([u, v], i) => (i ? s.lineTo(u, v) : s.moveTo(u, v))); const rg = new THREE.ExtrudeGeometry(s, { depth: HW - 1.2, bevelEnabled: false }); rg.translate(0, 0, -(HW - 1.2) / 2); rg.rotateY(Math.PI / 2);
  add(k, h, rg, [red, k.m('#5a4a44', { flatShading: true })], -0.8, 3.2, 0);
  for (const [x, y, w, hh] of [[-0.8, 1.0, 1.8, 2.0], [-0.8, 3.9, 0.9, 0.8]]) { add(k, h, box(w, hh, 0.06), k.m('#ffffff'), x, y, HD / 2 - 0.17); const xb = add(k, h, box(w * 1.1, 0.08, 0.04), k.m('#ffffff'), x, y, HD / 2 - 0.13); xb.rotation.z = 0.8; const xb2 = xb.clone(); xb2.rotation.z = -0.8; h.add(xb2); }
  add(k, h, cyl(0.9, 0.9, 6.5, 18), k.m('#d9dde0', { metalness: 0.3, roughness: 0.5 }), 2.7, 3.25, -0.2); add(k, h, dome(0.9, 18, 8), red, 2.7, 6.5, -0.2);
  const sign = nameSign(k, 3.4, 0.55, '#ffffff', '#c2453a'); sign.position.set(-0.8, 2.5, HD / 2 - 0.1); h.add(sign);
  // 風車抽水機
  const wm = grp(-12, 0, -9); world.add(wm); for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) { const l = add(k, wm, box(0.08, 7, 0.08), '#8d949a', x * 0.5, 3.5, z * 0.5); l.rotation.set(z * 0.08, 0, -x * 0.08); }
  const fan = grp(0, 7.2, 0.4); wm.add(fan); for (let i = 0; i < 12; i++) { const b = add(k, fan, box(0.25, 1.4, 0.03), '#e8e8e8', 0, 0, 0); b.geometry = new THREE.BoxGeometry(0.25, 1.4, 0.03).translate(0, 0.8, 0); b.rotation.z = i / 12 * TAU; } k.anim.push((t) => { fan.rotation.z = t * 1.4; });
  // 圍籬、乾草捆
  const fM = k.m('#f4ead8');
  for (let i = 0; i < 46; i++) { const a = -Math.PI + (i + 0.5) / 46 * TAU, r = CORE + 4; const x = Math.sin(a) * r, z = Math.cos(a) * r; add(k, world, box(0.1, 0.8, 0.1), fM, x, 0.4, z); const rl = add(k, world, box(0.06, 0.08, TAU * r / 46), fM, x, 0.6, z); rl.rotation.y = a + Math.PI / 2; }
  ringOut(k, clear, mobile ? 5 : 10, 14, 30, 1.2, 0.6, (x, z) => { const b = add(k, world, cyl(0.6, 0.6, 1.0, 16), '#e2c15a', x, 0.6, z, { roughness: 1 }); b.rotation.set(Math.PI / 2, 0, k.rnd() * 3); return b; });
  // 牛、羊（慢慢走、低頭吃草）、拖拉機開過田埂
  const animal = (x, z, sheep) => { const g = grp(x, 0, z); const wM = k.m(sheep ? '#f4f1ea' : '#fbf7f0'), bM = k.m('#2b2b2b'); if (sheep) { add(k, g, sph(0.45, 10, 8), wM, 0, 0.7, 0).scale.set(1, 0.85, 1.3); } else { add(k, g, box(0.6, 0.55, 1.1), wM, 0, 0.75, 0); add(k, g, box(0.62, 0.3, 0.35), bM, 0, 0.85, -0.1); }
    const hd = grp(0, sheep ? 0.75 : 0.9, sheep ? 0.55 : 0.6); g.add(hd); add(k, hd, box(0.32, 0.32, 0.36), sheep ? bM : wM, 0, 0, 0.12); for (const lx of [-0.18, 0.18]) for (const lz of [-0.35, 0.35]) add(k, g, box(0.12, 0.5, 0.12), sheep ? bM : wM, lx, 0.25, lz);
    world.add(g); let tx = x, tz = z, wait = 2, last = 0; k.anim.push((t) => { const dt = Math.min(0.05, t - last); last = t; const dx = tx - g.position.x, dz = tz - g.position.z, d = Math.hypot(dx, dz); if (d > 0.05) { g.position.x += dx / d * 0.25 * dt; g.position.z += dz / d * 0.25 * dt; g.rotation.y = Math.atan2(dx, dz); hd.rotation.x = 0; } else { hd.rotation.x = 0.5 + Math.sin(t * 2) * 0.15; wait -= dt; if (wait < 0) { const a = k.rnd() * TAU; tx = x + Math.sin(a) * 1.5; tz = z + Math.cos(a) * 1.5; wait = 3 + k.rnd() * 3; } } }); };
  ringOut(k, clear, mobile ? 4 : 8, 14, 24, 1.2, 1, (x, z) => { animal(x, z, k.rnd() < 0.5); return 1; });
  const tr = grp(0, 0, 0); world.add(tr); add(k, tr, box(1.0, 0.8, 1.6), '#c0392b', 0, 0.9, 0); add(k, tr, box(0.9, 0.9, 0.8), '#c0392b', 0, 1.7, -0.3); for (const s of [-1, 1]) { const w = add(k, tr, cyl(0.6, 0.6, 0.3, 16), '#2b2b2b', s * 0.62, 0.6, -0.5); w.rotation.z = Math.PI / 2; const f = add(k, tr, cyl(0.35, 0.35, 0.25, 12), '#2b2b2b', s * 0.55, 0.35, 0.65); f.rotation.z = Math.PI / 2; }
  puffs(k, tr, 0.3, 2.2, 0.5, { n: 3, size: 0.12, rise: 0.8, opacity: 0.4 });
  k.anim.push((t) => { const u = (t * 0.025) % 1, x = -40 + u * 80; tr.position.set(x, 0.02, 20); tr.rotation.y = Math.PI / 2; });
  return { features: ['紅色穀倉', '拼布農田', '風車抽水機', '牛羊', '拖拉機'], heroH: 7.2 };
}

// ================= 雪山木屋 =================
function snow({ k, world, pal, clear, mobile }) {
  ground(k, world, { color: '#f2f6fa', core: '#e3ebf2', edge: '#ffffff', edgeH: 0.4 });
  // 雪山（岩石山體＋雪頂）
  for (const [x, z, s] of [[-30, -45, 26], [6, -58, 34], [40, -42, 24], [-55, -10, 20], [58, -8, 22]]) { const g = grp(x, 0, z); add(k, g, cone(s, s * 1.1, 9), k.m('#7d8590', { flatShading: true }), 0, s * 0.55, 0); add(k, g, cone(s * 0.48, s * 0.55, 9), k.m('#ffffff', { flatShading: true }), 0, s * 0.83, 0); world.add(g); }
  // 雪地松林
  ringOut(k, clear, mobile ? 14 : 30, 9.6, 34, 5, 1.2, (x, z) => { const t = bigTree(k, x, z, 0.7 + k.rnd() * 0.6, k.night ? '#2e5a45' : '#3d7a5a', 'pine'); [[1.0, 2.4], [0.7, 3.3]].forEach(([r, y]) => add(k, t, k.g('scap' + r, () => cone(r, 0.5, 8)), '#ffffff', 0, y, 0)); world.add(t); return 1; }, { front: true });
  // 阿爾卑斯山屋（主建築）：兩層原木、陡峭積雪屋頂、陽台、煙囪
  const h = grp(HX, 0.12, HZ); world.add(h);
  const logs = canvas(64, 64, (c) => { for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#8a5a35' : '#a06a40'; c.fillRect(0, i * 10.7, 64, 10.7); c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(0, (i + 1) * 10.7 - 2, 64, 2); } }); logs.wrapS = logs.wrapT = THREE.RepeatWrapping; logs.repeat.set(3, 2);
  const lm = new THREE.MeshStandardMaterial({ map: logs, roughness: 0.9 });
  add(k, h, box(HW - 0.8, 3.6, HD - 0.6), lm, 0, 1.8, 0);
  const rf = new THREE.Shape(); rf.moveTo(-2.6, 0); rf.lineTo(2.6, 0); rf.lineTo(0, 3.4); const rg = new THREE.ExtrudeGeometry(rf, { depth: HW, bevelEnabled: false }); rg.translate(0, 0, -HW / 2); rg.rotateY(Math.PI / 2);
  add(k, h, rg, [lm, k.m('#ffffff', { flatShading: true })], 0, 3.6, 0);
  add(k, h, box(HW - 0.4, 0.12, 1.2), k.m('#6b4a35'), 0, 2.2, HD / 2 + 0.2); for (let i = 0; i < 12; i++) add(k, h, box(0.06, 0.6, 0.06), '#6b4a35', -3 + i * 0.55, 2.55, HD / 2 + 0.75);
  const win = k.night ? k.glow('#ffc46b', 1.8) : k.m('#cfe9ff', { roughness: 0.2 });
  for (const x of [-2.2, 2.2]) for (const y of [1.0, 3.0]) add(k, h, box(1.0, 0.8, 0.05), win, x, y, HD / 2 - 0.28, false);
  add(k, h, box(1.2, 1.8, 0.06), '#4a2f1e', 0, 0.9, HD / 2 - 0.28); add(k, h, box(0.5, 1.6, 0.5), k.m('#8b8580', { flatShading: true }), 2.0, 6.2, -0.6);
  puffs(k, h, 2.0, 7.1, -0.6, { n: 5, color: 0xeeeeee, size: 0.25, rise: 2, speed: 0.18, opacity: 0.6 });
  const sign = nameSign(k, 3.6, 0.6, '#5a3418', '#ffffff'); sign.position.set(0, 3.3, HD / 2 - 0.25); h.add(sign);
  if (k.night) { const l = new THREE.PointLight(0xffb84d, 5, 9); l.position.set(0, 2, HD / 2 + 1.5); h.add(l); }
  // 滑雪纜車（椅子沿纜繩上山）
  const A = new THREE.Vector3(9, 0.5, -11), B = new THREE.Vector3(30, 18, -40);
  for (let i = 0; i <= 4; i++) { const p = A.clone().lerp(B, i / 4); add(k, world, box(0.3, 4 + i * 0.3, 0.3), '#5a5f6a', p.x, p.y + 2, p.z); add(k, world, box(1.6, 0.15, 0.15), '#5a5f6a', p.x, p.y + 4.2 + i * 0.3, p.z); }
  const chairs = []; for (let i = 0; i < 10; i++) { const c = grp(); add(k, c, box(0.7, 0.08, 0.5), hex(pal[i % 6]), 0, 0, 0); add(k, c, box(0.04, 0.9, 0.04), '#333', 0, 0.45, 0); world.add(c); chairs.push(c); }
  k.anim.push((t) => chairs.forEach((c, i) => { const u = (t * 0.02 + i / 10) % 1, up = i % 2 === 0; const p = (up ? A.clone().lerp(B, u) : B.clone().lerp(A, u)); c.position.set(p.x + (up ? -0.6 : 0.6), p.y + 3.4, p.z); }));
  // 結冰湖＋雪人
  const lake = add(k, world, cyl(5, 5, 0.06, 40), '#cfeefc', -14, 0.03, 2, { roughness: 0.05, metalness: 0.2 }); lake.receiveShadow = true;
  for (const [x, z] of [[-9.6, 7], [11, 6]]) { if (!clear(x, z, 0.5, 2)) continue; const g = grp(x, 0, z); const w = k.m('#ffffff'); add(k, g, sph(0.5), w, 0, 0.45, 0); add(k, g, sph(0.36), w, 0, 1.15, 0); add(k, g, sph(0.25), w, 0, 1.65, 0); add(k, g, cone(0.05, 0.25, 6), '#f28c28', 0, 1.65, 0.27).rotation.x = Math.PI / 2; add(k, g, cyl(0.18, 0.2, 0.25, 12), hex(pal[0]), 0, 1.95, 0); g.rotation.y = Math.atan2(-x, 20 - z); world.add(g); }
  // 飄雪
  const N = mobile ? 200 : 420, a = new Float32Array(N * 3); for (let i = 0; i < N; i++) { a[i * 3] = (k.rnd() - 0.5) * 40; a[i * 3 + 1] = k.rnd() * 14; a[i * 3 + 2] = (k.rnd() - 0.5) * 40; }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(a, 3)); world.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, transparent: true, opacity: 0.9, depthWrite: false })));
  let last = 0; k.anim.push((t) => { const dt = Math.min(0.05, t - last); last = t; const p = geo.attributes.position; for (let i = 0; i < N; i++) { let y = p.getY(i) - dt * 0.9; if (y < 0) y = 14; p.setY(i, y); } p.needsUpdate = true; });
  return { spots: [{ x: -14 + 2.5, z: 2, y: 0.07, face: [-14, 5], pose: 'stand', hat: 'beanie', skate: { cx: -14, cz: 2, r: 2.5 } }], features: ['雪山', '阿爾卑斯山屋', '滑雪纜車', '結冰湖', '飄雪'], heroH: 7.2 };
}

export const WORLDS_A = {
  candy: { id: 'candy', kind: 'world', name: '糖果王國', sky: { top: '#ff9fd0', bot: '#fff1f8' }, cloud: '#ffd1ea', build: candy },
  market: { id: 'market', kind: 'world', name: '夜市老街', night: true, build: market },
  tea: { id: 'tea', kind: 'world', name: '梯田茶山', sky: { top: '#a9cfe0', bot: '#f2f5f0' }, hat: 'straw', build: tea },
  town: { id: 'town', kind: 'world', name: '歐風小鎮', build: town },
  forest: { id: 'forest', kind: 'world', name: '森林樹屋', sky: { top: '#7fb8a8', bot: '#e6f0dc' }, build: forest },
  garden: { id: 'garden', kind: 'world', name: '玻璃溫室花田', build: garden },
  resort: { id: 'resort', kind: 'world', name: '海濱度假飯店', sky: { top: '#3fa8ff', bot: '#e8fbff' }, hat: 'sun', build: resort },
  farm: { id: 'farm', kind: 'world', name: '田園牧場', hat: 'straw', build: farm },
  snow: { id: 'snow', kind: 'world', name: '雪山木屋', sky: { top: '#9ec4e8', bot: '#f4f8fc' }, hat: 'beanie', cloud: '#f4f8fc', build: snow },
};
