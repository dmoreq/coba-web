import { test, expect } from "@playwright/test";
import { SCENARIOS } from "./fixtures/scenarios";
import { gotoPlayground, selectAlgorithm, selectScenario, stepTimes } from "./helpers/playground";

test.describe("Scenario picker", () => {
  for (const { label } of SCENARIOS) {
    test(`switch to ${label} resets to t=0`, async ({ page }) => {
      await gotoPlayground(page);
      await selectScenario(page, label);
      await expect(page.getByText(/t=0/).first()).toBeVisible();
    });
  }

  test("Content Format shows drift in scenario info", async ({ page }) => {
    await gotoPlayground(page);
    await selectScenario(page, "Content Format");
    await expect(page.getByTestId("scenario-drift-badge")).toBeVisible();
  });

  test("News Feed steps with environment panel", async ({ page }) => {
    await gotoPlayground(page);
    await selectScenario(page, "News Feed");
    await selectAlgorithm(page, "LinUCB");
    await stepTimes(page, 2);
    await expect(page.getByText("Environment")).toBeVisible();
  });

  test("Ad Creative Selection shows population segments", async ({ page }) => {
    await gotoPlayground(page);
    await selectScenario(page, "Ad Creative Selection");
    await selectAlgorithm(page, "LinUCB");
    await stepTimes(page, 1);
    await expect(page.getByTestId("segment-chart")).toBeVisible();
  });
});
