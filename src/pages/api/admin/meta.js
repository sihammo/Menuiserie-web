export const prerender = false;
import { getMeta, saveMeta, addMessage, setThreadHandled, deleteThread, addOrder, listMessages } from '../../../lib/store.js';
import { sendText } from '../../../lib/meta.js';
import { validateOrder } from '../../../lib/orders.js';

export async function POST({ request, redirect }) {
  const f = await request.formData();
  const action = String(f.get('action') || '');
  const psid = String(f.get('psid') || '');
  const to = (q) => redirect('/admin/meta' + q, 303);
  if (action === 'settings') {
    const cur = getMeta();
    const keep = (k) => String(f.get(k) || '').trim() || cur[k]; // الخانة الخاوية تخلي القيمة القديمة
    saveMeta({ pageToken: keep('pageToken'), appSecret: keep('appSecret'), pageId: String(f.get('pageId') || '').trim(), verifyToken: String(f.get('verifyToken') || '').trim() || cur.verifyToken,
      apiVersion: String(f.get('apiVersion') || '').trim() || 'v21.0', autoReply: f.get('autoReply') === 'on', autoReplyText: String(f.get('autoReplyText') || '').slice(0, 600) });
    return to('?m=saved');
  }
  if (action === 'reply') {
    const text = String(f.get('text') || '').trim();
    if (!text) return to('');
    const r = await sendText(psid, text);
    if (!r.ok) return to('?m=err&e=' + encodeURIComponent(r.error));
    addMessage({ psid, name: listMessages().find((x) => x.psid === psid)?.name || '', dir: 'out', text, handled: true });
    return to(`?m=sent#t-${psid}`);
  }
  if (action === 'handled') { setThreadHandled(psid, f.get('value') === '1'); return to(''); }
  if (action === 'delete') { deleteThread(psid); return to(''); }
  if (action === 'order') {
    const [firstName, ...rest] = String(f.get('name') || '').trim().split(/\s+/);
    const v = validateOrder({ firstName, lastName: rest.join(' ') || firstName, phone: f.get('phone'), wilaya: f.get('wilaya'), address: f.get('address'), product: f.get('product'), qty: f.get('qty'), note: f.get('note') });
    if (!v.ok) return to('?m=err&e=' + encodeURIComponent(v.error) + `#t-${psid}`);
    const o = addOrder({ ...v.data, source: 'messenger' });
    setThreadHandled(psid, true);
    return to('?m=order&id=' + o.id);
  }
  return to('');
}
