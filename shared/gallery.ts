export interface GalleryItem {
  id: string;
  src: string;
  title: string;
  alt?: string;
  label: string;
  instagram: string;
  category?: 'nails' | 'pedicure' | 'lashes' | 'other';
  placement?: 'portfolio' | 'hero-nails' | 'hero-pedicure' | 'hero-lashes';
}
export const MAX_GALLERY_ITEMS = 30;
export const MAX_GALLERY_DOCUMENT_ITEMS = MAX_GALLERY_ITEMS + 3;
export const MAX_GALLERY_ALT_LENGTH = 300;

export function isPortfolioItem(item: GalleryItem) {
  return item.placement === undefined || item.placement === 'portfolio';
}

/** Legacy records stay in the portfolio; each service has at most one cover. */
export function validGalleryPlacements(items: unknown[]) {
  const covers = new Set<string>();
  let portfolioCount = 0;
  return items.every((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
    const value = 'placement' in item ? item.placement : undefined;
    if (value === undefined || value === 'portfolio') return ++portfolioCount <= MAX_GALLERY_ITEMS;
    if (typeof value !== 'string' || !['hero-nails', 'hero-pedicure', 'hero-lashes'].includes(value) || covers.has(value)) return false;
    covers.add(value);
    return true;
  });
}

export function validGalleryCategory(value: unknown): value is GalleryItem['category'] {
  return value === undefined || typeof value === 'string' && ['nails', 'pedicure', 'lashes', 'other'].includes(value);
}

export function galleryCategory(item: GalleryItem): NonNullable<GalleryItem['category']> {
  if (item.category) return item.category;
  if (/манікюр/i.test(item.label)) return 'nails';
  if (/педикюр/i.test(item.label)) return 'pedicure';
  if (/вії/i.test(item.label)) return 'lashes';
  return 'other';
}

export interface GalleryDocument {
  revision: number;
  updatedAt: string;
  items: GalleryItem[];
}

export function validGalleryAlt(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string" && value.length <= MAX_GALLERY_ALT_LENGTH;
}

export function validInstagram(value: unknown): value is string {
  if (value === "") return true;
  if (typeof value !== "string" || value.length > 300) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      ["instagram.com", "www.instagram.com"].includes(url.hostname) &&
      !url.username && !url.password && !url.port &&
      /^\/(p|reel)\/[A-Za-z0-9_-]+\/?$/.test(url.pathname);
  } catch { return false; }
}
