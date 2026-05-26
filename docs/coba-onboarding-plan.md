# Coba Web Simulation — Full Onboarding Plan

This plan classifies all 16 discrete coba bandit policies plus library features
into **learning tracks** (by category) and **development phases** (by implementation
depth). The goal: let users compare algorithms within the same track at comparable
maturity levels, then graduate to deeper feature layers.

---

## Part 1: Algorithm Classification

### Track A — Context-Free (Baseline)

Stateless. No context features. Purely empirical means or Beta posteriors.
The simplest algorithms — great for teaching the explore-exploit tradeoff.

| Policy | Status | Learning paradigm |
|--------|--------|-------------------|
| `ucb1` | ✅ Done | Optimistic (Frequentist) |
| `thompson` | ✅ Done | Posterior sampling (Bayesian) |
| `epsilon_greedy` | ✅ Done | Random exploration with probability ε |

**Hyperparams already surfaced**: `alpha`, `epsilon`

---

### Track B — Linear Contextual

Context vector → linear model per arm. Ridge regression backbone.
Demonstrates how side information (user features) improves decisions.

| Policy | Status | Note |
|--------|--------|------|
| `linucb` | ✅ Done | Reference linear UCB |
| `lints` | ❌ Not yet | Linear Thompson — the Bayesian counterpart |
| `linucb_hybrid` | ❌ Not yet | Splits context into shared + arm-specific features |
| `linucb_sw` | ❌ Not yet | Sliding window for non-stationary rewards |
| `softmax` | ❌ Not yet | Temperature-controlled probabilistic selection |

**Hyperparams needed per algorithm**:

| Policy | Params |
|--------|--------|
| `linucb` | `alpha`, `l2_lambda`, `gamma`, `n_clusters` |
| `lints` | `v_sq`, `l2_lambda`, `gamma`, `n_clusters` |
| `linucb_hybrid` | `alpha`, `l2_lambda`, `gamma`, `n_shared_features`, `n_clusters` |
| `linucb_sw` | `alpha`, `l2_lambda`, `linucb_sw_window`, `n_clusters` |
| `softmax` | `softmax_tau`, `l2_lambda`, `gamma`, `n_clusters` |

**Comparison angle**: UCB vs Thompson under identical context — same family,
different exploration philosophy. Great A/B on the Compare page.

---

### Track C — Non-linear Contextual (Advanced)

Model complex reward surfaces with trees, ensembles, neural nets, or GPs.
Shows what happens when the linear assumption breaks.

| Policy | Status | Model type |
|--------|--------|-----------|
| `neural_linear` | ❌ Not yet | MLP backbone → per-arm LinTS head |
| `bootstrapped_ts` | ❌ Not yet | Bootstrap ensemble + Thompson |
| `bootstrapped_ucb` | ❌ Not yet | Bootstrap ensemble + UCB |
| `logistic_ucb` | ❌ Not yet | Logistic regression UCB (binary rewards) |
| `logistic_ts` | ❌ Not yet | Logistic regression TS (binary rewards) |
| `gp_ucb` | ❌ Not yet | Gaussian Process UCB (RBF kernel) |
| `random_forest_ucb` | ❌ Not yet | Tree-disagreement UCB |
| `random_forest_ts` | ❌ Not yet | Tree-disagreement Thompson-style |

**Comparison angle**: Linear vs non-linear on the same reward surface.
How much does model capacity buy you?

---

### Track D — Continuous Action (Expert)

Real-valued action selection via CATS binary-tree partitioning.
Different contract entirely — needs its own page or mode.

| Policy | Status |
|--------|--------|
| `cats` | ❌ Not yet (excluded currently) |

---

## Part 2: Feature Layers

Beyond algorithms, coba ships with capabilities that don't fit neatly into
the per-algorithm comparison model.

### Layer 1 — Hyperparameter Controls (Phase 2)

Move from hardcoded defaults to interactive sliders for every algorithm's
key hyperparameter. Already partially done (`alpha`, `epsilon`). Extend to:

- `n_clusters` (cluster count for contextual algos)
- `l2_lambda` (ridge regularization)
- `gamma` (exponential discount — stationary vs drift)
- `v_sq` (TS posterior variance)
- `softmax_tau` (temperature)
- `n_bootstraps` (ensemble size)
- `neural_embedding_dim`, `neural_retrain_freq`
- `gp_beta`, `gp_length_scale`, `gp_max_obs`
- `rf_n_estimators`, `rf_max_depth`, `rf_max_obs`
- `linucb_sw_window`

The `/algorithms` endpoint already returns `hyperparams: list[str]` per algorithm.
Extend the backend adapter to include these in `CLUSTER_BANDIT_KWARGS` (some
are already listed there), then build a per-algorithm slider panel in Settings.

---

### Layer 2 — Drift Detection (Phase 3)

coba's `PageHinkleyDetector` detects concept drift (reward distribution change)
and triggers automatic model reset. This is gated behind `enable_drift_detection`
in `BanditConfig`.

What changes: the simulation becomes non-stationary. Arm probabilities shift
over time. The learner must detect and adapt.

**Backend work**:
- Add `enable_drift_detection`, `drift_delta`, `drift_lambda` to all algorithm
  hyperparam lists in `ALGORITHM_META`
- Include them in `CLUSTER_BANDIT_KWARGS` (already present)

**Frontend work**:
- Toggle in Settings or in-play: "Enable reward drift"
- `DriftEvent` surface in `StepFeed` entries ("⚠ drift detected on Arm 3")
- `StepRecord` already has `trueProb` — monitor this over time to detect
  simulator-side shifts vs learner-side detections

---

### Layer 3 — Dynamic Arms (Phase 3)

coba supports `add_arm()` and `remove_arm()` at runtime. This maps naturally
to the Settings page adding/removing notification channels mid-simulation.

**Backend work**:
- `POST /api/simulate/{id}/arms` — add an arm (with optional warm-start from
  an existing arm's model)
- `DELETE /api/simulate/{id}/arms/{arm_id}` — remove an arm
- The adapter's `ClusterBandit.add_arm(label, warm_start_from=...)` call

**Frontend work**:
- "Add arm mid-run" button in Playground (not just Settings pre-reset)
- Visual indicator for warm-started arms

---

### Layer 4 — Offline Evaluation (Phase 4)

coba provides three offline evaluation methods: rejection sampling, doubly-robust,
and NCIS. This lets users upload logs and evaluate a policy without running
live steps.

**Backend work**:
- `POST /api/evaluate` with a log payload and policy config
- Returns `estimated_reward`, `n_samples_used`, confidence bounds

**Frontend work**:
- New "Evaluate" tab with a log upload area (CSV/JSON)
- Comparison of offline estimates vs ground truth in simulation

---

### Layer 5 — Decision Abstention (Phase 4)

coba's `min_confidence_gap` parameter makes the bandit abstain when the top-two
arms are too close. Useful for high-stakes decisions.

**Backend work**:
- Add `min_confidence_gap` to the step/run contract

**Frontend work**:
- "Abstain threshold" slider
- `StepFeed` entry showing "Abstained" instead of a chosen arm

---

### Layer 6 — Observability Dashboard (Phase 4)

coba exposes rich per-arm stats via `get_stats()` and `get_model_state()`.
The `get_coba_state` route already surfaces this. Build a dedicated view.

**Frontend work**:
- New "Diagnostics" tab or panel
- Per-arm: `n_pulls`, `mean_reward`, `last_score` from `BanditStats`
- Per-cluster: which cluster is active, cluster sizes
- Per-arm beta vectors (LinUCB/TS model parameters)
- Tree visualization for Random Forest policies
- GP posterior surface for GP-UCB

---

## Part 3: Development Phases

Each phase adds depth across multiple tracks, so users can compare
algorithms at comparable maturity.

### Phase 1 — Core Playground (Current)

- ✅ 3 context-free algorithms (ucb1, thompson, epsilon_greedy)
- ✅ 1 contextual algorithm (linucb)
- ✅ Basic step/play/rest controls
- ✅ Settings (arms, algorithm, alpha, epsilon, seed)
- ✅ Compare page (two algorithms side-by-side)
- ✅ Regret, rewards, pull-distribution charts
- ✅ Step feed, UCB estimates panel, Why panel

**Phase 1 remaining quick wins**:
- [ ] Add `lints` (linear TS) — minimal code, big A/B value against `linucb`
- [ ] Enable `softmax` — different exploration philosophy
- [ ] Add `n_clusters` slider for all contextual algorithms in Settings

---

### Phase 2 — Advanced Algorithms

Onboard all non-linear contextual algorithms with basic hyperparameter
controls.

**What ships**:

| Feature | Backend | Frontend |
|---------|---------|----------|
| `neural_linear` | Already in ALGORITHM_META + CLUSTER_BANDIT_KWARGS | Add to AlgorithmSelector dropdown |
| `bootstrapped_ts`, `bootstrapped_ucb` | ✅ | AlgorithmSelector |
| `logistic_ucb`, `logistic_ts` | ✅ | AlgorithmSelector |
| `gp_ucb` | ✅ | AlgorithmSelector |
| `random_forest_ucb`, `random_forest_ts` | ✅ | AlgorithmSelector |
| `linucb_hybrid`, `linucb_sw`, `softmax` | ✅ | AlgorithmSelector |
| Per-algorithm hyperparam sliders | Add missing params to ALGORITHM_META | Settings page per-algorithm panel |
| `n_clusters` control | ✅ in CLUSTER_BANDIT_KWARGS | Slider in Settings for contextual algos |

**Comparison strategy**: The Compare page becomes the core value proposition.
Users pick any two algorithms from the full 16 and compare regret, rewards,
confidence intervals, and convergence speed.

---

### Phase 3 — Non-stationary Environments & Dynamic Arms

Introduce reward drift and runtime arm management.

**What ships**:

| Feature | Backend | Frontend |
|---------|---------|----------|
| Drift toggle | Add params to ALGORITHM_META | Settings toggle + drift delta/lambda sliders |
| Simulator-side reward shift | `POST /api/simulate/{id}/shift` — re-roll true_probs | "Introduce drift" button in Playground |
| Drift event feed | Expose per-arm PageHinkley stats | Drift badge in StepFeed + EnvPanel |
| Add arm mid-run | `POST /api/simulate/{id}/arms` | "Add arm" button in EnvPanel |
| Remove arm mid-run | `DELETE /api/simulate/{id}/arms/{arm_id}` | Remove button in EnvPanel |
| Warm-start from existing arm | `warm_start_from` param | Dropdown in add-arm dialog |

---

### Phase 4 — Analysis & Observability

Shift from "watch it run" to "understand why it chose that."

**What ships**:

| Feature | Backend | Frontend |
|---------|---------|----------|
| Per-arm diagnostics panel | Expose BanditStats + model_state | New Diagnostics tab |
| Offline evaluation | `POST /api/evaluate` | New Evaluate tab with CSV upload |
| Decision abstention | `min_confidence_gap` in step contract | Abstain threshold slider + StepFeed display |
| Convergence analysis | Compute convergence_step (already in results) | Time-to-converge chart across runs |
| Multi-run statistics | `POST /api/simulate/batch` with N runs, aggregate | Violin plots for regret distribution |
| Export simulation data | `GET /api/simulate/{id}/export?format=csv` | Download button |

---

### Phase 5 — Continuous Actions & Production Readiness

Graduate from simulation to real-world features.

| Feature | Backend | Frontend |
|---------|---------|----------|
| CATS continuous bandit | New adapter for `ContinuousBandit` | New Continuous page with action-range slider |
| Bandit persistence | `save_bandit` / `load_bandit` routes | Save/Load buttons |
| Traffic constraints | `min_pull_rates` per arm | Minimum-pull slider per arm in Settings |
| Top-K decisions | `decide_top_k(context, k)` | K-selector in Playground |
| Seed management | Random seed history | Seed history dropdown in Settings |

---

## Part 4: Alternative Organization Ideas

### Idea B: By Learning Paradigm (Pedagogical)

Group by *how* the algorithm thinks, not complexity:

- **Optimistic** (UCB family): `ucb1`, `linucb`, `linucb_hybrid`, `linucb_sw`, `logistic_ucb`, `gp_ucb`, `bootstrapped_ucb`, `random_forest_ucb`
- **Posterior sampling** (TS family): `thompson`, `lints`, `neural_linear`, `logistic_ts`, `bootstrapped_ts`, `random_forest_ts`
- **Probabilistic**: `epsilon_greedy`, `softmax`

**Pro**: Teaches the philosophical fork — "add optimism" vs "sample from belief."
**Con**: Uneven group sizes, harder to compare across paradigms.

---

### Idea C: By Regret Curve Shape (Visual-first)

Organize around what the user *sees* in the charts:

- **Fast starters** (low regret early): `thompson`, `ucb1`, `epsilon_greedy`
- **Late bloomers** (catch up after learning): `neural_linear`, `gp_ucb`, `random_forest_*`
- **Steady performers**: `linucb`, `lints`, `softmax`, `logistic_*`
- **Window-limited** (good for drift): `linucb_sw`

**Pro**: Self-documenting — the groupings match what users observe.
**Con**: Requires running benchmarks first to establish which is which.

---

### Idea D: Simulation Scenario Pre-sets (User-goal-first)

Pre-configured scenarios that auto-select relevant algorithms:

- "I want to maximize clicks" → `ucb1` + `thompson` + `epsilon_greedy`
- "I have user features" → `linucb` + `lints` + `linucb_hybrid`
- "My rewards change over time" → `linucb_sw` + drift detection
- "I have complex interactions" → `neural_linear` + `random_forest_ucb` + `gp_ucb`
- "I need explainable decisions" → `ucb1` + `linucb` (linear = interpretable)
- "I have a large action space" → `softmax` (probabilistic) + dynamic arms

**Pro**: Solves the "which algorithm should I pick?" problem immediately.
**Con**: Requires scenario configuration UI.

---

## Implementation Priority (Recommended Order)

```
Phase 1 quick wins (1–2 sessions)
  ├── Add lints, softmax, linucb_hybrid, linucb_sw to AlgorithmSelector
  ├── Wire n_clusters slider for all contextual algorithms
  └── Per-algorithm hyperparam panels in Settings

Phase 2 (2–4 sessions)
  ├── Onboard remaining 9 algorithms with basic controls
  ├── Compare page: any-vs-any algorithm pairing
  └── Full hyperparameter matrix in Settings

Phase 3 (3–5 sessions)
  ├── Drift detection
  ├── Reward distribution shift in simulator
  └── Dynamic arms (add/remove mid-run)

Phase 4 (3–5 sessions)
  ├── Diagnostics/Observability dashboard
  ├── Offline evaluation
  ├── Multi-run aggregation
  └── Convergence analysis

Phase 5 (2–3 sessions)
  ├── Continuous actions (CATS)
  ├── Persistence
  └── Production features (top-K, traffic constraints, abstention)
```
