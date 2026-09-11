import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  // Test our integration independently of Google's consent UI and availability.
  await page.route("https://maps.google.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<html lang="uk"><head><title>Карта</title></head><body><main>Боголюбова, 6</main></body></html>',
    }),
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
});

test("map identifies the studio address and reviews link opens the real highlight", async ({
  page,
}) => {
  const map = page.locator(".studio-map iframe");
  const source = new URL((await map.getAttribute("src"))!);
  expect(source.searchParams.get("q")).toBe(
    "вул. Боголюбова, 6, Софіївська Борщагівка, Україна",
  );
  expect(source.searchParams.get("output")).toBe("embed");
  await expect(map).toHaveAttribute("loading", "lazy");
  await page.locator("#reviews").scrollIntoViewIfNeeded();
  await expect(page.locator(".reviews-source")).toHaveAttribute(
    "href",
    "https://www.instagram.com/stories/highlights/17989072271277268/",
  );
  await expect(page.locator(".reviews-source")).toHaveAttribute(
    "target",
    "_blank",
  );
  await expect(
    page.getByRole("link", { name: "Відкрити маршрут" }),
  ).toHaveAttribute("href", /google.com\/maps\/search/);
});

test("renders content without overflow and loads local imagery", async ({
  page,
}, testInfo) => {
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Краса починається",
  );
  await expect(page.locator(".hero-photo")).toBeVisible();
  expect(
    await page
      .locator(".hero-photo")
      .evaluate(
        (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
      ),
  ).toBeTruthy();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await expect(page.locator(".hero .button")).toHaveAttribute(
    "href",
    "https://ig.me/m/beauty.space.victoriya",
  );
  for (const image of await page.locator("main img").all()) {
    await image.scrollIntoViewIfNeeded();
    await expect(image).toBeVisible();
    await expect
      .poll(() =>
        image.evaluate(
          (element: HTMLImageElement) =>
            element.complete && element.naturalWidth > 0,
        ),
      )
      .toBeTruthy();
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-page.png`,
    fullPage: true,
  });
});

test("service disclosure and gallery keyboard lifecycle work", async ({
  page,
}) => {
  const brows = page.getByRole("button", { name: /03 Брови/ });
  await brows.click();
  await expect(brows).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#service-brows")).toBeVisible();
  await brows.click();
  await expect(page.locator("#service-brows")).toBeHidden();
  const opener = page.getByRole("button", { name: "Відкрити роботу 1" });
  await opener.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Наступна робота" }).click();
  await expect(page.locator("#lightbox-title")).toHaveText(
    "Твій особливий акцент",
  );
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("#lightbox-title")).toHaveText(
    "Деталі, в які закохуєшся",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(opener).toBeFocused();
});

test("navigation and accessibility", async ({ page }, testInfo) => {
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Відкрити меню" }).click();
    await page
      .getByRole("navigation", { name: "Мобільна навігація" })
      .getByRole("link", { name: "Контакти" })
      .click();
    await expect(page.locator("#mobile-nav")).toBeHidden();
    await expect(page).toHaveURL(/#contacts$/);
  }
  await page.locator("#contacts").scrollIntoViewIfNeeded();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("all pricing categories remain readable on narrow screens", async ({
  page,
}, testInfo) => {
  if (testInfo.project.name === "mobile")
    await page.setViewportSize({ width: 320, height: 844 });
  await expect(page.locator("#service-nails .price-item")).toHaveCount(7);
  await expect(page.locator("#service-nails")).toContainText("50/70 грн");
  for (const id of ["pedicure", "brows", "lashes", "sets", "depilation"]) {
    await page.locator(`[aria-controls="service-${id}"]`).click();
    await expect(page.locator(`#service-${id}`)).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
  }
  await expect(page.locator("#service-depilation dd")).toHaveText("150 грн");
  await page.locator('[aria-controls="service-sets"]').click();
  await expect(page.locator("#service-sets dd")).toHaveText([
    "1 500 грн",
    "1 350 грн",
  ]);
  await page
    .locator("#service-sets")
    .screenshot({ path: `test-results/${testInfo.project.name}-prices.png` });
});

test('gallery loops in both directions and retains lightbox', async ({ page }) => {
  await expect(page.locator('.gallery-slide').first()).toBeVisible();
  const count = await page.locator('.gallery-slide').count();
  const controls = page.getByRole('group', { name: 'Гортання робіт' });
  await controls.scrollIntoViewIfNeeded();
  await expect(controls).toContainText(`1 / ${count}`);
  await controls.getByLabel('Попередній слайд').click();
  await expect(controls).toContainText(`${count} / ${count}`);
  await controls.getByLabel('Наступний слайд').click();
  await expect(controls).toContainText(`1 / ${count}`);
  await controls.getByLabel('Наступний слайд').click();
  await expect(controls).toContainText(`2 / ${count}`);
  await page.getByRole('button', { name: 'Відкрити роботу 2', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Закрити галерею' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});
