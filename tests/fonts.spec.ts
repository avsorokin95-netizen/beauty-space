import { test, expect } from '@playwright/test';

test('Ukrainian and Latin fonts load locally without Google Fonts', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.route('https://fonts.googleapis.com/**', (route) => route.abort());
  await page.route('https://fonts.gstatic.com/**', (route) => route.abort());
  await page.route('https://maps.google.com/**', (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('#home h1')).toBeVisible();
  const loaded = await page.evaluate(async () => {
    const sample = 'Іі Її Єє Ґґ Beauty 0123';
    const faces = await Promise.all([
      document.fonts.load('400 24px "Cormorant Garamond"', sample),
      document.fonts.load('italic 500 24px "Cormorant Garamond"', sample),
      document.fonts.load('600 14px "Manrope"', sample),
    ]);
    return faces.map((variants) => variants.length > 0 && variants.every((font) => font.status === 'loaded'));
  });
  expect(loaded).toEqual([true, true, true]);
  expect(requests.filter((url) => /fonts\.(googleapis|gstatic)\.com/.test(url))).toEqual([]);
  expect(requests.some((url) => url.includes('.woff2'))).toBeTruthy();
});
