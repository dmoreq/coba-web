import { test, expect } from "@playwright/test";
import { compareStep, expectCompareSteps, selectCompareAlgorithm } from "./helpers/compare";

test.describe("Compare page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/compare");
    await page.getByText("Compare Algorithms").waitFor({ timeout: 15_000 });
    await expect(page.getByText("Algorithm A")).toBeVisible();
  });

  test("switch algorithm B and step", async ({ page }) => {
    await selectCompareAlgorithm(page, "B", "LinUCB");
    await compareStep(page);
    await expectCompareSteps(page, "1");
  });

  test("dual regret comparison chart after steps", async ({ page }) => {
    await compareStep(page);
    await compareStep(page);
    await expect(page.getByText("Cumulative Regret Comparison")).toBeVisible();
  });

  test("ground truth toggle on compare", async ({ page }) => {
    await page.getByRole("button", { name: /Reveal truth/i }).click();
    await expect(page.getByRole("button", { name: /Hide truth/i })).toBeVisible();
  });

  test("reset returns to t=0", async ({ page }) => {
    await compareStep(page);
    await page.getByRole("button", { name: "Reset" }).click();
    await expectCompareSteps(page, "0");
  });
});
