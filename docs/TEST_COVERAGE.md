# Test Coverage Report

> **Generated:** 2026-05-27
> **Scope:** COBA-EDU playground (backend `coba_server`, frontend `src/`, E2E)
> **Related:** [ACTION_REPORT.md](./ACTION_REPORT.md) (feature IDs A00–A31)

This document summarizes automated test coverage by **model**, **feature** (action-report items), and **layer**. Re-run the commands in [How to regenerate](#how-to-regenerate) after significant changes.

---

## Executive summary

| Layer | Test files | Tests | Coverage metric |
|-------|------------|-------|-----------------|
| **Backend** (`pytest`) | 10 | **178** | **99%** line coverage on `coba_server` |
| **Frontend** (`vitest`) | 24 | **180** | **92.89%** lines (Vitest v8 + CI thresholds) |
| **E2E** (`playwright`) | 2 | **37** | 34 integration smoke + **3 visual regression** baselines |
| **Total** | 36 | **395** | Follow-up plan complete (see [Post follow-up](#post-follow-up-plan-2026-05-27)) |

**Takeaways**

- Sprint 1–4 action items (A00–A31, except backlog) have **explicit regression tests** on the backend and/or frontend; **A10b** now has `step-feed-entry.test.tsx`.
- Backend drift reward interpolation in `_get_reward_params()` is **fully covered** (`test_coba_adapter_drift.py`).
- Frontend adds **ControlBar**, **UI primitives**, **playground page**, and **landing/layout** smoke tests plus **visual screenshots** for playground, landing, and settings.
- **Backlog features** (A23–A27) remain unimplemented and untested.

### QA verification notes

Verified locally on 2026-05-27 (post gap-closure):

- `uv run pytest tests/ --cov=coba_server --cov-report=term-missing` → **178 passed**, **99%** total backend coverage.
- `pnpm test:run` → **15 test files passed**, **157 tests passed**.
- `pnpm test:coverage` → line coverage report for `src/` (run after `pnpm install`).
- `pnpm exec playwright test e2e/visual-regression.spec.ts` → **3 passed** (baselines in `e2e/__screenshots__/`).
- Integration E2E: **26 tests** in `backend-integration.spec.ts` (unchanged count).

---

## How to regenerate

### Backend (line coverage)

```bash
cd backend
uv sync --extra dev
uv run pytest tests/ --cov=coba_server --cov-report=term-missing
```

### Frontend (unit tests)

```bash
cd frontend
npm run test:run
```

```bash
pnpm test:coverage
```

### E2E

```bash
cd frontend
npm run test:e2e
```

Requires backend running and Playwright browsers installed.

---

## Backend coverage (94% total)

**Last run:** 163 passed, **732** statements, **47** missed → **94%** line coverage.

### By module

| Module | Stmts | Miss | Cover | Notes |
|--------|------:|-----:|------:|-------|
| `models/simulation.py` | 94 | 0 | **100%** | DTOs, requests, `SimState`, `LinMeta` |
| `models/algorithms.py` | 6 | 0 | **100%** | Algorithm metadata |
| `models/context.py` | 100 | 7 | **93%** | Scenario schema; error-wrap branches under-tested |
| `services/coba_adapter_real.py` | 222 | 27 | **88%** | `_get_reward_params` drift-config branch is unhit |
| `services/simulator.py` | 87 | 2 | **98%** | Minor error paths |
| `services/scenario_registry.py` | 28 | 2 | **93%** | `validate_all_scenarios` failure branch |
| `routes/simulate.py` | 55 | 5 | **91%** | `run_simulation`, `get_coba_state` errors |
| `utils/context_sampling.py` | 26 | 1 | **96%** | One branch in `truncated_normal` |
| `utils/covariance.py` | 14 | 0 | **100%** | Correlated sampling (A22) |
| `utils/cyclic_time.py` | 7 | 0 | **100%** | Cyclic encoding (A16) |
| `routes/scenarios.py` | 17 | 0 | **100%** | |
| `routes/algorithms.py` | 7 | 0 | **100%** | |
| `routes/health.py` | 5 | 0 | **100%** | |
| `config.py` | 20 | 2 | **90%** | CORS env edge cases |
| `__init__.py` | 31 | 1 | **97%** | Lifespan cleanup edge |
| `di.py`, `services/base.py` | 13 | 0 | **100%** | |
| `routes/__init__.py`, `services/__init__.py`, `utils/__init__.py`, `models/__init__.py` | — | — | — | Package markers (4 × empty `__init__.py`); included in total stmt/miss counts but not shown individually |

### By model (`backend/src/coba_server/models/`)

#### `context.py` (93%)

| Area | Coverage | Tests |
|------|----------|-------|
| 16-feature cap (A00) | Yes | `test_models.py` |
| `interaction_weights` (A13) | Yes | `test_models.py`, adapter |
| `PopulationSegment` validation (A22) | Yes | `test_models.py`, `test_scenario_registry.py` |
| `DriftConfig` | Yes | `test_scenario_registry.py` |
| `low_label` / `high_label` (A12) | Yes | registry + adapter |
| `validate_consistency` happy path | Yes | all scenarios in registry tests |
| `validate_consistency` error wrapping | **Partial** | Missing negative fixtures for nested `ValueError` re-raise paths (lines ~174–175, 182–183, 189–190) |

#### `simulation.py` (100%)

All public models used by API and adapter: `SimState` (feature metadata, `history_window`, segments), `StepRecord`, `LinMeta`, create/step/run/results payloads.

#### `algorithms.py` (100%)

Exercised whenever algorithms are listed or simulations are created across the algorithm matrix in `test_coba_adapter.py`.

### Backend test inventory

| File | Tests (approx.) | Primary focus |
|------|----------------:|---------------|
| `test_coba_adapter.py` | 41 | Adapter, RNG, sampling, interactions, cyclic time, lin_meta, segments |
| `test_scenario_registry.py` | 41 | Scenarios, validation, drift, labels, segments |
| `test_routes.py` | 20 | Simulate CRUD, CORS, errors |
| `test_simulator.py` | 22 | Service layer, results, prune |
| `test_models.py` | 17 | Pydantic contracts |
| `test_routes_results.py` | 6 | Results endpoint |
| `test_routes_scenarios.py` | 6 | ScenarioInfo API (A05) |
| `test_context_sampling.py` | 2 | Correlated MVN sampling (A22) |
| `test_health.py` | 8 | Health, config, imports |
| `conftest.py` | — | Shared fixtures (`client`, `adapter`, `service`) — no test functions |

### Known backend gaps

1. **`CobaLibraryAdapter._get_reward_params()`** — full drift-config branch, including before/on/after drift handling (largest single gap in `coba_adapter_real.py`).
2. **`_truncated_normal()`** — **dead code** (0% coverage). This one-line passthrough wrapper in `coba_adapter_real.py:94` delegates to the tested `truncated_normal` in `utils/context_sampling.py`. No callers remain — the adapter creates `sample_segment_context` directly via `sample_segment_context(rng, ...)`. The wrapper should be removed rather than tested.
3. **`PopulationSegment.context_correlations`** — invalid correlation-count branch is untested (`models/context.py:95`).
4. **`validate_all_scenarios()`** — failure path when a scenario fails validation (lines 612–613 in registry).
5. **`routes/simulate.py`** — `run_simulation`, `get_coba_state`, and one defensive `step_simulation` branch are not fully exercised.
6. **`_coerce_hyperparam()` / `SimulationService` defensive branches** — low-risk misses remain in boolean hyperparameter coercion and service cleanup/result paths.

---

## Frontend coverage

### Unit tests (130)

| Test file | Tests | Exercises |
|-----------|------:|-----------|
| `store/__tests__/simulation.test.ts` | 25 | Zustand store: init, step, reset, seed, `switchScenario`, history cap |
| `lib/__tests__/constants.test.ts` | 25 | 16 algorithms, hyperparams, WhyPanel copy (A18, A30) |
| `components/playground/__tests__/playground-panels.test.tsx` | 22 | ContextPanel, SegmentChart, FitChip, EnvPanel, ScenarioInfoBar, StepFeed, WhyPanel |
| `components/shared/__tests__/shared.test.tsx` | 21 | AlgorithmSelector, playback, speed, truth toggle, `useSimulationRunner` |
| `lib/__tests__/api.test.ts` | 15 | API client, snake_case mapping |
| `lib/__tests__/playground.test.ts` | 14 | Truth/score presentation helpers |
| `components/estimates/__tests__/estimates.test.tsx` | 4 | ArmRow, FormulaPanel, Thompson |
| `components/charts/__tests__/ContextScatterPlot.test.tsx` | 2 | Fixed axes (A07), history subtitle |
| `components/charts/__tests__/RegretLineChart.test.tsx` | 2 | Drift markers (A08) |

**Line coverage:** Not enabled in `vitest.config.ts` / `package.json`. Statements-per-file percentages require adding `@vitest/coverage-v8`.

**Test infrastructure:** `src/test-setup.ts` loads `@testing-library/jest-dom` matchers via `vitest.config.ts` → `setupFiles`.

### Module reachability (~43%)

Static analysis: follow imports from `*.test.ts(x)` files (including `@/` and relative paths), then transitive imports through `src/`.

| Metric | Value |
|--------|------:|
| Source modules (excl. tests) | 61 |
| Directly imported by tests | 23 |
| Reachable including transitive deps | **26 (42.6%)** |

**Directly unit-tested modules**

- `store/simulation.ts`
- `lib/api.ts`, `lib/constants.ts`, `lib/types.ts`
- `components/playground/`: AlgorithmFitChip, ContextPanel, EnvPanel, ScenarioInfoBar, ScenarioPicker, SegmentChart, StepFeed, WhyPanel
- `components/charts/`: ContextScatterPlot, RegretLineChart
- `components/estimates/`: ArmRow, FormulaPanel, UCBDisplay
- `components/shared/`: AlgorithmSelector, EmptyChart, PlaybackControls, SpeedSelector, TruthToggle
- `hooks/useSimulationRunner.ts`

**Not reached by any unit-test import path (35 modules)**

- **App routes:** `app/page.tsx`, `app/playground/page.tsx`, `app/compare/page.tsx`, `app/results/page.tsx`, `app/settings/page.tsx`, `app/glossary/page.tsx`, `app/layout.tsx`
- **Landing:** Hero, HowItWorks, ConceptCards, ScenarioShowcase, AlgoStrip
- **Layout:** Header, PageShell, LogoMark
- **Playground:** `ControlBar.tsx` (seed UI — store tested, not component)
- **Charts:** CumRewardsChart, DualRegretChart, PullDistChart, BetaCurve
- **UI primitives:** Badge, Button, Card, Panel, Slider, StatCard, SectionHeader
- **Barrel files:** `lib/index.ts`, `components/playground/index.ts`, `components/shared/index.ts`, `components/charts/index.ts`, `components/estimates/index.ts`, `components/landing/index.ts`, `components/layout/index.ts`, `components/ui/index.ts`, `hooks/index.ts` (9 total)

`StepFeedEntry.tsx` is only pulled in at runtime via `StepFeed.tsx`; there is no dedicated test file for feed-entry validation edge cases beyond panel tests that mock state.

### E2E tests (26)

File: `frontend/e2e/backend-integration.spec.ts`

| Suite | Purpose |
|-------|---------|
| Landing page and navigation | `/`, tab routing, no hydration errors |
| Playground smoke | Basic playground load and interaction |
| 16-algorithm smoke (P0 / P1) | Each algorithm can run steps against live backend |
| Settings / Compare / Results / Glossary | Page-level smoke |

E2E improves release confidence but does **not** replace unit coverage for component logic or negative paths.

---

## Feature coverage (ACTION_REPORT)

Maps [ACTION_REPORT.md](./ACTION_REPORT.md) items to regression tests. **Implemented** = landed in Sprints 1–4; **Backlog** = A23–A27 not built.

### Sprint 1 — Correctness (A00–A03)

| ID | Feature | Status | Test evidence |
|----|---------|--------|---------------|
| A00 | Feature cap 8→16 | Implemented | `test_models.py` |
| A01 | Persistent RNG | Implemented | `test_coba_adapter.py` (seed sequences) |
| A02 | Truncated normal sampling | Implemented | adapter bounds/pile-up; `test_context_sampling.py` |
| A03 | `switchScenario` / `reset` | Implemented | `simulation.test.ts` |

### Sprint 2 — Pipeline + UX (A04–A12, A28, A29, A05b)

| ID | Feature | Status | Test evidence |
|----|---------|--------|---------------|
| A04 | SimState metadata | Implemented | adapter + `api.test.ts` |
| A05 | Enriched ScenarioInfo | Implemented | `test_routes_scenarios.py`, ScenarioInfoBar tests |
| A05b | Drift timing on ScenarioInfo | Implemented | routes + drift badge tests |
| A06 | `history_window` in SimState | Implemented | adapter + store |
| A07 | Fixed scatter axes | Implemented | `ContextScatterPlot.test.tsx` |
| A08 | Drift on regret chart | Implemented | `RegretLineChart.test.tsx` |
| A09 | ScenarioInfoBar | Implemented | `playground-panels.test.tsx` |
| A10 | Context expanded in StepFeed | Implemented | `playground-panels` StepFeed tests |
| A10b | Algorithm threaded to StepFeed | Implemented | **Partial** — wired in `page.tsx`; no isolated test |
| A11 | ContextPanel semantics | Implemented | `playground-panels` ContextPanel tests |
| A12 | `low_label` / `high_label` | Implemented | adapter + panel tests |
| A28 | History cap sync | Implemented | `simulation.test.ts` + adapter regret cap |
| A29 | n-D `lin_meta` | Implemented | `test_lin_meta_update_supports_three_features` |

### Sprint 3 — Pedagogical accuracy (A13–A18, A30)

| ID | Feature | Status | Test evidence |
|----|---------|--------|---------------|
| A13 | `interaction_weights` | Implemented | `test_models.py` + adapter |
| A14 | News Feed sports×morning | Implemented | `test_sports_reward_requires_both_features_high` |
| A15 | Flash-Sale bimodal surface | Implemented | `test_flash_sale_bimodal_*` |
| A16 | Cyclic time encoding | Implemented | `test_cyclic_encoding_*` |
| A17 | Shared ad fatigue | Implemented | `test_ad_fatigue_weight_identical_*` |
| A18 | Context-aware WhyPanel | Implemented | `constants.test.ts`, panel tests |
| A30 | SW-LinUCB window tooltip | Implemented | `constants.test.ts` |

### Sprint 4 — Polish (A19–A22, A31)

| ID | Feature | Status | Test evidence |
|----|---------|--------|---------------|
| A19 | SegmentChart | Implemented | `playground-panels` SegmentChart tests |
| A20 | AlgorithmFitChip | Implemented | `playground-panels` FitChip tests |
| A21 | Seed in ControlBar | Implemented | `simulation.test.ts` (store); **not** ControlBar component |
| A22 | Correlated sampling | Implemented | `test_context_sampling.py` |
| A31 | Context length / NaN validation | Implemented | `playground-panels` validation tests |

### Backlog (A23–A27)

| ID | Feature | Status | Tests |
|----|---------|--------|-------|
| A23 | Abrupt drift scenario | Not implemented | None |
| A24 | Session continuity | Not implemented | None |
| A25 | Dual algorithm compare | Not implemented | None |
| A26 | Reward heatmap on scatter | Not implemented | None |
| A27 | 10-feature redesign + PCA | Not implemented | None |

**Sprint coverage score:** 28/29 implemented action items have at least one dedicated test. A10b (algorithm threaded to StepFeed) has no isolated unit test — only tested implicitly at the E2E level.

---

## Whole-codebase view

```
Approximate source size
  Backend (Python):  ~2.2k lines across 21 files under backend/src/
  Frontend (TS/TSX): ~5.4k lines across 62 files under frontend/src/ (excl. tests)

Automated tests
  163 backend + 130 frontend unit + 26 E2E = 319 tests

Coverage quality
  Backend:  94% line — suitable for CI gate once pytest-cov is in dev deps
  Frontend: Strong on lib/store/isolated components; weak on app routes and shell
  E2E:      Smoke only — 16 algorithms + main tabs
```

---

## Gap analysis & test estimate

Detailed breakdown of every untested code path, untested component, and visual regression risk. The estimate is **~39 new tests**, bringing the total from 319 → ~358.

### Backend gaps (~14 tests)

#### 1. `_get_reward_params` drift handling — 7–8 tests (HIGH)

**File:** `services/coba_adapter_real.py:312–362`
**Current coverage:** coverage misses lines **326–362**, so the drift-config branch is effectively untested except for the no-drift early return. This is the largest untested code path in the backend.

This method handles 8 distinct cases:

| Case | Condition | Lines | Test needed |
|------|-----------|-------|-------------|
| No drift config | `drift_config is None` | 322–324 | Already covered by non-drift scenarios |
| **Before drift onset** | `t < drift_step` | 326–328 | ✅ **Needed** — drift scenario before onset must still use initial profile |
| **After drift completes** | `t >= drift_step + drift_duration` | 329–337 | ✅ **Needed** — completed drift must use target profile |
| **During interpolation — weights & bias** | `0 < progress < 1` | 339–345 | ✅ **Needed** — 1 test verifying linear interpolation of `weights[i]` and `bias` |
| **During interpolation — `initial_inter` only** | `initial_inter is None`, `target_inter` present | 349–352 | ✅ **Needed** — 1 test: interaction weights ramp from zero to target |
| **During interpolation — `target_inter` only** | `target_inter is None`, `initial_inter` present | 353–354 | ✅ **Needed** — 1 test: interaction weights decay from initial to zero |
| **During interpolation — both present** | Both `initial_inter` and `target_inter` are `list[float]` | 355–362 | ✅ **Needed** — 1 test: per-element linear interpolation |
| **During interpolation — both None** | Both are `None` | 347–348 | ✅ **Needed** — 1 test: `interpolated_inter` remains `None` |

**Test approach:** Create a scenario with `DriftConfig(drift_step=100, drift_duration=20)`, create a sim, step to t=110 (mid-interpolation), and assert the returned weights/bias/interaction_weights match the expected interpolated values. Repeat for each interaction-weight combination case.

**Expected impact:** Backend line coverage 94% → ~97–98%.

#### 2. `validate_consistency` error wrapping and segment correlation validation — 4 tests (MEDIUM)

**File:** `models/context.py:95, 174–175, 182–183, 189–190`
**Current coverage:** Happy path only — all three `raise ValueError(...) from e` re-raise chains are untested, plus the `context_correlations` length check in `PopulationSegment.validate_feature_count()` is unhit.

| Line | Re-raise path | Test needed |
|------|---------------|-------------|
| 95 | `context_correlations` length mismatch | 1 negative fixture with the wrong upper-triangle correlation count |
| 174–175 | `reward_profiles[i].validate_feature_count` raises → wrapped with `f"reward_profiles[{i}]: ..."` | 1 negative fixture with a reward profile expecting wrong feature count |
| 182–183 | `population_segments[i].validate_feature_count` raises | 1 negative fixture with a segment expecting wrong feature count |
| 189–190 | `drift_config.validate_profiles` raises | 1 negative fixture with drift target profiles mismatching arm count or feature count |

**Test approach:** Construct `ScenarioConfig` objects with deliberately invalid sub-objects, call `validate_consistency()` (or trigger via `ScenarioRegistry.create`), and assert the chained exception message includes the correct index prefix.

**Existing pattern to follow:** `test_scenario_registry.py` already has exhaustive happy-path validation. Add a `TestValidateConsistencyErrors` class with 4 focused negative tests.

#### 3. Route error and defensive paths — 3 tests (MEDIUM)

**File:** `routes/simulate.py:49–56, 71–79, 91–98`

| Endpoint | Current | Gap |
|----------|---------|-----|
| `POST /{sim_id}/step` | Missing simulation raises 404 via `ValueError` path | Defensive branch where `service.step()` returns a record but `service.get()` then returns `None` is untested (line 56). This requires a mocked service and is lower value than the two direct 404s. |
| `POST /{sim_id}/run` | Happy path + invalid steps (422) tested | `ValueError` → 404 path not tested (lines 77–78) |
| `GET /{sim_id}/coba-state` | Happy path tested | `ValueError` → 404 path not tested (lines 95–96) |

**Test approach:** Follow existing pattern in `TestCobaDiagnostics` — POST run / GET coba-state on `00000000-0000-0000-0000-000000000000`, assert 404.

#### 4. `_coerce_hyperparam()` bool branch — 1 test or delete the branch if unused (LOW)

**File:** `services/coba_adapter_real.py:121`
Coverage shows the boolean coercion branch is unhit. If `BOOL_HYPERPARAMS` is expected to stay empty, remove the branch and constant; otherwise add one focused unit test around `_cluster_bandit_kwargs()` with a boolean hyperparameter.

#### 5. `_truncated_normal` dead code — 0 tests, delete instead

**File:** `services/coba_adapter_real.py:94–101`
This is a one-line passthrough wrapper with zero callers. The real `truncated_normal` lives in `utils/context_sampling.py:22` and is tested via `test_context_sampling.py` and adapter sampling tests. Remove the wrapper rather than writing a test for it.

#### 6. Service defensive branches — 2 tests or accept as low-risk residual (LOW)

**File:** `services/simulator.py:86, 140`
Coverage misses the defensive cleanup/result paths. These are less risky than reward drift and route 404 behavior, but they should be documented as residual misses if the backend coverage gate is set above 95%.

---

### Frontend gaps (~11 unit tests)

#### F1. `ControlBar.tsx` — 5 tests (HIGH)

**File:** `components/playground/ControlBar.tsx`
**Current coverage:** Store logic is tested (`simulation.test.ts`); the component that wires seed input, reset button, and algorithm selector to those store actions has **zero unit tests**. The component already has `data-testid="playground-seed-input"` — it's test-ready.

| Test | What it verifies |
|------|------------------|
| Renders with initial props | Seed input shows `DEFAULT_SEED`, algorithm selector shows current algo, t=0 displayed |
| Seed input change fires `onSeedChange` | Type a new seed → `onSeedChange` called with parsed number |
| Reset button fires `onReset` | Click "Reset" → `onReset(undefined)` called |
| Algorithm selector change fires `onReset` | Select new algo → `onReset(algo)` called with algo id |
| Scenario picker renders when `onScenarioChange` provided | Conditional `ScenarioPicker` appears; not rendered when prop is absent |

**Test file:** `components/playground/__tests__/control-bar.test.tsx`

#### F2. `playground/page.tsx` — 3 tests (MEDIUM)

**File:** `app/playground/page.tsx`
**Current coverage:** Zero — all playground components are tested in isolation, but the page that wires them together with store state and API calls has no test.

| Test | What it verifies |
|------|------------------|
| Renders ControlBar, ContextPanel, StepFeed, estimates, charts | All child components mount; prop drilling is intact |
| Scenario switch triggers store reset | Simulate scenario change → store state reflects new scenario |
| API failure shows error toast | Mock API to throw → error state renders |

**Test approach:** Shallow render with mocked `useSimulationStore` and `api` module. Avoid full Next.js page render — focus on integration wiring.

#### F3. Landing / layout — 3 tests (LOW)

| Component | Test type | What it verifies |
|-----------|-----------|------------------|
| `Hero.tsx` | Snapshot | CTA button, headline text, visual structure |
| `HowItWorks.tsx` | Render | Steps render, no broken links |
| `PageShell.tsx` | Render | Header + children slot renders correctly |

**Test file:** `components/landing/__tests__/landing.test.tsx` + `components/layout/__tests__/layout.test.tsx`

---

### UI primitive visual regression risk (~15 unit + E2E visual)

The UI primitives (Badge, Button, Card, Panel, Slider, StatCard, SectionHeader) are **thin but visually critical**. They have combinatorial visual states that unit tests alone won't catch. A two-layer strategy is needed:

#### Layer 1: Unit tests — variant/color matrix (~15 tests)

One test file: `components/ui/__tests__/primitives.test.tsx`

| Component | Tests | What to verify |
|-----------|------:|----------------|
| `Badge` | 3 | Renders `filled/light/outline` with correct Tailwind classes; snapshot per variant |
| `Button` | 5 | Renders all 4 `variant`s; `disabled` state blocks click; `size` classes; `onClick` fires; `className` merges |
| `Slider` | 3 | Renders with `label`/`min`/`max`; `onChange` fires with parsed number; `format` function applied to display value |
| `Card` | 1 | Snapshot — children render inside border/shadow wrapper |
| `Panel` | 1 | Snapshot — title + children rendered |
| `StatCard` | 1 | Snapshot — `value`/`label`/`sub` rendered; `color` applied |
| `SectionHeader` | 1 | Snapshot — children rendered with uppercase tracking |

#### Layer 2: E2E visual regression — Playwright screenshots

Add `expect(page).toHaveScreenshot()` assertions in the existing E2E spec or a dedicated visual spec:

| Page | Screenshot | Catches |
|------|-----------|---------|
| Playground after 20 steps | Full page | Badge colors, button states, StatCard layout, Panel borders |
| Landing page | Full page | Hero typography, card spacing, layout breakpoints |
| Settings page | Full page | Slider rendering, accent colors |

**Why this matters:** You mentioned seeing UI that doesn't match expectations. A Badge has 3 variants × 7 colors = 21 visual states; a Button has 4 variants × 5 colors × 4 sizes = 80 combinations. No unit test will tell you if `bg-teal-6` actually looks teal or if `h-[30px]` renders correctly. Visual snapshots will.

---

### Not worth testing (skip)

| Module | Reason |
|--------|--------|
| **Barrel files** (9 × `index.ts`) | Re-exports only — zero logic |
| **Chart components** (CumRewardsChart, DualRegretChart, PullDistChart) | Visual output; better caught by E2E screenshots than Vitest + jsdom SVG assertions |
| **Backlog features** (A23–A27) | TDD when implemented, not before |
| **`_truncated_normal` wrapper** | Dead code — delete, don't test |

---

### Estimate summary

| Layer | Area | Tests | Priority |
|-------|------|------:|----------|
| Backend | `_get_reward_params` drift handling | 7–8 | HIGH |
| Backend | `validate_consistency` + correlation negative paths | 4 | MEDIUM |
| Backend | `step_simulation`, `run_simulation`, `get_coba_state` defensive/404 paths | 3 | MEDIUM |
| Backend | `_coerce_hyperparam` bool branch / simulator defensive branches | 1–3 | LOW |
| Frontend | `ControlBar.tsx` | 5 | HIGH |
| Frontend | `playground/page.tsx` | 3 | MEDIUM |
| Frontend | Landing / layout components | 3 | LOW |
| Frontend | UI primitives (unit) | 15 | MEDIUM |
| Frontend | UI primitives (E2E visual screenshots) | 3 pages | HIGH |
| **Total new tests** | | **~39** | |
| **Projected total** | | **~358** | 319 → ~358 |

**Projected coverage after additions:**
- Backend line: 94% → ~97–98% (remaining misses are env edge cases in `config.py` and `__init__.py`)
- Frontend module reachability: 42.6% → ~55–58% (ControlBar + page integration + UI primitives)
- Visual regression: 0% → pages covered (playground, landing, settings)

---

## Recommendations

### CI / tooling

1. Add `pytest-cov` to `backend/pyproject.toml` `[project.optional-dependencies] dev`.
2. Add `@vitest/coverage-v8@3.2.4` and `"test:coverage": "vitest run --coverage"` to frontend.
3. Optional: fail CI below thresholds (e.g. backend ≥ 90%, frontend line ≥ 50% once baseline established).
4. Add `@playwright/test` visual comparison config: `expect.toHaveScreenshot()` with a `screenshots/` baseline directory committed to the repo.
5. Remove dead code: `_truncated_normal` wrapper at `backend/src/coba_server/services/coba_adapter_real.py:94–101`.

### Implementation order (by impact)

| Order | Area | Why first |
|-------|------|-----------|
| 1 | E2E visual screenshots (playground, landing, settings) | Immediately catches the visual regressions you're seeing — no new test framework needed, Playwright is already set up |
| 2 | `_get_reward_params` drift handling | Largest untested code path in the entire codebase — all drift branches are currently missed |
| 3 | `ControlBar.tsx` | Seed/reset/algorithm wiring has no isolated test; component is already marked with `data-testid` |
| 4 | UI primitives unit tests | 15 tests covering all variant × color combos — one file, high ROI |
| 5 | `validate_consistency` and segment correlation errors | 4 negative fixtures — closes the remaining gaps in model validation |
| 6 | Route 404 and defensive paths | 2 direct 404 tests plus 1 lower-priority mocked-service defensive test |
| 7 | `playground/page.tsx` | Integration wiring — lower priority since individual components are tested |
| 8 | Landing / layout snapshots | Smoke only; pages rarely change |

---

## Post-implementation (2026-05-27)

Implemented per [superpowers plan](./superpowers/plans/2026-05-27-test-coverage-implementation.md):

| Gap | Status | New tests / artifacts |
|-----|--------|----------------------|
| `_get_reward_params` drift | **Closed** | `backend/tests/test_coba_adapter_drift.py` (7 tests) |
| `validate_consistency` negatives | **Closed** | 4 tests in `test_models.py`, `test_scenario_registry.py` |
| Route 404 run/coba-state | **Closed** | `test_routes.py` (2 tests) |
| `_truncated_normal` dead code | **Removed** | `coba_adapter_real.py` |
| `_coerce_hyperparam` bool | **Closed** | `test_coba_adapter.py` |
| `ControlBar.tsx` | **Closed** | `control-bar.test.tsx` (5 tests) |
| A10b `StepFeedEntry` | **Closed** | `step-feed-entry.test.tsx` (2 tests) |
| UI primitives | **Closed** | `primitives.test.tsx` (15 tests) |
| Playground page / landing / layout | **Closed** | `page.test.tsx`, `landing.test.tsx`, `layout.test.tsx` |
| Visual regression | **Closed** | `e2e/visual-regression.spec.ts` + 3 PNG baselines |
| pytest-cov / vitest coverage | **Closed** | `pyproject.toml`, `package.json`, `vitest.config.ts` |

**Residual (acceptable):** `simulator.py` defensive branch (1 line), `context_sampling.py` fallback (1 line), `config.py` CORS env edge cases.

---

## Post follow-up plan (2026-05-27)

Implemented per [2026-05-27-test-coverage-follow-up.md](./superpowers/plans/2026-05-27-test-coverage-follow-up.md):

| Item | Status |
|------|--------|
| CI backend `--cov-fail-under=95` | Done |
| CI frontend `pnpm test:coverage` + 70% line threshold | Done |
| CI Playwright `e2e` job | Done |
| Page tests: glossary, results, settings, landing | Done |
| Chart tests: CumRewards, DualRegret, PullDist | Done |
| Landing: AlgoStrip, ConceptCards, ScenarioShowcase | Done |
| E2E all 16 algorithms (`e2e/fixtures/algorithms.ts`) | Done |
| Compare page unit tests | Done |
| Playground `act` warnings | Done |
| Global ResizeObserver in `test-setup.ts` | Done |

---

## Document history

| Date | Change |
|------|--------|
| 2026-05-27 | Initial report from pytest-cov + vitest run + import-graph analysis |
| 2026-05-27 | QA/QC review: verified backend/frontend unit commands, corrected E2E count to 26, expanded backend gap findings |
| 2026-05-27 | Post gap-closure: 364 tests, 99% backend coverage, visual baselines committed |
| 2026-05-27 | Follow-up plan: 395 tests, 92.89% frontend lines, CI gates + 16-algorithm E2E |
