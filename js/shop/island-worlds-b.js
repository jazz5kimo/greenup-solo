// 主題世界（二）：禪寺庭園、霓虹電子街、漁港、寵物公園、月夜燈會、大學書街、遊樂園、沙漠綠洲
import * as THREE from 'three';
import { puffs, lamp, bench } from './island-scenes.js';
import { TAU, C, hex, CORE, HERO, canvas, add, grp, box, cyl, sph, cone, dome, gable, nameSign, windowMat, ground, waterPlane, bigTree } from './island-worlds.js';

const HX = (HERO.x0 + HERO.x1) / 2, HZ = (HERO.z0 + HERO.z1) / 2, HW = HERO.x1 - HERO.x0, HD = HERO.z1 - HERO.z0;
function ringOut(k, clear, n, r0, r1, h, rad, make, { front = true } = {}) {
  let c = 0;
  for (let i = 0; i < n * 6 && c < n; i++) { const a = k.rnd() * TAU, r = r0 + k.rnd() * (r1 - r0), x = Math.sin(a) * r, z = Math.cos(a) * r; if (!front && z > 4) continue; if (!clear(x, z, rad, h)) continue; if (make(x, z, a)) c++; }
}
const stripeTex = (a, b, n = 8, v = true) => canvas(128, 128, (g, w, h) => { for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? b : a; if (v) g.fillRect(i * w / n, 0, w / n + 1, h); else g.fillRect(0, i * h / n, w, h / n + 1); } });
// 四角翹起的屋頂（寺廟、涼亭、塔）
function eaveRoof(k, g, w, d, y, h, color, gold) {
  const r = add(k, g, cone(Math.hypot(w, d) / 2 + 0.3, h, 4), k.m(color, { flatShading: true }), 0, y + h / 2, 0); r.rotation.y = Math.PI / 4; r.scale.set(1, 1, d / w);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const t = add(k, g, cone(0.12, 0.6, 5), k.m(gold || color), sx * (w / 2 + 0.25), y + 0.15, sz * (d / 2 + 0.25)); t.rotation.set(sz * -0.9, 0, sx * 0.9); }
  return r;
}

// ================= 禪寺庭園 =================
function zen({ k, world, pal, clear, mobile }) {
  const rake = canvas(256, 256, (g) => { g.fillStyle = '#ece6d6'; g.fillRect(0, 0, 256, 256); g.strokeStyle = 'rgba(150,140,120,.5)'; g.lineWidth = 2; for (let r = 8; r < 190; r += 7) { g.beginPath(); g.arc(128, 128, r, 0, TAU); g.stroke(); } });
  ground(k, world, { color: k.night ? '#2c4a30' : '#5e8a4a', coreTex: rake, edge: '#8b8580', edgeH: 0.3 });
  // 大殿（主建築）：石台基、紅柱、木牆、重簷翹角屋頂、匾額
  const h = grp(HX, 0.12, HZ); world.add(h);
  add(k, h, box(HW + 0.4, 0.6, HD), k.m('#b9b0a3', { flatShading: true }), 0, 0.3, 0);
  add(k, h, box(HW - 1.4, 2.6, HD - 1.4), k.m('#e9dcc4'), 0, 1.9, -0.2);
  for (let i = 0; i < 6; i++) add(k, h, cyl(0.16, 0.16, 2.6, 10), '#a8322a', -3 + i * 1.2, 1.9, HD / 2 - 0.35);
  eaveRoof(k, h, HW + 0.6, HD + 0.2, 3.2, 1.1, '#3a3f44', '#d9b25f');
  add(k, h, box(HW - 2.2, 1.2, HD - 2.2), k.m('#e9dcc4'), 0, 4.9, -0.2); eaveRoof(k, h, HW - 1.2, HD - 1.0, 5.5, 1.3, '#3a3f44', '#d9b25f');
  add(k, h, box(0.15, 0.5, 0.15), '#d9b25f', 0, 7.0, -0.2);
  const sign = nameSign(k, 2.8, 0.6, '#2b1d14', '#d9b25f', '"Noto Serif TC", serif'); sign.position.set(0, 2.9, HD / 2 - 0.3); h.add(sign);
  for (const x of [-0.9, 0.9]) add(k, h, box(0.8, 1.9, 0.05), '#6b2a20', x * 0.5, 1.55, HD / 2 - 0.7);
  // 五重塔
  const pg = grp(-14, 0, -15); world.add(pg); for (let i = 0; i < 5; i++) { const s = 1 - i * 0.13; add(k, pg, box(2.4 * s, 1.3, 2.4 * s), '#a8322a', 0, 0.65 + i * 1.7, 0); eaveRoof(k, pg, 2.8 * s, 2.8 * s, 1.3 + i * 1.7, 0.45, '#2b2f33', '#d9b25f'); } add(k, pg, cyl(0.06, 0.1, 2, 8), '#d9b25f', 0, 9.6, 0);
  // 錦鯉池＋紅色拱橋＋蓮葉
  const px = 13, pz = 0; add(k, world, cyl(4.2, 4.2, 0.05, 40), '#2f6f78', px, 0.03, pz, { roughness: 0.1 });
  const br = add(k, world, new THREE.TorusGeometry(2.6, 0.12, 8, 24, Math.PI), '#c0392b', px, 0, pz); br.rotation.y = Math.PI / 2; add(k, world, box(1.0, 0.1, 5.4), '#c0392b', px, 0.9, pz).scale.set(1, 1, 0.75);
  for (let i = 0; i < 8; i++) add(k, world, cyl(0.35, 0.35, 0.02, 14), '#4f9a45', px + Math.cos(i * 2.1) * 2.8, 0.06, pz + Math.sin(i * 2.1) * 2.8);
  const koi = []; for (let i = 0; i < 6; i++) { const f = add(k, world, sph(0.15, 10, 6), i % 2 ? '#f28c28' : '#ffffff', 0, 0.05, 0, false); f.scale.set(0.6, 0.4, 1.6); koi.push(f); }
  k.anim.push((t) => koi.forEach((f, i) => { const a = t * (0.3 + i * 0.05) + i, r = 1.2 + (i % 3) * 0.8; f.position.set(px + Math.sin(a) * r, 0.05, pz + Math.cos(a) * r); f.rotation.y = a + Math.PI / 2; }));
  // 參道石燈籠、竹林、紅楓
  const st = k.m('#9a958c', { flatShading: true });
  for (let i = 0; i < 12; i++) { const s = i % 2 ? 1 : -1, z = 9.6 + Math.floor(i / 2) * 2.4, x = s * 2.0; const g = grp(x, 0, z); add(k, g, cyl(0.35, 0.45, 0.2, 6), st, 0, 0.1, 0); add(k, g, cyl(0.12, 0.12, 0.9, 6), st, 0, 0.65, 0); add(k, g, box(0.55, 0.45, 0.55), k.night ? k.glow('#ffd88a', 1.6) : st, 0, 1.3, 0); add(k, g, cone(0.55, 0.35, 4), st, 0, 1.7, 0).rotation.y = Math.PI / 4; world.add(g); }
  ringOut(k, clear, mobile ? 5 : 10, 10, 22, 5, 1, (x, z) => { const g = grp(x, 0, z); for (let j = 0; j < 7; j++) { const hh = 3.5 + k.rnd() * 2; add(k, g, cyl(0.07, 0.09, hh, 6), k.night ? '#3d6b3a' : '#7cb342', (k.rnd() - 0.5) * 1.4, hh / 2, (k.rnd() - 0.5) * 1.4); } world.add(g); return 1; }, { front: false });
  ringOut(k, clear, mobile ? 6 : 12, 9.5, 24, 4, 1.2, (x, z) => { world.add(bigTree(k, x, z, 0.7 + k.rnd() * 0.5, k.night ? '#8a3a2a' : ['#d9532c', '#e8763a', '#c0392b'][Math.floor(k.rnd() * 3)])); return 1; });
  for (const [x, z, s] of [[-40, -55, 24], [20, -65, 30]]) add(k, world, cone(s, s * 0.7, 7), k.m(k.night ? '#223a2a' : '#8fa89a', { flatShading: true }), x, s * 0.35, z).castShadow = false;
  return { features: ['寺院大殿', '五重塔', '錦鯉池拱橋', '石燈籠參道', '竹林紅楓'], heroH: 7.2, fog: [26, 100] };
}

// ================= 霓虹電子街（永遠是夜晚） =================
function neon({ k, world, pal, clear, mobile }) {
  const grid = canvas(128, 128, (g) => { g.fillStyle = '#1a1c26'; g.fillRect(0, 0, 128, 128); g.strokeStyle = 'rgba(45,226,230,.35)'; g.lineWidth = 2; for (let i = 0; i <= 128; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke(); } }); grid.wrapS = grid.wrapT = THREE.RepeatWrapping; grid.repeat.set(10, 10);
  ground(k, world, { color: '#101118', coreTex: grid, edge: '#ff3ea5', edgeH: 0.12 });
  const NC = ['#ff3ea5', '#2de2e6', '#f6f740', '#8a5cff', '#3cff7a', hex(pal[0])];
  const glowM = (c, p = 2.6) => new THREE.MeshStandardMaterial({ color: C(c), emissive: C(c), emissiveIntensity: p, roughness: 0.4 });
  const neonBox = (g, w, hh, d, c, y = 0) => { for (const [x, z] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) add(k, g, box(0.08, hh, 0.08), glowM(c), x, y + hh / 2, z, false); for (const yy of [y + hh]) { add(k, g, box(w, 0.08, 0.08), glowM(c), 0, yy, d / 2, false); add(k, g, box(w, 0.08, 0.08), glowM(c), 0, yy, -d / 2, false); add(k, g, box(0.08, 0.08, d), glowM(c), w / 2, yy, 0, false); add(k, g, box(0.08, 0.08, d), glowM(c), -w / 2, yy, 0, false); } };
  // 電玩拉麵大樓（主建築）
  const h = grp(HX, 0.12, HZ); world.add(h);
  add(k, h, box(HW, 6, HD - 0.6), windowMat(k, '#1d2130', HW, 6, { cols: 8, rows: 5, glass: '#2a3550', lit: 0.7, seed: 41 }), 0, 3, -0.3); neonBox(h, HW, 6, HD - 0.6, NC[0]);
  const sign = nameSign(k, 5.6, 1.0, '#0b0d14', NC[1]); sign.position.set(0, 4.8, HD / 2 - 0.25); h.add(sign); add(k, h, box(5.8, 1.2, 0.04), glowM(NC[1], 1.2), 0, 4.8, HD / 2 - 0.32, false);
  for (let i = 0; i < 5; i++) add(k, h, box(0.6, 1.2, 0.02), glowM(NC[(i + 2) % 6], 1.4), -2.4 + i * 1.2, 2.0, HD / 2 - 0.25, false);
  const holo = add(k, h, new THREE.IcosahedronGeometry(1.0, 0), new THREE.MeshStandardMaterial({ color: C(NC[3]), emissive: C(NC[3]), emissiveIntensity: 2, wireframe: true }), 0, 7.6, -0.3, false);
  k.anim.push((t) => { holo.rotation.set(t * 0.6, t, 0); });
  // 霓虹高樓與會變色的看板
  ringOut(k, clear, mobile ? 10 : 22, 13, 42, 30, 3, (x, z, a) => { const hh = 8 + k.rnd() * 22, w = 3 + k.rnd() * 3, g = grp(x, 0, z); g.rotation.y = a + Math.PI; world.add(g);
    add(k, g, box(w, hh, w), windowMat(k, '#14161f', w, hh, { cols: 6, rows: 10, glass: '#20283a', lit: 0.5, seed: Math.floor(k.rnd() * 999) }), 0, hh / 2, 0); neonBox(g, w, hh, w, NC[Math.floor(k.rnd() * 6)]);
    if (k.rnd() < 0.7) { const c1 = NC[Math.floor(k.rnd() * 6)], c2 = NC[Math.floor(k.rnd() * 6)]; const t = canvas(128, 256, (q) => { const gr = q.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, c1); gr.addColorStop(1, c2); q.fillStyle = gr; q.fillRect(0, 0, 128, 256); q.fillStyle = 'rgba(0,0,0,.35)'; for (let i = 0; i < 8; i++) q.fillRect(0, i * 32, 128, 14); }); t.wrapT = THREE.RepeatWrapping;
      const bb = add(k, g, new THREE.PlaneGeometry(w * 0.8, w * 1.4), new THREE.MeshBasicMaterial({ map: t, toneMapped: false }), 0, hh * 0.6, w / 2 + 0.05, false); k.anim.push((tt) => { t.offset.y = tt * 0.1; }); bb.castShadow = false; }
    return 1; }, { front: false });
  // 飛車（發光的膠囊沿環形航道飛）
  const cars = []; for (let i = 0; i < (mobile ? 5 : 10); i++) { const c = NC[i % 6]; const m = add(k, world, new THREE.CapsuleGeometry(0.3, 0.9, 4, 8), glowM(c, 1.8), 0, 0, 0, false); m.rotation.x = Math.PI / 2; cars.push({ m, r: 16 + (i % 3) * 5, y: 9 + (i % 4) * 2.2, s: (i % 2 ? 1 : -1) * (0.15 + k.rnd() * 0.1), o: k.rnd() * TAU }); }
  k.anim.push((t) => cars.forEach(({ m, r, y, s, o }) => { const a = o + t * s; m.position.set(Math.sin(a) * r, y, Math.cos(a) * r - 4); m.rotation.y = a + (s > 0 ? Math.PI / 2 : -Math.PI / 2); m.rotation.x = Math.PI / 2; }));
  // 雨絲
  const N = mobile ? 200 : 450, pa = new Float32Array(N * 6);
  for (let i = 0; i < N; i++) { const x = (k.rnd() - 0.5) * 40, y = k.rnd() * 16, z = (k.rnd() - 0.5) * 40; pa.set([x, y, z, x, y - 0.5, z], i * 6); }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(pa, 3)); world.add(new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.35 })));
  let last = 0; k.anim.push((t) => { const dt = Math.min(0.05, t - last); last = t; const p = rg.attributes.position; for (let i = 0; i < N; i++) { let y = p.getY(i * 2) - dt * 14; if (y < 0) y += 16; p.setY(i * 2, y); p.setY(i * 2 + 1, y - 0.5); } p.needsUpdate = true; });
  // 蒸氣孔、販賣機
  for (const [x, z] of [[-6, 7], [7, 6.5], [-8, -3]]) { add(k, world, cyl(0.35, 0.35, 0.05, 12), '#3a3f44', x, 0.14, z); puffs(k, world, x, 0.2, z, { n: 5, color: 0xbfc8ff, size: 0.35, rise: 2.4, speed: 0.3, opacity: 0.35 }); }
  return { features: ['霓虹大樓', '變色看板', '飛車', '雨', '全息投影'], heroH: 8.6 };
}

// ================= 漁港 =================
function harbor({ k, world, pal, clear, mobile }) {
  ground(k, world, { color: '#c9c4b8', core: '#d9d4c8', edge: '#8d949a' });
  waterPlane(k, world, 170, 340, 97, 0, { color: '#1f6f9e', y: 0.03, speed: [0.01, 0.004] });
  add(k, world, box(1.2, 0.6, 80), '#8d949a', 12.4, 0.2, 0); // 堤岸
  // 魚市場（主建築）：拱形鐵皮屋頂的長倉庫、開放的正面、魚箱
  const h = grp(HX, 0.12, HZ); world.add(h);
  add(k, h, box(HW, 2.6, HD - 0.4), k.m('#e9e4d8'), 0, 1.3, 0);
  const vault = add(k, h, new THREE.CylinderGeometry(HD / 2, HD / 2, HW + 0.4, 24, 1, false, 0, Math.PI), new THREE.MeshStandardMaterial({ map: stripeTex('#7fb3d5', '#6aa0c4', 24), roughness: 0.5, metalness: 0.4, side: THREE.DoubleSide }), 0, 2.6, 0); vault.rotation.set(0, 0, Math.PI / 2); vault.rotation.order = 'ZXY'; vault.rotation.x = -Math.PI / 2;
  add(k, h, box(HW - 1.6, 1.9, 0.05), k.m('#2b2f33'), 0, 0.95, HD / 2 - 0.18);
  const cs = ['#2e86de', '#e74c3c', '#f1c40f', '#ecf0f1'];
  for (let i = 0; i < 8; i++) { add(k, h, box(0.6, 0.3, 0.45), cs[i % 4], -2.4 + (i % 4) * 1.6, 0.15 + Math.floor(i / 4) * 0.3, HD / 2 + 0.4); add(k, h, sph(0.12, 8, 6), '#9fb4c8', -2.4 + (i % 4) * 1.6, 0.35 + Math.floor(i / 4) * 0.3, HD / 2 + 0.4).scale.set(1.8, 0.5, 0.8); }
  const sign = nameSign(k, 4.6, 0.7, '#1f3b5a', '#ffffff'); sign.position.set(0, 2.25, HD / 2 - 0.12); h.add(sign);
  // 港口起重機、貨櫃
  for (const [x, z] of [[10.5, -15], [10.5, -23]]) { const g = grp(x, 0, z); g.rotation.y = Math.PI / 2; const rM = k.m('#c0392b'), wM = k.m('#f4f4f4'); for (const [lx, lz] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) add(k, g, box(0.3, 9, 0.3), (lx > 0) ? rM : wM, lx, 4.5, lz);
    add(k, g, box(3.4, 0.6, 3.4), rM, 0, 9.2, 0); const arm = add(k, g, box(0.5, 0.5, 14), wM, 0, 9.8, 4); arm.castShadow = true; add(k, g, box(0.05, 4, 0.05), '#333', 0, 7.6, 9); world.add(g); }
  for (let i = 0; i < (mobile ? 10 : 18); i++) { const x = -26 + (i % 6) * 2.7, z = -16 - Math.floor(i / 6) * 3.2, y = (i % 2) * 1.4; add(k, world, box(2.4, 1.3, 6), ['#e74c3c', '#2e86de', '#f39c12', '#16a085', '#8e44ad'][i % 5], x, 0.65 + y, z, { roughness: 0.6 }); }
  // 防波堤燈塔
  add(k, world, box(14, 0.8, 2.2), '#9aa3ab', 20, 0.2, 6, { flatShading: true });
  const lt = grp(27, 0.6, 6); world.add(lt); add(k, lt, cyl(0.7, 1.0, 6, 16), new THREE.MeshStandardMaterial({ map: stripeTex('#c0392b', '#ffffff', 6, false) }), 0, 3, 0); add(k, lt, cyl(0.8, 0.8, 0.8, 12), k.glow('#fff4c4', 2.6), 0, 6.4, 0); add(k, lt, cone(0.9, 0.8, 12), '#2b2f33', 0, 7.2, 0);
  if (k.night) { const piv = grp(0, 6.4, 0); lt.add(piv); const bm = add(k, piv, new THREE.ConeGeometry(1.5, 12, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff4c4, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }), 6, 0, 0, false); bm.geometry.translate(0, -6, 0); bm.rotation.z = Math.PI / 2; k.anim.push((t) => { piv.rotation.y = t * 0.6; }); }
  // 停泊的漁船
  const boats = []; for (let i = 0; i < (mobile ? 3 : 6); i++) { const g = grp(14.6, 0, -12 + i * 4.2); g.rotation.y = Math.PI / 2; add(k, g, box(1.4, 0.8, 3.6), ['#2e86de', '#ecf0f1', '#e74c3c', '#16a085'][i % 4], 0, 0.1, 0); add(k, g, box(1.0, 0.9, 1.0), '#ffffff', 0, 0.9, -0.5); add(k, g, cyl(0.05, 0.05, 2.4, 6), '#555', 0, 1.6, 0.8);
    for (let j = 0; j < 4; j++) add(k, g, sph(0.08, 6, 4), k.glow(['#ffd88a', '#e74c3c'][j % 2], 2), -0.4 + j * 0.27, 2.6 - Math.abs(j - 1.5) * 0.2, 0.8, false); world.add(g); boats.push(g); }
  k.anim.push((t) => boats.forEach((g, i) => { g.position.y = Math.sin(t * 1.3 + i) * 0.08; g.rotation.z = Math.sin(t * 1.1 + i) * 0.05; }));
  // 繫船柱、漁網
  for (let i = 0; i < 10; i++) add(k, world, cyl(0.18, 0.22, 0.5, 10), '#2b2f33', 12.0, 0.55, -18 + i * 4);
  return { features: ['魚市場', '港口起重機', '貨櫃堆', '防波堤燈塔', '漁船'], heroH: 6.2 };
}

// ================= 寵物公園 =================
function park({ k, world, pal, clear, mobile }) {
  const paw = canvas(128, 128, (g) => { g.fillStyle = '#e8e0d0'; g.fillRect(0, 0, 128, 128); g.fillStyle = 'rgba(180,160,130,.45)'; for (const [x, y] of [[30, 30], [90, 80]]) { g.beginPath(); g.ellipse(x, y, 10, 8, 0, 0, TAU); g.fill(); for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(x - 12 + i * 8, y - 12 - (i % 3 ? 3 : 0), 4, 0, TAU); g.fill(); } } }); paw.wrapS = paw.wrapT = THREE.RepeatWrapping; paw.repeat.set(7, 7);
  ground(k, world, { color: '#7cc35e', coreTex: paw, edge: '#c9a06b' });
  // 狗屋造型的寵物館（主建築）：大屋頂、圓拱門、屋頂上的狗耳朵、骨頭招牌
  const h = grp(HX, 0.12, HZ); world.add(h);
  add(k, h, box(HW - 1.0, 3.4, HD - 0.6), k.m('#f4c48a'), 0, 1.7, 0);
  add(k, h, gable(HW - 0.8, HD - 0.4, 2.6, 0.4), [k.m('#f4c48a'), k.m('#c0392b', { flatShading: true })], 0, 3.4, 0);
  add(k, h, new THREE.CircleGeometry(1.1, 32, 0, Math.PI), k.m('#3a2a20'), 0, 1.0, HD / 2 - 0.29); add(k, h, box(2.2, 1.0, 0.05), k.m('#3a2a20'), 0, 0.5, HD / 2 - 0.29);
  for (const s of [-1, 1]) { const ear = add(k, h, sph(0.7, 12, 8), '#8a5a3a', s * 1.6, 6.0, 0); ear.scale.set(0.5, 1.2, 0.25); ear.rotation.z = s * 0.4; }
  const bone = grp(0, 4.3, HD / 2 + 0.25); h.add(bone); add(k, bone, box(3.6, 0.7, 0.2), '#fbf3e0', 0, 0, 0); for (const x of [-1.9, 1.9]) for (const y of [-0.28, 0.28]) add(k, bone, cyl(0.38, 0.38, 0.2, 16), '#fbf3e0', x, y, 0).rotation.x = Math.PI / 2;
  const sign = nameSign(k, 3.2, 0.5, '#fbf3e0', '#8a5a3a'); sign.position.set(0, 0, 0.12); bone.add(sign);
  // 湖與鴨子
  const lx = -15, lz = 2; add(k, world, cyl(6, 6, 0.05, 40), '#4fa8c9', lx, 0.03, lz, { roughness: 0.1 });
  const ducks = []; for (let i = 0; i < 5; i++) { const d = grp(); add(k, d, sph(0.25, 10, 8), i ? '#ffffff' : '#f2c94c', 0, 0.15, 0).scale.set(1, 0.7, 1.4); add(k, d, sph(0.14, 8, 6), i ? '#ffffff' : '#f2c94c', 0, 0.4, 0.25); add(k, d, cone(0.05, 0.14, 5), '#f28c28', 0, 0.38, 0.42).rotation.x = Math.PI / 2; world.add(d); ducks.push(d); }
  k.anim.push((t) => ducks.forEach((d, i) => { const a = t * 0.12 + i * 0.35; d.position.set(lx + Math.sin(a) * (3.5 - i * 0.15), 0.05, lz + Math.cos(a) * (3.5 - i * 0.15)); d.rotation.y = a + Math.PI / 2; }));
  // 狗狗運動場（圍欄＋跨欄＋隧道）
  const ax = 15, az = -1; const fM = k.m('#ffffff');
  for (let i = 0; i < 36; i++) { const a = i / 36 * TAU, x = ax + Math.sin(a) * 5, z = az + Math.cos(a) * 5; if (Math.abs(a - Math.PI * 1.5) < 0.25) continue; add(k, world, box(0.08, 0.8, 0.08), fM, x, 0.4, z); add(k, world, box(0.06, 0.06, 0.9), fM, x, 0.65, z).rotation.y = a + Math.PI / 2; }
  for (let i = 0; i < 3; i++) { const z = az - 2 + i * 2; for (const s of [-0.6, 0.6]) add(k, world, cyl(0.04, 0.04, 0.6, 6), '#ffffff', ax - 2 + s, 0.3, z); add(k, world, cyl(0.035, 0.035, 1.2, 6), ['#e74c3c', '#f1c40f', '#3498db'][i], ax - 2, 0.45, z).rotation.z = Math.PI / 2; }
  const tn = add(k, world, cyl(0.5, 0.5, 2.4, 16, true), new THREE.MeshStandardMaterial({ map: stripeTex(hex(pal[0]), '#ffffff', 8), side: THREE.DoubleSide }), ax + 2, 0.5, az); tn.rotation.x = Math.PI / 2;
  // 野餐墊、消防栓、樹
  for (const [x, z, c] of [[-9.8, -6, '#e74c3c'], [10, 8, '#3498db']]) { if (!clear(x, z, 1, 1)) continue; add(k, world, box(2, 0.03, 1.6), new THREE.MeshStandardMaterial({ map: canvas(64, 64, (g) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = (i + j) % 2 ? c : '#ffffff'; g.fillRect(i * 8, j * 8, 8, 8); } }) }), x, 0.04, z); add(k, world, box(0.5, 0.35, 0.35), '#a8754a', x + 0.5, 0.2, z); }
  add(k, world, cyl(0.15, 0.18, 0.7, 10), '#e74c3c', 9.6, 0.35, -6); add(k, world, sph(0.16, 10, 8), '#e74c3c', 9.6, 0.72, -6);
  ringOut(k, clear, mobile ? 8 : 16, 9.6, 26, 4, 1.2, (x, z) => { if (Math.hypot(x - lx, z - lz) < 7 || Math.hypot(x - ax, z - az) < 6) return 0; world.add(bigTree(k, x, z, 0.8 + k.rnd() * 0.5, ['#4fae5b', '#6cc163', '#3d9b57'][Math.floor(k.rnd() * 3)])); return 1; });
  return { dogs: mobile ? 3 : 6, features: ['狗屋造型寵物館', '骨頭招牌', '湖與鴨子', '狗狗運動場', '野餐墊'], heroH: 7.4 };
}

// ================= 月夜燈會（永遠是夜晚） =================
function moon({ k, world, pal, clear, mobile }) {
  ground(k, world, { color: '#1a2424', core: '#3a3836', edge: '#8a3a2a' });
  const mt = canvas(256, 256, (c) => { const g = c.createRadialGradient(128, 128, 40, 128, 128, 128); g.addColorStop(0, '#fff8dc'); g.addColorStop(0.7, '#ffe9a8'); g.addColorStop(1, 'rgba(255,233,168,0)'); c.fillStyle = g; c.fillRect(0, 0, 256, 256); c.fillStyle = 'rgba(200,180,120,.35)'; for (const [x, y, r] of [[100, 110, 18], [150, 150, 12], [130, 90, 9]]) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); } });
  const mn = new THREE.Sprite(new THREE.SpriteMaterial({ map: mt, toneMapped: false, fog: false, depthWrite: false })); mn.scale.set(22, 22, 1); mn.position.set(26, 30, -60); world.add(mn);
  // 燈塔樓閣（主建築）：五層紅色塔樓，每層屋簷掛燈
  const h = grp(HX, 0.12, HZ); world.add(h); const lantM = k.glow('#ff5a3c', 2.4), lg = k.g('mlg', () => { const g = sph(0.16, 10, 8); g.scale(1, 1.3, 1); return g; });
  add(k, h, box(HW, 0.5, HD), k.m('#6b5a4a'), 0, 0.25, 0);
  for (let i = 0; i < 4; i++) { const s = 1 - i * 0.18, y = 0.5 + i * 1.8; add(k, h, box((HW - 1) * s, 1.4, (HD - 0.8) * s), windowMat(k, '#a8322a', (HW - 1) * s, 1.4, { cols: 5, rows: 1, glass: '#ffd27a', lit: 1, seed: 5 + i }), 0, y + 0.7, 0);
    eaveRoof(k, h, (HW - 0.2) * s, (HD) * s, y + 1.4, 0.5, '#2b2f33', '#f2c94c'); for (let j = 0; j < 6; j++) add(k, h, lg, lantM, -((HW - 0.4) * s) / 2 + j * ((HW - 0.4) * s) / 5, y + 1.25, (HD * s) / 2 + 0.25, false); }
  add(k, h, cyl(0.06, 0.12, 2.0, 8), '#f2c94c', 0, 8.6, 0);
  const sign = nameSign(k, 3.0, 0.55, '#2b1d14', '#f2c94c', '"Noto Serif TC", serif'); sign.position.set(0, 1.55, HD / 2 - 0.35); h.add(sign);
  // 河、拱橋、河燈
  waterPlane(k, world, 6, 200, -13, 0, { color: '#162a4a', y: 0.04, speed: [0.0, 0.02] });
  const bridge = grp(-13, 0, -2); world.add(bridge); add(k, bridge, new THREE.TorusGeometry(3.2, 0.35, 8, 24, Math.PI), '#9a958c', 0, -0.6, 0, { flatShading: true }); add(k, bridge, box(6.4, 0.2, 1.6), '#9a958c', 0, 2.2, 0).scale.set(0.8, 1, 1);
  const floats = []; for (let i = 0; i < (mobile ? 8 : 16); i++) { const f = grp(); add(k, f, cyl(0.25, 0.3, 0.12, 8), '#f4c4d8', 0, 0, 0); add(k, f, sph(0.1, 8, 6), k.glow('#ffd27a', 3), 0, 0.15, 0, false); world.add(f); floats.push({ f, o: k.rnd() * 60, x: -14.5 + k.rnd() * 3 }); }
  k.anim.push((t) => floats.forEach(({ f, o, x }) => { const z = 30 - ((t * 0.6 + o) % 60); f.position.set(x, 0.1 + Math.sin(t * 2 + o) * 0.03, z); }));
  // 天燈、燈籠串、玉兔燈
  const sky = []; for (let i = 0; i < (mobile ? 10 : 22); i++) { const m = add(k, world, k.g('skyl', () => cyl(0.2, 0.15, 0.36, 8)), k.glow('#ffb45a', 2.6), 0, 0, 0, false); sky.push({ m, x: (k.rnd() - 0.5) * 30, z: -10 + (k.rnd() - 0.5) * 30, o: k.rnd(), s: 0.6 + k.rnd() * 0.6 }); }
  k.anim.push((t) => sky.forEach(({ m, x, z, o, s }) => { const u = (t * 0.025 * s + o) % 1; m.position.set(x + Math.sin(t * 0.3 + o * 6) * 0.8, 1 + u * 26, z); m.scale.setScalar(1 - u * 0.5); }));
  for (let s = 0; s < 6; s++) { const a0 = -2.5 + s, x0 = Math.sin(a0) * (CORE - 0.3), z0 = Math.cos(a0) * (CORE - 0.3); add(k, world, cyl(0.06, 0.08, 4, 6), '#6b4a35', x0, 2, z0); for (let j = 1; j < 10; j++) { const u = j / 10; add(k, world, lg, lantM, x0 * (1 - u), 4 - Math.sin(Math.PI * u) * 0.8 + u * 0.6 - 0.2, z0 * (1 - u) + 0.9 * u, false); } }
  for (const [x, z] of [[10.5, 3], [-10.5, 4], [11, -6]]) { if (!clear(x, z, 1, 2.5)) continue; const g = grp(x, 0, z); const w = k.glow('#fff6e8', 1.6); add(k, g, sph(0.9, 16, 12), w, 0, 0.8, 0).scale.set(1, 0.85, 1.2); add(k, g, sph(0.55, 14, 10), w, 0, 1.8, 0.4); for (const ex of [-0.2, 0.2]) add(k, g, new THREE.CapsuleGeometry(0.13, 0.8, 4, 8), w, ex, 2.7, 0.3); add(k, g, sph(0.07), '#e8384f', 0.2, 1.85, 0.92); g.rotation.y = Math.atan2(-x, 20 - z); world.add(g); }
  ringOut(k, clear, mobile ? 6 : 12, 10, 24, 4, 1.2, (x, z) => { if (Math.abs(x + 13) < 4) return 0; world.add(bigTree(k, x, z, 0.8 + k.rnd() * 0.4, '#b9739a')); return 1; });
  return { features: ['燈塔樓閣', '大月亮', '天燈', '河燈與拱橋', '玉兔燈'], heroH: 9.6 };
}

// ================= 大學書街 =================
function campus({ k, world, pal, clear, mobile }) {
  const brick = canvas(128, 128, (g) => { g.fillStyle = '#b5694e'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#8a4a36'; g.lineWidth = 2; for (let i = 0; i < 16; i++) for (let j = 0; j < 8; j++) { const x = (j % 2 ? 8 : 0) + i * 16, y = j * 16; g.strokeRect(i % 2 ? x : x, y, 16, 8); g.strokeRect(y, x, 8, 16); } }); brick.wrapS = brick.wrapT = THREE.RepeatWrapping; brick.repeat.set(9, 9);
  ground(k, world, { color: '#7fbf62', coreTex: brick, edge: '#e9dcc4' });
  // 圖書館（主建築）：紅磚主體、白色列柱門廊、三角山牆、圓頂
  const h = grp(HX, 0.12, HZ); world.add(h); const bm = windowMat(k, '#b5694e', HW, 3.6, { cols: 8, rows: 2, glass: '#e9f3fb', lit: 0.8 }), white = k.m('#f4efe4');
  add(k, h, box(HW, 3.6, HD - 1.2), bm, 0, 1.8, -0.6); add(k, h, box(HW + 0.2, 0.3, HD - 1.0), white, 0, 3.7, -0.6);
  for (let i = 0; i < 6; i++) add(k, h, cyl(0.18, 0.2, 3.2, 12), white, -2.5 + i * 1.0, 1.75, HD / 2 - 0.35);
  add(k, h, box(5.8, 0.3, 1.2), white, 0, 3.45, HD / 2 - 0.4);
  const ped = new THREE.Shape(); ped.moveTo(-3.0, 0); ped.lineTo(3.0, 0); ped.lineTo(0, 1.0); add(k, h, new THREE.ExtrudeGeometry(ped, { depth: 0.6, bevelEnabled: false }), white, 0, 3.6, HD / 2 - 0.8);
  add(k, h, cyl(1.6, 1.6, 1.0, 20), white, 0, 4.3, -1.0); add(k, h, dome(1.7, 20, 10), k.m('#5a8a7a', { metalness: 0.4, roughness: 0.4 }), 0, 4.8, -1.0); add(k, h, cyl(0.25, 0.25, 0.7, 10), white, 0, 6.8, -1.0);
  for (let i = 0; i < 4; i++) add(k, h, box(HW + 0.6 - i * 0.5, 0.15, 0.4), white, 0, 0.07 + i * 0.15, HD / 2 + 0.6 - i * 0.3);
  const sign = nameSign(k, 3.6, 0.45, '#ffffff', '#5a2a1e', '"Noto Serif TC", serif'); sign.position.set(0, 3.45, HD / 2 + 0.21); h.add(sign);
  // 兩側的紅磚教學大樓、鐘塔
  for (const s of [-1, 1]) for (let i = 0; i < 2; i++) { const x = s * 15, z = -8 + i * 12; if (!clear(x, z, 3, 5)) continue; const g = grp(x, 0, z); g.rotation.y = -s * Math.PI / 2; world.add(g);
    add(k, g, box(9, 4.5, 4), windowMat(k, '#b5694e', 9, 4.5, { cols: 9, rows: 3, glass: '#e9f3fb', seed: 17 + i }), 0, 2.25, 0); add(k, g, gable(9, 4, 1.4, 0.2), [k.m('#b5694e'), k.m('#3a4a5a', { flatShading: true })], 0, 4.5, 0); for (let j = 0; j < 5; j++) add(k, g, box(0.3, 4.5, 0.3), white, -4 + j * 2, 2.25, 2.05); }
  const ct = grp(12, 0, -16); world.add(ct); add(k, ct, box(2.4, 11, 2.4), k.m('#b5694e'), 0, 5.5, 0); add(k, ct, cone(1.9, 3, 4), k.m('#3a4a5a', { flatShading: true }), 0, 12.5, 0).rotation.y = Math.PI / 4;
  const face = canvas(128, 128, (c) => { c.fillStyle = '#fffaf0'; c.beginPath(); c.arc(64, 64, 60, 0, TAU); c.fill(); c.strokeStyle = '#2b2b2b'; c.lineWidth = 5; c.stroke(); });
  add(k, ct, new THREE.CircleGeometry(0.9, 32), new THREE.MeshStandardMaterial({ map: face, emissive: C(k.night ? '#fff6d0' : '#000'), emissiveMap: k.night ? face : null }), 0, 9, 1.21, false); const hd = add(k, ct, box(0.08, 0.7, 0.02), '#2b2b2b', 0, 9, 1.23, false); hd.geometry.translate(0, 0.3, 0); k.anim.push((t) => { hd.rotation.z = -t * 0.3; });
  // 老榕樹、腳踏車、草地上讀書的學生、書攤
  ringOut(k, clear, mobile ? 6 : 12, 9.6, 24, 4, 1.5, (x, z) => { world.add(bigTree(k, x, z, 1.1 + k.rnd() * 0.5, ['#4f9a45', '#3d8a45'][Math.floor(k.rnd() * 2)])); return 1; });
  for (let i = 0; i < (mobile ? 5 : 10); i++) { const a = 2.0 + i * 0.09, x = Math.sin(a) * 9.4, z = Math.cos(a) * 9.4; const g = grp(x, 0.02, z); g.rotation.y = a; for (const zz of [-0.4, 0.4]) add(k, g, new THREE.TorusGeometry(0.26, 0.025, 6, 16), '#2b2b2b', 0, 0.27, zz).rotation.y = Math.PI / 2; add(k, g, box(0.04, 0.04, 0.8), hex(pal[i % 6]), 0, 0.45, 0); add(k, g, box(0.2, 0.04, 0.08), '#2b2b2b', 0, 0.65, -0.18); world.add(g); }
  const books = ['#c0392b', '#2e86de', '#f2c94c', '#16a085', '#8e44ad'];
  for (const [x, z] of [[-10, 6], [10.4, 6.4]]) { if (!clear(x, z, 1, 1.5)) continue; const g = grp(x, 0, z); g.rotation.y = Math.atan2(-x, -z); add(k, g, box(2.0, 0.8, 0.8), '#a8754a', 0, 0.4, 0); for (let i = 0; i < 12; i++) add(k, g, box(0.12, 0.35, 0.25), books[i % 5], -0.85 + i * 0.15, 0.98, 0); umbrellaLike(k, g, hex(pal[0])); world.add(g); }
  const spots = [[-12, 2], [12, -3], [-12.5, -4]].map(([x, z]) => ({ x, z, y: 0.02, face: [0, 0], pose: 'sit', prop: 'cup' }));
  return { spots, features: ['圓頂圖書館', '紅磚教學大樓', '鐘塔', '老樹草地', '書攤'], heroH: 7.4 };
}
function umbrellaLike(k, g, c) { add(k, g, cyl(0.03, 0.03, 2, 6), '#e8e2d8', 0, 1.6, -0.3); add(k, g, cone(1.2, 0.4, 8), c, 0, 2.6, -0.3); }

// ================= 遊樂園 =================
function carnival({ k, world, pal, clear, mobile }) {
  const tiles = canvas(128, 128, (g) => { const cs = ['#ffd6e0', '#d6ecff', '#fff3c4', '#e0ffd6']; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = cs[(i + j * 2) % 4]; g.fillRect(i * 16, j * 16, 16, 16); } }); tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping; tiles.repeat.set(8, 8);
  ground(k, world, { color: '#8fd06a', coreTex: tiles, edge: '#f2c94c' });
  const cs = [hex(pal[0]), '#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6'];
  // 馬戲帳篷（主建築）
  const h = grp(HX, 0.12, HZ); world.add(h); const st = stripeTex('#e74c3c', '#ffffff', 16);
  add(k, h, cyl(3.4, 3.4, 2.6, 24, true), new THREE.MeshStandardMaterial({ map: st, side: THREE.DoubleSide, roughness: 0.7 }), 0, 1.3, -0.2);
  add(k, h, cone(3.8, 3.4, 24), new THREE.MeshStandardMaterial({ map: st, roughness: 0.7 }), 0, 4.3, -0.2); add(k, h, cyl(0.06, 0.06, 1.6, 6), '#f2c94c', 0, 6.6, -0.2); add(k, h, cone(0.35, 0.6, 3), '#f2c94c', 0.3, 7.2, -0.2).rotation.z = -Math.PI / 2;
  const ent = grp(0, 0, 2.0); h.add(ent); for (const x of [-1.2, 1.2]) add(k, ent, cyl(0.15, 0.15, 2.4, 10), '#f2c94c', x, 1.2, 0); add(k, ent, new THREE.TorusGeometry(1.2, 0.15, 8, 20, Math.PI), '#f2c94c', 0, 2.4, 0);
  const sign = nameSign(k, 3.0, 0.5, '#c0392b', '#fff3c4'); sign.position.set(0, 2.6, 0.18); ent.add(sign);
  if (k.night) for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI; add(k, ent, sph(0.07, 6, 4), k.glow(cs[i % 6], 2.6), Math.cos(a) * 1.35, 2.4 + Math.sin(a) * 1.35, 0.05, false); }
  // 大摩天輪
  const fw = grp(12, 0, -18); fw.rotation.y = -0.4; world.add(fw); const R = 7.5;
  for (const s of [-1, 1]) { const l = add(k, fw, box(0.35, R + 1.8, 0.35), '#c9ced3', 0, (R + 1.8) / 2, s * 1.0); l.rotation.x = s * 0.15; }
  const wh = grp(0, R + 1.5, 0); fw.add(wh); add(k, wh, new THREE.TorusGeometry(R, 0.12, 8, 64), '#e8e8e8', 0, 0, 0, { metalness: 0.4 }); add(k, wh, new THREE.TorusGeometry(R * 0.5, 0.08, 6, 40), '#e8e8e8', 0, 0, 0);
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; const sp = add(k, wh, box(0.06, R, 0.06), '#e8e8e8', Math.cos(a) * R / 2, Math.sin(a) * R / 2, 0); sp.rotation.z = a + Math.PI / 2; }
  const gond = []; for (let i = 0; i < 16; i++) { const g = add(k, fw, box(0.9, 0.9, 1.0), cs[i % 6], 0, 0, 0); gond.push(g); }
  const bulbs = k.night ? Array.from({ length: 32 }, (_, i) => { const a = i / 32 * TAU; return add(k, wh, sph(0.09, 6, 4), k.glow(cs[i % 6], 2.8), Math.cos(a) * R, Math.sin(a) * R, 0.15, false); }) : [];
  k.anim.push((t) => { wh.rotation.z = t * 0.12; gond.forEach((g, i) => { const a = i / 16 * TAU + t * 0.12; g.position.set(Math.cos(a) * R, R + 1.5 + Math.sin(a) * R - 0.6, 0); }); });
  // 雲霄飛車（軌道＋會跑的車廂）
  const pts = []; for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; pts.push(new THREE.Vector3(-14 + Math.sin(a) * 8, 2.5 + Math.sin(a * 3) * 2.2 + (Math.cos(a) > 0.7 ? 3 : 0), -12 + Math.cos(a) * 6)); }
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  add(k, world, new THREE.TubeGeometry(curve, 240, 0.12, 6, true), '#e74c3c', 0, 0, 0, { metalness: 0.4 });
  for (let i = 0; i < 24; i++) { const p = curve.getPoint(i / 24); add(k, world, box(0.15, p.y, 0.15), '#c9ced3', p.x, p.y / 2, p.z); }
  const train = []; for (let i = 0; i < 4; i++) { const c = add(k, world, box(0.8, 0.5, 1.2), cs[(i + 2) % 6], 0, 0, 0); train.push(c); }
  const tmp = new THREE.Vector3(); k.anim.push((t) => train.forEach((c, i) => { const u = ((t * 0.05) - i * 0.012 + 10) % 1; curve.getPoint(u, c.position); curve.getPoint((u + 0.004) % 1, tmp); c.lookAt(tmp); c.position.y += 0.35; }));
  // 旋轉木馬
  const cx = -12, cz = 4; const cg = grp(cx, 0, cz); world.add(cg); add(k, cg, cyl(3, 3.1, 0.3, 24), '#f4efe4', 0, 0.15, 0); const top = grp(); cg.add(top);
  add(k, top, cone(3.3, 1.3, 24), new THREE.MeshStandardMaterial({ map: stripeTex(cs[0], '#ffffff', 16) }), 0, 4.2, 0); add(k, top, cyl(0.2, 0.2, 3.6, 10), '#f2c94c', 0, 1.9, 0, { metalness: 0.6 });
  const horses = []; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, hh = grp(Math.cos(a) * 2.2, 0, Math.sin(a) * 2.2); hh.rotation.y = -a; top.add(hh); add(k, hh, cyl(0.04, 0.04, 3.4, 6), '#f2c94c', 0, 1.9, 0); add(k, hh, box(0.35, 0.45, 1.0), cs[(i + 1) % 6], 0, 1.3, 0); add(k, hh, box(0.3, 0.45, 0.3), cs[(i + 1) % 6], 0, 1.65, 0.45); horses.push(hh); }
  k.anim.push((t) => { top.rotation.y = t * 0.5; horses.forEach((hh, i) => { hh.position.y = Math.sin(t * 2 + i) * 0.2; }); });
  // 自由落體塔、氣球攤
  const dt = grp(16, 0, 6); world.add(dt); add(k, dt, box(0.8, 14, 0.8), '#c9ced3', 0, 7, 0); const ring = add(k, dt, new THREE.TorusGeometry(1.0, 0.3, 8, 20), cs[1], 0, 2, 0); ring.rotation.x = Math.PI / 2;
  k.anim.push((t) => { const u = (t * 0.2) % 1; ring.position.y = u < 0.7 ? 1.5 + u / 0.7 * 11 : 12.5 - (u - 0.7) / 0.3 * 11; });
  for (let i = 0; i < 10; i++) { const b = grp(9.5 + (i % 5) * 0.25, 0, 7.5 + Math.floor(i / 5) * 0.25); add(k, b, cyl(0.005, 0.005, 1.6, 3), '#ffffff', 0, 0.8, 0); add(k, b, sph(0.22, 10, 8), cs[i % 6], 0, 1.75, 0, { roughness: 0.3 }); world.add(b); const ph = i; k.anim.push((t) => { b.rotation.z = Math.sin(t * 1.3 + ph) * 0.1; }); }
  return { features: ['馬戲帳篷', '大摩天輪', '雲霄飛車', '旋轉木馬', '自由落體塔'], heroH: 7.6 };
}

// ================= 沙漠綠洲 =================
function desert({ k, world, pal, clear, mobile }) {
  // 沙丘：起伏的地面
  const dg = new THREE.PlaneGeometry(320, 320, 120, 120); const p = dg.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), r = Math.hypot(x, y); const hgt = Math.max(0, Math.min(1, (r - 12) / 10)) * (Math.sin(x * 0.12) * Math.cos(y * 0.09) * 2.2 + Math.sin((x + y) * 0.05) * 1.6 + 1.2); p.setZ(i, hgt); }
  dg.computeVertexNormals(); const dm = new THREE.Mesh(dg, k.m('#e9c98a', { roughness: 1 })); dm.rotation.x = -Math.PI / 2; dm.position.y = -0.02; dm.receiveShadow = true; world.add(dm);
  const tiles = canvas(128, 128, (g) => { g.fillStyle = '#f1dca6'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#c9a86a'; g.lineWidth = 2; for (let i = 0; i <= 128; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke(); } g.fillStyle = '#5aa0b8'; for (let i = 16; i < 128; i += 32) for (let j = 16; j < 128; j += 32) { g.beginPath(); g.moveTo(i, j - 5); g.lineTo(i + 5, j); g.lineTo(i, j + 5); g.lineTo(i - 5, j); g.fill(); } });
  tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping; tiles.repeat.set(8, 8);
  ground(k, world, { color: null, coreTex: tiles, edge: '#c98a5a', edgeH: 0.4 });
  // 摩洛哥風土坯屋（主建築）：方塊屋身、拱門、洋蔥圓頂、小塔、掛毯
  const h = grp(HX, 0.12, HZ); world.add(h); const adobe = k.m('#e0a878', { roughness: 0.95 });
  add(k, h, box(HW, 3.2, HD - 0.4), adobe, 0, 1.6, 0); add(k, h, box(HW - 2, 1.6, HD - 1.6), adobe, -0.4, 4.0, -0.3);
  for (let i = 0; i < 3; i++) { const x = -2.2 + i * 2.2; add(k, h, box(1.2, 1.8, 0.06), '#3a2a20', x, 0.9, HD / 2 - 0.17); add(k, h, new THREE.CircleGeometry(0.6, 20, 0, Math.PI), k.m('#3a2a20'), x, 1.8, HD / 2 - 0.17); }
  const onion = new THREE.LatheGeometry([[0, 0], [0.9, 0], [1.2, 0.5], [1.0, 1.1], [0.5, 1.6], [0.1, 2.0], [0, 2.1]].map(([x, y]) => new THREE.Vector2(x, y)), 24);
  add(k, h, onion, k.m('#2e9aa8', { metalness: 0.3, roughness: 0.4 }), -0.4, 4.8, -0.3); add(k, h, cyl(0.03, 0.03, 0.6, 6), '#d9b25f', -0.4, 7.1, -0.3);
  const tw = grp(3.0, 0, -0.6); h.add(tw); add(k, tw, box(1.0, 6.4, 1.0), adobe, 0, 3.2, 0); add(k, tw, box(1.2, 0.3, 1.2), k.m('#c98a5a'), 0, 6.5, 0);
  for (let i = 0; i < 3; i++) add(k, h, box(0.7, 1.4, 0.02), new THREE.MeshStandardMaterial({ map: stripeTex(['#c0392b', '#2e86de', '#f1c40f'][i], '#f4efe4', 6, false) }), -3.0 + i * 0.85, 2.3, HD / 2 - 0.13, false);
  const sign = nameSign(k, 3.2, 0.55, '#7a3a1e', '#f2d39a'); sign.position.set(0.0, 2.7, HD / 2 - 0.12); h.add(sign);
  // 紅岩台地、仙人掌
  for (const [x, z, s] of [[-30, -40, 9], [26, -48, 12], [-48, 6, 8], [44, -6, 10]]) { const g = grp(x, 0, z); [[1, 0.4], [0.8, 0.35], [0.62, 0.3]].reduce((y, [w, hh], i) => { add(k, g, box(w * s, hh * s, w * s * 0.8), ['#c8643c', '#d9774a', '#b85a34'][i], 0, y + hh * s / 2, 0, { flatShading: true }); return y + hh * s; }, 0); world.add(g); }
  const cm = k.m('#4f9a5a', { roughness: 0.7 });
  ringOut(k, clear, mobile ? 8 : 16, 9.6, 30, 4, 1, (x, z) => { const g = grp(x, 0, z); const s = 1.2 + k.rnd() * 0.8; g.scale.setScalar(s); add(k, g, new THREE.CapsuleGeometry(0.2, 1.8, 4, 10), cm, 0, 1.1, 0); for (const [sx, y, l] of [[1, 1.0, 0.5], [-1, 1.4, 0.4]]) { add(k, g, new THREE.CapsuleGeometry(0.13, 0.3, 4, 8), cm, sx * 0.28, y, 0).rotation.z = Math.PI / 2; add(k, g, new THREE.CapsuleGeometry(0.13, l, 4, 8), cm, sx * 0.42, y + l / 2 + 0.1, 0); } g.rotation.y = k.rnd() * 3; world.add(g); return 1; });
  // 綠洲（水池＋棕櫚樹）
  const ox = -13, oz = -2; add(k, world, cyl(3.4, 3.6, 0.06, 32), '#3fb8c9', ox, 0.04, oz, { roughness: 0.1 });
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, x = ox + Math.cos(a) * 4.2, z = oz + Math.sin(a) * 4.2; const g = grp(x, 0, z); g.scale.setScalar(1.6); let px = 0, py = 0; const lean = 0.25;
    for (let j = 0; j < 6; j++) { add(k, g, cyl(0.08, 0.1, 0.5, 6), '#a7835a', px, py + 0.25, 0).rotation.z = -lean; px += Math.sin(lean) * 0.5; py += 0.48; }
    for (let j = 0; j < 7; j++) { const f = add(k, g, cone(0.18, 1.3, 4), k.m('#3fae4f', { flatShading: true, side: THREE.DoubleSide }), px, py, 0); f.geometry.translate(0, 0.65, 0); f.rotation.set(0, j / 7 * TAU, 1.95, 'YXZ'); f.scale.z = 0.25; }
    g.rotation.y = a; world.add(g); }
  // 駱駝商隊（沿著沙丘走）
  const camels = []; for (let i = 0; i < 4; i++) { const c = grp(); const fur = k.m('#c9a06b', { roughness: 0.9 });
    add(k, c, box(0.55, 0.55, 1.2), fur, 0, 1.1, 0); add(k, c, sph(0.3, 10, 8), fur, 0, 1.5, -0.1); add(k, c, box(0.2, 0.8, 0.2), fur, 0, 1.6, 0.65).rotation.x = 0.5; add(k, c, box(0.24, 0.22, 0.42), fur, 0, 2.0, 0.95);
    const legs = [[-0.18, -0.42], [0.18, -0.42], [-0.18, 0.42], [0.18, 0.42]].map(([x, z]) => { const l = add(k, c, k.g('cl2', () => box(0.12, 0.85, 0.12).translate(0, -0.42, 0)), fur, x, 0.85, z); return l; });
    if (i === 0) add(k, c, box(0.7, 0.3, 0.6), '#c0392b', 0, 1.5, 0.1); world.add(c); camels.push({ c, legs }); }
  k.anim.push((t) => camels.forEach(({ c, legs }, i) => { const u = ((t * 0.012) - i * 0.012 + 10) % 1, a = -0.9 + u * 1.8, r = 22; c.position.set(Math.sin(a) * r, 0.4 + Math.sin(a * 5) * 0.4, -6 + Math.cos(a) * r * 0.5); c.rotation.y = a + Math.PI / 2; legs.forEach((l, j) => { l.rotation.x = Math.sin(t * 4 + j * Math.PI / 2 + i) * 0.35; }); }));
  return { features: ['摩洛哥土坯屋', '洋蔥圓頂', '沙丘', '綠洲棕櫚', '駱駝商隊'], heroH: 7.4 };
}

export const WORLDS_B = {
  zen: { id: 'zen', kind: 'world', name: '禪寺庭園', sky: { top: '#a8c4d8', bot: '#eef2ee' }, build: zen },
  neon: { id: 'neon', kind: 'world', name: '霓虹電子街', night: true, hat: 'cap', sky: { top: '#1a0a3a', bot: '#4a1a5a' }, build: neon },
  harbor: { id: 'harbor', kind: 'world', name: '漁港', hat: 'cap', build: harbor },
  park: { id: 'park', kind: 'world', name: '寵物公園', build: park },
  moon: { id: 'moon', kind: 'world', name: '月夜燈會', night: true, build: moon },
  campus: { id: 'campus', kind: 'world', name: '大學書街', build: campus },
  carnival: { id: 'carnival', kind: 'world', name: '歡樂遊樂園', build: carnival },
  desert: { id: 'desert', kind: 'world', name: '沙漠綠洲', hat: 'sun', sky: { top: '#5aa8e8', bot: '#ffe8c4' }, build: desert },
};
