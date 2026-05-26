"""Tests for Pydantic model validation."""

import pytest
from pydantic import ValidationError

from coba_server.models.simulation import (
    ArmConfig,
    ArmState,
    CreateSimRequest,
    RunRequest,
    Score,
    SimState,
    StepRecord,
)


class TestArmConfig:
    def test_valid(self):
        a = ArmConfig(id="e", label="E", true_prob=0.2)
        assert a.true_prob == 0.2

    def test_invalid_prob_negative(self):
        with pytest.raises(ValidationError):
            ArmConfig(id="x", label="X", true_prob=-0.1)

    def test_invalid_prob_over_one(self):
        with pytest.raises(ValidationError):
            ArmConfig(id="x", label="X", true_prob=1.5)


class TestCreateSimRequest:
    def test_min_arms(self):
        with pytest.raises(ValidationError):
            CreateSimRequest(arms=[ArmConfig(id="a", label="A", true_prob=0.5)])

    def test_max_arms(self):
        arms = [ArmConfig(id=str(i), label=f"A{i}", true_prob=0.5) for i in range(11)]
        with pytest.raises(ValidationError):
            CreateSimRequest(arms=arms)

    def test_defaults(self):
        arms = [
            ArmConfig(id="a", label="A", true_prob=0.5),
            ArmConfig(id="b", label="B", true_prob=0.6),
        ]
        req = CreateSimRequest(arms=arms)
        assert req.algorithm == "ucb1"
        assert req.seed == 42

    def test_invalid_algorithm(self):
        arms = [
            ArmConfig(id="a", label="A", true_prob=0.5),
            ArmConfig(id="b", label="B", true_prob=0.6),
        ]
        with pytest.raises(ValidationError):
            CreateSimRequest(arms=arms, algorithm="bogus")

    def test_json_roundtrip(self):
        arms = [
            ArmConfig(id="a", label="A", true_prob=0.5),
            ArmConfig(id="b", label="B", true_prob=0.7),
        ]
        req = CreateSimRequest(arms=arms, algorithm="thompson", seed=99)
        restored = CreateSimRequest.model_validate_json(req.model_dump_json())
        assert restored == req


class TestArmState:
    def test_non_negative(self):
        with pytest.raises(ValidationError):
            ArmState(n=-1)
        with pytest.raises(ValidationError):
            ArmState(successes=-1)
        with pytest.raises(ValidationError):
            ArmState(failures=-1)


class TestStepRecord:
    def test_outcome_binary(self):
        with pytest.raises(ValidationError):
            StepRecord(
                t=1,
                chosen_idx=0,
                outcome=2,
                step_regret=0,
                cum_regret=0,
                scores=[],
                was_random=False,
                true_prob=0.5,
            )


class TestScore:
    def test_sample_optional(self):
        s = Score(mean=0.5, bonus=0.1, score=0.6, formula="t")
        assert s.sample is None


class TestSimState:
    def test_empty_history(self):
        arms = [ArmConfig(id="a", label="A", true_prob=0.5)]
        st = SimState(arms=arms, arm_states=[ArmState()])
        assert st.history == []
        assert st.regret_history == []


class TestRunRequest:
    def test_steps_positive(self):
        with pytest.raises(ValidationError):
            RunRequest(steps=0)
        with pytest.raises(ValidationError):
            RunRequest(steps=-5)
