import { test, expect } from "@playwright/test";
import { headerNav } from "./helpers/playground";

const ROUTES = [
  { path: "/", heading: /Explore–Exploit|Bandit Simulator/ },
  { path: "/playground", waitStep: true },
  { path: "/compare", text: "Compare Algorithms" },
  { path: "/settings", heading: "Settings" },
  { path: "/results", heading: /No data yet|Simulation Results/ },
  { path: "/glossary", heading: "Glossary" },
];

test.describe("Navigation", () => {
  test("header links reach all routes", async ({ page }) => {
    await page.goto("/");
    for (const label of ["Playground", "Compare", "Settings", "Results", "Glossary"]) {
      await headerNav(page, label).click();
      await expect(page).toHaveURL(new RegExp(label.toLowerCase()));
    }
  });

  for (const route of ROUTES) {
    test(`${route.path} renders primary content`, async ({ page }) => {
      await page.goto(route.path);
      if ("waitStep" in route && route.waitStep) {
        await page.getByText("Step →").waitFor({ timeout: 15_000 });
      } else if ("text" in route && route.text) {
        await expect(page.getByText(route.text).first()).toBeVisible();
      } else if ("heading" in route && route.heading) {
        if (route.heading instanceof RegExp) {
          await expect(page.getByText(route.heading).first()).toBeVisible();
        } else {
          await expect(page.getByRole("heading", { name: route.heading })).toBeVisible();
        }
      }
    });
  }

  test("no hydration errors across tabs", async ({ page }) => {
    const logs: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") logs.push(msg.text());
    });
    for (const { path } of ROUTES) {
      await page.goto(path);
      if (path === "/playground") {
        await page.getByText("Step →").waitFor({ timeout: 15_000 });
      } else {
        await page.waitForLoadState("domcontentloaded");
      }
    }
    expect(logs.filter((l) => l.includes("hydration"))).toHaveLength(0);
  });
});
