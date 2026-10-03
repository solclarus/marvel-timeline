import { expect, type Page } from "@playwright/test";

// Fails the test on any uncaught error or console error.
export function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return () => expect(errors).toEqual([]);
}

export const zoomLabel = (page: Page) => page.getByRole("button", { name: "Fit to view" }).first();

// A trackpad pinch arrives as ctrl+wheel; negative deltaY zooms in.
export async function pinch(page: Page, deltaY: number, times: number) {
  await page.evaluate(
    ([deltaY, times]) => {
      const wrapper = document.querySelector(".react-transform-wrapper")!;
      for (let i = 0; i < times; i++) {
        wrapper.dispatchEvent(
          new WheelEvent("wheel", {
            deltaY,
            ctrlKey: true,
            clientX: 640,
            clientY: 400,
            bubbles: true,
            cancelable: true,
          }),
        );
      }
    },
    [deltaY, times] as const,
  );
}

export const opacityOf = (page: Page, id: string) =>
  page.locator(`[id="${id}"]`).evaluate((el) => Number(getComputedStyle(el).opacity));
