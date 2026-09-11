import { ContactsContext } from '../hooks/useContacts';
import { useEffect, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import { contactView, type ContactDocument } from '../../shared/contacts';

export function ContactsProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<ContactDocument | null>(null);
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
    const { contacts } = snapshot;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'BeautySalon', name: 'Beauty Space Victoriya', telephone: contacts.phone, address: { '@type': 'PostalAddress', streetAddress: contacts.address, addressLocality: contacts.city, addressCountry: 'UA' }, sameAs: [contacts.instagram] });
    document.head.appendChild(script);
    return () => script.remove();
  }, [snapshot]);
  if (!snapshot) return <main className="shell section" role="status">{error ? <>Не вдалося завантажити сайт. <button className="text-link" onClick={() => setAttempt((n) => n + 1)}>Спробувати ще раз</button></> : 'Відкриваємо beauty-простір…'}</main>;
  return <ContactsContext.Provider value={contactView(snapshot.contacts)}>{children}</ContactsContext.Provider>;
}
