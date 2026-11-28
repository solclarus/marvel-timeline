import { expect, test } from "@playwright/test";

test("a work's link goes through its preview page and opens the same view", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("./?work=thor-ragnarok&mode=release");
  await page.getByRole("button", { name: "Share link" }).click();
  await expect(page.getByRole("status")).toHaveText("Link copied");
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toBe("http://localhost:4173/w/thor-ragnarok/?mode=release");

  // The page previews the work, then hands over to the app with the query.
  const response = await page.request.get(link);
  const html = await response.text();
  expect(html).toContain('<meta property="og:title" content="Thor: Ragnarok: what to watch first');
  await page.goto(link);
  await expect(page).toHaveURL(/\/\?work=thor-ragnarok&mode=release$/);
  await expect(page.locator("[data-slot=detail-title]").first()).toHaveText("Thor: Ragnarok");
});
