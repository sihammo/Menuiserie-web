import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createMaterials } from './build-sequence/materials.js';
import { buildBed, rb } from './build-sequence/model.js';
import { buildFurniture, buildTruck } from './build-sequence/extras.js';
import { createSawdust, createMotes } from './build-sequence/particles.js';

gsap.registerPlugin(ScrollTrigger);

// 3 سكرولات، كل واحد 100vh:
// 0 = لوح خشب يدور  →  1 = اللوح يتفرق ويولي سرير مصبوغ  →  2 = الخزانة والطاولة الجانبية يطلعو
// →  3 = الكاميو يجي، يشد السرير ويروح يوصل. من بعد ديريكت المنتوجات.
const STEPS = 3;

function canRun3D() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (navigator.deviceMemory && navigator.deviceMemory <= 2) return false;
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

export function initHero3D(section) {
  if (!section) return false;
  if (!canRun3D()) return false;
  section.classList.add('is3d');

  const $ = (s) => section.querySelector(s);
  const $$ = (s) => [...section.querySelectorAll(s)];
  const canvas = $('.stage3d');
  const lines = $$('.line');
  const slogan = $('.slogan');
  const dots = $$('.dots li');
  const hint = $('.hint');
  const isMobile = innerWidth < 761;

  // ---------- المشهد ----------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1e1a16);
  scene.fog = new THREE.Fog(0x1e1a16, 9, 24);
  const camera = new THREE.PerspectiveCamera(isMobile ? 48 : 34, 1, 0.05, 50);

  scene.add(new THREE.HemisphereLight(0xffeccc, 0x1e1a16, 0.6));
  const key = new THREE.DirectionalLight(0xffd59a, 2.6);
  key.position.set(-2.6, 3.8, 1.8);
  key.castShadow = true;
  key.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.5, far: 12 });
  key.shadow.bias = -0.0004;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x9fb3c8, 0.35);
  fill.position.set(3, 2, -2);
  scene.add(fill);

  const floor = new THREE.Mesh(new THREE.CircleGeometry(9, 64), new THREE.MeshStandardMaterial({ color: 0x2b241d, roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const M = createMaterials();
  const bed = buildBed(scene, M);
  const bedGroup = new THREE.Group();
  scene.add(bedGroup);
  [bed.head, bed.foot, ...bed.rails, ...bed.screws, bed.bottom, bed.traverse, bed.lift].forEach((o) => bedGroup.add(o));
  const [wardrobe, nightstand, commode] = buildFurniture(scene, M);
  commode.visible = false; // هاذ الحملة: خزانة + طاولة جانبية
  const T = buildTruck(scene);
  const sawdust = createSawdust(scene);
  const motes = createMotes(scene);

  // اللوح تاع البداية
  const plank = rb(0.22, 0.04, 2.0, M.pine, 0.006);
  plank.castShadow = true;
  plank.position.set(0, 0.55, 0);
  plank.rotation.set(0.25, 0.6, 0.12);
  scene.add(plank);

  // ---------- الكاميرا ----------
  const cam = { angle: 0.55, dist: 2.7, height: 1.05, ty: 0.5, tx: 0, mz: 1.55 }; // mz: كم نبعدو الكاميرا في التيليفون
  const target = new THREE.Vector3();
  function placeCamera() {
    const d = cam.dist * (isMobile ? cam.mz : 1);
    target.set(cam.tx, cam.ty, 0);
    camera.position.set(cam.tx + Math.sin(cam.angle) * d, cam.height * (isMobile ? 1.3 : 1), Math.cos(cam.angle) * d);
    camera.lookAt(target);
  }
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // الديسكتوب: النص في اليمين → نزحو المشهد لليسار. التيليفون: النص تحت → نطلعو المشهد
    if (w > 760) camera.setViewOffset(w, h, w * 0.1, 0, w, h);
    else camera.setViewOffset(w, h, 0, h * 0.16, w, h);
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();

  // ---------- التايملاين ----------
  const tl = gsap.timeline({
    defaults: { ease: 'power2.inOut', duration: 1 },
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: () => '+=' + innerHeight * STEPS, // 300vh
      pin: true,
      scrub: 0.6,
      snap: { snapTo: 1 / STEPS, duration: { min: 0.4, max: 1 }, delay: 0.05, ease: 'power1.inOut', inertia: false },
      onUpdate: (st) => {
        const k = Math.round(st.progress * STEPS);
        dots.forEach((d, i) => d.classList.toggle('on', i === k));
      },
    },
  });
  dots[0]?.classList.add('on');

  const swapLine = (from, to, at) => {
    tl.to(lines[from], { autoAlpha: 0, y: -24, duration: 0.25 }, at)
      .fromTo(lines[to], { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.3 }, at + 0.25);
  };

  // ===== سكرول 1: اللوح يولي سرير =====
  tl.to(hint, { autoAlpha: 0, duration: 0.15 }, 0)
    .to(plank.rotation, { x: 0, y: 0, z: 0, duration: 0.25 }, 0)
    .to(plank.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.25, ease: 'power3.in' }, 0.2)
    .to(sawdust.state, { t: 1, duration: 0.7, ease: 'none' }, 0.25);
  // كل قطعة تخرج من بلاصة اللوح وتروح لبلاصتها
  const parts = [bed.head, bed.foot, ...bed.rails, bed.bottom, bed.traverse, bed.lift];
  parts.forEach((p, i) => {
    const t = 0.3 + i * 0.05;
    tl.from(p.position, { x: 0, y: 0.55 - (p === bed.lift ? 0 : 0), z: 0, duration: 0.5, ease: 'power3.out' }, t)
      .from(p.scale, { x: 0.05, y: 0.05, z: 0.05, duration: 0.5, ease: 'back.out(1.4)' }, t)
      .from(p.rotation, { y: (i % 2 ? 1 : -1) * 1.2, duration: 0.5, ease: 'power3.out' }, t);
  });
  bed.screws.forEach((v, i) => {
    tl.from(v.scale, { x: 0, y: 0, z: 0, duration: 0.1 }, 0.72 + i * 0.01)
      .from(v.rotation, { x: Math.PI * 6, duration: 0.25, ease: 'none' }, 0.72 + i * 0.01);
  });
  tl.to(M.wipe, { value: -0.05, duration: 0.35, ease: 'power1.inOut' }, 0.65) // الصباغة
    .to(cam, { angle: 0.75, dist: 4.6, height: 2.0, ty: 0.4, duration: 1 }, 0);
  swapLine(0, 1, 0.35);

  // ===== سكرول 2: الخزانة والطاولة الجانبية =====
  tl.to(cam, { angle: 0.35, dist: 6.6, height: 2.5, ty: 0.75, tx: 0.95, duration: 1 }, 1)
    .from(wardrobe.position, { y: -2.6, duration: 0.6, ease: 'back.out(1.3)' }, 1.2)
    .from(wardrobe.rotation, { y: wardrobe.rotation.y - 1.2, duration: 0.6, ease: 'power3.out' }, 1.2)
    .from(nightstand.position, { x: 2.8, duration: 0.55, ease: 'power3.out' }, 1.35)
    .from(nightstand.rotation, { y: -1.4, duration: 0.55, ease: 'power3.out' }, 1.35)
    .to(bed.lift.rotation, { x: 0.55, duration: 0.3, ease: 'power1.inOut' }, 1.55) // نوريو الصندوق
    .to(bed.pistons.map((p) => p.rotation), { x: 1.0, duration: 0.3 }, 1.55)
    .to(bed.lift.rotation, { x: 0, duration: 0.25 }, 1.85)
    .to(bed.pistons.map((p) => p.rotation), { x: 0.45, duration: 0.25 }, 1.85);
  swapLine(1, 2, 1.25);

  // ===== سكرول 3: الكاميو يشد السرير ويروح =====
  const spin = { v: 0 };
  tl.to(lines[2], { autoAlpha: 0, y: -24, duration: 0.2 }, 2)
    .to(cam, { angle: 0.32, dist: 8.2, height: 2.4, ty: 0.9, tx: -2.7, mz: 1.8, duration: 0.5 }, 2)
    .to(T.truck.position, { x: -2.25, duration: 0.35, ease: 'power2.out' }, 2.0)
    .to(spin, { v: 25, duration: 0.35, ease: 'power2.out' }, 2.0)
    .to(bedGroup.position, { y: 0.9, duration: 0.12 }, 2.38)
    .to(bedGroup.position, { x: -2.95, y: T.floorY + 0.03, duration: 0.22 }, 2.5)
    .to(bedGroup.scale, { x: 0.55, y: 0.55, z: 0.55, duration: 0.22 }, 2.5)
    .to(T.doors.map((d) => d.hinge.rotation), { y: 0, duration: 0.12 }, 2.72)
    .to([T.truck.position, bedGroup.position], { x: '-=1.6', duration: 0.26, ease: 'power1.in' }, 2.74) // ينطلق… ويكمل طريقو كي تهبط للمنتوجات
    .to(spin, { v: 45, duration: 0.26, ease: 'power1.in' }, 2.74)
    .fromTo(slogan, { autoAlpha: 0, y: 30, scale: 0.96 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.3, ease: 'power3.out' }, 2.45);

  // ---------- الرسم ----------
  sawdust.origin.set(0, 0.55, 0);
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(section);
  gsap.ticker.add((time) => {
    if (!visible) return;
    if (tl.progress() < 0.02) plank.rotation.y = 0.6 + Math.sin(time * 0.6) * 0.25; // اللوح يدور بشوية في البداية
    T.wheels.forEach((w) => (w.rotation.y = -spin.v));
    sawdust.update();
    motes(time);
    placeCamera();
    renderer.render(scene, camera);
  });
  return true;
}
