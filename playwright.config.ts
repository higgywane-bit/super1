import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end demos against the local stack: `npm run db:start`, `npm run dev`, then `npm run e2e`.
 * world.localhost and app.localhost resolve to this machine in Chromium.
 */
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    trace: "retain-on-failure",
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : undefined,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 940 } } },
  ],
  webServer: process.env.E2E_NO_SERVER
    ? undefined
    : { command: "npm run dev", url: "http://localhost:3000/", reuseExistingServer: true, timeout: 120_000 },
});
