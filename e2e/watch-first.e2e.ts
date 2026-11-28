import { expect, test } from "@playwright/test";

const title = (page: import("@playwright/test").Page) =>
  page.locator("[data-slot=detail-title]").first();

test("the card folds out what to watch first, over the map", async ({ page }) => {
  await page.goto("./?view=map&work=avengers");
  await page.getByRole("button", { name: /Show what to watch before The Avengers/ }).click();
  await expect(page).toHaveURL(/list=before%3Aavengers/);
  // Five prerequisites, in an order that keeps each after its own.
  const rows = page.getByRole("list", { name: "Before The Avengers" }).locator("li");
  await expect(rows).toHaveCount(5);
  const ids = await rows.evaluateAll((items) => items.map((li) => li.id));
  expect(ids.indexOf("card-iron-man")).toBeLessThan(ids.indexOf("card-iron-man-2"));
  // The map stays behind it.
  await expect(page.locator('button[aria-label="Iron Man"]')).toBeAttached();

  // Picking from it moves the card to that work; ‹ steps back, list open.
  await page.locator("#card-thor button").click();
  await expect(title(page)).toHaveText("Thor");
  await expect(page).toHaveURL(/work=thor/);
  await expect(page).not.toHaveURL(/list=/);
  await page.getByRole("button", { name: "Back to The Avengers" }).click();
  await expect(title(page)).toHaveText("The Avengers");
  await expect(rows).toHaveCount(5);

  // Escape folds the list, then closes the card.
  await page.keyboard.press("Escape");
  await expect(rows).toHaveCount(0);
  await expect(page).toHaveURL(/work=avengers/);
  await page.keyboard.press("Escape");
  await expect(page).not.toHaveURL(/work=/);
});

test("a work with no prerequisites says you can start there", async ({ page }) => {
  await page.goto("./?work=iron-man");
  await expect(page.getByText("Start here")).toBeVisible();
  await expect(page.getByRole("button", { name: /Show what to watch before/ })).toHaveCount(0);
});

test("a route opens as a card, and its works lead on from it", async ({ page }) => {
  await page.goto("./?view=map");
  await page.getByRole("button", { name: "Routes" }).click();
  await page.getByRole("button", { name: /The MCU's Spider-Man/ }).click();
  await expect(title(page)).toHaveText("The MCU's Spider-Man");
  await expect(page).toHaveURL(/list=route%3Amcu-spider-man/);
  const rows = page.getByRole("list", { name: "The MCU's Spider-Man" }).locator("li");
  await expect(rows.first()).toBeVisible();

  await page.locator("#card-spider-man-homecoming button").click();
  await expect(page).toHaveURL(/work=spider-man-homecoming/);
  await page.getByRole("button", { name: "Back to The MCU's Spider-Man" }).click();
  await expect(title(page)).toHaveText("The MCU's Spider-Man");

  // ✕ closes it all, leaving the map as it was.
  await page.getByRole("button", { name: "Clear selection" }).click();
  await expect(page).not.toHaveURL(/list=|work=/);
  await expect(page.locator('button[aria-label="Iron Man"]')).toBeAttached();
});

test("watched works are marked, leave time left, and are remembered", async ({ page }) => {
  await page.goto("./?work=iron-man");
  const mark = page.getByRole("button", { name: "Mark Iron Man as watched" });
  await mark.click();
  await expect(mark).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('button[aria-label="Iron Man (watched)"]')).toBeAttached();

  // The Avengers' watch-first list counts what's left.
  await page.goto("./?work=avengers&list=before:avengers");
  await expect(page.getByText(/in all · .+ left$/)).toBeVisible();
  await expect(page.locator("#card-iron-man")).toContainText("(watched)");

  // Cleared from settings, after a confirm.
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "View settings" }).click();
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(page.getByText(/ left$/)).toHaveCount(0);
});
