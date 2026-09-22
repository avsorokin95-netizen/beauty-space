import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import type { PriceDocument } from "../shared/pricing";

test("admin publishes prices for other visitors, preserves them and discards drafts", async ({
  page,
  browser,
}, testInfo) => {
  const password = readFileSync(".test-data/admin-access.txt", "utf8").match(
    /Password: (.+)/,
  )![1];
  const initial = (await (
    await page.request.get("/api/prices")
  ).json()) as PriceDocument;
  await page.goto("/admin");
  await page.getByLabel("Пароль", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Увійти в адмінку" }).click();
  await expect(
    page.getByRole("heading", { name: "Послуги та ціни." }),
  ).toBeVisible();
  try {
    await page.getByLabel("Манікюр без покриття").fill("675 грн");
    await page.getByLabel("Ціна на картці категорії").fill("від 675 грн");
    await page
      .getByRole("button", { name: "Зберегти зміни", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText(
      "Зміни збережено й опубліковано.",
    );
    const visitor = await browser.newContext();
    const landing = await visitor.newPage();
    await landing.goto("http://127.0.0.1:4173/#services");
    await expect(
      landing.locator("#service-nails .price-item dd").first(),
    ).toHaveText("675 грн");
    await visitor.close();
    await page.reload();
    await expect(page.getByLabel("Манікюр без покриття")).toHaveValue(
      "675 грн",
    );
    await page.getByLabel("Манікюр без покриття").fill("-5 грн");
    await expect(
      page.getByRole("button", { name: "Зберегти зміни", exact: true }),
    ).toBeDisabled();
    await page
      .getByRole("button", { name: "Скасувати зміни", exact: true })
      .click();
    await page.getByRole("button", { name: "Так, завантажити" }).click();
    await expect(page.getByLabel("Манікюр без покриття")).toHaveValue(
      "675 грн",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: `test-results/${testInfo.project.name}-admin.png`,
      fullPage: true,
    });
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  } finally {
    const latest = (await (
      await page.request.get("/api/prices")
    ).json()) as PriceDocument;
    await page.request.put("/api/admin/prices", {
      data: { ...initial, revision: latest.revision },
      headers: { Origin: "http://127.0.0.1:4173" },
    });
  }
  await page.getByRole("button", { name: "Вийти", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Увійти в адмінку" }),
  ).toBeVisible();
  expect((await page.request.get("/api/admin/session")).status()).toBe(401);
});

test("public price failure shows recovery instead of invented prices", async ({
  page,
}) => {
  await page.route("**/api/prices", (route) =>
    route.fulfill({ status: 503, body: "{}" }),
  );
  await page.goto("/#services");
  const services = page.locator("#services");
  await expect(services.getByRole("status")).toContainText(
    "Не вдалося завантажити прайс.",
  );
  await page.unroute("**/api/prices");
  await services.getByRole("button", { name: "Спробувати ще раз" }).click();
  await page.locator('[aria-controls="service-nails"]').click();
  await expect(page.locator("#service-nails")).toBeVisible();
});
