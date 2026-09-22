import { studioHours } from './hours.ts';
import { studioMapLinks } from './maps.ts';
import type { ContactData } from './contacts.ts';
import type { PriceDocument } from './pricing.ts';
import { services } from '../src/data/studio.ts';

/** Only publish exact, unambiguous prices. Slash variants keep their original text. */
function offers(prices: PriceDocument['prices'], id: string, origin?: string) {
  return (prices[id]?.items ?? []).map((item) => ({
    '@type': 'Offer',
    ...(origin ? { url: `${origin}/#services` } : {}),
    ...(/^\d[\d ]* грн$/.test(item.price)
      ? { price: Number(item.price.replace(/ грн$/, '').replaceAll(' ', '')), priceCurrency: 'UAH' }
      : {}),
    description: `${item.name}${item.detail ? `. ${item.detail}` : ''} — ${item.price}`,
    itemOffered: { '@type': 'Service', name: item.name, ...(item.detail ? { description: item.detail } : {}) },
  }));
}

export function studioSeo(contacts: ContactData, origin?: string, prices?: PriceDocument['prices']) {
  const local = contacts.city === 'Софіївська Борщагівка';
  const title = local
    ? 'Манікюр · ЖК «Софія», Софіївська Борщагівка | Beauty Space Victoriya'
    : `Манікюр і педикюр · ${contacts.city} | Beauty Space Victoriya`;
  const description = local
    ? `Манікюр зі зміцненням і дизайном, педикюр та ламінування вій. ${contacts.city}, ${contacts.address}. Для мешканців ЖК «Софія» та Вишневого. Ціни й запис.`
    : `Манікюр, педикюр, брови та вії · ${contacts.city}, ${contacts.address}. Ціни, фото робіт і запис у Beauty Space Victoriya.`;
  const home = origin ? `${origin}/` : undefined;
  const url = home;
  const image = origin ? `${origin}/images/social-preview.jpg` : undefined;
  const catalog = prices ? {
    '@type': 'OfferCatalog', name: 'Послуги та ціни Beauty Space Victoriya',
    itemListElement: services.map((item) => ({
      '@type': 'OfferCatalog', name: item.name, itemListElement: offers(prices, item.id, origin),
    })),
  } : undefined;
  const schema = {
    '@context': 'https://schema.org', '@type': 'BeautySalon',
    ...(home ? { '@id': `${home}#studio`, url: home, image } : {}),
    name: 'Beauty Space Victoriya', telephone: contacts.phone,
    description,
    address: { '@type': 'PostalAddress', streetAddress: contacts.address, addressLocality: contacts.city, addressCountry: 'UA' },
    openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: studioHours.days, opens: studioHours.opens, closes: studioHours.closes }],
    sameAs: [contacts.instagram, contacts.telegram],
    currenciesAccepted: 'UAH',
    ...(catalog ? { hasOfferCatalog: catalog } : {}),
    hasMap: studioMapLinks(contacts).mapProfile,
  };
  const pageSchemas = home && url ? [
    { '@type': 'WebSite', '@id': `${home}#website`, url: home, name: 'Beauty Space Victoriya', inLanguage: 'uk', publisher: { '@id': `${home}#studio` } },
    { '@type': 'WebPage', '@id': `${url}#webpage`, url, name: title, description, inLanguage: 'uk', isPartOf: { '@id': `${home}#website` }, about: { '@id': `${home}#studio` } },
    ...[
      ['manicure-guide', 'Манікюр', 'Манікюр без покриття, зі зміцненням, реставрацією та дизайном'],
      ['pedicure-guide', 'Педикюр', 'Гігієнічний педикюр, комплекси з покриттям та обробка стопи'],
      ['lashes-guide', 'Ламінування та фарбування вій', 'Ламінування вій без фарбування або з фарбуванням і доглядом'],
    ].map(([id, name, serviceDescription]) => ({
      '@type': 'Service', '@id': `${home}#${id}`, url: `${home}#services`,
      name, description: serviceDescription, serviceType: name,
      provider: { '@id': `${home}#studio` },
      areaServed: (local ? [contacts.city, 'Вишневе'] : [contacts.city])
        .map((name) => ({ '@type': 'City', name })),
    })),
  ] : [];
  return { title, description, url, image, schema, pageSchemas };
}
