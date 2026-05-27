# Perceived Performance & Interaction Responsiveness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make tab switching, clicks, and simulation controls feel responsive in production by measuring first, then applying targeted UI/API optimizations with documented thresholds and lightweight regression guards.

**Architecture:** Split “slow because of network/sim work” from “slow because the UI freezes.” Replace the single `isLoading` flag with `isStepping` vs `isRecreating`, give immediate control feedback, narrow React subscriptions so Recharts don’t repaint the whole Playground on every step, optionally throttle chart updates during auto-play, add nav prefetch, profile the backend step endpoint, and add a small Playwright perf spec plus a human baseline doc.

**Tech Stack:** Next.js 15 (App Router), React 19, Zustand 5, Recharts 2, Vitest, Playwright 1.60, FastAPI backend (`/api/simulate/{id}/step`).

**Success thresholds (production build, `pnpm build && pnpm start`):**

| Flow | Target |
|------|--------|
| Header nav (static routes) | Active state &lt; 100 ms; usable content &lt; 500 ms |
| Scenario picker open | &lt; 300 ms |
| Step click acknowledgment | &lt; 50 ms (disabled/spinner on control) |
| Single UCB1 step (API + UI) | &lt; 800 ms p95 locally |
| Scenario / algorithm recreate | &lt; 2 s with visible “Recreating…” (not full-page freeze) |
| Compare dual step | &lt; 2 s with per-side busy state |

---

## File Map

| File | Responsibility |
|------|----------------|
| `docs/PERF_BASELINE.md` | Human measurement log + thresholds (created in Task 1) |
| `frontend/src/store/simulation.ts` | Split loading flags; optional optimistic `pendingT` |
| `frontend/src/store/__tests__/simulation.test.ts` | Unit tests for new store flags and step behavior |
| `frontend/src/hooks/useSimulationRunner.ts` | Optional chart throttle callback hook |
| `frontend/src/hooks/useThrottledValue.ts` | **Create** — throttle display values during play |
| `frontend/src/hooks/__tests__/useThrottledValue.test.ts` | **Create** — unit tests for throttle hook |
| `frontend/src/components/shared/PlaybackControls.tsx` | `isStepping` / `disabled` / `aria-busy` |
| `frontend/src/components/playground/ControlBar.tsx` | Wire stepping vs recreating props |
| `frontend/src/components/playground/ScenarioPicker.tsx` | Use `isRecreating` only for picker disable |
| `frontend/src/app/playground/page.tsx` | Narrow subscriptions; throttled chart props; local banner |
| `frontend/src/app/compare/page.tsx` | `isStepping` state; stepping UX parity |
| `frontend/src/components/layout/Header.tsx` | `router.prefetch` on hover/focus |
| `frontend/src/components/charts/PlaygroundCharts.tsx` | **Create** — memoized chart bundle |
| `frontend/src/components/charts/index.ts` | Export `PlaygroundCharts` |
| `frontend/e2e/helpers/perf.ts` | **Create** — timing helpers |
| `frontend/e2e/performance.spec.ts` | **Create** — SLA smoke tests |
| `frontend/package.json` | Scripts: `perf:baseline`, `test:e2e:perf` |
| `backend/tests/test_step_performance.py` | **Create** — API step timing guard |

---

### Task 1: Performance baseline document and measurement script

**Files:**
- Create: `docs/PERF_BASELINE.md`
- Create: `scripts/perf-baseline.sh`
- Modify: `frontend/package.json` (add `perf:baseline` script)

- [ ] **Step 1: Create baseline template**

Create `docs/PERF_BASELINE.md`:

```markdown
# Performance Baseline — Coba Edu

> Fill after running `pnpm perf:baseline` on a **production** frontend build.
> Date: ___________  Machine: ___________  Commit: ___________

## How to measure

1. `cd frontend && pnpm build && pnpm start` (port 3000)
2. Backend: `cd backend && COBA_ALLOW_SIMULATION_PURGE=1 uv run uvicorn coba_server:app --port 8000`
3. Chrome DevTools → Performance: record from click until UI settles
4. Note three numbers: **click → first paint**, **click → network idle**, **click → fully idle**

## Thresholds (product)

| Flow | Good | OK | Bad |
|------|------|-----|-----|
| Nav: Playground → Glossary | &lt; 300 ms | 300–500 ms | &gt; 500 ms |
| Nav: Glossary → Playground | &lt; 500 ms | 500 ms–1 s | &gt; 1 s |
| Scenario picker open | &lt; 200 ms | 200–400 ms | &gt; 400 ms |
| Scenario switch (recreate) | &lt; 1.5 s | 1.5–3 s | &gt; 3 s |
| Step (UCB1) end-to-end | &lt; 600 ms | 600 ms–1.2 s | &gt; 1.2 s |
| Algorithm switch (recreate) | &lt; 1.5 s | 1.5–3 s | &gt; 3 s |
| Compare dual step | &lt; 1.2 s | 1.2–2.5 s | &gt; 2.5 s |

## Measurements (before optimization)

| # | Flow | First paint | Network done | Fully idle | Notes |
|---|------|-------------|--------------|------------|-------|
| 1 | Playground → Glossary → Playground | | | | |
| 2 | Open scenario picker | | | | |
| 3 | Switch to Content Format | | | | |
| 4 | Single Step (UCB1) | | | | |
| 5 | UCB1 → LinUCB | | | | |
| 6 | Compare: one dual step | | | | |

## Measurements (after optimization)

| # | Flow | First paint | Network done | Fully idle | Delta |
|---|------|-------------|--------------|------------|-------|
| 1 | | | | | |
```

- [ ] **Step 2: Add baseline helper script**

Create `scripts/perf-baseline.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "=== Coba perf baseline ==="
echo "1. Start backend (terminal A):"
echo "   cd $ROOT/backend && COBA_ALLOW_SIMULATION_PURGE=1 uv run uvicorn coba_server:app --port 8000"
echo "2. Production frontend (terminal B):"
echo "   cd $ROOT/frontend && pnpm build && pnpm start"
echo "3. Open http://localhost:3000 and record timings in docs/PERF_BASELINE.md"
echo "4. Optional: Chrome Lighthouse on /playground (after 5 steps)"
```

- [ ] **Step 3: Wire npm script**

In `frontend/package.json`, inside `"scripts"`:

```json
"perf:baseline": "bash ../scripts/perf-baseline.sh"
```

- [ ] **Step 4: Run script (smoke)**

Run: `cd frontend && pnpm perf:baseline`
Expected: prints instructions (no error)

- [ ] **Step 5: Commit**

```bash
git add docs/PERF_BASELINE.md scripts/perf-baseline.sh frontend/package.json
git commit -m "docs: add performance baseline template and script"
```

---

### Task 2: Split `isLoading` into `isStepping` and `isRecreating`

**Files:**
- Modify: `frontend/src/store/simulation.ts`
- Modify: `frontend/src/store/__tests__/simulation.test.ts`

- [ ] **Step 1: Write failing store tests**

Add to `frontend/src/store/__tests__/simulation.test.ts`:

```typescript
describe("loading flags", () => {
  beforeEach(() => {
    useSimulationStore.setState({
      simId: null,
      simState: null,
      isRunning: false,
      isStepping: false,
      isRecreating: false,
      speed: 0.5,
      seed: 42,
      scenarioId: "notification_channels",
      error: null,
    });
    vi.clearAllMocks();
  });

  it("step sets isStepping true then false", async () => {
    vi.mocked(api.createSimulation).mockResolvedValue(mockSimResponse(0) as never);
    vi.mocked(api.step).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(mockStepResponse(1) as never), 10);
        }),
    );
    await useSimulationStore.getState().initialize(null, "ucb1", { alpha: 2.0 });
    const stepPromise = useSimulationStore.getState().step();
    expect(useSimulationStore.getState().isStepping).toBe(true);
    expect(useSimulationStore.getState().isRecreating).toBe(false);
    await stepPromise;
    expect(useSimulationStore.getState().isStepping).toBe(false);
  });

  it("initialize sets isRecreating not isStepping", async () => {
    vi.mocked(api.createSimulation).mockResolvedValue(mockSimResponse(0) as never);
    const p = useSimulationStore.getState().initialize(null, "ucb1", { alpha: 2.0 });
    expect(useSimulationStore.getState().isRecreating).toBe(true);
    expect(useSimulationStore.getState().isStepping).toBe(false);
    await p;
    expect(useSimulationStore.getState().isRecreating).toBe(false);
  });
});
```

Add helper near top of test file (if missing):

```typescript
const mockStepResponse = (t: number) => ({
  t,
  step: {
    t,
    chosenIdx: 0,
    outcome: 1,
    stepRegret: 0,
    cumRegret: 0,
    scores: [],
    context: null,
    wasRandom: false,
    trueProb: 0.5,
  },
  armStates: mockSimResponse(t).state.armStates,
  regretHistory: Array.from({ length: t }, () => 0),
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && pnpm test:run src/store/__tests__/simulation.test.ts -t "loading flags"`
Expected: FAIL — `isStepping` / `isRecreating` undefined

- [ ] **Step 3: Update store interface and implementation**

In `frontend/src/store/simulation.ts`, replace `isLoading: boolean` with:

```typescript
  isStepping: boolean;
  isRecreating: boolean;
```

Initial state:

```typescript
  isStepping: false,
  isRecreating: false,
```

In `step`:

```typescript
    set({ isStepping: true, error: null });
    try {
      // ... existing step logic ...
      set({ simState: updatedSimState, isStepping: false });
    } catch (e) {
      set({
        isStepping: false,
        error: e instanceof Error ? e.message : "Step failed",
        isRunning: false,
      });
    }
```

In `initialize`, `reset`, `applySettings` — use `isRecreating: true/false` instead of `isLoading`.

Remove all `isLoading` references from this file.

- [ ] **Step 4: Run store tests**

Run: `cd frontend && pnpm test:run src/store/__tests__/simulation.test.ts`
Expected: PASS (fix any tests still expecting `isLoading`)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/store/simulation.ts frontend/src/store/__tests__/simulation.test.ts
git commit -m "refactor: split simulation loading into stepping and recreating"
```

---

### Task 3: Immediate step feedback in PlaybackControls

**Files:**
- Modify: `frontend/src/components/shared/PlaybackControls.tsx`
- Create: `frontend/src/components/shared/__tests__/playback-controls.test.tsx`
- Modify: `frontend/src/components/playground/ControlBar.tsx`
- Modify: `frontend/src/app/playground/page.tsx`

- [ ] **Step 1: Write failing PlaybackControls test**

Create `frontend/src/components/shared/__tests__/playback-controls.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlaybackControls } from "../PlaybackControls";

describe("PlaybackControls", () => {
  it("disables step and sets aria-busy when isStepping", () => {
    render(
      <PlaybackControls
        isRunning={false}
        isStepping={true}
        onStep={vi.fn()}
        onPlayPause={vi.fn()}
      />,
    );
    const step = screen.getByRole("button", { name: /step/i });
    expect(step).toBeDisabled();
    expect(step).toHaveAttribute("aria-busy", "true");
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `cd frontend && pnpm test:run src/components/shared/__tests__/playback-controls.test.tsx`
Expected: FAIL — prop `isStepping` does not exist

- [ ] **Step 3: Implement PlaybackControls**

```typescript
interface PlaybackControlsProps {
  isRunning: boolean;
  isStepping?: boolean;
  onStep: () => void;
  onPlayPause: () => void;
}

export function PlaybackControls({
  isRunning,
  isStepping = false,
  onStep,
  onPlayPause,
}: PlaybackControlsProps) {
  const stepDisabled = isRunning || isStepping;
  return (
    <div className="flex gap-[6px] items-center">
      <button
        type="button"
        onClick={onStep}
        disabled={stepDisabled}
        aria-busy={isStepping}
        data-testid="playback-step-button"
        className="px-3 py-[6px] rounded-xs border border-gray-3 cursor-pointer text-[12px] bg-white text-gray-7 font-sans transition-opacity duration-fast disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Step &rarr;
      </button>
      {/* Play/Pause button unchanged */}
    </div>
  );
}
```

- [ ] **Step 4: Wire ControlBar and Playground**

`ControlBar.tsx` — replace `isLoading?: boolean` with:

```typescript
  isStepping?: boolean;
  isRecreating?: boolean;
```

Pass to `PlaybackControls`: `isStepping={isStepping}`
Pass to `ScenarioPicker`: `isLoading={isRecreating}` (picker only disabled during recreate)

`playground/page.tsx` — replace `isLoading` selectors:

```typescript
  const isStepping = useSimulationStore((s) => s.isStepping);
  const isRecreating = useSimulationStore((s) => s.isRecreating);
```

ControlBar props: `isStepping={isStepping}` `isRecreating={isRecreating}`

Replace full-page banner:

```typescript
          {isRecreating && (
            <div
              className="text-center text-gray-5 text-[12px] py-2"
              data-testid="playground-recreating-banner"
            >
              Recreating simulation…
            </div>
          )}
```

Remove the old `isLoading && "Running simulation..."` block entirely.

- [ ] **Step 5: Run tests**

Run: `cd frontend && pnpm test:run src/components/shared/__tests__/playback-controls.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/shared/PlaybackControls.tsx \
  frontend/src/components/shared/__tests__/playback-controls.test.tsx \
  frontend/src/components/playground/ControlBar.tsx \
  frontend/src/app/playground/page.tsx
git commit -m "feat: show immediate feedback while simulation step is in flight"
```

---

### Task 4: `useThrottledValue` hook for chart updates during play

**Files:**
- Create: `frontend/src/hooks/useThrottledValue.ts`
- Create: `frontend/src/hooks/__tests__/useThrottledValue.test.ts`

- [ ] **Step 1: Write failing tests**

Create `frontend/src/hooks/__tests__/useThrottledValue.test.ts`:

```typescript
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useThrottledValue } from "../useThrottledValue";

describe("useThrottledValue", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns latest value immediately when not throttling", () => {
    const { result, rerender } = renderHook(
      ({ value, active }) => useThrottledValue(value, { intervalMs: 200, active }),
      { initialProps: { value: 1, active: false } },
    );
    expect(result.current).toBe(1);
    rerender({ value: 5, active: false });
    expect(result.current).toBe(5);
  });

  it("throttles updates while active", () => {
    const { result, rerender } = renderHook(
      ({ value, active }) => useThrottledValue(value, { intervalMs: 200, active }),
      { initialProps: { value: 1, active: true } },
    );
    rerender({ value: 2, active: true });
    expect(result.current).toBe(1);
    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe(2);
  });

  it("flushes latest value when active becomes false", () => {
    const { result, rerender } = renderHook(
      ({ value, active }) => useThrottledValue(value, { intervalMs: 200, active }),
      { initialProps: { value: 1, active: true } },
    );
    rerender({ value: 9, active: true });
    rerender({ value: 9, active: false });
    expect(result.current).toBe(9);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `cd frontend && pnpm test:run src/hooks/__tests__/useThrottledValue.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement hook**

Create `frontend/src/hooks/useThrottledValue.ts`:

```typescript
import { useEffect, useRef, useState } from "react";

interface Options {
  intervalMs: number;
  active: boolean;
}

export function useThrottledValue<T>(value: T, { intervalMs, active }: Options): T {
  const [display, setDisplay] = useState(value);
  const latestRef = useRef(value);
  latestRef.current = value;

  useEffect(() => {
    if (!active) {
      setDisplay(latestRef.current);
      return;
    }
    const id = window.setInterval(() => {
      setDisplay(latestRef.current);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [active, intervalMs]);

  useEffect(() => {
    if (!active) setDisplay(value);
  }, [active, value]);

  return display;
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `cd frontend && pnpm test:run src/hooks/__tests__/useThrottledValue.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useThrottledValue.ts frontend/src/hooks/__tests__/useThrottledValue.test.ts
git commit -m "feat: add useThrottledValue for batched chart updates during play"
```

---

### Task 5: Extract memoized `PlaygroundCharts` and throttle during auto-play

**Files:**
- Create: `frontend/src/components/charts/PlaygroundCharts.tsx`
- Modify: `frontend/src/components/charts/index.ts`
- Modify: `frontend/src/app/playground/page.tsx`

- [ ] **Step 1: Create PlaygroundCharts component**

Create `frontend/src/components/charts/PlaygroundCharts.tsx`:

```typescript
"use client";

import type { ScenarioInfo, SimState } from "@/lib/types";
import { memo } from "react";
import { ContextScatterPlot } from "./ContextScatterPlot";
import { CumRewardsChart } from "./CumRewardsChart";
import { PullDistChart } from "./PullDistChart";
import { RegretLineChart } from "./RegretLineChart";

export interface PlaygroundChartsProps {
  display: SimState;
  selectedScenario: ScenarioInfo | null;
}

function PlaygroundChartsComponent({ display, selectedScenario }: PlaygroundChartsProps) {
  return (
    <>
      {display.featureNames.length === 2 && (
        <div data-testid="chart-context" className="bg-white border border-gray-3 rounded-md shadow-sm p-lg">
          <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-6 mb-[10px]">
            Context Space
          </div>
          <ContextScatterPlot
            history={display.history}
            arms={display.arms}
            featureNames={display.featureNames}
            featureLabels={display.featureLabels}
            featureMins={display.featureMins}
            featureMaxs={display.featureMaxs}
            totalSteps={display.t}
            historyWindow={display.historyWindow}
            width={620}
            height={280}
          />
        </div>
      )}
      <div className="flex gap-[10px]">
        <div data-testid="chart-regret" className="flex-1 bg-white border border-gray-3 rounded-md shadow-sm p-lg">
          <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-6 mb-[10px]">
            Cumulative Regret
          </div>
          <RegretLineChart
            regretHistory={display.regretHistory}
            height={180}
            totalSteps={display.t}
            driftStep={selectedScenario?.driftStep ?? undefined}
            driftEndStep={selectedScenario?.driftEndStep ?? undefined}
          />
        </div>
        <div data-testid="chart-rewards" className="flex-1 bg-white border border-gray-3 rounded-md shadow-sm p-lg">
          <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-6 mb-[10px]">
            Cumulative Rewards
          </div>
          <CumRewardsChart history={display.history} height={180} />
        </div>
        <div data-testid="chart-pulls" className="flex-1 bg-white border border-gray-3 rounded-md shadow-sm p-lg">
          <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-6 mb-[10px]">
            Pull Distribution
          </div>
          <PullDistChart arms={display.arms} armStates={display.armStates} height={180} />
        </div>
      </div>
    </>
  );
}

export const PlaygroundCharts = memo(PlaygroundChartsComponent);
```

Add to `frontend/src/components/charts/index.ts`:

```typescript
export { PlaygroundCharts } from "./PlaygroundCharts";
```

- [ ] **Step 2: Use throttled display in playground page**

In `playground/page.tsx`:

```typescript
import { PlaygroundCharts } from "@/components/charts";
import { useThrottledValue } from "@/hooks/useThrottledValue";

// inside component, after display is defined:
  const chartDisplay = useThrottledValue(display, {
    intervalMs: 250,
    active: isRunning,
  });

// Replace inline chart JSX with:
          <PlaygroundCharts display={chartDisplay} selectedScenario={selectedScenario ?? null} />
```

Keep `StepFeed`, `UCBDisplay`, `WhyPanel` on live `display` (counter and feed stay real-time; charts batch during play).

- [ ] **Step 3: Manual verify**

Run production build, Playground → Play at 2× → Pause.
Expected: `t=` updates every step; charts update in bursts (~4/sec), not every step.

- [ ] **Step 4: Run unit tests**

Run: `cd frontend && pnpm test:run`
Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/charts/PlaygroundCharts.tsx \
  frontend/src/components/charts/index.ts \
  frontend/src/app/playground/page.tsx
git commit -m "perf: throttle playground chart repaints during auto-play"
```

---

### Task 6: Narrow Zustand selectors on Playground (avoid whole-tree churn)

**Files:**
- Modify: `frontend/src/app/playground/page.tsx`

- [ ] **Step 1: Replace multiple store hooks with focused selectors**

Refactor subscriptions so chart-unrelated panels don’t re-render when only `regretHistory` changes unnecessarily. Pattern:

```typescript
  const t = useSimulationStore((s) => s.simState?.t ?? 0);
  const algorithm = useSimulationStore((s) => s.simState?.algorithm ?? "ucb1");
  const history = useSimulationStore((s) => s.simState?.history ?? []);
  // ... build `display` via useMemo from granular slices OR keep simState but pass slices to children
```

Minimum change: pass `history`, `arms`, `t` as separate props to `StepFeed` instead of full `display` object recreated each render.

- [ ] **Step 2: Verify StepFeed still updates on step**

Run: `cd frontend && pnpm test:run src/components/playground` (if tests exist) or manual step once.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/playground/page.tsx
git commit -m "perf: narrow playground store subscriptions for lighter rerenders"
```

---

### Task 7: Header route prefetch

**Files:**
- Modify: `frontend/src/components/layout/Header.tsx`
- Create: `frontend/src/components/layout/__tests__/header.test.tsx`

- [ ] **Step 1: Write failing test**

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const prefetch = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), prefetch }),
}));

import { Header } from "../Header";

describe("Header", () => {
  it("prefetches route on mouse enter", () => {
    render(<Header />);
    screen.getByRole("button", { name: "Playground" }).dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    expect(prefetch).toHaveBeenCalledWith("/playground");
  });
});
```

- [ ] **Step 2: Implement prefetch**

```typescript
  const prefetchRoute = (path: string) => router.prefetch(path);

// on each nav button:
            onMouseEnter={() => prefetchRoute(item.path)}
            onFocus={() => prefetchRoute(item.path)}
```

- [ ] **Step 3: Run test — PASS**

Run: `cd frontend && pnpm test:run src/components/layout/__tests__/header.test.tsx`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/layout/Header.tsx frontend/src/components/layout/__tests__/header.test.tsx
git commit -m "perf: prefetch main routes on header hover and focus"
```

---

### Task 8: Compare page stepping UX parity

**Files:**
- Modify: `frontend/src/app/compare/page.tsx`

- [ ] **Step 1: Add `isStepping` state to Compare**

```typescript
  const [isStepping, setIsStepping] = useState(false);

  const handleStep = useCallback(async () => {
    if (!ids || !simA || !simB || isStepping) return;
    setIsStepping(true);
    try {
      // existing Promise.all step logic
    } catch (e) {
      setError(e instanceof Error ? e.message : "Step failed");
    } finally {
      setIsStepping(false);
    }
  }, [ids, simA, simB, isStepping]);
```

Pass `isStepping` to both `PlaybackControls` instances (shared bar).

- [ ] **Step 2: Add `isRecreating` during `initSims`**

```typescript
  const [isRecreating, setIsRecreating] = useState(true);
  // initSims: setIsRecreating(true) at start, false in finally
```

Show slim banner `data-testid="compare-recreating-banner"` when `isRecreating`.

- [ ] **Step 3: Manual verify Compare step**

Run dev or prod; dual step should disable button immediately.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/compare/page.tsx
git commit -m "feat: align compare page stepping and recreate feedback with playground"
```

---

### Task 9: Backend step endpoint performance guard

**Files:**
- Create: `backend/tests/test_step_performance.py`

- [ ] **Step 1: Write timing test**

```python
import time

import pytest
from fastapi.testclient import TestClient


@pytest.mark.performance
def test_ucb1_step_p95_under_budget(client: TestClient):
    """Guard against accidental 10x slowdown in step path (local CI)."""
    create = client.post(
        "/api/simulate",
        json={"algorithm": "ucb1", "seed": 1, "scenario_id": "notification_channels"},
    )
    assert create.status_code == 200
    sim_id = create.json()["id"]

    samples_ms: list[float] = []
    for _ in range(20):
        t0 = time.perf_counter()
        r = client.post(f"/api/simulate/{sim_id}/step")
        elapsed_ms = (time.perf_counter() - t0) * 1000
        assert r.status_code == 200
        samples_ms.append(elapsed_ms)

    samples_ms.sort()
    p95 = samples_ms[int(len(samples_ms) * 0.95) - 1]
    # Generous for CI; tighten after baseline in docs/PERF_BASELINE.md
    assert p95 < 500, f"UCB1 step p95 {p95:.1f}ms exceeds 500ms budget"
```

- [ ] **Step 2: Run test**

Run: `cd backend && uv run pytest tests/test_step_performance.py -v`
Expected: PASS on typical hardware

- [ ] **Step 3: Document marker in backend README or TEST_COVERAGE**

Note: `pytest -m performance` optional lane.

- [ ] **Step 4: Commit**

```bash
git add backend/tests/test_step_performance.py
git commit -m "test: add UCB1 step latency guard for backend regressions"
```

---

### Task 10: Playwright performance smoke tests

**Files:**
- Create: `frontend/e2e/helpers/perf.ts`
- Create: `frontend/e2e/performance.spec.ts`
- Modify: `frontend/package.json`
- Modify: `frontend/playwright.config.ts` (optional project)

- [ ] **Step 1: Create perf helper**

Create `frontend/e2e/helpers/perf.ts`:

```typescript
import type { APIRequestContext, Page } from "@playwright/test";

const API = process.env.API_BASE_URL ?? "http://localhost:8000";

export async function measureStepApiMs(request: APIRequestContext): Promise<number> {
  const create = await request.post(`${API}/api/simulate`, {
    data: { algorithm: "ucb1", seed: 1, scenario_id: "notification_channels" },
  });
  if (!create.ok()) throw new Error(`create failed: ${create.status()}`);
  const { id } = (await create.json()) as { id: string };
  const t0 = Date.now();
  const step = await request.post(`${API}/api/simulate/${id}/step`);
  if (!step.ok()) throw new Error(`step failed: ${step.status()}`);
  await request.delete(`${API}/api/simulate/${id}`);
  return Date.now() - t0;
}

export async function measureNavActiveMs(page: Page, linkName: string): Promise<number> {
  const t0 = Date.now();
  await page.locator("header").getByRole("button", { name: linkName, exact: true }).click();
  await page.locator("header").getByRole("button", { name: linkName, exact: true }).waitFor({
    state: "visible",
  });
  return Date.now() - t0;
}
```

- [ ] **Step 2: Create performance spec**

Create `frontend/e2e/performance.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";
import { gotoPlayground, stepTimes } from "./helpers/playground";
import { measureNavActiveMs, measureStepApiMs } from "./helpers/perf";

test.describe("Performance smoke", () => {
  test("API single UCB1 step completes within budget", async ({ request }) => {
    const ms = await measureStepApiMs(request);
    expect(ms).toBeLessThan(800);
  });

  test("header nav to Glossary feels instant", async ({ page }) => {
    await page.goto("/playground");
    const ms = await measureNavActiveMs(page, "Glossary");
    expect(ms).toBeLessThan(500);
    await expect(page.getByRole("heading", { name: "Glossary" })).toBeVisible();
  });

  test("step button disables immediately on click", async ({ page }) => {
    await gotoPlayground(page);
    const step = page.getByTestId("playback-step-button");
    await step.click();
    await expect(step).toBeDisabled({ timeout: 100 });
  });

  test("manual step updates counter within budget", async ({ page }) => {
    await gotoPlayground(page);
    const t0 = Date.now();
    await stepTimes(page, 1);
    expect(Date.now() - t0).toBeLessThan(2000);
  });
});
```

- [ ] **Step 3: Add npm script**

```json
"test:e2e:perf": "playwright test e2e/performance.spec.ts"
```

- [ ] **Step 4: Run perf e2e**

Run: `cd frontend && pnpm test:e2e:perf`
Expected: 4 passed (tune budgets if CI hardware differs)

- [ ] **Step 5: Commit**

```bash
git add frontend/e2e/helpers/perf.ts frontend/e2e/performance.spec.ts frontend/package.json
git commit -m "test: add Playwright performance smoke for nav and step SLAs"
```

---

### Task 11: Update E2E helpers for renamed loading states

**Files:**
- Modify: `frontend/e2e/helpers/playground.ts`
- Modify: `frontend/e2e/playground.spec.ts` (if assertions reference "Running simulation")

- [ ] **Step 1: Update wait helper**

In `waitPlaygroundReady`, replace wait for `"Running simulation..."` with:

```typescript
  await page.getByTestId("playground-recreating-banner").waitFor({ state: "hidden", timeout: 45_000 }).catch(() => {});
```

Keep `"Step →"` visible wait.

- [ ] **Step 2: Run default E2E suite**

Run: `cd frontend && pnpm test:e2e`
Expected: pass (fix any broken selectors)

- [ ] **Step 3: Commit**

```bash
git add frontend/e2e/helpers/playground.ts
git commit -m "test: align e2e waits with recreating banner instead of global loading"
```

---

### Task 12: Fill baseline doc and update coverage notes

**Files:**
- Modify: `docs/PERF_BASELINE.md` (fill measurements)
- Modify: `docs/E2E_TEST_COVERAGE.md` (add Performance smoke section)

- [ ] **Step 1: Run production baseline**

```bash
cd frontend && pnpm perf:baseline
# follow instructions, fill "after optimization" table
```

- [ ] **Step 2: Document new tests in E2E coverage**

Add section:

```markdown
## Performance smoke (`e2e/performance.spec.ts`)

| Test | SLA |
|------|-----|
| API UCB1 step | &lt; 800 ms |
| Nav → Glossary | &lt; 500 ms |
| Step button disabled | &lt; 100 ms |
| Playground step UI | &lt; 2000 ms |
```

- [ ] **Step 3: Commit**

```bash
git add docs/PERF_BASELINE.md docs/E2E_TEST_COVERAGE.md
git commit -m "docs: record performance baseline and e2e perf smoke coverage"
```

---

## Self-Review

### Spec coverage

| Suggestion from perf discussion | Task |
|----------------------------------|------|
| Measure before optimizing | Task 1, 12 |
| Thresholds documented | Task 1 |
| Split loading (step vs recreate) | Task 2, 3, 8, 11 |
| Instant click feedback | Task 3, 10 |
| Narrow Zustand / chart isolation | Task 5, 6 |
| Throttle charts during play | Task 4, 5 |
| Nav prefetch | Task 7 |
| Compare parity | Task 8 |
| Backend step profiling | Task 9 |
| Playwright perf guards | Task 10 |
| Production build emphasis | Task 1, 12 |

**Deferred (YAGNI):** Full optimistic `t+1` before API (risky for educational accuracy); Lighthouse CI job (optional after baseline); full React Profiler automation.

### Placeholder scan

No TBD steps. All code blocks are complete starter implementations.

### Type consistency

- `isStepping` / `isRecreating` used consistently across store, ControlBar, PlaybackControls, Compare, E2E.
- `PlaygroundCharts` receives `SimState` + `ScenarioInfo | null` matching existing chart props.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-27-perceived-performance.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — Fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**

---

## QA/QC Review — Fullstack Engineering Feedback

> Review date: 2026-05-27
> Reviewer stance: I agree with the direction, but I would correct several implementation details and add a few safeguards before execution.

### Overall Verdict

I agree with the core strategy:

- measure first in production mode
- split step latency from recreate latency
- give immediate click feedback
- reduce unnecessary chart work during auto-play
- add lightweight performance regression guards

The plan is directionally sound, but a few parts are stale against the current codebase and a few test snippets will fail as written. I would execute the plan only after applying the corrections below.

### What Is Already Partially Done

The current frontend already contains some of the selector hardening that the plan lists as future work:

| Item | Current state | Action |
|------|---------------|--------|
| Playground chart test IDs | `chart-context`, `chart-regret`, `chart-rewards`, `chart-pulls` already exist in `frontend/src/app/playground/page.tsx` | Do not duplicate; preserve them when extracting `PlaygroundCharts` |
| Playground step counter test ID | `data-testid="playground-step-counter"` already exists in `ControlBar.tsx` | Use it in perf/E2E tests |
| Compare step counters | `compare-steps-a` / `compare-steps-b` already exist | Update plan wording from `compare-counter-*` to current names, or rename consistently |
| Slow E2E script | `frontend/package.json` already has `test:e2e:slow` | Task 10/12 should not add this again |
| E2E visual expansion | visual suite already includes compare and populated results screenshots | Avoid treating those as missing |

### Corrections Required Before Execution

#### 1. Backend performance test uses the wrong create status

Task 9 expects:

```python
assert create.status_code == 200
```

The backend route is `POST /api/simulate` with `status_code=201`, so the test should assert:

```python
assert create.status_code == 201
```

Also ensure the JSON body matches `CreateSimRequest`. The existing tests usually include `arms`, `algorithm`, `hyperparams`, `seed`, and `scenario_id`. Use the same shape to avoid false failures:

```python
json={
    "arms": None,
    "algorithm": "ucb1",
    "hyperparams": {},
    "seed": 1,
    "scenario_id": "notification_channels",
}
```

#### 2. Add a pytest marker before using `@pytest.mark.performance`

Task 9 introduces:

```python
@pytest.mark.performance
```

`backend/pyproject.toml` does not currently define a `performance` marker. Add it to pytest config or remove the marker. Recommended:

```toml
[tool.pytest.ini_options]
markers = [
  "performance: latency guard tests with generous local/CI thresholds",
]
```

#### 3. Store test snippets conflict with the current mock helper shape

Task 2 suggests replacing `mockStepResponse` with a function, but the existing `simulation.test.ts` currently defines `mockStepResponse` as an object. Rename the new helper to avoid collisions:

```typescript
const mockStepResponseAt = (t: number) => ({ ... });
```

Then update only the new loading-flag tests to use `mockStepResponseAt(1)`.

#### 4. `PlaybackControls` test should assert `aria-busy` as a string

The plan is correct to add `aria-busy`, but the implementation should render:

```tsx
aria-busy={isStepping ? "true" : "false"}
```

This avoids ambiguity in DOM assertions and makes the idle state explicit.

#### 5. `ControlBar` should disable reset and algorithm changes during recreate

The plan wires `isRecreating` to `ScenarioPicker`, but algorithm/reset actions can still be clicked while recreate is in flight unless explicitly disabled.

Add this behavior:

- disable reset while `isRecreating`
- either disable `AlgorithmSelector` while `isRecreating` or guard `onReset`
- keep seed input editable; seed applies on next reset

If `AlgorithmSelector` does not support `disabled`, add the prop and test it.

#### 6. Compare page needs both `isStepping` and `isRecreating` guards

Task 8 should also prevent algorithm switching during dual-step or recreate. Otherwise rapid clicks can create overlapping simulation pairs.

Recommended behavior:

- `handleStep` returns early when `isStepping || isRecreating`
- `handleAlgoChange` returns early when `isStepping || isRecreating`
- reset button is disabled during `isStepping || isRecreating`
- play/pause is disabled during recreate
- on step failure, `isRunning` should become false

#### 7. Header prefetch should skip the active route and handle unsupported router mocks

In production, prefetching the current route is wasted work. In tests, router mocks may omit `prefetch`.

Recommended implementation:

```typescript
const prefetchRoute = (path: string) => {
  if (path !== pathname) router.prefetch?.(path);
};
```

Test both hover and focus, and assert the active route is not prefetched.

#### 8. `measureNavActiveMs` is not measuring active state reliably

Task 10 waits for the same button to be visible after click. That does not prove the route became active or content became usable.

Use route-specific content waits instead:

```typescript
export async function measureRouteReadyMs(page: Page, label: string, readyText: string | RegExp) {
  const t0 = performance.now();
  await page.locator("header").getByRole("button", { name: label, exact: true }).click();
  await page.getByText(readyText).first().waitFor({ timeout: 10_000 });
  return performance.now() - t0;
}
```

For Glossary, wait for the `Glossary` heading or search input.

#### 9. The "step button disables within 100 ms" E2E may be flaky

If the API returns very quickly, the button may disable and re-enable before Playwright observes it. Prefer one of these:

- intercept `/api/simulate/*/step` and delay the response by 250 ms, then assert disabled state
- assert a local `data-testid="playback-step-button"` receives `aria-busy="true"` immediately during the delayed response

This makes the test deterministic.

#### 10. Chart throttling should be measured before and after

Task 4/5 introduces throttling, but the baseline should include a React/browser profile that demonstrates chart rendering is actually the bottleneck. Otherwise throttling may add complexity without visible benefit.

Gate Task 4/5 behind this condition:

- only implement throttling if production profiling shows chart repaint/render work contributes materially during auto-play
- if API latency dominates, prioritize immediate feedback and backend/API timing instead

#### 11. `useThrottledValue` should not throttle by object identity unless that is intentional

Passing a full `SimState` object to `useThrottledValue` works, but it can be hard to reason about and may hold stale non-chart fields. Prefer throttling chart-specific slices:

```typescript
const throttledHistory = useThrottledValue(display.history, { intervalMs: 250, active: isRunning });
const throttledRegret = useThrottledValue(display.regretHistory, { intervalMs: 250, active: isRunning });
const throttledArmStates = useThrottledValue(display.armStates, { intervalMs: 250, active: isRunning });
```

Then pass those to `PlaygroundCharts`. This keeps non-chart display state live and makes intent clearer.

#### 12. Avoid a hard backend latency assertion until baseline is known

The proposed backend p95 threshold of 500 ms is generous locally, but it may be noisy in shared CI. First commit the baseline doc and perf script, then either:

- make the threshold configurable via `STEP_P95_BUDGET_MS`, defaulting to 800 or 1000 ms, or
- mark the test as optional and run it in a performance lane only

Recommended assertion:

```python
budget_ms = float(os.getenv("STEP_P95_BUDGET_MS", "800"))
assert p95 < budget_ms
```

### Additional Findings And Actions

#### A. Add instrumentation before optimization

The plan mentions measuring, but the app would benefit from small browser marks around high-risk flows.

Recommended actions:

- In Playground, mark step start/end with `performance.mark("playground-step-start")` and `performance.mark("playground-step-end")`.
- In Compare, mark dual-step start/end.
- In scenario/algorithm recreate, mark recreate start/end.
- Keep marks development-safe and low overhead.

This helps Playwright perf tests measure app-level timings instead of guessing from DOM readiness.

#### B. Add an in-flight request guard to the store

Splitting flags improves UX, but it does not automatically prevent overlapping `step()` calls from rapid clicks or auto-play overlap.

Recommended store behavior:

- if `isStepping` is true, `step()` returns immediately
- if `isRecreating` is true, `step()` returns immediately
- `play()` should not start while recreating

Add unit tests for all three.

#### C. Preserve current state on step failure

On `step` failure, the store should keep the existing `simState` and stop auto-play. The plan already stops running; add an explicit test:

- initialize with `t=1`
- make `api.step` reject
- assert `simState.t` remains `1`
- assert `isRunning` is false
- assert `error` is visible

#### D. Add a production-build verification lane

Perceived performance differs materially between dev and production. Add a documented command sequence, not just manual text:

```bash
cd frontend
pnpm build
pnpm start
```

Then run the perf E2E spec against the production server with `webServer.reuseExistingServer=true`. If adding a script, prefer:

```json
"test:e2e:perf:prod": "playwright test e2e/performance.spec.ts"
```

Document that the user should start `pnpm start` first unless the Playwright config gets a separate production project.

#### E. Add mobile/responsive perceived-performance smoke

The perceived-performance plan focuses desktop interactions. Mobile often has worse perceived responsiveness due to narrower layout and more expensive scroll.

Add one Playwright perf smoke on a mobile project:

- open `/playground`
- click Step
- assert immediate button busy state
- assert `t=1` within budget

This complements the E2E coverage plan.

#### F. Revisit Recharts rendering boundaries after extraction

Extracting `PlaygroundCharts` is helpful, but memoization only helps if props are stable. Passing a new `display` object every render defeats much of the value.

Recommended component API:

```typescript
interface PlaygroundChartsProps {
  arms: Arm[];
  armStates: ArmState[];
  history: StepRecord[];
  regretHistory: number[];
  featureNames: string[];
  featureLabels: string[];
  featureMins: number[];
  featureMaxs: number[];
  historyWindow: number;
  totalSteps: number;
  driftStep?: number;
  driftEndStep?: number;
}
```

This makes prop changes explicit and reduces accidental re-renders.

### Revised Priority Order

I would adjust the execution order:

1. **Correct and complete Task 1 first**: baseline doc, script, production measurement method.
2. **Split loading flags and add in-flight guards**: Tasks 2, 3, plus additional guard tests.
3. **Compare parity**: Task 8 should happen before chart throttling because it fixes an actual UX inconsistency.
4. **Header prefetch**: Task 7 is low-risk and high-value for tab switching.
5. **Playwright perf smoke with deterministic delayed step**: Task 10, corrected for reliable measurements.
6. **Backend perf guard**: Task 9, after fixing status code, marker, request body, and configurable budget.
7. **Only then extract/throttle charts**: Tasks 4-6, gated by evidence from production profiling.
8. **Update docs and E2E helpers**: Tasks 11-12.

### Concrete Additions To The Checklist

Add these tasks before execution:

- [ ] Add store guard tests for overlapping `step()`, `step()` during recreate, and `play()` during recreate.
- [ ] Add failure preservation test: step error keeps current `simState` and stops autoplay.
- [ ] Add disabled-state behavior to reset/algorithm controls during recreate.
- [ ] Make performance test budgets configurable through environment variables.
- [ ] Add deterministic API delay in the Playwright "step button disables immediately" test.
- [ ] Update Task 9 backend create assertion from 200 to 201 and define the `performance` pytest marker.
- [ ] Replace `compare-counter-a/b` references with existing `compare-steps-a/b`, or rename code and tests consistently.
- [ ] Gate chart throttling behind production profiling evidence.

### Final Recommendation

Proceed with the plan, but do not execute it as written. The best first implementation slice is:

1. baseline docs/script,
2. `isStepping` / `isRecreating` split with in-flight guards,
3. immediate button feedback,
4. compare parity,
5. corrected perf smoke tests.

Leave chart throttling and deeper memoization until measurements prove that Recharts repainting is a meaningful contributor to perceived slowness.
