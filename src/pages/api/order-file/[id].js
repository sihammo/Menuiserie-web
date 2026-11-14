export const prerender = false;
import { getOrder } from '../../../lib/store.js';
import { orderFileHtml } from '../../../lib/orders.js';

// ملف الطلب للتحميل (الزبون عندو الرقم العشوائي تاع طلبو، والأدمن كذلك)
export function GET({ params }) {
  const o = getOrder(params.id);
  if (!o) return new Response('Not found', { status: 404 });
  return new Response(orderFileHtml(o), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Disposition': `attachment; filename="commande-${o.id}.html"`, 'Cache-Control': 'no-store' },
  });
}
