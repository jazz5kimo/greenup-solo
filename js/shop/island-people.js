// 小島上走動的人：環島散步（經過展台會停下來看，有人牽著狗）、從碼頭來店裡買東西再提著袋子回去、
// 沿著前步道走到店門口、廣場上繞著主角看、海灘散步、碼頭釣魚，以及各業態造景裡的人（攤販、喝咖啡、採茶、劈柴、曬太陽…）；
// 店長站在門口，有人靠近就揮手。幾何與材質全部共用；手機減少人數。
import * as THREE from 'three';

const TAU = Math.PI * 2;
const SKIN = ['#f5d0b5', '#e8b896', '#c98e6a', '#a8704f', '#f1c7a8', '#8a5a3e'];
const HAIR = ['#2b211c', '#4a3426', '#6b4a2a', '#1c1c1c', '#8a6a4a', '#c9a66b', '#3a3a3a'];
const PANTS = ['#3a4a6b', '#2f3a40', '#6b5a4a', '#4a5a3a', '#2b2b3a', '#8a7a6a'];
const turn = (a, b, k) => { let d = ((b - a) % TAU + TAU * 1.5) % TAU - Math.PI; return a + d * Math.min(1, k); };
const angDist = (a, b) => Math.abs(((a - b) % TAU + TAU * 1.5) % TAU - Math.PI);

export function createPeople({ world, anim, rnd, night, mobile, pal, L, spots = [], hat: sceneHat, shadows = true }) {
  const mats = new Map(), geos = new Map();
  const m = (c, o = {}) => { const k = c + JSON.stringify(o); if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: new THREE.Color(c), roughness: 0.75, ...o })); return mats.get(k); };
  const g = (k, f) => { if (!geos.has(k)) geos.set(k, f()); return geos.get(k); };
  const pick = (a) => a[Math.floor(rnd() * a.length) % a.length];
  const hexOf = (c) => '#' + new THREE.Color(c).getHexString();
  const shirts = pal.map(hexOf).concat(['#ffffff', '#f2c94c', '#6fa8dc', '#e06666', '#93c47d']);
  const S = mobile ? 1.05 : 0.9;
  const people = [];
  const mesh = (geo, mat, x, y, z) => { const n = new THREE.Mesh(geo, mat); n.position.set(x, y, z); n.castShadow = shadows; return n; };

  // ---------- 人物模型（面向 +z，身高約 1.1 × 縮放） ----------
  function person(o = {}) {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const skin = m(o.skin || pick(SKIN)), shirt = m(o.shirt || pick(shirts)), pants = m(o.pants || pick(PANTS)), hairM = m(o.hair || pick(HAIR));
    const legGeo = g('leg', () => { const x = new THREE.CylinderGeometry(0.055, 0.05, 0.38, 6); x.translate(0, -0.19, 0); return x; });
    const shoeGeo = g('shoe', () => new THREE.BoxGeometry(0.09, 0.05, 0.14));
    const mkLeg = (x) => { const p = new THREE.Group(); p.position.set(x, 0.4, 0); p.add(mesh(legGeo, pants, 0, 0, 0)); p.add(mesh(shoeGeo, m('#3a2f2a'), 0, -0.38, 0.025)); body.add(p); return p; };
    const legL = mkLeg(0.075), legR = mkLeg(-0.075);
    if (o.skirt) body.add(mesh(g('skirt', () => new THREE.ConeGeometry(0.2, 0.3, 10, 1, true)), pants, 0, 0.42, 0));
    body.add(mesh(g('torso', () => new THREE.CapsuleGeometry(0.14, 0.2, 4, 10)), shirt, 0, 0.6, 0));
    if (o.apron) body.add(mesh(g('apron', () => new THREE.BoxGeometry(0.24, 0.34, 0.02)), m('#ffffff'), 0, 0.55, 0.14));
    const armGeo = g('arm', () => { const x = new THREE.CylinderGeometry(0.042, 0.038, 0.3, 6); x.translate(0, -0.15, 0); return x; });
    const handGeo = g('hand', () => new THREE.SphereGeometry(0.045, 8, 6));
    const mkArm = (x) => { const p = new THREE.Group(); p.position.set(x, 0.77, 0); p.add(mesh(armGeo, shirt, 0, 0, 0)); p.add(mesh(handGeo, skin, 0, -0.32, 0)); body.add(p); return p; };
    const armL = mkArm(0.19), armR = mkArm(-0.19);
    const head = new THREE.Group(); head.position.y = 0.97; body.add(head);
    head.add(mesh(g('head', () => new THREE.SphereGeometry(0.13, 14, 10)), skin, 0, 0, 0));
    const hair = mesh(g('hair', () => new THREE.SphereGeometry(0.138, 14, 10, 0, TAU, 0, Math.PI * 0.52)), hairM, 0, 0.005, -0.012); hair.rotation.x = -0.32; head.add(hair);
    if (o.bun) head.add(mesh(g('bun', () => new THREE.SphereGeometry(0.06, 8, 6)), hairM, 0, 0.08, -0.12));
    for (const x of [-0.045, 0.045]) head.add(mesh(g('eye', () => new THREE.SphereGeometry(0.016, 6, 4)), m('#1c1c1c'), x, 0.01, 0.122));
    const hat = o.hat;
    if (hat === 'straw') { head.add(mesh(g('straw', () => new THREE.ConeGeometry(0.3, 0.16, 14)), m('#e2c15a', { roughness: 1 }), 0, 0.14, 0)); }
    else if (hat === 'sun') { head.add(mesh(g('sunb', () => new THREE.CylinderGeometry(0.26, 0.26, 0.015, 16)), m(o.hatC || '#fbf3e0'), 0, 0.08, 0)); head.add(mesh(g('sunc', () => new THREE.CylinderGeometry(0.12, 0.135, 0.09, 14)), m(o.hatC || '#fbf3e0'), 0, 0.13, 0)); }
    else if (hat === 'cap') { head.add(mesh(g('cap', () => new THREE.SphereGeometry(0.14, 12, 8, 0, TAU, 0, Math.PI / 2)), m(o.hatC || pick(shirts)), 0, 0.03, 0)); head.add(mesh(g('capv', () => new THREE.BoxGeometry(0.16, 0.015, 0.1)), m(o.hatC || '#333333'), 0, 0.04, 0.15)); }
    let bag = null;
    if (o.bag !== undefined) { bag = mesh(g('bag', () => new THREE.BoxGeometry(0.16, 0.18, 0.07)), m(o.bagC || hexOf(pal[0])), 0, -0.42, 0); armR.add(bag); bag.visible = !!o.bag; }
    let item = null;
    if (o.prop === 'cup') { item = mesh(g('cup', () => new THREE.CylinderGeometry(0.035, 0.03, 0.08, 8)), m('#ffffff'), 0, -0.35, 0.03); armR.add(item); }
    if (o.prop === 'can') { item = new THREE.Group(); item.add(mesh(g('can', () => new THREE.CylinderGeometry(0.06, 0.06, 0.1, 8)), m('#5fa8d3', { metalness: 0.4, roughness: 0.4 }), 0, 0, 0)); const sp = mesh(g('spout', () => new THREE.CylinderGeometry(0.01, 0.015, 0.14, 5)), m('#5fa8d3'), 0, 0.02, 0.09); sp.rotation.x = 1.1; item.add(sp); item.position.set(0, -0.38, 0.03); armR.add(item); }
    if (o.prop === 'balloon') {
      const b = new THREE.Group(); b.position.set(0.22, 0.5, 0.05); root.add(b);
      b.add(mesh(g('bstr', () => { const x = new THREE.CylinderGeometry(0.004, 0.004, 0.85, 3); x.translate(0, 0.42, 0); return x; }), m('#ffffff'), 0, 0, 0));
      const ball = mesh(g('ballo', () => { const x = new THREE.SphereGeometry(0.13, 12, 10); x.scale(1, 1.2, 1); return x; }), m(o.balloonC || hexOf(pal[1]), { roughness: 0.3 }), 0, 0.95, 0); b.add(ball);
      const ph = rnd() * 6; anim.push((t) => { b.rotation.z = Math.sin(t * 1.3 + ph) * 0.15; b.rotation.x = Math.sin(t * 0.9 + ph) * 0.1; });
    }
    root.scale.setScalar(S * (o.kid ? 0.72 : 0.92 + rnd() * 0.14));
    world.add(root);
    const p = { root, body, legL, legR, armL, armR, head, bag, item, phase: rnd() * 6, mode: 'stand', heading: 0, kind: o.kind || 'person', moving: false, seatY: 0 };
    people.push(p);
    return p;
  }

  // ---------- 動作 ----------
  const lerp = (o, key, v, k) => { o[key] += (v - o[key]) * k; };
  function animate(p, dt, t) {
    const k = Math.min(1, dt * 9), ph = p.phase;
    let lL = 0, lR = 0, aLx = 0, aRx = 0, aLz = 0.06, aRz = -0.06, by = 0, tilt = 0, hx = 0;
    switch (p.mode) {
      case 'walk': lL = Math.sin(ph) * 0.6; lR = -lL; aLx = -Math.sin(ph) * 0.5; aRx = -aLx; by = Math.abs(Math.cos(ph)) * 0.03; break;
      case 'sit': lL = lR = -1.4; aLx = aRx = -0.45; by = p.seatY - 0.4; break;
      case 'fish': lL = -0.75 + Math.sin(t * 1.3) * 0.15; lR = -0.75 - Math.sin(t * 1.3) * 0.15; aLx = aRx = -1.15; by = p.seatY - 0.4; break;
      case 'work': lL = 0.15; lR = -0.2; tilt = 0.42; aLx = aRx = -1.0 + Math.sin(t * 4.2 + ph) * 0.55; hx = 0.2; break;
      case 'crouch': lL = lR = -1.15; by = -0.2; tilt = 0.35; aLx = -0.7; aRx = -0.95 + Math.sin(t * 2 + ph) * 0.25; hx = 0.25; break;
      case 'swim': by = -0.5; aLz = 1.2 + Math.sin(t * 2.2 + ph) * 0.3; aRz = -aLz; aLx = aRx = -0.3; break;
      case 'wave': aRz = -2.55 + Math.sin(t * 9) * 0.3; break;
      case 'look': hx = -0.15; break;
      default: by = Math.sin(t * 1.6 + ph) * 0.006;
    }
    if (p.item && p.mode === 'sit') { const sip = Math.max(0, Math.sin(t * 0.6 + ph)) > 0.85; aRx = sip ? -2.2 : -0.9; }
    lerp(p.legL.rotation, 'x', lL, k); lerp(p.legR.rotation, 'x', lR, k);
    lerp(p.armL.rotation, 'x', aLx, k); lerp(p.armR.rotation, 'x', aRx, k);
    lerp(p.armL.rotation, 'z', aLz, k); lerp(p.armR.rotation, 'z', aRz, k);
    lerp(p.body.position, 'y', by, p.mode === 'walk' ? 1 : k); lerp(p.body.rotation, 'x', tilt, k); lerp(p.head.rotation, 'x', hx, k);
  }
  // 移動一步：轉向、貼地、擺腿
  const SPEED = 0.42;
  function stepTo(p, x, z, dt, speed = SPEED) {
    const r = p.root, dx = x - r.position.x, dz = z - r.position.z, d = Math.hypot(dx, dz);
    if (d < 1e-4) return 0;
    const s = Math.min(d, speed * dt);
    r.position.x += dx / d * s; r.position.z += dz / d * s;
    p.heading = turn(p.heading, Math.atan2(dx, dz), dt * 7); r.rotation.y = p.heading;
    p.phase += s / S * 15; p.mode = 'walk';
    return d - s;
  }
  function faceTo(p, x, z, dt) { p.heading = turn(p.heading, Math.atan2(x - p.root.position.x, z - p.root.position.z), dt * 5); p.root.rotation.y = p.heading; }
  function stick(p, dt) { const y = (p.ground || L.ground)(p.root.position.x, p.root.position.z); p.root.position.y += (y - p.root.position.y) * Math.min(1, dt * 10); }

  // 依步驟走：{ go:[x,z] } 或 { wait:秒, look:[x,z], mode, on() }、{ until: () => 條件成立才往下 }，走完從頭再來
  // ground：自訂地面高度（百貨公司樓層、手扶梯）
  function script(p, steps, start = 0, ground = null) {
    let i = start % steps.length, timer = -1, began = false;
    if (ground) p.ground = ground;
    const s0 = steps.find(s => s.go) || steps[0];
    const first = steps.slice(i).find(s => s.go) || s0;
    p.root.position.set(first.go[0], (p.ground || L.ground)(...first.go), first.go[1]);
    p.update = (dt, t) => {
      const s = steps[i];
      if (s.go) { if (stepTo(p, s.go[0], s.go[1], dt, s.speed) < 0.01) i = (i + 1) % steps.length; }
      else if (s.until) {
        if (!began) { began = true; if (s.on) s.on(p); }
        p.mode = s.mode || 'stand'; if (s.look) faceTo(p, s.look[0], s.look[1], dt);
        if (s.until(p)) { began = false; i = (i + 1) % steps.length; }
      } else {
        if (timer < 0) { timer = s.wait; if (s.on) s.on(p); }
        p.mode = s.mode || 'stand'; if (s.look) faceTo(p, s.look[0], s.look[1], dt);
        timer -= dt; if (timer < 0) { timer = -1; i = (i + 1) % steps.length; }
      }
      stick(p, dt);
    };
    return p;
  }
  const there = (pts, waitA, waitB) => [...pts.map(go => ({ go })), waitB, ...pts.slice(0, -1).reverse().map(go => ({ go })), waitA];

  // ---------- 環島散步 ----------
  const { RING, stations } = L;
  function ringWalker(p, th, dir, speed = SPEED, dog = null) {
    let pause = 0, cool = 2, look = null;
    const lane = dir > 0 ? 1 : -1;
    const at = (a) => { const r = RING + lane * L.laneOff(a); return [Math.sin(a) * r, Math.cos(a) * r]; };
    const [x0, z0] = at(th); p.root.position.set(x0, 0.13, z0);
    p.update = (dt, t) => {
      cool -= dt;
      if (pause > 0) { pause -= dt; p.mode = 'look'; faceTo(p, look[0], look[1], dt); }
      else {
        th += dir * speed * dt / RING;
        const [x, z] = at(th); stepTo(p, x, z, dt, speed * 3);
        if (cool < 0) for (const a of stations) if (angDist(th, a) < 0.03) { cool = 6; if (rnd() < 0.6) { pause = 2 + rnd() * 2; look = [Math.sin(a) * RING, Math.cos(a) * RING]; } }
      }
      stick(p, dt);
      if (dog) dog.follow(dt, t, th - dir * 0.16, lane, pause > 0);
    };
    return p;
  }
  // 狗：跟在主人後面小跑步
  function makeDog(color) {
    const root = new THREE.Group(); const fur = m(color), dark = m('#3a2f2a');
    root.add(mesh(g('dogb', () => new THREE.BoxGeometry(0.14, 0.13, 0.3)), fur, 0, 0.2, 0));
    const head = mesh(g('dogh', () => new THREE.BoxGeometry(0.12, 0.12, 0.13)), fur, 0, 0.3, 0.17); root.add(head);
    root.add(mesh(g('dogn', () => new THREE.BoxGeometry(0.06, 0.05, 0.05)), dark, 0, 0.28, 0.25));
    for (const x of [-0.04, 0.04]) root.add(mesh(g('doge', () => new THREE.BoxGeometry(0.03, 0.06, 0.03)), dark, x, 0.38, 0.14));
    const tail = mesh(g('dogt', () => { const x = new THREE.BoxGeometry(0.03, 0.03, 0.12); x.translate(0, 0, -0.06); return x; }), fur, 0, 0.26, -0.15); tail.rotation.x = -0.6; root.add(tail);
    const legs = [[-0.05, 0.1], [0.05, 0.1], [-0.05, -0.1], [0.05, -0.1]].map(([x, z]) => { const l = mesh(g('dogl', () => { const y = new THREE.BoxGeometry(0.035, 0.14, 0.035); y.translate(0, -0.07, 0); return y; }), fur, x, 0.14, z); root.add(l); return l; });
    root.scale.setScalar(S * 1.05); world.add(root);
    const d = { root, kind: 'dog', heading: 0, phase: 0, mode: 'walk' };
    d.follow = (dt, t, th, lane, still) => {
      const r = RING + lane * (L.laneOff(th) + 0.22), x = Math.sin(th) * r, z = Math.cos(th) * r;
      const dx = x - root.position.x, dz = z - root.position.z, dist = Math.hypot(dx, dz);
      if (dist > 0.01 && !still) { const s = Math.min(dist, dt * SPEED * 4); root.position.x += dx / dist * s; root.position.z += dz / dist * s; d.heading = turn(d.heading, Math.atan2(dx, dz), dt * 8); d.phase += s * 40; d.mode = 'walk'; }
      else d.mode = 'stand';
      root.rotation.y = d.heading; root.position.y = L.ground(root.position.x, root.position.z);
      const sw = d.mode === 'walk' ? Math.sin(d.phase) * 0.7 : 0;
      legs[0].rotation.x = legs[3].rotation.x = sw; legs[1].rotation.x = legs[2].rotation.x = -sw;
      tail.rotation.y = Math.sin(t * (still ? 14 : 8)) * 0.5;
    };
    people.push(d);
    return d;
  }

  // ---------- 安排人物 ----------
  const hatFor = () => (sceneHat && rnd() < 0.45 ? sceneHat : rnd() < 0.2 ? 'cap' : null);
  const look = (o = {}) => ({ hat: hatFor(), skirt: rnd() < 0.3, bun: rnd() < 0.3, ...o });
  // 環島：順、逆時針各兩位（手機各一位），其中一位牽狗
  const nRing = mobile ? 2 : 4;
  for (let i = 0; i < nRing; i++) {
    const dir = i % 2 ? -1 : 1, th = rnd() * TAU;
    const dog = !mobile && i === 0 ? makeDog(pick(['#c9a06b', '#f2ead8', '#5a4636', '#e8c38a'])) : null;
    if (dog) dog.root.position.set(Math.sin(th) * RING, 0.13, Math.cos(th) * RING);
    ringWalker(person(look({ kind: 'ring' })), th, dir, SPEED * (0.85 + (i >> 1) * 0.12), dog);
  }
  // 碼頭來的客人：進店買東西 → 提袋子回碼頭（城市場景由 island-city.js 安排過馬路、停車的客人）
  const v = L.routes.visitor, door = L.door;
  const sea = L.pier ? [L.pier.x * 3, L.pier.z * 3] : [0, 30];
  const nVis = !L.pier || !v ? 0 : mobile ? 1 : 2;
  for (let i = 0; i < nVis; i++) {
    const p = person(look({ kind: 'visitor', bag: false }));
    script(p, there(v,
      { wait: 3 + rnd() * 2, look: sea, on: (q) => { if (q.bag) q.bag.visible = false; } },
      { wait: 2.6, look: [door[0], door[1] - 2], on: (q) => { if (q.bag) q.bag.visible = true; } }), i * 5);
  }
  // 前步道 → 店門口
  if (!mobile) {
    const f = L.routes.front;
    script(person(look({ kind: 'front' })), there(f, { wait: 2.5, look: [0, 9] }, { wait: 2.8, look: [L.door[0], L.door[1] - 3] }));
  }
  // 廣場繞圈看主角
  {
    const pts = []; const n = 14, dir = rnd() < 0.5 ? 1 : -1, a0 = rnd() * TAU;
    for (let i = 0; i < n; i++) { const a = a0 + dir * i / n * TAU; pts.push([Math.sin(a) * 1.34, 0.9 + Math.cos(a) * 1.34]); }
    const steps = []; pts.forEach((go, i) => { steps.push({ go, speed: SPEED * 0.8 }); if (i % 7 === 3) steps.push({ wait: 2.5, look: [0, 0.9], mode: 'look' }); });
    script(person(look({ kind: 'plaza', kid: rnd() < 0.4, prop: rnd() < 0.5 ? 'balloon' : null })), steps);
  }
  // 海灘散步
  for (const [a, b] of L.beachLanes.slice(0, mobile ? 1 : 2)) {
    const pts = []; for (let th = a; th <= b + 1e-6; th += 0.08) { const r = L.shore(th) * 0.955; pts.push([Math.sin(th) * r, Math.cos(th) * r]); }
    const end = (th) => ({ wait: 2.5, look: [Math.sin(th) * 30, Math.cos(th) * 30] });
    script(person(look({ kind: 'beach', hat: sceneHat === 'sun' || rnd() < 0.3 ? 'sun' : null })), there(pts, end(a), end(b)), Math.floor(rnd() * pts.length));
  }
  // 碼頭釣魚
  if (L.pier) {
    const { th } = L.pier, dx = Math.sin(th), dz = Math.cos(th), r = L.pier.r + L.pier.len / 2 - 0.12;
    const p = person(look({ kind: 'fisher', hat: rnd() < 0.6 ? 'sun' : 'cap' }));
    p.root.position.set(dx * r + dz * 0.25, 0.07, dz * r - dx * 0.25); p.heading = th; p.root.rotation.y = th; p.seatY = 0.07 / p.root.scale.y;
    const rod = new THREE.Group(); rod.position.set(0, -0.3, 0.05); p.armR.add(rod);
    rod.add(mesh(g('rod', () => { const x = new THREE.CylinderGeometry(0.008, 0.012, 1.2, 4); x.translate(0, 0.6, 0); return x; }), m('#5a3d2b'), 0, 0, 0));
    rod.rotation.x = 2.2;
    const line = mesh(g('fline', () => { const x = new THREE.CylinderGeometry(0.003, 0.003, 1, 3); x.translate(0, -0.5, 0); return x; }), m('#ffffff'), 0, 1.2, 0); rod.add(line);
    const bob = mesh(g('bob', () => new THREE.SphereGeometry(0.04, 8, 6)), m('#e8453c'), 0, 0, 0); world.add(bob);
    const tip = new THREE.Vector3();
    p.update = (dt, t) => {
      p.mode = 'fish';
      p.root.updateMatrixWorld(); tip.set(0, 1.2, 0); rod.localToWorld(tip);
      const bx = dx * (r + 1.2) + dz * 0.25, bz = dz * (r + 1.2) - dx * 0.25, by = -0.5 + Math.sin(t * 2.2) * 0.04;
      bob.position.set(bx, by, bz);
      const len = Math.hypot(tip.x - bx, tip.y - by, tip.z - bz); line.scale.y = len / (p.root.scale.y || 1);
      line.lookAt(bx, by, bz); line.rotateX(-Math.PI / 2);
    };
  }
  // 造景裡的人（定點）
  for (const s of spots.slice(0, mobile ? 2 : 6)) {
    const p = person(look({ kind: 'spot', hat: s.hat || hatFor(), prop: s.prop, apron: s.pose === 'work' && !s.hat, bag: s.prop === 'bag' ? true : undefined }));
    const y = s.y ?? L.ground(s.x, s.z);
    p.root.position.set(s.x, y, s.z); p.heading = Math.atan2(s.face[0] - s.x, s.face[1] - s.z); p.root.rotation.y = p.heading;
    p.seatY = 0; p.mode = s.pose;
    if (s.pose === 'sit') { p.seatY = 0; p.body.position.y = -0.4; }
    let idle = 3 + rnd() * 4;
    p.update = (dt) => {
      p.mode = s.pose;
      if (s.pose === 'stand') { idle -= dt; if (idle < 0) { idle = 4 + rnd() * 5; p.heading += (rnd() - 0.5) * 0.8; } p.root.rotation.y = turn(p.root.rotation.y, p.heading, dt * 3); }
    };
  }
  // 店長：站在門口，有人走近就揮手
  {
    const p = person(look({ kind: 'keeper', apron: true, hat: null, shirt: hexOf(pal[0]) }));
    const [x, z] = L.keeper; p.root.position.set(x, L.ground(x, z), z); p.heading = 0.25; p.root.rotation.y = 0.25;
    let wave = 0, cool = 0;
    p.update = (dt) => {
      cool -= dt;
      if (wave > 0) { wave -= dt; p.mode = 'wave'; }
      else {
        p.mode = 'stand';
        if (cool < 0) for (const q of people) if (q !== p && q.kind !== 'dog' && Math.hypot(q.root.position.x - x, q.root.position.z - z) < 1.3) { wave = 1.8; cool = 6; faceTo(p, q.root.position.x, q.root.position.z, 1); break; }
        p.root.rotation.y = turn(p.root.rotation.y, wave > 0 ? p.root.rotation.y : 0.25, dt * 2);
      }
    };
  }

  let last = -1;
  anim.push((t) => {
    const dt = last < 0 ? 0.016 : Math.min(0.05, Math.max(0, t - last)); last = t;
    for (const p of people) { if (p.update) p.update(dt, t); if (p.legL) animate(p, dt, t); }
  });
  return {
    list: people, person, script, there, SPEED, scale: S,
    info: () => people.map(p => ({ kind: p.kind, mode: p.mode, hidden: p.root.visible === false, x: +p.root.position.x.toFixed(3), y: +p.root.position.y.toFixed(3), z: +p.root.position.z.toFixed(3) })),
  };
}
