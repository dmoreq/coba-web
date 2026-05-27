# E2E Test Improvement Plan

> Date: 2026-05-27
> Source report: [`E2E_TEST_COVERAGE.md`](./E2E_TEST_COVERAGE.md)
> Goal: strengthen browser-level confidence without making E2E broad, slow, or flaky.

## Summary

The current Playwright suite is already strong for happy-path coverage:

- **71 discovered** / **70 default (PR)** tests across **12 files**
- all 16 algorithms smoke-tested (UI display labels from `fixtures/algorithms.ts`)
- all 5 scenarios smoke-tested
- core pages covered
- API contract coverage exists
- 5 visual regression baselines exist

The next improvement should be selective. Do not expand E2E just to increase counts. Add tests only where browser behavior, full-stack integration, visual layout, or real user journeys matter.

Target after this plan:

| Metric | Current (verified) | Target |
|--------|-------------------:|-------:|
| Playwright tests (default) | **70** | **82–86** |
| Playwright tests (`--list`) | **71** | **83–88** |
| E2E files | 12 | 14–16 |
| Visual baselines | 5 | 8–10 |
| Viewports | Desktop only | Desktop + mobile smoke |
| Slow drift tests | 1 skipped (`E2E_SLOW`) | ✅ `e2e-slow.yml` + `test:e2e:slow` |
| CI mobile lane | **Implemented** (`mobile` project) | 4 mobile smokes |

## Phase 0: Prerequisites (before Phase 1)

These are **blocking** for reliable execution of later phases:

| Step | Task | Why |
|------|------|-----|
| 0.1 | Add `test:e2e:slow` to `frontend/package.json` | Drift command exists only in docs today |
| 0.2 | Add `data-testid` on scenario picker + compare Steps (see table below) | Removes `.absolute` / `.tabular-nums` |
| 0.3 | Fix `ScenarioShowcase` failure UX (Action B1 in coverage report) | Phase 3 scenario-failure test is blocked without it |
| 0.4 | Document **70 vs 71** in CI/README | Prevents false “missing test” investigations |

## Phase 1: Stabilize Selectors And Waits

Purpose: reduce flakiness before adding more tests.

Add stable `data-testid` selectors for controls currently reached through brittle CSS/text selectors (most are **net-new**; E2E already uses `playground-seed-input`, `scenario-drift-badge`, `segment-chart`):

- `scenario-picker-trigger`
- `scenario-picker-menu`
- `compare-counter-a`
- `compare-counter-b`
- `chart-regret`
- `chart-rewards`
- `chart-pulls`
- `chart-context`
- `results-summary`

Update E2E helpers:

- `frontend/e2e/helpers/playground.ts`
- `frontend/e2e/helpers/compare.ts`

Expected changes:

- Replace `.absolute` scenario picker lookup.
- Replace `.tabular-nums` compare counter lookup.
- Prefer role/test-id selectors for chart panels.
- Replace fixed waits with UI-state or response waits where practical.

Acceptance criteria:

- `pnpm exec playwright test --list` still reports all tests.
- Existing navigation, playground, and compare specs pass.
- Helpers no longer rely on `.absolute` or `.tabular-nums`.

Verification:

```bash
cd frontend
pnpm exec playwright test --list
pnpm exec playwright test e2e/navigation.spec.ts e2e/playground.spec.ts e2e/compare.spec.ts
```

## Phase 2: Add Mobile Smoke Coverage

Purpose: catch responsive layout and mobile navigation regressions.

Implementation:

- Add a mobile Playwright project in `frontend/playwright.config.ts`.
- Use a common preset such as `Pixel 5`.
- Add `frontend/e2e/mobile.spec.ts`.

Tests to add:

| Test | Steps | Assertions |
|------|-------|------------|
| Mobile landing CTA | Open `/`, click Open Playground | URL is `/playground`; Step button visible |
| Mobile route navigation | Visit all main routes | Primary content visible |
| Mobile playground step | Open `/playground`, step once | `t=1` visible |
| Mobile settings smoke | Open `/settings`, choose LinUCB | alpha slider appears |

Acceptance criteria:

- 4 mobile tests added.
- Tests run under the mobile project.
- Tests assert user-visible behavior, not pixel-perfect layout.

Verification:

```bash
cd frontend
pnpm exec playwright test e2e/mobile.spec.ts
```

## Phase 3: Add API Failure UX Coverage

Purpose: verify frontend recovery behavior when backend calls fail.

Implementation:

- Add `frontend/e2e/failure-states.spec.ts`.
- Use `page.route()` to mock browser-visible API failures.
- Keep backend validation edge cases in backend tests unless the frontend displays a specific error state.

Tests to add:

| Test | Interception | Expected behavior |
|------|--------------|-------------------|
| Playground create failure | fail `POST /api/simulate` | visible error or retry affordance |
| Playground step failure | create succeeds, step fails | visible error and app remains usable |
| Scenario list failure | fail `GET /api/scenarios` | fallback/error state visible |
| Results missing data | no active simulation or failed fetch | actionable empty state visible |

Acceptance criteria:

- 3-4 tests added.
- Each test asserts user-visible behavior.
- If the current UI has no clear error affordance, add the smallest clear error state before asserting it.

Verification:

```bash
cd frontend
pnpm exec playwright test e2e/failure-states.spec.ts
```

## Phase 4: Expand Visual Regression Coverage

Purpose: protect interactive and responsive visual states not covered by unit tests.

Implementation:

- Extend `frontend/e2e/visual-regression.spec.ts`.
- Add baselines under `frontend/e2e/__screenshots__/`.
- Prefer state-specific screenshots over duplicating page screenshots.

Screenshots to add:

| Screenshot | Setup |
|------------|-------|
| Mobile playground after one step | mobile project, `/playground`, one step |
| Scenario picker open | `/playground`, open picker |
| Glossary filtered state | `/glossary`, search `UCB` |
| Playground truth revealed | `/playground`, step, reveal truth |
| Compare truth revealed | `/compare`, step, reveal truth |

Acceptance criteria:

- 3-5 visual tests added.
- Screenshots wait for stable UI state.
- Existing screenshot tolerance remains `maxDiffPixels: 150` unless a specific baseline is noisy.

Verification:

```bash
cd frontend
pnpm exec playwright test e2e/visual-regression.spec.ts
```

## Phase 5: Make Drift Coverage Operational

Purpose: ensure non-stationary behavior is tested without slowing every PR.

Preferred implementation:

- Keep the 205-step drift test skipped by default.
- Add a scheduled CI or release-check command with `E2E_SLOW=1`.

Optional faster implementation:

- Add a backend-supported short-drift test scenario if feasible.
- Run one default E2E test where drift appears within 5-10 steps.

Acceptance criteria:

- There is an explicit command for slow drift E2E.
- Default PR E2E remains fast enough.
- Drift is covered in scheduled CI, release checks, or a shortened deterministic test.

Verification:

```bash
cd frontend
E2E_SLOW=1 pnpm exec playwright test e2e/playground.spec.ts --grep "drift annotations"
```

Optional package script:

```json
{
  "test:e2e:slow": "E2E_SLOW=1 playwright test e2e/playground.spec.ts --grep \"drift annotations\""
}
```

## Phase 6: Add Keyboard And Accessibility Smoke Tests

Purpose: cover basic keyboard usability without adding a full accessibility audit tool yet.

Implementation:

- Add `frontend/e2e/accessibility.spec.ts`.
- Use focus, role, keyboard, and visible text assertions.

Tests to add:

| Test | Steps | Assertions |
|------|-------|------------|
| Header keyboard navigation | Tab through header | Primary nav entries receive focus |
| Glossary keyboard flow | Focus search, type, open result | Result detail opens without mouse |
| Scenario picker keyboard flow | Focus picker, Enter, Escape | Menu opens and closes |

Acceptance criteria:

- 2-3 tests added.
- No new accessibility dependency is required in this phase.
- Tests focus on critical keyboard paths only.

Verification:

```bash
cd frontend
pnpm exec playwright test e2e/accessibility.spec.ts
```

## Recommended Order

1. Stabilize selectors and waits.
2. Add mobile smoke tests.
3. Add API failure UX tests.
4. Expand visual regression states.
5. Make drift coverage operational.
6. Add keyboard/accessibility smoke tests.

This order minimizes flaky test growth and closes the most important browser-level gaps first.

## CI Plan

Use three lanes:

| Lane | Command | Purpose | Status |
|------|---------|---------|--------|
| PR unit | `pnpm test:run` | fast frontend logic checks | ✅ In `ci.yml` |
| PR E2E | `pnpm test:e2e` | **70** desktop tests (drift skipped) | ✅ In `ci.yml` |
| PR E2E mobile | `pnpm exec playwright test e2e/mobile.spec.ts --project=mobile` | mobile smoke | ❌ Not implemented |
| Scheduled slow E2E | `E2E_SLOW=1 pnpm exec playwright test e2e/playground.spec.ts --grep "drift annotations"` | long drift protection | ❌ Not implemented |

If screenshots become noisy, split visual tests into a stable CI lane or release-check lane.

**Note:** The PR E2E row is **desktop-only today**. Do not claim “mobile smoke in CI” until Phase 2 lands.

## Non-Goals

- Do not add E2E tests for every backend validation branch.
- Do not expand the algorithm matrix beyond one smoke pass per algorithm unless a bug demands it.
- Do not assert chart SVG geometry in Playwright.
- Do not make the 205-step drift test mandatory for every local PR run.
- Do not add broad accessibility tooling until keyboard smoke tests prove useful.

## Definition Of Done

The plan is complete when:

- Playwright lists about **83-88 tests**.
- Mobile smoke tests exist and pass.
- At least three failure-state workflows are covered.
- Visual baselines include at least one mobile or interactive-open state.
- Drift E2E has a documented slow command or scheduled run.
- E2E remains reliable enough for PR use.

---

## QA Verification — Discrepancies and Corrections

> Verified against actual `pnpm exec playwright test --list` output and codebase inspection on 2026-05-27.

### Discrepancies

| Claim | Reported | Actual | Correction |
|-------|----------|--------|------------|
| Current test count | 71 | **70 default, 71 with `E2E_SLOW=1`** | The plan's summary table should say "71 discovered (70 default + 1 opt-in slow)." Playwright `--list` discovers all tests including skipped ones. |
| `data-testid` scope | “9 new attributes” | Many testids exist in source; **E2E uses 3** | Phase 1: reuse `scenario-info-*`, `segment-chart`, etc.; add picker/compare/chart ids only where needed. |

### Corrections and additions

#### 1. Phase 1: Add `data-testid` to source components (prerequisite)

Before updating helpers to use `data-testid`, the attributes must exist in the DOM.

**Correction:** The app already exposes testids used by unit tests (`scenario-drift-badge`, `segment-chart`, `scenario-info-bar`, estimate tracks, etc.). E2E only consumes **three** today. Phase 1 should **wire existing testids first**, then add missing ones:

| data-testid | Component | File | E2E today |
|-------------|-----------|------|:---------:|
| `scenario-picker-trigger` | dropdown button | `components/playground/ScenarioPicker.tsx` | ❌ add |
| `scenario-picker-menu` | dropdown panel | `components/playground/ScenarioPicker.tsx` | ❌ add |
| `compare-steps-a` | Steps stat (side A) | `app/compare/page.tsx` | ❌ add (prefer over generic `compare-counter-a`) |
| `compare-steps-b` | Steps stat (side B) | `app/compare/page.tsx` | ❌ add |
| `chart-regret` / `chart-rewards` / `chart-pulls` | chart panels | `app/playground/page.tsx` | ❌ add |
| `results-summary` | stat cards region | `app/results/page.tsx` | ❌ add |
| `scenario-drift-badge` | drift chip | `ScenarioInfoBar.tsx` | ✅ `scenarios.spec.ts` |
| `playground-seed-input` | seed field | `ControlBar.tsx` | ✅ `playground.spec.ts` |

Estimated effort: ~30 minutes source + helper updates (not 15 minutes if all nine are new).

#### 2. Phase 1: `expectCompareSteps` has a latent flaky assertion

**File:** `frontend/e2e/helpers/compare.ts:36`

```typescript
await expect(
  page.locator(".tabular-nums").filter({ hasText: new RegExp(`^${value}$`) }).first(),
).toBeVisible({ timeout: 8_000 });
```

The regex `new RegExp("^2$")` matches any `.tabular-nums` element whose text is exactly `"2"`. If compare ever displays multiple stat cards (Steps, Cum. Regret, Avg Reward) and two happen to share the same value, `.first()` might grab the wrong one. Low-risk today, but fragile by design. Adding a specific `data-testid` like `compare-steps-side-a` or `compare-steps-side-b` eliminates this ambiguity.

#### 3. Hardcoded backend URL — source of truth risk

**File:** `frontend/e2e/helpers/api.ts:3`

```typescript
const API = "http://localhost:8000";
```

The same hardcoded URL appears in `frontend/src/lib/api.ts:29` for production API calls. If the backend port changes:

- `webServer` in `playwright.config.ts` starts on the new port
- `helpers/api.ts` still points to `localhost:8000`
- API contract tests silently break

**Recommendation:** Add to the plan: extract backend URL to an env var (`API_BASE_URL` or `BACKEND_URL`, defaulting to `http://localhost:8000`) shared between `helpers/api.ts` and `src/lib/api.ts`. Not urgent, but worth scheduling.

#### 4. Phase 2: Mobile project config is not specified

The plan says "Add a mobile Playwright project" but doesn't specify what that looks like in `playwright.config.ts`. Example config to add:

```typescript
// In playwright.config.ts projects array:
{
  name: "mobile",
  use: { ...devices["Pixel 5"] },
},
```

The current config has no `projects` array at all — all tests run in a single implicit desktop project. Adding projects means splitting tests: desktop-only tests stay in the default project, mobile tests run in the mobile project. The plan should note that the existing 70 tests won't automatically run on mobile — you only add the 4 mobile-specific tests to the mobile project.

#### 5. Phase 3: Current UI may not have error affordances for failure-state tests

The plan says "If the current UI has no clear error affordance, add the smallest clear error state before asserting it." This is a good principle, but needs concrete context:

- **Playground** (`app/playground/page.tsx`): Already has an error banner (`{error && <div>...}`). ✅ Can assert immediately.
- **Compare** (`app/compare/page.tsx`): Already has an error banner. ✅ Can assert.
- **Results** (`app/results/page.tsx`): Already has empty state for `t === 0`. The "results missing simulation" test can assert this existing empty state. ✅
- **Landing / ScenarioPicker**: The landing page's `ScenarioShowcase` fetches scenarios from API. If `GET /api/scenarios` fails, does the landing page show a fallback state? The plan should verify before writing "Scenario list failure" test — if there's no fallback UI, the test would need the UI to be added first.

**Recommended:** Before Phase 3, audit `ScenarioShowcase.tsx` for error/empty/fallback states. If none exist, add them before writing the E2E test.

#### 6. The plan correctly identifies the right number of tests but scope-order is subtly wrong

The plan targets "83-88 tests" (12-17 new). The correct breakdown accounting for the 70 default base:

| Phase | New tests | Running total |
|-------|----------:|--------------:|
| Current default | — | **70** |
| Mobile smoke | 4 | 74 |
| Failure states | 3–4 | 77–78 |
| Visual expansion | 3–5 | 80–83 |
| Keyboard/accessibility smoke | 2–3 | 82–86 |
| + Slow drift (opt-in) | 1 | 83–87 (with `E2E_SLOW=1`) |

The range of 83-88 is reachable **only if** the full visual expansion (5 tests) and full failure-state suite (4 tests) are implemented. Conservative estimate: 82. The plan's "83-88" is optimistic but within reach.

### What the plan gets right

- **Phase ordering is correct.** Stabilize → mobile → failure → visual → drift → a11y. Fixing flaky selectors before adding more tests prevents compounding brittleness.
- **Non-goals are well-scoped.** No chart SVG assertions, no algorithm matrix expansion, no mandatory slow drift.
- **CI three-lane strategy is practical.** Unit (fast), E2E PR (desktop + mobile smoke), scheduled slow (drift). This keeps PR feedback fast while protecting drift behavior.
- **Making scenarios/test fixtures the single source of truth is good.** Current `fixtures/algorithms.ts` and `fixtures/scenarios.ts` export arrays that both E2E specs and helpers consume. The plan doesn't break this pattern.
- **Avoiding axe/npm dependency for accessibility is smart.** Keyboard smoke tests catch 80% of real a11y issues without adding a toolchain dependency that needs maintenance and config per-release.

---

## Senior QC Review — Second Pass (2026-05-27)

> Cross-checked against [`E2E_TEST_COVERAGE.md`](./E2E_TEST_COVERAGE.md) second-pass findings and a full `pnpm test:e2e` run.

### Agreement with this plan

| Phase | QC opinion |
|-------|------------|
| **0 Prerequisites** | ✅ Added in this revision — required before claiming Phase 3 done |
| **1 Stabilize selectors** | ✅ Highest ROI; do before adding 12+ tests |
| **2 Mobile** | ✅ Correct gap; config must use `projects: [{ name: "mobile", use: devices["Pixel 5"] }]` |
| **3 Failure UX** | ✅ Valid **after** landing scenario error UI (B1) |
| **4 Visual expansion** | ✅ Do after selectors stable |
| **5 Drift operationalization** | ✅ Agree; add package script + CI job |
| **6 Keyboard smoke** | ✅ Low cost; defer until Phases 1–3 green |

### Corrections applied to this document

1. **70 vs 71** — summary and CI table now distinguish default PR count from `--list` count.
2. **P0/P1 algorithms** — removed; no such split exists in `algorithms.spec.ts`.
3. **data-testid** — not “only one in the app”; clarified existing vs missing vs E2E-used.
4. **CI mobile** — marked **not implemented** until Phase 2 ships.

### Additional plan tasks (QC additions)

| ID | Phase | Task |
|----|-------|------|
| P1-α | 1 | In `stepTimes`, optionally `waitForResponse` on `POST .../step` with 30s timeout (reduces algorithm flake) |
| P1-β | 1 | Rename `compare.spec.ts` test `"reset returns to t=0"` → `"reset returns Steps to 0"` |
| P3-α | 3 | **Do not** write scenario-list failure E2E until `ScenarioShowcase` shows error/empty copy (currently console-only) |
| P3-β | 3 | Playground/Compare failure tests can proceed immediately — error banner exists |
| P5-α | 5 | Add to `package.json`: `"test:e2e:slow": "E2E_SLOW=1 playwright test e2e/playground.spec.ts --grep \"drift annotations\""` |
| P5-β | 5 | Add `.github/workflows/e2e-slow.yml` (weekly + `workflow_dispatch`) |
| P6-α | 6 | Reuse `scenario-info-toggle` / `scenario-recommended-chips` for A09 coverage without new UI |

### Definition of Done — QC adjustments

The plan is **complete** when:

- Playwright default run lists **82–86 passing** tests (not only `--list` count).
- `pnpm test:e2e` on CI stays ≤ ~3 minutes or visual job is split.
- **B1** (landing scenario failure UI) is shipped **or** Phase 3 scope excludes landing scenario failure.
- Flaky algorithm smokes: **≤1 flaky** per full run over 3 consecutive CI builds (after P1-α).

### QC sign-off

**Conditionally approve** execution of this plan. **Do not** start Phase 3 scenario-failure tests before B1. **Do** start Phase 1 and package-script work immediately — they reduce flake on the existing **70** tests without increasing PR time materially.
