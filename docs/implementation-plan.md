# Coba Backend Core — Test-Driven Implementation Plan

> **Status:** Active implementation — phases 0–7 complete, 58 backend + 48 frontend tests passing
> **Date:** 2026-05-26
> **Methodology:** Test-Driven Development (Red → Green → Refactor)
> **Principles:** DRY, SOLID, OOP
> **Repo:** `coba-edu/` (monorepo: `frontend/` + `backend/`)
> **Dogfooding note:** `coba` library installed as dependency. `CobaLibraryAdapter` wraps real `ClusterBandit`. Bug found: `EpsilonGreedyArmModel` missing `base_estimator` passthrough in `ClusterBandit`.

---

## 0. Overview

Build a **Python backend** that wraps the [`coba`](https://github.com/dmoreq/coba) bandit library, exposing a FastAPI REST API. The existing Next.js frontend replaces its built-in TypeScript simulation engine with API calls to this backend. Every phase follows strict TDD. The frontend gets a **comprehensive refactoring pass** before integration to eliminate DRY/SOLID violations accumulated during rapid prototyping.

### Key Decisions

| Decision | Choice |
|----------|--------|
| Feature scope | Full `coba` library capabilities |
| Web framework | FastAPI (async, Pydantic v2) |
| Package manager | `uv` (PEP 621) |
| Deployment model | Local server (`localhost:8000`) |
| Testing | TDD — tests written before code in every phase |
| Code quality | Pre-commit hooks (ruff + biome) on entire monorepo |

### Test Layer Definitions

| Layer | Scope | Tools | Runs |
|-------|-------|-------|------|
| **Unit** | Single function/class in isolation, all deps mocked | pytest, vitest | `uv run pytest`, `pnpm test:run` |
| **Integration** | Multiple units working together (routes + services, store + api) | pytest + httpx.TestClient, vitest + mocked fetch | Same as unit |
| **Contract** | Request/response shape matches between frontend types and backend schemas | Snapshot comparison | CI only |
| **E2E** | Full user flow with real backend + frontend | Playwright | `pnpm test:e2e` |

---

## 1. Architecture Principles

These govern all code — new backend and refactored frontend alike.

### 1.1 DRY (Don't Repeat Yourself)

| Violation Found | Fix |
|----------------|-----|
| `AlgorithmSelector` duplicated in ControlBar, ComparePage, SettingsPage | Extract `<AlgorithmSelector>` shared component |
| `SpeedSelector` duplicated in ControlBar, ComparePage | Extract `<SpeedSelector>` shared component |
| `PlaybackControls` (Step + Play/Pause buttons) duplicated in ControlBar, ComparePage | Extract `<PlaybackControls>` shared component |
| `TruthToggle` duplicated in EnvPanel, ComparePage, Hero | Extract `<TruthToggle>` shared component |
| `EmptyChart` placeholder duplicated in 3 chart components | Extract `<EmptyChart>` shared component |
| `useSimulationRunner` auto-play `useEffect` duplicated in PlaygroundPage, ComparePage | Extract `useSimulationRunner()` custom hook |
| `playground/Panel.tsx` is a duplicate of `ui/Panel.tsx` | Delete `playground/Panel.tsx`, use `ui/Panel` everywhere |
| SettingsPage defines local `Card` and `SectionHeader` that duplicate `ui/` versions | Delete local definitions, import from `ui/` |
| Page shell (`<div> <Header/> <div>...`) duplicated in all 7 pages | Extract `<PageShell>` layout component |
| Inline Sliders in SettingsPage duplicate `ui/Slider.tsx` | Replace all inline sliders with `<Slider>` |
| Recharts axis/tooltip/grid config duplicated in 3 chart files | Extract `src/lib/chart-theme.ts` shared config |
| `ALGO_PILLS` in AlgoStrip duplicates `ALGO_META` shape | Use `ALGO_META` entries directly |
| `Record<string, string>` for algo-keyed maps in 3 files | Change to `Record<AlgorithmId, string>` |
| Magic `150` history cap in `step.ts` and `RegretLineChart.tsx` | Extract `MAX_HISTORY_LENGTH` constant |
| Hardcoded defaults `seed: 42`, `speed: 2`, `alpha: 2.0`, `epsilon: 0.1` | Extract to `DEFAULT_SEED`, `DEFAULT_SPEED`, etc. in constants |
| `DEFAULT_ARMS` colors hardcoded in 8+ component files | Reference `arm.color` / `arm.lightColor` or `ALGO_META` consistently |

### 1.2 SOLID Principles

**S — Single Responsibility:**

| Violation | Fix |
|-----------|-----|
| `ComparePage` (243 lines) — manages simulation state, auto-play, UI rendering | Split into `CompareControlBar`, `CompareSimStats`, `CompareColumn`, `CompareRegretSection` |
| `SettingsPage` (255 lines) — manages form state, arm CRUD, settings apply, UI rendering | Split into `ArmConfigSection`, `AlgorithmConfigSection`, `SeedConfigSection` |
| `ControlBar` (96 lines) — algo selection, playback controls, speed control | Split — reuse extracted `AlgorithmSelector`, `PlaybackControls`, `SpeedSelector` |
| `useSimulationStore` mixes engine state (`simState`, `rngRef`) with UI state (`isRunning`, `speed`) | After migration: engine state comes from backend; UI state stays. If needed, split into `useSimulationStore` + `usePlaybackStore` |
| `engine/index.ts` uses `export *` — leaks all internals | Replace with explicit named exports (only public API) |

**O — Open/Closed:**

| Application | How |
|-------------|-----|
| `CobaAdapter` policy dispatch | Open for extension (add new algorithm → add map entry), closed for modification (no switch-case in step logic) |
| Chart components | Share a `ChartTheme` config object — extend by adding entries, not modifying component internals |

**L — Liskov Substitution:**

| Application | How |
|-------------|-----|
| `SimulationService` | Define `AbstractSimulationService` interface. In-memory implementation and future DB-backed implementation both satisfy the same contract. |
| FastAPI dependency injection | Routes depend on the abstract interface, not the concrete service. Swap implementations without changing routes. |

**I — Interface Segregation:**

| Violation | Fix |
|-----------|-----|
| Components receive full `SimState` but use 2–3 fields | Components declare slim props interfaces with only what they need. Pages select from store and spread. |
| `applySettings(arms, algo, alpha, epsilon)` takes 4 positional params | Change to `applySettings(payload: SettingsPayload)` — single object param |
| `reset(algo?)` accepts optional algo | After migration: `reset(payload: { algorithm?: AlgorithmId })` |

**D — Dependency Inversion:**

| Violation/Application | How |
|-----------------------|-----|
| Components import from `@/engine/*` directly | After migration: components import only from `@/lib/types` (shared types) and `@/store` (state). No direct backend coupling. |
| Frontend API client | Depends on `ApiClient` interface, not `fetch` directly. Mockable in tests. |
| Backend routes | Depend on `SimulationService` interface, injected via FastAPI `Depends()`. Testable with mock service. |

### 1.3 OOP Patterns

| Pattern | Where | Purpose |
|---------|-------|---------|
| **Adapter** | `CobaAdapter` class | Translates between coba library types and our Pydantic models |
| **Service** | `SimulationService` class | Encapsulates simulation lifecycle (create, step, run, delete, results) |
| **Dependency Injection** | FastAPI `Depends(get_simulation_service)` | Routes receive service via DI — testable, swappable |
| **Repository** | In-memory `dict[UUID, Simulation]` | Simple repository pattern; replaceable with DB-backed version later |
| **Factory** | `CobaAdapter.create_policy(algorithm, hyperparams)` | Creates the right policy object from string ID + params |
| **Strategy** | Policy classes from coba library | Each algorithm is a strategy; `CobaAdapter` selects the right one |
| **Template Method** | `BaseChart` (new) — shared axis/tooltip/grid config | Chart components inherit shared Recharts configuration |
| **Hook** (React) | `useSimulationRunner`, `useSimulation` | Encapsulate cross-cutting simulation concerns |

---

## 2. Shared Type Contract

Before any code, define the shared contract. Both sides validate against it.

```json
{
  "Arm": { "id": "string", "label": "string", "true_prob": "number 0-1", "color": "string?", "light_color": "string?" },
  "ArmState": { "n": "int>=0", "successes": "int>=0", "failures": "int>=0" },
  "Score": { "mean": "float", "bonus": "float", "score": "float", "sample": "float?", "formula": "string" },
  "StepRecord": { "t": "int", "chosen_idx": "int", "outcome": "0|1", "step_regret": "float", "cum_regret": "float", "scores": "Score[]", "context": "float[]?", "was_random": "bool", "true_prob": "float" },
  "SimState": { "t": "int", "arms": "Arm[]", "arm_states": "ArmState[]", "history": "StepRecord[]", "regret_history": "float[]" },
  "CreateSimRequest": { "arms": "Arm[] (2-10)", "algorithm": "AlgorithmId", "hyperparams": "dict?", "seed": "int" },
  "Simulation": { "id": "uuid", "state": "SimState", "algorithm": "AlgorithmId", "seed": "int" },
  "StepResponse": { "t": "int", "step": "StepRecord", "arm_states": "ArmState[]", "regret_history": "float[]" },
  "RunResponse": { "steps_run": "int", "final_t": "int", "history": "StepRecord[]", "regret_history": "float[]", "arm_states": "ArmState[]" }
}
```

---

## 3. Project Structure (Post-Refactor)

```
coba-edu/                               # Monorepo root
├── .pre-commit-config.yaml             # NEW: pre-commit hooks (ruff + biome)
├── .github/
│   └── workflows/
│       └── ci.yml                      # NEW: CI pipeline (lint + test both sides)
├── Makefile                            # NEW: dev, test, lint, format targets
│
├── frontend/                           # Existing Next.js (heavily refactored)
│   ├── src/
│   │   ├── app/                        # 6 screens (unchanged structure)
│   │   │   ├── layout.tsx             # Uses <PageShell>
│   │   │   ├── page.tsx               # Landing
│   │   │   ├── playground/page.tsx     # Refactored: uses hooks, no dead imports
│   │   │   ├── compare/page.tsx        # Refactored: split into sub-components
│   │   │   ├── settings/page.tsx       # Refactored: split into sub-components
│   │   │   ├── results/page.tsx        # Unchanged
│   │   │   └── glossary/page.tsx       # Unchanged
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── LogoMark.tsx
│   │   │   │   └── PageShell.tsx       # NEW: shared page shell
│   │   │   ├── ui/                     # Unchanged (7 components)
│   │   │   ├── charts/
│   │   │   │   ├── RegretLineChart.tsx  # Refactored: uses ChartTheme
│   │   │   │   ├── PullDistChart.tsx    # Refactored: uses ChartTheme
│   │   │   │   ├── DualRegretChart.tsx  # Refactored: uses ChartTheme
│   │   │   │   └── BetaCurve.tsx
│   │   │   ├── shared/                 # NEW: shared simulation UI components
│   │   │   │   ├── AlgorithmSelector.tsx
│   │   │   │   ├── SpeedSelector.tsx
│   │   │   │   ├── PlaybackControls.tsx
│   │   │   │   ├── TruthToggle.tsx
│   │   │   │   └── EmptyChart.tsx
│   │   │   ├── playground/
│   │   │   │   ├── ControlBar.tsx       # Refactored: uses shared components
│   │   │   │   ├── EnvPanel.tsx         # Refactored: uses TruthToggle
│   │   │   │   ├── WhyPanel.tsx
│   │   │   │   ├── StepFeed.tsx
│   │   │   │   └── StepFeedEntry.tsx
│   │   │   ├── estimates/
│   │   │   ├── landing/
│   │   │   ├── compare/
│   │   │   │   ├── CompareControlBar.tsx  # NEW
│   │   │   │   ├── CompareSimStats.tsx    # NEW
│   │   │   │   ├── CompareColumn.tsx      # NEW
│   │   │   │   └── CompareRegretSection.tsx # NEW
│   │   │   ├── settings/
│   │   │   │   ├── ArmConfigSection.tsx    # NEW
│   │   │   │   ├── AlgorithmConfigSection.tsx # NEW
│   │   │   │   └── SeedConfigSection.tsx  # NEW
│   │   │   ├── results/
│   │   │   └── glossary/
│   │   ├── hooks/
│   │   │   ├── useSimulationRunner.ts  # NEW: shared auto-play hook
│   │   │   └── useSimulation.ts        # NEW: shared store access hook
│   │   ├── lib/
│   │   │   ├── api.ts                  # NEW: typed fetch wrapper
│   │   │   ├── types.ts               # MOVED: from engine/types.ts
│   │   │   ├── constants.ts           # MOVED: ALGO_META + new shared constants
│   │   │   ├── chart-theme.ts         # NEW: shared Recharts config
│   │   │   └── index.ts               # Barrel
│   │   ├── store/
│   │   │   ├── simulation.ts          # REWRITTEN: async API client
│   │   │   ├── navigation.ts          # Unchanged
│   │   │   └── index.ts              # Updated exports
│   │   └── styles/
│   ├── package.json
│   └── ...
│
├── backend/                            # NEW: Python backend
│   ├── pyproject.toml
│   ├── uv.lock
│   ├── src/
│   │   └── coba_server/
│   │       ├── __init__.py
│   │       ├── main.py                 # FastAPI app + CORS + DI setup
│   │       ├── config.py               # pydantic-settings
│   │       ├── di.py                   # NEW: dependency injection container
│   │       ├── models/
│   │       │   ├── __init__.py
│   │       │   ├── simulation.py       # Pydantic models
│   │       │   └── algorithms.py
│   │       ├── routes/
│   │       │   ├── __init__.py
│   │       │   ├── health.py
│   │       │   ├── simulate.py
│   │       │   └── algorithms.py
│   │       ├── services/
│   │       │   ├── __init__.py
│   │       │   ├── base.py             # NEW: AbstractSimulationService ABC
│   │       │   ├── simulator.py        # InMemorySimulationService
│   │       │   └── coba_adapter.py     # CobaAdapter class
│   │       └── utils/
│   │           ├── __init__.py
│   │           └── rng.py
│   └── tests/
│       ├── __init__.py
│       ├── conftest.py
│       ├── test_models.py
│       ├── test_coba_adapter.py
│       ├── test_simulator_service.py
│       └── test_routes.py
│
└── .commandcode/
    └── plans/
        └── coba-backend-integration.md
```

---

## 4. Implementation Phases (TDD)

---

### Phase 0: Monorepo Setup + Pre-commit Hooks

**Conventional Commit:** `chore: setup monorepo tooling with pre-commit hooks`

#### Test Specs (Write First)

**File:** `.pre-commit-config.yaml` (config, not test — verified manually)

| Test ID | Layer | Test Name | What It Verifies |
|---------|-------|-----------|------------------|
| `U-HOOK-01` | Unit | `test_ruff_passes_on_clean_code` | `ruff check backend/src/` exits 0 on compliant Python |
| `U-HOOK-02` | Unit | `test_ruff_formats_code` | `ruff format --check` detects unformatted Python |
| `U-HOOK-03` | Unit | `test_biome_passes_on_clean_code` | `biome check frontend/src/` exits 0 on compliant TS/TSX |
| `U-HOOK-04` | Unit | `test_biome_formats_code` | `biome format --check` detects unformatted TS/TSX |
| `U-HOOK-05` | Unit | `test_pre_commit_config_exists` | `.pre-commit-config.yaml` exists at repo root with ruff + biome hooks |

#### Implementation Tasks

| # | Task | Files |
|---|------|-------|
| 0.1 | Create `.pre-commit-config.yaml` at repo root with hooks for ruff (backend) and biome (frontend) | `.pre-commit-config.yaml` |
| 0.2 | Create `.github/workflows/ci.yml` — runs lint + test on both sides on push | `.github/workflows/ci.yml` |
| 0.3 | Create root `Makefile` with targets: `dev`, `test`, `lint`, `format`, `install` | `Makefile` |
| 0.4 | Install pre-commit: `uv tool install pre-commit && pre-commit install` | — |
| 0.5 | Verify: `pre-commit run --all-files` passes on existing code | — |

#### Pre-commit Config

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.11.0
    hooks:
      - id: ruff
        args: [--fix]
        files: ^backend/
      - id: ruff-format
        files: ^backend/

  - repo: local
    hooks:
      - id: biome-check
        name: biome check
        entry: bash -c 'cd frontend && pnpm biome check src/ --error-on-warnings'
        language: system
        files: ^frontend/
        pass_filenames: false
      - id: biome-format
        name: biome format
        entry: bash -c 'cd frontend && pnpm biome format src/ --write'
        language: system
        files: ^frontend/
        pass_filenames: false
```

#### CI Pipeline

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v5
      - run: cd backend && uv sync --dev
      - run: cd backend && uv run ruff check src/
      - run: cd backend && uv run pytest -v

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'pnpm', cache-dependency-path: frontend/pnpm-lock.yaml }
      - run: cd frontend && pnpm install
      - run: cd frontend && pnpm biome check src/
      - run: cd frontend && pnpm test:run
```

#### Red→Green→Refactor Cycle

1. **RED:** Create `.pre-commit-config.yaml`. Run `pre-commit run --all-files` — may fail on existing unformatted code.
2. **GREEN:** Fix any existing formatting issues so all hooks pass.
3. **REFACTOR:** Clean up any ad-hoc formatting scripts — everything is automated now.

---

### Phase 1: Frontend Refactoring — Extract Shared Components + Fix DRY

**Conventional Commit:** `refactor(frontend): extract shared simulation UI components and fix DRY violations`

> This phase fixes ALL DRY violations before the backend integration. Clean code first, then migrate.

#### Test Specs (Write First)

**File:** `frontend/src/components/shared/__tests__/algorithm-selector.test.tsx`

| Test ID | Layer | Test Name | What It Verifies |
|---------|-------|-----------|------------------|
| `U-SHR-01` | Unit | `test_algorithm_selector_renders_all_algorithms` | Renders one button per algorithm in `ALGO_META` |
| `U-SHR-02` | Unit | `test_algorithm_selector_active_styling` | Selected algorithm has accent background and white text |
| `U-SHR-03` | Unit | `test_algorithm_selector_calls_on_change` | Clicking a button calls `onChange` with the algorithm ID |

**File:** `frontend/src/components/shared/__tests__/speed-selector.test.tsx`

| Test ID | Layer | Test Name | What It Verifies |
|---------|-------|-----------|------------------|
| `U-SHR-04` | Unit | `test_speed_selector_renders_all_speeds` | Renders one button per speed option |
| `U-SHR-05` | Unit | `test_speed_selector_active_styling` | Active speed button has blue background |
| `U-SHR-06` | Unit | `test_speed_selector_calls_on_change` | Clicking a speed button calls `onChange` |

**File:** `frontend/src/components/shared/__tests__/playback-controls.test.tsx`

| Test ID | Layer | Test Name | What It Verifies |
|---------|-------|-----------|------------------|
| `U-SHR-07` | Unit | `test_step_button_calls_on_step` | Clicking Step calls `onStep` |
| `U-SHR-08` | Unit | `test_play_button_shows_pause_when_running` | When `isRunning=true`, button shows Pause text |
| `U-SHR-09` | Unit | `test_play_button_shows_play_when_stopped` | When `isRunning=false`, button shows Play text |

**File:** `frontend/src/components/shared/__tests__/truth-toggle.test.tsx`

| Test ID | Layer | Test Name | What It Verifies |
|---------|-------|-----------|------------------|
| `U-SHR-10` | Unit | `test_truth_toggle_shows_hide_when_revealed` | When `revealed=true`, shows "Hide truth" |
| `U-SHR-11` | Unit | `test_truth_toggle_shows_reveal_when_hidden` | When `revealed=false`, shows "Reveal truth" |

**File:** `frontend/src/components/shared/__tests__/empty-chart.test.tsx`

| Test ID | Layer | Test Name | What It Verifies |
|---------|-------|-----------|------------------|
| `U-SHR-12` | Unit | `test_empty_chart_renders_message` | Renders the provided message text |

**File:** `frontend/src/hooks/__tests__/use-simulation-runner.test.ts`

| Test ID | Layer | Test Name | What It Verifies |
|---------|-------|-----------|------------------|
| `U-SHR-13` | Unit | `test_runner_calls_step_repeatedly_when_running` | When `isRunning=true`, `step` is called at intervals |
| `U-SHR-14` | Unit | `test_runner_stops_when_paused` | When `isRunning=false`, no more calls |
| `U-SHR-15` | Unit | `test_runner_cleanup_on_unmount` | Interval is cleared when component unmounts |

#### Implementation Tasks

| # | Task | Files |
|---|------|-------|
| 1.1 | Create `src/components/shared/AlgorithmSelector.tsx` | New |
| 1.2 | Create `src/components/shared/SpeedSelector.tsx` | New |
| 1.3 | Create `src/components/shared/PlaybackControls.tsx` | New |
| 1.4 | Create `src/components/shared/TruthToggle.tsx` | New |
| 1.5 | Create `src/components/shared/EmptyChart.tsx` | New |
| 1.6 | Create `src/components/layout/PageShell.tsx` | New |
| 1.7 | Create `src/hooks/useSimulationRunner.ts` | New |
| 1.8 | Create `src/lib/chart-theme.ts` with shared Recharts config | New |
| 1.9 | Create `src/lib/constants.ts` — move `ALGO_META` + add `DEFAULT_SEED`, `DEFAULT_SPEED`, `MAX_HISTORY_LENGTH` | New |
| 1.10 | Create barrel `src/components/shared/index.ts` | New |
| 1.11 | Update `ControlBar.tsx` — use AlgorithmSelector, SpeedSelector, PlaybackControls | Modify |
| 1.12 | Update playground `EnvPanel.tsx` — use TruthToggle | Modify |
| 1.13 | Update `app/compare/page.tsx` — use shared components | Modify |
| 1.14 | Update `app/settings/page.tsx` — delete local Card/SectionHeader, use `ui/` versions; replace inline sliders with `<Slider>` | Modify |
| 1.15 | Update all chart components — use `chart-theme.ts` and `EmptyChart` | Modify |
| 1.16 | Update all pages — wrap in `<PageShell>` instead of duplicated shell | Modify |
| 1.17 | Update `engine/constants.ts` — add `DEFAULT_SEED=42`, `DEFAULT_SPEED=2`, `MAX_HISTORY_LENGTH=150` | Modify |
| 1.18 | Update `engine/step.ts` — use `MAX_HISTORY_LENGTH` constant | Modify |
| 1.19 | Update `RegretLineChart.tsx` — use `MAX_HISTORY_LENGTH` for downsampling | Modify |
| 1.20 | Update `store/simulation.ts` — use `DEFAULT_SEED`, `DEFAULT_SPEED` constants | Modify |
| 1.21 | Update `AlgoStrip.tsx` — use `ALGO_META` entries instead of separate `ALGO_PILLS` | Modify |
| 1.22 | Fix `Record<string, string>` → `Record<AlgorithmId, string>` in FormulaPanel, UCBDisplay, WhyPanel | Modify |
| 1.23 | Fix `engine/index.ts` — replace `export *` with explicit named exports | Modify |
| 1.24 | Delete `playground/Panel.tsx` — use `ui/Panel` everywhere | Delete |
| 1.25 | Run `pnpm tsc --noEmit` — fix all type errors | — |
| 1.26 | Run `pnpm test:run` — all existing tests still pass | — |

#### Red→Green→Refactor Cycle

1. **RED:** Write all 15 shared component tests — fail (components don't exist yet).
2. **GREEN:** Create all shared components. Write additional tests for settings/compare refactoring. Implement all refactoring tasks. All 15 new tests + all existing tests pass.
3. **REFACTOR:** Review all 26 components for any remaining DRY violations. Run `biome format` and `biome check`.

#### Commit Split

```
refactor(frontend): extract shared UI components (AlgorithmSelector, SpeedSelector, PlaybackControls, TruthToggle, EmptyChart)
refactor(frontend): extract PageShell layout and useSimulationRunner hook
refactor(frontend): extract ChartTheme config and add shared constants
refactor(frontend): fix DRY violations in ComparePage, SettingsPage, ControlBar
refactor(frontend): fix type safety (Record<AlgorithmId>, explicit exports, delete dead code)
```

---

### Phase 2: Frontend Refactoring — SOLID Cleanup + Compare/Settings Split

**Conventional Commit:** `refactor(frontend): apply SOLID principles — split monolith pages and fix coupling`

#### Test Specs (Write First)

**File:** `frontend/src/components/compare/__tests__/compare-column.test.tsx`

| Test ID | Layer | Test Name | What It Verifies |
|---------|-------|-----------|------------------|
| `U-CMPR-01` | Unit | `test_compare_column_renders_algorithm_name` | Column header shows algorithm label |
| `U-CMPR-02` | Unit | `test_compare_column_shows_stats_when_data_available` | When simState has t>0, stat cards render |
| `U-CMPR-03` | Unit | `test_compare_column_shows_empty_when_no_data` | When t=0, shows "No data yet" |

**File:** `frontend/src/components/compare/__tests__/compare-controls.test.tsx`

| Test ID | Layer | Test Name | What It Verifies |
|---------|-------|-----------|------------------|
| `U-CMPR-04` | Unit | `test_race_button_starts_running` | Clicking Race sets isRunning to true |
| `U-CMPR-05` | Unit | `test_reset_button_resets` | Clicking Reset calls onReset |

**File:** `frontend/src/components/settings/__tests__/arm-config.test.tsx`

| Test ID | Layer | Test Name | What It Verifies |
|---------|-------|-----------|------------------|
| `U-SET-01` | Unit | `test_arm_config_renders_all_arms` | Renders one slider row per arm |
| `U-SET-02` | Unit | `test_arm_config_add_arm` | Clicking Add increases arm count |
| `U-SET-03` | Unit | `test_arm_config_remove_arm` | Clicking Remove decreases arm count |
| `U-SET-04` | Unit | `test_arm_config_min_two_arms` | Cannot remove if only 2 arms remain |

**File:** `frontend/src/components/settings/__tests__/algorithm-config.test.tsx`

| Test ID | Layer | Test Name | What It Verifies |
|---------|-------|-----------|------------------|
| `U-SET-05` | Unit | `test_algorithm_config_shows_alpha_for_ucb1` | When UCB1 selected, alpha slider visible |
| `U-SET-06` | Unit | `test_algorithm_config_shows_epsilon_for_epsilon` | When ε-Greedy selected, epsilon slider visible |
| `U-SET-07` | Unit | `test_algorithm_config_hides_alpha_for_thompson` | When Thompson selected, no alpha slider |

#### Implementation Tasks

| # | Task | Files |
|---|------|-------|
| 2.1 | Split `app/compare/page.tsx` → `CompareControlBar`, `CompareSimStats`, `CompareColumn`, `CompareRegretSection` | New component files + modify page |
| 2.2 | `ComparePage` becomes thin: composes sub-components, delegates simulation to store | `app/compare/page.tsx` |
| 2.3 | Split `app/settings/page.tsx` → `ArmConfigSection`, `AlgorithmConfigSection`, `SeedConfigSection` | New component files + modify page |
| 2.4 | `SettingsPage` becomes thin: composes sections, `useState` → `useSimulationStore` (single source of truth) | `app/settings/page.tsx` |
| 2.5 | Fix `ApplySettings` contract: `applySettings(arms, algo, alpha, epsilon)` → `applySettings(payload: SettingsPayload)` | `store/simulation.ts`, callers |
| 2.6 | Remove dead imports from `playground/page.tsx` (unused `createInitialSimState`, `runStep`, `makeRng`) | `app/playground/page.tsx` |
| 2.7 | Replace `rngRef` in playground page with `useSimulationStore` seed sync | `app/playground/page.tsx` |
| 2.8 | Move hardcoded hex colors from components → reference `lib/constants.ts` or `ALGO_META` | ~8 files |

#### Red→Green→Refactor Cycle

1. **RED:** Write all 10 tests — fail (components don't exist yet).
2. **GREEN:** Create compare + settings sub-components. Test. Wire into pages. All tests pass.
3. **REFACTOR:** Verify all pages use `<PageShell>`, all components use shared primitives, zero `@/engine/*` imports from components.

---

### Phase 3: Backend Scaffolding + Health Endpoint

**Conventional Commit:** `feat(backend): scaffold FastAPI project with health endpoint`

#### Test Specs (Write First)

**File:** `backend/tests/test_health.py`

| Test ID | Layer | Test Name | What It Verifies |
|---------|-------|-----------|------------------|
| `U-HLTH-01` | Unit | `test_health_route_returns_200` | `GET /api/health` returns `{"status": "ok"}` with 200 |
| `U-HLTH-02` | Unit | `test_cors_headers_present` | Response includes `access-control-allow-origin` |
| `U-HLTH-03` | Unit | `test_openapi_docs_accessible` | `GET /docs` returns 200 |
| `U-HLTH-04` | Unit | `test_config_loads_from_env` | `Settings` class reads `HOST` and `PORT` from env with defaults |

**File:** `backend/tests/test_scaffold.py`

| Test ID | Layer | Test Name | What It Verifies |
|---------|-------|-----------|------------------|
| `U-SCF-01` | Unit | `test_package_imports` | `import coba_server` succeeds |
| `U-SCF-02` | Unit | `test_pyproject_dependencies_resolve` | All core deps are importable |

#### Implementation Tasks

| # | Task | Files |
|---|------|-------|
| 3.1 | `uv init --package backend` in `coba-edu/` | `backend/pyproject.toml` |
| 3.2 | Add deps: fastapi, uvicorn, pydantic, pydantic-settings, numpy, scipy | `backend/pyproject.toml` |
| 3.3 | Create package structure with `__init__.py` files | All `__init__.py` |
| 3.4 | Create `config.py` with `Settings` class | `src/coba_server/config.py` |
| 3.5 | Create FastAPI app + health route + CORS middleware | `src/coba_server/main.py`, `routes/health.py` |
| 3.6 | Create `conftest.py` with `TestClient` fixture | `tests/conftest.py` |

#### Red→Green→Refactor

1. **RED:** Write 6 tests — all fail.
2. **GREEN:** Implement — all pass.
3. **REFACTOR:** Clean imports, ensure consistent `__init__.py` re-exports.

---

### Phase 4: Pydantic Models + Validation

**Conventional Commit:** `feat(backend): add Pydantic models for simulation API contract`

| Test ID | Layer | Test Name |
|---------|-------|-----------|
| `U-MDL-01` | Unit | `test_arm_config_valid` |
| `U-MDL-02` | Unit | `test_arm_config_invalid_prob_negative` |
| `U-MDL-03` | Unit | `test_arm_config_invalid_prob_over_one` |
| `U-MDL-04` | Unit | `test_create_sim_request_min_arms` (1 arm → error) |
| `U-MDL-05` | Unit | `test_create_sim_request_max_arms` (11 arms → error) |
| `U-MDL-06` | Unit | `test_create_sim_request_defaults` (algorithm→ucb1, seed→42) |
| `U-MDL-07` | Unit | `test_create_sim_request_invalid_algorithm` |
| `U-MDL-08` | Unit | `test_simulation_auto_uuid` |
| `U-MDL-09` | Unit | `test_step_record_outcome_binary` (outcome=2 → error) |
| `U-MDL-10` | Unit | `test_arm_state_non_negative` |
| `U-MDL-11` | Unit | `test_score_sample_optional_none` |
| `U-MDL-12` | Unit | `test_sim_state_empty_history` |
| `U-MDL-13` | Unit | `test_run_request_steps_positive` |
| `U-MDL-14` | Unit | `test_model_json_roundtrip` |

**14 tests.** Red → Green → Refactor.

---

### Phase 5: Coba Adapter (Isolated, Mocked)

**Conventional Commit:** `feat(backend): add CobaAdapter with policy factory and result translation`

> **Pre-step:** Install coba from git, explore its source, document actual API surface. Adapter must match reality.

| Test ID | Layer | Test Name |
|---------|-------|-----------|
| `U-ADP-01` | Unit | `test_create_environment_from_arm_configs` |
| `U-ADP-02` | Unit | `test_create_environment_single_arm` |
| `U-ADP-03` | Unit | `test_create_policy_ucb1` |
| `U-ADP-04` | Unit | `test_create_policy_epsilon_greedy` |
| `U-ADP-05` | Unit | `test_create_policy_thompson` |
| `U-ADP-06` | Unit | `test_create_policy_linucb` |
| `U-ADP-07` | Unit | `test_create_policy_unknown_algorithm_raises` |
| `U-ADP-08` | Unit | `test_to_step_record_maps_fields_correctly` |
| `U-ADP-09` | Unit | `test_to_step_record_contextual_populates_context` |
| `U-ADP-10` | Unit | `test_to_step_record_non_contextual_context_is_none` |
| `U-ADP-11` | Unit | `test_to_step_record_outcome_is_binary` |
| `U-ADP-12` | Unit | `test_to_step_record_regret_non_negative` |
| `U-ADP-13` | Unit | `test_list_supported_algorithms` |
| `U-ADP-14` | Unit | `test_list_supported_algorithms_has_minimum_set` |

**14 tests.** Red → Green → Refactor.

Design note — `CobaAdapter` follows the Adapter pattern:
```python
class CobaAdapter:
    """Translates coba library types ↔ our Pydantic models."""

    # Single dispatch map — add new algorithm = add one line here (Open/Closed)
    POLICY_MAP: ClassVar[dict[str, type[Policy]]] = { ... }

    def create_environment(self, arms: list[ArmConfig]) -> coba.Environment: ...
    def create_policy(self, algorithm: str, hyperparams: dict) -> Policy: ...
    def run_step(self, env, policy) -> dict: ...
    def to_step_record(self, raw_result) -> StepRecord: ...
    def get_supported_algorithms(self) -> list[AlgorithmInfo]: ...
```

---

### Phase 6: Simulation Service (In-Memory Store)

**Conventional Commit:** `feat(backend): add SimulationService with AbstractSimulationService interface`

#### SOLID Design

```python
# services/base.py — Abstract base (Dependency Inversion)
from abc import ABC, abstractmethod

class AbstractSimulationService(ABC):
    @abstractmethod
    def create(self, req: CreateSimRequest) -> Simulation: ...
    @abstractmethod
    def get(self, id: UUID) -> Simulation | None: ...
    @abstractmethod
    def step(self, id: UUID) -> StepRecord: ...
    @abstractmethod
    def run(self, id: UUID, steps: int) -> RunResponse: ...
    @abstractmethod
    def delete(self, id: UUID) -> None: ...
    @abstractmethod
    def get_results(self, id: UUID) -> ResultsResponse: ...

# services/simulator.py — Concrete implementation
class InMemorySimulationService(AbstractSimulationService):
    def __init__(self, adapter: CobaAdapter):
        self._simulations: dict[UUID, Simulation] = {}
        self._adapter = adapter
    # ... all methods ...

# di.py — Dependency Injection container
from functools import lru_cache

@lru_cache()
def get_simulation_service() -> AbstractSimulationService:
    adapter = CobaAdapter()
    return InMemorySimulationService(adapter)
```

Routes depend on the abstract interface:
```python
@router.post("/api/simulate")
async def create_simulation(
    req: CreateSimRequest,
    service: AbstractSimulationService = Depends(get_simulation_service),
) -> Simulation:
    return service.create(req)
```

| Test ID | Layer | Test Name |
|---------|-------|-----------|
| `U-SIM-01` | Unit | `test_create_returns_simulation_with_id` |
| `U-SIM-02` | Unit | `test_create_initializes_arm_states_to_zero` |
| `U-SIM-03` | Unit | `test_create_stores_simulation_in_memory` |
| `U-SIM-04` | Unit | `test_get_returns_none_for_unknown_id` |
| `U-SIM-05` | Unit | `test_step_increments_t` |
| `U-SIM-06` | Unit | `test_step_adds_to_history` |
| `U-SIM-07` | Unit | `test_step_updates_chosen_arm_state` |
| `U-SIM-08` | Unit | `test_step_returns_step_record` |
| `U-SIM-09` | Unit | `test_step_on_unknown_id_raises` |
| `U-SIM-10` | Unit | `test_run_steps_correct_count` |
| `U-SIM-11` | Unit | `test_run_returns_all_history` |
| `U-SIM-12` | Unit | `test_run_zero_steps_noop` |
| `U-SIM-13` | Unit | `test_delete_removes_simulation` |
| `U-SIM-14` | Unit | `test_delete_unknown_id_no_error` |
| `U-SIM-15` | Unit | `test_multiple_simulations_independent` |
| `U-SIM-16` | Unit | `test_history_capped_at_150` |

#### Determinism Tests

| Test ID | Layer | Test Name |
|---------|-------|-----------|
| `U-DET-01` | Integration | `test_same_seed_same_results_ucb1_10steps` |
| `U-DET-02` | Integration | `test_same_seed_same_results_epsilon_10steps` |
| `U-DET-03` | Integration | `test_different_seeds_different_results` |

**19 tests.** Red → Green → Refactor.

---

### Phase 7: REST API Routes (FastAPI Endpoints)

**Conventional Commit:** `feat(backend): implement REST API routes for simulation lifecycle`

| Test ID | Layer | Test Name |
|---------|-------|-----------|
| `I-RTE-01` | Integration | `test_create_simulation_returns_201` |
| `I-RTE-02` | Integration | `test_create_simulation_response_has_id_and_state` |
| `I-RTE-03` | Integration | `test_create_simulation_invalid_body_returns_422` |
| `I-RTE-04` | Integration | `test_create_simulation_too_few_arms_returns_422` |
| `I-RTE-05` | Integration | `test_get_simulation_returns_200` |
| `I-RTE-06` | Integration | `test_get_simulation_unknown_id_returns_404` |
| `I-RTE-07` | Integration | `test_step_returns_200_with_step_record` |
| `I-RTE-08` | Integration | `test_step_unknown_id_returns_404` |
| `I-RTE-09` | Integration | `test_run_returns_200_with_history` |
| `I-RTE-10` | Integration | `test_run_response_steps_run_matches_request` |
| `I-RTE-11` | Integration | `test_run_invalid_steps_returns_422` |
| `I-RTE-12` | Integration | `test_delete_returns_204` |
| `I-RTE-13` | Integration | `test_delete_then_get_returns_404` |
| `I-RTE-14` | Integration | `test_get_algorithms_returns_list` |
| `I-ERR-01` | Integration | `test_422_response_has_detail_field` |
| `I-ERR-02` | Integration | `test_404_response_has_detail_string` |
| `I-ERR-03` | Integration | `test_cors_headers_on_error_responses` |

**17 tests.** Red → Green → Refactor.

---

### Phase 8: Frontend — API Client + Type Migration

**Conventional Commit:** `feat(frontend): add typed API client and migrate engine types to lib/`

| Test ID | Layer | Test Name |
|---------|-------|-----------|
| `U-API-01` | Unit | `test_health_calls_correct_url` |
| `U-API-02` | Unit | `test_create_simulation_sends_correct_body` |
| `U-API-03` | Unit | `test_create_simulation_returns_typed_response` |
| `U-API-04` | Unit | `test_step_calls_correct_url` |
| `U-API-05` | Unit | `test_step_returns_step_response` |
| `U-API-06` | Unit | `test_run_sends_steps_count` |
| `U-API-07` | Unit | `test_get_simulation_calls_get` |
| `U-API-08` | Unit | `test_delete_calls_delete` |
| `U-API-09` | Unit | `test_get_algorithms_returns_list` |
| `U-API-10` | Unit | `test_network_error_throws_ApiError` |
| `U-API-11` | Unit | `test_http_error_throws_with_status` |
| `U-API-12` | Unit | `test_api_base_from_env_var` |
| `U-TYP-01` | Unit | `test_algorithm_id_type_narrowing` |
| `U-TYP-02` | Unit | `test_create_sim_request_type_has_required_fields` |
| `C-CTR-01` | Contract | `test_api_response_matches_frontend_types` |

**15 tests.** Design note — `ApiClient` class, not plain object:
```typescript
// lib/api.ts
class ApiClient {
  constructor(private baseUrl: string) {}

  async health(): Promise<boolean> { ... }
  async createSimulation(config: CreateSimRequest): Promise<Simulation> { ... }
  async step(id: string): Promise<StepResponse> { ... }
  async run(id: string, steps: number): Promise<RunResponse> { ... }
  // ...
}

export const api = new ApiClient(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000");
```

---

### Phase 9: Frontend — Zustand Store Rewrite (Async + SOLID)

**Conventional Commit:** `refactor(frontend): rewrite simulation store as async API client with proper separation`

#### OOP Design: Interface Segregation, Dependency Inversion

```typescript
// store/simulation.ts

// Slim props — no positional args (Interface Segregation)
interface InitializePayload {
  arms: Arm[];
  algorithm: AlgorithmId;
  alpha: number;
  epsilon: number;
}

interface SettingsPayload {
  arms: Arm[];
  algorithm: AlgorithmId;
  alpha: number;
  epsilon: number;
}

interface ResetPayload {
  algorithm?: AlgorithmId;
}

interface SimulationStore {
  // State from backend
  simId: string | null;
  simState: SimState | null;

  // UI state (separate concern — could be its own store)
  isRunning: boolean;
  speed: number;
  seed: number;
  isLoading: boolean;
  error: string | null;

  // Async actions (depend on ApiClient interface, not fetch directly)
  initialize: (payload: InitializePayload) => Promise<void>;
  step: () => Promise<void>;
  reset: (payload?: ResetPayload) => Promise<void>;
  applySettings: (payload: SettingsPayload) => Promise<void>;

  // Sync actions (pure UI state)
  play: () => void;
  pause: () => void;
  setSpeed: (v: number) => void;
  setSeed: (s: number) => void;
  clearError: () => void;
}
```

#### Async-Safe Play Mode

Replace `setInterval` (which doesn't understand async) with recursive `setTimeout`:
```typescript
// In useSimulationRunner hook — each step waits for previous to complete
useEffect(() => {
  if (!isRunning) return;
  let cancelled = false;
  let steppingRef = false; // Prevent overlapping steps

  const tick = async () => {
    if (cancelled || steppingRef) return;
    steppingRef = true;
    await step();
    steppingRef = false;
    if (!cancelled) setTimeout(tick, 1000 / speed);
  };
  tick();
  return () => { cancelled = true; };
}, [isRunning, speed, step]);
```

| Test ID | Layer | Test Name |
|---------|-------|-----------|
| `I-STO-01` | Integration | `test_initialize_creates_simulation_via_api` |
| `I-STO-02` | Integration | `test_initialize_sets_sim_id_and_state` |
| `I-STO-03` | Integration | `test_step_calls_api_step` |
| `I-STO-04` | Integration | `test_step_updates_state_from_response` |
| `I-STO-05` | Integration | `test_step_when_no_simulation_throws` |
| `I-STO-06` | Integration | `test_step_sets_loading_true_during_call` |
| `I-STO-07` | Integration | `test_step_sets_loading_false_after_call` |
| `I-STO-08` | Integration | `test_step_sets_error_on_failure` |
| `I-STO-09` | Integration | `test_reset_creates_new_simulation` |
| `I-STO-10` | Integration | `test_reset_with_different_algorithm` |
| `I-STO-11` | Integration | `test_apply_settings_creates_new_simulation` |
| `I-STO-12` | Integration | `test_play_sets_is_running_true` |
| `I-STO-13` | Integration | `test_pause_sets_is_running_false` |
| `I-STO-14` | Integration | `test_set_speed_updates_speed` |
| `I-STO-15` | Integration | `test_set_seed_updates_seed` |
| `I-STO-16` | Integration | `test_multiple_rapid_steps_no_race_condition` |
| `I-STO-17` | Integration | `test_rng_ref_removed` |

**17 tests.** Red → Green → Refactor.

---

### Phase 10: Frontend — Hook Migration + Delete Engine

**Conventional Commit:** `refactor(frontend): migrate to async hooks, remove engine layer`

| Test ID | Layer | Test Name |
|---------|-------|-----------|
| `U-CMP-01` | Unit | `test_step_button_calls_store_step` |
| `U-CMP-02` | Unit | `test_step_button_disabled_during_loading` |
| `U-CMP-03` | Unit | `test_loading_spinner_shown_during_step` |
| `U-CMP-04` | Unit | `test_error_banner_shown_when_error_set` |
| `U-CMP-05` | Unit | `test_error_banner_dismiss_clears_error` |
| `U-CMP-06` | Unit | `test_play_button_starts_auto_stepping` |
| `U-CMP-07` | Unit | `test_playground_initializes_on_mount` |
| `U-IMP-01` | Unit | `test_no_imports_from_engine` |
| `U-IMP-02` | Unit | `test_algo_meta_imported_from_lib` |
| `U-IMP-03` | Unit | `test_types_imported_from_lib` |

#### Implementation Tasks

| # | Task |
|---|------|
| 10.1 | Create `useSimulation` hook — wraps all store selectors + `initialize()` on mount |
| 10.2 | Create `LoadingSpinner` component |
| 10.3 | Create `ErrorBanner` component with dismiss |
| 10.4 | Wire `useSimulationRunner` into PlaygroundPage (async-safe) |
| 10.5 | Wire `useSimulation` into PlaygroundPage, SettingsPage, ResultsPage |
| 10.6 | Update all component imports: `@/engine/types` → `@/lib/types` |
| 10.7 | Update constants imports: `@/engine/constants` → `@/lib/constants` |
| 10.8 | Delete entire `src/engine/` directory |
| 10.9 | Run `pnpm tsc --noEmit` — zero errors |

**10 tests.** Red → Green → Refactor.

---

### Phase 11: Dev Proxy + E2E Tests

**Conventional Commit:** `feat(frontend): add dev proxy, E2E tests, and production configuration`

| Test ID | Layer | Test Name |
|---------|-------|-----------|
| `E-E2E-01` | E2E | `test_landing_to_playground_navigation` |
| `E-E2E-02` | E2E | `test_single_step_updates_ui` |
| `E-E2E-03` | E2E | `test_play_and_pause` |
| `E-E2E-04` | E2E | `test_algorithm_switch_resets_simulation` |
| `E-E2E-05` | E2E | `test_results_screen_shows_data` |
| `E-E2E-06` | E2E | `test_settings_apply_config` |
| `E-E2E-07` | E2E | `test_compare_screen_dual_run` |
| `E-E2E-08` | E2E | `test_error_state_on_backend_down` |
| `E-E2E-09` | E2E | `test_glossary_search` |
| `E-E2E-10` | E2E | `test_full_user_flow` |

**10 tests.** Red → Green → Refactor.

---

## 5. Test Summary

| Phase | File | Count | Layer |
|-------|------|-------|-------|
| 0 | Pre-commit config (manual) | 5 | Tooling |
| 1 | `shared/__tests__/*` + `hooks/__tests__/*` | 15 | Unit |
| 2 | `compare/__tests__/*` + `settings/__tests__/*` | 10 | Unit |
| 3 | `test_health.py` + `test_scaffold.py` | 6 | Unit |
| 4 | `test_models.py` | 14 | Unit |
| 5 | `test_coba_adapter.py` | 14 | Unit |
| 6 | `test_simulator_service.py` | 19 | Unit + Integration |
| 7 | `test_routes.py` | 17 | Integration |
| 8 | `api.test.ts` + `types.test.ts` + `contract.test.ts` | 15 | Unit + Contract |
| 9 | `simulation.test.ts` | 17 | Integration |
| 10 | `components/__tests__/*` + `imports.test.ts` | 10 | Unit |
| 11 | `backend-integration.spec.ts` | 10 | E2E |
| **Total** | | **152** | |

---

## 6. Commit History

```
chore: setup monorepo tooling with pre-commit hooks
refactor(frontend): extract shared simulation UI components and fix DRY violations
refactor(frontend): apply SOLID principles — split monolith pages and fix coupling
feat(backend): scaffold FastAPI project with health endpoint
feat(backend): add Pydantic models for simulation API contract
feat(backend): add CobaAdapter with policy factory and result translation
feat(backend): add SimulationService with AbstractSimulationService interface
feat(backend): implement REST API routes for simulation lifecycle
feat(frontend): add typed API client and migrate engine types to lib/
refactor(frontend): rewrite simulation store as async API client with proper separation
refactor(frontend): migrate to async hooks, remove engine layer
feat(frontend): add dev proxy, E2E tests, and production configuration
```

---

## 7. Running Commands

```bash
# Dev
make dev                    # Starts backend + frontend concurrently

# Lint
make lint                   # ruff check + biome check
make format                 # ruff format + biome format

# Test
make test-backend           # uv run pytest -v
make test-frontend          # pnpm test:run
make test-e2e               # pnpm test:e2e
make test                   # All of the above

# CI
pre-commit run --all-files  # What CI runs on every push
```

---

*Plan authored: 2026-05-26. Test-driven, DRY, SOLID, OOP. 152 tests. 12 commits.*
