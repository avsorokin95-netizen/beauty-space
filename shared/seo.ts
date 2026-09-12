import { studioHours } from './hours.ts';
import type { ContactData } from './contacts.ts';

export function studioSeo(contacts: ContactData, origin?: string) {
  const title = `Манікюр · ${contacts.city} | Beauty Space Victoriya`;
  const description = `Манікюр, педикюр, брови та ламінування вій у Beauty Space Victoriya. Ціни й фото робіт. Адреса: ${contacts.city}, ${contacts.address}. Запис онлайн або за телефоном ${contacts.phone}.`;
  const url = origin ? `${origin}/` : undefined;
  const image = origin ? `${origin}/images/social-preview.jpg` : undefined;
  const schema = {
    '@context': 'https://schema.org', '@type': 'BeautySalon',
    ...(url ? { '@id': `${url}#studio`, url, image } : {}),
    name: 'Beauty Space Victoriya', description, telephone: contacts.phone,
    address: { '@type': 'PostalAddress', streetAddress: contacts.address, addressLocality: contacts.city, addressCountry: 'UA' },
    openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: studioHours.days, opens: studioHours.opens, closes: studioHours.closes }],
    sameAs: [contacts.instagram, contacts.telegram],
    hasMap: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${contacts.address}, ${contacts.city}, Україна`)}`,
  };
  return { title, description, url, image, schema };
}
