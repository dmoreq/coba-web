import { test, expect } from "@playwright/test";

test.describe("Glossary page", () => {
  test("search filters and expand shows detail", async ({ page }) => {
    await page.goto("/glossary");
    await page.getByPlaceholder(/Search/).fill("UCB");
    await expect(page.getByText("UCB1")).toBeVisible();
    await page.getByText("UCB1").click();
    await expect(page.getByText(/exploration bonus/i)).toBeVisible();
  });

  test("empty search shows no match message", async ({ page }) => {
    await page.goto("/glossary");
    await page.getByPlaceholder(/Search/).fill("zzznomatchxyz");
    await expect(page.getByText(/No terms match/)).toBeVisible();
  });
});
