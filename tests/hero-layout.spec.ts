import { test, expect, type Page } from '@playwright/test';

async function expectSeparatedCaption(page: Page, oneLine: boolean) {
  const geometry = await page.locator('#home').evaluate((hero) => {
    const photo = hero.querySelector('.hero-photo')!.getBoundingClientRect();
    const caption = hero.querySelector('figcaption')!.getBoundingClientRect();
    const title = hero.querySelector('figcaption span:last-child')!;
    const offer = hero.querySelector('.hero-offer')!.getBoundingClientRect();
    const booking = hero.querySelector('.hero-booking')!.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(title);
    return {
      photoBottom: photo.bottom, photoRight: photo.right, photoHeight: photo.height,
      photoCenter: photo.x + photo.width / 2,
      captionTop: caption.top, captionBottom: caption.bottom, captionLeft: caption.left, captionRight: caption.right,
      captionCenter: caption.x + caption.width / 2,
      offerLeft: offer.left, offerBottom: offer.bottom, bookingTop: booking.top,
      lines: range.getClientRects().length, width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
    };
  });
  expect(geometry.photoHeight).toBeGreaterThan(0);
  expect(geometry.captionTop).toBeGreaterThanOrEqual(geometry.photoBottom - 1);
  expect(Math.abs(geometry.captionCenter - geometry.photoCenter)).toBeLessThanOrEqual(1);
  expect(geometry.captionLeft).toBeGreaterThanOrEqual(0);
  expect(geometry.captionRight).toBeLessThanOrEqual(geometry.width);
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.width);
  if (oneLine) expect(geometry.lines).toBe(1);
  if (geometry.width < 768) {
    expect(geometry.photoRight).toBeLessThan(geometry.offerLeft);
    expect(geometry.captionTop).toBeGreaterThan(geometry.offerBottom);
    expect(geometry.bookingTop).toBeGreaterThan(geometry.captionBottom);
  }
}

test('hero captions stay below the photo and short titles use one line', async ({ page }, info) => {
  await page.route(/^https:\/\/(?:maps|www)\.google\.com\/maps/, (route) => route.abort());
  const widths = info.project.name === 'desktop' ? [768, 1024, 1440] : [320, 390, 393, 402, 430, 767];
  for (const path of ['/', '/pedicure', '/laminuvannia-vii']) {
    await page.goto(path);
    await page.locator('.hero-photo').evaluate(async (image: HTMLImageElement) => { await image.decode(); await document.fonts.ready; });
    for (const width of widths) {
      await page.setViewportSize({ width, height: 874 });
      await expectSeparatedCaption(page, true);
    }
  }

  // Owner titles can be longer than the defaults; they must wrap without
  // widening the image into the prices or colliding with the booking buttons.
  await page.setViewportSize({ width: 402, height: 874 });
  await page.locator('figcaption span:last-child').evaluate((title) => {
    title.textContent = 'Ніжний природний результат та індивідуальний догляд за віями';
    (title as HTMLElement).style.fontSize = '40px';
  });
  await expectSeparatedCaption(page, false);
});
