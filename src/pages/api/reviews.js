export const prerender = false;
import { addReview, getProduct, rateLimit } from '../../lib/store.js';

const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });
const clean = (v, n) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);

export async function POST({ request, clientAddress }) {
  let b; try { b = await request.json(); } catch { return json({ error: 'طلب غير صالح' }, 400); }
  if (b.website) return json({ ok: true });
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || clientAddress || 'x';
  if (!rateLimit('rev:' + ip, 3, 30 * 60 * 1000)) return json({ error: 'بزاف تعليقات في وقت قصير، عاود بعد شوية' }, 429);
  const name = clean(b.name, 40), text = clean(b.text, 400), stars = Math.round(+b.stars);
  if (!getProduct(clean(b.slug, 60))) return json({ error: 'المنتوج غير موجود' }, 400);
  if (name.length < 2) return json({ error: 'اكتب اسمك' }, 400);
  if (!(stars >= 1 && stars <= 5)) return json({ error: 'اختار عدد النجوم' }, 400);
  if (text.length < 3) return json({ error: 'اكتب تعليقك' }, 400);
  addReview({ slug: clean(b.slug, 60), name, stars, text });
  return json({ ok: true });
}
