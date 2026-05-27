import { test, expect } from "@playwright/test";
import { headerNav } from "./helpers/playground";

test.describe("Settings page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  });

  test("apply persists algorithm to playground", async ({ page }) => {
    await page.getByText("Thompson", { exact: true }).click();
    await page.getByRole("button", { name: /Apply/i }).click();
    await headerNav(page, "Playground").click();
    await page.getByText("Step →").waitFor({ timeout: 15_000 });
    await expect(page.getByText("Thompson", { exact: true })).toBeVisible();
  });

  test("LinUCB shows alpha hyperparameter slider", async ({ page }) => {
    await page.getByText("LinUCB", { exact: true }).click();
    await expect(page.getByText(/α.*Exploration width/)).toBeVisible();
  });

  test("add and remove arm", async ({ page }) => {
    const removeButtons = page.locator("button").filter({ hasText: "×" });
    const initialCount = await removeButtons.count();
    await page.getByText("+ Add arm").click();
    await expect(page.locator('input[value="Arm 4"]')).toBeVisible();
    await expect(removeButtons).toHaveCount(initialCount + 1);
    await removeButtons.first().click();
    await expect(removeButtons).toHaveCount(initialCount);
  });
});
