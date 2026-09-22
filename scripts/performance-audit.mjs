import { createServer } from 'node:http';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
import { chromium } from '@playwright/test';
import { renderSeo } from '../shared/render-seo.ts';
import { studio } from '../src/data/studio.ts';
import { prices } from '../src/data/prices.ts';
import { initialGallery } from '../src/data/gallery.ts';

// A repeatable local lab probe with public seed data, not a production CWV score.
// Run after npm run build. --assets can point to a captured SSR build for comparison.
const options = Object.fromEntries(process.argv.slice(2).map((arg) => arg.replace(/^--/, '').split('=')));
const assets = resolve(options.assets || 'dist');
const runs = Number(options.runs || 3);
if (!Number.isInteger(runs) || runs < 1 || runs > 10) throw new Error('Use --runs=1..10');
const snapshot = {
  contacts: { revision: 1, updatedAt: '2026-09-22T00:00:00Z', contacts: studio },
  prices: { revision: 1, updatedAt: '2026-09-22T00:00:00Z', prices },
  gallery: { revision: 1, updatedAt: '2026-09-22T00:00:00Z', items: initialGallery },
};
let html = readFileSync(resolve(assets, 'index.html'), 'utf8');
if (html.includes('<div id="root"></div>')) {
  const { renderPublicApp } = await import('../.server/render-public.mjs');
  html = renderSeo(html, snapshot.contacts, prices, 'http://127.0.0.1', snapshot, renderPublicApp(snapshot));
}
const mimeTypes = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = createServer((request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  let body;
  let type;
  if (path === '/') { body = Buffer.from(html); type = 'text/html'; }
  else if (['/api/prices', '/api/contacts', '/api/gallery'].includes(path)) {
    body = Buffer.from(JSON.stringify(snapshot[path.slice(5)])); type = 'application/json';
  } else {
    const file = resolve(assets, '.' + path);
    if (!file.startsWith(assets + sep)) { response.writeHead(404).end(); return; }
    try { body = readFileSync(file); type = mimeTypes[extname(file)] || 'application/octet-stream'; }
    catch { response.writeHead(404).end(); return; }
  }
  const headers = { 'Content-Type': type, 'Cache-Control': 'no-store' };
  if (request.headers['accept-encoding']?.includes('gzip') && /^(text\/|application\/json)/.test(type)) {
    body = gzipSync(body); headers['Content-Encoding'] = 'gzip';
  }
  headers['Content-Length'] = body.length;
  response.writeHead(200, headers).end(body);
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const results = [];
try {
  browser = await chromium.launch();
  for (let run = 0; run < runs; run++) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const errors = [];
    const fontRequests = [];
    const fontResponses = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => { if (request.resourceType() === 'font') fontRequests.push(request.url()); });
    page.on('response', (response) => { if (response.request().resourceType() === 'font') fontResponses.push({ url: response.url(), status: response.status(), contentLength: response.headers()['content-length'] }); });
    // The map is outside the initial viewport. Exclude third-party map/analytics noise.
    await page.route('https://maps.google.com/**', (route) => route.abort());
    const session = await context.newCDPSession(page);
    await session.send('Network.enable');
    await session.send('Network.setCacheDisabled', { cacheDisabled: true });
    await session.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1_600_000 / 8, uploadThroughput: 750_000 / 8, connectionType: 'cellular4g' });
    await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.addInitScript(() => {
      window.__lab = { lcp: 0, cls: 0, longTaskMs: 0 };
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__lab.lcp = entry.startTime;
          window.__lab.lcpElement = { tag: entry.element?.tagName, text: entry.element?.textContent?.slice(0, 120), url: entry.url };
        }
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((list) => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__lab.cls += entry.value; }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver((list) => { for (const entry of list.getEntries()) window.__lab.longTaskMs += entry.duration; }).observe({ type: 'longtask', buffered: true });
    });
    await page.goto(origin, { waitUntil: 'load', timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1000);
    const result = await page.evaluate(() => ({
      ...window.__lab,
      fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null,
      resources: performance.getEntriesByType('resource').map((entry) => ({ url: entry.name, type: entry.initiatorType, encodedBytes: entry.encodedBodySize })),
      fonts: [...document.fonts].filter((font) => font.status === 'loaded').map((font) => ({ family: font.family, style: font.style, weight: font.weight })),
    }));
    result.errors = errors;
    result.fontRequests = fontRequests;
    result.fontResponses = fontResponses;
    results.push(result);
    console.log(JSON.stringify({ run: run + 1, fcp: result.fcp, lcp: result.lcp, lcpElement: result.lcpElement, cls: result.cls, longTaskMs: result.longTaskMs, loadedFaces: result.fonts.length, fontRequests, errors }));
    await context.close();
  }
  const median = (key) => results.map((result) => result[key]).sort((a, b) => a - b)[Math.floor(results.length / 2)];
  const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map((match) => {
    const file = readFileSync(resolve(assets, '.' + match[1]));
    return { path: match[1], rawBytes: file.length, gzipBytes: gzipSync(file).length };
  });
  const report = {
    label: options.label || 'current',
    environment: { browser: browser.version(), viewport: '390x844 DPR3', cpuSlowdown: 4, latencyMs: 150, downloadMbps: 1.6, server: 'localhost with gzip and public seed snapshot', cache: 'cold context per run', note: 'Lab load measurements; not field Core Web Vitals or INP. External font network latency can vary.' },
    scripts, median: { fcp: median('fcp'), lcp: median('lcp'), cls: median('cls'), longTaskMs: median('longTaskMs') }, runs: results,
  };
  if (options.output) writeFileSync(options.output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ scripts: report.scripts, median: report.median }, null, 2));
} finally {
  await browser?.close();
  await new Promise((done) => server.close(done));
}
