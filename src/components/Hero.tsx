import { BrandStar } from "./BrandStar";
import { useRef } from "react";
import { useHeroParallax } from "../hooks/useHeroParallax";
import { ArrowDown, MapPin } from "lucide-react";
import { BookingLink, Eyebrow, Reveal } from "./ui";
import { useContacts } from "../hooks/useContacts";

export function Hero() {
  const studio = useContacts();
  const heading = studio.city === "Софіївська Борщагівка"
    ? "Манікюр для мешканців ЖК «Софія»"
    : `Манікюр і педикюр · ${studio.city}`;
  const ref = useRef<HTMLElement>(null);
  const photo = useRef<HTMLImageElement>(null);
  useHeroParallax(ref, photo);
  return (
    <section id="home" className="hero shell" ref={ref}>
      <div className="hero-copy">
        <Reveal>
          <Eyebrow>ТВІЙ BEAUTY ПРОСТІР КРАСИ</Eyebrow>
          <p className="hero-slogan">
            Краса починається
            <br />з <em>любові</em>
            <br />
            до себе<span className="rose-dot">.</span>
          </p>
          <h1 className="hero-heading">{heading}</h1>
          <p className="hero-description">
            Педикюр, брови та вії.
            <br />
            Твій час для себе у Beauty Space Victoriya.
          </p>
          <BookingLink />
          <p className="booking-note">
            Твій час для себе — за одним повідомленням
          </p>
        </Reveal>
        <a href="/#contacts" className="hero-location">
          <MapPin size={16} />
          <span>{studio.city} · {studio.address}</span>
        </a>
      </div>
      <div className="hero-visual">
        <img
          ref={photo}
          src="/images/manicure.webp"
          srcSet="/images/manicure-480.webp 480w, /images/manicure-800.webp 800w, /images/manicure.webp 1200w"
          sizes="(max-width: 767px) calc(100vw - 40px), (max-width: 1100px) calc((100vw - 89px) / 2.05), (max-width: 1384px) calc((100vw - 149px) / 2.05), 603px"
          width="1200"
          height="1500"
          alt="Манікюр у темних відтінках — атмосферне фото для настрою"
          fetchPriority="high"
          className="hero-photo"
        />
        <span className="photo-credit">BEAUTY MOOD · ФОТО ДЛЯ НАСТРОЮ</span>
        <div className="image-word">
          a little time
          <br />
          <em>for yourself</em>
        </div>
        <div className="round-badge">
          <span>ТУРБОТА В КОЖНІЙ</span>
          <span className="badge-star"><BrandStar /></span>
          <span>МАЛЕНЬКІЙ ДЕТАЛІ</span>
        </div>
      </div>
      <a className="scroll-link" href="#about">
        <ArrowDown size={15} /> ПОЗНАЙОМИМОСЬ БЛИЖЧЕ
      </a>
    </section>
  );
}
