"""Integration tests for CobaLibraryAdapter — exercises the real coba library."""

from unittest.mock import patch

import numpy as np
import pytest

from coba_server.models.context import ContextFeature, ContextScenario, RewardProfile
from coba_server.models.simulation import ArmConfig
from coba_server.services.coba_adapter_real import CobaLibraryAdapter, _compute_logit, _sig
from coba_server.services.scenario_registry import get_scenario
from coba_server.utils.cyclic_time import encode_cyclic_time

TWO_ARMS = [
    ArmConfig(id="a", label="A", true_prob=0.5),
    ArmConfig(id="b", label="B", true_prob=0.6),
]

CLUSTER_BANDIT_ALGORITHMS = (
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
)


@pytest.fixture
def adapter():
    return CobaLibraryAdapter()


class TestCobaLibraryAdapter:
    def test_create_returns_handle(self, adapter):
        assert adapter.create(TWO_ARMS, "ucb1", {"alpha": 2.0}, 42, "notification_channels") == 0

    def test_get_state_returns_sim_state(self, adapter):
        h = adapter.create(TWO_ARMS, "ucb1", {"alpha": 2.0}, 42, "notification_channels")
        st = adapter.get_state(h)
        assert st.t == 0 and len(st.arm_states) == 2

    def test_step_increments_t(self, adapter):
        h = adapter.create(TWO_ARMS, "ucb1", {"alpha": 2.0}, 42, "notification_channels")
        r = adapter.step(h)
        assert r.t == 1 and adapter.get_state(h).t == 1

    def test_step_supports_all_cluster_bandit_algorithms(self, adapter):
        """Every discrete ClusterBandit policy exposed by coba must complete a step."""
        for algo in CLUSTER_BANDIT_ALGORITHMS:
            h = adapter.create(TWO_ARMS, algo, {}, 42, "notification_channels")
            assert adapter._bandits[h].policy.value == algo
            r = adapter.step(h)
            assert r.outcome in (0, 1), f"{algo}: outcome must be binary"

    def test_epsilon_greedy_was_random_sometimes_true(self, adapter):
        """With epsilon=0.6 across 40 steps, some steps must be random explorations."""
        arms = [
            ArmConfig(id="a", label="A", true_prob=0.3),
            ArmConfig(id="b", label="B", true_prob=0.7),
        ]
        h = adapter.create(arms, "epsilon_greedy", {"epsilon": 0.6}, 42, "notification_channels")
        was_random_steps = []
        for _ in range(40):
            r = adapter.step(h)
            was_random_steps.append(r.was_random)
        # With epsilon=0.6 and 40 steps, at least 5 random explorations expected.
        assert any(was_random_steps), "epsilon_greedy: no random exploration recorded"

    def test_scores_have_finite_values(self, adapter):
        """Scores must cap inf at 99.0 and never be truly infinite in the response."""
        h = adapter.create(TWO_ARMS, "ucb1", {"alpha": 2.0}, 42, "notification_channels")
        for _ in range(5):
            r = adapter.step(h)
        for score in r.scores:
            assert score.score < float("inf"), "score must be finite (inf should be capped at 99)"

    def test_linucb_supports_more_than_three_arms(self, adapter):
        """Contextual reward profiles must be generated for all configured arms."""
        arms = [ArmConfig(id=str(i), label=f"A{i}", true_prob=0.1 + 0.05 * i) for i in range(6)]
        h = adapter.create(arms, "linucb", {"alpha": 2.0}, 42, "notification_channels")
        for _ in range(12):
            r = adapter.step(h)
            assert 0 <= r.chosen_idx < len(arms)
            assert r.all_true_probs is not None
            assert len(r.all_true_probs) == len(arms)
            assert r.optimal_idx is not None
            assert 0 <= r.optimal_idx < len(arms)

    def test_chosen_arm_score_uses_coba_breakdown(self, adapter):
        """Chosen-arm score should use coba's BanditDecision score_breakdown."""
        h = adapter.create(TWO_ARMS, "ucb1", {"alpha": 2.0}, 42, "notification_channels")
        for _ in range(10):
            r = adapter.step(h)
        chosen_score = r.scores[r.chosen_idx]
        assert chosen_score.formula.startswith("coba")
        assert chosen_score.mean >= 0
        assert chosen_score.bonus >= 0

    def test_regret_history_capped(self, adapter):
        """regret_history must not grow beyond MAX_HISTORY_LENGTH entries."""
        from coba_server.services.coba_adapter_real import MAX_HISTORY_LENGTH

        h = adapter.create(TWO_ARMS, "ucb1", {}, 42, "notification_channels")
        for _ in range(MAX_HISTORY_LENGTH + 50):
            adapter.step(h)
        st = adapter.get_state(h)
        assert len(st.regret_history) <= MAX_HISTORY_LENGTH
        assert len(st.history) <= MAX_HISTORY_LENGTH

    def test_delete_cleans_up(self, adapter):
        h = adapter.create(TWO_ARMS, "ucb1", {"alpha": 2.0}, 42, "notification_channels")
        adapter.delete(h)
        with pytest.raises(KeyError):
            adapter.get_state(h)

    def test_cold_start_round_robins_arms(self, adapter):
        """Before coba fits the cluster model, all arms must be visited (round-robin)."""
        arms = [
            ArmConfig(id="a", label="A", true_prob=0.3),
            ArmConfig(id="b", label="B", true_prob=0.5),
            ArmConfig(id="c", label="C", true_prob=0.7),
        ]
        h = adapter.create(arms, "linucb", {"alpha": 2.0}, 42, "notification_channels")
        chosen_idxs = set()
        for _ in range(9):  # 3 arms × 3 rounds should cover all
            r = adapter.step(h)
            chosen_idxs.add(r.chosen_idx)
        assert chosen_idxs == {0, 1, 2}, (
            "All arms must be chosen at least once during the first 9 steps; "
            f"only saw {chosen_idxs}"
        )


class TestHyperparamsPassthrough:
    """Verify hyperparameters are accepted by ClusterBandit without error."""

    @pytest.fixture
    def adapter(self):
        return CobaLibraryAdapter()

    def test_empty_hyperparams_all_algorithms(self, adapter):
        """Every ClusterBandit algo must create and step without crashing
        using empty hyperparams.
        """
        for algo in CLUSTER_BANDIT_ALGORITHMS:
            h = adapter.create(TWO_ARMS, algo, {}, 42, "notification_channels")
            r = adapter.step(h)
            assert r.t == 1, f"{algo}: step must succeed with empty hyperparams"

    def test_n_clusters_respected(self, adapter):
        """Cluster count should be configurable — full hyperparams bag."""
        h = adapter.create(
            TWO_ARMS, "linucb", {"n_clusters": 3, "alpha": 2.0}, 42, "notification_channels"
        )
        for _ in range(5):
            adapter.step(h)
        assert adapter.get_state(h).t == 5

    def test_alpha_respected_ucb1(self, adapter):
        """UCB1 accepts alpha hyperparameter."""
        h = adapter.create(TWO_ARMS, "ucb1", {"alpha": 5.0}, 42, "notification_channels")
        for _ in range(5):
            adapter.step(h)
        assert adapter.get_state(h).t == 5

    def test_l2_lambda_respected_linucb(self, adapter):
        """LinUCB accepts l2_lambda hyperparameter."""
        h = adapter.create(TWO_ARMS, "linucb", {"l2_lambda": 0.5}, 42, "notification_channels")
        for _ in range(5):
            adapter.step(h)
        assert adapter.get_state(h).t == 5

    def test_gamma_respected_linucb(self, adapter):
        """LinUCB accepts gamma hyperparameter."""
        h = adapter.create(TWO_ARMS, "linucb", {"gamma": 0.9}, 42, "notification_channels")
        for _ in range(5):
            adapter.step(h)
        assert adapter.get_state(h).t == 5

    def test_v_sq_respected_lints(self, adapter):
        """LinTS accepts v_sq hyperparameter."""
        h = adapter.create(TWO_ARMS, "lints", {"v_sq": 2.0}, 42, "notification_channels")
        for _ in range(5):
            adapter.step(h)
        assert adapter.get_state(h).t == 5

    def test_n_bootstraps_respected(self, adapter):
        """Bootstrapped TS accepts n_bootstraps hyperparameter."""
        h = adapter.create(
            TWO_ARMS, "bootstrapped_ts", {"n_bootstraps": 5}, 42, "notification_channels"
        )
        for _ in range(5):
            adapter.step(h)
        assert adapter.get_state(h).t == 5

    def test_linucb_sw_accepts_basic_params(self, adapter):
        """Sliding-window LinUCB works with valid ClusterBandit params."""
        h = adapter.create(TWO_ARMS, "linucb_sw", {"alpha": 2.0}, 42, "notification_channels")
        for _ in range(5):
            adapter.step(h)
        assert adapter.get_state(h).t == 5

    def test_softmax_accepts_basic_params(self, adapter):
        """Softmax works with valid ClusterBandit params."""
        h = adapter.create(TWO_ARMS, "softmax", {}, 42, "notification_channels")
        for _ in range(5):
            adapter.step(h)
        assert adapter.get_state(h).t == 5

    def test_rf_accepts_basic_params(self, adapter):
        """Random Forest works with valid ClusterBandit params."""
        h = adapter.create(
            TWO_ARMS, "random_forest_ucb", {"alpha": 2.0}, 42, "notification_channels"
        )
        for _ in range(5):
            adapter.step(h)
        assert adapter.get_state(h).t == 5

    def test_gp_ucb_full_config(self, adapter):
        """GP-UCB accepts all hyperparameters."""
        h = adapter.create(
            TWO_ARMS,
            "gp_ucb",
            {
                "gp_beta": 3.0,
                "gp_length_scale": 0.5,
                "gp_noise_var": 0.05,
                "gp_max_obs": 300,
            },
            42,
            "notification_channels",
        )
        for _ in range(5):
            adapter.step(h)
        assert adapter.get_state(h).t == 5

    def test_neural_linear_config(self, adapter):
        """Neural Linear accepts embedding and retrain frequency."""
        h = adapter.create(
            TWO_ARMS,
            "neural_linear",
            {
                "neural_embedding_dim": 8,
                "neural_retrain_freq": 100,
            },
            42,
            "notification_channels",
        )
        for _ in range(5):
            adapter.step(h)
        assert adapter.get_state(h).t == 5

    def test_n_bootstraps_respected_linucb_sw(self, adapter):
        """Sliding-window LinUCB with n_bootstraps works."""
        h = adapter.create(
            TWO_ARMS,
            "linucb_sw",
            {"alpha": 2.0, "n_bootstraps": 5},
            42,
            "notification_channels",
        )
        for _ in range(5):
            adapter.step(h)
        assert adapter.get_state(h).t == 5


class TestPersistentRng:
    def test_same_seed_produces_identical_context_sequences(self, adapter):
        algo = "linucb"
        hp = {"alpha": 2.0}
        seed = 42
        steps = 30

        h1 = adapter.create(None, algo, hp, seed, "notification_channels")
        h2 = adapter.create(None, algo, hp, seed, "notification_channels")

        ctx1 = [adapter.step(h1).context for _ in range(steps)]
        ctx2 = [adapter.step(h2).context for _ in range(steps)]

        assert ctx1 == ctx2

    def test_different_seeds_produce_different_sequences(self, adapter):
        algo = "linucb"
        hp = {"alpha": 2.0}
        steps = 10

        h1 = adapter.create(None, algo, hp, 42, "notification_channels")
        h2 = adapter.create(None, algo, hp, 99, "notification_channels")

        ctx1 = [adapter.step(h1).context for _ in range(steps)]
        ctx2 = [adapter.step(h2).context for _ in range(steps)]

        assert ctx1 != ctx2


class TestTruncatedNormalSampling:
    def test_no_exact_pileup_at_plus_one(self, adapter):
        h = adapter.create(None, "linucb", {"alpha": 2.0}, 0, "notification_channels")
        samples = []
        for _ in range(1000):
            adapter.step(h)
            ctx = adapter.get_state(h).history[-1].context
            samples.append(ctx[0])
        assert sum(1 for v in samples if v == 1.0) == 0

    def test_no_exact_pileup_at_minus_one(self, adapter):
        h = adapter.create(None, "linucb", {"alpha": 2.0}, 1, "notification_channels")
        samples = []
        for _ in range(1000):
            adapter.step(h)
            ctx = adapter.get_state(h).history[-1].context
            samples.append(ctx[0])
        assert sum(1 for v in samples if v == -1.0) == 0

    def test_values_remain_in_bounds(self, adapter):
        h = adapter.create(None, "linucb", {"alpha": 2.0}, 2, "notification_channels")
        for _ in range(200):
            adapter.step(h)
            ctx = adapter.get_state(h).history[-1].context
            assert all(-1.0 <= v <= 1.0 for v in ctx)


class TestSimStateFeatureMetadata:
    def test_get_state_includes_descriptions(self, adapter):
        h = adapter.create(None, "linucb", {"alpha": 2.0}, 42, "notification_channels")
        state = adapter.get_state(h)
        assert len(state.feature_descriptions) == 2
        assert "mobile" in state.feature_descriptions[0].lower()

    def test_get_state_includes_mins_maxs_and_units(self, adapter):
        h = adapter.create(None, "linucb", {"alpha": 2.0}, 42, "notification_channels")
        state = adapter.get_state(h)
        assert state.feature_mins == [-1.0, -1.0]
        assert state.feature_maxs == [1.0, 1.0]
        assert len(state.feature_units) == 2

    def test_get_state_includes_population_segments(self, adapter):
        h = adapter.create(None, "linucb", {"alpha": 2.0}, 42, "notification_channels")
        state = adapter.get_state(h)
        assert len(state.population_segments) == 4
        names = {s.name for s in state.population_segments}
        assert "Mobile Active" in names
        total = sum(s.weight for s in state.population_segments)
        assert abs(total - 1.0) < 0.01

    def test_get_state_includes_history_window(self, adapter):
        from coba_server.services.coba_adapter_real import MAX_HISTORY_LENGTH

        h = adapter.create(None, "linucb", {"alpha": 2.0}, 42, "notification_channels")
        state = adapter.get_state(h)
        assert state.history_window == MAX_HISTORY_LENGTH
        assert len(state.history) <= state.history_window


def _three_feature_test_scenario() -> ContextScenario:
    """Minimal 3-feature scenario (test-only; uses A00 16-feature cap)."""
    n = 3
    return ContextScenario(
        id="test_three_features",
        label="Test Three Features",
        description="Minimal scenario for lin_meta dimension tests",
        domain="Test",
        features=[
            ContextFeature(
                name=f"f{i}",
                label=f"F{i}",
                description="test feature",
                low_label="low",
                high_label="high",
            )
            for i in range(n)
        ],
        arms=[
            {"id": "a", "label": "A", "true_prob": 0.5},
            {"id": "b", "label": "B", "true_prob": 0.5},
        ],
        reward_profiles=[
            RewardProfile(weights=[0.0] * n, bias=0.0),
            RewardProfile(weights=[0.0] * n, bias=0.0),
        ],
    )


class TestLinMetaNFeatures:
    def test_lin_meta_update_supports_three_features(self, adapter):
        scenario = _three_feature_test_scenario()
        with patch(
            "coba_server.services.coba_adapter_real.get_scenario",
            return_value=scenario,
        ):
            h = adapter.create(None, "linucb", {"alpha": 2.0}, 42, "test_three_features")

        state = adapter.get_state(h)
        for m in state.lin_meta:
            assert len(m.b) == 3
            assert len(m.A) == 3
            assert all(len(row) == 3 for row in m.A)

        adapter.step(h)
        state = adapter.get_state(h)
        for m in state.lin_meta:
            assert len(m.b) == 3
            assert len(m.A) == 3
            assert all(len(row) == 3 for row in m.A)

        chosen_idx = state.history[-1].chosen_idx
        assert len(state.lin_meta[chosen_idx].b) == 3

    def test_get_state_includes_feature_low_and_high_labels(self, adapter):
        h = adapter.create(None, "linucb", {"alpha": 2.0}, 42, "notification_channels")
        state = adapter.get_state(h)
        assert state.feature_low_labels == ["desktop-only", "today"]
        assert state.feature_high_labels == ["mobile-only", "30+ days ago"]


class TestComputeLogit:
    def test_interaction_weight_scales_with_both_features_high(self):
        logit = _compute_logit([0, 0], 0, np.array([0.9, 0.8]), [1.0])
        assert abs(logit - 0.72) < 1e-6

    def test_zero_interaction_is_identical_to_linear(self):
        ctx = np.array([0.5, 0.5])
        logit_w = _compute_logit([0.5, 0.3], 0.1, ctx, [0.0])
        logit_wo = _compute_logit([0.5, 0.3], 0.1, ctx, None)
        assert abs(logit_w - logit_wo) < 1e-9


class TestNewsFeedRewardSurfaces:
    def _ctx(self, engagement: float, hour: float) -> np.ndarray:
        sin_t, cos_t = encode_cyclic_time(hour)
        return np.array([engagement, sin_t, cos_t])

    def test_sports_reward_requires_both_features_high(self):
        scenario = get_scenario("news_feed")
        sports = scenario.reward_profiles[0]

        engaged_morning = self._ctx(1.0, 8.0)
        engaged_evening = self._ctx(1.0, 20.0)
        lazy_morning = self._ctx(-1.0, 8.0)

        def prob(ctx: np.ndarray) -> float:
            logit = _compute_logit(
                sports.weights,
                sports.bias,
                ctx,
                sports.interaction_weights,
            )
            return _sig(logit)

        p_em = prob(engaged_morning)
        p_ee = prob(engaged_evening)
        p_lm = prob(lazy_morning)
        assert p_em > p_ee + 0.1
        assert p_em > p_lm + 0.1


class TestFlashSaleBimodal:
    def test_flash_sale_bimodal_both_corners_beat_center(self):
        scenario = get_scenario("product_recommendations")
        profile = scenario.reward_profiles[3]

        bargain_hunter = np.array([1.0, -1.0])
        big_spender = np.array([-1.0, 1.0])
        middle_ground = np.array([0.0, 0.0])

        def prob(ctx: np.ndarray) -> float:
            logit = _compute_logit(
                profile.weights,
                profile.bias,
                ctx,
                profile.interaction_weights,
            )
            return _sig(logit)

        assert prob(bargain_hunter) > prob(middle_ground) + 0.15
        assert prob(big_spender) > prob(middle_ground) + 0.15


class TestCyclicTimeEncoding:
    def test_cyclic_encoding_midnight_adjacent_to_1130pm(self):
        t_2330 = encode_cyclic_time(23.5)
        t_0030 = encode_cyclic_time(0.5)
        dist = np.sqrt(sum((a - b) ** 2 for a, b in zip(t_2330, t_0030, strict=True)))
        assert dist < 0.5

    def test_cyclic_encoding_midnight_far_from_noon(self):
        t_noon = encode_cyclic_time(12.0)
        t_midnight = encode_cyclic_time(0.0)
        dist = np.sqrt(sum((a - b) ** 2 for a, b in zip(t_noon, t_midnight, strict=True)))
        assert dist > 1.5
