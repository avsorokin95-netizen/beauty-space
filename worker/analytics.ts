import { eventLabels } from '../shared/analytics';
import type { Env } from './env';
import { HttpError } from './store';
import { boundedBody } from './upload';

export function analyticsHtml(html: string, token?: string) {
  if (!token || !/^[a-f0-9]{32}$/.test(token)) return html;
  return html.replace('</head>', '<meta name="beauty-analytics" content="enabled"></head>')
    .replace('</body>', `<script type="module" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"${token}","spa":false}'></script></body>`);
}

export async function collectClick(request: Request, env: Env) {
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) throw new HttpError(415, 'Очікується JSON.');
  let value;
  try { value = JSON.parse(new TextDecoder().decode(await boundedBody(request, 128))); }
  catch (error) { if (error instanceof HttpError) throw error; throw new HttpError(400, 'Некоректна подія.'); }
  if (!value || typeof value.event !== 'string' || !Object.hasOwn(eventLabels, value.event) || Object.keys(value).length !== 1) throw new HttpError(400, 'Некоректна подія.');
  // IP is used transiently for abuse control, never written to the analytics DB.
  if (env.ANALYTICS_LIMITER && !(await env.ANALYTICS_LIMITER.limit({ key: request.headers.get('CF-Connecting-IP') ?? 'unknown' })).success) {
    throw new HttpError(429, 'Забагато запитів.');
  }
  const day = new Date().toISOString().slice(0, 10);
  await env.DB.prepare('INSERT INTO analytics_daily (day, event, count) VALUES (?, ?, 1) ON CONFLICT(day, event) DO UPDATE SET count = count + 1').bind(day, value.event).run();
  return new Response(null, { status: 204 });
}

export async function clickReport(url: URL, env: Env) {
  const days = Number(url.searchParams.get('days') ?? 30);
  if (![7, 30, 90].includes(days)) throw new HttpError(400, 'Обери 7, 30 або 90 днів.');
  const start = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
  const { results } = await env.DB.prepare('SELECT day, event, count FROM analytics_daily WHERE day >= ? ORDER BY day DESC, event').bind(start).all();
  return Response.json({ days, rows: results });
}
