import { test, expect } from '@playwright/test';

test('compact header keeps the current service visible while scrolling and using the menu', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [path, label] of [['/', 'Манікюр'], ['/pedicure', 'Педикюр'], ['/laminuvannia-vii', 'Вії']]) {
    await page.goto(path);
    await expect(page.locator('.service-row')).not.toHaveCount(0);
    const header = page.locator('.header');
    if (page.viewportSize()!.width > 1100) {
      await expect(header.locator('.header-book')).toBeVisible();
      await expect(header.locator('.header-current-service')).toBeHidden();
      continue;
    }
    await expect(header.locator('.header-book')).toBeHidden();
    await expect(header.locator('.header-current-service')).toHaveText(label);
    const height = await header.evaluate((el) => el.getBoundingClientRect().height);
    for (const top of [500, 480, 0]) {
      await page.evaluate((top) => scrollTo({ top, behavior: 'instant' }), top);
      await expect.poll(() => header.evaluate((el) => el.getBoundingClientRect().top)).toBe(0);
      await expect(header.locator('.header-current-service')).toBeInViewport();
      expect(await header.evaluate((el) => el.getBoundingClientRect().height)).toBe(height);
    }
    await page.getByRole('button', { name: 'Відкрити меню' }).click();
    const menu = page.getByRole('dialog', { name: 'Меню студії' });
    await expect(menu).toBeVisible();
    await expect(menu.locator('[aria-current="page"]')).toContainText(label);
    await page.getByRole('button', { name: 'Закрити меню', exact: true }).click();
    await expect(menu).toBeHidden();
    expect(await header.evaluate((el) => el.getBoundingClientRect().height)).toBe(height);
    await expect(page.getByRole('navigation', { name: 'Швидкий запис' })).toBeInViewport();
  }
});

test('service dropdown offers only the other pages and closes without shifting content', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [path, label, next] of [['/laminuvannia-vii', 'Вії', '/'], ['/', 'Манікюр', '/pedicure'], ['/pedicure', 'Педикюр', '/laminuvannia-vii']]) {
    await page.goto(path);
    await expect(page.locator('.service-row')).not.toHaveCount(0);
    const trigger = page.getByRole('button', { name: `${label} — змінити послугу` });
    const options = page.getByRole('navigation', { name: 'Інші послуги' });
    const before = await page.locator('main').evaluate(el => el.getBoundingClientRect().top);
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(options.getByRole('link')).toHaveCount(2);
    await expect(options.getByRole('link', { name: label, exact: true })).toHaveCount(0);
    expect(await page.locator('main').evaluate(el => el.getBoundingClientRect().top)).toBe(before);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.keyboard.press('Escape');
    await expect(options).toBeHidden();
    await expect(trigger).toBeFocused();
    await trigger.press('Enter');
    await expect(options).toBeVisible();
    await trigger.press('ArrowDown');
    await expect(options.getByRole('link').first()).toBeFocused();
    await page.mouse.click(5, 300);
    await expect(options).toBeHidden();
    await trigger.click();
    await trigger.click();
    await expect(options).toBeHidden();
    await trigger.click();
    await page.getByRole('button', { name: 'Відкрити меню' }).click();
    await expect(options).toBeHidden();
    await page.getByRole('button', { name: 'Закрити меню', exact: true }).click();
    await trigger.click();
    await options.locator(`a[href="${next}"]`).click();
    await expect(page).toHaveURL(next);
  }
});
