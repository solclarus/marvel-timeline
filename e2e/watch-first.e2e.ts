import { expect, test } from "@playwright/test";

test("the detail panel narrows the list to what to watch first", async ({ page }) => {
  await page.goto("./?view=map&work=avengers");
  await page.getByRole("button", { name: /Show what to watch before The Avengers/ }).click();
  await expect(page).toHaveURL(/list=before%3Aavengers/);
  await expect(page.getByRole("heading", { name: "Before The Avengers" })).toBeVisible();
  // Five prerequisites, then The Avengers itself.
  const rows = page.locator("main li");
  await expect(rows).toHaveCount(6);
  const ids = await rows.evaluateAll((items) => items.map((li) => li.id));
  expect(ids.at(-1)).toBe("list-avengers");
  expect(ids.indexOf("list-iron-man")).toBeLessThan(ids.indexOf("list-iron-man-2"));

  // Picking from it selects that work and keeps the path.
  await page.locator("#list-thor button").click();
  await expect(page).toHaveURL(/work=thor&/);
  await expect(rows).toHaveCount(6);

  // The detail card's ✕ clears the selection and the narrowed list at once.
  await page.getByRole("button", { name: "Clear selection" }).click();
  await expect(page).not.toHaveURL(/list=/);
  await expect(page).not.toHaveURL(/work=/);
  await expect(page.locator('button[aria-label="Iron Man"]')).toBeAttached();
});

test("a work with no prerequisites says you can start there", async ({ page }) => {
  await page.goto("./?work=iron-man");
  await page.getByRole("button", { name: /Show what to watch before Iron Man/ }).click();
  await expect(page.locator("main")).toContainText("Nothing to watch first");
  await page.keyboard.press("Escape");
  await expect(page).not.toHaveURL(/list=/);
  await expect(page).toHaveURL(/work=iron-man/);
});
