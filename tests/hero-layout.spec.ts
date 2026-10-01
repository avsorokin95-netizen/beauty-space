import { test, expect, type Page } from '@playwright/test';

async function expectSeparatedCaption(page: Page, oneLine: boolean) {
  const geometry = await page.locator('#home').evaluate((hero) => {
    const image = hero.querySelector<HTMLImageElement>('.hero-photo')!;
    const photo = image.getBoundingClientRect();
    const caption = hero.querySelector('figcaption')!.getBoundingClientRect();
    const title = hero.querySelector('figcaption span:last-child')!;
    const offer = hero.querySelector('.hero-offer')!.getBoundingClientRect();
    const content = innerWidth < 768 ? offer : hero.querySelector('.hero-copy')!.getBoundingClientRect();
    const minimumHeight = parseFloat(getComputedStyle(hero.querySelector('.hero-image-frame')!).minHeight);
    const booking = hero.querySelector('.hero-booking')!.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(title);
    return {
      photoTop: photo.top, photoBottom: photo.bottom, photoRight: photo.right, photoHeight: photo.height,
      contentTop: content.top, contentBottom: content.bottom, contentHeight: content.height, minimumHeight,
      objectFit: getComputedStyle(image).objectFit,
      photoCenter: photo.x + photo.width / 2,
      captionTop: caption.top, captionBottom: caption.bottom, captionLeft: caption.left, captionRight: caption.right,
      captionCenter: caption.x + caption.width / 2,
      offerLeft: offer.left, offerBottom: offer.bottom, bookingTop: booking.top,
      lines: range.getClientRects().length, width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
    };
  });
  expect(geometry.photoHeight).toBeGreaterThan(0);
  expect(geometry.objectFit).toBe('cover');
  expect(geometry.photoHeight).toBeGreaterThanOrEqual(geometry.minimumHeight - 1);
  expect(Math.abs(geometry.photoTop - geometry.contentTop)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.photoBottom - geometry.contentBottom)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.photoHeight - geometry.contentHeight)).toBeLessThanOrEqual(1);
  expect(geometry.captionTop).toBeGreaterThanOrEqual(geometry.photoBottom - 1);
  expect(geometry.captionTop - geometry.photoBottom).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.captionCenter - geometry.photoCenter)).toBeLessThanOrEqual(1);
  expect(geometry.captionLeft).toBeGreaterThanOrEqual(0);
  expect(geometry.captionRight).toBeLessThanOrEqual(geometry.width);
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.width);
  if (oneLine) expect(geometry.lines).toBe(1);
  if (geometry.width < 768) {
    expect(geometry.photoRight).toBeLessThan(geometry.offerLeft);
    if (geometry.captionTop < geometry.offerBottom) expect(geometry.captionRight).toBeLessThan(geometry.offerLeft);
    expect(geometry.bookingTop).toBeGreaterThan(geometry.captionBottom);
    expect(geometry.bookingTop).toBeGreaterThan(geometry.offerBottom);
  }
}

test('hero photos match content height and keep centered captions below', async ({ page }, info) => {
  await page.route(/^https:\/\/(?:maps|www)\.google\.com\/maps/, (route) => route.abort());
  const widths = info.project.name === 'desktop'
    ? [768, 1024, 1100, 1101, 1200, 1440, 1024, 768]
    : [320, 390, 393, 402, 430, 480, 767, 768, 1101, 767, 402, 320];
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

  // Short content respects the photo minimum; longer content grows both columns.
  await page.locator('.hero-prices').evaluate((prices) => prices.replaceChildren());
  await expectSeparatedCaption(page, false);
  const minimumPhotoHeight = await page.locator('.hero-photo').evaluate((image) => image.getBoundingClientRect().height);
  await page.locator('.hero-prices').evaluate((prices) => {
    prices.textContent = 'Індивідуальний догляд та деталі процедури. '.repeat(35);
  });
  await expectSeparatedCaption(page, false);
  expect(await page.locator('.hero-photo').evaluate((image) => image.getBoundingClientRect().height)).toBeGreaterThan(minimumPhotoHeight);
});
