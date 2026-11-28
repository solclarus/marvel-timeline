import { expect, test } from "@playwright/test";

test.describe("on a dark system", () => {
  test.use({ colorScheme: "dark" });

  test("follows the system, then switches to Light and remembers it", async ({ page }) => {
    await page.goto("./");
    const html = page.locator("html");
    await expect(html).toHaveClass(/\bdark\b/);
    await page.getByRole("button", { name: /^Menu( \(filtered\))?$/ }).click();
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("button", { name: "Light" }).click();
    await expect(html).not.toHaveClass(/\bdark\b/);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#f5f3ef");
    await page.reload();
    await expect(page.locator('button[aria-label="Iron Man"]')).toBeVisible();
    await expect(html).not.toHaveClass(/\bdark\b/);
  });
});
