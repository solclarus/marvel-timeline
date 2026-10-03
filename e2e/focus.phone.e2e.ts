import { expect, test } from "@playwright/test";

import { opacityOf } from "./helpers";

test("tapping a phase label pins and releases its focus", async ({ page }) => {
  // Select a Phase 1 work to bring the band into view, then clear it.
  await page.goto("./?work=iron-man&focus=immediate");
  await page.locator("[data-slot=detail-title]").first().waitFor();
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
