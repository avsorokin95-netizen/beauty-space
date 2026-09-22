import { lazy, Suspense, useEffect } from 'react';
import type { PublicSnapshot } from '../shared/public-snapshot';
import App from './App';

const Admin = lazy(() => import('./components/admin/Admin'));

function NotFound() {
  useEffect(() => {
    document.title = 'Сторінку не знайдено | Beauty Space Victoriya';
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.name = 'robots';
      document.head.appendChild(robots);
    }
    robots.content = 'noindex, follow';
  }, []);

  return (
    <main className="shell section">
      <p className="eyebrow">404</p>
      <h1>Сторінку не знайдено</h1>
      <p className="hero-description">Послуги, ціни та контакти студії доступні на головній сторінці.</p>
      <a className="text-link" href="/">На головну</a>
    </main>
  );
}

/** Administrative code is client-only and excluded from the public renderer. */
export function ClientApp({ path, initialSnapshot }: { path: string; initialSnapshot?: PublicSnapshot }) {
  if (path.replace(/\/$/, '') === '/admin') {
    return <Suspense fallback={<main role="status" style={{ padding: 40 }}>Завантажуємо адмінку…</main>}><Admin /></Suspense>;
  }
  if (path !== '/') return <NotFound />;
  return <App initialSnapshot={initialSnapshot} />;
}
