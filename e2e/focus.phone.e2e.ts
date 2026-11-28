import { expect, test } from "@playwright/test";

import { mapScale, opacityOf } from "./helpers";

test("tapping a phase label pins and releases its focus", async ({ page }) => {
  // Select the leftmost Phase 1 work to bring the band and its label into
  // view, then clear it.
  await page.goto("./?view=map&work=thor");
  await page.locator("[data-slot=detail-title]").first().waitFor();
  // Escape before the fit lands would cancel it.
  await expect(page.locator('[id="thor"]')).toBeInViewport();
  await page.keyboard.press("Escape");
  const label = page.getByRole("button", { name: "Phase 1" });
  await expect(label).toBeInViewport();
  await label.tap();
  await expect(label).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => opacityOf(page, "iron-man-3")).toBeLessThan(0.5);
  await label.tap();
  await expect(label).toHaveAttribute("aria-pressed", "false");
  await expect.poll(() => opacityOf(page, "iron-man-3")).toBe(1);
});

test("a phone fits a selection between 30% and 70%, keeping its poster's size", async ({
  page,
}) => {
  // Few relatives: the fit stops at 70% rather than filling the screen.
  await page.goto("./?view=map&work=iron-man");
  await expect(page.locator('[id="iron-man"]')).toBeInViewport();
  await expect.poll(() => mapScale(page)).toBeCloseTo(0.7, 2);
  // A selected poster is ringed, not enlarged.
  const poster = page.locator('[id="iron-man"]');
  await expect
    .poll(() => poster.evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).a))
    .toBe(1);

  // Many relatives: it zooms out, but no further than 30%.
  await page.goto("./?view=map&work=avengers-doomsday");
  await expect(page.locator('[id="avengers-doomsday"]')).toBeInViewport();
  await expect.poll(() => mapScale(page)).toBeCloseTo(0.3, 2);
});
