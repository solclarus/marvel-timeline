import { expect, test } from "@playwright/test";

import { opacityOf } from "./helpers";

test("tapping a phase label pins and releases its focus", async ({ page }) => {
  await page.goto("./");
  const label = page.getByRole("button", { name: "Phase 1" });
  await label.tap();
  await expect(label).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => opacityOf(page, "iron-man-3")).toBeLessThan(0.5);
  await label.tap();
  await expect(label).toHaveAttribute("aria-pressed", "false");
  await expect.poll(() => opacityOf(page, "iron-man-3")).toBe(1);
});
