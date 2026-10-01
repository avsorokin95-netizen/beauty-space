import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('grouped navigation identifies the current service and keeps studio links consistent', async ({ page }, info) => {
  await page.route(/^https:\/\/(?:maps|www)\.google\.com\/maps/, (route) => route.fulfill({ contentType: 'text/html', body: '<html lang="uk"><title>Карта</title></html>' }));
  const compact = info.project.name === 'mobile';
  const widths = compact ? [320, 390, 768, 820, 1024, 1100] : [1101, 1280, 1440];
  for (const [path, label] of [['/', 'Манікюр'], ['/pedicure', 'Педикюр'], ['/laminuvannia-vii', 'Вії']]) {
    await page.goto(`${path}?ref=navigation#home`);
    for (const width of widths) {
      await page.setViewportSize({ width, height: 844 });
      const nav = page.getByRole('navigation', { name: compact ? 'Послуги студії' : 'Основна навігація', exact: true });
      await expect(nav).toBeVisible();
      await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
      await expect(nav.locator('[aria-current="page"]')).toHaveText(label);
      await expect(nav.locator('[aria-current="page"]')).toHaveAttribute('href', path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    }
    const menu = page.getByRole('navigation', { name: compact ? 'Мобільна навігація' : 'Основна навігація', exact: true });
    if (compact) {
      await page.getByRole('button', { name: 'Відкрити меню' }).click();
      await expect(menu.locator('[aria-current="page"]')).toContainText(label);
      await expect(menu.locator('[aria-current="page"]')).toContainText('Ви тут');
      await expect(page.getByRole('button', { name: 'Закрити меню', exact: true })).toBeFocused();
    }
    for (const [name, href] of [['Усі ціни', '/#services'], ['Усі роботи', '/#gallery'], ['Контакти', '/#contacts']]) {
      await expect(menu.getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
      await expect(menu.getByRole('link', { name, exact: true })).not.toHaveAttribute('aria-current');
      await expect(page.getByRole('navigation', { name: 'Навігація в підвалі' }).getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
    }
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await menu.getByRole('link', { name: 'Усі роботи', exact: true }).click();
    await expect(page).toHaveURL(/\/#gallery$/);
    await expect(page.locator('#mobile-nav')).toBeHidden();
    await expect(page.locator('.service-row')).toHaveCount(6);
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
