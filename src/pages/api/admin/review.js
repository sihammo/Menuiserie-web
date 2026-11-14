export const prerender = false;
import { deleteReview } from '../../../lib/store.js';
export async function POST({ request, redirect }) {
  const f = await request.formData();
  deleteReview(String(f.get('id') || ''));
  return redirect('/admin/reviews', 303);
}
