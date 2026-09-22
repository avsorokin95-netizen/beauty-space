import { renderToString } from 'react-dom/server';
import type { PublicSnapshot } from '../shared/public-snapshot';
import App from './App';

/** The browser hydrates this exact component tree from the serialized snapshot. */
export function renderPublicApp(snapshot: PublicSnapshot): string {
  return renderToString(<App initialSnapshot={snapshot} />);
}
