"""Dependency injection container."""

from functools import lru_cache

from coba_server.services.base import CobaAdapter
from coba_server.services.coba_adapter import InMemoryCobaAdapter
from coba_server.services.simulator import SimulationService

# Toggle: set to True to use the real coba library
USE_COBA_LIBRARY = False


@lru_cache
def get_adapter() -> CobaAdapter:
    if USE_COBA_LIBRARY:
        from coba_server.services.coba_adapter_real import CobaLibraryAdapter

        return CobaLibraryAdapter()
    return InMemoryCobaAdapter()


@lru_cache
def get_simulation_service() -> SimulationService:
    return SimulationService(get_adapter())
