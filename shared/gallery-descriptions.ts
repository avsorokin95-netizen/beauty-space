import type { GalleryItem } from './gallery.ts';

// Descriptions of the bundled photos, checked against the actual images.
// Match immutable source paths, never item IDs: an admin can replace a photo
// while keeping its ID, title and position in the gallery.
const descriptions: Readonly<Record<string, string>> = {
  '/images/DMH0_1XIG6e.webp': 'Французький манікюр на коротких квадратних нігтях із рожевою основою та білими кінчиками.',
  '/images/Daz8xsnCN4f.webp': 'Однотонний світло-рожевий манікюр на овальних нігтях із глянцевим покриттям.',
  '/images/DNm6R3Qo2oO.webp': 'Мигдалеподібні нігті з червоним і молочним покриттям та чорними крапками на світлих нігтях.',
  '/images/DI3Rq7-AO6U.webp': 'Вії з виразним вигином на крупному плані ока збоку.',
  '/images/lashes-detail.webp': 'Крупний план ока з темними підкрученими верхніми віями.',
  '/images/pink-floral.webp': 'Рожевий манікюр на мигдалеподібних нігтях із дрібним квітковим декором.',
  '/images/pedicure-care.webp': 'Педикюр на коротких нігтях природного відтінку без кольорового покриття.',
};

export function galleryPhotoDescription(src: string): string | undefined {
  return Object.hasOwn(descriptions, src) ? descriptions[src] : undefined;
}

/** Older saved documents have no alt field; resolve their original photos too. */
export function galleryAlt(item: Pick<GalleryItem, 'src' | 'title' | 'alt'>): string {
  return item.alt?.trim() || galleryPhotoDescription(item.src) || item.title;
}
