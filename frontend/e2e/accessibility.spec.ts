import { test, expect } from "@playwright/test";
import { gotoPlayground } from "./helpers/playground";

test.describe("Accessibility smoke", () => {
  test("header keyboard navigation focuses Playground", async ({ page }) => {
    await page.goto("/");
    const playground = page.locator("header").getByRole("button", { name: "Playground", exact: true });
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press("Tab");
      if (await playground.evaluate((el) => document.activeElement === el)) break;
    }
    await expect(playground).toBeFocused();
  });

  test("glossary search filters via keyboard", async ({ page }) => {
    await page.goto("/glossary");
    const search = page.getByPlaceholder(/Search/);
    await search.focus();
    await page.keyboard.type("UCB");
    await expect(page.getByText("UCB1")).toBeVisible();
    await expect(page.getByText(/No terms match/)).not.toBeVisible();
  });

  test("scenario picker opens and closes with keyboard", async ({ page }) => {
    await gotoPlayground(page);
    const trigger = page.getByTestId("scenario-picker-trigger");
    const menu = page.getByTestId("scenario-picker-menu");
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(menu).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).not.toBeVisible();
  });
});
