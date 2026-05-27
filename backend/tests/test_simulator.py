"""Tests for InMemoryCobaAdapter and SimulationService."""

import time

import pytest

from coba_server.models.simulation import ArmConfig, CreateSimRequest, StepRecord
from coba_server.services.coba_adapter_real import CobaLibraryAdapter
from coba_server.services.simulator import SIMULATION_TTL_SECONDS, SimulationService


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


class TestPruneExpired:
    def test_prune_expired_removes_old_sim(self, service, sim_ucb1):
        service._created_at[sim_ucb1.id] = time.time() - SIMULATION_TTL_SECONDS - 1
        service.prune_expired()
        assert service.get(sim_ucb1.id) is None

    def test_prune_expired_keeps_fresh_sim(self, service, sim_ucb1):
        service._created_at[sim_ucb1.id] = time.time()
        service.prune_expired()
        assert service.get(sim_ucb1.id) is not None

    def test_prune_expired_idempotent(self, service, sim_ucb1):
        service._created_at[sim_ucb1.id] = time.time() - SIMULATION_TTL_SECONDS - 1
        service.prune_expired()
        service.prune_expired()
        assert service.get(sim_ucb1.id) is None


class TestGetResultsConvergence:
    def test_convergence_step_detected(self, service, sim_ucb1):
        sim = service.get(sim_ucb1.id)
        sim.state.t = 10
        sim.state.arm_states[0].n = 2
        sim.state.arm_states[0].successes = 0
        sim.state.arm_states[0].failures = 2
        sim.state.arm_states[1].n = 8
        sim.state.arm_states[1].successes = 6
        sim.state.arm_states[1].failures = 2
        sim.state.regret_history = [0.1 * (i + 1) for i in range(10)]
        sim.state.history = [
            StepRecord(
                t=i + 1,
                chosen_idx=0 if i < 2 else 1,
                outcome=1 if i >= 2 else 0,
                step_regret=0.1,
                cum_regret=0.1 * (i + 1),
                scores=[],
                was_random=False,
                true_prob=0.8 if i >= 2 else 0.2,
            )
            for i in range(10)
        ]

        results = service.get_results(sim_ucb1.id)
        assert "Converged around step 3." in results.narrative

    def test_no_convergence_when_best_arm_not_dominant(self, service, sim_ucb1):
        sim = service.get(sim_ucb1.id)
        sim.state.t = 10
        sim.state.arm_states[0].n = 5
        sim.state.arm_states[0].successes = 1
        sim.state.arm_states[0].failures = 4
        sim.state.arm_states[1].n = 5
        sim.state.arm_states[1].successes = 4
        sim.state.arm_states[1].failures = 1
        sim.state.regret_history = [0.1 * (i + 1) for i in range(10)]
        sim.state.history = [
            StepRecord(
                t=i + 1,
                chosen_idx=i % 2,
                outcome=1 if i % 2 else 0,
                step_regret=0.1,
                cum_regret=0.1 * (i + 1),
                scores=[],
                was_random=False,
                true_prob=0.8 if i % 2 else 0.2,
            )
            for i in range(10)
        ]

        results = service.get_results(sim_ucb1.id)
        assert "Converged around step" not in results.narrative

    def test_results_at_t0(self, service, sim_ucb1):
        results = service.get_results(sim_ucb1.id)
        assert results.total_steps == 0
        assert results.best_arm_found is None
        assert results.accuracy_table == []


class TestScenarioDrivenCreation:
    def test_create_with_none_arms_uses_scenario(self, service):
        sim = service.create(
            CreateSimRequest(arms=None, algorithm="linucb", seed=42, scenario_id="news_feed")
        )
        assert len(sim.state.arms) == 5
        assert sim.state.arms[0].label == "Sports"
        assert sim.state.arms[0].color is not None
        assert sim.state.arms[0].light_color is not None

    def test_scenario_id_stored_on_simulation(self, service):
        sim = service.create(
            CreateSimRequest(
                arms=None, algorithm="linucb", seed=42, scenario_id="product_recommendations"
            )
        )
        assert sim.scenario_id == "product_recommendations"
        assert sim.state.scenario_id == "product_recommendations"
