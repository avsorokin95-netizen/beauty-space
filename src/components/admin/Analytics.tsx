import { useEffect, useState } from 'react';
import { analyticsDashboard, eventLabels, type AnalyticsReport } from '../../../shared/analytics';
import { api, ApiError } from '../../lib/api';

export function Analytics({ onSessionExpired }: { onSessionExpired: () => void }) {
  const [days, setDays] = useState(30);
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    api<AnalyticsReport>(`/api/admin/analytics?days=${days}`).then((data) => {
      if (active) setReport(data);
    }).catch((cause) => {
      if (!active) return;
      if (cause instanceof ApiError && cause.status === 401) onSessionExpired();
      else setError('Не вдалося завантажити статистику. Спробуй оновити.');
    });
    return () => { active = false; };
  }, [days, revision, onSessionExpired]);
  return <section className="analytics-panel">
    <div className="admin-page-heading"><div>
      <p className="admin-eyebrow">ВІДВІДУВАННЯ ТА ЗВЕРНЕННЯ</p>
      <h1>Статистика <em>сайту.</em></h1>
      <p>Відвідування та натискання на контакти — в одному місці.</p>
      <a className="text-link" href={analyticsDashboard} target="_blank" rel="noopener noreferrer">Джерела переходів, країни та пристрої у Cloudflare ↗</a>
    </div></div>
    <div className="analytics-controls">
      <label>Період <select value={days} onChange={(event) => { setReport(null); setError(''); setDays(Number(event.target.value)); }}>
        <option value={7}>7 днів</option><option value={30}>30 днів</option><option value={90}>90 днів</option>
      </select></label>
      <button type="button" onClick={() => { setReport(null); setError(''); setRevision((value) => value + 1); }}>Оновити</button>
    </div>
    {error ? <p className="admin-error" role="alert">{error}</p> : !report ? <p role="status">Завантажуємо статистику…</p> : <>
      <h2>Відвідування</h2>
      <p>Візити та перегляди за даними Cloudflare, з виключенням відомих ботів. Один відвідувач може здійснити кілька візитів. Дані можуть бути приблизними; дні рахуються за UTC.</p>
      {report.traffic.updatedAt ? <>
        <dl className="analytics-totals">
          <div><dt>Візити</dt><dd>{report.traffic.rows.reduce((sum, row) => sum + row.visits, 0).toLocaleString('uk-UA')}</dd></div>
          <div><dt>Перегляди сторінки</dt><dd>{report.traffic.rows.reduce((sum, row) => sum + row.pageViews, 0).toLocaleString('uk-UA')}</dd></div>
        </dl>
        <p className="analytics-updated">Оновлено: {new Date(report.traffic.updatedAt).toLocaleString('uk-UA')}</p>
        {report.traffic.status === 'not_configured' && <p role="status">Показано збережені дані. Автоматичне оновлення ще налаштовується.</p>}
        {report.traffic.status === 'stale' && <p role="status">Cloudflare тимчасово недоступний. Показано останні збережені дані.</p>}
        {report.traffic.rows.length > 0 ? <div className="analytics-table"><table>
          <caption>Відвідування за днями</caption>
          <thead><tr><th scope="col">Дата (UTC)</th><th scope="col">Візити</th><th scope="col">Перегляди</th></tr></thead>
          <tbody>{report.traffic.rows.map((row) => <tr key={row.day}><th scope="row">{row.day}</th><td>{row.visits.toLocaleString('uk-UA')}</td><td>{row.pageViews.toLocaleString('uk-UA')}</td></tr>)}</tbody>
        </table></div> : <p>За цей період Cloudflare ще не зафіксував відвідувань.</p>}
      </> : <p role="status">{report.traffic.status === 'not_configured' ? 'Підключення статистики відвідувань ще налаштовується.' : 'Не вдалося отримати відвідування з Cloudflare. Спробуй оновити пізніше.'}</p>}
      <h2 className="analytics-contacts-heading">Натискання на контакти</h2>
      <p>Кількість натискань, а не підтверджених записів чи унікальних людей. Облік починається з 14 вересня 2026 року.</p>
      <dl className="analytics-totals">{Object.entries(eventLabels).map(([event, label]) => <div key={event}>
        <dt>{label}</dt><dd>{report.rows.filter((row) => row.event === event).reduce((sum, row) => sum + row.count, 0).toLocaleString('uk-UA')}</dd>
      </div>)}</dl>
      {!report.rows.length ? <p>За цей період натискань ще немає.</p> : <div className="analytics-table"><table>
        <caption>Натискання за днями</caption>
        <thead><tr><th scope="col">Дата (UTC)</th>{Object.values(eventLabels).map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead>
        <tbody>{[...new Set(report.rows.map((row) => row.day))].map((day) => <tr key={day}><th scope="row">{day}</th>{Object.keys(eventLabels).map((event) => <td key={event}>{report.rows.find((row) => row.day === day && row.event === event)?.count ?? 0}</td>)}</tr>)}</tbody>
      </table></div>}
    </>}
  </section>;
}
