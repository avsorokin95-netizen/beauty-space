import type { PriceDocument } from '../shared/pricing.ts';
import type { GalleryDocument } from '../shared/gallery.ts';

/** Exercise the whole allowed document, including multibyte owner content. */
export function fullPriceDocument(current: PriceDocument): PriceDocument {
  const result = structuredClone(current);
  for (const category of Object.values(result.prices)) {
    category.overview = 'ї'.repeat(1200);
    category.booking = 'є'.repeat(1200);
    category.note = 'і'.repeat(1200);
    category.items = Array.from({ length: 30 }, () => ({
      name: 'ї'.repeat(150), detail: 'є'.repeat(600), price: '100 000 грн',
    }));
  }
  return result;
}

export function fullGalleryDocument(current: GalleryDocument): GalleryDocument {
  return { ...current, items: Array.from({ length: 33 }, (_, index) => ({
    ...current.items[0], id: `work-capacity-${index}`, title: 'ї'.repeat(100),
    label: 'є'.repeat(60), alt: 'і'.repeat(300),
    placement: index < 30 ? 'portfolio' : (['hero-nails', 'hero-pedicure', 'hero-lashes'] as const)[index - 30],
  })) };
}
