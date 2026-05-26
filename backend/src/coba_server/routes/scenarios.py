"""Scenarios API routes — expose scenario registry to frontend."""

from fastapi import APIRouter

from coba_server.models.context import ScenarioInfo
from coba_server.services.scenario_registry import SCENARIO_REGISTRY

router = APIRouter(prefix="/scenarios", tags=["scenarios"])


@router.get("", response_model=list[ScenarioInfo])
async def list_scenarios() -> list[ScenarioInfo]:
    """
    List all available scenarios.

    Returns a list of scenarios with metadata for the frontend to use for
    scenario selection and algorithm recommendations.
    """
    return [
        ScenarioInfo(
            id=scenario.id,
            label=scenario.label,
            description=scenario.description,
            domain=scenario.domain,
            feature_count=scenario.get_feature_count(),
            arm_count=scenario.get_arm_count(),
            has_drift=scenario.has_drift(),
        )
        for scenario in SCENARIO_REGISTRY.values()
    ]
