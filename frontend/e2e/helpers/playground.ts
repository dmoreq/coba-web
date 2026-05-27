import type { Page } from "@playwright/test";

export async function gotoPlayground(page: Page) {
  await page.goto("/playground");
  await page.getByText("Step →").waitFor({ state: "visible", timeout: 15_000 });
  await page.getByText("Running simulation...").waitFor({ state: "hidden", timeout: 15_000 }).catch(() => {});
}

export async function gotoResults(page: Page) {
  await headerNav(page, "Results").click();
  await page.waitForURL(/\/results/);
}

function algoSelector(page: Page) {
  return page.locator("span").filter({ hasText: /^Algo$/ }).locator("xpath=..");
}

export async function stepTimes(page: Page, n: number) {
  for (let i = 0; i < n; i++) {
    await page.getByText("Step →").click();
    await page
      .getByText(new RegExp(`t=${i + 1}`))
      .first()
      .waitFor({ timeout: 30_000 });
  }
}

export async function selectAlgorithm(page: Page, name: string) {
  await algoSelector(page).getByRole("button", { name, exact: true }).click();
  await page.getByText(/t=0/).first().waitFor({ timeout: 15_000 });
}

export async function openScenarioPicker(page: Page) {
  await page.locator("button").filter({ hasText: "▼" }).first().click();
}

export async function selectScenario(page: Page, label: string) {
  await openScenarioPicker(page);
  const dropdown = page.locator(".absolute").filter({ has: page.locator("button") }).first();
  await dropdown.getByRole("button").filter({ hasText: label }).click();
  await page.getByText(/t=0/).first().waitFor({ timeout: 15_000 });
}

export function headerNav(page: Page, label: string) {
  return page.locator("header").getByRole("button", { name: label, exact: true });
}
