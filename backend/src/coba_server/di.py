"""Dependency injection container."""

from functools import lru_cache

from coba_server.config import Settings
from coba_server.services.base import CobaAdapter
from coba_server.services.coba_adapter import InMemoryCobaAdapter
from coba_server.services.simulator import SimulationService


@lru_cache
def get_adapter() -> CobaAdapter:
    settings = Settings()
    if settings.use_coba_library:
        from coba_server.services.coba_adapter_real import CobaLibraryAdapter

        return CobaLibraryAdapter()
    return InMemoryCobaAdapter()


@lru_cache
def get_simulation_service() -> SimulationService:
    return SimulationService(get_adapter())  # uses @lru_cache'd adapter
