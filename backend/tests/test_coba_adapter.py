"""Integration tests for CobaLibraryAdapter — exercises the real coba library."""

import pytest

from coba_server.models.simulation import ArmConfig
from coba_server.services.coba_adapter_real import CobaLibraryAdapter

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
        assert adapter.create(TWO_ARMS, "ucb1", {"alpha": 2.0}, 42) == 0

    def test_get_state_returns_sim_state(self, adapter):
        h = adapter.create(TWO_ARMS, "ucb1", {"alpha": 2.0}, 42)
        st = adapter.get_state(h)
        assert st.t == 0 and len(st.arm_states) == 2

    def test_step_increments_t(self, adapter):
        h = adapter.create(TWO_ARMS, "ucb1", {"alpha": 2.0}, 42)
        r = adapter.step(h)
        assert r.t == 1 and adapter.get_state(h).t == 1

    def test_step_supports_all_cluster_bandit_algorithms(self, adapter):
        """Every discrete ClusterBandit policy exposed by coba must complete a step."""
        for algo in CLUSTER_BANDIT_ALGORITHMS:
            h = adapter.create(TWO_ARMS, algo, {}, 42)
            assert adapter._bandits[h].policy.value == algo
            r = adapter.step(h)
            assert r.outcome in (0, 1), f"{algo}: outcome must be binary"

    def test_epsilon_greedy_was_random_sometimes_true(self, adapter):
        """With epsilon=0.6 across 40 steps, some steps must be random explorations."""
        arms = [
            ArmConfig(id="a", label="A", true_prob=0.3),
            ArmConfig(id="b", label="B", true_prob=0.7),
        ]
        h = adapter.create(arms, "epsilon_greedy", {"epsilon": 0.6}, 42)
        was_random_steps = []
        for _ in range(40):
            r = adapter.step(h)
            was_random_steps.append(r.was_random)
        # With epsilon=0.6 and 40 steps, at least 5 random explorations expected.
        assert any(was_random_steps), "epsilon_greedy: no random exploration recorded"

    def test_scores_have_finite_values(self, adapter):
        """Scores must cap inf at 99.0 and never be truly infinite in the response."""
        h = adapter.create(TWO_ARMS, "ucb1", {"alpha": 2.0}, 42)
        for _ in range(5):
            r = adapter.step(h)
        for score in r.scores:
            assert score.score < float("inf"), "score must be finite (inf should be capped at 99)"

    def test_linucb_supports_more_than_three_arms(self, adapter):
        """Contextual reward profiles must be generated for all configured arms."""
        arms = [ArmConfig(id=str(i), label=f"A{i}", true_prob=0.1 + 0.05 * i) for i in range(6)]
        h = adapter.create(arms, "linucb", {"alpha": 2.0}, 42)
        for _ in range(12):
            r = adapter.step(h)
            assert 0 <= r.chosen_idx < len(arms)
            assert r.all_true_probs is not None
            assert len(r.all_true_probs) == len(arms)
            assert r.optimal_idx is not None
            assert 0 <= r.optimal_idx < len(arms)

    def test_chosen_arm_score_uses_coba_breakdown(self, adapter):
        """Chosen-arm score should use coba's BanditDecision score_breakdown."""
        h = adapter.create(TWO_ARMS, "ucb1", {"alpha": 2.0}, 42)
        for _ in range(10):
            r = adapter.step(h)
        chosen_score = r.scores[r.chosen_idx]
        assert chosen_score.formula.startswith("coba")
        assert chosen_score.mean >= 0
        assert chosen_score.bonus >= 0

    def test_regret_history_capped(self, adapter):
        """regret_history must not grow beyond MAX_HISTORY_LENGTH entries."""
        from coba_server.services.coba_adapter_real import MAX_HISTORY_LENGTH

        h = adapter.create(TWO_ARMS, "ucb1", {}, 42)
        for _ in range(MAX_HISTORY_LENGTH + 50):
            adapter.step(h)
        st = adapter.get_state(h)
        assert len(st.regret_history) <= MAX_HISTORY_LENGTH
        assert len(st.history) <= MAX_HISTORY_LENGTH

    def test_delete_cleans_up(self, adapter):
        h = adapter.create(TWO_ARMS, "ucb1", {"alpha": 2.0}, 42)
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
        h = adapter.create(arms, "linucb", {"alpha": 2.0}, 42)
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
            h = adapter.create(TWO_ARMS, algo, {}, 42)
            r = adapter.step(h)
            assert r.t == 1, f"{algo}: step must succeed with empty hyperparams"

    def test_n_clusters_respected(self, adapter):
        """Cluster count should be configurable — full hyperparams bag."""
        h = adapter.create(TWO_ARMS, "linucb", {"n_clusters": 3, "alpha": 2.0}, 42)
        for _ in range(5):
            adapter.step(h)
        assert adapter.get_state(h).t == 5

    def test_alpha_respected_ucb1(self, adapter):
        """UCB1 accepts alpha hyperparameter."""
        h = adapter.create(TWO_ARMS, "ucb1", {"alpha": 5.0}, 42)
        for _ in range(5):
            adapter.step(h)
        assert adapter.get_state(h).t == 5

    def test_l2_lambda_respected_linucb(self, adapter):
        """LinUCB accepts l2_lambda hyperparameter."""
        h = adapter.create(TWO_ARMS, "linucb", {"l2_lambda": 0.5}, 42)
        for _ in range(5):
            adapter.step(h)
        assert adapter.get_state(h).t == 5

    def test_gamma_respected_linucb(self, adapter):
        """LinUCB accepts gamma hyperparameter."""
        h = adapter.create(TWO_ARMS, "linucb", {"gamma": 0.9}, 42)
        for _ in range(5):
            adapter.step(h)
        assert adapter.get_state(h).t == 5

    def test_v_sq_respected_lints(self, adapter):
        """LinTS accepts v_sq hyperparameter."""
        h = adapter.create(TWO_ARMS, "lints", {"v_sq": 2.0}, 42)
        for _ in range(5):
            adapter.step(h)
        assert adapter.get_state(h).t == 5

    def test_n_bootstraps_respected(self, adapter):
        """Bootstrapped TS accepts n_bootstraps hyperparameter."""
        h = adapter.create(TWO_ARMS, "bootstrapped_ts", {"n_bootstraps": 5}, 42)
        for _ in range(5):
            adapter.step(h)
        assert adapter.get_state(h).t == 5

    def test_linucb_sw_accepts_basic_params(self, adapter):
        """Sliding-window LinUCB works with valid ClusterBandit params."""
        h = adapter.create(TWO_ARMS, "linucb_sw", {"alpha": 2.0}, 42)
        for _ in range(5):
            adapter.step(h)
        assert adapter.get_state(h).t == 5

    def test_softmax_accepts_basic_params(self, adapter):
        """Softmax works with valid ClusterBandit params."""
        h = adapter.create(TWO_ARMS, "softmax", {}, 42)
        for _ in range(5):
            adapter.step(h)
        assert adapter.get_state(h).t == 5

    def test_rf_accepts_basic_params(self, adapter):
        """Random Forest works with valid ClusterBandit params."""
        h = adapter.create(TWO_ARMS, "random_forest_ucb", {"alpha": 2.0}, 42)
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
        )
        for _ in range(5):
            adapter.step(h)
        assert adapter.get_state(h).t == 5

    def test_n_bootstraps_respected_linucb_sw(self, adapter):
        """Sliding-window LinUCB with n_bootstraps works."""
        h = adapter.create(TWO_ARMS, "linucb_sw", {"alpha": 2.0, "n_bootstraps": 5}, 42)
        for _ in range(5):
            adapter.step(h)
        assert adapter.get_state(h).t == 5
