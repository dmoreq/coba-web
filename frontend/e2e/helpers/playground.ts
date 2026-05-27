import type { Page } from "@playwright/test";

export async function gotoPlayground(page: Page) {
  await page.goto("/playground");
  await waitPlaygroundReady(page);
  await page.getByTestId("playground-step-counter").filter({ hasText: "t=0" }).waitFor({
    timeout: 30_000,
  });
}

export async function gotoResults(page: Page) {
  await headerNav(page, "Results").click();
  await page.waitForURL(/\/results/);
}

function algoSelector(page: Page) {
  return page.locator("span").filter({ hasText: /^Algo$/ }).locator("xpath=..");
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

/** Wait until playground is not mid-request (create, step, reset, scenario switch). */
export async function waitPlaygroundReady(page: Page) {
  await page.getByText("Step →").waitFor({ state: "visible", timeout: 15_000 });
  await page.getByText("Running simulation...").waitFor({ state: "hidden", timeout: 45_000 }).catch(() => {});
}

export async function stepTimes(page: Page, n: number) {
  for (let i = 0; i < n; i++) {
    const expectedT = i + 1;
    await waitPlaygroundReady(page);
    await page.getByText("Step →").click();
    await page
      .getByTestId("playground-step-counter")
      .filter({ hasText: `t=${expectedT}` })
      .waitFor({ timeout: 60_000 });
  }
}

export async function selectAlgorithm(page: Page, name: string) {
  await algoSelector(page).getByRole("button", { name, exact: true }).click();
  await page.getByTestId("playground-step-counter").filter({ hasText: "t=0" }).waitFor({
    timeout: 30_000,
  });
  await waitPlaygroundReady(page);
}

export async function openScenarioPicker(page: Page) {
  await page.getByTestId("scenario-picker-trigger").click();
  await page.getByTestId("scenario-picker-menu").waitFor({ state: "visible", timeout: 15_000 });
}

export async function selectScenario(page: Page, label: string) {
  await openScenarioPicker(page);
  const dropdown = page.getByTestId("scenario-picker-menu");
  await Promise.all([
    simCreateResponse(page),
    dropdown.getByRole("button").filter({ hasText: label }).click(),
  ]);
  await page.getByTestId("playground-step-counter").filter({ hasText: "t=0" }).waitFor({
    timeout: 15_000,
  });
  await waitPlaygroundReady(page);
}

export function headerNav(page: Page, label: string) {
  return page.locator("header").getByRole("button", { name: label, exact: true });
}

export async function revealTruth(page: Page) {
  await page.getByRole("button", { name: /Reveal truth/i }).click();
  await page.getByRole("button", { name: /Hide truth/i }).waitFor({ state: "visible", timeout: 15_000 });
}
