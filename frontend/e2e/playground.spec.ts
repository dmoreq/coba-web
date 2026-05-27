import { test, expect } from "@playwright/test";
import { gotoPlayground, selectScenario, stepTimes, selectAlgorithm } from "./helpers/playground";

test.describe("Playground controls", () => {
  test.beforeEach(async ({ page }) => {
    await gotoPlayground(page);
  });

  test("ground truth toggle reveals hide/reveal labels", async ({ page }) => {
    await stepTimes(page, 1);
    await page.getByRole("button", { name: /Reveal truth/i }).click();
    await expect(page.getByRole("button", { name: /Hide truth/i })).toBeVisible();
  });

  test("seed input is visible and accepts value", async ({ page }) => {
    const seed = page.getByTestId("playground-seed-input");
    await seed.fill("123");
    await expect(seed).toHaveValue("123");
  });

  test("reset returns to t=0", async ({ page }) => {
    await stepTimes(page, 2);
    await page.getByRole("button", { name: "Reset" }).click();
    await expect(page.getByText(/t=0/).first()).toBeVisible();
  });

  test("play then pause freezes step counter", async ({ page }) => {
    await page.getByText("▶ Play").click();
    await page.waitForTimeout(800);
    await page.getByText("⏸ Pause").click();
    const t1 = await page.getByText(/t=\d+/).first().textContent();
    await page.waitForTimeout(1000);
    const t2 = await page.getByText(/t=\d+/).first().textContent();
    expect(t2).toBe(t1);
  });

  test("Why panel appears after first step", async ({ page }) => {
    await stepTimes(page, 1);
    await expect(page.getByText(/Why step \d+\?/)).toBeVisible();
  });
});

test.describe("Playground charts", () => {
  test("three chart panels populate after two steps", async ({ page }) => {
    await gotoPlayground(page);
    await stepTimes(page, 2);
    await expect(page.getByText("Cumulative Regret")).toBeVisible();
    await expect(page.getByText("Cumulative Rewards")).toBeVisible();
    await expect(page.getByText("Pull Distribution")).toBeVisible();
  });

  test("Context Space visible for two-feature scenario", async ({ page }) => {
    await gotoPlayground(page);
    await selectScenario(page, "Notification Channels");
    await selectAlgorithm(page, "LinUCB");
    await stepTimes(page, 1);
    await expect(page.getByText("Context Space")).toBeVisible();
  });
});

test.describe("Drift scenario chart", () => {
  test.skip(!process.env.E2E_SLOW, "Set E2E_SLOW=1 to run the 205-step drift test");

  test("drift annotations appear after drift begins", async ({ page }) => {
    test.slow();
    await gotoPlayground(page);
    await selectScenario(page, "Content Format");
    await selectAlgorithm(page, "SW-LinUCB");
    for (let i = 1; i <= 205; i++) {
      await page.getByText("Step →").click();
      await page.getByText(new RegExp(`t=${i}`)).waitFor({ timeout: 20_000 });
    }
    await expect(page.getByText("Drift begins")).toBeVisible();
  });
});
