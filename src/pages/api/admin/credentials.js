export const prerender = false;
import { checkAdmin, setAdmin, adminUser, makeSession } from '../../../lib/store.js';

export async function POST({ request, cookies, redirect }) {
  const f = await request.formData();
  const nu = String(f.get('user') || '').trim(), np = String(f.get('pass') || ''), cur = String(f.get('current') || '');
  if (!checkAdmin(adminUser(), cur)) return redirect('/admin?c=bad#compte', 303);
  if (nu.length < 3 || np.length < 4) return redirect('/admin?c=short#compte', 303);
  setAdmin(nu, np);
  cookies.set('adm', makeSession(nu), { httpOnly: true, sameSite: 'strict', path: '/', maxAge: 60 * 60 * 12 });
  return redirect('/admin?c=ok#compte', 303);
}
