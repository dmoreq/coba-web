"""Tests for CobaLibraryAdapter._get_reward_params drift branches."""

import pytest

from coba_server.models.context import (
    ContextFeature,
    ContextScenario,
    DriftConfig,
    RewardProfile,
)
from coba_server.models.simulation import ArmConfig
from coba_server.services.coba_adapter_real import CobaLibraryAdapter
from coba_server.services.scenario_registry import get_scenario

CONTENT_ARMS = [
    ArmConfig(id="shortform", label="Short-Form Video", true_prob=0.7),
    ArmConfig(id="longform", label="Long-Form Article", true_prob=0.4),
    ArmConfig(id="infographic", label="Infographic", true_prob=0.5),
    ArmConfig(id="podcast", label="Podcast", true_prob=0.45),
    ArmConfig(id="interactive", label="Interactive", true_prob=0.5),
]


def _two_feature_drift_scenario(
    initial_inter: list[float] | None,
    target_inter: list[float] | None,
) -> ContextScenario:
    features = [
        ContextFeature(
            name="f0",
            label="F0",
            description="a",
            low_label="low",
            high_label="high",
        ),
        ContextFeature(
            name="f1",
            label="F1",
            description="b",
            low_label="low",
            high_label="high",
        ),
    ]
    arms = [
        {"id": "a", "label": "A", "true_prob": 0.5},
        {"id": "b", "label": "B", "true_prob": 0.5},
    ]
    initial = RewardProfile(weights=[1.0, 0.0], bias=0.0, interaction_weights=initial_inter)
    target = RewardProfile(weights=[0.0, 1.0], bias=1.0, interaction_weights=target_inter)
    return ContextScenario(
        id="drift_inter_test",
        label="Drift Inter Test",
        description="synthetic",
        domain="Test",
        features=features,
        arms=arms,
        reward_profiles=[initial, initial],
        drift_config=DriftConfig(
            drift_step=10,
            drift_duration=10,
            target_profiles=[target, target],
        ),
    )


@pytest.fixture
def content_format_handle():
    adapter = CobaLibraryAdapter()
    handle = adapter.create(CONTENT_ARMS, "linucb", {"alpha": 2.0}, 42, "content_format")
    return adapter, handle


@pytest.fixture
def drift_inter_handle(monkeypatch):
    def _make(initial_inter: list[float] | None, target_inter: list[float] | None):
        adapter = CobaLibraryAdapter()
        arms = [
            ArmConfig(id="a", label="A", true_prob=0.5),
            ArmConfig(id="b", label="B", true_prob=0.5),
        ]
        handle = adapter.create(arms, "linucb", {"alpha": 2.0}, 1, "notification_channels")
        scenario = _two_feature_drift_scenario(initial_inter, target_inter)
        monkeypatch.setitem(adapter._scenarios, handle, scenario)
        return adapter, handle

    return _make


class TestGetRewardParamsDrift:
    def test_before_drift_onset_uses_initial_profile(self, content_format_handle):
        adapter, handle = content_format_handle
        scenario = get_scenario("content_format")
        drift = scenario.drift_config
        assert drift is not None
        t_before = drift.drift_step - 1

        weights, bias, inter = adapter._get_reward_params(handle, 0, t_before)
        initial = scenario.reward_profiles[0]

        assert weights == initial.weights
        assert bias == initial.bias
        assert inter == initial.interaction_weights

    def test_after_drift_complete_uses_target_profile(self, content_format_handle):
        adapter, handle = content_format_handle
        scenario = get_scenario("content_format")
        drift = scenario.drift_config
        assert drift is not None
        t_after = drift.drift_step + drift.drift_duration

        weights, bias, inter = adapter._get_reward_params(handle, 0, t_after)
        target = drift.target_profiles[0]

        assert weights == target.weights
        assert bias == target.bias
        assert inter == target.interaction_weights

    def test_mid_drift_interpolates_weights_and_bias(self, content_format_handle):
        adapter, handle = content_format_handle
        scenario = get_scenario("content_format")
        drift = scenario.drift_config
        assert drift is not None
        t_mid = drift.drift_step + drift.drift_duration // 2

        weights, bias, _ = adapter._get_reward_params(handle, 0, t_mid)
        initial = scenario.reward_profiles[0]
        target = drift.target_profiles[0]

        expected_weights = [
            initial.weights[i] * 0.5 + target.weights[i] * 0.5 for i in range(len(initial.weights))
        ]
        expected_bias = initial.bias * 0.5 + target.bias * 0.5

        assert weights == pytest.approx(expected_weights)
        assert bias == pytest.approx(expected_bias)

    def test_mid_drift_both_interactions_none_stays_none(self, content_format_handle):
        adapter, handle = content_format_handle
        scenario = get_scenario("content_format")
        drift = scenario.drift_config
        assert drift is not None
        t_mid = drift.drift_step + drift.drift_duration // 2

        _, _, inter = adapter._get_reward_params(handle, 0, t_mid)

        assert inter is None


class TestGetRewardParamsInteractionDrift:
    def test_initial_none_target_present_ramps_from_zero(self, drift_inter_handle):
        adapter, handle = drift_inter_handle(None, [2.0, 4.0])
        _, _, inter = adapter._get_reward_params(handle, 0, 15)
        assert inter == pytest.approx([1.0, 2.0])

    def test_initial_present_target_none_decays_to_zero(self, drift_inter_handle):
        adapter, handle = drift_inter_handle([2.0, 4.0], None)
        _, _, inter = adapter._get_reward_params(handle, 0, 15)
        assert inter == pytest.approx([1.0, 2.0])

    def test_both_present_elementwise_interpolation(self, drift_inter_handle):
        adapter, handle = drift_inter_handle([0.0, 4.0], [2.0, 0.0])
        _, _, inter = adapter._get_reward_params(handle, 0, 15)
        assert inter == pytest.approx([1.0, 2.0])
