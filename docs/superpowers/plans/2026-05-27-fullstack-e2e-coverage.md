# Full-Stack E2E Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Achieve end-to-end confidence that every **implemented** product feature (Sprints 1–4, A00–A31) works correctly through the real FastAPI backend and Next.js frontend together — not only “page loads without crash.”

**Architecture:** Split the monolithic `backend-integration.spec.ts` into domain-focused Playwright specs. Add a thin **API contract layer** (`request` fixture against `http://localhost:8000`) that mirrors frontend `api.ts` calls, plus **UI flows** that assert user-visible outcomes after real HTTP. Reuse shared helpers (`stepPlayground`, `selectScenario`, `waitForPlaygroundReady`) to avoid `waitForTimeout` flakes. Keep visual regression separate and expand it last.

**Tech Stack:** Playwright 1.60, FastAPI + uvicorn (port 8000), Next.js dev (port 3000), existing `playwright.config.ts` webServer block.

**Baseline verified 2026-05-27:**

```bash
cd backend && uv run pytest tests/ -q          # 178 passed
cd frontend && pnpm exec playwright test --list # 37 tests
```

---

## Current E2E vs Required Coverage

### What exists today (37 tests)

| Area | Tests | Depth |
|------|------:|-------|
| Navigation / hydration | 3 | All 6 routes visited; no per-route assertions |
| Playground smoke | 5 | Step, play/pause, speed, charts visible, algo reset |
| Algorithm smoke × 16 | 16 | 3 steps each on default scenario only |
| Settings | 5 | Local form edits only; **no Apply → playground** |
| Compare | 3 | Cards, one step, reset |
| Results | 1 | Weak assertion (`results` substring) |
| Glossary | 1 | Search only |
| Visual regression | 3 | Landing, settings, playground (20 steps) |

### Feature matrix — implemented features (A00–A31) vs E2E

| ID | Feature | Backend unit | Frontend unit | E2E today | E2E needed |
|----|---------|:------------:|:-------------:|:---------:|:----------:|
| A00 | 16 algorithms | ✅ | ✅ | ✅ smoke | Keep; add contextual-only algos on contextual scenario |
| A01 | Persistent seed | ✅ | ✅ | ❌ | Change seed → reset → verify reproducible t=1 outcome |
| A02 | Truncated sampling | ✅ | — | ❌ | Implicit via steps; optional API assert bounds |
| A03 | switchScenario / reset | ✅ | ✅ | ❌ | **All 5 scenarios** switch + step |
| A04 | SimState metadata | ✅ | ✅ | ❌ | API: `feature_names`, `scenario_id` in GET sim |
| A05 | ScenarioInfo API | ✅ | ✅ | ❌ | Landing + picker show 5 scenarios from API |
| A05b | Drift timing | ✅ | ✅ | ❌ | **Content Format**: drift badges + chart annotations |
| A06 | history_window | ✅ | — | ❌ | API field present after create |
| A07 | Fixed scatter axes | ✅ | ✅ | ❌ | 2-feature scenario: Context Space panel visible |
| A08 | Drift on regret chart | ✅ | ✅ | ❌ | Step past `drift_step` on content_format |
| A09 | ScenarioInfoBar | ✅ | ✅ | ❌ | Description, difficulty, recommended chips |
| A10 | StepFeed context | ✅ | ✅ | ❌ | Expand context after step (LinUCB) |
| A10b | Algorithm in StepFeed | partial | ✅ | ❌ | Switch algo → feed header reflects algo |
| A11 | ContextPanel labels | ✅ | ✅ | ❌ | Semantic low/high labels visible (not “low”) |
| A12 | low_label / high_label | ✅ | ✅ | ❌ | Covered with A11 E2E |
| A19 | SegmentChart | ✅ | ✅ | ❌ | Scenario with segments (e.g. Ad Creative) |
| A20 | AlgorithmFitChip | ✅ | ✅ | ❌ | Mismatch algo → “consider …” chip |
| A21 | Seed in ControlBar | ✅ | partial | ❌ | `data-testid="playground-seed-input"` |
| A22 | Correlated sampling | ✅ | — | ❌ | API-only statistical smoke (optional) |
| A28 | History cap | ✅ | ✅ | ❌ | Run 350 steps → regret length capped |
| A29 | n-D lin_meta | ✅ | — | ❌ | API after step on linucb |
| A30 | SW-LinUCB tooltip | ✅ | ✅ | ❌ | Settings/playground slider label visible |
| A31 | Context validation UI | ✅ | ✅ | ❌ | Harder; unit-tested; skip unless injectable |
| — | Settings Apply | — | ✅ | ❌ | Apply → navigate playground → new arms |
| — | Compare dual sim | — | ✅ | partial | Play, GT toggle, algo B switch, dual chart |
| — | Results empty/populated | — | ✅ | partial | Stat cards, learned vs true table |
| — | Glossary expand | — | ✅ | ❌ | Click card → detail visible |
| — | Landing CTAs | — | ✅ | partial | Open Playground, scenario grid |
| — | Error banner dismiss | — | ✅ | ❌ | Optional route intercept |
| A23–A27 | Backlog | — | — | — | **Out of scope** until implemented |

**Target:** ~**85–95** Playwright tests (from 37), organized in ~10 spec files.

---

## File Map (post-refactor)

| File | Responsibility |
|------|----------------|
| `frontend/e2e/helpers/playground.ts` | `gotoPlayground`, `stepTimes`, `selectAlgorithm`, `selectScenario` |
| `frontend/e2e/helpers/api.ts` | Raw REST helpers mirroring `api.ts` |
| `frontend/e2e/fixtures/algorithms.ts` | ✅ exists — 16 display names |
| `frontend/e2e/fixtures/scenarios.ts` | **New** — 5 scenario labels + ids |
| `frontend/e2e/api-contract.spec.ts` | **New** — backend HTTP without browser |
| `frontend/e2e/navigation.spec.ts` | **New** — split from integration |
| `frontend/e2e/playground.spec.ts` | **New** — deep playground flows |
| `frontend/e2e/scenarios.spec.ts` | **New** — 5 scenarios × step smoke |
| `frontend/e2e/algorithms.spec.ts` | **New** — move 16-algorithm loop |
| `frontend/e2e/settings.spec.ts` | **New** |
| `frontend/e2e/compare.spec.ts` | **New** |
| `frontend/e2e/results.spec.ts` | **New** |
| `frontend/e2e/glossary.spec.ts` | **New** |
| `frontend/e2e/landing.spec.ts` | **New** |
| `frontend/e2e/cross-page.spec.ts` | **New** — settings→playground, playground→results |
| `frontend/e2e/visual-regression.spec.ts` | Expand compare, results, drift playground |
| `frontend/playwright.config.ts` | Increase timeout for algo suite; optional `workers: 1` for E2E job |
| `docs/TEST_COVERAGE.md` | Update E2E section after completion |

**Delete or thin:** `frontend/e2e/backend-integration.spec.ts` — migrate tests then remove to avoid duplication.

---

## Prerequisites

```bash
# Terminal 1 — backend (if not using playwright webServer only)
cd backend && uv sync --extra dev
uv run uvicorn coba_server:app --port 8000

# Terminal 2 — frontend (if not using playwright webServer)
cd frontend && pnpm dev

# Verify
curl -s http://localhost:8000/api/health | jq .
cd frontend && pnpm test:e2e                    # full suite
cd frontend && pnpm exec playwright test e2e/api-contract.spec.ts  # single file
```

**Commit protocol:** `test(e2e): …` — one spec file or helper per commit.

---

## Wave 0 — Shared Fixtures & Helpers

### Task 0: Scenario fixture

**Files:**
- Create: `frontend/e2e/fixtures/scenarios.ts`

- [ ] **Step 1: Create fixture**

```typescript
/** Scenario picker labels — must match backend ScenarioInfo.label */
export const SCENARIOS = [
  { id: "notification_channels", label: "Notification Channels" },
  { id: "news_feed", label: "News Feed" },
  { id: "product_recommendations", label: "Product Recommendations" },
  { id: "content_format", label: "Content Format" },
  { id: "ad_creative_selection", label: "Ad Creative Selection" },
] as const;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/e2e/fixtures/scenarios.ts
git commit -m "test(e2e): add scenario fixture for five registry scenarios"
```

### Task 1: Playground helpers

**Files:**
- Create: `frontend/e2e/helpers/playground.ts`

- [ ] **Step 1: Implement helpers**

```typescript
import type { Page } from "@playwright/test";

export async function gotoPlayground(page: Page) {
  await page.goto("/playground");
  await page.getByText("Step →").waitFor({ state: "visible", timeout: 15_000 });
}

export async function stepTimes(page: Page, n: number) {
  for (let i = 0; i < n; i++) {
    await page.getByText("Step →").click();
    await page.getByText(new RegExp(`t=${i + 1}`)).waitFor({ timeout: 10_000 });
  }
}

export async function selectAlgorithm(page: Page, name: string) {
  await page.getByText(name, { exact: true }).click();
  await page.getByText(/t=0/).waitFor({ timeout: 10_000 });
}

export async function openScenarioPicker(page: Page) {
  await page.getByRole("button", { name: /Notification Channels|Select Scenario/ }).click();
}

export async function selectScenario(page: Page, label: string) {
  await openScenarioPicker(page);
  await page.getByRole("button", { name: label }).click();
  await page.getByText(/t=0/).waitFor({ timeout: 15_000 });
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/e2e/helpers/playground.ts
git commit -m "test(e2e): add shared Playwright playground helpers"
```

### Task 2: API helpers

**Files:**
- Create: `frontend/e2e/helpers/api.ts`

- [ ] **Step 1: Implement API helpers**

```typescript
import type { APIRequestContext } from "@playwright/test";

const API = "http://localhost:8000";

export async function apiHealth(request: APIRequestContext) {
  const r = await request.get(`${API}/api/health`);
  return r.ok() && (await r.json()).status === "ok";
}

export async function apiListScenarios(request: APIRequestContext) {
  const r = await request.get(`${API}/api/scenarios`);
  if (!r.ok()) throw new Error(`scenarios ${r.status()}`);
  return r.json() as Promise<Array<{ id: string; label: string; has_drift: boolean }>>;
}

export async function apiCreateSim(
  request: APIRequestContext,
  opts: { algorithm?: string; scenarioId?: string; seed?: number } = {},
) {
  const r = await request.post(`${API}/api/simulate`, {
    data: {
      arms: null,
      algorithm: opts.algorithm ?? "ucb1",
      hyperparams: {},
      seed: opts.seed ?? 42,
      scenario_id: opts.scenarioId ?? "notification_channels",
    },
  });
  if (r.status() !== 201) throw new Error(`create ${r.status()} ${await r.text()}`);
  return r.json() as Promise<{ id: string }>;
}

export async function apiStep(request: APIRequestContext, simId: string) {
  const r = await request.post(`${API}/api/simulate/${simId}/step`);
  if (!r.ok()) throw new Error(`step ${r.status()}`);
  return r.json();
}

export async function apiRun(request: APIRequestContext, simId: string, steps: number) {
  const r = await request.post(`${API}/api/simulate/${simId}/run`, { data: { steps } });
  if (!r.ok()) throw new Error(`run ${r.status()}`);
  return r.json();
}

export async function apiDelete(request: APIRequestContext, simId: string) {
  await request.delete(`${API}/api/simulate/${simId}`);
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/e2e/helpers/api.ts
git commit -m "test(e2e): add Playwright API contract helpers"
```

---

## Wave 1 — API Contract E2E (Backend Truth)

Validates backend independently of React rendering. Catches contract drift between `api.ts` and FastAPI.

### Task 3: API contract spec

**Files:**
- Create: `frontend/e2e/api-contract.spec.ts`

- [ ] **Step 1: Write tests**

```typescript
import { test, expect } from "@playwright/test";
import {
  apiCreateSim,
  apiDelete,
  apiHealth,
  apiListScenarios,
  apiRun,
  apiStep,
} from "./helpers/api";
import { SCENARIOS } from "./fixtures/scenarios";

test.describe("API health", () => {
  test("GET /api/health returns ok", async ({ request }) => {
    expect(await apiHealth(request)).toBe(true);
  });
});

test.describe("API scenarios", () => {
  test("lists five scenarios with metadata", async ({ request }) => {
    const list = await apiListScenarios(request);
    expect(list).toHaveLength(5);
    for (const { id } of SCENARIOS) {
      expect(list.some((s) => s.id === id)).toBe(true);
    }
    const drift = list.find((s) => s.id === "content_format");
    expect(drift?.has_drift).toBe(true);
  });
});

test.describe("API simulation lifecycle", () => {
  test("create → step → run → get → delete", async ({ request }) => {
    const { id } = await apiCreateSim(request, { algorithm: "ucb1", seed: 7 });
    try {
      const step1 = await apiStep(request, id);
      expect(step1.t).toBe(1);

      const run = await apiRun(request, id, 5);
      expect(run.final_t).toBe(6);

      const get = await request.get(`http://localhost:8000/api/simulate/${id}`);
      expect(get.ok()).toBe(true);
      const body = await get.json();
      expect(body.state.t).toBe(6);
    } finally {
      await apiDelete(request, id);
    }
  });

  test("step unknown sim returns 404", async ({ request }) => {
    const r = await request.post(
      "http://localhost:8000/api/simulate/00000000-0000-0000-0000-000000000000/step",
    );
    expect(r.status()).toBe(404);
  });
});

test.describe("API per scenario", () => {
  for (const { id, label } of SCENARIOS) {
    test(`${label} creates and steps`, async ({ request }) => {
      const { id: simId } = await apiCreateSim(request, { scenarioId: id, algorithm: "linucb" });
      try {
        const step = await apiStep(request, simId);
        expect(step.t).toBe(1);
        expect(step.step.context).not.toBeNull();
      } finally {
        await apiDelete(request, simId);
      }
    });
  }
});

test.describe("API algorithms", () => {
  test("GET /api/algorithms returns 16 entries", async ({ request }) => {
    const r = await request.get("http://localhost:8000/api/algorithms");
    expect(r.ok()).toBe(true);
    const list = await r.json();
    expect(list.length).toBe(16);
  });
});
```

- [ ] **Step 2: Run**

```bash
cd frontend && pnpm exec playwright test e2e/api-contract.spec.ts
```

Expected: **~10 passed**

- [ ] **Step 3: Commit**

```bash
git add frontend/e2e/api-contract.spec.ts
git commit -m "test(e2e): add API contract tests against live backend"
```

---

## Wave 2 — Refactor & Navigation

### Task 4: Extract navigation spec

**Files:**
- Create: `frontend/e2e/navigation.spec.ts`
- Modify: `frontend/e2e/backend-integration.spec.ts` (remove migrated tests)

- [ ] **Step 1: Move landing + hydration tests to `navigation.spec.ts`**

```typescript
import { test, expect } from "@playwright/test";

const ROUTES = [
  { path: "/", heading: "Bandit Simulator" },
  { path: "/playground", heading: /Step/ },
  { path: "/compare", heading: "Compare Algorithms" },
  { path: "/settings", heading: "Settings" },
  { path: "/results", heading: /No data yet|Simulation Results/ },
  { path: "/glossary", heading: "Glossary" },
];

test.describe("Navigation", () => {
  test("header links reach all routes", async ({ page }) => {
    await page.goto("/");
    for (const label of ["Playground", "Compare", "Settings", "Results", "Glossary"]) {
      await page.getByRole("button", { name: label }).click();
      await expect(page).toHaveURL(new RegExp(label.toLowerCase()));
    }
  });

  for (const { path, heading } of ROUTES) {
    test(`${path} renders primary content`, async ({ page }) => {
      await page.goto(path);
      if (path === "/playground") {
        await page.getByText("Step →").waitFor({ timeout: 15_000 });
      }
      await expect(page.getByText(heading)).toBeVisible();
    });
  }

  test("no hydration errors across tabs", async ({ page }) => {
    const logs: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") logs.push(msg.text());
    });
    for (const { path } of ROUTES) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
    }
    expect(logs.filter((l) => l.includes("hydration"))).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run navigation spec**

```bash
cd frontend && pnpm exec playwright test e2e/navigation.spec.ts
```

- [ ] **Step 3: Commit**

```bash
git add frontend/e2e/navigation.spec.ts
git commit -m "test(e2e): extract navigation and route smoke tests"
```

### Task 5: Extract algorithms spec

**Files:**
- Create: `frontend/e2e/algorithms.spec.ts`
- Modify: `frontend/e2e/backend-integration.spec.ts`

- [ ] **Step 1: Move algorithm loop** (use helpers, default scenario)

```typescript
import { test, expect } from "@playwright/test";
import { ALGORITHM_SMOKE } from "./fixtures/algorithms";
import { gotoPlayground, selectAlgorithm, stepTimes } from "./helpers/playground";

test.describe("Algorithm smoke (all 16)", () => {
  for (const { name } of ALGORITHM_SMOKE) {
    test(`${name} runs 3 steps without error`, async ({ page }) => {
      await gotoPlayground(page);
      await selectAlgorithm(page, name);
      await stepTimes(page, 3);
    });
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add frontend/e2e/algorithms.spec.ts
git commit -m "test(e2e): extract sixteen-algorithm smoke suite"
```

---

## Wave 3 — Playground Deep (Highest User Value)

### Task 6: Scenario switching (A03, A05, A09)

**Files:**
- Create: `frontend/e2e/scenarios.spec.ts`

- [ ] **Step 1: Write scenario tests**

```typescript
import { test, expect } from "@playwright/test";
import { SCENARIOS } from "./fixtures/scenarios";
import { gotoPlayground, selectScenario, stepTimes } from "./helpers/playground";

test.describe("Scenario picker", () => {
  for (const { label } of SCENARIOS) {
    test(`switch to ${label} resets to t=0`, async ({ page }) => {
      await gotoPlayground(page);
      await selectScenario(page, label);
      await expect(page.getByText(/t=0/)).toBeVisible();
    });
  }

  test("Content Format shows drift badge in info bar", async ({ page }) => {
    await gotoPlayground(page);
    await selectScenario(page, "Content Format");
    await expect(page.getByText(/drift/i)).toBeVisible();
  });

  test("News Feed steps with context panel", async ({ page }) => {
    await gotoPlayground(page);
    await selectScenario(page, "News Feed");
    await page.getByText("LinUCB", { exact: true }).click();
    await stepTimes(page, 2);
    await expect(page.getByText(/Environment/i)).toBeVisible();
    await expect(page.getByText(/passive|power reader|Engagement/i)).toBeVisible();
  });
});
```

- [ ] **Step 2: Run**

```bash
cd frontend && pnpm exec playwright test e2e/scenarios.spec.ts
```

- [ ] **Step 3: Commit**

```bash
git add frontend/e2e/scenarios.spec.ts
git commit -m "test(e2e): cover all five scenario switches and drift badge"
```

### Task 7: Playground panels & pedagogy (A07–A11, A19–A21)

**Files:**
- Create: `frontend/e2e/playground.spec.ts`

- [ ] **Step 1: Write playground deep tests**

```typescript
import { test, expect } from "@playwright/test";
import { gotoPlayground, selectScenario, stepTimes, selectAlgorithm } from "./helpers/playground";

test.describe("Playground controls", () => {
  test.beforeEach(async ({ page }) => {
    await gotoPlayground(page);
  });

  test("ground truth toggle reveals true probabilities", async ({ page }) => {
    await stepTimes(page, 1);
    await page.getByRole("button", { name: /show ground truth|hide ground truth/i }).click();
    await expect(page.getByText(/true/i)).toBeVisible();
  });

  test("seed input is visible and accepts value", async ({ page }) => {
    const seed = page.getByTestId("playground-seed-input");
    await seed.fill("123");
    await expect(seed).toHaveValue("123");
  });

  test("reset returns to t=0", async ({ page }) => {
    await stepTimes(page, 2);
    await page.getByRole("button", { name: "Reset" }).click();
    await expect(page.getByText(/t=0/)).toBeVisible();
  });

  test("play then pause freezes step counter", async ({ page }) => {
    await page.getByText("▶ Play").click();
    await page.waitForTimeout(800);
    await page.getByText("⏸ Pause").click();
    const t1 = await page.getByText(/t=\d+/).textContent();
    await page.waitForTimeout(1000);
    const t2 = await page.getByText(/t=\d+/).textContent();
    expect(t2).toBe(t1);
  });

  test("Why panel appears after first step", async ({ page }) => {
    await stepTimes(page, 1);
    await expect(page.getByText(/Why/i)).toBeVisible();
  });
});

test.describe("Playground charts", () => {
  test("three chart panels populate after two steps", async ({ page }) => {
    await gotoPlayground(page);
    await stepTimes(page, 2);
    await expect(page.getByText("Cumulative Regret")).toBeVisible();
    await expect(page.getByText("Cumulative Rewards")).toBeVisible();
    await expect(page.getByText("Pull Distribution")).toBeVisible();
  });

  test("Context Space visible for two-feature scenario", async ({ page }) => {
    await gotoPlayground(page);
    await selectScenario(page, "Notification Channels");
    await page.getByText("LinUCB", { exact: true }).click();
    await stepTimes(page, 1);
    await expect(page.getByText("Context Space")).toBeVisible();
  });
});

test.describe("Drift scenario", () => {
  test("drift annotations appear after drift begins", async ({ page }) => {
    await gotoPlayground(page);
    await selectScenario(page, "Content Format");
    await selectAlgorithm(page, "SW-LinUCB");
    // content_format drift_step is 200 in registry — run 205 steps via Play
    await page.getByText("10×").click(); // max speed
    await page.getByText("▶ Play").click();
    await page.getByText(/t=205/).waitFor({ timeout: 120_000 });
    await page.getByText("⏸ Pause").click();
    await expect(page.getByText("Drift begins")).toBeVisible();
  });
});
```

**Note:** Drift test is slow (~2 min). Mark with `test.slow()` or run only in nightly CI. Adjust `drift_step` by reading from `/api/scenarios` in `beforeAll` if registry changes.

- [ ] **Step 2: Run playground spec (exclude slow drift first)**

```bash
cd frontend && pnpm exec playwright test e2e/playground.spec.ts --grep -v "drift annotations"
```

- [ ] **Step 3: Commit**

```bash
git add frontend/e2e/playground.spec.ts
git commit -m "test(e2e): add deep playground control and chart flows"
```

### Task 8: Segment chart scenario (A19)

**Files:**
- Modify: `frontend/e2e/scenarios.spec.ts`

- [ ] **Step 1: Add Ad Creative segment test**

```typescript
  test("Ad Creative Selection shows population segments", async ({ page }) => {
    await gotoPlayground(page);
    await selectScenario(page, "Ad Creative Selection");
    await page.getByText("LinUCB", { exact: true }).click();
    await stepTimes(page, 1);
    await expect(page.getByText(/segment|population/i)).toBeVisible();
  });
```

- [ ] **Step 2: Commit**

```bash
git add frontend/e2e/scenarios.spec.ts
git commit -m "test(e2e): verify segment chart on ad creative scenario"
```

---

## Wave 4 — Settings, Compare, Results

### Task 9: Settings flows

**Files:**
- Create: `frontend/e2e/settings.spec.ts`

- [ ] **Step 1: Write tests**

```typescript
import { test, expect } from "@playwright/test";

test.describe("Settings page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  });

  test("apply resets simulation and persists to playground", async ({ page }) => {
    await page.getByText("Thompson", { exact: true }).click();
    await page.getByRole("button", { name: /Apply/i }).click();
    await page.getByRole("button", { name: "Playground" }).click();
    await page.getByText("Step →").waitFor({ timeout: 15_000 });
    await expect(page.getByText("Thompson", { exact: true })).toBeVisible();
  });

  test("LinUCB shows alpha hyperparameter slider", async ({ page }) => {
    await page.getByText("LinUCB", { exact: true }).click();
    await expect(page.getByText(/α.*Exploration width/)).toBeVisible();
  });

  test("add and remove arm", async ({ page }) => {
    await page.getByText("+ Add arm").click();
    await expect(page.locator('input[type="range"]')).toHaveCount(4);
    await page.getByText("×").first().click();
    await expect(page.locator('input[type="range"]')).toHaveCount(2);
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add frontend/e2e/settings.spec.ts
git commit -m "test(e2e): add settings apply and hyperparameter flows"
```

### Task 10: Compare flows

**Files:**
- Create: `frontend/e2e/compare.spec.ts`

- [ ] **Step 1: Write tests**

```typescript
import { test, expect } from "@playwright/test";
import { gotoPlayground } from "./helpers/playground";

test.describe("Compare page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/compare");
    await page.getByText("Compare Algorithms").waitFor({ timeout: 15_000 });
    await page.getByText("Algorithm A").waitFor();
  });

  test("switch algorithm B and step both columns", async ({ page }) => {
    await page.getByText("Algorithm B").locator("..").getByText("Thompson", { exact: true }).click();
    await page.waitForTimeout(500);
    await page.getByText("Step →").click();
    await page.getByText(/t=1/).first().waitFor();
    const tLabels = await page.getByText(/t=\d+/).allTextContents();
    expect(tLabels.length).toBeGreaterThanOrEqual(1);
  });

  test("dual regret comparison chart after steps", async ({ page }) => {
    await page.getByText("Step →").click();
    await page.waitForTimeout(400);
    await page.getByText("Step →").click();
    await expect(page.getByText("Cumulative Regret Comparison")).toBeVisible();
  });

  test("ground truth toggle on compare", async ({ page }) => {
    await page.getByRole("button", { name: /ground truth/i }).click();
    await expect(page.getByText(/true/i).first()).toBeVisible();
  });

  test("reset returns to t=0", async ({ page }) => {
    await page.getByText("Step →").click();
    await page.getByText("Reset").click();
    await expect(page.getByText(/t=0/)).toBeVisible();
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add frontend/e2e/compare.spec.ts
git commit -m "test(e2e): add compare page dual-simulation flows"
```

### Task 11: Results flows

**Files:**
- Create: `frontend/e2e/results.spec.ts`

- [ ] **Step 1: Write tests**

```typescript
import { test, expect } from "@playwright/test";
import { gotoPlayground, stepTimes } from "./helpers/playground";

test.describe("Results page", () => {
  test("empty state prompts go to playground", async ({ page }) => {
    await page.goto("/results");
    await expect(page.getByText("No data yet")).toBeVisible();
    await page.getByRole("button", { name: /Go to Playground/i }).click();
    await expect(page).toHaveURL(/\/playground/);
  });

  test("populated results show stat cards and table", async ({ page }) => {
    await gotoPlayground(page);
    await stepTimes(page, 5);
    await page.goto("/results");
    await expect(page.getByText("Simulation Results")).toBeVisible();
    await expect(page.getByText("Cumulative regret")).toBeVisible();
    await expect(page.getByText("Learned vs True Rates")).toBeVisible();
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add frontend/e2e/results.spec.ts
git commit -m "test(e2e): add results empty and populated E2E flows"
```

---

## Wave 5 — Landing & Glossary

### Task 12: Landing spec

**Files:**
- Create: `frontend/e2e/landing.spec.ts`

- [ ] **Step 1: Write tests**

```typescript
import { test, expect } from "@playwright/test";
import { SCENARIOS } from "./fixtures/scenarios";

test.describe("Landing page", () => {
  test("hero CTA opens playground", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Open Playground/i }).click();
    await expect(page).toHaveURL(/\/playground/);
  });

  test("scenario showcase loads five scenarios from API", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Real-World Scenarios")).toBeVisible();
    for (const { label } of SCENARIOS) {
      await expect(page.getByText(label)).toBeVisible({ timeout: 10_000 });
    }
  });

  test("algorithm strip shows UCB1 and LinUCB", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("UCB1")).toBeVisible();
    await expect(page.getByText("LinUCB")).toBeVisible();
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add frontend/e2e/landing.spec.ts
git commit -m "test(e2e): add landing page API-driven content tests"
```

### Task 13: Glossary spec

**Files:**
- Create: `frontend/e2e/glossary.spec.ts`

- [ ] **Step 1: Write tests**

```typescript
import { test, expect } from "@playwright/test";

test.describe("Glossary page", () => {
  test("search filters and expand shows detail", async ({ page }) => {
    await page.goto("/glossary");
    await page.getByPlaceholder(/Search/).fill("UCB");
    await expect(page.getByText("UCB1")).toBeVisible();
    await page.getByText("UCB1").click();
    await expect(page.getByText(/exploration bonus/i)).toBeVisible();
  });

  test("empty search shows no match message", async ({ page }) => {
    await page.goto("/glossary");
    await page.getByPlaceholder(/Search/).fill("zzznomatchxyz");
    await expect(page.getByText(/No terms match/)).toBeVisible();
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add frontend/e2e/glossary.spec.ts
git commit -m "test(e2e): add glossary search and expand tests"
```

---

## Wave 6 — Cross-Page Integration

### Task 14: Cross-page spec

**Files:**
- Create: `frontend/e2e/cross-page.spec.ts`

- [ ] **Step 1: Write full user journey**

```typescript
import { test, expect } from "@playwright/test";
import { gotoPlayground, selectScenario, stepTimes } from "./helpers/playground";

test("settings → playground → results journey", async ({ page }) => {
  await page.goto("/settings");
  await page.getByText("Thompson", { exact: true }).click();
  await page.getByRole("button", { name: /Apply/i }).click();
  await page.getByRole("button", { name: "Playground" }).click();
  await page.getByText("Step →").waitFor({ timeout: 15_000 });
  await stepTimes(page, 10);
  await page.getByRole("button", { name: "Results" }).click();
  await expect(page.getByText("Simulation Results")).toBeVisible();
  await expect(page.getByText("Thompson")).toBeVisible();
});

test("playground scenario switch preserves navigation", async ({ page }) => {
  await gotoPlayground(page);
  await selectScenario(page, "Product Recommendations");
  await page.getByRole("button", { name: "Compare" }).click();
  await expect(page.getByText("Compare Algorithms")).toBeVisible();
  await page.getByRole("button", { name: "Playground" }).click();
  await expect(page.getByText("Product Recommendations")).toBeVisible();
});
```

- [ ] **Step 2: Commit**

```bash
git add frontend/e2e/cross-page.spec.ts
git commit -m "test(e2e): add cross-page user journey tests"
```

### Task 15: Remove legacy integration file

**Files:**
- Delete: `frontend/e2e/backend-integration.spec.ts`

- [ ] **Step 1: Verify full suite passes without duplicate file**

```bash
cd frontend && pnpm test:e2e
```

Expected: **~85–95 tests**, 0 failures

- [ ] **Step 2: Delete legacy file and commit**

```bash
git rm frontend/e2e/backend-integration.spec.ts
git commit -m "test(e2e): remove monolithic backend-integration spec"
```

---

## Wave 7 — Visual Regression Expansion

### Task 16: Expand visual snapshots

**Files:**
- Modify: `frontend/e2e/visual-regression.spec.ts`

- [ ] **Step 1: Add snapshots**

```typescript
  test("compare page after dual step", async ({ page }) => {
    await page.goto("/compare");
    await page.waitForTimeout(3000);
    await page.getByText("Step →").click();
    await page.waitForTimeout(400);
    await page.getByText("Step →").click();
    await expect(page).toHaveScreenshot("compare-2-steps.png", { fullPage: true });
  });

  test("results page populated", async ({ page }) => {
    await page.goto("/playground");
    await page.waitForTimeout(2000);
    for (let i = 0; i < 5; i++) {
      await page.getByText("Step →").click();
      await page.waitForTimeout(200);
    }
    await page.goto("/results");
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot("results-populated.png", { fullPage: true });
  });
```

- [ ] **Step 2: Generate baselines (macOS dev)**

```bash
cd frontend && pnpm exec playwright test e2e/visual-regression.spec.ts --update-snapshots
```

- [ ] **Step 3: Commit**

```bash
git add frontend/e2e/visual-regression.spec.ts frontend/e2e/__screenshots__
git commit -m "test(e2e): expand visual regression to compare and results"
```

---

## Wave 8 — CI & Config Hardening

### Task 17: Playwright config tuning

**Files:**
- Modify: `frontend/playwright.config.ts`

- [ ] **Step 1: Update config**

```typescript
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined, // avoid sim cap races
  reporter: [["list"], ["html", { open: "never" }]],
  // ... existing webServer, snapshotPathTemplate
});
```

- [ ] **Step 2: Tag slow tests**

In drift test file add:

```typescript
test.describe.configure({ timeout: 180_000 });
```

Or:

```typescript
test("drift annotations…", async ({ page }) => {
  test.slow();
  // ...
});
```

- [ ] **Step 3: Commit**

```bash
git add frontend/playwright.config.ts frontend/e2e/playground.spec.ts
git commit -m "test(e2e): tune Playwright timeouts and CI workers"
```

### Task 18: Optional nightly workflow

**Files:**
- Create: `.github/workflows/e2e-nightly.yml` (optional)

- [ ] **Step 1: Add workflow for full suite + slow drift**

```yaml
name: E2E Nightly
on:
  schedule:
    - cron: "0 6 * * *"
  workflow_dispatch:

jobs:
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 45
    steps:
      - uses: actions/checkout@v6
      # ... same as ci.yml e2e job
      - run: pnpm test:e2e
        working-directory: frontend
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/e2e-nightly.yml
git commit -m "ci: add nightly E2E workflow for slow drift tests"
```

### Task 19: Update documentation

**Files:**
- Modify: `docs/TEST_COVERAGE.md`

- [ ] **Step 1: Regenerate counts and add E2E feature matrix reference to this plan**

- [ ] **Step 2: Commit**

```bash
git add docs/TEST_COVERAGE.md
git commit -m "docs: document full-stack E2E coverage plan results"
```

---

## Final Verification Checklist

```bash
# Backend still green
cd backend && uv run pytest tests/ --cov=coba_server --cov-fail-under=95 -q

# Frontend unit still green
cd frontend && pnpm test:coverage

# Full E2E (15–25 min locally)
cd frontend && pnpm test:e2e

# Count tests
cd frontend && pnpm exec playwright test --list | tail -1
```

| Metric | Before | Target |
|--------|-------:|-------:|
| Playwright tests | 37 | **85–95** |
| Scenarios E2E | 1 (default) | **5** |
| API contract tests | 0 | **~10** |
| Pages with dedicated spec | 1 monolith | **8 specs** |
| Visual snapshots | 3 | **5** |

---

## Self-Review

### Spec coverage

| Requirement | Task |
|-------------|------|
| All 5 scenarios E2E | Task 6, 8, API Task 3 |
| All 16 algorithms E2E | Task 5 |
| Drift (A05b, A08) | Task 7 (slow) |
| Settings apply → playground | Task 9, 14 |
| Compare dual sim | Task 10 |
| Results empty/populated | Task 11 |
| Landing API content | Task 12 |
| Glossary expand | Task 13 |
| API contract / backend truth | Task 3 |
| CI stability | Task 17–18 |
| Visual regression | Task 16 |

### Placeholder scan

No TBD steps. All new spec files include starter test code.

### Out of scope

- A23–A27 backlog features (not implemented)
- `app/layout.tsx` Server Component (no browser E2E needed beyond hydration)
- Injecting invalid context for A31 (unit-tested only)
- Performance/load testing

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-27-fullstack-e2e-coverage.md`.**

**Two execution options:**

1. **Subagent-Driven (recommended)** — Fresh subagent per wave (0→8), review between waves
2. **Inline Execution** — Run waves sequentially in this session with checkpoints

**Which approach?**
