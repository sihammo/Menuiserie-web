// تصنيف الزيارة: المصدر والجهاز والبوتات
export function classify(request, url) {
  const ua = request.headers.get('user-agent') || '';
  const bot = !ua || /bot|crawl|spider|slurp|facebookexternalhit|facebot|preview|headless|lighthouse|monitor|curl|wget|python|go-http/i.test(ua);
  const device = /Mobi|Android|iPhone|iPad/i.test(ua) ? 'mobile' : 'desktop';
  let source = 'direct';
  const utm = url.searchParams.get('utm_source') || url.searchParams.get('fbclid') && 'facebook';
  const ref = request.headers.get('referer') || '';
  let host = ''; try { host = ref ? new URL(ref).hostname.replace(/^www\./, '') : ''; } catch { /* */ }
  if (utm) source = String(utm).toLowerCase().slice(0, 30);
  else if (/facebook\.com|fb\.com|l\.messenger|m\.me/.test(host) || /FBAN|FBAV|FB_IAB/.test(ua)) source = 'facebook';
  else if (/instagram\.com/.test(host) || /Instagram/.test(ua)) source = 'instagram';
  else if (/google\./.test(host)) source = 'google';
  else if (/t\.co|twitter|x\.com/.test(host)) source = 'x';
  else if (/tiktok/.test(host) || /musical_ly|TikTok/.test(ua)) source = 'tiktok';
  else if (/whatsapp|wa\.me/.test(host)) source = 'whatsapp';
  else if (host && host !== url.hostname) source = host;
  return { bot, device, source };
}
export const SOURCE_LABELS = { direct: 'مباشر / غير معروف', facebook: 'فيسبوك', instagram: 'انستغرام', google: 'جوجل', tiktok: 'تيك توك', whatsapp: 'واتساب', x: 'X / تويتر' };
