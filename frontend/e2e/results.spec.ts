import { test, expect } from "@playwright/test";
import { gotoPlayground, gotoResults, stepTimes } from "./helpers/playground";

test.describe("Results page", () => {
  test("empty state prompts go to playground", async ({ page }) => {
    await page.goto("/results");
    await expect(page.getByText("No data yet")).toBeVisible();
    await page.getByRole("button", { name: /Go to Playground/i }).click();
    await expect(page).toHaveURL(/\/playground/);
  });

  test("populated results show stat cards and table", async ({ page }) => {
    await gotoPlayground(page);
    await stepTimes(page, 5);
    await gotoResults(page);
    await expect(page.getByText("Simulation Results")).toBeVisible();
    await expect(page.getByText("Cumulative regret", { exact: true })).toBeVisible();
    await expect(page.getByText("Learned vs True Rates")).toBeVisible();
  });
});
