interface HeroImage {
  src: string;
  srcSet?: string;
  width: number;
  height: number;
  caption: string;
  title: string;
  alt: string;
}

/** Default covers: the owner's manicure photo and two decorative images. */
export const heroImages: Record<'nails' | 'pedicure' | 'lashes', HeroImage> = {
  nails: {
    src: '/images/pink-floral.webp',
    srcSet: '/images/hero/manicure-pink-floral-480.webp 480w, /images/hero/manicure-pink-floral-640.webp 640w, /images/pink-floral.webp 900w',
    width: 900,
    height: 1600,
    caption: 'РОБОТА BEAUTY SPACE VICTORIYA',
    title: 'Ніжність у деталях',
    alt: 'Рожевий манікюр на мигдалеподібних нігтях із дрібним квітковим декором.',
  },
  pedicure: {
    src: '/images/hero/pedicure-800.webp',
    srcSet: '/images/hero/pedicure-480.webp 480w, /images/hero/pedicure-640.webp 640w, /images/hero/pedicure-800.webp 800w, /images/hero/pedicure-1120.webp 1120w',
    width: 1120,
    height: 1400,
    caption: 'АТМОСФЕРНЕ ЗОБРАЖЕННЯ',
    title: 'Легкість і догляд',
    alt: 'Ілюстративне зображення стоп із ніжно-рожевим педикюром на світлій тканині',
  },
  lashes: {
    src: '/images/hero/lashes-800.webp',
    srcSet: '/images/hero/lashes-480.webp 480w, /images/hero/lashes-640.webp 640w, /images/hero/lashes-800.webp 800w, /images/hero/lashes-1120.webp 1120w',
    width: 1120,
    height: 1400,
    caption: 'АТМОСФЕРНЕ ЗОБРАЖЕННЯ',
    title: 'Природна виразність',
    alt: 'Ілюстративний портрет жінки з опущеними повіками та виразними віями',
  },
};
