import { test, expect } from "@playwright/test";
import { gotoPlayground, stepTimes } from "./helpers/playground";
import { measureRouteReadyMs, measureStepApiMs } from "./helpers/perf";

test.describe("Performance smoke", () => {
  test("API single UCB1 step completes within budget", async ({ request }) => {
    const ms = await measureStepApiMs(request);
    const budget = Number(process.env.STEP_API_BUDGET_MS ?? "800");
    expect(ms).toBeLessThan(budget);
  });

  test("header nav to Glossary feels instant", async ({ page }) => {
    await page.goto("/playground");
    const ms = await measureRouteReadyMs(page, "Glossary", {
      role: "heading",
      name: "Glossary",
    });
    const navBudget = Number(process.env.NAV_BUDGET_MS ?? "1200");
    expect(ms).toBeLessThan(navBudget);
  });

  test("step button shows busy state while step is in flight", async ({ page }) => {
    await gotoPlayground(page);
    await page.route("**/api/simulate/*/step", async (route) => {
      await new Promise((r) => setTimeout(r, 300));
      await route.continue();
    });
    const step = page.getByTestId("playback-step-button");
    await step.click();
    await expect(step).toHaveAttribute("aria-busy", "true", { timeout: 100 });
    await expect(step).toHaveAttribute("aria-busy", "false", { timeout: 10_000 });
  });

  test("manual step updates counter within budget", async ({ page }) => {
    await gotoPlayground(page);
    const t0 = Date.now();
    await stepTimes(page, 1);
    expect(Date.now() - t0).toBeLessThan(2000);
  });
});

test.describe("Performance smoke (mobile viewport)", () => {
  test.use({ viewport: { width: 393, height: 851 } });

  test("mobile step button shows busy state", async ({ page }) => {
    await gotoPlayground(page);
    await page.route("**/api/simulate/*/step", async (route) => {
      await new Promise((r) => setTimeout(r, 300));
      await route.continue();
    });
    const step = page.getByTestId("playback-step-button");
    await step.click();
    await expect(step).toHaveAttribute("aria-busy", "true", { timeout: 100 });
  });
});
