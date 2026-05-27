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
  return page.waitForResponse((r) => r.url().includes("/api/simulate/") && r.url().includes("/step") && r.ok());
}

export async function selectCompareAlgorithm(page: Page, side: "A" | "B", name: string) {
  const creates = Promise.all([simCreateResponse(page), simCreateResponse(page)]);
  await compareAlgoBar(page, side).getByRole("button", { name, exact: true }).click();
  await creates;
}

export async function compareStep(page: Page) {
  const step = simStepResponse(page);
  await page.getByText("Step →").click();
  await step;
}

export async function expectCompareSteps(page: Page, value: string) {
  await expect(page.locator(".tabular-nums").filter({ hasText: new RegExp(`^${value}$`) }).first()).toBeVisible({
    timeout: 15_000,
  });
}
