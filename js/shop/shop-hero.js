// 銷售網頁 three.js 主視覺：依業態換主角物件（甜點馬卡龍塔、咖啡杯、皮件、花朵、甲油瓶、湯碗、禮盒、水果），配色跟著風格變
import * as THREE from 'three';
import { TENANT } from '../tenant.js';
import { PRODUCTS } from '../data.js';
import { productArt } from '../art.js';

function softDot() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.5, 'rgba(255,255,255,0.8)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const C = (c) => new THREE.Color(c);
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, ...o });
const phys = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.4, clearcoat: 0.3, ...o });

// ---- 甜點 ----
function macaron(color, fill = 0xfff6e8) {
  const g = new THREE.Group();
  const shellMat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.55, sheen: 1, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.5, clearcoat: 0.15 });
  const shellGeo = new THREE.SphereGeometry(0.62, 40, 24);
  const top = new THREE.Mesh(shellGeo, shellMat); top.scale.set(1, 0.42, 1); top.position.y = 0.2;
  const bot = new THREE.Mesh(shellGeo, shellMat); bot.scale.set(1, 0.36, 1); bot.position.y = -0.2;
  const footMat = std(new THREE.Color(color).multiplyScalar(0.92), { roughness: 0.95 });
  const foot1 = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.06, 10, 40), footMat); foot1.rotation.x = Math.PI / 2; foot1.position.y = 0.11;
  const foot2 = foot1.clone(); foot2.position.y = -0.11;
  const cream = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.16, 40), std(fill, { roughness: 0.4 }));
  g.add(top, bot, foot1, foot2, cream);
  return g;
}
function lemonSlice() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.09, 40), std(0xf2c230)));
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.1, 40), phys(0xfff1a0, { roughness: 0.25 })));
  for (let i = 0; i < 8; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.11, 0.02), std(0xfffbe0)); s.rotation.y = i / 8 * Math.PI; g.add(s); }
  return g;
}
function strawberry() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 18), phys(0xe8384f, { roughness: 0.3, clearcoat: 0.6 }));
  body.scale.set(1, 1.25, 1);
  const pos = body.geometry.attributes.position; const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); if (v.y < 0.05) { const k = Math.max(0.08, 1 + (v.y - 0.05) * 2.4); v.x *= k; v.z *= k; } pos.setXYZ(i, v.x, v.y, v.z); }
  body.geometry.computeVertexNormals(); g.add(body);
  for (let i = 0; i < 6; i++) { const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 6), std(0x3f9a4f)); leaf.position.set(Math.cos(i) * 0.12, 0.4, Math.sin(i) * 0.12); leaf.rotation.z = Math.cos(i) * 1.2; leaf.rotation.x = Math.sin(i) * 1.2; g.add(leaf); }
  return g;
}
// ---- 其他業態的主角 ----
function lathe(points, mat) { return new THREE.Mesh(new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), 48), mat); }
function cup(pal) {
  const g = new THREE.Group();
  const body = lathe([[0.0, -0.7], [0.62, -0.7], [0.78, -0.4], [0.86, 0.5], [0.8, 0.52], [0.72, -0.35], [0.0, -0.6]], phys(pal[4] || 0xfffaf2, { side: THREE.DoubleSide }));
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.8, 40), std(0x3b2416, { roughness: 0.2 })); coffee.rotation.x = -Math.PI / 2; coffee.position.y = 0.38;
  const art = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 8, 30), std(0xf2d3a0)); art.rotation.x = -Math.PI / 2; art.position.y = 0.39;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.08, 12, 30, Math.PI * 1.3), phys(pal[4] || 0xfffaf2)); handle.position.set(0.9, 0.05, 0); handle.rotation.z = -Math.PI * 0.65;
  const saucer = lathe([[0, -0.78], [1.3, -0.74], [1.4, -0.64], [1.2, -0.7], [0, -0.72]], phys(pal[1] || 0xe8c07d, { side: THREE.DoubleSide }));
  g.add(body, coffee, art, handle, saucer);
  return g;
}
function bean(color) {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 14), phys(color, { roughness: 0.35 })); b.scale.set(1, 0.7, 1.35); g.add(b);
  const groove = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), std(new THREE.Color(color).multiplyScalar(0.35))); groove.scale.set(0.12, 0.2, 1.25); groove.position.y = 0.13; g.add(groove);
  return g;
}
function roundedBox(w, h, d, r, mat) {
  const s = new THREE.Shape(); const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const geo = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 4 }); geo.center();
  return new THREE.Mesh(geo, mat);
}
function wallet(pal) {
  const g = new THREE.Group();
  const body = roundedBox(2.2, 1.4, 0.22, 0.18, std(pal[0], { roughness: 0.75 })); g.add(body);
  const flap = roundedBox(0.8, 0.5, 0.1, 0.2, std(new THREE.Color(pal[0]).multiplyScalar(0.7), { roughness: 0.7 })); flap.position.set(0.8, 0, 0.17); g.add(flap);
  const snap = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 20), std(0xd9b25f, { metalness: 0.8, roughness: 0.25 })); snap.rotation.x = Math.PI / 2; snap.position.set(0.95, 0, 0.24); g.add(snap);
  const card = roundedBox(1.4, 0.9, 0.03, 0.06, std(pal[4] || 0xf2e7d4)); card.position.set(-0.2, 0.55, -0.1); card.rotation.z = 0.12; g.add(card);
  return g;
}
function flowerHead(petal, center, n = 10) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 14), phys(petal, { roughness: 0.5, sheen: 1 })); const a = i / n * Math.PI * 2; p.scale.set(1, 0.18, 0.55); p.position.set(Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5); p.rotation.y = -a; p.rotation.z = 0.25; g.add(p); }
  const c = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 14), std(center, { roughness: 0.8 })); c.scale.set(1, 0.6, 1); c.position.y = 0.08; g.add(c);
  return g;
}
function flower(pal) {
  const g = new THREE.Group();
  const head = flowerHead(pal[0], pal[3] || 0xffd27a, 12); head.rotation.x = 1.1; head.position.y = 0.4; head.scale.setScalar(1.25); g.add(head);
  const inner = flowerHead(pal[1], pal[3] || 0xffd27a, 8); inner.rotation.x = 1.1; inner.position.set(0, 0.47, 0.12); inner.scale.setScalar(0.75); g.add(inner);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.2, 10), std(0x5c8e57)); stem.position.y = -0.8; g.add(stem);
  for (const s of [-1, 1]) { const lf = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 10), std(0x6fa36b)); lf.scale.set(1, 0.12, 0.4); lf.position.set(s * 0.32, -1, 0); lf.rotation.z = s * 0.5; g.add(lf); }
  return g;
}
function bottle(pal) {
  const g = new THREE.Group();
  const glass = roundedBox(1.0, 1.1, 0.7, 0.25, phys(0xffffff, { transmission: 0.6, thickness: 0.5, roughness: 0.05, transparent: true, opacity: 0.6 })); g.add(glass);
  const liquid = roundedBox(0.8, 0.85, 0.5, 0.2, phys(pal[0], { roughness: 0.15 })); liquid.position.y = -0.06; g.add(liquid);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.2, 20), phys(0xffffff, { transparent: true, opacity: 0.6 })); neck.position.y = 0.66; g.add(neck);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.95, 24), phys(0x2b2430, { roughness: 0.2 })); cap.position.y = 1.2; g.add(cap);
  return g;
}
function bowl(pal) {
  const g = new THREE.Group();
  const b = lathe([[0, -0.75], [0.55, -0.75], [0.6, -0.68], [1.25, 0.2], [1.3, 0.3], [1.22, 0.3], [0.55, -0.62], [0, -0.62]], phys(0xffffff, { side: THREE.DoubleSide }));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.27, 0.035, 8, 60), std(0x3d6fb6)); rim.rotation.x = Math.PI / 2; rim.position.y = 0.28;
  const soup = new THREE.Mesh(new THREE.CircleGeometry(1.2, 48), phys(pal[0], { roughness: 0.15 })); soup.rotation.x = -Math.PI / 2; soup.position.y = 0.16;
  g.add(b, rim, soup);
  for (let i = 0; i < 5; i++) { const n = new THREE.Mesh(new THREE.TorusGeometry(0.35 + i * 0.1, 0.025, 6, 30, Math.PI * 1.2), std(0xfff4d8)); n.rotation.x = -Math.PI / 2; n.rotation.z = i; n.position.y = 0.19; g.add(n); }
  for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 10), std(pal[2] || 0xc0392b, { roughness: 0.7 })); m.scale.set(1, 0.15, 0.7); m.position.set(-0.4 + i * 0.35, 0.22, 0.25 - i * 0.1); m.rotation.y = i; g.add(m); }
  for (const s of [0, 1]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 2.6, 8), std(0x7a4b2f)); c.position.set(0.5 + s * 0.18, 0.7, 0); c.rotation.z = 1.1; c.rotation.y = 0.3; g.add(c); }
  return g;
}
function giftBox(pal) {
  const g = new THREE.Group();
  const box = roundedBox(1.5, 1.2, 1.2, 0.08, phys(pal[0], { roughness: 0.4 })); g.add(box);
  const lid = roundedBox(1.62, 0.3, 1.32, 0.06, phys(new THREE.Color(pal[0]).multiplyScalar(0.92))); lid.position.y = 0.7; g.add(lid);
  const rib = std(pal[1] || 0xffffff, { roughness: 0.3, metalness: 0.2 });
  const r1 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.56, 1.36), rib); r1.position.y = 0.1; g.add(r1);
  const r2 = new THREE.Mesh(new THREE.BoxGeometry(1.66, 1.56, 0.22), rib); r2.position.y = 0.1; g.add(r2);
  for (const s of [-1, 1]) { const bow = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.08, 10, 24), rib); bow.position.set(s * 0.25, 1.05, 0); bow.rotation.y = Math.PI / 2; bow.rotation.x = s * 0.5; g.add(bow); }
  return g;
}
function fruit(color) {
  const g = new THREE.Group();
  const f = new THREE.Mesh(new THREE.SphereGeometry(0.45, 28, 20), phys(color, { roughness: 0.35, clearcoat: 0.5 })); f.scale.set(1, 0.92, 1); g.add(f);
  const st = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.2, 6), std(0x6b4a2a)); st.position.y = 0.48; g.add(st);
  const lf = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), std(0x4f9a5e)); lf.scale.set(1, 0.15, 0.5); lf.position.set(0.15, 0.52, 0); lf.rotation.z = 0.5; g.add(lf);
  return g;
}

// 專屬模型只給原本 6 家；其他業態用「自己的商品插圖」做成浮動的 3D 卡片與圓盤
const KIND_BY_TENANT = { amei: 'dessert', coffee: 'cup', leather: 'craft', flower: 'flower', nail: 'bottle', pho: 'bowl' };

// ---- 商品插圖貼圖（快取解碼後的 SVG 圖片） ----
const imgCache = new Map();
function artImage(pid) {
  if (imgCache.has(pid)) return imgCache.get(pid);
  const svg = productArt(pid, 256).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  const pr = new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
  imgCache.set(pid, pr); return pr;
}
function faceTexture(img, bg, tint, round) {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, S, S);
  const r = g.createRadialGradient(S / 2, S * 0.52, 10, S / 2, S / 2, S * 0.62);
  r.addColorStop(0, tint + '66'); r.addColorStop(1, tint + '00'); g.fillStyle = r; g.fillRect(0, 0, S, S);
  if (img) { const m = round ? 34 : 20; g.drawImage(img, m, m, S - 2 * m, S - 2 * m); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function roundedShape(w, h, r) {
  const s = new THREE.Shape(); const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
let shadowTex = null;
function shadowTexture() {
  if (shadowTex) return shadowTex;
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const r = g.createRadialGradient(64, 64, 4, 64, 64, 62); r.addColorStop(0, 'rgba(0,0,0,0.38)'); r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128); shadowTex = new THREE.CanvasTexture(c); return shadowTex;
}
// 浮動商品卡（圓角方塊）或圓盤：正面貼商品插圖，側邊用風格色，後方柔和陰影
function productPiece(pid, { disc, size, edge, bg, tint, img }) {
  const g = new THREE.Group(); const d = 0.16;
  const edgeMat = phys(edge, { roughness: 0.35, clearcoat: 0.6 });
  if (disc) {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(size / 2, size / 2, d, 48), edgeMat); body.rotation.x = Math.PI / 2; g.add(body);
    const face = new THREE.Mesh(new THREE.CircleGeometry(size / 2 * 0.94, 48), new THREE.MeshBasicMaterial({ map: faceTexture(img, bg, tint, true), toneMapped: false })); face.position.z = d / 2 + 0.002; g.add(face);
  } else {
    const sh = roundedShape(size, size, size * 0.16);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3 }); geo.translate(0, 0, -d / 2);
    g.add(new THREE.Mesh(geo, edgeMat));
    const fg = new THREE.ShapeGeometry(roundedShape(size * 0.94, size * 0.94, size * 0.14), 8);
    const pos = fg.attributes.position, uv = fg.attributes.uv; const w = size * 0.94;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / w + 0.5);
    const face = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ map: faceTexture(img, bg, tint, false), toneMapped: false })); face.position.z = d / 2 + 0.035; g.add(face);
  }
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(size * 1.5, size * 1.5), new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }));
  shadow.position.set(0.12, -0.18, -0.45); g.add(shadow);
  g.userData.pid = pid;
  return g;
}

export function createShopHero(host, { cat, center: centerless = false, card = '#ffffff' } = {}) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { host.classList.add('no-webgl'); return null; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100); camera.position.set(0, 0.3, 9);
  const hemi = new THREE.HemisphereLight(0xfff4e6, 0xf0c8d8, 1.6); scene.add(hemi);
  const dl = new THREE.DirectionalLight(0xffffff, 2.2); dl.position.set(3, 5, 6); scene.add(dl);
  const pl = new THREE.PointLight(0xffb0c8, 20, 20); pl.position.set(-3, -1, 3); scene.add(pl);
  const kind = KIND_BY_TENANT[TENANT.id] || 'products';
  const mobile = () => host.getBoundingClientRect().width < 600;
  let buildId = 0;

  let root = new THREE.Group(); scene.add(root);
  let items = [], sprinkles = null;
  const rng = (() => { let a = 7; return () => { a = (a * 16807) % 2147483647; return a / 2147483647; }; })();
  const add = (obj, x, y, z, s = 1, spin = 0.4) => { obj.position.set(x, y, z); obj.scale.setScalar(s); obj.rotation.set(0.5 + rng() * 0.4, rng() * 6, (rng() - 0.5) * 0.6); root.add(obj); items.push({ obj, base: obj.position.clone(), ph: rng() * 6, spin: spin * (rng() < 0.5 ? -1 : 1), rot0: obj.rotation.clone() }); };
  const center = (obj, s = 1.3, tilt = 0.32) => { obj.scale.setScalar(centerless ? s * 0.8 : s); obj.rotation.x = tilt; if (centerless) obj.position.z = -3; root.add(obj); items.push({ obj, base: new THREE.Vector3(0, 0, centerless ? -3 : 0), ph: 0, spin: 0.25, tower: true }); };
  const SAT = [[-2.6, 1.5, -1, 0.9], [2.5, -1.6, 0.2, 0.85], [2.7, 1.9, -2, 0.7], [-2.4, -1.5, 0.6, 1.0], [1.2, 2.5, -1.5, 0.7], [2.1, 0.4, 1.2, 0.9], [-1.5, 2.6, -2.5, 0.8], [-3.2, -0.1, -1.8, 0.75]];

  function build(look) {
    // 清除舊物件
    buildId++;
    root.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.map && m.map !== dotTex && m.map !== shadowTex) m.map.dispose(); m.dispose(); }); });
    scene.remove(root); root = new THREE.Group(); scene.add(root); items = [];
    const pal = (look.pal || []).map(c => C(c).getHex());
    while (pal.length < 6) pal.push(0xffffff);
    if (kind === 'dessert') {
      const tower = new THREE.Group();
      [pal[0], pal[1], pal[2]].forEach((c, i) => { const m = macaron(c, i === 1 ? 0xffffff : 0xfff6e8); m.position.y = i * 0.98 - 0.98; m.rotation.set((i - 1) * 0.08, i, (i - 1) * 0.06); tower.add(m); });
      center(tower);
      add(macaron(pal[3]), ...SAT[0]); add(macaron(pal[4]), ...SAT[1]); add(macaron(pal[5]), ...SAT[2]);
      add(lemonSlice(), ...SAT[3], 0.6); add(lemonSlice(), ...SAT[4], 0.5); add(strawberry(), ...SAT[5], 0.5); add(strawberry(), ...SAT[6], 0.5); add(strawberry(), ...SAT[7], 0.5);
    } else if (kind === 'cup') {
      center(cup(pal), 1.35, 0.42);
      SAT.forEach((p, i) => add(i % 3 === 2 ? (() => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), phys(0xffffff, { roughness: 0.6 })); return m; })() : bean(i % 2 ? pal[0] : pal[3]), p[0], p[1], p[2], p[3] * 1.6, 0.6));
    } else if (kind === 'craft') {
      center(wallet(pal), 1.2, 0.3);
      SAT.forEach((p, i) => {
        let o;
        if (i % 3 === 0) { o = new THREE.Group(); o.add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.4, 20), std(pal[(i + 1) % 6], { roughness: 0.9 }))); const r1 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 20), std(0xc9a77a)); r1.position.y = 0.22; const r2 = r1.clone(); r2.position.y = -0.22; o.add(r1, r2); }
        else if (i % 3 === 1) o = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.06, 12, 30), std(0xd9b25f, { metalness: 0.85, roughness: 0.25 }));
        else o = roundedBox(0.7, 0.45, 0.05, 0.08, std(pal[(i + 2) % 6], { roughness: 0.7 }));
        add(o, ...p, 0.5);
      });
    } else if (kind === 'flower') {
      center(flower(pal), 1.1, 0.15);
      SAT.forEach((p, i) => { const f = flowerHead(pal[i % 3], pal[3] || 0xffd27a, 6 + (i % 3)); add(f, p[0], p[1], p[2], p[3] * 0.7, 0.5); });
    } else if (kind === 'bottle') {
      center(bottle(pal), 1.15, 0.15);
      SAT.forEach((p, i) => { if (i % 2) add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 16), phys(0xfffaf5, { roughness: 0.15, clearcoat: 1, sheen: 1 })), ...p, 0.5); else { const b = bottle([pal[(i + 1) % 6]]); add(b, p[0], p[1], p[2], p[3] * 0.38, 0.5); } });
    } else if (kind === 'bowl') {
      center(bowl(pal), 1.25, 0.55);
      SAT.forEach((p, i) => {
        let o;
        if (i % 3 === 0) { o = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), std(0x4f9a5e)); o.scale.set(1, 0.15, 0.5); }
        else if (i % 3 === 1) o = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.06, 10, 24), std(pal[2] || 0xc0392b));
        else { o = new THREE.Group(); o.add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 24), std(0x9cc84a))); const pulp = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.09, 24), phys(0xe2f3b0)); o.add(pulp); }
        add(o, ...p, 0.6);
      });
    } else if (kind === 'fruit') {
      const cl = new THREE.Group(); [[0, 0, 0, pal[0]], [0.85, -0.2, 0.3, pal[1]], [-0.8, -0.25, 0.25, pal[2]], [0.1, -0.35, 0.9, pal[3]]].forEach(([x, y, z, c]) => { const f = fruit(c); f.position.set(x, y, z); cl.add(f); });
      center(cl, 1.25, 0.2);
      SAT.forEach((p, i) => add(fruit(pal[(i + 1) % 6]), p[0], p[1], p[2], p[3] * 0.75, 0.5));
    } else if (kind === 'products') {
      // 業主自己的商品插圖：主角大卡＋5 個衛星（手機 4 個）
      const myId = ++buildId;
      const ids = PRODUCTS.slice(0, mobile() ? 4 : 6).map(p => p.id);
      const vars = look.vars || {};
      const POS = centerless
        ? [[-3.6, 1.2, -0.6, 1.25], [3.6, 1.1, -0.4, 1.3], [-3.2, -1.6, 0.2, 1.05], [3.3, -1.7, 0.1, 1.1], [-1.6, 2.6, -2.2, 0.8], [1.8, -2.7, -1.5, 0.85]]
        : [[0, 0.1, 0.4, 2.6], [-2.5, 1.6, -1, 1.15], [2.6, -1.7, 0.2, 1.1], [2.7, 1.8, -1.6, 0.95], [-2.6, -1.6, 0.4, 1.05], [-0.4, 2.7, -2.4, 0.8]];
      Promise.all(ids.map(artImage)).then(imgs => {
        if (myId !== buildId) return;
        ids.forEach((pid, i) => {
          const [x, y, z, sz] = POS[i];
          const piece = productPiece(pid, { disc: i % 2 === 1, size: sz, edge: pal[i % 6], bg: vars.card || card, tint: (PRODUCTS[i].color || '#cccccc').slice(0, 7), img: imgs[i] });
          piece.position.set(x, y, z);
          piece.rotation.set((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.25);
          root.add(piece);
          items.push({ obj: piece, base: piece.position.clone(), ph: i * 1.3, spin: 0, sway: true, rot0: piece.rotation.clone(), main: !centerless && i === 0 });
          if (window.gsap) window.gsap.from(piece.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.8, delay: 0.08 * i, ease: 'back.out(1.7)' });
        });
      });
    } else {
      center(giftBox(pal), 1.1, 0.35);
      SAT.forEach((p, i) => add(i % 2 ? giftBox([pal[(i + 2) % 6], pal[(i + 3) % 6]]) : new THREE.Mesh(new THREE.SphereGeometry(0.25, 20, 14), phys(pal[(i + 1) % 6], { roughness: 0.2 })), p[0], p[1], p[2], p[3] * (i % 2 ? 0.35 : 0.9), 0.5));
    }
    // 粒子
    const N = mobile() ? 120 : 260; const pg = new THREE.BufferGeometry(); const arr = new Float32Array(N * 3); const col = new Float32Array(N * 3);
    const dots = (look.dots && look.dots.length ? look.dots : ['#ffffff']).map(c => C(c));
    for (let i = 0; i < N; i++) { arr[i * 3] = (rng() - 0.5) * 12; arr[i * 3 + 1] = (rng() - 0.5) * 7; arr[i * 3 + 2] = (rng() - 0.5) * 6 - 1; const c = dots[i % dots.length]; col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    pg.setAttribute('position', new THREE.BufferAttribute(arr, 3)); pg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    sprinkles = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.09, map: dotTex, vertexColors: true, transparent: true, depthWrite: false, opacity: 0.9 }));
    root.add(sprinkles);
    hemi.color.set(look.sky || 0xfff4e6); hemi.groundColor.set(look.ground || 0xf0c8d8); pl.color.set(look.point || 0xffb0c8);
    renderer.toneMappingExposure = look.dim ? 0.95 : 1.1;
    if (window.gsap) window.gsap.fromTo(root.scale, { x: 0.6, y: 0.6, z: 0.6 }, { x: 1, y: 1, z: 1, duration: 0.9, ease: 'back.out(1.6)' });
  }
  const dotTex = softDot();

  const resize = () => { const r = host.getBoundingClientRect(); renderer.setSize(Math.max(1, r.width), Math.max(1, r.height), false); camera.aspect = r.width / Math.max(1, r.height); camera.position.z = r.width < 600 ? 11 : 9; camera.updateProjectionMatrix(); };
  new ResizeObserver(resize).observe(host); resize();
  let mx = 0, my = 0; window.addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; });
  let visible = true, raf = 0, t = 0, last = performance.now();
  new IntersectionObserver((e) => { visible = e[0].isIntersecting; if (visible) loop(); }).observe(host);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { last = performance.now(); loop(); } });
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    for (const it of items) {
      if (it.tower) { it.obj.rotation.y += dt * 0.35; it.obj.position.y = Math.sin(t * 0.9) * 0.15; continue; }
      if (it.sway) {
        it.obj.position.y = it.base.y + Math.sin(t * 0.7 + it.ph) * (it.main ? 0.12 : 0.2);
        it.obj.rotation.y = it.rot0.y + Math.sin(t * 0.45 + it.ph) * (it.main ? 0.32 : 0.45) + mx * 0.3;
        it.obj.rotation.x = it.rot0.x + Math.cos(t * 0.5 + it.ph) * 0.12 + my * 0.2;
        continue;
      }
      it.obj.position.y = it.base.y + Math.sin(t * 0.8 + it.ph) * 0.18;
      it.obj.position.x = it.base.x + Math.cos(t * 0.5 + it.ph) * 0.08;
      it.obj.rotation.y += dt * it.spin; it.obj.rotation.x = it.rot0.x + Math.sin(t * 0.6 + it.ph) * 0.2;
    }
    if (sprinkles) { sprinkles.rotation.y = t * 0.03; sprinkles.position.y = Math.sin(t * 0.3) * 0.1; }
    camera.position.x += (mx * 1.2 - camera.position.x) * 0.04;
    camera.position.y += (0.3 - my * 0.8 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }
  function loop() { cancelAnimationFrame(raf); const step = (n) => { if (!visible || document.hidden) return; frame(n); raf = requestAnimationFrame(step); }; raf = requestAnimationFrame(step); }
  let lastKey = '';
  const api = {
    kind,
    setLook(look) { const k = JSON.stringify(look || {}); if (k === lastKey) return; lastKey = k; build(look || {}); },
  };
  api.setLook({ pal: ['#f7b2c4', '#b8e0c8', '#f9dc82', '#c9b6ec', '#ffc8a2', '#a8dadc'], dots: ['#f7b2c4', '#2DB674', '#F0A531', '#7C62E6', '#2E97D4', '#ffffff'] });
  loop();
  return api;
}
