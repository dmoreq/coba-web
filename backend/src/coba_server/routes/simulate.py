"""Simulation lifecycle routes with dependency injection."""

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
    return service.create(req)


@router.get("/{sim_id}")
async def get_simulation(
    sim_id: UUID,
    service: SimulationService = Depends(get_simulation_service),
) -> Simulation:
    sim = service.get(sim_id)
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")
    return sim


@router.post("/{sim_id}/step")
async def step_simulation(
    sim_id: UUID,
    service: SimulationService = Depends(get_simulation_service),
) -> StepResponse:
    try:
        record = service.step(sim_id)
        sim = service.get(sim_id)
        if not sim:
            raise HTTPException(status_code=404, detail="Simulation not found")
        return StepResponse(
            t=record.t,
            step=record,
            arm_states=sim.state.arm_states,
            regret_history=list(sim.state.regret_history),
        )
    except ValueError:
        raise HTTPException(status_code=404, detail="Simulation not found")


@router.post("/{sim_id}/run")
async def run_simulation(
    sim_id: UUID,
    req: RunRequest,
    service: SimulationService = Depends(get_simulation_service),
) -> RunResponse:
    try:
        return service.run(sim_id, req.steps)
    except ValueError:
        raise HTTPException(status_code=404, detail="Simulation not found")


@router.delete("/{sim_id}", status_code=204)
async def delete_simulation(
    sim_id: UUID,
    service: SimulationService = Depends(get_simulation_service),
) -> None:
    service.delete(sim_id)


@router.get("/{sim_id}/results")
async def get_results(
    sim_id: UUID,
    service: SimulationService = Depends(get_simulation_service),
) -> ResultsResponse:
    try:
        return service.get_results(sim_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Simulation not found")
