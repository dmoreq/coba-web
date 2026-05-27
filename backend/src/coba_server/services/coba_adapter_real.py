"""
Adapter wrapping the real `coba` library's ClusterBandit.
Scenarios drive context generation, reward functions, and drift dynamics.
"""

from __future__ import annotations

from typing import Any

import numpy as np
from coba import ClusterBandit, PolicyType
from scipy.stats import truncnorm

from coba_server.models.algorithms import ALGORITHM_META
from coba_server.models.context import ContextScenario
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
from coba_server.services.scenario_registry import get_scenario

MAX_ACTIVE_SIMULATIONS = 100
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
    """Sigmoid function for reward probability."""
    return float(1 / (1 + np.exp(-x)))


def _truncated_normal(
    rng: np.random.Generator,
    mean: float,
    std: float,
    low: float,
    high: float,
) -> float:
    if std <= 0:
        return float(np.clip(mean, low, high))
    a, b = (low - mean) / std, (high - mean) / std
    return float(truncnorm.rvs(a, b, loc=mean, scale=std, random_state=rng))


def _cap_score(raw: float) -> float:
    """Replace +inf cold-start scores with a finite sentinel for JSON serialisation."""
    return 99.0 if raw == float("inf") else float(raw)


def _lin_meta_for_features(n_features: int) -> LinMeta:
    """Identity A and zero b for n-dimensional LinUCB shadow state."""
    return LinMeta(
        A=[[1.0 if i == j else 0.0 for j in range(n_features)] for i in range(n_features)],
        b=[0.0] * n_features,
    )


def _coerce_hyperparam(name: str, value: float) -> Any:
    if name in INT_HYPERPARAMS:
        return int(value)
    if name in BOOL_HYPERPARAMS:
        return bool(value)
    return float(value)


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
        self._rngs: dict[int, np.random.Generator] = {}
        self._scenarios: dict[int, ContextScenario] = {}

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
        arms: list[ArmConfig] | None,
        algorithm: AlgorithmId,
        hyperparams: dict[str, float],
        seed: int,
        scenario_id: str = "notification_channels",
    ) -> int:
        if len(self._bandits) >= MAX_ACTIVE_SIMULATIONS:
            raise ValueError(f"Maximum of {MAX_ACTIVE_SIMULATIONS} active simulations reached")

        # Resolve scenario
        scenario = get_scenario(scenario_id)

        # Use scenario arms if not provided; otherwise use provided arms
        if arms is None:
            arm_dicts = scenario.arms
            arm_configs = [
                ArmConfig(
                    id=arm["id"],
                    label=arm["label"],
                    true_prob=arm["true_prob"],
                    color=arm.get("color"),
                    light_color=arm.get("light_color"),
                )
                for arm in arm_dicts
            ]
        else:
            arm_configs = arms

        handle = self._next_handle
        self._next_handle += 1
        arm_labels = [a.label for a in arm_configs]
        alpha = hyperparams.get("alpha", 2.0)
        epsilon = hyperparams.get("epsilon", 0.1)

        n_features = scenario.get_feature_count()
        bandit = ClusterBandit(
            arms=arm_labels,
            n_features=n_features,
            policy=POLICY_MAP.get(algorithm, PolicyType.UCB1),
            **self._cluster_bandit_kwargs(algorithm, hyperparams, seed),
        )
        self._bandits[handle] = bandit
        self._arm_labels[handle] = arm_labels
        self._arm_configs[handle] = arm_configs
        self._arm_states[handle] = [ArmState() for _ in arm_configs]
        self._lin_metas[handle] = [_lin_meta_for_features(n_features) for _ in arm_configs]
        self._algorithms[handle] = algorithm
        self._alphas[handle] = alpha
        self._epsilons[handle] = epsilon
        self._ts[handle] = 0
        self._histories[handle] = []
        self._regret_histories[handle] = []
        self._rngs[handle] = np.random.default_rng(seed)
        self._scenarios[handle] = scenario

        return handle

    def get_state(self, handle: int) -> SimState:
        scenario = self._scenarios[handle]
        return SimState(
            arms=self._arm_configs[handle],
            arm_states=self._arm_states[handle],
            lin_meta=self._lin_metas[handle],
            algorithm=self._algorithms[handle],
            alpha=self._alphas[handle],
            epsilon=self._epsilons[handle],
            scenario_id=scenario.id,
            feature_names=[f.name for f in scenario.features],
            feature_labels=[f.label for f in scenario.features],
            feature_descriptions=[f.description for f in scenario.features],
            feature_units=[f.unit for f in scenario.features],
            feature_mins=[f.min_val for f in scenario.features],
            feature_maxs=[f.max_val for f in scenario.features],
            feature_low_labels=[f.low_label for f in scenario.features],
            feature_high_labels=[f.high_label for f in scenario.features],
            history_window=MAX_HISTORY_LENGTH,
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

    def _sample_context(
        self, handle: int, rng: np.random.Generator
    ) -> tuple[np.ndarray, str | None]:
        """
        Sample a context vector from the scenario distribution.
        Returns (context_vector, segment_name).
        """
        scenario = self._scenarios[handle]
        n_features = scenario.get_feature_count()

        segment_name: str | None = None

        if scenario.population_segments:
            # Sample a segment by weight
            weights = [s.weight for s in scenario.population_segments]
            total_weight = sum(weights)
            normalized_weights = [w / total_weight for w in weights]
            segment_idx = rng.choice(len(scenario.population_segments), p=normalized_weights)
            segment = scenario.population_segments[segment_idx]
            segment_name = segment.name

            # Sample from the segment's distribution
            context = np.array(
                [
                    _truncated_normal(
                        rng,
                        segment.context_mean[i],
                        segment.context_std[i],
                        scenario.features[i].min_val,
                        scenario.features[i].max_val,
                    )
                    for i in range(n_features)
                ]
            )
        else:
            # Uniform over feature ranges
            context = np.array(
                [
                    rng.uniform(scenario.features[i].min_val, scenario.features[i].max_val)
                    for i in range(n_features)
                ]
            )

        return context, segment_name

    def _get_reward_weights(self, handle: int, arm_idx: int, t: int) -> tuple[list[float], float]:
        """
        Get the reward weights (and bias) for an arm, accounting for drift.
        Returns (weights, bias).
        """
        scenario = self._scenarios[handle]
        if arm_idx >= len(scenario.reward_profiles):
            raise IndexError("Scenario reward profile missing for arm")
        profile = scenario.reward_profiles[arm_idx]

        if not scenario.drift_config:
            # No drift: return profile as-is
            return profile.weights, profile.bias

        # Drift logic: interpolate between initial and target profiles
        drift = scenario.drift_config
        if t < drift.drift_step:
            # Before drift: use initial profiles
            return profile.weights, profile.bias
        elif t >= drift.drift_step + drift.drift_duration:
            # After drift complete: use target profiles
            target_profile = drift.target_profiles[arm_idx]
            return target_profile.weights, target_profile.bias
        else:
            # During drift: linearly interpolate
            progress = (t - drift.drift_step) / drift.drift_duration
            initial_weights = profile.weights
            target_weights = drift.target_profiles[arm_idx].weights
            initial_bias = profile.bias
            target_bias = drift.target_profiles[arm_idx].bias

            interpolated_weights = [
                initial_weights[i] * (1 - progress) + target_weights[i] * progress
                for i in range(len(initial_weights))
            ]
            interpolated_bias = initial_bias * (1 - progress) + target_bias * progress

            return interpolated_weights, interpolated_bias

    def _true_probabilities(
        self, handle: int, context: np.ndarray, t: int
    ) -> tuple[list[float], int, float]:
        """
        Compute true reward probabilities for each arm given a context,
        accounting for drift.
        Returns (probabilities, optimal_arm_idx, optimal_probability).
        """
        arm_configs = self._arm_configs[handle]
        algorithm = self._algorithms[handle]

        if algorithm in CONTEXTUAL_ALGORITHMS:
            # Compute probabilities from scenario reward profiles
            probs = []
            for i, arm in enumerate(arm_configs):
                if i < len(self._scenarios[handle].reward_profiles):
                    weights, bias = self._get_reward_weights(handle, i, t)
                    logit = float(np.dot(weights, context) + bias)
                    prob = _sig(logit)
                else:
                    # Custom arm lists can exceed the scenario template's reward
                    # profiles. Fall back to the arm's static true_prob instead of
                    # failing the whole simulation.
                    prob = float(arm.true_prob)
                probs.append(prob)
        else:
            # Context-free: use arm.true_prob
            probs = [float(a.true_prob) for a in arm_configs]

        optimal_idx = int(np.argmax(probs))
        return probs, optimal_idx, float(probs[optimal_idx])

    def step(self, handle: int) -> StepRecord:
        bandit = self._bandits[handle]
        arm_labels = self._arm_labels[handle]
        arm_states = self._arm_states[handle]
        lin_meta = self._lin_metas[handle]
        algorithm = self._algorithms[handle]
        rng = self._rngs[handle]
        t = self._ts[handle] + 1

        # Sample context
        context, context_segment = self._sample_context(handle, rng)

        dec = bandit.decide(context)
        chosen_label = dec.chosen_arm
        chosen_label_str = chosen_label if isinstance(chosen_label, str) else None
        chosen_idx = arm_labels.index(chosen_label_str) if chosen_label_str else 0

        scores = self._build_scores(dec, arm_labels)
        true_probs, optimal_idx, optimal_prob = self._true_probabilities(handle, context, t)
        true_prob = true_probs[chosen_idx]

        outcome = 1.0 if rng.random() < true_prob else 0.0
        step_regret = optimal_prob - true_prob
        prev_cum = self._regret_histories[handle][-1] if self._regret_histories[handle] else 0.0
        cum_regret = prev_cum + step_regret
        bandit.update(context, chosen_label_str or arm_labels[chosen_idx], float(outcome))

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
            n = len(x)
            m = lin_meta[chosen_idx]
            lin_meta[chosen_idx] = LinMeta(
                A=[[m.A[i][j] + x[i] * x[j] for j in range(n)] for i in range(n)],
                b=[m.b[i] + outcome * x[i] for i in range(n)],
            )

        record = StepRecord(
            t=t,
            chosen_idx=chosen_idx,
            outcome=int(outcome),
            step_regret=float(step_regret),
            cum_regret=float(cum_regret),
            scores=scores,
            context=context.tolist() if algorithm in CONTEXTUAL_ALGORITHMS else None,
            context_segment=context_segment,
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
            else np.zeros(self._scenarios[handle].get_feature_count(), dtype=float)
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
            self._rngs,
            self._scenarios,
        ):
            d.pop(handle, None)

    def get_supported_algorithms(self) -> list[dict]:
        return [{"id": k, **v} for k, v in ALGORITHM_META.items()]
