"""Dependency injection — always uses the real coba library adapter."""

from functools import lru_cache

from coba_server.services.coba_adapter_real import CobaLibraryAdapter
from coba_server.services.simulator import SimulationService


@lru_cache
def get_adapter() -> CobaLibraryAdapter:
    return CobaLibraryAdapter()


@lru_cache
def get_simulation_service() -> SimulationService:
    return SimulationService(get_adapter())
