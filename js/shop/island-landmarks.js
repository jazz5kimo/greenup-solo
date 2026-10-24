// 銷售網頁 3D 開場的「招牌地標」：每個業主一個專屬的大型造景（河粉碗、珍奶杯、理髮旋轉燈、拖拉機…），
// 放在場景裡最顯眼的空地，同一種場景的兩家店也看得出不同。造型都是示範用的通用物件，不使用任何品牌標誌。
import * as THREE from 'three';
import { puffs } from './island-scenes.js';

const TAU = Math.PI * 2;
const C = (c) => new THREE.Color(c);
const hex = (c) => '#' + C(c).getHexString();
const V2 = (pts) => pts.map(([x, y]) => new THREE.Vector2(x, y));
const lathe = (pts, seg = 28) => new THREE.LatheGeometry(V2(pts), seg);
const cyl = (r1, r2, h, s = 20) => new THREE.CylinderGeometry(r1, r2, h, s);
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const sph = (r, a = 18, b = 12) => new THREE.SphereGeometry(r, a, b);
const tor = (r, t, a = 10, b = 32, arc = TAU) => new THREE.TorusGeometry(r, t, a, b, arc);

// 每個建造函式：(k 工具組, g 群組, pal 品牌色, c 主色) → { rad 佔地半徑, h 高度 }；g 的原點在地面
function add(k, g, geo, color, x = 0, y = 0, z = 0, o = {}) { const mat = Array.isArray(color) || (color && color.isMaterial) ? color : k.m(color, o); const m = k.mesh(geo, mat, x, y, z); g.add(m); return m; }
const dome = (r, a = 20, b = 10) => new THREE.SphereGeometry(r, a, b, 0, TAU, 0, Math.PI / 2);
const glass = (color = '#dff2ff', opacity = 0.35) => new THREE.MeshStandardMaterial({ color: C(color), transparent: true, opacity, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
function bubbles(k, g, n, { r = 0.7, h = 1.8, size = 0.12 } = {}) {
  const m = glass('#e8f8ff', 0.45), list = [];
  for (let i = 0; i < n; i++) { const b = k.mesh(k.g('lmbub', () => sph(1, 14, 10)), m, 0, 0, 0, false); g.add(b); list.push({ b, a: k.rnd() * TAU, s: 0.6 + k.rnd() * 0.8, o: k.rnd() }); }
  k.anim.push((t) => list.forEach(({ b, a, s, o }) => { const u = (t * 0.18 * s + o) % 1; b.position.set(Math.sin(a + u * 3) * r * (0.4 + u * 0.6), 0.4 + u * h, Math.cos(a + u * 3) * r * (0.4 + u * 0.6)); b.scale.setScalar(size * (0.6 + s * 0.6) * Math.sin(Math.PI * u)); }));
}
function bowl(k, g, color, y = 0) {
  add(k, g, lathe([[0, 0], [0.35, 0], [0.42, 0.05], [0.8, 0.5], [0.85, 0.62], [0.8, 0.62], [0.38, 0.12], [0, 0.1]]), color, 0, y, 0, { side: THREE.DoubleSide, roughness: 0.4 });
  return add(k, g, cyl(0.76, 0.76, 0.02, 32), '#e8b56a', 0, y + 0.5, 0, { roughness: 0.3 });
}
const B = {
  // ---- 餐飲 ----
  pho(k, g, pal) { bowl(k, g, '#fbf7f0', 0.15); add(k, g, cyl(0.25, 0.32, 0.15, 20), hex(pal[0]), 0, 0.075, 0);
    for (let i = 0; i < 6; i++) { const n = add(k, g, tor(0.18 + i * 0.07, 0.025, 6, 24), '#f6efdc', 0, 0.68, 0); n.rotation.x = Math.PI / 2; }
    for (const [x, z, c] of [[0.3, 0.1, '#c0392b'], [-0.25, -0.2, '#5aa346'], [0.05, 0.35, '#5aa346']]) add(k, g, sph(0.08), c, x, 0.7, z);
    for (const dx of [-0.05, 0.05]) { const c = add(k, g, cyl(0.025, 0.02, 1.4, 6), '#a8754a', 0.35 + dx, 1.1, 0); c.rotation.z = -0.5; }
    puffs(k, g, 0, 0.8, 0, { n: 5, size: 0.16, rise: 1.2, speed: 0.3, opacity: 0.5 }); return { rad: 0.9, h: 1.8 }; },
  bento(k, g, pal) { add(k, g, box(1.4, 0.35, 1.0), hex(pal[0]), 0, 0.18, 0); add(k, g, box(1.32, 0.04, 0.92), '#2b2b2b', 0, 0.36, 0);
    add(k, g, box(0.62, 0.12, 0.84), '#fbfaf4', -0.32, 0.42, 0); add(k, g, box(0.6, 0.1, 0.38), '#f2c94c', 0.33, 0.41, -0.22); add(k, g, box(0.6, 0.1, 0.38), '#7cbf5a', 0.33, 0.41, 0.22);
    add(k, g, sph(0.07), '#c0392b', -0.32, 0.5, 0); const lid = add(k, g, box(1.45, 0.08, 1.05), hex(C(pal[0]).lerp(C('#000'), 0.2)), 0, 0.75, -0.5); lid.rotation.x = -1.1; return { rad: 0.95, h: 1.3 }; },
  brunch(k, g, pal) { add(k, g, cyl(0.75, 0.68, 0.12, 32), '#2f3337', 0, 0.3, 0, { metalness: 0.5, roughness: 0.4 }); const h = add(k, g, cyl(0.06, 0.06, 0.9, 8), '#2f3337', 0.95, 0.34, 0); h.rotation.z = Math.PI / 2;
    add(k, g, cyl(0.5, 0.52, 0.05, 24), '#fffdf6', 0, 0.38, 0); add(k, g, sph(0.2), '#f2a51a', 0.05, 0.42, 0.05, { roughness: 0.2 }).scale.y = 0.6;
    add(k, g, cyl(0.08, 0.08, 0.3, 6), '#555', 0, 0.12, 0); const mug = new THREE.Group(); mug.position.set(-0.75, 0, 0.55); g.add(mug);
    add(k, mug, cyl(0.24, 0.2, 0.5, 20), '#ffffff', 0, 0.25, 0); add(k, mug, cyl(0.21, 0.21, 0.02, 20), '#6b4226', 0, 0.48, 0); add(k, mug, tor(0.12, 0.04, 8, 16), '#ffffff', 0.25, 0.27, 0);
    puffs(k, mug, 0, 0.55, 0, { n: 3, size: 0.08, rise: 0.6, opacity: 0.5 }); return { rad: 1.0, h: 1.0 }; },
  luwei(k, g, pal) { add(k, g, box(1.3, 0.6, 0.7), hex(pal[0]), 0, 0.55, 0); for (const x of [-0.5, 0.5]) { const w = add(k, g, cyl(0.22, 0.22, 0.08, 16), '#2b2b2b', x, 0.22, 0.38); w.rotation.x = Math.PI / 2; }
    add(k, g, cyl(0.28, 0.24, 0.25, 16), '#8d949a', -0.3, 0.97, 0, { metalness: 0.6, roughness: 0.3 }); add(k, g, cyl(0.25, 0.25, 0.02, 16), '#7a3e1d', -0.3, 1.08, 0);
    puffs(k, g, -0.3, 1.1, 0, { n: 4, size: 0.12, rise: 1, opacity: 0.5 });
    for (let i = 0; i < 6; i++) { const s = add(k, g, cyl(0.012, 0.012, 0.5, 4), '#d9b77c', 0.15 + i * 0.08, 1.05, -0.1); s.rotation.z = 0.15; add(k, g, sph(0.05), ['#a0522d', '#f2c94c', '#6b8e23'][i % 3], 0.15 + i * 0.08, 1.18, -0.1); }
    const sign = add(k, g, box(1.3, 0.3, 0.04), '#c0392b', 0, 1.65, -0.3); add(k, g, cyl(0.02, 0.02, 0.8, 6), '#555', -0.6, 1.25, -0.3); add(k, g, cyl(0.02, 0.02, 0.8, 6), '#555', 0.6, 1.25, -0.3); sign.castShadow = true; return { rad: 0.9, h: 1.8 }; },
  dumpling(k, g) { const bam = k.m('#d9b77c', { roughness: 0.9 });
    for (let i = 0; i < 3; i++) { add(k, g, cyl(0.62, 0.62, 0.3, 24), bam, 0, 0.15 + i * 0.32, 0); add(k, g, tor(0.62, 0.025, 6, 32), '#b8925a', 0, 0.3 + i * 0.32, 0).rotation.x = Math.PI / 2; }
    add(k, g, lathe([[0, 0], [0.64, 0], [0.4, 0.18], [0, 0.22]]), bam, 0, 0.96, 0);
    puffs(k, g, 0, 1.2, 0, { n: 5, size: 0.15, rise: 1.1, speed: 0.3, opacity: 0.55 });
    const d = add(k, g, sph(0.35, 20, 12), '#fbf5e6', 0.85, 0.2, 0.2); d.scale.set(1.3, 0.55, 0.8); add(k, g, tor(0.3, 0.05, 6, 20, Math.PI), '#f4ead2', 0.85, 0.3, 0.2).rotation.y = Math.PI / 2; return { rad: 1.0, h: 1.6 }; },
  ramen(k, g, pal) { bowl(k, g, '#c0392b', 0.1); add(k, g, cyl(0.25, 0.3, 0.1, 20), '#2b2b2b', 0, 0.05, 0);
    for (let i = 0; i < 5; i++) add(k, g, tor(0.15 + i * 0.09, 0.03, 6, 24), '#f2d16b', 0, 0.63, 0).rotation.x = Math.PI / 2;
    for (const [x, z] of [[0.3, -0.1], [0.42, 0.15]]) { const e = add(k, g, sph(0.13), '#ffffff', x, 0.66, z); e.scale.y = 0.5; add(k, g, sph(0.07), '#f2a51a', x, 0.71, z).scale.y = 0.5; }
    const nr = k.tex(64, 64, (c) => { c.fillStyle = '#fff'; c.fillRect(0, 0, 64, 64); c.strokeStyle = '#e86a92'; c.lineWidth = 6; c.beginPath(); for (let a = 0; a < 14; a += 0.2) c.lineTo(32 + Math.cos(a) * a * 2, 32 + Math.sin(a) * a * 2); c.stroke(); });
    const n = add(k, g, cyl(0.16, 0.16, 0.05, 20), new THREE.MeshStandardMaterial({ map: nr }), -0.25, 0.66, 0.15); n.rotation.z = 0.3;
    add(k, g, box(0.5, 0.03, 0.5), '#1f3b23', -0.3, 0.75, -0.3).rotation.set(1.2, 0, 0.2);
    puffs(k, g, 0, 0.8, 0, { n: 5, size: 0.15, rise: 1.2, opacity: 0.5 }); return { rad: 0.9, h: 1.7 }; },
  chef(k, g) { add(k, g, cyl(0.85, 0.9, 0.06, 32), '#d9dde0', 0, 0.35, 0, { metalness: 0.7, roughness: 0.25 }); add(k, g, cyl(0.12, 0.2, 0.32, 12), '#bfc5ca', 0, 0.16, 0, { metalness: 0.7 });
    const cl = add(k, g, dome(0.68, 28, 14), '#e6e9ec', 0, 0.38, 0, { metalness: 0.85, roughness: 0.18 }); add(k, g, sph(0.08), '#c9ced3', 0, 1.1, 0, { metalness: 0.9 });
    const hat = new THREE.Group(); hat.position.set(0.9, 0, -0.4); g.add(hat); add(k, hat, cyl(0.25, 0.25, 0.3, 20), '#ffffff', 0, 0.15, 0);
    for (const [x, z] of [[0, 0], [0.15, 0.1], [-0.15, 0.08], [0.05, -0.15], [-0.1, -0.1]]) add(k, hat, sph(0.2), '#ffffff', x, 0.45, z);
    k.anim.push((t) => { cl.position.y = 0.38 + Math.max(0, Math.sin(t * 0.8)) * 0.25; }); return { rad: 1.1, h: 1.2 }; },
  // ---- 飲品 ----
  coffee(k, g, pal) { const d = add(k, g, cyl(0.42, 0.42, 1.0, 24), '#3a3f44', 0, 0.75, 0, { metalness: 0.6, roughness: 0.35 }); d.rotation.z = Math.PI / 2;
    add(k, g, box(0.9, 0.3, 0.6), hex(pal[0]), 0, 0.15, 0); add(k, g, lathe([[0.05, 0], [0.3, 0.35], [0.32, 0.4], [0, 0.4]]), '#c9ced3', 0.2, 1.15, 0, { metalness: 0.6 });
    add(k, g, cyl(0.06, 0.06, 1.0, 10), '#8d949a', -0.3, 1.5, -0.1); puffs(k, g, -0.3, 2.0, -0.1, { n: 4, size: 0.12, rise: 0.9, opacity: 0.5 });
    const tray = add(k, g, cyl(0.45, 0.45, 0.1, 24), '#8d949a', 0.85, 0.35, 0.3, { metalness: 0.5 }); for (let i = 0; i < 10; i++) add(k, g, sph(0.05, 8, 6), '#5a3418', 0.85 + Math.cos(i) * 0.25, 0.42, 0.3 + Math.sin(i) * 0.25).scale.set(1, 0.7, 1.3);
    add(k, g, cyl(0.06, 0.06, 0.3, 8), '#555', 0.85, 0.15, 0.3); tray.castShadow = true; return { rad: 1.0, h: 2.1 }; },
  bubbletea(k, g, pal) { add(k, g, lathe([[0, 0], [0.42, 0], [0.55, 1.5], [0.53, 1.5], [0.4, 0.03], [0, 0.03]]), glass('#ffffff', 0.35), 0, 0, 0);
    add(k, g, lathe([[0, 0.02], [0.41, 0.02], [0.51, 1.2], [0, 1.2]]), '#c8996b', 0, 0, 0, { roughness: 0.4, transparent: true, opacity: 0.9 });
    for (let i = 0; i < 22; i++) add(k, g, k.g('pearl', () => sph(0.07, 10, 8)), '#2b1d14', Math.cos(i * 2.3) * (0.1 + (i % 4) * 0.08), 0.1 + (i % 3) * 0.1, Math.sin(i * 2.3) * (0.1 + (i % 4) * 0.08), { roughness: 0.2 });
    add(k, g, cyl(0.56, 0.56, 0.05, 28), hex(pal[0]), 0, 1.5, 0); const s = add(k, g, cyl(0.06, 0.06, 1.4, 10), hex(pal[1]), 0.15, 1.55, 0); s.rotation.z = -0.25; return { rad: 0.7, h: 2.3 }; },
  teahouse(k, g, pal) { add(k, g, sph(0.55, 24, 16), '#5a7d5a', 0, 0.6, 0, { roughness: 0.3 }).scale.y = 0.85; add(k, g, cyl(0.22, 0.3, 0.12, 20), '#5a7d5a', 0, 1.08, 0); add(k, g, sph(0.08), '#3d5a3d', 0, 1.2, 0);
    const sp = add(k, g, cyl(0.06, 0.12, 0.6, 10), '#5a7d5a', 0.62, 0.75, 0); sp.rotation.z = -0.9; add(k, g, tor(0.28, 0.05, 8, 20, Math.PI * 1.2), '#5a7d5a', -0.55, 0.7, 0).rotation.z = 1.2;
    for (let i = 0; i < 3; i++) add(k, g, cyl(0.12, 0.09, 0.14, 14), '#f4efe4', -0.4 + i * 0.4, 0.07, 0.75);
    add(k, g, cyl(0.38, 0.38, 0.04, 24), '#8a5a3a', 0, 0.02, 0.75); puffs(k, g, 0.95, 1.0, 0, { n: 3, size: 0.08, rise: 0.6, opacity: 0.5 }); return { rad: 0.95, h: 1.4 }; },
  craftbeer(k, g, pal) { const br = add(k, g, lathe([[0, -0.6], [0.48, -0.6], [0.58, 0], [0.48, 0.6], [0, 0.6]]), '#a0673c', 0, 0.75, 0, { roughness: 0.8 }); br.rotation.z = Math.PI / 2;
    for (const x of [-0.45, 0, 0.45]) add(k, g, tor(x ? 0.53 : 0.59, 0.025, 6, 28), '#3a3f44', x, 0.75, 0, { metalness: 0.6 }).rotation.y = Math.PI / 2;
    add(k, g, box(1.2, 0.18, 0.15), '#6b4a35', 0, 0.09, 0.35); add(k, g, box(1.2, 0.18, 0.15), '#6b4a35', 0, 0.09, -0.35);
    const mug = new THREE.Group(); mug.position.set(0.95, 0, 0.45); g.add(mug); add(k, mug, cyl(0.2, 0.2, 0.55, 16), glass('#f2b632', 0.75), 0, 0.28, 0);
    for (let i = 0; i < 5; i++) add(k, mug, sph(0.1), '#fffaf0', Math.cos(i) * 0.1, 0.6, Math.sin(i) * 0.1); add(k, mug, tor(0.13, 0.04, 8, 16), glass('#ffffff', 0.5), 0.24, 0.3, 0); return { rad: 1.05, h: 1.4 }; },
  juice(k, g) { const half = new THREE.SphereGeometry(0.55, 24, 12, 0, TAU, 0, Math.PI / 2); const o = add(k, g, half, '#f39c12', 0, 0, 0); o.rotation.x = -Math.PI / 2 + 0.4; o.position.set(-0.3, 0.55, 0);
    const sl = k.tex(128, 128, (c) => { c.fillStyle = '#f39c12'; c.beginPath(); c.arc(64, 64, 62, 0, TAU); c.fill(); c.fillStyle = '#ffd37a'; c.beginPath(); c.arc(64, 64, 54, 0, TAU); c.fill(); c.strokeStyle = '#fff4d6'; c.lineWidth = 4; for (let i = 0; i < 10; i++) { c.beginPath(); c.moveTo(64, 64); c.lineTo(64 + Math.cos(i / 10 * TAU) * 54, 64 + Math.sin(i / 10 * TAU) * 54); c.stroke(); } });
    const f = add(k, g, new THREE.CircleGeometry(0.55, 32), new THREE.MeshStandardMaterial({ map: sl, roughness: 0.4 }), -0.3, 0.55, 0); f.rotation.x = 0.4; f.translateZ(0.001);
    add(k, g, lathe([[0, 0], [0.22, 0], [0.24, 0.8], [0.12, 1.0], [0.1, 1.2], [0, 1.2]]), glass('#ff9f43', 0.8), 0.6, 0, 0.2); add(k, g, cyl(0.11, 0.11, 0.12, 12), '#2ecc71', 0.6, 1.25, 0.2);
    add(k, g, sph(0.22), '#e74c3c', 0.45, 0.22, -0.45); add(k, g, sph(0.2), '#2ecc71', -0.7, 0.2, -0.45); return { rad: 1.0, h: 1.4 }; },
  // ---- 甜點 ----
  amei(k, g, pal) { const cs = [hex(pal[0]), '#fffaf2', hex(pal[1])];
    [[0.75, 0.35], [0.55, 0.3], [0.35, 0.25]].reduce((y, [r, h], i) => { add(k, g, cyl(r, r, h, 32), cs[i % 3], 0, y + h / 2, 0, { roughness: 0.5 }); add(k, g, tor(r, 0.05, 8, 32), '#ffffff', 0, y + h, 0).rotation.x = Math.PI / 2; return y + h; }, 0);
    for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; add(k, g, sph(0.1), '#e8384f', Math.cos(a) * 0.55, 0.4, Math.sin(a) * 0.55); }
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; add(k, g, sph(0.08), '#e8384f', Math.cos(a) * 0.2, 0.97, Math.sin(a) * 0.2); }
    add(k, g, cyl(0.02, 0.02, 0.3, 6), '#fff6d6', 0, 1.1, 0); add(k, g, sph(0.04), '#ffb23e', 0, 1.27, 0, k.night ? { emissive: C('#ffb23e'), emissiveIntensity: 2 } : {}); return { rad: 0.85, h: 1.3 }; },
  bakery(k, g) { add(k, g, dome(0.75), '#b5694e', 0, 0, 0, { roughness: 0.95, flatShading: true });
    add(k, g, box(0.4, 0.3, 0.2), '#2b1d14', 0, 0.15, 0.68); const fire = add(k, g, new THREE.ConeGeometry(0.1, 0.22, 6), new THREE.MeshStandardMaterial({ color: 0xffa23a, emissive: 0xff7a1a, emissiveIntensity: 1.6 }), 0, 0.12, 0.62); k.anim.push((t) => { fire.scale.y = 1 + Math.sin(t * 12) * 0.2; });
    add(k, g, cyl(0.1, 0.12, 0.6, 10), '#8b8580', 0.35, 0.9, -0.2); puffs(k, g, 0.35, 1.25, -0.2, { n: 4, size: 0.12, rise: 1, opacity: 0.5 });
    for (let i = 0; i < 3; i++) { const b = add(k, g, new THREE.CapsuleGeometry(0.1, 0.9, 4, 10), '#d99a4e', 0.95, 0.5 + i * 0.05, -0.3 + i * 0.25); b.rotation.set(0.2, 0, 0.35 - i * 0.1); }
    return { rad: 1.05, h: 1.6 }; },
  gelato(k, g, pal) { const ct = k.tex(64, 64, (c) => { c.fillStyle = '#d9a066'; c.fillRect(0, 0, 64, 64); c.strokeStyle = '#b07b42'; c.lineWidth = 3; for (let i = -64; i < 128; i += 12) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + 64, 64); c.stroke(); c.beginPath(); c.moveTo(i + 64, 0); c.lineTo(i, 64); c.stroke(); } });
    const cone = add(k, g, new THREE.ConeGeometry(0.4, 1.2, 20), new THREE.MeshStandardMaterial({ map: ct, roughness: 0.8 }), 0, 0.75, 0); cone.rotation.x = Math.PI;
    [['#fff4e0', 1.45], [hex(pal[0]), 1.85], ['#c9a06b', 2.2]].forEach(([c, y], i) => add(k, g, sph(0.42 - i * 0.05, 20, 14), c, (i - 1) * 0.04, y, 0, { roughness: 0.6 }));
    add(k, g, sph(0.09), '#e8384f', 0, 2.55, 0); add(k, g, cyl(0.45, 0.55, 0.15, 20), '#f4efe4', 0, 0.07, 0); return { rad: 0.7, h: 2.6 }; },
  mooncake(k, g) { const mt = k.tex(128, 128, (c) => { c.fillStyle = '#c98a3e'; c.fillRect(0, 0, 128, 128); c.strokeStyle = '#a86a2a'; c.lineWidth = 5; c.beginPath(); c.arc(64, 64, 44, 0, TAU); c.stroke(); for (let i = 0; i < 8; i++) { c.beginPath(); c.arc(64 + Math.cos(i / 8 * TAU) * 30, 64 + Math.sin(i / 8 * TAU) * 30, 10, 0, TAU); c.stroke(); } c.fillStyle = '#a86a2a'; c.font = '700 34px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('福', 64, 66); });
    const m = add(k, g, cyl(0.7, 0.7, 0.35, 40), [k.m('#c98a3e'), new THREE.MeshStandardMaterial({ map: mt, roughness: 0.7 }), k.m('#b87a35')], 0, 0.45, 0); m.rotation.x = -0.25;
    add(k, g, cyl(0.25, 0.3, 0.3, 16), '#8a5a3a', 0, 0.15, 0);
    const rb = new THREE.Group(); rb.position.set(0.85, 0, 0.35); g.add(rb); add(k, rb, sph(0.18), '#ffffff', 0, 0.18, 0); add(k, rb, sph(0.12), '#ffffff', 0, 0.4, 0.05);
    for (const x of [-0.05, 0.05]) add(k, rb, new THREE.CapsuleGeometry(0.03, 0.18, 4, 6), '#ffffff', x, 0.6, 0.02); add(k, rb, sph(0.02), '#e8384f', 0.04, 0.42, 0.16);
    return { rad: 1.0, h: 1.2 }; },
  chocolate(k, g) { const ch = k.m('#5a3418', { roughness: 0.25 });
    [[0.8, 0.1], [0.55, 0.55], [0.32, 0.95]].forEach(([r, y]) => { add(k, g, cyl(r, r * 0.9, 0.1, 28), '#e9e0d0', 0, y, 0, { metalness: 0.4 }); add(k, g, cyl(r * 0.96, r * 0.96, 0.04, 28), ch, 0, y + 0.06, 0); });
    add(k, g, cyl(0.06, 0.08, 1.2, 10), '#e9e0d0', 0, 0.6, 0, { metalness: 0.4 });
    const fl = [0.55, 0.32].map((r, i) => { return add(k, g, new THREE.CylinderGeometry(r, r * 1.45, i ? 0.4 : 0.45, 28, 1, true), new THREE.MeshStandardMaterial({ color: 0x6b3e1f, roughness: 0.2, transparent: true, opacity: 0.85, side: THREE.DoubleSide }), 0, i ? 0.78 : 0.33, 0); });
    k.anim.push((t) => fl.forEach((m, i) => { m.rotation.y = t * (i ? 0.8 : -0.6); }));
    for (let i = 0; i < 5; i++) add(k, g, sph(0.08), ['#e8384f', '#f2c94c', '#ffffff'][i % 3], Math.cos(i * 1.3) * 0.95, 0.08, Math.sin(i * 1.3) * 0.95); return { rad: 1.0, h: 1.2 }; },
  // ---- 零售 ----
  select(k, g, pal) { add(k, g, box(1.0, 1.2, 0.5), hex(pal[0]), 0, 0.6, 0, { roughness: 0.7 }); add(k, g, box(1.02, 0.12, 0.52), '#ffffff', 0, 1.15, 0);
    for (const x of [-0.25, 0.25]) add(k, g, tor(0.18, 0.03, 6, 16, Math.PI), '#2b2b2b', x, 1.21, 0).rotation.z = 0;
    const tag = add(k, g, box(0.25, 0.32, 0.02), '#fffaf2', 0.55, 0.9, 0.26); tag.rotation.z = 0.3;
    add(k, g, box(0.6, 0.7, 0.3), hex(pal[2]), -0.7, 0.35, 0.3).rotation.y = 0.4; return { rad: 1.0, h: 1.5 }; },
  vintage(k, g, pal) { const r = new THREE.Group(); g.add(r); for (const x of [-0.7, 0.7]) add(k, r, cyl(0.03, 0.03, 1.5, 6), '#555b60', x, 0.75, 0); add(k, r, cyl(0.025, 0.025, 1.45, 6), '#555b60', 0, 1.48, 0).rotation.z = Math.PI / 2;
    for (let i = 0; i < 5; i++) { const x = -0.55 + i * 0.28; add(k, r, box(0.24, 0.6, 0.06), ['#c0392b', '#2e86de', '#f2c94c', '#16a085', hex(pal[0])][i], x, 1.1, 0).rotation.y = (i - 2) * 0.15; add(k, r, tor(0.05, 0.01, 4, 10, Math.PI), '#888', x, 1.44, 0); }
    add(k, g, box(0.7, 0.45, 0.25), '#8a5a3a', 0.4, 0.23, 0.6, { roughness: 0.6 }); add(k, g, box(0.55, 0.35, 0.22), '#3d6b8a', -0.35, 0.18, 0.65); return { rad: 0.95, h: 1.6 }; },
  bookstore(k, g, pal) { const cs = ['#c0392b', '#2e86de', '#f2c94c', '#16a085', hex(pal[0]), '#8e44ad'];
    for (let i = 0; i < 6; i++) { const b = add(k, g, box(0.9 - i * 0.04, 0.16, 0.65), cs[i], (i % 2) * 0.05, 0.08 + i * 0.17, 0); b.rotation.y = (i - 2.5) * 0.08; add(k, g, box(0.86 - i * 0.04, 0.12, 0.63), '#fbf7ee', 0.02 + (i % 2) * 0.05, 0.08 + i * 0.17, 0).rotation.y = b.rotation.y; }
    const open = new THREE.Group(); open.position.set(0.25, 1.1, 0.05); g.add(open);
    for (const s of [-1, 1]) { const p = add(k, open, box(0.45, 0.03, 0.6), '#fbf7ee', s * 0.23, 0, 0); p.rotation.z = s * -0.25; }
    k.anim.push((t) => { open.rotation.y = Math.sin(t * 0.4) * 0.2; }); return { rad: 0.8, h: 1.4 }; },
  petshop(k, g, pal) { const bone = new THREE.Group(); bone.position.set(-0.2, 0.25, 0.3); bone.rotation.y = 0.5; g.add(bone); add(k, bone, cyl(0.12, 0.12, 1.0, 14), '#fbf3e0', 0, 0, 0).rotation.z = Math.PI / 2;
    for (const x of [-0.5, 0.5]) for (const z of [-0.1, 0.1]) add(k, bone, sph(0.17), '#fbf3e0', x, 0, z);
    const tw = new THREE.Group(); tw.position.set(0.55, 0, -0.35); g.add(tw); add(k, tw, cyl(0.07, 0.07, 1.6, 8), '#d9b77c', 0, 0.8, 0, { roughness: 1 });
    [[0.4, 0.3], [0.3, 0.9], [0.35, 1.6]].forEach(([r, y]) => add(k, tw, cyl(r, r, 0.08, 16), hex(pal[0]), 0, y, 0)); add(k, tw, box(0.4, 0.3, 0.4), hex(pal[1]), 0, 0.5, 0); return { rad: 0.95, h: 1.7 }; },
  stationery(k, g, pal) { const p = new THREE.Group(); p.position.set(-0.2, 0.18, 0); p.rotation.z = Math.PI / 2 - 0.15; g.add(p);
    add(k, p, cyl(0.17, 0.17, 1.4, 6), '#f2c94c', 0, 0, 0); add(k, p, new THREE.ConeGeometry(0.17, 0.35, 6), '#f4d9a8', 0, 0.87, 0); add(k, p, new THREE.ConeGeometry(0.06, 0.12, 6), '#2b2b2b', 0, 1.0, 0);
    add(k, p, cyl(0.17, 0.17, 0.12, 6), '#c9ced3', 0, -0.76, 0, { metalness: 0.6 }); add(k, p, cyl(0.17, 0.17, 0.18, 12), '#f29bb0', 0, -0.9, 0);
    const nb = add(k, g, box(0.7, 0.08, 0.9), hex(pal[0]), 0.5, 0.05, 0.55); nb.rotation.y = -0.3; add(k, g, box(0.66, 0.06, 0.86), '#fbf7ee', 0.5, 0.1, 0.55).rotation.y = -0.3;
    for (let i = 0; i < 4; i++) { const c = add(k, g, cyl(0.05, 0.05, 0.8, 8), ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6'][i], -0.6 + i * 0.12, 0.4, -0.5); c.rotation.z = (i - 1.5) * 0.12; } add(k, g, cyl(0.25, 0.22, 0.4, 16), '#555b60', -0.42, 0.2, -0.5); return { rad: 0.95, h: 1.0 }; },
  gadget(k, g, pal) { const ph = new THREE.Group(); ph.position.set(0, 0.95, 0); ph.rotation.x = -0.15; g.add(ph);
    add(k, ph, box(0.8, 1.6, 0.1), '#22262b', 0, 0, 0, { metalness: 0.5, roughness: 0.3 });
    const sc = k.tex(128, 256, (c) => { const gr = c.createLinearGradient(0, 0, 128, 256); gr.addColorStop(0, hex(pal[0])); gr.addColorStop(1, hex(pal[1])); c.fillStyle = gr; c.fillRect(0, 0, 128, 256); c.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 12; i++) c.fillRect(14 + (i % 4) * 26, 40 + Math.floor(i / 4) * 30, 18, 18); c.fillRect(30, 20, 68, 6); });
    add(k, ph, new THREE.PlaneGeometry(0.72, 1.48), new THREE.MeshBasicMaterial({ map: sc, toneMapped: false }), 0, 0, 0.052);
    add(k, g, box(0.5, 0.15, 0.3), '#3a3f44', 0, 0.08, 0.05); add(k, g, box(0.08, 0.3, 0.08), '#3a3f44', 0, 0.25, -0.05);
    const hp = new THREE.Group(); hp.position.set(0.75, 0.5, 0.3); g.add(hp); add(k, hp, tor(0.3, 0.04, 8, 24, Math.PI), '#e8e8e8', 0, 0, 0); for (const x of [-0.3, 0.3]) add(k, hp, cyl(0.12, 0.12, 0.1, 16), hex(pal[0]), x, -0.02, 0).rotation.z = Math.PI / 2;
    k.anim.push((t) => { hp.rotation.y = t * 0.6; hp.position.y = 0.5 + Math.sin(t * 1.4) * 0.08; }); return { rad: 1.0, h: 1.8 }; },
  baby(k, g, pal) { const h = new THREE.Group(); h.position.set(-0.2, 0, 0); g.add(h); const ro = add(k, h, tor(0.55, 0.04, 6, 24, Math.PI * 0.55), '#a8754a', 0, 0.55, 0); ro.rotation.set(0, Math.PI / 2, Math.PI * 1.22);
    add(k, h, box(0.8, 0.3, 0.3), hex(pal[0]), 0, 0.5, 0); add(k, h, box(0.3, 0.35, 0.25), hex(pal[0]), 0.4, 0.8, 0); add(k, h, box(0.12, 0.25, 0.27), '#7a5236', 0.25, 0.95, 0);
    for (const x of [-0.25, 0.25]) for (const z of [-0.1, 0.1]) add(k, h, cyl(0.04, 0.04, 0.35, 6), hex(pal[0]), x, 0.25, z);
    k.anim.push((t) => { h.rotation.z = Math.sin(t * 1.6) * 0.15; });
    ['A', 'B', 'C'].forEach((l, i) => { const t = k.tex(64, 64, (c) => { c.fillStyle = ['#e74c3c', '#f2c94c', '#3498db'][i]; c.fillRect(0, 0, 64, 64); c.fillStyle = '#fff'; c.font = '800 44px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(l, 32, 35); }); add(k, g, box(0.3, 0.3, 0.3), new THREE.MeshStandardMaterial({ map: t }), 0.55 + (i === 2 ? 0.15 : i * 0.32), 0.15 + (i === 2 ? 0.3 : 0), 0.45).rotation.y = i * 0.3; });
    return { rad: 1.0, h: 1.2 }; },
  camping(k, g, pal) { const s = new THREE.Shape(); s.moveTo(-0.75, 0); s.lineTo(0.75, 0); s.lineTo(0, 1.1); const tg = new THREE.ExtrudeGeometry(s, { depth: 1.3, bevelEnabled: false }); tg.translate(0, 0, -0.65);
    add(k, g, tg, hex(pal[0]), 0, 0, 0, { side: THREE.DoubleSide, roughness: 0.8 }); add(k, g, new THREE.CircleGeometry(0.3, 3), '#2b2b2b', 0, 0.3, 0.651).rotation.z = Math.PI / 2;
    const ln = add(k, g, cyl(0.1, 0.1, 0.25, 10), k.glow('#ffd88a', 2), 0.95, 0.15, 0.5); add(k, g, cyl(0.12, 0.12, 0.04, 10), '#2b2b2b', 0.95, 0.3, 0.5);
    if (k.night) { const l = new THREE.PointLight(0xffc46b, 2.5, 3.5); l.position.set(0.95, 0.4, 0.5); g.add(l); } ln.castShadow = false;
    for (let i = 0; i < 2; i++) add(k, g, cyl(0.18, 0.18, 0.3, 14), '#3a5a40', -1.0, 0.15, -0.3 + i * 0.45).rotation.x = Math.PI / 2; return { rad: 1.1, h: 1.2 }; },
  eyewear(k, g, pal) { const e = new THREE.Group(); e.position.set(0, 1.2, 0); g.add(e);
    for (const x of [-0.42, 0.42]) { add(k, e, tor(0.32, 0.05, 10, 32), '#22262b', x, 0, 0); add(k, e, new THREE.CircleGeometry(0.3, 32), glass('#bfe3ff', 0.35), x, 0, 0); }
    add(k, e, tor(0.1, 0.04, 8, 16, Math.PI), '#22262b', 0, 0.05, 0); for (const x of [-0.74, 0.74]) add(k, e, box(0.05, 0.05, 0.8), '#22262b', x, 0.05, -0.4);
    add(k, g, cyl(0.04, 0.04, 1.0, 8), '#c9ced3', 0, 0.5, -0.2, { metalness: 0.6 }); add(k, g, cyl(0.35, 0.4, 0.1, 20), hex(pal[0]), 0, 0.05, -0.2);
    k.anim.push((t) => { e.rotation.y = Math.sin(t * 0.5) * 0.4; }); return { rad: 0.9, h: 1.6 }; },
  // ---- 手作 ----
  leather(k, g, pal) { const sp = add(k, g, cyl(0.45, 0.45, 0.9, 24), '#a0612e', 0, 0.45, 0, { roughness: 0.7 }); add(k, g, cyl(0.47, 0.47, 0.06, 24), '#5a3418', 0, 0.45, 0);
    const roll = add(k, g, cyl(0.25, 0.25, 1.2, 20), '#8b4f24', 0.8, 0.25, 0.2, { roughness: 0.8 }); roll.rotation.z = Math.PI / 2; roll.rotation.y = 0.4;
    const nd = add(k, g, cyl(0.02, 0.005, 1.4, 6), '#d9dde0', -0.6, 0.8, 0.2, { metalness: 0.8 }); nd.rotation.z = 0.7;
    const th = add(k, g, tor(0.4, 0.012, 4, 30, Math.PI * 1.4), hex(pal[2]), -0.4, 0.9, 0.2); th.rotation.y = 0.4; sp.castShadow = true; return { rad: 1.0, h: 1.4 }; },
  soap(k, g, pal) { const cs = [hex(pal[0]), '#fbf3e0', hex(pal[1]), '#d9c2ef'];
    for (let i = 0; i < 4; i++) add(k, g, box(0.7, 0.22, 0.45), cs[i], (i % 2) * 0.1 - 0.05, 0.11 + i * 0.23, 0, { roughness: 0.35 }).rotation.y = i * 0.35;
    bubbles(k, g, 10, { r: 0.8, h: 2.0, size: 0.16 }); return { rad: 0.8, h: 1.3 }; },
  candle(k, g, pal) { const fl = [];
    [[0, 1.3, 0.3], [0.45, 0.9, 0.24], [-0.4, 0.7, 0.26]].forEach(([x, h, r], i) => { add(k, g, cyl(r, r, h, 20), i ? hex(pal[i]) : '#fbf3e0', x, h / 2, i ? 0.2 : 0, { roughness: 0.5 }); add(k, g, cyl(0.01, 0.01, 0.1, 4), '#2b2b2b', x, h + 0.05, i ? 0.2 : 0);
      const f = add(k, g, sph(0.06, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffc84a, emissive: 0xff9a1a, emissiveIntensity: 2 }), x, h + 0.16, i ? 0.2 : 0, false); f.scale.y = 1.8; fl.push(f); });
    if (k.night) { const l = new THREE.PointLight(0xffb84d, 3, 4); l.position.set(0, 1.6, 0.1); g.add(l); }
    k.anim.push((t) => fl.forEach((f, i) => { f.scale.y = 1.7 + Math.sin(t * 11 + i * 2) * 0.3; f.position.x += Math.sin(t * 7 + i) * 0.0004; })); return { rad: 0.75, h: 1.6 }; },
  pottery(k, g, pal) { add(k, g, box(0.8, 0.45, 0.7), '#8b8580', 0, 0.22, 0); const wh = add(k, g, cyl(0.38, 0.38, 0.06, 24), '#bfc5ca', 0, 0.48, 0, { metalness: 0.3 });
    const vase = add(k, g, lathe([[0, 0], [0.18, 0], [0.26, 0.18], [0.2, 0.42], [0.12, 0.55], [0.16, 0.62], [0, 0.62]]), '#b5694e', 0, 0.51, 0, { roughness: 0.9 });
    k.anim.push((t) => { wh.rotation.y = vase.rotation.y = t * 4; });
    const kiln = new THREE.Group(); kiln.position.set(-0.85, 0, -0.3); g.add(kiln); add(k, kiln, dome(0.5, 18, 10), '#a8644a', 0, 0, 0, { flatShading: true });
    add(k, kiln, cyl(0.08, 0.1, 0.6, 8), '#8b8580', 0.15, 0.7, 0); puffs(k, kiln, 0.15, 1.0, 0, { n: 4, size: 0.1, rise: 0.9, opacity: 0.5 });
    add(k, kiln, box(0.25, 0.2, 0.05), new THREE.MeshStandardMaterial({ color: 0xff7a1a, emissive: 0xff5a00, emissiveIntensity: 1.2 }), 0, 0.12, 0.48, false); return { rad: 1.1, h: 1.3 }; },
  silver(k, g) { const ring = new THREE.Group(); ring.position.set(0, 1.0, 0); g.add(ring); add(k, ring, tor(0.45, 0.09, 16, 48), '#e6e9ec', 0, 0, 0, { metalness: 1, roughness: 0.15 });
    const gem = add(k, ring, new THREE.OctahedronGeometry(0.2, 0), '#bfe8ff', 0, 0.6, 0, { metalness: 0.2, roughness: 0.05, transparent: true, opacity: 0.85, emissive: C('#7fd0ff'), emissiveIntensity: k.night ? 0.8 : 0.2 }); gem.scale.y = 1.3;
    add(k, ring, cyl(0.06, 0.08, 0.12, 6), '#e6e9ec', 0, 0.45, 0, { metalness: 1, roughness: 0.15 });
    add(k, g, cyl(0.35, 0.45, 0.5, 20), '#2b2f33', 0, 0.25, 0); add(k, g, cyl(0.3, 0.3, 0.02, 20), '#6b1f2a', 0, 0.51, 0);
    k.anim.push((t) => { ring.rotation.y = t * 0.7; ring.position.y = 1.05 + Math.sin(t * 1.2) * 0.06; }); return { rad: 0.6, h: 1.9 }; },
  woodwork(k, g) { const w = k.m('#b07b4f', { roughness: 0.8 });
    for (const x of [-0.35, 0.35]) for (const s of [-1, 1]) { const l = add(k, g, box(0.06, 0.7, 0.06), w, x + s * 0.12, 0.33, 0); l.rotation.z = s * 0.3; }
    const log = add(k, g, cyl(0.2, 0.2, 1.3, 14), '#8a5a3a', 0, 0.7, 0); log.rotation.z = Math.PI / 2; add(k, g, cyl(0.17, 0.17, 0.01, 14), '#e2c08a', 0.66, 0.7, 0).rotation.z = Math.PI / 2;
    const ch = new THREE.Group(); ch.position.set(0.15, 0, 0.75); ch.rotation.y = -0.5; g.add(ch); add(k, ch, box(0.5, 0.06, 0.5), w, 0, 0.45, 0);
    for (const x of [-0.21, 0.21]) for (const z of [-0.21, 0.21]) add(k, ch, box(0.05, 0.45, 0.05), w, x, 0.22, z); add(k, ch, box(0.5, 0.45, 0.05), w, 0, 0.7, -0.22);
    for (let i = 0; i < 6; i++) add(k, g, box(0.06, 0.02, 0.04), '#e2c08a', -0.5 + k.rnd(), 0.02, -0.3 + k.rnd() * 0.5); return { rad: 1.0, h: 1.0 }; },
  tailor(k, g, pal) { const df = new THREE.Group(); df.position.set(-0.35, 0, 0); g.add(df); add(k, df, cyl(0.03, 0.03, 0.8, 8), '#555b60', 0, 0.4, 0); add(k, df, cyl(0.25, 0.3, 0.05, 16), '#555b60', 0, 0.02, 0);
    add(k, df, lathe([[0, 0], [0.24, 0], [0.32, 0.25], [0.24, 0.5], [0.3, 0.75], [0.12, 0.85], [0, 0.85]]), hex(pal[0]), 0, 0.75, 0); add(k, df, cyl(0.06, 0.06, 0.12, 10), '#a8754a', 0, 1.66, 0);
    const sm = new THREE.Group(); sm.position.set(0.55, 0, 0.2); g.add(sm); add(k, sm, box(0.7, 0.08, 0.35), '#ffffff', 0, 0.45, 0); add(k, sm, box(0.12, 0.35, 0.2), '#ffffff', 0.25, 0.66, 0); add(k, sm, box(0.55, 0.12, 0.2), '#ffffff', 0, 0.82, 0);
    add(k, sm, cyl(0.02, 0.02, 0.15, 6), '#c9ced3', -0.22, 0.7, 0); add(k, sm, cyl(0.08, 0.08, 0.06, 12), '#c0392b', 0.32, 0.92, 0).rotation.z = Math.PI / 2;
    add(k, sm, box(0.6, 0.4, 0.3), '#a8754a', 0, 0.2, 0); return { rad: 0.95, h: 1.75 }; },
  indigo(k, g) { for (const [x, z] of [[-0.45, 0.25], [0.15, 0.4]]) { add(k, g, cyl(0.3, 0.25, 0.5, 18), '#7a5a3a', x, 0.25, z, { roughness: 0.9 }); add(k, g, cyl(0.28, 0.28, 0.02, 18), '#1f3f7a', x, 0.49, z, { roughness: 0.2 }); }
    for (const x of [-0.8, 0.8]) add(k, g, cyl(0.03, 0.03, 1.6, 6), '#8a5a3a', x, 0.8, -0.35); add(k, g, cyl(0.02, 0.02, 1.6, 6), '#8a5a3a', 0, 1.55, -0.35).rotation.z = Math.PI / 2;
    const cl = [];
    for (let i = 0; i < 3; i++) { const t = k.tex(64, 128, (c) => { c.fillStyle = ['#1f3f7a', '#3d6bb0', '#22406a'][i]; c.fillRect(0, 0, 64, 128); c.fillStyle = 'rgba(255,255,255,.55)'; for (let j = 0; j < 6; j++) { c.beginPath(); c.arc(16 + (j % 2) * 32, 12 + j * 20, 7, 0, TAU); c.fill(); } });
      const m = add(k, g, new THREE.PlaneGeometry(0.42, 0.9, 1, 6), new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide, roughness: 0.9 }), -0.5 + i * 0.5, 1.08, -0.35); cl.push(m); }
    k.anim.push((t) => cl.forEach((m, i) => { m.rotation.x = Math.sin(t * 1.5 + i) * 0.12; })); return { rad: 1.0, h: 1.7 }; },
  // ---- 花藝 ----
  flower(k, g, pal) { const wrap = add(k, g, new THREE.ConeGeometry(0.45, 1.1, 16, 1, true), hex(pal[0]), 0, 0.55, 0, { side: THREE.DoubleSide, roughness: 0.6 }); wrap.rotation.x = Math.PI;
    add(k, g, tor(0.16, 0.05, 8, 16), '#ffffff', 0, 0.35, 0).rotation.x = Math.PI / 2;
    const fs = ['#ff7aa2', '#ffd34e', '#ffffff', hex(pal[2]), '#e8384f'];
    for (let i = 0; i < 14; i++) { const a = i * 2.4, r = (i % 4) * 0.12; add(k, g, k.g('lmbloom', () => new THREE.IcosahedronGeometry(0.14, 1)), fs[i % fs.length], Math.cos(a) * r, 1.15 + (3 - (i % 4)) * 0.08, Math.sin(a) * r, { flatShading: true }); }
    for (let i = 0; i < 6; i++) add(k, g, new THREE.ConeGeometry(0.06, 0.35, 4), '#4fa452', Math.cos(i) * 0.35, 1.05, Math.sin(i) * 0.35).rotation.set(Math.sin(i) * 0.6, 0, Math.cos(i) * 0.6); return { rad: 0.6, h: 1.5 }; },
  succulent(k, g) { add(k, g, cyl(0.5, 0.38, 0.55, 20), '#c2734a', 0, 0.28, 0); add(k, g, cyl(0.47, 0.47, 0.04, 20), '#6b4a2a', 0, 0.54, 0);
    const cm = k.m('#4f9a5a', { roughness: 0.7 }); add(k, g, new THREE.CapsuleGeometry(0.14, 0.9, 4, 10), cm, 0, 1.1, 0);
    const arm = (s, y) => { add(k, g, new THREE.CapsuleGeometry(0.09, 0.2, 4, 8), cm, s * 0.2, y, 0).rotation.z = Math.PI / 2; add(k, g, new THREE.CapsuleGeometry(0.09, 0.3, 4, 8), cm, s * 0.3, y + 0.2, 0); };
    arm(1, 1.0); arm(-1, 1.2); add(k, g, sph(0.05), '#ff7aa2', 0, 1.66, 0);
    for (let i = 0; i < 3; i++) { const r = new THREE.Group(); r.position.set(0.85, 0, -0.3 + i * 0.4); g.add(r); add(k, r, cyl(0.15, 0.12, 0.18, 12), '#e0d6c8', 0, 0.09, 0);
      for (let j = 0; j < 7; j++) { const l = add(k, r, new THREE.ConeGeometry(0.05, 0.16, 5), ['#8fc9a0', '#b8d99a', '#d9a3c9'][i], Math.cos(j) * 0.06, 0.22, Math.sin(j) * 0.06); l.rotation.set(Math.sin(j) * 0.8, 0, Math.cos(j) * 0.8); } }
    return { rad: 1.0, h: 1.75 }; },
  // ---- 服務 ----
  nail(k, g, pal) { [[0, hex(pal[0]), 1.2], [0.5, '#e8384f', 0.9], [-0.48, hex(pal[2]), 0.8]].forEach(([x, c, h]) => {
      add(k, g, box(0.38, h * 0.65, 0.38), glass(c, 0.85), x, h * 0.33, x ? 0.25 : 0); add(k, g, cyl(0.1, 0.12, h * 0.4, 10), '#2b2b2b', x, h * 0.65 + h * 0.2, x ? 0.25 : 0, { roughness: 0.3 }); });
    return { rad: 0.8, h: 1.5 }; },
  salon(k, g) { add(k, g, cyl(0.2, 0.2, 0.12, 20), '#c9ced3', 0, 0.06, 0, { metalness: 0.6 }); add(k, g, cyl(0.22, 0.22, 0.1, 20), '#c9ced3', 0, 1.75, 0, { metalness: 0.6 }); add(k, g, sph(0.2, 16, 10), '#c9ced3', 0, 1.88, 0, { metalness: 0.6 });
    const st = k.tex(64, 128, (c) => { c.fillStyle = '#fff'; c.fillRect(0, 0, 64, 128); for (let i = -4; i < 12; i++) { c.fillStyle = i % 2 ? '#e8384f' : '#2e5aa8'; c.beginPath(); c.moveTo(0, i * 16); c.lineTo(64, i * 16 - 32); c.lineTo(64, i * 16 - 24); c.lineTo(0, i * 16 + 8); c.fill(); } });
    st.wrapS = st.wrapT = THREE.RepeatWrapping; st.repeat.set(1, 2);
    add(k, g, cyl(0.17, 0.17, 1.6, 24), new THREE.MeshStandardMaterial({ map: st, roughness: 0.3, emissive: C(k.night ? '#ffffff' : '#000000'), emissiveMap: k.night ? st : null, emissiveIntensity: 0.6 }), 0, 0.9, 0);
    add(k, g, cyl(0.19, 0.19, 1.6, 24, 1), glass('#ffffff', 0.25), 0, 0.9, 0); k.anim.push((t) => { st.offset.y = -t * 0.4; });
    const sc = new THREE.Group(); sc.position.set(0.7, 0.05, 0.3); g.add(sc); for (const s of [-1, 1]) { const b = add(k, sc, box(0.08, 0.02, 0.7), '#d9dde0', 0, 0.02, 0, { metalness: 0.9, roughness: 0.2 }); b.rotation.y = s * 0.25; add(k, sc, tor(0.1, 0.025, 6, 16), '#2b2b2b', s * 0.12, 0.02, -0.42).rotation.x = Math.PI / 2; }
    return { rad: 0.9, h: 2.1 }; },
  lash(k, g, pal) { const mr = new THREE.Group(); mr.position.set(0, 0, 0); g.add(mr); add(k, mr, box(1.2, 1.3, 0.08), hex(pal[0]), 0, 1.05, 0); add(k, mr, box(1.05, 1.15, 0.02), '#e9f3fb', 0, 1.05, 0.05, { metalness: 0.9, roughness: 0.05 });
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; add(k, mr, sph(0.05, 8, 6), k.glow('#fff4d0', 2.2), Math.cos(a) * 0.62, 1.05 + Math.sin(a) * 0.68, 0.06, k.night ? {} : {}); }
    const eye = new THREE.Group(); eye.position.set(0, 1.05, 0.07); mr.add(eye); const ew = add(k, eye, sph(0.3, 20, 12), '#ffffff', 0, 0, 0); ew.scale.set(1.3, 0.6, 0.2); add(k, eye, sph(0.12), '#3a2a20', 0, 0, 0.04).scale.z = 0.3;
    for (let i = 0; i < 7; i++) { const l = add(k, eye, box(0.02, 0.14, 0.02), '#1c1c1c', -0.3 + i * 0.1, 0.22, 0.03); l.rotation.z = (i - 3) * -0.18; }
    for (const x of [-0.4, 0.4]) add(k, g, box(0.08, 0.45, 0.08), '#555b60', x, 0.22, 0); add(k, g, box(1.0, 0.06, 0.3), '#555b60', 0, 0.42, 0); return { rad: 0.7, h: 1.8 }; },
  petgroom(k, g, pal) { add(k, g, lathe([[0, 0], [0.55, 0], [0.62, 0.45], [0.58, 0.45], [0.5, 0.06], [0, 0.06]], 32), '#fbfbfb', 0, 0.12, 0, { side: THREE.DoubleSide, roughness: 0.3 }); for (const [x, z] of [[-0.4, -0.3], [0.4, -0.3], [-0.4, 0.3], [0.4, 0.3]]) add(k, g, sph(0.07), '#c9a06b', x, 0.06, z);
    add(k, g, cyl(0.52, 0.52, 0.02, 28), '#bfe8ff', 0, 0.45, 0, { roughness: 0.1 }); for (let i = 0; i < 8; i++) add(k, g, sph(0.12), '#ffffff', Math.cos(i) * 0.35, 0.52, Math.sin(i) * 0.35);
    const dog = new THREE.Group(); dog.position.set(0, 0.5, 0); g.add(dog); add(k, dog, sph(0.18), '#e8c38a', 0, 0.1, 0); add(k, dog, sph(0.13), '#e8c38a', 0, 0.3, 0.1); for (const x of [-0.08, 0.08]) add(k, dog, box(0.05, 0.12, 0.04), '#c9a06b', x, 0.38, 0.06);
    add(k, dog, sph(0.025), '#2b2b2b', 0, 0.3, 0.23); bubbles(k, g, 8, { r: 0.5, h: 1.6, size: 0.12 }); k.anim.push((t) => { dog.rotation.y = Math.sin(t * 1.2) * 0.5; }); return { rad: 0.8, h: 1.2 }; },
  photo(k, g, pal) { for (let i = 0; i < 3; i++) { const l = add(k, g, cyl(0.025, 0.025, 1.3, 6), '#2b2b2b', 0, 0.62, 0); l.rotation.set(Math.cos(i / 3 * TAU) * 0.3, 0, Math.sin(i / 3 * TAU) * 0.3); }
    const cam = new THREE.Group(); cam.position.set(0, 1.35, 0); g.add(cam); add(k, cam, box(0.7, 0.45, 0.35), '#22262b', 0, 0, 0, { roughness: 0.4 }); add(k, cam, box(0.25, 0.15, 0.3), '#22262b', -0.15, 0.28, 0);
    const lens = add(k, cam, cyl(0.17, 0.2, 0.35, 24), '#3a3f44', 0.05, 0, 0.32, { metalness: 0.6 }); lens.rotation.x = Math.PI / 2; add(k, cam, new THREE.CircleGeometry(0.15, 24), glass('#5fa8d3', 0.8), 0.05, 0, 0.5);
    const fl = add(k, cam, box(0.18, 0.1, 0.05), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0 }), 0.22, 0.3, 0.1, false);
    add(k, cam, box(0.08, 0.04, 0.08), hex(pal[0]), 0.25, 0.25, -0.05);
    k.anim.push((t) => { const u = t % 4; fl.material.emissiveIntensity = u < 0.12 ? 4 : 0; cam.rotation.y = Math.sin(t * 0.3) * 0.3; }); return { rad: 0.7, h: 1.7 }; },
  yoga(k, g, pal) { add(k, g, box(1.6, 0.12, 1.2), '#c99a6b', 0, 0.06, 0, { roughness: 0.8 }); for (let i = 0; i < 2; i++) add(k, g, box(0.35, 0.02, 0.9), [hex(pal[0]), hex(pal[2])][i], -0.35 + i * 0.7, 0.13, 0);
    const lo = new THREE.Group(); lo.position.set(0, 0.45, -0.75); g.add(lo); for (let i = 0; i < 8; i++) { const p = add(k, lo, sph(0.14, 10, 8), '#f7b6cf', Math.cos(i / 8 * TAU) * 0.12, 0, Math.sin(i / 8 * TAU) * 0.12); p.scale.set(0.6, 1.4, 0.4); p.rotation.set(0.5 * Math.sin(i / 8 * TAU), i / 8 * TAU, 0.5 * Math.cos(i / 8 * TAU)); }
    add(k, lo, sph(0.07), '#ffd34e', 0, 0.05, 0); add(k, g, cyl(0.3, 0.35, 0.3, 16), '#8b8580', 0, 0.15, -0.75); k.anim.push((t) => { lo.rotation.y = t * 0.3; }); return { rad: 1.0, h: 0.8 }; },
  fitness(k, g, pal) { const db = (x, z, s = 1) => { const d = new THREE.Group(); d.position.set(x, 0.18 * s, z); g.add(d); add(k, d, cyl(0.04, 0.04, 0.6 * s, 8), '#c9ced3', 0, 0, 0, { metalness: 0.8 }).rotation.z = Math.PI / 2; for (const sx of [-1, 1]) add(k, d, cyl(0.17 * s, 0.17 * s, 0.12 * s, 6), '#22262b', sx * 0.25 * s, 0, 0).rotation.z = Math.PI / 2; return d; };
    const big = db(0, 0, 2.2); big.position.y = 0.4; k.anim.push((t) => { big.position.y = 0.42 + Math.max(0, Math.sin(t * 1.5)) * 0.35; });
    for (const x of [-0.85, 0.85]) add(k, g, box(0.12, 0.9, 0.12), '#3a3f44', x, 0.45, -0.2);
    db(-0.4, 0.75); db(0.4, 0.75); add(k, g, sph(0.2, 14, 10), hex(pal[0]), 0.95, 0.2, 0.55); add(k, g, tor(0.08, 0.03, 6, 12), hex(pal[0]), 0.95, 0.42, 0.55); return { rad: 1.1, h: 1.4 }; },
  music(k, g) { const pi = new THREE.Group(); g.add(pi); const s = new THREE.Shape(); s.moveTo(-0.6, -0.4); s.lineTo(0.6, -0.4); s.lineTo(0.6, 0.1); s.bezierCurveTo(0.6, 0.6, 0.1, 0.6, 0.0, 0.5); s.bezierCurveTo(-0.3, 0.4, -0.6, 0.6, -0.6, 0.2); s.lineTo(-0.6, -0.4);
    const body = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: false }); body.rotateX(Math.PI / 2); add(k, pi, body, '#1c1c1e', 0, 0.85, 0, { roughness: 0.2, metalness: 0.3 });
    const keys = k.tex(256, 32, (c) => { c.fillStyle = '#fff'; c.fillRect(0, 0, 256, 32); c.fillStyle = '#111'; for (let i = 0; i < 26; i++) { c.fillRect(i * 10, 0, 1, 32); if ([1, 2, 4, 5, 6].includes(i % 7)) c.fillRect(i * 10 - 3, 0, 6, 18); } });
    add(k, pi, box(1.2, 0.04, 0.2), new THREE.MeshStandardMaterial({ map: keys }), 0, 0.6, -0.5); for (const [x, z] of [[-0.5, -0.3], [0.5, -0.3], [0, 0.4]]) add(k, pi, cyl(0.04, 0.04, 0.55, 8), '#1c1c1e', x, 0.28, z);
    const lid = add(k, pi, body.clone(), '#1c1c1e', 0, 0.88, 0, { roughness: 0.2 }); lid.scale.y = 0.08; lid.rotation.x = -0.5; lid.position.z = 0.2;
    const notes = []; for (let i = 0; i < 4; i++) { const n = new THREE.Group(); add(k, n, sph(0.07, 10, 8), '#2b2b2b', 0, 0, 0).scale.set(1.2, 0.9, 0.5); add(k, n, box(0.015, 0.28, 0.015), '#2b2b2b', 0.07, 0.14, 0); g.add(n); notes.push(n); }
    k.anim.push((t) => notes.forEach((n, i) => { const u = (t * 0.25 + i / 4) % 1; n.position.set(0.3 + Math.sin(u * 6 + i) * 0.3, 1.0 + u * 1.3, -0.2); n.scale.setScalar(Math.sin(u * Math.PI)); })); return { rad: 0.8, h: 1.6 }; },
  cleaning(k, g, pal) { add(k, g, lathe([[0, 0], [0.32, 0], [0.4, 0.55], [0.38, 0.55], [0.3, 0.04], [0, 0.04]], 24), hex(pal[0]), 0, 0, 0, { side: THREE.DoubleSide }); add(k, g, cyl(0.37, 0.37, 0.02, 20), '#bfe8ff', 0, 0.45, 0);
    add(k, g, tor(0.36, 0.015, 4, 24, Math.PI), '#555b60', 0, 0.55, 0); const mop = new THREE.Group(); mop.position.set(0.15, 0.35, 0); mop.rotation.z = -0.35; g.add(mop); add(k, mop, cyl(0.025, 0.025, 1.6, 8), '#a8754a', 0, 0.8, 0);
    for (let i = 0; i < 10; i++) add(k, mop, cyl(0.02, 0.02, 0.3, 4), '#f4efe4', Math.cos(i) * 0.06, 0, Math.sin(i) * 0.06);
    bubbles(k, g, 10, { r: 0.6, h: 1.8, size: 0.13 }); const sp = add(k, g, box(0.2, 0.35, 0.12), '#2ecc71', -0.55, 0.18, 0.3); add(k, g, box(0.1, 0.08, 0.2), '#2b2b2b', -0.55, 0.38, 0.36); sp.castShadow = true; return { rad: 0.8, h: 1.9 }; },
  bnb(k, g, pal) { for (const x of [-0.8, 0.8]) { add(k, g, cyl(0.06, 0.08, 1.4, 6), '#a7835a', x, 0.7, 0); for (let i = 0; i < 5; i++) { const f = add(k, g, new THREE.ConeGeometry(0.1, 0.6, 4), '#3fae4f', x, 1.4, 0); f.geometry.translate(0, 0.3, 0); f.rotation.set(0, i / 5 * TAU, 1.9, 'YXZ'); } }
    const hm = add(k, g, new THREE.CylinderGeometry(0.78, 0.78, 0.5, 20, 1, true, Math.PI * 0.75, Math.PI * 0.5), hex(pal[0]), 0, 1.25, 0, { side: THREE.DoubleSide }); hm.rotation.z = Math.PI / 2;
    const st = k.stripes(hex(pal[0]), '#ffffff', 6); hm.material = new THREE.MeshStandardMaterial({ map: st, side: THREE.DoubleSide, roughness: 0.8 });
    k.anim.push((t) => { hm.rotation.x = Math.sin(t * 1.1) * 0.12; }); return { rad: 1.0, h: 1.8 }; },
  phonefix(k, g, pal) { const ph = add(k, g, box(0.75, 0.08, 1.4), '#22262b', 0, 0.3, 0, { metalness: 0.4 }); ph.rotation.x = -0.2;
    const pcb = add(k, g, box(0.6, 0.02, 1.1), '#1f7a4a', 0, 0.37, 0.02); pcb.rotation.x = -0.2; for (let i = 0; i < 6; i++) { const c = add(k, g, box(0.12, 0.04, 0.12), ['#2b2b2b', '#c9ced3', '#f2c94c'][i % 3], -0.15 + (i % 2) * 0.3, 0.42 - Math.floor(i / 2) * 0.06, -0.35 + Math.floor(i / 2) * 0.33, { metalness: 0.5 }); c.rotation.x = -0.2; }
    const sd = new THREE.Group(); sd.position.set(0.7, 0.9, 0.2); sd.rotation.z = 0.8; g.add(sd); add(k, sd, cyl(0.08, 0.1, 0.5, 12), hex(pal[0]), 0, 0.25, 0); add(k, sd, cyl(0.025, 0.025, 0.6, 8), '#d9dde0', 0, -0.3, 0, { metalness: 0.9 });
    add(k, g, box(0.75, 0.04, 1.4), glass('#bfe3ff', 0.4), -0.65, 0.12, 0.2).rotation.y = 0.5; k.anim.push((t) => { sd.rotation.y = t * 2; }); return { rad: 1.0, h: 1.4 }; },
  carcare(k, g, pal) { for (const x of [-0.75, 0.75]) add(k, g, box(0.15, 1.5, 0.3), hex(pal[0]), x, 0.75, 0); add(k, g, box(1.65, 0.2, 0.32), hex(pal[0]), 0, 1.55, 0);
    const br = []; for (const x of [-0.5, 0.5]) { const b = add(k, g, cyl(0.2, 0.2, 1.1, 14), '#3d8bd3', x, 0.65, 0, { roughness: 1 }); br.push(b); }
    k.anim.push((t) => br.forEach((b, i) => { b.rotation.y = t * (i ? 6 : -6); }));
    const car = new THREE.Group(); car.position.set(0, 0, 0.9); car.rotation.y = Math.PI / 2; g.add(car); add(k, car, box(0.5, 0.18, 1.0), '#e8e8e8', 0, 0.2, 0, { metalness: 0.4, roughness: 0.2 }); add(k, car, box(0.44, 0.16, 0.5), '#24313d', 0, 0.36, -0.05);
    bubbles(k, g, 8, { r: 0.6, h: 1.4, size: 0.12 }); return { rad: 1.1, h: 1.8 }; },
  // ---- 農產 ----
  veggiebox(k, g, pal) { const t = new THREE.Group(); t.rotation.y = 0.4; g.add(t); add(k, t, box(0.6, 0.4, 1.0), '#c0392b', 0, 0.55, 0); add(k, t, box(0.5, 0.5, 0.45), '#c0392b', 0, 0.95, -0.2); add(k, t, box(0.46, 0.3, 0.02), glass('#bfe3ff', 0.5), 0, 1.0, 0.03);
    for (const s of [-1, 1]) { const w = add(k, t, cyl(0.35, 0.35, 0.18, 18), '#2b2b2b', s * 0.38, 0.35, -0.3); w.rotation.z = Math.PI / 2; const f = add(k, t, cyl(0.2, 0.2, 0.14, 14), '#2b2b2b', s * 0.33, 0.2, 0.4); f.rotation.z = Math.PI / 2; }
    add(k, t, cyl(0.04, 0.04, 0.5, 8), '#555', 0.15, 1.1, 0.35); puffs(k, t, 0.15, 1.4, 0.35, { n: 3, size: 0.08, rise: 0.6, opacity: 0.45 });
    const cr = add(k, g, box(0.6, 0.3, 0.45), '#c99a6b', -0.85, 0.15, 0.4, { roughness: 1 }); for (let i = 0; i < 6; i++) add(k, g, sph(0.09), ['#2ecc71', '#e67e22', '#e74c3c'][i % 3], -1.05 + (i % 3) * 0.2, 0.36, 0.3 + Math.floor(i / 3) * 0.2); cr.castShadow = true; return { rad: 1.15, h: 1.3 }; },
  honey(k, g) { const hx = new THREE.CylinderGeometry(0.22, 0.22, 0.3, 6);
    for (const [x, y] of [[0, 0.9], [0.38, 0.9], [-0.38, 0.9], [0.19, 1.22], [-0.19, 1.22], [0.19, 0.58], [-0.19, 0.58]]) { const c = add(k, g, hx, '#f2b632', x, y, 0, { roughness: 0.4 }); c.rotation.x = Math.PI / 2; add(k, g, cyl(0.16, 0.16, 0.02, 6), '#e08e0b', x, y, 0.16).rotation.x = Math.PI / 2; }
    add(k, g, cyl(0.04, 0.04, 0.6, 6), '#8a5a3a', 0, 0.3, 0);
    const jar = new THREE.Group(); jar.position.set(0.75, 0, 0.45); g.add(jar); add(k, jar, cyl(0.25, 0.22, 0.5, 16), glass('#f2a51a', 0.8), 0, 0.25, 0); add(k, jar, cyl(0.26, 0.26, 0.08, 16), '#c0392b', 0, 0.54, 0);
    const drip = add(k, jar, sph(0.05), '#f2a51a', 0.2, 0.4, 0.1, { roughness: 0.1 }); k.anim.push((t) => { const u = (t * 0.4) % 1; drip.position.y = 0.45 - u * 0.4; drip.scale.y = 1 + u; });
    const bees = []; for (let i = 0; i < 4; i++) { const b = add(k, g, sph(0.05, 8, 6), '#2b2b2b', 0, 0, 0, false); bees.push(b); } k.anim.push((t) => bees.forEach((b, i) => { const a = t * (1.5 + i * 0.3) + i * 1.6; b.position.set(Math.sin(a) * 0.7, 1.0 + Math.sin(t * 3 + i) * 0.25, Math.cos(a * 1.2) * 0.5 + 0.2); }));
    return { rad: 0.95, h: 1.5 }; },
  // 精品燕窩：洋紅描金底座、青瓷盤上的大燕盞、停在盞邊的雨燕、金蓋鮮燉瓶與緩緩轉動的金環
  birdnest(k, g) {
    const gold = k.m('#d9b56b', { metalness: 0.65, roughness: 0.3 }), jade = k.m('#b8146a', { roughness: 0.45 });
    add(k, g, cyl(0.62, 0.7, 0.5, 32), jade, 0, 0.25, 0); add(k, g, cyl(0.66, 0.66, 0.05, 32), gold, 0, 0.5, 0); add(k, g, cyl(0.72, 0.72, 0.04, 32), gold, 0, 0.02, 0);
    add(k, g, lathe([[0, 0], [0.3, 0], [0.62, 0.08], [0.66, 0.12], [0.6, 0.11], [0.3, 0.04], [0, 0.04]], 32), '#a9cbbd', 0, 0.52, 0, { roughness: 0.25, side: THREE.DoubleSide });
    const st = k.tex ? k.tex(256, 128, (q, w, h) => { q.fillStyle = '#f3e4c4'; q.fillRect(0, 0, w, h); q.strokeStyle = 'rgba(170,135,80,.55)'; q.lineWidth = 2; for (let i = 0; i < 14; i++) { q.beginPath(); for (let x = 0; x <= w; x += 8) q.lineTo(x, i * 9 + 4 + Math.sin(x * 0.08 + i) * 2.4); q.stroke(); } }) : null;
    const nm = st ? new THREE.MeshStandardMaterial({ map: st, roughness: 0.7, side: THREE.DoubleSide }) : k.m('#f3e4c4', { side: THREE.DoubleSide });
    // 燕盞：半個淺碗（貼牆那面是平的），斜放在盤上
    const cup = new THREE.Mesh(new THREE.SphereGeometry(0.5, 28, 14, -Math.PI / 2, Math.PI, Math.PI * 0.5, Math.PI * 0.42), nm); cup.scale.set(1, 0.85, 1.25); cup.rotation.set(-0.25, 0, 0); cup.position.set(0, 1.08, -0.08); cup.castShadow = true; g.add(cup);
    const wall = new THREE.Mesh(new THREE.CircleGeometry(0.5, 28, 0, Math.PI), nm); wall.rotation.set(Math.PI / 2 - 0.25, 0, 0); wall.scale.set(1, 1.25, 1); wall.position.copy(cup.position); g.add(wall);
    // 停在盞邊的雨燕
    const bird = new THREE.Group(); bird.position.set(0.3, 1.16, 0.32); bird.rotation.y = -0.8; g.add(bird);
    const bm = k.m('#2e333d', { roughness: 0.6 });
    const body = add(k, bird, sph(0.08, 10, 8), bm, 0, 0.06, 0); body.scale.set(1, 0.9, 2.4);
    add(k, bird, sph(0.055, 10, 8), bm, 0, 0.1, 0.15); add(k, bird, sph(0.03, 8, 6), '#f3e4c4', 0, 0.06, 0.17);
    for (const sx of [-1, 1]) { const w = add(k, bird, box(0.05, 0.02, 0.36), bm, sx * 0.07, 0.09, -0.08); w.rotation.set(0.15, sx * 0.12, sx * 0.2); }
    const tail = add(k, bird, box(0.1, 0.01, 0.14), bm, 0, 0.04, -0.24); k.anim.push((t) => { bird.rotation.z = Math.sin(t * 2.2) * 0.05; tail.rotation.y = Math.sin(t * 3) * 0.2; });
    // 金蓋鮮燉瓶
    const jar = new THREE.Group(); jar.position.set(-0.55, 0.52, 0.35); g.add(jar);
    add(k, jar, cyl(0.15, 0.15, 0.36, 18), glass('#fff3d6', 0.7), 0, 0.18, 0); add(k, jar, cyl(0.12, 0.12, 0.28, 16), '#f3e3c0', 0, 0.16, 0, { roughness: 0.4 }); add(k, jar, cyl(0.16, 0.16, 0.08, 18), gold, 0, 0.4, 0);
    add(k, jar, box(0.18, 0.1, 0.01), jade, 0, 0.18, 0.152);
    // 緩緩轉動的金環＋閃光
    const ring = add(k, g, tor(0.86, 0.018, 6, 64), gold, 0, 1.25, 0, false); ring.rotation.x = Math.PI / 2 - 0.3;
    const sp = []; for (let i = 0; i < 5; i++) { const s2 = add(k, g, k.g('lmspark', () => new THREE.OctahedronGeometry(0.06, 0)), k.m('#ffe7a8', { emissive: C('#ffd07a'), emissiveIntensity: 1.2 }), 0, 0, 0, false); sp.push(s2); }
    k.anim.push((t) => { ring.rotation.z = t * 0.4; sp.forEach((s2, i) => { const a = t * 0.6 + i * 1.26; s2.position.set(Math.cos(a) * 0.86, 1.25 + Math.sin(a) * 0.86 * Math.sin(0.3), Math.sin(a) * 0.86 * Math.cos(0.3)); s2.rotation.y = t * 2 + i; }); });
    return { rad: 0.95, h: 2.1 }; },
};
// 中文名稱（給測試與工作室顯示）
export const LANDMARK_NAMES = {
  pho: '河粉大碗', bento: '大便當盒', brunch: '荷包蛋平底鍋', luwei: '滷味推車', dumpling: '蒸籠塔', ramen: '拉麵大碗', chef: '銀色餐蓋', coffee: '烘豆機',
  bubbletea: '珍奶大杯', teahouse: '大茶壺', craftbeer: '木酒桶', juice: '柳橙切片', amei: '草莓蛋糕塔', bakery: '麵包窯', gelato: '冰淇淋甜筒', mooncake: '大月餅與玉兔',
  chocolate: '巧克力噴泉', select: '大購物袋', vintage: '古著衣架', bookstore: '書堆', petshop: '狗骨頭與貓爬架', stationery: '大鉛筆', gadget: '大手機與耳機', baby: '搖搖木馬',
  camping: '帳篷營燈', eyewear: '大眼鏡', leather: '皮革卷與針線', soap: '手工皂堆與泡泡', candle: '香氛蠟燭', pottery: '拉坯轆轤與窯', silver: '戒指與寶石', woodwork: '鋸木台與木椅',
  tailor: '縫紉機與人台', indigo: '染缸與晾布', flower: '大花束', succulent: '仙人掌盆', nail: '指甲油瓶', salon: '理髮旋轉燈', lash: '化妝鏡', petgroom: '泡泡浴缸',
  photo: '相機三腳架', yoga: '瑜伽平台與蓮花', fitness: '大啞鈴', music: '鋼琴與音符', cleaning: '水桶拖把', bnb: '棕櫚吊床', phonefix: '拆開的手機', carcare: '洗車門架', veggiebox: '拖拉機', honey: '蜂巢與蜂蜜罐', birdnest: '燕盞與雨燕',
};
export const hasLandmark = (id) => !!B[id];
// 建造業主的招牌地標；回傳 { group, rad, h }（沒有專屬地標時回傳 null）
export function buildLandmark(id, k, pal) {
  const fn = B[id]; if (!fn) return null;
  const g = new THREE.Group();
  const { rad, h } = fn(k, g, pal) || { rad: 0.9, h: 1.5 };
  g.traverse(n => { if (n.isMesh && n.castShadow === undefined) n.castShadow = true; });
  return { group: g, rad, h };
}
