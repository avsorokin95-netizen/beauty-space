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
      <p>Візити, перегляди, джерела переходів, країни та пристрої — у Cloudflare.</p>
      <a className="text-link" href={analyticsDashboard} target="_blank" rel="noopener noreferrer">Відкрити статистику відвідувань ↗</a>
    </div></div>
    <h2>Натискання на контакти</h2>
    <p>Кількість натискань, а не підтверджених записів чи унікальних людей. Облік починається з 14 вересня 2026 року; дні рахуються за UTC.</p>
    <div className="analytics-controls">
      <label>Період <select value={days} onChange={(event) => { setReport(null); setError(''); setDays(Number(event.target.value)); }}>
        <option value={7}>7 днів</option><option value={30}>30 днів</option><option value={90}>90 днів</option>
      </select></label>
      <button type="button" onClick={() => { setReport(null); setError(''); setRevision((value) => value + 1); }}>Оновити</button>
    </div>
    {error ? <p className="admin-error" role="alert">{error}</p> : !report ? <p role="status">Завантажуємо статистику…</p> : <>
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
