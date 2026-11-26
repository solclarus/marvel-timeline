import { expect, test } from "@playwright/test";

import { opacityOf } from "./helpers";

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
