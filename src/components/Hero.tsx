import { ArrowDown, MapPin, Phone } from 'lucide-react';
import { BookingLink, Eyebrow } from './ui';
import { useContacts } from '../hooks/useContacts';
import { usePrices } from '../hooks/usePrices';
import { useGallery } from '../hooks/useGallery';
import { galleryAlt } from '../../shared/gallery-descriptions';
import { pageHeading, publicPages, type PublicPath } from '../../shared/pages';
import { heroImages } from '../data/hero-images';

export function Hero({ path = '/' }: { path?: PublicPath }) {
  const studio = useContacts();
  const { prices } = usePrices();
  const { posts = [] } = useGallery();
  const page = publicPages[path];
  const cover = posts.find((post) => post.placement === `hero-${page.category}`);
  const atmosphere = heroImages[page.category];
  const imageBase = `/images/hero/${atmosphere.name}`;
  const selected = prices?.[page.category]?.items.slice(0, 2) ?? [];
  return <section id="home" className="hero shell commercial-hero">
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
    <figure className="hero-visual work-hero">
      <img src={cover?.src ?? `${imageBase}-800.webp`}
        srcSet={cover ? undefined : `${imageBase}-480.webp 480w, ${imageBase}-800.webp 800w, ${imageBase}-1120.webp 1120w`}
        sizes={cover ? undefined : '(max-width: 767px) calc(100vw - 40px), (max-width: 1100px) calc((100vw - 99px) / 2), 600px'}
        width="1120" height="1400" alt={cover ? galleryAlt(cover) : atmosphere.alt} fetchPriority="high" className="hero-photo" />
      <figcaption><span>АТМОСФЕРНЕ ЗОБРАЖЕННЯ</span><span>{cover?.title ?? atmosphere.title}</span></figcaption>
    </figure>
  </section>;
}
