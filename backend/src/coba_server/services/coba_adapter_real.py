"""
Adapter wrapping the real `coba` library's ClusterBandit.
Swappable via di.py — toggle USE_COBA_LIBRARY.
"""

from __future__ import annotations

from typing import ClassVar

import numpy as np
from coba import ClusterBandit, PolicyType

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

HIDDEN_WEIGHTS: list[dict] = [
    {"weights": [-0.4, -0.7], "bias": -0.3},
    {"weights": [0.8, 0.6], "bias": 0.4},
    {"weights": [0.1, 0.1], "bias": -0.1},
]
MAX_HISTORY_LENGTH = 150
POLICY_MAP: dict[AlgorithmId, PolicyType] = {
    "ucb1": PolicyType.UCB1,
    "epsilon_greedy": PolicyType.EPSILON_GREEDY,
    "thompson": PolicyType.THOMPSON,
    "linucb": PolicyType.LIN_UCB,
}


def _sig(x: float) -> float:
    return 1 / (1 + np.exp(-x))


class CobaLibraryAdapter(CobaAdapter):
    """Wraps coba's ClusterBandit. Each handle = one ClusterBandit instance."""

    ALGORITHM_META: ClassVar[dict[str, dict]] = {
        "ucb1": {
            "label": "UCB1",
            "description": "Optimistic — uncertainty bonus",
            "hyperparams": ["alpha"],
        },
        "epsilon_greedy": {
            "label": "ε-Greedy",
            "description": "Random exploration with prob ε",
            "hyperparams": ["epsilon"],
        },
        "thompson": {
            "label": "Thompson Sampling",
            "description": "Bayesian Beta posteriors",
            "hyperparams": [],
        },
        "linucb": {
            "label": "LinUCB",
            "description": "Contextual linear UCB",
            "hyperparams": ["alpha"],
        },
    }

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

    def create(
        self,
        arms: list[ArmConfig],
        algorithm: AlgorithmId,
        hyperparams: dict[str, float],
        seed: int,
    ) -> int:
        handle = self._next_handle
        self._next_handle += 1
        arm_labels = [a.label for a in arms]
        alpha = hyperparams.get("alpha", 2.0)
        epsilon = hyperparams.get("epsilon", 0.1)
        bandit = ClusterBandit(
            arms=arm_labels,
            n_features=2,
            policy=POLICY_MAP.get(algorithm, PolicyType.UCB1),
            alpha=alpha,
            epsilon=epsilon,
            seed=seed,
            scale_contexts=False,
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

    def step(self, handle: int) -> StepRecord:
        bandit = self._bandits[handle]
        arm_labels = self._arm_labels[handle]
        arms = self._arm_configs[handle]
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

        scores: list[Score] = []
        if dec.all_scores:
            for i, label in enumerate(arm_labels):
                raw = dec.all_scores.get(label, 0.0)
                scores.append(
                    Score(
                        mean=dec.mean_estimate if dec.mean_estimate is not None else 0.0,
                        bonus=dec.confidence_width if dec.confidence_width is not None else 0.0,
                        score=99.0 if raw == float("inf") else float(raw),
                        formula=f"coba: {raw:.3f}",
                    )
                )
        else:
            for i in range(len(arm_labels)):
                scores.append(
                    Score(
                        mean=0.0,
                        bonus=99.0,
                        score=99.0 if i == chosen_idx else 0.0,
                        formula="Cold start",
                    )
                )

        if algorithm == "linucb":
            probs = [
                _sig(np.dot(w["weights"], context) + w["bias"]) for w in HIDDEN_WEIGHTS[: len(arms)]
            ]
            true_prob = float(probs[chosen_idx])
            optimal_prob = float(max(probs))
        else:
            true_prob = arms[chosen_idx].true_prob
            optimal_prob = float(max(a.true_prob for a in arms))

        outcome = 1.0 if rng.random() < true_prob else 0.0
        step_regret = optimal_prob - true_prob
        prev_cum = self._regret_histories[handle][-1] if self._regret_histories[handle] else 0.0
        cum_regret = prev_cum + step_regret
        bandit.update(context, chosen_label, float(outcome))

        s = arm_states[chosen_idx]
        arm_states[chosen_idx] = ArmState(
            n=s.n + 1,
            successes=s.successes + int(outcome),
            failures=s.failures + (1 - int(outcome)),
        )

        if algorithm == "linucb":
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
            context=context.tolist() if algorithm == "linucb" else None,
            was_random=False,
            true_prob=float(true_prob),
        )
        self._histories[handle].append(record)
        if len(self._histories[handle]) > MAX_HISTORY_LENGTH:
            self._histories[handle] = self._histories[handle][-MAX_HISTORY_LENGTH:]
        self._regret_histories[handle].append(float(cum_regret))
        self._ts[handle] = t
        return record

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
        ):
            d.pop(handle, None)

    def get_supported_algorithms(self) -> list[dict]:
        return [{"id": k, **v} for k, v in self.ALGORITHM_META.items()]
