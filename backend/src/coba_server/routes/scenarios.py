"""Scenarios API routes — expose scenario registry to frontend."""

from typing import Literal, cast

from fastapi import APIRouter

from coba_server.models.context import ScenarioInfo
from coba_server.services.scenario_registry import SCENARIO_INFO_META, SCENARIO_REGISTRY

router = APIRouter(prefix="/scenarios", tags=["scenarios"])


@router.get("", response_model=list[ScenarioInfo])
async def list_scenarios() -> list[ScenarioInfo]:
    """
    List all available scenarios.

    Returns a list of scenarios with metadata for the frontend to use for
    scenario selection and algorithm recommendations.
    """
    result: list[ScenarioInfo] = []
    for scenario in SCENARIO_REGISTRY.values():
        meta = SCENARIO_INFO_META.get(scenario.id, {})
        drift_step = None
        drift_end_step = None
        if scenario.drift_config:
            drift_step = scenario.drift_config.drift_step
            drift_end_step = scenario.drift_config.drift_step + scenario.drift_config.drift_duration
        result.append(
            ScenarioInfo(
                id=scenario.id,
                label=scenario.label,
                description=scenario.description,
                domain=scenario.domain,
                feature_count=scenario.get_feature_count(),
                arm_count=scenario.get_arm_count(),
                has_drift=scenario.has_drift(),
                recommended_algorithms=cast(list[str], meta.get("recommended_algorithms", [])),
                difficulty=cast(
                    Literal["introductory", "intermediate", "advanced"],
                    meta.get("difficulty", "introductory"),
                ),
                reward_surface=cast(
                    Literal["linear", "loglinear", "nonlinear", "drifting"],
                    meta.get("reward_surface", "loglinear"),
                ),
                drift_step=drift_step,
                drift_end_step=drift_end_step,
            )
        )
    return result
