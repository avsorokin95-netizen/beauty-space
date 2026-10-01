import { useContacts } from "../hooks/useContacts";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Plus, Minus, ArrowUpRight } from "lucide-react";
import { services } from "../data/studio";
import { categoryContent } from "../../shared/pricing";
import { publicPages, type PublicPath } from "../../shared/pages";
import { usePrices } from "../hooks/usePrices";
import { Eyebrow, Reveal } from "./ui";
const subscribeToClient = () => () => {};

export function Services({ path = "/" }: { path?: PublicPath }) {
  const page = publicPages[path];
  const studio = useContacts();
  const [active, setActive] = useState<string | null>(page.category);
  useEffect(() => {
    const followFragment = () => {
      const id = window.location.hash.replace(/^#service-/, '');
      const visible = services.some((service) => service.id === id && (path === '/' || id === page.category || (path === '/laminuvannia-vii' && id === 'sets')));
      if (visible) setActive(id);
    };
    followFragment();
    window.addEventListener('hashchange', followFragment);
    return () => window.removeEventListener('hashchange', followFragment);
  }, [path, page.category]);
  const enhanced = useSyncExternalStore(subscribeToClient, () => true, () => false);
  const { prices, error, retry } = usePrices();
  return (
    <section id="services" className="services-section section">
      <div className="shell">
        <Reveal className="section-heading">
          <div>
            <Eyebrow>ПРОЦЕДУРИ ТА ВАРТІСТЬ</Eyebrow>
            <h2>
              {path === '/' ? 'Послуги та ціни' : `${page.name}: послуги та ціни`}
            </h2>
          </div>
          <p>
            Порівняй склад процедур і переглянь ціни.
            <br />
            Під час запису узгодимо потрібні деталі.
            {path !== '/' && <><br /><a className="text-link full-price-link" href="/#services">Повний прайс студії <ArrowUpRight size={16} aria-hidden="true" /></a></>}
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
            {services.filter((service) => path === "/" || service.id === page.category || (path === "/laminuvannia-vii" && service.id === "sets")).map((service) => (
              <Reveal key={service.id}>
                <details
                  id={`category-${service.id}`}
                  className="service-row"
                  open={active === service.id}
                  data-open={active === service.id}
                  onToggle={(event) => {
                    if (event.currentTarget.open) setActive(service.id);
                    else setActive((current) => current === service.id ? null : current);
                  }}
                >
                  <summary
                    className="service-toggle"
                    role="button"
                    aria-expanded={enhanced ? active === service.id : undefined}
                    aria-controls={`service-${service.id}`}
                    onClick={(event) => {
                      event.preventDefault();
                      setActive(active === service.id ? null : service.id);
                    }}
                  >
                    <span className="service-number">{service.number}</span>
                    <span className="service-title">
                      {service.name}
                      <small>{service.english}</small>
                    </span>
                    <span className="service-teaser">
                      {prices[service.id].items[0]?.name}
                    </span>
                    <span className="service-price">
                      {prices[service.id].items[0]?.price}
                    </span>
                    <span className="service-plus">
                      {active === service.id ? (
                        <Minus size={18} />
                      ) : (
                        <Plus size={18} />
                      )}
                    </span>
                  </summary>
                  <div
                    id={`service-${service.id}`}
                    className="service-detail"
                  >
                    <p className="service-note service-summary">Окремі процедури та доповнення: {prices[service.id].summary}. Вартість обраної послуги — у прайсі нижче.</p>
                    <div className="service-guide">
                      <p>
                        <strong>Що обрати</strong>
                        {categoryContent(prices[service.id], service.id).overview}
                      </p>
                      <p>
                        <strong>Перед записом</strong>
                        {categoryContent(prices[service.id], service.id).booking}
                      </p>
                    </div>
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
                      data-analytics="booking" href={studio.direct}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Записатися на послугу <ArrowUpRight size={16} />
                    </a>
                  </div>
                </details>
              </Reveal>
            ))}
          </div>
        )}
        <p className="price-note">
          Ціни в гривнях. Варіанти через «/» та тривалість процедури уточнюй під
          час запису.{" "}
          Потрібна допомога з вибором? Напиши, яку процедуру плануєш.
        </p>
      </div>
    </section>
  );
}
