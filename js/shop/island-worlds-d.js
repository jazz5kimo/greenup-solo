// 主題世界（四）：眷村巷弄、日式橫丁、復古美式街、紙藝文具世界、湖畔露營地、天文台星空、薰衣草田、童話城堡
import * as THREE from 'three';
import { puffs, table, bench, lamp } from './island-scenes.js';
import { TAU, C, hex, CORE, HERO, canvas, add, grp, box, cyl, sph, cone, dome, gable, nameSign, windowMat, ground, bigTree } from './island-worlds.js';

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
// 白天晚上都會亮的材質（霓虹、燭光、火）
const lit = (c, p = 1.5, o = {}) => new THREE.MeshStandardMaterial({ color: C(c), emissive: C(c), emissiveIntensity: p, roughness: 0.5, ...o });
const texLit = (t, p = 1.2, o = {}) => new THREE.MeshStandardMaterial({ map: t, emissive: C('#ffffff'), emissiveMap: t, emissiveIntensity: p, roughness: 0.6, ...o });
const basic = (t, o = {}) => new THREE.MeshBasicMaterial({ map: t, toneMapped: false, ...o });
const smooth = (u) => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
const hash = (n) => { const s = Math.sin(n * 127.1 + 11.7) * 43758.5453; return s - Math.floor(s); };
const pickClear = (clear, list, rad, h) => list.find(([x, z]) => clear(x, z, rad, h)) || null;
const far = (occ, x, z, r) => occ.every(([ox, oz, or]) => Math.hypot(ox - x, oz - z) > or + r);
// 群組裡的座標換算成世界座標（只有 y 軸旋轉）
const loc = (x, z, ry, lx, lz) => [x + lx * Math.cos(ry) + lz * Math.sin(ry), z - lx * Math.sin(ry) + lz * Math.cos(ry)];
// 文字貼圖（橫寫或直寫）
function textTex(text, w, h, bg, fg, { vert = false, font = '"Noto Sans TC", system-ui, sans-serif', weight = 800, size = 0.62 } = {}) {
  return canvas(w, h, (g, W, H) => {
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, W, H); }
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (vert) { const ch = [...text], fs = Math.min(W * 0.74, H / (ch.length + 0.5)); g.font = `${weight} ${fs}px ${font}`; ch.forEach((c, i) => g.fillText(c, W / 2, H / 2 + (i - (ch.length - 1) / 2) * fs * 1.04)); }
    else { let fs = Math.round(H * size); g.font = `${weight} ${fs}px ${font}`; while (g.measureText(text).width > W * 0.9 && fs > 10) { fs -= 2; g.font = `${weight} ${fs}px ${font}`; } g.fillText(text, W / 2, H / 2 + H * 0.03); }
  });
}
// 柔邊圓點（星星、螢火蟲、火星）
const dotTex = () => canvas(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,0.75)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
function points(world, pos, { color = 0xffffff, cols = null, size = 0.2, opacity = 1, fog = true, add: additive = false } = {}) {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); if (cols) g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: cols ? 0xffffff : color, vertexColors: !!cols, size, map: dotTex(), transparent: true, opacity, depthWrite: false, fog, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }));
  p.frustumCulled = false; world.add(p); return p;
}
// 很多個一樣的東西用 InstancedMesh：mats 為 Matrix4 陣列，cols 為每個的顏色
const _o = new THREE.Object3D();
function mat4(x, y, z, ry = 0, s = 1, rx = 0, rz = 0, ord = 'XYZ') { _o.position.set(x, y, z); _o.rotation.set(rx, ry, rz, ord); if (typeof s === 'number') _o.scale.setScalar(s); else _o.scale.set(s[0], s[1], s[2]); _o.updateMatrix(); return _o.matrix.clone(); }
function inst(parent, geo, mat, mats, cols = null, cast = true) {
  const m = new THREE.InstancedMesh(geo, mat, Math.max(1, mats.length));
  mats.forEach((x, i) => m.setMatrixAt(i, x)); if (cols) cols.forEach((c, i) => m.setColorAt(i, C(c)));
  m.count = mats.length; m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m;
}
// 會流動的水面貼圖
function flowTex(k, color, rx, ry, speed = [0.01, 0.02], line = 'rgba(255,255,255,.35)') {
  const t = rep(canvas(128, 128, (g) => { g.fillStyle = color; g.fillRect(0, 0, 128, 128); g.strokeStyle = line; g.lineWidth = 2; for (let i = 0; i < 12; i++) { g.beginPath(); for (let x = 0; x <= 128; x += 6) g.lineTo(x, i * 11 + Math.sin(x * 0.1 + i) * 3); g.stroke(); } }), rx, ry);
  k.anim.push((tt) => { t.offset.set(tt * speed[0], tt * speed[1]); });
  return t;
}
const waterMat = (k, t, color, o = {}) => new THREE.MeshStandardMaterial({ map: t, roughness: 0.15, metalness: 0.1, emissive: k.night ? C(color).multiplyScalar(0.3) : C('#000000'), ...o });
// 起伏的地形（高度函式 H、顏色函式 col）
function terrain(k, world, size, seg, H, col, { cx = 0, cz = 0, flat = true } = {}) {
  const g = new THREE.PlaneGeometry(size, size, seg, seg); g.rotateX(-Math.PI / 2); g.translate(cx, 0, cz);
  const p = g.attributes.position, cs = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, H(x, z)); c.set(col(x, z)); cs.set([c.r, c.g, c.b], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(cs, 3)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: flat })); m.receiveShadow = true; world.add(m); return m;
}
// 腳踏車（車頭朝 +z）
function bike(k, color, { basket = true } = {}) {
  const g = new THREE.Group(), dark = k.m('#2b2b2b'), fr = k.m(color, { roughness: 0.4, metalness: 0.3 });
  const wheels = [-0.48, 0.48].map((z) => { const w = add(k, g, k.g('bkw', () => new THREE.TorusGeometry(0.3, 0.03, 6, 20)), dark, 0, 0.33, z); w.rotation.y = Math.PI / 2; return w; });
  const bar = k.g('bkbar', () => box(0.05, 0.05, 1));
  const tube = (y0, z0, y1, z1) => { const m = add(k, g, bar, fr, 0, (y0 + y1) / 2, (z0 + z1) / 2); m.scale.z = Math.hypot(y1 - y0, z1 - z0); m.rotation.x = -Math.atan2(y1 - y0, z1 - z0); };
  tube(0.33, -0.48, 0.86, -0.14); tube(0.33, -0.05, 0.86, -0.14); tube(0.33, -0.05, 0.86, 0.36); tube(0.33, 0.48, 0.95, 0.38);
  add(k, g, k.g('bkseat', () => box(0.14, 0.05, 0.24)), '#3a2a20', 0, 0.9, -0.16);
  add(k, g, k.g('bkhb', () => box(0.5, 0.04, 0.04)), '#9aa0a6', 0, 0.98, 0.38);
  if (basket) add(k, g, k.g('bkbas', () => box(0.34, 0.24, 0.28)), '#b08a52', 0, 0.86, 0.58);
  return { g, wheels };
}

// ================= 眷村巷弄 =================
function juancun({ k, world, pal, clear, layout, mobile }) {
  const pave = rep(canvas(256, 256, (g, W) => { g.fillStyle = '#cbbba2'; g.fillRect(0, 0, W, W); const cs = ['#a8553f', '#b8654a', '#9a4a38', '#b25e46', '#a04f3c']; for (let j = 0; j < 16; j++) for (let i = 0; i <= 8; i++) { g.fillStyle = cs[(i * 7 + j * 3) % 5]; g.fillRect(i * 32 - (j % 2) * 16 + 1.5, j * 16 + 1.5, 29, 13); } }), 7, 7);
  ground(k, world, { color: k.night ? '#55524c' : '#a9a397', coreTex: pave, edge: '#8d8f8c', edgeH: 0.3 });
  // 灰磚、黑瓦、紅門
  const brick = () => canvas(128, 128, (g, W, H) => { g.fillStyle = '#c4bdb0'; g.fillRect(0, 0, W, H); for (let j = 0; j < 16; j++) for (let i = 0; i <= 4; i++) { g.fillStyle = ['#8d8f8c', '#999a96', '#83857f', '#a2a29c', '#93918a'][(i + j * 3) % 5]; g.fillRect(i * 32 - (j % 2) * 16 + 1, j * 8 + 1, 30, 6); } });
  const wallM = new THREE.MeshStandardMaterial({ map: rep(brick(), 2, 1.5), roughness: 0.95 });
  const capM = k.m('#8f908b', { roughness: 0.95 }), roofM = k.m('#3f434a', { flatShading: true, roughness: 0.85 }), ridgeM = k.m('#2c2f34');
  const doorT = canvas(128, 128, (g) => { g.fillStyle = '#8d8f8c'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#c0302a'; g.fillRect(4, 22, 16, 104); g.fillRect(108, 22, 16, 104); g.fillRect(22, 4, 84, 16); g.fillStyle = '#1b1b1b'; for (let i = 0; i < 4; i++) { g.fillRect(8, 30 + i * 24, 8, 12); g.fillRect(112, 30 + i * 24, 8, 12); g.fillRect(36 + i * 16, 8, 10, 8); }
    g.fillStyle = '#b0302a'; g.fillRect(26, 26, 76, 102); g.strokeStyle = '#7a1e1a'; g.lineWidth = 3; g.strokeRect(32, 34, 28, 40); g.strokeRect(68, 34, 28, 40); g.strokeRect(32, 82, 28, 40); g.strokeRect(68, 82, 28, 40); g.fillStyle = '#7a1e1a'; g.fillRect(63, 26, 2, 102); g.fillStyle = '#e2b24a'; g.beginPath(); g.arc(56, 78, 4, 0, TAU); g.arc(72, 78, 4, 0, TAU); g.fill(); });
  const doorM = new THREE.MeshStandardMaterial({ map: doorT, roughness: 0.8 });
  const winM = k.night ? k.glow('#ffd88a', 1.4) : k.m('#5f7684', { roughness: 0.3 });
  const occ = [];
  // 老榕樹先佔位
  const bp = pickClear(clear, [[13.4, -1.6], [-13.4, -1.6], [13.6, 3.6], [-13.6, 3.6], [14.2, -7.4], [-14.2, -7.4]], 3.4, 6.4) || [19, -8];
  occ.push([bp[0], bp[1], 3.4]);
  // 一排排低矮的磚造平房（InstancedMesh：牆、屋頂、屋脊、紅門、窗、水塔）
  const Hs = [];
  const tryH = (x, z, ry, w, hh) => { if (!far(occ, x, z, 2.0) || !clear(x, z, 2.0, hh + 1.1)) return; Hs.push({ x, z, ry, w, hh }); occ.push([x, z, 2.0]); };
  for (let i = 0; i < 8; i++) tryH(-15.4 + i * 4.4, -13.8, 0, 4.0, 2.6 + (i % 3) * 0.2);
  if (!mobile) for (let i = 0; i < 8; i++) tryH(-17.6 + i * 4.4, -19.4, 0, 4.0, 2.8 + (i % 2) * 0.3);
  for (const s of [-1, 1]) { for (let i = 0; i < 4; i++) tryH(s * 12.3, -8.6 + i * 4.4, -s * Math.PI / 2, 4.0, 2.6 + (i % 2) * 0.3); if (!mobile) for (let i = 0; i < 4; i++) tryH(s * 17.9, -10.8 + i * 4.4, -s * Math.PI / 2, 4.0, 2.9); }
  const P = { body: [], roof: [], ridge: [], door: [], win: [], tank: [] };
  Hs.forEach(({ x, z, ry, w, hh }, i) => { const M = mat4(x, 0, z, ry), L = (a, b, c, s) => M.clone().multiply(mat4(a, b, c, 0, s));
    P.body.push(L(0, hh / 2, 0, [w, hh, 3])); P.roof.push(L(0, hh, 0, [w, 1.0, 3])); P.ridge.push(L(0, hh + 1.0, 0, [w + 0.5, 0.14, 0.22]));
    P.door.push(L(i % 2 ? -0.8 : 0.8, 0.95, 1.51, [1.4, 1.9, 0.06])); P.win.push(L(i % 2 ? 0.95 : -0.95, 1.55, 1.51, [0.95, 0.75, 0.05]));
    if (i % 3 === 0) P.tank.push(L(w * 0.22, hh + 1.2, -0.55, [0.5, 0.8, 0.5])); });
  inst(world, box(1, 1, 1), wallM, P.body); inst(world, gable(1, 1, 1, 0.08), [capM, roofM], P.roof); inst(world, box(1, 1, 1), ridgeM, P.ridge);
  inst(world, box(1, 1, 1), doorM, P.door, null, false); inst(world, box(1, 1, 1), winM, P.win, null, false); inst(world, cyl(1, 1, 1, 12), k.m('#dfe6ea', { roughness: 0.5 }), P.tank);
  // 水餃老店（主建築）：磚牆、黑瓦、綠色浪板雨遮、蒸籠、紅燈籠、直立招牌
  const h = grp(HX, 0.12, HZ); world.add(h);
  const wallH = new THREE.MeshStandardMaterial({ map: rep(brick(), 3.5, 1.6), roughness: 0.95 }), plaster = k.m('#ece4d2', { roughness: 0.9 });
  add(k, h, box(HW - 0.4, 3.0, HD - 1.0), [wallH, wallH, wallH, wallH, plaster, wallH], 0, 1.5, -0.5);
  add(k, h, gable(HW - 0.4, HD - 1.0, 1.4, 0.15), [capM, roofM], 0, 3.0, -0.5); add(k, h, box(HW + 0.1, 0.16, 0.26), ridgeM, 0, 4.4, -0.5);
  const inner = canvas(256, 128, (g) => { g.fillStyle = '#5a3a28'; g.fillRect(0, 0, 256, 128); g.fillStyle = '#e9e4da'; g.fillRect(0, 70, 256, 58); g.strokeStyle = '#c9c2b4'; for (let i = 0; i < 16; i++) { g.strokeRect(i * 16, 70, 16, 14); g.strokeRect(i * 16, 98, 16, 14); } g.fillStyle = '#ffd88a'; g.beginPath(); g.arc(128, 18, 10, 0, TAU); g.fill();
    ['水餃', '鍋貼', '酸辣湯', '小菜'].forEach((w, i) => { g.fillStyle = '#c0392b'; g.fillRect(150 + i * 26, 24, 22, 60); g.fillStyle = '#fff4c4'; g.font = '700 14px "Noto Sans TC", sans-serif'; g.textAlign = 'center'; [...w].forEach((c, j) => g.fillText(c, 161 + i * 26, 38 + j * 15)); }); });
  add(k, h, box(4.4, 1.95, 0.05), k.night ? texLit(inner, 0.9) : new THREE.MeshStandardMaterial({ map: inner }), 0.2, 0.98, 1.02, false);
  const coup = (t, x) => { add(k, h, box(0.32, 1.6, 0.04), basic(textTex(t, 64, 320, '#c0302a', '#f6d36b', { vert: true })), x, 1.1, 1.03, false); };
  coup('生意興隆', -2.65); coup('財源廣進', 2.65);
  const sign = nameSign(k, 4.6, 0.72, '#b8302a', '#ffe9a8'); sign.position.set(0, 2.55, 1.06); h.add(sign);
  const tin = new THREE.MeshStandardMaterial({ map: rep(stripeTex('#3f8a5a', '#56a372', 12, true), 2, 1), roughness: 0.6, metalness: 0.2 });
  const aw = add(k, h, box(HW + 0.1, 0.07, 1.45), tin, 0, 2.08, 1.72); aw.rotation.x = 0.2;
  for (const x of [-3.3, 3.3]) add(k, h, cyl(0.04, 0.04, 1.95, 6), '#6b6f74', x, 0.98, 2.35);
  // 蒸籠：爐子上一大疊、櫃台上一小疊，冒著白煙
  const bam = (n) => new THREE.MeshStandardMaterial({ map: rep(canvas(64, 64, (g) => { g.fillStyle = '#d8b476'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#b48a4e'; g.fillRect(0, 0, 64, 8); g.fillRect(0, 56, 64, 8); g.fillStyle = 'rgba(120,80,40,.25)'; for (let i = 0; i < 16; i++) g.fillRect(i * 4, 8, 1, 48); }), 1, n), roughness: 0.85 });
  add(k, h, box(1.0, 0.72, 0.9), '#3a3d42', 1.95, 0.36, 1.45);
  add(k, h, cyl(0.44, 0.44, 1.25, 18), [bam(5), k.m('#b48a4e'), k.m('#b48a4e')], 1.95, 1.35, 1.45); add(k, h, dome(0.46, 18, 6), '#c9a060', 1.95, 1.97, 1.45).scale.y = 0.45;
  add(k, h, box(2.0, 0.92, 0.62), k.m('#c9ced2', { metalness: 0.4, roughness: 0.35 }), -1.75, 0.46, 1.45);
  add(k, h, cyl(0.33, 0.33, 0.75, 16), [bam(3), k.m('#b48a4e'), k.m('#b48a4e')], -2.25, 1.3, 1.45); add(k, h, dome(0.35, 16, 6), '#c9a060', -2.25, 1.67, 1.45).scale.y = 0.45;
  inst(h, k.g('jdump', () => { const g = sph(0.09, 10, 6); g.scale(1.3, 0.6, 0.8); return g; }), k.m('#fbf6ea', { roughness: 0.6 }), Array.from({ length: 10 }, (_, i) => mat4(-1.45 + (i % 5) * 0.2, 0.97, 1.32 + Math.floor(i / 5) * 0.22, 0.2)));
  puffs(k, h, 1.95, 2.1, 1.45, { n: 5, size: 0.32, rise: 2.4, speed: 0.3, opacity: 0.55 }); puffs(k, h, -2.25, 1.8, 1.45, { n: 4, size: 0.22, rise: 1.8, speed: 0.33, opacity: 0.5 });
  const lanM = k.glow('#d8342a', 2.2);
  for (const x of [-2.9, 2.9]) { add(k, h, k.g('jlan', () => { const g = sph(0.24, 12, 8); g.scale(1, 1.25, 1); return g; }), lanM, x, 1.72, 2.25); add(k, h, k.g('jlcap', () => cyl(0.12, 0.12, 0.08, 8)), '#e2b24a', x, 2.03, 2.25); }
  if (k.night) { const l = new THREE.PointLight(0xffc070, 6, 10); l.position.set(0, 2.2, 3.2); h.add(l); }
  for (const [x, z] of [[9.5, -6.2], [-9.5, -6.2], [9.4, 4.2], [-9.4, 4.2]]) if (clear(x, z, 0.3, 1.8)) world.add(lamp(k, x, z, '#ffd88a'));
  const vs = add(k, h, box(0.62, 2.5, 0.12), basic(textTex('手工水餃', 80, 320, '#c0302a', '#fff1b0', { vert: true })), 3.25, 3.45, 1.1); vs.rotation.y = Math.PI / 2;
  // 老榕樹（氣根垂下、樹下石桌下棋）
  const bt = grp(bp[0], 0, bp[1]); world.add(bt); const bark = k.m('#6e5d4b', { flatShading: true, roughness: 1 });
  add(k, bt, cyl(0.55, 0.95, 3.4, 9), bark, 0, 1.7, 0);
  for (let i = 0; i < 4; i++) { const a = i * 1.6 + 0.4, b = add(k, bt, cyl(0.16, 0.3, 2.6, 6), bark, Math.sin(a) * 0.8, 3.6, Math.cos(a) * 0.8); b.rotation.set(Math.cos(a) * 0.8, 0, -Math.sin(a) * 0.8); }
  const crown = grp(0, 0, 0); bt.add(crown); const lf = k.night ? ['#2c5a30', '#36683a'] : ['#3f7a3a', '#4b8a43', '#356b32'];
  [[0, 5.7, 0, 2.5], [2.1, 4.9, 0.6, 1.9], [-2.0, 5.0, 0.4, 1.9], [0.4, 4.9, 2.1, 1.8], [-0.3, 5.0, -2.1, 1.8], [1.5, 5.3, -1.4, 1.6], [-1.4, 5.2, 1.6, 1.6]].forEach(([x, y, z, r], i) => { add(k, crown, k.g('jbc' + r, () => new THREE.IcosahedronGeometry(r, 0)), k.m(lf[i % lf.length], { flatShading: true }), x, y, z).scale.y = 0.62; });
  inst(crown, cyl(0.035, 0.05, 1, 4), bark, Array.from({ length: 16 }, (_, i) => { const a = i * 2.4, r = 1.1 + (i % 4) * 0.55, len = 2.0 + (i % 3) * 0.6; return mat4(Math.sin(a) * r, 4.4 - len / 2, Math.cos(a) * r, 0, [1, len, 1]); }), null, false);
  k.anim.push((t) => { crown.rotation.z = Math.sin(t * 0.6) * 0.015; crown.rotation.x = Math.sin(t * 0.47 + 1) * 0.012; });
  const dl = Math.hypot(bp[0], bp[1]), dx = -bp[0] / dl, dz = -bp[1] / dl, tx = bp[0] + dx * 2.1 - dz * 0.4, tz = bp[1] + dz * 2.1 + dx * 0.4;
  const chess = canvas(128, 128, (g) => { g.fillStyle = '#d9b77a'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#6b4a2a'; g.lineWidth = 2; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(12 + i * 13, 10); g.lineTo(12 + i * 13, 118); g.stroke(); } for (let j = 0; j < 10; j++) { g.beginPath(); g.moveTo(12, 10 + j * 12); g.lineTo(116, 10 + j * 12); g.stroke(); } for (let i = 0; i < 10; i++) { g.fillStyle = i % 2 ? '#c0392b' : '#2b2b2b'; g.beginPath(); g.arc(25 + (i * 37) % 90, 22 + (i * 23) % 84, 5, 0, TAU); g.fill(); } });
  add(k, world, cyl(0.55, 0.38, 0.72, 14), [k.m('#9a958c'), new THREE.MeshStandardMaterial({ map: chess }), k.m('#9a958c')], tx, 0.38, tz);
  const seats = [[-dz, dx], [dz, -dx]].map(([ux, uz]) => [tx + ux * 0.95, tz + uz * 0.95]);
  for (const [x, z] of seats) add(k, world, k.g('jstool', () => cyl(0.22, 0.26, 0.42, 10)), '#9a958c', x, 0.23, z);
  // 曬衣繩：衣服被風吹得晃來晃去
  const clothG = [k.g('jc1', () => box(0.55, 0.6, 0.02).translate(0, -0.3, 0)), k.g('jc2', () => box(0.34, 0.8, 0.02).translate(0, -0.4, 0)), k.g('jc3', () => box(0.46, 0.44, 0.02).translate(0, -0.22, 0))];
  const ccols = ['#ffffff', '#f2d16b', '#7fb3d5', '#e8a0a0', hex(pal[0]), '#9fc79f', '#f4efe4', hex(pal[2])], clothes = [];
  const line = (x0, z0, x1, z1, y) => {
    if (![[x0, z0], [x1, z1], [(x0 + x1) / 2, (z0 + z1) / 2]].every(([x, z]) => clear(x, z, 0.4, y) && far(occ.slice(0, 1), x, z, 0.5))) return;
    for (const [x, z] of [[x0, z0], [x1, z1]]) add(k, world, k.g('jcpole', () => cyl(0.05, 0.06, 1, 6)), '#6b5a48', x, y / 2, z).scale.y = y;
    const L = Math.hypot(x1 - x0, z1 - z0), ry = Math.atan2(x1 - x0, z1 - z0);
    const rope = add(k, world, k.g('jcrope', () => cyl(0.012, 0.012, 1, 4)), '#e8e8e8', (x0 + x1) / 2, y - 0.08, (z0 + z1) / 2, {}); rope.scale.y = L; rope.rotation.set(Math.PI / 2, ry, 0, 'YXZ'); rope.castShadow = false;
    const n = Math.floor(L / 0.72);
    for (let i = 0; i < n; i++) { const u = (i + 0.5) / n, c = add(k, world, clothG[(i * 7 + clothes.length) % 3], k.m(ccols[(i * 3 + clothes.length) % ccols.length], { side: THREE.DoubleSide }), x0 + (x1 - x0) * u, y - 0.1, z0 + (z1 - z0) * u); c.rotation.order = 'YXZ'; c.rotation.y = ry - Math.PI / 2; clothes.push(c); }
  };
  line(-9.5, -16.6, -3.5, -16.6, 2.5); line(3.2, -16.6, 9.6, -16.6, 2.5);
  for (const s of [-1, 1]) { line(s * 15.1, -8.5, s * 15.1, -2.5, 2.5); line(s * 15.1, 0.5, s * 15.1, 5.5, 2.4); }
  k.anim.push((t) => clothes.forEach((c, i) => { c.rotation.x = Math.sin(t * 1.8 + i * 0.9) * 0.22 + 0.12; }));
  // 電線桿與電線
  const poles = [[-21.8, -11.4], [-10.6, -11.4], [10.6, -11.4], [21.8, -11.4]].filter(([x, z]) => clear(x, z, 0.4, 6.6));
  const wireM = new THREE.LineBasicMaterial({ color: k.night ? 0x8a8f99 : 0x2a2a2a });
  for (const [x, z] of poles) { add(k, world, k.g('jpole', () => cyl(0.11, 0.14, 6.6, 7)), '#7a6a58', x, 3.3, z); add(k, world, k.g('jarm', () => box(1.3, 0.1, 0.1)), '#5a4a3a', x, 6.1, z); }
  for (let i = 0; i < poles.length - 1; i++) { const [a, b] = [poles[i], poles[i + 1]]; for (const o of [-0.55, 0, 0.55]) { const pts = []; for (let j = 0; j <= 16; j++) { const u = j / 16; pts.push(new THREE.Vector3(a[0] + (b[0] - a[0]) * u + o, 6.15 - Math.sin(Math.PI * u) * 0.9, a[1] + (b[1] - a[1]) * u)); } world.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireM)); } }
  // 巷口矮磚牆、盆栽、牆上的貓、郵筒
  const wallLow = new THREE.MeshStandardMaterial({ map: rep(brick(), 4, 0.6), roughness: 0.95 });
  for (const s of [-1, 1]) add(k, world, box(5.6, 0.9, 0.32), wallLow, s * 6.2, 0.45, 10.4);
  const potP = [-8.2, -6.6, -4.4, 4.6, 6.9, 8.4].map((x) => [x, 10.4]);
  inst(world, k.g('jpot', () => box(0.42, 0.28, 0.32)), k.m('#f4f1ea'), potP.map(([x, z]) => mat4(x, 1.04, z))); inst(world, k.g('jgreen', () => new THREE.IcosahedronGeometry(0.26, 0)), k.m(k.night ? '#2f6b3a' : '#4f9a45', { flatShading: true }), potP.map(([x, z], i) => mat4(x, 1.32, z, i, [1, 0.8 + (i % 3) * 0.25, 1])));
  const cat = grp(-5.4, 0.9, 10.4); world.add(cat); const fur = k.m('#e8a04a');
  add(k, cat, box(0.42, 0.22, 0.2), fur, 0, 0.11, 0); add(k, cat, sph(0.13, 10, 8), fur, 0.25, 0.27, 0); for (const z of [-0.06, 0.06]) add(k, cat, cone(0.04, 0.09, 4), fur, 0.27, 0.42, z);
  const tail = grp(-0.2, 0.15, 0); cat.add(tail); add(k, tail, cyl(0.03, 0.03, 0.42, 5).translate(0, 0.21, 0), fur, 0, 0, 0); k.anim.push((t) => { tail.rotation.z = 0.5 + Math.sin(t * 2.2) * 0.35; tail.rotation.x = Math.sin(t * 1.3) * 0.2; });
  cat.rotation.y = -0.4;
  for (const [x, c] of [[3.6, '#c0392b'], [4.3, '#2f7a4a']]) { add(k, world, box(0.46, 1.0, 0.42), c, x, 0.5, 11.2); add(k, world, k.g('jmb', () => cyl(0.24, 0.24, 0.42, 12, false).rotateX(Math.PI / 2)), c, x, 1.02, 11.2).scale.set(0.97, 0.5, 1); }
  // 停在牆邊的腳踏車、繞巷子騎車的伯伯
  for (const [x, z, ry, c] of [[10.3, -5.6, 0, '#2c6fb0'], [-10.3, -1.4, Math.PI, '#c0392b'], [8.6, 9.6, 1.4, '#2f7a4a']]) { if (!clear(x, z, 0.6, 1.2)) continue; const b = bike(k, c); b.g.position.set(x, 0.02, z); b.g.rotation.set(0, ry, 0.12); world.add(b.g); }
  const rb = bike(k, '#3a3f44'), rider = rb.g; world.add(rider); const shirt = k.m('#f4f1ea'), skin = k.m('#e8b98f'), pants = k.m('#4a5560');
  const torso = add(k, rider, box(0.34, 0.46, 0.22), shirt, 0, 1.22, -0.06); torso.rotation.x = 0.25; add(k, rider, sph(0.13, 10, 8), skin, 0, 1.58, 0.02); add(k, rider, k.g('jcap', () => dome(0.14, 10, 6)), '#2c3e50', 0, 1.62, 0.02);
  const legs = [-0.1, 0.1].map((x) => { const p = grp(x, 0.95, -0.12); rider.add(p); add(k, p, k.g('jleg', () => box(0.12, 0.6, 0.12).translate(0, -0.3, 0.05)), pants, 0, 0, 0); return p; });
  const arms = add(k, rider, box(0.46, 0.08, 0.42), shirt, 0, 1.18, 0.2); arms.rotation.x = 0.5;
  k.anim.push((t) => { const a = t * 0.11 + 1.2; rider.position.set(Math.sin(a) * 9.8, 0.02, Math.cos(a) * 9.8); rider.rotation.y = a + Math.PI / 2; legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 5 + i * Math.PI) * 0.6 - 0.3; }); rb.wheels.forEach((w) => { w.rotation.z = -t * 5; }); });
  const tb = layout.place(k.rnd, 0.95, 0.8), spots = seats.map(([x, z]) => ({ x, z, y: 0.46, face: [tx, tz], pose: 'sit' }));
  if (tb) { const tg = table(k, tb.x, tb.z, 2); world.add(tg); tg.userData.seats.slice(0, 1).forEach((s) => spots.push({ x: tb.x + s.dx, z: tb.z + s.dz, y: 0.43, face: [tb.x, tb.z], pose: 'sit', prop: 'cup' })); }
  spots.push({ x: -5.0, z: 9.6, face: [-5.4, 10.4], pose: 'crouch' });
  return { spots, features: ['水餃老店蒸籠', '紅門灰磚平房', '老榕樹下棋', '巷弄曬衣繩', '腳踏車伯伯', '牆頭小貓'], heroH: 5.0, dogs: 1 };
}

// ================= 日式橫丁（永遠是夜晚） =================
function yokocho({ k, world, pal, clear, layout, mobile }) {
  const slab = rep(canvas(256, 256, (g, W) => { g.fillStyle = '#1e1c1e'; g.fillRect(0, 0, W, W); let s = 3; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let j = 0; j < 8; j++) { let x = -10; while (x < W) { const w = 26 + r() * 40; g.fillStyle = ['#4a4846', '#3f3d3c', '#545150', '#46423f'][Math.floor(r() * 4)]; g.fillRect(x + 2, j * 32 + 2, w - 4, 28); x += w; } } }), 6, 6);
  ground(k, world, { color: '#262428', coreTex: slab, edge: '#5a3a26', edgeH: 0.22 });
  const woodM = new THREE.MeshStandardMaterial({ map: rep(stripeTex('#4a3020', '#5e3f2a', 16, true), 1, 1), roughness: 0.85 }), darkM = k.m('#26272b', { flatShading: true });
  const lanTex = (ch, base = '#d8281e') => canvas(128, 128, (g, W, H) => { g.fillStyle = base; g.fillRect(0, 0, W, H); g.fillStyle = 'rgba(0,0,0,.22)'; for (let i = 1; i < 10; i++) g.fillRect(0, i * H / 10, W, 2); g.fillStyle = '#1a1010'; g.fillRect(0, 0, W, H * 0.1); g.fillRect(0, H * 0.9, W, H * 0.1); if (ch) { g.font = `900 ${H * 0.36}px "Noto Serif TC", serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, W * 0.25, H / 2); g.fillText(ch, W * 0.75, H / 2); } });
  const lanMs = ['酒', '麵', '串', ''].map((c, i) => texLit(lanTex(c, i === 3 ? '#f2e6c8' : '#d8281e'), 1.25));
  const lanG = k.g('yklan', () => { const g = sph(0.5, 14, 10); g.scale(1, 1.25, 1); return g; });
  const swing = [];
  const lantern = (parent, x, y, z, s, m) => { const p = grp(x, y, z); p.scale.setScalar(s); parent.add(p); add(k, p, lanG, m, 0, -0.7, 0, {}).castShadow = false; swing.push(p); return p; };
  // 拉麵屋（主建築）：木格門面、暖簾、大紅燈籠、二樓紙窗、屋頂招牌
  const h = grp(HX, 0.12, HZ); world.add(h);
  add(k, h, box(HW - 0.4, 3.2, HD - 1.0), woodM, 0, 1.6, -0.3);
  const shoji = canvas(128, 64, (g) => { g.fillStyle = '#ffe2a8'; g.fillRect(0, 0, 128, 64); g.strokeStyle = '#3a2418'; g.lineWidth = 3; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 16, 0); g.lineTo(i * 16, 64); g.stroke(); } for (let j = 0; j <= 4; j++) { g.beginPath(); g.moveTo(0, j * 16); g.lineTo(128, j * 16); g.stroke(); } });
  const shojiM = texLit(shoji, 1.1);
  add(k, h, box(1.7, 2.15, 0.04), lit('#ffc77a', 1.0), 0, 1.08, 1.22, false);
  add(k, h, box(1.5, 1.1, 0.04), shojiM, -2.35, 1.5, 1.22, false);
  const nT = canvas(512, 200, (g, W, H) => { g.fillStyle = '#1f2a4a'; g.fillRect(0, 0, W, H); g.fillStyle = '#f4efe4'; g.font = '900 120px "Noto Serif TC", serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('拉', W * 0.27, H * 0.55); g.fillText('麵', W * 0.73, H * 0.55); });
  const nM = new THREE.MeshStandardMaterial({ map: nT, emissive: C('#ffffff'), emissiveMap: nT, emissiveIntensity: 0.3, side: THREE.DoubleSide, roughness: 0.9 }), noren = [];
  for (let i = 0; i < 4; i++) { const g = new THREE.PlaneGeometry(0.48, 0.9); const uv = g.attributes.uv; for (let j = 0; j < uv.count; j++) uv.setX(j, (i + uv.getX(j)) / 4); g.translate(0, -0.45, 0); const m = add(k, h, g, nM, -0.75 + i * 0.5, 2.3, 1.34, {}); m.castShadow = false; noren.push(m); }
  add(k, h, box(2.2, 0.05, 0.05), '#3a2418', 0, 2.31, 1.34);
  k.anim.push((t) => noren.forEach((m, i) => { m.rotation.x = -0.05 - Math.abs(Math.sin(t * 1.4 + i * 0.7)) * 0.12; }));
  const eave = add(k, h, box(HW + 0.3, 0.12, 1.4), darkM, 0, 2.9, 1.78); eave.rotation.x = 0.28;
  add(k, h, box(HW - 1.4, 1.7, HD - 1.8), woodM, 0, 4.05, -0.5);
  add(k, h, box(HW - 1.9, 0.8, 0.04), shojiM, 0, 4.25, 0.62, false);
  add(k, h, gable(HW - 1.0, HD - 1.4, 1.2, 0.3), [woodM, darkM], 0, 4.9, -0.5);
  const sign = nameSign(k, 4.4, 0.7, '#2b1a10', '#f5e6c8', '"Noto Serif TC", serif'); sign.position.set(0, 3.55, 1.05); h.add(sign);
  lantern(h, 2.45, 2.75, 1.75, 1.45, lanMs[1]);
  for (const x of [-3.1, -1.55]) lantern(h, x, 2.6, 2.3, 0.46, lanMs[3]);
  const menu = add(k, h, box(0.7, 1.0, 0.06), new THREE.MeshStandardMaterial({ map: canvas(64, 96, (g) => { g.fillStyle = '#1c1c1c'; g.fillRect(0, 0, 64, 96); g.fillStyle = '#f4efe4'; g.font = '700 14px "Noto Sans TC", sans-serif'; g.textAlign = 'center'; ['醬油', '豚骨', '味噌', '煎餃'].forEach((w, i) => g.fillText(w, 32, 18 + i * 22)); }), emissive: C('#555555'), roughness: 0.8 }), -2.85, 0.6, 2.05); menu.rotation.x = -0.18;
  add(k, h, cyl(0.12, 0.12, 1.0, 8), '#55595f', 2.3, 5.7, -1.4); puffs(k, h, 2.3, 6.3, -1.4, { n: 5, color: 0xd8dce8, size: 0.3, rise: 2.6, speed: 0.22, opacity: 0.45 });
  const pl = new THREE.PointLight(0xffb066, 7, 11); pl.position.set(0, 2.2, 3.4); h.add(pl);
  // 兩側的居酒屋小攤（暖簾、燈籠、直立招牌、吧台椅）
  const words = ['燒鳥', '酒場', '串燒', '蕎麥', '餃子', '居酒屋', '關東煮', '甘味', '炭火燒', '立飲', '天婦羅', '茶屋'];
  const norenC = ['#1f2a4a', '#7a1e1e', '#2a4a3a', '#3a2a4a', '#5a3a1e', '#f2e6c8'];
  const front = canvas(256, 128, (g) => { const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#ffcf8a'); gr.addColorStop(1, '#c8743a'); g.fillStyle = gr; g.fillRect(0, 0, 256, 128); g.fillStyle = '#5a3420'; g.fillRect(0, 40, 256, 5); g.fillRect(0, 75, 256, 5); for (let i = 0; i < 22; i++) { g.fillStyle = ['#3a5a3a', '#6a2a1a', '#e8d8b8', '#2a3a5a'][i % 4]; g.fillRect(8 + i * 11, 22 + (i % 3) * 2, 7, 18); g.fillRect(10 + i * 11, 58, 6, 17); } g.fillStyle = '#3a2418'; g.fillRect(0, 100, 256, 28); });
  const frontM = texLit(front, 0.85), bodyMats = [woodM, woodM, darkM, woodM, frontM, woodM];
  const stoolSpots = [];
  let si = 0;
  for (const s of [-1, 1]) for (let i = 0; i < (mobile ? 5 : 8); i++) {
    const x = s * 11.3, z = -17.2 + i * 3.3, ry = -s * Math.PI / 2; if (!clear(x, z, 1.7, 3.6)) continue;
    const g = grp(x, 0, z); g.rotation.y = ry; world.add(g); const n = si++;
    add(k, g, k.g('yks', () => box(3.0, 2.6, 2.4)), bodyMats, 0, 1.3, 0);
    add(k, g, k.g('yke', () => box(3.3, 0.1, 0.95)), darkM, 0, 2.55, 1.5).rotation.x = 0.3;
    const nc = norenC[n % norenC.length], nm = new THREE.MeshStandardMaterial({ map: textTex(words[n % words.length], 256, 64, nc, nc === '#f2e6c8' ? '#7a1e1e' : '#f4efe4', { font: '"Noto Serif TC", serif' }), emissive: C('#ffffff'), emissiveIntensity: 0.25, roughness: 0.9 }); nm.emissiveMap = nm.map;
    add(k, g, k.g('ykn', () => new THREE.PlaneGeometry(2.5, 0.6)), nm, 0, 2.12, 1.23, {}).castShadow = false;
    add(k, g, k.g('ykc', () => box(2.6, 0.1, 0.45)), '#8a6a4a', 0, 1.05, 1.42);
    lantern(g, 1.4, 2.5, 1.85, 0.55, lanMs[n % 3]);
    add(k, g, k.g('ykv', () => box(0.5, 1.7, 0.1)), basic(textTex(words[(n + 5) % words.length], 64, 256, ['#f4efe4', '#ffd23a', '#e83a2a'][n % 3], n % 3 === 2 ? '#ffffff' : '#1a1010', { vert: true, font: '"Noto Serif TC", serif' })), -1.25, 3.2, 1.0);
    if (n < 3) for (const dx of [-0.7, 0.7]) { add(k, g, k.g('ykst', () => cyl(0.17, 0.15, 0.62, 10)), '#3a2a20', dx, 0.31, 2.05); if (dx < 0 || n === 0) { const [wx, wz] = loc(x, z, ry, dx, 2.05), [fx, fz] = loc(x, z, ry, dx, 0.8); stoolSpots.push({ x: wx, z: wz, y: 0.64, face: [fx, fz], pose: 'sit', prop: 'cup' }); } }
    if (n % 3 === 1) puffs(k, g, 0.6, 2.7, 0.6, { n: 3, color: 0xd8dce8, size: 0.22, rise: 1.6, speed: 0.3, opacity: 0.4 });
  }
  // 後面兩層樓的街屋（窗戶亮燈、直立招牌、其中一塊會閃）
  const flick = [];
  const tall = (x, z, ry, w, d, hh, n) => { if (!clear(x, z, Math.max(w, d) / 2 + 0.3, hh)) return; const g = grp(x, 0, z); g.rotation.y = ry; world.add(g);
    add(k, g, box(w, hh, d), windowMat(k, ['#3a2e28', '#2e2a30', '#3e3430'][n % 3], w, hh, { cols: 4, rows: 3, glass: '#3a3440', lit: 0.38, seed: 21 + n }), 0, hh / 2, 0);
    const sm = basic(textTex(words[(n * 5) % words.length], 64, 256, ['#e83a2a', '#ffd23a', '#f4efe4', '#3ac8e8'][n % 4], n % 4 === 1 || n % 4 === 2 ? '#1a1010' : '#ffffff', { vert: true, font: '"Noto Serif TC", serif' }));
    add(k, g, k.g('ykvt', () => box(0.7, 2.6, 0.12)), sm, w / 2 - 0.6, Math.min(hh - 1.6, 3.8), d / 2 + 0.3); if (n % 4 === 3) flick.push(sm);
    add(k, g, box(w + 0.3, 0.2, d + 0.3), darkM, 0, hh + 0.1, 0); };
  for (const s of [-1, 1]) for (let i = 0; i < (mobile ? 4 : 6); i++) tall(s * 16.4, -19.5 + i * 5.0, -s * Math.PI / 2, 4.6, 3.6, 4.8 + ((i * 7 + (s > 0 ? 3 : 0)) % 4) * 0.9, i + (s > 0 ? 6 : 0));
  for (let i = 0; i < 6; i++) tall(-11 + i * 4.4, -14.6, 0, 4.2, 3.6, 4.6 + ((i * 5) % 4) * 0.9, i + 12);
  k.anim.push((t) => flick.forEach((m, i) => { const f = Math.floor(t * 9 + i * 13); m.color.setScalar(hash(f) < 0.12 ? 0.25 : 1); }));
  // 燈籠串（從主建築屋簷拉到兩側小攤）＋電線桿
  const lanIM = new THREE.MeshBasicMaterial({ toneMapped: false }), lp = [], lc = [];
  const string = (a, b, n, sag) => { const pts = []; for (let j = 0; j <= n; j++) { const u = j / n, x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u - Math.sin(Math.PI * u) * sag, z = a[2] + (b[2] - a[2]) * u; pts.push(new THREE.Vector3(x, y, z)); if (j > 0 && j < n && clear(x, z, 0.2, y)) { lp.push(mat4(x, y - 0.22, z, 0, [1, 1.25, 1])); lc.push(j % 3 ? '#ff4a2e' : '#ffe2a8'); } } world.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x15120f }))); };
  for (const s of [-1, 1]) { string([s * 3.7, 3.1, -6.3], [s * 9.9, 3.5, -10.5], 9, 0.5); string([s * 3.7, 3.1, -6.3], [s * 9.9, 3.5, 2.5], 12, 0.7); string([s * 9.6, 3.3, -16], [s * 9.6, 3.3, 6], 18, 0.35); }
  inst(world, k.g('yksl', () => sph(0.15, 8, 6)), lanIM, lp, lc, false);
  const poles = [[-10.2, -12.6], [10.2, -12.6], [-10.2, 8.4], [10.2, 8.4]].filter(([x, z]) => clear(x, z, 0.4, 7));
  for (const [x, z] of poles) { add(k, world, k.g('ykpole', () => cyl(0.12, 0.15, 7, 7)), '#55524e', x, 3.5, z); add(k, world, k.g('ykarm', () => box(1.4, 0.1, 0.1)), '#3a3836', x, 6.5, z); add(k, world, k.g('yktr', () => cyl(0.25, 0.25, 0.6, 10)), '#6a6e74', x + 0.35, 5.8, z); }
  const wM = new THREE.LineBasicMaterial({ color: 0x0c0b0a });
  const wire = (a, b, sag) => { const pts = []; for (let j = 0; j <= 16; j++) { const u = j / 16; pts.push(new THREE.Vector3(a[0] + (b[0] - a[0]) * u, 6.5 - Math.sin(Math.PI * u) * sag, a[1] + (b[1] - a[1]) * u)); } world.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wM)); };
  for (let i = 0; i < poles.length; i++) for (let j = i + 1; j < poles.length; j++) { const [a, b] = [poles[i], poles[j]]; if (Math.abs(a[0] - b[0]) < 1 || Math.abs(a[1] - b[1]) < 1) { wire(a, b, 1.1); wire([a[0] + 0.5, a[1]], [b[0] + 0.5, b[1]], 1.3); } }
  for (const [x, z] of poles) wire([x, z], [x * 1.6, z + (z < 0 ? -2 : 2)], 0.5);
  // 自動販賣機
  const vend = canvas(128, 160, (g) => { g.fillStyle = '#f4f7fb'; g.fillRect(0, 0, 128, 160); for (let r = 0; r < 4; r++) { for (let i = 0; i < 6; i++) { g.fillStyle = ['#e8453c', '#2f7ad8', '#f2c230', '#3fae6a', '#ffffff', '#8a5ad8'][(i + r * 2) % 6]; g.fillRect(8 + i * 19, 10 + r * 36, 13, 24); g.fillStyle = '#d0d4da'; g.fillRect(8 + i * 19, 36 + r * 36, 13, 3); } } });
  const vendM = texLit(vend, 1.1);
  let vi = 0;
  for (const a of [1.2, -1.2, 1.55, -1.55, 1.9, -1.9]) { if (vi >= (mobile ? 2 : 4)) break; const x = Math.sin(a) * 9.5, z = Math.cos(a) * 9.5; if (!clear(x, z, 0.7, 2.2)) continue;
    const g = grp(x, 0.02, z); g.rotation.y = Math.atan2(-x, -z); world.add(g); add(k, g, k.g('ykvm', () => box(0.95, 1.85, 0.75)), ['#e8e8ea', '#c0392b', '#2c5aa0', '#e8e8ea'][vi], 0, 0.93, 0); add(k, g, k.g('ykvp', () => box(0.8, 1.05, 0.02)), vendM, 0, 1.22, 0.38, false); add(k, g, k.g('ykvs', () => box(0.6, 0.14, 0.03)), lit('#cfe8ff', 0.8), 0, 0.42, 0.38, false);
    if (vi === 0) { const [sx, sz] = loc(x, z, g.rotation.y, 0, 1.0); stoolSpots.push({ x: sx, z: sz, face: [x, z], pose: 'stand', prop: 'can' }); } vi++; }
  for (const [x, z] of [[-9.6, -4], [9.6, -4]]) { const l = new THREE.PointLight(0xff9a5a, 4, 9); l.position.set(x, 2.6, z); world.add(l); }
  k.anim.push((t) => swing.forEach((p, i) => { p.rotation.z = Math.sin(t * 1.2 + i * 1.7) * 0.07; p.rotation.x = Math.sin(t * 0.9 + i) * 0.05; }));
  return { spots: stoolSpots, features: ['拉麵屋大燈籠', '暖簾', '居酒屋小攤', '紅燈籠串', '自動販賣機', '電線桿'], heroH: 6.4, fog: [30, 110] };
}

// ================= 復古美式街 =================
function retro({ k, world, pal, clear, layout, mobile }) {
  const chk = rep(canvas(128, 128, (g) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = (i + j) % 2 ? '#24262b' : '#f4efe2'; g.fillRect(i * 16, j * 16, 16, 16); } }), 6, 6);
  ground(k, world, { color: k.night ? '#7a6448' : '#e2bf88', coreTex: chk, edge: '#e8384f', edgeH: 0.28 });
  // 公路（前方，有黃色虛線）
  const road = rep(canvas(64, 128, (g) => { g.fillStyle = '#3a3b3f'; g.fillRect(0, 0, 64, 128); g.fillStyle = '#f2c230'; g.fillRect(0, 60, 36, 8); g.fillStyle = '#e8e4da'; g.fillRect(0, 4, 64, 4); g.fillRect(0, 120, 64, 4); }), 60, 1);
  const rd = new THREE.Mesh(new THREE.PlaneGeometry(240, 4.6), new THREE.MeshStandardMaterial({ map: road, roughness: 0.9 })); rd.rotation.x = -Math.PI / 2; rd.position.set(0, 0.02, 12.6); rd.receiveShadow = true; world.add(rd);
  // 不鏽鋼餐車（主建築）：圓角車身、紅色腰帶、整排窗、屋頂霓虹招牌與跑馬燈
  const h = grp(HX, 0.12, HZ); world.add(h);
  const stadium = (w, d, hh) => { const r = d / 2, s = new THREE.Shape(); s.moveTo(-w / 2 + r, -r); s.lineTo(w / 2 - r, -r); s.absarc(w / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2, false); s.lineTo(-w / 2 + r, r); s.absarc(-w / 2 + r, 0, r, Math.PI / 2, Math.PI * 1.5, false); const g = new THREE.ExtrudeGeometry(s, { depth: hh, bevelEnabled: false, curveSegments: 10 }); g.rotateX(-Math.PI / 2); return g; };
  const flute = rep(canvas(16, 64, (g) => { for (let i = 0; i < 8; i++) { const gr = g.createLinearGradient(0, i * 8, 0, i * 8 + 8); gr.addColorStop(0, '#f4f6f8'); gr.addColorStop(0.5, '#aeb5bd'); gr.addColorStop(1, '#e6e9ec'); g.fillStyle = gr; g.fillRect(0, i * 8, 16, 8); } }), 1, 1.2);
  const chrome = new THREE.MeshStandardMaterial({ map: flute, metalness: 0.35, roughness: 0.3 }), red = k.m('#d8343f', { roughness: 0.4 }), teal = k.m('#3cc3c0', { roughness: 0.5 });
  const W = HW + 0.1, D = 2.7, z0 = -0.35;
  add(k, h, stadium(W, D, 1.0), [chrome, chrome], 0, 0, z0);
  add(k, h, stadium(W + 0.04, D + 0.04, 0.26), [red, red], 0, 0.82, z0);
  const glass = k.night ? lit('#ffdca0', 1.1) : k.m('#7fb8d8', { roughness: 0.1, metalness: 0.3 });
  add(k, h, stadium(W - 0.02, D - 0.02, 0.85), [glass, glass], 0, 1.08, z0);
  add(k, h, stadium(W, D, 0.55), [chrome, chrome], 0, 1.93, z0);
  add(k, h, stadium(W + 0.35, D + 0.35, 0.16), [teal, teal], 0, 2.48, z0);
  // 窗框
  inst(h, box(0.06, 0.85, 0.06), k.m('#d8dde2', { metalness: 0.4 }), Array.from({ length: 9 }, (_, i) => mat4(-2.6 + i * 0.65, 1.5, z0 + D / 2 + 0.01)));
  add(k, h, box(1.5, 2.35, 0.8), [chrome, chrome, teal, chrome, chrome, chrome], 0, 1.18, z0 + D / 2 + 0.38);
  add(k, h, box(0.95, 1.95, 0.04), k.night ? lit('#ffdca0', 1.0) : k.m('#9ccbe4', { roughness: 0.1 }), 0, 0.98, z0 + D / 2 + 0.79, false);
  const open = add(k, h, box(0.9, 0.32, 0.03), basic(textTex('OPEN', 128, 48, '#1a0a10', '#ff4a6a', { font: 'system-ui, sans-serif' })), -1.6, 1.7, z0 + D / 2 + 0.02, false);
  k.anim.push((t) => { open.visible = Math.floor(t * 1.2) % 4 !== 3; });
  // 屋頂招牌：霓虹邊框＋上下兩排跑馬燈
  const sg = grp(0, 2.64, z0 + 0.2); h.add(sg);
  for (const x of [-2.2, 2.2]) add(k, sg, box(0.12, 0.6, 0.12), '#c9ced4', x, 0.3, 0);
  const sign = nameSign(k, 5.0, 0.95, '#1b2a4a', '#ffe9a8'); sign.position.set(0, 1.12, 0.05); sg.add(sign);
  const neonM = lit('#ff4fa0', 2.4);
  for (const [w, hh, x, y] of [[5.3, 0.07, 0, 1.66], [5.3, 0.07, 0, 0.58], [0.07, 1.1, -2.64, 1.12], [0.07, 1.1, 2.64, 1.12]]) add(k, sg, box(w, hh, 0.07), neonM, x, y, 0.12, false);
  const bulbA = lit('#ffe27a', 2.4), bulbB = lit('#ffe27a', 2.4), bA = [], bB = [];
  for (let i = 0; i < 22; i++) { const x = -2.5 + (i % 11) * 0.5, y = i < 11 ? 1.82 : 0.42; (i % 2 ? bB : bA).push(mat4(x, y, 0.12)); }
  inst(sg, k.g('rbulb', () => sph(0.07, 8, 6)), bulbA, bA, null, false); inst(sg, k.g('rbulb', () => sph(0.07, 8, 6)), bulbB, bB, null, false);
  k.anim.push((t) => { const on = Math.floor(t * 3) % 2; bulbA.emissiveIntensity = on ? 2.6 : 0.15; bulbB.emissiveIntensity = on ? 0.15 : 2.6; });
  // 原子造型星星（會轉）
  const star = grp(3.1, 3.9, z0); h.add(star); add(k, h, cyl(0.05, 0.05, 1.5, 6), '#c9ced4', 3.1, 3.15, z0);
  add(k, star, sph(0.16, 10, 8), '#ffd23a'); for (let i = 0; i < 8; i++) { const c = add(k, star, k.g('rspike', () => cone(0.07, 0.6, 5).translate(0, 0.3, 0)), i % 2 ? '#3cc3c0' : '#ffd23a', 0, 0, 0); c.rotation.z = i / 8 * TAU; }
  k.anim.push((t) => { star.rotation.z = t * 0.8; });
  // 老爺車（大尾翼、白邊輪胎、鍍鉻保險桿）
  const wt = canvas(64, 64, (g) => { g.fillStyle = '#1c1c1c'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#f4f1ea'; g.beginPath(); g.arc(32, 32, 24, 0, TAU); g.fill(); g.fillStyle = '#1c1c1c'; g.beginPath(); g.arc(32, 32, 17, 0, TAU); g.fill(); g.fillStyle = '#d8dde2'; g.beginPath(); g.arc(32, 32, 11, 0, TAU); g.fill(); });
  const tireM = [k.m('#1c1c1c'), new THREE.MeshStandardMaterial({ map: wt }), new THREE.MeshStandardMaterial({ map: wt })];
  const chromeM = k.m('#e6e9ec', { metalness: 0.5, roughness: 0.25 }), carGlass = k.m('#2a3a48', { roughness: 0.15 });
  const car = (color) => { const g = new THREE.Group(), cm = k.m(color, { roughness: 0.35, metalness: 0.15 });
    add(k, g, k.g('rcb', () => box(1.7, 0.5, 4.2)), cm, 0, 0.55, 0); add(k, g, k.g('rcc', () => box(1.46, 0.46, 1.9)), [carGlass, carGlass, k.m('#f4f1ea'), cm, carGlass, carGlass], 0, 1.03, -0.25);
    for (const s of [-1, 1]) { const f = add(k, g, k.g('rfin', () => box(0.08, 0.34, 1.1)), cm, s * 0.8, 0.9, -1.55); f.rotation.x = -0.35; const w = add(k, g, k.g('rcw', () => cyl(0.32, 0.32, 0.24, 14)), tireM, s * 0.78, 0.33, 1.35); w.rotation.z = Math.PI / 2; const w2 = add(k, g, k.g('rcw', () => cyl(0.32, 0.32, 0.24, 14)), tireM, s * 0.78, 0.33, -1.3); w2.rotation.z = Math.PI / 2; add(k, g, k.g('rhl', () => sph(0.11, 8, 6)), k.glow('#fff4c4', 2.2), s * 0.55, 0.62, 2.1, false); }
    for (const z of [2.14, -2.14]) add(k, g, k.g('rbmp', () => box(1.8, 0.14, 0.14)), chromeM, 0, 0.36, z);
    add(k, g, k.g('rstr', () => box(1.72, 0.06, 3.6)), chromeM, 0, 0.62, 0).scale.set(1.0, 1, 1);
    return g; };
  const carC = ['#7fd6c2', '#ff9eb8', '#f4e2b0', '#5ab0e8', '#e8384f', '#ffd23a'];
  const parked = [[11.2, 4.6, 0.6], [12.6, 0.0, 0.5], [-11.0, 5.0, -0.6], [-12.4, 0.4, -0.5], [10.6, -9.0, 2.6], [-14.0, -8.8, 3.6]];
  let ci = 0; const spots = [];
  for (const [x, z, ry] of parked) { if (ci >= (mobile ? 3 : 5) || !clear(x, z, 2.0, 1.5)) continue; const c = car(carC[ci % carC.length]); c.position.set(x, 0.02, z); c.rotation.y = ry; world.add(c);
    if (ci === 0) { const [sx, sz] = loc(x, z, ry, 1.35, 0.6); spots.push({ x: sx, z: sz, face: [x, z], pose: 'stand', prop: 'cup' }); } ci++; }
  const drive = car('#c0392b'); world.add(drive);
  k.anim.push((t) => { const u = (t * 0.03) % 1; drive.position.set(-70 + u * 140, 0.03, 11.5); drive.rotation.y = Math.PI / 2; });
  // 加油站（遮雨棚、油槍、會轉的圓招牌）
  const gp = pickClear(clear, [[14.2, -5.5], [-14.2, -5.5], [15, -0.5], [-15, -0.5], [14, -11]], 3.4, 4.6);
  if (gp) { const g = grp(gp[0], 0, gp[1]); g.rotation.y = Math.atan2(-gp[0], -gp[1]) + Math.PI; world.add(g); g.rotation.y = gp[0] > 0 ? -Math.PI / 2 : Math.PI / 2;
    add(k, g, box(6.2, 0.35, 4.0), '#f4f1ea', 0, 4.1, 0); add(k, g, box(6.3, 0.18, 4.1), red, 0, 3.86, 0);
    for (const x of [-2.2, 2.2]) add(k, g, box(0.3, 3.8, 0.3), '#f4f1ea', x, 1.9, 0);
    add(k, g, box(5.2, 0.2, 1.4), '#c9c2b0', 0, 0.1, 0);
    const dial = canvas(64, 64, (q) => { q.fillStyle = '#fff8e0'; q.beginPath(); q.arc(32, 32, 30, 0, TAU); q.fill(); q.strokeStyle = '#c0392b'; q.lineWidth = 3; q.stroke(); q.fillStyle = '#1c1c1c'; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; q.fillRect(32 + Math.cos(a) * 22 - 1, 32 + Math.sin(a) * 22 - 1, 3, 3); } });
    for (const [x, c] of [[-1.2, '#d8343f'], [1.2, '#3cc3c0']]) { add(k, g, box(0.62, 1.4, 0.45), c, x, 0.9, 0); const d = add(k, g, cyl(0.3, 0.3, 0.12, 18), [k.m(c), texLit(dial, k.night ? 1 : 0.3), texLit(dial, k.night ? 1 : 0.3)], x, 1.85, 0); d.rotation.x = Math.PI / 2; add(k, g, sph(0.12, 8, 6), lit('#fff4c4', 1.6), x, 2.25, 0); }
    const ps = grp(3.6, 0, -1.8); g.add(ps); add(k, ps, cyl(0.1, 0.1, 6.5, 8), '#c9ced4', 0, 3.25, 0); const disc = grp(0, 6.9, 0); ps.add(disc);
    add(k, disc, cyl(0.9, 0.9, 0.16, 28), [k.m('#f4f1ea'), basic(textTex('GAS', 128, 128, '#d8343f', '#ffffff', { font: 'system-ui, sans-serif' })), basic(textTex('GAS', 128, 128, '#d8343f', '#ffffff', { font: 'system-ui, sans-serif' }))], 0, 0, 0).rotation.x = Math.PI / 2;
    k.anim.push((t) => { disc.rotation.y = t * 0.9; });
    const [wx, wz] = loc(gp[0], gp[1], g.rotation.y, -1.2, 0.8); spots.push({ x: wx, z: wz, face: [gp[0], gp[1]], pose: 'work', hat: 'cap' }); }
  // 公路看板、汽車旅館箭頭招牌
  const bbp = pickClear(clear, [[-13.5, -14], [13.5, -14], [-17, -9], [17, -9], [-10, -18]], 3.8, 8.4);
  if (bbp) { const g = grp(bbp[0], 0, bbp[1]); g.rotation.y = Math.atan2(-bbp[0], 22 - bbp[1]); world.add(g);
    for (const x of [-2.4, 2.4]) add(k, g, box(0.25, 5.2, 0.25), '#8a7a62', x, 2.6, 0);
    const ad = canvas(512, 256, (q, Wd, Ht) => { const gr = q.createLinearGradient(0, 0, 0, Ht); gr.addColorStop(0, '#ffe8a8'); gr.addColorStop(1, '#ffb86a'); q.fillStyle = gr; q.fillRect(0, 0, Wd, Ht); q.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 16; i++) { q.beginPath(); q.moveTo(380, 128); const a = i / 16 * TAU; q.lineTo(380 + Math.cos(a) * 420, 128 + Math.sin(a) * 420); q.lineTo(380 + Math.cos(a + 0.12) * 420, 128 + Math.sin(a + 0.12) * 420); q.fill(); }
      q.fillStyle = '#c0392b'; q.font = '900 78px "Noto Sans TC", sans-serif'; q.textAlign = 'left'; q.fillText('冰涼汽水', 28, 110); q.fillStyle = '#1b2a4a'; q.font = '800 44px system-ui, sans-serif'; q.fillText('ICE COLD 5¢', 32, 175); q.fillStyle = '#3cc3c0'; q.fillRect(28, 200, 260, 10);
      q.fillStyle = '#7a2a1a'; q.beginPath(); q.moveTo(368, 60); q.lineTo(392, 60); q.lineTo(400, 110); q.lineTo(412, 230); q.lineTo(348, 230); q.lineTo(360, 110); q.closePath(); q.fill(); q.fillStyle = '#f4f1ea'; q.fillRect(352, 150, 56, 26); q.strokeStyle = '#f4f1ea'; q.lineWidth = 6; q.strokeRect(6, 6, Wd - 12, Ht - 12); });
    add(k, g, box(6.6, 3.3, 0.2), [k.m('#8a7a62'), k.m('#8a7a62'), k.m('#8a7a62'), k.m('#8a7a62'), k.night ? texLit(ad, 0.7) : new THREE.MeshStandardMaterial({ map: ad, roughness: 0.8 }), k.m('#8a7a62')], 0, 6.3, 0);
    add(k, g, box(6.6, 0.08, 0.7), '#5a5048', 0, 4.6, 0.35); }
  const mp = pickClear(clear, [[13.6, -15], [-13.6, -15], [17, -12], [-17, -12], [11, -18]].filter(([x, z]) => !bbp || Math.hypot(x - bbp[0], z - bbp[1]) > 5), 2.2, 9);
  if (mp) { const g = grp(mp[0], 0, mp[1]); g.rotation.y = Math.atan2(-mp[0], 22 - mp[1]); world.add(g);
    add(k, g, cyl(0.16, 0.2, 9, 8), '#c9ced4', 0, 4.5, 0);
    add(k, g, box(1.3, 3.6, 0.3), basic(textTex('MOTEL', 96, 360, '#f4efe2', '#d8343f', { vert: true, font: 'system-ui, sans-serif' })), 0, 6.6, 0.25);
    const arrow = new THREE.Shape(); arrow.moveTo(-2.2, -0.35); arrow.lineTo(0.6, -0.35); arrow.lineTo(0.6, -0.8); arrow.lineTo(1.7, 0); arrow.lineTo(0.6, 0.8); arrow.lineTo(0.6, 0.35); arrow.lineTo(-2.2, 0.35); arrow.closePath();
    const ar = add(k, g, new THREE.ExtrudeGeometry(arrow, { depth: 0.2, bevelEnabled: false }), [lit('#3cc3c0', k.night ? 1.6 : 0.5), k.m('#2a8a88')], 0.4, 4.1, 0.2); ar.rotation.z = -0.35;
    const mA = [], mB = []; for (let i = 0; i < 10; i++) { const u = -1.9 + i * 0.36, x = 0.4 + u * Math.cos(-0.35), y = 4.1 + u * Math.sin(-0.35); (i % 2 ? mB : mA).push(mat4(x, y, 0.45)); }
    inst(g, k.g('rbulb', () => sph(0.07, 8, 6)), bulbA, mA, null, false); inst(g, k.g('rbulb', () => sph(0.07, 8, 6)), bulbB, mB, null, false); }
  // 點唱機（廣場上，彩色燈條會變色）
  const jb = layout.place(k.rnd, 0.6, 1.9);
  if (jb) { const g = grp(jb.x, 0.13, jb.z); g.rotation.y = Math.atan2(-jb.x, 0.9 - jb.z); world.add(g);
    add(k, g, box(1.0, 1.2, 0.6), '#8a4a2a', 0, 0.6, 0); add(k, g, cyl(0.5, 0.5, 0.6, 18, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2), '#8a4a2a', 0, 1.2, 0);
    const jm = lit('#ff3e5a', 1.8); add(k, g, new THREE.TorusGeometry(0.4, 0.06, 6, 20, Math.PI), jm, 0, 1.2, 0.31, {}).castShadow = false;
    const jm2 = lit('#3cc3c0', 1.8); for (const x of [-0.42, 0.42]) add(k, g, box(0.1, 1.0, 0.04), jm2, x, 0.65, 0.31, false);
    add(k, g, box(0.6, 0.35, 0.03), basic(canvas(64, 32, (q) => { q.fillStyle = '#2a1a10'; q.fillRect(0, 0, 64, 32); q.fillStyle = '#d9b25f'; for (let i = 0; i < 8; i++) q.fillRect(4 + i * 7.5, 4, 4, 24); })), 0, 0.5, 0.31, false);
    k.anim.push((t) => { jm.emissive.setHSL((t * 0.15) % 1, 0.9, 0.55); jm.color.copy(jm.emissive); jm2.emissive.setHSL((t * 0.15 + 0.5) % 1, 0.9, 0.55); jm2.color.copy(jm2.emissive); }); }
  // 棕櫚樹（InstancedMesh）、電線桿、水塔、遠方台地
  const trunks = [], fronds = [];
  ringOut(k, clear, mobile ? 6 : 11, 9.6, 26, 6, 1.4, (x, z) => { if (z > 9.4 && z < 16) return null; const s = 1.6 + k.rnd() * 0.8, lean = (k.rnd() - 0.5) * 0.4, ry = k.rnd() * TAU; let px = 0, py = 0;
    for (let i = 0; i < 5; i++) { const M = mat4(x, 0, z, ry).multiply(mat4(px, py + 0.5 * s, 0, 0, [s, s, s], 0, -lean * (0.5 + i * 0.2))); trunks.push(M); px += Math.sin(lean * (0.5 + i * 0.2)) * s; py += s * 0.98; }
    for (let j = 0; j < 8; j++) fronds.push(mat4(x, 0, z, ry).multiply(mat4(px, py, 0, j / 8 * TAU, s, 0, 1.95, 'YXZ'))); return 1; });
  inst(world, cyl(0.1, 0.13, 1, 6), k.m('#a7835a'), trunks); inst(world, k.g('rfrond', () => { const g = cone(0.24, 1.6, 4); g.translate(0, 0.8, 0); g.scale(1, 1, 0.25); return g; }), k.m(k.night ? '#2f6b3a' : '#3fae4f', { flatShading: true, side: THREE.DoubleSide }), fronds);
  const tp = []; for (let x = -60; x <= 60; x += 9) { if (Math.abs(x) < 13) continue; tp.push([x, 15.6]); }
  inst(world, cyl(0.1, 0.12, 6, 6), k.m('#6b5a48'), tp.map(([x, z]) => mat4(x, 3, z))); inst(world, box(1.4, 0.1, 0.1), k.m('#5a4a3a'), tp.map(([x, z]) => mat4(x, 5.6, z)));
  for (const s of [-1, 1]) for (const o of [-0.6, 0.6]) { const pts = tp.filter(([x]) => x * s > 0).sort((a, b) => a[0] - b[0]).map(([x, z]) => new THREE.Vector3(x + o * 0, 5.65, z + o)); world.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x2a2a2a }))); }
  const wtp = pickClear(clear, [[-22, -24], [22, -26], [-26, -16]], 2.5, 12);
  if (wtp) { const g = grp(wtp[0], 0, wtp[1]); world.add(g); for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(k, g, box(0.16, 8, 0.16), '#8d949a', x, 4, z); add(k, g, cyl(1.9, 1.9, 2.6, 18), '#e8e2d0', 0, 9.3, 0); add(k, g, cone(2.1, 1.2, 18), '#c0392b', 0, 11.2, 0); }
  const mesa = k.m(k.night ? '#6a4030' : '#c8643c', { flatShading: true });
  for (const [x, z, r, hh] of [[-40, -55, 10, 9], [-12, -70, 14, 12], [26, -58, 9, 8], [52, -40, 8, 10], [-58, -24, 7, 7]]) add(k, world, cyl(r * 0.75, r, hh, 7), mesa, x, hh / 2, z).castShadow = false;
  // 滾來滾去的風滾草
  const tw = add(k, world, new THREE.IcosahedronGeometry(0.45, 1), new THREE.MeshStandardMaterial({ color: C('#a8865a'), wireframe: true }), 0, 0.5, 0, {});
  k.anim.push((t) => { const u = (t * 0.045) % 1; tw.position.set(30 - u * 60, 0.45 + Math.abs(Math.sin(t * 3)) * 0.5, 17 - u * 4); tw.rotation.z = t * 3; });
  return { spots, features: ['不鏽鋼餐車', '霓虹跑馬燈', '復古老爺車', '加油站', '點唱機', '公路看板'], heroH: 5.4 };
}

// ================= 紙藝文具世界 =================
function paper({ k, world, pal, clear, layout, mobile }) {
  const lined = rep(canvas(256, 256, (g) => { g.fillStyle = '#fbf8ef'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#9cc3e6'; for (let i = 0; i < 8; i++) g.fillRect(0, i * 32 + 30, 256, 2); g.fillStyle = '#ef8f8f'; g.fillRect(36, 0, 2, 256); }), 40, 40);
  const gp = new THREE.Mesh(new THREE.PlaneGeometry(320, 320), new THREE.MeshStandardMaterial({ map: lined, roughness: 1 })); gp.rotation.x = -Math.PI / 2; gp.position.y = -0.01; gp.receiveShadow = true; world.add(gp);
  const graph = rep(canvas(128, 128, (g) => { g.fillStyle = '#f2f8f2'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#bfe0cf'; g.lineWidth = 1; for (let i = 0; i <= 128; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke(); } g.strokeStyle = '#8fcbb0'; g.lineWidth = 2; g.strokeRect(0, 0, 128, 128); }), 9, 9);
  ground(k, world, { color: null, coreTex: graph, edge: '#f2c230', edgeH: 0.3 });
  const P = pal.map((c) => hex(c)), pastel = ['#ff9eb8', '#8fd3ff', '#ffd36e', '#b99bff', '#7fe0b0', '#ffb07a'];
  // 筆記本書屋（主建築）：三本疊起來的筆記本當牆、最上面一本攤開的線圈筆記本，頁面會翻
  const h = grp(HX, 0.12, HZ); world.add(h);
  const edges = rep(canvas(64, 64, (g) => { g.fillStyle = '#fbfaf5'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#d4cdbc'; for (let i = 0; i < 16; i++) g.fillRect(0, i * 4, 64, 1.5); }), 1, 3);
  const pageM = new THREE.MeshStandardMaterial({ map: edges, roughness: 0.9 });
  let y = 0;
  [[6.9, 3.7, 1.25, P[0], 0.03], [6.5, 3.5, 1.1, P[1], -0.04], [6.75, 3.6, 1.0, P[2], 0.025]].forEach(([w, d, hh, c, ry], i) => { const g = grp(0, y, -0.2); g.rotation.y = ry; h.add(g); const cm = k.m(c, { roughness: 0.6 });
    add(k, g, box(w, hh - 0.3, d), pageM, 0.08, hh / 2, 0); add(k, g, box(w + 0.16, 0.16, d + 0.14), cm, 0, 0.08, 0); add(k, g, box(w + 0.16, 0.16, d + 0.14), cm, 0, hh - 0.08, 0); add(k, g, box(0.3, hh, d + 0.14), cm, -w / 2 - 0.05, hh / 2, 0); add(k, g, box(0.18, hh * 0.8 + 0.3, 0.02), ['#e8453c', '#3aa0e8', '#ffd23a'][i], w * 0.3, hh * 0.5, d / 2 + 0.08); y += hh; });
  const top = y;
  add(k, h, box(1.3, 2.05, 0.08), k.m('#8a5a3a'), 0, 1.03, 1.63); add(k, h, box(1.6, 0.22, 0.22), k.m('#f2c230'), 0, 2.15, 1.7); add(k, h, cone(0.11, 0.3, 6).rotateZ(-Math.PI / 2), '#e8c89a', 0.95, 2.15, 1.7); add(k, h, box(0.22, 0.24, 0.24), '#ff9eb8', -0.88, 2.15, 1.7);
  add(k, h, sph(0.07, 8, 6), '#d9b25f', 0.4, 1.0, 1.7);
  const sign = nameSign(k, 4.2, 0.6, '#ffffff', '#2b3a67'); sign.position.set(0, top - 0.5, 1.62); h.add(sign);
  // 便利貼窗戶（會被風吹動）
  const notes = [];
  [[-2.4, 1.1, '#ffe66d'], [2.4, 1.1, '#ff9eb8'], [-2.5, 2.4, '#8fd3ff'], [2.5, 2.4, '#7fe0b0']].forEach(([x, yy, c], i) => { const m = add(k, h, k.g('pnote', () => new THREE.PlaneGeometry(0.85, 0.85).translate(0, -0.42, 0)), k.night ? lit(c, 0.9, { side: THREE.DoubleSide }) : k.m(c, { side: THREE.DoubleSide, roughness: 0.8 }), x, yy + 0.42, 1.68, {}); m.castShadow = false; notes.push(m); });
  k.anim.push((t) => notes.forEach((m, i) => { m.rotation.x = -0.08 - Math.max(0, Math.sin(t * 1.3 + i * 1.7)) * 0.35; }));
  // 攤開的線圈筆記本
  const lp = canvas(256, 128, (g) => { g.fillStyle = '#fffdf6'; g.fillRect(0, 0, 256, 128); g.fillStyle = '#9cc3e6'; for (let i = 1; i < 9; i++) g.fillRect(0, i * 14, 256, 1.5); g.fillStyle = '#ef8f8f'; g.fillRect(20, 0, 1.5, 128); g.strokeStyle = '#5a6a9a'; g.lineWidth = 1.5; for (let i = 1; i < 7; i++) { g.beginPath(); let x = 30; g.moveTo(x, i * 14 - 3); while (x < 30 + 60 + ((i * 37) % 150)) { x += 6; g.lineTo(x, i * 14 - 3 - ((x / 6) % 2) * 4); } g.stroke(); } });
  const lpM = new THREE.MeshStandardMaterial({ map: lp, roughness: 0.9 });
  const ob = grp(0, top, -0.2); h.add(ob);
  for (const s of [-1, 1]) { const b = grp(0, 0, 0); b.rotation.x = s * 0.12; ob.add(b); add(k, b, box(HW - 0.5, 0.22, 1.85), [pageM, pageM, lpM, k.m(P[3]), pageM, pageM], 0, 0.11, s * 0.95); }
  inst(ob, k.g('pring', () => new THREE.TorusGeometry(0.17, 0.03, 6, 14)), k.m('#b8bec6', { metalness: 0.6, roughness: 0.3 }), Array.from({ length: 16 }, (_, i) => mat4(-3.0 + i * 0.4, 0.2, 0, Math.PI / 2)));
  const flip = grp(0, 0.24, 0); ob.add(flip);
  add(k, flip, new THREE.PlaneGeometry(HW - 0.6, 1.8).translate(0, 0.9, 0), new THREE.MeshStandardMaterial({ map: lp, side: THREE.DoubleSide, roughness: 0.9 }), 0, 0, 0, {}).castShadow = false;
  k.anim.push((t) => { const c = (t * 0.22) % 2, u = c < 1 ? smooth((c - 0.3) / 0.6) : 1 - smooth((c - 1.3) / 0.6); flip.rotation.x = -(Math.PI / 2 - 0.15) + u * (Math.PI - 0.3); });
  // 鉛筆森林（InstancedMesh：橡皮擦、鐵圈、筆身、木頭、筆芯）
  const pen = { er: [], fe: [], bd: [], bc: [], wd: [], gr: [] }, occ = [[0, -8.4, 5]];
  ringOut(k, clear, mobile ? 9 : 16, 9.6, 26, 9, 0.8, (x, z) => { if (!far(occ, x, z, 1) || (z > 9 && Math.abs(x) < 9)) return null; const hh = 3.2 + k.rnd() * 5.5, M = mat4(x, 0, z, k.rnd() * TAU, 1, (k.rnd() - 0.5) * 0.25, (k.rnd() - 0.5) * 0.25), L = (yy, s) => M.clone().multiply(mat4(0, yy, 0, 0, s));
    pen.er.push(L(0.25, [1, 0.5, 1])); pen.fe.push(L(0.65, [1.04, 0.32, 1.04])); pen.bd.push(L(0.8 + hh / 2, [1, hh, 1])); pen.bc.push(P[pen.bd.length % 6] || pastel[0]); pen.wd.push(L(0.8 + hh + 0.4, [1, 0.8, 1])); pen.gr.push(L(0.8 + hh + 0.92, [1, 0.25, 1])); occ.push([x, z, 0.8]); return 1; }, { front: true });
  const pcols = pen.bd.map((_, i) => [P[0], '#f2c230', P[1], '#3aa0e8', P[2], '#e8453c', '#5abf6a', P[3]][i % 8]);
  inst(world, cyl(0.42, 0.42, 1, 6), k.m('#ff9eb8'), pen.er); inst(world, cyl(0.42, 0.42, 1, 12), k.m('#c9ced4', { metalness: 0.5, roughness: 0.3 }), pen.fe);
  inst(world, cyl(0.4, 0.4, 1, 6), k.m('#ffffff', { flatShading: true, roughness: 0.5 }), pen.bd, pcols); inst(world, cone(0.4, 1, 6), k.m('#ecc99a', { flatShading: true }), pen.wd); inst(world, cone(0.13, 1, 6), k.m('#3a3d42'), pen.gr);
  // 蠟筆高塔（主建築後方）
  const wrap = canvas(64, 128, (g) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 128); g.fillStyle = '#1c1c1c'; for (const y0 of [18, 100]) { g.beginPath(); for (let x = 0; x <= 64; x += 8) { g.lineTo(x, y0 + (x % 16 ? 6 : 0)); } g.lineTo(64, y0 + 10); g.lineTo(0, y0 + 10); g.fill(); } g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(8, 56, 48, 16); });
  const cr = { b: [], t: [], c: [] };
  const crP = [[-7, -16], [-4.4, -17.6], [-1.5, -16.2], [1.6, -18], [4.6, -16.4], [7.4, -17.8], [-10.5, -19.5], [10.5, -19], [0, -21.5], [-6, -22], [6, -22.5], [-14, -14], [14, -14]];
  crP.forEach(([x, z], i) => { const hh = 3.6 + ((i * 37) % 10) * 0.42; if (!clear(x, z, 1.0, hh + 1.6) || (mobile && i % 2)) return; cr.b.push(mat4(x, hh / 2, z, i, [1, hh, 1])); cr.t.push(mat4(x, hh + 0.75, z, i, [1, 1.5, 1])); cr.c.push(['#e8453c', '#ff9a3c', '#ffd23a', '#5abf6a', '#3aa0e8', '#8a5ad8', '#ff7ab0', P[0], P[1]][i % 9]); occ.push([x, z, 1]); });
  inst(world, cyl(0.85, 0.85, 1, 16), new THREE.MeshStandardMaterial({ map: wrap, roughness: 0.7 }), cr.b, cr.c); inst(world, cyl(0.28, 0.85, 1, 16), k.m('#ffffff', { roughness: 0.6 }), cr.t, cr.c);
  // 橡皮擦大石頭、紙房子
  const er = { a: [], b: [], c: [] };
  ringOut(k, clear, mobile ? 5 : 9, 9.4, 20, 1.2, 1.0, (x, z) => { if (!far(occ, x, z, 1.2)) return null; const s = 0.7 + k.rnd() * 0.7, ry = k.rnd() * TAU, rz = k.rnd() < 0.3 ? 0.35 : 0; const M = mat4(x, 0.5 * s, z, ry, s, 0, rz); er.a.push(M.clone().multiply(mat4(0, 0, 0, 0, [2.0, 0.9, 1.1]))); er.b.push(M.clone().multiply(mat4(0.35, 0, 0, 0, [1.15, 0.96, 1.16]))); er.c.push(pastel[er.a.length % 6]); occ.push([x, z, 1.2 * s]); return 1; });
  inst(world, box(1, 1, 1), k.m('#ffd0dc', { roughness: 0.9 }), er.a); inst(world, box(1, 1, 1), k.m('#ffffff', { roughness: 0.7 }), er.b, er.c);
  const ph = { b: [], r: [], d: [], c: [] };
  ringOut(k, clear, mobile ? 5 : 9, 10.5, 22, 3.2, 1.6, (x, z) => { if (!far(occ, x, z, 1.6) || z < -12) return null; const ry = Math.atan2(-x, -z), s = 0.9 + k.rnd() * 0.5, M = mat4(x, 0, z, ry, s); ph.b.push(M.clone().multiply(mat4(0, 0.8, 0, 0, [2.0, 1.6, 1.8]))); ph.r.push(M.clone().multiply(mat4(0, 1.6, 0, 0, [2.0, 1.1, 1.8]))); ph.d.push(M.clone().multiply(mat4(0, 0.5, 0.91, 0, [0.45, 0.8, 0.02]))); ph.c.push(pastel[ph.b.length % 6]); occ.push([x, z, 1.6 * s]); return 1; }, { front: false });
  inst(world, box(1, 1, 1), k.m('#fffdf7', { roughness: 0.9 }), ph.b); inst(world, gable(1, 1, 1, 0.08), [k.m('#fffdf7'), k.m('#ffffff', { flatShading: true })], ph.r, ph.c); inst(world, box(1, 1, 1), k.m('#8a6a4a'), ph.d, null, false);
  // 迴紋針拱門、尺做的步道
  const cp = pickClear(clear, [[-11.5, 3.5], [11.5, 3.5], [-12, -4], [12, -4]].filter(([x, z]) => far(occ, x, z, 1.5)), 1.6, 7);
  if (cp) { const pts = [], arc = (cx, cy, r, a0, a1) => { for (let i = 0; i <= 10; i++) { const a = a0 + (a1 - a0) * i / 10; pts.push(new THREE.Vector3(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0)); } };
    pts.push(new THREE.Vector3(0.6, 0, 0)); arc(0, 3.2, 0.6, 0, Math.PI); arc(-0.14, 0.75, 0.46, Math.PI, TAU); arc(0.07, 2.7, 0.25, 0, Math.PI); pts.push(new THREE.Vector3(-0.18, 1.3, 0));
    const clip = add(k, world, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), 120, 0.07, 6), k.m('#c9ced4', { metalness: 0.6, roughness: 0.25 }), cp[0], 0, cp[1]); clip.scale.setScalar(1.8); clip.rotation.y = Math.atan2(-cp[0], -cp[1]) + Math.PI / 2; occ.push([cp[0], cp[1], 1.5]); }
  const ruler = canvas(512, 64, (g) => { g.fillStyle = '#ffe27a'; g.fillRect(0, 0, 512, 64); g.fillStyle = '#3a3020'; for (let i = 0; i <= 100; i++) g.fillRect(4 + i * 5, 0, 1.5, i % 10 ? (i % 5 ? 10 : 16) : 24); g.font = '700 12px system-ui, sans-serif'; for (let i = 0; i <= 10; i++) g.fillText(String(i), 2 + i * 50, 38); });
  const rl = add(k, world, box(1.6, 0.08, 14), [k.m('#e8c24a'), k.m('#e8c24a'), new THREE.MeshStandardMaterial({ map: ruler.clone() }), k.m('#e8c24a'), k.m('#e8c24a'), k.m('#e8c24a')], 0, 0.04, 16.4); rl.material[2].map.needsUpdate = true; rl.material[2].map.center.set(0.5, 0.5); rl.material[2].map.rotation = Math.PI / 2;
  // 紙風車（會轉）
  const pwG = (() => { const g = new THREE.BufferGeometry(), v = [], c = [], cs = ['#ff7ab0', '#3aa0e8', '#ffd23a', '#5abf6a'].map((x) => C(x)); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; v.push(0, 0, 0, Math.cos(a) * 0.55, Math.sin(a) * 0.55, 0, Math.cos(a + 0.9) * 0.4, Math.sin(a + 0.9) * 0.4, 0.12); for (let j = 0; j < 3; j++) c.push(cs[i].r, cs[i].g, cs[i].b); } g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); g.computeVertexNormals(); return g; })();
  const pwM = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.7 }), wheels = [];
  for (const [x, z] of [[-4.6, 10.2], [5.0, 10.6], [-7.4, 9.8], [7.8, 9.6], [-2.6, 11.6], [3.0, 12.2]].slice(0, mobile ? 3 : 6)) { add(k, world, k.g('pwst', () => cyl(0.035, 0.035, 2.0, 5)), '#ffffff', x, 1.0, z); const w = add(k, world, pwG, pwM, x, 2.0, z + 0.06, {}); w.rotation.y = Math.atan2(-x, 27 - z) * 0.5; wheels.push(w); }
  k.anim.push((t) => wheels.forEach((w, i) => { w.rotation.z = -t * (2 + i * 0.3); }));
  // 紙飛機繞圈飛、紙鶴拍翅膀
  const planeG = (() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.7, 0, 0, -0.45, -0.55, 0.06, -0.45, 0, 0, 0.7, 0.55, 0.06, -0.45, 0, 0, -0.45, 0, 0, 0.7, 0, -0.16, -0.4, 0, 0, -0.45], 3)); g.computeVertexNormals(); return g; })();
  const planes = []; for (let i = 0; i < (mobile ? 4 : 7); i++) { const m = add(k, world, planeG, k.m([ '#ffffff', P[0], '#8fd3ff', '#ffe66d', P[2], '#ff9eb8', '#ffffff'][i], { side: THREE.DoubleSide, flatShading: true }), 0, 0, 0, {}); m.scale.setScalar(1.3); planes.push({ m, cx: (hash(i) - 0.5) * 22, cz: -6 + (hash(i + 9) - 0.5) * 18, cy: 6 + hash(i + 3) * 4, r: 4 + hash(i + 5) * 5, w: 0.25 + hash(i + 7) * 0.2, o: i * 1.3 }); }
  const pv = new THREE.Vector3(); const pathP = (p, t, out) => out.set(p.cx + Math.sin(t * p.w + p.o) * p.r, p.cy + Math.sin(t * p.w * 2 + p.o) * 1.4, p.cz + Math.sin(t * p.w * 2 + p.o) * p.r * 0.55);
  k.anim.push((t) => planes.forEach((p) => { pathP(p, t, p.m.position); pathP(p, t + 0.15, pv); p.m.lookAt(pv); p.m.rotateZ(Math.cos(t * p.w + p.o) * 0.5); }));
  const craneB = (() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.32, 0, 0, 0, 0.5, -0.12, -0.05, 0, 0, 0.32, 0, -0.12, -0.05, 0, 0, 0, -0.5, 0, 0.32, 0, 0.12, -0.05, 0, 0, 0, 0.5, 0, 0.32, 0, 0, 0, -0.5, 0.12, -0.05, 0, 0, 0, 0.4, 0, 0.1, 0.38, 0, 0.7, 0.85, 0, 0.7, 0.85, 0, 0.62, 1.02, 0, 0.6, 0.8, 0, 0, -0.4, 0, 0.1, -0.38, 0, 0.62, -0.95], 3)); g.computeVertexNormals(); return g; })();
  const wingG = (() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.32, 0, 0, -0.3, 0.95, 0.12, -0.05], 3)); g.computeVertexNormals(); return g; })();
  const crane = (c, s) => { const g = new THREE.Group(), m = k.m(c, { side: THREE.DoubleSide, flatShading: true, roughness: 0.6 }); add(k, g, craneB, m, 0, 0, 0); const wl = add(k, g, wingG, m, 0, 0.22, 0), wr = add(k, g, wingG, m, 0, 0.22, 0); wr.scale.x = -1; g.scale.setScalar(s); world.add(g); return { g, wl, wr }; };
  const flyers = []; for (let i = 0; i < (mobile ? 3 : 5); i++) flyers.push({ ...crane(pastel[i], 1.5), r: 10 + i * 2.2, y: 7.5 + i * 0.8, w: 0.12 + i * 0.02, o: i * 1.4 });
  k.anim.push((t) => flyers.forEach((f) => { const a = f.o + t * f.w; f.g.position.set(Math.sin(a) * f.r, f.y + Math.sin(t * 1.5 + f.o) * 0.4, -4 + Math.cos(a) * f.r * 0.7); f.g.rotation.y = a + Math.PI / 2; const fl = Math.sin(t * 5 + f.o) * 0.6; f.wl.rotation.z = fl; f.wr.rotation.z = -fl; }));
  const stand = []; for (const [x, z, c] of [[-10.2, 7.2, P[0]], [11.0, 6.4, '#ff7ab0'], [-13.5, -6.5, '#3aa0e8']]) { if (!clear(x, z, 1.2, 3) || !far(occ, x, z, 1.2)) continue; const cr2 = crane(c, 2.6); cr2.g.position.set(x, 0.9, z); cr2.g.rotation.y = Math.atan2(-x, -z); cr2.wl.rotation.z = 0.5; cr2.wr.rotation.z = -0.5; stand.push(cr2.g); }
  k.anim.push((t) => stand.forEach((g, i) => { g.position.y = 0.9 + Math.sin(t * 1.4 + i) * 0.08; }));
  // 飄落的彩色紙屑
  const N = mobile ? 60 : 140, cf = new Float32Array(N * 3), cc = new Float32Array(N * 3), cpal = pastel.map((x) => C(x));
  for (let i = 0; i < N; i++) { cf.set([(k.rnd() - 0.5) * 30, k.rnd() * 12, (k.rnd() - 0.5) * 30 - 3], i * 3); const c = cpal[i % 6]; cc.set([c.r, c.g, c.b], i * 3); }
  const conf = points(world, cf, { cols: cc, size: 0.22 });
  let last = 0; k.anim.push((t) => { const dt = Math.min(0.05, t - last); last = t; const p = conf.geometry.attributes.position; for (let i = 0; i < N; i++) { let yy = p.getY(i) - dt * 0.6; if (yy < 0.2) yy = 12; p.setY(i, yy); p.setX(i, p.getX(i) + Math.sin(t + i) * dt * 0.3); } p.needsUpdate = true; });
  const spots = [];
  if (er.a.length) { const e = new THREE.Vector3().setFromMatrixPosition(er.a[0]); spots.push({ x: e.x, z: e.z + 0.0, y: e.y * 2 + 0.05, face: [0, 0.9], pose: 'sit' }); }
  return { spots, features: ['筆記本書屋', '翻動的書頁', '鉛筆森林', '蠟筆高塔', '紙飛機', '摺紙鶴', '紙風車'], heroH: top + 2.2 };
}

// ================= 湖畔露營地 =================
function camp({ k, world, pal, clear, layout, mobile }) {
  const dirt = rep(canvas(128, 128, (g) => { g.fillStyle = '#b9a27c'; g.fillRect(0, 0, 128, 128); let s = 5; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let i = 0; i < 260; i++) { g.fillStyle = ['#a8916c', '#c9b48e', '#9a8462', '#d2c2a0'][Math.floor(r() * 4)]; g.beginPath(); g.arc(r() * 128, r() * 128, 1 + r() * 2.5, 0, TAU); g.fill(); } }), 6, 6);
  ground(k, world, { color: k.night ? '#2c4a2c' : '#6f9a4f', coreTex: dirt, edge: '#7a5a3a', edgeH: 0.34 });
  // 湖（左邊，岸邊有沙）
  const LX = -25, LZ = -4, lr = (a) => 13 + Math.sin(a * 3 + 1) * 1.5 + Math.cos(a * 5) * 0.8;
  const lakeShape = (o) => { const s = new THREE.Shape(); for (let i = 0; i <= 48; i++) { const a = i / 48 * TAU, r = lr(a) + o; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? s.lineTo(x, y) : s.moveTo(x, y); } return s; };
  const shore = add(k, world, new THREE.ShapeGeometry(lakeShape(1.4), 1).rotateX(-Math.PI / 2), k.m(k.night ? '#6a6048' : '#d8c8a0', { roughness: 1 }), LX, 0.012, LZ); shore.castShadow = false;
  const lt = flowTex(k, '#3a8fb0', 1 / 6, 1 / 6, [0.008, 0.014]);
  const lake = add(k, world, new THREE.ShapeGeometry(lakeShape(0), 1).rotateX(-Math.PI / 2), waterMat(k, lt, '#3a8fb0'), LX, 0.03, LZ); lake.castShadow = false;
  const inLake = (x, z, pad = 0) => { const a = Math.atan2(-(z - LZ), x - LX); return Math.hypot(x - LX, z - LZ) < lr(a) + 1.4 + pad; };
  // 遠山：兩層山稜
  for (const [x, z, r, hh, c] of [[-60, -70, 26, 30, '#7d93a8'], [-20, -82, 30, 38, '#7088a0'], [25, -75, 28, 34, '#7d93a8'], [64, -60, 24, 26, '#8aa0b2'], [-42, -48, 16, 16, '#3f6a52'], [-8, -54, 18, 19, '#36604a'], [22, -50, 15, 15, '#3f6a52'], [46, -40, 14, 13, '#36604a']]) { const m = add(k, world, cone(r, hh, 8), k.m(k.night ? '#22323a' : c, { flatShading: true }), x, hh / 2 - 0.5, z); m.castShadow = false; if (hh > 25) add(k, world, cone(r * 0.28, hh * 0.28, 8), k.m(k.night ? '#9aa8b8' : '#f4f8fc', { flatShading: true }), x, hh - hh * 0.14 - 0.5, z).castShadow = false; }
  const occ = [[0, -8.4, 4.5]], spots = [];
  // 營火（廣場右側，晚上會發光）＋圍坐的木頭
  const fp = pickClear(clear, [[11.2, 0.6], [11.0, 4.0], [10.8, -3.2], [-10.4, 8.6]], 2.0, 1.2) || [11.2, 0.6]; occ.push([fp[0], fp[1], 2.2]);
  const fire = grp(fp[0], 0.02, fp[1]); world.add(fire);
  inst(fire, k.g('cst', () => new THREE.IcosahedronGeometry(0.2, 0)), k.m('#8b8580', { flatShading: true }), Array.from({ length: 10 }, (_, i) => mat4(Math.cos(i / 10 * TAU) * 0.62, 0.1, Math.sin(i / 10 * TAU) * 0.62, i, [1.1, 0.8, 1])));
  for (let i = 0; i < 3; i++) add(k, fire, cyl(0.08, 0.08, 1.0, 6), '#5a3a22', 0, 0.16, 0).rotation.set(Math.PI / 2 - 0.25, i * 2.1, 0, 'YXZ');
  const flames = [[0, 0.5, 1.0, '#ff7a1a'], [0.12, 0.38, 0.7, '#ffb52a'], [-0.1, 0.3, 0.55, '#ffe27a']].map(([x, r, hh, c]) => { const m = add(k, fire, cone(r * 0.7, hh, 7), lit(c, 2.4, { transparent: true, opacity: 0.92 }), x, 0.2 + hh / 2, 0, {}); m.castShadow = false; return m; });
  const fl = k.night ? new THREE.PointLight(0xff8a3a, 8, 10) : null; if (fl) { fl.position.set(0, 1.0, 0); fire.add(fl); }
  const SN = 24, sp = new Float32Array(SN * 3); const sparks = points(fire, sp, { color: 0xffb04a, size: 0.12, add: true });
  k.anim.push((t) => { flames.forEach((m, i) => { m.scale.set(1 + Math.sin(t * 9 + i) * 0.08, 0.8 + Math.abs(Math.sin(t * 7 + i * 2)) * 0.4, 1 + Math.cos(t * 8 + i) * 0.08); m.rotation.y = t * (1 + i * 0.3); }); if (fl) fl.intensity = 7 + Math.sin(t * 13) * 1.5 + Math.sin(t * 7.3) * 1.2;
    const p = sparks.geometry.attributes.position; for (let i = 0; i < SN; i++) { const u = (t * 0.5 + i / SN) % 1; p.setXYZ(i, Math.sin(i * 3.1 + u * 4) * 0.3 * u, 0.6 + u * 3, Math.cos(i * 2.3 + u * 3) * 0.3 * u); } p.needsUpdate = true; });
  for (let i = 0; i < 3; i++) { const a = Math.atan2(-fp[0], -fp[1]) + (i - 1) * 1.15, x = fp[0] + Math.sin(a) * 1.55, z = fp[1] + Math.cos(a) * 1.55; const lg = add(k, world, cyl(0.22, 0.22, 1.5, 8), '#7a5236', x, 0.24, z); lg.rotation.set(Math.PI / 2, a + Math.PI / 2, 0, 'YXZ'); spots.push({ x, z, y: 0.46, face: [fp[0], fp[1]], pose: 'sit', prop: i === 1 ? 'cup' : undefined }); }
  puffs(k, fire, 0, 1.4, 0, { n: 4, color: 0xbfbfbf, size: 0.25, rise: 2.4, speed: 0.2, opacity: 0.35 });
  // 原木巡山小屋（主建築）：A 字形屋頂、大三角窗、石砌煙囪、前廊
  const h = grp(HX, 0.12, HZ); world.add(h);
  const logs = rep(canvas(64, 64, (c) => { for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#8a5a35' : '#a06a40'; c.fillRect(0, i * 10.7, 64, 10.7); c.fillStyle = 'rgba(0,0,0,.22)'; c.fillRect(0, (i + 1) * 10.7 - 2, 64, 2); } }), 3, 2);
  const lm = new THREE.MeshStandardMaterial({ map: logs, roughness: 0.9 }), metal = k.m('#3f6a4a', { roughness: 0.5, metalness: 0.2 });
  add(k, h, box(5.4, 2.6, 3.4), lm, 0, 1.3, -0.2);
  const rf = add(k, h, gable(3.4, 5.6, 2.7, 0.3), [k.m('#8a5a35'), metal], 0, 2.6, -0.2); rf.rotation.y = Math.PI / 2;
  const tri = new THREE.Shape(); tri.moveTo(-1.7, 0); tri.lineTo(1.7, 0); tri.lineTo(0, 1.75); tri.closePath();
  add(k, h, new THREE.ShapeGeometry(tri), k.night ? lit('#ffc46b', 1.4) : k.m('#a8cfe0', { roughness: 0.1, metalness: 0.3 }), 0, 2.75, 1.82, {}).castShadow = false;
  for (const x of [-0.6, 0.6]) add(k, h, box(0.07, 1.4, 0.05), '#5a3a22', x, 3.3, 1.84);
  add(k, h, box(0.95, 1.9, 0.06), '#5a3a22', 0, 0.95, 1.52);
  for (const x of [-1.8, 1.8]) add(k, h, box(1.0, 0.8, 0.05), k.night ? k.glow('#ffc46b', 1.6) : k.m('#cfe9ff', { roughness: 0.2 }), x, 1.4, 1.52, false);
  add(k, h, box(5.8, 0.18, 0.6), '#8a6a4a', 0, 0.09, 1.78);
  for (const x of [-2.7, -1.0, 1.0, 2.7]) add(k, h, box(0.16, 2.6, 0.16), '#6b4a30', x, 1.3, 1.95);
  const stone = rep(canvas(64, 64, (g) => { g.fillStyle = '#6a6660'; g.fillRect(0, 0, 64, 64); for (let i = 0; i < 18; i++) { g.fillStyle = ['#9a958c', '#8b8580', '#a8a39a'][i % 3]; g.beginPath(); g.ellipse((i * 23) % 64, (i * 37) % 64, 9, 6, 0, 0, TAU); g.fill(); } }), 1, 4);
  add(k, h, box(0.85, 5.9, 0.85), new THREE.MeshStandardMaterial({ map: stone, roughness: 1 }), 2.95, 2.95, -1.0);
  puffs(k, h, 2.95, 6.1, -1.0, { n: 5, color: 0xdddddd, size: 0.3, rise: 2.4, speed: 0.18, opacity: 0.55 });
  const sign = nameSign(k, 3.6, 0.5, '#5a3a22', '#f2e2c0'); sign.position.set(0, 2.25, 1.6); h.add(sign);
  if (k.night) { const l = new THREE.PointLight(0xffb84d, 5, 9); l.position.set(0, 2, 3); h.add(l); }
  // 獨木舟架
  for (const [y, c] of [[0.6, '#e8573c'], [1.1, '#f2c230']]) add(k, h, k.g('ccanoe', () => { const g = new THREE.SphereGeometry(1, 14, 6, 0, TAU, Math.PI / 2, Math.PI / 2); g.scale(0.3, 0.2, 1.6); return g; }), k.m(c, { side: THREE.DoubleSide }), -3.2, y + 0.2, 0).rotation.z = Math.PI;
  // 松樹林（InstancedMesh）
  const pine = { tr: [], c1: [], c2: [], c3: [] };
  const addPine = (x, z, s) => { pine.tr.push(mat4(x, 0.5 * s, z, 0, [s, s, s])); [[1.4, 1.9, 1.7, 'c1'], [1.05, 1.6, 2.7, 'c2'], [0.7, 1.3, 3.6, 'c3']].forEach(([r, hh, yy, key]) => pine[key].push(mat4(x, yy * s, z, (x * 7) % 3, [r * s, hh * s, r * s]))); };
  let pc = 0;
  for (let i = 0; i < 700 && pc < (mobile ? 40 : 80); i++) { const a = k.rnd() * TAU, r = 10 + k.rnd() * 34, x = Math.sin(a) * r, z = Math.cos(a) * r, s = 0.9 + k.rnd() * 0.9; if (z > 8 && Math.abs(x) < 14) continue; if (inLake(x, z, 1) || !far(occ, x, z, 1.4 * s) || !clear(x, z, 1.4 * s, 4.4 * s)) continue; if (x > 8 && x < 22 && z > -14 && z < 10 && k.rnd() < 0.8) continue; addPine(x, z, s); occ.push([x, z, 1.2 * s]); pc++; }
  const pineM = k.m(k.night ? '#1f4a35' : '#2f6b45', { flatShading: true });
  inst(world, cyl(0.2, 0.28, 1, 6), k.m('#6b4a30'), pine.tr); for (const key of ['c1', 'c2', 'c3']) inst(world, k.g('cpc', () => cone(1, 1, 7)), pineM, pine[key]);
  // 帳篷（圓頂帳、三角帳）
  const tentC = ['#e8573c', '#f2c230', '#3a9ad9', '#5fbf6a', hex(pal[0]), '#9a6bd8'];
  let tn = 0;
  for (const [x, z] of [[13.8, 4.2], [14.6, -2.6], [17.2, 1.4], [12.4, 8.4], [16.8, 6.4], [13.2, -6.6], [-10.8, 9.8], [18.8, -4.4], [11.4, -9.6]]) { if (tn >= (mobile ? 4 : 8) || !far(occ, x, z, 1.4) || !clear(x, z, 1.3, 1.8)) continue; const g = grp(x, 0.02, z); g.rotation.y = Math.atan2(-x, -z) + (k.rnd() - 0.5) * 0.6; world.add(g); const c = tentC[tn % tentC.length];
    if (tn % 2 === 0) { add(k, g, k.g('ctd', () => { const q = dome(1, 16, 8); q.scale(1.3, 0.95, 1.1); return q; }), k.m(c, { roughness: 0.6 }), 0, 0, 0); add(k, g, k.g('ctdd', () => { const q = new THREE.SphereGeometry(1.01, 8, 4, Math.PI / 2 - 0.5, 1.0, Math.PI / 2 - 0.62, 0.62); q.scale(1.3, 0.95, 1.1); return q; }), k.night ? k.m('#ffc46b', { emissive: C('#ffb050'), emissiveIntensity: 0.9 }) : k.m(hex(C(c).multiplyScalar(0.55))), 0, 0, 0, {}).castShadow = false; const p1 = add(k, g, k.g('ctp', () => new THREE.TorusGeometry(1.0, 0.015, 4, 16, Math.PI)), '#e8e8e8', 0, 0, 0); p1.scale.set(1.36, 1.0, 1); p1.rotation.y = 0.7; const p2 = p1.clone(); p2.rotation.y = -0.7; g.add(p2); }
    else { add(k, g, k.g('cta', () => gable(1.9, 1.8, 1.4, 0.05)), [k.night ? k.m('#ffc46b', { emissive: C('#ffb050'), emissiveIntensity: 0.7 }) : k.m(hex(C(c).multiplyScalar(0.6))), k.m(c, { roughness: 0.6 })], 0, 0, 0).rotation.y = Math.PI / 2; }
    occ.push([x, z, 1.4]); tn++; }
  // 露營車（遮陽棚、折疊椅）
  const rv = pickClear(clear, [[15.4, -9.4], [17.6, -5.2], [14.6, 10.8], [-9.8, -15]].filter(([x, z]) => far(occ, x, z, 2.6)), 2.6, 2.8);
  if (rv) { const g = grp(rv[0], 0.02, rv[1]); g.rotation.y = Math.atan2(-rv[0], -rv[1]) + Math.PI / 2; world.add(g);
    const side = canvas(256, 128, (q) => { q.fillStyle = '#f4f1ea'; q.fillRect(0, 0, 256, 128); q.fillStyle = '#3cb4b0'; q.fillRect(0, 70, 256, 20); q.fillStyle = '#f2a03a'; q.fillRect(0, 94, 256, 6); q.fillStyle = k.night ? '#ffd88a' : '#4a6a80'; q.fillRect(30, 22, 60, 36); q.fillRect(150, 22, 70, 36); q.fillStyle = '#8a8f96'; q.fillRect(112, 22, 26, 84); });
    const sm = k.night ? texLit(side, 0.5) : new THREE.MeshStandardMaterial({ map: side }), wm = k.m('#f4f1ea');
    add(k, g, box(4.6, 2.0, 2.1), [wm, wm, wm, wm, sm, sm], 0, 1.35, 0); add(k, g, box(4.4, 0.25, 1.9), '#e8e2d6', 0, 2.47, 0);
    for (const x of [-1.4, 1.4]) { const w = add(k, g, k.g('crw', () => cyl(0.38, 0.38, 2.2, 14)), '#2b2b2b', x, 0.38, 0); w.rotation.x = Math.PI / 2; }
    const aw = add(k, g, box(3.2, 0.06, 1.6), new THREE.MeshStandardMaterial({ map: rep(stripeTex('#f2a03a', '#f4f1ea', 10, true), 1, 1) }), 0.2, 2.1, 1.85); aw.rotation.x = 0.18;
    for (const x of [-1.3, 1.7]) add(k, g, cyl(0.03, 0.03, 2.0, 5), '#9aa0a6', x, 1.0, 2.6);
    for (const x of [-0.6, 0.6]) { add(k, g, box(0.5, 0.06, 0.5), '#3a9ad9', x, 0.45, 2.2); add(k, g, box(0.5, 0.5, 0.06), '#3a9ad9', x, 0.7, 2.45).rotation.x = -0.2; }
    occ.push([rv[0], rv[1], 2.6]); }
  // 吊床（兩棵樹之間，會晃）
  const hm = pickClear(clear, [[-11.6, -12.5], [8.8, -13.5], [-13, 10]].filter(([x, z]) => !inLake(x, z, 1)), 2.4, 4);
  if (hm) { const g = grp(hm[0], 0, hm[1]); g.rotation.y = 0.3; world.add(g); for (const z of [-1.9, 1.9]) world.add(bigTree(k, ...loc(hm[0], hm[1], 0.3, 0, z), 0.75, k.night ? '#1f4a35' : '#2f6b45', 'pine'));
    const sw = grp(0, 1.25, 0); g.add(sw); const hg = new THREE.PlaneGeometry(0.85, 3.4, 1, 14); hg.rotateX(-Math.PI / 2); const pp = hg.attributes.position; for (let i = 0; i < pp.count; i++) { const u = pp.getZ(i) / 1.7; pp.setY(i, -0.55 * (1 - u * u) - Math.abs(pp.getX(i)) * -0.15); } hg.computeVertexNormals();
    add(k, sw, hg, new THREE.MeshStandardMaterial({ map: rep(stripeTex('#e8573c', '#f2c230', 6, true), 1, 1), side: THREE.DoubleSide }), 0, 0, 0);
    k.anim.push((t) => { sw.rotation.z = Math.sin(t * 0.9) * 0.18; }); occ.push([hm[0], hm[1], 2.4]); }
  // 釣魚碼頭（湖面上的浮標會上下動）
  const dx0 = LX + lr(0) + 1.2, dz0 = LZ + 1.5;
  const dock = grp(dx0, 0, dz0); world.add(dock); add(k, dock, box(5.0, 0.12, 1.1), '#a8754a', -2.2, 0.36, 0); for (const x of [-4.4, -2.4, -0.4]) for (const z of [-0.5, 0.5]) add(k, dock, k.g('cdp', () => cyl(0.06, 0.06, 0.9, 6)), '#6b4a30', x, 0.0, z);
  const rod = add(k, dock, cyl(0.015, 0.025, 2.4, 5), '#3a2a20', -5.0, 1.15, 0); rod.rotation.z = 0.9;
  const bob = add(k, world, sph(0.07, 8, 6), '#e8453c', dx0 - 6.9, 0.05, dz0, {});
  const fline = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(dx0 - 5.95, 1.82, dz0), new THREE.Vector3(dx0 - 6.9, 0.05, dz0)]), new THREE.LineBasicMaterial({ color: 0xeeeeee })); world.add(fline);
  k.anim.push((t) => { const y = 0.05 + Math.sin(t * 2.2) * 0.03 + (Math.sin(t * 0.4) > 0.93 ? -0.08 : 0); bob.position.y = y; fline.geometry.attributes.position.setY(1, y); fline.geometry.attributes.position.needsUpdate = true; });
  spots.push({ x: dx0 - 4.4, z: dz0, y: 0.43, face: [dx0 - 8, dz0], pose: 'sit', hat: 'straw' });
  // 湖上的獨木舟
  const canoes = []; for (let i = 0; i < (mobile ? 2 : 3); i++) { const g = grp(); add(k, g, k.g('ccanoe', () => { const q = new THREE.SphereGeometry(1, 14, 6, 0, TAU, Math.PI / 2, Math.PI / 2); q.scale(0.3, 0.2, 1.6); return q; }), k.m(['#e8573c', '#f2c230', '#5fbf6a'][i], { side: THREE.DoubleSide }), 0, 0.12, 0); add(k, g, box(0.5, 0.04, 0.12), '#a8754a', 0, 0.1, 0.3); const pd = add(k, g, box(0.06, 0.04, 1.4), '#8a5a35', 0.25, 0.25, 0.1); pd.rotation.z = 0.5; world.add(g); canoes.push(g); }
  k.anim.push((t) => canoes.forEach((g, i) => { const a = t * (0.035 + i * 0.01) + i * 2.1, r = 6 + i * 2.2; g.position.set(LX + Math.cos(a) * r, Math.sin(t * 1.6 + i) * 0.04, LZ + Math.sin(a) * r * 0.8); g.rotation.y = -a; g.rotation.z = Math.sin(t * 1.3 + i) * 0.06; }));
  // 螢火蟲（晚上較亮）
  const FN = mobile ? 40 : 80, ff = new Float32Array(FN * 3); for (let i = 0; i < FN; i++) ff.set([(k.rnd() - 0.5) * 34, 0.4 + k.rnd() * 2.5, (k.rnd() - 0.5) * 30 - 2], i * 3);
  const fireflies = points(world, ff, { color: 0xd8ff6a, size: k.night ? 0.22 : 0.1, opacity: k.night ? 1 : 0.5, add: k.night });
  k.anim.push((t) => { fireflies.material.opacity = (k.night ? 0.75 : 0.35) + Math.sin(t * 2.3) * 0.25; fireflies.rotation.y = t * 0.015; });
  // 營區路標
  const sg = grp(-9.6, 0, 6.6); world.add(sg); add(k, sg, cyl(0.07, 0.07, 1.9, 6), '#6b4a30', 0, 0.95, 0);
  [['露營區 →', 1.6, -0.5], ['← 湖畔', 1.15, 0.6]].forEach(([w, yy, ry]) => { const b = add(k, sg, box(1.2, 0.3, 0.06), basic(textTex(w, 160, 40, '#8a5a35', '#fff1d0')), 0.3, yy, 0); b.rotation.y = ry; });
  return { spots, dogs: 1, features: ['原木巡山小屋', '湖畔獨木舟', '彩色帳篷', '營火', '露營車', '吊床', '釣魚碼頭'], heroH: 6.1, fog: [32, 120] };
}

// ================= 天文台星空（永遠是夜晚） =================
function observatory({ k, world, pal, clear, layout, mobile }) {
  // 山頂：中間平坦，往外掉落成山坡，遠處就是星空
  const Ht = (x, z) => { const r = Math.hypot(x, z); if (r < 10) return -0.03; const d = r - 10; return Math.max(-48, -d * 0.3 - d * d * 0.022 + (Math.sin(x * 0.21) * Math.cos(z * 0.17) + Math.sin((x + z) * 0.11) * 0.6) * Math.min(1, d / 8) * 1.1); };
  terrain(k, world, 140, mobile ? 60 : 90, Ht, (x, z) => { const r = Math.hypot(x, z); return r < 12 ? '#2a4a46' : (Math.floor(x * 0.7 + z * 0.3) % 3 ? '#1f3a3c' : '#24423f'); });
  const sm = canvas(512, 512, (g, W) => { g.fillStyle = '#121a3a'; g.fillRect(0, 0, W, W); g.strokeStyle = 'rgba(217,178,95,.55)'; g.lineWidth = 3; for (const r of [250, 200, 120]) { g.beginPath(); g.arc(256, 256, r, 0, TAU); g.stroke(); }
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; g.beginPath(); g.moveTo(256 + Math.cos(a) * 120, 256 + Math.sin(a) * 120); g.lineTo(256 + Math.cos(a) * (i % 4 ? 200 : 250), 256 + Math.sin(a) * (i % 4 ? 200 : 250)); g.stroke(); }
    let s = 9; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; g.fillStyle = '#ffffff'; for (let i = 0; i < 260; i++) { g.globalAlpha = 0.3 + r() * 0.7; g.beginPath(); g.arc(r() * W, r() * W, 0.6 + r() * 1.8, 0, TAU); g.fill(); } g.globalAlpha = 1;
    g.strokeStyle = 'rgba(160,200,255,.7)'; g.lineWidth = 2; [[[90, 120], [140, 100], [190, 130], [230, 110], [270, 150], [300, 140], [330, 175]], [[350, 330], [380, 300], [420, 320], [410, 370], [370, 380]], [[110, 350], [150, 390], [200, 370], [230, 410]]].forEach((c) => { g.beginPath(); c.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); c.forEach(([x, y]) => { g.fillStyle = '#fff6c8'; g.beginPath(); g.arc(x, y, 4, 0, TAU); g.fill(); }); }); });
  ground(k, world, { color: null, core: '#121a3a', edge: '#b8a46a', edgeH: 0.22 });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(CORE - 0.05, 72), texLit(sm, 0.55, { roughness: 0.8 })); disc.rotation.x = -Math.PI / 2; disc.position.y = 0.123; disc.receiveShadow = true; world.add(disc);
  inst(world, k.g('obol', () => cyl(0.1, 0.12, 0.45, 8)), lit('#9fd0ff', 1.4), Array.from({ length: 24 }, (_, i) => { const a = i / 24 * TAU + 0.13; return mat4(Math.sin(a) * (CORE + 0.45), 0.2, Math.cos(a) * (CORE + 0.45)); }), null, false);
  // 天文台（主建築）：白色圓筒、會轉的銀色圓頂、望遠鏡從開口伸出、前面是入口
  const h = grp(HX, 0.12, HZ); world.add(h); const white = k.m('#e9e7e1', { roughness: 0.6 });
  add(k, h, cyl(2.0, 2.1, 3.2, 32), white, 0, 1.6, -0.15);
  add(k, h, new THREE.TorusGeometry(2.12, 0.07, 6, 40), '#b8a46a', 0, 3.25, -0.15).rotation.x = Math.PI / 2;
  inst(h, k.g('orp', () => cyl(0.025, 0.025, 0.5, 4)), k.m('#b8a46a'), Array.from({ length: 20 }, (_, i) => mat4(Math.sin(i / 20 * TAU) * 2.12, 3.5, -0.15 + Math.cos(i / 20 * TAU) * 2.12)));
  const dm = grp(0, 3.2, -0.15); h.add(dm);
  add(k, dm, dome(2.02, 32, 14), k.m('#c8d0da', { metalness: 0.5, roughness: 0.35 }), 0, 0, 0);
  add(k, dm, new THREE.SphereGeometry(2.04, 4, 10, Math.PI / 2 - 0.22, 0.44, 0, Math.PI / 2), k.m('#141a2e'), 0, 0, 0, {}).castShadow = false;
  const scope = grp(0, 0.5, 0); dm.add(scope); add(k, scope, cyl(0.3, 0.36, 3.2, 16), '#f4f1ea', 0, 1.3, 0); add(k, scope, new THREE.TorusGeometry(0.32, 0.06, 6, 16), '#b8a46a', 0, 2.9, 0).rotation.x = Math.PI / 2; add(k, scope, cyl(0.26, 0.26, 0.05, 16), lit('#8fd0ff', 1.5), 0, 2.92, 0, false);
  k.anim.push((t) => { dm.rotation.y = Math.sin(t * 0.11) * 0.9; scope.rotation.x = 0.7 + Math.sin(t * 0.17) * 0.15; });
  for (const a of [-0.9, -0.45, 0.45, 0.9]) add(k, h, k.g('oport', () => cyl(0.18, 0.18, 0.06, 14).rotateX(Math.PI / 2)), lit('#ffd88a', 1.4), Math.sin(a) * 2.08, 2.3, -0.15 + Math.cos(a) * 2.08, false).rotation.y = a;
  add(k, h, box(2.8, 2.3, 1.3), white, 0, 1.15, 1.35); add(k, h, box(3.0, 0.12, 1.45), '#b8a46a', 0, 2.35, 1.35);
  add(k, h, box(1.0, 1.6, 0.05), lit('#ffd88a', 0.9), 0, 0.8, 2.01, false);
  const sign = nameSign(k, 2.6, 0.45, '#0e1a3a', '#ffe7a8'); sign.position.set(0, 1.95, 2.03); h.add(sign);
  const pl = new THREE.PointLight(0xffc880, 5, 8); pl.position.set(0, 2.0, 3.2); h.add(pl);
  const dl = new THREE.PointLight(0x8fb0ff, 4, 9); dl.position.set(0, 6.5, 1.5); h.add(dl);
  // 廣場上的小望遠鏡（會慢慢轉）＋看星星的人
  const spots = [], scopes = [];
  for (let i = 0; i < 3; i++) { const p = layout.place(k.rnd, 0.6, 1.6); if (!p) continue; const g = grp(p.x, 0.13, p.z); world.add(g);
    for (let j = 0; j < 3; j++) { const a = j / 3 * TAU, l = add(k, g, k.g('otl', () => cyl(0.025, 0.03, 1.2, 5)), '#3a3f4a', Math.sin(a) * 0.22, 0.56, Math.cos(a) * 0.22); l.rotation.set(Math.cos(a) * -0.35, 0, Math.sin(a) * 0.35); }
    const head = grp(0, 1.15, 0); g.add(head); add(k, head, k.g('ott', () => cyl(0.08, 0.1, 0.9, 10).rotateX(Math.PI / 2)), ['#f4f1ea', hex(pal[0]), '#c9ced4'][i], 0, 0, 0.1).rotation.x = -0.6;
    const ph = k.rnd() * 6; scopes.push([head, ph]); const ry = k.rnd() * TAU; head.rotation.y = ry;
    spots.push({ x: p.x - Math.sin(ry) * 0.7, z: p.z - Math.cos(ry) * 0.7, face: [p.x, p.z], pose: 'stand', hat: 'beanie' }); }
  k.anim.push((t) => scopes.forEach(([hd, ph]) => { hd.rotation.y = ph + Math.sin(t * 0.13 + ph) * 0.6; }));
  // 渾天儀（銅環會轉）
  const ap = layout.place(k.rnd, 0.7, 2.2);
  if (ap) { const g = grp(ap.x, 0.13, ap.z); world.add(g); add(k, g, cyl(0.35, 0.45, 0.8, 12), '#3a3f4a', 0, 0.4, 0); const brass = k.m('#d9b25f', { metalness: 0.6, roughness: 0.3 }); const rings = [0.75, 0.62, 0.5].map((r, i) => { const m = add(k, g, new THREE.TorusGeometry(r, 0.035, 6, 36), brass, 0, 1.55, 0); m.rotation.set(i * 0.9, i * 0.6, 0); return m; }); add(k, g, sph(0.16, 12, 8), lit('#ffd88a', 1.8), 0, 1.55, 0, false);
    k.anim.push((t) => rings.forEach((m, i) => { m.rotation.y = t * (0.3 + i * 0.2); m.rotation.x = i * 0.9 + t * 0.1 * (i - 1); })); }
  // 電波望遠鏡（山坡上，碟子會轉）
  const rp = pickClear(clear, [[13.5, -14], [-13.5, -14], [16, -8], [-16, -8]], 3.0, 6);
  if (rp) { const g = grp(rp[0], Ht(rp[0], rp[1]), rp[1]); world.add(g); add(k, g, cyl(0.5, 0.8, 3.4, 8), white, 0, 1.7, 0); const yaw = grp(0, 3.6, 0); g.add(yaw);
    const dish = grp(0, 0, 0); yaw.add(dish); dish.rotation.x = -0.9; add(k, dish, new THREE.SphereGeometry(2.6, 24, 6, 0, TAU, 0, 0.75), k.m('#e9e7e1', { side: THREE.DoubleSide, roughness: 0.5 }), 0, -2.6 * Math.cos(0.75) + 0.0, 0).rotation.x = Math.PI;
    for (let i = 0; i < 3; i++) { const a = i / 3 * TAU, st = add(k, dish, cyl(0.03, 0.03, 2.2, 4), '#9aa0a6', Math.sin(a) * 0.8, 0.95, Math.cos(a) * 0.8); st.rotation.set(Math.cos(a) * 0.4, 0, -Math.sin(a) * 0.4); } add(k, dish, sph(0.18, 8, 6), lit('#ff5a5a', 1.6), 0, 1.95, 0, false);
    k.anim.push((t) => { yaw.rotation.y = t * 0.08; }); }
  // 山坡上的石頭
  inst(world, new THREE.IcosahedronGeometry(1, 0), k.m('#3a4448', { flatShading: true }), Array.from({ length: mobile ? 14 : 28 }, (_, i) => { const a = hash(i) * TAU, r = 12 + hash(i + 40) * 20, x = Math.sin(a) * r, z = Math.cos(a) * r, s = 0.4 + hash(i + 80) * 1.1; return mat4(x, Ht(x, z) + s * 0.3, z, a, [s, s * 0.6, s]); }));
  // 星空：密密麻麻的星星、會閃的亮星、銀河、星座連線
  const sky = (az, el, r = 130) => [Math.sin(az) * Math.cos(el) * r, Math.sin(el) * r, Math.cos(az) * Math.cos(el) * r];
  const SN = mobile ? 700 : 1500, sp = new Float32Array(SN * 3), sc = new Float32Array(SN * 3), scol = ['#ffffff', '#cfe0ff', '#fff1d0', '#ffd8c8'].map((c) => C(c));
  for (let i = 0; i < SN; i++) { const el = Math.asin(k.rnd() * 1.35 - 0.4); sp.set(sky(k.rnd() * TAU, el), i * 3); const c = scol[i % 4]; sc.set([c.r, c.g, c.b], i * 3); }
  points(world, sp, { cols: sc, size: 1.1, fog: false });
  const BN = mobile ? 60 : 120, bpos = new Float32Array(BN * 3); for (let i = 0; i < BN; i++) bpos.set(sky(k.rnd() * TAU, Math.asin(k.rnd() * 1.3 - 0.35), 128), i * 3);
  const bright = points(world, bpos, { color: 0xfff6e0, size: 2.6, fog: false, add: true });
  k.anim.push((t) => { bright.material.opacity = 0.65 + Math.sin(t * 2.7) * 0.3; bright.material.size = 2.4 + Math.sin(t * 1.9) * 0.5; });
  const mw = canvas(512, 128, (g, W, H) => { let s = 4; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let i = 0; i < 220; i++) { const x = r() * W, y = H / 2 + (r() - 0.5) * H * 0.7 * r(), rr = 6 + r() * 22, gr = g.createRadialGradient(x, y, 0, x, y, rr); const c = ['180,160,255', '140,190,255', '255,210,230', '255,255,255'][i % 4]; gr.addColorStop(0, `rgba(${c},.16)`); gr.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); } g.fillStyle = '#ffffff'; for (let i = 0; i < 600; i++) { g.globalAlpha = r() * 0.8; g.fillRect(r() * W, H / 2 + (r() - 0.5) * H * 0.8 * r(), 1, 1); } });
  const band = new THREE.Mesh(new THREE.SphereGeometry(135, 48, 6, 0, TAU, Math.PI / 2 - 0.22, 0.44), new THREE.MeshBasicMaterial({ map: rep(mw, 3, 1), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide, fog: false }));
  band.rotation.set(0.35, 0.4, 1.05); world.add(band);
  const cons = [[[2.75, 0.1], [2.85, 0.16], [2.98, 0.17], [3.1, 0.13], [3.2, 0.22], [3.36, 0.24], [3.42, 0.14], [3.3, 0.1]], [[2.1, -0.05], [2.2, 0.06], [2.3, -0.02], [2.4, 0.08], [2.5, 0.0]], [[3.9, -0.06], [4.0, 0.08], [4.12, 0.02], [4.05, -0.1], [3.9, -0.06]], [[3.0, 0.42], [3.1, 0.5], [3.25, 0.47], [3.18, 0.36]]];
  const cl = [], cv = [];
  cons.forEach((c) => { c.forEach(([a, e], i) => { cv.push(...sky(a, e, 120)); if (i) cl.push(...sky(c[i - 1][0], c[i - 1][1], 120), ...sky(a, e, 120)); }); });
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(cl, 3)); world.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x9fc0ff, transparent: true, opacity: 0.5, fog: false })));
  points(world, new Float32Array(cv), { color: 0xfff1c0, size: 3.4, fog: false, add: true });
  // 行星：有環的大行星、紅色小行星、藍色小行星
  const bands = canvas(256, 128, (g) => { ['#e8d2a8', '#d4b484', '#f0dcb8', '#c89a6a', '#e8cfa0', '#b88a5a', '#ecd8b0', '#d6b088'].forEach((c, i) => { g.fillStyle = c; g.fillRect(0, i * 16, 256, 16); }); const gr = g.createLinearGradient(0, 0, 256, 0); gr.addColorStop(0, 'rgba(0,0,20,.55)'); gr.addColorStop(0.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,20,.55)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 128); });
  const planet = grp(-42, 7, -98); world.add(planet); const pm = new THREE.MeshBasicMaterial({ map: bands, fog: false }); planet.add(new THREE.Mesh(new THREE.SphereGeometry(8, 32, 20), pm));
  const rt = canvas(256, 256, (g) => { for (let r = 66; r < 128; r += 2) { g.strokeStyle = `rgba(${230 - (r % 9) * 6},${210 - (r % 7) * 8},${180 - (r % 5) * 10},${0.25 + ((r * 7) % 11) / 18})`; g.lineWidth = 2; g.beginPath(); g.arc(128, 128, r, 0, TAU); g.stroke(); } });
  const ring = new THREE.Mesh(new THREE.RingGeometry(10.5, 16.5, 72), new THREE.MeshBasicMaterial({ map: rt, transparent: true, side: THREE.DoubleSide, fog: false, depthWrite: false })); ring.rotation.set(Math.PI / 2 - 0.42, 0.25, 0); planet.add(ring);
  k.anim.push((t) => { planet.children[0].rotation.y = t * 0.05; });
  const ball = (x, y, z, r, a, b) => { const t = canvas(128, 64, (g) => { const gr = g.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, 0, 128, 64); g.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc((i * 37) % 128, (i * 23) % 64, 4 + (i % 3) * 3, 0, TAU); g.fill(); } }); const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), new THREE.MeshBasicMaterial({ map: t, fog: false })); m.position.set(x, y, z); world.add(m); return m; };
  const mars = ball(48, -4, -86, 3.6, '#e8734a', '#a8402a'), nep = ball(-62, -10, -34, 2.6, '#7fc8f0', '#3a6ad0');
  k.anim.push((t) => { mars.rotation.y = t * 0.1; nep.rotation.y = -t * 0.08; });
  // 極光（地平線上飄動的光幕）
  const aur = canvas(256, 128, (g, W, H) => { const gr = g.createLinearGradient(0, H, 0, 0); gr.addColorStop(0, 'rgba(60,255,160,0)'); gr.addColorStop(0.12, 'rgba(60,255,160,.9)'); gr.addColorStop(0.5, 'rgba(80,200,255,.45)'); gr.addColorStop(0.85, 'rgba(190,90,255,.25)'); gr.addColorStop(1, 'rgba(190,90,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(0,0,0,${0.2 + (i % 5) * 0.12})`; g.fillRect((i * 53) % W, 0, 3 + (i % 4) * 3, H); } });
  rep(aur, 2, 1);
  const curtains = [[2.2, 3.3, 98, -24, 18], [3.6, 4.6, 104, -26, 14]].map(([a0, a1, R, y0, y1], ci) => { const n = 48, g = new THREE.PlaneGeometry(1, 1, n, 1), p = g.attributes.position; for (let i = 0; i <= n; i++) for (let j = 0; j < 2; j++) { const idx = j * (n + 1) + i, a = a0 + (a1 - a0) * i / n; p.setXYZ(idx, Math.sin(a) * R, j === 0 ? y1 : y0, Math.cos(a) * R); } g.computeBoundingSphere();
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: aur, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); m.frustumCulled = false; world.add(m); return { m, a0, a1, R, n, ci }; });
  k.anim.push((t) => curtains.forEach(({ m, a0, a1, R, n, ci }) => { const p = m.geometry.attributes.position; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n, rr = R + Math.sin(i * 0.35 + t * 0.5 + ci) * 6; for (let j = 0; j < 2; j++) { const idx = j * (n + 1) + i; p.setX(idx, Math.sin(a) * rr); p.setZ(idx, Math.cos(a) * rr); } } p.needsUpdate = true; m.material.map.offset.x = t * 0.008 * (ci ? -1 : 1); m.material.opacity = 0.34 + Math.sin(t * 0.4 + ci) * 0.1; }));
  // 流星
  const mt = canvas(16, 128, (g) => { const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.15, 'rgba(200,225,255,.8)'); gr.addColorStop(1, 'rgba(160,200,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 16, 128); });
  const up = new THREE.Vector3(0, 1, 0), md = new THREE.Vector3();
  const meteors = [0, 1, 2].map((i) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.02, 14, 6, 1, true), new THREE.MeshBasicMaterial({ map: mt, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); m.frustumCulled = false; m.visible = false; world.add(m); return m; });
  k.anim.push((t) => meteors.forEach((m, i) => { const per = 4.5 + i * 1.7, c = Math.floor((t + i * 2.3) / per), u = ((t + i * 2.3) % per) / 1.1; if (u > 1) { m.visible = false; return; } m.visible = true;
    const az = 2.3 + hash(c * 3 + i) * 1.8 + (i === 2 ? 2.2 : 0), el = 0.15 + hash(c * 5 + i) * 0.4, s = sky(az, el, 110); md.set(Math.cos(az) * 0.6 + 0.2, -0.75, -Math.sin(az) * 0.6).normalize();
    m.position.set(s[0] + md.x * u * 40, s[1] + md.y * u * 40, s[2] + md.z * u * 40); m.quaternion.setFromUnitVectors(up, md.clone().negate()); m.material.opacity = Math.sin(u * Math.PI); }));
  // 山腰的雲海
  const cm = new THREE.MeshStandardMaterial({ color: C('#6a74b0'), transparent: true, opacity: 0.42, roughness: 1, depthWrite: false, flatShading: true }), clouds = [];
  for (let i = 0; i < (mobile ? 6 : 12); i++) { const a = i / 12 * TAU + 0.3, r = 30 + hash(i) * 14, g = grp(Math.sin(a) * r, -12 - hash(i + 3) * 6, Math.cos(a) * r); for (let j = 0; j < 3; j++) { const b = new THREE.Mesh(k.g('ocl', () => new THREE.IcosahedronGeometry(3, 1)), cm); b.position.set(j * 3.6 - 3.6, hash(i * 3 + j) * 1.5, 0); b.scale.set(1.3, 0.5, 1); g.add(b); } g.rotation.y = a; world.add(g); clouds.push([g, a, r]); }
  k.anim.push((t) => clouds.forEach(([g, a, r]) => { const b = a + t * 0.006; g.position.x = Math.sin(b) * r; g.position.z = Math.cos(b) * r; }));
  return { spots, features: ['旋轉圓頂天文台', '滿天星斗', '銀河', '土星環行星', '流星', '極光', '星座連線', '電波望遠鏡'], heroH: 6.6, fog: [48, 170] };
}

// ================= 薰衣草田 =================
function lavender({ k, world, pal, clear, layout, mobile }) {
  // 起伏的山丘（越往後越高）
  const Ht = (x, z) => { const r = Math.hypot(x, z), s = smooth((r - 10.5) / 10); let y = s * (1.5 + Math.sin(x * 0.085 + 0.6) * 1.1 + Math.cos(z * 0.07 - x * 0.03) * 0.9) + Math.max(0, -z - 16) * 0.12 * s; y *= 1 - 0.65 * smooth((z - 4) / 10); return Math.max(0, y); };
  terrain(k, world, 220, mobile ? 70 : 110, Ht, (x, z) => { const n = Math.sin(x * 0.3) * Math.cos(z * 0.27); return k.night ? (n > 0.3 ? '#3a4a2e' : '#33432a') : n > 0.3 ? '#a6b56a' : n < -0.4 ? '#8fa258' : '#9cae62'; }, { flat: false });
  ground(k, world, { color: null, core: '#ece3cf', edge: '#c9b48e', edgeH: 0.4 });
  const occ = [[0, -8.4, 4.6]];
  // 老風車（後方山丘上，帆布會轉）
  const wp = pickClear(clear, [[-17, -20], [17, -21], [-21, -12], [21, -13]], 2.6, 11) || [-24, -26];
  const wm = grp(wp[0], Ht(wp[0], wp[1]) - 0.2, wp[1]); wm.rotation.y = Math.atan2(-wp[0], 20 - wp[1]); world.add(wm); occ.push([wp[0], wp[1], 3]);
  const stoneT = (base) => canvas(256, 256, (g) => { g.fillStyle = '#c8b89a'; g.fillRect(0, 0, 256, 256); let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let j = 0; j < 12; j++) { let x = -10; while (x < 256) { const w = 18 + r() * 26; g.fillStyle = base[Math.floor(r() * base.length)]; g.beginPath(); g.ellipse(x + w / 2, j * 22 + 11, w / 2 - 2, 9, 0, 0, TAU); g.fill(); x += w; } } });
  const stones = ['#e2cfae', '#d8c3a0', '#cbb48e', '#e8d8b8', '#d4bc94'];
  add(k, wm, cyl(1.15, 1.7, 6.2, 14), new THREE.MeshStandardMaterial({ map: rep(stoneT(stones), 2, 2), roughness: 0.95 }), 0, 3.1, 0); add(k, wm, cone(1.45, 1.8, 14), '#6a5a4a', 0, 7.1, 0, { flatShading: true });
  add(k, wm, box(0.6, 1.1, 0.1), '#6b4a30', 0, 0.6, 1.62);
  const hub = grp(0, 5.8, 1.35); wm.add(hub); const sail = new THREE.MeshStandardMaterial({ map: canvas(64, 128, (g) => { g.fillStyle = '#f4ecd8'; g.fillRect(0, 0, 64, 128); g.strokeStyle = '#8a6a4a'; g.lineWidth = 3; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 16, 0); g.lineTo(i * 16, 128); g.stroke(); } for (let j = 0; j <= 8; j++) { g.beginPath(); g.moveTo(0, j * 16); g.lineTo(64, j * 16); g.stroke(); } }), side: THREE.DoubleSide, roughness: 0.9 });
  for (let i = 0; i < 4; i++) { const arm = grp(); arm.rotation.z = i * Math.PI / 2; hub.add(arm); add(k, arm, box(0.14, 4.4, 0.12), '#6b4a30', 0, 2.2, 0); add(k, arm, new THREE.PlaneGeometry(0.95, 3.4), sail, 0.55, 2.5, 0.02); }
  add(k, hub, cyl(0.2, 0.2, 0.4, 10).rotateX(Math.PI / 2), '#4a3a2a', 0, 0, 0);
  k.anim.push((t) => { hub.rotation.z = -t * 0.55; });
  // 蜂箱＋嗡嗡飛的蜜蜂
  const hp = pickClear(clear, [[12.8, -8.5], [-12.8, -8.5], [13.5, 4.5], [-13.5, 4.5]], 2.4, 1.6) || [14, -9];
  const hives = [], hc = [];
  for (let i = 0; i < 4; i++) { const x = hp[0] + (i - 1.5) * 1.3 * (hp[0] > 0 ? -0.3 : 0.3), z = hp[1] + (i - 1.5) * 1.2, y0 = Ht(x, z); for (let j = 0; j < 3; j++) { hives.push(mat4(x, y0 + 0.25 + j * 0.42, z, 0.2, [0.8, 0.4, 0.75])); hc.push(['#f4f1ea', '#a8d0e6', '#f6dd8a', '#c8e0b0'][(i + j) % 4]); } hives.push(mat4(x, y0 + 1.3, z, 0.2, [0.95, 0.1, 0.9])); hc.push('#8a6a4a'); }
  inst(world, box(1, 1, 1), k.m('#ffffff', { roughness: 0.8 }), hives, hc); occ.push([hp[0], hp[1], 2.4]);
  const BN = mobile ? 20 : 40, bp = new Float32Array(BN * 3); const bees = points(world, bp, { color: 0xffc81a, size: 0.13 });
  const hy = Ht(hp[0], hp[1]);
  k.anim.push((t) => { const p = bees.geometry.attributes.position; for (let i = 0; i < BN; i++) { const a = t * (1.2 + (i % 5) * 0.3) + i, r = 0.8 + (i % 7) * 0.35; p.setXYZ(i, hp[0] + Math.sin(a) * r + Math.sin(t * 3 + i) * 0.15, hy + 0.7 + (i % 4) * 0.35 + Math.sin(t * 5 + i * 2) * 0.2, hp[1] + Math.cos(a * 1.3) * r * 1.4); } p.needsUpdate = true; });
  // 絲柏樹（細長深綠，沿小路排成一列）
  const cyp = [];
  const cypAt = (x, z, s) => { if (!far(occ, x, z, 0.8) || !clear(x, z, 0.8, 6 * s + Ht(x, z))) return; cyp.push(mat4(x, Ht(x, z) + 2.6 * s, z, 0, [0.6 * s, 2.8 * s, 0.6 * s])); occ.push([x, z, 0.9]); };
  for (let i = 0; i < 8; i++) cypAt(-11.2 - i * 0.4, -12 - i * 3.6, 1 + (i % 3) * 0.12);
  for (let i = 0; i < 6; i++) cypAt(11.0 + i * 0.3, -11.5 - i * 3.8, 0.95 + (i % 2) * 0.15);
  ringOut(k, clear, mobile ? 4 : 8, 13, 30, 6, 0.8, (x, z) => { const n = cyp.length; cypAt(x, z, 0.9 + k.rnd() * 0.3); return cyp.length > n; }, { front: false });
  inst(world, k.g('lcyp', () => new THREE.SphereGeometry(1, 8, 8)), k.m(k.night ? '#1f3420' : '#2f4a2c', { flatShading: true, roughness: 0.9 }), cyp);
  // 一行行的薰衣草（InstancedMesh，會隨風擺動）
  const lav = [], lc = [], purples = k.night ? ['#5a4a8a', '#4e3f7a', '#64529a'] : ['#8a6bc8', '#9b7bd8', '#7a5ab8', '#a68ae0'];
  const step = mobile ? 0.9 : 0.66, rowGap = mobile ? 2.2 : 1.75;
  const put = (x, z) => { if (Math.hypot(x, z) < CORE + 1.3 || !far(occ, x, z, 0.5)) return; const y = Ht(x, z), s = 0.85 + hash(x * 3.1 + z) * 0.3; lav.push(mat4(x, y + 0.3 * s, z, hash(x + z * 7) * 3, [0.44 * s, 0.4 * s, 0.44 * s])); lc.push(purples[lav.length % purples.length]); };
  for (const s of [-1, 1]) for (let j = 0; j < (mobile ? 8 : 13); j++) { const x0 = s * (10.2 + j * rowGap); for (let z = -46; z < 24; z += step) put(x0 + Math.sin(z * 0.07 + j * 0.15) * 2.0, z); }
  for (let j = 0; j < (mobile ? 7 : 11); j++) { const x0 = -9 + j * (18 / ((mobile ? 7 : 11) - 1)); for (let z = -46; z < -12; z += step) put(x0 + Math.sin(z * 0.07) * 2.0, z); for (let z = 10; z < 24; z += step) put(x0 + Math.sin(z * 0.07) * 1.2, z); }
  const lavM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, flatShading: true }), uT = { value: 0 };
  lavM.onBeforeCompile = (sh) => { sh.uniforms.uT = uT; sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n#ifdef USE_INSTANCING\nfloat sw = sin(uT * 1.6 + instanceMatrix[3].x * 0.35 + instanceMatrix[3].z * 0.22);\ntransformed.x += sw * 0.28 * max(position.y + 0.3, 0.0);\n#endif'); };
  inst(world, k.g('lbush', () => new THREE.SphereGeometry(1, 7, 5)), lavM, lav, lc, false); k.anim.push((t) => { uT.value = t; });
  // 普羅旺斯石砌農舍（主建築）：暖色石牆、赤陶瓦、藍色百葉窗、紫藤
  const h = grp(HX, 0.12, HZ); world.add(h);
  const wallM = new THREE.MeshStandardMaterial({ map: rep(stoneT(stones), 2, 1.6), roughness: 0.95 }), capM = k.m('#d8c3a0');
  const tile = new THREE.MeshStandardMaterial({ map: rep(stripeTex('#c8683c', '#b0552e', 6, false), 1, 1.2), roughness: 0.8 });
  add(k, h, box(5.4, 4.0, 3.4), wallM, -0.6, 2.0, -0.2); add(k, h, gable(5.4, 3.4, 1.1, 0.3), [capM, tile], -0.6, 4.0, -0.2); add(k, h, box(6.1, 0.14, 0.24), '#a8482a', -0.6, 5.1, -0.2);
  add(k, h, box(1.5, 2.6, 2.8), wallM, 2.85, 1.3, -0.5); add(k, h, gable(1.5, 2.8, 0.7, 0.2), [capM, tile], 2.85, 2.6, -0.5);
  add(k, h, box(0.55, 1.2, 0.55), wallM, -2.4, 5.0, -0.8);
  const glassM = k.night ? k.glow('#ffd88a', 1.4) : k.m('#5a6a78', { roughness: 0.3 }), shut = k.m('#6f9ec4', { roughness: 0.6 });
  const wins = [[-2.4, 1.3], [1.3, 1.3], [-2.4, 3.2], [-0.6, 3.2], [1.2, 3.2]], wM = [], sM = [];
  for (const [x, y] of wins) { wM.push(mat4(x, y, 1.51, 0, [0.7, 0.95, 0.05])); for (const s of [-1, 1]) sM.push(mat4(x + s * 0.56, y, 1.62, s * 0.5, [0.38, 1.0, 0.05])); }
  inst(h, box(1, 1, 1), glassM, wM, null, false); inst(h, box(1, 1, 1), shut, sM);
  add(k, h, box(1.1, 2.0, 0.06), shut, 0, 1.0, 1.52); add(k, h, box(1.4, 0.18, 0.14), '#e8d8b8', 0, 2.1, 1.55);
  const sign = nameSign(k, 3.2, 0.5, '#f4ecd8', '#6a4a8a', '"Noto Serif TC", serif'); sign.position.set(-0.3, 2.45, 1.56); h.add(sign);
  inst(h, new THREE.IcosahedronGeometry(0.3, 0), k.m(k.night ? '#2f4a2c' : '#5a8a45', { flatShading: true }), Array.from({ length: 12 }, (_, i) => mat4(-3.2 + (i % 3) * 0.25, 0.6 + i * 0.32, 1.55, i, [1, 0.8, 0.5])));
  inst(h, k.g('lwis', () => { const g = new THREE.ConeGeometry(0.14, 0.5, 6); g.rotateX(Math.PI); return g; }), k.m('#b89ae8', { flatShading: true }), Array.from({ length: 8 }, (_, i) => mat4(-3.3 + i * 0.17, 3.0 - (i % 2) * 0.14 - i * 0.04, 1.6)));
  for (const x of [-1.0, 1.0]) { add(k, h, k.g('lpot', () => cyl(0.22, 0.16, 0.35, 10)), '#c0643a', x, 0.18, 1.85); add(k, h, k.g('lpotl', () => new THREE.IcosahedronGeometry(0.3, 0)), k.m('#9b7bd8', { flatShading: true }), x, 0.5, 1.85).scale.set(1, 0.8, 1); }
  world.add(bench(k, HX - 2.4, HZ + 2.2));
  // 肥皂泡泡（從門口飄上天）
  const bubM = [new THREE.MeshStandardMaterial({ color: C('#ffffff'), transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.1, emissive: C('#d8b8ff'), emissiveIntensity: 0.55, depthWrite: false }), new THREE.MeshStandardMaterial({ color: C('#ffffff'), transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.1, emissive: C('#a8eeff'), emissiveIntensity: 0.55, depthWrite: false })];
  const bubs = []; for (let i = 0; i < (mobile ? 12 : 24); i++) { const m = new THREE.Mesh(k.g('lbub', () => sph(1, 16, 12)), bubM[i % 2]); world.add(m); bubs.push({ m, ox: -2.8 + hash(i) * 5.6, oz: -5.6 + hash(i + 3) * 2.6, r: 0.08 + hash(i + 7) * 0.16, sp: 0.05 + hash(i + 9) * 0.05, ph: hash(i + 11), dx: (hash(i + 13) - 0.5) * 1.6, dz: 0.4 + hash(i + 15) * 0.9 }); }
  k.anim.push((t) => bubs.forEach((b) => { const u = (t * b.sp + b.ph) % 1; b.m.position.set(b.ox + Math.sin(u * 7 + b.ph * 6) * 0.8 + u * b.dx * 8, 0.9 + u * 9, b.oz + Math.cos(u * 5 + b.ph * 4) * 0.6 + u * b.dz * 8); b.m.scale.setScalar(b.r * Math.min(1, u * 8) * (u > 0.96 ? 0 : 1) * (1 + Math.sin(t * 6 + b.ph * 9) * 0.05)); }));
  // 腳踏車（籃子裡插滿薰衣草）
  const spots = [];
  const bk = layout.place(k.rnd, 0.8, 1.3);
  if (bk) { const b = bike(k, '#6f9ec4'); b.g.position.set(bk.x, 0.13, bk.z); b.g.rotation.set(0, Math.atan2(-bk.x, 0.9 - bk.z) + Math.PI / 2, 0.13); world.add(b.g); inst(b.g, k.g('lbund', () => cyl(0.03, 0.05, 0.5, 5)), k.m('#8a6bc8'), Array.from({ length: 7 }, (_, i) => mat4(-0.1 + (i % 3) * 0.1, 1.12, 0.52 + Math.floor(i / 3) * 0.08, 0, 1, (i - 3) * 0.08, (i % 3 - 1) * 0.15))); }
  // 蝴蝶
  const flies = []; for (let i = 0; i < (mobile ? 3 : 6); i++) { const g = grp(); const wmat = k.m(['#ffffff', '#ffd23a', '#ff9eb8', '#8fd3ff', '#ffffff', '#f2a03a'][i], { side: THREE.DoubleSide }); const wl = add(k, g, k.g('lbw', () => new THREE.PlaneGeometry(0.2, 0.16).translate(0.1, 0, 0)), wmat, 0, 0, 0, {}), wr = add(k, g, k.g('lbw', () => new THREE.PlaneGeometry(0.2, 0.16).translate(0.1, 0, 0)), wmat, 0, 0, 0, {}); wr.scale.x = -1; world.add(g); flies.push({ g, wl, wr, cx: (i % 2 ? 1 : -1) * (12 + i), cz: -2 - i * 2.5 }); }
  k.anim.push((t) => flies.forEach((f, i) => { const a = t * 0.5 + i * 2; const x = f.cx + Math.sin(a) * 2.5, z = f.cz + Math.cos(a * 1.3) * 2.2; f.g.position.set(x, Ht(x, z) + 1.0 + Math.sin(t * 2.3 + i) * 0.3, z); f.g.rotation.y = a; const fl = Math.sin(t * 14 + i) * 1.1; f.wl.rotation.y = fl; f.wr.rotation.y = -fl; }));
  // 田裡採花的人
  for (const [x, z] of [[-13.1, 2.2], [13.6, -1.4], [-4.6, 12.4]]) { if (!far(occ, x, z, 0.4)) continue; spots.push({ x, z, y: Ht(x, z) + 0.02, face: [x, z - 3], pose: 'crouch', hat: 'straw' }); }
  spots.push({ x: HX - 2.4, z: HZ + 2.25, y: 0.48, face: [HX - 2.4, HZ + 6], pose: 'sit' });
  return { spots, features: ['石砌農舍', '藍色百葉窗', '薰衣草花田', '肥皂泡泡', '蜂箱', '老風車', '絲柏樹'], heroH: 6.2, fog: [34, 130] };
}

// ================= 童話城堡 =================
function castle({ k, world, pal, clear, layout, mobile }) {
  const cob = rep(canvas(128, 128, (g) => { g.fillStyle = '#c8b8d4'; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 10; i++) for (let j = 0; j < 10; j++) { g.fillStyle = ['#e4d6ec', '#d8c8e2', '#efe4f2', '#dccbe6'][(i * 3 + j) % 4]; g.beginPath(); g.ellipse(i * 13 + (j % 2) * 6 + 6, j * 13 + 6, 5.6, 5, 0, 0, TAU); g.fill(); } }), 8, 8);
  ground(k, world, { color: k.night ? '#2a4a34' : '#79ad6c', coreTex: cob, edge: '#a898c0', edgeH: 0.35 });
  const P = pal.map((c) => hex(c)), dusk = k.night ? 2.0 : 1.2;
  const stoneT = rep(canvas(128, 128, (g) => { g.fillStyle = '#bfb2d4'; g.fillRect(0, 0, 128, 128); for (let j = 0; j < 8; j++) for (let i = 0; i <= 4; i++) { g.fillStyle = ['#efe8f6', '#e6def0', '#dcd2ea', '#f2ecf8'][(i + j * 2) % 4]; g.fillRect(i * 32 - (j % 2) * 16 + 1.5, j * 16 + 1.5, 29, 13); } }), 2, 2);
  const stone = new THREE.MeshStandardMaterial({ map: stoneT, roughness: 0.85 });
  const roofC = ['#5a63d8', '#7c5cd6', '#4a8ad8', '#d65a9a'];
  // 童話城堡（主建築）：護城河上的石台、城牆、四座圓塔、中央高塔、尖屋頂、旗子、燭光窗、吊橋
  const h = grp(HX, 0.12, HZ); world.add(h);
  const wt = flowTex(k, '#4fa8c8', 1, 1, [0.01, 0.015]);
  add(k, h, new THREE.PlaneGeometry(HW + 0.2, HD + 0.1).rotateX(-Math.PI / 2), waterMat(k, wt, '#4fa8c8'), 0, 0.012, 0, {}).castShadow = false;
  add(k, h, box(6.3, 0.5, 3.2), k.m('#a898c0', { roughness: 0.9 }), 0, 0.25, -0.45);
  add(k, h, box(5.0, 3.0, 2.3), stone, 0, 2.0, -0.6);
  const merl = [];
  for (let i = 0; i < 10; i++) merl.push(mat4(-2.25 + i * 0.5, 3.65, 0.5)); for (let i = 0; i < 4; i++) for (const s of [-1, 1]) merl.push(mat4(s * 2.45, 3.65, -1.5 + i * 0.6));
  for (let i = 0; i < 4; i++) merl.push(mat4(-0.9 + i * 0.6, 4.65, 1.15));
  inst(h, k.g('cmer', () => box(0.28, 0.32, 0.28)), stone, merl);
  add(k, h, box(2.2, 3.8, 0.9), stone, 0, 2.4, 0.75);
  const archS = new THREE.Shape(); archS.moveTo(-0.6, 0); archS.lineTo(0.6, 0); archS.lineTo(0.6, 1.2); archS.absarc(0, 1.2, 0.6, 0, Math.PI, false); archS.closePath();
  add(k, h, new THREE.ShapeGeometry(archS, 10), k.m('#2a1e30'), 0, 0.5, 1.21, {}).castShadow = false;
  add(k, h, new THREE.ShapeGeometry(archS, 10), lit('#ffc46b', k.night ? 0.9 : 0.35), 0, 0.5, 1.205, {}).scale.set(0.8, 0.85, 1);
  const db = add(k, h, box(1.3, 0.1, 1.2), '#8a5a3a', 0, 0.33, 1.8); db.rotation.x = 0.27;
  for (const x of [-0.6, 0.6]) { const ch = add(k, h, cyl(0.02, 0.02, 2.2, 4), '#4a4a52', x, 1.4, 1.75); ch.rotation.x = -0.45; }
  const sign = nameSign(k, 2.0, 0.42, '#5a3a8a', '#ffe7a8', '"Noto Serif TC", serif'); sign.position.set(0, 3.15, 1.22); h.add(sign);
  const flags = [], winP = [];
  const tower = (x, z, r, hh, rc, fc) => { add(k, h, cyl(r, r * 1.05, hh, 20), stone, x, 0.5 + hh / 2, z); add(k, h, cyl(r * 1.12, r * 1.12, 0.3, 20), stone, x, 0.5 + hh + 0.15, z);
    add(k, h, cone(r * 1.3, r * 2.8, 20), k.m(rc, { roughness: 0.5 }), x, 0.5 + hh + 0.3 + r * 1.4, z); add(k, h, new THREE.TorusGeometry(r * 1.12, 0.05, 6, 24), '#e8c25a', x, 0.5 + hh + 0.3, z).rotation.x = Math.PI / 2;
    const top = 0.5 + hh + 0.3 + r * 2.8; add(k, h, cyl(0.03, 0.03, 0.9, 5), '#e8c25a', x, top + 0.4, z);
    const fg = new THREE.PlaneGeometry(0.75, 0.42, 8, 1); fg.translate(0.375, 0, 0); const f = add(k, h, fg, k.m(fc, { side: THREE.DoubleSide, roughness: 0.7 }), x + 0.03, top + 0.6, z, {}); flags.push(f);
    for (const a of [-0.35, 0.35]) for (let j = 0; j < Math.floor(hh / 2); j++) winP.push(mat4(x + Math.sin(a) * r, 1.7 + j * 1.9, z + Math.cos(a) * r, a)); };
  tower(-2.75, 0.5, 0.75, 4.6, roofC[0], P[0]); tower(2.75, 0.5, 0.75, 4.6, roofC[1], P[1]); tower(-2.6, -1.75, 0.8, 5.2, roofC[2], P[2]); tower(2.6, -1.75, 0.8, 5.2, roofC[3], P[3]); tower(0, -1.0, 1.1, 6.0, roofC[1], P[0]);
  for (let j = 0; j < 2; j++) for (const x of [-1.6, -0.55, 0.55, 1.6]) if (Math.abs(x) > 1.2) winP.push(mat4(x, 1.6 + j * 1.2, 0.56, 0));
  const winM = lit('#ffc46b', dusk);
  inst(h, k.g('cwin', () => { const s = new THREE.Shape(); s.moveTo(-0.13, 0); s.lineTo(0.13, 0); s.lineTo(0.13, 0.32); s.absarc(0, 0.32, 0.13, 0, Math.PI, false); s.closePath(); const g = new THREE.ShapeGeometry(s, 6); g.translate(0, -0.25, 0.03); return g; }), winM, winP, null, false);
  k.anim.push((t) => { winM.emissiveIntensity = dusk + Math.sin(t * 7) * 0.12 + Math.sin(t * 11.3) * 0.08; flags.forEach((f, i) => { const p = f.geometry.attributes.position; for (let j = 0; j < p.count; j++) { const x = p.getX(j); p.setZ(j, Math.sin(x * 6 - t * 5 + i) * 0.1 * x); } p.needsUpdate = true; }); });
  for (const x of [-1.25, 1.25]) { add(k, h, cyl(0.05, 0.07, 0.5, 6), '#4a3a2a', x, 2.0, 1.28); add(k, h, k.g('ctf', () => cone(0.09, 0.28, 6)), lit('#ffa53a', 2.4), x, 2.38, 1.28, false); }
  if (k.night) { const l = new THREE.PointLight(0xffb060, 6, 10); l.position.set(0, 2.4, 2.6); h.add(l); }
  // 護城河（廣場後方外圈）＋天鵝
  const mt = flowTex(k, '#4fa8c8', 3, 0.5, [0.02, 0.005]);
  add(k, world, new THREE.RingGeometry(9.0, 11.2, 64, 1, Math.PI / 2 - 1.25, 2.5).rotateX(-Math.PI / 2), waterMat(k, mt, '#4fa8c8'), 0, 0.03, 0, {}).castShadow = false;
  const swans = [0, 1].map((i) => { const g = grp(); add(k, g, sph(0.3, 12, 8), '#ffffff', 0, 0.2, 0).scale.set(0.8, 0.6, 1.2); const n = add(k, g, cyl(0.05, 0.07, 0.55, 6), '#ffffff', 0, 0.48, 0.25); n.rotation.x = -0.3; add(k, g, sph(0.09, 8, 6), '#ffffff', 0, 0.75, 0.33); add(k, g, cone(0.035, 0.12, 5), '#f28c28', 0, 0.74, 0.44).rotation.x = Math.PI / 2; world.add(g); return g; });
  k.anim.push((t) => swans.forEach((g, i) => { const a = Math.PI + Math.sin(t * 0.05 + i * 2) * 0.95, r = 10.1; g.position.set(Math.sin(a) * r, 0.02 + Math.sin(t * 1.5 + i) * 0.02, Math.cos(a) * r); g.rotation.y = a + (Math.cos(t * 0.05 + i * 2) > 0 ? Math.PI / 2 : -Math.PI / 2); }));
  // 小溪＋火炬石橋（右側）
  const rv = new THREE.PlaneGeometry(2.8, 130, 1, 80); rv.rotateX(-Math.PI / 2); const rp = rv.attributes.position; for (let i = 0; i < rp.count; i++) rp.setX(i, rp.getX(i) + 13.6 + Math.sin(rp.getZ(i) / 8) * 1.8);
  add(k, world, rv, waterMat(k, flowTex(k, '#5ab8d8', 0.5, 20, [0, -0.06]), '#5ab8d8'), 0, 0.025, 0, {}).castShadow = false;
  const spots = [], bzs = [-1.5, -5.5, 2.5, -9.5, 6].find((z) => clear(13.6 + Math.sin(z / 8) * 1.8, z, 2.2, 2.4)), bz = bzs ?? 0, bx = 13.6 + Math.sin(bz / 8) * 1.8;
  if (bzs !== undefined) { const s = new THREE.Shape(); for (let i = 0; i <= 16; i++) { const x = -2.6 + i * 5.2 / 16; i ? s.lineTo(x, 0.25 + 1.0 * (1 - (x / 2.6) ** 2)) : s.moveTo(x, 0); } for (let i = 16; i >= 0; i--) { const x = -1.9 + i * 3.8 / 16; s.lineTo(x, 0.75 * (1 - (x / 1.9) ** 2)); } s.lineTo(-2.6, 0);
    const bg = new THREE.ExtrudeGeometry(s, { depth: 1.6, bevelEnabled: false }); bg.translate(0, 0, -0.8); const bm = add(k, world, bg, [stone, k.m('#d8cce6', { roughness: 0.9 })], bx, 0, bz); bm.rotation.y = 0;
    const torchM = lit('#ff9a2a', 2.6), torches = [];
    for (const [x, z] of [[-2.4, -0.7], [-2.4, 0.7], [2.4, -0.7], [2.4, 0.7]]) { add(k, world, k.g('ctp', () => cyl(0.06, 0.08, 1.4, 6)), '#4a3a2a', bx + x, 0.95, bz + z); add(k, world, k.g('ctb', () => cone(0.16, 0.22, 8).rotateX(Math.PI)), '#3a3036', bx + x, 1.72, bz + z); torches.push(add(k, world, k.g('ctfl', () => cone(0.12, 0.42, 7)), torchM, bx + x, 2.0, bz + z, {})); }
    if (k.night) { const l = new THREE.PointLight(0xff9a3a, 5, 8); l.position.set(bx, 2.3, bz); world.add(l); }
    k.anim.push((t) => torches.forEach((m, i) => { m.scale.set(1, 0.8 + Math.abs(Math.sin(t * 9 + i * 1.7)) * 0.45, 1); m.rotation.y = t * 2 + i; }));
    spots.push({ x: bx, z: bz + 0.2, y: 1.3, face: [bx, bz + 5], pose: 'stand' }); }
  // 南瓜馬車
  const cp = pickClear(clear, [[-10.6, 6.2], [10.2, 6.6], [-11.2, 1.0], [-11.4, -4]], 1.6, 2.6);
  if (cp) { const g = grp(cp[0], 0.02, cp[1]); g.rotation.y = Math.atan2(-cp[0], 20 - cp[1]) + Math.PI / 2; world.add(g);
    add(k, g, k.g('cpump', () => { const q = sph(1, 20, 14); q.scale(1.15, 0.92, 1.0); return q; }), new THREE.MeshStandardMaterial({ map: rep(stripeTex('#f28c28', '#e0731a', 12, true), 1, 1), roughness: 0.5 }), 0, 1.35, 0);
    add(k, g, cyl(0.08, 0.12, 0.4, 6), '#4f8a3a', 0, 2.35, 0); add(k, g, new THREE.TorusGeometry(0.42, 0.04, 6, 20), '#e8c25a', 0, 1.35, 1.0); add(k, g, new THREE.CircleGeometry(0.38, 20), k.night ? lit('#ffd88a', 1.2) : k.m('#bfe4ff', { roughness: 0.1 }), 0, 1.35, 1.0, {});
    for (const [x, z] of [[-0.85, 0.75], [0.85, 0.75], [-0.85, -0.75], [0.85, -0.75]]) { const w = add(k, g, k.g('cwh', () => new THREE.TorusGeometry(0.42, 0.06, 6, 18)), '#e8c25a', x, 0.45, z); w.rotation.y = Math.PI / 2; add(k, g, k.g('cwhs', () => cyl(0.03, 0.03, 0.8, 4)), '#e8c25a', x, 0.45, z).rotation.x = Math.PI / 2; }
    add(k, g, box(0.5, 0.1, 1.6), '#e8c25a', -1.25, 0.9, 0).rotation.z = 0.3; }
  // 漂浮蠟燭（InstancedMesh，上下飄）
  const CN = mobile ? 16 : 30, cands = [];
  for (let i = 0; i < CN * 4 && cands.length < CN; i++) { const a = hash(i) * TAU, r = 3 + hash(i + 50) * 9, x = Math.sin(a) * r, z = Math.cos(a) * r - 2, y = 5.2 + hash(i + 90) * 3.8; if (z > 5 && Math.abs(x) < 7) continue; if (!clear(x, z, 0.3, y + 0.5)) continue; cands.push({ x, y, z, ph: hash(i + 130) * 6, s: 0.6 + hash(i + 170) * 0.35 }); }
  const cb = inst(world, k.g('ccan', () => cyl(0.07, 0.07, 0.42, 8)), k.m('#fbf3e4', { roughness: 0.6 }), cands.map((c) => mat4(c.x, c.y, c.z)), null, false), cf = inst(world, k.g('ccf', () => sph(0.06, 6, 5).scale(1, 1.8, 1)), lit('#ffcf5a', 2.6), cands.map((c) => mat4(c.x, c.y + 0.3, c.z)), null, false);
  cb.frustumCulled = cf.frustumCulled = false;
  k.anim.push((t) => { cands.forEach((c, i) => { const y = c.y + Math.sin(t * 0.9 + c.ph) * 0.3; cb.setMatrixAt(i, mat4(c.x, y, c.z, 0, c.s)); cf.setMatrixAt(i, mat4(c.x, y + 0.3 * c.s, c.z, 0, [c.s, c.s * (0.85 + Math.sin(t * 11 + c.ph) * 0.2), c.s])); }); cb.instanceMatrix.needsUpdate = cf.instanceMatrix.needsUpdate = true; });
  // 天燈（慢慢升空）
  const LN = mobile ? 8 : 14, lan = inst(world, k.g('clan', () => cyl(0.22, 0.17, 0.45, 8)), lit('#ffa04a', 1.5), Array.from({ length: LN }, () => mat4(0, -10, 0)), null, false); lan.frustumCulled = false;
  k.anim.push((t) => { for (let i = 0; i < LN; i++) { const u = (t * 0.02 + hash(i)) % 1, a = hash(i + 20) * TAU + u * 0.6, r = 13 + hash(i + 40) * 16; lan.setMatrixAt(i, mat4(Math.sin(a) * r, 1.5 + u * 30, Math.cos(a) * r - 6, 0, 1 + u)); } lan.instanceMatrix.needsUpdate = true; });
  // 螢火蟲
  const FN = mobile ? 50 : 110, fp = new Float32Array(FN * 3); for (let i = 0; i < FN; i++) fp.set([(k.rnd() - 0.5) * 34, 0.4 + k.rnd() * 3, (k.rnd() - 0.5) * 30 - 2], i * 3);
  const ff = points(world, fp, { color: 0xeaff7a, size: k.night ? 0.24 : 0.14, add: true });
  k.anim.push((t) => { ff.material.opacity = 0.6 + Math.sin(t * 2.6) * 0.35; ff.rotation.y = Math.sin(t * 0.05) * 0.3; });
  // 粉彩童話樹、草丘、半木造小屋、遠方山上的另一座城堡
  ringOut(k, clear, mobile ? 6 : 12, 9.8, 26, 4, 1.4, (x, z) => { if (x > 11 && x < 16) return null; world.add(bigTree(k, x, z, 0.8 + k.rnd() * 0.6, k.pick(k.night ? ['#3a6a44', '#6a4a7a', '#4a5a8a'] : ['#7cc576', '#f4a9c8', '#b7a0e8', '#8fd0a0', '#ffc8a0']))); return 1; });
  const hillM = k.m(k.night ? '#2a4a34' : '#86b86f', { roughness: 1 });
  for (const [x, z, r] of [[-30, -34, 16], [32, -40, 18], [-8, -52, 20], [52, -14, 14], [-52, -8, 14]]) add(k, world, sph(r, 24, 12), hillM, x, -r * 0.55, z).castShadow = false;
  const timber = canvas(128, 128, (g) => { g.fillStyle = '#f6efe2'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#7a4a3a'; g.fillRect(0, 0, 128, 8); g.fillRect(0, 120, 128, 8); g.fillRect(0, 0, 8, 128); g.fillRect(120, 0, 8, 128); g.fillRect(60, 0, 8, 128); g.save(); g.translate(64, 64); g.rotate(0.7); g.fillRect(-4, -80, 8, 160); g.restore(); g.fillStyle = k.night ? '#ffd88a' : '#7fa8c8'; g.fillRect(20, 40, 28, 28); g.fillRect(80, 40, 28, 28); });
  const tmM = k.night ? texLit(timber, 0.4) : new THREE.MeshStandardMaterial({ map: timber, roughness: 0.9 });
  let cn = 0; ringOut(k, clear, mobile ? 3 : 6, 12, 22, 4, 1.6, (x, z) => { if (x > 11 && x < 16.5) return null; const g = grp(x, 0, z); g.rotation.y = Math.atan2(-x, -z); world.add(g); add(k, g, box(2.0, 1.8, 1.8), tmM, 0, 0.9, 0); add(k, g, gable(2.0, 1.8, 1.6, 0.2), [k.m('#f6efe2'), k.m(['#8a4a6a', '#5a63d8', '#c25a4a'][cn++ % 3], { flatShading: true })], 0, 1.8, 0); return 1; }, { front: false });
  const fc = grp(26, 0, -56); world.add(fc); add(k, fc, sph(12, 20, 10), hillM, 0, -5, 0).castShadow = false; const sil = k.m(k.night ? '#3a3462' : '#8a7cc0');
  for (const [x, hh, r] of [[-3, 9, 1.2], [0, 13, 1.6], [3, 10, 1.2]]) { add(k, fc, cyl(r, r, hh, 12), sil, x, 5 + hh / 2, 0).castShadow = false; add(k, fc, cone(r * 1.35, r * 3, 12), k.m(k.night ? '#2a2452' : '#6a5ab0'), x, 5 + hh + r * 1.5, 0).castShadow = false; }
  add(k, fc, box(7, 5, 2.4), sil, 0, 6.5, 0).castShadow = false;
  return { spots, features: ['童話城堡', '尖塔旗幟', '護城河吊橋', '漂浮蠟燭', '天燈', '火炬石橋', '南瓜馬車'], heroH: 9.8 };
}

export const WORLDS_D = {
  juancun: { id: 'juancun', kind: 'world', name: '眷村巷弄', sky: { top: '#8fc1e3', bot: '#f8ecd4' }, build: juancun },
  yokocho: { id: 'yokocho', kind: 'world', name: '日式橫丁', night: true, sky: { top: '#0b0e26', bot: '#3b2340' }, build: yokocho },
  retro: { id: 'retro', kind: 'world', name: '復古美式街', sky: { top: '#3fa2e0', bot: '#ffd9a8' }, hat: 'cap', cloud: '#fff6ea', build: retro },
  paper: { id: 'paper', kind: 'world', name: '紙藝文具世界', sky: { top: '#9fd3f2', bot: '#fff8ea' }, build: paper },
  camp: { id: 'camp', kind: 'world', name: '湖畔露營地', sky: { top: '#5fa8dc', bot: '#eef6f2' }, hat: 'beanie', build: camp },
  observatory: { id: 'observatory', kind: 'world', name: '天文台星空', night: true, hat: 'beanie', sky: { top: '#03061a', bot: '#1d1f52' }, build: observatory },
  lavender: { id: 'lavender', kind: 'world', name: '薰衣草田', sky: { top: '#7bb2e8', bot: '#fbe8d6' }, hat: 'straw', build: lavender },
  castle: { id: 'castle', kind: 'world', name: '童話城堡', sky: { top: '#3b2a6e', bot: '#f6a9b8' }, cloud: '#f9c9e0', build: castle },
};
