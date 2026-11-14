export const prerender = false;
import { trackEvent, visitorHash, readSession, rateLimit } from '../../lib/store.js';
import { classify } from '../../lib/analytics.js';

const KINDS = new Set(['story', 'wa', 'call']);
export async function POST({ request, cookies, clientAddress, url }) {
  try {
    const b = JSON.parse(await request.text());
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || clientAddress || '';
    if (!KINDS.has(b.k) || classify(request, url).bot || readSession(cookies.get('adm')?.value) || !rateLimit('trk:' + ip, 60, 60 * 1000)) return new Response(null, { status: 204 });
    trackEvent({ t: Date.now(), k: b.k, v: visitorHash(ip, request.headers.get('user-agent') || ''), p: String(b.p || '').slice(0, 100) });
  } catch { /* */ }
  return new Response(null, { status: 204 });
}
