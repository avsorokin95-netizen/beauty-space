import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { categoryContent, type PriceDocument } from '../shared/pricing';

test('service pages keep their own prices, works, mobile booking and navigation', async ({ page }, info) => {
  await page.route(/^https:\/\/(?:maps|www)\.google\.com\/maps/, (route) => route.fulfill({ contentType: 'text/html', body: '<html lang="uk"><title>Карта</title><main>Карта</main></html>' }));
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const [path, category, name, expectedPrice] of [['/pedicure', 'pedicure', 'Педикюр', '600/700 грн'], ['/laminuvannia-vii', 'lashes', 'Ламінування вій', '800 грн']]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(`${name} у Софіївській Борщагівці`);
    await expect(page.locator('.hero-prices')).toContainText(expectedPrice);
    await expect(page.locator(`#service-${category}`)).toBeVisible();
    await expect(page.locator('#service-nails')).toHaveCount(0);
    const nav = info.project.name === 'mobile' ? page.getByRole('navigation', { name: 'Мобільна навігація' }) : page.getByRole('navigation', { name: 'Основна навігація' });
    if (info.project.name === 'mobile') await page.getByRole('button', { name: 'Відкрити меню' }).click();
    await nav.getByRole('link', { name: /Ціни$/ }).click();
    await expect(page).toHaveURL(new RegExp(`${path}#services$`));
    await page.locator('#gallery').scrollIntoViewIfNeeded();
    expect(await page.locator('.gallery-slide').count()).toBeGreaterThan(0);
    const graph = JSON.parse((await page.locator('#page-schema').textContent())!);
    // Dev omits canonical origin; live SSR schema is tested in both server runtimes.
    expect(graph['@graph']).toBeDefined();
    if (info.project.name === 'mobile') {
      await expect(page.locator('.mobile-booking')).toBeVisible();
      await expect(page.locator('.mobile-booking [data-analytics="booking"]')).toHaveAttribute('href', 'https://ig.me/m/beauty.space.victoriya');
      await page.setViewportSize({ width: 320, height: 844 });
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  }
  expect(errors).toEqual([]);
});

test('owner can publish service text and item names and see the same data on its page', async ({ page, browser }) => {
  const initial = await (await page.request.get('/api/prices')).json() as PriceDocument;
  const password = readFileSync('.test-data/admin-access.txt', 'utf8').match(/Password: (.+)/)![1];
  await page.goto('/admin');
  await page.getByLabel('Пароль', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Увійти в адмінку' }).click();
  const visitor = await browser.newContext();
  try {
    await page.getByRole('navigation', { name: 'Категорії послуг' }).getByRole('button', { name: /Педикюр/ }).click();
    await page.getByLabel('Опис та вибір процедури').fill('Тестовий опис опублікованої процедури.');
    await page.getByLabel('Що повідомити перед записом').fill('Тестова підказка до запису.');
    await page.getByText('Редагувати назви та склад послуг', { exact: true }).click();
    await page.getByLabel('Назва послуги 1', { exact: true }).fill('Тестовий педикюр');
    await page.locator('#price-pedicure-0').fill('812 грн');
    await page.getByRole('button', { name: 'Зберегти зміни', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Зміни збережено й опубліковано.');
    const publicPage = await visitor.newPage();
    await publicPage.goto('http://127.0.0.1:4173/pedicure');
    await expect(publicPage.locator('.hero-prices')).toContainText('Тестовий педикюр');
    await expect(publicPage.locator('.hero-prices')).toContainText('812 грн');
    await expect(publicPage.locator('#service-pedicure')).toContainText('Тестовий опис опублікованої процедури.');
    const schema = JSON.parse((await publicPage.locator('#studio-schema').textContent())!);
    expect(schema.hasOfferCatalog.itemListElement[0].itemListElement[0].itemOffered.name).toBe('Тестовий педикюр');
    expect(schema.hasOfferCatalog.itemListElement[0].itemListElement[0].price).toBe(812);
    await page.reload();
    await page.getByRole('navigation', { name: 'Категорії послуг' }).getByRole('button', { name: /Педикюр/ }).click();
    await expect(page.getByLabel('Опис та вибір процедури')).toHaveValue('Тестовий опис опублікованої процедури.');
  } finally {
    await visitor.close();
    const current = await (await page.request.get('/api/prices')).json() as PriceDocument;
    const restore = structuredClone(initial);
    Object.assign(restore.prices.pedicure, categoryContent(initial.prices.pedicure, 'pedicure'));
    expect((await page.request.put('/api/admin/prices', { data: { ...restore, revision: current.revision }, headers: { Origin: 'http://127.0.0.1:4173' } })).ok()).toBeTruthy();
  }
});

test('a direct price fragment opens the matching category with accurate accessible state', async ({ page }) => {
  await page.goto('/#service-brows');
  await expect(page.locator('#service-brows')).toBeVisible();
  await expect(page.locator('[aria-controls="service-brows"]')).toHaveAttribute('aria-expanded', 'true');
  await page.evaluate(() => { location.hash = 'service-lashes'; });
  await expect(page.locator('#service-lashes')).toBeVisible();
  await expect(page.locator('[aria-controls="service-lashes"]')).toHaveAttribute('aria-expanded', 'true');
});
