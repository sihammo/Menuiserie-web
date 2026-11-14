export const prerender = false;
export function POST({ cookies, redirect }) { cookies.delete('adm', { path: '/' }); return redirect('/admin/login', 303); }
