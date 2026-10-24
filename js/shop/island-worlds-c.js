// 主題世界（三）：義大利海岸小鎮、咖啡莊園、珍奶樂園、啤酒花園、熱帶果園、水上市場、鐵道車站、巴黎街角咖啡
import * as THREE from 'three';
import { puffs, umbrella, bench } from './island-scenes.js';
import { TAU, C, hex, CORE, HERO, canvas, add, grp, box, cyl, sph, cone, dome, gable, nameSign, windowMat, ground, waterPlane, bigTree } from './island-worlds.js';

const HX = (HERO.x0 + HERO.x1) / 2, HZ = (HERO.z0 + HERO.z1) / 2, HW = HERO.x1 - HERO.x0, HD = HERO.z1 - HERO.z0;
function ringOut(k, clear, n, r0, r1, h, rad, make, { front = true, back = true } = {}) {
  let c = 0;
  for (let i = 0; i < n * 6 && c < n; i++) { const a = k.rnd() * TAU, r = r0 + k.rnd() * (r1 - r0), x = Math.sin(a) * r, z = Math.cos(a) * r; if (!front && z > 4) continue; if (!back && z < -6) continue; if (!clear(x, z, rad, h)) continue; if (make(x, z, a)) c++; }
}
const stripeTex = (a, b, n = 8, v = true) => canvas(128, 128, (g, w, h) => { for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? b : a; if (v) g.fillRect(i * w / n, 0, w / n + 1, h); else g.fillRect(0, i * h / n, w, h / n + 1); } });
const rep = (t, x, y) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(x, y); return t; };
const tm = (t, o = {}) => new THREE.MeshStandardMaterial({ map: t, roughness: 0.8, ...o });
const basic = (t) => new THREE.MeshBasicMaterial({ map: t, toneMapped: false });
// 文字貼圖（攤位小招牌）
const label = (text, bg, fg, w = 256, h = 128, font = '"Noto Sans TC", sans-serif') => canvas(w, h, (g, W, H) => { if (bg) { g.fillStyle = bg; g.fillRect(0, 0, W, H); } g.fillStyle = fg; let fs = Math.round(H * 0.62); g.font = `800 ${fs}px ${font}`; while (g.measureText(text).width > W - 20 && fs > 12) { fs -= 3; g.font = `800 ${fs}px ${font}`; } g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, W / 2, H / 2 + 2); });
// 大量重複的小東西合成一個 InstancedMesh：list 每項 { x, y, z, s 或 sx/sy/sz, rx, ry, rz, c（顏色） }
const _o = new THREE.Object3D();
function setInst(m, i, p) { _o.position.set(p.x, p.y || 0, p.z); _o.rotation.set(p.rx || 0, p.ry || 0, p.rz || 0, p.o || 'XYZ'); const s = p.s ?? 1; _o.scale.set(p.sx ?? s, p.sy ?? s, p.sz ?? s); _o.updateMatrix(); m.setMatrixAt(i, _o.matrix); }
function inst(parent, geo, mat, list, cast = true) {
  const m = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length)); m.count = list.length;
  list.forEach((p, i) => { setInst(m, i, p); if (p.c != null) m.setColorAt(i, C(p.c)); });
  if (m.instanceColor) m.instanceColor.needsUpdate = true;
  m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m;
}
// 合併幾個幾何（同一材質）成一個，省 draw call
function merge(list) {
  const parts = list.map(g => (g.index ? g.toNonIndexed() : g)), out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'uv']) {
    if (parts.some(g => !g.attributes[name])) continue;
    const arr = new Float32Array(parts.reduce((s, g) => s + g.attributes[name].array.length, 0)); let o = 0;
    for (const g of parts) { arr.set(g.attributes[name].array, o); o += g.attributes[name].array.length; }
    out.setAttribute(name, new THREE.BufferAttribute(arr, parts[0].attributes[name].itemSize));
  }
  return out;
}
// 沿著曲線的帶狀平面（河流、道路）
function ribbon(curve, w, n = 120, y = 0.03) {
  const pos = [], uv = [], idx = []; let len = 0, prev = null;
  for (let i = 0; i <= n; i++) { const p = curve.getPointAt(i / n), t = curve.getTangentAt(i / n); if (prev) len += p.distanceTo(prev); prev = p; const l = Math.hypot(t.x, t.z) || 1, nx = t.z / l, nz = -t.x / l; pos.push(p.x - nx * w / 2, p.y + y, p.z - nz * w / 2, p.x + nx * w / 2, p.y + y, p.z + nz * w / 2); uv.push(0, len / w, 1, len / w); if (i) { const a = i * 2 - 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
// 條紋遮陽篷（貼在牆上往外斜，前緣一排波浪垂邊）
function awning(k, parent, w, d, c1, c2, x, y, z, { tilt = 0.42, n = 10, ry = 0 } = {}) {
  const g = grp(x, y, z); g.rotation.y = ry; parent.add(g); const a = grp(); a.rotation.x = tilt; g.add(a);
  add(k, a, box(w, 0.05, d), new THREE.MeshStandardMaterial({ map: stripeTex(c1, c2, n), roughness: 0.7 }), 0, 0, d / 2);
  const sc = []; for (let i = 0; i < n; i++) sc.push({ x: -w / 2 + (i + 0.5) * w / n, y: -0.02, z: d, rx: -tilt, c: i % 2 ? c2 : c1 });
  inst(a, k.g('scal' + (w / n).toFixed(2), () => new THREE.CircleGeometry(w / n / 2, 10, Math.PI, Math.PI)), new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.7 }), sc, false);
  return g;
}
// 尖頭木船的船身（俯視外形往上擠出，船頭朝 +z）
function hullGeo(L, W, Hh) {
  const s = new THREE.Shape(); s.moveTo(0, -L / 2); s.quadraticCurveTo(W * 0.62, -L * 0.25, W / 2, 0.05 * L); s.quadraticCurveTo(W * 0.5, L * 0.3, 0, L / 2); s.quadraticCurveTo(-W * 0.5, L * 0.3, -W / 2, 0.05 * L); s.quadraticCurveTo(-W * 0.62, -L * 0.25, 0, -L / 2);
  const g = new THREE.ExtrudeGeometry(s, { depth: Hh, bevelEnabled: false, curveSegments: 8 }); g.rotateX(-Math.PI / 2); return g;
}
function boatShell(k, L, W, Hh, hullC, inC) {
  const g = grp(); add(k, g, k.g(`hull${L}${W}${Hh}`, () => hullGeo(L, W, Hh)), k.m(hullC, { roughness: 0.7 }), 0, 0, 0);
  add(k, g, k.g(`hin${L}${W}${Hh}`, () => hullGeo(L * 0.86, W * 0.78, 0.02)), k.m(inC, { roughness: 0.9 }), 0, Hh, 0, false);
  return g;
}
// 鑄鐵欄杆（透明底、細欄杆）
const railM = (k) => k.g('railM', () => new THREE.MeshStandardMaterial({ map: canvas(256, 64, (g, W, H) => { g.fillStyle = '#26282b'; g.fillRect(0, 0, W, 6); g.fillRect(0, H - 6, W, 6); for (let x = 4; x < W; x += 14) g.fillRect(x, 0, 3, H); g.strokeStyle = '#26282b'; g.lineWidth = 3; for (let x = 0; x < W; x += 28) { g.beginPath(); g.arc(x + 14, H / 2, 9, 0, TAU); g.stroke(); } }), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.5 }));
// 地中海立面：粉彩牆、綠色百葉窗（晚上窗戶亮燈）；base 為白色時可用 instance 顏色染色
function facade(k, base, cols, rows, { rx = 1, ry = 1, shutter = '#3f8a6a', glass = '#3a4650' } = {}) {
  const draw = (lit) => (g, W, H) => { g.fillStyle = lit ? '#000' : base; g.fillRect(0, 0, W, H); const cw = W / cols, rh = H / rows; for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) { const x = i * cw + cw * 0.3, y = j * rh + rh * 0.22, w = cw * 0.4, h = rh * 0.6; if (lit) { if ((i * 7 + j * 3) % 5 < 3) { g.fillStyle = '#ffd88a'; g.fillRect(x, y, w, h); } continue; } g.fillStyle = glass; g.fillRect(x, y, w, h); g.fillStyle = shutter; g.fillRect(x - cw * 0.14, y, cw * 0.13, h); g.fillRect(x + w + cw * 0.01, y, cw * 0.13, h); g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x - cw * 0.16, y + h, w + cw * 0.32, rh * 0.05); } };
  const t = rep(canvas(256, 256, draw(false)), rx, ry), m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 });
  if (k.night) { m.emissiveMap = rep(canvas(256, 256, draw(true)), rx, ry); m.emissive = C('#ffffff'); m.emissiveIntensity = 1.0; }
  return m;
}

// ================= 義大利海岸小鎮 =================
function italy({ k, world, pal, clear, layout, mobile }) {
  const tile = rep(canvas(128, 128, (g) => { g.fillStyle = '#e6d3b3'; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? '#e0a87c' : '#f6ecd8'; g.fillRect(i * 32 + 1, j * 32 + 1, 30, 30); if ((i + j) % 2 === 0) { g.fillStyle = '#3f8ab0'; g.beginPath(); g.moveTo(i * 32 + 16, j * 32 + 6); g.lineTo(i * 32 + 26, j * 32 + 16); g.lineTo(i * 32 + 16, j * 32 + 26); g.lineTo(i * 32 + 6, j * 32 + 16); g.fill(); } } }), 9, 9);
  ground(k, world, { color: k.night ? '#5f6a48' : '#b3b475', coreTex: tile, edge: '#f6f1e6', edgeH: 0.4 });
  // 右邊是海：海堤步道、白色欄杆、礁石
  waterPlane(k, world, 160, 320, 12.9 + 80, 0, { color: '#1f9bc8', y: 0.02, speed: [0.006, 0.012] });
  add(k, world, box(4.2, 0.6, 76), '#ece2cf', 10.8, 0.1, 2);
  const bal = []; for (let z = -34; z < 40; z += 0.45) bal.push({ x: 12.7, y: 0.68, z });
  inst(world, k.g('ibal', () => cyl(0.06, 0.09, 0.56, 6)), k.m('#fbf7ee'), bal, false); add(k, world, box(0.2, 0.08, 76), '#fbf7ee', 12.7, 1.0, 2, false);
  const rocks = []; for (let i = 0; i < 16; i++) rocks.push({ x: 13.6 + k.rnd() * 3, y: 0, z: -30 + i * 4.2 + k.rnd() * 2, s: 0.5 + k.rnd() * 0.9, ry: k.rnd() * 3, rx: k.rnd() });
  inst(world, k.g('irock', () => new THREE.DodecahedronGeometry(1, 0)), k.m('#a89a84', { flatShading: true }), rocks);
  // 後方的山坡：一層層岩壁，上面疊滿粉彩小屋
  const HC = [-12, -34], rock = k.m(k.night ? '#6e5e4c' : '#c79a6a', { flatShading: true }), tiers = 6, R0 = 23;
  for (let i = 0; i < tiers; i++) { const r = R0 - i * 3.2; add(k, world, cyl(r, r + 1.0, 2.4, 11), rock, HC[0], i * 2.4 + 1.2, HC[1]).castShadow = false; }
  const walls = ['#f6c8b0', '#f7e3a1', '#bfe0e8', '#f2b8c0', '#fff3e0', '#e8d0f0', '#f4d08a', '#ffffff'], bodies = [], roofs = [], domes = [], cyp = [];
  const church = { a: -0.48, i: 0 };
  for (let i = 0; i < tiers - 1; i++) {
    const r = R0 - i * 3.2 - 1.15, y = (i + 1) * 2.4, step = 2.5 / r;
    for (let a = -1.25; a < 1.35; a += step * (0.9 + k.rnd() * 0.3)) {
      if (k.rnd() < 0.12 || (i === church.i && Math.abs(a - church.a) < 0.28)) continue;
      const x = HC[0] + Math.sin(a) * r, z = HC[1] + Math.cos(a) * r; if (x > 9) continue;
      if (k.rnd() < 0.1) { cyp.push({ x, y: y + 1.6, z, sx: 0.45, sy: 1.8, sz: 0.45 }); continue; }
      const w = 1.7 + k.rnd() * 0.7, hh = 1.7 + k.rnd() * 1.4;
      bodies.push({ x, y: y + hh / 2, z, sx: w, sy: hh, sz: 1.7, ry: a, c: walls[Math.floor(k.rnd() * walls.length)] });
      if (k.rnd() < 0.55) roofs.push({ x, y: y + hh + 0.06, z, sx: w + 0.15, sy: 1, sz: 1.85, ry: a, c: '#f4efe4' }); else if (k.rnd() < 0.75) roofs.push({ x, y: y + hh + 0.45, z, s: Math.min(w + 0.3, 2.2) / 1.41, sy: 0.9, ry: a + Math.PI / 4, c: '#c8643c', cone: 1 }); else domes.push({ x, y: y + hh, z, s: 0.75, c: ['#f2c94c', '#3aa0a8', '#e8dcc4'][Math.floor(k.rnd() * 3)] });
    }
  }
  if (mobile) bodies.splice(Math.floor(bodies.length * 0.65));
  inst(world, k.g('ihouse', () => box(1, 1, 1)), facade(k, '#ffffff', 2, 2), bodies);
  inst(world, k.g('islab', () => box(1, 0.12, 1)), k.m('#ffffff'), roofs.filter(r => !r.cone));
  inst(world, k.g('ipyr', () => cone(1, 0.9, 4)), k.m('#ffffff', { flatShading: true }), roofs.filter(r => r.cone));
  inst(world, k.g('idome', () => dome(1, 14, 8)), k.m('#ffffff', { roughness: 0.4 }), domes);
  // 絲柏
  for (let i = 0; i < 8; i++) { const a = -1.1 + i * 0.32, r = R0 + 1.6; cyp.push({ x: HC[0] + Math.sin(a) * r, y: 1.8, z: HC[1] + Math.cos(a) * r, sx: 0.5, sy: 2.0, sz: 0.5 }); }
  inst(world, k.g('icyp', () => new THREE.IcosahedronGeometry(1, 1)), k.m(k.night ? '#1f3a26' : '#2f5a32', { flatShading: true }), cyp.filter(c => c.x < 9 && clear(c.x, c.z, 0.5, 4)));
  // 鐘樓教堂：馬約利卡磁磚圓頂、會擺動的鐘
  { const r = R0 - 1.4, x = HC[0] + Math.sin(church.a) * r, z = HC[1] + Math.cos(church.a) * r; const cg = grp(x, 2.4, z); cg.rotation.y = church.a; world.add(cg);
    const cream = k.m('#f3e8d2', { roughness: 0.85 });
    add(k, cg, box(3.4, 3.0, 4.6), cream, -1.2, 1.5, -0.6); add(k, cg, gable(4.6, 3.4, 1.2, 0.15), [cream, k.m('#c8643c', { flatShading: true })], -1.2, 3.0, -0.6).rotation.y = Math.PI / 2;
    add(k, cg, cyl(1.2, 1.2, 0.8, 16), cream, -1.2, 3.6, 0.6); add(k, cg, dome(1.25, 16, 8), tm(stripeTex('#f2c94c', '#2f8a6a', 12), { roughness: 0.35 }), -1.2, 4.0, 0.6);
    add(k, cg, box(1.7, 7.4, 1.7), cream, 1.4, 3.7, 0.4); add(k, cg, cone(1.3, 1.6, 4), k.m('#c8643c', { flatShading: true }), 1.4, 8.2, 0.4).rotation.y = Math.PI / 4;
    for (const [dx, dz, ry] of [[0, 0.86, 0], [0, -0.86, 0], [0.86, 0, Math.PI / 2], [-0.86, 0, Math.PI / 2]]) add(k, cg, box(0.8, 1.3, 0.05), '#3a2f2a', 1.4 + dx, 6.3, 0.4 + dz, false).rotation.y = ry;
    const face = canvas(128, 128, (c) => { c.fillStyle = '#fffaf0'; c.beginPath(); c.arc(64, 64, 60, 0, TAU); c.fill(); c.strokeStyle = '#2b2b2b'; c.lineWidth = 6; c.stroke(); c.beginPath(); c.moveTo(64, 64); c.lineTo(64, 22); c.moveTo(64, 64); c.lineTo(92, 70); c.stroke(); });
    add(k, cg, new THREE.CircleGeometry(0.55, 24), new THREE.MeshStandardMaterial({ map: face, emissive: C(k.night ? '#fff2c4' : '#000'), emissiveMap: k.night ? face : null }), 1.4, 4.8, 1.26, false);
    const bp = grp(1.4, 6.85, 0.4); cg.add(bp); add(k, bp, new THREE.LatheGeometry([[0.02, 0], [0.3, -0.05], [0.36, -0.5], [0.46, -0.72], [0, -0.72]].map(([a, b]) => new THREE.Vector2(a, b)), 14), k.m('#b8862e', { metalness: 0.4, roughness: 0.35 }), 0, 0, 0);
    k.anim.push((t) => { bp.rotation.z = Math.sin(t * 2.2) * 0.45; }); }
  // 檸檬樹
  const lemons = [], crowns = [], trunks = [];
  ringOut(k, clear, mobile ? 6 : 11, 9.6, 16, 3.2, 1.0, (x, z) => { if (x > 8.2 || Math.hypot(x - HC[0], z - HC[1]) < R0 + 2.5 || (x < -8 && x > -12.5 && z > -5 && z < 3.5)) return 0; const s = 0.8 + k.rnd() * 0.4;
    trunks.push({ x, y: 0.6 * s, z, s }); crowns.push({ x, y: 1.75 * s, z, s: s * 1.1, sy: s * 0.95, ry: k.rnd() * 3 });
    for (let j = 0; j < 9; j++) { const a = k.rnd() * TAU, b = k.rnd() * 1.2 - 0.3; lemons.push({ x: x + Math.sin(a) * Math.cos(b) * 1.08 * s, y: (1.75 + Math.sin(b) * 0.95) * s, z: z + Math.cos(a) * Math.cos(b) * 1.08 * s, sx: 0.13, sy: 0.1, sz: 0.1, ry: a }); } return 1; });
  inst(world, k.g('itrunk', () => cyl(0.1, 0.16, 1.2, 6)), k.m('#7a5a3a'), trunks);
  inst(world, k.g('icrown', () => new THREE.IcosahedronGeometry(1, 1)), k.m(k.night ? '#24502e' : '#3f8a3a', { flatShading: true }), crowns);
  inst(world, k.g('ilemon', () => sph(1, 8, 6)), k.glow('#ffe14a', 0.4), lemons, false);
  // 晾衣繩（衣服隨風飄）
  { const lx = -10.6, z0 = -4.2, z1 = 2.8; for (const z of [z0, z1]) add(k, world, cyl(0.05, 0.06, 2.6, 6), '#8a6a4a', lx, 1.3, z); add(k, world, box(0.02, 0.02, z1 - z0), '#eeeeee', lx, 2.45, (z0 + z1) / 2, false);
    const cl = ['#ffffff', hex(pal[0]), '#7fb8e8', '#f2c94c', '#ffffff', '#e8786a'].map((c, i) => { const p = grp(lx, 2.45, z0 + 0.7 + i * 1.08); add(k, p, k.g('icloth' + (i % 2), () => new THREE.PlaneGeometry(0.75, i % 2 ? 0.9 : 0.6).translate(0, i % 2 ? -0.45 : -0.3, 0)), k.m(c, { side: THREE.DoubleSide }), 0, 0, 0).rotation.y = Math.PI / 2; world.add(p); return p; });
    k.anim.push((t) => cl.forEach((p, i) => { p.rotation.z = 0.12 + Math.sin(t * 2.3 + i * 0.9) * 0.22; })); }
  // 偉士牌風格的小綿羊機車（停在海堤步道）
  { const v = grp(10.4, 0.4, 5.8); v.rotation.y = -0.4; world.add(v); const mint = k.m('#9fdcc4', { roughness: 0.35 });
    add(k, v, new THREE.CapsuleGeometry(0.28, 0.6, 4, 10), mint, 0, 0.52, -0.15).rotation.x = Math.PI / 2; add(k, v, box(0.42, 0.75, 0.12), mint, 0, 0.62, 0.42).rotation.x = -0.2;
    add(k, v, box(0.3, 0.1, 0.55), '#5a3a2a', 0, 0.86, -0.25); add(k, v, box(0.6, 0.05, 0.05), '#cfd4d8', 0, 1.05, 0.52); add(k, v, sph(0.08, 10, 8), k.glow('#fff6d0', 2), 0, 0.95, 0.56);
    for (const z of [-0.45, 0.52]) add(k, v, cyl(0.2, 0.2, 0.1, 14), '#222', 0, 0.2, z).rotation.z = Math.PI / 2; }
  // 冰淇淋推車（條紋陽傘）
  const cp = layout.place(k.rnd, 0.95, 2.4) || { x: -6.2, z: 2.6 };
  const cart = grp(cp.x, 0.12, cp.z); cart.rotation.y = Math.atan2(-cp.x, 0.9 - cp.z); world.add(cart);
  add(k, cart, box(1.3, 0.75, 0.7), tm(stripeTex('#ffffff', '#f6a6b8', 8)), 0, 0.62, 0); add(k, cart, box(1.36, 0.06, 0.76), '#fbf7ee', 0, 1.02, 0);
  for (const x of [-0.5, 0.5]) add(k, cart, cyl(0.22, 0.22, 0.06, 14), '#3a3f44', x, 0.22, 0.38).rotation.x = Math.PI / 2;
  ['#f59ab0', '#b5d98a', '#fff3d6', '#8a5a3a', '#ffd36a', '#c8a8ff'].forEach((c, i) => add(k, cart, cyl(0.13, 0.13, 0.12, 10), c, -0.45 + (i % 3) * 0.45, 1.1, -0.15 + Math.floor(i / 3) * 0.3));
  cart.add(umbrella(k, 0.45, -0.25, '#f6a6b8', { h: 2.3, r: 1.0 }));
  // 港邊的小漁船（隨浪搖）＋外海的遊艇
  const boats = []; for (let i = 0; i < 4; i++) { const b = boatShell(k, 2.6, 1.0, 0.45, '#ffffff', ['#2e6fa8', '#c0392b', '#f2c94c', '#2f8a6a'][i]); b.position.set(15 + (i % 2) * 2.6, 0, -16 + i * 6.5); b.rotation.y = 0.3 + i * 0.7; world.add(b); boats.push(b); }
  const yacht = boatShell(k, 4.6, 1.6, 0.7, '#ffffff', '#c9a06b'); add(k, yacht, box(1.0, 0.6, 1.6), '#ffffff', 0, 1.0, -0.4); add(k, yacht, box(0.9, 0.25, 1.0), '#2b3440', 0, 1.25, -0.1, false); world.add(yacht);
  k.anim.push((t) => { boats.forEach((b, i) => { b.position.y = Math.sin(t * 1.4 + i) * 0.07; b.rotation.z = Math.sin(t * 1.1 + i) * 0.06; }); const a = t * 0.05; yacht.position.set(38 + Math.sin(a) * 16, Math.sin(t * 1.2) * 0.06, -6 + Math.cos(a) * 20); yacht.rotation.y = a + Math.PI / 2; });
  // 冰淇淋店（主建築）：粉彩兩層樓、條紋波浪遮陽篷、櫥窗冰淇淋、屋頂的大甜筒
  const h = grp(HX, 0.12, HZ); world.add(h); const pink = '#f6c3bd';
  add(k, h, box(HW - 0.4, 3.0, HD - 0.6), k.m(pink, { roughness: 0.85 }), 0, 1.5, 0);
  add(k, h, box(HW - 0.9, 2.3, HD - 1.1), facade(k, '#fbe3cf', 4, 1, { shutter: '#4f9a7a' }), 0, 4.15, -0.2);
  add(k, h, box(HW - 0.7, 0.18, HD - 0.9), '#fffaf0', 0, 3.05, -0.1); add(k, h, box(HW - 0.7, 0.22, HD - 0.9), '#fffaf0', 0, 5.36, -0.2);
  const glass = k.night ? k.glow('#ffe7b8', 1.6) : k.m('#bfe2ee', { roughness: 0.15 });
  for (const x of [-1.95, 1.95]) { add(k, h, box(2.0, 1.5, 0.06), glass, x, 1.35, HD / 2 - 0.28, false); for (let j = 0; j < 4; j++) add(k, h, k.g('itub', () => cyl(0.18, 0.16, 0.16, 10)), ['#f59ab0', '#b5d98a', '#fff3d6', '#8a5a3a'][j], x - 0.66 + j * 0.44, 0.62, HD / 2 - 0.12, false); add(k, h, box(2.1, 0.12, 0.4), '#fffaf0', x, 0.5, HD / 2 - 0.12); }
  add(k, h, box(1.1, 2.1, 0.06), '#7a4a32', 0, 1.05, HD / 2 - 0.28);
  awning(k, h, HW - 0.5, 1.0, '#7fcfb8', '#ffffff', 0, 2.42, HD / 2 - 0.3, { n: 14 });
  const sign = nameSign(k, 4.6, 0.5, '#fffaf0', '#c0392b', '"Noto Serif TC", serif'); sign.position.set(0, 2.72, HD / 2 - 0.26); h.add(sign);
  add(k, h, box(2.4, 0.08, 0.55), '#fffaf0', 0, 3.3, HD / 2 - 0.55 + 0.1); add(k, h, box(2.4, 0.45, 0.03), railM(k), 0, 3.57, HD / 2 - 0.05, false);
  for (const x of [-1.0, -0.4, 0.4, 1.0]) add(k, h, k.g('ipot', () => sph(0.14, 8, 6)), k.m(['#e8384f', '#f2c94c'][Math.abs(x) > 0.6 ? 0 : 1]), x, 3.45, HD / 2 - 0.25, false);
  const gc = grp(0, 5.45, -0.3); h.add(gc);
  const waffle = rep(canvas(64, 64, (c) => { c.fillStyle = '#e0a860'; c.fillRect(0, 0, 64, 64); c.strokeStyle = '#a8703a'; c.lineWidth = 4; for (let i = -64; i < 128; i += 16) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + 64, 64); c.stroke(); c.beginPath(); c.moveTo(i + 64, 0); c.lineTo(i, 64); c.stroke(); } }), 4, 2);
  add(k, gc, cone(1.0, 2.6, 18), tm(waffle), 0, 1.3, 0).rotation.x = Math.PI;
  [['#b5d98a', 0.95, 2.95], ['#f59ab0', 0.85, 3.75], ['#fff3d6', 0.7, 4.45]].forEach(([c, r, y]) => add(k, gc, sph(r, 18, 12), k.m(c, { roughness: 0.55 }), 0, y, 0));
  add(k, gc, sph(0.2, 10, 8), k.m('#d81f3a', { roughness: 0.2 }), 0, 5.2, 0);
  k.anim.push((t) => { gc.rotation.y = t * 0.5; gc.position.y = 5.45 + Math.sin(t * 1.6) * 0.08; });
  const spots = [{ x: 12.1, z: -3.2, y: 0.4, face: [20, -3.2], pose: 'stand', prop: 'rod' }, { x: cp.x + Math.sin(cart.rotation.y + Math.PI) * 0.75, z: cp.z + Math.cos(cart.rotation.y + Math.PI) * 0.75, face: [cp.x, cp.z], pose: 'work' }];
  const bb = bench(k, 11.2, 1.8); bb.position.y = 0.4; bb.rotation.y = Math.PI / 2; world.add(bb); spots.push({ x: 11.25, z: 1.8, y: 0.75, face: [20, 1.8], pose: 'sit' });
  return { spots, features: ['冰淇淋店', '山坡彩色小屋', '鐘樓教堂', '海堤步道', '檸檬樹', '冰淇淋推車'], heroH: 10.4 };
}

// ================= 咖啡莊園 =================
function coffeefarm({ k, world, pal, clear, mobile }) {
  // 起伏的山坡地（廣場附近是平的，越往外越高，正前方保持低矮）
  const H = (x, z) => { const r = Math.hypot(x, z), u = Math.max(0, Math.min(1, (r - 13.5) / 22)), f = z < 4 ? 1 : Math.max(0.1, 1 - (z - 4) / 16); return u * u * (3 - 2 * u) * 6.5 * f * (0.8 + 0.2 * Math.sin(Math.atan2(x, z) * 3 + 1)) + Math.max(0, r - 40) * 0.12; };
  const tg = new THREE.PlaneGeometry(300, 300, 120, 120), tp = tg.attributes.position; for (let i = 0; i < tp.count; i++) tp.setZ(i, H(tp.getX(i), -tp.getY(i)));
  tg.computeVertexNormals(); const terr = new THREE.Mesh(tg, k.m(k.night ? '#3a3a24' : '#9a8a4e', { roughness: 1 })); terr.rotation.x = -Math.PI / 2; terr.position.y = -0.01; terr.receiveShadow = true; world.add(terr);
  const brick = rep(canvas(128, 128, (g) => { g.fillStyle = '#c98a5a'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#a86a42'; g.lineWidth = 3; for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(0, i * 16); g.lineTo(128, i * 16); g.stroke(); for (let j = 0; j < 4; j++) { g.beginPath(); g.moveTo(j * 32 + (i % 2) * 16, i * 16); g.lineTo(j * 32 + (i % 2) * 16, i * 16 + 16); g.stroke(); } } }), 8, 8);
  ground(k, world, { color: null, coreTex: brick, edge: '#7a5236', edgeH: 0.3 });
  // 環繞莊園的泥土路
  const road = add(k, world, new THREE.RingGeometry(9.9, 11.3, 72), k.m('#a8865a', { roughness: 1 }), 0, 0.02, 0, false); road.rotation.x = -Math.PI / 2;
  // 遠方的火山與山嵐
  const VX = -6, VZ = -66, VR = 34; const vg = grp(VX, 0, VZ); world.add(vg); add(k, vg, cyl(6, VR, 27, 16), k.m(k.night ? '#2e3a3a' : '#5d6b58', { flatShading: true }), 0, 13.5, 0).castShadow = false; add(k, vg, cyl(5.4, 6, 0.6, 16), '#4a3a32', 0, 26.9, 0, false); add(k, vg, cyl(14, 24, 7, 16), k.m(k.night ? '#24402a' : '#5f8a4a', { flatShading: true }), 0, 3.5, 0).castShadow = false;
  for (const [x, z, s] of [[40, -85, 22], [-60, -70, 18], [16, -110, 26]]) add(k, world, cone(s, s * 0.9, 9), k.m(k.night ? '#24342e' : '#7fa088', { flatShading: true }), x, s * 0.45, z).castShadow = false;
  puffs(k, vg, 0, 27.2, 0, { n: 5, color: 0xdddddd, size: 3.5, rise: 12, speed: 0.05, opacity: 0.55 });
  // 咖啡樹：沿等高線一排排，結紅色咖啡果
  const shrubs = [], cher = [], patio = { x: -12.4, z: 2.4, w: 4.6, d: 6.6 };
  for (let r = 14; r < 38; r += 2.3) { const step = 0.95 / r; for (let a = -Math.PI; a < Math.PI; a += step) { const x = Math.sin(a) * r, z = Math.cos(a) * r; if (z > 9 + (r - 14) * 0.2) continue; if (Math.abs(x - patio.x) < 4 && Math.abs(z - patio.z) < 5) continue; if (Math.hypot(x - VX, z - VZ) < VR + 1) continue; if (k.mobile && k.rnd() < 0.4) continue; const y = H(x, z); const s = 0.48 + k.rnd() * 0.12; shrubs.push({ x, y: y + s * 0.75, z, s, sy: s * 1.35, ry: k.rnd() * 3 });
    if (r < 27) for (let j = 0; j < 2; j++) { const b = k.rnd() * TAU; cher.push({ x: x + Math.sin(b) * s * 0.85, y: y + s * (0.5 + k.rnd() * 0.6), z: z + Math.cos(b) * s * 0.85, s: 0.1 }); } } }
  inst(world, k.g('cfbush', () => new THREE.IcosahedronGeometry(1, 0)), k.m(k.night ? '#1f4228' : '#2f6e34', { flatShading: true }), shrubs);
  inst(world, k.g('cfcher', () => new THREE.OctahedronGeometry(1, 0)), k.glow('#d4202f', 0.3), cher, false);
  // 遮蔭大樹
  for (const [x, z] of [[-20, -14], [16, -18], [-8, -24], [26, -6], [-28, 0], [6, -30]]) { if (!clear(x, z, 2, 6)) continue; const t = bigTree(k, x, z, 1.3, k.night ? '#2e5a35' : '#4f8f3a'); t.position.y = H(x, z); world.add(t); }
  const mistM = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: k.night ? 0.12 : 0.35, depthWrite: false, roughness: 1 });
  const mists = []; for (let i = 0; i < (mobile ? 4 : 7); i++) { const m = new THREE.Mesh(k.g('mist', () => sph(1, 14, 8)), mistM); m.scale.set(9 + k.rnd() * 6, 1.4, 4); world.add(m); mists.push({ m, x: -40 + i * 13, y: 5 + k.rnd() * 5, z: -24 - k.rnd() * 12, s: 0.3 + k.rnd() * 0.4 }); }
  k.anim.push((t) => mists.forEach(({ m, x, y, z, s }) => { m.position.set(((x + t * s + 60) % 120) - 60, y + Math.sin(t * 0.3 + x) * 0.4, z); }));
  // 曬豆場：一片咖啡豆，工人用耙子耙
  const beans = rep(canvas(128, 128, (g) => { g.fillStyle = '#8a5a34'; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 700; i++) { g.fillStyle = ['#6a3e22', '#a8703e', '#7a4a2a', '#c0844a', '#5a6a2a'][i % 5]; g.beginPath(); g.ellipse(Math.random() * 128, Math.random() * 128, 2.4, 1.6, Math.random() * 3, 0, TAU); g.fill(); } g.strokeStyle = 'rgba(60,30,15,.35)'; g.lineWidth = 2; for (let x = 4; x < 128; x += 10) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 128); g.stroke(); } }), 2, 3);
  const pg = grp(patio.x, 0.02, patio.z); pg.rotation.y = 0.15; world.add(pg); add(k, pg, box(patio.w + 0.5, 0.14, patio.d + 0.5), '#cfc6b4', 0, 0.07, 0); add(k, pg, box(patio.w, 0.06, patio.d), tm(beans, { roughness: 1 }), 0, 0.15, 0);
  const rakes = [-1.0, 1.0].map((dx, i) => { const r = grp(dx, 0.18, 0); pg.add(r); add(k, r, box(0.9, 0.08, 0.06), '#8a6a4a', 0, 0.04, 0); const hd = add(k, r, cyl(0.025, 0.025, 1.8, 5), '#b08a5a', 0, 0.7, 0.6); hd.rotation.x = 0.75; return r; });
  k.anim.push((t) => rakes.forEach((r, i) => { r.position.z = Math.sin(t * 1.1 + i * 2) * 1.6; }));
  const spots = [-1.0, 1.0].map((dx, i) => { const c = Math.cos(0.15), s = Math.sin(0.15), lx = dx, lz = 1.9 + i * 0.4; return { x: patio.x + lx * c + lz * s, z: patio.z - lx * s + lz * c, y: 0.2, face: [patio.x + lx * c, patio.z - lx * s], pose: 'work', hat: 'straw' }; });
  // 烘豆木造穀倉（主建築）：直木板牆、鐵皮人字屋頂、拉門、煙囪冒煙、旋轉烘豆機、麻布袋
  const h = grp(HX, 0.12, HZ); world.add(h);
  const plank = rep(canvas(128, 128, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = ['#8a5634', '#9a6040', '#7e4e30', '#93603c'][i % 4]; g.fillRect(i * 16, 0, 16, 128); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(i * 16, 0, 2, 128); } }), 3, 1);
  const pm = tm(plank, { roughness: 0.9 });
  add(k, h, box(HW - 0.5, 3.8, HD - 0.5), pm, 0, 1.9, 0);
  const tin = tm(rep(stripeTex('#9a4a32', '#b4603e', 24), 1, 1), { roughness: 0.55, metalness: 0.2 });
  add(k, h, gable(HW - 0.1, HD - 0.3, 2.2, 0.4), [pm, tin], 0, 3.8, 0);
  add(k, h, box(2.2, 2.6, 0.08), '#5a3420', 0, 1.3, HD / 2 - 0.22); for (const r of [0.86, -0.86]) add(k, h, box(0.1, 3.2, 0.04), '#e8dcc4', 0, 1.3, HD / 2 - 0.17, false).rotation.z = r;
  add(k, h, box(2.6, 0.12, 0.12), '#3a2a20', 0, 2.68, HD / 2 - 0.17);
  const win = k.night ? k.glow('#ffc46b', 1.8) : k.m('#cfe2e8', { roughness: 0.2 });
  for (const x of [-2.4, 2.4]) add(k, h, box(0.9, 0.9, 0.06), win, x, 2.0, HD / 2 - 0.22, false); add(k, h, box(0.9, 0.9, 0.06), win, 0, 4.6, HD / 2 - 0.5, false);
  const sign = nameSign(k, 3.4, 0.55, '#3a2418', '#f2d39a'); sign.position.set(0, 3.2, HD / 2 - 0.2); h.add(sign);
  if (k.night) { const l = new THREE.PointLight(0xffb84d, 6, 10); l.position.set(0, 3.0, HD / 2 + 1.6); h.add(l); }
  add(k, h, cyl(0.28, 0.28, 3.4, 12), k.m('#4a4f55', { metalness: 0.3, roughness: 0.5 }), 2.3, 5.4, -0.8); add(k, h, cone(0.45, 0.35, 12), '#4a4f55', 2.3, 7.3, -0.8);
  puffs(k, h, 2.3, 7.4, -0.8, { n: 6, color: k.night ? 0x8a8070 : 0xcfc6b8, size: 0.4, rise: 3.2, speed: 0.16, opacity: 0.55 });
  const vane = grp(-1.6, 6.05, 0); h.add(vane); add(k, vane, cyl(0.03, 0.03, 0.8, 5), '#2b2b2b', 0, 0.4, 0); const arrow = grp(0, 0.75, 0); vane.add(arrow); add(k, arrow, box(1.0, 0.05, 0.05), '#2b2b2b', 0, 0, 0); add(k, arrow, cone(0.1, 0.25, 4), '#2b2b2b', 0.55, 0, 0).rotation.z = -Math.PI / 2; add(k, arrow, box(0.04, 0.25, 0.25), '#2b2b2b', -0.48, 0, 0);
  // 烘豆機（滾筒會轉）
  const ro = grp(2.75, 0, HD / 2 + 0.25); h.add(ro); add(k, ro, box(1.0, 0.7, 0.7), '#2b2f33', 0, 0.35, 0); const drum = add(k, ro, cyl(0.42, 0.42, 0.8, 16), tm(stripeTex('#3a3f44', '#c87533', 8)), 0, 1.05, 0); drum.rotation.z = Math.PI / 2; add(k, ro, cone(0.32, 0.5, 10), '#c87533', 0.1, 1.75, 0).rotation.x = Math.PI; add(k, ro, cyl(0.06, 0.06, 1.6, 6), '#4a4f55', -0.35, 1.8, -0.2);
  k.anim.push((t) => { drum.rotation.x = t * 2.4; arrow.rotation.y = Math.sin(t * 0.3) * 1.4 + t * 0.1; });
  // 麻布袋
  const sackT = canvas(128, 128, (g) => { g.fillStyle = '#c9ad7a'; g.fillRect(0, 0, 128, 128); g.strokeStyle = 'rgba(120,90,50,.35)'; for (let i = 0; i < 128; i += 4) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke(); } g.fillStyle = '#7a3a22'; g.font = '800 30px "Noto Sans TC", sans-serif'; g.textAlign = 'center'; g.fillText('咖啡豆', 64, 72); });
  const sackG = k.g('cfsack', () => { const g = sph(1, 12, 8); g.scale(0.42, 0.3, 0.3); return g; }), sackM = tm(sackT, { roughness: 1 }), sacks = [];
  [[-2.9, 0], [-2.2, 0], [-2.55, 0.5], [-3.1, -0.6], [-2.4, -0.6]].forEach(([x, dz], i) => sacks.push({ x, y: i === 2 ? 0.75 : 0.28, z: HZ + HD / 2 + 0.25 + dz, ry: i * 0.3 }));
  // 小貨卡：沿著莊園的泥土路繞圈，車斗載著麻布袋
  const truck = grp(); world.add(truck); const tc = k.m(hex(pal[0]), { roughness: 0.45 });
  add(k, truck, box(1.3, 0.55, 2.8), tc, 0, 0.62, 0); add(k, truck, box(1.2, 0.6, 1.0), tc, 0, 1.18, 0.6); add(k, truck, box(1.15, 0.42, 0.04), k.m('#2b3440', { roughness: 0.2 }), 0, 1.22, 1.11, false);
  add(k, truck, box(1.3, 0.3, 1.5), '#3a3f44', 0, 1.02, -0.62); add(k, truck, box(1.1, 0.28, 1.3), '#5a4a3a', 0, 1.06, -0.62);
  for (const x of [-0.25, 0.25]) add(k, truck, sph(0.08, 8, 6), k.glow('#fff6d0', 2.4), x * 3, 0.75, 1.42, false);
  const wheels = []; for (const [x, z] of [[-0.66, 0.85], [0.66, 0.85], [-0.66, -0.85], [0.66, -0.85]]) { const w = add(k, truck, k.g('cfwh', () => cyl(0.3, 0.3, 0.2, 12)), '#1c1c1c', x, 0.32, z); w.rotation.z = Math.PI / 2; wheels.push(w); }
  inst(world, sackG, sackM, sacks); for (let i = 0; i < 3; i++) add(k, truck, sackG, sackM, -0.35 + i * 0.35, 1.38, -0.7);
  k.anim.push((t) => { const a = -t * 0.05 + 1.2, r = 10.6; truck.position.set(Math.sin(a) * r, 0.02 + Math.abs(Math.sin(t * 7)) * 0.02, Math.cos(a) * r); truck.rotation.y = a - Math.PI / 2; wheels.forEach(w => { w.rotation.x = -t * 2; }); });
  return { spots, features: ['烘豆木造穀倉', '咖啡樹梯田', '曬豆場', '火山與山嵐', '烘豆機', '載豆小貨卡'], heroH: 7.6, fog: [36, 150] };
}

// ================= 珍奶樂園 =================
// 奶茶杯貼圖：上淺下深的漸層、杯底一層珍珠
function cupTex(k, top, bot) {
  return canvas(128, 256, (g, W, H) => { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 6; for (let i = 0; i < 3; i++) { g.beginPath(); for (let x = 0; x <= W; x += 8) g.lineTo(x, H * 0.16 + i * 16 + Math.sin(x * 0.08 + i) * 6); g.stroke(); }
    for (let i = 0; i < 70; i++) { const x = k.rnd() * W, y = H - 6 - k.rnd() * H * 0.27; g.fillStyle = '#3a2216'; g.beginPath(); g.arc(x, y, 7, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(x - 2, y - 2.5, 2, 0, TAU); g.fill(); } });
}
// 一杯珍奶（杯身、透明杯殼、圓頂杯蓋、吸管）
function bobaCup(k, R, Hc, top, bot, strawC) {
  const g = grp();
  add(k, g, cyl(R * 0.97, R * 0.8, Hc * 0.84, 24), tm(cupTex(k, top, bot), { roughness: 0.45 }), 0, Hc * 0.42, 0);
  add(k, g, cyl(R, R * 0.82, Hc, 24, true), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false }), 0, Hc / 2, 0, false);
  const lid = add(k, g, dome(R * 1.03, 24, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, roughness: 0.15 }), 0, Hc, 0, false); lid.scale.y = 0.4;
  const st = add(k, g, cyl(R * 0.12, R * 0.12, Hc * 0.95, 10), tm(rep(stripeTex(strawC, '#ffffff', 6, false), 1, 3), { roughness: 0.35 }), R * 0.3, Hc * 1.05, 0); st.rotation.z = -0.22;
  return g;
}
function boba({ k, world, pal, clear, mobile }) {
  const dots = rep(canvas(128, 128, (g) => { g.fillStyle = '#fde9d4'; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const x = (i * 32 + 8 + (j % 2) * 16) % 128, y = j * 32 + 16; g.fillStyle = '#4a2a1a'; g.beginPath(); g.arc(x, y, 6, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(x - 2, y - 2, 2, 0, TAU); g.fill(); } }), 7, 7);
  ground(k, world, { color: k.night ? '#6a5462' : '#ffd8c6', coreTex: dots, edge: '#8a5a3a', edgeH: 0.3 });
  // 遠方粉彩小山
  for (const [x, z, s, c] of [[-46, -48, 20, '#d8c4f0'], [-8, -62, 26, '#c4ecd8'], [34, -50, 22, '#ffc8d8'], [62, -12, 16, '#fff0b8'], [-64, -6, 16, '#c8e4ff']]) { const m = add(k, world, dome(s, 20, 8), k.m(c, { roughness: 0.9 }), x, 0, z); m.scale.y = 0.55; m.castShadow = false; }
  // 巨型珍奶杯塔
  const flav = [['#f3dcc0', '#b07a4a', '#ff8fb0'], ['#e8d8f8', '#9a78c8', '#7fd0c0'], ['#e4f2c8', '#8ab858', '#ffb06a'], ['#ffe0e8', '#f08aa8', '#8ac8f0'], ['#f6e2c6', '#6a3a22', '#f2c94c']];
  let ci = 0; ringOut(k, clear, mobile ? 4 : 7, 13, 28, 12, 2.4, (x, z) => { const f = flav[ci % flav.length]; ci++; const s = 0.9 + k.rnd() * 0.6; const c = bobaCup(k, 1.6 * s, 5.2 * s, f[0], f[1], f[2]); c.position.set(x, 0, z); c.rotation.y = k.rnd() * 3; world.add(c); return 1; }, { front: false });
  // 奶茶河：從山丘上倒下來的大杯子流出，蜿蜒到前方
  const rc = new THREE.CatmullRomCurve3([[17, -24], [12.5, -13], [13.5, -3], [11.6, 7], [15, 18], [22, 32]].map(([x, z]) => new THREE.Vector3(x, 0, z)));
  const flow = rep(canvas(128, 128, (g) => { g.fillStyle = '#a86e40'; g.fillRect(0, 0, 128, 128); g.strokeStyle = 'rgba(255,236,210,.5)'; g.lineWidth = 4; for (let i = 0; i < 7; i++) { g.beginPath(); for (let x = 0; x <= 128; x += 8) g.lineTo(x, i * 19 + Math.sin(x * 0.1 + i) * 4); g.stroke(); } }), 1, 1);
  add(k, world, ribbon(rc, 3.0, 140, 0.03), new THREE.MeshStandardMaterial({ map: flow, roughness: 0.25, side: THREE.DoubleSide }), 0, 0, 0, false).receiveShadow = true;
  add(k, world, ribbon(rc, 3.8, 140, 0.02), k.m('#f6efe6', { side: THREE.DoubleSide }), 0, 0, 0, false);
  const mound = add(k, world, dome(5.5, 20, 8), k.m('#c8e8b8'), 20.5, 0, -27); mound.scale.y = 0.6;
  const tip = bobaCup(k, 1.6, 5, '#f3dcc0', '#b07a4a', '#ff8fb0'); tip.position.set(20.5, 3.6, -26.5); tip.rotation.set(0, 0.35, 1.15); world.add(tip);
  const fall = add(k, world, cyl(0.55, 0.8, 3.4, 12, true), new THREE.MeshStandardMaterial({ map: flow, roughness: 0.25, side: THREE.DoubleSide }), 17.3, 1.75, -24.6, false);
  puffs(k, world, 17.1, 0.2, -24.2, { n: 5, color: 0xfff6e8, size: 0.4, rise: 0.8, speed: 0.6, opacity: 0.8 });
  const floaters = []; for (let i = 0; i < 6; i++) { const f = add(k, world, k.g('bbpearl', () => sph(0.45, 14, 10)), k.m('#2a1810', { roughness: 0.15 }), 0, 0, 0); floaters.push(f); }
  k.anim.push((t) => { flow.offset.y = -t * 0.12; floaters.forEach((f, i) => { const u = (((t * 0.012 + i / 6) % 1) + 1) % 1; rc.getPointAt(u, f.position); f.position.y = 0.2 + Math.sin(t * 2 + i) * 0.06; }); });
  // 會滾會跳的珍珠
  const pearls = []; for (let i = 0; i < (mobile ? 7 : 13); i++) { const p = add(k, world, k.g('bbpearl', () => sph(0.45, 14, 10)), k.m('#2a1810', { roughness: 0.15 }), 0, 0, 0); pearls.push({ p, r: 9.4 + (i % 4) * 0.9, a0: k.rnd() * TAU, sp: (i % 2 ? 1 : -1) * (0.05 + k.rnd() * 0.05), w: 2.2 + k.rnd() * 1.5, ph: k.rnd() * 6 }); }
  k.anim.push((t) => pearls.forEach(({ p, r, a0, sp, w, ph }) => { const a = a0 + t * sp, b = Math.abs(Math.sin(t * w + ph)); p.position.set(Math.sin(a) * r, 0.45 + b * 1.5, Math.cos(a) * r); p.scale.set(1 + (1 - b) * 0.18, 1 - (1 - b) * 0.25, 1 + (1 - b) * 0.18); }));
  // 奶茶噴泉（珍珠疊成的柱子、往四周噴灑）
  const fx = -11.5, fz = 5.2; add(k, world, cyl(2.2, 2.4, 0.6, 28), '#fff4e4', fx, 0.3, fz); add(k, world, cyl(1.95, 1.95, 0.05, 28), new THREE.MeshStandardMaterial({ map: flow, roughness: 0.2 }), fx, 0.58, fz, false);
  [[0.55, 0.95], [0.45, 1.75], [0.36, 2.4]].forEach(([r, y]) => add(k, world, k.g('bbp' + r, () => sph(r, 14, 10)), k.m('#2a1810', { roughness: 0.15 }), fx, y, fz));
  add(k, world, cyl(0.7, 0.35, 0.4, 16), '#fff4e4', fx, 2.9, fz);
  const NS = mobile ? 40 : 80, sa = new Float32Array(NS * 3), sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sa, 3));
  world.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xe8c49a, size: 0.16, transparent: true, opacity: 0.9, depthWrite: false })));
  k.anim.push((t) => { for (let i = 0; i < NS; i++) { const u = (t * 0.7 + i / NS) % 1, a = i * 2.39; sa[i * 3] = fx + Math.cos(a) * u * 1.7; sa[i * 3 + 1] = 3.1 + u * 1.6 - u * u * 3.9; sa[i * 3 + 2] = fz + Math.sin(a) * u * 1.7; } sg.attributes.position.needsUpdate = true; });
  // 巨型茶芽（一心二葉）：彎彎的莖、兩片大葉子、頂端一支嫩芽
  const stems = [], leaves = [];
  ringOut(k, clear, mobile ? 5 : 10, 9.6, 21, 5, 1.4, (x, z) => { if (Math.hypot(x - fx, z - fz) < 3.6) return 0; for (let i = 0; i <= 40; i++) { const q = rc.getPointAt(i / 40); if (Math.hypot(q.x - x, q.z - z) < 2.8) return 0; } const s = 0.9 + k.rnd() * 0.5, a = k.rnd() * TAU;
    stems.push({ x, y: 1.5 * s, z, s, rz: 0.08 });
    leaves.push({ x, y: 2.0 * s, z, s: s * 1.7, ry: a, rx: -0.55, o: 'YXZ', c: '#5cb246' }, { x, y: 2.5 * s, z, s: s * 1.5, ry: a + Math.PI, rx: -0.65, o: 'YXZ', c: '#6cc04e' }, { x, y: 1.1 * s, z, s: s * 1.1, ry: a + 1.6, rx: -0.35, o: 'YXZ', c: '#4a9e3c' });
    leaves.push({ x, y: 2.9 * s, z, sx: s * 0.7, sy: s * 0.9, sz: s * 1.2, ry: a + 0.5, rx: -1.45, o: 'YXZ', c: '#b8ec80' }); return 1; });
  inst(world, k.g('bbstem', () => cyl(0.1, 0.16, 3.0, 7)), k.m('#6a9a3a'), stems);
  inst(world, k.g('bbleaf', () => { const g = sph(1, 14, 6); g.scale(0.42, 0.07, 0.95); g.translate(0, 0, 0.92); return g; }), k.m('#ffffff', { roughness: 0.45 }), leaves);
  // 果凍方塊（Q 彈晃動）
  const jel = []; const jc = ['#ff9ec0', '#b8e86a', '#ffb45a', '#c8a8ff', '#7fe0d8'];
  ringOut(k, clear, mobile ? 5 : 9, 9.3, 13, 1.4, 0.7, (x, z) => { const m = add(k, world, k.g('bbjel', () => box(1, 1, 1)), k.m(jc[jel.length % 5], { transparent: true, opacity: 0.78, roughness: 0.1 }), x, 0.5, z); m.rotation.y = k.rnd() * 3; jel.push(m); return 1; });
  k.anim.push((t) => jel.forEach((m, i) => { const w = Math.sin(t * 5 + i * 1.7) * 0.08; m.scale.set(1 + w, 1 - w * 1.4, 1 + w); m.position.y = 0.5 * (1 - w * 1.4) + 0.02; }));
  // 往上飄的泡泡
  const NB = mobile ? 50 : 110, ba = new Float32Array(NB * 3); for (let i = 0; i < NB; i++) { ba[i * 3] = (k.rnd() - 0.5) * 40; ba[i * 3 + 1] = k.rnd() * 12; ba[i * 3 + 2] = -6 + (k.rnd() - 0.5) * 34; }
  const bg2 = new THREE.BufferGeometry(); bg2.setAttribute('position', new THREE.BufferAttribute(ba, 3)); world.add(new THREE.Points(bg2, new THREE.PointsMaterial({ color: 0xffffff, size: 0.28, transparent: true, opacity: 0.7, depthWrite: false })));
  let last = 0; k.anim.push((t) => { const dt = Math.min(0.05, t - last); last = t; for (let i = 0; i < NB; i++) { let y = ba[i * 3 + 1] + dt * 0.8; if (y > 12) y = 0; ba[i * 3 + 1] = y; } bg2.attributes.position.needsUpdate = true; });
  // 杯子造型茶飲店（主建築）
  const h = grp(HX, 0.12, HZ - 0.55); world.add(h); const R = 2.85, Rb = 2.4, Hc = 5.6, rAt = (y) => Rb + (R - Rb) * y / Hc;
  add(k, h, cyl(R, Rb, Hc, 40), tm(cupTex(k, '#f6e2c6', '#b98654'), { roughness: 0.45 }), 0, Hc / 2, 0);
  add(k, h, new THREE.TorusGeometry(R + 0.02, 0.1, 8, 40), k.m('#ffffff', { roughness: 0.2 }), 0, Hc, 0).rotation.x = Math.PI / 2;
  const lid = add(k, h, dome(R + 0.05, 32, 10), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, roughness: 0.1 }), 0, Hc, 0, false); lid.scale.y = 0.42;
  const straw = add(k, h, cyl(0.3, 0.3, 6.2, 14), tm(rep(stripeTex(hex(pal[0]), '#ffffff', 6, false), 1, 4), { roughness: 0.3 }), 0.9, Hc + 1.3, -0.3); straw.rotation.z = -0.24;
  add(k, h, box(1.25, 2.1, 0.4), '#6a4030', 0, 1.05, rAt(1.05) - 0.12); add(k, h, new THREE.CircleGeometry(0.62, 20, 0, Math.PI), k.m('#6a4030'), 0, 2.1, rAt(2.1) + 0.085);
  const gl = k.night ? k.glow('#ffe2b8', 1.8) : k.m('#d8f0f6', { roughness: 0.1 });
  for (const s of [-1, 1]) { const x = s * 1.65, y = 1.6, z = Math.sqrt(rAt(y) ** 2 - x * x) + 0.03; const w = add(k, h, new THREE.CircleGeometry(0.55, 24), gl, x, y, z, false); w.rotation.y = Math.asin(x / rAt(y)); const ring = add(k, h, new THREE.TorusGeometry(0.58, 0.07, 8, 24), '#ffffff', x, y, z, false); ring.rotation.y = w.rotation.y; }
  awning(k, h, 3.0, 0.7, '#ff9eb8', '#ffffff', 0, 2.75, rAt(2.75) - 0.05, { n: 10 });
  const sign = nameSign(k, 3.8, 0.6, '#5a3420', '#ffe9c8'); sign.position.set(0, 3.55, rAt(3.55) + 0.1); h.add(sign);
  const spots = [{ x: fx + 2.15, z: fz, y: 0.66, face: [fx + 6, fz], pose: 'sit', prop: 'cup' }, { x: 10.2, z: 1.5, face: [13.5, -1], pose: 'stand', prop: 'cup' }];
  return { spots, features: ['杯子造型茶飲店', '巨型珍奶杯塔', '奶茶河', '彈跳珍珠', '奶茶噴泉', '巨型茶芽'], heroH: 10.6 };
}

// ================= 啤酒花園 =================
// 半木造（木筋牆）貼圖：灰泥底、深色木樑、窗戶（晚上亮燈）
function fachwerk(k, cols) {
  const draw = (lit) => (g, W, H) => { g.fillStyle = lit ? '#000' : '#f4ead6'; g.fillRect(0, 0, W, H); const cw = W / cols;
    for (let i = 0; i < cols; i++) { const x = i * cw; if (i % 2 === 1) { g.fillStyle = lit ? '#ffcf7a' : '#5a7088'; g.fillRect(x + cw * 0.22, H * 0.28, cw * 0.56, H * 0.44); if (!lit) { g.fillStyle = '#4a2e1e'; g.fillRect(x + cw * 0.47, H * 0.28, cw * 0.06, H * 0.44); g.fillRect(x + cw * 0.22, H * 0.47, cw * 0.56, H * 0.05); g.fillStyle = '#c0392b'; g.fillRect(x + cw * 0.18, H * 0.72, cw * 0.64, H * 0.07); } }
      else if (!lit) { g.strokeStyle = '#4a2e1e'; g.lineWidth = 12; g.beginPath(); g.moveTo(x, H); g.lineTo(x + cw, 0); g.moveTo(x, 0); g.lineTo(x + cw, H); g.stroke(); } }
    if (!lit) { g.fillStyle = '#4a2e1e'; for (let i = 0; i <= cols; i++) g.fillRect(i * cw - 7, 0, 14, H); g.fillRect(0, 0, W, 14); g.fillRect(0, H - 14, W, 14); } };
  const m = new THREE.MeshStandardMaterial({ map: canvas(512, 256, draw(false)), roughness: 0.85 });
  if (k.night) { m.emissiveMap = canvas(512, 256, draw(true)); m.emissive = C('#ffffff'); m.emissiveIntensity = 1.1; }
  return m;
}
function brewery({ k, world, pal, clear, layout, mobile }) {
  const grav = rep(canvas(128, 128, (g) => { g.fillStyle = '#dccfb2'; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 500; i++) { g.fillStyle = ['#c9b994', '#e9dfc8', '#b8a888', '#d2c3a0'][i % 4]; g.fillRect(k.rnd() * 128, k.rnd() * 128, 2.5, 2.5); } }), 8, 8);
  ground(k, world, { color: k.night ? '#2f4a2a' : '#72ad4a', coreTex: grav, edge: '#7a5236', edgeH: 0.3 });
  // 釀酒屋（主建築）：石基座、兩層木筋牆（二樓外挑）、陡斜紅瓦屋頂、銅綠小鐘塔、拱形木門、掛牌
  const h = grp(HX, 0.12, HZ); world.add(h);
  add(k, h, box(HW - 0.4, 0.6, HD - 0.4), k.m('#a8a090', { flatShading: true }), 0, 0.3, 0);
  add(k, h, box(HW - 0.6, 2.5, HD - 0.6), fachwerk(k, 6), 0, 1.85, 0);
  add(k, h, box(HW - 0.2, 2.2, HD - 0.2), fachwerk(k, 7), 0, 4.2, 0); add(k, h, box(HW, 0.16, HD), '#4a2e1e', 0, 3.12, 0);
  const tiles = tm(rep(stripeTex('#a8432a', '#c0553a', 14, false), 2, 1), { roughness: 0.7 });
  add(k, h, gable(HW + 0.1, HD - 0.2, 3.3, 0.45), [k.m('#f4ead6'), tiles], 0, 5.3, 0);
  const cup = grp(1.6, 7.6, 0); h.add(cup); add(k, cup, box(0.8, 1.2, 0.8), '#f4ead6', 0, 0.6, 0); add(k, cup, new THREE.LatheGeometry([[0.62, 0], [0.7, 0.3], [0.4, 0.8], [0.08, 1.2], [0.03, 1.6]].map(([a, b]) => new THREE.Vector2(a, b)), 12), k.m('#5aa08a', { roughness: 0.5 }), 0, 1.2, 0);
  add(k, h, box(1.6, 2.0, 0.1), '#5a3420', 0, 1.6, HD / 2 - 0.25); add(k, h, new THREE.CircleGeometry(0.8, 20, 0, Math.PI), k.m('#5a3420'), 0, 2.6, HD / 2 - 0.2); add(k, h, box(0.04, 2.0, 0.04), '#2b1d14', 0, 1.6, HD / 2 - 0.19, false);
  const sign = nameSign(k, 3.6, 0.5, '#2b1d14', '#f2d39a', '"Noto Serif TC", serif'); sign.position.set(0, 3.45, HD / 2 + 0.03); h.add(sign);
  const flowers = []; for (const x of [-2.25, 2.25]) for (let j = 0; j < 5; j++) flowers.push({ x: x - 0.4 + j * 0.2, y: 4.0, z: HD / 2 + 0.08, s: 0.09, c: j % 2 ? '#e8384f' : '#ff7aa2' });
  for (const x of [-2.25, 2.25]) add(k, h, box(1.1, 0.15, 0.22), '#6b4a35', x, 3.88, HD / 2 + 0.02);
  inst(h, k.g('bwfl', () => new THREE.IcosahedronGeometry(1, 0)), k.m('#ffffff'), flowers, false);
  // 掛牌（啤酒杯圖案，隨風擺）
  add(k, h, box(0.08, 0.08, 1.0), '#2b2b2b', 2.95, 2.75, HD / 2 + 0.3);
  const hang = grp(2.95, 2.7, HD / 2 + 0.6); h.add(hang);
  const mugT = canvas(128, 128, (g) => { g.fillStyle = '#f2d39a'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#4a2e1e'; g.lineWidth = 8; g.strokeRect(4, 4, 120, 120); g.fillStyle = '#e8a83a'; g.fillRect(36, 44, 44, 58); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(46, 44, 12, 0, TAU); g.arc(62, 40, 13, 0, TAU); g.arc(76, 45, 10, 0, TAU); g.fill(); g.strokeStyle = '#e8a83a'; g.lineWidth = 9; g.beginPath(); g.arc(84, 72, 14, -1.4, 1.4); g.stroke(); });
  add(k, hang, box(0.06, 0.75, 0.75), [k.m('#4a2e1e'), k.m('#4a2e1e'), k.m('#4a2e1e'), k.m('#4a2e1e'), basic(mugT), basic(mugT)], 0, -0.42, 0).rotation.y = Math.PI / 2;
  k.anim.push((t) => { hang.rotation.x = Math.sin(t * 1.6) * 0.18; });
  // 銅製釀酒鍋（冒蒸汽）
  const copper = k.m('#c97a3e', { metalness: 0.35, roughness: 0.3 }), kg = k.g('bwket', () => new THREE.LatheGeometry([[0, 0], [1.05, 0], [1.2, 0.3], [1.2, 1.5], [0.95, 2.0], [0.4, 2.35], [0.22, 2.7], [0.22, 3.3], [0, 3.3]].map(([a, b]) => new THREE.Vector2(a, b)), 20));
  const kx = [9.8, 12.6, 15.4], kz = -9.2;
  add(k, world, box(8.4, 0.5, 3.0), k.m('#a8432a', { flatShading: true }), 12.6, 0.25, kz);
  kx.forEach((x, i) => { if (!clear(x, kz, 1.3, 4)) return; const s = 1 - i * 0.08; const ke = add(k, world, kg, copper, x, 0.5, kz); ke.scale.setScalar(s); add(k, world, cyl(0.3, 0.3, 0.6, 10), '#b8862e', x, 0.5 + 3.3 * s, kz, { metalness: 0.4, roughness: 0.3 }); puffs(k, world, x, 0.8 + 3.3 * s, kz, { n: 5, color: 0xf4f4f4, size: 0.35, rise: 2.6, speed: 0.22 + i * 0.03, opacity: 0.6 }); });
  add(k, world, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(9.8, 2.6, kz), new THREE.Vector3(11.2, 3.3, kz + 0.3), new THREE.Vector3(12.6, 2.5, kz), new THREE.Vector3(14, 3.1, kz - 0.3), new THREE.Vector3(15.4, 2.4, kz)]), 40, 0.1, 6), copper, 0, 0, 0);
  // 橡木桶堆
  const bar = k.g('bwbar', () => new THREE.LatheGeometry([[0, -0.55], [0.36, -0.55], [0.45, 0], [0.36, 0.55], [0, 0.55]].map(([a, b]) => new THREE.Vector2(a, b)), 14));
  const barT = rep(canvas(128, 128, (g) => { for (let i = 0; i < 16; i++) { g.fillStyle = ['#9a6a3a', '#a8743f', '#8e6034'][i % 3]; g.fillRect(i * 8, 0, 8, 128); } g.fillStyle = '#3a3a3a'; for (const y of [10, 34, 90, 114]) g.fillRect(0, y, 128, 6); }), 1, 1);
  const barrels = []; for (const [bx, bz, ry] of [[-11.4, -7.5, 0.3], [-5.6, -9.6, 0]]) { const n = mobile ? 3 : 4; for (let row = 0; row < n; row++) for (let j = 0; j < n - row; j++) { const off = (j - (n - row - 1) / 2) * 0.92; barrels.push({ x: bx + Math.cos(ry) * off, y: 0.47 + row * 0.8, z: bz - Math.sin(ry) * off, rx: Math.PI / 2, ry, o: 'YXZ' }); } }
  for (const [x, z] of [[-9.6, 2.6], [9.4, 0.2], [-9.3, -2.4]]) barrels.push({ x, y: 0.57, z });
  inst(world, bar, tm(barT), barrels);
  // 長桌與長椅、啤酒杯
  const tops = [], legs = [], seats = [], mugs = [], foam = [], spots = [];
  for (const s of [-1, 1]) for (let j = 0; j < 3; j++) for (const tz of [-1.4, 4.6]) {
    const tx = s * (10.6 + j * 2.6); if (mobile && j === 2) continue; if (!clear(tx, tz, 2.1, 1.2)) continue;
    tops.push({ x: tx, y: 0.8, z: tz }); for (const dz of [-1.6, 1.6]) legs.push({ x: tx, y: 0.4, z: tz + dz });
    for (const dx of [-0.75, 0.75]) seats.push({ x: tx + dx, y: 0.46, z: tz });
    for (let m = 0; m < 5; m++) { const mx = tx + (m % 2 ? 0.22 : -0.22), mz = tz - 1.6 + m * 0.8 + k.rnd() * 0.2; mugs.push({ x: mx, y: 0.95, z: mz }); foam.push({ x: mx, y: 1.06, z: mz }); }
    if (spots.length < 4 && k.rnd() < 0.7) { const dx = (spots.length % 2 ? 0.75 : -0.75); spots.push({ x: tx + dx, z: tz + (k.rnd() - 0.5) * 2, y: 0.5, face: [tx, tz], pose: 'sit', prop: 'cup' }); }
  }
  const wood = k.m('#a8754a', { roughness: 0.8 });
  inst(world, k.g('bwtop', () => box(0.9, 0.08, 4.2)), wood, tops); inst(world, k.g('bwleg', () => box(0.7, 0.8, 0.08)), k.m('#7a5236'), legs);
  inst(world, k.g('bwseat', () => box(0.32, 0.07, 4.2)), wood, seats); inst(world, k.g('bwsleg', () => box(0.28, 0.46, 3.4)), k.m('#7a5236'), seats.map(p => ({ ...p, y: 0.23, sz: 0.25 })));
  inst(world, k.g('bwmug', () => cyl(0.08, 0.075, 0.22, 8)), k.m('#e8a83a', { transparent: true, opacity: 0.85, roughness: 0.15 }), mugs, false); inst(world, k.g('bwfoam', () => cyl(0.085, 0.085, 0.05, 8)), k.m('#fffaf0'), foam, false);
  // 栗子樹＋燈串（晚上閃爍）
  for (const [x, z] of [[-13.5, 1.6], [13.5, 1.6], [-17, -4], [17, -4], [-16.6, 8.4], [16.6, 8.4]]) if (clear(x, z, 2, 6)) world.add(bigTree(k, x, z, 1.25, k.night ? '#2e5a35' : '#4f9a3a'));
  const bulbM = new THREE.MeshStandardMaterial({ color: C('#ffe2a0'), emissive: C(k.night ? '#ffc860' : '#000000'), emissiveIntensity: 2.2, roughness: 0.4 }), bulbs = [];
  for (const s of [-1, 1]) for (const [a, b] of [[[9.4, -3.6], [18.6, -3.6]], [[9.4, 6.8], [18.6, 6.8]], [[9.4, -3.6], [18.6, 6.8]], [[9.4, 6.8], [18.6, -3.6]]]) { for (let i = 1; i < 16; i++) { const u = i / 16; bulbs.push({ x: s * (a[0] + (b[0] - a[0]) * u), y: 3.6 - Math.sin(Math.PI * u) * 0.9, z: a[1] + (b[1] - a[1]) * u, s: 0.08 }); } }
  for (const s of [-1, 1]) for (const [x, z] of [[9.4, -3.6], [18.6, -3.6], [9.4, 6.8], [18.6, 6.8]]) add(k, world, k.g('bwpost', () => cyl(0.06, 0.08, 3.7, 6)), '#6b4a35', s * x, 1.85, z);
  inst(world, k.g('bwbulb', () => sph(1, 6, 4)), bulbM, bulbs, false);
  if (k.night) k.anim.push((t) => { bulbM.emissiveIntensity = 2.0 + Math.sin(t * 3) * 0.4; });
  // 啤酒花棚架（藤蔓隨風擺動）
  for (let row = 0; row < 4; row++) { const z = -15 - row * 4, rg = grp(0, 0, z); world.add(rg); const bines = [], cones = [], poles = [];
    for (let x = -26; x <= 26; x += 1.3) { if (row === 0 && Math.abs(x) < 6) continue; if (mobile && (Math.round(x / 1.3) % 2)) continue; if (!clear(x, z, 0.5, 6)) continue; bines.push({ x, y: 2.9, z: 0, ry: k.rnd() * 3 }); for (let j = 0; j < 6; j++) { const a = k.rnd() * TAU, yy = 1.2 + k.rnd() * 4.2; cones.push({ x: x + Math.sin(a) * 0.33, y: yy, z: Math.cos(a) * 0.33, rx: Math.PI }); } }
    for (let x = -26; x <= 26; x += 5.2) poles.push({ x, y: 3.25, z: 0 });
    inst(rg, k.g('bwbine', () => merge([0, 1, 2, 3, 4].map(i => new THREE.IcosahedronGeometry(1, 0).scale(0.46 - i * 0.04, 0.72, 0.46 - i * 0.04).rotateY(i * 1.3).translate(0, -2.3 + i * 1.12, 0)))), k.m(k.night ? '#24502e' : '#3f8a34', { flatShading: true }), bines); inst(rg, k.g('bwcone', () => cone(0.13, 0.3, 6)), k.m('#c8e08a'), cones, false);
    inst(rg, k.g('bwpole', () => cyl(0.07, 0.09, 6.5, 6)), k.m('#8a6a4a'), poles); add(k, rg, box(53, 0.04, 0.04), '#555555', 0, 6.4, 0, false);
    k.anim.push((t) => { rg.rotation.x = Math.sin(t * 0.9 + row) * 0.025; }); }
  // 五月樹（藍白斜紋柱、花環、隨風飄的彩帶）
  const mp = grp(-12.6, 0, -11.8); world.add(mp);
  const diag = canvas(128, 128, (g) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#2e6fc0'; for (let i = -128; i < 256; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 16, 0); g.lineTo(i + 144, 128); g.lineTo(i + 128, 128); g.fill(); } }); rep(diag, 1, 10);
  add(k, mp, cyl(0.16, 0.24, 12.5, 10), tm(diag), 0, 6.25, 0);
  for (const y of [5.2, 8.2, 11]) add(k, mp, new THREE.TorusGeometry(0.9 - y * 0.03, 0.16, 6, 18), k.m('#3d8a45', { flatShading: true }), 0, y, 0).rotation.x = Math.PI / 2;
  for (const [y, a] of [[6.6, 0], [9.6, 1.2]]) { add(k, mp, box(2.4, 0.06, 0.06), '#5a3d2b', 0, y, 0).rotation.y = a; for (const s of [-1, 1]) add(k, mp, box(0.5, 0.4, 0.04), ['#2e6fc0', '#c0392b', '#f2c94c'][(y | 0) % 3], s * 1.05 * Math.cos(a), y - 0.3, -s * 1.05 * Math.sin(a)).rotation.y = a; }
  add(k, mp, cone(0.5, 1.2, 8), k.m('#3d8a45', { flatShading: true }), 0, 13.0, 0);
  const crown = grp(0, 11, 0); mp.add(crown); const rib = [];
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, r = grp(Math.sin(a) * 0.62, 0, Math.cos(a) * 0.62); r.rotation.y = a; crown.add(r); add(k, r, k.g('bwrib', () => new THREE.PlaneGeometry(0.16, 2.6).translate(0, -1.3, 0)), k.m(i % 2 ? '#2e6fc0' : '#ffffff', { side: THREE.DoubleSide }), 0, 0, 0, false); rib.push(r); }
  k.anim.push((t) => { crown.rotation.y = t * 0.3; rib.forEach((r, i) => { r.rotation.x = 0.25 + Math.sin(t * 2.4 + i) * 0.2; }); });
  // 巴伐利亞菱格旗串（廣場外圈）
  const dia = [], pa = [-2.5, -1.75, -1.0, -0.35, 0.35, 1.0, 1.75, 2.5];
  pa.forEach((a) => add(k, world, k.g('bwfpost', () => cyl(0.05, 0.06, 2.8, 6)), '#6b4a35', Math.sin(a) * 9.0, 1.4, Math.cos(a) * 9.0));
  for (let i = 0; i < pa.length - 1; i++) { if (pa[i] < -0.4 && pa[i + 1] > 0.4) continue; const [a, b] = [pa[i], pa[i + 1]]; for (let j = 1; j < 9; j++) { const u = j / 9, x = Math.sin(a) * 9 * (1 - u) + Math.sin(b) * 9 * u, z = Math.cos(a) * 9 * (1 - u) + Math.cos(b) * 9 * u; dia.push({ x, y: 2.55 - Math.sin(Math.PI * u) * 0.45, z, ry: Math.atan2(Math.sin(b) - Math.sin(a), Math.cos(b) - Math.cos(a)) + Math.PI / 2, rz: Math.PI / 4, s: 0.3, c: j % 2 ? '#2e6fc0' : '#ffffff' }); }
    for (let j = 0; j < 9; j++) { const u0 = j / 9, u1 = (j + 1) / 9, P = (u) => [Math.sin(a) * 9 * (1 - u) + Math.sin(b) * 9 * u, 2.75 - Math.sin(Math.PI * u) * 0.45, Math.cos(a) * 9 * (1 - u) + Math.cos(b) * 9 * u], p0 = P(u0), p1 = P(u1), sg = add(k, world, k.g('bwstr', () => box(0.02, 0.02, 1)), '#f4efe4', (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2, false); sg.scale.z = Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]); sg.lookAt(p1[0], p1[1], p1[2]); } }
  inst(world, k.g('bwdia', () => new THREE.PlaneGeometry(1, 1)), k.m('#ffffff', { side: THREE.DoubleSide }), dia.map(d => ({ ...d, o: 'YXZ' })), false);
  // 蝴蝶餅小攤（招牌蝴蝶餅會轉）
  const pp = layout.place(k.rnd, 0.85, 2.6) || { x: 6, z: 2.6 };
  const ps = grp(pp.x, 0.12, pp.z); ps.rotation.y = Math.atan2(-pp.x, 0.9 - pp.z); world.add(ps);
  add(k, ps, box(1.3, 0.95, 0.75), tm(stripeTex('#2e6fc0', '#ffffff', 8)), 0, 0.48, 0); add(k, ps, box(1.4, 0.06, 0.85), '#a8754a', 0, 0.98, 0);
  for (const x of [-0.6, 0.6]) add(k, ps, cyl(0.03, 0.03, 1.4, 5), '#6b4a35', x, 1.7, -0.3);
  add(k, ps, box(1.5, 0.06, 1.0), tm(stripeTex('#c0392b', '#ffffff', 8)), 0, 2.42, -0.1).rotation.x = 0.2;
  const prz = add(k, ps, new THREE.TorusKnotGeometry(0.32, 0.08, 64, 8, 2, 3), k.m('#a8642a', { roughness: 0.5 }), 0, 2.95, -0.1); for (let i = 0; i < 3; i++) add(k, ps, k.g('bwpz', () => new THREE.TorusGeometry(0.12, 0.04, 6, 12)), '#a8642a', -0.35 + i * 0.35, 1.06, 0.1).rotation.x = Math.PI / 2;
  k.anim.push((t) => { prz.rotation.y = t * 0.8; });
  spots.push({ x: pp.x + Math.sin(ps.rotation.y + Math.PI) * 0.75, z: pp.z + Math.cos(ps.rotation.y + Math.PI) * 0.75, face: [pp.x, pp.z], pose: 'work' });
  return { spots, features: ['木筋釀酒屋', '長桌啤酒花園', '銅製釀酒鍋', '啤酒花棚架', '五月樹', '橡木桶堆'], heroH: 9.4 };
}

// ================= 熱帶果園 =================
const orangeSlice = (k) => canvas(256, 256, (g) => { g.fillStyle = '#ff9a1a'; g.beginPath(); g.arc(128, 128, 126, 0, TAU); g.fill(); g.fillStyle = '#fff2c8'; g.beginPath(); g.arc(128, 128, 108, 0, TAU); g.fill(); for (let i = 0; i < 10; i++) { const a0 = i / 10 * TAU + 0.05, a1 = (i + 1) / 10 * TAU - 0.05; g.fillStyle = '#ffb02e'; g.beginPath(); g.moveTo(128 + Math.cos((a0 + a1) / 2) * 12, 128 + Math.sin((a0 + a1) / 2) * 12); g.arc(128, 128, 98, a0, a1); g.fill(); } });
function orchard({ k, world, pal, clear, mobile }) {
  const mosaic = rep(canvas(128, 128, (g) => { g.fillStyle = '#fff1d6'; g.fillRect(0, 0, 128, 128); const cs = ['#ffb02e', '#ffd84a', '#8ccf4a', '#ff7a4a']; for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const x = i * 64 + 32, y = j * 64 + 32; g.fillStyle = cs[(i + j * 2) % 4]; g.beginPath(); g.arc(x, y, 22, 0, TAU); g.fill(); g.strokeStyle = '#fff8e6'; g.lineWidth = 3; for (let s = 0; s < 6; s++) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(s * 1.047) * 20, y + Math.sin(s * 1.047) * 20); g.stroke(); } } }), 8, 8);
  ground(k, world, { color: k.night ? '#2f4a26' : '#84c450', core: null, coreTex: mosaic, edge: '#f59a2a', edgeH: 0.3 });
  // 曳引機的環形泥土路（右側果園）
  const loop = new THREE.CatmullRomCurve3([[11, 6], [11, -10], [15, -17], [22, -17], [26, -10], [26, 4], [21, 10], [15, 10.5]].map(([x, z]) => new THREE.Vector3(x, 0, z)), true);
  add(k, world, ribbon(loop, 2.2, 160, 0.02), k.m('#c8a06a', { roughness: 1, side: THREE.DoubleSide }), 0, 0, 0, false);
  const lanePts = loop.getSpacedPoints(80), nearLane = (x, z, d) => lanePts.some(p => Math.hypot(p.x - x, p.z - z) < d);
  // 鳳梨田（左前方，低矮）
  const pine = { x0: -24, x1: -10.5, z0: 0, z1: 14 }, leafG = k.g('orpl', () => merge([0, 1, 2, 3, 4, 5, 6].map(i => new THREE.ConeGeometry(0.09, 0.9, 4).translate(0, 0.45, 0).rotateX(0.75 + (i % 2) * 0.3).rotateY(i / 7 * TAU))));
  const pl = [], pf = [], pc = [];
  for (let x = pine.x0; x <= pine.x1; x += 1.25) for (let z = pine.z0; z <= pine.z1; z += 1.0) { if (Math.hypot(x, z) < CORE + 1.4) continue; if (mobile && k.rnd() < 0.4) continue; const jx = x + (k.rnd() - 0.5) * 0.2, jz = z + (k.rnd() - 0.5) * 0.2; pl.push({ x: jx, y: 0.02, z: jz, ry: k.rnd() * 3 }); if (k.rnd() < 0.7) { pf.push({ x: jx, y: 0.42, z: jz, sx: 0.17, sy: 0.24, sz: 0.17 }); pc.push({ x: jx, y: 0.7, z: jz, s: 0.5 }); } }
  inst(world, leafG, k.m(k.night ? '#2a5a3a' : '#3f8a5a', { flatShading: true }), pl);
  inst(world, k.g('orpf', () => new THREE.IcosahedronGeometry(1, 1)), k.m('#e8a830', { flatShading: true, roughness: 0.6 }), pf);
  inst(world, k.g('orpc', () => merge([0, 1, 2, 3, 4].map(i => new THREE.ConeGeometry(0.06, 0.5, 4).translate(0, 0.25, 0).rotateX(0.35).rotateY(i / 5 * TAU)))), k.m('#4f9a4a', { flatShading: true }), pc);
  // 灑水器（旋轉的水弧）
  const spr = [[-16, 5], [-19, 11]].map(([x, z]) => { add(k, world, cyl(0.04, 0.04, 0.9, 6), '#8a8f94', x, 0.45, z); return { x, z }; });
  const NS = 40, sa = new Float32Array(NS * 3 * spr.length), sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sa, 3));
  world.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xcfefff, size: 0.12, transparent: true, opacity: 0.85, depthWrite: false })));
  k.anim.push((t) => { spr.forEach(({ x, z }, si) => { const a = t * 1.2 + si * 2; for (let i = 0; i < NS; i++) { const u = i / NS, o = (si * NS + i) * 3; sa[o] = x + Math.cos(a) * u * 3.2; sa[o + 1] = 0.9 + u * 1.4 - u * u * 2.2; sa[o + 2] = z + Math.sin(a) * u * 3.2; } }); sg.attributes.position.needsUpdate = true; });
  // 柳橙樹、芒果樹（一排排，結滿果實）
  const tr = [], cr = [], fr = [];
  for (let x = -34; x <= 34; x += 3.3) for (let z = -36; z <= 8; z += 3.3) {
    const jx = x + (k.rnd() - 0.5) * 0.6, jz = z + (k.rnd() - 0.5) * 0.6, r = Math.hypot(jx, jz);
    if (r < CORE + 2.6) continue; if (jx > pine.x0 - 1.5 && jx < pine.x1 + 1.5 && jz > pine.z0 - 1.5) continue; if (nearLane(jx, jz, 2.0)) continue; if (Math.hypot(jx + 11.5, jz + 5.2) < 4) continue;
    if (Math.abs(jx) < 5.5 && jz > -13) continue; if (mobile && k.rnd() < 0.45) continue; if (!clear(jx, jz, 1.4, 3.6)) continue;
    const mango = (Math.floor(x / 3.3) + Math.floor(z / 3.3)) % 3 === 0, s = 0.85 + k.rnd() * 0.3;
    tr.push({ x: jx, y: 0.7 * s, z: jz, s }); cr.push({ x: jx, y: 2.1 * s, z: jz, s: s * 1.35, sy: s * 1.15, ry: k.rnd() * 3, c: mango ? (k.night ? '#24502e' : '#2f7a38') : (k.night ? '#2e5a2e' : '#4a9a3a') });
    for (let j = 0; j < (mobile ? 5 : 8); j++) { const a = k.rnd() * TAU, b = k.rnd() * 1.3 - 0.45; fr.push({ x: jx + Math.sin(a) * Math.cos(b) * 1.32 * s, y: (2.1 + Math.sin(b) * 1.12) * s, z: jz + Math.cos(a) * Math.cos(b) * 1.32 * s, s: 0.16, sy: mango ? 0.21 : 0.16, c: mango ? ['#f2b02a', '#e8582a', '#f2c94c'][j % 3] : '#ff8c1a' }); } }
  inst(world, k.g('ortr', () => cyl(0.12, 0.2, 1.4, 6)), k.m('#7a5236'), tr);
  inst(world, k.g('orcr', () => new THREE.IcosahedronGeometry(1, 1)), k.m('#ffffff', { flatShading: true }), cr);
  inst(world, k.g('orfr', () => new THREE.IcosahedronGeometry(1, 1)), k.m('#ffffff', { roughness: 0.5 }), fr, false);
  // 遠山
  for (const [x, z, s] of [[-50, -60, 26], [8, -72, 32], [52, -56, 24]]) add(k, world, cone(s, s * 0.75, 8), k.m(k.night ? '#24342e' : '#6faa7a', { flatShading: true }), x, s * 0.37, z).castShadow = false;
  // 水果箱
  const crateT = canvas(64, 64, (g) => { g.fillStyle = '#c8955a'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#a87440'; for (const y of [0, 20, 40]) g.fillRect(0, y + 16, 64, 4); g.fillRect(0, 0, 4, 64); g.fillRect(60, 0, 4, 64); });
  const crates = [], cfr = []; const addCrate = (x, y, z, c, ry = 0) => { crates.push({ x, y: y + 0.25, z, ry }); for (let i = 0; i < 6; i++) cfr.push({ x: x + ((i % 3) - 1) * 0.22 * Math.cos(ry), y: y + 0.55, z: z + (Math.floor(i / 3) - 0.5) * 0.24 - ((i % 3) - 1) * 0.22 * Math.sin(ry), s: 0.12, c }); };
  [[-5.0, -7.6], [5.0, -7.6]].forEach(([x, z], si) => { addCrate(x, 0.02, z, '#ff8c1a'); addCrate(x + 0.75, 0.02, z + 0.1, '#f2c94c'); addCrate(x + 0.35, 0.52, z + 0.05, si ? '#8ccf4a' : '#e8384f'); addCrate(x - 0.1, 0.02, z + 0.8, '#ff6a3a', 0.3); });
  inst(world, k.g('orcrate', () => box(0.7, 0.5, 0.5)), tm(crateT), crates); inst(world, k.g('orfr', () => new THREE.IcosahedronGeometry(1, 1)), k.m('#ffffff', { roughness: 0.5 }), cfr, false);
  // 曳引機拖著水果車，沿環形路繞果園
  const trac = grp(), cartG = grp(); world.add(trac, cartG); const red = k.m('#d8402a', { roughness: 0.45 });
  add(k, trac, box(0.9, 0.6, 1.5), red, 0, 0.75, 0.25); add(k, trac, box(0.8, 0.8, 0.7), red, 0, 1.35, -0.35); add(k, trac, box(0.82, 0.06, 0.9), '#2b2b2b', 0, 1.8, -0.3); add(k, trac, cyl(0.05, 0.05, 0.6, 6), '#2b2b2b', 0.3, 1.5, 0.7);
  const tw = [[-0.55, -0.4, 0.55], [0.55, -0.4, 0.55], [-0.5, 0.75, 0.32], [0.5, 0.75, 0.32]].map(([x, z, r]) => { const w = add(k, trac, k.g('orw' + r, () => cyl(r, r, 0.25, 12)), '#1c1c1c', x, r, z); w.rotation.z = Math.PI / 2; return w; });
  add(k, cartG, box(1.3, 0.5, 1.8), '#a8754a', 0, 0.75, 0); for (const x of [-0.7, 0.7]) add(k, cartG, cyl(0.32, 0.32, 0.15, 10), '#2b2b2b', x, 0.32, 0).rotation.z = Math.PI / 2;
  inst(cartG, k.g('orfr', () => new THREE.IcosahedronGeometry(1, 1)), k.m('#ffffff', { roughness: 0.5 }), Array.from({ length: 14 }, (_, i) => ({ x: -0.45 + (i % 4) * 0.3, y: 1.12 + Math.floor(i / 8) * 0.18, z: -0.65 + Math.floor((i % 8) / 4) * 0.5 + (i % 3) * 0.12, s: 0.17, c: ['#ff8c1a', '#f2b02a', '#ffd84a', '#e8582a'][i % 4] })), false);
  const tg = new THREE.Vector3(); k.anim.push((t) => { const u = (((t * 0.012) % 1) + 1) % 1, u2 = (u - 0.025 + 1) % 1; loop.getPointAt(u, trac.position); loop.getPointAt((u + 0.003) % 1, tg); trac.lookAt(tg); loop.getPointAt(u2, cartG.position); loop.getPointAt((u2 + 0.003) % 1, tg); cartG.lookAt(tg); trac.position.y = cartG.position.y = 0.02 + Math.abs(Math.sin(t * 9)) * 0.02; tw.forEach(w => { w.rotation.x = t * 3; }); });
  // 橘子噴泉：半顆柳橙當水池，柳橙汁往上噴
  const fx = -11.5, fz = -5.2, fg = grp(fx, 0, fz); world.add(fg);
  const cut = add(k, fg, cyl(2.0, 1.4, 0.9, 28), [k.m('#ff9a1a'), new THREE.MeshStandardMaterial({ map: orangeSlice(k), roughness: 0.4 }), k.m('#ff9a1a')], 0, 0.45, 0);
  add(k, fg, cyl(0.25, 0.3, 1.2, 10), '#fff2c8', 0, 1.2, 0);
  const jets = []; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; const j = add(k, fg, k.g('orjet', () => cyl(0.07, 0.11, 1, 8).translate(0, 0.5, 0)), k.m('#ffb02e', { transparent: true, opacity: 0.8, roughness: 0.1 }), Math.cos(a) * 1.2, 0.9, Math.sin(a) * 1.2, false); jets.push(j); }
  const top = add(k, fg, k.g('orjtop', () => cyl(0.12, 0.16, 1, 10).translate(0, 0.5, 0)), k.m('#ffb02e', { transparent: true, opacity: 0.8, roughness: 0.1 }), 0, 1.8, 0, false);
  k.anim.push((t) => { jets.forEach((j, i) => { j.scale.y = 0.6 + Math.abs(Math.sin(t * 2.2 + i * 1.05)) * 1.6; }); top.scale.y = 1 + Math.sin(t * 3) * 0.5; });
  // 果汁吧小屋（主建築）：竹柱、茅草屋頂、水果條紋吧台、屋頂旋轉的大柳橙片
  const h = grp(HX, 0.12, HZ); world.add(h);
  add(k, h, box(HW - 0.2, 0.35, HD - 0.2), '#b88a5a', 0, 0.17, 0);
  add(k, h, box(HW - 1.0, 2.9, 0.25), k.m('#f6e6c8'), 0, 1.8, -HD / 2 + 0.6);
  const menu = canvas(256, 128, (g) => { g.fillStyle = '#2b3a2f'; g.fillRect(0, 0, 256, 128); const cs = ['#ff8c1a', '#ffd84a', '#8ccf4a', '#e8384f', '#f2b02a']; cs.forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(30 + i * 49, 40, 16, 0, TAU); g.fill(); }); g.fillStyle = '#fffaf0'; for (let i = 0; i < 3; i++) g.fillRect(20, 72 + i * 16, 140 + (i % 2) * 60, 5); });
  add(k, h, box(3.4, 1.4, 0.06), basic(menu), 0, 2.2, -HD / 2 + 0.75, false);
  add(k, h, box(HW - 1.2, 1.1, 0.7), tm(stripeTex('#ff9a1a', '#ffd84a', 12)), 0, 0.9, HD / 2 - 0.65); add(k, h, box(HW - 1.0, 0.1, 0.9), '#f6e6c8', 0, 1.5, HD / 2 - 0.65);
  const bam = k.m('#c9a45a', { roughness: 0.7 }); for (const [x, z] of [[-3.1, 1.5], [3.1, 1.5], [-3.1, -1.5], [3.1, -1.5]]) { add(k, h, k.g('orbam', () => cyl(0.12, 0.12, 3.4, 8)), bam, x, 2.05, z); for (let j = 0; j < 4; j++) add(k, h, k.g('orbamr', () => cyl(0.14, 0.14, 0.05, 8)), '#9a7a3a', x, 0.7 + j * 0.8, z, false); }
  const thatch = tm(rep(canvas(64, 64, (g) => { g.fillStyle = '#d9b56a'; g.fillRect(0, 0, 64, 64); g.strokeStyle = '#b8924a'; g.lineWidth = 2; for (let x = 0; x < 64; x += 4) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 2, 64); g.stroke(); } }), 6, 2), { roughness: 1 });
  const r1 = add(k, h, cone(5.4, 1.9, 4, true), thatch, 0, 4.6, 0); r1.rotation.y = Math.PI / 4; r1.scale.set(1, 1, 0.66); r1.material.side = THREE.DoubleSide;
  const r2 = add(k, h, cone(2.4, 1.4, 4), thatch, 0, 5.9, 0); r2.rotation.y = Math.PI / 4; r2.scale.set(1, 1, 0.7);
  const sign = nameSign(k, 4.0, 0.55, '#2f7a38', '#fff2c8'); sign.position.set(0, 3.55, HD / 2 - 0.3); h.add(sign);
  if (k.night) { const l = new THREE.PointLight(0xffc870, 6, 10); l.position.set(0, 3.2, HD / 2 + 1.2); h.add(l); add(k, h, box(3.4, 1.4, 0.04), k.glow('#ffe7b8', 0.5), 0, 2.2, -HD / 2 + 0.72, false); }
  const os = grp(0, 7.9, 0); h.add(os); add(k, os, cyl(1.3, 1.3, 0.32, 32), [k.m('#ff9a1a'), new THREE.MeshStandardMaterial({ map: orangeSlice(k), roughness: 0.4 }), new THREE.MeshStandardMaterial({ map: orangeSlice(k), roughness: 0.4 })], 0, 0, 0).rotation.x = Math.PI / 2; add(k, h, cyl(0.06, 0.06, 1.4, 6), '#8a6a4a', 0, 6.7, 0);
  k.anim.push((t) => { os.rotation.y = t * 0.7; });
  // 吧台上的果汁杯、鳳梨、果汁機
  ['#ff8c1a', '#e8384f', '#8ccf4a', '#ffd84a'].forEach((c, i) => { add(k, h, k.g('orcup', () => cyl(0.12, 0.09, 0.32, 10)), k.m(c, { roughness: 0.3 }), -1.8 + i * 0.5, 1.72, HD / 2 - 0.55); add(k, h, k.g('orstr', () => cyl(0.02, 0.02, 0.4, 4)), '#ffffff', -1.75 + i * 0.5, 1.95, HD / 2 - 0.55, false); });
  const bl = grp(1.6, 1.55, HD / 2 - 0.65); h.add(bl); add(k, bl, cyl(0.16, 0.2, 0.2, 10), '#3a3f44', 0, 0.1, 0); const jar = add(k, bl, cyl(0.16, 0.13, 0.45, 10), k.m('#ffb02e', { transparent: true, opacity: 0.85 }), 0, 0.42, 0);
  k.anim.push((t) => { jar.rotation.y = t * 9; });
  const pa = grp(-2.7, 1.55, HD / 2 - 0.6); h.add(pa); add(k, pa, k.g('orpf', () => new THREE.IcosahedronGeometry(1, 1)), k.m('#e8a830', { flatShading: true }), 0, 0.32, 0).scale.set(0.24, 0.34, 0.24); add(k, pa, k.g('orpc', () => null), k.m('#4f9a4a', { flatShading: true }), 0, 0.62, 0).scale.setScalar(0.8);
  const spots = [{ x: -16.2, z: 8, y: 0.02, face: [-16, 5], pose: 'crouch', hat: 'straw' }, { x: 12.4, z: -3, y: 0.02, face: [16, -3], pose: 'work', hat: 'straw' }, { x: fx + 2.4, z: fz + 0.6, face: [fx, fz], pose: 'stand', prop: 'cup' }];
  return { spots, features: ['果汁吧小屋', '柳橙芒果果園', '鳳梨田', '曳引機水果車', '柳橙噴泉', '水果箱'], heroH: 9.4 };
}

// ================= 水上市場 =================
// 越南斗笠小販（坐在船上）
function vendor(k, g, x, z, shirt) {
  add(k, g, k.g('mkbody', () => cyl(0.16, 0.22, 0.5, 8)), shirt, x, 0.55, z); add(k, g, k.g('mkhead', () => sph(0.13, 10, 8)), '#e8c4a0', x, 0.93, z); add(k, g, k.g('mkhat', () => cone(0.36, 0.22, 14)), k.m('#ead9a8', { roughness: 1 }), x, 1.08, z);
}
function mekong({ k, world, pal, clear, mobile }) {
  const planks = rep(canvas(128, 128, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = ['#a8784a', '#b8865a', '#9a6e44', '#b07e50'][i % 4]; g.fillRect(0, i * 16, 128, 16); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, i * 16, 128, 2); g.fillRect(((i * 37) % 128), i * 16, 2, 16); } }), 6, 6);
  ground(k, world, { color: '#4a6a4a', coreTex: planks, edge: '#6b4a2a', edgeH: 0.22 });
  waterPlane(k, world, 280, 280, 0, 0, { color: '#6b8f62', y: 0.03, speed: [0.004, 0.014] });
  // 廣場是架在水上的木平台：外圈一根根木樁
  const posts = []; for (let i = 0; i < 44; i++) { const a = i / 44 * TAU; posts.push({ x: Math.sin(a) * (CORE + 0.12), y: 0.0, z: Math.cos(a) * (CORE + 0.12) }); }
  inst(world, k.g('mkpost', () => cyl(0.13, 0.15, 0.9, 7)), k.m('#5a3d2b'), posts);
  // 兩岸與後岸（草地＋泥岸）
  for (const [x, z, r] of [[-50, -4, 29], [50, -4, 29], [0, -54, 31]]) { add(k, world, cyl(r + 1.2, r + 2, 0.5, 40), '#8a7a5a', x, 0.0, z).castShadow = false; add(k, world, cyl(r, r + 0.6, 0.6, 40), k.night ? '#2f4a2a' : '#6fa84e', x, 0.1, z).castShadow = false; }
  // 高腳屋（兩岸）
  const stilts = [], wallC = ['#b8865a', '#a8784a', '#c8a06a', '#9a6e44'], roofC = ['#8a3a2a', '#6a7a7a', '#b8924a'];
  const stiltHouse = (x, z, ry, i) => { const g = grp(x, 0, z); g.rotation.y = ry; world.add(g); const w = 3.2 + (i % 2) * 0.8;
    add(k, g, box(w + 0.6, 0.15, 3.0), '#7a5236', 0, 1.2, 0.3); add(k, g, box(w, 1.9, 2.2), k.m(wallC[i % 4], { roughness: 0.9 }), 0, 2.2, 0);
    add(k, g, gable(w, 2.2, 1.3, 0.45), [k.m(wallC[i % 4]), k.m(roofC[i % 3], { flatShading: true })], 0, 3.15, 0);
    add(k, g, box(0.7, 1.3, 0.05), '#3a2a20', -0.6, 1.95, 1.11); add(k, g, box(0.7, 0.55, 0.05), k.night ? k.glow('#ffc46b', 1.6) : k.m('#2b2f33'), 0.8, 2.3, 1.11, false);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 1]]) { const lx = sx * (w / 2 + 0.2), lz = 0.3 + sz * 1.35, c = Math.cos(ry), s = Math.sin(ry); stilts.push({ x: x + lx * c + lz * s, y: 0.6, z: z - lx * s + lz * c }); }
    return g; };
  let si = 0;
  for (let z = -15; z <= 13; z += 5.6) { if (clear(-20.5, z, 2.5, 4.5)) stiltHouse(-20.5, z, Math.PI / 2, si++); if (clear(20.5, z + 2.5, 2.5, 4.5)) stiltHouse(20.5, z + 2.5, -Math.PI / 2, si++); }
  for (let x = -14; x <= 14; x += 6.5) { if (Math.abs(x) < 5) continue; stiltHouse(x, -22.5, 0, si++); }
  inst(world, k.g('mkstilt', () => cyl(0.09, 0.1, 1.2, 6)), k.m('#5a3d2b'), stilts);
  // 椰子樹（岸上）
  const fronds = [], cocos = [], frG = k.g('mkfr', () => { const g = new THREE.PlaneGeometry(0.55, 2.6, 1, 6); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i) + 1.3; p.setY(i, y); p.setZ(i, -y * y * 0.12); } g.computeVertexNormals(); return g; });
  const palm = (x, z, s) => { const lean = (k.rnd() - 0.5) * 0.6, hgt = 5 * s; const top = new THREE.Vector3(x + Math.sin(lean) * 1.2 * s, hgt, z + Math.cos(lean) * 0.4 * s);
    add(k, world, new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(x, 0.3, z), new THREE.Vector3(x, hgt * 0.5, z), top), 6, 0.13 * s, 6), '#9a7a52', 0, 0, 0);
    for (let j = 0; j < 7; j++) fronds.push({ x: top.x, y: top.y, z: top.z, s, ry: j / 7 * TAU, rx: 1.0 + (j % 2) * 0.25, o: 'YXZ' });
    for (let j = 0; j < 3; j++) cocos.push({ x: top.x + Math.cos(j * 2.1) * 0.15, y: top.y - 0.15, z: top.z + Math.sin(j * 2.1) * 0.15, s: 0.13 * s }); };
  let pn = 0; for (let i = 0; i < 60 && pn < (mobile ? 8 : 15); i++) { const side = i % 3, x = side === 2 ? -18 + k.rnd() * 36 : (side ? 1 : -1) * (23.5 + k.rnd() * 6), z = side === 2 ? -26 - k.rnd() * 5 : -18 + k.rnd() * 36; if (!clear(x, z, 1.5, 6)) continue; palm(x, z, 0.9 + k.rnd() * 0.35); pn++; }
  inst(world, frG, k.m(k.night ? '#24502e' : '#3f9a44', { side: THREE.DoubleSide, flatShading: true }), fronds); inst(world, k.g('mkcoco', () => sph(1, 8, 6)), k.m('#6b4a2a'), cocos);
  // 賣水果的小木船：繞著廣場慢慢划、隨波搖晃；有一艘煮河粉的船在冒煙
  const fruitC = ['#e8387a', '#f2c94c', '#3f9a44', '#ff8c1a', '#c0392b', '#f6e05a'], boats = [];
  for (let i = 0; i < (mobile ? 4 : 7); i++) {
    const b = boatShell(k, 3.4, 1.15, 0.38, '#6b4a2a', '#8a6a4a'); world.add(b);
    if (i % 3 === 1) { const cv = add(k, b, new THREE.CylinderGeometry(0.62, 0.62, 1.3, 12, 1, true, -Math.PI / 2, Math.PI), tm(rep(stripeTex('#c9a45a', '#a8843a', 10), 2, 1), { side: THREE.DoubleSide }), 0, 0.38, -0.7); cv.rotation.x = Math.PI / 2; }
    if (i === 2) { add(k, b, cyl(0.28, 0.24, 0.35, 12), '#9aa3ab', 0, 0.55, 0.55, { metalness: 0.3 }); puffs(k, b, 0, 0.8, 0.55, { n: 4, color: 0xf4f4f4, size: 0.2, rise: 1.2, speed: 0.3, opacity: 0.6 }); }
    else inst(b, k.g('mkfruit', () => new THREE.IcosahedronGeometry(1, 1)), k.m('#ffffff', { roughness: 0.6 }), Array.from({ length: 12 }, (_, j) => ({ x: (j % 3 - 1) * 0.26, y: 0.5 + Math.floor(j / 9) * 0.2, z: 0.2 + Math.floor((j % 9) / 3) * 0.28, s: 0.14, sy: j % 4 === 0 ? 0.2 : 0.14, c: fruitC[(i + j) % 6] })), false);
    vendor(k, b, 0, -1.05, k.m(['#3f7ac0', '#c0392b', '#f4efe4', '#2f8a6a'][i % 4]));
    const oar = grp(0.35, 0.7, -1.2); b.add(oar); add(k, oar, k.g('mkoar', () => cyl(0.03, 0.03, 2.2, 5)), '#8a6a4a', 0, -0.4, 0.3).rotation.x = 0.5;
    boats.push({ b, oar, r: 11.8 + (i % 3) * 2.2, a0: i / 7 * TAU * 1.3, sp: (i % 2 ? 1 : -1) * (0.02 + (i % 3) * 0.006), ph: i * 1.7 });
  }
  k.anim.push((t) => boats.forEach(({ b, oar, r, a0, sp, ph }) => { const a = a0 + t * sp; b.position.set(Math.sin(a) * r, 0.02 + Math.sin(t * 1.3 + ph) * 0.05, Math.cos(a) * r); b.rotation.set(0, a + (sp > 0 ? Math.PI / 2 : -Math.PI / 2), Math.sin(t * 1.1 + ph) * 0.05); oar.rotation.x = Math.sin(t * 1.6 + ph) * 0.4; }));
  // 布袋蓮（漂浮移動）
  const NH = mobile ? 10 : 22, hy = [], hm = new THREE.InstancedMesh(k.g('mkhy', () => sph(1, 8, 5)), k.m(k.night ? '#24502e' : '#4f9a3a', { flatShading: true }), NH), hf = new THREE.InstancedMesh(k.g('mkhyf', () => sph(1, 6, 4)), k.glow('#b88ae8', 0.6), NH);
  for (let i = 0; i < NH; i++) hy.push({ r: 10.4 + k.rnd() * 7, a: k.rnd() * TAU, s: 0.3 + k.rnd() * 0.3 }); hm.frustumCulled = hf.frustumCulled = false; world.add(hm, hf);
  k.anim.push((t) => { hy.forEach((p, i) => { const a = p.a + t * 0.008, x = Math.sin(a) * p.r, z = Math.cos(a) * p.r; setInst(hm, i, { x, y: 0.05, z, sx: p.s * 2, sy: p.s * 0.5, sz: p.s * 1.6 }); setInst(hf, i, { x: x + 0.1, y: 0.22, z, s: p.s * 0.4 }); }); hm.instanceMatrix.needsUpdate = hf.instanceMatrix.needsUpdate = true; });
  // 岸邊的升降漁網（慢慢放下、拉起）
  const ng = grp(18.2, 0, 13.5); ng.rotation.y = -0.9; world.add(ng);
  for (const s of [-1, 1]) add(k, ng, cyl(0.07, 0.09, 5.2, 6), '#b89a6a', s * 0.9, 2.4, 0).rotation.z = s * 0.25;
  const arm = grp(0, 4.6, 0); ng.add(arm); add(k, arm, cyl(0.05, 0.05, 5.5, 6), '#b89a6a', 0, 0, -2.6).rotation.x = Math.PI / 2;
  const netT = canvas(64, 64, (g) => { g.strokeStyle = '#e8e2d0'; g.lineWidth = 2; for (let i = 0; i <= 64; i += 8) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 64); g.moveTo(0, i); g.lineTo(64, i); g.stroke(); } });
  const net = add(k, arm, new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshStandardMaterial({ map: netT, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide }), 0, -1.6, -5.2, false); net.rotation.x = -Math.PI / 2; net.castShadow = false;
  for (const s of [-1, 1]) for (const q of [-1, 1]) { const c = add(k, arm, k.g('mkrope', () => cyl(0.012, 0.012, 2.2, 3)), '#e8e2d0', s * 0.6, -0.8, -5.2 + q * 0.6, false); c.rotation.set(q * 0.5, 0, -s * 0.5); c.castShadow = false; }
  k.anim.push((t) => { arm.rotation.x = -0.25 + Math.sin(t * 0.35) * 0.3; });
  // 燈籠串（會安生飄擺的彩色絲綢燈籠）
  const lantGeo = k.g('mklan', () => { const g = sph(0.16, 10, 8); g.scale(1, 1.2, 1); return g; }), capGeo = k.g('mkcap', () => merge([cyl(0.09, 0.09, 0.05, 8).translate(0, 0.2, 0), cyl(0.09, 0.09, 0.05, 8).translate(0, -0.2, 0), cyl(0.015, 0.015, 0.18, 4).translate(0, -0.3, 0)])), lc = ['#e8384f', '#f2c94c', '#ff8c1a', '#e86aa8', '#3fae6a'];
  const lantMat = k.night ? new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }) : k.m('#ffffff', { roughness: 0.6 }), capM = k.m('#b8862e', { roughness: 0.5 }), cordM = k.m('#3a2a20');
  const endZ = HZ + HD / 2 + 0.1;
  [-2.35, -1.25, 1.25, 2.35].forEach((a, si2) => { const x0 = Math.sin(a) * (CORE - 0.25), z0 = Math.cos(a) * (CORE - 0.25), ex = Math.sign(x0) * (1.2 + Math.abs(si2 - 1.5) * 1.2); add(k, world, k.g('mklpost', () => cyl(0.06, 0.08, 4.4, 6)), '#5a3d2b', x0, 2.2, z0);
    const P = (u) => new THREE.Vector3(x0 + (ex - x0) * u, 4.3 - Math.sin(Math.PI * u) * 1.0 - u * 0.9, z0 + (endZ - z0) * u);
    const sg2 = grp(); world.add(sg2); add(k, sg2, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([0, 0.25, 0.5, 0.75, 1].map(P)), 16, 0.015, 4), cordM, 0, 0, 0, false);
    const L = []; for (let j = 1; j < 8; j++) { const q = P(j / 8); L.push({ x: q.x, y: q.y - 0.24, z: q.z, c: lc[(j + si2) % 5] }); } inst(sg2, lantGeo, lantMat, L, false); inst(sg2, capGeo, capM, L.map(p => ({ ...p, c: undefined })), false);
    k.anim.push((t) => { sg2.position.y = Math.sin(t * 1.1 + si2) * 0.04; sg2.rotation.z = Math.sin(t * 0.8 + si2) * 0.004; }); });
  // 水上高腳餐廳（主建築）：木平台架在水上、兩層木屋、重簷瓦頂、大鍋河粉冒煙、紅燈籠
  const h = grp(HX, 0.12, HZ); world.add(h); const teak = k.m('#9a6a3a', { roughness: 0.85 }), dark = k.m('#5a3d2b');
  add(k, h, box(HW + 0.4, 0.25, HD + 0.6), '#8a5a34', 0, 0.55, -0.2); for (let i = 0; i < 3; i++) add(k, h, box(2.0, 0.17, 0.4), '#8a5a34', 0, 0.08 + i * 0.17, HD / 2 + 0.25 - i * 0.3);
  const hst = []; for (let x = -3.6; x <= 3.6; x += 1.2) for (const z of [-2.2, -1.0]) hst.push({ x, y: 0.1, z }); inst(h, k.g('mkhst', () => cyl(0.12, 0.12, 1.2, 6)), dark, hst);
  add(k, h, box(HW - 0.8, 2.3, HD - 1.4), windowMat(k, '#b8865a', HW - 0.8, 2.3, { cols: 6, rows: 1, glass: '#3a2a20', lit: 0.9, seed: 31 }), 0, 1.82, -0.6);
  for (let i = 0; i < 6; i++) add(k, h, k.g('mkcol', () => cyl(0.12, 0.12, 2.4, 8)), '#7a2a1e', -3.0 + i * 1.2, 1.85, HD / 2 - 0.15);
  const tile = k.m('#8a3a2a', { flatShading: true });
  const rf1 = add(k, h, cone(5.4, 1.2, 4), tile, 0, 3.6, -0.2); rf1.rotation.y = Math.PI / 4; rf1.scale.set(1, 1, 0.62);
  add(k, h, box(HW - 2.2, 1.6, HD - 2.0), windowMat(k, '#c8a06a', HW - 2.2, 1.6, { cols: 4, rows: 1, glass: '#3a2a20', lit: 0.8, seed: 33 }), 0, 4.6, -0.6);
  const rf2 = add(k, h, cone(3.8, 1.6, 4), tile, 0, 6.2, -0.6); rf2.rotation.y = Math.PI / 4; rf2.scale.set(1, 1, 0.6);
  for (const [sx, sz] of [[-1, 1], [1, 1]]) { const tp = add(k, h, cone(0.12, 0.7, 5), tile, sx * 3.75, 3.2, sz * 1.25); tp.rotation.set(-0.9, 0, sx * 0.9); }
  const sign = nameSign(k, 4.2, 0.55, '#7a2a1e', '#ffe9b0'); sign.position.set(0, 2.85, HD / 2 - 0.1); h.add(sign);
  const pot = grp(2.4, 0.67, HD / 2 + 0.05); h.add(pot); add(k, pot, box(1.3, 0.8, 0.6), '#7a5236', 0, 0.4, 0); add(k, pot, cyl(0.38, 0.34, 0.5, 14), '#b8bec4', -0.25, 1.05, 0, { metalness: 0.35, roughness: 0.35 }); puffs(k, pot, -0.25, 1.35, 0, { n: 5, color: 0xf8f8f8, size: 0.25, rise: 1.5, speed: 0.3, opacity: 0.65 });
  for (let i = 0; i < 4; i++) add(k, pot, k.g('mkbowl', () => sph(0.12, 10, 6, 0, TAU, Math.PI / 2, Math.PI / 2)), '#f4efe4', 0.25 + (i % 2) * 0.25, 0.85, -0.12 + Math.floor(i / 2) * 0.24);
  for (let i = 0; i < 7; i++) add(k, h, lantGeo, k.glow('#e8384f', 2.2), -3.3 + i * 1.1, 2.45, HD / 2 + 0.05, false);
  const spots = [{ x: -18.3, z: -12.6, y: 1.32, face: [-12, -12.6], pose: 'work', hat: 'straw' }, { x: 18.3, z: -1.3, y: 1.32, face: [12, -1.3], pose: 'stand', hat: 'straw', prop: 'rod' }, { x: -1.2, z: HZ + HD / 2 + 0.3, y: 0.7, face: [-1.2, 0], pose: 'sit' }];
  return { spots, features: ['水上高腳餐廳', '水果小船', '斗笠小販', '高腳屋', '彩色燈籠', '升降漁網'], heroH: 8.0, fog: [30, 120] };
}

// ================= 鐵道車站 =================
function station({ k, world, pal, clear, layout, mobile }) {
  const sq = rep(canvas(128, 128, (g) => { g.fillStyle = '#d8d3c8'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#b8b2a6'; g.lineWidth = 3; for (let i = 0; i <= 128; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke(); } g.fillStyle = '#e8dcc0'; g.fillRect(34, 34, 28, 28); g.fillRect(66, 66, 28, 28); }), 8, 8);
  ground(k, world, { color: k.night ? '#34502a' : '#8cbf5a', coreTex: sq, edge: '#9a9a92', edgeH: 0.22 });
  // 稻田（兩側，田埂分格、有的格子映著天空）
  const paddy = canvas(128, 128, (g) => { const cs = k.night ? ['#2f5a2a', '#3a6a32', '#2a4a3a'] : ['#7cc04a', '#94d058', '#8fb8a0']; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = cs[(i * 3 + j * 2) % 3]; g.fillRect(i * 32, j * 32, 32, 32); g.strokeStyle = 'rgba(70,110,40,.35)'; g.lineWidth = 1.5; for (let r = 4; r < 32; r += 5) { g.beginPath(); g.moveTo(i * 32 + r, j * 32); g.lineTo(i * 32 + r, j * 32 + 32); g.stroke(); } } g.fillStyle = '#b89a6a'; for (let i = 0; i <= 128; i += 32) { g.fillRect(i - 2, 0, 4, 128); g.fillRect(0, i - 2, 128, 4); } });
  for (const [x, z, w, d] of [[-24, 5, 28, 26], [26, 6, 24, 24], [0, 26, 70, 18]]) { const t = rep(paddy.clone(), w / 9, d / 9); t.needsUpdate = true; const m = add(k, world, new THREE.PlaneGeometry(w, d), tm(t, { roughness: 0.6 }), x, 0.015, z, false); m.rotation.x = -Math.PI / 2; }
  // 月台、雨棚、鐵軌、枕木、電車線
  const TZ1 = -14.4, TZ2 = -17.4;
  add(k, world, box(30, 0.9, 2.4), k.m('#b8b2a6'), -5, 0.45, -12.1); add(k, world, box(30, 0.02, 0.3), '#f2c94c', -5, 0.91, -13.0, false);
  const cp = []; for (let x = -18; x <= 8; x += 5.2) cp.push({ x, y: 2.3, z: -11.6 }); inst(world, k.g('stcp', () => cyl(0.1, 0.1, 2.8, 8)), k.m('#3f6a8a'), cp);
  add(k, world, box(28, 0.14, 2.9), k.m('#4f7a9a', { roughness: 0.5 }), -5, 3.75, -12.1);
  const sleep = []; for (const tz of [TZ1, TZ2]) { add(k, world, box(240, 0.25, 3.0), k.m('#8a8580', { flatShading: true }), 0, 0.12, tz, false); for (const dz of [-0.72, 0.72]) add(k, world, box(240, 0.12, 0.09), k.m('#9aa0a6', { metalness: 0.4, roughness: 0.4 }), 0, 0.36, tz + dz, false); for (let x = -90; x <= 90; x += mobile ? 1.4 : 0.9) sleep.push({ x, y: 0.27, z: tz }); }
  inst(world, k.g('stsl', () => box(0.26, 0.07, 2.3)), k.m('#6a4a32'), sleep, false);
  const cat = []; for (let x = -54; x <= 54; x += 12) cat.push({ x, y: 3, z: -19.4 }); inst(world, k.g('stcat', () => box(0.3, 6, 0.3)), k.m('#8a9096'), cat); inst(world, k.g('starm', () => box(0.12, 0.12, 5.6)), k.m('#8a9096'), cat.map(c => ({ ...c, y: 5.8, z: -16.7 })));
  for (const tz of [TZ1, TZ2]) add(k, world, box(240, 0.03, 0.03), '#3a3a3a', 0, 5.3, tz, false);
  // 火車：每隔一段時間進站、停靠、再開走
  const car = (lead) => { const g = grp(); const bt = canvas(256, 64, (c) => { c.fillStyle = '#f4efe4'; c.fillRect(0, 0, 256, 64); c.fillStyle = '#2e5a9a'; c.fillRect(0, 34, 256, 16); c.fillStyle = '#e8762a'; c.fillRect(0, 50, 256, 5); c.fillStyle = '#2b3440'; for (let i = 0; i < 8; i++) c.fillRect(12 + i * 30, 12, 20, 16); });
    const em = k.night ? canvas(256, 64, (c) => { c.fillStyle = '#000'; c.fillRect(0, 0, 256, 64); c.fillStyle = '#ffe8b0'; for (let i = 0; i < 8; i++) c.fillRect(12 + i * 30, 12, 20, 16); }) : null;
    const mm = new THREE.MeshStandardMaterial({ map: bt, roughness: 0.5 }); if (em) { mm.emissiveMap = em; mm.emissive = C('#ffffff'); mm.emissiveIntensity = 1.2; }
    add(k, g, k.g('stcar', () => box(9.0, 2.4, 2.2)), mm, 0, 1.75, 0); add(k, g, k.g('stroof', () => box(9.0, 0.25, 2.0)), '#9aa3ab', 0, 3.05, 0); add(k, g, k.g('stund', () => box(8.0, 0.4, 1.8)), '#2b2f33', 0, 0.45, 0);
    if (lead) { add(k, g, box(0.06, 0.9, 1.6), k.m('#2b3440', { roughness: 0.2 }), -4.53, 2.3, 0, false); for (const z of [-0.65, 0.65]) add(k, g, sph(0.13, 8, 6), k.glow('#fff6d0', 3), -4.52, 1.1, z, false); }
    return g; };
  const train = grp(0, 0, TZ1); world.add(train); for (let i = 0; i < 3; i++) { const c = car(i === 0); c.position.x = i * 9.3; train.add(c); }
  // 平交道（柵欄放下、紅燈交替閃）與號誌
  const CX = 15; add(k, world, box(5, 0.04, 44), k.m('#5a5c62', { roughness: 0.9 }), CX, 0.03, -30, false); add(k, world, box(5, 0.29, 7.2), k.m('#5a5c62'), CX, 0.15, -15.9, false);
  const lampOn = new THREE.MeshStandardMaterial({ color: C('#ff3a2a'), emissive: C('#ff2a1a'), emissiveIntensity: 0, roughness: 0.4 }), lampOn2 = lampOn.clone();
  const arms = [[CX + 3.0, -12.6, -1], [CX - 3.0, -19.2, 1]].map(([x, z, dir]) => { const g = grp(x, 0, z); world.add(g); add(k, g, cyl(0.1, 0.1, 2.6, 8), tm(rep(stripeTex('#f2c94c', '#2b2b2b', 8, false), 1, 1)), 0, 1.3, 0);
    add(k, g, box(0.9, 0.12, 0.05), '#f2c94c', 0, 2.5, 0.08, false).rotation.z = 0.6; add(k, g, box(0.9, 0.12, 0.05), '#f2c94c', 0, 2.5, 0.08, false).rotation.z = -0.6;
    add(k, g, sph(0.14, 10, 8), lampOn, -0.3, 2.0, 0.12, false); add(k, g, sph(0.14, 10, 8), lampOn2, 0.3, 2.0, 0.12, false);
    const piv = grp(0, 1.0, 0.3); g.add(piv); add(k, piv, k.g('starmg', () => box(5.4, 0.12, 0.1).translate(2.7, 0, 0)), tm(rep(stripeTex('#e8384f', '#ffffff', 10), 1, 1)), 0, 0, 0).rotation.y = dir > 0 ? 0 : Math.PI; return { piv, dir }; });
  const sig = grp(-24, 0, -15.9); world.add(sig); add(k, sig, cyl(0.1, 0.12, 4.4, 8), '#5a5f6a', 0, 2.2, 0); add(k, sig, box(0.5, 1.2, 0.3), '#2b2f33', 0, 4.6, 0);
  const sigG = new THREE.MeshStandardMaterial({ color: C('#3aff7a'), emissive: C('#2aff6a'), emissiveIntensity: 0, roughness: 0.4 }), sigR = new THREE.MeshStandardMaterial({ color: C('#ff3a2a'), emissive: C('#ff2a1a'), emissiveIntensity: 0, roughness: 0.4 });
  add(k, sig, sph(0.15, 8, 6), sigG, 0, 4.95, 0.16, false); add(k, sig, sph(0.15, 8, 6), k.m('#c8a030'), 0, 4.6, 0.16, false); add(k, sig, sph(0.15, 8, 6), sigR, 0, 4.25, 0.16, false);
  let gateA = Math.PI / 2, lastT = 0;
  k.anim.push((t) => { const dt = Math.min(0.1, Math.abs(t - lastT)); lastT = t; const P = 38, p = (((t + 12) % P) + P) % P; let x;
    if (p < 10) x = 60 * (1 - p / 10) ** 2; else if (p < 26) x = 0; else if (p < 34) x = -60 * ((p - 26) / 8) ** 2; else x = 300;
    train.position.x = x; train.visible = x < 200; const near = train.visible && x - 5 < CX + 14 && x + 23.5 > CX - 14;
    gateA += ((near ? 0 : Math.PI / 2) - gateA) * Math.min(1, dt * 2.5); arms.forEach(({ piv, dir }) => { piv.rotation.z = dir > 0 ? gateA : -gateA; });
    const blink = near && Math.sin(t * 9) > 0; lampOn.emissiveIntensity = near ? (blink ? 2.6 : 0) : 0; lampOn2.emissiveIntensity = near ? (blink ? 0 : 2.6) : 0;
    const go = p >= 24 && p < 34; sigG.emissiveIntensity = go ? 2.4 : 0.05; sigR.emissiveIntensity = go ? 0.05 : 2.4; });
  // 天橋（跨過鐵軌）
  const fb = grp(-15, 0, 0); world.add(fb); const fbM = k.m('#c9ced3', { roughness: 0.6 });
  if (clear(-15, -15.9, 2, 7)) { add(k, fb, box(1.6, 6.2, 1.6), fbM, 0, 3.1, -20.4); add(k, fb, box(1.9, 0.25, 9.4), fbM, 0, 6.3, -16.0); for (const sx of [-1, 1]) add(k, fb, box(0.06, 1.0, 9.4), '#4f7a9a', sx * 0.92, 6.9, -16.0); add(k, fb, gable(9.6, 2.2, 0.7, 0.1), [fbM, k.m('#4f7a9a', { flatShading: true })], 0, 7.4, -16.0).rotation.y = Math.PI / 2;
    for (const sx of [-0.7, 0.7]) add(k, fb, k.g('stfbp', () => cyl(0.1, 0.1, 5.4, 6)), fbM, sx, 3.6, -11.6); const st = add(k, fb, box(7.2, 0.2, 1.3), fbM, 4.1, 3.55, -11.9); st.rotation.z = -0.78; add(k, fb, box(7.2, 0.6, 0.05), '#4f7a9a', 4.1, 3.95, -11.25).rotation.z = -0.78; }
  // 鐵道後方的老街屋、遠山
  const shopW = ['冰果室', '五金行', '茶行', '旅社', '雜貨店', '照相館', '布莊', '米店'], wm = ['#e8dcc4', '#d8cfc0', '#e8d0b8', '#c8d0d0'].map((c, i) => windowMat(k, c, 4.6, 6, { cols: 3, rows: 3, glass: '#5a6b78', seed: 50 + i, lit: 0.6 }));
  let wi = 0; for (let x = -42; x <= 42; x += 5.4) { if (Math.abs(x - CX) < 4.5 || Math.abs(x + 15) < 3.5) continue; const hh = 5 + ((wi * 7) % 4), g = grp(x, 0, -24.5); world.add(g); add(k, g, box(5, hh, 4), wm[wi % 4], 0, hh / 2, 0);
    const sgn = nameSign(k, 1.0, 2.6, '#fff', '#fff'); sgn.material[4] = basic(canvas(64, 192, (q) => { q.fillStyle = ['#c0392b', '#2e6fa8', '#2f8a6a', '#e8a33a'][wi % 4]; q.fillRect(0, 0, 64, 192); q.fillStyle = '#fff'; q.font = '800 40px "Noto Sans TC", sans-serif'; q.textAlign = 'center'; [...shopW[wi % shopW.length]].forEach((ch, j, arr) => q.fillText(ch, 32, 192 / (arr.length + 1) * (j + 1) + 14)); })); sgn.position.set(1.9, Math.min(hh - 1.6, 3.4), 2.1); g.add(sgn); wi++; }
  for (const [x, z, s] of [[-40, -70, 28], [6, -82, 34], [48, -66, 26]]) add(k, world, cone(s, s * 0.7, 9), k.m(k.night ? '#24342e' : '#5f9a72', { flatShading: true }), x, s * 0.35, z).castShadow = false;
  // 老榕樹（氣根）
  { const x = -10.8, z = -5.2; add(k, world, cyl(1.5, 1.6, 0.5, 18), '#a8543a', x, 0.25, z); const bt = bigTree(k, x, z, 1.5, k.night ? '#24502e' : '#3f8a3a'); bt.position.y = 0.4; world.add(bt); for (let i = 0; i < 7; i++) { const a = i * 0.9; add(k, world, k.g('stroot', () => cyl(0.04, 0.04, 2.6, 4)), '#7a5a3a', x + Math.cos(a) * 1.1, 1.7, z + Math.sin(a) * 1.1, false); } }
  // 白鷺鷥（飛過稻田）
  const egrets = [0, 1, 2].map((i) => { const e = grp(); add(k, e, sph(0.16, 8, 6), '#ffffff', 0, 0, 0).scale.set(0.8, 0.8, 1.8); const wl = grp(), wr = grp(); e.add(wl, wr); add(k, wl, box(0.9, 0.02, 0.3), '#ffffff', -0.45, 0, 0, false); add(k, wr, box(0.9, 0.02, 0.3), '#ffffff', 0.45, 0, 0, false); world.add(e); return { e, wl, wr, ph: i * 2.1, cx: i === 1 ? 24 : -24, r: 5 + i }; });
  k.anim.push((t) => egrets.forEach(({ e, wl, wr, ph, cx, r }) => { const a = t * 0.3 + ph; e.position.set(cx + Math.sin(a) * r, 4 + Math.sin(t * 0.7 + ph) * 0.6, 6 + Math.cos(a) * r); e.rotation.y = a + Math.PI / 2; const f = Math.sin(t * 6 + ph) * 0.5; wl.rotation.z = f; wr.rotation.z = -f; }));
  // 便當推車
  const bp = layout.place(k.rnd, 0.85, 2.2) || { x: 6, z: 2.6 };
  const bc = grp(bp.x, 0.12, bp.z); bc.rotation.y = Math.atan2(-bp.x, 0.9 - bp.z); world.add(bc);
  add(k, bc, box(1.3, 0.7, 0.7), '#a8754a', 0, 0.6, 0); for (const [x, z] of [[-0.5, 0.28], [0.5, 0.28], [-0.5, -0.28], [0.5, -0.28]]) add(k, bc, cyl(0.12, 0.12, 0.06, 10), '#2b2b2b', x, 0.12, z).rotation.x = Math.PI / 2;
  add(k, bc, box(1.2, 0.5, 0.6), k.m('#ffffff', { transparent: true, opacity: 0.35, roughness: 0.1 }), 0, 1.2, 0, false);
  inst(bc, k.g('stbento', () => box(0.32, 0.1, 0.22)), k.m('#ffffff'), Array.from({ length: 9 }, (_, i) => ({ x: -0.38 + (i % 3) * 0.38, y: 1.0 + Math.floor(i / 3) * 0.12, z: 0, c: ['#c0392b', '#2b2b2b', '#e8a33a'][i % 3] })), false);
  add(k, bc, cyl(0.02, 0.02, 1.6, 5), '#555', 0.6, 1.5, -0.3); add(k, bc, box(0.03, 0.42, 0.62), basic(label('便當', '#c0392b', '#fff6d8', 128, 96)), 0.6, 2.05, 0.02, false).rotation.y = Math.PI / 2;
  puffs(k, bc, -0.3, 1.5, 0, { n: 4, color: 0xf8f8f8, size: 0.14, rise: 0.9, speed: 0.35, opacity: 0.6 });
  // 車站（主建築）：日式木造站房、四坡黑瓦、正面山牆門廊、大時鐘、站名牌
  const h = grp(HX, 0.12, HZ); world.add(h); const cream = k.m('#f1e6cf', { roughness: 0.85 }), timber = k.m('#5a3d2b');
  add(k, h, box(HW + 0.2, 0.3, HD), '#bfb8a8', 0, 0.15, 0);
  add(k, h, box(HW - 0.6, 3.3, HD - 0.8), windowMat(k, '#f1e6cf', HW - 0.6, 3.3, { cols: 7, rows: 1, glass: '#7a98aa', lit: 0.9, seed: 61 }), 0, 1.95, -0.2);
  for (const y of [0.9, 3.5]) add(k, h, box(HW - 0.5, 0.12, HD - 0.7), timber, 0, y, -0.2); for (const x of [-3.2, -1.6, 1.6, 3.2]) add(k, h, box(0.14, 3.3, HD - 0.7), timber, x, 1.95, -0.2);
  const rf = add(k, h, cone(5.7, 2.0, 4), k.m('#4a4f55', { flatShading: true }), 0, 4.6, -0.2); rf.rotation.y = Math.PI / 4; rf.scale.set(1, 1, 0.6);
  for (const x of [-1.5, 1.5]) add(k, h, k.g('stpp', () => cyl(0.12, 0.12, 2.9, 8)), timber, x, 1.75, HD / 2 + 0.05);
  add(k, h, box(3.4, 0.2, 1.3), timber, 0, 3.2, HD / 2 - 0.45); const pr = add(k, h, gable(1.5, 3.4, 1.2, 0.25), [cream, k.m('#4a4f55', { flatShading: true })], 0, 3.3, HD / 2 - 0.45); pr.rotation.y = Math.PI / 2;
  const face = canvas(128, 128, (c) => { c.fillStyle = '#fffaf0'; c.beginPath(); c.arc(64, 64, 60, 0, TAU); c.fill(); c.strokeStyle = '#2b2b2b'; c.lineWidth = 5; c.stroke(); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; c.fillStyle = '#2b2b2b'; c.fillRect(64 + Math.cos(a) * 48 - 3, 64 + Math.sin(a) * 48 - 3, 6, 6); } });
  add(k, h, new THREE.CircleGeometry(0.42, 28), new THREE.MeshStandardMaterial({ map: face, emissive: C(k.night ? '#fff6d0' : '#000'), emissiveMap: k.night ? face : null }), 0, 3.82, HD / 2 + 0.3, false);
  const hm = add(k, h, box(0.04, 0.34, 0.02), '#2b2b2b', 0, 3.82, HD / 2 + 0.32, false), hh2 = add(k, h, box(0.05, 0.24, 0.02), '#2b2b2b', 0, 3.82, HD / 2 + 0.33, false); hm.geometry.translate(0, 0.15, 0); hh2.geometry.translate(0, 0.1, 0);
  k.anim.push((t) => { hm.rotation.z = -t * 0.5; hh2.rotation.z = -t * 0.04; });
  add(k, h, box(1.5, 2.1, 0.06), k.night ? k.glow('#ffe7b8', 1.4) : k.m('#a8c4d0', { roughness: 0.2 }), 0, 1.35, HD / 2 - 0.58, false);
  const sign = nameSign(k, 2.9, 0.45, '#ffffff', '#1a1a1a', '"Noto Serif TC", serif'); sign.position.set(0, 2.85, HD / 2 + 0.2); h.add(sign);
  const spots = [{ x: -18, z: 7.5, y: 0.02, face: [-18, 4], pose: 'crouch', hat: 'straw' }, { x: bp.x + Math.sin(bc.rotation.y + Math.PI) * 0.75, z: bp.z + Math.cos(bc.rotation.y + Math.PI) * 0.75, face: [bp.x, bp.z], pose: 'work' }, { x: -12.5, z: -12.4, y: 0.9, face: [-12.5, -20], pose: 'stand', prop: 'bag' }];
  return { spots, features: ['木造車站', '進站的火車', '平交道柵欄', '月台雨棚', '天橋', '便當推車', '稻田'], heroH: 6.6 };
}

// ================= 巴黎街角咖啡 =================
// 奧斯曼式立面：米白石材、落地窗、窗台欄杆（晚上亮燈）
function haussmann(k, rx, ry) {
  const draw = (lit) => (g, W, H) => { g.fillStyle = lit ? '#000' : '#efe3cc'; g.fillRect(0, 0, W, H); for (let i = 0; i < 3; i++) { const x = i * W / 3 + W / 12, w = W / 6; if (lit) { if ((i + 1) % 3) { g.fillStyle = '#ffd88a'; g.fillRect(x, H * 0.18, w, H * 0.62); } continue; } g.fillStyle = '#d8c8aa'; g.fillRect(x - 6, H * 0.12, w + 12, H * 0.72); g.fillStyle = '#4a5562'; g.fillRect(x, H * 0.18, w, H * 0.62); g.fillStyle = '#efe3cc'; g.fillRect(x + w / 2 - 2, H * 0.18, 4, H * 0.62); g.fillStyle = '#26282b'; g.fillRect(x - 4, H * 0.66, w + 8, 3); for (let b = x; b < x + w; b += 6) g.fillRect(b, H * 0.66, 2, H * 0.14); } if (!lit) { g.fillStyle = '#d8c8aa'; g.fillRect(0, H - 8, W, 8); } };
  const t = rep(canvas(256, 128, draw(false)), rx, ry), m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 });
  if (k.night) { m.emissiveMap = rep(canvas(256, 128, draw(true)), rx, ry); m.emissive = C('#ffffff'); m.emissiveIntensity = 1.0; }
  return m;
}
function cafe({ k, world, pal, clear, mobile }) {
  const pave = rep(canvas(128, 128, (g) => { g.fillStyle = '#b8b2a8'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#8f8a82'; g.lineWidth = 2; for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) { const cx = i * 64 - (j % 2) * 32, cy = j * 64; for (let r = 10; r <= 64; r += 10) { g.beginPath(); g.arc(cx + 32, cy, r, 0, Math.PI); g.stroke(); } } }), 9, 9);
  ground(k, world, { color: k.night ? '#3a3c42' : '#5a5c62', coreTex: pave, edge: '#d8d2c4', edgeH: 0.2 });
  // 環形街道：車道虛線、人行道、路緣
  const dash = []; for (let a = 0; a < TAU; a += 0.16) dash.push({ x: Math.sin(a) * 10.5, y: 0.02, z: Math.cos(a) * 10.5, ry: a });
  inst(world, k.g('cfdash', () => box(0.12, 0.01, 0.7)), k.m('#f4f4f0'), dash, false);
  const sw = add(k, world, new THREE.RingGeometry(12.3, 17.5, 72), k.m('#cfc6b6', { roughness: 0.9 }), 0, 0.12, 0, false); sw.rotation.x = -Math.PI / 2;
  add(k, world, cyl(12.32, 12.32, 0.14, 72, true), '#a8a298', 0, 0.06, 0, false);
  // 環繞的奧斯曼建築
  const hm = haussmann(k, 1, 4), slabs = [], rails = [], dorm = [], chim = [];
  const shopC = ['#2f4a3a', '#6a2a2a', '#1f2f4a', '#3a3a3a', '#5a3a5a'], awnC = ['#a8242c', '#2f6a4a', '#1f4a7a', '#c8a03a'];
  const W2 = (g, lx, ly, lz) => { const c = Math.cos(g.rotation.y), s = Math.sin(g.rotation.y); return { x: g.position.x + lx * c + lz * s, y: ly, z: g.position.z - lx * s + lz * c }; };
  let bi = 0;
  for (const a of [1.0, 1.38, 1.76, 2.14, 2.52, 2.9, -1.0, -1.38, -1.76, -2.14, -2.52, -2.9, Math.PI]) {
    const r = 20, x = Math.sin(a) * r, z = Math.cos(a) * r, H = 12.8; if (!clear(x, z, 3.5, H + 2)) continue;
    const g = grp(x, 0, z); g.rotation.y = a + Math.PI; world.add(g); const w = 7.4;
    add(k, g, box(w, 3.2, 5), k.m(shopC[bi % 5], { roughness: 0.6 }), 0, 1.6, 0); add(k, g, box(w - 1.2, 2.0, 0.05), k.night ? k.glow('#ffe2a8', 1.4) : k.m('#a8bcc8', { roughness: 0.15 }), 0, 1.3, 2.53, false);
    if (bi % 2 === 0) awning(k, g, w - 0.8, 1.2, awnC[bi % 4], awnC[bi % 4], 0, 2.7, 2.5, { n: 12 });
    add(k, g, box(w, 9.6, 5), hm, 0, 8.0, 0); add(k, g, box(w + 0.3, 0.3, 5.3), '#e2d4b8', 0, 12.95, 0);
    const mr = add(k, g, k.g('cfman', () => cyl(0.78, 1, 2.4, 4)), k.m('#7f8a96', { flatShading: true, roughness: 0.5 }), 0, 14.3, 0); mr.rotation.y = Math.PI / 4; mr.scale.set(w / 1.414, 1, 5 / 1.414);
    for (const ly of [5.6, 10.4]) { slabs.push({ ...W2(g, 0, ly, 2.75), ry: g.rotation.y, sx: w }); rails.push({ ...W2(g, 0, ly + 0.3, 3.0), ry: g.rotation.y, sx: w }); }
    for (const lx of [-2.2, 0, 2.2]) dorm.push({ ...W2(g, lx, 14.0, 1.9), ry: g.rotation.y });
    for (const lx of [-3.0, 3.0]) chim.push({ ...W2(g, lx, 15.8, -0.6), ry: g.rotation.y });
    bi++;
  }
  inst(world, k.g('cfslab', () => box(1, 0.1, 0.5)), k.m('#e2d4b8'), slabs); inst(world, k.g('cfrail', () => box(1, 0.5, 0.03)), railM(k), rails, false);
  inst(world, k.g('cfdorm', () => box(0.8, 1.0, 0.7)), k.night ? k.glow('#ffd88a', 1.2) : k.m('#efe3cc'), dorm); inst(world, k.g('cfchim', () => box(1.4, 1.0, 0.45)), k.m('#c8643c'), chim);
  // 遠方的鐵塔
  { const lat = canvas(64, 64, (g) => { g.strokeStyle = '#6a5240'; g.lineWidth = 4; g.strokeRect(2, 2, 60, 60); g.beginPath(); g.moveTo(0, 0); g.lineTo(64, 64); g.moveTo(64, 0); g.lineTo(0, 64); g.stroke(); });
    const lm = (rx, ry) => new THREE.MeshStandardMaterial({ map: rep(lat.clone(), rx, ry), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.8 });
    const et = grp(38, 0, -76); world.add(et); const low = add(k, et, new THREE.CylinderGeometry(2.6, 8, 14, 4, 1, true), lm(6, 4), 0, 7, 0, false); low.rotation.y = Math.PI / 4; low.material.map.needsUpdate = true;
    const up = add(k, et, new THREE.CylinderGeometry(0.4, 2.6, 26, 4, 1, true), lm(3, 10), 0, 27, 0, false); up.rotation.y = Math.PI / 4; up.material.map.needsUpdate = true;
    for (const [y, s] of [[14, 6.2], [26, 3.2]]) add(k, et, box(s, 0.5, s), '#6a5240', 0, y, 0, false); add(k, et, cyl(0.12, 0.12, 4, 6), '#6a5240', 0, 42, 0, false); }
  // 法國梧桐（斑駁樹幹）
  const bark = rep(canvas(64, 64, (g) => { g.fillStyle = '#c8c0a8'; g.fillRect(0, 0, 64, 64); for (let i = 0; i < 30; i++) { g.fillStyle = ['#9a9a7a', '#e2dcc8', '#8a8a6a'][i % 3]; g.beginPath(); g.ellipse(k.rnd() * 64, k.rnd() * 64, 4 + k.rnd() * 6, 3 + k.rnd() * 4, k.rnd() * 3, 0, TAU); g.fill(); } }), 1, 2);
  const tT = [], tC = [];
  for (const a of [1.15, 1.6, 2.05, 2.5, -1.15, -1.6, -2.05, -2.5, 2.95, -2.95]) { const r = 13.6, x = Math.sin(a) * r, z = Math.cos(a) * r; if (!clear(x, z, 2, 6)) continue; tT.push({ x, y: 1.8, z }); tC.push({ x, y: 4.6, z, s: 1.9, sy: 1.5, ry: a, c: k.night ? '#2e5a2e' : '#7aac4a' }, { x: x + 0.8, y: 5.4, z: z + 0.3, s: 1.3, ry: a * 2, c: k.night ? '#24502e' : '#8cbc52' }); }
  inst(world, k.g('cftrunk', () => cyl(0.2, 0.28, 3.6, 8)), tm(bark), tT); inst(world, k.g('cfcrown', () => new THREE.IcosahedronGeometry(1, 1)), k.m('#ffffff', { flatShading: true }), tC);
  // 街燈
  const lp = []; for (let i = 0; i < 10; i++) { const a = -2.6 + i * 0.578, r = 12.8; lp.push({ x: Math.sin(a) * r, y: 1.9, z: Math.cos(a) * r }); }
  inst(world, k.g('cflp', () => cyl(0.05, 0.09, 3.8, 6)), k.m('#26282b'), lp); inst(world, k.g('cflh', () => cyl(0.2, 0.12, 0.42, 6)), k.glow('#ffe2a0', 2.4), lp.map(p => ({ ...p, y: 3.95 })), false); inst(world, k.g('cflc', () => cone(0.26, 0.22, 6)), k.m('#26282b'), lp.map(p => ({ ...p, y: 4.27 })), false);
  // 報刊亭、廣告圓柱、畫架
  { const kx = -11.9, kz = 7.6, g = grp(kx, 0.12, kz); g.rotation.y = Math.atan2(-kx, -kz); world.add(g); const gr = k.m('#2f4a3a', { roughness: 0.5 });
    add(k, g, cyl(1.0, 1.0, 2.4, 8), gr, 0, 1.2, 0); add(k, g, box(1.3, 1.0, 0.05), basic(canvas(128, 96, (q) => { ['#e8384f', '#f2c94c', '#2e86de', '#ffffff', '#16a085', '#e8762a'].forEach((c, i) => { q.fillStyle = c; q.fillRect(6 + (i % 3) * 40, 6 + Math.floor(i / 3) * 44, 36, 40); q.fillStyle = '#2b2b2b'; q.fillRect(10 + (i % 3) * 40, 12 + Math.floor(i / 3) * 44, 26, 5); }); })), 0, 1.3, 0.97, false);
    add(k, g, cone(1.35, 0.9, 8), gr, 0, 2.85, 0); add(k, g, sph(0.12, 8, 6), '#c8a03a', 0, 3.4, 0); add(k, g, box(1.2, 0.3, 0.05), basic(label('報刊', '#2f4a3a', '#f2d39a', 128, 32)), 0, 2.25, 1.0, false); }
  { const g = grp(12.6, 0.12, 6.4); world.add(g); const pst = canvas(256, 128, (q) => { q.fillStyle = '#f4efe4'; q.fillRect(0, 0, 256, 128); ['#e8384f', '#2e86de', '#f2c94c', '#16a085', '#8e44ad', '#e8762a'].forEach((c, i) => { q.fillStyle = c; q.fillRect(4 + i * 42, 8 + (i % 2) * 10, 38, 100); q.fillStyle = 'rgba(255,255,255,.8)'; q.fillRect(10 + i * 42, 20 + (i % 2) * 10, 26, 8); }); });
    add(k, g, cyl(0.6, 0.6, 2.4, 16), [new THREE.MeshStandardMaterial({ map: pst, roughness: 0.8 }), k.m('#2f4a3a'), k.m('#2f4a3a')], 0, 1.4, 0); add(k, g, cyl(0.7, 0.7, 0.2, 16), '#2f4a3a', 0, 0.1, 0); add(k, g, dome(0.66, 16, 8), '#2f4a3a', 0, 2.6, 0); add(k, g, sph(0.1, 8, 6), '#c8a03a', 0, 3.3, 0); }
  { const g = grp(-13.4, 0.12, 4.0); g.rotation.y = 2.2; world.add(g); for (const [x, rz] of [[-0.3, 0.15], [0.3, -0.15]]) add(k, g, box(0.05, 1.7, 0.05), '#8a6a4a', x, 0.85, 0).rotation.z = rz; add(k, g, box(0.05, 1.6, 0.05), '#8a6a4a', 0, 0.8, -0.35).rotation.x = -0.3;
    add(k, g, box(0.8, 0.6, 0.04), basic(canvas(128, 96, (q) => { q.fillStyle = '#bfe0f0'; q.fillRect(0, 0, 128, 96); q.fillStyle = '#efe3cc'; q.fillRect(10, 30, 40, 66); q.fillRect(70, 20, 46, 76); q.fillStyle = '#7f8a96'; q.fillRect(10, 22, 40, 10); q.fillRect(70, 12, 46, 10); q.fillStyle = '#7aac4a'; q.beginPath(); q.arc(60, 80, 16, 0, TAU); q.fill(); })), 0, 1.3, 0.05, false); }
  // 停放的腳踏車
  const bike = (g, c) => { for (const z of [-0.45, 0.45]) add(k, g, k.g('cfwh', () => new THREE.TorusGeometry(0.3, 0.025, 6, 18)), '#2b2b2b', 0, 0.31, z).rotation.y = Math.PI / 2; add(k, g, box(0.05, 0.05, 0.9), c, 0, 0.5, 0).rotation.x = 0.15; add(k, g, box(0.05, 0.4, 0.05), c, 0, 0.55, -0.15); add(k, g, box(0.5, 0.04, 0.04), '#2b2b2b', 0, 0.85, 0.4); };
  for (let i = 0; i < (mobile ? 2 : 4); i++) { const a = 0.62 + i * 0.07, g = grp(Math.sin(a) * 13.3, 0.12, Math.cos(a) * 13.3); g.rotation.y = a; world.add(g); bike(g, ['#a8242c', '#2f6a4a', '#f4efe4', hex(pal[0])][i]); }
  // 環形街道上的小車與騎單車的人
  const car = (c) => { const g = grp(); add(k, g, box(1.3, 0.55, 2.6), k.m(c, { roughness: 0.35 }), 0, 0.55, 0); add(k, g, box(1.15, 0.5, 1.3), k.m(c, { roughness: 0.35 }), 0, 1.05, -0.15); add(k, g, box(1.17, 0.36, 1.1), k.m('#2b3440', { roughness: 0.15 }), 0, 1.07, -0.15, false); for (const [x, z] of [[-0.62, 0.85], [0.62, 0.85], [-0.62, -0.85], [0.62, -0.85]]) add(k, g, k.g('cfcw', () => cyl(0.26, 0.26, 0.16, 12)), '#1c1c1c', x, 0.26, z).rotation.z = Math.PI / 2; for (const x of [-0.4, 0.4]) add(k, g, sph(0.08, 8, 6), k.glow('#fff6d0', 2.6), x, 0.6, 1.31, false); world.add(g); return g; };
  const movers = [{ g: car('#f2c94c'), r: 9.7, sp: 0.09, a0: 0 }, { g: car('#7fb8d8'), r: 11.3, sp: 0.07, a0: 3 }];
  { const g = grp(); bike(g, '#2f6a4a'); add(k, g, box(0.36, 0.55, 0.24), k.m(hex(pal[0])), 0, 1.25, -0.05); add(k, g, sph(0.15, 10, 8), '#e8c4a0', 0, 1.7, 0); add(k, g, k.g('cfberet', () => { const q = sph(0.17, 10, 6); q.scale(1, 0.35, 1); return q; }), '#2b2b2b', 0, 1.82, 0); world.add(g); movers.push({ g, r: 11.9, sp: 0.045, a0: 1.5 }); }
  k.anim.push((t) => movers.forEach(({ g, r, sp, a0 }) => { const a = a0 + t * sp; g.position.set(Math.sin(a) * r, 0.02, Math.cos(a) * r); g.rotation.y = a + Math.PI / 2; }));
  // 鴿子（在人行道上啄食）
  const pig = []; for (let i = 0; i < (mobile ? 4 : 8); i++) { const a = -0.45 + i * 0.12, r = 13.2 + (i % 3) * 0.5, g = grp(Math.sin(a) * r, 0.12, Math.cos(a) * r); g.rotation.y = i * 1.3; add(k, g, k.g('cfpig', () => { const q = sph(0.13, 8, 6); q.scale(0.9, 0.8, 1.4); return q; }), '#8a9098', 0, 0.14, 0); const hd = grp(0, 0.22, 0.14); g.add(hd); add(k, hd, k.g('cfpigh', () => sph(0.07, 8, 6)), '#6a7078', 0, 0, 0.02); world.add(g); pig.push({ g, hd, ph: i * 1.7 }); }
  k.anim.push((t) => pig.forEach(({ g, hd, ph }) => { const p = Math.sin(t * 3 + ph); hd.rotation.x = p > 0.6 ? 0.9 : 0; g.position.y = 0.12 + Math.max(0, Math.sin(t * 2.2 + ph * 2)) * 0.06; }));
  // 落葉
  const NL = mobile ? 30 : 70, la = new Float32Array(NL * 3); for (let i = 0; i < NL; i++) { const a = k.rnd() * TAU, r = 11 + k.rnd() * 5; la[i * 3] = Math.sin(a) * r; la[i * 3 + 1] = k.rnd() * 6; la[i * 3 + 2] = Math.cos(a) * r; }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(la, 3)); world.add(new THREE.Points(lg, new THREE.PointsMaterial({ color: 0xe8a33a, size: 0.18, transparent: true, opacity: 0.9, depthWrite: false })));
  let last = 0; k.anim.push((t) => { const dt = Math.min(0.05, Math.abs(t - last)); last = t; for (let i = 0; i < NL; i++) { let y = la[i * 3 + 1] - dt * 0.5; if (y < 0.15) y = 6; la[i * 3 + 1] = y; la[i * 3] += Math.sin(t + i) * dt * 0.3; } lg.attributes.position.needsUpdate = true; });
  // 街角咖啡館（主建築）：圓弧轉角的奧斯曼建築、一樓咖啡館大遮陽篷、二樓陽台、鋅板屋頂老虎窗
  const h = grp(HX, 0.12, HZ - 0.1); world.add(h);
  const fp = (inset = 0) => { const s = new THREE.Shape(), w = 3.4 - inset, d = 1.85 - inset, rr = 1.3; s.moveTo(-w, d); s.lineTo(-w, -d + rr); s.quadraticCurveTo(-w, -d, -w + rr, -d); s.lineTo(w - rr, -d); s.quadraticCurveTo(w, -d, w, -d + rr); s.lineTo(w, d); s.lineTo(-w, d); return s; };
  const ext = (sh, dep) => { const g = new THREE.ExtrudeGeometry(sh, { depth: dep, bevelEnabled: false, curveSegments: 10 }); g.rotateX(-Math.PI / 2); return g; };
  add(k, h, ext(fp(), 3.0), k.m('#1f3a2f', { roughness: 0.5 }), 0, 0, 0);
  const upT = haussmann(k, 1 / 2.4, -1 / 2.4); add(k, h, ext(fp(), 4.8), [k.m('#efe3cc'), upT], 0, 3.0, 0);
  add(k, h, ext(fp(-0.15), 0.3), '#e2d4b8', 0, 7.8, 0); add(k, h, ext(fp(-0.12), 0.18), '#e2d4b8', 0, 2.95, 0);
  const man = add(k, h, k.g('cfman', () => cyl(0.78, 1, 2.4, 4)), k.m('#7f8a96', { flatShading: true, roughness: 0.5 }), 0, 9.3, 0); man.rotation.y = Math.PI / 4; man.scale.set(6.4 / 1.414, 0.8, 3.4 / 1.414);
  for (const x of [-2, 0, 2]) add(k, h, box(0.8, 0.9, 0.6), k.night ? k.glow('#ffd88a', 1.2) : k.m('#efe3cc'), x, 9.1, 1.3);
  for (const x of [-2.6, 2.6]) add(k, h, box(1.0, 1.0, 0.45), '#c8643c', x, 10.4, -0.6);
  const gl = k.night ? k.glow('#ffe2a8', 1.6) : k.m('#a8bcc8', { roughness: 0.15 });
  for (const x of [-1.5, 1.5]) add(k, h, box(1.6, 1.9, 0.05), gl, x, 1.2, 1.86, false); add(k, h, box(0.9, 2.1, 0.05), '#3a2a20', 0, 1.05, 1.87, false);
  for (const s of [-1, 1]) { const gw = add(k, h, box(1.1, 1.8, 0.05), gl, s * 3.08, 1.2, -1.06 + 0.12, false); gw.rotation.y = s * Math.PI / 2; }
  awning(k, h, 4.6, 1.3, '#a8242c', '#8a1c24', 0, 2.62, 1.86, { n: 14, tilt: 0.38 });
  for (const s of [-1, 1]) awning(k, h, 1.5, 1.2, '#a8242c', '#8a1c24', s * 2.95, 2.62, 1.42, { n: 6, tilt: 0.38, ry: s * 0.78 });
  const sign = nameSign(k, 4.4, 0.36, '#1f3a2f', '#e8c878', '"Noto Serif TC", serif'); sign.position.set(0, 2.78, 1.92); h.add(sign);
  add(k, h, box(4.4, 0.1, 0.5), '#e2d4b8', 0, 3.05, 2.05); add(k, h, box(4.4, 0.5, 0.03), railM(k), 0, 3.35, 2.28, false);
  const fl = []; for (let i = 0; i < 12; i++) fl.push({ x: -2 + i * 0.36, y: 3.2, z: 2.2, s: 0.1, c: i % 3 ? '#e8384f' : '#f2f2f2' }); inst(h, k.g('cffl', () => new THREE.IcosahedronGeometry(1, 0)), k.m('#ffffff'), fl, false);
  // 咖啡座（主建築前與人行道上的大理石圓桌、藤椅）
  const tbl = [[-2.75, HZ + HD / 2 + 0.55, 0.13], [2.75, HZ + HD / 2 + 0.55, 0.13]];
  for (const a of [1.05, 1.3, -1.05, -1.3]) tbl.push([Math.sin(a) * 15.2, Math.cos(a) * 15.2, 0.13]);
  const tops = [], peds = [], seats = [], backs = [], cups = [], spots = [];
  tbl.forEach(([x, z, y], i) => { tops.push({ x, y: y + 0.72, z }); peds.push({ x, y: y + 0.36, z }); cups.push({ x: x + 0.08, y: y + 0.78, z }); for (const s of [-1, 1]) { const cx = x + s * 0.55; seats.push({ x: cx, y: y + 0.3, z }); backs.push({ x: cx + s * 0.2, y: y + 0.58, z, ry: Math.PI / 2 }); } if (i < 2) spots.push({ x: x + (i ? 0.55 : -0.55), z, y: 0.48, face: [x, z], pose: 'sit', prop: 'cup' }); });
  inst(world, k.g('cftop', () => cyl(0.36, 0.36, 0.04, 16)), k.m('#f4f0ea', { roughness: 0.3 }), tops); inst(world, k.g('cfped', () => cyl(0.04, 0.12, 0.72, 8)), k.m('#26282b'), peds);
  inst(world, k.g('cfseat', () => cyl(0.2, 0.2, 0.05, 10)), k.m('#c8a06a'), seats); inst(world, k.g('cfback', () => box(0.42, 0.36, 0.04)), k.m('#b8864a'), backs); inst(world, k.g('cfcup', () => cyl(0.05, 0.04, 0.07, 8)), k.m('#ffffff'), cups, false);
  spots.push({ x: -13.0, z: 4.5, y: 0.13, face: [-13.4, 4.0], pose: 'stand' }, { x: -11.0, z: 8.4, y: 0.13, face: [0, 0], pose: 'stand', prop: 'bag' });
  return { spots, features: ['街角咖啡館', '奧斯曼建築', '法國梧桐', '報刊亭', '環形街道車流', '露天咖啡座'], heroH: 10.8 };
}

export const WORLDS_C = {
  italy: { id: 'italy', kind: 'world', name: '義大利海岸小鎮', sky: { top: '#4aa8ee', bot: '#fff1d8' }, hat: 'sun', build: italy },
  coffeefarm: { id: 'coffeefarm', kind: 'world', name: '咖啡莊園', sky: { top: '#86bcd6', bot: '#f1efe2' }, hat: 'straw', cloud: '#f4f4f0', build: coffeefarm },
  boba: { id: 'boba', kind: 'world', name: '珍奶樂園', sky: { top: '#f7b89a', bot: '#fff4e6' }, cloud: '#fff6ee', build: boba },
  brewery: { id: 'brewery', kind: 'world', name: '啤酒花園', sky: { top: '#5fa8ea', bot: '#eef6ff' }, build: brewery },
  orchard: { id: 'orchard', kind: 'world', name: '熱帶果園', sky: { top: '#3db4f2', bot: '#fff4c8' }, hat: 'straw', build: orchard },
  mekong: { id: 'mekong', kind: 'world', name: '水上市場', sky: { top: '#8cc6d8', bot: '#fbe8c4' }, hat: 'straw', build: mekong },
  station: { id: 'station', kind: 'world', name: '鐵道車站', sky: { top: '#7cc0ec', bot: '#f4f1e6' }, hat: 'cap', build: station },
  cafe: { id: 'cafe', kind: 'world', name: '巴黎街角咖啡', sky: { top: '#a9c6e4', bot: '#f7ede2' }, build: cafe },
};
