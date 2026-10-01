import { test, expect } from '@playwright/test';

test('real hero work stays still and readable for both motion preferences', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const reducedMotion of ['reduce', 'no-preference'] as const) {
    await page.emulateMedia({ reducedMotion });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const photo = page.locator('.hero-photo');
    await expect(photo).toBeVisible();
    await expect(photo).toHaveCSS('transform', 'none');
    await page.locator('#home').evaluate((section) => window.scrollTo({ top: section.offsetTop + section.offsetHeight / 2, behavior: 'instant' }));
    await expect(photo).toHaveCSS('transform', 'none');
    await expect(page.locator('.hero-prices')).toContainText('900 грн');
  }
  expect(errors).toEqual([]);
});
