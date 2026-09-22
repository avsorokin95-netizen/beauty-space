import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import type { ContactDocument } from '../shared/contacts';

test('contacts publish across site, map, booking links and survive reload', async ({ page, browser }, testInfo) => {
  const password = readFileSync('.test-data/admin-access.txt', 'utf8').match(/Password: (.+)/)![1];
  const initial = await (await page.request.get('/api/contacts')).json() as ContactDocument;
  await page.goto('/admin');
  await page.getByLabel('Пароль', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Увійти в адмінку' }).click();
  await page.getByRole('button', { name: 'Контакти', exact: true }).click();
  await expect(page.getByLabel('Телефон', { exact: true })).toHaveValue(initial.contacts.phone);
  try {
    await page.getByLabel('Телефон', { exact: true }).fill('+380501234567');
    await page.getByLabel('Вулиця та будинок').fill('вул. Тестова, 12');
    await page.getByLabel('Населений пункт').fill('Київ');
    await page.getByLabel('Профіль Instagram').fill('https://www.instagram.com/test_studio/');
    await page.getByLabel('Посилання для запису в Direct').fill('https://ig.me/m/test_studio');
    await page.getByRole('button', { name: 'Ціни', exact: true }).click();
    await page.getByRole('button', { name: 'Контакти •', exact: true }).click();
    await expect(page.getByLabel('Телефон', { exact: true })).toHaveValue('+380501234567');
    expect(await (await page.request.get('/api/contacts')).json()).toEqual(initial);
    await page.getByRole('button', { name: 'Опублікувати контакти' }).click();
    await expect(page.getByText('Контакти збережено й опубліковано.', { exact: true })).toBeVisible();
    const visitor = await browser.newContext();
    try {
      const landing = await visitor.newPage();
      await landing.route('https://maps.google.com/**', (route) => route.fulfill({ body: '<html><body>Map</body></html>', contentType: 'text/html' }));
      await landing.goto('http://127.0.0.1:4173/');
      await expect(landing.locator('#contacts a[href="tel:+380501234567"]')).toContainText('+380 50 123 45 67');
      await expect(landing.locator('.hero-location')).toContainText('Київ · вул. Тестова, 12');
      await expect(landing.locator('.header-book')).toHaveAttribute('href', 'https://ig.me/m/test_studio');
      await expect(landing.locator('#contacts h3').filter({ hasText: '@test_studio' })).toBeVisible();
      expect(new URL((await landing.locator('.studio-map iframe').getAttribute('src'))!).searchParams.get('q')).toBe('вул. Тестова, 12, Київ, Україна');
      const schema = await landing.locator('#studio-schema').textContent();
      expect(JSON.parse(schema!).telephone).toBe('+380501234567');
    } finally { await visitor.close(); }
    await page.reload();
    await page.getByRole('button', { name: 'Контакти', exact: true }).click();
    await expect(page.getByLabel('Телефон', { exact: true })).toHaveValue('+380501234567');
    await page.getByLabel('Телефон', { exact: true }).fill('wrong');
    await expect(page.getByRole('button', { name: 'Опублікувати контакти' })).toBeDisabled();
    await page.getByRole('button', { name: 'Скасувати зміни контактів' }).click();
    await page.getByRole('button', { name: 'Так, завантажити контакти' }).click();
    await expect(page.getByLabel('Телефон', { exact: true })).toHaveValue('+380501234567');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.screenshot({ path: `test-results/${testInfo.project.name}-contacts-admin.png`, fullPage: true });
  } finally {
    const latest = await (await page.request.get('/api/contacts')).json() as ContactDocument;
    expect((await page.request.put('/api/admin/contacts', { data: { ...initial, revision: latest.revision }, headers: { Origin: 'http://127.0.0.1:4173' } })).ok()).toBeTruthy();
  }
});

test('contacts fetch can recover from an unavailable API', async ({ page }) => {
  await page.route('**/api/contacts', (route) => route.fulfill({ status: 503, body: '{}' }));
  await page.goto('/');
  await expect(page.getByRole('status')).toContainText('Не вдалося завантажити сайт.');
  await page.unroute('**/api/contacts');
  await page.getByRole('button', { name: 'Спробувати ще раз' }).click();
  await expect(page.locator('.header-book')).toBeVisible();
});
