import { test, expect } from "@playwright/test";

const ALGORITHMS_P0 = [
  { name: "UCB1", algo: "ucb1" },
  { name: "Thompson", algo: "thompson" },
  { name: "\u03B5-Greedy", algo: "epsilon_greedy" },
  { name: "LinUCB", algo: "linucb" },
];

const ALGORITHMS_P1 = [
  { name: "LinTS", algo: "lints" },
  { name: "SW-LinUCB", algo: "linucb_sw" },
  { name: "Softmax", algo: "softmax" },
  { name: "Neural Linear", algo: "neural_linear" },
];

test.describe("Landing page and navigation", () => {
  test("landing page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Bandit Simulator")).toBeVisible();
  });

  test("Playground navigation works", async ({ page }) => {
    await page.goto("/");
    await page.getByText("Playground").click();
    await expect(page).toHaveURL(/\/playground/);
  });

  test("all tabs render without hydration errors", async ({ page }) => {
    const logs: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") logs.push(msg.text());
    });
    for (const tab of ["/", "/playground", "/compare", "/settings", "/results", "/glossary"]) {
      await page.goto(tab);
      await page.waitForTimeout(500);
    }
    const hydrations = logs.filter((l) => l.includes("hydration"));
    expect(hydrations).toHaveLength(0);
  });
});

test.describe("Playground smoke tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/playground");
    await page.waitForTimeout(2000);
  });

  test("single step updates UI", async ({ page }) => {
    await page.getByText("Step \u2192").click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/t=1/)).toBeVisible();
  });

  test("play and pause stops immediately", async ({ page }) => {
    await page.getByText("\u25B6 Play").click();
    await page.waitForTimeout(500);
    await page.getByText("\u23F8 Pause").click();
    await page.waitForTimeout(500);
    const text = await page.getByText(/t=\d+/).textContent();
    expect(text).toBeTruthy();
    const t = Number(text?.replace("t=", ""));
    // Wait another second to make sure t doesn't increase
    await page.waitForTimeout(1000);
    const text2 = await page.getByText(/t=\d+/).textContent();
    const t2 = Number(text2?.replace("t=", ""));
    expect(t2).toBe(t);
  });

  test("default speed is 0.5", async ({ page }) => {
    const speedBtn = page.getByText("0.5\u00D7");
    await expect(speedBtn).toBeVisible();
  });

  test("three-panel chart row renders equally", async ({ page }) => {
    await page.getByText("Step \u2192").click();
    await page.waitForTimeout(300);
    await page.getByText("Step \u2192").click();
    await page.waitForTimeout(300);
    await expect(page.getByText("Cumulative Regret")).toBeVisible();
    await expect(page.getByText("Cumulative Rewards")).toBeVisible();
    await expect(page.getByText("Pull Distribution")).toBeVisible();
  });

  test("algorithm switch resets simulation", async ({ page }) => {
    await page.getByText("Step \u2192").click();
    await page.waitForTimeout(300);
    await page.getByText("Step \u2192").click();
    await page.waitForTimeout(300);
    await page.getByText("LinTS").click();
    await page.waitForTimeout(1000);
    await expect(page.getByText(/t=0/)).toBeVisible();
  });
});

test.describe("16-algorithm smoke tests (P0)", () => {
  for (const { name } of ALGORITHMS_P0) {
    test(`${name} runs 5 steps without error`, async ({ page }) => {
      await page.goto("/playground");
      await page.waitForTimeout(2000);
      await page.getByText(name).click();
      await page.waitForTimeout(500);
      for (let i = 0; i < 5; i++) {
        await page.getByText("Step \u2192").click();
        await page.waitForTimeout(200);
      }
      await expect(page.getByText(/t=5/)).toBeVisible();
    });
  }
});

test.describe("16-algorithm smoke tests (P1)", () => {
  for (const { name } of ALGORITHMS_P1) {
    test(`${name} runs 3 steps without error`, async ({ page }) => {
      await page.goto("/playground");
      await page.waitForTimeout(2000);
      await page.getByText(name).click();
      await page.waitForTimeout(500);
      for (let i = 0; i < 3; i++) {
        await page.getByText("Step \u2192").click();
        await page.waitForTimeout(300);
      }
      await expect(page.getByText(/t=3/)).toBeVisible();
    });
  }
});

test.describe("Settings page flows", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings");
    await page.waitForTimeout(500);
  });

  test("arm label editable", async ({ page }) => {
    const labelInput = page.locator('input[type="text"]').first();
    await labelInput.fill("Newsletter");
    await expect(labelInput).toHaveValue("Newsletter");
  });

  test("arm probability slider changes value", async ({ page }) => {
    const slider = page.locator('input[type="range"]').first();
    await slider.fill("0.9");
    const pct = page.getByText("90%");
    await expect(pct).toBeVisible();
  });

  test("add arm appears", async ({ page }) => {
    await page.getByText("+ Add arm").click();
    // Should now have 4 arm rows
    const sliders = page.locator('input[type="range"]');
    await expect(sliders).toHaveCount(4);
  });

  test("remove arm reduces count", async ({ page }) => {
    const removeButtons = page.getByText("\u00D7");
    await removeButtons.first().click();
    const sliders = page.locator('input[type="range"]');
    await expect(sliders).toHaveCount(2);
  });

  test("switching algorithm shows sliders", async ({ page }) => {
    await page.getByText("LinUCB").click();
    await page.waitForTimeout(200);
    // Should see alpha slider for LinUCB
    await expect(page.getByText("\u03B1 \u2014 Exploration width")).toBeVisible();
  });
});

test.describe("Compare page flows", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/compare");
    await page.waitForTimeout(3000);
  });

  test("two algorithm cards render", async ({ page }) => {
    await expect(page.getByText("Algorithm A")).toBeVisible();
    await expect(page.getByText("Algorithm B")).toBeVisible();
  });

  test("step advances both simulations", async ({ page }) => {
    await page.getByText("Step \u2192").click();
    await page.waitForTimeout(500);
    // Both columns should have the same t
    const tElements = page.locator("text=/t=\\d+/");
    const count = await tElements.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("reset works", async ({ page }) => {
    await page.getByText("Step \u2192").click();
    await page.waitForTimeout(300);
    await page.getByText("Reset").click();
    await page.waitForTimeout(1000);
    await expect(page.getByText(/t=0/)).toBeVisible();
  });
});

test.describe("Results page", () => {
  test("works after running simulation", async ({ page }) => {
    await page.goto("/playground");
    await page.waitForTimeout(2000);
    await page.getByText("Step \u2192").click();
    await page.waitForTimeout(300);
    await page.getByText("Step \u2192").click();
    await page.waitForTimeout(300);
    await page.goto("/results");
    await page.waitForTimeout(500);
    await expect(page.getByText("results", { exact: false })).toBeVisible();
  });
});

test.describe("Glossary page", () => {
  test("search filters cards", async ({ page }) => {
    await page.goto("/glossary");
    await expect(page.getByText("Glossary")).toBeVisible();
    await page.getByPlaceholder(/Search/).fill("UCB");
    await expect(page.getByText("UCB1")).toBeVisible();
  });
});
