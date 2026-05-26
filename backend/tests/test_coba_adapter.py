"""Smoke tests for the real coba library adapter."""

import pytest

from coba_server.models.simulation import ArmConfig
from coba_server.services.coba_adapter_real import CobaLibraryAdapter


@pytest.fixture
def adapter():
    return CobaLibraryAdapter()


class TestCobaLibraryAdapter:
    def test_create_returns_handle(self, adapter):
        arms = [
            ArmConfig(id="a", label="A", true_prob=0.5),
            ArmConfig(id="b", label="B", true_prob=0.6),
        ]
        assert adapter.create(arms, "ucb1", {"alpha": 2.0}, 42) == 0

    def test_get_state_returns_sim_state(self, adapter):
        arms = [
            ArmConfig(id="a", label="A", true_prob=0.5),
            ArmConfig(id="b", label="B", true_prob=0.6),
        ]
        h = adapter.create(arms, "ucb1", {"alpha": 2.0}, 42)
        st = adapter.get_state(h)
        assert st.t == 0 and len(st.arm_states) == 2

    def test_step_increments_t(self, adapter):
        arms = [
            ArmConfig(id="a", label="A", true_prob=0.5),
            ArmConfig(id="b", label="B", true_prob=0.6),
        ]
        h = adapter.create(arms, "ucb1", {"alpha": 2.0}, 42)
        r = adapter.step(h)
        assert r.t == 1 and adapter.get_state(h).t == 1

    def test_step_supports_algorithms(self, adapter):
        arms = [
            ArmConfig(id="a", label="A", true_prob=0.5),
            ArmConfig(id="b", label="B", true_prob=0.6),
        ]
        for algo in ("ucb1", "thompson", "linucb"):
            h = adapter.create(arms, algo, {}, 42)
            r = adapter.step(h)
            assert r.outcome in (0, 1)

    def test_delete_cleans_up(self, adapter):
        arms = [
            ArmConfig(id="a", label="A", true_prob=0.5),
            ArmConfig(id="b", label="B", true_prob=0.6),
        ]
        h = adapter.create(arms, "ucb1", {"alpha": 2.0}, 42)
        adapter.delete(h)
        with pytest.raises(KeyError):
            adapter.get_state(h)
