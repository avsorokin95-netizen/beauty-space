import { studioHours } from './hours.ts';
import { studioWayfinding } from './wayfinding.ts';
import type { ContactData } from './contacts.ts';
import type { PriceDocument } from './pricing.ts';

export function localStudioContent(contacts: ContactData, prices?: PriceDocument['prices']) {
  const local = contacts.city === 'Софіївська Борщагівка';
  return {
    heading: `Манікюр · ${contacts.city}`,
    intro: local
      ? `Шукаєш манікюр у Вишневому або в районі ЖК «Софія»? Beauty Space Victoriya приймає у Софіївській Борщагівці за адресою ${contacts.address}. Обери послугу, переглянь роботи та проклади маршрут перед візитом.`
      : `Beauty Space Victoriya: ${contacts.city}, ${contacts.address}. Переглянь послуги, ціни та роботи студії й обери час для себе.`,
    questions: [
      { question: 'Який графік роботи студії?', answer: `${studioHours.display}. Час процедури потрібно погодити заздалегідь — напиши або зателефонуй для запису.` },
      { question: 'Де знаходиться студія?', answer: `Наша адреса: ${contacts.city}, ${contacts.address}. ${studioWayfinding.floor}. Біля карти нижче є посилання на відео, як знайти студію. Перед візитом узгодь час запису.` },
      { question: 'Скільки коштує манікюр?', answer: prices ? `Манікюр — ${prices.nails.summary}. У розділі «Послуги» є окремі ціни на манікюр без покриття, комплекс зі зміцненням, реставрацію та дизайн. Остаточну вартість обраного комплексу уточни під час запису.` : 'Актуальний прайс — у розділі «Послуги». Вартість залежить від покриття, зміцнення та дизайну; уточни обраний комплекс під час запису.' },
      { question: 'Які ще послуги можна обрати?', answer: 'У студії також можна записатися на педикюр, корекцію й фарбування брів, ламінування брів та вій. Перелік процедур і комплекси наведені в прайсі.' },
      { question: 'Як записатися на процедуру?', answer: `Напиши в Instagram або зателефонуй ${contacts.phone}. Вкажи бажану процедуру та зручний день — час візиту погодимо особисто.` },
    ],
  };
}
