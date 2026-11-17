import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// 3 سكرولات = 3 مراحل، كل مرحلة 100vh. الحالة 0 = اللوح (قبل ما يبدا السكرول).
// المنطق هنا ما يعرفش واش من صورة: يقرا غير العناصر من Hero.astro.
const STEPS = 3;

export function initHero(section) {
  if (!section) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    section.classList.add('static');
    return;
  }

  const $ = (s) => section.querySelector(s);
  const $$ = (s) => [...section.querySelectorAll(s)];
  const frame = $('.frame');
  const raw = $('.frame .raw');
  const product = $('.frame .product');
  const items = $$('.item');
  const lines = $$('.line');
  const slogan = $('.slogan');
  const van = $('.van');
  const road = $('.road');
  const floor = $('.floor');
  const dots = $$('.dots li');
  const hint = $('.hint');

  gsap.set(frame, { xPercent: -50, yPercent: -50, rotateX: 58, rotateZ: -8, });
  gsap.set(items, { xPercent: -50, yPercent: -50 });

  const mobile = () => innerWidth < 761;
  // مقاس الصورة الرئيسية في الأخير (4:5)
  const cardH = () => (mobile() ? Math.min(innerHeight * 0.44, innerWidth * 0.9 * 1.25) : innerHeight * 0.62);
  const cardW = () => cardH() * 0.8;
  const frameX = () => (mobile() ? 0 : -innerWidth * 0.1); // على الديسكتوب نخليو بلاصة للنص في اليمين

  // بلايص القطع المكملة حول المنتوج
  const slots = (n) => (n === 1 ? [1] : n === 2 ? [-1, 1] : [-1, 1, 0]);
  const pos = slots(items.length);

  const tl = gsap.timeline({
    defaults: { ease: 'power2.inOut', duration: 1 },
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: () => '+=' + innerHeight * STEPS, // 300vh: 100vh لكل سكرول
      pin: true,
      scrub: 0.6,
      snap: { snapTo: 1 / STEPS, duration: { min: 0.35, max: 0.9 }, delay: 0.05, ease: 'power1.inOut', inertia: false },
      invalidateOnRefresh: true,
      onUpdate: (st) => {
        const k = Math.round(st.progress * STEPS);
        dots.forEach((d, i) => d.classList.toggle('on', i === k));
      },
    },
  });
  dots[0]?.classList.add('on');

  const swapLine = (from, to, at) => {
    tl.to(lines[from], { autoAlpha: 0, y: -24, duration: 0.3 }, at)
      .fromTo(lines[to], { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.4 }, at + 0.3);
  };

  // ---------- سكرول 1: اللوح يولي المنتوج ----------
  tl.to(hint, { autoAlpha: 0, duration: 0.2 }, 0)
    .to(frame, {
      width: () => cardW(),
      height: () => cardH(),
      x: () => frameX(),
      rotateX: 0,
      rotateZ: 0,
      borderRadius: 4,
      duration: 1,
    }, 0)
    .to(raw, { opacity: 0, duration: 0.45, ease: 'none' }, 0.4)
    .to(product, { opacity: 1, duration: 0.45, ease: 'none' }, 0.35);
  swapLine(0, 1, 0.35);

  // ---------- سكرول 2: الغرفة تكمل ----------
  tl.to(frame, { scale: 0.82, y: () => -innerHeight * 0.02, duration: 1 }, 1)
    .to(floor, { opacity: 1, duration: 0.6 }, 1.2);
  items.forEach((it, i) => {
    const side = pos[i];
    tl.fromTo(it,
      { autoAlpha: 0, x: () => frameX(), y: () => innerHeight * 0.06, z: -700, rotateY: 0 },
      {
        autoAlpha: 1,
        x: () => frameX() + side * (cardW() * 0.82 * 0.5 + (mobile() ? innerWidth * 0.06 : innerWidth * 0.11)),
        y: () => (side === 0 ? innerHeight * 0.2 : innerHeight * (mobile() ? 0.1 : 0.08)),
        z: side === 0 ? 120 : 0,
        rotateY: -side * 24,
        duration: 0.8,
        ease: 'power3.out',
      }, 1.1 + i * 0.1);
  });
  swapLine(1, 2, 1.3);

  // ---------- سكرول 3: الكاميو + الشعار ----------
  tl.to([frame, ...items], { y: () => -innerHeight * 0.1, opacity: 0.22, duration: 0.7 }, 2)
    .to(lines[2], { autoAlpha: 0, y: -24, duration: 0.3 }, 2)
    .to(road, { opacity: 1, duration: 0.3 }, 2.1)
    .fromTo(van, { x: () => innerWidth * 1.05 }, {
      x: () => (innerWidth - van.offsetWidth) / 2,
      duration: 0.85,
      ease: 'power2.out',
    }, 2.1)
    .fromTo(van, { rotate: 0 }, { rotate: -1.2, duration: 0.12, yoyo: true, repeat: 5, ease: 'sine.inOut' }, 2.15)
    .to(road.firstElementChild, { backgroundPositionX: '-400px', duration: 0.85, ease: 'power2.out' }, 2.1)
    .fromTo(slogan, { autoAlpha: 0, y: 30, scale: 0.96 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, ease: 'power3.out' }, 2.45);

  // من بعد السكرول 3 الـ pin يتحل والصفحة تكمل ديريكت للمنتوجات
}
