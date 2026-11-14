import { defineMiddleware } from 'astro:middleware';
import { readSession, trackEvent, visitorHash } from './lib/store.js';
import { classify } from './lib/analytics.js';

// نحميو /admin و /api/admin (إلا تسجيل الدخول)
export const onRequest = defineMiddleware(async (ctx, next) => {
  const p = ctx.url.pathname;
  const protectedPath = (p.startsWith('/admin') || p.startsWith('/api/admin')) && p !== '/admin/login' && p !== '/api/admin/login';
  if (protectedPath && !readSession(ctx.cookies.get('adm')?.value)) {
    return p.startsWith('/api/') ? new Response('Unauthorized', { status: 401 }) : ctx.redirect('/admin/login');
  }
  const res = await next();
  // عداد الزيارات: الصفحة الرئيسية وصفحات المنتوجات فقط (بلا بوتات وبلا الأدمن)
  if (ctx.request.method === 'GET' && res.status === 200 && (p === '/' || p.startsWith('/produits/')) && !ctx.request.headers.get('purpose')) {
    const c = classify(ctx.request, ctx.url);
    if (!c.bot && !readSession(ctx.cookies.get('adm')?.value)) {
      const ip = ctx.request.headers.get('x-forwarded-for')?.split(',')[0].trim() || ctx.clientAddress || '';
      trackEvent({ t: Date.now(), k: 'view', v: visitorHash(ip, ctx.request.headers.get('user-agent') || ''), p: p.slice(0, 100), s: c.source, d: c.device });
    }
  }
  if (p.startsWith('/admin') || p.startsWith('/api/admin') || p.startsWith('/commande')) res.headers.set('Cache-Control', 'no-store');
  return res;
});
