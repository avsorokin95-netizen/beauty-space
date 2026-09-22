import { studioMapLinks } from './maps.ts';

export interface ContactData {
  phone: string;
  address: string;
  city: string;
  instagram: string;
  direct: string;
  telegram: string;
  reviews: string;
}
export interface ContactDocument {
  revision: number;
  updatedAt: string;
  contacts: ContactData;
}
export const contactFields: { key: keyof ContactData; label: string; hint: string; max: number }[] = [
  { key: 'phone', label: 'Телефон', hint: 'Міжнародний формат: +380939314056', max: 16 },
  { key: 'address', label: 'Вулиця та будинок', hint: 'Наприклад: вул. Боголюбова, 6. Карта оновиться автоматично.', max: 150 },
  { key: 'city', label: 'Населений пункт', hint: 'Наприклад: Софіївська Борщагівка', max: 100 },
  { key: 'instagram', label: 'Профіль Instagram', hint: 'https://www.instagram.com/ім’я_профілю/', max: 300 },
  { key: 'direct', label: 'Посилання для запису в Direct', hint: 'https://ig.me/m/ім’я_профілю — для всіх кнопок запису', max: 300 },
  { key: 'telegram', label: 'Посилання Telegram', hint: 'https://t.me/ім’я_користувача', max: 300 },
  { key: 'reviews', label: 'Відгуки в Instagram', hint: 'Посилання на Highlights: https://www.instagram.com/stories/highlights/…/', max: 300 },
];
export function validContact(key: keyof ContactData, value: unknown): value is string {
  const field = contactFields.find((item) => item.key === key);
  if (!field || typeof value !== 'string' || !value.trim() || value.length > field.max || Array.from(value).some((character) => character.charCodeAt(0) < 32)) return false;
  if (key === 'phone') return /^\+[1-9]\d{7,14}$/.test(value);
  if (key === 'address' || key === 'city') return true;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return false;
    if (key === 'direct') return url.hostname === 'ig.me' && /^\/m\/[A-Za-z0-9._]+\/?$/.test(url.pathname);
    if (key === 'telegram') return url.hostname === 't.me' && url.pathname.length > 1;
    if (!['instagram.com', 'www.instagram.com'].includes(url.hostname)) return false;
    return key === 'reviews' ? /^\/stories\/highlights\/\d+\/?$/.test(url.pathname) : /^\/[A-Za-z0-9._]+\/?$/.test(url.pathname);
  } catch { return false; }
}
export function contactView(contacts: ContactData) {
  return {
    ...contacts,
    phoneDisplay: contacts.phone.replace(/^(\+380)(\d{2})(\d{3})(\d{2})(\d{2})$/, '$1 $2 $3 $4 $5'),
    instagramHandle: '@' + new URL(contacts.instagram).pathname.split('/')[1],
    ...studioMapLinks(contacts),
  };
}
