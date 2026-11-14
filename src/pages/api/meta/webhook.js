export const prerender = false;
import { getMeta, addMessage, listMessages } from '../../../lib/store.js';
import { verifySignature, sendText, fetchName } from '../../../lib/meta.js';

// ميتا تتحقق من الـ webhook (GET)
export function GET({ url }) {
  const m = getMeta();
  if (url.searchParams.get('hub.mode') === 'subscribe' && url.searchParams.get('hub.verify_token') === m.verifyToken) {
    return new Response(url.searchParams.get('hub.challenge') || '', { status: 200 });
  }
  return new Response('Forbidden', { status: 403 });
}

// ورسائل الزبائن تجي هنا (POST)
export async function POST({ request }) {
  const raw = await request.text();
  const m = getMeta();
  if (!verifySignature(raw, request.headers.get('x-hub-signature-256'), m.appSecret)) return new Response('Forbidden', { status: 403 });
  let body; try { body = JSON.parse(raw); } catch { return new Response('Bad request', { status: 400 }); }
  if (body.object !== 'page') return new Response('ok');
  for (const entry of body.entry || []) {
    for (const ev of entry.messaging || []) {
      const psid = ev.sender?.id;
      if (!psid || !ev.message || ev.message.is_echo) continue;
      const known = listMessages().find((x) => x.psid === psid);
      const name = known?.name || (await fetchName(psid));
      const text = ev.message.text || (ev.message.attachments?.length ? '[مرفق: صورة أو ملف]' : '');
      const added = addMessage({ id: ev.message.mid, psid, name, dir: 'in', text });
      if (added && !known && m.autoReply && m.autoReplyText) {
        const r = await sendText(psid, m.autoReplyText);
        if (r.ok) addMessage({ psid, name, dir: 'out', text: m.autoReplyText, handled: true, auto: true });
      }
    }
  }
  return new Response('ok'); // لازم 200 بسرعة وإلا ميتا تعاود ترسل
}
