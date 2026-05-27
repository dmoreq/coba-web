import { test, expect } from "@playwright/test";
import { gotoPlayground, gotoResults, headerNav, selectScenario, stepTimes } from "./helpers/playground";

test("settings → playground → results journey", async ({ page }) => {
  await page.goto("/settings");
  await page.getByText("Thompson", { exact: true }).click();
  await page.getByRole("button", { name: /Apply/i }).click();
  await headerNav(page, "Playground").click();
  await page.getByText("Step →").waitFor({ timeout: 15_000 });
  await stepTimes(page, 10);
  await gotoResults(page);
  await expect(page.getByText("Simulation Results")).toBeVisible();
  await expect(page.getByText("Thompson", { exact: true }).first()).toBeVisible();
});

test("playground scenario persists across navigation", async ({ page }) => {
  await gotoPlayground(page);
  await selectScenario(page, "Product Recommendations");
  await headerNav(page, "Compare").click();
  await expect(page.getByText("Compare Algorithms")).toBeVisible();
  await headerNav(page, "Playground").click();
  await page.getByText("Step →").waitFor({ timeout: 15_000 });
  await expect(
    page.locator("button").filter({ hasText: "Product Recommendations" }).first(),
  ).toBeVisible();
});
