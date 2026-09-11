export interface PriceItem {
  name: string;
  detail?: string;
  price: string;
}

export interface ServicePricing {
  summary: string;
  note?: string;
  items: PriceItem[];
}

// Transcribed from the user's two screenshots. Preserve slash-separated prices
// without guessing which amount corresponds to which variant.
export const prices: Record<string, ServicePricing> = {
  nails: {
    summary: "від 550 грн",
    note: "Нарощення всіх нігтів майстер не виконує.",
    items: [
      {
        name: "Манікюр без покриття",
        detail: "Комбінований",
        price: "550 грн",
      },
      {
        name: "Манікюр комплекс з укріпленням",
        detail: "Зняття, манікюр, покриття зі зміцненням",
        price: "900 грн",
      },
      {
        name: "Комплекс зміцнення + реставрація",
        detail: "Підняття клюючих нігтів / донарощення кутів чи нігтя",
        price: "1 000 грн",
      },
      { name: "Чоловічий манікюр", price: "600 грн" },
      { name: "Нарощення 1 нігтя (ремонт)", price: "50/70 грн" },
      { name: "Френч / втирка", price: "100 грн" },
      {
        name: "Зняття після іншого майстра",
        detail: "У випадку, якщо знімати багато і важко",
        price: "50/100 грн",
      },
    ],
  },
  pedicure: {
    summary: "від 200 грн",
    items: [
      { name: "Педикюр гігієнічний зі стопою / без", price: "600/700 грн" },
      {
        name: "Комплекс педикюр",
        detail: "Стопа + покриття",
        price: "1 000 грн",
      },
      {
        name: "Комплекс педикюр",
        detail: "Покриття без стопи",
        price: "900 грн",
      },
      { name: "Стопа окремо — чистка", price: "200 грн" },
    ],
  },
  brows: {
    summary: "від 350 грн",
    items: [
      {
        name: "Оформлення брів",
        detail: "Корекція, фарбування",
        price: "550 грн",
      },
      { name: "Корекція брів віском/пінцетом", price: "350 грн" },
      { name: "Фарбування брів", price: "350 грн" },
      { name: "Ламінування брів", price: "750 грн" },
      {
        name: "Комплекс: ламінування брів",
        detail: "Ламікорекція, фарбування, доглядовий комплекс",
        price: "850 грн",
      },
    ],
  },
  lashes: {
    summary: "від 200 грн",
    items: [
      {
        name: "Ламінування вій + фарбування",
        detail: "Доглядовий комплекс",
        price: "800 грн",
      },
      { name: "Ламінування вій", price: "700 грн" },
      { name: "Фарбування вій", price: "300 грн" },
      { name: "Зняття нарощених вій", price: "200 грн" },
    ],
  },
  sets: {
    summary: "від 1 350 грн",
    items: [
      {
        name: "Ламінування вій + ламінування брів",
        detail:
          "Брови: ламінування, корекція, фарбування, доглядовий комплекс. Вії: ламінування, фарбування, доглядовий комплекс.",
        price: "1 500 грн",
      },
      {
        name: "Ламінування вій + ламінування брів",
        detail:
          "Ламінування брів без корекції та фарбування; ламінування вій без фарбування.",
        price: "1 350 грн",
      },
    ],
  },
  depilation: {
    summary: "150 грн",
    items: [
      {
        name: "Воскова депіляція",
        detail: "Зона верхньої та нижньої губи",
        price: "150 грн",
      },
    ],
  },
};
