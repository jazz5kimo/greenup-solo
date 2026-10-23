// 銷售網頁開頭的沉浸式 3D 小島：店舖蓋在島上、主打商品放在環島步道的展台，
// 往下滾動時鏡頭一站一站飛過去，可拖曳轉視角、點商品看詳情或加入購物車。
// 配色跟著業主風格（含夜間風格）；手機降低細節；不支援 WebGL 時不顯示（沿用原本的主視覺）；
// 系統設定「減少動態效果」時不綁滾動、改為靜態鏡頭。
// 每種業態有自己的風景（island-scenes.js），島的形狀與擺設依業主代號變化；島上有人走動（island-people.js）。
import * as THREE from 'three';
import { TENANT } from '../tenant.js';
import { PRODUCT_MAP } from '../data.js';
import { pName } from '../i18n.js';
import { getShopConfig } from '../shop-config.js';
import { esc, money } from '../util.js';
import { artImage, productPiece, heroKind, heroCenterpiece } from './shop-hero.js';
import { visibleProducts, featuredId, priceHTML } from './storefront.js';
import { seedOf, rng, shapeOf, sceneFor, makeLayout, buildScene, shopRoof, shopDeco, makeBoat } from './island-scenes.js';
import { createPeople } from './island-people.js';
import { cityLayout, buildCity, CITY_VENUE } from './island-city.js';

const TXT = {
  zh: { scrollC: '往下滾動，逛逛商圈', loadingC: '商圈建造中…', scroll: '往下滾動，逛逛小島', drag: '拖曳可以轉動視角', skip: '直接逛商品', add: '加入購物車', detail: '看詳情', enter: '逛全部商品', welcome: '歡迎光臨', stop: '第 {n} 站', loading: '小島建造中…', shop: '店舖' },
  en: { scrollC: 'Scroll to explore the shopping district', loadingC: 'Building the city…', scroll: 'Scroll to explore the island', drag: 'Drag to look around', skip: 'Skip to products', add: 'Add to cart', detail: 'Details', enter: 'Browse all products', welcome: 'Welcome', stop: 'Stop {n}', loading: 'Building the island…', shop: 'Shop' },
  ja: { scrollC: 'スクロールして街を散策', loadingC: '街を準備中…', scroll: 'スクロールして島を散策', drag: 'ドラッグで視点を回転', skip: '商品一覧へ', add: 'カートに入れる', detail: '詳細', enter: '全商品を見る', welcome: 'いらっしゃいませ', stop: '{n} 番目', loading: '島を準備中…', shop: 'ショップ' },
  vi: { scrollC: 'Cuộn để dạo khu mua sắm', loadingC: 'Đang dựng khu phố…', scroll: 'Cuộn để khám phá hòn đảo', drag: 'Kéo để xoay góc nhìn', skip: 'Xem sản phẩm ngay', add: 'Thêm vào giỏ', detail: 'Chi tiết', enter: 'Xem tất cả sản phẩm', welcome: 'Chào mừng', stop: 'Điểm {n}', loading: 'Đang dựng đảo…', shop: 'Cửa hàng' },
  ms: { scrollC: 'Tatal untuk menjelajah kawasan beli-belah', loadingC: 'Membina bandar…', scroll: 'Tatal untuk menjelajah pulau', drag: 'Seret untuk melihat sekeliling', skip: 'Terus ke produk', add: 'Tambah ke troli', detail: 'Butiran', enter: 'Lihat semua produk', welcome: 'Selamat datang', stop: 'Hentian {n}', loading: 'Membina pulau…', shop: 'Kedai' },
};

// 開關：網址 ?island=0／1 優先；其次網站設計工作室的設定（預設開啟）
export function islandEnabled() {
  const q = new URLSearchParams(location.search).get('island');
  if (q === '0' || q === '1') return q === '1';
  return getShopConfig().island !== false;
}

const SIM_X = Math.max(1, Math.min(10, Math.round(+new URLSearchParams(location.search).get('islspeed') || 1)));
const C = (c) => new THREE.Color(c);
const lum = (c) => { const x = C(c); return 0.2126 * x.r + 0.7152 * x.g + 0.0722 * x.b; };
const R = 8.4; // 島的半徑
// 海岸線形狀（每個業主不同，build 時設定）
let SHAPE = { fr: [3, 5, 7], amp: [0.07, 0.05, 0.03], ph: [1.3, 0.4, 2.1] };
const shore = (th, k = 1) => { const { fr, amp, ph } = SHAPE; return R * k * (1 + amp[0] * Math.sin(fr[0] * th + ph[0]) + amp[1] * Math.sin(fr[1] * th + ph[1]) + amp[2] * Math.sin(fr[2] * th + ph[2])); };
const RING = 5.0; // 環島步道半徑（商品展台位置）
const SHOP_Z = -3.3;

// 海浪高度（與海面著色器相同的公式，給帆船浮在浪上）
const smooth = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
const waveAt = (x, z, t) => (Math.sin(x * 0.32 + t * 1.1) * 0.16 + Math.cos(z * 0.41 + t * 0.9) * 0.13 + Math.sin((x + z) * 0.9 + t * 2.0) * 0.04) * smooth(8.0, 12.5, Math.hypot(x, z));
function outline(k) {
  const s = new THREE.Shape(); const N = 96;
  for (let i = 0; i <= N; i++) { const th = i / N * Math.PI * 2; const r = shore(th, k); const x = Math.sin(th) * r, z = Math.cos(th) * r; i ? s.lineTo(x, -z) : s.moveTo(x, -z); }
  return s;
}
// 平放的擠出體：形狀在 xz 平面，厚度往上，頂面在 y=top
function slab(shape, depth, bevel, top, mat) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 4 });
  g.rotateX(-Math.PI / 2); g.translate(0, top - depth - bevel, 0);
  return new THREE.Mesh(g, mat);
}
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });

export function createIsland({ shop, onOpen, onAdd }) {
  if (!document.querySelector('main')) return null;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: innerWidth > 700, alpha: false, powerPreference: 'high-performance' }); } catch { return null; }
  const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = () => innerWidth < 760;
  // 城市場景的提示改說「商圈」
  const tx = (k, v = {}) => { const T = TXT[shop.lang] || TXT.zh; const kk = sceneDef && sceneDef.kind === 'city' && T[k + 'C'] ? k + 'C' : k; return T[kk].replace(/\{(\w+)\}/g, (_, x) => v[x] ?? ''); };

  // ---------- DOM ----------
  const sec = document.createElement('section');
  sec.className = 'isl' + (reduced ? ' isl-static' : ''); sec.id = 'island'; sec.setAttribute('aria-label', '3D');
  sec.innerHTML = `<div class="isl-stage">
      <div class="isl-cv"></div>
      <div class="isl-pins"></div>
      <div class="isl-title"><span class="isl-kicker"></span><h2></h2><p class="isl-hint"><i class="isl-mouse"></i><span data-t="scroll"></span></p></div>
      <div class="isl-card" hidden></div>
      <div class="isl-rail"></div>
      <button class="isl-skip" type="button"><span data-t="skip"></span> ↓</button>
      <p class="isl-drag" data-t="drag"></p>
      <div class="isl-load"><b></b><span data-t="loading"></span></div>
    </div>`;
  document.body.classList.add('isl-on');
  document.querySelector('main').prepend(sec);
  const $ = (s) => sec.querySelector(s);
  const host = $('.isl-cv'), pinsBox = $('.isl-pins'), card = $('.isl-card'), rail = $('.isl-rail');
  host.appendChild(renderer.domElement);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile() ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = !mobile(); renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 400);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x88aa77, 1.4); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.4); sun.position.set(10, 16, 8); scene.add(sun, sun.target);
  sun.castShadow = renderer.shadowMap.enabled; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 44 }); sun.shadow.bias = -0.0008;

  let world = new THREE.Group(); scene.add(world);
  let anim = [], stations = [], hits = [], products = [], look = {}, lookKey = '', night = false;
  let water = null, sky = null, centerpiece = null, balloon = null, boat = null, birds = [], clouds = [], sparkle = null, buildId = 0;
  let sceneDef = null, crowd = null, cityObj = null;
  // 場景：網址 ?scene= 優先，其次網站設計工作室的設定（auto＝依業態）
  let sceneOverride = new URLSearchParams(location.search).get('scene') || getShopConfig().scene || 'auto';
  const ISL_VENUE = { pinZ: SHOP_Z, pinY: 3.9, lookZ: SHOP_Z, lookY: 1.6 };
  let VENUE = ISL_VENUE;

  function dispose(o) {
    o.traverse(n => { if (n.geometry) n.geometry.dispose(); const m = n.material; if (m) (Array.isArray(m) ? m : [m]).forEach(x => { if (x.map) x.map.dispose(); x.dispose(); }); });
  }

  // ---------- 建造 ----------
  function build() {
    const my = ++buildId;
    scene.remove(world); dispose(world); world = new THREE.Group(); scene.add(world);
    anim = []; stations = []; hits = []; birds = []; clouds = [];
    const pal = (look.pal && look.pal.length ? look.pal : ['#f7b2c4', '#b8e0c8', '#f9dc82', '#c9b6ec', '#ffc8a2', '#a8dadc']).map(c => C(c).getHex());
    while (pal.length < 6) pal.push(0xffffff);
    const vars = look.vars || {};
    night = !!look.dim || lum(vars.cream || '#ffffff') < 0.3;
    const seed = seedOf(TENANT.id);
    const rnd = rng(seed);
    SHAPE = shapeOf(seed);
    sceneDef = sceneFor(TENANT, sceneOverride);
    const city = sceneDef.kind === 'city';
    VENUE = city ? CITY_VENUE : ISL_VENUE; cityObj = null;

    // 天空、霧、光
    const zen = night ? C('#0b1430') : C(look.sky || '#bfe3ff').lerp(C('#6fb6ff'), 0.55);
    const hor = night ? C('#26365e') : C(look.sky || '#fff1df').lerp(C('#ffffff'), 0.25);
    scene.fog = new THREE.Fog(hor, 38, 120);
    scene.background = hor;
    // 天空與海只建立一次（換風格時只更新顏色，避免每次重新編譯著色器）
    if (!sky) {
    sky = new THREE.Mesh(new THREE.SphereGeometry(180, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: zen }, bot: { value: hor }, sunDir: { value: new THREE.Vector3(0.5, 0.35, -0.8).normalize() }, sunCol: { value: night ? C('#c8d6ff') : C('#fff3c4') } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bot; uniform vec3 sunDir; uniform vec3 sunCol; varying vec3 vP; void main(){ float h = clamp(vP.y*1.6+0.08,0.0,1.0); vec3 c = mix(bot, top, pow(h,0.8)); float s = pow(max(dot(vP,sunDir),0.0), 220.0)*1.2 + pow(max(dot(vP,sunDir),0.0), 8.0)*0.25; gl_FragColor = vec4(c + sunCol*s, 1.0); }',
    }));
    scene.add(sky);
    }
    sky.material.uniforms.top.value.copy(zen); sky.material.uniforms.bot.value.copy(hor); sky.material.uniforms.sunCol.value.copy(night ? C('#c8d6ff') : C('#fff3c4'));
    hemi.color.copy(night ? C('#9fb4ff') : C('#ffffff')); hemi.groundColor.copy(night ? C('#1d2a3a') : C(look.ground || '#9cc489'));
    hemi.intensity = night ? 0.55 : 1.35; sun.intensity = night ? 0.5 : 2.4; sun.color.copy(night ? C('#aab8ff') : C('#fff1dc'));
    renderer.toneMappingExposure = night ? 1.15 : 1.05;
    if (night) {
      const N = 500, a = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) { const th = rnd() * Math.PI * 2, ph = rnd() * 1.2 + 0.15, r = 150; a[i * 3] = Math.cos(th) * Math.cos(ph) * r; a[i * 3 + 1] = Math.sin(ph) * r; a[i * 3 + 2] = Math.sin(th) * Math.cos(ph) * r; }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3));
      world.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.9, sizeAttenuation: true, fog: false, transparent: true, opacity: 0.85 })));
    }

    // 海
    if (!water) {
    const seg = mobile() ? 80 : 140;
    const wg = new THREE.PlaneGeometry(260, 260, seg, seg); wg.rotateX(-Math.PI / 2);
    water = new THREE.Mesh(wg, new THREE.ShaderMaterial({
      fog: false,
      uniforms: { t: { value: 0 }, deep: { value: C('#1f8fc9') }, shallow: { value: C('#5fd6d2') }, foam: { value: night ? C('#9fc3d6') : C('#ffffff') }, hor: { value: hor }, R: { value: R }, amp: { value: new THREE.Vector3() }, ph: { value: new THREE.Vector3() }, fr: { value: new THREE.Vector3() } },
      vertexShader: `uniform float t; varying vec3 vW; varying float vH;
        void main(){ vec3 p = position; float w = sin(p.x*0.32+t*1.1)*0.16 + cos(p.z*0.41+t*0.9)*0.13 + sin((p.x+p.z)*0.9+t*2.0)*0.04;
          float d = length(p.xz); p.y += w * smoothstep(8.0, 12.5, d); vH = w; vec4 wp = modelMatrix*vec4(p,1.0); vW = wp.xyz; gl_Position = projectionMatrix*viewMatrix*wp; }`,
      fragmentShader: `uniform float t; uniform vec3 deep; uniform vec3 shallow; uniform vec3 foam; uniform vec3 hor; uniform float R; uniform vec3 amp; uniform vec3 ph; uniform vec3 fr; varying vec3 vW; varying float vH;
        void main(){ float th = atan(vW.x, vW.z); float s = R*(1.0+amp.x*sin(fr.x*th+ph.x)+amp.y*sin(fr.y*th+ph.y)+amp.z*sin(fr.z*th+ph.z));
          float d = length(vW.xz) - s; vec3 c = mix(shallow, deep, smoothstep(0.5, 7.0, d));
          float f = smoothstep(1.3, 0.0, d) * (0.65 + 0.35*sin(d*6.0 - t*2.4)); f += smoothstep(0.12, 0.2, vH) * 0.35;
          c = mix(c, foam, clamp(f,0.0,1.0)*0.85);
          float fogf = smoothstep(40.0, 125.0, length(vW.xz)); c = mix(c, hor, fogf);
          gl_FragColor = vec4(c, 1.0); }`,
    }));
    water.position.y = -0.55; scene.add(water);
    }
    { const u = water.material.uniforms, wc = sceneDef.water || {};
      u.deep.value.copy(night ? C('#0d2a4a') : C(wc.deep || '#1f8fc9')); u.shallow.value.copy(night ? C('#1b5a6e') : C(wc.shallow || '#5fd6d2')); u.foam.value.copy(night ? C('#9fc3d6') : C('#ffffff')); u.hor.value.copy(hor);
      u.amp.value.fromArray(SHAPE.amp); u.ph.value.fromArray(SHAPE.ph); u.fr.value.fromArray(SHAPE.fr); }
    water.visible = !city;

    // 島：沙灘、草地、水下岩層（城市場景沒有）
    if (!city) {
      const sandC = night ? C(sceneDef.sand).lerp(C('#3e3528'), 0.55) : C(sceneDef.sand);
      const sand = slab(outline(1.0), 0.6, 0.25, -0.25, std(sandC, { roughness: 1 })); sand.receiveShadow = true; world.add(sand);
      const grassBase = night ? C(sceneDef.grass).lerp(C('#173322'), 0.6) : C(sceneDef.grass).lerp(C(look.ground || '#9cc489'), 0.18);
      const grass = slab(outline(0.84), 0.5, 0.3, 0.12, std(grassBase, { roughness: 0.95 })); grass.receiveShadow = true; world.add(grass);
      const rock = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.95, R * 0.55, 3.2, 28, 1), std(night ? 0x3a3f4a : 0x8a7f72, { flatShading: true }));
      rock.position.y = -2.2; world.add(rock);
    }
    // 步道與廣場
    const pathC = city ? C(night ? '#8d867a' : '#d6cab3') : C(vars.cream2 || '#ead9bd').lerp(C('#d9c8a8'), 0.4);
    const path = new THREE.Mesh(new THREE.RingGeometry(RING - 0.45, RING + 0.45, 96, 1), std(pathC, { roughness: 1 })); path.rotation.x = -Math.PI / 2; path.position.y = 0.135; path.receiveShadow = true; world.add(path);
    const plaza = new THREE.Mesh(new THREE.CircleGeometry(1.9, 48), std(pathC, { roughness: 1 })); plaza.rotation.x = -Math.PI / 2; plaza.position.set(0, 0.136, 0.9); plaza.receiveShadow = true; world.add(plaza);
    const walkL = city ? 10.2 - 0.9 : RING - 0.6;
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(1.1, walkL), std(pathC, { roughness: 1 })); walk.rotation.x = -Math.PI / 2; walk.position.set(0, 0.137, 0.9 + walkL / 2); world.add(walk);

    // 店舖
    const shopG = new THREE.Group(); shopG.position.set(0, 0.13, SHOP_Z);
    const wallC = lum(vars.card || '#fffaf2') > 0.55 ? C(vars.card || '#fffaf2') : C('#f3ead9'); const roofC = C(pal[0]).lerp(C('#000000'), 0.18);
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.1, 2.3), std(wallC, { roughness: 0.7 })); body.position.y = 1.05; body.castShadow = body.receiveShadow = true;
    const roof = shopRoof(sceneDef.roof, roofC, wallC);
    const stripe = canvasTex(256, 64, (g, w, h) => { const cs = ['#' + C(pal[0]).getHexString(), '#ffffff']; for (let i = 0; i < 8; i++) { g.fillStyle = cs[i % 2]; g.fillRect(i * w / 8, 0, w / 8, h); } });
    const awning = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.07, 1.0), [std(0xffffff), std(0xffffff), new THREE.MeshStandardMaterial({ map: stripe, roughness: 0.7 }), std(0xffffff), new THREE.MeshStandardMaterial({ map: stripe }), std(0xffffff)]);
    awning.position.set(0, 1.42, 1.55); awning.rotation.x = 0.3; awning.castShadow = true;
    const name = TENANT.name || '';
    const signT = canvasTex(512, 112, (g, w, h) => { g.fillStyle = '#' + C(vars.deep || '#1f3329').getHexString(); g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff'; let fs = 60; g.font = `800 ${fs}px "Noto Sans TC", system-ui, sans-serif`; while (g.measureText(name).width > w - 40 && fs > 24) { fs -= 4; g.font = `800 ${fs}px "Noto Sans TC", system-ui, sans-serif`; } g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name, w / 2, h / 2 + 2); });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.5, 0.1), [std(0x333333), std(0x333333), std(0x333333), std(0x333333), new THREE.MeshBasicMaterial({ map: signT, toneMapped: false }), std(0x333333)]);
    sign.position.set(0, 1.82, 1.19);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.25, 0.06), std(0x7a5236)); door.position.set(0, 0.625, 1.16);
    const winMat = new THREE.MeshStandardMaterial({ color: night ? 0xffd88a : 0xcfe9ff, emissive: night ? 0xffb84d : 0x000000, emissiveIntensity: night ? 1.4 : 0, roughness: 0.2, metalness: 0.1 });
    const w1 = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.6, 0.06), winMat); w1.position.set(-1.05, 0.92, 1.16);
    const w2 = w1.clone(); w2.position.x = 1.05;
    shopG.add(body, roof, awning, sign, door, w1, w2);
    if (night) { const lamp = new THREE.PointLight(0xffb84d, 6, 7); lamp.position.set(0, 1.4, 2.0); shopG.add(lamp); }
    if (!city) world.add(shopG);

    // 廣場主角（業態主角或主打商品）
    const kind = heroKind();
    const piece = heroCenterpiece(kind, pal);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.1, 0.5, 32), std(C(vars.cream2 || '#f5ecdf'), { roughness: 0.6 })); ped.position.set(0, 0.38, 0.9); ped.castShadow = ped.receiveShadow = true; world.add(ped);
    centerpiece = new THREE.Group(); centerpiece.position.set(0, 1.6, 0.9); world.add(centerpiece);
    if (piece) { piece.scale.setScalar(kind === 'dessert' ? 0.62 : 0.85); if (kind === 'dessert') piece.position.y = -0.55; piece.traverse(n => { if (n.isMesh) n.castShadow = true; }); centerpiece.add(piece); }
    anim.push((t) => { centerpiece.rotation.y = t * 0.4; centerpiece.position.y = 1.65 + Math.sin(t * 1.2) * 0.1; });

    // 業態風景（避開步道、店舖、展台、人物路線與鏡頭視線）
    const stAngles = products.map((_, i) => stationAngle(i, products.length));
    let layout, built;
    if (city) {
      // 城市百貨商圈：大樓要避開鏡頭路線
      const kc = makeKeys(stAngles), cv0 = new THREE.CatmullRomCurve3(kc.map(q => q.pos), false, 'centripetal');
      const camPts = cv0.getSpacedPoints(160);
      layout = cityLayout({ RING, SHOP_Z, stations: stAngles });
      built = cityObj = buildCity({ world, anim, rnd, night, mobile: mobile(), pal, vars, layout, camPts });
    } else {
      layout = makeLayout({ shore, RING, SHOP_Z, stations: stAngles, beach: sceneDef.beach });
      built = buildScene(sceneDef, { world, anim, rnd, night, mobile: mobile(), pal, layout });
      shopDeco(built.deco, shopG, built.kit, sceneDef.roof);
    }

    // 碼頭與小船（城市場景沒有）
    if (!city) {
      const pier = new THREE.Group(); const plank = std(0x9b6b45);
      const deck = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.12, 3.2), plank); deck.position.set(0, -0.05, 0); pier.add(deck);
      for (const dz of [-1.2, 0, 1.2]) for (const dx of [-0.45, 0.45]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.1, 6), plank); p.position.set(dx, -0.5, dz); pier.add(p); }
      pier.position.set(layout.pier.x, 0, layout.pier.z); pier.rotation.y = layout.pier.th; world.add(pier);
      // 帆船：沿著外海繞島，跟著海浪起伏、前後左右搖晃
      const sb = makeBoat(pal, night); boat = sb.group; boat.scale.setScalar(0.95); world.add(boat);
      const fw = new THREE.Vector3(), sd = new THREE.Vector3();
      anim.push((t) => {
        const a = t * 0.035 + 1.2, r = R + 7.5, x = Math.sin(a) * r, z = Math.cos(a) * r;
        fw.set(Math.cos(a), 0, -Math.sin(a)); sd.set(fw.z, 0, -fw.x);
        const h = waveAt(x, z, t), pitch = Math.atan2(waveAt(x + fw.x * 0.8, z + fw.z * 0.8, t) - waveAt(x - fw.x * 0.8, z - fw.z * 0.8, t), 1.6), roll = Math.atan2(waveAt(x + sd.x * 0.4, z + sd.z * 0.4, t) - waveAt(x - sd.x * 0.4, z - sd.z * 0.4, t), 0.8);
        boat.position.set(x, -0.55 + h + 0.06, z);
        boat.rotation.set(-pitch, a + Math.PI / 2, 0, 'YXZ'); boat.rotation.z = roll + 0.07;
        sb.update(t);
      });
    }

    // 熱氣球（品牌色）
    balloon = new THREE.Group();
    const env = new THREE.Mesh(new THREE.SphereGeometry(1.1, 20, 16), new THREE.MeshStandardMaterial({ color: pal[0], roughness: 0.5, emissive: night ? pal[0] : 0x000000, emissiveIntensity: night ? 0.25 : 0 }));
    env.scale.set(1, 1.2, 1); balloon.add(env);
    const band = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.12, 8, 30), std(C(pal[2]))); band.rotation.x = Math.PI / 2; band.position.y = -0.1; balloon.add(band);
    const basket = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.42), std(0x9b6b45)); basket.position.y = -1.85; balloon.add(basket);
    for (const [x, z] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) { const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.75, 4), std(0x6b5a4a)); rope.position.set(x * 2.4, -1.35, z * 2.4); rope.rotation.set(z * 1.1, 0, -x * 1.1); balloon.add(rope); }
    world.add(balloon); balloon.visible = !city;
    anim.push((t) => { const a = Math.sin(t * 0.05); balloon.position.set(6.5 + a * 3.5, 8 + Math.sin(t * 0.6) * 0.5, -7 + Math.cos(t * 0.05) * 2); balloon.rotation.y = t * 0.1; });

    // 雲、鳥
    const cloudM = new THREE.MeshStandardMaterial({ color: night ? 0x6c7aa0 : 0xffffff, roughness: 1, flatShading: true, transparent: true, opacity: night ? 0.55 : 0.95 });
    for (let i = 0; i < (mobile() ? 4 : 8); i++) {
      const c = new THREE.Group(); const n = 3 + Math.floor(rnd() * 3);
      for (let k = 0; k < n; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(1 + rnd() * 0.9, 1), cloudM); b.position.set(k * 1.3 - n * 0.6, rnd() * 0.5, rnd() * 0.8); b.scale.y = 0.62; c.add(b); }
      const a0 = rnd() * Math.PI * 2, r = 30 + rnd() * 26, y = 14 + rnd() * 9, sp = 0.004 + rnd() * 0.007;
      c.scale.setScalar(0.8 + rnd() * 0.9); world.add(c); clouds.push(c);
      anim.push((t) => { const a = a0 + t * sp; c.position.set(Math.sin(a) * r, y, Math.cos(a) * r); c.rotation.y = a; });
    }
    const birdM = new THREE.MeshBasicMaterial({ color: night ? 0xdde6ff : 0x2b3440, side: THREE.DoubleSide });
    for (let i = 0; i < 4; i++) {
      const b = new THREE.Group(); const wl = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.12), birdM); wl.position.x = -0.25; const wr = wl.clone(); wr.position.x = 0.25; b.add(wl, wr); world.add(b); birds.push(b);
      const r = 6 + i * 1.5, y = 5 + i * 0.6, ph = i * 1.7;
      anim.push((t) => { const a = t * 0.25 + ph; b.position.set(Math.sin(a) * r, y + Math.sin(t * 2 + ph) * 0.3, Math.cos(a) * r); b.rotation.y = a + Math.PI / 2; const f = Math.sin(t * 9 + ph) * 0.6; wl.rotation.z = f; wr.rotation.z = -f; });
    }
    // 漂浮光點
    const N = mobile() ? 60 : 140; const pa = new Float32Array(N * 3), pc = new Float32Array(N * 3);
    const dots = (look.dots && look.dots.length ? look.dots : ['#ffffff']).map(c => C(c));
    for (let i = 0; i < N; i++) { const th = rnd() * Math.PI * 2, r = rnd() * R; pa[i * 3] = Math.sin(th) * r; pa[i * 3 + 1] = 0.6 + rnd() * 4; pa[i * 3 + 2] = Math.cos(th) * r; const c = dots[i % dots.length]; pc[i * 3] = c.r; pc[i * 3 + 1] = c.g; pc[i * 3 + 2] = c.b; }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pa, 3)); pg.setAttribute('color', new THREE.BufferAttribute(pc, 3));
    const dotT = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.45, 'rgba(255,255,255,0.7)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
    sparkle = new THREE.Points(pg, new THREE.PointsMaterial({ size: night ? 0.16 : 0.12, map: dotT, vertexColors: true, transparent: true, opacity: night ? 0.95 : 0.75, depthWrite: false }));
    world.add(sparkle);
    anim.push((t) => { sparkle.rotation.y = t * 0.02; sparkle.position.y = Math.sin(t * 0.5) * 0.15; });

    // 島上的人
    crowd = createPeople({ world, anim, rnd, night, mobile: mobile(), pal, L: layout, spots: built.spots, hat: sceneDef.hat, shadows: renderer.shadowMap.enabled });
    if (cityObj) cityObj.attach(crowd);

    // 商品展台
    buildStations(my, pal, vars);
    buildPath();
  }

  function stationAngle(i, n) { return n === 1 ? 0 : -1.95 + i * (3.9 / (n - 1)); }
  function buildStations(my, pal, vars) {
    pinsBox.innerHTML = '';
    const list = products;
    list.forEach((p, i) => {
      const th = stationAngle(i, list.length);
      const pos = new THREE.Vector3(Math.sin(th) * RING, 0, Math.cos(th) * RING);
      const g = new THREE.Group(); g.position.copy(pos); g.rotation.y = th;
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.85, 0.4, 32), std(C(pal[i % 6]), { roughness: 0.45 })); ped.position.y = 0.33; ped.castShadow = ped.receiveShadow = true; g.add(ped);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.05, 32), std(0xffffff, { roughness: 0.3 })); top.position.y = 0.55; g.add(top);
      const holder = new THREE.Group(); holder.position.y = 1.95; g.add(holder);
      const glow = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.95, 40), new THREE.MeshBasicMaterial({ color: pal[i % 6], transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
      glow.rotation.x = -Math.PI / 2; glow.position.y = 0.16; g.add(glow);
      const hit = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 3.2, 12), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 1.6; hit.userData.pid = p.id; g.add(hit); hits.push(hit);
      world.add(g);
      const st = { pid: p.id, th, pos, group: g, holder, glow, hover: 0 };
      stations.push(st);
      artImage(p.id).then(img => {
        if (my !== buildId) return;
        const pc = productPiece(p.id, { disc: false, size: 1.55, edge: pal[i % 6], bg: vars.card || '#ffffff', tint: (p.color || '#cccccc').slice(0, 7), img });
        pc.traverse(n => { if (n.isMesh) n.castShadow = true; });
        holder.add(pc);
        if (window.gsap && !reduced) window.gsap.from(pc.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.9, delay: 0.1 * i, ease: 'back.out(1.7)' });
      });
      const ph = i * 1.3;
      anim.push((t) => { holder.position.y = 1.95 + Math.sin(t * 1.1 + ph) * 0.12; holder.rotation.y = Math.sin(t * 0.5 + ph) * 0.35; st.hover += ((hoverPid === p.id ? 1 : 0) - st.hover) * 0.15; glow.material.opacity = 0.25 + st.hover * 0.6; holder.scale.setScalar(1 + st.hover * 0.12); });
      const pin = document.createElement('button');
      pin.type = 'button'; pin.className = 'isl-pin'; pin.dataset.pid = p.id;
      pin.innerHTML = `<i style="background:#${C(pal[i % 6]).getHexString()}">${i + 1}</i><span>${esc(pName(shop.lang, p.id))}</span>`;
      pin.addEventListener('click', () => onOpen(p.id));
      pinsBox.appendChild(pin); st.pin = pin;
    });
    const sp = document.createElement('button'); sp.type = 'button'; sp.className = 'isl-pin shop'; sp.innerHTML = `<i>★</i><span>${esc(TENANT.name || tx('shop'))}</span>`;
    sp.addEventListener('click', () => goProducts()); pinsBox.appendChild(sp);
    shopPin = sp;
    renderRail();
  }
  let shopPin = null;

  // ---------- 鏡頭路線 ----------
  let keys = [], curve = null;
  // 鏡頭關鍵點：開場全景 → 每個展台 → 最後看向店舖（城市場景的全景拉高，像模擬城市俯瞰）
  function makeKeys(angles) {
    const m = mobile(), city = VENUE !== ISL_VENUE;
    const wide = city ? { pos: new THREE.Vector3(0, m ? 28 : 19.5, m ? 37 : 27), look: new THREE.Vector3(0, m ? 3.2 : 0.4, m ? -3 : -2.5) }
      : { pos: new THREE.Vector3(0, m ? 23.5 : 15, m ? 35 : 24.5), look: new THREE.Vector3(0, m ? 3.6 : 0.6, m ? -1.5 : -0.6) };
    const out = [wide];
    angles.forEach((th) => {
      const pos = new THREE.Vector3(Math.sin(th) * RING, 0, Math.cos(th) * RING), dir = new THREE.Vector3(Math.sin(th), 0, Math.cos(th));
      out.push({ pos: pos.clone().add(dir.multiplyScalar(m ? 7.6 : 5.8)).add(new THREE.Vector3(0, m ? 3.6 : 2.9, 0)), look: pos.clone().add(new THREE.Vector3(0, m ? 1.3 : 1.55, 0)) });
    });
    // 最後一站：從兩個展台之間看向店舖，避免商品卡擋住店面
    const fin = (m ? VENUE.finalM : VENUE.final) || (m ? [4.3, 7.0, 9.6] : [3.7, 6.0, 8.0]);
    out.push({ pos: new THREE.Vector3(...fin), look: new THREE.Vector3(0, VENUE.lookY, VENUE.lookZ) });
    return out;
  }
  function buildPath() {
    keys = makeKeys(stations.map(s => s.th));
    curve = new THREE.CatmullRomCurve3(keys.map(k => k.pos), false, 'centripetal');
    sec.style.setProperty('--isl-k', reduced ? 1 : keys.length);
  }

  // ---------- 滾動、拖曳、點選 ----------
  let target = 0, prog = 0, userYaw = 0, userPitch = 0, dragging = false, dragX = 0, dragY = 0, moved = 0, hoverPid = null;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function onScroll() {
    if (reduced) { target = 0; return; }
    const r = sec.getBoundingClientRect(); const vh = innerHeight;
    // 預覽用的 iframe 被隱藏時高度會是 0：不更新，避免算出 NaN 讓鏡頭路線出錯
    if (!(vh > 0) || !keys.length) return;
    const v = -r.top / vh;
    if (Number.isFinite(v)) target = Math.min(keys.length - 1, Math.max(0, v));
  }
  addEventListener('scroll', onScroll, { passive: true });
  const cv = renderer.domElement;
  cv.addEventListener('pointerdown', (e) => { dragging = true; moved = 0; dragX = e.clientX; dragY = e.clientY; if (e.pointerType === 'mouse') cv.setPointerCapture(e.pointerId); });
  addEventListener('pointerup', (e) => {
    if (!dragging) return; dragging = false;
    if (moved < 6 && e.target === cv) { const pid = pick(e); if (pid) onOpen(pid); }
  });
  cv.addEventListener('pointermove', (e) => {
    if (dragging) { const dx = e.clientX - dragX, dy = e.clientY - dragY; dragX = e.clientX; dragY = e.clientY; moved += Math.abs(dx) + Math.abs(dy); userYaw -= dx * 0.006; if (e.pointerType === 'mouse') userPitch = Math.max(-0.35, Math.min(0.5, userPitch + dy * 0.004)); }
    if (e.pointerType === 'mouse') { hoverPid = pick(e); cv.style.cursor = hoverPid ? 'pointer' : (dragging ? 'grabbing' : 'grab'); }
  });
  cv.addEventListener('pointerleave', () => { hoverPid = null; });
  function pick(e) {
    const r = cv.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera); const h = ray.intersectObjects(hits, false)[0]; return h ? h.object.userData.pid : null;
  }
  function scrollToKey(k) {
    const top = sec.getBoundingClientRect().top + scrollY + k * innerHeight + 2;
    scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
  }
  function goProducts() { const p = document.querySelector('#products'); if (p) p.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); }
  $('.isl-skip').addEventListener('click', goProducts);

  // ---------- 文字層 ----------
  function renderRail() {
    const n = stations.length + 2;
    let h = '';
    for (let k = 0; k < n; k++) {
      const label = k === 0 ? (TENANT.name || '') : k === n - 1 ? tx('welcome') : pName(shop.lang, stations[k - 1].pid);
      h += `<button type="button" data-k="${k}" title="${esc(label)}" aria-label="${esc(label)}"></button>`;
    }
    rail.innerHTML = h;
    rail.querySelectorAll('button').forEach(b => b.addEventListener('click', () => scrollToKey(+b.dataset.k)));
  }
  let shownKey = -1;
  function renderCard(k) {
    if (k === shownKey) return; shownKey = k;
    rail.querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', i === k));
    const last = keys.length - 1;
    $('.isl-title').classList.toggle('off', k !== 0);
    if (k <= 0 || k > last) { card.hidden = true; return; }
    if (k === last) {
      card.innerHTML = `<span class="isl-step">${esc(tx('welcome'))}</span><h3>${esc(TENANT.name || '')}</h3><div class="isl-btns"><button type="button" class="s-btn s-btn-primary" data-go>${esc(tx('enter'))} ↓</button></div>`;
      card.querySelector('[data-go]').addEventListener('click', goProducts);
    } else {
      const p = PRODUCT_MAP[stations[k - 1].pid]; if (!p) { card.hidden = true; return; }
      card.innerHTML = `<span class="isl-step">${esc(tx('stop', { n: k }))}</span><h3>${esc(pName(shop.lang, p.id))}</h3><div class="isl-price">${priceHTML(p, shop.lang, money)}</div>
        <div class="isl-btns"><button type="button" class="s-btn s-btn-primary" data-add="${p.id}">${esc(tx('add'))}</button><button type="button" class="s-btn s-btn-ghost" data-detail="${p.id}">${esc(tx('detail'))}</button></div>`;
      card.querySelector('[data-add]').addEventListener('click', (e) => onAdd(p.id, e.currentTarget));
      card.querySelector('[data-detail]').addEventListener('click', () => onOpen(p.id));
    }
    card.hidden = false;
    if (window.gsap && !reduced) window.gsap.fromTo(card, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' });
  }
  function renderTexts() {
    sec.querySelectorAll('[data-t]').forEach(n => { n.textContent = tx(n.dataset.t); });
    const kick = document.querySelector('.s-hero .s-kicker'), h1 = document.querySelector('.s-hero h1');
    $('.isl-kicker').textContent = kick ? kick.textContent : '';
    $('.isl-title h2').innerHTML = h1 ? h1.innerHTML : esc(TENANT.name || '');
    stations.forEach(s => { const sp = s.pin && s.pin.querySelector('span'); if (sp) sp.textContent = pName(shop.lang, s.pid); });
    renderRail(); shownKey = -1;
  }

  // ---------- 主迴圈 ----------
  const v3 = new THREE.Vector3(), look3 = new THREE.Vector3(), tmp = new THREE.Vector3();
  let visible = true, raf = 0, t = 0, last = performance.now();
  const ease = (x) => x * x * (3 - 2 * x);
  function frame(now) {
    if (!keys.length) return;
    const raw = (now - last) / 1000, dt = Math.min(0.05, raw); last = now; t += reduced ? dt * 0.3 : dt;
    if (water) water.material.uniforms.t.value = t;
    for (const f of anim) f(t);
    // 測試用：網址 ?islspeed=N 讓島上的人與車流以 N 倍速模擬（分成多個小步，不影響碰撞判斷）
    for (let i = 1; i < SIM_X; i++) { t += dt; for (const f of anim) f(t); }
    prog += (target - prog) * (1 - Math.exp(-Math.min(raw, 0.5) * 4.5));
    const kmax = keys.length - 1;
    if (!Number.isFinite(prog)) prog = 0;
    prog = Math.min(Math.max(prog, 0), kmax);
    const i0 = Math.min(kmax - 1, Math.max(0, Math.floor(prog))), fr = ease(Math.min(1, Math.max(0, prog - i0)));
    const u = kmax > 0 ? Math.min(1, Math.max(0, (i0 + fr) / kmax)) : 0;
    if (curve) curve.getPoint(u, v3); else v3.copy(keys[0].pos);
    look3.copy(keys[i0].look).lerp(keys[Math.min(kmax, i0 + 1)].look, fr);
    // 停在開頭時緩慢環繞；拖曳的角度放開後慢慢回正
    const idle = Math.max(0, 1 - prog * 2) * (reduced ? 0 : Math.sin(t * 0.12) * 0.35);
    if (!dragging) { userYaw *= 0.965; userPitch *= 0.95; }
    tmp.copy(v3).sub(look3).applyAxisAngle(new THREE.Vector3(0, 1, 0), userYaw + idle);
    tmp.y += userPitch * tmp.length() * 0.6;
    camera.position.copy(look3).add(tmp);
    camera.lookAt(look3);
    renderer.render(scene, camera);
    adapt(raw);
    // 標籤
    const W = host.clientWidth, H = host.clientHeight, cur = Math.round(prog);
    const placePin = (pin, pos, show) => {
      tmp.copy(pos).project(camera);
      const vis = show && tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1;
      pin.style.opacity = vis ? 1 : 0; pin.style.pointerEvents = vis ? 'auto' : 'none';
      if (vis) pin.style.transform = `translate(${((tmp.x + 1) / 2 * W).toFixed(1)}px, ${((1 - tmp.y) / 2 * H).toFixed(1)}px) translate(-50%, -100%)`;
    };
    stations.forEach((s, i) => { if (s.pin) placePin(s.pin, v3.copy(s.pos).setY(3.25), cur !== i + 1 && cur !== kmax); });
    if (shopPin) placePin(shopPin, v3.set(0, VENUE.pinY, VENUE.pinZ), cur !== kmax);
    renderCard(Math.abs(prog - cur) < 0.3 ? cur : -1);
  }
  // 效能自動調整：連續偏慢（平均每格超過 45ms）就降低解析度、關閉陰影，避免低階裝置卡頓
  let slow = 0, frames = 0, quality = 2;
  function adapt(raw) {
    if (quality === 0 || document.hidden) return;
    frames++; slow += raw > 0.045 ? 1 : 0;
    if (frames < 40) return;
    if (slow > 28) {
      quality--;
      const pr = renderer.getPixelRatio();
      renderer.setPixelRatio(Math.max(0.75, pr * 0.7));
      if (renderer.shadowMap.enabled) { renderer.shadowMap.enabled = false; sun.castShadow = false; scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.needsUpdate = true; }); }); }
      resize();
    }
    frames = 0; slow = 0;
  }
  function loop() { cancelAnimationFrame(raf); const step = (n) => { if (!visible || document.hidden) return; frame(n); raf = requestAnimationFrame(step); }; last = performance.now(); raf = requestAnimationFrame(step); }
  new IntersectionObserver((e) => { visible = e[0].isIntersecting; if (visible) loop(); }).observe(sec);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && visible) loop(); });
  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return;
    const nav = document.querySelector('.s-nav'); if (nav) sec.style.setProperty('--nav-h', nav.offsetHeight + 'px');
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < 760 ? 52 : 42; camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(host);

  function pickProducts() {
    const n = mobile() ? 4 : 5;
    const list = visibleProducts();
    const fid = featuredId();
    const ordered = fid ? [PRODUCT_MAP[fid], ...list.filter(p => p.id !== fid)] : list;
    return ordered.filter(Boolean).slice(0, n);
  }

  const api = {
    el: sec,
    setLook(l) { const k = JSON.stringify(l || {}); if (k === lookKey) return; lookKey = k; look = l || {}; build(); renderTexts(); onScroll(); },
    setLang() { renderTexts(); },
    // 測試與輔助用：某個展台商品在畫面上的位置（相對視窗）
    screenOf(pid) { const st = stations.find(x => x.pid === pid); if (!st) return null; const v = st.pos.clone().setY(1.95).project(camera); const r = cv.getBoundingClientRect(); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height, onScreen: v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1 }; },
    setProducts() { products = pickProducts(); build(); renderTexts(); onScroll(); },
    // 測試用：目前的風景、島形與島上的人
    info() { return { scene: sceneDef && sceneDef.id, shape: SHAPE, people: crowd ? crowd.info() : [], stations: stations.map(s => ({ x: s.pos.x, z: s.pos.z })), city: cityObj ? cityObj.info() : null }; },
    // 換場景（網站設計工作室即時預覽）：auto＝依業態
    setScene(id) { const v = id || 'auto'; if (v === sceneOverride) return; sceneOverride = v; build(); renderTexts(); onScroll(); },
    destroy() { cancelAnimationFrame(raf); removeEventListener('scroll', onScroll); dispose(world); if (sky) dispose(sky); if (water) dispose(water); renderer.dispose(); sec.remove(); document.body.classList.remove('isl-on'); },
  };
  products = pickProducts();
  resize(); loop();
  // 風格由 storefront 的 setHero → setLook 帶入（避免重複建造）；萬一沒帶就用預設配色
  setTimeout(() => { if (!lookKey) api.setLook({}); }, 0);
  // 商品插圖載入後收起載入畫面
  Promise.all(products.map(p => artImage(p.id))).then(() => { const ld = $('.isl-load'); ld.classList.add('done'); setTimeout(() => ld.remove(), 700); });
  return api;
}
