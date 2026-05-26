import { test, expect } from "@playwright/test";

test.describe("Backend integration", () => {
  test("landing page loads and Playground navigation works", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Bandit Simulator")).toBeVisible();
    await page.getByText("Playground").click();
    await expect(page).toHaveURL(/\/playground/);
  });

  test("single step updates UI", async ({ page }) => {
    await page.goto("/playground");
    await page.waitForTimeout(2000); // Wait for backend init
    await page.getByText("Step →").click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/t=1/)).toBeVisible();
  });

  test("play and pause", async ({ page }) => {
    await page.goto("/playground");
    await page.waitForTimeout(2000);
    await page.getByText("▶ Play").click();
    await page.waitForTimeout(1000);
    await page.getByText("⏸ Pause").click();
    await page.waitForTimeout(500);
    // t should have incremented
    const text = await page.getByText(/t=\d+/).textContent();
    expect(Number(text?.replace("t=", ""))).toBeGreaterThan(0);
  });

  test("algorithm switch resets simulation", async ({ page }) => {
    await page.goto("/playground");
    await page.waitForTimeout(2000);
    // Step a few times
    await page.getByText("Step →").click();
    await page.waitForTimeout(300);
    await page.getByText("Step →").click();
    await page.waitForTimeout(300);
    // Switch algorithm
    await page.getByText("Thompson Sampling").click();
    await page.waitForTimeout(1000);
    // t should be back to 0
    await expect(page.getByText(/t=0/)).toBeVisible();
  });

  test("glossary search filters cards", async ({ page }) => {
    await page.goto("/glossary");
    await expect(page.getByText("Glossary")).toBeVisible();
    await page.getByPlaceholder(/Search/).fill("UCB");
    await expect(page.getByText("UCB1")).toBeVisible();
  });

  test("full flow: landing → playground → settings → back", async ({ page }) => {
    await page.goto("/");
    await page.getByText("Open Playground").click();
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/playground/);
    await page.getByText("Step →").click();
    await page.waitForTimeout(300);
    // Navigate to Settings
    await page.getByText("Settings").click();
    await expect(page).toHaveURL(/\/settings/);
  });
});
