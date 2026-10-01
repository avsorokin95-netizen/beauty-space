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
  const defaultImage = heroImages[page.category];
  const imageSrc = cover?.src ?? defaultImage.src;
  const selected = prices?.[page.category]?.items.slice(0, 2) ?? [];
  const heading = pageHeading(path, studio.city);
  return <section id="home" className="hero shell commercial-hero">
    <div className="hero-copy">
      <div className="hero-intro">
        {path !== '/' && <nav className="breadcrumbs" aria-label="Хлібні крихти"><a href="/">Головна</a><span aria-hidden="true"> / </span><span>{page.name}</span></nav>}
        <Eyebrow>BEAUTY SPACE VICTORIYA</Eyebrow>
        <h1 className="hero-heading"><span>{page.name}</span><span className="hero-heading-place">{heading.slice(page.name.length)}</span></h1>
        <a href="#contacts" className="hero-location"><MapPin size={18} /><span><span className="hero-location-city">{studio.city} · </span>{studio.address}{studio.floor ? ` · ${studio.floor}` : ''}</span></a>
        <p className="hero-description">Обери процедуру, переглянь наші роботи та напиши, щоб погодити час візиту.</p>
      </div>
      {selected.length > 0 && <div className="hero-offer">
        <p className="hero-offer-label">Послуги та ціни</p>
        <dl className="hero-prices" aria-label="Приклади актуальних цін">{selected.map((item, index) => <div key={index}><dt>{item.name}{item.detail && <small>{item.detail}</small>}</dt><dd>{item.price}</dd></div>)}</dl>
      </div>}
      <div className="hero-booking">
        <div className="hero-actions"><BookingLink /><a className="text-link" href={`tel:${studio.phone}`} aria-label={`Зателефонувати ${studio.phoneDisplay}`}><Phone size={16} /><span>{studio.phoneDisplay}</span></a></div>
        <p className="booking-note">Запис у Direct або телефоном · час підтверджуємо особисто</p>
        <div className="hero-jumps"><a href="#services">{path === '/' ? 'Усі ціни' : path === '/pedicure' ? 'Ціни на педикюр' : 'Ціни на вії'} <ArrowDown size={15} /></a><a href="#gallery">{path === '/' ? 'Переглянути роботи' : path === '/pedicure' ? 'Роботи з педикюру' : 'Роботи з віями'} <ArrowDown size={15} /></a></div>
      </div>
    </div>
    <figure className="hero-visual work-hero">
      <div className="hero-image-frame">
      <img src={imageSrc}
        srcSet={cover ? undefined : defaultImage.srcSet}
        sizes={cover || !defaultImage.srcSet ? undefined : '(max-width: 767px) min(230px, calc((100vw - 60px) * 0.487)), (max-width: 1100px) calc((100vw - 104px) / 2.2), 600px'}
        width={cover ? 1120 : defaultImage.width} height={cover ? 1400 : defaultImage.height} alt={cover ? galleryAlt(cover) : defaultImage.alt} fetchPriority="high" className={`hero-photo${imageSrc === heroImages.nails.src ? ' hero-photo-manicure' : ''}`} />
      </div>
      <figcaption><span>{cover ? 'ГОЛОВНЕ ФОТО' : defaultImage.caption}</span><span>{cover?.title ?? defaultImage.title}</span></figcaption>
    </figure>
  </section>;
}
