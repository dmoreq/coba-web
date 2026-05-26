# Coba Web Simulation — Comprehensive Testing Plan

_Last updated: 2026-05-26 — covers all features shipped since Phase 0 (16-algorithm expansion, hyperparams bag, 3-panel layout, playback fix, memoization, backend threading, speed default, editable arm labels, hydration suppression)_

---

## Part 0: Pre-existing Bugs Found During Review

These must be fixed _before_ writing tests against the current behavior:

| ID | Severity | File | Bug |
|----|----------|------|-----|
| B1 | 🔴 Critical | `store/simulation.ts:125` | `reset()` calls `api.createSimulation(... { alpha: simState.alpha, epsilon: simState.epsilon })` — passes the old flat object instead of `simState.hyperparams`. When user switches from a contextual algorithm to another, hyperparams like `n_clusters`, `v_sq`, `l2_lambda` are lost. |
| B2 | 🟠 High | `compare/page.tsx:61–63` | `initSims` hardcodes `{ alpha: 2.0 }` for _all_ algorithm pairs regardless of their actual hyperparams. Compare page ignores `DEFAULT_HYPERPARAMS[algo]` — non-UCB algorithms get wrong defaults. Should use `DEFAULT_HYPERPARAMS[algoAval]` and `DEFAULT_HYPERPARAMS[algoBval]`. |
| B3 | 🟡 Medium | `ArmRow.tsx:31` | Bonus bar only renders for `ucb1` and `linucb` — other bonus-based algorithms (`linucb_hybrid`, `linucb_sw`, `logistic_ucb`, `gp_ucb`, `random_forest_ucb`, `bootstrapped_ucb`) show no bonus segment even though their scores include a bonus. |
| B4 | 🟡 Medium | `compare/page.tsx:26` | Default speed is `2` instead of `0.5` — inconsistent with the rest of the app. |

---

## Part 1: Unit Tests

### 1.1 `constants.ts` — Algorithm Registry

**`DEFAULT_HYPERPARAMS` integrity**
- Every key in `ALGO_META` exists in `DEFAULT_HYPERPARAMS` (16 entries)
- Every `DEFAULT_HYPERPARAMS[algo]` contains exactly the keys listed in `ALGO_META[algo].hyperparams`
- Every hyperparam key in `DEFAULT_HYPERPARAMS[algo]` has a corresponding entry in `HYPERPARAM_META`
- `thompson` has empty hyperparams (`{}`)

**`ALGORITHM_ORDER` integrity**
- Contains exactly 16 entries, no duplicates
- First 3 entries are `["ucb1", "thompson", "epsilon_greedy"]` (context-free)
- Remaining 13 are contextual

**`createDefaultSimState`**
- Returns `SimState` with `hyperparams` matching `DEFAULT_HYPERPARAMS[algorithm]`
- `alpha` and `epsilon` derived from hyperparams defaults
- All 16 algorithm IDs produce a valid state (no crash)
- Returns fresh object references (no shared mutation between calls)

**`HYPERPARAM_META` format functions**
- `epsilon.format(0.25)` → `"25%"`
- `n_clusters.format(5)` → `"5"`
- Integer-format params return stringified integers, not floats

---

### 1.2 `types.ts` — Type Contract

**`AlgorithmId` union**
- All 16 string literals present
- No extra values

**`SimState` structural**
- `hyperparams` is required (not optional)
- `alpha` still present (backward compat for UCBDisplay)
- All nested types resolve correctly

---

### 1.3 `useSimulationRunner` — Playback Hook

| Test | What it verifies |
|------|-----------------|
| Step called on mount when `isRunning=true` | `step` fires immediately (0-delay) |
| Step called repeatedly at correct interval | At `speed=2`, 2 calls within 1.5s, no more than 3 |
| Step called at `speed=0.5` interval | ~2000ms between steps |
| Cleanup on `isRunning→false` | No further step calls after pause |
| Cleanup clears pending timeout | Even if a tick is scheduled, it's cancelled |
| Concurrent step prevention | If step takes longer than interval, next tick waits (steppingRef) |
| Hook with async step | Does not crash, `await` completes before next tick |
| Cleanup during in-flight step | No crash, steppingRef prevents double-step after cleanup |
| Speed change mid-run | Old timeout cleared, new speed takes effect |
| Unmount stops everything | No calls after component unmounts |

---

### 1.4 `simulation.ts` — Zustand Store

**`initialize`**
- Calls `api.createSimulation` with correct arms (snake_case), algorithm, hyperparams, seed
- Sets `simId`, `simState` (with `hyperparams` bag and `algorithm`), `isLoading=false`
- On error: sets `error` message, `isLoading=false`, leaves `simId` null
- Cleans up old simulation before creating new one
- Does not crash when `oldSimId` is null

**`step`**
- Calls `api.step(simId)`
- Reconstructs `simState` from `StepResponse` (t, armStates, regretHistory, history)
- Preserves `hyperparams` and `algorithm` through the update
- On error: sets error, sets `isRunning=false`
- Returns early if `simId` or `simState` is null

**`reset`** (⚠️ B1 must be fixed first)
- When `algo` is undefined, preserves current algorithm and hyperparams
- When `algo` is different, uses `DEFAULT_HYPERPARAMS[algo]`
- Cleans up old simulation before creating new
- Sets `isRunning=false`

**`applySettings`**
- Receives `{ arms, algorithm, hyperparams }`
- Calls `api.createSimulation` with full payload
- Sets `simState` with correct `hyperparams` and `algorithm`

**`play` / `pause` / `setSpeed` / `setSeed` / `clearError`**
- Simple setters, verify state change

**Edge cases**
- `initialize` called while `isRunning=true` — should not create race condition
- `step` called rapidly (10 calls in sequence) — all complete, state is consistent
- Rapid reset → step → reset → step — no stale simId references

---

### 1.5 Chart Components

**`CumRewardsChart`**
- Empty history (< 2 entries) → renders `EmptyChart` with message
- Cumulative rewards computed correctly: `sum(outcome)` over history
- Sample rate respects `MAX_HISTORY_LENGTH`
- `color` prop applied to gradient + line
- React.memo prevents re-render on identical props

**`RegretLineChart`**
- Works with new `height` prop (default 110)
- Sample rate → at most 150 data points
- Y-axis domain adapts to max value

**`PullDistChart`**
- Works with new `height` prop (default 110)
- Zero pulls → `EmptyChart`
- Color per arm correct

**`DualRegretChart`**
- Two series rendered with correct colors + dash pattern
- Works with new `height` prop

**Concurrency edge case** (all charts)
- Receiving a new ref-equivalent array (same values, different reference) should not crash Recharts `ResponsiveContainer`

---

### 1.6 UI Components

**`AlgorithmSelector`**
- Renders all 16 algorithms from `ALGO_META`
- Active algorithm has correct background color and white text
- Inactive algorithms have `#f1f3f5` background
- `onChange` callback fires with correct `AlgorithmId`

**`SpeedSelector`**
- Renders `0.5×, 1×, 2×, 5×, 10×`
- Active button has dark background
- `onChange` fires with numeric value

**`ArmRow`**
- UCB1: bonus bar renders when bonus > 0 (⚠️ B3)
- LinUCB: bonus bar renders when bonus > 0
- All other bonus-based algos: bonus bar renders (⚠️ B3)
- Thompson: beta curve renders, no bar
- `barMax` is `Math.max(maxScore * 1.1, 1)` for all algorithms
- `meanPct` never exceeds 100
- Dot position is `meanPct%` from left

**`UCBDisplay`**
- Algorithm label displayed for all 16 algorithms (no blank badge)
- `alpha`/`epsilon` read from `simState.alpha` and `simState.epsilon`
- Hyperparams read from `simState.hyperparams` for display (v_sq, n_bootstraps, etc.)

**`EnvPanel`**
- "leads" badge logic: `t > 5 && mean > all other means + 0.001`
- `React.memo` prevents re-render on identical `simState`
- Editable arm labels render as input fields (Settings only)
- Arm probability slider reflects `trueProb`

**`WhyPanel`**
- Renders explanation for all 16 algorithms (no missing text)
- References `simState.hyperparams` for contextual values (n_bootstraps, linucb_sw_window, etc.)

**`FormulaPanel`**
- `FORMULA_LABELS` has entries for all 16 algorithms
- Falls back to "Formula" for unknown algorithms

**`StepFeed` / `StepFeedEntry`**
- `useMemo` for `recentSteps` recomputes only when `history` changes
- `React.memo` on `StepFeed` prevents re-render on unchanged props

---

### 1.7 `api.ts` — HTTP Client

- `createSimulation` sends snake_case body (arms, algorithm, hyperparams, seed)
- `toCamel` maps `hyperparams` correctly (already snake_case, so passthrough)
- `ApiError` constructor stores `status` and `detail`
- All methods use correct HTTP methods and paths

---

## Part 2: Integration Tests

### 2.1 Store ↔ API Contract

**Full lifecycle simulation**
1. `initialize(arms, "linucb", { alpha: 2.0, l2_lambda: 1.0, gamma: 1.0, n_clusters: 5 })`
2. Verify `api.createSimulation` received:
   - Correct snake_case arms
   - `algorithm: "linucb"`
   - `hyperparams: { alpha: 2.0, l2_lambda: 1.0, gamma: 1.0, n_clusters: 5 }`
   - `seed: 42`
3. `step()` → verify `simState.hyperparams` preserved through update
4. `step()` → verify `simState.algorithm` preserved
5. Simulate 10 steps → verify `history.length === 10`, `t === 10`
6. `reset("lints")` → verify new `api.createSimulation` with `DEFAULT_HYPERPARAMS.lints`
7. `applySettings` → verify `api.createSimulation` with full hyperparams bag

**Error paths**
- `api.createSimulation` rejects → store `error` is set, `isRunning` unchanged
- `api.step` rejects → store `error` set, `isRunning=false`
- `api.deleteSimulation` rejects (old cleanup) → initialization still succeeds

**Concurrency**
- Rapid alternating initialize/step calls → no null simId accessed
- Two initializes in quick succession → only the last one's simId survives

---

### 2.2 Algorithm Switching —— Hyperparams Propagation

| Scenario | Expected |
|----------|----------|
| Playground: UCB1 → click Thompson button | `api.createSimulation` called with `DEFAULT_HYPERPARAMS.thompson` (empty `{}`) |
| Playground: LinUCB → click LinTS | `DEFAULT_HYPERPARAMS.lints` — v_sq, l2_lambda, gamma, n_clusters all present |
| Settings: switch algo, see sliders change | Epsilon slider disappears; n_clusters slider appears |
| Settings: change n_clusters=10, switch to different contextual algo | n_clusters=10 preserved across switch |
| Settings: change n_clusters=10, Apply | Backend receives `hyperparams: { ..., n_clusters: 10 }` |
| Settings: add arm, rename arm, change prob, Apply | All three changes reflected in API call |
| Settings: remove arm (down to 2), add new arm | Arm IDs are sequential, labels editable |

---

### 2.3 Compare Page Lifecycle

| Scenario | Expected |
|----------|----------|
| Navigate to /compare | Two sims created (A=ucb1, B=thompson). No re-render loop. |
| Navigate away → back to /compare | Old sims deleted via cleanup, two new sims created. No loop. |
| Algorithm A dropdown: change to LinUCB | Both sims recreated (A=linucb, B=thompson). `idsRef` updated. |
| Play then Reset | `isRunning=false`, both sims recreated from `DEFAULT_HYPERPARAMS`. |
| Play then navigate away | Both sims cleaned up via `useEffect` return. |
| Run 50 steps, verify charts | Both regret lines increasing; rewards chart non-zero; pull distributions different. |
| Two charts share same Gradient ID | Per-algorithm `regretGrad-*` ID unique to each column (color hex in ID), no SVG collision. |

---

### 2.4 Playground Page Lifecycle

| Scenario | Expected |
|----------|----------|
| First load | `initialize` called once with DEFAULT_ARMS + ucb1. |
| Navigate to Settings → back to Playground | `simState` still in store, `initialized.current` prevents re-init. No API call. |
| Hard refresh → Playground | `simState` null, `initialize` fires. |
| Step 5 times → Verify StepFeed | Last 5 entries visible, most recent at top. |
| Step 20 times → Verify StepFeed | At most 14 entries visible (slice(0, 14)). |
| Play → Pause immediately | `isRunning=false`, no more steps after current in-flight completes. |
| Play → steps arrive → Pause → verify no extra steps | Last `t` value frozen after pause (no ghost steps). |

---

### 2.5 Hydration & Rendering

| Scenario | Expected |
|----------|----------|
| SSR renders `<body>` without browser attributes | Server HTML has `className="font-sans"` only. |
| Client hydration with browser extension attributes | No console error (suppressHydrationWarning). |
| All pages hydrates without mismatch | Landing, Playground, Compare, Settings, Results, Glossary — no React 418 errors. |

---

### 2.6 Backend — Thread Pool & Cleanup

**Thread offloading** (these tests require actual backend running)

| Test | Method | Verification |
|------|--------|-------------|
| `create_simulation` doesn't block | Fire 5 concurrent `POST /simulate` from 5 coroutines | All complete without 503/timeout |
| `step_simulation` doesn't block | Play at speed 10 while hitting `/health` | Health always returns 200 within 100ms |
| `create_simulation` returns 400 on cap exceeded | Create 100 sims (MAX_ACTIVE_SIMULATIONS) then 1 more | 400 with "Maximum of 100" message |
| Expired simulation pruned by lifespan | Create sim, wait longer than TTL | Background task removes it; GET returns 404 |
| `prune_expired` called on `create` | Create sim, set its `_created_at` to old time, create another sim | Old sim deleted before new one created |
| `get_results` works synchronously in thread | Call with realistic history | Returns correct `cumulative_regret`, `avg_reward` |
| `get_coba_state` works in thread | Call with valid sim | Returns `policy`, `is_fitted`, `stats`, `scores`, `model_state` |

---

### 2.7 ArmRow Bar Scaling

| Scenario | Expected |
|----------|----------|
| UCB1: mean=0.5, bonus=1.2, maxScore=1.7 | barMax=1.87; meanPct=26.7%, bonusPct fits within remaining 73.3% |
| UCB1: mean=0.9, bonus=0.05, maxScore=0.95 | barMax=1.045; dot at ~86.1%, bonus bar visible |
| Thompson: no bar at all | Beta curve rendered instead |
| Arms with score=99 (cold-start inf) | `_cap_score` → 99.0; barMax scaled to accommodate |

---

## Part 3: End-to-End Tests (Playwright)

### 3.1 Algorithm Smoke Tests (16 Algorithms)

For each of the 16 algorithms:

1. Navigate to /playground
2. Select algorithm via `AlgorithmSelector` pill button
3. Verify UCBDisplay badge shows correct algo name
4. Click "Step →" 5 times
5. Verify `t=5`, no error message appears, StepFeed has entries
6. Click "▶ Play" → wait 1s → click "⏸ Pause"
7. Verify `t > 5`, no errors
8. Switch to /compare, verify no crash

**Priority ordering** (risk-weighted):

| Priority | Algorithms | Risk factor |
|----------|-----------|-------------|
| P0 | ucb1, thompson, epsilon_greedy, linucb | Core — already shipped |
| P1 | lints, softmax, linucb_hybrid, linucb_sw | New linear-contextual — might have hyperparam mismatches |
| P1 | neural_linear, bootstrapped_ts, bootstrapped_ucb | Complex — MLP/ensemble init may fail |
| P2 | logistic_ucb, logistic_ts, gp_ucb, random_forest_ucb, random_forest_ts | Niche — O(n³) for GP, tree ensemble for RF |

### 3.2 Settings Page Flows

| Test | Steps |
|------|-------|
| **Arm label edit** | Settings → click arm label → type "Newsletter" → verify input value = "Newsletter" → Apply → Playground → verify EnvPanel shows "Newsletter" |
| **Arm probability change** | Settings → slide arm prob to 90% → Apply → Playground → enable truth toggle → verify 90% shown |
| **Add arm** | Settings → click "+ Add arm" → verify 4th arm appears → edit label → Apply → Playground → verify 4 arms in EnvPanel |
| **Remove arm** | Settings → click × on 3rd arm → verify arms drop to 2 → × buttons disappear |
| **Algorithm switch with sliders** | Settings → select LinUCB → verify α, λ, γ, n_clusters sliders → change n_clusters to 10 → select LinTS → verify n_clusters=10 preserved → Apply |
| **Full settings → Playground → Results** | Apply settings → Playground → Step 20 times → Results tab → verify best arm found matches manual inspection |

### 3.3 Compare Page Flows

| Test | Steps |
|------|-------|
| **Two algorithms racing** | /compare → verify two Estimate cards visible → Play → wait 3s → Pause → verify both t values are > 0 and close |
| **DualRegretChart renders** | Run 10 steps → verify two lines visible with different colors → legend shows both labels |
| **Cumulative Rewards charts** | Run 10 steps → verify both rewards charts have area fills → rewards values are integers |
| **Navigate away cleanup** | /compare → verify sims created → navigate to /playground → check backend logs for DELETE calls |
| **Algorithm change** | Change A to LinUCB → verify both sims recreated → B still thompson |

### 3.4 Pause Button (The Bug Fix)

| Test | Steps |
|------|-------|
| **Pause stops immediately** | Play → wait 200ms → Pause → capture `t` → wait 1s → verify `t` unchanged |
| **Pause at speed 10** | Speed 10 → Play → wait 300ms → Pause → verify no more than ceil(300/100*10)+1 ≈ 4 steps |
| **Pause during slow API** | (Simulate backend delay) Play → Pause immediately → no more POST calls after pause |
| **Play-Pause-Play cycle** | Play → Pause → Play → Pause → verify step count adds up (no lost ticks) |

### 3.5 Speed Selector

| Test | Steps |
|------|-------|
| **Default speed 0.5** | Load Playground → speed shows 0.5 as active |
| **Speed change takes effect** | Speed 0.5 → Play → after 2s expect 1-2 steps; Speed 10 → after 2s expect 10-20 steps |
| **Compare page speed defaults to 0.5** | Load /compare → verify 0.5 speed active |

### 3.6 Hydration

| Test | Steps |
|------|-------|
| **No hydration mismatch on any tab** | Navigate to all 6 pages via hard reload → check browser console → no "hydration mismatch" errors |

### 3.7 Responsive / Layout

| Test | Steps |
|------|-------|
| **Three-panel row equal width** | /playground → verify Regret/Rewards/PullDist panels have same computed width (within 2px) |
| **Compare Estimates same height** | /compare → verify UCBDisplay A and B cards have same computed height |
| **Chart height increased** | /playground → verify chart containers ≥ 180px height |

---

## Part 4: Backend-Specific Tests (pytest)

### 4.1 Simulation Lifecycle

```
test_create_with_hyperparams              — CreateSimRequest with full hyperparams bag
test_create_defaults_ucb1                 — Missing hyperparams uses defaults
test_create_unknown_algorithm             — Returns 400
test_create_exceeds_max_simulations       — 100 sims → 101st returns 400
test_step_returns_correct_response        — StepResponse contains t, step, armStates, regretHistory
test_step_nonexistent_sim                 — Returns 404
test_run_multiple_steps                   — run(steps=5) → final_t = initial_t + 5
test_delete_cleans_up                     — DELETE → GET returns 404
test_delete_nonexistent                   — Returns 204 (idempotent)
test_prune_expired_removes_old            — Sim older than TTL → get_simulation returns 404
test_lifespan_background_cleanup          — Wait > CLEANUP_INTERVAL → expired sims removed
```

### 4.2 Algorithm Routing

```
test_all_16_policies_creatable            — Create one sim for each AlgorithmId
test_policy_map_coverage                  — Every ALGORITHM_META key in POLICY_MAP
test_contextual_algorithms_set            — CONTEXTUAL_ALGORITHMS excludes ucb1, thompson
test_cluster_bandit_kwargs_per_algo       — kwargs built correctly for each policy type
```

### 4.3 Hyperparameters Passthrough

```
test_n_clusters_respected                 — Set n_clusters=3 → bandit has 3 clusters
test_alpha_respected_ucb1                 — alpha=5.0 → higher exploration
test_l2_lambda_respected_linucb           — Ridge reg parameter passes through
test_gamma_respected                      — gamma=0.95 → discount applied
test_v_sq_respected_lints                 — v_sq=2.0 → higher posterior variance
test_neural_linear_config                 — embedding_dim + retrain_freq passed through
test_gp_ucb_config                        — beta, length_scale, noise_var, max_obs
test_rf_config                            — n_estimators, max_depth, max_obs
```

### 4.4 Thread Safety & Performance

```
test_step_does_not_block_event_loop       — asyncio.to_thread() wraps step
test_create_does_not_block_event_loop     — asyncio.to_thread() wraps create
test_concurrent_steps                     — 10 concurrent step_simulation calls
test_concurrent_create_and_step           — Create sim while stepping another
```

---

## Part 5: Test Infrastructure Gaps

### 5.1 What's Missing Today

| Gap | Impact |
|-----|--------|
| **No backend unit tests exist** | `backend/tests/` is empty. No pytest coverage at all. |
| **No component tests for charts** | Charts have no render tests. Recharts requires `ResizeObserver` mock. |
| **No `useSimulationRunner` unit tests** | Race condition fix is untested. |
| **No integration tests for store↔API** | Only the E2E tests exercise this path. |
| **E2E tests reference old algorithm labels** | `shared.test.tsx` expects `["ucb1", "epsilon", "thompson", "linucb"]` — needs updating for 16 algos. |
| **No `React.memo` verification** | Memoization additions have no test proving they skip re-renders. |

### 5.2 Recommended First Steps

1. **Fix bugs B1–B4** (highest priority — behavior is wrong)
2. **Write backend pytest suite** (`backend/tests/`) covering Part 4 scenarios
3. **Fix existing test files** to match new types (`shared.test.tsx`, `simulation.test.ts`)
4. **Write `useSimulationRunner` unit tests** (vi.advanceTimersByTime + fake async)
5. **Write algorithmic smoke E2Es** for P0+P1 algorithms (8 tests)
6. **Write settings and compare flow E2Es**
7. **Add chart render tests** with `ResizeObserver` polyfill
8. **Add stress test**: spawn 100 sims, step 50 steps each, verify no crashes
