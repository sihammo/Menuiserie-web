import * as THREE from 'three';

// النجار: دمية خشب (كي دمية الرسامين) باش يبقى في نفس روح الخشب وما يكونش "إنسان مزيف".
// state.walk  : 0..1 قوة حركة الرجلين (كي يمشي)
// state.work  : 0..1 قوة ضرب المطرقة
// state.paint : 0..1 حركة الفرشاة (يمين/يسار)
export function createWorker(scene, M) {
  // لباس الخدمة: قميص أزرق، سروال داكن، بشمق، طابلية جلد
  const skin = new THREE.MeshStandardMaterial({ color: 0xb98563, roughness: 0.6 });
  const shirt = new THREE.MeshStandardMaterial({ color: 0x3d5a73, roughness: 0.95 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x2e2c29, roughness: 0.95 });
  const joint = shirt;
  const apron = new THREE.MeshStandardMaterial({ color: 0x6b4426, roughness: 0.8 });
  const boots = new THREE.MeshStandardMaterial({ color: 0x1f1a16, roughness: 0.7 });
  const steel = M.metal;

  const cap = (r, len, mat) => {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 12), mat);
    m.castShadow = true;
    return m;
  };
  const ball = (r, mat = joint) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat);
    m.castShadow = true;
    return m;
  };
  // عضو يدور من الفوق (المفصل)
  const limb = (r, len, mat) => {
    const pivot = new THREE.Group();
    const seg = cap(r, len, mat);
    seg.position.y = -len / 2 - r;
    pivot.add(seg);
    return { pivot, seg, len: len + r * 2 };
  };

  const root = new THREE.Group();
  root.name = 'worker';
  const body = new THREE.Group(); // ينحني
  body.position.y = 0.92;
  root.add(body);

  const pelvis = cap(0.11, 0.06, pants); pelvis.rotation.z = Math.PI / 2; body.add(pelvis);
  const torso = cap(0.15, 0.32, shirt); torso.position.y = 0.3; body.add(torso);
  const apronMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.55, 0.02), apron);
  apronMesh.position.set(0, 0.18, 0.15); apronMesh.castShadow = true; body.add(apronMesh);
  const neck = ball(0.05, skin); neck.position.y = 0.58; body.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 16), skin);
  head.scale.set(0.9, 1.15, 0.95); head.position.y = 0.7; head.castShadow = true; body.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.103, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), new THREE.MeshStandardMaterial({ color: 0x1c1612, roughness: 1 }));
  hair.scale.set(0.92, 1.1, 0.98); hair.position.set(0, 0.715, -0.008); body.add(hair);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.04, 8), skin);
  nose.rotation.x = Math.PI / 2; nose.position.set(0, 0.69, 0.098); body.add(nose);
  const beard = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 10, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), new THREE.MeshStandardMaterial({ color: 0x2a211b, roughness: 1 }));
  beard.scale.set(0.95, 1.1, 1.0); beard.position.set(0, 0.69, 0.01); body.add(beard);
  // قلم النجار ورا الودن
  const pencil = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.13), new THREE.MeshStandardMaterial({ color: 0xb3352b }));
  pencil.position.set(0.09, 0.72, -0.01); pencil.rotation.x = 0.3; body.add(pencil);

  const arms = [-1, 1].map((s) => {
    const shoulder = ball(0.06, shirt); shoulder.position.set(s * 0.2, 0.47, 0); body.add(shoulder);
    const upper = limb(0.048, 0.2, shirt); upper.pivot.position.copy(shoulder.position); body.add(upper.pivot);
    const elbow = ball(0.045, skin); elbow.position.y = -upper.len; upper.pivot.add(elbow);
    const fore = limb(0.04, 0.18, s > 0 ? skin : skin); // الكم مطوي fore.pivot.position.y = -upper.len; upper.pivot.add(fore.pivot);
    const hand = ball(0.05, skin); hand.position.y = -fore.len - 0.02; fore.pivot.add(hand);
    return { upper: upper.pivot, fore: fore.pivot, hand };
  });
  const legs = [-1, 1].map((s) => {
    const hip = ball(0.065, pants); hip.position.set(s * 0.09, -0.05, 0); body.add(hip);
    const thigh = limb(0.065, 0.3, pants); thigh.pivot.position.copy(hip.position); root.add(thigh.pivot);
    thigh.pivot.position.y += body.position.y;
    const knee = ball(0.058, pants); knee.position.y = -thigh.len; thigh.pivot.add(knee);
    const shin = limb(0.055, 0.3, pants); shin.pivot.position.y = -thigh.len; thigh.pivot.add(shin.pivot);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.24), boots);
    foot.position.set(0, -shin.len - 0.01, 0.05); foot.castShadow = true; shin.pivot.add(foot);
    return { thigh: thigh.pivot, shin: shin.pivot };
  });

  // المطرقة في اليد اليمنى
  const hammer = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.28, 10), M.pine);
  handle.rotation.x = Math.PI / 2; handle.position.z = 0.12;
  const headH = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.11), steel);
  headH.rotation.y = Math.PI / 2; headH.position.z = 0.25;
  hammer.add(handle, headH);
  arms[1].hand.add(hammer);
  // الفرشاة في اليد اليسرى
  const brush = new THREE.Group();
  const bh = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.16, 8), M.pine);
  bh.rotation.x = Math.PI / 2; bh.position.z = 0.08;
  const bristles = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.018, 0.06), new THREE.MeshStandardMaterial({ color: 0x5a2f16, roughness: 1 }));
  bristles.position.z = 0.18;
  brush.add(bh, bristles);
  arms[0].hand.add(brush);

  root.scale.setScalar(0.97);
  scene.add(root);

  const state = { walk: 0, work: 0, paint: 0, bend: 0 };

  function update(time) {
    const w = Math.sin(time * 7);
    // الرجلين والذراعين كي يمشي
    legs[0].thigh.rotation.x = w * 0.5 * state.walk - state.bend * 0.6;
    legs[1].thigh.rotation.x = -w * 0.5 * state.walk - state.bend * 0.6;
    legs[0].shin.rotation.x = Math.max(0, -w) * 0.6 * state.walk + state.bend * 1.1;
    legs[1].shin.rotation.x = Math.max(0, w) * 0.6 * state.walk + state.bend * 1.1;
    body.position.y = 0.92 - state.bend * 0.16 + Math.abs(w) * 0.015 * state.walk;
    body.rotation.x = state.bend * 0.45;
    head.rotation.x = state.bend * 0.3;

    // المطرقة: ترفع وتضرب
    const strike = Math.pow(Math.max(0, Math.sin(time * 9)), 3);
    arms[1].upper.rotation.x = -0.25 * state.walk * w - state.work * (0.9 + strike * 1.0);
    arms[1].fore.rotation.x = -state.work * (0.9 - strike * 0.6);
    arms[1].upper.rotation.z = 0.12;
    // الفرشاة: يمين ويسار
    arms[0].upper.rotation.x = 0.25 * state.walk * w - state.paint * 1.2 - state.work * 0.5;
    arms[0].fore.rotation.x = -state.paint * 0.6 - state.work * 0.7;
    arms[0].upper.rotation.z = -0.12 - state.paint * Math.sin(time * 4) * 0.35;
    hammer.visible = state.paint < 0.5;
    brush.visible = state.paint >= 0.5;
  }

  // ---------- موديل حقيقي (اختياري) ----------
  // إذا كاين public/models/worker.glb (شخصية Mixamo بالأنيميشن)، يتبدل بيه الدمية.
  let mixer = null, actions = null, real = null;
  const clock = new THREE.Clock();
  function attachRealModel(gltf) {
    real = gltf.scene;
    real.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    // نقيسو العلو ونخليوه 1.75 م
    const box = new THREE.Box3().setFromObject(real);
    const h = box.max.y - box.min.y || 1;
    real.scale.setScalar(1.75 / h / root.scale.x);
    real.position.y = -box.min.y * real.scale.y;
    body.visible = false;
    legs.forEach((l) => (l.thigh.visible = false));
    root.add(real);
    // نحطو المطرقة والفرشاة في يدين الموديل
    let rh = null, lh = null;
    real.traverse((o) => { if (o.isBone) { const n = o.name.toLowerCase(); if (!rh && n.includes('righthand')) rh = o; if (!lh && n.includes('lefthand')) lh = o; } });
    const s = 1 / (real.scale.x * root.scale.x);
    if (rh) { rh.add(hammer); hammer.scale.setScalar(s); hammer.rotation.set(Math.PI / 2, 0, 0); hammer.position.set(0, 8 * s * 0.01, 0); }
    if (lh) { lh.add(brush); brush.scale.setScalar(s); brush.rotation.set(Math.PI / 2, 0, 0); }
    mixer = new THREE.AnimationMixer(real);
    const find = (...keys) => gltf.animations.find((c) => keys.some((k) => c.name.toLowerCase().includes(k)));
    const mk = (clip) => { if (!clip) return null; const a = mixer.clipAction(clip); a.play(); a.setEffectiveWeight(0); return a; };
    actions = {
      idle: mk(find('idle', 'stand')),
      walk: mk(find('walk')),
      work: mk(find('hammer', 'nail', 'work')),
      paint: mk(find('paint', 'brush', 'wipe')),
    };
    if (!actions.paint) actions.paint = actions.work;
  }

  function updateReal() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const wWalk = actions.walk ? state.walk : 0;
    const wWork = actions.work ? state.work * (1 - state.walk) : 0;
    const wPaint = actions.paint ? state.paint * (1 - state.walk) : 0;
    const wIdle = Math.max(0, 1 - wWalk - wWork - wPaint);
    const set = (a, w) => a && a.setEffectiveWeight(w);
    set(actions.idle, wIdle); set(actions.walk, wWalk);
    if (actions.paint === actions.work) set(actions.work, Math.min(1, wWork + wPaint));
    else { set(actions.work, wWork); set(actions.paint, wPaint); }
    mixer.update(dt);
  }

  return { root, state, update: (t) => (mixer ? updateReal() : update(t)), attachRealModel };
}
