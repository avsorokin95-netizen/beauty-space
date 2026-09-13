import { authenticate } from './auth';
import type { Env } from './env';
import { HttpError, invalid, mediaName, readDocument, saveDocument, type Kind } from './store';
import { boundedBody, validWebp } from './upload';
import { renderSeo } from '../shared/render-seo';
import type { ContactDocument } from '../shared/contacts';
import type { PriceDocument } from '../shared/pricing';
import type { GalleryDocument } from '../shared/gallery';
import { robotsText } from '../shared/robots';

const json = (value: unknown, status = 200) => Response.json(value, { status });
const text = (value: string, type = 'text/html; charset=utf-8', status = 200) => new Response(value, { status, headers: { 'Content-Type': type } });

async function handle(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const get = request.method === 'GET' || request.method === 'HEAD';
  const origin = env.APP_ORIGIN ? new URL(env.APP_ORIGIN).origin : undefined;
  if (get && origin && url.origin !== origin && !path.startsWith('/api/')) {
    return Response.redirect(`${origin}${path}${url.search}`, 301);
  }
  if (path.startsWith('/api/') && !get && request.headers.get('Origin') !== (origin ?? url.origin)) throw new HttpError(403, 'Запит з іншого сайту відхилено.');
  if (path === '/api/auth/config' && get) return json({ mode: 'access' });
  for (const kind of ['prices', 'contacts', 'gallery'] as const) {
    if (path === `/api/${kind}` && get) return json(await readDocument(env.DB, kind));
  }
  if (path.startsWith('/api/media/') && get) {
    const name = path.slice('/api/media/'.length);
    if (!mediaName.test(name)) throw new HttpError(404, 'Фото не знайдено.');
    const object = await env.MEDIA.get(name);
    if (!object) throw new HttpError(404, 'Фото не знайдено.');
    return new Response(object.body, { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=31536000, immutable', ETag: object.httpEtag } });
  }
  const adminPage = path === '/admin' || path.startsWith('/admin/');
  if (adminPage || path === '/api/admin' || path.startsWith('/api/admin/')) {
    const user = await authenticate(request, env);
    if (!user) throw new HttpError(401, 'Увійди через Cloudflare Access, щоб керувати студією.');
    if (path === '/api/admin/session' && get) return json({ authenticated: true, mode: 'access', email: user.email });
    if (request.method === 'PUT') {
      const kind = path.slice('/api/admin/'.length) as Kind;
      if (['prices', 'contacts', 'gallery'].includes(kind)) {
        if (!request.headers.get('Content-Type')?.startsWith('application/json')) throw invalid();
        const bytes = await boundedBody(request, 32 * 1024);
        let input;
        try { input = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw invalid(); }
        if (!input || typeof input !== 'object' || Array.isArray(input)) throw invalid();
        return json(await saveDocument(env.DB, env.MEDIA, kind, input));
      }
    }
    if (path === '/api/admin/gallery/upload' && request.method === 'POST') {
      if (request.headers.get('Content-Type') !== 'image/webp') throw new HttpError(415, 'Завантаж оптимізоване фото WebP через адмінку.');
      const bytes = await boundedBody(request, 8 * 1024 * 1024);
      if (!validWebp(bytes)) throw new HttpError(415, 'Не вдалося прочитати фото. Обери інше зображення.');
      const name = `${crypto.randomUUID()}.webp`;
      await env.MEDIA.put(name, bytes, { httpMetadata: { contentType: 'image/webp' } });
      return json({ src: `/api/media/${name}` }, 201);
    }
    if ((path === '/admin' || path === '/admin/') && get) {
      const template = await env.ASSETS.fetch(new Request(new URL('/index.html', url)));
      return text((await template.text()).replace(/<title>[\s\S]*?<\/title>/, '<title>Керування студією — Beauty Space Victoriya</title>').replace('</head>', '<meta name="robots" content="noindex, nofollow, noarchive"></head>'));
    }
  }
  if (path.startsWith('/api/')) throw new HttpError(404, 'Сторінку не знайдено.');
  if (!get) throw new HttpError(405, 'Метод не підтримується.');
  if (path === '/index.html') return Response.redirect(`${url.origin}/`, 301);
  if (path === '/robots.txt') return text(robotsText(origin), 'text/plain; charset=utf-8');
  if (path === '/sitemap.xml') {
    if (!origin) throw new HttpError(404, 'Домен ще не налаштовано.');
    return text(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${origin.replaceAll('&', '&amp;')}/</loc></url></urlset>`, 'application/xml');
  }
  if (path === '/') {
    const [template, contacts, prices, gallery] = await Promise.all([
      env.ASSETS.fetch(new Request(new URL('/index.html', url))).then((res) => res.text()),
      readDocument(env.DB, 'contacts'), readDocument(env.DB, 'prices'), readDocument(env.DB, 'gallery'),
    ]);
    return text(renderSeo(template, contacts as unknown as ContactDocument, prices.prices as PriceDocument['prices'], origin, {
      prices: prices as unknown as PriceDocument, gallery: gallery as unknown as GalleryDocument,
    }));
  }
  return env.ASSETS.fetch(request);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    let response: Response;
    try { response = await handle(request, env); }
    catch (error) { response = json({ message: error instanceof HttpError ? error.message : 'Не вдалося виконати запит. Спробуй ще раз.' }, error instanceof HttpError ? error.status : 500); }
    response = new Response(request.method === 'HEAD' ? null : response.body, response);
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    const path = new URL(request.url).pathname;
    if (path.startsWith('/api/') || path.startsWith('/admin')) {
      if (!path.startsWith('/api/media/')) response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
      if (!path.startsWith('/api/media/')) response.headers.set('Cache-Control', 'no-store');
    } else if (path === '/') {
      response.headers.set('Cache-Control', 'no-cache');
      if (!env.APP_ORIGIN) response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    }
    return response;
  },
};
