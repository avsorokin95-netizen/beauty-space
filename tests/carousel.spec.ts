import { test, expect } from '@playwright/test';

test('autoplay advances slowly and can be paused', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const region = page.getByRole('region', { name: 'Роботи студії' });
  await expect(page.locator('.gallery-slide').first()).toBeVisible();
  await region.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  const counter = page.locator('.gallery-controls span');
  await expect(counter).toContainText('1 /');
  await expect(counter).toContainText('2 /', { timeout: 9000 });
  await page.getByLabel('Призупинити автоматичне гортання').click();
  const current = await counter.textContent();
  await page.mouse.move(0, 0);
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await page.waitForTimeout(6500);
  await expect(counter).toHaveText(current!);
  await page.getByLabel('Увімкнути автоматичне гортання').click();
  await page.mouse.move(0, 0);
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await expect(counter).not.toHaveText(current!, { timeout: 9000 });
});

test('touch interaction keeps mobile autoplay enabled', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  try {
    await page.goto('http://127.0.0.1:4173');
    await expect(page.locator('.gallery-slide').first()).toBeVisible();
    await page.getByRole('region', { name: 'Роботи студії' }).scrollIntoViewIfNeeded();
    await page.getByLabel('Наступний слайд').tap();
    await expect(page.locator('.gallery-controls span')).toContainText('2 /');
    await expect(page.getByLabel('Призупинити автоматичне гортання')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('.gallery-controls span')).toContainText('3 /', { timeout: 9000 });
    await page.getByRole('button', { name: 'Відкрити роботу 3', exact: true }).tap();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel('Закрити галерею').tap();
    await expect(page.locator('.gallery-controls span')).toContainText('4 /', { timeout: 9000 });
  } finally { await context.close(); }
});
