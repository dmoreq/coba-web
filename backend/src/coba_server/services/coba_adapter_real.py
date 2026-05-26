"""
Adapter wrapping the real `coba` library's ClusterBandit.
This is the only adapter — InMemoryCobaAdapter removed (always use real coba).
"""

from __future__ import annotations

from typing import Any

import numpy as np
from coba import ClusterBandit, PolicyType

from coba_server.models.algorithms import ALGORITHM_META
from coba_server.models.simulation import (
    AlgorithmId,
    ArmConfig,
    ArmState,
    LinMeta,
    Score,
    SimState,
    StepRecord,
)
from coba_server.services.base import CobaAdapter

MAX_ACTIVE_SIMULATIONS = 100

# Seeded defaults retained for visual continuity in the first three arms.
DEFAULT_CONTEXTUAL_PROFILES: list[dict[str, Any]] = [
    {"weights": [-0.4, -0.7], "bias": -0.3},
    {"weights": [0.8, 0.6], "bias": 0.4},
    {"weights": [0.1, 0.1], "bias": -0.1},
]
MAX_HISTORY_LENGTH = 150

POLICY_MAP: dict[str, PolicyType] = {k: PolicyType(k) for k in ALGORITHM_META}
CONTEXTUAL_ALGORITHMS = set(ALGORITHM_META) - {"ucb1", "thompson"}
INT_HYPERPARAMS = {
    "n_clusters",
    "n_bootstraps",
    "n_shared_features",
    "neural_embedding_dim",
    "neural_retrain_freq",
    "gp_max_obs",
    "linucb_sw_window",
    "rf_n_estimators",
    "rf_max_depth",
    "rf_min_samples_leaf",
    "rf_max_obs",
}
BOOL_HYPERPARAMS = {"scale_contexts", "use_minibatch", "enable_drift_detection"}
CLUSTER_BANDIT_KWARGS = {
    "alpha",
    "v_sq",
    "l2_lambda",
    "gamma",
    "n_clusters",
    "use_minibatch",
    "scale_contexts",
    "epsilon",
    "n_bootstraps",
    "n_shared_features",
    "neural_embedding_dim",
    "neural_retrain_freq",
    "gp_beta",
    "gp_length_scale",
    "gp_noise_var",
    "gp_max_obs",
    "enable_drift_detection",
    "drift_delta",
    "drift_lambda",
}


def _sig(x: float) -> float:
    return float(1 / (1 + np.exp(-x)))


def _cap_score(raw: float) -> float:
    """Replace +inf cold-start scores with a finite sentinel for JSON serialisation."""
    return 99.0 if raw == float("inf") else float(raw)


def _coerce_hyperparam(name: str, value: float) -> Any:
    if name in INT_HYPERPARAMS:
        return int(value)
    if name in BOOL_HYPERPARAMS:
        return bool(value)
    return float(value)


def _contextual_profiles(n_arms: int, seed: int) -> list[dict[str, Any]]:
    """Create deterministic context→reward profiles for any arm count."""
    profiles = [dict(p) for p in DEFAULT_CONTEXTUAL_PROFILES[:n_arms]]
    if len(profiles) >= n_arms:
        return profiles

    rng = np.random.default_rng(seed + 10_000)
    for _ in range(n_arms - len(profiles)):
        profiles.append(
            {
                "weights": rng.uniform(-1.0, 1.0, size=2).round(6).tolist(),
                "bias": float(rng.uniform(-0.5, 0.5)),
            }
        )
    return profiles


class CobaLibraryAdapter(CobaAdapter):
    """Wraps coba's ClusterBandit. Each handle = one ClusterBandit instance."""

    def __init__(self) -> None:
        self._next_handle: int = 0
        self._bandits: dict[int, ClusterBandit] = {}
        self._arm_labels: dict[int, list[str]] = {}
        self._arm_configs: dict[int, list[ArmConfig]] = {}
        self._arm_states: dict[int, list[ArmState]] = {}
        self._lin_metas: dict[int, list[LinMeta]] = {}
        self._algorithms: dict[int, AlgorithmId] = {}
        self._alphas: dict[int, float] = {}
        self._epsilons: dict[int, float] = {}
        self._ts: dict[int, int] = {}
        self._histories: dict[int, list[StepRecord]] = {}
        self._regret_histories: dict[int, list[float]] = {}
        self._seeds: dict[int, int] = {}
        self._reward_profiles: dict[int, list[dict[str, Any]]] = {}

    def _cluster_bandit_kwargs(
        self, algorithm: AlgorithmId, hyperparams: dict[str, float], seed: int
    ) -> dict[str, Any]:
        kwargs = {
            k: _coerce_hyperparam(k, v)
            for k, v in hyperparams.items()
            if k in CLUSTER_BANDIT_KWARGS
        }
        # Hybrid LinUCB requires 0 < n_shared_features < n_features. With this
        # simulator's 2-D context, one shared and one arm-specific feature is valid.
        if algorithm == "linucb_hybrid" and "n_shared_features" not in kwargs:
            kwargs["n_shared_features"] = 1
        kwargs.setdefault("scale_contexts", False)
        kwargs["seed"] = seed
        return kwargs

    def create(
        self,
        arms: list[ArmConfig],
        algorithm: AlgorithmId,
        hyperparams: dict[str, float],
        seed: int,
    ) -> int:
        if len(self._bandits) >= MAX_ACTIVE_SIMULATIONS:
            raise ValueError(f"Maximum of {MAX_ACTIVE_SIMULATIONS} active simulations reached")

        handle = self._next_handle
        self._next_handle += 1
        arm_labels = [a.label for a in arms]
        alpha = hyperparams.get("alpha", 2.0)
        epsilon = hyperparams.get("epsilon", 0.1)
        bandit = ClusterBandit(
            arms=arm_labels,
            n_features=2,
            policy=POLICY_MAP.get(algorithm, PolicyType.UCB1),
            **self._cluster_bandit_kwargs(algorithm, hyperparams, seed),
        )
        self._bandits[handle] = bandit
        self._arm_labels[handle] = arm_labels
        self._arm_configs[handle] = arms
        self._arm_states[handle] = [ArmState() for _ in arms]
        self._lin_metas[handle] = [LinMeta() for _ in arms]
        self._algorithms[handle] = algorithm
        self._alphas[handle] = alpha
        self._epsilons[handle] = epsilon
        self._ts[handle] = 0
        self._histories[handle] = []
        self._regret_histories[handle] = []
        self._seeds[handle] = seed
        self._reward_profiles[handle] = _contextual_profiles(len(arms), seed)
        return handle

    def get_state(self, handle: int) -> SimState:
        return SimState(
            arms=self._arm_configs[handle],
            arm_states=self._arm_states[handle],
            lin_meta=self._lin_metas[handle],
            algorithm=self._algorithms[handle],
            alpha=self._alphas[handle],
            epsilon=self._epsilons[handle],
            t=self._ts[handle],
            history=list(self._histories[handle]),
            regret_history=list(self._regret_histories[handle]),
        )

    def _build_scores(self, dec: object, arm_labels: list[str]) -> list[Score]:
        """Build per-arm Score objects from a coba BanditDecision."""
        from coba.schemas import BanditDecision

        d: BanditDecision = dec  # type: ignore[assignment]
        scores: list[Score] = []
        for label in arm_labels:
            raw = d.all_scores.get(label, 0.0) if d.all_scores else 0.0
            capped = _cap_score(raw)
            breakdown = d.score_breakdown.get(label) if d.score_breakdown else None
            mean = float(breakdown.mean_estimate or 0.0) if breakdown else 0.0
            bonus = float(breakdown.confidence_width or 0.0) if breakdown else 0.0
            status = "cold-start" if raw == 0.0 and not breakdown else f"score={capped:.3f}"
            scores.append(
                Score(
                    mean=mean,
                    bonus=bonus,
                    score=capped,
                    formula=f"coba {status}; μ̂={mean:.3f}; bonus={bonus:.3f}",
                )
            )
        return scores

    def _true_probabilities(
        self, handle: int, context: np.ndarray
    ) -> tuple[list[float], int, float]:
        arms = self._arm_configs[handle]
        algorithm = self._algorithms[handle]
        if algorithm in CONTEXTUAL_ALGORITHMS:
            probs = [
                _sig(float(np.dot(profile["weights"], context) + profile["bias"]))
                for profile in self._reward_profiles[handle]
            ]
        else:
            probs = [float(a.true_prob) for a in arms]
        optimal_idx = int(np.argmax(probs))
        return probs, optimal_idx, float(probs[optimal_idx])

    def step(self, handle: int) -> StepRecord:
        bandit = self._bandits[handle]
        arm_labels = self._arm_labels[handle]
        arm_states = self._arm_states[handle]
        lin_meta = self._lin_metas[handle]
        algorithm = self._algorithms[handle]
        rng = np.random.default_rng(self._seeds[handle])
        self._seeds[handle] += 1
        t = self._ts[handle] + 1
        context = np.array([rng.uniform(-1, 1), rng.uniform(-1, 1)])

        dec = bandit.decide(context)
        chosen_label = dec.chosen_arm
        chosen_idx = arm_labels.index(chosen_label) if chosen_label else 0

        scores = self._build_scores(dec, arm_labels)
        true_probs, optimal_idx, optimal_prob = self._true_probabilities(handle, context)
        true_prob = true_probs[chosen_idx]

        outcome = 1.0 if rng.random() < true_prob else 0.0
        step_regret = optimal_prob - true_prob
        prev_cum = self._regret_histories[handle][-1] if self._regret_histories[handle] else 0.0
        cum_regret = prev_cum + step_regret
        bandit.update(context, chosen_label, float(outcome))

        # Update shadow arm_states (frontend compatibility). Longer-term, prefer
        # ClusterBandit.get_stats() once frontend consumes coba-native state.
        s = arm_states[chosen_idx]
        arm_states[chosen_idx] = ArmState(
            n=s.n + 1,
            successes=s.successes + int(outcome),
            failures=s.failures + (1 - int(outcome)),
        )

        # Update shadow lin_meta for existing frontend LinUCB visualisation.
        if algorithm in {"linucb", "lints", "linucb_sw", "linucb_hybrid"}:
            x = context.tolist()
            m = lin_meta[chosen_idx]
            lin_meta[chosen_idx] = LinMeta(
                A=[
                    [m.A[0][0] + x[0] * x[0], m.A[0][1] + x[0] * x[1]],
                    [m.A[1][0] + x[1] * x[0], m.A[1][1] + x[1] * x[1]],
                ],
                b=[m.b[0] + outcome * x[0], m.b[1] + outcome * x[1]],
            )

        record = StepRecord(
            t=t,
            chosen_idx=chosen_idx,
            outcome=int(outcome),
            step_regret=float(step_regret),
            cum_regret=float(cum_regret),
            scores=scores,
            context=context.tolist() if algorithm in CONTEXTUAL_ALGORITHMS else None,
            was_random=bool(dec.was_random),
            true_prob=float(true_prob),
            optimal_idx=optimal_idx,
            optimal_prob=float(optimal_prob),
            all_true_probs=[float(p) for p in true_probs],
        )
        self._histories[handle].append(record)
        if len(self._histories[handle]) > MAX_HISTORY_LENGTH:
            self._histories[handle] = self._histories[handle][-MAX_HISTORY_LENGTH:]

        self._regret_histories[handle].append(float(cum_regret))
        if len(self._regret_histories[handle]) > MAX_HISTORY_LENGTH:
            self._regret_histories[handle] = self._regret_histories[handle][-MAX_HISTORY_LENGTH:]

        self._ts[handle] = t
        return record

    def get_coba_state(self, handle: int) -> dict:
        """Expose native coba diagnostics for dogfooding dashboards/tests."""
        bandit = self._bandits[handle]
        history = self._histories[handle]
        context = (
            np.array(history[-1].context, dtype=float)
            if history and history[-1].context is not None
            else np.zeros(2, dtype=float)
        )
        return {
            "policy": bandit.policy.value,
            "is_fitted": bandit.is_fitted,
            "stats": [s.model_dump() for s in bandit.get_stats()],
            "scores": {str(k): float(_cap_score(v)) for k, v in bandit.score_all(context).items()},
            "model_state": bandit.get_model_state(context),
        }

    def delete(self, handle: int) -> None:
        for d in (
            self._bandits,
            self._arm_labels,
            self._arm_configs,
            self._arm_states,
            self._lin_metas,
            self._algorithms,
            self._alphas,
            self._epsilons,
            self._ts,
            self._histories,
            self._regret_histories,
            self._seeds,
            self._reward_profiles,
        ):
            d.pop(handle, None)

    def get_supported_algorithms(self) -> list[dict]:
        return [{"id": k, **v} for k, v in ALGORITHM_META.items()]
