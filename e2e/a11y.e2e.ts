import { expect, test } from "@playwright/test";

test("a poster reached by Tab is brought into view and selectable with Enter", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator('button[aria-label="Iron Man"]')).toBeVisible();
  // Card and phase labels come first in tab order; go on to the first poster.
  let id = "";
  for (let i = 0; i < 40 && !id; i++) {
    await page.keyboard.press("Tab");
    id = await page.evaluate(() =>
      document.activeElement?.matches("[data-slot=tooltip-trigger]")
        ? document.activeElement.id
        : "",
    );
  }
  expect(id).toBeTruthy();
  const focused = page.locator(`[id="${id}"]`);
  await expect(focused).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(focused).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(new RegExp(`work=${id}`));
});

test("reduced motion selects a poster without animating its scale", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  const ironMan = page.locator('button[aria-label="Iron Man"]');
  await expect(ironMan).toBeVisible();
  // Record the poster's scale every frame from the click on: with motion it
  // springs through in-between values, without it jumps from 1 to 1.25.
  const scales = page.evaluate(
    () =>
      new Promise<number[]>((resolve) => {
        const el = document.getElementById("iron-man")!;
        const seen: number[] = [];
        const start = performance.now();
        const sample = () => {
          const matrix = new DOMMatrixReadOnly(getComputedStyle(el).transform);
          seen.push(Math.round(matrix.a * 1000) / 1000);
          if (performance.now() - start < 700) requestAnimationFrame(sample);
          else resolve(seen);
        };
        requestAnimationFrame(sample);
      }),
  );
  // A DOM click, not a mouse one: the pointer resting on the poster would add
  // its hover scale on top.
  await ironMan.evaluate((el) => (el as HTMLElement).click());
  const seen = await scales;
  expect(seen.at(-1)).toBe(1.25);
  expect(seen.filter((scale) => scale > 1.001 && scale < 1.249)).toEqual([]);
});
