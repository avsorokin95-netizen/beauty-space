import { validPrice, normalizePrice, type PriceDocument } from '../shared/pricing';
import { contactFields, validContact, type ContactData } from '../shared/contacts';
import { MAX_GALLERY_ITEMS, validGalleryAlt, validInstagram, type GalleryItem } from '../shared/gallery';
import { initialGallery } from '../src/data/gallery';

export type Kind = 'prices' | 'contacts' | 'gallery';
export const fieldFor = { prices: 'prices', contacts: 'contacts', gallery: 'items' } as const;
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
export const invalid = () => new HttpError(400, 'Перевір поля, ціни та посилання.');
export const mediaName = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/;

export async function readDocument(db: D1Database, kind: Kind) {
  const row = await db.prepare('SELECT revision, updated_at, data FROM documents WHERE kind = ?').bind(kind).first<{ revision: number; updated_at: string; data: string }>();
  if (!row) throw new HttpError(503, 'Дані студії ще не перенесено.');
  return { revision: row.revision, updatedAt: row.updated_at, [fieldFor[kind]]: JSON.parse(row.data) };
}

export async function saveDocument(db: D1Database, media: R2Bucket, kind: Kind, input: Record<string, unknown>) {
  const current = await readDocument(db, kind);
  if (!Number.isInteger(input.revision)) throw invalid();
  if (current.revision !== input.revision) throw new HttpError(409, 'Дані вже змінено. Завантаж опубліковану версію.');
  let data: unknown;
  if (kind === 'prices') {
    const incoming = input.prices as PriceDocument['prices'];
    const stored = current.prices as PriceDocument['prices'];
    if (!incoming || typeof incoming !== 'object' || Object.keys(incoming).length !== Object.keys(stored).length) throw invalid();
    for (const [id, category] of Object.entries(stored)) {
      const value = incoming[id];
      if (!value || !validPrice(value.summary, true) || !Array.isArray(value.items) || value.items.length !== category.items.length) throw invalid();
      category.summary = normalizePrice(value.summary);
      category.items.forEach((item, index) => {
        if (!validPrice(value.items[index]?.price)) throw invalid();
        item.price = normalizePrice(value.items[index].price);
      });
    }
    data = stored;
  } else if (kind === 'contacts') {
    const incoming = input.contacts as ContactData;
    if (!incoming || typeof incoming !== 'object') throw invalid();
    data = Object.fromEntries(contactFields.map(({ key }) => {
      if (!validContact(key, incoming[key])) throw invalid();
      return [key, incoming[key].trim()];
    }));
  } else {
    if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > MAX_GALLERY_ITEMS) throw invalid();
    const ids = new Set<string>();
    const items: GalleryItem[] = [];
    for (const item of input.items) {
      if (!item || typeof item.id !== 'string' || !/^work-[A-Za-z0-9-]{1,64}$/.test(item.id) || ids.has(item.id) ||
        typeof item.src !== 'string' || typeof item.title !== 'string' || !item.title.trim() || item.title.length > 100 ||
        !validGalleryAlt(item.alt) ||
        typeof item.label !== 'string' || !item.label.trim() || item.label.length > 60 || !validInstagram(item.instagram)) throw invalid();
      if (!initialGallery.some((seed) => seed.src === item.src)) {
        const name = item.src.slice('/api/media/'.length);
        if (item.src !== `/api/media/${name}` || !mediaName.test(name) || !await media.head(name)) throw invalid();
      }
      ids.add(item.id);
      items.push({ id: item.id, src: item.src, title: item.title.trim(), ...(item.alt === undefined ? {} : { alt: item.alt.trim() }), label: item.label.trim(), instagram: item.instagram });
    }
    data = items;
  }
  const updatedAt = new Date().toISOString();
  // One conditional SQL statement makes concurrent edits atomic across isolates.
  const result = await db.prepare('UPDATE documents SET revision = revision + 1, updated_at = ?, data = ? WHERE kind = ? AND revision = ?')
    .bind(updatedAt, JSON.stringify(data), kind, input.revision).run();
  if (result.meta.changes !== 1) throw new HttpError(409, 'Дані вже змінено. Завантаж опубліковану версію.');
  return { revision: current.revision + 1, updatedAt, [fieldFor[kind]]: data };
}
