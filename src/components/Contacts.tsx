import { studioHours } from '../../shared/hours';
import { BrandStar } from "./BrandStar";
import { useContacts } from "../hooks/useContacts";
import { ArrowUpRight, Camera, MapPin, Phone, Send } from "lucide-react";
import { navigation } from "../data/studio";
import { BookingLink, Eyebrow, Reveal } from "./ui";
import { Logo } from "./Header";
import { StudioMap } from "./StudioMap";
export function Contacts() {
  const studio = useContacts();
  return (
    <>
      <section id="contacts" className="contact-section section">
        <div className="shell contact-grid">
          <Reveal>
            <Eyebrow>ЗАЛИШ ТРОХИ ЧАСУ ДЛЯ СЕБЕ</Eyebrow>
            <h2>
              Твій наступний
              <br />
              <em>beauty moment.</em>
            </h2>
            <p>
              Напиши нам — підберемо послугу
              <br />
              та зручний час для зустрічі.
            </p>
            <BookingLink className="button-light" />
            <span className="contact-flower" aria-hidden="true">
              <BrandStar />
            </span>
          </Reveal>
          <Reveal className="contact-details">
            <p className="contact-hours">{studioHours.display} · За попереднім записом</p>
            <a href={`tel:${studio.phone}`} className="contact-item">
              <Phone size={21} />
              <div>
                <span>ЗАТЕЛЕФОНУЙ НАМ</span>
                <h3>{studio.phoneDisplay}</h3>
                <small>
                  Зателефонувати <ArrowUpRight size={14} />
                </small>
              </div>
            </a>
            <a
              href={studio.map}
              target="_blank"
              rel="noopener noreferrer"
              className="contact-item"
            >
              <MapPin size={21} />
              <div>
                <span>ЧЕКАЄМО НА ТЕБЕ</span>
                <h3>{studio.address}</h3>
                <p>{studio.city}</p>
                <small>
                  Прокласти маршрут <ArrowUpRight size={14} />
                </small>
              </div>
            </a>
            <a
              href={studio.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="contact-item"
            >
              <Camera size={21} />
              <div>
                <span>НАТХНЕННЯ ТА НОВИНИ</span>
                <h3>{studio.instagramHandle}</h3>
                <small>
                  Зазирнути в Instagram <ArrowUpRight size={14} />
                </small>
              </div>
            </a>
            <a
              href={studio.telegram}
              target="_blank"
              rel="noopener noreferrer"
              className="contact-item"
            >
              <Send size={21} />
              <div>
                <span>ЩЕ ОДИН СПОСІБ ЗВ’ЯЗКУ</span>
                <h3>Зустрінемось у Telegram</h3>
                <small>
                  Перейти за посиланням студії <ArrowUpRight size={14} />
                </small>
              </div>
            </a>
          </Reveal>
        </div>
        <StudioMap />
      </section>
      <footer className="shell footer">
        <Logo />
        <p>© {new Date().getFullYear()} Beauty Space Victoriya</p>
        <nav aria-label="Навігація в підвалі">
          {navigation
            .filter((item) => ["#services", "#contacts"].includes(item.href))
            .map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
          <a href="#home" aria-label="На початок сторінки">
            Нагору ↑
          </a>
        </nav>
      </footer>
    </>
  );
}
