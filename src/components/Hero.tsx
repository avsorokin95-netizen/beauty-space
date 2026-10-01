import { ArrowDown, MapPin, Phone } from 'lucide-react';
import { BookingLink, Eyebrow } from './ui';
import { useContacts } from '../hooks/useContacts';
import { usePrices } from '../hooks/usePrices';
import { useGallery } from '../hooks/useGallery';
import { galleryAlt } from '../../shared/gallery-descriptions';
import { galleryCategory } from '../../shared/gallery';
import { pageHeading, publicPages, type PublicPath } from '../../shared/pages';

export function Hero({ path = '/' }: { path?: PublicPath }) {
  const studio = useContacts();
  const { prices } = usePrices();
  const { posts = [] } = useGallery();
  const page = publicPages[path];
  const photo = posts.find((post) => galleryCategory(post) === page.gallery);
  const selected = prices?.[page.category]?.items.slice(0, 2) ?? [];
  return <section id="home" className={`hero shell commercial-hero ${photo ? '' : 'hero-without-photo'}`}>
    <div className="hero-copy">
      {path !== '/' && <nav className="breadcrumbs" aria-label="Хлібні крихти"><a href="/">Головна</a><span aria-hidden="true"> / </span><span>{page.name}</span></nav>}
      <Eyebrow>BEAUTY SPACE VICTORIYA</Eyebrow>
      <h1 className="hero-heading">{pageHeading(path, studio.city)}</h1>
      <a href="#contacts" className="hero-location"><MapPin size={18} /><span>{studio.city} · {studio.address}{studio.floor ? ` · ${studio.floor}` : ''}</span></a>
      <p className="hero-description">Обери процедуру, переглянь наші роботи та напиши, щоб погодити час візиту.</p>
      {selected.length > 0 && <dl className="hero-prices" aria-label="Приклади актуальних цін">{selected.map((item, index) => <div key={index}><dt>{item.name}{item.detail && <small>{item.detail}</small>}</dt><dd>{item.price}</dd></div>)}</dl>}
      <div className="hero-actions"><BookingLink /><a className="text-link" href={`tel:${studio.phone}`}><Phone size={16} />{studio.phoneDisplay}</a></div>
      <p className="booking-note">Запис у Direct або телефоном · час підтверджуємо особисто</p>
      <div className="hero-jumps"><a href="#services">Усі ціни <ArrowDown size={15} /></a><a href="#gallery">Переглянути роботи <ArrowDown size={15} /></a></div>
    </div>
    {photo && <figure className="hero-visual work-hero">
      <a href="#gallery" aria-label="Переглянути роботи студії"><img src={photo.src} width="1200" height="1600" alt={galleryAlt(photo)} fetchPriority="high" className="hero-photo" /></a>
      <figcaption><span>РОБОТА BEAUTY SPACE VICTORIYA</span><span>{photo.title}</span></figcaption>
    </figure>}
  </section>;
}
