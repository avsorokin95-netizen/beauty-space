import { linkEvent } from '../../shared/analytics';

// The production Worker opts in only the public homepage. No cookies or IDs.
export function startAnalytics() {
  if (location.pathname !== '/' || !document.querySelector('meta[name="beauty-analytics"]')) return;
  const lastClick = new Map<string, number>();
  document.addEventListener('click', (click) => {
    if (!click.isTrusted || !(click.target instanceof Element)) return;
    const link = click.target.closest('a');
    if (!link) return;
    const event = linkEvent(link.href, link.dataset.analytics === 'booking');
    if (!event) return;
    const now = Date.now();
    if (now - (lastClick.get(event) ?? 0) < 1000) return;
    lastClick.set(event, now);
    // Never delay navigation or let an unavailable collector affect the site.
    void fetch('/api/analytics', {
      method: 'POST', credentials: 'omit', keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event }),
    }).catch(() => {});
  });
}
