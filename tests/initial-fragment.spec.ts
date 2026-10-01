import { expect, test } from '@playwright/test';

test('full price links scroll to the loaded price section and do not repeat on refresh', async ({ page }) => {
  await page.route(/^https:\/\/(?:maps|www)\.google\.com\/maps/, route => route.abort());
  let contactsReady = Promise.resolve();
  let pricesReady = Promise.resolve();
  await page.route('**/api/contacts', async route => { await contactsReady; await route.continue(); });
  await page.route('**/api/prices', async route => { await pricesReady; await route.continue(); });

  for (const path of ['/pedicure', '/laminuvannia-vii']) {
    await page.goto(path);
    await expect(page.locator('.service-row')).not.toHaveCount(0);
    let releaseContacts!: () => void;
    let releasePrices!: () => void;
    contactsReady = new Promise(resolve => { releaseContacts = resolve; });
    pricesReady = new Promise(resolve => { releasePrices = resolve; });

    await page.getByRole('link', { name: 'Повний прайс студії' }).click();
    await expect(page).toHaveURL('/#services');
    await expect(page.getByRole('status')).toContainText('Відкриваємо');
    releaseContacts();
    await expect(page.locator('#services')).toBeAttached();
    releasePrices();
    await expect(page.locator('.service-row')).toHaveCount(6);
    await expect.poll(() => page.locator('#services').evaluate(section => {
      const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop);
      return Math.abs(section.getBoundingClientRect().top - padding);
    })).toBeLessThanOrEqual(2);
    await expect(page.getByRole('heading', { name: 'Послуги та ціни', exact: true })).toBeInViewport();
    expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0);

    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await Promise.all([
      page.waitForResponse(response => response.url().endsWith('/api/prices') && response.ok()),
      page.waitForResponse(response => response.url().endsWith('/api/contacts') && response.ok()),
      page.evaluate(() => window.dispatchEvent(new Event('focus'))),
    ]);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    expect(await page.evaluate(() => scrollY)).toBe(0);
  }
});

test('interaction while prices load cancels the pending initial scroll', async ({ page }) => {
  await page.route(/^https:\/\/(?:maps|www)\.google\.com\/maps/, route => route.abort());
  let releasePrices!: () => void;
  const pricesReady = new Promise<void>(resolve => { releasePrices = resolve; });
  await page.route('**/api/prices', async route => { await pricesReady; await route.continue(); });
  await page.goto('/#services');
  await expect(page.locator('#services')).toBeAttached();
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.mouse.click(2, 200);
  releasePrices();
  await expect(page.locator('.service-row')).toHaveCount(6);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  expect(await page.evaluate(() => scrollY)).toBe(0);
});
