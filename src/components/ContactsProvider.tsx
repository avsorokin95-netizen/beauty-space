import { studioSeo } from '../../shared/seo';
import { ContactsContext } from '../hooks/useContacts';
import { useEffect, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import { contactView, type ContactDocument } from '../../shared/contacts';

export function ContactsProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<ContactDocument | null>(() => {
    const data = document.getElementById('studio-contacts')?.textContent;
    try { return data ? JSON.parse(data) : null; } catch { return null; }
  });
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
    const seo = studioSeo(snapshot.contacts, canonical ? new URL(canonical.href).origin : undefined);
    document.title = seo.title;
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (description) description.content = seo.description;
    let script = document.getElementById('studio-schema') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = 'studio-schema'; script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(seo.schema);
  }, [snapshot]);
  if (!snapshot) return <main className="shell section" role="status">{error ? <>Не вдалося завантажити сайт. <button className="text-link" onClick={() => setAttempt((n) => n + 1)}>Спробувати ще раз</button></> : 'Відкриваємо beauty-простір…'}</main>;
  return <ContactsContext.Provider value={contactView(snapshot.contacts)}>{children}</ContactsContext.Provider>;
}
