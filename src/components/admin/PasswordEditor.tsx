import { useState, type FormEvent } from 'react';
import { LockKeyhole } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { validNewPassword } from '../../../shared/password';

interface Props {
  hasDrafts: boolean;
  busy: boolean;
  onBusy: (value: boolean) => void;
  onChanged: () => void;
  onSessionExpired: () => void;
}
export function PasswordEditor({ hasDrafts, busy, onBusy, onChanged, onSessionExpired }: Props) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const valid = !!currentPassword && validNewPassword(newPassword) && confirmation === newPassword && currentPassword !== newPassword;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!valid || busy || hasDrafts) return;
    onBusy(true); setError('');
    try {
      await api('/api/admin/password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword, confirmation }) });
      setCurrentPassword(''); setNewPassword(''); setConfirmation('');
      onChanged();
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onSessionExpired();
      else setError(cause instanceof ApiError ? cause.message : 'Не вдалося підтвердити зміну. Перевір підключення; якщо сесія завершилась, увійди з новим паролем.');
    } finally { onBusy(false); }
  }
  return <section aria-label="Безпека облікового запису">
    <div className="admin-page-heading"><div><p className="admin-eyebrow">ДОСТУП ДО ТВОГО ПРОСТОРУ</p><h1>Твоя <em>безпека.</em></h1><p>Після зміни пароля потрібно буде увійти знову на всіх пристроях.</p></div></div>
    <form className="password-editor admin-editor" onSubmit={submit}>
      <fieldset disabled={busy || hasDrafts}>
        <legend className="sr-only">Зміна пароля</legend>
        <label htmlFor="current-password">Поточний пароль</label>
        <input id="current-password" type={show ? 'text' : 'password'} autoComplete="current-password" value={currentPassword} maxLength={256} required onChange={(event) => setCurrentPassword(event.target.value)} />
        <label htmlFor="new-password">Новий пароль</label>
        <input id="new-password" type={show ? 'text' : 'password'} autoComplete="new-password" value={newPassword} minLength={12} maxLength={256} required aria-describedby="new-password-hint" onChange={(event) => setNewPassword(event.target.value)} />
        <p id="new-password-hint">Від 12 до 256 символів. Обери пароль, який не використовуєш на інших сайтах.</p>
        <label htmlFor="confirm-password">Повтори новий пароль</label>
        <input id="confirm-password" type={show ? 'text' : 'password'} autoComplete="new-password" value={confirmation} maxLength={256} required aria-invalid={!!confirmation && confirmation !== newPassword} aria-describedby="password-match" onChange={(event) => setConfirmation(event.target.value)} />
        <p id="password-match" className="admin-validation">{confirmation && confirmation !== newPassword ? 'Паролі не збігаються.' : newPassword && newPassword === currentPassword ? 'Новий пароль має відрізнятися від поточного.' : ''}</p>
        <label className="password-visibility"><input type="checkbox" checked={show} onChange={(event) => setShow(event.target.checked)} /> Показати паролі</label>
      </fieldset>
      {hasDrafts && <p className="editor-note">Спочатку опублікуй або скасуй зміни в інших вкладках адмінки.</p>}
      {error && <p className="admin-error" role="alert">{error}</p>}
      <button className="button" disabled={busy || hasDrafts || !valid}><LockKeyhole size={18} />{busy ? 'Змінюємо…' : 'Змінити пароль'}</button>
    </form>
  </section>;
}
