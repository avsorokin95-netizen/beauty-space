import { localStudioContent } from '../../shared/local-seo';
import { useContacts } from '../hooks/useContacts';
import { usePrices } from '../hooks/usePrices';
import { Eyebrow } from './ui';

export function LocalInfo() {
  const studio = useContacts();
  const { prices } = usePrices();
  const content = localStudioContent(studio, prices ?? undefined);
  return (
    <section className="section shell local-info" aria-labelledby="local-info-title">
      <div>
        <Eyebrow>ПЕРЕД ТВОЇМ ВІЗИТОМ</Eyebrow>
        <h2 id="local-info-title">{content.heading}</h2>
        <p>{content.intro}</p>
        <a className="text-link" href={studio.map} target="_blank" rel="noopener noreferrer">Прокласти маршрут ↗</a>
      </div>
      <div className="local-questions">
        {content.questions.map(({ question, answer }) => (
          <details key={question}>
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
