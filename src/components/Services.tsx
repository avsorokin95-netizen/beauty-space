import { useContacts } from "../hooks/useContacts";
import { useState } from "react";
import { Plus, Minus, ArrowUpRight } from "lucide-react";
import { services } from "../data/studio";
import { usePrices } from "../hooks/usePrices";
import { Eyebrow, Reveal } from "./ui";
export function Services() {
  const studio = useContacts();
  const [active, setActive] = useState<string | null>("nails");
  const { prices, error, retry } = usePrices();
  return (
    <section id="services" className="services-section section">
      <div className="shell">
        <Reveal className="section-heading">
          <div>
            <Eyebrow>МЕНЮ ТВОЄЇ КРАСИ</Eyebrow>
            <h2>
              Маленькі деталі.
              <br />
              <em>Особливе відчуття.</em>
            </h2>
          </div>
          <p>
            Обери те, що зробить твій день кращим.
            <br />
            Про решту домовимось у повідомленнях.
          </p>
        </Reveal>
        {error && (
          <p className="pricing-error" role="status">
            {prices
              ? "Не вдалося перевірити оновлення прайсу. Уточни актуальну ціну під час запису."
              : "Не вдалося завантажити прайс."}{" "}
            <button type="button" onClick={retry}>
              Спробувати ще раз
            </button>
          </p>
        )}
        {!prices && !error && (
          <p role="status" className="price-note">
            Завантажуємо актуальний прайс…
          </p>
        )}
        {prices && (
          <div className="service-list">
            {services.map((service) => (
              <Reveal key={service.id}>
                <article
                  className="service-row"
                  data-open={active === service.id}
                >
                  <button
                    className="service-toggle"
                    aria-expanded={active === service.id}
                    aria-controls={`service-${service.id}`}
                    onClick={() =>
                      setActive(active === service.id ? null : service.id)
                    }
                  >
                    <span className="service-number">{service.number}</span>
                    <span className="service-title">
                      {service.name}
                      <small>{service.english}</small>
                    </span>
                    <span className="service-teaser">
                      {service.description}
                    </span>
                    <span className="service-price">
                      {prices[service.id].summary}
                    </span>
                    <span className="service-plus">
                      {active === service.id ? (
                        <Minus size={18} />
                      ) : (
                        <Plus size={18} />
                      )}
                    </span>
                  </button>
                  <div
                    id={`service-${service.id}`}
                    hidden={active !== service.id}
                    className="service-detail"
                  >
                    <dl className="price-list">
                      {prices[service.id].items.map((item, index) => (
                        <div
                          className="price-item"
                          key={`${service.id}-${index}`}
                        >
                          <dt>
                            {item.name}
                            {item.detail && <span>{item.detail}</span>}
                          </dt>
                          <dd>{item.price}</dd>
                        </div>
                      ))}
                    </dl>
                    {prices[service.id].note && (
                      <p className="service-note">{prices[service.id].note}</p>
                    )}
                    <a
                      className="text-link"
                      href={studio.direct}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Записатися на послугу <ArrowUpRight size={16} />
                    </a>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        )}
        <p className="price-note">
          Ціни в гривнях. Варіанти через «/» та тривалість процедури уточнюй під
          час запису.{" "}
          <a
            href="https://www.instagram.com/stories/highlights/18113905729937258/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Прайс в Instagram <ArrowUpRight size={13} />
          </a>
        </p>
      </div>
    </section>
  );
}
