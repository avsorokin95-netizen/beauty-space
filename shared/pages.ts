export const publicPages = {
  '/': { category: 'nails', name: 'Манікюр', label: 'Манікюр', gallery: 'nails' },
  '/pedicure': { category: 'pedicure', name: 'Педикюр', label: 'Педикюр', gallery: 'pedicure' },
  '/laminuvannia-vii': { category: 'lashes', name: 'Ламінування вій', label: 'Вії', gallery: 'lashes' },
} as const;
export type PublicPath = keyof typeof publicPages;
export function isPublicPath(path: string): path is PublicPath {
  return Object.hasOwn(publicPages, path);
}
export function pageHeading(path: PublicPath, city: string) {
  return city === 'Софіївська Борщагівка'
    ? `${publicPages[path].name} у Софіївській Борщагівці`
    : `${publicPages[path].name} · ${city}`;
}
