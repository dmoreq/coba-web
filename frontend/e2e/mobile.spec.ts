import { test, expect } from "@playwright/test";
import { gotoPlayground, headerNav, stepTimes } from "./helpers/playground";

test.describe("Mobile smoke", () => {
  test("landing CTA opens playground with Step visible", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Open Playground/i }).click();
    await expect(page).toHaveURL(/\/playground/);
    await expect(page.getByText("Step →")).toBeVisible({ timeout: 15_000 });
  });

  test("route navigation shows primary content on main pages", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/Explore–Exploit|Bandit Simulator/).first()).toBeVisible();

    await page.goto("/playground");
    await expect(page.getByText("Step →")).toBeVisible({ timeout: 15_000 });

    await headerNav(page, "Settings").click();
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    await headerNav(page, "Glossary").click();
    await expect(page).toHaveURL(/\/glossary/);
    await expect(page.getByRole("heading", { name: "Glossary" })).toBeVisible();
  });

  test("playground one step shows t=1", async ({ page }) => {
    await gotoPlayground(page);
    await stepTimes(page, 1);
    await expect(page.getByText(/t=1/).first()).toBeVisible();
  });

  test("settings LinUCB shows alpha slider text", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await page.getByText("LinUCB", { exact: true }).click();
    await expect(page.getByText(/α.*Exploration width/)).toBeVisible();
  });
});
