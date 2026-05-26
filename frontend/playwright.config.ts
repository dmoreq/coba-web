import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
  },
  webServer: [
    {
      command: "cd ../backend && uv run uvicorn coba_server.main:app --port 8000",
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
