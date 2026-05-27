"""Context schema, reward profiles, and scenario definitions."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class ContextFeature(BaseModel):
    """A single dimension of the context vector."""

    name: str = Field(..., description="Machine name, e.g. 'mobile_usage'")
    label: str = Field(..., description="Human-readable label, e.g. 'Mobile Usage Score'")
    description: str = Field(..., description="Full prose explanation")
    min_val: float = Field(default=-1.0, description="Minimum normalised value")
    max_val: float = Field(default=1.0, description="Maximum normalised value")
    unit: str | None = Field(default=None, description="Display unit, e.g. '%', 'days'")

    def __hash__(self) -> int:
        return hash(self.name)


class RewardProfile(BaseModel):
    """Per-arm reward function: σ(weights · context + bias)."""

    weights: list[float] = Field(
        ..., description="One weight per context feature (linear coefficient)"
    )
    bias: float = Field(default=0.0, description="Intercept term (additive bias)")
    description: str = Field(
        default="", description="Human explanation of this arm's reward surface"
    )

    def validate_feature_count(self, expected_count: int) -> None:
        """Ensure weights match feature count."""
        if len(self.weights) != expected_count:
            raise ValueError(
                f"RewardProfile has {len(self.weights)} weights but "
                f"scenario defines {expected_count} features"
            )


class PopulationSegment(BaseModel):
    """A user segment within the population, with its own context distribution."""

    name: str = Field(..., description="Segment name, e.g. 'Mobile Power User'")
    weight: float = Field(gt=0, description="Relative frequency (will be normalised)")
    context_mean: list[float] = Field(
        ..., description="Per-feature mean in normalised space (one value per feature)"
    )
    context_std: list[float] = Field(
        ..., description="Per-feature standard deviation in normalised space"
    )

    def validate_feature_count(self, expected_count: int) -> None:
        """Ensure means and stds match feature count."""
        if len(self.context_mean) != expected_count:
            raise ValueError(
                f"PopulationSegment.context_mean has {len(self.context_mean)} values "
                f"but scenario defines {expected_count} features"
            )
        if len(self.context_std) != expected_count:
            raise ValueError(
                f"PopulationSegment.context_std has {len(self.context_std)} values "
                f"but scenario defines {expected_count} features"
            )


class DriftConfig(BaseModel):
    """Configuration for concept drift (non-stationary rewards)."""

    drift_step: int = Field(..., gt=0, description="Step number at which drift begins (1-indexed)")
    drift_duration: int = Field(
        ..., gt=0, description="Number of steps over which weights transition smoothly"
    )
    target_profiles: list[RewardProfile] = Field(
        ..., description="Arm reward profiles after drift completes (one per arm)"
    )

    def validate_profiles(self, n_arms: int, n_features: int) -> None:
        """Ensure target profiles match arm count and feature count."""
        if len(self.target_profiles) != n_arms:
            raise ValueError(
                f"DriftConfig.target_profiles has {len(self.target_profiles)} profiles "
                f"but scenario defines {n_arms} arms"
            )
        for i, profile in enumerate(self.target_profiles):
            profile.validate_feature_count(n_features)


class ContextScenario(BaseModel):
    """A complete scenario definition with context structure, arms, and reward dynamics."""

    id: str = Field(
        ...,
        description="Unique identifier, e.g. 'notification_channels'",
        pattern="^[a-z_]+$",
    )
    label: str = Field(..., description="Human-readable label, e.g. 'Notification Channels'")
    description: str = Field(..., description="Full prose description of the scenario")
    domain: str = Field(
        ..., description="Problem domain, e.g. 'Marketing', 'News', 'E-Commerce', 'Content'"
    )

    features: list[ContextFeature] = Field(
        ..., min_length=2, max_length=16, description="Context feature definitions"
    )

    arms: list[dict[str, Any]] = Field(
        ...,
        min_length=2,
        max_length=10,
        description="Arm definitions: [{'id': str, 'label': str, 'true_prob': float}, ...]",
    )

    reward_profiles: list[RewardProfile] = Field(
        ..., description="One reward profile per arm, in the same order as 'arms'"
    )

    population_segments: list[PopulationSegment] | None = Field(
        default=None, description="Optional user segment distributions"
    )

    drift_config: DriftConfig | None = Field(
        default=None, description="Optional concept drift configuration"
    )

    def validate_consistency(self) -> None:
        """Validate internal consistency."""
        n_features = len(self.features)
        n_arms = len(self.arms)

        # Reward profiles
        if len(self.reward_profiles) != n_arms:
            raise ValueError(
                f"Scenario has {n_arms} arms but {len(self.reward_profiles)} reward profiles"
            )
        for i, profile in enumerate(self.reward_profiles):
            try:
                profile.validate_feature_count(n_features)
            except ValueError as e:
                raise ValueError(f"reward_profiles[{i}]: {e}") from e

        # Population segments
        if self.population_segments:
            for i, segment in enumerate(self.population_segments):
                try:
                    segment.validate_feature_count(n_features)
                except ValueError as e:
                    raise ValueError(f"population_segments[{i}]: {e}") from e

        # Drift config
        if self.drift_config:
            try:
                self.drift_config.validate_profiles(n_arms, n_features)
            except ValueError as e:
                raise ValueError(f"drift_config: {e}") from e

    def get_feature_count(self) -> int:
        """Return the number of features in this scenario."""
        return len(self.features)

    def get_arm_count(self) -> int:
        """Return the number of arms in this scenario."""
        return len(self.arms)

    def has_drift(self) -> bool:
        """Return whether this scenario has drift configured."""
        return self.drift_config is not None


class ScenarioInfo(BaseModel):
    """Lightweight scenario metadata for API responses."""

    id: str
    label: str
    description: str
    domain: str
    feature_count: int
    arm_count: int
    has_drift: bool
    recommended_algorithms: list[str] = Field(default_factory=list)
    difficulty: Literal["introductory", "intermediate", "advanced"] = "introductory"
    reward_surface: Literal["linear", "loglinear", "nonlinear", "drifting"] = "loglinear"
    drift_step: int | None = None
    drift_end_step: int | None = None
