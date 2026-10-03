import { expect, test } from "@playwright/test";

test("phones open on the list, and picking a work highlights its relatives", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("button", { name: "Show as a map" })).toBeVisible();
  const ironMan2 = page.locator("#list-iron-man-2 button");
  await ironMan2.click();
  await expect(page).toHaveURL(/work=iron-man-2/);
  await expect(ironMan2).toHaveAttribute("aria-pressed", "true");
  // Iron Man comes before it; Iron Man 3 after.
  await expect(page.locator("#list-iron-man")).toContainText("Before");
  await expect(page.locator("#list-iron-man-3")).toContainText("After");

  await page.getByRole("button", { name: "Show as a map" }).click();
  await expect(page).toHaveURL(/view=map/);
  await expect(page.locator('button[aria-label="Iron Man 2"]')).toBeVisible();
});
