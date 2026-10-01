import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../../lib/api';
import { contactFields, contactView, validContact, type ContactDocument, type ContactData } from '../../../shared/contacts';

function contactModel(value: ContactDocument): ContactsModel {
  const view = contactView(value.contacts);
  const document = { ...value, contacts: { ...value.contacts, ...Object.fromEntries(contactFields.map(({ key }) => [key, view[key]])) } };
  return { draft: structuredClone(document), published: document };
}

export interface ContactsModel { draft: ContactDocument; published: ContactDocument }
interface Props {
  model: ContactsModel | null;
  onChange: (model: ContactsModel) => void;
  busy: boolean;
  onBusy: (busy: boolean) => void;
  onSessionExpired: () => void;
}
export function ContactsEditor({ model, onChange, busy, onBusy, onSessionExpired }: Props) {
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const dirty = !!model && JSON.stringify(model.draft.contacts) !== JSON.stringify(model.published.contacts);
  const invalid = model && contactFields.some(({ key }) => !validContact(key, model.draft.contacts[key]));
  useEffect(() => {
    if (model) return;
    const controller = new AbortController();
    api<ContactDocument>('/api/contacts', { signal: controller.signal }).then((value) => {
      onChange(contactModel(value)); setError('');
    }).catch(() => { if (!controller.signal.aborted) setError('Не вдалося завантажити контакти.'); });
    return () => controller.abort();
  }, [model, onChange, attempt]);
  function failure(cause: unknown) {
    if (cause instanceof ApiError && cause.status === 401) onSessionExpired();
    if (cause instanceof ApiError && cause.status === 409) setConflict(true);
    setError(cause instanceof ApiError ? cause.message : 'Не вдалося зберегти зміни. Спробуй ще раз.');
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!model || !dirty || invalid || conflict || busy) return;
    onBusy(true); setError(''); setSaved(false);
    try {
      const value = await api<ContactDocument>('/api/admin/contacts', { method: 'PUT', body: JSON.stringify(model.draft) });
      onChange(contactModel(value)); setSaved(true);
    } catch (cause) { failure(cause); } finally { onBusy(false); }
  }
  async function discard() {
    onBusy(true);
    try {
      const value = await api<ContactDocument>('/api/contacts');
      onChange(contactModel(value));
      setError(''); setSaved(false); setConflict(false); setConfirm(false);
    } catch (cause) { failure(cause); } finally { onBusy(false); }
  }
  function update(key: keyof ContactData, value: string) {
    if (!model) return;
    const contacts = { ...model.draft.contacts, [key]: value };
    if (key === 'city' || key === 'address') { contacts.floor = ''; contacts.directionsVideo = ''; }
    onChange({ ...model, draft: { ...model.draft, contacts } });
    setSaved(false); setConfirm(false);
  }
  return <section aria-label="Керування контактами">
    <div className="admin-page-heading"><div><p className="admin-eyebrow">ЗАВЖДИ НА ЗВ’ЯЗКУ</p><h1>Твої <em>контакти.</em></h1><p>Оновлюй телефон, адресу та соціальні мережі в одному місці.</p></div></div>
    {error && <p className="admin-error" role="alert">{error}</p>}
    {saved && <p className="admin-success" role="status">Контакти збережено й опубліковано.</p>}
    {!model ? <p role="status">{error ? <button className="admin-secondary" onClick={() => setAttempt((n) => n + 1)}>Спробувати ще раз</button> : 'Завантажуємо контакти…'}</p> :
      <form onSubmit={save}>
        <fieldset className="admin-editor contacts-editor" disabled={busy}>
          <legend className="sr-only">Контактні дані студії</legend>
          {contactFields.map(({ key, label, hint, max, optional, multiline }) => <div className="summary-field" key={key}>
            <div><label htmlFor={`contact-${key}`}>{label}</label><p id={`contact-hint-${key}`}>{hint}</p></div>
            <div>{multiline ? <textarea id={`contact-${key}`} rows={5} value={model.draft.contacts[key] ?? ''} maxLength={max}
              aria-describedby={`contact-hint-${key}`} aria-invalid={!validContact(key, model.draft.contacts[key])} onChange={(event) => update(key, event.target.value)} /> :
              <input id={`contact-${key}`} type={key === 'phone' ? 'tel' : ['address', 'city', 'hours', 'floor'].includes(key) ? 'text' : 'url'} value={model.draft.contacts[key] ?? ''} required={!optional} maxLength={max}
              aria-describedby={`contact-hint-${key}`} aria-invalid={!validContact(key, model.draft.contacts[key])}
              onChange={(event) => update(key, event.target.value)} />}
              {!validContact(key, model.draft.contacts[key]) && <small className="admin-validation">Перевір формат поля.</small>}
            </div>
          </div>)}
        </fieldset>
        <div className="admin-savebar"><div><strong>{dirty ? 'Є неопубліковані зміни' : 'Контакти опубліковано'}</strong><span>Карта й кнопки запису оновляться разом із контактами.</span></div>
          <div className="save-actions"><button type="button" className="admin-secondary" disabled={busy || (!dirty && !conflict)} onClick={() => setConfirm(true)}>Скасувати зміни контактів</button><button className="button" disabled={busy || !dirty || !!invalid || conflict}>{busy ? 'Зберігаємо…' : 'Опублікувати контакти'}</button></div>
          {confirm && <div className="discard-confirm" role="alert"><p>Скасувати чернетку й завантажити опубліковані контакти?</p><button type="button" disabled={busy} onClick={discard}>Так, завантажити контакти</button><button type="button" disabled={busy} onClick={() => setConfirm(false)}>Продовжити редагування</button></div>}
        </div>
      </form>}
  </section>;
}
