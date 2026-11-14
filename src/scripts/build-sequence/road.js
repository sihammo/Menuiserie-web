// مشهد الطريق: الكاميو يمشي والمناظر تجري وراه، وخريطة صغيرة للجزائر تبين وين وصل.
// الأسماء والنقاط تجي من STOPS في mapdata.js (هنا تتزاد الولايات من بعد).
import { OUTLINE, ROUTE_START, ROUTE_SEGS, STOPS, TOTAL_KM } from './mapdata.js';

const NS = 'http://www.w3.org/2000/svg';
const svgUri = (w, h, body) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="${NS}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${body}</svg>`)}")`;
const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const smooth = (t) => t * t * (3 - 2 * t);

// قمم بعيدة (تلال/كثبان)
const HILLS = svgUri(1400, 200, '<path d="M0 200V112C150 60 300 150 450 100S750 50 900 112S1250 150 1400 112V200Z"/>');
// عمود كهرباء + أسلاك + نخلة + شجيرة
const MID = svgUri(900, 260, `
  <path d="M0 112Q225 100 450 100Q675 100 900 112" fill="none" stroke="#000" stroke-width="2.2"/>
  <rect x="446" y="96" width="8" height="164"/><rect x="420" y="100" width="60" height="6"/>
  <path d="M200 260C206 210 194 172 203 140" fill="none" stroke="#000" stroke-width="8" stroke-linecap="round"/>
  <path d="M203 140Q170 118 140 132Q172 124 203 140ZM203 140Q236 116 268 130Q236 124 203 140ZM203 140Q190 104 170 92Q198 104 203 140ZM203 140Q216 102 240 92Q210 106 203 140Z" stroke="#000" stroke-width="5" stroke-linejoin="round"/>
  <ellipse cx="720" cy="248" rx="46" ry="22"/><ellipse cx="755" cy="252" rx="30" ry="16"/>`);

export function createRoad(root, { isMobile }) {
  const $ = (q) => root.querySelector(q);
  const far = $('.far'), mid = $('.mid'), dash = $('.dash'), truck = $('.truck2d');
  const gTruck = $('.g-truck'), gWork = $('.g-work'), gHome = $('.g-home'), gBed = $('.g-bed'), gDoor = $('.g-rdoor'), gOk = $('.g-ok');
  const wheels = [...root.querySelectorAll('.wheel')];
  const km = $('[data-kmcount]'), stopEl = $('[data-mapstop]'), bar = $('[data-mapbar]');
  const mOut = $('.m-out'), mRoute = $('.m-route'), mDone = $('.m-done'), mDot = $('.m-dot');
  [[far, HILLS], [mid, MID]].forEach(([el, img]) => { el.style.webkitMaskImage = img; el.style.maskImage = img; el.style.webkitMaskSize = el.style.maskSize = el === far ? '1400px 100%' : '900px 100%'; });

  // ---- الخريطة الصغيرة: نحسبو الإطار من حدود الجزائر ونرسمو الطريق ----
  const xs = OUTLINE.map((p) => p[0]), ys = OUTLINE.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const k = 92 / Math.max(x1 - x0, y1 - y0), ox = (100 - (x1 - x0) * k) / 2, oy = (100 - (y1 - y0) * k) / 2;
  const T = ([x, y]) => [(x - x0) * k + ox, (y - y0) * k + oy];
  mOut.setAttribute('d', 'M' + OUTLINE.map((p) => T(p).map((v) => v.toFixed(1)).join(' ')).join('L') + 'Z');
  const segD = (n) => { const s = T(ROUTE_START); let d = `M${s[0].toFixed(1)} ${s[1].toFixed(1)}`; ROUTE_SEGS.slice(0, n).forEach((g) => { const q = [T([g[0], g[1]]), T([g[2], g[3]]), T([g[4], g[5]])]; d += 'C' + q.map((a) => a.map((v) => v.toFixed(1)).join(' ')).join(' '); }); return d; };
  mRoute.setAttribute('d', segD(ROUTE_SEGS.length)); mDone.setAttribute('d', segD(ROUTE_SEGS.length));
  const len = mRoute.getTotalLength();
  // كل نقطة توقف: أي جزء من الطريق (0..1) تطابق. النقطة i هي نهاية القطعة i-1
  const probe = document.createElementNS(NS, 'path');
  const marks = STOPS.map((st, i) => { if (i === 0) return { ...st, frac: 0 }; probe.setAttribute('d', segD(i)); return { ...st, frac: probe.getTotalLength() / len }; });
  $('[data-kmtotal]').textContent = TOTAL_KM.toLocaleString('fr-FR');

  let prevX = 0, lastName = '';
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  return function update({ prog, enter, hand = 0, time }) {
    // المسافة: تتباطأ في الآخر باش الكاميو يوقف بلطف عند اللافتة
    const e = Math.max(0, (prog - 0.9) / 0.1);
    const X = prog < 0.9 ? prog : 0.9 + 0.1 * (1 - (1 - e) * (1 - e));
    const px = X * 16000, speed = Math.abs(X - prevX) * 400; prevX = X;
    far.style.webkitMaskPosition = far.style.maskPosition = `${(px * 0.12).toFixed(1)}px 100%`;
    mid.style.webkitMaskPosition = mid.style.maskPosition = `${(px * 0.45).toFixed(1)}px 100%`;
    dash.style.backgroundPositionX = `${(px * 1.0).toFixed(1)}px`;
    // الألوان: من الشمال الأخضر للصحرا الذهبية
    const t = smooth(Math.min(1, prog * 1.6));
    root.style.setProperty('--hill', mix('#7f8a58', '#c9a46b', t));
    root.style.setProperty('--ground', mix('#b3ad76', '#dcc088', t));
    root.style.setProperty('--sky1', mix('#d6e3df', '#f0dfb8', t));
    root.style.setProperty('--sky2', mix('#f2ead2', '#f7e7c2', t));
    // الكاميو: يدخل من اليمين، يهتز بخفة وهو يمشي، والعجلات تدور
    wheels.forEach((w) => { w.style.transform = `rotate(${(px * 0.9).toFixed(1)}deg)`; });
    // الكاميو يدخل من اليمين ويهتز بخفة. الورشة تتخلى وراه والدار تجي قدامو
    const sc = (truck.clientWidth || 600) / 650, K = 9000;
    const bob = Math.sin(time * 22) * Math.min(1.6, speed * 40);
    gTruck.style.transform = `translate(${(((1 - enter) * innerWidth * 1.3) / sc).toFixed(1)}px, ${(bob / sc).toFixed(2)}px)`;
    gWork.style.transform = `translateX(${((X * K) / sc).toFixed(1)}px)`;
    gHome.style.transform = `translateX(${((-(1 - X) * K) / sc).toFixed(1)}px)`;
    // التسليم: الباب يتحل، السرير يخرج للدار، والزبون يسلّم
    const door = clamp01(hand / 0.18), p = clamp01((hand - 0.14) / 0.64), ease = p * p * (3 - 2 * p);
    gDoor.style.transform = `scaleY(${(1 - door * 0.93).toFixed(3)})`;
    gBed.style.transform = `translate(${(ease * 205).toFixed(1)}px, ${(p * p * 20).toFixed(1)}px)`;
    gBed.style.opacity = hand < 0.12 ? 0 : (1 - clamp01((hand - 0.8) / 0.1)).toFixed(2);
    const ok = clamp01((hand - 0.84) / 0.12);
    gOk.style.opacity = ok.toFixed(2); gOk.style.transform = `scale(${(0.5 + 0.5 * ok).toFixed(2)})`;
    gHome.classList.toggle('done', hand > 0.84);
    // الخريطة الصغيرة
    const pt = mRoute.getPointAtLength(prog * len);
    mDot.setAttribute('cx', pt.x.toFixed(2)); mDot.setAttribute('cy', pt.y.toFixed(2));
    mDone.style.strokeDashoffset = (1 - prog).toFixed(4);
    bar.style.transform = `scaleX(${prog.toFixed(4)})`;
    km.textContent = Math.round(prog * TOTAL_KM).toLocaleString('fr-FR');
    let name = marks[0].name;
    marks.forEach((m) => { if (m.name && prog > 0.001 && prog >= m.frac - 0.002) name = m.name; });
    if (name !== lastName) { lastName = name; stopEl.textContent = name; }
  };
}
