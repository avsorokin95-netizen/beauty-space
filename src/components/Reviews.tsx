import { ArrowUpRight, Heart, Camera } from "lucide-react";
import { useContacts } from "../hooks/useContacts";
import { Eyebrow, Reveal } from "./ui";

export function Reviews() {
  const studio = useContacts();
  return (
    <section id="reviews" className="reviews-section section">
      <div className="shell">
        <Reveal className="reviews-intro">
          <div>
            <Eyebrow>ВАШІ СЛОВА — НАШЕ НАТХНЕННЯ</Eyebrow>
            <h2>
              Краса в деталях.
              <br />
              <em>Тепло у відгуках.</em>
            </h2>
            <p>
              За кожною роботою — ваша історія.
              <br />
              Дякуємо, що ділитеся враженнями.
            </p>
          </div>
          <a
            href={studio.reviews}
            target="_blank"
            rel="noopener noreferrer"
            className="reviews-source"
          >
            <span className="reviews-heart">
              <Heart size={27} aria-hidden="true" />
            </span>
            <span className="reviews-source-label">ЗБЕРЕЖЕНЕ В INSTAGRAM</span>
            <h3>Відгуки наших клієнток</h3>
            <p>
              Ваші фото, відмітки та враження —<br />у Highlights «відгуки».
            </p>
            <span className="reviews-source-link">
              <Camera size={17} aria-hidden="true" /> Переглянути відгуки{" "}
              <ArrowUpRight size={17} aria-hidden="true" />
            </span>
          </a>
        </Reveal>
      </div>
    </section>
  );
}
