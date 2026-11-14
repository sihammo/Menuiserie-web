import * as THREE from 'three';
import { rb } from './model.js';

const at = (m, x, y, z) => { m.position.set(x, y, z); return m; };

// قطع أخرى على الطلب: خزانة، طاولة جانبية، كوموضة
export function buildFurniture(scene, M) {
  const knob = () => { const k = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 8), M.metal); k.castShadow = true; return k; };

  // مراية بلا envMap: نرسمو انعكاس مزيف (ضو مائل) بتدرج لوني
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 256;
  const g2 = cv.getContext('2d');
  const grad = g2.createLinearGradient(0, 0, 64, 256);
  grad.addColorStop(0, '#b9c9d3'); grad.addColorStop(0.28, '#e9f1f5'); grad.addColorStop(0.36, '#8fa3af');
  grad.addColorStop(0.62, '#a9bac5'); grad.addColorStop(0.7, '#dfeaf0'); grad.addColorStop(1, '#6f8493');
  g2.fillStyle = grad; g2.fillRect(0, 0, 64, 256);
  const mTex = new THREE.CanvasTexture(cv); mTex.colorSpace = THREE.SRGBColorSpace;
  const mirrorMat = new THREE.MeshStandardMaterial({ map: mTex, color: 0xffffff, metalness: 0.25, roughness: 0.06, emissive: 0x7f95a3, emissiveMap: mTex, emissiveIntensity: 0.35 });

  const wardrobe = new THREE.Group(); wardrobe.name = 'wardrobe';
  const ww = 1.0, wh = 1.95, wd = 0.55;
  wardrobe.add(at(rb(0.03, wh, wd, M.stainPine), -ww / 2, wh / 2, 0), at(rb(0.03, wh, wd, M.stainPine), ww / 2, wh / 2, 0));
  wardrobe.add(at(rb(ww + 0.06, 0.05, wd + 0.04, M.stainPine, 0.01), 0, wh, 0), at(rb(ww, 0.08, wd, M.stainPine), 0, 0.04, 0));
  wardrobe.add(at(rb(ww, wh, 0.015, M.stainMdf, 0.002), 0, wh / 2, -wd / 2));
  [-1, 1].forEach((s) => {
    const door = at(rb(ww / 2 - 0.01, wh - 0.12, 0.022, M.stainMdf, 0.004), s * (ww / 4), wh / 2 + 0.02, wd / 2);
    const frame = at(rb(ww / 2 - 0.08, wh - 0.3, 0.008, M.stainPine, 0.002), s * (ww / 4), wh / 2 + 0.02, wd / 2 + 0.014);
    const k = at(knob(), s * 0.04, wh / 2, wd / 2 + 0.03);
    wardrobe.add(door, frame, k);
    // مراية على الباب: لوح عاكس بإطار معدني رقيق
    const mw = ww / 2 - 0.15, mh = wh - 0.42;
    const mirror = at(new THREE.Mesh(new THREE.PlaneGeometry(mw, mh), mirrorMat), s * (ww / 4), wh / 2 + 0.02, wd / 2 + 0.02);
    const mFrame = at(rb(mw + 0.03, mh + 0.03, 0.004, M.metal, 0.001), s * (ww / 4), wh / 2 + 0.02, wd / 2 + 0.017);
    wardrobe.add(mFrame, mirror);
  });

  const drawerBox = (name, w, h, d, n, frameMat, panelMat) => {
    const g = new THREE.Group(); g.name = name;
    g.add(at(rb(0.035, h, 0.035, frameMat), -w / 2, h / 2, d / 2), at(rb(0.035, h, 0.035, frameMat), w / 2, h / 2, d / 2));
    g.add(at(rb(0.035, h, 0.035, frameMat), -w / 2, h / 2, -d / 2), at(rb(0.035, h, 0.035, frameMat), w / 2, h / 2, -d / 2));
    g.add(at(rb(w + 0.04, 0.025, d + 0.04, frameMat, 0.006), 0, h, 0));
    g.add(at(rb(0.012, h - 0.12, d - 0.03, panelMat, 0.002), -w / 2, h / 2 + 0.04, 0), at(rb(0.012, h - 0.12, d - 0.03, panelMat, 0.002), w / 2, h / 2 + 0.04, 0));
    const dh = (h - 0.16) / n;
    for (let i = 0; i < n; i++) {
      const y = 0.1 + dh * i + dh / 2;
      g.add(at(rb(w - 0.06, dh - 0.02, 0.018, panelMat, 0.003), 0, y, d / 2), at(knob(), 0, y, d / 2 + 0.02));
    }
    return g;
  };
  const nightstand = drawerBox('nightstand', 0.45, 0.52, 0.38, 2, M.pine, M.mdf);
  const commode = drawerBox('commode', 0.9, 0.85, 0.45, 4, M.stainPine, M.stainMdf);

  wardrobe.position.set(1.55, 0, -1.25); wardrobe.rotation.y = -0.35;
  nightstand.position.set(0.82, 0, -0.95);
  commode.position.set(2.25, 0, -0.35); commode.rotation.y = -Math.PI / 2;
  [wardrobe, nightstand, commode].forEach((g) => { g.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; }); scene.add(g); });
  return [wardrobe, nightstand, commode];
}

// الكاميو: الكابينة من جهة -x، الباب الخلفي من جهة +x
export function buildTruck(scene) {
  const truck = new THREE.Group(); truck.name = 'truck';
  const body = new THREE.MeshStandardMaterial({ color: 0xded7c8, roughness: 0.7 });
  const cabMat = new THREE.MeshStandardMaterial({ color: 0x3d5a73, roughness: 0.5, metalness: 0.2 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x1b252c, roughness: 0.1, metalness: 0.6 });
  const tyre = new THREE.MeshStandardMaterial({ color: 0x151311, roughness: 0.9 });
  const box = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; truck.add(m); return m; };

  const L = 2.5, Wd = 1.5, Hc = 1.55, floorY = 0.55, x0 = 0.15; // الصندوق من x0-L لـ x0
  box(L, 0.05, Wd, body, x0 - L / 2, floorY, 0);
  box(L, 0.05, Wd, body, x0 - L / 2, floorY + Hc, 0);
  box(L, Hc, 0.04, body, x0 - L / 2, floorY + Hc / 2, Wd / 2);
  box(L, Hc, 0.04, body, x0 - L / 2, floorY + Hc / 2, -Wd / 2);
  box(0.04, Hc, Wd, body, x0 - L, floorY + Hc / 2, 0);
  box(L + 0.9, 0.12, 1.1, cabMat, x0 - L / 2 - 0.3, floorY - 0.1, 0); // الشاسي
  // الكابينة
  box(0.9, 1.0, 1.45, cabMat, x0 - L - 0.5, 0.95, 0);
  box(0.5, 0.45, 1.46, glass, x0 - L - 0.7, 1.2, 0);
  // العجلات
  const wheels = [];
  [[x0 - L - 0.5, 0.75], [x0 - L - 0.5, -0.75], [x0 - 0.5, 0.75], [x0 - 0.5, -0.75]].forEach(([x, z]) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.22, 20), tyre);
    w.rotation.x = Math.PI / 2; w.position.set(x, 0.3, z); w.castShadow = true;
    truck.add(w); wheels.push(w);
  });
  // الأبواب الخلفية
  const doors = [-1, 1].map((s) => {
    const hinge = new THREE.Group(); hinge.position.set(x0, floorY + Hc / 2, s * Wd / 2);
    const d = new THREE.Mesh(new THREE.BoxGeometry(0.03, Hc, Wd / 2), body);
    d.position.z = -s * Wd / 4; d.castShadow = true;
    hinge.add(d); truck.add(hinge);
    hinge.rotation.y = -s * Math.PI * 0.55; // مفتوحين في البداية
    return { hinge, s };
  });
  // ضوء الرجوع للخلف: الكاميو يرجع بالعكس نحو الورشة، فالضو يسبقو
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff1cf });
  [-0.55, 0.55].forEach((z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.16), lampMat); m.position.set(x0 + 0.03, floorY - 0.02, z); truck.add(m); });
  const glow = new THREE.PointLight(0xffe2b0, 0, 0, 1.4); glow.position.set(x0 + 0.5, 0.7, 0); truck.add(glow);
  truck.position.set(-14, 0, 0.1);
  scene.add(truck);
  return { truck, wheels, doors, floorY, backX: x0, glow };
}
