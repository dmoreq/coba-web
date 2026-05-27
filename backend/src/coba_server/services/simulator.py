"""Simulation service — lifecycle management via CobaAdapter."""

from __future__ import annotations

import time
from uuid import UUID

from coba_server.models.simulation import (
    CreateSimRequest,
    ResultsResponse,
    RunResponse,
    Simulation,
    StepRecord,
)
from coba_server.services.base import CobaAdapter

# Simulations expire after 1 hour of inactivity
SIMULATION_TTL_SECONDS = 3600


class SimulationService:
    def __init__(self, adapter: CobaAdapter):
        self._adapter = adapter
        self._simulations: dict[UUID, Simulation] = {}
        self._handle_map: dict[UUID, int] = {}
        self._created_at: dict[UUID, float] = {}

    def prune_expired(self) -> None:
        """Remove simulations older than TTL_SECONDS (public)."""
        now = time.time()
        expired = [
            sim_id
            for sim_id, created_at in self._created_at.items()
            if now - created_at > SIMULATION_TTL_SECONDS
        ]
        for sim_id in expired:
            self.delete(sim_id)

    def create(self, req: CreateSimRequest) -> Simulation:
        self.prune_expired()
        handle = self._adapter.create(
            req.arms, req.algorithm, req.hyperparams, req.seed, req.scenario_id
        )
        state = self._adapter.get_state(handle)
        sim = Simulation(
            state=state, algorithm=req.algorithm, seed=req.seed, scenario_id=req.scenario_id
        )
        self._simulations[sim.id] = sim
        self._handle_map[sim.id] = handle
        self._created_at[sim.id] = time.time()
        return sim

    def get(self, sim_id: UUID) -> Simulation | None:
        return self._simulations.get(sim_id)

    def step(self, sim_id: UUID) -> StepRecord:
        sim = self._simulations.get(sim_id)
        if sim is None:
            raise ValueError("Simulation not found")
        handle = self._handle_map[sim_id]
        record = self._adapter.step(handle)
        sim.state = self._adapter.get_state(handle)
        return record

    def run(self, sim_id: UUID, steps: int) -> RunResponse:
        for _ in range(steps):
            self.step(sim_id)
        sim = self._simulations[sim_id]
        return RunResponse(
            steps_run=steps,
            final_t=sim.state.t,
            history=list(sim.state.history[-steps:]),
            regret_history=list(sim.state.regret_history),
            arm_states=list(sim.state.arm_states),
        )

    def delete(self, sim_id: UUID) -> None:
        handle = self._handle_map.pop(sim_id, None)
        if handle is not None:
            self._adapter.delete(handle)
        self._simulations.pop(sim_id, None)
        self._created_at.pop(sim_id, None)

    def delete_all(self) -> int:
        """Remove every active simulation. Returns count deleted."""
        sim_ids = list(self._simulations.keys())
        for sim_id in sim_ids:
            self.delete(sim_id)
        return len(sim_ids)

    def get_coba_state(self, sim_id: UUID) -> dict:
        if sim_id not in self._simulations:
            raise ValueError("Simulation not found")
        return self._adapter.get_coba_state(self._handle_map[sim_id])

    def get_results(self, sim_id: UUID) -> ResultsResponse:
        sim = self._simulations.get(sim_id)
        if sim is None:
            raise ValueError("Simulation not found")
        state = sim.state
        t = state.t
        if t == 0:
            return ResultsResponse(total_steps=0, cumulative_regret=0.0, avg_reward=0.0)
        cum_regret = state.regret_history[-1] if state.regret_history else 0.0
        total_rewards = sum(a.successes for a in state.arm_states)
        avg_reward = total_rewards / t
        contextual_truth = [step.all_true_probs for step in state.history if step.all_true_probs]
        if contextual_truth:
            n_arms = len(state.arms)
            true_values = [
                sum(step_probs[i] for step_probs in contextual_truth) / len(contextual_truth)
                for i in range(n_arms)
            ]
        else:
            true_values = [arm.true_prob for arm in state.arms]

        best_arm_idx = max(range(len(state.arms)), key=lambda i: true_values[i])
        best_arm = state.arms[best_arm_idx]
        accuracy_table = []
        for i, arm in enumerate(state.arms):
            st = state.arm_states[i]
            mean = 0.0 if st.n == 0 else st.successes / st.n
            true_value = true_values[i]
            accuracy_table.append(
                {
                    "arm": arm.label,
                    "estimated": round(mean, 3),
                    "true": round(true_value, 3),
                    "error": round(abs(mean - true_value), 3),
                    "pulls": st.n,
                }
            )
        # Convergence: use all-time pull counts from arm_states (not truncated history).
        # The history window is at most MAX_HISTORY_LENGTH steps, but arm_states.n
        # reflects the full run. We estimate the step at which the best arm first
        # crossed 50% share by scanning the (possibly truncated) history backwards.
        convergence_step: int | None = None
        best_arm_pulls = state.arm_states[best_arm_idx].n
        if t > 0 and best_arm_pulls / t > 0.5:
            # Scan history backwards to find the last step where the best arm
            # was NOT dominant — convergence happened just after that point.
            for step in reversed(state.history):
                if step.chosen_idx != best_arm_idx:
                    convergence_step = step.t + 1
                    break
            else:
                convergence_step = state.history[0].t if state.history else 1
        narrative = (
            f"After {t} steps using {sim.algorithm}, cumulative regret"
            f" {cum_regret:.2f}. Best arm: {best_arm.label}."
        )
        if convergence_step:
            narrative += f" Converged around step {convergence_step}."
        return ResultsResponse(
            total_steps=t,
            cumulative_regret=round(cum_regret, 3),
            avg_reward=round(avg_reward, 3),
            best_arm_found=best_arm.label,
            accuracy_table=accuracy_table,
            narrative=narrative,
        )
