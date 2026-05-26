# coba Integration Fix Plan

> **Status:** In progress  
> **Date:** 2026-05-26  
> **Scope:** coba library (upstream) + coba-edu backend (consumer)

---

## 0. Overview

This plan repairs every issue found during the dogfooding review of
`backend/` against `https://github.com/dmoreq/coba.git`. Work flows in two
phases: upstream library fixes first (so the backend can pull a clean
dependency), then backend consolidation.

```
Phase 1 ─ coba library (3 commits → push → tag)
Phase 2 ─ coba-edu backend (5 commits)
```

---

## 1. Root-Cause Map

| # | Severity | Where | Symptom | Root Cause |
|---|---|---|---|---|
| B1 | ~~🔴 P0~~ **Fixed locally** | coba `router.py` | `epsilon_greedy` crashes | `_build_epsgreedy` passed `None` `base_estimator` to `EpsilonGreedyArmModel`. Fixed in local commit `b24fe60` — not yet pushed. |
| B2 | 🔴 P0 | coba `bandit.py` | LinUCB always picks arm A forever | `_cold_start_decision()` hard-codes `arms[0]`; LinUCB never gets `inf` for unvisited arms like UCB1 does. Needs round-robin counter. |
| B3 | 🟠 P1 | coba `bandit.py` / `schemas.py` | `mean_estimate` / `confidence_width` always `None` | `_select_arm` never populates these fields even though `score_decomposed()` already exists on `UCB1ArmModel` and `LinUCBArmModel`. |
| B4 | 🟡 P2 | coba `schemas.py` | No `was_random` flag on `BanditDecision` | Field missing; epsilon-greedy exploration invisible to consumers. |
| B5 | 🔴 P0 | coba-edu `config.py` / `di.py` | Real coba never runs | `use_coba_library: bool = False` — `InMemoryCobaAdapter` is always active. Zero dogfooding. |
| B6 | 🟠 P1 | coba-edu `coba_adapter_real.py` | All arm scores show `mean=0, bonus=0` | Uses `dec.mean_estimate` / `dec.confidence_width` which are `None` — always falls back to `0.0`. |
| B7 | 🟠 P1 | coba-edu `coba_adapter_real.py` | `was_random` always `False` | Field not on `BanditDecision` yet. |
| B8 | 🟡 P2 | coba-edu `coba_adapter_real.py` | Memory leak for long runs | `regret_history` grows unbounded; `history` is capped at 150 but regret is not. |
| B9 | 🟡 P2 | coba-edu `simulator.py` | Convergence never detected for long runs | Uses truncated `history` (last 150 steps) but compares `cum_pulls[best] / step.t` where `step.t` is the global step count. |

---

## 2. Phase 1 — coba Library Fixes

### 2.1 Commit 1 — `fix(bandit): round-robin cold start to ensure all arms explored`

**File:** `src/coba/bandit.py`

**Problem:** `_cold_start_decision()` always returns `self.arms[0]`.  
UCB1 works because after fitting it assigns `inf` to unvisited arms.  
LinUCB's bounded score means arm A stays permanently on top when B and C never
get pulled.

**Fix:** Add a per-instance counter `_cold_start_counter` and rotate through arms.

```python
# __init__
self._cold_start_counter: int = 0

# _cold_start_decision
def _cold_start_decision(self) -> BanditDecision:
    arm = self.arms[self._cold_start_counter % len(self.arms)]
    self._cold_start_counter += 1
    logger.debug("cold-start round-robin → {arm}", arm=arm)
    self._constraints.record_decision()
    return BanditDecision(
        chosen_arm=arm,
        score=0.0,
        all_scores={str(a): 0.0 for a in self.arms},
    )
```

**Tests added:** `tests/test_bandit.py`
- `test_cold_start_round_robins_all_arms` — asserts first N decisions cycle through all arms (not always arm A).
- `test_linucb_explores_all_arms_after_cold_start` — 3-arm LinUCB, verify all arms are pulled within 20 steps.

---

### 2.2 Commit 2 — `feat(schemas,bandit): add was_random to BanditDecision`

**Files:** `src/coba/schemas.py`, `src/coba/policies/sklearn_models.py`, `src/coba/bandit.py`

**Problem:** `BanditDecision.was_random` field doesn't exist. Epsilon-greedy
exploration is invisible to the caller.

**Fix:**

`schemas.py` — add field:
```python
was_random: bool = Field(
    default=False,
    description="True when the arm was selected by epsilon-greedy random exploration.",
)
```

`policies/sklearn_models.py` — track flag in `EpsilonGreedyArmModel`:
```python
def score(self, x):
    if not self.is_fitted:
        self.last_was_random = False
        return _COLD_START_SCORE
    if self.rng.random() < self.epsilon:
        self.last_was_random = True
        return _COLD_START_SCORE
    self.last_was_random = False
    return float(self.model.predict(x.reshape(1, -1))[0])
```

`bandit.py` — set `was_random` in `decide()` after arm is chosen:
```python
# After _select_arm, when policy is EPSILON_GREEDY:
if (decision.chosen_arm is not None
        and self._config.policy == PolicyType.EPSILON_GREEDY):
    cluster_idx, scaled_ctx = self._router._route(x)
    model = self._router._cluster_bandits[cluster_idx].get(decision.chosen_arm)
    if model is not None and hasattr(model, "last_was_random"):
        decision = decision.model_copy(update={"was_random": model.last_was_random})
```

**Tests added:**
- `test_epsilon_greedy_was_random_flag_set` — run 100 steps, assert some `was_random=True` decisions.
- `test_non_epsilon_policies_was_random_false` — UCB1 / LinUCB always have `was_random=False`.

---

### 2.3 Commit 3 — `feat(bandit,router): populate mean_estimate and confidence_width in decide()`

**Files:** `src/coba/router.py`, `src/coba/bandit.py`

**Problem:** `score_decomposed()` already exists on `UCB1ArmModel` and
`LinUCBArmModel` but is never called through to `BanditDecision`.
`mean_estimate` and `confidence_width` are always `None`.

**Fix:**

`router.py` — add helper:
```python
def score_decomposed_for_arm(
    self, context: np.ndarray, arm: Arm
) -> tuple[float, float]:
    """Return (mean_estimate, confidence_width) for one arm in the routed cluster."""
    cluster_idx, scaled_ctx = self._route(context)
    model = self._cluster_bandits[cluster_idx].get(arm)
    if model is None or not model.is_fitted:
        return 0.0, 0.0
    if hasattr(model, "score_decomposed"):
        result = model.score_decomposed(scaled_ctx)
        # UCB1 passes total_pulls; handle both signatures
        if callable(result):  # shouldn't happen, but guard
            return 0.0, 0.0
        return float(result[0]), float(result[1])
    return float(model.score(scaled_ctx)), 0.0
```

`bandit.py` — wire into `decide()`:
```python
# After _select_arm:
if decision.chosen_arm is not None:
    mean_est, ucb_width = self._router.score_decomposed_for_arm(x, decision.chosen_arm)
    decision = decision.model_copy(update={
        "mean_estimate": mean_est,
        "confidence_width": ucb_width,
    })
```

**UCB1 special case:** `UCB1ArmModel.score_decomposed` accepts `total_pulls` kwarg.
The router must pass `self._total_pulls` when the policy is `UCB1`.

```python
def score_decomposed_for_arm(self, context, arm):
    ...
    if hasattr(model, "score_decomposed"):
        if self.policy == PolicyType.UCB1:
            mean, bonus = model.score_decomposed(scaled_ctx, total_pulls=self._total_pulls)
        else:
            mean, bonus = model.score_decomposed(scaled_ctx)
        return float(mean), float(bonus)
    return float(model.score(scaled_ctx)), 0.0
```

**Tests added:**
- `test_ucb1_decision_has_mean_and_bonus` — after 5+ steps, `mean_estimate` and `confidence_width` are floats ≥ 0.
- `test_linucb_decision_has_mean_and_bonus` — same for LinUCB.
- `test_thompson_decision_mean_and_bonus_zero` — Thompson/EpsGreedy return `(sample, 0.0)` as expected.

---

### 2.4 Push + tag

```
git push origin main
```

The `coba-edu` backend will pick up the fix on next `uv sync` or lock file update.

---

## 3. Phase 2 — coba-edu Backend Rework

### 3.1 Commit 1 — `refactor(adapter): always use CobaLibraryAdapter, remove feature flag`

**Files:**
- `backend/src/coba_server/config.py` — remove `use_coba_library`
- `backend/src/coba_server/di.py` — remove conditional, always `CobaLibraryAdapter`
- `backend/src/coba_server/services/coba_adapter.py` — **delete** (InMemory re-implementation)
- `backend/tests/test_simulator.py` — remove `InMemoryCobaAdapter` import, use `CobaLibraryAdapter`
- Update `uv.lock` to pull latest coba commit

**Rationale:** Having an in-process re-implementation of coba's algorithms means
bugs in coba are never exposed. The real library is the only path.

---

### 3.2 Commit 2 — `fix(adapter): proper score extraction from BanditDecision`

**File:** `backend/src/coba_server/services/coba_adapter_real.py`

**Problems fixed:**
1. `dec.mean_estimate` → now populated (Phase 1 Commit 3) — use it for chosen arm's mean.
2. `dec.confidence_width` → now populated — use it for chosen arm's bonus.
3. Build per-arm `Score` from `dec.all_scores` (each arm's UCB value) plus
   decomposed mean/bonus for the chosen arm only.
4. `dec.was_random` → now populated — wire to `StepRecord.was_random`.

**New score-building logic:**
```python
# chosen arm gets decomposed components:
for i, label in enumerate(arm_labels):
    raw_score = dec.all_scores.get(label, 0.0)
    capped = 99.0 if raw_score == float("inf") else float(raw_score)
    if label == chosen_label:
        mean = dec.mean_estimate or 0.0
        bonus = dec.confidence_width or 0.0
        formula = f"μ̂={mean:.3f} + bonus={bonus:.3f}"
    else:
        mean, bonus = 0.0, 0.0
        formula = f"coba: {raw_score:.3f}"
    scores.append(Score(mean=mean, bonus=bonus, score=capped, formula=formula))
```

---

### 3.3 Commit 3 — `fix(adapter): cap regret_history to prevent memory leak`

**File:** `backend/src/coba_server/services/coba_adapter_real.py`

**Problem:** `history` is capped at `MAX_HISTORY_LENGTH=150` but `regret_history`
grows to N entries for N total steps (confirmed: 200 steps → 200 entries).

**Fix:** Apply the same cap — keep only the latest 150 entries, preserving
`cum_regret` accuracy (the last entry is always the current cumulative total).

```python
self._regret_histories[handle].append(float(cum_regret))
if len(self._regret_histories[handle]) > MAX_HISTORY_LENGTH:
    self._regret_histories[handle] = self._regret_histories[handle][-MAX_HISTORY_LENGTH:]
```

Note: `cum_regret` is derived from the previous entry so truncation is safe —
the running value is preserved as the last list element.

---

### 3.4 Commit 4 — `fix(simulator): fix convergence detection for long runs`

**File:** `backend/src/coba_server/services/simulator.py`

**Problem:** Convergence algorithm uses `state.history` (last 150 steps) but
divides by `step.t` (the global step index 851…1000). The ratio `cum_pulls /
step.t` is always < 0.5 for long runs.

**Fix:** Use `state.arm_states` for all-time pull counts and `state.t` for total:

```python
def get_results(self, sim_id):
    ...
    # Convergence: first step at which best arm accumulates > 50% of all-time pulls
    convergence_step: int | None = None
    cum_pulls = [0] * len(state.arms)
    for step in state.history:
        cum_pulls[step.chosen_idx] += 1
        # Use local step count (position in history window), not global step.t
        local_t = state.history.index(step) + 1  # too slow; use enumerate
        ...
```

Better approach — derive from `arm_states` directly:

```python
best_arm_pulls = state.arm_states[best_arm_idx].n
total_pulls = state.t
if total_pulls > 0 and best_arm_pulls / total_pulls > 0.5:
    # Scan the truncated history backwards to estimate when it crossed 0.5
    for step in reversed(state.history):
        if step.chosen_idx != best_arm_idx:
            convergence_step = step.t + 1
            break
    else:
        convergence_step = state.history[0].t if state.history else 1
```

---

### 3.5 Commit 5 — `test(adapter): complete algorithm coverage + epsilon_greedy`

**Files:** `backend/tests/test_coba_adapter.py`, `backend/tests/test_simulator.py`

**Changes:**
1. `test_step_supports_algorithms` — add `"epsilon_greedy"` to the list.
2. Add `test_epsilon_greedy_was_random_sometimes_true` — run 50 steps, assert
   at least one step has `was_random=True`.
3. Add `test_score_decomposition_populated` — after 10 steps of UCB1, assert
   `scores[chosen_idx].mean >= 0` and `scores[chosen_idx].bonus >= 0`.
4. Add `test_regret_history_capped` — run 200 steps, assert len ≤ 150.
5. Remove `InMemoryCobaAdapter` import from `test_simulator.py`, switch to
   `CobaLibraryAdapter`.
6. Run full suite, all passing.

---

## 4. Execution Checklist

### Phase 1 — coba library

- [ ] C1: Round-robin cold start → commit → `fix(bandit): round-robin cold start`
- [ ] C2: `was_random` field + epsilon-greedy flag → commit
- [ ] C3: `mean_estimate` / `confidence_width` wired → commit
- [ ] Push `origin/main`
- [ ] Verify `uv run pytest` passes in coba

### Phase 2 — coba-edu backend

- [ ] Update `uv.lock` (`uv sync`) to pull latest coba
- [ ] C4: Remove `InMemoryCobaAdapter` + feature flag → commit
- [ ] C5: Fix score extraction in `CobaLibraryAdapter` → commit
- [ ] C6: Cap `regret_history` → commit
- [ ] C7: Fix convergence detection → commit
- [ ] C8: Comprehensive test coverage → commit
- [ ] Run `uv run pytest backend/tests` — all pass

---

## 5. After This Plan

Once Phase 2 is complete, the backend directly exercises coba on every request.
Any future coba regression will surface immediately in the `test_coba_adapter.py`
integration tests.

Next opportunities (deferred, not in this plan):
- Expose `ClusterBandit.get_stats()` per-arm in the `/results` endpoint so the
  frontend can show pull counts sourced from coba (eliminates `arm_states`
  shadow tracking).
- Remove manual `lin_meta` tracking from `CobaLibraryAdapter` once coba exposes
  per-arm ridge coefficients through `get_stats()`.
- Add `BanditDecision.score_per_arm: dict[str, tuple[float,float]]` for full
  decomposed scores across all arms (currently only the chosen arm is decomposed).
