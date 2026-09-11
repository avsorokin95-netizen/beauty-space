import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { ArrowDown, MapPin } from "lucide-react";
import { BookingLink, Eyebrow, Reveal } from "./ui";
import { useContacts } from "../hooks/useContacts";

export function Hero() {
  const studio = useContacts();
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "12%"]);
  return (
    <section id="home" className="hero shell" ref={ref}>
      <div className="hero-copy">
        <Reveal>
          <Eyebrow>ТВІЙ BEAUTY ПРОСТІР КРАСИ</Eyebrow>
          <h1>
            Краса починається
            <br />з <em>любові</em>
            <br />
            до себе<span className="rose-dot">.</span>
          </h1>
          <p className="hero-description">
            Місце, де можна сповільнитися.
            <br />
            Подбати про себе. І просто бути собою.
          </p>
          <BookingLink />
          <p className="booking-note">
            Твій час для себе — за одним повідомленням
          </p>
        </Reveal>
        <a href="#contacts" className="hero-location">
          <MapPin size={16} />
          <span>{studio.city} · {studio.address}</span>
        </a>
      </div>
      <div className="hero-visual">
        <motion.img
          style={{ y: reduced ? 0 : y }}
          src="/images/manicure.webp"
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
          <span className="badge-star">✳</span>
          <span>МАЛЕНЬКІЙ ДЕТАЛІ</span>
        </div>
      </div>
      <a className="scroll-link" href="#about">
        <ArrowDown size={15} /> ПОЗНАЙОМИМОСЬ БЛИЖЧЕ
      </a>
    </section>
  );
}
