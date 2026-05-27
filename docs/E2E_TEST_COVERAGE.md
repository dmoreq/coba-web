# E2E Test Coverage Report

> Date: 2026-05-27
> Scope: `frontend/e2e`, Playwright configuration, frontend route coverage, backend API integration coverage, and visual regression coverage.

## Executive Summary

The frontend E2E suite is now broad and materially stronger than a smoke-only suite.

| Mode | Count | Command |
|------|------:|---------|
| **Default CI / PR** | **85** | `pnpm test:e2e` (chromium + mobile projects; 1 drift skipped) |
| **Discovered (`--list`)** | **86** | Includes opt-in slow drift test |
| **Slow / weekly** | **71** | `pnpm test:e2e:slow` (205-step drift only) |

Playwright discovers **86 tests across 15 files** (see [E2E inventory](#e2e-tests-71) — table updated below).

Current E2E inventory:

| Area | Test files | Tests |
|------|-----------:|------:|
| Algorithm smoke | 1 | 16 |
| API contract | 1 | 10 |
| Compare page | 1 | 4 |
| Cross-page journeys | 1 | 2 |
| Glossary page | 1 | 2 |
| Landing page | 1 | 3 |
| Navigation | 1 | 8 |
| Playground page | 1 | 8 discovered, 1 skipped unless `E2E_SLOW=1` |
| Results page | 1 | 2 |
| Scenario picker | 1 | 8 |
| Settings page | 1 | 3 |
| Failure states | 1 | 4 |
| Mobile smoke | 1 | 4 |
| Accessibility | 1 | 3 |
| Visual regression | 1 | 9 |
| **Total** | **15** | **86 discovered (85 default)** |

Overall assessment: E2E coverage is strong for happy paths, API contracts, mobile smoke, failure UX, keyboard basics, and visual layouts. Remaining gaps: scheduled drift in default PR (weekly job added), deeper numeric correctness, and broader a11y auditing.

## Current E2E Setup

Configuration lives in `frontend/playwright.config.ts`.

Important settings:

- test directory: `frontend/e2e`
- timeout: `60_000`
- retries: `2` on CI, `1` locally
- CI workers: `1`
- reporters: `list` and `html`
- base URL: `http://localhost:3000`
- visual snapshot path: `e2e/__screenshots__/{testFilePath}/{arg}{ext}`
- screenshot diff tolerance: `maxDiffPixels: 150`
- web servers:
  - backend: `COBA_ALLOW_SIMULATION_PURGE=1 uv run uvicorn coba_server:app --port 8000`
  - frontend: `pnpm dev`
- global setup/teardown: `POST /api/simulate/purge` clears leaked simulations before/after runs (requires `COBA_ALLOW_SIMULATION_PURGE=1` on the backend)

Verification command:

```bash
cd frontend
pnpm exec playwright test --list
```

Observed result:

```text
Total: 71 tests in 12 files
```

Full run command:

```bash
cd frontend
pnpm test:e2e
```

Slow drift coverage:

```bash
cd frontend
E2E_SLOW=1 pnpm exec playwright test e2e/playground.spec.ts
```

## Coverage By User Surface

### Landing

Covered by:

- `landing.spec.ts`
- `navigation.spec.ts`
- `visual-regression.spec.ts`

Covered behavior:

- hero CTA opens playground
- scenario showcase loads all five scenarios from API-backed UI
- algorithm strip renders key algorithms
- landing route renders primary content
- landing screenshot baseline

Assessment: good smoke and visual coverage. Missing deeper assertions around all landing links, responsive layout, and API failure/fallback states.

### Navigation And App Shell

Covered by:

- `navigation.spec.ts`
- `cross-page.spec.ts`

Covered behavior:

- header links reach Playground, Compare, Settings, Results, and Glossary
- every primary route renders expected content
- no hydration errors across tabs
- scenario selection can persist after navigating away and back

Assessment: strong route-level coverage. Missing direct mobile/header responsive navigation coverage and browser back/forward behavior.

### Playground

Covered by:

- `playground.spec.ts`
- `algorithms.spec.ts`
- `scenarios.spec.ts`
- `cross-page.spec.ts`
- `visual-regression.spec.ts`

Covered behavior:

- all 16 algorithms run 3 steps without error
- step, reset, play/pause, seed input, truth toggle, and Why panel
- three chart panels populate after steps
- context scatter appears for a two-feature contextual scenario
- scenario picker switches all five scenarios and resets to `t=0`
- content drift badge appears for Content Format
- News Feed environment panel appears after steps
- Ad Creative Selection segment chart appears after steps
- playground screenshot after 20 steps

Assessment: very strong user-journey coverage. The main gap is long-running non-stationary behavior: the drift annotation test exists but is skipped unless `E2E_SLOW=1`.

### Compare

Covered by:

- `compare.spec.ts`
- `cross-page.spec.ts`
- `visual-regression.spec.ts`

Covered behavior:

- Compare page loads Algorithm A/B sections
- switching Algorithm B recreates simulations and can step
- dual regret comparison chart appears after steps
- ground truth toggle works
- reset returns Steps counter to `0` (test title says `t=0` but Compare UI uses **Steps**, not `t=N`)
- compare screenshot after two steps

Assessment: good coverage of the core compare workflow. Missing algorithm-matrix coverage on Compare, failure-state coverage if one simulation create/step fails, and scenario switching inside Compare if supported by the UI.

### Settings

Covered by:

- `settings.spec.ts`
- `cross-page.spec.ts`
- `navigation.spec.ts`
- `visual-regression.spec.ts`

Covered behavior:

- settings route renders
- applying Thompson persists to Playground
- LinUCB shows the alpha hyperparameter slider
- add/remove arm behavior
- settings-to-playground-to-results journey
- settings screenshot baseline

Assessment: good coverage for the main settings workflow. Missing coverage for invalid custom arm values, reset/default behavior, seed or hyperparameter persistence edge cases, and multiple algorithm-specific hyperparameter panels.

### Results

Covered by:

- `results.spec.ts`
- `cross-page.spec.ts`
- `navigation.spec.ts`
- `visual-regression.spec.ts`

Covered behavior:

- empty state prompts navigation to Playground
- populated results show stat cards and learned-vs-true table
- results appears after stepping from Playground
- results screenshot baseline

Assessment: good happy-path and empty-state coverage. Missing deeper assertions for numeric correctness, table sorting/filtering if added, and stale/no-current-simulation behavior.

### Glossary

Covered by:

- `glossary.spec.ts`
- `navigation.spec.ts`

Covered behavior:

- search filters terms
- clicking UCB1 expands detail
- empty search shows no-match message
- route renders primary content

Assessment: good coverage for search and expansion. Missing coverage for multiple terms, clearing search, keyboard behavior, and deep-linking if supported.

## API Contract Coverage

Covered by `api-contract.spec.ts`.

Covered behavior:

- `GET /api/health` returns ok
- `GET /api/scenarios` returns five scenarios and drift metadata
- simulation lifecycle: create, step, run, get, delete
- stepping an unknown simulation returns 404
- every scenario can create and step with LinUCB
- `GET /api/algorithms` returns 16 entries

Assessment: strong lightweight contract coverage for frontend/backend integration. It proves the live backend can satisfy core UI workflows.

Missing API/E2E contract cases:

- create simulation with invalid algorithm
- create simulation with invalid scenario
- invalid `run` step counts
- CORS/browser request failure behavior
- API latency or backend unavailable behavior
- delete idempotency or deleted-simulation follow-up behavior

Those are not all mandatory E2E cases. Many belong in backend unit/integration tests. Add E2E cases only where the frontend needs to prove visible behavior.

## Visual Regression Coverage

Covered by `visual-regression.spec.ts`.

Current screenshot baselines:

- landing page hero
- playground after 20 steps
- settings page controls
- compare after two steps
- populated results page

Assessment: visual coverage now protects the most important user-facing layouts. This is a good baseline.

Remaining visual gaps:

- glossary page
- scenario picker open state
- compare or playground with truth revealed
- mobile viewport screenshots
- dark/error/loading states if they become important

Recommended next visual additions:

1. Add a mobile viewport project before adding many more desktop screenshots.
2. Add one screenshot for glossary search results.
3. Add one screenshot for an open scenario picker/dropdown state.

## Quality Of E2E Implementation

Strengths:

- Specs are split by domain instead of one large file.
- Shared helpers reduce repeated wait and navigation logic.
- Fixtures define the algorithm and scenario matrices.
- API contract tests use Playwright request context instead of UI clicks.
- Visual baselines are colocated under `e2e/__screenshots__`.
- The expensive drift test is intentionally opt-in through `E2E_SLOW`.

Risks:

- Some tests use text and CSS selectors that may be brittle, especially `.absolute`, `.tabular-nums`, and symbol-only controls.
- Several tests use fixed waits, especially visual tests and play/pause behavior.
- The suite depends on live backend and frontend dev servers, so failures can mix product bugs with environment/startup issues.
- Visual tests use only one desktop viewport by default.
- There is limited failure-state coverage for API errors and loading states.

Recommended hardening:

- Add stable `data-testid` attributes for fragile controls such as scenario picker dropdown, compare counters, and chart panels.
- Replace fixed waits with response waits or UI-state waits where practical.
- Add a mobile Playwright project once desktop coverage is stable.
- Keep long-running drift tests opt-in locally, but run them on a scheduled CI job if drift is a critical feature.

## Gap Analysis

High-value gaps to address next:

| Priority | Gap | Why it matters | Recommended tests |
|----------|-----|----------------|-------------------|
| High | Mobile/responsive coverage | Current E2E confidence is desktop-first | Add mobile project and run navigation + playground smoke |
| High | API failure UX | Live API success is covered, but user-visible failure recovery is not | Mock failed create/step and assert error banner or recovery UI |
| High | Drift behavior | Drift is product-critical but slow test is skipped by default | Run `E2E_SLOW=1` on scheduled CI or reduce steps through test-only seed/config |
| Medium | Scenario picker open state | Picker is central to exploration, but only selection outcome is covered | Screenshot or interaction test for open dropdown |
| Medium | Compare edge cases | Compare happy path is covered, but mismatch/failure paths are not | One failed create/step mock or reset-after-switch case |
| Medium | Results correctness | Results render, but numeric correctness is lightly asserted | Assert final `t`, regret presence, and learned rate rows after known steps |
| Low | Glossary visual coverage | Search works, but no visual baseline | Add glossary filtered screenshot |
| Low | Accessibility checks | Role-based selectors exist, but no systematic a11y pass | Add targeted keyboard navigation checks for header and glossary |

## Recommended E2E Roadmap

### Phase 1: Stabilize Selectors And Waits

Add or use stable locators for:

- scenario picker trigger and menu
- compare simulation counters
- chart panels
- results stat cards

Replace fixed waits in visual and play/pause tests where practical.

Expected impact: fewer flaky E2E failures.

### Phase 2: Add Mobile Coverage

Add a Playwright mobile project, then run a small subset:

- navigation route coverage
- landing CTA
- playground one-step smoke
- settings route smoke

Expected impact: catches responsive layout regressions that desktop screenshots miss.

### Phase 3: Add Failure-State E2E

Use Playwright route interception for frontend-visible failures:

- create simulation failure on Playground
- step failure after a valid simulation
- scenario list failure on Landing or ScenarioPicker

Expected impact: validates recovery UX instead of only happy paths.

### Phase 4: Make Drift Coverage Operational

Keep the 205-step test opt-in locally, but add one of these:

- scheduled CI run with `E2E_SLOW=1`
- shorter deterministic drift fixture if the backend can support a test scenario

Expected impact: protects non-stationary scenario behavior without slowing every PR.

## Comprehensive Implementation Plan

This plan expands the current suite without turning E2E into the primary place for all edge-case validation. The goal is to improve confidence in full user workflows, browser behavior, and backend/frontend integration while keeping unit tests responsible for most detailed logic.

### Target Outcome

| Metric | Current | Target after plan |
|--------|--------:|------------------:|
| Discovered Playwright tests | 71 | 83-88 |
| E2E files | 12 | 14-16 |
| Default skipped tests | 1 slow drift test | 1 slow drift test |
| Visual baselines | 5 | 8-10 |
| Viewports covered | Desktop only | Desktop + mobile smoke |

Success criteria:

- The default E2E suite remains suitable for PR runs.
- Mobile smoke coverage exists for navigation, landing, playground, and settings.
- At least three user-visible API failure states are covered.
- Visual screenshots include one mobile flow and one interactive dropdown/open-state.
- Long drift behavior is protected by either scheduled CI or a shortened deterministic test path.

### Phase 1: Selector And Wait Stabilization

Purpose: reduce flakiness before adding more tests.

Implementation changes:

- Add stable selectors where current E2E helpers rely on brittle selectors:
  - scenario picker trigger and dropdown menu
  - compare Algorithm A/B counters
  - chart panels: regret, rewards, pull distribution, context space
  - results stat cards
- Update helpers in `frontend/e2e/helpers/playground.ts` and `frontend/e2e/helpers/compare.ts` to prefer `data-testid` and role-based selectors.
- Replace fixed waits where possible:
  - visual tests should wait for known text, response, or chart panel visibility before screenshot.
  - play/pause tests should wait on `t=` changes instead of only sleeping.

Recommended additions:

- `data-testid="scenario-picker-trigger"`
- `data-testid="scenario-picker-menu"`
- `data-testid="compare-counter-a"`
- `data-testid="compare-counter-b"`
- `data-testid="chart-regret"`
- `data-testid="chart-rewards"`
- `data-testid="chart-pulls"`
- `data-testid="chart-context"`
- `data-testid="results-summary"`

Acceptance criteria:

- Existing 71 discovered tests still list successfully.
- Existing E2E helpers no longer depend on `.absolute` or `.tabular-nums`.
- Fixed waits remain only where visual rendering has no better stable signal.

Suggested verification:

```bash
cd frontend
pnpm exec playwright test --list
pnpm exec playwright test e2e/navigation.spec.ts e2e/playground.spec.ts e2e/compare.spec.ts
```

### Phase 2: Mobile Smoke Coverage

Purpose: catch responsive layout and mobile navigation regressions that desktop screenshots cannot see.

Implementation changes:

- Add a Playwright mobile project in `frontend/playwright.config.ts`, using a common device preset such as `Pixel 5` or an equivalent mobile viewport.
- Keep the current desktop project as the default desktop browser profile.
- Add a dedicated spec, recommended name: `frontend/e2e/mobile.spec.ts`.

Recommended tests:

| Test | Steps | Assertions |
|------|-------|------------|
| Mobile landing CTA | visit `/`, click Open Playground | URL becomes `/playground`; Step button is visible |
| Mobile route navigation | visit each main route | primary content is visible without horizontal overflow-critical failures |
| Mobile playground one-step | visit `/playground`, step once | `t=1` appears; chart or feed content remains visible |
| Mobile settings smoke | visit `/settings`, choose LinUCB | alpha slider text appears |

Acceptance criteria:

- Mobile tests run under the mobile Playwright project.
- Tests avoid pixel-perfect assertions.
- Total added tests: 4.
- Mobile failures identify route/layout issues without duplicating every desktop scenario.

Suggested verification:

```bash
cd frontend
pnpm exec playwright test e2e/mobile.spec.ts
```

### Phase 3: API Failure UX Coverage

Purpose: prove the frontend handles backend failures in user-visible workflows.

Implementation changes:

- Add a dedicated spec, recommended name: `frontend/e2e/failure-states.spec.ts`.
- Use `page.route()` for browser-visible API failures. Do not require backend code changes.
- Keep API contract negative tests in `api-contract.spec.ts` only for direct backend behavior.

Recommended tests:

| Test | Route interception | Expected UI behavior |
|------|--------------------|----------------------|
| Playground create failure | fail `POST /api/simulate` on initial load | visible error state or retry/recovery affordance |
| Playground step failure | allow create, fail `POST /api/simulate/:id/step` | error message is visible and app does not crash |
| Scenario list failure | fail `GET /api/scenarios` on landing or scenario picker | fallback copy, disabled picker, or visible failure state |
| Results missing simulation | navigate to `/results` without current sim or after failed fetch | empty state remains actionable |

Acceptance criteria:

- Add 3-4 tests.
- Each test asserts user-visible behavior, not just console errors.
- If the current UI has no clear error state, document the product gap and add the smallest user-facing error affordance before asserting it.

Suggested verification:

```bash
cd frontend
pnpm exec playwright test e2e/failure-states.spec.ts
```

### Phase 4: Visual Regression Expansion

Purpose: cover important visual states that are not protected by unit tests.

Implementation changes:

- Extend `frontend/e2e/visual-regression.spec.ts`.
- Keep screenshots full-page only when page-level layout matters; prefer component-area screenshots for dropdowns or compact states.

Recommended new screenshots:

| Screenshot | Setup | Why |
|------------|-------|-----|
| mobile playground after one step | mobile project, `/playground`, one step | catches responsive playground layout regressions |
| scenario picker open | `/playground`, open picker | protects dropdown positioning and scenario metadata density |
| glossary filtered result | `/glossary`, search `UCB` | covers glossary layout and expanded/search state |
| truth revealed playground | `/playground`, step, reveal truth | protects educational overlays and rate display |
| compare truth revealed | `/compare`, step, reveal truth | protects dual-column revealed state |

Acceptance criteria:

- Add 3-5 visual tests.
- Baselines are committed under `frontend/e2e/__screenshots__/`.
- Visual tests wait for stable UI state before screenshot.
- Screenshot tolerance remains `maxDiffPixels: 150` unless a specific baseline proves too noisy.

Suggested verification:

```bash
cd frontend
pnpm exec playwright test e2e/visual-regression.spec.ts
```

### Phase 5: Drift Coverage Strategy

Purpose: make non-stationary scenario coverage intentional instead of accidentally skipped forever.

Preferred implementation:

- Keep the current 205-step drift test skipped by default.
- Add a scheduled CI job or a separate manual command that runs with `E2E_SLOW=1`.
- Document this in CI docs or package scripts.

Optional faster implementation:

- If backend supports a test-only scenario or configuration, add a short-drift fixture where drift begins within 5-10 steps.
- Add one default E2E test that selects the short-drift fixture and asserts drift annotation appears.

Acceptance criteria:

- There is an explicit command for drift E2E.
- The default PR suite does not become materially slower.
- Drift behavior is exercised in at least one regular CI context, scheduled CI context, or documented release-check command.

Suggested commands:

```bash
cd frontend
E2E_SLOW=1 pnpm exec playwright test e2e/playground.spec.ts --grep "drift annotations"
```

If a package script is added later:

```json
{
  "test:e2e:slow": "E2E_SLOW=1 playwright test e2e/playground.spec.ts --grep \"drift annotations\""
}
```

### Phase 6: Accessibility And Keyboard Smoke

Purpose: cover basic keyboard behavior without introducing a full accessibility audit tool yet.

Recommended tests:

| Test | Steps | Assertions |
|------|-------|------------|
| Header keyboard navigation | tab through header buttons | focus reaches primary nav entries in order |
| Glossary keyboard search | focus search, type, press tab/enter on result | result can be opened without mouse |
| Scenario picker keyboard open | focus picker trigger, press Enter/Escape | menu opens and closes |

Acceptance criteria:

- Add 2-3 tests.
- Keep them role/focus based.
- Do not add axe or a new dependency in this phase unless broader accessibility auditing is explicitly desired.

Suggested verification:

```bash
cd frontend
pnpm exec playwright test e2e/accessibility.spec.ts
```

### Proposed Work Breakdown

Recommended order:

1. Selector stabilization: low test-count impact, high reliability impact.
2. Mobile smoke: highest untested browser behavior gap.
3. Failure-state tests: highest product-confidence gap.
4. Visual expansion: valuable after selectors and waits are stable.
5. Drift operationalization: important, but should not slow every PR.
6. Keyboard/accessibility smoke: useful follow-up after main coverage gaps.

Estimated added tests:

| Phase | Added tests |
|-------|------------:|
| Mobile smoke | 4 |
| Failure states | 3-4 |
| Visual expansion | 3-5 |
| Drift operationalization | 0-1 default, 1 slow |
| Keyboard/accessibility smoke | 2-3 |
| **Total** | **12-17 default tests**, plus optional slow drift |

### CI Recommendations

Use three lanes:

| Lane | Command | Purpose |
|------|---------|---------|
| PR unit | `pnpm test:run` | fast frontend logic checks |
| PR E2E | `pnpm test:e2e` | desktop + mobile smoke + critical workflows |
| Scheduled slow E2E | `E2E_SLOW=1 pnpm exec playwright test e2e/playground.spec.ts --grep "drift annotations"` | long drift protection |

If visual tests become noisy, split them into either:

- a required CI lane with stable browser/container settings, or
- a release-check lane run before deployment.

### Non-Goals

Do not add E2E tests for every backend validation branch. Keep these in backend tests unless the frontend must display specific behavior.

Do not expand the algorithm matrix beyond one smoke pass per algorithm unless a real algorithm-specific UI issue appears.

Do not assert chart SVG geometry in E2E. Use E2E for visible chart presence and screenshots, and unit tests for data transformation.

Do not make the 205-step drift test mandatory for every local PR run.

## Current Coverage Verdict

E2E coverage is strong for:

- route availability
- happy-path user workflows
- live backend contract compatibility
- all-algorithm smoke coverage
- all-scenario smoke coverage
- core visual layout regression

E2E coverage is weak for:

- mobile layout
- error and loading recovery
- accessibility and keyboard behavior
- long-running drift behavior in default runs
- deeper correctness assertions for numerical results

Final recommendation: keep the current suite, but do not expand it indiscriminately. Add a small number of high-value E2E tests focused on mobile, failure UX, and operational drift coverage. Leave most data-model, numerical, and edge-case validation to unit/backend tests where they are faster and less flaky.

---

## QA Verification — Discrepancies and Additional Findings

> Verified against actual `pnpm exec playwright test --list` output and codebase inspection on 2026-05-27.

### Discrepancies found

| Claim | Reported | Actual | Correction |
|-------|----------|--------|------------|
| Total test count | 71 | **70 default, 71 with `E2E_SLOW=1`** | The "71" includes 1 conditionally skipped test. `playground.spec.ts` has `test.skip(!process.env.E2E_SLOW, ...)` — it only runs when the env var is set. The default suite is **70**, not 71. The report should note "71 discovered (1 skipped by default)." |
| Visual baselines | Listed as: landing, playground, settings, compare, results | **Confirmed — 5 files exist** with matching names | All 5 baselines verified at `e2e/__screenshots__/visual-regression.spec.ts/`. ✅ |
| `maxDiffPixels` | 150 | **150** | Confirmed in `playwright.config.ts` under `expect.toHaveScreenshot`. ✅ |
| Mobile project | Claimed as gap / not implemented | **Not implemented** — zero mobile config | `playwright.config.ts` has no `projects` array, no viewport override, no device preset. Any `isMobile` or `deviceScaleFactor` setting is absent from the entire codebase. The report correctly flags this as missing. ✅ |
| `webServer` config | Backend + frontend both configured | **Confirmed** — backend on port 8000, frontend on port 3000, both with `reuseExistingServer: true` | ✅ |

### Additions the report missed

#### Test count breakdown by execution mode

The report says "71 tests across 12 files" but doesn't distinguish between default and opt-in. Here's the accurate breakdown:

| Mode | Count | Difference |
|------|------:|------------|
| Default (`pnpm test:e2e`) | **70** | All tests except 1 |
| Slow mode (`E2E_SLOW=1`) | **71** | Includes "drift annotations appear after drift begins" |
| `--list` discovers | **71** | Playwright lists skipped tests as discovered |

The report's per-file counts in the inventory table are correct for `--list` mode. The playground row says "8 discovered, 1 skipped unless `E2E_SLOW=1`" which is accurate.

#### Hardcoded backend URL in API helper — unreported fragility

**File:** `frontend/e2e/helpers/api.ts:3`

```typescript
const API = "http://localhost:8000";
```

The API contract tests use a hardcoded URL instead of reading from Playwright config or environment. This is a code smell:

- If the backend port ever changes (e.g., 8001, or a Docker/compose setup), all API contract tests break silently.
- Playwright's `webServer` config already manages the backend on port 8000, so this works today, but there's no shared single source of truth.
- The same hardcoded URL exists in `frontend/src/lib/api.ts:29` for production API calls.

**Recommendation:** Consider an environment variable (`API_BASE_URL` or `BACKEND_URL`) read by both files, or document the coupling explicitly. Not blocking — just something the report should mention.

#### Helper file audit confirms brittle selectors

The report correctly identifies `.absolute` and `.tabular-nums` as brittle selectors in the Quality of E2E Implementation section. Verified line-by-line:

| File | Line | Selector | Risk |
|------|------|----------|------|
| `helpers/playground.ts` | 40 | `.absolute` | Breaks if the scenario dropdown changes from `position: absolute` to `fixed` or any other positioning |
| `helpers/compare.ts` | 36 | `.tabular-nums` | Breaks if the stat card font class changes or is removed |

**All other selectors** in the helpers (6/8 in playground.ts, 2/3 in compare.ts) use `getByRole`, `getByText`, or stable text content — good patterns. The 2 brittle ones are isolated to one function each (`openScenarioPicker` and `expectCompareSteps`).

#### `data-testid` — more exist than the plan assumes; E2E underuses them

**Correction:** The frontend already has **many** `data-testid` attributes (ScenarioInfoBar, SegmentChart, ArmRow, ContextScatterPlot axes, etc.). E2E specs currently use only **three**:

| testid | Used in E2E? | Spec |
|--------|:------------:|------|
| `playground-seed-input` | ✅ | `playground.spec.ts` |
| `scenario-drift-badge` | ✅ | `scenarios.spec.ts` |
| `segment-chart` | ✅ | `scenarios.spec.ts` |

**Still missing** (plan Phase 1 targets — add to source, then helpers):

| Proposed | In source? | Suggested component |
|----------|:----------:|---------------------|
| `scenario-picker-trigger` | ❌ | `ScenarioPicker.tsx` |
| `scenario-picker-menu` | ❌ | `ScenarioPicker.tsx` |
| `compare-steps-a` / `compare-steps-b` | ❌ | `compare/page.tsx` stat cards |
| `chart-regret` / `chart-rewards` / `chart-pulls` | ❌ | Playground chart panels |
| `results-summary` | ❌ | `results/page.tsx` |

**Action:** Prefer extending E2E to use existing testids (`scenario-info-bar`, `algorithm-fit-suggestion`, estimate tracks) before adding nine new ones.

#### Scenario picker is not a native select — it's a custom dropdown

The helpers in `playground.ts` use `.absolute` to find the scenario dropdown because it's a custom-styled dropdown (not a native `<select>`). This is important context the report should include: the brittle selector exists because there's no semantic HTML to target. Adding `data-testid="scenario-picker-menu"` would eliminate the only CSS-selector dependency in the playground helpers.

#### "Scenarios" fixture has 5 entries — matches the report

**File:** `frontend/e2e/fixtures/scenarios.ts` — exports 5 scenario id/label pairs: `notification_channels`, `content_format`, `ad_creative_selection`, `news_feed_personalization`, `flash_sale_pricing`. Confirmed against the "all five scenarios" claims in the Landing and Playground sections. ✅

#### Algorithm smoke: 16 UI labels — **no P0/P1 split in code**

**Correction (prior QA note was wrong):** `algorithms.spec.ts` loops `ALGORITHM_SMOKE` from `fixtures/algorithms.ts`. There are **no** `test.info().annotations`, no P0/P1 metadata, and no internal names like `ClusterBandit` or `SlidingWindow`. The 16 tests use **display labels** that must match `AlgorithmSelector` / `ALGO_META` (UCB1, Thompson, LinUCB, SW-LinUCB, RF TS, etc.). ✅

**Flakiness note:** Full-suite runs can mark algorithm smokes as **flaky** (intermittent timeout on `stepTimes` waiting for `t=N`). Observed on UCB1, Thompson, RF UCB, and others depending on machine load. CI uses `retries: 2`, which masks this but does not remove root cause (slow backend step or race before sim init).

### What the report gets right

- **12 files, 71 discovered (70 default).** Accurate breakdown by domain. The per-file counts match reality.
- **Drift test is opt-in.** Correctly identified the `E2E_SLOW=1` gate and the 205-step cost.
- **Visual regression has 5 baselines.** All confirmed present in `__screenshots__/`.
- **Brittle selectors identified.** The callout for `.absolute` and `.tabular-nums` is accurate and actionable.
- **Phase ordering is logical.** Stabilize → mobile → failure → visual → drift → a11y. This is the right sequence.
- **Non-goals are well-scoped.** No chart SVG assertions, no backend validation duplication, no mandatory slow drift.
- **API contract tests use `request` context.** This is a best practice — `api-contract.spec.ts` uses Playwright's `APIRequestContext` instead of page-based UI interactions, which is faster and less flaky for backend contract verification.

### One missed risk: the helper/compare.ts `expectCompareSteps` is fragile for another reason

```typescript
export async function expectCompareSteps(page: Page, value: string) {
  await expect(
    page.locator(".tabular-nums").filter({ hasText: new RegExp(`^${value}$`) }).first(),
  ).toBeVisible({ timeout: 8_000 });
}
```

The regex `new RegExp("^2$")` will match a `.tabular-nums` element whose text is exactly `"2"`. The problem: if compare displays multiple stat cards (Steps, Cum. Regret, Avg Reward), and two happen to have the same numeric value, `first()` might assert the wrong card. This is low-risk today (only "Steps" hits low integers, and it's unlikely Cum. Regret or Avg Reward equal it), but it's a latent flaky test. Adding `data-testid="compare-steps-side-a"` (or similar) would make the assertion unambiguous.

---

## Senior QC Review — Second Pass (2026-05-27)

> Independent verification: `pnpm exec playwright test --list`, full `pnpm test:e2e` run, and source inspection. **Verdict:** Coverage report is **mostly accurate** and the improvement roadmap is **sound**, after correcting the errors below.

### QC verdict

| Area | Assessment |
|------|------------|
| Inventory counts (12 files, 71 discovered, 70 default) | ✅ Accurate |
| Visual baselines (5 PNGs) | ✅ Present under `e2e/__screenshots__/visual-regression.spec.ts/` |
| Playwright config (timeout, retries, webServer, snapshots) | ✅ Matches `playwright.config.ts` |
| Gap analysis (mobile, failure UX, a11y, drift) | ✅ Fair and prioritized correctly |
| Algorithm P0/P1 narrative (earlier QA note) | ❌ **Incorrect — removed above** |
| “Only one testid in frontend” (earlier QA note) | ❌ **Incorrect — corrected above** |
| CI plan “desktop + mobile smoke” | ⚠️ **Aspirational** — mobile not implemented |
| Phase 3 scenario API failure UX | ⚠️ **Blocked** — landing has no visible error state today |

### CI reality vs documented plan

What **`.github/workflows/ci.yml`** does today:

| Item | Actual | Documented target |
|------|--------|-------------------|
| E2E command | `pnpm test:e2e` → `playwright test` | Same |
| Test count | **70** pass + **1** skipped (drift) | Sometimes stated as 71 |
| Retries | `2` on CI | Mentioned ✅ |
| Workers | `1` on CI | Mentioned ✅ |
| Mobile project | **None** | Phase 2 |
| `E2E_SLOW` job | **None** | Scheduled slow lane |
| `test:e2e:slow` script | **Not in `package.json`** | Suggested only |
| Visual tests | Run in same job as all E2E | OK; no separate lane |

**Action A1 (High):** Add `test:e2e:slow` to `frontend/package.json` and a `workflow_dispatch` or weekly workflow for drift.
**Action A2 (Medium):** Document in README/CI that PR E2E = **70 tests**, not 71.

### Maintainer pitfalls (not in original report)

#### SPA navigation vs full page load (Results)

`results.spec.ts` must use **header navigation** (`gotoResults()`), not `page.goto("/results")`. Full navigation remounts the app and **clears Zustand**, so Results shows “No data yet” even after stepping on Playground. This was a real bug during implementation; document for anyone adding persistence tests.

#### API contract URL duplication

Hardcoded `http://localhost:8000` appears in:

- `e2e/helpers/api.ts` (constant `API`)
- `e2e/api-contract.spec.ts` (lines 40–41, 50–51, 74 — direct `request.get/post`)

**Action A3 (Low):** Centralize on `process.env.API_BASE_URL ?? "http://localhost:8000"` or Playwright `baseURL` for API project.

#### Per-scenario API test assumes contextual step

`api-contract.spec.ts` asserts `step.step.context` is **not null** for every scenario with LinUCB. That holds today but would break if a scenario returns null context on step 1. Prefer asserting `step.t === 1` only, or scenario-specific expectations.

#### Landing scenario fetch has no user-visible failure

`ScenarioShowcase.tsx` logs to `console.error` on failure and renders an **empty grid** (no error banner). Phase 3 “scenario list failure” test **requires product work first** — see plan Action B1.

#### Navigation omits Overview

`navigation.spec.ts` loops Playground → Glossary but never clicks **Overview** (`/`). Route `/` is covered by a dedicated parametrized test; header Overview button is not in the smoke loop.

#### Compare test naming vs UI

`compare.spec.ts` test `"reset returns to t=0"` asserts **Steps** via `.tabular-nums`, not playground-style `t=0` text. Rename test or document to avoid false debugging.

### Known flakiness register

| Test / area | Symptom | Mitigation in repo | Recommended fix |
|-------------|---------|-------------------|-----------------|
| `algorithms.spec.ts` (various) | Timeout waiting for `t=N` | CI retries ×2 | Wait for `/step` response; ensure `gotoPlayground` waits past “Running simulation…” |
| `playground.spec.ts` play/pause | Uses `waitForTimeout` | Retries | Poll `t=` unchanged after pause |
| `visual-regression.spec.ts` | Pixel drift on fonts/OS | `maxDiffPixels: 150` | Pin CI browser image; optional `--update-snapshots` lane |
| Full suite duration | ~1.3–2.3 min | `workers: 1` on CI | Acceptable for PR; split visual job if needed |

### Action register (recommended)

| ID | Priority | Action | Owner | Blocks |
|----|----------|--------|-------|--------|
| A1 | High | Add `test:e2e:slow` + scheduled `E2E_SLOW=1` drift job | DevOps | — |
| A2 | Medium | Clarify **70 vs 71** in exec summary / CI docs | QA | — |
| A3 | Low | Centralize API base URL for contract tests | FE | — |
| B1 | High | Add visible error/empty state in `ScenarioShowcase` on `getScenarios` failure | FE | Phase 3 scenario-failure E2E |
| B2 | High | Add `data-testid` on scenario picker + compare Steps cards; update helpers | FE | Phase 1 stability |
| B3 | Medium | Add `mobile` Playwright project + `mobile.spec.ts` (4 tests) | QA | Phase 2 |
| B4 | Medium | Add `failure-states.spec.ts` (3–4 tests) after B1 | QA | B1 for landing |
| B5 | Low | Rename compare reset test; use `compareStep` response waits everywhere | QA | — |
| B6 | Low | E2E: assert `scenario-info-bar` / recommended chips for ScenarioInfo (A09) | QA | — |

### What we agree with (no change needed)

- Phase order: stabilize → mobile → failure → visual → drift → keyboard smoke.
- Non-goals: no chart SVG geometry, no full backend matrix in E2E.
- Keeping 205-step drift **opt-in** for PR speed.
- API contract layer via `request` fixture (fast, appropriate layer).
- Target **83–88** tests after plan — math is reasonable if visual + failure phases land fully.

### Sign-off

**Approve** the coverage report and plan as the working QA baseline, subject to:

1. Fixing the **P0/P1** and **single testid** inaccuracies (done in this revision).
2. Treating **CI mobile + slow drift** rows as **planned**, not **current**.
3. Executing **B1** before promising scenario API-failure E2E.
