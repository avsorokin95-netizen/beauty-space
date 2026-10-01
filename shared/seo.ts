import { contactView, type ContactData } from './contacts.ts';
import type { PriceDocument } from './pricing.ts';
import { categoryContent } from './pricing.ts';
import { services } from '../src/data/studio.ts';
import { pageHeading, publicPages, type PublicPath } from './pages.ts';
import { verifiedStudioLocation } from './maps.ts';

/** Slash variants keep their exact published text, without guessing a price. */
function offers(prices: PriceDocument['prices'], id: string, pageUrl?: string) {
  return (prices[id]?.items ?? []).map((item) => ({
    '@type': 'Offer',
    ...(pageUrl ? { url: `${pageUrl}#service-${id}` } : {}),
    ...(/^\d[\d ]* грн$/.test(item.price)
      ? { price: Number(item.price.replace(/ грн$/, '').replaceAll(' ', '')), priceCurrency: 'UAH' }
      : {}),
    description: `${item.name}${item.detail ? `. ${item.detail}` : ''} — ${item.price}`,
    itemOffered: { '@type': 'Service', name: item.name, ...(item.detail ? { description: item.detail } : {}) },
  }));
}

export function studioSeo(contacts: ContactData, origin?: string, prices?: PriceDocument['prices'], path: PublicPath = '/') {
  const page = publicPages[path];
  const studio = contactView(contacts);
  const title = `${page.name} · ${contacts.city} | Beauty Space Victoriya`;
  const items = prices?.[page.category]?.items ?? [];
  // Use the same published examples as the hero, including the scope of
  // identically named complexes. Never turn an add-on into a service minimum.
  const examples = items.slice(0, 2).map((item) => {
    const detail = item.detail && items.some((other) => other !== item && other.name === item.name)
      ? ` (${item.detail})` : '';
    return `${item.name}${detail} — ${item.price}`;
  }).join('; ');
  const description = `${examples || page.name}. ${contacts.city}, ${contacts.address}. Фото робіт і запис.`;
  const home = origin ? `${origin}/` : undefined;
  const url = origin ? `${origin}${path}` : undefined;
  const image = origin ? `${origin}/images/social-preview.jpg` : undefined;
  const visibleServices = path === '/' ? services : services.filter((item) => item.id === page.category || (path === '/laminuvannia-vii' && item.id === 'sets'));
  const catalog = prices ? {
    '@type': 'OfferCatalog', name: `Послуги та ціни · ${page.name}`,
    itemListElement: visibleServices.map((item) => ({
      '@type': 'OfferCatalog', name: item.name, itemListElement: offers(prices, item.id, url),
    })),
  } : undefined;
  // Free-form/non-daily schedules remain visible, but aren't guessed into schema.
  const hours = studio.hours.match(/^Щодня, ([0-2]\d:[0-5]\d)[–-]([0-2]\d:[0-5]\d)$/);
  const location = verifiedStudioLocation(contacts);
  const schema = {
    '@context': 'https://schema.org', '@type': 'BeautySalon',
    ...(home ? { '@id': `${home}#studio`, url: home, image } : {}),
    name: 'Beauty Space Victoriya', telephone: contacts.phone,
    address: { '@type': 'PostalAddress', streetAddress: contacts.address, addressLocality: contacts.city, addressCountry: 'UA', ...(location ? { postalCode: location.postalCode } : {}) },
    ...(location ? { geo: { '@type': 'GeoCoordinates', latitude: location.latitude, longitude: location.longitude } } : {}),
    ...(hours && hours[1] < hours[2] && hours[2] < '24:00' ? { openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], opens: hours[1], closes: hours[2] }] } : {}),
    sameAs: [contacts.instagram], currenciesAccepted: 'UAH',
    ...(catalog ? { hasOfferCatalog: catalog } : {}),
    hasMap: studio.mapProfile,
  };
  const pageSchemas = home && url ? [
    { '@type': 'WebSite', '@id': `${home}#website`, url: home, name: 'Beauty Space Victoriya', inLanguage: 'uk', publisher: { '@id': `${home}#studio` } },
    { '@type': 'WebPage', '@id': `${url}#webpage`, url, name: title, description, inLanguage: 'uk', isPartOf: { '@id': `${home}#website` }, about: { '@id': `${home}#studio` }, mainEntity: { '@id': `${url}#service` } },
    { '@type': 'Service', '@id': `${url}#service`, url, name: pageHeading(path, contacts.city), serviceType: page.name,
      ...(prices?.[page.category] ? { description: categoryContent(prices[page.category], page.category).overview } : {}),
      provider: { '@id': `${home}#studio` }, areaServed: { '@type': 'Place', name: contacts.city },
      ...(prices ? { offers: offers(prices, page.category, url) } : {}),
    },
    ...(path === '/' ? [] : [{ '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Beauty Space Victoriya', item: home },
      { '@type': 'ListItem', position: 2, name: page.name, item: url },
    ] }]),
  ] : [];
  return { title, description, url, image, schema, pageSchemas };
}
