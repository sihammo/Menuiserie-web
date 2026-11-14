import * as THREE from 'three';
import { OUTLINE, ROUTE_START, ROUTE_SEGS, STOPS, VB, TOTAL_KM } from './mapdata.js';
import { WILAYAS, STOP_CODES } from './wilayas.js';

// خريطة الجزائر 3D: تضاريس بيضاء، أسطوانات صفراء مضيئة لكل ولاية، طريق مرسوم، والكاميو يمشي عليه.
// الوحدات: 1 بيكسل من الـ SVG = SC وحدة. الشمال = -z، الجنوب = +z، والكاميرا تتفرج من الجنوب.

const SC = 0.02;
const CX = VB.w / 2, CY = VB.h / 2;
const toWorld = (x, y, h = 0) => new THREE.Vector3((x - CX) * SC, h, (y - CY) * SC);
const llToSvg = (lat, lon) => [435.3 + 35.3 * (lon - 3.06), 36 + 40 * (36.75 - lat)];
const shapeFrom = (pts) => {
  const s = new THREE.Shape();
  pts.forEach(([x, y], i) => { const X = (x - CX) * SC, Y = -(y - CY) * SC; if (i) s.lineTo(X, Y); else s.moveTo(X, Y); });
  return s;
};
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.min(1, Math.max(0, v));

// بالتة السيت (نفس الخريطة القديمة): كرافت، غرافيت، جوز، وعلامة الطباشير الحمراء
const KRAFT = 0xcdb48e;
const KRAFT_LIGHT = 0xe3d3b4;
const GRAPHITE = 0x3a3a38;
const WALNUT = 0x6e3b1c;
const MARK = 0xb3352b;
const LAND = 0xdcc9ab;   // نفس لون الملء القديم (كرافت + أبيض شفاف 25%)
const RED = new THREE.Color(MARK), PAPER = new THREE.Color(KRAFT_LIGHT);

// مواد بلا tone mapping باش الألوان تبقى كيما حددناها (الأبيض أبيض والأصفر أصفر)
const basic = (o) => new THREE.MeshBasicMaterial({ toneMapped: false, fog: false, ...o });
const std = (o) => new THREE.MeshStandardMaterial({ toneMapped: false, ...o });

function radialTexture(stops, size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => grad.addColorStop(o, col));
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function signTexture(text) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#6E3B1C';
  g.font = '700 74px "El Messiri", "Segoe UI", Tahoma, serif';
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'rtl';
  g.fillText(text, 128, 66);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------- الكاميو (الواجهة نحو +x) ----------
function buildMapTruck() {
  const g = new THREE.Group();
  const cream = std({ color: 0xe8e0cf, roughness: 0.7 });
  const navy = std({ color: 0x3d5a73, roughness: 0.5 });
  const dark = std({ color: 0x1b252c, roughness: 0.3 });
  const tyre = std({ color: 0x151311, roughness: 0.9 });
  const box = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); g.add(m); return m; };

  box(0.88, 0.05, 0.26, dark, 0.0, 0.11, 0);              // الشاسي
  box(0.56, 0.32, 0.31, cream, -0.14, 0.29, 0);           // الصندوق
  box(0.562, 0.045, 0.312, std({ color: 0x6e3b1c, roughness: 0.6 }), -0.14, 0.2, 0);
  box(0.23, 0.25, 0.28, navy, 0.29, 0.245, 0);            // الكابينة
  box(0.02, 0.12, 0.23, dark, 0.41, 0.29, 0);             // الزجاج
  [-0.09, 0.09].forEach((z) => box(0.02, 0.04, 0.05, basic({ color: 0xfff1b8 }), 0.405, 0.17, z)); // الضو

  const sign = signTexture('الورشة');
  [1, -1].forEach((s) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.18), new THREE.MeshBasicMaterial({ map: sign, transparent: true, toneMapped: false, fog: false }));
    p.position.set(-0.14, 0.31, s * 0.158);
    if (s < 0) p.rotation.y = Math.PI;
    g.add(p);
  });

  const wheels = [];
  [[-0.3, 1], [-0.3, -1], [0.29, 1], [0.29, -1]].forEach(([x, s]) => {
    const axle = new THREE.Group(); axle.position.set(x, 0.075, s * 0.145);
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 18), tyre);
    w.rotation.x = Math.PI / 2;
    const hub = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.055), std({ color: 0xcfc6b4 }));
    axle.add(w, hub); g.add(axle); wheels.push(axle);
  });

  // ظل تحت الكاميو
  const sh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 0.6),
    new THREE.MeshBasicMaterial({ map: radialTexture([[0, 'rgba(20,30,45,.38)'], [1, 'rgba(20,30,45,0)']]), transparent: true, depthWrite: false, toneMapped: false, fog: false })
  );
  sh.rotation.x = -Math.PI / 2; sh.position.y = 0.004;
  g.add(sh);
  g.scale.setScalar(1.25);
  return { group: g, wheels };
}

// ---------- الورشة (بوتيك صغير بتندة) ----------
function buildWorkshopHouse() {
  const g = new THREE.Group();
  const add = (geo, mat, x, y, z, rx = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.x = rx; g.add(m); return m; };
  const wall = std({ color: 0xf6f2ea, roughness: 0.8 });
  const walnut = std({ color: 0x6e3b1c, roughness: 0.6 });
  const cream = std({ color: 0xf3e9d2, roughness: 0.7 });
  const glass = std({ color: 0x9fc7e8, roughness: 0.2, metalness: 0.2 });

  add(new THREE.BoxGeometry(0.62, 0.38, 0.46), wall, 0, 0.19, 0);
  add(new THREE.BoxGeometry(0.7, 0.05, 0.54), cream, 0, 0.405, 0);
  add(new THREE.BoxGeometry(0.46, 0.09, 0.025), walnut, 0, 0.33, 0.245);          // اللافتة
  for (let i = 0; i < 6; i++) {                                                      // التندة بخطوط
    add(new THREE.BoxGeometry(0.1, 0.018, 0.2), i % 2 ? cream : walnut, -0.25 + i * 0.1, 0.29, 0.34, 0.38);
  }
  add(new THREE.BoxGeometry(0.16, 0.22, 0.012), glass, -0.16, 0.14, 0.234);
  add(new THREE.BoxGeometry(0.14, 0.26, 0.012), walnut, 0.14, 0.15, 0.234);
  const sh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, 1.0),
    new THREE.MeshBasicMaterial({ map: radialTexture([[0, 'rgba(20,30,45,.30)'], [1, 'rgba(20,30,45,0)']]), transparent: true, depthWrite: false, toneMapped: false, fog: false })
  );
  sh.rotation.x = -Math.PI / 2; sh.position.set(0.05, 0.004, 0.05);
  g.add(sh);
  return g;
}

export function createMap3D({ isMobile, labelsEl }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(KRAFT);
  const camera = new THREE.PerspectiveCamera(isMobile ? 46 : 34, 1, 0.1, 160);

  scene.add(new THREE.HemisphereLight(0xfff6e6, 0xe8d9bd, 1.7));
  const sun = new THREE.DirectionalLight(0xfff2d6, 1.9);
  sun.position.set(-6, 9, 4);
  scene.add(sun);

  const DEPTH = 0.1, BEV = 0.025;

  // ورق الكرافت (نفس خلفية السيت)
  const kraftTex = new THREE.TextureLoader().load('/textures/kraft.jpg');
  kraftTex.colorSpace = THREE.SRGBColorSpace;
  kraftTex.wrapS = kraftTex.wrapT = THREE.RepeatWrapping;
  kraftTex.repeat.set(16, 16);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), basic({ map: kraftTex, color: 0xffffff }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.2;
  scene.add(ground);

  // الجزائر: بلاطة رقيقة بنفس لون الملء القديم، وحافتها غرافيت (كيما الحدود القديمة)
  const pts = OUTLINE.slice();
  const a = pts[0], b = pts[pts.length - 1];
  if (a[0] === b[0] && a[1] === b[1]) pts.pop();
  const landGeo = new THREE.ExtrudeGeometry(shapeFrom(pts), { depth: DEPTH, bevelEnabled: true, bevelThickness: BEV, bevelSize: BEV, bevelSegments: 1 });
  const land = new THREE.Mesh(landGeo, [basic({ color: LAND }), basic({ color: GRAPHITE })]);
  land.rotation.x = -Math.PI / 2; land.position.y = -(DEPTH + BEV);
  scene.add(land);
  const edge = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(pts.map(([x, y]) => new THREE.Vector3((x - CX) * SC, 0.004, (y - CY) * SC))),
    new THREE.LineBasicMaterial({ color: GRAPHITE, toneMapped: false, fog: false })
  );
  scene.add(edge);

  // ---------- الطريق ----------
  const path = new THREE.CurvePath();
  let prev = toWorld(ROUTE_START[0], ROUTE_START[1], 0.05);
  ROUTE_SEGS.forEach(([x1, y1, x2, y2, x, y]) => {
    const p1 = toWorld(x1, y1, 0.05), p2 = toWorld(x2, y2, 0.05), p3 = toWorld(x, y, 0.05);
    path.add(new THREE.CubicBezierCurve3(prev, p1, p2, p3));
    prev = p3;
  });
  const pathLen = path.getLength();
  const SEG = 700, RAD = 8;
  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(path, SEG, 0.055, RAD, false),
    std({ color: MARK, roughness: 0.6 })
  );
  tube.frustumCulled = false;
  scene.add(tube);
  const tubeIndexTotal = tube.geometry.index.count;
  tube.geometry.setDrawRange(0, 0);

  const samples = path.getSpacedPoints(800);
  const dashGeo = new THREE.BufferGeometry().setFromPoints(samples.map((p) => new THREE.Vector3(p.x, 0.015, p.z)));
  const dashed = new THREE.Line(dashGeo, new THREE.LineDashedMaterial({ color: 0x5a4e3c, dashSize: 0.14, gapSize: 0.12, toneMapped: false, fog: false }));
  dashed.computeLineDistances();
  scene.add(dashed);

  // ---------- علامات الولايات ----------
  const stopPts = STOPS.map((st) => [st.x, st.y]);
  const near = (x, y) => stopPts.some(([sx, sy]) => (sx - x) ** 2 + (sy - y) ** 2 < 12 * 12);
  const wil = WILAYAS.map(([, , lat, lon]) => llToSvg(lat, lon)).filter(([x, y]) => !near(x, y));
  const markers = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.07, 0.07, 0.1, 16),
    std({ color: 0x7a705c, roughness: 0.8 }),
    wil.length
  );
  const m4 = new THREE.Matrix4();
  wil.forEach(([x, y], i) => { m4.makeTranslation((x - CX) * SC, 0.05, (y - CY) * SC); markers.setMatrixAt(i, m4); });
  scene.add(markers);

  // محطات الطريق: كل وحدة تكبر وتولي حمراء كي يعدي عليها الكاميو
  const stopRefs = [];
  STOPS.forEach((st, i) => {
    if (i === 0 || (!st.name && i !== STOPS.length - 1)) { stopRefs.push(null); return; }
    const mat = std({ color: KRAFT_LIGHT, roughness: 0.7 });
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.16, 24), mat);
    mesh.geometry.translate(0, 0.08, 0);
    const pos = toWorld(st.x, st.y, 0);
    mesh.position.copy(pos);
    const edgeRing = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.15, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: GRAPHITE, toneMapped: false, fog: false }));
    edgeRing.position.set(pos.x, 0.006, pos.z);
    scene.add(mesh, edgeRing);
    stopRefs.push({ mesh, mat, s: 1, pos });
  });

  // ---------- الورشة ----------
  const hqPos = toWorld(STOPS[0].x, STOPS[0].y, 0);
  const house = buildWorkshopHouse();
  house.position.copy(hqPos);
  scene.add(house);
  const ringMat = new THREE.MeshBasicMaterial({ color: WALNUT, transparent: true, toneMapped: false, fog: false, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.56, 48).rotateX(-Math.PI / 2), ringMat);
  ring.position.set(hqPos.x, 0.02, hqPos.z + 0.05);
  scene.add(ring);

  // نقطة النهاية
  const dest = STOPS[STOPS.length - 1];
  const destPos = toWorld(dest.x, dest.y, 0);
  const destRingMat = new THREE.MeshBasicMaterial({ color: 0xb3352b, transparent: true, toneMapped: false, fog: false, depthWrite: false });
  const destRing = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.48, 48).rotateX(-Math.PI / 2), destRingMat);
  destRing.position.set(destPos.x, 0.02, destPos.z);
  scene.add(destRing);

  // ---------- الكاميو ----------
  const truck = buildMapTruck();
  scene.add(truck.group);

  // ---------- كم من الطريق لكل محطة ----------
  const stopFrac = STOPS.map((s) => {
    const p = toWorld(s.x, s.y, 0);
    let best = 0, bd = Infinity;
    samples.forEach((q, i) => { const d = (q.x - p.x) ** 2 + (q.z - p.z) ** 2; if (d < bd) { bd = d; best = i; } });
    return best / (samples.length - 1);
  });
  stopFrac[0] = 0;
  stopFrac[STOPS.length - 1] = 1;

  // ---------- الـ pills (HTML فوق الكانفاس) ----------
  const pills = [];
  const addPill = (html, pos, kind, frac) => {
    const el = document.createElement('div');
    el.className = `pill ${kind}`;
    el.innerHTML = html;
    labelsEl.appendChild(el);
    pills.push({ el, pos: pos.clone().setY(0.62), kind, frac, on: false });
  };
  const km = (f) => Math.round(f * TOTAL_KM).toLocaleString('fr-FR');
  addPill('<span class="n">A</span><b>الورشة · عين البيضة</b>', hqPos.clone().setY(0.35), 'hq', 0);
  STOPS.forEach((s, i) => {
    if (!stopRefs[i] || i === STOPS.length - 1) return;
    const code = String(STOP_CODES[s.name] ?? '').padStart(2, '0');
    addPill(`<span class="n">${code}</span><b>${s.name}</b><span class="k">كم <bdi>${km(stopFrac[i])}</bdi></span>`, stopRefs[i].pos, 'stop', stopFrac[i]);
  });
  addPill(`<span class="n">B</span><b>أقصى الجنوب · الحدود</b><span class="k">كم <bdi>${km(1)}</bdi></span>`, destPos, 'dest', 0.995);

  // ---------- الكاميرا ----------
  const camPos = new THREE.Vector3(), camTarget = new THREE.Vector3();
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpP = new THREE.Vector3();
  let first = true, heading = 0, lastProg = 0, moving = 0, headingInit = false;
  const placeOn = (target, azDeg, elDeg, dist, out) => {
    const az = (azDeg * Math.PI) / 180, el = (elDeg * Math.PI) / 180;
    return out.set(target.x + Math.sin(az) * Math.cos(el) * dist, target.y + Math.sin(el) * dist, target.z + Math.cos(az) * Math.cos(el) * dist);
  };

  const ovTarget = new THREE.Vector3(0, 0, 0);
  const ovPos = placeOn(ovTarget, 0, 57, isMobile ? 31 : 27, new THREE.Vector3());
  const hqTarget = new THREE.Vector3(hqPos.x, 0.2, hqPos.z + 0.3);
  const hqCam = placeOn(hqTarget, -22, 30, isMobile ? 6.2 : 4.6, new THREE.Vector3());

  const v = new THREE.Vector3(), tgt = new THREE.Vector3(), pos = new THREE.Vector3();
  function update({ prog, follow, hq, time, dt }) {
    prog = clamp01(prog);
    // الطريق المرسوم
    const segs = Math.floor(prog * SEG);
    tube.geometry.setDrawRange(0, Math.min(tubeIndexTotal, segs * RAD * 6));

    // الكاميو
    path.getPointAt(prog, tmpP);
    path.getPointAt(Math.min(1, prog + 0.004), tmpA);
    path.getPointAt(Math.max(0, prog - 0.004), tmpB);
    const tx = tmpA.x - tmpB.x, tz = tmpA.z - tmpB.z;
    if (tx * tx + tz * tz > 1e-8) {
      const th = Math.atan2(-tz, tx);
      if (!headingInit) { heading = th; headingInit = true; }
      let d = th - heading;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      heading += d * (1 - Math.exp(-dt * 9));
    }
    const isMoving = Math.abs(prog - lastProg) > 1e-5 ? 1 : 0;
    moving += (isMoving - moving) * (1 - Math.exp(-dt * 8));
    lastProg = prog;
    truck.group.position.set(tmpP.x, 0.01 + Math.sin(time * 17) * 0.006 * moving, tmpP.z);
    truck.group.rotation.set(0, heading, Math.sin(time * 13) * 0.012 * moving);
    const spin = (prog * pathLen) / 0.075;
    truck.wheels.forEach((w) => { w.rotation.z = -spin; });

    // المحطات
    stopRefs.forEach((r, i) => {
      if (!r) return;
      const passed = prog >= stopFrac[i] - 0.002 && prog > 0.001;
      r.s += ((passed ? 1.35 : 1) - r.s) * (1 - Math.exp(-dt * 10));
      r.mesh.scale.setScalar(r.s);
      r.mat.color.copy(PAPER).lerp(RED, clamp01((r.s - 1) / 0.35));
    });

    // حلقات النبض
    const ph = (time % 1.8) / 1.8;
    ring.scale.setScalar(1 + ph * 0.9); ringMat.opacity = (1 - ph) * 0.85;
    const atEnd = prog > 0.97 ? 1 : 0.35;
    destRing.scale.setScalar(1 + ph * 0.8); destRingMat.opacity = (1 - ph) * atEnd;

    // الكاميرا: نظرة عامة ← تتبع الكاميو ← زوم على الورشة
    const fTarget = v.set(tmpP.x, 0.15, tmpP.z - 0.5);
    const fPos = placeOn(fTarget, -18, 46, isMobile ? 13 : 10, tmpA); // كاميرا بعيدة باش تبان الخريطة والكاميو صغير
    const fTargetC = tmpB.copy(fTarget);
    tgt.copy(ovTarget).lerp(fTargetC, follow).lerp(hqTarget, hq);
    pos.copy(ovPos).lerp(fPos, follow).lerp(hqCam, hq);
    if (first) { camPos.copy(pos); camTarget.copy(tgt); first = false; }
    else {
      const k = 1 - Math.exp(-dt * 5.5);
      camPos.lerp(pos, k); camTarget.lerp(tgt, k);
    }
    camera.position.copy(camPos);
    camera.lookAt(camTarget);
    camera.updateMatrixWorld();

    // الـ pills
    const w = labelsEl.clientWidth, h = labelsEl.clientHeight;
    pills.forEach((p) => {
      let show;
      if (p.kind === 'hq') show = true;
      else if (p.kind === 'dest') show = prog >= p.frac - 0.02 && hq < 0.5;
      else show = prog >= p.frac - 0.002 && prog > 0.001 && follow > 0.35 && hq < 0.5;
      v.copy(p.pos).project(camera);
      const vis = show && v.z < 1 && Math.abs(v.x) < 1.15 && Math.abs(v.y) < 1.15;
      if (vis !== p.on) { p.on = vis; p.el.classList.toggle('on', vis); }
      if (vis) p.el.style.transform = `translate(${((v.x * 0.5 + 0.5) * w).toFixed(1)}px, ${((-v.y * 0.5 + 0.5) * h).toFixed(1)}px) translate(-50%, -100%)`;
    });
  }

  return { scene, camera, update, stops: STOPS.map((s, i) => ({ name: s.name, frac: stopFrac[i] })) };
}
