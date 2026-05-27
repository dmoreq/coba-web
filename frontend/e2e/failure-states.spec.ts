import { test, expect } from "@playwright/test";
import { gotoPlayground } from "./helpers/playground";

function requestPath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    const withoutQuery = url.split("?")[0] ?? url;
    return withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;
  }
}

function isSimulateCreatePost(url: string, method: string) {
  if (method !== "POST") return false;
  return requestPath(url) === "/api/simulate";
}

function isSimulateStepPost(url: string, method: string) {
  if (method !== "POST") return false;
  return /\/api\/simulate\/[^/]+\/step$/.test(requestPath(url));
}

test.describe("API failure UX", () => {
  test("playground shows error when simulation create fails", async ({ page }) => {
    await page.route(/\/api\/simulate/, async (route) => {
      const req = route.request();
      if (isSimulateCreatePost(req.url(), req.method())) {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Simulation unavailable" }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto("/playground");
    await expect(page.getByText("Simulation unavailable")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Dismiss" })).toBeVisible();
  });

  test("playground shows error when step fails after create", async ({ page }) => {
    await page.route(/\/api\/simulate/, async (route) => {
      const req = route.request();
      if (isSimulateStepPost(req.url(), req.method())) {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Step unavailable" }),
        });
        return;
      }
      await route.continue();
    });

    await gotoPlayground(page);
    await page.getByText("Step →").click();
    await expect(page.getByText("Step unavailable")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Step →")).toBeVisible();
  });

  test("landing shows error when scenario list fails", async ({ page }) => {
    await page.route("**/api/scenarios", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Server error" }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto("/");
    await expect(page.getByText("Could not load scenarios").first()).toBeVisible({ timeout: 15_000 });
  });

  test("results empty state without active simulation", async ({ page }) => {
    await page.goto("/results");
    await expect(page.getByText("No data yet")).toBeVisible();
    await expect(page.getByRole("button", { name: /Go to Playground/i })).toBeVisible();
  });
});
