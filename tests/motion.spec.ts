import { test, expect } from "@playwright/test";

test("hero preserves desktop parallax and a still mobile crop", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const photo = page.locator(".hero-photo");
  await expect(photo).toBeVisible();
  await page.locator("#home").evaluate((section) => {
    window.scrollTo({ top: section.offsetTop + section.offsetHeight / 2, behavior: "instant" });
  });

  if (testInfo.project.name === "mobile") {
    await expect(photo).toHaveCSS("transform", "none");
    expect(await photo.evaluate((element) => element.style.transform)).toBe("");
  } else {
    // Halfway through the section, the image moves by 6% of its own height.
    await expect.poll(() => photo.evaluate((element) => {
      const style = getComputedStyle(element);
      return new DOMMatrixReadOnly(style.transform).m42 / element.getBoundingClientRect().height;
    })).toBeCloseTo(0.06, 2);

    // Changing the device preference removes the effect immediately.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(photo).toHaveCSS("transform", "none");
    await page.evaluate(() => window.scrollBy({ top: -100, behavior: "instant" }));
    await expect(photo).toHaveCSS("transform", "none");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect.poll(() => photo.evaluate((element) =>
      new DOMMatrixReadOnly(getComputedStyle(element).transform).m42,
    )).toBeGreaterThan(0);
  }
});

test("reduced motion keeps the hero still and content visible from first load", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator(".hero-copy > div")).toHaveCSS("opacity", "1");
  await expect(page.locator(".hero-photo")).toHaveCSS("transform", "none");
  await page.locator("#home").evaluate((section) => {
    window.scrollTo({ top: section.offsetTop + section.offsetHeight / 2, behavior: "instant" });
  });
  await expect(page.locator(".hero-photo")).toHaveCSS("transform", "none");
  expect(errors).toEqual([]);
});
