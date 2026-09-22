import { studioSeo } from '../../shared/seo';
import { ContactsContext } from '../hooks/useContacts';
import { useEffect, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import { contactView, type ContactDocument } from '../../shared/contacts';
import { readBootstrap } from '../lib/bootstrap';
import { usePrices } from '../hooks/usePrices';

export function ContactsProvider({ children, initialSnapshot }: { children: ReactNode; initialSnapshot?: ContactDocument }) {
  const [snapshot, setSnapshot] = useState<ContactDocument | null>(() => initialSnapshot ?? readBootstrap<ContactDocument>('studio-contacts'));
  const { prices } = usePrices();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => {
      api<ContactDocument>('/api/contacts', { signal: controller.signal }).then((value) => {
        setSnapshot((current) => !current || value.revision >= current.revision ? value : current);
        setError(false);
      }).catch(() => { if (!controller.signal.aborted) setError(true); });
    };
    refresh();
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    window.addEventListener('pageshow', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      controller.abort(); clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('pageshow', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [attempt]);
  useEffect(() => {
    if (!snapshot) return;
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const seo = studioSeo(snapshot.contacts, canonical ? new URL(canonical.href).origin : undefined, prices);
    document.title = seo.title;
    for (const selector of ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]']) {
      const meta = document.querySelector<HTMLMetaElement>(selector);
      if (meta) meta.content = seo.description;
    }
    for (const selector of ['meta[property="og:title"]', 'meta[name="twitter:title"]']) {
      const meta = document.querySelector<HTMLMetaElement>(selector);
      if (meta) meta.content = seo.title;
    }
    for (const [id, schema] of [['studio-schema', seo.schema], ['page-schema', { '@context': 'https://schema.org', '@graph': seo.pageSchemas }]] as const) {
      let script = document.getElementById(id) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement('script');
        script.id = id; script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(schema);
    }
  }, [snapshot, prices]);
  if (!snapshot) return <main className="shell section" role="status">{error ? <>Не вдалося завантажити сайт. <button className="text-link" onClick={() => setAttempt((n) => n + 1)}>Спробувати ще раз</button></> : 'Відкриваємо beauty-простір…'}</main>;
  return <ContactsContext.Provider value={contactView(snapshot.contacts)}>{children}</ContactsContext.Provider>;
}
