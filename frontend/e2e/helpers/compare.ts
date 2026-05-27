import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

function compareAlgoBar(page: Page, side: "A" | "B") {
  const idx = side === "A" ? 0 : 1;
  return page.locator("span").filter({ hasText: /^Algo$/ }).nth(idx).locator("xpath=..");
}

function simCreateResponse(page: Page) {
  return page.waitForResponse(
    (r) =>
      r.url().includes("/api/simulate") &&
      r.request().method() === "POST" &&
      !r.url().includes("/step") &&
      r.ok(),
  );
}

function simStepResponse(page: Page) {
  return page.waitForResponse(
    (r) =>
      r.url().includes("/api/simulate/") &&
      r.url().includes("/step") &&
      r.request().method() === "POST" &&
      r.ok(),
  );
}

export async function selectCompareAlgorithm(page: Page, side: "A" | "B", name: string) {
  const creates = Promise.all([simCreateResponse(page), simCreateResponse(page)]);
  await compareAlgoBar(page, side).getByRole("button", { name, exact: true }).click();
  await creates;
}

export async function compareStep(page: Page) {
  const steps = Promise.all([simStepResponse(page), simStepResponse(page)]);
  await page.getByText("Step →").click();
  await steps;
}

export async function expectCompareSteps(page: Page, side: "A" | "B", value: string) {
  const testId = side === "A" ? "compare-steps-a" : "compare-steps-b";
  await expect(page.getByTestId(testId)).toHaveText(value, { timeout: 15_000 });
}
