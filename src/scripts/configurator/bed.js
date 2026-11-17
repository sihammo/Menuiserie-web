import * as THREE from 'three';
import { rb } from '../build-sequence/model.js';

const at = (m, x, y, z) => { m.position.set(x, y, z); return m; };

// سرير بمقاس متغير. w و l بالسنتيمتر. coffre=true: صندوق تخزين والقاعدة تتحل. false: قاعدة بالأرجل.
export function buildConfigBed(M, { w, l, coffre }) {
  const W = w / 100, L = l / 100;
  const root = new THREE.Group();

  const board = (h, z) => {
    const g = new THREE.Group();
    g.add(at(rb(0.07, h, 0.07, M.stainPine, 0.012), -W / 2 - 0.035, h / 2, 0));
    g.add(at(rb(0.07, h, 0.07, M.stainPine, 0.012), W / 2 + 0.035, h / 2, 0));
    g.add(at(rb(W + 0.16, 0.07, 0.09, M.stainPine, 0.03), 0, h - 0.035, 0));
    g.add(at(rb(W, 0.06, 0.05, M.stainPine, 0.01), 0, 0.12, 0));
    g.add(at(rb(W, h - 0.27, 0.018, M.stainMdf, 0.003), 0, (h - 0.27) / 2 + 0.15, 0));
    g.position.z = z;
    root.add(g);
  };
  board(0.95, -L / 2 - 0.045);
  board(0.48, L / 2 + 0.045);

  [-1, 1].forEach((s) => root.add(at(rb(0.028, 0.22, L, M.pine, 0.006), s * (W / 2 - 0.014), 0.25, 0)));

  if (coffre) {
    root.add(at(rb(W - 0.06, 0.016, L - 0.02, M.mdf, 0.003), 0, 0.15, 0));
    root.add(at(rb(W - 0.06, 0.04, 0.06, M.pine), 0, 0.178, 0));
  } else {
    // قاعدة بالأرجل: عوارض تحت الألواح، وأرجل في الوسط للمقاسات الكبيرة
    [-L / 2 + 0.15, 0, L / 2 - 0.15].forEach((z) => root.add(at(rb(W - 0.06, 0.05, 0.05, M.pine, 0.006), 0, 0.32, z)));
    if (W > 1.2) [-L / 3, 0, L / 3].forEach((z) => root.add(at(rb(0.06, 0.345, 0.06, M.pine, 0.008), 0, 0.1725, z)));
  }

  // القاعدة بالألواح: محور الدوران في جهة الرجلين (تتحل كيما في القصة)
  const lift = new THREE.Group();
  lift.position.set(0, 0.37, L / 2 - 0.05);
  root.add(lift);
  const rx = W / 2 - 0.12;
  (W > 1.2 ? [-rx, 0, rx] : [-rx, rx]).forEach((x) => lift.add(at(rb(0.05, 0.05, L - 0.1, M.pine, 0.008), x, 0, -(L - 0.1) / 2)));
  const N = Math.round((L - 0.26) / 0.164) + 1;
  for (let i = 0; i < N; i++) {
    lift.add(at(rb(W - 0.08, 0.018, 0.075, M.pine, 0.005), 0, 0.034, -0.08 - i * ((L - 0.26) / (N - 1))));
  }

  return { root, lift: coffre ? lift : null };
}

// نمسحو الجيومتري القديم (المواد مشتركة، ما نمسحوهاش)
export function disposeBed(root) {
  root.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
}
