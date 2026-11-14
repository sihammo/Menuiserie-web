// تخزين بسيط بملفات JSON في مجلد data/ (الطلبات، حساب الأدمن، سر الجلسات).
// يخدم على سيرفر Node (VPS مثلا). ما يخدمش على استضافة ثابتة أو serverless.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import seedProducts from '../data/products.json';

const DIR = path.resolve(process.env.DATA_DIR || './data');
fs.mkdirSync(DIR, { recursive: true });
const F = (n) => path.join(DIR, n);

function readJSON(name, fallback) {
  try { return JSON.parse(fs.readFileSync(F(name), 'utf8')); } catch { return fallback; }
}
function writeJSON(name, data) {
  const tmp = F(name + '.tmp');
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, F(name)); // كتابة ذرية، باش الملف ما يتخربش
}

// ---------- الطلبات ----------
export const STATUSES = { new: 'جديد', confirmed: 'مؤكد', delivered: 'تسلّم', canceled: 'ملغى' };
export const listOrders = () => readJSON('orders.json', []);
export const getOrder = (id) => listOrders().find((o) => o.id === id) || null;
export function addOrder(o) {
  const all = listOrders();
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id;
  do { id = 'CMN-' + [...crypto.randomBytes(6)].map((b) => alphabet[b % alphabet.length]).join(''); } while (all.some((x) => x.id === id));
  const order = { id, createdAt: new Date().toISOString(), status: 'new', ...o };
  all.unshift(order);
  writeJSON('orders.json', all);
  return order;
}
export function updateOrder(id, patch) {
  const all = listOrders(); const o = all.find((x) => x.id === id);
  if (!o) return false;
  Object.assign(o, patch); writeJSON('orders.json', all); return true;
}
export function deleteOrder(id) {
  const all = listOrders(); const next = all.filter((x) => x.id !== id);
  writeJSON('orders.json', next); return next.length !== all.length;
}

// ---------- حساب الأدمن (افتراضي: admin / admin) ----------
const hash = (pw, salt) => crypto.scryptSync(pw, salt, 32).toString('hex');
export function setAdmin(user, pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  writeJSON('admin.json', { user, salt, hash: hash(pw, salt) });
}
export function checkAdmin(user, pw) {
  let a = readJSON('admin.json', null);
  if (!a) { setAdmin('admin', 'admin'); a = readJSON('admin.json', null); }
  const ok = a.user === user && crypto.timingSafeEqual(Buffer.from(hash(String(pw), a.salt), 'hex'), Buffer.from(a.hash, 'hex'));
  return ok;
}
export const adminUser = () => (readJSON('admin.json', null) || { user: 'admin' }).user;

// ---------- الجلسات (كوكي موقّع) ----------
function secret() {
  try { return fs.readFileSync(F('secret.txt'), 'utf8'); } catch {
    const s = crypto.randomBytes(32).toString('hex'); fs.writeFileSync(F('secret.txt'), s, { mode: 0o600 }); return s;
  }
}
const sign = (v) => crypto.createHmac('sha256', secret()).update(v).digest('hex');
export function makeSession(user) {
  const exp = Date.now() + 1000 * 60 * 60 * 12;
  const v = `${Buffer.from(user).toString('base64url')}.${exp}`;
  return `${v}.${sign(v)}`;
}
export function readSession(token) {
  if (!token) return null;
  const [u, exp, sig] = token.split('.');
  if (!u || !exp || !sig) return null;
  const v = `${u}.${exp}`;
  const good = sign(v);
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
  if (Date.now() > +exp) return null;
  const user = Buffer.from(u, 'base64url').toString();
  return user === adminUser() ? user : null;
}

// ---------- حد بسيط للطلبات من نفس الـIP ----------
const hits = new Map();
export function rateLimit(key, max = 5, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) { hits.set(key, arr); return false; }
  arr.push(now); hits.set(key, arr); return true;
}

// ---------- المنتوجات (تتبدل من الأدمن، والملف الأصلي src/data/products.json هو البداية فقط) ----------
export const listProducts = () => {
  const p = readJSON('products.json', null);
  if (p) return p;
  const seeded = seedProducts.map((x) => ({ available: true, ...x }));
  writeJSON('products.json', seeded);
  return seeded;
};
export const getProduct = (slug) => listProducts().find((p) => p.slug === slug) || null;
export function saveProduct(p) {
  const all = listProducts();
  const i = all.findIndex((x) => x.slug === p.slug);
  if (i >= 0) all[i] = { ...all[i], ...p }; else all.push(p);
  writeJSON('products.json', all);
}
export function removeProduct(slug) {
  const all = listProducts(); const next = all.filter((x) => x.slug !== slug);
  writeJSON('products.json', next); return next.length !== all.length;
}
export const newSlug = () => 'p-' + crypto.randomBytes(4).toString('hex');

// ---------- الصور المرفوعة ----------
export const UPLOAD_DIR = path.join(DIR, 'uploads');
export function saveUpload(buf) {
  let ext = null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) ext = 'jpg';
  else if (buf.slice(0, 4).toString('hex') === '89504e47') ext = 'png';
  else if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') ext = 'webp';
  if (!ext) return null;
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const name = crypto.randomBytes(8).toString('hex') + '.' + ext;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
  return '/uploads/' + name;
}

// ---------- التعليقات والنجوم ----------
export const listReviews = (slug) => readJSON('reviews.json', []).filter((r) => !slug || r.slug === slug);
export function addReview(r) {
  const all = readJSON('reviews.json', []);
  const rev = { id: crypto.randomBytes(5).toString('hex'), createdAt: new Date().toISOString(), ...r };
  all.unshift(rev); writeJSON('reviews.json', all); return rev;
}
export function deleteReview(id) {
  const all = readJSON('reviews.json', []); const next = all.filter((r) => r.id !== id);
  writeJSON('reviews.json', next); return next.length !== all.length;
}
export function ratingOf(slug) {
  const rs = listReviews(slug);
  return { n: rs.length, avg: rs.length ? rs.reduce((a, r) => a + r.stars, 0) / rs.length : 0 };
}

// ---------- الإحصائيات الداخلية (بلا جوجل أناليتيك، بلا كوكيز) ----------
// الزائر = هاش يومي من (IP + المتصفح + سر السيرفر)، ما نخزنوش IP.
export const visitorHash = (ip, ua) => crypto.createHash('sha256').update(secret() + new Date().toISOString().slice(0, 10) + ip + ua).digest('hex').slice(0, 12);
export function trackEvent(e) { try { fs.appendFileSync(F('analytics.jsonl'), JSON.stringify(e) + '\n'); } catch { /* ما نوقفوش السيت علاش */ } }
export function readEvents(sinceMs) {
  let raw = ''; try { raw = fs.readFileSync(F('analytics.jsonl'), 'utf8'); } catch { return []; }
  const out = [];
  for (const l of raw.split('\n')) { if (!l) continue; try { const e = JSON.parse(l); if (e.t >= sinceMs) out.push(e); } catch { /* سطر خاسر */ } }
  return out;
}

// ---------- ميتا (ماسنجر) ----------
export const metaDefaults = { pageToken: '', appSecret: '', pageId: '', verifyToken: '', apiVersion: 'v21.0', autoReply: false, autoReplyText: 'السلام عليكم 👋 شكرا على تواصلك مع Chemami Meuble Nadhir. تنجم تطلب مباشرة من السيت، ولا نتصلو بيك بعد شوية.' };
export function getMeta() {
  const m = { ...metaDefaults, ...readJSON('meta.json', {}) };
  if (!m.verifyToken) { m.verifyToken = crypto.randomBytes(12).toString('hex'); writeJSON('meta.json', m); }
  return m;
}
export const saveMeta = (patch) => writeJSON('meta.json', { ...getMeta(), ...patch });
export const listMessages = () => readJSON('messages.json', []);
export function addMessage(m) {
  const all = listMessages();
  if (m.id && all.some((x) => x.id === m.id)) return null; // ميتا تعاود ترسل أحيانا
  const msg = { id: crypto.randomBytes(6).toString('hex'), at: new Date().toISOString(), handled: false, ...m };
  all.push(msg); writeJSON('messages.json', all.slice(-3000)); return msg;
}
export function setThreadHandled(psid, handled) {
  const all = listMessages(); all.forEach((m) => { if (m.psid === psid) m.handled = handled; }); writeJSON('messages.json', all);
}
export function deleteThread(psid) { writeJSON('messages.json', listMessages().filter((m) => m.psid !== psid)); }
export const unhandledCount = () => new Set(listMessages().filter((m) => m.dir === 'in' && !m.handled).map((m) => m.psid)).size;
