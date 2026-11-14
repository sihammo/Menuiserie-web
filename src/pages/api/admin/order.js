export const prerender = false;
import { STATUSES, updateOrder, deleteOrder } from '../../../lib/store.js';

export async function POST({ request, redirect }) {
  const f = await request.formData();
  const id = String(f.get('id') || ''), action = String(f.get('action') || '');
  if (action === 'delete') deleteOrder(id);
  else if (action === 'status' && STATUSES[String(f.get('status'))]) updateOrder(id, { status: String(f.get('status')) });
  const back = String(f.get('back') || '/admin');
  return redirect(back.startsWith('/admin') ? back : '/admin', 303);
}
