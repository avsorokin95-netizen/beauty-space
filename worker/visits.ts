import type { Env } from './env';
import type { VisitReport } from '../shared/analytics';

export const visitsQuery = `query Visits($account: string!, $site: string!, $start: Time!, $end: Time!) {
  viewer { accounts(filter: {accountTag: $account}) {
    rumPageloadEventsAdaptiveGroups(limit: 100, orderBy: [date_DESC],
      filter: {siteTag: $site, bot: 0, datetime_geq: $start, datetime_lt: $end}) {
      count sum { visits } dimensions { date }
    }
  } }
}`;

export async function fetchVisits(token: string, account: string, site: string, now = new Date()): Promise<VisitReport> {
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - 89);
  start.setUTCHours(0, 0, 0, 0);
  const response = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST', signal: AbortSignal.timeout(8000),
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: visitsQuery, variables: { account, site, start: start.toISOString(), end: now.toISOString() } }),
  });
  if (!response.ok) throw new Error('Analytics unavailable');
  const data = await response.json() as { errors?: unknown[]; data?: { viewer?: { accounts?: { rumPageloadEventsAdaptiveGroups?: { count: number; sum: { visits: number }; dimensions: { date: string } }[] }[] } } };
  const groups = data.data?.viewer?.accounts?.[0]?.rumPageloadEventsAdaptiveGroups;
  if (data.errors?.length || !groups || groups.length >= 100) throw new Error('Invalid analytics response');
  const rows = groups.map((group) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(group.dimensions?.date) || !Number.isFinite(group.count) || group.count < 0 || !Number.isFinite(group.sum?.visits) || group.sum.visits < 0) throw new Error('Invalid analytics row');
    return { day: group.dimensions.date, pageViews: group.count, visits: group.sum.visits };
  });
  return { status: 'ready', updatedAt: now.toISOString(), rows };
}

export async function visitReport(env: Env, start: string): Promise<VisitReport> {
  const cached = await env.DB.prepare('SELECT value FROM analytics_cache WHERE id = 1').first<{ value: string }>();
  let report: VisitReport | null = null;
  try { if (cached) report = JSON.parse(cached.value); } catch { /* Fetch a fresh report if the cache is invalid. */ }
  const configured = !!(env.CF_ANALYTICS_API_TOKEN && env.CF_ANALYTICS_ACCOUNT_ID && env.CF_ANALYTICS_SITE_ID);
  if (configured && (!report || Date.now() - Date.parse(report.updatedAt ?? '') >= 300000)) {
    try {
      report = await fetchVisits(env.CF_ANALYTICS_API_TOKEN!, env.CF_ANALYTICS_ACCOUNT_ID!, env.CF_ANALYTICS_SITE_ID!);
      await env.DB.prepare('INSERT INTO analytics_cache(id, value) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET value = excluded.value').bind(JSON.stringify(report)).run();
    } catch {
      if (report) report.status = 'stale';
    }
  }
  if (!report) return { status: configured ? 'unavailable' : 'not_configured', updatedAt: null, rows: [] };
  if (!configured) report.status = 'not_configured';
  return { ...report, rows: report.rows.filter((row) => row.day >= start) };
}
