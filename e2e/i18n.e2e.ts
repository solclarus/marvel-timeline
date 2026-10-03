import { expect, test } from "@playwright/test";

test("switches to Japanese and remembers it", async ({ page }) => {
  await page.goto("./?work=thor-ragnarok");
  await expect(page.locator("[data-slot=detail-title]").first()).toHaveText("Thor: Ragnarok");
  await page.getByRole("button", { name: "View settings" }).click();
  await page.getByRole("button", { name: "日本語" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(page.locator("[data-slot=detail-title]").first()).toHaveText(
    "マイティ・ソー バトルロイヤル",
  );
  await expect(page.getByRole("button", { name: "表示設定" })).toBeVisible();
  await page.reload();
  await expect(page.locator("[data-slot=detail-title]").first()).toHaveText(
    "マイティ・ソー バトルロイヤル",
  );
});

test.describe("with a Japanese browser", () => {
  test.use({ locale: "ja-JP" });

  test("starts in Japanese and finds works by Japanese title", async ({ page }) => {
    await page.goto("./");
    await expect(page.getByPlaceholder("作品を検索…")).toBeVisible();
    await page.keyboard.press("/");
    await page.keyboard.type("ローガン");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/work=logan/);
    await expect(page.locator("[data-slot=detail-title]").first()).toHaveText("LOGAN／ローガン");
  });
});
