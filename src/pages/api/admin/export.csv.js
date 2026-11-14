export const prerender = false;
import { listOrders, STATUSES } from '../../../lib/store.js';
import { wilayaName } from '../../../lib/orders.js';

const q = (v) => `"${String(v ?? '').replace(/"/g, '""').replace(/^([=+\-@])/, "'$1")}"`; // حماية من حقن الصيغ في Excel
export function GET() {
  const head = ['الرقم', 'التاريخ', 'الحالة', 'المنتوج', 'الكمية', 'الاسم', 'اللقب', 'الهاتف', 'الولاية', 'العنوان', 'ملاحظة'];
  const rows = listOrders().map((o) => [o.id, o.createdAt, STATUSES[o.status], o.productName, o.qty, o.firstName, o.lastName, o.phone, wilayaName(o.wilaya), o.address, o.note]);
  const csv = '﻿' + [head, ...rows].map((r) => r.map(q).join(',')).join('\r\n');
  return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="commandes.csv"' } });
}
