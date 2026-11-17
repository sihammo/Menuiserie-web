import * as THREE from 'three';
import { gsap } from 'gsap';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createMaterials } from '../build-sequence/materials.js';
import { buildConfigBed, disposeBed } from './bed.js';

const OPEN_ANGLE = 0.62;
const PAINT_ON = -1, PAINT_OFF = 2; // قيمة uWipe: -1 = الألواح كاملة مصبوغة، 2 = خشب طبيعي

function canRun3D() {
  if (navigator.deviceMemory && navigator.deviceMemory <= 2) return false;
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

export function initConfigurator(root) {
  if (!root) return;
  const data = JSON.parse(root.querySelector('#cfg-data').textContent);
  const form = root.querySelector('.cfg-form');
  const canvas = root.querySelector('.cfg-canvas');
  const fallback = root.querySelector('.cfg-fallback');
  const openBtn = root.querySelector('.cfg-open');
  const sumEl = root.querySelector('.cfg-summary');
  const priceEl = root.querySelector('.cfg-price');
  const orderEl = root.querySelector('.cfg-order');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dur = (s) => (reduced ? 0 : s);

  const state = { open: false };
  const read = () => {
    const v = Object.fromEntries(new FormData(form));
    const label = (name) => form.querySelector(`input[name="${name}"]:checked`).dataset.label;
    return {
      size: data.sizes.find((s) => String(s.w) === v.size) || data.sizes[0],
      coffre: v.coffre === 'yes',
      paint: v.color === 'paint',
      labels: { size: label('size'), coffre: label('coffre'), color: label('color') },
    };
  };

  let three = null;
  if (canRun3D()) {
    try { three = setup3D(); } catch { three = null; }
  }
  if (!three) { canvas.hidden = true; fallback.hidden = false; openBtn.hidden = true; }

  function setup3D() {
    const isMobile = innerWidth < 760;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(isMobile ? 40 : 32, 1, 0.1, 30);
    scene.add(new THREE.HemisphereLight(0xfff1dc, 0x8c6b45, 1.0));
    const key = new THREE.DirectionalLight(0xffe2b8, 2.6);
    key.position.set(-2.4, 3.8, 2.2);
    key.castShadow = true;
    key.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
    Object.assign(key.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2, near: 0.5, far: 9 });
    key.shadow.radius = 5;
    key.shadow.bias = -0.0004;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xb5c4d6, 0.5);
    fill.position.set(3, 2, -2);
    scene.add(fill);

    const floor = new THREE.Mesh(new THREE.CircleGeometry(4, 48), new THREE.ShadowMaterial({ opacity: 0.3 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const controls = new OrbitControls(camera, canvas);
    controls.target.set(0, 0.42, 0);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.minPolarAngle = 0.7;
    controls.maxPolarAngle = 1.45;
    controls.autoRotate = !reduced;
    controls.autoRotateSpeed = 1.1;
    canvas.style.touchAction = 'pan-y'; // السكرول العمودي يبقى يخدم في التيليفون
    let resume;
    controls.addEventListener('start', () => { controls.autoRotate = false; clearTimeout(resume); });
    controls.addEventListener('end', () => { if (!reduced) resume = setTimeout(() => { controls.autoRotate = true; }, 4000); });

    const M = createMaterials();
    M.wipe.value = PAINT_OFF;

    const box = canvas.parentElement;
    const resize = () => {
      const w = box.clientWidth, h = box.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const d = (isMobile ? 4.2 : 5.5) * Math.max(1, 1 / camera.aspect);
      const dir = camera.position.clone().sub(controls.target);
      if (dir.lengthSq() < 1e-6) dir.set(0.9, 0.75, 1.2);
      camera.position.copy(controls.target).add(dir.setLength(d));
      camera.updateProjectionMatrix();
    };
    camera.position.set(2.2, 2.2, 3.4);
    new ResizeObserver(resize).observe(box);
    resize();

    let bed = null;
    const show = (cfg, animate) => {
      if (bed) { scene.remove(bed.root); disposeBed(bed.root); }
      bed = buildConfigBed(M, { w: cfg.size.w, l: cfg.size.l, coffre: cfg.coffre });
      scene.add(bed.root);
      if (bed.lift) bed.lift.rotation.x = state.open ? OPEN_ANGLE : 0;
      if (animate) gsap.fromTo(bed.root.scale, { x: 0.9, y: 0.9, z: 0.9 }, { x: 1, y: 1, z: 1, duration: dur(0.5), ease: 'back.out(2)' });
    };
    const paint = (on, animate) => {
      gsap.killTweensOf(M.wipe);
      const to = on ? PAINT_ON : PAINT_OFF;
      if (!animate || reduced) { M.wipe.value = to; return; }
      if (on) { M.wipe.value = 1.15; gsap.to(M.wipe, { value: to, duration: 1.1, ease: 'power1.inOut' }); } // مسحة الفرشاة من الفوق للتحت
      else gsap.to(M.wipe, { value: to, duration: 0.6, ease: 'power1.inOut' });
    };
    const toggleOpen = () => {
      if (!bed || !bed.lift) return;
      gsap.to(bed.lift.rotation, { x: state.open ? OPEN_ANGLE : 0, duration: dur(0.9), ease: 'power1.inOut' });
    };

    // نرسمو غير ملي يكون القسم باين
    let visible = false;
    const tick = () => { controls.update(); renderer.render(scene, camera); };
    new IntersectionObserver((es) => {
      visible = es[0].isIntersecting;
      renderer.setAnimationLoop(visible ? tick : null);
    }, { rootMargin: '120px' }).observe(box);

    return { show, paint, toggleOpen };
  }

  const fmt = (n) => n.toLocaleString('fr-FR').replace(/\u202f|\u00a0/g, ' ');
  function refresh(first) {
    const c = read();
    const sel = `\u2066${c.size.w}×${c.size.l}\u2069 سم · ${c.labels.coffre} · ${c.labels.color}`;
    sumEl.textContent = sel;

    const base = data.prices[c.size.w]?.[c.coffre ? 'coffre' : 'sans'];
    priceEl.textContent = typeof base === 'number' ? `${fmt(base + (c.paint ? data.paintExtra || 0 : 0))} دج` : 'الثمن: نأكدوه معاك في المكالمة';

    const slug = c.coffre ? data.slugs.coffre[c.paint ? 'paint' : 'natural'] : data.slugs.sans[c.size.w];
    orderEl.href = slug ? `/produits/${slug}?sel=${encodeURIComponent(sel)}#commande` : '#produits';

    openBtn.hidden = !three || !c.coffre;
    if (!c.coffre) { state.open = false; openBtn.setAttribute('aria-pressed', 'false'); openBtn.textContent = 'افتح الصندوق'; }
    return c;
  }

  let prev = refresh(true);
  if (three) { three.show(prev, false); three.paint(prev.paint, false); }

  form.addEventListener('change', () => {
    const c = refresh(false);
    if (three) {
      if (c.size.w !== prev.size.w || c.coffre !== prev.coffre) three.show(c, true);
      if (c.paint !== prev.paint) three.paint(c.paint, true);
    }
    prev = c;
  });

  openBtn.addEventListener('click', () => {
    state.open = !state.open;
    openBtn.setAttribute('aria-pressed', String(state.open));
    openBtn.textContent = state.open ? 'سكّر الصندوق' : 'افتح الصندوق';
    if (three) three.toggleOpen();
  });
}
