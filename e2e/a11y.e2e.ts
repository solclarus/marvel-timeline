import { expect, test } from "@playwright/test";

import { opacityOf } from "./helpers";

test("a poster reached by Tab is brought into view and selectable with Enter", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator('button[aria-label="Iron Man"]')).toBeVisible();
  // Card and phase labels come first in tab order; go on to the first poster.
  let id = "";
  for (let i = 0; i < 40 && !id; i++) {
    await page.keyboard.press("Tab");
    id = await page.evaluate(() =>
      document.activeElement?.matches("[data-slot=tooltip-trigger]")
        ? document.activeElement.id
        : "",
    );
  }
  expect(id).toBeTruthy();
  const focused = page.locator(`[id="${id}"]`);
  await expect(focused).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(focused).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(new RegExp(`work=${id}`));
});

test("reduced motion applies changes without animating", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  await expect(page.locator('button[aria-label="Iron Man"]')).toBeVisible();
  await page.locator('button[aria-label="Iron Man"]').click();
  // Unrelated posters dim at once rather than over a 0.3s fade.
  await expect.poll(() => opacityOf(page, "thor"), { timeout: 150 }).toBeLessThan(0.5);
});
