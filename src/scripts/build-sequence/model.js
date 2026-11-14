import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// سرير فردي بصندوق تخزين، مقاسات تقريبية بالمتر.
// أسماء القطع (name) هي نفسها اللي لازم تكون في ملف GLB تاع Blender كي نبدلو الموديل.
export const W = 0.9, L = 1.9;

export const rb = (w, h, d, mat, r = 0.006) => {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2.2, h / 2.2, d / 2.2)), mat);
  m.castShadow = m.receiveShadow = true;
  return m;
};
const at = (m, x, y, z) => { m.position.set(x, y, z); return m; };

export function buildBed(scene, M) {
  const parts = []; // كل قطعة مركبة (للعداد)

  const board = (name, h, z) => {
    const g = new THREE.Group(); g.name = name;
    g.add(at(rb(0.07, h, 0.07, M.stainPine, 0.012), -W / 2 - 0.035, h / 2, 0));
    g.add(at(rb(0.07, h, 0.07, M.stainPine, 0.012), W / 2 + 0.035, h / 2, 0));
    g.add(at(rb(W + 0.16, 0.07, 0.09, M.stainPine, 0.03), 0, h - 0.035, 0));
    g.add(at(rb(W, 0.06, 0.05, M.stainPine, 0.01), 0, 0.12, 0));
    g.add(at(rb(W, h - 0.27, 0.018, M.stainMdf, 0.003), 0, (h - 0.27) / 2 + 0.15, 0));
    g.position.z = z;
    scene.add(g); parts.push(g);
    return g;
  };
  const head = board('headboard', 0.95, -L / 2 - 0.045);
  const foot = board('footboard', 0.48, L / 2 + 0.045);

  const rails = [-1, 1].map((s, i) => {
    const r = at(rb(0.028, 0.22, L, M.pine, 0.006), s * (W / 2 - 0.014), 0.25, 0);
    r.name = `side-rail-${i}`; scene.add(r); parts.push(r); return r;
  });

  const screws = [];
  [-1, 1].forEach((s) => [-1, 1].forEach((e) => [0.2, 0.3].forEach((y) => {
    const v = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.05, 14), M.metal);
    v.rotation.z = Math.PI / 2;
    v.position.set(s * (W / 2 + 0.012), y, e * (L / 2 - 0.025));
    v.userData.side = s; v.name = 'screw';
    scene.add(v); screws.push(v);
  })));

  const bottom = at(rb(W - 0.06, 0.016, L - 0.02, M.mdf, 0.003), 0, 0.15, 0);
  bottom.name = 'box-bottom';
  const traverse = at(rb(W - 0.06, 0.04, 0.06, M.pine), 0, 0.178, 0);
  traverse.name = 'traverse';
  scene.add(bottom, traverse); parts.push(bottom, traverse);

  // القاعدة اللي تتحل: محور الدوران في جهة الرجلين
  const lift = new THREE.Group(); lift.name = 'lift-frame';
  lift.position.set(0, 0.37, L / 2 - 0.05);
  scene.add(lift);
  const liftRails = [-1, 1].map((s) => {
    const r = at(rb(0.05, 0.05, L - 0.1, M.pine, 0.008), s * 0.33, 0, -(L - 0.1) / 2);
    lift.add(r); parts.push(r); return r;
  });
  const slats = [];
  const N = 11;
  for (let i = 0; i < N; i++) {
    const z = -0.08 - i * ((L - 0.26) / (N - 1));
    const s = at(rb(W - 0.08, 0.018, 0.075, M.pine, 0.005), 0, 0.034, z);
    s.name = 'slat'; lift.add(s); slats.push(s); parts.push(s);
  }
  const pistons = [-1, 1].map((s) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.32, 12), M.metal);
    p.position.set(s * 0.28, -0.13, -0.6);
    p.rotation.x = 0.45; p.name = 'gas-piston';
    lift.add(p); parts.push(p); return p;
  });

  return { head, foot, rails, screws, bottom, traverse, lift, liftRails, slats, pistons, parts };
}

// كومة ألواح خام قبل القص
export function buildPile(scene, M) {
  const pile = new THREE.Group(); pile.name = 'raw-pile';
  const planks = [];
  for (let i = 0; i < 7; i++) {
    const p = rb(0.2, 0.035, 2.0, i % 3 === 1 ? M.chalk : M.pine, 0.004);
    p.position.set((i % 2 ? 0.11 : -0.11) + (Math.sin(i * 7) * 0.02), 0.02 + Math.floor(i / 2) * 0.037, Math.cos(i * 3) * 0.04);
    p.rotation.y = Math.sin(i * 5) * 0.03;
    pile.add(p); planks.push(p);
  }
  pile.rotation.y = -1.05;
  scene.add(pile);
  return { pile, planks };
}
