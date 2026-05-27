# Test Coverage Follow-Up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close gaps identified in `docs/TEST_COVERAGE.md` — CI coverage gates, ~21 frontend unit tests, full 16-algorithm E2E smoke, Playwright in CI, and test hygiene — raising frontend line coverage from ~65% toward ~75–80% without touching already-strong modules.

**Architecture:** Work in dependency order: infra gates first (protect existing 99% backend), shared test setup (ResizeObserver), then easy Vitest pages (glossary → results → settings → landing), charts, landing components, E2E expansion, compare page, playground `act` fix, frontend CI threshold. Each task is one commit. Skip `app/layout.tsx` (Server Component). Do not add backend unit tests unless coverage gate fails.

**Tech Stack:** pytest + pytest-cov, Vitest 3 + @testing-library/react + v8 coverage, Playwright 1.60, GitHub Actions, Next.js 15 App Router, Zustand, Recharts.

**Source of truth:** `docs/TEST_COVERAGE.md` (expert priority stack, revised test table).

---

## File Map

| File | Responsibility |
|------|----------------|
| `.github/workflows/ci.yml` | Add coverage gates + Playwright job |
| `frontend/src/test-setup.ts` | Global ResizeObserver polyfill for Recharts |
| `frontend/vitest.config.ts` | Optional `coverage.thresholds` |
| `frontend/src/app/glossary/__tests__/page.test.tsx` | Glossary search, expand, empty state |
| `frontend/src/app/results/__tests__/page.test.tsx` | Empty vs populated results |
| `frontend/src/app/settings/__tests__/page.test.tsx` | Arm add/remove, algo switch, apply |
| `frontend/src/app/__tests__/page.test.tsx` | Landing page smoke |
| `frontend/src/components/charts/__tests__/CumRewardsChart.test.tsx` | Empty + populated chart |
| `frontend/src/components/charts/__tests__/DualRegretChart.test.tsx` | Empty + dual series |
| `frontend/src/components/charts/__tests__/PullDistChart.test.tsx` | Empty + pulls |
| `frontend/src/components/landing/__tests__/landing-components.test.tsx` | AlgoStrip, ConceptCards, ScenarioShowcase |
| `frontend/src/app/compare/__tests__/page.test.tsx` | Init error + shell render |
| `frontend/src/app/playground/__tests__/page.test.tsx` | Fix `act` warnings |
| `frontend/e2e/fixtures/algorithms.ts` | Shared 16-algorithm display names for E2E |
| `frontend/e2e/backend-integration.spec.ts` | Parameterized algorithm smoke |
| `docs/TEST_COVERAGE.md` | Post-implementation metrics |

**Explicitly skip:** `frontend/src/app/layout.tsx` (Vitest-incompatible Server Component).

---

## Prerequisites

```bash
# Backend
cd backend && uv sync --extra dev
uv run pytest tests/ --cov=coba_server -q   # expect 178 passed, 99%

# Frontend
cd frontend && pnpm install
pnpm test:run                                 # expect 157 passed
pnpm test:coverage                            # expect ~65.38% lines
pnpm exec playwright test --list              # expect 29 tests
```

**Commit protocol:** Conventional Commits, imperative subject, ≤72 chars. Types: `ci`, `test`, `chore`, `docs`. One logical change per commit. Run pre-commit hooks before each commit.

---

## Wave 0 — CI: Backend Coverage Gate

### Task 0: Enforce backend coverage in CI

**Files:**
- Modify: `.github/workflows/ci.yml:17-18`

- [ ] **Step 1: Update backend test step**

Replace the Test step `run` with:

```yaml
      - name: Test with coverage
        run: uv run --directory backend pytest tests/ --cov=coba_server --cov-report=term-missing --cov-fail-under=95 -q
```

- [ ] **Step 2: Verify locally**

Run: `cd backend && uv run pytest tests/ --cov=coba_server --cov-fail-under=95 -q`
Expected: `178 passed`, exit code 0, total coverage ≥ 95%.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: enforce backend coverage gate at 95%"
```

---

## Wave 1 — Shared Test Setup: ResizeObserver

### Task 1: Global ResizeObserver for Recharts

**Files:**
- Modify: `frontend/src/test-setup.ts`

- [ ] **Step 1: Add polyfill (match RegretLineChart pattern)**

Replace entire `frontend/src/test-setup.ts` with:

```typescript
import * as matchers from "@testing-library/jest-dom/matchers";
import { expect } from "vitest";

expect.extend(matchers);

// Recharts ResponsiveContainer requires ResizeObserver in jsdom
global.ResizeObserver = class ResizeObserver {
  private callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element) {
    this.callback(
      [
        {
          contentRect: {
            width: 400,
            height: 200,
            top: 0,
            left: 0,
            bottom: 200,
            right: 400,
            x: 0,
            y: 0,
            toJSON: () => ({}),
          },
        } as ResizeObserverEntry,
      ],
      this,
    );
    Object.defineProperty(target, "clientWidth", { configurable: true, value: 400 });
    Object.defineProperty(target, "clientHeight", { configurable: true, value: 200 });
  }

  unobserve() {}
  disconnect() {}
};
```

- [ ] **Step 2: Run existing chart tests**

Run: `cd frontend && pnpm vitest run src/components/charts`
Expected: All chart tests PASS (no regressions).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/test-setup.ts
git commit -m "test: add global ResizeObserver polyfill for Recharts"
```

---

## Wave 2 — Glossary Page Unit Tests (Priority 1)

### Task 2: Glossary page tests

**Files:**
- Create: `frontend/src/app/glossary/__tests__/page.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
import GlossaryPage from "@/app/glossary/page";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/glossary",
}));

describe("GlossaryPage", () => {
  it("renders heading and default term list", () => {
    render(<GlossaryPage />);
    expect(screen.getByRole("heading", { name: "Glossary" })).toBeInTheDocument();
    expect(screen.getByText("Bandit Problem")).toBeInTheDocument();
    expect(screen.getByText("UCB1")).toBeInTheDocument();
  });

  it("filters terms when searching", () => {
    render(<GlossaryPage />);
    fireEvent.change(screen.getByPlaceholderText(/Search terms/), {
      target: { value: "thompson" },
    });
    expect(screen.getByText("Thompson Sampling")).toBeInTheDocument();
    expect(screen.queryByText("Bandit Problem")).not.toBeInTheDocument();
  });

  it("shows empty state for unmatched query", () => {
    render(<GlossaryPage />);
    fireEvent.change(screen.getByPlaceholderText(/Search terms/), {
      target: { value: "zzznomatch" },
    });
    expect(screen.getByText(/No terms match/)).toBeInTheDocument();
  });

  it("expands card detail on click", () => {
    render(<GlossaryPage />);
    fireEvent.click(screen.getByText("Bandit Problem"));
    expect(
      screen.getByText(/Named after "one-armed bandit" slot machines/),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd frontend && pnpm vitest run src/app/glossary/__tests__/page.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/glossary/__tests__/page.test.tsx
git commit -m "test(frontend): add glossary page unit tests"
```

---

## Wave 3 — Results Page Unit Tests (Priority 2)

### Task 3: Results page empty and populated states

**Files:**
- Create: `frontend/src/app/results/__tests__/page.test.tsx`

- [ ] **Step 1: Write tests**

```typescript
import ResultsPage from "@/app/results/page";
import { createDefaultSimState } from "@/lib/constants";
import { useSimulationStore } from "@/store/simulation";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/results",
}));

vi.mock("@/store/simulation", () => ({
  useSimulationStore: vi.fn(),
}));

describe("ResultsPage", () => {
  beforeEach(() => {
    push.mockClear();
  });

  it("shows empty state when t is 0", () => {
    vi.mocked(useSimulationStore).mockImplementation((selector) =>
      selector({ simState: { ...createDefaultSimState("ucb1"), t: 0 } } as never),
    );
    render(<ResultsPage />);
    expect(screen.getByText("No data yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Go to Playground/i })).toBeInTheDocument();
  });

  it("navigates to playground from empty state CTA", () => {
    vi.mocked(useSimulationStore).mockImplementation((selector) =>
      selector({ simState: { ...createDefaultSimState("ucb1"), t: 0 } } as never),
    );
    render(<ResultsPage />);
    fireEvent.click(screen.getByRole("button", { name: /Go to Playground/i }));
    expect(push).toHaveBeenCalledWith("/playground");
  });

  it("renders stats when simulation has steps", () => {
    const simState = createDefaultSimState("ucb1");
    simState.t = 5;
    simState.regretHistory = [0.1, 0.2, 0.3, 0.4, 0.5];
    simState.history = Array.from({ length: 5 }, (_, i) => ({
      t: i + 1,
      chosenIdx: 0,
      outcome: 1,
      stepRegret: 0.1,
      cumRegret: (i + 1) * 0.1,
      scores: [],
      allTrueProbs: [0.5, 0.5, 0.5],
    }));
    vi.mocked(useSimulationStore).mockImplementation((selector) =>
      selector({ simState } as never),
    );
    render(<ResultsPage />);
    expect(screen.queryByText("No data yet")).not.toBeInTheDocument();
    expect(screen.getByText(/Cumulative regret/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd frontend && pnpm vitest run src/app/results/__tests__/page.test.tsx`
Expected: PASS (3 tests). If assertion on "Cumulative regret" fails, use `getByText(/regret/i)` or inspect `ResultsPage` stat labels and adjust to a stable visible string.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/results/__tests__/page.test.tsx
git commit -m "test(frontend): add results page empty and populated tests"
```

---

## Wave 4 — Settings Page Unit Tests (Priority 2)

### Task 4: Settings interactions

**Files:**
- Create: `frontend/src/app/settings/__tests__/page.test.tsx`

- [ ] **Step 1: Write tests**

```typescript
import SettingsPage from "@/app/settings/page";
import { createDefaultSimState } from "@/lib/constants";
import { useSimulationStore } from "@/store/simulation";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/settings",
}));

const applySettings = vi.fn();
const setSeed = vi.fn();

vi.mock("@/store/simulation", () => ({
  useSimulationStore: vi.fn(),
}));

describe("SettingsPage", () => {
  beforeEach(() => {
    applySettings.mockClear();
    setSeed.mockClear();
    vi.mocked(useSimulationStore).mockImplementation((selector) =>
      selector({
        simState: createDefaultSimState("ucb1"),
        seed: 42,
        applySettings,
        setSeed,
      } as never),
    );
  });

  it("renders settings heading and default arms", () => {
    render(<SettingsPage />);
    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Email")).toBeInTheDocument();
  });

  it("adds an arm when Add arm is clicked", () => {
    render(<SettingsPage />);
    const addButton = screen.getByRole("button", { name: /Add arm/i });
    fireEvent.click(addButton);
    expect(screen.getByDisplayValue("Arm 4")).toBeInTheDocument();
  });

  it("calls applySettings when Apply is clicked", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: /Apply & Reset Simulation/i }));
    expect(applySettings).toHaveBeenCalled();
    expect(setSeed).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd frontend && pnpm vitest run src/app/settings/__tests__/page.test.tsx`
Expected: PASS. If arm labels differ (e.g. not "Email"), query by `getByText` for known DEFAULT_ARMS labels from `constants.ts`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/settings/__tests__/page.test.tsx
git commit -m "test(frontend): add settings page interaction tests"
```

---

## Wave 5 — Landing Page Smoke (Priority 1)

### Task 5: Landing route smoke test

**Files:**
- Create: `frontend/src/app/__tests__/page.test.tsx`

- [ ] **Step 1: Write test**

```typescript
import LandingPage from "@/app/page";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
}));

vi.mock("@/lib/api", () => ({
  api: {
    getScenarios: vi.fn().mockResolvedValue([
      {
        id: "notification_channels",
        label: "Notification Channels",
        description: "Test scenario",
        domain: "Marketing",
        armCount: 3,
        featureCount: 2,
      },
    ]),
  },
}));

describe("LandingPage", () => {
  it("renders hero and primary sections", async () => {
    render(<LandingPage />);
    expect(screen.getByText("Bandit Simulator")).toBeInTheDocument();
    expect(screen.getByText("Algorithms")).toBeInTheDocument();
    expect(screen.getByText("Real-World Scenarios")).toBeInTheDocument();
  });

  it("renders bottom playground CTA", () => {
    render(<LandingPage />);
    expect(screen.getByRole("button", { name: /Start the Playground/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd frontend && pnpm vitest run src/app/__tests__/page.test.tsx`
Expected: PASS. Use `findByText` for async ScenarioShowcase if needed.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/__tests__/page.test.tsx
git commit -m "test(frontend): add landing page smoke tests"
```

---

## Wave 6 — Chart Unit Tests (Priority 3)

### Task 6: CumRewardsChart tests

**Files:**
- Create: `frontend/src/components/charts/__tests__/CumRewardsChart.test.tsx`

- [ ] **Step 1: Write tests**

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CumRewardsChart } from "../CumRewardsChart";

describe("CumRewardsChart", () => {
  it("shows empty message when history has fewer than 2 steps", () => {
    render(<CumRewardsChart history={[{ t: 1, outcome: 1 } as never]} />);
    expect(screen.getByText(/Run some steps to see rewards/)).toBeInTheDocument();
  });

  it("renders chart when history has multiple steps", () => {
    const history = [
      { t: 1, outcome: 1 },
      { t: 2, outcome: 0 },
      { t: 3, outcome: 1 },
    ] as never[];
    const { container } = render(<CumRewardsChart history={history} />);
    expect(screen.queryByText(/Run some steps/)).not.toBeInTheDocument();
    expect(container.querySelector(".recharts-responsive-container")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run**

Run: `cd frontend && pnpm vitest run src/components/charts/__tests__/CumRewardsChart.test.tsx`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/charts/__tests__/CumRewardsChart.test.tsx
git commit -m "test(frontend): cover CumRewardsChart empty and populated states"
```

### Task 7: DualRegretChart tests

**Files:**
- Create: `frontend/src/components/charts/__tests__/DualRegretChart.test.tsx`

- [ ] **Step 1: Write tests**

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DualRegretChart } from "../DualRegretChart";

describe("DualRegretChart", () => {
  it("shows empty message when histories are too short", () => {
    render(
      <DualRegretChart
        histA={[0]}
        histB={[0]}
        colorA="#111"
        colorB="#222"
        labelA="UCB1"
        labelB="Thompson"
      />,
    );
    expect(screen.getByText(/Run some steps to see regret/)).toBeInTheDocument();
  });

  it("renders dual-series chart when histories have data", () => {
    const { container } = render(
      <DualRegretChart
        histA={[0.1, 0.2, 0.3]}
        histB={[0.05, 0.15, 0.25]}
        colorA="#228be6"
        colorB="#12b886"
        labelA="UCB1"
        labelB="Thompson"
      />,
    );
    expect(container.querySelector(".recharts-responsive-container")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run and fix empty-message string if needed** (read `DualRegretChart.tsx` line ~45 for exact `EmptyChart` message).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/charts/__tests__/DualRegretChart.test.tsx
git commit -m "test(frontend): cover DualRegretChart empty and populated states"
```

### Task 8: PullDistChart tests

**Files:**
- Create: `frontend/src/components/charts/__tests__/PullDistChart.test.tsx`

- [ ] **Step 1: Write tests**

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PullDistChart } from "../PullDistChart";

const arms = [
  { id: "a", label: "Email", trueProb: 0.5, color: "#111", lightColor: "#eee" },
  { id: "b", label: "SMS", trueProb: 0.5, color: "#222", lightColor: "#ddd" },
];

describe("PullDistChart", () => {
  it("shows empty message when no pulls", () => {
    render(
      <PullDistChart
        arms={arms}
        armStates={[
          { n: 0, successes: 0, failures: 0 },
          { n: 0, successes: 0, failures: 0 },
        ]}
      />,
    );
    expect(screen.getByText(/No pulls yet/)).toBeInTheDocument();
  });

  it("renders bar chart when pulls exist", () => {
    const { container } = render(
      <PullDistChart
        arms={arms}
        armStates={[
          { n: 3, successes: 1, failures: 2 },
          { n: 7, successes: 4, failures: 3 },
        ]}
      />,
    );
    expect(container.querySelector(".recharts-responsive-container")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run**

Run: `cd frontend && pnpm vitest run src/components/charts/__tests__`
Expected: All chart tests PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/charts/__tests__/PullDistChart.test.tsx
git commit -m "test(frontend): cover PullDistChart empty and populated states"
```

---

## Wave 7 — Landing Component Tests (Priority 4)

### Task 9: AlgoStrip, ConceptCards, ScenarioShowcase

**Files:**
- Create: `frontend/src/components/landing/__tests__/landing-components.test.tsx`

- [ ] **Step 1: Write tests**

```typescript
import { AlgoStrip } from "@/components/landing/AlgoStrip";
import { ConceptCards } from "@/components/landing/ConceptCards";
import { ScenarioShowcase } from "@/components/landing/ScenarioShowcase";
import { ALGO_META } from "@/lib/constants";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  api: {
    getScenarios: vi.fn().mockResolvedValue([
      {
        id: "s1",
        label: "Scenario One",
        description: "Desc",
        domain: "Test",
        armCount: 3,
        featureCount: 2,
      },
    ]),
  },
}));

describe("AlgoStrip", () => {
  it("renders all algorithm pills from ALGO_META", () => {
    render(<AlgoStrip />);
    for (const meta of Object.values(ALGO_META)) {
      expect(screen.getByText(meta.label)).toBeInTheDocument();
    }
  });
});

describe("ConceptCards", () => {
  it("renders four concept titles", () => {
    render(<ConceptCards />);
    expect(screen.getByText("A choice you can make")).toBeInTheDocument();
    expect(screen.getByText("Feedback after each action")).toBeInTheDocument();
    expect(screen.getByText("The cost of uncertainty")).toBeInTheDocument();
    expect(screen.getByText("The core tension")).toBeInTheDocument();
  });
});

describe("ScenarioShowcase", () => {
  it("shows loading then scenario cards", async () => {
    render(<ScenarioShowcase />);
    expect(screen.getByText(/Loading scenarios/)).toBeInTheDocument();
    expect(await screen.findByText("Scenario One")).toBeInTheDocument();
    expect(screen.getByText("Real-World Scenarios")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run**

Run: `cd frontend && pnpm vitest run src/components/landing/__tests__`
Expected: PASS (existing 2 + new 3 = 5 tests in landing folder).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/landing/__tests__/landing-components.test.tsx
git commit -m "test(frontend): add landing component unit tests"
```

---

## Wave 8 — E2E: Full 16-Algorithm Smoke

### Task 10: Parameterized algorithm E2E

**Files:**
- Create: `frontend/e2e/fixtures/algorithms.ts`
- Modify: `frontend/e2e/backend-integration.spec.ts`

- [ ] **Step 1: Create fixture**

`frontend/e2e/fixtures/algorithms.ts`:

```typescript
/** Display labels must match AlgorithmSelector UI (from ALGO_META). */
export const ALGORITHM_SMOKE = [
  { name: "UCB1" },
  { name: "Thompson" },
  { name: "ε-Greedy" },
  { name: "LinUCB" },
  { name: "LinTS" },
  { name: "Hybrid LinUCB" },
  { name: "SW-LinUCB" },
  { name: "Softmax" },
  { name: "Neural Linear" },
  { name: "Bootstrapped TS" },
  { name: "Bootstrapped UCB" },
  { name: "Logistic UCB" },
  { name: "Logistic TS" },
  { name: "GP-UCB" },
  { name: "RF UCB" },
  { name: "RF TS" },
] as const;
```

**Important:** Before committing, open `frontend/src/lib/constants.ts` `ALGO_META` and verify each `label` matches exactly. Adjust fixture strings if any differ.

- [ ] **Step 2: Replace P0/P1 loops with single parameterized suite**

In `backend-integration.spec.ts`, remove `ALGORITHMS_P0`, `ALGORITHMS_P1`, and both `test.describe("16-algorithm smoke...")` blocks. Add:

```typescript
import { ALGORITHM_SMOKE } from "./fixtures/algorithms";

test.describe("Algorithm smoke (all 16)", () => {
  for (const { name } of ALGORITHM_SMOKE) {
    test(`${name} runs 3 steps without error`, async ({ page }) => {
      await page.goto("/playground");
      await page.waitForTimeout(2000);
      await page.getByText(name, { exact: true }).click();
      await page.waitForTimeout(500);
      for (let i = 0; i < 3; i++) {
        await page.getByText("Step →").click();
        await page.waitForTimeout(300);
      }
      await expect(page.getByText(/t=3/)).toBeVisible();
    });
  }
});
```

- [ ] **Step 3: List tests**

Run: `cd frontend && pnpm exec playwright test --list`
Expected: **37 tests** (29 - 8 old algorithm + 16 new = 37), or 29 - 8 + 16 = 37. Math: was 3+5+8+5+3+1+1+3=29, remove 8 add 16 → 37.

- [ ] **Step 4: Run smoke locally (optional but recommended)**

Run: `cd frontend && pnpm exec playwright test e2e/backend-integration.spec.ts -g "Algorithm smoke"`
Expected: 16 passed (requires backend + frontend via webServer).

- [ ] **Step 5: Commit**

```bash
git add frontend/e2e/fixtures/algorithms.ts frontend/e2e/backend-integration.spec.ts
git commit -m "test(e2e): add smoke coverage for all 16 algorithms"
```

---

## Wave 9 — Compare Page Unit Tests (Priority 7)

### Task 11: Compare page error path

**Files:**
- Create: `frontend/src/app/compare/__tests__/page.test.tsx`

- [ ] **Step 1: Write tests**

```typescript
import ComparePage from "@/app/compare/page";
import { api } from "@/lib/api";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/compare",
}));

vi.mock("@/hooks/useSimulationRunner", () => ({
  useSimulationRunner: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    createSimulation: vi.fn(),
    stepSimulation: vi.fn(),
    deleteSimulation: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("ComparePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders compare heading", async () => {
    vi.mocked(api.createSimulation).mockResolvedValue({
      id: "sim-a",
      state: { t: 0, arms: [], armStates: [], regretHistory: [], history: [], algorithm: "ucb1" },
    } as never);
    render(<ComparePage />);
    expect(await screen.findByText("Compare Algorithms")).toBeInTheDocument();
  });

  it("shows error when initialization fails", async () => {
    vi.mocked(api.createSimulation).mockRejectedValue(new Error("Network down"));
    render(<ComparePage />);
    await waitFor(() => {
      expect(screen.getByText("Network down")).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run**

Run: `cd frontend && pnpm vitest run src/app/compare/__tests__/page.test.tsx`
Expected: PASS. Mock may need two resolved values for parallel `createSimulation` calls — use `mockResolvedValueOnce` twice if first test flakes.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/compare/__tests__/page.test.tsx
git commit -m "test(frontend): add compare page render and error tests"
```

---

## Wave 10 — Playground `act` Warning Fix

### Task 12: Stabilize playground page tests

**Files:**
- Modify: `frontend/src/app/playground/__tests__/page.test.tsx`

- [ ] **Step 1: Use waitFor and resolved scenarios**

Update imports and first test:

```typescript
import { render, screen, waitFor } from "@testing-library/react";

// In beforeEach, ensure getScenarios resolves:
vi.mock("@/lib/api", () => ({
  api: {
    getScenarios: vi.fn().mockResolvedValue([
      { id: "notification_channels", label: "Channels", description: "", domain: "x", armCount: 3, featureCount: 1 },
    ]),
    createSimulation: vi.fn(),
    stepSimulation: vi.fn(),
    deleteSimulation: vi.fn(),
  },
}));

  it("renders page shell without crashing when simState is null", async () => {
    render(<PlaygroundPage />);
    await waitFor(() => {
      expect(screen.getByText(/Algo/i)).toBeInTheDocument();
    });
  });
```

Apply same `await waitFor` pattern to error banner test.

- [ ] **Step 2: Run without act warnings**

Run: `cd frontend && pnpm vitest run src/app/playground/__tests__/page.test.tsx 2>&1`
Expected: PASS, no `act(...)` stderr warnings.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/playground/__tests__/page.test.tsx
git commit -m "test(frontend): fix playground page act warnings"
```

---

## Wave 11 — CI: Frontend Coverage Gate

### Task 13: Vitest coverage threshold

**Files:**
- Modify: `frontend/vitest.config.ts`
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Add threshold after Wave 2–7 complete**

In `vitest.config.ts` inside `coverage:` block:

```typescript
      thresholds: {
        lines: 70,
        branches: 65,
        functions: 70,
        statements: 70,
      },
```

Run `pnpm test:coverage` — if below 70%, finish Waves 2–7 first, then lower to 68 temporarily or complete remaining tests.

- [ ] **Step 2: Update CI frontend job**

Replace `pnpm vitest run` with:

```yaml
      - run: pnpm test:coverage
```

- [ ] **Step 3: Commit**

```bash
git add frontend/vitest.config.ts .github/workflows/ci.yml
git commit -m "ci: enforce frontend coverage thresholds in CI"
```

---

## Wave 12 — CI: Playwright Job

### Task 14: Add Playwright to GitHub Actions

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Add job**

Append to `ci.yml`:

```yaml
  e2e:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v6
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v6
        with:
          node-version: "22"
          cache: pnpm
          cache-dependency-path: frontend/pnpm-lock.yaml
      - uses: astral-sh/setup-uv@v8
        with:
          python-version: "3.12"
          enable-cache: true
      - run: uv sync --frozen --extra dev --directory backend
      - run: pnpm install --frozen-lockfile
        working-directory: frontend
      - run: pnpm exec playwright install --with-deps chromium
        working-directory: frontend
      - name: E2E tests
        run: pnpm test:e2e
        working-directory: frontend
      - name: Upload Playwright report on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: frontend/playwright-report/
          retention-days: 7
```

- [ ] **Step 2: First CI run may need snapshot update on Linux**

If visual tests fail on Ubuntu fonts/layout:

```bash
cd frontend
pnpm exec playwright test e2e/visual-regression.spec.ts --update-snapshots
git add e2e/__screenshots__
git commit -m "test(e2e): refresh visual baselines for Linux CI"
```

- [ ] **Step 3: Commit workflow**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add Playwright E2E job with failure artifacts"
```

---

## Wave 13 — Documentation Update

### Task 15: Refresh TEST_COVERAGE.md

**Files:**
- Modify: `docs/TEST_COVERAGE.md`

- [ ] **Step 1: Regenerate metrics**

```bash
cd backend && uv run pytest tests/ --cov=coba_server -q
cd ../frontend && pnpm test:run && pnpm test:coverage
cd frontend && pnpm exec playwright test --list
```

- [ ] **Step 2: Update tables**

Update Whole-Codebase Summary with new test counts (~178 backend, ~180 Vitest, ~37 Playwright, ~395 total) and new frontend line %.

Add **Post follow-up plan (2026-05-27)** section listing completed waves.

- [ ] **Step 3: Commit**

```bash
git add docs/TEST_COVERAGE.md
git commit -m "docs: update test coverage report after follow-up plan"
```

---

## Final Verification Checklist

```bash
cd backend && uv run pytest tests/ --cov=coba_server --cov-fail-under=95 -q
cd ../frontend && pnpm test:coverage
cd frontend && pnpm test:e2e
```

| Metric | Before | Target after plan |
|--------|-------:|------------------:|
| Frontend line coverage | 65.38% | 75–80% |
| Vitest tests | 157 | ~180 |
| Playwright tests | 29 | ~37 |
| Backend CI coverage gate | No | Yes (95%) |
| Frontend CI coverage gate | No | Yes (70% lines) |
| Playwright in CI | No | Yes |
| Algorithms in E2E smoke | 8 | 16 |

---

## Self-Review (plan author checklist)

| Spec requirement (`TEST_COVERAGE.md`) | Task |
|---------------------------------------|------|
| CI backend `--cov-fail-under=95` | Task 0 |
| CI frontend coverage + Playwright | Tasks 13–14 |
| Glossary unit tests | Task 2 |
| Results + settings unit tests | Tasks 3–4 |
| Landing page smoke | Task 5 |
| Three chart unit tests + ResizeObserver | Tasks 1, 6–8 |
| Landing components (AlgoStrip, ConceptCards, ScenarioShowcase) | Task 9 |
| E2E 16 algorithms | Task 10 |
| Compare page (revisit skip) | Task 11 |
| Playground act fix | Task 12 |
| Skip layout.tsx | Documented |
| Update TEST_COVERAGE.md | Task 15 |

**Placeholder scan:** No TBD steps. All test files include complete code.

**Type consistency:** Uses `StepRecord`-shaped history in results test; `createDefaultSimState` from constants throughout.

---

## What This Plan Intentionally Defers

- Backend residual 7 lines (99% is sufficient)
- `store/simulation.ts` branch coverage (66%) — only when editing store
- `lib/api.ts` error paths — only when editing API client
- Deep playground integration test with real chart children (E2E + panel tests suffice unless product demands)
- Nightly-only Playwright split (optional optimization if CI time exceeds ~15 min)
