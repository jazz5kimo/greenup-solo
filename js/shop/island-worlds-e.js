// 主題世界（五）：陶瓷窯場、水晶礦洞、伐木場、時裝伸展台、染布村、粉紅美妝大道、星光大道、蝴蝶花園
import * as THREE from 'three';
import { TENANT } from '../tenant.js';
import { puffs, lamp, tree, flowerRow } from './island-scenes.js';
import { TAU, C, hex, CORE, HERO, canvas, add, grp, box, cyl, sph, cone, dome, gable, nameSign, windowMat, ground, waterPlane, bigTree } from './island-worlds.js';

const HX = (HERO.x0 + HERO.x1) / 2, HZ = (HERO.z0 + HERO.z1) / 2, HW = HERO.x1 - HERO.x0, HD = HERO.z1 - HERO.z0;
// 在環狀的外圍放東西：避開鏡頭路線；front=false 時不放在正前方（不擋開場全景）
function ringOut(k, clear, n, r0, r1, h, rad, make, { front = true, back = true } = {}) {
  let c = 0;
  for (let i = 0; i < n * 6 && c < n; i++) {
    const a = k.rnd() * TAU, r = r0 + k.rnd() * (r1 - r0), x = Math.sin(a) * r, z = Math.cos(a) * r;
    if (!front && z > 4) continue; if (!back && z < -6) continue;
    if (!clear(x, z, rad, h)) continue;
    if (make(x, z, a)) c++; }
}
const stripeTex = (a, b, n = 8, v = true) => canvas(128, 128, (g, w, h) => { for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? b : a; if (v) g.fillRect(i * w / n, 0, w / n + 1, h); else g.fillRect(0, i * h / n, w, h / n + 1); } });
const rep = (t, x, y) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(x, y); return t; };
// 一直發光的材質（火、水晶、燈泡）
const lit = (c, p = 1.2, o = {}) => new THREE.MeshStandardMaterial({ color: C(c), emissive: C(c), emissiveIntensity: p, roughness: 0.4, ...o });
const beamM = (c, op) => new THREE.MeshBasicMaterial({ color: C(c), transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
const D = new THREE.Object3D();
// 一批相同的東西共用一個 InstancedMesh；items：[x, y, z, 縮放（數字或 [sx,sy,sz]）, ry, rx, rz]
function inst(parent, geo, mat, items, colors, cast = true) {
  const m = new THREE.InstancedMesh(geo, mat, Math.max(1, items.length));
  items.forEach(([x, y, z, s = 1, ry = 0, rx = 0, rz = 0], i) => { D.position.set(x, y, z); D.rotation.set(rx, ry, rz, 'XYZ'); if (Array.isArray(s)) D.scale.set(s[0], s[1], s[2]); else D.scale.setScalar(s); D.updateMatrix(); m.setMatrixAt(i, D.matrix); if (colors) m.setColorAt(i, C(colors[i % colors.length])); });
  m.count = items.length; m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m;
}
// 外圍找一批不重疊的位置
function scatter(k, clear, n, r0, r1, h, rad, { front = true, back = true, avoid = null, gap = 1.6 } = {}) {
  const out = [];
  ringOut(k, clear, n, r0, r1, h, rad, (x, z, a) => { if (avoid && avoid(x, z)) return 0; if (out.some(p => Math.hypot(p[0] - x, p[1] - z) < rad * gap)) return 0; out.push([x, z, a]); return 1; }, { front, back });
  return out;
}
// 松林（整片共用 InstancedMesh）；pts：[x, z, 縮放, 地面高]
function pines(k, parent, pts, leaf, trunk = '#6b4a2e') {
  if (!pts.length) return;
  inst(parent, k.g('e-ptrunk', () => cyl(0.18, 0.28, 1.6, 6)), k.m(trunk), pts.map(([x, z, s, y0 = 0]) => [x, y0 + 0.8 * s, z, s]));
  [[1.2, 1.6, 1.8], [0.95, 1.4, 2.6], [0.65, 1.2, 3.3]].forEach(([r, hh, y]) => inst(parent, k.g('e-pine' + r, () => cone(r, hh, 7)), k.m(leaf, { flatShading: true }), pts.map(([x, z, s, y0 = 0]) => [x, y0 + y * s, z, s, x * 0.37])));
}
// 棕櫚樹（整排共用 InstancedMesh，葉子會隨風擺）；pts：[x, z, 縮放]
function palms(k, parent, pts, { trunk = '#a7835a', leaves = ['#3fae4f', '#4f9a45'], h = 6 } = {}) {
  if (!pts.length) return;
  inst(parent, k.g('e-palmT', () => cyl(0.1, 0.17, 1, 7).translate(0, 0.5, 0)), k.m(trunk, { roughness: 0.8 }), pts.map(([x, z, s]) => [x, 0, z, [s, h * s, s]]));
  inst(parent, k.g('e-palmC', () => sph(0.26, 8, 6)), k.m('#6b4a2a'), pts.map(([x, z, s]) => [x, h * s, z, s]));
  const fg = k.g('e-frond', () => { const g = new THREE.ConeGeometry(0.32, 2.4, 4, 1); g.translate(0, 1.2, 0); g.scale(1, 1, 0.2); return g; });
  const n = pts.length * 8, F = new THREE.InstancedMesh(fg, k.m('#ffffff', { flatShading: true, side: THREE.DoubleSide }), n); F.castShadow = true;
  for (let i = 0; i < n; i++) F.setColorAt(i, C(leaves[(i + Math.floor(i / 8)) % leaves.length]));
  parent.add(F);
  const set = (t) => { let i = 0; pts.forEach(([x, z, s], p) => { const sw = Math.sin(t * 0.9 + p * 1.7) * 0.07; for (let j = 0; j < 8; j++) { D.position.set(x, h * s, z); D.rotation.set(0, j / 8 * TAU + p, 1.85 + sw + (j % 2) * 0.22, 'YXZ'); D.scale.setScalar(s); D.updateMatrix(); F.setMatrixAt(i++, D.matrix); } }); F.instanceMatrix.needsUpdate = true; };
  set(0); k.anim.push(set);
}
// 柔和的霧團（貼圖精靈）
const softTex = () => canvas(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.5, 'rgba(255,255,255,.5)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
function mist(k, world, n, { color = '#ffffff', opacity = 0.45, area = [-30, 30, -40, 0], y = [1.5, 6], size = [10, 3.5], speed = 0.25 } = {}) {
  const t = softTex(), list = [];
  for (let i = 0; i < n; i++) { const c = Array.isArray(color) ? color[i % color.length] : color; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, color: C(c), transparent: true, opacity, depthWrite: false })); const sc = 0.7 + k.rnd() * 0.6; s.scale.set(size[0] * sc, size[1] * sc, 1); const x = area[0] + k.rnd() * (area[1] - area[0]), z = area[2] + k.rnd() * (area[3] - area[2]); s.position.set(x, y[0] + k.rnd() * (y[1] - y[0]), z); world.add(s); list.push({ s, x, o: k.rnd() * TAU }); }
  k.anim.push((tt) => list.forEach(({ s, x, o }) => { s.position.x = x + Math.sin(tt * speed * 0.2 + o) * 4; s.material.opacity = opacity * (0.75 + 0.25 * Math.sin(tt * 0.4 + o)); }));
}
// 旋轉體（花瓶、陶甕、洋裝）
const lathe = (pts, seg = 14) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
// 圓角方塊（往 +z 擠出，底部在 y=0）
function rbox(w, h, d, r, bev = 0.2) {
  const s = new THREE.Shape(), x = -w / 2;
  s.moveTo(x + r, 0); s.lineTo(x + w - r, 0); s.quadraticCurveTo(x + w, 0, x + w, r); s.lineTo(x + w, h - r); s.quadraticCurveTo(x + w, h, x + w - r, h); s.lineTo(x + r, h); s.quadraticCurveTo(x, h, x, h - r); s.lineTo(x, r); s.quadraticCurveTo(x, 0, x + r, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: d - bev * 2, bevelEnabled: true, bevelThickness: bev, bevelSize: bev * 0.6, bevelSegments: 3, curveSegments: 8 }); g.translate(0, 0, -(d - bev * 2) / 2); return g;
}
// 愛心（擠出）
const heartGeo = (s = 1, d = 0.3) => { const h = new THREE.Shape(); h.moveTo(0, -0.9 * s); h.bezierCurveTo(-0.2 * s, -0.6 * s, -1.0 * s, -0.25 * s, -1.0 * s, 0.25 * s); h.bezierCurveTo(-1.0 * s, 0.75 * s, -0.35 * s, 0.95 * s, 0, 0.5 * s); h.bezierCurveTo(0.35 * s, 0.95 * s, 1.0 * s, 0.75 * s, 1.0 * s, 0.25 * s); h.bezierCurveTo(1.0 * s, -0.25 * s, 0.2 * s, -0.6 * s, 0, -0.9 * s); const g = new THREE.ExtrudeGeometry(h, { depth: d, bevelEnabled: true, bevelThickness: 0.08 * s, bevelSize: 0.08 * s, bevelSegments: 2 }); g.translate(0, 0, -d / 2); return g; };
// 繩子（兩點之間微微下垂）
function rope(k, parent, a, b, sag, mat, r = 0.035) {
  const m = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5); m.y -= sag;
  const g = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, m, b), 10, r, 5, false);
  const mesh = new THREE.Mesh(g, mat); mesh.castShadow = true; parent.add(mesh); return mesh;
}
// 群組內的座標換成世界座標（只有繞 y 軸轉）
const toW = (g, x, z) => { const c = Math.cos(g.rotation.y), s = Math.sin(g.rotation.y); return [g.position.x + x * c + z * s, g.position.z - x * s + z * c]; };
// 磚牆貼圖
const brickTex = (k, base, line, rx, ry) => rep(canvas(128, 128, (g) => { g.fillStyle = line; g.fillRect(0, 0, 128, 128); for (let j = 0; j < 8; j++) for (let i = -1; i < 4; i++) { g.fillStyle = C(base).offsetHSL(0, 0, (k.rnd() - 0.5) * 0.09).getStyle(); g.fillRect(i * 32 + (j % 2) * 16 + 1, j * 16 + 1, 30, 14); } }), rx, ry);

// ================= 陶瓷窯場 =================
function kiln({ k, world, pal, clear, mobile, layout }) {
  ground(k, world, { color: '#b68a5e', coreTex: brickTex(k, '#c47a52', '#dcb88c', 9, 9), edge: '#8a4a30', edgeH: 0.3 });
  const fireM = lit('#ff8a2a', 2.0, { color: C('#ffb347') }), brickM = (rx, ry) => new THREE.MeshStandardMaterial({ map: brickTex(k, '#a8553a', '#6e3a28', rx, ry), roughness: 0.92 });
  const flames = [];
  k.anim.push((t) => { fireM.emissiveIntensity = 1.8 + Math.sin(t * 11) * 0.35 + Math.sin(t * 27 + 1) * 0.2; flames.forEach((f, i) => { f.scale.set(1, 0.7 + Math.abs(Math.sin(t * 9 + i * 1.7)) * 0.6, 1); }); });
  const flame = (p, x, y, z, s = 1) => { for (let i = 0; i < 3; i++) { const f = add(k, p, k.g('kflame', () => cone(0.13, 0.42, 6).translate(0, 0.21, 0)), fireM, x + (i - 1) * 0.16 * s, y, z, false); f.scale.setScalar(s); flames.push(f); } };
  const vaseG = k.g('kvase', () => lathe([[0, 0], [0.18, 0], [0.26, 0.12], [0.3, 0.3], [0.22, 0.5], [0.1, 0.62], [0.09, 0.72], [0.15, 0.8], [0, 0.8]]));
  const jarG = k.g('kjar', () => lathe([[0, 0], [0.32, 0], [0.52, 0.3], [0.58, 0.6], [0.48, 0.9], [0.28, 1.05], [0.3, 1.15], [0, 1.15]]));
  const clayC = ['#c9a27a', '#b9875c', '#a87450', '#d8b48c'], glazeC = ['#9fc4b0', '#efe8dc', '#4f6fa8', '#7a4a30', hex(pal[0])];

  // 磚造窯坊（主建築）：磚牆、黑瓦屋頂、拱門透出窯火、左前方的饅頭窯、右後方的高煙囪
  const h = grp(HX, 0.12, HZ); world.add(h);
  const wall = brickM(3, 2), FZ = (HD - 0.6) / 2;
  add(k, h, box(HW - 0.4, 4.0, HD - 0.6), wall, 0, 2.0, 0);
  add(k, h, gable(HW - 0.4, HD - 0.6, 1.7, 0.4), [wall, k.m('#4a403a', { flatShading: true })], 0, 4.0, 0);
  const warm = new THREE.MeshStandardMaterial({ color: C('#ffb36b'), emissive: C('#ff8a3a'), emissiveIntensity: k.night ? 1.4 : 0.6, roughness: 0.6 });
  add(k, h, box(1.5, 1.7, 0.05), warm, 0, 0.85, FZ + 0.01, false); add(k, h, new THREE.CircleGeometry(0.75, 20, 0, Math.PI), warm, 0, 1.7, FZ + 0.01, false);
  const trim = k.m('#7a3a26', { roughness: 0.9 });
  add(k, h, new THREE.TorusGeometry(0.88, 0.15, 6, 18, Math.PI), trim, 0, 1.7, FZ + 0.06); for (const x of [-0.88, 0.88]) add(k, h, box(0.3, 1.7, 0.22), trim, x, 0.85, FZ + 0.06);
  const sign = nameSign(k, 3.4, 0.6, '#4a2416', '#ffe2b0'); sign.position.set(0, 3.2, FZ + 0.06); h.add(sign);
  // 饅頭窯：半圓窯身、發光的窯口與火苗
  const kx = -2.35, kz = 0.75;
  add(k, h, dome(1.25, 20, 10), brickM(3, 1), kx, 0, kz);
  add(k, h, new THREE.CircleGeometry(0.42, 16, 0, Math.PI), fireM, kx, 0.0, 2.01, false); add(k, h, new THREE.TorusGeometry(0.48, 0.09, 6, 14, Math.PI), trim, kx, 0.0, 2.02);
  flame(h, kx, 0.0, 2.08, 0.9);
  // 右邊櫥窗：架上的花瓶
  add(k, h, box(1.6, 1.15, 0.05), k.night ? k.glow('#ffd39a', 1.3) : k.m('#e9d7bf'), 2.2, 1.6, FZ + 0.01, false); add(k, h, box(1.8, 0.1, 0.35), trim, 2.2, 1.0, FZ + 0.15);
  inst(h, vaseG, k.m('#ffffff', { roughness: 0.35 }), [[1.65, 1.05, FZ + 0.15, 0.6], [2.2, 1.05, FZ + 0.15, 0.75], [2.75, 1.05, FZ + 0.15, 0.55]], [glazeC[0], hex(pal[0]), glazeC[2]]);
  inst(h, jarG, k.m('#ffffff', { roughness: 0.5 }), [[3.25, 0, 1.95, 0.75], [2.65, 0, 2.15, 0.55], [1.25, 0, 2.2, 0.5]], ['#7a4a30', '#a87450', glazeC[0]]);
  // 高煙囪
  add(k, h, cyl(0.42, 0.62, 9.2, 4), brickM(1, 6), 2.5, 4.6, -0.9).rotation.y = Math.PI / 4;
  add(k, h, box(1.05, 0.3, 1.05), trim, 2.5, 9.1, -0.9);
  puffs(k, h, 2.5, 9.3, -0.9, { n: 6, color: 0x9a9590, size: 0.5, rise: 3.8, speed: 0.14, opacity: 0.55 });
  if (k.night) { const l = new THREE.PointLight(0xff8a3a, 5, 8); l.position.set(kx + 0.4, 0.9, 2.8); h.add(l); }

  // 登窯：沿山坡一節節往上爬的長窯，兩側投柴孔透出火光
  const dkS = [-1, 1].find((s) => [[6, 2], [-6, 4.5], [-18, 8]].every(([z, hh]) => clear(s * 13.5, z, 3.2, hh))) || -1, rs = -dkS;
  const dkx = dkS * 13.5, L = 26, rise = 6.2, th = Math.atan2(rise, L), SL = Math.hypot(L, rise);
  const ws = new THREE.Shape(); ws.moveTo(0, 0); ws.lineTo(L, rise); ws.lineTo(L, 0); ws.lineTo(0, 0);
  const wg = new THREE.ExtrudeGeometry(ws, { depth: 7, bevelEnabled: false }); wg.rotateY(Math.PI / 2); wg.translate(-3.5, 0, 0);
  const soilT = rep(canvas(128, 128, (g) => { g.fillStyle = '#8a5a3a'; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 60; i++) { g.fillStyle = ['#7a4e32', '#9a6a46', '#6e4630'][i % 3]; g.beginPath(); g.ellipse((i * 47) % 128, (i * 29) % 128, 6 + i % 5, 4, 0, 0, TAU); g.fill(); } }), 0.12, 0.12);
  add(k, world, wg, [new THREE.MeshStandardMaterial({ map: soilT, roughness: 1 }), k.m('#7d8a4a', { flatShading: true })], dkx, 0, 6);
  const dk = grp(dkx, 0, 6); dk.rotation.x = th; world.add(dk);
  const N = 8, segL = SL / N, segG = k.g('dkseg', () => { const g = new THREE.CylinderGeometry(1.45, 1.45, segL - 0.22, 16, 1, false, Math.PI / 2, Math.PI); g.rotateX(Math.PI / 2); return g; });
  const dkM = brickM(4, 2), holes = [];
  for (let i = 0; i < N; i++) { const z = -(i + 0.5) * segL; add(k, dk, segG, dkM, 0, 0, z); add(k, dk, k.g('dkband', () => new THREE.TorusGeometry(1.5, 0.13, 6, 16, Math.PI)), trim, 0, 0, -i * segL); for (const s of [-1, 1]) holes.push([s * 1.37, 0.45, z, 1]); }
  inst(dk, k.g('dkhole', () => box(0.12, 0.3, 0.32)), fireM, holes, null, false);
  add(k, dk, new THREE.CircleGeometry(0.75, 16, 0, Math.PI), fireM, 0, 0, 0.05, false); flame(dk, 0, 0, 0.25, 1.6);
  const chy = rise + 3.2; if (clear(dkx, 6 - L, 1.2, chy + 3.5)) { add(k, world, box(1.5, 6.4, 1.5), brickM(1, 4), dkx, rise + 3.2 - 0.2, 6 - L + 0.4); puffs(k, world, dkx, rise + 6.4, 6 - L + 0.4, { n: 6, color: 0x8a8580, size: 0.7, rise: 4.5, speed: 0.12, opacity: 0.5 }); }
  // 柴堆
  const logG = k.g('klog', () => cyl(0.14, 0.14, 1.6, 7)), wood = [];
  for (const s of [-1, 1]) for (let r = 0; r < 3; r++) for (let c = 0; c < 4 - r; c++) wood.push([dkx + s * 2.6 + (c - (3 - r) / 2) * 0.3, 0.14 + r * 0.25, 7.4, 1, 0, Math.PI / 2]);
  inst(world, logG, k.m('#8a5a34'), wood);

  // 陶胚晾架：木架上一排排的陶罐（素胚、上釉）
  const racks = [[rs * 11.2, -2.5], [rs * 12.6, 2.8], [rs * 10.9, -8.0]];
  racks.forEach(([x, z], ri) => { if (!clear(x, z, 1.8, 2.4)) return; const g = grp(x, 0, z); g.rotation.y = Math.atan2(-x, -z); world.add(g); const wm = k.m('#8a6a48');
    for (const px of [-1.5, 1.5]) for (const pz of [-0.35, 0.35]) add(k, g, k.g('krpost', () => box(0.1, 2.2, 0.1)), wm, px, 1.1, pz);
    const items = [], cols = [];
    for (let s = 0; s < 3; s++) { const y = 0.45 + s * 0.7; add(k, g, k.g('krshelf', () => box(3.2, 0.06, 0.8)), wm, 0, y, 0); for (let i = 0; i < 5; i++) { items.push([-1.2 + i * 0.6, y + 0.03, (i % 2 ? 0.12 : -0.12), 0.55 + k.rnd() * 0.25, k.rnd() * 3]); cols.push(k.rnd() < 0.7 ? clayC[(i + s + ri) % 4] : glazeC[(i + s) % 5]); } }
    inst(g, vaseG, k.m('#ffffff', { roughness: 0.6 }), items, cols); });
  // 大陶甕陣（主建築兩側）
  const urns = [];
  for (const s of [-1, 1]) for (let i = 0; i < 9; i++) { const x = s * (5.0 + (i % 3) * 1.25), z = -9.6 - Math.floor(i / 3) * 1.25; if (s === -1 && dkS === -1 && x < -9) continue; urns.push([x, 0, z, 0.9 + k.rnd() * 0.4, k.rnd() * 3]); }
  inst(world, jarG, k.m('#ffffff', { roughness: 0.45 }), urns, ['#7a4a30', '#a87450', '#5a3a2a', '#c9a27a', glazeC[0]]);
  // 遠處的磚煙囪（冒煙）
  ringOut(k, clear, mobile ? 3 : 4, 15, 30, 14, 1.6, (x, z) => { if (z > -6 || Math.abs(x - dkx) < 6) return 0; const hh = 9 + k.rnd() * 5;
    add(k, world, cyl(0.7, 1.1, hh, 4), brickM(1, 6), x, hh / 2, z).rotation.y = Math.PI / 4; add(k, world, box(1.6, 0.4, 1.6), trim, x, hh, z);
    puffs(k, world, x, hh + 0.3, z, { n: 5, color: 0x8a8580, size: 0.75, rise: 5, speed: 0.11, opacity: 0.45 }); return 1; }, { front: false });
  // 拉坯工棚：兩台會轉的轆轤
  const spots = [];
  const shed = grp(rs * 10.4, 0, 5.6); shed.rotation.y = Math.atan2(-rs * 10.4, -5.6); world.add(shed);
  for (const px of [-1.6, 1.6]) for (const pz of [-1.0, 1.0]) add(k, shed, k.g('kspost', () => box(0.12, 2.5, 0.12)), '#6b4a35', px, 1.25, pz);
  add(k, shed, box(3.8, 0.1, 2.6), k.m('#5a4a40', { flatShading: true }), 0, 2.55, 0).rotation.x = 0.12;
  const wheelT = canvas(64, 64, (g) => { g.fillStyle = '#8a6a50'; g.fillRect(0, 0, 64, 64); g.strokeStyle = '#5a4030'; g.lineWidth = 3; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(32, 32); g.lineTo(32 + Math.cos(i) * 32, 32 + Math.sin(i) * 32); g.stroke(); } });
  for (const px of [-0.9, 0.9]) { const wgp = grp(px, 0, -0.2); shed.add(wgp); add(k, wgp, cyl(0.32, 0.4, 0.55, 12), '#6b4a35', 0, 0.28, 0); const sp = grp(0, 0.58, 0); wgp.add(sp);
    add(k, sp, cyl(0.42, 0.42, 0.06, 20), [k.m('#6b4a35'), new THREE.MeshStandardMaterial({ map: wheelT }), k.m('#6b4a35')], 0, 0, 0); const pot = add(k, sp, vaseG, k.m('#b07850', { roughness: 0.3 }), 0, 0.03, 0); pot.scale.set(0.9, 0.55 + (px > 0 ? 0.3 : 0), 0.9);
    k.anim.push((t) => { sp.rotation.y = t * 5; });
    add(k, wgp, box(0.4, 0.42, 0.4), '#8a6a48', 0, 0.21, 0.75);
    const [wx, wz] = toW(shed, px, -0.2), [sx, sz] = toW(shed, px, 0.55);
    spots.push({ x: sx, z: sz, y: 0.02, face: [wx, wz], pose: 'work' }); }
  // 陶土池、土塊、推車
  const px0 = dkS * 10.4, pz0 = 11.2;
  add(k, world, cyl(2.1, 2.0, 0.06, 28), k.m('#7a4a2e', { roughness: 0.3 }), px0, 0.03, pz0); const rim = add(k, world, new THREE.TorusGeometry(2.15, 0.22, 6, 28), '#a8784e', px0, 0.05, pz0); rim.rotation.x = Math.PI / 2; rim.scale.z = 0.5;
  inst(world, k.g('kclay', () => box(0.5, 0.32, 0.4)), k.m('#9a6a48', { roughness: 0.6 }), [0, 1, 2, 3, 4].map(i => [px0 - dkS * 3.0 + (i % 3) * 0.55, 0.16 + Math.floor(i / 3) * 0.32, pz0 - 1.2, 1, 0.2]));
  spots.push({ x: px0 - dkS * 1.6, z: pz0 + 1.3, y: 0.02, face: [px0, pz0], pose: 'crouch', hat: 'straw' });
  spots.push({ x: dkx + 0.9, z: 7.7, y: 0.02, face: [dkx, 6], pose: 'work' });
  // 後山的陶瓷老街
  add(k, world, sph(30, 20, 10), k.m('#8a9a5a', { flatShading: true }), 0, -3, -62, false).scale.y = 0.35;
  for (const [x, z, s] of [[-45, -60, 22], [42, -64, 26]]) add(k, world, cone(s, s * 0.7, 7), k.m('#9aa88a', { flatShading: true }), x, s * 0.35, z).castShadow = false;
  const hs = [], hr = [];
  for (let i = 0; i < (mobile ? 9 : 15); i++) { const x = -21 + i * 3 + (k.rnd() - 0.5), dz = 12 + (i % 3) * 4.5, z = -62 + dz; const y = -3 + 0.35 * Math.sqrt(Math.max(0, 900 - x * x - dz * dz)); hs.push([x, y + 0.9, z, [2.4, 2.2, 2.0]]); hr.push([x, y + 2.0, z, [2.4, 1, 2.0]]); }
  inst(world, k.g('khb', () => box(1, 1, 1)), k.m('#ffffff'), hs, ['#c46a48', '#e8dcc4', '#b85a3c', '#d9c4a0']);
  inst(world, k.g('khr', () => gable(1, 1, 0.8, 0.08)), k.m('#4a403a', { flatShading: true }), hr);
  ringOut(k, clear, mobile ? 4 : 8, 10, 24, 4, 1.3, (x, z) => { if (Math.abs(x - dkx) < 5 || Math.hypot(x - px0, z - pz0) < 3.5 || Math.hypot(x - rs * 10.4, z - 5.6) < 3.5) return 0; world.add(bigTree(k, x, z, 0.8 + k.rnd() * 0.4, ['#6a9a45', '#c9a23a', '#7aa84a'][Math.floor(k.rnd() * 3)])); return 1; });
  return { spots, features: ['磚造窯坊', '登窯', '冒煙的磚煙囪', '陶胚晾架', '拉坯轆轤', '陶土池'], heroH: 9.3, fog: [30, 110] };
}

// ================= 水晶礦洞（永遠是夜晚） =================
function crystal({ k, world, pal, clear, mobile, layout }) {
  const floor = rep(canvas(256, 256, (g) => { g.fillStyle = '#3a3448'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) { g.fillStyle = ['#6a6080', '#5e5672', '#746a8a', '#665c7c'][(i * 3 + j) % 4]; g.beginPath(); g.ellipse(i * 37 + (j % 2) * 18 + 10, j * 37 + 18, 16 + (i + j) % 3 * 2, 14, (i * j) % 3, 0, TAU); g.fill(); }
    for (let i = 0; i < 40; i++) { g.fillStyle = ['#c79bff', '#7fefff', '#ff8fdc'][i % 3]; g.beginPath(); g.arc((i * 73) % 256, (i * 151) % 256, 2, 0, TAU); g.fill(); } }), 6, 6);
  ground(k, world, { color: '#2a2534', coreTex: floor, edge: '#7a5cff', edgeH: 0.14 });
  const CC = ['#b07cff', '#5ee6ff', '#ff6fd0', '#6dffb0', '#ffc65a'];
  const mats = CC.map(c => new THREE.MeshStandardMaterial({ color: C(c), emissive: C(c), emissiveIntensity: 0.9, roughness: 0.15, metalness: 0.1, flatShading: true }));
  k.anim.push((t) => mats.forEach((m, i) => { m.emissiveIntensity = 0.75 + 0.5 * Math.sin(t * 1.6 + i * 1.3); }));
  const crysG = k.g('crys', () => lathe([[0, 0], [0.32, 0.02], [0.32, 1.1], [0, 1.55]], 6));
  const crys = CC.map(() => []);
  const cluster = (x, y, z, s, ci = Math.floor(k.rnd() * 5), tiltX = 0) => { const n = 4 + Math.floor(k.rnd() * 4); for (let i = 0; i < n; i++) { const a = i / n * TAU + k.rnd(), lean = i ? 0.35 + k.rnd() * 0.4 : 0.05; crys[(ci + (i % 3 === 2 ? 1 : 0)) % 5].push([x + Math.sin(a) * 0.15 * s, y, z + Math.cos(a) * 0.15 * s, s * (i ? 0.45 + k.rnd() * 0.45 : 1), a, Math.cos(a) * lean + tiltX, -Math.sin(a) * lean]); } };
  const rockM = [k.m('#3c3650', { flatShading: true }), k.m('#4a4260', { flatShading: true }), k.m('#2e2a3e', { flatShading: true })], rockG = k.g('rock', () => new THREE.DodecahedronGeometry(1, 0));
  const rock = (x, y, z, sx, sy, sz, i = 0) => { const m = add(k, world, rockG, rockM[i % 3], x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(k.rnd(), k.rnd() * 3, k.rnd() * 0.3); return m; };

  // 岩壁：主建築後方的大岩壁＋四周的洞窟岩牆
  [[-11, -14.5, 7, 10, 5], [-5, -15.5, 6, 12, 5], [0, -16.5, 7, 13, 5], [5, -15.5, 6, 12, 5], [11, -14.5, 7, 10, 5], [-17, -10, 6, 8, 6], [17, -10, 6, 8, 6]].forEach(([x, z, sx, sy, sz], i) => rock(x, sy * 0.45, z, sx, sy, sz, i));
  ringOut(k, clear, mobile ? 8 : 14, 18, 34, 16, 5, (x, z) => { if (z < -12 && Math.abs(x) < 14) return 0; const s = 4 + k.rnd() * 4; rock(x, s * 0.6, z, s, s * (1.4 + k.rnd()), s, Math.floor(k.rnd() * 3)); return 1; }, { front: false });
  ringOut(k, clear, mobile ? 6 : 12, 11, 26, 2, 1.5, (x, z) => { const s = 0.8 + k.rnd() * 1.2; rock(x, s * 0.3, z, s * 1.4, s, s * 1.2, Math.floor(k.rnd() * 3)); if (k.rnd() < 0.6) cluster(x + 0.4, s * 0.5, z, 0.5 + k.rnd() * 0.4); return 1; });
  // 鐘乳石筍
  const stal = []; ringOut(k, clear, mobile ? 18 : 36, 9.6, 30, 4, 0.5, (x, z) => { const s = 0.6 + k.rnd() * 1.6; stal.push([x, s * 1.1, z, [s * 0.9, s * 2.2, s * 0.9], k.rnd() * 3]); return 1; });
  inst(world, k.g('stalg', () => cone(0.45, 1, 6)), k.m('#4e4664', { flatShading: true }), stal);

  // 岩壁裡的珠寶工坊（主建築）：石砌立面、木樑、圓窗透光、屋頂上會轉的大寶石
  const h = grp(HX, 0.12, HZ); world.add(h);
  const stoneT = rep(canvas(128, 128, (g) => { g.fillStyle = '#4a4458'; g.fillRect(0, 0, 128, 128); for (let j = 0; j < 6; j++) for (let i = 0; i < 4; i++) { g.fillStyle = ['#8a8098', '#7a7090', '#958aa6'][(i + j) % 3]; g.fillRect(i * 32 + (j % 2) * 14 + 2, j * 21.3 + 2, 28, 18); } }), 3, 2);
  const stone = new THREE.MeshStandardMaterial({ map: stoneT, roughness: 0.95 }), wood = k.m('#6b4a35'), FZ = 1.6;
  add(k, h, box(HW - 0.6, 4.4, 3.2), stone, 0, 2.2, 0);
  for (const x of [-3.05, -1.0, 1.0, 3.05]) add(k, h, box(0.26, 4.4, 0.26), wood, x, 2.2, FZ + 0.05);
  add(k, h, box(HW - 0.2, 0.32, 0.4), wood, 0, 4.4, FZ + 0.05);
  const roof = add(k, h, box(HW + 0.2, 0.25, 2.8), k.m('#2e2a3a', { flatShading: true }), 0, 5.0, 0.7); roof.rotation.x = 0.32;
  const winM = lit('#ffcf7a', k.night ? 1.6 : 0.8);
  for (const x of [-2.05, 2.05]) { add(k, h, new THREE.CircleGeometry(0.62, 24), winM, x, 2.3, FZ + 0.01, false); add(k, h, new THREE.TorusGeometry(0.66, 0.09, 6, 24), wood, x, 2.3, FZ + 0.05); add(k, h, box(1.3, 0.06, 0.06), wood, x, 2.3, FZ + 0.06); }
  add(k, h, box(1.3, 2.2, 0.06), '#4a2f22', 0, 1.1, FZ + 0.03); add(k, h, new THREE.CircleGeometry(0.65, 16, 0, Math.PI), k.m('#4a2f22'), 0, 2.2, FZ + 0.03);
  add(k, h, sph(0.14, 10, 8), lit('#ffd27a', 2.4), 0.9, 2.6, FZ + 0.3, false);
  const sign = nameSign(k, 3.6, 0.55, '#2a1e3a', '#f2d7ff'); sign.position.set(0, 3.75, FZ + 0.1); h.add(sign);
  const gemM = new THREE.MeshStandardMaterial({ color: C('#7fe8ff'), emissive: C('#4fd8ff'), emissiveIntensity: 1.4, roughness: 0.1, metalness: 0.2, flatShading: true });
  const gem = add(k, h, new THREE.OctahedronGeometry(0.85, 0), gemM, 0, 6.9, 0.6, false); gem.scale.y = 1.35;
  k.anim.push((t) => { gem.rotation.y = t * 0.8; gem.position.y = 6.9 + Math.sin(t * 1.4) * 0.15; });
  for (const s of [-1, 1]) { const r = add(k, h, rockG, rockM[1], s * 4.2, 2.6, -0.6); r.scale.set(1.8, 3.6, 2.2); cluster(s * 4.3, 5.3, -0.8, 0.9, s > 0 ? 1 : 0); cluster(s * 4.9, 0, 1.2, 0.8, s > 0 ? 2 : 3); }
  // 岩壁上的水晶、外圍的大水晶與水晶簇
  for (let i = 0; i < (mobile ? 8 : 14); i++) { const x = -13 + i * (26 / (mobile ? 7 : 13)); if (Math.abs(x) < 4.5) continue; cluster(x, 0, -10.2 + k.rnd() * 0.6, 0.9 + k.rnd() * 0.8, i % 5, 0.35); }
  ringOut(k, clear, mobile ? 4 : 7, 13, 22, 7, 1.5, (x, z) => { const ci = Math.floor(k.rnd() * 5); crys[ci].push([x, 0, z, 3 + k.rnd() * 1.5, k.rnd() * 3, (k.rnd() - 0.5) * 0.3, (k.rnd() - 0.5) * 0.3]); cluster(x + 0.8, 0, z + 0.6, 1.2, (ci + 1) % 5); return 1; }, { front: false });
  ringOut(k, clear, mobile ? 8 : 16, 9.4, 18, 2.2, 0.8, (x, z) => { cluster(x, 0, z, 0.7 + k.rnd() * 0.7); return 1; });
  for (let i = 0; i < 5; i++) { const p = layout.spot(k.rnd, { zone: 'land', rad: 0.35, h: 0.8 }); if (p) cluster(p.x, 0.12, p.z, 0.4); }
  crys.forEach((list, i) => inst(world, crysG, mats[i], list, null, false));
  // 水晶的光
  for (const [x, z, c] of [[-9, -5, 0xb07cff], [9, -4, 0x5ee6ff], [0, 6, 0xff8fdc]]) { const l = new THREE.PointLight(c, 18, 18); l.position.set(x, 3.5, z); world.add(l); }

  // 礦坑口＋礦車軌道（礦車來回運寶石）
  const S = [1, -1].find((s) => [[9.5, -9], [12.5, -3], [11.8, 3], [10.5, 8]].every(([x, z]) => clear(s * x, z, 1, 1.8))) || 1;
  const mx = S * 9.2, mz = -10.1;
  const mouth = add(k, world, new THREE.CircleGeometry(1.9, 24, 0, Math.PI), k.m('#07040c', { roughness: 1 }), mx, 0, mz, false); mouth.rotation.y = -S * 0.25;
  add(k, world, box(3.8, 2.2, 0.05), k.m('#07040c'), mx, 1.0, mz - 0.02).rotation.y = -S * 0.25;
  for (const s of [-1, 1]) add(k, world, box(0.3, 3.0, 0.3), '#6b4a35', mx + s * 1.9 * Math.cos(0.25), 1.5, mz + s * S * 1.9 * Math.sin(0.25));
  add(k, world, box(4.4, 0.35, 0.4), '#6b4a35', mx, 3.0, mz + 0.05).rotation.y = -S * 0.25;
  const cpts = [[9.0, -10.4], [10.6, -7], [12.3, -2.5], [12.4, 2.5], [11.0, 7.5]].map(([x, z]) => new THREE.Vector3(S * x, 0.1, z));
  const curve = new THREE.CatmullRomCurve3(cpts, false, 'centripetal'), railM = k.m('#9aa0aa', { metalness: 0.7, roughness: 0.35 }), sleepers = [];
  for (const off of [-0.42, 0.42]) { const pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40, p = curve.getPointAt(u), tg = curve.getTangentAt(u); pts.push(new THREE.Vector3(p.x + tg.z * off, 0.16, p.z - tg.x * off)); } add(k, world, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.05, 4), railM, 0, 0, 0, false); }
  const len = curve.getLength(); for (let i = 0; i < len / 0.7; i++) { const u = i * 0.7 / len, p = curve.getPointAt(u), tg = curve.getTangentAt(u); sleepers.push([p.x, 0.06, p.z, 1, Math.atan2(tg.x, tg.z)]); }
  inst(world, k.g('sleeper', () => box(1.3, 0.08, 0.26)), k.m('#5a4030'), sleepers, null, false);
  const cart = grp(); world.add(cart); add(k, cart, box(1.0, 0.55, 1.3), k.m('#7a4a30', { metalness: 0.4, roughness: 0.6 }), 0, 0.6, 0); add(k, cart, box(1.08, 0.08, 1.38), '#4a3a30', 0, 0.9, 0);
  for (const [x, z] of [[-0.45, -0.4], [0.45, -0.4], [-0.45, 0.4], [0.45, 0.4]]) add(k, cart, cyl(0.17, 0.17, 0.08, 10), '#2b2b30', x, 0.25, z).rotation.z = Math.PI / 2;
  for (let i = 0; i < 4; i++) add(k, cart, new THREE.OctahedronGeometry(0.2, 0), mats[i], -0.25 + (i % 2) * 0.5, 0.95, -0.25 + Math.floor(i / 2) * 0.5, false);
  const tg = new THREE.Vector3(); k.anim.push((t) => { const u = 0.04 + 0.92 * (0.5 - 0.5 * Math.cos(t * 0.22)); curve.getPointAt(u, cart.position); cart.position.y = 0.05; curve.getTangentAt(u, tg); cart.rotation.y = Math.atan2(tg.x, tg.z); });
  // 卸貨台、寶石堆
  const end = cpts[cpts.length - 1]; add(k, world, box(2.4, 0.3, 1.8), '#6b4a35', end.x + S * 1.6, 0.15, end.z + 0.6);
  const gemsI = [], gemsC = [];
  for (const [gx, gz, n] of [[end.x + S * 1.5, end.z + 0.6, 26], [S * 5.6, -9.4, 18], [-S * 5.4, -9.2, 18]]) for (let i = 0; i < n; i++) { const r = Math.sqrt(k.rnd()) * 0.8, a = k.rnd() * TAU; gemsI.push([gx + Math.sin(a) * r, (gx === end.x + S * 1.5 ? 0.35 : 0.08) + (0.8 - r) * 0.5 + k.rnd() * 0.1, gz + Math.cos(a) * r, 0.12 + k.rnd() * 0.1, k.rnd() * 3, k.rnd() * 3]); gemsC.push(CC[i % 5]); }
  inst(world, k.g('gemo', () => new THREE.OctahedronGeometry(1, 0)), new THREE.MeshBasicMaterial({ color: 0xffffff }), gemsI, gemsC, false);
  // 礦燈（會閃）
  const lantM = lit('#ffc46b', 2.2), lantG = k.g('mlant', () => box(0.26, 0.36, 0.26));
  for (let i = 0; i < 8; i++) { const a = -2.6 + i * (5.2 / 7), x = Math.sin(a) * (CORE + 0.7), z = Math.cos(a) * (CORE + 0.7); if (!clear(x, z, 0.3, 2.4)) continue; add(k, world, cyl(0.05, 0.07, 2.3, 6), '#4a3a30', x, 1.15, z); add(k, world, box(0.5, 0.05, 0.05), '#4a3a30', x, 2.25, z); add(k, world, lantG, lantM, x + 0.22, 1.98, z, false); }
  k.anim.push((t) => { lantM.emissiveIntensity = 2.0 + Math.sin(t * 13) * 0.25 + Math.sin(t * 5.3) * 0.2; });
  // 飄浮的水晶光塵
  const NP = mobile ? 70 : 150, pa = new Float32Array(NP * 3), pc = new Float32Array(NP * 3);
  for (let i = 0; i < NP; i++) { const a = k.rnd() * TAU, r = 3 + k.rnd() * 20; pa.set([Math.sin(a) * r, 0.5 + k.rnd() * 7, Math.cos(a) * r - 3], i * 3); const c = C(CC[i % 5]); pc.set([c.r, c.g, c.b], i * 3); }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(pa, 3)); dg.setAttribute('color', new THREE.BufferAttribute(pc, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ size: 0.16, map: softTex(), vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })); world.add(dust);
  k.anim.push((t) => { dust.rotation.y = t * 0.03; dust.position.y = Math.sin(t * 0.6) * 0.3; });
  const spots = [{ x: S * 13.6, z: 1.0, y: 0.02, face: [S * 16, 1], pose: 'work', hat: 'cap' }, { x: end.x + S * 0.4, z: end.z + 1.9, y: 0.02, face: [end.x + S * 1.5, end.z + 0.6], pose: 'crouch', hat: 'cap' }];
  cluster(S * 15.2, 0, 1.2, 1.4, 1);
  return { spots, features: ['岩壁珠寶工坊', '發光水晶簇', '礦車軌道', '礦燈', '寶石堆', '洞窟岩壁'], heroH: 7.8, fog: [16, 75] };
}

// ================= 伐木場 =================
function lumber({ k, world, pal, clear, mobile, layout }) {
  const deck = rep(canvas(128, 128, (g) => { for (let j = 0; j < 8; j++) { g.fillStyle = ['#c99a64', '#b88a58', '#d4a872', '#c49460'][j % 4]; g.fillRect(0, j * 16, 128, 16); g.fillStyle = 'rgba(60,35,15,.55)'; g.fillRect(0, j * 16 + 14, 128, 2); g.fillRect(((j * 37) % 96) + 16, j * 16, 2, 16); g.fillStyle = 'rgba(60,35,15,.4)'; for (const x of [6, 70]) g.fillRect(x + (j % 2) * 30, j * 16 + 6, 2, 2); } }), 7, 7);
  ground(k, world, { color: '#5f8a3e', coreTex: deck, edge: '#6b4a2e', edgeH: 0.4 });
  const bark = k.m('#6b4a2e', { roughness: 1 }), endT = canvas(64, 64, (g) => { g.fillStyle = '#e0b880'; g.fillRect(0, 0, 64, 64); g.strokeStyle = '#b8864e'; g.lineWidth = 2; for (let r = 4; r < 32; r += 5) { g.beginPath(); g.arc(32, 32, r, 0, TAU); g.stroke(); } g.strokeStyle = '#6b4a2e'; g.lineWidth = 4; g.beginPath(); g.arc(32, 32, 31, 0, TAU); g.stroke(); });
  const endM = new THREE.MeshStandardMaterial({ map: endT, roughness: 0.9 }), logMs = [bark, endM, endM];
  const logG = k.g('llog', () => cyl(0.32, 0.32, 4, 10));
  // 河（左側，往前流）＋河岸
  const RX = -15.5;
  waterPlane(k, world, 8, 340, RX, 0, { color: '#3a8aa8', y: 0.04, speed: [0.0, -0.06] });
  for (const s of [-1, 1]) add(k, world, box(1.2, 0.22, 340), '#7a6a4a', RX + s * 4.4, 0.06, 0, { flatShading: true });
  const floatLogs = []; for (let i = 0; i < 6; i++) { const m = add(k, world, logG, logMs, 0, 0, 0); m.rotation.x = Math.PI / 2; m.scale.setScalar(0.8); floatLogs.push({ m, x: RX - 2.2 + (i % 3) * 2.2, o: i * 17 }); }
  k.anim.push((t) => floatLogs.forEach(({ m, x, o }, i) => { m.position.set(x + Math.sin(t * 0.5 + i) * 0.3, 0.12 + Math.sin(t * 1.5 + i) * 0.04, -60 + ((t * 1.1 + o) % 100)); m.rotation.z = Math.sin(t * 0.4 + i) * 0.2; }));

  // 木構造製材所（主建築）：白灰泥牆配深色木樑、二樓外推、木瓦屋頂、穀倉拉門、吊貨橫樑
  const h = grp(HX, 0.12, HZ); world.add(h);
  const tf = (rx) => rep(canvas(256, 256, (g) => { g.fillStyle = '#efe3c8'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#4a301e'; g.lineWidth = 14; g.strokeRect(0, 0, 256, 256); for (const x of [85, 170]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); } g.beginPath(); g.moveTo(0, 128); g.lineTo(256, 128); g.stroke(); g.lineWidth = 10; g.beginPath(); g.moveTo(0, 128); g.lineTo(85, 0); g.moveTo(170, 0); g.lineTo(256, 128); g.moveTo(85, 256); g.lineTo(170, 128); g.stroke(); }), rx, 1);
  const lowM = new THREE.MeshStandardMaterial({ map: tf(2), roughness: 0.9 }), upM = new THREE.MeshStandardMaterial({ map: tf(2.4), roughness: 0.9 });
  const FZ = (HD - 0.8) / 2;
  add(k, h, box(HW - 0.8, 3.0, HD - 0.8), lowM, 0, 1.5, 0);
  add(k, h, box(HW - 0.4, 2.6, HD - 0.4), upM, 0, 4.3, 0); add(k, h, box(HW - 0.2, 0.22, HD - 0.2), '#4a301e', 0, 3.0, 0);
  const shingle = new THREE.MeshStandardMaterial({ map: rep(stripeTex('#6b4226', '#553218', 10, false), 2, 2), roughness: 0.9 });
  add(k, h, gable(HW - 0.2, HD - 0.2, 2.4, 0.45), [k.m('#a87a4a'), shingle], 0, 5.6, 0);
  const plankT = rep(stripeTex('#8a5a34', '#7a4e2c', 8), 1, 1);
  add(k, h, box(1.9, 2.4, 0.08), new THREE.MeshStandardMaterial({ map: plankT }), 0, 1.2, FZ + 0.04);
  for (const s of [-1, 1]) add(k, h, box(0.1, 2.9, 0.06), '#4a301e', 0, 1.2, FZ + 0.1).rotation.z = s * 0.66;
  add(k, h, box(2.3, 0.12, 0.12), '#3a2414', 0, 2.5, FZ + 0.1);
  const win = k.night ? k.glow('#ffc46b', 1.6) : k.m('#bcd6e6', { roughness: 0.2 });
  for (const x of [-2.3, 2.3]) { add(k, h, box(0.9, 0.8, 0.05), win, x, 1.7, FZ + 0.01, false); add(k, h, box(0.9, 0.8, 0.05), win, x, 4.5, HD / 2 - 0.19, false); }
  const sign = nameSign(k, 3.4, 0.6, '#3a2414', '#ffe6b8'); sign.position.set(0, 3.65, HD / 2 - 0.16); h.add(sign);
  add(k, h, box(0.24, 0.24, 1.4), '#4a301e', 0, 6.6, HD / 2 + 0.2);
  const hoist = grp(0, 6.5, HD / 2 + 0.75); h.add(hoist); add(k, hoist, cyl(0.015, 0.015, 1.2, 4), '#d9c9a8', 0, -0.6, 0);
  for (let i = 0; i < 3; i++) { const l = add(k, hoist, logG, logMs, 0, -1.3 - (i % 2) * 0.25, (i - 1) * 0.28); l.rotation.z = Math.PI / 2; l.scale.set(0.45, 0.5, 0.45); }
  k.anim.push((t) => { hoist.rotation.x = Math.sin(t * 0.9) * 0.08; });
  inst(h, k.g('lplank', () => box(2.6, 0.1, 0.32)), k.m('#d4a872'), Array.from({ length: 14 }, (_, i) => [2.4 + (i % 2) * 0.35 - 0.2, 0.06 + Math.floor(i / 2) * 0.11, HD / 2 + 0.15, 1, Math.PI / 2 + (k.rnd() - 0.5) * 0.06]));
  // 水車（上射式：木水槽把水送到水車頂端）
  const wx = -4.55, wz = HZ - 0.8, WR = 2.0, wy = 0.12 + WR + 0.3;
  layout.claim(wx + 0.4, wz + 1.2, 1.7);
  const wgrp = grp(wx, wy, wz); world.add(wgrp); const spin = grp(); wgrp.add(spin); const wm = k.m('#7a5236');
  for (const s of [-0.42, 0.42]) add(k, spin, k.g('wrim', () => new THREE.TorusGeometry(WR, 0.08, 6, 28)), wm, s, 0, 0).rotation.y = Math.PI / 2;
  inst(spin, k.g('wspoke', () => box(0.08, WR * 2, 0.08)), wm, [-0.42, 0.42].flatMap(s => [0, 1, 2, 3].map(i => [s, 0, 0, 1, 0, i * Math.PI / 4])));
  inst(spin, k.g('wpad', () => box(0.95, 0.5, 0.06)), k.m('#8a6040'), Array.from({ length: 16 }, (_, i) => { const a = i / 16 * TAU; return [0, Math.cos(a) * (WR - 0.2), Math.sin(a) * (WR - 0.2), 1, 0, a]; }));
  add(k, wgrp, cyl(0.12, 0.12, 1.6, 8), '#3a2a20', 0, 0, 0).rotation.z = Math.PI / 2;
  for (const s of [-0.7, 0.7]) add(k, wgrp, box(0.2, wy, 0.3), '#5a3a26', s, -wy / 2, 0);
  k.anim.push((t) => { spin.rotation.x = -t * 0.7; });
  const flowT = rep(canvas(64, 64, (g) => { g.fillStyle = '#5ab0d0'; g.fillRect(0, 0, 64, 64); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2; for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(i * 8 + 2, 0); g.lineTo(i * 8 + 5, 64); g.stroke(); } }), 1, 4);
  const flowM = new THREE.MeshStandardMaterial({ map: flowT, roughness: 0.1, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
  k.anim.push((t) => { flowT.offset.y = t * 0.9; });
  const ty = wy + WR + 0.35, tz0 = wz - 0.3, tz1 = -24, tl = tz0 - tz1;
  if (clear(wx, (tz0 + tz1) / 2, 1, ty + 0.5)) { const tr = grp(wx, ty, (tz0 + tz1) / 2); world.add(tr); add(k, tr, box(1.0, 0.1, tl), wm, 0, 0, 0); for (const s of [-0.5, 0.5]) add(k, tr, box(0.08, 0.45, tl), wm, s, 0.2, 0); const fw = add(k, tr, new THREE.PlaneGeometry(0.85, tl), flowM, 0, 0.08, 0, false); fw.rotation.x = -Math.PI / 2;
    const legs = []; for (let z = tz1 + 1.2; z < tz0 - 1; z += 3) for (const s of [-0.45, 0.45]) legs.push([wx + s, ty / 2, z, [1, ty, 1]]);
    inst(world, k.g('tleg', () => box(0.16, 1, 0.16)), wm, legs);
    const fall = add(k, world, new THREE.PlaneGeometry(0.85, 1.2), flowM, wx, ty - 0.5, wz + 0.5, false); fall.rotation.x = -0.4; }
  waterPlane(k, world, 7.6, 1.5, (wx + RX + 4) / 2, wz, { color: '#4a9ab8', y: 0.06, speed: [0.12, 0] });
  // 運木水道：從後山斜斜滑下來，原木一根根滑進河裡
  const A = new THREE.Vector3(-26, 7.6, -36), B = new THREE.Vector3(RX + 1.2, 0.9, -12), dir = B.clone().sub(A), FL = dir.length();
  if (clear((A.x + B.x) / 2, (A.z + B.z) / 2, 2, 6)) {
    const fl = grp(); fl.position.copy(A).lerp(B, 0.5); fl.lookAt(B); world.add(fl);
    add(k, fl, box(1.1, 0.1, FL), wm, 0, 0, 0); for (const s of [-0.55, 0.55]) add(k, fl, box(0.08, 0.5, FL), wm, s, 0.22, 0);
    const fw = add(k, fl, new THREE.PlaneGeometry(0.95, FL), flowM, 0, 0.07, 0, false); fw.rotation.x = -Math.PI / 2;
    const legs = []; for (let i = 1; i < 7; i++) { const p = A.clone().lerp(B, i / 7); legs.push([p.x, p.y / 2, p.z, [1, p.y, 1]]); }
    inst(world, k.g('flleg', () => box(0.2, 1, 0.2)), wm, legs);
    const slide = []; for (let i = 0; i < 3; i++) { const m = add(k, world, logG, logMs, 0, 0, 0); m.scale.set(0.7, 0.6, 0.7); slide.push(m); }
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    k.anim.push((t) => slide.forEach((m, i) => { const u = (t * 0.07 + i / 3) % 1; m.position.copy(A).lerp(B, u); m.position.y += 0.35; m.quaternion.copy(q); }));
    puffs(k, world, B.x, 0.3, B.z + 0.5, { n: 5, color: 0xffffff, size: 0.35, rise: 1.2, speed: 0.6, opacity: 0.6 });
  }
  add(k, world, sph(18, 16, 10), k.m('#4f7a34', { flatShading: true }), -30, -2, -40, false).scale.y = 0.5;
  for (const [x, z, s] of [[-50, -70, 26], [8, -80, 32], [50, -62, 24], [70, -20, 20]]) add(k, world, cone(s, s * 0.85, 8), k.m('#6a8a7a', { flatShading: true }), x, s * 0.42, z).castShadow = false;
  // 原木堆、木板堆（右側）
  const rs = 1, piles = [];
  for (const [px, pz] of [[11.2, -1.5], [12.6, 4.2], [14.6, -6.5]]) { if (!clear(px, pz, 2, 2.2)) continue; const ry = Math.atan2(-px, -pz) + Math.PI / 2; for (let r = 0; r < 4; r++) for (let c = 0; c < 4 - r; c++) { const o = (c - (3 - r) / 2) * 0.66; piles.push([px + Math.cos(ry) * o, 0.32 + r * 0.56, pz - Math.sin(ry) * o, 1, ry, Math.PI / 2]); } }
  inst(world, logG, logMs, piles);
  // 吊木起重機（臂桿慢慢擺、吊鉤上下）
  const cp = [[12.5, -13], [15, -10], [-11, -15]].find(([x, z]) => clear(x, z, 4, 11));
  if (cp) { const [cx, cz] = cp, cr = grp(cx, 0, cz); world.add(cr); add(k, cr, cyl(0.2, 0.3, 10, 8), '#8a5a34', 0, 5, 0); add(k, cr, box(1.6, 0.4, 1.6), '#5a3a26', 0, 0.2, 0);
    for (let i = 0; i < 3; i++) { const a = i / 3 * TAU, gx = Math.sin(a) * 4, gz = Math.cos(a) * 4; rope(k, cr, new THREE.Vector3(0, 9.8, 0), new THREE.Vector3(gx, 0, gz), 0.05, k.m('#3a3a3a'), 0.03); }
    const arm = grp(0, 1.5, 0); cr.add(arm); const boom = add(k, arm, cyl(0.12, 0.16, 8.5, 8), '#a8784a', 0, 0, 0); boom.geometry = boom.geometry.clone().translate(0, 4.25, 0); boom.rotation.x = 0.85;
    const tipY = 1.5 + Math.cos(0.85) * 8.5, tipZ = Math.sin(0.85) * 8.5;
    const cable = add(k, arm, cyl(0.02, 0.02, 1, 4), '#2b2b2b', 0, 0, tipZ - 1.5 * 0 ); const load = grp(0, 0, tipZ); arm.add(load);
    for (let i = 0; i < 3; i++) { const l = add(k, load, logG, logMs, (i - 1) * 0.5, 0, 0); l.rotation.x = Math.PI / 2; l.scale.set(0.7, 0.8, 0.7); }
    k.anim.push((t) => { arm.rotation.y = Math.sin(t * 0.22) * 0.9 + Math.atan2(-cx, -cz) - Math.PI; const ly = 2.2 + (Math.sin(t * 0.45) * 0.5 + 0.5) * 2.4; load.position.y = ly - 1.5; cable.position.set(0, (ly - 1.5 + tipY - 1.5) / 2 + 0.2, tipZ); cable.scale.y = Math.max(0.1, tipY - ly - 0.3); }); }
  // 圓鋸台（鋸片轉、木屑飛）
  const spots = [];
  const sx0 = rs * 9.7, sz0 = 4.6; if (clear(sx0, sz0, 1.5, 1.5)) { const sb = grp(sx0, 0, sz0); sb.rotation.y = Math.atan2(-sx0, -sz0) + Math.PI / 2; world.add(sb);
    add(k, sb, box(2.6, 0.9, 1.0), '#8a6040', 0, 0.45, 0); const lg = add(k, sb, logG, logMs, -0.6, 1.2, 0); lg.rotation.z = Math.PI / 2; lg.scale.set(0.8, 0.5, 0.8);
    const sawT = canvas(64, 64, (g) => { g.fillStyle = '#c9ced6'; g.beginPath(); for (let i = 0; i < 48; i++) { const a = i / 48 * TAU, r = i % 2 ? 32 : 27; g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } g.fill(); g.fillStyle = '#7a8088'; g.beginPath(); g.arc(32, 32, 6, 0, TAU); g.fill(); });
    const blade = add(k, sb, new THREE.CircleGeometry(0.55, 24), new THREE.MeshStandardMaterial({ map: sawT, transparent: true, alphaTest: 0.4, metalness: 0.7, roughness: 0.3, side: THREE.DoubleSide }), 0.5, 1.15, 0, false);
    k.anim.push((t) => { blade.rotation.z = -t * 12; });
    puffs(k, sb, 0.8, 1.0, 0.1, { n: 5, color: 0xe8d0a0, size: 0.12, rise: 0.7, speed: 0.9, opacity: 0.8 });
    add(k, sb, sph(0.5, 10, 6), '#e8cf9a', 1.2, 0, 0.6).scale.y = 0.35;
    const [px, pz] = toW(sb, 0.4, 0.95); spots.push({ x: px, z: pz, y: 0.02, face: [sx0, sz0], pose: 'work' }); }
  // 樹樁（插著斧頭）
  const stumps = []; ringOut(k, clear, mobile ? 8 : 14, 9.5, 20, 0.6, 0.6, (x, z) => { if (Math.abs(x - RX) < 6) return 0; stumps.push([x, 0.25, z, 0.8 + k.rnd() * 0.5, k.rnd() * 3]); return 1; });
  inst(world, k.g('stump', () => cyl(0.38, 0.5, 0.5, 10)), [bark, endM, endM], stumps);
  if (stumps[0]) { const [x, , z] = stumps[0]; const ax = grp(x, 0.5, z); ax.rotation.z = 0.5; world.add(ax); add(k, ax, cyl(0.04, 0.04, 0.9, 6), '#a8784a', 0, 0.45, 0); add(k, ax, box(0.06, 0.25, 0.35), '#9aa0aa', 0, 0.05, 0.12, { metalness: 0.6 }); spots.push({ x: x + 0.9, z: z + 0.3, y: 0.02, face: [x, z], pose: 'stand', hat: 'beanie' }); }
  // 松林
  const pts = scatter(k, clear, mobile ? 55 : 110, 13, 62, 7, 1.3, { gap: 1.2, avoid: (x, z) => Math.abs(x - RX) < 6 || (x > -14 && x < -1 && z > -16 && z < -3) || (z > 6 && Math.abs(x) < 15) || (cp && Math.hypot(x - cp[0], z - cp[1]) < 5) || (x < -13 && x > -30 && z < -8 && z > -38 && Math.abs((x - A.x) * dir.z - (z - A.z) * dir.x) / Math.hypot(dir.x, dir.z) < 3) });
  pines(k, world, pts.map(([x, z]) => { const dx = x + 30, dz = z + 40, hy = 18 * 18 - dx * dx - dz * dz; return [x, z, 1.0 + k.rnd() * 0.8, hy > 0 ? Math.max(0, -2 + 0.5 * Math.sqrt(hy)) : 0]; }), k.night ? '#24503a' : '#2f6b3f');
  spots.push({ x: RX + 4.6, z: 2, y: 0.17, face: [RX, 2], pose: 'stand', prop: 'rod' });
  return { spots, features: ['木構造製材所', '水車', '運木水道', '原木堆', '吊木起重機', '圓鋸台', '松林'], heroH: 8.2, fog: [30, 115] };
}

// ================= 時裝伸展台 =================
function runway({ k, world, pal, clear, mobile }) {
  const marble = rep(canvas(256, 256, (g) => { g.fillStyle = '#f6f1f4'; g.fillRect(0, 0, 256, 256); g.strokeStyle = 'rgba(170,150,175,.35)'; g.lineWidth = 2; for (let i = 0; i < 9; i++) { let x = k.rnd() * 256, y = 0; g.beginPath(); g.moveTo(x, y); while (y < 256) { x += (k.rnd() - 0.5) * 40; y += 20 + k.rnd() * 20; g.lineTo(x, y); } g.stroke(); } g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 3; g.strokeRect(0, 0, 256, 256); }), 5, 5);
  ground(k, world, { color: '#d9cde3', coreTex: marble, edge: '#ff7ab0', edgeH: 0.16 });
  const P0 = hex(pal[0]), P2 = hex(pal[2]), gold = k.m('#d9b25f', { metalness: 0.6, roughness: 0.3 });
  // 伸展台：從廣場前緣一路伸出去，兩側 LED 燈條
  const RW = 2.4, RZ0 = CORE + 0.05, RZ1 = 22, RL = RZ1 - RZ0, RY = 0.55;
  const stageM = k.m('#fbf8fb', { roughness: 0.2, metalness: 0.05 }), ledM = lit('#ff5fa8', 1.6);
  add(k, world, box(RW, RY, RL), stageM, 0, RY / 2, RZ0 + RL / 2); add(k, world, box(5.2, RY, 3.2), stageM, 0, RY / 2, RZ1 + 1.4);
  add(k, world, box(0.5, 0.012, RL + 2.6), k.m(P0, { roughness: 0.5 }), 0, RY + 0.006, RZ0 + RL / 2 + 1.3, false);
  for (const s of [-1, 1]) add(k, world, box(0.07, 0.07, RL), ledM, s * (RW / 2 + 0.02), RY - 0.06, RZ0 + RL / 2, false);
  // 廣場上的平面走道：主建築 → 廣場 → 伸展台，連成一條（客人走進店裡也像在走秀）
  for (const [z0, z1] of [[HERO.z1 + 0.05, -1.0], [2.8, CORE]]) { add(k, world, box(1.7, 0.03, z1 - z0), stageM, 0, 0.14, (z0 + z1) / 2, false); for (const s of [-1, 1]) add(k, world, box(0.06, 0.04, z1 - z0), ledM, s * 0.88, 0.15, (z0 + z1) / 2, false); }
  add(k, world, box(5.3, 0.07, 0.07), ledM, 0, RY - 0.06, RZ1 + 3.02, false);
  // 走秀的模特兒（來回走、到底轉身）
  const skin = ['#f2c9a8', '#8a5a3a', '#d9a27a', '#f8dcc4'], hair = ['#2b1d14', '#1a1a1a', '#d9b25f', '#8a3a2a'], dressC = [P0, '#1a1a22', '#ffffff', P2];
  const dressG = k.g('dress', () => lathe([[0, 0], [0.42, 0], [0.36, 0.2], [0.2, 0.7], [0.14, 0.95], [0.17, 1.2], [0.12, 1.32], [0, 1.34]], 16)), models = [];
  for (let i = 0; i < (mobile ? 2 : 3); i++) { const g = grp(); g.scale.setScalar(1.1); world.add(g);
    add(k, g, dressG, k.m(dressC[i], { roughness: 0.35 }), 0, 0, 0); add(k, g, cyl(0.035, 0.04, 0.14, 6), skin[i], 0, 1.4, 0); add(k, g, sph(0.12, 12, 10), skin[i], 0, 1.56, 0); add(k, g, sph(0.13, 12, 10), hair[i], 0, 1.6, -0.03);
    for (const s of [-1, 1]) add(k, g, cyl(0.03, 0.035, 0.55, 6), skin[i], s * 0.2, 1.0, 0).rotation.z = s * 0.12;
    models.push(g); }
  k.anim.push((t) => models.forEach((g, i) => { const p = (t * 0.045 + i / models.length) % 1, z0 = RZ0 + 0.6, z1 = RZ1 + 1.8; let x, z, ry, w = true;
    if (p < 0.42) { z = z0 + p / 0.42 * (z1 - z0); x = 0.4; ry = 0; } else if (p < 0.5) { z = z1; x = 0.4 - (p - 0.42) / 0.08 * 0.8; ry = (p - 0.42) / 0.08 * Math.PI; w = false; } else if (p < 0.92) { z = z1 - (p - 0.5) / 0.42 * (z1 - z0); x = -0.4; ry = Math.PI; } else { z = z0; x = -0.4 + (p - 0.92) / 0.08 * 0.8; ry = Math.PI + (p - 0.92) / 0.08 * Math.PI; w = false; }
    g.position.set(x, RY + (w ? Math.abs(Math.sin(t * 7 + i)) * 0.04 : 0), z); g.rotation.set(0, ry, w ? Math.sin(t * 7 + i) * 0.04 : 0); }));
  // 兩側階梯觀眾席（座位、觀眾、相機閃光）
  const seats = [], backs = [], risers = [], aud = [], heads = [], audC = [], headC = [], FP = [], spots = [];
  const zA = RZ0 + 1.2, zB = RZ1 - 0.6;
  for (const s of [-1, 1]) for (let r = 0; r < 3; r++) { const x = s * (RW / 2 + 1.0 + r * 0.95), y0 = r * 0.32; if (r) risers.push([x, y0 / 2, (zA + zB) / 2, [0.95, y0, zB - zA + 0.8]]);
    let n = 0; for (let z = zA; z <= zB; z += 0.85, n++) { seats.push([x, y0 + 0.42, z]); backs.push([x + s * 0.22, y0 + 0.68, z]);
      if (r === 0 && (n === 2 || n === 7)) { spots.push({ x: x - s * 0.02, z, y: y0 + 0.47, face: [0, z], pose: 'sit' }); continue; }
      if (k.rnd() < 0.75) { aud.push([x, y0 + 0.66, z]); heads.push([x, y0 + 1.02, z]); audC.push(k.pick([P0, P2, '#2b2b35', '#ffffff', '#3a6ab0', '#c0392b', '#e9dcc4'])); headC.push(k.pick(skin)); if (k.rnd() < 0.35) FP.push([x - s * 0.28, y0 + 1.05, z]); } } }
  const chairM = k.m('#2b2430');
  inst(world, k.g('seat', () => box(0.46, 0.08, 0.46)), chairM, seats); inst(world, k.g('sback', () => box(0.06, 0.5, 0.46)), chairM, backs);
  inst(world, k.g('riser', () => box(1, 1, 1)), k.m('#4a3a58'), risers);
  inst(world, k.g('audB', () => new THREE.CapsuleGeometry(0.16, 0.3, 4, 8)), k.m('#ffffff'), aud, audC); inst(world, k.g('audH', () => sph(0.12, 10, 8)), k.m('#ffffff'), heads, headC);
  const fl = new THREE.InstancedMesh(k.g('flash', () => new THREE.IcosahedronGeometry(0.1, 1)), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), Math.max(1, FP.length)); world.add(fl);
  const fo = FP.map(() => k.rnd()), fsp = FP.map(() => 0.3 + k.rnd() * 0.5);
  k.anim.push((t) => { FP.forEach(([x, y, z], i) => { const u = (t * fsp[i] + fo[i]) % 1, sc = u < 0.08 ? (1 - u / 0.08) * 2.4 : 0.001; D.position.set(x, y, z); D.rotation.set(0, 0, 0, 'XYZ'); D.scale.setScalar(sc); D.updateMatrix(); fl.setMatrixAt(i, D.matrix); }); fl.instanceMatrix.needsUpdate = true; });
  // 燈架上的聚光燈：光束掃過伸展台
  const trussT = canvas(64, 256, (g) => { g.strokeStyle = '#c9ced6'; g.lineWidth = 6; g.strokeRect(3, 3, 58, 250); g.lineWidth = 4; for (let y = 0; y < 256; y += 32) { g.beginPath(); g.moveTo(3, y); g.lineTo(61, y + 32); g.stroke(); } });
  const trussM = new THREE.MeshStandardMaterial({ map: trussT, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.4 });
  [[-5.6, -9.6, 0], [5.6, -9.6, 0], [-6.8, 19.5, 1], [6.8, 19.5, 1]].forEach(([x, z, out], i) => { if (!clear(x, z, 0.5, 6.5)) return;
    add(k, world, box(0.5, 6, 0.5), trussM, x, 3, z); add(k, world, box(0.8, 0.2, 0.8), '#2b2b30', x, 0.1, z);
    const head = grp(x, 6.25, z); world.add(head); add(k, head, cyl(0.26, 0.34, 0.6, 12), '#1a1a20', 0, 0, 0).rotation.x = Math.PI / 2; add(k, head, new THREE.CircleGeometry(0.25, 16), lit('#fff4fa', 2.5), 0, 0, 0.31, false);
    const L = 10, bg = new THREE.ConeGeometry(1.0, L, 20, 1, true); bg.translate(0, -L / 2, 0); bg.rotateX(-Math.PI / 2); add(k, head, bg, beamM(i % 2 ? '#ffd6ec' : '#e6e0ff', out ? 0.16 : 0.09), 0, 0, 0, false);
    const pool = add(k, world, new THREE.CircleGeometry(0.85, 24), beamM('#fff0f8', 0.4), 0, RY + 0.02, 0, false); pool.rotation.x = -Math.PI / 2;
    const tgt = new THREE.Vector3(); k.anim.push((t) => { const ty = out ? RY : 0.14; if (out) tgt.set(Math.sin(t * 0.7 + i) * 0.5, ty, (RZ0 + RZ1) / 2 + 1 + Math.sin(t * 0.45 + i * 1.7) * (RL / 2 - 1)); else tgt.set(Math.sin(t * 0.7 + i) * 0.4, ty, -3.6 + Math.sin(t * 0.5 + i * 2.1) * 2.6); head.lookAt(tgt); pool.position.set(tgt.x, ty + 0.03, tgt.z); }); });

  // 時裝屋（主建築）：奶油色石牆、斜折屋頂與老虎窗、櫥窗裡的人台、黑色雨棚加跑馬燈泡
  const h = grp(HX, 0.12, HZ); world.add(h); const cream = k.m('#f4ece0'), FZ = 1.6;
  add(k, h, box(HW - 0.4, 2.7, 3.2), cream, 0, 1.35, 0);
  add(k, h, box(HW - 0.4, 2.7, 3.0), windowMat(k, '#f4ece0', HW - 0.4, 2.7, { cols: 6, rows: 2, glass: '#bcc8dc', lit: 0.8, seed: 23 }), 0, 4.05, -0.1);
  add(k, h, box(HW - 0.1, 0.18, 3.5), cream, 0, 2.72, 0.05); add(k, h, box(HW - 0.1, 0.18, 3.3), cream, 0, 5.42, -0.1);
  add(k, h, box(HW - 0.4, 0.05, 0.05), '#2b2b30', 0, 3.25, 1.68); for (let i = 0; i < 14; i++) add(k, h, k.g('rbal', () => box(0.03, 0.5, 0.03)), '#2b2b30', -3.25 + i * 0.5, 3.0, 1.68);
  const man = add(k, h, k.g('mans', () => cyl(0.78, 1, 1.6, 4).rotateY(Math.PI / 4)), k.m('#3a3a4a', { flatShading: true }), 0, 6.3, -0.1); man.scale.set((HW - 0.3) / Math.SQRT2, 1, 3.1 / Math.SQRT2);
  for (const x of [-2.1, 0, 2.1]) { add(k, h, box(0.7, 0.75, 0.5), cream, x, 6.15, 1.15); add(k, h, box(0.45, 0.5, 0.04), k.night ? k.glow('#ffd88a', 1.4) : k.m('#bcc8dc', { roughness: 0.2 }), x, 6.1, 1.41, false); add(k, h, gable(0.5, 0.8, 0.35, 0.05), [cream, k.m('#3a3a4a', { flatShading: true })], x, 6.52, 1.15).rotation.y = Math.PI / 2; }
  const showM = lit('#ffe6ee', k.night ? 1.1 : 0.35);
  for (const x of [-2.15, 2.15]) { add(k, h, box(1.7, 1.9, 0.05), showM, x, 1.15, FZ + 0.01, false); add(k, h, box(1.86, 0.08, 0.1), gold, x, 2.12, FZ + 0.05); }
  add(k, h, box(1.2, 2.1, 0.06), k.m('#1a1a22', { roughness: 0.15 }), 0, 1.05, FZ + 0.02); add(k, h, box(1.36, 0.08, 0.1), gold, 0, 2.12, FZ + 0.05);
  const canopy = add(k, h, box(3.4, 0.16, 1.4), k.m('#141018', { roughness: 0.3 }), 0, 2.45, FZ + 0.7);
  for (const s of [-1, 1]) { const rod = add(k, h, cyl(0.02, 0.02, 1.7, 4), gold, s * 1.5, 3.05, FZ + 0.7); rod.rotation.x = 0.95; }
  const sign = nameSign(k, 3.4, 0.5, '#141018', '#ffd6e8', '"Noto Serif TC", serif'); sign.position.set(0, 2.78, FZ + 1.36); h.add(sign);
  const bA = [], bB = []; let bi = 0; const bulbAt = (x, y, z) => (bi++ % 2 ? bB : bA).push([x, y, z]);
  for (let x = -1.6; x <= 1.61; x += 0.2) bulbAt(x, 2.34, FZ + 1.42); for (const s of [-1, 1]) for (let z = FZ + 0.1; z < FZ + 1.4; z += 0.2) bulbAt(s * 1.72, 2.34, z);
  const bulbG = k.g('mbulb', () => sph(0.055, 8, 6)), mA = lit('#ffe9a8', 2.4), mB = lit('#ffe9a8', 0.2);
  inst(h, bulbG, mA, bA, null, false); inst(h, bulbG, mB, bB, null, false);
  k.anim.push((t) => { const on = Math.floor(t * 4) % 2; mA.emissiveIntensity = on ? 2.6 : 0.15; mB.emissiveIntensity = on ? 0.15 : 2.6; });
  const banners = [P0, P2].map((c, i) => { const b = add(k, h, new THREE.PlaneGeometry(0.6, 2.2).translate(0, -1.1, 0), k.m(c, { side: THREE.DoubleSide }), (i ? 1 : -1) * 3.12, 5.2, FZ + 0.12, false); return b; });
  k.anim.push((t) => banners.forEach((b, i) => { b.rotation.x = 0.05 + Math.sin(t * 1.3 + i) * 0.06; }));
  // 人台（穿著洋裝，慢慢轉）
  const formG = k.g('dform', () => lathe([[0, 0], [0.5, 0], [0.42, 0.25], [0.24, 0.75], [0.18, 1.0], [0.24, 1.25], [0.2, 1.45], [0.08, 1.55], [0, 1.56]], 16));
  const form = (p, x, z, c, s = 1) => { const g = grp(x, 0, z); g.scale.setScalar(s); p.add(g); add(k, g, cyl(0.32, 0.38, 0.18, 14), gold, 0, 0.09, 0); add(k, g, cyl(0.03, 0.03, 0.6, 6), gold, 0, 0.45, 0); add(k, g, formG, k.m(c, { roughness: 0.4 }), 0, 0.7, 0); add(k, g, sph(0.06, 8, 6), gold, 0, 2.3, 0); const ph = x; k.anim.push((t) => { g.rotation.y = t * 0.5 + ph; }); return g; };
  form(h, -2.15, 1.95, P2, 0.7); form(h, 2.15, 1.95, P0, 0.7);
  [[-9.6, -5.5], [9.6, -5.5], [-10.4, -1], [10.4, -1], [-10.2, 3.6], [10.2, 3.6]].forEach(([x, z], i) => { if (clear(x, z, 0.6, 2.6)) form(world, x, z, [P0, '#1a1a22', P2, '#ffffff', '#c9a8ff', '#ffb3c8'][i], 1.2); });
  // 巨型線軸、針插、縫衣針與鈕扣
  const spool = (x, z, s, col) => { if (!clear(x, z, 1.4 * s, 3.3 * s)) return null; const g = grp(x, 0, z); g.scale.setScalar(s); world.add(g); const w = k.m('#e8d2b0');
    add(k, g, cyl(1.2, 1.2, 0.3, 24), w, 0, 0.15, 0); add(k, g, cyl(1.2, 1.2, 0.3, 24), w, 0, 3.05, 0);
    add(k, g, cyl(0.9, 0.9, 2.6, 24), new THREE.MeshStandardMaterial({ map: rep(stripeTex(col, hex(C(col).multiplyScalar(0.82)), 16, false), 1, 3), roughness: 0.8 }), 0, 1.6, 0);
    k.anim.push((t) => { g.rotation.y = t * 0.3 + x; }); return g; };
  const sp2 = spool(13.5, -8.5, 1.1, P2); spool(-13, -7, 1.3, P0); spool(-12, 5.8, 0.8, '#7fc8f8');
  const cx = 12.5, cz = -15.5;
  if (clear(cx, cz, 2.5, 10)) { const cu = add(k, world, sph(2.2, 20, 12), new THREE.MeshStandardMaterial({ map: stripeTex('#e8384f', '#c92a40', 12), roughness: 0.8 }), cx, 1.1, cz); cu.scale.y = 0.62; add(k, world, cyl(0.6, 0.7, 0.4, 16), '#3f9a4f', cx, 2.45, cz);
    const nd = grp(cx - 0.6, 1.4, cz); nd.rotation.z = 0.5; world.add(nd); add(k, nd, cyl(0.12, 0.02, 9, 10), k.m('#d8dde4', { metalness: 0.8, roughness: 0.25 }), 0, 4.5, 0).geometry.rotateX(Math.PI); add(k, nd, new THREE.TorusGeometry(0.2, 0.05, 6, 14), k.m('#d8dde4', { metalness: 0.8 }), 0, 8.3, 0).scale.set(0.6, 1.4, 1);
    for (let i = 0; i < 4; i++) { const a = i * 1.6, pg = grp(cx + Math.sin(a) * 1.3, 1.6, cz + Math.cos(a) * 1.3); pg.rotation.set(Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5); world.add(pg); add(k, pg, cyl(0.03, 0.03, 1.6, 6), '#d8dde4', 0, 0.8, 0); add(k, pg, sph(0.16, 10, 8), [P0, '#ffd23f', '#5ac8fa', '#ffffff'][i], 0, 1.65, 0); }
    if (sp2) { const eye = new THREE.Vector3(cx - 0.6 - Math.sin(0.5) * 8.3, 1.4 + Math.cos(0.5) * 8.3, cz), st = new THREE.Vector3(13.5 - 1.0, 2.2, -8.5);
      add(k, world, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([st, new THREE.Vector3(10.5, 6, -9.5), new THREE.Vector3(eye.x + 1.2, eye.y + 1.5, cz + 0.8), eye]), 40, 0.05, 5), k.m(P2), 0, 0, 0, false); } }
  const btnT = canvas(128, 128, (g) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128); g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 8; g.beginPath(); g.arc(64, 64, 50, 0, TAU); g.stroke(); g.fillStyle = 'rgba(0,0,0,.55)'; for (const [x, y] of [[48, 48], [80, 48], [48, 80], [80, 80]]) { g.beginPath(); g.arc(x, y, 8, 0, TAU); g.fill(); } });
  [[-15.5, -1.5, P0], [-10.5, -12.5, '#ffd23f'], [15.6, 3.2, '#5ac8fa']].forEach(([x, z, c]) => { if (!clear(x, z, 1.4, 3)) return; const bm = new THREE.MeshStandardMaterial({ map: btnT, color: C(c), roughness: 0.4 }); const b = add(k, world, cyl(1.4, 1.4, 0.35, 32), [k.m(c, { roughness: 0.4 }), bm, bm], x, 1.35, z); b.rotation.set(Math.PI / 2 - 0.25, Math.atan2(-x, -z), 0, 'YXZ'); });
  return { spots, features: ['時裝屋', '伸展台走秀', '觀眾席', '掃動的聚光燈', '巨型線軸與針', '閃光燈'], heroH: 7.1 };
}

// ================= 染布村 =================
function dyevillage({ k, world, pal, clear, mobile }) {
  const flag = rep(canvas(256, 256, (g) => { g.fillStyle = '#8f8a7e'; g.fillRect(0, 0, 256, 256); for (let j = 0; j < 5; j++) for (let i = 0; i < 6; i++) { g.fillStyle = ['#c9c4b6', '#bdb8aa', '#d2cdc0', '#b5b0a2'][(i * 2 + j) % 4]; const x = i * 51 + (j % 2) * 22 - 22, y = j * 51; g.beginPath(); g.moveTo(x + 4 + k.rnd() * 6, y + 4); g.lineTo(x + 47, y + 3 + k.rnd() * 6); g.lineTo(x + 46 - k.rnd() * 6, y + 47); g.lineTo(x + 3, y + 46 - k.rnd() * 5); g.fill(); } }), 6, 6);
  ground(k, world, { color: '#6f9a58', coreTex: flag, edge: '#7d786c', edgeH: 0.3 });
  const IND = ['#1d2a6e', '#2a3f8f', '#3d5aa8', '#6f8fc8'];
  // 布料貼圖：漸層、絞染圓點、條紋、茜草紅、薑黃、波紋、柿染
  const clothT = (kind) => canvas(64, 256, (g, w, hh) => {
    const grad = (a, b) => { const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, 0, w, hh); };
    if (kind === 0) grad('#9fb6e0', IND[0]);
    else if (kind === 1) { g.fillStyle = '#22306e'; g.fillRect(0, 0, w, hh); g.strokeStyle = '#eef2ff'; g.lineWidth = 2; for (let y = 16; y < hh; y += 26) for (let x = 12; x < w; x += 22) { g.beginPath(); g.arc(x + (y % 52 ? 0 : 10), y, 6, 0, TAU); g.stroke(); g.fillStyle = '#eef2ff'; g.fillRect(x + (y % 52 ? 0 : 10) - 1, y - 1, 2, 2); } }
    else if (kind === 2) { for (let y = 0; y < hh; y += 16) { g.fillStyle = (y / 16) % 3 ? IND[1] : '#f4f2ec'; g.fillRect(0, y, w, 16); } }
    else if (kind === 3) { grad('#d85a5a', '#8a2030'); g.fillStyle = 'rgba(255,255,255,.35)'; for (let y = 40; y < hh; y += 60) g.fillRect(0, y, w, 4); }
    else if (kind === 4) { grad('#f2c94c', '#c98a1a'); g.fillStyle = IND[0]; g.fillRect(0, hh - 30, w, 30); }
    else if (kind === 5) { g.fillStyle = IND[3]; g.fillRect(0, 0, w, hh); g.strokeStyle = '#ffffff'; g.lineWidth = 3; for (let y = 10; y < hh; y += 22) { g.beginPath(); for (let x = 0; x <= w; x += 4) g.lineTo(x, y + Math.sin(x / 6) * 4); g.stroke(); } }
    else { grad('#d98a5a', '#8a4a2a'); } });
  const clothM = [0, 1, 2, 3, 4, 5, 6].map(i => new THREE.MeshStandardMaterial({ map: clothT(i), side: THREE.DoubleSide, roughness: 0.9 }));
  const cloths = [];
  const cloth = (parent, w, len, mi, x, y, z, amp = 0.3) => { const geo = new THREE.PlaneGeometry(w, len, 2, 10); geo.translate(0, -len / 2, 0); const m = new THREE.Mesh(geo, clothM[mi % 7]); m.position.set(x, y, z); m.castShadow = true; parent.add(m); const p = geo.attributes.position; cloths.push({ p, base: Float32Array.from(p.array), len, ph: k.rnd() * TAU, amp }); return m; };
  k.anim.push((t) => cloths.forEach(({ p, base, len, ph, amp }) => { for (let i = 0; i < p.count; i++) { const u = -base[i * 3 + 1] / len; p.array[i * 3 + 2] = base[i * 3 + 2] + Math.sin(t * 1.7 + u * 3 + ph + base[i * 3] * 0.8) * amp * u; p.array[i * 3] = base[i * 3] + Math.sin(t * 1.1 + ph) * 0.06 * u; } p.needsUpdate = true; }));
  // 竹架晾布：高高的竹竿掛著一長條一長條的染布，隨風飄
  const bambooM = k.m('#b9a55a', { roughness: 0.7 });
  const rack = (x, z, n, hh, mi0) => { const g = grp(x, 0, z); g.rotation.y = Math.atan2(-x, -z); world.add(g); const W = n * 1.35 + 0.3;
    for (const s of [-1, 1]) add(k, g, k.g('bam' + hh, () => cyl(0.08, 0.1, hh, 6)), bambooM, s * W / 2, hh / 2, 0);
    add(k, g, k.g('bambar' + n, () => cyl(0.06, 0.06, W + 0.6, 6)), bambooM, 0, hh - 0.25, 0).rotation.z = Math.PI / 2;
    for (let i = 0; i < n; i++) cloth(g, 1.1, hh - 1.4, mi0 + i, -W / 2 + 0.83 + i * 1.35, hh - 0.32, 0); };
  [[-11.5, -3, 3, 7], [-13, 3.8, 2, 6], [-10.8, -10, 3, 7.5], [11.5, -2, 3, 7], [13, 4.6, 2, 6], [11, -10, 3, 7.5], [-6.6, -14.5, 3, 8], [6.6, -14.5, 3, 8]].forEach(([x, z, n, hh], i) => { if (clear(x, z, n * 0.75, hh)) rack(x, z, n, hh, i * 2); });
  // 前方的溪流、石岸、拱橋、溪裡洗布
  const RZ = 14.2;
  waterPlane(k, world, 340, 7, 0, RZ, { color: '#3f8fa0', y: 0.04, speed: [0.05, 0.01] });
  for (const z of [RZ - 3.8, RZ + 3.8]) add(k, world, box(340, 0.35, 0.8), k.m('#9a958a', { flatShading: true }), 0, 0.17, z);
  for (let i = 0; i < 3; i++) add(k, world, box(2.2, 0.12, 0.45), '#b5b0a2', 3, 0.3 - i * 0.1, RZ - 3.3 + i * 0.42);
  const bx = -9; for (let i = 0; i < 7; i++) { const zz = RZ - 4.1 + i * 1.37, y = 0.35 + Math.sin(i / 6 * Math.PI) * 0.9; add(k, world, box(1.6, 0.15, 1.42), '#8a6040', bx, y, zz).rotation.x = -Math.cos(i / 6 * Math.PI) * 0.35; for (const s of [-0.75, 0.75]) add(k, world, k.g('brp', () => box(0.07, 0.6, 0.07)), '#6b4a35', bx + s, y + 0.3, zz); }
  const rinse = [];
  for (let i = 0; i < 4; i++) { const geo = new THREE.PlaneGeometry(6, 0.95, 12, 1); geo.rotateX(-Math.PI / 2); const m = new THREE.Mesh(geo, clothM[[0, 1, 5, 2][i]]); m.position.set(0.5 + i * 3.1, 0, RZ - 2.4 + i * 1.15); world.add(m); rinse.push({ p: geo.attributes.position, base: Float32Array.from(geo.attributes.position.array), i });
    add(k, world, k.g('stake', () => cyl(0.05, 0.05, 1.3, 6)), bambooM, 0.5 + i * 3.1 - 3.05, 0.5, RZ - 2.4 + i * 1.15); }
  k.anim.push((t) => rinse.forEach(({ p, base, i }) => { for (let j = 0; j < p.count; j++) { const x = base[j * 3], u = (x + 3) / 6; p.array[j * 3 + 1] = 0.08 + Math.sin(x * 1.5 - t * 2.5 + i) * 0.04 * u; p.array[j * 3 + 2] = base[j * 3 + 2] + Math.sin(x * 0.8 - t * 1.5 + i) * 0.22 * u; } p.needsUpdate = true; }));
  const spots = [{ x: 3, z: RZ - 3.25, y: 0.36, face: [3, RZ], pose: 'crouch', hat: 'straw' }];
  // 染缸（木桶、藍靛染液與泡沫，有一缸在攪）
  const staveT = rep(stripeTex('#8a6040', '#7a5236', 12), 2, 1), staveM = new THREE.MeshStandardMaterial({ map: staveT, roughness: 0.85 }), bubbles = [], bubC = [];
  const liq = [IND[0], IND[1], '#9a2a2a', IND[0], '#c9a227', IND[2]];
  [[-9.8, 2.5], [-10.7, 6.0], [-12.5, 3.4], [9.8, 2.2], [10.9, 5.8], [12.7, 2.6]].forEach(([x, z], i) => { if (!clear(x, z, 0.8, 1.2)) return;
    add(k, world, k.g('vat', () => cyl(0.75, 0.65, 1.0, 16)), staveM, x, 0.5, z); for (const y of [0.22, 0.8]) add(k, world, k.g('hoop', () => new THREE.TorusGeometry(0.73, 0.035, 5, 20)), '#3a3a3a', x, y, z).rotation.x = Math.PI / 2;
    add(k, world, k.g('liq', () => cyl(0.68, 0.68, 0.02, 16)), k.m(liq[i], { roughness: 0.15 }), x, 0.95, z, false);
    if (liq[i] === IND[0] || liq[i] === IND[1]) for (let j = 0; j < 6; j++) { const a = j * 1.1, r = 0.15 + (j % 3) * 0.15; bubbles.push([x + Math.sin(a) * r, 0.97, z + Math.cos(a) * r, 0.07 + (j % 2) * 0.04]); bubC.push(j % 2 ? '#8a7ad0' : '#6a5ab8'); }
    if (i === 0) { const st = grp(x, 0.95, z); world.add(st); const stick = add(k, st, cyl(0.03, 0.03, 1.8, 6), '#a8784a', 0.25, 0.5, 0); stick.rotation.z = -0.4; k.anim.push((t) => { st.rotation.y = t * 1.2; }); spots.push({ x: x + (x > 0 ? -1 : 1) * 0.95, z: z - 0.3, y: 0.02, face: [x, z], pose: 'work', hat: 'straw' }); } });
  inst(world, k.g('bub', () => sph(1, 8, 6)), k.m('#ffffff', { roughness: 0.3 }), bubbles, bubC, false);

  // 傳統染坊（主建築）：木柱白牆、格子窗、前簷、黑瓦屋頂、門口的藍染門簾、二樓垂下的長布
  const h = grp(HX, 0.12, HZ); world.add(h);
  const plaster = k.m('#f2ece0'), wood = k.m('#5a3a26'), tileM = k.m('#3a3a40', { flatShading: true }), FZ = (HD - 0.8) / 2;
  const lattice = canvas(64, 64, (g) => { g.fillStyle = k.night ? '#ffd88a' : '#f6eedc'; g.fillRect(0, 0, 64, 64); g.strokeStyle = '#5a3a26'; g.lineWidth = 4; g.strokeRect(2, 2, 60, 60); for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(i * 16, 0); g.lineTo(i * 16, 64); g.moveTo(0, i * 16); g.lineTo(64, i * 16); g.stroke(); } });
  const latM = new THREE.MeshStandardMaterial({ map: lattice, emissive: C(k.night ? '#ffb84d' : '#000000'), emissiveMap: k.night ? lattice : null, emissiveIntensity: 0.9 });
  add(k, h, box(HW - 0.6, 2.8, HD - 0.8), plaster, 0, 1.4, 0);
  for (let i = 0; i < 5; i++) add(k, h, box(0.2, 2.8, 0.2), wood, -3.0 + i * 1.5, 1.4, FZ + 0.05);
  add(k, h, box(HW - 0.4, 0.22, 0.25), wood, 0, 2.8, FZ + 0.05);
  for (const x of [-2.25, 2.25]) add(k, h, box(1.3, 1.0, 0.05), latM, x, 1.5, FZ + 0.01, false);
  add(k, h, box(1.3, 2.1, 0.05), '#2a1e16', 0, 1.05, FZ + 0.01);
  const pent = add(k, h, box(HW + 0.2, 0.12, 1.3), tileM, 0, 3.02, FZ + 0.42); pent.rotation.x = 0.38;
  add(k, h, box(HW - 1.4, 1.9, HD - 1.4), plaster, 0, 3.75, 0);
  for (const x of [-2.2, 2.2]) add(k, h, box(0.9, 0.8, 0.05), latM, x, 3.85, (HD - 1.4) / 2 + 0.01, false);
  add(k, h, gable(HW - 0.6, HD - 0.6, 1.7, 0.5), [plaster, tileM], 0, 4.7, 0); add(k, h, box(HW + 0.2, 0.18, 0.25), '#2a2a30', 0, 6.42, 0);
  const sign = nameSign(k, 2.8, 0.5, '#f4efe4', '#1d2a6e', '"Noto Serif TC", serif'); sign.position.set(0, 4.15, (HD - 1.4) / 2 + 0.05); h.add(sign);
  const norenT = canvas(64, 128, (g) => { g.fillStyle = IND[0]; g.fillRect(0, 0, 64, 128); g.strokeStyle = '#f4f2ec'; g.lineWidth = 6; g.beginPath(); g.arc(32, 60, 18, 0, TAU); g.stroke(); });
  clothM.push(new THREE.MeshStandardMaterial({ map: norenT, side: THREE.DoubleSide, roughness: 0.9 }));
  for (let i = 0; i < 3; i++) { const geo = new THREE.PlaneGeometry(0.42, 1.0, 1, 6); geo.translate(0, -0.5, 0); const m = new THREE.Mesh(geo, clothM[7]); m.position.set(-0.44 + i * 0.44, 2.2, FZ + 0.12); h.add(m); const p = geo.attributes.position; cloths.push({ p, base: Float32Array.from(p.array), len: 1.0, ph: i, amp: 0.08 }); }
  for (const s of [-1, 1]) cloth(h, 0.7, 2.7, s > 0 ? 1 : 0, s * 3.05, 4.62, FZ + 0.32, 0.12);
  inst(h, k.g('djar', () => lathe([[0, 0], [0.35, 0], [0.5, 0.3], [0.52, 0.6], [0.42, 0.8], [0, 0.8]])), k.m('#4a3a30', { roughness: 0.4 }), [[2.75, 0, 2.25, 1], [3.3, 0, 1.75, 0.8]]);
  // 山坡上的梯田聚落、遠山與山嵐
  const stoneW = k.m('#9a958a', { flatShading: true }), grassM = k.m(k.night ? '#3e5a32' : '#7aa860'), hb = [], hr = [];
  for (let i = 0; i < 4; i++) { const z = -19 - i * 6.5, top = 1.6 * (i + 1); const m = new THREE.Mesh(new THREE.BoxGeometry(80, top, 6.5), [stoneW, stoneW, grassM, stoneW, stoneW, stoneW]); m.position.set(0, top / 2, z); m.receiveShadow = true; world.add(m);
    for (let j = 0; j < (mobile ? 3 : 5); j++) { const x = -26 + j * 12 + (k.rnd() - 0.5) * 6 + (i % 2) * 5; if (i === 0 && Math.abs(x) < 6) continue; hb.push([x, top + 1.1, z + (k.rnd() - 0.5), [3, 2.2, 2.4]]); hr.push([x, top + 2.2, z, [3.2, 1.1, 2.4]]); } }
  const hwT = canvas(64, 64, (g) => { g.fillStyle = '#f2ece0'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#5a3a26'; g.fillRect(0, 54, 64, 10); g.fillStyle = k.night ? '#ffc46b' : '#4a4a50'; g.fillRect(10, 20, 14, 14); g.fillRect(40, 20, 14, 14); });
  inst(world, k.g('vh', () => box(1, 1, 1)), new THREE.MeshStandardMaterial({ map: hwT, emissive: C(k.night ? '#ffb84d' : '#000000'), emissiveMap: k.night ? hwT : null, emissiveIntensity: 0.6 }), hb);
  inst(world, k.g('vr', () => gable(1, 1, 0.8, 0.1)), tileM, hr);
  for (const [x, z, s, c] of [[-42, -70, 30, '#6f8f80'], [6, -88, 40, '#8aa89a'], [46, -72, 28, '#6f8f80'], [-72, -32, 22, '#8aa89a'], [72, -36, 24, '#8aa89a']]) add(k, world, cone(s, s * 0.9, 8), k.m(c, { flatShading: true }), x, s * 0.45, z).castShadow = false;
  // 竹林
  const culms = [], tufts = [];
  ringOut(k, clear, mobile ? 4 : 7, 14, 26, 9, 1.5, (x, z) => { for (let j = 0; j < 9; j++) { const hh = 5 + k.rnd() * 4, dx = (k.rnd() - 0.5) * 2, dz = (k.rnd() - 0.5) * 2; culms.push([x + dx, hh / 2, z + dz, [1, hh, 1]]); tufts.push([x + dx, hh, z + dz, [0.9, 0.6, 0.9], k.rnd() * 3]); } return 1; }, { front: false });
  inst(world, k.g('culm', () => cyl(0.07, 0.09, 1, 6)), k.m('#7cae4a'), culms); inst(world, k.g('tuft', () => new THREE.IcosahedronGeometry(1, 0)), k.m(k.night ? '#2e5a35' : '#5a9a3a', { flatShading: true }), tufts);
  mist(k, world, mobile ? 6 : 11, { area: [-45, 45, -62, -16], y: [3, 12], size: [20, 5.5], opacity: 0.55 });
  mist(k, world, mobile ? 3 : 5, { area: [-25, 25, 11, 18], y: [0.7, 1.4], size: [9, 1.8], opacity: 0.35, speed: 0.4 });
  return { spots, features: ['傳統染坊', '竹架晾布', '染缸', '溪邊洗布', '梯田聚落', '山嵐'], heroH: 6.6, fog: [24, 95] };
}

// 小小的發亮星點（Points），會一閃一閃
function twinkles(k, world, n, { area = 24, y = [0.5, 9], colors = ['#ffffff'], size = 0.45, cz = -2 } = {}) {
  const star = canvas(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 10); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(32, 0); g.lineTo(35, 29); g.lineTo(64, 32); g.lineTo(35, 35); g.lineTo(32, 64); g.lineTo(29, 35); g.lineTo(0, 32); g.lineTo(29, 29); g.fill(); });
  const sets = [0, 1].map((s) => { const pa = new Float32Array(n * 3), pc = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = k.rnd() * TAU, r = Math.sqrt(k.rnd()) * area; pa.set([Math.sin(a) * r, y[0] + k.rnd() * (y[1] - y[0]), Math.cos(a) * r + cz], i * 3); const c = C(colors[(i + s) % colors.length]); pc.set([c.r, c.g, c.b], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pa, 3)); g.setAttribute('color', new THREE.BufferAttribute(pc, 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ size, map: star, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); world.add(p); return p; });
  k.anim.push((t) => sets.forEach((p, i) => { p.material.opacity = 0.55 + 0.45 * Math.sin(t * 2.2 + i * Math.PI); p.rotation.y = t * 0.01 * (i ? 1 : -1); }));
}

// ================= 粉紅美妝大道 =================
function glam({ k, world, pal, clear, mobile }) {
  const tile = rep(canvas(128, 128, (g) => { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? '#ffe1ee' : '#fffafc'; g.fillRect(i * 32, j * 32, 32, 32); } for (let i = 0; i < 30; i++) { g.fillStyle = i % 2 ? '#ffd36e' : '#ffffff'; g.fillRect((i * 53) % 128, (i * 97) % 128, 2, 2); } }), 7, 7);
  ground(k, world, { color: '#ffd0e2', coreTex: tile, edge: '#ff6fa8', edgeH: 0.25 });
  const pink = '#ff5fa2', gold = k.m('#e8c26a', { metalness: 0.7, roughness: 0.25 }), gloss = (c) => k.m(c, { roughness: 0.12, metalness: 0.12 });
  // 粉紅地毯＋愛心路燈
  add(k, world, box(3.2, 0.04, 17), k.m('#ff4f96', { roughness: 0.7 }), 0, 0.02, CORE + 8.5, false); for (const s of [-1, 1]) add(k, world, box(0.12, 0.05, 17), gold, s * 1.66, 0.03, CORE + 8.5, false);
  for (const z of [10.5, 14.5, 18.5]) for (const s of [-1, 1]) world.add(lamp(k, s * 2.3, z, '#ff9fd0'));
  // 造型大樓：指甲油瓶、口紅、粉餅、香水瓶
  const labelT = (w) => canvas(256, 160, (g) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 160); g.strokeStyle = '#e8c26a'; g.lineWidth = 8; g.strokeRect(8, 8, 240, 144); g.fillStyle = '#e0337a'; g.font = '800 64px "Noto Sans TC", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(w, 128, 84); });
  const lipG = k.g('lipb', () => { const g = cyl(0.62, 0.62, 2.2, 20, false); const p = g.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setY(i, 1.1 - (p.getX(i) + 0.62) * 0.7); g.computeVertexNormals(); return g; });
  const words = ['甲油', '亮澤', '玫瑰', '珊瑚', '星光', '蜜桃'], bodyC = ['#ff4f8b', '#c86bff', '#ff8a5c', '#ff2e63', '#ffb3d1', '#9d6bff'];
  let wi = 0;
  const bottle = (g, c) => { add(k, g, k.g('pbody', () => rbox(2.6, 3.2, 2.0, 0.6)), gloss(c), 0, 0, 0); add(k, g, box(1.6, 1.0, 0.04), new THREE.MeshBasicMaterial({ map: labelT(words[wi++ % 6]) }), 0, 1.9, 1.04, false); add(k, g, box(0.7, 1.1, 0.04), k.night ? k.glow('#ffd6ea', 1.6) : k.m('#3a2a3a', { roughness: 0.1 }), 0, 0.55, 1.04, false);
    add(k, g, cyl(0.55, 0.6, 0.35, 16), gold, 0, 3.55, 0); add(k, g, cyl(0.48, 0.55, 2.6, 16), gloss(k.pick(['#1a1a22', '#ffffff', '#e8c26a'])), 0, 5.0, 0); return 6.3; };
  const lipstick = (g, c) => { add(k, g, cyl(0.9, 0.9, 2.4, 20), gold, 0, 1.2, 0); add(k, g, cyl(0.78, 0.78, 1.2, 20), gloss('#1a1a22'), 0, 3.0, 0); add(k, g, lipG, gloss(c), 0, 4.7, 0); add(k, g, box(0.5, 0.9, 0.04), k.night ? k.glow('#ffd6ea', 1.6) : k.m('#3a2a3a', { roughness: 0.1 }), 0, 0.45, 0.9, false); return 5.8; };
  const perfume = (g, c) => { add(k, g, k.g('pfm', () => new THREE.IcosahedronGeometry(1.5, 0)), new THREE.MeshStandardMaterial({ color: C(c), roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.85, flatShading: true }), 0, 1.5, 0); add(k, g, cyl(0.3, 0.35, 0.6, 12), gold, 0, 3.1, 0); add(k, g, sph(0.55, 14, 10), gloss('#ff9fc8'), 0, 3.75, 0); return 4.3; };
  const shapes = [bottle, lipstick, bottle, perfume, lipstick, bottle];
  let si = 0;
  [[-13.5, -14.5], [-16, -6], [-17, -1], [13.5, -14.5], [16, -6], [17, -1], [-6.5, -19], [6.5, -19], [-22, -12], [22, -12], [0, -26]].forEach(([x, z]) => { const s = 1.2 + k.rnd() * 0.5; if (!clear(x, z, 1.6 * s, 6.3 * s)) return; const g = grp(x, 0, z); g.scale.setScalar(s); g.rotation.y = Math.atan2(-x, 4 - z); world.add(g); shapes[si % 6](g, bodyC[si % 6]); si++; });
  // 打開的粉餅亭（前方兩側，低矮）
  for (const [x, z] of [[-11, 8.5], [11, 8.5]]) { if (!clear(x, z, 2, 3)) continue; const g = grp(x, 0, z); g.rotation.y = Math.atan2(-x, 2 - z); world.add(g); add(k, g, cyl(2.0, 2.0, 0.5, 32), gold, 0, 0.25, 0); add(k, g, cyl(1.75, 1.75, 0.08, 32), k.m('#f7c6b0', { roughness: 0.9 }), 0, 0.52, 0);
    const lid = grp(0, 0.5, -2.0); g.add(lid); lid.rotation.x = -1.15; add(k, lid, cyl(2.0, 2.0, 0.3, 32), gold, 0, 0.15, 2.0); const mir = add(k, lid, cyl(1.7, 1.7, 0.04, 32), k.m('#eef4ff', { metalness: 1, roughness: 0.05 }), 0, 0.32, 2.0); }
  // 指甲油瓶沙龍（主建築）：亮面粉紅瓶身、白色標籤招牌、金色瓶頸、黑色瓶蓋加發光環
  const h = grp(HX, 0.12, HZ); world.add(h);
  const BD = HD - 0.8, FZ = BD / 2;
  add(k, h, rbox(HW - 1.6, 5.0, BD, 1.1, 0.3), gloss(pink), 0, 0, 0);
  add(k, h, box(0.22, 3.6, 0.02), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }), -2.25, 2.6, FZ + 0.02, false);
  add(k, h, rbox(4.2, 1.5, 0.12, 0.3, 0.03), k.m('#ffffff', { roughness: 0.4 }), 0, 2.45, FZ - 0.02);
  const sign = nameSign(k, 3.7, 0.7, '#ffffff', '#e0337a'); sign.position.set(0, 3.2, FZ + 0.08); h.add(sign);
  add(k, h, box(1.3, 2.1, 0.05), k.m('#3a2a3a', { roughness: 0.1 }), 0, 1.05, FZ + 0.02); add(k, h, new THREE.TorusGeometry(0.66, 0.06, 6, 18, Math.PI), gold, 0, 2.1, FZ + 0.06); for (const x of [-0.66, 0.66]) add(k, h, box(0.1, 2.1, 0.1), gold, x, 1.05, FZ + 0.06);
  for (const x of [-1.9, 1.9]) add(k, h, box(1.1, 1.0, 0.05), lit('#ffd6ea', k.night ? 1.4 : 0.4), x, 1.2, FZ + 0.02, false);
  add(k, h, cyl(1.3, 1.45, 0.6, 24), gold, 0, 5.3, 0);
  add(k, h, cyl(1.15, 1.25, 3.6, 24), gloss('#1a1a22'), 0, 7.4, 0);
  const ringM = lit('#ff7ac0', 2.0); for (const y of [6.2, 8.6]) add(k, h, new THREE.TorusGeometry(1.24, 0.07, 8, 32), ringM, 0, y, 0, false).rotation.x = Math.PI / 2;
  const hrt = add(k, h, heartGeo(0.42, 0.12), lit('#ff4f96', 1.6), 0, 7.4, 1.25, false);
  k.anim.push((t) => { ringM.emissiveIntensity = 1.4 + Math.sin(t * 3) * 0.8; hrt.scale.setScalar(1 + Math.max(0, Math.sin(t * 4)) * 0.12); });
  // 鏡球噴泉
  const [fx, fz] = [[-9.8, -10.8], [9.8, -10.8], [-15.5, -2], [15.5, -2], [-11, -1], [11, -1]].find(([x, z]) => clear(x, z, 2.6, 2.8)) || [99, 99]; if (fx < 99) { add(k, world, cyl(2.6, 2.8, 0.5, 32), k.m('#ffffff', { roughness: 0.3 }), fx, 0.25, fz);
    const wt = rep(canvas(64, 64, (g) => { g.fillStyle = '#ffb3d9'; g.fillRect(0, 0, 64, 64); g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 2; for (let r = 6; r < 46; r += 8) { g.beginPath(); g.arc(32, 32, r, 0, TAU); g.stroke(); } }), 1, 1);
    const wtr = add(k, world, cyl(2.4, 2.4, 0.04, 32), new THREE.MeshStandardMaterial({ map: wt, roughness: 0.1, transparent: true, opacity: 0.9 }), fx, 0.47, fz, false);
    add(k, world, cyl(0.25, 0.35, 1.4, 12), gold, fx, 1.1, fz);
    const ballT = canvas(128, 64, (g) => { for (let i = 0; i < 16; i++) for (let j = 0; j < 8; j++) { const v = 150 + ((i * 7 + j * 13) % 9) * 12; g.fillStyle = `rgb(${v},${v},${v + 10})`; g.fillRect(i * 8 + 0.5, j * 8 + 0.5, 7, 7); } });
    const ball = add(k, world, sph(1.0, 24, 16), new THREE.MeshStandardMaterial({ map: ballT, metalness: 0.55, roughness: 0.25, emissive: C(k.night ? '#806070' : '#3a3040') }), fx, 2.6, fz); ball.scale.setScalar(0.8);
    const drops = new THREE.InstancedMesh(k.g('drop', () => sph(0.08, 6, 4)), new THREE.MeshStandardMaterial({ color: 0xffe6f2, transparent: true, opacity: 0.8 }), 48); world.add(drops);
    k.anim.push((t) => { ball.rotation.y = t * 0.6; wt.rotation = t * 0.1; for (let i = 0; i < 48; i++) { const j = i % 8, a = j / 8 * TAU, u = ((t * 0.7 + Math.floor(i / 8) / 6) % 1); D.position.set(fx + Math.sin(a) * (0.4 + u * 1.8), 1.8 + u * 1.0 - u * u * 1.4, fz + Math.cos(a) * (0.4 + u * 1.8)); D.rotation.set(0, 0, 0, 'XYZ'); D.scale.setScalar(1 - u * 0.4); D.updateMatrix(); drops.setMatrixAt(i, D.matrix); } drops.instanceMatrix.needsUpdate = true; });
    twinkles(k, world, 30, { area: 3, y: [1, 3.6], colors: ['#ffffff', '#ffd6ec'], size: 0.35, cz: fz }); }
  // 粉彩棕櫚
  const pp = scatter(k, clear, mobile ? 7 : 12, 10, 19, 6, 1.2, { front: false, avoid: (x, z) => Math.hypot(x - fx, z - fz) < 4 });
  palms(k, world, pp.map(([x, z]) => [x, z, 0.9 + k.rnd() * 0.3]), { trunk: '#fff0f6', leaves: ['#ff9ecf', '#c8a8ff', '#9fe8d0', '#ffd0e8'], h: 5 });
  // 愛心氣球
  const hb = []; for (let i = 0; i < (mobile ? 4 : 7); i++) { const a = -2.4 + i * (4.8 / 6), x = Math.sin(a) * (CORE + 1.4), z = Math.cos(a) * (CORE + 1.4); if (!clear(x, z, 0.5, 4)) continue; const g = grp(x, 0, z); world.add(g); add(k, g, cyl(0.008, 0.008, 3, 3), '#ffffff', 0, 1.5, 0); const b = add(k, g, heartGeo(0.38, 0.2), gloss(['#ff4f96', '#ff9fc8', '#e8c26a', '#c86bff'][i % 4]), 0, 3.3, 0); hb.push([g, b, i]); }
  k.anim.push((t) => hb.forEach(([g, b, i]) => { b.position.y = 3.3 + Math.sin(t * 1.2 + i) * 0.15; g.rotation.y = Math.sin(t * 0.6 + i) * 0.5; g.rotation.z = Math.sin(t * 0.9 + i) * 0.05; }));
  twinkles(k, world, mobile ? 60 : 130, { area: 24, y: [2.5, 10], colors: ['#ffffff', '#ffe08a', '#ffb3e0'], size: 0.32 });
  return { features: ['指甲油瓶沙龍', '口紅大樓', '鏡球噴泉', '粉彩棕櫚', '粉紅地毯', '閃亮星光'], heroH: 9.3 };
}

// ================= 星光大道 =================
function hollywood({ k, world, pal, clear, mobile }) {
  const starTile = (rx, ry) => rep(canvas(128, 128, (g) => { g.fillStyle = '#3a3438'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#2a2428'; g.lineWidth = 4; g.strokeRect(2, 2, 124, 124); g.fillStyle = '#d97a8a'; g.strokeStyle = '#e8c26a'; g.lineWidth = 4; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 19 : 46; g.lineTo(64 + Math.cos(a) * r, 66 + Math.sin(a) * r); } g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#e8c26a'; g.beginPath(); g.arc(64, 68, 9, 0, TAU); g.fill(); }), rx, ry);
  ground(k, world, { color: '#8a8070', coreTex: starTile(7, 7), edge: '#e8c26a', edgeH: 0.2 });
  const gold = k.m('#e8c26a', { metalness: 0.7, roughness: 0.25 }), red = k.m('#b3122a', { roughness: 0.9 });
  // 前方的大馬路、星星人行道、開過去的加長禮車
  add(k, world, box(340, 0.02, 5.6), k.m('#2e2e34', { roughness: 0.9 }), 0, 0.01, 13.4, false);
  const dash = rep(canvas(128, 16, (g) => { g.fillStyle = '#f2c94c'; g.fillRect(0, 5, 70, 6); }), 60, 1); dash.wrapT = THREE.ClampToEdgeWrapping;
  const dl = add(k, world, new THREE.PlaneGeometry(340, 0.25), new THREE.MeshBasicMaterial({ map: dash, transparent: true }), 0, 0.03, 13.4, false); dl.rotation.x = -Math.PI / 2;
  for (const z of [9.7, 17.1]) add(k, world, box(340, 0.08, 1.8), new THREE.MeshStandardMaterial({ map: starTile(189, 1), roughness: 0.6 }), 0, 0.04, z, false);
  const car = (c, len) => { const g = grp(); world.add(g); add(k, g, box(1.6, 0.6, len), gloss2(k, c), 0, 0.55, 0); add(k, g, box(1.45, 0.45, len - 2.2), k.m('#1a1e26', { roughness: 0.1, metalness: 0.4 }), 0, 1.07, -0.2); for (const z of [-len / 2 + 0.8, len / 2 - 0.8]) for (const s of [-1, 1]) add(k, g, k.g('wheel', () => cyl(0.32, 0.32, 0.22, 12)), '#1a1a1a', s * 0.8, 0.32, z).rotation.z = Math.PI / 2; add(k, g, box(1.2, 0.12, 0.05), lit('#fff4d0', 1.5), 0, 0.6, len / 2 + 0.01, false); return g; };
  const limo = car('#f4f4f6', 6.4), conv = car('#c0392b', 3.8);
  k.anim.push((t) => { limo.position.set(-45 + (t * 3.2) % 90, 0, 12.2); limo.rotation.y = Math.PI / 2; conv.position.set(45 - (t * 4.4 + 30) % 90, 0, 14.7); conv.rotation.y = -Math.PI / 2; });
  // 紅地毯：馬路 → 廣場 → 主建築大門
  for (const [z0, z1] of [[HERO.z1 + 0.05, -1.0], [2.8, 10.6]]) add(k, world, box(1.7, 0.03, z1 - z0), red, 0, 0.145, (z0 + z1) / 2, false);
  const ropeM = k.m('#8a0f22', { roughness: 0.8 }), post = (p, x, z) => { add(k, p, cyl(0.06, 0.06, 0.95, 8), gold, x, 0.5, z); add(k, p, sph(0.1, 10, 8), gold, x, 1.0, z); add(k, p, cyl(0.2, 0.22, 0.06, 12), gold, x, 0.03, z); };
  for (const s of [-1, 1]) { const zs = [8.9, 9.8, 10.6]; zs.forEach(z => post(world, s * 1.25, z)); for (let i = 0; i < zs.length - 1; i++) rope(k, world, new THREE.Vector3(s * 1.25, 0.85, zs[i]), new THREE.Vector3(s * 1.25, 0.85, zs[i + 1]), 0.2, ropeM, 0.035); }
  // 狗仔隊的閃光燈
  const FP = []; for (const s of [-1, 1]) for (let i = 0; i < 4; i++) FP.push([s * (2.4 + (i % 2) * 0.7), 1.5 + (i % 2) * 0.2, 9.2 + i * 0.45]);
  const fl = new THREE.InstancedMesh(k.g('hflash', () => new THREE.IcosahedronGeometry(0.12, 1)), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), FP.length); world.add(fl);
  const fo = FP.map(() => k.rnd());
  k.anim.push((t) => { FP.forEach(([x, y, z], i) => { const u = (t * 0.6 + fo[i]) % 1, sc = u < 0.07 ? (1 - u / 0.07) * 2.6 : 0.001; D.position.set(x, y, z); D.rotation.set(0, 0, 0, 'XYZ'); D.scale.setScalar(sc); D.updateMatrix(); fl.setMatrixAt(i, D.matrix); }); fl.instanceMatrix.needsUpdate = true; });
  const spots = [{ x: 2.6, z: 9.0, y: 0.08, face: [0.5, 8.6], pose: 'stand' }, { x: -2.7, z: 9.6, y: 0.08, face: [-0.5, 9], pose: 'stand' }];

  // 劇院式沙龍（主建築）：裝飾藝術風立面、階梯式頂、直立霓虹招牌、跑馬燈雨棚、海報燈箱
  const h = grp(HX, 0.12, HZ); world.add(h);
  const deco = new THREE.MeshStandardMaterial({ map: rep(stripeTex('#f2e6cc', '#e6d8b8', 24), 3, 1), roughness: 0.6 }), FZ = 1.5;
  add(k, h, box(HW - 0.4, 5.6, 3.0), deco, 0, 2.8, 0);
  add(k, h, box(4.6, 1.0, 2.6), deco, 0, 6.1, -0.1); add(k, h, box(2.8, 0.9, 2.2), deco, 0, 7.05, -0.2);
  for (const [w, y] of [[HW - 0.2, 5.6], [4.8, 6.6], [3.0, 7.5]]) add(k, h, box(w, 0.14, 0.12), gold, 0, y, y > 6 ? (y > 7 ? 0.9 : 1.2) : FZ + 0.02);
  const vName = Array.from(TENANT.name || '').slice(0, 6);
  const bladeT = canvas(96, 384, (g, w, hh) => { g.fillStyle = '#b3122a'; g.fillRect(0, 0, w, hh); g.strokeStyle = '#e8c26a'; g.lineWidth = 8; g.strokeRect(6, 6, w - 12, hh - 12); g.fillStyle = '#fff4c4'; const fs = Math.min(64, (hh - 40) / Math.max(1, vName.length)); g.font = `800 ${fs}px "Noto Sans TC", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; vName.forEach((c, i) => g.fillText(c, w / 2, 20 + fs / 2 + i * ((hh - 40) / vName.length))); });
  add(k, h, box(1.0, 4.0, 0.3), [k.m('#b3122a'), k.m('#b3122a'), k.m('#b3122a'), k.m('#b3122a'), new THREE.MeshBasicMaterial({ map: bladeT, toneMapped: false }), k.m('#b3122a')], 0, 6.3, FZ + 0.35);
  add(k, h, box(HW - 0.6, 1.0, 1.5), k.m('#141018', { roughness: 0.3 }), 0, 3.5, FZ + 0.75);
  add(k, h, box(HW - 0.8, 0.05, 1.3), lit('#ffd9a0', k.night ? 1.6 : 0.6), 0, 2.98, FZ + 0.75, false);
  const sign = nameSign(k, 5.0, 0.7, '#fff8e6', '#b3122a'); sign.position.set(0, 3.5, FZ + 1.52); h.add(sign);
  const bA = [], bB = []; let bi = 0; const bulb = (x, y, z) => (bi++ % 2 ? bB : bA).push([x, y, z]);
  for (let x = -3.2; x <= 3.21; x += 0.27) { bulb(x, 4.05, FZ + 1.52); bulb(x, 2.95, FZ + 1.52); } for (const s of [-1, 1]) for (let z = FZ + 0.1; z < FZ + 1.5; z += 0.27) { bulb(s * 3.32, 4.05, z); bulb(s * 3.32, 2.95, z); }
  const bulbG = k.g('hbulb', () => sph(0.06, 8, 6)), mA = lit('#ffe9a8', 2.4), mB = lit('#ffe9a8', 0.2);
  inst(h, bulbG, mA, bA, null, false); inst(h, bulbG, mB, bB, null, false);
  k.anim.push((t) => { const on = Math.floor(t * 5) % 2; mA.emissiveIntensity = on ? 2.6 : 0.15; mB.emissiveIntensity = on ? 0.15 : 2.6; });
  for (const x of [-0.9, 0, 0.9]) { add(k, h, box(0.8, 2.2, 0.05), k.m('#2a2a35', { roughness: 0.1, metalness: 0.3 }), x, 1.1, FZ + 0.02); add(k, h, box(0.86, 0.06, 0.08), gold, x, 2.22, FZ + 0.05); }
  const posterT = (c1, c2) => canvas(64, 96, (g) => { const gr = g.createLinearGradient(0, 0, 0, 96); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.fillRect(0, 0, 64, 96); g.fillStyle = '#fff4c4'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 7 : 16; g.lineTo(32 + Math.cos(a) * r, 40 + Math.sin(a) * r); } g.fill(); g.fillRect(14, 70, 36, 5); g.fillRect(20, 80, 24, 4); });
  [[-2.4, '#3a2a6a', '#e0337a'], [2.4, '#0f4a6a', '#f2c94c']].forEach(([x, a, b]) => { add(k, h, box(1.1, 1.6, 0.06), new THREE.MeshStandardMaterial({ map: posterT(a, b), emissive: C('#ffffff'), emissiveMap: posterT(a, b), emissiveIntensity: k.night ? 0.9 : 0.25 }), x, 1.3, FZ + 0.03, false); add(k, h, box(1.24, 1.74, 0.05), gold, x, 1.3, FZ + 0.01); });
  for (const s of [-1, 1]) { const zs = [2.35, 2.35]; post(h, s * 2.3, 2.3); post(h, s * 3.3, 2.3); rope(k, h, new THREE.Vector3(s * 2.3, 0.85, 2.3), new THREE.Vector3(s * 3.3, 0.85, 2.3), 0.18, ropeM, 0.035); }
  // 探照燈（光柱在天空掃來掃去）
  const SL = [[-7.8, -13.5], [7.8, -13.5], [-14, -6], [14, -7]].filter(([x, z]) => clear(x, z, 1.4, 2.5));
  SL.forEach(([x, z], i) => { const g = grp(x, 0, z); world.add(g); add(k, g, box(1.4, 0.6, 2.0), '#4a4a55', 0, 0.55, 0); for (const s of [-1, 1]) add(k, g, cyl(0.3, 0.3, 0.2, 12), '#1a1a1a', s * 0.75, 0.3, 0).rotation.z = Math.PI / 2;
    const piv = grp(0, 1.5, 0); g.add(piv); piv.rotation.order = 'YXZ'; add(k, piv, cyl(0.55, 0.55, 0.9, 16), '#6a6a78', 0, 0, 0, { metalness: 0.6 }); add(k, piv, new THREE.CircleGeometry(0.5, 16), lit('#fffbe8', 3), 0, 0.46, 0, false).rotation.x = -Math.PI / 2;
    const L = 60, bg = new THREE.ConeGeometry(3.2, L, 20, 1, true); bg.rotateX(Math.PI); bg.translate(0, L / 2 + 0.4, 0); add(k, piv, bg, beamM('#fff6dc', k.night ? 0.12 : 0.09), 0, 0, 0, false);
    k.anim.push((t) => { piv.rotation.y = Math.sin(t * 0.25 + i * 1.3) * 0.9 + (x < 0 ? 0.4 : -0.4); piv.rotation.x = -0.35 - Math.sin(t * 0.33 + i) * 0.2; }); });
  // 棕櫚樹大道
  const pp = []; for (const s of [-1, 1]) for (let z = -14; z <= 6; z += 4.6) { const x = s * (11.2 + (Math.abs(z) % 3) * 0.3); if (clear(x, z, 1.2, 9.5)) pp.push([x, z, 1]); }
  palms(k, world, pp, { trunk: '#9a7a5a', leaves: ['#3f8a3a', '#4f9a45', '#2f7a3a'], h: 9 });
  // 山坡上的大字
  add(k, world, sph(40, 24, 12), k.m('#8a7a50', { flatShading: true }), 0, -4, -75, false).scale.y = 0.42;
  for (const [x, z, s] of [[-50, -70, 26], [52, -66, 24]]) add(k, world, cone(s, s * 0.6, 8), k.m('#9a8a62', { flatShading: true }), x, s * 0.3, z).castShadow = false;
  'STAR'.split('').forEach((ch, i) => { const x = -10.5 + i * 7, ys = 5.2 + (i % 2) * 0.6, z = -75 + Math.sqrt(Math.max(0, 1600 - x * x - ((ys + 4) / 0.42) ** 2));
    const t = canvas(128, 160, (g) => { g.fillStyle = '#ffffff'; g.font = '900 150px "Arial Black", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 64, 86); });
    const m = add(k, world, new THREE.PlaneGeometry(5.2, 6.5), new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }), x, ys + 2.8, z + 0.6, false); m.rotation.set(-0.3, (k.rnd() - 0.5) * 0.15, (k.rnd() - 0.5) * 0.08); });
  twinkles(k, world, mobile ? 40 : 80, { area: 22, y: [3, 14], colors: ['#fff4c4', '#ffffff'], size: 0.55 });
  return { spots, features: ['劇院沙龍', '星光步道', '紅地毯', '探照燈', '山坡大字', '加長禮車'], heroH: 8.6 };
}
const gloss2 = (k, c) => k.m(c, { roughness: 0.15, metalness: 0.35 });

// ================= 蝴蝶花園 =================
function butterfly({ k, world, pal, clear, mobile, layout }) {
  const pebble = rep(canvas(128, 128, (g) => { g.fillStyle = '#efe6d2'; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 70; i++) { g.fillStyle = ['#e2d6bc', '#f7f0e0', '#d9ccb0'][i % 3]; g.beginPath(); g.ellipse((i * 37) % 128, (i * 61) % 128, 5, 3.5, i, 0, TAU); g.fill(); } g.fillStyle = '#f4a8c8'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(64 + Math.cos(i) * 10, 64 + Math.sin(i) * 10, 6, 0, TAU); g.fill(); } g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(64, 64, 5, 0, TAU); g.fill(); }), 7, 7);
  ground(k, world, { color: '#76c062', coreTex: pebble, edge: '#f4a8c8', edgeH: 0.35 });
  // 蝴蝶翅膀（右翅往 +x，身體沿 z 軸）
  const wingG = k.g('wingR', () => { const s = new THREE.Shape(); s.moveTo(0, -0.15); s.bezierCurveTo(0.3, -1.0, 1.1, -1.05, 1.15, -0.55); s.bezierCurveTo(1.1, -0.2, 0.7, 0.0, 0.5, 0.05); s.bezierCurveTo(0.9, 0.3, 0.8, 0.85, 0.35, 0.8); s.bezierCurveTo(0.15, 0.7, 0.05, 0.4, 0, 0.2); s.lineTo(0, -0.15);
    const g = new THREE.ShapeGeometry(s, 10), p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 1.2, (p.getY(i) + 1.05) / 1.95); g.rotateX(-Math.PI / 2); return g; });
  const wingL = k.g('wingL', () => wingG.clone().scale(-1, 1, 1));
  const wingT = canvas(128, 128, (g) => { const P = (x, y) => [x / 1.2 * 128, (1 - (y + 1.05) / 1.95) * 128]; g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = '#2b1d24'; g.lineWidth = 9; g.beginPath(); g.moveTo(...P(0, -0.15)); g.bezierCurveTo(...P(0.3, -1.0), ...P(1.1, -1.05), ...P(1.15, -0.55)); g.bezierCurveTo(...P(1.1, -0.2), ...P(0.7, 0), ...P(0.5, 0.05)); g.bezierCurveTo(...P(0.9, 0.3), ...P(0.8, 0.85), ...P(0.35, 0.8)); g.stroke();
    g.lineWidth = 2.5; for (const [x, y] of [[1.0, -0.7], [0.8, -0.2], [0.6, 0.6], [0.3, -0.85]]) { g.beginPath(); g.moveTo(...P(0, 0)); g.lineTo(...P(x, y)); g.stroke(); }
    g.fillStyle = '#ffffff'; for (const [x, y] of [[1.05, -0.62], [0.95, -0.4], [0.7, 0.55], [0.5, 0.7]]) { const [a, b] = P(x, y); g.beginPath(); g.arc(a, b, 3, 0, TAU); g.fill(); } });
  const wingM = new THREE.MeshStandardMaterial({ map: wingT, side: THREE.DoubleSide, roughness: 0.6, emissive: C(k.night ? '#333333' : '#000000') });
  const BC = ['#ff8a3d', '#4fa8ff', '#ffd84a', '#ff6fb5', '#b48aff', '#7fe3c8', '#ffffff', hex(pal[0])];
  // 巨型花朵（花頭會點頭）
  const headG = (n) => k.g('fhead' + n, () => { const s = new THREE.Shape(); for (let i = 0; i <= 96; i++) { const a = i / 96 * TAU, r = 0.55 + 0.45 * Math.abs(Math.cos(a * n / 2)); const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? s.lineTo(x, y) : s.moveTo(x, y); } const g = new THREE.ShapeGeometry(s, 2); g.rotateX(-Math.PI / 2); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const d = Math.hypot(p.getX(i), p.getZ(i)); p.setY(i, d * d * 0.35); } g.computeVertexNormals(); return g; });
  const FL = [['#ff7ab0', '#ffd23f', 6], ['#ffffff', '#ffc61a', 10], ['#ffd23f', '#6b3a1e', 14], ['#b48aff', '#fff1a8', 5], ['#ff9a5a', '#ffe9a8', 8], ['#7fd0ff', '#ffffff', 6]];
  const nod = [], flowerC = [];
  const flower = (x, z, s, ti) => { const [pc, cc, n] = FL[ti % FL.length], g = grp(x, 0, z); g.scale.setScalar(s); world.add(g); const H = 3;
    add(k, g, k.g('fstem', () => cyl(0.07, 0.1, H, 6)), '#3f9a4f', 0, H / 2, 0);
    for (const sd of [-1, 1]) { const lf = add(k, g, k.g('fleaf', () => sph(0.5, 8, 6)), k.m('#4fae5b', { flatShading: true }), sd * 0.35, 0.9 + (sd > 0 ? 0.4 : 0), 0); lf.scale.set(1, 0.12, 0.38); lf.rotation.z = sd * 0.5; }
    const hd = grp(0, H, 0); g.add(hd); hd.rotation.x = 0.5; add(k, hd, headG(n), k.m(pc, { side: THREE.DoubleSide, roughness: 0.5 }), 0, 0, 0); add(k, hd, k.g('fctr', () => sph(0.3, 12, 8)), k.m(cc, { roughness: 0.7 }), 0, 0.05, 0).scale.y = 0.5;
    g.rotation.y = Math.atan2(-x, 4 - z); nod.push([hd, k.rnd() * 6]); flowerC.push([x, H * s + 0.4, z]); };
  const fp = scatter(k, clear, mobile ? 7 : 13, 10, 22, 6, 1.4, { front: false });
  fp.forEach(([x, z], i) => flower(x, z, 1.2 + k.rnd() * 0.9, i));
  ringOut(k, clear, mobile ? 4 : 7, 9.4, 13, 2.6, 0.8, (x, z) => { flower(x, z, 0.6 + k.rnd() * 0.3, Math.floor(k.rnd() * 6)); return 1; });
  k.anim.push((t) => nod.forEach(([hd, o]) => { hd.rotation.z = Math.sin(t * 0.8 + o) * 0.1; hd.rotation.x = 0.5 + Math.sin(t * 0.6 + o) * 0.08; }));
  // 花圃（廣場外圈）
  for (let i = 0; i < (mobile ? 6 : 10); i++) { const a = -2.7 + i * (5.4 / ((mobile ? 6 : 10) - 1)), r = CORE + 0.8, x = Math.sin(a) * r, z = Math.cos(a) * r; if (Math.abs(a) < 0.25) continue; flowerRow(k, world, x, z, 2.2, a + Math.PI / 2, ['#ff7ab0', '#ffd23f', '#ffffff', '#b48aff', '#ff9a5a'], { n: 9, stem: 0.22, size: 0.11 }).position.y = 0.02; }
  // 玻璃蝴蝶館（主建築）：六角玻璃館＋圓頂、屋頂上拍著翅膀的大蝴蝶、門廳
  const h = grp(HX, 0.12, HZ); world.add(h);
  const glassM = new THREE.MeshStandardMaterial({ color: 0xe8fbff, transparent: true, opacity: 0.26, roughness: 0.05, metalness: 0.2, depthWrite: false, side: THREE.DoubleSide });
  const frame = new THREE.LineBasicMaterial({ color: 0xffffff });
  const glass = (geo, x, y, z) => { const m = new THREE.Mesh(geo, glassM); m.position.set(x, y, z); h.add(m); const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 1), frame); e.position.copy(m.position); h.add(e); return m; };
  const hexG = cyl(3.1, 3.1, 3.0, 6, true).rotateY(Math.PI / 6).scale(1, 1, 0.62), domeG = new THREE.SphereGeometry(3.1, 6, 3, 0, TAU, 0, Math.PI / 2).rotateY(Math.PI / 6).scale(1, 0.75, 0.62);
  add(k, h, cyl(3.3, 3.35, 0.3, 6).rotateY(Math.PI / 6).scale(1, 1, 0.64), k.m('#e8e2d6'), 0, 0.15, -0.1);
  glass(hexG, 0, 1.8, -0.1); glass(domeG, 0, 3.3, -0.1);
  add(k, h, cyl(0.1, 0.1, 0.8, 8), '#ffffff', 0, 5.7, -0.1);
  for (let i = 0; i < 9; i++) add(k, h, k.g('bplant', () => new THREE.IcosahedronGeometry(0.5, 0)), k.m(i % 3 ? '#3f9a4f' : ['#ff7ab0', '#ffd23f', '#b48aff'][i % 3 === 0 ? (i / 3) % 3 : 0], { flatShading: true }), Math.cos(i * 2.4) * (0.6 + (i % 3) * 0.7), 0.6 + (i % 2) * 0.3, -0.1 + Math.sin(i * 2.4) * 0.7);
  add(k, h, cyl(0.15, 0.2, 2.6, 8), '#7a5236', 0, 1.6, -0.3); add(k, h, new THREE.IcosahedronGeometry(1.0, 0), k.m('#4f9a45', { flatShading: true }), 0, 3.0, -0.3);
  glass(box(1.8, 2.4, 1.0), 0, 1.5, 1.85); add(k, h, new THREE.TorusGeometry(0.9, 0.08, 6, 18, Math.PI), '#ffffff', 0, 2.7, 2.36); add(k, h, box(1.0, 1.9, 0.04), k.m('#2f6a4a', { roughness: 0.3 }), 0, 1.25, 2.34);
  const sign = nameSign(k, 2.6, 0.45, '#2f6a4a', '#ffffff'); sign.position.set(0, 3.05, 2.38); h.add(sign);
  const glassWT = canvas(128, 128, (g) => { const cells = ['#ff8a3d', '#ffd84a', '#ff6fb5', '#4fa8ff', '#b48aff', '#7fe3c8']; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = cells[(i * 3 + j * 5) % 6]; g.fillRect(i * 16, j * 16, 16, 16); } g.strokeStyle = '#2b1d24'; g.lineWidth = 3; for (let i = 0; i <= 128; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.moveTo(0, i); g.lineTo(128, i); g.stroke(); } });
  const bigW = new THREE.MeshStandardMaterial({ map: glassWT, side: THREE.DoubleSide, transparent: true, opacity: 0.92, roughness: 0.3, emissive: C('#ffffff'), emissiveMap: glassWT, emissiveIntensity: k.night ? 0.8 : 0.15 });
  const bf = grp(0, 6.2, 0.2); h.add(bf); bf.scale.setScalar(2.1); add(k, bf, k.g('bfbody', () => new THREE.CapsuleGeometry(0.08, 0.7, 4, 8)), '#2b1d24', 0, 0, 0).rotation.x = Math.PI / 2;
  const wr = add(k, bf, wingG, bigW, 0.04, 0, 0, false), wl = add(k, bf, wingL, bigW, -0.04, 0, 0, false);
  k.anim.push((t) => { const f = 0.3 + Math.sin(t * 1.6) * 0.32; wr.rotation.z = f; wl.rotation.z = -f; bf.position.y = 6.2 + Math.sin(t * 1.6) * 0.06; });
  bf.rotation.x = -0.25;
  // 噴泉（彩虹水霧）
  const [fx, fz] = [[-11.5, -3], [-11, 2], [11.5, -3], [-12.5, -8], [12, -8]].find(([x, z]) => clear(x, z, 2.6, 4)) || [99, 99], S = fx > 0 ? 1 : -1;
  if (fx < 99) { const stone = k.m('#e8e2d6', { roughness: 0.6 }); add(k, world, cyl(2.4, 2.6, 0.55, 28), stone, fx, 0.27, fz);
    const ft = rep(canvas(64, 64, (g) => { g.fillStyle = '#8fd3f4'; g.fillRect(0, 0, 64, 64); g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 2; for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(i * 8 + 2, 0); g.lineTo(i * 8 + 4, 64); g.stroke(); } }), 3, 1);
    const fm = new THREE.MeshStandardMaterial({ map: ft, transparent: true, opacity: 0.55, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false });
    add(k, world, cyl(2.25, 2.25, 0.04, 28), k.m('#7fc8e8', { roughness: 0.1 }), fx, 0.5, fz, false);
    add(k, world, cyl(0.3, 0.4, 1.8, 10), stone, fx, 1.3, fz); add(k, world, cyl(1.3, 0.5, 0.35, 20), stone, fx, 2.3, fz); add(k, world, cyl(0.2, 0.25, 0.9, 8), stone, fx, 2.8, fz); add(k, world, cyl(0.7, 0.3, 0.22, 16), stone, fx, 3.3, fz);
    add(k, world, cyl(1.3, 1.6, 1.9, 20, true), fm, fx, 1.5, fz, false); add(k, world, cyl(0.7, 0.9, 0.9, 16, true), fm, fx, 2.85, fz, false);
    k.anim.push((t) => { ft.offset.y = t * 0.8; });
    puffs(k, world, fx, 3.45, fz, { n: 4, color: 0xffffff, size: 0.3, rise: 0.8, speed: 0.5, opacity: 0.5 });
    ['#ff6b6b', '#ffa94d', '#ffe066', '#8ce99a', '#74c0fc', '#b197fc'].forEach((c, i) => { const r = add(k, world, new THREE.TorusGeometry(2.6 - i * 0.12, 0.06, 6, 40, Math.PI), new THREE.MeshBasicMaterial({ color: C(c), transparent: true, opacity: 0.45, depthWrite: false }), fx, 1.4, fz, false); r.rotation.y = Math.PI / 2 - 0.4; }); }
  // 睡蓮池
  const px = -S * 11, pz = 4.5;
  const pondS = new THREE.Shape(); for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU, r = 3.2 + Math.sin(a * 3) * 0.4 + Math.cos(a * 2) * 0.3; const x = Math.cos(a) * r * 1.2, y = Math.sin(a) * r; i ? pondS.lineTo(x, y) : pondS.moveTo(x, y); }
  const pt = rep(canvas(128, 128, (g) => { g.fillStyle = '#4fb0c8'; g.fillRect(0, 0, 128, 128); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; for (let i = 0; i < 10; i++) { g.beginPath(); for (let x = 0; x <= 128; x += 6) g.lineTo(x, i * 13 + Math.sin(x * 0.1 + i) * 3); g.stroke(); } }), 0.2, 0.2);
  const pond = add(k, world, new THREE.ShapeGeometry(pondS, 8), new THREE.MeshStandardMaterial({ map: pt, roughness: 0.1 }), px, 0.04, pz, false); pond.rotation.x = -Math.PI / 2; k.anim.push((t) => { pt.offset.set(t * 0.01, t * 0.015); });
  const rocks = []; for (let i = 0; i < 26; i++) { const a = i / 26 * TAU, r = 3.4 + Math.sin(a * 3) * 0.4 + Math.cos(a * 2) * 0.3; rocks.push([px + Math.cos(a) * r * 1.2, 0.08, pz - Math.sin(a) * r, [0.42, 0.25, 0.36], a]); }
  inst(world, k.g('prock', () => new THREE.DodecahedronGeometry(1, 0)), k.m('#b9b0a3', { flatShading: true }), rocks);
  const pads = []; for (let i = 0; i < 14; i++) { const a = k.rnd() * TAU, r = Math.sqrt(k.rnd()) * 2.4; pads.push([px + Math.cos(a) * r * 1.2, 0.06, pz + Math.sin(a) * r, 0.35 + k.rnd() * 0.25, k.rnd() * 6]); }
  inst(world, k.g('pad', () => new THREE.CircleGeometry(1, 14, 0.3, TAU - 0.6).rotateX(-Math.PI / 2)), k.m('#3f9a4f', { side: THREE.DoubleSide }), pads, null, false);
  pads.slice(0, 5).forEach(([x, , z], i) => { const lo = add(k, world, headG(8), k.m(i % 2 ? '#ffb3d1' : '#ffffff', { side: THREE.DoubleSide }), x, 0.1, z, false); lo.scale.setScalar(0.32); add(k, world, k.g('lotc', () => sph(0.07, 8, 6)), '#ffd23f', x, 0.14, z, false); });
  // 彩虹霧（遠方淡淡的彩虹＋粉彩水霧）
  ['#ff6b6b', '#ffa94d', '#ffe066', '#8ce99a', '#74c0fc', '#b197fc'].forEach((c, i) => { add(k, world, new THREE.TorusGeometry(34 - i * 1.0, 0.5, 6, 64, Math.PI), new THREE.MeshBasicMaterial({ color: C(c), transparent: true, opacity: 0.25, depthWrite: false, fog: false }), 0, -2, -48, false); });
  mist(k, world, mobile ? 5 : 9, { color: ['#ffd6ec', '#e6d8ff', '#d6fff0', '#fff0d6', '#d6f0ff'], area: [-22, 22, -20, 8], y: [1, 4], size: [8, 3], opacity: 0.4 });
  for (const [x, z] of [[-10.5, -11], [10.5, -11], [-15, -2], [15.5, 6]]) if (clear(x, z, 1, 2.5)) world.add(tree(k, x, z, 'blossom', 1.5));
  // 蝴蝶群（翅膀拍動，在花朵、溫室、廣場上空繞圈）
  const N = mobile ? 36 : 72, BR = new THREE.InstancedMesh(wingG, wingM, N), BL = new THREE.InstancedMesh(wingL, wingM, N), BB = new THREE.InstancedMesh(k.g('bbody', () => new THREE.CapsuleGeometry(0.05, 0.5, 3, 6)), k.m('#2b1d24'), N);
  const fly = [];
  for (let i = 0; i < N; i++) { const kind = i % 10; let c;
    if (kind < 4 && flowerC.length) { const f = flowerC[i % flowerC.length]; c = [f[0], f[1], f[2], 1.0, 0.8]; }
    else if (kind < 7) { const a = k.rnd() * TAU, r = 2 + k.rnd() * 4; c = [Math.sin(a) * r, 3 + k.rnd() * 2, Math.cos(a) * r, 2.5 + k.rnd() * 2, 2 + k.rnd() * 2]; }
    else if (kind < 9) c = [HX, 4.2 + k.rnd() * 2, HZ, 4.2, 2.8];
    else c = [px, 1.2, pz, 2.5, 2];
    const col = C(BC[i % BC.length]); BR.setColorAt(i, col); BL.setColorAt(i, col);
    fly.push({ c, sp: 0.25 + k.rnd() * 0.35, o: k.rnd() * TAU, s: (kind >= 4 && kind < 7 ? 0.28 : 0.4) + k.rnd() * 0.15 }); }
  [BR, BL, BB].forEach(m => { m.castShadow = false; world.add(m); });
  const P = new THREE.Vector3(), P2 = new THREE.Vector3();
  const pos = (f, t, out) => { const [cx, cy, cz, ax, az] = f.c, a = t * f.sp + f.o; return out.set(cx + Math.sin(a) * ax, cy + Math.sin(a * 2.3) * 0.5 + Math.sin(t * 6 + f.o) * 0.06, cz + Math.cos(a * 1.3) * az); };
  k.anim.push((t) => { fly.forEach((f, i) => { pos(f, t, P); pos(f, t + 0.05, P2); const yaw = Math.atan2(P2.x - P.x, P2.z - P.z), fl = 0.2 + Math.sin(t * 16 + f.o * 3) * 0.9;
    D.position.copy(P); D.scale.setScalar(f.s); D.rotation.set(0, yaw, fl, 'YZX'); D.updateMatrix(); BR.setMatrixAt(i, D.matrix); D.rotation.set(0, yaw, -fl, 'YZX'); D.updateMatrix(); BL.setMatrixAt(i, D.matrix); D.rotation.set(Math.PI / 2, yaw, 0, 'YXZ'); D.updateMatrix(); BB.setMatrixAt(i, D.matrix); });
    BR.instanceMatrix.needsUpdate = BL.instanceMatrix.needsUpdate = BB.instanceMatrix.needsUpdate = true; });
  const spots = [{ x: px + 4.6, z: pz + 0.5, y: 0.02, face: [px, pz], pose: 'crouch' }];
  return { spots, features: ['玻璃蝴蝶館', '飛舞蝴蝶', '巨型花朵', '彩虹水霧噴泉', '睡蓮池'], heroH: 7.4 };
}

export const WORLDS_E = {
  kiln: { id: 'kiln', kind: 'world', name: '陶瓷窯場', sky: { top: '#e8a878', bot: '#fbe8d4' }, cloud: '#fff0e4', build: kiln },
  crystal: { id: 'crystal', kind: 'world', name: '水晶礦洞', night: true, sky: { top: '#0d0a24', bot: '#2e1d52' }, build: crystal },
  lumber: { id: 'lumber', kind: 'world', name: '伐木場', sky: { top: '#7ab8e0', bot: '#eef4e8' }, hat: 'beanie', build: lumber },
  runway: { id: 'runway', kind: 'world', name: '時裝伸展台', sky: { top: '#7a5ab8', bot: '#ffd6e4' }, cloud: '#ffe6f2', build: runway },
  glam: { id: 'glam', kind: 'world', name: '粉紅美妝大道', sky: { top: '#ff9fcf', bot: '#ffeef6' }, cloud: '#ffe0f0', build: glam },
  hollywood: { id: 'hollywood', kind: 'world', name: '星光大道', sky: { top: '#2f4aa8', bot: '#ffb486' }, hat: 'sun', cloud: '#ffd8c0', build: hollywood },
  butterfly: { id: 'butterfly', kind: 'world', name: '蝴蝶花園', sky: { top: '#8fd3f4', bot: '#fff4fb' }, build: butterfly },
  dyevillage: { id: 'dyevillage', kind: 'world', name: '染布村', sky: { top: '#8fb4c8', bot: '#eef3ee' }, hat: 'straw', cloud: '#f4f7f6', build: dyevillage },
};
