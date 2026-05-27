import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  snapshotPathTemplate: "{testDir}/__screenshots__/{testFilePath}/{arg}{ext}",
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      maxDiffPixels: 150,
    },
  },
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /mobile\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      testMatch: /mobile\.spec\.ts/,
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: [
    {
      command: "cd ../backend && uv run uvicorn coba_server:app --port 8000",
      port: 8000,
      reuseExistingServer: true,
    },
    {
      command: "cd ../frontend && pnpm dev",
      port: 3000,
      reuseExistingServer: true,
    },
  ],
});
