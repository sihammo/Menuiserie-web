export const prerender = false;
import { validateOrder } from '../../lib/orders.js';
import { addOrder, rateLimit } from '../../lib/store.js';

const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });

export async function POST({ request, clientAddress }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'طلب غير صالح' }, 400); }
  if (body.website) return json({ ok: true, id: 'CMN-XXXXXX' }); // honeypot: بوت
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || clientAddress || 'x';
  if (!rateLimit(ip)) return json({ error: 'بزاف طلبات في وقت قصير، عاود بعد شوية أو اتصل بينا' }, 429);
  const v = validateOrder(body);
  if (!v.ok) return json({ error: v.error }, 400);
  const order = addOrder(v.data);
  return json({ ok: true, id: order.id });
}
