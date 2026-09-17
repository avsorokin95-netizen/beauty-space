import type { Env } from './env';
import type { VisitReport } from '../shared/analytics';

export const visitsQuery = `query Visits($account: string!, $site: string!, $start: Time!, $end: Time!) {
  viewer { accounts(filter: {accountTag: $account}) {
    rumPageloadEventsAdaptiveGroups(limit: 100, orderBy: [date_DESC],
      filter: {siteTag: $site, bot: 0, datetime_geq: $start, datetime_lt: $end}) {
      count sum { visits } avg { sampleInterval } dimensions { date }
    }
  } }
}`;

export function visitRange(days: number, now = new Date()) {
  if (![7, 30, 90].includes(days)) throw new Error('Invalid analytics period');
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - days + 1);
  start.setUTCHours(0, 0, 0, 0);
  return { rangeStart: start.toISOString(), rangeEnd: now.toISOString() };
}

const validCount = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const validSample = (value: unknown) => value === null || (validCount(value) && value >= 1);

export async function fetchVisits(token: string, account: string, site: string, days: number, now = new Date()): Promise<VisitReport> {
  const range = visitRange(days, now);
  const response = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST', signal: AbortSignal.timeout(8000),
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: visitsQuery, variables: { account, site, start: range.rangeStart, end: range.rangeEnd } }),
  });
  if (!response.ok) throw new Error('Analytics unavailable');
  const data = await response.json() as { errors?: unknown[]; data?: { viewer?: { accounts?: { rumPageloadEventsAdaptiveGroups?: { count: number; sum: { visits: number }; avg?: { sampleInterval?: number | null }; dimensions: { date: string } }[] }[] } } };
  const groups = data.data?.viewer?.accounts?.[0]?.rumPageloadEventsAdaptiveGroups;
  if (data.errors?.length || !Array.isArray(groups) || groups.length >= 100) throw new Error('Invalid analytics response');
  const seen = new Set<string>();
  const rows = groups.map((group) => {
    const day = group?.dimensions?.date;
    const sampleInterval = group?.avg?.sampleInterval ?? null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day < range.rangeStart.slice(0, 10) || day > range.rangeEnd.slice(0, 10) ||
      seen.has(day) || !validCount(group.count) || !validCount(group.sum?.visits) || !validSample(sampleInterval)) throw new Error('Invalid analytics row');
    seen.add(day);
    // Cloudflare already scales sampled counts. Never multiply or divide by sampleInterval.
    return { day, pageViews: group.count, visits: group.sum.visits, sampleInterval };
  });
  return { status: 'ready', updatedAt: range.rangeEnd, ...range, rows };
}

type CacheEntry = { account: string; site: string; report: VisitReport };
type VisitsCache = { version: 2; reports: Record<string, CacheEntry> };
const emptyCache = '{"version":2,"reports":{}}';

function validSnapshot(report: VisitReport | undefined, rangeStart: string, now: Date): report is VisitReport {
  return !!report && report.status === 'ready' && report.rangeStart === rangeStart &&
    report.updatedAt === report.rangeEnd && Number.isFinite(Date.parse(report.rangeEnd)) &&
    report.rangeEnd >= rangeStart && Date.parse(report.rangeEnd) <= now.getTime() && Array.isArray(report.rows) &&
    report.rows.every((row) => /^\d{4}-\d{2}-\d{2}$/.test(row?.day) && row.day >= rangeStart.slice(0, 10) &&
      row.day <= report.rangeEnd.slice(0, 10) && validCount(row.visits) && validCount(row.pageViews) && validSample(row.sampleInterval));
}

export async function visitReport(env: Env, days: number, now = new Date()): Promise<VisitReport> {
  const range = visitRange(days, now);
  let report: VisitReport | null = null;
  try {
    const cached = await env.DB.prepare('SELECT value FROM analytics_cache WHERE id = 1').first<{ value: string }>();
    const cache: VisitsCache | null = cached ? JSON.parse(cached.value) : null;
    const entry = cache?.version === 2 ? cache.reports?.[days] : undefined;
    if (entry?.account === env.CF_ANALYTICS_ACCOUNT_ID && entry?.site === env.CF_ANALYTICS_SITE_ID && validSnapshot(entry?.report, range.rangeStart, now)) report = entry!.report;
  } catch { /* Ignore legacy, corrupt or unavailable caches; try Cloudflare directly. */ }
  const configured = !!(env.CF_ANALYTICS_API_TOKEN && env.CF_ANALYTICS_ACCOUNT_ID && env.CF_ANALYTICS_SITE_ID);
  if (configured && (!report || now.getTime() - Date.parse(report.updatedAt!) >= 300000)) {
    try {
      report = await fetchVisits(env.CF_ANALYTICS_API_TOKEN!, env.CF_ANALYTICS_ACCOUNT_ID!, env.CF_ANALYTICS_SITE_ID!, days, now);
    } catch {
      if (report) report.status = 'stale';
      return report ?? { status: 'unavailable', updatedAt: null, ...range, rows: [] };
    }
    try {
      const entry: CacheEntry = { account: env.CF_ANALYTICS_ACCOUNT_ID!, site: env.CF_ANALYTICS_SITE_ID!, report };
      // Merge just this period atomically so concurrent 7/30/90-day requests keep each other's snapshots.
      await env.DB.prepare(`INSERT INTO analytics_cache(id, value) VALUES (1, ?)
        ON CONFLICT(id) DO UPDATE SET value = json_set(
          CASE WHEN json_valid(analytics_cache.value) THEN
            CASE WHEN json_extract(analytics_cache.value, '$.version') = 2 THEN analytics_cache.value ELSE '${emptyCache}' END
          ELSE '${emptyCache}' END, ?, json(?))`)
        .bind(JSON.stringify({ version: 2, reports: { [days]: entry } }), `$.reports."${days}"`, JSON.stringify(entry)).run();
    } catch { /* A cache write failure must not hide a successful fresh Cloudflare response. */ }
  }
  if (!report) return { status: 'not_configured', updatedAt: null, ...range, rows: [] };
  if (!configured) report.status = 'not_configured';
  return report;
}
