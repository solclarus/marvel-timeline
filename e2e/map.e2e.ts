import { expect, test } from "@playwright/test";

import { opacityOf, pinch, trackErrors, zoomLabel } from "./helpers";

test("loads every work without errors", async ({ page }) => {
  const noErrors = trackErrors(page);
  await page.goto("./");
  await expect(page.locator('button[aria-label="Iron Man"]')).toBeVisible();
  expect(await page.locator("[data-slot=tooltip-trigger]").count()).toBeGreaterThan(100);
  noErrors();
});

test("restores a shared link", async ({ page }) => {
  await page.goto("./?work=logan&group=earth");
  await expect(page.locator("p.font-semibold").first()).toHaveText("Logan");
  await expect(page).toHaveURL(/work=logan/);
  await expect(page).toHaveURL(/group=earth/);
});

test("search selects a work and puts it in the URL", async ({ page }) => {
  await page.goto("./");
  await page.keyboard.press("/");
  await page.keyboard.type("ragnarok");
  await page.getByRole("option", { name: /Thor: Ragnarok/ }).click();
  await expect(page).toHaveURL(/work=thor-ragnarok/);
  await expect(page.locator("p.font-semibold").first()).toHaveText("Thor: Ragnarok");
});

test("manual zoom sticks after the selection fit", async ({ page }) => {
  await page.goto("./?work=thor-ragnarok");
  await expect(zoomLabel(page)).not.toHaveText("60%");
  const fitted = await zoomLabel(page).textContent();
  await pinch(page, -10, 5);
  await page.waitForTimeout(800);
  await expect(zoomLabel(page)).not.toHaveText(fitted!);
});

test("films only hides series and comes back for a searched series", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator('[id="wandavision"]')).toHaveCount(1);
  await page.getByRole("button", { name: /Show films only/ }).click();
  await expect(page).toHaveURL(/media=movies/);
  await expect(page.locator('[id="wandavision"]')).toHaveCount(0);
  await page.keyboard.press("/");
  await page.keyboard.type("wandavision");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/work=wandavision/);
  await expect(page).not.toHaveURL(/media=movies/);
});

test("hovering a franchise card focuses it", async ({ page }) => {
  // Select X-Men to bring its card into view, then clear the selection.
  await page.goto("./?work=x-men");
  await page.waitForTimeout(600);
  await page.keyboard.press("Escape");
  const xMen = await page.locator('[id="x-men"]').boundingBox();
  await page.mouse.move(xMen!.x + xMen!.width / 2, xMen!.y + xMen!.height + 30);
  await expect.poll(() => opacityOf(page, "iron-man")).toBeLessThan(0.5);
  expect(await opacityOf(page, "x-men")).toBe(1);
});

test("About shows the TMDB notice", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "About" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("not endorsed, certified, or otherwise approved by TMDB");
  await expect(dialog.getByRole("img", { name: "TMDB" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("a poster TMDB can't serve falls back to its title", async ({ page }) => {
  await page.route("https://image.tmdb.org/**", (route) => route.fulfill({ status: 404 }));
  await page.goto("./?work=iron-man");
  const ironMan = page.locator('[id="iron-man"] [data-poster-fallback]');
  await expect(ironMan).toHaveText("Iron Man");
});

test("switching works keeps the detail panel in place", async ({ page }) => {
  await page.goto("./?work=iron-man");
  const panel = page.locator("p.font-semibold").first();
  await expect(panel).toHaveText("Iron Man");
  const before = await panel.evaluate(
    (el) => el.closest("[class*=pointer-events-auto]")!.getBoundingClientRect().top,
  );
  await page.locator('button[aria-label="Iron Man 2"]').click();
  // Sampled right away: an entrance replay would start 12px higher.
  const during = await panel.evaluate(
    (el) => el.closest("[class*=pointer-events-auto]")!.getBoundingClientRect().top,
  );
  expect(Math.abs(during - before)).toBeLessThan(1);
  await expect(panel).toHaveText("Iron Man 2");
});
