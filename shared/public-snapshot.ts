import type { ContactDocument } from './contacts.ts';
import type { GalleryDocument } from './gallery.ts';
import type { PriceDocument } from './pricing.ts';

/** Published data shared by the server render and its first browser render. */
export interface PublicSnapshot {
  contacts: ContactDocument;
  prices: PriceDocument;
  gallery: GalleryDocument;
}
