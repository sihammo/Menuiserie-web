import { getProduct } from './store.js';
import { WILAYAS } from '../scripts/build-sequence/wilayas.js';

export const wilayaList = [...WILAYAS].sort((a, b) => a[0] - b[0]).map(([code, name]) => ({ code, name }));
export const wilayaName = (code) => wilayaList.find((w) => w.code === +code)?.name || '';
export const productBySlug = (slug) => getProduct(slug);

const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);

// يرجع { ok:true, data } أو { ok:false, error }
export function validateOrder(b) {
  const data = {
    firstName: clean(b.firstName, 40),
    lastName: clean(b.lastName, 40),
    phone: clean(b.phone, 20).replace(/[\s.\-]/g, '').replace(/^(\+213|00213)/, '0'),
    wilaya: +b.wilaya,
    address: clean(b.address, 200),
    product: clean(b.product, 60),
    qty: Math.min(20, Math.max(1, parseInt(b.qty, 10) || 1)),
    note: clean(b.note, 300),
  };
  if (data.firstName.length < 2) return { ok: false, error: 'اكتب الاسم' };
  if (data.lastName.length < 2) return { ok: false, error: 'اكتب اللقب' };
  if (!/^0[567]\d{8}$|^0\d{8}$/.test(data.phone)) return { ok: false, error: 'رقم الهاتف غير صحيح (مثال: 0698074263)' };
  if (!wilayaName(data.wilaya)) return { ok: false, error: 'اختار الولاية' };
  if (data.address.length < 5) return { ok: false, error: 'اكتب العنوان (البلدية والحي)' };
  const p = productBySlug(data.product);
  if (!p) return { ok: false, error: 'المنتوج غير موجود' };
  if (p.available === false) return { ok: false, error: 'هذا المنتوج غير متوفر حاليا، اتصل بينا' };
  data.productName = p.name;
  return { ok: true, data };
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// ملف الطلب اللي يحملو الزبون (HTML نظيف تنجم تطبعو أو تحفظو PDF)
export function orderFileHtml(o) {
  const rows = [
    ['رقم الطلب', o.id], ['التاريخ', new Date(o.createdAt).toLocaleString('fr-DZ')], ['المنتوج', o.productName], ['الكمية', o.qty],
    ['الاسم', `${o.firstName} ${o.lastName}`], ['الهاتف', o.phone], ['الولاية', wilayaName(o.wilaya)], ['العنوان', o.address], ['ملاحظة', o.note || '—'],
  ];
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>طلب ${esc(o.id)}</title>
<style>body{font-family:Tahoma,Arial,sans-serif;max-width:620px;margin:2rem auto;padding:0 1rem;color:#222;line-height:1.7}
h1{font-size:1.4rem;border-bottom:3px solid #6E3B1C;padding-bottom:.4rem}table{width:100%;border-collapse:collapse}
td{padding:.55rem .6rem;border-bottom:1px solid #ddd}td:first-child{width:30%;color:#6E3B1C;font-weight:bold}.f{margin-top:2rem;font-size:.9rem;color:#555}</style></head><body>
<h1>Chemami Meuble Nadhir — طلب شراء</h1><table>${rows.map(([k, v]) => `<tr><td>${k}</td><td>${esc(v)}</td></tr>`).join('')}</table>
<p class="f">عين البيضة، أم البواقي · 0698 07 42 63<br>سنتصلو بيك لتأكيد الطلب والتوصيل. الثمن يتأكد معاك في المكالمة.</p></body></html>`;
}
