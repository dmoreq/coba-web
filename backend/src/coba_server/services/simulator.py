"""Simulation service — lifecycle management via CobaAdapter."""

from __future__ import annotations

from uuid import UUID

from coba_server.models.simulation import (
    CreateSimRequest,
    ResultsResponse,
    RunResponse,
    Simulation,
    StepRecord,
)
from coba_server.services.base import CobaAdapter


class SimulationService:
    def __init__(self, adapter: CobaAdapter):
        self._adapter = adapter
        self._simulations: dict[UUID, Simulation] = {}
        self._handle_map: dict[UUID, int] = {}

    def create(self, req: CreateSimRequest) -> Simulation:
        handle = self._adapter.create(req.arms, req.algorithm, req.hyperparams, req.seed)
        state = self._adapter.get_state(handle)
        sim = Simulation(state=state, algorithm=req.algorithm, seed=req.seed)
        self._simulations[sim.id] = sim
        self._handle_map[sim.id] = handle
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
        best_arm_idx = max(range(len(state.arms)), key=lambda i: state.arms[i].true_prob)
        best_arm = state.arms[best_arm_idx]
        accuracy_table = []
        for i, arm in enumerate(state.arms):
            st = state.arm_states[i]
            mean = 0.0 if st.n == 0 else st.successes / st.n
            accuracy_table.append(
                {
                    "arm": arm.label,
                    "estimated": round(mean, 3),
                    "true": arm.true_prob,
                    "error": round(abs(mean - arm.true_prob), 3),
                    "pulls": st.n,
                }
            )
        convergence_step: int | None = None
        cum_pulls = [0] * len(state.arms)
        for step in state.history:
            cum_pulls[step.chosen_idx] += 1
            if cum_pulls[best_arm_idx] / step.t > 0.5:
                convergence_step = step.t
                break
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
