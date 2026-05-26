"""Pydantic models for simulation API contract."""

from __future__ import annotations

from typing import Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, Field

AlgorithmId = Literal[
    "ucb1",
    "epsilon_greedy",
    "thompson",
    "linucb",
    "lints",
    "linucb_hybrid",
    "neural_linear",
    "bootstrapped_ts",
    "bootstrapped_ucb",
    "logistic_ucb",
    "logistic_ts",
    "gp_ucb",
    "softmax",
    "linucb_sw",
    "random_forest_ucb",
    "random_forest_ts",
]


class ArmConfig(BaseModel):
    id: str
    label: str
    true_prob: float = Field(ge=0.0, le=1.0)
    color: str | None = None
    light_color: str | None = None


class ArmState(BaseModel):
    n: int = Field(default=0, ge=0)
    successes: int = Field(default=0, ge=0)
    failures: int = Field(default=0, ge=0)


class Score(BaseModel):
    mean: float
    bonus: float
    score: float
    sample: float | None = None
    formula: str


class StepRecord(BaseModel):
    t: int
    chosen_idx: int
    outcome: int = Field(ge=0, le=1)
    step_regret: float
    cum_regret: float
    scores: list[Score]
    context: list[float] | None = None
    was_random: bool
    true_prob: float
    optimal_idx: int | None = None
    optimal_prob: float | None = None
    all_true_probs: list[float] | None = None


class LinMeta(BaseModel):
    A: list[list[float]] = Field(default_factory=lambda: [[1.0, 0.0], [0.0, 1.0]])
    b: list[float] = Field(default_factory=lambda: [0.0, 0.0])


class SimState(BaseModel):
    t: int = 0
    arms: list[ArmConfig]
    arm_states: list[ArmState]
    lin_meta: list[LinMeta] = Field(default_factory=list)
    algorithm: AlgorithmId = "ucb1"
    alpha: float = 2.0
    epsilon: float = 0.1
    history: list[StepRecord] = Field(default_factory=list)
    regret_history: list[float] = Field(default_factory=list)


class Simulation(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    state: SimState
    algorithm: AlgorithmId
    seed: int = 42


class CreateSimRequest(BaseModel):
    arms: list[ArmConfig] = Field(min_length=2, max_length=10)
    algorithm: AlgorithmId = "ucb1"
    hyperparams: dict[str, float] = Field(default_factory=dict)
    seed: int = 42


class StepResponse(BaseModel):
    t: int
    step: StepRecord
    arm_states: list[ArmState]
    regret_history: list[float]


class RunRequest(BaseModel):
    steps: int = Field(gt=0, le=10_000)


class RunResponse(BaseModel):
    steps_run: int
    final_t: int
    history: list[StepRecord]
    regret_history: list[float]
    arm_states: list[ArmState]


class ResultsResponse(BaseModel):
    total_steps: int
    cumulative_regret: float
    avg_reward: float
    best_arm_found: str | None = None
    accuracy_table: list[dict] = Field(default_factory=list)
    narrative: str = ""
