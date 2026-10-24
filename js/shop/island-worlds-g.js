// 主題世界（七）：燕語海崖（精品燕窩・嬿窩）
// 夕陽下的海岬花園：象牙白洋紅柱三重簷「燕屋樓閣」、海上石灰岩柱與燕洞、上百隻雨燕俯衝急轉捕食空中的飛蟲、飛回燕洞，
// 會反射夕陽金光的海面、月洞門、荷花池、觀海涼亭與白石欄杆。
import * as THREE from 'three';
import { tree, makeBoat } from './island-scenes.js';
import { TAU, C, hex, CORE, HERO, WORLD_VENUE, canvas, add, grp, box, cyl, sph, cone, nameSign } from './island-worlds.js';

const HX = (HERO.x0 + HERO.x1) / 2, HZ = (HERO.z0 + HERO.z1) / 2;
const SEA_Y = -3.2;                                   // 海面高度（海岬是 3 公尺高的白色石灰岩崖）
const SUN_DIR = new THREE.Vector3(-0.22, 0.07, -0.97).normalize();
const GOLD = '#d9b56b', IVORY = '#f6efe2', JADE = '#b8146a';

// 海岸線（x, z）：海在右側與後方，陸地往左前方延伸到畫面外
const COAST = [[34, 80], [26, 36], [20, 16], [16.8, 5], [15.8, -4], [13.8, -11], [9.2, -14.6], [3, -15.9], [-4, -15.7], [-10, -14.4], [-15.5, -16.8], [-22, -21], [-34, -25], [-60, -27.5], [-140, -29]];
const LAND = [...COAST, [-140, 140], [34, 140]];
function inLand(x, z) { let ins = false; for (let i = 0, j = LAND.length - 1; i < LAND.length; j = i++) { const [xi, zi] = LAND[i], [xj, zj] = LAND[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) ins = !ins; } return ins; }
// 海岸線細分＋小起伏（讓崖邊不規則）
function coastPts(rnd) { const out = []; for (let i = 0; i < COAST.length - 1; i++) { const [x0, z0] = COAST[i], [x1, z1] = COAST[i + 1], n = Math.max(2, Math.round(Math.hypot(x1 - x0, z1 - z0) / 1.6)); for (let s = 0; s < n; s++) { const u = s / n, nx = -(z1 - z0), nz = x1 - x0, l = Math.hypot(nx, nz) || 1, j = (rnd() - 0.5) * 0.9; out.push([x0 + (x1 - x0) * u + nx / l * j, z0 + (z1 - z0) * u + nz / l * j]); } } out.push(COAST[COAST.length - 1]); return out; }

// 會反射夕陽的海（自己的著色器：波浪、菲涅耳、太陽金光、遠方融入天色）
function sea(k, world, hor) {
  const seg = k.mobile ? 90 : 160;
  const g = new THREE.PlaneGeometry(420, 420, seg, seg); g.rotateX(-Math.PI / 2);
  const night = k.night;
  const mat = new THREE.ShaderMaterial({
    fog: false,
    uniforms: { t: { value: 0 }, deep: { value: C(night ? '#0a2233' : '#1d5d78') }, shallow: { value: C(night ? '#16404c' : '#3aa3a6') }, hor: { value: C(hor) }, sunDir: { value: SUN_DIR.clone() }, sunCol: { value: C(night ? '#cfdcff' : '#ffcf8a') } },
    vertexShader: `uniform float t; varying vec3 vW; varying vec3 vN;
      float h(vec2 p){ return sin(p.x*0.21+t*0.7)*0.18 + cos(p.y*0.27+t*0.55)*0.15 + sin((p.x+p.y)*0.6+t*1.4)*0.05 + sin((p.x*0.9-p.y*1.3)+t*2.1)*0.025; }
      void main(){ vec3 p = position; vec4 w0 = modelMatrix*vec4(p,1.0); float e = 0.25; float y0 = h(w0.xz);
        float dx = h(w0.xz+vec2(e,0.0))-y0, dz = h(w0.xz+vec2(0.0,e))-y0; p.y += y0; vN = normalize(vec3(-dx/e, 1.0, -dz/e));
        vec4 wp = modelMatrix*vec4(p,1.0); vW = wp.xyz; gl_Position = projectionMatrix*viewMatrix*wp; }`,
    fragmentShader: `uniform float t; uniform vec3 deep; uniform vec3 shallow; uniform vec3 hor; uniform vec3 sunDir; uniform vec3 sunCol; varying vec3 vW; varying vec3 vN;
      void main(){ vec3 V = normalize(cameraPosition - vW); vec3 N = normalize(vN); float d = length(vW.xz);
        vec3 c = mix(shallow, deep, smoothstep(10.0, 46.0, d));
        float fr = pow(1.0 - max(dot(N, V), 0.0), 3.0); c = mix(c, hor, fr*0.75);
        vec3 R = reflect(-V, N); float s = max(dot(R, sunDir), 0.0);
        float glow = pow(s, 9.0)*0.55 + pow(s, 60.0)*1.1;
        float tw = step(0.86, sin(vW.x*3.1+t*2.3)*sin(vW.z*2.7-t*1.9)) * pow(s, 4.0) * 1.6;
        c += sunCol*(glow + tw);
        float fogf = smoothstep(55.0, 190.0, length(vW - cameraPosition)); c = mix(c, hor, fogf);
        gl_FragColor = vec4(c, 1.0); }`,
  });
  const m = new THREE.Mesh(g, mat); m.position.set(0, SEA_Y, -40); world.add(m);
  k.anim.push((t) => { mat.uniforms.t.value = t; });
  return m;
}

// 海上石灰岩柱（頂上長樹、側面有燕洞）
function karst(k, world, x, z, h, r, { cave = false } = {}) {
  const g = grp(x, SEA_Y, z); world.add(g);
  const geo = new THREE.CylinderGeometry(r * 0.72, r, h, 11, 9); const pos = geo.attributes.position, cols = [];
  let a = (x * 73 + z * 31) | 0; const rr = () => (a = (a * 16807 + 11) % 2147483647) / 2147483647;
  const jit = Array.from({ length: 11 * 10 }, () => 0.82 + rr() * 0.36);
  for (let i = 0; i < pos.count; i++) { const px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i); const ang = Math.atan2(px, pz), row = Math.round((py / h + 0.5) * 9), col = Math.round(((ang / TAU) + 1) * 11) % 11; const f = jit[row * 11 + col] * (1 + Math.sin(py * 0.9 + x) * 0.05); pos.setXYZ(i, px * f, py, pz * f);
    const u = py / h + 0.5, cc = C('#8f8676').lerp(C('#e3d9c6'), Math.min(1, u * 1.3)); if (u > 0.92) cc.lerp(C('#6f9a55'), 0.5); cols.push(cc.r, cc.g, cc.b); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); geo.computeVertexNormals();
  add(k, g, geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }), 0, h / 2, 0);
  // 頂上的熱帶樹叢與垂藤
  const top = r * 0.72;
  for (let i = 0; i < 5; i++) { const ang = i / 5 * TAU + rr(), d = top * 0.5 * rr(); add(k, g, k.g('kbush', () => new THREE.IcosahedronGeometry(1, 0)), k.m(i % 2 ? '#5f8f4a' : '#4c7d3e', { flatShading: true }), Math.sin(ang) * d, h + 0.3, Math.cos(ang) * d).scale.setScalar(top * (0.35 + rr() * 0.25)); }
  for (let i = 0; i < 6; i++) { const ang = rr() * TAU, len = 1 + rr() * h * 0.25; const v = add(k, g, k.g('kvine', () => cyl(0.05, 0.02, 1, 4)), '#4c7d3e', Math.sin(ang) * top * 0.98, h - len / 2, Math.cos(ang) * top * 0.98, false); v.scale.y = len; }
  // 燕洞：朝向海岬那一面的深色洞口＋洞口上方的白色岩紋
  if (cave) {
    const ang = Math.atan2(-x, -z), y = h * 0.55, rad = r * (1 - 0.28 * 0.55) * 1.14;
    const ct = k.g('caveTex', () => canvas(128, 128, (q) => { const gr = q.createRadialGradient(64, 74, 4, 64, 64, 64); gr.addColorStop(0, '#0d0a08'); gr.addColorStop(0.55, '#2a221b'); gr.addColorStop(0.85, '#5a4f42'); gr.addColorStop(1, 'rgba(110,98,84,0)'); q.fillStyle = gr; q.fillRect(0, 0, 128, 128); }));
    const mouth = new THREE.Mesh(k.g('cave', () => new THREE.CircleGeometry(1, 24)), new THREE.MeshBasicMaterial({ map: ct, transparent: true, depthWrite: false }));
    mouth.scale.set(r * 0.3, h * 0.12, 1); mouth.position.set(Math.sin(ang) * rad, y, Math.cos(ang) * rad); mouth.rotation.y = ang; g.add(mouth);
    const arch = new THREE.Mesh(k.g('cavearch', () => new THREE.TorusGeometry(1, 0.16, 6, 16, Math.PI)), k.m('#cfc4b0', { flatShading: true, roughness: 1 })); arch.scale.set(r * 0.27, h * 0.11, r * 0.3); arch.position.copy(mouth.position); arch.rotation.y = ang; g.add(arch);
    return { x: x + Math.sin(ang) * (rad + 0.6), y: SEA_Y + y, z: z + Math.cos(ang) * (rad + 0.6) };
  }
  return null;
}

// 金絲燕的零件（身體、左右鐮刀形翅膀、分叉尾）：上百隻用 InstancedMesh 一次畫完
function swiftletParts(k, n) {
  const col = k.night ? '#4a5262' : '#2b3039';
  const body = sph(0.08, 8, 6); body.scale(1, 0.8, 2.8);
  const tri = (arr) => { const q = new THREE.BufferGeometry(); q.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); q.computeVertexNormals(); return q; };
  const wing = (sd) => tri([0, 0.02, 0.1, 0, 0.02, -0.08, sd * 0.34, 0.04, -0.02, 0, 0.02, -0.08, sd * 0.64, 0.02, -0.28, sd * 0.34, 0.04, -0.02]);
  const tail = tri([0, 0, -0.18, -0.1, 0, -0.44, 0, 0, -0.28, 0, 0, -0.18, 0, 0, -0.28, 0.1, 0, -0.44]);
  const mat = new THREE.MeshStandardMaterial({ color: C(col), roughness: 0.6, side: THREE.DoubleSide });
  return [body, wing(-1), wing(1), tail].map(g => { const m = new THREE.InstancedMesh(g, mat, n); m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); return m; });
}

// 方形重簷（四角起翹）：w 寬、d 深、上下兩個縮放
function eave(k, parent, y, w, d, h, topScale, mat, tipMat) {
  const geo = k.g('eave' + w + d + h + topScale, () => { const gg = new THREE.CylinderGeometry(topScale * Math.SQRT1_2, Math.SQRT1_2, 1, 4, 1); gg.rotateY(Math.PI / 4); return gg; });
  const e = add(k, parent, geo, mat, 0, y + h / 2, 0); e.scale.set(w, h, d);
  add(k, parent, box(w * 0.92, 0.12, d * 0.92), JADE, 0, y + 0.02, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const tip = add(k, parent, k.g('etip', () => cone(0.09, 0.55, 6)), tipMat, sx * w / 2 * 1.02, y + 0.18, sz * d / 2 * 1.02); tip.rotation.set(sz * 0.9, 0, -sx * 0.9); }
  return e;
}

// ================= 燕語海崖 =================
function swiftlet_world({ k, world, pal, clear, mobile, camPts }) {
  const night = k.night, hor = night ? '#26365e' : '#ffd8a8';
  // ---- 地形：海岬（石灰岩崖）＋草地，核心廣場是象牙白石板＋金色鑲嵌 ----
  const pts = coastPts(k.rnd), sh = new THREE.Shape();
  [...pts, [-140, 140], [34, 140]].forEach(([x, z], i) => (i ? sh.lineTo(x, -z) : sh.moveTo(x, -z)));
  const lg = new THREE.ExtrudeGeometry(sh, { depth: -SEA_Y + 1.2, bevelEnabled: false }); lg.rotateX(-Math.PI / 2);
  const land = new THREE.Mesh(lg, [k.m(night ? '#4c6a45' : '#a9bf78', { roughness: 1 }), k.m(night ? '#8d8578' : '#ddd2bd', { roughness: 0.95, flatShading: true })]);
  land.position.y = SEA_Y - 1.2; land.receiveShadow = true; world.add(land); // 擠出高度 4.4，頂面剛好在 y=0
  // 崖壁的岩層紋（幾條橫向深色線）與崖下浪花
  const foamM = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false });
  const fc = new THREE.CatmullRomCurve3(pts.slice(1, -1).map(([x, z]) => new THREE.Vector3(x, 0, z)));
  const foam = new THREE.Mesh(new THREE.TubeGeometry(fc, pts.length * 2, 0.32, 5, false), foamM); foam.scale.y = 0.4; foam.position.y = SEA_Y + 0.08; world.add(foam);
  k.anim.push((t) => { foamM.opacity = 0.42 + Math.sin(t * 1.6) * 0.16; });
  sea(k, world, hor);
  const coreTex = canvas(512, 512, (g, W) => { const c = W / 2; g.fillStyle = night ? '#d8cfbd' : '#f1e9d9'; g.fillRect(0, 0, W, W);
    g.strokeStyle = 'rgba(160,130,80,.22)'; g.lineWidth = 2; for (let r = 40; r < c; r += 38) { g.beginPath(); g.arc(c, c, r, 0, TAU); g.stroke(); }
    for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; g.beginPath(); g.moveTo(c + Math.cos(a) * 40, c + Math.sin(a) * 40); g.lineTo(c + Math.cos(a) * c, c + Math.sin(a) * c); g.stroke(); }
    g.strokeStyle = 'rgba(201,164,92,.85)'; g.lineWidth = 6; [118, 236].forEach(r => { g.beginPath(); g.arc(c, c, r, 0, TAU); g.stroke(); });
    g.fillStyle = 'rgba(201,164,92,.75)'; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + 0.2; g.save(); g.translate(c + Math.cos(a) * 177, c + Math.sin(a) * 177); g.rotate(a); g.beginPath(); g.moveTo(-12, 0); g.lineTo(0, -6); g.lineTo(12, 0); g.lineTo(0, 6); g.closePath(); g.fill(); g.restore(); } });
  const coreM = new THREE.MeshStandardMaterial({ map: coreTex, roughness: 0.85 });
  const core = new THREE.Mesh(new THREE.CylinderGeometry(CORE, CORE + 0.1, 0.12, 72), [k.m('#c9a45c'), coreM, coreM]); core.position.y = 0.06; core.receiveShadow = true; world.add(core);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(CORE + 0.05, 0.1, 6, 120), k.m(GOLD, { metalness: 0.6, roughness: 0.35 })); rim.rotation.x = Math.PI / 2; rim.position.y = 0.13; world.add(rim);
  // 夕陽的逆光（從海的方向打過來的暖色光）
  const back = new THREE.DirectionalLight(night ? '#8fa6ff' : '#ffb26b', night ? 0.35 : 0.9); back.position.copy(SUN_DIR).multiplyScalar(60); back.position.y = 14; world.add(back);
  // 太陽（或月亮）＋光暈
  const sunT = canvas(256, 256, (g) => { const r = g.createRadialGradient(128, 128, 0, 128, 128, 128); if (night) { r.addColorStop(0, 'rgba(255,250,235,1)'); r.addColorStop(0.18, 'rgba(240,240,255,.95)'); r.addColorStop(0.3, 'rgba(190,205,255,.25)'); } else { r.addColorStop(0, 'rgba(255,252,236,1)'); r.addColorStop(0.16, 'rgba(255,236,190,1)'); r.addColorStop(0.32, 'rgba(255,190,120,.45)'); r.addColorStop(0.6, 'rgba(255,170,110,.12)'); } r.addColorStop(1, 'rgba(255,160,100,0)'); g.fillStyle = r; g.fillRect(0, 0, 256, 256); });
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunT, fog: false, depthWrite: false, toneMapped: false, transparent: true })); sun.scale.setScalar(night ? 26 : 46); sun.position.copy(SUN_DIR).multiplyScalar(150); world.add(sun);
  k.anim.push((t) => { sun.material.opacity = 0.92 + Math.sin(t * 0.6) * 0.08; });

  // ---- 主建築：燕屋樓閣（象牙白三層、金色重簷、頂層是燕子進出的燕口） ----
  const h = grp(HX, 0.12, HZ - 0.2); world.add(h);
  const iv = k.m(IVORY, { roughness: 0.6 }), goldM = k.m(GOLD, { metalness: 0.65, roughness: 0.32 }), jadeM = k.m(JADE, { roughness: 0.5 });
  const warm = k.m('#ffe3a8', { emissive: C('#ffcf7a'), emissiveIntensity: night ? 1.3 : 0.35, roughness: 0.25 });
  add(k, h, box(7.0, 0.26, 4.0), '#efe7d6', 0, 0.13, 0); add(k, h, box(6.3, 0.26, 3.5), '#f7f1e4', 0, 0.39, 0); add(k, h, box(7.04, 0.05, 4.04), goldM, 0, 0.27, 0);
  add(k, h, box(5.6, 2.6, 3.0), iv, 0, 1.82, -0.1);
  for (const x of [-2.6, -1.56, -0.52, 0.52, 1.56, 2.6]) { add(k, h, cyl(0.12, 0.13, 2.6, 12), jadeM, x, 1.82, 1.5); add(k, h, cyl(0.17, 0.17, 0.1, 12), goldM, x, 0.57, 1.5); add(k, h, cyl(0.17, 0.17, 0.1, 12), goldM, x, 3.08, 1.5); }
  for (const x of [-2.08, -1.04, 1.04, 2.08]) { add(k, h, box(0.7, 1.7, 0.05), warm, x, 1.7, 1.42); const arch = add(k, h, cyl(0.35, 0.35, 0.05, 16, false), warm, x, 2.55, 1.42); arch.rotation.x = Math.PI / 2; arch.scale.z = 1; }
  add(k, h, box(0.86, 2.0, 0.06), k.m('#fff0cc', { emissive: C('#ffd890'), emissiveIntensity: night ? 1.5 : 0.5, roughness: 0.2 }), 0, 1.5, 1.43); add(k, h, box(1.02, 0.1, 0.1), goldM, 0, 2.52, 1.45);
  const sign = nameSign(k, 2.4, 0.46, '#4d0a2e', '#e9cf8f', '"Noto Serif TC", "Songti TC", serif'); sign.position.set(0, 2.88, 1.62); h.add(sign);
  eave(k, h, 3.12, 6.9, 4.2, 0.62, 0.62, goldM, goldM);
  add(k, h, box(4.2, 1.9, 2.3), iv, 0, 4.7, -0.1);
  const slotM = k.m('#2a2622', { roughness: 0.9 });
  for (let r = 0; r < 2; r++) for (let i = 0; i < 7; i++) add(k, h, box(0.3, 0.1, 0.04), slotM, -1.65 + i * 0.55, 4.35 + r * 0.6, 1.07);
  for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) add(k, h, box(0.04, 0.1, 0.3), slotM, sx * 2.11, 4.5, -0.9 + i * 0.55);
  eave(k, h, 5.66, 5.3, 3.3, 0.55, 0.6, goldM, goldM);
  add(k, h, box(2.9, 1.45, 1.7), iv, 0, 6.95, -0.1);
  const emb = canvas(256, 256, (g) => { g.fillStyle = '#b8146a'; g.beginPath(); g.arc(128, 128, 124, 0, TAU); g.fill(); g.strokeStyle = '#e9cf8f'; g.lineWidth = 8; g.beginPath(); g.arc(128, 128, 110, 0, TAU); g.stroke(); g.fillStyle = '#e9cf8f'; g.save(); g.translate(56, 92); g.scale(6.4, 6.4); g.fill(new Path2D('M0 8 C4 4.5 8 3.6 11.5 4.6 L21 0 L15.6 6.2 C17.6 7 18.8 8.6 18.2 9.8 C15.6 9 13.4 9.2 11.6 10.2 L3 16 L6.6 10.2 C4 10.4 1.6 9.6 0 8 Z')); g.restore(); });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.52, 32), new THREE.MeshStandardMaterial({ map: emb, roughness: 0.5, emissive: C('#ffffff'), emissiveMap: emb, emissiveIntensity: night ? 0.5 : 0.08 })); disc.position.set(0, 6.95, 0.76); h.add(disc);
  const ring = add(k, h, new THREE.TorusGeometry(0.56, 0.05, 8, 40), goldM, 0, 6.95, 0.77); ring.rotation.set(0, 0, 0);
  eave(k, h, 7.66, 4.1, 2.7, 1.3, 0.06, goldM, goldM);
  add(k, h, sph(0.2, 16, 12), goldM, 0, 9.12, 0); add(k, h, cone(0.07, 0.9, 10), goldM, 0, 9.7, 0);
  // 簷角燈籠（傍晚亮起、微微搖晃）
  const lanterns = [];
  for (const [y, w, d] of [[3.12, 6.9, 4.2], [5.66, 5.3, 3.3]]) for (const sx of [-1, 1]) { const lg2 = grp(sx * w / 2 * 0.94, y - 0.05, d / 2 * 0.94); h.add(lg2); add(k, lg2, cyl(0.008, 0.008, 0.4, 3), '#5a4a2a', 0, -0.2, 0, false); const b = add(k, lg2, k.g('lant', () => { const s = sph(0.17, 12, 10); s.scale(1, 1.25, 1); return s; }), k.m('#ffcf7a', { emissive: C('#ffb84a'), emissiveIntensity: night ? 2.2 : 0.7, roughness: 0.4 }), 0, -0.55, 0, false); add(k, lg2, cyl(0.1, 0.1, 0.05, 10), goldM, 0, -0.33, 0, false); lanterns.push(lg2); }
  k.anim.push((t) => lanterns.forEach((l, i) => { l.rotation.z = Math.sin(t * 1.4 + i) * 0.08; }));

  // ---- 海上石灰岩柱與燕洞 ----
  const KS = [[-6, -31, 9, 3.2], [9, -40, 13, 3.6, true], [25, -27, 11, 3.4, true], [-21, -45, 12, 3.8], [37, -53, 15, 4.2], [-39, -62, 14, 4.6, true], [15, -70, 17, 5], [51, -31, 8, 3], [31, 4, 7, 2.6], [43, 22, 9, 3.2], [-60, -48, 10, 4]];
  const caves = [];
  for (const [x, z, hh, r, cv] of (mobile ? KS.filter((_, i) => i % 3 !== 2) : KS)) { const c = karst(k, world, x, z, hh, r, { cave: !!cv }); if (c) caves.push(c); }

  // ---- 雨燕捕食：空中一團團小飛蟲（夕陽下閃金光），上百隻金絲燕俯衝、急轉、一口咬住飛蟲，吃飽了飛回燕洞 ----
  // 前幾團在廣場上方低空（展台特寫鏡頭也看得到雨燕貼地掠過）
  const SW = [[0, 2.5, 1.2, 1.7], [0.4, 7.4, -5.4, 1.5], [-3.4, 2.3, -3.4, 1.3], [3.6, 2.4, -2.6, 1.3], [-13.5, 3.2, 3.5, 1.6], [-12.6, 2.1, -3.2, 1.3], [11.6, 2.0, 3.4, 1.2], [7, 5.5, -21, 2.3], [19, 7.5, -30, 2.5], [-9, 6.5, -24, 2.1], [-18, 4.5, 12, 1.8], [3, 11.5, -14, 2.4]].slice(0, mobile ? 6 : 12);
  const PER = mobile ? 26 : 44, NI = SW.length * PER;
  const bug = new Float32Array(NI * 3), bugs = [];
  for (let i = 0; i < NI; i++) { const si = Math.floor(i / PER), u = k.rnd() * TAU, v = Math.acos(2 * k.rnd() - 1), rr = Math.cbrt(k.rnd());
    bugs.push({ si, o: [Math.sin(v) * Math.cos(u) * rr, Math.cos(v) * rr, Math.sin(v) * Math.sin(u) * rr], ph: k.rnd() * TAU, f: 1.5 + k.rnd() * 2.5, alive: true, back: 0, x: 0, y: -99, z: 0 }); }
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(bug, 3));
  const dotT = canvas(32, 32, (q) => { const r = q.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.4, 'rgba(255,240,200,.8)'); r.addColorStop(1, 'rgba(255,220,150,0)'); q.fillStyle = r; q.fillRect(0, 0, 32, 32); });
  const bugPts = new THREE.Points(bg, new THREE.PointsMaterial({ size: 0.11, map: dotT, color: C(night ? '#e8f6a0' : '#ffe6a8'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  bugPts.frustumCulled = false; world.add(bugPts);
  // 咬到飛蟲的瞬間：一圈小小的金光
  const flashes = Array.from({ length: 12 }, () => { const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotT, color: C('#ffd36a'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); f.visible = false; f.userData.t = 0; world.add(f); return f; });
  let catches = 0; world.userData.catches = () => catches;
  const flash = (x, y, z) => { const f = flashes.find(q => !q.visible) || flashes[catches % flashes.length]; f.visible = true; f.userData.t = 0; f.position.set(x, y, z); catches++; };

  const tower = new THREE.Vector3(HX, 6.5, HZ);
  const NB = mobile ? 48 : 140;
  const [mBody, mWL, mWR, mTail] = swiftletParts(k, NB); world.add(mBody, mWL, mWR, mTail);
  const rr = (a, b) => a + k.rnd() * (b - a);
  const birds = Array.from({ length: NB }, (_, i) => {
    const s = SW[i % SW.length], a = k.rnd() * TAU;
    return { p: new THREE.Vector3(s[0] + Math.sin(a) * 6, s[1] + rr(1, 5), s[2] + Math.cos(a) * 6), v: new THREE.Vector3(Math.cos(a), 0, -Math.sin(a)).multiplyScalar(5),
      st: k.rnd() < 0.6 ? 'hunt' : 'cruise', tm: rr(0, 3), tgt: -1, c: new THREE.Vector3(), cr: 6, cw: k.rnd() < 0.5 ? 1 : -1, jt: 0, j: new THREE.Vector3(), ph: k.rnd() * TAU, hid: 0, bank: 0, cave: null };
  });
  const pickBug = (b) => { let best = -1, bd = 1e9; for (let n = 0; n < 3; n++) { const si = Math.floor(k.rnd() * SW.length), s = SW[si], d = (s[0] - b.p.x) ** 2 + (s[1] - b.p.y) ** 2 + (s[2] - b.p.z) ** 2; if (d < bd) { bd = d; best = si; } }
    for (let n = 0; n < 8; n++) { const i = best * PER + Math.floor(k.rnd() * PER); if (bugs[i].alive) return i; } return -1; };
  const cruiseAround = (b) => { const home = k.rnd() < 0.5 ? tower : new THREE.Vector3(...SW[Math.floor(k.rnd() * SW.length)].slice(0, 3)); b.c.copy(home); b.c.y = home.y + rr(1.5, 5); b.cr = rr(3.5, 9); };
  birds.forEach(b => cruiseAround(b));
  const cams = [...(camPts || []).filter((_, i) => i % 3 === 0), ...[WORLD_VENUE.final, WORLD_VENUE.finalM].map(([x, y, z]) => new THREE.Vector3(x, y, z))];
  const nearCam = (p) => { let d = 99; for (const c of cams) { const e = (c.x - p.x) ** 2 + (c.y - p.y) ** 2 + (c.z - p.z) ** 2; if (e < d) d = e; } return Math.sqrt(d); };
  const M = new THREE.Matrix4(), LK = new THREE.Matrix4(), Q = new THREE.Quaternion(), QR = new THREE.Quaternion(), QW = new THREE.Quaternion(), S = new THREE.Vector3(), Z = new THREE.Vector3(0, 0, 1), UP = new THREE.Vector3(0, 1, 0);
  const d = new THREE.Vector3(), to = new THREE.Vector3(), ahead = new THREE.Vector3(), prev = new THREE.Vector3(), HIDE = new THREE.Matrix4().makeScale(0, 0, 0);
  let last = 0;
  k.anim.push((t) => {
    const dt = Math.min(0.05, Math.max(0, t - last)); last = t;
    // 飛蟲：整團慢慢飄，每隻在團裡亂飛；被吃掉的過一陣子再補上
    for (let i = 0; i < NI; i++) { const g = bugs[i], s = SW[g.si];
      if (!g.alive) { g.back -= dt; if (g.back <= 0) g.alive = true; else { bug[i * 3 + 1] = -99; continue; } }
      const cx = s[0] + Math.sin(t * 0.13 + g.si) * 0.9, cy = s[1] + Math.sin(t * 0.21 + g.si) * 0.4, cz = s[2] + Math.cos(t * 0.11 + g.si) * 0.9;
      g.x = cx + g.o[0] * s[3] + Math.sin(t * g.f + g.ph) * 0.3; g.y = cy + g.o[1] * s[3] * 0.6 + Math.sin(t * g.f * 1.3 + g.ph * 2) * 0.22; g.z = cz + g.o[2] * s[3] + Math.cos(t * g.f * 0.8 + g.ph) * 0.3;
      bug[i * 3] = g.x; bug[i * 3 + 1] = g.y; bug[i * 3 + 2] = g.z; }
    bg.attributes.position.needsUpdate = true;
    for (const f of flashes) if (f.visible) { f.userData.t += dt; const u = f.userData.t / 0.4; f.scale.setScalar(0.15 + u * 0.7); f.material.opacity = 1 - u; if (u >= 1) f.visible = false; }
    if (!dt) return;
    birds.forEach((b, i) => {
      // 回到燕洞：躲在洞裡一下再飛出來
      if (b.hid > 0) { b.hid -= dt; if (b.hid <= 0) { b.p.set(b.cave.x, b.cave.y, b.cave.z); b.v.copy(tower).sub(b.p).setY(2).normalize().multiplyScalar(7); b.st = 'cruise'; b.tm = rr(1, 3); cruiseAround(b); } else { mBody.setMatrixAt(i, HIDE); mWL.setMatrixAt(i, HIDE); mWR.setMatrixAt(i, HIDE); mTail.setMatrixAt(i, HIDE); return; } }
      b.tm -= dt; let sp = 5.5, turn = 2.2;
      if (b.st === 'hunt') {
        if (b.tgt < 0 || !bugs[b.tgt].alive || b.tm < 0) { b.tgt = pickBug(b); b.tm = 6; if (b.tgt < 0) { b.st = 'cruise'; b.tm = 2; } }
        if (b.tgt >= 0) { const g = bugs[b.tgt]; to.set(g.x - b.p.x, g.y - b.p.y, g.z - b.p.z); const dist = to.length(); d.copy(to).divideScalar(dist || 1); sp = dist < 4 ? 9 : 7.5; turn = dist < 1.5 ? 12 : dist < 4 ? 7 : 4;
          // 急轉：每隔一下往旁邊抖一下（雨燕追蟲的樣子）
          b.jt -= dt; if (b.jt < 0) { b.jt = rr(0.12, 0.35); b.j.set(rr(-1, 1), rr(-0.5, 0.5), rr(-1, 1)).multiplyScalar(dist > 2 ? 0.7 : 0.25); } d.add(b.j);
          if (dist < 0.7) { g.alive = false; g.back = rr(1.5, 4); flash(g.x, g.y, g.z); b.st = 'pull'; b.tm = rr(0.4, 0.9); b.tgt = -1; } }
      } else if (b.st === 'pull') { d.copy(b.v).normalize(); d.y += 0.9; sp = 9; turn = 3; if (b.tm < 0) { b.st = k.rnd() < 0.7 ? 'hunt' : 'cruise'; b.tm = rr(1.5, 4); if (b.st === 'cruise') cruiseAround(b); if (b.st === 'cruise' && caves.length && k.rnd() < 0.12) { b.st = 'home'; b.cave = caves[Math.floor(k.rnd() * caves.length)]; } } }
      else if (b.st === 'home') { to.set(b.cave.x - b.p.x, b.cave.y - b.p.y, b.cave.z - b.p.z); const dist = to.length(); d.copy(to).divideScalar(dist || 1); sp = 8; turn = 3; if (dist < 0.9) { b.hid = rr(1.5, 4); return; } }
      else { // 盤旋滑翔
        to.set(b.p.x - b.c.x, 0, b.p.z - b.c.z); const r = to.length() || 1; to.divideScalar(r);
        d.set(-to.z * b.cw, (b.c.y - b.p.y) * 0.15, to.x * b.cw).addScaledVector(to, (b.cr - r) / b.cr * 1.5);
        if (b.tm < 0) { b.st = 'hunt'; b.tm = 6; b.tgt = -1; } }
      // 避開地面、天花板、主建築、太遠的地方
      if (b.p.y < 1.4) d.y += (1.4 - b.p.y) * 2.5; if (b.p.y > 24) d.y -= 1;
      const R0 = Math.hypot(b.p.x, b.p.z + 15); if (R0 > 55) { d.x -= b.p.x / R0; d.z -= (b.p.z + 15) / R0; }
      if (Math.abs(b.p.x - HX) < 4.2 && b.p.z > HERO.z0 - 0.8 && b.p.z < HERO.z1 + 1 && b.p.y < 10.5 && b.st !== 'hunt') { d.x += Math.sign(b.p.x - HX || 1) * 1.5; d.y += 0.5; }
      d.normalize(); prev.copy(b.v);
      b.v.lerp(d.multiplyScalar(sp), Math.min(1, dt * turn));
      b.p.addScaledVector(b.v, dt);
      // 轉彎時傾斜機身
      const cy = prev.x * b.v.z - prev.z * b.v.x, bank = Math.max(-1.1, Math.min(1.1, cy * 0.9 / Math.max(1, dt * 60)));
      b.bank += (bank - b.bank) * Math.min(1, dt * 6);
      ahead.copy(b.p).add(b.v); LK.lookAt(ahead, b.p, UP); Q.setFromRotationMatrix(LK); QR.setFromAxisAngle(Z, b.bank); Q.multiply(QR);
      const sc = Math.max(0, Math.min(1, (nearCam(b.p) - 5) / 4)); S.setScalar(sc);
      M.compose(b.p, Q, S); mBody.setMatrixAt(i, M); mTail.setMatrixAt(i, M);
      const fast = b.st === 'hunt' || b.st === 'pull', a = fast ? Math.sin(t * (b.st === 'pull' ? 30 : 25) + b.ph) * 0.85 : (Math.sin(t * 0.8 + b.ph) > 0.6 ? Math.sin(t * 22 + b.ph) * 0.7 : 0.12);
      QW.setFromAxisAngle(Z, a); M.compose(b.p, QW.premultiply(Q), S); mWL.setMatrixAt(i, M);
      QW.setFromAxisAngle(Z, -a); M.compose(b.p, QW.premultiply(Q), S); mWR.setMatrixAt(i, M);
    });
    mBody.instanceMatrix.needsUpdate = mWL.instanceMatrix.needsUpdate = mWR.instanceMatrix.needsUpdate = mTail.instanceMatrix.needsUpdate = true;
  });

  // ---- 花園：荷花池、月洞門、觀海涼亭、白石欄杆、棕櫚與雞蛋花 ----
  const pool = (x, z, w, d) => { if (!clear(x, z, Math.max(w, d) / 2, 1)) return;
    add(k, world, box(w + 0.5, 0.36, d + 0.5), '#efe7d6', x, 0.18, z); add(k, world, box(w + 0.62, 0.07, d + 0.62), goldM, x, 0.3, z);
    const wm = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color: night ? '#183a44' : '#4aa6a3', roughness: 0.08, metalness: 0.2 })); wm.rotation.x = -Math.PI / 2; wm.position.set(x, 0.38, z); world.add(wm);
    const pads = [];
    for (let i = 0; i < (mobile ? 4 : 8); i++) { const px = x + (k.rnd() - 0.5) * (w - 0.8), pz = z + (k.rnd() - 0.5) * (d - 0.8); const pad = add(k, world, k.g('lpad', () => cyl(0.32, 0.32, 0.02, 14)), '#4f8f45', px, 0.4, pz, false); pads.push(pad);
      if (i % 2 === 0) { const fl = grp(px + 0.08, 0.42, pz); world.add(fl); for (let j = 0; j < 6; j++) { const pt = add(k, fl, k.g('lpet', () => { const s = sph(0.09, 8, 6); s.scale(0.6, 0.5, 1.4); s.translate(0, 0.05, 0.1); return s; }), j % 2 ? '#f6c2cf' : '#f3a9bb', 0, 0, 0, false); pt.rotation.set(-0.6, j / 6 * TAU, 0); } add(k, fl, sph(0.05, 8, 6), '#f2d16b', 0, 0.08, 0, false); pads.push(fl); } }
    k.anim.push((t) => pads.forEach((p, i) => { p.position.y = (p.isGroup ? 0.42 : 0.4) + Math.sin(t * 1.2 + i) * 0.012; }));
  };
  pool(-12.6, -3.2, 4.6, 7.2); pool(11.6, 3.4, 3.6, 5.4);
  // 月洞門（白牆圓門＋墨綠瓦頂）
  { const gx = -11.8, gz = 8.6; if (clear(gx, gz, 2.4, 3.4)) { const s = new THREE.Shape(); s.moveTo(-2.2, 0); s.lineTo(2.2, 0); s.lineTo(2.2, 3.2); s.lineTo(-2.2, 3.2); s.closePath(); const hole = new THREE.Path(); hole.absarc(0, 1.55, 1.18, 0, TAU, true); s.holes.push(hole);
    const gw = new THREE.ExtrudeGeometry(s, { depth: 0.36, bevelEnabled: false }); gw.translate(0, 0, -0.18); const gate = grp(gx, 0.02, gz); gate.rotation.y = 0.75; world.add(gate);
    add(k, gate, gw, iv, 0, 0, 0); add(k, gate, box(4.7, 0.2, 0.62), jadeM, 0, 3.3, 0); add(k, gate, box(4.4, 0.12, 0.5), goldM, 0, 3.16, 0);
    const rg = add(k, gate, new THREE.TorusGeometry(1.18, 0.06, 8, 48), goldM, 0, 1.55, 0); rg.scale.z = 3.2; } }
  // 觀海涼亭（六角、金頂）
  { const px = 11.2, pz = -10.4; if (clear(px, pz, 1.8, 3.6)) { const p = grp(px, 0.02, pz); world.add(p); add(k, p, cyl(1.7, 1.8, 0.3, 6), '#efe7d6', 0, 0.15, 0); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; add(k, p, cyl(0.07, 0.07, 2.2, 8), jadeM, Math.sin(a) * 1.45, 1.4, Math.cos(a) * 1.45); }
    add(k, p, cone(2.1, 1.1, 6), goldM, 0, 3.05, 0); add(k, p, sph(0.14, 10, 8), goldM, 0, 3.7, 0); add(k, p, cyl(1.9, 1.9, 0.1, 6), jadeM, 0, 2.5, 0); } }
  // 白石欄杆：沿著後方崖邊
  { const posts = []; for (const [x, z] of pts) { if (z > -9 || x < -13 || x > 14.5) continue; const l = Math.hypot(x, z); posts.push([x - x / l * 1.1, z - z / l * 1.1]); }
    const pm = k.m('#f7f1e4');
    posts.forEach(([x, z], i) => { if (i % 2) return; add(k, world, box(0.16, 0.8, 0.16), pm, x, 0.42, z); add(k, world, sph(0.1, 8, 6), goldM, x, 0.86, z, false); const n = posts[i + 2]; if (!n) return; const dx = n[0] - x, dz = n[1] - z, L = Math.hypot(dx, dz); const r = add(k, world, box(0.08, 0.08, L), pm, x + dx / 2, 0.74, z + dz / 2, false); r.rotation.y = Math.atan2(dx, dz); }); }
  // 棕櫚與雞蛋花樹（只種在陸地上、避開廣場與鏡頭）
  const plant = (n, r0, r1, make) => { let c = 0; for (let i = 0; i < n * 8 && c < n; i++) { const a = k.rnd() * TAU, r = r0 + k.rnd() * (r1 - r0), x = Math.sin(a) * r, z = Math.cos(a) * r; if (!inLand(x, z) || !inLand(x + 1.5, z - 1.5) || Math.hypot(x, z) < CORE + 1.4) continue; if (Math.abs(x) < 5 && z < -6 && z > -14) continue; if (!clear(x, z, 1.2, 5)) continue; make(x, z); c++; } };
  plant(mobile ? 6 : 12, 10, 26, (x, z) => world.add(tree(k, x, z, 'palm', 1.4 + k.rnd() * 0.6)));
  const plumeria = (x, z) => { const g = grp(x, 0, z); world.add(g); add(k, g, cyl(0.1, 0.16, 1.4, 6), '#8a6a4a', 0, 0.7, 0); for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + 0.4; add(k, g, k.g('pcrown', () => new THREE.IcosahedronGeometry(0.62, 0)), k.m(night ? '#2f5a35' : '#5f9a4e', { flatShading: true }), Math.sin(a) * 0.55, 1.65, Math.cos(a) * 0.55); }
    for (let i = 0; i < 9; i++) { const a = k.rnd() * TAU, r = 0.4 + k.rnd() * 0.6; add(k, g, k.g('pflower', () => sph(0.09, 6, 4)), k.m(i % 3 ? '#fff8ec' : '#ffe08a', { roughness: 0.5 }), Math.sin(a) * r, 1.8 + k.rnd() * 0.5, Math.cos(a) * r, false); } };
  plant(mobile ? 4 : 9, 10, 22, plumeria);
  // 步道石燈（象牙白＋暖光）
  const lampAt = (x, z) => { const g = grp(x, 0, z); world.add(g); add(k, g, box(0.34, 0.9, 0.34), '#efe7d6', 0, 0.45, 0); add(k, g, box(0.4, 0.28, 0.4), k.m('#ffe3a8', { emissive: C('#ffc76a'), emissiveIntensity: night ? 1.6 : 0.3 }), 0, 1.04, 0); add(k, g, cone(0.36, 0.3, 4), goldM, 0, 1.33, 0).rotation.y = Math.PI / 4; };
  for (let i = 0; i < 10; i++) { const a = -2.4 + i * 0.53, r = CORE + 0.8, x = Math.sin(a) * r, z = Math.cos(a) * r; if (z < -7 && Math.abs(x) < 5) continue; if (clear(x, z, 0.3, 1.4)) lampAt(x, z); }
  // 海上的帆船
  const sb = makeBoat(pal, night); world.add(sb.group); sb.group.scale.setScalar(1.8);
  k.anim.push((t) => { const a = t * 0.025 + 1; sb.group.position.set(30 + Math.cos(a) * 16, SEA_Y + 0.05, -22 + Math.sin(a) * 18); sb.group.rotation.y = -a; sb.update(t); });

  // 定點的人：涼亭看海、崖邊欄杆拍照、荷花池邊坐著
  const spots = [
    { x: 11.0, z: -9.8, y: 0.32, face: [16, -18], pose: 'stand' }, { x: 11.7, z: -10.9, y: 0.32, face: [18, -16], pose: 'stand', hat: 'sun' },
    { x: -5.5, z: -12.6, face: [-6, -24], pose: 'stand', prop: 'bag' }, { x: 6.4, z: -12.8, face: [9, -30], pose: 'stand' },
    { x: -10.0, z: -0.2, face: [-12.6, -3.2], pose: 'sit' }, { x: 9.4, z: 6.2, face: [11.6, 3.4], pose: 'sit' },
  ];
  return { features: ['燕屋樓閣', '海上石灰岩燕洞', '雨燕群飛', '雨燕捕食飛蟲', '夕陽海面金光', '月洞門與荷花池', '觀海涼亭'], heroH: 9.9, spots, fog: [44, 170] };
}

export const WORLDS_G = {
  swiftlet: { id: 'swiftlet', kind: 'world', name: '燕語海崖', sky: { top: '#86aad6', bot: '#ffd8a8' }, sunDir: SUN_DIR.toArray(), hat: 'sun', cloud: '#fff1df', build: swiftlet_world },
};
