"""Tests for context models and scenario registry."""

import pytest

from coba_server.models.context import (
    ContextFeature,
    ContextScenario,
    DriftConfig,
    PopulationSegment,
    RewardProfile,
)
from coba_server.services.scenario_registry import (
    AD_CREATIVE_SELECTION,
    CONTENT_FORMAT,
    NEWS_FEED,
    NOTIFICATION_CHANNELS,
    PRODUCT_RECOMMENDATIONS,
    SCENARIO_REGISTRY,
    get_scenario,
    validate_all_scenarios,
)


class TestContextFeature:
    def test_create_default_ranges(self):
        f = ContextFeature(
            name="mobile_usage",
            label="Mobile Usage",
            description="Mobile vs desktop",
            low_label="desktop-only",
            high_label="mobile-only",
        )
        assert f.min_val == -1.0
        assert f.max_val == 1.0
        assert f.unit is None

    def test_create_with_custom_range(self):
        f = ContextFeature(
            name="price_sensitivity",
            label="Price Sensitivity",
            description="How much user cares about price",
            min_val=-1.0,
            max_val=1.0,
            unit="%",
            low_label="low",
            high_label="high",
        )
        assert f.unit == "%"

    def test_feature_hashable(self):
        f1 = ContextFeature(
            name="mobile", label="Mobile", description="Test", low_label="low", high_label="high"
        )
        f2 = ContextFeature(
            name="mobile", label="Mobile", description="Test", low_label="low", high_label="high"
        )
        # Both should hash to the same value
        assert hash(f1) == hash(f2)


class TestRewardProfile:
    def test_validate_feature_count_success(self):
        profile = RewardProfile(weights=[0.5, -0.3], bias=0.1)
        profile.validate_feature_count(2)  # Should not raise

    def test_validate_feature_count_mismatch(self):
        profile = RewardProfile(weights=[0.5, -0.3], bias=0.1)
        with pytest.raises(ValueError, match="weights"):
            profile.validate_feature_count(3)

    def test_default_bias(self):
        profile = RewardProfile(weights=[0.5])
        assert profile.bias == 0.0


class TestPopulationSegment:
    def test_validate_feature_count_success(self):
        seg = PopulationSegment(
            name="Mobile User",
            weight=0.5,
            context_mean=[0.5, 0.3],
            context_std=[0.1, 0.15],
        )
        seg.validate_feature_count(2)  # Should not raise

    def test_validate_feature_count_mean_mismatch(self):
        seg = PopulationSegment(
            name="Mobile User",
            weight=0.5,
            context_mean=[0.5, 0.3],
            context_std=[0.1, 0.15],
        )
        with pytest.raises(ValueError, match="context_mean"):
            seg.validate_feature_count(3)

    def test_validate_feature_count_std_mismatch(self):
        seg = PopulationSegment(
            name="Mobile User",
            weight=0.5,
            context_mean=[0.5, 0.3, 0.2],
            context_std=[0.1, 0.15],
        )
        with pytest.raises(ValueError, match="context_std"):
            seg.validate_feature_count(3)

    def test_weight_must_be_positive(self):
        with pytest.raises(ValueError):
            PopulationSegment(
                name="Invalid",
                weight=0.0,  # Invalid: must be > 0
                context_mean=[0.5],
                context_std=[0.1],
            )


class TestDriftConfig:
    def test_validate_profiles_success(self):
        drift = DriftConfig(
            drift_step=200,
            drift_duration=100,
            target_profiles=[
                RewardProfile(weights=[0.5, -0.3], bias=0.1),
                RewardProfile(weights=[-0.5, 0.3], bias=-0.1),
            ],
        )
        drift.validate_profiles(n_arms=2, n_features=2)  # Should not raise

    def test_validate_profiles_arm_count_mismatch(self):
        drift = DriftConfig(
            drift_step=200,
            drift_duration=100,
            target_profiles=[
                RewardProfile(weights=[0.5, -0.3], bias=0.1),
            ],
        )
        with pytest.raises(ValueError, match="target_profiles"):
            drift.validate_profiles(n_arms=2, n_features=2)

    def test_validate_profiles_feature_count_mismatch(self):
        drift = DriftConfig(
            drift_step=200,
            drift_duration=100,
            target_profiles=[
                RewardProfile(weights=[0.5], bias=0.1),  # 1 feature
            ],
        )
        with pytest.raises(ValueError):
            drift.validate_profiles(n_arms=1, n_features=2)


class TestContextScenario:
    def test_validate_notification_channels(self):
        """Notification channels scenario must pass validation."""
        NOTIFICATION_CHANNELS.validate_consistency()

    def test_validate_news_feed(self):
        """News feed scenario must pass validation."""
        NEWS_FEED.validate_consistency()

    def test_validate_product_recommendations(self):
        """Product recommendations scenario must pass validation."""
        PRODUCT_RECOMMENDATIONS.validate_consistency()

    def test_validate_content_format(self):
        """Content format scenario must pass validation."""
        CONTENT_FORMAT.validate_consistency()

    def test_validate_ad_creative_selection(self):
        """Ad creative selection scenario must pass validation."""
        AD_CREATIVE_SELECTION.validate_consistency()

    def test_reward_profile_count_mismatch(self):
        """Scenario with wrong number of reward profiles should fail."""
        with pytest.raises(ValueError, match="reward profiles"):
            ContextScenario(
                id="test",
                label="Test",
                description="Test scenario",
                domain="Test",
                features=[
                    ContextFeature(
                        name="f1",
                        label="F1",
                        description="Feature 1",
                        low_label="low",
                        high_label="high",
                    ),
                    ContextFeature(
                        name="f2",
                        label="F2",
                        description="Feature 2",
                        low_label="low",
                        high_label="high",
                    ),
                ],
                arms=[
                    {"id": "a1", "label": "Arm 1", "true_prob": 0.5},
                    {"id": "a2", "label": "Arm 2", "true_prob": 0.5},
                ],
                reward_profiles=[
                    RewardProfile(weights=[0.5, -0.3], bias=0.1),
                    # Missing second profile
                ],
            ).validate_consistency()

    def test_get_feature_count(self):
        assert NOTIFICATION_CHANNELS.get_feature_count() == 2
        assert NEWS_FEED.get_feature_count() == 3
        assert PRODUCT_RECOMMENDATIONS.get_feature_count() == 2

    def test_get_arm_count(self):
        assert NOTIFICATION_CHANNELS.get_arm_count() == 4
        assert NEWS_FEED.get_arm_count() == 5
        assert PRODUCT_RECOMMENDATIONS.get_arm_count() == 5

    def test_has_drift(self):
        assert not NOTIFICATION_CHANNELS.has_drift()
        assert not NEWS_FEED.has_drift()
        assert not PRODUCT_RECOMMENDATIONS.has_drift()
        assert CONTENT_FORMAT.has_drift()
        assert not AD_CREATIVE_SELECTION.has_drift()


class TestScenarioRegistry:
    def test_registry_contains_five_scenarios(self):
        assert len(SCENARIO_REGISTRY) == 5

    def test_registry_has_expected_ids(self):
        expected_ids = {
            "notification_channels",
            "news_feed",
            "product_recommendations",
            "content_format",
            "ad_creative_selection",
        }
        assert set(SCENARIO_REGISTRY.keys()) == expected_ids

    def test_get_scenario_success(self):
        scenario = get_scenario("notification_channels")
        assert scenario.id == "notification_channels"
        assert scenario.label == "Notification Channels"

    def test_get_scenario_not_found(self):
        with pytest.raises(KeyError, match="Unknown scenario"):
            get_scenario("nonexistent_scenario")

    def test_validate_all_scenarios(self):
        """All scenarios in the registry must pass validation."""
        validate_all_scenarios()  # Should not raise

    def test_notification_channels_features_have_semantic_labels(self):
        scenario = get_scenario("notification_channels")
        mobile = scenario.features[0]
        assert mobile.low_label is not None
        assert mobile.high_label is not None
        assert "desktop" in mobile.low_label.lower()
        assert "mobile" in mobile.high_label.lower()

    def test_all_features_across_all_scenarios_have_labels(self):
        for scenario_id, scenario in SCENARIO_REGISTRY.items():
            for f in scenario.features:
                assert f.low_label, f"{scenario_id}.{f.name} missing low_label"
                assert f.high_label, f"{scenario_id}.{f.name} missing high_label"

    def test_each_scenario_validates(self):
        """Test validation of each scenario individually."""
        for scenario_id, scenario in SCENARIO_REGISTRY.items():
            try:
                scenario.validate_consistency()
            except ValueError as e:
                pytest.fail(f"Scenario '{scenario_id}' validation failed: {e}")


class TestScenarioProperties:
    """Test specific properties and relationships in each scenario."""

    def test_notification_channels_segments_sum_to_1(self):
        weights = [s.weight for s in NOTIFICATION_CHANNELS.population_segments]
        total = sum(weights)
        assert 0.99 < total < 1.01  # Allow floating-point rounding

    def test_news_feed_segments_sum_to_1(self):
        weights = [s.weight for s in NEWS_FEED.population_segments]
        total = sum(weights)
        assert 0.99 < total < 1.01

    def test_product_recommendations_segments_sum_to_1(self):
        weights = [s.weight for s in PRODUCT_RECOMMENDATIONS.population_segments]
        total = sum(weights)
        assert 0.99 < total < 1.01

    def test_content_format_has_drift(self):
        assert CONTENT_FORMAT.drift_config is not None
        assert CONTENT_FORMAT.drift_config.drift_step == 200
        assert CONTENT_FORMAT.drift_config.drift_duration == 100

    def test_drift_target_profiles_match_arms(self):
        drift = CONTENT_FORMAT.drift_config
        assert len(drift.target_profiles) == CONTENT_FORMAT.get_arm_count()

    def test_all_arms_have_true_prob(self):
        for scenario in SCENARIO_REGISTRY.values():
            for arm in scenario.arms:
                assert "true_prob" in arm
                assert 0 <= arm["true_prob"] <= 1

    def test_reward_weights_in_reasonable_range(self):
        """Weights should generally be in [-2, 2] for stable sigmoid."""
        for scenario in SCENARIO_REGISTRY.values():
            for profile in scenario.reward_profiles:
                for weight in profile.weights:
                    assert -2 <= weight <= 2, f"Weight {weight} out of range"
                assert -2 <= profile.bias <= 2, f"Bias {profile.bias} out of range"

    def test_news_feed_features_are_length_three(self):
        scenario = get_scenario("news_feed")
        assert scenario.get_feature_count() == 3
        assert all(len(p.weights) == 3 for p in scenario.reward_profiles)

    def test_ad_fatigue_weight_identical_across_all_arms(self):
        scenario = get_scenario("ad_creative_selection")
        fatigue_weights = [round(p.weights[0], 6) for p in scenario.reward_profiles]
        assert len(set(fatigue_weights)) == 1, (
            f"ad_fatigue must be identical across arms, got {fatigue_weights}"
        )

    def test_ad_creative_relevance_weights_differ_per_arm(self):
        scenario = get_scenario("ad_creative_selection")
        relevance_weights = [p.weights[1] for p in scenario.reward_profiles]
        assert len(set(relevance_weights)) == len(relevance_weights)

    def test_population_means_within_feature_bounds(self):
        """Population segment context means should be within feature bounds."""
        for scenario in SCENARIO_REGISTRY.values():
            if scenario.population_segments:
                for segment in scenario.population_segments:
                    for i, mean in enumerate(segment.context_mean):
                        feature = scenario.features[i]
                        assert feature.min_val <= mean <= feature.max_val, (
                            f"Segment '{segment.name}' feature {i} mean {mean} "
                            f"outside bounds [{feature.min_val}, "
                            f"{feature.max_val}]"
                        )
