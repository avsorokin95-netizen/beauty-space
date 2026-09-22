import type { ContactData } from './contacts.ts';

// Verified against the studio's existing Google review link and business profile.
const studioPlace = {
  id: 'ChIJey2Ar-TL1EARuk3pdFrpkJ0',
  name: 'Beauty Space Victoriya',
  address: 'вул. Боголюбова, 6',
  city: 'Софіївська Борщагівка',
  // Copied from Google Maps → Share → Embed a map for this business.
  embed: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2543.2097377285636!2d30.375246999999998!3d50.399928700000004!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x40d4cbe4af802d7b%3A0x9d90e95a74e94dba!2sBeauty%20Space%20Victoriya!5e0!3m2!1suk!2sua!4v1790105757772!5m2!1suk!2sua',
};

export function studioMapLinks(contacts: Pick<ContactData, 'address' | 'city'>) {
  const address = `${contacts.address}, ${contacts.city}, Україна`;
  const knownLocation = contacts.address === studioPlace.address && contacts.city === studioPlace.city;
  const label = knownLocation ? `${studioPlace.name}, ${address}` : address;
  const profile = new URL('https://www.google.com/maps/search/');
  profile.searchParams.set('api', '1');
  profile.searchParams.set('query', label);
  const directions = new URL('https://www.google.com/maps/dir/');
  directions.searchParams.set('api', '1');
  directions.searchParams.set('destination', label);
  if (knownLocation) {
    profile.searchParams.set('query_place_id', studioPlace.id);
    directions.searchParams.set('destination_place_id', studioPlace.id);
  }
  const embed = new URL('https://maps.google.com/maps');
  embed.searchParams.set('q', address);
  embed.searchParams.set('z', '17');
  embed.searchParams.set('hl', 'uk');
  embed.searchParams.set('output', 'embed');
  return { map: directions.href, mapProfile: profile.href, mapEmbed: knownLocation ? studioPlace.embed : embed.href };
}
