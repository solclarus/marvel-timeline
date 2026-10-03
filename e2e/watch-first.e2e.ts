import { expect, test } from "@playwright/test";

test("the detail panel opens a watch-first list", async ({ page }) => {
  await page.goto("./?work=avengers");
  await page.getByRole("button", { name: /Show what to watch before The Avengers/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "The Avengers" })).toBeVisible();
  const items = dialog.getByRole("listitem");
  await expect(items).toHaveCount(5);
  // Iron Man comes before Iron Man 2, which it leads into.
  const titles = await dialog.locator("li span.truncate").allTextContents();
  expect(titles).toContain("Iron Man");
  expect(titles.indexOf("Iron Man")).toBeLessThan(titles.indexOf("Iron Man 2"));

  // Escape closes the dialog but keeps the selection.
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(/work=avengers/);

  // Picking from the list selects that work.
  await page.getByRole("button", { name: /Show what to watch before/ }).click();
  await dialog.getByRole("button", { name: /Thor/ }).first().click();
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(/work=thor/);
});

test("a work with no prerequisites says you can start there", async ({ page }) => {
  await page.goto("./?work=iron-man");
  await page.getByRole("button", { name: /Show what to watch before Iron Man/ }).click();
  await expect(page.getByRole("dialog")).toContainText("Nothing to watch first");
});
