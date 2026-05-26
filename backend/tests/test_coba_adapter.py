"""Integration tests for CobaLibraryAdapter — exercises the real coba library."""

import pytest

from coba_server.models.simulation import ArmConfig
from coba_server.services.coba_adapter_real import CobaLibraryAdapter

TWO_ARMS = [
    ArmConfig(id="a", label="A", true_prob=0.5),
    ArmConfig(id="b", label="B", true_prob=0.6),
]


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

    def test_step_supports_all_algorithms(self, adapter):
        """All four algorithm IDs must complete a step without error."""
        for algo in ("ucb1", "epsilon_greedy", "thompson", "linucb"):
            h = adapter.create(TWO_ARMS, algo, {}, 42)
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
