// 銷售網頁 three.js 主視覺：漂浮的馬卡龍、檸檬片、草莓與糖粒
import * as THREE from 'three';

function softDot() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.5, 'rgba(255,255,255,0.8)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function macaron(color, fill = 0xfff6e8) {
  const g = new THREE.Group();
  const shellMat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.55, sheen: 1, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.5, clearcoat: 0.15 });
  const shellGeo = new THREE.SphereGeometry(0.62, 40, 24);
  const top = new THREE.Mesh(shellGeo, shellMat); top.scale.set(1, 0.42, 1); top.position.y = 0.2;
  const bot = new THREE.Mesh(shellGeo, shellMat); bot.scale.set(1, 0.36, 1); bot.position.y = -0.2;
  const footMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.92), roughness: 0.95 });
  const foot1 = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.06, 10, 40), footMat); foot1.rotation.x = Math.PI / 2; foot1.position.y = 0.11;
  const foot2 = foot1.clone(); foot2.position.y = -0.11;
  const cream = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.16, 40), new THREE.MeshStandardMaterial({ color: fill, roughness: 0.4 }));
  g.add(top, bot, foot1, foot2, cream);
  return g;
}
function lemonSlice() {
  const g = new THREE.Group();
  const rind = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.09, 40), new THREE.MeshStandardMaterial({ color: 0xf2c230, roughness: 0.5 }));
  const pulp = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.1, 40), new THREE.MeshPhysicalMaterial({ color: 0xfff1a0, roughness: 0.25, transmission: 0.2, thickness: 0.2 }));
  g.add(rind, pulp);
  for (let i = 0; i < 8; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.11, 0.02), new THREE.MeshStandardMaterial({ color: 0xfffbe0 }));
    s.rotation.y = i / 8 * Math.PI; g.add(s);
  }
  return g;
}
function strawberry() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 18), new THREE.MeshPhysicalMaterial({ color: 0xe8384f, roughness: 0.3, clearcoat: 0.6 }));
  body.scale.set(1, 1.25, 1);
  const pos = body.geometry.attributes.position; const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); if (v.y < 0.05) { const k = Math.max(0.08, 1 + (v.y - 0.05) * 2.4); v.x *= k; v.z *= k; } pos.setXYZ(i, v.x, v.y, v.z); }
  body.geometry.computeVertexNormals();
  g.add(body);
  const seedMat = new THREE.MeshStandardMaterial({ color: 0xffe08a, roughness: 0.4 });
  for (let i = 0; i < 26; i++) {
    const a = i * 2.4, yy = -0.25 + (i / 26) * 0.5, rr = 0.34 * Math.max(0.15, 1 + (yy / 1.25 - 0.05) * 2.4) * (yy > 0 ? Math.cos(yy * 1.5) : 1);
    const sd = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 4), seedMat); sd.position.set(Math.cos(a) * rr * 1.01, yy * 1.25, Math.sin(a) * rr * 1.01); g.add(sd);
  }
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 6), new THREE.MeshStandardMaterial({ color: 0x3f9a4f }));
    leaf.position.set(Math.cos(i) * 0.12, 0.4, Math.sin(i) * 0.12); leaf.rotation.z = Math.cos(i) * 1.2; leaf.rotation.x = Math.sin(i) * 1.2;
    g.add(leaf);
  }
  return g;
}

export function createShopHero(host) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { host.classList.add('no-webgl'); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100); camera.position.set(0, 0.3, 9);
  scene.add(new THREE.HemisphereLight(0xfff4e6, 0xf0c8d8, 1.6));
  const dl = new THREE.DirectionalLight(0xffffff, 2.2); dl.position.set(3, 5, 6); scene.add(dl);
  const pl = new THREE.PointLight(0xffb0c8, 20, 20); pl.position.set(-3, -1, 3); scene.add(pl);

  const items = [];
  const add = (obj, x, y, z, s = 1, spin = 0.4) => { obj.position.set(x, y, z); obj.scale.setScalar(s); obj.rotation.set(0.5 + Math.random() * 0.4, Math.random() * 6, (Math.random() - 0.5) * 0.6); scene.add(obj); items.push({ obj, base: obj.position.clone(), ph: Math.random() * 6, spin: spin * (Math.random() < 0.5 ? -1 : 1), rot0: obj.rotation.clone() }); };

  // 中央：三層馬卡龍塔
  const tower = new THREE.Group();
  [[0xf7b2c4, 0], [0xb8e0c8, 0.98], [0xf9dc82, 1.96]].forEach(([c, y], i) => { const m = macaron(c, i === 1 ? 0xffffff : 0xfff6e8); m.position.y = y - 0.98; m.rotation.set((i - 1) * 0.08, i, (i - 1) * 0.06); tower.add(m); });
  tower.scale.setScalar(1.3); tower.rotation.x = 0.32; scene.add(tower);
  items.push({ obj: tower, base: new THREE.Vector3(0, 0, 0), ph: 0, spin: 0.25, tower: true });

  add(macaron(0xc9b6ec), -2.6, 1.5, -1, 0.9);
  add(macaron(0xffc8a2), 2.5, -1.6, 0.2, 0.85);
  add(macaron(0xa8dadc), 2.7, 1.9, -2, 0.7);
  add(lemonSlice(), -2.4, -1.5, 0.6, 1.05, 0.6);
  add(lemonSlice(), 1.2, 2.5, -1.5, 0.7, 0.5);
  add(strawberry(), 2.1, 0.4, 1.2, 1.1, 0.5);
  add(strawberry(), -1.5, 2.6, -2.5, 0.8, 0.5);
  add(strawberry(), -3.2, -0.1, -1.8, 0.75, 0.5);

  // 糖粒
  const N = 260; const pg = new THREE.BufferGeometry(); const arr = new Float32Array(N * 3); const col = new Float32Array(N * 3);
  const pal = [0xf7b2c4, 0x2DB674, 0xF0A531, 0x7C62E6, 0x2E97D4, 0xffffff].map(c => new THREE.Color(c));
  for (let i = 0; i < N; i++) { arr[i * 3] = (Math.random() - 0.5) * 12; arr[i * 3 + 1] = (Math.random() - 0.5) * 7; arr[i * 3 + 2] = (Math.random() - 0.5) * 6 - 1; const c = pal[i % pal.length]; col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  pg.setAttribute('position', new THREE.BufferAttribute(arr, 3)); pg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const sprinkles = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.09, map: softDot(), vertexColors: true, transparent: true, depthWrite: false, opacity: 0.9 }));
  scene.add(sprinkles);

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
      it.obj.position.y = it.base.y + Math.sin(t * 0.8 + it.ph) * 0.18;
      it.obj.position.x = it.base.x + Math.cos(t * 0.5 + it.ph) * 0.08;
      it.obj.rotation.y += dt * it.spin; it.obj.rotation.x = it.rot0.x + Math.sin(t * 0.6 + it.ph) * 0.2;
    }
    sprinkles.rotation.y = t * 0.03; sprinkles.position.y = Math.sin(t * 0.3) * 0.1;
    camera.position.x += (mx * 1.2 - camera.position.x) * 0.04;
    camera.position.y += (0.3 - my * 0.8 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }
  function loop() { cancelAnimationFrame(raf); const step = (n) => { if (!visible || document.hidden) return; frame(n); raf = requestAnimationFrame(step); }; raf = requestAnimationFrame(step); }
  loop();
}
