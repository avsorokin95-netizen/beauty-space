export const eventLabels = {
  booking: 'Записатися',
  phone: 'Телефон',
  instagram: 'Instagram',
  telegram: 'Telegram',
  directions: 'Маршрут',
} as const;

export type AnalyticsEvent = keyof typeof eventLabels;
export type AnalyticsReport = { days: number; rows: { day: string; event: AnalyticsEvent; count: number }[] };
export const analyticsDashboard = 'https://dash.cloudflare.com/7fa5e6d60edca4265f9829b6bc448d6b/web-analytics/overview?siteTag~in=ac736284c7bc428f896ce42c457c8687&excludeBots=Yes';

export function linkEvent(href: string, booking: boolean): AnalyticsEvent | undefined {
  if (booking) return 'booking';
  if (href.startsWith('tel:')) return 'phone';
  let url: URL;
  try { url = new URL(href); } catch { return; }
  if (url.protocol !== 'https:') return;
  if (['ig.me', 'www.ig.me'].includes(url.hostname)) return 'booking';
  if (['instagram.com', 'www.instagram.com'].includes(url.hostname)) return 'instagram';
  if (url.hostname === 't.me') return 'telegram';
  if (['maps.app.goo.gl', 'maps.google.com'].includes(url.hostname) || (['google.com', 'www.google.com'].includes(url.hostname) && url.pathname.startsWith('/maps'))) return 'directions';
}
