// 主題世界（六）：泡泡浴樂園、電影片場、運動場、音樂祭舞台、美式郊區住宅、機器人工廠、賽車場、蜂巢花谷
import * as THREE from 'three';
import { puffs, tree } from './island-scenes.js';
import { TAU, C, hex, CORE, HERO, canvas, add, grp, box, cyl, sph, cone, gable, nameSign, windowMat, ground } from './island-worlds.js';

const HX = (HERO.x0 + HERO.x1) / 2, HZ = (HERO.z0 + HERO.z1) / 2, HW = HERO.x1 - HERO.x0, HD = HERO.z1 - HERO.z0;
function ringOut(k, clear, n, r0, r1, h, rad, make, { front = true } = {}) {
  let c = 0;
  for (let i = 0; i < n * 6 && c < n; i++) { const a = k.rnd() * TAU, r = r0 + k.rnd() * (r1 - r0), x = Math.sin(a) * r, z = Math.cos(a) * r; if (!front && z > 4) continue; if (!clear(x, z, rad, h)) continue; if (make(x, z, a)) c++; }
}
const stripeTex = (a, b, n = 8, v = true) => canvas(128, 128, (g, w, h) => { for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? b : a; if (v) g.fillRect(i * w / n, 0, w / n + 1, h); else g.fillRect(0, i * h / n, w, h / n + 1); } });
const rep = (t, x, y) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(x, y); return t; };
// 大量重複的小東西用 InstancedMesh（setI 設定第 i 個的位置、大小、旋轉）
const M4 = new THREE.Matrix4(), M4b = new THREE.Matrix4(), QQ = new THREE.Quaternion(), V3 = new THREE.Vector3(), S3 = new THREE.Vector3(), EU = new THREE.Euler();
function setI(im, i, x, y, z, sx = 1, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) { EU.set(rx, ry, rz); QQ.setFromEuler(EU); M4.compose(V3.set(x, y, z), QQ, S3.set(sx, sy, sz)); im.setMatrixAt(i, M4); }
function inst(parent, geo, mat, n, { cast = false, cull = true } = {}) { const m = new THREE.InstancedMesh(geo, mat, n); m.castShadow = cast; m.receiveShadow = true; m.frustumCulled = cull; parent.add(m); return m; }
const tint = (c = '#ffffff', o = {}) => new THREE.MeshStandardMaterial({ color: C(c), roughness: 0.8, ...o });
const hr = (a, b = 0, c = 0) => { const v = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return v - Math.floor(v); };
const faceY = (x, z, tx = 0, tz = 0) => Math.atan2(tx - x, tz - z);
const basic = (c, o = {}) => new THREE.MeshBasicMaterial({ color: C(c), toneMapped: false, ...o });
const beamMat = (c, o) => new THREE.MeshBasicMaterial({ color: C(c), transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
// 兩點之間的圓桿
function rod(k, parent, a, b, r, mat, seg = 8) {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length();
  const m = k.mesh(k.g('rod' + seg, () => cyl(1, 1, 1, seg)), mat && mat.isMaterial ? mat : k.m(mat));
  m.scale.set(r, len, r); m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); parent.add(m); return m;
}
// 會飄的旗子（左邊固定在旗桿上）
function flag(k, parent, w, h, mat, x, y, z, ry = 0, { amp = 0.12, speed = 5 } = {}) {
  const geo = new THREE.PlaneGeometry(w, h, 8, 2); geo.translate(w / 2, 0, 0);
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = true; parent.add(m);
  const p = geo.attributes.position, ph = k.rnd() * 6;
  k.anim.push((t) => { for (let i = 0; i < p.count; i++) { const u = p.getX(i) / w; p.setZ(i, Math.sin(u * 5 - t * speed + ph) * amp * u * w); } p.needsUpdate = true; geo.computeVertexNormals(); });
  return m;
}
// 一群小觀眾（身體＋頭，可以跳、可以排波浪）
function crowd(k, parent, pts, { s = 1, bounce = 0, wave = 0, cols } = {}) {
  const n = pts.length; if (!n) return null;
  const body = inst(parent, k.g('crowdB', () => cyl(0.13, 0.17, 0.52, 7).translate(0, 0.26, 0)), tint(), n, { cull: false });
  const head = inst(parent, k.g('crowdH', () => sph(0.12, 8, 6)), tint('#ffffff', { roughness: 0.7 }), n, { cull: false });
  const shirts = cols || ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6', '#ecf0f1', '#e67e22', '#1abc9c', '#34495e'], skins = ['#f1c9a5', '#e0ac85', '#c68a5e', '#8d5a3b', '#ffdcbf'];
  for (let i = 0; i < n; i++) { body.setColorAt(i, C(shirts[Math.floor(k.rnd() * shirts.length)])); head.setColorAt(i, C(skins[Math.floor(k.rnd() * skins.length)])); }
  const ph = pts.map(() => k.rnd() * TAU), lift = new Float32Array(n);
  const put = (t) => { for (let i = 0; i < n; i++) { const [x, y, z] = pts[i]; let b = 0; if (bounce) b = Math.max(0, Math.sin(t * 7 + ph[i])) * bounce; if (wave) b += Math.pow(Math.max(0, Math.sin(x * 0.22 - t * 1.8)), 8) * wave; lift[i] = b; setI(body, i, x, y + b, z, s); setI(head, i, x, y + b + 0.64 * s, z, s); } body.instanceMatrix.needsUpdate = head.instanceMatrix.needsUpdate = true; };
  put(0); if (bounce || wave) k.anim.push(put);
  return { lift };
}
// 彩虹肥皂泡：從 src(i, 第幾輪) 冒出來，往上飄、變大、破掉
function bubbles(k, parent, n, src, { rise = 4, size = 0.22, speed = 0.12, wob = 0.35 } = {}) {
  const mat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.34, roughness: 0.04, metalness: 0.1, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.3, iridescenceThicknessRange: [120, 480], emissive: C('#ffffff'), emissiveIntensity: 0.22, depthWrite: false });
  const im = inst(parent, k.g('bubble', () => sph(1, 16, 12)), mat, n, { cull: false });
  const tints = ['#ffb8e6', '#a8dcff', '#c4ffb0', '#fff0a0', '#d4c0ff'], sd = [], base = [], cyc = new Int32Array(n).fill(-99);
  for (let i = 0; i < n; i++) { im.setColorAt(i, C(tints[i % 5])); sd.push([k.rnd(), k.rnd() * TAU, 0.6 + k.rnd() * 0.8]); base.push([0, -50, 0]); }
  k.anim.push((t) => { for (let i = 0; i < n; i++) { const [ph, a, s] = sd[i]; const v = t * speed * (0.8 + s * 0.3) + ph, c = Math.floor(v), u = v - c; if (c !== cyc[i]) { cyc[i] = c; base[i] = src(i, c); } const [x, y, z] = base[i]; const sc = u > 0.95 ? 0 : size * s * Math.min(1, u * 8) * (u > 0.87 ? 1 + (u - 0.87) * 4 : 1); setI(im, i, x + Math.sin(u * 8 + a) * wob, y + u * rise, z + Math.cos(u * 6 + a) * wob, sc); } im.instanceMatrix.needsUpdate = true; });
  return im;
}
// 粒子（水花、火花、彩帶）：每顆的位置由 fn(i, t, out) 決定
function sprayPts(k, parent, n, color, size, fn, { opacity = 0.85, additive = false, colors = null } = {}) {
  const a = new Float32Array(n * 3), g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3));
  if (colors) { const c = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const q = C(colors[i % colors.length]); c[i * 3] = q.r; c[i * 3 + 1] = q.g; c[i * 3 + 2] = q.b; } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); }
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: colors ? 0xffffff : C(color), vertexColors: !!colors, size, transparent: true, opacity, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }));
  p.frustumCulled = false; parent.add(p); const o = [0, 0, 0];
  k.anim.push((t) => { for (let i = 0; i < n; i++) { fn(i, t, o); a[i * 3] = o[0]; a[i * 3 + 1] = o[1]; a[i * 3 + 2] = o[2]; } g.attributes.position.needsUpdate = true; });
  return p;
}
// 沿著路徑鋪一條帶子（跑道、賽道、路緣石）；offs 可給多條偏移
function ribbon(pts, offs, w, y) {
  const pos = [], uv = [], idx = []; let base = 0;
  for (const off of [].concat(offs)) { pts.forEach((p, i) => { const a = off - w / 2, b = off + w / 2; pos.push(p.x + p.nx * a, y, p.z + p.nz * a, p.x + p.nx * b, y, p.z + p.nz * b); uv.push(0, p.s, 1, p.s); if (i) { const j = base + i * 2; idx.push(j - 2, j - 1, j, j - 1, j + 1, j); } }); base += pts.length * 2; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
const flat = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.receiveShadow = true; return m; };
// 齒輪
function gearGeo(r, teeth, depth) {
  const s = new THREE.Shape(), n = teeth * 4;
  for (let i = 0; i < n; i++) { const a = i / n * TAU, rr = i % 4 < 2 ? r : r * 0.84; const x = Math.cos(a) * rr, y = Math.sin(a) * rr; if (i) s.lineTo(x, y); else s.moveTo(x, y); }
  s.closePath();
  const hole = (x, y, rr) => { const p = new THREE.Path(); p.absarc(x, y, rr, 0, TAU, true); s.holes.push(p); };
  hole(0, 0, r * 0.16); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; hole(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.17); }
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 10 }); g.translate(0, 0, -depth / 2); return g;
}

// ================= 泡泡浴樂園 =================
function bubblebath({ k, world, pal, clear, mobile }) {
  const tile = rep(canvas(256, 256, (g) => { const cs = ['#dff3ff', '#ffe4f2', '#fff7d6', '#e2f8ea']; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = cs[(i + j * 3) % 4]; g.fillRect(i * 32, j * 32, 32, 32); } g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.beginPath(); for (let i = 0; i <= 8; i++) { g.moveTo(i * 32, 0); g.lineTo(i * 32, 256); g.moveTo(0, i * 32); g.lineTo(256, i * 32); } g.stroke(); }), 6, 6);
  ground(k, world, { color: '#f3e3f7', coreTex: tile, edge: '#8fd0f5', edgeH: 0.35 });
  const foamM = tint('#ffffff', { roughness: 0.95, emissive: C('#ffffff'), emissiveIntensity: 0.18 }), foamG = k.g('foam', () => new THREE.IcosahedronGeometry(1, 2));
  // 泡沫山丘（一團一團的泡泡堆成的山）
  const blobs = [];
  for (const [x, z, s] of [[-24, -20, 5], [23, -23, 6], [-36, -6, 6], [37, -8, 6], [0, -38, 9], [-15, -33, 6], [17, -40, 8], [-46, -28, 9], [48, -26, 9], [-30, 12, 4], [33, 10, 4], [-21, -7, 3], [22, -8, 3]]) { const n = 6 + Math.floor(k.rnd() * 5); for (let i = 0; i < n; i++) { const a = k.rnd() * TAU, d = k.rnd() * s, r = s * (0.35 + k.rnd() * 0.45); blobs.push([x + Math.sin(a) * d, r * 0.2, z + Math.cos(a) * d * 0.7, r]); } }
  const hills = inst(world, foamG, foamM, blobs.length); const fT = ['#ffffff', '#fdf0ff', '#eef9ff', '#fffbea'];
  blobs.forEach(([x, y, z, r], i) => { setI(hills, i, x, y, z, r, r * 0.75, r); hills.setColorAt(i, C(fT[i % 4])); });
  // 巨型浴缸（主建築）：磁磚浴場底座、粉紅貓腳浴缸、滿出來的泡泡、水龍頭、大蓮蓬頭
  const h = grp(HX, 0.12, HZ); world.add(h);
  const bt = rep(canvas(128, 128, (g) => { g.fillStyle = '#a6dcf4'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#ffffff'; g.lineWidth = 4; g.beginPath(); for (let i = 0; i <= 4; i++) { g.moveTo(i * 32, 0); g.lineTo(i * 32, 128); g.moveTo(0, i * 32); g.lineTo(128, i * 32); } g.stroke(); }), 5, 1.6);
  const BH = 2.1, BT = BH + 0.16, TY = 4.25, fz = (HD - 0.2) / 2;
  add(k, h, box(HW - 0.2, BH, HD - 0.2), new THREE.MeshStandardMaterial({ map: bt, roughness: 0.35 }), 0, BH / 2, 0);
  add(k, h, box(HW, 0.16, HD), '#ffffff', 0, BH + 0.08, 0);
  add(k, h, box(1.1, 1.15, 0.06), '#ff8fb8', 0, 0.575, fz + 0.01); add(k, h, new THREE.CircleGeometry(0.55, 20, 0, Math.PI), k.m('#ff8fb8'), 0, 1.15, fz + 0.04);
  const port = k.night ? k.glow('#bfe8ff', 1.6) : k.m('#e8f7ff', { roughness: 0.1 });
  for (const x of [-2.5, -1.4, 1.4, 2.5]) { add(k, h, new THREE.CircleGeometry(0.33, 20), port, x, 1.1, fz + 0.02, false); add(k, h, k.g('porthole', () => new THREE.TorusGeometry(0.35, 0.06, 6, 20)), '#ffffff', x, 1.1, fz + 0.03); }
  const half = k.g('tubHalf', () => new THREE.SphereGeometry(1, 40, 14, 0, TAU, Math.PI / 2, Math.PI / 2));
  add(k, h, half, k.m('#ff9cc6', { roughness: 0.3 }), 0, TY, -0.1).scale.set(3.3, 1.6, 1.8);
  add(k, h, half, k.m('#ffffff', { roughness: 0.2, side: THREE.BackSide }), 0, TY, -0.1).scale.set(3.22, 1.55, 1.72);
  const rp = []; for (let i = 0; i < 48; i++) { const a = i / 48 * TAU; rp.push(new THREE.Vector3(Math.cos(a) * 3.26, 0, Math.sin(a) * 1.76)); }
  add(k, h, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rp, true), 72, 0.14, 8, true), k.m('#ffffff', { roughness: 0.25 }), 0, TY, -0.1);
  const gold = k.m('#f0c04a', { metalness: 0.7, roughness: 0.3 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { add(k, h, k.g('claw', () => cone(0.26, 0.9, 8)), gold, sx * 2.3, BT + 0.7, sz * 0.8 - 0.1).rotation.x = Math.PI; add(k, h, k.g('clawB', () => sph(0.2, 10, 8)), gold, sx * 2.3, BT + 0.18, sz * 0.8 - 0.1); }
  // 水龍頭與水流
  add(k, h, cyl(0.12, 0.12, 3.6, 10), gold, 3.55, BT + 1.8, -0.1);
  add(k, h, cyl(0.1, 0.1, 1.0, 10), gold, 3.1, BT + 3.5, -0.1).rotation.z = Math.PI / 2;
  for (const sz of [-1, 1]) add(k, h, box(0.08, 0.08, 0.5), gold, 3.55, BT + 2.9, -0.1 + sz * 0.25);
  const wt = rep(canvas(32, 64, (g) => { g.fillStyle = '#bfe9ff'; g.fillRect(0, 0, 32, 64); g.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 4; i++) g.fillRect(i * 8 + 2, (i * 17) % 64, 3, 22); }), 1, 2);
  add(k, h, cyl(0.07, 0.09, 0.9, 8, true), new THREE.MeshStandardMaterial({ map: wt, transparent: true, opacity: 0.8, roughness: 0.05 }), 2.62, BT + 3.0, -0.1, false);
  k.anim.push((t) => { wt.offset.y = t * 1.5; });
  // 大蓮蓬頭（從浴缸後面伸出來）
  const HPx = -1.7, HPy = BT + 5.6, HPz = -0.8;
  add(k, h, cyl(0.1, 0.1, 5.9, 10), gold, -3.0, BT + 2.95, -1.55);
  rod(k, h, [-3.0, BT + 5.9, -1.55], [HPx, HPy + 0.2, HPz], 0.08, gold);
  add(k, h, cone(0.55, 0.32, 20), gold, HPx, HPy, HPz);
  add(k, h, new THREE.CircleGeometry(0.5, 20), k.m('#dff4ff'), HPx, HPy - 0.17, HPz, false).rotation.x = Math.PI / 2;
  sprayPts(k, h, mobile ? 40 : 80, '#bfe9ff', 0.09, (i, t, o) => { const u = (t * 0.9 + i * 0.0913) % 1, a = i * 2.39, r = 0.12 + (i % 5) * 0.08 + u * 0.5; o[0] = HPx + Math.cos(a) * r; o[1] = HPy - 0.2 - u * (HPy - TY - 0.9); o[2] = HPz + Math.sin(a) * r; });
  // 滿出來的泡泡（一直在呼吸）
  const fo = [];
  for (let i = 0; i < 30; i++) { const a = k.rnd() * TAU, d = Math.sqrt(k.rnd()); fo.push([Math.cos(a) * d * 2.7, TY + 0.15 + k.rnd() * 0.45 - d * 0.3, Math.sin(a) * d * 1.3 - 0.1, 0.4 + k.rnd() * 0.35]); }
  for (const x of [-3.05, -2.6, 2.6, 3.0]) fo.push([x, TY - 0.25 - k.rnd() * 0.4, 1.0 + k.rnd() * 0.3, 0.3 + k.rnd() * 0.15]);
  
  const foamTub = inst(h, k.g('foamS', () => new THREE.IcosahedronGeometry(1, 1)), foamM, fo.length, { cull: false });
  k.anim.push((t) => { fo.forEach(([x, y, z, r], i) => setI(foamTub, i, x, y + Math.sin(t * 1.1 + i * 0.7) * 0.04, z, r * (1 + Math.sin(t * 1.6 + i) * 0.06))); foamTub.instanceMatrix.needsUpdate = true; });
  const sign = nameSign(k, 4.2, 0.62, '#ff6fa8'); sign.position.set(0, TY - 0.72, 1.75); h.add(sign);
  for (const sx of [-1.6, 1.6]) rod(k, h, [sx, TY, 1.62], [sx, TY - 0.42, 1.75], 0.025, gold, 5);
  // 小鴨泳池（小鴨繞圈、上下浮動）＋蓮蓬頭噴泉
  const wt2 = rep(canvas(128, 128, (g) => { g.fillStyle = '#7fd3f5'; g.fillRect(0, 0, 128, 128); g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 2; for (let i = 0; i < 10; i++) { g.beginPath(); for (let x = 0; x <= 128; x += 8) g.lineTo(x, i * 13 + Math.sin(x * 0.1 + i) * 3); g.stroke(); } }), 2, 2);
  const waterM = new THREE.MeshStandardMaterial({ map: wt2, roughness: 0.1, emissive: C(k.night ? '#2a6f8f' : '#000000') });
  k.anim.push((t) => wt2.offset.set(t * 0.02, t * 0.035));
  const pool = (x, z, r, rim) => { add(k, world, cyl(r + 0.3, r + 0.4, 0.5, 40), rim, x, 0.25, z, { roughness: 0.3 }); add(k, world, new THREE.CircleGeometry(r, 40), waterM, x, 0.51, z, false).rotation.x = -Math.PI / 2; };
  const yel = k.m('#ffd23f', { roughness: 0.35 }), ora = k.m('#ff8a1f', { roughness: 0.4 }), blk = k.m('#1d1d1d');
  const duck = (s) => { const g = new THREE.Group(); g.scale.setScalar(s);
    add(k, g, k.g('dkB', () => sph(0.5, 16, 12).scale(1, 0.72, 1.25)), yel, 0, 0.25, 0);
    add(k, g, k.g('dkH', () => sph(0.32, 14, 10)), yel, 0, 0.78, 0.38);
    add(k, g, k.g('dkK', () => cone(0.13, 0.3, 10).rotateX(Math.PI / 2)), ora, 0, 0.72, 0.72);
    add(k, g, k.g('dkT', () => cone(0.18, 0.35, 8)), yel, 0, 0.55, -0.6).rotation.x = -0.9;
    if (s > 1 || !mobile) for (const sx of [-1, 1]) add(k, g, k.g('dkE', () => sph(0.05, 8, 6)), blk, sx * 0.16, 0.86, 0.64, false);
    return g; };
  const pools = [[-12.5, -1.5, 2.8], [12.6, -0.5, 2.8], [12.5, -12.5, 2.6]], ducks = [], rims = ['#ffffff', '#ffd6ea', '#d4f0ff'];
  pools.forEach(([x, z, r], pi) => { pool(x, z, r, rims[pi]);
    for (let i = 0; i < 3; i++) { const d = duck(0.55 + i * 0.12); world.add(d); ducks.push({ d, x, z, r: 0.7 + i * 0.65, sp: (0.3 + k.rnd() * 0.3) * (i % 2 ? 1 : -1), ph: k.rnd() * TAU }); }
    const L = Math.hypot(x, z), dx = x / L, dz = z / L, px = x + dx * (r + 0.3), pz = z + dz * (r + 0.3);
    if (!clear(px, pz, 0.6, 3.6)) return;
    const hx = x + dx * r * 0.35, hz = z + dz * r * 0.35;
    add(k, world, cyl(0.1, 0.12, 3.3, 10), gold, px, 1.65, pz); rod(k, world, [px, 3.3, pz], [hx, 3.3, hz], 0.08, gold); add(k, world, cone(0.42, 0.26, 16), gold, hx, 3.12, hz);
    sprayPts(k, world, mobile ? 24 : 48, '#c5ecff', 0.09, (i, t, o) => { const u = (t * 1.1 + i * 0.137) % 1, a = i * 2.39, rr = 0.1 + u * (0.4 + (i % 3) * 0.25); o[0] = hx + Math.cos(a) * rr; o[1] = 3.0 - u * 2.5; o[2] = hz + Math.sin(a) * rr; }); });
  k.anim.push((t) => ducks.forEach(({ d, x, z, r, sp, ph }, i) => { const a = t * sp + ph; d.position.set(x + Math.sin(a) * r, 0.48 + Math.sin(t * 2.2 + i) * 0.04, z + Math.cos(a) * r); d.rotation.y = Math.atan2(Math.cos(a) * sp, -Math.sin(a) * sp); d.rotation.z = Math.sin(t * 1.7 + i) * 0.08; }));
  // 巨型小鴨
  const GX = -15, GZ = -14;
  if (clear(GX, GZ, 5, 4.5)) { pool(GX, GZ, 4.8, '#fff3b0'); pools.push([GX, GZ, 4.8]); const gd = duck(3.0); world.add(gd); gd.position.set(GX, 0.35, GZ);
    k.anim.push((t) => { gd.position.y = 0.3 + Math.sin(t * 1.1) * 0.08; gd.rotation.y = faceY(GX, GZ, 0, 8) + Math.sin(t * 0.4) * 0.25; gd.rotation.z = Math.sin(t * 0.9) * 0.04; }); }
  // 到處飄的彩虹泡泡
  const tubW = [HX, 0.12 + TY + 0.8, HZ - 0.1];
  bubbles(k, world, mobile ? 36 : 72, (i, c) => { if (hr(i, c) < 0.45) return [tubW[0] + (hr(i, c, 1) - 0.5) * 5.5, tubW[1], tubW[2] + (hr(i, c, 2) - 0.5) * 2.5]; const p = pools[Math.floor(hr(i, c, 3) * pools.length) % pools.length]; return [p[0] + (hr(i, c, 4) - 0.5) * p[2], 0.7, p[1] + (hr(i, c, 5) - 0.5) * p[2]]; }, { rise: 6, size: 0.3, speed: 0.1, wob: 0.5 });
  // 巨型肥皂、洗毛精瓶、毛巾堆、泡泡路燈
  const pastel = ['#ffc4dd', '#c4e6ff', '#d9f7c4', '#fff0b3', '#e3d4ff'];
  ringOut(k, clear, mobile ? 3 : 6, 10.5, 20, 1.2, 1.3, (x, z) => { const g = grp(x, 0, z); g.rotation.y = k.rnd() * TAU; add(k, g, box(2.2, 0.8, 1.3), pastel[Math.floor(k.rnd() * 5)], 0, 0.4, 0, { roughness: 0.35 }); add(k, g, foamG, foamM, 0.5, 0.85, 0.2).scale.setScalar(0.3); world.add(g); return 1; }, { front: false });
  ringOut(k, clear, mobile ? 3 : 5, 11, 22, 3.2, 0.8, (x, z) => { const g = grp(x, 0, z); const c = pastel[Math.floor(k.rnd() * 5)]; add(k, g, cyl(0.55, 0.6, 2.4, 16), c, 0, 1.2, 0, { roughness: 0.3 }); add(k, g, box(0.9, 0.8, 0.05), '#ffffff', 0, 1.2, 0.58); add(k, g, cyl(0.3, 0.3, 0.3, 12), '#ffffff', 0, 2.55, 0); add(k, g, box(0.12, 0.35, 0.12), '#ffffff', 0, 2.85, 0); add(k, g, box(0.5, 0.1, 0.12), '#ffffff', 0.2, 3.0, 0); g.rotation.y = faceY(x, z); world.add(g); return 1; }, { front: false });
  for (const sx of [-1, 1]) { const g = grp(sx * 5.2, 0.12, -9.6); for (let i = 0; i < 3; i++) add(k, g, box(1.2, 0.3, 0.8), new THREE.MeshStandardMaterial({ map: stripeTex(pastel[(i + (sx > 0 ? 2 : 0)) % 5], '#ffffff', 6, false) }), 0, 0.15 + i * 0.3, 0).rotation.y = i * 0.15; world.add(g); }
  const lampM = k.night ? k.glow('#ffe9ff', 1.8) : new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, roughness: 0.05, iridescence: 1 });
  for (const a of [0.95, -0.95, 1.75, -1.75, 2.5, -2.5]) { const x = Math.sin(a) * 9.4, z = Math.cos(a) * 9.4; if (!clear(x, z, 0.4, 2.8)) continue; add(k, world, cyl(0.05, 0.07, 2.4, 6), '#ffffff', x, 1.2, z); add(k, world, sph(0.34, 16, 12), lampM, x, 2.65, z); }
  const spots = [{ x: GX + 5.6, z: GZ + 1.2, face: [GX, GZ], pose: 'stand' }, { x: -12.5 + 3.5, z: -1.5, face: [-12.5, -1.5], pose: 'crouch' }, { x: 12.6 - 3.5, z: -1.2, face: [12.6, -0.5], pose: 'stand' }];
  return { spots, dogs: mobile ? 2 : 4, features: ['巨型浴缸', '彩虹泡泡', '小鴨泳池', '蓮蓬頭噴泉', '泡沫山丘', '巨型小鴨'], heroH: 8.6 };
}

// ================= 電影片場 =================
function filmset({ k, world, pal, clear, mobile, layout }) {
  const conc = canvas(512, 512, (g) => { g.fillStyle = '#d2cec6'; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(0,0,0,${0.025 + hr(i) * 0.04})`; g.fillRect(hr(i, 1) * 512, hr(i, 2) * 512, 3, 3); }
    const tape = (x, y, c, r) => { g.save(); g.translate(x, y); g.rotate(r); g.fillStyle = c; g.fillRect(-15, -3, 30, 6); g.fillRect(-3, -15, 6, 30); g.restore(); };
    [[170, 300, '#ff4a4a', 0.4], [350, 210, '#3aa0ff', 0.1], [300, 390, '#ffd23f', 0.8], [210, 170, '#3ad17a', 0.3], [400, 330, '#ff4a4a', 0.6], [130, 210, '#ffd23f', 0.2]].forEach(a => tape(...a));
    g.strokeStyle = '#f2c230'; g.lineWidth = 7; g.setLineDash([26, 16]); g.beginPath(); g.arc(256, 256, 238, 0, TAU); g.stroke(); });
  ground(k, world, { color: '#8a8782', coreTex: conc, edge: '#2b2b2e', edgeH: 0.2 });
  const numMat = (n) => new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.6, map: canvas(256, 256, (g) => { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(128, 128, 122, 0, TAU); g.fill(); g.lineWidth = 12; g.strokeStyle = '#1d1d1f'; g.stroke(); g.fillStyle = '#c0392b'; g.font = '900 170px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(n, 128, 140); }) });
  // 攝影棚（主建築）：波浪鐵皮牆、圓拱屋頂、大大的棚號、半開的大門、錄影中燈號
  const h = grp(HX, 0.12, HZ); world.add(h);
  const corr = rep(canvas(256, 128, (g) => { g.fillStyle = '#e4d8c0'; g.fillRect(0, 0, 256, 128); for (let x = 0; x < 256; x += 8) { g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(x, 0, 3, 128); } }), 4, 2);
  const wallM = new THREE.MeshStandardMaterial({ map: corr, roughness: 0.85 }), roofM = k.m('#6f7f78', { roughness: 0.6, metalness: 0.2 }), WH = 4.4;
  add(k, h, box(HW, WH, HD), wallM, 0, WH / 2, 0);
  const arc = new THREE.Shape(); arc.moveTo(-HW / 2 - 0.15, 0); arc.absellipse(0, 0, HW / 2 + 0.15, 2.3, Math.PI, 0, true); arc.lineTo(-HW / 2 - 0.15, 0);
  const rg = new THREE.ExtrudeGeometry(arc, { depth: HD + 0.3, bevelEnabled: false, curveSegments: 24 }); rg.translate(0, 0, -(HD + 0.3) / 2);
  add(k, h, rg, [k.m('#e4d8c0'), roofM], 0, WH, 0);
  add(k, h, new THREE.CircleGeometry(0.95, 32), numMat('7'), 0, WH + 1.05, HD / 2 + 0.17, false);
  add(k, h, box(2.8, 3.3, 0.05), '#121316', 0, 1.65, HD / 2 + 0.01);
  const doorT = canvas(128, 160, (g) => { g.fillStyle = '#b8433a'; g.fillRect(0, 0, 128, 160); for (let y = 0; y < 160; y += 10) { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, y, 128, 3); } g.fillStyle = '#fff'; g.font = '900 96px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('7', 64, 86); });
  add(k, h, box(2.6, 3.5, 0.1), new THREE.MeshStandardMaterial({ map: doorT, roughness: 0.6 }), -2.2, 1.75, HD / 2 + 0.1);
  add(k, h, box(HW, 0.12, 0.14), '#3a3d42', 0, 3.55, HD / 2 + 0.12);
  const sign = nameSign(k, 4.0, 0.6, '#1d1d1f', '#f2c230'); sign.position.set(0.4, 3.95, HD / 2 + 0.06); h.add(sign);
  const recT = canvas(128, 48, (g) => { g.fillStyle = '#2a0b0b'; g.fillRect(0, 0, 128, 48); g.fillStyle = '#ff3b3b'; g.font = '800 30px "Noto Sans TC", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('● 錄影中', 64, 26); });
  const recM = new THREE.MeshBasicMaterial({ map: recT, toneMapped: false }); add(k, h, box(1.1, 0.4, 0.08), recM, 2.55, 2.7, HD / 2 + 0.05, false);
  k.anim.push((t) => { recM.color.setScalar(Math.sin(t * 4) > 0 ? 1 : 0.3); });
  for (const x of [-2.9, 2.9]) add(k, h, box(0.9, 0.6, 0.5), '#b9bec4', x, WH + 0.3 + (x > 0 ? 0 : 0.1), -0.6);
  if (k.night) { const l = new THREE.PointLight(0xffd9a0, 5, 9); l.position.set(0, 3.2, HD / 2 + 1.6); h.add(l); }
  // 遠方的其他攝影棚、片場水塔
  [[-19, -34, '3'], [0, -40, '5'], [19, -34, '9']].forEach(([x, z, n]) => { const g = grp(x, 0, z); g.rotation.y = faceY(x, z); world.add(g);
    add(k, g, box(10, 4.6, 8), wallM, 0, 2.3, 0); add(k, g, rg, [k.m('#e4d8c0'), roofM], 0, 4.6, 0).scale.set(10.3 / (HW + 0.3), 1.1, 8.3 / (HD + 0.3)); add(k, g, new THREE.CircleGeometry(1.1, 32), numMat(n), 0, 3.3, 4.05, false); });
  if (clear(-23, -14, 2.5, 13)) { const g = grp(-23, 0, -14); world.add(g); for (const [x, z] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) add(k, g, cyl(0.12, 0.15, 9, 6), '#6b6f75', x, 4.5, z);
    add(k, g, cyl(2.3, 2.3, 3.2, 20), k.m('#9aa4ad', { metalness: 0.4, roughness: 0.5 }), 0, 10.6, 0); add(k, g, cone(2.5, 1.4, 20), '#7d868f', 0, 12.9, 0);
    const bt = canvas(512, 64, (q) => { q.fillStyle = '#1f3a5a'; q.fillRect(0, 0, 512, 64); q.fillStyle = '#ffffff'; q.font = '900 40px "Noto Sans TC", sans-serif'; q.textAlign = 'center'; q.textBaseline = 'middle'; for (let i = 0; i < 2; i++) q.fillText('電影片場', 128 + i * 256, 34); });
    add(k, g, cyl(2.33, 2.33, 0.9, 24, true), new THREE.MeshStandardMaterial({ map: bt, side: THREE.DoubleSide }), 0, 10.6, 0); }
  // 西部小鎮佈景（只有門面，後面用木條撐著）
  const plank = (c) => new THREE.MeshStandardMaterial({ roughness: 0.9, map: rep(canvas(64, 64, (g) => { g.fillStyle = c; g.fillRect(0, 0, 64, 64); g.fillStyle = 'rgba(0,0,0,.2)'; for (let y = 0; y < 64; y += 8) g.fillRect(0, y, 64, 1.5); }), 2, 3) });
  const words = ['酒館', '警長', '雜貨', '旅店'], woods = ['#a0643a', '#c9a06b', '#8a5a3a', '#b5835a'], swing = [];
  for (let i = 0; i < 4; i++) { const x = -18.5 + i * 3.6, z = -15 + i * 0.5, w = 3.3, hh = 4 + (i % 2) * 1.2; if (!clear(x, z, 2, hh)) continue;
    const g = grp(x, 0, z); g.rotation.y = 0.3; world.add(g);
    add(k, g, box(w, hh, 0.18), plank(woods[i]), 0, hh / 2, 0); add(k, g, box(w + 0.2, 0.22, 0.3), '#5a3d2b', 0, hh, 0.02);
    const st = canvas(256, 64, (q) => { q.fillStyle = '#f2e3c2'; q.fillRect(0, 0, 256, 64); q.fillStyle = '#5a2a12'; q.font = '800 44px "Noto Serif TC", serif'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText(words[i], 128, 34); });
    add(k, g, box(w * 0.75, 0.6, 0.05), new THREE.MeshStandardMaterial({ map: st }), 0, hh - 0.7, 0.12);
    add(k, g, box(0.9, 1.7, 0.05), '#3a2418', 0, 0.85, 0.1);
    for (const sx of [-1, 1]) add(k, g, box(0.7, 0.75, 0.05), k.night ? k.glow('#ffc46b', 1.4) : k.m('#2b3440'), sx * 1.05, 1.5, 0.1);
    add(k, g, box(w, 0.08, 1.2), '#6b4a35', 0, 2.35, 0.65).rotation.x = 0.12; for (const sx of [-1, 1]) add(k, g, box(0.1, 2.3, 0.1), '#6b4a35', sx * (w / 2 - 0.15), 1.15, 1.2);
    for (const sx of [-1, 1]) rod(k, g, [sx * 1.1, hh * 0.75, -0.1], [sx * 1.1, 0, -2.0], 0.07, '#7a5236', 5);
    if (i === 0) for (const sx of [-1, 1]) { const p = grp(sx * 0.45, 0.9, 0.2); g.add(p); add(k, p, box(0.43, 0.7, 0.04), '#c9a06b', -sx * 0.215, 0, 0); swing.push([p, sx]); } }
  k.anim.push((t) => swing.forEach(([p, sx]) => { p.rotation.y = sx * Math.max(0, Math.sin(t * 1.4)) * 0.7; }));
  for (const [x, z] of [[-14.8, -11.6], [-14.1, -11.2], [-8.6, -11.4]]) if (clear(x, z, 0.4, 1)) add(k, world, cyl(0.35, 0.35, 0.8, 12), '#7a5236', x, 0.4, z);
  if (clear(-20.5, -10.5, 1, 3)) { add(k, world, cyl(0.3, 0.34, 2.8, 8), '#3f8a4a', -20.5, 1.4, -10.5); rod(k, world, [-20.5, 1.4, -10.5], [-19.7, 1.9, -10.5], 0.18, '#3f8a4a'); rod(k, world, [-19.7, 1.9, -10.5], [-19.7, 2.6, -10.5], 0.18, '#3f8a4a'); rod(k, world, [-20.5, 1.8, -10.5], [-21.2, 2.2, -10.5], 0.16, '#3f8a4a'); }
  // 攝影機吊臂（鏡頭會掃過整個片場）
  const filmCam = (g) => { add(k, g, box(0.5, 0.5, 0.9), '#1d1d1f', 0, 0, 0); add(k, g, cyl(0.16, 0.2, 0.4, 12), '#2b2b2e', 0, 0, 0.62).rotation.x = Math.PI / 2; add(k, g, new THREE.CircleGeometry(0.15, 12), k.m('#6fa8ff', { metalness: 0.6, roughness: 0.1 }), 0, 0, 0.83, false);
    const reels = []; for (const z of [-0.25, 0.2]) { const r = add(k, g, k.g('reel', () => cyl(0.32, 0.32, 0.08, 16)), '#3a3d42', 0, 0.55, z); r.rotation.z = Math.PI / 2; reels.push(r); } return reels; };
  const reels = [];
  if (clear(-12.5, -11.5, 1.6, 6)) { const cr = grp(-12.5, 0, -11.5); world.add(cr);
    add(k, cr, box(2.2, 0.45, 1.6), '#2b2d31', 0, 0.45, 0); for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(k, cr, cyl(0.25, 0.25, 0.2, 12), '#111111', sx * 0.9, 0.25, sz * 0.75).rotation.x = Math.PI / 2;
    add(k, cr, cyl(0.2, 0.28, 2.8, 10), '#3a3d42', 0, 2.05, 0);
    const yaw = grp(0, 3.45, 0); cr.add(yaw); const boom = grp(); yaw.add(boom);
    add(k, boom, box(0.28, 0.28, 9), '#f2c230', 0, 0, 2.5); add(k, boom, box(0.7, 0.7, 0.9), '#2b2d31', 0, 0, -2.2);
    const cam = grp(0, -0.35, 7); boom.add(cam); reels.push(...filmCam(cam));
    const base = faceY(-12.5, -11.5, -3, -4.5);
    k.anim.push((t) => { yaw.rotation.y = base + Math.sin(t * 0.32) * 0.45; boom.rotation.x = -0.2 + Math.sin(t * 0.5) * 0.12; cam.rotation.x = -boom.rotation.x + 0.3; }); }
  // 腳架聚光燈（會慢慢擺頭、光束閃爍）
  const lamps = [];
  for (const [a, r] of [[2.5, 9.8], [-2.5, 9.8], [2.05, 13], [-2.05, 13], [1.3, 13.4], [-1.3, 13.4]]) { const x = Math.sin(a) * r, z = Math.cos(a) * r; if (!clear(x, z, 0.6, 2.8)) continue;
    const g = grp(x, 0, z); g.rotation.y = faceY(x, z, 0, -2); world.add(g);
    for (let i = 0; i < 3; i++) { const s = Math.sin(i * 2.1), c = Math.cos(i * 2.1); rod(k, g, [s * 0.45, 0, c * 0.45], [0, 1.3, 0], 0.03, '#222222', 5); }
    add(k, g, cyl(0.035, 0.035, 1.4, 6), '#222222', 0, 1.95, 0);
    const head = grp(0, 2.7, 0); g.add(head); head.rotation.x = 0.3;
    add(k, head, cyl(0.3, 0.24, 0.55, 14), '#1d1d1f', 0, 0, 0).rotation.x = Math.PI / 2;
    add(k, head, new THREE.CircleGeometry(0.26, 16), k.glow('#fff1c4', 3), 0, 0, 0.28, false);
    for (const sy of [1, -1]) add(k, head, box(0.5, 0.04, 0.3), '#1d1d1f', 0, sy * 0.3, 0.42, false).rotation.x = -sy * 0.5;
    const bm = beamMat('#fff4cc', k.night ? 0.13 : 0.05); add(k, head, k.g('fbeam', () => new THREE.ConeGeometry(1.5, 8, 20, 1, true).translate(0, -4, 0).rotateX(-Math.PI / 2)), bm, 0, 0, 0.3, false);
    lamps.push([head, bm, lamps.length]); }
  k.anim.push((t) => lamps.forEach(([hd, bm, i]) => { hd.rotation.y = Math.sin(t * 0.4 + i * 1.3) * 0.35; bm.opacity = (k.night ? 0.12 : 0.05) * (0.75 + 0.25 * Math.sin(t * 9 + i * 3)); }));
  // 綠幕＋燈光桁架（燈一顆一顆換色閃）
  const gx = 15.2, gz = -7.6, pars = [];
  if (clear(gx, gz, 3.5, 5)) { const g = grp(gx, 0, gz); g.rotation.y = faceY(gx, gz, 0, -1); world.add(g); const green = k.m('#1fbf4a', { roughness: 0.9 });
    add(k, g, box(7, 4.5, 0.1), green, 0, 2.25, -1.6); add(k, g, box(7, 0.04, 3), green, 0, 0.03, 0);
    for (const sx of [-1, 1]) add(k, g, box(0.15, 5.4, 0.15), '#3a3d42', sx * 3.7, 2.7, -1.2);
    add(k, g, box(7.6, 0.3, 0.3), '#9aa3ad', 0, 5.3, -1.2);
    for (let i = 0; i < 6; i++) { add(k, g, cyl(0.18, 0.15, 0.35, 10), '#1d1d1f', -2.9 + i * 1.16, 5.0, -1.0).rotation.x = -0.6; const lm = basic('#333333'); add(k, g, new THREE.CircleGeometry(0.14, 12), lm, -2.9 + i * 1.16, 4.88, -0.82, false).rotation.x = 0.9; pars.push(lm); }
    add(k, g, box(0.5, 0.5, 0.5), '#e8b56a', 0.6, 0.25, 0.3);
    const tri = grp(-1.5, 0, 2.6); tri.rotation.y = Math.PI; g.add(tri); for (let i = 0; i < 3; i++) rod(k, tri, [Math.sin(i * 2.1) * 0.35, 0, Math.cos(i * 2.1) * 0.35], [0, 1.3, 0], 0.03, '#222222', 5); const fc = grp(0, 1.55, 0); tri.add(fc); reels.push(...filmCam(fc)); }
  const parC = ['#ff3b6b', '#ffd23f', '#3ad1ff', '#7dff6a', '#c56bff', '#ffffff'];
  k.anim.push((t) => pars.forEach((m, i) => { const on = Math.floor(t * 3) % pars.length; m.color.set(i === on || i === (on + 3) % pars.length ? parC[(i + Math.floor(t)) % parC.length] : '#3a3a3a'); }));
  // 片場拖車（演員休息室）
  for (const [x, z] of [[17, -15.5], [20.5, -11], [21.5, -18.5]]) { if (!clear(x, z, 2.6, 2.6)) continue; const g = grp(x, 0, z); g.rotation.y = faceY(x, z) + Math.PI / 2; world.add(g);
    add(k, g, box(2.2, 2.0, 5), '#f4f4f0', 0, 1.35, 0); add(k, g, box(2.24, 0.3, 5.02), hex(pal[0]), 0, 1.0, 0);
    add(k, g, box(0.05, 1.4, 0.8), '#5b6b78', 1.11, 1.4, 0.8); add(k, g, box(0.05, 0.5, 1.4), k.night ? k.glow('#ffd88a', 1.4) : k.m('#9bb7cc'), 1.11, 1.7, -1.2);
    const star = canvas(64, 64, (q) => { q.fillStyle = '#ffd23f'; q.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU - Math.PI / 2, r = i % 2 ? 12 : 28; q.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } q.fill(); });
    add(k, g, new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshStandardMaterial({ map: star, transparent: true }), 1.14, 1.75, 0.8, false).rotation.y = Math.PI / 2;
    for (const sz of [-1.6, 1.6]) add(k, g, cyl(0.32, 0.32, 2.3, 12), '#1d1d1f', 0, 0.32, sz).rotation.z = Math.PI / 2; }
  // 巨型電影膠卷（會轉）＋場記板（一直在打板）
  const RX = 14.5, RZ = 7.5;
  if (clear(RX, RZ, 2.2, 4.2)) { const g = grp(RX, 0, RZ); g.rotation.y = faceY(RX, RZ, 0, 14); world.add(g);
    const reelT = canvas(256, 256, (q) => { q.fillStyle = '#c9cdd2'; q.beginPath(); q.arc(128, 128, 126, 0, TAU); q.fill(); q.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; q.beginPath(); q.arc(128 + Math.cos(a) * 72, 128 + Math.sin(a) * 72, 34, 0, TAU); q.fill(); } q.beginPath(); q.arc(128, 128, 12, 0, TAU); q.fill(); q.globalCompositeOperation = 'source-over'; q.strokeStyle = '#8d949a'; q.lineWidth = 8; q.beginPath(); q.arc(128, 128, 122, 0, TAU); q.stroke(); });
    const rm = new THREE.MeshStandardMaterial({ map: reelT, transparent: true, alphaTest: 0.5, metalness: 0.5, roughness: 0.35, side: THREE.DoubleSide });
    const wheel = grp(0, 2.2, 0); g.add(wheel); const disc = add(k, wheel, cyl(1.9, 1.9, 0.12, 40), [k.m('#8d949a'), rm, rm], 0, 0, 0); disc.rotation.x = Math.PI / 2;
    add(k, wheel, cyl(1.3, 1.3, 0.5, 32), '#2b2416', 0, 0, -0.35).rotation.x = Math.PI / 2;
    for (const sx of [-1, 1]) rod(k, g, [sx * 1.0, 0, -0.5], [0, 2.2, -0.5], 0.08, '#3a3d42');
    const ft = rep(canvas(64, 128, (q) => { q.fillStyle = '#1d1a14'; q.fillRect(0, 0, 64, 128); q.fillStyle = '#f2e3c2'; for (let y = 4; y < 128; y += 16) { q.fillRect(4, y, 7, 8); q.fillRect(53, y, 7, 8); } q.fillStyle = '#c99a4a'; q.fillRect(16, 8, 32, 52); q.fillStyle = '#7fb3d9'; q.fillRect(16, 68, 32, 52); }), 1, 6);
    const sg = new THREE.PlaneGeometry(0.9, 9, 1, 30); const sp = sg.attributes.position; for (let i = 0; i < sp.count; i++) { const v = sp.getY(i); sp.setZ(i, Math.max(0, -v) * 0 + Math.sin(v * 0.6) * 0.8); } sg.rotateX(-Math.PI / 2); sg.translate(0, 0.05, 4.2);
    add(k, g, sg, new THREE.MeshStandardMaterial({ map: ft, side: THREE.DoubleSide, roughness: 0.4 }), 0.6, 0, 0, false);
    k.anim.push((t) => { wheel.rotation.z = -t * 0.8; ft.offset.y = t * 0.3; }); }
  const CX = -14, CZ = 7;
  if (clear(CX, CZ, 1.6, 3.4)) { const g = grp(CX, 0, CZ); g.rotation.y = faceY(CX, CZ, 0, 14); world.add(g);
    for (const sx of [-1, 1]) add(k, g, box(0.12, 1.4, 0.12), '#2b2b2e', sx * 0.8, 0.7, 0);
    const slate = canvas(256, 192, (q) => { q.fillStyle = '#1d1d1f'; q.fillRect(0, 0, 256, 192); q.strokeStyle = '#ffffff'; q.lineWidth = 3; q.strokeRect(10, 10, 236, 172); q.beginPath(); q.moveTo(10, 70); q.lineTo(246, 70); q.moveTo(10, 126); q.lineTo(246, 126); q.moveTo(128, 70); q.lineTo(128, 182); q.stroke(); q.fillStyle = '#ffffff'; q.font = '800 30px "Noto Sans TC", sans-serif'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText('示範短片', 128, 42); q.font = '700 24px "Noto Sans TC", sans-serif'; q.fillText('場 7', 69, 98); q.fillText('鏡 3', 187, 98); q.fillText('次 1', 69, 154); q.fillText('日', 187, 154); });
    add(k, g, box(2.2, 1.6, 0.12), [k.m('#1d1d1f'), k.m('#1d1d1f'), k.m('#1d1d1f'), k.m('#1d1d1f'), new THREE.MeshStandardMaterial({ map: slate, roughness: 0.6 }), k.m('#1d1d1f')], 0, 2.2, 0);
    const stp = new THREE.MeshStandardMaterial({ map: canvas(256, 32, (q) => { for (let i = 0; i < 9; i++) { q.fillStyle = i % 2 ? '#ffffff' : '#1d1d1f'; q.beginPath(); q.moveTo(i * 32, 32); q.lineTo(i * 32 + 22, 0); q.lineTo(i * 32 + 54, 0); q.lineTo(i * 32 + 32, 32); q.fill(); } }) });
    add(k, g, box(2.2, 0.3, 0.12), stp, 0, 3.15, 0);
    const hinge = grp(-1.1, 3.32, 0); g.add(hinge); add(k, hinge, box(2.2, 0.3, 0.12), stp, 1.1, 0.15, 0);
    k.anim.push((t) => { const u = (t % 3) / 3; hinge.rotation.z = u < 0.2 ? 0.55 * Math.sin(u / 0.2 * Math.PI / 2) : u < 0.8 ? 0.55 : u < 0.85 ? 0.55 * (1 - (u - 0.8) / 0.05) : 0; }); }
  if (reels.length) k.anim.push((t) => reels.forEach((r, i) => { r.rotation.x = t * (i % 2 ? 2 : -2); }));
  // 導演椅與監看螢幕（擺在廣場空地）
  const dc = layout.place(k.rnd, 0.6, 1.3); let spots = [];
  if (dc) { const g = grp(dc.x, 0.12, dc.z); g.rotation.y = faceY(dc.x, dc.z, 0, -6); world.add(g); const wood = k.m('#8a5a3a');
    for (const sz of [-1, 1]) { const l1 = add(k, g, box(0.05, 0.7, 0.05), wood, 0.25, 0.33, sz * 0.2); l1.rotation.x = 0.5; const l2 = add(k, g, box(0.05, 0.7, 0.05), wood, -0.25, 0.33, sz * 0.2); l2.rotation.x = -0.5; }
    add(k, g, box(0.55, 0.04, 0.45), '#1d1d1f', 0, 0.62, 0); for (const sx of [-1, 1]) add(k, g, box(0.05, 0.55, 0.05), wood, sx * 0.28, 0.9, -0.2);
    const bk = canvas(128, 48, (q) => { q.fillStyle = '#1d1d1f'; q.fillRect(0, 0, 128, 48); q.fillStyle = '#f2c230'; q.font = '800 30px "Noto Sans TC", sans-serif'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText('導演', 64, 26); });
    add(k, g, box(0.58, 0.22, 0.03), new THREE.MeshStandardMaterial({ map: bk }), 0, 1.05, -0.21);
    add(k, g, k.g('mega', () => cone(0.12, 0.4, 12, true).rotateZ(Math.PI / 2)), '#f2c230', 0.6, 0.15, 0.1);
    spots = [{ x: dc.x, z: dc.z, y: 0.42, face: [0, -6], pose: 'sit' }]; }
  const vm = layout.place(k.rnd, 0.5, 1.4);
  if (vm) { const g = grp(vm.x, 0.12, vm.z); g.rotation.y = faceY(vm.x, vm.z, 0, 3); world.add(g); add(k, g, box(0.8, 0.8, 0.5), '#3a3d42', 0, 0.4, 0); add(k, g, box(0.7, 0.45, 0.06), '#1d1d1f', 0, 1.05, 0).rotation.x = -0.2; add(k, g, box(0.6, 0.36, 0.02), basic('#7fc8ff'), 0, 1.06, 0.04).rotation.x = -0.2; }
  // 片場道路與高爾夫球車
  add(k, world, box(90, 0.03, 2.8), '#55565a', 0, 0.015, 13.6, { roughness: 1 }).castShadow = false;
  const dash = inst(world, box(1.2, 0.02, 0.12), k.m('#f2f2f2'), 30); for (let i = 0; i < 30; i++) setI(dash, i, -45 + i * 3.1, 0.04, 13.6);
  const cart = grp(); world.add(cart); add(k, cart, box(1.1, 0.5, 1.9), '#f4f4f0', 0, 0.55, 0); add(k, cart, box(1.0, 0.45, 0.25), '#2b2b2e', 0, 0.95, -0.2); add(k, cart, box(1.2, 0.06, 2.0), new THREE.MeshStandardMaterial({ map: stripeTex(hex(pal[0]), '#ffffff', 6) }), 0, 1.75, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { add(k, cart, box(0.05, 1.0, 0.05), '#cfd3d8', sx * 0.5, 1.25, sz * 0.85); add(k, cart, cyl(0.2, 0.2, 0.12, 10), '#1d1d1f', sx * 0.56, 0.2, sz * 0.62).rotation.z = Math.PI / 2; }
  k.anim.push((t) => { const u = (t * 0.03) % 1; cart.position.set(-42 + u * 84, 0.02, 13.0); cart.rotation.y = Math.PI / 2; });
  ringOut(k, clear, mobile ? 2 : 4, 17, 30, 5, 1.2, (x, z) => { world.add(tree(k, x, z, 'palm', 1.5 + k.rnd() * 0.5)); return 1; }, { front: false });
  spots.push({ x: gx - 2.2, z: gz + 1.5, face: [gx, gz], pose: 'work' }, { x: -15.6, z: -12.6, face: [-12, -6], pose: 'stand', hat: 'sun' });
  return { spots, features: ['攝影棚', '攝影機吊臂', '綠幕', '西部小鎮佈景', '燈光架', '場記板', '電影膠卷', '片場水塔'], heroH: 7.5 };
}

// ================= 運動場 =================
function stadium({ k, world, pal, clear, mobile }) {
  const coreT = canvas(512, 512, (g) => { for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? '#5fae4a' : '#6dbb55'; g.fillRect(i * 512 / 12, 0, 512 / 12 + 1, 512); } g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 5; g.beginPath(); g.arc(256, 256, 70, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(6, 256); g.lineTo(506, 256); g.stroke(); g.beginPath(); g.arc(256, 256, 248, 0, TAU); g.stroke(); });
  ground(k, world, { color: '#cfc7b5', coreTex: coreT, edge: '#ffffff', edgeH: 0.14 });
  // 紅色跑道（橢圓形，繞著廣場）
  const cz = -1, Ls = 5, Ri = 11.3, TW = 3.4, rc = Ri + TW / 2;
  const P = (r) => 4 * Ls + TAU * r;
  const ov = (r, d) => { const L = P(r); d = ((d % L) + L) % L; let x, z, hx, hz;
    if (d < 2 * Ls) { x = -Ls + d; z = r; hx = 1; hz = 0; }
    else if ((d -= 2 * Ls) < Math.PI * r) { const a = d / r; x = Ls + Math.sin(a) * r; z = Math.cos(a) * r; hx = Math.cos(a); hz = -Math.sin(a); }
    else if ((d -= Math.PI * r) < 2 * Ls) { x = Ls - d; z = -r; hx = -1; hz = 0; }
    else { d -= 2 * Ls; const a = d / r; x = -Ls - Math.sin(a) * r; z = -Math.cos(a) * r; hx = -Math.cos(a); hz = Math.sin(a); }
    return { x, z: cz + z, hx, hz }; };
  const path = (r, n = 200) => { const out = [], L = P(r); for (let i = 0; i <= n; i++) { const d = i / n * L, p = ov(r, d); out.push({ x: p.x, z: p.z, nx: -p.hz, nz: p.hx, s: d }); } return out; };
  const cp = path(rc);
  world.add(flat(ribbon(cp, 0, TW, 0.03), k.m('#c8483a', { roughness: 0.95, side: THREE.DoubleSide }), 0, 0, 0));
  world.add(flat(ribbon(cp, [...Array(9)].map((_, i) => -TW / 2 + i * TW / 8), 0.06, 0.04), k.m('#ffffff', { side: THREE.DoubleSide }), 0, 0, 0));
  const inner = new THREE.Shape(); path(Ri, 120).forEach((p, i) => (i ? inner.lineTo(p.x, -p.z) : inner.moveTo(p.x, -p.z)));
  const turf = rep(canvas(128, 128, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#5fae4a' : '#6dbb55'; g.fillRect(i * 16, 0, 16, 128); } }), 0.06, 0.06);
  const inf = flat(new THREE.ShapeGeometry(inner, 4), new THREE.MeshStandardMaterial({ map: turf, roughness: 1 }), 0, 0.02, 0); inf.rotation.x = -Math.PI / 2; world.add(inf);
  add(k, world, box(0.25, 0.01, TW), '#ffffff', 2.2, 0.045, cz + rc, {}).castShadow = false;
  // 跑者（沿著跑道一圈一圈跑）
  const runners = [], skin = ['#f1c9a5', '#c68a5e', '#8d5a3b', '#e0ac85'];
  for (let i = 0; i < (mobile ? 5 : 9); i++) { const g = grp(); world.add(g); g.scale.setScalar(1.15); const sh = k.m([hex(pal[0]), '#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6', '#ffffff', '#ff7aa8', '#1abc9c'][i]);
    add(k, g, box(0.32, 0.42, 0.2), sh, 0, 0.82, 0); add(k, g, sph(0.13, 10, 8), skin[i % 4], 0, 1.17, 0); add(k, g, box(0.33, 0.16, 0.21), '#2b2b2e', 0, 0.56, 0);
    const legs = [-1, 1].map((s) => { const p = grp(s * 0.09, 0.52, 0); g.add(p); add(k, p, k.g('rleg', () => box(0.11, 0.5, 0.11).translate(0, -0.25, 0)), skin[i % 4], 0, 0, 0); return p; });
    const arms = [-1, 1].map((s) => { const p = grp(s * 0.2, 1.0, 0); g.add(p); add(k, p, k.g('rarm', () => box(0.08, 0.38, 0.08).translate(0, -0.19, 0)), skin[i % 4], 0, 0, 0); return p; });
    runners.push({ g, legs, arms, lane: i % 8, d: k.rnd() * P(rc), v: 2.2 + k.rnd() * 1.6 }); }
  let last = 0;
  k.anim.push((t) => { const dt = Math.max(0, Math.min(0.05, t - last)); last = t; runners.forEach((r) => { r.d += r.v * dt; const o = ov(Ri + 0.22 + r.lane * 0.425, r.d), ph = r.d * 3.3; r.g.position.set(o.x, 0.04 + Math.abs(Math.sin(ph)) * 0.06, o.z); r.g.rotation.y = Math.atan2(o.hx, o.hz); r.legs[0].rotation.x = Math.sin(ph) * 0.8; r.legs[1].rotation.x = -Math.sin(ph) * 0.8; r.arms[0].rotation.x = -Math.sin(ph) * 0.9; r.arms[1].rotation.x = Math.sin(ph) * 0.9; }); });
  // 看台（觀眾會排波浪）
  const seatC = [hex(pal[0]), '#2f6fb0', '#ffffff', hex(pal[1])];
  const stand = (x, z, ry, w, tiers, roof, fill) => { const g = grp(x, 0, z); g.rotation.y = ry; world.add(g); const pts = [];
    for (let i = 0; i < tiers; i++) { const th = (i + 1) * 0.5; add(k, g, box(w, th, 0.9), i % 2 ? '#d9dde2' : '#c4c9cf', 0, th / 2, -i * 0.9); add(k, g, box(w, 0.12, 0.3), seatC[i % seatC.length], 0, th + 0.06, -i * 0.9 - 0.25, {}).castShadow = false;
      for (let xx = -w / 2 + 0.35; xx < w / 2 - 0.3; xx += 0.55) if (k.rnd() < fill) pts.push([xx + (k.rnd() - 0.5) * 0.1, th, -i * 0.9 + 0.05]); }
    crowd(k, g, pts, { s: 0.9, wave: 0.4 });
    const ad = canvas(512, 48, (q) => { q.fillStyle = '#1d2a44'; q.fillRect(0, 0, 512, 48); q.fillStyle = '#ffffff'; q.font = '800 28px "Noto Sans TC", sans-serif'; q.textBaseline = 'middle'; ['加油！', '運動', '健康', '示範'].forEach((s, j) => q.fillText(s, 20 + j * 128, 26)); });
    add(k, g, box(w, 0.5, 0.1), new THREE.MeshStandardMaterial({ map: rep(ad, w / 10, 1) }), 0, 0.25, 0.5);
    if (roof) { const top = tiers * 0.5 + 2.6, dep = tiers * 0.9 + 1.4; for (const sx of [-0.45, 0, 0.45]) add(k, g, box(0.25, top, 0.25), '#9aa3ad', sx * w, top / 2, -tiers * 0.9 + 0.2); add(k, g, box(w + 1, 0.2, dep), '#eef1f4', 0, top, -tiers * 0.45 + 0.2).rotation.x = -0.07;
      for (let i = 0; i < 10; i++) { const fx = -w / 2 + 1 + i * (w - 2) / 9; add(k, g, cyl(0.04, 0.04, 1.6, 5), '#dddddd', fx, top + 0.85, 0.8); flag(k, g, 0.9, 0.5, k.m(seatC[i % 4], { side: THREE.DoubleSide }), fx, top + 1.4, 0.8); } }
    return g; };
  const fill = mobile ? 0.4 : 0.72;
  stand(0, -16.9, 0, 32, 8, true, fill);
  for (const s of [-1, 1]) stand(s * 21, cz, -s * Math.PI / 2, 16, 6, false, fill * 0.8);
  // 跑道外的 LED 廣告看板（字會跑）
  const led = rep(canvas(1024, 64, (q) => { q.fillStyle = '#0b1020'; q.fillRect(0, 0, 1024, 64); q.font = '800 30px "Noto Sans TC", sans-serif'; q.textBaseline = 'middle'; ['運動讓生活更好', '示範賽事', '一起來流汗', '加油！'].forEach((s, j) => { q.fillStyle = ['#ffd23f', '#7fd3ff', '#7dff6a', '#ff7aa8'][j]; q.fillText(s, 20 + j * 256, 34); }); }), 2, 1);
  add(k, world, box(2 * Ls + 18, 0.7, 0.1), new THREE.MeshBasicMaterial({ map: led, toneMapped: false }), 0, 0.35, cz - Ri - TW - 0.45);
  k.anim.push((t) => { led.offset.x = t * 0.04; });
  // 計分板（比數與時間會跳）
  const sb = document.createElement('canvas'); sb.width = 512; sb.height = 256; const sg = sb.getContext('2d'); const sbt = new THREE.CanvasTexture(sb); sbt.colorSpace = THREE.SRGBColorSpace;
  let sc = [2, 1], lastSec = -1;
  const drawSB = (sec) => { sg.fillStyle = '#10141c'; sg.fillRect(0, 0, 512, 256); sg.strokeStyle = '#ffd23f'; sg.lineWidth = 6; sg.strokeRect(6, 6, 500, 244); sg.fillStyle = '#ffffff'; sg.font = '800 30px "Noto Sans TC", sans-serif'; sg.textAlign = 'center'; sg.textBaseline = 'middle'; sg.fillText('主隊', 120, 46); sg.fillText('客隊', 392, 46); sg.fillStyle = '#ffb02e'; sg.font = '900 110px system-ui, sans-serif'; sg.fillText(String(sc[0]), 120, 140); sg.fillText(String(sc[1]), 392, 140); sg.fillStyle = '#ffffff'; sg.fillText(':', 256, 132); const m = 60 + Math.floor(sec / 60) % 30, s = sec % 60; sg.fillStyle = '#7dff6a'; sg.font = '800 40px system-ui, sans-serif'; sg.fillText(`${m}:${String(s).padStart(2, '0')}`, 256, 220); sg.fillStyle = '#9aa3ad'; sg.font = '600 20px "Noto Sans TC", sans-serif'; sg.fillText('示範賽事', 256, 46); sbt.needsUpdate = true; };
  drawSB(0);
  k.anim.push((t) => { const s = Math.floor(t); if (s === lastSec) return; lastSec = s; if (s > 0 && s % 11 === 0) sc[hr(s) < 0.5 ? 0 : 1]++; if (sc[0] + sc[1] > 9) sc = [0, 0]; drawSB(s + 754); });
  const SX = -21.5, SZ = -15;
  if (clear(SX, SZ, 3, 10)) { const g = grp(SX, 0, SZ); g.rotation.y = faceY(SX, SZ, 0, 2); world.add(g); for (const sx of [-1, 1]) add(k, g, box(0.4, 6, 0.4), '#5b6470', sx * 2.6, 3, 0); add(k, g, box(7, 3.6, 0.4), '#2b2f36', 0, 7.6, 0); add(k, g, box(6.6, 3.3, 0.05), new THREE.MeshBasicMaterial({ map: sbt, toneMapped: false }), 0, 7.6, 0.22, false); }
  // 燈塔照明
  const ft = canvas(128, 96, (q) => { q.fillStyle = '#2b2f36'; q.fillRect(0, 0, 128, 96); for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { q.fillStyle = '#fffbe0'; q.beginPath(); q.arc(16 + i * 32, 16 + j * 32, 12, 0, TAU); q.fill(); } });
  const fm = new THREE.MeshStandardMaterial({ map: ft, emissive: C('#ffffff'), emissiveMap: ft, emissiveIntensity: k.night ? 1.6 : 0.4 });
  for (const [x, z] of [[-24, -21], [24, -21], [-25.5, 9], [25.5, 9]]) { if (!clear(x, z, 1.5, 16)) continue; const g = grp(x, 0, z); g.rotation.y = faceY(x, z, 0, cz); world.add(g); add(k, g, cyl(0.25, 0.45, 15, 8), '#9aa3ad', 0, 7.5, 0); const hd = add(k, g, box(3.4, 2.4, 0.3), [k.m('#2b2f36'), k.m('#2b2f36'), k.m('#2b2f36'), k.m('#2b2f36'), fm, k.m('#2b2f36')], 0, 15.6, 0.3); hd.rotation.x = 0.45; }
  // 足球門
  const net = new THREE.MeshStandardMaterial({ map: rep(canvas(64, 64, (q) => { q.strokeStyle = '#ffffff'; q.lineWidth = 2; for (let i = 0; i <= 64; i += 8) { q.beginPath(); q.moveTo(i, 0); q.lineTo(i, 64); q.moveTo(0, i); q.lineTo(64, i); q.stroke(); } }), 4, 2), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide });
  for (const s of [-1, 1]) { const x = s * 14.3; if (!clear(x, cz, 1.4, 2)) continue; const g = grp(x, 0, cz); g.rotation.y = -s * Math.PI / 2; world.add(g); const wM = k.m('#ffffff');
    for (const sx of [-1, 1]) { add(k, g, cyl(0.07, 0.07, 1.8, 8), wM, sx * 2.1, 0.9, 0); rod(k, g, [sx * 2.1, 1.8, 0], [sx * 2.1, 0, -1.3], 0.04, wM, 6); }
    add(k, g, cyl(0.07, 0.07, 4.3, 8), wM, 0, 1.8, 0).rotation.z = Math.PI / 2;
    const ng = add(k, g, new THREE.PlaneGeometry(4.2, 2.2), net, 0, 0.9, -0.65, false); ng.rotation.x = -0.62; }
  // 健身中心（主建築）：玻璃帷幕、裡面看得到跑步機、屋頂的大啞鈴
  const h = grp(HX, 0.12, HZ); world.add(h); const GH = 5.4;
  add(k, h, box(HW, GH, 2.2), windowMat(k, '#eef1f4', HW, GH, { cols: 6, rows: 3, glass: '#7fb8d8', lit: 0.6, seed: 31 }), 0, GH / 2, -0.9);
  for (const sx of [-1, 1]) add(k, h, box(0.35, GH + 0.02, 2.22), hex(pal[0]), sx * (HW / 2 - 0.17), GH / 2, -0.9);
  add(k, h, box(HW, 0.15, 1.8), '#9aa3ad', 0, 0.08, 1.1);
  add(k, h, box(HW, 1.1, 1.8), '#2b2f36', 0, GH - 0.55, 1.1);
  const sign = nameSign(k, 4.6, 0.7, '#2b2f36', '#ffffff'); sign.position.set(0, GH - 0.55, 2.02); h.add(sign);
  const glassM = new THREE.MeshStandardMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.3, roughness: 0.05, metalness: 0.3, depthWrite: false });
  add(k, h, box(HW - 0.1, GH - 1.25, 0.05), glassM, 0, (GH - 1.1) / 2 + 0.05, 1.98, false); for (const sx of [-1, 1]) add(k, h, box(0.05, GH - 1.25, 1.75), glassM, sx * (HW / 2 - 0.05), (GH - 1.1) / 2 + 0.05, 1.1, false);
  for (let i = 0; i < 7; i++) add(k, h, box(0.07, GH - 1.1, 0.07), '#3a3f46', -HW / 2 + 0.05 + i * (HW - 0.1) / 6, (GH - 1.1) / 2, 2.0);
  add(k, h, box(HW, 0.07, 0.07), '#3a3f46', 0, 2.3, 2.0);
  add(k, h, box(HW - 0.4, GH - 1.4, 0.05), k.night ? k.glow('#fff1d8', 0.7) : k.m('#f6f8fa'), 0, (GH - 1.1) / 2, 0.22, false);
  for (const x of [-2.6, -1.5, 1.5, 2.6]) { add(k, h, box(0.6, 0.18, 1.2), '#2b2f36', x, 0.25, 1.0); add(k, h, box(0.6, 0.06, 0.06), '#2b2f36', x, 1.2, 0.5); add(k, h, box(0.05, 0.9, 0.05), '#2b2f36', x, 0.75, 0.5); }
  if (k.night) { const l = new THREE.PointLight(0xfff1d8, 4, 8); l.position.set(0, 3, 1.2); h.add(l); }
  const db = grp(0, GH + 1.2, -0.6); h.add(db); add(k, h, box(0.3, 0.8, 0.3), '#9aa3ad', 0, GH + 0.4, -0.6);
  add(k, db, cyl(0.12, 0.12, 4.2, 10), '#cfd3d8', 0, 0, 0, { metalness: 0.6, roughness: 0.3 }).rotation.z = Math.PI / 2;
  for (const s of [-1, 1]) for (const [r, o] of [[0.9, 1.5], [0.7, 1.82]]) add(k, db, cyl(r, r, 0.28, 20), '#1d1d1f', s * o, 0, 0).rotation.z = Math.PI / 2;
  k.anim.push((t) => { db.rotation.y = t * 0.5; db.position.y = GH + 1.2 + Math.sin(t * 1.5) * 0.12; });
  const spots = [{ x: -13, z: 4.5, face: [0, 0], pose: 'stand', hat: 'cap' }, { x: 3.0, z: cz + Ri + 0.25, face: [9, cz + Ri + 0.25], pose: 'crouch' }, { x: 3.0, z: cz + Ri + 0.68, face: [9, cz + Ri + 0.68], pose: 'crouch' }, { x: 13.2, z: -6, face: [0, -1], pose: 'stand' }];
  return { spots, features: ['紅色跑道', '跑者', '看台觀眾', '計分板', '照明燈塔', '健身中心'], heroH: 7.6 };
}

// ================= 音樂祭舞台（永遠是夜晚） =================
function concert({ k, world, pal, clear, mobile, name }) {
  const field = rep(canvas(256, 256, (g) => { g.fillStyle = '#2d4a2f'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 900; i++) { g.fillStyle = hr(i) < 0.5 ? 'rgba(120,150,80,.35)' : 'rgba(20,30,20,.35)'; g.fillRect(hr(i, 1) * 256, hr(i, 2) * 256, 3, 6); } }), 5, 5);
  ground(k, world, { color: '#1d2b20', coreTex: field, edge: '#55585e', edgeH: 0.5 });
  const NC = [hex(pal[0]), '#ff3ea5', '#2de2e6', '#f6f740', '#8a5cff', '#3cff7a'];
  // 大舞台（主建築）：桁架、屋頂、LED 大螢幕、樂團器材、喇叭塔
  const h = grp(HX, 0.12, HZ); world.add(h); const SH = 1.3, TH = 9;
  add(k, h, box(HW + 0.8, SH, HD), '#18181c', 0, SH / 2, 0);
  add(k, h, box(HW + 0.8, 0.08, 0.05), k.glow(NC[0], 2.5), 0, SH - 0.05, HD / 2 + 0.01, false);
  for (let i = 0; i < 3; i++) add(k, h, box(1.4, (i + 1) * SH / 3, 0.3), '#2b2b30', 0, (i + 1) * SH / 6, HD / 2 + 0.75 - i * 0.3);
  const lattice = () => canvas(64, 64, (g) => { g.strokeStyle = '#c9ced6'; g.lineWidth = 5; g.strokeRect(3, 3, 58, 58); g.lineWidth = 3; g.beginPath(); g.moveTo(3, 3); g.lineTo(61, 61); g.moveTo(61, 3); g.lineTo(3, 61); g.stroke(); });
  const tc = rep(lattice(), 1, TH / 0.45), tb = rep(lattice(), (HW + 1.4) / 0.45, 1), tbs = rep(lattice(), HD / 0.45, 1);
  const tm = (t) => new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.4 });
  const tx = HW / 2 + 0.3;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(k, h, box(0.45, TH, 0.45), tm(tc), sx * tx, TH / 2, sz * (HD / 2 - 0.25));
  for (const sz of [-1, 1]) add(k, h, box(HW + 1.4, 0.45, 0.45), tm(tb), 0, TH, sz * (HD / 2 - 0.25));
  for (const sx of [-1, 1]) add(k, h, box(0.45, 0.45, HD), tm(tbs), sx * tx, TH, 0);
  add(k, h, box(HW + 1.8, 0.25, HD + 0.6), '#111114', 0, TH + 0.4, -0.2);
  const sign = nameSign(k, 5.6, 0.8, '#120a24', NC[1]); sign.position.set(0, TH - 0.65, HD / 2 - 0.0); h.add(sign);
  // LED 大螢幕（等化器跳動、顏色一直變）
  const scr = document.createElement('canvas'); scr.width = 256; scr.height = 144; const sg = scr.getContext('2d'); const st = new THREE.CanvasTexture(scr); st.colorSpace = THREE.SRGBColorSpace;
  const drawScr = (t) => { const hue = (t * 40) % 360, gr = sg.createLinearGradient(0, 0, 256, 144); gr.addColorStop(0, `hsl(${hue},90%,40%)`); gr.addColorStop(1, `hsl(${(hue + 120) % 360},90%,25%)`); sg.fillStyle = gr; sg.fillRect(0, 0, 256, 144);
    for (let i = 0; i < 16; i++) { const v = 0.2 + 0.8 * Math.abs(Math.sin(t * (2 + i * 0.37) + i)); sg.fillStyle = `hsla(${(hue + i * 14) % 360},100%,70%,.95)`; sg.fillRect(8 + i * 15, 136 - v * 86, 11, v * 86); }
    sg.fillStyle = '#ffffff'; sg.font = '800 22px "Noto Sans TC", sans-serif'; sg.textAlign = 'center'; sg.textBaseline = 'middle'; sg.fillText(name || '音樂祭', 128, 24); st.needsUpdate = true; };
  let lastS = -1; drawScr(0); k.anim.push((t) => { const q = Math.floor(t * 8); if (q !== lastS) { lastS = q; drawScr(t); } });
  add(k, h, box(HW - 0.5, 4.3, 0.15), [k.m('#111114'), k.m('#111114'), k.m('#111114'), k.m('#111114'), new THREE.MeshBasicMaterial({ map: st, toneMapped: false }), k.m('#111114')], 0, SH + 2.6, -HD / 2 + 0.4);
  // 樂團器材
  add(k, h, box(2, 0.3, 1.3), '#2b2b30', 0, SH + 0.15, -0.9);
  const kick = canvas(128, 128, (q) => { q.fillStyle = '#111'; q.beginPath(); q.arc(64, 64, 62, 0, TAU); q.fill(); q.fillStyle = NC[0]; q.beginPath(); q.arc(64, 64, 48, 0, TAU); q.fill(); q.fillStyle = '#fff'; q.font = '900 30px system-ui'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText('♪', 64, 66); });
  add(k, h, cyl(0.42, 0.42, 0.36, 20), [k.m('#c0392b'), new THREE.MeshStandardMaterial({ map: kick }), k.m('#eeeeee')], 0, SH + 0.72, -0.62).rotation.x = Math.PI / 2;
  for (const sx of [-1, 1]) { add(k, h, cyl(0.17, 0.17, 0.2, 14), '#c0392b', sx * 0.35, SH + 1.1, -0.95); add(k, h, cyl(0.015, 0.015, 1.1, 5), '#cccccc', sx * 0.8, SH + 0.85, -0.85); add(k, h, cyl(0.32, 0.32, 0.02, 18), '#e8c04a', sx * 0.8, SH + 1.42, -0.85, { metalness: 0.7, roughness: 0.3 }); }
  for (const x of [-1.6, 0, 1.6]) { add(k, h, cyl(0.015, 0.015, 1.45, 5), '#cccccc', x, SH + 0.72, 1.3); add(k, h, sph(0.05, 8, 6), '#333333', x, SH + 1.47, 1.3); }
  for (const sx of [-1, 1]) add(k, h, box(0.9, 0.7, 0.5), '#2b2b30', sx * 2.3, SH + 0.35, -1.2);
  add(k, h, box(1.1, 0.08, 0.35), '#1d1d1f', 2.4, SH + 0.95, 0.2); add(k, h, box(0.05, 0.9, 0.05), '#999999', 2.4, SH + 0.45, 0.2);
  // 喇叭塔與吊掛喇叭
  const spk = rep(canvas(64, 128, (q) => { q.fillStyle = '#16161a'; q.fillRect(0, 0, 64, 128); for (const y of [32, 96]) { q.fillStyle = '#3a3a40'; q.beginPath(); q.arc(32, y, 26, 0, TAU); q.fill(); q.fillStyle = '#222226'; q.beginPath(); q.arc(32, y, 14, 0, TAU); q.fill(); } }), 1, 3);
  const spM = new THREE.MeshStandardMaterial({ map: spk, roughness: 0.8 });
  for (const sx of [-1, 1]) { add(k, world, box(1.5, 5.4, 1.3), [k.m('#16161a'), k.m('#16161a'), k.m('#16161a'), k.m('#16161a'), spM, k.m('#16161a')], HX + sx * (HW / 2 + 1.3), 2.82, HZ + 0.6);
    for (let i = 0; i < 5; i++) { const b = add(k, h, box(0.9, 0.38, 0.7), '#1d1d22', sx * (tx + 0.1), TH - 0.6 - i * 0.4, HD / 2 + 0.3); b.rotation.x = i * 0.08; } }
  // 搖頭燈光束（掃動、變色）
  const beams = [];
  for (let i = 0; i < 6; i++) { const x = -2.9 + i * 1.16, g = grp(x, TH - 0.35, HD / 2 - 0.25); h.add(g); add(k, g, box(0.3, 0.3, 0.3), k.glow('#ffffff', 2), 0, 0, 0, false); const bm = beamMat('#ffffff', 0.2); add(k, g, k.g('cbeam', () => new THREE.ConeGeometry(1.2, 13, 18, 1, true).translate(0, -6.5, 0)), bm, 0, 0, 0, false); beams.push([g, bm, i]); }
  const sky = [];
  for (const sx of [-1, 1]) { const x = sx * 14, z = -18; if (!clear(x, z, 1, 3)) continue; add(k, world, cyl(0.6, 0.8, 1.2, 12), '#2b2b30', x, 0.6, z); const g = grp(x, 1.2, z); world.add(g); const bm = beamMat('#cfe0ff', 0.16); add(k, g, k.g('skybeam', () => new THREE.ConeGeometry(2.6, 46, 18, 1, true).rotateX(Math.PI).translate(0, 23, 0)), bm, 0, 0, 0, false); sky.push([g, bm, sx]); }
  const col = new THREE.Color();
  k.anim.push((t) => { beams.forEach(([g, bm, i]) => { g.rotation.z = Math.sin(t * 0.8 + i) * 0.6; g.rotation.x = -0.5 + Math.sin(t * 0.6 + i * 0.7) * 0.3; bm.color.copy(col.setHSL((t * 0.06 + i / 6) % 1, 1, 0.55)); bm.opacity = 0.16 + Math.max(0, Math.sin(t * 4 + i)) * 0.1; });
    sky.forEach(([g, bm, s]) => { g.rotation.z = s * (0.35 + Math.sin(t * 0.3 + s) * 0.3); g.rotation.x = Math.sin(t * 0.25) * 0.25; bm.color.copy(col.setHSL((t * 0.03 + (s > 0 ? 0.5 : 0)) % 1, 0.8, 0.6)); }); });
  // 跳動的人群（拿著螢光棒）
  const pts = [], sp = mobile ? 1.2 : 0.85;
  for (let x = -17; x <= 17; x += sp) for (let z = -9; z <= 13; z += sp) { const px = x + (hr(x, z) - 0.5) * 0.4, pz = z + (hr(z, x) - 0.5) * 0.4, r = Math.hypot(px, pz); if (r < CORE + 0.9 || r > 18) continue; if (Math.abs(px) < 1.4 && pz > 0) continue; if (pz < -6 && Math.abs(px) < 7) continue; pts.push([px, 0.02, pz]); }
  const cr = crowd(k, world, pts, { s: 0.95, bounce: 0.22, cols: ['#ff3ea5', '#2de2e6', '#f6f740', '#ffffff', '#8a5cff', '#ff8a3d', '#3cff7a', '#ff5a5a'] });
  const sticks = pts.filter((_, i) => i % 3 === 0), stIdx = pts.map((_, i) => i).filter(i => i % 3 === 0);
  sprayPts(k, world, sticks.length, '#ffffff', 0.2, (i, t, o) => { const p = sticks[i], b = cr ? cr.lift[stIdx[i]] : 0; o[0] = p[0] + Math.sin(t * 3 + i) * 0.15; o[1] = 1.0 + b + 0.25; o[2] = p[2]; }, { additive: true, colors: NC, opacity: 1 });
  // 彩帶紙花
  const NCF = mobile ? 120 : 260, cf = [...Array(NCF)].map((_, i) => [(hr(i) - 0.5) * 26, hr(i, 1) * 12, (hr(i, 2) - 0.5) * 18 - 1, 0.5 + hr(i, 3) * 0.6]);
  sprayPts(k, world, NCF, '#ffffff', 0.15, (i, t, o) => { const [x, y, z, v] = cf[i]; let yy = y - t * v; yy = ((yy % 12) + 12) % 12; o[0] = x + Math.sin(t * 1.3 + i) * 0.5; o[1] = yy + 0.2; o[2] = z + Math.cos(t + i) * 0.3; }, { colors: ['#ff3ea5', '#f6f740', '#2de2e6', '#ffffff', '#8a5cff', '#3cff7a'], opacity: 0.95 });
  // 巨型吉他雕塑
  const GX = -15, GZ = -12.5;
  if (clear(GX, GZ, 2.2, 10)) { const g = grp(GX, 0, GZ); g.rotation.y = faceY(GX, GZ, 0, 10); g.scale.setScalar(0.85); world.add(g);
    add(k, g, cyl(1.6, 1.8, 0.6, 20), '#2b2b30', 0, 0.3, 0);
    const burst = canvas(128, 128, (q) => { const r = q.createRadialGradient(64, 64, 10, 64, 64, 64); r.addColorStop(0, '#ffcf6a'); r.addColorStop(0.6, '#e0582a'); r.addColorStop(1, '#4a1408'); q.fillStyle = r; q.fillRect(0, 0, 128, 128); });
    const bm = new THREE.MeshStandardMaterial({ map: burst, roughness: 0.3, emissive: C('#5a1a08'), emissiveIntensity: 0.6 });
    const gb = grp(0, 0, 0); g.add(gb); gb.rotation.z = 0.12;
    add(k, gb, cyl(1.75, 1.75, 0.6, 30), [k.m('#5a2a12'), bm, bm], 0, 2.4, 0).rotation.x = Math.PI / 2;
    add(k, gb, cyl(1.32, 1.32, 0.6, 30), [k.m('#5a2a12'), bm, bm], 0, 4.6, 0).rotation.x = Math.PI / 2;
    add(k, gb, new THREE.CircleGeometry(0.5, 24), '#120804', 0, 3.6, 0.31, false);
    add(k, gb, box(1.1, 0.2, 0.1), '#2b1408', 0, 1.7, 0.33);
    add(k, gb, box(0.45, 5.6, 0.25), '#6b3f1e', 0, 8.6, 0); add(k, gb, box(0.7, 1.1, 0.22), '#1d1d1f', 0, 11.9, 0);
    const fr = inst(gb, box(0.47, 0.03, 0.27), k.m('#d9d9d9', { metalness: 0.6 }), 10); for (let i = 0; i < 10; i++) setI(fr, i, 0, 6.2 + i * 0.5, 0.005);
    for (let i = 0; i < 4; i++) add(k, gb, box(0.02, 9.6, 0.02), k.glow('#ffffff', 1.4), -0.15 + i * 0.1, 6.6, 0.32, false);
    for (let i = 0; i < 6; i++) add(k, gb, cyl(0.05, 0.05, 0.25, 6), '#d9d9d9', (i % 2 ? 1 : -1) * 0.45, 11.6 + Math.floor(i / 2) * 0.3, 0).rotation.z = Math.PI / 2; }
  // 巨型鍵盤雕塑（琴鍵輪流亮、被按下去）
  const KX = 15, KZ = -12;
  if (clear(KX, KZ, 4, 4)) { const g = grp(KX, 0, KZ); g.rotation.y = faceY(KX, KZ, 0, 10); g.scale.setScalar(1.25); world.add(g);
    for (const sx of [-1, 1]) { const a = add(k, g, box(0.15, 2.8, 0.15), '#3a3a40', sx * 2.6, 1.2, 0); a.rotation.x = 0.5; const b = add(k, g, box(0.15, 2.8, 0.15), '#3a3a40', sx * 2.6, 1.2, 0); b.rotation.x = -0.5; }
    const kb = grp(0, 2.3, 0); kb.rotation.x = 0.3; g.add(kb); add(k, kb, box(8.2, 0.5, 2.6), '#111114', 0, 0, 0); add(k, kb, box(8.2, 0.08, 0.06), k.glow(NC[2], 2), 0, 0.27, -1.28, false);
    const wk = inst(kb, box(0.52, 0.25, 1.9), basic('#ffffff'), 14, { cull: false }), bk = inst(kb, box(0.3, 0.3, 1.1), basic('#ffffff'), 10, { cull: false });
    const bpos = []; for (let i = 0; i < 13; i++) if (![2, 6, 9].includes(i % 7) && bpos.length < 10) bpos.push(i);
    const kc = new THREE.Color();
    k.anim.push((t) => { const on = Math.floor(t * 6) % 14; for (let i = 0; i < 14; i++) { const lit = i === on || i === (on + 5) % 14; setI(wk, i, -3.64 + i * 0.56, lit ? 0.24 : 0.32, 0.3); wk.setColorAt(i, lit ? kc.setHSL((t * 0.1 + i / 14) % 1, 1, 0.6) : kc.set('#e8e8ec')); } bpos.forEach((p, j) => { setI(bk, j, -3.36 + p * 0.56, 0.42, -0.1); bk.setColorAt(j, kc.set(j === on % 10 ? NC[1] : '#1d1d1f')); }); wk.instanceMatrix.needsUpdate = bk.instanceMatrix.needsUpdate = true; wk.instanceColor.needsUpdate = bk.instanceColor.needsUpdate = true; }); }
  // 旗海（羽毛旗）、帳篷攤位、燈串
  ringOut(k, clear, mobile ? 5 : 10, 17.5, 24, 4, 0.5, (x, z, a) => { add(k, world, cyl(0.04, 0.05, 4, 6), '#dddddd', x, 2, z); flag(k, world, 0.9, 2.6, k.m(NC[Math.floor(k.rnd() * NC.length)], { side: THREE.DoubleSide, emissive: C(NC[Math.floor(k.rnd() * 6)]), emissiveIntensity: 0.25 }), x, 2.6, z, a + Math.PI / 2, { amp: 0.15, speed: 3 }); return 1; }, { front: false });
  const stripes = [new THREE.MeshStandardMaterial({ map: stripeTex(NC[0], '#ffffff', 8) }), new THREE.MeshStandardMaterial({ map: stripeTex('#ff3ea5', '#ffffff', 8) }), new THREE.MeshStandardMaterial({ map: stripeTex('#2de2e6', '#ffffff', 8) })];
  ringOut(k, clear, mobile ? 3 : 6, 19, 26, 3.5, 2.2, (x, z) => { const g = grp(x, 0, z); g.rotation.y = faceY(x, z); world.add(g); add(k, g, cone(2.1, 1.4, 4), stripes[Math.floor(k.rnd() * 3)], 0, 3.0, 0).rotation.y = Math.PI / 4;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(k, g, cyl(0.05, 0.05, 2.3, 5), '#cccccc', sx * 1.3, 1.15, sz * 1.3); add(k, g, box(2.4, 0.9, 0.6), '#3a2f2a', 0, 0.45, 1.0); add(k, g, sph(0.18, 10, 8), k.glow('#ffd88a', 2.4), 0, 2.1, 1.2, false); return 1; }, { front: false });
  const bulbs = [];
  for (const s of [-1, 1]) { const ps = [[s * 9.6, 9], [s * 17, 4], [s * 17, -6], [s * 9.6, -10]]; ps.forEach(([x, z]) => add(k, world, cyl(0.06, 0.08, 4.2, 6), '#3a3a40', x, 2.1, z));
    for (let j = 0; j < ps.length - 1; j++) for (let u = 0; u < 1; u += 0.07) { const [ax, az] = ps[j], [bx, bz] = ps[j + 1]; bulbs.push([ax + (bx - ax) * u, 4.1 - Math.sin(Math.PI * u) * 0.8, az + (bz - az) * u]); } }
  const bl = inst(world, k.g('cbulb', () => sph(0.08, 6, 4)), basic('#ffffff'), bulbs.length); bulbs.forEach(([x, y, z], i) => { setI(bl, i, x, y, z); bl.setColorAt(i, C(NC[i % 6])); });
  const spots = [{ x: 0.2, z: HZ + 1.4, y: 0.12 + SH, face: [0, 8], pose: 'stand' }, { x: -2.2, z: HZ + 0.9, y: 0.12 + SH, face: [-1, 8], pose: 'stand' }, { x: 2.3, z: HZ + 0.9, y: 0.12 + SH, face: [1, 8], pose: 'stand' }];
  return { spots, features: ['大舞台', '搖頭燈光束', 'LED 大螢幕', '跳動人群', '巨型吉他', '巨型鍵盤', '彩帶紙花'], heroH: 9.6, fog: [30, 120] };
}

// ================= 美式郊區住宅 =================
function suburb({ k, world, pal, clear, mobile }) {
  const cc = canvas(512, 512, (g) => { g.fillStyle = '#e2e0da'; g.fillRect(0, 0, 512, 512); g.strokeStyle = 'rgba(0,0,0,.08)'; g.lineWidth = 2; for (let i = 0; i <= 512; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); } });
  ground(k, world, { color: '#84c46a', coreTex: cc, edge: '#c8c8c2', edgeH: 0.2 });
  // 環形街道、人行道、分隔線
  const road = flat(new THREE.RingGeometry(9.0, 11.6, 96), k.m('#5a5d63', { roughness: 1 }), 0, 0.02, 0); road.rotation.x = -Math.PI / 2; world.add(road);
  const walk = flat(new THREE.RingGeometry(11.6, 12.6, 96), k.m('#d8d6cf', { roughness: 1 }), 0, 0.03, 0); walk.rotation.x = -Math.PI / 2; world.add(walk);
  const dn = 40, dash = inst(world, box(0.12, 0.02, 0.9), k.m('#f2f2f2'), dn); for (let i = 0; i < dn; i++) { const a = i / dn * TAU; setI(dash, i, Math.sin(a) * 10.3, 0.04, Math.cos(a) * 10.3, 1, 1, 1, 0, a + Math.PI / 2); }
  // 一排排的房子（草皮、白色尖樁籬笆、信箱、車道、車庫）
  const walls = ['#f4e1c1', '#cfe3f2', '#f2d0d0', '#d8ecd0', '#fff4d6', '#e0d4f0', '#f6efe6'], roofs = ['#4a5568', '#7a4a3a', '#5a6b8a', '#6b5a4a'];
  const houseMat = (c, w, hh, st, seed) => { const H = 128 * st; const draw = (lit) => canvas(256, H, (g) => { g.fillStyle = lit ? '#000' : c; g.fillRect(0, 0, 256, H); if (!lit) { g.fillStyle = 'rgba(0,0,0,.06)'; for (let y = 0; y < H; y += 10) g.fillRect(0, y, 256, 2); }
      for (let s = 0; s < st; s++) for (const x of [40, 170]) { const y = H - (s + 1) * 128 + 30; if (!lit) { g.fillStyle = '#ffffff'; g.fillRect(x - 4, y - 4, 54, 64); g.fillStyle = '#5a7a98'; g.fillRect(x - 18, y, 12, 56); g.fillRect(x + 52, y, 12, 56); } g.fillStyle = lit ? (hr(seed, s, x) < 0.6 ? '#ffd88a' : '#000') : '#9bc4e0'; g.fillRect(x, y, 46, 56); if (!lit) { g.fillStyle = '#ffffff'; g.fillRect(x + 21, y, 4, 56); g.fillRect(x, y + 26, 46, 4); } } });
    const m = new THREE.MeshStandardMaterial({ map: draw(false), roughness: 0.8 }); if (k.night) { m.emissiveMap = draw(true); m.emissive = C('#ffffff'); m.emissiveIntensity = 1.1; } return m; };
  const loc = (x, z, ry, lx, lz) => [x + Math.cos(ry) * lx + Math.sin(ry) * lz, z - Math.sin(ry) * lx + Math.cos(ry) * lz];
  const pickets = [], rails = [], mail = [], bushes = [], bikes = [];
  const R = 17, angs = [];
  for (const s of [-1, 1]) for (let a = 1.0; a < 2.95; a += mobile ? 0.5 : 0.36) angs.push(s * a);
  const laundryA = angs.find((a) => a < -0.99 && a > -1.4);
  angs.forEach((a, n) => { const x = Math.sin(a) * R, z = Math.cos(a) * R, ry = a + Math.PI; if (a === laundryA) return; if (!clear(x, z, 3, 5)) return;
    const g = grp(x, 0, z); g.rotation.y = ry; world.add(g); const st = n % 3 === 1 ? 1 : 2, w = 3.8 + hr(n) * 0.6, hh = st === 2 ? 4.4 : 2.7, d = 3.4, c = walls[n % walls.length];
    add(k, g, box(w, hh, d), houseMat(c, w, hh, st, n), -0.6, hh / 2, 0);
    add(k, g, gable(w, d, 1.5, 0.3), [k.m(c), k.m(roofs[n % 4], { flatShading: true })], -0.6, hh, 0);
    add(k, g, box(1.6, 0.1, 1.0), '#ffffff', -0.6, 2.3, d / 2 + 0.5); for (const sx of [-0.7, 0.7]) add(k, g, box(0.1, 2.3, 0.1), '#ffffff', -0.6 + sx, 1.15, d / 2 + 0.95);
    add(k, g, box(0.8, 1.6, 0.05), ['#c0392b', '#2f4a7a', '#2f7a4a', '#f2c230'][n % 4], -0.6, 0.8, d / 2 + 0.03);
    add(k, g, box(2.4, 2.3, d - 0.4), c, w / 2 + 0.6, 1.15, -0.2); add(k, g, box(2.6, 0.15, d - 0.2), roofs[n % 4], w / 2 + 0.6, 2.35, -0.2);
    add(k, g, box(2.0, 1.8, 0.05), new THREE.MeshStandardMaterial({ map: stripeTex('#ffffff', '#e4e4e0', 8, false) }), w / 2 + 0.6, 0.9, (d - 0.4) / 2 - 0.18);
    add(k, g, box(2.2, 0.02, 2.9), '#cfcdc6', w / 2 + 0.6, 0.03, 2.95, {}).castShadow = false;
    if (n % 2) add(k, g, box(0.5, 1.4, 0.5), '#9a5a4a', -0.6 - w / 4, hh + 1.0, -0.3);
    for (let lx = -w / 2 - 0.9; lx < w / 2 - 0.6; lx += 0.26) if (Math.abs(lx + 0.6) > 0.55) pickets.push(loc(x, z, ry, lx, 4.2).concat(ry));
    rails.push(loc(x, z, ry, -1.2, 4.2).concat(ry, w + 0.6));
    mail.push(loc(x, z, ry, -1.8, 5.1).concat(ry)); bushes.push(loc(x, z, ry, -1.6, d / 2 + 0.5), loc(x, z, ry, 0.4, d / 2 + 0.5));
    if (n % 4 === 0) bikes.push(loc(x, z, ry, w / 2 + 2.0, 3.5).concat(ry + 1.2)); });
  const pk = inst(world, k.g('picket', () => box(0.08, 0.7, 0.04).translate(0, 0.35, 0)), k.m('#ffffff'), pickets.length); pickets.forEach(([x, z, ry], i) => setI(pk, i, x, 0, z, 1, 1, 1, 0, ry));
  const rl = inst(world, box(1, 0.06, 0.03), k.m('#ffffff'), rails.length * 2); rails.forEach(([x, z, ry, w], i) => { setI(rl, i * 2, x, 0.25, z, w, 1, 1, 0, ry); setI(rl, i * 2 + 1, x, 0.55, z, w, 1, 1, 0, ry); });
  const mp = inst(world, box(0.08, 1.0, 0.08), k.m('#7a5236'), mail.length), mb = inst(world, box(0.25, 0.25, 0.45), k.m('#3a4a5a', { metalness: 0.4 }), mail.length), mf = inst(world, box(0.03, 0.18, 0.08), k.m('#e74c3c'), mail.length);
  mail.forEach(([x, z, ry], i) => { setI(mp, i, x, 0.5, z, 1, 1, 1, 0, ry); setI(mb, i, x, 1.1, z, 1, 1, 1, 0, ry); const [fx, fz] = loc(x, z, ry, 0.14, -0.05); setI(mf, i, fx, 1.28, fz, 1, 1, 1, 0, ry); });
  const bu = inst(world, k.g('bush', () => new THREE.IcosahedronGeometry(0.45, 1)), k.m('#3f8a45', { flatShading: true }), bushes.length); bushes.forEach(([x, z], i) => setI(bu, i, x, 0.35, z, 1, 0.8, 1));
  // 行道樹（兩種顏色的樹冠）
  const tr = []; ringOut(k, clear, mobile ? 10 : 18, 20.5, 32, 5, 1.4, (x, z) => { tr.push([x, z, 0.8 + k.rnd() * 0.5]); return 1; }, { front: false });
  for (const s of [-1, 1]) for (const a of [1.55, 2.3]) { const x = s * Math.sin(a) * 13.4, z = Math.cos(a) * 13.4; if (clear(x, z, 1, 4)) tr.push([x, z, 0.75]); }
  const tt = inst(world, k.g('stTrunk', () => cyl(0.15, 0.22, 1.6, 6).translate(0, 0.8, 0)), k.m('#7a5236'), tr.length, { cast: true }), tc = inst(world, k.g('stCrown', () => new THREE.IcosahedronGeometry(1.3, 1)), tint('#ffffff', { flatShading: true }), tr.length, { cast: true });
  tr.forEach(([x, z, s], i) => { setI(tt, i, x, 0, z, s); setI(tc, i, x, 2.4 * s, z, s); tc.setColorAt(i, C(['#4fae5b', '#6cc163', '#3d9b57', '#8cc152'][i % 4])); });
  // 腳踏車
  const bike = (x, z, ry, c) => { const g = grp(x, 0, z); g.rotation.y = ry; world.add(g); const fm = k.m(c, { metalness: 0.3, roughness: 0.4 });
    for (const sz of [-0.42, 0.42]) add(k, g, k.g('bwheel', () => new THREE.TorusGeometry(0.28, 0.035, 6, 18)), '#1d1d1f', 0, 0.3, sz).rotation.y = Math.PI / 2;
    rod(k, g, [0, 0.3, -0.42], [0, 0.62, 0.05], 0.025, fm, 5); rod(k, g, [0, 0.62, 0.05], [0, 0.3, 0.42], 0.025, fm, 5); rod(k, g, [0, 0.3, -0.42], [0, 0.66, -0.2], 0.025, fm, 5); rod(k, g, [0, 0.62, 0.05], [0, 0.66, -0.2], 0.025, fm, 5);
    add(k, g, box(0.12, 0.05, 0.22), '#1d1d1f', 0, 0.7, -0.22); add(k, g, box(0.45, 0.03, 0.03), '#cccccc', 0, 0.78, 0.38); return g; };
  bikes.forEach(([x, z, ry], i) => bike(x, z, ry, ['#e74c3c', '#3498db', '#ff7aa8', '#2ecc71'][i % 4]));
  // 前院：灑水器（左右擺動噴水）、花圃、小朋友的腳踏車
  const sprink = [];
  for (const [x, z] of [[-6.5, 15.2], [7.2, 14.6], [-15.6, 7.4], [16, 5.5]]) { if (!clear(x, z, 0.4, 0.5)) continue; add(k, world, cyl(0.12, 0.15, 0.2, 10), '#3a4a5a', x, 0.1, z); sprink.push([x, z, faceY(x, z), sprink.length]); }
  sprink.forEach(([x, z, base, si]) => sprayPts(k, world, mobile ? 30 : 60, '#d8f1ff', 0.1, (i, t, o) => { const sw = base + Math.sin(t * 0.8 + si) * 1.1, u = (t * 0.7 + i * 0.0617) % 1, a = sw + ((i % 5) - 2) * 0.07, dd = u * (2.6 + (i % 3) * 0.3); o[0] = x + Math.sin(a) * dd; o[1] = 0.25 + 4 * u * (1 - u) * 1.3; o[2] = z + Math.cos(a) * dd; }, { opacity: 0.8 }));
  for (const [x, z, ry] of [[-3.2, 13.6, 0], [3.4, 13.6, 0], [-12.4, 10.4, 0.9]]) { const g = grp(x, 0, z); g.rotation.y = ry; world.add(g); add(k, g, box(2.4, 0.2, 0.8), '#7a5236', 0, 0.1, 0); const fl = inst(g, k.g('sflower', () => sph(0.12, 8, 6)), tint(), 14); for (let i = 0; i < 14; i++) { setI(fl, i, -1.05 + (i % 7) * 0.35, 0.32, i < 7 ? -0.18 : 0.18); fl.setColorAt(i, C(['#ff6b8a', '#ffd23f', '#ffffff', '#c56bff', '#ff8a3d'][(i * 3) % 5])); } }
  if (clear(9.5, 15.5, 0.6, 1)) bike(9.5, 15.5, 0.8, '#f2c230');
  // 曬衣繩（衣服被風吹得晃來晃去）
  const clothes = [];
  if (laundryA !== undefined) { const x = Math.sin(laundryA) * 16, z = Math.cos(laundryA) * 16, ry = laundryA + Math.PI / 2; if (clear(x, z, 2.2, 2.4)) { const g = grp(x, 0, z); g.rotation.y = ry; world.add(g);
    for (const sx of [-1.9, 1.9]) { add(k, g, cyl(0.05, 0.05, 2.2, 6), '#cfcfcf', sx, 1.1, 0); add(k, g, box(0.6, 0.05, 0.05), '#cfcfcf', sx, 2.15, 0); }
    add(k, g, box(3.8, 0.015, 0.015), '#eeeeee', 0, 2.1, 0);
    const cc2 = [hex(pal[0]), '#ffffff', '#7fc8ff', '#ff9ec0', '#ffe08a', '#b8e0b0'];
    for (let i = 0; i < 6; i++) { const p = grp(-1.55 + i * 0.62, 2.1, 0); g.add(p); add(k, p, box(i % 2 ? 0.5 : 0.42, i % 2 ? 0.75 : 0.55, 0.02), cc2[i], 0, i % 2 ? -0.38 : -0.28, 0); clothes.push(p); }
    add(k, g, box(0.6, 0.35, 0.4), '#d9c9a8', 0.4, 0.18, 0.6); } }
  k.anim.push((t) => clothes.forEach((p, i) => { p.rotation.x = Math.sin(t * 2.2 + i * 0.8) * 0.28 + 0.12; }));
  // 清潔廂型車（繞著社區跑，後面冒泡泡）
  const van = grp(); world.add(van);
  add(k, van, box(1.4, 1.3, 2.8), '#ffffff', 0, 0.95, -0.2, { roughness: 0.4 }); add(k, van, box(1.36, 0.75, 0.8), '#ffffff', 0, 0.68, 1.55, { roughness: 0.4 });
  add(k, van, box(1.3, 0.5, 0.05), '#2b3440', 0, 1.3, 1.22).rotation.x = -0.3; add(k, van, box(1.42, 0.22, 3.6), hex(pal[0]), 0, 0.75, 0.2);
  const logo = canvas(256, 128, (g) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 128); for (const [x, y, r] of [[40, 50, 26], [78, 36, 16], [70, 80, 14]]) { g.strokeStyle = '#5fb8e8'; g.lineWidth = 5; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); } g.fillStyle = '#2f6fb0'; g.font = '800 40px "Noto Sans TC", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('到府清潔', 170, 64); });
  for (const s of [-1, 1]) { const l = add(k, van, new THREE.PlaneGeometry(1.6, 0.8), new THREE.MeshStandardMaterial({ map: logo, roughness: 0.5 }), s * 0.71, 1.15, -0.3, false); l.rotation.y = s * Math.PI / 2; }
  const vw = []; for (const sx of [-1, 1]) for (const sz of [-1.1, 1.3]) { const w = add(k, van, k.g('vwheel', () => cyl(0.3, 0.3, 0.2, 14)), '#1d1d1f', sx * 0.68, 0.3, sz); w.rotation.z = Math.PI / 2; vw.push(w); }
  add(k, van, box(0.8, 0.12, 1.6), '#9aa3ad', 0, 1.66, -0.4);
  const vp = new THREE.Vector3();
  k.anim.push((t) => { const a = t * 0.09 + 0.5, r = 10.9; van.position.set(Math.sin(a) * r, 0.02, Math.cos(a) * r); van.rotation.y = Math.atan2(Math.cos(a), -Math.sin(a)); vp.copy(van.position); vw.forEach((w) => { w.rotation.x = t * 3.2; }); });
  // 主建築：整潔的兩層樓房子（清潔公司辦公室），窗戶亮晶晶
  const h = grp(HX, 0.12, HZ); world.add(h); const HH2 = 4.8, BW = HW - 0.6, BD = HD - 1.0;
  const front = (lit) => canvas(512, 372, (g) => { g.fillStyle = lit ? '#000' : '#f8f8f4'; g.fillRect(0, 0, 512, 372); if (!lit) { g.fillStyle = 'rgba(0,0,0,.05)'; for (let y = 0; y < 372; y += 12) g.fillRect(0, y, 512, 2); }
    const win = (x, y, w, hh) => { if (!lit) { g.fillStyle = '#ffffff'; g.fillRect(x - 6, y - 6, w + 12, hh + 12); g.fillStyle = '#2f5a9a'; g.fillRect(x - 30, y, 20, hh); g.fillRect(x + w + 10, y, 20, hh); } g.fillStyle = lit ? '#ffd88a' : '#a8d8f0'; g.fillRect(x, y, w, hh); if (!lit) { g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.moveTo(x + 6, y + hh - 8); g.lineTo(x + w * 0.5, y + 6); g.lineTo(x + w * 0.65, y + 6); g.lineTo(x + 14, y + hh - 8); g.fill(); g.fillStyle = '#ffffff'; g.fillRect(x + w / 2 - 2, y, 4, hh); g.fillRect(x, y + hh / 2 - 2, w, 4); } };
    for (const x of [70, 230, 390]) win(x, 40, 56, 82); for (const x of [70, 390]) win(x - 10, 210, 76, 100); });
  const fm = new THREE.MeshStandardMaterial({ map: front(false), roughness: 0.6 }); if (k.night) { fm.emissiveMap = front(true); fm.emissive = C('#ffffff'); fm.emissiveIntensity = 1.1; }
  const side = new THREE.MeshStandardMaterial({ map: rep(stripeTex('#f8f8f4', '#ecece6', 16, false), 1, 2), roughness: 0.7 });
  add(k, h, box(BW, HH2, BD), [side, side, side, side, fm, side], 0, HH2 / 2, -0.5);
  add(k, h, gable(BW, BD, 1.8, 0.35), [k.m('#f8f8f4'), k.m('#4a5568', { flatShading: true })], 0, HH2, -0.5);
  add(k, h, box(0.6, 1.8, 0.6), '#a0523a', 2.2, HH2 + 1.2, -1.2);
  add(k, h, box(BW + 0.2, 0.22, 1.1), '#e8e6e0', 0, 0.11, BD / 2 - 0.5 + 0.55);
  add(k, h, box(BW + 0.4, 0.16, 1.25), '#ffffff', 0, 2.45, BD / 2 - 0.5 + 0.6);
  for (const x of [-3.05, -1.2, 1.2, 3.05]) add(k, h, cyl(0.09, 0.1, 2.25, 10), '#ffffff', x, 1.32, BD / 2 + 0.58);
  add(k, h, box(0.9, 1.9, 0.06), '#2f4a7a', 0, 1.17, BD / 2 - 0.47); add(k, h, sph(0.05, 8, 6), '#f0c04a', 0.32, 1.1, BD / 2 - 0.42);
  const sign = nameSign(k, 3.8, 0.5, '#2f6fb0', '#ffffff'); sign.position.set(0, 2.82, BD / 2 + 0.12); h.add(sign);
  for (const x of [-2.6, 2.6]) { const fb = add(k, h, box(1.1, 0.2, 0.25), '#7a5236', x, 1.42, BD / 2 - 0.38); const fl = inst(h, k.g('sflower', () => sph(0.12, 8, 6)), tint(), 5); for (let i = 0; i < 5; i++) { setI(fl, i, x - 0.4 + i * 0.2, 1.6, BD / 2 - 0.38); fl.setColorAt(i, C(['#ff6b8a', '#ffd23f', '#ffffff', '#c56bff', '#ff8a3d'][i])); } }
  for (const sx of [-1, 1]) for (let i = 0; i < 6; i++) add(k, world, box(0.08, 0.6, 0.04), '#ffffff', HX + sx * (1.2 + i * 0.4), 0.42, HERO.z1 + 1.0);
  const starT = canvas(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.2, 'rgba(255,255,255,.6)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.beginPath(); g.moveTo(32, 0); g.lineTo(37, 27); g.lineTo(64, 32); g.lineTo(37, 37); g.lineTo(32, 64); g.lineTo(27, 37); g.lineTo(0, 32); g.lineTo(27, 27); g.fill(); });
  const starM = new THREE.MeshBasicMaterial({ map: starT, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const fwx = (px) => -BW / 2 + px / 512 * BW, fwy = (py) => HH2 - py / 372 * HH2;
  const sparks = [[98, 70], [258, 60], [418, 90], [80, 240], [440, 270], [120, 290], [260, 100]].map(([px, py]) => add(k, h, new THREE.PlaneGeometry(0.7, 0.7), starM, fwx(px), fwy(py), BD / 2 - 0.44, false));
  k.anim.push((t) => sparks.forEach((s, i) => { const v = Math.pow(Math.max(0, Math.sin(t * 2.2 + i * 1.9)), 6); s.scale.setScalar(0.05 + v); s.rotation.z = t * 0.5 + i; }));
  // 泡泡（從廂型車、主建築飄出來）
  bubbles(k, world, mobile ? 20 : 40, (i, c) => (hr(i, c) < 0.55 ? [vp.x + (hr(i, c, 1) - 0.5), 1.2, vp.z + (hr(i, c, 2) - 0.5)] : [HX + (hr(i, c, 3) - 0.5) * 6, 1.0, HERO.z1 + 0.6 + hr(i, c, 4) * 0.6]), { rise: 4.5, size: 0.2, speed: 0.15 });
  const spots = [{ x: -4.6, z: 13.4, face: [-3.2, 13.6], pose: 'work', prop: 'can' }, { x: 2.4, z: HERO.z1 + 0.25, y: 0.34, face: [0, 5], pose: 'sit' }, { x: 9.0, z: 14.4, face: [9.5, 15.5], pose: 'stand' }];
  return { spots, dogs: mobile ? 1 : 2, features: ['兩層樓辦公室', '郊區住宅', '白色籬笆', '清潔廂型車', '灑水器', '曬衣繩', '亮晶晶的窗戶'], heroH: 7.2 };
}

// ================= 機器人工廠 =================
function robot({ k, world, pal, clear, mobile }) {
  const plate = rep(canvas(128, 128, (g) => { g.fillStyle = '#69727e'; g.fillRect(0, 0, 128, 128); g.fillStyle = 'rgba(255,255,255,.16)'; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.save(); g.translate(i * 16 + 8 + (j % 2) * 8, j * 16 + 8); g.rotate((i + j) % 2 ? 0.8 : -0.8); g.fillRect(-6, -1.5, 12, 3); g.restore(); } }), 80, 80);
  const gp = new THREE.Mesh(new THREE.PlaneGeometry(320, 320), new THREE.MeshStandardMaterial({ map: plate, roughness: 0.6, metalness: 0.3 })); gp.rotation.x = -Math.PI / 2; gp.position.y = -0.005; gp.receiveShadow = true; world.add(gp);
  const floor = canvas(512, 512, (g) => { g.fillStyle = '#d6dbe0'; g.fillRect(0, 0, 512, 512); g.strokeStyle = 'rgba(0,0,0,.07)'; g.lineWidth = 2; for (let i = 0; i <= 512; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
    g.save(); g.beginPath(); g.arc(256, 256, 256, 0, TAU); g.arc(256, 256, 230, 0, TAU, true); g.clip(); for (let i = -512; i < 1024; i += 28) { g.fillStyle = (i / 28) % 2 ? '#1d1d1f' : '#f2c230'; g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 14, 0); g.lineTo(i + 14 - 512, 512); g.lineTo(i - 512, 512); g.fill(); } g.restore(); });
  ground(k, world, { color: null, coreTex: floor, edge: '#2b2f36', edgeH: 0.25 });
  const steel = k.m('#9aa3ad', { metalness: 0.6, roughness: 0.35 }), dark = k.m('#2b2f36', { metalness: 0.4, roughness: 0.5 }), acc = hex(pal[0]);
  // 維修實驗室（主建築）：電路板外牆（線路會發光）、晶片屋頂、巨型手機雕塑
  const h = grp(HX, 0.12, HZ); world.add(h);
  const traces = []; for (let i = 0; i < 46; i++) { let x = Math.floor(k.rnd() * 32) * 16, y = Math.floor(k.rnd() * 24) * 16; const seg = [[x, y]]; for (let j = 0; j < 4; j++) { const d = Math.floor(k.rnd() * 4), L = 16 * (1 + Math.floor(k.rnd() * 5)); if (d === 0) x += L; else if (d === 1) y += L; else if (d === 2) { x += L; y += L; } else { x += L; y -= L; } seg.push([x, y]); } traces.push(seg); }
  const chips = [...Array(7)].map(() => [Math.floor(k.rnd() * 26) * 16 + 20, Math.floor(k.rnd() * 18) * 16 + 20, 40 + Math.floor(k.rnd() * 3) * 16, 32 + Math.floor(k.rnd() * 2) * 16]);
  const pcb = (lit) => canvas(512, 384, (g) => { g.fillStyle = lit ? '#000' : '#0d5c3e'; g.fillRect(0, 0, 512, 384); g.strokeStyle = lit ? '#3fffd0' : '#d8b25a'; g.fillStyle = g.strokeStyle; g.lineWidth = 3;
    for (const s of traces) { g.beginPath(); s.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); const [ex, ey] = s[s.length - 1]; g.beginPath(); g.arc(ex, ey, 5, 0, TAU); g.fill(); g.beginPath(); g.arc(s[0][0], s[0][1], 5, 0, TAU); g.fill(); }
    if (!lit) for (const [x, y, w, hh] of chips) { g.fillStyle = '#1b1d22'; g.fillRect(x, y, w, hh); g.fillStyle = '#c9ced6'; for (let px = x + 4; px < x + w - 2; px += 8) { g.fillRect(px, y - 5, 3, 5); g.fillRect(px, y + hh, 3, 5); } } });
  const pm = new THREE.MeshStandardMaterial({ map: pcb(false), roughness: 0.5, metalness: 0.2, emissive: C('#ffffff'), emissiveMap: pcb(true), emissiveIntensity: k.night ? 1.3 : 0.25 });
  k.anim.push((t) => { pm.emissiveIntensity = (k.night ? 1.0 : 0.18) + Math.max(0, Math.sin(t * 1.8)) * (k.night ? 0.6 : 0.25); });
  const LH = 5, ld = HD - 0.6;
  add(k, h, box(HW, LH, ld), pm, 0, LH / 2, -0.3);
  const chipTop = canvas(256, 128, (g) => { g.fillStyle = '#1b1d22'; g.fillRect(0, 0, 256, 128); g.fillStyle = '#c9ced6'; g.font = '800 34px "Noto Sans TC", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('維修實驗室', 128, 56); g.beginPath(); g.arc(22, 22, 8, 0, TAU); g.fill(); });
  add(k, h, box(HW - 1.4, 0.7, ld - 1.4), [dark, dark, new THREE.MeshStandardMaterial({ map: chipTop, roughness: 0.5 }), dark, dark, dark], 0, LH + 0.35, -0.3);
  const pins = []; for (let i = 0; i < 9; i++) for (const s of [-1, 1]) pins.push([-2.4 + i * 0.6, s * ((ld - 1.4) / 2 + 0.12) - 0.3, 0]); for (let i = 0; i < 3; i++) for (const s of [-1, 1]) pins.push([s * ((HW - 1.4) / 2 + 0.12), -0.9 + i * 0.6, 1]);
  const pn = inst(h, box(0.18, 0.12, 0.24), steel, pins.length); pins.forEach(([x, z, r], i) => setI(pn, i, x, LH + 0.12, z, 1, 1, 1, 0, r ? Math.PI / 2 : 0));
  const fzz = ld / 2 - 0.3;
  add(k, h, box(1.8, 2.5, 0.06), new THREE.MeshStandardMaterial({ color: C('#9fe8ff'), transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0.4 }), 0, 1.25, fzz + 0.02, false);
  for (const [w, hh, x, y] of [[2.1, 0.12, 0, 2.55], [0.12, 2.6, -0.97, 1.3], [0.12, 2.6, 0.97, 1.3]]) add(k, h, box(w, hh, 0.1), k.glow('#3fffd0', 2.2), x, y, fzz + 0.04, false);
  const sign = nameSign(k, 4.8, 0.65, '#0a1f18', '#48f0c0'); sign.position.set(0, 3.5, fzz + 0.06); h.add(sign);
  const ph = document.createElement('canvas'); ph.width = 128; ph.height = 256; const pg = ph.getContext('2d'); const pt = new THREE.CanvasTexture(ph); pt.colorSpace = THREE.SRGBColorSpace;
  const drawPh = (p) => { pg.fillStyle = '#0b1a2a'; pg.fillRect(0, 0, 128, 256); pg.strokeStyle = '#48f0c0'; pg.lineWidth = 8; pg.lineCap = 'round'; if (p < 1) { pg.beginPath(); pg.moveTo(40, 150); pg.lineTo(86, 104); pg.stroke(); pg.beginPath(); pg.arc(92, 96, 14, 0, TAU); pg.stroke(); pg.fillStyle = '#1e3a4a'; pg.fillRect(20, 196, 88, 14); pg.fillStyle = '#48f0c0'; pg.fillRect(20, 196, 88 * p, 14); } else { pg.beginPath(); pg.moveTo(34, 130); pg.lineTo(58, 156); pg.lineTo(96, 104); pg.stroke(); pg.fillStyle = '#48f0c0'; pg.font = '800 24px "Noto Sans TC", sans-serif'; pg.textAlign = 'center'; pg.fillText('修好了', 64, 206); } pt.needsUpdate = true; };
  drawPh(0); let lastP = -1;
  const phone = grp(0, LH + 0.7 + 1.9, -0.3); h.add(phone); add(k, h, cyl(0.15, 0.2, 0.8, 8), steel, 0, LH + 1.1, -0.3);
  add(k, phone, box(1.5, 2.9, 0.18), dark, 0, 0, 0); add(k, phone, box(1.3, 2.6, 0.02), new THREE.MeshBasicMaterial({ map: pt, toneMapped: false }), 0, 0, 0.1, false); add(k, phone, box(1.3, 2.6, 0.02), new THREE.MeshBasicMaterial({ map: pt, toneMapped: false }), 0, 0, -0.1, false);
  k.anim.push((t) => { phone.rotation.y = t * 0.5; const q = Math.floor(t * 4) % 24; if (q !== lastP) { lastP = q; drawPh(q < 18 ? q / 18 : 1); } });
  const ant = add(k, h, cyl(0.04, 0.04, 1.6, 6), steel, -3.0, LH + 0.8, -1.6); const antL = k.glow('#ff3b3b', 2.5); add(k, h, sph(0.12, 10, 8), antL, -3.0, LH + 1.65, -1.6, false);
  // 工廠牆面、鋸齒屋頂、煙囪、大齒輪
  add(k, world, box(32, 9, 6), windowMat(k, '#7d8894', 32, 9, { cols: 2, rows: 1, glass: '#a8c4d8', lit: 0.6, seed: 9 }), 0, 4.5, -20);
  const saw = new THREE.Shape(); saw.moveTo(0, 0); saw.lineTo(4, 0); saw.lineTo(0, 2.2); saw.lineTo(0, 0); const sawG = new THREE.ExtrudeGeometry(saw, { depth: 6, bevelEnabled: false }); sawG.translate(-2, 0, -3); sawG.rotateY(Math.PI / 2);
  for (let i = 0; i < 8; i++) add(k, world, sawG, [k.m('#5b6470'), k.m('#9fc4dc', { metalness: 0.3, roughness: 0.2 })], -14 + i * 4, 9, -20);
  for (const sx of [-1, 1]) { const x = sx * 12, z = -25; add(k, world, cyl(0.8, 1.0, 15, 12), new THREE.MeshStandardMaterial({ map: rep(stripeTex('#c0392b', '#f4f4f0', 6, false), 1, 1) }), x, 7.5, z); puffs(k, world, x, 15.2, z, { n: 3, color: 0xeeeeee, size: 0.6, rise: 4, speed: 0.15, opacity: 0.55 }); }
  const gears = [];
  const gear = (x, y, z, r, teeth, mat, dir, sp) => { const m = add(k, world, gearGeo(r, teeth, 0.45), mat, x, y, z); add(k, world, cyl(r * 0.2, r * 0.2, 0.7, 12), dark, x, y, z + 0.1).rotation.x = Math.PI / 2; gears.push([m, dir * sp]); };
  const brass = k.m('#d4a640', { metalness: 0.65, roughness: 0.35 });
  gear(8, 6.5, -16.8, 3.2, 16, brass, 1, 0.3); gear(12.24, 8.95, -16.8, 2.0, 10, steel, -1, 0.3 * 3.2 / 2.0); gear(11.45, 3.6, -16.8, 1.6, 8, k.m(acc, { metalness: 0.4, roughness: 0.4 }), -1, 0.3 * 3.2 / 1.6);
  gear(-6.5, 8.3, -16.8, 1.8, 9, steel, 1, 0.45);
  if (clear(17.5, -6, 2.5, 7)) { add(k, world, box(0.6, 6, 0.6), dark, 17.5, 3, -6); gear(17.5, 5.6, -5.6, 2.2, 11, brass, 1, 0.5); gear(17.5, 2.2, -5.6, 1.3, 7, steel, -1, 0.5 * 2.2 / 1.3); gears[gears.length - 2][0].rotation.y = gears[gears.length - 1][0].rotation.y = faceY(17.5, -6); }
  k.anim.push((t) => gears.forEach(([m, s]) => { m.rotation.z = t * s; }));
  // 發光液體管線與儲槽
  const fluid = rep(canvas(64, 32, (g) => { g.fillStyle = '#0aa8c8'; g.fillRect(0, 0, 64, 32); g.fillStyle = '#9ffcff'; for (let i = 0; i < 3; i++) g.fillRect(i * 22, 0, 8, 32); }), 12, 1);
  const flM = new THREE.MeshStandardMaterial({ map: fluid, emissive: C('#ffffff'), emissiveMap: fluid, emissiveIntensity: k.night ? 1.4 : 0.6, roughness: 0.3 });
  const glassM = new THREE.MeshStandardMaterial({ color: 0xdff6ff, transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.3, depthWrite: false });
  const tankM = new THREE.MeshStandardMaterial({ color: C('#18c8e8'), emissive: C('#18c8e8'), emissiveIntensity: k.night ? 1.2 : 0.45, roughness: 0.2, transparent: true, opacity: 0.88 });
  k.anim.push((t) => { fluid.offset.x = -t * 0.8; tankM.emissiveIntensity = (k.night ? 1.0 : 0.35) + Math.sin(t * 2) * 0.2; });
  for (const sx of [-1, 1]) { const tx = sx * 5.4, tz = -12.8; add(k, world, cyl(1.15, 1.15, 4, 18), glassM, tx, 2.1, tz, {}).castShadow = false; add(k, world, cyl(1.0, 1.0, 2.6 + sx * 0.4, 16), tankM, tx, 1.4 + sx * 0.2, tz); add(k, world, cyl(1.25, 1.25, 0.25, 18), dark, tx, 4.15, tz); add(k, world, cyl(1.25, 1.35, 0.3, 18), dark, tx, 0.15, tz);
    for (const pts of [[[tx, 4.2, tz], [tx, 6.2, tz], [tx + sx * 2, 6.6, -16.2], [tx + sx * 4, 5.2, -16.6]], [[tx + sx * 1.0, 0.6, tz + 0.4], [tx + sx * 4, 0.6, tz + 1.2], [sx * 12.6, 0.6, -12.4]]]) { const cv = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))); add(k, world, new THREE.TubeGeometry(cv, 30, 0.3, 10), glassM, 0, 0, 0, {}).castShadow = false; add(k, world, new THREE.TubeGeometry(cv, 30, 0.18, 8), flM, 0, 0, 0); } }
  sprayPts(k, world, mobile ? 20 : 40, '#cffcff', 0.12, (i, t, o) => { const sx = i % 2 ? 1 : -1, u = (t * 0.4 + i * 0.13) % 1; o[0] = sx * 5.4 + Math.sin(i * 3.1) * 0.7; o[1] = 0.4 + u * (2.4 + sx * 0.4); o[2] = -12.8 + Math.cos(i * 2.3) * 0.7; }, { additive: true, opacity: 0.9 });
  // 輸送帶（零件一直往前送）＋機械手臂（焊接冒火花）
  const beltT = rep(canvas(64, 64, (g) => { g.fillStyle = '#26282c'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#3a3d42'; for (let y = 0; y < 64; y += 16) g.fillRect(0, y, 64, 5); }), 1, 16);
  let lastB = 0; k.anim.push((t) => { beltT.offset.y = -t * 0.6; lastB = t; });
  const items = [], tips = [];
  for (const sx of [-1, 1]) { const bx = sx * 13.2, z0 = -14, z1 = 2, L = z1 - z0, g = grp(bx, 0, (z0 + z1) / 2); world.add(g);
    add(k, g, box(1.7, 0.75, L), dark, 0, 0.4, 0); add(k, g, box(1.4, 0.06, L), new THREE.MeshStandardMaterial({ map: beltT, roughness: 0.9 }), 0, 0.8, 0); for (const s of [-1, 1]) add(k, g, box(0.12, 0.2, L), '#f2c230', s * 0.8, 0.85, 0);
    const n = Math.floor(L / 1.8), im = inst(g, box(0.6, 0.12, 1.0), tint('#ffffff', { roughness: 0.4, metalness: 0.3 }), n, { cull: false }); for (let i = 0; i < n; i++) im.setColorAt(i, C(['#1d1d1f', '#e8e8ec', acc, '#5fb8e8', '#ff7aa8'][i % 5])); items.push([im, n, L]);
    for (const az of [-9.5, -3]) { const ax = sx * 15.2; if (!clear(ax, az, 1, 3.4)) continue; const b = grp(ax, 0, az); b.rotation.y = sx > 0 ? 0 : Math.PI; world.add(b);
      add(k, b, cyl(0.5, 0.62, 0.4, 14), '#f28c28', 0, 0.2, 0); const turn = grp(0, 0.4, 0); b.add(turn); add(k, turn, cyl(0.38, 0.38, 0.3, 12), dark, 0, 0.15, 0);
      const sh = grp(0, 0.4, 0); turn.add(sh); add(k, sh, sph(0.26, 10, 8), steel, 0, 0, 0); add(k, sh, k.g('arm1', () => box(0.3, 1.6, 0.3).translate(0, 0.8, 0)), '#f28c28', 0, 0, 0);
      const el = grp(0, 1.6, 0); sh.add(el); add(k, el, sph(0.2, 10, 8), steel, 0, 0, 0); add(k, el, k.g('arm2', () => box(0.24, 1.3, 0.24).translate(0, 0.65, 0)), '#f28c28', 0, 0, 0);
      const tip = grp(0, 1.35, 0); el.add(tip); add(k, tip, cyl(0.08, 0.12, 0.3, 8), dark, 0, 0, 0); add(k, tip, sph(0.07, 8, 6), k.glow('#9fe8ff', 3), 0, 0.18, 0, false); tips.push(tip);
      const p0 = k.rnd() * 6; k.anim.push((t) => { turn.rotation.y = Math.sin(t * 0.9 + p0) * 0.45; sh.rotation.z = 0.7 + Math.sin(t * 1.4 + p0) * 0.2; el.rotation.z = 1.45 + Math.sin(t * 1.4 + p0 + 1) * 0.25; }); } }
  k.anim.push((t) => items.forEach(([im, n, L]) => { for (let i = 0; i < n; i++) { const u = ((t * 0.6 + i * 1.8) % L + L) % L, e = Math.min(1, u / 0.6, (L - u) / 0.6); setI(im, i, 0, 0.9, -L / 2 + u, Math.max(0.001, e)); } im.instanceMatrix.needsUpdate = true; }));
  const tw = tips.map(() => new THREE.Vector3()), NS = mobile ? 24 : 48;
  if (tips.length) sprayPts(k, world, NS * tips.length, '#ffc23a', 0.11, (i, t, o) => { const ti = i % tips.length, j = Math.floor(i / tips.length); if (j === 0) tips[ti].getWorldPosition(tw[ti]); const u = (t * 1.6 + j / NS) % 1, a = j * 2.39 + ti, v = 1.2 + (j % 4) * 0.4; const on = Math.sin(t * 1.3 + ti * 2) > -0.2; o[0] = tw[ti].x + Math.cos(a) * u * v * 0.9; o[1] = on ? tw[ti].y + 0.15 + u * v * 0.8 - u * u * 2.6 : -20; o[2] = tw[ti].z + Math.sin(a) * u * v * 0.9; }, { additive: true, opacity: 1 });
  // 無人機（四軸旋翼會轉，有的吊著包裹）
  const drones = [];
  for (let i = 0; i < (mobile ? 2 : 4); i++) { const g = grp(); world.add(g); add(k, g, box(0.5, 0.16, 0.5), '#f2f4f7', 0, 0, 0); for (const r of [Math.PI / 4, -Math.PI / 4]) add(k, g, box(1.0, 0.05, 0.08), dark, 0, 0.02, 0).rotation.y = r;
    const rot = []; for (const [x, z] of [[0.35, 0.35], [-0.35, 0.35], [0.35, -0.35], [-0.35, -0.35]]) { const p = add(k, g, k.g('rotor', () => box(0.42, 0.01, 0.05)), '#cfd3d8', x, 0.08, z, false); rot.push(p); }
    add(k, g, sph(0.06, 8, 6), k.glow(i % 2 ? '#3fffd0' : '#ff3b6b', 2.5), 0, -0.1, 0.25, false); if (i % 2 === 0) { add(k, g, box(0.35, 0.3, 0.35), '#c9a06b', 0, -0.45, 0); add(k, g, box(0.01, 0.3, 0.01), '#333333', 0, -0.22, 0); }
    drones.push({ g, rot, ph: i * 1.7, r: 9 + i * 1.6, y: 5.5 + i * 0.9 }); }
  k.anim.push((t) => drones.forEach(({ g, rot, ph, r, y }) => { const a = t * 0.18 + ph; g.position.set(Math.sin(a) * r, y + Math.sin(t * 1.3 + ph) * 0.5, -3 + Math.cos(a * 1.3) * r * 0.7); g.rotation.y = a; g.rotation.z = Math.sin(t + ph) * 0.08; rot.forEach((p, j) => { p.rotation.y = t * 30 + j; }); }));
  // 友善的大機器人雕像（會揮手、眨眼）
  const RX = -9.6, RZ = -14.2;
  if (clear(RX, RZ, 2.2, 9)) { const g = grp(RX, 0, RZ); g.rotation.y = faceY(RX, RZ, 0, 10); world.add(g); const wM = k.m('#f2f4f7', { roughness: 0.4 }), aM = k.m(acc, { roughness: 0.5 });
    add(k, g, box(3.2, 0.4, 2.2), dark, 0, 0.2, 0);
    for (const sx of [-1, 1]) { add(k, g, box(1.0, 0.5, 1.4), aM, sx * 0.7, 0.65, 0.15); add(k, g, cyl(0.35, 0.4, 2.2, 12), steel, sx * 0.7, 2.0, 0); }
    add(k, g, box(2.2, 0.6, 1.2), aM, 0, 3.3, 0); add(k, g, box(2.8, 2.6, 1.6), wM, 0, 4.9, 0);
    const heart = k.glow('#3fffd0', 2.4); add(k, g, box(1.4, 0.9, 0.05), k.m('#0b1a2a'), 0, 5.1, 0.81, false); add(k, g, sph(0.22, 12, 8), heart, 0, 5.1, 0.84, false);
    add(k, g, cyl(0.25, 0.3, 0.4, 10), steel, 0, 6.4, 0); const head = grp(0, 7.2, 0); g.add(head); add(k, head, box(2.0, 1.4, 1.4), wM, 0, 0, 0); add(k, head, box(1.7, 0.65, 0.05), k.m('#0b1a2a'), 0, 0.05, 0.71, false);
    const eyes = [-0.45, 0.45].map((x) => add(k, head, new THREE.CircleGeometry(0.2, 16), k.glow('#48f0c0', 2.8), x, 0.05, 0.74, false));
    add(k, head, cyl(0.04, 0.04, 0.8, 6), steel, 0, 1.1, 0); const bulb = add(k, head, sph(0.15, 10, 8), k.glow('#ff3b3b', 2.5), 0, 1.55, 0, false);
    for (const sx of [-1, 1]) add(k, head, cyl(0.25, 0.25, 0.2, 12), aM, sx * 1.1, 0, 0).rotation.z = Math.PI / 2;
    const arm = (sx) => { const p = grp(sx * 1.65, 5.8, 0); g.add(p); add(k, p, sph(0.38, 12, 8), aM, 0, 0, 0); add(k, p, k.g('rbU', () => box(0.5, 1.5, 0.5).translate(0, -0.85, 0)), wM, 0, 0, 0); const f = grp(0, -1.6, 0); p.add(f); add(k, f, k.g('rbF', () => box(0.42, 1.3, 0.42).translate(0, -0.7, 0)), wM, 0, 0, 0); add(k, f, sph(0.32, 10, 8), steel, 0, -1.5, 0); return [p, f]; };
    const [la] = arm(-1), [ra, rf] = arm(1); la.rotation.z = -0.15;
    k.anim.push((t) => { ra.rotation.z = 2.5 + Math.sin(t * 3) * 0.25; rf.rotation.z = 0.5 + Math.sin(t * 3 + 0.6) * 0.35; head.rotation.y = Math.sin(t * 0.6) * 0.2; const bl = (t % 4) < 0.15 ? 0.1 : 1; eyes.forEach((e) => { e.scale.y = bl; }); bulb.visible = Math.sin(t * 5) > -0.3; heart.emissiveIntensity = 1.6 + Math.sin(t * 4) * 1.0; antL.emissiveIntensity = Math.sin(t * 5 + 1) > 0 ? 2.8 : 0.3; }); }
  const spots = [{ x: -11.8, z: -5.2, face: [-13.2, -5.2], pose: 'work' }, { x: 11.8, z: -8, face: [13.2, -8], pose: 'work' }, { x: RX + 2.6, z: RZ + 2.8, face: [RX, RZ], pose: 'stand' }];
  return { spots, features: ['電路板維修實驗室', '輸送帶', '機械手臂', '大齒輪', '發光管線', '無人機', '大機器人'], heroH: 9.2, fog: [30, 110] };
}

// ================= 賽車場 =================
function racetrack({ k, world, pal, clear, mobile }) {
  const pad = canvas(512, 512, (g) => { g.fillStyle = '#d4d2cc'; g.fillRect(0, 0, 512, 512); g.save(); g.beginPath(); g.arc(256, 256, 256, 0, TAU); g.arc(256, 256, 236, 0, TAU, true); g.clip(); for (let i = 0; i < 64; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? '#1d1d1f' : '#ffffff'; g.beginPath(); g.moveTo(256, 256); g.arc(256, 256, 256 - j * 10, i / 64 * TAU, (i + 1) / 64 * TAU); g.fill(); } g.restore(); g.fillStyle = '#d4d2cc'; g.beginPath(); g.arc(256, 256, 236, 0, TAU); g.fill(); });
  ground(k, world, { color: '#6db24e', coreTex: pad, edge: '#d63a3a', edgeH: 0.2 });
  // 賽道（環繞廣場、有彎道與直線）＋紅白路緣石
  const P = [[0, 12.6], [9, 12.9], [15.6, 10.2], [18.2, 3.5], [18.2, -5], [15.8, -12.6], [8, -15.6], [-1, -14.4], [-8.5, -16.8], [-16, -13], [-18, -4], [-14.6, 3], [-17, 9.2], [-9.5, 12.8]];
  const curve = new THREE.CatmullRomCurve3(P.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'centripetal'), N = 320, len = curve.getLength(), pts = [];
  for (let i = 0; i <= N; i++) { const u = i / N, p = curve.getPointAt(u % 1), tg = curve.getTangentAt(u % 1); pts.push({ x: p.x, z: p.z, nx: -tg.z, nz: tg.x, s: u * len }); }
  const W = 3.2;
  world.add(flat(ribbon(pts, 0, W, 0.03), k.m('#45474c', { roughness: 0.9, side: THREE.DoubleSide }), 0, 0, 0));
  world.add(flat(ribbon(pts, [-W / 2 + 0.12, W / 2 - 0.12], 0.08, 0.04), k.m('#ffffff', { side: THREE.DoubleSide }), 0, 0, 0));
  const kerb = rep(canvas(16, 64, (g) => { g.fillStyle = '#e23a3a'; g.fillRect(0, 0, 16, 32); g.fillStyle = '#ffffff'; g.fillRect(0, 32, 16, 32); }), 1, 1 / 1.2);
  world.add(flat(ribbon(pts, [-W / 2 - 0.25, W / 2 + 0.25], 0.5, 0.035), new THREE.MeshStandardMaterial({ map: kerb, roughness: 0.7, side: THREE.DoubleSide }), 0, 0, 0));
  // 起跑線、起跑燈架（紅燈一顆一顆亮，全熄就開跑）
  let si = 0, best = 1e9; pts.forEach((p, i) => { const d = Math.hypot(p.x - 18.2, p.z + 1); if (d < best) { best = d; si = i; } });
  const sp = pts[si], sry = Math.atan2(-sp.nz, sp.nx) + Math.PI / 2;
  const chk = canvas(128, 32, (g) => { for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? '#1d1d1f' : '#ffffff'; g.fillRect(i * 8, j * 8, 8, 8); } });
  const sl = add(k, world, box(W, 0.01, 0.6), new THREE.MeshStandardMaterial({ map: chk }), sp.x, 0.045, sp.z); sl.rotation.y = Math.atan2(sp.nx, sp.nz) + Math.PI / 2; sl.castShadow = false;
  const lights = [];
  if (clear(sp.x, sp.z, 2.6, 5.2)) { const g = grp(sp.x, 0, sp.z); g.rotation.y = Math.atan2(sp.nx, sp.nz); world.add(g);
    for (const s of [-1, 1]) add(k, g, box(0.3, 5, 0.3), '#3a3d42', 0, 2.5, s * 2.4);
    add(k, g, box(0.45, 0.75, 5.2), [k.m('#1d1d1f'), k.m('#1d1d1f'), k.m('#1d1d1f'), k.m('#1d1d1f'), new THREE.MeshStandardMaterial({ map: chk }), new THREE.MeshStandardMaterial({ map: chk })], 0, 4.9, 0);
    for (let i = 0; i < 5; i++) { const m = basic('#3a0a0a'); lights.push(m); for (const s of [-1, 1]) add(k, g, new THREE.CircleGeometry(0.17, 14), m, s * 0.24, 4.9, -1.6 + i * 0.8, false).rotation.y = s * Math.PI / 2; } }
  k.anim.push((t) => { const u = t % 8; lights.forEach((m, i) => m.color.set(u > 0.6 * (i + 1) && u < 4.2 ? '#ff2a2a' : '#3a0a0a')); });
  // 方格旗（揮動）
  const chkM = new THREE.MeshStandardMaterial({ map: canvas(64, 48, (g) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 6; j++) { g.fillStyle = (i + j) % 2 ? '#1d1d1f' : '#ffffff'; g.fillRect(i * 8, j * 8, 8, 8); } }), side: THREE.DoubleSide });
  for (const [off, dz] of [[3.4, -2.4], [3.4, 2.6], [-3.3, 0]]) { const x = sp.x + sp.nx * off + dz * sp.nz * 0, z = sp.z + sp.nz * off; const px = x - sp.nz * dz * -1, pz = z + sp.nx * dz * -1; if (!clear(px, pz, 0.5, 4)) continue; add(k, world, cyl(0.05, 0.06, 4, 6), '#dddddd', px, 2, pz); flag(k, world, 1.6, 1.1, chkM, px, 3.4, pz, sry, { amp: 0.22, speed: 6 }); }
  // 維修站車庫（看得到裡面的車）＋維修道
  const GXc = 24.8;
  if (clear(GXc, -1, 3, 5)) { add(k, world, box(2.2, 0.02, 20), '#9a9ca0', 21.4, 0.03, -1, {}).castShadow = false;
    add(k, world, box(3.2, 3, 18), '#e8eaee', GXc, 1.5, -1); add(k, world, box(3.6, 1.4, 18.4), windowMat(k, '#cfd3d8', 3.6, 1.4, { cols: 10, rows: 1, glass: '#8fd3f2', lit: 0.8, seed: 5 }), GXc + 0.2, 3.7, -1); add(k, world, box(4.2, 0.15, 19), '#9aa3ad', GXc + 0.1, 4.45, -1);
    for (let i = 0; i < 5; i++) { const z = -8 + i * 3.5; add(k, world, box(0.05, 2.2, 2.8), '#1a1b1e', GXc - 1.61, 1.1, z); add(k, world, box(0.06, 0.5, 2.8), [hex(pal[0]), '#e23a3a', '#2f6fb0', '#f2c230', '#2ecc71'][i], GXc - 1.63, 2.6, z); }
    for (let i = 0; i < 6; i++) flag(k, world, 0.8, 0.5, k.m([hex(pal[0]), '#e23a3a', '#2f6fb0', '#f2c230', '#2ecc71', '#ffffff'][i], { side: THREE.DoubleSide }), GXc - 1.5, 5.6, -8.5 + i * 3, Math.PI / 2);
    for (let i = 0; i < 6; i++) add(k, world, cyl(0.04, 0.04, 1.3, 5), '#dddddd', GXc - 1.5, 5.05, -8.5 + i * 3); }
  // 輪胎牆（彎道外側）、碎石緩衝區
  const ty = [], gravel = [];
  for (let i = 0; i < N; i += 4) { const a = pts[i], b = pts[(i + 4) % N], turn = Math.abs(a.nx * b.nz - a.nz * b.nx); if (turn < 0.08) continue; const s = a.x * a.nx + a.z * a.nz > 0 ? 1 : -1, x = a.x + a.nx * s * 3.0, z = a.z + a.nz * s * 3.0; if (Math.hypot(x, z) < CORE + 1) continue; ty.push([x, z]); if (i % 16 === 0) gravel.push([a.x + a.nx * s * 2.6, a.z + a.nz * s * 2.6]); }
  const tyre = inst(world, k.g('tyre', () => new THREE.TorusGeometry(0.3, 0.14, 6, 12).rotateX(Math.PI / 2)), tint('#ffffff', { roughness: 0.9 }), ty.length * 3);
  ty.forEach(([x, z], i) => { for (let j = 0; j < 3; j++) { setI(tyre, i * 3 + j, x, 0.14 + j * 0.27, z); tyre.setColorAt(i * 3 + j, C(i % 2 ? '#e23a3a' : '#f4f4f4')); } });
  const gv = inst(world, new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2), k.m('#d9c7a0', { roughness: 1 }), gravel.length); gravel.forEach(([x, z], i) => setI(gv, i, x, 0.012, z, 1.6, 1, 1.6));
  // 看台
  const stand = (x, z, ry, w, tiers) => { if (!clear(x, z, w / 2, tiers * 0.5 + 3)) return; const g = grp(x, 0, z); g.rotation.y = ry; world.add(g); const ps = [];
    for (let i = 0; i < tiers; i++) { const th = (i + 1) * 0.5; add(k, g, box(w, th, 0.9), i % 2 ? '#d9dde2' : '#c4c9cf', 0, th / 2, -i * 0.9); for (let xx = -w / 2 + 0.35; xx < w / 2 - 0.3; xx += 0.55) if (k.rnd() < (mobile ? 0.4 : 0.7)) ps.push([xx, th, -i * 0.9 + 0.05]); }
    crowd(k, g, ps, { s: 0.9, bounce: 0.08 });
    const top = tiers * 0.5 + 2.5; for (const sx of [-0.45, 0.45]) add(k, g, box(0.25, top, 0.25), '#9aa3ad', sx * w, top / 2, -tiers * 0.9 + 0.2); add(k, g, box(w + 1, 0.2, tiers * 0.9 + 1.4), hex(pal[0]), 0, top, -tiers * 0.45 + 0.2).rotation.x = -0.07; };
  stand(-5, -21, 0, 18, 6); stand(-23.5, -2, Math.PI / 2, 14, 5);
  // 賽車（速度有快有慢，會超車）
  const cars = [], cc = [hex(pal[0]), '#e23a3a', '#2f6fb0', '#f2c230', '#2ecc71', '#ff7aa8'];
  for (let i = 0; i < (mobile ? 4 : 6); i++) { const g = grp(); world.add(g); const bm = k.m(cc[i], { roughness: 0.3, metalness: 0.3 });
    add(k, g, box(0.7, 0.28, 2.0), bm, 0, 0.3, 0); add(k, g, box(0.36, 0.2, 0.9), bm, 0, 0.3, 1.3); add(k, g, box(1.15, 0.05, 0.3), '#1d1d1f', 0, 0.2, 1.7);
    add(k, g, box(1.0, 0.22, 0.9), bm, 0, 0.28, -0.1); add(k, g, box(1.0, 0.06, 0.32), bm, 0, 0.78, -0.95); add(k, g, box(0.12, 0.35, 0.12), '#1d1d1f', 0, 0.58, -0.9); add(k, g, sph(0.15, 10, 8), i % 2 ? '#ffffff' : '#f2c230', 0, 0.55, 0.15);
    const wh = []; for (const [x, z, r] of [[0.6, 0.85, 0.22], [-0.6, 0.85, 0.22], [0.62, -0.7, 0.26], [-0.62, -0.7, 0.26]]) { const w = add(k, g, k.g('cw' + r, () => cyl(r, r, 0.26, 12)), '#1d1d1f', x, r, z); w.rotation.z = Math.PI / 2; wh.push(w); }
    g.scale.setScalar(1.1); cars.push({ g, wh, u: i / 6, ph: i * 1.3 }); }
  const cp = new THREE.Vector3(), ct = new THREE.Vector3(); let lastC = 0;
  k.anim.push((t) => { const dt = Math.max(0, Math.min(0.05, t - lastC)); lastC = t; cars.forEach((c, i) => { const v = 9 + Math.sin(t * 0.35 + c.ph) * 1.8; c.u = ((c.u + v * dt / len) % 1 + 1) % 1; curve.getPointAt(c.u, cp); curve.getTangentAt(c.u, ct); const off = Math.sin(t * 0.3 + i * 2.1) * 0.75; c.g.position.set(cp.x - ct.z * off, 0.04, cp.z + ct.x * off); c.g.rotation.y = Math.atan2(ct.x, ct.z); c.wh.forEach((w) => { w.rotation.x += dt * v / 0.24; }); }); });
  // 洗車美容站（主建築）：開放式洗車道、會轉的泡沫刷、來回移動的洗車門架
  const h = grp(HX, 0.12, HZ); world.add(h); const BH = 4.2, op = 3.6, oh = 3.0, sw = (HW - op) / 2;
  const wallM = k.m('#f4f6f8', { roughness: 0.6 });
  for (const s of [-1, 1]) add(k, h, box(sw, BH, HD), windowMat(k, '#f4f6f8', sw, BH, { cols: 2, rows: 2, glass: '#8fd3f2', lit: 0.7, seed: 13 }), s * (op / 2 + sw / 2), BH / 2, 0);
  add(k, h, box(op, BH - oh, HD), wallM, 0, oh + (BH - oh) / 2, 0); add(k, h, box(op, oh, 0.2), k.night ? k.glow('#5fb8e8', 0.6) : k.m('#bfe3f5'), 0, oh / 2, -HD / 2 + 0.1);
  add(k, h, box(op, 0.05, HD), '#7d8a96', 0, 0.03, 0); add(k, h, box(HW + 0.04, 0.35, HD + 0.04), '#2a7fd4', 0, 3.3, 0);
  const sign = nameSign(k, op + 0.6, 0.6, '#0d3b66', '#ffffff'); sign.position.set(0, oh + 0.6, HD / 2 + 0.05); h.add(sign);
  add(k, h, box(HW + 0.6, 0.2, HD + 0.8), '#2a7fd4', 0, BH + 0.1, 0.2);
  const drop = grp(0, BH + 1.25, -0.4); h.add(drop); const dm = k.m('#5fc3ff', { roughness: 0.1, metalness: 0.2 }); add(k, drop, sph(0.85, 20, 14), dm, 0, 0, 0); add(k, drop, cone(0.75, 1.3, 20), dm, 0, 0.95, 0);
  const sedan = grp(0, 0, -0.4); h.add(sedan); const sm = k.m(hex(pal[1]), { roughness: 0.2, metalness: 0.4 });
  add(k, sedan, box(1.5, 0.55, 3.0), sm, 0, 0.55, 0); add(k, sedan, box(1.3, 0.5, 1.6), k.m('#2b3440', { roughness: 0.1 }), 0, 1.07, -0.2); for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(k, sedan, k.g('sedw', () => cyl(0.3, 0.3, 0.2, 12)), '#1d1d1f', sx * 0.72, 0.3, sz * 1.0).rotation.z = Math.PI / 2;
  const gantry = grp(0, 0, 0); h.add(gantry); for (const sx of [-1, 1]) add(k, gantry, box(0.2, oh - 0.1, 0.3), '#cfd3d8', sx * 1.7, (oh - 0.1) / 2, 0); add(k, gantry, box(3.6, 0.25, 0.35), '#cfd3d8', 0, oh - 0.2, 0);
  const bt = rep(stripeTex('#2a7fd4', '#ff7aa8', 10), 2, 1), brM = new THREE.MeshStandardMaterial({ map: bt, roughness: 0.9 });
  const brushes = [-1, 1].map((sx) => add(k, gantry, cyl(0.42, 0.42, 2.3, 16), brM, sx * 1.22, 1.35, 0));
  const top = add(k, gantry, cyl(0.32, 0.32, 2.2, 16), brM, 0, 1.95, 0.3); top.rotation.z = Math.PI / 2;
  const foam = []; for (let i = 0; i < 14; i++) foam.push([(k.rnd() - 0.5) * 1.4, 1.1 + k.rnd() * 0.5, -1.4 + k.rnd() * 2.8, 0.18 + k.rnd() * 0.18]);
  const fi = inst(sedan, k.g('cfoam', () => new THREE.IcosahedronGeometry(1, 1)), k.m('#ffffff', { roughness: 0.95 }), foam.length, { cull: false });
  k.anim.push((t) => { gantry.position.z = -0.4 + Math.sin(t * 0.45) * 1.0; brushes.forEach((b, i) => { b.rotation.y = t * (i ? -9 : 9); }); top.rotation.x = t * 8; drop.rotation.y = t * 0.6; drop.position.y = BH + 1.25 + Math.sin(t * 1.6) * 0.12; foam.forEach(([x, y, z, r], i) => setI(fi, i, x, y, z, r * (0.85 + Math.sin(t * 2 + i) * 0.2))); fi.instanceMatrix.needsUpdate = true; });
  bubbles(k, world, mobile ? 14 : 28, (i, c) => [HX + (hr(i, c) - 0.5) * 3, 1.2, HZ + (hr(i, c, 1) - 0.5) * 2.5 + 0.6], { rise: 5, size: 0.18, speed: 0.14 });
  // 遠方的樹
  const tr = []; ringOut(k, clear, mobile ? 10 : 20, 25, 40, 5, 1.5, (x, z) => { tr.push([x, z, 0.9 + k.rnd() * 0.6]); return 1; }, { front: false });
  const tt = inst(world, k.g('rtTrunk', () => cyl(0.15, 0.22, 1.6, 6).translate(0, 0.8, 0)), k.m('#7a5236'), tr.length, { cast: true }), tc = inst(world, k.g('rtCrown', () => new THREE.IcosahedronGeometry(1.3, 1)), tint('#ffffff', { flatShading: true }), tr.length, { cast: true });
  tr.forEach(([x, z, s], i) => { setI(tt, i, x, 0, z, s); setI(tc, i, x, 2.4 * s, z, s); tc.setColorAt(i, C(['#3d8a45', '#4fae5b', '#2f7a3a'][i % 3])); });
  const spots = [{ x: 20.8, z: -5.0, face: [21.4, -3], pose: 'work', hat: 'cap' }, { x: 20.6, z: 2.4, face: [24, 2.4], pose: 'stand', hat: 'cap' }, { x: sp.x + sp.nx * 3.6, z: sp.z + sp.nz * 3.6 + 1.2, face: [sp.x, sp.z], pose: 'stand' }];
  return { spots, features: ['賽道', '賽車', '洗車美容站', '泡沫刷', '起跑燈', '方格旗', '維修站車庫', '輪胎牆'], heroH: 6.6 };
}

// ================= 蜂巢花谷 =================
function beehive({ k, world, pal, clear, mobile }) {
  const R = 64, HH = Math.round(Math.sqrt(3) * R);
  const comb = rep(canvas(3 * R, HH, (g) => { g.fillStyle = '#b9771a'; g.fillRect(0, 0, 3 * R, HH); const cs = ['#f2b632', '#f7c64a', '#e8a317']; let n = 0;
    for (let i = -1; i <= 2; i++) for (let j = -1; j <= 2; j++) { const cx = i * 1.5 * R, cy = j * HH + (Math.abs(i) % 2 ? HH / 2 : 0); g.fillStyle = cs[(n++) % 3]; g.beginPath(); for (let a = 0; a < 6; a++) g.lineTo(cx + Math.cos(a / 6 * TAU) * (R - 5), cy + Math.sin(a / 6 * TAU) * (R - 5)); g.fill(); } }), 9, 9);
  ground(k, world, { color: '#9ccc5a', coreTex: comb, edge: '#c98a1c', edgeH: 0.3 });
  const honey = k.m('#e8a317', { roughness: 0.35 }), honeyD = k.m('#c98a1c', { roughness: 0.5 });
  // 起伏的山丘（遠方有一片片向日葵）
  const hills = [[-34, -16, 16, '#8cc152'], [36, -20, 18, '#a0cf5e'], [0, -50, 26, '#7bb54a'], [-22, -44, 18, '#93c654'], [26, -48, 20, '#86bd4e'], [-46, 6, 14, '#a0cf5e'], [48, 4, 14, '#8cc152']];
  for (const [x, z, r, c] of hills) add(k, world, sph(1, 28, 12), k.m(c, { roughness: 1 }), x, -r * 0.05, z, {}).scale.set(r, r * 0.32, r);
  // 野花草原（各色小花）
  const NF = mobile ? 450 : 1000, fl = inst(world, k.g('wfl', () => new THREE.IcosahedronGeometry(0.11, 0)), tint('#ffffff', { roughness: 0.6 }), NF + (mobile ? 150 : 320));
  const fc = ['#ffffff', '#ff8fb1', '#b99bff', '#ffd23f', '#ff8a3d', '#7fc8ff', '#ff5a6a'];
  for (let i = 0; i < NF; i++) { const a = k.rnd() * TAU, r = CORE + 0.7 + Math.pow(k.rnd(), 0.8) * 26, x = Math.sin(a) * r, z = Math.cos(a) * r; setI(fl, i, x, 0.12 + k.rnd() * 0.12, z, 0.8 + k.rnd() * 0.6); fl.setColorAt(i, C(fc[i % fc.length])); }
  for (let i = NF; i < fl.count; i++) { const [x, z, r] = hills[i % 5], a = k.rnd() * TAU, d = Math.sqrt(k.rnd()) * r * 0.8, px = x + Math.sin(a) * d, pz = z + Math.cos(a) * d, y = Math.sqrt(Math.max(0, 1 - (d / r) ** 2)) * r * 0.32 - r * 0.05; setI(fl, i, px, y + 0.05, pz, 2.6); fl.setColorAt(i, C(i % 3 ? '#ffd23f' : '#f7a81b')); }
  // 向日葵花田（隨風擺動）
  const petal = canvas(128, 128, (g) => { g.fillStyle = '#ffc61a'; for (let i = 0; i < 16; i++) { g.save(); g.translate(64, 64); g.rotate(i / 16 * TAU); g.beginPath(); g.ellipse(0, -40, 9, 22, 0, 0, TAU); g.fill(); g.restore(); } g.fillStyle = '#6b3f16'; g.beginPath(); g.arc(64, 64, 26, 0, TAU); g.fill(); g.fillStyle = '#4a2a0e'; for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(64 + Math.cos(i * 2.4) * Math.sqrt(i) * 3.8, 64 + Math.sin(i * 2.4) * Math.sqrt(i) * 3.8, 1.6, 0, TAU); g.fill(); } });
  const sf = [];
  for (const [x0, z0, x1, z1] of [[-23, -19, -12, -7], [12, -21, 23, -9], [-21, 6, -13, 12], [13, 5, 21, 11]]) for (let x = x0; x <= x1; x += mobile ? 1.5 : 1.0) for (let z = z0; z <= z1; z += mobile ? 1.6 : 1.2) { const px = x + (hr(x, z) - 0.5) * 0.6, pz = z + (hr(z, x) - 0.5) * 0.6; if (z0 > 0 && pz > 9.5 && Math.abs(px) < 16) continue; if (!clear(px, pz, 0.3, 2.6)) continue; sf.push([px, pz, 1.7 + hr(px, pz, 2) * 0.9, faceY(px, pz, 0, 26) * 0.5 + (hr(px, pz, 3) - 0.5) * 0.4]); }
  const stems = inst(world, k.g('sfStem', () => cyl(0.05, 0.07, 1, 6).translate(0, 0.5, 0)), k.m('#4f8a2f'), sf.length, { cull: false }), heads = inst(world, k.g('sfHead', () => new THREE.CircleGeometry(0.5, 20)), new THREE.MeshStandardMaterial({ map: petal, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.7 }), sf.length, { cull: false });
  const leaves = inst(world, k.g('sfLeaf', () => sph(0.2, 8, 6).scale(1.4, 0.25, 0.7)), k.m('#5a9a35'), sf.length * 2);
  sf.forEach(([x, z, hh, ry], i) => { setI(leaves, i * 2, x + 0.18, hh * 0.45, z, 1, 1, 1, 0, ry, 0.4); setI(leaves, i * 2 + 1, x - 0.18, hh * 0.6, z, 1, 1, 1, 0, ry + Math.PI, 0.4); });
  k.anim.push((t) => { sf.forEach(([x, z, hh, ry], i) => { const s = Math.sin(t * 1.2 + x * 0.3 + z * 0.2) * 0.07; setI(stems, i, x, 0.1, z, 1, hh, 1, 0, 0, s); setI(heads, i, x - Math.sin(s) * hh, 0.1 + hh * Math.cos(s), z, 1, 1, 1, -0.25, ry, s); }); stems.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = true; });
  // 蜂巢小屋（主建築）：一格一格的六角形蜂巢、發光窗戶、蜂蜜往下滴、屋頂的大蜜蜂
  const h = grp(HX, 0.12, HZ); world.add(h); const r = 1.24, D = HD - 0.2, c0 = 0.5 + r;
  add(k, h, box(HW + 0.2, 0.5, HD), '#8a5a2a', 0, 0.25, 0);
  add(k, h, box(HW - 0.8, 5.0, 0.3), honeyD, 0, 3.0, -D / 2 + 0.2);
  const cellG = k.g('hexcell', () => new THREE.CylinderGeometry(r * 0.96, r * 0.96, D, 6, 1).rotateX(Math.PI / 2)), winG = k.g('hexwin', () => new THREE.CylinderGeometry(r * 0.7, r * 0.7, 0.1, 6, 1).rotateX(Math.PI / 2));
  const winM = k.night ? k.glow('#ffb43a', 1.8) : k.m('#ffd36b', { roughness: 0.1, metalness: 0.2 }), cellM = [honey, honeyD, honeyD];
  const sx3 = Math.sqrt(3) * r, cells = [[-sx3, c0], [0, c0], [sx3, c0], [-sx3 / 2, c0 + 1.5 * r], [sx3 / 2, c0 + 1.5 * r], [0, c0 + 3 * r]];
  cells.forEach(([x, y], i) => { add(k, h, cellG, cellM, x, y, 0); add(k, h, winG, i === 1 ? k.m('#6b3f16') : winM, x, y, D / 2 + 0.02, false); if (i === 1) add(k, h, sph(0.08, 8, 6), '#f0c04a', 0.4, y - 0.1, D / 2 + 0.1); });
  const sign = nameSign(k, 3.4, 0.55, '#6b3f16', '#ffe08a'); sign.position.set(0, c0 + r * 1.02, D / 2 + 0.15); h.add(sign);
  const hm = new THREE.MeshStandardMaterial({ color: C('#f2a31b'), roughness: 0.12, metalness: 0.05, transparent: true, opacity: 0.9, emissive: C('#c46a00'), emissiveIntensity: k.night ? 0.5 : 0.15 });
  add(k, h, sph(1, 20, 10, 0, TAU, 0, Math.PI / 2), hm, 0, c0 + 3 * r + 0.9, 0.2).scale.set(1.0, 0.45, 1.6);
  const drips = [];
  for (const [x, y] of [[-sx3 / 2, c0 + 1.5 * r - r * 0.96], [sx3 / 2, c0 + 1.5 * r - r * 0.96], [0, c0 + 3 * r - r * 0.96], [-sx3 - 0.6, c0 + 0.3], [sx3 + 0.6, c0 + 0.3], [0, c0 + 3 * r + 0.6]]) { const d = add(k, h, k.g('drip', () => sph(0.1, 10, 8).translate(0, -0.1, 0)), hm, x, y, D / 2 + 0.05, false), drop = add(k, h, k.g('drop', () => sph(0.08, 8, 6)), hm, x, y, D / 2 + 0.05, false); drips.push([d, drop, y, drips.length]); }
  k.anim.push((t) => drips.forEach(([d, drop, y, i]) => { const u = (t * 0.25 + i * 0.37) % 1; d.scale.set(1, 1 + Math.min(u, 0.7) * 3, 1); if (u > 0.7) { const f = (u - 0.7) / 0.3; drop.visible = true; drop.position.y = y - 0.5 - f * f * (y - 0.4); } else drop.visible = false; }));
  const stripeB = canvas(64, 64, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#1d1d1f' : '#ffc61a'; g.fillRect(0, i * 8, 64, 8); } });
  const beeM = new THREE.MeshStandardMaterial({ map: stripeB, roughness: 0.5 }), wingM = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, side: THREE.DoubleSide, roughness: 0.2, depthWrite: false });
  const mb = grp(0, c0 + 3 * r + 2.2, 0.4); h.add(mb); mb.scale.setScalar(1.6);
  add(k, mb, sph(0.5, 18, 12).scale(0.85, 1.35, 0.85).rotateX(Math.PI / 2), beeM, 0, 0, 0); add(k, mb, sph(0.32, 14, 10), '#1d1d1f', 0, 0.05, 0.72);
  for (const sx of [-1, 1]) { add(k, mb, sph(0.1, 10, 8), '#ffffff', sx * 0.14, 0.15, 0.98); add(k, mb, sph(0.05, 8, 6), '#1d1d1f', sx * 0.14, 0.16, 1.06); rod(k, mb, [sx * 0.1, 0.3, 0.8], [sx * 0.3, 0.75, 1.0], 0.02, '#1d1d1f', 5); add(k, mb, sph(0.06, 8, 6), '#1d1d1f', sx * 0.3, 0.77, 1.0); }
  add(k, mb, cone(0.1, 0.3, 8), '#1d1d1f', 0, 0, -0.78).rotation.x = -Math.PI / 2;
  const bw = [-1, 1].map((sx) => { const p = grp(sx * 0.2, 0.38, 0); mb.add(p); add(k, p, new THREE.PlaneGeometry(0.9, 0.5).translate(sx * 0.45, 0, 0).rotateX(-Math.PI / 2), wingM, 0, 0, 0, false); return [p, sx]; });
  k.anim.push((t) => { mb.position.y = c0 + 3 * r + 2.2 + Math.sin(t * 1.4) * 0.2; mb.rotation.y = Math.sin(t * 0.5) * 0.4; bw.forEach(([p, sx]) => { p.rotation.z = sx * Math.sin(t * 30) * 0.5; }); });
  // 周圍的巨型六角蜂巢大樓
  const hexWin = (hh) => { const t = rep(canvas(64, 64, (g) => { g.fillStyle = '#f0b030'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#c98a1c'; g.fillRect(0, 60, 64, 4); g.fillStyle = '#7a4a10'; g.beginPath(); for (let a = 0; a < 6; a++) g.lineTo(32 + Math.cos(a / 6 * TAU + Math.PI / 6) * 16, 30 + Math.sin(a / 6 * TAU + Math.PI / 6) * 16); g.fill(); }), 6, Math.round(hh / 1.4)); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }); };
  const nightWin = (hh) => { const m = hexWin(hh); if (k.night) { m.emissive = C('#ffb43a'); m.emissiveIntensity = 0.35; } return m; };
  const capM = k.m('#c98a1c'), hexG = k.g('hexT', () => new THREE.CylinderGeometry(1.6, 1.6, 1, 6).translate(0, 0.5, 0));
  for (const [cx, cz, n] of [[-15, -15, 5], [16.5, -16, 5], [-25, -5, 3], [25, -4, 3], [5, -27, 4]]) { const ds = Math.sqrt(3) * 1.6, offs = [[0, 0], [ds, 0], [ds / 2, ds * 0.866], [-ds / 2, ds * 0.866], [-ds, 0], [-ds / 2, -ds * 0.866]];
    for (let i = 0; i < n; i++) { const x = cx + offs[i][0], z = cz + offs[i][1]; const hh = 3 + hr(x, z) * 6 + (i === 0 ? 3 : 0); if (!clear(x, z, 1.7, hh)) continue; const m = add(k, world, hexG, [nightWin(hh), capM, capM], x, 0, z); m.scale.y = hh; m.rotation.y = Math.PI / 2; if (i === 0) add(k, world, sph(1, 16, 8, 0, TAU, 0, Math.PI / 2), hm, x, hh, z).scale.set(1.3, 0.5, 1.3); } }
  // 蜂箱
  const boxC = ['#fff8e8', '#ffe08a', '#c8f2dc', '#cfe3f2', '#ffd1e3'], hives = [];
  ringOut(k, clear, mobile ? 5 : 9, 11, 17, 1.8, 0.8, (x, z) => { const g = grp(x, 0, z); g.rotation.y = faceY(x, z) + (k.rnd() - 0.5) * 0.5; world.add(g); add(k, g, box(1.0, 0.4, 0.8), '#6b4a35', 0, 0.2, 0); const n = 2 + Math.floor(k.rnd() * 2);
    for (let i = 0; i < n; i++) add(k, g, box(0.95, 0.45, 0.75), boxC[(i + hives.length) % 5], 0, 0.62 + i * 0.46, 0); add(k, g, box(1.1, 0.12, 0.9), '#e8e8ec', 0, 0.46 + n * 0.46, 0); add(k, g, box(0.5, 0.06, 0.02), '#1d1d1f', 0, 0.5, 0.39, false); hives.push([x, z]); return 1; }, { front: false });
  // 蜂蜜噴泉（六角形水池、蜂蜜從上面流下來）
  const flow = rep(canvas(32, 64, (g) => { const gr = g.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, '#ffcc4a'); gr.addColorStop(0.5, '#e8920f'); gr.addColorStop(1, '#ffcc4a'); g.fillStyle = gr; g.fillRect(0, 0, 32, 64); }), 1, 2);
  const flowM = new THREE.MeshStandardMaterial({ map: flow, roughness: 0.1, transparent: true, opacity: 0.88, emissive: C('#c46a00'), emissiveIntensity: k.night ? 0.5 : 0.15 });
  k.anim.push((t) => { flow.offset.y = t * 0.8; });
  let fpos = null; for (const [x, z] of [[12.2, 3.5], [14.6, 4.5], [-14.6, 4], [14.8, -2.5], [-14.8, -3], [16, 8], [-16, 8]]) if (clear(x, z, 2.3, 3.2)) { fpos = [x, z]; break; }
  if (fpos) { const [x, z] = fpos, g = grp(x, 0, z); world.add(g); add(k, g, cyl(2.0, 2.2, 0.6, 6), '#e8d2a0', 0, 0.3, 0); add(k, g, cyl(1.85, 1.85, 0.05, 6), flowM, 0, 0.6, 0); add(k, g, cyl(0.3, 0.4, 1.5, 6), '#e8d2a0', 0, 1.3, 0); add(k, g, cyl(1.0, 0.5, 0.4, 6), '#e8d2a0', 0, 2.2, 0); add(k, g, cyl(0.92, 0.92, 0.05, 6), flowM, 0, 2.41, 0);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + Math.PI / 6; add(k, g, cyl(0.07, 0.1, 1.75, 6, true), flowM, Math.sin(a) * 0.93, 1.5, Math.cos(a) * 0.93, {}).castShadow = false; }
    const dp = grp(0, 2.4, 0); dp.rotation.z = 0.35; g.add(dp); add(k, dp, cyl(0.06, 0.06, 1.8, 8), '#a0643a', 0, 1.2, 0); for (let i = 0; i < 4; i++) add(k, dp, cyl(0.28 - Math.abs(i - 1.5) * 0.05, 0.28 - Math.abs(i - 1.5) * 0.05, 0.12, 12), '#c98a4a', 0, 0.25 + i * 0.15, 0);
    add(k, dp, cyl(0.05, 0.08, 0.5, 6, true), flowM, 0, -0.1, 0, {}).castShadow = false; }
  // 蜂蜜推車
  let cpos = null; for (const [x, z] of [[-11.4, 5.2], [-14, 7], [14, 7.5], [-15, -0.5], [15.2, 0.5], [-10, 12.5], [10, 12.5]]) if ((!fpos || Math.hypot(x - fpos[0], z - fpos[1]) > 4.5) && clear(x, z, 1.6, 2.5)) { cpos = [x, z]; break; }
  if (cpos) { const [x, z] = cpos, g = grp(x, 0, z); g.rotation.y = faceY(x, z) + Math.PI / 2; world.add(g); const wood = k.m('#a0643a');
    add(k, g, box(2.4, 0.5, 1.3), wood, 0, 0.9, 0); for (const sz of [-1, 1]) add(k, g, box(2.4, 0.35, 0.06), '#8a5a3a', 0, 1.3, sz * 0.65);
    const wt = canvas(128, 128, (q) => { q.strokeStyle = '#6b4a35'; q.lineWidth = 14; q.beginPath(); q.arc(64, 64, 56, 0, TAU); q.stroke(); q.lineWidth = 7; for (let i = 0; i < 6; i++) { q.beginPath(); q.moveTo(64, 64); q.lineTo(64 + Math.cos(i / 6 * TAU) * 56, 64 + Math.sin(i / 6 * TAU) * 56); q.stroke(); } q.fillStyle = '#6b4a35'; q.beginPath(); q.arc(64, 64, 12, 0, TAU); q.fill(); });
    const wm = new THREE.MeshStandardMaterial({ map: wt, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
    for (const sz of [-1, 1]) add(k, g, cyl(0.6, 0.6, 0.1, 20), [k.m('#6b4a35'), wm, wm], 0.3, 0.6, sz * 0.75).rotation.x = Math.PI / 2;
    for (const sz of [-0.4, 0.4]) add(k, g, box(1.3, 0.08, 0.08), wood, -1.8, 0.85, sz);
    for (const [px, pz] of [[-1.1, -0.6], [1.1, -0.6], [-1.1, 0.6], [1.1, 0.6]]) add(k, g, cyl(0.04, 0.04, 1.3, 6), '#8a5a3a', px, 1.8, pz);
    add(k, g, box(2.7, 0.08, 1.6), new THREE.MeshStandardMaterial({ map: stripeTex('#ffc61a', '#ffffff', 8) }), 0, 2.48, 0);
    const jm = new THREE.MeshStandardMaterial({ color: C('#f2a31b'), roughness: 0.1, transparent: true, opacity: 0.9 }), jar = inst(g, k.g('jar', () => cyl(0.14, 0.14, 0.3, 10)), jm, 10), lid = inst(g, k.g('lid', () => cyl(0.15, 0.15, 0.07, 10)), k.m('#c0392b'), 10);
    for (let i = 0; i < 10; i++) { const jx = -0.95 + (i % 5) * 0.47, jz = i < 5 ? -0.3 : 0.3; setI(jar, i, jx, 1.3, jz); setI(lid, i, jx, 1.49, jz); }
    const st = canvas(128, 48, (q) => { q.fillStyle = '#6b3f16'; q.fillRect(0, 0, 128, 48); q.fillStyle = '#ffe08a'; q.font = '800 30px "Noto Sans TC", sans-serif'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText('蜂蜜', 64, 26); });
    for (const sz of [-1, 1]) { const s = add(k, g, box(1.2, 0.36, 0.04), new THREE.MeshStandardMaterial({ map: st }), 0, 2.25, sz * 0.82); s.rotation.y = sz > 0 ? 0 : Math.PI; } }
  // 嗡嗡飛的蜜蜂（繞著花、蜂箱、主建築飛八字）
  const NB = mobile ? 12 : 26, centers = [[HX, 3.5, HERO.z1 + 1.5], ...hives.map(([x, z]) => [x, 1.6, z]), ...(fpos ? [[fpos[0], 2.4, fpos[1]]] : []), [-17, 2.6, -12], [17, 2.6, -14], [-16, 2.2, 9], [16, 2.2, 8]];
  const bees = [...Array(NB)].map((_, i) => { const c = centers[i % centers.length]; return { c, rx: 0.8 + hr(i) * 1.8, rz: 0.6 + hr(i, 1) * 1.4, sp: 0.6 + hr(i, 2) * 0.6, ph: hr(i, 3) * TAU }; });
  const bb = inst(world, k.g('beeB', () => sph(0.14, 12, 8).scale(0.85, 1.35, 0.85).rotateX(Math.PI / 2)), beeM, NB, { cull: false });
  const wL = inst(world, k.g('beeWL', () => new THREE.PlaneGeometry(0.22, 0.12).translate(-0.11, 0, 0).rotateX(-Math.PI / 2)), wingM, NB, { cull: false }), wR = inst(world, k.g('beeWR', () => new THREE.PlaneGeometry(0.22, 0.12).translate(0.11, 0, 0).rotateX(-Math.PI / 2)), wingM, NB, { cull: false });
  const bpos = (b, t, o) => { const a = t * b.sp + b.ph; o.set(b.c[0] + Math.sin(a) * b.rx, b.c[1] + Math.sin(t * 3 + b.ph) * 0.3, b.c[2] + Math.sin(2 * a) * b.rz); return o; };
  const pA = new THREE.Vector3(), pB = new THREE.Vector3(), q2 = new THREE.Quaternion(), e2 = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
  k.anim.push((t) => { bees.forEach((b, i) => { bpos(b, t, pA); bpos(b, t + 0.05, pB); const yaw = Math.atan2(pB.x - pA.x, pB.z - pA.z); q2.setFromEuler(e2.set(0, yaw, 0)); M4b.compose(pA, q2, one); bb.setMatrixAt(i, M4b); const f = Math.sin(t * 40 + i) * 0.6;
    for (const [im, s] of [[wL, -1], [wR, 1]]) { EU.set(0, 0, s * f); QQ.setFromEuler(EU); M4.compose(V3.set(s * 0.03, 0.1, 0), QQ, S3.set(1, 1, 1)); M4.premultiply(M4b); im.setMatrixAt(i, M4); } }); bb.instanceMatrix.needsUpdate = wL.instanceMatrix.needsUpdate = wR.instanceMatrix.needsUpdate = true; });
  const spots = [];
  if (hives[0]) spots.push({ x: hives[0][0] + 1.1, z: hives[0][1] + 0.6, face: hives[0], pose: 'work', hat: 'sun' });
  if (fpos) spots.push({ x: fpos[0] + 2.6, z: fpos[1], face: fpos, pose: 'sit' });
  spots.push({ x: -12.4, z: -6.4, face: [-16, -10], pose: 'stand', hat: 'straw' });
  return { spots, features: ['蜂巢小屋', '向日葵花田', '嗡嗡蜜蜂', '蜂蜜噴泉', '蜂箱', '蜂蜜推車', '野花草原', '六角蜂巢大樓'], heroH: 8.4 };
}

export const WORLDS_F = {
  bubblebath: { id: 'bubblebath', kind: 'world', name: '泡泡浴樂園', sky: { top: '#9fd8ff', bot: '#fff0fa' }, cloud: '#ffffff', build: bubblebath },
  filmset: { id: 'filmset', kind: 'world', name: '電影片場', sky: { top: '#5aa0e0', bot: '#ffe2b8' }, hat: 'cap', build: filmset },
  stadium: { id: 'stadium', kind: 'world', name: '運動場', sky: { top: '#4a9ae0', bot: '#eaf5ff' }, hat: 'cap', build: stadium },
  concert: { id: 'concert', kind: 'world', name: '音樂祭舞台', night: true, sky: { top: '#0b0630', bot: '#40155a' }, hat: 'cap', build: concert },
  suburb: { id: 'suburb', kind: 'world', name: '美式郊區住宅', sky: { top: '#78c0f0', bot: '#f3faff' }, build: suburb },
  robot: { id: 'robot', kind: 'world', name: '機器人工廠', sky: { top: '#3f5f8c', bot: '#d8e6f2' }, hat: 'cap', build: robot },
  racetrack: { id: 'racetrack', kind: 'world', name: '賽車場', sky: { top: '#3d8bd9', bot: '#eef5fb' }, hat: 'cap', build: racetrack },
  beehive: { id: 'beehive', kind: 'world', name: '蜂巢花谷', sky: { top: '#7cc3ef', bot: '#fff2c8' }, hat: 'straw', cloud: '#fffaf0', build: beehive },
};
