"""Simulation lifecycle routes with dependency injection."""

import asyncio
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from coba_server.di import get_simulation_service
from coba_server.models.simulation import (
    CreateSimRequest,
    ResultsResponse,
    RunRequest,
    RunResponse,
    Simulation,
    StepResponse,
)
from coba_server.services.simulator import SimulationService

router = APIRouter(prefix="/simulate", tags=["simulate"])


@router.post("", status_code=201)
async def create_simulation(
    req: CreateSimRequest,
    service: SimulationService = Depends(get_simulation_service),
) -> Simulation:
    try:
        return await asyncio.to_thread(service.create, req)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{sim_id}")
async def get_simulation(
    sim_id: UUID,
    service: SimulationService = Depends(get_simulation_service),
) -> Simulation:
    sim = await asyncio.to_thread(service.get, sim_id)
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")
    return sim


@router.post("/{sim_id}/step")
async def step_simulation(
    sim_id: UUID,
    service: SimulationService = Depends(get_simulation_service),
) -> StepResponse:
    def _step() -> StepResponse | None:
        try:
            record = service.step(sim_id)
        except ValueError:
            return None
        sim = service.get(sim_id)
        if not sim:
            return None
        return StepResponse(
            t=record.t,
            step=record,
            arm_states=sim.state.arm_states,
            regret_history=list(sim.state.regret_history),
        )

    result = await asyncio.to_thread(_step)
    if result is None:
        raise HTTPException(status_code=404, detail="Simulation not found")
    return result


@router.post("/{sim_id}/run")
async def run_simulation(
    sim_id: UUID,
    req: RunRequest,
    service: SimulationService = Depends(get_simulation_service),
) -> RunResponse:
    try:
        return await asyncio.to_thread(service.run, sim_id, req.steps)
    except ValueError:
        raise HTTPException(status_code=404, detail="Simulation not found")


@router.delete("/{sim_id}", status_code=204)
async def delete_simulation(
    sim_id: UUID,
    service: SimulationService = Depends(get_simulation_service),
) -> None:
    await asyncio.to_thread(service.delete, sim_id)


@router.get("/{sim_id}/coba-state")
async def get_coba_state(
    sim_id: UUID,
    service: SimulationService = Depends(get_simulation_service),
) -> dict:
    try:
        return await asyncio.to_thread(service.get_coba_state, sim_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Simulation not found")


@router.get("/{sim_id}/results")
async def get_results(
    sim_id: UUID,
    service: SimulationService = Depends(get_simulation_service),
) -> ResultsResponse:
    try:
        return await asyncio.to_thread(service.get_results, sim_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Simulation not found")
