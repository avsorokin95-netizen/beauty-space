import { BrandStar } from "./BrandStar";
import { ArrowUpRight, Heart, Sparkles, Flower2 } from "lucide-react";
import { Reveal, Eyebrow } from "./ui";
export function About() {
  return (
    <>
      <div className="ribbon" aria-hidden="true">
        <span>МАНІКЮР</span><BrandStar /><span>ПЕДИКЮР</span><BrandStar /><span>БРОВИ</span><BrandStar />
        <span>ВІЇ</span><BrandStar /><span>ЧАС ДЛЯ СЕБЕ</span>
      </div>
      <section id="about" className="section shell about-grid">
        <Reveal className="about-photo-wrap">
          <img
            src="/images/detail.webp"
            alt="Естетика догляду за руками — атмосферне фото"
            width="720"
            height="900"
            loading="lazy"
            className="about-photo"
          />
          <span className="about-photo-note">
            THE ART OF SELF-CARE · ФОТО ДЛЯ НАСТРОЮ
          </span>
          <span className="about-stamp">
            З любов’ю,
            <br />
            <em>Victoriya</em>
          </span>
        </Reveal>
        <Reveal className="about-copy">
          <Eyebrow>ПРО НАШ ПРОСТІР</Eyebrow>
          <h2>
            Більше, ніж догляд.
            <br />
            <em>Твій маленький ритуал.</em>
          </h2>
          <p>
            Beauty Space Victoriya — твій затишний б’юті-простір.
            Тут зустрічаються манікюр, педикюр, догляд
            за бровами та віями.
          </p>
          <p>
            Ми любимо красу в деталях: відтінок під твій настрій, виразний
            погляд і відчуття, що цей час належить лише тобі. Приходь за своїм
            beauty-ритуалом.
          </p>
          <div className="values">
            <div>
              <Heart size={20} />
              <span>Увага до тебе</span>
            </div>
            <div>
              <Sparkles size={20} />
              <span>Краса в деталях</span>
            </div>
            <div>
              <Flower2 size={20} />
              <span>Час для себе</span>
            </div>
          </div>
          <a className="text-link" href="#services">
            Знайти свій ритуал <ArrowUpRight size={17} />
          </a>
        </Reveal>
      </section>
    </>
  );
}
