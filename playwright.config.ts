import { defineConfig, devices } from "@playwright/test";

// End-to-end checks against the production build, served by `vite preview`.
// Locally, PLAYWRIGHT_CHANNEL=chrome reuses an installed Chrome instead of
// Playwright's own browser download.
const channel = process.env.PLAYWRIGHT_CHANNEL;

export default defineConfig({
  testDir: "e2e",
  testMatch: "*.e2e.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: { baseURL: "http://localhost:4173/", trace: "retain-on-failure" },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], channel },
      testIgnore: "*.phone.e2e.ts",
    },
    { name: "phone", use: { ...devices["Pixel 7"], channel }, testMatch: "*.phone.e2e.ts" },
  ],
  webServer: {
    command: "pnpm build && pnpm preview --port 4173 --strictPort",
    url: "http://localhost:4173/",
    // Always a fresh build: reusing a running preview would test stale code.
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
