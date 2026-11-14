export const prerender = false;
import fs from 'node:fs';
import path from 'node:path';
import { UPLOAD_DIR } from '../../lib/store.js';

const TYPES = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
export function GET({ params }) {
  const f = params.file || '';
  if (!/^[a-f0-9]{16}\.(jpg|png|webp)$/.test(f)) return new Response('Not found', { status: 404 });
  try {
    const buf = fs.readFileSync(path.join(UPLOAD_DIR, f));
    return new Response(buf, { headers: { 'Content-Type': TYPES[f.split('.')[1]], 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' } });
  } catch { return new Response('Not found', { status: 404 }); }
}
