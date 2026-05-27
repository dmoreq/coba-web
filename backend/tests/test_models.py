"""Tests for Pydantic model validation."""

import pytest
from pydantic import ValidationError

from coba_server.models.context import (
    ContextFeature,
    ContextScenario,
    DriftConfig,
    PopulationSegment,
    RewardProfile,
)
from coba_server.models.simulation import (
    ArmConfig,
    ArmState,
    CreateSimRequest,
    RunRequest,
    Score,
    SimState,
    StepRecord,
)


def _minimal_scenario_features(n: int) -> list[ContextFeature]:
    return [
        ContextFeature(
            name=f"f{i}",
            label=f"F{i}",
            description="test feature",
            low_label="low",
            high_label="high",
        )
        for i in range(n)
    ]


def _minimal_arms_and_profiles(n_features: int):
    arms = [
        {"id": "a", "label": "A", "true_prob": 0.5},
        {"id": "b", "label": "B", "true_prob": 0.5},
    ]
    profiles = [
        RewardProfile(weights=[0.0] * n_features, bias=0.0),
        RewardProfile(weights=[0.0] * n_features, bias=0.0),
    ]
    return arms, profiles


class TestContextScenarioFeatureCap:
    def test_accepts_sixteen_features(self):
        n = 16
        arms, profiles = _minimal_arms_and_profiles(n)
        scenario = ContextScenario(
            id="test_sixteen",
            label="Test",
            description="d",
            domain="Test",
            features=_minimal_scenario_features(n),
            arms=arms,
            reward_profiles=profiles,
        )
        assert scenario.get_feature_count() == 16

    def test_rejects_seventeen_features(self):
        n = 17
        arms, profiles = _minimal_arms_and_profiles(n)
        with pytest.raises(ValidationError):
            ContextScenario(
                id="test_seventeen",
                label="Test",
                description="d",
                domain="Test",
                features=_minimal_scenario_features(n),
                arms=arms,
                reward_profiles=profiles,
            )


class TestRewardProfile:
    def test_interaction_weights_default_none(self):
        profile = RewardProfile(weights=[0.5, 0.3], bias=0.1)
        assert profile.interaction_weights is None

    def test_rejects_wrong_interaction_count(self):
        profile = RewardProfile(weights=[0.5, 0.3], bias=0.0, interaction_weights=[1.0, 0.5])
        with pytest.raises(ValueError, match="interaction weights"):
            profile.validate_feature_count(2)


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


class TestPopulationSegmentValidation:
    def test_rejects_wrong_correlation_count(self):
        segment = PopulationSegment(
            name="Bad",
            weight=1.0,
            context_mean=[0.0, 0.0],
            context_std=[1.0, 1.0],
            context_correlations=[0.5, 0.1, 0.2],
        )
        with pytest.raises(ValueError, match="context_correlations"):
            segment.validate_feature_count(2)


class TestContextScenarioValidateConsistencyErrors:
    def test_reward_profile_mismatch_wraps_index(self):
        arms, profiles = _minimal_arms_and_profiles(3)
        scenario = ContextScenario(
            id="bad_reward",
            label="Bad",
            description="d",
            domain="Test",
            features=_minimal_scenario_features(2),
            arms=arms,
            reward_profiles=profiles,
        )
        with pytest.raises(ValueError, match=r"reward_profiles\[0\]"):
            scenario.validate_consistency()

    def test_population_segment_mismatch_wraps_index(self):
        arms, profiles = _minimal_arms_and_profiles(2)
        bad_segment = PopulationSegment(
            name="S",
            weight=1.0,
            context_mean=[0.0],
            context_std=[1.0],
        )
        scenario = ContextScenario(
            id="bad_segment",
            label="Bad",
            description="d",
            domain="Test",
            features=_minimal_scenario_features(2),
            arms=arms,
            reward_profiles=profiles,
            population_segments=[bad_segment],
        )
        with pytest.raises(ValueError, match=r"population_segments\[0\]"):
            scenario.validate_consistency()

    def test_drift_config_mismatch_wraps_prefix(self):
        arms, profiles = _minimal_arms_and_profiles(2)
        scenario = ContextScenario(
            id="bad_drift",
            label="Bad",
            description="d",
            domain="Test",
            features=_minimal_scenario_features(2),
            arms=arms,
            reward_profiles=profiles,
            drift_config=DriftConfig(
                drift_step=10,
                drift_duration=5,
                target_profiles=[profiles[0]],
            ),
        )
        with pytest.raises(ValueError, match="drift_config"):
            scenario.validate_consistency()
