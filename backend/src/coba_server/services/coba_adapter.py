"""
In-memory CobaAdapter — same algorithms as the TypeScript engine.
No external library dependencies beyond numpy.
"""

from __future__ import annotations

import math

import numpy as np

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

HIDDEN_WEIGHTS: list[dict] = [
    {"weights": [-0.4, -0.7], "bias": -0.3},
    {"weights": [0.8, 0.6], "bias": 0.4},
    {"weights": [0.1, 0.1], "bias": -0.1},
]
MAX_HISTORY_LENGTH = 150


def _sig(x: float) -> float:
    return 1 / (1 + math.exp(-x))


def _sample_beta(a: float, b: float, rng: np.random.Generator) -> float:
    # Use numpy's exact Beta distribution sampling
    # Clamp small values to avoid numerical issues
    aa, bb = max(a, 0.01), max(b, 0.01)
    return float(rng.beta(aa, bb))


def _inv2x2(a_mat: list[list[float]]) -> list[list[float]]:
    det = a_mat[0][0] * a_mat[1][1] - a_mat[0][1] * a_mat[1][0]
    if abs(det) < 1e-10:
        return [[1, 0], [0, 1]]
    return [[a_mat[1][1] / det, -a_mat[0][1] / det], [-a_mat[1][0] / det, a_mat[0][0] / det]]


def _dot2(a: list[float], b: list[float]) -> float:
    return a[0] * b[0] + a[1] * b[1]


def _mat_vec2(mat: list[list[float]], v: list[float]) -> list[float]:
    return [mat[0][0] * v[0] + mat[0][1] * v[1], mat[1][0] * v[0] + mat[1][1] * v[1]]


def _score_ucb1(state: dict, t: int, alpha: float) -> Score:
    if state["n"] == 0:
        return Score(mean=0.0, bonus=99.0, score=99.0, formula="No data yet")
    mean = state["successes"] / state["n"]
    bonus = alpha * math.sqrt(2 * math.log(max(t, 2)) / state["n"])
    return Score(
        mean=mean,
        bonus=bonus,
        score=mean + bonus,
        formula=f"μ̂={mean:.3f} + α√(2ln({t})/{state['n']})={mean + bonus:.3f}",
    )


def _score_epsilon(state: dict) -> Score:
    mean = 0.0 if state["n"] == 0 else state["successes"] / state["n"]
    return Score(mean=mean, bonus=0.0, score=mean, formula=f"μ̂={mean:.3f}")


def _score_thompson(state: dict, rng: np.random.Generator) -> Score:
    a, b = state["successes"] + 1, state["failures"] + 1
    sample = _sample_beta(a, b, rng)
    return Score(
        mean=a / (a + b),
        bonus=0.0,
        score=sample,
        sample=sample,
        formula=f"Beta({a},{b}) → {sample:.3f}",
    )


def _score_linucb(lin_meta: dict, context: list[float], alpha: float) -> Score:
    a_inv = _inv2x2(lin_meta["A"])
    theta = _mat_vec2(a_inv, lin_meta["b"])
    exploit = _dot2(context, theta)
    uncertainty = math.sqrt(max(0, _dot2(context, _mat_vec2(a_inv, context))))
    bonus = alpha * uncertainty
    return Score(
        mean=_sig(exploit),
        bonus=bonus,
        score=exploit + bonus,
        formula=f"θᵀx={exploit:.2f} + α·σ={bonus:.2f}",
    )


class InMemoryCobaAdapter(CobaAdapter):
    """Stateless adapter — same 4 algorithms as the TypeScript engine."""

    def __init__(self) -> None:
        self._next_handle: int = 0
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
        self._seed_counters: dict[int, int] = {}

    def create(
        self,
        arms: list[ArmConfig],
        algorithm: AlgorithmId,
        hyperparams: dict[str, float],
        seed: int,
    ) -> int:
        handle = self._next_handle
        self._next_handle += 1
        alpha = hyperparams.get("alpha", 2.0)
        epsilon = hyperparams.get("epsilon", 0.1)
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
        self._seed_counters[handle] = 0
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
        rng = np.random.default_rng(self._seeds[handle] + self._seed_counters[handle])
        self._seed_counters[handle] += 1
        arms = self._arm_configs[handle]
        arm_states = self._arm_states[handle]
        lin_meta = self._lin_metas[handle]
        algorithm = self._algorithms[handle]
        alpha = self._alphas[handle]
        epsilon = self._epsilons[handle]
        t = self._ts[handle] + 1
        context = [float(rng.uniform(-1, 1)), float(rng.uniform(-1, 1))]

        scores: list[Score] = []
        for i, s in enumerate(arm_states):
            sd = {"n": s.n, "successes": s.successes, "failures": s.failures}
            if algorithm == "ucb1":
                scores.append(_score_ucb1(sd, t, alpha))
            elif algorithm == "epsilon_greedy":
                scores.append(_score_epsilon(sd))
            elif algorithm == "thompson":
                scores.append(_score_thompson(sd, rng))
            elif algorithm == "linucb":
                scores.append(_score_linucb(lin_meta[i].model_dump(), context, alpha))
            else:
                scores.append(_score_ucb1(sd, t, alpha))

        if algorithm == "epsilon_greedy" and rng.random() < epsilon:
            chosen_idx = int(rng.integers(0, len(arms)))
            was_random = True
        else:
            chosen_idx = int(np.argmax([s.score for s in scores]))
            was_random = False

        if algorithm == "linucb":
            probs = [
                _sig(_dot2(w["weights"], context) + w["bias"]) for w in HIDDEN_WEIGHTS[: len(arms)]
            ]
            true_prob = probs[chosen_idx]
            optimal_prob = max(probs)
        else:
            true_prob = arms[chosen_idx].true_prob
            optimal_prob = max(a.true_prob for a in arms)

        outcome = 1.0 if rng.random() < true_prob else 0.0
        step_regret = optimal_prob - true_prob
        prev_cum = self._regret_histories[handle][-1] if self._regret_histories[handle] else 0.0
        cum_regret = prev_cum + step_regret

        s = arm_states[chosen_idx]
        arm_states[chosen_idx] = ArmState(
            n=s.n + 1,
            successes=s.successes + int(outcome),
            failures=s.failures + (1 - int(outcome)),
        )

        if algorithm == "linucb":
            x = context
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
            context=context if algorithm == "linucb" else None,
            was_random=was_random,
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
            self._seed_counters,
        ):
            d.pop(handle, None)

    def get_supported_algorithms(self) -> list[dict]:
        return [{"id": k, **v} for k, v in ALGORITHM_META.items()]
