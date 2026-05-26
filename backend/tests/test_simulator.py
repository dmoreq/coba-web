"""Tests for InMemoryCobaAdapter and SimulationService."""

import pytest

from coba_server.models.simulation import ArmConfig, CreateSimRequest
from coba_server.services.coba_adapter_real import CobaLibraryAdapter
from coba_server.services.simulator import SimulationService


@pytest.fixture
def adapter():
    return CobaLibraryAdapter()


@pytest.fixture
def service(adapter):
    return SimulationService(adapter)


@pytest.fixture
def default_arms():
    return [
        ArmConfig(id="a", label="A", true_prob=0.3),
        ArmConfig(id="b", label="B", true_prob=0.5),
    ]


@pytest.fixture
def sim_ucb1(service, default_arms):
    return service.create(CreateSimRequest(arms=default_arms, algorithm="ucb1", seed=42))


class TestCobaAdapter:
    def test_supported_algorithms_minimum(self, adapter):
        ids = [a["id"] for a in adapter.get_supported_algorithms()]
        for r in ("ucb1", "epsilon_greedy", "thompson", "linucb"):
            assert r in ids

    def test_create_zero_arm_states(self, adapter):
        arms = [
            ArmConfig(id="a", label="A", true_prob=0.5),
            ArmConfig(id="b", label="B", true_prob=0.6),
            ArmConfig(id="c", label="C", true_prob=0.7),
        ]
        h = adapter.create(arms, "ucb1", {}, 42)
        st = adapter.get_state(h)
        assert all(s.n == 0 and s.successes == 0 and s.failures == 0 for s in st.arm_states)

    def test_step_increments_t(self, adapter):
        arms = [
            ArmConfig(id="a", label="A", true_prob=0.5),
            ArmConfig(id="b", label="B", true_prob=0.6),
        ]
        h = adapter.create(arms, "ucb1", {"alpha": 2.0}, 42)
        r = adapter.step(h)
        assert r.t == 1
        assert adapter.get_state(h).t == 1

    def test_step_valid_score(self, adapter):
        arms = [
            ArmConfig(id="a", label="A", true_prob=0.5),
            ArmConfig(id="b", label="B", true_prob=0.6),
        ]
        h = adapter.create(arms, "ucb1", {"alpha": 2.0}, 42)
        r = adapter.step(h)
        assert r.outcome in (0, 1)
        assert r.step_regret >= 0
        assert len(r.scores) == 2


class TestSimulationService:
    def test_create_returns_simulation(self, service, default_arms):
        sim = service.create(CreateSimRequest(arms=default_arms, algorithm="ucb1", seed=42))
        assert sim.id is not None and sim.state.t == 0

    def test_get_returns_none_for_unknown(self, service):
        from uuid import uuid4

        assert service.get(uuid4()) is None

    def test_step_increments_t(self, service, sim_ucb1):
        service.step(sim_ucb1.id)
        assert service.get(sim_ucb1.id).state.t == 1

    def test_step_updates_arm_state(self, service, sim_ucb1):
        service.step(sim_ucb1.id)
        sim = service.get(sim_ucb1.id)
        assert sum(s.n for s in sim.state.arm_states) == 1

    def test_step_unknown_id_raises(self, service):
        from uuid import uuid4

        with pytest.raises(ValueError):
            service.step(uuid4())

    def test_run_steps_correct_count(self, service, sim_ucb1):
        r = service.run(sim_ucb1.id, 10)
        assert r.steps_run == 10 and r.final_t == 10

    def test_delete_removes_simulation(self, service, sim_ucb1):
        service.delete(sim_ucb1.id)
        assert service.get(sim_ucb1.id) is None

    def test_history_capped(self, service, sim_ucb1):
        service.run(sim_ucb1.id, 200)
        assert len(service.get(sim_ucb1.id).state.history) <= 150

    def test_results_provides_analytics(self, service, sim_ucb1):
        service.run(sim_ucb1.id, 50)
        results = service.get_results(sim_ucb1.id)
        assert results.total_steps == 50 and results.cumulative_regret > 0

    def test_contextual_results_use_observed_true_probabilities(self, service):
        """Contextual algorithms should report context-derived truth, not static arm.true_prob."""
        arms = [
            ArmConfig(id="a", label="A", true_prob=0.01),
            ArmConfig(id="b", label="B", true_prob=0.01),
            ArmConfig(id="c", label="C", true_prob=0.01),
            ArmConfig(id="d", label="D", true_prob=0.01),
        ]
        sim = service.create(CreateSimRequest(arms=arms, algorithm="linucb", seed=42))
        service.run(sim.id, 30)
        results = service.get_results(sim.id)
        true_values = [row["true"] for row in results.accuracy_table]
        assert any(v != 0.01 for v in true_values)
        assert results.best_arm_found in {a.label for a in arms}
