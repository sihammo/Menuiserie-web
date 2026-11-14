import crypto from 'node:crypto';
import { getMeta } from './store.js';

const api = (path, m) => `https://graph.facebook.com/${m.apiVersion || 'v21.0'}/${path}`;
const timeout = (ms) => AbortSignal.timeout(ms);

// التحقق من توقيع ميتا على الطلب (X-Hub-Signature-256)
export function verifySignature(raw, header, secret) {
  if (!secret || !header?.startsWith('sha256=')) return false;
  const good = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  const got = header.slice(7);
  return got.length === good.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(good));
}

// إرسال رسالة (ماسنجر يسمح بالرد خلال 24 ساعة من آخر رسالة للزبون)
export async function sendText(psid, text) {
  const m = getMeta();
  if (!m.pageToken) return { ok: false, error: 'ما كاينش Page Access Token' };
  try {
    const res = await fetch(api('me/messages', m) + `?access_token=${encodeURIComponent(m.pageToken)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: timeout(8000),
      body: JSON.stringify({ recipient: { id: psid }, messaging_type: 'RESPONSE', message: { text: String(text).slice(0, 1900) } }),
    });
    const d = await res.json().catch(() => ({}));
    return res.ok ? { ok: true } : { ok: false, error: d.error?.message || `HTTP ${res.status}` };
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
}

export async function fetchName(psid) {
  const m = getMeta();
  if (!m.pageToken) return '';
  try {
    const res = await fetch(api(psid, m) + `?fields=first_name,last_name&access_token=${encodeURIComponent(m.pageToken)}`, { signal: timeout(4000) });
    const d = await res.json();
    return [d.first_name, d.last_name].filter(Boolean).join(' ');
  } catch { return ''; }
}

// نلقاو رقم الهاتف الجزائري في نص الرسالة (يقبل أرقام عربية ومسافات)
export function findPhone(text) {
  const t = String(text).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[\s.\-]/g, '').replace(/(\+213|00213)/g, '0');
  return (t.match(/0[567]\d{8}/) || [''])[0];
}
