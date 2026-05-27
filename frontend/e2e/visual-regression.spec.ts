import { test, expect } from "@playwright/test";
import { compareStep } from "./helpers/compare";
import { gotoPlayground, gotoResults, stepTimes } from "./helpers/playground";

test.describe("Visual regression", () => {
  test("playground page after 20 steps", async ({ page }) => {
    await page.goto("/playground");
    await page.waitForTimeout(2000);
    for (let i = 0; i < 20; i++) {
      await page.getByText("Step →").click();
      await page.waitForTimeout(200);
    }
    await expect(page).toHaveScreenshot("playground-20-steps.png", {
      fullPage: true,
    });
  });

  test("landing page hero", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot("landing.png", { fullPage: true });
  });

  test("settings page controls", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot("settings.png", { fullPage: true });
  });

  test("compare page after dual step", async ({ page }) => {
    await page.goto("/compare");
    await page.getByText("Compare Algorithms").waitFor({ timeout: 15_000 });
    await compareStep(page);
    await compareStep(page);
    await expect(page).toHaveScreenshot("compare-2-steps.png", { fullPage: true });
  });

  test("results page populated", async ({ page }) => {
    await gotoPlayground(page);
    await stepTimes(page, 5);
    await gotoResults(page);
    await page.getByText("Simulation Results").waitFor({ timeout: 15_000 });
    await expect(page).toHaveScreenshot("results-populated.png", { fullPage: true });
  });
});
