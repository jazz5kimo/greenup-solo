// three.js 主視覺：發光的低多邊形「AI 大腦」+ 環繞的通路光球 + 粒子
import * as THREE from 'three';
import { CHANNELS } from './data.js';

function glowTexture(color = '#ffffff') {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, color); r.addColorStop(0.25, color + 'aa'); r.addColorStop(1, color + '00');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function createHero(host, { compact = false } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    host.classList.add('no-webgl');
    return { pulse() {}, dispose() {} };
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0.4, compact ? 8.4 : 7.2);

  scene.add(new THREE.AmbientLight(0x406a58, 1.2));
  const key = new THREE.PointLight(0x2DB674, 60, 30); key.position.set(3, 3, 4); scene.add(key);
  const rim = new THREE.PointLight(0x7C62E6, 50, 30); rim.position.set(-4, -2, 2); scene.add(rim);
  const warm = new THREE.PointLight(0xF0A531, 30, 30); warm.position.set(0, -3, 3); scene.add(warm);

  const brain = new THREE.Group(); scene.add(brain);

  // 核心：平面著色的二十面體
  const coreGeo = new THREE.IcosahedronGeometry(1.25, 1);
  const coreMat = new THREE.MeshStandardMaterial({ color: 0x0f5c3c, emissive: 0x0b4a30, emissiveIntensity: 0.8, metalness: 0.35, roughness: 0.25, flatShading: true, transparent: true, opacity: 0.92 });
  const core = new THREE.Mesh(coreGeo, coreMat); brain.add(core);

  // 線框外殼
  const shellGeo = new THREE.IcosahedronGeometry(1.62, 1);
  const wire = new THREE.LineSegments(new THREE.EdgesGeometry(shellGeo), new THREE.LineBasicMaterial({ color: 0x5ef0a8, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending }));
  brain.add(wire);
  const outerGeo = new THREE.IcosahedronGeometry(2.05, 2);
  const outer = new THREE.LineSegments(new THREE.EdgesGeometry(outerGeo), new THREE.LineBasicMaterial({ color: 0x2E97D4, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending }));
  brain.add(outer);

  // 神經節點
  const nodePos = shellGeo.attributes.position;
  const nodes = new THREE.Points(shellGeo, new THREE.PointsMaterial({ size: 0.11, map: glowTexture('#b8ffd9'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffffff }));
  brain.add(nodes);

  // 核心光暈
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('#2DB674'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.85 }));
  halo.scale.set(6.5, 6.5, 1); scene.add(halo);

  // 通路光球
  const orbs = [];
  const orbGroup = new THREE.Group(); scene.add(orbGroup);
  CHANNELS.forEach((ch, i) => {
    const col = new THREE.Color(ch.color);
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 20), new THREE.MeshBasicMaterial({ color: col }));
    const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(ch.color), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    g.scale.set(0.9, 0.9, 1); m.add(g);
    const radius = 2.6 + (i % 3) * 0.32;
    const tilt = (i / CHANNELS.length) * Math.PI;
    const speed = 0.32 + (i % 4) * 0.07;
    // 連線（光束）
    const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending }));
    orbGroup.add(line);
    // 軌道
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.004, 6, 160), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.16 }));
    ring.rotation.x = Math.PI / 2 + Math.sin(tilt) * 0.5; ring.rotation.y = Math.cos(tilt) * 0.4;
    orbGroup.add(ring);
    orbGroup.add(m);
    orbs.push({ m, line, radius, tilt, speed, phase: i * 0.9, ring, flash: 0 });
  });

  // 粒子場
  const N = compact ? 500 : 900;
  const pg = new THREE.BufferGeometry();
  const arr = new Float32Array(N * 3);
  const cols = new Float32Array(N * 3);
  const palette = ['#2DB674', '#5EE0C4', '#F0A531', '#2E97D4', '#7C62E6'].map(c => new THREE.Color(c));
  for (let i = 0; i < N; i++) {
    const r = 3 + Math.random() * 7, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    arr[i * 3] = r * Math.sin(ph) * Math.cos(th); arr[i * 3 + 1] = r * Math.cos(ph) * 0.6; arr[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th) - 2;
    const c = palette[i % palette.length]; cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
  }
  pg.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  pg.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const particles = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.06, map: glowTexture('#ffffff'), vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(particles);

  // 資料脈衝（從光球飛向核心）
  const pulses = [];
  const pulseTex = glowTexture('#ffffff');
  function spawnPulse(orb) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: pulseTex, color: orb.m.material.color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.scale.set(0.45, 0.45, 1); scene.add(s);
    pulses.push({ s, from: orb.m.position.clone(), t: 0 });
  }

  let w = 0, h = 0;
  function resize() {
    const r = host.getBoundingClientRect();
    w = Math.max(1, r.width); h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(host); resize();

  let mx = 0, my = 0;
  host.addEventListener('pointermove', (e) => { const r = host.getBoundingClientRect(); mx = (e.clientX - r.left) / r.width - 0.5; my = (e.clientY - r.top) / r.height - 0.5; });

  let running = true, visible = true, energy = 0, raf = 0, last = performance.now(), t = 0, nextPulse = 0;
  const io = new IntersectionObserver((ents) => { visible = ents[0].isIntersecting; if (visible) loop(); });
  io.observe(host);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { last = performance.now(); loop(); } });

  const tmp = new THREE.Vector3();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    energy = Math.max(0, energy - dt * 0.6);
    brain.rotation.y += dt * (0.25 + energy * 1.5);
    brain.rotation.x = Math.sin(t * 0.4) * 0.18 + my * 0.3;
    brain.rotation.z = mx * 0.2;
    const breath = 1 + Math.sin(t * 1.6) * 0.03 + energy * 0.12;
    core.scale.setScalar(breath);
    wire.scale.setScalar(1 + Math.sin(t * 1.1 + 1) * 0.02 + energy * 0.08);
    outer.rotation.y -= dt * 0.08; outer.rotation.x += dt * 0.03;
    coreMat.emissiveIntensity = 0.7 + Math.sin(t * 2) * 0.2 + energy * 1.6;
    halo.material.opacity = 0.55 + Math.sin(t * 1.6) * 0.1 + energy * 0.4;
    halo.scale.setScalar(6.2 + energy * 2.5);
    particles.rotation.y += dt * 0.02;

    orbs.forEach((o, i) => {
      const a = t * o.speed + o.phase;
      tmp.set(Math.cos(a) * o.radius, 0, Math.sin(a) * o.radius);
      tmp.applyEuler(new THREE.Euler(Math.sin(o.tilt) * 0.5, Math.cos(o.tilt) * 0.4, 0));
      o.m.position.copy(tmp);
      o.flash = Math.max(0, o.flash - dt * 1.2);
      o.m.scale.setScalar(1 + o.flash * 1.4);
      const pos = o.line.geometry.attributes.position;
      pos.setXYZ(0, 0, 0, 0); pos.setXYZ(1, tmp.x, tmp.y, tmp.z); pos.needsUpdate = true;
      o.line.material.opacity = 0.08 + o.flash * 0.7 + (Math.sin(t * 2 + i) * 0.5 + 0.5) * 0.08;
    });
    if (t > nextPulse) { spawnPulse(orbs[Math.floor(Math.random() * orbs.length)]); nextPulse = t + 0.5 + Math.random() * 0.8; }
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i]; p.t += dt * 1.1;
      p.s.position.copy(p.from).multiplyScalar(1 - p.t);
      p.s.material.opacity = Math.sin(Math.min(1, p.t) * Math.PI);
      if (p.t >= 1) { scene.remove(p.s); p.s.material.dispose(); pulses.splice(i, 1); }
    }
    camera.position.x += (mx * 0.8 - camera.position.x) * 0.03;
    camera.position.y += (0.4 - my * 0.5 - camera.position.y) * 0.03;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }
  function loop() {
    cancelAnimationFrame(raf);
    const step = (now) => {
      if (!running || !visible || document.hidden) return;
      frame(now);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }
  loop();

  return {
    pulse(channelId) {
      energy = 1;
      const i = CHANNELS.findIndex(c => c.id === channelId);
      const o = orbs[i >= 0 ? i : 0];
      o.flash = 1; for (let k = 0; k < 4; k++) setTimeout(() => spawnPulse(o), k * 120);
    },
    dispose() { running = false; ro.disconnect(); io.disconnect(); renderer.dispose(); },
  };
}
