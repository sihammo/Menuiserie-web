export const prerender = false;
import { listProducts, saveProduct, removeProduct, newSlug, saveUpload } from '../../../lib/store.js';

const clean = (v, n) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);

export async function POST({ request, redirect }) {
  const f = await request.formData();
  const action = String(f.get('action') || '');
  const slug = clean(f.get('slug'), 60);
  if (action === 'delete') { removeProduct(slug); return redirect('/admin/products?m=deleted', 303); }
  if (action === 'toggle') {
    const p = listProducts().find((x) => x.slug === slug);
    if (p) saveProduct({ ...p, available: p.available === false });
    return redirect('/admin/products', 303);
  }
  if (action === 'save') {
    const name = clean(f.get('name'), 80);
    if (name.length < 2) return redirect('/admin/products?m=name', 303);
    const priceRaw = clean(f.get('price'), 12).replace(/[\s,]/g, '');
    const price = priceRaw && +priceRaw > 0 ? Math.round(+priceRaw) : null;
    const old = listProducts().find((x) => x.slug === slug);
    const link = clean(f.get('imageUrl'), 300);
    let image = /^(https?:\/\/|\/)/.test(link) ? link : old?.image || '/images/lit-coffre.jpg';
    const file = f.get('image');
    if (file && typeof file === 'object' && file.size > 0) {
      if (file.size > 5 * 1024 * 1024) return redirect('/admin/products?m=big', 303);
      const up = saveUpload(Buffer.from(await file.arrayBuffer()));
      if (!up) return redirect('/admin/products?m=img', 303);
      image = up;
    }
    saveProduct({ slug: old ? slug : newSlug(), name, wood: clean(f.get('wood'), 80), desc: clean(f.get('desc'), 300), price, image, available: f.get('available') === 'on' });
    return redirect(`/admin/products?m=${old ? 'saved' : 'added'}`, 303);
  }
  return redirect('/admin/products', 303);
}
