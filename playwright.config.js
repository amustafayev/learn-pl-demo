import { defineConfig, devices } from "@playwright/test";

// Browser tests: `npm run test:e2e`. They drive the real teacher app (/) and
// student app (/student/) on the dev server — reusing one already running
// on 5173, or starting it. Unit tests are `npm test` (vitest.config.js).
// See "Tests" in CLAUDE.md.
export default defineConfig({
  testDir: "e2e",
  // Each test gets its own browser context: its own mock db, storage and
  // tab sync, so tests can't see each other and may run in parallel.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:5173",
    viewport: { width: 1400, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1400, height: 900 } } }],
  webServer: {
    command: "npm run dev -- --port 5173 --strictPort",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
