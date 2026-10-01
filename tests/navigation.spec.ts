import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('grouped navigation identifies the current service and opens sections on the same page', async ({ page }, info) => {
  await page.route(/^https:\/\/(?:maps|www)\.google\.com\/maps/, (route) => route.fulfill({ contentType: 'text/html', body: '<html lang="uk"><title>Карта</title></html>' }));
  const compact = info.project.name === 'mobile';
  const widths = compact ? [320, 390, 768, 820, 1024, 1100] : [1101, 1280, 1440];
  for (const [path, label] of [['/', 'Манікюр'], ['/pedicure', 'Педикюр'], ['/laminuvannia-vii', 'Вії']]) {
    await page.goto(`${path}?ref=navigation#home`);
    for (const width of widths) {
      await page.setViewportSize({ width, height: 844 });
      if (compact) {
        await expect(page.locator('.header-current-service')).toBeVisible();
        await expect(page.locator('.header-current-service')).toHaveText(label);
        await expect(page.locator('.header-book')).toBeHidden();
      } else {
        const nav = page.getByRole('navigation', { name: 'Основна навігація', exact: true });
        await expect(nav).toBeVisible();
        await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
        await expect(nav.locator('[aria-current="page"]')).toHaveText(label);
        await expect(nav.locator('[aria-current="page"]')).toHaveAttribute('href', path);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    }
    const priceCategories = await page.locator('.service-row').evaluateAll((rows) => rows.map((row) => row.id));
    const menu = page.getByRole('navigation', { name: compact ? 'Мобільна навігація' : 'Основна навігація', exact: true });
    if (compact) {
      await page.getByRole('button', { name: 'Відкрити меню' }).click();
      await expect(menu.locator('[aria-current="page"]')).toContainText(label);
      await expect(menu.locator('[aria-current="page"]')).toContainText('Ви тут');
      await expect(page.getByRole('button', { name: 'Закрити меню', exact: true })).toBeFocused();
    }
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    for (const [name, href] of [['Ціни', '#services'], ['Наші роботи', '#gallery'], ['Контакти', '#contacts']]) {
      await expect(menu.getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
      await expect(menu.getByRole('link', { name, exact: true })).not.toHaveAttribute('aria-current');
      await expect(page.getByRole('navigation', { name: 'Навігація в підвалі' }).getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
      await menu.getByRole('link', { name, exact: true }).click();
      await expect(page).toHaveURL((url) => url.pathname === path && url.hash === href && url.search === '?ref=navigation');
      await expect(page.locator('#mobile-nav')).toBeHidden();
      if (compact && href !== '#contacts') await page.getByRole('button', { name: 'Відкрити меню' }).click();
    }
    expect(await page.locator('.service-row').evaluateAll((rows) => rows.map((row) => row.id))).toEqual(priceCategories);
    await page.getByRole('navigation', { name: 'Навігація в підвалі' }).getByRole('link', { name: 'На початок сторінки', exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname === path && url.hash === '#home' && url.search === '?ref=navigation');
  }
  if (compact) {
    await page.setViewportSize({ width: 820, height: 844 });
    await page.getByRole('button', { name: 'Відкрити меню' }).click();
    await page.setViewportSize({ width: 1024, height: 844 });
    await expect(page.getByRole('dialog', { name: 'Меню студії' })).toBeVisible();
    await page.setViewportSize({ width: 1101, height: 844 });
    await expect(page.locator('#mobile-nav')).toBeHidden();
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  }
});
