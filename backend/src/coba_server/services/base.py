"""Abstract adapter interface for coba library integration."""

from __future__ import annotations

from abc import ABC, abstractmethod

from coba_server.models.simulation import (
    AlgorithmId,
    ArmConfig,
    SimState,
    StepRecord,
)


class CobaAdapter(ABC):
    """Stateful adapter that manages bandit instances."""

    @abstractmethod
    def create(
        self,
        arms: list[ArmConfig] | None,
        algorithm: AlgorithmId,
        hyperparams: dict[str, float],
        seed: int,
        scenario_id: str = "notification_channels",
    ) -> int: ...

    @abstractmethod
    def get_state(self, handle: int) -> SimState: ...

    @abstractmethod
    def step(self, handle: int) -> StepRecord: ...

    @abstractmethod
    def delete(self, handle: int) -> None: ...

    @abstractmethod
    def get_supported_algorithms(self) -> list[dict]: ...

    @abstractmethod
    def get_coba_state(self, handle: int) -> dict: ...
