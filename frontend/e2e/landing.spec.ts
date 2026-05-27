import { test, expect } from "@playwright/test";
import { SCENARIOS } from "./fixtures/scenarios";

test.describe("Landing page", () => {
  test("hero CTA opens playground", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Open Playground/i }).click();
    await expect(page).toHaveURL(/\/playground/);
  });

  test("scenario showcase loads five scenarios from API", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Real-World Scenarios")).toBeVisible();
    for (const { label } of SCENARIOS) {
      await expect(page.getByRole("heading", { name: label })).toBeVisible({ timeout: 10_000 });
    }
  });

  test("algorithm strip shows UCB1 and LinUCB", async ({ page }) => {
    await page.goto("/");
    const strip = page.locator("span").filter({ hasText: /^Algorithms$/ }).locator("xpath=..");
    await expect(strip.getByText("UCB1", { exact: true })).toBeVisible();
    await expect(strip.getByText("LinUCB", { exact: true })).toBeVisible();
  });
});
