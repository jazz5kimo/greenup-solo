// 銷售網頁 3D 開場：更多場景（雪國木屋、禪風庭園、霓虹電子街、港口漁村、寵物公園、月夜燈會、文青書街、歡樂遊樂園、沙漠綠洲）。
// 與 island-scenes.js 共用空地規劃與小工具；由 island.js 以 registerScenes 加入場景清單。
import * as THREE from 'three';
import { tree, plantTrees, bushes, lamp, bench, faceTo, house, cabin } from './island-scenes.js';

const TAU = Math.PI * 2;
const C = (c) => new THREE.Color(c);
const hex = (c) => '#' + C(c).getHexString();
const add = (k, g, geo, color, x = 0, y = 0, z = 0, o = {}) => { const m = k.mesh(geo, Array.isArray(color) || (color && color.isMaterial) ? color : k.m(color, o), x, y, z); g.add(m); return m; };
const grp = (x, z, y = 0.13) => { const g = new THREE.Group(); g.position.set(x, y, z); return g; };
// 大型造景：先找步道內的空地，放不下就縮小一點、再找步道外
const big = (k, L, rad, h = 0, o = {}) => L.place(k.rnd, rad, h, o) || L.place(k.rnd, rad * 0.8, h, o) || L.place(k.rnd, rad * 0.8, h, { ...o, zone: 'any' }) || L.spot(k.rnd, { rad: rad * 0.75, h, tries: 160 });
// 在空地放一個東西（找不到就略過）
const put = (k, L, world, opts, make) => { const p = L.spot(k.rnd, opts); if (!p) return null; const g = make(p); if (g) world.add(g); return p; };

// ---------- 雪國木屋 ----------
function snow(k, L, world, pal) {
  const spots = [];
  const capM = k.m('#ffffff', { roughness: 0.9 });
  // 積雪的松樹
  for (let i = 0; i < (k.mobile ? 8 : 15); i++) put(k, L, world, { rad: 0.42, h: 2.1 }, (p) => { const t = tree(k, p.x, p.z, 'pine', 0.8 + k.rnd() * 0.45, k.night ? '#2e5a45' : '#3d7a5a'); [[0.5, 0.95], [0.38, 1.4], [0.24, 1.85]].forEach(([r, y]) => add(k, t, k.g('snowcap' + r, () => new THREE.ConeGeometry(r, 0.25, 7)), capM, 0, y, 0)); return t; });
  // 木屋（屋頂積雪）
  const cp = big(k, L, 0.75, 1.5);
  if (cp) { const c = faceTo(cabin(k, cp.x, cp.z)); add(k, c, new THREE.BoxGeometry(1.3, 0.08, 1.2), capM, 0, 1.33, 0).rotation.z = 0; world.add(c); }
  // 溜冰池＋溜冰的人
  const ip = big(k, L, 0.95, 0, { away: cp });
  if (ip) { const g = grp(ip.x, ip.z); add(k, g, new THREE.CylinderGeometry(0.9, 0.9, 0.04, 32), '#cfeefc', 0, 0.02, 0, { roughness: 0.05, metalness: 0.2 }); world.add(g);
    spots.push({ x: ip.x + 0.4, z: ip.z, face: [ip.x, ip.z + 1], pose: 'stand', hat: 'beanie', skate: { cx: ip.x, cz: ip.z, r: 0.5 } }); }
  // 雪人
  for (let i = 0; i < 2; i++) put(k, L, world, { rad: 0.3 }, (p) => { const g = grp(p.x, p.z); add(k, g, new THREE.SphereGeometry(0.28, 14, 10), capM, 0, 0.26, 0); add(k, g, new THREE.SphereGeometry(0.2, 14, 10), capM, 0, 0.66, 0); add(k, g, new THREE.SphereGeometry(0.14, 12, 8), capM, 0, 0.96, 0);
    add(k, g, new THREE.ConeGeometry(0.03, 0.14, 6), '#f28c28', 0, 0.96, 0.15).rotation.x = Math.PI / 2; add(k, g, new THREE.CylinderGeometry(0.1, 0.12, 0.14, 12), hex(pal[0]), 0, 1.13, 0); add(k, g, new THREE.TorusGeometry(0.15, 0.035, 6, 16), hex(pal[2]), 0, 0.8, 0).rotation.x = Math.PI / 2; return faceTo(g, 0, 8); });
  // 雪橇
  put(k, L, world, { rad: 0.35 }, (p) => { const g = grp(p.x, p.z); add(k, g, new THREE.BoxGeometry(0.4, 0.06, 0.8), '#c0392b', 0, 0.16, 0); for (const x of [-0.17, 0.17]) add(k, g, new THREE.BoxGeometry(0.03, 0.03, 0.9), '#555b60', x, 0.04, 0.02); g.rotation.y = k.rnd() * 3; return g; });
  // 飄雪
  const N = k.mobile ? 160 : 320, a = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { a[i * 3] = (k.rnd() - 0.5) * 22; a[i * 3 + 1] = k.rnd() * 10; a[i * 3 + 2] = (k.rnd() - 0.5) * 22; }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(a, 3));
  const flakes = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.09, transparent: true, opacity: 0.9, depthWrite: false })); world.add(flakes);
  let last = 0; k.anim.push((t) => { const dt = Math.min(0.05, t - last); last = t; const p = geo.attributes.position; for (let i = 0; i < N; i++) { let y = p.getY(i) - dt * 0.8; if (y < 0) y = 10; p.setY(i, y); p.setX(i, p.getX(i) + Math.sin(t + i) * 0.003); } p.needsUpdate = true; });
  bushes(k, L, world, k.mobile ? 4 : 8, ['#ffffff', '#e8f1f7']);
  return { spots };
}

// ---------- 禪風庭園 ----------
function zen(k, L, world, pal) {
  const spots = [];
  // 枯山水：耙紋白砂＋三顆石
  const gp = big(k, L, 1.0, 0.6);
  if (gp) { const g = grp(gp.x, gp.z); faceTo(g);
    const rk = k.tex(128, 128, (c) => { c.fillStyle = '#ece6d6'; c.fillRect(0, 0, 128, 128); c.strokeStyle = 'rgba(150,140,120,.55)'; c.lineWidth = 2; for (let i = 0; i < 16; i++) { c.beginPath(); for (let x = 0; x <= 128; x += 4) c.lineTo(x, i * 8 + 4 + Math.sin(x * 0.08) * 2); c.stroke(); } });
    add(k, g, new THREE.BoxGeometry(1.6, 0.05, 1.3), [k.m('#b9b0a3'), k.m('#b9b0a3'), new THREE.MeshStandardMaterial({ map: rk, roughness: 1 }), k.m('#b9b0a3'), k.m('#b9b0a3'), k.m('#b9b0a3')], 0, 0.025, 0);
    [[-0.4, -0.2, 0.22], [0.35, 0.25, 0.16], [0.1, -0.35, 0.12]].forEach(([x, z, r]) => { const s = add(k, g, new THREE.DodecahedronGeometry(r, 0), '#6b6a66', x, r * 0.6, z, { flatShading: true }); s.scale.y = 0.75; });
    world.add(g); }
  // 錦鯉池＋紅色拱橋
  const pp = big(k, L, 0.95, 0.8, { away: gp });
  if (pp) { const g = grp(pp.x, pp.z); faceTo(g); add(k, g, new THREE.CylinderGeometry(0.9, 0.9, 0.03, 32), '#2f6f78', 0, 0.02, 0, { roughness: 0.1 });
    const br = add(k, g, new THREE.TorusGeometry(0.75, 0.05, 6, 20, Math.PI), '#c0392b', 0, 0, 0); br.rotation.y = Math.PI / 2; add(k, g, new THREE.BoxGeometry(0.35, 0.04, 1.5), '#c0392b', 0, 0.5, 0).scale.set(1, 1, 0.5);
    const koi = []; for (let i = 0; i < 4; i++) { const f = add(k, g, new THREE.SphereGeometry(0.07, 10, 6), i % 2 ? '#f28c28' : '#ffffff', 0, 0.04, 0, false); f.scale.set(0.6, 0.4, 1.6); koi.push(f); }
    k.anim.push((t) => koi.forEach((f, i) => { const a = t * (0.4 + i * 0.07) + i * 1.6, r = 0.35 + (i % 2) * 0.25; f.position.set(Math.sin(a) * r, 0.04, Math.cos(a) * r); f.rotation.y = a + Math.PI / 2; }));
    world.add(g); }
  // 石燈籠
  for (let i = 0; i < (k.mobile ? 3 : 5); i++) put(k, L, world, { rad: 0.2, h: 1.1 }, (p) => { const g = grp(p.x, p.z); const st = k.m('#9a958c', { flatShading: true });
    add(k, g, new THREE.CylinderGeometry(0.2, 0.24, 0.12, 6), st, 0, 0.06, 0); add(k, g, new THREE.CylinderGeometry(0.07, 0.07, 0.45, 6), st, 0, 0.34, 0); add(k, g, new THREE.BoxGeometry(0.3, 0.25, 0.3), k.night ? k.glow('#ffd88a', 1.4) : st, 0, 0.68, 0);
    add(k, g, new THREE.ConeGeometry(0.3, 0.2, 4), st, 0, 0.91, 0).rotation.y = Math.PI / 4; return g; });
  // 竹林
  for (let i = 0; i < (k.mobile ? 3 : 6); i++) put(k, L, world, { rad: 0.3, h: 2.2 }, (p) => { const g = grp(p.x, p.z); for (let j = 0; j < 5; j++) { const h = 1.6 + k.rnd() * 0.8; const b = add(k, g, k.g('bamboo' + Math.round(h * 10), () => new THREE.CylinderGeometry(0.035, 0.04, h, 6)), k.night ? '#3d6b3a' : '#7cb342', (k.rnd() - 0.5) * 0.4, h / 2, (k.rnd() - 0.5) * 0.4); b.rotation.z = (k.rnd() - 0.5) * 0.1;
    add(k, g, new THREE.ConeGeometry(0.12, 0.35, 4), '#5a9a3a', b.position.x, h, b.position.z).rotation.z = 0.8; } const ph = k.rnd() * 6; k.anim.push((t) => { g.rotation.z = Math.sin(t * 0.9 + ph) * 0.03; }); return g; });
  plantTrees(k, L, world, k.mobile ? 4 : 7, ['blossom'], { leaf: k.night ? '#8a3a2a' : '#d9532c' });
  plantTrees(k, L, world, k.mobile ? 3 : 5, ['pine', 'round']);
  bushes(k, L, world, k.mobile ? 6 : 12, ['#4f8f45', '#3d7a3a', '#6aa24d']);
  return { spots };
}

// ---------- 霓虹電子街（永遠是夜晚） ----------
function neon(k, L, world, pal) {
  const spots = [];
  const neonCs = ['#ff3ea5', '#2de2e6', '#f6f740', '#8a5cff', '#3cff7a', hex(pal[0])];
  const sign = (text, c) => k.tex(256, 96, (g, w, h) => { g.fillStyle = '#0b0d14'; g.fillRect(0, 0, w, h); g.strokeStyle = c; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12); g.shadowColor = c; g.shadowBlur = 18; g.fillStyle = c; g.font = '800 54px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 3); });
  const words = ['OPEN', '24H', 'SALE', '★', '♪', 'NEW', '⚡', 'FIX'];
  // 小店面＋霓虹招牌
  for (let i = 0; i < (k.mobile ? 3 : 5); i++) {
    const p = (i < 2 ? big(k, L, 0.7, 1.8) : null) || L.spot(k.rnd, { rad: 0.7, h: 1.8 }); if (!p) continue;
    const g = grp(p.x, p.z); faceTo(g);
    add(k, g, new THREE.BoxGeometry(1.1, 1.3, 0.9), '#1d2130', 0, 0.65, 0, { roughness: 0.6 });
    const c = neonCs[i % neonCs.length];
    add(k, g, new THREE.BoxGeometry(1.14, 0.06, 0.94), k.glow(c, 2.6), 0, 1.3, 0, false);
    const s = add(k, g, new THREE.PlaneGeometry(0.9, 0.34), new THREE.MeshBasicMaterial({ map: sign(words[i % words.length], c), toneMapped: false }), 0, 1.0, 0.46, false);
    add(k, g, new THREE.BoxGeometry(0.8, 0.45, 0.02), k.glow('#bfe8ff', 1.2), 0, 0.4, 0.46, false);
    const ph = i * 1.3; k.anim.push((t) => { s.material.opacity = 1; s.visible = Math.sin(t * 3 + ph) > -0.92; });
    world.add(g);
  }
  // 自動販賣機
  for (let i = 0; i < 2; i++) put(k, L, world, { rad: 0.3, h: 1.2 }, (p) => { const g = grp(p.x, p.z); faceTo(g); add(k, g, new THREE.BoxGeometry(0.5, 1.1, 0.4), hex(pal[i % 6]), 0, 0.55, 0); add(k, g, new THREE.BoxGeometry(0.4, 0.6, 0.02), k.glow('#e8fbff', 1.6), 0, 0.7, 0.21, false); return g; });
  // 漂浮的全息方塊
  for (let i = 0; i < (k.mobile ? 3 : 6); i++) put(k, L, world, { rad: 0.25 }, (p) => { const g = grp(p.x, p.z); const c = neonCs[(i + 2) % neonCs.length];
    const cube = add(k, g, new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshStandardMaterial({ color: C(c), emissive: C(c), emissiveIntensity: 1.8, transparent: true, opacity: 0.6, wireframe: i % 2 === 0 }), 0, 1.2, 0, false);
    add(k, g, new THREE.CylinderGeometry(0.15, 0.2, 0.08, 12), '#2a2f3a', 0, 0.04, 0); const ph = k.rnd() * 6; k.anim.push((t) => { cube.rotation.set(t, t * 1.3, 0); cube.position.y = 1.1 + Math.sin(t * 1.5 + ph) * 0.15; }); return g; });
  for (let i = 0; i < (k.mobile ? 4 : 8); i++) put(k, L, world, { rad: 0.18, h: 1.6 }, (p) => lamp(k, p.x, p.z, neonCs[i % neonCs.length]));
  return { spots };
}

// ---------- 港口漁村 ----------
function harbor(k, L, world, pal) {
  const spots = [];
  // 燈塔（紅白相間、夜裡光束旋轉）
  const lp = L.spot(k.rnd, { zone: 'outer', rad: 0.5, h: 3.2 }) || big(k, L, 0.5, 3.2);
  if (lp) { const g = grp(lp.x, lp.z); const st = k.stripes('#c0392b', '#ffffff', 6, false);
    add(k, g, new THREE.CylinderGeometry(0.28, 0.42, 2.4, 16), new THREE.MeshStandardMaterial({ map: st, roughness: 0.6 }), 0, 1.2, 0);
    add(k, g, new THREE.CylinderGeometry(0.3, 0.3, 0.35, 12), k.glow('#fff4c4', 2.4), 0, 2.58, 0, false); add(k, g, new THREE.ConeGeometry(0.36, 0.35, 12), '#2b2f33', 0, 2.92, 0);
    if (k.night) { const beam = add(k, g, new THREE.ConeGeometry(0.5, 4, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff4c4, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }), 0, 2.58, 0, false); beam.geometry.translate(0, -2, 0); beam.rotation.z = Math.PI / 2; const piv = new THREE.Group(); piv.position.y = 2.58; g.add(piv); g.remove(beam); beam.position.set(0, 0, 0); piv.add(beam); k.anim.push((t) => { piv.rotation.y = t * 0.8; }); }
    world.add(g); }
  // 倉庫
  for (let i = 0; i < (k.mobile ? 1 : 2); i++) { const p = big(k, L, 0.75, 1.5); if (!p) continue; world.add(faceTo(house(k, p.x, p.z, ['#5d7b8a', '#8a5d4a'][i], '#3a3f44'))); }
  // 漁網曬架、木箱、救生圈
  for (let i = 0; i < 2; i++) put(k, L, world, { rad: 0.55, h: 1.1 }, (p) => { const g = grp(p.x, p.z); faceTo(g); for (const x of [-0.5, 0.5]) add(k, g, new THREE.CylinderGeometry(0.03, 0.03, 1.0, 6), '#8a5a3a', x, 0.5, 0);
    const net = k.tex(64, 64, (c) => { c.clearRect(0, 0, 64, 64); c.strokeStyle = '#c9b48a'; c.lineWidth = 2; for (let j = 0; j < 64; j += 8) { c.beginPath(); c.moveTo(j, 0); c.lineTo(j, 64); c.stroke(); c.beginPath(); c.moveTo(0, j); c.lineTo(64, j); c.stroke(); } });
    add(k, g, new THREE.PlaneGeometry(1.0, 0.7), new THREE.MeshStandardMaterial({ map: net, transparent: true, side: THREE.DoubleSide }), 0, 0.6, 0, false); return g; });
  for (let i = 0; i < 4; i++) put(k, L, world, { rad: 0.22 }, (p) => { const g = grp(p.x, p.z); add(k, g, new THREE.BoxGeometry(0.35, 0.28, 0.3), '#a8754a', 0, 0.14, 0); if (i % 2) add(k, g, new THREE.TorusGeometry(0.14, 0.05, 8, 16), '#e8453c', 0, 0.36, 0).rotation.x = Math.PI / 2; g.rotation.y = k.rnd() * 3; return g; });
  // 停泊的小漁船（海上，跟著浪起伏）
  for (let i = 0; i < (k.mobile ? 1 : 2); i++) { const th = L.pier.th + (i ? 0.45 : -0.45), r = L.shore(th) + 1.6; const g = grp(Math.sin(th) * r, Math.cos(th) * r, -0.5); g.rotation.y = th + Math.PI / 2;
    add(k, g, new THREE.BoxGeometry(0.6, 0.3, 1.4), ['#2e86de', '#e8e8e8'][i], 0, 0.1, 0); add(k, g, new THREE.BoxGeometry(0.45, 0.35, 0.45), '#ffffff', 0, 0.4, -0.2); add(k, g, new THREE.CylinderGeometry(0.02, 0.02, 0.9, 6), '#555', 0, 0.75, 0.3);
    world.add(g); const ph = i * 2; k.anim.push((t) => { g.position.y = -0.5 + Math.sin(t * 1.3 + ph) * 0.06; g.rotation.z = Math.sin(t * 1.1 + ph) * 0.06; }); }
  plantTrees(k, L, world, k.mobile ? 4 : 7, ['round', 'palm']);
  bushes(k, L, world, k.mobile ? 5 : 10, ['#4fae5b', '#6cc163']);
  return { spots };
}

// ---------- 寵物公園 ----------
function park(k, L, world, pal) {
  const spots = [];
  // 敏捷訓練：跨欄、隧道、斜坡
  const ap = big(k, L, 1.0, 0.8);
  if (ap) { const g = grp(ap.x, ap.z); faceTo(g);
    for (let i = 0; i < 3; i++) { const z = -0.6 + i * 0.6; for (const x of [-0.35, 0.35]) add(k, g, new THREE.CylinderGeometry(0.025, 0.025, 0.5, 6), '#ffffff', x, 0.25, z); add(k, g, new THREE.CylinderGeometry(0.02, 0.02, 0.7, 6), ['#e74c3c', '#f2c94c', '#3498db'][i], 0, 0.3, z).rotation.z = Math.PI / 2; }
    const tn = add(k, g, new THREE.CylinderGeometry(0.25, 0.25, 0.9, 16, 1, true), hex(pal[0]), 0.75, 0.25, 0, { side: THREE.DoubleSide }); tn.rotation.x = Math.PI / 2;
    world.add(g); }
  // 狗屋
  for (let i = 0; i < 2; i++) put(k, L, world, { rad: 0.4, h: 0.9 }, (p) => { const g = grp(p.x, p.z); faceTo(g); add(k, g, new THREE.BoxGeometry(0.55, 0.45, 0.6), ['#c0392b', '#2e86de'][i], 0, 0.22, 0);
    const r = new THREE.Shape(); r.moveTo(-0.34, 0); r.lineTo(0.34, 0); r.lineTo(0, 0.3); const geo = new THREE.ExtrudeGeometry(r, { depth: 0.7, bevelEnabled: false }); geo.translate(0, 0, -0.35); add(k, g, geo, '#5a4a44', 0, 0.45, 0);
    add(k, g, new THREE.CircleGeometry(0.13, 16), '#1c1c1c', 0, 0.2, 0.301); return g; });
  // 球與飛盤、飲水台
  for (let i = 0; i < 3; i++) put(k, L, world, { rad: 0.12 }, (p) => { const g = grp(p.x, p.z); add(k, g, i ? new THREE.SphereGeometry(0.08, 10, 8) : new THREE.CylinderGeometry(0.15, 0.15, 0.02, 16), ['#e74c3c', '#f2c94c', '#2ecc71'][i], 0, i ? 0.08 : 0.01, 0); return g; });
  put(k, L, world, { rad: 0.25, h: 0.9 }, (p) => { const g = grp(p.x, p.z); add(k, g, new THREE.CylinderGeometry(0.12, 0.15, 0.8, 10), '#9aa3ab', 0, 0.4, 0); add(k, g, new THREE.CylinderGeometry(0.22, 0.18, 0.1, 14), '#c9ced3', 0, 0.85, 0); return g; });
  for (let i = 0; i < 2; i++) put(k, L, world, { rad: 0.55 }, (p) => { const b = bench(k, p.x, p.z); faceTo(b); if (i === 0) spots.push({ x: p.x, z: p.z + 0.02, face: [p.x + Math.sin(b.rotation.y) * 2, p.z + Math.cos(b.rotation.y) * 2], pose: 'sit', y: 0.48 }); return b; });
  plantTrees(k, L, world, k.mobile ? 5 : 9, ['round', 'round', 'blossom']);
  bushes(k, L, world, k.mobile ? 6 : 12, ['#4fae5b', '#6cc163', '#3d9b57']);
  return { spots, dogs: k.mobile ? 2 : 4 };
}

// ---------- 月夜燈會（永遠是夜晚） ----------
function moon(k, L, world, pal) {
  const spots = [];
  // 天上的大月亮
  const mt = k.tex(256, 256, (c) => { const g = c.createRadialGradient(128, 128, 40, 128, 128, 128); g.addColorStop(0, '#fff8dc'); g.addColorStop(0.7, '#ffe9a8'); g.addColorStop(1, 'rgba(255,233,168,0)'); c.fillStyle = g; c.fillRect(0, 0, 256, 256); c.fillStyle = 'rgba(200,180,120,.35)'; for (const [x, y, r] of [[100, 110, 18], [150, 150, 12], [130, 90, 9], [90, 160, 10]]) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); } });
  const mn = new THREE.Sprite(new THREE.SpriteMaterial({ map: mt, toneMapped: false, fog: false, depthWrite: false })); mn.scale.set(14, 14, 1); mn.position.set(24, 22, -50); world.add(mn);
  // 牌樓（燈會入口）
  const gp = big(k, L, 0.9, 2.2);
  if (gp) { const g = grp(gp.x, gp.z); faceTo(g); for (const x of [-0.7, 0.7]) add(k, g, new THREE.CylinderGeometry(0.07, 0.08, 1.8, 10), '#c0392b', x, 0.9, 0);
    add(k, g, new THREE.BoxGeometry(1.9, 0.12, 0.3), '#c0392b', 0, 1.75, 0); add(k, g, new THREE.BoxGeometry(2.2, 0.1, 0.45), '#2b2f33', 0, 1.92, 0); add(k, g, new THREE.BoxGeometry(0.8, 0.3, 0.05), '#f2c94c', 0, 1.5, 0.16);
    world.add(g); }
  // 燈籠串（地上的燈柱之間）
  const lanternM = k.glow('#ff5a3c', 2.2), lgeo = k.g('mlant', () => { const g = new THREE.SphereGeometry(0.11, 12, 8); g.scale(1, 1.3, 1); return g; });
  const posts = [];
  for (let i = 0; i < (k.mobile ? 4 : 7); i++) { const p = L.spot(k.rnd, { rad: 0.2, h: 1.6 }); if (!p) continue; const g = grp(p.x, p.z); add(k, g, new THREE.CylinderGeometry(0.03, 0.04, 1.5, 6), '#6b4a35', 0, 0.75, 0); add(k, g, lgeo, lanternM, 0, 1.35, 0); world.add(g); posts.push(p); }
  // 天燈：慢慢往上飄
  const sky = []; for (let i = 0; i < (k.mobile ? 6 : 12); i++) { const m = add(k, world, k.g('skylant', () => new THREE.CylinderGeometry(0.14, 0.1, 0.26, 8)), k.glow('#ffb45a', 2.4), 0, 0, 0, false); sky.push({ m, x: (k.rnd() - 0.5) * 12, z: (k.rnd() - 0.5) * 12, o: k.rnd(), s: 0.6 + k.rnd() * 0.6 }); }
  k.anim.push((t) => sky.forEach(({ m, x, z, o, s }) => { const u = (t * 0.03 * s + o) % 1; m.position.set(x + Math.sin(t * 0.3 + o * 6) * 0.6, 1 + u * 16, z); m.scale.setScalar(1 - u * 0.5); }));
  // 玉兔燈與涼亭
  for (let i = 0; i < 2; i++) put(k, L, world, { rad: 0.3 }, (p) => { const g = grp(p.x, p.z); const w = k.glow('#fff6e8', 1.6); add(k, g, new THREE.SphereGeometry(0.22, 14, 10), w, 0, 0.22, 0); add(k, g, new THREE.SphereGeometry(0.14, 12, 8), w, 0, 0.5, 0.06); for (const x of [-0.05, 0.05]) add(k, g, new THREE.CapsuleGeometry(0.035, 0.2, 4, 6), w, x, 0.72, 0.03); return faceTo(g, 0, 8); });
  const pv = big(k, L, 0.8, 1.8, { away: gp });
  if (pv) { const g = grp(pv.x, pv.z); for (const [x, z] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) add(k, g, new THREE.CylinderGeometry(0.05, 0.05, 1.1, 8), '#c0392b', x, 0.55, z);
    add(k, g, new THREE.ConeGeometry(0.95, 0.55, 6), '#2b2f33', 0, 1.35, 0, { flatShading: true }); add(k, g, new THREE.CylinderGeometry(0.6, 0.6, 0.08, 6), '#a8754a', 0, 0.04, 0); add(k, g, lgeo, lanternM, 0, 0.95, 0);
    world.add(g); spots.push({ x: pv.x + 0.2, z: pv.z, face: [pv.x - 1, pv.z + 1], pose: 'stand' }); }
  plantTrees(k, L, world, k.mobile ? 4 : 7, ['blossom', 'round'], { leaf: '#b9739a' });
  return { spots };
}

// ---------- 文青書街 ----------
function campus(k, L, world, pal) {
  const spots = [];
  // 鐘樓
  const tp = big(k, L, 0.6, 3.0);
  if (tp) { const g = grp(tp.x, tp.z); faceTo(g); const brick = k.m('#b5694e', { roughness: 0.9 });
    add(k, g, new THREE.BoxGeometry(0.8, 2.4, 0.8), brick, 0, 1.2, 0); add(k, g, new THREE.ConeGeometry(0.62, 0.7, 4), '#3a4a5a', 0, 2.75, 0).rotation.y = Math.PI / 4;
    const face = k.tex(128, 128, (c) => { c.fillStyle = '#fffaf0'; c.beginPath(); c.arc(64, 64, 60, 0, TAU); c.fill(); c.strokeStyle = '#2b2b2b'; c.lineWidth = 4; c.stroke(); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; c.fillStyle = '#2b2b2b'; c.fillRect(64 + Math.cos(a) * 48 - 2, 64 + Math.sin(a) * 48 - 2, 4, 4); } });
    const cf = add(k, g, new THREE.CircleGeometry(0.3, 24), new THREE.MeshStandardMaterial({ map: face, emissive: C(k.night ? '#fff6d0' : '#000000'), emissiveMap: k.night ? face : null, emissiveIntensity: 0.8 }), 0, 1.95, 0.405, false);
    const hand = add(k, g, new THREE.BoxGeometry(0.02, 0.22, 0.01), '#2b2b2b', 0, 1.95, 0.41, false); hand.geometry.translate(0, 0.1, 0); k.anim.push((t) => { hand.rotation.z = -t * 0.2; }); cf.castShadow = false;
    world.add(g); }
  // 紅磚老屋＋巨書
  for (let i = 0; i < (k.mobile ? 2 : 3); i++) { const p = big(k, L, 0.62, 1.35, { away: tp }) || L.spot(k.rnd, { rad: 0.62, h: 1.35 }); if (!p) continue; world.add(faceTo(house(k, p.x, p.z, ['#c97a5a', '#e9dcc4', '#9a6a55'][i], '#3a4a5a'))); }
  // 腳踏車
  for (let i = 0; i < (k.mobile ? 2 : 4); i++) put(k, L, world, { rad: 0.35 }, (p) => { const g = grp(p.x, p.z); for (const z of [-0.28, 0.28]) add(k, g, new THREE.TorusGeometry(0.17, 0.02, 6, 18), '#2b2b2b', 0, 0.17, z).rotation.y = Math.PI / 2;
    add(k, g, new THREE.BoxGeometry(0.03, 0.03, 0.55), hex(pal[i % 6]), 0, 0.3, 0); add(k, g, new THREE.BoxGeometry(0.03, 0.25, 0.03), hex(pal[i % 6]), 0, 0.3, -0.1); add(k, g, new THREE.BoxGeometry(0.14, 0.03, 0.06), '#2b2b2b', 0, 0.44, -0.12); add(k, g, new THREE.BoxGeometry(0.25, 0.03, 0.03), '#888', 0, 0.45, 0.25);
    g.rotation.y = k.rnd() * 3; return g; });
  // 告示板、長椅（讀書的人）
  put(k, L, world, { rad: 0.45, h: 1.3 }, (p) => { const g = grp(p.x, p.z); faceTo(g); for (const x of [-0.4, 0.4]) add(k, g, new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6), '#6b4a35', x, 0.6, 0); add(k, g, new THREE.BoxGeometry(0.9, 0.6, 0.05), '#a8754a', 0, 0.85, 0);
    for (let j = 0; j < 5; j++) add(k, g, new THREE.BoxGeometry(0.18, 0.22, 0.01), ['#fff3c4', '#ffd6e0', '#d6ecff', '#ffffff', '#e0ffd6'][j], -0.3 + j * 0.15, 0.85 + (j % 2) * 0.12 - 0.06, 0.03).rotation.z = (j - 2) * 0.08; return g; });
  for (let i = 0; i < 2; i++) put(k, L, world, { rad: 0.55 }, (p) => { const b = bench(k, p.x, p.z); faceTo(b); spots.push({ x: p.x, z: p.z + 0.02, face: [p.x + Math.sin(b.rotation.y) * 2, p.z + Math.cos(b.rotation.y) * 2], pose: 'sit', y: 0.48, prop: 'cup' }); return b; });
  for (let i = 0; i < (k.mobile ? 3 : 5); i++) { const p = L.spot(k.rnd, { rad: 0.18, h: 1.6 }); if (p) world.add(lamp(k, p.x, p.z)); }
  plantTrees(k, L, world, k.mobile ? 4 : 8, ['round', 'round', 'pine']);
  bushes(k, L, world, k.mobile ? 5 : 10, ['#4fae5b', '#6cc163']);
  return { spots };
}

// ---------- 歡樂遊樂園 ----------
function carnival(k, L, world, pal) {
  const spots = [];
  const cs = [hex(pal[0]), hex(pal[1]), hex(pal[2]), '#e74c3c', '#3498db', '#f1c40f'];
  // 摩天輪（會轉）
  const fp = big(k, L, 1.0, 3.2);
  if (fp) { const g = grp(fp.x, fp.z); faceTo(g); g.rotation.y += Math.PI / 2;
    for (const s of [-1, 1]) { const l = add(k, g, new THREE.CylinderGeometry(0.04, 0.05, 1.9, 6), '#c9ced3', 0, 0.9, s * 0.35); l.rotation.x = s * 0.18; }
    const wh = new THREE.Group(); wh.position.y = 1.75; g.add(wh); add(k, wh, new THREE.TorusGeometry(1.2, 0.03, 6, 40), '#e8e8e8', 0, 0, 0, { metalness: 0.5 });
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; const sp = add(k, wh, new THREE.CylinderGeometry(0.012, 0.012, 1.2, 4), '#e8e8e8', Math.cos(a) * 0.6, Math.sin(a) * 0.6, 0); sp.rotation.z = a + Math.PI / 2; }
    const cabs = []; for (let i = 0; i < 8; i++) { const c = add(k, g, new THREE.BoxGeometry(0.2, 0.2, 0.25), cs[i % cs.length], 0, 0, 0); cabs.push(c); }
    const bulbs = []; if (k.night) for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; bulbs.push(add(k, wh, new THREE.SphereGeometry(0.035, 6, 4), k.glow(cs[i % cs.length], 2.6), Math.cos(a) * 1.2, Math.sin(a) * 1.2, 0, false)); }
    k.anim.push((t) => { wh.rotation.z = t * 0.25; cabs.forEach((c, i) => { const a = i / 8 * TAU + t * 0.25; c.position.set(Math.cos(a) * 1.2, 1.75 + Math.sin(a) * 1.2 - 0.14, 0); }); });
    world.add(g); }
  // 旋轉木馬
  const cp = big(k, L, 0.95, 1.6, { away: fp });
  if (cp) { const g = grp(cp.x, cp.z); add(k, g, new THREE.CylinderGeometry(0.9, 0.95, 0.12, 24), '#f4efe4', 0, 0.06, 0); const top = new THREE.Group(); g.add(top);
    add(k, top, new THREE.ConeGeometry(1.0, 0.45, 24), new THREE.MeshStandardMaterial({ map: k.stripes(cs[0], '#ffffff', 12), roughness: 0.6 }), 0, 1.55, 0); add(k, top, new THREE.CylinderGeometry(0.06, 0.06, 1.4, 8), '#f2c94c', 0, 0.75, 0, { metalness: 0.6 });
    const horses = []; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; const h = new THREE.Group(); top.add(h); add(k, h, new THREE.CylinderGeometry(0.015, 0.015, 1.25, 4), '#f2c94c', 0, 0.75, 0, { metalness: 0.6 });
      add(k, h, new THREE.BoxGeometry(0.12, 0.16, 0.36), cs[(i + 1) % cs.length], 0, 0.55, 0); add(k, h, new THREE.BoxGeometry(0.1, 0.16, 0.1), cs[(i + 1) % cs.length], 0, 0.68, 0.17); h.position.set(Math.cos(a) * 0.65, 0, Math.sin(a) * 0.65); h.rotation.y = -a; horses.push(h); }
    k.anim.push((t) => { top.rotation.y = t * 0.6; horses.forEach((h, i) => { h.position.y = Math.sin(t * 2 + i) * 0.08; }); });
    world.add(g); }
  // 馬戲團帳篷、氣球攤、旗串
  const tp = L.spot(k.rnd, { rad: 0.75, h: 1.8 });
  if (tp) { const g = grp(tp.x, tp.z); add(k, g, new THREE.CylinderGeometry(0.75, 0.75, 0.8, 12, 1, true), new THREE.MeshStandardMaterial({ map: k.stripes('#e74c3c', '#ffffff', 12), side: THREE.DoubleSide }), 0, 0.4, 0); add(k, g, new THREE.ConeGeometry(0.8, 0.7, 12), new THREE.MeshStandardMaterial({ map: k.stripes('#e74c3c', '#ffffff', 12) }), 0, 1.15, 0); add(k, g, new THREE.ConeGeometry(0.05, 0.25, 3), '#f2c94c', 0, 1.6, 0); world.add(g); }
  put(k, L, world, { rad: 0.3, h: 1.8 }, (p) => { const g = grp(p.x, p.z); add(k, g, new THREE.BoxGeometry(0.5, 0.5, 0.4), '#f4efe4', 0, 0.25, 0); const bs = [];
    for (let i = 0; i < 6; i++) { const b = new THREE.Group(); b.position.set((i % 3 - 1) * 0.15, 0.5, Math.floor(i / 3) * 0.12 - 0.06); g.add(b); add(k, b, new THREE.CylinderGeometry(0.004, 0.004, 0.7, 3), '#ffffff', 0, 0.35, 0); add(k, b, new THREE.SphereGeometry(0.11, 10, 8), cs[i % cs.length], 0, 0.78, 0, { roughness: 0.3 }); bs.push(b); }
    k.anim.push((t) => bs.forEach((b, i) => { b.rotation.z = Math.sin(t * 1.4 + i) * 0.12; })); spots.push({ x: p.x + 0.45, z: p.z, face: [p.x, p.z], pose: 'stand', prop: 'balloon' }); return g; });
  for (let i = 0; i < (k.mobile ? 3 : 5); i++) put(k, L, world, { rad: 0.2, h: 1.6 }, (p) => { const g = grp(p.x, p.z); add(k, g, new THREE.CylinderGeometry(0.03, 0.03, 1.5, 6), '#e8e8e8', 0, 0.75, 0); add(k, g, new THREE.ConeGeometry(0.12, 0.25, 3), cs[i % cs.length], 0.08, 1.4, 0).rotation.z = -Math.PI / 2; return g; });
  plantTrees(k, L, world, k.mobile ? 3 : 6, ['round', 'blossom']);
  return { spots };
}

// ---------- 沙漠綠洲 ----------
function desert(k, L, world, pal) {
  const spots = [];
  const cm = k.m(k.night ? '#2f5a3a' : '#4f9a5a', { roughness: 0.7 });
  const cactus = (x, z, s) => { const g = grp(x, z); g.scale.setScalar(s); add(k, g, new THREE.CapsuleGeometry(0.13, 1.0, 4, 10), cm, 0, 0.62, 0);
    for (const [sx, y, l] of [[1, 0.6, 0.3], [-1, 0.8, 0.25]]) { add(k, g, new THREE.CapsuleGeometry(0.08, 0.2, 4, 8), cm, sx * 0.18, y, 0).rotation.z = Math.PI / 2; add(k, g, new THREE.CapsuleGeometry(0.08, l, 4, 8), cm, sx * 0.28, y + l / 2 + 0.05, 0); }
    g.rotation.y = k.rnd() * 3; return g; };
  for (let i = 0; i < (k.mobile ? 6 : 11); i++) put(k, L, world, { rad: 0.35, h: 1.8 }, (p) => cactus(p.x, p.z, 0.8 + k.rnd() * 0.5));
  for (let i = 0; i < (k.mobile ? 5 : 10); i++) put(k, L, world, { rad: 0.18 }, (p) => { const g = grp(p.x, p.z); add(k, g, new THREE.SphereGeometry(0.16, 10, 8), cm, 0, 0.12, 0).scale.y = 0.8; add(k, g, new THREE.SphereGeometry(0.04, 6, 4), ['#ff7aa2', '#ffd34e'][i % 2], 0, 0.26, 0); return g; });
  // 紅岩台地
  for (let i = 0; i < 2; i++) put(k, L, world, { zone: 'outer', rad: 0.6, h: 1.1 }, (p) => { const g = grp(p.x, p.z); [[1.1, 0.35, '#c8643c'], [0.85, 0.35, '#d9774a'], [0.6, 0.3, '#c8643c']].reduce((y, [w, h, c]) => { add(k, g, new THREE.BoxGeometry(w, h, w * 0.8), c, 0, y + h / 2, 0, { flatShading: true }); return y + h; }, 0); g.rotation.y = k.rnd() * 3; return g; });
  // 綠洲水池＋棕櫚樹
  const op = big(k, L, 1.0, 0);
  if (op) { const g = grp(op.x, op.z); add(k, g, new THREE.CylinderGeometry(0.75, 0.8, 0.04, 28), '#3fb8c9', 0, 0.02, 0, { roughness: 0.1 }); world.add(g);
    for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + 0.4; world.add(tree(k, op.x + Math.cos(a) * 1.0, op.z + Math.sin(a) * 1.0, 'palm', 0.85)); } }
  // 駱駝（慢慢走）
  { const p = L.spot(k.rnd, { zone: 'outer', rad: 0.6 }) || L.spot(k.rnd, { rad: 0.6 });
    if (p) { const cam = new THREE.Group(); const fur = k.m('#c9a06b', { roughness: 0.9 });
      add(k, cam, new THREE.BoxGeometry(0.32, 0.32, 0.7), fur, 0, 0.62, 0); add(k, cam, new THREE.SphereGeometry(0.17, 10, 8), fur, 0, 0.85, -0.05); const nk = add(k, cam, new THREE.BoxGeometry(0.12, 0.45, 0.12), fur, 0, 0.88, 0.38); nk.rotation.x = 0.5; add(k, cam, new THREE.BoxGeometry(0.14, 0.13, 0.25), fur, 0, 1.08, 0.55);
      const legs = [[-0.11, -0.25], [0.11, -0.25], [-0.11, 0.25], [0.11, 0.25]].map(([x, z]) => { const l = add(k, cam, k.g('camleg', () => { const y = new THREE.BoxGeometry(0.07, 0.46, 0.07); y.translate(0, -0.23, 0); return y; }), fur, x, 0.48, z); return l; });
      cam.position.set(p.x, 0.13, p.z); world.add(cam);
      const home = [p.x, p.z]; let tx = p.x, tz = p.z, wait = 2, last = 0, ph = 0;
      k.anim.push((t) => { const dt = Math.min(0.05, t - last); last = t; const dx = tx - cam.position.x, dz = tz - cam.position.z, d = Math.hypot(dx, dz);
        if (d > 0.03) { cam.position.x += dx / d * 0.15 * dt; cam.position.z += dz / d * 0.15 * dt; cam.rotation.y = Math.atan2(dx, dz); ph += dt * 4; legs.forEach((l, i) => { l.rotation.x = Math.sin(ph + (i % 2) * Math.PI) * 0.35; }); }
        else { wait -= dt; if (wait < 0) { const a = k.rnd() * TAU; tx = home[0] + Math.sin(a) * 0.4; tz = home[1] + Math.cos(a) * 0.4; wait = 3 + k.rnd() * 3; } } }); } }
  return { spots };
}

// 場景登錄（id → 定義）：sand 沙地、grass 地面、roof 店舖屋頂、night 永遠夜晚、hat 路人常見帽子、water 海水顏色
export const MORE_SCENES = {
  snow: { id: 'snow', name: '雪國木屋', sand: '#e9eff5', grass: '#f3f7fa', roof: 'gable', hat: 'beanie', water: { shallow: '#9fd6ea', deep: '#2b6f9e' }, build: snow },
  zen: { id: 'zen', name: '禪風庭園', sand: '#e9e3d3', grass: '#7aa86a', roof: 'gable', build: zen },
  neon: { id: 'neon', name: '霓虹電子街', sand: '#4a4f5c', grass: '#2b2f3a', roof: 'flat', night: true, hat: 'cap', water: { shallow: '#3a2a6a', deep: '#120a2a' }, build: neon },
  harbor: { id: 'harbor', name: '港口漁村', sand: '#e9d8b0', grass: '#8fbf6a', roof: 'gable', hat: 'cap', build: harbor },
  park: { id: 'park', name: '寵物公園', sand: '#efdcb4', grass: '#86c96a', roof: 'pyramid', build: park },
  moon: { id: 'moon', name: '月夜燈會', sand: '#d9c9a8', grass: '#3f6b4a', roof: 'gable', night: true, build: moon },
  campus: { id: 'campus', name: '文青書街', sand: '#ecdcbc', grass: '#86c06c', roof: 'gable', build: campus },
  carnival: { id: 'carnival', name: '歡樂遊樂園', sand: '#f6e2c0', grass: '#9fd67a', roof: 'pyramid', build: carnival },
  desert: { id: 'desert', name: '沙漠綠洲', sand: '#f1dca6', grass: '#e3c78a', roof: 'flat', hat: 'sun', water: { shallow: '#4fd6c9', deep: '#1f8fb0' }, build: desert },
};
