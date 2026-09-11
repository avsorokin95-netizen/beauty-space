import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';

test('owner changes password and signs back in', async ({ page }, testInfo) => {
  const access = readFileSync('.test-data/admin-access.txt', 'utf8');
  const password = access.match(/Password: (.+)/)![1];
  const replacement = randomBytes(24).toString('base64url');
  const origin = 'http://127.0.0.1:4173';
  let changed = false;
  await page.goto('/admin');
  await page.getByLabel('Пароль', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Увійти в адмінку' }).click();
  await page.getByRole('button', { name: 'Безпека', exact: true }).click();
  try {
    await page.getByLabel('Поточний пароль', { exact: true }).fill(password);
    await page.getByLabel('Новий пароль', { exact: true }).fill(replacement);
    await page.getByLabel('Повтори новий пароль').fill('mismatch');
    await expect(page.getByRole('button', { name: 'Змінити пароль', exact: true })).toBeDisabled();
    await page.getByLabel('Повтори новий пароль').fill(replacement);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.screenshot({ path: `test-results/${testInfo.project.name}-security.png`, fullPage: true });
    const response = page.waitForResponse((res) => res.url().endsWith('/api/admin/password') && res.request().method() === 'PUT');
    await page.getByRole('button', { name: 'Змінити пароль', exact: true }).click();
    changed = (await response).ok();
    expect(changed).toBeTruthy();
    await expect(page.getByText('Пароль змінено. Увійди з новим паролем.')).toBeVisible();
    expect((await page.request.post('/api/login', { data: { password }, headers: { Origin: origin } })).status()).toBe(401);
    await page.getByLabel('Пароль', { exact: true }).fill(replacement);
    await page.getByRole('button', { name: 'Увійти в адмінку' }).click();
    await expect(page.getByRole('button', { name: 'Вийти', exact: true })).toBeVisible();
  } finally {
    if (changed) {
      await page.request.post('/api/login', { data: { password: replacement }, headers: { Origin: origin } });
      const restored = await page.request.put('/api/admin/password', { data: { currentPassword: replacement, newPassword: password, confirmation: password }, headers: { Origin: origin } });
      expect(restored.status()).toBe(204);
      writeFileSync('.test-data/admin-access.txt', access, { mode: 0o600 });
    }
  }
});
