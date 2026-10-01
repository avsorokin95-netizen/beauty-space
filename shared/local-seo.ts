import { contactView, type ContactData } from './contacts.ts';
import type { PriceDocument } from './pricing.ts';
import { publicPages, type PublicPath } from './pages.ts';

export function localStudioContent(contacts: ContactData, prices?: PriceDocument['prices'], path: PublicPath = '/') {
  const studio = contactView(contacts);
  const first = prices?.[publicPages[path].category]?.items[0];
  const local = studio.city === 'Софіївська Борщагівка';
  return {
    heading: 'Перед візитом',
    intro: local
      ? `Студія розташована у Софіївській Борщагівці: ${studio.address}. Якщо ти їдеш із ЖК «Софія» або Вишневого, побудуй маршрут від своєї адреси — карта покаже актуальний шлях. Час візиту погодь заздалегідь.`
      : `Наша адреса: ${studio.city}, ${studio.address}. Перевір маршрут і погодь час перед візитом.`,
    questions: [
      { question: 'Як знайти студію?', answer: `${studio.city}, ${studio.address}.${studio.floor ? ` ${studio.floor}.` : ''}${studio.directionsVideo ? ' Біля карти є відео, як знайти вхід.' : ''} Кнопка «Прокласти маршрут» відкриває Google Maps.` },
      { question: 'Як записатися та що написати?', answer: `Напиши в Instagram Direct або зателефонуй ${studio.phone}. Вкажи послугу й зручний день. Уточни потрібний склад процедури. Запис підтверджуємо особисто; натискання кнопки не резервує час.` },
      { question: 'Де подивитися вартість?', answer: `${first ? `Наприклад, ${first.name.toLowerCase()} — ${first.price}. ` : ''}Повний прайс наведено вище. Перевір склад обраної процедури й додаткові послуги. Варіанти цін через «/» уточни під час запису.` },
      { question: 'Коли можна прийти та скільки часу закласти?', answer: `${studio.hours ? `Графік: ${studio.hours}. ` : ''}Працюємо за попереднім записом. Вільний час і тривалість саме твоєї процедури уточни перед візитом.` },
    ],
  };
}
