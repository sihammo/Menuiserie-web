import * as THREE from 'three';

// نشارة الخشب كي نقصو. t من 0 لـ 1 يجي من السكرول، يعني الحركة تمشي للقدام وللور.
export function createSawdust(scene, count = 260) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const vel = [];
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 0.25 + Math.random() * 0.9;
    vel.push(new THREE.Vector3(Math.cos(a) * sp * 0.6, 0.4 + Math.random() * 1.1, Math.sin(a) * sp * 0.6));
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0xf0d9a8, size: 0.014, transparent: true, opacity: 0, depthWrite: false });
  const points = new THREE.Points(geo, mat);
  scene.add(points);
  const origin = new THREE.Vector3();
  const state = { t: 0 };
  function update() {
    const t = state.t;
    mat.opacity = t > 0 && t < 1 ? Math.min(1, (1 - t) * 1.6) : 0;
    for (let i = 0; i < count; i++) {
      const v = vel[i];
      const ti = t * (0.6 + (i % 7) * 0.08);
      pos[i * 3] = origin.x + v.x * ti;
      pos[i * 3 + 1] = Math.max(0.005, origin.y + v.y * ti - 2.2 * ti * ti);
      pos[i * 3 + 2] = origin.z + v.z * ti;
    }
    geo.attributes.position.needsUpdate = true;
  }
  return { points, origin, state, update };
}

// غبرة تطفى في ضو الشباك
export function createMotes(scene, count = 220) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const seed = [];
  for (let i = 0; i < count; i++) {
    seed.push([Math.random() * 3 - 1.5, Math.random() * 1.8, Math.random() * 3 - 1.5, Math.random() * 6.28]);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0xffe2b0, size: 0.008, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending });
  const points = new THREE.Points(geo, mat);
  scene.add(points);
  return (time) => {
    for (let i = 0; i < count; i++) {
      const s = seed[i];
      pos[i * 3] = s[0] + Math.sin(time * 0.15 + s[3]) * 0.12;
      pos[i * 3 + 1] = (s[1] + time * 0.02 + Math.sin(time * 0.3 + s[3]) * 0.05) % 1.8;
      pos[i * 3 + 2] = s[2] + Math.cos(time * 0.12 + s[3]) * 0.12;
    }
    geo.attributes.position.needsUpdate = true;
  };
}
