import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createMaterials } from './materials.js';
import { buildBed, buildPile } from './model.js';
import { createSawdust, createMotes } from './particles.js';
import { createWorker } from './worker.js';
import { buildFurniture, buildTruck } from './extras.js';
import { createRoad } from './road.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

gsap.registerPlugin(ScrollTrigger);

function canRun3D() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (navigator.deviceMemory && navigator.deviceMemory <= 2) return false;
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

export function initBuildSequence(section) {
  if (!section) return;
  if (!canRun3D()) { section.classList.add('no3d'); return; }

  const $ = (s) => section.querySelector(s);
  const $$ = (s) => [...section.querySelectorAll(s)];
  const canvas = $('.stage');
  const paper = $('.paper');
  const copy = $('.copy');
  const chaps = $$('.chap');
  const counter = $('.counter');
  const cta = $('.cta');
  const hint = $('.hint');
  const isMobile = innerWidth < 760;
  const mapview = $('.mapview');
  const maphud = $('.maphud');
  const badge = $('.badge');
  const kmEl = $('[data-kmcount]');
  const statsBox = $('.stats');
  const statNums = $$('.stats [data-to]');
  const statVals = { v: 0 };
  const routeProg = { v: 0 };
  const roadState = { enter: 0, hand: 0 };
  const road = createRoad(mapview, { isMobile });

  // ---------- المشهد ----------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1e1a16);
  scene.fog = new THREE.Fog(0x1e1a16, 5, 11);
  const camera = new THREE.PerspectiveCamera(isMobile ? 46 : 34, 1, 0.05, 40);

  scene.add(new THREE.HemisphereLight(0xffeccc, 0x1e1a16, 0.85));
  const key = new THREE.DirectionalLight(0xffd59a, 3.1); // ضو شباك الورشة
  key.position.set(-2.6, 3.6, 1.6);
  key.castShadow = true;
  key.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -1.8, right: 1.8, top: 1.8, bottom: -1.8, near: 0.5, far: 9 });
  key.shadow.radius = 4;
  key.shadow.bias = -0.0004;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x9fb3c8, 0.35);
  fill.position.set(3, 2, -2);
  scene.add(fill);

  const floor = new THREE.Mesh(new THREE.CircleGeometry(6, 64), new THREE.MeshStandardMaterial({ color: 0x2b241d, roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const contact = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 2.6),
    new THREE.MeshBasicMaterial({ map: new THREE.TextureLoader().load('/textures/shadow.png'), transparent: true, opacity: 0, depthWrite: false })
  );
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.002;
  scene.add(contact);

  const M = createMaterials();
  const bed = buildBed(scene, M);
  const { pile, planks } = buildPile(scene, M);
  // نجمعو السرير في group واحد باش يطلع للكاميو
  const bedGroup = new THREE.Group(); bedGroup.name = 'bed';
  scene.add(bedGroup);
  [bed.head, bed.foot, ...bed.rails, ...bed.screws, bed.bottom, bed.traverse, bed.lift].forEach((o) => bedGroup.add(o));
  const furniture = buildFurniture(scene, M);
  const T = buildTruck(scene);
  const sawdust = createSawdust(scene);
  const motes = createMotes(scene);
  const worker = createWorker(scene, M);
  worker.root.position.set(-2.8, 0, -0.6);
  worker.root.rotation.y = Math.PI / 2;
  worker.root.visible = false;
  // النجار الحقيقي: يتحمل غير إذا كاين الملف.
  // worker.glb = الشخصية، و anim-*.glb = الحركات (Mixamo بلا skin)، يتربطو بأسماء العظام.
  (async () => {
    const head = await fetch('/models/worker.glb', { method: 'HEAD' }).catch(() => null);
    if (!head || !head.ok) return;
    const loader = new GLTFLoader();
    const draco = new DRACOLoader(); draco.setDecoderPath('/draco/');
    loader.setDRACOLoader(draco);
    const base = await loader.loadAsync('/models/worker.glb');
    const clips = [...base.animations];
    for (const name of ['idle', 'walk', 'hammer', 'paint']) {
      try {
        const g = await loader.loadAsync(`/models/anim-${name}.glb`);
        g.animations.forEach((c, i) => { c.name = i ? `${name}-${i}` : name; clips.push(c); });
      } catch { /* الحركة ماكانش */ }
    }
    // نحيو حركة الجذر باش يبقى في بلاصتو (التايملاين هو اللي يحركو)
    clips.forEach((c) => { c.tracks = c.tracks.filter((t) => !/hips\.position$/i.test(t.name)); });
    base.animations = clips;
    worker.attachRealModel(base);
  })();

  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.05, 0.32), new THREE.MeshBasicMaterial({ color: 0xffb070, transparent: true, opacity: 0 }));
  blade.position.set(-0.35, 0.16, 0.15);
  pile.add(blade);

  // ---------- الكاميرا ----------
  const cam = { angle: 0.75, dist: 2.9, height: 1.4, ty: 0.08, tx: 0 };
  const target = new THREE.Vector3();
  function placeCamera() {
    target.set(cam.tx, cam.ty, 0);
    // على التيليفون (شاشة ضيقة) نبعدو أكثر في مشهد الكاميو (tx سالب) باش الشاحنة تبان كاملة
    const mk = isMobile ? 1.6 + Math.min(1, Math.max(0, -cam.tx / 2)) : 1;
    const d = cam.dist * mk;
    camera.position.set(Math.sin(cam.angle) * d, cam.height * (isMobile ? 1.35 : 1), Math.cos(cam.angle) * d);
    camera.lookAt(target);
    // الضباب يتناسب مع بعد الكاميرا (على التيليفون الكاميرا أبعد، وإلا يغطي الكاميو كامل)
    scene.fog.near = 5 * mk; scene.fog.far = 11 * mk;
  }
  function applyView(cam, w, h) {
    cam.aspect = w / h;
    // على الديسكتوب النص في اليمين، نزحو المشهد شوية لليسار
    if (w > 760) cam.setViewOffset(w, h, w * 0.12, 0, w, h); else cam.setViewOffset(w, h, 0, h * 0.14, w, h); // على التيليفون النص تحت، نطلعو المشهد
    cam.updateProjectionMatrix();
  }
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    applyView(camera, w, h);
  }
  addEventListener('resize', resize);
  resize();

  // ---------- المخطط بالقلم ----------
  const lines = $$('.plan .ln');
  const notes = $$('.plan .notes text');
  const tbText = $$('.plan .titleblock text');
  gsap.set(lines, { strokeDasharray: 1, strokeDashoffset: 1 });
  gsap.set([...notes, ...tbText], { opacity: 0 });

  // اليد بالقلم: تكتب الترحيب وحدها، ومن بعد تتبع الخط اللي راهو يترسم
  const handEl = $('.drawhand');
  const greetEl = $('.greet');
  const mask = $('.greet-mask');
  const greet = { w: 0 };
  const GREET_X = 1090, GREET_W = Math.min(greetEl.getComputedTextLength() + 12, 900);
  const lens = lines.map((l) => { try { return l.getTotalLength(); } catch { return 0; } });
  const handPos = { x: GREET_X, y: 92 };
  gsap.to(greet, { w: GREET_W, duration: 2.6, delay: 0.5, ease: 'none' });
  function updateHand() {
    let target = null;
    for (let i = lines.length - 1; i >= 0; i--) {
      const off = parseFloat(gsap.getProperty(lines[i], 'strokeDashoffset'));
      if (off < 0.999 && lens[i]) {
        const pt = lines[i].getPointAtLength((1 - off) * lens[i]);
        target = { x: pt.x, y: pt.y };
        break;
      }
    }
    if (!target) target = { x: GREET_X - greet.w, y: 92 };
    handPos.x += (target.x - handPos.x) * 0.35;
    handPos.y += (target.y - handPos.y) * 0.35;
    mask.setAttribute('x', GREET_X - greet.w);
    mask.setAttribute('width', greet.w);
    handEl.setAttribute('transform', `translate(${handPos.x.toFixed(1)} ${handPos.y.toFixed(1)})`);
  }

  // ---------- العداد ----------
  const arrivals = []; // [وقت، نوع]
  const countEl = { parts: $('[data-count="parts"]'), screws: $('[data-count="screws"]') };
  $('[data-total="parts"]').textContent = bed.parts.length;

  // ---------- التايملاين ----------
  const tl = gsap.timeline({
    defaults: { ease: 'power2.out', duration: 0.7 },
    onUpdate: tick,
    paused: true, // السكرول يحرك التايملاين من الأسفل (مع تقصير المقدمة)
  });

  let current = 0;
  const chapter = (i, at) => {
    tl.to(chaps[current], { autoAlpha: 0, y: -24, duration: 0.35 }, at)
      .fromTo(chaps[i], { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.45 }, at + 0.3);
    current = i;
  };
  const arrive = (t, kind) => arrivals.push([t, kind]);

  // 1. المخطط
  tl.to(hint, { autoAlpha: 0, duration: 0.3 }, 0.2)
    .to(tbText, { opacity: 1, duration: 0.3, stagger: 0.1 }, 0.2)
    .to(lines, { strokeDashoffset: 0, duration: 0.55, ease: 'power1.inOut', stagger: 2.2 / lines.length }, 0.3)
    .to(notes, { opacity: 1, duration: 0.3, stagger: 0.12 }, 1.9)
    .to(greetEl, { opacity: 0.25, duration: 0.4 }, 0.3)
    .to(handEl, { opacity: 0, duration: 0.3 }, 2.7);

  // 2. من الورق للخشب
  chapter(1, 3.1);
  tl.to(paper, { autoAlpha: 0, scale: 1.06, duration: 0.8, ease: 'power2.in' }, 3.0)
    .to(canvas, { opacity: 1, duration: 0.6 }, 3.2)
    .to('.build .dim', { opacity: 1, duration: 0.6 }, 3.4)
    .from(pile.position, { y: -0.25, duration: 0.8 }, 3.2)
    .to(counter, { autoAlpha: 1, duration: 0.4 }, 3.8)
    .to(cam, { angle: 0.6, dist: 2.4, height: 1.05, duration: 1.4, ease: 'none' }, 3.2);

  // 3. القص + النشارة
  tl.to(blade.material, { opacity: 0.95, duration: 0.15 }, 4.8)
    .to(blade.position, { x: 0.35, duration: 1.1, ease: 'none' }, 4.8)
    .to(sawdust.state, { t: 1, duration: 1.3, ease: 'none' }, 4.85)
    .to(blade.material, { opacity: 0, duration: 0.15 }, 5.9)
    .to(cam, { angle: 0.95, dist: 5.0, height: 2.0, ty: 0.55, duration: 1.4, ease: 'power1.inOut' }, 5.6);

  // 4. التركيب
  tl.to(planks.map((p) => p.position), { y: '+=3', duration: 0.6, ease: 'power2.in', stagger: 0.05 }, 6.2)
    .set(pile, { visible: false }, 6.95);

  tl.from(bed.head.position, { y: 2.8, duration: 0.6 }, 6.6); arrive(7.2, 'parts');
  tl.from(bed.foot.position, { y: 2.8, duration: 0.6 }, 6.8); arrive(7.4, 'parts');
  tl.from(bed.rails[0].position, { x: -2.6, duration: 0.6 }, 7.2); arrive(7.8, 'parts');
  tl.from(bed.rails[1].position, { x: 2.6, duration: 0.6 }, 7.35); arrive(7.95, 'parts');
  bed.screws.forEach((v, i) => {
    const t = 7.9 + i * 0.05;
    tl.from(v.scale, { x: 0, y: 0, z: 0, duration: 0.08 }, t)
      .from(v.position, { x: v.position.x + v.userData.side * 0.2, duration: 0.35 }, t)
      .from(v.rotation, { x: Math.PI * 8, duration: 0.35, ease: 'none' }, t);
    arrive(t + 0.35, 'screws');
  });
  tl.from(bed.bottom.position, { y: -0.6, duration: 0.5 }, 8.5); arrive(9.0, 'parts');
  tl.from(bed.traverse.position, { y: 2.8, duration: 0.5 }, 8.7); arrive(9.2, 'parts');
  tl.to(contact.material, { opacity: 0.75, duration: 1 }, 7);
  bed.liftRails.forEach((r, i) => {
    tl.from(r.scale, { z: 0.001, duration: 0.5 }, 9.1 + i * 0.1)
      .from(r.position, { z: 0, duration: 0.5 }, 9.1 + i * 0.1);
    arrive(9.6 + i * 0.1, 'parts');
  });
  bed.slats.forEach((s, i) => {
    const t = 9.5 + i * 0.12;
    tl.from(s.position, { y: 2.6, duration: 0.4, ease: 'bounce.out' }, t);
    arrive(t + 0.4, 'parts');
  });
  bed.pistons.forEach((p, i) => {
    tl.from(p.scale, { y: 0.001, duration: 0.4 }, 10.8 + i * 0.1);
    arrive(11.2 + i * 0.1, 'parts');
  });
  tl.to(cam, { angle: 0.2, duration: 4.6, ease: 'none' }, 6.6);

  // 5. الصباغة
  tl.to(M.wipe, { value: -0.05, duration: 1.4, ease: 'power1.inOut' }, 11.5)
    .to(cam, { angle: -0.15, height: 1.8, dist: 4.8, duration: 1.4, ease: 'none' }, 11.3);

  // 6. فتح الصندوق
  tl.to(bed.lift.rotation, { x: 0.62, duration: 1.1, ease: 'power1.inOut' }, 13.2)
    .to(bed.pistons.map((p) => p.rotation), { x: 1.05, duration: 1.1, ease: 'power1.inOut' }, 13.2)
    .to(cam, { angle: -0.55, height: 1.85, dist: 4.7, ty: 0.5, duration: 1.6, ease: 'none' }, 13.0)
    .to(cta, { autoAlpha: 1, duration: 0.4 }, 14.0);

  // 7. قطع أخرى على الطلب
  chapter(2, 15.0);
  tl.to(bed.lift.rotation, { x: 0, duration: 0.6, ease: 'power1.inOut' }, 15.0)
    .to(bed.pistons.map((p) => p.rotation), { x: 0.45, duration: 0.6, ease: 'power1.inOut' }, 15.0)
    .to(counter, { autoAlpha: 0, duration: 0.3 }, 15.0)
    .to(cam, { angle: -0.15, dist: 6.4, height: 2.5, ty: 0.75, duration: 1.4, ease: 'power1.inOut' }, 15.1);
  furniture.forEach((f, i) => {
    tl.from(f.position, { y: -2.4, duration: 0.6, ease: 'back.out(1.4)' }, 15.5 + i * 0.35);
  });

  // 8. الكاميو
  chapter(3, 17.0);
  const wheelSpin = { v: 0 };
  // الضو يوصل قبل الكاميو، باش يبان باللي جاي
  tl.to(T.glow, { intensity: 5, duration: 1.0, ease: 'power1.in' }, 16.3)
    .to(T.glow, { intensity: 2.2, duration: 0.8 }, 18.0)
    .to(T.glow, { intensity: 0, duration: 0.6 }, 20.0)
    .to(T.truck.position, { x: -2.25, duration: 1.0, ease: 'power2.out' }, 17.0)
    .to(wheelSpin, { v: 30, duration: 1.0, ease: 'power2.out' }, 17.0)
    .to(cam, { angle: 0.35, dist: 7.4, height: 2.5, ty: 0.8, tx: -2.0, duration: 1.2, ease: 'power1.inOut' }, 17.0)
    .to(bedGroup.position, { y: 0.9, duration: 0.4 }, 18.1)
    .to(bedGroup.position, { x: -2.95, y: T.floorY + 0.03, duration: 0.7, ease: 'power1.inOut' }, 18.5)
    .to(bedGroup.scale, { x: 0.55, y: 0.55, z: 0.55, duration: 0.7, ease: 'power1.inOut' }, 18.5)
    .to(T.doors.map((d) => d.hinge.rotation), { y: 0, duration: 0.4 }, 19.25)
    .to(T.truck.position, { x: -16, duration: 1.0, ease: 'power2.in' }, 19.7)
    .to(bedGroup.position, { x: -16 - 0.7, duration: 1.0, ease: 'power2.in' }, 19.7)
    .to(wheelSpin, { v: 75, duration: 1.0, ease: 'power2.in' }, 19.7);

  // 9. الطريق: الكاميو يخرج من الورشة، يوصل للزبون ويسلّم السرير (مشهد قصير وخفيف)
  tl.to(canvas, { opacity: 0, duration: 0.3, ease: 'none' }, 20.6)
    .to('.build .dim', { opacity: 0, duration: 0.3 }, 20.2)
    .to(mapview, { autoAlpha: 1, duration: 0.6 }, 20.4)
    .to(maphud, { opacity: 1, duration: 0.3 }, 21.0)
    .to(roadState, { enter: 1, duration: 1.0, ease: 'power2.out' }, 20.9)
    .to(routeProg, { v: 1, duration: 4.2, ease: 'none' }, 21.4)
    .to(badge, { opacity: 1, duration: 0.3 }, 25.0)
    .to(roadState, { hand: 1, duration: 1.6, ease: 'none' }, 25.7);

  // 10. أرقام الورشة: تبان مع التسليم (بلا سكرول زايد)
  tl.to(maphud, { opacity: 0, duration: 0.3 }, 26.4)
    .to(statsBox, { autoAlpha: 1, duration: 0.4 }, 26.6)
    .to(statVals, { v: 1, duration: 1.0, ease: 'power1.out' }, 26.7)
    .to({}, { duration: 0.7 }, 27.3);

  // ---------- ربط السكرول بالتايملاين ----------
  // القصة 3 سكرولات (beats): 1) من المخطط للسرير  2) القطع الأخرى  3) الكاميو والتوصيل.
  // نحذفو الخطوات الطويلة (اختيار الخشب، القص، فتح الصندوق، الأرقام) ونمرّو عليها كقطعة سريعة (f صغير)،
  // أما المقاطع اللي تبقى (التركيب، الصباغة، الأثاث، الكاميو) سرعتها كيما كانت (f = 1).
  // PT = حدود المقاطع في التايملاين، PF = كم يتاخذ كل مقطع من السكرول.
  const PT = [0, 3.1, 6.4, 8.8, 11.3, 12.9, 15.0, 16.8, 18.5, 20.6, 25.2];
  const PF = [1.7 / 3.1, 0.25, 1.0, 0.3, 0.9, 0.15, 1.3, 1.0, 0.9, 0.5];
  const PU = [0];
  PF.forEach((f, i) => PU.push(PU[i] + (PT[i + 1] - PT[i]) * f));
  const total = PU[PU.length - 1];                              // طول السكرول بوحدات السكرول
  const seg = (arr, v) => { let i = arr.length - 2; while (i > 0 && v < arr[i]) i--; return i; };
  const tToU = (t) => { const i = seg(PT, t); return PU[i] + (Math.min(t, PT[PT.length - 1]) - PT[i]) * PF[i]; };
  const uToT = (u) => { const i = seg(PU, u); return PT[i] + (Math.min(u, total) - PU[i]) / PF[i]; };
  const smooth = isMobile ? 1.6 : 0.8;
  // كل سحبة تدخل فصل كامل: نوقفو عند نهاية كل واحد (المخطط→السرير مصبوغ، الأثاث، التوصيل)
  const stops = [0, 12.9, 16.8, 25.2].map((t) => tToU(t) / total);
  ScrollTrigger.create({
    trigger: section, start: 'top top', end: 'bottom bottom',
    onRefresh: (self) => tl.time(uToT(self.progress * total)),
    onUpdate: (self) => gsap.to(tl, { time: uToT(self.progress * total), duration: smooth, ease: 'power3', overwrite: true }),
    snap: { snapTo: stops, directional: true, duration: { min: 1.2, max: 3 }, delay: 0.12, ease: 'power1.inOut', inertia: false },
  });

  // ---------- النجار ----------
  const W8 = worker.state, P8 = worker.root.position, R8 = worker.root.rotation;
  const walkTo = (at, x, z, dur = 0.6) => {
    tl.to(W8, { walk: 1, work: 0, bend: 0, duration: 0.12 }, at)
      .to(P8, { x, z, duration: dur, ease: 'none' }, at)
      .to(W8, { walk: 0, duration: 0.12 }, at + dur - 0.1);
  };
  tl.set(worker.root, { visible: true }, 6.25);
  walkTo(6.3, -0.98, -0.75, 0.9);              // يدخل عند الراس
  tl.to(W8, { work: 1, bend: 0.35, duration: 0.2 }, 7.85)  // يشد الـ vis
    .to(W8, { work: 0, bend: 0, duration: 0.15 }, 8.6);
  walkTo(8.7, -0.98, 0.05, 0.5);
  tl.to(W8, { work: 1, bend: 0.25, duration: 0.2 }, 9.3)   // الشرائح
    .to(W8, { work: 0, bend: 0, duration: 0.15 }, 10.9);
  walkTo(11.0, -0.95, -0.72, 0.5);              // يرجع للراس باش يصبغ
  tl.to(W8, { paint: 1, duration: 0.2 }, 11.5)
    .to(W8, { paint: 0, duration: 0.2 }, 12.9);
  walkTo(13.0, -0.62, -1.45, 0.7);              // يروح ورا الراس ويخلي السرير يبان
  tl.to(R8, { y: Math.PI / 2 - 1.2, duration: 0.4 }, 13.6);
  walkTo(17.9, -0.35, -1.55, 0.4);              // يوسع الطريق للكاميو
  tl.to(W8, { work: 0.4, duration: 0.2 }, 18.2).to(W8, { work: 0, duration: 0.2 }, 19.2);

  arrivals.sort((a, b) => a[0] - b[0]);

  function tick() {
    const t = tl.time();
    copy.classList.toggle('dark', t > 3.25);
    copy.classList.toggle('light', t > 20.75);
    let parts = 0, screws = 0;
    for (const [at, k] of arrivals) {
      if (at > t) break;
      if (k === 'parts') parts++; else screws++;
    }
    countEl.parts.textContent = parts;
    countEl.screws.textContent = screws;
  }

  // ---------- الطريق (DOM فقط، خفيف) ----------
  let lastT = 0;
  function updateRoad(time) {
    road({ prog: routeProg.v, enter: roadState.enter, hand: roadState.hand, time });
    statNums.forEach((n) => { n.textContent = Math.round(+n.dataset.to * statVals.v).toLocaleString('fr-FR'); });
  }

  // ---------- الرسم ----------
  sawdust.origin.set(0, 0.15, 0);
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(section);
  gsap.ticker.add((time) => {
    if (!visible) return;
    if (tl.time() < 3.4) updateHand();
    if (tl.time() < 2.9) return; // قبل ما يبان الـ 3D، ما نرسموش
    if (tl.time() >= 20.3) {
      updateRoad(time);
      if (tl.time() >= 21.0) return; // المشهد 3D مخبي، ما نرسموش
    }
    worker.update(time);
    T.wheels.forEach((w) => (w.rotation.y = -wheelSpin.v));
    pile.updateMatrixWorld();
    sawdust.origin.copy(blade.getWorldPosition(new THREE.Vector3()));
    sawdust.update();
    motes(time);
    placeCamera();
    renderer.render(scene, camera);
  });
  tick();
}
