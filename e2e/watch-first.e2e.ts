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
  await page.getByRole("button", { name: /^Menu( \(filtered\))?$/ }).click();
  await page.getByRole("button", { name: "Your watching" }).click();
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

  // Cleared from the Watching card, after a confirm.
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: /^Menu( \(filtered\))?$/ }).click();
  await page.getByRole("button", { name: "Your watching" }).click();
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(page.getByRole("button", { name: "Clear", exact: true })).toHaveCount(0);
});

test("a whole list is marked at once, and the progress card counts it", async ({ page }) => {
  // The Avengers' five prerequisites, marked together.
  await page.goto("./?work=avengers&list=before:avengers");
  await page.getByRole("button", { name: "Mark all watched" }).click();
  await expect(page.getByRole("button", { name: "Unmark all" })).toBeVisible();
  await expect(page.locator("#card-thor")).toContainText("(watched)");

  // The progress card, from the command bar: five works, Phase 1 five in,
  // and The Avengers up next.
  await page.getByRole("button", { name: /^Menu( \(filtered\))?$/ }).click();
  await page.getByRole("button", { name: "Your watching" }).click();
  await expect(page).toHaveURL(/list=progress/);
  await expect(page.getByText(/^5 of \d+$/).first()).toBeVisible();
  const phases = page.locator("section", {
    has: page.getByRole("heading", { name: "The MCU by phase" }),
  });
  await expect(phases.locator("li").first()).toContainText("Phase 15 of 6");
  await page.locator("#card-avengers button").click();
  await expect(page.locator("[data-slot=detail-title]").first()).toHaveText("The Avengers");
  await page.getByRole("button", { name: "Back to Your watching" }).click();

  // A route from the same card, and ‹ back to it.
  await page.getByRole("button", { name: /The Defenders Saga/ }).click();
  await expect(page).toHaveURL(/list=route%3Adefenders/);
  await page.getByRole("button", { name: "Back to Your watching" }).click();
  await expect(page).toHaveURL(/list=progress/);

  // In the list, a section's "Select all" picks the saga to unmark at once.
  await page.goto("./?view=list");
  await expect(page.getByRole("button", { name: /: The Infinity Saga$/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Select", exact: true }).click();
  await page.getByRole("button", { name: "Select all: The Infinity Saga" }).click();
  await page.getByRole("toolbar").getByRole("button", { name: "Not watched" }).click();
  await page.goto("./?list=progress");
  await expect(page.getByText(/^0 of \d+$/).first()).toBeVisible();
});

test("picking several works in the list marks them together", async ({ page }) => {
  await page.goto("./?view=list");
  await page.getByRole("button", { name: "Select", exact: true }).click();
  const row = (id: string) => page.locator(`#list-${id} button`);
  // A tap checks a row instead of opening it; shift-click takes the run.
  await row("iron-man").click();
  await row("thor").click({ modifiers: ["Shift"] });
  await expect(row("incredible-hulk")).toHaveAttribute("aria-pressed", "true");
  await row("avengers").click();
  await expect(page.locator("[data-slot=detail-title]")).toHaveCount(0);
  const bar = page.getByRole("toolbar");
  await expect(bar).toContainText("5 selected");

  await bar.getByRole("button", { name: "Watched", exact: true }).click();
  await expect(bar).toContainText("0 selected");
  await page.keyboard.press("Escape");
  await expect(bar).toHaveCount(0);
  await expect(row("iron-man-2")).toContainText("(watched)");
  await expect(row("captain-america-first-avenger")).not.toContainText("(watched)");
});
