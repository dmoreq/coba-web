import type { APIRequestContext, Page } from "@playwright/test";

const API = process.env.API_BASE_URL ?? "http://localhost:8000";

export async function measureStepApiMs(request: APIRequestContext): Promise<number> {
  const create = await request.post(`${API}/api/simulate`, {
    data: {
      arms: null,
      algorithm: "ucb1",
      hyperparams: {},
      seed: 1,
      scenario_id: "notification_channels",
    },
  });
  if (!create.ok()) throw new Error(`create failed: ${create.status()}`);
  const { id } = (await create.json()) as { id: string };
  const t0 = Date.now();
  const step = await request.post(`${API}/api/simulate/${id}/step`);
  if (!step.ok()) throw new Error(`step failed: ${step.status()}`);
  await request.delete(`${API}/api/simulate/${id}`);
  return Date.now() - t0;
}

export async function measureRouteReadyMs(
  page: Page,
  linkName: string,
  readySelector: { role: "heading"; name: string } | { testId: string },
): Promise<number> {
  const t0 = Date.now();
  await page.locator("header").getByRole("button", { name: linkName, exact: true }).click();
  if ("role" in readySelector) {
    await page.getByRole(readySelector.role, { name: readySelector.name }).waitFor({
      timeout: 10_000,
    });
  } else {
    await page.getByTestId(readySelector.testId).waitFor({ timeout: 10_000 });
  }
  return Date.now() - t0;
}
