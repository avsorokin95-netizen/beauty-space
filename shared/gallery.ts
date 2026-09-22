export interface GalleryItem {
  id: string;
  src: string;
  title: string;
  alt?: string;
  label: string;
  instagram: string;
}
export const MAX_GALLERY_ITEMS = 30;
export const MAX_GALLERY_ALT_LENGTH = 300;

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
