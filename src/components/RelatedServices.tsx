import { publicPages, type PublicPath } from '../../shared/pages';
import { usePrices } from '../hooks/usePrices';
import { Eyebrow } from './ui';
export function RelatedServices({ path }: { path: PublicPath }) {
  const { prices } = usePrices();
  return <section className="shell section related-services" aria-labelledby="related-title">
    <Eyebrow>ТАКОЖ У СТУДІЇ</Eyebrow><h2 id="related-title">Ще трохи <em>часу для себе</em></h2>
    <div className="related-grid">{(Object.keys(publicPages) as PublicPath[]).filter((item) => item !== path).map((href) => {
      const page = publicPages[href];
      const first = prices?.[page.category]?.items[0];
      return <a key={href} href={href} className="related-card"><h3>{page.name} <span aria-hidden="true">↗</span></h3>{first && <p>{first.name}{first.detail ? ` · ${first.detail}` : ''}<strong>{first.price}</strong></p>}<span>Варіанти процедури, ціни та роботи</span></a>;
    })}</div>
  </section>;
}
