import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import type { VisitReport } from '../shared/analytics.ts';

test('Cloudflare visits use the selected range, isolate caches and preserve sampling metadata', async () => {
  const bundle = await build({
    stdin: { contents: `import { visitReport } from './worker/visits';
      export default { async fetch(request, env) {
        const url = new URL(request.url);
        if (url.searchParams.has('noToken')) env = { ...env, CF_ANALYTICS_API_TOKEN: '' };
        if (url.searchParams.has('site')) env = { ...env, CF_ANALYTICS_SITE_ID: url.searchParams.get('site') };
        return Response.json(await visitReport(env, Number(url.searchParams.get('days')), new Date(url.searchParams.get('now'))));
      }};`, resolveDir: process.cwd() },
    bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2023',
  });
  const requests: { start: string; end: string; site: string }[] = [];
  let failure = false;
  let sampleInterval: number | null | undefined = 1;
  let invalidRow = false;
  const mf = new Miniflare(convertV4MiniflareOptions({
    modules: true, script: bundle.outputFiles[0].text, compatibilityDate: '2026-09-11', d1Databases: ['DB'],
    bindings: { CF_ANALYTICS_API_TOKEN: 'test-token', CF_ANALYTICS_ACCOUNT_ID: 'account', CF_ANALYTICS_SITE_ID: 'site' },
    outboundService: async (request) => {
      assert.equal(request.url, 'https://api.cloudflare.com/client/v4/graphql');
      assert.equal(request.headers.get('Authorization'), 'Bearer test-token');
      const { query, variables } = await request.json() as { query: string; variables: { start: string; end: string; site: string } };
      requests.push(variables);
      assert.match(query, /avg \{ sampleInterval \}/);
      assert.match(query, /bot: 0/);
      if (failure) return Response.json({ errors: [{ message: 'Unavailable' }] });
      return Response.json({ data: { viewer: { accounts: [{ rumPageloadEventsAdaptiveGroups: [{
        count: invalidRow ? -1 : 23, sum: { visits: 15 }, dimensions: { date: variables.end.slice(0, 10) }, avg: { sampleInterval },
      }] }] } } });
    },
  }));
  try {
    const db = await mf.getD1Database('DB');
    await db.exec(readFileSync('worker/migrations/0003_analytics_cache.sql', 'utf8').replace(/--[^\n]*/g, '').replaceAll('\n', ' '));
    const now = '2026-09-17T12:00:00.000Z';
    const report = async (days: number, at = now, extra = '') => (await mf.dispatchFetch(`https://test.example/?days=${days}&now=${at}${extra}`)).json() as Promise<VisitReport>;
    // A fresh legacy snapshot must never be relabeled as a high-resolution weekly report.
    await db.prepare('INSERT INTO analytics_cache VALUES (1, ?)').bind(JSON.stringify({ status: 'ready', updatedAt: now, rows: [{ day: '2026-09-17', visits: 900, pageViews: 1000 }] })).run();
    const weekly = await report(7);
    assert.equal(weekly.status, 'ready');
    assert.equal(weekly.rangeStart, '2026-09-11T00:00:00.000Z');
    assert.equal(weekly.rangeEnd, now);
    assert.deepEqual(weekly.rows, [{ day: '2026-09-17', visits: 15, pageViews: 23, sampleInterval: 1 }]);
    assert.equal(requests.length, 1, 'Legacy 90-day cache was bypassed');
    assert.deepEqual(await report(7), weekly);
    assert.equal(requests.length, 1, 'Same period shares a five-minute cache');

    sampleInterval = 10;
    const monthly = await report(30);
    assert.equal(requests.at(-1)!.start, '2026-08-19T00:00:00.000Z');
    assert.equal(monthly.rows[0].sampleInterval, 10);
    assert.equal(monthly.rows[0].visits, 15, 'Sampled counts are not multiplied, divided or rounded');
    await report(90);
    assert.equal(requests.at(-1)!.start, '2026-06-20T00:00:00.000Z');
    await report(7);
    assert.equal(requests.length, 3, 'All three periods keep independent cached responses');

    failure = true;
    const stale = await report(7, '2026-09-17T12:06:00.000Z');
    assert.equal(stale.status, 'stale');
    assert.equal(stale.updatedAt, now);
    assert.deepEqual(stale.rows, weekly.rows);
    assert.equal((await report(7, now, '&noToken=1')).status, 'not_configured');
    assert.equal((await report(7, now, '&site=another-site')).status, 'unavailable', 'Never use a different site snapshot');
    const nextDayFailure = await report(7, '2026-09-18T00:01:00.000Z');
    assert.equal(nextDayFailure.status, 'unavailable', 'Yesterday\'s range is not passed off as today\'s');
    assert.equal(nextDayFailure.updatedAt, null);

    failure = false;
    sampleInterval = undefined;
    const unknown = await report(7, '2026-09-18T00:01:00.000Z');
    assert.equal(unknown.rangeStart, '2026-09-12T00:00:00.000Z');
    assert.equal(unknown.rows[0].sampleInterval, null, 'Missing metadata does not mean unsampled');
    await db.prepare('DELETE FROM analytics_cache').run();
    await Promise.all([report(7), report(30), report(90)]);
    const cache = JSON.parse((await db.prepare('SELECT value FROM analytics_cache').first<{ value: string }>())!.value);
    assert.deepEqual(Object.keys(cache.reports).sort(), ['30', '7', '90'], 'Concurrent writes merge without dropping other periods');

    await db.prepare('UPDATE analytics_cache SET value = ?').bind('{broken').run();
    assert.equal((await report(7)).status, 'ready', 'Malformed caches recover from a fresh response');
    const recovered = JSON.parse((await db.prepare('SELECT value FROM analytics_cache').first<{ value: string }>())!.value);
    assert.equal(recovered.version, 2);
    await db.prepare('DELETE FROM analytics_cache').run();
    invalidRow = true;
    assert.equal((await report(7)).status, 'unavailable', 'Invalid API counts never appear as real totals');
    invalidRow = false;
    sampleInterval = 0;
    assert.equal((await report(7)).status, 'unavailable', 'Invalid sample intervals are rejected');
  } finally { await mf.dispose(); }
});
