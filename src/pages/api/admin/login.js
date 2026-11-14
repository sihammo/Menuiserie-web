export const prerender = false;
import { checkAdmin, makeSession, rateLimit } from '../../../lib/store.js';

export async function POST({ request, cookies, redirect, clientAddress }) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || clientAddress || 'x';
  if (!rateLimit('login:' + ip, 8, 10 * 60 * 1000)) return redirect('/admin/login?e=2', 303);
  const f = await request.formData();
  if (!checkAdmin(String(f.get('user') || ''), String(f.get('pass') || ''))) return redirect('/admin/login?e=1', 303);
  cookies.set('adm', makeSession(String(f.get('user'))), { httpOnly: true, sameSite: 'strict', path: '/', maxAge: 60 * 60 * 12, secure: new URL(request.url).protocol === 'https:' });
  return redirect('/admin', 303);
}
